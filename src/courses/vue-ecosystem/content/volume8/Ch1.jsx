import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const computedSnippet = `<script setup>
import { ref, computed } from 'vue'

const list = ref([/* 上千条记录 */])
const keyword = ref('')

// 不好：把过滤写在模板里，每次重渲染都重算一遍
// <li v-for="x in list.filter(i => i.name.includes(keyword))">

// 好：computed 会缓存，只有依赖（list / keyword）变了才重算
const filtered = computed(() =>
  list.value.filter((i) => i.name.includes(keyword.value))
)
</script>

<template>
  <li v-for="x in filtered" :key="x.id">{{ x.name }}</li>
</template>`

const keySnippet = `<!-- 反例：用数组下标当 key，插入/删除会让 Vue 错位复用 DOM -->
<li v-for="(item, i) in list" :key="i">{{ item.name }}</li>

<!-- 正例：用稳定且唯一的业务 id 当 key -->
<li v-for="item in list" :key="item.id">{{ item.name }}</li>`

const onceMemoSnippet = `<template>
  <!-- v-once：内容只渲染一次，之后永远不再更新（适合纯静态、不会变的块） -->
  <header v-once>
    <h1>{{ siteTitle }}</h1>
    <p>构建时间：{{ buildTime }}</p>
  </header>

  <!-- v-memo：依赖数组不变就整块跳过 diff（适合大列表里的行） -->
  <div
    v-for="item in list"
    :key="item.id"
    v-memo="[item.id, item.selected]"
  >
    <!-- 只有 id 或 selected 变化时，这一行才重新渲染 -->
    <span>{{ item.name }}</span>
    <strong v-if="item.selected">已选中</strong>
  </div>
</template>`

const showIfSnippet = `<template>
  <!-- v-if：条件为假时元素根本不在 DOM 里；切换有创建/销毁成本 -->
  <HeavyChart v-if="tab === 'chart'" />

  <!-- v-show：始终渲染，只切换 CSS display；切换便宜但首屏有成本 -->
  <HeavyChart v-show="tab === 'chart'" />
</template>

<!--
  经验法则：
  - 频繁来回切换（如 Tab、折叠面板） -> v-show
  - 条件很少改变、或初次可能根本用不到 -> v-if（省掉首次渲染）
-->`

const asyncSnippet = `<script setup>
import { defineAsyncComponent } from 'vue'

// 基础用法：组件被用到时才发请求加载对应 chunk
const Chart = defineAsyncComponent(() =>
  import('./components/HeavyChart.vue')
)

// 进阶用法：配 loading / error / 超时
const Editor = defineAsyncComponent({
  loader: () => import('./components/RichEditor.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: LoadError,
  delay: 200,      // 多久后才显示 loading，避免闪烁
  timeout: 8000,   // 超过则判定为失败
})
</script>`

const suspenseSnippet = `<template>
  <!-- Suspense 等异步组件 / 异步 setup 就绪，期间显示 fallback -->
  <Suspense>
    <template #default>
      <Chart />
    </template>
    <template #fallback>
      <p>图表加载中...</p>
    </template>
  </Suspense>
</template>`

const routeLazySnippet = `// 路由懒加载：每个路由组件被切到时才加载，首屏不必背着全站代码
const routes = [
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/report', component: () => import('@/views/Report.vue') },
  { path: '/admin', component: () => import('@/views/Admin.vue') },
]`

const virtualSnippet = `<script setup>
// vue-virtual-scroller：只渲染可视区内的若干行，列表再长 DOM 节点数也恒定
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const items = ref(bigList) // 假设 5 万条
</script>

<template>
  <RecycleScroller
    class="scroller"
    :items="items"
    :item-size="48"
    key-field="id"
    v-slot="{ item }"
  >
    <div class="row">{{ item.name }}</div>
  </RecycleScroller>
</template>

<style>
.scroller { height: 100%; }
</style>`

const shallowSnippet = `<script setup>
import { ref, shallowRef, markRaw } from 'vue'

// 普通 ref：深度响应，整棵对象树都被 Proxy 包裹，大对象代价高
const heavy = ref(bigNestedObject)

// shallowRef：只有 .value 整体替换才触发更新，内部不做深度追踪
const chart = shallowRef(null)
function setData(d) {
  // 整体替换才更新视图（适合图表实例、整块快照数据）
  chart.value = { ...chart.value, data: d }
}

// markRaw：永久标记某对象「不需要响应式」，常用于第三方实例
import { Chart as ChartJS } from 'chart.js'
const instance = markRaw(new ChartJS(/* ... */))
</script>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        页面卡顿、列表滚动掉帧、切换 Tab 一顿一顿——这些都是性能问题，但性能优化最忌讳的就是
        「凭感觉乱改」。这一章我们走一条清晰的主线：<strong>先定位、再优化</strong>。
        先用 Vue DevTools 找到真正慢的那块，再针对性地祭出 <code>computed</code> 缓存、
        合理的 <code>:key</code>、<code>v-once</code> / <code>v-memo</code>、异步组件懒加载、
        长列表虚拟化，以及 <code>shallowRef</code> / <code>markRaw</code> 这些手段。
        每一招都对应一类具体「症状」，而不是无差别堆上去。
      </Lead>

      <h2>一、铁律：先定位，再优化</h2>
      <KeyIdea>
        性能优化的第一步永远是<strong>测量</strong>，不是改代码。在没有定位到瓶颈之前就动手，
        多半是在没问题的地方花力气，还可能把代码搞复杂。先用工具找到「到底哪个组件、哪一步慢」，
        再决定用哪种手段。
      </KeyIdea>
      <p>
        Vue 官方提供了 Vue DevTools 浏览器扩展，里面有两个面板对定位渲染问题特别有用：
      </p>
      <ul>
        <li>
          <strong>组件渲染高亮</strong>：开启后，每当某个组件重新渲染，它在页面上的区域会闪一下边框。
          如果你只是敲了个无关的输入框，结果半个页面都在闪，说明有大量组件被<strong>无意义地连带重渲染</strong>了。
        </li>
        <li>
          <strong>性能 / 时间线面板</strong>：可以记录一段交互，看到每个组件的渲染耗时、触发次数。
          哪个组件渲染次数离谱、单次耗时长，一目了然。
        </li>
      </ul>
      <p>
        除了 DevTools，浏览器自带的 Performance 面板（录制火焰图）能看到 JS 执行、布局、绘制的整体分布；
        Lighthouse 则给首屏加载、包体积层面的体检。<strong>定位清楚是「渲染太频繁」「单次渲染太重」
        还是「首屏加载太慢」，才能对症下药</strong>——这正是下面各节的分类依据。
      </p>

      <h2>二、减少重渲染的开销</h2>
      <h3>2.1 用 computed 缓存替代模板里的重复计算</h3>
      <p>
        模板里直接写 <code>list.filter(...)</code> 或 <code>arr.reduce(...)</code> 这类表达式，
        会在<strong>每一次重渲染</strong>时都重新算一遍——哪怕数据根本没变。而 <code>computed</code>
        会基于依赖做缓存：只有它依赖的响应式数据变了才重算，否则直接返回上次的结果。
      </p>
      <CodeBlock lang="vue" title="computed 缓存 vs 模板内联计算" code={computedSnippet} />
      <Callout variant="tip" title="方法 vs 计算属性">
        模板里调用 <code>{'{{ format(x) }}'}</code> 这样的方法每次渲染都会执行；
        而计算属性会缓存。需要「同样输入得同样输出且会被多次读取」的派生值时，优先用 <code>computed</code>。
      </Callout>

      <h3>2.2 给 v-for 一个稳定的 :key</h3>
      <p>
        <code>:key</code> 是 Vue 判断「列表里哪个节点是同一个」的依据。用数组下标当 key，
        一旦在中间插入或删除元素，后面所有元素的下标都变了，Vue 会错误地<strong>复用并就地修改 DOM</strong>，
        既可能渲染出错（比如输入框内容串位），又会做多余的更新。请始终用稳定且唯一的业务 <code>id</code>。
      </p>
      <CodeBlock lang="vue" title="错误的 key 与正确的 key" code={keySnippet} />

      <h3>2.3 v-once 与 v-memo：跳过不必要的更新</h3>
      <p>
        <code>v-once</code> 让一块内容<strong>只渲染一次</strong>，之后无论数据怎么变都不再更新——
        适合纯静态、确定不会变的区块（站点标题、构建时间等）。
        <code>v-memo</code> 则更灵活：给它一个依赖数组，<strong>数组里的值都没变就整块跳过 diff</strong>，
        特别适合大列表里的行——只有真正影响这一行显示的字段变了才重渲染。
      </p>
      <CodeBlock lang="vue" title="v-once 与 v-memo" code={onceMemoSnippet} />
      <Callout variant="warn" title="v-memo 是把双刃剑">
        <code>v-memo</code> 的依赖数组要列全所有「影响该块渲染的值」。漏列某个字段，
        该字段变化时界面不会更新，反而制造出难查的 bug。它只在「大列表 + 明确依赖」时才值得用，
        小列表别画蛇添足。
      </Callout>

      <h3>2.4 v-show vs v-if：频繁切换怎么选</h3>
      <p>
        两者都能控制元素显隐，但代价点不同。<code>v-if</code> 是<strong>真正的条件渲染</strong>：
        为假时元素压根不在 DOM 里，切换时要创建/销毁组件，初次不渲染因此首屏更省。
        <code>v-show</code> 则<strong>始终渲染</strong>，只是切换 CSS 的 <code>display</code>，
        切换极便宜但首屏要付出渲染成本。
      </p>
      <CodeBlock lang="vue" title="v-show 与 v-if 的取舍" code={showIfSnippet} />
      <table>
        <thead>
          <tr><th>对比项</th><th>v-if</th><th>v-show</th></tr>
        </thead>
        <tbody>
          <tr><td>条件为假时</td><td>不在 DOM 中</td><td>在 DOM 中，display:none</td></tr>
          <tr><td>切换成本</td><td>高（创建/销毁）</td><td>低（改 CSS）</td></tr>
          <tr><td>初次成本</td><td>低（可能不渲染）</td><td>高（一定渲染）</td></tr>
          <tr><td>适用</td><td>条件很少变、或可能用不到</td><td>频繁来回切换</td></tr>
        </tbody>
      </table>

      <h2>三、按需加载：异步组件与懒加载</h2>
      <h3>3.1 defineAsyncComponent 做组件级懒加载</h3>
      <p>
        不是所有组件都要在首屏就下载下来。<code>defineAsyncComponent</code> 接收一个返回
        动态 <code>import()</code> 的加载器，把这个组件单独打成一个 chunk，
        <strong>只有真正用到时才发请求加载</strong>。重型组件（富文本编辑器、图表、地图）尤其值得这么做。
      </p>
      <CodeBlock lang="vue" title="defineAsyncComponent 懒加载组件" code={asyncSnippet} />
      <p>
        进阶配置里可以指定 <code>loadingComponent</code>（加载中占位）、<code>errorComponent</code>
        （加载失败兜底）、<code>delay</code>（延迟多久才显示 loading，避免一闪而过）、
        <code>timeout</code>（超时判失败）。
      </p>

      <h3>3.2 Suspense 统一管理异步加载态</h3>
      <p>
        <code>Suspense</code> 是一个内置组件，用来「等待」其内部的异步组件或异步 <code>setup</code> 就绪。
        它有两个插槽：<code>#default</code> 放真正要显示的内容，<code>#fallback</code> 放等待期间的占位。
        异步内容一旦就绪，自动从 fallback 切到 default。
      </p>
      <CodeBlock lang="vue" title="Suspense 配 #default / #fallback" code={suspenseSnippet} />
      <Callout variant="note" title="下一章还会细讲 Suspense">
        这里先建立印象：异步组件解决「什么时候加载」，<code>Suspense</code> 解决「加载期间显示什么」。
        二者常配套使用。下一章我们会把 <code>Suspense</code> 的协调机制讲得更透。
      </Callout>

      <h3>3.3 回顾：路由懒加载</h3>
      <p>
        前面卷讲路由时已经见过：把路由的 <code>component</code> 写成返回动态 <code>import()</code> 的函数，
        每个页面就成了独立 chunk，访问到才加载。这是<strong>降低首屏体积最立竿见影</strong>的一招，
        与组件级懒加载是同一思路在路由层的应用。
      </p>
      <CodeBlock lang="js" title="路由懒加载（回顾）" code={routeLazySnippet} />

      <h2>四、长列表：虚拟化只渲染可视区</h2>
      <p>
        最典型的卡顿场景：一次性把上万条数据 <code>v-for</code> 渲染成上万个 DOM 节点。
        浏览器要为每个节点做布局和绘制，内存和滚动都会被拖垮。
        <strong>虚拟列表（virtual list）</strong>的核心思想是：屏幕上其实只能看到十几行，
        那就<strong>只渲染可视区内的那几行</strong>，滚动时动态替换内容、用占位撑起滚动条高度，
        让 DOM 节点数保持恒定（约等于可视行数），与数据总量无关。
      </p>
      <KeyIdea>
        虚拟列表的关键不在「数据多少」，而在「同时在 DOM 里的节点有多少」。
        只渲染可视区，1 万条和 100 万条对 DOM 而言几乎一样轻。
      </KeyIdea>
      <p>
        社区成熟方案是 <code>vue-virtual-scroller</code>（提供 <code>RecycleScroller</code> 等组件），
        它会回收并复用滚出可视区的行节点。你也可以理解其原理后自行实现，但生产中直接用现成库更稳。
      </p>
      <CodeBlock lang="vue" title="用 vue-virtual-scroller 渲染长列表" code={virtualSnippet} />

      <Example title="长列表卡顿 -> 虚拟列表 / v-memo 优化对照">
        <p>
          <strong>症状</strong>：一个 2 万行的表格，滚动明显掉帧，点击某行切换选中状态要卡半秒。
        </p>
        <p>
          <strong>诊断</strong>：DevTools 显示，每次点选都让全部 2 万行重渲染，且 DOM 里真的存在 2 万个节点。
        </p>
        <p>
          <strong>手段一（治本）</strong>：换成 <code>RecycleScroller</code> 虚拟列表，
          DOM 节点从 2 万降到几十个，滚动立刻顺滑。
        </p>
        <p>
          <strong>手段二（叠加）</strong>：给每行加
          <code>v-memo="[item.id, item.selected]"</code>，点选某行时只有那一行重渲染，
          其余行整块跳过。两招叠加后，点选从「卡半秒」变成「瞬时」。
        </p>
      </Example>

      <h2>五、别让响应式系统替你白干活</h2>
      <p>
        Vue 3 的响应式靠 Proxy 深度代理对象。对一个嵌套很深、字段很多的大对象用普通 <code>ref</code> /
        <code>reactive</code>，意味着整棵树都被包裹、被追踪——很多时候这些追踪根本用不上，纯属浪费。
        两个工具能帮你「关掉不需要的响应式」：
      </p>
      <ul>
        <li>
          <strong><code>shallowRef</code></strong>：只追踪 <code>.value</code> 的<strong>整体替换</strong>，
          不深入内部。适合图表实例、整块快照数据这类「要么整体换、要么不动」的值。
        </li>
        <li>
          <strong><code>markRaw</code></strong>：永久标记某对象「跳过响应式」，之后即使放进 reactive 也不会被代理。
          常用于第三方库实例（图表对象、地图实例、Web worker 句柄），它们本不该被 Vue 追踪。
        </li>
      </ul>
      <CodeBlock lang="vue" title="shallowRef 与 markRaw" code={shallowSnippet} />
      <Callout variant="warn" title="不要默认全用 shallow">
        浅层响应式意味着「改内部属性不会触发更新」。只有在确认该数据只会整体替换、
        或确实是性能瓶颈时才用 <code>shallowRef</code> / <code>markRaw</code>，否则会丢更新。
        这依然是「先定位、再优化」原则的延伸。
      </Callout>

      <h2>六、症状 → 手段速查表</h2>
      <p>把全章手段按「你观察到的症状」归一张表，方便实战时直接对号入座：</p>
      <table>
        <thead>
          <tr><th>症状</th><th>多半的原因</th><th>对应手段</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>敲个输入框，大片区域都在闪重渲染</td>
            <td>派生值在模板里现算、依赖耦合过广</td>
            <td>computed 缓存、拆分组件、v-memo</td>
          </tr>
          <tr>
            <td>列表增删后内容串位 / 多余更新</td>
            <td>用了下标当 key</td>
            <td>改用稳定的业务 id 作 :key</td>
          </tr>
          <tr>
            <td>Tab / 折叠面板切换一顿一顿</td>
            <td>频繁创建销毁重型组件</td>
            <td>v-show 替代 v-if</td>
          </tr>
          <tr>
            <td>首屏加载慢、包体积大</td>
            <td>所有组件/页面都打进首屏</td>
            <td>路由懒加载、defineAsyncComponent</td>
          </tr>
          <tr>
            <td>长列表滚动掉帧、内存高</td>
            <td>一次渲染上万个 DOM 节点</td>
            <td>虚拟列表（vue-virtual-scroller）+ v-memo</td>
          </tr>
          <tr>
            <td>持有大对象 / 第三方实例后整体变卡</td>
            <td>不必要的深度响应式追踪</td>
            <td>shallowRef、markRaw</td>
          </tr>
        </tbody>
      </table>

      <h2>七、边界与误区</h2>
      <p>
        最后提醒几个常见误区。其一，<strong>过早优化</strong>：小列表、低频交互根本不需要 v-memo /
        虚拟列表，强行加只会让代码难维护。其二，<strong>误判瓶颈</strong>：以为是渲染慢，
        实际是接口慢或数据处理慢——所以一定先测量。其三，<strong>滥用浅响应式</strong>导致丢更新，
        排查起来反而更费时间。性能优化是「拿复杂度换速度」的交易，只在测量证明值得时才做这笔交易。
      </p>

      <Summary
        points={[
          '铁律是先定位再优化：用 Vue DevTools 的组件渲染高亮与性能面板找到真正的瓶颈，别凭感觉乱改。',
          '减少重渲染：computed 缓存替代模板里的重复计算；v-for 用稳定业务 id 做 :key，别用下标。',
          'v-once 让块只渲染一次；v-memo 在依赖不变时整块跳过更新，适合大列表的行，但依赖数组要列全。',
          'v-show 适合频繁切换（只改 display），v-if 适合条件很少变或可能用不到（省首次渲染）。',
          '按需加载：defineAsyncComponent 做组件级懒加载、Suspense 管理加载态、路由懒加载降首屏体积。',
          '长列表用虚拟化（vue-virtual-scroller）只渲染可视区，DOM 节点数恒定；大对象/第三方实例用 shallowRef / markRaw 关掉多余响应式。',
        ]}
      />
    </article>
  )
}
