import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pkgScripts = `"scripts": {
  "dev": "tsx src/index.ts",
  "build": "tsc -p tsconfig.json",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "node --import tsx --test test/*.test.ts",
  "start": "node dist/index.js",
  "prepublishOnly": "npm run typecheck && npm run build"
}`

const pkgBin = `"bin": {
  "forge": "dist/index.js"
},
"files": [
  "dist",
  "README.md",
  "LICENSE"
],
"engines": {
  "node": ">=18"
}`

const shebang = `#!/usr/bin/env node`

const verifyCmds = `npm run build
node dist/index.js   # 没配 ANTHROPIC_API_KEY 时应提示设置它`

const verifyOut = `请先设置环境变量 ANTHROPIC_API_KEY`

const packCmd = `npm pack --dry-run`

const packOut = `npm notice 📦  forge@1.0.0
npm notice === Tarball Contents ===
npm notice 1.1kB LICENSE
npm notice 4.3kB README.md
npm notice 2.0kB dist/index.js
npm notice 1.6kB dist/agent.js
npm notice 1.2kB dist/tools.js
npm notice 0.9kB dist/config.js
npm notice === Tarball Details ===
npm notice name:          forge
npm notice version:       1.0.0
npm notice filename:      forge-1.0.0.tgz
npm notice total files:   6
npm notice
# 注意：没有 src/、没有 test/、没有 node_modules/、没有 tsconfig.json`

const tsconfigSnippet = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "sourceMap": false,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}`

const tsupConfig = `// 可选：用 tsup 一行命令打成单文件
// package.json: "build": "tsup"
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  // bundle: true（默认）会把所有相对 import 打进一个文件
})`

const headDist = `head -1 dist/index.js
# 期望第一行就是：
#!/usr/bin/env node`

export default function Ch1() {
  return (
    <>
      <Lead>
        前 7 卷里，forge 一直靠 <code>tsx</code> 直接跑 <code>src/index.ts</code>——改完代码立刻见效，舒服。
        但这只是开发态的便利。等你想把 forge 发出去、让别人 <code>npm i -g forge</code> 一行装好就能用时，
        对方的机器上既没有 tsx，也不该塞一堆 TS 源码。本章就把「源码工程」编译成「可独立运行的产物」，
        并配好可执行入口，为下一章发布做好准备。
      </Lead>

      <h2>开发态 vs 分发态</h2>
      <p>
        开发时我们用 <code>tsx src/index.ts</code>：tsx 在内存里即时转译 TS，免编译、启动快、改完即跑。
        这套流程对你自己很顺手，但它依赖三个开发环境才有的东西——tsx 这个工具、完整的 TS 源码、还有 tsconfig。
      </p>
      <p>
        分发态的世界完全不同。用户装的是一个 npm 包，里面应当是<strong>纯 JavaScript</strong>，
        node 拿到就能直接跑，不需要任何转译工具。所以发布前必须做一次「形态转换」：把 <code>src/*.ts</code>
        编译成 <code>dist/*.js</code>，把工程变成产物。
      </p>
      <p>
        <strong>为什么不能直接发 TS 源码加 tsx 当依赖？</strong>理论上可以，但代价不划算：tsx/esbuild 这类
        转译器体积不小，每个装你工具的用户都要背上这份依赖；每次启动都要现转译，冷启动慢一截；
        而且把 TS 当运行时依赖，意味着用户的环境也得能解析你的 tsconfig，耦合一下子变重。
        交付编译好的 JS，是「让用户机器尽可能少装东西」的最优解——这也是几乎所有成熟 CLI 工具的做法。
      </p>

      <KeyIdea>
        发布前要把「源码工程」变成「可独立运行的产物」：开发靠 tsx 直接跑 TS 图方便，
        但交付给别人的必须是脱离开发环境、用裸 node 就能执行的 JS。
      </KeyIdea>

      <table>
        <thead>
          <tr><th>维度</th><th>开发态（tsx）</th><th>分发态（dist/JS）</th></tr>
        </thead>
        <tbody>
          <tr><td>运行的东西</td><td>src/*.ts</td><td>dist/*.js</td></tr>
          <tr><td>是否需要转译器</td><td>需要 tsx</td><td>裸 node 即可</td></tr>
          <tr><td>启动速度</td><td>每次现转译，略慢</td><td>直接执行，最快</td></tr>
          <tr><td>谁来用</td><td>你自己改代码</td><td>陌生用户一行装好</td></tr>
          <tr><td>体积</td><td>含全部源码+依赖</td><td>只含必要 JS</td></tr>
        </tbody>
      </table>

      <h2>用 tsc 编译</h2>
      <p>
        编译这一步交给官方编译器 <code>tsc</code>。我们的 build 脚本就是 <code>tsc -p tsconfig.json</code>，
        它读 tsconfig 里的配置（尤其是 <code>outDir</code>），把 <code>src</code> 下的 TS 全部编译进 <code>dist</code>。
        先把 package.json 的脚本区回顾一遍：
      </p>

      <CodeBlock lang="json" title="package.json（脚本）" code={pkgScripts} />

      <p>逐条看这些脚本各自的职责：</p>
      <ul>
        <li><code>dev</code>：开发主力，<code>tsx src/index.ts</code> 直接跑源码，改完即生效。</li>
        <li><code>build</code>：<code>tsc -p tsconfig.json</code>，按 tsconfig 把 TS 编译进 dist，产出分发用的 JS。</li>
        <li><code>typecheck</code>：加 <code>--noEmit</code>，只做类型检查、不产出文件，专门用来在 CI 或发布前卡类型错误。</li>
        <li><code>test</code>：用 node 内置 test runner，配 <code>--import tsx</code> 直接跑 TS 测试文件。</li>
        <li><code>start</code>：<code>node dist/index.js</code>，跑的是<strong>编译后</strong>的产物，等同用户最终运行它的方式。</li>
        <li><code>prepublishOnly</code>：发布的安全闸门，下面单独讲。</li>
      </ul>
      <p>
        重点说 <code>prepublishOnly</code>。这是 npm 的生命周期钩子：执行 <code>npm publish</code> 之前，
        npm 会自动跑它。我们把它定义成「先类型检查、再构建」——只要类型没过或构建失败，发布就会中断。
        这样能彻底避免「忘了 build 就发出去」「带着类型错误发版」这类低级事故。它是你和 npm 之间最后一道自动闸门。
      </p>

      <h2>tsconfig 里真正决定产物的几个选项</h2>
      <p>
        build 脚本只是一句 <code>tsc -p tsconfig.json</code>，真正决定「编出什么」的全在 tsconfig。
        把关键几项拎出来看，它们直接影响 dist 能不能被裸 node 跑起来：
      </p>

      <CodeBlock lang="json" title="tsconfig.json（关键项）" code={tsconfigSnippet} />

      <ul>
        <li>
          <strong>outDir / rootDir</strong>：决定「源码从哪来、产物去哪」。<code>rootDir: "src"</code> 配
          <code>outDir: "dist"</code>，编出来的目录结构和 src 一一对应，<code>src/agent.ts</code> 变成
          <code>dist/agent.js</code>。
        </li>
        <li>
          <strong>module / moduleResolution: NodeNext</strong>：这是 ESM 项目的命门。它让 tsc 按 Node 的
          ESM 规则解析模块，也正因为如此，相对 import 必须自己带 <code>.js</code> 后缀（后面 warn 卡片专门讲）。
        </li>
        <li>
          <strong>target: ES2022</strong>：编译目标。Node 18+ 早就原生支持，写太低（比如 ES5）反而让产物变大、变慢。
          按你的 <code>engines</code> 最低版本来定即可。
        </li>
        <li>
          <strong>declaration</strong>：是否生成 <code>.d.ts</code>。我们这是 CLI 工具不是库，没人 import 它的类型，
          关掉省体积。如果你发的是给人 import 的库，这里要开。
        </li>
      </ul>

      <Callout variant="note">
        一个常见误区：以为 tsc 会「打包」。<strong>tsc 不打包</strong>——它是「一个 .ts 编一个 .js」的逐文件翻译，
        dist 里依然是多文件、依然保留你的 import 关系，运行时由 node 按 import 去现找。
        真正把多文件合成一个文件的是 esbuild/tsup/rollup 这类<strong>打包器</strong>，下面对比里会讲。
      </Callout>

      <h2>bin 与 shebang：让 forge 变成一条命令</h2>
      <p>
        编译出 JS 还不够，要让用户敲 <code>forge</code> 就能运行，需要两样东西配合：package.json 里的
        <code>bin</code> 字段，和入口文件首行的 shebang。先看 package.json 这几个发布相关字段：
      </p>

      <CodeBlock lang="json" title="package.json（bin/files/engines）" code={pkgBin} />

      <p>再看入口文件 <code>src/index.ts</code> 的<strong>第一行</strong>：</p>

      <CodeBlock lang="ts" title="src/index.ts（首行）" code={shebang} />

      <p>逐段拆解它们如何协作：</p>
      <ul>
        <li>
          <strong>bin</strong>：把命令名 <code>forge</code> 映射到 <code>dist/index.js</code>。用户安装包时，
          npm 会在其 PATH 上建一个指向该文件的软链，并给它加上可执行权限——于是敲 <code>forge</code> 就等于运行了这个 JS。
        </li>
        <li>
          <strong>shebang</strong>：<code>{'#!/usr/bin/env node'}</code> 告诉操作系统「这个文件被直接执行时，请用 node 来跑」。
          注意它写在 <code>.ts</code> 源码首行也没关系——tsc 会原样保留 shebang 到编译产物的第一行，所以 dist 里的文件天然带着它。
        </li>
        <li>
          <strong>files</strong>：白名单，控制发布的 tarball 只打包 <code>dist</code>、<code>README.md</code>、<code>LICENSE</code>。
          源码、测试、tsconfig 这些一律不进包。
        </li>
        <li>
          <strong>engines</strong>：声明最低 Node 版本 <code>{'>=18'}</code>。用户在更老的 Node 上安装时会收到警告，提醒环境不匹配。
        </li>
      </ul>

      <h2>软链机制：敲 forge 时到底发生了什么</h2>
      <p>
        很多人把 <code>bin</code> 当成黑魔法，其实背后机制很朴素，值得拆开看一眼，出问题时才知道去哪查。
        当用户跑 <code>npm i -g @你/forge</code> 时，npm 做了三件事：
      </p>
      <ol>
        <li>把包解压到全局 <code>node_modules</code>（比如 <code>/usr/local/lib/node_modules/forge</code>）。</li>
        <li>读 <code>bin</code> 字段，在全局 bin 目录（如 <code>/usr/local/bin</code>，已在 PATH 上）创建一个名为 <code>forge</code> 的软链，指向包里的 <code>dist/index.js</code>。</li>
        <li>给目标文件加上可执行权限。</li>
      </ol>
      <p>
        于是你敲 <code>forge</code>，shell 在 PATH 里找到那个软链，顺着它执行 <code>dist/index.js</code>，
        文件首行的 shebang 又告诉系统用 node 来跑——整条链路就通了。
        <strong>常见误区</strong>：以为 shebang 可有可无。若 dist 入口缺了首行 shebang，直接执行该文件时系统不知道用什么解释器，
        会按当前 shell 当成脚本跑，立刻报语法错误。验证产物时务必确认首行还在：
      </p>

      <CodeBlock lang="bash" title="确认 shebang 没丢" code={headDist} />

      <h2>验证产物</h2>
      <p>
        改完配置，先在本地证明产物能脱离 tsx 独立跑。编译，然后用裸 node 直接执行 dist 入口：
      </p>

      <CodeBlock lang="bash" title="本地验证" code={verifyCmds} />

      <p>因为我们没设 <code>ANTHROPIC_API_KEY</code>，forge 会走到缺少配置的分支，打印一行提示后退出：</p>

      <CodeBlock lang="text" code={verifyOut} />

      <Example>
        关键不在这行提示本身，而在于：它是用 <code>node dist/index.js</code> 跑出来的，全程没碰 tsx。
        这就证明编译产物已经能在纯 node 环境独立运行——和用户机器上的情形一致。
      </Example>

      <h2>检查将发布的内容</h2>
      <p>
        发布前还有一步不能省：用 <code>npm pack --dry-run</code> 预览即将打包进 tarball 的文件，
        但不真的生成 <code>.tgz</code>。
      </p>

      <CodeBlock lang="bash" code={packCmd} />

      <p>它会列出 tarball 里的内容，对照一下是不是只有该带的东西：</p>

      <CodeBlock lang="text" code={packOut} />

      <p>
        留意这份清单：只有 <code>LICENSE</code>、<code>README.md</code> 和 <code>dist</code> 下的 JS——
        正是 <code>files</code> 白名单的效果；而 <code>src/</code>、<code>test/</code>、<code>node_modules/</code>
        统统不在其中。
      </p>

      <Callout variant="tip">
        发布前一定先 <code>npm pack --dry-run</code> 看一眼清单。这是检查「会不会把源码、密钥文件、
        本地垃圾文件误打进包」的最便宜手段——花两秒预览，胜过发出去再撤包。
      </Callout>

      <h2>tsc vs 打包器（esbuild / tsup）：什么时候该升级</h2>
      <p>
        用 <code>tsc</code> 直接输出多文件 JS 已经完全够用，forge 这种规模没必要折腾打包器。
        但当你想进一步优化冷启动、或想把整个工具压成「一个能 <code>curl</code> 下来直接跑的单文件」时，
        就该认识一下打包器了。它们和 tsc 的根本区别是：tsc 逐文件翻译、保留 import；打包器把所有模块
        （含部分依赖）<strong>合并、tree-shake、压缩</strong>成尽量少的文件。
      </p>

      <table>
        <thead>
          <tr><th></th><th>tsc</th><th>esbuild</th><th>tsup（封装 esbuild）</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>类型编译器</td><td>极快的打包器</td><td>开箱即用的打包配置</td></tr>
          <tr><td>是否打包</td><td>否，多文件</td><td>是，可单文件</td><td>是，可单文件</td></tr>
          <tr><td>tree-shaking</td><td>无</td><td>有</td><td>有</td></tr>
          <tr><td>类型检查</td><td>有</td><td>无（只转译）</td><td>无（建议另跑 tsc）</td></tr>
          <tr><td>配置成本</td><td>低</td><td>中</td><td>低</td></tr>
        </tbody>
      </table>
      <p>
        要点：esbuild/tsup 速度飞快、能 tree-shake 掉没用到的代码、能输出单文件，但它们<strong>只转译不查类型</strong>。
        所以即便用了打包器，<code>typecheck</code> 这步（纯 tsc <code>--noEmit</code>）也别省——让打包器管产物、让 tsc 管正确性，各司其职。
        下面是一份最小的 tsup 配置，思路和 tsc 完全一致，只是产物形态换成了单文件：
      </p>

      <CodeBlock lang="ts" title="tsup.config.ts（可选升级方案）" code={tsupConfig} />

      <Callout variant="note">
        本章用 <code>tsc</code> 直接输出 JS 已经完全够用。如果你追求更快的冷启动，也可以换成
        <code>esbuild</code> 或 <code>tsup</code> 把整个项目打成单文件——思路完全一致：
        把多文件 TS 变成可分发的 JS，只是产物形态不同。注意打包器会把依赖也打进去，
        这时 package.json 的 <code>dependencies</code> 反而可以清空（依赖已内联），是另一套权衡。
      </Callout>

      <Callout variant="warn">
        ESM 项目里，相对 import 必须带 <code>.js</code> 后缀（哪怕源码是 <code>.ts</code>）。
        这正是前面所有 import 都写成 <code>{"import { x } from './xxx.js'"}</code> 的原因——
        TS 编译时不会帮你补后缀，只有源码里就写好 <code>.js</code>，编译后的 ESM 才能被 node 正确解析。
        踩过这个坑的人都见过那条经典报错 <code>ERR_MODULE_NOT_FOUND</code>：dev 用 tsx 跑得好好的，
        一 build 出来 node 就找不到模块——根因往往就是漏了这个 <code>.js</code> 后缀。
      </Callout>

      <h2>衔接下一章</h2>
      <p>
        产物已经有了：编译进 dist、配好 bin 与 shebang、用 files 收紧打包范围、dry-run 确认无误。
        下一章我们执行 <code>npm publish</code>，让任何人都能 <code>npm i -g forge</code> 装好就用。
      </p>

      <KeyIdea>
        打包的本质是一次形态转换：从「依赖开发工具的 TS 工程」到「裸 node 即可运行的 JS 产物」。
        把这一步做扎实，发布就只剩临门一脚。
      </KeyIdea>

      <Summary
        points={[
          '开发态用 tsx 直接跑 TS 图快；分发态必须是纯 JS，发布前要把工程编译成可独立运行的产物。',
          'build 脚本即 tsc -p tsconfig.json，按 outDir 把 src 编译进 dist；start 用 node dist/index.js 模拟用户运行。',
          'tsconfig 的 outDir/rootDir/module=NodeNext/target 决定产物形态；tsc 逐文件翻译、不打包。',
          'prepublishOnly = 类型检查 + 构建，是 npm publish 前的自动安全闸门，不过不让发。',
          'bin 把命令名 forge 映射到 dist/index.js；npm 装包时建软链到 PATH 并加可执行权限。',
          'shebang #!/usr/bin/env node 让文件可被直接执行，tsc 原样保留它；丢了首行直接执行会报错。',
          'files 白名单只发 dist/README/LICENSE；engines 声明最低 Node 版本 >=18。',
          'node dist/index.js 跑出缺 ANTHROPIC_API_KEY 的提示，证明产物脱离 tsx 也能独立运行。',
          'npm pack --dry-run 预览 tarball，发布前务必看一眼，别把源码/密钥/垃圾文件打进包。',
          'tsc 够用；想要单文件/更快冷启动可换 esbuild/tsup 打包，但它们只转译不查类型，typecheck 仍靠 tsc。',
          'ESM 相对 import 必须带 .js 后缀，漏了会在 build 后报 ERR_MODULE_NOT_FOUND；下一章发布到 npm。',
        ]}
      />
    </>
  )
}
