import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RenderCycle from '@/courses/react-ecosystem/illustrations/RenderCycle.jsx'

const domByHandSnippet = `// 直接操作真实 DOM：又啰嗦又容易出错
function renderList(items) {
  const ul = document.getElementById('list')
  ul.innerHTML = ''                       // 一把全清，丢掉所有已有状态
  for (const it of items) {
    const li = document.createElement('li')
    li.textContent = it.name              // 漏一处就和数据对不上
    if (it.done) li.classList.add('done') // 状态分支全靠手动同步
    ul.appendChild(li)                    // 每次 append 都可能触发回流
  }
}
// 数据一变，你得自己想清楚「哪几个节点要改、怎么改、改的顺序」——
// 这正是 UI bug 的高发区。`

const declarativeSnippet = `// 声明式：你只描述「这一份数据应该长成什么样」
function List({ items }) {
  return (
    <ul>
      {items.map((it) => (
        <li key={it.id} className={it.done ? 'done' : ''}>
          {it.name}
        </li>
      ))}
    </ul>
  )
}
// 数据变了，你只管返回新的「应有样子」，
// 由 React 去算出真实 DOM 要做哪些最小改动。`

const elementSnippet = `// JSX 只是语法糖，编译后是普通对象（React 元素）
const el = <h1 className="title">Hi</h1>

// 约等于：
const el2 = {
  type: 'h1',                       // 字符串 => 原生标签；函数 => 组件
  props: { className: 'title', children: 'Hi' },
  key: null,
  // ...React 内部还会挂别的字段
}
// 元素是「不可变的描述」，不是真实 DOM 节点本身。
// 一次 render 产出的就是这样一棵「元素树」。`

const pureRenderSnippet = `// ❌ 渲染阶段里干副作用——大忌
function Bad({ id }) {
  fetch('/api/log?id=' + id)          // 发请求：render 可能被丢弃/重跑，会重复触发
  document.title = 'Detail ' + id     // 直接改 DOM：和 React 的提交时机打架
  window.scrollTo(0, 0)               // 同上
  return <div>...</div>
}

// ✅ 副作用放进 Effect，由 React 在 commit 后按规则调度
function Good({ id }) {
  useEffect(() => {
    fetch('/api/log?id=' + id)
    document.title = 'Detail ' + id
  }, [id])
  return <div>...</div>
}`

const fiberLinkSnippet = `// 直观理解：Fiber 把「递归遍历组件树」改写成「遍历一张链表」
// 每个 Fiber 节点大致带这些指针，于是遍历可以随时停下、之后再接着走：
const fiber = {
  type: App,          // 对应的组件 / 标签
  child: <Fiber>,     // 第一个子节点
  sibling: <Fiber>,   // 下一个兄弟节点
  return: <Fiber>,    // 父节点（处理完自己后往哪回）
  alternate: <Fiber>, // 指向上一次的 Fiber，用于本次 diff 复用
  flags: 'Update',    // 本节点要做的副作用（插入/更新/删除…）
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一卷我们钻进 React 的发动机舱，看清「数据一变，屏幕为什么就跟着变」的全过程。
        本章先建立最重要的心智模型：虚拟 DOM 是什么、为什么需要它，以及一次更新会依次经过
        Render、Reconcile、Commit 三个阶段。理解了这条主线，后面讲 key、讲性能优化才不会是死记硬背。
      </Lead>

      <h2>一、为什么要有虚拟 DOM</h2>
      <p>
        浏览器里真正显示在屏幕上的是<strong>真实 DOM</strong>——一棵由浏览器维护的节点树。
        直接用 <code>document.createElement</code>、<code>appendChild</code>、改 <code>innerHTML</code>
        去操作它，有两个老大难问题。其一是<strong>慢</strong>：DOM 操作会牵动浏览器的样式计算、
        布局回流与重绘，频繁、零散地改往往很贵；其二是<strong>易错</strong>：你得自己在脑子里维护
        「当前界面是什么样、数据变了之后哪几个节点该改、按什么顺序改」，这是命令式代码里最容易出 bug 的地方。
      </p>
      <CodeBlock lang="jsx" title="命令式操作真实 DOM：又啰嗦又易错" code={domByHandSnippet} />
      <p>
        React 的思路是换一种写法：你不再告诉浏览器「怎么一步步改」，而是<strong>声明</strong>
        「这份数据对应的界面应该长什么样」。剩下「真实 DOM 到底要做哪些改动」的脏活，交给 React。
      </p>
      <CodeBlock lang="jsx" title="声明式：只描述「应有的样子」" code={declarativeSnippet} />

      <KeyIdea>
        虚拟 DOM 是一棵用普通 JavaScript 对象描述界面的<strong>轻量树</strong>。React 在内存里
        先算出这棵「应有的样子」的树，再和上一次的树比对，得出对真实 DOM 的<strong>最小改动集合</strong>，
        最后才一次性落到屏幕上。它的价值不是「天生比手写 DOM 快」，而是<strong>把命令式的脏活
        变成可被框架自动、批量、最小化处理的声明式问题</strong>。
      </KeyIdea>

      <h2>二、React 元素：JSX 背后的对象</h2>
      <p>
        要理解虚拟 DOM，先看它的最小单位——<strong>React 元素</strong>。我们写的 JSX 只是语法糖，
        编译后会变成普通的 JavaScript 对象。
      </p>
      <CodeBlock lang="jsx" title="JSX 编译后就是普通对象" code={elementSnippet} />
      <p>
        关键点：元素是<strong>不可变的描述</strong>，它本身不是真实 DOM 节点，创建一个元素几乎不花钱。
        其中 <code>type</code> 决定了它是什么——字符串（如 <code>{"'h1'"}</code>）代表原生标签，
        函数代表一个组件。一次渲染所产出的，就是这样一棵层层嵌套的元素树。
      </p>

      <h2>三、一次更新的三相流程</h2>
      <p>
        当某个组件需要更新（下一章细讲「何时」触发），React 会依次走过三个阶段。先点开下面这张图，
        每个阶段点一下看它在做什么，再回到正文逐相拆解。
      </p>
      <RenderCycle />

      <h3>Render（渲染阶段）：算出新的元素树</h3>
      <p>
        React 调用相关组件函数，执行其中的逻辑，<strong>算出</strong>一棵新的 React 元素树。
        这一阶段是<strong>纯计算</strong>：给定相同的 props 与 state，应当返回相同的结果，
        并且<strong>不产生任何副作用</strong>——不改 DOM、不发请求、不操作外部变量。
      </p>
      <p>
        为什么要这么纯？因为在 Fiber 架构下，Render 阶段是<strong>可被中断、恢复，甚至整段丢弃</strong>的。
        React 可能算到一半，发现来了更高优先级的更新（比如用户正在打字），就先把当前这次半成品丢掉，
        转头处理紧急的，之后再重新算。如果你在渲染里发了请求或改了 DOM，这些副作用就会被重复触发、
        或在错误的时机发生——界面与数据从此对不上。
      </p>
      <Callout variant="warn" title="render 阶段必须是纯的">
        永远不要在组件函数体（渲染过程中）里直接改 DOM、发网络请求、写全局变量或操作订阅。
        这些副作用一律放进 <code>useEffect</code> / <code>useLayoutEffect</code>，由 React 在
        commit 之后按规则去跑。把这条当成红线。
      </Callout>
      <CodeBlock lang="jsx" title="渲染里干副作用 vs 放进 Effect" code={pureRenderSnippet} />

      <h3>Reconcile（调和阶段）：diff 比对，标记改动</h3>
      <p>
        有了新算出的元素树，React 把它和上一次的 Fiber 树<strong>逐层比对（diff）</strong>，
        靠节点的<strong>类型</strong>和 <strong>key</strong> 判断「这个节点是能复用并更新，还是要新建 / 删除」，
        从而得出一份「最小真实改动集合」，把每个要做的动作（插入、更新、删除）<strong>标记</strong>到
        对应节点的 effect 上。这一阶段同样属于「可中断」的工作，和 Render 一起合称为 render 阶段的工作。
        diff 的具体启发式规则，是下一章的主角。
      </p>

      <h3>Commit（提交阶段）：一次性改真实 DOM</h3>
      <p>
        前面两阶段都只在内存里算账，屏幕一点没动。到了 Commit，React 才把调和阶段标记好的改动
        <strong>同步、一次性</strong>地应用到真实 DOM 上——这一步<strong>不可中断</strong>，必须一鼓作气
        完成，否则用户会看到「改了一半」的界面。提交完成后，React 按既定顺序运行各类副作用：
        先处理 <code>ref</code> 的挂载 / 卸载，再同步跑 <code>useLayoutEffect</code>（此时 DOM 已更新但浏览器还没绘制，
        适合读取布局），最后异步调度 <code>useEffect</code>。
      </p>
      <table>
        <thead>
          <tr><th>阶段</th><th>在做什么</th><th>能否中断</th><th>有无副作用</th></tr>
        </thead>
        <tbody>
          <tr><td>Render</td><td>调用组件算出新元素树（纯计算）</td><td>可中断 / 恢复 / 丢弃</td><td>必须无副作用</td></tr>
          <tr><td>Reconcile</td><td>新旧树 diff，标记最小改动</td><td>可中断（属 render 工作）</td><td>无（仅标记）</td></tr>
          <tr><td>Commit</td><td>一次性改真实 DOM + 跑 ref / Effect</td><td>不可中断（同步）</td><td>在此集中执行副作用</td></tr>
        </tbody>
      </table>

      <Example title="把三相串起来：点一下按钮发生了什么">
        <p>
          假设有 <code>{'const [n, setN] = useState(0)'}</code>，按钮点击调 <code>{'setN(n + 1)'}</code>：
        </p>
        <ol>
          <li><strong>触发</strong>：<code>setN</code> 把组件标记为需要更新，排进队列；此刻 DOM 还没变。</li>
          <li><strong>Render</strong>：React 重新调用该组件函数，算出一棵新的元素树（里面 <code>n</code> 现在是 1）。</li>
          <li><strong>Reconcile</strong>：和上一棵树比对，发现只有那个显示数字的文本节点变了，标记「更新这一处」。</li>
          <li><strong>Commit</strong>：把这一处文本同步改到真实 DOM，用户这才看到屏幕从 0 变成 1，随后跑 Effect。</li>
        </ol>
      </Example>

      <h2>四、Fiber 架构：为什么要重写渲染机制</h2>
      <p>
        早期 React（Stack Reconciler）用<strong>递归</strong>遍历组件树来渲染：一旦开始，就得一口气递归到底，
        中途<strong>停不下来</strong>。组件树一大，这次同步计算可能占用主线程几十毫秒，期间用户的输入、动画
        全被卡住，体感就是「卡顿掉帧」。
      </p>
      <KeyIdea>
        Fiber 架构的核心动机，是把<strong>不可中断的递归遍历</strong>，改写成<strong>可中断的链表遍历</strong>。
        每个组件对应一个 Fiber 节点，节点之间用 <code>child</code> / <code>sibling</code> / <code>return</code>
        指针连成可以「走走停停」的结构。React 于是能把一大坨渲染工作切成小片（<strong>时间切片</strong>），
        每做一小片就让出主线程；还能按<strong>优先级</strong>让紧急更新（如输入响应）插队。
      </KeyIdea>
      <CodeBlock lang="jsx" title="Fiber 节点的关键指针（直观示意）" code={fiberLinkSnippet} />
      <p>
        正因为遍历能随时停下、之后再从断点接着走，Render 阶段才有了「可中断 / 恢复 / 丢弃」的能力——
        这也回头解释了为什么第三节强调 render 必须纯：一段可能被反复重来、半途丢弃的计算，
        绝不能掺杂会产生真实影响的副作用。
      </p>
      <Callout variant="tip" title="一句话理解并发渲染">
        建立在 Fiber 之上的<strong>并发渲染（Concurrent Rendering）</strong>，让 React 能同时「准备」多个版本的 UI、
        随时按优先级切换或丢弃其中一个，从而在不阻塞用户交互的前提下完成更新。
        <code>useTransition</code>、<code>useDeferredValue</code> 这些 API 正是它的对外抓手——后面的章节会专门讲。
      </Callout>

      <h2>五、double buffering：current 树与 workInProgress 树</h2>
      <p>
        Fiber 还有一个值得知道的设计：React 在内存里同时维护<strong>两棵 Fiber 树</strong>。
        一棵是 <code>current</code> 树，对应当前屏幕上正在显示的内容；另一棵是
        <code>workInProgress</code> 树，是本次更新正在内存里构建的新版本。两棵树通过 <code>alternate</code>
        指针互相引用，能尽量复用彼此的节点对象，避免每次更新都重新分配一大堆内存。
      </p>
      <p>
        这套机制叫<strong>双缓冲（double buffering）</strong>，和图形渲染里「在后台画好下一帧再整帧切换」
        是同一个思路。Render / Reconcile 阶段所有计算都发生在 <code>workInProgress</code> 树上，
        屏幕上的 <code>current</code> 树岿然不动；直到 Commit 这一刻，React 才把
        <code>workInProgress</code> 整棵「转正」成新的 <code>current</code>，屏幕一次性切到新版本。
        这也是为什么半途丢弃一次渲染几乎没有代价——被丢的只是后台那棵还没转正的树。
      </p>
      <table>
        <thead>
          <tr><th>Fiber 树</th><th>角色</th><th>何时切换</th></tr>
        </thead>
        <tbody>
          <tr><td><code>current</code></td><td>当前屏幕上正显示的版本</td><td>Commit 完成的那一刻被替换</td></tr>
          <tr><td><code>workInProgress</code></td><td>本次更新在后台构建的新版本</td><td>构建完成且 Commit 后转正为 current</td></tr>
        </tbody>
      </table>

      <h2>六、常见误区澄清</h2>
      <p>
        <strong>误区一：「虚拟 DOM 一定比直接操作 DOM 快」。</strong> 不准确。在内存里 diff 本身也要花时间，
        极端手工优化的命令式代码可能更快。虚拟 DOM 真正的价值是<strong>用可控的代价，换来声明式编程的简单与可维护</strong>，
        并避免大多数人手写 DOM 时那些低级又昂贵的错误。
      </p>
      <p>
        <strong>误区二：「render 就是更新屏幕」。</strong> 不是。Render 只是在内存里<strong>算</strong>新树，
        真正改屏幕发生在 Commit。组件「重新 render 了」不等于「DOM 真的改了」——很多次 render 比对后发现没差别，
        Commit 阶段几乎什么都不做。
      </p>
      <p>
        <strong>误区三：「Fiber 让单次渲染更快」。</strong> 它主要不是让总计算量变小，而是让计算<strong>可被打断</strong>，
        从而把长任务拆开、避免长时间阻塞主线程，换来的是<strong>响应性</strong>而非纯吞吐。
      </p>

      <Callout variant="tip">
        下一章我们顺着「Reconcile 阶段的 diff」往下挖：组件到底在什么时候重渲染、diff 的三条启发式规则是什么、
        以及 key 为什么如此关键——还会看一个用错 key 导致输入框「串值」的真实翻车现场。
      </Callout>

      <Summary
        points={[
          '真实 DOM 操作慢且易错，虚拟 DOM 用普通对象在内存里描述界面，把命令式脏活变成框架可自动最小化处理的声明式问题。',
          'JSX 编译成不可变的 React 元素对象，type 为字符串表示原生标签、为函数表示组件；一次渲染产出一棵元素树。',
          '一次更新分三相：Render（纯计算算新树，可中断/恢复/丢弃）、Reconcile（diff 比对标记最小改动）、Commit（同步一次性改真实 DOM 并跑 ref/useLayoutEffect/useEffect）。',
          'render 阶段必须纯：绝不在渲染中改 DOM、发请求或写全局，副作用一律放进 Effect。',
          'Fiber 把不可中断的递归遍历改写成可中断的链表遍历，支持时间切片与优先级调度，并发渲染据此而来。',
          '别误以为虚拟 DOM 天生更快、render 等于更新屏幕、或 Fiber 减少了计算量——它们换来的分别是可维护性、正确的时机模型与响应性。',
        ]}
      />
    </article>
  )
}
