import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const globalPollutionSnippet = `// a.js —— 远古写法：所有东西都挂在全局
var count = 0
function increment() {
  count += 1
}

// b.js —— 另一个文件，作者并不知道 a.js 也用了 count
var count = "我以为这是我自己的变量"   // 悄悄覆盖了 a.js 的 count！
function increment() {                 // 又覆盖了 a.js 的 increment！
  console.log("b 的逻辑")
}

// 浏览器里按顺序加载 <script> 后，谁后加载谁说了算
// 这就是「全局命名空间污染」：文件越多，撞车越频繁`

const namespaceSnippet = `// 手动命名空间：把相关的东西塞进一个全局对象，减少撞车
var MyApp = MyApp || {}

MyApp.counter = {
  count: 0,
  increment: function () {
    this.count += 1
  },
}

// 使用时带上前缀
MyApp.counter.increment()
console.log(MyApp.counter.count) // 1

// 缺点：MyApp 本身仍是全局变量；嵌套深了写起来啰嗦；
// 依赖顺序仍要人肉保证（谁先加载 MyApp？）`

const iifeSnippet = `// IIFE（Immediately Invoked Function Expression，立即执行函数表达式）
// 用一个函数作用域把「私有」的东西关起来，只把需要的接口暴露出去
var counterModule = (function () {
  // —— 模块内部：外界访问不到 ——
  var count = 0                 // 私有状态
  function log(msg) {           // 私有方法
    console.log("[counter]", msg)
  }

  // —— 暴露的公共接口 ——
  return {
    increment: function () {
      count += 1
      log(count)
    },
    get: function () {
      return count
    },
  }
})()

counterModule.increment() // [counter] 1
counterModule.get()       // 1
// counterModule.count    // undefined —— count 被关在闭包里，外面拿不到`

const commonjsSnippet = `// ===== CommonJS（Node 的传统模块系统）=====

// math.js —— 导出
function add(a, b) {
  return a + b
}
const PI = 3.14159
module.exports = { add, PI }   // 把对象挂到 module.exports 上
// 也可以：exports.add = add（exports 是 module.exports 的别名）

// app.js —— 导入
const math = require("./math.js")  // require 是一个普通函数，运行时同步执行
console.log(math.add(2, 3)) // 5
console.log(math.PI)        // 3.14159

// 也能解构导入
const { add } = require("./math.js")`

const esmSnippet = `// ===== ES Module（ECMAScript 官方标准模块）=====

// math.js —— 导出
export function add(a, b) {
  return a + b
}
export const PI = 3.14159
export default function multiply(a, b) {   // 每个模块最多一个 default
  return a * b
}

// app.js —— 导入
import multiply, { add, PI } from "./math.js"  // 命名导入 + 默认导入
import * as math from "./math.js"              // 整体作为命名空间导入

console.log(add(2, 3))      // 5
console.log(multiply(2, 3)) // 6
console.log(math.PI)        // 3.14159`

const staticVsDynamicSnippet = `// ESM 的 import 是「静态」的：必须写在顶层，路径是字符串字面量
import { add } from "./math.js"   // ✅ 顶层、可被静态分析
// if (cond) import { x } from "..."   // ❌ 语法错误，不能放进 if

// 正因为静态，打包器在「编译期」就能画出依赖图，
// 进而做 Tree Shaking：把从未被用到的导出整段删掉，减小产物体积

// CommonJS 的 require 是「动态」的：它只是个普通函数调用
const name = cond ? "./a.js" : "./b.js"
const mod = require(name)          // ✅ 运行时才知道加载谁——灵活但难分析
if (cond) {
  const helper = require("./helper.js")  // ✅ 条件加载完全合法
}`

const dynamicImportSnippet = `// 动态 import()：在 ESM 里也能「运行时按需加载」，返回 Promise
async function loadEditor() {
  // 只有真正点开编辑器时，才去下载这块代码 —— 这就是「代码分割」
  const mod = await import("./heavy-editor.js")
  mod.openEditor()
}

document.querySelector("#edit").addEventListener("click", loadEditor)

// 打包器看到 import() 会自动把 heavy-editor.js 切成一个独立 chunk，
// 首屏不必加载它，从而加快页面初次渲染`

const nodeExtSnippet = `// ===== 在 Node 里如何区分 CJS 与 ESM =====

// 方式一：靠文件扩展名（最明确）
//   foo.mjs  —— 永远当作 ES Module
//   foo.cjs  —— 永远当作 CommonJS

// 方式二：靠 package.json 的 type 字段，决定 .js 当成哪种
// package.json
{
  "name": "my-pkg",
  "type": "module"   // .js 文件按 ESM 解析；不写或 "commonjs" 则按 CJS
}

// 在 ESM 里没有 __dirname / __filename，要用：
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        当一个项目从几十行长到几万行、从一个文件拆成几百个文件，你迟早会撞上同一个问题：
        代码怎么切成可独立维护、可复用、互不干扰的「块」？这就是<strong>模块化</strong>要解决的事。
        本章顺着 JavaScript 模块化的演进史走一遍——从最早的全局变量、IIFE 模块模式，到
        CommonJS，再到今天的官方标准 ES Module，把每一代「为什么出现、解决了什么、又留下什么遗憾」讲清楚，
        并把 CJS 与 ESM 这对「双雄」的关键差异、Node 里的取舍、以及动态 import 与代码分割一并讲透。
      </Lead>

      <h2>一、为什么需要模块？</h2>
      <p>
        早期的 JavaScript 没有模块系统。网页里写几段脚本，全部塞进一个个
        <code>{'<script>'}</code> 标签，所有变量和函数都活在同一个<strong>全局作用域</strong>里。
        项目一大，三个问题会接踵而来。
      </p>
      <ul>
        <li>
          <strong>全局变量污染</strong>：两个文件不小心用了同名的 <code>count</code>，
          后加载的会悄悄覆盖先加载的，引出一个极难排查的 bug。
        </li>
        <li>
          <strong>依赖管理混乱</strong>：文件 B 用到了文件 A 的函数，就必须保证 A 的
          <code>{'<script>'}</code> 写在 B 前面。依赖一多，加载顺序就成了一张随时会塌的纸牌屋。
        </li>
        <li>
          <strong>难以复用</strong>：没有标准的「导出 / 导入」机制，想把一段逻辑搬到别处用，
          只能靠复制粘贴，或者祈祷某个全局名字恰好存在。
        </li>
      </ul>
      <CodeBlock lang="js" title="全局污染：两个文件互相覆盖" code={globalPollutionSnippet} />
      <KeyIdea>
        模块化的本质是<strong>封装与契约</strong>：每个模块有自己独立的作用域（内部细节藏起来，
        不污染全局），并通过明确的「导出」声明对外提供什么、通过「导入」声明自己依赖什么。
        于是依赖关系变得显式、可分析、可复用。
      </KeyIdea>

      <h2>二、演进史：四个阶段</h2>

      <h3>阶段 0：全局对象命名空间</h3>
      <p>
        最朴素的缓解办法：约定所有东西都挂到一个全局对象下，比如 <code>MyApp</code>，
        用 <code>MyApp.counter</code>、<code>MyApp.utils</code> 这样的前缀来「分区」，
        把撞车概率降下来。这不是真正的模块化，只是一种命名约定。
      </p>
      <CodeBlock lang="js" title="手动命名空间" code={namespaceSnippet} />
      <p>
        它确实少了点撞车，但 <code>MyApp</code> 本身仍是全局变量，内部状态也藏不住，
        依赖加载顺序还得人肉保证。治标不治本。
      </p>

      <h3>阶段 1：IIFE 模块模式</h3>
      <p>
        真正的突破是利用 JavaScript 的<strong>函数作用域 + 闭包</strong>：把模块代码包进一个
        立即执行的函数（IIFE），函数内部的变量天然是私有的，外界访问不到；
        只把想暴露的接口通过 <code>return</code> 交出去。这就在没有语言级模块的年代，
        手工造出了「私有 / 公有」的边界。
      </p>
      <CodeBlock lang="js" title="IIFE 模块模式：闭包即私有作用域" code={iifeSnippet} />
      <p>
        IIFE 模式是诸多老库（如 jQuery 插件）的基石，但它仍解决不了<strong>依赖管理</strong>：
        模块之间谁依赖谁，还是靠 <code>{'<script>'}</code> 顺序，没有正式的 import 概念。
      </p>

      <h3>阶段 2：CommonJS（Node 的答案）</h3>
      <p>
        2009 年 Node.js 横空出世，把 JavaScript 带到服务器端，也带来了第一个被广泛使用的
        模块规范——<strong>CommonJS</strong>。它用 <code>require()</code> 导入、用
        <code>module.exports</code> 导出，让「一个文件就是一个模块」成为现实。
        因为运行在服务器、读的是本地磁盘文件，CommonJS 采用<strong>同步加载</strong>：
        <code>require</code> 一调用，立刻读文件、执行、返回结果。
      </p>
      <CodeBlock lang="js" title="CommonJS：require / module.exports" code={commonjsSnippet} />

      <h3>阶段 2.5：AMD / UMD（浏览器过渡方案）</h3>
      <p>
        CommonJS 的同步加载在浏览器里行不通（不能为了一个 <code>require</code> 卡住页面去下载文件），
        于是社区造了 <strong>AMD</strong>（异步模块定义，代表是 RequireJS，用回调式
        <code>define(deps, factory)</code>）来异步加载；又造了 <strong>UMD</strong>
        （通用模块定义，一段兼容样板，让同一份代码在 CJS、AMD、全局三种环境下都能用）。
        这两者是标准模块到来之前的过渡产物，了解名字即可，今天新项目基本不再手写。
      </p>

      <h3>阶段 3：ES Module（官方标准）</h3>
      <p>
        2015 年的 ES2015（ES6）终于把模块写进了语言标准：<strong>ES Module（ESM）</strong>，
        用 <code>import</code> / <code>export</code> 关键字。这是 JavaScript 第一次有了
        <strong>语言级</strong>的模块系统——不再靠库、靠约定，而是引擎与浏览器原生支持。
      </p>
      <CodeBlock lang="js" title="ES Module：import / export" code={esmSnippet} />
      <p>ESM 的几个关键特性，正好补齐了前几代的短板：</p>
      <ul>
        <li>
          <strong>静态结构</strong>：<code>import</code> / <code>export</code> 必须写在模块顶层，
          路径是字符串字面量。编译期就能确定依赖关系，无需运行代码即可分析。
        </li>
        <li>
          <strong>Tree Shaking</strong>：正因为静态可分析，打包器能识别出「哪些导出从没被用过」，
          把死代码整段摇掉，显著减小产物体积。
        </li>
        <li>
          <strong>异步加载</strong>：浏览器可以并行抓取依赖图里的模块，不阻塞主线程。
        </li>
        <li>
          <strong>浏览器原生支持</strong>：写 <code>{'<script type="module" src="app.js">'}</code>
          就能让浏览器按 ESM 解析，自动拉取依赖，无需任何打包步骤。
        </li>
      </ul>
      <CodeBlock lang="js" title="静态 import 可被分析；动态 require 灵活但难分析" code={staticVsDynamicSnippet} />

      <h2>三、CJS vs ESM：关键差异</h2>
      <KeyIdea>
        一句话记忆：<strong>CommonJS 是「运行时、动态、同步」，ES Module 是「编译期、静态、异步」</strong>。
        前者灵活但难优化，后者可分析故能 Tree Shaking、能原生跑在浏览器。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>CommonJS（CJS）</th><th>ES Module（ESM）</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>语法</td>
            <td><code>require()</code> / <code>module.exports</code></td>
            <td><code>import</code> / <code>export</code></td>
          </tr>
          <tr>
            <td>解析时机</td>
            <td>运行时（动态）</td>
            <td>编译期（静态）</td>
          </tr>
          <tr>
            <td>加载方式</td>
            <td>同步</td>
            <td>异步</td>
          </tr>
          <tr>
            <td>导入位置</td>
            <td>任意位置，可条件 / 嵌套调用</td>
            <td>必须在顶层（动态 <code>import()</code> 例外）</td>
          </tr>
          <tr>
            <td>Tree Shaking</td>
            <td>困难（结构不可静态确定）</td>
            <td>友好（依赖图编译期可知）</td>
          </tr>
          <tr>
            <td>顶层 <code>this</code></td>
            <td>指向 <code>module.exports</code></td>
            <td><code>undefined</code></td>
          </tr>
          <tr>
            <td><code>__dirname</code> / <code>__filename</code></td>
            <td>直接可用</td>
            <td>无，需 <code>import.meta.url</code> 推导</td>
          </tr>
          <tr>
            <td>导出绑定</td>
            <td>导出的是值的<strong>拷贝</strong>（快照）</td>
            <td>导出的是<strong>实时绑定</strong>（live binding）</td>
          </tr>
          <tr>
            <td>浏览器</td>
            <td>不原生支持，需打包</td>
            <td><code>{'<script type="module">'}</code> 原生支持</td>
          </tr>
        </tbody>
      </table>
      <p>
        关于<strong>循环依赖</strong>：两者都能处理，但表现不同。CJS 在 A 依赖 B、B 又依赖 A 时，
        后被加载的模块会拿到对方<strong>当时尚未执行完</strong>的、不完整的
        <code>module.exports</code>（拿到的是当下的快照，可能缺东西）；ESM 因为是实时绑定，
        即使变量此刻还是「暂时性死区」未初始化，只要在真正使用前完成初始化，引用就能正确读到最新值，
        循环依赖更不容易出意外。
      </p>
      <Example title="实时绑定 vs 值拷贝">
        <p>
          模块导出一个计数器变量并提供自增方法。在 ESM 里，导入方读到的 <code>count</code>
          会随着模块内部自增而<strong>同步变化</strong>（live binding）；
          在 CJS 里，<code>const {'{ count }'} = require(...)</code> 解构出来的是导入那一刻的
          <strong>值拷贝</strong>，之后模块内部再改也不会反映到你手里的这个 <code>count</code> 上。
          这是初学者最容易踩的差异之一。
        </p>
      </Example>

      <h2>四、在 Node 里如何区分 CJS 与 ESM</h2>
      <p>
        Node 同时支持两套系统，靠两条规则判断一个文件到底按哪种解析：
        <strong>扩展名</strong>与 <strong>package.json 的 <code>type</code> 字段</strong>。
      </p>
      <ul>
        <li><code>.mjs</code> 文件：永远当作 ES Module。</li>
        <li><code>.cjs</code> 文件：永远当作 CommonJS。</li>
        <li>
          <code>.js</code> 文件：看最近的 package.json——<code>{'"type": "module"'}</code> 则按
          ESM，缺省或 <code>{'"type": "commonjs"'}</code> 则按 CJS。
        </li>
      </ul>
      <CodeBlock lang="js" title="扩展名、type 字段，以及 ESM 里如何拿 __dirname" code={nodeExtSnippet} />
      <Callout variant="warn" title="不能在 ESM 里直接 require，也不能在 CJS 顶层 import">
        如果文件按 ESM 解析，<code>require</code> / <code>module.exports</code> /
        <code>__dirname</code> 都不存在，硬用会报错；反之 CJS 文件里也不能在顶层写
        <code>import</code>。互通时可用动态 <code>import()</code>（在 CJS 里也能调）或确保依赖提供了对应入口。
      </Callout>

      <h2>五、动态 import() 与代码分割</h2>
      <p>
        静态 <code>import</code> 解决了「编译期可分析」，但有时我们恰恰需要<strong>运行时按需加载</strong>——
        比如一个很重的富文本编辑器，只有用户点开它时才值得下载。ESM 为此提供了
        <strong>动态 <code>import()</code></strong>：它是一个返回 Promise 的表达式，可以写在任意位置、
        路径甚至可以是变量。
      </p>
      <CodeBlock lang="js" title="动态 import()：按需加载与代码分割" code={dynamicImportSnippet} />
      <p>
        打包器（Webpack / Vite / Rollup 等）看到 <code>import()</code>，会自动把那块依赖切成一个独立的
        <strong>chunk（代码块）</strong>，首屏不加载、用到才下载。这就是<strong>代码分割
        （code splitting）</strong>，是大型前端应用控制首屏体积、提升加载速度的核心手段。
        React 的 <code>React.lazy</code> + <code>Suspense</code>、各路由懒加载，底层都是它。
      </p>

      <Callout variant="tip">
        实践建议：新项目一律用 ESM（<code>import</code> / <code>export</code>），
        package.json 写 <code>{'"type": "module"'}</code>；只有在维护老的 Node 工具链、
        或某个依赖只发 CJS 版本时才接触 CommonJS。理解二者差异，是看懂报错信息和打包配置的前提。
      </Callout>

      <Summary
        points={[
          '模块化要解决三大痛点：全局变量污染、依赖管理混乱、难以复用；本质是封装（独立作用域）+ 契约（显式导出 / 导入）。',
          '演进史：全局命名空间 → IIFE 模块模式（闭包造私有作用域）→ CommonJS（Node，require/module.exports，同步）→ AMD/UMD（浏览器过渡）→ ES Module（ES2015 官方标准，import/export）。',
          'ESM 是静态结构：编译期可分析依赖图，因而支持 Tree Shaking、异步加载，且浏览器原生支持 <script type="module">。',
          'CJS vs ESM 关键差异：运行时/动态/同步 对 编译期/静态/异步；顶层 this、__dirname、值拷贝 vs 实时绑定、循环依赖处理各不同。',
          'Node 靠扩展名（.mjs / .cjs）与 package.json 的 type 字段决定 .js 按 ESM 还是 CJS 解析。',
          '动态 import() 返回 Promise，可运行时按需加载；打包器据此做代码分割，把重模块切成独立 chunk 加快首屏。',
        ]}
      />
    </article>
  )
}
