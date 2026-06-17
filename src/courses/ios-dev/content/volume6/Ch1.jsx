import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const oldStyleSnippet = `// 旧写法（iOS 13 ~ 16 的主流方案）：Combine + ObservableObject
import Combine

final class OldSearchViewModel: ObservableObject {
    // 每个需要驱动 UI 的属性都要手写 @Published
    @Published var query: String = ""
    @Published var results: [String] = []
    @Published var isLoading = false

    func search() async {
        isLoading = true
        results = await repository.search(query)
        isLoading = false
    }
}

struct OldSearchView: View {
    // 旧写法用 @StateObject 创建、@ObservedObject 接收
    @StateObject private var vm = OldSearchViewModel()
    var body: some View { Text(vm.query) }
}`

const observableSnippet = `// 新写法（iOS 17+ / Swift 5.9 引入的 Observation 框架）
import Observation

@Observable                       // 宏：自动让被读取的属性参与视图刷新追踪
@MainActor                        // 保证所有状态读写、UI 更新都在主线程
final class SearchViewModel {
    // 普通存储属性即可，不再需要 @Published
    var query: String = ""
    var results: [Repo] = []
    var isLoading = false
    var errorMessage: String?

    private let repository: RepoRepository

    init(repository: RepoRepository) {
        self.repository = repository
    }

    // 处理「意图」：视图只管喊「搜索」，怎么搜是 ViewModel 的事
    func search() async {
        let keyword = query.trimmingCharacters(in: .whitespaces)
        guard !keyword.isEmpty else { results = []; return }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            results = try await repository.search(keyword: keyword)
        } catch {
            errorMessage = "搜索失败：\\(error.localizedDescription)"
            results = []
        }
    }
}`

const viewSnippet = `struct SearchView: View {
    // @State 在视图里「持有」并管理 ViewModel 的生命周期
    @State private var vm: SearchViewModel

    // 通过初始化器把依赖（repository）传进来——这是依赖注入，下一章详谈
    init(repository: RepoRepository) {
        _vm = State(initialValue: SearchViewModel(repository: repository))
    }

    var body: some View {
        NavigationStack {
            List(vm.results) { repo in
                VStack(alignment: .leading) {
                    Text(repo.name).font(.headline)
                    Text(repo.description).font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            // @Observable 让 List 只在真正用到的属性变化时才刷新
            .overlay {
                if vm.isLoading { ProgressView() }
            }
            .overlay {
                if let msg = vm.errorMessage {
                    ContentUnavailableView("出错了", systemImage: "xmark", description: Text(msg))
                }
            }
            // .searchable 需要一个绑定（Binding）来双向同步输入框文本
            .searchable(text: $vm.query)
            .onSubmit(of: .search) {
                Task { await vm.search() }
            }
            .navigationTitle("仓库搜索")
        }
    }
}`

const bindableSnippet = `// 当你把 ViewModel 传给「子视图」并需要在子视图里双向绑定时，用 @Bindable
struct FilterPanel: View {
    // 注意：这里不是 @State（不负责创建/持有），而是 @Bindable（只借来做绑定）
    @Bindable var vm: SearchViewModel

    var body: some View {
        Toggle("只看有 Star 的", isOn: $vm.onlyStarred)   // $ 取得 Binding
        TextField("关键词", text: $vm.query)
    }
}

// 父视图把自己持有的 vm 传下去
struct ParentView: View {
    @State private var vm = SearchViewModel(repository: LiveRepoRepository())
    var body: some View {
        VStack {
            FilterPanel(vm: vm)         // 传值即可，@Bindable 在子视图侧声明
            SearchResultList(vm: vm)
        }
    }
}`

const testSnippet = `import Testing            // Swift Testing（也可用 XCTest）
@testable import MyApp

// ViewModel 不依赖任何 SwiftUI 视图，可以脱离 UI 直接测试
@MainActor
struct SearchViewModelTests {

    // 用一个假的 Repository 注入，让测试可控、可重复、不依赖网络
    final class FakeRepo: RepoRepository {
        var stubbed: [Repo] = []
        var shouldThrow = false
        func search(keyword: String) async throws -> [Repo] {
            if shouldThrow { throw URLError(.badServerResponse) }
            return stubbed
        }
    }

    @Test func 搜索成功时填充结果() async {
        let repo = FakeRepo()
        repo.stubbed = [Repo(id: 1, name: "swift", description: "lang")]
        let vm = SearchViewModel(repository: repo)

        vm.query = "swift"
        await vm.search()

        #expect(vm.results.count == 1)
        #expect(vm.isLoading == false)
        #expect(vm.errorMessage == nil)
    }

    @Test func 空关键词不触发请求() async {
        let vm = SearchViewModel(repository: FakeRepo())
        vm.query = "   "
        await vm.search()
        #expect(vm.results.isEmpty)
    }

    @Test func 失败时写入错误信息() async {
        let repo = FakeRepo(); repo.shouldThrow = true
        let vm = SearchViewModel(repository: repo)
        vm.query = "swift"
        await vm.search()
        #expect(vm.errorMessage != nil)
        #expect(vm.results.isEmpty)
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        当一个 SwiftUI 视图越写越长，<code>body</code> 里既要拼界面、又要发网络请求、还要处理错误和加载状态，
        它就变成了一团「什么都管」的乱麻——难读、难改、更几乎没法测试。这一章我们引入 MVVM 架构，
        把业务逻辑从视图里搬出去，并用 iOS 17 带来的全新 <code>@Observable</code> 宏写一个干净、可测试的
        ViewModel，最后落到一个完整的搜索列表实例上。
      </Lead>

      <h2>一、为什么要把逻辑从 View 里抽出来</h2>
      <p>
        SwiftUI 的视图是<strong>声明式</strong>的：<code>body</code> 描述「在当前状态下界面长什么样」。
        它最擅长、也应该只做一件事——<strong>把状态渲染成 UI</strong>。可现实里我们很容易往视图里塞进
        网络请求、数据解析、分页逻辑、表单校验、错误处理……结果就是一个几百行的 <code>View</code>，
        混杂着「长什么样」和「怎么算出来」两件本应分开的事。
      </p>
      <p>
        这样做的代价很具体：第一，<strong>难测试</strong>。业务逻辑和视图缠在一起，要验证「搜索失败时
        是否显示错误」，你几乎只能跑 UI 测试——慢、脆、还要起模拟器。第二，<strong>难复用</strong>。
        同一段逻辑想换一个界面展示，得连视图一起搬。第三，<strong>难协作</strong>。两个人改同一个巨型
        <code>body</code>，冲突频发。
      </p>
      <KeyIdea>
        分离关注点（Separation of Concerns）：<strong>View 只负责展示</strong>，
        <strong>状态与业务逻辑放进一个可独立运行、可独立测试的对象</strong>里。
        视图变薄、逻辑变纯，是 MVVM 想解决的核心问题。
      </KeyIdea>

      <h2>二、MVVM 的三个角色</h2>
      <p>
        MVVM = Model + View + ViewModel。它不是 Apple 强加的框架，而是一种<strong>分层约定</strong>，
        和 SwiftUI 的数据流天然契合。三个角色各司其职：
      </p>
      <table>
        <thead>
          <tr><th>角色</th><th>职责</th><th>不该做什么</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Model</strong></td>
            <td>纯数据与领域规则，例如 <code>struct Repo</code>、订单、用户。通常是值类型。</td>
            <td>不该知道 UI、不该知道有没有视图在看它。</td>
          </tr>
          <tr>
            <td><strong>View</strong></td>
            <td>声明式 UI。读取 ViewModel 暴露的状态来渲染，把用户操作转发成「意图」。</td>
            <td>不该写网络/数据库逻辑，不该做复杂计算与判断。</td>
          </tr>
          <tr>
            <td><strong>ViewModel</strong></td>
            <td>向视图<strong>暴露状态</strong>（results、isLoading…）并<strong>处理意图</strong>（search、refresh…），
            调用下层（Repository / Service）完成实际工作。</td>
            <td>不该 import SwiftUI、不该持有 <code>View</code>、不该直接碰 UIKit 控件。</td>
          </tr>
        </tbody>
      </table>
      <p>
        一句话记忆：<strong>Model 是「数据是什么」，View 是「怎么显示」，ViewModel 是「显示什么、操作怎么响应」</strong>。
        ViewModel 像一个翻译官，站在 View 和数据之间，把原始数据加工成「视图直接能用的状态」，
        再把视图发来的操作翻译成对数据层的调用。
      </p>

      <h2>三、单向数据流：状态向下，事件向上</h2>
      <p>
        SwiftUI 的世界遵循一个朴素而重要的规律——<strong>单向数据流</strong>：
      </p>
      <ul>
        <li><strong>状态向下流</strong>：ViewModel 持有「真相来源」（source of truth），视图读取它来渲染。</li>
        <li><strong>事件向上流</strong>：用户点按钮、输入文字，视图不自己处理，而是调用 ViewModel 的方法（发出「意图」）。</li>
        <li>ViewModel 处理意图后<strong>修改状态</strong>，状态变化又自动触发视图重绘——闭环形成。</li>
      </ul>
      <p>
        关键在于：视图<strong>从不直接改业务状态</strong>，它只「请求」ViewModel 去改。这条纪律让数据
        流向永远可预测——出了 bug，你知道状态只可能在 ViewModel 里被改动，排查范围一下子收窄了。
      </p>

      <h2>四、新旧两种写法：从 ObservableObject 到 @Observable</h2>
      <p>
        SwiftUI 早期（iOS 13~16）用 <strong>Combine</strong> 体系实现 ViewModel 的可观察性：类要遵循
        <code>ObservableObject</code> 协议，每个驱动 UI 的属性都要标 <code>@Published</code>，视图侧用
        <code>@StateObject</code> 创建、<code>@ObservedObject</code> 接收。能用，但有两个痛点。
      </p>
      <CodeBlock lang="swift" title="旧写法：ObservableObject + @Published + @StateObject" code={oldStyleSnippet} />
      <p>
        痛点一是<strong>样板代码多</strong>：每个属性都得记得加 <code>@Published</code>，漏一个就静默地不刷新。
        痛点二是<strong>刷新粒度粗</strong>：只要任意一个 <code>@Published</code> 变了，所有观察这个对象的
        视图都会被通知重算，哪怕它根本没用到那个属性。
      </p>
      <p>
        iOS 17 / Swift 5.9 引入了全新的 <strong>Observation 框架</strong>，用一个宏 <code>@Observable</code>
        一次性解决：你写普通存储属性即可，宏会在编译期自动织入追踪代码。而且它是<strong>按属性精确追踪</strong>的——
        视图<em>读了哪个属性</em>，就只在<em>那个属性</em>变化时刷新，性能更好。
      </p>
      <CodeBlock lang="swift" title="新写法：@Observable 宏 + @MainActor" code={observableSnippet} />
      <table>
        <thead>
          <tr><th>对比项</th><th>旧（ObservableObject）</th><th>新（@Observable）</th></tr>
        </thead>
        <tbody>
          <tr><td>可观察声明</td><td>遵循 <code>ObservableObject</code> 协议</td><td>类上加 <code>@Observable</code> 宏</td></tr>
          <tr><td>属性标注</td><td>每个属性手写 <code>@Published</code></td><td>普通存储属性，无需标注</td></tr>
          <tr><td>视图里创建</td><td><code>@StateObject</code></td><td><code>@State</code></td></tr>
          <tr><td>视图里接收</td><td><code>@ObservedObject</code></td><td>普通属性 / <code>@Bindable</code>（需绑定时）</td></tr>
          <tr><td>刷新粒度</td><td>对象级（任一属性变都通知）</td><td>属性级（用到才刷新）</td></tr>
          <tr><td>底层依赖</td><td>Combine</td><td>Observation 框架</td></tr>
          <tr><td>最低系统</td><td>iOS 13</td><td>iOS 17</td></tr>
        </tbody>
      </table>

      <h2>五、视图侧三件套：@State、@Bindable、$ 绑定</h2>
      <p>
        新体系下，视图持有 ViewModel 只用一个属性包装器——<code>@State</code>。注意这和过去的直觉不同：
        过去 <code>@State</code> 多用于值类型小状态，现在它<strong>同时承担了「持有并管理引用类型 ViewModel 生命周期」</strong>的角色
        （配合 <code>@Observable</code>）。
      </p>
      <CodeBlock lang="swift" title="视图用 @State 持有 ViewModel，$ 取绑定" code={viewSnippet} />
      <p>
        当需要在<strong>子视图</strong>里对 ViewModel 的属性做双向绑定（例如把 <code>vm.query</code> 接到
        <code>TextField</code>），子视图不应再用 <code>@State</code>（那会重新创建一个新实例），而要用
        <code>@Bindable</code>：它表示「我借用父级持有的这个对象，只为了对它取 <code>$</code> 绑定」。
      </p>
      <CodeBlock lang="swift" title="子视图用 @Bindable 做双向绑定" code={bindableSnippet} />
      <Callout variant="tip" title="一句话区分三个包装器">
        <strong>@State</strong>：我创建并持有这个 ViewModel（生命周期归我管）。
        <strong>@Bindable</strong>：我借来一个已有的 ViewModel，只为对它取 <code>$</code> 绑定。
        普通属性：我只读它来展示，不需要绑定。
      </Callout>

      <h2>六、@MainActor 与 async：线程安全的状态更新</h2>
      <p>
        UI 必须在<strong>主线程</strong>更新，这是 iOS 的铁律。ViewModel 既要被视图读取（主线程），
        又常常要发起耗时的异步工作（网络、磁盘）。我们的做法是：给整个 ViewModel 类标
        <code>@MainActor</code>，让它的所有方法与属性默认运行在主线程；内部用 <code>async/await</code>
        调用 Repository——<code>await</code> 期间会自动切到后台执行 I/O，结果回来后又自动切回主线程，
        于是给 <code>results</code> 赋值这一步天然在主线程完成，安全且无需手动 <code>DispatchQueue.main</code>。
      </p>
      <Example title="一次搜索的数据流">
        <p>
          1) 用户在搜索框输入并回车 → 视图调用 <code>{'Task { await vm.search() }'}</code>（事件向上）。
        </p>
        <p>
          2) ViewModel 置 <code>isLoading = true</code> → 视图自动显示 <code>ProgressView</code>（状态向下）。
        </p>
        <p>
          3) <code>await repository.search(...)</code> 在后台跑网络，回来后给 <code>results</code> 赋值（已在主线程）。
        </p>
        <p>
          4) <code>defer</code> 把 <code>isLoading</code> 置回 <code>false</code> → 加载圈消失，列表刷新出结果。
        </p>
      </Example>
      <Callout variant="warn" title="ViewModel 不要 import SwiftUI">
        一个健康的 ViewModel 只 import <code>Foundation</code> / <code>Observation</code>，<strong>不 import SwiftUI</strong>。
        一旦它开始引用 <code>Color</code>、<code>View</code> 这类 UI 类型，就说明 UI 关注点又渗进来了，
        也会让单元测试被迫连带 UI 框架。把「展示用什么颜色」留给视图，ViewModel 只暴露「是否出错」这种语义状态。
      </Callout>

      <h2>七、ViewModel 怎么测：纯逻辑，脱离 UI</h2>
      <p>
        MVVM 最大的回报就在这里。因为 ViewModel 不依赖任何视图，我们可以在测试里<strong>直接构造它、
        设置输入、调用方法、断言它暴露的状态</strong>，全程不起模拟器、不渲染 UI。要做到可测，关键是
        ViewModel 的依赖（这里是 <code>RepoRepository</code>）必须能被替换成一个「假」实现——这正是下一章
        依赖注入的主题，这里先用它把测试跑起来。
      </p>
      <CodeBlock lang="swift" title="用 Swift Testing 直接测 ViewModel" code={testSnippet} />
      <p>
        注意这几个测试覆盖了三类典型分支：成功填充、空输入短路、失败写错误信息。它们运行<strong>毫秒级</strong>、
        稳定可重复，因为 <code>FakeRepo</code> 完全可控——不依赖网络，也就没有 flaky。这种「逻辑可单测」的
        体验，是把逻辑留在视图里时根本拿不到的。
      </p>

      <h2>八、常见误区与边界</h2>
      <ul>
        <li>
          <strong>不是所有视图都需要 ViewModel。</strong>一个只显示静态文案、或只读外部传入数据的小视图，
          强行配 ViewModel 是过度设计。MVVM 用在「有状态 + 有逻辑」的屏幕上才划算。
        </li>
        <li>
          <strong>别把 ViewModel 写成上帝对象。</strong>一个 ViewModel 对应一个屏幕 / 一块功能即可；
          逻辑过多时把数据访问下沉到 Repository、把可复用规则抽成纯函数。
        </li>
        <li>
          <strong>@Observable 需要 iOS 17+。</strong>若要兼容 iOS 16 及更早，仍需用 <code>ObservableObject</code>
          那套；两者思想一致，迁移主要是替换属性包装器。
        </li>
        <li>
          <strong>@State 持有的 ViewModel 在视图重建时不会被重复创建</strong>——SwiftUI 会保留它，这正是
          用 <code>@State</code> 而非每次新建的原因。
        </li>
      </ul>

      <Callout variant="tip">
        下一章我们解决本章留下的尾巴：ViewModel 里的 <code>repository</code> 到底从哪来、怎么传，
        如何用<strong>依赖注入</strong>让它在生产环境接真实实现、在测试里接 mock，
        以及如何用 Swift Package 把功能拆成模块。
      </Callout>

      <Summary
        points={[
          'MVVM 的目的是分离关注点：View 只负责声明式展示，状态与业务逻辑放进可独立测试的 ViewModel。',
          'Model 是数据、View 是 UI、ViewModel 暴露状态并处理意图；ViewModel 不应 import SwiftUI 或持有视图。',
          '数据流是单向的：状态向下（视图读 ViewModel 渲染），事件向上（视图调用 ViewModel 方法发出意图）。',
          'iOS 17 用 @Observable 宏取代 ObservableObject/@Published，按属性精确追踪刷新；视图用 @State 持有、@Bindable 做绑定。',
          'ViewModel 标 @MainActor 保证 UI 更新在主线程，内部用 async/await 调 Repository，避免手动切线程。',
          '因为 ViewModel 不依赖 UI，可直接构造它、设置输入、断言状态来写毫秒级、稳定的单元测试（依赖需可替换，见下一章）。',
        ]}
      />
    </article>
  )
}
