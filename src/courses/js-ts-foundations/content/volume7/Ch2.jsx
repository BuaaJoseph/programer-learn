import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const keyofSnippet = `// keyof：取一个对象类型所有键，组成"键名的联合类型"
interface User {
  id: number
  name: string
  active: boolean
}

type UserKey = keyof User // 'id' | 'name' | 'active'

// 索引访问类型 T[K]：取某个键对应的"值类型"
type IdType = User['id']            // number
type NameOrId = User['name' | 'id'] // string | number
type ValueUnion = User[keyof User]  // number | string | boolean

// 二者配合写一个类型安全的取值函数
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const u: User = { id: 1, name: 'Ann', active: true }
const n = getProp(u, 'name') // 推断为 string，传错 key 会编译报错`

const mappedSnippet = `// 映射类型：遍历 keyof 生成新类型
type User = { id: number; name: string }

// 把每个属性都变为可选（这就是内置 Partial 的原理）
type AllOptional = {
  [K in keyof User]?: User[K]
}
// 等价于 { id?: number; name?: string }

// 把每个属性都变为只读
type AllReadonly = {
  readonly [K in keyof User]: User[K]
}

// 泛化成通用工具
type Optional<T> = { [K in keyof T]?: T[K] }
type ReadonlyAll<T> = { readonly [K in keyof T]: T[K] }`

const modifierSnippet = `// 修饰符的增减：+ 加上、- 去掉。+ 通常可省略
// -? 去掉可选（变必填），-readonly 去掉只读

type MaybeUser = { id?: number; name?: string }

// 去掉所有可选修饰符 -> 全部变必填（这就是内置 Required 的原理）
type RequiredUser = {
  [K in keyof MaybeUser]-?: MaybeUser[K]
}

type Frozen = { readonly a: number }
// 去掉 readonly
type Unfrozen = {
  -readonly [K in keyof Frozen]: Frozen[K]
} // { a: number }`

const remapSnippet = `// as 重映射：在映射时改写键名（配合模板字面量类型）
type User = { name: string; age: number }

// 为每个属性生成一个 getXxx 方法
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K]
}

type UserGetters = Getters<User>
// {
//   getName: () => string
//   getAge: () => number
// }

// as never 可以"过滤掉"某些键
type RemoveName<T> = {
  [K in keyof T as K extends 'name' ? never : K]: T[K]
}`

const conditionalSnippet = `// 条件类型：T extends U ? X : Y —— 像类型层面的三元表达式
type IsString<T> = T extends string ? 'yes' : 'no'

type A = IsString<string>  // 'yes'
type B = IsString<number>  // 'no'

// 分布式条件类型：当 T 是"裸联合"时，条件会对每个成员分别套用再合并
type ToArray<T> = T extends any ? T[] : never
type R = ToArray<string | number>
// 分布展开： (string extends any ? string[] : never)
//          | (number extends any ? number[] : never)
// 结果： string[] | number[]

// 想关闭分布式，把 T 用方括号包起来即可
type ToArray2<T> = [T] extends [any] ? T[] : never
type R2 = ToArray2<string | number> // (string | number)[]`

const inferSnippet = `// infer：在条件类型里"声明并提取"一个待定类型变量
// 经典案例：手写 ReturnType —— 提取函数的返回值类型
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type F = (x: number) => string
type Ret = MyReturnType<F> // string

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never
type E = ElementOf<number[]> // number

// 提取 Promise 解包后的类型（Awaited 的简化版）
type Unwrap<T> = T extends Promise<infer V> ? V : T
type V = Unwrap<Promise<boolean>> // boolean`

const templateLiteralSnippet = `// 模板字面量类型：用反引号在"类型层面"拼接字符串字面量
type Lang = 'zh' | 'en'
type Page = 'home' | 'about'

// 交叉相乘，自动生成所有组合
type Route = \`/\${Lang}/\${Page}\`
// '/zh/home' | '/zh/about' | '/en/home' | '/en/about'

// 配合内置的 Uppercase / Lowercase / Capitalize / Uncapitalize
type Event = 'click' | 'hover'
type Handler = \`on\${Capitalize<Event>}\` // 'onClick' | 'onHover'`

const builtinsSnippet = `// 手写几个最常用的内置工具类型，理解其原理

// Partial：全部属性可选
type MyPartial<T> = { [K in keyof T]?: T[K] }

// Required：全部属性必填
type MyRequired<T> = { [K in keyof T]-?: T[K] }

// Readonly：全部属性只读
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }

// Pick：从 T 中挑选 K 这几个键
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit：从 T 中剔除 K 这几个键（用 Exclude 反向计算键集）
type MyExclude<T, U> = T extends U ? never : T
type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>

// Record：以 K 为键、V 为值构造对象类型
type MyRecord<K extends keyof any, V> = { [P in K]: V }

// ReturnType：提取函数返回值类型
type MyReturnType<T> = T extends (...a: any[]) => infer R ? R : never`

const usageSnippet = `// 使用示例
interface User {
  id: number
  name: string
  email: string
}

type DraftUser = MyPartial<User>            // 所有字段可选，适合"局部更新"
type PublicUser = MyOmit<User, 'email'>     // 去掉敏感字段
type NameAndId = MyPick<User, 'id' | 'name'>// 只保留两个字段
type Roles = MyRecord<'admin' | 'guest', boolean> // { admin: boolean; guest: boolean }

function f(a: number, b: string): boolean { return true }
type FRet = MyReturnType<typeof f> // boolean`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们学会了"安全地使用类型"。这一章更进一步：<strong>用类型来生成类型</strong>。keyof、索引访问、映射类型、条件类型、infer 与模板字面量，这几样组合起来就是社区俗称的"类型体操（type gymnastics）"。它们也正是 TypeScript 内置工具类型（Partial、Pick、ReturnType 等）的实现底座。掌握了这一章，你就能读懂、甚至自己造各种高级类型，让类型随数据结构自动演化，而不必手写一堆重复定义。
      </Lead>

      <h2>一、keyof 与索引访问类型 T[K]</h2>
      <KeyIdea>
        <code>keyof T</code> 取出 T 所有键，组成"键名的联合类型"；索引访问 <code>{'T[K]'}</code> 反过来，根据键取出对应的"值类型"。这一对操作是后面一切映射与条件类型的起点。
      </KeyIdea>
      <p>
        <code>keyof User</code> 会得到 <code>{"'id' | 'name' | 'active'"}</code> 这样一个字符串字面量联合。它把"对象有哪些键"提升到了类型层面，让我们能对键做遍历、过滤、改写。
      </p>
      <p>
        索引访问类型 <code>{'T[K]'}</code> 与 JS 里的 <code>obj[key]</code> 形似但作用于类型：<code>{"User['id']"}</code> 得到 <code>number</code>。把 keyof 和索引访问配合泛型约束 <code>{'K extends keyof T'}</code>，就能写出"传错 key 会编译报错"的类型安全取值函数。
      </p>
      <CodeBlock lang="ts" title="keyof 与索引访问 T[K]" code={keyofSnippet} />

      <h2>二、映射类型：遍历 keyof 生成新类型</h2>
      <p>
        映射类型用 <code>{'[K in keyof T]'}</code> 这种语法遍历一个类型的所有键，为每个键生成新的属性。它是"批量改造对象类型"的利器——把所有属性变可选、变只读、变某种包装类型，都靠它。
      </p>
      <CodeBlock lang="ts" title="映射类型基础" code={mappedSnippet} />

      <h3>修饰符的增减：+? / -? 与 readonly</h3>
      <p>
        映射时可以给属性添加或移除两个修饰符：<strong>可选 <code>?</code></strong> 和 <strong>只读 <code>readonly</code></strong>。用 <code>+</code> 表示添加（通常省略），<code>-</code> 表示移除。<code>-?</code> 去掉可选（即变必填），<code>-readonly</code> 去掉只读——这正是 <code>Required</code> 和"可变版本"工具类型的实现关键。
      </p>
      <CodeBlock lang="ts" title="修饰符增减 +? / -? / -readonly" code={modifierSnippet} />

      <h3>as 重映射：改写键名</h3>
      <p>
        映射时还能用 <code>as</code> 子句<strong>改写键名</strong>，常配合下面要讲的模板字面量类型给键加前缀、改大小写。把键 <code>as never</code> 还能"过滤掉"不想要的键。
      </p>
      <CodeBlock lang="ts" title="as 重映射键名与过滤" code={remapSnippet} />

      <h2>三、条件类型：T extends U ? X : Y</h2>
      <KeyIdea>
        条件类型 <code>{'T extends U ? X : Y'}</code> 是类型层面的"三元表达式"：如果 T 可赋值给 U，结果取 X，否则取 Y。它让类型能够<strong>根据输入做判断</strong>，是高级类型逻辑的核心。
      </KeyIdea>
      <p>
        这里的 <code>extends</code> 不是"继承"，而是"可赋值 / 是其子类型"的判断。条件类型最强大也最容易踩坑的特性是<strong>分布式</strong>：当被检查的 <code>T</code> 是一个"裸的"泛型联合时，条件会对联合的<strong>每个成员分别套用</strong>，再把结果合并。理解这一点，很多"为什么结果不是我想的那样"就解释通了。需要关闭分布式时，把两边都用方括号包起来即可（<code>{'[T] extends [U]'}</code>）。
      </p>
      <CodeBlock lang="ts" title="条件类型与分布式特性" code={conditionalSnippet} />

      <h2>四、infer：在条件类型里提取类型</h2>
      <p>
        <code>infer</code> 是条件类型里的"模式匹配 + 变量声明"：它在 <code>extends</code> 右侧某个位置声明一个待定的类型变量，让 TypeScript 在匹配时"反推"出那个位置的具体类型，供分支使用。最经典的应用就是手写 <code>ReturnType</code>——从函数类型里把返回值类型抠出来。
      </p>
      <CodeBlock lang="ts" title="infer 提取类型（手写 ReturnType 等）" code={inferSnippet} />
      <Callout variant="note" title="infer 的位置很灵活">
        <code>infer</code> 可以出现在函数返回值、参数、数组元素、Promise 解包、元组等几乎任意结构位置。内置的 <code>Parameters</code>（提取参数元组）、<code>Awaited</code>（递归解包 Promise）、<code>InstanceType</code> 等都是 <code>infer</code> 在不同位置的应用。学会它，你就能从任意复杂结构里"拆出"想要的部分。
      </Callout>

      <h2>五、模板字面量类型（一句话）</h2>
      <p>
        模板字面量类型把 JS 的模板字符串搬到了类型层面：用反引号在类型里拼接字面量，多个联合参与拼接时会自动"相乘"出所有组合，配合 <code>Capitalize</code> 等内置类型还能改写大小写——这就是为 React 事件名、路由路径等做精确字符串类型约束的法宝。
      </p>
      <CodeBlock lang="ts" title="模板字面量类型" code={templateLiteralSnippet} />

      <h2>六、内置工具类型与手写实现</h2>
      <p>
        前面这些机制不是孤立的炫技，它们正是 TypeScript <strong>内置工具类型</strong>的实现原料。下面先看常用工具类型一览，再亲手实现其中几个，你会发现"原来不过如此"。
      </p>
      <table>
        <thead>
          <tr><th>工具类型</th><th>作用</th><th>核心机制</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{'Partial<T>'}</code></td><td>全部属性变可选</td><td>映射 + <code>?</code></td></tr>
          <tr><td><code>{'Required<T>'}</code></td><td>全部属性变必填</td><td>映射 + <code>-?</code></td></tr>
          <tr><td><code>{'Readonly<T>'}</code></td><td>全部属性变只读</td><td>映射 + <code>readonly</code></td></tr>
          <tr><td><code>{'Pick<T, K>'}</code></td><td>挑选 K 这几个键</td><td>映射 <code>{'[P in K]'}</code></td></tr>
          <tr><td><code>{'Omit<T, K>'}</code></td><td>剔除 K 这几个键</td><td>Pick + Exclude</td></tr>
          <tr><td><code>{'Record<K, V>'}</code></td><td>以 K 为键、V 为值构造对象</td><td>映射 <code>{'[P in K]'}</code></td></tr>
          <tr><td><code>{'ReturnType<T>'}</code></td><td>提取函数返回值类型</td><td>条件 + <code>infer</code></td></tr>
          <tr><td><code>{'Parameters<T>'}</code></td><td>提取函数参数元组</td><td>条件 + <code>infer</code></td></tr>
          <tr><td><code>{'Awaited<T>'}</code></td><td>递归解包 Promise 的值类型</td><td>条件 + <code>infer</code>（递归）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="ts" title="手写常用工具类型" code={builtinsSnippet} />
      <CodeBlock lang="ts" title="工具类型用法示例" code={usageSnippet} />
      <Example title="把工具类型用在真实场景">
        <p>
          一个表单组件：编辑时只更新部分字段，用 <code>{'Partial<User>'}</code> 描述"草稿"；接口返回给前台展示时要藏掉邮箱，用 <code>{"Omit<User, 'email'>"}</code>；权限表用 <code>{"Record<Role, boolean>"}</code> 一行搞定。这些类型都<strong>从同一个 <code>User</code> 派生</strong>，将来 <code>User</code> 加字段，它们全部自动跟着变——这就是"用类型生成类型"带来的可维护性。
        </p>
      </Example>

      <Callout variant="warn" title="类型体操要适度">
        映射、条件、infer 能拼出极其复杂的类型，但过度炫技会让类型报错信息变成天书、编译变慢、同事看不懂。原则是：<strong>优先用内置工具类型</strong>，能用现成的就别自己造；只在确有复用价值、且能显著提升安全性时才手写高级类型。可读性永远比"秀"更重要。
      </Callout>

      <Callout variant="tip" title="本卷小结">
        两章下来，你已经握住了 TypeScript 进阶的两条主线：用联合 / 交叉 / 收窄 / 判别联合<strong>安全地消费类型</strong>，用 keyof / 映射 / 条件 / infer / 模板字面量<strong>自动地生成类型</strong>。前者保护运行时，后者消灭重复定义。把它们用在真实项目里，类型系统就会从"碍事的约束"变成"替你思考的伙伴"。
      </Callout>

      <Summary
        points={[
          'keyof T 取出键的联合，索引访问 T[K] 取出值类型；配合泛型约束 K extends keyof T 可写类型安全的取值函数。',
          '映射类型用 [K in keyof T] 遍历键批量改造类型；修饰符 +?/-? 增减可选、+readonly/-readonly 增减只读；as 子句可重映射或过滤键名。',
          '条件类型 T extends U ? X : Y 是类型层面的三元表达式；裸联合会触发分布式（逐成员套用再合并），用 [T] 包裹可关闭。',
          'infer 在条件类型里声明并提取待定类型，是 ReturnType、Parameters、Awaited 等的核心，可用在返回值、参数、数组、Promise 等任意位置。',
          '模板字面量类型在类型层面拼接字符串，联合相乘生成组合，配合 Capitalize 等改写大小写，常用于事件名 / 路由约束。',
          '内置工具类型 Partial/Required/Readonly/Pick/Omit/Record/ReturnType/Parameters/Awaited 都由上述机制实现；优先用现成的，类型体操要适度，可读性第一。',
        ]}
      />
    </article>
  )
}
