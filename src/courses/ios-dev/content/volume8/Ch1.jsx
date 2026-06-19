import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const printChangesSnippet = `import SwiftUI

struct ProfileView: View {
    @State private var counter = 0
    let user: User

    var body: some View {
        // 打印「这次 body 为什么被重算」——是 @State 变了，还是入参变了
        let _ = Self._printChanges()

        VStack {
            Text(user.name)
            Button("点我 \\(counter)") { counter += 1 }
        }
    }
}

// 控制台会输出类似：
// ProfileView: _counter changed.
// 说明这次重算是因为 counter 这个 @State 发生了变化`

const expensiveBodySnippet = `// ❌ 反例：body 里做了昂贵计算，每次重算都全量重跑
struct BadListView: View {
    let items: [Item]
    var body: some View {
        // 排序 + 过滤写在 body 里：只要视图重算就重新算一遍
        let sorted = items
            .filter { $0.isEnabled }
            .sorted { $0.score > $1.score }
        List(sorted) { item in
            Text(item.title)
        }
    }
}

// ✅ 正解一：把派生数据上移到 ViewModel，用缓存/计算属性管理
// ✅ 正解二：用稳定 id 的 List，让 SwiftUI 精确 diff，而非整列重建`

const stableIdSnippet = `// 数据模型遵循 Identifiable，且 id 必须「稳定」——
// 不要用数组下标 (offset)、也不要每次新建随机 UUID 当 id
struct Item: Identifiable, Equatable {
    let id: UUID          // 持久、稳定，跨刷新不变
    var title: String
    var score: Int
}

struct GoodListView: View {
    let items: [Item]
    var body: some View {
        // List 直接吃 Identifiable，SwiftUI 能按 id 做最小化 diff
        List(items) { item in
            ItemRow(item: item)   // 拆成独立子视图，缩小重算范围
        }
    }
}

// ItemRow 只依赖自己那一行的数据，
// 其它行变化时它不会被重算 —— 这就是「拆分视图」的收益`

const equatableViewSnippet = `// 给子视图加 Equatable，可让 SwiftUI 在入参没变时跳过 body
struct ItemRow: View, Equatable {
    let item: Item

    var body: some View {
        HStack {
            Text(item.title)
            Spacer()
            Text("\\(item.score)")
        }
    }

    // 入参相等就认为视图相等，SwiftUI 据此跳过这次重算
    static func == (lhs: ItemRow, rhs: ItemRow) -> Bool {
        lhs.item == rhs.item
    }
}`

const xctestSnippet = `import XCTest
@testable import MyApp

final class CounterViewModelTests: XCTestCase {
    func testIncrementRaisesCount() {
        // Given：一个初始计数为 0 的 ViewModel
        let sut = CounterViewModel(start: 0)

        // When：调用一次自增
        sut.increment()

        // Then：计数变为 1
        XCTAssertEqual(sut.count, 1)
    }

    func testCannotGoBelowZero() {
        let sut = CounterViewModel(start: 0)
        sut.decrement()
        XCTAssertEqual(sut.count, 0, "计数不应小于 0")
    }
}`

const swiftTestingSnippet = `import Testing
@testable import MyApp

// 新一代 Swift Testing：用 @Test 标记、用 #expect 断言，语法更轻
struct CounterViewModelTests {
    @Test func incrementRaisesCount() {
        let sut = CounterViewModel(start: 0)
        sut.increment()
        #expect(sut.count == 1)
    }

    // 参数化测试：一个函数跑多组用例
    @Test(arguments: [0, 5, 99])
    func incrementFrom(_ start: Int) {
        let sut = CounterViewModel(start: start)
        sut.increment()
        #expect(sut.count == start + 1)
    }
}`

const asyncTestSnippet = `import Testing
@testable import MyApp

struct UserServiceTests {
    // 异步测试：直接 await，无需 XCTestExpectation 那套回调样板
    @Test func fetchUserReturnsName() async throws {
        // 注入一个假的网络层（协议实现），不打真实接口
        let service = UserService(api: MockAPI(json: validUserJSON))

        let user = try await service.fetchUser(id: "42")

        #expect(user.name == "张三")
    }

    // 断言会抛错：用 #expect(throws:)
    @Test func fetchInvalidUserThrows() async {
        let service = UserService(api: MockAPI(failWith: .notFound))
        await #expect(throws: APIError.notFound) {
            try await service.fetchUser(id: "bad")
        }
    }
}`

const protocolInjectionSnippet = `// 可测试性的关键：依赖「协议」而非「具体实现」，从外部注入
protocol APIClient {
    func get(_ path: String) async throws -> Data
}

// 生产实现：真的发网络请求
struct LiveAPIClient: APIClient {
    func get(_ path: String) async throws -> Data { /* URLSession... */ }
}

// 测试替身：返回预设数据，不碰网络，结果可预测
struct MockAPI: APIClient {
    var json: Data = Data()
    func get(_ path: String) async throws -> Data { json }
}

@MainActor
final class UserViewModel: ObservableObject {
    @Published var name = ""
    private let api: APIClient          // 依赖抽象

    // 构造器注入：生产传 Live，测试传 Mock
    init(api: APIClient) { self.api = api }
}`

const xcuitestSnippet = `import XCTest

// UI 测试运行在「另一个进程」里，通过无障碍标识操纵真实界面
final class LoginUITests: XCTestCase {
    func testLoginFlow() {
        let app = XCUIApplication()
        app.launch()

        // 通过 accessibilityIdentifier 定位控件，比按文案更稳
        app.textFields["username"].tap()
        app.textFields["username"].typeText("alice")

        app.secureTextFields["password"].tap()
        app.secureTextFields["password"].typeText("secret")

        app.buttons["loginButton"].tap()

        // 断言登录后首页出现
        XCTAssertTrue(app.staticTexts["欢迎回来"].waitForExistence(timeout: 3))
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        App 写得能跑只是起点，能不能<strong>跑得顺、改得稳、上线后不崩</strong>才是工程化的分水岭。
        这一章我们把 iOS 的「质量三件套」讲透：用 Instruments 量化并定位性能瓶颈，用调试技巧看清
        SwiftUI 到底为什么重算，再用单元测试 / UI 测试给代码织一张安全网。贯穿全章的主线是一句话——
        <strong>先测量，再优化；先解耦，才可测</strong>。
      </Lead>

      <h2>一、性能分析：先测量，别猜</h2>
      <KeyIdea>
        性能优化的第一原则是<strong>不要凭感觉猜瓶颈</strong>。人对「哪段代码慢」的直觉常常是错的。
        正确做法是用 Instruments 这类剖析工具<strong>测量</strong>出真正的热点，针对数据动手，再测量验证。
        盲目优化往往把时间花在不痛不痒的地方。
      </KeyIdea>
      <p>
        Instruments 是 Xcode 自带的性能剖析套件，从菜单
        <code>Product ▸ Profile</code>（快捷键 <code>⌘I</code>）启动。它会把 App 以
        Release 优化级别构建后在真机上运行，并按「模板（Instrument）」采集不同维度的数据。
        下面是最常用的几个模板。
      </p>
      <table>
        <thead>
          <tr><th>Instrument 模板</th><th>解决什么问题</th><th>关键看什么</th></tr>
        </thead>
        <tbody>
          <tr><td>Time Profiler</td><td>CPU 耗时：哪个函数最吃 CPU</td><td>调用树里占比最高的栈（heaviest stack trace）</td></tr>
          <tr><td>Allocations</td><td>内存分配：谁分配了大量对象</td><td>持续增长的分配、过大的瞬时峰值</td></tr>
          <tr><td>Leaks</td><td>内存泄漏：对象该释放却没释放</td><td>红色叉号标记的泄漏块与其引用环</td></tr>
          <tr><td>SwiftUI</td><td>视图重算：哪些 body 算得太频繁</td><td>View Body 的次数与耗时、长帧（hitch）</td></tr>
          <tr><td>Animation Hitches</td><td>掉帧 / 卡顿</td><td>超过帧预算的渲染提交</td></tr>
        </tbody>
      </table>

      <h3>Time Profiler：找出耗时的函数</h3>
      <p>
        Time Profiler 按固定时间间隔对线程「拍快照」，统计每个函数出现在调用栈里的次数，
        近似得出 CPU 时间分布。看的时候要勾上 <code>Hide System Libraries</code> 只看自己的代码，
        再用 <code>Invert Call Tree</code> 把最底层的热点函数顶到列表上方。占比最高的那几行，
        就是优化的优先目标。
      </p>

      <h3>Allocations 与 Leaks：找内存问题</h3>
      <p>
        内存问题分两类。一类是<strong>真泄漏</strong>：对象失去引用却没被释放，
        <code>Leaks</code> 模板会直接标红，通常源于 <strong>强引用环</strong>（闭包捕获 self、
        delegate 没用 weak）。另一类是<strong>滥用 / 涨而不退</strong>：没泄漏但分配过多、内存只升不降，
        靠 <code>Allocations</code> 的时间曲线和「Generations」标记来定位是哪段操作把内存推高了。
      </p>
      <Callout variant="warn" title="最常见的泄漏：闭包捕获 self">
        在 <code>Task</code>、闭包或异步回调里直接用 <code>self</code>，很容易形成
        「self 持有闭包、闭包又持有 self」的引用环。解法是用捕获列表
        <code>{'[weak self]'}</code>，并在用时 <code>{'guard let self else { return }'}</code>。
        Leaks 模板里那个绕成环的引用图，多半就指向它。
      </Callout>

      <h3>SwiftUI Instrument：看 body 重算</h3>
      <p>
        SwiftUI 是声明式的：状态一变，框架就重新计算受影响视图的 <code>body</code>，再 diff 出最小更新。
        如果某个 <code>body</code> 算得过于频繁、或单次算得太贵，界面就会卡。SwiftUI 模板能告诉你
        <strong>每个视图的 body 被算了多少次、各花了多久</strong>，以及哪些帧超出了渲染预算（出现 hitch）。
        这是定位 SwiftUI 性能问题最直接的工具。
      </p>

      <h2>二、SwiftUI 常见性能陷阱</h2>
      <p>
        SwiftUI 的性能问题几乎都可以归到「重算太多」或「单次重算太贵」这两类。逐个来看。
      </p>

      <h3>陷阱 1：昂贵的 body</h3>
      <p>
        <code>body</code> 是<strong>纯函数</strong>，会被频繁调用，因此里面绝不该放重活——
        排序、过滤、正则、日期格式化、大对象构造等都不该写在 <code>body</code> 里。
        正确做法是把这些派生计算上移到 ViewModel，用计算属性或缓存维护，<code>body</code> 只负责描述界面。
      </p>
      <CodeBlock lang="swift" title="反例：把排序过滤写进了 body" code={expensiveBodySnippet} />

      <h3>陷阱 2：不必要的状态依赖触发重算</h3>
      <p>
        SwiftUI 会追踪一个视图<strong>读取</strong>了哪些状态，被读取的状态一变就重算该视图。
        如果你把一个粒度过粗的大对象（比如整个 <code>@ObservedObject</code>）塞进很多视图，
        任何一个字段变化都会引发一大片重算。<strong>缩小依赖粒度</strong>——只把视图真正用到的那部分
        传进去，是减少重算最有效的手段之一。
      </p>

      <h3>陷阱 3：大数据 List 与不稳定的 id</h3>
      <p>
        长列表性能的关键是让 SwiftUI 能做<strong>精确 diff</strong>，而这依赖<strong>稳定的标识</strong>。
        如果用数组下标当 id，或每次刷新都给元素 new 一个随机 <code>UUID</code>，SwiftUI 就无法判断
        「这一行还是不是上一行」，只能整列重建，既慢又会丢失动画与选中态。
        正确做法是让模型遵循 <code>Identifiable</code> 且 id 持久不变。
      </p>
      <CodeBlock lang="swift" title="稳定的 Identifiable + 拆分子视图" code={stableIdSnippet} />
      <Callout variant="tip" title="给重的子视图加 Equatable">
        当一个子视图的 <code>body</code> 较贵、而它只依赖少量入参时，可让它遵循
        <code>Equatable</code> 并实现 <code>==</code>。入参没变时 SwiftUI 会直接跳过这次 body 计算，
        进一步收窄重算范围。
      </Callout>
      <CodeBlock lang="swift" title="Equatable 视图：入参没变就跳过 body" code={equatableViewSnippet} />

      <h2>三、调试技巧：看清「为什么会这样」</h2>
      <p>
        除了断点这种基本功，SwiftUI 还有几招专门用来回答「这个视图<strong>为什么</strong>重算了」。
      </p>
      <ul>
        <li><strong>断点</strong>：在可疑代码行设普通断点；用<strong>条件断点</strong>只在
          <code>count {'>'} 100</code> 时停；用<strong>符号断点</strong>对 <code>malloc_error_break</code>、
          崩溃符号统一拦截。</li>
        <li><strong>Self._printChanges()</strong>：在 <code>body</code> 里加一行，控制台会打印
          「这次重算是哪个状态 / 入参引起的」，是定位「莫名其妙又重算了」的利器。</li>
        <li><strong>预览（Preview）调试</strong>：Xcode Previews 支持热重载，能针对单个视图、
          注入假数据快速验证布局与状态分支，不必每次跑整个 App。</li>
        <li><strong>视图层级调试器</strong>：运行时点 <code>Debug View Hierarchy</code> 可 3D 拆解
          当前界面，查约束冲突、看不见的覆盖层等问题。</li>
      </ul>
      <CodeBlock lang="swift" title="用 Self._printChanges() 看重算原因" code={printChangesSnippet} />
      <Callout variant="warn" title="_printChanges 仅供调试">
        <code>Self._printChanges()</code> 是带下划线的私有 API，只该在调试期临时使用，
        发布前务必移除，不要把它留在生产代码里。
      </Callout>

      <h2>四、测试体系：单元、异步与 UI</h2>
      <KeyIdea>
        测试不是「写完功能后的额外负担」，而是让你<strong>敢于重构</strong>的底气。
        一个有测试网的工程，你改完代码跑一遍测试就知道有没有破坏既有行为；
        没有测试网，每次改动都像在黑暗里走路。
      </KeyIdea>

      <h3>单元测试：XCTest 与新的 Swift Testing</h3>
      <p>
        单元测试验证「一小块逻辑」的输入输出是否符合预期，跑得快、定位准。iOS 上有两套框架：
        老牌的 <strong>XCTest</strong>（继承 <code>XCTestCase</code>、用 <code>XCTAssert*</code> 断言）
        与较新的 <strong>Swift Testing</strong>（用 <code>@Test</code> 标记函数、用 <code>#expect</code> 断言，
        语法更轻、报错信息更友好，还原生支持参数化）。两者可以共存，新代码推荐用 Swift Testing。
      </p>
      <CodeBlock lang="swift" title="XCTest 风格" code={xctestSnippet} />
      <CodeBlock lang="swift" title="Swift Testing 风格（@Test / #expect）" code={swiftTestingSnippet} />
      <table>
        <thead>
          <tr><th>对比项</th><th>XCTest</th><th>Swift Testing</th></tr>
        </thead>
        <tbody>
          <tr><td>测试用例</td><td>类里以 <code>test</code> 开头的方法</td><td><code>@Test</code> 标记的任意函数</td></tr>
          <tr><td>断言</td><td><code>XCTAssertEqual</code> 等一族</td><td>统一的 <code>#expect</code> / <code>#require</code></td></tr>
          <tr><td>参数化</td><td>需手写循环</td><td><code>@Test(arguments:)</code> 原生支持</td></tr>
          <tr><td>异步</td><td>支持，但有 expectation 样板</td><td><code>async/await</code> 一等公民</td></tr>
        </tbody>
      </table>

      <h3>异步测试：直接 await</h3>
      <p>
        现代 iOS 代码大量使用 <code>async/await</code>，测试也要能等异步结果。Swift Testing 里直接把测试函数标成
        <code>async throws</code>、在断言前 <code>await</code> 即可，干净利落；要断言会抛错则用
        <code>{'#expect(throws:)'}</code>。
      </p>
      <CodeBlock lang="swift" title="异步测试与抛错断言" code={asyncTestSnippet} />

      <h3>UI 测试：XCUITest</h3>
      <p>
        UI 测试（XCUITest）模拟真实用户在界面上的点击、输入、滑动，验证<strong>端到端流程</strong>是否通畅。
        它运行在独立进程里，通过<strong>无障碍标识（accessibilityIdentifier）</strong>定位控件——
        按标识比按文案稳定得多，文案会因本地化或文案微调而失效。UI 测试慢、脆，适合覆盖关键路径
        （如登录、下单），不该用来覆盖所有细枝末节。
      </p>
      <CodeBlock lang="swift" title="XCUITest：登录流程端到端" code={xcuitestSnippet} />

      <h2>五、可测试性来自架构：MVVM + 协议注入</h2>
      <p>
        代码好不好测，很大程度上在<strong>写之前</strong>就决定了。把业务逻辑塞进 View、或在方法里
        直接 <code>URLSession.shared</code> 发请求，这种代码几乎没法做单元测试——你无法在不联网的情况下
        制造可预测的输入。解法是两条原则的组合：
      </p>
      <ul>
        <li><strong>MVVM</strong>：把逻辑从 View 抽到 <code>ViewModel</code>，让逻辑脱离 UI 独立存在、可被直接实例化测试。</li>
        <li><strong>协议注入（依赖倒置）</strong>：ViewModel 依赖<strong>协议</strong>而非具体实现，
          通过构造器把依赖<strong>注入</strong>进来。生产环境注入真实实现，测试时注入 Mock 替身，
          于是输入可控、结果可预测。</li>
      </ul>
      <CodeBlock lang="swift" title="协议注入：让网络层可被替换" code={protocolInjectionSnippet} />
      <Example title="为什么这样就能测了">
        <p>
          因为 <code>UserViewModel</code> 不认识「真实网络」，它只认识 <code>APIClient</code> 这个协议。
          测试时你递给它一个 <code>MockAPI</code>，它返回预设 JSON——于是「输入固定、输出可断言」，
          整段逻辑就能在毫秒级、零网络的环境下被反复验证。这正是「先解耦，才可测」的含义。
        </p>
      </Example>

      <Callout variant="tip" title="把测试接进 CI">
        本地能跑的测试，更应让它在每次提交时自动跑。用 <code>xcodebuild test</code> 命令把整套测试接入
        持续集成（CI），就能在合并前自动拦住「改坏了既有功能」的提交——这是测试网真正发挥威力的地方。
      </Callout>

      <Summary
        points={[
          '性能优化第一原则：先用 Instruments 测量再动手——Time Profiler 找 CPU 热点、Allocations/Leaks 找内存问题、SwiftUI 模板看 body 重算。',
          'SwiftUI 性能陷阱集中在「重算太多 / 单次太贵」：别在 body 里做昂贵计算、缩小状态依赖粒度、长列表用稳定的 Identifiable 并拆分子视图。',
          '调试三招看清重算：条件/符号断点、Self._printChanges() 打印重算原因、Previews 热重载快速验证；_printChanges 仅供调试，发布前移除。',
          '测试是敢重构的底气：单元测试用 XCTest 或更轻的 Swift Testing（@Test/#expect、原生参数化与 async），异步直接 await，关键流程用 XCUITest。',
          '可测试性来自架构：MVVM 把逻辑抽离 UI，协议注入让依赖可被 Mock 替换，做到「输入可控、输出可断言」——先解耦，才可测。',
        ]}
      />
    </article>
  )
}
