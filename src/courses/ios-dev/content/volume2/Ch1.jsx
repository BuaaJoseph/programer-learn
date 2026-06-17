import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const structVsClassValue = `// struct 是值类型：赋值会"复制"出一份独立的数据
struct PointStruct {
    var x: Int
    var y: Int
}

var a = PointStruct(x: 1, y: 2)
var b = a          // 这里发生的是"复制"，b 是 a 的一份独立拷贝
b.x = 99           // 只改了 b 自己

print(a.x)         // 1   —— a 完全不受影响
print(b.x)         // 99`

const structVsClassRef = `// class 是引用类型：赋值只是"共享同一个实例"的引用
class PointClass {
    var x: Int
    var y: Int
    init(x: Int, y: Int) { self.x = x; self.y = y }
}

let a = PointClass(x: 1, y: 2)
let b = a          // a 和 b 指向"同一个对象"
b.x = 99           // 通过 b 改，其实改的就是那唯一的实例

print(a.x)         // 99  —— a 也跟着变了！
print(b.x)         // 99`

const mutatingSnippet = `struct Counter {
    private(set) var value = 0

    // 值类型里要"修改自身存储属性"的方法，必须标 mutating
    mutating func increment() {
        value += 1
    }
}

var c = Counter()  // 用 var 才能调用 mutating 方法
c.increment()
print(c.value)     // 1

let fixed = Counter()
// fixed.increment()  // ❌ 编译错误：let 修饰的值类型是完全不可变的`

const letImmutableSnippet = `struct Size { var w: Int; var h: Int }

// let 修饰值类型 => 连里面的属性都不能改（深层不可变）
let s = Size(w: 10, h: 20)
// s.w = 30        // ❌ 编译报错

// 对比：let 修饰引用类型 => 引用本身不能改，但对象内部仍可变
class Box { var n = 0 }
let box = Box()
box.n = 5          // ✅ 合法：box 这个"引用"没变，变的是它指向的对象
// box = Box()     // ❌ 不能让 box 指向另一个实例`

const cowSnippet = `// 写时复制（Copy-on-Write）：标准库集合的优化
var arr1 = [1, 2, 3]
var arr2 = arr1        // 此刻并未真的复制底层缓冲区，二者共享同一份存储

// 只有当你"准备写"其中一个时，才真正分裂出独立拷贝
arr2.append(4)         // 触发复制：arr2 拿到独立缓冲区，arr1 不受影响

print(arr1)            // [1, 2, 3]
print(arr2)            // [1, 2, 3, 4]
// 语义上仍是值类型（互不影响），但只读共享时省去了复制开销`

const swiftUIStateSnippet = `import SwiftUI

// SwiftUI 的 View 几乎全是 struct（值类型）
struct CounterView: View {
    // @State 持有的也是值类型；值变化 => SwiftUI 重新计算 body 并 diff
    @State private var count = 0

    var body: some View {
        VStack {
            Text("当前：\\(count)")
            Button("加一") { count += 1 }
        }
    }
}`

const arcWeakSnippet = `// 引用类型由 ARC（自动引用计数）管理生命周期：
// 计数归零即释放。两个对象互相强引用 => 计数永不归零 => 内存泄漏。
class Person {
    var pet: Pet?
}
class Pet {
    weak var owner: Person?   // 用 weak 打破循环引用，避免泄漏
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Swift 把类型分成两大阵营：<strong>值类型</strong>（struct、enum、以及所有基础类型）和
        <strong>引用类型</strong>（class）。它们看上去都能存数据、都能定义方法，但在「赋值、传参、共享」
        这件事上行为截然不同——这一条区别，是理解 Swift「值语义」与 SwiftUI 为何长这样的总开关。
        这一章我们把它讲透：复制 vs 共享、写时复制优化、mutating 与不可变、ARC 与循环引用，
        以及到底什么时候该用 struct、什么时候非 class 不可。
      </Lead>

      <h2>一、两种类型，两种世界观</h2>
      <KeyIdea>
        <strong>值类型</strong>在赋值或传参时会<strong>复制</strong>一份独立的数据，副本与原值互不影响；
        <strong>引用类型</strong>在赋值或传参时只是<strong>共享</strong>同一个实例的引用，通过任一引用修改，
        其它引用都会「看见」这次修改。一句话：值类型谈的是「内容相等」，引用类型谈的是「身份相同」。
      </KeyIdea>
      <p>
        在 Swift 里，用 <code>struct</code> 或 <code>enum</code> 定义的类型是值类型；用 <code>class</code>
        定义的类型是引用类型。绝大多数你天天用的东西——<code>Int</code>、<code>Double</code>、
        <code>Bool</code>、<code>String</code>、<code>Array</code>、<code>Dictionary</code>、
        <code>Set</code>——背后全是 struct，都是值类型。这与很多语言「对象默认是引用」的直觉相反，
        也正是 Swift 风格的根基。
      </p>

      <h2>二、眼见为实：改副本不影响原值 vs 改引用互相影响</h2>
      <p>
        最能说明问题的，是把同一段「赋值再修改」分别用 struct 和 class 跑一遍，观察原值有没有跟着变。
      </p>
      <CodeBlock lang="swift" title="struct：复制，各自独立" code={structVsClassValue} />
      <p>
        上面 <code>b = a</code> 复制出了一份全新的 <code>PointStruct</code>，改 <code>b.x</code> 跟
        <code>a</code> 毫无关系。换成 class，结果就完全反过来：
      </p>
      <CodeBlock lang="swift" title="class：共享，互相影响" code={structVsClassRef} />
      <p>
        注意 class 版本里我用的是 <code>let a</code> 和 <code>let b</code>，依然能改 <code>b.x</code>。
        这不是 bug——对引用类型，<code>let</code> 锁的是「引用本身不能再指向别的实例」，
        而实例<strong>内部</strong>的 <code>var</code> 属性照样能改。这点我们第五节会细讲。
      </p>

      <Example title="一个真实场景里的踩坑">
        <p>
          假设你有一个购物车 <code>cart</code>，想「先备份当前状态再做实验性修改」。如果购物车是
          struct，<code>let backup = cart</code> 就是一份安全快照，怎么改 <code>cart</code> 都伤不到
          <code>backup</code>。但如果购物车是 class，<code>backup</code> 和 <code>cart</code> 指向同一个对象，
          你以为留了后路，实际「备份」会跟着一起变——这是引用类型最常见的隐蔽 bug。
        </p>
      </Example>

      <h2>三、值类型为何「安全」：没有意外的远程修改</h2>
      <p>
        值语义最大的好处是<strong>本地推理</strong>（local reasoning）：当你拿到一个值类型变量，
        你可以确信「除非我自己动它，否则没人能偷偷改它」。函数把 struct 当参数收进去，收到的是副本，
        函数内部怎么折腾都不会波及调用方的原值。这消除了一整类「某处的修改莫名其妙影响到另一处」的
        并发与共享 bug，也让代码更容易测试和并发安全。
      </p>
      <p>
        引用类型则相反：把一个对象传给好几个地方后，任何一方的修改对其他持有者都是可见的。
        这种「共享可变状态」在需要协作时很强大，但也意味着你必须时刻警惕「谁还握着这个引用」。
      </p>

      <h2>四、写时复制（CoW）：值语义不等于「每次都真复制」</h2>
      <p>
        有人会担心：<code>Array</code> 是值类型，那把一个百万元素的数组赋值给另一个变量，
        岂不是每次都要把一百万个元素拷一遍？答案是<strong>不会</strong>。标准库集合用
        <strong>写时复制（Copy-on-Write，CoW）</strong>做了优化。
      </p>
      <KeyIdea>
        写时复制的策略是：<strong>只读时共享底层存储，真正要写入时才分裂出独立拷贝</strong>。
        于是「赋值」这一步几乎零成本（只共享一个缓冲区），只有当你<strong>修改</strong>其中一份时，
        才发生一次实际复制——但对外表现出来的语义，仍然是纯粹的值语义（两份互不影响）。
      </KeyIdea>
      <CodeBlock lang="swift" title="Array 的写时复制行为" code={cowSnippet} />
      <p>
        CoW 让 Swift 在「值语义的安全」和「引用共享的性能」之间拿到了两全。需要强调的是：
        CoW 是 <code>Array</code> / <code>Dictionary</code> / <code>Set</code> / <code>String</code>
        这些标准库类型<strong>内部实现</strong>的优化，你自己写的普通 struct 默认<strong>不</strong>自动具备
        CoW（要手动用一个 class 包裹的存储 + <code>isKnownUniquelyReferenced</code> 才能实现），
        但日常几乎用不到这种手写优化。
      </p>

      <h2>五、mutating 与不可变性</h2>
      <p>
        值类型的方法默认<strong>不能</strong>修改自身的存储属性，因为「修改一个值」在概念上等于
        「换成一个新值」。如果一个方法确实需要改自身属性，必须显式标注 <code>mutating</code>。
      </p>
      <CodeBlock lang="swift" title="mutating 方法" code={mutatingSnippet} />
      <p>
        这也解释了为什么 <code>mutating</code> 方法只能在用 <code>var</code> 声明的实例上调用：
        调用它本质上是「把旧值替换成改过的新值」，而 <code>let</code> 的值是不允许被替换的。
      </p>
      <p>
        关于 <code>let</code>，值类型和引用类型的「不可变」深度完全不同，这是新手最容易混淆的点：
      </p>
      <CodeBlock lang="swift" title="let 在值类型 vs 引用类型上的差异" code={letImmutableSnippet} />
      <table>
        <thead>
          <tr><th>声明</th><th>能换成别的实例吗</th><th>能改实例内部属性吗</th></tr>
        </thead>
        <tbody>
          <tr><td><code>let</code> + 值类型</td><td>不能</td><td><strong>不能</strong>（深层不可变）</td></tr>
          <tr><td><code>var</code> + 值类型</td><td>能</td><td>能</td></tr>
          <tr><td><code>let</code> + 引用类型</td><td>不能</td><td><strong>能</strong>（引用不变，对象可变）</td></tr>
          <tr><td><code>var</code> + 引用类型</td><td>能</td><td>能</td></tr>
        </tbody>
      </table>

      <h2>六、struct vs class 对比总表</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>struct（值类型）</th><th>class（引用类型）</th></tr>
        </thead>
        <tbody>
          <tr><td>赋值 / 传参</td><td>复制独立副本</td><td>共享同一实例的引用</td></tr>
          <tr><td>相等语义</td><td>看内容（可自动合成 <code>Equatable</code>）</td><td>看身份（<code>===</code> 比较是否同一对象）</td></tr>
          <tr><td>内存管理</td><td>无需 ARC，随作用域自动释放</td><td>由 ARC 引用计数管理</td></tr>
          <tr><td>继承</td><td>不支持类继承</td><td>支持继承与多态</td></tr>
          <tr><td>可变性控制</td><td><code>let</code> 即深层不可变；改自身需 <code>mutating</code></td><td><code>let</code> 仅锁引用，内部仍可变</td></tr>
          <tr><td>身份概念</td><td>无身份，只有值</td><td>有唯一身份</td></tr>
          <tr><td>典型用途</td><td>建模数据、状态、SwiftUI View</td><td>需共享 / 身份 / 继承 / OC 互操作</td></tr>
        </tbody>
      </table>

      <h2>七、SwiftUI 为什么偏爱 struct</h2>
      <p>
        SwiftUI 里的视图——<code>Text</code>、<code>VStack</code>、你自己写的
        <code>{'struct ContentView: View'}</code>——几乎清一色是 struct。这不是巧合，
        而是值语义和声明式 UI 的天作之合。
      </p>
      <KeyIdea>
        SwiftUI 的核心是「<strong>状态驱动视图</strong>」：状态一变，框架重新计算 <code>body</code>
        得到一棵新的视图描述，再和旧的做 <strong>diff</strong>，只把真正变化的部分更新到屏幕。
        值语义让「新旧两棵视图树」成为两份独立、可放心比较的快照，状态变化变得<strong>可预测、可比较</strong>，
        这正是高效 diff 的前提。
      </KeyIdea>
      <CodeBlock lang="swift" title="SwiftUI View 是 struct" code={swiftUIStateSnippet} />
      <p>
        因为 View 是轻量的值类型，SwiftUI 可以毫无心理负担地频繁创建、丢弃、重建它们——它们只是对
        「界面此刻应该长什么样」的廉价描述，而非真正持有屏幕资源的重对象。如果 View 是 class，
        共享可变状态会让「这棵树和上一棵是不是同一份」变得难以判断，diff 也就无从谈起。
      </p>
      <Callout variant="tip" title="经验法则">
        在 Swift / SwiftUI 里，<strong>默认先用 struct</strong>。先把数据、模型、视图都建成值类型，
        只有当你遇到「确实需要引用类型」的明确信号时，再升级为 class。
      </Callout>

      <h2>八、那 class 什么时候才必要？</h2>
      <p>
        值类型虽好，但有几类需求是 struct 天生满足不了的，这时候 class 才是对的工具：
      </p>
      <ul>
        <li><strong>需要身份（identity）</strong>：当「是不是同一个东西」本身有意义，比如一个网络连接、
        一个数据库会话、一个被多处观察的共享控制器——你关心的是「这一个实例」，而非它当前的值。</li>
        <li><strong>需要共享可变状态</strong>：多个地方要持有并修改<strong>同一份</strong>数据（如全局的用户登录态、
        一个被多个视图共享的 ViewModel），引用语义恰好提供了「改一处、处处可见」。</li>
        <li><strong>需要继承与多态</strong>：要建立类的层级、用基类引用调用子类重写的方法时，只有 class 能做到。</li>
        <li><strong>Objective-C 互操作</strong>：需要桥接到 OC API、用 <code>@objc</code>、继承
        <code>NSObject</code>（如某些 UIKit / 系统框架类型）时，必须是 class。</li>
      </ul>

      <h2>九、ARC 与循环引用（一句话版）</h2>
      <p>
        引用类型的生命周期由 <strong>ARC（自动引用计数）</strong>管理：有几个强引用指向一个对象，
        它的计数就是几，计数归零时对象被释放。隐患在于<strong>循环引用</strong>——两个对象互相强引用，
        计数永远到不了零，于是谁也释放不掉，造成内存泄漏。解法是把其中一条引用改成
        <code>weak</code>（或 <code>unowned</code>）来打破环。
      </p>
      <CodeBlock lang="swift" title="用 weak 打破循环引用" code={arcWeakSnippet} />
      <Callout variant="warn" title="值类型没有这个烦恼">
        struct / enum 不参与 ARC，也就根本不存在引用循环这回事——这又是「默认用值类型」的一个理由。
        循环引用是引用类型独有的负担，闭包捕获 <code>self</code> 时尤其常见（用
        <code>{'[weak self]'}</code> 捕获列表处理），后续讲闭包时会再遇到。
      </Callout>

      <Summary
        points={[
          'struct/enum 是值类型：赋值与传参会复制独立副本，改副本不影响原值；class 是引用类型：赋值只是共享同一实例，通过任一引用修改其它引用都会看见。',
          '值语义带来本地推理与安全：拿到一个值就能确信没人会偷偷改它，天然规避共享可变状态的一类 bug。',
          '写时复制（CoW）是标准库集合的优化：只读时共享底层存储，真要写入时才分裂拷贝，对外仍是纯值语义，兼顾安全与性能。',
          'mutating 让值类型方法可改自身（仅限 var 实例）；let 修饰值类型是深层不可变，修饰引用类型只锁引用、对象内部仍可变。',
          'SwiftUI 偏爱 struct：值语义让新旧视图树成为可放心比较的独立快照，使状态可预测、便于 diff 高效更新。',
          'class 在需要身份、共享可变状态、继承多态、或 Objective-C 互操作时才必要；引用类型由 ARC 管理，互相强引用会造成循环引用泄漏，用 weak 打破。',
        ]}
      />
    </article>
  )
}
