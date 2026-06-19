import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RenderCycle from '@/courses/react-ecosystem/illustrations/RenderCycle.jsx'

const imperativeSnippet = `// 命令式：你亲手指挥每一步 DOM 操作
const btn = document.querySelector('#like')
const count = document.querySelector('#count')
const label = document.querySelector('#label')

let liked = false
let likes = 10

btn.addEventListener('click', () => {
  liked = !liked                       // ① 改数据
  likes += liked ? 1 : -1              // ② 再改另一处数据
  count.innerHTML = likes              // ③ 手动同步到 DOM（第一处真相）
  label.innerHTML = liked ? '已赞' : '点赞'  // ④ 再同步到 DOM（第二处真相）
  btn.className = liked ? 'on' : ''    // ⑤ 还要同步样式（第三处真相）
})`

const declarativeSnippet = `// 声明式：你只描述「在某个状态下，UI 长什么样」
function LikeButton() {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(10)

  function toggle() {
    setLiked(!liked)              // 只改「数据」这一处真相
    setLikes(liked ? likes - 1 : likes + 1)
  }

  // 下面这段是「状态 → 界面」的纯描述，没有一句 querySelector / innerHTML
  return (
    <button className={liked ? 'on' : ''} onClick={toggle}>
      {liked ? '已赞' : '点赞'} · {likes}
    </button>
  )
}`

const uiEqFnSnippet = `// React 心智模型的一句话：
//   UI = f(state)
//
// 给定同一份 state，组件函数总是算出同一棵界面描述；
// state 一变，React 重新调用 f，再由它去把真实 DOM 改成新的样子。
//
// 你写的是 f（纯粹的「状态 -> 界面」映射），
// React 负责脏活：diff、增删改真实 DOM 节点、调度更新时机。`

const componentSnippet = `// 组件化：把 UI 拆成可复用、可组合的函数
function Avatar({ src, name }) {
  return <img className="avatar" src={src} alt={name} />
}

function UserCard({ user }) {
  return (
    <div className="card">
      <Avatar src={user.avatar} name={user.name} />
      <strong>{user.name}</strong>
      <p>{user.bio}</p>
    </div>
  )
}

// 用一份数据渲染一串卡片：同一个组件，复用 N 次
function UserList({ users }) {
  return (
    <div className="list">
      {users.map((u) => <UserCard key={u.id} user={u} />)}
    </div>
  )
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        学 React 之前，先建立一个心智模型，否则后面的 Hooks、状态管理、性能优化都会像背咒语。
        这一章不写花哨的功能，只讲清楚一件事：React 为什么要存在，以及它到底改变了我们「写界面」
        这件事的思维方式。核心就两个词——<strong>声明式</strong>与<strong>组件化</strong>，
        外加一条贯穿始终的公式：<strong>UI = f(state)</strong>。
      </Lead>

      <h2>一、先看没有 React 的世界：命令式操作 DOM</h2>
      <p>
        浏览器原生提供了一套操作页面的 API：<code>document.querySelector</code> 找元素，
        <code>element.innerHTML</code> 改内容，<code>element.className</code> 改样式，
        <code>addEventListener</code> 绑事件。用这套 API 写界面，叫做<strong>命令式</strong>编程——
        你像个工头，一句一句地命令浏览器：「把这个节点的文字改成 10」「给那个按钮加上 on 类」。
      </p>
      <p>
        简单页面这样写没问题。问题出在<strong>状态变多</strong>之后。看下面这个「点赞按钮」：
        它有两个数据（是否点过赞 <code>liked</code>、点赞数 <code>likes</code>），
        但这两个数据散落地影响了<strong>三处 DOM</strong>（数字、文案、样式）。
      </p>
      <CodeBlock lang="js" title="命令式：手动把数据同步到多处 DOM" code={imperativeSnippet} />
      <p>
        请数一数那个点击回调里，你需要手动维护多少条「数据 → DOM」的同步线：改 <code>likes</code>
        要记得更新数字节点，改 <code>liked</code> 要记得更新文案节点<strong>和</strong>样式类。
        每多一处界面依赖某个数据，你就要多写一条同步语句，而且<strong>绝不能漏</strong>。
      </p>

      <KeyIdea>
        命令式写法的根本痛点是<strong>「多处真相」</strong>：同一个逻辑状态（比如「已点赞」）
        被复制散布在多个 DOM 节点上，你必须手动保证它们时刻一致。状态越多、界面越复杂，
        要维护的同步关系就呈爆炸式增长——漏掉一处，界面就和数据对不上，于是出现「数字变了
        但文案没变」这类经典 bug。
      </KeyIdea>

      <Example title="为什么命令式会随规模失控">
        <p>
          设想界面里有 5 个数据、每个数据平均影响 3 处 DOM。命令式下，你大约要手写并时刻维护
          15 条同步关系。再加一个数据、改一处交互，这些关系就要重新梳理一遍。代码里于是充斥着
          <code>querySelector</code> + <code>innerHTML</code> 的胶水，业务逻辑被淹没在「找节点、
          改节点」的噪声里。这不是某个程序员不努力，而是命令式范式本身在大状态下不可扩展。
        </p>
      </Example>

      <h2>二、React 的核心思想：UI = f(state)</h2>
      <p>
        React 给出的解法，是把「界面」重新定义成<strong>状态的函数</strong>。你不再描述「怎么从
        旧界面一步步改成新界面」，而是只描述「在当前这份状态下，界面应该<strong>长什么样</strong>」。
        改变状态后，由 React 去算出差异并更新真实 DOM。这种「只说结果、不说过程」的写法，
        就叫<strong>声明式</strong>。
      </p>
      <CodeBlock lang="js" title="React 的核心公式" code={uiEqFnSnippet} />
      <p>
        把上一节的点赞按钮用 React 重写，对比立刻就出来了：你只维护<strong>一处真相</strong>——
        <code>liked</code> 和 <code>likes</code> 这两个 state；界面长什么样，全部由 <code>return</code>
        里那段 JSX 声明。没有一句 <code>querySelector</code>，没有一句 <code>innerHTML</code>。
      </p>
      <CodeBlock lang="jsx" title="声明式：只描述「状态到界面」的映射" code={declarativeSnippet} />
      <p>
        注意那个 <code>toggle</code> 函数：它只改数据（调 <code>setLiked</code> / <code>setLikes</code>），
        完全不碰 DOM。数字、文案、样式三处会不会跟着变？会，而且是 React 替你变的。
        这就是声明式的解放——把「同步 DOM」这件苦差事整个外包给了框架。
      </p>

      <h3>改 state，界面自动更新：一次更新内部发生了什么</h3>
      <p>
        「我只改了 state，界面怎么就自己变了」——这背后是 React 的更新流程。当你调用
        <code>setLiked(...)</code>，React 并不会立刻去翻找 DOM，而是把这个组件标记为「需要重渲染」，
        然后走一套固定的四步流程：重新调用组件函数算出新的界面描述、和上一次比对出最小改动、
        最后一次性把改动提交到真实 DOM。点下面这张图的每一步，看清楚它在做什么。
      </p>
      <RenderCycle />
      <p>
        关键直觉是：前面几步都只是在内存里「算」，只有最后的 Commit 阶段才真正动真实 DOM。
        所以你写 <code>setState</code> 时根本不必关心「具体哪几个节点要改」——那是 React 算出来的，
        不是你指挥的。你的职责退化成一件事：<strong>把 state 描述对，把 UI = f(state) 这个映射写对</strong>。
      </p>

      <h2>三、声明式 vs 命令式：一张表说清差别</h2>
      <p>
        这组对立不是 React 独有的概念。SQL（声明你要什么数据，不写遍历过程）相对于手写循环、
        CSS 相对于逐帧改样式，都是声明式相对命令式。React 把这套思路带进了 UI 层。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>命令式（原生 DOM）</th><th>声明式（React）</th></tr>
        </thead>
        <tbody>
          <tr><td>你写的是</td><td>「怎么一步步改界面」的过程</td><td>「在某状态下界面是什么样」的结果</td></tr>
          <tr><td>谁负责改 DOM</td><td>你，手动 <code>innerHTML</code> / <code>className</code></td><td>React，你只改 state</td></tr>
          <tr><td>真相来源</td><td>散落在多个 DOM 节点上（多处真相）</td><td>集中在 state（单一真相）</td></tr>
          <tr><td>状态变多时</td><td>同步关系爆炸，易漏易错</td><td>只增加 state 与 JSX 描述，复杂度线性</td></tr>
          <tr><td>关注点</td><td>大量「找节点、改节点」的胶水</td><td>聚焦业务数据与界面映射</td></tr>
          <tr><td>典型 bug</td><td>数据变了某处 DOM 忘记同步</td><td>状态算错（但界面一定与状态一致）</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="声明式不是「更慢」">
        有人担心「让框架去 diff 是不是比我手动改慢」。实际上 React 通过虚拟 DOM 比对，
        通常只产生<strong>必要的最小</strong>真实 DOM 操作——真实 DOM 操作才是性能瓶颈，
        而内存里的 JS 计算极快。多数场景下声明式的整体性能足够好，且代码可维护性远胜手写同步。
      </Callout>

      <h2>四、组件化：把 UI 拆成可复用的函数</h2>
      <p>
        如果说声明式回答了「怎么写一块界面」，组件化回答的就是「怎么组织一整个应用的界面」。
        React 的答案朴素得惊人：<strong>组件就是返回界面描述的函数</strong>。一个按钮是组件、
        一张卡片是组件、整个页面也是组件。大组件由小组件拼装而成，像搭积木。
      </p>
      <CodeBlock lang="jsx" title="组件化：拆分、复用、组合" code={componentSnippet} />
      <p>
        看这三个组件的关系：<code>Avatar</code> 是最小积木；<code>UserCard</code> 把
        <code>Avatar</code> 拼进自己（<strong>组合</strong>）；<code>UserList</code> 用一份数组数据，
        把 <code>UserCard</code> 渲染 N 次（<strong>复用</strong>）。数据通过 <code>props</code>
        从父组件流向子组件——父决定传什么，子负责怎么显示。
      </p>
      <KeyIdea>
        组件化带来三个好处：<strong>复用</strong>（一个 UserCard 用在列表、详情、搜索结果里）、
        <strong>组合</strong>（小组件拼成大组件，层层向上搭出整个应用）、
        <strong>隔离</strong>（每个组件管好自己的一小块状态与界面，改一处不牵动全身）。
        这让大型界面的复杂度变得可控。
      </KeyIdea>

      <h3>单向数据流</h3>
      <p>
        React 的数据流是<strong>单向</strong>的：数据通过 props 从父组件流向子组件，自上而下，
        像水往低处流。子组件想改变父组件的数据，不能直接伸手去改，而要靠父组件传下来的回调函数
        通知父组件「请你改」。这种约束让数据的来龙去脉清晰可追——出了问题，你顺着数据流向上找源头即可，
        而不必在一团互相修改的乱麻里大海捞针。
      </p>

      <h2>五、虚拟 DOM：一句话直觉</h2>
      <p>
        前面反复说「React 帮你算出最小改动」，靠的就是<strong>虚拟 DOM</strong>。
      </p>
      <KeyIdea>
        虚拟 DOM 的一句话直觉：先在内存里用普通 JS 对象描述「界面应该长什么样」，
        状态变化时生成一棵<strong>新</strong>的描述树，和<strong>旧</strong>的那棵逐层比对（diff），
        算出「到底哪几个节点要改」，最后只把这批<strong>最小改动</strong>应用到真实 DOM 上。
      </KeyIdea>
      <p>
        为什么要绕这一圈？因为操作真实 DOM 很慢（牵涉浏览器的样式计算、布局、重绘），
        而操作内存里的 JS 对象很快。React 用「快的内存计算」换掉「慢的、且容易写漏的真实 DOM 操作」，
        既保证界面始终与状态一致，又把真实 DOM 的改动压到最少。你不需要在初学阶段抠 diff 算法细节，
        记住这个直觉即可：<strong>虚拟 DOM = 在内存里算差异，再去精准地改真实 DOM</strong>。
      </p>
      <Callout variant="tip" title="它只是实现手段，不是目的">
        虚拟 DOM 是 React 实现「声明式 + 高效更新」的一种手段，而非声明式的唯一实现。
        有些后来者（如 Svelte）用编译期手段达成类似目标。理解 React 时，把虚拟 DOM 当作
        「让 UI = f(state) 跑得又对又快」的引擎即可。
      </Callout>

      <h2>六、历史与现状：React 这十多年</h2>
      <p>
        React 由 Facebook（现 Meta）开发，<strong>2013 年开源</strong>。它一出场就带着两个当时颇具争议、
        如今已成常识的设计：用 <strong>JSX</strong>（在 JS 里写类 HTML 的语法）来描述界面，
        以及<strong>单向数据流</strong>。早期社区甚至嫌「把 HTML 写进 JS」离经叛道，但事实证明
        「界面就是数据的函数」这个心智模型极具生命力。
      </p>
      <table>
        <thead>
          <tr><th>时间</th><th>里程碑</th></tr>
        </thead>
        <tbody>
          <tr><td>2013</td><td>Facebook 开源 React，主打 JSX 与单向数据流</td></tr>
          <tr><td>2015</td><td>React Native 发布，把组件化心智带到原生移动端</td></tr>
          <tr><td>2017</td><td>React 16（Fiber 架构重写），为可中断渲染、并发打基础</td></tr>
          <tr><td>2019</td><td>React 16.8 引入 Hooks，函数组件成为主流写法</td></tr>
          <tr><td>2022</td><td>React 18，正式带来并发特性（并发渲染、自动批处理等）</td></tr>
          <tr><td>2024</td><td>React 19，新增 Actions、use、对表单与异步的进一步内建支持</td></tr>
        </tbody>
      </table>
      <p>
        其中 <strong>2019 年的 Hooks</strong> 是一道分水岭。在那之前，要让组件「带状态」基本得写
        class 组件；Hooks 让函数组件也能用 state、副作用等能力，写法更简洁、复用逻辑更自然。
        如今<strong>函数组件 + Hooks</strong> 已是绝对主流，本课程也以此为准，class 组件只作了解。
      </p>
      <p>
        2022 年的 <strong>React 18</strong> 带来了<strong>并发特性</strong>：渲染可以被打断和恢复，
        让高优先级的更新（如用户输入）插队，界面在重活下也能保持响应。到
        <strong>2024 年的 React 19</strong>，框架在表单提交、数据请求等异步场景上提供了更多内建支持。
        这些演进的方向始终一致：让 <code>UI = f(state)</code> 这个模型在越来越复杂的场景下依然好用。
      </p>

      <h2>七、什么时候用 React，什么时候不必</h2>
      <p>
        <strong>适合</strong>：交互复杂、状态多、界面会随数据频繁变化的应用——后台管理系统、
        数据看板、富交互的 Web App。这些正是命令式会失控、而声明式 + 组件化能大显身手的地方。
      </p>
      <p>
        <strong>未必需要</strong>：一个几乎没有交互的纯静态页面（如一篇文案展示），用原生 HTML/CSS
        或更轻的方案可能更省事——为它引入整套 React 工具链属于杀鸡用牛刀。判断标准很简单：
        <strong>状态多不多、界面变不变</strong>。状态越多、联动越复杂，React 的价值越大。
      </p>

      <Callout variant="tip">
        下一章我们就动手：用 Vite 搭一个真实可跑的 React 工程，写出你的第一个函数组件，
        在浏览器里看着它渲染出来。把这一章的「心智模型」落到「能跑的代码」上。
      </Callout>

      <Summary
        points={[
          '命令式（querySelector / innerHTML）让同一逻辑状态散落在多处 DOM，状态越多同步关系越爆炸，漏一处就出 bug——这是它在大状态下失控的根因。',
          'React 的核心是声明式：你只描述 UI = f(state)（某状态下界面长什么样），改 state 后由 React 负责算差异并更新真实 DOM。',
          '改 state 后的更新走「触发 -> Render -> 调和 -> Commit」四步，前几步只在内存里算，只有 Commit 才动真实 DOM。',
          '组件化把 UI 拆成返回界面描述的函数，带来复用、组合、隔离三大好处；数据经 props 单向自上而下流动。',
          '虚拟 DOM 的直觉：在内存里用 JS 对象 diff 出最小改动，再精准应用到慢速的真实 DOM，兼顾一致性与性能。',
          'React 2013 年由 Facebook 开源（JSX + 单向数据流），2019 年 Hooks 让函数组件成为主流，2022 年 React 18 带来并发特性，2024 年到 React 19。',
        ]}
      />
    </article>
  )
}
