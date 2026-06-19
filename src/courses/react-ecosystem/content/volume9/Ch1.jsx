import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const csrFlow = `<!-- 纯客户端渲染（CSR）下，服务器吐回的 HTML 几乎是空的 -->
<!doctype html>
<html>
  <head><title>我的应用</title></head>
  <body>
    <div id="root"></div>              <!-- 一个空壳 -->
    <script src="/assets/bundle.js"></script>
    <!-- 浏览器要：下载 bundle → 执行 React → 拉数据 → 才画出内容 -->
  </body>
</html>`

const ssrServer = `// SSR：服务器在响应请求时，先把 React 组件渲染成 HTML 字符串
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

app.get('*', async (req, res) => {
  const data = await fetchData(req.url)       // 服务端先把数据准备好
  const html = renderToString(<App data={data} />)  // 组件 → HTML 字符串
  res.send(\`
    <!doctype html>
    <html>
      <body>
        <div id="root">\${html}</div>          <!-- 首屏内容已经在 HTML 里 -->
        <script>window.__DATA__ = \${JSON.stringify(data)}</script>
        <script src="/assets/bundle.js"></script>
      </body>
    </html>\`)
})`

const hydrateClient = `// 客户端：不是重新渲染，而是「注水」——给已有的 HTML 接上事件
import { hydrateRoot } from 'react-dom/client'
import App from './App.jsx'

// 服务端塞进来的数据，客户端首屏必须用同一份，否则结构对不上
const data = window.__DATA__

hydrateRoot(
  document.getElementById('root'),
  <App data={data} />,
)`

const hydrationMismatch = `function Clock() {
  // 反例：服务端渲染出的时间，和客户端注水时的时间不可能一样
  // 服务端 HTML 是 "12:00:00"，客户端注水时已是 "12:00:03"
  // → React 警告 "Hydration failed / Text content did not match"
  return <span>{new Date().toLocaleTimeString()}</span>
}

// 正解：首屏先渲染稳定值，挂载后再用 effect 切到真实值
function Clock() {
  const [time, setTime] = React.useState(null)
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{time ?? '加载中…'}</span>
}`

const nextRouting = `app/
├─ layout.jsx          // 根布局：包裹所有页面（<html><body>）
├─ page.jsx            // 路由 "/"
├─ about/
│  └─ page.jsx         // 路由 "/about"
└─ blog/
   └─ [slug]/
      └─ page.jsx      // 动态路由 "/blog/:slug"

// App Router 里，page.jsx 默认就是「服务端组件」`

const rscExample = `// app/posts/page.jsx —— 默认是 React Server Component（RSC）
// 没有 'use client'：这段代码只在服务端跑，不会进客户端 bundle
import db from '@/lib/db'

export default async function Posts() {
  // 服务端组件可以直接 await，直接访问数据库 / 文件系统
  const posts = await db.post.findMany()
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  )
}`

const useClientExample = `// app/components/LikeButton.jsx —— 客户端组件
'use client'                       // 这一行声明：我要在浏览器里跑
import { useState } from 'react'

export default function LikeButton() {
  const [n, setN] = useState(0)    // 有状态 / 事件 → 必须是客户端组件
  return <button onClick={() => setN(n + 1)}>赞 {n}</button>
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到这里，你已经会用 React 组件、Hooks、状态管理、路由和数据请求搭出一个像样的应用。
        但这些应用有一个共同前提：所有渲染都发生在<strong>浏览器</strong>里。这一章我们把视角抬高，
        看看渲染到底可以发生在<strong>哪里、什么时候</strong>——CSR、SSR、SSG、ISR 四种策略，
        注水（hydration）这个关键概念，以及把它们整合在一起的全栈框架 Next.js 与它带来的
        React Server Components（RSC）。这是从「写组件」迈向「设计渲染架构」的一章。
      </Lead>

      <h2>一、纯客户端渲染（CSR）的短板</h2>
      <p>
        我们到目前为止写的应用（用 Vite + React Router 那种）几乎都是 <strong>CSR</strong>：
        服务器返回一个几乎空白的 HTML，里面只有一个 <code>{'<div id="root">'}</code> 和一个
        <code>{'<script>'}</code>。真正的页面内容，要等浏览器把 JS bundle 下载完、执行 React、
        再去拉数据，才一点点画出来。
      </p>
      <CodeBlock lang="html" title="CSR 下服务器返回的 HTML 几乎是空壳" code={csrFlow} />
      <p>这种「先给空壳，再用 JS 填」的模式，在三类场景下会暴露明显短板：</p>
      <ul>
        <li>
          <strong>首屏白屏</strong>：从「服务器返回」到「用户看见内容」之间隔着
          下载 JS、解析执行、发请求、等响应好几步。网络越慢、bundle 越大，用户盯着白屏的时间越长。
        </li>
        <li>
          <strong>SEO 不友好</strong>：很多爬虫拿到的就是那个空壳 HTML，里面没有正文。
          虽然现代搜索引擎能执行部分 JS，但并不可靠，也不及时，内容站很吃亏。
        </li>
        <li>
          <strong>慢设备吃力</strong>：所有渲染计算都压在用户的设备上。低端手机解析执行
          一大坨 JS 很慢，首屏可交互时间（TTI）被进一步拉长。
        </li>
      </ul>
      <p>
        解决思路很自然：<strong>把一部分渲染工作挪到服务器</strong>，让用户第一时间就拿到
        带内容的 HTML。这就引出了下面四种渲染策略。
      </p>

      <h2>二、四种渲染策略：CSR / SSR / SSG / ISR</h2>
      <KeyIdea>
        渲染策略的本质，是回答两个问题：HTML 在<strong>哪里</strong>生成（浏览器还是服务器），
        以及<strong>什么时候</strong>生成（用户请求时，还是构建时提前生成）。四种策略就是这两个
        维度的不同组合。
      </KeyIdea>
      <table>
        <thead>
          <tr>
            <th>策略</th>
            <th>HTML 何时 / 何地生成</th>
            <th>首屏</th>
            <th>SEO</th>
            <th>典型场景</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CSR</strong> 客户端渲染</td>
            <td>浏览器运行时生成</td>
            <td>慢（先白屏）</td>
            <td>差</td>
            <td>后台管理、登录后才看的应用</td>
          </tr>
          <tr>
            <td><strong>SSR</strong> 服务端渲染</td>
            <td>每次请求时在服务器生成</td>
            <td>快（首屏即内容）</td>
            <td>好</td>
            <td>内容随用户 / 时间变化的页面</td>
          </tr>
          <tr>
            <td><strong>SSG</strong> 静态站点生成</td>
            <td>构建时提前生成好</td>
            <td>最快（纯静态文件）</td>
            <td>好</td>
            <td>博客、文档、营销页</td>
          </tr>
          <tr>
            <td><strong>ISR</strong> 增量静态再生</td>
            <td>构建时生成 + 按周期在后台重建</td>
            <td>最快</td>
            <td>好</td>
            <td>内容会更新但不需实时的站（如商品页）</td>
          </tr>
        </tbody>
      </table>
      <p>
        简单记：<strong>CSR 在浏览器</strong>，<strong>SSR 在每次请求</strong>，
        <strong>SSG 在构建时一次性</strong>，<strong>ISR 是 SSG 加了「过期自动重建」</strong>。
        SSR 内容最新但每次请求都要算；SSG 最快但内容是「上次构建时」的快照；
        ISR 在两者间取平衡——大部分时间发静态文件，过了设定的时间窗才在后台悄悄重建一次。
      </p>

      <Example title="同一个博客，三种策略下会怎样">
        <p>
          <strong>SSG</strong>：构建时把每篇文章渲染成 HTML 文件。访问飞快，但发新文章要重新构建部署。
        </p>
        <p>
          <strong>ISR</strong>：同样先发静态文件，但设 <code>revalidate=60</code>，
          60 秒后第一个访问者触发后台重建，新内容随后生效——不用手动重新部署。
        </p>
        <p>
          <strong>SSR</strong>：每次访问都现场渲染，永远最新，代价是每个请求都消耗服务器算力。
          博客这种「内容不常变」的场景，SSG / ISR 通常比 SSR 更划算。
        </p>
      </Example>

      <h2>三、SSR 是怎么工作的：renderToString</h2>
      <p>
        SSR 的核心 API 是 <code>react-dom/server</code> 里的 <code>renderToString</code>（或流式版
        <code>renderToPipeableStream</code>）。它在服务器上把 React 组件树「跑一遍」，
        产出纯 HTML 字符串，塞进响应里发给浏览器。
      </p>
      <CodeBlock lang="js" title="服务端：把组件渲染成 HTML 字符串" code={ssrServer} />
      <p>
        注意两个细节：① 服务端要先<strong>准备好数据</strong>再渲染，否则渲染出来的还是空的；
        ② 用到的数据要一并塞进 HTML（这里挂在 <code>window.__DATA__</code> 上），
        因为客户端马上要用<strong>同一份数据</strong>来「注水」。这就引出下一节。
      </p>

      <h2>四、注水（hydration）与「不匹配」的坑</h2>
      <KeyIdea>
        注水（hydration）是指：浏览器拿到服务端已经渲染好的 HTML 后，React 不会把它推倒重画，
        而是<strong>复用这些 DOM 节点，只给它们接上事件监听和内部状态</strong>，让这段静态 HTML
        「活」过来、变得可交互。就像给一具已经成形的躯体注入水分使其复活。
      </KeyIdea>
      <p>
        客户端用的是 <code>hydrateRoot</code> 而不是 <code>createRoot</code>。区别在于：
        <code>createRoot</code> 假设容器是空的、从零画起；<code>hydrateRoot</code> 假设容器里
        已经有服务端渲染好的 HTML，它去<strong>匹配并接管</strong>这些节点。
      </p>
      <CodeBlock lang="js" title="客户端：注水而非重新渲染" code={hydrateClient} />
      <p>
        这里有一个新手必踩的坑——<strong>hydration 不匹配（hydration mismatch）</strong>。
        React 注水时会假定「客户端首次渲染出来的结构，应当和服务端发来的 HTML 完全一致」。
        一旦对不上，React 会报警告，并可能丢弃服务端 HTML 改为客户端重画，性能与体验双输。
      </p>
      <CodeBlock lang="jsx" title="hydration 不匹配：反例与正解" code={hydrationMismatch} />
      <Callout variant="warn" title="哪些写法会导致 hydration 不匹配">
        常见元凶：直接渲染 <code>Date.now()</code> / <code>Math.random()</code> 这类
        每次都不同的值；读取只有浏览器才有的 <code>window</code> / <code>localStorage</code> 来
        决定首屏内容；以及服务端和客户端用了不同的数据。原则是：
        <strong>首屏渲染必须是确定的、两端一致的</strong>，「只有浏览器才知道」的东西放进
        <code>useEffect</code> 里、挂载之后再处理。
      </Callout>

      <h2>五、Next.js 是什么</h2>
      <p>
        手写 SSR 服务器、管理路由、处理数据获取、配置打包……这些拼起来很繁琐。
        <strong>Next.js</strong> 就是把这些都打包好的<strong>React 全栈框架</strong>——
        它在 React 之上提供了一整套「开箱即用」的渲染与工程能力，是当下最主流的 React 框架。
        它的几个核心能力：
      </p>
      <ul>
        <li>
          <strong>文件路由</strong>：不用手写路由表，目录结构就是路由。
          <code>app/about/page.jsx</code> 自动对应 <code>/about</code>。
        </li>
        <li>
          <strong>App Router</strong>：新一代路由体系（基于 <code>app/</code> 目录），
          默认拥抱服务端组件，支持嵌套布局、加载态、错误边界等。
        </li>
        <li>
          <strong>灵活的渲染策略</strong>：同一个框架里，你可以按页面选择 SSR / SSG / ISR，
          上一节那张表里的策略它都支持。
        </li>
        <li>
          <strong>数据获取</strong>：服务端组件里可以直接 <code>await</code> 拉数据，
          还内置了请求缓存与重新校验（revalidate）机制。
        </li>
      </ul>
      <CodeBlock lang="text" title="App Router：目录即路由" code={nextRouting} />

      <h2>六、React Server Components（RSC）</h2>
      <KeyIdea>
        React Server Components 的核心思想是：让一部分组件<strong>只在服务端渲染</strong>，
        它们的代码<strong>完全不进客户端 bundle</strong>（零客户端 JS），还能直接访问数据库、
        文件系统等服务端资源。需要交互的部分，再用 <code>'use client'</code> 显式标成客户端组件。
      </KeyIdea>
      <p>
        在 App Router 里，组件<strong>默认是服务端组件（RSC）</strong>。它们只在服务器上运行一次，
        把结果发给浏览器，自己的代码（以及它 import 的库）都不会增加客户端 bundle 体积。
      </p>
      <CodeBlock lang="jsx" title="服务端组件：直接 await 拉数据，零客户端 JS" code={rscExample} />
      <p>
        但服务端组件<strong>不能</strong>用 <code>useState</code>、<code>useEffect</code>、
        事件处理器这些「浏览器里才有意义」的东西。一旦组件需要交互，就要在文件顶部加一行
        <code>{"'use client'"}</code>，把它声明为<strong>客户端组件</strong>。
      </p>
      <CodeBlock lang="jsx" title="客户端组件：用 'use client' 声明" code={useClientExample} />
      <Callout variant="tip" title="服务端组件 vs 客户端组件，怎么分">
        默认走服务端组件（更省、更快、能直连数据源）；只有当组件需要
        <strong>状态、事件、生命周期、浏览器 API</strong> 时，才用 <code>'use client'</code> 把它
        以及它的交互子树划到客户端。常见做法是：外层用服务端组件拉数据，
        把数据当 props 传给内层的小块客户端组件去做交互——尽量把 <code>'use client'</code>
        推到叶子节点，客户端 bundle 就最小。
      </Callout>
      <table>
        <thead>
          <tr>
            <th>能力</th>
            <th>服务端组件（默认）</th>
            <th>客户端组件（'use client'）</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>进客户端 bundle</td><td>否（零 JS）</td><td>是</td></tr>
          <tr><td>直接访问数据库 / 文件</td><td>可以</td><td>不可以</td></tr>
          <tr><td>useState / useEffect</td><td>不能用</td><td>能用</td></tr>
          <tr><td>onClick 等事件</td><td>不能用</td><td>能用</td></tr>
          <tr><td>访问 window / localStorage</td><td>不能用</td><td>能用</td></tr>
        </tbody>
      </table>

      <h2>七、流式 SSR（streaming）一句话</h2>
      <p>
        <strong>流式 SSR</strong>：服务器不必等整页都渲染完才发，而是把 HTML 分块（chunk）
        边渲染边推给浏览器——慢的数据区域先用占位骨架顶着（配合 <code>{'<Suspense>'}</code>），
        数据就绪后再把那一块补上。用户更早看到内容，慢接口不再拖垮整页首屏。
      </p>

      <h2>八、什么时候你需要 Next，什么时候纯 SPA 就够</h2>
      <p>
        渲染架构没有银弹，要按场景选。下面是一条务实的判断线：
      </p>
      <table>
        <thead>
          <tr><th>你的场景</th><th>建议</th></tr>
        </thead>
        <tbody>
          <tr><td>内容站、博客、文档、营销官网（要 SEO）</td><td>Next（SSG / ISR）</td></tr>
          <tr><td>电商、需要 SEO 且内容会变的页面</td><td>Next（SSR / ISR）</td></tr>
          <tr><td>想前后端一体、用一个框架搞定路由 + 接口</td><td>Next（全栈）</td></tr>
          <tr><td>登录后才看的后台管理系统 / 内部工具</td><td>纯 SPA（Vite + React Router）就够</td></tr>
          <tr><td>无需 SEO、首屏白屏可接受的工具型应用</td><td>纯 SPA 更轻、心智更简单</td></tr>
        </tbody>
      </table>
      <p>
        一句话总结这条判断线：<strong>需要 SEO、需要好首屏、想要全栈一体，就上 Next</strong>；
        反之，登录后才用、不在乎搜索引擎收录的后台系统，<strong>纯 SPA 反而更省事</strong>——
        不用养服务器、不用操心 hydration、构建和部署都更简单。别为了「显得先进」而给一个
        后台管理系统硬套 SSR。
      </p>

      <Callout variant="tip">
        下一章是本课的收束章：我们补上工程化里最后一块拼图——<strong>测试</strong>，
        再用一张「React 生态地图」把这门课走过的构建、状态、路由、数据、UI、测试、框架
        各个领域串成一张可带走的全景图，并给出一条进阶学习路径。
      </Callout>

      <Summary
        points={[
          'CSR 把渲染全压在浏览器：服务器只发空壳 HTML，导致首屏白屏、SEO 差、慢设备吃力。',
          '四种渲染策略：CSR（浏览器运行时）、SSR（每次请求时服务端生成）、SSG（构建时一次性生成）、ISR（SSG + 按周期后台重建）。',
          'SSR 用 renderToString 在服务端产出 HTML；首屏即内容，但每个请求都要算。',
          'hydration（注水）= 浏览器复用服务端 HTML 节点、只接上事件与状态使其可交互；用 hydrateRoot 而非 createRoot。',
          'hydration 不匹配是大坑：Date/random、window、两端数据不一致都会触发；首屏要确定且两端一致，浏览器专属逻辑放进 useEffect。',
          'Next.js 是 React 全栈框架：文件路由、App Router、可按页选 SSR/SSG/ISR、服务端直接取数。',
          'RSC（服务端组件）默认只在服务端渲染、零客户端 JS、能直连数据源；需要交互时用 \'use client\' 划为客户端组件，尽量下推到叶子。',
          '流式 SSR 把 HTML 分块边渲染边推，配合 Suspense 让慢区域先占位。',
          '内容站 / SEO / 全栈选 Next；登录后看、无需 SEO 的后台系统纯 SPA 更省事。',
        ]}
      />
    </article>
  )
}
