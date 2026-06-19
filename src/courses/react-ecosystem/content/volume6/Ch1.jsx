import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const historySnippet = `// 浏览器原生 History API：改 URL 但不刷新整页
history.pushState({ page: 2 }, '', '/posts/2')  // 压入一条新历史记录，地址栏变成 /posts/2
history.replaceState({}, '', '/login')          // 替换当前记录，不新增历史栈条目

// 用户点「后退 / 前进」时，浏览器触发 popstate，我们据此重新渲染对应视图
window.addEventListener('popstate', (e) => {
  console.log('回退到的状态：', e.state)
  renderViewForUrl(location.pathname)  // 根据当前 URL 决定渲染哪个组件
})`

const basicRouterSnippet = `import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      {/* 导航区：Link 不会触发整页刷新，只改 URL 并切换视图 */}
      <nav>
        <Link to="/">首页</Link>
        <Link to="/about">关于</Link>
        <Link to="/posts">文章</Link>
      </nav>

      {/* Routes 在一堆 Route 里挑出第一个「最匹配」当前 URL 的来渲染 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/posts" element={<PostList />} />
        {/* 通配：上面都没命中时兜底，做 404 页 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}`

const hashRouterSnippet = `import { HashRouter } from 'react-router-dom'

// HashRouter 把路由信息放到 # 后面：example.com/#/about
// 优点：纯静态托管（GitHub Pages、对象存储）也能直接刷新 /#/about 不 404
// 因为 # 后面的内容浏览器不会发给服务器，服务器永远只收到根路径请求
function Root() {
  return (
    <HashRouter>
      {/* 内部用法和 BrowserRouter 完全一致 */}
      <App />
    </HashRouter>
  )
}`

const navLinkSnippet = `import { NavLink } from 'react-router-dom'

// NavLink 比 Link 多一件事：知道自己「是否处于激活状态」
// 它给 className / style 传入 { isActive, isPending }，方便高亮当前页
function Menu() {
  return (
    <nav>
      <NavLink
        to="/posts"
        className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}
      >
        文章
      </NavLink>

      {/* end 表示「精确匹配」：没有 end 时 "/" 会匹配所有子路径 */}
      <NavLink to="/" end>
        首页
      </NavLink>
    </nav>
  )
}`

const nestedSnippet = `import { Routes, Route, Outlet, Link, NavLink } from 'react-router-dom'

// 父布局：公共的壳（侧边栏 + 顶栏），子路由内容渲染到 <Outlet /> 的位置
function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside>
        <NavLink to="/dashboard">概览</NavLink>
        <NavLink to="/dashboard/settings">设置</NavLink>
      </aside>
      <main>
        {/* 子路由匹配到的组件会被塞进这里 */}
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* 父路由只提供布局，本身没有内容 */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* index 路由：精确匹配父路径 /dashboard 时渲染它 */}
        <Route index element={<Overview />} />
        {/* 相对路径：完整地址是 /dashboard/settings */}
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}`

const paramsSnippet = `import { Routes, Route, useParams, Link } from 'react-router-dom'

function App() {
  return (
    <Routes>
      {/* :id 是动态段，匹配 /posts/任意值 */}
      <Route path="/posts/:id" element={<PostDetail />} />
    </Routes>
  )
}

function PostList() {
  return (
    <ul>
      <li><Link to="/posts/42">第 42 篇</Link></li>
      <li><Link to="/posts/99">第 99 篇</Link></li>
    </ul>
  )
}

function PostDetail() {
  // useParams 读出 URL 里的动态段，键名就是 :id 里的 id
  const { id } = useParams()
  return <h1>正在看第 {id} 篇文章</h1>
}`

const navigateSnippet = `import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

function LoginButton() {
  const navigate = useNavigate()

  async function handleLogin() {
    await doLogin()
    navigate('/dashboard')            // 编程式跳转：登录成功后去仪表盘
    // navigate(-1)                   // 等价于浏览器后退
    // navigate('/login', { replace: true })  // 替换当前历史，禁止回退到这一页
  }

  return <button onClick={handleLogin}>登录</button>
}

function SearchPage() {
  const location = useLocation()           // 当前 location：pathname / search / hash / state
  const [params, setParams] = useSearchParams()  // 读写 ?key=value 查询串

  const keyword = params.get('q') || ''
  return (
    <input
      value={keyword}
      onChange={(e) => setParams({ q: e.target.value })}  // 改 URL 上的 ?q=...
    />
  )
}`

const fullExampleSnippet = `import {
  HashRouter, Routes, Route, Outlet,
  Link, NavLink, useParams, useNavigate,
} from 'react-router-dom'

// ---- 公共布局：顶栏 + 内容出口 ----
function Layout() {
  return (
    <div>
      <header>
        <NavLink to="/" end>首页</NavLink>
        <NavLink to="/posts">文章</NavLink>
        <NavLink to="/about">关于</NavLink>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

function Home() { return <h1>欢迎</h1> }
function About() { return <h1>关于我们</h1> }

function PostList() {
  return (
    <ul>
      <li><Link to="/posts/1">文章一</Link></li>
      <li><Link to="/posts/2">文章二</Link></li>
    </ul>
  )
}

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div>
      <h1>文章 #{id}</h1>
      <button onClick={() => navigate('/posts')}>返回列表</button>
    </div>
  )
}

function NotFound() { return <h1>404：页面不存在</h1> }

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 所有页面共用 Layout，内容渲染进它的 Outlet */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          {/* 文章区：列表 + 详情，详情带动态参数 */}
          <Route path="posts">
            <Route index element={<PostList />} />
            <Route path=":id" element={<PostDetail />} />
          </Route>
          {/* 兜底 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        在传统多页网站里，每次点链接都向服务器要一张新 HTML，整页白屏、重新加载。
        而 React 这类单页应用（SPA）只在首屏加载一次，之后的「翻页」全靠 JavaScript
        在浏览器里换内容。问题来了：地址栏的 URL 还能不能用？前进后退还灵不灵？链接还能不能分享？
        React Router 就是来回答这些问题的——它把<strong>URL 和组件</strong>对应起来，让 SPA
        既有「换页」的体验，又保留 URL 的全部好处。这一章讲透它的原理与日常 API。
      </Lead>

      <h2>一、SPA 路由到底要解决什么</h2>
      <p>
        先想清楚需求。一个像样的「页面」应该满足四件事，而朴素的 SPA（用一个 state
        切来切去）会把它们全弄丢：
      </p>
      <ul>
        <li><strong>不刷新整页</strong>：切视图时不重新拉 HTML、不白屏，体验顺滑。</li>
        <li><strong>URL 决定视图</strong>：地址栏是什么，屏幕上就该是什么——刷新后还在同一页。</li>
        <li><strong>前进后退可用</strong>：浏览器的后退键要能退回上一个视图，而不是退出整个应用。</li>
        <li><strong>链接可分享</strong>：把地址发给别人，对方打开看到的是同一页，而不是首页。</li>
      </ul>
      <p>
        如果只用一个 <code>useState</code> 记「当前在第几页」，那么刷新即清零、后退即离站、
        链接发出去对方只看到首页——四条全废。路由库的使命就是：<strong>让视图状态住进 URL 里</strong>，
        并和浏览器历史打通。
      </p>
      <KeyIdea>
        路由的本质是一个映射：<strong>当前 URL → 应该渲染哪个（些）组件</strong>。
        React Router 监听 URL 变化，匹配出对应组件并渲染；同时拦截站内导航，
        只改 URL 不刷新页面。URL 成了 SPA 的「单一事实来源」。
      </KeyIdea>

      <h2>二、底层基石：History API 一句话原理</h2>
      <p>
        React Router 并不是魔法，它站在浏览器原生的 <strong>History API</strong> 肩上。
        关键就两件事：<code>history.pushState</code> 能<strong>改变地址栏 URL 却不触发整页加载</strong>；
        而当用户点前进 / 后退时，浏览器抛出 <code>popstate</code> 事件，让你有机会
        「根据新的 URL 重新渲染」。把这两点接起来，就有了不刷新的可前进后退的路由。
      </p>
      <CodeBlock lang="javascript" title="History API：路由的底层原理" code={historySnippet} />
      <p>
        React Router 把这套底层封装好了：你写声明式的 <code>{'<Route>'}</code> 配置和
        <code>{'<Link>'}</code>，它在内部替你调 <code>pushState</code>、监听 <code>popstate</code>、
        做 URL 匹配。你几乎不用直接碰 History API。
      </p>

      <h2>三、两种 Router：BrowserRouter vs HashRouter</h2>
      <p>
        React Router 提供两种「路由器外壳」，区别只在于<strong>URL 长什么样、刷新时谁来处理</strong>：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>BrowserRouter</th><th>HashRouter</th></tr>
        </thead>
        <tbody>
          <tr><td>URL 形态</td><td><code>example.com/about</code></td><td><code>example.com/#/about</code></td></tr>
          <tr><td>依赖</td><td>History API（pushState）</td><td>URL 的 hash（#）片段</td></tr>
          <tr><td>刷新 /about</td><td>请求会发到服务器，需服务器把所有路径回退到 index.html</td><td>服务器只收到根路径，永不 404</td></tr>
          <tr><td>需要服务器配置</td><td>需要（fallback 重写）</td><td>不需要</td></tr>
          <tr><td>SEO / 美观</td><td>更干净，利于 SEO</td><td>带 #，不利 SEO</td></tr>
          <tr><td>适用</td><td>有服务端或托管能做 fallback 时</td><td>纯静态托管、子路径部署、嵌入第三方页面</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="jsx" title="BrowserRouter：干净 URL 的常规配置" code={basicRouterSnippet} />
      <CodeBlock lang="jsx" title="HashRouter：纯静态托管的省心选择" code={hashRouterSnippet} />
      <Callout variant="info" title="我们这个站为什么用 HashRouter">
        本教学站是<strong>纯前端、静态托管</strong>的：没有后端，也没法给每条路径配
        fallback 重写规则。如果用 BrowserRouter，用户直接刷新 <code>/courses/react</code>
        这种深层地址，服务器找不到对应文件就会返回 404。HashRouter 把路由放进
        <code>#</code> 后面，服务器永远只看到根路径请求，所以无论刷新哪一页都稳。
        这就是 App 套壳选 HashRouter 的现实原因——拿确定性换那个 #。
      </Callout>

      <h2>四、配置路由：Routes / Route 与导航 Link / NavLink</h2>
      <p>
        <code>{'<Routes>'}</code> 是一组路由的容器，它会在内部所有 <code>{'<Route>'}</code> 里
        挑出<strong>第一个最匹配当前 URL</strong>的来渲染。每个 <code>{'<Route>'}</code> 用
        <code>path</code> 声明匹配规则，用 <code>element</code> 指定命中后渲染什么组件。
      </p>
      <p>
        导航不要用 <code>{'<a href>'}</code>——那会触发整页刷新，前功尽弃。要用
        <code>{'<Link to>'}</code>，它在底层调 <code>pushState</code>，只改 URL 不刷新。
        需要「高亮当前页」时用 <code>{'<NavLink>'}</code>，它会告诉你自己是否处于激活态。
      </p>
      <CodeBlock lang="jsx" title="NavLink：自带激活状态的导航" code={navLinkSnippet} />
      <Callout variant="warn" title="别用裸 a 标签做站内跳转">
        站内导航若写成 <code>{'<a href="/about">'}</code>，点击会让浏览器向服务器要新页面，
        整页重载，React 应用从头初始化，所有内存状态清空。站内一律用
        <code>{'<Link>'}</code> / <code>{'<NavLink>'}</code>；只有跳到<strong>外站</strong>时才用
        <code>{'<a>'}</code>。
      </Callout>

      <h2>五、嵌套路由与 Outlet</h2>
      <p>
        真实应用里页面常有公共外壳：顶栏、侧边栏、面包屑不变，只有中间内容随路由切换。
        React Router 用<strong>嵌套路由</strong>表达这种「布局套内容」的关系：父路由提供布局，
        在布局里放一个 <code>{'<Outlet />'}</code> 作为「子内容的出口」，匹配到的子路由就渲染进去。
      </p>
      <CodeBlock lang="jsx" title="嵌套路由 + Outlet：布局复用" code={nestedSnippet} />
      <p>
        注意两点：① 子路由的 <code>path</code> 写<strong>相对路径</strong>（如 <code>settings</code>），
        最终地址是父路径拼上来的 <code>/dashboard/settings</code>；② 当 URL 精确等于父路径
        <code>/dashboard</code> 时，没有子路径可匹配，这时由 <strong>index 路由</strong>顶上。
      </p>

      <h3>index 路由：父路径的默认内容</h3>
      <p>
        <code>{'<Route index element={...} />'}</code> 没有 <code>path</code>，它表示
        「当父路由被精确匹配、且没有更具体的子路由命中时，渲染我」。可以理解成<strong>这个布局的
        首页 / 默认页</strong>。每个有 <code>{'<Outlet />'}</code> 的父路由通常都该配一个 index，
        否则进父路径时 Outlet 里是空的。
      </p>

      <h2>六、动态参数 :id 与 useParams</h2>
      <p>
        文章详情、用户主页这类页面，URL 里有一段是变量。用 <code>:</code> 开头声明
        <strong>动态段</strong>：<code>path="/posts/:id"</code> 能匹配 <code>/posts/42</code>、
        <code>/posts/99</code>……组件里用 <code>useParams()</code> 读出这个值。
      </p>
      <CodeBlock lang="jsx" title="动态参数 :id + useParams" code={paramsSnippet} />
      <p>
        <code>useParams()</code> 返回一个对象，键名就是路径里 <code>:</code> 后面的名字。
        想要多个参数就写多个段，如 <code>path="/users/:userId/posts/:postId"</code>，
        读出来就是 <code>{'{ userId, postId }'}</code>。
      </p>

      <h2>七、编程式导航与 URL 信息：三个常用 Hook</h2>
      <p>
        除了点链接，很多跳转发生在逻辑里——登录成功后去仪表盘、提交后回列表。这时用
        <code>useNavigate()</code> 拿到一个 <code>navigate</code> 函数手动跳。配套的还有
        <code>useLocation()</code>（读当前地址信息）和 <code>useSearchParams()</code>
        （读写 <code>?key=value</code> 查询串）。
      </p>
      <CodeBlock lang="jsx" title="useNavigate / useLocation / useSearchParams" code={navigateSnippet} />
      <table>
        <thead>
          <tr><th>Hook</th><th>作用</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td><code>useNavigate</code></td><td>返回 navigate 函数，编程式跳转</td><td>登录后跳转、提交后返回、navigate(-1) 后退</td></tr>
          <tr><td><code>useLocation</code></td><td>读当前 location（pathname / search / state）</td><td>记录来源页、根据路径做埋点</td></tr>
          <tr><td><code>useSearchParams</code></td><td>读写查询字符串</td><td>搜索关键词、分页页码、筛选条件</td></tr>
          <tr><td><code>useParams</code></td><td>读路径动态段</td><td>详情页拿 id</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="查询串 vs 路径参数怎么选">
        语义上「定位唯一资源」用<strong>路径参数</strong>（<code>/posts/42</code>），
        「对一个列表做筛选 / 排序 / 分页」用<strong>查询串</strong>（<code>/posts?tag=react&page=2</code>）。
        查询串放进 URL 的好处是：用户可以把「筛选后的结果」当链接分享出去。
      </Callout>

      <h2>八、404：通配 path="*"</h2>
      <p>
        当所有具体路由都没命中，需要一个兜底页。用 <code>path="*"</code> 匹配任意未匹配的 URL，
        通常放在 <code>{'<Routes>'}</code> 最后，渲染一个 404 组件。它也常用在嵌套布局里，
        让「未知子路径」也落在同一套外壳内。
      </p>

      <h2>九、综合示例：多页 + 嵌套布局</h2>
      <p>
        把前面所有概念串起来——HashRouter 外壳、公共 Layout + Outlet、index 默认页、
        文章列表与详情的嵌套、动态参数、编程式返回、404 兜底——就是一个能直接跑的小应用：
      </p>
      <CodeBlock lang="jsx" title="可运行示例：多页 + 嵌套 + 动态参数" code={fullExampleSnippet} />
      <Example title="读懂这个路由表的匹配过程">
        <p>
          访问 <code>/#/</code>：匹配 Layout，再由 index 渲染 Home。
        </p>
        <p>
          访问 <code>/#/posts</code>：匹配 Layout 下的 posts，其 index 渲染 PostList。
        </p>
        <p>
          访问 <code>/#/posts/2</code>：匹配 Layout → posts → <code>:id</code>，
          PostDetail 用 <code>useParams</code> 读到 id 为 2。
        </p>
        <p>
          访问 <code>/#/xyz</code>：前面都没命中，落到 <code>path="*"</code>，渲染 NotFound。
        </p>
      </Example>

      <h2>十、小结与边界</h2>
      <p>
        这一章覆盖的是 React Router 的「声明式路由」核心：URL 与组件的映射、不刷新的导航、
        嵌套布局、参数与编程式跳转。它够你搭出绝大多数前端站点的页面结构。但还有一块更进阶的能力
        我们留到下一章——<strong>数据路由</strong>：在进入页面前就把数据取好、用 loader/action
        统一管理数据流，以及路由级的代码分割。
      </p>
      <Callout variant="tip">
        下一章进入 v6.4+ 引入的 Data Router：<code>createBrowserRouter</code> + <code>RouterProvider</code>，
        把「取数」「提交」「报错」「懒加载」都收进路由配置，让组件更专注于渲染。
      </Callout>

      <Summary
        points={[
          'SPA 路由要同时满足四件事：不刷新整页、URL 决定视图、前进后退可用、链接可分享；本质是 URL → 组件 的映射。',
          'React Router 站在浏览器 History API 之上：pushState 改 URL 不刷新，popstate 监听前进后退后重新渲染。',
          'BrowserRouter 给干净 URL 但刷新深层路径需服务器 fallback；HashRouter 把路由放进 # 后，纯静态托管刷新不 404——本站正因如此用 HashRouter。',
          'Routes 挑最匹配的 Route 渲染；站内导航用 Link / NavLink（绝不用裸 a），NavLink 自带 isActive 高亮。',
          '嵌套路由用父布局 + Outlet 复用外壳，index 路由当父路径的默认页；动态段 :id 配 useParams 读取。',
          '编程式导航用 useNavigate；useLocation 读地址、useSearchParams 读写查询串；path="*" 兜底做 404。',
        ]}
      />
    </article>
  )
}
