import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const columnRowBox = `// Column：子项从上到下纵向排列
Column(
    modifier = Modifier.fillMaxWidth(),
    verticalArrangement = Arrangement.spacedBy(8.dp), // 子项之间留 8dp
    horizontalAlignment = Alignment.CenterHorizontally // 子项水平居中
) {
    Text("第一行")
    Text("第二行")
}

// Row：子项从左到右横向排列
Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween, // 两端对齐、中间均分空白
    verticalAlignment = Alignment.CenterVertically
) {
    Text("左")
    Text("右")
}

// Box：子项相互层叠（类似 FrameLayout），用 align 决定每个子项落在哪
Box(modifier = Modifier.size(120.dp)) {
    Text("左上", modifier = Modifier.align(Alignment.TopStart))
    Text("正中", modifier = Modifier.align(Alignment.Center))
    Text("右下", modifier = Modifier.align(Alignment.BottomEnd))
}`

const weightSnippet = `// weight：按比例瓜分主轴上的剩余空间
Row(modifier = Modifier.fillMaxWidth()) {
    // 1 : 2 : 1 三段，中间那段占一半宽
    Box(Modifier.weight(1f).height(48.dp).background(Color.Red))
    Box(Modifier.weight(2f).height(48.dp).background(Color.Green))
    Box(Modifier.weight(1f).height(48.dp).background(Color.Blue))
}

// fill = false：先按内容量好，再去分剩余空间，自身不被强行撑满
Row {
    Text("标题", modifier = Modifier.weight(1f, fill = false))
    Icon(Icons.Default.Star, contentDescription = null)
}`

const modifierOrderSnippet = `// 同样的两个 Modifier，顺序不同，结果完全不同！

// A：先 padding 再 background
//   先内缩出 16dp 空白，再在“内缩后”的区域上色
//   => 边缘留出一圈未上色的空白
Box(
    Modifier
        .padding(16.dp)
        .background(Color.Yellow)
        .size(100.dp)
)

// B：先 background 再 padding
//   先在整块区域上色，再向内留 16dp 空白
//   => 整块都是黄色，padding 变成“色块内部的内边距”
Box(
    Modifier
        .background(Color.Yellow)
        .padding(16.dp)
        .size(100.dp)
)`

const commonModifiers = `Modifier
    .fillMaxWidth()              // 宽度撑满父容器（fillMaxWidth(0.5f) 占一半）
    .padding(horizontal = 16.dp) // 内边距：在尺寸“之内”留白
    .size(width = 200.dp, height = 80.dp) // 固定尺寸
    .clip(RoundedCornerShape(12.dp))      // 裁剪成圆角（影响之后的绘制与点击区域）
    .background(Color(0xFFEEEEEE))        // 背景色 / 背景画刷
    .clickable { onClick() }              // 让任意组件可点击，自带涟漪反馈`

const lazyColumnSnippet = `data class Product(val id: Int, val name: String, val price: Int)

@Composable
fun ProductList(products: List<Product>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),        // 列表整体内边距
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 单个固定项：标题
        item {
            Text("热销商品", style = MaterialTheme.typography.titleLarge)
        }
        // 一批数据项：key 让 Compose 在增删/重排时精准复用
        items(products, key = { it.id }) { product ->
            ProductRow(product)
        }
    }
}

@Composable
fun ProductRow(product: Product) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F5F5))
            .clickable { /* 打开详情 */ }
            .padding(16.dp),                  // 注意：padding 在 background 之后 => 留白在色块内
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(product.name)
        Text("¥\${product.price}")
    }
}`

const lazyGridSnippet = `// LazyRow：横向可回收列表（横向滑动的卡片条）
LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    items(banners, key = { it.id }) { banner -> BannerCard(banner) }
}

// LazyVerticalGrid：网格，按需渲染
LazyVerticalGrid(
    columns = GridCells.Fixed(2),          // 固定 2 列；也可 GridCells.Adaptive(minSize = 120.dp)
    contentPadding = PaddingValues(12.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp)
) {
    items(products, key = { it.id }) { product -> ProductCard(product) }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        界面是「摆出来的」。在 Jetpack Compose 里，摆放靠两样东西：一是
        <strong>布局容器</strong>（Column / Row / Box）决定子项怎么排，二是
        <strong>Modifier</strong>（修饰符）决定每个组件的尺寸、内外边距、背景、点击等行为。
        这一章我们先讲清三大布局与对齐、排布、weight，再把 Modifier 的链式顺序为何影响结果讲透，
        最后用 LazyColumn / LazyRow / LazyVerticalGrid 做出能流畅滑动上万条的「可回收长列表」。
      </Lead>

      <h2>一、三大基础布局：Column / Row / Box</h2>
      <p>
        Compose 的布局不靠 XML，而是把容器写成可组合函数，子项写在它的尾随 lambda 里。
        最常用的三个容器各管一个方向：
      </p>
      <ul>
        <li><strong>Column</strong>：子项<strong>纵向</strong>从上到下排列（对标 XML 里的垂直 LinearLayout）。</li>
        <li><strong>Row</strong>：子项<strong>横向</strong>从左到右排列（水平 LinearLayout）。</li>
        <li><strong>Box</strong>：子项<strong>相互层叠</strong>，后写的盖在先写的上面（对标 FrameLayout），常用来做角标、浮层、居中。</li>
      </ul>
      <CodeBlock lang="kotlin" title="Column / Row / Box 三种排法" code={columnRowBox} />

      <h3>对齐（Alignment）与排布（Arrangement）别搞混</h3>
      <p>
        每个容器都有两个维度需要安排：沿着排列方向（<strong>主轴</strong>）怎么分布，垂直于排列方向
        （<strong>交叉轴</strong>）怎么对齐。Compose 把它们拆成两个不同参数：
      </p>
      <ul>
        <li>
          <strong>Arrangement（排布）</strong>管<strong>主轴</strong>：子项之间和两端的空白怎么分。
          Column 用 <code>verticalArrangement</code>，Row 用 <code>horizontalArrangement</code>。
        </li>
        <li>
          <strong>Alignment（对齐）</strong>管<strong>交叉轴</strong>：子项在另一方向上靠哪边。
          Column 用 <code>horizontalAlignment</code>，Row 用 <code>verticalAlignment</code>。
        </li>
      </ul>
      <table>
        <thead>
          <tr><th>容器</th><th>主轴（Arrangement）</th><th>交叉轴（Alignment）</th></tr>
        </thead>
        <tbody>
          <tr><td>Column（纵向）</td><td><code>verticalArrangement</code></td><td><code>horizontalAlignment</code></td></tr>
          <tr><td>Row（横向）</td><td><code>horizontalArrangement</code></td><td><code>verticalAlignment</code></td></tr>
          <tr><td>Box（层叠）</td><td colSpan={2}>用子项上的 <code>Modifier.align(Alignment.X)</code> 单独定位，或容器的 <code>contentAlignment</code> 设默认</td></tr>
        </tbody>
      </table>
      <p>
        常见的 Arrangement 值：<code>spacedBy(8.dp)</code>（子项间固定间隔）、<code>SpaceBetween</code>
        （两端贴边、中间均分）、<code>SpaceAround</code>、<code>SpaceEvenly</code>、<code>Center</code>、
        <code>Top</code> / <code>Bottom</code> / <code>Start</code> / <code>End</code>。
      </p>

      <h3>weight：按比例瓜分剩余空间</h3>
      <p>
        想让某个子项「占满剩下的空间」或几个子项「按 1:2:1 分」，用
        <code>Modifier.weight(...)</code>。它只在 Row / Column 内部生效，作用是把主轴上
        <strong>固定尺寸子项占完后的剩余空间</strong>按权重分配。这正是对标 XML 里
        <code>layout_weight</code> 的能力。
      </p>
      <CodeBlock lang="kotlin" title="用 weight 做比例布局" code={weightSnippet} />

      <h2>二、Modifier 是什么</h2>
      <KeyIdea>
        Modifier 是一条<strong>有序的修饰链</strong>。你用 <code>.padding().background().clickable()</code>
        把一系列「装饰 / 行为」串起来挂到组件上，Compose <strong>按书写顺序从外到内</strong>逐层应用。
        因此 Modifier 的顺序不是风格问题，而是<strong>会改变最终结果</strong>的语义。
      </KeyIdea>
      <p>
        在传统 View 体系里，尺寸、内边距、背景、点击监听是散落在 XML 属性和 Java/Kotlin 调用里的。
        Compose 把这些统一收进 Modifier：它是一个不可变对象，每调用一个修饰方法就返回一个
        <strong>新的、更长的</strong>修饰链。把它传给组件的 <code>modifier</code> 参数，组件在测量、布局、
        绘制、处理输入时会依次走过这条链。
      </p>

      <h3>为什么顺序会影响结果</h3>
      <p>
        关键在于：链上靠前的修饰符<strong>先拿到约束、先包住后面的一切</strong>。
        以 <code>padding</code> 和 <code>background</code> 为例——padding 会「内缩」可用区域，background
        则给「当前可用区域」上色。谁在前，谁就决定另一个作用在多大的范围上：
      </p>
      <CodeBlock lang="kotlin" title="同样两个修饰符，顺序不同结果不同" code={modifierOrderSnippet} />
      <Example title="一句话记住 padding 与 background 的顺序">
        <p>
          <strong>先 padding 再 background</strong>：留白在色块<strong>外面</strong>，边缘有一圈透明空白。
        </p>
        <p>
          <strong>先 background 再 padding</strong>：留白在色块<strong>里面</strong>，整块都上了色，
          padding 变成内容到色块边缘的内边距。
        </p>
        <p>
          同理，<code>clickable</code> 放在 <code>padding</code> 前后，决定「点击的热区是否包含那圈内边距」——
          想让 padding 也可点，就把 <code>clickable</code> 写在 <code>padding</code> <strong>之前</strong>。
        </p>
      </Example>
      <Callout variant="warn" title="顺序是 bug 的高发区">
        排查「为什么点不到 / 背景缺了一块 / 圆角没裁干净」时，第一反应应该是去看 Modifier 链的顺序。
        <code>clip</code> 要在 <code>background</code> 之前才能把背景也裁圆；想让整行可点又要有内边距，
        就把 <code>clickable</code> 放在 <code>padding</code> 之前。
      </Callout>

      <h3>常用 Modifier 速查</h3>
      <CodeBlock lang="kotlin" title="高频 Modifier" code={commonModifiers} />
      <table>
        <thead>
          <tr><th>Modifier</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>padding(...)</code></td><td>内边距，在尺寸之内留白；可分边设置</td></tr>
          <tr><td><code>size / width / height</code></td><td>固定尺寸；<code>fillMaxWidth/Height/Size</code> 撑满父容器</td></tr>
          <tr><td><code>fillMaxWidth(fraction)</code></td><td>按比例占父宽，<code>fillMaxWidth(0.5f)</code> 占一半</td></tr>
          <tr><td><code>clickable {'{}'}</code></td><td>让任意组件可点击，自带涟漪反馈</td></tr>
          <tr><td><code>background(...)</code></td><td>给当前可用区域填充颜色或画刷</td></tr>
          <tr><td><code>clip(shape)</code></td><td>按形状裁剪绘制内容与点击区域</td></tr>
          <tr><td><code>weight(...)</code></td><td>仅 Row / Column 内，按比例分主轴剩余空间</td></tr>
        </tbody>
      </table>

      <h3>约束与自适应：一句话</h3>
      <p>
        Compose 布局是<strong>单遍测量</strong>：父容器把「约束（最小 / 最大宽高）」往下传，子项在约束内量出
        自己的尺寸再报上去——所以同一段 UI 能在不同尺寸下自适应，靠的就是这套约束传递，而非写死像素。
      </p>

      <h2>三、长列表：LazyColumn 与按需渲染</h2>
      <p>
        如果用普通 <code>Column</code> 放 1 万个子项，Compose 会<strong>一次性全部创建</strong>，内存和性能直接崩。
        正确做法是用 <strong>Lazy 系列</strong>容器：它们只渲染<strong>当前屏幕可见（外加少量缓冲）</strong>的项，
        滑出去的项被回收复用——这就是对标传统 <code>RecyclerView</code> 的「可回收列表」，而且不用写
        Adapter / ViewHolder。
      </p>
      <KeyIdea>
        Lazy 容器（LazyColumn / LazyRow / LazyVerticalGrid）<strong>按需渲染</strong>：只为可见区域构建组件，
        滑动时复用。它们的内容不是普通 children，而是一个 <strong>DSL 作用域</strong>，你在里面用
        <code>item {'{}'}</code> 加单项、用 <code>items(list) {'{}'}</code> 批量加一组数据项。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="一个商品列表的 LazyColumn" code={lazyColumnSnippet} />

      <h3>key 为什么重要</h3>
      <p>
        给 <code>items(list, key = {'{ it.id }'})</code> 传一个稳定的 <strong>key</strong>，是性能与正确性的关键。
        没有 key 时，Compose 默认按<strong>位置</strong>识别项；一旦列表头部插入 / 删除 / 重排，所有后续项的位置都变了，
        Compose 会误以为「内容全变了」而大面积重组，还可能让滚动位置和动画错乱。
        有了基于数据 id 的 key，Compose 能精确识别「哪个数据项还是同一个」，从而<strong>精准复用</strong>、
        保住滚动位置、让增删动画顺滑。
      </p>
      <Callout variant="tip" title="key 选数据的唯一标识">
        key 应取数据的稳定唯一标识（如 <code>id</code>），<strong>不要</strong>用列表下标当 key——下标会随增删变化，
        等于没给 key。
      </Callout>

      <h3>LazyRow 与 LazyVerticalGrid</h3>
      <p>
        横向滑动的卡片条用 <strong>LazyRow</strong>；需要网格（如图库、商品宫格）用
        <strong>LazyVerticalGrid</strong>，通过 <code>columns</code> 指定列数：<code>GridCells.Fixed(n)</code>
        固定 n 列，<code>GridCells.Adaptive(minSize)</code> 则按可用宽度自动决定列数（自适应）。
        它们的 item / items DSL 与 key 规则和 LazyColumn 完全一致。
      </p>
      <CodeBlock lang="kotlin" title="LazyRow 与 LazyVerticalGrid" code={lazyGridSnippet} />

      <h2>四、对照：Modifier 顺序如何改变同一个列表行</h2>
      <Example title="一个列表行的两种修饰顺序">
        <p>
          上面的 <code>ProductRow</code> 写的是
          <code>clip(...).background(...).clickable {'{}'}.padding(16.dp)</code>：
        </p>
        <ul>
          <li><code>clip</code> 在最前 =&gt; 圆角能裁住背景，色块四角是圆的。</li>
          <li><code>clickable</code> 在 <code>padding</code> 前 =&gt; 整块（含将要内缩的区域）都可点。</li>
          <li><code>padding</code> 在最后 =&gt; 16dp 留白在色块<strong>内部</strong>，文字不贴边。</li>
        </ul>
        <p>
          若错写成 <code>padding(16.dp).clip(...).background(...)</code>，则色块会<strong>缩小一圈</strong>
          （padding 先把区域内缩），行与行之间凭空多出空白，点击热区也变小——这正是顺序带来的实质差异。
        </p>
      </Example>

      <Callout variant="tip">
        下一章我们给这些列表与卡片「穿上统一的衣服」：用 Material 3 的 ColorScheme / Typography / Shape
        定义主题，再用 animate*AsState、AnimatedVisibility 让状态变化与进出场动起来。
      </Callout>

      <Summary
        points={[
          '三大布局：Column 纵排、Row 横排、Box 层叠；Box 子项用 Modifier.align 定位。',
          'Arrangement 管主轴间距分布，Alignment 管交叉轴对齐，二者分属不同方向不要混淆。',
          'weight 仅在 Row / Column 内生效，按比例瓜分主轴剩余空间，对标 XML 的 layout_weight。',
          'Modifier 是有序修饰链，按书写顺序从外到内应用；padding 与 background 的先后会改变留白在色块内还是外。',
          '常用 Modifier：padding / size / fillMaxWidth / clickable / background / clip；clip 要在 background 前才能裁住背景。',
          'LazyColumn / LazyRow / LazyVerticalGrid 按需渲染、可回收，对标 RecyclerView；用 item / items 加项，并以数据 id 作 key 实现精准复用。',
        ]}
      />
    </article>
  )
}
