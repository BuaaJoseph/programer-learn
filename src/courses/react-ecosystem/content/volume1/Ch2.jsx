import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const basicProps = `// 组件就是一个接收 props 对象、返回 Element 的函数
function Welcome(props) {
  return <h1>你好，{props.name}</h1>
}

// 使用：传进去的属性会被打包成 props 对象
<Welcome name="小明" />
// 等价于函数调用 Welcome({ name: '小明' })`

const destructuring = `// 直接在参数里解构，读起来更清爽
function Welcome({ name, role }) {
  return <h1>{name}（{role}）</h1>
}

// 带默认值：调用时没传就用默认
function Button({ text = '确定', type = 'primary' }) {
  return <button className={type}>{text}</button>
}

<Button />              // text='确定' type='primary'
<Button text="提交" />  // text='提交' type='primary'`

const readonlyProps = `// 纯函数式组件：相同输入必得相同输出，绝不修改入参
function Price({ amount }) {
  // amount = amount * 1.1   // ❌ 永远不要改 props！
  const withTax = amount * 1.1   // ✅ 算到新变量里
  return <span>{withTax} 元</span>
}`

const childrenCode = `// children 是一个特殊 prop：标签之间的内容
function Card({ title, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="card-body">{children}</div>
    </div>
  )
}

// 使用：开闭标签之间的一切都成为 children
<Card title="公告">
  <p>今天放假</p>
  <button>知道了</button>
</Card>`

const compositionCode = `// 组合优于继承：用 children / 具名 props 拼装，而不是继承
function Dialog({ header, children, footer }) {
  return (
    <div className="dialog">
      <header>{header}</header>
      <main>{children}</main>
      <footer>{footer}</footer>
    </div>
  )
}

<Dialog header={<h2>确认删除</h2>} footer={<button>取消</button>}>
  <p>此操作不可撤销，确定继续？</p>
</Dialog>`

const dataDownEventsUp = `// 父组件：持有数据（state），把数据向下传、把回调向下传
function Parent() {
  const [count, setCount] = React.useState(0)

  // 事件向上：子组件触发时调这个回调，由父来改 state
  function handleAdd(step) {
    setCount(c => c + step)
  }

  return (
    <div>
      <p>父组件当前计数：{count}</p>
      {/* 数据向下：count 作为 prop 传给子 */}
      {/* 行为向上：把 handleAdd 作为回调传给子 */}
      <Child value={count} onAdd={handleAdd} />
    </div>
  )
}

// 子组件：只负责显示 props.value，点击时调用 props.onAdd 通知父
function Child({ value, onAdd }) {
  return (
    <div className="child">
      <span>子组件看到的值：{value}</span>
      <button onClick={() => onAdd(1)}>+1</button>
      <button onClick={() => onAdd(5)}>+5</button>
    </div>
  )
}`

const spreadProps = `// props 透传：把一组 props 用展开运算符整体转发给下层
function PrimaryButton(props) {
  // 接收所有 props，原样转发给原生 button，再补一个固定 className
  return <button {...props} className="primary" />
}

<PrimaryButton onClick={save} disabled={loading}>保存</PrimaryButton>
// onClick、disabled、children 都被透传进真正的 button`

const keyInList = `const users = [
  { id: 101, name: '小明' },
  { id: 102, name: '小红' },
]

// 列表里给每个子组件加稳定的 key（用数据 id，不要用下标）
<ul>
  {users.map(u => (
    <UserRow key={u.id} name={u.name} />
  ))}
</ul>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们看清了单个元素的本质：JSX 编译成创建 Element 对象的函数调用。这一章把视角放大到
        「多个组件如何协作」。React 应用是一棵组件树，数据在树里如何流动，决定了整个应用是清晰
        还是混乱。React 给出的答案非常明确：<strong>数据自上而下、单向流动</strong>，靠的就是 Props。
        理解 Props 的只读性、children 与组合、以及「数据向下、事件向上」这套模式，你就掌握了
        React 数据流的全部地基。
      </Lead>

      <h2>一、组件就是接收 props 的函数</h2>
      <p>
        函数组件，本质上就是一个普通的 JavaScript 函数：它接收一个参数（习惯叫 <code>props</code>），
        返回一段 JSX（也就是 Element 树）。当你在别处写 <code>{'<Welcome name="小明" />'}</code> 时，
        React 会把所有属性收集成一个对象 <code>{"{ name: '小明' }"}</code>，作为参数调用这个函数。
        所以「传 props」和「调函数传参」是同一件事。
      </p>
      <CodeBlock lang="jsx" title="props 就是函数的参数" code={basicProps} />
      <KeyIdea>
        Props 是父组件传给子组件的数据，是组件的「输入参数」。它的流向是<strong>单向且自上而下</strong>的：
        父可以决定传什么给子，子<strong>不能</strong>反过来修改父传来的值，也不能把数据塞回父。
        这种单向数据流让「数据从哪来、被谁改」始终可追溯，是 React 可维护性的核心。
      </KeyIdea>

      <h2>二、解构与默认值</h2>
      <p>
        每次都写 <code>props.xxx</code> 很啰嗦。实践中几乎都在函数参数处直接<strong>解构</strong>，
        把要用的字段一次性取出来；还能就地给<strong>默认值</strong>，调用方没传时自动兜底。
      </p>
      <CodeBlock lang="jsx" title="参数解构 + 默认值" code={destructuring} />
      <Callout variant="tip" title="默认值写在解构里">
        默认值用 JS 原生的解构默认语法 <code>{"{ text = '确定' }"}</code> 就能实现，不需要额外的库
        或 API。注意默认值只在该 prop 为 <code>undefined</code>（没传）时生效；如果父明确传了
        <code>null</code>，默认值<strong>不会</strong>触发。
      </Callout>

      <h2>三、Props 是只读的</h2>
      <p>
        这是一条<strong>铁律</strong>：组件绝对不能修改自己收到的 props。React 把函数组件设计成
        <strong>纯函数</strong>——给定相同的 props，必须返回相同的结果，并且不产生副作用（包括不改入参）。
        如果你在组件里写 <code>props.x = 1</code> 或 <code>props.list.push(...)</code>，就破坏了这份契约，
        会导致难以追踪的 bug：父组件以为数据没变，界面却悄悄变了。
      </p>
      <CodeBlock lang="jsx" title="算到新变量，绝不改 props" code={readonlyProps} />
      <Callout variant="warn" title="只读包括引用类型">
        「只读」不仅指不能重新赋值标量 prop，也指不能<strong>就地修改</strong>传进来的对象 / 数组
        （比如 <code>props.user.age = 18</code> 或 <code>props.items.sort()</code>）。需要变化后的数据时，
        应基于原值<strong>派生出新值</strong>（用 <code>map</code>、展开运算符等），而不是改动原对象。
        真正要「改」数据，得由持有它的那个父组件通过 state 去改（见第六节）。
      </Callout>

      <h2>四、children：标签之间的内容</h2>
      <p>
        <code>children</code> 是一个特殊的 prop：它装的是组件开闭标签<strong>之间</strong>的内容。
        你不用手动声明它，React 会自动把标签中间的一切（文本、元素、其他组件）作为
        <code>props.children</code> 传进来。这让组件能像「容器」一样包裹任意内容。
      </p>
      <CodeBlock lang="jsx" title="children 让组件成为容器" code={childrenCode} />

      <h2>五、组合优于继承</h2>
      <p>
        在很多面向对象语言里，复用靠<strong>继承</strong>（一个类继承另一个类）。React 官方明确推荐
        <strong>组合（composition）而非继承</strong>来复用 UI。做法就是用 <code>children</code> 和
        具名的「插槽」prop 把内容拼装进来——一个通用的 <code>Dialog</code> 框架，通过 <code>header</code>、
        <code>footer</code>、<code>children</code> 接收不同的内容，就能拼出无数种弹窗，而不需要派生出
        <code>DeleteDialog</code>、<code>ConfirmDialog</code> 一堆子类。
      </p>
      <CodeBlock lang="jsx" title="用组合拼装通用容器" code={compositionCode} />
      <Example title="为什么组合更好">
        <p>
          继承会把父子类紧紧绑死，改父类容易牵连一片；而组合是「把零件传进去」，调用方自由决定塞
          什么内容，组件之间只通过 props 这个清晰的接口连接。React 里几乎所有「复用」需求，都能用
          组合 + props 解决，很少需要继承。
        </p>
      </Example>

      <h2>六、数据向下，事件向上</h2>
      <p>
        既然数据单向往下流、props 又只读，那子组件怎么「改变」东西？答案是经典的
        <strong>「数据向下、事件向上」</strong>模式：状态（state）由上层组件持有，向下作为 props 传给子；
        子组件想改动时，<strong>不直接改</strong>，而是调用父通过 props 传下来的<strong>回调函数</strong>，
        由父来更新自己的 state。state 一变，新值又作为 props 流下来，界面随之更新。数据往下、通知往上，
        形成一个清晰的闭环。
      </p>
      <CodeBlock lang="jsx" title="父持有 state，子通过回调通知父" code={dataDownEventsUp} />
      <p>
        看清这段代码的两条线：① <code>count</code> 作为 <code>value</code> 这个 prop <strong>向下</strong>
        流进 <code>Child</code>；② <code>Child</code> 点击按钮时调用 <code>onAdd</code>（其实就是父的
        <code>handleAdd</code>），把「我要加几」这个意图<strong>向上</strong>传，真正改 state 的动作仍发生在父里。
        子组件自始至终没有碰过 props，它只是「显示数据 + 上报事件」。
      </p>
      <KeyIdea>
        子组件不拥有数据，也不修改数据。它只做两件事：渲染父传下来的 props、在交互时调用父传下来的
        回调把事件上报。「谁拥有 state，谁负责改它」——这是 React 里定位数据归属的金科玉律。
      </KeyIdea>

      <h2>七、props 透传与 key</h2>
      <h3>props 透传（展开运算符）</h3>
      <p>
        当你写一个对原生元素的薄封装时，常想把收到的一堆 props 原样转发下去。用展开运算符
        <code>{'{...props}'}</code> 可以把一个对象的所有字段一次性铺到 JSX 属性上，省去逐个手写。
      </p>
      <CodeBlock lang="jsx" title="用 {'{...props}'} 透传" code={spreadProps} />
      <Callout variant="note" title="透传的顺序有讲究">
        展开和显式属性的<strong>书写顺序</strong>决定谁覆盖谁：后写的覆盖先写的。上例里
        <code>className="primary"</code> 写在 <code>{'{...props}'}</code> 之后，所以即便调用方也传了
        className，最终也会被 <code>"primary"</code> 覆盖。想让外部能覆盖默认值，就把展开放在后面。
      </Callout>

      <h3>列表里的 key</h3>
      <p>
        当组件出现在 <code>map</code> 渲染的列表里时，每个都要带 <code>key</code>。如上一章所讲，
        <code>key</code> 是 React 用来识别列表项身份的特殊标识，<strong>不会</strong>作为普通 prop
        传进子组件——子组件读 <code>props.key</code> 是 <code>undefined</code>。key 要用数据里稳定唯一的
        id，不要用数组下标（除非列表永不重排）。
      </p>
      <CodeBlock lang="jsx" title="列表项用稳定 id 作 key" code={keyInList} />

      <h2>八、Props vs State：一张表理清</h2>
      <p>
        初学最容易混淆 props 和 state。一句话区分：<strong>props 是「别人给我的」，state 是「我自己的」</strong>。
        props 由父传入、对当前组件只读、变化由父驱动；state 由组件自己持有、可以通过专门的设置函数
        修改、变化由组件自己驱动。两者改变都会触发重新渲染。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Props</th><th>State</th></tr>
        </thead>
        <tbody>
          <tr><td>来源</td><td>父组件传入</td><td>组件自己内部创建</td></tr>
          <tr><td>可写性</td><td>只读，不可修改</td><td>可改（通过 setState / useState 的更新函数）</td></tr>
          <tr><td>归属</td><td>属于父，子只是使用</td><td>属于组件自己</td></tr>
          <tr><td>谁来改</td><td>父组件改了再传下来</td><td>组件自己改</td></tr>
          <tr><td>流向</td><td>自上而下单向流动</td><td>组件内部，配合回调向上影响父的 state</td></tr>
          <tr><td>变化是否触发重渲染</td><td>是</td><td>是</td></tr>
          <tr><td>类比</td><td>函数的入参</td><td>函数内部的局部记忆</td></tr>
        </tbody>
      </table>

      <Callout variant="tip">
        到这里，你已经掌握了 React 数据流的全部地基：组件是接收 props 的函数，props 自上而下且只读，
        children 与组合负责拼装结构，「数据向下、事件向上」让交互闭环成立。下一章我们将深入 state 与
        <code>useState</code>，看组件如何拥有并管理自己的「记忆」，让界面真正动起来。
      </Callout>

      <Summary
        points={[
          '函数组件本质是接收 props 对象、返回 Element 的函数；写 <Comp x="1" /> 等价于调用 Comp({ x: "1" })。',
          'Props 是组件的输入，单向且自上而下流动，并且只读——组件绝不能修改收到的 props（包括就地改对象/数组）。',
          '实践中在参数处解构并给默认值；默认值只在 prop 为 undefined 时生效，传 null 不会触发。',
          'children 是特殊 prop，装着开闭标签之间的内容；React 推崇组合优于继承，用 children 和具名插槽 prop 拼装通用容器。',
          '“数据向下、事件向上”：state 由上层持有并作为 props 下传，子组件通过调用父传下的回调来上报事件，由父去改 state。',
          'props 透传用 {...props}，注意书写顺序决定覆盖关系；列表用稳定 id 作 key（key 不作为 prop 传入）。Props 是“别人给的、只读”，State 是“自己的、可改”。',
        ]}
      />
    </article>
  )
}
