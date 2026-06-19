import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SwiftDataFlow from '@/courses/ios-dev/illustrations/SwiftDataFlow.jsx'

const stateBasic = `import SwiftUI

struct CounterView: View {
    // @State：这个视图私有的本地可变状态
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("当前计数：\\(count)")   // 读 count
                .font(.title)
            Button("加一") {
                count += 1                // 改 count → 触发 body 重算 → 界面刷新
            }
        }
        .padding()
    }
}`

const dollarBinding = `struct ToggleDemo: View {
    @State private var isOn = false

    var body: some View {
        VStack {
            // $isOn 取得对该 @State 的 Binding（双向引用）
            Toggle("开关", isOn: $isOn)
            Text(isOn ? "已开启" : "已关闭")
        }
        .padding()
    }
}`

const textFieldBinding = `struct NameForm: View {
    @State private var name = ""

    var body: some View {
        VStack(alignment: .leading) {
            // TextField 需要一个 Binding<String>：用 $ 取得
            TextField("请输入名字", text: $name)
                .textFieldStyle(.roundedBorder)
            Text(name.isEmpty ? "（还没输入）" : "你好，\\(name)")
        }
        .padding()
    }
}`

const bindingChild = `import SwiftUI

// 子视图：自己不「拥有」状态，只持有上层 @State 的读写引用
struct StepperRow: View {
    let title: String
    @Binding var value: Int          // 注意是 @Binding，不是 @State

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Button("-") { value -= 1 }   // 改的是上层那个源头
            Text("\\(value)").frame(minWidth: 32)
            Button("+") { value += 1 }
        }
    }
}

// 父视图：单一数据源在这里
struct CounterScreen: View {
    @State private var apples = 0      // 源头：唯一可信状态
    @State private var pears = 0

    var body: some View {
        VStack(spacing: 12) {
            // 用 $ 把 @State 的 Binding 传给子视图
            StepperRow(title: "苹果", value: $apples)
            StepperRow(title: "梨",  value: $pears)
            Divider()
            Text("合计：\\(apples + pears)")   // 子视图一改，这里立刻同步
                .font(.headline)
        }
        .padding()
    }
}`

const liftingBad = `// 不好：状态藏在子视图里，父视图想用却拿不到
struct ChildView: View {
    @State private var text = ""        // 状态被「锁」在子视图内部
    var body: some View {
        TextField("输入", text: $text)
    }
}
// 父视图无法读到 text，也无法和兄弟视图共享 → 需要状态提升`

const liftingGood = `// 好：把状态提升到能覆盖所有用到它的视图的最近公共父节点
struct ParentView: View {
    @State private var text = ""        // 提升到父视图，作为单一数据源

    var body: some View {
        VStack {
            ChildInput(text: $text)     // 用 $ 下传 Binding
            Text("实时预览：\\(text)")    // 同级也能读到同一个源头
        }
    }
}

struct ChildInput: View {
    @Binding var text: String
    var body: some View {
        TextField("输入", text: $text)
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们让界面「长出来了」，但它还是死的——点按钮没反应、输入框改不了文字。
        这一章要点亮 SwiftUI 真正的灵魂：<strong>状态驱动</strong>。你只要改一个被视图读取的状态值，
        框架就会自动重算 <code>body</code> 并刷新界面，你<strong>永远不用手动去更新控件</strong>。
        我们会讲透 <code>@State</code>（视图私有的本地状态）、<code>$</code> 取得的 <code>Binding</code>、
        <code>@Binding</code>（把状态的读写引用传给子视图实现双向绑定），以及背后的单一数据源、
        单向数据流和状态提升。
      </Lead>

      <h2>一、SwiftUI 的灵魂：改状态 → 自动刷新</h2>
      <KeyIdea>
        SwiftUI 的核心机制是：<strong>把可变状态标记出来，状态一变，框架就自动重算用到它的 body，
        刷新对应界面</strong>。你声明「界面 = 状态的函数」，框架负责「状态变了之后怎么把屏幕改对」。
        这就是 <code>{'UI = f(state)'}</code> 的运行时含义。
      </KeyIdea>
      <p>
        对比上一章提过的 UIKit：那里你得 <code>label.text = "\\(count)"</code> 亲手把新值写回控件，
        漏写一处界面就和数据脱节了。SwiftUI 把这件事反过来——你只管改 <strong>状态</strong>，
        界面是状态的投影，框架保证投影永远是最新的。下面这个交互图把各种「状态来源」摊开，
        点一个看它扮演什么角色：
      </p>
      <SwiftDataFlow />

      <h2>二、@State：视图私有的本地可变状态</h2>
      <KeyIdea>
        <code>@State</code> 声明一份<strong>由当前视图私有、拥有</strong>的本地可变状态。它的值一旦变化，
        SwiftUI 就重新计算这个视图的 <code>body</code>，从而刷新界面。它适合<strong>简单类型</strong>
        （计数、开关、输入文本）和<strong>视图私有</strong>的小状态。
      </KeyIdea>
      <p>
        为什么需要这个特殊标记？回忆上一章：视图是 <strong>struct（值类型）</strong>，每次 <code>body</code>
        重算都会被重新生成。普通存储属性会随之「重置」，存不住跨刷新的状态。<code>@State</code>
        是一个属性包装器，它把真实存储放在视图<strong>之外</strong>由框架托管，于是值能跨越多次
        <code>body</code> 重算而保持；同时框架知道「谁读了它」，值变时就只刷新相关视图。
      </p>
      <CodeBlock lang="swift" title="@State 计数器：改值即刷新" code={stateBasic} />
      <p>
        点「加一」执行 <code>count += 1</code>，框架监测到 <code>count</code> 变了，重算
        <code>CounterView</code> 的 <code>body</code>，<code>Text</code> 里的 <code>\\(count)</code>
        随之更新。整个过程你没有去碰任何 <code>Text</code> 对象。
      </p>
      <Callout variant="tip" title="约定：@State 几乎总是 private">
        既然 <code>@State</code> 表达的是「视图私有」状态，惯例就写成 <code>@State private var</code>。
        它不该被外部直接赋值；要让外部参与读写，应该用 <code>@Binding</code>（见下文）。
      </Callout>

      <h2>三、用 $ 取得 Binding</h2>
      <p>
        当一个控件需要<strong>双向</strong>读写某个状态（比如 <code>Toggle</code> 要能读当前开关、
        也要能在用户拨动时把新值写回），它要的不是值本身，而是一个 <strong><code>Binding</code></strong>——
        一个「能读也能写」这块状态的引用。对一个 <code>@State</code> 属性加 <strong><code>$</code></strong>
        前缀，就能取得它的 <code>Binding</code>。
      </p>
      <CodeBlock lang="swift" title="$isOn 把 Binding 交给 Toggle" code={dollarBinding} />
      <CodeBlock lang="swift" title="TextField 也吃 Binding" code={textFieldBinding} />
      <p>
        这里有三个层次别混：<code>count</code> 是<strong>值</strong>（读出来用）；
        <code>$count</code> 是它的 <strong>Binding</strong>（读写引用，传给需要双向绑定的控件）；
        而 <code>_count</code>（很少直接用）才是底层那个 <code>State</code> 包装器实例。日常你只需记住
        「读值用名字、要双向就加 <code>$</code>」。
      </p>
      <table>
        <thead>
          <tr><th>写法</th><th>是什么</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>count</code></td><td>当前值（如 Int）</td><td>在 body 里读出来显示 / 计算</td></tr>
          <tr><td><code>$count</code></td><td>Binding（读写引用）</td><td>传给 Toggle / TextField / 子视图</td></tr>
          <tr><td><code>_count</code></td><td>State 包装器本体</td><td>极少直接用（如自定义初始化）</td></tr>
        </tbody>
      </table>

      <h2>四、@Binding：不拥有状态，只持有上层的读写引用</h2>
      <KeyIdea>
        <code>@Binding</code> 声明的属性<strong>不拥有</strong>状态，它持有的是对<strong>上层某个 @State 的读写引用</strong>。
        子视图读它就是读源头，改它就是改源头——这就实现了父子之间的<strong>双向绑定</strong>。
      </KeyIdea>
      <p>
        当你要把一块状态<strong>下发</strong>给子视图，并允许子视图修改它时，子视图就用 <code>@Binding</code>
        声明这个属性。父视图在传参时用 <code>$</code> 把自己 <code>@State</code> 的 Binding 交下去。
        于是父子共享<strong>同一个源头</strong>，不存在「子视图拿到一份拷贝、改了父视图不知道」的问题。
      </p>
      <CodeBlock lang="swift" title="计数器：父 @State + 子 @Binding 的完整例子" code={bindingChild} />
      <p>
        看清这条链路：源头是 <code>CounterScreen</code> 里的 <code>@State apples</code>；它通过
        <code>value: $apples</code> 把 Binding 交给子视图 <code>StepperRow</code>；子视图里
        <code>@Binding var value</code> 持有这个引用，按「+」执行 <code>value += 1</code> 实际改的是
        <code>apples</code>；<code>apples</code> 一变，框架重算 <code>CounterScreen</code> 的 body，
        底部 <code>合计：\\(apples + pears)</code> 立刻同步。子视图<strong>自己不存</strong>这个数。
      </p>
      <Example title="@State vs @Binding 一句话">
        <p>
          <strong>@State</strong>：「这块状态归我（这个视图）所有，我是源头。」
        </p>
        <p>
          <strong>@Binding</strong>：「这块状态不是我的，我只拿到一个能读能写它的引用，改它就是改源头。」
        </p>
      </Example>

      <h2>五、单一数据源与单向数据流</h2>
      <p>
        把上面的例子抽象一下，就得到 SwiftUI（也是 React、Jetpack Compose 共有）的两条基本纪律：
      </p>
      <ul>
        <li>
          <strong>单一数据源（single source of truth）</strong>：每块状态只有<strong>一个</strong>权威所有者
          （用 <code>@State</code> 持有），其他视图都引用它，绝不各存一份拷贝。
        </li>
        <li>
          <strong>单向数据流</strong>：状态<strong>向下</strong>流给子视图（值或 Binding），事件 / 修改
          <strong>向上</strong>回到源头去改那唯一的状态，状态再向下重新流——形成一个清晰的环，而不是
          四处互相直接改来改去。
        </li>
      </ul>
      <Callout variant="info" title="和 React / Compose 是同一套心智">
        如果你写过 React，<code>@State</code> 约等于 <code>useState</code>，<code>$value</code> 下传约等于把
        <code>value</code> 和 <code>setValue</code> 一起传给子组件；Jetpack Compose 里则对应
        <code>remember {'{ mutableStateOf(...) }'}</code> 加「state hoisting」。换了语言，骨架完全一致。
      </Callout>

      <h2>六、状态该放在哪一层：状态提升</h2>
      <p>
        既然要单一数据源，一个现实问题就来了：某块状态到底声明在<strong>哪个视图</strong>里？规则很简单——
        把它放在<strong>所有需要读写它的视图的「最近公共父节点」</strong>。如果状态藏得太深（在某个子视图里），
        它的兄弟视图或父视图就够不着；这时就要把它<strong>提升（lift）</strong>到更上层。
      </p>
      <CodeBlock lang="swift" title="反例：状态藏在子视图里，外面够不着" code={liftingBad} />
      <CodeBlock lang="swift" title="正例：把状态提升到公共父节点，再用 $ 下传" code={liftingGood} />
      <p>
        提升后，父视图持有唯一的 <code>@State</code>，把 Binding 用 <code>$</code> 下传给真正负责输入的子视图，
        同级的「预览」也能读到同一个源头。这就是「状态提升」：让状态住在<strong>恰好够高</strong>的那一层——
        不要更高（否则无关视图也被牵连重算），也不要更低（否则该用的人够不着）。
      </p>

      <h2>七、@State 的注意事项与边界</h2>
      <Callout variant="warn" title="别用 @State 存「该由模型持有」的长生命周期状态">
        <code>@State</code> 是给<strong>视图私有、生命周期跟着视图走</strong>的简单状态用的（计数、开关、临时输入）。
        不要拿它去存「用户的购物车」「登录会话」「从服务器拉来的领域数据」这类<strong>应由模型层持有、
        需要跨视图共享或长期存活</strong>的状态——那是 <code>@Observable</code> 模型 / <code>@Environment</code>
        的活（后续章节讲）。用错层会导致状态随视图重建而丢失，或多处不一致。
      </Callout>
      <ul>
        <li><strong>@State 写 private</strong>：它表达视图私有，外部要参与就改用 @Binding 下传。</li>
        <li><strong>简单值优先</strong>：@State 最适合 Int / Bool / String 这类值类型的小状态。</li>
        <li><strong>别复制状态</strong>：需要共享时传 Binding（同一个源头），不要在多处各 @State 一份。</li>
        <li><strong>状态放对层</strong>：放在最近公共父节点，过高过低都会带来问题。</li>
        <li><strong>领域数据交给模型</strong>：长生命周期 / 跨视图共享的数据不归 @State，留给 @Observable / @Environment。</li>
      </ul>

      <Callout variant="tip">
        到这里你已经掌握了 SwiftUI 最关键的一条主线：状态驱动界面。<code>@State</code> 管视图私有的小状态，
        <code>@Binding</code> 把读写引用下传实现双向绑定，配合单一数据源 + 状态提升就能撑起大多数界面。
        当状态变成「需要被很多视图共享的领域模型」时，就该请出 <code>@Observable</code> 与
        <code>@Environment</code>——那是下一章的内容。
      </Callout>

      <Summary
        points={[
          'SwiftUI 的灵魂是状态驱动：改一个被读取的状态，框架自动重算 body 并刷新界面，你从不手动更新控件。',
          '@State 是视图私有、由当前视图拥有的本地可变状态，适合简单类型；值变就触发该视图 body 重算。',
          '对 @State 加 $ 前缀取得 Binding（读写引用）；count 是值、$count 是 Binding，传给 Toggle/TextField 实现双向绑定。',
          '@Binding 不拥有状态，只持有对上层 @State 的读写引用；父用 $ 下传、子用 @Binding 接收，改它即改源头。',
          '遵循单一数据源 + 单向数据流（与 React 的 useState、Compose 的 state hoisting 同一心智）。',
          '状态提升：把状态放在所有用到它的视图的最近公共父节点——不要更高也不要更低。',
          '别用 @State 存应由模型持有的长生命周期 / 跨视图共享数据，那是 @Observable / @Environment 的职责。',
        ]}
      />
    </article>
  )
}
