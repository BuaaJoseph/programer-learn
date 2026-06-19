import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const iterableProtocol = `// 一个对象「可迭代」= 它有一个 [Symbol.iterator] 方法，
// 调用后返回一个「迭代器」：有 next()，每次返回 { value, done }

const arr = [10, 20]
const it = arr[Symbol.iterator]() // 拿到数组的迭代器
it.next() // { value: 10, done: false }
it.next() // { value: 20, done: false }
it.next() // { value: undefined, done: true }

// for...of 正是自动反复调用 next()，直到 done 为 true
for (const v of arr) {
  console.log(v) // 10, 20
}`

const builtinIterables = `// 这些内置类型都实现了可迭代协议，可直接 for...of：
for (const ch of 'abc') console.log(ch)          // 字符串
for (const v of [1, 2, 3]) console.log(v)        // 数组
for (const v of new Set([1, 2])) console.log(v)  // Set
for (const [k, v] of new Map([['a', 1]])) {}     // Map（产出 [键, 值]）

// 展开 ... 和解构也依赖可迭代协议
const chars = [...'abc']        // ['a', 'b', 'c']
const [first, ...rest] = 'abc'  // first='a', rest=['b','c']

// 注意：普通对象 {} 默认「不可迭代」，不能直接 for...of
// 要遍历对象用 Object.keys / entries / for...in`

const customIterable = `// 自定义可迭代对象：实现 [Symbol.iterator]
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from
    const last = this.to
    return {
      next() {
        if (current <= last) {
          return { value: current++, done: false }
        }
        return { value: undefined, done: true }
      },
    }
  },
}

for (const n of range) console.log(n) // 1 2 3 4 5
const list = [...range] // [1, 2, 3, 4, 5]`

const generatorBasic = `// function* 定义生成器；调用它不会立刻执行，而是返回一个生成器对象
function* gen() {
  console.log('开始')
  yield 1     // 在 yield 处暂停，把 1 交出去
  console.log('中间')
  yield 2
  console.log('结束')
}

const g = gen() // 此时函数体一行都还没跑
g.next() // 打印「开始」，返回 { value: 1, done: false }
g.next() // 打印「中间」，返回 { value: 2, done: false }
g.next() // 打印「结束」，返回 { value: undefined, done: true }

// 生成器对象本身既是迭代器，也是可迭代的，可直接 for...of
for (const v of gen()) console.log(v) // 1 2（中间的 console.log 照常执行）`

const generatorIterable = `// 用生成器实现「可迭代对象」，比手写 next() 简洁得多
const range = {
  from: 1,
  to: 5,
  *[Symbol.iterator]() {
    for (let i = this.from; i <= this.to; i++) {
      yield i // 用 yield 逐个产出，引擎自动维护 done
    }
  },
}

console.log([...range]) // [1, 2, 3, 4, 5]

// yield* 委托：把另一个可迭代对象的产值「转交」出去
function* concat(a, b) {
  yield* a
  yield* b
}
console.log([...concat([1, 2], [3, 4])]) // [1, 2, 3, 4]`

const lazyGenerator = `// 惰性序列：值「用到才算」，可表示无限序列而不爆内存
function* naturals() {
  let n = 1
  while (true) {
    yield n++ // 无限，但只有被 next() 拉取时才产生
  }
}

function take(iterable, count) {
  const result = []
  for (const v of iterable) {
    if (result.length >= count) break
    result.push(v)
  }
  return result
}

take(naturals(), 5) // [1, 2, 3, 4, 5] —— 只算了前 5 个`

const mapUsage = `const m = new Map()

// 任意类型都能当键（对象、函数、NaN……），普通对象只能用字符串/Symbol 键
const objKey = { id: 1 }
m.set(objKey, '关联数据')
m.set('name', 'Ada')
m.set(1, '数字键')   // 数字 1 与字符串 '1' 是不同的键

m.get(objKey)  // '关联数据'
m.has('name')  // true
m.size         // 3  （Object 没有 size，要 Object.keys(o).length）
m.delete(1)

// 有序：迭代顺序 = 插入顺序
for (const [k, v] of m) console.log(k, v)
m.forEach((v, k) => console.log(k, v))

// 与对象互转
const obj = Object.fromEntries(m) // Map -> 对象
const m2 = new Map(Object.entries({ a: 1 })) // 对象 -> Map`

const setUsage = `// Set：值的集合，自动去重，按插入顺序迭代
const s = new Set([1, 2, 2, 3, 3, 3])
console.log(s.size) // 3
s.add(4)
s.has(2)    // true
s.delete(1)

// 最常见用途：数组去重
const arr = [1, 1, 2, 3, 3]
const unique = [...new Set(arr)] // [1, 2, 3]

// 集合运算（手写）
const a = new Set([1, 2, 3])
const b = new Set([2, 3, 4])
const intersection = [...a].filter((x) => b.has(x)) // [2, 3]
const union = [...new Set([...a, ...b])]            // [1, 2, 3, 4]`

const weakUsage = `// WeakMap：键必须是对象，且为「弱引用」——
// 如果键对象在别处没有引用了，它能被 GC 回收，WeakMap 不会阻止
const cache = new WeakMap()

function getMeta(node) {
  if (!cache.has(node)) {
    cache.set(node, { visited: true })
  }
  return cache.get(node)
}
// 当某个 node 不再被使用，它在 cache 里的条目会被自动清理，避免内存泄漏

// WeakMap/WeakSet 的限制：键只能是对象、不可迭代、没有 size、不能清空遍历
// 典型用途：给对象「挂」私有数据 / 缓存，而不阻止对象被回收

const seen = new WeakSet()
function process(obj) {
  if (seen.has(obj)) return // 防止重复处理
  seen.add(obj)
}`

const symbolUsage = `// Symbol：每次调用都产生一个全局唯一、不可重复的值
const a = Symbol('desc') // 'desc' 只是描述，便于调试，不参与相等比较
const b = Symbol('desc')
console.log(a === b) // false —— 即使描述相同也不相等

// 作为对象属性键：保证不与任何其它键冲突，且默认不被常规遍历枚举
const id = Symbol('id')
const user = { name: 'Ada', [id]: 123 }
console.log(user[id])          // 123
console.log(Object.keys(user)) // ['name'] —— Symbol 键不出现
console.log(user[id] !== user['id']) // Symbol 键 ≠ 字符串键 'id'

// 知名 Symbol（well-known）：引擎用它们定制对象行为
// 最常见的就是 Symbol.iterator（决定一个对象如何被 for...of 迭代）
// 还有 Symbol.asyncIterator、Symbol.toPrimitive 等`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章讲的是「写起来更顺手」的语法糖，这一章深入到 ES6 给语言加的几块<strong>基础设施</strong>：
        可迭代协议（为什么 <code>for...of</code> 能遍历数组、字符串、Set）、生成器
        <code>function*</code>（可以暂停和恢复的函数，天生适合做惰性序列）、新集合类型
        Map / Set / WeakMap / WeakSet，以及作为「唯一标识」的 Symbol。
        理解它们，你才能真正看懂展开、解构、<code>for...of</code> 背后的机制，并选对数据结构。
      </Lead>

      <h2>一、可迭代协议：for...of 到底在做什么</h2>
      <KeyIdea>
        一个对象「可迭代（iterable）」，意味着它有一个名为 <code>[Symbol.iterator]</code> 的方法。
        调用这个方法会返回一个「迭代器（iterator）」——一个带 <code>next()</code> 的对象，
        每次调用 <code>next()</code> 返回 <code>{'{ value, done }'}</code>。
        <code>for...of</code>、展开 <code>...</code>、解构，背后都是在反复调用这套接口。
      </KeyIdea>
      <p>
        这里有两个协议：<strong>可迭代协议</strong>（对象实现 <code>[Symbol.iterator]</code>）和
        <strong>迭代器协议</strong>（对象实现 <code>next()</code>，返回带 <code>value</code> 和
        <code>done</code> 的结果）。<code>for...of</code> 先向对象要一个迭代器，
        再不断调用 <code>next()</code>，把 <code>value</code> 交给循环体，直到 <code>done</code> 为
        <code>true</code> 停止。
      </p>
      <CodeBlock lang="js" title="迭代器协议：手动驱动 next()" code={iterableProtocol} />

      <h3>哪些内置类型可迭代</h3>
      <p>
        数组、字符串、<code>Set</code>、<code>Map</code>、<code>arguments</code>、
        DOM 的 <code>NodeList</code> 等都内置实现了可迭代协议，所以能直接 <code>for...of</code>、
        能被展开、能被解构。<strong>普通对象 <code>{'{}'}</code> 默认不可迭代</strong>，
        遍历它要用 <code>Object.keys / values / entries</code> 或 <code>for...in</code>。
      </p>
      <CodeBlock lang="js" title="内置可迭代类型与依赖迭代协议的语法" code={builtinIterables} />

      <h3>自定义可迭代对象</h3>
      <p>
        既然规则透明，我们就能让自己的对象「可被 <code>for...of</code> 遍历」：
        给它实现一个 <code>[Symbol.iterator]</code> 方法，返回一个带 <code>next()</code> 的迭代器即可。
      </p>
      <CodeBlock lang="js" title="手写一个可迭代的 range 对象" code={customIterable} />
      <Callout variant="note" title="可迭代 ≠ 迭代器">
        <strong>可迭代对象</strong>是「能产出迭代器的对象」（有 <code>[Symbol.iterator]</code>）；
        <strong>迭代器</strong>是「真正逐个吐值的对象」（有 <code>next()</code>）。
        很多迭代器自身也实现了 <code>[Symbol.iterator]</code> 返回自己，所以它既是迭代器又可迭代——
        生成器对象就是典型。
      </Callout>

      <h2>二、生成器 function* 与 yield</h2>
      <p>
        手写 <code>next()</code> 维护内部状态既繁琐又易错。生成器（generator）是语言给的「自动挡」：
        用 <code>function*</code> 定义，函数体里用 <code>yield</code> 交出一个值并<strong>暂停</strong>，
        下次调用 <code>next()</code> 时从暂停处<strong>恢复</strong>继续执行。
        它是 JS 里唯一能「中途暂停、之后再继续」的普通函数形态。
      </p>
      <CodeBlock lang="js" title="生成器基础：暂停与恢复" code={generatorBasic} />
      <p>
        关键点：调用生成器函数<strong>不会立即执行函数体</strong>，只返回一个生成器对象；
        函数体每次只跑到下一个 <code>yield</code> 就停。生成器对象同时满足迭代器协议和可迭代协议，
        所以可以直接 <code>for...of</code> 和展开。
      </p>

      <h3>用生成器实现迭代器</h3>
      <p>
        把上面手写的 <code>range</code> 用生成器重写，代码量骤减——
        <code>done</code> 的维护全交给引擎，你只管 <code>yield</code> 该产出的值。
        <code>yield*</code> 还能把另一个可迭代对象的产值「委托」转交出去。
      </p>
      <CodeBlock lang="js" title="生成器版 range 与 yield* 委托" code={generatorIterable} />

      <h3>惰性序列：可暂停带来的威力</h3>
      <p>
        因为生成器「拉一次才算一次」，它天然适合表示<strong>惰性序列</strong>，
        甚至是<strong>无限序列</strong>：用 <code>while (true)</code> 不停 <code>yield</code> 也不会卡死，
        只在消费方真正取值时才计算。这就是「惰性求值（lazy evaluation）」。
      </p>
      <CodeBlock lang="js" title="无限自然数序列与 take（只算前 N 个）" code={lazyGenerator} />
      <Callout variant="tip" title="生成器的实战价值">
        惰性 + 可暂停让生成器适合：分页 / 流式处理大数据（不必一次性载入全部）、
        实现自定义迭代逻辑、状态机、以及早期 async 库里用它模拟「等待」。
        日常你最常用到的，往往是「用它给对象写一个干净的 <code>[Symbol.iterator]</code>」。
      </Callout>

      <h2>三、Map：任意键、有序、有 size</h2>
      <p>
        <code>Map</code> 是键值对集合。和普通对象相比，它有三大优势：
        <strong>键可以是任意类型</strong>（对象、函数都行，不会被转成字符串）；
        <strong>迭代顺序就是插入顺序</strong>；以及直接有 <code>size</code> 属性和
        <code>set / get / has / delete</code> 等专用方法。
      </p>
      <CodeBlock lang="js" title="Map 的常用操作与对象互转" code={mapUsage} />

      <h2>四、Set：去重的集合</h2>
      <p>
        <code>Set</code> 是「值的集合」，自动去重、按插入顺序迭代。
        最常见的用途就是<strong>数组去重</strong>（<code>[...new Set(arr)]</code>），
        以及做交集 / 并集这类集合运算。
      </p>
      <CodeBlock lang="js" title="Set：去重与集合运算" code={setUsage} />

      <h2>五、WeakMap / WeakSet：不阻止垃圾回收的弱引用</h2>
      <p>
        <code>WeakMap</code> / <code>WeakSet</code> 的键（成员）必须是<strong>对象</strong>，
        并且是<strong>弱引用</strong>：如果某个键对象在程序别处已经没有引用，
        垃圾回收器可以自由回收它，而 Weak 容器<strong>不会</strong>因为「还持有它」就阻止回收。
        这正是它们防止内存泄漏的核心价值。
      </p>
      <CodeBlock lang="js" title="WeakMap 做缓存 / 私有数据，WeakSet 防重复" code={weakUsage} />
      <Callout variant="warn" title="Weak 容器的限制">
        因为成员随时可能被回收，<code>WeakMap</code> / <code>WeakSet</code>
        <strong>不可迭代、没有 <code>size</code>、不能 <code>clear</code> 遍历</strong>，
        键也只能是对象（不能是字符串、数字等原始值）。它们专为「给对象挂附属数据而不影响其生命周期」而生，
        需要遍历或统计就用普通 Map / Set。
      </Callout>

      <h2>六、Symbol：唯一的标识符</h2>
      <p>
        <code>Symbol</code> 是 ES6 新增的原始类型，每次 <code>Symbol()</code> 调用都产生一个
        <strong>全局唯一、无法重复</strong>的值。它最主要的用途是作为<strong>对象属性键</strong>：
        用 Symbol 当键既能保证绝不与其它键冲突，又默认不被 <code>for...in</code> /
        <code>Object.keys</code> 这类常规遍历枚举到，适合存放「框架内部 / 私有」的元数据。
      </p>
      <CodeBlock lang="js" title="Symbol：唯一值与作为属性键" code={symbolUsage} />
      <p>
        还有一类<strong>知名 Symbol（well-known symbols）</strong>，是引擎预定义、用来定制对象行为的钩子。
        本章一开始用到的 <code>Symbol.iterator</code> 就是其中最重要的一个——它决定了对象如何被
        <code>for...of</code> 迭代。其它如 <code>Symbol.asyncIterator</code>（异步迭代）、
        <code>Symbol.toPrimitive</code>（对象转原始值）等，了解其存在即可。
      </p>
      <Example title="把全章串起来：Symbol.iterator 是枢纽">
        <p>
          一个对象之所以能被 <code>for...of</code>、被展开 <code>...</code>、被解构，
          全因为它在 <code>Symbol.iterator</code> 这个<strong>知名 Symbol</strong> 键上挂了一个返回
          <strong>迭代器</strong>的方法；而写这个方法最省事的办法，就是用<strong>生成器</strong>。
          于是 Symbol、可迭代协议、生成器三者在这里汇成一条线。
        </p>
      </Example>

      <h2>七、Map vs Object、Set 用途一览</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Map</th><th>普通 Object</th></tr>
        </thead>
        <tbody>
          <tr><td>键的类型</td><td>任意（含对象、函数）</td><td>仅字符串 / Symbol</td></tr>
          <tr><td>顺序</td><td>保证插入顺序</td><td>大体插入序，整数键会被重排</td></tr>
          <tr><td>大小</td><td><code>map.size</code> 直接拿</td><td>需 <code>Object.keys(o).length</code></td></tr>
          <tr><td>迭代</td><td>原生可迭代（for...of）</td><td>不可直接迭代，需 entries</td></tr>
          <tr><td>意外键</td><td>无原型链污染风险</td><td>可能撞到原型上的键</td></tr>
          <tr><td>适合</td><td>频繁增删、键非字符串、需有序统计</td><td>固定结构的记录 / JSON 数据</td></tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr><th>类型</th><th>核心用途</th><th>能否迭代 / size</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Set</code></td><td>去重、成员判断、集合运算</td><td>可迭代，有 size</td></tr>
          <tr><td><code>Map</code></td><td>任意键的键值映射、有序字典</td><td>可迭代，有 size</td></tr>
          <tr><td><code>WeakSet</code></td><td>标记对象（如防重复处理），不阻止回收</td><td>不可迭代，无 size</td></tr>
          <tr><td><code>WeakMap</code></td><td>给对象挂缓存 / 私有数据，不阻止回收</td><td>不可迭代，无 size</td></tr>
        </tbody>
      </table>

      <Summary
        points={[
          '可迭代协议：对象有 [Symbol.iterator] 方法返回迭代器（带 next()，产出 { value, done }）；for...of、展开、解构都基于它。',
          '数组/字符串/Set/Map 等内置可迭代，普通对象 {} 默认不可迭代；可自定义 [Symbol.iterator] 让对象支持 for...of。',
          '生成器 function* + yield 是可暂停/恢复的函数，调用不立即执行只返回生成器对象，next() 跑到下一个 yield；天然实现迭代器。',
          '生成器适合惰性序列与无限序列（用到才算），yield* 可委托转交另一个可迭代对象的产值。',
          'Map 键可任意类型、保序、有 size，优于对象做频繁增删的字典；Set 自动去重，[...new Set(arr)] 是去重惯用法。',
          'WeakMap/WeakSet 键必须是对象且为弱引用，不阻止 GC，但不可迭代、无 size，适合给对象挂附属数据/缓存。',
          'Symbol 是全局唯一值，作属性键不冲突且默认不被常规枚举；知名 Symbol（如 Symbol.iterator）是定制对象行为的钩子。',
        ]}
      />
    </article>
  )
}
