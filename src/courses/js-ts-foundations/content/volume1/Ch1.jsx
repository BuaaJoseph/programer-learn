import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const typeofDemo = `typeof "hi"          // "string"
typeof 42            // "number"
typeof true          // "boolean"
typeof undefined     // "undefined"
typeof Symbol("id")  // "symbol"
typeof 10n           // "bigint"
typeof {}            // "object"
typeof [1, 2]        // "object"  ← 数组也是 object
typeof function(){}  // "function"（函数是可调用对象的特例）
typeof null          // "object"  ← 著名的历史 bug，并非真的对象`

const wrapperDemo = `// 原始值本身没有方法，但你能写 "abc".toUpperCase()
const s = "abc"
s.toUpperCase()   // "ABC"

// 背后发生了什么：引擎临时把原始值「装箱」成包装对象
// 大致等价于：
new String("abc").toUpperCase()
// 用完即弃，下一行 s 仍然是那个原始字符串

// 永远不要手动 new String() / new Number() / new Boolean()
typeof new String("abc")   // "object"，不是 "string"，反而制造麻烦`

const toBooleanDemo = `// 八个 falsy 值（转成布尔时为 false），其余一律 true
Boolean(false)        // false
Boolean(0)            // false
Boolean(-0)           // false
Boolean(0n)           // false（BigInt 的零）
Boolean("")           // false（空字符串）
Boolean(null)         // false
Boolean(undefined)    // false
Boolean(NaN)          // false

// 容易踩坑的 truthy 值
Boolean("0")          // true（非空字符串）
Boolean("false")      // true（非空字符串）
Boolean([])           // true（空数组也是对象）
Boolean({})           // true（空对象）`

const toNumberDemo = `Number("42")      // 42
Number("  42  ")  // 42（首尾空白被忽略）
Number("")        // 0   ← 空字符串变 0，常见坑
Number("3.14")    // 3.14
Number("0x1F")    // 31（识别十六进制）
Number("12px")    // NaN（含非法字符整体失败）
Number(true)      // 1
Number(false)     // 0
Number(null)      // 0   ← 注意
Number(undefined) // NaN ← 与 null 不同
Number([])        // 0   （[] -> "" -> 0）
Number([5])       // 5   （[5] -> "5" -> 5）
Number([1, 2])    // NaN （[1,2] -> "1,2" -> NaN）`

const plusVsTemplate = `// + 运算符：只要有一边是字符串，就做字符串拼接
1 + 2          // 3
1 + "2"        // "12"
"1" + 2        // "12"
1 + 2 + "3"    // "33"（先 1+2=3，再 3+"3"）
"1" + 2 + 3    // "123"（先 "1"+2="12"，再 +"3"）

// 其它算术运算符（- * / %）会把两边都转成数字
"5" - 2        // 3
"5" * "2"      // 10
"abc" - 1      // NaN

// 模板字符串：内部一律走 ToString
const n = 42
\`值是 \${n}\`            // "值是 42"
\`数组：\${[1, 2, 3]}\`   // "数组：1,2,3"
\`对象：\${{a: 1}}\`      // "对象：[object Object]"`

const looseEqDemo = `// === 严格相等：类型不同直接 false，不做任何转换
1 === 1          // true
1 === "1"        // false（number vs string）
null === undefined // false

// == 宽松相等：类型不同会先转换再比较
1 == "1"         // true（"1" 转成数字 1）
true == 1        // true（true 转成 1）
null == undefined // true（规范特例，二者互等）
null == 0        // false（null 只和 undefined 相等，不转数字）`

const trickyEqDemo = `// 经典面试题逐步推导

// 1) [] == ![]  结果竟是 true
// step1: ![] 先算 —— [] 是 truthy，所以 ![] 为 false
//        => [] == false
// step2: == 遇到布尔，把布尔转数字 false -> 0
//        => [] == 0
// step3: == 遇到 对象 vs 数字，对象走 ToPrimitive -> []转成 ""
//        => "" == 0
// step4: 字符串 vs 数字，"" 转数字 -> 0
//        => 0 == 0  => true

// 2) null == undefined  => true（规范规定，且仅此二者互等）
// 3) null == 0          => false（null 不转换为数字）
// 4) NaN == NaN         => false（NaN 不等于任何值，包括自己）
// 5) "" == 0            => true（"" -> 0）
// 6) "0" == 0           => true（"0" -> 0）
// 7) "" == "0"          => false（同为字符串，逐字符比，不等）`

const nanDemo = `NaN === NaN          // false ← NaN 不等于任何值，连自己都不等
NaN == NaN           // false

// 因此判断「是不是 NaN」不能用 ===，要用专门 API
Number.isNaN(NaN)    // true
Number.isNaN("abc")  // false（不会做隐式转换，更严谨）

// 全局 isNaN 会先做 ToNumber，容易误判，少用
isNaN("abc")         // true（"abc" -> NaN）
Number.isNaN("abc")  // false（"abc" 本身不是 NaN）

// NaN 的来源：无意义的数值运算
0 / 0                // NaN
Math.sqrt(-1)        // NaN
Number("hello")      // NaN`

export default function Ch1() {
  return (
    <article>
      <Lead>
        要真正读懂 JavaScript，第一步是搞清楚它的「类型与值」。JS 是一门动态类型语言：变量本身没有类型，
        类型属于它当前持有的「值」。而 JS 最被诟病、也最容易在面试与线上事故里坑人的，
        正是它那套<strong>隐式类型转换</strong>规则。这一章我们把原始类型、<code>typeof</code> 的真相、
        显式与隐式转换的底层规则、falsy 清单、<code>==</code> 与 <code>===</code> 的差别，
        以及 <code>NaN</code> 的怪脾气，逐一讲透。
      </Lead>

      <h2>一、七种原始类型 + 对象</h2>
      <p>
        JavaScript 的值分为两大阵营：<strong>原始类型（primitive）</strong>和<strong>对象（object）</strong>。
        到今天为止，原始类型共有<strong>七种</strong>，其余一切（数组、函数、日期、正则……）都是对象。
      </p>
      <table>
        <thead>
          <tr><th>原始类型</th><th>说明</th><th>例子</th></tr>
        </thead>
        <tbody>
          <tr><td><code>string</code></td><td>文本，不可变</td><td><code>{'"hello"'}</code></td></tr>
          <tr><td><code>number</code></td><td>双精度浮点，整数小数都是它</td><td><code>42</code> / <code>3.14</code></td></tr>
          <tr><td><code>boolean</code></td><td>真假</td><td><code>true</code> / <code>false</code></td></tr>
          <tr><td><code>null</code></td><td>「有意的空值」，主动赋的空</td><td><code>null</code></td></tr>
          <tr><td><code>undefined</code></td><td>「未定义」，变量声明未赋值的默认值</td><td><code>undefined</code></td></tr>
          <tr><td><code>symbol</code></td><td>唯一标识符（ES6 引入）</td><td><code>{'Symbol("id")'}</code></td></tr>
          <tr><td><code>bigint</code></td><td>任意精度整数（ES2020 引入）</td><td><code>10n</code></td></tr>
        </tbody>
      </table>
      <p>
        原始值有两个关键特征：<strong>不可变（immutable）</strong>——你无法改变一个原始值本身，
        只能用新值替换它；<strong>按值复制</strong>——把它赋给另一个变量时复制的是值本身（下一章详谈）。
        而对象是<strong>可变的</strong>、按引用持有的，这是第二章的主题。
      </p>
      <Callout variant="info" title="null 与 undefined 的语义差别">
        二者都表示「空」，但语义不同：<code>undefined</code> 是「系统级的空」——变量声明了还没赋值、
        函数没有 <code>return</code>、访问不存在的属性，都会得到它；<code>null</code> 是「程序员主动赋的空」——
        「这里现在故意没有值」。习惯上：要表达「暂无」用 <code>null</code>，别去手动赋 <code>undefined</code>。
      </Callout>

      <h2>二、typeof：结果与那些坑</h2>
      <KeyIdea>
        <code>typeof</code> 返回一个描述类型的字符串。它能区分大部分原始类型，
        但有两个必须背下来的特例：<code>typeof null</code> 返回 <code>{'"object"'}</code>（历史 bug），
        而函数会返回 <code>{'"function"'}</code> 而不是 <code>{'"object"'}</code>。
      </KeyIdea>
      <CodeBlock lang="js" title="typeof 的全部结果（含坑）" code={typeofDemo} />
      <p>
        逐条说三个最容易出错的地方：
      </p>
      <ul>
        <li>
          <strong><code>{'typeof null === "object"'}</code></strong>：这是 JS 诞生之初遗留的 bug，
          因为历史兼容无法修复，只能记住。想判断 <code>null</code> 要直接写
          <code>{'x === null'}</code>。
        </li>
        <li>
          <strong>数组也是 <code>{'"object"'}</code></strong>：<code>{'typeof [1,2]'}</code> 是
          <code>{'"object"'}</code>，要判断数组得用 <code>{'Array.isArray(x)'}</code>。
        </li>
        <li>
          <strong>函数是 <code>{'"function"'}</code></strong>：函数本质是可调用的对象，
          但 <code>typeof</code> 特地为它返回 <code>{'"function"'}</code>，方便检测。
        </li>
      </ul>

      <h2>三、包装对象（一句话）</h2>
      <p>
        既然原始值不是对象、没有方法，为什么 <code>{'"abc".toUpperCase()'}</code> 能跑？
        因为引擎会在你调用方法的瞬间，把原始值临时<strong>装箱（autoboxing）</strong>成对应的包装对象
        （<code>String</code> / <code>Number</code> / <code>Boolean</code>），调用完即丢弃。
      </p>
      <CodeBlock lang="js" title="自动装箱：用完即弃的包装对象" code={wrapperDemo} />

      <h2>四、类型转换：显式 vs 隐式</h2>
      <p>
        类型转换分两种：你<strong>主动调用</strong> <code>Number()</code> / <code>String()</code> /
        <code>Boolean()</code> 的叫<strong>显式转换</strong>；引擎在运算时<strong>悄悄替你转</strong>的叫
        <strong>隐式转换（强制类型转换 / coercion）</strong>。隐式转换正是大量「诡异行为」的根源，
        而它背后只有三套规则：<strong>ToBoolean</strong>、<strong>ToNumber</strong>、<strong>ToString</strong>
        （对象还要先经 <strong>ToPrimitive</strong>）。

      </p>

      <h3>ToBoolean 与 falsy 值清单</h3>
      <p>
        任何值放进 <code>if</code> 条件、逻辑运算符里，都会走 ToBoolean。规则极简：
        <strong>记住八个 falsy 值，其余全部为 true</strong>。
      </p>
      <CodeBlock lang="js" title="ToBoolean：八个 falsy 值" code={toBooleanDemo} />
      <Callout variant="warn" title="空数组 / 空对象都是 truthy">
        初学者最容易栽在这：<code>{'[]'}</code> 和 <code>{'{}'}</code> 在布尔上下文里都是
        <strong>true</strong>。所以 <code>{'if ([]) { ... }'}</code> 一定会进分支。
        要判断数组是否为空，得看 <code>{'arr.length === 0'}</code>，而不是 <code>{'if (!arr)'}</code>。
      </Callout>

      <h3>ToNumber</h3>
      <p>
        算术运算、一元 <code>+</code>、比较运算等会触发 ToNumber。两个最常见的坑：
        <code>{'Number("")'}</code> 是 <code>0</code>（不是 <code>NaN</code>），
        而 <code>{'Number(null)'}</code> 是 <code>0</code>、<code>{'Number(undefined)'}</code>
        却是 <code>NaN</code>。
      </p>
      <CodeBlock lang="js" title="ToNumber：各种值转数字" code={toNumberDemo} />

      <h3>ToString、ToPrimitive 与 + 运算符</h3>
      <p>
        模板字符串、字符串拼接会触发 ToString。而对象转原始值要先经 <strong>ToPrimitive</strong>：
        引擎按场景调用对象的 <code>valueOf()</code> / <code>toString()</code>。普通对象
        <code>toString()</code> 给出 <code>{'"[object Object]"'}</code>，数组的
        <code>toString()</code> 把元素用逗号连起来（<code>{'[1,2,3]'}</code> 变 <code>{'"1,2,3"'}</code>）——
        这正是上面 <code>{'Number([1,2])'}</code> 得到 <code>NaN</code> 的原因。
      </p>
      <p>
        <code>+</code> 是最特殊的运算符：<strong>只要有一边是字符串就做拼接</strong>，否则做加法；
        而 <code>-</code> <code>*</code> <code>/</code> 等永远做数字运算。
      </p>
      <CodeBlock lang="js" title="+ 运算符 vs 模板字符串" code={plusVsTemplate} />
      <Example title="为什么 [] + {} 是 &quot;[object Object]&quot;">
        <p>
          <code>{'[] + {}'}</code> 中两边都是对象，<code>+</code> 先把它们各自 ToPrimitive 成字符串：
          <code>{'[]'}</code> 变 <code>{'""'}</code>，<code>{'{}'}</code> 变
          <code>{'"[object Object]"'}</code>，再拼接，得到 <code>{'"[object Object]"'}</code>。
          整个过程没有任何「加法」，全是字符串转换在作祟。
        </p>
      </Example>

      <h2>五、相等：== 与 ===</h2>
      <KeyIdea>
        <code>===</code>（严格相等）<strong>不做类型转换</strong>：类型不同直接返回 <code>false</code>。
        <code>==</code>（宽松相等）会<strong>先按规则把两边转成同类型再比</strong>，
        正是这套转换催生了无数反直觉的结果。结论先行：<strong>默认永远用 <code>===</code></strong>。
      </KeyIdea>
      <CodeBlock lang="js" title="== 与 === 对比" code={looseEqDemo} />

      <h3>== 的转换规则（简化版）</h3>
      <table>
        <thead>
          <tr><th>两边类型</th><th>== 的处理</th></tr>
        </thead>
        <tbody>
          <tr><td>同类型</td><td>等价于 <code>===</code>，不转换</td></tr>
          <tr><td><code>null</code> vs <code>undefined</code></td><td>互等，结果 <code>true</code>；且二者不与其它任何值相等</td></tr>
          <tr><td>number vs string</td><td>把 string 转成 number 再比</td></tr>
          <tr><td>boolean 参与</td><td>先把 boolean 转成 number（<code>true</code> → 1，<code>false</code> → 0）</td></tr>
          <tr><td>object vs 原始值</td><td>把 object 经 ToPrimitive 转原始值再比</td></tr>
          <tr><td>有一边是 <code>NaN</code></td><td>永远 <code>false</code></td></tr>
        </tbody>
      </table>

      <h3>经典面试题逐步推导</h3>
      <p>
        下面把几道「看起来违反直觉」的题，按规则一步步拆开。重点看 <code>{'[] == ![]'}</code>
        这道——它把布尔转换、ToPrimitive、字符串转数字三套规则全串了一遍。
      </p>
      <CodeBlock lang="js" title="经典题逐步推导" code={trickyEqDemo} />
      <p>
        <code>{'[] == ![]'}</code> 为 <code>true</code> 的推导链：
      </p>
      <ul>
        <li>第一步：<code>{'![]'}</code> 先算。<code>{'[]'}</code> 是 truthy，取反得 <code>false</code>。式子变 <code>{'[] == false'}</code>。</li>
        <li>第二步：<code>==</code> 遇到布尔，把 <code>false</code> 转数字 <code>0</code>。式子变 <code>{'[] == 0'}</code>。</li>
        <li>第三步：对象 vs 数字，<code>{'[]'}</code> 经 ToPrimitive 变空字符串 <code>{'""'}</code>。式子变 <code>{'"" == 0'}</code>。</li>
        <li>第四步：字符串 vs 数字，<code>{'""'}</code> 转数字得 <code>0</code>。式子变 <code>{'0 == 0'}</code>，结果 <code>true</code>。</li>
      </ul>
      <Callout variant="tip" title="== 的唯一推荐用法">
        如果你坚持要用 <code>==</code>，<strong>只有一个场景值得</strong>：用 <code>{'x == null'}</code>
        同时判断 <code>x</code> 是 <code>null</code> 或 <code>undefined</code>——这正好利用了
        「<code>null</code> 与 <code>undefined</code> 互等」的特例，简洁且无歧义。其余一律用 <code>===</code>。
      </Callout>

      <h2>六、NaN：不等于自己的值</h2>
      <p>
        <code>NaN</code>（Not a Number）是 number 类型里的一个特殊值，代表「无意义的数值运算结果」。
        它有一个独一无二的性质：<strong>不等于任何值，包括它自己</strong>。
      </p>
      <CodeBlock lang="js" title="NaN 的特性与正确判断" code={nanDemo} />
      <p>
        正因为 <code>{'NaN === NaN'}</code> 是 <code>false</code>，判断一个值是不是 <code>NaN</code>
        不能用相等运算，要用 <code>{'Number.isNaN(x)'}</code>。注意它和全局 <code>{'isNaN(x)'}</code>
        的区别：全局版会先对参数做 ToNumber，导致 <code>{'isNaN("abc")'}</code> 误报为 <code>true</code>；
        而 <code>{'Number.isNaN'}</code> 只在参数<strong>本身就是 NaN</strong> 时才返回 <code>true</code>，更严谨，优先用它。
      </p>

      <h2>七、易错点小结</h2>
      <ul>
        <li><code>{'typeof null'}</code> 是 <code>{'"object"'}</code>，判断 null 用 <code>{'=== null'}</code>。</li>
        <li>判断数组用 <code>{'Array.isArray()'}</code>，不要用 <code>typeof</code>。</li>
        <li><code>{'[]'}</code> 和 <code>{'{}'}</code> 都是 truthy；空字符串、<code>0</code>、<code>NaN</code> 才是 falsy。</li>
        <li><code>{'Number("")'}</code> 与 <code>{'Number(null)'}</code> 都是 <code>0</code>，<code>{'Number(undefined)'}</code> 是 <code>NaN</code>。</li>
        <li><code>+</code> 一边是字符串就拼接；其余算术运算符一律转数字。</li>
        <li>默认用 <code>===</code>；仅在判空时可用 <code>{'x == null'}</code>。</li>
        <li>判断 NaN 用 <code>{'Number.isNaN'}</code>，不要用 <code>===</code> 也别用全局 <code>isNaN</code>。</li>
      </ul>

      <Summary
        points={[
          'JS 的值分原始类型与对象；原始类型共七种：string / number / boolean / null / undefined / symbol / bigint，其余皆为对象。',
          'typeof 有两大特例：typeof null 是 "object"（历史 bug），函数是 "function"；判断 null 用 === null，判断数组用 Array.isArray。',
          '原始值调用方法靠「自动装箱」临时生成包装对象，用完即弃；切勿手动 new String/Number/Boolean。',
          '隐式转换只有三套规则 ToBoolean / ToNumber / ToString（对象先经 ToPrimitive）；八个 falsy 值之外全为 truthy，空数组空对象都是 true。',
          '+ 只要一边是字符串就拼接，其余算术运算转数字；模板字符串一律走 ToString，对象得到 "[object Object]"。',
          '=== 不转换类型，== 会先转换再比；默认永远用 ===，仅判空可用 x == null。[] == ![] 为 true 是布尔/ToPrimitive/字符串转数字三规则叠加的结果。',
          'NaN 不等于任何值（含自己），判断是否为 NaN 必须用 Number.isNaN，而非 === 或全局 isNaN。',
        ]}
      />
    </article>
  )
}
