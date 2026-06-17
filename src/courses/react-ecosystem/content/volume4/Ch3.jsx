import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const memoSnippet = `import { useMemo } from 'react'

function ProductList({ products, query }) {
  // 只有 products 或 query 变化时才重新过滤；否则复用上次的计算结果
  const filtered = useMemo(() => {
    console.log('重新过滤（昂贵计算）')
    return products.filter((p) => p.name.includes(query))
  }, [products, query])

  return <ul>{filtered.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
}`

const callbackSnippet = `import { useCallback, memo } from 'react'

// 被 memo 包裹的子组件：props 不变就跳过重渲染
const Child = memo(function Child({ onClick }) {
  console.log('Child 渲染')
  return <button onClick={onClick}>点我</button>
})

function Parent({ id }) {
  // 没有 useCallback 的话，每次 Parent 渲染都会新建一个 handleClick 函数引用，
  // 导致 memo 的 Child 误以为 props 变了而重渲染。useCallback 缓存住这个引用。
  const handleClick = useCallback(() => {
    console.log('clicked', id)
  }, [id])

  return <Child onClick={handleClick} />
}`

const memoEqualSnippet = `// useMemo 和 useCallback 本质是同一件事：缓存。下面两行完全等价
const fn = useCallback(() => doSomething(a), [a])
const fn = useMemo(() => () => doSomething(a), [a])
// useCallback(fn, deps) 就是 useMemo(() => fn, deps) 的语法糖`

const overuseSnippet = `// 反例：给每一个普通值都套 useMemo——纯属增加成本
const sum = useMemo(() => a + b, [a, b]) // a + b 本来就极快，缓存它反而更慢
const obj = useMemo(() => ({ a, b }), [a, b]) // 若没有下游 memo 子组件消费，毫无意义

// useMemo / useCallback 本身有开销：要存上次的依赖、做比较、占内存。
// 只有当"被缓存的东西很贵"或"引用稳定性本身有意义"时，收益才大于成本。`

const refMutableSnippet = `import { useRef, useState } from 'react'

function Stopwatch() {
  const [time, setTime] = useState(0)
  const intervalRef = useRef(null) // 存一个跨渲染保持、且改它不触发重渲染的值

  function start() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000)
  }
  function stop() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  return <>
    <p>{time}s</p>
    <button onClick={start}>开始</button>
    <button onClick={stop}>停止</button>
  </>
}`

const refDomSnippet = `function TextInput() {
  const inputRef = useRef(null) // 引用一个 DOM 节点

  function focusInput() {
    inputRef.current.focus() // 命令式地操作真实 DOM
  }

  return <>
    <input ref={inputRef} />
    <button onClick={focusInput}>聚焦输入框</button>
  </>
}`

const useLocalStorageSnippet = `import { useState, useEffect } from 'react'

// 自定义 Hook：以 use 开头，内部组合内置 hook，抽取"读写 localStorage 的有状态逻辑"
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    // 惰性初始化：只在首次渲染时读一次 localStorage
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  // value 变化时把它同步回 localStorage（这是与外部系统同步，正好用 effect）
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 忽略写入失败，如隐私模式 */
    }
  }, [key, value])

  return [value, setValue] // 返回的接口和 useState 一模一样，调用方零学习成本
}

// 使用：和 useState 用法完全一致，但值会自动持久化
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    当前主题：{theme}
  </button>
}`

const useDebounceSnippet = `import { useState, useEffect } from 'react'

// 另一个常用自定义 Hook：把一个频繁变化的值"防抖"到延迟后才更新
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id) // 值在 delay 内又变了就取消上一个计时，重新计时
  }, [value, delay])

  return debounced
}

// 使用：输入框每次敲键 query 都变，但 debouncedQuery 要停顿 300ms 才更新，
// 用它去触发搜索请求就能避免每敲一下都发一次请求。
function Search() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  // ...用 debouncedQuery 发请求
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}`

export default function Ch3() {
  return (
    <article>
      <Lead>
        这一章收尾几个"工具型" Hook：<code>useMemo</code> 和 <code>useCallback</code> 用来做
        性能优化（缓存计算结果和函数引用），<code>useRef</code> 用来存"跨渲染保持、改动不触发
        重渲染"的值或引用 DOM。最后我们学习把有状态逻辑抽成<strong>自定义 Hook</strong> 来复用——
        这是 Hooks 真正威力的体现。
      </Lead>

      <h2>一、useMemo：缓存昂贵的计算结果</h2>
      <p>
        <code>useMemo(fn, deps)</code> 会缓存 <code>fn</code> 的返回值，只有当依赖
        <code>deps</code> 变化时才重新计算，否则直接返回上次的结果。它解决的是
        "每次渲染都重复跑一段昂贵计算"的浪费。
      </p>
      <CodeBlock lang="jsx" title="用 useMemo 缓存过滤结果" code={memoSnippet} />

      <h2>二、useCallback：缓存函数引用</h2>
      <p>
        <code>useCallback(fn, deps)</code> 缓存的不是计算结果，而是<strong>函数本身的引用</strong>。
        每次组件渲染，函数字面量都会被重新创建成一个新引用；如果这个函数要传给被
        <code>React.memo</code> 包裹的子组件，新引用会让子组件误以为 props 变了而重渲染。
        useCallback 让引用在依赖不变时保持稳定。
      </p>
      <CodeBlock lang="jsx" title="用 useCallback 稳定传给 memo 子组件的回调" code={callbackSnippet} />

      <KeyIdea>
        <code>useMemo</code> 和 <code>useCallback</code> 本质是<strong>同一件事</strong>：缓存。
        <code>{'useCallback(fn, deps)'}</code> 不过是 <code>{'useMemo(() => fn, deps)'}</code>
        的语法糖——一个缓存值、一个缓存函数（而函数也是一种值）。
      </KeyIdea>
      <CodeBlock lang="jsx" title="两者等价关系" code={memoEqualSnippet} />

      <h2>三、它们是优化，不是默认操作</h2>
      <p>
        这是最关键、也最容易被新手做反的一点：<code>useMemo</code> / <code>useCallback</code>
        本身<strong>有成本</strong>——要保存上一次的依赖、每次渲染做依赖比较、占用额外内存。
        给所有东西无脑套上它们，往往让代码更慢、更难读。
      </p>
      <CodeBlock lang="jsx" title="过度使用的反例" code={overuseSnippet} />
      <table>
        <thead>
          <tr><th>真正值得缓存的场景</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>计算确实昂贵</td>
            <td>大数组的排序 / 过滤、复杂派生数据，且依赖不常变</td>
          </tr>
          <tr>
            <td>配合 <code>React.memo</code></td>
            <td>把稳定的对象 / 函数作为 props 传给被 memo 的子组件，避免其无谓重渲染</td>
          </tr>
          <tr>
            <td>作为其它 hook 的依赖</td>
            <td>把对象 / 函数放进另一个 useEffect / useMemo 的依赖数组，需要它引用稳定</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warn" title="先测量，再优化">
        不要凭感觉到处加 memo。性能优化应当由实际的卡顿和 Profiler 数据驱动。
        对一个加减法或一次性渲染的小列表套 <code>useMemo</code>，收益可能远小于它自身的开销。
      </Callout>

      <h2>四、useRef：跨渲染不变且不触发渲染的可变值</h2>
      <p>
        <code>useRef</code> 返回一个 <code>{'{ current: ... }'}</code> 对象，它有两个关键特性：
        ① 在多次渲染之间<strong>保持同一个对象</strong>；② 改 <code>current</code>
        <strong>不会触发重渲染</strong>。它有两大用途。
      </p>
      <h3>用途一：存一个可变值</h3>
      <p>
        适合存那些"需要跨渲染记住、但又不影响 UI"的东西，比如定时器 ID、上一次的某个值、
        外部库的实例。改它不该让组件重渲染——这正是 ref 和 state 的分工。
      </p>
      <CodeBlock lang="jsx" title="用 ref 存定时器 ID" code={refMutableSnippet} />
      <h3>用途二：引用 DOM 节点</h3>
      <p>
        把 ref 通过 <code>ref={'{inputRef}'}</code> 挂到 JSX 元素上，
        <code>inputRef.current</code> 就指向真实 DOM 节点，可命令式地调用
        <code>focus()</code>、<code>scrollIntoView()</code> 等。
      </p>
      <CodeBlock lang="jsx" title="用 ref 引用并聚焦 DOM" code={refDomSnippet} />
      <table>
        <thead>
          <tr><th>对比</th><th>useState</th><th>useRef</th></tr>
        </thead>
        <tbody>
          <tr><td>改动是否触发重渲染</td><td>是</td><td>否</td></tr>
          <tr><td>跨渲染是否保持</td><td>是</td><td>是</td></tr>
          <tr><td>读取方式</td><td>直接读变量</td><td>读 <code>.current</code></td></tr>
          <tr><td>典型用途</td><td>影响 UI 的数据</td><td>定时器 ID、DOM 引用、不影响 UI 的可变值</td></tr>
        </tbody>
      </table>

      <h2>五、自定义 Hook：复用有状态逻辑</h2>
      <KeyIdea>
        自定义 Hook 就是一个<strong>以 <code>use</code> 开头</strong>、内部<strong>组合了其它内置 Hook</strong>
        的普通函数。它的价值在于把"有状态的逻辑"抽取出来，在多个组件间复用——
        复用的是逻辑，不是状态本身（每个组件调用它都得到独立的状态）。
      </KeyIdea>
      <p>
        下面写一个完整的 <code>useLocalStorage</code>：它把"读写 localStorage 并保持一个 state 与之同步"
        这整套逻辑封装起来，对外暴露的接口和 <code>useState</code> 完全一样，调用方几乎零学习成本。
      </p>
      <CodeBlock lang="jsx" title="完整示例：useLocalStorage" code={useLocalStorageSnippet} />
      <Example title="自定义 Hook 复用的是逻辑，不是状态">
        <p>
          如果组件 A 和组件 B 都调用 <code>useLocalStorage('theme', 'light')</code>，
          它们各自得到一份<strong>独立</strong>的 <code>value</code> / <code>setValue</code>——
          共享的只是那段"如何读写 localStorage"的逻辑代码。这和把状态提到父组件再传下去
          （那是共享状态）是两回事。
        </p>
      </Example>
      <p>再看一个高频的 <code>useDebounce</code>，它把"防抖"这一行为抽成可复用的 Hook。</p>
      <CodeBlock lang="jsx" title="完整示例：useDebounce" code={useDebounceSnippet} />
      <Callout variant="info" title="自定义 Hook 的几条约定">
        <ul>
          <li>名字必须以 <code>use</code> 开头——这样 ESLint 才知道按 Hook 规则检查它。</li>
          <li>内部可以调用任意内置或其它自定义 Hook，但同样要遵守"只在顶层调用"的规则。</li>
          <li>它返回什么由你决定：可以仿照 <code>useState</code> 返回数组，也可以返回对象。</li>
        </ul>
      </Callout>

      <h2>六、React 19 之后：手动 memo 正在变少</h2>
      <p>
        最后展望一下趋势。React 19 带来了若干新 Hook 与编译器，正在改变上面这些手动优化的写法。
      </p>
      <table>
        <thead>
          <tr><th>新东西</th><th>它做什么</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>React Compiler</strong></td>
            <td>在构建时自动分析并插入 memo 化，让你大多数情况下<strong>不必再手写</strong>
              <code>useMemo</code> / <code>useCallback</code> / <code>React.memo</code></td>
          </tr>
          <tr>
            <td><code>useOptimistic</code></td>
            <td>在异步操作完成前先乐观地更新 UI，提交失败再回滚，简化"先显示后确认"的体验</td>
          </tr>
          <tr>
            <td><code>use</code></td>
            <td>一个可在渲染中读取 Promise / Context 的新原语，能配合 Suspense 更顺滑地处理异步</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip">
        方向很明确：随着 React Compiler 普及，手动 <code>useMemo</code> / <code>useCallback</code>
        会越来越少出现在业务代码里。但理解它们"为什么存在、解决什么问题"依然重要——
        编译器做的正是你现在手动在做的事，懂原理才能看懂它在帮你做什么。
      </Callout>

      <Summary
        points={[
          'useMemo 缓存计算结果、useCallback 缓存函数引用，本质同一件事；useCallback(fn,deps) 等价于 useMemo(()=>fn,deps)。',
          '它们是性能优化而非默认操作，自身有开销；滥用反而更慢，应在确有昂贵计算、配合 React.memo 或作为其它 hook 依赖时才用。',
          'useRef 存"跨渲染保持、改动不触发重渲染"的可变值（如定时器 ID），也用于引用真实 DOM 节点。',
          'useRef 与 useState 的分工：影响 UI 的数据用 state，不影响 UI 的可变值用 ref。',
          '自定义 Hook 是以 use 开头、组合内置 hook 的函数，用于复用有状态逻辑（复用逻辑而非状态），如 useLocalStorage / useDebounce。',
          'React 19 的 React Compiler 可自动 memo 化，配合 useOptimistic / use 让手动 memo 越来越少，但理解原理仍然必要。',
        ]}
      />
    </article>
  )
}
