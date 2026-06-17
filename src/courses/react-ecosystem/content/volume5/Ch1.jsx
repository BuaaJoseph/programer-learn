import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const drillingSnippet = `// prop drilling：theme 要从最外层一路手动往下传
function App() {
  const [theme, setTheme] = useState('light')
  return <Page theme={theme} setTheme={setTheme} />
}

function Page({ theme, setTheme }) {
  // Page 自己根本用不到 theme，纯粹是个「二传手」
  return <Toolbar theme={theme} setTheme={setTheme} />
}

function Toolbar({ theme, setTheme }) {
  // Toolbar 也用不到，继续往下传
  return <ThemeButton theme={theme} setTheme={setTheme} />
}

function ThemeButton({ theme, setTheme }) {
  // 直到这里才真正用到
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      当前：{theme}
    </button>
  )
}`

const liftStateSnippet = `// 状态提升：两个兄弟组件要共享同一份输入值，
// 就把 value 提升到它们最近的公共父级 Form 里。
function Form() {
  const [value, setValue] = useState('')
  return (
    <>
      <Input value={value} onChange={setValue} />
      <Preview value={value} />
    </>
  )
}

function Input({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />
}

function Preview({ value }) {
  return <p>实时预览：{value}</p>
}`

const createContextSnippet = `import { createContext, useContext, useState } from 'react'

// 1. 创建 Context，参数是「没有 Provider 时」的默认值
const ThemeContext = createContext('light')

// 2. 在顶层用 Provider 提供值
function App() {
  const [theme, setTheme] = useState('light')
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  )
}

// 3. 任意深度的后代直接用 useContext 取值，
//    中间的 Page / Toolbar 完全不用管 theme
function ThemeButton() {
  const theme = useContext(ThemeContext)
  return <button>当前：{theme}</button>
}`

const rerenderTrapSnippet = `// 反例：value 每次 render 都是「新对象」，
// 即使 theme / setTheme 没变，引用也变了，
// 所有 useContext 的消费者都会跟着重渲染。
function App() {
  const [theme, setTheme] = useState('light')
  return (
    // {} 字面量每次 render 都是新引用 ☠️
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Page />
    </ThemeContext.Provider>
  )
}`

const memoValueSnippet = `import { createContext, useContext, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function App() {
  const [theme, setTheme] = useState('light')

  // 用 useMemo 包住 value：只有 theme 真正变化时才产出新对象，
  // 引用稳定，消费者不会被「无意义的新引用」带着重渲染。
  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return (
    <ThemeContext.Provider value={value}>
      <Page />
    </ThemeContext.Provider>
  )
}`

const splitContextSnippet = `// 按关注点拆分：把「不常变的 setter」和「常变的 state」分开，
// 只读 setter 的组件不会因为 state 变化而重渲染。
const ThemeStateContext = createContext('light')
const ThemeSetterContext = createContext(() => {})

function App() {
  const [theme, setTheme] = useState('light')
  return (
    <ThemeSetterContext.Provider value={setTheme}>
      <ThemeStateContext.Provider value={theme}>
        <Page />
      </ThemeStateContext.Provider>
    </ThemeSetterContext.Provider>
  )
}

// 只切换主题、不显示主题的按钮，只订阅 setter，theme 变了它不重渲染
function ToggleButton() {
  const setTheme = useContext(ThemeSetterContext)
  return <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>切换</button>
}`

const fullThemeSnippet = `// theme-context.jsx —— 一个可复用的完整 ThemeContext 例子
import { createContext, useContext, useMemo, useState, useCallback } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  // value 用 useMemo 稳定引用；依赖里包含会变的 theme 和稳定的 toggle
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// 自定义 Hook：封装「必须在 Provider 内使用」的校验，调用方更省心
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内部使用')
  }
  return ctx
}`

const useThemeSnippet = `// 业务组件里使用，完全感受不到 prop 传递的存在
import { ThemeProvider, useTheme } from './theme-context.jsx'

function App() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  )
}

function ThemeButton() {
  const { theme, toggle } = useTheme()
  return (
    <button data-theme={theme} onClick={toggle}>
      当前主题：{theme}（点击切换）
    </button>
  )
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        一提到「状态管理」，很多人第一反应就是装 Redux 或 Zustand。但在你引入任何第三方库之前，
        React 已经内置了两件趁手的工具：<strong>状态提升</strong>和 <strong>Context API</strong>。
        这一章我们先把原生方案用好——讲清 prop drilling 的痛点、状态提升的取舍、Context 的正确用法，
        以及最容易踩的「重渲染陷阱」。看懂这一章，你才能判断「到底要不要上状态库」。
      </Lead>

      <h2>一、问题的起点：prop drilling</h2>
      <p>
        React 的数据是<strong>单向自上而下</strong>流动的：父组件通过 props 把数据传给子组件。
        当一份数据只在父子之间传递时，这套机制清爽好用。但现实里经常出现这种情况：
        某个数据在<strong>很深的后代</strong>才被用到，而它和数据源之间隔着好几层「根本用不到这份数据」
        的中间组件。
      </p>
      <p>
        这些中间组件被迫接收 props 再原样往下传，纯粹充当「二传手」。这种<strong>逐层透传</strong>
        的现象就叫 <strong>prop drilling</strong>（属性钻取 / 逐层穿透）。它的代价是：中间组件
        的接口被无关 props 污染、重构时改一处要动一长串、可读性和可维护性双双下降。
      </p>
      <CodeBlock lang="jsx" title="prop drilling：Page 和 Toolbar 只是「二传手」" code={drillingSnippet} />
      <Callout variant="info" title="prop drilling 本身不是 bug">
        逐层传一两层 props 是完全正常的，不必为了「消灭 props」而过度设计。只有当层级很深、
        中间组件明显被无关 props 拖累时，才需要考虑下面的方案。先识别问题，再选工具。
      </Callout>

      <h2>二、第一招：状态提升（Lifting State Up）</h2>
      <KeyIdea>
        当多个组件需要共享同一份状态时，把这份状态<strong>提升到它们最近的公共父级</strong>，
        由父级持有 state，再用 props 把「值」和「修改值的函数」分发下去。这是 React 官方推荐
        的<strong>第一选择</strong>，也是最符合单向数据流的做法。
      </KeyIdea>
      <p>
        典型场景：两个兄弟组件要保持同步——一个负责输入，一个负责展示。它们各自持有 state 会失同步，
        于是把 state 挪到它们的公共父级 <code>Form</code>，让父级成为这份数据的<strong>唯一真相来源</strong>
        （single source of truth）。
      </p>
      <CodeBlock lang="jsx" title="状态提升：把 value 放到公共父级 Form" code={liftStateSnippet} />
      <p>
        状态提升解决了「兄弟共享」，但它<strong>不能解决深层透传</strong>。如果公共父级离消费者很远，
        提升之后照样要 prop drilling 一长串。这时就该请出第二招——Context。
      </p>

      <h2>三、第二招：Context API</h2>
      <p>
        Context 让你绕过中间层，把数据「直达」任意深度的后代，专门用来对付 prop drilling。
        它由三件套组成：
      </p>
      <ul>
        <li><code>createContext(defaultValue)</code>：创建一个 Context 对象，参数是没有 Provider 包裹时的默认值。</li>
        <li><code>{'<Context.Provider value={...}>'}</code>：在组件树某处提供值，包裹住需要访问它的子树。</li>
        <li><code>useContext(Context)</code>：在任意后代里读取最近一个 Provider 提供的值。</li>
      </ul>
      <CodeBlock lang="jsx" title="Context 三件套：create / Provider / useContext" code={createContextSnippet} />
      <p>
        注意上面 <code>Page</code> 和 <code>Toolbar</code> 都消失在视野之外了——它们不再需要声明、
        接收、转发 <code>theme</code>。数据从 Provider「跳」到了真正的消费者手里，
        中间层彻底解脱。这就是 Context 的核心价值。
      </p>

      <h2>四、关键澄清：Context 不是状态管理库</h2>
      <KeyIdea>
        Context 只负责<strong>传递（distribution）</strong>，不负责<strong>高效更新</strong>。
        它解决的是「数据怎么跨层送到」的问题，而不是「数据变化时如何只更新该更新的部分」。
        把 Context 当成 Redux 的替代品，是初学者最常见的误解。
      </KeyIdea>
      <p>
        Context 自身没有任何「选择性订阅」机制：你没法说「我只关心 value 里的某个字段」。
        只要 Provider 的 <code>value</code> 变了，<strong>所有</strong>用了 <code>useContext</code> 的
        消费者都会重渲染——这正是下一节要讲的陷阱根源。真正的状态库（Redux/Zustand）会做细粒度的
        选择性订阅，这是它们和 Context 的本质区别。
      </p>

      <h2>五、Context 的重渲染陷阱</h2>
      <p>
        这是 Context 用错的重灾区。要点只有一句：<strong>Provider 的 value 引用一变，
        所有消费者全部重渲染</strong>。而很多人不知不觉就让 value「每次都变」。
      </p>

      <h3>陷阱一：value 用对象字面量</h3>
      <p>
        当你写 <code>{'value={{ theme, setTheme }}'}</code> 时，这个对象是在每次 <code>App</code> 渲染时
        <strong>新建</strong>的。即使 <code>theme</code> 和 <code>setTheme</code> 都没变，对象的引用也变了。
        React 用 <code>Object.is</code> 比较 value 的新旧引用，发现「不一样」，于是触发<strong>全部</strong>
        消费者重渲染——哪怕它们用的字段压根没动。
      </p>
      <CodeBlock lang="jsx" title="反例：每次 render 都是新对象引用" code={rerenderTrapSnippet} />

      <h3>解法一：用 useMemo 包住 value</h3>
      <p>
        给 value 套一层 <code>useMemo</code>，只有当依赖项真的变化时才产出新对象。引用稳定了，
        消费者就不会被「无意义的新引用」带着空转。
      </p>
      <CodeBlock lang="jsx" title="解法：useMemo 稳定 value 引用" code={memoValueSnippet} />

      <h3>解法二：按关注点拆分多个 Context</h3>
      <p>
        即便 value 引用稳定了，只要 <code>theme</code> 真的变了，所有读 <code>theme</code> 的组件
        都得重渲染——这没问题。但有些组件只用 <code>setTheme</code>（比如一个纯粹的切换按钮），
        它本不该因为 <code>theme</code> 变化而重渲染。把<strong>不常变的 setter</strong> 和
        <strong>常变的 state</strong> 拆进两个 Context，就能让「只读 setter」的组件免于无谓重渲染。
      </p>
      <CodeBlock lang="jsx" title="拆分 Context：state 与 setter 分家" code={splitContextSnippet} />
      <table>
        <thead>
          <tr><th>陷阱</th><th>表现</th><th>解法</th></tr>
        </thead>
        <tbody>
          <tr><td>value 是对象字面量</td><td>每次 render 新引用，消费者全量重渲染</td><td>useMemo 包裹 value</td></tr>
          <tr><td>state 和 setter 混在一个 value</td><td>state 变化拖累只用 setter 的组件</td><td>拆成多个 Context</td></tr>
          <tr><td>把高频变化的值放进 Context</td><td>每次变化触发整棵子树重渲染</td><td>改用真正的状态库 / 局部 state</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="不要把高频变化的值塞进 Context">
        鼠标坐标、滚动位置、每帧动画值这类<strong>高频变化</strong>的数据放进 Context，
        会让整棵消费子树疯狂重渲染。Context 适合<strong>低频</strong>全局值；高频共享状态
        应交给专门的状态库（它们有细粒度订阅）或保持在局部。
      </Callout>

      <h2>六、Context 的适用边界</h2>
      <p>
        总结下来，Context 最适合那种<strong>「全局、低频变化、很多地方要读」</strong>的值。
        典型代表：
      </p>
      <ul>
        <li><strong>主题（theme）</strong>：亮 / 暗模式，全站都要读，但很少切换。</li>
        <li><strong>语言 / 国际化（locale）</strong>：当前语言环境，切换频率极低。</li>
        <li><strong>当前用户 / 登录态</strong>：用户信息、权限，登录后基本不动。</li>
        <li><strong>路由信息</strong>：很多路由库内部就是用 Context 把路由状态传给整棵树。</li>
      </ul>
      <p>
        这些值的共同点是：变化不频繁，所以「全量重渲染」的代价可以接受；而它们又散落在树的各个角落
        被读取，正好发挥 Context「跨层直达」的长处。反过来，频繁变化、需要细粒度更新的复杂业务状态，
        就不该硬塞进 Context——那是下一章状态库的舞台。
      </p>

      <h2>七、完整示例：一个可复用的 ThemeContext</h2>
      <p>
        把前面的最佳实践串起来，做一个真正能用的 <code>ThemeProvider</code>。要点有三：
        用 <code>useMemo</code> 稳定 value、用 <code>useCallback</code> 稳定 toggle、
        再封装一个 <code>useTheme</code> 自定义 Hook 把「必须在 Provider 内使用」的校验藏起来。
      </p>
      <CodeBlock lang="jsx" title="theme-context.jsx：完整可复用实现" code={fullThemeSnippet} />
      <CodeBlock lang="jsx" title="业务组件里的用法" code={useThemeSnippet} />
      <Example title="为什么要封装 useTheme 自定义 Hook">
        <p>
          直接暴露 <code>useContext(ThemeContext)</code> 的话，调用方拿到的可能是默认值 <code>null</code>，
          一旦忘了套 Provider，就会在「读 <code>ctx.theme</code>」时报一句莫名其妙的错。
        </p>
        <p>
          封装成 <code>useTheme</code> 后，校验集中在一处：没在 Provider 内使用就<strong>立刻</strong>
          抛出一句人话错误信息。调用方代码更短，出错也更好排查。这是社区里 Context 的标准封装套路。
        </p>
      </Example>

      <Callout variant="tip">
        下一章我们进入真正的状态管理库：Redux Toolkit 与 Zustand。你会看到它们如何用
        <strong>细粒度订阅</strong>解决 Context 解决不了的「高效更新」问题，以及两种截然不同的设计范式。
      </Callout>

      <Summary
        points={[
          'prop drilling 指数据逐层透传，中间组件被迫当「二传手」，层级很深时才需要处理，浅层透传是正常的。',
          '状态提升是官方第一选择：把共享状态放到最近公共父级，作为唯一真相来源，但解决不了深层透传。',
          'Context 三件套 createContext / Provider / useContext 让数据跨层直达任意后代，专治 prop drilling。',
          'Context 只负责「传递」不负责「高效更新」，它没有选择性订阅，不是 Redux 的替代品。',
          '重渲染陷阱：value 用对象字面量每次新引用导致消费者全量重渲染，用 useMemo 稳定 value、按关注点拆分多个 Context。',
          'Context 适用边界是主题 / 语言 / 当前用户这类全局且低频变化的值；高频变化的复杂状态应交给专门的状态库。',
        ]}
      />
    </article>
  )
}
