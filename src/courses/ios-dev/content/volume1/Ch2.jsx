import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const basicEnumSnippet = `// 最朴素的枚举：一组互斥的命名取值
enum Direction {
    case north
    case south
    case east
    case west
}

var heading = Direction.north
heading = .south              // 类型已知时可省略枚举名，直接写 .south

// 用 switch 处理每一种取值
switch heading {
case .north: print("向北")
case .south: print("向南")
case .east:  print("向东")
case .west:  print("向西")
}`

const rawValueSnippet = `// 原始值（raw value）：给每个 case 关联一个同类型的"底层值"
enum Planet: Int {
    case mercury = 1, venus, earth, mars   // 后续自动 2、3、4
}

let earth = Planet.earth
print(earth.rawValue)              // 3

// 用原始值反向构造——可能失败，所以返回的是可选类型 Planet?
let maybe = Planet(rawValue: 2)    // .venus
let none = Planet(rawValue: 99)    // nil

// String 原始值：不写则默认等于 case 名
enum Tab: String {
    case home, profile, settings
}
print(Tab.profile.rawValue)        // "profile"`

const assocEnumSnippet = `// 关联值（associated value）：每个 case 可以"携带"不同类型的数据
enum NetworkResult {
    case success(Data)             // 成功时带回数据
    case failure(Error)            // 失败时带回错误
    case loading(progress: Double) // 还能带命名参数
}

// 枚举可以有方法和计算属性
enum Shape {
    case circle(radius: Double)
    case rectangle(width: Double, height: Double)

    // 计算属性：根据当前 case 算面积
    var area: Double {
        switch self {
        case .circle(let r):
            return Double.pi * r * r
        case .rectangle(let w, let h):
            return w * h
        }
    }

    // 方法
    func describe() -> String {
        "面积约为 \\(area)"
    }
}

let c = Shape.circle(radius: 2)
print(c.area)          // 12.566...
print(c.describe())`

const switchMatchSnippet = `let result: NetworkResult = .loading(progress: 0.6)

switch result {
case .success(let data):                 // 值绑定：把关联值取出来用
    print("拿到 \\(data.count) 字节")
case .failure(let error):
    print("出错了：\\(error)")
case .loading(let progress) where progress < 1.0:   // where 子句：附加条件
    print("加载中 \\(Int(progress * 100))%")
case .loading:                           // 进度满了（不绑定也可以）
    print("即将完成")
}

// 还能匹配区间、元组、多个值合并
let score = 86
switch score {
case 90...100: print("优秀")
case 60..<90:  print("及格")            // 区间匹配
case 0, 1, 2:  print("个位数低分")       // 多值合并
default:       print("其它")
}`

const exhaustiveSnippet = `enum LoginState {
    case loggedOut
    case loggedIn(user: String)
    case banned
}

// ❌ 这样写编译不过：没有覆盖 .banned，Swift 报
//    "Switch must be exhaustive"
//
// switch state {
// case .loggedOut: ...
// case .loggedIn(let u): ...
// }   // 漏了 .banned → 编译错误

// ✅ 要么覆盖所有 case，要么用 default 兜底
func render(_ state: LoginState) -> String {
    switch state {
    case .loggedOut:
        return "请登录"
    case .loggedIn(let user):
        return "欢迎，\\(user)"
    case .banned:
        return "账号已封禁"
    }
}`

const resultSnippet = `// Result<Success, Failure> 是标准库枚举，把"成功值或失败错误"装进一个类型
//   enum Result<Success, Failure: Error> {
//       case success(Success)
//       case failure(Failure)
//   }

enum ParseError: Error {
    case empty
    case notANumber(String)
}

func parseAge(_ text: String) -> Result<Int, ParseError> {
    if text.isEmpty {
        return .failure(.empty)
    }
    guard let n = Int(text) else {
        return .failure(.notANumber(text))
    }
    return .success(n)
}

switch parseAge("30") {
case .success(let age):  print("年龄 \\(age)")
case .failure(let err):  print("解析失败：\\(err)")
}`

const throwsSnippet = `// 1) 定义错误类型：遵循 Error 协议的枚举（带关联值携带上下文）
enum BankError: Error {
    case insufficientFunds(needed: Int)
    case accountFrozen
}

// 2) throws 函数：声明它"可能抛出错误"
func withdraw(balance: Int, amount: Int, frozen: Bool) throws -> Int {
    if frozen {
        throw BankError.accountFrozen
    }
    guard balance >= amount else {
        throw BankError.insufficientFunds(needed: amount - balance)
    }
    return balance - amount
}

// 3) do / try / catch：调用可抛错的函数要用 try，并在 do 块里捕获
do {
    let rest = try withdraw(balance: 100, amount: 150, frozen: false)
    print("余额 \\(rest)")
} catch BankError.insufficientFunds(let needed) {
    print("还差 \\(needed) 元")               // 模式匹配捕获关联值
} catch {
    print("其它错误：\\(error)")               // error 是隐式常量
}`

const tryVariantsSnippet = `// try? —— 把"抛错"转成可选：成功得到值，失败得到 nil（吞掉错误）
let r1 = try? withdraw(balance: 100, amount: 30, frozen: false)   // 类型是 Int?

// 配合空合并给兜底值
let safeRest = (try? withdraw(balance: 100, amount: 30, frozen: false)) ?? 0

// try! —— 断言"绝不会抛错"，若真抛错则崩溃（和强制解包 ! 一样危险）
let r2 = try! withdraw(balance: 100, amount: 30, frozen: false)

// defer —— 无论函数如何离开（正常返回 / 抛错 / 提前 return），
//          都在作用域结束前执行，常用于资源清理
func readFile() throws {
    let handle = open()
    defer { handle.close() }    // 保证无论后面怎样都会关闭
    try handle.process()        // 即使这里抛错，defer 仍会执行
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们见过：可选类型的本质就是一个枚举。这一章把枚举讲透。Swift 的枚举远不止「一组命名常量」——
        它能给每个 case <strong>携带关联值</strong>、能有<strong>原始值</strong>、还能像结构体那样
        <strong>带方法和计算属性</strong>。配合 <code>switch</code> 的<strong>穷尽性检查</strong>，
        编译器会强制你处理每一种情况，少考虑一个分支就直接报错。我们还会讲标准库的 <code>Result</code> 类型，
        以及 Swift 完整的错误处理模型——<code>throws</code> / <code>do</code> / <code>try</code> / <code>catch</code> / <code>defer</code>。
      </Lead>

      <h2>一、最基础的枚举</h2>
      <p>
        枚举（enum）用来表达「一个值只能是有限几种取值之一」。最朴素的形态就是一组命名 case。
        当类型已知时，可以省略枚举名直接写 <code>.south</code> 这样的点语法。
      </p>
      <CodeBlock lang="swift" title="基础枚举与点语法" code={basicEnumSnippet} />
      <p>
        和很多语言不同，Swift 的枚举 case 默认<strong>没有底层整数值</strong>——<code>.north</code> 就是
        <code>.north</code>，不等于 0。它是一个独立的、类型安全的取值，而不是某个 <code>Int</code> 的别名。
        如果你确实想要底层值，那是下面要讲的「原始值」。
      </p>

      <h2>二、原始值 raw value</h2>
      <p>
        给枚举声明一个原始值类型（如 <code>Int</code>、<code>String</code>），就能为每个 case 关联一个
        同类型的固定底层值。<code>Int</code> 原始值可以自动递增，<code>String</code> 原始值不写时默认等于 case 名。
      </p>
      <CodeBlock lang="swift" title="原始值与可失败构造" code={rawValueSnippet} />
      <Callout variant="info" title="用原始值反向构造为什么返回可选？">
        <code>Planet(rawValue: 2)</code> 的类型是 <code>Planet?</code>，因为传入的原始值<strong>未必对应某个 case</strong>
        （比如 <code>99</code> 就没有对应的行星）。这又是第一章那套哲学：可能失败的操作，
        Swift 用<strong>可选类型</strong>如实表达，逼你处理「构造不出来」的情况。
      </Callout>

      <h2>三、关联值：Swift 枚举真正强大的地方</h2>
      <KeyIdea>
        <strong>关联值（associated value）</strong>让枚举的每个 case 都能携带一组它自己的数据，
        而且不同 case 携带的数据类型可以完全不同。这把枚举从「一组标签」升级成了
        「一种带数据的、互斥的状态表达」——这是 Swift 建模业务状态最有力的工具。
      </KeyIdea>
      <p>
        最经典的例子就是网络请求的结果：要么 <code>success</code> 并带回数据，要么 <code>failure</code> 并带回错误。
        用一个枚举就能把「结果是哪种」和「对应的数据」绑在一起，不可能出现「既成功又有错误」的非法状态。
        枚举还能像结构体一样定义<strong>方法</strong>和<strong>计算属性</strong>，在内部用 <code>switch self</code>
        根据当前是哪个 case 分别处理。
      </p>
      <CodeBlock lang="swift" title="带关联值的枚举，外加方法与计算属性" code={assocEnumSnippet} />

      <h2>四、switch 模式匹配：穷尽、绑定、where</h2>
      <p>
        枚举的最佳拍档是 <code>switch</code>。Swift 的 <code>switch</code> 比许多语言强大得多，它支持：
        从关联值里<strong>绑定取值</strong>、用 <code>where</code> 子句<strong>附加条件</strong>、
        匹配<strong>区间</strong>与<strong>元组</strong>、把多个值<strong>合并</strong>到一个分支。
        而且 Swift 的 case <strong>默认不会贯穿（fall through）</strong>，不用写 <code>break</code>。
      </p>
      <CodeBlock lang="swift" title="值绑定、where 子句与区间匹配" code={switchMatchSnippet} />

      <h3>穷尽性：编译器强制你覆盖所有情况</h3>
      <KeyIdea>
        Swift 的 <code>switch</code> 必须是<strong>穷尽的（exhaustive）</strong>：要么覆盖枚举的每一个 case，
        要么用 <code>default</code> 兜底。漏掉任何一个 case，编译器直接报错
        <code>{"'Switch must be exhaustive'"}</code>。这意味着——当你<strong>给枚举新增一个 case</strong> 时，
        所有没用 default 的 switch 都会编译失败，逼你回去补上对新情况的处理。这是「编译期捕获遗漏」的强力护栏。
      </KeyIdea>
      <CodeBlock lang="swift" title="穷尽性检查（漏 case 编译不过）" code={exhaustiveSnippet} />
      <Callout variant="tip" title="慎用 default 兜底">
        <code>default</code> 虽然方便，但它会<strong>关闭</strong>穷尽性给你的保护：以后新增 case，
        switch 不会报错，新情况会被悄悄塞进 default，可能引入隐藏 bug。
        对自己定义的、case 有限的枚举，<strong>宁可逐个列举</strong>，把 default 留给真正开放、取值无穷的类型。
      </Callout>

      <h2>五、Result 类型：把成功与失败装进一个值</h2>
      <p>
        标准库的 <code>{'Result<Success, Failure>'}</code> 就是关联值枚举的典范应用，它只有两个 case：
        <code>success(Success)</code> 与 <code>failure(Failure)</code>（其中 <code>Failure</code> 必须遵循 <code>Error</code>）。
        当你想把「结果」作为一个值<strong>传递、存储、延迟处理</strong>（而不是当场用 try/catch 抛出）时，
        <code>Result</code> 特别合适——常见于异步回调。
      </p>
      <CodeBlock lang="swift" title="用 Result 表达可能失败的解析" code={resultSnippet} />

      <h2>六、错误处理模型：throws / do / try / catch</h2>
      <p>
        除了把错误当返回值（Result），Swift 还有一套专门的<strong>抛出—捕获</strong>错误机制。它分三步：
      </p>
      <ul>
        <li><strong>定义错误</strong>：让一个类型（通常是枚举）遵循 <code>Error</code> 协议，关联值可携带上下文。</li>
        <li><strong>声明可抛出</strong>：在函数签名里写 <code>throws</code>，并在函数体内用 <code>throw</code> 抛出错误。</li>
        <li><strong>调用并捕获</strong>：调用可抛错函数前要加 <code>try</code>，并放进 <code>do</code> 块，用 <code>catch</code> 捕获。</li>
      </ul>
      <CodeBlock lang="swift" title="定义 Error、throws 函数与 do/try/catch" code={throwsSnippet} />
      <p>
        注意 <code>catch</code> 也能做<strong>模式匹配</strong>：<code>catch BankError.insufficientFunds(let needed)</code>
        能直接把错误的关联值取出来。不带条件的最后那个 <code>catch</code> 会捕获一切，
        其中有个隐式常量 <code>error</code> 指向被抛出的错误。
      </p>

      <h3>try? / try! / defer</h3>
      <p>
        围绕 <code>try</code> 还有两个变体和一个清理机制：
      </p>
      <ul>
        <li>
          <strong><code>try?</code></strong>：把「抛错」转成<strong>可选</strong>——成功得到值，失败得到 <code>nil</code>，
          错误被吞掉。它正是错误处理与第一章可选类型的接口，常和 <code>??</code> 配合给兜底值。
        </li>
        <li>
          <strong><code>try!</code></strong>：断言「这次绝不会抛错」，真抛了就<strong>崩溃</strong>。
          它和强制解包 <code>!</code> 一样危险，只在你百分百确定时用。
        </li>
        <li>
          <strong><code>defer</code></strong>：注册一段「离开作用域前一定执行」的代码，无论是正常返回、提前 return 还是抛错都会跑。
          专治资源清理（关文件、解锁、释放）。
        </li>
      </ul>
      <CodeBlock lang="swift" title="try? / try! / defer" code={tryVariantsSnippet} />

      <h3>错误处理三种方式对照</h3>
      <table>
        <thead>
          <tr><th>方式</th><th>写法</th><th>失败时</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>do / try / catch</td>
            <td><code>do {'{ try f() }'} catch {'{ ... }'}</code></td>
            <td>跳到 catch 处理</td>
            <td>需要区分并处理不同错误</td>
          </tr>
          <tr>
            <td>try?</td>
            <td><code>let v = try? f()</code></td>
            <td>得到 nil（吞错）</td>
            <td>不关心具体错误，只想要「有没有」</td>
          </tr>
          <tr>
            <td>try!</td>
            <td><code>let v = try! f()</code></td>
            <td>程序崩溃</td>
            <td>百分百确定不会抛错时</td>
          </tr>
          <tr>
            <td>Result</td>
            <td>返回 <code>{'Result<T, E>'}</code></td>
            <td>得到 <code>.failure</code></td>
            <td>把结果当值传递 / 异步回调</td>
          </tr>
        </tbody>
      </table>

      <Example title="把本章串起来：一个带关联值枚举 + switch + throws 的小流程">
        <p>
          定义错误枚举 <code>BankError</code>（遵循 <code>Error</code>，关联值携带「还差多少钱」），
          <code>withdraw</code> 函数声明 <code>throws</code>，余额不足时
          <code>throw .insufficientFunds(needed:)</code>。调用方用 <code>do / try / catch</code> 包住，
          并在 <code>catch</code> 里用<strong>模式匹配</strong>取出关联值给出精确提示——
          关联值枚举（建模错误）、throws（抛出）、switch/catch 的模式匹配（分类处理）三者就这样配合成一条完整链路。
        </p>
      </Example>

      <Callout variant="info" title="可选、Result、throws 是同一套思路的三种表达">
        它们都在回答「这个操作可能没结果 / 可能失败怎么办」：可选关心<strong>有没有值</strong>、
        Result 把<strong>成功或错误</strong>打包成可传递的值、throws 走<strong>抛出—捕获</strong>的控制流。
        三者之间还能互转（<code>try?</code> 把 throws 变可选）。理解了「用类型表达不确定性」，这一整套就贯通了。
      </Callout>

      <h2>七、小结</h2>
      <p>
        枚举是 Swift 建模「互斥状态」的核心工具，关联值让它能携带数据，方法 / 计算属性让它能自带行为；
        <code>switch</code> 的穷尽性把「处理所有情况」从自觉变成了编译期强制。错误处理则在此之上展开，
        和上一章的可选类型遥相呼应——它们都是「让不确定性显式、让编译器帮你兜底」这一 Swift 哲学的不同侧面。
      </p>

      <Summary
        points={[
          '枚举表达「一个值只能是有限几种取值之一」；默认 case 没有底层数字，是类型安全的独立取值，可用点语法 .case 简写。',
          '原始值（raw value）给每个 case 关联固定底层值（Int 可自增、String 默认等于 case 名）；用 init(rawValue:) 反向构造可能失败，故返回可选。',
          '关联值让每个 case 携带自己的数据（如 success(Data)/failure(Error)），不同 case 类型可不同；枚举还能带方法与计算属性（switch self 分情况处理）。',
          'switch 支持值绑定、where 附加条件、区间 / 元组 / 多值合并匹配，且默认不贯穿，无需 break。',
          'switch 必须穷尽：漏 case 直接编译错误；新增 case 会让未用 default 的 switch 报错，逼你补全——慎用 default 以免关闭这层保护。',
          'Result<Success, Failure> 是关联值枚举的典范，把「成功值或失败错误」打包成可传递的值，常用于异步回调。',
          '错误处理：定义遵循 Error 的类型 → throws 函数内 throw → 调用方 do/try/catch（catch 可模式匹配关联值）；try? 转可选、try! 失败崩溃、defer 保证作用域结束前清理。',
          '可选、Result、throws 是「表达不确定性」的三种形态，可互转，共享同一套「让编译器强制处理」的哲学。',
        ]}
      />
    </article>
  )
}
