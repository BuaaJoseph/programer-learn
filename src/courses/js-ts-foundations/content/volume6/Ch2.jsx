import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const interfaceSnippet = `// interface 描述一个对象应该长什么样（它的「形状」）
interface User {
  id: number
  name: string
  email?: string          // 可选属性：可有可无
  readonly createdAt: Date // 只读属性：初始化后不可再改
  greet(): string         // 方法
}

const u: User = {
  id: 1,
  name: "阿杜",
  createdAt: new Date(),
  greet() { return "hi" },
}
u.id = 2          // ✅ 可以改
u.createdAt = new Date()  // ❌ readonly，不允许重新赋值`

const indexExtendSnippet = `// 索引签名：键名不固定、但都符合某种类型
interface StringMap {
  [key: string]: string   // 任意 string 键，值都是 string
}
const dict: StringMap = { a: "1", b: "2" }

// 继承：用 extends 在已有接口上扩展
interface Animal {
  name: string
}
interface Dog extends Animal {  // Dog 拥有 name，再加自己的
  bark(): void
}`

const mergeSnippet = `// 声明合并：同名 interface 会自动合并成一个
interface Box {
  width: number
}
interface Box {
  height: number
}
// 最终 Box 同时拥有 width 和 height
const b: Box = { width: 10, height: 20 }`

const typeAliasSnippet = `// type 类型别名：给「任意类型」起个名字
type ID = number | string          // 联合
type Point = { x: number; y: number }  // 对象
type Pair = [string, number]       // 元组
type Name = string                 // 给原始类型起别名

// 交叉类型 &：把多个类型「合并」成一个，必须同时满足
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged         // 同时拥有 name 和 age
const p: Person = { name: "阿杜", age: 34 }`

const fnTypeSnippet = `// 函数类型标注：参数与返回值
function add(a: number, b: number): number {
  return a + b
}

// 可选参数 ?、默认参数 =、剩余参数 ...
function build(name: string, prefix = "Mr.", suffix?: string, ...tags: string[]): string {
  return prefix + name + (suffix ?? "")
}

// 把「函数本身」的类型写成别名
type BinaryOp = (a: number, b: number) => number
const mul: BinaryOp = (a, b) => a * b   // 参数类型可由 BinaryOp 推断出来`

const genericIdentitySnippet = `// 不用泛型：要么写死类型，要么退化成 any（丢掉类型信息）
function identityAny(x: any): any { return x }
const a = identityAny("hi")   // a 的类型是 any —— 类型没了

// 用泛型：T 是一个「类型变量」，调用时按实参自动确定
function identity<T>(x: T): T {
  return x
}
const s = identity("hi")      // T 推断为 string，s 的类型是 string
const n = identity(42)        // T 推断为 number，n 的类型是 number
// 既保留了完整类型，又对所有类型通用 —— 这就是泛型胜过 any 的地方`

const genericBoxSnippet = `// 泛型容器：一个能装「任意但确定」类型的栈
class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  get size(): number {
    return this.items.length
  }
}

const numStack = new Stack<number>()
numStack.push(1)
numStack.push(2)
const top = numStack.pop()    // top 的类型是 number | undefined
numStack.push("x")            // ❌ 只接受 number`

const genericConstraintSnippet = `// 泛型约束 extends：限制 T 至少要有某些能力
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b   // 因为约束保证了 .length 存在
}
longest("abcd", "ab")     // ✅ string 有 length
longest([1, 2], [3])      // ✅ 数组有 length
longest(1, 2)             // ❌ number 没有 length

// 默认类型参数：调用时不传也有兜底
interface ApiResponse<T = unknown> {
  code: number
  data: T
}
const r1: ApiResponse = { code: 0, data: "随便" }       // T 默认 unknown
const r2: ApiResponse<number> = { code: 0, data: 200 }   // 显式指定 T`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们认识了基础类型，但真实程序里数据大多是「一团对象」。
        这一章先学怎么用 <code>interface</code> 和 <code>type</code> 给对象和函数
        描述「形状」，搞清这两者的取舍；再正式进入 TS 里威力最大、也最值得花时间的
        特性——<strong>泛型</strong>，理解它凭什么比 <code>any</code> 强得多。
      </Lead>

      <h2>一、interface：描述对象的形状</h2>
      <p>
        <code>interface</code>（接口）用来声明一个对象应该有哪些属性、各是什么类型、
        有哪些方法。它是 TS 里描述数据结构最常用的工具。
      </p>
      <CodeBlock lang="ts" title="interface 基础：属性、可选、只读、方法" code={interfaceSnippet} />
      <p>这段代码里出现了几个关键修饰：</p>
      <ul>
        <li>
          <strong>可选属性 <code>?</code></strong>：属性名后加 <code>?</code> 表示「可有可无」，
          如 <code>email?: string</code>。不写也合法，写了就必须是对应类型。
        </li>
        <li>
          <strong>只读属性 <code>readonly</code></strong>：加了 <code>readonly</code> 的属性
          初始化后不能再被赋值，适合表达「一旦确定就不该改」的字段，如创建时间。
        </li>
        <li>
          <strong>方法</strong>：接口里也能声明方法签名，如 <code>greet(): string</code>，
          表示实现这个接口的对象必须提供一个返回字符串的 <code>greet</code> 方法。
        </li>
      </ul>

      <h3>索引签名与继承</h3>
      <p>
        当对象的键名事先不固定（比如一个字典），用<strong>索引签名</strong>
        <code>{'[key: string]: string'}</code> 描述「任意 string 键，值都是 string」。
        接口之间还能用 <code>extends</code> <strong>继承</strong>，在已有形状上叠加新字段。
      </p>
      <CodeBlock lang="ts" title="索引签名与 extends 继承" code={indexExtendSnippet} />

      <h3>声明合并</h3>
      <p>
        interface 有个 type 没有的特性：<strong>声明合并</strong>——同名的多个
        <code>interface</code> 会被自动合并成一个。这在给第三方库「补充类型」时很有用
        （比如往全局对象上挂自己的字段）。
      </p>
      <CodeBlock lang="ts" title="同名 interface 自动合并" code={mergeSnippet} />

      <h2>二、type：类型别名</h2>
      <p>
        <code>type</code> 给<strong>任意类型</strong>起一个名字，不限于对象。它能表达
        联合、交叉、原始、元组、函数等几乎所有类型——这点比 interface 更灵活。
      </p>
      <CodeBlock lang="ts" title="type 类型别名的各种用法" code={typeAliasSnippet} />
      <p>
        其中<strong>交叉类型</strong> <code>&</code> 值得留意：它把多个类型「合并」，
        结果必须<strong>同时满足</strong>所有成员。它常用来组合多个小形状，
        和联合类型 <code>|</code>（满足其一即可）正好相对。
      </p>

      <h2>三、interface vs type：怎么选</h2>
      <p>
        两者大量场景可以互换。下表是常见取舍依据：
      </p>
      <table>
        <thead>
          <tr><th>能力 / 场景</th><th>interface</th><th>type</th></tr>
        </thead>
        <tbody>
          <tr><td>描述对象 / 类的形状</td><td>✅ 擅长</td><td>✅ 可以</td></tr>
          <tr><td>联合类型 <code>{'A | B'}</code></td><td>❌ 不支持</td><td>✅ 支持</td></tr>
          <tr><td>交叉类型 <code>{'A & B'}</code></td><td>用 extends 近似</td><td>✅ 直接 &</td></tr>
          <tr><td>给原始 / 元组 / 函数起别名</td><td>❌</td><td>✅</td></tr>
          <tr><td>声明合并（同名自动合并）</td><td>✅ 支持</td><td>❌ 不支持</td></tr>
          <tr><td>extends 继承</td><td>✅ 原生</td><td>用 & 模拟</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一个简单的选择原则">
        <strong>描述对象 / 类的形状、或要被外部扩展时，优先 <code>interface</code></strong>
        （可继承、可声明合并，报错信息也更友好）；
        <strong>需要联合、交叉、给原始类型或函数起别名时，用 <code>type</code></strong>。
        团队里保持一致即可，不必纠结。
      </Callout>

      <h2>四、函数类型标注</h2>
      <p>
        函数的参数和返回值都能标注。除了普通参数，TS 还支持可选参数 <code>?</code>、
        默认参数 <code>=</code>、剩余参数 <code>...</code>。你也能把「函数本身的类型」
        抽成一个别名，写成 <code>{'(a: number, b: number) => number'}</code> 这样的形式。
      </p>
      <CodeBlock lang="ts" title="参数、返回值、可选 / 默认 / 剩余" code={fnTypeSnippet} />
      <Callout variant="note" title="可选参数必须在必选参数之后">
        和默认参数一样，带 <code>?</code> 的可选参数只能排在必选参数后面，
        剩余参数 <code>...</code> 必须放在最末位。注意函数类型里的箭头
        <code>{'=>'}</code> 表示「返回」，别和箭头函数的 <code>{'=>'}</code> 混为一谈
        （虽然长得一样，一个在类型位置、一个在值位置）。
      </Callout>

      <h2>五、泛型：给类型也加上「参数」</h2>
      <KeyIdea>
        泛型（generics）就是「<strong>类型的参数</strong>」。你先用一个类型变量
        （习惯写作 <code>{'<T>'}</code>）占位，等到真正调用 / 实例化时，
        再由实际传入的值<strong>自动确定</strong> T 是什么。这样一段代码就能对
        多种类型通用，<strong>同时完整保留类型信息</strong>。
      </KeyIdea>

      <h3>泛型函数：类型安全的 identity</h3>
      <p>
        最经典的例子是 <code>identity</code>（原样返回传入的值）。看看不用泛型会怎样、
        用了泛型又好在哪：
      </p>
      <CodeBlock lang="ts" title="identity：any 丢类型 vs 泛型保类型" code={genericIdentitySnippet} />
      <p>
        关键对比：<code>identityAny</code> 用 <code>any</code>，返回值类型变成
        <code>any</code>——调用后你完全不知道拿到的是什么，类型检查形同虚设。
        而泛型版本里，<code>{'identity<T>(x: T): T'}</code> 把「入参类型」和「返回类型」
        用同一个 <code>T</code> 绑定起来：传字符串就推断 <code>T</code> 为 string，
        返回值也精确是 string。这就是<strong>泛型为什么比 any 好</strong>——
        any 是「放弃类型」，泛型是「让类型流动」。
      </p>

      <h3>泛型类 / 接口：一个类型安全的栈</h3>
      <p>
        泛型不只用于函数，类和接口也能带类型参数。下面实现一个泛型栈
        <code>{'Stack<T>'}</code>，它能装某种确定的元素类型，push / pop 全程类型安全。
      </p>
      <CodeBlock lang="ts" title="泛型容器 Stack<T>" code={genericBoxSnippet} />
      <p>
        <code>{'new Stack<number>()'}</code> 把 <code>T</code> 定为 number 后，
        <code>push</code> 只接受数字、<code>pop</code> 返回 <code>{'number | undefined'}</code>，
        往里塞字符串会被直接拒绝。同一份 <code>Stack</code> 代码可以服务
        <code>{'Stack<string>'}</code>、<code>{'Stack<User>'}</code> 等任意类型，且各自类型独立、安全。
      </p>

      <h3>泛型约束与默认类型参数</h3>
      <p>
        有时你需要对类型变量加点限制——比如「<code>T</code> 必须有 <code>length</code> 属性」，
        这用 <strong>约束 <code>extends</code></strong> 表达：<code>{'<T extends { length: number }>'}</code>。
        还能给类型参数设<strong>默认值</strong>，调用时不指定就用兜底类型。
      </p>
      <CodeBlock lang="ts" title="约束 extends 与默认类型参数" code={genericConstraintSnippet} />
      <Example title="泛型约束读法">
        <p>
          <code>{'<T extends { length: number }>'}</code> 读作「T 是任何<strong>带 length 数值属性</strong>
          的类型」。正因为有这个保证，函数体里访问 <code>a.length</code> 才不会报错。
          约束是「在保持通用的同时，要求 T 至少具备某种能力」——比无约束泛型更精确，
          又比写死具体类型更灵活。
        </p>
      </Example>

      <Callout variant="warn" title="别一遇到不确定就写 any">
        新手常见的坏习惯是：拿不准类型就写 <code>any</code>，让红线消失。但这等于关掉了 TS。
        绝大多数「想用 any」的场景，正确解法是<strong>泛型</strong>（让类型由调用方决定）
        或 <strong>unknown + 收窄</strong>（先证明类型再用）。把这两招用熟，
        你的代码会既灵活又安全。
      </Callout>

      <Summary
        points={[
          'interface 描述对象 / 类的形状：支持可选 ?、只读 readonly、方法、索引签名、extends 继承，以及同名自动声明合并。',
          'type 是类型别名，能给联合、交叉、原始、元组、函数等任意类型起名；交叉类型 & 表示「同时满足」。',
          'interface vs type：描述对象 / 要被扩展用 interface；要联合 / 交叉 / 给原始类型或函数起别名用 type，团队内保持一致即可。',
          '函数类型可标注参数与返回值，支持可选 ?、默认 =、剩余 ... 参数；函数类型里的 => 表示返回值类型。',
          '泛型是「类型的参数」：用类型变量占位、调用时自动确定，既通用又完整保留类型信息。',
          '泛型支持约束 extends（要求 T 具备某能力）和默认类型参数；它比 any 强——any 是放弃类型，泛型是让类型流动。',
        ]}
      />
    </article>
  )
}
