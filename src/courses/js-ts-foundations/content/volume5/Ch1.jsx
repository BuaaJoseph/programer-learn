import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const arrayDestructuring = `// 数组解构：按位置取值
const point = [10, 20, 30]
const [x, y, z] = point
// x = 10, y = 20, z = 30

// 跳过某些元素：用逗号占位
const [first, , third] = point
// first = 10, third = 30

// 默认值：当对应位置是 undefined 时生效
const [a = 1, b = 2, c = 3] = [100]
// a = 100, b = 2, c = 3

// 交换变量，不再需要中间变量
let m = 1
let n = 2
;[m, n] = [n, m]
// m = 2, n = 1`

const objectDestructuring = `const user = {
  id: 7,
  name: 'Ada',
  role: 'admin',
}

// 基础：变量名要和属性名一致
const { id, name } = user

// 重命名：把 name 取出来叫 userName
const { name: userName } = user
// userName = 'Ada'

// 默认值 + 重命名一起用
const { age: userAge = 18 } = user
// user 没有 age，userAge = 18

// 重命名 + 默认值
const { role: userRole = 'guest' } = user
// userRole = 'admin'`

const nestedDestructuring = `const resp = {
  code: 0,
  data: {
    list: [{ title: '第一篇' }, { title: '第二篇' }],
    total: 2,
  },
}

// 嵌套解构：一路深入到内层
const {
  data: {
    list: [{ title: firstTitle }],
    total,
  },
} = resp
// firstTitle = '第一篇'
// total = 2

// 注意：data、list 本身不会成为变量，
// 它们只是「路径」，只有最末端的名字才是变量。`

const paramDestructuring = `// 函数参数解构：常用于「配置对象」
function createUser({ name, role = 'guest', active = true } = {}) {
  return name + ' / ' + role + ' / ' + active
}

createUser({ name: 'Bob', role: 'admin' })
// 'Bob / admin / true'

createUser()
// 'undefined / guest / true'（参数默认值 = {} 防止解构 undefined 报错）

// 数组参数解构
function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x2 - x1, y2 - y1)
}
distance([0, 0], [3, 4]) // 5`

const spreadArray = `// 展开数组：把元素「摊开」
const a = [1, 2, 3]
const b = [4, 5, 6]

// 合并数组（替代 concat）
const merged = [...a, ...b]
// [1, 2, 3, 4, 5, 6]

// 插入元素到中间
const withZero = [...a, 0, ...b]
// [1, 2, 3, 0, 4, 5, 6]

// 复制数组（浅拷贝）
const copy = [...a]

// 把可迭代对象转成数组
const chars = [...'abc'] // ['a', 'b', 'c']
const arr = [...new Set([1, 1, 2])] // [1, 2]`

const spreadObject = `const base = { theme: 'dark', size: 'm' }

// 合并对象（后者覆盖前者）
const merged = { ...base, size: 'l' }
// { theme: 'dark', size: 'l' }

// 浅拷贝 + 增字段
const next = { ...base, lang: 'zh' }

// 注意：展开是浅拷贝，嵌套对象仍是同一引用
const cfg = { nested: { v: 1 } }
const shallow = { ...cfg }
shallow.nested.v = 2
// cfg.nested.v 也变成了 2！`

const restPattern = `// 剩余参数：函数接收任意多个实参，收进一个真数组
function sum(...nums) {
  return nums.reduce((acc, n) => acc + n, 0)
}
sum(1, 2, 3, 4) // 10

// 与解构结合：剩余元素
const [head, ...tail] = [1, 2, 3, 4]
// head = 1, tail = [2, 3, 4]

// 对象剩余：取出 id，其余装进 others
const { id, ...others } = { id: 1, a: 2, b: 3 }
// id = 1, others = { a: 2, b: 3 }`

const optionalChaining = `const user = {
  name: 'Ada',
  address: { city: '杭州' },
}

// 老写法：层层判空，否则报 Cannot read properties of undefined
const city1 = user && user.address && user.address.city

// 可选链 ?.：任一环为 null/undefined 就短路返回 undefined
const city2 = user?.address?.city // '杭州'
const zip = user?.address?.zip // undefined（不报错）

// 可选链调用方法 / 索引
user.greet?.() // greet 不存在也不报错
const arr = user?.tags?.[0] // 安全取索引`

const nullishCoalescing = `// ?? 空值合并：只有 null / undefined 才用右边的默认值
const a = 0 ?? 100 // 0   （0 是有效值，保留）
const b = '' ?? 'x' // ''  （空串是有效值，保留）
const c = null ?? 100 // 100
const d = undefined ?? 100 // 100

// 对比 ||：把所有「假值」都当成需要兜底
const e = 0 || 100 // 100  （0 被当成假，错误地兜底了！）
const f = '' || 'x' // 'x'  （空串被兜底）

// 配置项里区分「用户传了 0」和「用户没传」时，?? 才正确
function setVolume(v) {
  const vol = v ?? 50 // 传 0 保留 0；不传才用 50
  return vol
}`

const shorthandProps = `const name = 'Ada'
const age = 20

// 简写属性：变量名与属性名相同时省略冒号
const user = { name, age }
// 等价于 { name: name, age: age }

// 方法简写
const obj = {
  greet() {
    return 'hi'
  },
}

// 计算属性名：用 [] 包一个表达式当 key
const key = 'score'
const i = 3
const data = {
  [key]: 99,
  ['item' + i]: true,
}
// { score: 99, item3: true }`

const templateString = `const name = 'Ada'
const n = 3

// 模板字符串：反引号 + \${...} 插值，支持多行
const msg = \`你好，\${name}，你有 \${n} 条新消息\`

// 多行无需 \\n
const html = \`<ul>
  <li>\${name}</li>
</ul>\`

// 标签模板（进阶）：用函数处理模板，拿到「字符串片段数组」和「插值」
function tag(strings, ...values) {
  return strings.reduce((s, str, i) => s + str + (values[i] ?? ''), '')
}
tag\`和\${name}打招呼\` // '和Ada打招呼'`

const esModule = `// ---- math.js ----
export const PI = 3.14159        // 命名导出
export function add(a, b) {       // 命名导出
  return a + b
}
export default function multiply(a, b) { // 默认导出（每个模块至多一个）
  return a * b
}

// ---- main.js ----
import multiply, { PI, add } from './math.js'
// multiply 是默认导出（名字随便取）；PI、add 是命名导出（名字要对上）

import { add as plus } from './math.js' // 重命名命名导入
import * as math from './math.js'        // 整体导入成命名空间对象
math.add(1, 2)

// 动态 import()：返回 Promise，按需 / 懒加载
const mod = await import('./math.js')
mod.add(1, 2)`

const letConstScope = `// var：函数作用域，会变量提升，容易出 bug
function demo() {
  if (true) {
    var x = 1
  }
  return x // 1 —— var 泄漏到了整个函数
}

// let / const：块级作用域，只在 {} 内有效
function demo2() {
  if (true) {
    let y = 1
    const z = 2
  }
  // 这里访问 y、z 会报错：未定义
}

// 经典循环陷阱：var 共享同一个 i，let 每轮一个新绑定
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i)) // 0 1 2（用 var 会全是 3）
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        ES6（ES2015）及之后的版本给 JavaScript 带来了一大批让代码更短、更安全、更好读的语法。
        这一章我们把日常写得最多的几样「现代特性」讲透：解构赋值、展开与剩余运算符、默认参数、
        模板字符串、可选链 <code>?.</code> 与空值合并 <code>{'??'}</code>、属性简写与计算属性名、
        ES Module 的导入导出，以及 <code>let</code> / <code>const</code> 的块级作用域。
        它们不是「炫技」，而是现代 JS 代码的默认底色——读懂别人的代码、写出干净的代码都离不开它们。
      </Lead>

      <h2>一、解构赋值：从数组和对象里「拆」出值</h2>
      <p>
        解构（destructuring）是一种从数组或对象中提取值并赋给变量的简洁语法。
        在它出现之前，要取出对象里的几个字段，你得一行一行地写
        <code>const a = obj.a</code>；有了解构，一行就能把它们一次性拆出来。
      </p>

      <h3>1. 数组解构</h3>
      <p>
        数组解构<strong>按位置</strong>取值：等号左边写一个用方括号包起来的「模式」，
        变量按顺序对应数组的第 0、1、2 个元素。可以用逗号跳过元素，也可以给默认值。
      </p>
      <CodeBlock lang="js" title="数组解构：位置、跳过、默认值、交换变量" code={arrayDestructuring} />

      <h3>2. 对象解构：重命名与默认值</h3>
      <p>
        对象解构<strong>按属性名</strong>取值，所以左边变量名默认要和属性名一致。
        如果想换个名字，用 <code>{'{ 原名: 新名 }'}</code> 重命名；如果担心属性不存在，
        用 <code>=</code> 给默认值。默认值只在对应属性是 <code>undefined</code> 时才生效。
      </p>
      <CodeBlock lang="js" title="对象解构：基础、重命名、默认值" code={objectDestructuring} />

      <h3>3. 嵌套解构</h3>
      <p>
        解构可以嵌套，沿着数据结构一路深入。要注意一个常见误解：作为「路径」的中间属性名
        <strong>不会</strong>变成变量，只有写在最末端的名字才是真正声明出来的变量。
      </p>
      <CodeBlock lang="js" title="嵌套解构：深入对象与数组" code={nestedDestructuring} />

      <h3>4. 函数参数解构</h3>
      <p>
        最实用的场景之一：把函数参数写成解构模式。当一个函数有很多可选配置时，
        与其记住一长串参数顺序，不如传一个「配置对象」，在参数位置直接解构出来并给默认值。
      </p>
      <CodeBlock lang="js" title="参数解构：配置对象与数组参数" code={paramDestructuring} />
      <Callout variant="warn" title="给参数解构兜个底">
        当你写 <code>function f({'{ a }'}) {'{}'}</code> 却调用 <code>f()</code> 时，
        相当于对 <code>undefined</code> 做解构，会直接报错。给整个参数一个默认值
        <code>= {'{}'}</code> 即可避免：<code>function f({'{ a } = {}'}) {'{}'}</code>。
      </Callout>

      <h2>二、展开运算符 ... 与剩余参数</h2>
      <p>
        同样是三个点 <code>...</code>，在不同位置含义相反：放在<strong>值的位置</strong>是
        <strong>展开（spread）</strong>，把一个可迭代对象或对象「摊开」；放在
        <strong>接收的位置</strong>（函数参数、解构左侧）是<strong>剩余（rest）</strong>，
        把多个东西「收拢」进一个数组或对象。记住「展开是拆开、剩余是收拢」就不会混。
      </p>

      <h3>1. 展开数组</h3>
      <CodeBlock lang="js" title="展开数组：合并、复制、转数组" code={spreadArray} />

      <h3>2. 展开对象</h3>
      <p>
        对象展开常用于「不可变更新」：基于旧对象造一个新对象，改其中几个字段。
        但要牢记它是<strong>浅拷贝</strong>——只复制第一层，嵌套对象仍然共享同一引用。
      </p>
      <CodeBlock lang="js" title="展开对象：合并、浅拷贝、覆盖" code={spreadObject} />
      <Callout variant="warn" title="展开是浅拷贝">
        无论数组还是对象，<code>...</code> 只复制一层。嵌套的对象/数组依然指向原来的引用，
        改动会互相影响。需要深拷贝时用 <code>structuredClone(obj)</code> 等手段。
      </Callout>

      <h3>3. 剩余参数</h3>
      <p>
        剩余参数让函数接收任意多个实参，并把它们收进一个<strong>真正的数组</strong>
        （比老式的类数组 <code>arguments</code> 好用得多）。它也能用在解构里收集剩下的元素或属性。
      </p>
      <CodeBlock lang="js" title="剩余参数：收集实参与剩余解构" code={restPattern} />

      <h2>三、默认参数</h2>
      <p>
        函数参数可以直接写默认值，调用时不传或传 <code>undefined</code> 就用默认值。
        这取代了过去 <code>v = v || defaultValue</code> 的写法（后者会把 <code>0</code>、
        空串等有效假值也错误地替换掉）。默认值甚至可以引用前面的参数、是个表达式。
      </p>
      <Example title="默认参数 vs 老写法">
        <p>
          老写法：<code>function greet(name) {'{ name = name || "客人"; ... }'}</code>，
          传 <code>greet('')</code> 时空串被替换成「客人」，往往不是你想要的。
        </p>
        <p>
          新写法：<code>function greet(name = '客人') {'{}'}</code>，只有<strong>不传</strong>或传
          <code>undefined</code> 才用默认值，传空串就保留空串。
        </p>
      </Example>

      <h2>四、模板字符串与标签模板</h2>
      <p>
        模板字符串用<strong>反引号</strong>包裹，支持 <code>{'${...}'}</code> 插值和原样多行，
        彻底告别 <code>'a' + b + 'c'</code> 的拼接地狱。一句话提一下<strong>标签模板</strong>：
        在模板前面加一个函数名，函数会拿到「静态片段数组」和「各处插值」，可用于做转义、
        高亮、国际化等定制处理——日常少用，知道有这回事即可。
      </p>
      <CodeBlock lang="js" title="模板字符串与标签模板" code={templateString} />

      <h2>五、可选链 ?. 与空值合并 ??</h2>
      <KeyIdea>
        可选链 <code>?.</code> 解决「访问深层属性时中途为空就报错」的痛点：任一环是
        <code>null</code> 或 <code>undefined</code> 就短路返回 <code>undefined</code>，不再抛异常。
        空值合并 <code>{'??'}</code> 解决「只在真正没值时才兜底」的痛点：只有
        <code>null</code> / <code>undefined</code> 才取默认值，<code>0</code> 和空串都算有效值。
      </KeyIdea>

      <h3>1. 可选链 ?.</h3>
      <p>
        在不确定某个中间属性是否存在时，可选链让你安全地「往下钻」。它还能用于方法调用
        <code>obj.fn?.()</code> 和动态索引 <code>obj?.[key]</code>。
      </p>
      <CodeBlock lang="js" title="可选链：安全访问深层属性、方法、索引" code={optionalChaining} />

      <h3>2. 空值合并 ?? 与 || 的区别</h3>
      <p>
        这是新手最容易踩的坑。<code>||</code> 把所有<strong>假值</strong>（<code>0</code>、
        空串 <code>''</code>、<code>false</code>、<code>NaN</code>、<code>null</code>、
        <code>undefined</code>）都当成「需要兜底」；而 <code>{'??'}</code> 只把
        <code>null</code> 和 <code>undefined</code> 当成「没值」。当 <code>0</code> 或空串是
        合法输入时，必须用 <code>{'??'}</code>。
      </p>
      <CodeBlock lang="js" title="?? 与 || 的本质区别" code={nullishCoalescing} />
      <table>
        <thead>
          <tr>
            <th>左侧的值</th>
            <th><code>{'value || "默认"'}</code></th>
            <th><code>{'value ?? "默认"'}</code></th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>0</code></td><td>「默认」（被兜底）</td><td><code>0</code>（保留）</td></tr>
          <tr><td><code>''</code> 空串</td><td>「默认」（被兜底）</td><td><code>''</code>（保留）</td></tr>
          <tr><td><code>false</code></td><td>「默认」（被兜底）</td><td><code>false</code>（保留）</td></tr>
          <tr><td><code>null</code></td><td>「默认」</td><td>「默认」</td></tr>
          <tr><td><code>undefined</code></td><td>「默认」</td><td>「默认」</td></tr>
          <tr><td>非空对象 / 字符串</td><td>原值</td><td>原值</td></tr>
        </tbody>
      </table>

      <h2>六、简写属性与计算属性名</h2>
      <p>
        当变量名和要赋的属性名相同，可以省略冒号，写成<strong>简写属性</strong>；
        方法也能简写。<strong>计算属性名</strong>则允许把一个表达式的结果当作 key，
        放在 <code>[]</code> 里——以前必须先建对象再用 <code>obj[key] = v</code> 才能做到。
      </p>
      <CodeBlock lang="js" title="简写属性、方法简写、计算属性名" code={shorthandProps} />

      <h2>七、ES Module：import / export</h2>
      <p>
        ES Module 是 JavaScript 官方的模块系统。每个文件是一个模块，用 <code>export</code>
        对外暴露、用 <code>import</code> 引入。导出分两种：
      </p>
      <ul>
        <li>
          <strong>命名导出（named）</strong>：可以有多个，导入时名字要对上，可用
          <code>as</code> 重命名，或用 <code>{'import * as ns'}</code> 整体导入成命名空间对象。
        </li>
        <li>
          <strong>默认导出（default）</strong>：每个模块至多一个，导入时名字随便取，不用花括号。
        </li>
      </ul>
      <p>
        还有<strong>动态 <code>import()</code></strong>：它是一个返回 Promise 的函数式调用，
        用于按需 / 懒加载——只有真正用到某模块时才去加载它，常见于路由级代码分割。
      </p>
      <CodeBlock lang="js" title="命名 / 默认导出、重命名、动态 import" code={esModule} />
      <Callout variant="tip" title="命名 vs 默认，怎么选">
        一个文件只导出一个主要东西（如一个 React 组件、一个类）时常用默认导出；
        导出一组工具函数 / 常量时用命名导出。命名导出对自动补全和重构更友好，是当下更被推荐的默认选择。
      </Callout>

      <h2>八、let / const 与块级作用域回顾</h2>
      <p>
        现代 JS 几乎不再用 <code>var</code>。<code>let</code> 和 <code>const</code> 是
        <strong>块级作用域</strong>——只在最近的一对 <code>{'{}'}</code> 内有效，不会像
        <code>var</code> 那样泄漏到整个函数，也没有令人迷惑的变量提升行为。
        默认用 <code>const</code>（表示「不重新赋值」），确实需要改变量时才用 <code>let</code>。
      </p>
      <CodeBlock lang="js" title="var 的陷阱 vs let / const 的块级作用域" code={letConstScope} />
      <Callout variant="note" title="const 不等于「不可变」">
        <code>const</code> 只保证<strong>变量绑定</strong>不被重新赋值，
        并不冻结对象内容。<code>const o = {'{ a: 1 }'}</code> 之后仍可以 <code>o.a = 2</code>，
        但不能 <code>o = {'{}'}</code>。要真正冻结对象，用 <code>Object.freeze(o)</code>。
      </Callout>

      <h2>九、现代写法 vs 老写法对照</h2>
      <p>下面把本章特性放进一张表，直观感受「现代 JS」省了多少事。</p>
      <table>
        <thead>
          <tr><th>场景</th><th>老写法</th><th>现代写法</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>取对象字段</td>
            <td><code>var n = obj.name</code></td>
            <td><code>{'const { name } = obj'}</code></td>
          </tr>
          <tr>
            <td>合并数组</td>
            <td><code>a.concat(b)</code></td>
            <td><code>{'[...a, ...b]'}</code></td>
          </tr>
          <tr>
            <td>复制对象 + 改字段</td>
            <td><code>Object.assign({'{}'}, o, {'{ k: v }'})</code></td>
            <td><code>{'{ ...o, k: v }'}</code></td>
          </tr>
          <tr>
            <td>默认值</td>
            <td><code>x = x || 5</code>（错杀 0）</td>
            <td><code>{'x ?? 5'}</code> / 参数默认值</td>
          </tr>
          <tr>
            <td>深层判空</td>
            <td><code>a {'&&'} a.b {'&&'} a.b.c</code></td>
            <td><code>a?.b?.c</code></td>
          </tr>
          <tr>
            <td>字符串拼接</td>
            <td><code>'你好' + name + '!'</code></td>
            <td><code>{'`你好${name}!`'}</code></td>
          </tr>
          <tr>
            <td>不定参数</td>
            <td><code>arguments</code>（类数组）</td>
            <td><code>...args</code>（真数组）</td>
          </tr>
        </tbody>
      </table>

      <Summary
        points={[
          '解构赋值从数组（按位置）/ 对象（按属性名）拆值，支持重命名、默认值、嵌套与函数参数解构；参数解构记得加 = {} 兜底。',
          '三个点 ... 在值的位置是展开（拆开数组/对象，用于合并、浅拷贝），在接收位置是剩余（收拢成数组/对象）；展开均为浅拷贝。',
          '默认参数只在不传或传 undefined 时生效，取代了 v = v || x 会错杀 0 和空串的老写法。',
          '模板字符串用反引号支持插值与多行；标签模板可做定制处理，日常了解即可。',
          '可选链 ?. 让深层访问遇空短路返回 undefined 不报错；空值合并 ?? 只对 null/undefined 兜底，与 || 的关键区别是不会错杀 0 与空串。',
          '简写属性省冒号、计算属性名用 [] 当 key；ES Module 有命名导出与默认导出，配合 as 重命名与动态 import() 懒加载。',
          'let/const 是块级作用域，优先用 const；const 只锁绑定不冻结对象内容，深冻结用 Object.freeze。',
        ]}
      />
    </article>
  )
}
