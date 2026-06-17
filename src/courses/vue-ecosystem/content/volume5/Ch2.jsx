import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cartStoreSnippet = `// stores/cart.js —— 购物车 store（组合式写法）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  // ===== state =====
  // items：购物车里的商品列表，每项 { id, name, price, qty }
  const items = ref([])
  // loading：标记是否正在和服务端交互，用来在 UI 上禁用按钮 / 显示转圈
  const loading = ref(false)

  // ===== getters =====
  // 商品总件数：把每个商品的数量累加
  const totalCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.qty, 0)
  )
  // 总价：单价 * 数量 再累加
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.qty, 0)
  )
  // 是否为空，方便组件直接用
  const isEmpty = computed(() => items.value.length === 0)

  // 模拟一个异步接口（真实项目里换成 fetch / axios）
  function fakeApi(payload) {
    return new Promise((resolve) => setTimeout(() => resolve(payload), 400))
  }

  // ===== actions =====
  // 加入购物车：已存在则数量 +n，否则新增一项；过程中模拟调接口同步到服务端
  async function addToCart(product, n = 1) {
    loading.value = true
    try {
      const existing = items.value.find((it) => it.id === product.id)
      if (existing) {
        existing.qty += n
      } else {
        items.value.push({ ...product, qty: n })
      }
      await fakeApi({ id: product.id, qty: n }) // 模拟同步到后端
    } finally {
      loading.value = false // 无论成功失败都要复位 loading
    }
  }

  // 从购物车删除某个商品
  async function removeFromCart(id) {
    loading.value = true
    try {
      items.value = items.value.filter((it) => it.id !== id)
      await fakeApi({ id })
    } finally {
      loading.value = false
    }
  }

  // 修改数量；数量降到 0 或以下就直接删除
  async function updateQty(id, qty) {
    const target = items.value.find((it) => it.id === id)
    if (!target) return
    if (qty <= 0) {
      await removeFromCart(id)
      return
    }
    target.qty = qty
    await fakeApi({ id, qty })
  }

  // 清空购物车（演示 reset 思路）
  function clear() {
    items.value = []
  }

  return {
    items, loading,
    totalCount, totalPrice, isEmpty,
    addToCart, removeFromCart, updateQty, clear,
  }
})`

const productListSnippet = `<!-- components/ProductList.vue —— 商品列表组件（生产方） -->
<script setup>
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()

// 一批演示商品
const products = [
  { id: 1, name: 'Vue 贴纸', price: 5 },
  { id: 2, name: 'Pinia T 恤', price: 99 },
  { id: 3, name: '组合式 API 手册', price: 49 },
]
<\/script>

<template>
  <ul>
    <li v-for="p in products" :key="p.id">
      {{ p.name }} —— ￥{{ p.price }}
      <!-- 调 action 加购；loading 时禁用按钮，避免重复提交 -->
      <button :disabled="cart.loading" @click="cart.addToCart(p)">
        {{ cart.loading ? '处理中…' : '加入购物车' }}
      </button>
    </li>
  </ul>
</template>`

const cartBadgeSnippet = `<!-- components/CartBadge.vue —— 购物车角标组件（消费方） -->
<script setup>
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
// 用 storeToRefs 解构响应式的 state / getters，保持响应性
const { totalCount, totalPrice, isEmpty } = storeToRefs(cart)
// action 直接从 store 解构
const { clear } = cart
<\/script>

<template>
  <div class="badge">
    <span>🛒 {{ totalCount }} 件</span>
    <span v-if="!isEmpty">合计 ￥{{ totalPrice }}</span>
    <button v-if="!isEmpty" @click="clear">清空</button>
  </div>
</template>`

const helpersSnippet = `// 几个常用工具方法（在 action 内部或组件里都能调）

// $reset()：把 state 重置回初始值（仅选项式 store 自带；
//   组合式 store 需自己写一个 clear/reset action，如上面的 clear）
store.$reset()

// $patch()：批量改多个 state，比一条条赋值更高效、devtools 里合并成一次记录
store.$patch({ loading: false })
store.$patch((state) => { state.items.push(newItem) })

// $subscribe()：订阅 state 变化，常用于自己手写持久化
store.$subscribe((mutation, state) => {
  localStorage.setItem('cart', JSON.stringify(state.items))
})`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章讲清了 Pinia 的原理，这一章我们把它跑起来：搭一个完整、可运行的购物车 store，
        让两个毫无父子关系的组件——商品列表和购物车角标——共享同一份状态。你会看到 state、getters、
        异步 action、loading 处理、<code>storeToRefs</code> 如何在真实场景里各司其职，
        并顺带认识 <code>$reset</code> / <code>$patch</code> / <code>$subscribe</code> 这几个实用 API。
      </Lead>

      <h2>一、需求拆解：购物车要管什么</h2>
      <p>
        购物车是状态管理的经典案例，因为它天然满足「跨组件共享」：
      </p>
      <ul>
        <li><strong>商品列表组件</strong>负责把商品加进购物车（数据的生产方）。</li>
        <li><strong>购物车角标组件</strong>（通常在页面顶部）要实时显示「共几件、合计多少钱」（数据的消费方）。</li>
        <li>这两个组件在组件树里往往离得很远，没有父子关系，用 props/events 几乎无法传递。</li>
      </ul>
      <KeyIdea>
        把购物车状态放进一个 <code>useCartStore</code>，生产方和消费方各自调用它拿到<strong>同一个单例</strong>。
        商品列表调 action 改数据，角标组件读 getters 显示数据，两者通过 store 自动联动，
        完全不需要知道对方的存在。这就是状态管理解耦组件的威力。
      </KeyIdea>
      <p>
        我们的 store 需要：state 存商品列表和一个 loading 标记；getters 算总件数、总价、是否为空；
        actions 提供加入、删除、改数量、清空，并在其中模拟调用后端接口。
      </p>

      <h2>二、完整的购物车 store</h2>
      <p>
        采用上一章推荐的<strong>组合式写法</strong>。注意几个要点：state 用 <code>ref</code> 定义；
        getters 用 <code>computed</code> 并通过 <code>reduce</code> 做累加；异步 action 用
        <code>try / finally</code> 保证 loading 一定会复位；最后把所有要暴露的东西 <code>return</code> 出来。
      </p>
      <CodeBlock lang="js" title="stores/cart.js" code={cartStoreSnippet} />
      <Callout variant="info" title="getters 里的 reduce 会自动重算吗">
        会，而且只在该重算时重算。<code>totalPrice</code> 是 <code>computed</code>，它依赖
        <code>items</code>。只要 items 没变，多个组件反复读 totalPrice 都走缓存；一旦
        items 增删改，它就自动失效并重新累加——这正是把派生值放进 getters 而非组件里手算的好处。
      </Callout>

      <h3>异步 action 与 loading 的处理</h3>
      <p>
        真实项目里「加入购物车」往往要同步到服务端，是个异步操作。我们用 <code>loading</code> 这个 state
        标记进行中状态：进入 action 先置 <code>true</code>，在 <code>finally</code> 里置回 <code>false</code>。
        放在 finally 是关键——即便接口报错，loading 也能被复位，不会让按钮永远卡在「处理中」。
      </p>
      <Example title="为什么用 try / finally 而不是顺序赋值">
        <p>
          如果写成「<code>loading=true</code> → await 接口 → <code>loading=false</code>」的顺序赋值，
          一旦接口抛错，<code>loading=false</code> 那行就被跳过了，UI 会永远停在加载态。
          把复位放进 <code>finally</code>，无论成功还是抛异常都会执行，这是处理 loading 的标准姿势。
        </p>
      </Example>

      <h2>三、生产方：商品列表组件</h2>
      <p>
        商品列表只负责「往购物车加东西」。它调用 <code>useCartStore()</code> 拿到 store，点击按钮时调用
        <code>cart.addToCart(p)</code>。注意按钮上绑了 <code>:disabled="cart.loading"</code>——
        加购在途时禁用按钮，避免用户连点造成重复提交。这里直接用 <code>cart.loading</code> 访问，
        在模板里访问 store 字段是响应式的，无需 storeToRefs。
      </p>
      <CodeBlock lang="vue" title="components/ProductList.vue" code={productListSnippet} />

      <h2>四、消费方：购物车角标组件</h2>
      <p>
        角标组件只负责「显示」。它同样调 <code>useCartStore()</code> 拿到<strong>同一个</strong> store 实例。
        这里我们要在 <code>&lt;script setup&gt;</code> 里把 totalCount 等取出来用，所以必须用
        <code>storeToRefs</code> 解构，才能保持响应性；而 <code>clear</code> 是 action，直接从 store 解构。
      </p>
      <CodeBlock lang="vue" title="components/CartBadge.vue" code={cartBadgeSnippet} />
      <Callout variant="warn" title="别在 script 里直接解构 state">
        如果这里写成 <code>const &#123; totalCount &#125; = cart</code>，totalCount 会变成一个普通数字，
        之后购物车再变它也不会更新，角标就「定格」了。务必用 <code>storeToRefs(cart)</code> 解构
        state 和 getters；action（如 clear）则直接解构。这是上一章那条规则在实战里的体现。
      </Callout>

      <Example title="两个组件如何联动">
        <p>
          用户在 ProductList 点「加入购物车」→ 触发 <code>addToCart</code> action → 修改了 store 里的
          <code>items</code> → <code>totalCount</code> / <code>totalPrice</code> 这两个 getter 自动重算
          → CartBadge 因为用 storeToRefs 持有它们的响应式引用，界面立刻更新。
          全程两个组件没有任何直接通信，全靠 store 这个中间人。
        </p>
      </Example>

      <h2>五、几个实用 API：$reset / $patch / $subscribe</h2>
      <p>
        store 实例上还挂着几个以 <code>$</code> 开头的内置方法，实战里经常用到：
      </p>
      <table>
        <thead>
          <tr><th>方法</th><th>作用</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td><code>$reset()</code></td><td>把 state 重置回初始值</td><td>退出登录、清空表单（选项式 store 自带；组合式需自写 reset action）</td></tr>
          <tr><td><code>$patch()</code></td><td>批量修改多个 state</td><td>一次改多个字段，devtools 里合并成一条记录</td></tr>
          <tr><td><code>$subscribe()</code></td><td>订阅 state 的每次变化</td><td>手写持久化，把变化同步进 localStorage</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="js" title="$reset / $patch / $subscribe 速览" code={helpersSnippet} />
      <Callout variant="info" title="组合式 store 没有自带 $reset">
        <code>$reset()</code> 依赖「初始 state 工厂函数」，这是选项式写法才有的信息。组合式 store
        请像我们 cart 里的 <code>clear()</code> 那样，自己写一个把各 ref 复位的 action。这点别踩坑。
      </Callout>

      <h2>六、测试 store</h2>
      <p>
        store 是纯逻辑、不依赖 DOM，因此非常好测。测试时只需在每个用例前用
        <code>setActivePinia(createPinia())</code> 创建一个干净的 Pinia 实例，然后调
        <code>useCartStore()</code>，像调普通对象一样断言它的 state、调它的 action、检查 getters
        是否随之变化即可——这也是 Pinia 相比 Vuex 在可测试性上的一大优势。
      </p>

      <h2>七、小结这套写法的好处</h2>
      <p>
        回头看这个购物车：所有数据和业务逻辑都收敛在一个文件 <code>stores/cart.js</code> 里，
        组件只管「调 action、读 getter、展示」，职责清晰。新增一个「侧边栏迷你购物车」组件？
        再调一次 <code>useCartStore()</code> 就能接入同一份数据，零额外成本。这就是把共享状态
        集中管理带来的可维护性。
      </p>

      <Summary
        points={[
          '购物车是跨组件共享的典型：商品列表（生产方）与购物车角标（消费方）通过同一个 useCartStore 单例联动，互不直接通信。',
          'store 用组合式写法：items/loading 是 state，totalCount/totalPrice/isEmpty 用 computed 做 getters，加入/删除/改数量是 actions。',
          '异步 action 用 loading 标记进行中状态，并在 try/finally 的 finally 里复位 loading，保证报错时也不会卡在加载态。',
          '消费方组件在 script 里取 state/getters 必须用 storeToRefs 保持响应性，action（如 clear）直接解构；模板里直接访问 store 字段则天然响应式。',
          '$reset 重置 state（组合式需自写 reset action）、$patch 批量改、$subscribe 订阅变化常用于持久化。',
          'store 是纯逻辑，测试时用 setActivePinia(createPinia()) 起干净实例再断言，可测试性优于 Vuex；状态集中后新增消费组件零成本。',
        ]}
      />
    </article>
  )
}
