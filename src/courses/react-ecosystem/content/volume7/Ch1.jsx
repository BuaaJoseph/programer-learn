import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const naiveFetchSnippet = `import { useState, useEffect } from 'react'

function TodoList() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false          // 用来防竞态：组件卸载或依赖变了就丢弃旧结果
    setLoading(true)
    setError(null)
    fetch('/api/todos')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setTodos(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true             // 清理：标记这次请求作废
    }
  }, [])                           // 依赖数组：决定何时重新发请求

  if (loading) return <p>加载中…</p>
  if (error) return <p>出错了：{error.message}</p>
  return <ul>{todos.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
}`

const providerSnippet = `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 整个应用共用一个 QueryClient：它持有缓存、配置、订阅等全部状态
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 数据 30 秒内视为「新鲜」，不会后台重取
      gcTime: 5 * 60 * 1000,       // 无人使用后，缓存再保留 5 分钟才被回收
      retry: 2,                    // 失败自动重试 2 次（指数退避）
      refetchOnWindowFocus: true,  // 窗口重新聚焦时后台重取（默认开启）
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoPage />
    </QueryClientProvider>
  )
}`

const useQuerySnippet = `import { useQuery } from '@tanstack/react-query'

async function fetchTodos() {
  const res = await fetch('/api/todos')
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

function TodoList() {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['todos'],           // 缓存的唯一身份证：同 key 共享同一份数据
    queryFn: fetchTodos,           // 怎么取这份数据（返回 Promise）
  })

  if (isPending) return <p>加载中…</p>
  if (isError) return <p>出错了：{error.message}</p>

  return (
    <ul>
      {/* isFetching 表示正在后台悄悄重取，可用它显示一个小转圈 */}
      {isFetching && <li>同步中…</li>}
      {data.map((t) => <li key={t.id}>{t.title}</li>)}
    </ul>
  )
}`

const useMutationSnippet = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function AddTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (title) =>
      fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }).then((res) => res.json()),
    onSuccess: () => {
      // 提交成功后让 ['todos'] 缓存失效 -> 触发自动重取，列表立刻刷新
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <button
      disabled={mutation.isPending}
      onClick={() => mutation.mutate('写一篇笔记')}
    >
      {mutation.isPending ? '提交中…' : '新增待办'}
    </button>
  )
}`

const optimisticSnippet = `// 乐观更新：先假设会成功，立刻改本地缓存；失败再回滚
const mutation = useMutation({
  mutationFn: (title) => createTodo(title),
  onMutate: async (title) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const prev = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) => [
      ...old,
      { id: 'tmp', title },        // 先塞一条临时数据，UI 瞬间响应
    ])
    return { prev }                // 把旧值传给 onError 以便回滚
  },
  onError: (err, title, ctx) => {
    queryClient.setQueryData(['todos'], ctx.prev)  // 回滚
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })  // 最终对齐服务端
  },
})`

const infiniteSnippet = `import { useInfiniteQuery } from '@tanstack/react-query'

const query = useInfiniteQuery({
  queryKey: ['todos', 'infinite'],
  queryFn: ({ pageParam }) => fetchTodoPage(pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})
// query.fetchNextPage() 加载下一页；query.hasNextPage 判断还有没有更多`

export default function Ch1() {
  return (
    <article>
      <Lead>
        在 React 里，我们最熟悉的是用 <code>useState</code> 管理一段本地状态。但当数据来自服务器——
        一个 API 返回的待办列表、用户资料、商品库存——情况就完全不同了。这种「服务端状态」是远端的、
        异步的、会过期的、还可能被页面里好几个组件同时用到。这一章我们先看清手写
        <code>useEffect + fetch</code> 到底要操心多少事，再引入 TanStack Query（也就是大家熟知的 React Query），
        看它如何把这些苦活儿一次性接管。
      </Lead>

      <h2>一、服务端状态：它和普通 state 不是一回事</h2>
      <p>
        很多初学者把「从后端取来的数据」当成普通组件状态来管，用一个 <code>useState</code> 存住就完事。
        但服务端状态有一组本地状态完全没有的特性，正是这些特性让它难管：
      </p>
      <ul>
        <li><strong>远端拥有</strong>：真正的数据源在服务器上，你手里的只是一份<em>副本</em>。</li>
        <li><strong>异步获取</strong>：拿数据要走网络，天然有加载中、成功、失败三种状态。</li>
        <li><strong>会过期</strong>：你这份副本随时可能和服务器对不上——别人改了、你自己提交了。</li>
        <li><strong>可被共享</strong>：同一份用户资料，导航栏、侧边栏、详情页可能都要用。</li>
        <li><strong>需要同步</strong>：什么时候该重新拉一遍？聚焦窗口时？切回页面时？提交之后？</li>
      </ul>
      <KeyIdea>
        客户端状态（一个开关、一个输入框的值）由你的应用<strong>完全拥有且同步</strong>；
        服务端状态只是远端真相的一份<strong>异步缓存副本</strong>。把后者当前者管，你就被迫手动处理
        加载、错误、竞态、缓存、重试、去重、失效——而这正是一个数据请求库该替你做的事。
      </KeyIdea>

      <h2>二、手写 useEffect + fetch 的真实代价</h2>
      <p>
        先看一段「正确」的手写取数代码。注意它为了不出 bug，已经塞进了多少额外逻辑：
      </p>
      <CodeBlock lang="jsx" title="一个尽力做对的 useEffect 取数" code={naiveFetchSnippet} />
      <p>
        即便写到这个程度，它<strong>仍然只解决了最基本的问题</strong>。下面这些需求，每一个都得你自己再补：
      </p>
      <ul>
        <li><strong>缓存</strong>：换页面再回来，又从头转圈加载一次，体验割裂。</li>
        <li><strong>去重</strong>：三个组件同时要 <code>/api/todos</code>，就发三次相同请求。</li>
        <li><strong>后台重取</strong>：用户切回标签页时，怎么悄悄刷新成最新数据？</li>
        <li><strong>重试</strong>：网络抖动失败了，要不要自动退避重试几次？</li>
        <li><strong>失效</strong>：提交了一条新待办，列表怎么自动跟着更新？</li>
        <li><strong>竞态</strong>：上面那个 <code>cancelled</code> 标志，漏写一个就会出现旧数据覆盖新数据。</li>
      </ul>
      <Callout variant="warn" title="它不是「写不出来」，而是「到处都要重写」">
        这些逻辑你当然写得出来，问题是<strong>每个取数的地方都得重写一遍</strong>，而且容易写漏、写错。
        服务端状态管理的复杂度不在单点，而在它散落在整个应用里、反复出现。
      </Callout>

      <h2>三、TanStack Query 登场</h2>
      <p>
        TanStack Query（前身即 React Query，现在是跨框架的 TanStack 家族成员）就是专门管服务端状态的库。
        它的思路很直接：你只负责告诉它<strong>「这份数据叫什么、怎么取」</strong>，缓存、去重、重取、重试、
        失效这些全交给它。三个核心拼图是 <code>QueryClient</code>、<code>useQuery</code>、<code>useMutation</code>。
      </p>

      <h3>3.1 QueryClient 与 Provider</h3>
      <p>
        一切从一个 <code>QueryClient</code> 开始——它是整个缓存的大脑，用
        <code>QueryClientProvider</code> 包在应用顶层，下面所有组件就都能用上 Query 的 hooks 了。
      </p>
      <CodeBlock lang="jsx" title="搭好 QueryClient 与 Provider" code={providerSnippet} />

      <h3>3.2 useQuery：声明式地「读」数据</h3>
      <p>
        取数据用 <code>useQuery</code>。你给它两样东西：<code>queryKey</code>（这份数据的唯一身份证）
        和 <code>queryFn</code>（一个返回 Promise 的取数函数）。它回给你 <code>data</code>、
        <code>isPending</code>、<code>isError</code> 等一整套状态——加载、错误、竞态都不用你管了。
      </p>
      <CodeBlock lang="jsx" title="useQuery 取待办列表" code={useQuerySnippet} />
      <Example title="queryKey 为什么这么重要">
        <p>
          <code>queryKey</code> 是缓存的索引。<code>{"['todos']"}</code> 对应整张列表；
          <code>{"['todo', 5]"}</code> 对应 id 为 5 的那条。<strong>同一个 key 在任意多个组件里使用，
          共享的是同一份缓存、同一次请求</strong>——这就是去重的来源。换 key 即换一份独立的数据。
        </p>
      </Example>

      <h3>3.3 staleTime vs gcTime：两个最常被搞混的概念</h3>
      <p>
        这是 TanStack Query 里最值得讲清楚的一对参数。一句话区分：
        <strong><code>staleTime</code> 管「要不要重取」，<code>gcTime</code> 管「缓存留多久」</strong>。
      </p>
      <table>
        <thead>
          <tr><th>概念</th><th>含义</th><th>过了这段时间会怎样</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>staleTime</code></td>
            <td>数据被视为「新鲜」的时长（默认 0）</td>
            <td>变「陈旧」；下次触发条件（重新挂载 / 聚焦窗口）时会<strong>后台重取</strong></td>
          </tr>
          <tr>
            <td><code>gcTime</code></td>
            <td>无组件使用后缓存的保留时长（默认 5 分钟）</td>
            <td>缓存被<strong>垃圾回收</strong>，彻底从内存里清掉</td>
          </tr>
        </tbody>
      </table>
      <p>
        直觉理解：<code>staleTime</code> 内的数据「足够新」，直接用缓存、连后台请求都省了；超过它，
        数据仍然<strong>立刻显示</strong>（不会变空白），但 Query 会在后台悄悄拉一遍最新的，
        拿到后再无感替换——这就是「先看旧的，再静默更新」的体验。<code>gcTime</code> 则是数据没人用了之后，
        缓存还能在内存里待多久，方便你很快切回来时秒开。
      </p>

      <h3>3.4 自动重取、窗口聚焦、去重</h3>
      <p>
        装好之后，下面这些行为<strong>默认就有，不用写一行额外代码</strong>：
      </p>
      <ul>
        <li><strong>窗口聚焦重取</strong>：你切去别的标签页再切回来，Query 自动后台刷新陈旧数据。</li>
        <li><strong>重新挂载重取</strong>：组件卸载又装回来，若数据已陈旧也会后台重取。</li>
        <li><strong>请求去重</strong>：同一时刻多个组件请求同一个 key，只发一次真实请求。</li>
        <li><strong>自动重试</strong>：失败按配置（默认重试若干次，指数退避）自动再试。</li>
      </ul>

      <h3>3.5 useMutation：声明式地「写」数据</h3>
      <p>
        读用 <code>useQuery</code>，写（增删改）用 <code>useMutation</code>。它不自动执行，
        而是给你一个 <code>mutate</code> 函数让你在事件里手动触发，并提供
        <code>onSuccess</code> / <code>onError</code> 等回调。提交成功后最经典的动作就是
        调 <code>invalidateQueries</code> 让相关查询失效，从而触发自动重取、刷新界面。
      </p>
      <CodeBlock lang="jsx" title="useMutation 新增待办 + 失效重取" code={useMutationSnippet} />
      <KeyIdea>
        <code>invalidateQueries({"{ queryKey: ['todos'] }"})</code> 是连接「写」和「读」的桥：
        你提交完不必手动去改本地数组，只要告诉 Query「这份数据脏了」，它就会自动重取并更新所有用到它的组件。
        这就是服务端状态「以服务器为准」的正确姿势。
      </KeyIdea>

      <h2>四、进阶一瞥：乐观更新与分页</h2>
      <p>
        默认的「提交 → 失效 → 重取」已经够用，但有两类需求值得知道它们的名字，细节留待实战深挖。
      </p>
      <h3>乐观更新（optimistic update）</h3>
      <p>
        一句话：<strong>先假设会成功，立刻更新本地缓存让 UI 秒响应，万一失败再回滚</strong>。
        适合点赞、勾选待办这类高频且大概率成功的操作。
      </p>
      <CodeBlock lang="jsx" title="乐观更新骨架（onMutate / onError / onSettled）" code={optimisticSnippet} />
      <h3>分页与无限滚动</h3>
      <p>
        一句话：分页把页码放进 <code>queryKey</code> 即可，每页是独立缓存；无限滚动用
        <code>useInfiniteQuery</code>，它内置「下一页游标」管理，配合 <code>fetchNextPage</code> 即可不断加载。
      </p>
      <CodeBlock lang="jsx" title="useInfiniteQuery 骨架" code={infiniteSnippet} />

      <h2>五、对比：手写 useEffect vs TanStack Query</h2>
      <p>
        把前面散落的点汇成一张表，能最直观地看出差距——左边每一项都是你要亲手写且容易写错的，
        右边几乎都是开箱即得。
      </p>
      <table>
        <thead>
          <tr><th>能力</th><th>手写 useEffect + fetch</th><th>TanStack Query</th></tr>
        </thead>
        <tbody>
          <tr><td>加载 / 错误状态</td><td>手动维护多个 <code>useState</code></td><td>内置 <code>isPending</code> / <code>isError</code></td></tr>
          <tr><td>竞态处理</td><td>手写 <code>cancelled</code> 标志，易漏</td><td>自动处理</td></tr>
          <tr><td>缓存</td><td>没有，切走再回从头加载</td><td>内置，按 <code>queryKey</code> 缓存</td></tr>
          <tr><td>请求去重</td><td>无，重复发请求</td><td>自动去重</td></tr>
          <tr><td>后台 / 聚焦重取</td><td>自己监听事件实现</td><td>默认开启</td></tr>
          <tr><td>失败重试</td><td>自己写退避逻辑</td><td>内置可配</td></tr>
          <tr><td>失效与刷新</td><td>手动改本地数组或重新 fetch</td><td><code>invalidateQueries</code> 一行</td></tr>
          <tr><td>乐观更新 / 分页</td><td>从零造</td><td>内置模式与 <code>useInfiniteQuery</code></td></tr>
          <tr><td>代码量与一致性</td><td>每处重写、各写各的</td><td>声明式、全应用统一</td></tr>
        </tbody>
      </table>

      <h2>六、边界：什么时候不必上 TanStack Query</h2>
      <p>
        它很强，但不是银弹。这些情况可以先不用：纯客户端状态（开关、主题、表单草稿）——那是
        <code>useState</code> / <code>useReducer</code> 或客户端状态库的活；一次性、极简单的取数且不在乎缓存的小工具页；
        以及已经在用框架级数据层（如 Next.js 的服务端获取 / RSC）且需求被覆盖的场景。
      </p>
      <Callout variant="tip">
        判断标准很简单：<strong>这份数据的「真相」是不是在服务器上、会不会过期、会不会被多处共享</strong>？
        只要答案是「是」，TanStack Query 几乎总是比手写 useEffect 更省心、更不易错。
      </Callout>
      <p>
        下一章我们会换一个视角：不再纠结「数据怎么取、怎么缓存」，而是看 React 自身的
        <strong>Suspense 与并发特性</strong>如何让「等待数据」和「重渲染」这两件事在交互上变得更顺滑。
      </p>

      <Summary
        points={[
          '服务端状态不是普通 state：它远端拥有、异步、会过期、可被多处共享，本质是远端真相的缓存副本。',
          '手写 useEffect + fetch 要自己处理加载 / 错误 / 竞态 / 缓存 / 去重 / 重取 / 重试 / 失效，且每处都得重写、易出错。',
          'TanStack Query 三大件：QueryClient（缓存大脑）+ useQuery（声明式读）+ useMutation（声明式写）。',
          'useQuery 靠 queryKey + queryFn 工作；同 key 共享缓存与请求（去重），自带后台重取与窗口聚焦重取。',
          'staleTime 管「要不要重取」（多久算新鲜），gcTime 管「缓存留多久」（无人用后多久回收），二者别混淆。',
          'useMutation 提交后用 invalidateQueries 让查询失效触发自动重取；乐观更新先改本地再回滚，分页用 useInfiniteQuery。',
          '边界：纯客户端状态、一次性简单取数、已有框架数据层覆盖时可不用——判断点是数据真相是否在服务端且会过期 / 共享。',
        ]}
      />
    </article>
  )
}
