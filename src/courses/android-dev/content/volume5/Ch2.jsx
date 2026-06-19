import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const manualDiSnippet = `// 手动 DI 的痛点：依赖链一长，拼装代码就爆炸
class UserViewModel {
    private val repository = UserRepository(
        api = Retrofit.Builder()
            .baseUrl("https://api.example.com")
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(UserApi::class.java),
        dao = Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
            .build()
            .userDao(),
    )
    // 每个需要 Repository 的地方都要把上面这坨重抄一遍；
    // 想换实现、想在测试里用假的，几乎不可能。
}`

const appSnippet = `// 1. 在 Application 上标注 @HiltAndroidApp，开启整个 Hilt 代码生成
@HiltAndroidApp
class MyApplication : Application()

// 别忘了在 AndroidManifest.xml 的 <application> 里声明 android:name=".MyApplication"`

const entryPointSnippet = `// 2. 让 Android 入口（Activity / Fragment）成为「注入点」
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { UserScreen() }   // ViewModel 会被自动注入，下面会讲
    }
}`

const constructorInjectSnippet = `// 3. 能自己构造的类，用 @Inject 标注构造函数即可，Hilt 自动负责创建
class UserRepository @Inject constructor(
    private val api: UserApi,   // 这两个依赖 Hilt 也会想办法提供
    private val dao: UserDao,
) {
    suspend fun getUser(id: Int): User = api.fetchUser(id)
}`

const moduleSnippet = `// 4. 无法用 @Inject 构造的依赖（第三方类、接口），用 Module 提供
@Module
@InstallIn(SingletonComponent::class)   // 安装到「整个应用」这个作用域
object NetworkModule {

    // @Provides：手把手写出「怎么造一个 Retrofit / UserApi」
    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.example.com")
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi =
        retrofit.create(UserApi::class.java)
}

// @Binds：当你想把「接口」绑定到「某个实现」，比 @Provides 更省样板
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindUserRepository(impl: UserRepositoryImpl): UserRepository
}`

const hiltViewModelSnippet = `// 5. ViewModel 用 @HiltViewModel + @Inject 构造，依赖自动注入
@HiltViewModel
class UserViewModel @Inject constructor(
    private val repository: UserRepository,   // Hilt 直接把 Repository 送进来
) : ViewModel() {

    private val _uiState = MutableStateFlow(UserUiState(isLoading = true))
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    fun loadUser(id: Int) {
        viewModelScope.launch {
            try {
                val user = repository.getUser(id)
                _uiState.update { it.copy(isLoading = false, user = user) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
            }
        }
    }
}

// 在 Composable 里用 hiltViewModel() 取到注入好的实例
@Composable
fun UserScreen(viewModel: UserViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    // ...根据 uiState 渲染
}`

const testSnippet = `// 测试时：手动塞进一个「假的」Repository，不碰真实网络
class FakeUserRepository : UserRepository {
    override suspend fun getUser(id: Int): User = User(id, "Test User")
}

class FakeErrorRepository : UserRepository {
    override suspend fun getUser(id: Int): User = throw IOException("boom")
}

@Test
fun whenLoadFails_uiStateShowsError() = runTest {
    // 因为 ViewModel 的依赖是构造注入的，测试里直接 new 一个、传入假实现即可
    val viewModel = UserViewModel(FakeErrorRepository())
    viewModel.loadUser(1)
    assertNotNull(viewModel.uiState.value.errorMessage)   // 断言错误状态被正确设置
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章末尾我们留了个问题：<code>UserViewModel</code> 需要 <code>UserRepository</code>，
        而 Repository 又需要 <code>UserApi</code>、<code>UserDao</code>……这些对象由谁创建、怎么传进去？
        如果一路手动 <code>new</code>，拼装代码会膨胀，依赖被写死，测试也无从替换。
        这一章我们讲<strong>依赖注入（Dependency Injection, DI）</strong>，
        以及 Android 官方的 DI 框架 <strong>Hilt</strong>，用它把 Repository 优雅地注入到 ViewModel。
      </Lead>

      <h2>一、为什么需要依赖注入</h2>
      <p>
        一个类要干活，往往需要别的对象帮忙——这些「别的对象」就是它的<strong>依赖</strong>。
        关键问题是：这些依赖<strong>由谁来准备</strong>？有两种思路：
      </p>
      <ul>
        <li><strong>自己造</strong>：类在内部直接 <code>new</code> 出它需要的依赖。简单，但把自己和具体实现焊死了。</li>
        <li><strong>别人给</strong>：依赖从外部传进来（通过构造函数或方法参数），类自己不关心它从哪来。这就是「依赖注入」。</li>
      </ul>
      <KeyIdea>
        依赖注入的核心，就是把「创建依赖」与「使用依赖」这两件事<strong>分开</strong>：
        一个类只<strong>声明</strong>自己需要什么，由外部把现成的依赖<strong>送进来</strong>，
        而不是自己动手创建。
      </KeyIdea>
      <p>这样做带来三个直接好处：</p>
      <ul>
        <li><strong>解耦</strong>：类只依赖抽象（接口），不依赖具体怎么造，改造方式不影响使用方。</li>
        <li><strong>可替换</strong>：开发用真实现、调试用日志版、灰度用另一套，换的只是「送进来的东西」。</li>
        <li><strong>可测试</strong>：测试时把真实依赖换成假的（fake / mock），就能脱离网络、数据库独立测逻辑。</li>
      </ul>

      <h2>二、手动 DI 的痛点</h2>
      <p>
        其实「把依赖通过构造函数传进来」本身就是 DI，不需要任何框架。问题在于：
        谁来把整条依赖链<strong>拼装</strong>起来？依赖一深，手动拼装就会变成噩梦。
      </p>
      <CodeBlock lang="kotlin" title="手动拼装：依赖链一长就爆炸" code={manualDiSnippet} />
      <p>
        上面只是两层依赖就已经这么长了。真实项目里 Repository 依赖 Api 和 Dao，
        Api 依赖 Retrofit，Retrofit 依赖 OkHttpClient，OkHttpClient 又依赖拦截器……
        手动 DI 会暴露几个痛点：拼装样板代码到处复制、对象的<strong>作用域</strong>（该共享一个还是每次新建）
        难以管理、新增一层依赖要改动所有调用处。我们需要一个<strong>自动拼装</strong>依赖图的工具。
      </p>

      <h2>三、Hilt 是什么</h2>
      <p>
        <strong>Hilt</strong> 是 Android 官方推荐的依赖注入框架，构建在成熟的
        <strong>Dagger</strong> 之上。Dagger 功能强大但配置繁琐，Hilt 在它之上做了一层针对 Android 的封装，
        预置好与 Application、Activity、ViewModel 等组件对应的<strong>作用域容器</strong>，
        让你用少量注解就能让框架在<strong>编译期</strong>自动生成依赖拼装代码。
      </p>
      <Callout variant="info" title="编译期生成，不是运行时反射">
        Hilt（Dagger）在<strong>编译时</strong>就把依赖图分析好、生成拼装代码。这意味着依赖配错了
        编译就报错，而不是等到运行时才崩；同时也没有运行时反射的性能开销。代价是会增加一点编译时间。
      </Callout>

      <h2>四、Hilt 的核心注解</h2>
      <p>用好 Hilt，主要就是认识下面这几个注解，以及它们各自贴在哪里：</p>
      <table>
        <thead>
          <tr><th>注解</th><th>贴在哪</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>@HiltAndroidApp</code></td><td>Application 类</td><td>开启 Hilt，生成应用级依赖容器</td></tr>
          <tr><td><code>@AndroidEntryPoint</code></td><td>Activity / Fragment / Service</td><td>让该组件成为可被注入的「注入点」</td></tr>
          <tr><td><code>@Inject constructor</code></td><td>类的构造函数</td><td>告诉 Hilt「这个类能这样造」</td></tr>
          <tr><td><code>@Module</code> + <code>@Provides</code></td><td>提供者对象</td><td>手写「怎么造」无法构造注入的依赖</td></tr>
          <tr><td><code>@Binds</code></td><td>抽象 Module 方法</td><td>把接口绑定到实现（比 @Provides 省样板）</td></tr>
          <tr><td><code>@HiltViewModel</code></td><td>ViewModel 类</td><td>让 ViewModel 支持构造注入</td></tr>
        </tbody>
      </table>

      <h3>第一步：@HiltAndroidApp</h3>
      <CodeBlock lang="kotlin" title="在 Application 上开启 Hilt" code={appSnippet} />

      <h3>第二步：@AndroidEntryPoint</h3>
      <p>
        Android 的入口组件（Activity、Fragment 等）是由系统实例化的，我们没法给它们写
        <code>@Inject</code> 构造函数。于是 Hilt 用 <code>@AndroidEntryPoint</code> 标记它们，
        在背后接管注入，让这些组件能从 Hilt 容器里取到依赖。
      </p>
      <CodeBlock lang="kotlin" title="把 Activity 标为注入点" code={entryPointSnippet} />

      <h3>第三步：@Inject 构造注入</h3>
      <p>
        对于<strong>我们自己写的、能直接 new 的类</strong>（比如 Repository），只要在它的构造函数上加
        <code>@Inject</code>，Hilt 就知道该怎么创建它，并会自动把构造函数里需要的其它依赖也准备好。
      </p>
      <CodeBlock lang="kotlin" title="构造注入：最省心的方式" code={constructorInjectSnippet} />

      <h3>第四步：@Module 提供「造不出来」的依赖</h3>
      <p>
        有些依赖没法用构造注入：要么是<strong>第三方类</strong>（如 <code>Retrofit</code>、Room 的数据库，
        它们的构造函数不归我们管，没法贴 <code>@Inject</code>），要么是<strong>接口</strong>
        （接口无法被实例化，Hilt 不知道该用哪个实现）。这时就用 <code>@Module</code> 告诉 Hilt
        「这类依赖该怎么造」。
      </p>
      <CodeBlock lang="kotlin" title="@Provides 与 @Binds" code={moduleSnippet} />
      <Example title="@Provides 与 @Binds 怎么选">
        <p>
          <strong>@Provides</strong>：方法体里手写创建逻辑，返回一个实例。适合第三方类、
          需要 builder 拼装的对象，比如造一个 <code>Retrofit</code>。
        </p>
        <p>
          <strong>@Binds</strong>：只是声明「接口 <code>UserRepository</code> 用
          <code>UserRepositoryImpl</code> 这个实现」，没有方法体，由 Hilt 生成绑定代码，更省样板。
          前提是那个实现类自己已经能被构造注入。
        </p>
      </Example>

      <h2>五、作用域：一个依赖该活多久</h2>
      <p>
        默认情况下，每次注入 Hilt 都会<strong>新建</strong>一个实例。但有些依赖（数据库、Retrofit、
        全局的 Repository）我们希望全应用<strong>共享同一个</strong>。这由<strong>作用域注解</strong>控制，
        它们与 <code>@InstallIn</code> 指定的容器一一对应：
      </p>
      <table>
        <thead>
          <tr><th>作用域</th><th>容器</th><th>实例存活范围</th></tr>
        </thead>
        <tbody>
          <tr><td><code>@Singleton</code></td><td>SingletonComponent</td><td>整个应用，全局唯一</td></tr>
          <tr><td><code>@ActivityRetainedScoped</code></td><td>ActivityRetainedComponent</td><td>跨配置变更存活（ViewModel 用的就是它）</td></tr>
          <tr><td><code>@ActivityScoped</code></td><td>ActivityComponent</td><td>单个 Activity 生命周期内</td></tr>
          <tr><td>（无注解）</td><td>—</td><td>每次注入都新建</td></tr>
        </tbody>
      </table>
      <p>
        上一节代码里 <code>provideRetrofit</code> 加了 <code>@Singleton</code>，意味着整个应用只会有
        一个 Retrofit 实例被反复复用，而不是每次注入都重新搭建一遍——这正是手动 DI
        最难管好的部分，Hilt 用一个注解就解决了。
      </p>

      <h2>六、把 Repository 注入 ViewModel</h2>
      <p>
        现在收束到本卷的主线：让 Hilt 把 <code>UserRepository</code> 自动注入 <code>UserViewModel</code>。
        做法是给 ViewModel 加 <code>@HiltViewModel</code>，并在构造函数上加 <code>@Inject</code>；
        在 Composable 里用 <code>hiltViewModel()</code> 取实例即可。
      </p>
      <CodeBlock lang="kotlin" title="@HiltViewModel：把 Repository 注入 ViewModel" code={hiltViewModelSnippet} />
      <p>
        对比上一章手动写 ViewModelFactory、自己 new Repository 的繁琐，这里我们一行拼装代码都没写：
        声明「我需要一个 <code>UserRepository</code>」，剩下的整条依赖图都由 Hilt 在编译期生成的代码自动拼好。
      </p>
      <Callout variant="warn" title="@HiltViewModel 的实例由 Hilt 管，别自己 new 去用">
        在<strong>正式代码</strong>里要通过 <code>hiltViewModel()</code> / <code>viewModels()</code> 获取 ViewModel，
        这样它才会与正确的作用域（跨配置变更）绑定。直接 <code>new</code> 出来的实例不受框架管理、
        不会跨配置变更存活。不过在<strong>单元测试</strong>里，直接 new 并传入假依赖反而是最方便的做法——见下一节。
      </Callout>

      <h2>七、测试时替换依赖</h2>
      <p>
        依赖注入最大的回报体现在测试上。因为 <code>UserViewModel</code> 的依赖是<strong>构造注入</strong>的，
        测试时我们完全不需要启动 Hilt，直接 <code>new</code> 一个 ViewModel、把真实 Repository 换成
        一个<strong>假实现（fake）或 mock</strong> 传进去就行——既不碰真实网络，又能精确制造各种场景。
      </p>
      <CodeBlock lang="kotlin" title="用假 Repository 测试 ViewModel" code={testSnippet} />
      <p>
        想测「成功」就传返回数据的 fake，想测「失败显示错误」就传抛异常的 fake。
        这种可替换性，正是当初把依赖从「自己造」改成「别人给」换来的。
        对需要走 Hilt 容器的<strong>插桩测试（instrumented test）</strong>，Hilt 还提供
        <code>@HiltAndroidTest</code> 与 <code>@TestInstallIn</code> 在测试中整模块替换依赖，这里不展开。
      </p>
      <Callout variant="tip">
        到这里，MVVM（UI ↔ ViewModel ↔ Repository）+ Hilt 依赖注入这套现代 Android 架构的骨架就齐了：
        界面只管显示、ViewModel 管状态与逻辑、Repository 管数据、Hilt 把它们自动拼装起来，且全程可测试。
      </Callout>

      <Summary
        points={[
          '依赖注入把「创建依赖」与「使用依赖」分开：类只声明需要什么，由外部送进来，换来解耦、可替换、可测试。',
          '手动 DI 在依赖链变深时会爆炸：拼装样板到处复制、作用域难管理、加一层依赖要改所有调用处，因此需要自动拼装的框架。',
          'Hilt 是 Android 官方基于 Dagger 的 DI 框架，在编译期生成依赖拼装代码（配错即编译报错、无运行时反射开销）。',
          '核心注解：@HiltAndroidApp（Application）、@AndroidEntryPoint（Activity）、@Inject 构造注入、@Module+@Provides/@Binds（提供造不出的依赖）、@HiltViewModel。',
          '作用域控制依赖存活范围：@Singleton 全局唯一、不加注解则每次新建；用 @InstallIn 指定安装到哪个容器。',
          '给 ViewModel 加 @HiltViewModel + @Inject 即可自动注入 Repository；构造注入让测试能直接 new 并传入 fake/mock 替换真实依赖。',
        ]}
      />
    </article>
  )
}
