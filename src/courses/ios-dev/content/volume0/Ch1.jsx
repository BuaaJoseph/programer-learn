import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const layerSnippet = `// 一个普通的 SwiftUI 视图，背后牵动了整条苹果技术栈
import SwiftUI

struct GreetingView: View {
    var body: some View {
        Text("你好，iOS")        // Cocoa Touch / SwiftUI 层
            .font(.title)         // 核心服务层提供的排版能力
            .padding()            // 最终由 Darwin/XNU 调度 GPU 渲染上屏
    }
}`

const lifecycleSnippet = `import SwiftUI

@main
struct DemoApp: App {
    // 监听 App 在「前台 / 非活跃 / 后台」之间的切换
    @Environment(\\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .active:
                print("进入前台：可交互，开始刷新数据")
            case .inactive:
                print("非活跃：正在切换，暂停高频任务")
            case .background:
                print("进入后台：保存状态，准备被挂起")
            @unknown default:
                break
            }
        }
    }
}`

const sandboxSnippet = `import Foundation

// App 只能读写自己沙盒内的目录，越界访问会失败
let docs = FileManager.default.urls(
    for: .documentDirectory,
    in: .userDomainMask
).first!

let fileURL = docs.appendingPathComponent("notes.txt")
try "沙盒内的数据".write(to: fileURL, atomically: true, encoding: .utf8)

// 想访问相册、相机、定位等系统资源，必须先申请权限
// 并在 Info.plist 里写明用途说明（Privacy - ... Usage Description）`

const uikitVsSwiftUISnippet = `// UIKit：命令式——你一步步「告诉」系统怎么改界面
let label = UILabel()
label.text = "计数：0"
view.addSubview(label)
// 数据变了，要手动找到 label 再赋值
label.text = "计数：\\(count)"

// SwiftUI：声明式——你「描述」界面长什么样，框架负责同步
struct CounterView: View {
    @State private var count = 0
    var body: some View {
        // count 一变，这段描述自动重新求值并刷新界面
        Text("计数：\\(count)")
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        要写 iOS App，先得知道你站在一座多高的塔上。从你写下的一行 SwiftUI 代码，到屏幕上真正亮起的像素，
        中间隔着好几层苹果用了几十年打磨的技术栈。这一章不写代码教学，而是带你俯瞰整个苹果开发生态：
        系统怎么分层、App 在系统里如何被管控与调度、Swift 和 Objective-C 的恩怨、UIKit 与 SwiftUI 的取舍，
        以及成为一名 iOS 开发者你到底需要准备什么。
      </Lead>

      <h2>一、苹果开发栈：从内核到你的 App</h2>
      <p>
        苹果的操作系统不是一整块铁板，而是清晰的<strong>分层架构</strong>。下层为上层提供能力、隐藏复杂度，
        你写 App 时几乎只和最上面一两层打交道，但了解底下有什么，能帮你理解「为什么 App 不能随便读别人的文件」
        「为什么界面卡顿要去优化主线程」这类问题。
      </p>
      <h3>第一层：Darwin 与 XNU 内核</h3>
      <p>
        最底下是 <strong>Darwin</strong>——苹果的开源操作系统基础，其核心是 <strong>XNU 内核</strong>
        （X is Not Unix）。它管的是最硬核的事：进程调度、内存管理、文件系统、设备驱动、网络协议栈。
        iOS、iPadOS、macOS、watchOS、tvOS 共享同一套 Darwin 基座，这也是为什么苹果各平台能高度协同——
        它们本质上是同一个家族。
      </p>
      <h3>第二层：核心服务（Core Services）</h3>
      <p>
        往上是一批 C / Swift 写成的底层框架，提供与界面无关的基础能力：<code>Foundation</code>
        （字符串、集合、日期、文件、网络请求）、<code>Core Data</code> / <code>SwiftData</code>（持久化）、
        <code>Core Location</code>（定位）、<code>Core Graphics</code>（2D 绘图）等。它们是「业务逻辑」赖以生存的土壤。
      </p>
      <h3>第三层：Cocoa Touch / 应用框架</h3>
      <p>
        再往上是直接面向 App 界面的层，历史上叫 <strong>Cocoa Touch</strong>，包含 <code>UIKit</code>
        （iOS 经典 UI 框架）以及现代的 <code>SwiftUI</code>。它们负责按钮、列表、导航、动画、手势这些用户能看见摸到的东西。
      </p>
      <h3>第四层：你的 App</h3>
      <p>
        最顶上才是你写的代码。一行 <code>Text("你好")</code> 看似简单，它依赖 SwiftUI，
        SwiftUI 依赖核心服务做排版与绘图，最终由 Darwin/XNU 调度 GPU 把像素送上屏幕。
      </p>
      <CodeBlock lang="swift" title="一行视图，背后是整条技术栈" code={layerSnippet} />

      <KeyIdea>
        苹果系统是<strong>分层</strong>的：Darwin/XNU 内核 → 核心服务（Foundation 等）→ Cocoa Touch（UIKit / SwiftUI）→ 你的 App。
        你日常只碰最上面两层，但下层决定了 App 的能力边界与约束（比如沙盒、权限、主线程渲染）。
      </KeyIdea>

      <table>
        <thead>
          <tr><th>层级</th><th>代表框架 / 组件</th><th>负责什么</th></tr>
        </thead>
        <tbody>
          <tr><td>你的 App</td><td>你写的 Swift 代码</td><td>业务逻辑与界面描述</td></tr>
          <tr><td>Cocoa Touch / UI 层</td><td>UIKit、SwiftUI</td><td>控件、布局、动画、手势</td></tr>
          <tr><td>核心服务</td><td>Foundation、Core Data、Core Location</td><td>数据、网络、持久化、定位</td></tr>
          <tr><td>内核</td><td>Darwin / XNU</td><td>进程、内存、文件、驱动</td></tr>
        </tbody>
      </table>

      <h2>二、App 沙盒与权限模型</h2>
      <p>
        在 iOS 上，每个 App 都被关进一个<strong>沙盒（sandbox）</strong>——一块属于自己的独立目录与受限运行环境。
        App 默认只能读写自己沙盒里的文件，看不见也碰不到别的 App 的数据。这是 iOS 安全与隐私的基石：
        即便某个 App 被攻破，破坏也被限制在它自己的小盒子里。
      </p>
      <CodeBlock lang="swift" title="沙盒内读写文件" code={sandboxSnippet} />
      <p>
        要访问沙盒之外的系统资源——相册、相机、麦克风、通讯录、定位、通知——必须走<strong>权限模型</strong>：
        运行时弹窗向用户申请授权，且你得在工程的 <code>Info.plist</code> 里写明<strong>用途说明字符串</strong>
        （形如 <code>Privacy - Camera Usage Description</code>）。少了这段说明，App 一访问就会崩溃，上架也会被拒。
      </p>
      <Callout variant="note" title="沙盒不是限制，是契约">
        沙盒和权限弹窗常被新手当成「麻烦」，但它们是苹果对用户的隐私承诺。理解它，你才知道为什么有些功能
        「不是写不出来，而是系统不让随便用」，以及为什么权限要在恰当时机、配合清晰文案去申请。
      </Callout>

      <h2>三、App 生命周期：前台、后台与挂起</h2>
      <p>
        手机不像桌面，内存与电量都金贵。系统会主动管控每个 App 的运行状态，你的 App 随时可能被切到后台、
        被挂起、甚至被回收。理解生命周期，才能在正确的时机保存数据、暂停任务、释放资源。
      </p>
      <ul>
        <li><strong>前台活跃（active）</strong>：App 在屏幕上且可交互，正常响应用户操作。</li>
        <li><strong>非活跃（inactive）</strong>：短暂过渡态，比如来电话、下拉通知中心，App 还在前台但不接收事件。</li>
        <li><strong>后台（background）</strong>：用户切走了，App 还在内存里短暂运行，应尽快保存状态、收尾任务。</li>
        <li><strong>挂起（suspended）</strong>：留在内存但不再执行代码，系统内存紧张时可随时把它清掉。</li>
      </ul>
      <p>
        在 SwiftUI 里，最常用的生命周期感知方式是环境值 <code>scenePhase</code>。下面演示如何监听这些切换：
      </p>
      <CodeBlock lang="swift" title="用 scenePhase 感知前台 / 后台切换" code={lifecycleSnippet} />
      <Callout variant="warn" title="后台时间很短">
        App 进入后台后，系统只给很有限的时间收尾。别指望在后台长时间跑任务——那需要专门的后台模式 API，
        且受系统严格限制。把「保存用户数据、记录当前状态」这类关键动作放在进入后台的回调里立即完成。
      </Callout>

      <h2>四、UIKit 与 SwiftUI：命令式 vs 声明式</h2>
      <p>
        iOS 开发的 UI 框架有两套，理解它们的关系是入门的关键一课。
      </p>
      <h3>UIKit：成熟的命令式框架</h3>
      <p>
        <code>UIKit</code> 自 2008 年随 iPhone SDK 诞生，是<strong>命令式（imperative）</strong>的：
        你一步步「指挥」系统——创建一个控件、把它加到视图、数据变了再手动找到它去更新。
        它极其成熟、生态庞大、能精细控制每个像素，几乎所有老项目和复杂定制场景都靠它。
      </p>
      <h3>SwiftUI：现代的声明式框架</h3>
      <p>
        <code>SwiftUI</code> 是苹果 2019 年推出的<strong>声明式（declarative）</strong>框架：
        你只「描述」界面在某个状态下应该长什么样，状态一变，框架自动重新求值并刷新界面，
        你不再手动操作控件。它语法简洁、自带实时预览，而且<strong>一套代码可跨苹果全平台</strong>
        （iOS / iPadOS / macOS / watchOS / tvOS）。这正是本课程选它作为主线的原因。
      </p>
      <CodeBlock lang="swift" title="同一个计数器：命令式 vs 声明式" code={uikitVsSwiftUISnippet} />
      <p>
        二者并非互斥。SwiftUI 可以用 <code>UIViewRepresentable</code> 嵌入 UIKit 视图，
        UIKit 也能用 <code>UIHostingController</code> 承载 SwiftUI 视图。现实项目里两者常常共存：
        新功能用 SwiftUI 写，遗留与高度定制的部分继续用 UIKit。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>UIKit</th><th>SwiftUI</th></tr>
        </thead>
        <tbody>
          <tr><td>范式</td><td>命令式（手动更新）</td><td>声明式（状态驱动）</td></tr>
          <tr><td>诞生</td><td>2008</td><td>2019</td></tr>
          <tr><td>代码量</td><td>较多，样板代码多</td><td>简洁，状态绑定自动同步</td></tr>
          <tr><td>跨平台</td><td>主要 iOS / iPadOS</td><td>iOS / iPadOS / macOS / watchOS / tvOS 一套通吃</td></tr>
          <tr><td>实时预览</td><td>较弱</td><td>原生支持 Xcode Preview</td></tr>
          <tr><td>成熟度 / 控制力</td><td>极成熟，控制极细</td><td>快速迭代中，少数边角仍需借 UIKit</td></tr>
          <tr><td>适合</td><td>遗留项目、复杂定制</td><td>新项目、跨平台、快速开发</td></tr>
        </tbody>
      </table>

      <h2>五、Swift 与 Objective-C：一段语言更替史</h2>
      <p>
        在 Swift 之前，苹果平台的开发语言是 <strong>Objective-C</strong>（简称 OC）。它诞生于 1980 年代，
        给 C 加上了 Smalltalk 风格的面向对象消息机制，方括号语法 <code>[obj doSomething]</code> 是它的标志。
        OC 强大但语法古老、容易出空指针等内存安全问题，学习曲线陡。
      </p>
      <p>
        <strong>2014 年</strong>，苹果在 WWDC 发布了全新语言 <strong>Swift</strong>——现代、安全、简洁，
        自带可选类型（Optional）从语言层面对付空值、强类型推断、值类型优先、内存自动管理（ARC）。
        此后十余年，Swift 一路<strong>逐步取代 Objective-C</strong>：新 API、新框架（包括 SwiftUI、SwiftData）
        都以 Swift 为中心，OC 退居维护遗留代码的角色。今天入门 iOS，<strong>学 Swift 就够了</strong>，
        OC 只需在维护老项目时按需了解。
      </p>
      <Callout variant="tip" title="为什么本课程只讲 Swift">
        Swift 是苹果当下与未来的主语言，SwiftUI 又是纯 Swift 的现代框架。从零起步直接学 Swift + SwiftUI，
        是 2026 年最高效的路径。等你需要读懂某段老代码时，再回头补 Objective-C 不迟。
      </Callout>

      <h2>六、苹果生态全貌与开发门槛</h2>
      <p>
        iOS 开发不是孤立的，它处在一整个生态里。理解这张全貌，能帮你规划学习与上架之路。
      </p>
      <ul>
        <li><strong>多平台</strong>：iOS（iPhone）、iPadOS（iPad）、macOS（Mac）、watchOS（Apple Watch）、tvOS（Apple TV）。SwiftUI 让一套技能横跨它们。</li>
        <li><strong>App Store</strong>：iOS App 的唯一官方分发渠道，上架需通过苹果的审核（功能、隐私、合规）。</li>
        <li><strong>你需要一台 Mac</strong>：官方开发工具 Xcode 只能在 macOS 上运行，这是 iOS 开发硬性的入场券。</li>
        <li><strong>开发者账号</strong>：在模拟器上学习与调试免费；但要把 App 装到真机长期运行、或上架 App Store，需要付费的 Apple Developer Program 账号（每年订阅制）。</li>
      </ul>
      <Callout variant="note" title="入门期的最低配置">
        起步阶段你只需要一台能装最新 Xcode 的 Mac。模拟器足以学完本课程的大部分内容，
        真机调试与上架可以等你做出像样的 App 之后再投入开发者账号。
      </Callout>

      <h2>七、小结：你站在哪里，要往哪走</h2>
      <p>
        这一章我们没写一行可运行的 App，但搭好了认知地图：你知道了系统怎么分层、App 被沙盒与生命周期如何管控、
        两套 UI 框架如何取舍、该学哪门语言、以及成为开发者的现实门槛。下一章起，我们就打开 Xcode，
        从零做出第一个能在屏幕上跑起来的 SwiftUI App。
      </p>

      <Summary
        points={[
          '苹果系统分层：Darwin/XNU 内核 → 核心服务（Foundation 等）→ Cocoa Touch（UIKit / SwiftUI）→ 你的 App；下层决定上层的能力与约束。',
          'App 被关进沙盒，默认只能读写自己的目录；访问相机 / 定位等系统资源需运行时申请权限并在 Info.plist 写明用途说明。',
          'App 生命周期有前台活跃 / 非活跃 / 后台 / 挂起等状态，SwiftUI 用 scenePhase 感知切换，进入后台要立即保存状态。',
          'UIKit 是成熟的命令式框架（2008），SwiftUI 是现代声明式框架（2019）且跨苹果全平台；二者可互相嵌入、现实中常共存。',
          'Swift 于 2014 年发布，现代、安全、简洁，逐步取代 Objective-C；今天入门只需学 Swift + SwiftUI。',
          '苹果生态含 iOS/iPadOS/macOS/watchOS/tvOS 与 App Store；开发必须有 Mac（跑 Xcode），上架真机需付费的开发者账号。',
        ]}
      />
    </article>
  )
}
