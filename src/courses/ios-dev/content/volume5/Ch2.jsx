import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const navBasic = `import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationStack {                    // 取代旧的 NavigationView
            List {
                NavigationLink("设置", value: "settings")
                NavigationLink("关于", value: "about")
            }
            .navigationTitle("首页")
            .navigationDestination(for: String.self) { key in
                // 根据被点击的 value 决定跳转到哪个页面
                DetailView(name: key)
            }
        }
    }
}`

const pathDriven = `struct AppNavigator: View {
    @State private var path: [Route] = []     // 用数组持有整条导航栈

    var body: some View {
        NavigationStack(path: $path) {          // 把 path 绑定给栈
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .profile(let id): ProfileView(userID: id)
                    case .settings:        SettingsView()
                    }
                }
        }
    }
}

enum Route: Hashable {                          // 路由必须可哈希
    case profile(id: Int)
    case settings
}`

const programmatic = `Button("打开我的资料") {
    path.append(.profile(id: 42))      // 编程式跳转：往栈里压一个路由
}

Button("回到首页") {
    path.removeAll()                   // 一键弹回根视图
}

Button("返回上一页") {
    path.removeLast()                  // 弹出栈顶
}

// 深链：从一个 URL 解析出多级路由，一次性还原整条栈
func openDeepLink() {
    path = [.settings, .profile(id: 7)]   // 直接定位到 设置 → 资料(7)
}`

const observableModel = `import Observation

@Observable                          // 新的 Observation 宏，标注模型类
final class CartModel {
    var items: [String] = []         // 普通存储属性即可，无需 @Published
    var couponApplied = false

    var count: Int { items.count }   // 计算属性也会被自动追踪

    func add(_ item: String) {
        items.append(item)
    }
}`

const observableUse = `struct ShopApp: View {
    @State private var cart = CartModel()    // 用 @State 持有 @Observable 模型

    var body: some View {
        NavigationStack {
            ProductList()
                .environment(cart)            // 通过 environment 注入，跨层共享
        }
    }
}

struct ProductList: View {
    @Environment(CartModel.self) private var cart   // 从环境读取共享模型

    var body: some View {
        VStack {
            Text("购物车：\\(cart.count) 件")          // 自动随 count 变化刷新
            Button("加入牛奶") { cart.add("牛奶") }
        }
    }
}`

const bindableUse = `struct CouponEditor: View {
    @Bindable var cart: CartModel        // 子视图需要双向绑定 @Observable 的属性时

    var body: some View {
        Toggle("使用优惠券", isOn: $cart.couponApplied)   // $ 取得绑定
    }
}`

const sheetModal = `struct LibraryView: View {
    @State private var showAdd = false
    @State private var showOnboarding = false

    var body: some View {
        VStack {
            Button("添加") { showAdd = true }
            Button("引导") { showOnboarding = true }
        }
        .sheet(isPresented: $showAdd) {              // 半屏卡片，可下滑关闭
            AddItemView()
        }
        .fullScreenCover(isPresented: $showOnboarding) {  // 全屏覆盖，需手动关
            OnboardingView()
        }
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        一个真实 App 不止有页面，还要在页面间<strong>跳转</strong>，并在不同页面之间
        <strong>共享数据</strong>。这一章讲两件大事：用 <code>NavigationStack</code> 做导航
        （包括最有威力的「数据驱动 / 编程式导航」与深链），以及用 iOS 17 引入的全新
        <strong>Observation 框架</strong>（<code>@Observable</code> / <code>@Bindable</code> /
        <code>@Environment</code>）做跨视图状态共享。最后我们对照新旧 API，讲清这次范式升级到底变了什么。
      </Lead>

      <h2>一、NavigationStack：新一代导航容器</h2>
      <p>
        iOS 16 起，<code>NavigationStack</code> 正式取代了旧的 <code>NavigationView</code>。
        旧 API 的导航状态藏在一堆 <code>NavigationLink</code> 的 <code>isActive</code> 布尔值里，
        难以编程控制、也难做深链。新的 <code>NavigationStack</code> 把整条导航栈抽象成一个
        <strong>可绑定的路径（path）</strong>，让导航第一次变得「数据驱动、可被代码完全掌控」。
      </p>
      <CodeBlock lang="swift" title="NavigationStack + NavigationLink + navigationDestination" code={navBasic} />
      <p>
        新写法的关键是<strong>「值 + 目的地」分离</strong>：<code>NavigationLink</code> 不再直接写死目标视图，
        而是携带一个 <code>value</code>；真正「这个值对应哪个页面」由 <code>.navigationDestination(for:)</code>
        统一声明。这样一来，所有跳转目标集中管理，也为编程式导航打下基础。
      </p>

      <h2>二、数据驱动 / 编程式导航与深链</h2>
      <KeyIdea>
        给 <code>NavigationStack(path: $path)</code> 绑定一个数组，这个数组<strong>就是</strong>当前的导航栈：
        往里 <code>append</code> 一个路由 = 前进一页，<code>removeLast</code> = 返回，<code>removeAll</code> = 回到根。
        导航从此不再依赖用户点击，而是「修改数据 → 界面自动同步」。
      </KeyIdea>
      <p>
        实战中常把路由定义成一个遵循 <code>Hashable</code> 的 <code>enum</code>，每个 case 代表一类目的地，
        还能携带参数（如用户 id）。<code>.navigationDestination(for: Route.self)</code> 里用
        <code>switch</code> 把每种路由映射到对应视图。
      </p>
      <CodeBlock lang="swift" title="用 path 绑定做数据驱动导航" code={pathDriven} />
      <CodeBlock lang="swift" title="编程式跳转与深链" code={programmatic} />
      <p>
        <strong>深链（deep link）</strong>的本质就是：从一个外部 URL 或通知里解析出多级路由，
        然后<strong>一次性给 path 赋一个数组</strong>，界面便会直接还原出整条栈——比如打开 App
        就停在「设置 → 我的资料」这一深处页面，无需用户逐级点进去。这是旧 <code>NavigationView</code>
        几乎做不到的事。
      </p>
      <Example title="编程式导航能干什么">
        <p>登录成功后自动跳进主页、支付完成后跳到订单详情、收到推送后直达对应聊天——这些
        「由逻辑而非点击触发的跳转」，都是往 <code>path</code> 里追加路由实现的。</p>
      </Example>

      <h3>toolbar：给导航栏放按钮</h3>
      <p>
        <code>.toolbar</code> 修饰符用来往导航栏 / 底部栏放置按钮、标题等内容，并用
        <code>ToolbarItem</code> 的 <code>placement</code> 指定位置（如
        <code>.topBarTrailing</code> 放右上角）。它和 <code>navigationTitle</code> 一起，构成了页面顶部的标准配置。
      </p>

      <h2>三、Observation 框架：新的跨视图状态共享</h2>
      <p>
        iOS 17 带来了全新的 <strong>Observation 框架</strong>，用一个 <code>@Observable</code> 宏
        重写了「可观察对象」的玩法，目标是替换啰嗦的 <code>ObservableObject</code> + <code>@Published</code> 组合。
        新方案不仅写得更短，性能也更好——它能做到<strong>属性级别的精确追踪</strong>：视图只在它<em>真正读到</em>
        的那个属性变化时才刷新，而不是对象任意属性一变就全量重渲染。
      </p>
      <CodeBlock lang="swift" title="用 @Observable 标注模型类" code={observableModel} />
      <p>
        对比旧写法：以前你要让类遵循 <code>ObservableObject</code>，再给每个需要触发刷新的属性加
        <code>@Published</code>。现在只需在类上加一个 <code>@Observable</code>，里面写<strong>普通存储属性</strong>即可，
        连计算属性也会被自动纳入追踪。
      </p>

      <h3>三个搭档：@State 持有、@Environment 注入、@Bindable 绑定</h3>
      <KeyIdea>
        新框架下记住三句话：在<strong>拥有者</strong>视图里用 <code>@State</code> 持有
        <code>@Observable</code> 模型实例；要<strong>跨层共享</strong>就用 <code>.environment(model)</code> 注入、
        子视图用 <code>@Environment(Model.self)</code> 读取；当子视图要<strong>双向绑定</strong>模型的属性
        （拿 <code>$</code> 绑定给 <code>Toggle</code>/<code>TextField</code>）时，用 <code>@Bindable</code>。
      </KeyIdea>
      <CodeBlock lang="swift" title="@State 持有 + @Environment 注入与读取" code={observableUse} />
      <p>
        注意持有方式的变化：在旧 API 里你要用 <code>@StateObject</code> 来持有
        <code>ObservableObject</code>；新框架里 <code>@Observable</code> 模型统一用普通的
        <code>@State</code> 持有即可，概念被大大简化了。注入侧，旧的
        <code>@EnvironmentObject</code> 被 <code>@Environment(Model.self)</code> 取代。
      </p>
      <CodeBlock lang="swift" title="@Bindable：子视图双向绑定模型属性" code={bindableUse} />
      <Callout variant="warn" title="@Environment 读取前必须先注入">
        用 <code>@Environment(CartModel.self)</code> 读取共享模型时，祖先视图必须已经用
        <code>.environment(cart)</code> 注入过同类型实例，否则运行时会崩溃。这一点和旧的
        <code>@EnvironmentObject</code> 一样：忘了注入 = 闪退。
      </Callout>

      <h2>四、新旧 API 对照表</h2>
      <table>
        <thead>
          <tr><th>作用</th><th>旧 API（iOS 13–16）</th><th>新 API（iOS 17+）</th></tr>
        </thead>
        <tbody>
          <tr><td>导航容器</td><td><code>NavigationView</code></td><td><code>NavigationStack</code></td></tr>
          <tr><td>编程式导航</td><td><code>NavigationLink(isActive:)</code> 一堆布尔</td><td>绑定 <code>path</code> 数组，append/remove</td></tr>
          <tr><td>跳转目标声明</td><td>链接里写死目标视图</td><td><code>.navigationDestination(for:)</code></td></tr>
          <tr><td>可观察模型</td><td><code>class: ObservableObject</code> + <code>@Published</code></td><td><code>@Observable</code> 宏，普通属性</td></tr>
          <tr><td>持有模型</td><td><code>@StateObject</code></td><td><code>@State</code></td></tr>
          <tr><td>观察外部传入的模型</td><td><code>@ObservedObject</code></td><td>直接持有，或 <code>@Bindable</code> 取绑定</td></tr>
          <tr><td>跨层注入 / 读取</td><td><code>@EnvironmentObject</code></td><td><code>.environment(_:)</code> + <code>@Environment(Type.self)</code></td></tr>
          <tr><td>刷新粒度</td><td>对象任意属性变即全量刷新</td><td>属性级精确追踪，只刷新真正读到的</td></tr>
        </tbody>
      </table>

      <h2>五、模态呈现：sheet 与 fullScreenCover</h2>
      <p>
        除了把页面压进导航栈，另一类常见交互是<strong>模态弹出</strong>。<code>.sheet</code> 弹出一张
        半屏卡片，用户可以下滑关闭，适合「临时的、可随手取消」的任务（新建、筛选、分享）；
        <code>.fullScreenCover</code> 弹出全屏覆盖层，不能下滑关闭、必须由代码主动收起，适合
        登录、开屏引导等「必须走完流程」的场景。两者都用一个 <code>isPresented</code> 布尔绑定来控制显隐。
      </p>
      <CodeBlock lang="swift" title="sheet 与 fullScreenCover" code={sheetModal} />
      <Callout variant="tip">
        选型口诀：<strong>可随手取消的临时任务用 sheet，必须完成的强制流程用 fullScreenCover</strong>。
        sheet 还支持 <code>presentationDetents</code> 设置半高 / 全高的停靠点，做出抽屉式的高度调节。
      </Callout>

      <h2>六、边界与易错点</h2>
      <p>
        几条提醒：① 路由 <code>enum</code> 必须 <code>Hashable</code>，否则无法作为
        <code>navigationDestination(for:)</code> 的类型；② <code>@Environment</code> 读取前祖先必须注入，
        否则崩溃；③ <code>@Observable</code> 模型用 <code>@State</code> 持有，别再习惯性写
        <code>@StateObject</code>（那是旧框架的）；④ 只有需要把模型属性<strong>双向绑定</strong>给控件时才用
        <code>@Bindable</code>，只读展示用普通访问即可；⑤ 新 Observation 框架需要 iOS 17+，
        若要兼容更老系统仍得用 <code>ObservableObject</code> 一套。
      </p>

      <Summary
        points={[
          'NavigationStack 取代 NavigationView：用可绑定的 path 把整条导航栈抽象成数据，导航变得可编程、可深链。',
          'NavigationLink 携带 value，由 navigationDestination(for:) 统一声明「值对应哪个页面」，跳转目标集中管理。',
          '数据驱动导航：path 数组就是栈，append 前进、removeLast 返回、removeAll 回根；深链就是一次性给 path 赋多级路由。',
          'Observation 框架：用 @Observable 宏标注模型类，写普通属性即可，自动做属性级精确追踪，性能更好。',
          '三搭档：@State 持有模型，@Environment 跨层注入/读取，@Bindable 给子视图做双向绑定；对应旧的 @StateObject / @EnvironmentObject / @ObservedObject。',
          'sheet 是可下滑取消的半屏卡片，fullScreenCover 是必须代码关闭的全屏覆盖；二者均用 isPresented 布尔控制显隐。',
        ]}
      />
    </article>
  )
}
