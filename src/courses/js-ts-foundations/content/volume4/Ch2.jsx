import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const callbackHell = `// 回调地狱：每一步都要嵌进上一步的回调里，向右缩进越陷越深
getUser(userId, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetail(orders[0].id, (detail) => {
      getShipping(detail.shipId, (shipping) => {
        console.log(shipping)        // 业务逻辑被埋在第 4 层缩进里
        // 而且错误处理要在每一层各写一份，非常容易漏
      })
    })
  })
})`

const promiseStates = `// Promise 是一个「异步结果的状态机」
// 三种状态：pending（进行中）→ fulfilled（成功）或 rejected（失败）
// 一旦从 pending 变为 fulfilled / rejected，状态就永久固定，不可逆、不可再变

const p = new Promise((resolve, reject) => {
  // executor 立即同步执行；在未来某刻调用 resolve / reject 来敲定状态
  setTimeout(() => {
    const ok = Math.random() > 0.5
    if (ok) resolve('成功的值')      // pending → fulfilled
    else reject(new Error('失败原因')) // pending → rejected
  }, 100)
})`

const chainDemo = `// then 返回新的 Promise，可链式调用；return 的值会传给下一个 then
fetch('/api/user')
  .then((res) => res.json())          // 返回值传给下一个 then
  .then((user) => user.name)          // 又把 name 传下去
  .then((name) => console.log(name))
  .catch((err) => {                   // 链条中任意一环出错，都会跳到这里
    console.error('出错了：', err)
  })
  .finally(() => {                    // 无论成功失败都会执行（如收尾、关 loading）
    console.log('请求结束')
  })`

const errorBubble = `// 错误冒泡：抛出的错误会跳过后续的 then，直奔最近的 catch
Promise.resolve()
  .then(() => {
    throw new Error('第 1 个 then 里出错')
  })
  .then(() => {
    console.log('这一句被跳过，不会执行')
  })
  .catch((err) => {
    console.log('catch 捕获到：', err.message)
  })
  .then(() => {
    console.log('catch 之后链条恢复正常，这句会执行')
  })`

const staticMethods = `const p1 = Promise.resolve(1)
const p2 = Promise.reject(new Error('boom'))
const p3 = Promise.resolve(3)

// all：全部成功才成功，返回结果数组；任一失败立即整体失败
Promise.all([p1, p3]).then((vals) => console.log(vals))      // [1, 3]

// allSettled：等全部结束，永不 reject，返回每项的 {status, value/reason}
Promise.allSettled([p1, p2]).then((rs) => console.log(rs))
// [{status:'fulfilled',value:1}, {status:'rejected',reason:Error}]

// race：第一个「敲定」（成功或失败）的结果就是结果
Promise.race([p1, p2]).then((v) => console.log(v))           // 1（若 p1 先）

// any：第一个「成功」的结果就是结果；全失败才 reject（AggregateError）
Promise.any([p2, p3]).then((v) => console.log(v))            // 3`

const asyncSugar = `// async 函数总是返回一个 Promise
async function getName() {
  return 'Tom'              // 等价于 return Promise.resolve('Tom')
}
getName().then((name) => console.log(name))   // Tom

// await 暂停 async 函数的执行，等右侧 Promise 敲定，再拿到结果值
async function load() {
  const res = await fetch('/api/user')   // 等请求完成
  const user = await res.json()          // 等解析完成
  return user.name                       // 这个返回值是 load() 这个 Promise 的结果
}`

const tryCatchDemo = `// 用 try/catch 捕获 await 抛出的错误（rejected 会被 await 转成 throw）
async function load() {
  try {
    const res = await fetch('/api/user')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const user = await res.json()
    return user
  } catch (err) {
    console.error('加载失败：', err.message)
    return null              // 兜底返回，避免把错误继续往外抛
  } finally {
    console.log('无论成败都执行')
  }
}`

const serialVsParallel = `// 串行（慢）：第二个请求要等第一个完全结束才开始，耗时 = a + b
async function serial() {
  const a = await fetchA()   // 等 A 完成……
  const b = await fetchB()   // ……才开始 B
  return [a, b]
}

// 并发（快）：两个请求同时发出，一起等，耗时 = max(a, b)
async function parallel() {
  const [a, b] = await Promise.all([fetchA(), fetchB()])
  return [a, b]
}`

const loopAwaitTrap = `// 坑：for 循环里 await，会一个接一个串行，慢得离谱
async function bad(ids) {
  const users = []
  for (const id of ids) {
    users.push(await getUser(id))   // 每次都干等上一个，N 个请求串成一条
  }
  return users
}

// 正解：先全部发出，再用 Promise.all 一起等
async function good(ids) {
  return Promise.all(ids.map((id) => getUser(id)))
}`

const threeStyles = `// 同一个逻辑：取用户 → 取订单 → 打印，三种写法对照

// 写法一：回调（嵌套、错误处理分散）
function withCallback(userId, cb) {
  getUser(userId, (err, user) => {
    if (err) return cb(err)
    getOrders(user.id, (err, orders) => {
      if (err) return cb(err)
      cb(null, orders)
    })
  })
}

// 写法二：Promise 链（扁平、错误集中到 catch）
function withPromise(userId) {
  return getUser(userId)
    .then((user) => getOrders(user.id))
    .then((orders) => { console.log(orders); return orders })
    .catch((err) => console.error(err))
}

// 写法三：async/await（最接近同步代码的可读性）
async function withAsync(userId) {
  try {
    const user = await getUser(userId)
    const orders = await getOrders(user.id)
    console.log(orders)
    return orders
  } catch (err) {
    console.error(err)
  }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们搞懂了事件循环——异步回调何时被执行。但「怎么把异步代码<strong>写得好读</strong>」是另一个问题。
        早期 JS 用回调函数处理异步，多步串联时会陷入著名的「回调地狱」。<strong>Promise</strong> 把异步结果
        抽象成一个可以链式衔接、统一处理错误的对象；<strong>async/await</strong> 则是建立在 Promise 之上的语法糖，
        让异步代码读起来几乎和同步一样顺。这一章我们把这两者讲透，并给出同一逻辑的三种写法对照。
      </Lead>

      <h2>一、回调地狱：异步串联的噩梦</h2>
      <p>
        最原始的异步写法是<strong>回调函数</strong>：把「事情做完后要干嘛」当作参数传进去。
        单步还好，可一旦需要「第一步的结果喂给第二步、第二步喂给第三步」这样串联，
        代码就会一层层向右缩进，越陷越深，人称<strong>回调地狱（callback hell）</strong>。
      </p>
      <CodeBlock lang="js" title="回调地狱：层层嵌套" code={callbackHell} />
      <p>
        它的问题不只是难看：① <strong>错误处理分散</strong>——每一层回调都得各写一份判错逻辑，极易遗漏；
        ② <strong>执行顺序与书写顺序脱节</strong>——业务主干被埋在深层缩进里；
        ③ <strong>无法方便地组合</strong>——想让几件事并行、或加超时控制都很别扭。Promise 就是为解决这些而生。
      </p>

      <h2>二、Promise：异步结果的状态机</h2>
      <KeyIdea>
        Promise 是一个代表「<strong>未来某个值</strong>」的对象，本质是一个状态机：
        从 <code>pending</code>（进行中）出发，最终走向 <code>fulfilled</code>（成功）或
        <code>rejected</code>（失败）。<strong>状态一旦敲定就永久固定、不可逆</strong>，
        且只会敲定一次。这个「确定且唯一」的特性，是它能可靠链式衔接的基础。
      </p>
      <CodeBlock lang="js" title="Promise 的三种状态与状态机" code={promiseStates} />
      <p>
        构造 Promise 时传入的函数叫 <strong>executor</strong>，它会<strong>立即同步执行</strong>，
        并拿到两个参数 <code>resolve</code> 与 <code>reject</code>。你在未来某个异步时刻调用其中之一，
        来把状态从 <code>pending</code> 敲定为成功（携带一个值）或失败（携带一个原因）。
        调用之后再调用任何一个都<strong>无效</strong>——状态不可逆。
      </p>
      <table>
        <thead>
          <tr><th>状态</th><th>含义</th><th>由谁触发</th><th>能否再变</th></tr>
        </thead>
        <tbody>
          <tr><td><code>pending</code></td><td>进行中，结果未定</td><td>初始状态</td><td>可变为下面两者之一</td></tr>
          <tr><td><code>fulfilled</code></td><td>成功，携带一个值</td><td>调用 <code>resolve(value)</code></td><td>不可逆，永久固定</td></tr>
          <tr><td><code>rejected</code></td><td>失败，携带一个原因</td><td>调用 <code>reject(reason)</code> 或抛错</td><td>不可逆，永久固定</td></tr>
        </tbody>
      </table>

      <h2>三、then / catch / finally：链式与错误冒泡</h2>
      <p>
        Promise 用三个方法消费结果：<code>then</code> 处理成功值，<code>catch</code> 处理失败原因，
        <code>finally</code> 无论成败都执行（常用于收尾，如关闭 loading）。关键在于：
        <strong><code>then</code> / <code>catch</code> 都返回一个新的 Promise</strong>，所以可以一直链下去；
        而 <code>then</code> 回调里 <code>return</code> 的值，会成为<strong>下一个 <code>then</code> 的输入</strong>。
      </p>
      <CodeBlock lang="js" title="链式调用与值传递" code={chainDemo} />
      <p>
        如果 <code>then</code> 回调里 <code>return</code> 的是另一个 Promise，链条会<strong>等它敲定</strong>，
        再把它的结果传下去——这正是把多个异步步骤「拍扁成一条链」的魔法，回调地狱的层层缩进就此消失。
      </p>
      <h3>错误冒泡</h3>
      <p>
        链条里任意一环抛错或返回 rejected 的 Promise，错误都会<strong>跳过后续的 <code>then</code></strong>，
        一路冒泡到最近的 <code>catch</code>。这意味着你只需在链尾写<strong>一个</strong> <code>catch</code>，
        就能统一兜住整条链的错误——回调地狱里那种「每层各写一份判错」彻底没了。
      </p>
      <CodeBlock lang="js" title="错误冒泡到最近的 catch" code={errorBubble} />
      <Callout variant="warn" title="别忘了 catch">
        没有 <code>catch</code> 的 Promise 一旦 reject，会产生「未处理的拒绝（unhandled rejection）」警告，
        在 Node 里甚至可能让进程退出。每条 Promise 链都应该有错误处理的出口。
      </Callout>

      <h2>四、静态方法：组合多个 Promise</h2>
      <p>
        Promise 提供了几个静态方法，用来<strong>同时处理一组</strong> Promise。它们的区别集中在
        「等几个、要不要全成功、谁的结果算数」上，是面试与实战的高频点。
      </p>
      <CodeBlock lang="js" title="all / allSettled / race / any" code={staticMethods} />
      <table>
        <thead>
          <tr><th>方法</th><th>何时敲定</th><th>成功结果</th><th>失败条件</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Promise.all</code></td>
            <td>全部成功，或<strong>任一失败</strong>立即结束</td>
            <td>按顺序的结果数组</td>
            <td>任一 reject 就整体 reject</td>
            <td>多个请求都必须成功（如同时拉用户+配置）</td>
          </tr>
          <tr>
            <td><code>Promise.allSettled</code></td>
            <td>等<strong>全部</strong>结束（不论成败）</td>
            <td>每项 <code>{'{status, value/reason}'}</code> 的数组</td>
            <td><strong>永不 reject</strong></td>
            <td>批量操作，想知道每个各自的成败</td>
          </tr>
          <tr>
            <td><code>Promise.race</code></td>
            <td>第一个<strong>敲定</strong>（成功或失败）</td>
            <td>最先敲定者的值</td>
            <td>若最先敲定的是 reject 则失败</td>
            <td>给请求加超时（和一个定时器赛跑）</td>
          </tr>
          <tr>
            <td><code>Promise.any</code></td>
            <td>第一个<strong>成功</strong></td>
            <td>最先成功者的值</td>
            <td>全部失败才 reject（<code>AggregateError</code>）</td>
            <td>多个镜像源，谁先成功用谁</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="note" title="race 与 any 的区别">
        <code>race</code> 看的是「谁先<strong>敲定</strong>」——最先那个不管成功失败都算数；
        <code>any</code> 看的是「谁先<strong>成功</strong>」——会忽略失败的，只等第一个成功的。一字之差，行为迥异。
      </Callout>

      <h3>手写极简 Promise 的思路</h3>
      <p>
        理解原理可以想象自己实现一个：内部维护 <code>state</code> 和 <code>value</code> 两个字段，
        外加成功/失败回调的数组；<code>resolve</code> / <code>reject</code> 负责把状态从 pending 改成终态、
        存好值、并把已登记的回调放进微任务队列异步触发；<code>then</code> 则登记回调并返回一个新 Promise
        以支持链式——核心就是「状态机 + 回调队列 + 异步触发」。

      </p>

      <h2>五、async/await：Promise 的语法糖</h2>
      <KeyIdea>
        <code>async</code> / <code>await</code> 不是新机制，而是 Promise 的<strong>语法糖</strong>：
        <code>async</code> 函数<strong>总是返回一个 Promise</strong>；<code>await</code> 会<strong>暂停</strong>
        async 函数的执行，等右侧 Promise 敲定，再把成功值「解包」出来——让异步代码读起来像同步。
      </KeyIdea>
      <CodeBlock lang="js" title="async 返回 Promise，await 等待并解包" code={asyncSugar} />
      <p>
        <code>await</code> 后面跟一个 Promise（跟普通值也行，会被自动包成已成功的 Promise）。
        它暂停的只是<strong>当前这个 async 函数</strong>，并<strong>不会阻塞主线程</strong>——
        本质上是把函数剩余部分登记成了一个微任务，等结果就绪再继续。这就是上一章事件循环知识的直接应用。
      </p>

      <h3>用 try/catch 捕获错误</h3>
      <p>
        当 <code>await</code> 的 Promise 变成 rejected，<code>await</code> 会把它<strong>转成一个抛出的异常</strong>。
        于是你可以用最熟悉的 <code>try/catch/finally</code> 来处理异步错误，写法和同步代码完全一致。
      </p>
      <CodeBlock lang="js" title="try/catch 捕获 await 错误" code={tryCatchDemo} />

      <h2>六、并发 vs 串行：别把能并行的写成串行</h2>
      <p>
        <code>await</code> 用顺手了，容易踩一个性能坑：把<strong>本可并行</strong>的请求写成了一个等一个的串行。
        如果两个请求<strong>互不依赖</strong>，就该让它们同时发出，用 <code>Promise.all</code> 一起等。
      </p>
      <CodeBlock lang="js" title="串行（慢）vs 并发（快）" code={serialVsParallel} />
      <Callout variant="warn" title="循环里的 await 是隐形性能杀手">
        在 <code>for</code> 循环里直接 <code>await</code>，会让每次迭代都干等上一次结束，N 个请求串成一条长链。
        正确做法：先用 <code>map</code> 把请求全部发出，再交给 <code>Promise.all</code> 统一等待。
      </Callout>
      <CodeBlock lang="js" title="循环 await 的坑与正解" code={loopAwaitTrap} />

      <h2>七、常见坑速查</h2>
      <ul>
        <li><strong>忘记 await</strong>：直接用了 async 函数的返回值，结果拿到的是一个 Promise 对象而非真正的值。</li>
        <li><strong>循环里串行 await</strong>：互不依赖的请求被写成一个等一个，应改用 <code>Promise.all</code>。</li>
        <li><strong>漏掉错误处理</strong>：async 函数里没 <code>try/catch</code>，或 Promise 链没 <code>catch</code>，导致未处理拒绝。</li>
        <li><strong>在 <code>forEach</code> 里用 async</strong>：<code>forEach</code> 不会等待回调里的 await，得不到预期的「等全部完成」效果，应改用 <code>for...of</code> 或 <code>map + Promise.all</code>。</li>
        <li><strong>误以为 await 会阻塞别人</strong>：它只暂停当前 async 函数，主线程仍在继续跑别的事。</li>
      </ul>

      <h2>八、三种写法对照：回调 → Promise → async/await</h2>
      <p>
        最后用同一个逻辑（取用户 → 取该用户的订单 → 打印），把演进的三个阶段并排放一起感受差异。
      </p>
      <CodeBlock lang="js" title="同一逻辑的三种写法" code={threeStyles} />
      <Example title="三种写法怎么选">
        <p>
          新项目几乎都首选 <strong>async/await</strong>，可读性最好、错误处理最自然。
          需要把<strong>一组</strong>异步操作组合（并发、竞速）时，仍要借助 <code>Promise.all</code> / <code>race</code> 等静态方法。
          纯回调写法如今主要出现在老代码或某些底层 API 中，遇到时可以用 <code>new Promise</code> 把它「包成」 Promise，再接进现代写法。
        </p>
      </Example>

      <Callout variant="tip">
        记住一条主线：<strong>async/await 底层就是 Promise，Promise 的回调底层就是微任务</strong>。
        三章连起来——事件循环、Promise、async/await——你就拥有了完整的 JS 异步心智模型。
      </Callout>

      <Summary
        points={[
          '回调地狱：多步异步串联时回调层层嵌套，错误处理分散、可读性差；Promise 与 async/await 就是为解决它而生。',
          'Promise 是异步结果的状态机：pending → fulfilled / rejected，状态一旦敲定永久不可逆且只敲定一次。',
          'then/catch/finally 链式衔接：then 返回新 Promise、return 的值传给下一环；错误会冒泡到最近的 catch，一个 catch 即可兜住整条链。',
          '静态方法：all（全成功否则整体失败）、allSettled（等全部结束、永不 reject）、race（第一个敲定者）、any（第一个成功者，全败才 reject）。',
          'async/await 是 Promise 的语法糖：async 函数总返回 Promise，await 暂停并解包结果（不阻塞主线程），用 try/catch 捕获错误。',
          '常见坑：忘记 await、循环里串行 await（应改 Promise.all）、漏掉错误处理、在 forEach 里用 async；互不依赖的请求要并发而非串行。',
        ]}
      />
    </article>
  )
}
