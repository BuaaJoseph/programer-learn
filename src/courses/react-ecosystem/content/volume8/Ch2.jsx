import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const lazySnippet = `import { lazy, Suspense } from 'react'

// React.lazy 接收一个返回 Promise 的函数，里面用动态 import()。
// 这一行会让打包工具（Vite/Rollup/webpack）把 Chart 单独切成一个 chunk，
// 只有真的要渲染 <Chart /> 时才会去下载那段 JS。
const Chart = lazy(() => import('./Chart.jsx'))

function Dashboard({ showChart }) {
  return (
    <div>
      <h1>仪表盘</h1>
      {/* Suspense 在 lazy 组件还没加载好时显示 fallback */}
      <Suspense fallback={<p>图表加载中…</p>}>
        {showChart && <Chart />}
      </Suspense>
    </div>
  )
}`

const dynamicImportSnippet = `// 动态 import() 不止能配合 lazy，也能按需加载「纯逻辑」模块。
// 比如一个很重的工具库，只在用户点击「导出」时才加载：
async function handleExport(rows) {
  // 点击之前，这段代码（及其依赖）根本不会进入首屏 bundle
  const { exportToExcel } = await import('./heavyExcelLib.js')
  exportToExcel(rows)
}

// import() 返回 Promise，resolve 出来的是模块的命名空间对象（含 default / 具名导出）。`

const routeLazySnippet = `import { createBrowserRouter } from 'react-router-dom'

// 路由级分包：每个页面一个 chunk。配合 r6 学过的 route.lazy，
// 进入某条路由时才下载该页面的代码，首屏只装当前页所需的那一块。
const router = createBrowserRouter([
  {
    path: '/',
    Component: Home, // 首页通常直接打进首屏
  },
  {
    path: '/settings',
    // lazy 返回一个 Promise，resolve 出 { Component } 或 { element }
    lazy: async () => {
      const { Settings } = await import('./pages/Settings.jsx')
      return { Component: Settings }
    },
  },
  {
    path: '/reports',
    lazy: () => import('./pages/Reports.jsx'), // 模块需导出 Component / loader 等
  },
])`

const preloadSnippet = `import { lazy, Suspense, useState } from 'react'

// 预加载技巧：把动态 import 抽成一个可复用的函数，
// 这样既能交给 lazy，又能在「即将需要」时手动提前触发下载。
const importHeavyModal = () => import('./HeavyModal.jsx')
const HeavyModal = lazy(importHeavyModal)

function OpenButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* hover/focus 时就开始预取，等用户真正点击时往往已经下载好了 */}
      <button
        onMouseEnter={() => importHeavyModal()}
        onFocus={() => importHeavyModal()}
        onClick={() => setOpen(true)}
      >
        打开
      </button>
      <Suspense fallback={<p>加载中…</p>}>
        {open && <HeavyModal onClose={() => setOpen(false)} />}
      </Suspense>
    </>
  )
}`

const viteSnippet = `// Vite 基于 Rollup，对动态 import() 天然做代码分割，无需额外配置。
// 想给 chunk 起个可读的名字，可以加魔法注释（webpack 风格，Vite/Rollup 也认）：
const Editor = lazy(() =>
  import(/* webpackChunkName: "editor" */ './Editor.jsx')
)

// 还可以用 <link rel="modulepreload"> 让浏览器空闲时预取关键 chunk：
//   <link rel="modulepreload" href="/assets/editor-abc123.js" />
// Vite 在生产构建里会为静态可分析的依赖自动注入这类预加载提示。`

const virtualConcept = `import { useRef, useState } from 'react'

// 虚拟化的核心思想（极简手写示意，实战请用 react-window / react-virtuoso）：
// 一个有 1 万行的列表，屏幕一次只能看到约 20 行。
// 那就「只渲染可视区的那 ~20 行」，其余用一个撑高的占位容器顶住滚动条。
function VirtualList({ items, rowHeight = 40, viewportHeight = 400 }) {
  const [scrollTop, setScrollTop] = useState(0)

  const total = items.length * rowHeight                    // 整个列表的真实高度
  const start = Math.floor(scrollTop / rowHeight)           // 第一行可见项的下标
  const count = Math.ceil(viewportHeight / rowHeight) + 1    // 可视区能放下几行
  const visible = items.slice(start, start + count)         // 只切出这几行来渲染

  return (
    <div
      style={{ height: viewportHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* 用一个撑满总高度的容器，保证滚动条比例正确 */}
      <div style={{ height: total, position: 'relative' }}>
        {visible.map((item, i) => (
          <div
            key={start + i}
            style={{
              position: 'absolute',
              top: (start + i) * rowHeight, // 用绝对定位把行放到正确位置
              height: rowHeight,
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}`

const imgSnippet = `<!-- 图片懒加载：原生 loading="lazy" 让视口外的图片延迟到滚动到附近才下载 -->
<img src="/big-photo.webp" loading="lazy" width="800" height="600" alt="…" />`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们减少了运行时的多余重渲染；这一章换个战场——<strong>首屏加载</strong>。
        用户打开页面时，浏览器要先下载、解析、执行 JS，bundle 越大，第一眼可交互就越慢。
        <strong>代码分割（code splitting）</strong> 与<strong>懒加载（lazy loading）</strong>
        的目标就是：让首屏只装「现在就要用」的那一小块，其余按需再取。我们会讲 React.lazy + Suspense、
        路由级分包、动态 import、预加载，以及长列表虚拟化。
      </Lead>

      <h2>一、为什么要分割：首屏 bundle 越小越快</h2>
      <p>
        默认情况下，打包工具会把你 import 进来的所有代码打成一个（或少数几个）大文件。应用越长大，
        这个文件越臃肿，而<strong>用户首屏其实只用得到其中很小一部分</strong>——设置页、报表页、
        富文本编辑器、图表库的代码，在首页一行都用不到，却被一股脑塞进了首屏要下载的包里。
      </p>
      <KeyIdea>
        代码分割的核心收益是<strong>把「用不到的代码」从首屏关键路径上移走</strong>。
        首屏 bundle 越小，下载越快、解析执行越快，可交互时间（TTI）就越早到来。
      </KeyIdea>
      <p>
        分割的代价是：被切出去的代码在真正需要时要<strong>额外发一次网络请求</strong>去取。
        所以它是一笔权衡——把「首屏必需」留在主包，把「之后才用、或不一定会用」的切出去。
      </p>

      <h2>二、组件级懒加载：React.lazy + Suspense</h2>
      <p>
        React 内置的 <code>lazy</code> 让你把任意组件变成「按需加载」。它接收一个返回 Promise 的函数，
        函数里用动态 <code>import()</code> 指向目标模块；打包工具看到动态 import，就会把那个模块
        <strong>单独切成一个 chunk</strong>。渲染该组件时，React 才去下载这个 chunk。
      </p>
      <CodeBlock lang="javascript" title="React.lazy + Suspense 懒加载组件" code={lazySnippet} />
      <p>
        懒加载的组件在「还没下载完」时处于挂起状态，必须用 <code>Suspense</code> 在外层包住，
        并提供 <code>fallback</code>（加载中的占位 UI）。一个 <code>Suspense</code> 可以同时罩住多个
        lazy 组件，它们任意一个未就绪都会显示 fallback。
      </p>
      <Callout variant="warn" title="lazy 必须导出 default">
        <code>React.lazy</code> 期望目标模块有一个 <strong>default 导出</strong>的组件。
        如果你的组件是具名导出，要么改成 default，要么在 import 的 <code>then</code> 里映射：
        <code>{'.then((m) => ({ default: m.MyComp }))'}</code>。
      </Callout>

      <h2>三、动态 import()：不止用于组件</h2>
      <p>
        <code>lazy</code> 背后真正干活的是 ES 的动态 <code>import()</code>。它返回一个 Promise，
        resolve 出模块的命名空间对象。除了配合 lazy 加载组件，它也能<strong>按需加载纯逻辑模块</strong>——
        比如某个很重的库只在用户点某个按钮时才需要，那就别让它进首屏。
      </p>
      <CodeBlock lang="javascript" title="用动态 import() 按需加载重逻辑" code={dynamicImportSnippet} />

      <h2>四、路由级分包：每个页面一个 chunk</h2>
      <p>
        组件级懒加载之上，最自然的分割粒度是<strong>路由</strong>：每个页面切成一个 chunk，
        用户访问哪条路由才下载哪页代码。这通常是收益最大、改动最小的一步。结合我们在 r6
        学过的 <strong>route.lazy</strong>，可以让 React Router 在进入路由前异步加载页面模块。
      </p>
      <CodeBlock lang="javascript" title="路由级分包（配合 route.lazy）" code={routeLazySnippet} />
      <p>
        注意 <code>route.lazy</code> 和 <code>React.lazy</code> 的差别：前者由路由器在<strong>导航时</strong>
        触发加载，且可以同时异步加载该路由的 <code>Component</code>、<code>loader</code>、<code>action</code>
        等；后者只针对组件、在<strong>渲染时</strong>触发，需要 Suspense 配合。两者可以叠加使用。
      </p>

      <h2>五、预加载 / 预取：把等待提前到「闲时」</h2>
      <p>
        懒加载省了首屏，但代价是「用到时才下载」会带来一小段等待。<strong>预加载（preload）</strong>
        就是把这段等待提前到用户「很可能马上要用」的时刻——比如鼠标 <strong>hover</strong> 在按钮上、
        或元素获得焦点时，就悄悄开始下载，等真正点击时往往已经就绪。
      </p>
      <CodeBlock lang="javascript" title="hover 预载：把 import 抽成可复用函数" code={preloadSnippet} />
      <p>
        构建工具层面，Vite（基于 Rollup）对动态 import 默认就做分割，还能用
        <code>{'<link rel="modulepreload">'}</code> 让浏览器空闲时预取关键 chunk。
      </p>
      <CodeBlock lang="javascript" title="Vite / Rollup 的 chunk 命名与预加载" code={viteSnippet} />
      <table>
        <thead>
          <tr><th>策略</th><th>时机</th><th>典型用法</th></tr>
        </thead>
        <tbody>
          <tr><td>懒加载</td><td>真正渲染/进入路由时</td><td>React.lazy / route.lazy</td></tr>
          <tr><td>hover 预载</td><td>用户 hover/focus 时</td><td>onMouseEnter 里调 import()</td></tr>
          <tr><td>modulepreload</td><td>浏览器空闲时</td><td>link 标签，Vite 可自动注入</td></tr>
          <tr><td>prefetch</td><td>空闲带宽时</td><td>预取「下一步很可能去」的页面</td></tr>
        </tbody>
      </table>

      <h2>六、长列表虚拟化：只渲染可视区</h2>
      <p>
        代码分割解决「下载多少」，虚拟化解决「渲染多少」。一个有上万行的列表，如果一次性把所有行都
        渲染成 DOM，光是创建和布局这么多节点就会卡死。<strong>虚拟化（virtualization）</strong>
        的思路是：屏幕一次只看得到一小段，那就<strong>只渲染可视区内的那几十行</strong>，
        用一个撑高的占位容器维持正确的滚动条比例，滚动时动态替换渲染的那批行。
      </p>
      <CodeBlock lang="javascript" title="虚拟列表的核心思想（极简示意）" code={virtualConcept} />
      <Example title="实战别手写：用 react-window / react-virtuoso">
        <p>
          上面的示意只为讲清原理。真实项目里行高不定、有横向滚动、要无限加载、要键盘可达性……
          这些细节很多，自己实现极易出 bug。请直接用成熟库：
        </p>
        <ul>
          <li><strong>react-window</strong>：轻量、API 小，适合规整的等高/等宽列表与网格。</li>
          <li><strong>react-virtuoso</strong>：功能更全，支持不定高、分组、置顶、无限滚动等。</li>
        </ul>
        <p>
          它们的共同内核都是同一句话：<strong>窗口内才渲染，窗口外只占位</strong>。
        </p>
      </Example>
      <Callout variant="info" title="什么时候才需要虚拟化">
        虚拟化有它自己的复杂度成本。几十、几百行的列表，靠上一章的 memo + 列表项拆分通常就够了；
        只有当<strong>可见/潜在项数量大到 DOM 撑不住</strong>（成千上万）时，才上虚拟化。
      </Callout>

      <h2>七、图片与资源优化（一句话）</h2>
      <p>
        JS 之外，<strong>图片</strong>常是首屏体积的大头：给视口外的图加原生
        <code>{'loading="lazy"'}</code> 延迟下载，用 WebP/AVIF 等现代格式并提供合适尺寸，
        就能省下可观的首屏流量。
      </p>
      <CodeBlock lang="html" title="原生图片懒加载" code={imgSnippet} />

      <h2>八、本站就是个例子：每章一个 lazy chunk</h2>
      <p>
        你正在读的这个教学站本身就用了路由/内容级懒加载。内容注册表里，每一章都被包成一个
        <code>React.lazy(() =&gt; import('./volumeN/ChM.jsx'))</code>：
      </p>
      <CodeBlock
        lang="javascript"
        title="本站内容注册表（节选）"
        code={`import { lazy } from 'react'

export const CONTENT = {
  'r8-c1': lazy(() => import('./volume8/Ch1.jsx')),
  'r8-c2': lazy(() => import('./volume8/Ch2.jsx')),
  // …每一章都是一个独立 chunk
}`}
      />
      <p>
        效果是：打开站点时<strong>不会</strong>把所有章节的正文都下载下来；你点进哪一章，
        浏览器才去取那一章对应的那个小 chunk，外层再用 <code>Suspense</code> 显示「加载中」。
        这正是本章所有概念的一个活生生的落地。
      </p>

      <Callout variant="tip">
        小结一下分割的判断标准：<strong>首屏必需的留在主包，之后才用或不一定用的切出去</strong>；
        切出去之后，再用预加载把等待提前到闲时。下一卷我们继续深入 React 生态的其余主题。
      </Callout>

      <Summary
        points={[
          '分割的核心收益：把用不到的代码移出首屏关键路径，首屏 bundle 越小，下载/解析/可交互越快。',
          'React.lazy + Suspense 做组件级懒加载：lazy 里用动态 import() 切 chunk，Suspense 提供 fallback；目标需 default 导出。',
          '动态 import() 不止用于组件，也能按需加载重逻辑模块（如点击导出时才加载重库）。',
          '路由级分包是收益最大、改动最小的一步：配合 route.lazy，进入某路由才下载该页代码。',
          '预加载把等待提前到闲时：hover/focus 时触发 import()，或用 modulepreload/prefetch 在空闲时预取。',
          '长列表虚拟化只渲染可视区（react-window / react-virtuoso）：窗口内渲染、窗口外占位；项数大到 DOM 撑不住时才用。',
          '图片用 loading="lazy" 与现代格式优化；本站本身就是每章一个 lazy chunk 的实例。',
        ]}
      />
    </article>
  )
}
