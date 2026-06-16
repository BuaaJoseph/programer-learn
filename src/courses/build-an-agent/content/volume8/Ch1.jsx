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

      <KeyIdea>
        发布前要把「源码工程」变成「可独立运行的产物」：开发靠 tsx 直接跑 TS 图方便，
        但交付给别人的必须是脱离开发环境、用裸 node 就能执行的 JS。
      </KeyIdea>

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

      <Callout variant="note">
        本章用 <code>tsc</code> 直接输出 JS 已经完全够用。如果你追求更快的冷启动，也可以换成
        <code>esbuild</code> 或 <code>tsup</code> 把整个项目打成单文件——思路完全一致：
        把多文件 TS 变成可分发的 JS，只是产物形态不同。
      </Callout>

      <Callout variant="warn">
        ESM 项目里，相对 import 必须带 <code>.js</code> 后缀（哪怕源码是 <code>.ts</code>）。
        这正是前面所有 import 都写成 <code>{"import { x } from './xxx.js'"}</code> 的原因——
        TS 编译时不会帮你补后缀，只有源码里就写好 <code>.js</code>，编译后的 ESM 才能被 node 正确解析。
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
          'prepublishOnly = 类型检查 + 构建，是 npm publish 前的自动安全闸门，不过不让发。',
          'bin 把命令名 forge 映射到 dist/index.js；shebang #!/usr/bin/env node 让文件可被直接执行，tsc 原样保留它。',
          'files 白名单只发 dist/README/LICENSE；engines 声明最低 Node 版本 >=18。',
          'node dist/index.js 跑出缺 ANTHROPIC_API_KEY 的提示，证明产物脱离 tsx 也能独立运行。',
          'npm pack --dry-run 预览 tarball，发布前务必看一眼，别把源码/密钥/垃圾文件打进包。',
          'ESM 相对 import 必须带 .js 后缀，这是前面源码全写 ./xxx.js 的原因；下一章发布到 npm。',
        ]}
      />
    </>
  )
}
