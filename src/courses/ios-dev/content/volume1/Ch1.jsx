import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const letVarSnippet = `// let 声明常量：一旦赋值就不能再改
let maxLevel = 99
// maxLevel = 100   // ❌ 编译错误：Cannot assign to value: 'maxLevel' is a 'let' constant

// var 声明变量：可以反复修改
var score = 0
score = 10
score += 5   // 现在是 15

// 编译器会"建议"你尽量用 let：
// 凡是声明后没被改过的 var，Xcode 会提示改成 let。
// 默认 let、需要变才 var，是 Swift 的惯用风格。`

const inferSnippet = `// 类型推断：编译器从右边的字面量推出类型
let title = "Swift 入门"      // 推断为 String
let count = 42               // 推断为 Int
let pi = 3.14159             // 推断为 Double
let isReady = true           // 推断为 Bool

// 显式类型标注：在变量名后写 ": 类型"
let level: Int = 1
let ratio: Double = 1        // 注意：标了 Double，整数 1 会当成 1.0
let name: String = "Ada"

// 什么时候必须显式标注？
// 1) 声明时不立即赋值
var nickname: String
nickname = "Lovelace"
// 2) 想要的类型和推断结果不一致（如上面的 ratio）`

const optionalSnippet = `// 普通 Int 永远有值，不可能是 nil
let a: Int = 10

// 可选 Int：在类型后加 ?，表示"要么是个 Int，要么是 nil"
var maybeAge: Int? = 30
maybeAge = nil               // ✅ 合法，可选类型可以装 nil

// 可选的本质是标准库里的一个枚举 Optional<Wrapped>：
//   enum Optional<Wrapped> {
//       case none            // 对应 nil
//       case some(Wrapped)   // 对应"包着一个值"
//   }
// 所以 Int? 只是 Optional<Int> 的语法糖，nil 只是 .none 的语法糖。

let x: Int? = 5
// 下面两种写法完全等价：
let y: Optional<Int> = .some(5)
let z: Int? = .none          // 等价于 nil`

let bindingSnippet = `let input: String? = readLine()

// 写法一：if let 可选绑定——解包成功才进入分支
if let text = input {
    print("你输入了：\\(text)")   // 这里 text 是非可选的 String
} else {
    print("没有输入")
}

// 写法二：guard let 提前返回——解包失败就 return，主流程保持"已解包"
func greet(_ name: String?) {
    guard let name = name else {
        print("名字为空，退出")
        return
    }
    // 从这一行往下，name 都是非可选 String，不用再嵌套
    print("你好，\\(name)！")
}

// Swift 5.7+ 还支持简写：if let input { ... } 同名时可省略 = input`

const coalesceChainSnippet = `// 空合并运算符 ??：可选为 nil 时取右边的默认值
let nickname: String? = nil
let display = nickname ?? "匿名用户"   // display 是非可选 String，结果 "匿名用户"

// 可选链 ?.：链条中任一环为 nil，整条表达式结果就是 nil
struct Address { var city: String? }
struct User { var address: Address? }

let user: User? = User(address: Address(city: "杭州"))
let city = user?.address?.city        // city 的类型是 String?
print(city ?? "未知城市")             // 杭州

// 强制解包 !：断言"我保证它不是 nil"，若真为 nil 则运行时崩溃
let forced: Int? = 7
let value = forced!                    // 7；但若 forced 是 nil，这行直接 crash`

const iuoSnippet = `// 隐式解包可选（Implicitly Unwrapped Optional）：类型后用 ! 而非 ?
// 声明时可为 nil，但使用时自动解包、当成非可选用——用错就崩。
// 典型场景：@IBOutlet、依赖注入后才赋值的属性。
var label: String! = nil
label = "标题"
print(label.count)   // 自动解包，无需写 label!`

const collectionSnippet = `// 数组 Array<Element>，可写成 [Element]
var fruits: [String] = ["苹果", "香蕉"]
fruits.append("橘子")
let first = fruits[0]
let firstSafe = fruits.first        // 类型是 String?（空数组时为 nil）

// 字典 Dictionary<Key, Value>，可写成 [Key: Value]
var scores: [String: Int] = ["语文": 90, "数学": 88]
scores["英语"] = 95
let math = scores["数学"]            // 类型是 Int?——查不到键就是 nil

// 集合 Set<Element>：无序、元素唯一
var tags: Set<String> = ["swift", "ios"]
tags.insert("swift")                // 重复插入无效，仍只有两个元素

// 字符串插值：用 \\(表达式) 把值嵌进字符串
let n = fruits.count
let summary = "共有 \\(n) 种水果，第一种是 \\(first)"`

export default function Ch1() {
  return (
    <article>
      <Lead>
        欢迎来到 Swift 语言基础。这一章我们打地基：先弄清 <code>let</code> 与 <code>var</code> 这对
        最基本的声明、类型推断与显式标注；再花大力气讲透 Swift 最有特色、也是初学者最容易困惑的
        <strong>可选类型 Optional</strong>——它用类型系统把「这里可能没有值」这件事摆到明面上，
        从根上消灭其它语言里那种「不知不觉访问空指针然后崩溃」的问题。最后过一遍基本类型、
        字符串插值与三种集合。学完你就能读懂绝大多数 Swift 代码里满天飞的 <code>?</code> 和 <code>!</code>。
      </Lead>

      <h2>一、let 与 var：常量与变量</h2>
      <p>
        Swift 用两个关键字声明存储：<code>let</code> 声明<strong>常量</strong>，赋值一次后不能再改；
        <code>var</code> 声明<strong>变量</strong>，可以反复修改。这不是风格偏好，而是编译器会强制执行的约束——
        给 <code>let</code> 二次赋值会直接编译失败。
      </p>
      <CodeBlock lang="swift" title="let 与 var 的基本用法" code={letVarSnippet} />
      <KeyIdea>
        Swift 的惯用风格是<strong>默认用 let，确实需要修改时才用 var</strong>。常量越多，代码的「不可变区域」
        越大，编译器越能帮你做优化、也越不容易出现「值在意料之外被改掉」的 bug。Xcode 甚至会主动提示你
        把没被修改过的 <code>var</code> 改成 <code>let</code>。
      </KeyIdea>

      <h2>二、类型推断与显式标注</h2>
      <p>
        Swift 是<strong>强类型、静态类型</strong>的语言：每个变量都有确定的类型，且在编译期就定下来。
        但你通常不必把类型写出来——编译器会从赋值的右侧<strong>推断</strong>出类型。这让代码既保持类型安全，
        又不啰嗦。
      </p>
      <CodeBlock lang="swift" title="推断 vs 显式标注" code={inferSnippet} />
      <p>
        要注意整数与浮点的区别：<code>let count = 42</code> 推断为 <code>Int</code>，而
        <code>let pi = 3.14</code> 推断为 <code>Double</code>。如果你想让一个整数字面量变成
        <code>Double</code>，就得显式标注，例如 <code>let ratio: Double = 1</code>，否则它会被当成 <code>Int</code>。
      </p>
      <Callout variant="tip" title="什么时候必须写类型？">
        两种情况编译器推断不出来，必须显式标注：①声明时<strong>不立即赋值</strong>（右边没有字面量可推断）；
        ②你想要的类型和推断结果<strong>不一致</strong>（比如希望整数当 <code>Double</code> 用）。
        其余情况能省则省，交给推断更清爽。
      </Callout>

      <h2>三、可选类型 Optional：Swift 的招牌设计</h2>
      <KeyIdea>
        在 Swift 里，一个普通类型（如 <code>Int</code>）<strong>永远有值，绝不可能是 nil</strong>。
        要表达「这里可能没有值」，必须用<strong>可选类型</strong>：在类型后加 <code>?</code>，
        写成 <code>Int?</code>、<code>String?</code> 等。可选类型把「有没有值」这件事编码进了类型系统，
        逼着你在用值之前先处理 nil 的可能——这就从源头消灭了隐式空指针崩溃。
      </KeyIdea>
      <p>
        在很多语言里，任何对象引用都可能是 null，但类型上看不出来；你一不小心访问了一个 null，
        程序就在运行时崩溃。Swift 反其道而行：默认所有值都「保证非空」，只有显式标了 <code>?</code> 的可选类型
        才允许为 nil，而且<strong>不解包就不能直接当普通值用</strong>。编译器在帮你「记账」：哪些值可能为空，
        必须先处理才能往下走。
      </p>
      <CodeBlock lang="swift" title="可选类型的声明与本质" code={optionalSnippet} />
      <p>
        最关键的一点：<strong>可选类型的本质是标准库里的一个枚举</strong> <code>Optional&lt;Wrapped&gt;</code>，
        它只有两个 case——<code>.none</code>（对应 <code>nil</code>）和 <code>.some(Wrapped)</code>（对应「包着一个值」）。
        所以 <code>Int?</code> 只是 <code>{'Optional<Int>'}</code> 的语法糖，<code>nil</code> 只是 <code>.none</code> 的语法糖。
        理解了这一点，你就明白为什么解包是必须的：你拿到的不是 <code>Int</code>，而是一个「装着 Int 或者什么都没装」的盒子，
        得先把盒子打开才能用里面的值。
      </p>

      <h2>四、解包：把值从可选的盒子里取出来</h2>
      <p>
        既然可选是个盒子，使用前就得「解包」（unwrap）。Swift 提供了多种解包方式，从最安全到最危险，
        各有适用场景。下面逐个讲。
      </p>

      <h3>1. 可选绑定：if let 与 guard let</h3>
      <p>
        <strong>可选绑定</strong>是最常用、最安全的解包方式：尝试把可选里的值绑定到一个新常量上，
        成功才进入分支。<code>if let</code> 在 if 体内使用解包后的值；<code>guard let</code> 则相反——
        解包失败就提前 <code>return</code>（或 break/continue/throw），让主流程保持「已解包」的扁平状态，
        避免层层嵌套的「金字塔」缩进。
      </p>
      <CodeBlock lang="swift" title="if let 与 guard let" code={bindingSnippet} />
      <Callout variant="info" title="guard 的提前返回风格">
        <code>guard</code> 的设计哲学是「先排除异常、让正常路径平铺直叙」。它的 <code>else</code> 分支
        <strong>必须</strong>跳出当前作用域（return / throw / break / continue），所以一旦越过 guard，
        编译器就确信被绑定的值一定存在。函数开头连写几个 guard 做前置校验，是非常地道的 Swift 写法。
      </Callout>

      <h3>2. 空合并 ??、可选链 ?.、强制解包 !</h3>
      <p>
        除了绑定，还有三种更紧凑的方式：
      </p>
      <ul>
        <li>
          <strong>空合并运算符</strong> <code>??</code>：可选为 nil 时取右边的默认值，结果是非可选类型。
          一行就能给出「有值用值、没值用兜底」。
        </li>
        <li>
          <strong>可选链</strong> <code>?.</code>：在一串属性 / 方法访问中，任一环为 nil 则整条表达式短路返回 nil。
          访问 <code>user?.address?.city</code> 时，只要中间任何一环是 nil，结果就是 nil（且类型是可选）。
        </li>
        <li>
          <strong>强制解包</strong> <code>!</code>：直接断言「它一定不是 nil」，强行取出里面的值。
          如果断言错了（实际是 nil），程序<strong>立即崩溃</strong>。这是最危险的方式，应尽量避免。
        </li>
      </ul>
      <CodeBlock lang="swift" title="?? / ?. / ! 三种紧凑写法" code={coalesceChainSnippet} />
      <Callout variant="warn" title="强制解包 ! 是 Swift 里的「定时炸弹」">
        每写一个 <code>!</code>，就等于向编译器和未来的自己保证「这里绝不可能是 nil」。一旦保证落空，
        程序当场崩溃，且崩溃点往往离真正的 bug 很远。除非你<strong>百分百确定</strong>（比如刚用字面量赋过值），
        否则永远优先用 <code>if let</code> / <code>guard let</code> / <code>??</code>。代码里的 <code>!</code> 越少越好。
      </Callout>

      <h3>3. 隐式解包可选（IUO）</h3>
      <p>
        还有一种特殊形态：在类型后写 <code>!</code> 而非 <code>?</code>，比如 <code>var label: String!</code>，
        这叫<strong>隐式解包可选</strong>——它声明时可以为 nil，但使用时会自动解包、当普通非可选值用
        （用的时候若为 nil 仍会崩）。它主要用于「声明时还没有值、但在第一次使用前一定会被赋值」的场景，
        典型如 UIKit 的 <code>@IBOutlet</code> 连线属性、或依赖注入后才填充的属性。日常代码里少用为妙。
      </p>
      <CodeBlock lang="swift" title="隐式解包可选 Int!（了解即可）" code={iuoSnippet} />

      <h3>解包方式速查表</h3>
      <table>
        <thead>
          <tr><th>方式</th><th>语法</th><th>结果类型</th><th>nil 时行为</th><th>安全性</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>if let 绑定</td>
            <td><code>if let v = opt {'{ ... }'}</code></td>
            <td>分支内为非可选</td>
            <td>不进入分支（走 else）</td>
            <td>安全，最常用</td>
          </tr>
          <tr>
            <td>guard let 绑定</td>
            <td><code>guard let v = opt else {'{ return }'}</code></td>
            <td>之后为非可选</td>
            <td>提前返回 / 跳出</td>
            <td>安全，适合前置校验</td>
          </tr>
          <tr>
            <td>空合并</td>
            <td><code>opt ?? 默认值</code></td>
            <td>非可选</td>
            <td>取右侧默认值</td>
            <td>安全，需要兜底值</td>
          </tr>
          <tr>
            <td>可选链</td>
            <td><code>a?.b?.c</code></td>
            <td>仍为可选</td>
            <td>整条短路为 nil</td>
            <td>安全，链式访问</td>
          </tr>
          <tr>
            <td>强制解包</td>
            <td><code>opt!</code></td>
            <td>非可选</td>
            <td>运行时崩溃</td>
            <td>危险，尽量避免</td>
          </tr>
          <tr>
            <td>隐式解包可选</td>
            <td>声明 <code>T!</code></td>
            <td>使用时当非可选</td>
            <td>使用时崩溃</td>
            <td>受限，特定场景</td>
          </tr>
        </tbody>
      </table>

      <Example title="同一个需求，三种解包写法对照">
        <p>需求：拿到一个可能为 nil 的用户名，没有就显示「游客」。</p>
        <p>
          <strong>if let 版</strong>：<code>if let name = username {'{ show(name) }'} else {'{ show("游客") }'}</code>，
          适合两个分支都要做事。
        </p>
        <p>
          <strong>guard let 版</strong>：函数开头 <code>guard let name = username else {'{ show("游客"); return }'}</code>，
          之后整段都能直接用 <code>name</code>，没有嵌套。
        </p>
        <p>
          <strong>空合并版</strong>：<code>let name = username ?? "游客"</code>，一行搞定，最简洁。
        </p>
      </Example>

      <h2>五、基本类型、字符串插值与集合</h2>
      <p>
        Swift 的基本类型包括 <code>Int</code>（整数）、<code>Double</code> / <code>Float</code>（浮点）、
        <code>Bool</code>（布尔）、<code>String</code>（字符串）、<code>Character</code>（单个字符）。
        字符串支持<strong>插值</strong>：在字符串里用 <code>\(表达式)</code> 把任意值嵌进去，
        比拼接 <code>+</code> 直观得多。
      </p>
      <p>
        三种核心集合：<strong>数组</strong> <code>Array</code>（有序、可重复，写作 <code>[Element]</code>）、
        <strong>字典</strong> <code>Dictionary</code>（键值对，写作 <code>[Key: Value]</code>）、
        <strong>集合</strong> <code>Set</code>（无序、元素唯一）。这里有一个和可选呼应的细节：
        通过下标取字典的值，或用 <code>.first</code> 取数组首元素，返回的都是<strong>可选类型</strong>——
        因为「键可能不存在」「数组可能为空」，Swift 用可选把这种「可能取不到」如实表达出来。
      </p>
      <CodeBlock lang="swift" title="基本类型、插值与三种集合" code={collectionSnippet} />
      <Callout variant="info" title="为什么字典下标返回的是可选？">
        <code>scores["数学"]</code> 的类型是 <code>Int?</code> 而不是 <code>Int</code>，
        因为你查的键<strong>未必存在</strong>。Swift 不会替你猜一个默认值，而是诚实地返回可选，
        逼你处理「查不到」的情况——这又是「用类型系统表达不确定性」的同一套哲学在集合上的体现。
      </Callout>

      <h2>六、小结与下一步</h2>
      <p>
        这一章的主线只有一条：<strong>Swift 用类型系统把「可能没有值」显式化</strong>。
        <code>let</code> / <code>var</code> 管「能不能改」，可选类型管「有没有值」，二者合起来让代码在编译期就消除了
        大量隐患。下一章我们进入枚举与模式匹配，你会发现可选本身就是枚举，而 <code>switch</code> 的穷尽性检查
        会把这套「编译期强制你处理所有情况」的哲学推向更广的舞台。
      </p>

      <Summary
        points={[
          'let 声明常量（不可改）、var 声明变量（可改）；Swift 惯用风格是默认 let、需要变才 var。',
          'Swift 是静态强类型语言，但能从字面量推断类型；声明时不赋值、或想要的类型与推断不一致时才需显式标注。',
          '可选类型在类型后加 ?（如 Int?），表示「可能有值也可能 nil」；它的本质是枚举 Optional<Wrapped>，只有 .some 和 .none 两个 case，nil 即 .none 的语法糖。',
          '可选用类型系统强制你在使用前处理 nil，从根上消灭了隐式空指针崩溃。',
          '解包方式：if let / guard let 可选绑定（安全、最常用，guard 走提前返回的扁平风格）、空合并 ?? 给默认值、可选链 ?. 短路、强制解包 ! 有崩溃风险应尽量避免。',
          '隐式解包可选 T!（如 Int!）声明可为 nil 但使用时自动解包，主要用于 @IBOutlet 等特定场景。',
          '基本类型有 Int/Double/Bool/String 等；字符串插值用 \\(x)；集合有 Array/Dictionary/Set，其中字典下标和数组 .first 都返回可选，呼应「用类型表达不确定性」的哲学。',
        ]}
      />
    </article>
  )
}
