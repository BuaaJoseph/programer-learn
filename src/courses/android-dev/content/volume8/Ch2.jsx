import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const unitTestSnippet = `import org.junit.Assert.assertEquals
import org.junit.Test

// 被测的纯逻辑：不依赖 Android 框架，跑在本机 JVM 上，飞快
class PriceCalculator {
    fun withTax(price: Double, rate: Double) = price * (1 + rate)
}

class PriceCalculatorTest {
    private val calc = PriceCalculator()

    @Test
    fun withTax_appliesRate() {
        assertEquals(110.0, calc.withTax(100.0, 0.10), 0.001)
    }
}`

const coroutineTestSnippet = `import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.StandardTestDispatcher
import org.junit.Assert.assertEquals
import org.junit.Test

class UserRepository(private val api: Api) {
    suspend fun loadName(id: Int): String = api.fetchUser(id).name
}

class UserRepositoryTest {
    @Test
    fun loadName_returnsName() = runTest {   // runTest：在测试里驱动协程，跳过真实延时
        val fakeApi = FakeApi(User(name = "Ada"))   // 注入假实现，隔离网络
        val repo = UserRepository(fakeApi)

        val name = repo.loadName(1)

        assertEquals("Ada", name)
    }
}`

const composeTestSnippet = `import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertIsDisplayed
import org.junit.Rule
import org.junit.Test

class CounterScreenTest {
    @get:Rule
    val composeRule = createComposeRule()   // 提供一个隔离的 Compose 测试环境

    @Test
    fun clickingButton_incrementsCounter() {
        // 1. 把要测的 Composable 放进测试环境
        composeRule.setContent { CounterScreen() }

        // 2. 断言初始状态
        composeRule.onNodeWithText("Count: 0").assertIsDisplayed()

        // 3. 找到按钮并点击
        composeRule.onNodeWithText("加一").performClick()

        // 4. 断言点击后 UI 更新
        composeRule.onNodeWithText("Count: 1").assertIsDisplayed()
    }
}`

const buildTypesSnippet = `// app/build.gradle.kts
android {
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"   // 包名加后缀，可与正式版同机共存
            isDebuggable = true
        }
        release {
            isMinifyEnabled = true            // 开启 R8 代码压缩 + 混淆
            isShrinkResources = true          // 同时压缩无用资源
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    // 产品风味：例如免费版 / 付费版，各自可有不同包名、资源、配置
    flavorDimensions += "tier"
    productFlavors {
        create("free")  { dimension = "tier"; applicationIdSuffix = ".free" }
        create("paid")  { dimension = "tier"; applicationIdSuffix = ".paid" }
    }
    // 变体 = buildType × flavor，如 freeDebug / paidRelease
}`

const signingSnippet = `// 1. 先生成 keystore（命令行，只做一次，妥善保管不能丢）
//    keytool -genkeypair -v -keystore release.jks \\
//      -alias myapp -keyalg RSA -keysize 2048 -validity 10000

// app/build.gradle.kts
android {
    signingConfigs {
        create("release") {
            // 实战中从环境变量 / local.properties 读，切勿把密码硬编码进版本库
            storeFile = file(System.getenv("KEYSTORE_PATH") ?: "release.jks")
            storePassword = System.getenv("KEYSTORE_PWD")
            keyAlias = "myapp"
            keyPassword = System.getenv("KEY_PWD")
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}`

const bundleSnippet = `# 打包 Android App Bundle（.aab），这是上架 Google Play 的标准产物
./gradlew bundleRelease
# 产物在 app/build/outputs/bundle/release/app-release.aab

# 本地若要装到真机调试 release 包，可用 bundletool 从 aab 生成针对性 apk：
# java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks
#   --mode=universal

# 对比：以前直接上传 .apk；现在上架统一用 .aab，由 Play 按设备下发最小 apk
./gradlew assembleRelease   # 仍可产出 apk，多用于内部分发 / 侧载`

export default function Ch2() {
  return (
    <article>
      <Lead>
        到了全课最后一章：把写好的 App <strong>测试可靠</strong>、<strong>签名打包</strong>、
        <strong>上架到应用商店</strong>。这是从「我电脑上能跑」到「全世界用户能装」的临门一脚。
        我们按测试金字塔讲 Android 的测试分层，再走一遍构建变体、签名、AAB 打包、R8 混淆，
        最后过一遍 Google Play 的上架流程，为整门课收束。
      </Lead>

      <h2>一、测试金字塔在 Android 的样子</h2>
      <KeyIdea>
        测试金字塔的原则是：<strong>底层多、顶层少</strong>。大量快速、便宜的<strong>单元测试</strong>打底，
        中间一层<strong>集成 / UI 测试</strong>，顶端少量端到端测试。越往上越慢越脆、维护成本越高，
        所以越往上数量越少。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>层级</th><th>测什么</th><th>工具</th><th>跑在哪</th></tr>
        </thead>
        <tbody>
          <tr><td>单元测试（底，多）</td><td>纯逻辑、ViewModel、Repository</td><td>JUnit + 协程测试</td><td>本机 JVM，毫秒级</td></tr>
          <tr><td>UI / 组件测试（中）</td><td>单个界面的交互与渲染</td><td>Compose Testing</td><td>设备 / 模拟器或 Robolectric</td></tr>
          <tr><td>端到端（顶，少）</td><td>跨界面的完整用户流程</td><td>Espresso / UI Automator</td><td>真机 / 模拟器，最慢</td></tr>
        </tbody>
      </table>

      <h3>单元测试：JUnit + 协程测试</h3>
      <p>
        单元测试针对不依赖 Android 框架的<strong>纯逻辑</strong>，放在 <code>src/test/</code> 下，跑在本机 JVM，
        速度极快。用 <strong>JUnit</strong> 写断言。
      </p>
      <CodeBlock lang="kotlin" title="JUnit 单元测试" code={unitTestSnippet} />
      <p>
        现代 Android 大量用<strong>协程</strong>，测异步代码要用 <code>kotlinx-coroutines-test</code>。
        核心是 <code>runTest { }</code>：它在测试里驱动协程、<strong>自动跳过真实延时</strong>，让本来要等几秒的
        <code>delay</code> 瞬间完成；配合可控的 <code>TestDispatcher</code>，还能精确控制并发时序。
      </p>
      <CodeBlock lang="kotlin" title="协程测试：runTest" code={coroutineTestSnippet} />

      <h3>UI 测试：Compose Testing</h3>
      <p>
        测 Compose 界面用官方的 <strong>Compose Testing</strong>。它的三板斧是：
        <code>createComposeRule()</code> 提供隔离的测试环境并用 <code>setContent</code> 放入要测的 Composable；
        <code>onNodeWithText(...)</code>（及 <code>onNodeWithTag</code> 等）按语义<strong>查找节点</strong>；
        然后用 <code>performClick()</code> 等<strong>发起交互</strong>、用 <code>assertIsDisplayed()</code> 等
        <strong>做断言</strong>。
      </p>
      <CodeBlock lang="kotlin" title="Compose UI 测试" code={composeTestSnippet} />
      <Callout variant="info" title="Espresso 一句话">
        <code>Espresso</code> 是传统 View 体系的 UI 测试框架（<code>onView</code> / <code>perform</code> /
        <code>check</code>），纯 Compose 项目用 Compose Testing 即可，二者也能在混合界面里互通。
      </Callout>

      <h2>二、构建变体：buildTypes 与 flavors</h2>
      <p>
        同一份代码常要产出多种 App 包：调试版要可调试、能装在正式版旁边；正式版要混淆压缩；
        可能还要分免费 / 付费版。Gradle 用两个维度组合出这些<strong>构建变体</strong>。
      </p>
      <ul>
        <li><strong>buildTypes</strong>：构建类型，内置 <code>debug</code> 和 <code>release</code>。debug 方便开发，release 开启优化与签名。</li>
        <li><strong>productFlavors</strong>：产品风味，按业务维度拆分，如 <code>free</code> / <code>paid</code>，各自可有不同包名、资源、配置。</li>
      </ul>
      <p>
        变体 = buildType × flavor。比如声明了上面两者，就能得到 <code>freeDebug</code>、<code>freeRelease</code>、
        <code>paidDebug</code>、<code>paidRelease</code> 四个变体。
      </p>
      <CodeBlock lang="kotlin" title="buildTypes 与 productFlavors" code={buildTypesSnippet} />

      <h2>三、签名：keystore、签名配置与 Play App Signing</h2>
      <KeyIdea>
        每个上架的 App 都必须用<strong>数字签名</strong>。签名证明「这个更新包确实来自同一开发者」，
        系统据此才允许覆盖安装。签名的私钥存在 <strong>keystore</strong> 文件里，
        <strong>一旦丢失或泄露，你将无法再为这个 App 发布更新</strong>。
      </KeyIdea>
      <p>
        流程是：先用 <code>keytool</code> 生成一个 keystore（含密钥别名、密码），再在
        <code>build.gradle.kts</code> 里配 <code>signingConfigs</code> 指向它，并把 release 构建类型挂上这个签名配置。
      </p>
      <CodeBlock lang="kotlin" title="签名配置" code={signingSnippet} />
      <Callout variant="warn" title="密钥与密码绝不进版本库">
        keystore 文件和各种密码<strong>不能</strong>提交到 Git。实战里从环境变量、
        <code>local.properties</code> 或 CI 的密钥管理读取，并对 keystore 做好异地备份——丢了它，
        这个应用就再也发不了更新了。
      </Callout>
      <p>
        <strong>Play App Signing</strong>（Google Play 应用签名）是 Google 推荐且对新应用默认启用的方案：
        你保留一个<strong>上传密钥</strong>用于给上传到 Play 的包签名，而真正面向用户的<strong>应用签名密钥</strong>
        由 Google 安全托管。好处是即便上传密钥泄露也能找 Google 重置，而最终签名密钥永不离开 Google 的保险库。
      </p>

      <h2>四、打包 AAB 与 R8 混淆压缩</h2>
      <h3>Android App Bundle（AAB）</h3>
      <p>
        上架 Google Play 的标准产物已经从 APK 变成了 <strong>AAB（Android App Bundle，<code>.aab</code>）</strong>。
        AAB 不是直接装到手机的包，而是一份「打包好的所有素材」上传给 Play；Play 再根据每台设备的屏幕密度、
        CPU 架构、语言，动态生成并下发<strong>体积最小的定制 APK</strong>。这叫 Dynamic Delivery，能显著减小用户下载量。
      </p>
      <CodeBlock lang="bash" title="打包 AAB 与 APK" code={bundleSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>APK</th><th>AAB</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>可直接安装的包</td><td>上传给商店的发布格式</td></tr>
          <tr><td>设备适配</td><td>一个包装所有设备（偏大）</td><td>Play 按设备下发最小 APK</td></tr>
          <tr><td>Play 上架</td><td>不再接受新应用用 APK 上架</td><td>新应用必须用 AAB</td></tr>
          <tr><td>侧载 / 内部分发</td><td>仍常用</td><td>需 bundletool 转成 APK</td></tr>
        </tbody>
      </table>

      <h3>R8：混淆与压缩</h3>
      <p>
        release 构建里把 <code>isMinifyEnabled = true</code> 打开，就会启用 <strong>R8</strong>。它一步做三件事：
        <strong>压缩</strong>（去掉没被用到的类与方法，缩小包体）、<strong>混淆</strong>（把类名方法名改成 <code>a</code>、
        <code>b</code> 这种短名，既减体积又增加逆向难度）、<strong>优化</strong>（内联、去死代码）。配合
        <code>isShrinkResources = true</code> 还能砍掉无用资源。
      </p>
      <Callout variant="warn" title="混淆会破坏反射 / 序列化，要写 keep 规则">
        反射、Gson/Moshi 序列化、JNI 等依赖「名字不变」的场景，会被混淆改名搞坏。需要在
        <code>proguard-rules.pro</code> 里写 <code>-keep</code> 规则保住这些类。开了混淆后务必<strong>实测 release 包</strong>，
        别只测 debug。
      </Callout>

      <h2>五、上架 Google Play 的流程</h2>
      <p>
        准备好签名的 AAB，就能走 <strong>Google Play Console</strong> 上架：
      </p>
      <ol>
        <li><strong>创建应用</strong>：在 Console 新建应用，填名称、默认语言、应用 / 游戏类别。</li>
        <li><strong>完善商店信息</strong>：图标、截图、简介、隐私政策链接，以及内容分级、数据安全表单等合规项。</li>
        <li><strong>上传 AAB 到测试轨道</strong>：先进<strong>内测（internal testing）</strong>给少数人验证；再到<strong>封测（closed testing）</strong>扩大范围；稳了再发<strong>正式（production）</strong>轨道。轨道是渐进放量的护栏。</li>
        <li><strong>提交审核</strong>：Google 会审核合规与功能，通过后才在商店可见。</li>
        <li><strong>分阶段发布</strong>：正式轨道还可设灰度比例（如先放 10% 用户），出问题能及时止损。</li>
      </ol>
      <Callout variant="info" title="国内商店一句话">
        Google Play 在国内不可用，面向国内还需上架华为、小米、OPPO、vivo、应用宝等各家商店，
        各自有独立的开发者后台、审核规则与（多为 APK 的）打包要求。
      </Callout>
      <Example title="一条典型的发布路径">
        <p>
          <code>{'./gradlew bundleRelease'}</code> 产出签名 AAB → 传到内测轨道，团队内安装验证 →
          升到封测，招募一批外部用户灰度 → 收集崩溃与反馈、修问题 → 发正式轨道并设 10% 分阶段放量 →
          指标健康后逐步拉到 100%。每一步都给了「发现问题就回退」的余地。
        </p>
      </Example>

      <h2>六、全课收束</h2>
      <p>
        从 Kotlin 语言基础、Jetpack Compose 的声明式 UI，到状态管理、架构、数据与网络，再到这一卷的
        权限适配性能与测试发布——你已经走完了一个 Android App<strong>从无到上架</strong>的完整闭环。
        工程化的精髓不在某个炫技 API，而在把「可靠、可维护、可交付」当成默认要求：测试兜底质量、
        变体与签名管住发布、商店流程的渐进放量让你有底气面对真实用户。带着这套闭环思维，
        去做出你自己的第一个上架 App 吧。
      </p>

      <Summary
        points={[
          '测试金字塔：底层大量 JUnit 单元测试（含 runTest 跑协程、隔离依赖），中间 Compose UI 测试，顶端少量 Espresso/端到端。',
          'Compose Testing 三板斧：createComposeRule 起环境、onNodeWithText 查节点、performClick/assertIsDisplayed 交互与断言。',
          '构建变体 = buildTypes（debug/release）× productFlavors（如 free/paid）；release 开启优化与签名。',
          '签名靠 keystore 私钥证明同一开发者，丢了就发不了更新；密码绝不进版本库；Play App Signing 让 Google 托管最终签名密钥、你只管上传密钥。',
          '上架产物用 AAB（取代 APK），Play 按设备下发最小 APK；release 开 R8 做压缩+混淆+优化，反射/序列化需写 keep 规则并实测 release 包。',
          '上架流程：Play Console 创建应用→完善商店信息与合规→内测/封测/正式轨道渐进放量→审核→分阶段发布；国内还需上各家安卓商店。',
        ]}
      />
    </article>
  )
}
