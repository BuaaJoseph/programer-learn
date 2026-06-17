import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const coldFlowSnippet = `import kotlinx.coroutines.flow.*

// flow{} 构建器：声明式地描述「怎么一个个发射元素」
fun simpleFlow(): Flow<Int> = flow {
    println("flow 开始执行")     // 注意：collect 之前这行不会运行
    for (i in 1..3) {
        kotlinx.coroutines.delay(100)  // 模拟异步取数（网络 / IO）
        emit(i)                  // 发射一个元素给下游
    }
}

suspend fun demo() {
    val f = simpleFlow()         // 此时什么都没发生——冷流还没被点燃
    println("还没 collect")
    f.collect { value ->         // 终端操作：collect 才真正触发上游执行
        println("收到 \$value")
    }
}`

const operatorSnippet = `import kotlinx.coroutines.flow.*
import kotlinx.coroutines.Dispatchers

// 一条典型的 Flow 操作链：每个中间操作都返回一个新的 Flow（仍然是冷的）
fun userNames(): Flow<String> =
    repository.observeUsers()        // Flow<User>，来自数据层
        .onEach { u -> log("收到用户 \${u.id}") }   // 副作用：每个元素经过时做点事
        .filter { u -> u.active }                   // 只保留活跃用户
        .map { u -> u.name.trim() }                 // 变换：User -> String
        .flowOn(Dispatchers.IO)                     // 上游切到 IO 线程执行
        .catch { e -> emit("出错：\${e.message}") }  // 捕获上游异常，可降级发射

// transform：比 map 更灵活，一个输入可 emit 0..N 个输出
fun expand(): Flow<Int> = flowOf(1, 2, 3).transform { n ->
    emit(n)
    emit(n * 10)   // 同一个输入元素发射两次
}`

const stateFlowSnippet = `import kotlinx.coroutines.flow.*

// 热流：不依赖收集者，自身持有 / 广播数据
class Counter {
    // StateFlow：永远持有「最新值」，必须有初始值，新订阅者立刻拿到当前值
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count.asStateFlow()

    // SharedFlow：事件广播，无「当前值」概念，订阅前发射的事件默认收不到
    private val _events = MutableSharedFlow<String>()
    val events: SharedFlow<String> = _events.asSharedFlow()

    fun increment() { _count.value += 1 }            // 直接改最新值
    suspend fun toast(msg: String) { _events.emit(msg) }  // 发一次性事件
}`

const stateInSnippet = `import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*

class UserViewModel(repo: UserRepository) : ViewModel() {

    // 把数据层的冷 Flow 转成给 UI 用的热 StateFlow
    val uiState: StateFlow<List<User>> =
        repo.observeUsers()                  // 冷流：Flow<List<User>>
            .map { list -> list.sortedBy { it.name } }
            .stateIn(
                scope = viewModelScope,      // 绑定 ViewModel 生命周期
                // 没订阅者 5 秒后停止上游收集，省电；旋屏等短暂无订阅不重启
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = emptyList()   // 首屏先给个空列表
            )
}`

const collectUiSnippet = `import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun UserScreen(viewModel: UserViewModel) {
    // collectAsStateWithLifecycle：内部用 repeatOnLifecycle(STARTED)
    // 界面进入后台（STOPPED）时自动取消收集，回到前台再恢复——不浪费资源
    val users by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn {
        items(users) { user -> Text(user.name) }
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        协程让我们能用同步的写法表达异步逻辑，而 <strong>Flow</strong> 则把这种能力从「返回一个值」
        扩展到「随时间陆续返回多个值」——它是协程世界里的异步数据流。这一章我们讲透 Flow
        的核心性质：它是<strong>冷的</strong>（被收集才开始发射）；常用的中间操作符与终端操作；
        冷流与热流（StateFlow / SharedFlow）的本质区别；背压是什么；以及在 Android 里
        如何把数据层的 Flow 安全、省电地接到 Compose 界面上。
      </Lead>

      <h2>一、Flow 是什么：随时间到来的多个值</h2>
      <p>
        一个 <code>suspend</code> 函数最终只能<strong>返回一个值</strong>。但很多场景里数据是
        「一批」或「源源不断」的：数据库某张表的实时查询结果、传感器读数、搜索框的输入变化、
        下载进度的百分比。这些用单个返回值表达不了，用 <code>List</code> 又必须等全部就绪才能拿到。
        Flow 填的就是这个空——它代表一个<strong>异步产生、按顺序到达的值序列</strong>，
        类型写作 <code>{'Flow<T>'}</code>。
      </p>
      <KeyIdea>
        Flow 是「<strong>冷的</strong>异步数据流」。冷（cold）的含义是：你拿到一个 Flow 时，
        里面的代码<strong>一行都还没跑</strong>；只有当某个<strong>终端操作</strong>（如
        <code>collect</code>）去收集它时，<code>flow{}</code> 里的逻辑才从头开始执行并逐个
        <code>emit</code> 发射。没人收集，就什么都不发生。
      </KeyIdea>
      <p>
        这一点和很多人对「流」的直觉相反。可以这样理解：Flow 更像一份<strong>菜谱</strong>而不是
        <strong>一桌菜</strong>——菜谱描述了「怎么做」，但只有你真正下厨（collect）时灶火才点起来。
        每来一个收集者，菜谱就被独立地从头执行一遍。
      </p>

      <h2>二、构建 Flow：flow{} 与 emit</h2>
      <p>
        最基础的构建器是 <code>flow {'{ ... }'}</code>。它的代码块是一个 <code>suspend</code>
        环境，你在里面调用 <code>emit(value)</code> 把值一个个发射给下游。下面的例子能直观看出冷流的特性：
        <code>collect</code> 之前，连 <code>flow{}</code> 里的第一行 <code>println</code> 都不会执行。
      </p>
      <CodeBlock lang="kotlin" title="flow{} 构建器与冷流特性" code={coldFlowSnippet} />
      <p>
        除了 <code>flow{}</code>，还有几个便捷构建器：<code>flowOf(1, 2, 3)</code> 把固定几个值变成流；
        <code>listOf(...).asFlow()</code> 把集合转成流。它们本质相同，都是冷的。
      </p>
      <Callout variant="info" title="emit 必须在同一个协程里">
        <code>flow{}</code> 内部不允许从别的协程里调用 <code>emit</code>（这会破坏上下文一致性）。
        如果你确实要在多个协程并发产生值，应使用 <code>channelFlow{}</code>，它允许并发 <code>send</code>。
      </Callout>

      <h2>三、中间操作符：把流接成一条加工链</h2>
      <p>
        中间操作符（intermediate operator）接收一个 Flow、返回一个<strong>新的</strong> Flow，
        而且返回的流<strong>仍然是冷的</strong>——它只是把「将来要做的加工」记下来，并不立即执行。
        只有终端操作触发时，整条链才一气呵成地跑起来。常用的几个：
      </p>
      <table>
        <thead>
          <tr><th>操作符</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>map</code></td><td>把每个元素一对一变换：<code>{'T -> R'}</code></td></tr>
          <tr><td><code>filter</code></td><td>只保留满足条件的元素</td></tr>
          <tr><td><code>transform</code></td><td>最灵活：一个输入可 <code>emit</code> 零到多个输出</td></tr>
          <tr><td><code>onEach</code></td><td>对每个流经的元素做副作用（打日志等），不改变元素</td></tr>
          <tr><td><code>catch</code></td><td>捕获<strong>上游</strong>抛出的异常，可降级或重新发射</td></tr>
          <tr><td><code>flowOn</code></td><td>切换<strong>上游</strong>的执行线程（如切到 IO）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="kotlin" title="一条典型的操作链" code={operatorSnippet} />
      <Callout variant="warn" title="flowOn 和 catch 只影响「上游」">
        Flow 的线程切换与异常捕获都遵循「<strong>上游</strong>」原则：<code>flowOn(IO)</code>
        只把它<strong>之前</strong>的操作切到 IO，下游（包括 <code>collect</code> 的代码块）仍在收集者所在的线程；
        <code>catch</code> 同理只能捕获它上方操作抛出的异常，捕不到下游 <code>collect</code> 块里的异常。
        所以这两个操作符的<strong>摆放位置</strong>很关键。
      </Callout>

      <h2>四、终端操作：collect 点燃整条链</h2>
      <p>
        终端操作（terminal operator）是真正<strong>触发</strong>流执行的那一下，它是一个
        <code>suspend</code> 函数，必须在协程里调用。最核心的是 <code>collect</code>：
        它逐个接收上游发射的每个值。其它终端操作如 <code>toList()</code>（收集成列表）、
        <code>first()</code>（拿第一个就停）、<code>single()</code>、<code>reduce()</code>、
        <code>collectLatest{}</code>（新值到来时取消尚未处理完的上一个）也都属于终端操作。
      </p>
      <Example title="一条链的执行时机">
        <p>
          有了 <code>{'repo.observeUsers().filter{...}.map{...}'}</code> 这条链，只要没人
          <code>collect</code>，<code>repo</code> 那边的数据库查询<strong>根本不会发起</strong>。
          一旦某处写了 <code>{'.collect { ... }'}</code>，查询发起、每条数据依次经过 filter、map，
          最终到达 collect 块。换一个收集者，整条链会被<strong>独立地再跑一遍</strong>——这就是冷流。
        </p>
      </Example>

      <h2>五、冷流 vs 热流：StateFlow 与 SharedFlow</h2>
      <p>
        前面强调 Flow 默认是冷的：每个收集者各自触发一份独立执行。但有些数据天然是
        「<strong>共享的、与收集者无关的</strong>」——比如「当前登录用户」「页面 UI 状态」
        这种全局只有一份、谁来看都是同一个的东西。这就是<strong>热流（hot flow）</strong>的用武之地。
      </p>
      <KeyIdea>
        <strong>冷流</strong>：被收集才执行，每个收集者一份独立的数据。<br />
        <strong>热流</strong>：独立于收集者而存在、主动持有 / 广播数据，多个收集者共享同一个数据源。
        Kotlin 提供两种热流：<code>StateFlow</code>（持有<strong>最新值</strong>，表达「状态」）和
        <code>SharedFlow</code>（广播<strong>事件</strong>，表达「发生了一次什么」）。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>StateFlow</th><th>SharedFlow</th></tr>
        </thead>
        <tbody>
          <tr><td>语义</td><td>状态：永远有一个「当前值」</td><td>事件：一次性的广播</td></tr>
          <tr><td>初始值</td><td>必须有</td><td>没有</td></tr>
          <tr><td>新订阅者</td><td>立刻收到当前最新值</td><td>默认收不到订阅前发射的内容</td></tr>
          <tr><td>去重</td><td>值相等时不重复发射（conflate）</td><td>不去重，可配重放缓存</td></tr>
          <tr><td>典型用途</td><td>UI 状态、表单数据、开关</td><td>导航跳转、Toast、一次性提示</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="kotlin" title="StateFlow（状态）与 SharedFlow（事件）" code={stateFlowSnippet} />
      <Callout variant="tip" title="一个常见判断口诀">
        问自己：「这条数据如果界面重建（如旋屏）后<strong>需要立刻拿到当前值</strong>吗？」
        需要——用 StateFlow（状态）；不需要、它是「只该响一次」的事件（如弹一个 Toast）——
        用 SharedFlow（事件）。把一次性事件错配成 StateFlow，旋屏后会把旧事件又重放一遍，造成重复弹窗。
      </Callout>

      <h2>六、背压：下游跟不上上游怎么办</h2>
      <p>
        <strong>背压（backpressure）</strong>指的是上游发射速度比下游处理速度快时的应对策略。
        因为 <code>emit</code> 是挂起函数，默认情况下上游会被「顶住」——下游没处理完，
        上游就挂起等待，天然不会丢数据也不会爆内存。当你不想让上游被拖慢时，可以用：
        <code>buffer()</code>（加一个缓冲区，让上游先跑、下游慢慢消费）或
        <code>conflate()</code>（只保留<strong>最新</strong>值，中间来不及处理的旧值直接丢弃，
        适合「只关心最新状态」的场景）。
      </p>

      <h2>七、在 Android 里：从 Repository 到 UI 的标准接法</h2>
      <p>
        实战中的典型数据流向是：<strong>数据层</strong>（Room / 网络）暴露冷 <code>Flow</code> →
        <strong>ViewModel</strong> 用 <code>stateIn</code> 把它转成热 <code>StateFlow</code> →
        <strong>UI 层</strong>用 <code>collectAsStateWithLifecycle</code> 安全收集。
      </p>
      <h3>ViewModel：用 stateIn 转成 StateFlow</h3>
      <p>
        <code>stateIn</code> 把一个冷流「钉」在某个协程作用域里，变成一个共享的热 StateFlow。
        关键是 <code>started</code> 参数：<code>SharingStarted.WhileSubscribed(5_000)</code> 表示
        「有订阅者时才收集上游，最后一个订阅者离开 5 秒后停止」——这 5 秒的宽限让旋屏等
        短暂无订阅的瞬间不会白白重启上游，同时界面真正退出后能及时释放资源。
      </p>
      <CodeBlock lang="kotlin" title="ViewModel 用 stateIn 暴露 UI 状态" code={stateInSnippet} />
      <h3>UI：用 collectAsStateWithLifecycle 安全收集</h3>
      <p>
        在 Compose 里，绝不要用普通的 <code>collectAsState()</code> 去收集长期存在的流——
        因为它在界面进入后台时仍会继续收集，白白消耗资源、甚至引发崩溃。正确做法是
        <code>collectAsStateWithLifecycle()</code>：它内部基于 <code>repeatOnLifecycle(STARTED)</code>，
        界面不可见时<strong>自动取消</strong>收集，回到前台再恢复。
      </p>
      <CodeBlock lang="kotlin" title="Compose 中用生命周期感知的方式收集" code={collectUiSnippet} />
      <Callout variant="warn" title="为什么必须用生命周期感知的收集">
        想象一个收集网络流的界面被切到后台：如果用普通 <code>collect</code>，上游会持续发起请求、
        持续更新一个用户根本看不见的界面，浪费电量与流量。<code>repeatOnLifecycle</code> /
        <code>collectAsStateWithLifecycle</code> 解决的正是这件事——<strong>不可见就不收集</strong>。
      </Callout>

      <h2>八、小结性的心智模型</h2>
      <ul>
        <li><strong>冷流 = 菜谱</strong>：被 collect 才下厨，每个收集者各跑一遍。</li>
        <li><strong>中间操作 = 加工步骤</strong>：返回新的冷流，<code>flowOn</code> / <code>catch</code> 只管上游。</li>
        <li><strong>终端操作 = 点火</strong>：<code>collect</code> 等才真正触发执行。</li>
        <li><strong>热流 = 共享的数据源</strong>：StateFlow 管状态、SharedFlow 管事件。</li>
        <li><strong>Android 接法</strong>：Repository 冷流 → <code>stateIn</code> → <code>collectAsStateWithLifecycle</code>。</li>
      </ul>

      <Summary
        points={[
          'Flow 是冷的异步数据流：拿到时一行未跑，只有终端操作（collect）去收集才从头执行并逐个 emit；每个收集者独立跑一遍。',
          '用 flow{} + emit 构建；中间操作符 map / filter / transform / onEach / catch / flowOn 返回新的冷流，flowOn 与 catch 只作用于上游，位置很关键。',
          '终端操作（collect / toList / first / collectLatest 等）是挂起函数，是真正触发整条链执行的那一下。',
          '热流独立于收集者：StateFlow 持有最新值表达状态（有初始值、新订阅者立即拿到当前值）；SharedFlow 广播一次性事件（无当前值）。',
          '背压：emit 挂起天然顶住上游不丢数据；buffer 加缓冲让上游先跑，conflate 只保留最新值丢弃旧值。',
          'Android 标准接法：Repository 冷 Flow → ViewModel 用 stateIn(WhileSubscribed) 转 StateFlow → UI 用 collectAsStateWithLifecycle（基于 repeatOnLifecycle）后台不收集、省电。',
        ]}
      />
    </article>
  )
}
