import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const minimalView = `import SwiftUI

// 一个 View 就是一个遵循 View 协议的 struct（值类型）
struct GreetingView: View {
    // body 是计算属性，返回这个视图「长什么样」
    var body: some View {
        Text("你好，SwiftUI")
            .font(.title)
            .foregroundStyle(.blue)
    }
}`

const protocolShape = `// SwiftUI 框架里 View 协议大致长这样（简化）
protocol View {
    // 关联类型：body 的具体类型由你实现时决定
    associatedtype Body: View
    // 唯一要求：提供一个描述界面的 body
    @ViewBuilder var body: Self.Body { get }
}`

const basicViews = `struct BasicsView: View {
    var body: some View {
        VStack(spacing: 12) {            // 竖向排列容器
            Text("标题")                  // 文本
                .font(.headline)
            Image(systemName: "star.fill") // 系统图标
                .foregroundStyle(.yellow)
            HStack {                      // 横向排列容器
                Text("左")
                Spacer()                  // 弹性占位，把两端推开
                Text("右")
            }
            Button("点我") {              // 按钮：标题 + 点击闭包
                print("tapped")
            }
        }
        .padding()
    }
}`

const modifierChain = `// 每个修饰符都返回一个「包了一层」的新视图，可链式叠加
Text("修饰符是链式的")
    .font(.title2)            // 返回 ModifiedContent<Text, ...>
    .foregroundStyle(.white) // 又包一层
    .padding(12)             // 再包一层
    .background(.blue)       // 顺序有讲究：先 padding 再 background
    .clipShape(RoundedRectangle(cornerRadius: 8))`

const composeChild = `// 把界面拆成可复用的小视图，再组合成大视图
struct Avatar: View {
    let systemName: String
    var body: some View {
        Image(systemName: systemName)
            .font(.largeTitle)
            .foregroundStyle(.teal)
    }
}

struct UserRow: View {
    let name: String
    let subtitle: String
    var body: some View {
        HStack(spacing: 12) {
            Avatar(systemName: "person.crop.circle")  // 复用子视图
            VStack(alignment: .leading) {
                Text(name).font(.headline)
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct UserList: View {
    var body: some View {
        VStack(alignment: .leading) {
            UserRow(name: "小杜", subtitle: "iOS 学习中")   // 组合
            UserRow(name: "小李", subtitle: "SwiftUI 入门")
        }
        .padding()
    }
}`

const uikitImperative = `// UIKit：命令式——你亲手创建控件、设置属性、addSubview、还要管约束
final class UserRowView: UIView {
    private let avatar = UIImageView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()

    init(name: String, subtitle: String) {
        super.init(frame: .zero)
        avatar.image = UIImage(systemName: "person.crop.circle")
        titleLabel.text = name
        subtitleLabel.text = subtitle
        subtitleLabel.textColor = .secondaryLabel

        let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        stack.axis = .vertical
        let row = UIStackView(arrangedSubviews: [avatar, stack])
        row.axis = .horizontal
        row.spacing = 12
        addSubview(row)                       // 手动挂载
        row.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([         // 手动写约束
            row.topAnchor.constraint(equalTo: topAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor),
            row.leadingAnchor.constraint(equalTo: leadingAnchor),
            row.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
    }
    required init?(coder: NSCoder) { fatalError() }
}`

const viewBuilderSnippet = `// VStack 的初始化器大致是这样：content 被标了 @ViewBuilder
// 所以花括号里能直接「列出」多个视图，由 ViewBuilder 拼成一个整体
VStack {
    Text("第一行")
    Text("第二行")   // 不用逗号、不用数组，ViewBuilder 帮你打包
    if showHint {    // 甚至能写有限的 if
        Text("提示")
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        SwiftUI 是一套<strong>声明式</strong>的界面框架：你不再一步步告诉系统「先创建这个控件、
        再把它加到那个父视图、然后设置约束」，而是直接<strong>描述</strong>「界面应该长成什么样」，
        剩下的渲染与更新交给框架。这一章我们从最根基的 <code>View</code> 协议讲起：它是什么、
        <code>body</code> 为什么是计算属性、为什么用组合而非继承拼界面、声明式与命令式到底差在哪，
        以及 <code>some View</code> 和 <code>@ViewBuilder</code> 这两个一上来就会撞见的概念。
      </Lead>

      <h2>一、View 是「描述界面的值」，不是控件对象</h2>
      <KeyIdea>
        在 SwiftUI 里，一个视图就是一个遵循 <code>View</code> 协议的 <strong>struct（值类型）</strong>。
        它不是一个长期存在、你拿着引用去改的控件对象，而是一份<strong>对界面的描述</strong>——
        框架读这份描述去渲染屏幕。界面要变，就产生一份新的描述，而不是去「修改」旧控件。
      </KeyIdea>
      <p>
        这是和 UIKit 最根本的世界观差异。UIKit 里 <code>UILabel</code>、<code>UIButton</code>
        都是 <strong>class（引用类型）</strong>的对象，活在内存里，你保存它的引用，之后随时
        <code>label.text = "新值"</code> 去改它。SwiftUI 的 <code>Text</code>、<code>Button</code>
        则是<strong>轻量的值</strong>：每次 <code>body</code> 被计算，都会重新生成它们。
        你几乎从不持有某个视图的引用去「改」它——你改的是<strong>状态</strong>，框架据此重算视图描述。
      </p>
      <CodeBlock lang="swift" title="最小的一个 View" code={minimalView} />
      <p>
        上面 <code>GreetingView</code> 是个 struct，遵循 <code>View</code>。它唯一的「内容」就是
        一个名叫 <code>body</code> 的计算属性。注意 <code>Text("...")</code> 后面跟着一串
        <code>.font(...)</code>、<code>.foregroundStyle(...)</code>——这些是修饰符，后面会讲。
      </p>

      <h2>二、body：返回视图树的计算属性</h2>
      <p>
        <code>View</code> 协议其实只对你提一个要求：实现一个 <code>body</code>。它是
        <strong>计算属性</strong>（用 <code>var</code> + 花括号，没有存储值），每次被访问都会
        <strong>重新求值</strong>，返回一棵「视图树」——也就是由各种子视图嵌套组合出的描述。
      </p>
      <CodeBlock lang="swift" title="View 协议的形状（简化）" code={protocolShape} />
      <p>
        这里有个关键点要记住：<strong>body 会被反复调用</strong>。当状态变化时，框架就是靠重新读取
        <code>body</code> 拿到新描述，再和旧描述做 diff，算出屏幕上最小的改动。所以 <code>body</code>
        里<strong>不要做有副作用的重活</strong>（网络请求、写文件），它应当是「给定当前状态、纯粹地算出界面长什么样」。
        这正是那句口号的含义：<code>{'UI = f(state)'}</code>，界面是状态的函数。
      </p>
      <Callout variant="warn" title="body 不是「只算一次」">
        初学者常以为 <code>body</code> 像构造函数一样只跑一次。恰恰相反，它可能在一次交互里被算很多次。
        把它当成<strong>纯函数</strong>对待：只读状态、只产出视图，别在里面藏计数器自增、发请求这类副作用。
      </Callout>

      <h2>三、常用基础视图</h2>
      <p>
        SwiftUI 内置了一批「积木」视图，绝大多数界面都是它们拼出来的。先认识最常用的几个：
      </p>
      <table>
        <thead>
          <tr><th>视图</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Text</code></td><td>显示一段文字</td></tr>
          <tr><td><code>Image</code></td><td>显示图片；<code>Image(systemName:)</code> 用系统 SF Symbols 图标</td></tr>
          <tr><td><code>Button</code></td><td>按钮：一个标题/标签 + 一段点击时执行的闭包</td></tr>
          <tr><td><code>VStack</code></td><td>把子视图<strong>竖直</strong>排列的容器</td></tr>
          <tr><td><code>HStack</code></td><td>把子视图<strong>水平</strong>排列的容器</td></tr>
          <tr><td><code>Spacer</code></td><td>弹性占位，把同一栈里的视图推向两端</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="swift" title="用基础视图拼一个小界面" code={basicViews} />
      <p>
        注意 <code>Button("点我") {'{ ... }'}</code> 里的花括号是一个<strong>闭包</strong>，是点击时才执行的动作。
        <code>VStack</code> 和 <code>HStack</code> 的花括号里则直接「列出」了若干子视图——这能成立要归功于
        后面讲的 <code>@ViewBuilder</code>。
      </p>

      <h2>四、修饰符：返回新视图的链式调用</h2>
      <KeyIdea>
        修饰符（modifier）如 <code>.font(...)</code>、<code>.padding(...)</code> 不是「就地改这个视图」，
        而是<strong>包一层、返回一个新视图</strong>。所以它们能像管道一样链式串起来，每一节都在外面再裹一层。
      </KeyIdea>
      <CodeBlock lang="swift" title="修饰符是链式的，且顺序有意义" code={modifierChain} />
      <p>
        因为每个修饰符都「往外包一层」，<strong>顺序会影响结果</strong>。先 <code>.padding()</code> 再
        <code>.background(.blue)</code>，蓝色会铺满包含内边距的范围；反过来先 <code>.background</code>
        再 <code>.padding</code>，背景只贴着文字、外面那圈留白就没颜色了。把它想成「一层层往外套盒子」，
        套的次序自然决定最终样子。
      </p>
      <Callout variant="tip" title="链式 ≠ 命令式">
        别被链式语法骗了——它和 UIKit 的 <code>label.font = ...; label.backgroundColor = ...</code>
        本质不同。后者在<strong>修改同一个对象</strong>；SwiftUI 每一步都在<strong>产出一个新值</strong>，
        旧值原封不动。这正是值类型 + 声明式的体现。
      </Callout>

      <h2>五、组合而非继承：把界面拆成小视图再拼起来</h2>
      <p>
        UIKit 里扩展界面常靠<strong>继承</strong>（自定义一个 <code>UIView</code> 子类）。SwiftUI 走的是另一条路：
        <strong>组合</strong>。你写一堆职责单一的小视图，再像搭积木一样把它们嵌进更大的视图里。
        小视图便于复用、便于单独预览、便于各自管自己那一小块状态。
      </p>
      <CodeBlock lang="swift" title="声明式：拆成可复用子视图再组合" code={composeChild} />
      <p>
        看 <code>UserList</code>：它没有「创建 UserRow、再 add 进去」，而是直接在 <code>body</code> 里
        <strong>声明</strong>「这里有两行 UserRow」。每个 <code>UserRow</code> 又声明它由一个 <code>Avatar</code>
        和两段 <code>Text</code> 组成。整棵树是「描述」，不是「一连串创建与挂载的指令」。
      </p>

      <h2>六、声明式 vs 命令式：和 UIKit 正面对照</h2>
      <p>
        同样是渲染一行用户信息，UIKit 的命令式写法要你<strong>亲手</strong>走完每一步：new 出控件、
        设置属性、塞进 <code>UIStackView</code>、<code>addSubview</code>、再写一串 Auto Layout 约束。
        而且数据变了，你还得记得手动回去更新对应控件。
      </p>
      <CodeBlock lang="swift" title="UIKit：命令式（对照前面的 SwiftUI 版）" code={uikitImperative} />
      <table>
        <thead>
          <tr><th>维度</th><th>命令式（UIKit）</th><th>声明式（SwiftUI）</th></tr>
        </thead>
        <tbody>
          <tr><td>你写的内容</td><td>一步步「怎么做」：创建、挂载、布局</td><td>「长什么样」：描述结果</td></tr>
          <tr><td>视图本体</td><td>class 对象，长期持有</td><td>struct 值，随时重算</td></tr>
          <tr><td>数据变化时</td><td>手动找到控件去更新</td><td>改状态，框架自动刷新</td></tr>
          <tr><td>布局</td><td>常需手写 Auto Layout 约束</td><td>栈 + 修饰符自动排布</td></tr>
          <tr><td>复用方式</td><td>继承 / 自定义子类为主</td><td>组合小视图为主</td></tr>
        </tbody>
      </table>
      <Example title="一句话抓住差别">
        <p>
          命令式：「拿到那个 label，把它的文字改成新值。」——你对控件下指令。
        </p>
        <p>
          声明式：「这个位置的文字<strong>等于</strong>这个状态。」——状态一变，界面自己跟上，
          你从头到尾没碰过任何控件对象。
        </p>
      </Example>

      <h2>七、some View：不透明返回类型，为什么用在 body</h2>
      <p>
        你会发现 <code>body</code> 的类型几乎总是写成 <code>some View</code>。这是 Swift 的
        <strong>不透明返回类型（opaque return type）</strong>。它的意思是：「我返回的是<strong>某一个</strong>
        遵循 <code>View</code> 的<strong>具体</strong>类型，编译期是确定且唯一的，但我不想把那个又长又乱的
        真实类型名写出来。」
      </p>
      <p>
        为什么需要它？因为 <code>body</code> 的真实类型常常极其复杂——前面修饰符链的注释里
        你已经看到 <code>{'ModifiedContent<Text, ...>'}</code> 这种层层嵌套的泛型。一个稍复杂的视图，
        其真实类型可能是几行长的泛型噩梦。<code>some View</code> 让你只需说「它是个 View」，
        把那一长串交给编译器去推断。
      </p>
      <Callout variant="info" title="some View 不等于 any View">
        <code>some View</code> 是「<strong>某个确定但被隐藏</strong>的具体类型」，编译期固定、零额外开销；
        <code>any View</code> 才是「运行时可以是任意 View」的类型擦除，开销更大、能力受限。
        日常 <code>body</code> 用 <code>some View</code> 就对了。
      </Callout>

      <h2>八、@ViewBuilder：花括号里能直接「列视图」的魔法</h2>
      <p>
        前面 <code>VStack {'{ Text(...) ; Text(...) }'}</code> 里我们没用逗号、没建数组，就直接列了好几个视图，
        甚至能写 <code>if</code>。一句话解释：这些花括号是被 <strong><code>@ViewBuilder</code> 结果构造器</strong>
        接管的——它把你「列出」的多个视图<strong>自动打包</strong>成一个合成视图，并支持有限的
        <code>if</code> / <code>switch</code> 等控制流。所以你能用近乎「声明列表」的方式描述子视图。
      </p>
      <CodeBlock lang="swift" title="@ViewBuilder 让你直接列视图" code={viewBuilderSnippet} />

      <h2>九、边界与常见误区</h2>
      <ul>
        <li><strong>别在 body 里做副作用</strong>：它会被反复调用，发请求 / 自增计数器都会出问题。</li>
        <li><strong>别试图持有视图引用去改它</strong>：视图是值、是描述；要变就改驱动它的状态（下一章讲）。</li>
        <li><strong>修饰符顺序要想清楚</strong>：padding 与 background、frame 与 background 的先后会改变外观。</li>
        <li><strong>视图拆得过碎也有代价</strong>：合理粒度即可，不必为每个 Text 都单独建一个 struct。</li>
        <li><strong>ViewBuilder 的 if 是有限的</strong>：它支持常见控制流，但不是任意 Swift 代码都能塞进去。</li>
      </ul>

      <Callout variant="tip">
        这一章我们只讲了「界面长什么样」这半边。但 SwiftUI 真正的威力在于另一半——
        <strong>界面如何随数据自动变化</strong>。下一章进入 <code>@State</code> 与 <code>@Binding</code>：
        看「改状态 → body 重算 → 界面刷新」这条主线如何让你彻底告别手动更新控件。
      </Callout>

      <Summary
        points={[
          'View 是遵循 View 协议的 struct（值类型），是对界面的「描述」，不是你持有去修改的控件对象。',
          'body 是计算属性，会被反复调用并返回视图树；把它当纯函数，UI = f(state)，别在里面做副作用。',
          '基础积木：Text / Image / Button / VStack / HStack / Spacer，绝大多数界面由它们组合而成。',
          '修饰符（.font/.padding/.background…）返回新视图、可链式叠加，且顺序会影响外观。',
          'SwiftUI 用组合而非继承拼界面：写职责单一的小视图，再嵌套组合成大视图。',
          '声明式（描述结果、改状态自动刷新）对比命令式 UIKit（手动创建、挂载、布局、更新）。',
          'body 用 some View（不透明返回类型）隐藏复杂真实类型；@ViewBuilder 让花括号能直接列出多个视图并支持有限控制流。',
        ]}
      />
    </article>
  )
}
