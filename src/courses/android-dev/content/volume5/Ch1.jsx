import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const badViewModelSnippet = `// 反面教材：把网络请求、状态、错误处理统统塞进 Composable / Activity
@Composable
fun UserScreen() {
    var user by remember { mutableStateOf<User?>(null) }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        loading = true
        // 直接在 UI 里发请求：屏幕旋转后协程被取消、状态全丢，请求重来一遍
        user = RetrofitClient.api.getUser(42)  // 还硬编码了依赖，没法测试
        loading = false
    }
    // UI 既管「长什么样」又管「怎么拿数据」，逻辑和界面死死耦合
}`

const uiStateSnippet = `// 1. 用一个不可变的数据类描述「界面此刻的全部状态」
data class UserUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val errorMessage: String? = null,
)

// 也常见用 sealed interface 表达「互斥」的几种状态
sealed interface UserUiState2 {
    data object Loading : UserUiState2
    data class Success(val user: User) : UserUiState2
    data class Error(val message: String) : UserUiState2
}`

const viewModelSnippet = `class UserViewModel(
    private val repository: UserRepository,  // 依赖通过构造函数传入，便于替换 / 测试
) : ViewModel() {

    // 可变状态对内私有，外部只能拿到只读的 StateFlow
    private val _uiState = MutableStateFlow(UserUiState(isLoading = true))
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    init {
        loadUser(42)
    }

    // 处理来自 UI 的「事件」，把新「状态」写回 _uiState
    fun loadUser(id: Int) {
        // viewModelScope 与 ViewModel 生命周期绑定，ViewModel 销毁时自动取消协程
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val user = repository.getUser(id)
                _uiState.update { it.copy(isLoading = false, user = user) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
            }
        }
    }

    fun retry() = loadUser(42)
}`

const composableSnippet = `@Composable
fun UserScreen(viewModel: UserViewModel = viewModel()) {
    // collectAsStateWithLifecycle：跟随生命周期收集，界面不可见时自动暂停收集
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // UI 只做两件事：根据「状态」渲染、把「事件」回调给 ViewModel
    when {
        uiState.isLoading -> CircularProgressIndicator()
        uiState.errorMessage != null -> ErrorView(
            message = uiState.errorMessage!!,
            onRetry = { viewModel.retry() },     // 事件向上
        )
        uiState.user != null -> Text("Hello, \${uiState.user!!.name}")
    }
}`

const repositorySnippet = `// Data Layer：Repository 是「数据的唯一可信来源」，对上屏蔽数据从哪来
class UserRepository(
    private val api: UserApi,        // 远端数据源
    private val dao: UserDao,        // 本地缓存数据源
) {
    suspend fun getUser(id: Int): User {
        return try {
            val remote = api.fetchUser(id)   // 先取网络
            dao.insert(remote)               // 再写入本地缓存
            remote
        } catch (e: Exception) {
            dao.findById(id) ?: throw e      // 网络失败回退到缓存
        }
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        前面几卷我们已经能用 Jetpack Compose 把界面画出来、让它响应点击。但随着功能变多，
        一个问题会越来越扎眼：如果把「请求数据、处理错误、保存状态」全写进 Composable 或 Activity，
        代码会迅速变成一团乱麻，旋转一下屏幕状态就全丢，还几乎没法写单元测试。
        这一章我们讲 Android 官方推荐的<strong>应用架构</strong>，核心是 MVVM 模式里的
        <strong>ViewModel</strong> 与用 <strong>StateFlow</strong> 暴露不可变状态的单向数据流。
      </Lead>

      <h2>一、为什么需要「架构」</h2>
      <p>
        「架构」听起来很大，但要解决的问题很具体：当一个界面同时承担<strong>怎么显示</strong>和
        <strong>数据从哪来、怎么处理</strong>两份职责时，它会变得又长又脆。我们先看一段典型的坏代码，
        感受一下没有架构时的痛点。
      </p>
      <CodeBlock lang="kotlin" title="反面教材：UI 里什么都干" code={badViewModelSnippet} />
      <p>上面这段代码至少有三个毛病，恰好对应架构要解决的三件事：</p>
      <ul>
        <li>
          <strong>逻辑与 UI 耦合</strong>：界面代码里混着网络请求和状态管理，读不懂、改不动，
          换个界面就得把逻辑重抄一遍。架构要做的第一件事，就是把业务逻辑<strong>从 UI 抽离</strong>。
        </li>
        <li>
          <strong>不可测试</strong>：依赖被硬编码成 <code>RetrofitClient</code>，单元测试时无法替换成假数据，
          想测「请求失败时显示错误」根本无从下手。
        </li>
        <li>
          <strong>抗不住配置变更</strong>：屏幕旋转、切换语言、深色模式开关，都会让 Activity
          重建。<code>remember</code> 里的状态随之丢失、协程被取消，请求只能从头再来。
        </li>
      </ul>
      <KeyIdea>
        好的架构本质上是<strong>分离关注点</strong>：让界面只负责「长什么样」，
        让另一层负责「数据与逻辑」。分离之后，逻辑可被独立测试、可被复用，状态也能挺过配置变更。
      </KeyIdea>

      <h2>二、官方推荐的分层</h2>
      <p>
        Android 官方在 <em>Guide to app architecture</em> 里给出一套推荐分层。它不强制，但久经检验，
        新项目照着搭基本不会错。核心是三层（中间一层可选）：
      </p>
      <table>
        <thead>
          <tr><th>层</th><th>职责</th><th>典型成员</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>UI Layer（界面层）</td>
            <td>把状态画成界面、把用户操作变成事件</td>
            <td>Composable + ViewModel</td>
          </tr>
          <tr>
            <td>Domain Layer（领域层，可选）</td>
            <td>封装复用的业务规则，给一个动作起个名字</td>
            <td>UseCase / Interactor</td>
          </tr>
          <tr>
            <td>Data Layer（数据层）</td>
            <td>提供「数据的唯一可信来源」，屏蔽数据从哪来</td>
            <td>Repository + 数据源（网络 / 数据库）</td>
          </tr>
        </tbody>
      </table>
      <p>
        数据的依赖方向是<strong>单向</strong>的：UI 依赖 Domain，Domain 依赖 Data，反过来不行。
        界面层不会直接碰 Retrofit 或 Room，它只跟 ViewModel 说话；ViewModel 也不直接发请求，
        它只跟 Repository 要数据。每一层只认识它下面那层暴露的接口，互不越界。
      </p>

      <h3>UI Layer：Composable + ViewModel</h3>
      <p>
        界面层内部还分两半。<strong>Composable</strong> 是纯展示，它接收一个状态对象、把它渲染出来，
        并在用户操作时回调事件——它本身不持有也不处理业务逻辑。
        <strong>ViewModel</strong> 则是界面背后的「状态持有者与逻辑协调者」：它准备好界面要的状态，
        接收界面发来的事件，调用下层拿数据，再把结果整理成新状态。
      </p>

      <h3>Domain Layer：UseCase（可选）</h3>
      <p>
        当某段业务逻辑被多个 ViewModel 复用，或一个动作要组合好几个 Repository 时，
        可以把它抽成一个 <strong>UseCase</strong>（也叫 Interactor），通常就是一个只有单一公开方法的类，
        比如 <code>GetUserProfileUseCase</code>。小项目里这一层可以省略，让 ViewModel 直接用 Repository。
      </p>

      <h3>Data Layer：Repository + 数据源</h3>
      <p>
        数据层的门面是 <strong>Repository</strong>。它对上层只暴露「我能给你哪些数据」，
        至于这数据是来自网络、本地数据库还是内存缓存，全藏在它内部。它是这类数据的
        <strong>唯一可信来源（single source of truth）</strong>。
      </p>
      <CodeBlock lang="kotlin" title="Data Layer：Repository 协调多个数据源" code={repositorySnippet} />

      <h2>三、ViewModel 是什么，为何能跨配置变更存活</h2>
      <p>
        <code>ViewModel</code> 是 Jetpack 提供的一个类，专门用来<strong>持有并管理界面相关的状态与逻辑</strong>。
        它最关键的特性是：它的生命周期<strong>比 Activity / Fragment 更长</strong>。
      </p>
      <p>
        当你旋转屏幕，Activity 会被销毁并立刻重建，但与它关联的 ViewModel
        <strong>不会</strong>被销毁——系统会把同一个 ViewModel 实例交给重建后的 Activity。
        于是 ViewModel 里保存的状态、正在跑的协程都原封不动地留了下来，界面只需重新读一次状态即可。
        只有当 Activity 是<strong>真正地、永久地</strong>结束（比如用户按返回键退出、或它被彻底 finish），
        ViewModel 才会收到 <code>onCleared()</code> 回调并销毁。
      </p>
      <KeyIdea>
        ViewModel 的生命周期与「界面所属的范围」绑定，而不是与某个 Activity 实例绑定。
        配置变更只销毁 Activity 实例、不销毁这个范围，所以 ViewModel 能跨配置变更存活，
        天然解决了状态丢失问题。
      </KeyIdea>
      <Callout variant="warn" title="不要把 Context / View 放进 ViewModel">
        正因为 ViewModel 活得比 Activity 久，如果你在它里面持有 Activity、View 或任何带
        Activity Context 的引用，被销毁的 Activity 就无法被回收，造成<strong>内存泄漏</strong>。
        ViewModel 里只放状态和与界面无关的依赖（如 Repository）。需要 Context 时用
        <code>AndroidViewModel</code> 提供的 Application Context。
      </Callout>
      <p>
        ViewModel 里发起的异步工作要用 <code>viewModelScope</code>——这是一个与 ViewModel
        生命周期绑定的协程作用域。ViewModel 被销毁时，<code>viewModelScope</code>
        里所有协程会被自动取消，不会泄漏。
      </p>

      <h2>四、用 StateFlow 暴露不可变的 UiState</h2>
      <p>
        界面在任一时刻的样子，可以用一个数据对象完整描述：在加载吗？拿到数据了吗？出错了吗？
        我们把它叫做 <strong>UiState</strong>，通常是一个<strong>不可变</strong>的 <code>data class</code>
        或 <code>sealed interface</code>。
      </p>
      <CodeBlock lang="kotlin" title="UiState：用一个对象描述界面全部状态" code={uiStateSnippet} />
      <p>
        ViewModel 内部用一个 <strong>可变</strong>的 <code>MutableStateFlow</code> 持有当前状态，
        对外只暴露<strong>只读</strong>的 <code>StateFlow</code>。这样界面只能<em>读</em>状态、不能直接改，
        所有状态变更都必须经过 ViewModel——状态的来源因此唯一且可控。
      </p>
      <Example title="为什么对外是 StateFlow 而不是 MutableStateFlow">
        <p>
          <code>{'_uiState'}</code> 是 <code>{'MutableStateFlow<UserUiState>'}</code>，私有；
          对外暴露的 <code>uiState</code> 类型是只读的 <code>{'StateFlow<UserUiState>'}</code>。
        </p>
        <p>
          如果直接把可变的那个暴露出去，界面层就能绕过 ViewModel 偷偷改状态，
          单向数据流立刻被打破。用 <code>asStateFlow()</code> 把它「降级」成只读，是一种纪律。
        </p>
      </Example>

      <h2>五、单向数据流：状态向下，事件向上</h2>
      <p>
        把上面几件事串起来，就得到 MVVM 里最重要的数据流动模式——<strong>单向数据流（UDF）</strong>：
      </p>
      <ul>
        <li><strong>状态向下（state down）</strong>：ViewModel 把 <code>UiState</code> 通过 <code>StateFlow</code> 流向 Composable，Composable 据此渲染。</li>
        <li><strong>事件向上（event up）</strong>：用户在界面上的操作（点击、输入）变成一个个事件回调，向上传给 ViewModel。</li>
        <li>ViewModel 收到事件 → 调用下层 → 算出新状态 → 写回 <code>StateFlow</code> → 状态又向下流，界面自动更新。</li>
      </ul>
      <p>数据像一个闭环单向转动，永远只朝一个方向流，谁也不能抄近路。下面是 ViewModel 的完整写法：</p>
      <CodeBlock lang="kotlin" title="ViewModel：持有状态、处理事件、调用 Repository" code={viewModelSnippet} />
      <p>
        界面这一侧，Composable 用 <code>collectAsStateWithLifecycle()</code> 来收集这个
        <code>StateFlow</code>。相比普通的 <code>collectAsState()</code>，它会跟随界面的生命周期：
        当界面进入后台不可见时<strong>自动暂停收集</strong>，回到前台再恢复，避免在用户看不见时
        白白消耗资源、甚至更新一个已经不可见的界面。
      </p>
      <CodeBlock lang="kotlin" title="Composable：渲染状态、回调事件" code={composableSnippet} />

      <h2>六、StateFlow 与 LiveData 怎么选</h2>
      <p>
        在 StateFlow 普及之前，Jetpack 提供的可观察状态容器是 <code>LiveData</code>，它也能感知生命周期、
        在配置变更后自动重新分发数据。两者能力高度重叠，那为什么新项目普遍倾向 StateFlow？
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>StateFlow</th><th>LiveData</th></tr>
        </thead>
        <tbody>
          <tr><td>所属</td><td>Kotlin 协程（Flow 家族）</td><td>Jetpack（偏 Android）</td></tr>
          <tr><td>初始值</td><td>必须有，状态永不为空</td><td>可为空</td></tr>
          <tr><td>操作符</td><td>可用 Flow 的 map / filter / combine 等</td><td>能力有限</td></tr>
          <tr><td>平台依赖</td><td>纯 Kotlin，可用于 KMP / 纯单元测试</td><td>依赖 Android 主线程</td></tr>
        </tbody>
      </table>
      <p>
        <strong>一句话取舍</strong>：纯 Kotlin、与协程一脉相承、又能跑在跨平台与纯单元测试里，
        所以现代 Compose 项目优先用 <code>StateFlow</code>；只有在维护老项目、或大量沿用 LiveData
        的代码库里，才继续用 LiveData。
      </p>

      <h2>七、一个小问题：依赖怎么进 ViewModel？</h2>
      <p>
        细心的你应该发现了：<code>UserViewModel</code> 的构造函数需要一个 <code>UserRepository</code>，
        <code>UserRepository</code> 又需要 <code>UserApi</code> 和 <code>UserDao</code>。这些对象由谁来创建、
        又怎么塞进去？如果到处手动 <code>new</code>，很快又会陷入耦合与难测试的老问题。
        这正是下一章<strong>依赖注入</strong>要解决的事。
      </p>
      <Callout variant="tip">
        下一章我们引入 Hilt，让框架自动帮我们把 Repository 注入到 ViewModel，
        既消除了手动拼装的样板代码，又让测试时能轻松换上假的实现。
      </Callout>

      <Summary
        points={[
          '架构的本质是分离关注点：让 UI 只管显示、把数据与逻辑抽离出去，从而可测试、可复用、抗配置变更。',
          '官方推荐分层：UI Layer（Composable + ViewModel）、可选的 Domain Layer（UseCase）、Data Layer（Repository + 数据源）；依赖单向向下。',
          'ViewModel 的生命周期比 Activity 长，配置变更（如旋转）只重建 Activity 而不销毁 ViewModel，状态因此得以保留；异步用 viewModelScope。',
          '用不可变的 UiState（data class 或 sealed interface）描述界面全部状态，内部用 MutableStateFlow，对外只暴露只读 StateFlow。',
          '单向数据流：状态向下（StateFlow 流向 Composable）、事件向上（回调传回 ViewModel），界面用 collectAsStateWithLifecycle 收集。',
          'StateFlow 是纯 Kotlin、有初始值、操作符丰富、便于测试，现代项目优先于 LiveData；LiveData 主要见于老项目。',
        ]}
      />
    </article>
  )
}
