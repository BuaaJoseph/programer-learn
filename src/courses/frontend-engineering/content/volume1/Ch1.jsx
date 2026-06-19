import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BuildPipeline from '@/courses/frontend-engineering/illustrations/BuildPipeline.jsx'

const globalPollution = `<!-- 没有模块系统的年代：靠 <script> 一个个手动排序 -->
<script src="jquery.js"></script>
<script src="utils.js"></script>     <!-- utils 用到了 $，必须排在 jquery 之后 -->
<script src="app.js"></script>       <!-- app 用到了 utils，又必须排在 utils 之后 -->

// utils.js
var helper = function () { /* ... */ }   // 直接挂到 window，全局污染
function format() { /* ... */ }          // 谁都能改、谁都可能重名覆盖

// app.js
helper()   // 它从哪来的？只能靠「希望前面那个 script 已经加载好了」`

const cjsSnippet = `// math.js —— CommonJS 导出
function add(a, b) {
  return a + b
}
module.exports = { add }

// app.js —— CommonJS 导入
const { add } = require('./math.js')   // require 是普通函数调用：运行时同步执行

// 因为是运行时调用，下面这种写法完全合法：
const name = condition ? './a.js' : './b.js'
const mod = require(name)               // 动态路径，打包器静态阶段无法确定`

const esmSnippet = `// math.js —— ESM 导出
export function add(a, b) {
  return a + b
}
export const PI = 3.14159

// app.js —— ESM 导入
import { add } from './math.js'         // import 是语法声明，不是函数调用

// import 必须出现在模块顶层，且路径必须是字符串字面量：
// import x from someVariable   // ✗ 语法错误：路径不能是变量
//
// 正因如此，工具不运行代码、只读源码就能确定依赖关系——这叫「静态可分析」`

const treeShakingSnippet = `// utils.js 导出了三个函数
export function used() { return 1 }
export function neverCalled() { return 2 }
export function alsoUnused() { return 3 }

// app.js 只用到了一个
import { used } from './utils.js'
console.log(used())

// 因为 ESM 是静态的，打包器能确定 neverCalled / alsoUnused
// 从未被任何地方 import → 安全地从 bundle 里删掉（Tree Shaking / 摇树）`

const graphSnippet = `// 打包器从入口出发，递归构建依赖图（简化示意）
// 入口 src/main.js
import { render } from './app.js'
import './styles.css'

// app.js
import { add } from './math.js'
import lodash from 'lodash'        // 第三方：去 node_modules 里找

// 上面的关系构成一张有向图：
//
//   main.js ──▶ app.js ──▶ math.js
//      │           └──────▶ lodash (node_modules)
//      └──▶ styles.css
//
// 节点 = 模块，边 = 「谁 import 了谁」。这张图就是后续打包的蓝本`

const resolveSnippet = `// 模块解析（resolve）：把 import 里的字符串变成磁盘上的真实文件

import './math'           // 相对路径：当前目录找 math.js / math.ts / math/index.js ...
import '../utils/fmt'     // 相对路径：上级目录
import 'lodash'           // 裸模块名：逐级向上找 node_modules/lodash
import 'lodash/debounce'  // 裸模块名 + 子路径
import api from '@/api'   // 别名：构建配置里把 @ 映射到 src/

// 解析过程要回答三件事：
// 1) 从哪个目录开始找？（相对当前文件 / node_modules / 别名根）
// 2) 补哪个扩展名？（resolve.extensions: ['.ts', '.tsx', '.js', ...]）
// 3) 没写文件名时取哪个？（package.json 的 main/module/exports 字段，或 index.*）`

export default function Ch1() {
  return (
    <article>
      <Lead>
        现代前端项目动辄上千个文件，浏览器最终却只加载寥寥几个 JS 产物。
        把成百上千个源文件「收拢」成可部署产物的工具，叫<strong>打包器（bundler）</strong>。
        而它一切工作的起点，是一个朴素的问题：这些文件之间<strong>谁依赖谁</strong>？
        这一章我们从「为什么要模块化」讲起，对比 CommonJS 与 ESM 两套模块系统，
        弄清「静态可分析」为何是打包的命脉，最后看打包器如何从入口出发、递归构建出一张
        <strong>模块依赖图</strong>——这正是后续所有打包步骤的蓝本。
      </Lead>

      <h2>一、为什么要模块化：从「全局污染」说起</h2>
      <p>
        在没有模块系统的年代，给网页加功能只有一招：往 HTML 里塞一个又一个
        <code>{'<script>'}</code> 标签。这套做法很快就撞上三堵墙。
      </p>
      <CodeBlock lang="js" title="前模块化时代的痛点" code={globalPollution} />
      <ul>
        <li>
          <strong>全局污染</strong>：每个脚本里声明的 <code>var</code>、函数都挂到了
          <code>window</code> 上。两个库各自定义了一个 <code>format</code>，
          后加载的就<strong>悄悄覆盖</strong>前一个，谁都不知道。
        </li>
        <li>
          <strong>依赖顺序</strong>：<code>app.js</code> 用到 <code>utils.js</code> 的东西，
          就<strong>必须</strong>排在它后面；<code>utils.js</code> 又依赖 <code>jquery</code>。
          顺序全靠人脑维护，错一个就是运行时报错。
        </li>
        <li>
          <strong>难以复用</strong>：没有明确的「导出 / 导入」边界，
          想把一段逻辑搬到别的项目，往往要连带一堆隐式的全局依赖一起搬。
        </li>
      </ul>
      <KeyIdea>
        模块化的本质，是给每个文件划一个<strong>独立作用域</strong>，
        并用显式的「导出（export）」和「导入（import）」声明文件之间的依赖关系。
        作用域隔离解决了污染，显式依赖解决了顺序与复用——这三件事，是打包器能够工作的前提。
      </KeyIdea>

      <h2>二、两套模块系统：CommonJS 与 ESM</h2>
      <p>
        JavaScript 历史上出现过多套模块方案，今天真正重要的是两套：诞生于 Node.js 的
        <strong>CommonJS（CJS）</strong>，和写进语言标准的 <strong>ES Modules（ESM）</strong>。
        它们的差异不只是语法，更是<strong>工作机制</strong>的根本不同。
      </p>

      <h3>CommonJS：运行时、动态、同步</h3>
      <p>
        CommonJS 用 <code>require()</code> 导入、用 <code>module.exports</code> 导出。
        关键在于：<code>require</code> 是一个<strong>普通的函数调用</strong>，
        它在代码<strong>运行的那一刻</strong>才执行，同步地把目标模块加载、执行完、返回它的导出对象。
      </p>
      <CodeBlock lang="js" title="CommonJS：require 是运行时函数调用" code={cjsSnippet} />
      <p>
        正因为它是函数调用，<code>require()</code> 的参数可以是<strong>任意表达式</strong>——
        变量、三元、拼接出来的字符串都行。灵活，但也意味着：不真正把代码跑一遍，
        就<strong>无法确定</strong>一个模块到底会依赖谁。
      </p>

      <h3>ESM：编译时、静态、可分析</h3>
      <p>
        ESM 用 <code>import</code> / <code>export</code>。它们是<strong>语法层面的声明</strong>，
        不是函数。规范要求：<code>import</code> 只能出现在模块<strong>顶层</strong>，
        且导入路径<strong>必须是字符串字面量</strong>，不能是变量。
      </p>
      <CodeBlock lang="js" title="ESM：import 是静态声明" code={esmSnippet} />
      <p>
        这套约束看似死板，却换来一个巨大的好处：工具<strong>不需要运行代码</strong>，
        仅靠阅读源码（解析成语法树）就能<strong>完全确定</strong>每个模块导入和导出了什么。
        这就是「<strong>静态可分析</strong>」。
      </p>

      <h3>对比一览</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>CommonJS（CJS）</th><th>ES Modules（ESM）</th></tr>
        </thead>
        <tbody>
          <tr><td>导出语法</td><td><code>module.exports</code> / <code>exports.x</code></td><td><code>export</code> / <code>export default</code></td></tr>
          <tr><td>导入语法</td><td><code>require()</code></td><td><code>import</code></td></tr>
          <tr><td>本质</td><td>运行时函数调用</td><td>编译时语法声明</td></tr>
          <tr><td>加载时机</td><td>同步、运行到那一行才加载</td><td>顶层、先解析依赖再执行</td></tr>
          <tr><td>路径是否可动态</td><td>可以（变量、表达式）</td><td>不可以（必须字面量）</td></tr>
          <tr><td>静态可分析</td><td>难（需运行才能确定）</td><td>易（读源码即可确定）</td></tr>
          <tr><td>Tree Shaking</td><td>基本无法</td><td>天然支持</td></tr>
          <tr><td>典型场景</td><td>传统 Node.js 后端</td><td>现代前端、新版 Node</td></tr>
        </tbody>
      </table>

      <h2>三、为什么「静态可分析」对打包至关重要</h2>
      <p>
        打包器要做的事，归根结底是「把用到的代码收拢、把没用到的丢掉」。
        而「用到了什么、没用到什么」这个判断，只有在能<strong>静态分析</strong>时才做得准、做得安全。
      </p>
      <KeyIdea>
        静态可分析 = 不运行代码、只读源码，就能确定模块的依赖与导入导出。
        它是 <strong>Tree Shaking（摇树优化）</strong>、按需打包、依赖图精确构建的共同前提。
        ESM 的静态特性，正是现代前端能把产物压到很小的根本原因。
      </KeyIdea>
      <CodeBlock lang="js" title="静态可分析带来的 Tree Shaking" code={treeShakingSnippet} />
      <Example title="为什么 CJS 摇不动树">
        <p>
          假设 <code>utils.js</code> 用 CommonJS 写：<code>module.exports</code> 是一个普通对象，
          运行时还可能被改写（<code>{'module.exports.foo = ...'}</code>）。打包器无法在不运行代码的前提下，
          断言「<code>neverCalled</code> 一定没人用」——万一有人写了
          <code>{'require(...)["never" + "Called"]'}</code> 呢？保守起见，只能<strong>全都留下</strong>。
        </p>
        <p>
          换成 ESM，导入导出是写死在语法里的：哪个导出被哪个 <code>import</code> 引用，
          一目了然。没被引用的导出可以<strong>放心删除</strong>。这就是 ESM 能摇树、CJS 几乎不能的根本原因。
        </p>
      </Example>

      <h2>四、打包流程总览：先有一张图</h2>
      <p>
        在深入依赖图之前，先用下面这张交互图建立全局印象：打包从<strong>入口</strong>开始，
        <strong>解析依赖</strong>构建出依赖图，再对每个模块做<strong>转换</strong>，
        然后<strong>分块</strong>、<strong>优化</strong>，最后<strong>产出</strong>到 <code>dist/</code>。
        点开每个阶段看看它具体在干什么。
      </p>
      <BuildPipeline />
      <p>
        这一章我们聚焦最前面两步——「入口」和「解析依赖图」；从下一章起，再沿着这条流水线
        把转换、分块、优化、产出逐一讲透。整张图都围着同一个数据结构转：<strong>模块依赖图</strong>。
      </p>

      <h2>五、从入口出发，构建模块依赖图</h2>
      <p>
        打包器的第一个动作，是读取你在配置里指定的<strong>入口文件</strong>（如
        <code>src/main.js</code>）。然后它做一件听起来简单、实则贯穿全程的事：
        解析入口里的每一条 import，找到被依赖的模块，<strong>递归</strong>地对每个被依赖的模块重复同样的动作。
      </p>
      <CodeBlock lang="js" title="从入口递归出依赖图" code={graphSnippet} />
      <KeyIdea>
        <strong>模块依赖图（dependency graph）</strong>是一张<strong>有向图</strong>：
        节点是模块，边是「A import 了 B」。打包器从入口节点做深度 / 广度遍历，
        把项目中所有<strong>可达</strong>的模块都收进图里。这张图就是后续转换、分块、优化的唯一蓝本。
      </KeyIdea>
      <p>
        关于这张图，有几个性质值得记住：
      </p>
      <ul>
        <li>
          <strong>有向</strong>：依赖是单向的——「A 依赖 B」不等于「B 依赖 A」。
        </li>
        <li>
          <strong>可能有环</strong>：A import B、B 又 import A 是合法的（<strong>循环依赖</strong>）。
          打包器靠「已访问集合」避免无限递归——遇到访问过的模块就复用，不再重复展开。
        </li>
        <li>
          <strong>只收可达模块</strong>：从入口出发<strong>到不了</strong>的文件，根本不会进图，
          自然也不会进 bundle。这是「按需打包」的基础。
        </li>
      </ul>
      <Callout variant="warn" title="循环依赖不是语法错误，但要小心">
        A 与 B 互相 import，打包器能正常处理（不会死循环），但<strong>运行时</strong>可能出问题：
        当 A 执行到一半去加载 B，而 B 又回头用 A 还没初始化完的导出，就会读到
        <code>undefined</code>。循环依赖能跑通，却常常是隐藏 bug 的温床，应尽量解开。
      </Callout>

      <h2>六、模块解析规则：把 import 字符串变成真实文件</h2>
      <p>
        构建依赖图时，打包器每遇到一条 <code>import './math'</code>，都要回答一个具体问题：
        这个字符串到底指向磁盘上<strong>哪个文件</strong>？这个过程叫<strong>模块解析（resolve）</strong>，
        它本身有一套规则。
      </p>
      <CodeBlock lang="js" title="三类导入路径的解析" code={resolveSnippet} />
      <table>
        <thead>
          <tr><th>路径形式</th><th>例子</th><th>解析规则</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>相对路径</td>
            <td><code>./math</code>、<code>../utils/fmt</code></td>
            <td>以当前文件所在目录为基准定位，再补扩展名 / 找 <code>index</code></td>
          </tr>
          <tr>
            <td>裸模块名</td>
            <td><code>lodash</code>、<code>react</code></td>
            <td>从当前目录逐级向上找 <code>node_modules</code>，读 <code>package.json</code> 的入口字段</td>
          </tr>
          <tr>
            <td>别名</td>
            <td><code>@/api</code></td>
            <td>按构建配置里的 alias 把前缀映射成真实目录（如 <code>@</code> → <code>src</code>）</td>
          </tr>
        </tbody>
      </table>
      <p>
        解析过程中有两个常被忽略、却经常踩坑的细节：
      </p>
      <ul>
        <li>
          <strong>扩展名补全</strong>：<code>import './math'</code> 没写后缀，打包器按配置的
          <code>extensions</code> 列表（如 <code>['.ts', '.tsx', '.js']</code>）<strong>依次试</strong>，
          第一个命中的文件就是它。列表顺序会影响「同名不同后缀」时选谁。
        </li>
        <li>
          <strong>目录入口</strong>：<code>import './utils'</code> 若 <code>utils</code> 是目录，
          会去找 <code>utils/index.*</code>，或读该目录 <code>package.json</code> 的入口字段。
        </li>
      </ul>
      <Callout variant="tip">
        裸模块名读 <code>package.json</code> 时，现代打包器会优先看 <code>exports</code> 字段，
        其次 <code>module</code>（指向 ESM 版本，利于 Tree Shaking），最后才是 <code>main</code>（通常是 CJS 版本）。
        这也是为什么很多库会同时发布 ESM 和 CJS 两份产物。
      </Callout>

      <h2>七、小结这一章在流水线里的位置</h2>
      <p>
        到这里，打包器已经手握一张完整的<strong>模块依赖图</strong>：知道项目用到哪些模块、
        它们之间怎么连、每条 import 落到哪个真实文件。但图里的节点此刻还是「原始源码」——
        TS 还没编译、JSX 还没转、CSS 还没处理。<strong>下一章</strong>就接着这张图往下走：
        看打包器如何把每个模块加载、转换，再拼成浏览器能直接跑的 bundle。
      </p>

      <Summary
        points={[
          '模块化用「独立作用域 + 显式导入导出」解决了全局污染、依赖顺序、难以复用三大痛点，是打包器工作的前提。',
          'CommonJS 的 require 是运行时函数调用，动态、同步；ESM 的 import 是编译时语法声明，路径必须是字面量。',
          'ESM 的静态约束换来「静态可分析」：不运行代码、只读源码就能确定依赖与导入导出。',
          '静态可分析是 Tree Shaking、按需打包、精确依赖图的共同前提，也是 ESM 能摇树而 CJS 几乎不能的根本原因。',
          '打包器从入口文件出发，递归解析每条 import，构建出一张有向、可能有环、只含可达模块的模块依赖图。',
          '模块解析把 import 字符串变成真实文件：相对路径就近找、裸模块名查 node_modules、别名按配置映射，并涉及扩展名补全与目录入口。',
        ]}
      />
    </article>
  )
}
