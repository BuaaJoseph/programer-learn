import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const helloSnippet = `// 在浏览器控制台或 Node 里都能跑
console.log("Hello, JavaScript!")

// 声明一个变量，不必写类型——这就是动态类型
let name = "Ada"
name = 42          // 同一个变量后面换成数字也合法
console.log(name)  // 42`

const dynamicTypeSnippet = `let x = "5"      // 此刻 x 是字符串
x = 5            // 现在 x 是数字
x = true         // 现在又成了布尔值
x = [1, 2, 3]    // 现在是数组

// typeof 可以在运行时查看当前类型
console.log(typeof "hi")   // "string"
console.log(typeof 123)    // "number"
console.log(typeof true)   // "boolean"
console.log(typeof undefined) // "undefined"`

const firstClassFnSnippet = `// 函数是「一等公民」：能赋给变量、当参数传、当返回值

// 1) 赋给变量
const square = function (n) {
  return n * n
}

// 2) 作为参数传给别的函数
const nums = [1, 2, 3]
const squared = nums.map(square)   // [1, 4, 9]

// 3) 作为返回值
function makeAdder(step) {
  return function (n) {
    return n + step
  }
}
const addTen = makeAdder(10)
console.log(addTen(5))   // 15`

const prototypeSnippet = `// 基于原型的面向对象：对象从「原型对象」继承属性与方法
const animal = {
  describe() {
    return "我是 " + this.name
  },
}

// 让 dog 以 animal 为原型
const dog = Object.create(animal)
dog.name = "旺财"
console.log(dog.describe())   // "我是 旺财"

// ES6 的 class 只是原型机制之上的语法糖
class Cat {
  constructor(name) {
    this.name = name
  }
  describe() {
    return "我是 " + this.name
  }
}
console.log(new Cat("咪咪").describe())`

const eventLoopSnippet = `// 单线程 + 事件循环：同步代码先跑完，异步回调排队等待
console.log("1 开始")

setTimeout(() => {
  console.log("3 定时器回调（异步，最后才执行）")
}, 0)

Promise.resolve().then(() => {
  console.log("2 微任务（在定时器之前执行）")
})

console.log("1.5 结束（同步代码）")

// 实际输出顺序：
// 1 开始
// 1.5 结束（同步代码）
// 2 微任务（在定时器之前执行）
// 3 定时器回调（异步，最后才执行）`

const weirdSnippet = `// JS 的「奇怪」一瞥——这些都将在后面章节细讲

// 1) 隐式类型转换
console.log(1 + "2")     // "12"   数字被转成字符串拼接
console.log("5" - 1)     // 4      字符串被转成数字相减
console.log([] + [])     // ""     两个空数组相加得空字符串

// 2) == 与 === 的区别（宽松相等会先做类型转换）
console.log(0 == "")     // true   两边都被转换后相等
console.log(0 === "")    // false  严格相等：类型不同直接不等
console.log(null == undefined)  // true

// 3) this 的指向取决于「怎么调用」，而非「在哪定义」
const obj = {
  val: 42,
  get() {
    return this.val
  },
}
const fn = obj.get
console.log(obj.get())   // 42   作为方法调用，this 指向 obj
// console.log(fn())     // 直接调用时 this 不再指向 obj`

export default function Ch1() {
  return (
    <article>
      <Lead>
        在写第一行代码之前，先认识一下我们要打交道的这门语言。JavaScript 是今天最普及的编程语言之一：
        每一个网页背后几乎都有它的身影，而借助 Node.js，它还跑进了服务器、命令行工具、甚至桌面应用里。
        这一章不教你写复杂程序，而是讲清楚 JS <strong>从哪里来、靠什么运行、性格如何</strong>，
        让你对它建立一个准确的整体印象，也为后面深入语法打好地基。
      </Lead>

      <h2>一、JS 的来历：10 天造出来的语言</h2>
      <p>
        1995 年，网景公司（Netscape）的工程师 <strong>Brendan Eich</strong> 据说只用了
        <strong>大约 10 天</strong>就设计出了 JavaScript 的第一个版本。当时网页还是纯静态的，
        网景希望给浏览器加一门轻量的脚本语言，让网页能响应用户的点击、做表单校验，而不必每次都
        请求服务器。于是这门「赶工」出来的语言诞生了——它的许多设计取舍（包括后面我们会吐槽的
        那些「奇怪」之处），都和这段仓促的出身有关。
      </p>
      <p>
        它最初叫 Mocha，后来改名 LiveScript，最终定名 <strong>JavaScript</strong>。
        这里要澄清一个常年的误会：<strong>JavaScript 和 Java 没有任何亲缘关系</strong>。
        当年 Java 正大红大紫，网景为了「蹭热度」做市场营销，才借用了 Java 的名字。
        两者只是名字像，语法、运行方式、设计哲学都不同。一句广为流传的话是：
        「JavaScript 之于 Java，就像雷锋之于雷峰塔」——名字相近，实则毫无关系。
      </p>

      <h3>从「网景的脚本」到 ECMAScript 标准</h3>
      <p>
        语言火起来后，微软的 IE 也搞了一套自己的实现（叫 JScript），各家浏览器行为不一致，
        开发者苦不堪言。为了统一，网景把 JavaScript 提交给标准化组织 <strong>ECMA International</strong>，
        由此诞生了语言规范 <strong>ECMAScript</strong>（简称 ES）。
      </p>
      <p>
        所以要分清两个名词：<strong>ECMAScript 是「规范／标准」</strong>，规定语言该有哪些特性；
        <strong>JavaScript 是这套规范在现实中的「实现」</strong>（也是大家口头的通称）。
        负责维护这套标准的委员会叫 <strong>TC39</strong>，由各大浏览器厂商、公司和社区代表组成，
        他们讨论、投票决定哪些新特性能进入语言。
      </p>
      <p>
        标准的演进有几个关键节点：<strong>ES5</strong>（2009）是一个长期稳定的基线版本；
        <strong>ES6（也叫 ES2015）</strong>是一次里程碑式的大更新，带来了
        <code>let</code>/<code>const</code>、箭头函数、<code>class</code>、模块、Promise 等一大批现代特性，
        我们今天写的「现代 JS」基本从这里起步。从 ES2015 之后，TC39 改为
        <strong>每年发布一个版本</strong>（ES2016、ES2017……），小步快跑、持续迭代。
      </p>
      <CodeBlock lang="js" title="你的第一段 JS：动态类型初体验" code={helloSnippet} />

      <table>
        <thead>
          <tr><th>名词</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>JavaScript</td><td>语言的通称，也是规范的具体实现</td></tr>
          <tr><td>ECMAScript（ES）</td><td>语言的官方规范／标准</td></tr>
          <tr><td>TC39</td><td>制定与维护 ECMAScript 标准的委员会</td></tr>
          <tr><td>ES5</td><td>2009 年的稳定基线版本</td></tr>
          <tr><td>ES6 / ES2015</td><td>里程碑大更新，现代 JS 的起点</td></tr>
          <tr><td>ES2016+</td><td>自此每年发布一个新版本</td></tr>
        </tbody>
      </table>

      <h2>二、JS 是一门怎样的语言：六个核心性格</h2>
      <KeyIdea>
        要快速理解 JavaScript，记住它的六个标签：动态弱类型、解释执行（现代靠 JIT 加速）、
        单线程加事件循环、函数是一等公民、基于原型的面向对象、自动垃圾回收。
        这六点几乎定义了写 JS 时的全部「手感」。
      </KeyIdea>

      <h3>1. 动态、弱类型</h3>
      <p>
        <strong>动态类型</strong>指的是：变量的类型在运行时才确定，而且声明变量时不用写类型。
        同一个变量，前一刻装字符串、后一刻装数字都没问题。
        <strong>弱类型</strong>则指：不同类型之间会发生<strong>隐式转换</strong>——
        比如把数字和字符串相加，JS 会自作主张把数字转成字符串再拼接。
        灵活是它的优点，但也正是无数 bug 的温床（后面有专门章节讲转换规则）。
      </p>
      <CodeBlock lang="js" title="动态类型：变量的类型可以随时变" code={dynamicTypeSnippet} />

      <h3>2. 解释执行，靠 JIT 加速</h3>
      <p>
        传统印象里 JS 是「解释型语言」：代码不需要像 C/C++ 那样先编译成机器码，
        而是交给引擎边读边执行。但现代引擎远不止「逐行解释」这么简单——它们用
        <strong>JIT（Just-In-Time，即时编译）</strong>技术：在运行时把热点代码动态编译成机器码，
        让 JS 的执行速度大幅提升。所以严格说，今天的 JS 是「解释与即时编译混合」的执行模型。
      </p>

      <h3>3. 单线程 + 事件循环</h3>
      <p>
        JS 的执行是<strong>单线程</strong>的：同一时刻只做一件事，没有多线程并发去抢同一份数据的烦恼。
        那它怎么处理「等待网络请求」「定时器」这类耗时操作而不卡住？答案是
        <strong>事件循环（event loop）</strong>：耗时操作交给运行时在后台处理，完成后把回调放进队列，
        主线程空闲时再依次取出执行。这就是 JS 异步编程的底层机制。
      </p>
      <CodeBlock lang="js" title="单线程异步：同步先跑，回调后跑" code={eventLoopSnippet} />
      <Callout variant="note" title="同步与异步的执行顺序">
        上面例子里，<code>setTimeout</code> 即使设成 0 毫秒，它的回调也要等所有同步代码跑完、
        且微任务（如 Promise 的 <code>.then</code>）处理完之后才执行。理解这个顺序是掌握 JS 异步的关键，
        我们会在后续章节专门拆解事件循环、宏任务与微任务。
      </Callout>

      <h3>4. 函数是一等公民</h3>
      <p>
        在 JS 里，<strong>函数和普通的值（数字、字符串）地位完全平等</strong>：
        可以把函数赋给变量、当参数传给另一个函数、也可以作为返回值返回。
        这种「一等公民」的特性，是 JS 支持函数式编程、回调、高阶函数的基础。
        像数组的 <code>map</code>、<code>filter</code> 都依赖这一点。
      </p>
      <CodeBlock lang="js" title="函数能被传来传去" code={firstClassFnSnippet} />

      <h3>5. 基于原型的面向对象</h3>
      <p>
        大多数语言（Java、C++）用「类」来组织对象，而 JS 用的是
        <strong>原型（prototype）</strong>机制：每个对象都有一个「原型对象」，访问属性时如果自己没有，
        就去原型上找，原型还没有就去原型的原型上找，形成一条<strong>原型链</strong>。
        ES6 引入的 <code>class</code> 关键字看起来和别的语言一样，但它本质上只是原型机制之上的
        <strong>语法糖</strong>，底层依旧是原型。
      </p>
      <CodeBlock lang="js" title="原型继承与 class 语法糖" code={prototypeSnippet} />

      <h3>6. 自动垃圾回收</h3>
      <p>
        和 C 语言要手动 <code>malloc</code>/<code>free</code> 不同，JS 内置
        <strong>自动垃圾回收（GC）</strong>：当一个对象不再被任何变量引用、无法再被访问到时，
        引擎会自动回收它占用的内存。你基本不用操心内存释放，但仍要警惕「意外保留引用」
        导致对象无法回收的<strong>内存泄漏</strong>问题。
      </p>

      <h2>三、JS 在哪里运行：引擎与运行时</h2>
      <p>
        JS 本身只是一套语言规范，它需要一个<strong>引擎</strong>来真正执行。引擎负责解析、编译、运行
        JS 代码。主流引擎有：Google 的 <strong>V8</strong>（用在 Chrome 和 Node.js 里）、
        Mozilla 的 <strong>SpiderMonkey</strong>（用在 Firefox 里）、Apple 的 JavaScriptCore（用在 Safari 里）。
      </p>
      <h3>引擎 ≠ 运行时</h3>
      <p>
        这是初学者最容易混淆的一点。<strong>引擎</strong>只懂「纯粹的语言本身」——变量、函数、对象、循环这些。
        但光有引擎，你没法读文件、发网络请求、操作网页元素，因为这些能力<strong>不属于语言规范</strong>。
        提供这些额外能力的，是<strong>运行时（runtime）</strong>：它把引擎包起来，再附上一套 API。
      </p>
      <ul>
        <li>
          <strong>浏览器</strong>是一种运行时：它内置 JS 引擎，并提供操作网页的
          <code>document</code>、发请求的 <code>fetch</code>、定时器 <code>setTimeout</code> 等
          Web API。这些 API 是浏览器给的，不是语言自带的。
        </li>
        <li>
          <strong>Node.js</strong>是另一种运行时：它把 V8 引擎搬到浏览器之外，
          再补上读写文件、访问网络、操作系统接口等能力。正是 Node.js，让 JS
          <strong>从「只能在网页里跑」走向了服务端、命令行和构建工具</strong>，
          成为真正的全栈语言。
        </li>
      </ul>
      <Example title="同一段语言，不同的运行时能力">
        <p>
          <code>let n = 1 + 1</code> 这种纯计算，在浏览器和 Node 里行为完全一样——这是<strong>引擎</strong>的活。
        </p>
        <p>
          但 <code>document.querySelector("h1")</code> 只能在浏览器里跑（Node 里没有 <code>document</code>）；
          反过来，<code>require("fs").readFileSync(...)</code> 只能在 Node 里跑（浏览器里没有文件系统）。
          这些差异来自<strong>运行时</strong>，而非语言本身。
        </p>
      </Example>
      <table>
        <thead>
          <tr><th>对比项</th><th>引擎（Engine）</th><th>运行时（Runtime）</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>职责</td>
            <td>执行语言本身：变量、函数、对象</td>
            <td>在引擎之上补充 API：IO、网络、DOM</td>
          </tr>
          <tr>
            <td>例子</td>
            <td>V8、SpiderMonkey、JavaScriptCore</td>
            <td>浏览器、Node.js、Deno、Bun</td>
          </tr>
          <tr>
            <td>提供 <code>fetch</code> / <code>fs</code> 吗</td>
            <td>不提供（不属于语言规范）</td>
            <td>提供（由运行时附加）</td>
          </tr>
        </tbody>
      </table>

      <h2>四、JS 的「奇怪」之处一瞥</h2>
      <p>
        JS 仓促的出身，留下了一些反直觉的行为。这里只是「打个预防针」，让你知道它们存在、
        将来遇到不慌——具体规则会在后面的专门章节逐一拆透。
      </p>
      <CodeBlock lang="js" title="几个经典的「JS 怪现象」" code={weirdSnippet} />
      <ul>
        <li>
          <strong>隐式类型转换</strong>：<code>{'1 + "2"'}</code> 得到 <code>{'"12"'}</code>，
          而 <code>{'"5" - 1'}</code> 得到 <code>4</code>。加号遇到字符串会拼接，减号则强制转数字。
        </li>
        <li>
          <strong>宽松相等 == 与严格相等 ===</strong>：<code>==</code> 会先做类型转换再比较，
          常导致意外（如 <code>{'0 == ""'}</code> 为真）；<code>===</code> 不转换，类型不同直接判不等。
          实践中<strong>优先用 <code>===</code></strong>。
        </li>
        <li>
          <strong>this 的指向</strong>：<code>this</code> 指向谁，取决于函数<strong>怎么被调用</strong>，
          而不是它在哪里定义。这是 JS 里最绕的概念之一。
        </li>
      </ul>
      <Callout variant="tip" title="别被「怪」吓到">
        这些行为虽然反直觉，但都有明确规则可循。理解它们背后的逻辑，你不仅能避坑，
        还能更深刻地理解这门语言。本课后面会用专门章节带你逐一攻克。
      </Callout>

      <h2>五、小结与下一步</h2>
      <p>
        这一章我们没有写复杂程序，而是建立了对 JavaScript 的整体认知：它的出身、标准化历程、
        核心性格，以及它赖以运行的引擎与运行时。带着这张「地图」，
        下一章我们会拉远视角，看看现代 JS/TS 工程是由哪些工具拼起来的，
        再正式进入语言细节的学习。
      </p>

      <Summary
        points={[
          'JavaScript 由 Brendan Eich 在 1995 年大约 10 天内造出，名字蹭了 Java 的热度，但与 Java 没有亲缘关系。',
          'ECMAScript 是语言规范（由 TC39 维护），JavaScript 是它的实现与通称；ES6/ES2015 是现代 JS 的起点，此后每年发布一版。',
          'JS 的六个核心性格：动态弱类型、解释执行（JIT 加速）、单线程加事件循环、函数一等公民、基于原型的面向对象、自动垃圾回收。',
          '引擎（V8、SpiderMonkey）只执行语言本身；运行时（浏览器、Node.js）在其上补充 DOM、fetch、文件系统等 API——Node.js 让 JS 走向服务端。',
          'JS 有隐式转换、== 与 ===、this 指向等反直觉之处，它们都有规则可循，后续章节会逐一拆解。',
        ]}
      />
    </article>
  )
}
