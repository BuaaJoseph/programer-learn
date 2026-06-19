import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import EventLoop from '@/courses/js-ts-foundations/illustrations/EventLoop.jsx'

const stackDemo = `// 调用栈：函数调用一层层压栈，返回时一层层弹栈
function third() {
  console.log('进入 third')
}
function second() {
  third()              // 把 third 压栈
}
function first() {
  second()             // 把 second 压栈
}
first()                // 把 first 压栈

// 入栈顺序：first → second → third
// 出栈顺序：third → second → first
// 任一时刻，栈里这一摞就是「现在正在做的事」`

const stackOverflow = `// 没有终止条件的递归 → 栈帧无限增长 → 栈溢出
function boom(n) {
  return boom(n + 1)   // 永远不返回，栈帧永远不弹出
}
boom(1)
// RangeError: Maximum call stack size exceeded`

const blockingDemo = `// 同步阻塞：这个循环要跑很久，期间整个页面卡死
function blockFor(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // 空转，霸占调用栈
  }
}

console.log('开始')
blockFor(3000)          // 这 3 秒里：点击无响应、动画卡住、输入框打不出字
console.log('结束')      // 单线程被占满，浏览器无法做任何别的事`

const orderDemo = `console.log('1 同步')

setTimeout(() => {
  console.log('2 setTimeout(宏任务)')
}, 0)

Promise.resolve().then(() => {
  console.log('3 Promise.then(微任务)')
})

console.log('4 同步')

// 实际输出顺序：
// 1 同步
// 4 同步
// 3 Promise.then(微任务)
// 2 setTimeout(宏任务)`

const nestedDemo = `console.log('A')

setTimeout(() => {
  console.log('B (宏任务1)')
  Promise.resolve().then(() => console.log('C (宏任务1里产生的微任务)'))
}, 0)

Promise.resolve().then(() => {
  console.log('D (微任务1)')
  Promise.resolve().then(() => console.log('E (微任务1里产生的微任务)'))
})

setTimeout(() => console.log('F (宏任务2)'), 0)

console.log('G')

// 输出顺序：A → G → D → E → B → C → F`

const timerNotZero = `// setTimeout(fn, 0) 不是「立即执行」，而是「尽快排进宏任务队列」
console.log('first')
setTimeout(() => console.log('timer'), 0)
Promise.resolve().then(() => console.log('promise'))
// 同步的 first 先跑；栈空后清空所有微任务（promise）；
// 再取一个宏任务（timer）。所以 timer 永远排在 promise 后面。
// 输出：first → promise → timer`

export default function Ch1() {
  return (
    <article>
      <Lead>
        JavaScript 是<strong>单线程</strong>语言——同一时刻只能执行一件事。可它却能一边响应你的点击、
        一边发网络请求、一边跑定时器，看起来「同时」在做很多事。这背后的总指挥就是
        <strong>事件循环（Event Loop）</strong>。这一章我们从单线程的含义讲起，逐步拆开调用栈、
        Web API、任务队列、宏任务与微任务，最后讲透事件循环的运转规则，让你能<strong>预测</strong>
        任意一段混合代码的执行顺序——这是理解 Promise、async/await 乃至整个异步世界的地基。
      </Lead>

      <h2>一、单线程：JS 只有一条执行流</h2>
      <p>
        所谓「单线程」，是指 JS 引擎只有<strong>一条主执行线</strong>，同一时刻只能跑一段代码。
        没有两个函数能真正并行运行。这听起来像个限制，但它带来一个巨大的好处：
        <strong>不用操心多线程的数据竞争与锁</strong>。在多线程语言里，两个线程同时改一个变量
        会带来难以复现的诡异 bug；而在 JS 里，因为任意时刻只有一段代码在跑，你写
        <code>count = count + 1</code> 时根本不用担心别人插进来改了 <code>count</code>。
      </p>
      <p>
        限制也很明显：如果某段代码跑得很久，整条执行线就被它占满，其他什么都干不了——
        界面会卡死。所以 JS 的并发不是靠「开更多线程」，而是靠一套巧妙的调度机制，
        让耗时的事情「交给别人去等」，等好了再排队回来执行。这套机制的核心组件，
        我们一个一个来看。
      </p>
      <KeyIdea>
        单线程意味着<strong>同一时刻只跑一件事</strong>。JS 的并发不是「同时做多件事」，
        而是「快速地在多件事之间切换」——把耗时的等待交给宿主环境，自己只在结果就绪时
        排队回来处理。理解这一点，就理解了事件循环存在的理由。
      </KeyIdea>

      <h2>二、调用栈：同步代码在哪里执行</h2>
      <p>
        <strong>调用栈（Call Stack）</strong>是 JS 引擎跟踪「现在执行到哪了」的数据结构。
        每调用一个函数，就把一个<strong>栈帧</strong>压入栈顶（记录这个函数的参数、局部变量、
        执行位置）；函数返回时，把这个栈帧弹出。栈是<strong>后进先出（LIFO）</strong>的：
        最后压进去的，最先弹出来。
      </p>
      <CodeBlock lang="js" title="调用栈的压栈与弹栈" code={stackDemo} />
      <p>
        同步代码就是在调用栈上一帧一帧跑完的。只要栈上还有东西，引擎就一直忙着；
        只有当栈<strong>空了</strong>，事件循环才有机会去任务队列里取下一件事来做。
        记住这句话，后面讲执行顺序时全靠它。
      </p>
      <h3>栈溢出：栈也是有上限的</h3>
      <p>
        调用栈的容量有限。如果递归没有终止条件，栈帧会无限叠高，撞到上限就抛出
        <code>RangeError: Maximum call stack size exceeded</code>，也就是俗称的「栈溢出」。
      </p>
      <CodeBlock lang="js" title="无限递归导致栈溢出" code={stackOverflow} />

      <h2>三、同步阻塞：为什么不能在主线程干重活</h2>
      <p>
        既然只有一条执行线，那么任何<strong>长时间占据调用栈</strong>的同步代码，都会让其余一切停摆——
        点击没反应、动画卡顿、输入框打不出字。这就是「主线程被阻塞」。
      </p>
      <CodeBlock lang="js" title="同步阻塞会冻结整个页面" code={blockingDemo} />
      <Callout variant="warn" title="不要在主线程做长时间同步计算">
        像大数组排序、复杂加密、解析超大 JSON 这类重活，如果同步跑会卡死界面。
        解决办法是把它们<strong>异步化</strong>（切片分批、放进微任务/宏任务里），
        或者交给 <code>Web Worker</code> 这样的真正独立线程去算。主线程要尽量「轻」。
      </Callout>

      <h2>四、Web API：耗时的事交给宿主在栈外做</h2>
      <p>
        既然主线程不能干等，那 <code>setTimeout</code> 的计时、<code>fetch</code> 的网络请求、
        等待用户点击这些「需要时间」的事，到底是谁在做？答案是：<strong>宿主环境</strong>。
        浏览器（或 Node）在 JS 引擎之外提供了一批能力，统称 <strong>Web API</strong>（在 Node 里是 C++ 实现的对应能力）。
      </p>
      <p>
        当你调用 <code>setTimeout(fn, 1000)</code>，JS 只是把「请在 1 秒后通知我」这个委托交给宿主，
        然后<strong>立刻返回</strong>，继续往下执行——计时这件事由宿主在栈外独立进行。等时间到了，
        宿主<strong>不会</strong>直接把 <code>fn</code> 塞回调用栈（那会打断正在跑的代码），
        而是把 <code>fn</code> 投递到一个<strong>任务队列</strong>里排队，等主线程空了再来取。
      </p>
      <Example title="setTimeout 到底做了什么">
        <p>
          调用 <code>{'setTimeout(() => {}, 1000)'}</code> 时：① JS 把回调和延时交给宿主计时器；
          ② JS 立即返回，主线程继续跑后面的同步代码；③ 宿主在栈外计时；
          ④ 1 秒后，宿主把回调放进<strong>宏任务队列</strong>；
          ⑤ 等调用栈空、微任务清完，事件循环才取这个回调来执行。
        </p>
      </Example>

      <h2>五、任务队列：宏任务与微任务</h2>
      <p>
        宿主投递回来的回调，不是只进一个队列。事件循环维护着两类队列，优先级完全不同：
        <strong>宏任务队列（macrotask / task）</strong>和<strong>微任务队列（microtask）</strong>。
        分清这两者，是预测执行顺序的关键。
      </p>
      <h3>宏任务（macrotask）</h3>
      <p>
        来自「较大粒度」的异步事件，包括 <code>setTimeout</code> / <code>setInterval</code> 的回调、
        I/O 完成、UI 事件（如 <code>click</code>）、以及整体脚本的执行本身。
        事件循环<strong>每一轮只取一个</strong>宏任务来执行。
      </p>
      <h3>微任务（microtask）</h3>
      <p>
        来自「需要尽快处理」的场景，主要是 <code>Promise.then</code> / <code>catch</code> / <code>finally</code> 的回调、
        <code>queueMicrotask</code> 注册的函数、以及 <code>MutationObserver</code> 的回调。
        微任务的特权是：<strong>在每个宏任务执行完之后，会被一次性清空</strong>——
        而且如果清空过程中又产生了新的微任务，也会在本轮一并执行完，才轮到下一个宏任务。
      </p>
      <table>
        <thead>
          <tr><th>对比维度</th><th>宏任务 macrotask</th><th>微任务 microtask</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>典型来源</td>
            <td><code>setTimeout</code>、<code>setInterval</code>、I/O、UI 事件、整体脚本</td>
            <td><code>Promise.then/catch/finally</code>、<code>queueMicrotask</code>、<code>MutationObserver</code></td>
          </tr>
          <tr>
            <td>每轮执行数量</td>
            <td>只取<strong>一个</strong></td>
            <td><strong>全部清空</strong>（含执行中新产生的）</td>
          </tr>
          <tr>
            <td>执行时机</td>
            <td>调用栈空、微任务清完、（必要时渲染后）才取一个</td>
            <td>当前宏任务结束、下一个宏任务之前立即清空</td>
          </tr>
          <tr>
            <td>优先级</td>
            <td>低</td>
            <td>高（同一轮里总先于宏任务）</td>
          </tr>
          <tr>
            <td>常见用途</td>
            <td>定时、轮询、把任务切片让出主线程</td>
            <td>Promise 链衔接、状态更新后立即收尾</td>
          </tr>
        </tbody>
      </table>

      <h2>六、事件循环：把它们串起来的规则</h2>
      <p>
        现在可以给出事件循环的完整运转规则了。它是一个永不停歇的循环，每一轮（tick）做这几件事：
      </p>
      <ul>
        <li><strong>1. 执行同步代码</strong>：把当前调用栈上的同步代码跑完，直到栈空。</li>
        <li><strong>2. 清空微任务</strong>：把微任务队列里的回调<strong>全部</strong>执行完；执行中新产生的微任务也在本轮一并清空。</li>
        <li><strong>3. 渲染（如有必要）</strong>：浏览器可能在此时更新一次界面。</li>
        <li><strong>4. 取一个宏任务</strong>：从宏任务队列取<strong>一个</strong>执行，执行完回到第 2 步。</li>
      </ul>
      <p>
        下面这张交互图把各个部件的角色摆在一起，点一点能更直观地感受它们的关系。
      </p>
      <EventLoop />
      <KeyIdea>
        一句话记住：<strong>栈空 → 清空所有微任务 →（渲染）→ 取一个宏任务 → 再清空所有微任务……</strong>
        「微任务全清、宏任务单取」就是 Promise 回调总先于 setTimeout 的根本原因。
      </KeyIdea>

      <h3>为什么 Promise 回调先于 setTimeout</h3>
      <p>
        因为 <code>Promise.then</code> 进的是<strong>微任务</strong>队列，<code>setTimeout</code> 进的是
        <strong>宏任务</strong>队列。当同步代码跑完、栈空时，事件循环规则要求<strong>先把微任务清空</strong>，
        之后才去取宏任务。所以哪怕 <code>setTimeout</code> 的延时写成 0，它也排在所有微任务之后。
      </p>
      <CodeBlock lang="js" title="同步 → 微任务 → 宏任务" code={orderDemo} />

      <h3>setTimeout(fn, 0) 不是「立即」</h3>
      <p>
        新手常以为 <code>setTimeout(fn, 0)</code> 会立刻执行 <code>fn</code>，其实不会。
        它的含义是「<strong>尽快把 fn 排进宏任务队列</strong>」。它必须等当前同步代码跑完、
        当前所有微任务清空之后，作为一个宏任务才会被取出。而且浏览器对嵌套定时器还有
        <strong>最小延时</strong>（约 4ms）的下限，所以 0 也并不真的是 0。
      </p>
      <CodeBlock lang="js" title="setTimeout 0 仍排在微任务之后" code={timerNotZero} />

      <h2>七、综合演练：逐步分析执行顺序</h2>
      <p>
        把规则用到一段更复杂的代码上。这里有同步、两个 <code>setTimeout</code>、两个 <code>Promise</code>，
        并且回调里还会产生新的微任务/宏任务。我们一步步推。
      </p>
      <CodeBlock lang="js" title="混合任务的执行顺序" code={nestedDemo} />
      <p>逐步分析（关键是反复套用「微任务全清、宏任务单取」）：</p>
      <ul>
        <li><strong>同步阶段</strong>：先打印 <code>A</code>。遇到第一个 <code>setTimeout</code>，其回调交给宿主，到点后进宏任务队列（记为 B）。遇到 <code>Promise.then</code>，回调进微任务队列（记为 D）。遇到第二个 <code>setTimeout</code>，回调进宏任务队列（记为 F）。再打印 <code>G</code>。同步阶段结束，栈空。</li>
        <li><strong>清空微任务</strong>：取出 D，打印 <code>D</code>；D 内部又注册了一个微任务 E，它会在<strong>本轮</strong>继续被清空，打印 <code>E</code>。微任务队列空了。</li>
        <li><strong>取一个宏任务</strong>：取出 B，打印 <code>B</code>；B 内部注册了微任务 C。</li>
        <li><strong>本宏任务后再清空微任务</strong>：取出 C，打印 <code>C</code>。</li>
        <li><strong>取下一个宏任务</strong>：取出 F，打印 <code>F</code>。队列空，结束。</li>
      </ul>
      <p>
        最终顺序：<strong>A → G → D → E → B → C → F</strong>。
        注意 E 紧跟在 D 之后（同一轮微任务清空里产生的微任务也会被清完），
        而 C 是在宏任务 B 跑完后、取 F 之前被清空的。
      </p>

      <h2>八、浏览器与 Node 的差异</h2>
      <p>
        浏览器与 Node 的事件循环大方向一致（都是「微任务优先、宏任务单取」），但 Node 的宏任务被细分成
        多个阶段（timers、poll、check 等），还多了 <code>process.nextTick</code>（优先级甚至高于普通微任务）
        与 <code>setImmediate</code> 这类专属 API——细节不同，但「先清微任务、再取一个宏任务」的核心心智模型通用。
      </p>
      <Callout variant="tip">
        理解了事件循环，你就理解了 Promise 与 async/await 的运行时机：它们的回调本质上都是
        <strong>微任务</strong>。下一章我们正式进入 Promise 与 async/await，把异步代码写得像同步一样顺。
      </Callout>

      <Summary
        points={[
          'JS 是单线程：同一时刻只跑一件事；好处是无需处理多线程锁与数据竞争，代价是长时间同步代码会阻塞（冻结）界面。',
          '调用栈是后进先出的执行轨迹，同步代码在此一帧帧执行；无终止递归会撑爆栈，抛出 Maximum call stack size exceeded。',
          'setTimeout、fetch、DOM 事件等耗时操作由宿主（Web API）在栈外处理，完成后把回调投递到任务队列，而非直接塞回栈。',
          '任务分两类：宏任务（setTimeout/setInterval/IO/UI）每轮只取一个；微任务（Promise.then/queueMicrotask/MutationObserver）每轮全部清空。',
          '事件循环规则：栈空 → 清空所有微任务 →（渲染）→ 取一个宏任务 → 再清空微任务……所以 Promise 回调总先于 setTimeout，且 setTimeout 0 不是立即执行。',
          '混合代码顺序靠反复套用「微任务全清、宏任务单取」推导；Node 与浏览器核心心智一致，但 Node 把宏任务细分阶段并多了 process.nextTick / setImmediate。',
        ]}
      />
    </article>
  )
}
