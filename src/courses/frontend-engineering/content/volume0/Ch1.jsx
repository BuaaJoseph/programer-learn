import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BuildPipeline from '@/courses/frontend-engineering/illustrations/BuildPipeline.jsx'

const jqueryEra = `<!-- 远古时代：在 HTML 里手动一个个引脚本，顺序还不能错 -->
<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
<script src="https://cdn.example.com/lodash.min.js"></script>
<script src="https://cdn.example.com/moment.min.js"></script>
<!-- 下面两个文件依赖上面三个全局变量：jQuery、_、moment -->
<script src="js/utils.js"></script>
<script src="js/app.js"></script>

<!-- 问题：
     1. 谁依赖谁全靠人脑记，引错顺序就 undefined is not a function
     2. 版本靠 URL 里的数字，升级要手改、还可能漏改
     3. 所有脚本共享同一个 window，变量名一撞就互相覆盖 -->`

const globalPollution = `// a.js —— 没有模块，所有东西都挂在 window 上
var count = 0
function render() { /* ... */ }

// b.js —— 另一个同事写的，恰好也叫 count / render
var count = 100        // 悄悄覆盖了 a.js 的 count
function render() { } // 也覆盖了 a.js 的 render

// 结果：两个文件谁后加载谁说了算，bug 极难定位`

const esmModule = `// math.js —— 用 ES Module 显式声明「我导出什么」
export function add(a, b) {
  return a + b
}
export const PI = 3.14159

// app.js —— 显式声明「我依赖谁」，作用域互相隔离
import { add, PI } from './math.js'

console.log(add(1, 2)) // 3
// add / PI 只在本文件可见，不再污染全局 window`

const pkgJson = `{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "eslint": "^9.0.0"
  }
}`

const transpile = `// 我们写的现代源码（ES2023 + JSX + TS 类型）
const greet = (name: string): string => \`Hello, \${name}!\`
const el = <h1>{greet('world')}</h1>

// 编译/转译后，浏览器能直接跑的等价代码（示意）
var greet = function (name) { return "Hello, " + name + "!"; };
var el = React.createElement("h1", null, greet("world"));`

const lintConfig = `// eslint.config.js —— 把「团队约定」写成机器可检查的规则
export default [
  {
    rules: {
      'no-unused-vars': 'error',     // 声明了没用的变量 → 报错
      'no-console': 'warn',          // 残留的 console.log → 警告
      'eqeqeq': 'error',             // 必须用 === 而不是 ==
    },
  },
]`

export default function Ch1() {
  return (
    <article>
      <Lead>
        十几年前，写一个网页前端可能只是在 HTML 里塞几个 <code>{'<script>'}</code> 标签、加上一份
        jQuery，刷新浏览器就能看到效果，没有「构建」这一步。今天，一个稍具规模的前端项目却离不开
        包管理器、打包器、转译器、Linter、测试框架和 CI/CD 流水线。这一章先回答最根本的问题：
        前端到底是被什么逼到了「必须工程化」这一步？工程化又在替我们解决哪些具体的痛？
      </Lead>

      <h2>一、从「几个 script 标签」到大型协作工程</h2>
      <p>
        早期的前端非常朴素：一个 HTML 文件，几段内联脚本，再引一两个 CDN 上的库。代码量小、
        只有一两个人维护、浏览器之间差异虽大但需求也简单。那时候根本不存在「前端工程」这个说法——
        改完文件直接上传到服务器就算发布了。
      </p>
      <p>
        但前端承担的职责在这十几年里急剧膨胀：从「给页面加点交互」变成了承载整个应用的视图层，
        单页应用（SPA）、组件化、状态管理、路由、动画、离线缓存全压在浏览器里。代码量从几百行涨到
        几十万行，参与的人从一个变成几十个，浏览器和设备的兼容矩阵也越来越大。当「规模」和「人数」
        同时上一个数量级，原来手工就能搞定的事开始系统性地出错。
      </p>
      <KeyIdea>
        工程化不是凭空发明出来给人添麻烦的流程，而是<strong>复杂度增长到一定程度后的必然产物</strong>。
        它的本质只有一句话：<strong>用工具驯服复杂度，把人工容易出错的事自动化。</strong>
      </KeyIdea>
      <CodeBlock lang="html" title="远古写法：手动一个个引脚本" code={jqueryEra} />

      <h2>二、复杂度从哪里来：逐个拆解</h2>
      <p>
        要理解工程化解决什么问题，得先看清复杂度的来源。下面我们把前端工程里几类最典型的复杂度
        逐个拆开讲——它们几乎一一对应着今天工具链里的某一层。
      </p>

      <h3>1. 依赖管理：从手动引脚本到包管理器</h3>
      <p>
        手动用 <code>{'<script>'}</code> 引第三方库的时代，你要自己记住每个库依赖哪些别的库、
        加载顺序不能错、升级版本得手改 URL，还要处理「A 库需要 lodash 3，B 库需要 lodash 4」
        这种版本冲突。项目一大，这套人工记忆很快崩溃。
      </p>
      <p>
        包管理器（npm/pnpm/yarn）就是来接管这件事的：你只在 <code>package.json</code> 里声明
        「我需要哪些包、什么版本范围」，工具负责递归把这些包和它们的依赖一起装好、锁定具体版本
        （lockfile），并处理冲突。升级、删除、复现别人的环境，都变成一条命令。
      </p>
      <CodeBlock lang="json" title="package.json：声明式的依赖清单" code={pkgJson} />

      <h3>2. 模块化：从全局变量污染到模块系统</h3>
      <p>
        没有模块系统时，所有脚本共享同一个全局 <code>window</code>。两个文件里只要有同名变量或函数，
        后加载的就会<strong>悄悄覆盖</strong>前面的，谁也不知道。这就是「全局污染」，是大型项目里
        最隐蔽的一类 bug。
      </p>
      <CodeBlock lang="js" title="全局污染：同名变量互相覆盖" code={globalPollution} />
      <p>
        模块化（ES Module）用 <code>import</code> / <code>export</code> 让每个文件成为独立作用域：
        显式声明「我导出什么、我依赖谁」，文件内部的变量默认彼此隔离，不再往全局乱塞东西。
        依赖关系也从「靠脚本顺序隐式表达」变成了「代码里写清楚的显式声明」，工具据此就能算出
        一张精确的依赖图。
      </p>
      <CodeBlock lang="js" title="ES Module：作用域隔离、依赖显式" code={esmModule} />

      <h3>3. 编译与转译：把新代码翻译成浏览器能跑的代码</h3>
      <p>
        我们想用最新的语言特性和写法来提升开发效率——ES2023+ 的新语法、TypeScript 的类型、
        React 的 JSX。但浏览器（尤其要兼顾老旧版本）不一定认识这些。于是中间必须有一道
        <strong>编译/转译</strong>：把 TS 的类型擦掉、把 JSX 变成 <code>createElement</code> 调用、
        把新语法降级成等价的老语法，最后产出浏览器真正能执行的 JavaScript。
      </p>
      <CodeBlock lang="js" title="源码 → 转译产物（示意）" code={transpile} />
      <Callout variant="note" title="为什么不能直接把源码丢给浏览器">
        浏览器原生不认识 TS 类型，也不认识 JSX；某些新语法在旧浏览器里会直接语法报错。
        转译这一步把「为开发者写得爽」的源码翻译成「为浏览器跑得通」的产物——
        这正是前端必须有「构建」环节的核心原因之一。
      </Callout>

      <h3>4. 构建优化：打包、压缩、分割</h3>
      <p>
        模块多了，如果原样把几百个小文件直接发给浏览器，会带来大量网络请求和加载延迟。
        构建工具会把模块按依赖图<strong>打包</strong>成少数几个文件、<strong>压缩</strong>掉空格与冗余、
        摇掉没用到的代码（Tree Shaking），再按路由/按需把产物<strong>分割</strong>成多个 chunk，
        让首屏只加载必要的部分。下面这张图把一次构建的流水线拆开了看。
      </p>
      <BuildPipeline />
      <p>
        从入口出发解析依赖图、逐个转换各类资源、生成并拆分 chunk、做优化、最后产出 <code>dist/</code>——
        这条主线就是 Vite / webpack / Rollup 等工具的共同骨架。优化的目标始终是：让用户用更少的字节、
        更少的请求，更快地看到页面。
      </p>

      <h3>5. 代码质量与协作规范：Lint、格式化、提交规范</h3>
      <p>
        一个人写代码可以随心所欲，几十个人一起写就必须有统一约定，否则代码风格五花八门、低级错误
        反复出现、code review 全在吵分号和缩进。工程化把这些约定<strong>写成机器可检查的规则</strong>：
        Linter（如 ESLint）静态扫描出潜在错误和不规范写法，格式化工具（如 Prettier）自动统一缩进
        引号空格，提交规范（如 Conventional Commits + commit hook）约束提交信息的格式。
      </p>
      <CodeBlock lang="js" title="把团队约定写成 ESLint 规则" code={lintConfig} />

      <h3>6. 自动化测试与发布</h3>
      <p>
        项目越大，「改 A 处不小心弄坏 B 处」的风险越高。靠人工每次回归点一遍所有功能既慢又不可靠。
        自动化测试（单元测试、组件测试、端到端测试）把验证逻辑固化成可重复运行的脚本；CI/CD 则在
        每次提交时自动跑测试、跑 Lint、跑构建，全绿了才允许合并和发布。发布本身也从「手动 FTP 传文件」
        进化成一条可追溯、可回滚的自动化流水线。
      </p>

      <h2>三、问题 → 工具：一张对照表</h2>
      <p>
        把上面的复杂度来源和它们对应的工具放在一起，工程化的全貌就清晰了。本课后续各卷，基本就是
        在逐层展开这张表里的每一行。
      </p>
      <table>
        <thead>
          <tr><th>复杂度 / 问题</th><th>没有工程化时</th><th>工程化的工具方案</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>依赖管理</td>
            <td>手动引脚本、记加载顺序、改 URL 升级</td>
            <td>npm / pnpm / yarn + lockfile</td>
          </tr>
          <tr>
            <td>模块化</td>
            <td>全局变量污染、同名互相覆盖</td>
            <td>ES Module（import / export）</td>
          </tr>
          <tr>
            <td>语言特性 / 类型 / JSX</td>
            <td>只能用浏览器认得的老语法</td>
            <td>转译器：Babel / esbuild / SWC / tsc</td>
          </tr>
          <tr>
            <td>体积 / 加载性能</td>
            <td>几百个小文件逐个请求</td>
            <td>打包 / 压缩 / Tree Shaking / 代码分割</td>
          </tr>
          <tr>
            <td>代码质量与风格</td>
            <td>风格不一、低级错误反复出现</td>
            <td>ESLint / Prettier / 提交规范钩子</td>
          </tr>
          <tr>
            <td>回归与发布安全</td>
            <td>人工点一遍、手动传文件</td>
            <td>Vitest / Jest / Playwright + CI/CD</td>
          </tr>
        </tbody>
      </table>

      <h2>四、工程化的本质与边界</h2>
      <p>
        把六类问题串起来看，会发现它们共享同一个内核：<strong>把人脑记不住、手工容易错、重复又枯燥的事，
        交给工具去做。</strong> 包管理器替你记依赖，模块系统替你隔离作用域，转译器替你翻译语法，
        打包器替你优化产物，Linter 替你盯规范，CI 替你跑回归。工程化省下的，是人类最稀缺也最容易犯错的
        那部分注意力。
      </p>
      <Example title="一个直观的对比">
        <p>
          同样是「升级一个依赖的版本」：手动时代你要找到所有引用它的
          <code>{'<script>'}</code> 标签、逐个改 URL、祈祷没漏掉、再手动点开每个页面验证。
        </p>
        <p>
          工程化之后：改一行 <code>package.json</code> 里的版本号，跑一次安装，CI 自动跑完测试和构建——
          通过就放心合并，不通过当场就告诉你哪坏了。从「靠人靠运气」变成「靠工具靠确定性」。
        </p>
      </Example>
      <Callout variant="warn" title="工程化也有成本，别为了工程化而工程化">
        工具链本身需要学习、配置和维护，过度工程化（给一个静态页面套上全套构建/CI）反而是负担。
        判断标准始终是<strong>复杂度是否已经超过人工可控的范围</strong>：规模小、单人维护的玩具项目，
        一个 HTML 文件足矣；多人协作、长期演进的应用，工程化的投入才会持续回本。
      </Callout>
      <Callout variant="tip">
        下一章我们把视角拉高，俯瞰现代前端的整条工具链：包管理器、构建工具、转译器、Linter、
        测试、CI/CD、部署各占哪一层、彼此怎么衔接，以及本课每一卷分别落在这张全景图的什么位置。
      </Callout>

      <Summary
        points={[
          '前端从「几个 script 标签 + jQuery」演进到大型多人协作工程，规模与人数同时上量级后，手工方式系统性地开始出错。',
          '复杂度有六大来源：依赖管理、模块化、编译转译、构建优化、代码质量与协作规范、自动化测试与发布。',
          '每一类复杂度都对应一层工具：包管理器、ES Module、转译器、打包器、Linter/格式化、测试与 CI/CD。',
          '工程化的本质：用工具驯服复杂度，把人工记不住、易出错、重复枯燥的事自动化，用确定性取代靠人靠运气。',
          '工程化也有学习与维护成本，关键是按复杂度量体裁衣，避免为小项目过度工程化。',
        ]}
      />
    </article>
  )
}
