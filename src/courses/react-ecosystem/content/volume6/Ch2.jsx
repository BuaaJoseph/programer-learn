import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const oldWaySnippet = `// 老套路：组件挂载后才在 useEffect 里取数
function PostDetail() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/posts/' + id)
      .then((r) => r.json())
      .then(setPost)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p>加载中...</p>
  return <h1>{post.title}</h1>
}
// 问题：先渲染空壳 → 再发请求 → 再渲染内容，出现「闪一下」的瀑布流`

const dataRouterSnippet = `import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Data Router：把路由配置写成一个数据结构（数组），而不是 JSX 树
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'posts/:id',
        element: <PostDetail />,
        // loader：进入这个路由「之前」就去取数
        loader: async ({ params }) => {
          const res = await fetch('/api/posts/' + params.id)
          if (!res.ok) throw new Response('未找到', { status: 404 })
          return res.json()
        },
      },
    ],
  },
])

// 用 RouterProvider 挂载，而不是 <BrowserRouter>
function App() {
  return <RouterProvider router={router} />
}`

const useLoaderSnippet = `import { useLoaderData } from 'react-router-dom'

// 组件不再自己 fetch，进来时数据已经备好
function PostDetail() {
  const post = useLoaderData()  // 直接拿到 loader 返回的数据
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
// 没有 loading 闪屏：导航时框架会等 loader 完成再切换视图`

const actionSnippet = `import { Form, redirect, useNavigation } from 'react-router-dom'

// action：处理表单「写」操作（新增 / 编辑 / 删除）
const newPostRoute = {
  path: 'posts/new',
  element: <NewPost />,
  action: async ({ request }) => {
    // request 是标准 Request，formData() 拿到提交的字段
    const form = await request.formData()
    const title = form.get('title')
    const res = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    const created = await res.json()
    // 提交成功后重定向到详情页
    return redirect('/posts/' + created.id)
  },
}

function NewPost() {
  const nav = useNavigation()  // 读取导航 / 提交状态
  const submitting = nav.state === 'submitting'
  return (
    // 用 React Router 的 <Form>，提交会触发同路径的 action，而非整页刷新
    <Form method="post">
      <input name="title" placeholder="标题" />
      <button disabled={submitting}>{submitting ? '提交中...' : '发布'}</button>
    </Form>
  )
}`

const errorSnippet = `import { useRouteError, isRouteErrorResponse } from 'react-router-dom'

// loader / action 里抛出的错误，会被最近的 errorElement 捕获
const route = {
  path: 'posts/:id',
  element: <PostDetail />,
  loader: postLoader,
  errorElement: <PostError />,  // loader 抛错时渲染它，而不是让整个应用崩
}

function PostError() {
  const error = useRouteError()  // 拿到抛出的错误对象
  // 区分「HTTP 响应式错误」和「真正的 JS 异常」
  if (isRouteErrorResponse(error)) {
    return <h1>{error.status} —— {error.statusText}</h1>
  }
  return <h1>出错了：{error.message}</h1>
}`

const deferSnippet = `import { Suspense } from 'react'
import { useLoaderData, Await, defer } from 'react-router-dom'

// defer：让慢数据「流式」返回——快数据先到先渲染，慢数据用占位符等
const route = {
  path: 'dashboard',
  loader: () => {
    return defer({
      user: getUser(),            // 快，await 等它
      stats: getStatsSlow(),      // 慢，先不 await，作为 Promise 透传
    })
  },
  element: <Dashboard />,
}

function Dashboard() {
  const { user, stats } = useLoaderData()
  return (
    <div>
      <h1>{user.name}</h1>
      {/* Await 配合 Suspense：stats 到了再渲染，没到时显示 fallback */}
      <Suspense fallback={<p>统计加载中...</p>}>
        <Await resolve={stats}>{(s) => <Stats data={s} />}</Await>
      </Suspense>
    </div>
  )
}`

const lazySnippet = `// 路由级 lazy：把某个路由的组件 + loader + action 拆成独立代码块，按需加载
const router = createBrowserRouter([
  {
    path: '/dashboard',
    // lazy 返回一个动态 import，命中该路由时才下载这块代码
    lazy: () => import('./routes/dashboard.jsx'),
  },
])

// ./routes/dashboard.jsx —— 导出约定的字段，框架会自动接上
export function loader({ params }) {
  return fetchDashboard()
}
export function action({ request }) {
  return saveDashboard(request)
}
// 注意：约定导出名为 Component（而非 default），框架用它当 element
export function Component() {
  const data = useLoaderData()
  return <DashboardView data={data} />
}`

const fullRouteSnippet = `import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// 一张带 loader + action + lazy 的完整路由表
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RootError />,        // 全局兜底：任何子路由抛错都能接住
    children: [
      { index: true, element: <Home /> },

      // 文章列表：进入前 loader 取数
      {
        path: 'posts',
        element: <PostList />,
        loader: async () => fetch('/api/posts').then((r) => r.json()),
      },

      // 文章详情：动态参数 + loader + 局部 errorElement
      {
        path: 'posts/:id',
        element: <PostDetail />,
        loader: async ({ params }) => {
          const res = await fetch('/api/posts/' + params.id)
          if (!res.ok) throw new Response('Not Found', { status: 404 })
          return res.json()
        },
        errorElement: <PostError />,
      },

      // 新建文章：action 处理 <Form> 提交
      {
        path: 'posts/new',
        element: <NewPost />,
        action: async ({ request }) => {
          const form = await request.formData()
          await fetch('/api/posts', { method: 'POST', body: form })
          return redirect('/posts')
        },
      },

      // 重型后台：路由级 lazy 做代码分割，命中才下载
      {
        path: 'admin',
        lazy: () => import('./routes/admin.jsx'),
      },

      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们用 <code>{'<Routes>'}</code> / <code>{'<Route>'}</code> 把 URL 映射到了组件。
        但「取数据」这件事还散落在各个组件的 <code>useEffect</code> 里：先渲染空壳、再发请求、
        再补上内容，到处是 loading 闪屏。React Router 从 v6.4 起引入了
        <strong>数据路由（Data Router）</strong>，把取数、表单提交、报错、懒加载统统收进路由配置。
        这一章讲透 loader / action / errorElement / defer / lazy 这套数据 API，
        以及它和 Remix、Next 等框架的关系。
      </Lead>

      <h2>一、痛点：取数为什么不该写在 useEffect 里</h2>
      <p>
        在传统写法里，组件得先挂载、再在 <code>useEffect</code> 里 fetch。结果是一条
        <strong>渲染瀑布流</strong>：空壳 → loading → 数据。每进一个页面都闪一下；
        嵌套组件各自取数时，瀑布层层叠加，体验更糟。
      </p>
      <CodeBlock lang="jsx" title="老套路：useEffect 里取数的瀑布流" code={oldWaySnippet} />
      <KeyIdea>
        Data Router 的核心思路是<strong>「先取数，后渲染」</strong>：把取数提前到
        「进入路由之前」。导航被点击时，框架先跑该路由的 loader，等数据就绪再切换视图，
        组件一挂载就能直接拿到数据，没有空壳闪屏。
      </KeyIdea>

      <h2>二、Data Router：createBrowserRouter + RouterProvider</h2>
      <p>
        要用上这套能力，得换一种声明路由的方式。不再用 JSX 包 <code>{'<BrowserRouter>'}</code>，
        而是用 <code>createBrowserRouter</code> 把路由写成<strong>一个数据结构（对象数组）</strong>，
        再用 <code>{'<RouterProvider router={router} />'}</code> 挂载。正因为路由是数据，框架才能在
        渲染前就「读懂」每条路由挂了哪个 loader、要不要懒加载。
      </p>
      <CodeBlock lang="jsx" title="createBrowserRouter：把路由写成数据" code={dataRouterSnippet} />
      <Callout variant="info" title="为什么必须是数据形态">
        声明式 <code>{'<Routes>'}</code> 是 JSX，框架要等组件渲染时才知道路由长什么样，
        没法在导航前预先取数。<code>createBrowserRouter</code> 接收的是普通对象数组，
        框架在任何渲染之前就拥有完整路由图，于是能做「进页面前先跑 loader」这类提前调度。
      </Callout>

      <h2>三、loader：进入路由前取数，useLoaderData 读取</h2>
      <p>
        <code>loader</code> 是挂在路由上的<strong>取数函数</strong>。导航到该路由时，框架先 await 它，
        拿到的返回值就成了这条路由的数据。组件里用 <code>useLoaderData()</code> 直接读，
        不再需要自己 fetch、不再需要 loading 分支。loader 收到的参数里有
        <code>params</code>（路径动态段）和 <code>request</code>（标准 Request，可读查询串）。
      </p>
      <CodeBlock lang="jsx" title="useLoaderData：组件直接拿数据" code={useLoaderSnippet} />
      <p>
        想给「正在导航、数据还没到」一个反馈？用 <code>useNavigation()</code> 读全局导航状态
        （<code>idle</code> / <code>loading</code> / <code>submitting</code>），在布局层显示一条进度条即可，
        不必每个组件各写一套 loading。
      </p>

      <h2>四、action 与 Form：处理表单提交</h2>
      <p>
        loader 管「读」，<code>action</code> 管「写」——新增、编辑、删除。配套的是 React Router 的
        <code>{'<Form>'}</code> 组件：它长得像原生表单，但提交时不会整页刷新，而是触发
        <strong>同路径的 action</strong>。action 收到标准 <code>Request</code>，用
        <code>request.formData()</code> 取字段，处理完常用 <code>redirect()</code> 跳转。
        提交完成后，框架还会<strong>自动重新跑相关 loader</strong>，让列表等数据保持最新。
      </p>
      <CodeBlock lang="jsx" title="action + Form：声明式的表单写操作" code={actionSnippet} />
      <table>
        <thead>
          <tr><th>能力</th><th>loader</th><th>action</th></tr>
        </thead>
        <tbody>
          <tr><td>方向</td><td>读（GET 语义）</td><td>写（POST / PUT / DELETE 语义）</td></tr>
          <tr><td>触发时机</td><td>进入路由前自动触发</td><td>提交 Form 或调 submit 时触发</td></tr>
          <tr><td>读取数据</td><td><code>useLoaderData()</code></td><td><code>useActionData()</code></td></tr>
          <tr><td>提交后</td><td>—</td><td>自动重跑相关 loader，刷新数据</td></tr>
        </tbody>
      </table>

      <h2>五、errorElement 与 useRouteError：路由级错误边界</h2>
      <p>
        loader / action 里抛出的错误，不该让整个应用白屏。给路由配
        <code>errorElement</code>，抛错时就渲染它，而不是正常的 <code>element</code>。
        错误组件里用 <code>useRouteError()</code> 拿到错误对象，并用
        <code>isRouteErrorResponse()</code> 区分「抛出的 Response（如 404）」和「真正的 JS 异常」。
        错误会<strong>冒泡</strong>到最近的 errorElement，所以在根路由放一个就能全局兜底。
      </p>
      <CodeBlock lang="jsx" title="errorElement + useRouteError：优雅报错" code={errorSnippet} />
      <Callout variant="warn" title="抛 Response 还是抛 Error">
        在 loader 里遇到「资源不存在」这类业务情况，推荐 <code>throw new Response(..., {'{ status: 404 }'})</code>，
        这样 <code>isRouteErrorResponse</code> 能识别成 HTTP 式错误并读到 status；
        而代码 bug 抛出的普通 <code>Error</code> 走另一分支。两者分开处理，错误页才能给出贴切提示。
      </Callout>

      <h2>六、defer / Await：慢数据流式返回</h2>
      <p>
        如果一个页面里既有快数据（用户信息）又有慢数据（统计报表），全等齐再渲染就太慢。
        <code>defer()</code> 让你把慢数据当 Promise <strong>透传</strong>而不 await：快数据先渲染，
        慢数据用 <code>{'<Await>'}</code> 包起来配合 <code>{'<Suspense>'}</code>，到了再补上、
        没到时显示占位符。一句话：<strong>关键内容秒开，次要内容流式补齐</strong>。
      </p>
      <CodeBlock lang="jsx" title="defer + Await：流式数据" code={deferSnippet} />

      <h2>七、路由级 lazy：按需加载，做代码分割</h2>
      <p>
        把所有页面的代码塞进一个大 bundle，首屏会很重。<code>route.lazy</code> 让你给路由配一个
        <strong>动态 import</strong>：只有当用户真正导航到该路由时，才下载这块代码（含它的组件、
        loader、action）。重型后台、低频页面用它，能显著减小首屏体积。
      </p>
      <CodeBlock lang="jsx" title="route.lazy：路由级代码分割" code={lazySnippet} />
      <Callout variant="info" title="与 r8 懒加载呼应">
        这正是后面 r8 卷讲的「懒加载 / 代码分割」在路由层的落地。组件级你会用
        <code>React.lazy</code> + <code>{'<Suspense>'}</code> 拆单个组件；路由级则用
        <code>route.lazy</code> 拆「整页连带它的数据逻辑」。两者都基于打包器的动态
        <code>import()</code> 切分代码块，只是切分的粒度不同——路由级往往是性价比最高的第一刀。
      </Callout>

      <h2>八、综合示例：带 loader + action + lazy 的路由表</h2>
      <p>
        把读、写、报错、分割都放进一张表里，就是一个生产味道的路由配置：
      </p>
      <CodeBlock lang="jsx" title="完整路由表：loader + action + errorElement + lazy" code={fullRouteSnippet} />
      <Example title="跟着一次操作走一遍数据流">
        <p>
          用户点进 <code>/posts/2</code>：框架先跑该路由 loader 去 <code>/api/posts/2</code> 取数；
          若返回 404，loader 抛 Response，被 <code>PostError</code> 接住；正常则数据就绪后
          渲染 PostDetail，组件里 <code>useLoaderData()</code> 直接拿到文章。
        </p>
        <p>
          用户在 <code>/posts/new</code> 提交 Form：触发该路由 action，POST 到后端，
          成功后 <code>redirect('/posts')</code>，框架顺带重跑 posts 的 loader，列表立刻含新文章。
        </p>
        <p>
          用户首次点进 <code>/admin</code>：此时才下载 admin 那块代码（lazy），不拖慢首屏。
        </p>
      </Example>

      <h2>九、与框架的关系：Remix / React Router 框架模式 / Next</h2>
      <p>
        loader / action 这套设计并非凭空而来——它源自 <strong>Remix</strong>（同一个团队的全栈框架），
        后来被吸收进 React Router。在 React Router v7 里，库本身又长出了「框架模式」，
        和 Remix 进一步融合，能做服务端渲染、嵌套数据加载等。
      </p>
      <p>
        而 <strong>Next.js</strong> 走的是另一条路：App Router 里用服务端组件 + <code>async</code>
        组件直接在服务端取数，约定式文件路由。两者目标相近（取数贴近路由、减少瀑布流），
        但落点不同——React Router 的 Data Router 主打<strong>纯客户端也能用的数据路由</strong>，
        而 Next / Remix 把取数推到了服务端。本卷我们聚焦纯前端，所以用 Data Router 这一侧。
      </p>

      <h2>十、小结</h2>
      <p>
        Data Router 把「数据」抬到了和「路由」同等的位置：进页面前 loader 取好数、Form 提交走
        action、出错有 errorElement 兜底、慢数据用 defer 流式补齐、重型页用 lazy 按需加载。
        组件因此回归本职——专心渲染。至此 r6 卷的路由两章就齐了：第一章解决「URL 映射组件」，
        这一章解决「路由层面管数据」。
      </p>

      <Summary
        points={[
          'Data Router 用 createBrowserRouter（路由写成数据）+ RouterProvider 挂载，换来「先取数后渲染」的能力，消除 useEffect 取数的瀑布流闪屏。',
          'loader 在进入路由前取数，组件用 useLoaderData 直接读，无需自写 fetch 与 loading 分支；useNavigation 读全局导航状态。',
          'action 配 <Form> 处理写操作，用 request.formData 取字段、redirect 跳转，提交后框架自动重跑相关 loader 刷新数据。',
          'errorElement + useRouteError 做路由级错误边界，isRouteErrorResponse 区分 HTTP 响应错误与 JS 异常，错误冒泡到最近的 errorElement。',
          'defer + Await + Suspense 让慢数据流式返回，快内容先渲染；route.lazy 做路由级代码分割，命中才下载该页代码，与 r8 懒加载呼应。',
          'loader/action 源自 Remix，已并入 React Router（v7 有框架模式）；Next App Router 走服务端取数的另一条路，本卷聚焦纯前端的 Data Router。',
        ]}
      />
    </article>
  )
}
