import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const stackBasics = `import SwiftUI

struct StackDemo: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {   // 纵向：从上到下
            Text("标题").font(.title)
            Text("副标题").foregroundStyle(.secondary)

            HStack(spacing: 8) {                       // 横向：从左到右
                Image(systemName: "star.fill")
                Text("4.8")
                Spacer()                               // 把后面的内容推到最右
                Text("查看全部")
            }
        }
        .padding()
    }
}`

const zstackDemo = `struct Badge: View {
    var body: some View {
        ZStack(alignment: .topTrailing) {   // 沿 z 轴层叠，后写的在上层
            Image(systemName: "bell.fill")
                .font(.largeTitle)

            Text("3")                        // 红色角标叠在铃铛右上角
                .font(.caption2)
                .padding(5)
                .background(.red, in: Circle())
                .foregroundStyle(.white)
        }
    }
}`

const alignmentDemo = `// alignment 决定子视图在交叉轴上如何对齐
VStack(alignment: .leading) {   // 子视图统一靠左
    Text("短")
    Text("长一点的一行文字")
}

HStack(alignment: .top) {       // 子视图统一靠顶
    Text("A").font(.largeTitle)
    Text("B").font(.caption)
}

// Divider 在 Stack 里画一条分隔线，方向随 Stack 自动旋转
VStack {
    Text("上半区")
    Divider()
    Text("下半区")
}`

const modifierOrder = `// 顺序 A：先加内边距，再上背景 —— 背景把"内容 + padding"一起包住
Text("Hello")
    .padding()
    .background(.yellow)     // 黄色块较大，含 padding

// 顺序 B：先上背景，再加内边距 —— 背景只裹住文字，padding 在背景外
Text("Hello")
    .background(.yellow)     // 黄色块紧贴文字，外面才是 padding
    .padding()`

const frameDemo = `Text("固定宽高")
    .frame(width: 200, height: 80)          // 提议一个固定尺寸
    .background(.blue.opacity(0.2))

Text("撑满可用宽度")
    .frame(maxWidth: .infinity)             // 尽量占满父给的宽度
    .background(.green.opacity(0.2))

Text("带对齐的 frame")
    .frame(width: 200, height: 80, alignment: .topLeading)
    .background(.orange.opacity(0.2))       // 内容靠左上`

const geometryReader = `GeometryReader { proxy in
    // proxy.size 给出父分配给本视图的可用尺寸
    Text("宽度的一半")
        .frame(width: proxy.size.width / 2)
        .background(.mint)
}`

const listOnDelete = `import SwiftUI

struct Task: Identifiable {           // List/ForEach 需要稳定身份
    let id = UUID()
    var title: String
    var done: Bool = false
}

struct TaskListView: View {
    @State private var tasks: [Task] = [
        Task(title: "买菜"),
        Task(title: "写周报"),
        Task(title: "健身"),
    ]

    var body: some View {
        List {
            Section("今天") {
                ForEach(tasks) { task in           // 闭包参数 task
                    HStack {
                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                        Text(task.title)
                    }
                }
                .onDelete { offsets in             // 左滑删除，回调给出下标集合
                    tasks.remove(atOffsets: offsets)
                }
            }
        }
    }
}`

const listExtras = `struct InboxView: View {
    @State private var query = ""
    @State private var mails: [String] = ["发票", "周报", "面试邀请"]

    var filtered: [String] {
        query.isEmpty ? mails : mails.filter { $0.contains(query) }
    }

    var body: some View {
        List(filtered, id: \\.self) { mail in
            Text(mail)
        }
        .searchable(text: $query)              // 顶部搜索框
        .refreshable {                          // 下拉刷新（async）
            await reload()
        }
    }

    func reload() async { /* 拉取新数据 */ }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        SwiftUI 的界面是「拼」出来的：你不去手算每个控件的坐标，而是把视图放进
        <strong>布局容器</strong>里，告诉系统「它们该横着排、竖着排、还是叠在一起」，
        剩下的尺寸协商交给框架。这一章我们讲透三大 Stack、Spacer 与 Divider、修饰符
        （Modifier）以及它顺序敏感的坑，最后落到 SwiftUI 里最重要的高性能容器——
        <strong>List</strong>，并写一个带左滑删除、搜索、下拉刷新的可运行例子。
      </Lead>

      <h2>一、布局体系：三种 Stack 是骨架</h2>
      <p>
        SwiftUI 的布局基石是三个容器：<code>VStack</code>（纵向，从上到下）、
        <code>HStack</code>（横向，从左到右）、<code>ZStack</code>（沿 z 轴层叠，后写的盖在上层）。
        几乎任何复杂界面，都是这三者层层嵌套的结果。它们都接收两个常用参数：
        <code>alignment</code>（交叉轴对齐方式）和 <code>spacing</code>（子视图间距）。
      </p>
      <CodeBlock lang="swift" title="VStack / HStack 基础" code={stackBasics} />
      <p>
        注意 <code>alignment</code> 管的是<strong>交叉轴</strong>：<code>VStack</code> 的主轴是纵向，
        所以它的 <code>alignment</code> 控制子视图左右怎么对齐（<code>.leading</code> /
        <code>.center</code> / <code>.trailing</code>）；<code>HStack</code> 主轴是横向，
        它的 <code>alignment</code> 控制上下怎么对齐（<code>.top</code> / <code>.center</code> /
        <code>.bottom</code> / <code>.firstTextBaseline</code>）。
      </p>

      <h3>ZStack：层叠出角标、遮罩、卡片背景</h3>
      <p>
        <code>ZStack</code> 让视图沿垂直屏幕的方向堆叠，常用来做角标、半透明遮罩、给卡片铺底色。
        它的 <code>alignment</code> 是二维的，比如 <code>.topTrailing</code> 表示子视图统一对齐到右上角。
      </p>
      <CodeBlock lang="swift" title="ZStack 做红点角标" code={zstackDemo} />

      <h3>Spacer 与 Divider：撑开与切分</h3>
      <p>
        <code>Spacer</code> 是一个「会膨胀的弹簧」：它尽可能占据主轴上的剩余空间，从而把其他视图
        推开。在 <code>HStack</code> 里放一个 <code>Spacer</code>，就能让左右两组内容分居两端；
        放两个，则把内容挤到中间。<code>Divider</code> 则在 Stack 里画一条分隔线，方向随所在
        Stack 自动旋转——在 <code>VStack</code> 里是水平线，在 <code>HStack</code> 里是竖线。
      </p>
      <CodeBlock lang="swift" title="alignment、Divider 用法" code={alignmentDemo} />

      <Example title="一句话理解三种 Stack">
        <p>把控件想成积木：<code>VStack</code> 是「叠罗汉」，<code>HStack</code> 是「手拉手排队」，
        <code>ZStack</code> 是「贴纸盖在海报上」。复杂界面 = 这三种积木反复嵌套。</p>
      </Example>

      <h2>二、布局协商：父子之间的「三步对话」</h2>
      <KeyIdea>
        SwiftUI 的尺寸不是父强加给子的，而是一场协商：<strong>父视图给子视图一个建议尺寸 →
        子视图根据自身内容自己决定要多大 → 父视图拿到子的实际尺寸后，再决定把它放在哪里</strong>。
        理解这「提议—决定—放置」三步，是看懂一切布局行为的钥匙。
      </KeyIdea>
      <p>
        举例：<code>Text</code> 拿到父给的建议宽度后，会按内容算出自己「刚好够用」的尺寸；而
        <code>Color</code> 或 <code>Rectangle</code> 这类形状则倾向于「父给多少我占多少」。
        这就是为什么一段文字默认只占自己那么大，而一个色块会铺满——它们对「建议尺寸」的态度不同。
      </p>

      <h2>三、修饰符（Modifier）：链式描述视图</h2>
      <p>
        修饰符是 SwiftUI 描述外观与行为的方式：你在视图后面用点语法链式调用
        <code>.padding()</code>、<code>.background(...)</code>、<code>.frame(...)</code>、
        <code>.font(...)</code> 等。关键认知是——<strong>每个修饰符都返回一个「包裹了原视图的新视图」</strong>，
        而不是在原地修改。所以一条修饰符链，本质是从内到外一层层套娃。
      </p>
      <CodeBlock lang="swift" title="frame 与对齐" code={frameDemo} />

      <Callout variant="warn" title="修饰符顺序会改变结果">
        因为每个修饰符都「包裹」前一个，所以<strong>顺序不同，结果就不同</strong>。最经典的坑是
        <code>.padding()</code> 与 <code>.background(...)</code> 的先后：先 padding 再 background，
        背景会把内边距一起染色；反过来，背景只裹住内容，padding 留在背景之外。
      </Callout>
      <CodeBlock lang="swift" title="顺序对照：padding 与 background" code={modifierOrder} />
      <table>
        <thead>
          <tr><th>写法</th><th>效果</th></tr>
        </thead>
        <tbody>
          <tr><td><code>.padding().background()</code></td><td>背景较大，把内容 + 内边距一起填色</td></tr>
          <tr><td><code>.background().padding()</code></td><td>背景紧贴内容，内边距留在背景外（透明）</td></tr>
          <tr><td><code>.frame().background()</code></td><td>背景填满整个 frame 区域</td></tr>
          <tr><td><code>.background().frame()</code></td><td>背景只填内容，frame 多出的空间不上色</td></tr>
        </tbody>
      </table>

      <h3>Layout 协议与 GeometryReader（了解即可）</h3>
      <p>
        当三大 Stack 不够用时，iOS 16+ 提供了自定义 <code>Layout</code> 协议（可实现流式布局等），
        而 <code>GeometryReader</code> 则让你读到父分配的<strong>实际可用尺寸</strong>，按比例做布局——
        但它会「贪婪」地占满空间，应谨慎、局部地使用，不要用它包整个页面。
      </p>
      <CodeBlock lang="swift" title="GeometryReader 读取可用尺寸" code={geometryReader} />

      <h2>四、List：高性能列表容器</h2>
      <p>
        当你要展示一长串数据时，不要用 <code>ScrollView</code> + <code>VStack</code> 硬堆——那会一次性
        创建所有行，列表一长就卡。正确做法是 <code>List</code>：它底层基于
        <strong>行复用（cell reuse）</strong>机制，只渲染屏幕上可见的行，滑出去的行会被回收复用，
        因此能流畅承载成千上万条数据。这是 SwiftUI 里做列表的首选。
      </p>
      <KeyIdea>
        <code>List</code> + <code>ForEach</code> 是黄金搭档。<code>ForEach</code> 要求每个元素有
        <strong>稳定且唯一的身份</strong>：要么数据类型遵循 <code>Identifiable</code>（提供 <code>id</code>），
        要么显式用 <code>id:</code> 参数指定。有了稳定身份，SwiftUI 才能正确地复用行、计算插入 /
        删除 / 移动的动画。
      </KeyIdea>

      <h3>ForEach + Identifiable + Section + 滑动删除</h3>
      <p>
        下面是一个可运行的待办列表：模型 <code>Task</code> 遵循 <code>Identifiable</code>，
        <code>ForEach</code> 遍历它生成行，<code>Section</code> 把行分组并带标题，
        <code>.onDelete</code> 提供左滑删除——它的回调参数是被删除行的下标集合
        （<code>IndexSet</code>），配合数组的 <code>remove(atOffsets:)</code> 即可。
      </p>
      <CodeBlock lang="swift" title="List + ForEach + Section + onDelete（可运行）" code={listOnDelete} />
      <p>
        这里 <code>.onDelete</code> 挂在 <code>ForEach</code> 上而不是 <code>List</code> 上，这一点很重要：
        删除操作针对的是「这一组被遍历的数据」，所以由 <code>ForEach</code> 来声明。闭包参数
        <code>offsets</code> 是一个下标集合（可能一次删多行），交给 <code>remove(atOffsets:)</code> 处理。
      </p>

      <h3>searchable 与 refreshable</h3>
      <p>
        现代 List 还内建两个开箱即用的能力：<code>.searchable(text:)</code> 在导航栏下方挂一个搜索框，
        你只需把它绑定到一个 <code>@State</code> 字符串，再用该字符串过滤数据源；
        <code>.refreshable</code> 提供原生的下拉刷新，它的闭包是 <code>async</code> 的，
        系统会自动显示加载指示器，直到你的异步任务完成。
      </p>
      <CodeBlock lang="swift" title="searchable + refreshable" code={listExtras} />
      <Callout variant="tip">
        当数组元素本身不是 <code>Identifiable</code>（比如就是一串 <code>String</code>），可以用
        <code>id: \.self</code> 把元素自身当作身份——前提是元素<strong>唯一且可哈希</strong>。
        一旦有重复值，行的身份就会混乱，导致动画与复用出错。
      </Callout>

      <h2>五、边界与易错点</h2>
      <p>
        几条实战经验：① <code>ForEach</code> 的身份一定要稳定，用数组下标当 id 在增删时会出乱子；
        ② <code>GeometryReader</code> 会撑满父空间，别拿它包整页；③ 修饰符顺序敏感，遇到「背景大小不对」
        先回头看是不是 padding/background 写反了；④ 大数据量坚决用 <code>List</code> 而非
        <code>ScrollView</code> + <code>VStack</code>；⑤ <code>Spacer</code> 在没有约束的容器里可能不生效，
        要确认它所在的 Stack 在主轴方向上有可分配的空间。
      </p>

      <Summary
        points={[
          '三大布局容器：VStack（纵向）、HStack（横向）、ZStack（层叠），用 alignment 控交叉轴对齐、spacing 控间距，复杂界面靠它们嵌套。',
          'Spacer 是会膨胀的弹簧（把视图推开），Divider 在 Stack 里画分隔线（方向随 Stack 旋转）。',
          'SwiftUI 布局是三步协商：父给建议尺寸 → 子自己决定大小 → 父再放置子视图。',
          '修饰符链式且顺序敏感：每个修饰符都返回包裹原视图的新视图，padding 与 background 的先后会改变填色范围。',
          'Layout 协议可做自定义布局，GeometryReader 能读父分配的可用尺寸但会贪婪占满，应局部使用。',
          'List 靠行复用做到高性能，搭配 ForEach + Identifiable（或 id:）；Section 分组、onDelete 滑动删除、refreshable 下拉刷新、searchable 搜索均开箱即用。',
        ]}
      />
    </article>
  )
}
