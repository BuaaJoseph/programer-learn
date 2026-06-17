import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const teleportSnippet = `<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<template>
  <button @click="open = true">打开弹窗</button>

  <!-- 无论这段写在多深的组件里，DOM 都会被渲染到 body 下 -->
  <Teleport to="body">
    <div v-if="open" class="modal-mask">
      <div class="modal">
        <h3>这是一个模态框</h3>
        <button @click="open = false">关闭</button>
      </div>
    </div>
  </Teleport>
</template>`

const teleportTargetSnippet = `<!-- to 接收任意 CSS 选择器或真实 DOM 节点 -->
<Teleport to="#toast-root">...</Teleport>

<!-- disabled 为真时不传送，原地渲染（可按屏幕宽度等条件切换） -->
<Teleport to="body" :disabled="isMobile">...</Teleport>`

const asyncSetupSnippet = `<script setup>
// 顶层 await：这个组件的 setup 变成异步的，必须由 Suspense 来等待
const res = await fetch('/api/profile')
const profile = await res.json()
</script>

<template>
  <h2>{{ profile.name }}</h2>
</template>`

const suspenseSnippet = `<template>
  <Suspense>
    <!-- #default 里可以是异步组件，或带顶层 await 的异步 setup 组件 -->
    <template #default>
      <AsyncProfile />
    </template>
    <!-- 等待期间显示 fallback -->
    <template #fallback>
      <p>加载中...</p>
    </template>
  </Suspense>
</template>`

const keepAliveSnippet = `<template>
  <!-- 切走的组件实例被缓存，再切回来时保留滚动位置、表单输入等状态 -->
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>

  <!-- include / exclude 控制哪些组件被缓存（按 name 匹配） -->
  <KeepAlive :include="['TabA', 'TabB']">
    <component :is="currentTab" />
  </KeepAlive>

  <!-- max 限制最多缓存几个实例（LRU 淘汰） -->
  <KeepAlive :max="5">
    <component :is="currentTab" />
  </KeepAlive>
</template>`

const activatedSnippet = `<script setup>
import { onActivated, onDeactivated, ref } from 'vue'

const timer = ref(null)

// 被 KeepAlive 缓存的组件不会走 onUnmounted，
// 而是用 onActivated / onDeactivated 这对钩子
onActivated(() => {
  // 每次重新进入（切回来）时触发：可在此恢复轮询、刷新数据
  timer.value = setInterval(poll, 5000)
})

onDeactivated(() => {
  // 切走（被缓存起来）时触发：清理定时器，避免后台空转
  clearInterval(timer.value)
})
</script>`

const directiveSnippet = `<script setup>
// 局部自定义指令：在 <script setup> 里以 vXxx 命名即可在模板用 v-xxx
const vFocus = {
  // 元素插入 DOM 后调用
  mounted(el) {
    el.focus()
  },
}
</script>

<template>
  <input v-focus />
</template>`

const directiveGlobalSnippet = `// 全局注册：app.directive('名字', 定义对象)
app.directive('focus', {
  mounted(el) {
    el.focus()
  },
})

// 一个更实用的例子：v-color 根据绑定值设置文字颜色
app.directive('color', {
  mounted(el, binding) {
    el.style.color = binding.value
  },
  updated(el, binding) {
    el.style.color = binding.value
  },
})
// 用法：<span v-color="'red'">警告</span>`

const useMouseSnippet = `// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

// 约定：组合式函数以 use 开头，把「有状态的逻辑」抽出来复用
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.pageX
    y.value = e.pageY
  }

  // 在 composable 里照样能用生命周期钩子，自动绑定到调用它的组件
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // 返回响应式状态（和方法），由调用方解构使用
  return { x, y }
}`

const useMouseUsageSnippet = `<script setup>
import { useMouse } from '@/composables/useMouse'

// 一行接入，多个组件都能复用同一套逻辑，各自拥有独立状态
const { x, y } = useMouse()
</script>

<template>
  <p>鼠标位置：{{ x }}, {{ y }}</p>
</template>`

const useFetchSnippet = `// composables/useFetch.js
import { ref, watchEffect, toValue } from 'vue'

// 接受 ref / getter / 普通值；用 toValue 统一取值，URL 变化时自动重新请求
export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function doFetch() {
    data.value = null
    error.value = null
    loading.value = true
    try {
      const res = await fetch(toValue(url))
      data.value = await res.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  // 依赖（url）变化时自动重新执行
  watchEffect(doFetch)

  return { data, error, loading }
}`

const useFetchUsageSnippet = `<script setup>
import { ref } from 'vue'
import { useFetch } from '@/composables/useFetch'

const id = ref(1)
// 传入一个 getter，id 变了 useFetch 内部会自动重新请求
const { data, error, loading } = useFetch(() => '/api/users/' + id.value)
</script>

<template>
  <button @click="id++">下一个用户</button>
  <p v-if="loading">加载中...</p>
  <p v-else-if="error">出错了</p>
  <pre v-else>{{ data }}</pre>
</template>`

const mixinSnippet = `// 旧时代：mixin 把逻辑混入组件，但来源不透明、命名易冲突
export const mouseMixin = {
  data() {
    return { x: 0, y: 0 }
  },
  mounted() {
    window.addEventListener('mousemove', this.update)
  },
  methods: {
    update(e) {
      this.x = e.pageX
      this.y = e.pageY
    },
  },
}
// 组件里 mixins: [mouseMixin] —— 但 this.x 从哪来？多个 mixin 一起用会不会撞名？看不出来`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章谈性能，这一章谈「表达力」与「复用」。Vue 3 提供了一组进阶内置组件——
        <code>Teleport</code>、<code>Suspense</code>、<code>KeepAlive</code>——分别解决
        「DOM 渲染到哪里」「异步加载期间显示什么」「切走的组件状态保不保留」三类问题；
        再加上<strong>自定义指令</strong>和<strong>组合式函数（composable）</strong>这两套复用机制。
        其中 composable 是 Vue 3 逻辑复用的主角，相当于 Vue 版的自定义 Hook，
        它优雅地取代了 Vue 2 时代的 mixin。
      </Lead>

      <h2>一、Teleport：把 DOM 渲染到别处</h2>
      <KeyIdea>
        <code>Teleport</code> 让你在组件内书写一段模板，却把它真正渲染到 DOM 树的<strong>另一个位置</strong>
        （通常是 <code>body</code>）。逻辑上它还属于当前组件，物理上它脱离了父级的层叠与溢出约束。
      </KeyIdea>
      <p>
        模态框、通知 toast、下拉菜单这类「浮层」组件常被祖先元素的 <code>overflow: hidden</code> 裁切，
        或被 <code>z-index</code> 层叠上下文压住。把它们用 <code>Teleport</code> 传送到 <code>body</code> 下，
        就摆脱了父级样式的干扰，<strong>层级和定位都干净了</strong>，而事件、数据绑定仍按组件树正常工作。
      </p>
      <CodeBlock lang="vue" title="用 Teleport 实现模态框" code={teleportSnippet} />
      <p>
        <code>to</code> 接收任意 CSS 选择器或真实 DOM 节点；<code>disabled</code> 为真时则原地渲染、
        不做传送，可用于按屏幕宽度等条件动态切换。
      </p>
      <CodeBlock lang="vue" title="Teleport 的 to 与 disabled" code={teleportTargetSnippet} />
      <Callout variant="note" title="目标必须已存在">
        <code>Teleport</code> 挂载时，目标节点（如 <code>#toast-root</code>）必须已经存在于 DOM 中，
        否则会报错。<code>body</code> 永远存在，所以最常用。
      </Callout>

      <h2>二、Suspense：协调异步加载态</h2>
      <p>
        上一章已见过 <code>Suspense</code> 的雏形，这里讲透它「等什么」。它能等待两类异步：
        <strong>异步组件</strong>（<code>defineAsyncComponent</code> 加载的）与
        <strong>异步 setup</strong>（在 <code>{'<script setup>'}</code> 里用了顶层 <code>await</code> 的组件）。
        只要它的默认插槽内有未就绪的异步，它就显示 <code>#fallback</code>；全部就绪后切到 <code>#default</code>。
      </p>
      <CodeBlock lang="vue" title="带顶层 await 的异步 setup" code={asyncSetupSnippet} />
      <CodeBlock lang="vue" title="Suspense 配 #default / #fallback" code={suspenseSnippet} />
      <Callout variant="warn" title="Suspense 仍是实验性特性">
        到 2026 年，<code>Suspense</code> 的 API 官方仍标注为<strong>实验性</strong>，未来可能有调整。
        生产中用它处理异步组件加载态通常没问题，但要留意版本说明，别在它之上堆太复杂的依赖。
      </Callout>

      <h2>三、KeepAlive：缓存组件实例</h2>
      <p>
        默认情况下，组件被切走（如 Tab 切换、路由离开）就会被<strong>销毁</strong>，再切回来要重新创建，
        滚动位置、表单输入、已加载的数据全丢了。用 <code>KeepAlive</code> 包裹动态组件，
        切走的实例会被<strong>缓存而非销毁</strong>，切回来时原样恢复。
      </p>
      <CodeBlock lang="vue" title="KeepAlive 与 include / exclude / max" code={keepAliveSnippet} />
      <p>
        通过 <code>include</code> / <code>exclude</code>（按组件 <code>name</code> 匹配）控制哪些被缓存，
        <code>max</code> 限制最多缓存几个实例（按 LRU 淘汰最久未用的）。
      </p>
      <h3>3.1 onActivated / onDeactivated</h3>
      <p>
        被缓存的组件不会触发 <code>onUnmounted</code>（因为它没被销毁），所以「切走时清理、切回时恢复」
        这类逻辑要改用专门的一对钩子：<code>onActivated</code>（每次进入/切回时调用）与
        <code>onDeactivated</code>（每次切走/被缓存时调用）。典型用途是定时器和轮询的启停。
      </p>
      <CodeBlock lang="vue" title="缓存组件的激活钩子" code={activatedSnippet} />

      <h2>四、自定义指令</h2>
      <p>
        当你需要对<strong>底层 DOM 元素</strong>做可复用的直接操作（聚焦、设置样式、绑定第三方 DOM 库），
        自定义指令是合适的工具。它本质是一个带<strong>生命周期钩子</strong>的对象，钩子在元素的
        不同阶段被调用：
      </p>
      <table>
        <thead>
          <tr><th>钩子</th><th>调用时机</th></tr>
        </thead>
        <tbody>
          <tr><td><code>created</code></td><td>元素属性/事件绑定前</td></tr>
          <tr><td><code>beforeMount</code></td><td>元素插入 DOM 前</td></tr>
          <tr><td><code>mounted</code></td><td>元素插入 DOM 后（最常用）</td></tr>
          <tr><td><code>beforeUpdate</code></td><td>所在组件更新前</td></tr>
          <tr><td><code>updated</code></td><td>所在组件更新后</td></tr>
          <tr><td><code>beforeUnmount</code> / <code>unmounted</code></td><td>元素卸载前 / 后</td></tr>
        </tbody>
      </table>
      <p>
        在 <code>{'<script setup>'}</code> 里，任何以 <code>v</code> 开头的驼峰命名变量（如
        <code>vFocus</code>）都会自动成为模板里可用的 <code>v-focus</code> 指令；
        也可以用 <code>app.directive()</code> 全局注册。
      </p>
      <CodeBlock lang="vue" title="局部自定义指令 v-focus" code={directiveSnippet} />
      <CodeBlock lang="js" title="全局注册指令（含带参数的 v-color）" code={directiveGlobalSnippet} />
      <Callout variant="tip" title="优先用组件，指令用于 DOM 级操作">
        大多数复用应该用组件或 composable 解决。只有「必须直接摸 DOM」时才用自定义指令，
        比如自动聚焦、滚动到底加载、集成一个基于 DOM 节点的第三方库。
      </Callout>

      <h2>五、组合式函数 composable：逻辑复用的主角</h2>
      <KeyIdea>
        组合式函数（composable）是一个<strong>以 use 开头的普通函数</strong>，
        它内部使用组合式 API（<code>ref</code>、<code>computed</code>、生命周期钩子等）把<strong>有状态的逻辑</strong>
        封装起来，供多个组件复用。它就是 Vue 版的「自定义 Hook」。
      </KeyIdea>
      <p>
        关键点有三：其一，命名约定以 <code>use</code> 开头，一眼可辨；
        其二，它返回响应式状态（和操作方法），由调用方解构使用；
        其三，每个组件调用它都会得到<strong>独立的一份状态</strong>，互不干扰。
        composable 里照样能用 <code>onMounted</code> 等生命周期钩子，它们会自动绑定到调用它的那个组件。
      </p>

      <h3>5.1 完整例子：useMouse</h3>
      <p>把「追踪鼠标坐标」这段有状态逻辑抽成 composable：</p>
      <CodeBlock lang="js" title="composables/useMouse.js" code={useMouseSnippet} />
      <CodeBlock lang="vue" title="在组件中使用 useMouse" code={useMouseUsageSnippet} />

      <h3>5.2 完整例子：useFetch</h3>
      <p>
        更实用的是把「发请求 + loading + error」三态封装起来。下面的 <code>useFetch</code> 接受
        ref / getter / 普通值，用 <code>toValue</code> 统一取值，并用 <code>watchEffect</code>
        在 URL 变化时自动重新请求：
      </p>
      <CodeBlock lang="js" title="composables/useFetch.js" code={useFetchSnippet} />
      <CodeBlock lang="vue" title="在组件中使用 useFetch" code={useFetchUsageSnippet} />
      <Example title="composable 的两大好处">
        <p>
          <strong>逻辑聚合</strong>：一个功能（如鼠标追踪、数据请求）的状态、副作用、清理逻辑都集中在
          一个函数里，而不是散落在 <code>data</code> / <code>methods</code> / <code>mounted</code> 各处。
        </p>
        <p>
          <strong>透明复用</strong>：组件里写 <code>const {'{ x, y }'} = useMouse()</code>，
          一眼就知道 <code>x</code>、<code>y</code> 从哪来。换十个组件都这么写，来源始终清晰。
        </p>
      </Example>

      <h2>六、为什么 composable 取代了 mixin</h2>
      <p>
        Vue 2 时代用 <strong>mixin</strong> 复用逻辑：把 <code>data</code> / <code>methods</code> /
        生命周期混入组件。它能用，但有三个老毛病：
      </p>
      <CodeBlock lang="js" title="mixin 的写法（对比用）" code={mixinSnippet} />
      <ul>
        <li>
          <strong>来源不透明</strong>：组件模板里用到 <code>x</code>，却看不出它来自哪个 mixin，
          要翻遍所有 mixin 才知道。composable 是显式解构，来源一目了然。
        </li>
        <li>
          <strong>命名冲突</strong>：两个 mixin 都定义了 <code>update</code> 或 <code>x</code>，
          会静默互相覆盖。composable 返回的是普通变量，你解构时可随意重命名（<code>const {'{ x: mouseX }'}</code>）。
        </li>
        <li>
          <strong>难以组合</strong>：mixin 之间的依赖关系隐晦。composable 就是普通函数调用，
          一个 composable 里可以再调另一个，组合关系清清楚楚。
        </li>
      </ul>
      <table>
        <thead>
          <tr><th>对比项</th><th>mixin（Vue 2）</th><th>composable（Vue 3）</th></tr>
        </thead>
        <tbody>
          <tr><td>来源</td><td>不透明，需翻查</td><td>显式解构，一目了然</td></tr>
          <tr><td>命名冲突</td><td>静默覆盖</td><td>可自由重命名，无冲突</td></tr>
          <tr><td>组合</td><td>依赖隐晦</td><td>普通函数嵌套调用，清晰</td></tr>
          <tr><td>类型支持</td><td>弱</td><td>天然友好（就是函数返回值）</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="结论">
        Vue 3 官方推荐<strong>用 composable 替代 mixin</strong>。新项目里基本不再写 mixin，
        所有有状态的逻辑复用都交给 <code>use*</code> 函数。
      </Callout>

      <h2>七、小结与边界</h2>
      <p>
        这一章的工具各司其职：<code>Teleport</code> 管「渲染位置」，<code>Suspense</code> 管「异步加载态」，
        <code>KeepAlive</code> 管「实例缓存」，自定义指令管「DOM 级复用」，
        composable 管「有状态逻辑的复用」。选型时记住优先级：<strong>能用组件解决就用组件，
        逻辑复用首选 composable，只有必须直接操作 DOM 才上自定义指令</strong>。
        Teleport / Suspense / KeepAlive 则是遇到对应场景时的标准答案。
      </p>

      <Summary
        points={[
          'Teleport 把模板渲染到 DOM 树的别处（常用 body），解决模态框/通知被父级 overflow 裁切与 z-index 层叠的问题；逻辑仍属当前组件。',
          'Suspense 等待异步组件或带顶层 await 的异步 setup，用 #default / #fallback 两个插槽协调加载态；2026 年仍标注为实验性。',
          'KeepAlive 缓存而非销毁切走的组件实例，保留其状态；用 include/exclude/max 控制缓存，配 onActivated / onDeactivated 做启停清理。',
          '自定义指令是带生命周期钩子（mounted/updated 等）的对象，用于 DOM 级复用（v-focus 等）；script setup 里 vXxx 即可，或 app.directive 全局注册。',
          'composable 是以 use 开头的函数，封装有状态逻辑供复用（Vue 版自定义 Hook）；每次调用得到独立状态，可用生命周期钩子。useMouse、useFetch 是典型例子。',
          'composable 取代 mixin：来源透明、可重命名避免冲突、组合关系清晰、类型友好，是 Vue 3 逻辑复用的首选。',
        ]}
      />
    </article>
  )
}
