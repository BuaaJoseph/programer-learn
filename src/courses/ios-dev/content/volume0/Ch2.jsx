import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const appEntrySnippet = `import SwiftUI

// @main 标记整个 App 的入口，有且只有一个
@main
struct HelloWorldApp: App {
    // body 返回的是 Scene，不是 View
    var body: some Scene {
        // WindowGroup 是最常用的场景：管理一组可展示内容的窗口
        WindowGroup {
            ContentView()   // 窗口里放置的根视图
        }
    }
}`

const contentViewSnippet = `import SwiftUI

struct ContentView: View {
    // @State 让视图持有可变状态，状态一变界面自动刷新
    @State private var count = 0

    // body 描述「这个视图长什么样」，类型是 some View
    var body: some View {
        VStack(spacing: 16) {
            Text("你好，SwiftUI")
                .font(.largeTitle)
                .bold()

            Text("你已经点击了 \\(count) 次")
                .foregroundStyle(.secondary)

            Button("点我 +1") {
                count += 1          // 改状态，无需手动刷新界面
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}`

const previewSnippet = `import SwiftUI

struct ContentView: View {
    @State private var count = 0
    var body: some View {
        VStack(spacing: 16) {
            Text("你好，SwiftUI").font(.largeTitle).bold()
            Text("你已经点击了 \\(count) 次")
            Button("点我 +1") { count += 1 }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

// #Preview 宏：让 Xcode 右侧画布实时渲染这个视图
#Preview {
    ContentView()
}`

const spmSnippet = `// Package.swift 里声明依赖（库作者视角）
// dependencies: [
//     .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0")
// ]

// 在 App 工程里更常用图形界面添加：
// File > Add Package Dependencies… > 粘贴仓库 URL > 选版本规则
// 添加后，直接 import 即可使用
import Alamofire

AF.request("https://api.example.com/data").responseDecodable(of: Item.self) { resp in
    print(resp.value as Any)
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们俯瞰了整个苹果生态，这一章正式动手。我们会拆开 Xcode 工程的骨架——它由哪些文件和概念组成、
        各管什么；学会用 Swift Package Manager 引入第三方库；然后从 <code>@main</code> 入口一路写到第一个
        SwiftUI 视图，用 Xcode 的实时预览看着它成型，最后送进模拟器跑起来。读完你将拥有一个能交互的、
        真正可运行的 App，并理解「代码如何变成屏幕上的画面」这条链路。
      </Lead>

      <h2>一、Xcode 是什么</h2>
      <p>
        <strong>Xcode</strong> 是苹果官方的集成开发环境（IDE），写代码、设计界面、管理资源、编译、调试、
        跑模拟器、上传 App Store，全在这一个工具里完成。它只能在 macOS 上运行，是 iOS 开发的必备工具，
        可在 Mac App Store 免费下载。
      </p>
      <Callout variant="tip" title="创建工程的起手式">
        打开 Xcode，选 <code>File &gt; New &gt; Project</code>，平台选 iOS、模板选 App，
        Interface 选 <strong>SwiftUI</strong>、Language 选 <strong>Swift</strong>。
        填好产品名，Xcode 就会替你生成一个能直接运行的最小工程。
      </Callout>

      <h2>二、工程结构：那些文件都是干嘛的</h2>
      <p>
        新建工程后，左侧导航器里会出现一堆文件和概念。它们各司其职，理解了你才不会「不敢乱动」。
      </p>
      <h3>.xcodeproj：工程文件</h3>
      <p>
        以 <code>.xcodeproj</code> 结尾的就是工程本体——它记录了有哪些源文件、编译设置、依赖、目标等全部信息。
        你平时双击它来打开整个项目。注意它其实是个「包」，里面藏着配置，一般不要手动改内部文件。
      </p>
      <h3>Target（目标）</h3>
      <p>
        一个 <strong>Target</strong> 描述「要构建出的一个产物」——比如你的主 App、一个测试包、一个 Widget 扩展。
        它定义了用哪些源文件、什么编译选项、最低支持的系统版本等。一个工程可以有多个 Target。
      </p>
      <h3>Info.plist：App 的配置清单</h3>
      <p>
        <code>Info.plist</code> 是一份属性列表，记录 App 的元信息：显示名、版本号、支持的方向、
        以及上一章提到的<strong>各项隐私权限的用途说明</strong>。新版 Xcode 把许多配置搬进了 Target 的
        Info 标签页，但概念不变——它就是 App 的「身份证 + 声明表」。
      </p>
      <h3>Assets.xcassets：资源目录</h3>
      <p>
        图片、App 图标、颜色、启动画面等资源放在 <code>Assets</code> 资源目录里。它帮你管理不同分辨率
        （@2x / @3x）和明暗模式的变体，代码里用名字就能取用，无需关心具体文件。
      </p>
      <h3>Scheme：构建与运行方案</h3>
      <p>
        <strong>Scheme</strong> 定义「点运行按钮时到底干什么」——构建哪个 Target、用 Debug 还是 Release 配置、
        跑在哪个设备 / 模拟器上。顶部工具栏选的就是它。调试和发布常用不同 Scheme / 配置。
      </p>
      <table>
        <thead>
          <tr><th>概念</th><th>是什么</th><th>你常做的事</th></tr>
        </thead>
        <tbody>
          <tr><td>.xcodeproj</td><td>工程本体，记录全部设置</td><td>双击打开项目</td></tr>
          <tr><td>Target</td><td>一个要构建的产物</td><td>设最低系统版本、签名</td></tr>
          <tr><td>Info.plist</td><td>App 元信息与权限说明</td><td>填权限用途、版本号</td></tr>
          <tr><td>Assets.xcassets</td><td>图片 / 图标 / 颜色资源</td><td>拖入图片、配 App 图标</td></tr>
          <tr><td>Scheme</td><td>构建 + 运行方案</td><td>选目标设备、Debug/Release</td></tr>
        </tbody>
      </table>

      <h2>三、用 Swift Package Manager 管理依赖</h2>
      <p>
        几乎没有 App 是从零造所有轮子的，你会想引入网络、图片加载、JSON 解析等第三方库。苹果官方的依赖管理工具是
        <strong>Swift Package Manager（SPM）</strong>，已内置在 Xcode 里，无需额外安装。
      </p>
      <p>
        在 App 工程里添加依赖最直接的方式是图形界面：菜单 <code>File &gt; Add Package Dependencies…</code>，
        粘贴库的 Git 仓库地址，选好版本规则（比如「5.9.0 及以上的兼容版本」），Xcode 自动下载并接进工程。
        之后直接 <code>import</code> 就能用。
      </p>
      <CodeBlock lang="swift" title="用 SPM 引入并使用依赖" code={spmSnippet} />
      <Callout variant="note" title="版本规则别选太松">
        SPM 用语义化版本控制依赖范围。生产项目里建议锁定到「兼容的次要版本」而非「任意最新」，
        避免某天库作者发了破坏性更新，你的工程突然编译不过。
      </Callout>

      <h2>四、App 入口：@main、App 与 Scene</h2>
      <p>
        SwiftUI App 的启动入口是一个标了 <code>@main</code> 的结构体，它遵循 <code>App</code> 协议。
        整个程序<strong>有且只有一个</strong> <code>@main</code>，它告诉系统「从这里开始」。
      </p>
      <KeyIdea>
        入口结构体的 <code>body</code> 返回的是 <strong>Scene</strong>（场景），不是 View。
        最常用的场景是 <code>WindowGroup</code>——它管理一组承载内容的窗口，里面再放你的根视图。
        记住这条层级：<strong>App → Scene（WindowGroup）→ View（ContentView）</strong>。
      </KeyIdea>
      <CodeBlock lang="swift" title="@main App 入口" code={appEntrySnippet} />
      <p>
        为什么要分 Scene 和 View 两层？因为同一个 App 在 iPad 上可以开多个窗口、在 Mac 上有菜单栏，
        Scene 这一层正是用来描述「窗口 / 场景级别」的结构，而 View 描述窗口内部的具体界面。
        在 iPhone 上你通常只用一个 <code>WindowGroup</code>，但这层抽象为跨平台留好了余地。
      </p>

      <h2>五、写第一个 SwiftUI 视图</h2>
      <p>
        视图是 SwiftUI 的基本积木。一个视图就是一个遵循 <code>View</code> 协议的结构体，
        它必须提供一个 <code>body</code> 属性来描述自己长什么样。<code>body</code> 的返回类型写作
        <code>{'some View'}</code>——意思是「某种具体的 View 类型，由编译器推断」。
      </p>
      <p>
        下面这个 <code>ContentView</code> 用 <code>VStack</code>（纵向堆叠）排了两个 <code>Text</code> 和一个
        <code>Button</code>，并用 <code>@State</code> 持有一个计数：
      </p>
      <CodeBlock lang="swift" title="ContentView：第一个可交互视图" code={contentViewSnippet} />
      <Example title="为什么点按钮界面就变了">
        <p>
          关键在 <code>@State private var count</code> 和 <code>{'Button("点我 +1") { count += 1 }'}</code>。
          按钮闭包里只是简单地 <code>count += 1</code>，并没有任何「去更新那行文字」的代码。
        </p>
        <p>
          这正是<strong>声明式</strong>的魔法：SwiftUI 发现被 <code>@State</code> 标记的 <code>count</code> 变了，
          就自动重新求值整个 <code>body</code>，<code>{'Text("你已经点击了 \\(count) 次")'}</code> 随之刷新。
          你只管改数据，界面同步交给框架。
        </p>
      </Example>
      <Callout variant="warn" title="body 不能有副作用">
        <code>body</code> 可能被框架频繁、反复地求值，它应当是「根据当前状态描述界面」的纯函数。
        别在 <code>body</code> 里发网络请求、改全局状态或做其它副作用，那会导致难以预料的行为。
      </Callout>

      <h2>六、Xcode Preview：边写边看</h2>
      <p>
        SwiftUI 最爽的体验是<strong>实时预览</strong>。用 <code>#Preview</code> 宏包住一个视图，
        Xcode 右侧的画布就会实时渲染它——你改一行代码，预览几乎立刻更新，无需每次都编译进模拟器，
        极大加快了调界面的节奏。
      </p>
      <CodeBlock lang="swift" title="用 #Preview 开启实时预览" code={previewSnippet} />
      <p>
        预览不只是静态截图：你可以在画布里直接点按钮、滚动列表、切换明暗模式与设备尺寸，
        像用真 App 一样交互。它本质上是把这个视图单独跑了起来，因此能反映真实的状态变化。
      </p>
      <Callout variant="tip" title="预览卡住了怎么办">
        预览偶尔会因为代码改动而暂停或报错，点画布上的刷新 / 恢复按钮重新构建即可。
        预览出问题不代表 App 跑不起来，二者是独立的两条路径。
      </Callout>

      <h2>七、从代码到屏幕：完整链路</h2>
      <p>
        把这一章串起来，看一个 App 从你按下运行键到画面亮起，中间发生了什么：
      </p>
      <ul>
        <li><strong>1. 选 Scheme 与设备</strong>：在工具栏选好目标（某个模拟器或真机）。</li>
        <li><strong>2. 编译</strong>：Xcode 用 Swift 编译器把你的源码编译成机器码，链接依赖与资源，打包成 App。</li>
        <li><strong>3. 安装与启动</strong>：把 App 装到模拟器 / 真机，系统找到 <code>@main</code> 入口启动它。</li>
        <li><strong>4. 构建场景</strong>：入口的 <code>WindowGroup</code> 创建窗口，实例化根视图 <code>ContentView</code>。</li>
        <li><strong>5. 渲染上屏</strong>：SwiftUI 求值 <code>body</code>，交给底层（核心服务 / 内核）调度 GPU，把像素画到屏幕。</li>
        <li><strong>6. 交互循环</strong>：你点按钮 → 改 <code>@State</code> → SwiftUI 重新求值 body → 界面刷新，如此往复。</li>
      </ul>
      <p>
        模拟器是 Mac 上的一个 iOS 虚拟设备，适合日常开发调试；要体验真实性能、传感器、相机等，
        还得连真机运行（这需要上一章提到的开发者账号来签名）。
      </p>

      <h2>八、小结</h2>
      <p>
        你已经认识了 Xcode 工程的每个零件、学会了用 SPM 引依赖、从 <code>@main</code> 入口写到第一个
        交互式 SwiftUI 视图、并理解了预览与运行链路。这是后续一切的地基。下一卷起，我们将深入 Swift 语言本身，
        把视图里那些 <code>@State</code>、闭包、类型推断讲透。
      </p>

      <Summary
        points={[
          'Xcode 是苹果官方 IDE（仅限 macOS）：写码、设计、编译、调试、跑模拟器、上架一站式完成。',
          '工程骨架：.xcodeproj（工程本体）、Target（构建产物）、Info.plist（元信息与权限说明）、Assets（资源）、Scheme（构建运行方案）。',
          'Swift Package Manager 已内置 Xcode，用 File > Add Package Dependencies 粘贴仓库 URL 即可引依赖，版本规则别选太松。',
          'App 入口是唯一的 @main 结构体，body 返回 Scene（常用 WindowGroup）；层级是 App → Scene → View。',
          '视图是遵循 View 协议的结构体，必须有 body（类型 some View）；@State 持有可变状态，状态一变界面自动刷新，body 不能有副作用。',
          '#Preview 宏开启 Xcode 实时可交互预览；运行链路为 选设备 → 编译 → 安装启动 → 构建场景 → 渲染上屏 → 交互循环。',
        ]}
      />
    </article>
  )
}
