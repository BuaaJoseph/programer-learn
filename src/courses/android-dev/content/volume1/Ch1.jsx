import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const valVarSnippet = `// val：只读引用，初始化后不可重新赋值（类似 Java 的 final）
val name = "Kotlin"   // 类型推断为 String
// name = "Java"      // 编译错误：Val cannot be reassigned

// var：可变引用，可重新赋值
var count = 0         // 类型推断为 Int
count = count + 1     // OK

// 也可以显式写类型
val pi: Double = 3.14
var title: String = "Android"`

const nullSafetySnippet = `// 默认不可空：String 永远不会是 null
var name: String = "Kotlin"
// name = null        // 编译错误：Null can not be a value of a non-null type String

// 可空类型：在类型后加 ?
var nickname: String? = "K"
nickname = null       // OK

// 安全调用 ?.：为 null 时整体返回 null，不抛异常
val len: Int? = nickname?.length

// Elvis 操作符 ?:：左侧为 null 时取右侧默认值
val safeLen: Int = nickname?.length ?: 0

// 非空断言 !!：强行断言非空，若实际为 null 则抛 NullPointerException
val danger: Int = nickname!!.length  // 风险点：nickname 为 null 时崩溃`

const javaNpeSnippet = `// Java：编译期不区分可空与非空，运行时随时可能 NPE
String name = getName();        // 可能返回 null
int len = name.length();        // 若 name 为 null，运行时抛 NullPointerException

// Kotlin：把「可不可空」写进类型系统，编译期就拦住大部分 NPE
val name: String? = getName()   // 类型明确告诉你「可能为 null」
val len = name?.length ?: 0     // 编译器强制你处理 null 的情况`

const functionSnippet = `// 基本函数：fun 名称(参数: 类型): 返回类型 { ... }
fun add(a: Int, b: Int): Int {
    return a + b
}

// 默认参数：调用时可省略
fun greet(name: String, greeting: String = "你好"): String {
    return "\$greeting, \$name"
}

// 命名参数：调用时按名字传，顺序无所谓、可读性强
greet(greeting = "Hi", name = "小明")

// 单表达式函数：函数体只有一个表达式时，用 = 省略大括号和 return
fun square(x: Int): Int = x * x
fun cube(x: Int) = x * x * x   // 返回类型也可省略，由编译器推断`

const lambdaSnippet = `// 高阶函数：参数或返回值是函数。下面 op 是一个 (Int, Int) -> Int 类型的函数
fun calculate(a: Int, b: Int, op: (Int, Int) -> Int): Int {
    return op(a, b)
}

// 传入 lambda（匿名函数字面量）
val sum = calculate(3, 4, { x, y -> x + y })

// 尾随 lambda：当 lambda 是最后一个参数，可挪到括号外
val product = calculate(3, 4) { x, y -> x * y }

// 单参数 lambda 可用隐式名 it
val doubled = listOf(1, 2, 3).map { it * 2 }   // [2, 4, 6]`

const dataClassSnippet = `// data class 自动生成 equals()/hashCode()/toString()/copy()/componentN()
data class User(val name: String, val age: Int)

val u1 = User("小红", 20)
val u2 = User("小红", 20)

println(u1 == u2)          // true：按内容比较（自动 equals）
println(u1)                // User(name=小红, age=20)（自动 toString）

// copy()：基于现有对象复制并修改部分字段
val older = u1.copy(age = 21)   // User(name=小红, age=21)

// 解构声明（依赖自动生成的 componentN）
val (name, age) = u1`

const classObjectSnippet = `// 普通类 + 主构造器 + 属性
class Counter(start: Int = 0) {
    var value: Int = start
        private set            // 自定义 setter 可见性：外部只读
    fun inc() { value++ }
}

// object：声明即单例，全局只有一个实例，线程安全的懒加载
object AppConfig {
    val version = "1.0.0"
    fun describe() = "版本 \$version"
}
// 使用：AppConfig.version

// companion object：类内的「伴生对象」，承载类似 Java static 的成员
class User(val name: String) {
    companion object {
        fun create(name: String) = User(name)   // 类似工厂方法
    }
}
// 使用：User.create("小明")`

const whenSealedSnippet = `// when 表达式：比 Java switch 更强，可作为表达式返回值
fun describe(x: Int): String = when {
    x < 0 -> "负数"
    x == 0 -> "零"
    else -> "正数"
}

// 密封类：受限的类层级，所有子类必须定义在同一文件/模块内
sealed class Result
data class Success(val data: String) : Result()
data class Failure(val error: String) : Result()
object Loading : Result()

// 配合 when：编译器知道所有可能子类，覆盖全部分支时无需 else
fun render(r: Result): String = when (r) {
    is Success -> "成功：\${r.data}"
    is Failure -> "失败：\${r.error}"
    Loading -> "加载中…"
}`

const extensionSnippet = `// 扩展函数：给已有类型「外挂」新方法，无需继承或修改源码
fun String.isPhoneNumber(): Boolean {
    return this.length == 11 && this.all { it.isDigit() }
}

// 像调用自身方法一样使用
val ok = "13800138000".isPhoneNumber()   // true

// 也能给可空类型写扩展，内部处理 null
fun String?.orEmptyTrimmed(): String = this?.trim() ?: ""`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Kotlin 是 Android 官方首选语言，它在保留与 Java 完全互操作的同时，用更现代的语法
        修掉了 Java 多年的痛点。这一章我们把 Kotlin 的语言核心讲透：变量与类型推断、
        让 NPE 几乎绝迹的<strong>空安全</strong>系统、灵活的函数与 lambda、简洁的
        <code>data class</code>、类与单例、<code>when</code> 与密封类，以及画龙点睛的扩展函数。
        每一节都给出 Kotlin 与 Java 的对照，让你看清「改进在哪」。
      </Lead>

      <h2>一、val 与 var：不可变优先</h2>
      <p>
        Kotlin 用两个关键字声明变量：<code>val</code> 声明只读引用（read-only，类似 Java 的
        <code>final</code>），一旦初始化就不能再被重新赋值；<code>var</code> 声明可变引用，
        可以反复赋新值。日常编码的准则是<strong>能用 val 就用 val</strong>——不可变的数据
        更容易推理、更不易出错、在并发下也更安全。
      </p>
      <CodeBlock lang="kotlin" title="val / var 与类型推断" code={valVarSnippet} />
      <p>
        注意上面几乎都没写类型，编译器会从右侧的初始值<strong>推断</strong>出来：
        <code>{'"Kotlin"'}</code> 推断为 <code>String</code>，<code>0</code> 推断为 <code>Int</code>。
        类型推断让代码更干净，但类型信息并没有丢——它仍然是强类型、静态检查的。
      </p>
      <Callout variant="tip" title="val 不等于「内容不可变」">
        <code>val</code> 限制的是<strong>引用</strong>不可重新赋值，而不是对象内部不可变。
        例如 <code>val list = mutableListOf(1, 2)</code> 之后仍可 <code>list.add(3)</code>，
        因为你没有改变 <code>list</code> 指向哪个对象，只是改了那个对象的内容。
      </Callout>

      <h2>二、空安全：把 NPE 拦在编译期</h2>
      <KeyIdea>
        Kotlin 把「一个变量可不可以为 null」写进了<strong>类型系统</strong>。
        默认类型（如 <code>String</code>）不可为 null；要允许 null 必须显式写成可空类型
        （<code>String?</code>）。于是绝大多数空指针问题在<strong>编译期</strong>就被拦下，
        而不是等到运行时崩溃。
      </KeyIdea>
      <p>
        Java 最臭名昭著的运行时异常就是 <code>NullPointerException</code>（NPE）——号称
        「十亿美元的错误」。问题根源在于：Java 的类型不区分「可空」与「非空」，任何对象引用
        都可能偷偷是 null，而编译器对此一无所知。Kotlin 的解法是把这件事提升到类型层面。
      </p>
      <CodeBlock lang="kotlin" title="可空类型与三件套：?. / ?: / !!" code={nullSafetySnippet} />
      <p>
        三个核心操作符要分清：
      </p>
      <ul>
        <li><strong>安全调用 <code>?.</code></strong>：接收者为 null 时，整个表达式短路返回 null，不抛异常。</li>
        <li><strong>Elvis <code>?:</code></strong>：左侧为 null 时取右侧默认值，常用来「兜底」。</li>
        <li>
          <strong>非空断言 <code>!!</code></strong>：强行告诉编译器「我保证它不是 null」，
          一旦你保证错了，运行时立刻抛 NPE。它把空安全的保护<strong>关掉了</strong>，
          应当极少使用。
        </li>
      </ul>
      <Callout variant="warn" title="慎用 !!">
        <code>!!</code> 等于在说「相信我，绝不会是 null」。它把编译期检查变回了 Java 式的运行时崩溃，
        是代码里的危险信号。优先用 <code>?.</code> 与 <code>?:</code>，或先做 null 判断把可空类型
        「智能转换」成非空类型，只在确实无法避免时才用 <code>!!</code>。
      </Callout>
      <CodeBlock lang="kotlin" title="对照：Java 随时可能 NPE，Kotlin 编译期就管住" code={javaNpeSnippet} />

      <h2>三、函数：默认参数、命名参数与单表达式</h2>
      <p>
        Kotlin 用 <code>fun</code> 声明函数。除了基本写法，它还提供几个让 API 更好用、调用更清晰的特性。
      </p>
      <CodeBlock lang="kotlin" title="函数的几种写法" code={functionSnippet} />
      <ul>
        <li>
          <strong>默认参数</strong>：给参数一个默认值，调用时可省略。这在很大程度上
          替代了 Java 里靠重载（overload）堆出来的一大串方法。
        </li>
        <li>
          <strong>命名参数</strong>：调用时写 <code>参数名 = 值</code>，可打乱顺序、显著提升可读性，
          尤其当一个函数有多个布尔/同类型参数时。
        </li>
        <li>
          <strong>单表达式函数</strong>：函数体只有一个表达式时，用 <code>=</code> 直接连到表达式，
          省去大括号和 <code>return</code>，返回类型也常可省略。
        </li>
      </ul>

      <h2>四、高阶函数与 lambda</h2>
      <p>
        在 Kotlin 里，函数是「一等公民」：可以作为参数传递、作为返回值返回。
        参数或返回值是函数的函数，就叫<strong>高阶函数</strong>。函数类型写作
        <code>{'(Int, Int) -> Int'}</code>，表示「接收两个 Int、返回一个 Int」。
      </p>
      <CodeBlock lang="kotlin" title="高阶函数、lambda、尾随 lambda 与 it" code={lambdaSnippet} />
      <p>关键语法点：</p>
      <ul>
        <li>
          <strong>lambda 字面量</strong>：写在花括号里，形如 <code>{'{ x, y -> x + y }'}</code>，
          箭头 <code>{'->'}</code> 左边是参数、右边是函数体。
        </li>
        <li>
          <strong>尾随 lambda</strong>：当 lambda 是函数的<strong>最后一个参数</strong>时，
          可以把它移到圆括号外面，写成 <code>{'calculate(3, 4) { x, y -> x * y }'}</code>，
          读起来像内置控制结构。
        </li>
        <li>
          <strong>隐式参数 <code>it</code></strong>：当 lambda 只有一个参数时，可不声明它，
          直接用 <code>it</code> 引用，如 <code>{'list.map { it * 2 }'}</code>。
        </li>
      </ul>
      <Example title="尾随 lambda 让集合操作非常自然">
        <p>
          <code>{'listOf(1, 2, 3, 4).filter { it % 2 == 0 }.map { it * 10 }'}</code> 先筛出偶数
          <code>[2, 4]</code>，再各乘 10 得到 <code>[20, 40]</code>——链式、可读、无样板代码。
        </p>
      </Example>

      <h2>五、data class：为「数据」而生</h2>
      <p>
        在 Java 里写一个纯数据类（POJO），要手敲 <code>getter</code>/<code>setter</code>/
        <code>equals</code>/<code>hashCode</code>/<code>toString</code>，几十行样板。Kotlin 的
        <code>data class</code> 把这些<strong>自动生成</strong>，一行声明搞定。
      </p>
      <CodeBlock lang="kotlin" title="data class 自动生成的能力" code={dataClassSnippet} />
      <p>
        编译器会基于主构造器里的属性自动生成 <code>equals()</code>/<code>hashCode()</code>
        （按内容比较）、<code>toString()</code>（可读输出）、<code>copy()</code>（复制并改部分字段，
        非常适合不可变数据流）以及 <code>componentN()</code>（支持解构）。这让它成为表示
        UI 状态、网络响应等数据的理想载体。
      </p>

      <h2>六、类、object 单例与 companion object</h2>
      <p>
        Kotlin 的类默认就带简洁的主构造器与属性。更特别的是它用语言级关键字
        直接表达了两个常见模式。
      </p>
      <CodeBlock lang="kotlin" title="class / object / companion object" code={classObjectSnippet} />
      <ul>
        <li>
          <strong><code>object</code> 声明</strong>：声明即<strong>单例</strong>——全局唯一实例，
          首次访问时线程安全地懒加载。再也不用手写 Java 的双重检查锁单例样板。
        </li>
        <li>
          <strong><code>companion object</code></strong>：伴生对象，挂在类上，承载类似 Java
          <code>static</code> 的成员（如工厂方法、常量），通过 <code>类名.成员</code> 访问。
        </li>
      </ul>

      <h2>七、when 表达式与密封类</h2>
      <p>
        <code>when</code> 是 Kotlin 加强版的 <code>switch</code>：可以匹配值、范围、类型，
        而且本身是个<strong>表达式</strong>（有返回值）。它和<strong>密封类</strong>
        （<code>sealed class</code>）配合，是表达「受限状态层级」的利器。
      </p>
      <CodeBlock lang="kotlin" title="when 表达式与 sealed class" code={whenSealedSnippet} />
      <p>
        密封类限定了「所有可能的子类」都必须定义在同一处。这样当你用 <code>when</code> 对它分支时，
        编译器知道全部可能性——只要覆盖了所有子类，就<strong>不需要 else 分支</strong>；
        而一旦将来新增了一个子类却忘了处理，编译器会直接报错提醒你。这种「穷尽性检查」
        在表示网络结果、UI 状态（成功/失败/加载中）时极其有用。
      </p>

      <h2>八、扩展函数：给已有类型外挂能力</h2>
      <p>
        扩展函数允许你为一个<strong>已有类型</strong>（哪怕是标准库或第三方的、你改不了源码的类型）
        添加新方法，而无需继承它。调用时就像那个方法本来就属于这个类型一样自然。
      </p>
      <CodeBlock lang="kotlin" title="扩展函数" code={extensionSnippet} />
      <p>
        函数体内的 <code>this</code> 指向被扩展的接收者对象。需要强调：扩展是<strong>静态</strong>解析的，
        它并没有真的修改原类，只是编译期的语法糖；因此扩展函数无法访问目标类的私有成员，
        也不参与多态（重写）。但作为给 API「补齐便利方法」的手段，它让代码读起来非常顺。
      </p>

      <h2>九、Kotlin vs Java：改进一览</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Java</th><th>Kotlin 的改进</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>空安全</td>
            <td>类型不区分可空，运行时随时 NPE</td>
            <td>可空写进类型系统，编译期拦截，配 <code>?.</code> / <code>?:</code></td>
          </tr>
          <tr>
            <td>数据类</td>
            <td>手写 getter/equals/hashCode/toString</td>
            <td><code>data class</code> 一行自动生成，还附带 <code>copy()</code></td>
          </tr>
          <tr>
            <td>变量声明</td>
            <td><code>final</code> 可选，类型必写</td>
            <td><code>val</code>/<code>var</code> + 类型推断，鼓励不可变</td>
          </tr>
          <tr>
            <td>函数重载</td>
            <td>靠多个重载方法</td>
            <td>默认参数 + 命名参数，少写一堆重载</td>
          </tr>
          <tr>
            <td>单例</td>
            <td>手写双重检查锁样板</td>
            <td><code>object</code> 声明即线程安全单例</td>
          </tr>
          <tr>
            <td>静态成员</td>
            <td><code>static</code> 字段/方法</td>
            <td><code>companion object</code></td>
          </tr>
          <tr>
            <td>分支语句</td>
            <td><code>switch</code> 仅语句、易漏 break</td>
            <td><code>when</code> 表达式 + 密封类穷尽性检查</td>
          </tr>
          <tr>
            <td>给已有类加方法</td>
            <td>只能继承或写工具类</td>
            <td>扩展函数，调用自然</td>
          </tr>
        </tbody>
      </table>

      <Callout variant="tip">
        下一章我们进入 Kotlin 的另一张王牌——<strong>协程</strong>，看看它如何让异步代码
        读起来像同步代码一样顺，并彻底告别回调地狱。
      </Callout>

      <Summary
        points={[
          'val 声明只读引用、var 可变；优先用 val。类型推断让代码简洁但仍是静态强类型。',
          '空安全是 Kotlin 核心：可空类型 String? 与非空 String 在类型系统里分开，配 ?.（安全调用）、?:（Elvis 兜底）把 NPE 拦在编译期；!! 会关闭保护、应极少用。',
          '函数支持默认参数、命名参数、单表达式写法，大幅减少重载与样板。',
          '函数是一等公民：高阶函数接收/返回函数，lambda 配尾随 lambda 语法与隐式 it，集合操作链式流畅。',
          'data class 自动生成 equals/hashCode/toString/copy/componentN；object 是线程安全单例；companion object 承载类似 static 的成员。',
          'when 是带返回值的强化 switch；配 sealed class 表达受限层级，享受编译器穷尽性检查；扩展函数给已有类型外挂方法。',
        ]}
      />
    </article>
  )
}
