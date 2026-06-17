import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const explicitSnippet = `// 显式 Intent：直接点名要启动的目标类
val intent = Intent(this, DetailActivity::class.java)
intent.putExtra("noteId", 42)          // 用 extras 携带参数
intent.putExtra("title", "购物清单")
startActivity(intent)

// 在 DetailActivity 里取出参数
class DetailActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getIntExtra("noteId", -1)
        val title = intent.getStringExtra("title")
    }
}`

const implicitSnippet = `// 隐式 Intent：不点名目标，只声明「我想干什么」(action) + 数据，
// 由系统在所有应用里匹配出能处理它的组件。

// 1) 打开一个网页 —— 谁能处理 ACTION_VIEW + http 就由谁来
val web = Intent(Intent.ACTION_VIEW, Uri.parse("https://developer.android.com"))
startActivity(web)

// 2) 拨号 —— 跳到拨号盘并填好号码
val dial = Intent(Intent.ACTION_DIAL, Uri.parse("tel:10086"))
startActivity(dial)

// 3) 分享一段文本 —— 系统弹出「分享到哪个应用」的选择器
val share = Intent(Intent.ACTION_SEND).apply {
    type = "text/plain"
    putExtra(Intent.EXTRA_TEXT, "来看看这个 Android 教程")
}
startActivity(Intent.createChooser(share, "分享到"))

// 稳妥起见，先判断有没有应用能处理，避免崩溃
if (web.resolveActivity(packageManager) != null) {
    startActivity(web)
}`

const resultApiSnippet = `class MainActivity : ComponentActivity() {

    // 在 Activity 创建期就注册好「启动另一个 Activity 并接收返回结果」的契约。
    // 取代已废弃的 startActivityForResult + onActivityResult。
    private val pickNote = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val picked = result.data?.getStringExtra("picked")
            // 用返回结果更新界面 ...
        }
    }

    fun openPicker() {
        pickNote.launch(Intent(this, PickerActivity::class.java))
    }
}

// PickerActivity 通过 setResult 把结果回传，然后 finish()
class PickerActivity : ComponentActivity() {
    fun confirm(value: String) {
        setResult(Activity.RESULT_OK, Intent().putExtra("picked", value))
        finish()
    }
}`

const permissionSnippet = `class MainActivity : ComponentActivity() {

    // 运行时权限请求也走 Result API：注册一个权限契约
    private val askCamera = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted: Boolean ->
        if (granted) startCamera() else showRationale()
    }

    fun onTakePhotoClick() {
        askCamera.launch(Manifest.permission.CAMERA)
    }
}`

const navSetupSnippet = `// build.gradle(.kts) 依赖
// implementation("androidx.navigation:navigation-compose:<version>")

@Composable
fun AppNav() {
    val navController = rememberNavController()      // 持有回退栈

    NavHost(
        navController = navController,
        startDestination = "home"                    // 起始路由
    ) {
        // 每个 composable(route) 注册一个「目的地」
        composable("home") {
            HomeScreen(
                onOpenDetail = { id -> navController.navigate("detail/\$id") }
            )
        }
        // 带路径参数的路由：detail/{id}
        composable(
            route = "detail/{id}",
            arguments = listOf(navArgument("id") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("id") ?: -1
            DetailScreen(
                id = id,
                onBack = { navController.popBackStack() }   // 出栈 = 返回
            )
        }
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们认识了 Activity 和它的生命周期。但一个真实应用有很多屏，关键问题随之而来：
        界面之间<strong>怎么跳过去、怎么把数据带过去、又怎么把结果带回来</strong>？这一章从 Android 的通信基石
        <strong>Intent</strong> 讲起，区分显式与隐式两种用法；再讲传参 extras 与接收返回结果的现代写法
        <strong>Activity Result API</strong>（它取代了废弃的 <code>onActivityResult</code>，连权限请求也走它）；
        最后进入 Compose 时代，用 <strong>Navigation-Compose</strong> 做应用内的页面路由与回退栈管理。
      </Lead>

      <h2>一、Intent 是什么：组件间通信的「意图」</h2>
      <KeyIdea>
        <strong>Intent（意图）</strong>是 Android 里组件之间通信的消息对象。它描述「我想做一件什么事」，
        系统据此找到合适的组件并把它启动起来。启动 Activity、启动 Service、发广播，背后都是 Intent。
      </KeyIdea>
      <p>
        Intent 之所以叫「意图」，是因为它表达的是一个<strong>请求</strong>，而不是一次直接的方法调用。
        你不直接 new 出目标 Activity，而是构造一个 Intent 交给系统，由系统去创建、调度。
        按「目标是否点名」可分成两类：
      </p>

      <h2>二、显式 Intent vs 隐式 Intent</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>显式 Intent</th><th>隐式 Intent</th></tr>
        </thead>
        <tbody>
          <tr><td>目标</td><td>直接指定目标类（点名）</td><td>不点名，声明 action / category / data 由系统匹配</td></tr>
          <tr><td>典型场景</td><td>应用内部跳转到自己的 Activity</td><td>调用「能处理某类事」的应用：打开网页、拨号、分享</td></tr>
          <tr><td>谁来响应</td><td>就是你指定的那个类</td><td>系统在所有声明了对应 intent-filter 的组件里挑</td></tr>
          <tr><td>风险</td><td>编译期就知道目标，稳</td><td>可能没有应用能处理，需先 <code>resolveActivity</code> 判断</td></tr>
        </tbody>
      </table>

      <h3>显式 Intent：点名目标类</h3>
      <p>
        应用内部从一屏跳到另一屏，几乎都用显式 Intent：构造时直接把目标 <code>Activity</code> 的类传进去。
        要带参数，就往 Intent 里 <code>putExtra</code>（这叫 <strong>extras</strong>，本质是一组键值对），目标端再用对应的
        <code>getXxxExtra</code> 取出。
      </p>
      <CodeBlock lang="kotlin" title="显式 Intent 跳转并传参" code={explicitSnippet} />

      <h3>隐式 Intent：声明意图，系统匹配</h3>
      <p>
        当你想「打开一个网页」「拨个号」「分享一段文本」时，你并不关心由<strong>哪个</strong>应用来做。
        这时用隐式 Intent：只声明 <code>action</code>（动作，如 <code>ACTION_VIEW</code>、<code>ACTION_DIAL</code>）
        和数据（一个 <code>Uri</code>），系统会在所有声明了匹配 <code>intent-filter</code> 的组件里找出能处理它的，
        必要时弹出选择器让用户挑。
      </p>
      <CodeBlock lang="kotlin" title="隐式 Intent：打开网页 / 拨号 / 分享" code={implicitSnippet} />
      <Callout variant="warn" title="隐式 Intent 先确认有人接">
        隐式 Intent 不保证一定有应用能处理。若设备上没有任何匹配组件，直接 <code>startActivity</code> 会抛
        <code>ActivityNotFoundException</code>。稳妥做法是先用 <code>resolveActivity(packageManager)</code> 判空，
        或对分享类用 <code>Intent.createChooser</code>。
      </Callout>

      <h2>三、拿到返回结果：Activity Result API</h2>
      <p>
        很多跳转需要<strong>拿回结果</strong>：去一个选择页挑张图、选个联系人，挑完要把结果带回原界面。
        早年的写法是 <code>startActivityForResult</code> 加重写 <code>onActivityResult</code>——它现在已经
        <strong>废弃</strong>了，原因是回调和发起点分离、容易出错、且在进程被杀重建时不可靠。
      </p>
      <KeyIdea>
        现代写法是 <strong>Activity Result API</strong>：在 Activity 创建期就用
        <code>registerForActivityResult</code> 注册一个「契约 + 回调」，之后用返回的 launcher 的
        <code>launch(...)</code> 发起，结果回到你注册时给的回调里。它取代了废弃的 <code>onActivityResult</code>，
        且能正确扛过进程重建。
      </KeyIdea>
      <p>
        这里的「契约（Contract）」描述了「输入什么、产出什么」。最通用的是
        <code>StartActivityForResult</code>（输入一个 Intent，产出一个结果），另外还有挑图片、拍照、选文件、
        请求权限等一系列<strong>预置契约</strong>，省去自己拼 Intent 和解析结果。
      </p>
      <CodeBlock lang="kotlin" title="Activity Result API：发起并接收结果" code={resultApiSnippet} />

      <h3>权限请求也走 Result API</h3>
      <p>
        运行时权限（相机、定位、麦克风等）的请求统一走同一套 API：用
        <code>RequestPermission</code>（单个）或 <code>RequestMultiplePermissions</code>（多个）契约注册，
        <code>launch</code> 时传权限名，用户的允许 / 拒绝结果回到回调里。和取返回结果是同一个心智模型。
      </p>
      <CodeBlock lang="kotlin" title="用 Result API 请求运行时权限" code={permissionSnippet} />
      <Example title="为什么必须在创建期注册">
        <p>
          <code>registerForActivityResult</code> 必须在 Activity / Fragment <strong>创建时无条件调用</strong>
          （通常作为字段初始化），不能写在按钮点击里。因为进程被杀后界面重建时，系统要靠这次注册重新
          挂上回调，才能把恢复回来的结果交还给你。<code>launch</code> 才是放在点击事件里的那一步。
        </p>
      </Example>

      <h2>四、Compose 时代：Navigation-Compose 做应用内路由</h2>
      <p>
        现代 Compose 应用流行<strong>单 Activity + 多 Composable 页面</strong>的结构。页面之间的跳转不再靠
        启动新 Activity，而是用 <strong>Navigation-Compose</strong> 在同一个 Activity 内切换可组合的「目的地」，
        并自动管理回退栈。它有三个核心角色：
      </p>
      <ul>
        <li><strong>NavController</strong>：导航的「遥控器」，持有回退栈。调它的 <code>navigate(route)</code> 前进、<code>popBackStack()</code> 后退。</li>
        <li><strong>NavHost</strong>：一块「当前目的地显示在这里」的容器，绑定一个 NavController 和起始路由 <code>startDestination</code>。</li>
        <li><strong>composable(route)</strong>：在 NavHost 里登记一个目的地，把字符串<strong>路由</strong>映射到一个可组合页面。</li>
      </ul>
      <CodeBlock lang="kotlin" title="Navigation-Compose：NavHost / composable / 传参 / 回退" code={navSetupSnippet} />
      <p>
        <strong>传参</strong>：把参数编进路由路径（如 <code>detail/{'{id}'}</code>），跳转时拼成
        <code>navigate("detail/42")</code>，目的地端从 <code>backStackEntry.arguments</code> 取出，并用
        <code>navArgument</code> 声明类型。<strong>回退栈</strong>：每次 <code>navigate</code> 把新目的地压栈，
        系统返回手势或 <code>popBackStack()</code> 出栈——这与上一章讲的任务栈是一致的「栈」心智，只是粒度从 Activity 变成了页面。
      </p>
      <table>
        <thead>
          <tr><th>对照</th><th>Intent（Activity 间）</th><th>Navigation-Compose（页面间）</th></tr>
        </thead>
        <tbody>
          <tr><td>跳转</td><td><code>startActivity(intent)</code></td><td><code>navController.navigate(route)</code></td></tr>
          <tr><td>传参</td><td>Intent extras（<code>putExtra</code>）</td><td>路由路径参数 <code>route/{'{arg}'}</code></td></tr>
          <tr><td>返回</td><td>系统返回 / <code>finish()</code></td><td><code>popBackStack()</code></td></tr>
          <tr><td>栈</td><td>任务栈（Task Back Stack）</td><td>NavController 的回退栈</td></tr>
        </tbody>
      </table>
      <Callout variant="tip">
        实战里两者并存：应用<strong>内部</strong>的页面跳转用 Navigation-Compose；调用<strong>系统能力</strong>
        （打开网页、拨号、分享、选图、请权限）仍用 Intent + Activity Result API。选对工具，别拿一套硬套另一边。
      </Callout>

      <Summary
        points={[
          'Intent 是 Android 组件间通信的「意图」对象：描述想做什么，由系统找到合适组件并启动。',
          '显式 Intent 点名目标类，用于应用内跳转；隐式 Intent 只声明 action/数据，由系统匹配能处理的应用（打开网页、拨号、分享），调用前最好先 resolveActivity 判断。',
          'extras（putExtra/getXxxExtra）用来在 Intent 间携带参数。',
          '取返回结果用现代的 Activity Result API：在创建期 registerForActivityResult 注册契约+回调，再用 launcher.launch 发起；它取代了废弃的 onActivityResult，且能扛过进程重建。',
          '运行时权限请求也走 Result API（RequestPermission / RequestMultiplePermissions 契约），与取结果同一套心智模型。',
          'Compose 时代用 Navigation-Compose 做应用内路由：NavController 持回退栈、NavHost 显示当前目的地、composable(route) 登记页面；用路由路径传参、popBackStack 回退。内部跳转用导航，系统能力仍用 Intent。',
        ]}
      />
    </article>
  )
}
