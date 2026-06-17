import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const counterSnippet = `import { useState, useEffect } from 'react'

function Counter() {
  // useState 给函数组件加上"状态"：count 是当前值，setCount 用来更新它
  const [count, setCount] = useState(0)

  // useEffect 给函数组件加上"副作用"：渲染提交后同步标题
  useEffect(() => {
    document.title = \`你点了 \${count} 次\`
  }, [count])

  return <button onClick={() => setCount(count + 1)}>点击 {count}</button>
}`

const classVsHookSnippet = `// 旧时代：class 组件用生命周期方法拼凑逻辑
class Profile extends React.Component {
  componentDidMount()    { this.subscribe() }
  componentDidUpdate()   { /* 还得手动判断 props 是否变了再重新订阅 */ }
  componentWillUnmount() { this.unsubscribe() }
}

// Hooks 时代：同一段"订阅 + 取消订阅"的逻辑收在一个 useEffect 里
function Profile() {
  useEffect(() => {
    subscribe()
    return () => unsubscribe() // 清理就写在旁边，不再散落在三个方法里
  }, [])
}`

const wrongConditionalSnippet = `function Bad({ isLoggedIn }) {
  // 错误：把 hook 放进了条件分支
  if (isLoggedIn) {
    const [name, setName] = useState('') // 违反规则！
  }

  // 错误：把 hook 放进了循环
  for (let i = 0; i < count; i++) {
    useEffect(() => {}) // 违反规则！
  }

  // 错误：提前 return 之后还有 hook
  if (!isLoggedIn) return null
  const [age, setAge] = useState(0) // 这个 hook 可能被跳过，顺序就乱了
}`

const fiberListSnippet = `// React 内部大致是这样把 hook 按"顺序"挂到 fiber 上的链表里（高度简化）
let currentFiber       // 当前正在渲染的组件对应的 fiber 节点
let hookIndex = 0      // 本次渲染调用到第几个 hook

function useState(initial) {
  const hooks = currentFiber.memoizedState // 一个按调用顺序排列的链表 / 数组
  const hook = hooks[hookIndex] ?? { state: initial }
  hooks[hookIndex] = hook
  hookIndex++            // 关键：每调用一个 hook，索引就 +1
  return [hook.state, (next) => { hook.state = next; scheduleRender() }]
}

// 第 1 次渲染：useState→index 0, useState→index 1, useEffect→index 2
// 第 2 次渲染：必须以"完全相同的顺序"再走一遍，index 才能一一对上
// 一旦某次渲染因为条件分支少调用了一个 hook，后面所有 hook 的 index 全部错位`

const closureTrapSnippet = `function Timer() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      // 陷阱：这里的 count 是"首次渲染那一刻"被闭包捕获的快照，永远是 0
      console.log(count)
      setCount(count + 1) // 永远在算 0 + 1，所以 count 卡在 1
    }, 1000)
    return () => clearInterval(id)
  }, []) // 空依赖：effect 只在挂载时跑一次，闭包里的 count 就此定格

  return <p>{count}</p>
}`

const closureFixSnippet = `function Timer() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      // 修复一：用函数式更新，c 是 React 给的"最新值"，不依赖闭包里的 count
      setCount((c) => c + 1)
    }, 1000)
    return () => clearInterval(id)
  }, []) // 依赖数组可以保持为空，因为我们不再读取闭包里的 count

  return <p>{count}</p>
}

// 修复二：把 count 放进依赖数组，让 effect 每次 count 变化都重建，
// 闭包里就能拿到新的 count——代价是定时器会被反复清掉重建。`

const eslintSnippet = `// .eslintrc 里启用官方插件（React 19 起被并入 eslint-plugin-react-hooks）
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",     // 强制两条规则：顶层调用 + 只在 React 函数里调用
    "react-hooks/exhaustive-deps": "warn"      // 检查 effect/callback 的依赖数组是否完整
  }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Hooks 是 React 16.8 引入的一组函数，它让原本"无状态"的函数组件也能拥有
        状态、副作用、上下文等能力，从此函数组件可以完全替代 class 组件。
        但 Hooks 有两条铁律，背后藏着一个并不直观的底层机制：React 靠
        <strong>调用顺序</strong>而不是名字来识别每一个 hook。这一章我们讲清 Hooks 是什么、
        为什么引入、两条规则的由来，以及绕不开的"闭包陷阱"。
      </Lead>

      <h2>一、Hooks 是什么，为什么要引入</h2>
      <p>
        在 Hooks 出现之前，函数组件只能做一件事：接收 props，返回 JSX。它没有自己的状态，
        也没法在挂载 / 更新 / 卸载时做副作用——这些能力全都被锁在 class 组件里。于是大家被迫
        在"简单但无能"的函数组件和"功能完整但啰嗦"的 class 组件之间二选一。
      </p>
      <p>
        Hooks 打破了这个局面。它是一组以 <code>use</code> 开头的函数（<code>useState</code>、
        <code>useEffect</code>、<code>useRef</code>……），让你在函数组件里"钩入"React 的状态与生命周期。
        从此函数组件可以拥有一切能力，class 组件不再是必需品。
      </p>
      <CodeBlock lang="jsx" title="一个最小的有状态 + 有副作用的函数组件" code={counterSnippet} />

      <h3>它解决了 class 的什么痛点</h3>
      <p>
        引入 Hooks 不只是"语法更短"，更重要的是它解决了 class 组件几个长期的结构性问题：
      </p>
      <table>
        <thead>
          <tr><th>class 的痛点</th><th>Hooks 如何解决</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>相关逻辑被生命周期方法拆散（订阅在 didMount、取消在 willUnmount）</td>
            <td>一个 <code>useEffect</code> 把"建立 + 清理"写在一起，按关注点聚合</td>
          </tr>
          <tr>
            <td>复用有状态逻辑要靠 HOC / render props，嵌套层层叠叠</td>
            <td>自定义 Hook 直接抽取并复用有状态逻辑，没有额外嵌套</td>
          </tr>
          <tr>
            <td><code>this</code> 指向令人困惑，方法要手动 bind</td>
            <td>函数组件里没有 <code>this</code>，闭包直接捕获变量</td>
          </tr>
          <tr>
            <td>生命周期方法里塞了不相关的逻辑（既订阅又改标题）</td>
            <td>按副作用拆成多个 <code>useEffect</code>，各管各的</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock lang="jsx" title="同一段订阅逻辑：class 生命周期 vs useEffect" code={classVsHookSnippet} />

      <h2>二、两条 Hooks 规则</h2>
      <KeyIdea>
        Hooks 只有两条规则：① <strong>只在最顶层调用 Hook</strong>——不要写在条件、循环、
        嵌套函数里；② <strong>只在 React 函数里调用 Hook</strong>——React 函数组件，或自定义 Hook 里，
        不要在普通 JS 函数里调用。
      </KeyIdea>
      <p>
        第二条比较好理解：Hook 要靠 React 的渲染机制才能工作，普通函数里没有"当前正在渲染的组件"
        这个上下文，调用会直接报错。真正反直觉、也最容易踩坑的是第一条——为什么不能写在
        <code>if</code> 或 <code>for</code> 里？
      </p>
      <CodeBlock lang="jsx" title="四种违反规则的写法" code={wrongConditionalSnippet} />

      <h2>三、底层原理：React 靠"调用顺序"识别 Hook</h2>
      <p>
        这是整章最重要的部分。你写 <code>const [count, setCount] = useState(0)</code> 时，
        并没有给这个 state 起名字告诉 React"我叫 count"。那 React 在第二次渲染时，
        是怎么知道"这一次的 <code>useState</code> 对应的就是上一次那个 count"的呢？
      </p>
      <p>
        答案是：<strong>靠调用顺序</strong>。每个组件实例在 React 内部对应一个 fiber 节点，
        fiber 上挂着一条按调用顺序排列的 hook 链表。第一次渲染时，React 依次走过你的 hook 调用，
        把它们一个个 push 进链表：第 0 个 hook、第 1 个 hook、第 2 个……。后续每次渲染，
        React 都假设你会以<strong>完全相同的顺序</strong>再调用一遍，于是按索引一一对应：
        这次的第 0 个 hook 取上次第 0 个的状态，第 1 个取第 1 个的，依此类推。
      </p>
      <CodeBlock lang="js" title="极简伪代码：hook 如何按索引挂到 fiber 上" code={fiberListSnippet} />
      <p>
        现在就能解释第一条规则了：一旦你把 hook 放进 <code>if</code>，某次渲染条件为 false 时
        这个 hook 不被调用，链表索引就会<strong>整体错位</strong>——后面所有 hook 都会去读到
        "上一个位置"的状态。React 拿不到名字校验，只能信任顺序；顺序一乱，状态就全部对错位置，
        轻则数据错乱，重则直接崩溃。
      </p>
      <Example title="错位是如何发生的">
        <p>
          假设组件里依次有 <code>useState(name)</code>、<code>useState(age)</code>、
          <code>useEffect(...)</code>。如果把第一个 <code>useState</code> 包进
          <code>{'if (cond) { ... }'}</code>：
        </p>
        <ul>
          <li>cond 为 true 时：name 在索引 0，age 在索引 1，effect 在索引 2，一切正常。</li>
          <li>cond 变成 false 时：name 那行被跳过，于是 age 跑到了索引 0，effect 跑到索引 1。</li>
          <li>结果：age 读到了原本属于 name 的存储槽，状态彻底错乱。</li>
        </ul>
        <p>正确做法是把条件放进 hook 内部，而不是把 hook 放进条件外部。</p>
      </Example>

      <h2>四、闭包陷阱：捕获的是某次渲染的快照</h2>
      <p>
        理解了"每次渲染都是一次独立的函数调用"之后，闭包陷阱就好懂了。每次渲染时，组件函数
        会重新执行一遍，函数体里的 <code>count</code>、props 都是<strong>那一次渲染</strong>的值——
        它们像被定格的快照。你在 effect 或事件回调里写的箭头函数，会通过闭包捕获这些快照值。
      </p>
      <CodeBlock lang="jsx" title="经典陷阱：定时器里的 count 永远是旧值" code={closureTrapSnippet} />
      <p>
        上面这个定时器看起来应该每秒 +1，实际却卡在 1。原因是 effect 用了空依赖数组，
        只在挂载时执行一次，里面的箭头函数捕获的是<strong>首次渲染时 count 的值（0）</strong>。
        之后无论 count 怎么变，这个回调里读到的永远是那个 0 的快照，所以一直在算
        <code>0 + 1</code>。
      </p>
      <CodeBlock lang="jsx" title="两种修复方式" code={closureFixSnippet} />
      <Callout variant="info" title="为什么函数式更新能绕开陷阱">
        <code>{'setCount(c => c + 1)'}</code> 里的 <code>c</code> 不是来自闭包，而是 React
        在更新时<strong>主动传入的最新状态</strong>。所以即使回调本身被定格在某次渲染，
        它拿到的 <code>c</code> 也始终是最新值。只要你的更新只依赖前一个状态，就优先用函数式更新。
      </Callout>

      <h2>五、ESLint 插件：让规则自动化</h2>
      <p>
        两条规则光靠人脑记不可靠，幸好官方提供了 ESLint 插件帮你自动检查。它有两条核心规则，
        几乎是每个 React 项目的标配。
      </p>
      <table>
        <thead>
          <tr><th>规则</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>react-hooks/rules-of-hooks</code></td>
            <td>强制本章的两条规则：检测到 hook 写在条件 / 循环 / 普通函数里就报错</td>
          </tr>
          <tr>
            <td><code>react-hooks/exhaustive-deps</code></td>
            <td>检查 <code>useEffect</code> / <code>useCallback</code> 等的依赖数组是否
              完整地列出了内部用到的所有响应式值，缺了就警告</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock lang="json" title="启用官方 Hooks 插件" code={eslintSnippet} />
      <Callout variant="warn" title="不要随便忽略 exhaustive-deps 警告">
        很多新手图省事直接 <code>{'// eslint-disable-next-line'}</code> 把依赖警告关掉，
        这往往正是闭包陷阱的源头。正确姿势是：要么把依赖补全，要么改用函数式更新 / <code>useRef</code>
        从根本上消除对该依赖的需要。只有在你完全清楚后果时才忽略它。
      </Callout>

      <h2>六、小结前的几个边界提醒</h2>
      <ul>
        <li>每次渲染都是组件函数的一次全新执行，里面的变量都是该次渲染的快照——这是理解 Hooks 的总钥匙。</li>
        <li>条件渲染本身没问题，问题在于"条件地调用 hook"；把条件挪到 hook 内部即可。</li>
        <li>自定义 Hook 也算"React 函数"，可以在里面调用其它 hook；普通工具函数不行。</li>
        <li>事件回调和 effect 捕获快照的机制完全一样，函数式更新和 ref 是两条常用的绕开手段。</li>
      </ul>

      <Callout variant="tip">
        下一章我们专攻 <code>useEffect</code>：它到底什么时候跑、依赖数组的三种形态各是什么语义、
        清理函数怎么用、StrictMode 为什么让 effect 跑两次，以及那条重要的官方建议——
        "你可能并不需要 Effect"。
      </Callout>

      <Summary
        points={[
          'Hooks 是一组以 use 开头的函数，让函数组件拥有状态与副作用，从此可以完全替代 class 组件。',
          '相比 class，Hooks 把相关逻辑按关注点聚合，便于复用有状态逻辑，也消除了 this 与 bind 的困扰。',
          '两条规则：只在最顶层调用 Hook、只在 React 函数（组件 / 自定义 Hook）里调用 Hook。',
          '底层机制：React 靠"调用顺序"按索引把每次渲染的 hook 映射到 fiber 的链表节点上，所以顺序一乱状态就错位。',
          '闭包陷阱：effect / 回调捕获的是某次渲染的 state 快照；用函数式更新或补全依赖来绕开。',
          'ESLint 官方插件提供 rules-of-hooks（强制规则）与 exhaustive-deps（检查依赖），不要随意忽略后者。',
        ]}
      />
    </article>
  )
}
