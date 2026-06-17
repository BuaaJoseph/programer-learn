import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RenderCycle from '@/courses/react-ecosystem/illustrations/RenderCycle.jsx'

const reRenderCausesSnippet = `function Parent() {
  const [n, setN] = useState(0)
  return (
    <div>
      <button onClick={() => setN(n + 1)}>+1</button>
      {/* Parent 因自身 state 变化而重渲染时，
          Child 默认也会跟着重渲染——哪怕它的 props 一点没变 */}
      <Child />
    </div>
  )
}`

const sameTypeDiffSnippet = `// 1) 不同类型 => 整棵子树直接替换（卸载旧的、挂载新的）
isLoggedIn ? <Dashboard /> : <LoginForm />
// 从 Dashboard 切到 LoginForm：React 不会试图复用，
// 直接销毁 Dashboard 及其全部子节点与状态，再全新挂载 LoginForm。

// 2) 同类型 => 复用 DOM 节点，只更新变化的 props
<button className="a" />  ->  <button className="b" />
// 还是同一个 <button>，React 只把 className 从 a 改成 b，
// 节点本身（以及它内部的状态）保留下来。`

const indexKeySnippet = `// ❌ 用数组下标当 key：增删 / 排序时会出错
{todos.map((todo, i) => (
  <TodoItem key={i} todo={todo} />
))}

// ✅ 用数据本身稳定的唯一 id 当 key
{todos.map((todo) => (
  <TodoItem key={todo.id} todo={todo} />
))}`

const inputBugSnippet = `// 一个会「串值」的列表：每行带一个非受控输入框
function Row({ label }) {
  return (
    <li>
      {label}：<input defaultValue="" placeholder="备注" />
    </li>
  )
}

function List({ rows }) {
  return (
    <ul>
      {rows.map((r, i) => (
        // ❌ key={i}：删头部一行后，下标会整体前移
        <Row key={i} label={r.label} />
      ))}
    </ul>
  )
}`

const inputFixSnippet = `function List({ rows }) {
  return (
    <ul>
      {rows.map((r) => (
        // ✅ key={r.id}：身份跟着数据走，删谁就只删谁那一行的输入框
        <Row key={r.id} label={r.label} />
      ))}
    </ul>
  )
}`

const bailoutSnippet = `const [count, setCount] = useState(0)

// 传入与当前完全相同的值（Object.is 比较）
setCount(0)   // 当前就是 0 => React 直接 bail out，不触发这一次重渲染
setCount(1)   // 值变了 => 正常调度重渲染

// 注意：对象 / 数组即便内容看着一样，引用不同也算「变了」
const [obj, setObj] = useState({ a: 1 })
setObj({ a: 1 })  // 新对象，引用不同 => 仍会重渲染`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们看清了「一次更新走过 Render → Reconcile → Commit 三相」。这一章聚焦其中的 Reconcile：
        组件到底<strong>什么时候</strong>重渲染、diff <strong>改了什么</strong>、以及那个被无数人用错的
        <code>key</code> 究竟在背后做什么。最后用一个「输入框串值」的翻车现场，把抽象的规则砸实。
      </Lead>

      <h2>一、组件什么时候重渲染</h2>
      <p>
        重渲染（re-render）指的是 React <strong>再次调用</strong>组件函数、算出一棵新元素树——
        注意，这只是上一章说的 Render 阶段，并不等于真实 DOM 一定会改。一个组件会重渲染，
        通常出于以下三种原因之一。
      </p>
      <table>
        <thead>
          <tr><th>触发原因</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>自身 state 变化</td><td>调用了 <code>setState</code> / <code>dispatch</code>，且值确实变了。</td></tr>
          <tr><td>父组件重渲染</td><td>父组件重渲染，其下的子组件默认<strong>全部</strong>跟着重渲染。</td></tr>
          <tr><td>订阅的 context 变化</td><td>组件用了某个 <code>useContext</code>，而该 context 的 value 变了。</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="jsx" title="父组件重渲染会带动子组件" code={reRenderCausesSnippet} />

      <KeyIdea>
        最常被误解的一点：<strong>父组件重渲染，它的子组件默认会全部重渲染</strong>，哪怕子组件的 props
        一个字都没变。重渲染是<strong>沿组件树向下传播</strong>的，而不是「只重渲染数据变了的那个」。
        React 默认<strong>不会</strong>帮你自动跳过「props 没变」的子组件。
      </KeyIdea>

      <h2>二、为什么「全部重渲染」通常并不慢</h2>
      <p>
        听到「父一渲染，子全重渲染」，很多人第一反应是「那不是很浪费？」。实际上它通常不慢，原因在于：
        重渲染只是<strong>在内存里重新调用函数、重新跑 diff</strong>，这部分对现代 JS 引擎来说很便宜；
        真正昂贵的是<strong>操作真实 DOM</strong>，而 diff 之后如果发现没有实际变化，Commit 阶段就<strong>几乎什么都不做</strong>。
      </p>
      <p>
        换句话说：「重渲染」≠「改 DOM」。一次没带来真实改动的重渲染，代价主要是一点点纯计算。
        所以默认不要急着到处加优化——只有当某个组件的 render 本身确实重（大列表、复杂计算、昂贵子树）
        且被频繁带动时，才值得出手。具体怎么减少不必要的重渲染（<code>React.memo</code>、
        <code>useMemo</code>、<code>useCallback</code>、状态下沉等），是后面性能优化卷（r8）的主题，这里只先剧透方向。
      </p>
      <Callout variant="note" title="先量，再优化">
        在加 <code>memo</code> 之前，先用 React DevTools 的 Profiler 看清「到底是哪个组件慢、慢在哪一次重渲染」。
        盲目套优化反而会增加心智负担和 bug 面——过早优化是这里最常见的坑。
      </Callout>

      <h2>三、diff 的三条启发式规则</h2>
      <p>
        理论上比对两棵树的最优算法成本很高，React 为此用了三条<strong>启发式假设</strong>把它压到近线性，
        这也正是 Reconcile 阶段「改了什么」的判定依据。
      </p>
      <h3>规则一：类型不同，整棵子树直接替换</h3>
      <p>
        同一位置上，如果元素的 <code>type</code> 变了（比如从 <code>{'<div>'}</code> 变成 <code>{'<span>'}</code>，
        或从组件 A 变成组件 B），React <strong>不会</strong>尝试复用，而是把旧子树整个卸载、新子树全新挂载——
        旧节点里的 DOM 与组件状态全部丢弃。
      </p>
      <h3>规则二：类型相同，复用节点、只更新 props</h3>
      <p>
        同一位置类型不变，React 就<strong>复用</strong>已有的 DOM 节点 / 组件实例，只把变化的 props
        更新上去，组件内部的 state 得以保留。这是最常见、也最高效的情况。
      </p>
      <CodeBlock lang="jsx" title="规则一与规则二" code={sameTypeDiffSnippet} />
      <h3>规则三：列表靠 key 匹配身份</h3>
      <p>
        渲染一个列表时，React 默认按<strong>位置（下标）</strong>逐个比对同位置的新旧元素。但当列表会发生
        增、删、排序时，光靠位置就会错位。<code>key</code> 的作用，是给每个列表项一个<strong>稳定的身份标签</strong>，
        让 React 跨越位置变化，认出「这还是原来那一项」，从而正确地复用 / 移动 / 删除，而不是错配。
      </p>

      <h2>四、key 是什么，以及用 index 当 key 的坑</h2>
      <KeyIdea>
        <code>key</code> 不是给你看的，是给 React 用来<strong>在同一层兄弟节点之间标识身份</strong>的。
        它必须在兄弟之间<strong>唯一且稳定</strong>——「稳定」意味着同一条数据无论排到哪个位置，
        它的 key 都不变。用数组下标 <code>index</code> 当 key，恰恰违背了「稳定」：一旦增删 / 排序，
        下标会重新分配，React 就会把张冠李戴。
      </KeyIdea>
      <CodeBlock lang="jsx" title="index 当 key vs 用稳定 id" code={indexKeySnippet} />
      <p>
        为什么 index 当 key 会出错？因为 React 是<strong>按 key 来决定复用哪个节点</strong>的。
        当你在列表头部删掉一项，后面所有项的下标都会前移一格——于是「key=1」这个标签，
        在删除前后指向的是<strong>两条不同的数据</strong>。React 以为「key=1 还在」，便把原本属于另一条数据的
        DOM 节点、内部状态留给了它。对纯静态文本，你可能只看到内容串了一格；
        但只要列表项里藏着<strong>自己的状态</strong>（输入框、勾选、展开/收起、动画），就会出现明显的「串值」。
      </p>

      <h2>五、翻车现场：输入框串值对照例</h2>
      <p>
        下面这个列表，每一行带一个非受控输入框（输入框的内容是它自己的内部状态，不在 React state 里）。
      </p>
      <CodeBlock lang="jsx" title="问题版：key={'{i}'} 导致串值" code={inputBugSnippet} />
      <Example title="按下「删除第一行」时发生了什么">
        <p>初始三行，你在每个输入框里分别填了备注：</p>
        <ul>
          <li>第 0 行「苹果」，输入框里写了 <code>买 3 个</code>（这是该 DOM 输入框的内部状态）</li>
          <li>第 1 行「香蕉」，输入框里写了 <code>买 5 根</code></li>
          <li>第 2 行「橙子」，输入框里写了 <code>买 2 个</code></li>
        </ul>
        <p>
          现在删掉第 0 行「苹果」。数据上只剩「香蕉、橙子」两行，<strong>本应</strong>显示 <code>买 5 根</code> 和
          <code>买 2 个</code>。但因为 key 用的是 index：删除后「香蕉」的下标从 1 变成 0、「橙子」从 2 变成 1。
          React 按 key 比对，发现「key=0 还在、key=1 还在，只是 key=2 没了」，于是它<strong>复用</strong>了
          原来 key=0 和 key=1 那两个输入框 DOM——可那俩输入框里装的还是<strong>「苹果」和「香蕉」的备注</strong>！
        </p>
        <p>
          结果：标签文字（来自 props，会更新）正确地显示「香蕉、橙子」，但输入框内容（DOM 自身状态，被错误复用）
          却串成了 <code>买 3 个</code>、<code>买 5 根</code>。文字和输入框对不上，这就是经典的「输入框串值」。
        </p>
      </Example>
      <CodeBlock lang="jsx" title="修复版：key={'{r.id}'} 让身份跟着数据走" code={inputFixSnippet} />
      <p>
        换成稳定的 <code>r.id</code> 后，删掉「苹果」那行，React 发现「id=苹果」这个 key 消失了，
        便精准卸载它对应的输入框；「香蕉」「橙子」的 key 没变，它们各自的输入框被原样保留，内容纹丝不动。
        身份跟着数据走，串值问题随之消失。
      </p>
      <Callout variant="warn" title="什么时候 index 当 key 才勉强可以">
        只有当列表<strong>纯静态、永不增删与排序、且列表项自身没有任何内部状态</strong>时，用 index 当 key 才不会出问题。
        但这种条件很苛刻也很容易在日后被打破，所以实践上的建议很简单：<strong>优先用数据本身稳定的唯一 id</strong>。
      </Callout>

      <h2>六、key 还能当「重置」开关用</h2>
      <p>
        既然 key 决定身份，那么<strong>主动改变 key</strong> 就是在告诉 React「这已经不是原来那个组件了，
        请把它整个卸载重建」。这是一个非常实用的小技巧：当你希望某个组件<strong>彻底重置内部状态</strong>时，
        给它一个会变化的 key 即可，比换一堆 props 或在 effect 里手动清状态都干净。
      </p>
      <Example title="切换用户时重置整张表单">
        <p>
          一个编辑表单 <code>{'<ProfileForm userId={id} />'}</code>，内部用 state 暂存用户的输入。切换到另一个用户后，
          表单里却残留着上一个用户的内容。最省事的修法是 <code>{'<ProfileForm key={id} userId={id} />'}</code>：
          <code>id</code> 一变，key 随之变，React 直接卸载旧表单、挂载一个全新的，内部 state 自然回到初始值。
          这正是「key 即身份」这条规则反过来为我们所用。
        </p>
      </Example>

      <h2>七、setState 传相同值会 bail out</h2>
      <p>
        重渲染并非「调了 setState 就一定发生」。当你传给 setter 的值与当前 state <strong>完全相同</strong>
        （React 用 <code>Object.is</code> 比较），React 会<strong>跳过（bail out）</strong>这一次更新，
        不再重新渲染该组件。这能省下没必要的计算。
      </p>
      <CodeBlock lang="jsx" title="相同值触发 bail out" code={bailoutSnippet} />
      <Callout variant="note" title="对象 / 数组要小心引用">
        bail out 靠的是 <code>Object.is</code> 这种「引用相等」式比较。两个内容看起来一样的<strong>新对象</strong>
        引用不同，会被判为「变了」而照常重渲染。这也是为什么状态尽量保持不可变更新、且别在 render 里
        随手新建对象传下去——后者会让下游的 <code>memo</code> 优化全部失效（r8 会细讲）。
      </Callout>

      <h2>八、关于 context 触发的重渲染</h2>
      <p>
        三种触发原因里，context 这一条最容易埋雷。当某个 <code>Context.Provider</code> 的 <code>value</code> 变化时，
        <strong>所有</strong>消费该 context（用了对应 <code>useContext</code>）的组件都会重渲染，无论它们藏在树里多深、
        中间隔了多少层。这本是 context 的设计目的，但配合「render 里随手新建对象」就会出问题。
      </p>
      <Example title="一个常见的 context 性能陷阱">
        <p>
          如果你写 <code>{'<Ctx.Provider value={{ user, setUser }}>'}</code>，那么 Provider 每次重渲染都会
          新建一个 <code>{'{ user, setUser }'}</code> 对象——引用每次都变，于是<strong>每一个</strong>消费者都被迫重渲染，
          哪怕 <code>user</code> 实际没动。解法是把这个 value 用 <code>useMemo</code> 缓存起来，让引用在依赖不变时保持稳定。
          这又一次印证了上一节的提醒：<strong>引用稳定性</strong>是 React 性能的隐形主线（r8 详谈）。
        </p>
      </Example>

      <h2>九、把流程图再看一眼</h2>
      <p>
        本章讲的「何时重渲染、diff 改了什么」对应的正是下图里的 ② Render 与 ③ 调和两步。
        再点开走一遍，把「触发 → 算新树 → diff 比对 → 提交」的链路与本章规则对上号。
      </p>
      <RenderCycle />

      <Summary
        points={[
          '组件重渲染的三种原因：自身 state 变化、父组件重渲染、所订阅的 context 变化。',
          '父组件重渲染时子组件默认全部跟着重渲染（不看 props 是否变）；但它通常不慢，因为重渲染只是内存计算，没真实改动的 Commit 几乎什么都不做。',
          'diff 三条启发式：类型不同整棵子树替换；类型相同复用节点只更新 props；列表靠 key 匹配身份。',
          'key 用于在兄弟节点间标识身份，必须唯一且稳定；用数组 index 当 key 在增删/排序时会让身份错位。',
          '经典翻车：列表项带自身状态（如输入框）时用 index 当 key，删除一行会因节点被错误复用而导致「串值」，换成稳定 id 即修复。',
          'setState 传入与当前 Object.is 相等的值会 bail out 跳过重渲染；但新对象/数组引用不同仍会触发——减少不必要重渲染的系统方法见 r8。',
        ]}
      />
    </article>
  )
}
