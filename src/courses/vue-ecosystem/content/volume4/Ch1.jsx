import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const propsBasicSnippet = `<!-- 子组件 UserCard.vue -->
<script setup>
// defineProps 是编译宏，不用 import，直接用
// 字符串数组写法：最简，但没有类型与默认值约束
const props = defineProps(['title', 'count'])
</script>

<template>
  <div class="card">
    <h3>{{ props.title }}</h3>
    <p>共 {{ props.count }} 条</p>
  </div>
</template>`

const propsObjectSnippet = `<script setup>
// 对象写法：可声明类型、是否必填、默认值、校验器
const props = defineProps({
  title: {
    type: String,
    required: true,          // 父组件必须传，否则开发期告警
  },
  count: {
    type: Number,
    default: 0,              // 父组件没传时用这个值
  },
  tags: {
    type: Array,
    // 对象 / 数组的默认值必须用工厂函数返回，避免多实例共享同一引用
    default: () => [],
  },
  status: {
    type: String,
    default: 'idle',
    validator: (v) => ['idle', 'loading', 'done'].includes(v),
  },
})
</script>`

const propsTsSnippet = `<script setup lang="ts">
// 纯类型声明：把类型写进泛型参数里，Vue 编译期识别
interface Props {
  title: string
  count?: number          // 加 ? 表示可选
  tags?: string[]
}

// withDefaults 给可选 prop 补默认值
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  tags: () => [],         // 同样：数组默认值用工厂函数
})
</script>`

const propsReadonlySnippet = `<script setup>
const props = defineProps({ count: Number })

function bad() {
  // 禁止！直接改 props 会触发警告，且下次父组件重渲染会把你的改动冲掉
  props.count++
}

import { ref, computed } from 'vue'

// 正解一：把 prop 当“初始值”，复制到本地 ref
const localCount = ref(props.count)

// 正解二：基于 prop 派生只读值，用 computed
const doubled = computed(() => props.count * 2)
</script>`

const emitSnippet = `<!-- 子组件 SearchBox.vue -->
<script setup>
const props = defineProps({ keyword: String })

// 声明本组件会向外发出哪些事件
const emit = defineEmits(['search', 'clear'])

function onSubmit() {
  // 第一个参数是事件名，后面是携带的载荷
  emit('search', props.keyword)
}
function onClear() {
  emit('clear')
}
</script>

<template>
  <input :value="keyword" />
  <button @click="onSubmit">搜索</button>
  <button @click="onClear">清空</button>
</template>`

const emitParentSnippet = `<!-- 父组件 -->
<script setup>
import { ref } from 'vue'
import SearchBox from './SearchBox.vue'

const kw = ref('')
function handleSearch(value) {
  console.log('父组件收到搜索词：', value)
}
</script>

<template>
  <!-- @事件名="处理函数"，子组件 emit 时父组件这里被调用 -->
  <SearchBox :keyword="kw" @search="handleSearch" @clear="kw = ''" />
</template>`

const emitTsSnippet = `<script setup lang="ts">
// 类型化的 emit：声明每个事件名与其载荷类型
const emit = defineEmits<{
  (e: 'search', keyword: string): void
  (e: 'clear'): void
}>()
</script>`

const vModelSnippet = `<!-- 子组件 MyInput.vue：让 v-model 用在自定义组件上 -->
<script setup>
// 约定：prop 名叫 modelValue，事件名叫 update:modelValue
defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>`

const vModelMacroSnippet = `<!-- Vue 3.4+ 推荐写法：defineModel 宏，自动处理 prop + emit -->
<script setup>
const text = defineModel()    // 返回一个可读可写的 ref
</script>

<template>
  <input v-model="text" />
</template>

<!-- 父组件直接：<MyInput v-model="someRef" /> -->`

const provideSnippet = `<!-- 祖先组件 App.vue -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')

// provide(key, value)：把数据“注入”到整棵子树
provide('theme', theme)              // 提供响应式 ref，后代能感知变化
provide('appName', '后台管理系统')   // 也可提供普通值
</script>`

const injectSnippet = `<!-- 任意深度的后代组件 DeepButton.vue -->
<script setup>
import { inject } from 'vue'

// inject(key, 默认值)：取出祖先提供的数据，不必逐层透传 props
const theme = inject('theme', 'light')   // 没人提供时用默认值 'light'
const appName = inject('appName')
</script>

<template>
  <button :class="theme">{{ appName }}</button>
</template>`

const provideReactiveSnippet = `<!-- 祖先：提供数据 + 修改方法，让后代既能读又能改 -->
<script setup>
import { provide, ref, readonly } from 'vue'

const count = ref(0)
function increment() {
  count.value++
}

// readonly 包一层：后代只能读，不能直接改，修改只能走 increment
provide('counter', {
  count: readonly(count),
  increment,
})
</script>`

const attrsSnippet = `<!-- 透传 attrs：父组件传了但子组件没在 props 里声明的属性 -->
<!-- 父：<MyButton type="submit" class="big" data-id="42" /> -->

<!-- 子 MyButton.vue：未声明的 type / class / data-id 会自动落到根元素上 -->
<script setup>
defineProps(['label'])   // 只声明了 label
</script>

<template>
  <!-- type、class、data-id 自动“透传”到这个 button 上 -->
  <button>{{ label }}</button>
</template>`

const inheritAttrsSnippet = `<script setup>
// 关闭自动透传：当根元素不该收这些属性，或有多个根元素时
defineOptions({ inheritAttrs: false })

import { useAttrs } from 'vue'
const attrs = useAttrs()   // 拿到全部透传属性，自己决定绑到哪个元素
</script>

<template>
  <div class="wrapper">
    <!-- 手动用 v-bind 把 attrs 绑到真正该接收的元素上 -->
    <input v-bind="attrs" />
  </div>
</template>`

const comprehensiveSnippet = `<!-- ====== 综合例子：父子 + 跨层 provide/inject ====== -->

<!-- App.vue（祖先）：provide 主题，渲染父级面板 -->
<script setup>
import { provide, ref, readonly } from 'vue'
import OrderPanel from './OrderPanel.vue'

const theme = ref('dark')
provide('theme', { theme: readonly(theme), toggle: () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
} })
</script>

<template>
  <OrderPanel />
</template>


<!-- OrderPanel.vue（父）：用 props 向下、监听 emit 向上 -->
<script setup>
import { ref } from 'vue'
import OrderRow from './OrderRow.vue'

const orders = ref([
  { id: 1, name: '键盘', done: false },
  { id: 2, name: '显示器', done: true },
])

function handleToggle(id) {
  const o = orders.value.find((x) => x.id === id)
  if (o) o.done = !o.done
}
</script>

<template>
  <!-- props 向下传数据，@toggle 接收子组件向上发的事件 -->
  <OrderRow
    v-for="o in orders"
    :key="o.id"
    :order="o"
    @toggle="handleToggle"
  />
</template>


<!-- OrderRow.vue（子 + 深层 inject）：emit 向上，inject 跨层拿主题 -->
<script setup>
import { inject } from 'vue'

defineProps({ order: { type: Object, required: true } })
const emit = defineEmits(['toggle'])

// 不必经 OrderPanel 逐层透传，直接从 App 注入
const { theme } = inject('theme')
</script>

<template>
  <div :class="theme">
    <span>{{ order.name }}</span>
    <button @click="emit('toggle', order.id)">
      {{ order.done ? '已完成' : '待办' }}
    </button>
  </div>
</template>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        组件拆开了，下一个问题就来了：它们之间怎么说话？父组件想把数据递给子组件、子组件想告诉父组件
        “我这儿出事了”、隔了好几层的祖孙又想共享同一份配置——这些都是组件通信要解决的。
        Vue 3 给出了一套清晰、各司其职的方案：props 向下、emit 向上、v-model 双向、
        provide/inject 跨层。这一章我们把它们逐个讲透，并理清各自的适用边界。
      </Lead>

      <h2>一、贯穿全章的原则：单向数据流</h2>
      <KeyIdea>
        Vue 组件间的数据流动是<strong>单向</strong>的：数据通过 props 从父<strong>向下</strong>流到子；
        子组件想影响父组件，不是去改父给的数据，而是通过事件（emit）向<strong>上</strong>通知，
        由父组件自己决定怎么改。向下传数据、向上发事件——记住这条主线，后面所有 API 都是它的具体落地。
      </KeyIdea>
      <p>
        为什么要这样设计？因为单向流让数据的“源头”始终唯一且可追踪。一份状态归谁管，谁就负责改它；
        别人只能读、或者发信号请求它改。一旦允许子组件随手改父组件的数据，状态就会变得到处都能动，
        出了 bug 你根本不知道是谁、在哪一步把它改坏了。单向流牺牲了一点“随手就改”的便利，
        换来的是<strong>可预测性</strong>——这正是大型应用最需要的东西。
      </p>

      <h2>二、props：父组件向子组件传数据</h2>
      <p>
        props 是父组件传给子组件的“入参”。在 <code>{'<script setup>'}</code> 里，我们用编译宏
        <code>defineProps</code> 来声明本组件接收哪些 props。它是编译宏，<strong>不需要</strong> import，
        编译器会在编译期处理掉它。
      </p>
      <CodeBlock lang="vue" title="defineProps 最简写法（字符串数组）" code={propsBasicSnippet} />
      <p>
        字符串数组写法最快，但没有任何约束。实战里更推荐<strong>对象写法</strong>，可以声明类型、是否必填、
        默认值，甚至自定义校验器：
      </p>
      <CodeBlock lang="vue" title="defineProps 对象写法（类型 / 必填 / 默认值 / 校验）" code={propsObjectSnippet} />
      <Callout variant="warn" title="对象 / 数组的默认值必须用工厂函数">
        如果默认值是对象或数组，必须写成 <code>{'default: () => []'}</code> 这种工厂函数形式，
        而不能直接写 <code>{'default: []'}</code>。否则这个组件的所有实例会共享同一个引用，
        一个实例改了，其他实例跟着变——这是非常隐蔽的 bug。
      </Callout>

      <h3>用 TypeScript 声明 props 类型</h3>
      <p>
        如果用 TS（<code>{'<script setup lang="ts">'}</code>），可以把类型直接写进
        <code>defineProps</code> 的泛型参数里，再用 <code>withDefaults</code> 给可选 prop 补默认值，
        类型与默认值分离，读起来更清爽：
      </p>
      <CodeBlock lang="vue" title="TS 类型声明 + withDefaults" code={propsTsSnippet} />

      <h3>为什么不能直接改 props</h3>
      <p>
        props 是<strong>只读</strong>的。在子组件里直接写 <code>{'props.count++'}</code> 会触发开发期警告，
        而且毫无意义——下次父组件重新渲染时，它会用自己的数据把你的改动覆盖掉，因为父才是这份数据的“源头”。
        这正是单向数据流的体现：子组件没有权力擅自修改向下流来的数据。
      </p>
      <p>那如果确实需要在子组件内“基于 prop 做点变化”，怎么办？有两条正路：</p>
      <ul>
        <li>把 prop 当作<strong>初始值</strong>，复制到本地 <code>ref</code>，之后改本地副本。</li>
        <li>基于 prop 派生一个<strong>只读</strong>的 <code>computed</code>，prop 变它自动跟着变。</li>
        <li>如果是真的想“改父的数据”，那就该用 emit 通知父组件去改（见下一节）。</li>
      </ul>
      <CodeBlock lang="vue" title="不要改 props，要复制或派生" code={propsReadonlySnippet} />

      <h2>三、emit：子组件向父组件通信</h2>
      <p>
        子组件不能直接改父的数据，但可以“喊一声”——发出一个<strong>自定义事件</strong>，把信息向上传递，
        父组件监听到后自己处理。我们用编译宏 <code>defineEmits</code> 声明本组件会发出哪些事件，
        它返回一个 <code>emit</code> 函数用来真正触发事件。
      </p>
      <CodeBlock lang="vue" title="子组件用 defineEmits 声明并触发事件" code={emitSnippet} />
      <p>
        父组件这边，用 <code>@事件名="处理函数"</code> 来监听。子组件每 <code>emit</code> 一次，
        父组件对应的处理函数就被调用一次，<code>emit</code> 时携带的载荷会作为参数传进来：
      </p>
      <CodeBlock lang="vue" title="父组件监听子组件发出的事件" code={emitParentSnippet} />
      <p>
        同样地，TS 项目里可以给 emit 加类型，明确每个事件名对应的载荷类型，调用错了编译期就报错：
      </p>
      <CodeBlock lang="vue" title="类型化的 defineEmits" code={emitTsSnippet} />

      <h2>四、v-model：props + emit 的双向语法糖（回顾）</h2>
      <p>
        我们在表单那一卷见过 <code>v-model</code>。它其实不是什么新机制，而是
        <strong>“传一个 prop + 监听一个 update 事件”</strong> 的语法糖。组件上的
        <code>v-model</code> 默认对应名为 <code>modelValue</code> 的 prop 和名为
        <code>update:modelValue</code> 的事件。
      </p>
      <CodeBlock lang="vue" title="手动实现组件 v-model（理解原理）" code={vModelSnippet} />
      <p>
        <code>{'<MyInput v-model="x" />'}</code> 等价于
        <code>{'<MyInput :modelValue="x" @update:modelValue="x = $event" />'}</code>。
        理解这一点后，你就明白 v-model 完全建立在前面两节的 props / emit 之上，没有任何魔法。
        从 Vue 3.4 起，更推荐用 <code>defineModel</code> 宏，它自动帮你处理好那对 prop 和 emit：
      </p>
      <CodeBlock lang="vue" title="Vue 3.4+ 用 defineModel 宏" code={vModelMacroSnippet} />

      <h2>五、provide / inject：跨层级注入</h2>
      <p>
        props 一层层向下传很清晰，但当层级很深时会很痛苦：A 要把数据给到 D，可中间隔着 B、C，
        而 B、C 自己根本用不到这份数据，却被迫帮忙“接力传递”。这种现象叫
        <strong>prop 逐层透传（prop drilling）</strong>，又啰嗦又脆弱。
      </p>
      <KeyIdea>
        <code>provide / inject</code> 让祖先组件“提供”数据，任意深度的后代直接“注入”取用，
        中间层完全不必参与。祖先 <code>provide(key, value)</code>，后代
        <code>inject(key)</code>，一供一取，跨越多少层都无所谓。
      </KeyIdea>
      <CodeBlock lang="vue" title="祖先 provide 提供数据" code={provideSnippet} />
      <CodeBlock lang="vue" title="深层后代 inject 取用数据" code={injectSnippet} />
      <p>
        关键点：如果 <code>provide</code> 的是一个<strong>响应式</strong>的值（比如 <code>ref</code>），
        那么祖先改它时，所有 inject 它的后代都会自动更新——这就是<strong>响应式 provide</strong>。
        若 provide 的只是个普通字符串 / 数字，则后代拿到的是一次性快照，祖先后续改动后代感知不到。
      </p>
      <h3>让后代能“请求修改”而不直接改</h3>
      <p>
        为了不破坏单向流，常见做法是：祖先把<strong>只读的数据 + 修改方法</strong>一起 provide 下去，
        后代要改时调用方法，由祖先执行真正的修改。用 <code>readonly</code> 把数据包一层，
        后代就无法（也不应）直接改它：
      </p>
      <CodeBlock lang="vue" title="provide 只读数据 + 修改方法" code={provideReactiveSnippet} />

      <h2>六、attrs 透传与 inheritAttrs</h2>
      <p>
        还有一种“隐式”的传递：父组件写在子组件标签上、但子组件没在 <code>defineProps</code> 里声明的属性
        （以及事件监听器），会被自动收集为 <strong>透传 attributes（fallthrough attrs）</strong>，
        默认<strong>自动落到子组件的根元素</strong>上。这让你能给封装组件传 <code>class</code>、
        <code>id</code>、<code>data-*</code> 等原生属性而不必一个个声明。
      </p>
      <CodeBlock lang="vue" title="未声明的属性自动透传到根元素" code={attrsSnippet} />
      <p>
        当根元素不该接收这些属性，或组件有多个根元素时，自动透传就需要手动接管。用
        <code>{'inheritAttrs: false'}</code> 关闭自动透传，再用 <code>useAttrs()</code> 拿到全部透传属性，
        自己 <code>v-bind</code> 到真正该接收的那个元素上：
      </p>
      <CodeBlock lang="vue" title="关闭自动透传并手动绑定" code={inheritAttrsSnippet} />

      <h2>七、各通信方式适用场景对比</h2>
      <p>四种主要方式各有定位，选错了就会别扭。下面这张表帮你快速对号入座：</p>
      <table>
        <thead>
          <tr>
            <th>方式</th>
            <th>方向</th>
            <th>典型场景</th>
            <th>注意点</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>props</td>
            <td>父 -&gt; 子</td>
            <td>父把数据 / 配置传给子</td>
            <td>只读，子不能直接改</td>
          </tr>
          <tr>
            <td>emit</td>
            <td>子 -&gt; 父</td>
            <td>子通知父“发生了某事”</td>
            <td>需先 defineEmits 声明</td>
          </tr>
          <tr>
            <td>v-model</td>
            <td>父 &lt;-&gt; 子</td>
            <td>表单类组件的双向绑定</td>
            <td>本质是 props + emit 语法糖</td>
          </tr>
          <tr>
            <td>provide / inject</td>
            <td>祖先 -&gt; 任意后代</td>
            <td>跨多层共享主题 / 配置 / 服务</td>
            <td>避免逐层透传；建议配 readonly</td>
          </tr>
          <tr>
            <td>状态库（Pinia）</td>
            <td>任意 &lt;-&gt; 任意</td>
            <td>跨远房组件的全局共享状态</td>
            <td>无直接关系的组件用它，见后续卷</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="选择口诀">
        直接父子关系优先 props / emit；表单双向用 v-model；
        “中间层根本用不到却要帮忙传”的深层共享用 provide / inject；
        毫无关系的远房组件共享状态，再上 Pinia。能用近的就别用远的，作用域越小越好维护。
      </Callout>

      <h2>八、综合例子：父子 + 跨层 provide/inject</h2>
      <p>
        把这一章的几种方式串进一个例子：<code>App</code> 跨层 provide 主题；
        <code>OrderPanel</code> 作为父，用 props 把每条订单向下传给 <code>OrderRow</code>，
        并监听子组件 emit 的 <code>toggle</code> 事件；<code>OrderRow</code> 作为最深一层，
        既向上 emit，又直接 inject 拿到 App 提供的主题——完全不经过中间的 OrderPanel 透传。
      </p>
      <CodeBlock lang="vue" title="父子 props/emit + 跨层 provide/inject 综合示例" code={comprehensiveSnippet} />
      <Example title="顺着数据流走一遍">
        <p>
          用户点 OrderRow 里的按钮，子组件 <code>emit('toggle', id)</code> 向上发事件；
          父组件 OrderPanel 的 <code>handleToggle</code> 被调用，它去修改自己持有的 <code>orders</code>
          （数据源头在父这里）；orders 是响应式的，变化后对应的 OrderRow 自动重渲染。
          全程子组件没有碰过父的数据，只是“喊了一声”。
        </p>
        <p>
          与此同时，主题 <code>theme</code> 由最顶层的 App 提供，OrderRow 直接 inject 取用——
          中间隔着的 OrderPanel 既不需要声明 theme 这个 prop，也不需要往下转传，干净利落。
        </p>
      </Example>

      <h2>九、边界与易错点</h2>
      <ul>
        <li>
          <strong>不要把 inject 当全局变量乱用</strong>：provide/inject 适合“一个子树共享的上下文”，
          如果两个毫无关系的组件要共享状态，那是 Pinia 的活，别硬塞进 provide。
        </li>
        <li>
          <strong>inject 的 key 建议用常量 / Symbol</strong>：字符串 key 容易拼错且会撞名，
          大型项目里用 <code>Symbol</code> 做 key 更安全。
        </li>
        <li>
          <strong>provide 普通值不响应</strong>：想让后代感知变化，provide 的必须是响应式数据（ref / reactive）。
        </li>
        <li>
          <strong>emit 事件名要声明</strong>：没在 <code>defineEmits</code> 里声明的事件虽然也能发，
          但声明后类型、文档、透传行为都更清晰，养成声明的习惯。
        </li>
      </ul>

      <Callout variant="tip">
        下一章我们换个角度看组件组合：除了“传数据”，父组件还能往子组件里“填内容”——这就是插槽。
        同时我们会讲清组件从创建到销毁的生命周期钩子，知道该在哪个时机做取数、初始化与清理。
      </Callout>

      <Summary
        points={[
          '单向数据流是总原则：数据经 props 从父向下流，子组件想影响父只能通过 emit 向上发事件，由父自己改。',
          'props 用 defineProps 声明，推荐对象写法（类型 / 必填 / 默认值 / 校验）；TS 用泛型声明 + withDefaults 补默认值；对象/数组默认值必须用工厂函数。',
          'props 只读，不能直接改；要变化就复制到本地 ref、或用 computed 派生，真要改父数据则 emit 通知父。',
          'emit 用 defineEmits 声明事件，子组件 emit(事件名, 载荷) 向上通信，父组件用 @事件名 监听。',
          'v-model 是 props（modelValue）+ emit（update:modelValue）的语法糖；Vue 3.4+ 推荐用 defineModel 宏。',
          'provide/inject 让祖先注入、任意后代取用，避免 prop 逐层透传；provide 响应式值才能让后代感知变化，常配 readonly + 修改方法。',
          '未声明的属性自动透传到根元素（fallthrough attrs），需要时用 inheritAttrs:false + useAttrs() 手动接管。',
          '选择口诀：父子用 props/emit，表单用 v-model，深层共享用 provide/inject，远房共享上 Pinia。',
        ]}
      />
    </article>
  )
}
