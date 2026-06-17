import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const annotateSnippet = `// 显式类型标注：变量名后用「: 类型」声明它能装什么
let title: string = "TypeScript 入门"
let count: number = 42
let isReady: boolean = true

// 函数参数与返回值都能标注
function greet(name: string): string {
  return "你好，" + name
}

// 一旦标注，类型不符就在编译期报错（运行前就被拦下）
count = "三"   // ❌ 不能把 string 赋给 number`

const inferSnippet = `// 类型推断：能推断出来就别手写类型，让 TS 自己算
let title = "TypeScript"   // 推断为 string
let count = 42             // 推断为 number
let nums = [1, 2, 3]       // 推断为 number[]

// 函数返回值也能推断
function double(n: number) {
  return n * 2             // 返回值被推断为 number，无需写 : number
}

// 经验法则：变量初始化、函数返回值通常交给推断；
// 函数「参数」几乎总要显式标注，因为 TS 推不出调用方会传什么`

const basicTypesSnippet = `// —— 原始类型 ——
let s: string = "abc"
let n: number = 3.14          // 整数小数统一是 number
let b: boolean = false
let u: undefined = undefined
let nl: null = null

// —— 数组与元组 ——
let list: number[] = [1, 2, 3]        // 数组：元素类型相同、长度不限
let list2: Array<number> = [1, 2, 3]  // 等价的泛型写法
let pair: [string, number] = ["年龄", 18]  // 元组：定长、每位类型固定

// —— 枚举 ——
enum Direction { Up, Down, Left, Right }  // 默认从 0 开始编号
let d: Direction = Direction.Up           // 值为 0

// —— 特殊类型 ——
let a: any = 1; a = "x"; a = true   // any：放弃检查，什么都行（慎用）
let un: unknown = fetchSomething()  // unknown：未知，用前必须先收窄
function fail(): never { throw new Error("永不返回") }  // never：不可能有值
function log(msg: string): void { console.log(msg) }    // void：没有返回值
let obj: object = { id: 1 }         // object：非原始值`

const literalSnippet = `// 字面量类型：类型不是「所有 string」，而是「就是这个具体值」
let dir: "left" | "right" = "left"   // 只能是这两个字符串之一
dir = "up"   // ❌ 不在允许范围内

// 配合联合类型，常用来表达「有限取值集合」
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

// as const：把对象/数组「冻」成字面量类型，且全部 readonly
const config = { mode: "dark", retries: 3 } as const
// config.mode 的类型是 "dark"（而非宽泛的 string），且不可再赋值`

const unknownSnippet = `// any：彻底关掉检查，后续怎么用都不报错（危险）
let x: any = "hello"
x.toFixed()      // 编译期不报错，运行时直接崩

// unknown：可以接收任何值，但用之前必须先「收窄」证明它是什么
let y: unknown = "hello"
y.toFixed()      // ❌ 编译期就报错：还不知道 y 是什么，不许直接用

if (typeof y === "string") {
  y.toUpperCase() // ✅ 收窄成 string 后才能安全使用
}`

const assertSnippet = `// 类型断言 as：你比 TS 更清楚某个值的类型时，告诉编译器「就当它是 X」
const el = document.getElementById("app") as HTMLDivElement
el.style.color = "red"   // 断言后可访问 HTMLDivElement 的属性

// 非空断言 !：告诉 TS「这里一定不是 null/undefined」
const input = document.querySelector("input")!  // 去掉了 null 的可能
input.value = ""

// ⚠️ 断言只是「骗过编译器」，不做任何运行时检查；断言错了运行时照样崩`

export default function Ch1() {
  return (
    <article>
      <Lead>
        TypeScript（简称 TS）是 JavaScript 的一个超集：你写的每一份合法 JS 代码，
        本身就是合法的 TS。它在 JS 之上加了一层<strong>静态类型系统</strong>，
        让你在写代码、还没运行的时候，就能被工具提前告知「这里类型对不上」。
        这一章我们讲清楚 TS 到底解决什么问题、类型标注与推断怎么配合，
        以及那一组绕不开的基础类型——尤其是容易混淆的 <code>any</code>、
        <code>unknown</code>、<code>never</code>。
      </Lead>

      <h2>一、为什么需要 TypeScript</h2>
      <p>
        JavaScript 是动态类型语言：一个变量今天装字符串、明天装数字，
        引擎都不拦你。这份自由在小脚本里很爽，但项目一大就开始反噬——
        把 <code>"3"</code> 当数字加、调了个根本不存在的方法、函数少传一个参数，
        这些错误统统要等到<strong>代码真正跑到那一行</strong>才暴露，有时还是在用户面前。
      </p>
      <p>TS 的价值就建立在「把错误提前」之上，具体有三点：</p>
      <ul>
        <li>
          <strong>编译期类型检查</strong>：很大一类低级错误（拼错属性名、传错参数类型、
          访问可能为 <code>undefined</code> 的值）在你保存文件的瞬间就被红线标出，
          根本不用等运行。
        </li>
        <li>
          <strong>更好的 IDE 提示与重构</strong>：编辑器知道每个变量是什么类型，
          于是能给出精准的自动补全、跳转定义、安全重命名。改一个字段名，
          所有用到的地方一起跟着改，不会漏。
        </li>
        <li>
          <strong>活文档（living documentation）</strong>：类型本身就是不会过期的注释。
          看一眼函数签名就知道该传什么、会返回什么，而且这份「文档」由编译器强制校验，
          永远和代码一致。
        </li>
      </ul>

      <KeyIdea>
        TS 是 JavaScript 的超集，它给 JS 加上一套<strong>静态类型</strong>。
        但浏览器和 Node 不认识 TS，所以 TS 要先<strong>编译成普通 JS</strong> 才能运行——
        关键在于：<strong>类型信息在编译后被「擦除」（type erasure）</strong>，
        运行时只剩下纯 JS，类型不参与任何运行时逻辑。
      </KeyIdea>
      <p>
        理解「类型擦除」很重要：它意味着类型只在<strong>开发阶段</strong>帮你做检查，
        编译产物里看不到任何类型痕迹，也不会有运行时性能开销。
        反过来也提醒你：你<strong>不能</strong>在运行时靠类型来做判断（比如不能写「如果它是
        某个接口类型就……」），因为那时候类型早就没了。
      </p>

      <h2>二、类型标注 vs 类型推断</h2>
      <p>
        给值「贴上类型」有两种来源：你<strong>显式标注</strong>，或 TS 替你<strong>自动推断</strong>。
        语法上，标注就是在变量名、参数、返回值后面加 <code>{': 类型'}</code>。
      </p>
      <CodeBlock lang="ts" title="显式类型标注" code={annotateSnippet} />
      <p>
        但很多时候你根本不用写——TS 能从初始值里把类型「算」出来，这叫类型推断。
      </p>
      <CodeBlock lang="ts" title="类型推断：能推断就别写" code={inferSnippet} />
      <Callout variant="tip" title="标注的取舍原则">
        <strong>能推断就别手写</strong>，让代码保持干净。但有两处通常要显式标注：
        ① <strong>函数参数</strong>——TS 无法预知调用方会传什么；
        ② <strong>对外暴露的 API / 函数返回值</strong>——显式写出来既是文档，
        也能防止你不小心改了实现却悄悄改变了返回类型。
      </Callout>

      <h2>三、基础类型一览</h2>
      <p>
        下面把日常最常用的基础类型一次过一遍。先看代码，再逐个解释要点。
      </p>
      <CodeBlock lang="ts" title="基础类型示例" code={basicTypesSnippet} />

      <h3>原始类型</h3>
      <p>
        <code>string</code>、<code>number</code>、<code>boolean</code> 三个最常用。
        注意 TS（同 JS）<strong>没有 int / float 之分</strong>，整数和小数都是
        <code>number</code>。<code>null</code> 和 <code>undefined</code> 各自也是类型，
        在开启严格模式时它们不能随便赋给别的类型，这正是 TS 帮你防「空值崩溃」的地方。
      </p>

      <h3>数组与元组</h3>
      <p>
        数组有两种等价写法：<code>{'number[]'}</code> 和 <code>{'Array<number>'}</code>，
        都表示「元素全是 number、长度不限」。<strong>元组（tuple）</strong>则不同：
        它<strong>长度固定、每个位置的类型也固定</strong>，比如
        <code>{'[string, number]'}</code> 表示第 0 位必是字符串、第 1 位必是数字。
        元组适合表达「一组位置有含义的值」，比如坐标 <code>{'[x, y]'}</code>。
      </p>

      <h3>枚举（enum）</h3>
      <p>
        <code>enum</code> 给一组命名常量编号，默认从 <code>0</code> 递增。它适合表达
        一组有限的、有名字的取值。不过要留意：<code>enum</code> 是少数会在编译后
        <strong>留下运行时代码</strong>的 TS 特性（不被擦除），很多团队更偏好用
        前面讲的「字面量联合类型」来替代它。
      </p>

      <h3>特殊类型：void / object / 以及三个易混点</h3>
      <p>
        <code>void</code> 表示函数<strong>没有返回值</strong>（只做副作用，如打印日志）；
        <code>object</code> 表示「非原始值」（对象、数组、函数等）。真正容易搞混的是
        <code>any</code>、<code>unknown</code>、<code>never</code> 这三个，单列下表对比。
      </p>
      <table>
        <thead>
          <tr><th>类型</th><th>含义</th><th>能接收什么</th><th>能怎么用</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>any</code></td>
            <td>放弃类型检查</td>
            <td>任何值</td>
            <td>任意操作都不报错</td>
            <td>逃生舱，慎用——等于关掉 TS</td>
          </tr>
          <tr>
            <td><code>unknown</code></td>
            <td>未知但类型安全</td>
            <td>任何值</td>
            <td>用前必须先收窄</td>
            <td>接收不确定的值（如外部输入）的安全选择</td>
          </tr>
          <tr>
            <td><code>never</code></td>
            <td>不可能有值</td>
            <td>什么都接收不了</td>
            <td>—</td>
            <td>永不返回的函数、被穷尽排除的分支</td>
          </tr>
        </tbody>
      </table>

      <h2>四、字面量类型与 as const</h2>
      <p>
        类型不一定是「所有字符串」这么宽——它可以精确到「就是某个具体值」，
        这叫<strong>字面量类型</strong>。配合联合类型，就能优雅地表达「只能取这几个值之一」。
      </p>
      <CodeBlock lang="ts" title="字面量类型与 as const" code={literalSnippet} />
      <p>
        <code>as const</code> 是个常用技巧：它把一个对象或数组「锁定」成字面量类型，
        所有属性变为 <code>readonly</code>，且每个值的类型收窄到它的字面量（如
        <code>"dark"</code> 而非宽泛的 <code>string</code>）。这在写配置、常量表时特别有用。
      </p>

      <h2>五、any vs unknown：为什么 unknown 更安全</h2>
      <p>
        <code>any</code> 和 <code>unknown</code> 都能装任何值，区别在「拿到之后能不能直接用」。
        <code>any</code> 完全关掉检查——你对它做任何操作 TS 都不管，错误全留到运行时。
        <code>unknown</code> 则相反：它接得住任何值，但你<strong>用之前必须先「收窄」</strong>
        （typeof 判断、类型守卫等）证明它到底是什么，否则编译期就报错。
      </p>
      <CodeBlock lang="ts" title="any 放任 vs unknown 强制收窄" code={unknownSnippet} />
      <Callout variant="warn" title="优先用 unknown，而不是 any">
        当你确实不知道一个值的类型（比如 <code>JSON.parse</code> 的结果、第三方回调的入参），
        默认应该用 <code>unknown</code> 而不是 <code>any</code>。前者逼你在使用前做一次检查，
        把风险挡在编译期；后者只是把问题推迟到线上。
      </Callout>

      <h2>六、类型断言 as 与非空断言 !</h2>
      <p>
        有时你比编译器更清楚某个值的真实类型，可以用<strong>类型断言</strong>
        <code>{'值 as 类型'}</code> 告诉 TS「就当它是这个类型」。还有个常见的简写——
        <strong>非空断言</strong> <code>!</code>，表示「我保证这里不是 null / undefined」。
      </p>
      <CodeBlock lang="ts" title="类型断言与非空断言" code={assertSnippet} />
      <Callout variant="warn" title="断言不是转换，是「承诺」">
        断言只在编译期生效，<strong>不会做任何运行时检查或转换</strong>。如果你断言错了
        （那个元素其实是 <code>null</code>），代码运行到那里照样会崩。断言是「把责任从编译器
        揽到你自己身上」，请只在确有把握时用，能用类型守卫收窄就别滥用断言。
      </Callout>

      <h2>七、联合类型初步</h2>
      <p>
        用竖线 <code>|</code> 把多个类型连起来，就得到<strong>联合类型</strong>，
        表示「这几种之一」。比如 <code>{'string | number'}</code> 意为「要么是字符串，要么是数字」。
        前面字面量类型里其实已经用到了它（<code>{'"GET" | "POST"'}</code>）。
      </p>
      <Example title="联合类型的典型场景">
        <p>
          一个能接收 id（数字）或用户名（字符串）的函数，参数类型就写成
          <code>{'number | string'}</code>。在函数体里使用前，通常要用 <code>typeof</code>
          先判断当前到底是哪一种（这叫「类型收窄」），TS 才允许你调用对应类型特有的方法。
          联合类型 + 收窄是 TS 里最常见的组合，下一章和后续会反复见到。
        </p>
      </Example>

      <Callout variant="tip">
        下一章我们进入对象世界：用 <code>interface</code> 和 <code>type</code> 描述数据的「形状」，
        再认识 TS 里威力最大的工具——<strong>泛型</strong>，理解它为什么比 <code>any</code> 强得多。
      </Callout>

      <Summary
        points={[
          'TS 是 JS 的超集，给 JS 加静态类型；它要编译成 JS 才能运行，且类型在编译后被擦除，不参与运行时。',
          'TS 的核心价值：编译期类型检查、更强的 IDE 提示与重构、以及由编译器强制校验的「活文档」。',
          '类型来源有标注与推断两种；原则是「能推断就别手写」，但函数参数和对外 API 通常要显式标注。',
          '基础类型：string/number/boolean/null/undefined、数组与元组、enum、以及 void/object 与 any/unknown/never。',
          '字面量类型把类型精确到具体值，配合联合类型表达有限取值集合；as const 锁定字面量并使其 readonly。',
          'unknown 比 any 安全：unknown 用前必须收窄，any 彻底关掉检查；断言（as / !）只骗编译器、不做运行时检查，慎用。',
        ]}
      />
    </article>
  )
}
