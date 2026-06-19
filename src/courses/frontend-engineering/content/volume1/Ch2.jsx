import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BuildPipeline from '@/courses/frontend-engineering/illustrations/BuildPipeline.jsx'

const astSnippet = `// 第一步：把源码字符串解析成 AST（抽象语法树）
import { add } from './math.js'   // ← 一行字符串

// 解析后大致是这样一棵树（极简示意）：
// ImportDeclaration
//   source: "./math.js"          ← 工具就是读这个字段拿到依赖
//   specifiers: [ add ]
//
// 有了 AST，工具能精确地「看见」每一条 import，
// 而不必用脆弱的正则去猜。后续转换也都在 AST 上做`

const loaderSnippet = `// 第二步：加载与转换 —— 一切非 JS 资源都被「翻译」成 JS 模块
// 不同文件类型交给不同 loader / 插件：

import styles from './app.css'    // CSS loader：把样式变成可注入的 JS
import logo from './logo.png'     // 资源 loader：变成一个 URL 字符串或 base64
import data from './data.json'    // JSON：解析成 JS 对象
import App from './App.tsx'       // TS + JSX：编译成普通 JS

// 经过这一步，依赖图里每个节点——无论原本是什么——
// 都变成了「打包器认识的 JS 模块」。这是后面能统一处理的关键`

const miniBundlerSnippet = `// 第三、四步：基于依赖图收集模块、给每个模块编号、生成 chunk
// 下面是一个「极简打包器」的核心思路（伪代码）

let ID = 0
function createAsset(filename) {
  const content = fs.readFileSync(filename, 'utf-8')
  const ast = parse(content)              // ① 解析成 AST
  const deps = []                         // ② 收集这个模块的依赖
  walk(ast, (node) => {
    if (node.type === 'ImportDeclaration') deps.push(node.source.value)
  })
  return { id: ID++, filename, deps, code: transform(content) }  // 给模块编号
}

function buildGraph(entry) {              // ③ 从入口递归构建依赖图
  const mainAsset = createAsset(entry)
  const queue = [mainAsset]
  for (const asset of queue) {
    asset.mapping = {}                    // 「这个模块里写的相对路径」→「目标模块编号」
    asset.deps.forEach((relativePath) => {
      const child = createAsset(resolve(asset.filename, relativePath))
      asset.mapping[relativePath] = child.id
      queue.push(child)                   // 入队，循环会继续展开它的依赖
    })
  }
  return queue                            // 一个扁平的模块数组，就是整张图
}`

const bundleOutputSnippet = `// 第五步：输出 —— 把所有模块拼成一个带 require 函数的 IIFE
// 这是极简打包器产出的 bundle 长相（简化）：

(function (modules) {
  // 浏览器里没有 require，于是我们自己造一个
  function require(id) {
    const [fn, mapping] = modules[id]
    const module = { exports: {} }
    // 模块内部写的 require('./x')，先经 mapping 翻译成编号，再递归 require
    function localRequire(relativePath) {
      return require(mapping[relativePath])
    }
    fn(localRequire, module, module.exports)   // 执行模块代码，填充 exports
    return module.exports
  }
  require(0)                                   // 从入口模块（编号 0）启动
})({
  // 每个模块 = [包裹成函数的代码, 相对路径→编号 的映射表]
  0: [
    function (require, module, exports) {
      const { add } = require('./math.js')
      console.log(add(1, 2))
    },
    { './math.js': 1 },
  ],
  1: [
    function (require, module, exports) {
      exports.add = (a, b) => a + b
    },
    {},
  ],
})`

const webpackRuntimeSnippet = `// webpack 运行时的核心：__webpack_require__ + 模块缓存（简化）
var installedModules = {}                         // 模块缓存

function __webpack_require__(moduleId) {
  // 命中缓存就直接返回 —— 同一个模块只执行一次（这也是模块单例的来源）
  if (installedModules[moduleId]) {
    return installedModules[moduleId].exports
  }
  var module = (installedModules[moduleId] = { i: moduleId, l: false, exports: {} })

  // 执行模块函数，把 require/module/exports 传进去
  modules[moduleId].call(module.exports, module, module.exports, __webpack_require__)

  module.l = true                                 // 标记已加载
  return module.exports
}

return __webpack_require__(__webpack_require__.s = 0)   // 从入口启动`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们拿到了一张<strong>模块依赖图</strong>，但图里的节点还都是原始源码。
        这一章把打包器剩下的活干完：从源码到能部署的 <code>bundle</code>，
        中间要经过<strong>解析、转换、收集、分块、输出</strong>五步。
        我们不只讲流程，还会动手「拆解一个极简打包器」——看它如何读入口、找 import、递归、
        给模块编号、最后拼成一个带 <code>require</code> 函数的 IIFE。
        再顺带看清 webpack 运行时在浏览器里到底用什么把模块串起来，以及 HMR 为什么能不刷新页面就更新。
      </Lead>

      <h2>一、打包五步总览</h2>
      <p>
        先回到这张流水线图。上一章我们停在「解析依赖图」，这一章把后面的转换、分块、优化、产出补齐。
        点开各阶段对照着看，会更有体感。
      </p>
      <BuildPipeline />
      <p>
        把它拆成开发者视角的五个动作，就是下面这张表。后面各节会逐一展开。
      </p>
      <table>
        <thead>
          <tr><th>步骤</th><th>名称</th><th>它在做什么</th></tr>
        </thead>
        <tbody>
          <tr><td>①</td><td>解析（Parse）</td><td>把每个模块的源码字符串解析成 AST，以便精确读取 import</td></tr>
          <tr><td>②</td><td>转换（Transform）</td><td>loader / 插件把 TS、JSX、CSS、图片都变成 JS 模块</td></tr>
          <tr><td>③</td><td>收集（Collect）</td><td>沿依赖图把所有可达模块收齐，给每个模块编号</td></tr>
          <tr><td>④</td><td>分块（Chunk）</td><td>把模块组织成一个或多个 chunk，并加上运行时</td></tr>
          <tr><td>⑤</td><td>输出（Output）</td><td>拼成最终文件写到 dist/</td></tr>
        </tbody>
      </table>

      <h2>二、第一步：解析成 AST</h2>
      <p>
        打包器拿到一个模块的源码后，第一件事不是直接处理字符串，而是把它<strong>解析成 AST
        （抽象语法树）</strong>。AST 是源码的结构化表示——一棵描述「这段代码由哪些语法成分构成」的树。
      </p>
      <CodeBlock lang="js" title="源码 → AST，依赖关系变得可读" code={astSnippet} />
      <KeyIdea>
        用 AST 而不是正则，是因为只有结构化的树才能<strong>准确</strong>地识别每一条 import、
        区分注释与代码、处理各种边界写法。后续的转换（如 JSX → JS）也都是在 AST 上做节点替换，
        再把树<strong>生成</strong>回字符串。
      </KeyIdea>

      <h2>三、第二步：加载与转换</h2>
      <p>
        依赖图里的节点五花八门：<code>.ts</code>、<code>.jsx</code>、<code>.css</code>、
        <code>.png</code>、<code>.json</code>……但 bundle 最终只能是 JS。于是有了
        <strong>转换</strong>这一步：每种文件类型交给对应的 <strong>loader / 插件</strong>，
        把它「翻译」成打包器认识的 JS 模块。
      </p>
      <CodeBlock lang="js" title="loader 把一切都变成 JS 模块" code={loaderSnippet} />
      <KeyIdea>
        「一切皆模块」是打包器的核心抽象：CSS、图片、JSON 在转换后都成了 JS 模块，
        因而能<strong>统一</strong>进入依赖图、统一被收集和优化。loader 负责「单个文件怎么转」，
        插件则能介入打包的各个生命周期，做更全局的事。
      </KeyIdea>
      <Example title="一张图片是怎么变成模块的">
        <p>
          <code>import logo from './logo.png'</code> 经资源 loader 处理后，可能有两种结果：
          小图片被转成 <strong>base64</strong> 内联进 JS（<code>logo</code> 拿到一段
          <code>data:image/png;base64,...</code> 字符串），省一次网络请求；大图片则被
          <strong>拷到输出目录</strong>，<code>logo</code> 拿到它的最终 URL。无论哪种，
          对依赖图来说它就是「一个导出了字符串的 JS 模块」。
        </p>
      </Example>

      <h2>四、第三、四步：手写一个极简打包器</h2>
      <p>
        理解打包最好的方式，是看它最朴素的样子。抛开优化与花活，一个打包器的内核只需要四个动作：
        <strong>读入口 → 找 import → 递归 → 给模块编号</strong>。下面是这个内核的伪代码。
      </p>
      <CodeBlock lang="js" title="极简打包器：构建图并给模块编号" code={miniBundlerSnippet} />
      <p>
        几个关键设计值得注意：
      </p>
      <ul>
        <li>
          <strong>每个模块一个数字 id</strong>：用 <code>ID++</code> 顺序编号。最终 bundle 里模块之间
          不再用文件路径互相引用，而是用这个编号——更短，也避免了路径在浏览器里没意义的问题。
        </li>
        <li>
          <strong>mapping 表</strong>：模块源码里写的是相对路径（<code>'./math.js'</code>），
          但 bundle 里要用编号。于是每个模块都带一张
          <code>{'{ 相对路径: 目标编号 }'}</code> 的映射表，运行时用它做翻译。
        </li>
        <li>
          <strong>用队列做广度遍历</strong>：<code>for (const asset of queue)</code> 里又往
          <code>queue</code> 里 push，循环会自然地把整张图展开。真实打包器还会用「已访问集合」
          处理循环依赖，避免重复展开。
        </li>
      </ul>

      <h2>五、第五步：输出 —— 拼成一个带 require 的 IIFE</h2>
      <p>
        图建好、模块编好号，最后一步是<strong>拼装</strong>。难点在于：浏览器里<strong>没有</strong>
        <code>require</code> 这个函数。极简打包器的做法是——自己造一个，连同所有模块一起塞进一个
        <strong>IIFE（立即执行函数）</strong>里。
      </p>
      <CodeBlock lang="js" title="极简打包器输出的 bundle 示意" code={bundleOutputSnippet} />
      <KeyIdea>
        输出产物的结构是：一个 IIFE 接收「模块表」（编号 → [包裹成函数的模块代码, mapping]），
        内部定义一个 <code>require(id)</code>。每个模块代码被包进 <code>function(require, module, exports)</code>，
        于是模块里的 <code>require('./x')</code> 实际调用的是这个自造的、用 mapping 翻译编号的
        <code>localRequire</code>。从入口模块（编号 0）<code>require(0)</code> 启动，整个程序就跑起来了。
      </KeyIdea>
      <p>
        这就是打包的「魔法」拆穿后的真相：把多个文件的代码，包成一堆函数，
        再配一个能按编号互相调用的 <code>require</code>，塞进一个自执行函数。仅此而已。
      </p>

      <h2>六、真实世界：webpack 运行时</h2>
      <p>
        生产级打包器（以 webpack 为例）做的事和上面的极简版<strong>同构</strong>，只是更健壮。
        它注入的那个自造 require 叫 <code>__webpack_require__</code>，并且多了一个关键的东西：
        <strong>模块缓存</strong>。
      </p>
      <CodeBlock lang="js" title="webpack 运行时核心（简化）" code={webpackRuntimeSnippet} />
      <ul>
        <li>
          <strong>__webpack_require__(id)</strong>：和极简版的 <code>require</code> 一个角色——
          按编号找到模块函数、执行、返回其 <code>exports</code>。
        </li>
        <li>
          <strong>模块缓存 installedModules</strong>：每个模块<strong>只执行一次</strong>，
          之后的 require 直接返回缓存。这正是「同一个模块在整个应用里是<strong>单例</strong>」的实现原理——
          多处 import 同一个模块，拿到的是同一份 exports。
        </li>
        <li>
          <strong>从入口启动</strong>：最后 <code>__webpack_require__(0)</code>（入口编号）点火，
          沿着 require 调用链把整张图按需执行起来。
        </li>
      </ul>
      <Callout variant="note" title="chunk 与 bundle 的区别">
        <strong>chunk</strong> 是打包器内部的「代码块」单位：入口 chunk、动态
        <code>import()</code> 拆出的异步 chunk、被多处共享的公共 chunk。
        一个 chunk 经输出后写成磁盘上的一个文件，通常就叫一个 <strong>bundle</strong>。
        分块的意义在于：首屏只加载必要的 chunk，其余按需懒加载，减小首包体积。
      </Callout>

      <h2>七、HMR：为什么能不刷新就更新</h2>
      <p>
        开发时改一行代码，页面局部就更新了、还不丢状态——这就是<strong>热模块替换（HMR）</strong>。
      </p>
      <KeyIdea>
        HMR 一句话原理：dev server 通过 WebSocket 把「哪个模块变了」推给浏览器里的 HMR 运行时，
        运行时只重新拉取并<strong>替换那一个模块</strong>，再执行模块注册的更新回调（如 React 组件重渲染），
        从而<strong>不刷新整页、不丢应用状态</strong>地完成更新。
      </KeyIdea>

      <h2>八、小结</h2>
      <p>
        从源码到 bundle，打包器做的事并不神秘：解析成 AST 看清依赖，用 loader 把一切转成 JS 模块，
        沿依赖图收集并给模块编号，组织成 chunk，最后拼成一个带自造 <code>require</code> 的产物。
        真实工具在此之上加了模块缓存、分块、Tree Shaking、HMR 等工程化能力，但内核始终是那一套。
        理解了这条主线，后面学 Vite、webpack 的各种配置，就都是在给这条流水线的某一步「拧旋钮」。
      </p>

      <Summary
        points={[
          '打包五步：解析成 AST、加载与转换、基于依赖图收集模块、生成 chunk、输出到 dist。',
          '解析用 AST 而非正则，才能准确识别每条 import；转换让 TS/JSX/CSS/图片都变成 JS 模块（一切皆模块）。',
          '极简打包器内核：读入口→找 import→递归构建图→给每个模块一个数字 id，并为每个模块记录「相对路径→编号」的 mapping。',
          '输出是把模块包成函数、配一个自造 require、塞进 IIFE；从入口模块 require(0) 启动整个程序。',
          'webpack 运行时用 __webpack_require__ 加模块缓存：每个模块只执行一次，这正是模块单例的来源。',
          'chunk 是内部代码块单位、输出后成为 bundle；HMR 靠 dev server 推送变更、运行时只替换变动模块，做到不刷新整页、不丢状态。',
        ]}
      />
    </article>
  )
}
