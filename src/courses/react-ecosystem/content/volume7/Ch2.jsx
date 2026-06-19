import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const suspenseBasicSnippet = `import { Suspense } from 'react'

// Profile 内部「会暂停」：它在等数据或等代码就绪
function Page() {
  return (
    <Suspense fallback={<p>加载中…</p>}>
      <Profile />
    </Suspense>
  )
}
// Profile 没准备好时，React 自动显示 fallback；准备好了再无缝换上真实内容`

const lazySnippet = `import { Suspense, lazy } from 'react'

// React.lazy 把组件做成「按需加载」：首屏不下载这段代码
const Settings = lazy(() => import('./Settings.jsx'))

function App({ showSettings }) {
  return (
    <Suspense fallback={<p>正在加载设置面板…</p>}>
      {showSettings && <Settings />}
    </Suspense>
  )
}
// 第一次渲染 Settings 时才去下载它的 chunk，期间展示 fallback`

const querySuspenseSnippet = `import { useSuspenseQuery } from '@tanstack/react-query'

// suspense 模式：不再返回 isPending，而是「暂停」交给外层 Suspense 接住
function Profile() {
  const { data } = useSuspenseQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })
  // 走到这里 data 一定有值——加载态由 <Suspense> 统一处理
  return <h1>{data.name}</h1>
}`

const useHookSnippet = `import { use, Suspense } from 'react'

// React 19 的 use()：直接「读」一个 promise，未完成就暂停
function Message({ promise }) {
  const text = use(promise)        // promise 没 resolve，组件暂停
  return <p>{text}</p>
}

function Page({ messagePromise }) {
  return (
    <Suspense fallback={<p>读取消息中…</p>}>
      <Message promise={messagePromise} />
    </Suspense>
  )
}`

const errorBoundarySnippet = `import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

// 错误边界接住「加载失败」，Suspense 接住「正在加载」，二者互补
function Page() {
  return (
    <ErrorBoundary fallback={<p>加载失败，请重试</p>}>
      <Suspense fallback={<p>加载中…</p>}>
        <Profile />
      </Suspense>
    </ErrorBoundary>
  )
}`

const transitionSnippet = `import { useState, useTransition } from 'react'

function Search({ allItems }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(allItems)
  const [isPending, startTransition] = useTransition()

  function handleChange(e) {
    const next = e.target.value
    setQuery(next)                 // 紧急更新：输入框必须立刻跟手

    startTransition(() => {
      // 非紧急更新：标记为「过渡」，可被新输入打断，不阻塞打字
      const filtered = allItems.filter((it) =>
        it.toLowerCase().includes(next.toLowerCase())
      )
      setResults(filtered)
    })
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>筛选中…</span>}
      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  )
}`

const deferredSnippet = `import { useState, useDeferredValue, useMemo } from 'react'

function Search({ allItems }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)  // 延迟版的 query

  // 重计算只跟「延迟值」走：输入飞快时它落后一拍，但绝不卡输入
  const results = useMemo(
    () => allItems.filter((it) => it.includes(deferredQuery)),
    [allItems, deferredQuery]
  )

  const stale = query !== deferredQuery          // 正在追赶时可置灰
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul style={{ opacity: stale ? 0.5 : 1 }}>
        {results.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  )
}`

const startTransitionSnippet = `import { startTransition } from 'react'

// 独立函数版：用在事件回调外、或不需要 isPending 的地方
function navigate(url) {
  startTransition(() => {
    setRoute(url)                  // 切路由这种重更新标记为可中断的过渡
  })
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们解决了「数据怎么取、怎么缓存」。这一章换个角度：当数据还没来、代码还没下载、
        或者一次重渲染很费时，<strong>用户的界面会不会卡住、会不会闪烁</strong>？React 给出的答案是
        Suspense 与一组并发特性（<code>useTransition</code>、<code>useDeferredValue</code>）。它们的共同目标只有一个：
        让等待变得声明式、让重渲染不再阻塞用户的输入，整体体验更顺滑。
      </Lead>

      <h2>一、Suspense：把「正在等待」变成声明式</h2>
      <p>
        过去我们处理加载态，是在每个组件里写 <code>{"if (loading) return <Spinner/>"}</code>。
        Suspense 把这件事翻转过来：<strong>子组件只管「我还没准备好就暂停」，由外层的
        <code>{"<Suspense>"}</code> 统一决定暂停期间显示什么 fallback</strong>。加载态不再散落在各处，
        而是被提到一个清晰的边界上。
      </p>
      <CodeBlock lang="jsx" title="Suspense 的基本形态" code={suspenseBasicSnippet} />
      <KeyIdea>
        Suspense 的心智模型是：组件在「等数据」或「等代码」时可以<strong>暂停（suspend）</strong>渲染，
        React 会沿组件树向上找到最近的 <code>{"<Suspense>"}</code>，先展示它的 <code>fallback</code>，
        等子树准备好再无缝替换。加载态从「命令式的 if 判断」变成「声明式的边界」。
      </KeyIdea>
      <p>
        哪些东西能触发「暂停」？目前主要有三类：用 <code>React.lazy</code> 做代码分割的组件、
        支持 Suspense 模式的数据库（如 TanStack Query 的 <code>useSuspenseQuery</code>）、
        以及 React 19 的 <code>use()</code> 读取一个未完成的 promise。下面逐个看。
      </p>

      <h2>二、与 React.lazy 配合：代码分割</h2>
      <p>
        <code>React.lazy</code> 让你把某个组件的代码拆成单独的 chunk，只有真正要渲染它时才下载。
        下载这段时间组件「未就绪」，正好被 Suspense 接住显示 fallback。
      </p>
      <CodeBlock lang="jsx" title="lazy + Suspense 做按需加载" code={lazySnippet} />
      <Example title="为什么首屏更快">
        <p>
          假设设置面板有一大坨图表代码，但大多数用户进来根本不点它。用 <code>lazy</code> 后，
          这段代码<strong>不进首屏包</strong>，首屏 JS 更小、下载更快、可交互更早；
          只有用户真去开设置时才按需拉取，期间 Suspense 给个加载提示即可。
        </p>
      </Example>

      <h2>三、与数据获取配合：suspense 模式 / RSC / use()</h2>
      <p>
        Suspense 最初是为代码分割设计的，如今已扩展到数据获取。三条主流路径：
      </p>
      <h3>3.1 TanStack Query 的 suspense 模式</h3>
      <p>
        把 <code>useQuery</code> 换成 <code>useSuspenseQuery</code>，组件就不再自己处理 <code>isPending</code>，
        而是在数据未就绪时暂停，交给外层 Suspense。好处是组件体内拿到的 <code>data</code> 一定有值，代码更干净。
      </p>
      <CodeBlock lang="jsx" title="useSuspenseQuery" code={querySuspenseSnippet} />
      <h3>3.2 RSC（React 服务端组件）</h3>
      <p>
        在 React 服务端组件里，组件本身可以是 <code>async</code> 函数，直接 <code>await</code> 数据；
        Suspense 在服务端就能边等边流式发送 HTML——先发已就绪的部分，慢的部分用 fallback 占位，
        好了再流式补上。这让首屏不必死等最慢的数据。
      </p>
      <h3>3.3 use() 读取 promise</h3>
      <p>
        React 19 引入的 <code>use()</code> 可以在渲染中直接「读」一个 promise：promise 未 resolve 时组件暂停，
        resolve 后拿到值继续。它把「等一个 Promise」收敛成一行同步风格的读取。
      </p>
      <CodeBlock lang="jsx" title="use() 读取 promise" code={useHookSnippet} />

      <h2>四、错误边界：Suspense 的另一半</h2>
      <p>
        Suspense 只负责「正在加载」，不负责「加载失败」。失败由<strong>错误边界（ErrorBoundary）</strong>接住。
        两者是互补搭档：一个管等待态、一个管错误态，包在一起就覆盖了异步的两种坏情况。
      </p>
      <CodeBlock lang="jsx" title="ErrorBoundary + Suspense 搭配" code={errorBoundarySnippet} />
      <Callout variant="warn" title="别忘了错误边界">
        只写 <code>{"<Suspense>"}</code> 而不配错误边界，一旦数据请求抛错，错误会一路冒泡，
        轻则整片白屏、重则崩到根。<strong>异步边界应当成对出现：Suspense 兜加载，ErrorBoundary 兜失败。</strong>
      </Callout>

      <h2>五、并发特性：让重渲染不阻塞输入</h2>
      <p>
        Suspense 解决「等待」的展示问题；并发特性解决另一个问题：<strong>当一次状态更新会触发昂贵的重渲染时，
        别让它卡住用户正在进行的交互</strong>（尤其是打字）。React 把更新分成两类——
        必须立刻反映的<strong>紧急更新</strong>（如输入框跟手），和可以稍后、可被打断的<strong>过渡更新</strong>
        （如根据输入重算一个大列表）。
      </p>
      <KeyIdea>
        并发的核心是「更新有优先级，且可被打断」。把重活标记成<strong>过渡（transition）</strong>，
        React 就能在用户继续打字时<strong>中断</strong>这次重渲染、先响应输入，回头再接着算——
        于是「输入框永远跟手，列表稍微落后一点」，而不是「打一个字卡一下」。
      </KeyIdea>

      <h3>5.1 useTransition：把重更新标记为可中断</h3>
      <p>
        <code>useTransition</code> 给你一个 <code>startTransition</code> 函数和一个 <code>isPending</code> 标志。
        包在 <code>startTransition</code> 里的状态更新被视为「过渡」，优先级低、可被打断；
        <code>isPending</code> 则告诉你过渡是否在进行，方便显示一个轻量的「处理中」提示。
      </p>
      <CodeBlock lang="jsx" title="useTransition 做搜索过滤" code={transitionSnippet} />
      <Example title="这里发生了什么">
        <p>
          用户快速打字时，<code>setQuery</code> 是紧急更新——输入框每个字都<strong>立刻</strong>显示。
          而把大列表 <code>setResults</code> 放进 <code>startTransition</code> 后，它成了可中断的过渡：
          下一个字符到来时，React 直接丢弃还没算完的那次筛选、先响应新输入。结果就是<strong>打字丝滑、
          列表晚一拍跟上</strong>，配合 <code>isPending</code> 给个「筛选中」提示体验更完整。
        </p>
      </Example>

      <h3>5.2 useDeferredValue：延迟派生值</h3>
      <p>
        <code>useDeferredValue</code> 是另一种思路：你不改更新逻辑，而是拿到某个值的「延迟版」，
        让昂贵的派生计算只跟着延迟值走。输入飞快时延迟值会落后一拍，但输入本身永不卡顿。
        它特别适合「值来自上游、你无法把 setState 包进 transition」的场景。
      </p>
      <CodeBlock lang="jsx" title="useDeferredValue 做搜索过滤" code={deferredSnippet} />

      <h3>5.3 startTransition：独立函数版</h3>
      <p>
        如果你不需要 <code>isPending</code>，或要在组件外（如路由跳转工具函数里）标记过渡，
        可以直接用从 <code>react</code> 导入的独立 <code>startTransition</code>。
      </p>
      <CodeBlock lang="jsx" title="独立的 startTransition" code={startTransitionSnippet} />

      <h2>六、useTransition vs useDeferredValue：怎么选</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>useTransition</th><th>useDeferredValue</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>你控制的东西</td>
            <td>包裹一次 <strong>状态更新</strong></td>
            <td>派生一个值的 <strong>延迟副本</strong></td>
          </tr>
          <tr>
            <td>适用前提</td>
            <td>你能拿到并改写那次 <code>setState</code></td>
            <td>值来自上游（props 等），改不了源头更新</td>
          </tr>
          <tr>
            <td>加载提示</td>
            <td>自带 <code>isPending</code></td>
            <td>自己比较 <code>value !== deferred</code> 判断</td>
          </tr>
          <tr>
            <td>典型场景</td>
            <td>点击切 Tab / 提交 / 主动触发的重更新</td>
            <td>输入驱动的昂贵列表、图表重算</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip">
        一句话选择：<strong>能改写那次 setState，就用 useTransition；只能拿到一个值、改不了上游更新，就用
        useDeferredValue。</strong>两者底层都是「过渡优先级 + 可中断」，达到的效果一致——让重渲染给用户输入让路。
      </Callout>

      <h2>七、把两者放在一起看</h2>
      <p>
        Suspense 与并发特性常常协同：切换页面时，用 <code>startTransition</code> 包住路由更新，
        让旧页面在新页面（可能因 <code>lazy</code> 或数据未就绪而暂停）准备好之前继续显示、不闪 fallback；
        等新页面就绪再切过去。这就是「过渡式导航」——既不卡输入，也不让用户盯着空白加载条。
      </p>
      <p>
        到这里，服务端状态这一卷的两条主线就齐了：<strong>TanStack Query 管「数据的获取与缓存」，
        Suspense 与并发特性管「等待与重渲染的交互体验」</strong>。前者让数据正确高效，后者让界面始终顺滑跟手。
      </p>

      <Summary
        points={[
          'Suspense 把加载态变成声明式边界：子组件「未就绪就暂停」，外层 <Suspense> 统一显示 fallback。',
          '能触发暂停的有三类：React.lazy（代码分割）、suspense 模式的数据库（useSuspenseQuery）、React 19 的 use() 读 promise（含 RSC 流式渲染）。',
          'Suspense 只管加载态，失败要靠 ErrorBoundary 接住；二者应成对出现，覆盖异步的等待与出错。',
          '并发特性的核心：更新有优先级且可被打断，把重活标记为过渡，就能让重渲染给用户输入让路。',
          'useTransition 用 startTransition 包裹状态更新，提供 isPending，适合主动触发的重更新（切 Tab / 提交）。',
          'useDeferredValue 给值一个延迟副本，让昂贵派生计算跟延迟值走，适合输入驱动、改不了上游更新的场景。',
          '选择口诀：能改写 setState 用 useTransition，只能拿到值用 useDeferredValue；二者效果一致——重渲染不阻塞输入。',
        ]}
      />
    </article>
  )
}
