import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const optionsApiSnippet = `<script>
// 选项式 API：同一个「搜索」逻辑被拆散到三个选项里
export default {
  data() {
    return {
      keyword: '',          // 状态在 data
      results: [],
    }
  },
  computed: {
    hasResult() {           // 派生在 computed
      return this.results.length > 0
    },
  },
  methods: {
    search() {              // 行为在 methods
      this.results = doSearch(this.keyword)
    },
  },
  mounted() {               // 生命周期又在别处
    this.search()
  },
}
<\/script>`

const composableSnippet = `<script setup>
// 组合式 API：同一个逻辑关注点聚到一起
import { ref, computed, onMounted } from 'vue'

const keyword = ref('')
const results = ref([])

const hasResult = computed(() => results.value.length > 0)

function search() {
  results.value = doSearch(keyword.value)
}

onMounted(search)
<\/script>`

const setupReturnSnippet = `<script>
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)
    function increment() {
      count.value++
    }
    // 必须显式 return，模板才能用到 count 和 increment
    return { count, increment }
  },
}
<\/script>`

const scriptSetupSnippet = `<script setup>
import { ref } from 'vue'

// 顶层声明的变量与函数「自动」暴露给模板，无需 return
const count = ref(0)
function increment() {
  count.value++
}
<\/script>

<template>
  <button @click="increment">点击了 {{ count }} 次</button>
</template>`

const refBasicSnippet = `import { ref } from 'vue'

const count = ref(0)

// 在 JS / <script> 里，必须通过 .value 读写
console.log(count.value)   // 0
count.value++
console.log(count.value)   // 1

// 在 <template> 里，Vue 自动解包，直接写 count 即可
// <span>{{ count }}</span>  ——  不用写 count.value`

const reactiveBasicSnippet = `import { reactive } from 'vue'

const user = reactive({
  name: 'Ada',
  age: 30,
  address: { city: 'Hangzhou' },
})

// 直接像普通对象一样读写，不需要 .value
user.age++
user.address.city = 'Shanghai'   // 嵌套对象也是响应式的（深层代理）`

const reactivePitfallSnippet = `import { reactive } from 'vue'

let state = reactive({ count: 0 })

// 坑一：整体替换会丢响应性
// 下面这行让 state 指向一个全新的普通对象，原代理被丢弃，
// 模板仍引用着旧代理，界面不再更新
state = { count: 100 }   // 错误做法

// 坑二：解构会丢响应性
const { count } = state  // count 只是一个普通数字 0 的拷贝
// 之后改 count 不会触发更新，改 state.count 也不会反映到 count`

const toRefsSnippet = `import { reactive, toRefs, toRef } from 'vue'

const state = reactive({ count: 0, name: 'Ada' })

// toRefs：把 reactive 对象的每个属性都转成 ref，
// 解构后仍与源对象保持「双向」的响应式连接
const { count, name } = toRefs(state)
count.value++            // 等价于 state.count++
console.log(state.count) // 1

// toRef：只取单个属性，转成一个与源相连的 ref
const onlyCount = toRef(state, 'count')
onlyCount.value = 5
console.log(state.count) // 5`

const counterExample = `<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}
function reset() {
  count.value = 0
}
<\/script>

<template>
  <p>当前：{{ count }}，翻倍：{{ double }}</p>
  <button @click="increment">+1</button>
  <button @click="reset">重置</button>
</template>`

const userObjectExample = `<script setup>
import { reactive, toRefs } from 'vue'

const user = reactive({
  name: 'Ada',
  age: 30,
  profile: { city: 'Hangzhou', bio: '前端工程师' },
})

function haveBirthday() {
  user.age++                 // 直接改属性，响应式保留
}
function moveTo(city) {
  user.profile.city = city   // 嵌套属性同样响应
}

// 需要在模板里解构使用时，用 toRefs 保住响应性
const { name, age } = toRefs(user)
<\/script>

<template>
  <p>{{ name }}（{{ age }} 岁）住在 {{ user.profile.city }}</p>
  <button @click="haveBirthday">过生日</button>
  <button @click="moveTo('Shanghai')">搬到上海</button>
</template>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Vue 3 带来的最大变化之一，是引入了<strong>组合式 API（Composition API）</strong>。
        它不是要取代你熟悉的选项式 API，而是给出另一种组织组件逻辑的方式——按「逻辑关注点」
        聚合，而不是按「选项种类」拆散。这一章我们从「它到底解决了什么问题」讲起，
        把 <code>setup</code>、<code>{'<script setup>'}</code> 语法糖、以及两块响应式基石
        <code>ref</code> 与 <code>reactive</code> 一次讲透，再用计数器和用户对象两个例子落到代码上。
      </Lead>

      <h2>一、组合式 API 解决了什么问题</h2>
      <p>
        在选项式 API 里，一个组件被切成 <code>data</code>、<code>methods</code>、
        <code>computed</code>、<code>watch</code>、生命周期钩子等若干「选项」。代码<strong>按种类</strong>
        归类：所有状态堆在 <code>data</code>，所有方法堆在 <code>methods</code>。组件小的时候很清晰，
        可一旦逻辑变多，同一个功能的碎片就会被强行打散到好几个选项里。
      </p>
      <p>
        想象一个组件同时管「搜索」和「分页」两件事。选项式写法下，搜索用到的状态、计算属性、方法、
        生命周期会分别落进 <code>data</code> / <code>computed</code> / <code>methods</code> /
        <code>mounted</code>；分页的那一套也一样。结果是：要读懂「搜索」这一个功能，你的视线得在
        文件里上下跳好几次。功能越多，跳得越远。
      </p>
      <CodeBlock lang="vue" title="选项式：一个逻辑被拆到四个选项" code={optionsApiSnippet} />
      <KeyIdea>
        组合式 API 的核心主张是：<strong>按逻辑关注点（logical concern）组织代码，而非按选项种类。</strong>
        同一个功能用到的状态、派生、方法、副作用可以写在一起、挨在一起读，
        还能整段抽成可复用的函数（组合式函数 / composable）在多个组件间共享。
      </KeyIdea>
      <p>
        把上面的例子换成组合式写法，「搜索」相关的一切就聚成连续的一段，读起来是顺的；
        如果项目里别处也要用，把这段抽成一个 <code>useSearch()</code> 函数即可直接复用——
        这是选项式时代靠 mixin 很难干净做到的事（mixin 容易命名冲突、来源不清）。
      </p>
      <CodeBlock lang="vue" title="组合式：同一逻辑聚在一起" code={composableSnippet} />

      <h2>二、setup 与 {'<script setup>'} 语法糖</h2>
      <p>
        组合式 API 的代码要写在一个叫 <code>setup</code> 的入口里。最原始的形态是在选项对象里写一个
        <code>setup()</code> 函数：在里面创建响应式状态、定义函数，最后<strong>显式 return</strong>
        一个对象，模板才能用到这些东西。
      </p>
      <CodeBlock lang="vue" title="原始 setup()：必须手动 return" code={setupReturnSnippet} />
      <p>
        这种写法有个明显的累赘：每加一个变量或函数，都得记着去 <code>return</code> 里补一笔，
        否则模板里用不到。于是 Vue 提供了编译期语法糖 <code>{'<script setup>'}</code>——
        在 <code>{'<script setup>'}</code> 块里，<strong>顶层声明的变量、函数、import 进来的组件，
        统统自动暴露给模板</strong>，再也不用写 return。
      </p>
      <CodeBlock lang="vue" title="<script setup>：顶层声明自动暴露" code={scriptSetupSnippet} />
      <Callout variant="tip" title="实战默认用 <script setup>">
        除非有特殊需要，单文件组件里几乎总是用 <code>{'<script setup>'}</code>：代码更少、
        类型推断更好、运行时开销更小。本课程后续示例若无特别说明，都默认这种写法。
      </Callout>

      <h2>三、ref：包装任意值</h2>
      <p>
        <code>ref</code> 接收一个值，返回一个带 <code>.value</code> 属性的<strong>响应式引用对象</strong>。
        它能包装任意类型——数字、字符串、布尔、对象、数组都行。规则只有一条但很关键：
        在 JS / <code>{'<script>'}</code> 里读写要带 <code>.value</code>，而在
        <code>{'<template>'}</code> 里 Vue 会<strong>自动解包</strong>，直接写名字即可。
      </p>
      <CodeBlock lang="js" title="ref 的读写规则" code={refBasicSnippet} />
      <p>
        为什么是 <code>.value</code> 这么个略显啰嗦的设计？因为 JavaScript 的基本类型值
        （数字、字符串等）是<strong>按值传递</strong>的，没法被代理、也无法在被传来传去时还保持
        「同一个响应式源」。Vue 的办法是：用一个对象把值「装」进去，对这个对象的
        <code>.value</code> 的读取与赋值就能被拦截，从而建立依赖追踪与触发更新。
      </p>
      <KeyIdea>
        基本类型必须用 <code>ref</code>，正是因为 <code>reactive</code> 底层依赖 ES6 的
        <code>Proxy</code>，而 <code>Proxy</code> <strong>只能代理对象</strong>，无法代理
        数字、字符串这类原始值。<code>ref</code> 用「对象包一层 + 拦截 .value」绕开了这个限制。
      </KeyIdea>

      <h2>四、reactive：代理对象</h2>
      <p>
        <code>reactive</code> 接收一个对象（或数组、Map、Set），返回它的<strong>响应式代理</strong>。
        访问代理上的属性时不需要 <code>.value</code>，直接像普通对象一样读写；嵌套的对象也会被
        递归地转成响应式（深层代理）。
      </p>
      <CodeBlock lang="js" title="reactive 代理一个对象" code={reactiveBasicSnippet} />
      <p>
        但 <code>reactive</code> 有两个新手必踩的坑，根源都在于「响应性绑定在那个代理对象上」：
      </p>
      <CodeBlock lang="js" title="reactive 的两个坑：整体替换 & 解构" code={reactivePitfallSnippet} />
      <ul>
        <li>
          <strong>不能整体替换</strong>：给变量重新赋一个新对象，会让它指向一个全新的普通对象，
          原来的代理被丢弃，而模板还引用着旧代理，界面便不再更新。要批量更新，应改属性
          （如 <code>Object.assign(state, newData)</code>）而不是替换整个引用。
        </li>
        <li>
          <strong>解构会丢响应性</strong>：解构等于把属性当前的值拷贝出来，拷贝出的基本类型变量
          和源代理之间再无联系，改谁都不影响对方。
        </li>
      </ul>

      <h2>五、toRef / toRefs：解决解构丢响应</h2>
      <p>
        既想解构得到简洁的变量名、又不想丢响应性，就用 <code>toRefs</code> 和 <code>toRef</code>。
        它们把 <code>reactive</code> 对象的属性「转成 ref」，而这些 ref 与源对象之间保持着
        <strong>双向连接</strong>：改 ref 的 <code>.value</code> 会反映到源，改源也会反映到 ref。
      </p>
      <CodeBlock lang="js" title="toRefs 与 toRef 保住响应性" code={toRefsSnippet} />
      <ul>
        <li><code>toRefs(obj)</code>：把整个对象的每个属性都转成 ref，适合「解构整组属性」。</li>
        <li><code>toRef(obj, key)</code>：只取单个属性转成 ref，适合「只想拎出一个」。</li>
      </ul>
      <Callout variant="info" title="转成 ref 后记得带 .value">
        被 <code>toRefs</code> / <code>toRef</code> 转出来的就是 ref 了，在 JS 里读写同样要带
        <code>.value</code>；在模板里依旧自动解包。它们没有「复制值」，而是建立了一条通向源属性的引用。
      </Callout>

      <h2>六、ref vs reactive：怎么选</h2>
      <p>
        两者都能做响应式状态，实战中如何取舍？下面这张表把差异摆清楚：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>ref</th><th>reactive</th></tr>
        </thead>
        <tbody>
          <tr><td>能包装的类型</td><td>任意值（含基本类型、对象）</td><td>仅对象 / 数组 / Map / Set</td></tr>
          <tr><td>JS 里访问</td><td>需 <code>.value</code></td><td>直接访问属性</td></tr>
          <tr><td>模板里访问</td><td>自动解包，直接用</td><td>直接用</td></tr>
          <tr><td>整体替换</td><td>可以（<code>x.value = 新值</code>）</td><td>不可，会丢响应性</td></tr>
          <tr><td>解构</td><td>本身就是引用，安全</td><td>会丢响应性，需 <code>toRefs</code></td></tr>
          <tr><td>底层机制</td><td>对象包一层 + 拦截 .value</td><td>Proxy 代理</td></tr>
        </tbody>
      </table>
      <p>
        一个简单可用的经验法则：<strong>默认用 <code>ref</code></strong>。它能装任意类型，
        整体替换和解构都不踩坑，心智负担最小。当你确实有一组紧密相关的属性、希望像普通对象那样
        成组操作时，再考虑 <code>reactive</code>，并记得解构时配 <code>toRefs</code>。
      </p>

      <h2>七、动手：两个例子</h2>
      <Example title="例一：计数器（ref + computed）">
        <p>
          最经典的入门例子。<code>count</code> 是基本类型用 <code>ref</code>；
          <code>double</code> 是从 <code>count</code> 派生出来的值，用 <code>computed</code>
          （下一章细讲）。注意在 <code>{'<script setup>'}</code> 里改 <code>count</code> 要带
          <code>.value</code>，模板里直接写名字。
        </p>
      </Example>
      <CodeBlock lang="vue" title="计数器组件" code={counterExample} />
      <Example title="例二：用户对象（reactive + toRefs）">
        <p>
          一组相关属性（姓名、年龄、嵌套的 profile）放进一个 <code>reactive</code> 对象，
          直接改属性即可触发更新；嵌套的 <code>profile.city</code> 也是响应式的。
          需要在模板里用解构出来的名字时，用 <code>toRefs</code> 保住响应性。
        </p>
      </Example>
      <CodeBlock lang="vue" title="用户对象组件" code={userObjectExample} />

      <h2>八、小结与下一步</h2>
      <p>
        这一章我们建立了组合式 API 的世界观：它按逻辑关注点组织代码、便于复用；
        <code>{'<script setup>'}</code> 让顶层声明自动暴露给模板；<code>ref</code> 能装任意值
        （JS 里带 <code>.value</code>，模板自动解包），<code>reactive</code> 代理对象
        （不能整体替换、解构会丢响应），而 <code>toRef</code> / <code>toRefs</code> 专治解构丢响应。
        下一章我们把目光转向「派生与侦听」——<code>computed</code> 与 <code>watch</code>。
      </p>

      <Summary
        points={[
          '组合式 API 按「逻辑关注点」聚合代码，解决了选项式把同一功能拆散到 data/methods/computed 的痛点，且整段可抽成 composable 复用。',
          'setup 是组合式入口；原始 setup() 必须显式 return，<script setup> 语法糖让顶层变量与函数自动暴露给模板。',
          'ref 可包装任意值：JS / <script> 里读写需 .value，模板里自动解包；基本类型必须用 ref，因为 Proxy 无法代理原始值。',
          'reactive 用 Proxy 代理对象，直接访问属性即可；但不能整体替换（会丢代理）、解构会丢响应性。',
          'toRefs 把整个 reactive 对象的属性转成与源相连的 ref，toRef 只取单个属性，专治「解构丢响应」。',
          '取舍法则：默认用 ref（任意类型、替换解构都安全）；一组紧密相关属性想成组操作时用 reactive，并配 toRefs 解构。',
        ]}
      />
    </article>
  )
}
