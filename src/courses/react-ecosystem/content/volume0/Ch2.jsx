import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createSnippet = `# 用 Vite 脚手架创建一个 React 工程
npm create vite@latest my-app

# 交互式选择里：
#   Select a framework  ->  React
#   Select a variant    ->  JavaScript（或 TypeScript，本课用 JavaScript）

cd my-app
npm install      # 安装依赖
npm run dev      # 启动开发服务器，默认 http://localhost:5173`

const treeSnippet = `my-app/
├─ index.html          # 唯一的 HTML 入口，里面有 <div id="root"></div>
├─ package.json        # 依赖与脚本（dev / build / preview）
├─ vite.config.js      # Vite 配置
└─ src/
   ├─ main.jsx         # JS 入口：把 React 挂到 #root 上
   ├─ App.jsx          # 根组件
   ├─ App.css          # 组件样式
   └─ index.css        # 全局样式`

const mainSnippet = `// src/main.jsx —— 整个应用的挂载链路
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ① 找到 index.html 里的 <div id="root">
// ② createRoot 在它上面建立一个 React 渲染根
// ③ render 把 <App /> 这棵组件树渲染进去
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)`

const appSnippet = `// src/App.jsx —— 你的第一个函数组件
function App() {
  // 函数组件 = 一个返回 JSX 的普通函数
  return (
    <div className="app">
      <h1>你好，React</h1>
      <p>这是我的第一个组件。</p>
    </div>
  )
}

// 默认导出，供 main.jsx 导入
export default App`

const helloSnippet = `// src/Hello.jsx —— 一个带 props 的最小可复用组件
function Hello({ name }) {
  return <p>你好，{name}！</p>
}

export default Hello`

const useHelloSnippet = `// src/App.jsx —— 导入并使用 Hello
import Hello from './Hello.jsx'

function App() {
  return (
    <div>
      <Hello name="小明" />
      <Hello name="小红" />   {/* 同一组件，传不同 props 复用 */}
    </div>
  )
}

export default App`

const caseSnippet = `// 大小写决定 React 怎么解读这个标签：
return <div><App /></div>      // App 大写 -> 当作「组件」，调用 App() 函数
// return <div><app /></div>   // app 小写 -> 当作原生 HTML 标签 <app>，不是你的组件！`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们建立了 React 的心智模型，这一章把它落地：用现代脚手架 <strong>Vite</strong>
        搭一个能跑的工程，理清从 <code>index.html</code> 到屏幕上那行字之间的<strong>挂载链路</strong>，
        然后亲手写出、导出、复用你的第一个<strong>函数组件</strong>。读完你会清楚地知道：
        一个 React 应用是怎么从「一个空 div」长成「一棵组件树」的。
      </Lead>

      <h2>一、为什么用 Vite</h2>
      <p>
        浏览器只认 HTML / CSS / JS，并不直接认 JSX 和模块化的源码，所以 React 工程需要一套
        <strong>构建工具</strong>把源码转译、打包。<strong>Vite</strong> 是当下最主流的选择：
        启动快（开发期按需编译，秒开），配置少，对 React 开箱即用。它取代了早年笨重的
        Create React App，成为新项目的默认脚手架。
      </p>
      <Callout variant="note" title="Vite 与 React 是两回事">
        Vite 是构建 / 开发工具，React 是 UI 库。Vite 负责「把你的源码变成浏览器能跑的东西、
        并提供开发服务器」；React 负责「组件与渲染」。本课用 Vite 当工程底座，重点学 React 本身。
      </Callout>

      <h2>二、创建工程</h2>
      <p>
        确保装了 Node.js（建议 18+），然后一行命令创建工程。<code>npm create vite@latest</code>
        会拉起一个交互式向导，让你选框架和语言变体——框架选 <strong>React</strong>，变体本课选
        <strong>JavaScript</strong>。
      </p>
      <CodeBlock lang="bash" title="创建并启动一个 Vite + React 工程" code={createSnippet} />
      <p>
        三步走：<code>npm install</code> 装依赖，<code>npm run dev</code> 起开发服务器，
        浏览器打开它打印出的地址（默认 <code>http://localhost:5173</code>），就能看到 Vite 自带的
        示例页面。开发服务器支持<strong>热更新</strong>：你改源码并保存，浏览器会自动局部刷新，
        无需手动重载。
      </p>

      <h2>三、目录结构与挂载链路</h2>
      <p>
        新工程的关键文件不多，先认清它们各自的职责：
      </p>
      <CodeBlock lang="text" title="Vite + React 的基本目录结构" code={treeSnippet} />
      <p>
        理解一个 React 应用，最重要的是看懂它的<strong>挂载链路</strong>——React 这棵组件树到底是
        从哪里、怎么接到页面上的。链路分三站：
      </p>
      <ul>
        <li>
          <strong>index.html</strong>：整个站点唯一的 HTML 文件，里面有一个空的
          <code>{'<div id="root"></div>'}</code>，这是 React 的「落脚点」；它还用
          <code>{'<script type="module" src="/src/main.jsx">'}</code> 引入 JS 入口。
        </li>
        <li>
          <strong>src/main.jsx</strong>：JS 入口。它找到那个 <code>#root</code> 节点，
          建立 React 渲染根，并把根组件 <code>{'<App />'}</code> 渲染进去。
        </li>
        <li>
          <strong>src/App.jsx</strong>：根组件，应用的界面从这里开始，往下展开成整棵组件树。
        </li>
      </ul>
      <CodeBlock lang="jsx" title="src/main.jsx：把 App 渲染到 root 上" code={mainSnippet} />
      <KeyIdea>
        挂载链路一句话：<code>index.html</code> 里有个空的 <code>#root</code>，
        <code>main.jsx</code> 用 <code>createRoot(document.getElementById('root'))</code>
        在它上面建一个 React 根，再 <code>.render(&lt;App /&gt;)</code> 把组件树渲染进去。
        从此页面这块区域就交给 React 管理了。
      </KeyIdea>

      <h2>四、第一个函数组件</h2>
      <p>
        现在看主角 <code>App</code>。在现代 React 里，<strong>组件就是一个返回 JSX 的函数</strong>——
        没有别的玄机。它接收输入（props），返回一段描述「该长什么样」的 JSX。
      </p>
      <CodeBlock lang="jsx" title="src/App.jsx：一个返回 JSX 的函数" code={appSnippet} />
      <KeyIdea>
        函数组件 = 接收 <code>props</code>、返回 JSX 的普通 JavaScript 函数。
        它本质上就是上一章说的那个 <code>f</code>——把状态 / 输入映射成界面描述。
        React 在需要时调用它，拿到返回的 JSX 去更新界面。
      </KeyIdea>

      <h3>组件名为什么必须大写开头</h3>
      <p>
        这是一条<strong>硬性规则</strong>，不是风格偏好。JSX 在编译后，遇到标签时要决定：
        这是一个原生 HTML 标签（如 <code>{'<div>'}</code>），还是你自定义的组件？React 用
        <strong>首字母大小写</strong>来区分——小写开头当作原生标签，大写开头当作组件去调用你的函数。
      </p>
      <CodeBlock lang="jsx" title="大小写决定标签的含义" code={caseSnippet} />
      <Callout variant="warn" title="组件名写成小写会渲染不出来">
        如果你把组件命名为 <code>app</code> 并写 <code>{'<app />'}</code>，React 会把它当成一个名叫
        app 的原生 HTML 标签来处理——结果就是你的组件根本没被调用，页面上什么也不显示，
        且通常不会报明显的错。<strong>组件名一律大写开头</strong>（PascalCase），这是必须记住的铁律。
      </Callout>

      <h2>五、导出与导入：把组件拼起来</h2>
      <p>
        组件要在别处被使用，就得<strong>导出</strong>；使用方再<strong>导入</strong>它。上面
        <code>App.jsx</code> 末尾的 <code>export default App</code> 就是默认导出，
        <code>main.jsx</code> 里的 <code>import App from './App.jsx'</code> 就是对应的导入。
        这正是组件化「组合」的机制：每个组件住在自己的文件里，通过 import / export 拼装成树。
      </p>
      <Example title="写一个可复用组件并在 App 里用两次">
        <p>新建 <code>src/Hello.jsx</code>，写一个接收 <code>name</code> 的小组件并默认导出：</p>
        <CodeBlock lang="jsx" title="src/Hello.jsx" code={helloSnippet} />
        <p>回到 <code>App.jsx</code>，导入它，用不同 props 渲染两次——这就是「复用」：</p>
        <CodeBlock lang="jsx" title="src/App.jsx：导入并复用 Hello" code={useHelloSnippet} />
        <p>
          保存后，借助热更新，浏览器里会立刻出现「你好，小明！」和「你好，小红！」两行。
          同一个组件函数，靠不同的 props 输出不同的界面——这就是组件复用最朴素的样子。
        </p>
      </Example>
      <table>
        <thead>
          <tr><th>写法</th><th>导出</th><th>导入</th></tr>
        </thead>
        <tbody>
          <tr><td>默认导出（一个文件一个主组件，最常用）</td><td><code>export default App</code></td><td><code>import App from './App.jsx'</code></td></tr>
          <tr><td>具名导出（一个文件导出多个东西）</td><td><code>export function Hello() {}</code></td><td><code>{"import { Hello } from './Hello.jsx'"}</code></td></tr>
        </tbody>
      </table>

      <h2>六、新 JSX 转换：不必再 import React</h2>
      <p>
        你也许在老教程里见过每个组件文件顶部都写着 <code>import React from 'react'</code>。
        本课的示例里却没有这一行——这不是漏写。<strong>React 17</strong> 起引入了
        <strong>新的 JSX 转换</strong>：编译工具会自动注入运行时所需的导入，你写 JSX
        不必再手动 <code>import React</code>。
      </p>
      <KeyIdea>
        在 React 17+ 与 Vite 这类现代工具链下，<strong>写 JSX 不需要再 import React</strong>。
        只有当你直接用到 React 命名空间下的 API（如 <code>React.memo</code>）时才需要导入对应的东西，
        而即便那样，更常见的写法也是按需具名导入（如 <code>{"import { useState } from 'react'"}</code>）。
      </KeyIdea>

      <h2>七、StrictMode：开发期的「双调用」检查</h2>
      <p>
        回看 <code>main.jsx</code>，<code>{'<App />'}</code> 被包在 <code>{'<StrictMode>'}</code> 里。
        <strong>严格模式</strong>是 React 内建的一个开发期辅助工具，本身不渲染任何界面，
        作用是帮你<strong>提前暴露潜在问题</strong>：使用了过时 API 会警告，更重要的是它会
        <strong>故意把某些函数调用两次</strong>（组件渲染、部分 Hook 的初始化等）。
      </p>
      <Callout variant="note" title="为什么要故意双调用">
        React 期望你的组件渲染是「纯」的——同样的输入算出同样的输出，且不在渲染过程中制造副作用。
        StrictMode 在开发期故意调两次，如果你的组件依赖「只跑一次」的副作用（比如在渲染里改了外部变量），
        双调用就会让 bug 当场现形。它<strong>只在开发环境生效</strong>，生产构建里不会双调用，
        也不影响性能。看到控制台里日志打了两遍，别慌，这是它在工作。
      </Callout>

      <h2>八、把整条链路串起来</h2>
      <p>
        到这里，一个最小 React 应用的全貌就清晰了，自上而下：
      </p>
      <ol>
        <li><code>index.html</code> 提供一个空的 <code>#root</code> 容器，并加载 <code>main.jsx</code>。</li>
        <li><code>main.jsx</code> 用 <code>createRoot(#root).render(&lt;App /&gt;)</code> 把组件树挂上去，外面裹一层 <code>StrictMode</code>。</li>
        <li><code>App</code> 这个函数组件返回 JSX，并可组合 <code>Hello</code> 等子组件，向下展开成整棵树。</li>
        <li>每个组件靠 <code>export</code> / <code>import</code> 拼装，靠 <code>props</code> 复用，名字一律大写开头。</li>
        <li>Vite 在背后转译 JSX、提供热更新；React 17+ 的新转换让你免写 <code>import React</code>。</li>
      </ol>
      <Callout variant="tip">
        建议你现在就照着本章把工程跑起来，把 <code>App.jsx</code> 改成自己的内容、新建一个组件试试复用。
        下一卷我们将正式进入 JSX 的细节与 props、state 的用法，让组件「活」起来、能响应交互。
      </Callout>

      <Summary
        points={[
          '用 npm create vite@latest 创建工程，框架选 React；npm install 装依赖、npm run dev 起开发服务器（默认 5173），支持热更新。',
          '挂载链路：index.html 的空 #root -> main.jsx 用 createRoot(#root).render(<App />) 建根并渲染组件树 -> App 是根组件向下展开。',
          '函数组件就是「接收 props、返回 JSX 的普通函数」，本质即上一章的 f：把输入映射成界面描述。',
          '组件名必须大写开头：JSX 用首字母大小写区分原生标签（小写）与自定义组件（大写），写成小写会被当 HTML 标签而渲染不出来。',
          '组件靠 export 导出、import 导入来组合复用；默认导出与具名导出对应不同的导入写法。',
          'React 17+ 的新 JSX 转换让你不必再 import React；StrictMode 是开发期辅助，会故意双调用以暴露不纯的副作用，仅在开发环境生效。',
        ]}
      />
    </article>
  )
}
