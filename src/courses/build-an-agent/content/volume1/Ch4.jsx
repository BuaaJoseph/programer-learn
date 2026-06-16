import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const readSrc = `import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// read：读取一个文本文件的内容。这是 Agent 的「眼睛」之一——只读、安全、可并行。
export const readTool: Tool = {
  name: 'read',
  description:
    '读取一个文本文件并返回其内容。返回的每一行都带行号，方便后续用 edit 工具精确定位。用于查看源码、配置、日志等。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径，相对路径以工作目录为基准。' },
    },
    required: ['path'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const abs = resolve(ctx.cwd, path)
    try {
      const text = await readFile(abs, 'utf8')
      const numbered = text
        .split('\\n')
        .map((line, i) => \`\${String(i + 1).padStart(5)}\\t\${line}\`)
        .join('\\n')
      return { output: numbered || '(空文件)' }
    } catch (err) {
      return { output: \`读取失败：\${(err as Error).message}\`, isError: true }
    }
  },
}`

const listSrc = `import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// list：列出一个目录下的条目，目录名带 / 后缀。只读、可并行。
export const listTool: Tool = {
  name: 'list',
  description: '列出指定目录下的文件和子目录（不递归）。目录会以 / 结尾标记。用于了解项目结构。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '目录路径，默认为工作目录。' },
    },
  },
  async execute(input, ctx) {
    const path = input.path ? String(input.path) : '.'
    const abs = resolve(ctx.cwd, path)
    try {
      const entries = await readdir(abs, { withFileTypes: true })
      if (entries.length === 0) return { output: '(空目录)' }
      const lines = entries
        .filter((e) => !e.name.startsWith('.'))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
        .map((e) => (e.isDirectory() ? \`\${e.name}/\` : e.name))
      return { output: lines.join('\\n') || '(只有隐藏文件)' }
    } catch (err) {
      return { output: \`列目录失败：\${(err as Error).message}\`, isError: true }
    }
  },
}`

const walkSrc = `import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

// 递归遍历目录，跳过常见的噪声目录，返回所有文件的相对路径。
// glob / grep 共用它，避免各写一遍遍历逻辑。
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

export async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function recur(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || IGNORE.has(e.name)) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        await recur(full)
      } else if (e.isFile()) {
        out.push(relative(root, full))
      }
    }
  }
  await recur(root)
  return out
}

// 把简化版 glob（支持 * 和 **）编译成正则。
// *  匹配除 / 外的任意字符；** 匹配任意（含 /）。
export function globToRegExp(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*'
        i++
        if (pattern[i + 1] === '/') i++
      } else {
        re += '[^/]*'
      }
    } else if ('.+^\${}()|[]\\\\'.includes(c)) {
      re += '\\\\' + c
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c
    }
  }
  return new RegExp('^' + re + '$')
}`

const globSrc = `import { resolve } from 'node:path'
import type { Tool } from './types.js'
import { walkFiles, globToRegExp } from './walk.js'

// glob：按文件名模式查找文件，比如 "src/**/*.ts"。只读、可并行。
export const globTool: Tool = {
  name: 'glob',
  description:
    '按 glob 模式查找文件路径，支持 * 与 **，例如 "src/**/*.ts"。返回匹配的相对路径列表。用于「这个项目里所有 X 文件在哪」。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'glob 模式，如 **/*.json' },
    },
    required: ['pattern'],
  },
  async execute(input, ctx) {
    const pattern = String(input.pattern)
    const root = resolve(ctx.cwd)
    const re = globToRegExp(pattern)
    const files = await walkFiles(root)
    const matched = files.filter((f) => re.test(f)).sort()
    if (matched.length === 0) return { output: \`没有匹配 \${pattern} 的文件\` }
    const head = matched.slice(0, 200)
    const more = matched.length > head.length ? \`\\n…还有 \${matched.length - head.length} 个\` : ''
    return { output: head.join('\\n') + more }
  },
}`

const grepSrc = `import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Tool } from './types.js'
import { walkFiles, globToRegExp } from './walk.js'

// grep：在文件内容里按正则搜索。只读、可并行。
export const grepTool: Tool = {
  name: 'grep',
  description:
    '在项目文件内容中按正则表达式搜索，返回命中行（含文件名和行号）。可用 include 限定文件范围（glob）。用于「哪里用到了某个函数/字符串」。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: '正则表达式。' },
      include: { type: 'string', description: '可选，只搜匹配此 glob 的文件，如 "*.ts"。' },
    },
    required: ['pattern'],
  },
  async execute(input, ctx) {
    const pattern = String(input.pattern)
    const root = resolve(ctx.cwd)
    let re: RegExp
    try {
      re = new RegExp(pattern)
    } catch (err) {
      return { output: \`正则非法：\${(err as Error).message}\`, isError: true }
    }
    const includeRe = input.include ? globToRegExp(String(input.include)) : null
    let files = await walkFiles(root)
    if (includeRe) files = files.filter((f) => includeRe.test(f))

    const hits: string[] = []
    for (const f of files) {
      if (hits.length >= 200) break
      let text: string
      try {
        text = await readFile(join(root, f), 'utf8')
      } catch {
        continue
      }
      const lines = text.split('\\n')
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          hits.push(\`\${f}:\${i + 1}: \${lines[i].trim()}\`)
          if (hits.length >= 200) break
        }
      }
    }
    if (hits.length === 0) return { output: \`没有命中 /\${pattern}/\` }
    return { output: hits.join('\\n') }
  },
}`

const globTableSrc = `// glob 元字符的编译规则（globToRegExp 的核心）：
//
//   glob 写法        编译成正则      含义
//   *                [^/]*           匹配任意字符，但「不跨目录」
//   **               .*              匹配任意字符，「可跨任意层目录」
//   ?                [^/]            匹配单个非分隔符字符
//   .  +  ( ) 等      \\. \\+ \\( ...   正则元字符被转义成「字面量」
//
// 几个例子（pattern -> 能否匹配）：
//   src/*.ts      匹配 src/a.ts          ；不匹配 src/x/a.ts（* 不跨目录）
//   src/**/*.ts   匹配 src/a.ts、src/x/y/a.ts（** 跨目录）
//   *.test.ts     匹配 a.test.ts         ；那个点是字面量，不会匹配 "axtestxts"`

const seqVsParSrc = `// 同一轮里读三个文件，串行 vs 并行的墙钟时间差距：

// 串行：一个 await 完再下一个，时间是三者之和
const a = await read('a.ts')   // ~30ms
const b = await read('b.ts')   // ~30ms
const c = await read('c.ts')   // ~30ms
// 总耗时 ≈ 90ms

// 并行：一起发出去、一起等齐，时间约等于最慢的那一个
const [a2, b2, c2] = await Promise.all([
  read('a.ts'), read('b.ts'), read('c.ts'),
])
// 总耗时 ≈ 30ms —— I/O 等待是重叠的，不是叠加的`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          上一章我们把主循环跑通了，但那个 Agent 现在是个「睁眼瞎」：它有心跳、会转圈，
          却什么也看不见——你问它「这项目用什么测试框架」，它只能凭空瞎猜。
          这一章我们给它装上第一组感官：<strong>四个只读工具</strong>——
          <code>read</code> 读文件、<code>list</code> 列目录、<code>glob</code> 找文件、<code>grep</code> 搜内容。
          它们让 Agent 在动手改任何东西之前，先把现场<strong>看清楚</strong>。
          四个工具都很短，逻辑也朴素，但它们合起来就是 Agent 的「探索能力」，是后面一切动作的前提。
        </p>
      </Lead>

      <h2>动手之前，先看清楚</h2>
      <p>
        想象一个靠谱的工程师接手一个陌生项目：他不会上来就改代码。他会先 <code>ls</code> 看看目录长啥样、
        打开几个关键文件读一读、搜一下某个函数在哪儿被调用——<strong>先建立认知，再动手</strong>。
        Agent 也一样。这一组只读工具，给的就是这种「先侦察」的能力：
      </p>
      <ul>
        <li><code>read</code>：读取一个文件的完整内容（带行号）。</li>
        <li><code>list</code>：列出一个目录下有哪些文件和子目录。</li>
        <li><code>glob</code>：按文件名模式（如 <code>src/**/*.ts</code>）找出一批文件。</li>
        <li><code>grep</code>：在文件<strong>内容</strong>里按正则搜索，定位某段代码在哪。</li>
      </ul>
      <p>
        它们有一个共同的、至关重要的属性：<strong>只读</strong>。它们只看、不改。这个属性不是细节，而是整组工具的设计地基。
      </p>

      <KeyIdea title="只读 = 安全 + 可并行，是 Agent「先看后做」的基础设施">
        <p>
          每个只读工具都标了 <code>readOnly: true</code>，这一个布尔值换来两样东西。
          第一是<strong>安全</strong>：只读操作不改变世界，跑错了、跑多了，最坏也就是浪费一点时间，
          不会删掉文件、不会破坏状态，所以 Agent 可以<strong>放心大胆地探索</strong>——读十个文件来确认一件事，没有任何副作用。
          第二是<strong>可并行</strong>：正因为互不影响，上一章的 <code>runTools</code> 才能把它们用 <code>Promise.all</code> 一起跑，
          一口气读五个文件不必排队等。安全让 Agent 敢探索，并行让探索快——
          这两点合起来，构成了「先看清楚、再动手」这条纪律的底层基础设施。
          所有会改变世界的「写工具」（下一章讲）都建立在「先用只读工具看明白」的前提之上。
        </p>
      </KeyIdea>

      <h2>read：Agent 的眼睛</h2>
      <p>
        从最基础的开始：把一个文件的内容读出来交给模型。下面是 forge 仓库里
        <code>src/tools/read.ts</code> 的<strong>逐字</strong>内容。
      </p>

      <CodeBlock lang="ts" title="src/tools/read.ts" code={readSrc} />

      <p>代码很短，但有三处设计值得逐一讲透：</p>
      <ul>
        <li>
          <strong>为什么给每一行加行号。</strong> 注意 <code>numbered</code> 那段：把文件按 <code>\n</code> 切成行，
          每行前面补上一个右对齐的行号（<code>padStart(5)</code>）和一个制表符。这不是为了好看——
          而是为了<strong>给后面的 edit 工具铺路</strong>。下一章的 edit 要精确地「把第 42 行改成 XX」，
          模型必须先知道哪行是第几行。read 在此就把行号一并喂给模型，让它「看见」的内容自带坐标。
          这是 read 和 edit 之间一个隐形的契约。
        </li>
        <li>
          <strong><code>resolve(ctx.cwd, path)</code> 把相对路径锚定到工作目录。</strong>
          模型给的路径往往是相对的（比如 <code>src/index.ts</code>），但进程的「当前目录」未必就是用户的项目目录。
          所以我们用 <code>ctx.cwd</code>（上一章 Agent 构造时传入、包进 <code>ToolContext</code> 的工作目录）作为基准，
          把相对路径解析成绝对路径。这样无论 forge 进程在哪儿启动，工具操作的<strong>永远是用户那个项目</strong>。
        </li>
        <li>
          <strong>出错返回 <code>isError</code> 而不是抛异常。</strong> 文件不存在、没权限——这些都很常见。
          我们用 <code>try/catch</code> 兜住，把错误信息塞进 <code>output</code>、置 <code>isError: true</code> 返回，
          <strong>而不是 throw</strong>。回想上一章 <code>execOne</code>：这条带 isError 的结果会被如实回灌给模型，
          模型看到「读取失败：no such file」就能自己换条路（比如先 list 看看文件到底叫啥）。
          工具的职责是「如实汇报」，不是「替模型崩溃」。
        </li>
      </ul>

      <h2>list：看清目录结构</h2>
      <p>
        read 要先知道文件名才能读，可一开始模型对项目一无所知。<code>list</code> 就是用来「探路」的——
        列出一个目录里有什么。看 <code>src/tools/list.ts</code> 的<strong>逐字</strong>内容：
      </p>

      <CodeBlock lang="ts" title="src/tools/list.ts" code={listSrc} />

      <p>同样三处小心思：</p>
      <ul>
        <li>
          <strong>过滤隐藏文件。</strong> <code>filter((e) =&gt; !e.name.startsWith('.'))</code> 把
          <code>.git</code>、<code>.env</code>、<code>.DS_Store</code> 这类点开头的条目滤掉。
          它们大多是工具的元数据，对「了解项目结构」是噪声，列出来只会浪费模型的注意力和上下文。
        </li>
        <li>
          <strong>目录排前面，并加 <code>/</code> 后缀。</strong> 排序键先比 <code>isDirectory()</code>
          （目录排前），同类再按名字字母序。展示时目录名拼上 <code>/</code>（如 <code>src/</code>）。
          这样模型一眼就能区分「这是能继续往里钻的目录」还是「这是能 read 的文件」，
          省得它再为每一项去猜类型。
        </li>
        <li>
          <strong>默认列工作目录。</strong> <code>path</code> 在 schema 里不是必填——
          模型不传时默认用 <code>'.'</code>（经 resolve 后即 <code>ctx.cwd</code>）。
          所以模型探索一个新项目的第一步，常常就是一句不带参数的 <code>list</code>，先看根目录全貌。
        </li>
      </ul>

      <h2>共享遍历器：walk.ts</h2>
      <p>
        接下来的 glob 和 grep 都需要<strong>递归</strong>地走遍整个项目目录——glob 要遍历所有文件名来匹配，
        grep 要遍历所有文件内容来搜索。与其在两个文件里各写一遍遍历逻辑，不如抽成一个共享模块。
        这就是 <code>src/tools/walk.ts</code> 的<strong>逐字</strong>内容：
      </p>

      <CodeBlock lang="ts" title="src/tools/walk.ts" code={walkSrc} />

      <p>这个文件导出两个函数，是 glob 和 grep 共同的地基：</p>
      <ul>
        <li>
          <strong><code>walkFiles</code>：递归遍历，跳过噪声目录。</strong> 顶上的
          <code>IGNORE</code> 集合列了 <code>node_modules</code>、<code>.git</code>、<code>dist</code> 等目录。
          想想 <code>node_modules</code> 里动辄几万个文件——如果不跳过，每次 glob/grep 都要爬完它们，
          慢得令人发指，还会用一堆第三方代码的命中淹没真正有用的结果。
          所以遍历时遇到这些目录（以及任何点开头的隐藏目录）直接 <code>continue</code> 不进去。
          注意 <code>readdir</code> 外层那个 <code>try/catch</code>：碰到读不了的目录就静默 <code>return</code> 跳过，
          一个权限问题不该让整次遍历崩掉。
        </li>
        <li>
          <strong><code>globToRegExp</code>：把 glob 模式编译成正则。</strong> 这是 glob/grep 共用的「翻译器」。
          它逐字符扫描模式串，核心是两条规则：单个 <code>*</code> 编译成 <code>[^/]*</code>（匹配除路径分隔符外的任意字符，
          即「不跨目录」）；连续的 <code>**</code> 编译成 <code>.*</code>（匹配任意字符，<strong>含</strong> <code>/</code>，即「可以跨任意层目录」）。
          这正是 <code>src/**/*.ts</code> 能匹配 <code>src/a/b/c.ts</code> 的原因。
          其余的正则元字符（<code>.</code>、<code>+</code>、<code>(</code> 等）则被转义成字面量，
          免得用户模式里一个普通的点被当成「匹配任意字符」。最后用 <code>^...$</code> 锚定，要求整条路径完整匹配。
        </li>
      </ul>

      <h2>glob：按模式找文件</h2>
      <p>
        有了 walk，glob 就只剩薄薄一层。看 <code>src/tools/glob.ts</code> 的<strong>逐字</strong>内容：
      </p>

      <CodeBlock lang="ts" title="src/tools/glob.ts" code={globSrc} />

      <p>
        逻辑一目了然：用 <code>globToRegExp</code> 把模式编成正则 → <code>walkFiles</code> 拿到所有文件的相对路径 →
        <code>filter</code> 出能匹配的、排个序。它回答的是「这项目里所有 X 文件都在哪」这类问题，
        比如「找出所有测试文件 <code>**/*.test.ts</code>」。
      </p>
      <p>
        重点看结尾的<strong>截断</strong>：<code>matched.slice(0, 200)</code>。一个大仓库 <code>**/*.ts</code> 可能命中几千个文件，
        要是全部塞回给模型，既烧光上下文又毫无意义——模型根本读不过来。所以只回前 200 条，
        多出来的用一句「…还有 N 个」提示模型「结果太多了，请把模式写得更精确」。
        这是一种对模型注意力的保护。
      </p>

      <h2>grep：按内容搜</h2>
      <p>
        glob 找的是文件<strong>名</strong>，grep 找的是文件<strong>内容</strong>。这是探索里最强的一招——
        「哪里用到了 <code>readTool</code> 这个符号？」一搜便知。看 <code>src/tools/grep.ts</code> 的<strong>逐字</strong>内容：
      </p>

      <CodeBlock lang="ts" title="src/tools/grep.ts" code={grepSrc} />

      <p>grep 比前几个工具多扛了几件事，逐个讲：</p>
      <ul>
        <li>
          <strong>正则非法要友好报错。</strong> 模型传来的 <code>pattern</code> 直接 <code>new RegExp</code> 可能抛异常
          （比如未闭合的括号 <code>(</code>）。我们用 <code>try/catch</code> 把它兜住，回一条
          <code>isError: true</code> 的「正则非法」结果。模型看到后会自己修正模式重试，而不是让工具崩在这。
        </li>
        <li>
          <strong><code>include</code> 用 glob 限定文件范围。</strong> 全仓搜往往太宽。
          可选的 <code>include</code> 参数（一个 glob，如 <code>*.ts</code>）会被同样编译成正则，
          先把候选文件 <code>filter</code> 一遍，只在符合范围的文件里搜。
          「只在 TS 文件里找这个函数」就是靠它——又快又准。注意这里复用了 walk.ts 的
          <code>globToRegExp</code>，一个翻译器两处用，这正是上面抽出共享模块的回报。
        </li>
        <li>
          <strong>命中行带「文件:行号」。</strong> 每条命中拼成
          <code>{'`${f}:${i + 1}: ${lines[i].trim()}`'}</code>——文件相对路径、冒号、行号、冒号、那一行内容（去掉首尾空白）。
          这个格式和编辑器/终端里 grep 的输出一致，模型一看就懂，
          而且<strong>行号让它能顺势接 read/edit</strong> 去那个位置查看或修改，又一次工具间的接力。
        </li>
        <li>
          <strong>整体截断到 200 命中。</strong> 注意这里有<strong>双重</strong>检查：外层循环每开一个文件前
          <code>if (hits.length &gt;= 200) break</code>，内层逐行匹配时再 <code>break</code> 一次。
          一旦凑够 200 条立刻收手，不再白读后面的文件——既省时间，也守住「回灌内容要节制」的底线。
        </li>
      </ul>

      <Callout variant="tip" title="200 条上限：回灌给模型的内容也要节制">
        <p>
          你会发现 glob 和 grep 都硬性卡了 <strong>200 条</strong>上限。这不是随手写的魔法数字，背后是个真问题：
          工具的输出会原样<strong>回灌进 messages 历史</strong>，而历史每长一截，下一轮 API 调用就更贵、更慢，
          甚至可能撑爆上下文窗口。一次返回三千行搜索结果，模型既读不过来，又白白烧掉大量上下文预算。
          所以「探索能力强」不等于「一次吐得越多越好」——恰恰相反，<strong>克制</strong>才是对的。
          截断 + 一句「还有 N 个」的提示，等于在告诉模型：「结果太多了，把你的查询缩小一点再来。」
          这是一种把模型往「精确提问」引导的设计。给工具的输出设上限，是生产级 Agent 的常规纪律，read 也一样
          （超大文件同理需要节制，这里我们留作练习）。
        </p>
      </Callout>

      <Example title="模型会怎么连用它们">
        <p>
          单个工具看着平平无奇，威力在于<strong>串起来</strong>用。假设你问 forge：
          「项目里 <code>readFile</code> 都用在哪些地方，逻辑对吗？」模型很可能这样探索一遍：
        </p>
        <ol>
          <li>
            <strong>list</strong> 看根目录结构，发现源码在 <code>src/</code> 下，于是对项目布局有了大致概念。
          </li>
          <li>
            <strong>glob</strong> <code>src/**/*.ts</code> 拿到所有 TS 文件的清单，知道总共有哪些文件可看。
          </li>
          <li>
            <strong>grep</strong> <code>readFile</code>（用 <code>include: "*.ts"</code> 限定范围），
            一下子拿到所有命中行，每条都带「文件:行号」，精确指向用到它的位置。
          </li>
          <li>
            <strong>read</strong> 命中最多的那几个文件（带行号），把上下文完整看清，再回答你的问题。
          </li>
        </ol>
        <p>
          关键是后半句：因为这四个调用<strong>全是只读</strong>，模型完全可以在<strong>同一轮</strong>里<strong>并行</strong>发出
          （比如一口气 read 三个命中文件）——上一章的 <code>runTools</code> 会用 <code>Promise.all</code> 把它们一起跑掉，
          不必一个等一个。「只读 = 可并行」在这里落了地：探索得既全面又快。
          至于这套并行调度的更多细节，正是下一章要细抠的内容。
        </p>
      </Example>

      <Summary
        points={[
          '本章给 Agent 装上四个只读工具：read 读文件、list 列目录、glob 按名找文件、grep 按内容搜——这是 Agent「先看后做」的探索能力。',
          '四个工具都标 readOnly: true，换来两件事：安全（不改变世界，可放心探索）和可并行（互不影响，runTools 能用 Promise.all 一起跑）。',
          'read 给每行加行号，是为后续 edit 精确定位铺路；用 resolve(ctx.cwd, path) 把相对路径锚定到工作目录；出错返回 isError 而非抛异常。',
          'list 过滤隐藏文件、目录排前并加 / 后缀、默认列工作目录，让模型一眼看懂结构。',
          'glob 和 grep 共用 walk.ts：walkFiles 递归遍历并跳过 node_modules/.git 等噪声目录，globToRegExp 把 * 编成 [^/]*、** 编成 .* 来支持跨目录匹配。',
          'glob 按模式找文件、截断到 200 条防爆；grep 按正则搜内容，非法正则友好报错、include 限定范围、命中行带「文件:行号」、整体截断到 200 命中。',
          '200 条上限是对模型注意力和上下文预算的保护——回灌内容要节制，截断 + 提示反而引导模型精确提问。',
          '威力在于串用：list 看结构 → glob 找文件 → grep 搜符号 → read 读命中文件，而这些只读调用可在同一轮并行发出（呼应下一章的调度）。',
        ]}
      />
    </>
  )
}
