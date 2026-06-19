import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const manifestPermSnippet = `<!-- AndroidManifest.xml：所有要用的权限都得先在这里声明 -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 普通权限：安装时自动授予，无需运行时请求 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- 危险权限：声明之外，运行时还要逐个向用户请求 -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <!-- Android 13（API 33）起，通知也变成需运行时请求的权限 -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application ... >
        ...
    </application>
</manifest>`

const requestPermSnippet = `import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.material3.Button
import androidx.compose.material3.Text

@Composable
fun CameraScreen() {
    var granted by remember { mutableStateOf(false) }
    var deniedForever by remember { mutableStateOf(false) }

    // 用 Activity Result API 请求单个权限；回调拿到布尔结果
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        granted = isGranted
        // 注意：这个回调本身无法区分「这次拒绝」和「不再询问」，
        // 需要结合 shouldShowRequestPermissionRationale 判断（见下文）
    }

    Button(onClick = { launcher.launch(android.Manifest.permission.CAMERA) }) {
        Text(if (granted) "相机已授权" else "请求相机权限")
    }
}`

const rationaleSnippet = `// 判断「是否该向用户解释为什么要这个权限」
// 三种状态可以这样区分：
//   1. 已授权                          -> checkSelfPermission == GRANTED
//   2. 被拒过、但还能再问（应先解释）  -> shouldShowRationale == true
//   3. 勾了「不再询问」或从未问且系统不再弹 -> 请求后仍未授予且 rationale == false
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.core.app.ActivityCompat

fun checkState(activity: android.app.Activity, perm: String): String {
    val granted = ContextCompat.checkSelfPermission(activity, perm) ==
        PackageManager.PERMISSION_GRANTED
    if (granted) return "GRANTED"

    val showRationale = ActivityCompat
        .shouldShowRequestPermissionRationale(activity, perm)
    return if (showRationale) "DENIED_CAN_ASK" else "DENIED_MAYBE_FOREVER"
}

// 对「不再询问」的用户，应引导他去系统设置页手动开：
// Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", pkg, null))`

const darkThemeSnippet = `import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(/* ... */)
private val DarkColors = darkColorScheme(/* ... */)

@Composable
fun AppTheme(
    // 默认跟随系统：用户在系统里开深色模式，App 自动切
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}`

const sdkConfigSnippet = `// app/build.gradle.kts
android {
    compileSdk = 35          // 用 API 35 的 SDK 编译（应尽量用最新）

    defaultConfig {
        minSdk = 24          // 最低支持 Android 7.0；低于此版本装不上
        targetSdk = 35       // 「我已针对 API 35 的行为变更做过适配」的承诺
    }
}
// 经验法则：targetSdk 决定系统对你启用哪些新行为/限制；
// 升 targetSdk 前必须读对应版本的「行为变更」文档，否则可能崩或被限权。`

const derivedStateSnippet = `import androidx.compose.runtime.*

@Composable
fun NameList(names: List<String>, query: String) {
    // 反例：每次重组都重新过滤；只要本 Composable 因任何原因重组就白算一遍
    // val filtered = names.filter { it.contains(query) }

    // 正例：用 derivedStateOf 把「派生值」缓存起来，
    // 只有当 names 或 query 真正变化时才重新计算
    val filtered by remember(names) {
        derivedStateOf { names.filter { it.contains(query) } }
    }

    LazyColumn {
        // 给每项一个稳定 key，列表增删时复用而非整体重建
        items(filtered, key = { it }) { name ->
            Text(name)
        }
    }
}`

const stableSnippet = `// 不稳定参数会让 Compose 无法跳过重组（保守地认为「可能变了」）。
// 反例：List<T> 是接口，编译器无法确定其实现是否可变 -> 视为不稳定
@Composable
fun BadList(items: List<Item>) { /* 父级重组就跟着重组 */ }

// 正例一：用不可变集合（kotlinx.collections.immutable）
import kotlinx.collections.immutable.ImmutableList
@Composable
fun GoodList(items: ImmutableList<Item>) { /* 编译器认定稳定，可跳过 */ }

// 正例二：给数据类标注 @Immutable / @Stable，向编译器作出「不会变」的保证
@Immutable
data class Item(val id: Long, val title: String)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        功能写完只是一半，真正能交付到用户手机上的 App 还要跨过三道坎：要拿到该有的
        <strong>权限</strong>、要在五花八门的设备与系统版本上都<strong>能用且好看</strong>、
        还要在重组、启动、内存这些维度上<strong>跑得顺</strong>。这一章我们把发布前最常踩的三类工程化
        问题讲透——运行时权限模型、多设备与多版本适配、以及 Compose 的性能优化。
      </Lead>

      <h2>一、权限模型：声明、普通权限与危险权限</h2>
      <p>
        Android 的权限分两层。第一层是<strong>静态声明</strong>：无论什么权限，都必须先在
        <code>AndroidManifest.xml</code> 里用 <code>{'<uses-permission>'}</code> 列出来，没声明的权限
        运行时根本请求不了。第二层才是<strong>授予</strong>，而授予方式按权限的危险程度分成两类。
      </p>
      <CodeBlock lang="kotlin" title="AndroidManifest.xml：先声明权限" code={manifestPermSnippet} />

      <h3>普通权限 vs 危险权限</h3>
      <p>
        <strong>普通权限</strong>（normal）影响很小，比如访问网络、查网络状态。它们在
        <strong>安装时由系统自动授予</strong>，你不需要写任何运行时请求代码，声明即生效。
      </p>
      <p>
        <strong>危险权限</strong>（dangerous）触及用户隐私或设备敏感能力——相机、定位、通讯录、麦克风等。
        从 Android 6.0（API 23）起，这类权限必须在<strong>运行时</strong>由用户在弹窗里逐个确认，
        而且用户随时可以在设置里收回。所以你的代码必须假设「权限可能没有」，并优雅地处理这种情况。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>普通权限</th><th>危险权限</th></tr>
        </thead>
        <tbody>
          <tr><td>例子</td><td>INTERNET、ACCESS_NETWORK_STATE</td><td>CAMERA、ACCESS_FINE_LOCATION</td></tr>
          <tr><td>授予时机</td><td>安装时自动</td><td>运行时由用户确认</td></tr>
          <tr><td>需要请求代码</td><td>不需要</td><td>需要</td></tr>
          <tr><td>可被用户收回</td><td>否</td><td>是（设置里随时关）</td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="新版本把更多东西变成了运行时权限">
        随版本演进，越来越多能力被纳入运行时请求。典型如 Android 13（API 33）起，发通知需要
        <code>POST_NOTIFICATIONS</code> 运行时权限；读媒体文件也被拆成了图片 / 视频 / 音频的细分权限。
        升 <code>targetSdk</code> 前务必查清这些变化。
      </Callout>

      <h2>二、用 Activity Result API 请求运行时权限</h2>
      <KeyIdea>
        请求危险权限的现代做法是 <strong>Activity Result API</strong>。在 Compose 里用
        <code>rememberLauncherForActivityResult</code> 配合
        <code>ActivityResultContracts.RequestPermission()</code> 拿到一个 launcher，
        调 <code>launcher.launch(权限名)</code> 弹窗，结果通过回调返回。它取代了已废弃的
        <code>onRequestPermissionsResult</code> 老回调。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="Compose 里请求单个危险权限" code={requestPermSnippet} />
      <p>
        请求多个用 <code>RequestMultiplePermissions()</code>，回调会拿到一个
        <code>{'Map<String, Boolean>'}</code>。无论单个还是多个，核心都是：<strong>请求 → 拿结果 →
        按结果走不同分支</strong>。

      </p>

      <h3>处理「拒绝」与「不再询问」</h3>
      <p>
        用户面对权限弹窗有三种走向：同意、这次拒绝、勾选「不再询问」后拒绝。最后一种之后系统
        <strong>不再弹窗</strong>，你再怎么 <code>launch</code> 都直接回拒绝。要区分这些状态，关键工具是
        <code>shouldShowRequestPermissionRationale</code>：
      </p>
      <ul>
        <li>它返回 <code>true</code>：用户拒过但还能再问，此时应先弹一段<strong>解释</strong>告诉他为什么要这个权限，再重新请求。</li>
        <li>它返回 <code>false</code> 且未授权：要么从没问过（首次直接请求即可），要么已被「不再询问」永久拒绝（这时只能引导用户去<strong>系统设置页</strong>手动开）。</li>
      </ul>
      <CodeBlock lang="kotlin" title="区分三种权限状态" code={rationaleSnippet} />
      <Callout variant="warn" title="永远要给「没权限」留后路">
        不要假设权限一定拿得到。被拒后 App 不能崩、不能卡死，应降级到「不需要该权限的功能子集」，
        并在合适时机用清晰的文案解释价值、引导授权。强行反复弹窗只会让用户更快卸载。
      </Callout>

      <h2>三、多设备与多版本适配</h2>
      <p>
        Android 设备的碎片化是出了名的：屏幕尺寸从小手机到平板到折叠屏，像素密度从 ldpi 到 xxxhdpi，
        还有横竖屏切换、深色模式、以及十多个仍在使用的系统版本。适配的目标不是「每台都像素级一致」，
        而是「每台都<strong>可用且不难看</strong>」。
      </p>

      <h3>屏幕尺寸与密度</h3>
      <p>
        Compose 里布局应基于 <code>dp</code>（密度无关像素）而非物理像素，系统会按设备密度自动换算，
        这天然解决了「同样 48dp 的按钮在不同密度屏上手感一致」。对尺寸差异，则用
        <strong>WindowSizeClass</strong>（Compact / Medium / Expanded）做分档：手机用单列，
        平板 / 折叠屏展开时切换成双栏布局。图片资源放进 <code>drawable-xxhdpi</code> 等密度目录，
        让系统挑最合适的。
      </p>

      <h3>深色模式与横竖屏</h3>
      <p>
        深色模式靠把颜色集中到主题里：用 <code>isSystemInDarkTheme()</code> 决定走亮色还是暗色
        <code>ColorScheme</code>，全局一处切换。横竖屏旋转默认会重建 Activity，Compose 的
        <code>rememberSaveable</code> 能在重建后恢复关键状态，避免用户旋转一下输入框就清空。
      </p>
      <CodeBlock lang="kotlin" title="跟随系统深色模式的主题" code={darkThemeSnippet} />

      <h3>系统版本：minSdk、targetSdk 与行为变更</h3>
      <p>
        三个 SDK 配置要分清：
      </p>
      <ul>
        <li><strong>compileSdk</strong>：用哪个版本的 SDK 编译，建议用最新，这样才能调用新 API。</li>
        <li><strong>minSdk</strong>：最低支持的系统版本，低于它的设备装不上。定得越低覆盖用户越多，但维护负担越重。</li>
        <li><strong>targetSdk</strong>：你<strong>承诺已针对该版本的行为变更做过适配</strong>。系统据此决定对你的 App 启用哪些新行为与限制。</li>
      </ul>
      <CodeBlock lang="kotlin" title="build.gradle.kts 里的 SDK 配置" code={sdkConfigSnippet} />
      <p>
        Google Play 会强制要求新上架 / 更新的 App 的 <code>targetSdk</code> 不低于某个近一两年的版本。
        每次升 <code>targetSdk</code>，都必须逐条读官方的「行为变更」文档——后台限制、权限收紧、
        存储模型变化等都可能让原本好用的代码在新系统上崩溃或失效。对于只在高版本才有的 API，
        用 <code>{'if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.X)'}</code> 做版本守卫。
      </p>

      <h2>四、Compose 性能：减少不必要的重组</h2>
      <KeyIdea>
        Compose 性能优化的核心，是<strong>减少不必要的重组</strong>（recomposition），并保证重组发生时
        尽量便宜。三把利器：让参数<strong>稳定 / 不可变</strong>从而能跳过重组、用
        <code>derivedStateOf</code> 缓存派生计算、给列表项加 <code>key</code> 复用节点。
      </KeyIdea>
      <p>
        重组是 Compose 的更新机制：当某个被读取的 <code>State</code> 变化，依赖它的 Composable 会重新执行
        以刷新 UI。问题在于重组可能被频繁、甚至意外触发；如果每次重组都做重活（过滤大列表、分配新对象），
        界面就会卡顿掉帧。
      </p>

      <h3>稳定类型与不可变参数</h3>
      <p>
        Compose 编译器会判断一个 Composable 的参数是否<strong>稳定</strong>：若全部稳定且值没变，本次重组
        就能<strong>整段跳过</strong>。但像 <code>{'List<T>'}</code> 这样的接口类型，编译器无法确定其实现可不可变，
        于是保守地视为不稳定，导致父级一重组它就跟着重组。解决办法：用
        <code>ImmutableList</code> 等不可变集合，或给数据类标注 <code>@Immutable</code> / <code>@Stable</code>
        向编译器作出保证。
      </p>
      <CodeBlock lang="kotlin" title="让参数稳定，换取跳过重组" code={stableSnippet} />

      <h3>derivedStateOf 与列表 key</h3>
      <p>
        当一个值是从其他 state「算」出来的（比如「列表按关键词过滤后的结果」），直接在重组里现算会反复浪费 CPU。
        <code>derivedStateOf</code> 把这个派生值缓存起来，只有当它真正依赖的输入变化时才重算。再配合
        <code>LazyColumn</code> 的 <code>key</code> 参数，列表增删时能精准复用未变的项，而不是整体重建。
      </p>
      <CodeBlock lang="kotlin" title="derivedStateOf 缓存派生值 + 列表 key" code={derivedStateSnippet} />
      <Example title="一个常见的重组陷阱">
        <p>
          在 Composable 函数体里写 <code>{'val formatter = SimpleDateFormat(...)'}</code>——
          这会<strong>每次重组都新建一个对象</strong>，既浪费分配又可能引入抖动。正确做法是用
          <code>remember</code> 把它记住：<code>{'val formatter = remember { SimpleDateFormat(...) }'}</code>，
          只在首次组合时创建一次。原则是：<strong>不要在重组路径上做分配或重计算</strong>。
        </p>
      </Example>

      <h3>怎么排查</h3>
      <p>
        别凭感觉优化，要用工具定位。Android Studio 的 <strong>Layout Inspector</strong> 能看
        <strong>Composition 计数 / 重组次数</strong>——某个组件重组次数异常高，就是优化目标。
        还可以加 Compose 编译器的指标报告，看哪些 Composable 被判为「不可跳过 / 不稳定」，按图索骥。
      </p>

      <Callout variant="tip" title="启动速度与内存一句话">
        启动速度：用 <strong>Baseline Profiles</strong> 预编译关键路径、精简 Application 启动里的初始化，
        能显著缩短冷启动；内存：及时释放大图与监听器、用 LeakCanary 抓泄漏，避免长生命周期对象持有 Activity。
      </Callout>

      <h2>五、小结</h2>
      <p>
        权限、适配、性能这三件事贯穿发布前的最后一公里。它们的共性是：都要求你<strong>不假设理想环境</strong>——
        权限可能没有、设备可能千奇百怪、重组可能频繁发生。把这些「不理想」当成默认前提去设计，App 才稳。
      </p>

      <Summary
        points={[
          '权限分两层：先在 AndroidManifest 静态声明；普通权限安装时自动授予，危险权限需运行时由用户逐个确认且可被收回。',
          '用 Activity Result API（rememberLauncherForActivityResult + RequestPermission）请求危险权限，取代已废弃的旧回调。',
          '靠 shouldShowRequestPermissionRationale 区分「可再问」与「不再询问」；被永久拒绝只能引导去系统设置页，App 要为无权限留降级后路。',
          '适配多设备：dp + WindowSizeClass 应对尺寸密度，isSystemInDarkTheme 统一深色模式，rememberSaveable 扛横竖屏重建。',
          'SDK 三件套：compileSdk 用最新、minSdk 决定覆盖面、targetSdk 是对行为变更的适配承诺；升 targetSdk 必读行为变更文档并做版本守卫。',
          'Compose 性能核心是减少重组：用稳定/不可变参数换取跳过重组，用 derivedStateOf 缓存派生值，给列表加 key；不在重组路径分配对象，用 Layout Inspector 看重组次数排查。',
        ]}
      />
    </article>
  )
}
