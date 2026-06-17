import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const imperativeXml = `<!-- res/layout/activity_greeting.xml -->
<LinearLayout
    android:orientation="vertical"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <TextView
        android:id="@+id/greetingText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="你好，世界" />

    <Button
        android:id="@+id/greetButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="打招呼" />
</LinearLayout>`

const imperativeKotlin = `// 命令式：手动 findViewById，手动 setText，状态散落在各处
class GreetingActivity : AppCompatActivity() {

    private var name: String = "世界"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_greeting)

        // 1. 先把 XML 里的控件一个个查出来
        val greetingText = findViewById<TextView>(R.id.greetingText)
        val greetButton = findViewById<Button>(R.id.greetButton)

        // 2. 初始渲染：手动把状态写进控件
        greetingText.text = "你好，\${name}"

        // 3. 状态变化时，必须记得再次手动同步 UI——漏一处就是 bug
        greetButton.setOnClickListener {
            name = "Compose"
            greetingText.text = "你好，\${name}"  // 不写这行，界面就不会更新
        }
    }
}`

const declarativeCompose = `// 声明式：UI 是状态的函数，状态一变，框架自动重画
@Composable
fun Greeting() {
    // 状态就放在这里，是唯一数据源
    var name by remember { mutableStateOf("世界") }

    Column {
        // 你只描述「界面长什么样」，不描述「怎么改它」
        Text(text = "你好，\${name}")
        Button(onClick = { name = "Compose" }) {
            Text("打招呼")
        }
    }
}
// 点击后 name 变成 "Compose"，Text 自动显示 "你好，Compose"
// 没有 findViewById，没有 setText，没有手动同步`

const composableBasic = `import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

// @Composable 注解告诉编译器：这是一个可组合函数，
// 它「发射（emit）」UI，而不是返回一个 View 对象。
@Composable
fun Hello() {
    Text(text = "Hello Compose")
}`

const composableNesting = `@Composable
fun UserCard(name: String, bio: String) {
    Column {
        Avatar(name)          // 复用：可组合函数可任意嵌套
        Text(text = name)
        Text(text = bio)
    }
}

@Composable
fun Avatar(name: String) {
    Text(text = name.first().toString())  // 取首字母当头像占位
}

@Composable
fun UserList(users: List<User>) {
    Column {
        // 组合优于继承：用 for 循环把小组件拼成大组件
        for (user in users) {
            UserCard(name = user.name, bio = user.bio)
        }
    }
}`

const previewSnippet = `import androidx.compose.ui.tooling.preview.Preview

// @Preview 让 Android Studio 在不跑模拟器的情况下直接预览界面
@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    Greeting()
}`

const interopSnippet = `// 与 View 体系互操作：一句话——两边可以互相嵌套
// 1. 在 Compose 里塞一个传统 View：
AndroidView(factory = { context -> WebView(context) })

// 2. 在 XML/View 布局里塞一段 Compose：
val composeView = ComposeView(context).apply {
    setContent { Greeting() }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Jetpack Compose 是 Android 官方推荐的现代 UI 工具包，它把界面开发从「拿着控件一个个改」
        变成「描述界面应该长什么样」。这一章我们讲透它的核心范式——<strong>可组合函数（Composable）</strong>：
        什么是「发射 UI」，声明式与命令式到底差在哪，<code>UI = f(state)</code> 这个公式意味着什么，
        以及组合优于继承的思路。看完你会明白，为什么写 Compose 时你几乎不再写 <code>findViewById</code>。
      </Lead>

      <h2>一、从命令式说起：传统 XML + View 的痛点</h2>
      <p>
        在 Compose 之前，Android 界面靠 <strong>XML 布局文件</strong> 描述结构，再在 Activity / Fragment 里
        用代码操作它。流程通常是：写好 XML，用 <code>setContentView</code> 加载，用
        <code>findViewById</code> 把每个控件查出来拿到引用，然后在需要时手动调用
        <code>setText</code>、<code>setVisibility</code> 这类方法去改它。
      </p>
      <p>
        这种写法叫<strong>命令式（imperative）</strong>：你一步步「命令」UI 怎么变。它的核心问题是——
        <strong>状态和界面是两份，需要你手动保持同步</strong>。数据变了，你必须记得去改对应的控件；
        漏改一处，界面就和数据对不上，这是 Android 历史上最常见的一类 bug。
      </p>
      <CodeBlock lang="xml" title="传统 XML 布局" code={imperativeXml} />
      <CodeBlock lang="kotlin" title="命令式：手动查控件、手动同步状态" code={imperativeKotlin} />
      <p>
        注意上面那行注释强调的痛点：点击按钮把 <code>name</code> 改了之后，<strong>你必须再写一行</strong>
        <code>greetingText.text = ...</code> 去手动更新界面。状态有几处，你就得记得在几个地方同步——
        随着界面变复杂，这种「记得手动改」的负担会指数级膨胀。
      </p>

      <h2>二、声明式范式：你只描述「界面长什么样」</h2>
      <KeyIdea>
        Compose 是<strong>声明式（declarative）</strong>的：你不再一步步命令 UI 怎么改，而是写一个函数，
        <strong>声明「在当前状态下，界面应该长什么样」</strong>。状态一旦变化，框架会自动重新执行这个函数、
        重画界面。同步的活交给框架，你不再手动 <code>setText</code>。
      </KeyIdea>
      <p>
        把上一节那个例子改写成 Compose，对照一下两种范式的差别：
      </p>
      <CodeBlock lang="kotlin" title="声明式：UI 是状态的函数" code={declarativeCompose} />
      <Example title="命令式 vs 声明式：同一个「点击改文字」">
        <p>
          <strong>命令式</strong>：① <code>findViewById</code> 拿到 TextView；② 初始
          <code>setText</code>；③ 点击后改数据，<strong>再手动 setText 一次</strong>。三步，
          且第三步漏了界面就不更新。
        </p>
        <p>
          <strong>声明式</strong>：界面里写 <code>Text(text = "你好，\${name}")</code>，
          点击只改 <code>name</code> 这个状态，<strong>界面自动跟着变</strong>。你从头到尾
          没碰过控件对象，也没手动同步。
        </p>
      </Example>

      <h2>三、可组合函数：什么是「发射」UI</h2>
      <p>
        Compose 的基本构建块是<strong>可组合函数（Composable function）</strong>——加了
        <code>@Composable</code> 注解的 Kotlin 函数。它和普通函数最大的不同是：
        它<strong>不返回</strong>一个 View 对象，而是<strong>「发射（emit）」UI</strong>。
      </p>
      <KeyIdea>
        可组合函数描述 UI，但不把界面当成「值」返回。它的返回类型通常是 <code>Unit</code>。
        函数体里调用 <code>Text(...)</code>、<code>{'Column {...}'}</code> 时，这些调用会向 Compose
        运行时「发射」出一棵 UI 节点树，由运行时负责把它画到屏幕上。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="最简单的可组合函数" code={composableBasic} />
      <p>
        所以 <code>@Composable</code> 不只是个标记，它改变了函数的「调用约定」：被注解的函数只能在
        另一个可组合函数里调用，因为它需要 Compose 运行时提供的上下文（一个隐式传入的
        <code>Composer</code>）来接收它发射的 UI。这也是为什么你不能在普通的
        <code>onClick</code> 普通回调或后台线程里随便调用一个 <code>@Composable</code> 函数。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>命令式（View + XML）</th><th>声明式（Compose）</th></tr>
        </thead>
        <tbody>
          <tr><td>UI 定义</td><td>XML 文件 + Java/Kotlin 操作</td><td>纯 Kotlin 的 @Composable 函数</td></tr>
          <tr><td>拿到控件</td><td><code>findViewById</code> / ViewBinding</td><td>不需要，没有控件引用</td></tr>
          <tr><td>更新界面</td><td>手动 <code>setText</code> 等，需自己同步</td><td>改状态，框架自动重画</td></tr>
          <tr><td>UI 与状态关系</td><td>两份，易不一致</td><td><code>UI = f(state)</code>，单一数据源</td></tr>
          <tr><td>复用方式</td><td>自定义 View、include 布局</td><td>函数调用 + 嵌套，组合优于继承</td></tr>
        </tbody>
      </table>

      <h2>四、核心公式：UI = f(state)</h2>
      <p>
        声明式 UI 可以浓缩成一个公式：<strong><code>UI = f(state)</code></strong>——界面是状态的函数。
        给定一份状态，可组合函数就确定地产出一份对应的界面；状态变了，函数重新执行，产出新界面。
        你的工作变成两件事：① 管理好状态；② 写好「状态 → 界面」这个映射函数。
      </p>
      <Callout variant="info" title="为什么这个公式重要">
        因为它把「界面如何变化」这件事从你的大脑里搬走了。你不再需要思考「从状态 A 到状态 B，
        界面要做哪几步改动」这种<strong>过渡（transition）</strong>逻辑，只需要描述「状态 B 对应的界面
        是什么样」。框架负责对比新旧、算出差异、最小化重画——这套机制就是下一章要讲的
        <strong>重组（recomposition）</strong>。
      </Callout>

      <h2>五、组合优于继承：函数任意嵌套与复用</h2>
      <p>
        传统 View 体系靠<strong>继承</strong>扩展：要一个特殊按钮，你继承 <code>Button</code> 再改它。
        Compose 反过来，靠<strong>组合（composition）</strong>：可组合函数可以任意嵌套、像搭积木一样
        把小组件拼成大组件，复用就是普通的「调用函数」。
      </p>
      <CodeBlock lang="kotlin" title="可组合函数任意嵌套与复用" code={composableNesting} />
      <p>
        这里 <code>UserList</code> 调用 <code>UserCard</code>，<code>UserCard</code> 又调用
        <code>Avatar</code> 和 <code>Text</code>——层层嵌套，每一层都是一个普通函数调用。
        想复用一段界面？把它抽成一个 <code>@Composable</code> 函数，在任意地方调它即可。
        没有继承层级，没有复杂的 View 子类化，这就是「组合优于继承」在 UI 上的体现。
      </p>
      <Callout variant="tip" title="命名约定">
        发射 UI 的可组合函数（如 <code>Greeting</code>、<code>UserCard</code>）按官方约定用
        <strong>名词、首字母大写的帕斯卡命名</strong>，就像它们是「UI 元素」一样。
        这能让代码读起来像在描述界面结构。
      </Callout>

      <h2>六、@Preview：不开模拟器就能看界面</h2>
      <p>
        因为可组合函数就是纯 Kotlin 函数、UI 又完全由参数（状态）决定，Android Studio 可以
        在不启动模拟器或真机的情况下，直接把某个可组合函数<strong>渲染出来预览</strong>。
        你只要再写一个加了 <code>@Preview</code> 的可组合函数即可。
      </p>
      <CodeBlock lang="kotlin" title="用 @Preview 预览界面" code={previewSnippet} />
      <p>
        预览函数通常<strong>不接收参数</strong>（预览时没人传参），所以一般写一个专门的包装函数，
        在里面用写死的示例数据调用真正的组件。一个文件里可以放多个 <code>@Preview</code>，
        分别预览浅色/深色、不同屏幕尺寸、不同示例数据下的样子——这让 UI 迭代变得极快。
      </p>

      <h2>七、与 View 体系互操作：一句话</h2>
      <p>
        现实项目往往是新旧混杂的，Compose 对此有完善的互操作能力。一句话概括：
        <strong>Compose 和传统 View 可以互相嵌套</strong>——用 <code>AndroidView</code> 在 Compose 里放一个
        传统 View（如 <code>WebView</code>、地图控件），用 <code>ComposeView</code> 在 XML/View 布局里
        放一段 Compose。所以你可以渐进式迁移，不必一次性重写整个 App。
      </p>
      <CodeBlock lang="kotlin" title="两个方向的互操作" code={interopSnippet} />

      <h2>八、边界与注意点</h2>
      <p>
        声明式范式很省心，但有几条边界要先记住，下一章会展开：
      </p>
      <ul>
        <li>
          可组合函数<strong>可能被频繁重新执行</strong>（重组），所以函数体里不应做耗时操作或带副作用的事
          （网络请求、写文件），否则每次重画都会触发一次。
        </li>
        <li>
          普通局部变量<strong>不能用来存 UI 状态</strong>：每次重组函数重新执行，变量会被重置。
          状态必须用 <code>remember</code> + <code>mutableStateOf</code> 管理（下一章主题）。
        </li>
        <li>
          <code>@Composable</code> 函数只能在另一个 <code>@Composable</code> 上下文里调用，
          不能在普通函数、普通回调里直接调。
        </li>
      </ul>

      <Callout variant="tip">
        下一章我们深入 Compose 的引擎室：状态变化是<strong>如何</strong>触发重组的，
        <code>remember</code> 与 <code>mutableStateOf</code> 各自负责什么，以及怎么通过
        <strong>状态提升</strong>写出干净、可复用、单向数据流的组件。
      </Callout>

      <Summary
        points={[
          '可组合函数是加了 @Composable 的 Kotlin 函数，它「发射」UI 而非返回 View 对象，返回类型通常是 Unit。',
          '命令式（XML + findViewById + 手动 setText）需手动同步状态与界面，易漏改出 bug；声明式只描述界面长什么样。',
          '核心公式 UI = f(state)：界面是状态的函数，状态变则框架自动重画，你只管状态与映射函数。',
          '组合优于继承：可组合函数可任意嵌套、像搭积木一样复用，复用即调用函数，没有 View 子类化。',
          '@Preview 让你不开模拟器就能直接预览界面，预览函数一般无参、用示例数据调用真正组件。',
          '与 View 体系可互操作：AndroidView 在 Compose 里放传统 View，ComposeView 在 View 布局里放 Compose，支持渐进迁移。',
        ]}
      />
    </article>
  )
}
