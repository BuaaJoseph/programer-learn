import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const themeSetup = `// 1) 定义两套配色：浅色与深色
private val LightColors = lightColorScheme(
    primary = Color(0xFF6750A4),
    onPrimary = Color.White,
    secondary = Color(0xFF625B71),
    background = Color(0xFFFFFBFE),
    surface = Color(0xFFFFFBFE),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFD0BCFF),
    onPrimary = Color(0xFF381E72),
    secondary = Color(0xFFCCC2DC),
    background = Color(0xFF1C1B1F),
    surface = Color(0xFF1C1B1F),
)

// 2) 自定义主题：包住 MaterialTheme，统一注入配色/排版/形状
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),  // 默认跟随系统深色模式
    dynamicColor: Boolean = true,                // Android 12+ 跟随壁纸取色
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val ctx = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,   // 见下
        shapes = AppShapes,           // 见下
        content = content
    )
}`

const typographyShape = `// 排版：M3 预置了一整套语义化文字样式
val AppTypography = Typography(
    titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelSmall = TextStyle(fontSize = 11.sp)
)

// 形状：small / medium / large 三档圆角，组件按语义自动取用
val AppShapes = Shapes(
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(24.dp)
)

// 在任意组件里读取当前主题值（而不是写死颜色/字号）
Text(
    text = "标题",
    color = MaterialTheme.colorScheme.primary,
    style = MaterialTheme.typography.titleLarge
)`

const scaffoldSnippet = `@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("我的应用") })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* 新建 */ }) {
                Icon(Icons.Default.Add, contentDescription = "新建")
            }
        }
    ) { innerPadding ->
        // innerPadding 必须消费：让内容避开 TopAppBar 和系统栏
        Column(modifier = Modifier.padding(innerPadding)) {
            Card(modifier = Modifier.padding(16.dp)) {
                Text("一张卡片", modifier = Modifier.padding(16.dp))
            }
            Button(onClick = { /* 点击 */ }) {
                Text("主按钮")
            }
        }
    }
}`

const animateAsState = `@Composable
fun ExpandableBox() {
    var expanded by remember { mutableStateOf(false) }

    // animate*AsState：状态从 false->true 时，尺寸/颜色平滑过渡而不是瞬变
    val size by animateDpAsState(
        targetValue = if (expanded) 200.dp else 100.dp,
        animationSpec = tween(durationMillis = 300),
        label = "size"
    )
    val color by animateColorAsState(
        targetValue = if (expanded) Color(0xFF6750A4) else Color(0xFFB0BEC5),
        label = "color"
    )

    Box(
        modifier = Modifier
            .size(size)                 // 这个值在变化时被自动补间
            .background(color)
            .clickable { expanded = !expanded }
    )
}`

const visibilitySnippet = `@Composable
fun ThemeToggleDemo() {
    var dark by remember { mutableStateOf(false) }
    var showTip by remember { mutableStateOf(true) }

    AppTheme(darkTheme = dark) {
        Surface(color = MaterialTheme.colorScheme.background) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .animateContentSize()    // 高度变化时自动补间，提示出现/消失更顺
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("深色模式", color = MaterialTheme.colorScheme.onBackground)
                    Spacer(Modifier.weight(1f))
                    Switch(checked = dark, onCheckedChange = { dark = it })
                }

                // AnimatedVisibility：进/出场带淡入淡出 + 展开收起
                AnimatedVisibility(
                    visible = showTip,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically()
                ) {
                    Card { Text("点右上角开关切换主题", Modifier.padding(12.dp)) }
                }

                Button(onClick = { showTip = !showTip }) {
                    Text(if (showTip) "隐藏提示" else "显示提示")
                }
            }
        }
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        有了布局和列表，界面还需要一套统一的「视觉语言」：颜色、字体、形状要协调，深色模式要能切换，
        状态变化最好别生硬地跳变。这一章讲 <strong>Material 3</strong> 设计系统——它如何用
        ColorScheme / Typography / Shape 三件套统一全局风格，<code>MaterialTheme</code> 如何把主题下发给所有组件，
        以及 Android 12+ 的动态取色与深色模式；再讲 Compose 的<strong>动画</strong>：用
        animate*AsState 让状态平滑过渡，用 AnimatedVisibility 做进出场，用 animateContentSize 自适应尺寸变化。
      </Lead>

      <h2>一、Material 3 设计系统</h2>
      <p>
        Material 3（又称 Material You）是 Google 的最新设计系统，也是 Compose 的<strong>默认组件库</strong>
        （<code>androidx.compose.material3</code>）。它的价值不只是「好看的组件」，更是一套
        <strong>语义化的设计令牌（design tokens）</strong>：你不直接写颜色值和字号，而是引用
        「主色 / 表面色 / 标题样式 / 中等圆角」这些语义角色，全局换肤时一处改、处处变。
      </p>
      <KeyIdea>
        Material 3 把主题抽象成三件套：<strong>ColorScheme（配色）</strong>、
        <strong>Typography（排版）</strong>、<strong>Shapes（形状）</strong>。组件不写死样式，
        而是<strong>按语义</strong>从当前主题里取值，所以换主题、切深色模式只需替换这三套令牌。
      </KeyIdea>

      <h3>ColorScheme：成对出现的语义色</h3>
      <p>
        M3 的配色不是一堆零散颜色，而是一组<strong>有角色的</strong>颜色，且大多<strong>成对</strong>出现：
        每个「容器色」都配一个「在其上的内容色」，保证对比度可读。
      </p>
      <table>
        <thead>
          <tr><th>角色</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td><code>primary</code> / <code>onPrimary</code></td><td>主色与「画在主色之上」的内容色</td></tr>
          <tr><td><code>secondary</code> / <code>tertiary</code></td><td>次要 / 第三强调色</td></tr>
          <tr><td><code>background</code> / <code>onBackground</code></td><td>页面背景与其上的文字色</td></tr>
          <tr><td><code>surface</code> / <code>onSurface</code></td><td>卡片 / 表面色与其上的内容色</td></tr>
          <tr><td><code>error</code> / <code>onError</code></td><td>错误状态色及其内容色</td></tr>
        </tbody>
      </table>

      <h3>Typography 与 Shapes</h3>
      <p>
        <strong>Typography</strong> 提供一套语义化文字样式：<code>displayLarge</code>、<code>titleLarge</code>、
        <code>bodyMedium</code>、<code>labelSmall</code> 等，按「用途」选样式而非到处写 <code>fontSize</code>。
        <strong>Shapes</strong> 则定义 <code>small</code> / <code>medium</code> / <code>large</code> 三档圆角，
        Button、Card 等组件会按各自语义自动取用对应档位。
      </p>
      <CodeBlock lang="kotlin" title="自定义 Typography 与 Shapes，并按语义读取" code={typographyShape} />

      <h2>二、MaterialTheme：主题的提供者</h2>
      <p>
        <code>MaterialTheme</code> 是一个可组合函数，它把 colorScheme / typography / shapes 三套令牌
        通过 <strong>CompositionLocal</strong> 下发给包裹在它内部的所有组件。子组件用
        <code>MaterialTheme.colorScheme.primary</code> 这样的方式<strong>就近读取</strong>当前主题——
        这正是「一处定义、处处生效」的机制。实战中我们通常再包一层自己的 <code>AppTheme</code>。
      </p>
      <CodeBlock lang="kotlin" title="自定义 AppTheme 包住 MaterialTheme" code={themeSetup} />

      <h3>深色模式：isSystemInDarkTheme</h3>
      <p>
        <code>isSystemInDarkTheme()</code> 读取系统当前是否处于深色模式，返回一个会随系统设置变化的状态。
        把它作为选 LightColors 还是 DarkColors 的依据，应用就能<strong>自动跟随系统</strong>切换明暗；
        当然你也可以用一个自己的开关状态覆盖它，做应用内手动切换。
      </p>

      <h3>动态取色 dynamicColor（Android 12+）</h3>
      <p>
        Android 12（API 31，代号 S）起支持<strong>动态取色</strong>：系统从用户的<strong>壁纸</strong>提取主色，
        生成一整套和谐的 ColorScheme，让应用「跟着手机主题走」。在 Compose 里用
        <code>dynamicLightColorScheme(context)</code> / <code>dynamicDarkColorScheme(context)</code> 获取，
        但必须<strong>判断系统版本</strong>，低于 12 的设备回退到你自定义的静态配色。
      </p>
      <Callout variant="warn" title="动态取色要做版本判断与回退">
        <code>dynamic*ColorScheme</code> 仅在 <code>Build.VERSION.SDK_INT &gt;= Build.VERSION_CODES.S</code>
        时可用。务必先判版本，否则在旧设备上会崩；判断不通过时回退到 Light/DarkColors。
      </Callout>

      <h2>三、常用 Material 3 组件</h2>
      <p>
        M3 提供了开箱即用的常见组件，最骨架级的是 <code>Scaffold</code>——它给你一个标准的页面脚手架，
        预留好顶栏、底栏、悬浮按钮、Snackbar 的插槽，并把它们之间的间距（<code>innerPadding</code>）算好交给你。
      </p>
      <table>
        <thead>
          <tr><th>组件</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Scaffold</code></td><td>页面脚手架，编排 topBar / bottomBar / FAB / 内容区</td></tr>
          <tr><td><code>TopAppBar</code></td><td>顶部应用栏，放标题、导航图标与操作</td></tr>
          <tr><td><code>Button</code> 系列</td><td>主按钮、<code>OutlinedButton</code>、<code>TextButton</code> 等</td></tr>
          <tr><td><code>Card</code></td><td>带表面色与圆角阴影的内容容器</td></tr>
          <tr><td><code>FloatingActionButton</code></td><td>悬浮主操作按钮（FAB）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="kotlin" title="用 Scaffold 组织一个页面" code={scaffoldSnippet} />
      <Callout variant="tip" title="务必消费 innerPadding">
        <code>Scaffold</code> 内容 lambda 的参数 <code>innerPadding</code> 一定要应用到内容上
        （<code>Modifier.padding(innerPadding)</code>），否则内容会被 TopAppBar 或系统栏盖住。
      </Callout>

      <h2>四、动画：让状态变化平滑过渡</h2>
      <p>
        Compose 是声明式的：你描述「某状态下界面长什么样」，状态一变界面就重组。但默认是
        <strong>瞬间跳变</strong>。动画 API 的作用，就是在「旧值」到「新值」之间<strong>自动补间</strong>，
        让变化看起来连续顺滑。
      </p>

      <h3>animate*AsState：单个值的平滑过渡</h3>
      <p>
        这是最常用的入门动画。<code>animateDpAsState</code> / <code>animateColorAsState</code> /
        <code>animateFloatAsState</code> 等接收一个 <strong>目标值</strong>，返回一个会
        <strong>朝目标平滑变化</strong>的 State。你只管改目标值，过渡过程框架替你算。
      </p>
      <CodeBlock lang="kotlin" title="animateDpAsState / animateColorAsState" code={animateAsState} />

      <h3>AnimatedVisibility 与 animateContentSize</h3>
      <p>
        <strong>AnimatedVisibility</strong> 专管组件的<strong>进场 / 出场</strong>：根据
        <code>visible</code> 布尔值，用 <code>enter</code> / <code>exit</code> 指定淡入淡出
        （<code>fadeIn</code> / <code>fadeOut</code>）、展开收起（<code>expandVertically</code> /
        <code>shrinkVertically</code>）等效果，且效果可以用 <code>+</code> 组合。
        <strong>animateContentSize</strong> 是个 Modifier，挂上后组件<strong>尺寸变化</strong>会自动补间，
        常用于「内容增减导致高度变化」时不让它突然跳。
      </p>
      <CodeBlock lang="kotlin" title="主题切换 + AnimatedVisibility + animateContentSize" code={visibilitySnippet} />
      <Example title="这个例子里发生了什么">
        <p>
          点 Switch =&gt; <code>dark</code> 变化 =&gt; <code>AppTheme(darkTheme = dark)</code> 重新计算 colorScheme
          =&gt; 所有用 <code>MaterialTheme.colorScheme.*</code> 取色的组件随之换肤。
        </p>
        <p>
          点「隐藏 / 显示提示」=&gt; <code>showTip</code> 变化 =&gt; <code>AnimatedVisibility</code> 让卡片淡入淡出
          + 展开收起；外层 <code>animateContentSize</code> 让 Column 的高度变化也平滑，整体不突兀。
        </p>
      </Example>

      <h3>updateTransition：一句话</h3>
      <p>
        当多个值需要<strong>跟同一个状态一起协调地变</strong>（如同时变颜色、大小、圆角），
        用 <code>updateTransition</code> 统一管理：它以一个状态为驱动，派生出多个被同步补间的子动画，
        比分别写多个 animate*AsState 更整齐、更易保持节奏一致。
      </p>

      <Callout variant="tip">
        到这里，你已能搭出有布局、长列表、统一主题与基础动画的完整界面。下一卷我们进入状态管理与数据层，
        让这些漂亮的界面真正「动起来、连上数据」。
      </Callout>

      <Summary
        points={[
          'Material 3 用 ColorScheme / Typography / Shapes 三套语义化令牌统一全局风格，组件按语义取值而非写死。',
          'ColorScheme 的颜色成对出现（如 primary / onPrimary），保证内容在容器上可读。',
          'MaterialTheme 通过 CompositionLocal 下发主题，子组件用 MaterialTheme.colorScheme/typography 就近读取，实现一处定义处处生效。',
          'isSystemInDarkTheme() 跟随系统深色模式；dynamicColor 在 Android 12+ 从壁纸取色，需判版本并回退。',
          '常用组件：Scaffold（脚手架，务必消费 innerPadding）、TopAppBar、Button、Card、FloatingActionButton。',
          '动画：animate*AsState 平滑过渡单个值，AnimatedVisibility 管进出场，animateContentSize 自适应尺寸，updateTransition 协调多值同变。',
        ]}
      />
    </article>
  )
}
