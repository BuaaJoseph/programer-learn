import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jsxVsCall = `// 你写的 JSX
const el = <h1 className="t">Hi</h1>

// 编译后（经典 React.createElement 转换）
const el = React.createElement('h1', { className: 't' }, 'Hi')`

const elementObject = `// React.createElement 返回的，其实是一个普通的 JS 对象
const el = {
  $$typeof: Symbol.for('react.element'),
  type: 'h1',                 // 标签名字符串，或组件函数 / 类
  key: null,                  // 列表里用来标识身份
  ref: null,
  props: {                    // 所有属性 + children 都塞进 props
    className: 't',
    children: 'Hi',
  },
}`

const newTransform = `// React 17+ 的「新 JSX 转换」：不再依赖作用域里的 React
// 编译器自动从 react/jsx-runtime 引入 jsx / jsxs
import { jsx as _jsx } from 'react/jsx-runtime'

const el = _jsx('h1', { className: 't', children: 'Hi' })

// 多个 children 时用 jsxs（s = static array）
import { jsxs as _jsxs } from 'react/jsx-runtime'
const list = _jsxs('ul', { children: [_jsx('li', { children: 'a' }), _jsx('li', { children: 'b' })] })`

const nestedCompile = `// 嵌套 JSX
const tree = (
  <section className="box">
    <h2>标题</h2>
    <p>正文</p>
  </section>
)

// 编译后：children 从外到内层层嵌套的 createElement 调用
const tree = React.createElement(
  'section',
  { className: 'box' },
  React.createElement('h2', null, '标题'),
  React.createElement('p', null, '正文'),
)`

const componentCompile = `// 首字母大写 = 组件，编译时 type 是函数本身（不是字符串）
function Card({ title }) {
  return <div className="card">{title}</div>
}

const used = <Card title="Hello" />
// 编译后：
const used = React.createElement(Card, { title: 'Hello' })
//                                ^^^^ 传的是函数引用，不是 'Card' 字符串`

const fragmentCode = `// 不想多包一层 DOM 节点时用 Fragment
function Row() {
  return (
    <>
      <td>姓名</td>
      <td>年龄</td>
    </>
  )
}
// <>...</> 编译成 React.createElement(React.Fragment, null, ...)`

const interpolation = `const name = '小明'
const age = 18
const user = { city: '杭州' }

const el = (
  <p>
    {name}今年{age}岁，来自{user.city}。
    {/* 这是 JSX 注释，也是用大括号包起来的表达式 */}
    {1 + 1 === 2 ? '加法正常' : '世界崩了'}
  </p>
)`

const listRender = `const fruits = ['苹果', '香蕉', '橘子']

const list = (
  <ul>
    {fruits.map((fruit, i) => (
      <li key={i}>{fruit}</li>
    ))}
  </ul>
)
// map 返回一个元素数组，React 直接接受数组作为 children`

const conditional = `const isLoggedIn = true
const count = 3

const view = (
  <div>
    {/* 逻辑与：左边为真才渲染右边；为假渲染 false（不显示） */}
    {isLoggedIn && <span>欢迎回来</span>}

    {/* 三元：二选一 */}
    {count > 0 ? <p>有 {count} 条消息</p> : <p>没有新消息</p>}
  </div>
)`

const badStatement = `// 这样写会报错：if 是语句，不能放进大括号
// <div>{ if (x) { ... } }</div>   // SyntaxError

// 正确做法 1：在 JSX 之外用 if 算好，再插值
let label
if (count > 0) label = '有消息'
else label = '空'
const ok = <div>{label}</div>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        很多人写了很久 React，脑子里还把 JSX 当成「一种 HTML 模板」或「一段会被替换的字符串」。
        这是误会。JSX 既不是字符串，也不是 HTML，它是 JavaScript 的<strong>语法糖</strong>——
        在送进浏览器之前，构建工具会把它编译成一串普通的函数调用，调用的结果是一个普通的 JS 对象。
        这一章我们把这层糖剥开，看清你写的每一段尖括号最后变成了什么，并把 JSX 的所有书写规则
        逐条讲透。理解了「它编译成什么」，后面所有看似奇怪的规则都会变得理所当然。
      </Lead>

      <h2>一、JSX 不是 HTML，是 JavaScript 表达式</h2>
      <p>
        先纠正三个最常见的错误印象。第一，JSX 不是字符串——它没有引号包着，你也不能直接把它
        拼接、截取。第二，JSX 不是 HTML——它长得像 HTML，但属性名、事件、注释的写法都不一样，
        因为它最终要变成 JS。第三，浏览器<strong>看不懂</strong> JSX——浏览器只认识 JavaScript，
        所以 JSX 必须先经过 Babel（或 SWC、esbuild、TypeScript 编译器）这类工具转译成普通 JS 才能运行。
      </p>
      <KeyIdea>
        JSX 是一段会被编译的语法糖。每一个 <code>{'<标签>'}</code> 最终都会被翻译成一次函数调用，
        这个函数（旧式是 <code>React.createElement</code>，新式是 <code>jsx()</code>）返回一个描述
        UI 的普通对象——React Element。你写的是「长得像标签的 JS」，运行的是「对象」。
      </KeyIdea>
      <p>
        既然 JSX 是 JS 表达式，它就遵循表达式的一切规则：可以赋值给变量、可以作为函数参数、
        可以从函数里 <code>return</code>、可以放进数组。下面这点尤其重要——既然一段 JSX 求值后
        是一个对象，那它当然能被存进变量：
      </p>
      <CodeBlock lang="jsx" title="JSX 就是一个能赋值的表达式" code={jsxVsCall} />

      <h2>二、编译成什么：createElement 调用</h2>
      <p>
        看上面那段对比的下半部分。<code>{'<h1 className="t">Hi</h1>'}</code> 被编译成了
        <code>{"React.createElement('h1', { className: 't' }, 'Hi')"}</code>。三个参数分别是：
      </p>
      <ul>
        <li><strong>第一个参数 type</strong>：标签名（普通 HTML 标签是字符串 <code>'h1'</code>）。</li>
        <li><strong>第二个参数 props</strong>：一个对象，装着所有属性，比如 <code>{"{ className: 't' }"}</code>；没有属性时是 <code>null</code>。</li>
        <li><strong>第三个及以后的参数</strong>：children（子节点），这里是文本 <code>'Hi'</code>。</li>
      </ul>
      <Callout variant="note" title="为什么是 className 而不是 class">
        因为编译后是 JavaScript，而 <code>class</code> 在 JS 里是保留关键字（用来声明类）。
        为了不冲突，React 用 <code>className</code> 代替。同理，HTML 的 <code>for</code> 属性
        （label 关联表单控件用）在 JSX 里写成 <code>htmlFor</code>，因为 <code>for</code> 也是
        JS 的循环关键字。这些不是 React 故意为难你，而是「它最终是 JS」这一事实的必然结果。
      </Callout>

      <h2>三、createElement 返回什么：一个普通对象</h2>
      <p>
        关键中的关键：<code>React.createElement(...)</code> 并不会创建任何真实的 DOM 节点，
        它只是返回一个轻量的普通 JavaScript 对象，这个对象叫 <strong>React Element</strong>。
        它就是对「我想要长成什么样」的一份描述（descriptor），是一张蓝图，不是房子本身。
      </p>
      <CodeBlock lang="js" title="React Element 的真面目" code={elementObject} />
      <p>
        注意三个字段：<code>type</code> 记录这是什么（标签名或组件），<code>props</code> 装着
        所有属性<strong>以及 children</strong>（是的，子节点最后也被收进了 props.children），
        <code>key</code> 在列表渲染里标识元素身份。React 拿到这些对象组成的树后，才去对比、计算、
        最终操作真实 DOM。这就是「声明式」的物理基础：你只负责描述「要什么」，渲染交给 React。
      </p>
      <Example title="嵌套 JSX 怎么编译">
        <p>
          嵌套结构会编译成层层嵌套的 <code>createElement</code> 调用，外层的 children 参数
          就是内层调用的返回值。一棵 JSX 树，对应一棵 Element 对象树。
        </p>
      </Example>
      <CodeBlock lang="jsx" title="嵌套结构层层编译" code={nestedCompile} />

      <h2>四、新 JSX 转换：jsx() 调用</h2>
      <p>
        上面讲的是经典转换。从 React 17 起，官方推出了<strong>新 JSX 转换（new JSX transform）</strong>。
        差别在于：经典转换要求你的文件作用域里必须有 <code>React</code> 这个变量（所以老代码顶部
        总要写 <code>{"import React from 'react'"}</code>），否则编译出的 <code>React.createElement</code>
        会找不到 <code>React</code>。新转换则让编译器<strong>自动</strong>从 <code>react/jsx-runtime</code>
        引入 <code>jsx</code> / <code>jsxs</code> 函数，于是你不必再手动 import React。
      </p>
      <CodeBlock lang="js" title="新转换：编译成 jsx() / jsxs()" code={newTransform} />
      <table>
        <thead>
          <tr><th>维度</th><th>经典转换</th><th>新转换（React 17+）</th></tr>
        </thead>
        <tbody>
          <tr><td>编译成</td><td><code>React.createElement(...)</code></td><td><code>jsx(...)</code> / <code>jsxs(...)</code></td></tr>
          <tr><td>来源</td><td>依赖作用域里的 <code>React</code></td><td>编译器自动从 <code>react/jsx-runtime</code> 引入</td></tr>
          <tr><td>需手动 import React</td><td>需要</td><td>不需要</td></tr>
          <tr><td>children 传法</td><td>作为第三个及以后的参数</td><td>放进 props 的 <code>children</code> 字段</td></tr>
          <tr><td>返回值</td><td colSpan={2}>都是 React Element 普通对象，本质一致</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="两者结果一样">
        无论经典还是新转换，最终拿到的都是同一种 React Element 对象。新转换只是省掉了样板
        import、并对多 children 场景（<code>jsxs</code>）做了点优化。理解时可以统一记成：
        「JSX 编译成创建 Element 的函数调用」。
      </Callout>

      <h2>五、组件 vs 标签：大小写决定 type 是什么</h2>
      <p>
        JSX 有一条铁规则：<strong>首字母小写</strong>的标签被当作普通 HTML 元素，编译时 type 是
        字符串（如 <code>'div'</code>）；<strong>首字母大写</strong>的标签被当作组件，编译时 type
        是那个函数 / 类的<strong>引用本身</strong>。这就是为什么自定义组件必须大写开头——否则 React
        会把 <code>{'<card />'}</code> 当成一个它不认识的 HTML 标签 <code>'card'</code>，而不是你的组件。
      </p>
      <CodeBlock lang="jsx" title="大写组件：type 是函数引用" code={componentCompile} />

      <h2>六、JSX 的书写规则逐条讲</h2>

      <h3>1. 单一根节点 / Fragment</h3>
      <p>
        一段 JSX 表达式只能返回<strong>一个</strong>根节点。原因还是编译：函数只能 <code>return</code>
        一个值，<code>return</code> 两个并列的 <code>{'<div>'}</code> 就像 <code>return 1 2</code>
        一样不合法。要并列多个元素又不想多包一层真实 DOM，用 <strong>Fragment</strong>：写成空标签
        <code>{'<>...</>'}</code>，它编译成 <code>React.Fragment</code>，不产生额外 DOM 节点。
      </p>
      <CodeBlock lang="jsx" title="用 Fragment 包裹并列元素" code={fragmentCode} />

      <h3>2. className 与 htmlFor</h3>
      <p>
        如第二节所述，因为 JS 关键字冲突，<code>class</code> 写成 <code>className</code>，
        <code>for</code> 写成 <code>htmlFor</code>。这是最常被新手踩的两个坑。
      </p>

      <h3>3. 属性与事件用驼峰命名</h3>
      <p>
        DOM 事件在 JSX 里一律驼峰：HTML 的 <code>onclick</code> 写成 <code>onClick</code>，
        <code>onchange</code> 写成 <code>onChange</code>，<code>onmouseover</code> 写成
        <code>onMouseOver</code>。而且事件值是一个<strong>函数</strong>，不是字符串：写
        <code>{'onClick={handleClick}'}</code>，不是 <code>{'onclick="handleClick()"'}</code>。
        其他多词属性同理走驼峰，如 <code>tabIndex</code>、<code>readOnly</code>。
      </p>

      <h3>4. 大括号插值</h3>
      <p>
        在 JSX 里用一对大括号 <code>{'{ }'}</code> 嵌入 JavaScript <strong>表达式</strong>：
        变量、运算、函数调用、三元、属性访问都行。文本位置可以插，属性值也可以插
        （<code>{'<img src={url} />'}</code>）。注释也是用大括号包一个块注释：
        <code>{'{/* 注释 */}'}</code>。
      </p>
      <CodeBlock lang="jsx" title="大括号里放各种表达式" code={interpolation} />

      <h3>5. 列表渲染与 key</h3>
      <p>
        渲染一组数据用数组的 <code>map</code>，把每项映射成一个元素，返回的元素数组可以直接当
        children。每个列表项必须带一个<strong>稳定且唯一</strong>的 <code>key</code>，React 靠它
        在数据变化时识别「哪个是哪个」，从而高效地复用、移动、删除节点。能用数据里的稳定 id 就
        用 id；用数组下标 <code>i</code> 作 key 只在列表顺序永不变化时勉强可以。
      </p>
      <CodeBlock lang="jsx" title="map + key 渲染列表" code={listRender} />
      <Callout variant="warn" title="key 不是普通属性">
        <code>key</code> 是 React 内部使用的特殊标识，<strong>不会</strong>作为普通 prop 传进
        子组件。子组件里读 <code>props.key</code> 是读不到的。它纯粹用于协调（reconciliation）阶段
        的身份比对。用错（比如用会变化的随机数或永远递增的值当 key）会导致组件状态错乱、性能下降。
      </Callout>

      <h3>6. 条件渲染</h3>
      <p>
        JSX 里没有 <code>if</code> 语句的位置（见下一节），条件渲染靠两种<strong>表达式</strong>：
        逻辑与 <code>{'&&'}</code> 和三元 <code>{'? :'}</code>。<code>{'cond && <X/>'}</code>
        表示「cond 为真才渲染 X」；<code>{'cond ? <A/> : <B/>'}</code> 表示二选一。
      </p>
      <CodeBlock lang="jsx" title="&& 与三元做条件渲染" code={conditional} />
      <Callout variant="warn" title="&& 的数字陷阱">
        <code>{'cond && <X/>'}</code> 里，如果 <code>cond</code> 求值成数字 <code>0</code>，
        React 会把 <code>0</code> 渲染出来（屏幕上冒出一个 0），而不是什么都不显示。
        因为 <code>0</code> 是假值，<code>{'&&'}</code> 直接返回 <code>0</code>，而 React 会渲染数字。
        所以写 <code>{'list.length && <List/>'}</code> 要改成
        <code>{'list.length > 0 && <List/>'}</code>，让左边是布尔值。
      </Callout>

      <h3>7. 自闭合标签</h3>
      <p>
        没有子节点的标签必须自闭合，结尾带斜杠：<code>{'<img />'}</code>、<code>{'<br />'}</code>、
        <code>{'<input />'}</code>、<code>{'<MyComponent />'}</code>。这比 HTML 严格——HTML 里
        <code>{'<br>'}</code> 不写斜杠也行，JSX 里不写会报错，因为它要被解析成合法的 JS。
      </p>

      <h2>七、为什么大括号里只能放表达式，不能放语句</h2>
      <p>
        这是 JSX 最让初学者困惑的限制之一。答案还是回到编译：大括号里的内容最后会成为
        <code>createElement</code> 的<strong>参数</strong>，或者拼进字符串模板般的位置——而参数
        必须是一个<strong>有值</strong>的东西，也就是表达式（expression）。<code>if</code>、
        <code>for</code>、<code>while</code>、<code>switch</code> 是<strong>语句</strong>（statement），
        它们<strong>不产生值</strong>，没法作为参数传进去，所以不能直接放进大括号。
      </p>
      <p>
        区分口诀：<strong>能被赋值给变量的就是表达式，不能的就是语句。</strong>
        <code>{'a > b ? 1 : 2'}</code> 能赋值（三元是表达式），<code>arr.map(...)</code> 能赋值
        （函数调用是表达式），所以它们能进大括号。而 <code>{'if (x) {}'}</code> 不能赋值，
        所以不能进。解决办法：把语句移到 JSX 之外算好，或者把 <code>if</code> 改写成等价的三元 /
        <code>{'&&'}</code> 表达式。
      </p>
      <CodeBlock lang="jsx" title="语句要挪到 JSX 外面" code={badStatement} />
      <table>
        <thead>
          <tr><th>能放进大括号（表达式）</th><th>不能放（语句）</th></tr>
        </thead>
        <tbody>
          <tr><td>变量 <code>name</code></td><td><code>if / else</code></td></tr>
          <tr><td>运算 <code>{'a + b'}</code></td><td><code>for / while</code></td></tr>
          <tr><td>三元 <code>{'a ? b : c'}</code></td><td><code>switch</code></td></tr>
          <tr><td>逻辑 <code>{'a && b'}</code></td><td>变量声明 <code>{'const x = 1'}</code></td></tr>
          <tr><td>函数调用 <code>{'arr.map(fn)'}</code></td><td><code>return</code></td></tr>
        </tbody>
      </table>

      <Callout variant="tip">
        下一章我们从「单个元素长什么样」走到「组件怎么组合」：讲 Props 如何自上而下流动、
        组件如何接收和组合数据、以及「数据向下、事件向上」的经典模式。带着本章的认知去看——
        组件不过是「返回 Element 树的函数」，Props 不过是传给那个函数的参数。
      </Callout>

      <Summary
        points={[
          'JSX 不是字符串也不是 HTML，而是 JavaScript 的语法糖，浏览器看不懂，必须先经 Babel/SWC 等编译成普通 JS。',
          '每个标签都被编译成一次函数调用：经典转换是 React.createElement(type, props, ...children)，新转换（React 17+）是自动引入的 jsx()/jsxs()。',
          '调用返回的是 React Element——一个普通 JS 对象 { type, props, key }，是 UI 的描述（蓝图），不是真实 DOM。',
          '小写标签 type 为字符串（HTML 元素），大写标签 type 为函数/类引用（组件），所以自定义组件必须大写开头。',
          '书写规则源于「最终是 JS」：单一根节点/Fragment、className 与 htmlFor、驼峰事件、大括号插值、map+key 列表、&& 与三元条件、自闭合标签。',
          '大括号里只能放表达式不能放语句，因为内容要成为函数参数（必须有值）；if/for/switch 不产生值，要挪到 JSX 外或改写成三元/&&。',
        ]}
      />
    </article>
  )
}
