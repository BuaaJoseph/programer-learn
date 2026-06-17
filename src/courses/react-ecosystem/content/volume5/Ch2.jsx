import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const reduxFlowSnippet = `// Redux 的单向数据流（概念）：
//
//   View ──dispatch(action)──▶ Reducer ──返回新 state──▶ Store ──通知──▶ View
//
// action 是「描述发生了什么」的纯对象：
const incrementAction = { type: 'counter/increment', payload: 1 }

// reducer 是 (state, action) => newState 的纯函数，
// 必须「不可变更新」：返回新对象，绝不修改原 state。
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, value: state.value + action.payload } // 新对象
    default:
      return state
  }
}`

const rtkSliceSnippet = `// counterSlice.js —— Redux Toolkit 用 createSlice 把样板压到最小
import { createSlice, configureStore } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    // 注意：这里「看起来」在直接修改 state.value！
    // RTK 内置 Immer，会把这段「可变写法」翻译成不可变更新。
    increment: (state) => {
      state.value += 1
    },
    decrement: (state) => {
      state.value -= 1
    },
    incrementBy: (state, action) => {
      state.value += action.payload
    },
  },
})

// createSlice 自动生成同名 action creators
export const { increment, decrement, incrementBy } = counterSlice.actions

// configureStore 自动接好 reducer、DevTools、thunk 中间件
export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})`

const rtkComponentSnippet = `// 组件里：useSelector 读 state，useDispatch 派发 action
import { Provider, useSelector, useDispatch } from 'react-redux'
import { store, increment, decrement, incrementBy } from './counterSlice.js'

function Counter() {
  // useSelector 带选择器：只订阅 state.counter.value，它变才重渲染
  const value = useSelector((s) => s.counter.value)
  const dispatch = useDispatch()
  return (
    <div>
      <span>计数：{value}</span>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(decrement())}>-1</button>
      <button onClick={() => dispatch(incrementBy(5))}>+5</button>
    </div>
  )
}

// Redux 需要在顶层套一个 Provider
export default function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  )
}`

const zustandStoreSnippet = `// store.js —— Zustand：create 一个「就是 Hook」的 store
import { create } from 'zustand'

export const useCounterStore = create((set) => ({
  value: 0,
  // 直接在 store 里写「方法」，没有 action 类型、没有 reducer、没有 dispatch
  increment: () => set((s) => ({ value: s.value + 1 })),
  decrement: () => set((s) => ({ value: s.value - 1 })),
  incrementBy: (n) => set((s) => ({ value: s.value + n })),
}))`

const zustandComponentSnippet = `// 组件里：直接 useStore，传选择器精确订阅，无 Provider
import { useCounterStore } from './store.js'

function Counter() {
  // 只订阅 value 字段：value 变才重渲染，其他字段变化不影响
  const value = useCounterStore((s) => s.value)
  // 取方法同理，方法引用稳定，不会引起重渲染
  const increment = useCounterStore((s) => s.increment)
  const incrementBy = useCounterStore((s) => s.incrementBy)
  return (
    <div>
      <span>计数：{value}</span>
      <button onClick={increment}>+1</button>
      <button onClick={() => incrementBy(5)}>+5</button>
    </div>
  )
}

// 不需要任何 Provider 包裹，直接用
export default function App() {
  return <Counter />
}`

const cartRtkSnippet = `// 购物车：RTK 版（写可变代码、产出不可变更新）
import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem: (state, action) => {
      const exist = state.items.find((i) => i.id === action.payload.id)
      if (exist) {
        exist.qty += 1 // Immer 接管，安全
      } else {
        state.items.push({ ...action.payload, qty: 1 }) // push 也安全
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload)
    },
  },
})
export const { addItem, removeItem } = cartSlice.actions`

const cartZustandSnippet = `// 购物车：Zustand 版（同样逻辑，更少仪式）
import { create } from 'zustand'

export const useCartStore = create((set) => ({
  items: [],
  addItem: (product) =>
    set((s) => {
      const exist = s.items.find((i) => i.id === product.id)
      if (exist) {
        return {
          items: s.items.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + 1 } : i
          ),
        }
      }
      return { items: [...s.items, { ...product, qty: 1 }] }
    }),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}))`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们用好了 Context 这把原生工具，也看清了它的天花板：只负责传递、没有细粒度更新。
        当应用变大、状态变复杂，就该请出专门的状态管理库。这一章我们对比两种主流范式——
        <strong>Redux Toolkit</strong>（结构严谨、可追踪）与 <strong>Zustand</strong>（极简、零样板），
        用同一个计数器和购物车给你两份对照代码，让你能根据项目规模做出选择。
      </Lead>

      <h2>一、什么时候才真的需要状态库</h2>
      <p>
        先泼盆冷水：<strong>大多数应用其实用不上状态库</strong>。局部 <code>useState</code> +
        状态提升 + Context 已经能覆盖很多场景。只有当下面这些信号同时出现时，才值得引入：
      </p>
      <ul>
        <li><strong>状态规模大、结构复杂</strong>：很多模块共享一大坨相互关联的状态。</li>
        <li><strong>跨页 / 跨路由共享</strong>：状态要在多个页面之间长期存活、保持一致。</li>
        <li><strong>交互复杂</strong>：一个动作会牵动多处状态联动更新。</li>
        <li><strong>需要可追踪 / 可调试</strong>：希望能回看「状态怎么一步步变成现在这样」，做时间旅行调试。</li>
      </ul>
      <Callout variant="warn" title="不要为了用而用">
        给一个只有几个表单的小应用套上 Redux，往往是<strong>过度工程</strong>：样板代码比业务逻辑还多。
        先问「原生方案是否真的扛不住了」，再决定上不上库。
      </Callout>

      <h2>二、Redux 核心概念</h2>
      <KeyIdea>
        Redux 的世界观：整个应用的状态存在<strong>单一 store</strong> 里；要改状态，只能
        <strong>dispatch 一个 action</strong>（描述「发生了什么」的纯对象）；
        <strong>reducer</strong> 这个纯函数根据 action 算出<strong>新</strong> state（绝不修改旧的）。
        数据严格<strong>单向流动</strong>，每一次变化都可被记录、回放。
      </KeyIdea>
      <ul>
        <li><strong>单一 store</strong>：全应用一棵状态树，唯一真相来源。</li>
        <li><strong>action</strong>：<code>{'{ type, payload }'}</code> 形式的纯对象，只描述「发生了什么」。</li>
        <li><strong>reducer</strong>：<code>(state, action) ={'>'} newState</code> 的纯函数，决定状态如何变。</li>
        <li><strong>单向数据流</strong>：View 派发 action，reducer 算新 state，store 更新，View 重渲染。</li>
        <li><strong>不可变（immutable）</strong>：reducer 必须返回新对象，不能就地修改原 state。</li>
      </ul>
      <CodeBlock lang="js" title="Redux 概念：action / reducer / 不可变更新" code={reduxFlowSnippet} />
      <p>
        这套约束带来了 Redux 最大的卖点：<strong>可预测、可追踪、可调试</strong>。配合 Redux DevTools，
        你能逐条看到 action 历史、做时间旅行。代价则是<strong>样板代码多</strong>——光是定义 action 类型、
        action creator、reducer 就要写一堆，这也是经典 Redux 被诟病的地方。
      </p>

      <h2>三、Redux Toolkit：把样板降下来</h2>
      <p>
        Redux Toolkit（RTK）是<strong>官方推荐的现代 Redux 写法</strong>，专门解决「样板太多」的痛点。
        两个核心 API：
      </p>
      <ul>
        <li><code>createSlice</code>：一次性定义一块状态的 initialState、reducers，并<strong>自动生成</strong> action creators。</li>
        <li><code>configureStore</code>：自动接好 reducer、Redux DevTools、thunk 中间件，开箱即用。</li>
      </ul>
      <KeyIdea>
        RTK 内置 <strong>Immer</strong>，让你在 reducer 里<strong>写「看起来在直接修改」的可变代码</strong>
        （<code>state.value += 1</code>、<code>state.items.push(...)</code>），Immer 在背后把它翻译成
        <strong>不可变更新</strong>。一句话：<strong>写可变代码、产出不可变更新</strong>，
        既保留 Redux 的不可变保证，又省掉满屏的展开运算符。
      </KeyIdea>
      <CodeBlock lang="js" title="createSlice + configureStore（含 Immer）" code={rtkSliceSnippet} />
      <Callout variant="info" title="Immer 的边界">
        Immer 的「可变写法」只在 <code>createSlice</code> / <code>createReducer</code> 提供的
        reducer 函数内部生效。在这些函数<strong>之外</strong>（比如普通工具函数里）改 state，
        依旧要老老实实手动不可变更新。
      </Callout>

      <h3>在组件里用：useSelector / useDispatch</h3>
      <p>
        通过 <code>react-redux</code> 连接 React。<code>useSelector(selector)</code> 订阅 store 的一部分——
        只有<strong>选中的那部分</strong>变化才会让组件重渲染，这就是 Context 给不了的细粒度订阅；
        <code>useDispatch()</code> 拿到 dispatch 去派发 action。顶层需要套 <code>{'<Provider store={store}>'}</code>。
      </p>
      <CodeBlock lang="jsx" title="计数器：RTK 在组件里的用法" code={rtkComponentSnippet} />

      <h2>四、Zustand：极简范式</h2>
      <p>
        Zustand（德语「状态」）走的是另一条路：<strong>把仪式感降到几乎为零</strong>。
        你用 <code>create</code> 定义一个 store，它返回的<strong>本身就是一个 Hook</strong>。
        没有 Provider、没有 action 类型、没有 reducer、没有 dispatch——state 和修改它的方法直接写在一起。
      </p>
      <CodeBlock lang="js" title="Zustand：create 一个就是 Hook 的 store" code={zustandStoreSnippet} />
      <p>
        在组件里，直接调用这个 Hook 并传一个<strong>选择器</strong>：<code>useCounterStore((s) ={'>'} s.value)</code>。
        和 RTK 的 <code>useSelector</code> 一样，它做<strong>精确订阅</strong>——只有 <code>value</code> 变化
        才重渲染。最大的区别是：<strong>不需要任何 Provider 包裹</strong>，store 是模块级单例，import 进来就能用。
      </p>
      <CodeBlock lang="jsx" title="计数器：Zustand 在组件里的用法（无 Provider）" code={zustandComponentSnippet} />

      <h2>五、同一个购物车，两份对照</h2>
      <p>
        计数器太简单，换个更有结构的例子——购物车的「加入 / 移除商品」，更能看出两种范式的手感差异。
      </p>
      <Example title="RTK 版购物车">
        <p>
          靠 Immer，你能在 reducer 里直接 <code>exist.qty += 1</code> 和
          <code>state.items.push(...)</code>，读起来像在改普通对象，实际产出的是不可变更新。
        </p>
      </Example>
      <CodeBlock lang="js" title="购物车：Redux Toolkit 版" code={cartRtkSnippet} />
      <Example title="Zustand 版购物车">
        <p>
          Zustand 没有内置 Immer（可选装中间件），所以这里用展开 / <code>map</code> / <code>filter</code>
          手动做不可变更新。代码更扁平：没有 slice、没有 action 类型，方法就挂在 store 上。
        </p>
      </Example>
      <CodeBlock lang="js" title="购物车：Zustand 版" code={cartZustandSnippet} />

      <h2>六、两者对比：怎么选</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Redux Toolkit</th><th>Zustand</th></tr>
        </thead>
        <tbody>
          <tr><td>样板量</td><td>中（RTK 已大幅削减，但仍有 slice/Provider）</td><td>极少（store 即 Hook）</td></tr>
          <tr><td>学习曲线</td><td>较陡（action/reducer/单向流概念多）</td><td>平缓（会用 Hook 就会用）</td></tr>
          <tr><td>Provider</td><td>需要顶层 Provider</td><td>不需要，模块级单例</td></tr>
          <tr><td>不可变更新</td><td>内置 Immer，写可变代码</td><td>默认手动，可选 Immer 中间件</td></tr>
          <tr><td>调试工具</td><td>强，官方 DevTools / 时间旅行</td><td>有 devtools 中间件，生态稍弱</td></tr>
          <tr><td>细粒度订阅</td><td>useSelector 选择器</td><td>useStore 选择器</td></tr>
          <tr><td>适用规模</td><td>大型 / 团队 / 需严格规范与可追踪</td><td>中小型 / 快速开发 / 追求轻量</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一句话选型">
        要<strong>规范、可追踪、团队协作、强调试</strong>，选 Redux Toolkit；
        要<strong>轻、快、少仪式</strong>，选 Zustand。两者都做细粒度订阅，性能上都远胜「用 Context 当状态库」。
      </Callout>

      <h2>七、视野之外：还有别的范式</h2>
      <p>
        状态管理的世界不止这两家，了解一下另外两类思路有助于建立全景：
      </p>
      <ul>
        <li>
          <strong>原子化（Jotai / Recoil）</strong>：把状态拆成一个个极小的「原子（atom）」，
          组件按需订阅某几个原子。自底向上组合，天然细粒度，心智更接近 <code>useState</code> 的分布式版本。
        </li>
        <li>
          <strong>服务端状态另当别论</strong>：从后端接口拉来的数据（带缓存、重新验证、加载 / 错误态、
          后台刷新）<strong>不该</strong>硬塞进 Redux / Zustand 这类客户端状态库。它有专门的解法——
          <strong>TanStack Query</strong>，我们会在 <strong>r7</strong> 卷专门讲。
        </li>
      </ul>
      <Callout variant="info" title="客户端状态 vs 服务端状态">
        一个关键区分：<strong>客户端状态</strong>（UI 开关、表单、购物车这类你自己拥有的状态）交给
        Redux / Zustand / Jotai；<strong>服务端状态</strong>（接口数据）交给 TanStack Query。
        混为一谈是很多项目状态层混乱的根源。
      </Callout>

      <Summary
        points={[
          '大多数应用用不上状态库；只有状态规模大、跨页共享、交互复杂、需可追踪时才值得引入。',
          'Redux 核心：单一 store、action（描述发生了什么）、reducer（纯函数算新 state）、单向数据流、不可变更新。',
          'Redux Toolkit 用 createSlice/configureStore 削减样板，内置 Immer 让你「写可变代码、产出不可变更新」。',
          '组件里 RTK 用 useSelector（细粒度订阅）+ useDispatch，需顶层 Provider；Zustand 用 create 出一个就是 Hook 的 store，useStore(s=>s.x) 精确订阅，无 Provider、无 action 样板。',
          '选型：要规范 / 可追踪 / 强调试选 Redux Toolkit，要轻量 / 少仪式选 Zustand，两者都做细粒度订阅。',
          'Jotai/Recoil 提供原子化的细粒度思路；服务端状态（接口数据）不该塞进客户端状态库，应交给 TanStack Query（见 r7）。',
        ]}
      />
    </article>
  )
}
