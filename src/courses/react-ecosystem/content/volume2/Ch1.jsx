import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const basicCounter = `import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)   // [当前值, 设置函数]

  return (
    <button onClick={() => setCount(count + 1)}>
      点了 \${count} 次
    </button>
  )
}`

const snapshotDemo = `function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    // 这一次渲染里 count 永远是同一个定值（快照）。
    // 三次 setCount(count + 1) 等价于三次 setCount(0 + 1)，
    // 结果只 +1，而不是 +3。
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
  }

  return <button onClick={handleClick}>count = \${count}</button>
}`

const functionalUpdate = `function handleClick() {
  // 函数式更新：c 是 React 传进来的“最新的待定值”，
  // 三次依次累加，结果是 +3。
  setCount(c => c + 1)
  setCount(c => c + 1)
  setCount(c => c + 1)
}`

const closureSnapshot = `function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    // 注意：这里读 count 仍然是“本次渲染”捕获的旧值，
    // 不会因为上一行 setCount 而立刻变成新值。
    setTimeout(() => {
      alert('3 秒前的 count 是：' + count)   // 闭包锁住了当次快照
    }, 3000)
  }

  return <button onClick={handleClick}>count = \${count}</button>
}`

const batchingDemo = `function handleClick() {
  setCount(c => c + 1)
  setFlag(f => !f)
  setName('react')
  // React 18 起：以上三次 setState 被“自动批处理”，
  // 不管是在事件、Promise、setTimeout 还是原生回调里，
  // 都只触发一次重渲染，而不是三次。
}`

const immutableObject = `const [user, setUser] = useState({ name: '小明', age: 18 })

// ❌ 直接 mutate：React 看不到引用变化，可能不重渲染
function wrong() {
  user.age = 19
  setUser(user)          // 同一个引用，可能被跳过
}

// ✅ 创建新对象：展开旧值，覆盖要改的字段
function right() {
  setUser(prev => ({ ...prev, age: 19 }))
}`

const immutableArray = `const [list, setList] = useState([1, 2, 3])

// ✅ 增：用展开生成新数组
setList(prev => [...prev, 4])

// ✅ 删：用 filter 过滤出新数组
setList(prev => prev.filter(n => n !== 2))

// ✅ 改：用 map 映射出新数组
setList(prev => prev.map(n => (n === 1 ? 100 : n)))

// ❌ 不要 push / splice / 直接改下标：原地修改不会触发渲染
// list.push(4); setList(list)`

const eventHandler = `// ✅ 传“函数引用”，由 React 在点击时调用
<button onClick={handleClick}>确定</button>

// ✅ 需要传参时，包一层箭头函数
<button onClick={() => remove(id)}>删除</button>

// ❌ 这是“立即调用”，渲染时就执行了，且把返回值当成处理器
<button onClick={handleClick()}>错误</button>`

const syntheticEvent = `function Form() {
  function handleSubmit(e) {
    e.preventDefault()        // 阻止表单默认刷新页面
    console.log(e.type)       // 'submit'
    console.log(e.target)     // 触发事件的 DOM 节点
  }

  function handleInput(e) {
    console.log(e.target.value)   // 取输入框当前值
  }

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInput} />
      <button type="submit">提交</button>
    </form>
  )
}`

const lazyInit = `// ❌ 每次渲染都会执行 expensiveInit()，哪怕结果被丢弃
const [data, setData] = useState(expensiveInit())

// ✅ 惰性初始化：传“函数”，React 只在首次渲染调用一次
const [data, setData] = useState(() => expensiveInit())`

const reducerCart = `import { useReducer } from 'react'

// 1) reducer：纯函数 (state, action) => newState
function cartReducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, { id: action.id, name: action.name, qty: 1 }]
    case 'inc':
      return state.map(it =>
        it.id === action.id ? { ...it, qty: it.qty + 1 } : it
      )
    case 'remove':
      return state.filter(it => it.id !== action.id)
    case 'clear':
      return []
    default:
      return state
  }
}

function Cart() {
  // 2) [state, dispatch] = useReducer(reducer, 初始值)
  const [items, dispatch] = useReducer(cartReducer, [])

  return (
    <div>
      <button onClick={() => dispatch({ type: 'add', id: 1, name: '苹果' })}>
        加入苹果
      </button>
      <ul>
        {items.map(it => (
          <li key={it.id}>
            {it.name} × {it.qty}
            <button onClick={() => dispatch({ type: 'inc', id: it.id })}>+1</button>
            <button onClick={() => dispatch({ type: 'remove', id: it.id })}>移除</button>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'clear' })}>清空</button>
    </div>
  )
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        组件之所以「活」起来，靠的是状态（state）。这一章我们从最常用的 <code>useState</code> 入手，
        把它最容易踩坑的几件事讲透：<code>setState</code> 不是「立刻改变量」而是「请求一次重渲染」、
        一次渲染里 state 是一个不变的快照、连续更新要用函数式写法、React 18 的自动批处理、
        以及为什么改对象和数组必须「不可变更新」。最后我们用事件处理把交互串起来，
        并在状态变复杂时引出 <code>useReducer</code>。
      </Lead>

      <h2>一、useState：组件的「记忆」</h2>
      <p>
        函数组件每次渲染都是把函数从头跑一遍，普通局部变量在两次渲染之间不会被保留。
        要让组件「记住」点了几次、输入了什么，就得用 <code>useState</code>。它返回一个长度为 2 的数组：
        第一个是<strong>当前值</strong>，第二个是<strong>设置函数</strong>（约定命名为 <code>setXxx</code>）。
      </p>
      <CodeBlock lang="jsx" title="最基础的计数器" code={basicCounter} />
      <p>
        我们习惯用数组解构 <code>{'const [count, setCount] = useState(0)'}</code> 一次拿到这两样东西。
        <code>useState(0)</code> 里的 <code>0</code> 是<strong>初始值，只在首次渲染时生效</strong>，
        之后的渲染 React 会忽略它、返回上一次保存下来的值。
      </p>

      <h2>二、setState 做的不是「改变量」，而是「请求重渲染」</h2>
      <KeyIdea>
        调用 <code>setCount(1)</code> 并不会立刻把当前作用域里的 <code>count</code> 变成 1。
        它真正做的是：告诉 React「我要更新状态了，请用新值重新渲染这个组件」。
        当前这次渲染里的 <code>count</code> 始终保持原样——这就是 state 的<strong>快照语义</strong>。
      </KeyIdea>
      <p>
        每一次渲染，组件函数都会拿到一份「当时的」state。这份值在本次渲染的整个生命周期里是<strong>定值</strong>：
        事件处理函数、副作用、定时器里读到的，都是「这次渲染时」的那份。下面这个例子常让初学者困惑：
      </p>
      <CodeBlock lang="jsx" title="为什么连点三次只 +1" code={snapshotDemo} />
      <p>
        因为本次渲染里 <code>count</code> 是 <code>0</code>，三行 <code>{'setCount(count + 1)'}</code>
        其实都是 <code>{'setCount(0 + 1)'}</code>，最终只把状态排到 1。React 比对发现「新值就是 1」，
        渲染一次结束。
      </p>

      <h3>闭包捕获的也是当次快照</h3>
      <p>
        既然 state 是快照，那异步回调里读到的也是「当时」的值——哪怕几秒后 state 早已变了：
      </p>
      <CodeBlock lang="jsx" title="setTimeout 里读到的是旧快照" code={closureSnapshot} />

      <h2>三、函数式更新：解决「连续更新」</h2>
      <p>
        如果你确实要基于「最新待定值」连续累加，就把<strong>函数</strong>传给 setter。
        React 会把这些函数排进一个队列，依次执行，每个函数拿到的 <code>c</code> 都是上一步算出来的结果：
      </p>
      <CodeBlock lang="jsx" title="函数式更新让三次累加生效" code={functionalUpdate} />
      <p>
        经验法则：<strong>只要新值依赖旧值，就用函数式更新 <code>{'setX(prev => ...)'}</code></strong>。
        它既能正确处理连续调用，也能避免在 <code>useEffect</code> 等场景里因为闭包旧值而出错。
      </p>
      <table>
        <thead>
          <tr><th>写法</th><th>语义</th><th>连点三次的结果</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{'setCount(count + 1)'}</code></td><td>用当次快照算新值</td><td>+1</td></tr>
          <tr><td><code>{'setCount(c => c + 1)'}</code></td><td>基于上一待定值累加</td><td>+3</td></tr>
        </tbody>
      </table>

      <h2>四、React 18 的自动批处理</h2>
      <p>
        在一个事件处理里调用多次 setState，React 不会每次都立刻重渲染，而是把它们「攒」到一起，
        在事件结束时统一渲染一次——这叫<strong>批处理（batching）</strong>。React 18 把它升级为
        <strong>自动批处理</strong>：不仅是事件回调，连 <code>Promise</code>、<code>setTimeout</code>、
        原生事件回调里的多次 setState 也会被自动合并。
      </p>
      <CodeBlock lang="jsx" title="多次 setState 只触发一次渲染" code={batchingDemo} />
      <Callout variant="info" title="为什么这是好事">
        批处理减少了不必要的中间渲染，让一次交互只对应一次 DOM 更新，性能更好、也避免了
        「渲染到一半、几个 state 不一致」的尴尬。极少数要强制同步渲染的场景才需要
        <code>flushSync</code>，绝大多数时候你无需关心它。
      </Callout>

      <h2>五、不可变更新：对象和数组不能原地改</h2>
      <KeyIdea>
        React 靠<strong>引用是否变化</strong>来判断 state 是否更新。直接 mutate 原对象 / 数组，
        引用没变，React 可能认为「没变化」而跳过渲染。正确做法是<strong>创建一个新的对象 / 数组</strong>，
        把旧内容拷进去再改。
      </KeyIdea>
      <CodeBlock lang="jsx" title="对象：用展开生成新对象" code={immutableObject} />
      <CodeBlock lang="jsx" title="数组：用 map / filter / 展开，别用 push / splice" code={immutableArray} />
      <Callout variant="warn" title="嵌套对象要逐层展开">
        <code>{'{ ...prev }'}</code> 只是浅拷贝。如果要改的是嵌套字段，内层对象也要展开，
        例如 <code>{'setUser(p => ({ ...p, addr: { ...p.addr, city: "杭州" } }))'}</code>。
        嵌套很深时，可考虑用 Immer 这类库简化写法。
      </Callout>

      <h2>六、事件处理：onClick 传函数，而不是调用它</h2>
      <p>
        React 里事件名用驼峰（<code>onClick</code>、<code>onChange</code>、<code>onSubmit</code>），
        值是一个<strong>函数引用</strong>。最常见的错误就是写成 <code>{'onClick={handleClick()}'}</code>——
        那是渲染时就立刻调用，把返回值当处理器，几乎肯定不是你想要的。
      </p>
      <CodeBlock lang="jsx" title="传函数 vs 误调用 vs 传参" code={eventHandler} />

      <h3>合成事件 SyntheticEvent</h3>
      <p>
        处理函数收到的 <code>e</code> 不是原生 DOM 事件，而是 React 包装过的
        <strong>合成事件（SyntheticEvent）</strong>。它抹平了浏览器差异，API 与原生基本一致：
        <code>e.target</code> 拿触发节点、<code>e.target.value</code> 拿输入值、
        <code>e.preventDefault()</code> 阻止默认行为、<code>e.stopPropagation()</code> 阻止冒泡。
      </p>
      <CodeBlock lang="jsx" title="合成事件常用 API" code={syntheticEvent} />

      <h2>七、惰性初始化：昂贵的初始值只算一次</h2>
      <p>
        如果初始值需要一次昂贵计算（比如读 <code>localStorage</code>、解析大数据），
        直接 <code>useState(expensive())</code> 会在<strong>每次渲染</strong>都执行那次计算，
        哪怕结果会被丢弃。把它包成函数传进去，React 就只在首次渲染调用一次：
      </p>
      <CodeBlock lang="jsx" title="惰性初始化" code={lazyInit} />

      <h2>八、什么时候用 useReducer 替代多个 useState</h2>
      <p>
        当一个组件里 state 越来越多、而且这些更新逻辑彼此关联（比如购物车的增、删、改、清空），
        散落的多个 <code>useState</code> 会让代码难以维护。这时把所有更新逻辑收进一个
        <strong>reducer 纯函数</strong>、用 <code>dispatch</code> 派发「动作」来驱动，会清晰很多。
      </p>
      <Example title="用 useReducer 管理购物车">
        <p>
          reducer 是 <code>{'(state, action) => newState'}</code> 的纯函数；
          组件里用 <code>{'const [items, dispatch] = useReducer(cartReducer, [])'}</code>，
          交互时调用 <code>{'dispatch({ type: "add", id: 1 })'}</code> 即可。
          注意 reducer 内部依旧遵守不可变更新（用展开、<code>map</code>、<code>filter</code>）。
        </p>
      </Example>
      <CodeBlock lang="jsx" title="useReducer 版购物车" code={reducerCart} />
      <table>
        <thead>
          <tr><th>场景</th><th>更适合</th></tr>
        </thead>
        <tbody>
          <tr><td>单个、独立的简单值（开关、计数、输入）</td><td><code>useState</code></td></tr>
          <tr><td>多个字段相互关联、更新逻辑复杂</td><td><code>useReducer</code></td></tr>
          <tr><td>下一个 state 强依赖动作类型</td><td><code>useReducer</code></td></tr>
          <tr><td>想把更新逻辑抽出组件、便于测试</td><td><code>useReducer</code>（reducer 是纯函数）</td></tr>
        </tbody>
      </table>

      <Callout variant="tip">
        下一章我们把 state 用到表单上：受控组件如何让 React 成为输入的「唯一数据源」，
        以及 input / select / checkbox 各自怎么写。
      </Callout>

      <Summary
        points={[
          'useState 返回 [当前值, 设置函数]，初始值只在首次渲染生效。',
          'setState 不是立即改变量，而是请求一次重渲染；一次渲染里 state 是定值（快照），闭包捕获的也是当次快照。',
          '新值依赖旧值时用函数式更新 setX(prev => ...)，可正确处理连续更新。',
          'React 18 自动批处理：事件、Promise、setTimeout 里的多次 setState 都合并为一次渲染。',
          '对象 / 数组要不可变更新：用 {...obj}、[...arr]、map、filter，绝不直接 mutate。',
          '事件用驼峰 onClick 并传函数引用，处理函数收到的是合成事件 SyntheticEvent。',
          '昂贵初始值用惰性初始化 useState(() => ...)；state 多且更新逻辑复杂时改用 useReducer。',
        ]}
      />
    </article>
  )
}
