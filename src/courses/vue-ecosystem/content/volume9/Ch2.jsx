import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const counterComponentSnippet = `<!-- Counter.vue：我们要测试的目标组件 -->
<script setup>
import { ref } from 'vue'

const props = defineProps({ start: { type: Number, default: 0 } })
const count = ref(props.start)

function increment() {
  count.value++
}
</script>

<template>
  <div>
    <span class="count">{{ count }}</span>
    <button @click="increment">加一</button>
  </div>
</template>`

const vtuTestSnippet = `// Counter.spec.js —— 用 Vitest + Vue Test Utils 测试 Counter 组件
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('默认从 0 开始渲染', () => {
    const wrapper = mount(Counter)            // mount：完整挂载组件
    expect(wrapper.find('.count').text()).toBe('0')
  })

  it('接受 start prop 作为初始值', () => {
    const wrapper = mount(Counter, {
      props: { start: 10 },                   // 通过挂载选项传 props
    })
    expect(wrapper.find('.count').text()).toBe('10')
  })

  it('点击按钮后计数加一', async () => {
    const wrapper = mount(Counter)
    // trigger 触发事件；它返回 Promise，await 它以等 DOM 更新完成
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.count').text()).toBe('1')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.count').text()).toBe('2')  // 断言渲染结果
  })
})`

const findComponentSnippet = `// findComponent / shallowMount 常用法
import { mount, shallowMount } from '@vue/test-utils'
import Parent from './Parent.vue'
import Child from './Child.vue'

// shallowMount：把子组件「打桩」成占位符，只测当前组件自身逻辑，
// 不连带渲染整棵子树——隔离性更好、更快。
const wrapper = shallowMount(Parent)

// findComponent：按组件查找子组件实例，比按 CSS 选择器更稳
const child = wrapper.findComponent(Child)
expect(child.exists()).toBe(true)
expect(child.props('title')).toBe('你好')

// emitted：断言子组件触发了某个自定义事件
await child.vm.$emit('submit', { id: 1 })
expect(wrapper.emitted('submit')).toBeTruthy()`

const composableStoreSnippet = `// 测 composable：它就是个普通函数，直接调、断言返回值即可
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

it('useCounter 能自增', () => {
  const { count, inc } = useCounter()
  inc()
  expect(count.value).toBe(1)
})

// 测 Pinia store：在测试里 setActivePinia(createPinia()) 后照常用 store
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'

it('购物车能加商品', () => {
  setActivePinia(createPinia())   // 每个测试给一个干净的 Pinia 实例
  const cart = useCartStore()
  cart.add({ id: 1 })
  expect(cart.items.length).toBe(1)
})`

const migrationSnippet = `// Vue 2 → Vue 3：应用入口的破坏性变更
// —— Vue 2：用全局构造函数 new Vue
import Vue from 'vue'
import App from './App.vue'
new Vue({ render: h => h(App) }).$mount('#app')

// —— Vue 3：用 createApp，全局 API 挂在「应用实例」上而非全局 Vue
import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)
app.use(router)          // 插件、指令、组件都注册到 app 上
app.mount('#app')`

const optionsToCompositionSnippet = `<!-- 迁移思路：选项式 API 仍可用，但推荐逐步转向组合式 API -->
<!-- Vue 2 选项式：逻辑被拆进 data / methods -->
<script>
export default {
  data: () => ({ count: 0 }),
  methods: { inc() { this.count++ } },
}
</script>

<!-- Vue 3 组合式：相关逻辑聚在一起，更易复用 -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
const inc = () => count.value++
</script>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        恭喜你走到了最后一章。前面我们把 Vue 3 从语法、响应式、组件，一路讲到了路由、状态管理、
        SSR 与 Nuxt。这一章是<strong>收束卷</strong>：先补上工程化里绕不开的一块——
        <strong>测试</strong>，让你写的组件「可被验证」；再讲 <strong>Vue 2 → Vue 3 迁移</strong>，
        帮你看懂老项目；最后给出一张<strong>Vue 生态地图</strong>和一条进阶学习路径，把整门课
        串成一个完整的知识网络。
      </Lead>

      <h2>一、前端测试金字塔</h2>
      <p>
        「测试」不是一种东西，而是一组层次。经典的<strong>测试金字塔</strong>从下往上把测试分成三层，
        越往下越多、越快、越便宜；越往上越少、越慢、越接近真实用户。
      </p>
      <table>
        <thead>
          <tr>
            <th>层级</th>
            <th>测什么</th>
            <th>数量 / 速度</th>
            <th>典型工具</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>单元测试</strong>（底层，最多）</td>
            <td>单个函数 / composable / 组件的逻辑</td>
            <td>大量、毫秒级、最便宜</td>
            <td>Vitest + Vue Test Utils</td>
          </tr>
          <tr>
            <td><strong>集成测试</strong>（中层）</td>
            <td>多个组件 / 模块协作是否正确</td>
            <td>中等</td>
            <td>Vitest + VTU</td>
          </tr>
          <tr>
            <td><strong>端到端测试 E2E</strong>（顶层，最少）</td>
            <td>真浏览器里走完整用户流程</td>
            <td>少量、秒级、最贵</td>
            <td>Playwright / Cypress</td>
          </tr>
        </tbody>
      </table>
      <KeyIdea>
        测试金字塔的指导思想是：<strong>把绝大多数测试放在便宜、快速的底层（单元测试），
        顶层昂贵的 E2E 只覆盖最关键的几条用户主流程</strong>。倒过来写成「冰淇淋筒」
        （E2E 一大堆、单测寥寥）会让测试套件又慢又脆，得不偿失。
      </KeyIdea>

      <h2>二、用 Vitest + Vue Test Utils 测组件</h2>
      <p>
        在 Vue 生态里，单元测试的黄金组合是 <strong>Vitest</strong>（测试运行器，与 Vite
        共享配置、原生支持 ESM 和 TypeScript、启动飞快）加上 <strong>Vue Test Utils（VTU）</strong>
        （官方组件测试库，提供挂载组件、查询 DOM、触发事件的工具）。先看要测的组件：
      </p>
      <CodeBlock lang="vue" title="Counter.vue：被测组件" code={counterComponentSnippet} />
      <p>VTU 的核心 API 不多，记住这几个就能覆盖大部分场景：</p>
      <ul>
        <li>
          <code>mount</code>：完整挂载组件（连同子组件一起渲染），返回一个
          <code>wrapper</code> 包装对象。
        </li>
        <li>
          <code>shallowMount</code>：浅挂载，把子组件「打桩」成占位符，只测当前组件自身——隔离更彻底、更快。
        </li>
        <li>
          <code>wrapper.find('.count')</code> / <code>findComponent</code>：按 CSS 选择器 / 按组件查找节点或子组件。
        </li>
        <li>
          <code>trigger('click')</code>：触发 DOM 事件；它返回 Promise，要 <code>await</code> 它以等待 DOM 更新。
        </li>
        <li>
          <code>text()</code> / <code>props()</code> / <code>emitted()</code>：读取渲染文本、读 props、断言触发过的自定义事件。
        </li>
      </ul>
      <CodeBlock lang="js" title="用 mount + trigger 测计数器组件" code={vtuTestSnippet} />
      <Callout variant="warn" title="trigger 之后一定要 await">
        Vue 的 DOM 更新是<strong>异步</strong>的。调用 <code>trigger</code> 改了状态后，
        DOM 不会立刻更新。必须 <code>await wrapper.find('button').trigger('click')</code>
        （或 <code>await wrapper.vm.$nextTick()</code>）等一帧，再去断言渲染结果——
        忘了 await 是新手最常见的「测试明明对了却报错」的原因。
      </Callout>
      <CodeBlock lang="js" title="shallowMount 与 findComponent" code={findComponentSnippet} />

      <h3>测 composable 与 Pinia store</h3>
      <p>
        <strong>composable 本质就是普通函数</strong>，直接调用、断言它返回的 <code>ref</code>
        / 方法即可，不必挂载组件；测 <strong>Pinia store</strong> 时，先在测试里
        <code>setActivePinia(createPinia())</code> 装一个干净的 Pinia 实例，再像平时一样
        用 store 的 state、getter、action 做断言。
      </p>
      <CodeBlock lang="js" title="测 composable 与 Pinia store（各一例）" code={composableStoreSnippet} />

      <h3>端到端测试（E2E）一句话</h3>
      <p>
        当你需要验证「真用户在真浏览器里点一遍流程」是否走得通，就用
        <strong>Playwright</strong> 或 <strong>Cypress</strong>——它们启动真实浏览器、
        模拟点击输入、断言页面跳转与最终结果，覆盖单测够不着的整链路，但慢且贵，所以只留给关键主流程。
      </p>

      <h2>三、Vue 2 → Vue 3 迁移要点</h2>
      <p>
        你接手的老项目很可能还是 Vue 2。Vue 3 总体兼容选项式 API，迁移不必推倒重来，但有几处
        <strong>破坏性变更</strong>必须心里有数。最该先掌握的方向，是从选项式逐步转向
        <strong>组合式 API</strong>——逻辑按「关心点」聚合，复用更顺。
      </p>
      <CodeBlock lang="vue" title="迁移方向：选项式 → 组合式 API" code={optionsToCompositionSnippet} />
      <p>下面是迁移时最常撞上的破坏性变更清单：</p>
      <table>
        <thead>
          <tr>
            <th>主题</th>
            <th>Vue 2</th>
            <th>Vue 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>应用创建</td>
            <td><code>new Vue(...)</code> 全局构造</td>
            <td><code>createApp(App)</code>，全局 API 挂到应用实例</td>
          </tr>
          <tr>
            <td>v-model</td>
            <td>默认 prop <code>value</code> + 事件 <code>input</code></td>
            <td>默认 prop <code>modelValue</code> + 事件 <code>update:modelValue</code>，支持多个 v-model</td>
          </tr>
          <tr>
            <td>过滤器 filters</td>
            <td><code>{'{{ msg | capitalize }}'}</code></td>
            <td><strong>已移除</strong>，改用方法或计算属性</td>
          </tr>
          <tr>
            <td>生命周期改名</td>
            <td><code>beforeDestroy</code> / <code>destroyed</code></td>
            <td><code>beforeUnmount</code> / <code>unmounted</code></td>
          </tr>
          <tr>
            <td>状态管理</td>
            <td>Vuex</td>
            <td>推荐 <strong>Pinia</strong>（更简洁、TS 友好、无 mutation）</td>
          </tr>
          <tr>
            <td>多根节点</td>
            <td>模板只能有一个根节点</td>
            <td>支持<strong>多根节点</strong>（Fragment）</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock lang="js" title="入口写法的破坏性变更：new Vue → createApp" code={migrationSnippet} />
      <Callout variant="tip" title="迁移建议：渐进而非重写">
        Vue 官方提供「迁移构建版本」可在 Vue 3 里兼容大量 Vue 2 写法，让你<strong>逐文件</strong>
        升级而不是一次性重写。务实顺序是：先升到能跑起来 → 逐个修破坏性变更（filters、生命周期名、
        v-model）→ 把 Vuex 迁到 Pinia → 最后按需把选项式重构成组合式。别追求一步到位。
      </Callout>

      <h2>四、Vue 生态地图</h2>
      <p>
        我们这门课走过的工具，可以拼成一张「Vue 全家桶」地图。每个方向都有一两个事实标准，
        记住它们，你就知道「遇到某类需求该去找谁」。
      </p>
      <table>
        <thead>
          <tr>
            <th>方向</th>
            <th>事实标准 / 推荐</th>
            <th>解决什么</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>构建工具</td>
            <td><strong>Vite</strong></td>
            <td>极速开发服务器、打包、HMR</td>
          </tr>
          <tr>
            <td>状态管理</td>
            <td><strong>Pinia</strong></td>
            <td>跨组件共享状态，Vuex 的官方继任者</td>
          </tr>
          <tr>
            <td>路由</td>
            <td><strong>Vue Router</strong></td>
            <td>单页应用的页面导航</td>
          </tr>
          <tr>
            <td>全栈 / SSR</td>
            <td><strong>Nuxt</strong></td>
            <td>服务端渲染、文件路由、全栈能力</td>
          </tr>
          <tr>
            <td>UI 组件库</td>
            <td><strong>Element Plus</strong> / Naive UI / Vuetify</td>
            <td>现成的高质量组件，少造轮子</td>
          </tr>
          <tr>
            <td>测试</td>
            <td><strong>Vitest + Vue Test Utils</strong>；E2E 用 <strong>Playwright</strong></td>
            <td>单元 / 组件测试与端到端测试</td>
          </tr>
          <tr>
            <td>实用工具集</td>
            <td><strong>VueUse</strong></td>
            <td>上百个开箱即用的组合式工具函数</td>
          </tr>
        </tbody>
      </table>
      <Example title="把地图当「查询表」用">
        <p>
          实战中遇到需求，先在地图上定位：要做后台管理界面 → Element Plus；
          要共享登录态 → Pinia；要监听鼠标 / 防抖 / 本地存储 → 先翻 VueUse 有没有现成的；
          要给组件加测试 → Vitest + VTU；要做能被收录的官网 → Nuxt。
          <strong>先找生态里的事实标准，再考虑自己造轮子</strong>，是 Vue 工程化的基本素养。
        </p>
      </Example>

      <h2>五、一条进阶学习路径</h2>
      <p>
        学完这门课，下一步往哪走？给你一条务实的递进路线：
      </p>
      <ul>
        <li>
          <strong>第一步，夯实基本功</strong>：把组合式 API、响应式原理（<code>ref</code> /
          <code>reactive</code> / <code>computed</code> / <code>watch</code>）和组件通信彻底练熟，
          这是一切的地基。
        </li>
        <li>
          <strong>第二步，吃透工程化全家桶</strong>：在真实项目里把 Vite + Vue Router + Pinia
          串起来，配上 VueUse 提效。
        </li>
        <li>
          <strong>第三步，补齐质量与类型</strong>：给组件写 Vitest + VTU 测试，全程用 TypeScript，
          养成「可验证、可维护」的习惯。
        </li>
        <li>
          <strong>第四步，进军全栈与 SSR</strong>：用 Nuxt 做一个需要 SEO 的真实站点，
          理解 SSR / SSG / 注水的取舍。
        </li>
        <li>
          <strong>第五步，深入与回馈</strong>：读 Vue 源码或官方 RFC 理解设计取舍，
          尝试给开源库提 issue / PR，把「使用者」升级成「贡献者」。
        </li>
      </ul>
      <Callout variant="tip" title="最重要的一条">
        框架会更新、工具会更替，但<strong>组件化思维、响应式数据流、声明式 UI</strong>
        这些核心心智是稳定的。把原理学透，换任何框架你都能快速上手——这也是这门课从头到尾
        想传递给你的东西。
      </Callout>

      <h2>六、全课收束</h2>
      <p>
        从第一卷的模板语法，到响应式系统、组件与组合式 API，再到路由、状态管理、SSR / Nuxt，
        最后是测试与迁移——你已经拥有了一套<strong>完整的 Vue 3 现代开发能力</strong>。
        剩下的，就是去写、去踩坑、去查文档、去读别人的代码。祝你写得开心。
      </p>

      <Summary
        points={[
          '测试金字塔：底层单元测试最多最快（Vitest + Vue Test Utils），顶层 E2E 最少最贵（Playwright / Cypress），别写成头重脚轻的「冰淇淋筒」。',
          'Vitest + VTU 测组件核心 API：mount / shallowMount 挂载、find / findComponent 查询、trigger 触发事件（记得 await）、text / props / emitted 断言。',
          'composable 是普通函数直接调用断言；测 Pinia store 先 setActivePinia(createPinia()) 给干净实例再照常用。',
          'Vue 2 → 3 破坏性变更：createApp 取代 new Vue、v-model 改用 modelValue/update:modelValue、filters 移除、生命周期改名（beforeUnmount/unmounted）、Vuex 迁 Pinia；推荐渐进迁移并转向组合式 API。',
          'Vue 生态地图：构建 Vite、状态 Pinia、路由 Vue Router、全栈 Nuxt、UI 库 Element Plus/Naive/Vuetify、测试 Vitest+VTU/Playwright、工具集 VueUse。',
          '进阶路径：夯实组合式 API 与响应式 → 工程化全家桶 → 测试与 TS → Nuxt 全栈 → 读源码与回馈社区；核心心智（组件化、响应式、声明式 UI）比具体框架更值得长期投资。',
        ]}
      />
    </article>
  )
}
