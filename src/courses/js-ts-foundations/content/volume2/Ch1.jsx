import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const threeFormsSnippet = `// 形态一：函数声明（function declaration）
function add(a, b) {
  return a + b
}

// 形态二：函数表达式（function expression）
// 把一个匿名（或具名）函数赋值给变量
const sub = function (a, b) {
  return a - b
}

// 形态三：箭头函数（arrow function）—— ES6 引入
const mul = (a, b) => a * b

console.log(add(1, 2)) // 3
console.log(sub(5, 2)) // 3
console.log(mul(3, 4)) // 12`

const hoistSnippet = `// 函数声明会被整体提升：调用写在定义之前也能跑
sayHi() // 正常输出 "hi"
function sayHi() {
  console.log('hi')
}

// 函数表达式只提升变量名，不提升赋值
sayBye() // TypeError: sayBye is not a function
var sayBye = function () {
  console.log('bye')
}
// 等价于：var sayBye; sayBye(); sayBye = function(){...}
// 调用时 sayBye 还是 undefined，undefined() 报错`

const tdzSnippet = `// var：声明被提升，初始值是 undefined（不报错，但拿到 undefined）
console.log(a) // undefined
var a = 1

// let / const：也会“提升”，但在声明前处于暂时性死区（TDZ）
console.log(b) // ReferenceError: Cannot access 'b' before initialization
let b = 2

// TDZ 从作用域顶部开始，到声明语句执行为止
// 在这段“死区”里访问该变量，一律抛 ReferenceError`

const scopeChainSnippet = `const g = 'global'

function outer() {
  const o = 'outer'
  function inner() {
    const i = 'inner'
    // inner 里能看到：i（自身）、o（外层 outer）、g（全局）
    console.log(i, o, g) // inner outer global
  }
  inner()
}
outer()

// 关键：能访问哪些变量，由“函数写在代码的哪个位置”决定（词法/静态作用域），
// 而不是由“在哪里被调用”决定。`

const counterSnippet = `function createCounter() {
  let count = 0 // 这个变量被闭包“记住”，外部无法直接访问
  return {
    inc() { count += 1; return count },
    dec() { count -= 1; return count },
    value() { return count },
  }
}

const c = createCounter()
console.log(c.inc())   // 1
console.log(c.inc())   // 2
console.log(c.dec())   // 1
console.log(c.value()) // 1
// count 成了“私有变量”：只能通过返回的方法读写，外界访问不到`

const factorySnippet = `// 函数工厂：用闭包“锁住”不同的配置，批量生产定制函数
function makeAdder(step) {
  return function (n) {
    return n + step // 每个返回的函数都记住了自己的 step
  }
}

const add5 = makeAdder(5)
const add10 = makeAdder(10)
console.log(add5(1))  // 6
console.log(add10(1)) // 11
// add5 与 add10 各自闭包了不同的 step，互不干扰`

const debounceSnippet = `// 防抖：用闭包保存定时器句柄
function debounce(fn, delay) {
  let timer = null // 被闭包记住，每次调用都访问同一个 timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const onResize = debounce(() => console.log('resize 结束'), 200)
window.addEventListener('resize', onResize)
// 连续触发时不断清掉上一个定时器，只有“安静”超过 200ms 才真正执行`

const loopBugSnippet = `// 经典坑：var 没有块级作用域，三个回调闭包的是同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：3 3 3
// 原因：setTimeout 的回调在循环结束后才执行，
// 此时整个循环只有一个 i，它早已变成 3`

const loopFixSnippet = `// 修复一：用 let —— 每次迭代生成一个全新的块级绑定 i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：0 1 2

// 修复二：用 IIFE 立即执行函数，把当时的 i 作为参数“拍照”存进闭包
for (var j = 0; j < 3; j++) {
  ;(function (x) {
    setTimeout(() => console.log(x), 100)
  })(j)
}
// 输出：0 1 2`

export default function Ch1() {
  return (
    <article>
      <Lead>
        函数是 JavaScript 的一等公民——它能被赋值给变量、作为参数传递、当作返回值，
        正是这种“函数可以被自由搬运”的能力，催生了 JavaScript 里最优雅也最容易让人困惑的特性：
        <strong>闭包</strong>。这一章我们从函数的三种形态讲起，理清变量提升与暂时性死区，
        建立起词法作用域与作用域链的心智模型，最后把闭包讲透：它是什么、能干什么、又会在哪里坑你。
      </Lead>

      <h2>一、函数的三种形态</h2>
      <p>
        在 JavaScript 里定义一个函数，常见有三种写法：<strong>函数声明</strong>、
        <strong>函数表达式</strong>和 <strong>箭头函数</strong>。它们看起来只是语法不同，
        但在“提升行为”“this 绑定”“是否具名”上有真实差异，写代码时要分清。
      </p>
      <CodeBlock lang="js" title="三种形态的基本写法" code={threeFormsSnippet} />
      <p>
        三者的区别可以用下面这张表概括。其中 <code>this</code> 一栏是后面一章的主题，
        这里先有个印象：箭头函数<strong>没有自己的</strong> <code>this</code>。
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>函数声明</th>
            <th>函数表达式</th>
            <th>箭头函数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>写法</td>
            <td><code>function f(){}</code></td>
            <td><code>{'const f = function(){}'}</code></td>
            <td><code>{'const f = () => {}'}</code></td>
          </tr>
          <tr>
            <td>整体提升</td>
            <td>会（可先调用后定义）</td>
            <td>不会（只提升变量名）</td>
            <td>不会（只提升变量名）</td>
          </tr>
          <tr>
            <td>自己的 this</td>
            <td>有</td>
            <td>有</td>
            <td>没有（取外层）</td>
          </tr>
          <tr>
            <td>能否作构造函数 new</td>
            <td>能</td>
            <td>能</td>
            <td>不能</td>
          </tr>
          <tr>
            <td>arguments 对象</td>
            <td>有</td>
            <td>有</td>
            <td>没有</td>
          </tr>
        </tbody>
      </table>

      <h2>二、变量提升与暂时性死区（TDZ）</h2>
      <KeyIdea>
        JavaScript 引擎在执行代码前会先“扫一遍”当前作用域，把声明登记好——这就是
        <strong>提升（hoisting）</strong>。但不同声明方式的提升行为差别很大：
        <code>function</code> 声明整体提升、<code>var</code> 只提升名字、
        <code>let</code> / <code>const</code> 提升后会落入<strong>暂时性死区</strong>。
      </KeyIdea>
      <p>
        先看函数声明：它会被<strong>整体提升</strong>到作用域顶部，所以你可以在定义之前就调用它。
        而函数表达式只是“把函数赋值给变量”，提升的只是变量名，赋值动作仍留在原地，
        因此在赋值之前调用它会报错。
      </p>
      <CodeBlock lang="js" title="函数声明 vs 函数表达式的提升差异" code={hoistSnippet} />
      <p>
        再看变量。用 <code>var</code> 声明的变量会被提升，且初始值为 <code>undefined</code>——
        所以声明前访问不报错，只是拿到 <code>undefined</code>，这种“静默的怪异”往往是 bug 温床。
        而 <code>let</code> 和 <code>const</code> 同样会被提升，但在“声明语句真正执行”之前，
        变量处于<strong>暂时性死区（Temporal Dead Zone，TDZ）</strong>：任何访问都会直接抛
        <code>ReferenceError</code>。
      </p>
      <CodeBlock lang="js" title="var 的 undefined vs let/const 的 TDZ" code={tdzSnippet} />
      <Callout variant="tip" title="为什么要有 TDZ">
        TDZ 不是设计失误，而是刻意为之：它把“声明前使用变量”这种几乎一定是错误的行为，
        从 <code>var</code> 时代“悄悄给你 undefined”升级为“立刻报错”，让 bug 尽早暴露。
        实践上的结论很简单——<strong>优先用 <code>const</code>，需要重新赋值才用 <code>let</code>，
        尽量不用 <code>var</code></strong>。
      </Callout>

      <h2>三、词法作用域与作用域链</h2>
      <p>
        <strong>作用域</strong>决定了一段代码里“哪些变量可见、可访问”。JavaScript 采用
        <strong>词法作用域</strong>（也叫静态作用域）：一个函数能访问哪些外部变量，
        在它<strong>被书写</strong>的那一刻就由它在源码中的位置确定了，
        而不是由它“在哪里被调用”决定。这一点是理解闭包的地基。
      </p>
      <CodeBlock lang="js" title="嵌套函数与作用域链" code={scopeChainSnippet} />
      <p>
        当代码访问一个变量时，引擎先在当前作用域找；找不到就到外层作用域找；
        再找不到继续向更外层，一直找到全局作用域为止。这一条由内到外的查找路径，就叫
        <strong>作用域链</strong>。上例中 <code>inner</code> 能读到 <code>o</code> 和 <code>g</code>，
        正是沿着作用域链向外找到的。
      </p>
      <Callout variant="warn" title="别把作用域链和原型链搞混">
        作用域链解决的是“变量在哪能访问到”，沿着代码的<strong>嵌套结构</strong>向外查找；
        原型链解决的是“对象的属性 / 方法从哪继承”，沿着对象的 <code>__proto__</code> 向上查找。
        两者都是“链式查找”，但走的是完全不同的两条线，初学者很容易混为一谈。
      </Callout>

      <h2>四、闭包：函数 + 它定义时的词法环境</h2>
      <KeyIdea>
        <strong>闭包（closure）</strong>是指一个函数，连同它定义时所在的<strong>词法环境</strong>，
        被打包在一起。哪怕外层函数已经执行完毕、按理说局部变量该被销毁了，
        只要内层函数还引用着这些变量，它们就会被“记住”、继续存活。
        一句话：<strong>闭包让函数能记住并访问自己出生时所在的作用域</strong>。
      </KeyIdea>
      <p>
        每当你在一个函数内部定义并返回（或以其他方式向外暴露）另一个函数，而这个内层函数引用了
        外层的变量，闭包就产生了。下面这个计数器是最经典的例子：
      </p>
      <CodeBlock lang="js" title="计数器闭包：私有变量" code={counterSnippet} />
      <p>
        <code>createCounter</code> 执行完后，它的局部变量 <code>count</code> 本应随着调用结束而消失。
        但返回出去的三个方法都引用了 <code>count</code>，于是它被闭包“保活”，成为一个外界无法直接触碰
        的<strong>私有变量</strong>——这正是 JavaScript 实现数据封装的经典手法。
      </p>

      <h2>五、闭包的经典用途</h2>
      <h3>1. 私有变量与模块模式</h3>
      <p>
        如上一节，把状态藏进闭包、只暴露受控的读写方法，就得到了“私有变量”。把多个相关方法
        组织成一个返回对象，再配合 IIFE 一次性创建，就是经典的<strong>模块模式</strong>——
        在 ES Module 普及之前，它是 JavaScript 做封装的主力手段。
      </p>
      <h3>2. 函数工厂</h3>
      <p>
        让一个函数返回“被定制过”的新函数，用闭包锁住定制参数，就能批量生产功能相似但配置不同的函数。
      </p>
      <CodeBlock lang="js" title="函数工厂：用闭包锁住配置" code={factorySnippet} />
      <h3>3. 防抖 / 节流</h3>
      <p>
        防抖（debounce）和节流（throttle）这类高频事件优化工具，都依赖闭包来跨多次调用
        保存状态（定时器句柄、上次触发时间等）。没有闭包，这些状态就无处安放。
      </p>
      <CodeBlock lang="js" title="防抖：闭包保存定时器" code={debounceSnippet} />

      <h2>六、经典坑：循环里的 var 与 setTimeout</h2>
      <p>
        闭包最著名的“翻车现场”，是在 <code>for</code> 循环里用 <code>var</code> 配合异步回调。
        几乎每个 JavaScript 学习者都被它坑过：
      </p>
      <CodeBlock lang="js" title="坑：输出三个 3 而不是 0 1 2" code={loopBugSnippet} />
      <p>
        症结在于 <code>var</code> <strong>没有块级作用域</strong>：整个循环共享同一个 <code>i</code>。
        而 <code>setTimeout</code> 的回调是异步的，要等循环全部跑完才执行——那时三个回调闭包的
        都是同一个 <code>i</code>，它的值早已停在循环结束时的 <code>3</code>。所以输出是三个 3。
      </p>
      <Example title="两种修复方式">
        <p>
          <strong>方式一（推荐）：把 <code>var</code> 换成 <code>let</code></strong>。
          <code>let</code> 在每次迭代都创建一个<strong>全新的块级绑定</strong>，
          于是三个回调各自闭包了不同的 <code>i</code>，分别是 0、1、2。
        </p>
        <p>
          <strong>方式二（ES6 之前的老办法）：用 IIFE</strong>。把当前的 <code>i</code> 作为实参
          传进一个立即执行的函数，等于给每次迭代“拍了张快照”存进独立作用域，回调便能读到正确的值。
        </p>
      </Example>
      <CodeBlock lang="js" title="修复：let 或 IIFE" code={loopFixSnippet} />

      <h2>七、闭包与内存：能力的代价</h2>
      <p>
        闭包能“记住”外部变量，意味着这些变量<strong>不会被自动回收</strong>——只要闭包还活着，
        它引用的变量就一直占着内存。绝大多数情况这正是我们想要的，但若不小心让一个长期存活的对象
        （比如全局缓存、未解绑的事件监听器）闭包了大量数据，就可能造成<strong>内存泄漏</strong>。
      </p>
      <Callout variant="warn" title="用完记得断引用">
        典型场景：给 DOM 元素绑定了引用大量数据的事件处理器，元素移除时却没有
        <code>removeEventListener</code>，闭包就把那批数据一直钉在内存里。
        原则是——<strong>不再需要的闭包要主动解除引用</strong>（解绑事件、置空变量），
        让垃圾回收器能够回收。
      </Callout>

      <Callout variant="tip">
        下一章我们处理另一个高频困惑点：<code>this</code> 到底指向谁。你会看到，
        <code>this</code> 的值由“函数怎么被调用”决定，而<strong>箭头函数没有自己的 this</strong>——
        它捕获的正是本章讲的词法环境里的 <code>this</code>，前后呼应。
      </Callout>

      <Summary
        points={[
          '函数有三种形态：函数声明（整体提升、有 this）、函数表达式（只提升变量名）、箭头函数（不提升、没有自己的 this、不能 new）。',
          '提升行为各异：function 声明整体提升；var 提升后值为 undefined；let / const 提升后落入暂时性死区（TDZ），声明前访问直接抛 ReferenceError。',
          'JavaScript 是词法（静态）作用域：函数能访问哪些变量由它在源码中的书写位置决定；变量查找沿作用域链由内向外进行。',
          '闭包 = 函数 + 它定义时所在的词法环境；它让函数记住并持续访问外部变量，是私有变量、模块模式、函数工厂、防抖节流的基础。',
          '经典坑：for 循环里 var + setTimeout 会打印同一个最终值（三个 3），因为 var 无块级作用域；用 let（每次迭代新绑定）或 IIFE（快照参数）修复。',
          '闭包记住的变量不会自动释放：多数时候是特性，但滥用可能导致内存泄漏，用完应主动解绑 / 置空以便回收。',
        ]}
      />
    </article>
  )
}
