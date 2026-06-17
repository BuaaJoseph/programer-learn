import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const optionStoreSnippet = `// stores/counter.js —— 选项式写法（Options Store）
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  // state 必须是一个返回初始对象的函数（和组件 data 一样，避免多实例共享同一引用）
  state: () => ({
    count: 0,
    name: 'Pinia',
  }),
  // getters：基于 state 的派生值，类似计算属性，带缓存
  getters: {
    double: (state) => state.count * 2,
    // 也可以用 this 访问其它 getter（此时不能用箭头函数）
    doublePlusOne() {
      return this.double + 1
    },
  },
  // actions：业务方法，可同步可异步，内部用 this 访问 state
  actions: {
    increment() {
      this.count++
    },
    async loadFromServer() {
      const res = await fetch('/api/count')
      this.count = await res.json()
    },
  },
})`

const setupStoreSnippet = `// stores/counter.js —— 组合式写法（Setup Store），更推荐
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // ref / reactive  ->  相当于 state
  const count = ref(0)
  const name = ref('Pinia')

  // computed  ->  相当于 getters（自动缓存）
  const double = computed(() => count.value * 2)

  // 普通函数  ->  相当于 actions
  function increment() {
    count.value++
  }
  async function loadFromServer() {
    const res = await fetch('/api/count')
    count.value = await res.json()
  }

  // 必须把要暴露的内容都 return 出去，否则组件里访问不到
  return { count, name, double, increment, loadFromServer }
})`

const installSnippet = `// main.js —— 安装 Pinia
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia()) // 注册为插件，全局可用
app.mount('#app')`

const useInComponentSnippet = `<script setup>
import { storeToRefs } from 'pinia'
import { useCounterStore } from '@/stores/counter'

// 调用 useXxxStore() 拿到 store 实例（每个组件拿到的都是同一个单例）
const store = useCounterStore()

// 直接解构会丢响应性！count 变成了一个普通数字快照
// const { count } = store  // 错误示范

// 用 storeToRefs 解构 state / getters，保持响应性（它们会变成 ref）
const { count, double } = storeToRefs(store)

// actions 是函数，不是响应式状态，直接从 store 解构即可
const { increment } = store
<\/script>

<template>
  <p>count: {{ count }}，double: {{ double }}</p>
  <button @click="increment">+1</button>
  <!-- 模板里也可以直接写 store.count，无需解构 -->
  <p>名字：{{ store.name }}</p>
</template>`

const persistSnippet = `// 持久化：用社区插件 pinia-plugin-persistedstate，一行接入
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate) // 之后在 store 里开 persist: true 即可落地到 localStorage`

export default function Ch1() {
  return (
    <article>
      <Lead>
        当一个 Vue 应用从几个组件长成几十上百个组件，组件之间共享数据这件事就会变得棘手。
        本章我们讲清楚为什么需要专门的状态管理库，以及 Vue 官方现在推荐的方案——
        Pinia。我们会从它的三大核心概念 state / getters / actions 讲起，对比两种写法，
        说清「响应性为什么会在解构时丢失」这个新手最常踩的坑，最后把它和老牌的 Vuex 摆在一起对比。
      </Lead>

      <h2>一、为什么需要状态管理库</h2>
      <p>
        Vue 组件天生擅长「自上而下」传数据：父组件用 props 把数据传给子组件，子组件用事件把变化
        通知回父组件。这套机制在层级浅、数据局部的场景下非常清爽。但应用一旦变大，两类问题就会冒出来。
      </p>
      <p>
        第一类是 <strong>prop drilling（逐层透传）</strong>。当一个深层组件需要顶层的数据，
        而中间隔着五六层组件时，你不得不把这份数据像接力棒一样一层层往下传，沿途的中间组件
        其实根本用不到它，只是被迫当了二传手。这让组件接口变脏、重构变难。
      </p>
      <p>
        第二类是 <strong>兄弟 / 远亲组件共享</strong>。比如商品列表组件往购物车里加东西，
        而页面右上角的购物车角标组件要实时显示数量——这两个组件在组件树里可能毫无父子关系，
        靠 props/events 根本传不过去，只能把数据「提升」到它们共同的祖先，越提越高，最后整个
        应用的状态都堆在根组件，难以维护。
      </p>
      <KeyIdea>
        状态管理库的本质是：把需要<strong>跨组件共享</strong>的状态从组件树里抽出来，集中放到一个
        独立的、全局可访问的「仓库」里。任何组件都能直接读写它，数据变化会自动反映到所有用到它的地方，
        从此告别 prop drilling 和无意义的状态提升。
      </KeyIdea>
      <p>
        需要强调的是：<strong>不是所有状态都该进仓库</strong>。只属于单个组件的局部状态（比如一个
        输入框是否聚焦、一个下拉菜单是否展开）继续留在组件里就好。进仓库的，应该是那些被多个组件
        共享、或需要集中管理生命周期的「应用级状态」，比如登录用户信息、购物车、全局主题、缓存的列表数据。
      </p>

      <h2>二、Pinia 是什么：Vue 官方现在推荐的状态库</h2>
      <p>
        Pinia 是 Vue 生态当前<strong>官方推荐</strong>的状态管理库，由 Vue 核心团队成员维护，
        已经正式<strong>取代 Vuex</strong> 成为新项目的默认选择（Vuex 进入维护状态，不再主推）。
        它对 Vue 3 的组合式 API 设计得极其贴合，对 TypeScript 类型推断友好，API 也比 Vuex 精简很多。
      </p>
      <p>
        在 Pinia 里，一个仓库叫做一个 <strong>store</strong>。你可以按业务把状态拆成多个 store，
        比如 <code>useUserStore</code>、<code>useCartStore</code>、<code>useSettingsStore</code>，
        天然就是模块化的，不需要像 Vuex 那样手动声明 modules 和命名空间。
      </p>
      <p>
        使用前要先把 Pinia 作为插件安装到应用上：
      </p>
      <CodeBlock lang="js" title="main.js：安装 Pinia 插件" code={installSnippet} />

      <h2>三、三大核心概念：state / getters / actions</h2>
      <p>
        一个 store 的内部由三部分组成，理解它们和组件的对应关系，就理解了 Pinia 的全部基础：
      </p>
      <ul>
        <li><strong>state</strong>：仓库里存的数据，是<strong>响应式</strong>的——改了它，所有用到的地方自动更新。对应组件里的 <code>data</code>。</li>
        <li><strong>getters</strong>：基于 state 计算出来的派生值，<strong>带缓存</strong>——依赖不变就不重算。对应组件里的 <code>computed</code>。</li>
        <li><strong>actions</strong>：操作 state 的业务方法，<strong>可同步可异步</strong>（里面可以发请求）。对应组件里的 <code>methods</code>。</li>
      </ul>
      <Callout variant="info" title="getters 的缓存来自哪里">
        getters 本质上是用 <code>computed</code> 实现的。所以它具有计算属性的缓存特性：只要它依赖的
        state 没变，多次读取 getter 都直接返回上次的结果，不会重复执行计算函数。这和「每次调用都重新
        跑一遍」的普通函数（action）有本质区别。
      </Callout>

      <h2>四、defineStore 的两种写法</h2>
      <p>
        定义一个 store 永远是调用 <code>defineStore(id, ...)</code>，第一个参数 <code>id</code> 是这个
        store 的唯一名字（Pinia 用它在 devtools 里区分仓库）。第二个参数有两种写法。
      </p>

      <h3>写法一：选项式（Options Store）</h3>
      <p>
        第二个参数传一个对象，里面分别写 <code>state</code>、<code>getters</code>、<code>actions</code>
        三个字段。风格上很像 Vue 2 的选项式组件，从 Vuex 迁移过来的人会觉得亲切。注意 <code>state</code>
        必须是一个<strong>返回初始对象的函数</strong>，这和组件里 data 要写成函数是同一个道理：
        防止多个实例共享同一个对象引用。
      </p>
      <CodeBlock lang="js" title="选项式 store" code={optionStoreSnippet} />

      <h3>写法二：组合式（Setup Store）</h3>
      <p>
        第二个参数传一个<strong>函数</strong>（就像组件的 <code>setup</code>）。在这个函数里：用
        <code>ref</code> / <code>reactive</code> 定义的就是 state，用 <code>computed</code> 定义的就是
        getters，普通的 <code>function</code> 就是 actions。最后必须把要暴露的东西 <code>return</code> 出来。
      </p>
      <CodeBlock lang="js" title="组合式 store（更推荐）" code={setupStoreSnippet} />
      <Callout variant="tip" title="该用哪种写法">
        两种写法功能完全等价，可以混用项目。但<strong>组合式写法更推荐</strong>：它能直接复用
        <code>watch</code>、<code>watchEffect</code> 等组合式 API，能把逻辑拆成可复用的组合函数，
        心智模型和你写组件时完全一致。本卷后面的购物车实战就用组合式写法。
      </Callout>

      <Example title="state / getters / actions 的对应关系">
        <p>
          把 store 想象成一个「不挂在任何 DOM 上的组件」：state 是它的数据，getters 是它的计算属性，
          actions 是它的方法。区别只在于——组件的状态随组件销毁而消失，而 store 是<strong>单例</strong>，
          活在整个应用的生命周期里，被所有组件共享同一份。
        </p>
      </Example>

      <h2>五、在组件里使用 store</h2>
      <p>
        在组件里用 store，第一步是调用对应的 <code>useXxxStore()</code> 拿到实例。无论多少个组件调用它，
        拿到的都是<strong>同一个单例</strong>——这正是「共享」的基础。拿到实例后，可以直接
        <code>store.count</code> 读、<code>store.increment()</code> 调，在模板里这样写完全没问题。
      </p>

      <h3>解构的陷阱：storeToRefs</h3>
      <p>
        问题出在「想把 store 解构开、少写几个 <code>store.</code> 前缀」的时候。store 实例本身是一个被
        <code>reactive</code> 包裹的响应式对象，如果你直接解构它的 state：
      </p>
      <KeyIdea>
        直接 <code>const &#123; count &#125; = store</code> 会<strong>丢失响应性</strong>：解构相当于把
        响应式对象里的值「拷」了一份普通变量出来，之后 store 里的 count 再变，你手里的 count 也不会动了。
        正确做法是用 <code>storeToRefs(store)</code> 解构 state 和 getters，它会把每个字段包成 ref，
        从而保持响应式连接。
      </KeyIdea>
      <p>
        而 <strong>actions 不受这个影响</strong>：它们是普通函数，不是响应式状态，直接从 store 解构出来
        随便用。所以惯用法是：<code>storeToRefs</code> 取数据，直接解构取方法。
      </p>
      <CodeBlock lang="vue" title="组件里正确使用 store" code={useInComponentSnippet} />
      <Callout variant="warn" title="只有 state 和 getters 才需要 storeToRefs">
        别把 action 也塞进 <code>storeToRefs</code>——它只处理响应式的 state 和 getters，
        会忽略函数。记住这条分工：<strong>响应式数据走 storeToRefs，方法直接解构</strong>。
      </Callout>

      <h2>六、Pinia vs Vuex 对比</h2>
      <p>
        如果你接触过 Vuex，下面这张表能帮你快速建立映射。最大的体感差异是：Pinia
        <strong>砍掉了 mutations</strong>。在 Vuex 里改 state 必须经过同步的 mutation，异步逻辑放 action
        再去 commit mutation，这套流程繁琐且容易绕晕。Pinia 里直接在 action（甚至组件）里改 state 就行。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Vuex（老）</th><th>Pinia（新，官方推荐）</th></tr>
        </thead>
        <tbody>
          <tr><td>修改 state 的方式</td><td>必须经过 mutations（同步）+ actions（异步）</td><td>没有 mutations，action 里直接改</td></tr>
          <tr><td>TypeScript 支持</td><td>类型推断弱，需大量手写类型</td><td>类型推断开箱即用，非常友好</td></tr>
          <tr><td>模块化</td><td>手动声明 modules + 命名空间，繁琐</td><td>每个 store 天然就是独立模块</td></tr>
          <tr><td>API 复杂度</td><td>概念多：state/getters/mutations/actions/modules</td><td>精简：state/getters/actions</td></tr>
          <tr><td>组合式 API 契合度</td><td>为 Options API 时代设计</td><td>为 Vue 3 组合式 API 量身打造</td></tr>
          <tr><td>devtools</td><td>支持</td><td>支持，且能看时间线、追踪 action</td></tr>
          <tr><td>官方态度</td><td>维护模式，不再主推</td><td>新项目默认推荐</td></tr>
        </tbody>
      </table>
      <p>
        简单说：新项目<strong>无脑选 Pinia</strong>；老项目里的 Vuex 能继续跑，但没有迁移压力时不必硬迁，
        有重构机会时优先换成 Pinia。
      </p>

      <h2>七、插件与持久化</h2>
      <p>
        Pinia 支持插件机制，可以给所有 store 统一增强能力。最常见的需求是<strong>持久化</strong>——
        把 store 的状态自动存进 <code>localStorage</code>，刷新页面也不丢（比如保留购物车）。
        社区插件 <code>pinia-plugin-persistedstate</code> 一行注册即可，几乎零成本：
      </p>
      <CodeBlock lang="js" title="一句话接入持久化插件" code={persistSnippet} />

      <Callout variant="tip">
        下一章我们就动手实战：用组合式写法搭一个完整的购物车 store，让商品列表组件和购物车角标组件
        共享同一份状态，并在 action 里模拟异步调接口、处理 loading，把本章的概念全部落地。
      </Callout>

      <Summary
        points={[
          '状态管理库把跨组件共享的状态从组件树抽出集中管理，解决 prop drilling 和无意义的状态提升；局部状态仍留在组件里。',
          'Pinia 是 Vue 官方当前推荐的状态库，已取代进入维护模式的 Vuex，对组合式 API 与 TypeScript 都很友好。',
          '一个 store 由三部分组成：state（响应式数据）、getters（带缓存的派生值，等价 computed）、actions（可同步可异步的方法）。',
          'defineStore 有两种写法：选项式（state/getters/actions 对象）与组合式（setup 函数，ref=state、computed=getters、function=actions），推荐组合式。',
          '组件里用 useXxxStore() 拿到单例；直接解构 state 会丢响应性，必须用 storeToRefs 解构 state/getters，actions 直接解构即可。',
          'Pinia 相比 Vuex 砍掉了 mutations、API 更精简、模块化天然、类型推断更好；并支持插件机制，可一行接入持久化。',
        ]}
      />
    </article>
  )
}
