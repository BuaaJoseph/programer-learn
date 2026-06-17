import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const callbackHellSnippet = `// 回调地狱：每个异步步骤都嵌一层回调，越嵌越深、错误处理散落各处
fetchUser(userId) { user ->
    fetchProfile(user.id) { profile ->
        fetchAvatar(profile.avatarUrl) { avatar ->
            runOnUiThread {
                showAvatar(avatar)   // 终于到了 UI 更新，已经缩进四层
            }
        }
    }
}`

const suspendSnippet = `// suspend 关键字：标记一个「可挂起」函数
// 它能在等待结果时挂起（暂停）而不阻塞所在线程，等结果回来再恢复执行
suspend fun fetchUser(id: String): User {
    val profile = fetchProfile(id)   // 这里会挂起，但线程被释放去做别的事
    val avatar = fetchAvatar(profile.avatarUrl)
    return User(id, profile, avatar)
}

// suspend 函数只能在协程或另一个 suspend 函数里调用——编译器强制如此`

const builderSnippet = `import kotlinx.coroutines.*

fun main() = runBlocking {
    // launch：启动一个协程，不返回结果（fire-and-forget），返回 Job 可用于取消
    val job = launch {
        delay(1000)            // 挂起 1 秒，不阻塞线程
        println("任务完成")
    }

    // async：启动一个协程并返回 Deferred<T>，用 await() 拿到结果
    val deferred: Deferred<Int> = async {
        delay(500)
        42
    }
    val result: Int = deferred.await()   // 挂起直到结果就绪
    println("结果是 \$result")

    job.join()   // 等待 launch 的协程结束
}`

const dispatcherSnippet = `import kotlinx.coroutines.*

suspend fun loadData() {
    // 默认在当前调度器执行。用 withContext 切换线程池，块结束后自动切回
    val raw = withContext(Dispatchers.IO) {
        // IO 调度器：适合网络请求、读写文件、数据库等阻塞型 IO
        httpGet("https://api.example.com/data")
    }

    val parsed = withContext(Dispatchers.Default) {
        // Default 调度器：适合 CPU 密集计算（解析、排序、图像处理）
        parseHeavy(raw)
    }

    withContext(Dispatchers.Main) {
        // Main 调度器：Android 主线程，只能在这里更新 UI
        textView.text = parsed.title
    }
}`

const structuredSnippet = `import kotlinx.coroutines.*

suspend fun loadDashboard() = coroutineScope {
    // coroutineScope 建立一个作用域：它会等所有子协程结束后才返回
    val user = async { fetchUser() }      // 子协程 1
    val news = async { fetchNews() }      // 子协程 2，二者并发执行

    // 结构化并发的保证：
    // 1) 父作用域会等待所有子协程完成
    // 2) 任一子协程失败 -> 取消会传播，兄弟协程一并被取消
    // 3) 外部取消父作用域 -> 所有子协程自动取消，不会泄漏
    Dashboard(user.await(), news.await())
}`

const androidScopeSnippet = `// ViewModel 中：viewModelScope 在 ViewModel 清除时自动取消，避免泄漏
class UserViewModel : ViewModel() {
    fun loadUser(id: String) {
        viewModelScope.launch {
            val user = withContext(Dispatchers.IO) { repo.fetchUser(id) }
            _uiState.value = UiState.Success(user)   // 已在主线程，安全更新
        }
    }
}

// Activity/Fragment 中：lifecycleScope 绑定生命周期，界面销毁时自动取消
class ProfileActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            val data = repo.load()
            render(data)
        }
    }
}`

const networkExampleSnippet = `import kotlinx.coroutines.*

class NewsViewModel(private val api: NewsApi) : ViewModel() {

    private val _state = MutableStateFlow<UiState>(UiState.Loading)
    val state: StateFlow<UiState> = _state

    fun refresh() {
        // 1) 在 viewModelScope 启动，绑定 ViewModel 生命周期
        viewModelScope.launch {
            _state.value = UiState.Loading
            try {
                // 2) 网络请求切到 IO 线程，绝不在主线程做阻塞 IO
                val articles = withContext(Dispatchers.IO) {
                    api.fetchTopArticles()       // suspend 网络调用
                }
                // 3) launch 块本身跑在 Main，可直接更新 UI 状态
                _state.value = UiState.Success(articles)
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "未知错误")
            }
        }
    }
}

sealed class UiState {
    object Loading : UiState()
    data class Success(val articles: List<Article>) : UiState()
    data class Error(val message: String) : UiState()
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        异步编程是 Android 开发绕不开的难题：网络请求、数据库读写都不能放在主线程，
        否则界面会卡死。传统做法是回调，结果代码层层嵌套、难以维护，俗称「回调地狱」。
        Kotlin 的<strong>协程（Coroutine）</strong>给出了优雅答案——让你用近乎同步的写法
        表达异步逻辑。这一章讲清协程的来龙去脉：为什么需要它、<code>suspend</code> 是什么、
        作用域与构建器、调度器切线程、结构化并发，以及它在 Android 里的正确用法。
      </Lead>

      <h2>一、为什么需要协程</h2>
      <p>
        Android 有一条铁律：<strong>主线程（UI 线程）不能被阻塞</strong>。所有界面绘制、
        事件响应都在主线程进行；一旦你在主线程做耗时操作（网络请求、读大文件、复杂计算），
        界面就会冻住，超过约 5 秒系统甚至会弹出 ANR（应用无响应）。
      </p>
      <p>
        所以耗时活儿必须放到后台线程，做完再切回主线程更新 UI。传统方案是<strong>回调</strong>：
        把「做完之后该干什么」作为函数传进去。单层还好，可一旦多个异步步骤前后依赖，
        回调就会层层嵌套成下面这样。
      </p>
      <CodeBlock lang="kotlin" title="回调地狱：嵌套越来越深" code={callbackHellSnippet} />
      <p>
        回调地狱的问题不止是缩进难看：错误处理散落在每一层、控制流被打碎、想加个循环或
        条件分支异常笨拙。协程要解决的正是这件事——<strong>让异步代码读起来像同步代码</strong>，
        顺序、循环、try/catch 都照常写。
      </p>

      <h2>二、suspend 函数：可挂起，但不阻塞线程</h2>
      <KeyIdea>
        <code>suspend</code>（挂起）函数是协程的基石。它能在等待结果时<strong>挂起</strong>——
        暂停自己的执行、把所在线程<strong>释放</strong>出去做别的事，等结果回来后再从挂起点
        <strong>恢复</strong>。关键区别在于：它挂起的是「协程」，而不是「线程」，所以
        <strong>不阻塞线程</strong>。
      </KeyIdea>
      <p>
        普通阻塞会霸占线程干等（线程啥也干不了）；而 <code>suspend</code> 函数挂起时会把线程
        让出去，等 IO 或定时结束，再找个线程把协程恢复。这就是协程能用极少线程
        承载海量并发任务的原因。
      </p>
      <CodeBlock lang="kotlin" title="suspend 函数：顺序写法表达异步" code={suspendSnippet} />
      <p>
        编译器有个硬规则：<code>suspend</code> 函数只能在另一个 <code>suspend</code> 函数里、
        或在协程内部调用。这保证了「挂起能力」总是在一个能处理挂起的上下文中被使用。
        要进入协程世界，就需要协程构建器。
      </p>

      <h2>三、作用域与构建器：launch 与 async</h2>
      <p>
        协程总是运行在某个 <strong>CoroutineScope（协程作用域）</strong>里——作用域决定了
        协程的生命周期与取消范围。在作用域上调用<strong>构建器</strong>来启动协程，
        最常用的两个是 <code>launch</code> 和 <code>async</code>。
      </p>
      <CodeBlock lang="kotlin" title="launch / async / await" code={builderSnippet} />
      <table>
        <thead>
          <tr><th>构建器</th><th>返回</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>launch</code></td>
            <td><code>Job</code></td>
            <td>启动不需要返回值的任务（fire-and-forget），用 Job 控制/取消</td>
          </tr>
          <tr>
            <td><code>async</code></td>
            <td><code>{'Deferred<T>'}</code></td>
            <td>启动需要返回结果的任务，用 <code>await()</code> 取结果；多个 async 可并发</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="并发的关键：先启动，后 await">
        要让两个任务<strong>并发</strong>，应先连续启动两个 <code>async</code>，再分别
        <code>await()</code>；如果启动一个就立刻 <code>await()</code>，它们会变成串行。
      </Callout>

      <h2>四、调度器 Dispatchers：决定代码跑在哪个线程</h2>
      <p>
        协程运行在哪个线程，由<strong>调度器（Dispatcher）</strong>决定。用
        <code>withContext(调度器)</code> 可以把一段代码切到指定线程池执行，块结束后
        自动切回原来的上下文——这正是「后台干活、回主线程更新 UI」的标准做法。
      </p>
      <CodeBlock lang="kotlin" title="用 withContext 切换调度器" code={dispatcherSnippet} />
      <table>
        <thead>
          <tr><th>调度器</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Dispatchers.Main</code></td><td>Android 主线程，唯一能更新 UI 的地方</td></tr>
          <tr><td><code>Dispatchers.IO</code></td><td>阻塞型 IO：网络、文件、数据库</td></tr>
          <tr><td><code>Dispatchers.Default</code></td><td>CPU 密集计算：解析、排序、图像处理</td></tr>
        </tbody>
      </table>

      <h2>五、结构化并发：协程不会「失控泄漏」</h2>
      <KeyIdea>
        <strong>结构化并发</strong>是协程设计的灵魂：每个协程都属于某个作用域，形成
        父子层级。父协程会<strong>等待</strong>所有子协程结束；任一子协程出错，取消会
        <strong>传播</strong>给兄弟与父级；外部取消父作用域，所有子协程<strong>自动取消</strong>。
        于是不会有「无人看管、悄悄泄漏」的协程。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="coroutineScope：并发且受管控" code={structuredSnippet} />
      <p>
        对比裸开线程：线程一旦启动就「断了线」，你得自己记得管理与回收，忘了就泄漏。
        结构化并发把生命周期收进作用域的树形结构，让取消与异常沿着这棵树正确传播，
        极大降低了并发代码的心智负担。
      </p>
      <Example title="取消传播">
        <p>
          在一个 <code>coroutineScope</code> 里并发跑 <code>fetchUser()</code> 与
          <code>fetchNews()</code>，若 <code>fetchNews()</code> 抛异常，框架会自动取消还在
          运行的 <code>fetchUser()</code>，并让异常向上传播——不会出现「一个挂了、另一个还在
          白白消耗资源」的情况。
        </p>
      </Example>

      <h2>六、在 Android 里：lifecycleScope 与 viewModelScope</h2>
      <p>
        Android 提供了与组件生命周期绑定的现成作用域，用它们启动协程，组件销毁时协程会
        <strong>自动取消</strong>，从根本上避免内存泄漏和「界面没了协程还在更新」的崩溃。
      </p>
      <CodeBlock lang="kotlin" title="viewModelScope 与 lifecycleScope" code={androidScopeSnippet} />
      <ul>
        <li>
          <strong><code>viewModelScope</code></strong>：绑定 ViewModel，ViewModel 被清除
          （<code>onCleared</code>）时自动取消。承载业务/数据加载逻辑的首选。
        </li>
        <li>
          <strong><code>lifecycleScope</code></strong>：绑定 Activity/Fragment 生命周期，
          界面销毁时自动取消。适合与界面强相关的协程。
        </li>
      </ul>

      <h2>七、实战：用协程做网络请求并更新 UI</h2>
      <p>
        把前面的知识串成一个典型 Android 场景：点刷新 → 显示加载中 → 后台请求网络 →
        成功展示数据、失败展示错误。注意三处线程纪律：在 <code>viewModelScope</code> 启动、
        网络请求用 <code>Dispatchers.IO</code>、回到 <code>launch</code> 块（默认 Main）安全更新状态。
      </p>
      <CodeBlock lang="kotlin" title="协程网络请求 + 状态更新" code={networkExampleSnippet} />
      <p>
        整段代码顺序读下来就像同步逻辑：先设 Loading、再请求、再设 Success，错误用普通
        <code>try/catch</code> 兜住——这正是协程相比回调地狱最直观的胜利。配合
        <code>StateFlow</code>，界面层订阅 <code>state</code> 即可在三种状态间自动切换渲染。
      </p>

      <h2>八、常见错误与边界</h2>
      <Callout variant="warn" title="别在主线程做阻塞 IO">
        即便在协程里，如果你在 <code>Dispatchers.Main</code> 上下文直接调用阻塞式网络/文件操作，
        照样会卡住主线程。耗时阻塞 IO 必须包进 <code>withContext(Dispatchers.IO)</code>。
        理想情况下，suspend 库函数（如 Retrofit 的 suspend 接口）已是主线程安全的，无需手动切。
      </Callout>
      <Callout variant="warn" title="别忘了切回主线程更新 UI">
        UI 只能在主线程更新。如果你在 <code>Dispatchers.IO</code> 块里直接改控件，会抛异常或
        行为异常。要么用 <code>withContext(Dispatchers.Main)</code> 切回，要么把 UI 更新写在
        <code>launch</code>（默认 Main）块的主体里、而非 IO 块内。
      </Callout>
      <ul>
        <li>
          <strong>不要用 GlobalScope</strong>：它脱离结构化并发，不绑定任何生命周期，
          极易泄漏。优先用 <code>viewModelScope</code> / <code>lifecycleScope</code>。
        </li>
        <li>
          <strong>取消要协作</strong>：协程取消依赖挂起点检查；纯 CPU 死循环若不主动检查
          <code>isActive</code> 或调用挂起函数，可能取消不掉。
        </li>
        <li>
          <strong><code>CancellationException</code> 别吞</strong>：用 <code>catch (e: Exception)</code>
          时若捕获到它应重新抛出，否则会破坏取消机制。
        </li>
      </ul>

      <Callout variant="tip">
        协程是后续 Compose、Flow、数据层等所有异步章节的地基。掌握「suspend 不阻塞、
        作用域管生命周期、Dispatchers 切线程、结构化并发管取消」这四点，后面就都顺了。
      </Callout>

      <Summary
        points={[
          '主线程不能阻塞，否则界面卡死甚至 ANR；耗时操作必须后台执行、再切回主线程更新 UI。传统回调方案导致回调地狱。',
          'suspend 函数可挂起而不阻塞线程：挂起时让出线程，结果回来再恢复，让异步代码用同步写法表达。suspend 只能在协程或另一 suspend 函数中调用。',
          '协程跑在 CoroutineScope 里，用构建器启动：launch 返回 Job（无返回值），async 返回 Deferred、用 await() 取结果，多个 async 可并发。',
          'Dispatchers 决定线程：Main 更新 UI、IO 做网络/文件、Default 做 CPU 计算；用 withContext 切换，块结束自动切回。',
          '结构化并发：父作用域等待子协程、异常与取消沿树传播、外部取消则子协程自动取消，避免泄漏。',
          'Android 用 viewModelScope/lifecycleScope 绑定生命周期自动取消；常见错误是主线程做阻塞 IO、IO 块里直接更新 UI、滥用 GlobalScope。',
        ]}
      />
    </article>
  )
}
