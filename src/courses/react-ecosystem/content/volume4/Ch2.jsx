import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const basicSnippet = `import { useEffect } from 'react'

function Title({ name }) {
  // 渲染提交到 DOM 之后，React 才执行这个 effect，把组件状态同步到外部世界（document.title）
  useEffect(() => {
    document.title = \`欢迎，\${name}\`
  }, [name]) // 依赖数组：只有 name 变化时才重新同步

  return <h1>你好，{name}</h1>
}`

const depsFormsSnippet = `// 形态一：不传依赖数组——每次渲染后都执行（几乎总是错的，容易造成死循环）
useEffect(() => {
  console.log('每次渲染都跑')
})

// 形态二：空数组——只在组件挂载后执行一次，卸载时清理一次
useEffect(() => {
  console.log('只在挂载时跑一次')
}, [])

// 形态三：有依赖——挂载时执行，之后任一依赖变化就重新执行
useEffect(() => {
  console.log('roomId 变了就重新连接', roomId)
}, [roomId])`

const cleanupSnippet = `function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()

    // 返回的函数就是"清理函数"：
    // 1) 组件卸载前会调用一次
    // 2) 依赖（roomId）变化、effect 即将重新执行前，也会先用"旧值"调用一次清理
    return () => {
      connection.disconnect()
    }
  }, [roomId])

  return <p>已连接到房间 {roomId}</p>
}

// roomId 从 "general" 变成 "music" 时的执行顺序：
// 用 general 断开旧连接（清理）→ 用 music 建立新连接（重跑 effect）`

const subscribeSnippet = `import { useState, useEffect } from 'react'

function WindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)

    // 必须清理：否则组件卸载后监听器还在，旧的 setWidth 还会被调用，造成内存泄漏
    return () => window.removeEventListener('resize', onResize)
  }, []) // 监听器只需建立一次

  return <p>窗口宽度：{width}px</p>
}`

const raceIgnoreSnippet = `function SearchResults({ query }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let ignore = false // 标记本次 effect 是否已经"过期"

    fetchResults(query).then((result) => {
      // query 变化导致 effect 重跑时，旧 effect 的清理会把它的 ignore 设为 true，
      // 于是这个慢到达的旧响应就被丢弃，不会覆盖新结果
      if (!ignore) setData(result)
    })

    return () => {
      ignore = true
    }
  }, [query])

  return <pre>{JSON.stringify(data)}</pre>
}`

const raceAbortSnippet = `function SearchResults({ query }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(\`/api/search?q=\${query}\`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') throw err // 主动取消不算错误
      })

    // 清理时直接中止上一个请求，比 ignore 标志更彻底（连网络请求都取消了）
    return () => controller.abort()
  }, [query])

  return <pre>{JSON.stringify(data)}</pre>
}`

const notNeedEffectSnippet = `// 反例：用 effect 同步"派生状态"——多余且容易出 bug
function Form({ firstName, lastName }) {
  const [fullName, setFullName] = useState('')
  useEffect(() => {
    setFullName(firstName + ' ' + lastName) // 多触发一次渲染，纯属浪费
  }, [firstName, lastName])
}

// 正解：渲染期间直接计算即可，根本不需要 state，也不需要 effect
function Form({ firstName, lastName }) {
  const fullName = firstName + ' ' + lastName
}

// 反例：把"事件逻辑"放进 effect
useEffect(() => {
  if (submitted) sendRequest() // 提交是用户事件，应该写在事件处理函数里
}, [submitted])

// 正解：直接写在 onSubmit 里
function handleSubmit() {
  sendRequest()
}`

const layoutEffectSnippet = `// useEffect：在浏览器把变更"绘制到屏幕之后"异步执行——不阻塞绘制，是默认选择
useEffect(() => {
  // 这里若改 DOM 尺寸/位置，用户可能先看到旧帧、再看到新帧（闪烁）
})

// useLayoutEffect：在 DOM 变更之后、浏览器"绘制之前"同步执行——会阻塞绘制
useLayoutEffect(() => {
  // 适合：读取布局尺寸并立刻调整，避免用户看到中间状态（如测量后定位 tooltip）
  const rect = ref.current.getBoundingClientRect()
  setPosition(rect.top)
})`

export default function Ch2() {
  return (
    <article>
      <Lead>
        <code>useEffect</code> 是最常用也最常被误解的 Hook。很多人把它当成"生命周期回调"
        来写，结果踩满了坑。这一章我们换个心智模型：effect 的本质是
        <strong>"在渲染提交后，把组件与某个外部系统同步"</strong>。理解了这一点，
        依赖数组、清理函数、竞态、StrictMode 双跑，乃至"你可能并不需要 Effect"这条建议，
        就都顺理成章了。
      </Lead>

      <h2>一、effect 不是生命周期回调，而是"同步外部世界"</h2>
      <KeyIdea>
        别再问"组件挂载时该做什么、更新时该做什么"。换成问：
        <strong>"有哪个外部系统需要和我的组件状态保持同步？"</strong>
        useEffect 就是用来描述这种同步关系的——React 会在渲染提交后运行它，让外部世界
        （DOM、订阅、网络、定时器）追上组件当前的状态。
      </KeyIdea>
      <p>
        所谓"外部系统"，是指任何不受 React 渲染流程管理的东西：浏览器的
        <code>document.title</code>、一个 WebSocket 连接、一个定时器、第三方图表库的实例、
        浏览器 API 的事件监听……渲染本身应当是"纯"的，不该碰这些；碰它们的活儿，
        就交给 effect 在渲染提交之后做。
      </p>
      <CodeBlock lang="jsx" title="最基础的 effect：把状态同步到 document.title" code={basicSnippet} />

      <h2>二、依赖数组的三种形态</h2>
      <p>
        <code>useEffect</code> 的第二个参数——依赖数组，决定了 effect 何时重新执行。它有三种形态，
        语义完全不同，是初学者最容易混淆的地方。
      </p>
      <CodeBlock lang="jsx" title="三种依赖数组形态" code={depsFormsSnippet} />
      <table>
        <thead>
          <tr><th>写法</th><th>何时执行</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>不传第二个参数</td>
            <td>每次渲染提交后都执行</td>
            <td>几乎用不到；常因此引发死循环</td>
          </tr>
          <tr>
            <td><code>[]</code> 空数组</td>
            <td>仅挂载后执行一次，卸载时清理一次</td>
            <td>建立一次性的订阅 / 监听 / 连接</td>
          </tr>
          <tr>
            <td><code>[a, b]</code> 有依赖</td>
            <td>挂载时执行；之后任一依赖变化就重新执行</td>
            <td>依赖某个 prop / state 的同步</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warn" title="依赖数组不是「性能开关」">
        新手常把依赖数组当成"控制 effect 跑不跑"的旋钮，随意增删。其实它的唯一正确含义是：
        <strong>列出 effect 内部用到的所有响应式值</strong>。该列的不列，就会读到旧快照（上一章的闭包陷阱）；
        为了"少跑几次"而故意漏写依赖，几乎一定会埋 bug。
      </Callout>

      <h2>三、清理函数与它的执行时机</h2>
      <p>
        effect 可以 <code>return</code> 一个函数，这就是<strong>清理函数</strong>。它的作用是
        撤销这个 effect 建立的副作用——断开连接、清掉定时器、移除监听器。理解它的关键是
        执行时机：清理函数会在<strong>两个时刻</strong>被调用。
      </p>
      <ul>
        <li><strong>组件卸载前</strong>：用最后一次的值清理一次。</li>
        <li><strong>effect 即将因依赖变化而重新执行前</strong>：先用<strong>旧值</strong>清理一次，再用新值重跑 effect。</li>
      </ul>
      <CodeBlock lang="jsx" title="清理函数：聊天室连接随 roomId 切换" code={cleanupSnippet} />
      <Example title="为什么「先清理旧的再建立新的」很重要">
        <p>
          如果没有清理函数，<code>roomId</code> 从 general 切到 music 时，旧的 general 连接
          不会断开——你会同时挂着两个连接，再切几次就堆出一串泄漏的连接。清理函数保证了
          "任一时刻只有一个有效连接"这个不变式。订阅、定时器、事件监听都是同理。
        </p>
      </Example>

      <h2>四、正确清理：订阅 / 定时器 / 事件监听</h2>
      <p>
        凡是 effect 里"建立了"某种持续性的东西，就一定要在清理函数里"拆掉"它。下面是事件监听的标准写法。
      </p>
      <CodeBlock lang="jsx" title="事件监听的建立与清理" code={subscribeSnippet} />
      <p>
        注意一个细节：<code>addEventListener</code> 和 <code>removeEventListener</code> 必须传
        <strong>同一个函数引用</strong>，所以要先把回调存进变量 <code>onResize</code>，
        不能两边各写一个内联箭头函数（那是两个不同的引用，移除会失败）。
      </p>

      <h2>五、请求竞态：ignore 标志与 AbortController</h2>
      <p>
        在 effect 里发请求有个隐蔽的坑——<strong>竞态（race condition）</strong>。用户快速改变
        <code>query</code>，会连发多个请求，而它们返回的顺序不保证和发出的顺序一致。
        如果一个"早发出、晚到达"的旧请求最后才返回，它会覆盖掉新请求的正确结果。
      </p>
      <CodeBlock lang="jsx" title="方案一：ignore 标志丢弃过期响应" code={raceIgnoreSnippet} />
      <p>
        <code>ignore</code> 标志的思路是：每次 effect 重跑前，让上一次 effect 的清理把它的
        <code>ignore</code> 设为 <code>true</code>，这样旧请求即便返回了也会被丢弃。
        更彻底的做法是 <code>AbortController</code>，直接在清理时中止上一个网络请求。
      </p>
      <CodeBlock lang="jsx" title="方案二：AbortController 直接中止旧请求" code={raceAbortSnippet} />
      <table>
        <thead>
          <tr><th>方案</th><th>原理</th><th>取舍</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>ignore 标志</td>
            <td>请求照常发，只是丢弃过期响应</td>
            <td>简单通用；但旧请求仍占用网络带宽</td>
          </tr>
          <tr>
            <td>AbortController</td>
            <td>清理时中止旧请求本身</td>
            <td>更彻底、省带宽；需后端 / fetch 支持 signal</td>
          </tr>
        </tbody>
      </table>

      <h2>六、StrictMode 下 effect 为什么跑两次</h2>
      <p>
        开发环境开启 <code>{'<React.StrictMode>'}</code> 时，你会发现每个 effect 在挂载时
        <strong>执行了两次</strong>（建立→清理→再建立）。这不是 bug，而是 React 故意为之的
        "压力测试"。
      </p>
      <p>
        它的目的是<strong>逼你写出正确的清理函数</strong>。如果你的 effect 在"建立→清理→再建立"
        之后行为依然正确，说明它是幂等且可重入的；如果出现了重复订阅、重复连接，
        双跑会立刻暴露这个缺失清理的问题。这只发生在开发环境，生产环境只跑一次。
      </p>
      <Callout variant="info" title="启示：让 effect 经得起「重跑」">
        StrictMode 双跑给你的核心启示是——不要假设 effect 只会执行一次。只要你老老实实写了
        对称的清理函数，无论 effect 被执行多少次，结果都应当一致。这本身就是健康 effect 的标志。
      </Callout>

      <h2>七、你可能并不需要 Effect</h2>
      <p>
        这是 React 官方文档专门用一整页强调的建议。很多用 effect 的场景其实是误用——
        effect 是为"和外部系统同步"准备的，而下面这两类逻辑根本不属于外部系统。
      </p>
      <CodeBlock lang="jsx" title="两类常见的「不该用 Effect」" code={notNeedEffectSnippet} />
      <ul>
        <li>
          <strong>派生状态</strong>：能由现有 props / state 直接算出来的值（如 fullName、过滤后的列表），
          应在渲染期间直接计算，不要用一个 state + effect 去"同步"——那会多触发一次渲染，还可能出现短暂的不一致。
        </li>
        <li>
          <strong>事件逻辑</strong>：响应用户交互（点击、提交）的逻辑应写在事件处理函数里，
          而不是用一个 state 标志去触发 effect。前者表达的是"用户做了某事"，后者表达的是"和外部同步"，语义不同。
        </li>
      </ul>
      <Callout variant="tip">
        判断口诀：如果这段逻辑是因为<strong>某个特定交互发生</strong>的，它属于事件处理函数；
        如果是因为<strong>组件被显示在屏幕上</strong>而需要和外部世界保持一致，它才属于 effect。
      </Callout>

      <h2>八、useLayoutEffect 与 useEffect 的区别</h2>
      <p>
        绝大多数时候你都该用 <code>useEffect</code>。但有一种特殊情况需要
        <code>useLayoutEffect</code>：当你需要在浏览器绘制之前读取布局并立刻调整，以避免用户看到闪烁。
      </p>
      <CodeBlock lang="jsx" title="两者的执行时机差异" code={layoutEffectSnippet} />
      <table>
        <thead>
          <tr><th>对比项</th><th>useEffect</th><th>useLayoutEffect</th></tr>
        </thead>
        <tbody>
          <tr><td>执行时机</td><td>浏览器绘制之后</td><td>DOM 变更后、绘制之前</td></tr>
          <tr><td>是否阻塞绘制</td><td>否（异步）</td><td>是（同步）</td></tr>
          <tr><td>典型用途</td><td>绝大多数副作用</td><td>测量布局后立刻定位，避免闪烁</td></tr>
          <tr><td>性能影响</td><td>小</td><td>大，滥用会拖慢绘制</td></tr>
        </tbody>
      </table>

      <Callout variant="tip">
        下一章我们看另一组 Hook：<code>useMemo</code> / <code>useCallback</code> 做性能优化，
        <code>useRef</code> 存跨渲染不变的可变值，以及如何把有状态逻辑抽成自定义 Hook 来复用。
      </Callout>

      <Summary
        points={[
          'effect 的本质是"渲染提交后把组件与外部系统同步"，不是生命周期回调；先问"要和哪个外部系统同步"。',
          '依赖数组三形态：不传=每次跑、空数组=只挂载跑一次、有依赖=依赖变化才重跑；依赖应完整列出 effect 用到的响应式值。',
          '清理函数在组件卸载前、以及依赖变化导致 effect 重跑前（用旧值）执行；订阅 / 定时器 / 监听都必须对称清理。',
          '请求竞态用 ignore 标志丢弃过期响应，或用 AbortController 直接中止旧请求。',
          'StrictMode 开发期让 effect 跑两次，目的是逼你写出经得起重跑的对称清理函数。',
          '派生状态与事件逻辑不该放进 effect；useLayoutEffect 在绘制前同步执行，仅用于避免布局闪烁。',
        ]}
      />
    </article>
  )
}
