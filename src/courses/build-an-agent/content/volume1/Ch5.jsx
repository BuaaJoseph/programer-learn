import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const writeSrc = `import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { Tool } from './types.js'

// write：把内容写入文件（覆盖写），需要的父目录会自动创建。这是会改状态的写工具。
export const writeTool: Tool = {
  name: 'write',
  description:
    '把内容写入文件（整文件覆盖写）。父目录不存在会自动创建。用于新建文件或整体替换。改动已有文件的局部请优先用 edit。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '目标文件路径。' },
      content: { type: 'string', description: '要写入的完整内容。' },
    },
    required: ['path', 'content'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const content = String(input.content ?? '')
    const abs = resolve(ctx.cwd, path)
    try {
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, content, 'utf8')
      return { output: \`已写入 \${path}（\${content.length} 字符）\` }
    } catch (err) {
      return { output: \`写入失败：\${(err as Error).message}\`, isError: true }
    }
  },
}`

const editSrc = `import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// edit：精确字符串替换。要求 oldString 在文件中唯一，避免误改——这是写工具里最常用的一个。
export const editTool: Tool = {
  name: 'edit',
  description:
    '对已有文件做精确替换：把 oldString 替换成 newString。oldString 必须在文件中唯一出现（否则报错），所以请带上足够的上下文行。用于局部修改代码。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '要修改的文件路径。' },
      oldString: { type: 'string', description: '要被替换的原文（需唯一）。' },
      newString: { type: 'string', description: '替换后的新文本。' },
    },
    required: ['path', 'oldString', 'newString'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const oldString = String(input.oldString)
    const newString = String(input.newString)
    const abs = resolve(ctx.cwd, path)
    try {
      const text = await readFile(abs, 'utf8')
      if (oldString === newString) {
        return { output: 'oldString 与 newString 相同，无需修改。', isError: true }
      }
      const first = text.indexOf(oldString)
      if (first === -1) {
        return { output: '未找到 oldString，文件未改动。请确认原文（含缩进/空白）完全一致。', isError: true }
      }
      if (text.indexOf(oldString, first + 1) !== -1) {
        return { output: 'oldString 在文件中出现多次，无法确定改哪一处。请加入更多上下文使其唯一。', isError: true }
      }
      const next = text.slice(0, first) + newString + text.slice(first + oldString.length)
      await writeFile(abs, next, 'utf8')
      return { output: \`已修改 \${path}\` }
    } catch (err) {
      return { output: \`修改失败：\${(err as Error).message}\`, isError: true }
    }
  },
}`

const bashSrc = `import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { Tool } from './types.js'

const execAsync = promisify(exec)

// bash：执行一条 shell 命令，把 stdout/stderr 收回来。这是最强大也最危险的写工具。
// 后续「安全与人在回路」卷会在它前面加权限闸门；这里先把执行能力做出来。
export const bashTool: Tool = {
  name: 'bash',
  description:
    '在工作目录下执行一条 shell 命令，返回合并后的标准输出与错误输出。用于运行测试、构建、git 等。命令有 60 秒超时。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的 shell 命令。' },
    },
    required: ['command'],
  },
  async execute(input, ctx) {
    const command = String(input.command)
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      })
      const out = (stdout + stderr).trim()
      return { output: out || '(命令执行完毕，无输出)' }
    } catch (err) {
      // 非零退出码会走到这里：把输出和退出信息一并如实回灌，让模型据此纠错。
      const e = err as { stdout?: string; stderr?: string; message: string }
      const out = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
      return { output: \`\${out}\\n[命令失败] \${e.message}\`.trim(), isError: true }
    }
  },
}`

const atomicSrc = `// 直接 writeFile 不是原子的：写到一半进程被杀，文件就「半写」了——
// 内容截断、甚至损坏。原子写的标准套路是「先写临时文件，再 rename 覆盖」。

import { writeFile, rename } from 'node:fs/promises'

async function atomicWrite(abs: string, content: string) {
  const tmp = abs + '.tmp-' + process.pid + '-' + Date.now()
  await writeFile(tmp, content, 'utf8')
  // rename 在同一文件系统内是原子操作：要么旧文件、要么新文件，
  // 永远不会出现「半个文件」的中间态。
  await rename(tmp, abs)
}

// forge 本卷的 write 用的是朴素 writeFile（够清楚），
// 但你要知道生产级写工具为什么常常多这一步。`

const editAltSrc = `// edit 的「唯一性约束」之外，业界还有几种定位被改位置的方案，各有取舍：

// 方案 A（forge 采用）：唯一字符串匹配
//   优点：简单、无需行号、对模型友好（带上下文即可）
//   缺点：oldString 必须逐字符精确（含空白），模型偶尔会因空格对不上而失败

// 方案 B：按行号替换  edit(path, startLine, endLine, newText)
//   优点：定位明确
//   缺点：文件一改行号全乱，模型基于旧行号的后续编辑会错位；对空白不敏感反而易误伤

// 方案 C：unified diff（像 git patch）
//   优点：能一次表达多处改动、信息最紧凑
//   缺点：模型生成的 diff 上下文行经常对不上，应用失败率高，还得写 patch 解析器

// 结论：A 在「实现复杂度 / 模型成功率 / 误伤风险」三者间最平衡，所以最流行。`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          到上一章为止，forge 还是个「只会看、不会动」的旁观者：它能 <code>read</code>、能 <code>grep</code>、能
          <code>ls</code>，把你的项目摸得门儿清，但一个字节都改不了。这一章，我们给它装上一双<strong>手</strong>——
          三个 <code>readOnly: false</code> 的写工具：<code>write</code> 整文件覆盖、<code>edit</code> 精确替换、
          <code>bash</code> 执行命令。从这三个工具落地的这一刻起，forge 才真正算「能干活」：它能新建文件、能改你的代码、
          能跑测试看自己改得对不对。这是从「玩具」迈向「生产级」的关键一步，也是最该小心的一步。
        </p>
      </Lead>

      <h2>写工具：会改变世界状态的那一类</h2>
      <p>
        回忆上一章那个 <code>readOnly</code> 标志。读工具（read/ls/grep）有一个共同的安全特性：
        无论调多少次、并发调、顺序乱了，结果都一样，世界纹丝不动——这叫<strong>幂等、无副作用</strong>。
        写工具恰恰相反：它们会<strong>改变磁盘上的真实状态</strong>。写一次文件，文件就变了；
        跑一次 <code>rm</code>，东西就没了。这个差别不是哲学，它直接决定了三件工程上的事：
      </p>
      <ol>
        <li>
          <strong>必须串行执行。</strong>两个写操作如果并发，谁先谁后、会不会互相覆盖都说不准。
          上一章 <code>runTools</code> 已经埋了伏笔——只读并行、写串行。下一章讲调度时会把这件事抠到底。
        </li>
        <li>
          <strong>是「权限与人在回路」要重点设防的对象。</strong>读错了顶多浪费一次调用；
          写错了可能删库、可能 <code>git push --force</code>。卷 3 会专门在写工具前面架一道权限闸门。
        </li>
        <li>
          <strong>本章只管「能力」，不管「安全」。</strong>我们先把执行能力老老实实做出来、跑通闭环，
          安全闸门是后面单独的一整卷。先有手，再谈给手戴上手套。
        </li>
      </ol>

      <KeyIdea title="写工具 = 能力，安全闸门 = 后置">
        <p>
          一个清醒的认知：<strong>能力和安全是两件事，要分两步做。</strong>本章造出来的三个写工具，是「裸」的——
          它们能毫无阻拦地覆盖任何文件、执行任何命令。这<strong>不是</strong>疏忽，而是刻意的分层：
          先让 Agent 具备「改变世界」的执行能力（本章），再在卷 3 给这份能力套上「权限确认 / 人在回路」的缰绳。
          颠倒过来——还没有能力就先纠结安全——只会让你寸步难行。所以本章请放心大胆地把手做出来，
          但心里记牢：现在这双手<strong>没有闸门</strong>，只该在你不怕弄坏的测试目录里挥舞。
        </p>
      </KeyIdea>

      <h2>write：整文件覆盖写</h2>
      <p>
        最简单的写工具：给一个路径和一段内容，把内容<strong>整个</strong>写进去（已有内容直接覆盖）。
        下面是 forge 仓库里 <code>src/tools/write.ts</code> 的逐字内容。
      </p>

      <CodeBlock lang="ts" title="src/tools/write.ts" code={writeSrc} />

      <p>实现上有两个点值得说：</p>
      <ul>
        <li>
          <strong>覆盖写。</strong><code>writeFile</code> 默认就是覆盖——文件存在就整个替换，不存在就新建。
          它不做任何「合并」「追加」，给什么就是什么。这也意味着：如果你只想改文件里的一行，用 write
          就得把<strong>整份内容</strong>重新生成一遍，既浪费 token 又容易把别处改坏。
        </li>
        <li>
          <strong>自动建父目录。</strong>写 <code>src/a/b/c.ts</code> 时，如果 <code>src/a/b</code> 还不存在，
          直接 <code>writeFile</code> 会报 <code>ENOENT</code>。所以我们先 <code>mkdir(dirname(abs), &#123; recursive: true &#125;)</code>
          把整条父目录链建出来（<code>recursive</code> 让它逐级创建、且目录已存在也不报错），再写。
          这样模型新建一个深层目录里的文件时，不必先手动 <code>mkdir</code>。
        </li>
      </ul>
      <p>
        <strong>什么时候用 write，什么时候用 edit？</strong>记一句话：
        <strong>新建文件、或整体替换</strong>用 write；<strong>改已有文件的一小块</strong>用 edit。
        前者一锤子；后者外科手术。下面就是那把手术刀。
      </p>

      <Callout variant="note" title="覆盖写不是原子的——生产级 write 多一步「临时文件 + rename」">
        <p>
          <code>writeFile</code> 把内容写进文件这件事，看着是「一下子」，其实在底层是分多次系统调用完成的。
          如果进程在写到一半时被杀（崩溃、断电、被 <code>kill</code>），文件就会停在<strong>「半写」</strong>状态——
          内容被截断、甚至结构损坏。对源码文件这是灾难。生产级写工具因此常用<strong>原子写</strong>套路：
          先把完整内容写进一个临时文件，再用 <code>rename</code> 把临时文件「改名」成目标文件。
          同一文件系统内的 <code>rename</code> 是<strong>原子</strong>的——任一时刻，目标路径要么是完整的旧文件、要么是完整的新文件，绝不会是半个。
        </p>
        <CodeBlock lang="ts" title="原子写：先写临时文件，再 rename 覆盖" code={atomicSrc} />
        <p>
          forge 本卷的 write 用朴素的 <code>writeFile</code>（为了把主干讲清楚），但你要知道为什么真实工具往往多这一步。
        </p>
      </Callout>

      <h2>edit：精确字符串替换</h2>
      <p>
        <code>edit</code> 是写工具里<strong>最常用、也最讲究</strong>的一个。绝大多数「改代码」的动作——
        改一个函数名、调一个参数、补一行 import——都不该重写整个文件，而是精确地把<strong>一小段旧文本换成新文本</strong>。
        下面是 <code>src/tools/edit.ts</code> 的逐字内容。
      </p>

      <CodeBlock lang="ts" title="src/tools/edit.ts" code={editSrc} />

      <p>
        它的核心就一件事：在文件里找到 <code>oldString</code>，把它换成 <code>newString</code>。但魔鬼在三道校验里：
      </p>
      <ul>
        <li>
          <strong>防呆：oldString === newString。</strong>如果新旧文本一模一样，这次替换毫无意义——
          多半是模型搞错了。直接报错返回，别让它误以为「改成功了」。
        </li>
        <li>
          <strong>找不到就报错。</strong><code>indexOf</code> 返回 <code>-1</code> 说明文件里压根没有这段原文。
          常见原因是缩进、空白、引号没对齐。这时<strong>绝不</strong>瞎改，原样退回并提示「请确认原文完全一致」。
        </li>
        <li>
          <strong>出现多次也报错（唯一性约束）。</strong>这是 edit 最关键的设计。
          从第一次命中的位置 <code>+1</code> 处再 <code>indexOf</code> 一次，如果还能找到，说明 <code>oldString</code>
          在文件里<strong>不止一处</strong>——那到底改哪一个？无法确定，于是拒绝执行，要求模型「加入更多上下文使其唯一」。
        </li>
      </ul>
      <p>
        三道关全过了，才用 <code>slice + slice</code> 拼出替换后的全文，写回磁盘。
        注意拼接用的是<strong>字符串切片</strong>而非 <code>replace</code>：因为我们已经精确锁定了唯一的那个位置，
        切片只动那一处，干净利落、没有「不小心 replace 多个」的风险。
      </p>

      <Callout variant="tip" title="为什么「唯一性约束」是精确编辑的灵魂">
        <p>
          表面看，「oldString 必须唯一」像是个吹毛求疵的限制；实际上，它是逼模型「带足上下文」的精妙杠杆。
          假设文件里有三行 <code>count++</code>，模型只发来 <code>oldString: "count++"</code>——该改哪一行？无解。
          唯一性约束把这种<strong>歧义</strong>直接判为错误，于是模型被迫多带几行上下文，
          比如连同上一行 <code>if (found)</code> 一起发来，使这段原文在全文中独一无二。这样改动才是<strong>确定的</strong>，
          不会误伤另外两处。这恰好<strong>呼应上一章 read 给每行加行号</strong>的设计：read 让模型读到的内容自带定位信息，
          edit 让模型用这些上下文构造出唯一的 oldString——一读一写两个工具，在「精确」这件事上严丝合缝地配合。
        </p>
      </Callout>

      <h3>唯一性约束是「一种取舍」，不是唯一解</h3>
      <p>
        把唯一性约束讲成「灵魂」之后，得补一句公道话：它不是定位被改位置的<strong>唯一</strong>方案，而是几种方案里<strong>取舍最划算</strong>的那个。
        了解它的替代品，你才能理解 forge 为什么这么选，也才知道它的<strong>代价</strong>在哪：
      </p>
      <CodeBlock lang="ts" title="定位被改位置的三种方案对比" code={editAltSrc} />
      <table>
        <thead>
          <tr><th>方案</th><th>对模型的难度</th><th>误伤风险</th><th>主要代价</th></tr>
        </thead>
        <tbody>
          <tr><td>唯一字符串（forge）</td><td>低（带上下文即可）</td><td>低（唯一才改）</td><td>oldString 须逐字符精确，空白对不上就失败</td></tr>
          <tr><td>行号替换</td><td>中</td><td>高（行号易错位）</td><td>文件一改行号全乱，后续编辑连锁出错</td></tr>
          <tr><td>unified diff</td><td>高（要生成合法 patch）</td><td>中</td><td>上下文对不上时应用失败率高，需 patch 解析器</td></tr>
        </tbody>
      </table>
      <p>
        唯一性方案<strong>自己也有代价</strong>：模型必须把 <code>oldString</code> 一个字符不差地复刻出来（包括缩进、空格、引号），
        稍有偏差就 <code>indexOf</code> 返回 -1、改不动。这就是为什么实践中 edit 偶尔会「找不到原文」而需要重试——
        它把「歧义」这个更危险的问题，换成了「精确度」这个更可控的问题。在「实现复杂度 / 模型成功率 / 误伤风险」三角里，
        它是当下最平衡的一点，所以成了主流 Agent 的标配。
      </p>
      <Callout variant="tip" title="再看那句 oldString === newString 的防呆">
        <p>
          代码里「新旧文本相同就报错」看着多余，其实拦的是一类真实的模型失误：模型有时会「以为自己改了」，
          但发来的 newString 和 oldString 一模一样（脑补了一次本不存在的改动）。若不拦，edit 会返回「已修改」，
          模型于是<strong>误以为任务推进了</strong>、接着往下走——而文件其实纹丝没动。把这种「空改动」显式判为错误，
          是在帮模型<strong>对齐它的认知和现实</strong>，免得它基于一个假的「已完成」继续推理。
        </p>
      </Callout>

      <h2>bash：执行一条 shell 命令</h2>
      <p>
        最后一个，也是<strong>最强大、最危险</strong>的写工具。<code>bash</code> 让 Agent 能跑任意 shell 命令——
        运行测试、执行构建、调 git、装依赖……有了它，forge 才能<strong>自己验证</strong>刚才改得对不对。
        下面是 <code>src/tools/bash.ts</code> 的逐字内容。
      </p>

      <CodeBlock lang="ts" title="src/tools/bash.ts" code={bashSrc} />

      <p>几个实现要点：</p>
      <ul>
        <li>
          <strong>promisify(exec)。</strong>Node 的 <code>exec</code> 是回调式的，
          用 <code>promisify</code> 包成 Promise 才能 <code>await</code>。它会起一个 shell 来跑整条命令字符串
          （所以管道、重定向、<code>&amp;&amp;</code> 都能用）。
        </li>
        <li>
          <strong>cwd / timeout / maxBuffer 三个护栏。</strong><code>cwd</code> 指定在哪个目录执行（来自
          <code>ToolContext</code>，跟其他工具同源）；<code>timeout: 60_000</code> 给命令 60 秒上限，
          防止某条命令卡死把整个 Agent 拖住；<code>maxBuffer</code> 限制收集的输出大小，避免一条狂吐日志的命令把内存撑爆。
        </li>
        <li>
          <strong>合并 stdout + stderr 回灌。</strong>模型既要看正常输出，也要看错误信息（测试失败的报错往往在 stderr）。
          所以我们把两者拼到一起 <code>trim</code> 后整个回传，不做区分。空输出时给一句「无输出」，免得模型对着空字符串犯迷糊。
        </li>
        <li>
          <strong>非零退出码会抛异常——而 catch 里要如实回灌。</strong>这是最容易踩坑的一点：
          命令以非零码退出（比如测试没过、编译报错）时，<code>execAsync</code> 不是正常返回，而是<strong>抛异常</strong>。
          但「测试失败」恰恰是模型<strong>最需要知道</strong>的信息！所以 catch 块里我们从异常对象上把
          <code>stdout/stderr</code> 抠出来、连同 <code>message</code> 一起拼好回传，并标 <code>isError: true</code>。
          模型拿到这段真实的失败输出，才能据此判断下一步怎么改。
        </li>
      </ul>
      <p>
        这呼应了上一章反复强调的原则：<strong>出错也要如实回传，让模型自己纠错</strong>。
        bash 把这条原则用到了极致——它把命令的失败现场原封不动地端给模型，模型据此调整、再试，形成闭环。
      </p>

      <Callout variant="warn" title="现在的 bash 是「无闸门」的——它能跑 rm -rf">
        <p>
          盯着这段代码想清楚一件事：它对命令<strong>不做任何检查</strong>。模型发来什么就执行什么。
          这意味着如果模型（被诱导、或单纯犯傻）发来 <code>rm -rf /</code>、<code>git push --force</code>、
          <code>curl 某脚本 | sh</code>，forge 会<strong>毫不犹豫地照办</strong>。现在这双手没有任何保险。
          所以本章及之后、卷 3 加上权限确认<strong>之前</strong>，请只在<strong>你不怕弄坏的测试目录</strong>里玩 bash——
          别在你的真项目、更别在带着重要文件的目录里直接放它跑。
          卷 3 会给写工具（尤其 bash）加上「人在回路」的确认闸门：危险命令执行前先问你一声。
          但那是后话；现在，你的责任是把它关在沙盒里。
        </p>
      </Callout>

      <h3>bash 为什么是「风险等级独一档」的工具</h3>
      <p>
        write 和 edit 危险，但它们的危险<strong>有边界</strong>：write 最多改一个文件、edit 最多动一处文本，
        都局限在「文件系统、工作目录内」。bash 不一样——它把<strong>整台机器的能力</strong>一股脑交给了模型。
        同一个工具，可以装依赖、跑测试，也可以删库、发网络请求、改系统配置、把数据偷传出去。
        三个维度的失控都集中在它身上：
      </p>
      <table>
        <thead>
          <tr><th>风险维度</th><th>具体表现</th><th>forge 当前的护栏</th></tr>
        </thead>
        <tbody>
          <tr><td>破坏性</td><td><code>rm -rf</code>、<code>git push --force</code>、覆盖配置</td><td>无（卷 3 才加确认闸门）</td></tr>
          <tr><td>资源耗尽</td><td>死循环、狂吐日志、占满磁盘</td><td>timeout 60s + maxBuffer 1MB</td></tr>
          <tr><td>越权 / 外泄</td><td><code>curl 脚本 | sh</code>、读密钥外传</td><td>无（依赖沙盒目录隔离）</td></tr>
        </tbody>
      </table>
      <p>
        看清楚：<code>timeout</code> 和 <code>maxBuffer</code> 挡住的只是「<strong>资源耗尽</strong>」这一类——防止一条命令卡死或撑爆内存把 Agent 拖垮。
        但对「破坏性」和「越权外泄」，当前的 bash <strong>毫无防御</strong>。这不是疏忽，是分层：能力先做出来，缰绳卷 3 再套。
      </p>
      <Callout variant="warn" title="一个反直觉但重要的点：别在 bash 里做「命令黑名单」">
        <p>
          很多人加固 bash 的第一反应是「拦掉危险命令」——禁 <code>rm</code>、禁 <code>curl</code>。这条路<strong>基本走不通</strong>，
          因为 shell 的表达能力让黑名单形同虚设：<code>rm</code> 可以写成 <code>r''m</code>、<code>$(echo rm)</code>、
          <code>eval $(...)</code>、藏在一个脚本文件里再执行……你永远列不全。真正可靠的不是「过滤字符串」，而是<strong>收紧执行环境本身</strong>：
          在受限权限下跑（不给删关键目录的权限）、在容器/沙盒里跑、或者卷 3 那样<strong>由人确认每一条</strong>命令再放行。
          「与其猜命令安不安全，不如让它跑在一个就算危险也伤不到你的环境里」——这是处理 bash 这类工具的正解。
        </p>
      </Callout>

      <Example title="一次真实的改码闭环">
        <p>
          三个写工具单看平平无奇，但拼到一起、再配上上一章的读工具，就能跑出 Agent 最迷人的能力：
          <strong>自己改、自己验、自己纠</strong>。设想你对 forge 说「把工具超时从 60 秒改成 30 秒」，它可能这样走：
        </p>
        <ol>
          <li>
            <strong>grep 定位。</strong>先 <code>grep</code> 搜 <code>timeout</code>，发现命中在 <code>src/tools/bash.ts</code>。
          </li>
          <li>
            <strong>read 读上下文。</strong><code>read</code> 那个文件，借着行号看清 <code>timeout: 60_000</code> 周围的代码，
            好构造一段<strong>唯一</strong>的 oldString。
          </li>
          <li>
            <strong>edit 精确替换。</strong>带上足够上下文，把 <code>timeout: 60_000</code> 换成 <code>timeout: 30_000</code>。
            唯一性约束保证只改这一处。
          </li>
          <li>
            <strong>bash 跑测试。</strong>执行 <code>npm test</code>，看改动有没有破坏什么。
          </li>
          <li>
            <strong>失败就看输出再 edit。</strong>假如某个测试断言写的是 60_000，现在挂了——
            bash 把失败的报错原样回灌，模型一看「哦还有个测试要同步改」，再 <code>edit</code> 那个测试文件。
          </li>
          <li>
            <strong>再 bash，直到通过。</strong>重新 <code>npm test</code>，绿了，模型才汇报「改完且测试通过」。
          </li>
        </ol>
        <p>
          关键在于第 5、6 步那个<strong>回环</strong>：没有写工具，Agent 只能「猜一个改法然后祈祷」；
          有了 write/edit + bash，它能<strong>动手改、再亲眼验证、错了再改</strong>，把「闭环验证」变成现实。
          这正是「能干活的 Agent」和「会聊天的机器人」之间那道分水岭。
        </p>
      </Example>

      <Summary
        points={[
          '本章给 forge 装上三个 readOnly:false 的写工具——write / edit / bash——它从此能真正改动你的项目，迈出从玩具到生产级的关键一步。',
          '写工具会改变磁盘真实状态（非幂等、有副作用），所以必须串行执行（下一章细讲调度），也是卷 3「权限与人在回路」要重点设防的对象。',
          '能力与安全分两步：本章只做执行能力，安全闸门后置到卷 3——现在这双手是「裸」的，只该在测试目录里玩。',
          'write 是整文件覆盖写，用 mkdir recursive 自动建父目录；适合新建或整体替换，改局部应优先用 edit。',
          'edit 做精确字符串替换，核心是「唯一性约束」：oldString 找不到报错、出现多次也报错，逼模型带足上下文、避免误改；另有 oldString===newString 的防呆。',
          '唯一性约束呼应上一章 read 给每行加行号——read 让模型读到带定位的上下文，edit 让它据此构造唯一的 oldString，一读一写在「精确」上严丝合缝。',
          'bash 用 promisify(exec) 跑命令，配 cwd/timeout/maxBuffer 三道护栏，合并 stdout+stderr 回灌；非零退出码会抛异常，故 catch 里也要把输出与失败信息如实回灌让模型纠错。',
          'bash 现在无闸门、能跑 rm -rf——卷 3 才加权限确认，当下务必只在不怕弄坏的沙盒目录里使用。',
          'write/edit/bash 配上读工具，造就「grep 定位 → read 读上下文 → edit 替换 → bash 验证 → 失败再改」的闭环验证，这是能干活的 Agent 的分水岭。',
        ]}
      />
    </>
  )
}
