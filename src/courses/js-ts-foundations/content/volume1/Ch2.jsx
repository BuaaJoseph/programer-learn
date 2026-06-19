import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const valueCopyDemo = `// 原始值：按值复制，两个变量互不相干
let a = 10
let b = a      // 把 10 这个值复制一份给 b
b = 20         // 改 b
console.log(a) // 10 ← a 毫发无损

let s1 = "hi"
let s2 = s1
s2 = "bye"
console.log(s1) // "hi"`

const refShareDemo = `// 引用类型：复制的是「引用」，两个变量指向同一个对象
let obj1 = { count: 1 }
let obj2 = obj1       // obj2 和 obj1 指向堆里同一个对象
obj2.count = 99       // 通过 obj2 改对象
console.log(obj1.count) // 99 ← obj1 也「变了」，因为本来就是同一个

// 数组同理
let arr1 = [1, 2, 3]
let arr2 = arr1
arr2.push(4)
console.log(arr1)     // [1, 2, 3, 4] ← 意外共享`

const compareDemo = `// === 比较引用类型时，比的是「是不是同一个对象」，不是内容
{} === {}                       // false（两个不同的新对象）
[] === []                       // false
[1, 2] === [1, 2]               // false（内容相同，但不是同一个）

const a = { x: 1 }
const b = a
a === b                         // true（同一个引用）

// 想比内容，需要自己写比较，或序列化（有局限，见后文）
JSON.stringify({a:1}) === JSON.stringify({a:1}) // true`

const shallowCopyDemo = `const original = { name: "Tom", info: { age: 18 } }

// 三种常见浅拷贝方式
const copy1 = { ...original }              // 展开运算符（最常用）
const copy2 = Object.assign({}, original)  // Object.assign
// 数组：
const arr = [1, 2, 3]
const arrCopy1 = [...arr]                  // 展开
const arrCopy2 = arr.slice()               // slice()

// 第一层是「独立」的
copy1.name = "Jerry"
console.log(original.name)  // "Tom" ← 第一层互不影响

// 但嵌套对象仍然共享！
copy1.info.age = 99
console.log(original.info.age) // 99 ← info 是同一个引用，被改了`

const deepCopyDemo = `const original = { name: "Tom", info: { age: 18 }, tags: ["a", "b"] }

// 方式一：structuredClone（现代浏览器 / Node 17+ 内置，推荐）
const deep1 = structuredClone(original)
deep1.info.age = 99
console.log(original.info.age) // 18 ← 嵌套也独立了

// 方式二：JSON 法（简单但有坑，见 Callout）
const deep2 = JSON.parse(JSON.stringify(original))

// 方式三：手写递归（理解原理用）
function deepClone(value) {
  if (value === null || typeof value !== "object") return value // 原始值直接返回
  if (Array.isArray(value)) return value.map(deepClone)
  const result = {}
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone(value[key]) // 递归处理每个属性
    }
  }
  return result
}`

const jsonPitfallDemo = `const obj = {
  fn: () => 1,          // 函数
  und: undefined,       // undefined
  sym: Symbol("s"),     // symbol
  date: new Date(),     // 日期
  nan: NaN,             // NaN
  inf: Infinity,        // Infinity
}

console.log(JSON.parse(JSON.stringify(obj)))
// {
//   date: "2026-06-17T...",  ← Date 变成了字符串！
//   nan: null,               ← NaN 变 null
//   inf: null,               ← Infinity 变 null
// }
// fn / und / sym 三个属性「凭空消失」——JSON 不支持它们
// 此外：循环引用会直接抛错 TypeError`

const passByDemo = `// 函数传参是「按共享传递」：传进去的是引用的副本

// 1) 改对象的属性 —— 外部能看到（因为指向同一个对象）
function mutate(o) { o.count = 99 }
const obj = { count: 1 }
mutate(obj)
console.log(obj.count) // 99 ← 被改了

// 2) 重新赋值参数 —— 外部看不到（只是把局部的引用副本指向别处）
function reassign(o) { o = { count: 0 } }
const obj2 = { count: 1 }
reassign(obj2)
console.log(obj2.count) // 1 ← 不受影响`

const immutableDemo = `// 不可变更新：不改原对象，而是基于它造一个新对象

const state = { user: { name: "Tom" }, count: 1 }

// ❌ 直接改（在 React/Vue 里可能不触发更新，且破坏可预测性）
// state.count = 2

// ✅ 用展开创建新对象，只覆盖要变的字段
const next = { ...state, count: 2 }

// 嵌套更新：逐层展开
const next2 = {
  ...state,
  user: { ...state.user, name: "Jerry" },
}

// 数组同理：用 map / filter / 展开，而不是 push / splice
const list = [1, 2, 3]
const added = [...list, 4]          // 而非 list.push(4)
const removed = list.filter(x => x !== 2)
const updated = list.map(x => (x === 2 ? 20 : x))`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章讲值与类型，这一章我们深入到一个让无数人栽跟头的话题：<strong>值类型与引用类型</strong>。
        为什么 <code>{'b = a'}</code> 后改 <code>b</code> 有时影响 <code>a</code>、有时不影响？为什么
        <code>{'{} === {}'}</code> 是 <code>false</code>？为什么「拷贝」了对象，改副本却动了原件？
        理解了「栈与堆、值与引用」这一套心智模型，这些谜题会瞬间清晰，
        也为后面理解 React / Vue 的「不可变更新」打下地基。
      </Lead>

      <h2>一、值类型 vs 引用类型</h2>
      <KeyIdea>
        <strong>原始值</strong>（七种原始类型）按<strong>值</strong>存储与复制，可粗略理解为「存在栈上」；
        <strong>对象 / 数组 / 函数</strong>是引用类型，对象本体「存在堆上」，变量里持有的只是
        <strong>指向它的引用（地址）</strong>。赋值、传参时复制的，是值还是引用，决定了一切行为差异。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>值类型（原始值）</th><th>引用类型（对象）</th></tr>
        </thead>
        <tbody>
          <tr><td>包含</td><td>string / number / boolean / null / undefined / symbol / bigint</td><td>object / array / function / Date / ...</td></tr>
          <tr><td>存储</td><td>值本身（概念上在栈）</td><td>本体在堆，变量持有引用</td></tr>
          <tr><td>赋值 / 传参</td><td>复制值本身</td><td>复制引用（仍指向同一本体）</td></tr>
          <tr><td>可变性</td><td>不可变</td><td>可变</td></tr>
          <tr><td>=== 比较</td><td>比值是否相等</td><td>比是否同一个引用</td></tr>
        </tbody>
      </table>

      <h2>二、值类型：按值复制，互不相干</h2>
      <p>
        原始值赋给另一个变量时，复制的是<strong>值本身</strong>。从此两个变量各持一份，
        改一个绝不影响另一个。
      </p>
      <CodeBlock lang="js" title="原始值：按值复制" code={valueCopyDemo} />

      <h2>三、引用类型：复制引用导致的「意外共享」</h2>
      <p>
        对象不一样。<code>{'obj2 = obj1'}</code> 复制的不是对象内容，而是那个<strong>引用</strong>——
        两个变量像两个标签，贴在堆里<strong>同一个对象</strong>上。于是通过任意一个标签去改对象，
        另一个「看到的」也变了。这就是著名的「意外共享」bug 的根源。
      </p>
      <CodeBlock lang="js" title="引用类型：意外共享" code={refShareDemo} />
      <Callout variant="warn" title="区分「改对象」与「重新赋值」">
        <code>{'obj2.count = 99'}</code> 是<strong>修改对象本体</strong>，会影响所有指向它的变量；
        而 <code>{'obj2 = {}'}</code> 是<strong>让 obj2 改指向一个新对象</strong>，
        原来的 <code>obj1</code> 不受影响。一个动本体，一个动标签，结果天差地别。
      </Callout>

      <h2>四、比较：比的是引用，不是内容</h2>
      <p>
        引用类型用 <code>===</code>（或 <code>==</code>）比较时，问的是「<strong>是不是同一个对象</strong>」，
        而非「内容是否相同」。所以两个长得一模一样的新对象永远不相等。
      </p>
      <CodeBlock lang="js" title="对象比较的是引用" code={compareDemo} />
      <p>
        想比较「内容」，要么逐字段递归对比，要么序列化成字符串再比（如
        <code>{'JSON.stringify(a) === JSON.stringify(b)'}</code>）——但后者依赖属性顺序、
        且无法处理函数等，只能用于简单数据。
      </p>

      <h2>五、浅拷贝：只复制第一层</h2>
      <p>
        既然直接赋值会共享，那就「拷贝」。最常用的是<strong>浅拷贝（shallow copy）</strong>：
        展开运算符 <code>{'{ ...obj }'}</code>、<code>{'Object.assign({}, obj)'}</code>、
        数组的 <code>{'arr.slice()'}</code> / <code>{'[...arr]'}</code>。
      </p>
      <KeyIdea>
        浅拷贝只复制<strong>第一层</strong>属性。第一层的原始值是独立的副本，
        但第一层里若是<strong>嵌套对象</strong>，复制的仍是那个嵌套对象的<strong>引用</strong>——
        于是嵌套层依旧共享。这是浅拷贝最大的局限。
      </KeyIdea>
      <CodeBlock lang="js" title="浅拷贝及其局限" code={shallowCopyDemo} />

      <h2>六、深拷贝：连嵌套一起复制</h2>
      <p>
        要让嵌套层也彻底独立，需要<strong>深拷贝（deep copy）</strong>。现代环境首选内置的
        <code>structuredClone()</code>；老办法是 <code>{'JSON.parse(JSON.stringify(obj))'}</code>（坑多）；
        理解原理可以手写递归。
      </p>
      <CodeBlock lang="js" title="三种深拷贝方式" code={deepCopyDemo} />
      <Callout variant="warn" title="JSON 深拷贝的坑">
        <code>{'JSON.parse(JSON.stringify(obj))'}</code> 看似方便，但会悄悄丢数据或出错：
        函数、<code>undefined</code>、<code>symbol</code> 属性会直接<strong>消失</strong>；
        <code>Date</code> 变成字符串；<code>NaN</code> / <code>Infinity</code> 变成 <code>null</code>；
        遇到<strong>循环引用</strong>直接抛 <code>TypeError</code>。只适合纯粹的 JSON 安全数据。
      </Callout>
      <CodeBlock lang="js" title="JSON 深拷贝丢数据演示" code={jsonPitfallDemo} />
      <Example title="该用哪种拷贝？">
        <p>
          <strong>只改第一层</strong>（如更新一个扁平配置对象的某个字段）：浅拷贝足够，用展开运算符。
        </p>
        <p>
          <strong>有嵌套且要彻底隔离</strong>，且数据可能含 Date / Map / 循环引用：用
          <code>structuredClone</code>。
        </p>
        <p>
          <strong>数据是纯 JSON、且确定不含函数 / undefined / Date</strong>：JSON 法可用，但要清楚它的边界。
        </p>
      </Example>

      <h2>七、函数传参：按共享传递</h2>
      <p>
        JS 的传参方式常被简化说成「值传递」，更准确的说法是<strong>按共享传递（call by sharing）</strong>：
        传进函数的是<strong>引用的副本</strong>。这导致两种看似矛盾的现象，其实和第三节是一回事——
        <strong>改对象本体</strong>外部可见，<strong>给参数重新赋值</strong>外部不可见。
      </p>
      <CodeBlock lang="js" title="按共享传递的两种表现" code={passByDemo} />

      <h2>八、不可变更新：与 React / Vue 的呼应</h2>
      <p>
        理解了「引用共享」，就能理解现代前端框架为什么强调<strong>不可变更新（immutable update）</strong>：
        不去原地修改对象，而是<strong>基于旧对象创建一个新对象</strong>。
      </p>
      <p>
        原因有两点：其一，React 靠<strong>比较前后引用是否改变</strong>来决定要不要重渲染——
        若你原地改了对象（引用没变），它可能<strong>察觉不到变化</strong>而漏更新；
        其二，不可变让状态变化<strong>可预测、可追溯</strong>，调试与时间旅行都更容易。
      </p>
      <CodeBlock lang="js" title="不可变更新的写法" code={immutableDemo} />
      <Callout variant="tip" title="一句话原则">
        在 React / Vue（尤其 React）里，<strong>永远不要原地 mutate 状态</strong>。
        用展开运算符、<code>map</code> / <code>filter</code> 等返回<strong>新对象 / 新数组</strong>，
        让引用发生改变，框架才能正确感知更新。这正是本章「引用」知识在工程里的直接落地。
      </Callout>

      <h2>九、易错点小结</h2>
      <ul>
        <li>对象赋值复制的是<strong>引用</strong>，不是内容；改一个会影响所有指向它的变量。</li>
        <li><code>{'{} === {}'}</code> 为 <code>false</code>：对象比较的是「是否同一个」，不是内容。</li>
        <li>浅拷贝只独立第一层，<strong>嵌套对象仍共享</strong>。</li>
        <li>深拷贝优先 <code>structuredClone</code>；JSON 法会丢函数 / undefined / symbol，变形 Date / NaN / Infinity，且循环引用报错。</li>
        <li>传参是按共享传递：改属性外部可见，重新赋值外部不可见。</li>
        <li>框架里要不可变更新：返回新对象 / 新数组，靠引用变化触发更新。</li>
      </ul>

      <Summary
        points={[
          '原始值按值复制、互不相干；对象 / 数组 / 函数是引用类型，变量持有指向堆中本体的引用。',
          '对象赋值只复制引用，导致「意外共享」——通过任一变量改对象本体，其它变量都受影响。',
          '引用类型用 === 比的是「是否同一个对象」而非内容，故 {} === {} 与 [] === [] 都为 false。',
          '浅拷贝（展开 / Object.assign / slice）只独立第一层，嵌套对象仍共享引用。',
          '深拷贝首选 structuredClone；JSON 法会丢失函数 / undefined / symbol、变形 Date / NaN / Infinity、循环引用报错；也可手写递归。',
          '函数传参是「按共享传递」：修改对象属性外部可见，给参数重新赋值外部不可见。',
          '不可变更新（返回新对象 / 新数组）是 React/Vue 正确感知状态变化的前提，切勿原地 mutate。',
        ]}
      />
    </article>
  )
}
