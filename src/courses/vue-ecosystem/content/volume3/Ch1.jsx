import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ReactivityFlow from '@/courses/vue-ecosystem/illustrations/ReactivityFlow.jsx'

const vue2Snippet = `// Vue 2 的核心：Object.defineProperty 逐个属性劫持
function defineReactive(obj, key, val) {
  const dep = new Dep()            // 每个属性配一个依赖收集器
  Object.defineProperty(obj, key, {
    get() {
      dep.depend()                 // 读：把当前 watcher 收进 dep
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      dep.notify()                 // 写：通知所有 watcher 更新
    },
  })
}

// 初始化时必须递归遍历整个对象，给每个已存在的 key 装上 getter/setter
function observe(obj) {
  Object.keys(obj).forEach((key) => {
    defineReactive(obj, key, obj[key])
    if (typeof obj[key] === 'object') observe(obj[key]) // 立刻深度递归
  })
}`

const vue2LimitSnippet = `const state = observe({ user: { name: 'Tom' }, list: [1, 2, 3] })

state.user.age = 18      // 新增属性：没装过 getter/setter → 不是响应式，视图不更新
delete state.user.name   // 删除属性：defineProperty 拦不到 delete → 不更新
state.list[0] = 99       // 数组下标赋值：Vue 2 侦测不到 → 不更新
state.list.length = 1    // 改 length：同样侦测不到

// Vue 2 只能靠这些「补丁 API」绕开
Vue.set(state.user, 'age', 18)   // this.$set
Vue.delete(state.user, 'name')   // this.$delete
state.list.splice(0, 1, 99)      // 重写过的数组变异方法才被劫持`

const proxySnippet = `// Vue 3 的核心：用一个 Proxy 拦截「整个对象」的所有操作
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key)               // 读：收集依赖
      // 惰性递归：只有真的读到嵌套对象，才在此刻把它也包成 Proxy
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) trigger(target, key) // 写：触发更新
      return result
    },
    deleteProperty(target, key) {
      const had = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (had) trigger(target, key)     // 删除属性也能被拦到
      return result
    },
  })
}`

const miniReactiveSnippet = `// 约 30 行手写最小响应式：reactive + effect + track + trigger
let activeEffect = null

// effect：注册一个「副作用」并立即跑一次（跑的过程中读到的数据会收集它）
function effect(fn) {
  activeEffect = fn
  fn()                 // 首次运行 → 触发依赖里的 get → track 把自己记进去
  activeEffect = null
}

// 依赖仓库：target -> (key -> Set<effect>)
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return            // 没有正在运行的 effect 就不收集
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)                // 把当前 effect 记到这个属性名下
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) dep.forEach((eff) => eff()) // 取出依赖该属性的 effect，逐个重跑
}

function reactive(obj) {
  return new Proxy(obj, {
    get(t, key, recv) { track(t, key); return Reflect.get(t, key, recv) },
    set(t, key, val, recv) {
      const r = Reflect.set(t, key, val, recv)
      trigger(t, key)
      return r
    },
  })
}`

const miniDemoSnippet = `const state = reactive({ count: 0 })

effect(() => {
  // 这个副作用读了 state.count → track 把它登记到 count 名下
  console.log('count 现在是', state.count)
})
// 立即打印：count 现在是 0

state.count++   // set 拦截 → trigger 取出上面那个 effect 重跑
// 自动打印：count 现在是 1

state.count = 5
// 自动打印：count 现在是 5`

const reflectSnippet = `// 为什么 get/set 里用 Reflect 而不是直接 target[key]？
const obj = {
  _name: 'Tom',
  get name() { return this._name }, // 依赖 this 指向
}
const p = new Proxy(obj, {
  get(target, key, receiver) {
    track(target, key)
    // 用 Reflect.get 并传入 receiver，保证 getter 里的 this 指向 Proxy，
    // 这样读 name 时内部读 this._name 也能被 track 收集到。
    return Reflect.get(target, key, receiver)
  },
})`

export default function Ch1() {
  return (
    <article>
      <Lead>
        响应式（reactivity）是 Vue 的灵魂：你只管改数据，视图自己跟上。这背后只要回答两个问题——
        <strong>数据什么时候变了</strong>，以及<strong>变了之后谁该重新运行</strong>。这一章我们从这两个问题出发，
        看清 Vue 2 用 <code>Object.defineProperty</code> 的局限，再讲透 Vue 3 改用
        <code>Proxy</code> 后的依赖收集 <code>track</code> 与触发更新 <code>trigger</code>，
        最后用约 30 行代码手写一个能跑的最小响应式系统，把原理彻底捅穿。
      </Lead>

      <h2>一、响应式到底要解决什么问题</h2>
      <p>
        想象你写了 <code>state.count++</code>，页面上显示计数的那段文字就自己变了。这件「理所当然」的事，
        框架其实要在背后悄悄做两件苦工：
      </p>
      <ul>
        <li><strong>侦测变化</strong>：怎么知道 <code>count</code> 这个属性被写了？普通对象赋值是悄无声息的，没人通知任何人。</li>
        <li><strong>建立映射</strong>：就算知道 <code>count</code> 变了，也得知道「<em>谁</em>用到了 count」——是哪段渲染函数、哪个 computed、哪个侦听器，只有它们才需要重跑。</li>
      </ul>
      <KeyIdea>
        响应式系统的本质，是在「读数据」时悄悄记下<strong>谁在读</strong>（依赖收集），
        在「写数据」时反查出<strong>读过它的人</strong>并通知他们重跑（触发更新）。
        读时收集、写时触发——这一收一触构成的闭环，就是所有响应式框架的共同骨架。
      </KeyIdea>
      <p>
        要拦住「读」和「写」，就必须能劫持对象属性的访问。Vue 2 和 Vue 3 的根本差异，
        正是在<strong>用什么手段劫持</strong>上分道扬镳。
      </p>

      <h2>二、Vue 2 的方案：Object.defineProperty 逐个劫持</h2>
      <p>
        Vue 2 用 <code>Object.defineProperty</code> 给对象的<strong>每一个属性</strong>都改写成带
        <code>getter</code>/<code>setter</code> 的访问器属性。读时在 getter 里收集依赖，写时在 setter 里通知更新。
        思路本身和上面说的闭环完全一致：
      </p>
      <CodeBlock lang="js" title="Vue 2 的 defineReactive（简化）" code={vue2Snippet} />
      <p>
        它能工作，但 <code>Object.defineProperty</code> 有一个先天约束：它只能对
        <strong>「已经存在的、具体的某个 key」</strong>定义拦截。这就埋下了一连串著名的坑。
      </p>

      <h3>局限 1：侦测不到新增 / 删除属性</h3>
      <p>
        初始化时遍历到的 key 才会被装上 getter/setter。之后你再 <code>state.user.age = 18</code> 新增一个属性，
        这个 <code>age</code> 从没被 <code>defineReactive</code> 处理过，自然没有拦截，改了也不会更新视图。
        删除属性同理——<code>delete</code> 操作根本不经过 setter。
      </p>

      <h3>局限 2：数组的下标与 length 拦不住</h3>
      <p>
        对数组用下标赋值 <code>arr[0] = 99</code> 或直接改 <code>arr.length</code>，
        <code>defineProperty</code> 也侦测不到。Vue 2 只能<strong>偷偷重写</strong>
        <code>push</code> / <code>pop</code> / <code>splice</code> 等 7 个变异方法来打补丁，
        绕开下标这条路。
      </p>

      <h3>局限 3：必须初始化时深度递归</h3>
      <p>
        因为要给每个 key 都装拦截，Vue 2 在初始化时就得<strong>一次性递归遍历整棵对象树</strong>，
        对象越大、越深，初始化开销越高——哪怕你之后根本没读到那些深层属性。
      </p>
      <CodeBlock lang="js" title="Vue 2 踩坑现场与补丁 API" code={vue2LimitSnippet} />
      <Callout variant="warn" title="this.$set / this.$delete 的由来">
        Vue 2 里之所以需要 <code>this.$set</code> 和 <code>this.$delete</code>，本质就是为了给
        <code>defineProperty</code> 侦测不到的新增/删除属性「手动补一刀」让它变成响应式。
        这不是设计上的优雅，而是底层机制的无奈兜底。Vue 3 之后这两个 API 不再需要。
      </Callout>

      <h2>三、Vue 3 的方案：用 Proxy 拦截整个对象</h2>
      <p>
        Vue 3 换了把更锋利的刀：ES6 的 <code>Proxy</code>。<code>Proxy</code> 不是针对某个具体 key，
        而是<strong>代理整个对象</strong>——对这个对象的任何读、写、删除、判断「是否存在某 key」等操作，
        都会被对应的拦截器（trap）捕获。
      </p>
      <KeyIdea>
        <code>Object.defineProperty</code> 劫持的是<strong>属性</strong>，所以新增的 key 漏网；
        <code>Proxy</code> 劫持的是<strong>对象本身</strong>，所以无论你之后增删哪个 key、改哪个下标，
        都逃不过它的拦截。这是 Vue 3 重写响应式系统的根本原因。
      </KeyIdea>
      <CodeBlock lang="js" title="Vue 3 的 reactive（简化）" code={proxySnippet} />
      <p>
        对照看几个关键拦截器（trap）：
      </p>
      <ul>
        <li><code>get</code>：读属性时触发，是<strong>依赖收集（track）</strong>的入口。</li>
        <li><code>set</code>：写属性时触发，是<strong>触发更新（trigger）</strong>的入口；新增属性也走 set，所以天然响应式。</li>
        <li><code>deleteProperty</code>：<code>delete obj.key</code> 时触发，删除也能被侦测。</li>
        <li><code>has</code>：<code>key in obj</code> 时触发，连「判断属性是否存在」都能收集依赖。</li>
      </ul>
      <p>
        还有一个常被忽略的优势：<strong>惰性递归</strong>。注意 <code>get</code> 里只有当你<strong>真的读到</strong>
        一个嵌套对象时，才在那一刻把它也包成 <code>Proxy</code>。深层数据不读就不代理，
        初始化不必再像 Vue 2 那样一上来递归整棵树，大对象的开销因此小得多。
      </p>
      <Callout variant="tip" title="为什么要配合 Reflect">
        Vue 3 的拦截器里普遍用 <code>Reflect.get(target, key, receiver)</code> 而不是直接
        <code>target[key]</code>。关键在 <code>receiver</code>：当对象里有依赖 <code>this</code> 的
        getter 时，传入 receiver 能保证 getter 内部的 <code>this</code> 指向 Proxy 本身，
        这样它内部再读别的属性也能被正确 track 到。
      </Callout>
      <CodeBlock lang="js" title="Reflect 与 receiver 的作用" code={reflectSnippet} />

      <h2>四、依赖收集 track 与触发更新 trigger</h2>
      <p>
        拦截只是「能听到读写」，真正的智能在于<strong>读时记谁、写时找谁</strong>。这就是 track 与 trigger。
      </p>
      <h3>track：在 get 里收集依赖</h3>
      <p>
        当某个副作用（组件渲染函数、computed、watch 回调）正在运行时，框架会把它记在一个全局变量
        <code>activeEffect</code> 上。一旦这个副作用读到某个响应式属性，<code>get</code> 拦截就调用
        <code>track</code>：把「当前正在运行的 effect」存进<strong>这个属性专属的依赖集合</strong>里。
        一句话——<em>谁读了我，我就把谁记下来</em>。
      </p>
      <h3>trigger：在 set 里触发更新</h3>
      <p>
        当属性被写入，<code>set</code> 拦截调用 <code>trigger</code>：从这个属性的依赖集合里取出所有
        effect，逐个重新运行。组件的渲染 effect 重跑，就意味着重新渲染——视图于是自动跟上数据。
      </p>
      <p>
        框架内部用一个三层结构存放这些依赖关系，可以理解成一张大账本：
      </p>
      <CodeBlock lang="js" title="依赖仓库的三层结构" code={`targetMap: WeakMap {
  target对象A -> depsMap: Map {
    'count' -> dep: Set { effect1, effect2 },  // 读过 A.count 的所有副作用
    'name'  -> dep: Set { effect3 },
  },
  target对象B -> depsMap: Map { ... },
}`} />
      <p>
        外层用 <code>WeakMap</code> 以对象为键（对象被回收时依赖也自动释放），中层用 <code>Map</code> 把属性名映射到
        依赖集合，最内层用 <code>Set</code> 存 effect（天然去重，同一个 effect 读多次也只记一份）。
      </p>

      <h2>五、把闭环看一遍</h2>
      <p>
        把 reactive、track、trigger 串起来，就是 Vue 3 响应式的完整闭环。下面这张图可以一步步点开看：
        创建 Proxy → 读时 track 收集 → 改数据 → set 走 trigger → 依赖的副作用重跑。
      </p>
      <ReactivityFlow />
      <p>
        看懂了这张图，你就抓住了 Vue 响应式的全部精髓：剩下的 computed、watch、ref，
        都只是「不同形态的 effect」挂到这同一套 track/trigger 上而已（下一章细讲）。
      </p>

      <h2>六、手写一个最小响应式系统</h2>
      <p>
        理论讲再多，不如自己实现一遍。下面这约 30 行代码就是一个能跑的迷你响应式核心，
        包含 <code>reactive</code>、<code>effect</code>、<code>track</code>、<code>trigger</code> 四件套：
      </p>
      <CodeBlock lang="js" title="约 30 行手写最小 reactive" code={miniReactiveSnippet} />
      <Example title="跑一遍看效果">
        <p>注册一个读了 <code>state.count</code> 的副作用，之后每次改 count 它都会自动重跑：</p>
        <CodeBlock lang="js" title="最小响应式演示" code={miniDemoSnippet} />
        <p>
          整个过程没有任何「手动订阅」：<code>effect</code> 首次运行时读到 <code>state.count</code>，
          <code>get</code> 拦截把它 <code>track</code> 进 count 的依赖集；之后 <code>state.count++</code>
          走 <code>set</code> 拦截，<code>trigger</code> 取出那个 effect 重跑。读时收集、写时触发，闭环成立。
        </p>
      </Example>
      <Callout variant="note" title="真实实现还多了什么">
        真实的 Vue 源码当然比这复杂得多：activeEffect 是一个<strong>栈</strong>（支持嵌套 effect）、
        trigger 会调度去重避免一帧内重复执行、computed 是带缓存的 lazy effect、还有 cleanup 处理分支依赖变化等等。
        但骨架就是上面这 30 行——把它吃透，源码就只是「往这个骨架上加细节」。这些细节正是下一章的主题。
      </Callout>

      <h2>七、Vue 2 vs Vue 3 响应式对比</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Vue 2（Object.defineProperty）</th><th>Vue 3（Proxy）</th></tr>
        </thead>
        <tbody>
          <tr><td>劫持粒度</td><td>逐个<strong>属性</strong>改写 getter/setter</td><td>代理<strong>整个对象</strong></td></tr>
          <tr><td>新增属性</td><td>侦测不到，需 <code>this.$set</code></td><td>走 set 拦截，天然响应式</td></tr>
          <tr><td>删除属性</td><td>侦测不到，需 <code>this.$delete</code></td><td>走 deleteProperty 拦截，可侦测</td></tr>
          <tr><td>数组下标 / length</td><td>侦测不到，靠重写变异方法打补丁</td><td>下标赋值、改 length 均可侦测</td></tr>
          <tr><td>递归时机</td><td>初始化时<strong>立即</strong>深度递归整棵树</td><td><strong>惰性</strong>递归：读到才代理</td></tr>
          <tr><td>大对象初始化开销</td><td>高（全树遍历）</td><td>低（按需代理）</td></tr>
          <tr><td>浏览器兼容</td><td>支持 IE</td><td>Proxy 无法 polyfill，不支持 IE11</td></tr>
          <tr><td>依赖存储</td><td>每属性一个 <code>Dep</code> 实例</td><td>WeakMap → Map → Set 三层账本</td></tr>
        </tbody>
      </table>
      <p>
        唯一的代价是兼容性：<code>Proxy</code> 无法被 polyfill，所以 Vue 3 放弃了 IE11。
        换来的是更彻底、更省心、初始化更轻的响应式——这笔交易在 2020 年之后显然划算。
      </p>

      <Summary
        points={[
          '响应式的本质是一收一触的闭环：读数据时收集「谁在读」（track），写数据时找出读过它的人并通知重跑（trigger）。',
          'Vue 2 用 Object.defineProperty 逐属性劫持，先天侦测不到新增/删除属性、数组下标与 length，还要初始化时深度递归整棵树。',
          'Vue 2 的 this.$set / this.$delete 正是为弥补 defineProperty 拦不到增删属性而存在的兜底补丁。',
          'Vue 3 改用 Proxy 代理整个对象，get/set/deleteProperty/has 等拦截器让增删、数组下标都能被侦测，且惰性递归、初始化更轻。',
          'track 在 get 里把 activeEffect 记进「属性 -> 依赖集」，trigger 在 set 里取出依赖集中的 effect 逐个重跑；依赖用 WeakMap→Map→Set 三层存储。',
          '约 30 行的 reactive + effect + track + trigger 就能跑通完整闭环；真实源码只是在这个骨架上加 effect 栈、调度去重、computed 缓存等细节。',
          '代价是 Proxy 无法 polyfill，Vue 3 因此不支持 IE11；换来的是更彻底、更省心、初始化更轻的响应式。',
        ]}
      />
    </article>
  )
}
