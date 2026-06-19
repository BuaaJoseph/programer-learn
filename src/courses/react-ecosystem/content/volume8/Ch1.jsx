import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const profilerSnippet = `// 不要靠「感觉卡」就开始改代码。先打开 React DevTools 的 Profiler 录一段：
// 1. 切到 Profiler 面板，点圆形录制按钮
// 2. 在页面上做一次「会卡」的操作（输入、点击、滚动）
// 3. 停止录制，看火焰图（flamegraph）/排序图（ranked）
//
// 你要找的是：
//   - 一次交互里「被渲染了但本来不需要重渲染」的组件（颜色越黄越久）
//   - "Why did this render?" 里写着 props/hooks/parent 变化的项
//
// 另一个轻量工具：DevTools 设置里勾选
//   "Highlight updates when components render"
// 每次组件重渲染，屏幕上就会闪一圈边框。
// 如果你只动了一个输入框，整个页面却到处闪 —— 那就是多余渲染的信号。`

const expensiveBad = `// 反例：每次渲染都重新做一遍昂贵计算
function ProductList({ products, keyword }) {
  // 列表上万条时，filter + sort 每次渲染都跑一遍，哪怕 keyword 没变
  const visible = products
    .filter((p) => p.name.includes(keyword))
    .sort((a, b) => b.score - a.score)

  return <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
}`

const expensiveGood = `import { useMemo } from 'react'

// 正解：把昂贵计算用 useMemo 缓存，只有依赖变了才重算
function ProductList({ products, keyword }) {
  const visible = useMemo(() => {
    return products
      .filter((p) => p.name.includes(keyword))
      .sort((a, b) => b.score - a.score)
  }, [products, keyword]) // 依赖没变 -> 直接复用上次结果

  return <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
}`

const memoBasic = `import { memo } from 'react'

// React.memo 包一层：父组件重渲染时，若传给 Child 的 props 浅比较没变，
// 就跳过 Child 的重渲染。
const Child = memo(function Child({ label }) {
  console.log('Child render')
  return <p>{label}</p>
})

// 父每秒变一次 tick，但 label 始终是同一个字符串字面量 ->
// Child 只在挂载时渲染一次，之后 memo 全部跳过。
function Parent() {
  const [tick, setTick] = useState(0)
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>{tick}</button>
      <Child label="我不变" />
    </div>
  )
}`

const memoBroken = `import { memo, useState } from 'react'

const Child = memo(function Child({ onClick, data }) {
  console.log('Child render') // memo 失效时仍然每次都打印
  return <button onClick={onClick}>{data.text}</button>
})

function Parent() {
  const [tick, setTick] = useState(0)
  // 陷阱：每次渲染都新建对象 / 新建函数，引用每次都不同
  // -> memo 的浅比较恒为 false -> memo 形同虚设
  return (
    <div onClick={() => setTick((t) => t + 1)}>
      <Child onClick={() => doSomething()} data={{ text: '点我' }} />
    </div>
  )
}`

const memoFixed = `import { memo, useState, useCallback, useMemo } from 'react'

const Child = memo(function Child({ onClick, data }) {
  console.log('Child render')
  return <button onClick={onClick}>{data.text}</button>
})

function Parent() {
  const [tick, setTick] = useState(0)

  // useCallback 锁住函数引用，useMemo 锁住对象引用，
  // 二者都只在依赖变化时才产生新引用 -> memo 的浅比较这下才真正生效。
  const handleClick = useCallback(() => doSomething(), [])
  const data = useMemo(() => ({ text: '点我' }), [])

  return (
    <div onClick={() => setTick((t) => t + 1)}>
      <Child onClick={handleClick} data={data} />
    </div>
  )
}`

const heavyTreeBefore = `import { useState } from 'react'

// 问题版：高频更新的 input 和「重子树」同住一个组件。
// 每敲一个字 -> Parent 重渲染 -> HeavyTree 也跟着重渲染（哪怕它和输入无关）。
function Dashboard() {
  const [keyword, setKeyword] = useState('')
  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {/* 一棵渲染很贵的子树：成百上千个节点 */}
      <HeavyTree />
    </div>
  )
}`

const heavyTreeAfter = `import { useState, memo } from 'react'

// 解法一：状态下沉。把高频变化的 keyword 关进一个尽量小的子组件，
// 让重渲染只发生在 SearchBox 内部，HeavyTree 在它外面不受影响。
function SearchBox() {
  const [keyword, setKeyword] = useState('')
  return <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
}

// 解法二：HeavyTree 用 memo 包住，props 不变就永不重渲染，双保险。
const HeavyTree = memo(function HeavyTree() {
  // ...成百上千个节点...
  return <div>{/* 很贵的内容 */}</div>
})

function Dashboard() {
  return (
    <div>
      <SearchBox />   {/* 重渲染被关在这里 */}
      <HeavyTree />   {/* keyword 变化再也波及不到它 */}
    </div>
  )
}`

const contextBad = `// 反例：Provider 的 value 每次渲染都是新对象，
// 且把「频繁变的」和「不怎么变的」塞进同一个 Context。
function App() {
  const [theme, setTheme] = useState('light')
  const [count, setCount] = useState(0) // 高频变化

  // count 一变 -> value 变 -> 所有消费 Context 的组件全部重渲染
  return (
    <Ctx.Provider value={{ theme, setTheme, count, setCount }}>
      <BigTree />
    </Ctx.Provider>
  )
}`

const contextGood = `// 解法：用 children 组合，把不消费 Context 的子树作为 children 传进去。
// children 是在外层创建的元素，Provider 自身重渲染不会重建它们。
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// BigTree 作为 children 传入：ThemeProvider 内部状态变化时，
// BigTree 这一段 JSX 不会被重新创建，从而避免大面积重渲染。
function App() {
  return (
    <ThemeProvider>
      <BigTree />
    </ThemeProvider>
  )
}`

const compilerSnippet = `// React 19 起，React Compiler（即原 React Forget）可以在编译期
// 自动为组件和值插入记忆化，理想情况下让你不必手写 memo / useMemo / useCallback。
//
// 启用方式（以 Babel 插件为例）：
// babel.config.js
module.exports = {
  plugins: [
    'babel-plugin-react-compiler', // 放在插件列表最前面
  ],
}

// 编译器会分析依赖，自动缓存「派生值」和「子元素」，
// 手动 memo 化在很多场景下会变成多余甚至重复的工作。`

export default function Ch1() {
  return (
    <article>
      <Lead>
        性能优化最容易犯的错，是「凭感觉」改代码——总觉得这里慢，于是到处包 memo，结果又把代码
        搞复杂又没真正变快。这一章的主线只有一句话：<strong>先测，再优。</strong>
        我们先学会用工具<strong>定位</strong>多余的重渲染，再对症下药地用 memo、状态下沉、组合等手段把它
        <strong>消除</strong>，最后聊聊 React 19 的 React Compiler 会怎样改变「手写记忆化」这件事。
      </Lead>

      <h2>一、第一原则：先测再优，别过早优化</h2>
      <p>
        Donald Knuth 那句「过早优化是万恶之源」在 React 里同样成立。React 本身已经很快，
        绝大多数页面根本不需要任何手动优化。真正的瓶颈往往集中在<strong>极少数</strong>组件上——
        一个超长列表、一棵很重的树、一处每帧都在变的状态。如果你在没有测量的情况下到处撒
        <code>memo</code> / <code>useMemo</code>，结果通常是：代码可读性下降、心智负担增加，
        而性能<strong>没有</strong>可观测的提升，因为你优化的地方根本不是瓶颈。
      </p>
      <KeyIdea>
        优化的正确顺序是<strong>定位 → 度量 → 改动 → 再度量验证</strong>。
        没有「再度量验证」这一步，你永远不知道改动到底有没有用，甚至可能改慢了还不自知。
      </KeyIdea>

      <h2>二、定位多余渲染：Profiler 与 Highlight updates</h2>
      <p>
        React 的重渲染默认是「级联」的：一个组件渲染，它的所有子组件默认也会跟着渲染（无论 props 变没变）。
        这本身没问题——React 重渲染只是「重新调用函数 + diff」，并不等于操作 DOM。但当某棵子树
        <strong>渲染很贵</strong>，又被一个<strong>高频更新的父组件</strong>反复拖着重渲染时，卡顿就来了。
        所以第一步永远是：找出「本可以不渲染却被渲染了」的组件。
      </p>
      <CodeBlock lang="javascript" title="用 React DevTools Profiler 与 Highlight updates 定位" code={profilerSnippet} />
      <p>
        两个工具配合着看：<strong>Highlight updates</strong> 给你直觉——哪里在闪、闪得勤不勤；
        <strong>Profiler</strong> 给你证据——某次交互里谁渲染了、各花了多少毫秒、为什么渲染
        （它会在 &quot;Why did this render?&quot; 里告诉你是 props、hooks 还是父组件触发的）。
      </p>

      <h2>三、症状 → 定位 → 手段 对照表</h2>
      <p>
        把常见的性能问题做成一张「查症下药」的表，遇到卡顿时按图索骥：
      </p>
      <table>
        <thead>
          <tr><th>症状</th><th>怎么定位</th><th>对应手段</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>敲一个字，整页到处闪</td>
            <td>Highlight updates 看到大范围闪</td>
            <td>状态下沉 + 对重子树用 memo</td>
          </tr>
          <tr>
            <td>父组件高频更新拖累静态子树</td>
            <td>Profiler 里子树渲染耗时高、原因是 parent</td>
            <td>memo 包子树 / 用 children 组合</td>
          </tr>
          <tr>
            <td>memo 了却还是每次都渲染</td>
            <td>&quot;Why did this render?&quot; 显示某个 prop 每次都变</td>
            <td>useCallback / useMemo 锁住引用</td>
          </tr>
          <tr>
            <td>一改全局状态，无关组件全渲染</td>
            <td>Profiler 看到大量 Context 消费者重渲</td>
            <td>拆分 Context / children 组合 / value 记忆化</td>
          </tr>
          <tr>
            <td>某次渲染单组件就耗时几十毫秒</td>
            <td>Profiler 火焰图里该组件特别长</td>
            <td>useMemo 缓存昂贵计算</td>
          </tr>
          <tr>
            <td>长列表滚动/输入掉帧</td>
            <td>Profiler 显示成百上千个列表项同时渲</td>
            <td>列表项拆分 + memo；必要时虚拟化（见下一章）</td>
          </tr>
        </tbody>
      </table>

      <h2>四、手段一：React.memo——浅比较 props</h2>
      <p>
        <code>React.memo</code> 把一个组件包起来：当父组件重渲染时，React 会对新旧 props 做一次
        <strong>浅比较</strong>（逐个 key 的 <code>Object.is</code>），如果全都相等，就<strong>跳过</strong>
        这个组件的重渲染，直接复用上次的结果。
      </p>
      <CodeBlock lang="javascript" title="memo 生效的样子" code={memoBasic} />
      <Callout variant="warn" title="memo 很容易「看起来包了其实没用」">
        浅比较的命门是<strong>引用相等</strong>。如果你每次渲染都给被 memo 的组件传一个
        <strong>新建的对象或新建的函数</strong>，那么浅比较永远为 <code>false</code>，
        memo 等于白包。这是初学者最常踩的坑。
      </Callout>
      <CodeBlock lang="javascript" title="反例：memo 被新引用废掉" code={memoBroken} />

      <h2>五、手段二：useMemo / useCallback 配合 memo</h2>
      <p>
        要让上面的 memo 真正生效，必须保证传进去的<strong>引用是稳定的</strong>：用
        <code>useCallback</code> 缓存函数、用 <code>useMemo</code> 缓存对象 / 数组，
        它们只在依赖变化时才产生新引用。注意：<code>useCallback</code> / <code>useMemo</code>
        往往要和 <code>memo</code> <strong>搭配</strong>才有意义——如果接收方没有 memo，
        光稳定引用也省不掉它的重渲染。
      </p>
      <CodeBlock lang="javascript" title="正解：useCallback + useMemo 锁住引用" code={memoFixed} />
      <p>
        另一类独立用途：<strong>缓存昂贵计算</strong>。哪怕不涉及子组件 memo，只要某次计算本身很贵
        （大数组 filter/sort、复杂派生），就值得用 <code>useMemo</code> 缓存，避免每次渲染白跑。
      </p>
      <Example title="昂贵计算的 memo 化">
        <p>
          下面这个列表组件每次渲染都对上万条数据做 filter + sort。只要 <code>products</code> 和
          <code>keyword</code> 没变，结果其实完全一样，却被反复计算——这是纯粹的浪费。
        </p>
        <CodeBlock lang="javascript" title="反例：每次渲染都重算" code={expensiveBad} />
        <CodeBlock lang="javascript" title="正解：useMemo 缓存" code={expensiveGood} />
      </Example>

      <h2>六、手段三：状态下沉——缩小重渲染范围</h2>
      <p>
        这是<strong>性价比最高</strong>的优化，而且常常不需要任何 memo。思路很朴素：一个频繁变化的
        state 放得越高，被它牵连重渲染的子树就越大。把它<strong>下沉</strong>到一个尽可能小的子组件里，
        重渲染就被关进了那个小盒子，外面的重子树纹丝不动。
      </p>
      <Example title="对照例子：父组件高频更新拖累子树 → memo + 状态下沉解决">
        <p>
          问题：搜索框的 <code>keyword</code> 和一棵很贵的 <code>HeavyTree</code> 同住一个组件。
          每敲一个字，整个 <code>Dashboard</code> 重渲染，<code>HeavyTree</code> 也被白白拖着重渲染。
        </p>
        <CodeBlock lang="javascript" title="问题版：keyword 变化波及整棵重子树" code={heavyTreeBefore} />
        <p>
          解决：① 把 <code>keyword</code> <strong>下沉</strong>到独立的 <code>SearchBox</code>，
          让重渲染只发生在它内部；② 再给 <code>HeavyTree</code> 套上 <code>memo</code> 做双保险。
          两招叠加后，输入时只有 <code>SearchBox</code> 在闪，<code>HeavyTree</code> 一次都不再渲染。
        </p>
        <CodeBlock lang="javascript" title="解决版：状态下沉 + memo" code={heavyTreeAfter} />
      </Example>

      <h2>七、手段四：用 children / 组合避免 Context 大面积重渲染</h2>
      <p>
        Context 有两个常见性能坑：<strong>value 每次都是新对象</strong>，以及把高频和低频状态
        <strong>塞进同一个 Context</strong>。任意一个值变化，所有消费该 Context 的组件都会重渲染。
      </p>
      <CodeBlock lang="javascript" title="反例：Context 引发大面积重渲染" code={contextBad} />
      <p>
        一个优雅的解法是 <strong>children 组合</strong>：把不消费 Context 的子树作为
        <code>children</code> 从外层传入。children 是在 Provider <strong>外面</strong>创建好的元素，
        Provider 自身重渲染时并不会重新创建它们，于是这部分子树自然被「跳过」。
      </p>
      <CodeBlock lang="javascript" title="正解：children 组合 + value 记忆化" code={contextGood} />
      <Callout variant="tip" title="还可以拆 Context">
        把「读得多、变得少」和「变得频繁」的状态拆成两个独立 Context，
        让只关心前者的组件不被后者的变化波及。组合与拆分往往一起用。
      </Callout>

      <h2>八、手段五：列表项拆分</h2>
      <p>
        长列表里，如果整个列表的渲染逻辑都写在父组件里，那么任何一项的变化都可能触发整列重渲染。
        把每一项抽成独立的、被 <code>memo</code> 包裹的 <code>{'<Row />'}</code> 组件，并保证传给它的
        props 引用稳定，就能做到「只重渲染真正变化的那一行」。当列表大到 memo 也救不动时（成百上千项
        同时在视口里），就该上<strong>虚拟化</strong>了——这是下一章的主题。
      </p>

      <h2>九、React 19 的 React Compiler：自动记忆化</h2>
      <p>
        前面所有手动 <code>memo</code> / <code>useMemo</code> / <code>useCallback</code>，本质都是在
        <strong>手工告诉 React「这个值/组件可以缓存」</strong>。React 19 引入的
        <strong>React Compiler</strong>（前身代号 React Forget）把这件事<strong>自动化</strong>了：
        它在编译期分析依赖关系，自动为组件和派生值插入记忆化。
      </p>
      <CodeBlock lang="javascript" title="启用 React Compiler（Babel 插件示意）" code={compilerSnippet} />
      <table>
        <thead>
          <tr><th>方面</th><th>手动记忆化</th><th>React Compiler</th></tr>
        </thead>
        <tbody>
          <tr><td>谁来决定缓存</td><td>开发者手写</td><td>编译器自动分析</td></tr>
          <tr><td>易错点</td><td>忘包、依赖数组写错、引用没锁住</td><td>大幅减少这类人为失误</td></tr>
          <tr><td>代码噪音</td><td>到处是 memo/useMemo/useCallback</td><td>代码回归直白</td></tr>
          <tr><td>对手写 memo 的影响</td><td>—</td><td>很多手动记忆化变得多余/可删</td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="编译器不是「不用懂原理」">
        即便用了 Compiler，理解「为什么会重渲染、什么是引用相等」依然重要：它帮你处理常规情况，
        但定位真正的瓶颈、设计合理的状态结构（比如状态下沉），仍然是你的工作。
        在已启用 Compiler 的项目里，新代码通常<strong>不必</strong>再手写 memo；
        是否清理旧的手动记忆化，则按团队规范来。
      </Callout>

      <Callout variant="tip">
        下一章我们换一个维度优化首屏：用代码分割与懒加载，让用户第一眼看到的 bundle 尽量小、加载尽量快。
      </Callout>

      <Summary
        points={[
          '第一原则：先测再优。优化顺序是定位 → 度量 → 改动 → 再度量验证，别过早优化。',
          '定位工具：React DevTools 的 Highlight updates 给直觉、Profiler 给证据（含 Why did this render）。',
          'React.memo 对 props 做浅比较跳过重渲染；但传新建的对象/函数会让浅比较恒为 false，memo 形同虚设。',
          'useCallback 锁函数引用、useMemo 锁对象引用并缓存昂贵计算，二者常需与 memo 搭配才有意义。',
          '状态下沉是性价比最高的手段：把高频 state 关进更小的子组件，缩小重渲染范围；列表项拆分同理。',
          '用 children 组合 / 拆分 Context / value 记忆化，避免 Context 一变就大面积重渲染。',
          'React 19 的 React Compiler 在编译期自动记忆化，让很多手写 memo/useMemo/useCallback 变得多余，但理解原理与定位瓶颈仍是你的事。',
        ]}
      />
    </article>
  )
}
