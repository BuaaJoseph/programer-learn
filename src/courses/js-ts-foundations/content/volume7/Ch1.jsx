import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const unionBasicSnippet = `// 联合类型：值可以是若干类型中的任意一种
type Id = number | string

function printId(id: Id) {
  // 此处 id 的类型是 number | string
  // 只能访问两者的"公共成员"——string 和 number 都有 toString
  console.log(id.toString()) // OK

  // id.toUpperCase()      // 报错：number 上没有 toUpperCase
  // id.toFixed(2)         // 报错：string 上没有 toFixed
}

printId(42)
printId('user_42')`

const intersectionSnippet = `// 交叉类型：把多个类型"合并"成一个，必须同时满足全部
type Named = { name: string }
type Aged = { age: number }

// Person 同时拥有 name 和 age
type Person = Named & Aged

const p: Person = { name: '小明', age: 30 } // 两个字段都必须有

// 交叉常用于"在已有对象类型上叠加能力"
type WithId<T> = T & { id: string }
type UserWithId = WithId<{ nick: string }> // { nick: string; id: string }`

const narrowTypeofSnippet = `// typeof 收窄：用于原始类型 string / number / boolean / symbol / object / function 等
function format(x: string | number) {
  if (typeof x === 'string') {
    // 这一支里 x 被收窄为 string
    return x.trim().toUpperCase()
  } else {
    // 否则收窄为 number
    return x.toFixed(2)
  }
}`

const narrowInstanceofSnippet = `// instanceof 收窄：用于"类的实例"
class HttpError extends Error {
  constructor(public status: number) { super() }
}

function report(e: Error | HttpError) {
  if (e instanceof HttpError) {
    // 收窄为 HttpError，可访问 status
    console.log('HTTP', e.status)
  } else {
    console.log('Error', e.message)
  }
}

// in 收窄：用属性名是否存在来区分对象形态
type Fish = { swim: () => void }
type Bird = { fly: () => void }

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim() // 收窄为 Fish
  } else {
    animal.fly()  // 收窄为 Bird
  }
}`

const truthyEqualitySnippet = `// 真值收窄：把 null / undefined / '' / 0 / NaN 这些"假值"排除
function greet(name: string | null | undefined) {
  if (name) {
    // 进入这里说明 name 是非空字符串，收窄为 string
    console.log('Hi, ' + name.toUpperCase())
  } else {
    console.log('Hi, 陌生人')
  }
}

// 相等收窄：用 === / !== 比较两个联合，公共可能值会被收窄
function compare(a: string | number, b: string | boolean) {
  if (a === b) {
    // 只有 string 能同时存在于两边，于是 a、b 都被收窄为 string
    a.toUpperCase()
    b.toLowerCase()
  }
}`

const predicateSnippet = `// 自定义类型谓词：返回值写成 "参数 is 类型"
// 当函数返回 true 时，TS 就把该参数收窄为这个类型
type Cat = { meow: () => void }
type Dog = { bark: () => void }

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined
}

function speak(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow() // 收窄为 Cat
  } else {
    animal.bark() // 收窄为 Dog
  }
}`

const discriminatedSnippet = `// 判别联合：每个成员都带一个共同的"字面量 tag 字段"（这里是 kind）
interface Circle {
  kind: 'circle'   // 字面量类型，作为判别标签
  radius: number
}
interface Square {
  kind: 'square'
  side: number
}
interface Rectangle {
  kind: 'rectangle'
  width: number
  height: number
}

type Shape = Circle | Square | Rectangle

// 用 switch 根据 kind 安全分支——每个 case 里 TS 自动收窄
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      // 这里 shape 收窄为 Circle，能访问 radius
      return Math.PI * shape.radius ** 2
    case 'square':
      return shape.side ** 2
    case 'rectangle':
      return shape.width * shape.height
    default:
      // 所有分支都处理完后，shape 类型是 never
      return assertNever(shape)
  }
}`

const assertNeverSnippet = `// never 与穷尽性检查
// never 是"不可能存在的值"的类型，没有任何值能赋给它
function assertNever(x: never): never {
  throw new Error('未处理的分支: ' + JSON.stringify(x))
}

// 假如以后给 Shape 新增了一个成员 Triangle 却忘了在 switch 里加 case，
// default 分支里 shape 就不再是 never，assertNever(shape) 会"编译报错"，
// 从而在编码阶段就提醒你"还有分支没覆盖"。这就是穷尽性检查的价值。`

const nullCheckSnippet = `// 可选与 strictNullChecks
// 开启 strictNullChecks 后，null 和 undefined 不再"悄悄"属于任何类型，
// 必须显式声明，并在使用前收窄。

interface User {
  name: string
  email?: string // 可选属性：类型实为 string | undefined
}

function sendMail(u: User) {
  // u.email 可能是 undefined，直接用会报错
  if (u.email !== undefined) {
    deliver(u.email) // 收窄为 string
  }
  // 或用可选链 + 空值合并
  const addr = u.email ?? 'no-reply@example.com'
  deliver(addr)
}

declare function deliver(addr: string): void`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到这一卷，我们正式踏进 TypeScript 的"类型系统"腹地。本章讲的是日常写业务代码<strong>最常用、收益最高</strong>的一组能力：用联合与交叉把类型拼装起来，再用"类型收窄"在运行分支里把宽泛的联合精确化，最后用"判别联合 + never 穷尽检查"写出既安全又能随需求演进的代码。这套组合拳，是从"会写 TS"迈向"会用类型保护自己"的分水岭。
      </Lead>

      <h2>一、联合类型：A | B，多选一</h2>
      <KeyIdea>
        联合类型 <code>{'A | B'}</code> 表示"这个值可能是 A，也可能是 B"。在你尚未收窄之前，TypeScript 只允许你访问 A 和 B 的<strong>公共成员</strong>——因为它无法确定此刻到底是哪一种。
      </KeyIdea>
      <p>
        联合类型用竖线 <code>|</code> 把若干类型连起来。它表达的是一种"或"的关系：变量的值只会是其中某一种类型。这非常贴合现实——一个 id 字段，后端可能给你数字，也可能给你字符串；一个解析结果，可能成功也可能失败。
      </p>
      <p>
        关键约束在于：在没有收窄前，你只能调用<strong>所有成员都共有</strong>的方法或属性。比如 <code>{'string | number'}</code> 上，<code>toString()</code> 两者都有，可以调；而 <code>toUpperCase()</code> 只有 string 有，直接调就会报错。这不是限制，而是保护：它强迫你先确认类型，再使用。
      </p>
      <CodeBlock lang="ts" title="联合类型与公共成员" code={unionBasicSnippet} />

      <h2>二、交叉类型：A & B，全都要</h2>
      <p>
        交叉类型用 <code>&</code> 连接，语义与联合相反：它把多个类型<strong>合并</strong>成一个，结果类型必须<strong>同时满足</strong>所有被合并的类型。如果说联合是"或"，交叉就是"与"。
      </p>
      <p>
        交叉最典型的用途是"在已有类型上叠加字段或能力"，比如给任意对象类型加一个 <code>id</code>，或把"有名字"和"有年龄"两组约束拼成一个完整的 <code>Person</code>。它和后面会讲的工具类型、泛型配合，是组合复杂类型的基础积木。
      </p>
      <CodeBlock lang="ts" title="交叉类型：合并多个类型" code={intersectionSnippet} />
      <table>
        <thead>
          <tr><th>运算</th><th>符号</th><th>语义</th><th>结果可访问</th></tr>
        </thead>
        <tbody>
          <tr><td>联合</td><td><code>|</code></td><td>是 A <strong>或</strong> B（多选一）</td><td>仅 A、B 的公共成员</td></tr>
          <tr><td>交叉</td><td><code>&</code></td><td>既是 A <strong>又</strong>是 B（合并）</td><td>A、B 全部成员</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="一个反直觉点">
        很多人初学会以为"联合是加法、交叉是减法"。恰恰相反：联合扩大了"可能的取值范围"，却<strong>缩小</strong>了"能安全使用的成员"；交叉合并了成员（成员更多），却<strong>缩小</strong>了"可能的取值范围"（要求更严）。记住口诀：联合管值、交叉管成员。
      </Callout>

      <h2>三、类型收窄：把宽泛的联合精确化</h2>
      <p>
        既然联合在使用前必须先确认类型，那"确认"这个动作就叫<strong>类型收窄（narrowing）</strong>。TypeScript 能读懂你写的运行时判断（如 <code>if</code>、<code>switch</code>），并在对应分支里把变量类型自动收窄到更精确的那一种。下面逐个讲常用的收窄手段，也就是所谓的"类型守卫（type guard）"。
      </p>

      <h3>1. typeof 收窄</h3>
      <p>
        最基础的守卫，针对 JavaScript 的原始类型：<code>'string'</code>、<code>'number'</code>、<code>'boolean'</code>、<code>'symbol'</code>、<code>'undefined'</code>、<code>'object'</code>、<code>'function'</code>。用 <code>typeof x === '...'</code> 判断后，分支内 x 即被收窄。
      </p>
      <CodeBlock lang="ts" title="typeof 类型守卫" code={narrowTypeofSnippet} />

      <h3>2. instanceof 与 in 收窄</h3>
      <p>
        <code>instanceof</code> 针对"类的实例"，判断某个对象是否由某个构造函数创建；<code>in</code> 则通过"某个属性名是否存在"来区分不同的对象形态。当两个对象类型没有共同的标签字段、但拥有不同的方法名时，<code>in</code> 很好用。
      </p>
      <CodeBlock lang="ts" title="instanceof 与 in 守卫" code={narrowInstanceofSnippet} />

      <h3>3. 真值收窄与相等收窄</h3>
      <p>
        把变量直接放进 <code>if</code> 条件，TypeScript 会做<strong>真值收窄</strong>：进入分支说明值是"真值"，于是 <code>null</code>、<code>undefined</code>、<code>''</code>、<code>0</code>、<code>NaN</code> 这些"假值"被排除。而用 <code>===</code> / <code>!==</code> 比较两个联合时会触发<strong>相等收窄</strong>：只有两边都可能取到的类型才会留下。
      </p>
      <CodeBlock lang="ts" title="真值收窄与相等收窄" code={truthyEqualitySnippet} />

      <h3>4. 自定义类型谓词（is）</h3>
      <p>
        当内置守卫不够用时，可以自己写一个返回 <code>{'arg is Type'}</code> 的函数——这叫<strong>类型谓词（type predicate）</strong>。函数返回 <code>true</code> 时，TypeScript 就把传入的参数收窄为谓词声明的类型。这让你能把复杂的判断逻辑封装成可复用的守卫。
      </p>
      <CodeBlock lang="ts" title="自定义类型谓词" code={predicateSnippet} />
      <Callout variant="warn" title="谓词函数要自己保证正确">
        类型谓词是你对编译器的"承诺"：你说 <code>{'animal is Cat'}</code>，TS 就信了。如果函数体内的判断逻辑写错（比如判断条件和返回类型不匹配），编译器不会拦你，运行时却会出错。谓词把责任从编译器转移到了你身上，务必让判断逻辑与声明的类型严格一致。
      </Callout>

      <h2>四、判别联合：最值得掌握的建模模式</h2>
      <KeyIdea>
        判别联合（discriminated union）= 一组对象类型，每个成员都带一个<strong>共同的、值为字面量</strong>的标签字段（如 <code>kind</code>）。靠这个标签，<code>switch</code> 能把每个分支安全地收窄到对应成员。这是 TS 里建模"多种形态数据"的黄金范式。
      </KeyIdea>
      <p>
        前面的 <code>in</code> 守卫靠"属性名差异"区分形态，但当形态多、字段又有重叠时就不可靠了。判别联合给出更稳的方案：人为给每个成员加一个值唯一的字面量字段作为"判别标签"。TypeScript 看到 <code>switch (shape.kind)</code> 后，能在每个 <code>case</code> 里把 <code>shape</code> 精确收窄到对应的那一个成员类型。
      </p>
      <p>
        下面是经典的图形面积例子：<code>Shape</code> 是三种图形的判别联合，<code>area</code> 根据 <code>kind</code> 分支计算面积。
      </p>
      <CodeBlock lang="ts" title="判别联合 + switch 计算图形面积" code={discriminatedSnippet} />

      <h2>五、never 与穷尽性检查</h2>
      <p>
        上面的 <code>default</code> 分支里调用了一个 <code>assertNever</code>，它的参数类型是 <code>never</code>。<code>never</code> 表示"不可能出现的值"——没有任何值能赋给 <code>never</code> 类型。这看似无用，却是写出"可演进的安全代码"的关键。
      </p>
      <p>
        原理是这样：当 <code>switch</code> 把 <code>circle</code>、<code>square</code>、<code>rectangle</code> 三个分支都处理完，到了 <code>default</code> 时，TypeScript 推断 <code>shape</code> 的类型已经是 <code>never</code>（所有可能都被排除了），于是 <code>assertNever(shape)</code> 合法。但如果你<strong>未来给 <code>Shape</code> 新增了一个 <code>Triangle</code> 成员，却忘了加对应的 <code>case</code></strong>，<code>default</code> 里的 <code>shape</code> 就会变成 <code>Triangle</code> 而非 <code>never</code>，<code>assertNever(shape)</code> 立刻<strong>编译报错</strong>。
      </p>
      <CodeBlock lang="ts" title="assertNever 与穷尽性检查" code={assertNeverSnippet} />
      <Example title="穷尽检查救了你一命">
        <p>
          想象一个真实场景：你的订单状态原本只有 <code>'paid'</code> 和 <code>'shipped'</code>，到处都用 <code>switch</code> 处理。某天产品加了 <code>'refunded'</code>。如果没有穷尽检查，所有遗漏 <code>'refunded'</code> 的 switch 都会"静默走 default"，bug 要到线上才暴露；有了 <code>assertNever</code>，TypeScript 会在编译期把<strong>每一处</strong>没更新的地方标红，逼你逐个补全。类型系统替你做了一次全局体检。
        </p>
      </Example>

      <h2>六、可选属性与 strictNullChecks</h2>
      <p>
        最后补上一块和收窄紧密相关的地基：空值处理。在 <code>tsconfig</code> 里开启 <code>strictNullChecks</code>（<code>strict</code> 模式默认开启）后，<code>null</code> 和 <code>undefined</code> 不再"悄悄"属于其他类型，必须显式声明，并在使用前收窄。可选属性 <code>email?: string</code> 的真实类型其实是 <code>{'string | undefined'}</code>，直接使用会报错，需要先用真值收窄、可选链 <code>?.</code> 或空值合并 <code>??</code> 处理。
      </p>
      <CodeBlock lang="ts" title="可选属性与空值收窄" code={nullCheckSnippet} />
      <Callout variant="tip" title="务必打开 strict">
        新项目请直接在 <code>tsconfig.json</code> 里设 <code>{'"strict": true'}</code>。它会一次性开启 <code>strictNullChecks</code> 等一系列严格检查，把"可能为空却没判断"这类最高发的运行时错误挡在编译期。本章讲的收窄技巧，绝大部分价值都建立在严格模式之上。
      </Callout>

      <Callout variant="note" title="承上启下">
        本章的联合、收窄、判别联合解决的是"如何安全地使用已有类型"。下一章我们换个视角，进入"如何用类型生成类型"的世界——keyof、映射类型、条件类型与工具类型，也就是俗称的"类型体操"。
      </Callout>

      <Summary
        points={[
          '联合 A | B 表示多选一，收窄前只能访问公共成员；交叉 A & B 表示合并，结果同时拥有全部成员。口诀：联合管值、交叉管成员。',
          '类型收窄把宽泛联合精确化，手段有：typeof（原始类型）、instanceof（类实例）、in（属性存在）、真值收窄、相等收窄。',
          '自定义类型谓词写成 arg is Type，把复杂判断封装成可复用守卫，但正确性由你自己保证。',
          '判别联合是建模多形态数据的黄金范式：每个成员带共同的字面量标签字段，switch 据此在各分支安全收窄。',
          'never 表示不可能的值；在 default 里用 assertNever 做穷尽性检查，新增成员却漏写 case 时会编译报错，让类型系统替你兜底。',
          '开启 strictNullChecks（strict 模式）后 null/undefined 必须显式处理；可选属性 x?: T 实为 T | undefined，用真值收窄、?. 或 ?? 安全访问。',
        ]}
      />
    </article>
  )
}
