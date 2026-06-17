import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const tightlyCoupledSnippet = `// 反例：ViewModel 自己 new 出依赖，硬编码了「具体类」
@Observable
@MainActor
final class BadProfileViewModel {
    // 直接 new 一个具体的网络服务——和它焊死了
    private let service = LiveProfileService()

    var profile: Profile?

    func load(id: String) async {
        profile = try? await service.fetch(id: id)
    }
}
// 问题：测试时无法换成假的 service，必须真的发网络；
// 想换一个实现（缓存版、离线版）也得改 ViewModel 源码。`

const protocolSnippet = `// 第一步：用协议定义「能力」，而不是依赖某个具体类
protocol ProfileService {
    func fetch(id: String) async throws -> Profile
}

// 真实实现：走网络
struct LiveProfileService: ProfileService {
    let client: HTTPClient
    func fetch(id: String) async throws -> Profile {
        let data = try await client.get("/users/\\(id)")
        return try JSONDecoder().decode(Profile.self, from: data)
    }
}

// 假实现：用于测试 / 预览，完全可控，不碰网络
struct MockProfileService: ProfileService {
    var stubbed: Profile = .preview
    var shouldThrow = false
    func fetch(id: String) async throws -> Profile {
        if shouldThrow { throw URLError(.timedOut) }
        return stubbed
    }
}`

const initInjectionSnippet = `// 第二步：ViewModel 依赖「协议」，通过 init 把实现注入进来
@Observable
@MainActor
final class ProfileViewModel {
    private let service: ProfileService   // 只认协议，不认具体类

    // 初始化器注入：依赖从外部传入，自己不 new
    init(service: ProfileService) {
        self.service = service
    }

    var profile: Profile?
    var errorMessage: String?

    func load(id: String) async {
        do {
            profile = try await service.fetch(id: id)
        } catch {
            errorMessage = "加载失败"
        }
    }
}`

const wiringSnippet = `// 第三步：在不同场景注入不同实现——这是 DI 的全部价值所在

// 生产：注入真实服务
let vm = ProfileViewModel(service: LiveProfileService(client: .shared))

// SwiftUI 预览：注入假服务，秒开、无网络
#Preview {
    ProfileView(vm: ProfileViewModel(service: MockProfileService()))
}

// 单元测试：注入可控的假服务，断言行为
@MainActor
@Test func 加载失败时写入错误信息() async {
    var mock = MockProfileService()
    mock.shouldThrow = true
    let vm = ProfileViewModel(service: mock)

    await vm.load(id: "42")

    #expect(vm.profile == nil)
    #expect(vm.errorMessage == "加载失败")
}`

const environmentKeySnippet = `// 跨多层共享的服务（如登录态、主题、分析埋点）适合用 @Environment 注入

// 1) 让服务遵循一个协议，便于替换
protocol Analytics { func log(_ event: String) }
struct LiveAnalytics: Analytics { func log(_ e: String) { /* 上报 */ } }
struct NoopAnalytics: Analytics { func log(_ e: String) {} }

// 2) 自定义 EnvironmentKey，给一个默认值
private struct AnalyticsKey: EnvironmentKey {
    static let defaultValue: Analytics = NoopAnalytics()
}

// 3) 在 EnvironmentValues 上开一个属性
extension EnvironmentValues {
    var analytics: Analytics {
        get { self[AnalyticsKey.self] }
        set { self[AnalyticsKey.self] = newValue }
    }
}`

const environmentUseSnippet = `// 4) 在根视图注入一次，整棵子树都能读到——无需层层手动传参
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\\.analytics, LiveAnalytics())
        }
    }
}

// 5) 任意深层子视图直接取用
struct LikeButton: View {
    @Environment(\\.analytics) private var analytics

    var body: some View {
        Button("赞") { analytics.log("tap_like") }
    }
}`

const packageSnippet = `// 用本地 Swift Package 把功能拆成模块（Package.swift）
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Features",
    platforms: [.iOS(.v17)],
    products: [
        // 只把需要被外部使用的模块声明为产品
        .library(name: "ProfileFeature", targets: ["ProfileFeature"]),
        .library(name: "Networking", targets: ["Networking"]),
    ],
    targets: [
        // ProfileFeature 依赖 Networking，模块边界清晰
        .target(name: "ProfileFeature", dependencies: ["Networking"]),
        .target(name: "Networking"),
        .testTarget(name: "ProfileFeatureTests", dependencies: ["ProfileFeature"]),
    ]
)`

const accessControlSnippet = `// 模块边界靠访问控制（access control）来守住

// Networking 模块：只暴露协议和 client，隐藏内部细节
public protocol ProfileService {            // public：跨模块可见
    func fetch(id: String) async throws -> Profile
}

public struct LiveProfileService: ProfileService {
    public init(client: HTTPClient) { self.client = client }
    public func fetch(id: String) async throws -> Profile { /* ... */ }

    let client: HTTPClient                  // internal（默认）：仅本模块可见
}

// internal 的辅助类型不会泄露到模块外，外部代码无法依赖它，
// 你日后随便重构内部实现都不会破坏其它模块——这就是模块边界的意义。`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章的 ViewModel 留了个尾巴：它需要一个 <code>repository</code> / <code>service</code>，
        但「这个依赖从哪来、怎么进到 ViewModel 里」一直没说清。这一章我们补上这块——讲依赖注入（DI）：
        为什么不能让对象自己 <code>new</code> 出依赖，三种在 SwiftUI 里注入依赖的方式，
        如何用协议解耦让代码可测，以及怎样用 Swift Package 把功能拆成模块。
      </Lead>

      <h2>一、动机：为什么不让对象自己创建依赖</h2>
      <p>
        先看一个很自然、却很糟糕的写法：ViewModel 在内部直接 <code>new</code> 出它要用的服务。
      </p>
      <CodeBlock lang="swift" title="反例：自己 new 依赖，硬编码具体类" code={tightlyCoupledSnippet} />
      <p>
        这段代码能跑，但埋了三个雷。其一，<strong>无法测试</strong>：<code>load()</code> 一定会真的发网络，
        测试因此变慢、变脆、还可能因为网络抖动而失败。其二，<strong>无法替换</strong>：想换成带缓存的实现、
        或离线 Mock，必须改 ViewModel 的源码。其三，<strong>耦合具体类型</strong>：ViewModel「知道得太多」，
        它和 <code>LiveProfileService</code> 焊死在一起。
      </p>
      <KeyIdea>
        依赖注入（Dependency Injection）的核心：一个对象<strong>不自己创建</strong>它依赖的东西，
        而是<strong>由外部把依赖「交给」它</strong>。目标是三件事——<strong>解耦</strong>（不绑死具体类）、
        <strong>可替换</strong>（生产用真实、测试用假）、<strong>可测试</strong>（注入可控的实现）。
      </KeyIdea>

      <h2>二、面向协议解耦：依赖抽象，而非具体</h2>
      <p>
        DI 的前提是「依赖一个抽象」。在 Swift 里，这个抽象通常是<strong>协议（protocol）</strong>。
        我们先用协议描述「需要什么能力」，再分别给出真实实现和假实现。ViewModel 只认协议，
        于是任何遵循协议的类型都能被塞进来。
      </p>
      <CodeBlock lang="swift" title="协议 + 真实实现 + Mock 实现" code={protocolSnippet} />
      <p>
        这是面向协议编程（POP）在架构层的应用：<strong>ViewModel 依赖 <code>ProfileService</code> 这个协议，
        而不依赖 <code>LiveProfileService</code> 这个类</strong>。真实实现走网络，Mock 实现完全可控——
        想让它返回什么、想让它抛错，都由测试说了算。
      </p>

      <h2>三、注入方式之一：初始化器注入（最推荐）</h2>
      <p>
        最直接、最适合 ViewModel 的注入方式是<strong>初始化器注入</strong>：把依赖作为 <code>init</code>
        的参数传进来。它的好处是依赖关系<strong>显式、编译期检查</strong>——少传一个依赖，代码根本编译不过，
        不会出现「运行到一半发现某个依赖是 nil」的隐患。
      </p>
      <CodeBlock lang="swift" title="初始化器注入：依赖通过 init 传入" code={initInjectionSnippet} />
      <p>
        ViewModel 写好后，真正体现 DI 价值的是<strong>装配（wiring）</strong>那一步：同一个 ViewModel，
        在生产、预览、测试三种场景注入<strong>不同</strong>的实现。注意 ViewModel 的代码一行没改。
      </p>
      <CodeBlock lang="swift" title="在不同场景注入不同实现" code={wiringSnippet} />
      <Callout variant="tip" title="初始化器注入 + SwiftUI 预览是绝配">
        因为依赖可从 <code>init</code> 传入，SwiftUI 的 <code>#Preview</code> 里塞一个 Mock 服务就能让预览
        秒开、不连网络、稳定可重复。能不能轻松写预览，往往就是「这段代码解耦得好不好」的试金石。
      </Callout>

      <h2>四、注入方式之二：@Environment 注入跨层共享服务</h2>
      <p>
        初始化器注入适合「一个屏幕一个 ViewModel」的局部依赖。但有些服务是<strong>全局、跨多层</strong>共享的——
        登录态、主题、分析埋点、特性开关。这些若也靠 <code>init</code> 一层层往下传，会污染中间所有视图的
        参数列表（俗称 prop drilling）。SwiftUI 为此提供了 <code>@Environment</code>：在某一层注入一次，
        整棵子树都能读到。
      </p>
      <p>
        要让自定义服务能走 Environment，需要三步：定义一个 <code>EnvironmentKey</code> 并给默认值、
        在 <code>EnvironmentValues</code> 上开一个属性、然后就能用 <code>.environment(\\.xxx, ...)</code> 注入、
        用 <code>@Environment(\\.xxx)</code> 读取。
      </p>
      <CodeBlock lang="swift" title="自定义 EnvironmentKey（前三步）" code={environmentKeySnippet} />
      <CodeBlock lang="swift" title="注入一次，深层子视图直接读取" code={environmentUseSnippet} />
      <p>
        这里同样配了协议（<code>Analytics</code>）和默认值 <code>NoopAnalytics</code>：默认什么都不做，
        生产注入 <code>LiveAnalytics</code>，预览 / 测试可注入一个记录调用的假实现。
        <strong>「默认值是个安全的空实现」</strong>是 EnvironmentKey 的常见好习惯。
      </p>
      <table>
        <thead>
          <tr><th>注入方式</th><th>适合的依赖</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>初始化器注入</td>
            <td>某个屏幕 / ViewModel 专属的依赖（Repository、Service）</td>
            <td>显式、编译期检查、最易测；首选。</td>
          </tr>
          <tr>
            <td><code>@Environment</code> 注入</td>
            <td>跨多层共享的全局服务（登录态、主题、埋点）</td>
            <td>避免层层传参；但依赖关系较隐式，别滥用。</td>
          </tr>
        </tbody>
      </table>

      <h2>五、单例的诱惑与节制</h2>
      <p>
        很多人会用单例（<code>SomeService.shared</code>）来「共享一个实例」。单例本身不是原罪——系统也有
        <code>URLSession.shared</code>。问题在于<strong>滥用</strong>：当 ViewModel 内部直接写
        <code>NetworkManager.shared.fetch(...)</code>，它又一次和具体类型焊死了，回到了本章开头那个反例——
        无法替换、无法测试。
      </p>
      <Callout variant="warn" title="不要让单例渗进业务对象内部">
        即便底层确实只想要一个实例，也应该把这个单例<strong>从外部注入</strong>给 ViewModel
        （<code>init(service: SomeService.shared)</code>），而不是让 ViewModel 内部去引用 <code>.shared</code>。
        这样测试时仍能换成 Mock。单例可以是「装配处的默认值」，但不该是「业务对象内部的硬编码」。
      </Callout>

      <h2>六、用 Swift Package 把功能拆成模块</h2>
      <p>
        当 App 长大，把所有代码堆在一个 target 里会带来两个问题：<strong>编译慢</strong>（改一行全量重编）
        和<strong>边界糊</strong>（任何代码都能引用任何代码，耦合无声蔓延）。解法是用<strong>本地 Swift Package</strong>
        把功能切成模块，每个模块是一个 target，模块之间通过显式声明的依赖关系连接。
      </p>
      <CodeBlock lang="swift" title="Package.swift：声明模块与依赖" code={packageSnippet} />
      <p>
        拆模块带来的收益是实打实的：
      </p>
      <ul>
        <li>
          <strong>提升编译速度</strong>：只改 <code>ProfileFeature</code> 时，没动过的 <code>Networking</code>
          不必重编，增量构建更快。模块还能并行编译。
        </li>
        <li>
          <strong>强制清晰的边界</strong>：模块间只能通过声明的依赖互相引用，避免「随手乱引」。
          依赖关系写在 <code>Package.swift</code> 里，一眼可见。
        </li>
        <li>
          <strong>可复用</strong>：<code>Networking</code> 这种通用模块能被多个 feature、甚至多个 App 复用。
        </li>
        <li>
          <strong>可独立测试</strong>：每个模块带自己的 <code>testTarget</code>，测试也随之模块化。
        </li>
      </ul>

      <h2>七、模块边界靠访问控制守住</h2>
      <p>
        拆了模块，还要管住「什么能被跨模块看到」。Swift 的访问控制（access control）就是模块边界的执行者。
        最常用的两档：<code>public</code>（跨模块可见）和 <code>internal</code>（默认，仅本模块可见）。
      </p>
      <CodeBlock lang="swift" title="public / internal 守住模块边界" code={accessControlSnippet} />
      <p>
        原则是<strong>「最小暴露」</strong>：只把外部真正需要用的类型和方法标 <code>public</code>，其余保持
        <code>internal</code>（即默认，不写修饰符）。这样内部实现是你可以随时重构的「私有领地」，外部代码
        够不着它，也就不会因为你改内部而崩——这正是模块化最值钱的地方：<strong>把变化隔离在边界之内</strong>。
      </p>
      <Example title="一个典型的模块化 + DI 组合">
        <p>
          <code>Networking</code> 模块对外暴露 <code>public protocol ProfileService</code> 和 <code>public LiveProfileService</code>；
        </p>
        <p>
          <code>ProfileFeature</code> 模块里的 <code>ProfileViewModel</code> 依赖 <code>ProfileService</code> 协议（来自 Networking）；
        </p>
        <p>
          App 主 target 在装配处 <code>new</code> 出 <code>LiveProfileService</code> 并通过 <code>init</code> 注入；
          测试 target 则注入 <code>MockProfileService</code>。模块化划好边界，DI 在边界处接线——两者合力，
          得到一个低耦合、好测试、编译快的工程。
        </p>
      </Example>

      <h2>八、小结性的取舍</h2>
      <ul>
        <li><strong>局部依赖用初始化器注入</strong>，显式且最易测，这是默认选择。</li>
        <li><strong>跨层共享服务用 @Environment</strong>，但要克制，别把什么都塞进 Environment 变成隐形全局变量。</li>
        <li><strong>永远依赖协议而非具体类</strong>，这样才能在测试 / 预览里替换实现。</li>
        <li><strong>单例可作装配处的默认值，但别在业务对象内部硬编码 <code>.shared</code>。</strong></li>
        <li><strong>App 长大就拆 Swift Package 模块</strong>，用 public/internal 守边界，换来编译速度与复用性。</li>
      </ul>

      <Summary
        points={[
          '依赖注入的动机：对象不自己 new 依赖、改由外部传入，从而解耦、可替换、可测试。',
          '前提是面向协议解耦：ViewModel 依赖协议而非具体类，测试/预览时传 Mock 或 Fake 实现。',
          '初始化器注入最推荐：依赖经 init 传入，显式且编译期检查，与 SwiftUI 预览天然契合。',
          '@Environment 注入适合跨多层共享的全局服务，需自定义 EnvironmentKey 并给安全的默认空实现；别滥用。',
          '单例不必禁用，但别在业务对象内部硬编码 .shared，应把它作为装配处的默认值注入进来。',
          '用本地 Swift Package 把功能拆模块，提升编译速度与复用；靠 public/internal 访问控制守住模块边界，把变化隔离在内部。',
        ]}
      />
    </article>
  )
}
