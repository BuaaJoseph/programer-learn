import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `# 1. 进入空文件夹，初始化 package.json（-y 跳过交互式问答，先生成默认值，后面再改）
npm init -y

# 2. 运行时依赖：Agent 真正跑起来时需要它
npm install @anthropic-ai/sdk

# 3. 开发依赖：只在写代码/构建时用到，发布产物里不需要
npm install -D typescript tsx @types/node`

const packageJson = `{
  "name": "@buaajoseph/forge",
  "version": "0.1.0",
  "description": "A production-grade coding agent CLI, built from scratch — the companion repo for the course 《从零构建生产级 Agent》.",
  "type": "module",
  "bin": {
    "forge": "dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "start": "node dist/index.js"
  },
  "keywords": ["agent","cli","coding-agent","claude","anthropic","llm"],
  "author": "BuaaJoseph",
  "license": "MIT",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.70.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}`

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}`

const indexTs = `#!/usr/bin/env node
console.log('forge 起来了 ✅')`

const runDev = `npm run dev
# 终端应当打印：
# forge 起来了 ✅`

const esmVsCjs = `// CommonJS（老世界，require/module.exports）
const Anthropic = require('@anthropic-ai/sdk')
module.exports = { run }

// ESM（新世界，import/export）—— forge 用这套
import Anthropic from '@anthropic-ai/sdk'
export { run }`

const buildVsDev = `# 开发期：tsx 直接跑源码，改完立刻见效，没有 dist/
src/index.ts ──(tsx 内存转译)──▶ 直接运行

# 发布期：tsc 把源码编译成可分发的 JS
src/index.ts ──(tsc 编译)──▶ dist/index.js ──(node)──▶ 运行`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们讲清了「Agent 到底是什么」。这一章不写任何 Agent 逻辑，只做一件事：把一个空文件夹变成一个能跑、能构建、能暴露成命令行命令的
          Node + TypeScript 工程。脚手架是后面所有章节的地基——地基不稳，越往上盖越痛苦。我们一步步来，每一步都讲清「为什么」。
        </p>
      </Lead>

      <h2>第一步：初始化与安装依赖</h2>
      <p>
        新建一个空文件夹（例如 <code>forge/</code>），在里面打开终端。我们先初始化 <code>package.json</code>，再分两类装依赖：
        <strong>运行时依赖</strong>（程序跑起来真正要用的）和 <strong>开发依赖</strong>（只在写代码、构建时用到，发布时不带）。
      </p>

      <CodeBlock lang="bash" title="初始化 + 安装依赖" code={installCode} />

      <p>三类东西各有用途，逐个说清：</p>
      <ul>
        <li>
          <code>@anthropic-ai/sdk</code>：Claude 官方 SDK，是<strong>运行时依赖</strong>。Agent 的核心是反复调用大模型，
          它就是我们和 Claude 对话的客户端。用 <code>npm install</code>（不带 <code>-D</code>）装进 <code>dependencies</code>。
        </li>
        <li>
          <code>typescript</code>：提供 <code>tsc</code> 编译器，把 <code>.ts</code> 源码编译成可发布的 <code>.js</code>。
        </li>
        <li>
          <code>@types/node</code>：Node 内置模块（<code>fs</code>、<code>path</code>、<code>process</code> 等）的类型声明，
          没有它，TypeScript 不认识 <code>process.argv</code> 这种东西。
        </li>
        <li>
          <code>tsx</code>：开发期的「免编译运行器」。下面单独讲它。
        </li>
      </ul>

      <Callout variant="tip" title="dependencies 还是 devDependencies？一个简单判据">
        <p>
          搞不清某个包该装哪边时，问自己一句：<strong>「用户 <code>npm i -g</code> 装完、断网跑 forge 时，这个包还需要在吗？」</strong>
          需要 → <code>dependencies</code>（比如 <code>@anthropic-ai/sdk</code>，运行时要调模型）；不需要 → <code>devDependencies</code>
          （比如 <code>typescript</code>、<code>tsx</code>，它们只参与「把源码变成产物」这个过程，产物本身不依赖它们）。
          装错了不会立刻报错，但会让你发布的包白白变胖、甚至把构建工具塞进用户机器，是典型的「不报错但不专业」。
        </p>
      </Callout>

      <h3>tsx 是干嘛的？</h3>
      <p>
        正常流程是 <code>.ts</code> 源码 →（<code>tsc</code> 编译）→ <code>.js</code> → 用 <code>node</code> 跑。
        开发时每改一行都要先编译再运行，很啰嗦。<code>tsx</code> 让你<strong>直接运行 TypeScript 源码</strong>——
        它在内存里即时转译 <code>.ts</code>，省掉「先 build 再 node」这一步。所以开发期我们用 <code>tsx src/index.ts</code> 跑源码，
        改完立刻看效果；只有要发布时才真正用 <code>tsc</code> 编译出 <code>dist/</code>。一句话：<strong>tsx 是开发期的提速工具，tsc 是发布期的构建工具</strong>，两者分工不同。
      </p>
      <CodeBlock lang="bash" title="开发期 vs 发布期：两条不同的路" code={buildVsDev} />
      <p>
        多说一句 <code>tsx</code> 的原理，免得你把它当黑魔法。它底层用的是 <strong>esbuild</strong>——
        一个用 Go 写的、快到离谱的转译器。关键点在于：<strong>tsx 只做「转译（transpile）」，不做「类型检查（type-check）」</strong>。
        它把 TypeScript 语法<em>剥掉类型标注</em>变成能跑的 JS，但<strong>不会因为你类型写错而拒绝运行</strong>。
        这是个有意的取舍：开发时要的是「改完立刻能跑」的速度，类型检查交给 <code>tsc --noEmit</code>（也就是我们的
        <code>typecheck</code> 脚本）和编辑器里的 TS 服务去做。理解这一点能省掉一个经典困惑——
        <strong>「为什么 <code>npm run dev</code> 跑得好好的，<code>npm run build</code> 却报一堆类型错？」</strong>
        因为 dev 根本没查类型，build 才查。
      </p>

      <h2>第二步：补全 package.json</h2>
      <p>
        <code>npm init -y</code> 生成的是最简默认值，我们要把它改成下面这份完整内容。把整份替换进去，然后逐字段讲解为什么这么写。
      </p>

      <CodeBlock lang="json" title="package.json" code={packageJson} />

      <p>关键字段逐个拆解：</p>
      <ul>
        <li>
          <code>"type": "module"</code>：声明整个包用 <strong>ESM</strong>（ECMAScript Module，即 <code>import</code>/<code>export</code>），
          而不是老式的 CommonJS（<code>require</code>）。现代 Node 生态、Claude SDK 都走 ESM，这是默认且正确的选择。
        </li>
        <li>
          <code>{'"bin": {"forge": "dist/index.js"}'}</code>：声明这个包能提供一个名叫 <code>forge</code> 的命令行命令，
          它指向构建产物 <code>dist/index.js</code>。装上这个包后，终端里敲 <code>forge</code> 就会执行那个文件——这就是我们的 CLI 名字的由来。
        </li>
        <li>
          <code>"files": ["dist", "README.md"]</code>：控制 <code>npm publish</code> 时<strong>只打包哪些东西</strong>。
          源码 <code>src/</code>、配置文件都不需要发布，用户只要编译好的 <code>dist/</code> 和说明文档，这样发布包更小更干净。
        </li>
        <li>
          <code>{'"engines": {"node": ">=18"}'}</code>：声明运行所需的最低 Node 版本。我们用到的现代特性（如内置 fetch、ESM）需要 Node 18+，
          写明它能在用户用旧版本时给出友好提示。
        </li>
        <li>
          <code>"scripts"</code>：定义四个常用命令——
          <code>dev</code>（<code>tsx src/index.ts</code>，开发期免编译跑源码）、
          <code>build</code>（<code>tsc -p tsconfig.json</code>，编译出 <code>dist/</code>）、
          <code>typecheck</code>（<code>tsc --noEmit</code>，只做类型检查不产出文件，用于 CI 或提交前自查）、
          <code>start</code>（<code>node dist/index.js</code>，跑编译后的产物）。
        </li>
      </ul>

      <h3>ESM vs CommonJS：为什么这个选择影响深远</h3>
      <p>
        <code>"type": "module"</code> 这一行看着不起眼，却决定了你整个项目后续每一行 <code>import</code> 的写法、
        每一个第三方包能不能顺利引入。值得花点篇幅讲清两者的本质区别：
      </p>
      <CodeBlock lang="ts" title="同一件事，两套写法" code={esmVsCjs} />
      <ul>
        <li>
          <strong>加载时机不同。</strong>CommonJS 的 <code>require</code> 是<em>运行时同步</em>加载的——代码跑到那一行才去读文件、
          执行、返回值。ESM 的 <code>import</code> 是<em>静态</em>的——模块依赖关系在代码<em>运行前</em>就被解析确定。
          静态结构带来一个实打实的好处：打包工具能做 <strong>tree-shaking</strong>（摇掉没用到的代码），产物更小。
        </li>
        <li>
          <strong>这是行业的明确方向。</strong>ESM 是 JavaScript 语言官方的模块标准，新生态（包括 Claude 的官方 SDK）
          越来越多地<strong>只发 ESM</strong>。如果你用 CommonJS，迟早会撞上「这个包只能 import、不能 require」的墙。
          顺着标准走，路最宽。
        </li>
        <li>
          <strong>代价是几个「ESM 特有的小规矩」。</strong>最典型的就是后面要讲的「相对导入必须带 <code>.js</code> 后缀」。
          这些规矩一开始会让人不适，但都是一次性学会、终身受用的。
        </li>
      </ul>

      <h2>第三步：配置 tsconfig.json</h2>
      <p>
        <code>tsconfig.json</code> 是 TypeScript 编译器的配置中枢，决定「源码怎么被理解、编译成什么样、检查多严」。在项目根目录新建它：
      </p>

      <CodeBlock lang="json" title="tsconfig.json" code={tsconfigJson} />

      <p>挑重点讲：</p>
      <ul>
        <li>
          <code>"target": "ES2022"</code>：编译出的 JavaScript 语法目标。Node 18+ 原生支持 ES2022，
          不必降级到老语法，能用上 <code>at()</code>、顶层 <code>await</code> 等现代特性。
        </li>
        <li>
          <code>"module": "ESNext"</code> + <code>"moduleResolution": "Bundler"</code>：这对组合是为 ESM 服务的。
          <code>ESNext</code> 让产出用 <code>import</code>/<code>export</code>；<code>Bundler</code> 模式让模块解析更宽松，
          配合 <code>"type": "module"</code> 使用，省去很多 ESM 路径配置的繁琐。
        </li>
        <li>
          <code>"strict": true</code>：一键打开所有严格类型检查（含 <code>strictNullChecks</code> 等）。再叠加几个开关：
          <code>noUnusedLocals</code>（未使用的变量报错）、<code>noUnusedParameters</code>（未使用的参数报错）、
          <code>noFallthroughCasesInSwitch</code>（switch 漏写 break 时报错）。
          对 Agent 项目来说，<strong>严格模式尤其重要</strong>：Agent 要循环调用模型、解析工具参数、处理一堆可能为 null 的返回值，
          错误往往藏在「某个值可能是 undefined」这种细节里。让编译器在写代码时就把这些问题逼出来，远比上线后在循环里炸掉强。
        </li>
        <li>
          <code>"outDir": "dist"</code> + <code>"rootDir": "src"</code>：源码都放在 <code>src/</code>，编译产物全部输出到 <code>dist/</code>。
          这就是为什么 <code>bin</code> 指向 <code>dist/index.js</code>、<code>files</code> 只发布 <code>dist/</code>——三者是配套的。
        </li>
      </ul>

      <p>剩下几个开关看着零碎，但每一个都在替你挡一类真实的坑，值得点一遍：</p>
      <ul>
        <li>
          <code>"skipLibCheck": true</code>：跳过对 <code>node_modules</code> 里 <code>.d.ts</code> 声明文件的类型检查。
          你管不了别人包里的类型写得对不对，没必要让它们拖慢你的构建、甚至因为别人的类型 bug 让你编译失败。
          这是几乎所有现代 TS 项目的标配。
        </li>
        <li>
          <code>"forceConsistentCasingInFileNames": true</code>：强制文件名大小写一致。
          macOS 文件系统默认不区分大小写，<code>./Agent.ts</code> 和 <code>./agent.ts</code> 在你本机都能 import 成功；
          一旦推到区分大小写的 Linux（CI、服务器）上就「找不到模块」。打开它，本地就先报错，省掉一类玄学事故。
        </li>
        <li>
          <code>"sourceMap": true</code>：生成 source map，让运行 <code>dist/</code> 时报的错能映射回 <code>src/</code> 的原始行号。
          调试发布产物时，没有它你只能对着编译后的 JS 干瞪眼。
        </li>
        <li>
          <code>"declaration": false</code>：不生成 <code>.d.ts</code> 类型声明。forge 是一个<strong>给人用的命令行工具</strong>，
          不是一个<strong>给别人 import 的库</strong>——没人会 <code>import {'{ ... }'} from '@buaajoseph/forge'</code>，
          所以不需要对外暴露类型。如果哪天你想把某部分做成库给人用，再把它打开。
        </li>
      </ul>

      <h2>第四步：写第一个入口文件</h2>
      <p>
        现在写 <code>src/index.ts</code>。这一版只做一件事：<strong>验证脚手架真的能跑</strong>。先不碰任何 Agent 逻辑。
      </p>

      <CodeBlock lang="ts" title="src/index.ts（最小验证版）" code={indexTs} />

      <p>
        注意第一行 <code>#!/usr/bin/env node</code>，它叫 <strong>shebang</strong>。当这个文件作为 <code>bin</code> 可执行命令被直接运行时，
        操作系统会读这一行，知道「用 <code>node</code> 来执行我」。也就是说，将来用户敲 <code>forge</code>，系统能正确地用 Node 跑起 <code>dist/index.js</code>，
        而不是把它当成 shell 脚本。开发期用 <code>tsx</code> 跑时这行不起作用（会被当注释忽略），但它对最终的命令行可执行性是必须的——现在写好，省得以后忘。
      </p>

      <Example title="shebang 与 bin：一条命令在终端里到底经历了什么">
        <p>当用户在终端敲下 <code>forge</code> 回车，背后这条链路依次发生：</p>
        <ul>
          <li>
            <strong>① npm 装包时建好了软链。</strong>用户 <code>npm i -g</code> 时，npm 读取你 <code>package.json</code> 里的
            <code>bin</code> 字段，在系统的全局 bin 目录里创建一个名叫 <code>forge</code> 的可执行软链，指向你的 <code>dist/index.js</code>。
          </li>
          <li>
            <strong>② shell 找到并执行这个文件。</strong>因为全局 bin 目录在 <code>PATH</code> 里，shell 找到 <code>forge</code> 并尝试执行它。
          </li>
          <li>
            <strong>③ 内核读 shebang 决定用谁来跑。</strong>类 Unix 系统看到文件首行的 <code>#!/usr/bin/env node</code>，
            就用 <code>env</code> 在 <code>PATH</code> 里找到 <code>node</code>，再用它来执行这个文件。
            （写 <code>/usr/bin/env node</code> 而不是写死 <code>/usr/bin/node</code>，正是为了不假设 node 装在哪——更可移植。）
          </li>
        </ul>
        <p>
          所以「<code>bin</code> 字段」和「shebang」是<strong>一对必须配齐的搭档</strong>：前者让命令名指向文件，
          后者让文件知道该用 node 来跑。少了任何一个，<code>forge</code> 在终端里都跑不起来。
        </p>
      </Example>

      <h2>第五步：跑起来</h2>
      <p>
        一切就绪，执行 <code>npm run dev</code>。它会调用 <code>tsx src/index.ts</code>，直接运行源码：
      </p>

      <CodeBlock lang="bash" title="运行" code={runDev} />

      <p>
        看到 <code>forge 起来了 ✅</code>，说明从源码到运行的链路通了。
      </p>

      <Callout variant="tip" title="先打个预防针：ESM 里相对导入要带 .js 后缀">
        <p>
          在 <code>"type": "module"</code> 的 ESM 项目里，<strong>相对导入必须带文件后缀，而且写的是 <code>.js</code> 而不是 <code>.ts</code></strong>。
          比如以后引用 <code>src/agent.ts</code> 时，要写 <code>import &#123; run &#125; from './agent.js'</code>——
          即使源码文件其实是 <code>.ts</code>。原因是：TypeScript 不改写你的导入路径，编译后跑的是 <code>.js</code>，
          所以路径要写成产物运行时的样子。这是后面所有 <code>import</code> 都要遵守的约定，现在记住，能省掉一大堆「找不到模块」的报错。
        </p>
      </Callout>

      <p>
        把这条约定的「为什么」再钉死一点，因为它是 ESM 初学者翻车率最高的一处。
        TypeScript 有一个常被误解的设计原则：<strong>它只做类型检查和语法降级，绝不替你「重写」导入路径</strong>。
        你写 <code>'./agent.ts'</code>，它<em>不会</em>帮你把后缀改成 <code>.js</code>，于是编译后的 <code>dist/</code> 里出现一句
        <code>import ... from './agent.ts'</code>——可 <code>dist/</code> 里压根没有 <code>.ts</code> 文件，Node 当场报「找不到模块」。
        反过来，你写 <code>'./agent.js'</code>，TS 在编译期知道你指的是同名 <code>.ts</code> 源码（能正常做类型检查），
        编译后这句原样保留，正好对上 <code>dist/agent.js</code>。一句话记牢：<strong>导入路径要写「产物运行时的样子」，而不是「源码现在的样子」。</strong>
      </p>

      <KeyIdea title="脚手架阶段的目标：一条顺畅的链路，而不是功能">
        <p>
          这一章一行业务逻辑都没写，但这正是重点。脚手架阶段要追求的，是
          <strong>一条能从源码走到可执行命令的顺畅链路</strong>：<code>dev</code> 能直接跑源码（开发提速）、
          <code>build</code> 能编译出 <code>dist/</code>（产出可发布产物）、<code>bin</code> 能把 <code>forge</code> 命令暴露出去（最终交付形态）。
          这三段路一旦通了，后面每加一个功能都是在稳固地基上往前走；地基不通，写再多功能都是在流沙上盖楼。
        </p>
      </KeyIdea>

      <Callout variant="note" title="一个值得现在就养成的习惯：dev 跑得通 ≠ build 跑得通">
        <p>
          因为 <code>tsx</code>（dev）不查类型而 <code>tsc</code>（build）查，很多类型错误会一直潜伏到你打算发布时才爆发，
          那往往是最不想被打断的时刻。工程上的对策很简单：<strong>把 <code>npm run typecheck</code> 当成提交前的体检</strong>——
          要么在 commit 前手动跑一次，要么在 CI 里设成必过项。养成这个习惯，「dev 好好的、build 突然红一片」的尴尬就基本绝迹了。
        </p>
      </Callout>

      <Summary
        points={[
          '运行时依赖（@anthropic-ai/sdk）进 dependencies，开发工具（typescript/tsx/@types/node）用 -D 进 devDependencies；判据是「用户装完断网跑 forge 时还需不需要它」。',
          'tsx 是开发期免编译直接跑 .ts 的提速工具，底层用 esbuild、只转译不查类型；tsc 是发布期编译进 dist/ 的构建工具且会查类型——这解释了为什么 dev 通而 build 可能报错。',
          'package.json 里 type:module 选 ESM、bin 暴露 forge 命令、files 控制发布只带 dist 和 README、scripts 串起 dev/build/typecheck/start。',
          'ESM（静态 import、可 tree-shaking、是语言标准且新 SDK 多只发 ESM）优于 CommonJS，代价是几条小规矩（最典型的是相对导入带 .js 后缀）。',
          'tsconfig 用 ESNext + moduleResolution:Bundler 配合 ESM，strict 及一系列严格开关对 Agent 这类多分支、多 null 的项目尤其值钱；skipLibCheck/forceConsistentCasing/sourceMap/declaration 各挡一类坑。',
          'src/index.ts 第一行 shebang 与 package.json 的 bin 是一对搭档：bin 让命令名指向文件，shebang 让内核用 node 来跑；ESM 相对导入写「产物运行时的 .js 样子」，因为 TS 不重写导入路径。',
          '脚手架的目标不是功能，而是 dev 跑源码、build 出 dist、bin 暴露命令这条从源码到可执行的顺畅链路；把 typecheck 当提交前体检，避免「dev 通 build 炸」。',
        ]}
      />
    </>
  )
}
