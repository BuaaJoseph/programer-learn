import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const protocolBasicSnippet = `// 协议 = 一份"能力契约"，规定遵守者必须提供哪些方法/属性
protocol Greetable {
    var name: String { get }          // 必须有一个可读的 name
    func greet() -> String            // 必须实现 greet()
}

struct Cat: Greetable {
    let name: String
    func greet() -> String { "喵，我是 \\(name)" }
}

struct Robot: Greetable {
    let name: String
    func greet() -> String { "BEEP. ID=\\(name)" }
}`

const protocolExtensionSnippet = `// 协议扩展：给协议里的方法提供"默认实现"
// 这让协议像一个"带实现的接口"——遵守者不写也能用，写了就覆盖默认
extension Greetable {
    func greet() -> String {
        "你好，我是 \\(name)"      // 默认问候语
    }
    func greetLoudly() -> String {   // 协议里没声明，纯属扩展赠送的能力
        greet().uppercased()
    }
}

struct Dog: Greetable {
    let name: String
    // 没有写 greet()，直接复用默认实现
}

print(Dog(name: "旺财").greet())       // 你好，我是 旺财
print(Dog(name: "旺财").greetLoudly()) // 你好，我是 旺财（大写）`

const popVsInheritSnippet = `// 面向协议编程（POP）：用"组合多个小协议"替代"继承一棵大类树"
protocol Flyable { func fly() }
protocol Swimmable { func swim() }

extension Flyable { func fly() { print("起飞") } }
extension Swimmable { func swim() { print("游泳") } }

// 鸭子同时具备两种能力，靠组合协议得到——而非继承某个庞大基类
struct Duck: Flyable, Swimmable {}

let d = Duck()
d.fly()    // 起飞
d.swim()   // 游泳`

const stdProtocolSnippet = `// 几个最常用的标准协议，多数能让编译器"自动合成"实现
struct User: Identifiable, Equatable, Comparable, Codable {
    let id: Int            // Identifiable 要求有 id
    var name: String
    var age: Int

    // Comparable 只需实现 < ，其余 > <= >= 自动推导
    static func < (lhs: User, rhs: User) -> Bool {
        lhs.age < rhs.age
    }
}

// Equatable：自动按字段逐个比较，== 直接可用
let a = User(id: 1, name: "A", age: 20)
let b = User(id: 1, name: "A", age: 20)
print(a == b)              // true

// Codable：与 JSON 互转几乎零样板
let data = try JSONEncoder().encode(a)
let back = try JSONDecoder().decode(User.self, from: data)`

const genericFuncSnippet = `// 泛型函数：一份逻辑适配多种类型
func swapValues<T>(_ x: inout T, _ y: inout T) {
    let tmp = x; x = y; y = tmp
}

// 泛型类型：栈，元素类型由使用方决定
struct Stack<Element> {
    private var items: [Element] = []
    mutating func push(_ item: Element) { items.append(item) }
    mutating func pop() -> Element? { items.popLast() }
}

// 泛型约束 where：限定 T 必须遵守某协议，才能用该协议的能力
func maxValue<T>(_ items: [T]) -> T? where T: Comparable {
    items.max()
}`

const someAnySnippet = `// some（不透明类型）：编译期确定的"某一个具体类型"，对外只暴露协议
// 调用方不知道具体是什么，但编译器知道——零开销、可保持类型信息
func makeShape() -> some Shape {
    Circle()        // 必须每次返回"同一种"具体类型
}

// any（存在类型）：运行时装在一个盒子里的"任意遵守者"，类型被擦除
// 灵活但有间接层开销，可以在数组里混装不同具体类型
let shapes: [any Shape] = [Circle(), Square(), Triangle()]`

const someViewSnippet = `import SwiftUI

struct ProfileView: View {
    // body 返回 some View：具体类型由编译器从内容推断出来，
    // 它一定是"某一种确定的复杂嵌套类型"，但我们不必把那串类型名写出来。
    var body: some View {
        VStack {
            Text("标题")
            Text("副标题")
        }
    }
}`

const closureSnippet = `let nums = [5, 2, 8, 1, 9]

// 完整闭包写法
let sorted1 = nums.sorted(by: { (a: Int, b: Int) -> Bool in a < b })

// 类型推断 + 尾随闭包（闭包是最后一个参数时，可挪到圆括号外）
let sorted2 = nums.sorted { a, b in a < b }

// $0 $1 简写：省去参数名，按位置引用
let sorted3 = nums.sorted { $0 < $1 }

let doubled = nums.map { $0 * 2 }          // [10, 4, 16, 2, 18]
let evens   = nums.filter { $0 % 2 == 0 }  // [2, 8]`

const escapingSnippet = `// @escaping：闭包会"逃逸"出函数——被存起来、稍后才调用（如网络回调）
// 默认闭包是非逃逸的（函数返回前就用完）；要存起来必须显式标 @escaping
func fetchData(completion: @escaping (String) -> Void) {
    DispatchQueue.global().async {
        let result = "服务器数据"
        completion(result)     // 在函数早已返回之后才被调用
    }
}

fetchData { data in
    print("拿到：\\(data)")
}`

const comprehensiveSnippet = `// 综合例子：协议 + 协议扩展默认实现 + 泛型约束 + 闭包

// 1) 协议定义"能算分"这个能力契约
protocol Scorable {
    var score: Int { get }
}

// 2) 协议扩展提供默认实现（带实现的接口）
extension Scorable {
    var grade: String {
        switch score {
        case 90...: return "A"
        case 80..<90: return "B"
        default: return "C"
        }
    }
}

struct Student: Scorable { let name: String; let score: Int }

// 3) 泛型函数 + where 约束：对任意 Scorable 集合做处理
//    再用闭包参数把"如何提取排序键"交给调用方
func topRanked<T>(_ items: [T], by key: (T) -> Int) -> T?
    where T: Scorable {
    items.max { key($0) < key($1) }   // 闭包 + $0/$1 简写
}

let students = [
    Student(name: "小明", score: 88),
    Student(name: "小红", score: 95),
    Student(name: "小刚", score: 72),
]

if let top = topRanked(students, by: { $0.score }) {
    print("\\(top.name) 等级 \\(top.grade)")   // 小红 等级 A
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        如果说值类型是 Swift 的「世界观」，那么协议就是 Swift 组织代码的「方法论」。Swift 常被称作
        一门<strong>面向协议</strong>的语言：不是靠继承一棵庞大的类树来复用，而是靠定义小而专的能力契约、
        再用协议扩展赋予默认实现，把它们像积木一样组合起来。这一章我们从协议讲到面向协议编程，
        再到泛型与闭包——它们共同构成了写出地道、灵活、可复用 Swift 代码的核心工具箱，也是读懂
        SwiftUI 源码（比如那个神秘的 <code>some View</code>）的钥匙。
      </Lead>

      <h2>一、协议：定义一份「能力契约」</h2>
      <KeyIdea>
        <strong>协议（protocol）</strong>规定「一个类型要做什么」，而不规定「怎么做」。它列出一组
        方法、属性、下标等要求，任何<strong>遵守</strong>该协议的类型都必须提供这些能力。
        协议描述的是<strong>能力</strong>，不是<strong>身份</strong>——这让它比类继承灵活得多：
        一个类型可以同时遵守任意多个协议。
      </KeyIdea>
      <CodeBlock lang="swift" title="定义并遵守一个协议" code={protocolBasicSnippet} />
      <p>
        协议里属性要标明是 <code>{'{ get }'}</code> 还是 <code>{'{ get set }'}</code>，方法只写签名不写实现。
        struct、enum、class 都能遵守协议——这又一次体现了 Swift「能力优先于类型种类」的设计：
        值类型也能拥有丰富的抽象能力，不必为了「实现某接口」就被迫变成 class。
      </p>

      <h2>二、面向协议编程（POP）优于继承</h2>
      <p>
        传统 OOP 靠类继承复用代码：把公共逻辑塞进基类，子类继承。问题是继承是<strong>单一</strong>的、
        <strong>纵向</strong>的——只能继承一个父类，而且容易催生「为了复用某个方法，被迫继承一整棵
        我并不需要的庞大基类」的尴尬，行为也被锁死在层级里。
      </p>
      <KeyIdea>
        <strong>面向协议编程（POP）</strong>主张：把能力拆成一个个小协议，用<strong>组合</strong>替代
        <strong>继承</strong>。一个类型需要哪些能力，就遵守哪些协议，像拼装零件一样按需组合，
        而不是去爬一棵继承树。这就是 Swift 社区那句口号「<em>组合优于继承</em>」的落地方式。
      </KeyIdea>
      <CodeBlock lang="swift" title="用组合协议替代继承" code={popVsInheritSnippet} />
      <p>
        鸭子会飞也会游泳——在继承体系里这很别扭（飞行动物和游泳动物谁是父类？）；在 POP 里它只是
        同时遵守 <code>Flyable</code> 和 <code>Swimmable</code> 而已，干净利落。
      </p>

      <h2>三、协议扩展：让协议变成「带实现的接口」</h2>
      <p>
        光有契约还不够强大，真正让 POP 飞起来的是<strong>协议扩展（protocol extension）</strong>：
        你可以在扩展里为协议的要求提供<strong>默认实现</strong>，甚至添加协议本身没声明的全新方法。
      </p>
      <CodeBlock lang="swift" title="协议扩展提供默认实现" code={protocolExtensionSnippet} />
      <KeyIdea>
        协议本身只能声明「要有什么」；协议扩展则能写出「默认怎么做」。于是协议从一份纯契约升级成了
        一个<strong>带实现的接口</strong>：遵守者不写就用默认实现，写了就覆盖默认。大量「水平复用」的
        逻辑——日志、格式化、便捷方法——都能这样一次写好、所有遵守者共享，而完全不依赖继承。
      </KeyIdea>
      <Callout variant="note" title="标准库就是这么搭起来的">
        <code>Sequence</code> / <code>Collection</code> 上那些 <code>map</code>、<code>filter</code>、
        <code>reduce</code>、<code>first(where:)</code> 全是协议扩展里的默认实现：你的类型只要遵守
        协议、提供最少的几个核心要求，就能「免费」获得一整套高级方法。这就是 POP 的威力。
      </Callout>

      <h2>四、常见标准协议</h2>
      <p>
        Swift 标准库里有一批高频协议，很多还能让编译器<strong>自动合成</strong>实现（你只要写
        <code>: Equatable</code> 就行，无需手写 <code>==</code>）：
      </p>
      <table>
        <thead>
          <tr><th>协议</th><th>表示的能力</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Identifiable</code></td><td>有一个稳定的 <code>id</code></td><td>SwiftUI 的 <code>List</code> / <code>ForEach</code> 识别元素</td></tr>
          <tr><td><code>Equatable</code></td><td>能用 <code>==</code> 判等</td><td>比较、去重、SwiftUI diff</td></tr>
          <tr><td><code>Comparable</code></td><td>能用 <code>{'<'}</code> 排序</td><td><code>sorted()</code>、<code>min()</code>、<code>max()</code></td></tr>
          <tr><td><code>Codable</code></td><td>能与 JSON 等格式互转</td><td>网络请求、本地持久化</td></tr>
          <tr><td><code>Hashable</code></td><td>能算哈希</td><td>作 <code>Set</code> 元素或字典的 key</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="swift" title="同时遵守多个标准协议" code={stdProtocolSnippet} />

      <h2>五、泛型：一份逻辑，适配多种类型</h2>
      <p>
        <strong>泛型（generics）</strong>让你写出与具体类型无关的代码，把类型当成参数。
        类型占位符通常写成 <code>{'<T>'}</code>（或更有语义的名字如 <code>Element</code>），
        在使用时由编译器推断或指定为具体类型。
      </p>
      <CodeBlock lang="swift" title="泛型函数、泛型类型与 where 约束" code={genericFuncSnippet} />
      <p>
        关键是<strong>泛型约束</strong>：单纯的 <code>{'<T>'}</code> 是「任意类型」，你对它几乎啥也做不了。
        加上 <code>where T: Comparable</code> 之后，编译器才知道「这个 T 一定能比较大小」，
        你才能在函数体里调用 <code>.max()</code>。约束把「泛化的灵活」和「类型安全」结合了起来——
        协议在这里扮演了「能力门槛」的角色。
      </p>
      <Example title="泛型 + 协议是绝配">
        <p>
          <code>{'func topRanked<T>(_ items: [T]) where T: Scorable'}</code> 这种写法的意思是：
          「我不在乎你具体是学生还是球队，只要你遵守 <code>Scorable</code>（能给出 score），我就能给你排名。」
          一份逻辑，服务所有「能算分」的类型——这就是泛型与协议联手带来的复用力。
        </p>
      </Example>

      <h2>六、不透明类型 some vs 存在类型 any</h2>
      <p>
        这是 Swift 进阶里最容易绕晕、却又绕不开的一对概念。两者都用来表达「某个遵守协议的类型」，
        但取舍完全不同。
      </p>
      <KeyIdea>
        <strong>some（不透明类型）</strong>：「这里是<strong>某一个具体类型</strong>，编译期就确定了，
        只是我不告诉你它的名字。」每次返回必须是<strong>同一种</strong>具体类型，编译器保留完整类型信息，
        <strong>零运行时开销</strong>。<br />
        <strong>any（存在类型）</strong>：「这里装着<strong>任意一个</strong>遵守协议的值，具体类型在运行时才知道。」
        类型被<strong>擦除</strong>，可以在一个数组里混装不同具体类型，但有一层间接、带轻微开销。
      </KeyIdea>
      <CodeBlock lang="swift" title="some 与 any 的区别" code={someAnySnippet} />
      <p>
        一句话记忆：要「一个确定但不愿写出名字的类型、追求性能」用 <code>some</code>；要「一堆可能不同的类型
        混在一起、追求灵活」用 <code>any</code>。
      </p>
      <h3>那么——SwiftUI 的 body 为什么是 some View？</h3>
      <CodeBlock lang="swift" title="body: some View" code={someViewSnippet} />
      <p>
        当你在 <code>body</code> 里堆叠 <code>VStack</code>、<code>Text</code>，编译器其实推断出一个
        极其冗长的嵌套泛型类型（类似 <code>{'VStack<TupleView<(Text, Text)>>'}</code>）。它<strong>是</strong>
        一个确定的具体类型，但名字长到没人想手写。<code>some View</code> 正好满足这个场景：
        「body 返回的是<strong>某一个</strong>确定的具体 View 类型，让编译器替我推断出来。」
      </p>
      <p>
        为什么不用 <code>any View</code>？因为 SwiftUI 高度依赖具体类型信息来做高效 diff 与性能优化，
        类型擦除会丢掉这些信息、引入开销。<code>some</code> 既免去了书写超长类型名的痛苦，又完整保留了
        类型信息——这正是它被设计出来、并用在 <code>body</code> 上的根本原因。
      </p>

      <h2>七、闭包：可传递的「一段代码」</h2>
      <p>
        <strong>闭包（closure）</strong>是一段可以被当作值传来传去的代码块（其它语言里叫 lambda / 匿名函数）。
        Swift 给闭包配了一整套语法糖，从最啰嗦到最精简层层递进：
      </p>
      <CodeBlock lang="swift" title="闭包语法从完整到精简" code={closureSnippet} />
      <ul>
        <li><strong>类型推断</strong>：参数和返回类型能从上下文推出来时，可以全部省略。</li>
        <li><strong>尾随闭包</strong>：当闭包是函数的最后一个参数，可把它挪到圆括号<strong>外面</strong>，
        读起来像语言内置的控制块。</li>
        <li><strong><code>$0 / $1</code> 简写</strong>：连参数名都省了，按位置用 <code>$0</code>、<code>$1</code> 引用。</li>
      </ul>
      <Callout variant="note" title="$0 也要会读">
        <code>{'{ $0 < $1 }'}</code> 等价于 <code>{'{ a, b in a < b }'}</code>。
        SwiftUI 与函数式 API（<code>map</code> / <code>filter</code> / <code>reduce</code>）里
        <code>{'{ $0 ... }'}</code> 满天飞，读不懂简写就读不懂地道 Swift。
      </Callout>
      <h3>@escaping：逃逸闭包</h3>
      <p>
        默认情况下，闭包参数是<strong>非逃逸</strong>的——意味着它在函数返回前就会被用完。但很多场景
        （网络回调、延迟执行、存进属性稍后调用）需要闭包「活得比函数调用更久」，这时必须显式标
        <code>@escaping</code>，告诉编译器「这个闭包会逃逸出去，请妥善保留它」。
      </p>
      <CodeBlock lang="swift" title="@escaping 逃逸闭包" code={escapingSnippet} />
      <Callout variant="warn" title="逃逸闭包与循环引用">
        逃逸闭包会<strong>捕获</strong>它用到的外部变量；如果捕获了 <code>self</code>（引用类型），
        而 <code>self</code> 又持有这个闭包，就形成上一章说过的循环引用。常见解法是在捕获列表里写
        <code>{'[weak self]'}</code> 来打破环。值类型不参与 ARC，没有这个问题。
      </Callout>

      <h2>八、综合实战：协议 + 默认实现 + 泛型 + 闭包</h2>
      <p>
        把这一章的四样东西拧到一起：用协议定义能力、用协议扩展给默认实现、用带约束的泛型函数处理任意
        遵守者、再用闭包把「具体规则」交给调用方。
      </p>
      <CodeBlock lang="swift" title="四件套综合例子" code={comprehensiveSnippet} />
      <p>
        读一遍这段代码的脉络：<code>Scorable</code> 是契约（要有 score）；扩展里的 <code>grade</code>
        是所有遵守者免费获得的默认能力；<code>{'topRanked<T> where T: Scorable'}</code> 是一份能服务
        任何「可算分类型」的泛型逻辑；而 <code>{'by: { $0.score }'}</code> 这个尾随闭包，
        把「按哪个键排名」的决定权交还给了调用方。这就是地道 Swift 的样子。
      </p>

      <Summary
        points={[
          '协议（protocol）定义一份能力契约：只规定"要做什么"不规定"怎么做"，一个类型可遵守任意多个协议，值类型同样能拥有丰富抽象。',
          '面向协议编程（POP）用组合替代继承：把能力拆成小协议按需组合，避免单继承的纵向僵化，践行"组合优于继承"。',
          '协议扩展提供默认实现，让协议成为"带实现的接口"——遵守者不写就用默认、写了就覆盖；标准库的 map/filter 等正是这样搭起来的。',
          '常见标准协议：Identifiable / Equatable / Comparable / Codable / Hashable，多数可由编译器自动合成实现。',
          '泛型 <T> 让一份逻辑适配多类型，where 约束（如 T: Comparable）把灵活与类型安全结合；some 是编译期确定的单一具体类型（零开销、保留类型信息，故用于 body），any 是运行时类型擦除的任意遵守者（灵活但有开销）。',
          '闭包是可传递的代码块，语法从完整到 $0 简写层层精简；尾随闭包让调用更自然；@escaping 标记会逃逸的闭包，捕获 self 时注意用 [weak self] 防循环引用。',
        ]}
      />
    </article>
  )
}
