import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const brokenCounter = `// ❌ 错误：用普通变量存状态，点击根本不会更新界面
@Composable
fun BrokenCounter() {
    var count = 0   // 普通局部变量——既不可观察，又会在每次重组时被重置回 0

    Button(onClick = { count++ }) {
        Text("点击次数：\${count}")
    }
}
// 点击虽然让 count 变成 1，但 Compose 不知道它变了，不会重组；
// 即便重组了，函数重新执行又会把 count 初始化回 0。两头都不对。`

const stateCounter = `import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

// ✅ 正确：mutableStateOf 创建可观察状态，remember 跨重组记住它
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }

    Button(onClick = { count++ }) {
        Text("点击次数：\${count}")
    }
}
// count 变化 -> Compose 检测到读它的 Text 需要重画 -> 触发重组 -> 界面更新`

const rememberVsSaveable = `@Composable
fun NameField() {
    // remember：跨重组记住，但旋转屏幕（配置变更）时会丢失、重置
    var draft by remember { mutableStateOf("") }

    // rememberSaveable：额外在配置变更 / 进程被杀后恢复时保留
    var name by rememberSaveable { mutableStateOf("") }

    Column {
        TextField(value = draft, onValueChange = { draft = it })
        TextField(value = name, onValueChange = { name = it })
    }
}`

const statefulChild = `// 有状态组件：自己持有 state，外部无法控制，也难复用/测试
@Composable
fun StatefulCounter() {
    var count by remember { mutableStateOf(0) }
    CounterUi(count = count, onIncrement = { count++ })
}`

const hoistedChild = `// 状态提升：把 state 提到父级，子组件变成无状态、纯展示
@Composable
fun CounterUi(
    count: Int,                 // 状态向下传：state down
    onIncrement: () -> Unit,    // 事件向上抛：event up
) {
    Button(onClick = onIncrement) {
        Text("点击次数：\${count}")
    }
}

// 父级是唯一数据源，决定 state 放哪、怎么变
@Composable
fun CounterScreen() {
    var count by rememberSaveable { mutableStateOf(0) }
    CounterUi(count = count, onIncrement = { count++ })
}`

const launchedEffect = `// LaunchedEffect：进入组合时启动一个协程，key 变化时重启，离开时取消
@Composable
fun UserProfile(userId: String) {
    var user by remember { mutableStateOf<User?>(null) }

    LaunchedEffect(userId) {          // userId 变了就重新拉
        user = repository.loadUser(userId)   // 挂起函数，安全地做异步
    }

    Text(text = user?.name ?: "加载中…")
}`

const coroutineScope = `// rememberCoroutineScope：拿到一个跟随组合生命周期的作用域，
// 用于在「事件回调」（非可组合上下文）里启动协程
@Composable
fun SnackbarDemo(snackbarHostState: SnackbarHostState) {
    val scope = rememberCoroutineScope()

    Button(onClick = {
        scope.launch {                      // 点击是普通回调，这里用 scope 起协程
            snackbarHostState.showSnackbar("已保存")
        }
    }) {
        Text("保存")
    }
}`

const disposableEffect = `// DisposableEffect：需要「注册 + 反注册」成对资源时使用
@Composable
fun LifecycleLogger(lifecycleOwner: LifecycleOwner) {
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event -> log(event) }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {                          // 离开组合时清理，防泄漏
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}`

const sideEffectPitfall = `// ❌ 别在可组合函数体里直接做副作用
@Composable
fun BadScreen(userId: String) {
    // 每次重组都会重新发一次请求——可能一秒触发很多次！
    val user = repository.loadUserBlocking(userId)
    Text(user.name)
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们建立了 <code>UI = f(state)</code> 的直觉：界面是状态的函数。这一章回答那个被悬置的问题——
        <strong>状态变了，界面到底是怎么自动更新的？</strong> 答案是 <strong>重组（recomposition）</strong>。
        我们会讲透 <code>mutableStateOf</code>、<code>remember</code>、<code>rememberSaveable</code> 三者分工，
        重组的特性与坑，状态提升带来的单向数据流，以及处理副作用的几个关键 API。
      </Lead>

      <h2>一、重组：状态变化如何驱动界面</h2>
      <KeyIdea>
        当一个可观察状态发生变化时，Compose 会<strong>重新执行读取了该状态的可组合函数</strong>，
        用新值产出新的 UI——这个过程叫<strong>重组（recomposition）</strong>。关键在「读了该状态的」：
        Compose 做的是<strong>精准重组</strong>，没读这个状态的组件不会被重画。
      </KeyIdea>
      <p>
        所以重组不是「整个屏幕重画一遍」，而是 Compose 运行时在背后建立了一张
        「<strong>哪个组件读了哪个状态</strong>」的依赖表。某个状态一变，它只把订阅了这个状态的那几个
        可组合函数排进重组队列，重新执行它们、对比差异、最小化实际的绘制改动。这正是
        <code>UI = f(state)</code> 公式落地的机制。
      </p>

      <h2>二、三件套：mutableStateOf、remember、rememberSaveable</h2>
      <p>
        要让状态能驱动重组，需要两个东西配合：一个<strong>可观察</strong>的状态容器，
        以及一个能让它<strong>跨重组存活</strong>的记忆机制。先看一个反例，体会为什么普通变量不行。
      </p>
      <CodeBlock lang="kotlin" title="反例：普通变量存状态" code={brokenCounter} />
      <p>
        普通变量有两个致命问题：① 它<strong>不可观察</strong>，改了 Compose 不知道，不会触发重组；
        ② 即便因为别的原因重组了，函数重新执行会把它<strong>重新初始化</strong>回初值。正确做法是
        <code>mutableStateOf</code> + <code>remember</code>：
      </p>
      <CodeBlock lang="kotlin" title="正确的计数器" code={stateCounter} />
      <h3>各自的职责</h3>
      <ul>
        <li>
          <strong><code>mutableStateOf(x)</code></strong>：创建一个<strong>可观察</strong>的状态对象
          （类型 <code>MutableState</code>）。任何读它 <code>.value</code> 的可组合函数都会被自动订阅，
          它一变就触发这些函数重组。
        </li>
        <li>
          <strong><code>remember {'{ ... }'}</code></strong>：让花括号里的计算结果<strong>跨重组被记住</strong>。
          没有它，每次重组都会 <code>mutableStateOf(0)</code> 重新造一个初值为 0 的新状态，等于没存。
        </li>
        <li>
          <strong><code>rememberSaveable {'{ ... }'}</code></strong>：在 remember 的基础上，
          额外能在<strong>配置变更（如屏幕旋转）与进程被系统回收后恢复</strong>时保留状态，
          底层借助 <code>Bundle</code> 保存，适合存输入框文本、滚动位置等不该丢的用户数据。
        </li>
      </ul>
      <Callout variant="info" title="by 委托写法">
        <code>var count by remember {'{ mutableStateOf(0) }'}</code> 里的 <code>by</code> 是 Kotlin 的
        属性委托：它让你直接用 <code>count</code> 读写，而不必每次写 <code>count.value</code>。
        需要导入 <code>getValue</code> 和 <code>setValue</code>。
      </Callout>
      <CodeBlock lang="kotlin" title="remember vs rememberSaveable" code={rememberVsSaveable} />
      <table>
        <thead>
          <tr><th>API</th><th>跨重组保留</th><th>跨配置变更/进程恢复</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td>普通变量</td><td>否</td><td>否</td><td>（不能用来存 UI 状态）</td></tr>
          <tr><td><code>remember</code></td><td>是</td><td>否</td><td>临时 UI 状态、缓存计算结果</td></tr>
          <tr><td><code>rememberSaveable</code></td><td>是</td><td>是</td><td>输入文本、选中项、滚动位置</td></tr>
        </tbody>
      </table>

      <h2>三、状态提升：单一数据源 + 单向数据流</h2>
      <p>
        把状态直接放在子组件里（<strong>有状态组件</strong>）很方便，但外部无法控制它的值，
        也难以复用和测试。<strong>状态提升（state hoisting）</strong>的做法是：把 state 从子组件
        <strong>提到调用它的父组件</strong>，子组件改成<strong>无状态（stateless）</strong>，
        只通过参数接收状态、通过回调把事件抛出去。
      </p>
      <CodeBlock lang="kotlin" title="有状态组件（状态藏在内部）" code={statefulChild} />
      <CodeBlock lang="kotlin" title="状态提升后：子无状态，父持有 state" code={hoistedChild} />
      <KeyIdea>
        状态提升的标准模式是「<strong>state down, event up</strong>」：状态作为参数<strong>向下</strong>传给子组件，
        事件作为回调（如 <code>onIncrement: () {'->'} Unit</code>）<strong>向上</strong>抛给父组件处理。
        父组件成为这块状态的<strong>单一数据源（single source of truth）</strong>，数据只朝一个方向流动，
        这就是<strong>单向数据流（UDF）</strong>。
      </KeyIdea>
      <p>
        如果你熟悉 React，会发现这和 React 的「props 向下、回调向上、状态提升到公共父组件」
        几乎一模一样——这不是巧合，两者都源于声明式 UI 的同一套思想。状态提升的好处很实在：
        无状态子组件是<strong>纯函数式</strong>的，给同样的参数总渲染同样的界面，因此好复用、好预览、好测试；
        多个组件需要共享同一状态时，提升到它们的公共父级即可，天然解决了「状态分散导致不一致」的问题。
      </p>

      <h2>四、重组的特性：你必须假设的三件事</h2>
      <p>
        重组的执行模型和普通顺序代码不同。要写对 Compose，必须把下面三条当成前提：
      </p>
      <ul>
        <li>
          <strong>可能被跳过</strong>：如果某个可组合函数的输入没变，Compose 会跳过它的重组以省性能。
          所以你不能依赖「它一定会重新执行」。
        </li>
        <li>
          <strong>可能乱序 / 并行</strong>：可组合函数的执行顺序不保证和代码书写顺序一致，
          甚至可能并行执行。所以一个组件不能依赖另一个组件「先执行」产生的副作用。
        </li>
        <li>
          <strong>应当幂等、无副作用</strong>：同样的输入应产出同样的 UI；函数体里<strong>不要</strong>
          做修改外部状态、发请求、写文件这类副作用——因为它可能被频繁、跳过式、乱序地执行。
        </li>
      </ul>
      <Callout variant="warn" title="重组可能非常频繁">
        一次动画、一次滚动、一个输入字符，都可能在一秒内触发几十上百次重组。所以可组合函数体应当
        <strong>快且纯</strong>。任何「只想做一次」或「有生命周期」的操作，都要交给下面的副作用 API，
        而不是直接写在函数体里。
      </Callout>

      <h2>五、副作用 API：把有生命周期的事交给框架</h2>
      <p>
        「副作用（side effect）」指那些会影响可组合函数之外的事：发网络请求、订阅回调、记录日志、
        显示 Snackbar 等。它们不能直接写在函数体里（会随重组反复触发），Compose 为此提供了一组
        受控的副作用 API。
      </p>
      <h3>LaunchedEffect</h3>
      <p>
        进入组合时启动一个<strong>协程</strong>，可在其中调用挂起函数做异步；当传入的 <code>key</code>
        变化时会取消旧协程并重启，离开组合时自动取消。最常用于「进入界面就加载数据」。
      </p>
      <CodeBlock lang="kotlin" title="LaunchedEffect：进入即加载" code={launchedEffect} />
      <h3>rememberCoroutineScope</h3>
      <p>
        当你需要在<strong>事件回调</strong>（如 <code>onClick</code>，它是普通函数不是可组合上下文）里
        启动协程时用它。它返回一个绑定到当前组合生命周期的 <code>CoroutineScope</code>，
        组件离开组合时其中的协程会被取消。
      </p>
      <CodeBlock lang="kotlin" title="rememberCoroutineScope：在回调里起协程" code={coroutineScope} />
      <h3>DisposableEffect</h3>
      <p>
        当副作用需要「注册 + 反注册」成对清理时用它，比如添加 / 移除监听器、订阅 / 取消订阅。
        它要求你提供一个 <code>onDispose</code> 块，在 key 变化或离开组合时执行清理，防止泄漏。
      </p>
      <CodeBlock lang="kotlin" title="DisposableEffect：成对注册与清理" code={disposableEffect} />
      <table>
        <thead>
          <tr><th>API</th><th>适用场景</th><th>触发/清理</th></tr>
        </thead>
        <tbody>
          <tr><td><code>LaunchedEffect(key)</code></td><td>进入组合就跑的协程（加载数据等）</td><td>key 变重启，离开取消</td></tr>
          <tr><td><code>rememberCoroutineScope()</code></td><td>在事件回调里手动启动协程</td><td>离开组合取消其协程</td></tr>
          <tr><td><code>DisposableEffect(key)</code></td><td>需要成对注册/反注册的资源</td><td>onDispose 中清理</td></tr>
        </tbody>
      </table>

      <h2>六、常见坑</h2>
      <Example title="坑一：在可组合函数体里直接做副作用">
        <p>
          下面这段每次重组都会重新发请求——滚动、动画、父级重画都可能触发，结果是请求被狂发。
          正确做法是把加载放进 <code>LaunchedEffect</code>。
        </p>
      </Example>
      <CodeBlock lang="kotlin" title="反例：函数体里直接发请求" code={sideEffectPitfall} />
      <ul>
        <li>
          <strong>用普通变量存状态</strong>：如本章开头反例，既不可观察、又会被重组重置。
          凡是「变了要更新界面」的数据，必须用 <code>mutableStateOf</code> + <code>remember</code>。
        </li>
        <li>
          <strong>忘了 remember</strong>：只写 <code>var x = mutableStateOf(0)</code> 而不 remember，
          每次重组都造新状态，值永远回到初值。
        </li>
        <li>
          <strong>在函数体里读系统时间 / 随机数当默认值</strong>：因为重组频繁且可跳过，
          这种「每次执行结果不同」的代码会让界面行为不可预测。
        </li>
        <li>
          <strong>该用 rememberSaveable 却用了 remember</strong>：屏幕一旋转，用户输入到一半的文本就没了。
        </li>
      </ul>

      <Callout variant="tip">
        记住一条主线：<strong>状态用 mutableStateOf 创建、用 remember/rememberSaveable 记住、用状态提升
        管理流向；可组合函数本身保持纯与快，所有副作用交给 Effect API。</strong>
        把这套内化，你写的 Compose 界面就既正确又好维护。
      </Callout>

      <Summary
        points={[
          '重组（recomposition）：状态变化时，Compose 只重新执行「读了该状态的」可组合函数，做精准重画。',
          'mutableStateOf 创建可观察状态，remember 让它跨重组存活，rememberSaveable 额外跨配置变更/进程恢复保留。',
          '普通变量不能存 UI 状态：不可观察且每次重组被重置；用 by 委托可省去写 .value。',
          '状态提升 = state down + event up：父级是单一数据源，子组件无状态化，形成单向数据流，与 React 一致。',
          '重组可能被跳过、可能乱序/并行、应当幂等无副作用，且可能非常频繁，所以可组合函数体要快且纯。',
          '副作用交给 API：LaunchedEffect 进入即跑协程、rememberCoroutineScope 在回调里起协程、DisposableEffect 成对注册清理。',
        ]}
      />
    </article>
  )
}
