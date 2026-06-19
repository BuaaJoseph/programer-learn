import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ReactivityFlow from '@/courses/vue-ecosystem/illustrations/ReactivityFlow.jsx'

const effectStackSnippet = `// effect 是依赖收集的承载者：靠 activeEffect 指针 + 一个栈支持嵌套
let activeEffect = null
const effectStack = []

function effect(fn) {
  const runner = () => {
    try {
      effectStack.push(runner)
      activeEffect = runner          // 当前正在跑的就是栈顶
      return fn()                    // 跑 fn 时读到的响应式数据会 track 到 runner
    } finally {
      effectStack.pop()
      // 退栈后把 activeEffect 还原成上一层（支持嵌套 effect）
      activeEffect = effectStack[effectStack.length - 1] || null
    }
  }
  runner()
  return runner
}`

const nestedEffectSnippet = `// 为什么需要「栈」而不是一个变量？因为 effect 会嵌套
effect(() => {        // 外层：组件 A 的渲染
  console.log(state.outer)
  effect(() => {      // 内层：组件 B 的渲染（嵌套在 A 里）
    console.log(state.inner)
  })
  // 内层跑完后，如果只有一个 activeEffect 变量，它会停在内层 effect 上，
  // 这里再读 state.tail 就会被错误地收集给内层 —— 收集错对象！
  console.log(state.tail)
})
// 用栈：内层退栈后 activeEffect 自动还原为外层，state.tail 正确归属外层`

const computedSnippet = `// computed：带缓存的 lazy effect
function computed(getter) {
  let value
  let dirty = true            // 脏标志：true 表示缓存失效、需要重算

  // lazy: true → 创建时不立即运行；scheduler → 依赖变化时不重算，只把 dirty 置回 true
  const runner = effect(getter, {
    lazy: true,
    scheduler() { dirty = true },
  })

  return {
    get value() {
      if (dirty) {            // 只有脏了才真正重算
        value = runner()
        dirty = false         // 算完缓存住，下次直接返回
      }
      return value
    },
  }
}`

const computedDemoSnippet = `const state = reactive({ count: 1 })
const double = computed(() => {
  console.log('重新计算 double')
  return state.count * 2
})

console.log(double.value)  // 打印「重新计算 double」→ 2  （第一次访问，dirty=true，算）
console.log(double.value)  // 直接 → 2  （命中缓存，不打印，不重算）

state.count = 5            // 依赖变了 → scheduler 把 dirty 置回 true（此刻还不算）
console.log(double.value)  // 打印「重新计算 double」→ 10 （脏了，重算一次）`

const refSnippet = `// ref：用一个对象 + .value 的 get/set 把「基本类型」也变成响应式
function ref(rawValue) {
  return {
    _value: rawValue,
    __v_isRef: true,
    get value() {
      track(this, 'value')        // 读 .value → 收集依赖
      return this._value
    },
    set value(newVal) {
      if (newVal === this._value) return
      this._value = newVal
      trigger(this, 'value')      // 写 .value → 触发更新
    },
  }
}
// 这就是「为什么 ref 必须写 .value」：响应式拦截只能挂在对象的属性上，
// 基本类型（number/string）本身无法被 Proxy 代理，只能包一层对象、用 value 这个属性做拦截点。`

const destructureSnippet = `import { reactive, toRefs } from 'vue'
const state = reactive({ x: 1, y: 2 })

// ❌ 错误：解构会「取出当前的原始值」，断开与 Proxy 的联系，从此不再响应
let { x, y } = state
state.x = 100   // x 还是 1，视图不更新

// ✅ 正确：toRefs 把每个属性包成 ref，解构出来仍保持响应式（通过 .value 连回源对象）
let { x: rx, y: ry } = toRefs(state)
state.x = 100   // rx.value 同步变成 100，视图更新`

const replaceSnippet = `import { reactive, ref } from 'vue'

let state = reactive({ count: 0 })
// ❌ 错误：整体替换变量，新对象是普通对象 / 新 Proxy，原来收集的依赖指向旧 Proxy，失联
state = reactive({ count: 99 })   // 视图不更新（依赖还盯着旧的那个）
state = { count: 99 }             // 更糟，直接变回普通对象

// ✅ 正确做法之一：改属性而不是换引用
state.count = 99

// ✅ 正确做法之二：用 ref 包整体，换值时改 .value（.value 的 set 会 trigger）
const data = ref({ count: 0 })
data.value = { count: 99 }        // 视图更新`

const arraySnippet = `import { reactive } from 'vue'
const list = reactive([1, 2, 3])

// ✅ Vue 3 中这些在 Vue 2 里失效的写法，现在都 OK（Proxy 能拦到下标与 length）
list[0] = 99          // 下标赋值 → 触发更新
list.length = 1       // 改 length → 触发更新
list[5] = 6           // 越界新增 → 触发更新

// Vue 2 里这些必须改用 list.splice(...) 或 this.$set(list, 0, 99)，Vue 3 不再需要`

const refUnwrapSnippet = `import { ref, reactive } from 'vue'
const count = ref(0)

// 模板里：ref 自动解包，直接写 {{ count }}，不用 count.value
//   <p>{{ count }}</p>           ✅ 自动解包

// reactive 对象里嵌 ref：自动解包，访问时不用 .value
const state = reactive({ count })
state.count          // → 0，自动解包（不是 ref 对象）

// ❌ 但放进「普通对象 / 数组」里就不解包，仍需 .value
const obj = { count }
obj.count.value      // 必须写 .value，否则拿到的是 ref 对象本身
const arr = [count]
arr[0].value         // 数组元素同样不自动解包`

const shallowSnippet = `import { shallowRef, shallowReactive, ref, reactive } from 'vue'

// reactive / ref：深响应（惰性递归代理每一层），改深层属性也会触发
const deep = reactive({ a: { b: { c: 1 } } })
deep.a.b.c = 2        // 触发更新

// shallowReactive：只有「第一层」属性是响应式，深层改动不触发
const sr = shallowReactive({ a: { b: 1 } })
sr.a = { b: 2 }       // ✅ 触发（第一层）
sr.a.b = 3            // ❌ 不触发（深层不代理）

// shallowRef：只追踪 .value 整体替换，不追踪 .value 内部属性
const sf = shallowRef({ n: 1 })
sf.value = { n: 2 }   // ✅ 触发（换了整个 .value）
sf.value.n = 3        // ❌ 不触发（内部属性不追踪）`

const markRawSnippet = `import { reactive, markRaw } from 'vue'

// markRaw：永久标记一个对象「不要被代理」。适合大型只读数据、第三方实例
//（地图实例、图表实例、不可变配置等）——既不需要响应式，代理它还白白消耗性能。
const heavy = markRaw({ /* 几万条静态数据 */ })
const state = reactive({ list: heavy })
// state.list 始终是原始对象，不会被包成 Proxy，读写它不走 track/trigger`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们用约 30 行打通了 reactive / track / trigger 的闭环。这一章把闭环上挂着的三个常用 API 讲透——
        <strong>effect</strong>（依赖收集的承载者）、<strong>computed</strong>（带缓存的 lazy effect）、
        <strong>ref</strong>（让基本类型也能响应式）——再系统地过一遍日常开发中最容易踩的几类
        <strong>响应式陷阱</strong>，并给出「错误写法 vs 正确写法」的对照。理解了它们的内部机制，
        这些陷阱就从「玄学 bug」变成「理所当然」。
      </Lead>

      <h2>一、effect：依赖收集的承载者</h2>
      <p>
        上一章的 <code>track</code> 把「当前正在运行的 effect」记进依赖集，靠的是一个全局指针
        <code>activeEffect</code>。这个 effect 究竟是什么？它就是<strong>一段需要在依赖变化时重跑的副作用</strong>：
        组件的渲染函数是一个 effect，<code>watchEffect</code> 的回调是一个 effect，computed 的 getter 也是。
      </p>
      <KeyIdea>
        effect 是响应式系统里「会因数据变化而重跑」的最小单位。运行 effect 前把它设为
        <code>activeEffect</code>，运行中读到的每个响应式属性都会把它 track 进自己的依赖集；
        数据一变，trigger 就把它揪出来重跑。组件渲染、computed、watch 全是 effect 的不同包装。
      </KeyIdea>
      <CodeBlock lang="js" title="带栈的 effect 实现" code={effectStackSnippet} />
      <h3>为什么 activeEffect 要用栈</h3>
      <p>
        如果 <code>activeEffect</code> 只是一个普通变量，遇到 effect <strong>嵌套</strong>就会出错：
        内层 effect 跑完后，变量还停在内层上，外层接下来读到的属性会被错误地收集给内层。
        用一个 <strong>effect 栈</strong>，内层退栈后能把 <code>activeEffect</code> 还原为外层，归属就不会错。
        组件树天然是嵌套的（父组件渲染时会渲染子组件），所以这个栈是必需的。
      </p>
      <CodeBlock lang="js" title="嵌套 effect 为什么需要栈" code={nestedEffectSnippet} />

      <h2>二、computed：带缓存的 lazy effect</h2>
      <p>
        <code>computed</code> 本质就是一个特殊的 effect，只多了两个特性：<strong>lazy（懒执行）</strong>和
        <strong>缓存（dirty 标志）</strong>。它不在创建时立即运行，而是等你第一次读 <code>.value</code> 才算；
        算完把结果缓存起来，只要依赖没变，再读多少次都直接返回缓存。
      </p>
      <CodeBlock lang="js" title="computed 的简化实现" code={computedSnippet} />
      <p>
        关键在那个 <code>scheduler</code>：普通 effect 在依赖变化时会<strong>立即重跑</strong>，
        而 computed 的 effect 在依赖变化时<strong>不重算</strong>，只把 <code>dirty</code> 置回
        <code>true</code>（标记「缓存脏了」）。真正的重算被推迟到下一次有人读 <code>.value</code> 时——
        这就是「依赖变才重算、且只在被读时才算」的懒缓存语义。
      </p>
      <Example title="缓存与重算的时机">
        <CodeBlock lang="js" title="computed 缓存演示" code={computedDemoSnippet} />
        <p>
          注意「重新计算 double」只在<strong>第一次访问</strong>和<strong>依赖变化后再次访问</strong>时打印。
          中间连续读两次只算一次——这正是 computed 相比普通方法（每次调用都重算）的价值所在。
        </p>
      </Example>

      <h2>三、ref 的内部：为什么必须写 .value</h2>
      <p>
        <code>reactive</code> 只能代理对象。可基本类型（<code>number</code>、<code>string</code>、<code>boolean</code>）
        没法被 <code>Proxy</code> 代理——你也没法拦截一个裸数字的「读」和「写」。Vue 的解法是：
        把值包进一个对象，用这个对象上的 <code>value</code> 属性作为拦截点。
      </p>
      <CodeBlock lang="js" title="ref 的简化实现" code={refSnippet} />
      <KeyIdea>
        <code>ref</code> 的 <code>.value</code> 不是多余的仪式，而是机制的必然：响应式拦截只能挂在
        <strong>对象的属性</strong>上。读 <code>.value</code> 走 get 做 track、写 <code>.value</code> 走 set 做 trigger——
        没有这层 <code>.value</code>，基本类型就无处安放拦截器。
      </KeyIdea>

      <h2>四、响应式陷阱与对照写法</h2>
      <p>
        理解了 reactive 是「代理对象」、ref 是「.value 拦截点」之后，下面这些经典陷阱就都能自洽地解释了。
        核心只有一句：<strong>响应式靠的是「读写经过那个被代理的对象/属性」，一旦绕开它，联系就断了</strong>。
      </p>

      <h3>陷阱 1：解构 reactive 丢失响应式</h3>
      <p>
        直接解构 <code>const {'{ x }'} = state</code>，等于「把 x 当前的原始值取出来赋给一个新变量」——
        这个新变量跟 Proxy 没有任何关系，之后改 <code>state.x</code> 自然不会影响它。
        解法是 <code>toRefs</code>：把每个属性包成 ref，解构出来的仍是「连回源对象的 .value」。
      </p>
      <CodeBlock lang="js" title="解构丢响应：toRefs 修复" code={destructureSnippet} />

      <h3>陷阱 2：整体替换 reactive 变量失效</h3>
      <p>
        依赖收集盯的是<strong>那个具体的 Proxy 对象</strong>。如果你把变量整体换成一个新对象，
        旧 Proxy 上收集的依赖还盯着旧对象，新对象根本没人理。要么<strong>改属性</strong>而非换引用，
        要么用 <code>ref</code> 包整体、通过 <code>.value</code> 的 set 来触发。
      </p>
      <CodeBlock lang="js" title="整体替换失效：改属性或用 ref" code={replaceSnippet} />

      <h3>陷阱 3（好消息）：数组下标赋值在 Vue 3 是 OK 的</h3>
      <p>
        这一条是和 Vue 2 的重要区别。因为 <code>Proxy</code> 能拦到数组的下标与 <code>length</code>，
        在 Vue 3 里 <code>list[0] = 99</code>、<code>list.length = 1</code> 都能正常触发更新，
        不再需要 Vue 2 那套 <code>splice</code> / <code>this.$set</code> 的绕法。
      </p>
      <CodeBlock lang="js" title="Vue 3 数组下标赋值正常生效" code={arraySnippet} />

      <h3>陷阱 4：ref 在模板自动解包，嵌在普通对象里不解包</h3>
      <p>
        模板里写 <code>{'{{ count }}'}</code> 会自动解包，不用 <code>.value</code>；ref 嵌在 reactive 对象里
        也自动解包。但一旦把 ref 放进<strong>普通对象或数组</strong>，自动解包就失效了，
        访问时仍要写 <code>.value</code>，否则拿到的是 ref 对象本身而非它的值。
      </p>
      <CodeBlock lang="js" title="ref 自动解包的边界" code={refUnwrapSnippet} />
      <Callout variant="warn" title="最常见的踩坑">
        把若干 ref 塞进一个普通数组（比如 <code>const list = [refA, refB]</code>）再去 <code>list[0]</code> 用，
        会发现拿到的是 ref 对象、模板里显示 <code>[object Object]</code>。要么用 <code>reactive</code> 包这个数组，
        要么老老实实写 <code>.value</code>。
      </Callout>

      <h2>五、浅响应与 markRaw：给大对象做优化</h2>
      <p>
        默认的 <code>reactive</code> / <code>ref</code> 是<strong>深响应</strong>：惰性地把每一层都代理，
        改最深层的属性也能触发。这对小数据很方便，但当数据是「几万条记录」「庞大的第三方实例」时，
        深层代理就是不必要的负担。Vue 提供了三个降级工具。
      </p>
      <h3>shallowReactive / shallowRef：只响应一层</h3>
      <p>
        <code>shallowReactive</code> 只代理对象的<strong>第一层</strong>属性，深层改动不触发；
        <code>shallowRef</code> 只追踪 <code>.value</code> 的<strong>整体替换</strong>，不追踪 .value 内部属性的变化。
        适合「整块替换、内部不细改」的大对象。
      </p>
      <CodeBlock lang="js" title="shallowReactive / shallowRef 的行为" code={shallowSnippet} />
      <h3>markRaw：永久不代理</h3>
      <p>
        <code>markRaw</code> 把一个对象标记为「永远不要变成响应式」。地图/图表实例、超大静态配置、
        第三方类实例这类<strong>既不需要响应式、代理它还白费性能甚至可能出错</strong>的对象，用它隔离掉最稳妥。
      </p>
      <CodeBlock lang="js" title="markRaw 隔离重型对象" code={markRawSnippet} />
      <Callout variant="tip" title="什么时候用 shallow / markRaw">
        判断标准很简单：<strong>这个对象的深层属性变化，需不需要驱动视图更新？</strong>
        不需要、且对象很大或来自第三方，就用 <code>shallowRef</code> / <code>shallowReactive</code>（仍想换整体）
        或 <code>markRaw</code>（完全静态）。盲目深响应大对象是常见的性能陷阱。
      </Callout>
      <table>
        <thead>
          <tr><th>API</th><th>响应深度</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td><code>reactive</code></td><td>深（惰性递归每层）</td><td>普通业务状态对象</td></tr>
          <tr><td><code>ref</code></td><td>深（.value 内部也响应）</td><td>基本类型 / 需整体也需内部响应</td></tr>
          <tr><td><code>shallowReactive</code></td><td>仅第一层属性</td><td>大对象、深层无需驱动视图</td></tr>
          <tr><td><code>shallowRef</code></td><td>仅 .value 整体替换</td><td>大对象整块替换、不细改内部</td></tr>
          <tr><td><code>markRaw</code></td><td>完全不代理</td><td>第三方实例、超大静态数据</td></tr>
        </tbody>
      </table>

      <h2>六、回到那张闭环图</h2>
      <p>
        无论 effect、computed 还是 ref，它们最终都挂回同一套 track/trigger 闭环：读时收集、写时触发。
        computed 只是「懒一点、带缓存」的 effect，ref 只是「拿 .value 当拦截点」的响应式，
        而所有陷阱都源于「读写绕开了被代理的对象/属性」。再看一遍这张图，把它和本章的 API 对上号：
      </p>
      <ReactivityFlow />

      <Summary
        points={[
          'effect 是响应式里「会因数据变化而重跑」的最小单位；activeEffect 用栈保存，以支持组件树那样的嵌套 effect，避免依赖收集归属错乱。',
          'computed 是带缓存的 lazy effect：创建不立即跑，靠 dirty 标志缓存，依赖变化时 scheduler 只置脏不重算，下次读 .value 才真正重算。',
          'ref 用「对象 + .value 的 get/set」把基本类型变成响应式；必须写 .value，因为拦截只能挂在对象属性上，裸值无法被 Proxy 代理。',
          '解构 reactive 会取出原始值而丢响应，用 toRefs 修复；整体替换 reactive 变量会让旧依赖失联，应改属性或用 ref 包整体。',
          '数组下标赋值与改 length 在 Vue 3 可正常触发（Proxy 能拦到），不再需要 Vue 2 的 splice / this.$set 绕法。',
          'ref 在模板和 reactive 对象里自动解包，但嵌进普通对象/数组里不解包，仍需 .value，否则拿到 ref 对象本身。',
          'shallowReactive/shallowRef 做浅响应、markRaw 完全不代理；判断标准是「深层变化是否需要驱动视图」，盲目深响应大对象是常见性能陷阱。',
        ]}
      />
    </article>
  )
}
