import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const defaultSlotSnippet = `<!-- 子组件 PanelBox.vue：用 <slot> 占一个“坑” -->
<script setup>
defineProps(['title'])
</script>

<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <div class="panel-body">
      <!-- 父组件标签内部写的内容，会填到这个 slot 的位置 -->
      <slot></slot>
    </div>
  </div>
</template>`

const defaultSlotParentSnippet = `<!-- 父组件：标签内部的内容就是要“填”进默认插槽的东西 -->
<template>
  <PanelBox title="公告">
    <!-- 下面这两行被填进子组件的 <slot> 位置 -->
    <p>今晚 22:00 系统维护。</p>
    <button>知道了</button>
  </PanelBox>
</template>`

const fallbackSlotSnippet = `<!-- 插槽可以写“默认内容”：父组件没填时显示它 -->
<template>
  <button class="btn">
    <slot>提交</slot>   <!-- 父组件没传内容时，按钮显示“提交” -->
  </button>
</template>

<!-- 父组件 <MyButton /> 显示“提交”；
     <MyButton>保存</MyButton> 显示“保存” -->`

const namedSlotSnippet = `<!-- 子组件 LayoutCard.vue：多个具名插槽 + 一个默认插槽 -->
<template>
  <div class="card">
    <header>
      <slot name="header"></slot>   <!-- 具名插槽：header -->
    </header>

    <main>
      <slot></slot>                 <!-- 没写 name 即默认插槽 -->
    </main>

    <footer>
      <slot name="footer"></slot>   <!-- 具名插槽：footer -->
    </footer>
  </div>
</template>`

const namedSlotParentSnippet = `<!-- 父组件：用 <template #名字> 指定内容填到哪个具名插槽 -->
<template>
  <LayoutCard>
    <!-- #header 是 v-slot:header 的简写 -->
    <template #header>
      <h2>用户资料</h2>
    </template>

    <!-- 不带 template 包裹、或用 #default 的内容进默认插槽 -->
    <p>这里是卡片正文，进默认插槽。</p>

    <template #footer>
      <button>保存</button>
      <button>取消</button>
    </template>
  </LayoutCard>
</template>`

const scopedSlotChildSnippet = `<!-- 子组件 UserList.vue：作用域插槽——把子组件的数据“传回”给父的插槽内容 -->
<script setup>
defineProps({ users: { type: Array, default: () => [] } })
</script>

<template>
  <ul>
    <li v-for="user in users" :key="user.id">
      <!-- 在 <slot> 上像传 props 一样把数据绑上去，父组件就能用到 -->
      <slot :user="user" :index="user.id"></slot>
    </li>
  </ul>
</template>`

const scopedSlotParentSnippet = `<!-- 父组件：用 v-slot="作用域对象" 接住子组件传回来的数据 -->
<template>
  <UserList :users="users">
    <!-- slotProps 就是子组件在 <slot> 上绑的那些数据的集合 -->
    <template #default="slotProps">
      <strong>{{ slotProps.index }}.</strong>
      {{ slotProps.user.name }}
    </template>
  </UserList>

  <!-- 也可以直接解构，更常见： -->
  <UserList :users="users">
    <template #default="{ user, index }">
      <strong>{{ index }}.</strong> {{ user.name }}
    </template>
  </UserList>
</template>`

const lifecycleSnippet = `<script setup>
import {
  onBeforeMount, onMounted,
  onBeforeUpdate, onUpdated,
  onBeforeUnmount, onUnmounted,
} from 'vue'

onBeforeMount(() => {
  // 组件即将挂载：模板还没真正渲染成 DOM
})

onMounted(() => {
  // 组件已挂载：DOM 已就绪，可安全访问元素、取数、初始化第三方库
  console.log('挂载完成')
})

onBeforeUpdate(() => {
  // 响应式数据变了、DOM 即将更新之前
})

onUpdated(() => {
  // DOM 已根据最新数据更新完成
})

onBeforeUnmount(() => {
  // 组件即将卸载：此时实例仍然可用，适合做收尾准备
})

onUnmounted(() => {
  // 组件已卸载：清理定时器 / 事件监听 / 第三方实例，避免内存泄漏
})
</script>`

const mountedFetchSnippet = `<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const list = ref([])
let timer = null

onMounted(async () => {
  // 1. 进页面就取数据
  list.value = await fetch('/api/list').then((r) => r.json())
  // 2. 初始化一个轮询定时器
  timer = setInterval(refresh, 5000)
})

onUnmounted(() => {
  // 组件销毁时一定要清掉定时器，否则它会一直跑，造成泄漏
  clearInterval(timer)
})

async function refresh() {
  list.value = await fetch('/api/list').then((r) => r.json())
}
</script>`

const slotCardSnippet = `<!-- ====== 综合例子：带具名 + 作用域插槽的卡片组件 ====== -->

<!-- DataCard.vue（子组件） -->
<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  fetchUrl: { type: String, required: true },
})

const items = ref([])
const loading = ref(true)

onMounted(async () => {
  // 组件挂载后取数：典型的 onMounted 用途
  items.value = await fetch(props.fetchUrl).then((r) => r.json())
  loading.value = false
})
</script>

<template>
  <section class="data-card">
    <!-- 具名插槽 header：让父组件定制标题区 -->
    <header><slot name="header">列表</slot></header>

    <p v-if="loading">加载中…</p>

    <ul v-else>
      <li v-for="(item, i) in items" :key="item.id">
        <!-- 作用域插槽：把每一项数据 item / 序号 i 传回父组件 -->
        <slot name="row" :item="item" :index="i">
          {{ item.name }}   <!-- 父组件没定制时的兜底渲染 -->
        </slot>
      </li>
    </ul>

    <!-- 具名插槽 footer -->
    <footer><slot name="footer"></slot></footer>
  </section>
</template>


<!-- 父组件：填具名插槽，并用作用域插槽自定义每行的渲染 -->
<template>
  <DataCard fetch-url="/api/users">
    <template #header>
      <h2>用户列表</h2>
    </template>

    <!-- 接住子组件传回的 item 与 index，自己决定怎么画这一行 -->
    <template #row="{ item, index }">
      <span>{{ index + 1 }}</span>
      <b>{{ item.name }}</b>
      <em>{{ item.email }}</em>
    </template>

    <template #footer>
      <small>共 {{ items.length }} 人</small>
    </template>
  </DataCard>
</template>`

const keepAliveSnippet = `<!-- keep-alive 缓存被包裹的组件，切走不销毁、切回不重建 -->
<template>
  <keep-alive>
    <component :is="currentTab" />
  </keep-alive>
</template>

<script setup>
import { onActivated, onDeactivated } from 'vue'

onActivated(() => {
  // 被 keep-alive 缓存的组件“重新显示”时触发（不是重新挂载）
})
onDeactivated(() => {
  // 被切走、进入缓存时触发（不是卸载）
})
</script>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章解决了组件间“传数据”，这一章讲两件让组件真正灵活起来的事：插槽和生命周期。
        插槽让父组件能往子组件里“填内容”，把布局与内容解耦，做出高度可复用的容器组件；
        生命周期钩子则让你抓住组件“出生到死亡”的关键时机，在对的时刻取数、初始化、清理。
        两者一个管“组合”，一个管“时机”，是写出好组件的基本功。
      </Lead>

      <h2>一、插槽是什么：往子组件里“填内容”</h2>
      <KeyIdea>
        props 让父组件往子组件传<strong>数据</strong>，而插槽（slot）让父组件往子组件传
        <strong>一段模板内容</strong>。子组件在模板里用 <code>{'<slot>'}</code> 占一个“坑”，
        父组件在使用这个子组件时，把要填的 HTML / 组件写进它的标签内部，就会被填到那个坑的位置。
      </KeyIdea>
      <p>
        为什么需要插槽？因为有很多组件，结构是固定的、内容却千变万化——比如一个弹窗、一张卡片、
        一个面板：边框、标题栏、底部按钮区的<strong>布局</strong>是组件该管的，但里面具体放什么<strong>内容</strong>
        应该由使用者决定。插槽就是把“内容的决定权”交还给父组件的机制。
      </p>

      <h2>二、默认插槽</h2>
      <p>
        最简单的插槽：子组件写一个不带名字的 <code>{'<slot>'}</code>，父组件标签内部的内容就会被填进去。
      </p>
      <CodeBlock lang="vue" title="子组件用 <slot> 占位" code={defaultSlotSnippet} />
      <CodeBlock lang="vue" title="父组件填充默认插槽" code={defaultSlotParentSnippet} />
      <p>
        插槽还能写<strong>默认内容（后备内容）</strong>：当父组件没有填任何东西时，就显示
        <code>{'<slot>'}</code> 标签里预置的内容；父组件一旦填了，默认内容就被覆盖。
      </p>
      <CodeBlock lang="vue" title="带默认内容的插槽" code={fallbackSlotSnippet} />

      <h2>三、具名插槽</h2>
      <p>
        一个组件常常需要多个“坑”：比如卡片有头部、正文、底部三处都要父组件定制。这时用
        <strong>具名插槽</strong>：给 <code>{'<slot>'}</code> 加上 <code>name</code>，父组件用
        <code>{'<template #名字>'}</code>（即 <code>{'v-slot:名字'}</code> 的简写）指明内容填到哪个坑。
      </p>
      <CodeBlock lang="vue" title="子组件声明多个具名插槽" code={namedSlotSnippet} />
      <CodeBlock lang="vue" title="父组件用 #名字 指定填充位置" code={namedSlotParentSnippet} />
      <Callout variant="info" title="#name 与 v-slot:name">
        <code>{'#header'}</code> 是 <code>{'v-slot:header'}</code> 的简写，两者等价。
        没用 <code>{'<template>'}</code> 包裹、或写 <code>{'#default'}</code> 的内容，都进默认插槽。
        具名插槽内容必须写在 <code>{'<template>'}</code> 标签上，名字才有处安放。
      </Callout>

      <h2>四、作用域插槽：子组件把数据“传回”给父</h2>
      <p>
        前面的插槽都是父组件单方面往里填内容。但有时父组件想填的内容<strong>依赖子组件内部的数据</strong>——
        比如子组件在 <code>v-for</code> 一个列表，父组件想自定义“每一项”长什么样，可它根本拿不到子组件循环里的
        那个 item。<strong>作用域插槽</strong>就是为此而生：子组件像传 props 一样，把数据绑在
        <code>{'<slot>'}</code> 上，父组件就能在插槽内容里用到这些数据。
      </p>
      <KeyIdea>
        作用域插槽是“双向”的：父组件提供<strong>模板</strong>，子组件提供<strong>数据</strong>。
        子组件在 <code>{'<slot :user="user">'}</code> 上绑数据，父组件用
        <code>{'<template #default="{ user }">'}</code> 接住——子把循环里的数据传回给父的插槽内容。
      </KeyIdea>
      <CodeBlock lang="vue" title="子组件在 <slot> 上绑数据" code={scopedSlotChildSnippet} />
      <CodeBlock lang="vue" title="父组件用 v-slot 接住数据" code={scopedSlotParentSnippet} />

      <h2>五、插槽的典型用途</h2>
      <ul>
        <li>
          <strong>布局组件</strong>：像卡片、弹窗、页面骨架，用具名插槽划出 header / body / footer，
          骨架由组件管，内容交给使用者。
        </li>
        <li>
          <strong>列表渲染定制</strong>：表格 / 列表组件负责取数、循环、分页逻辑，用作用域插槽把每行数据
          传回父组件，让父组件自由决定每一行怎么渲染。这是组件库里最常见的高级用法。
        </li>
        <li>
          <strong>无渲染（renderless）组件</strong>：组件只管逻辑，把数据通过作用域插槽全交出去，
          完全不关心 UI 长什么样。
        </li>
      </ul>

      <h2>六、生命周期：组件从创建到销毁</h2>
      <p>
        一个组件从被创建、渲染成 DOM、随数据更新、到最终被移除，会经历若干阶段。Vue 在每个关键节点
        都提供了一个<strong>生命周期钩子</strong>，让你在那个时刻插入自己的代码。在
        <code>{'<script setup>'}</code> 里，这些钩子是以 <code>onXxx</code> 函数的形式从 <code>vue</code> 导入并调用的。
      </p>
      <CodeBlock lang="vue" title="六个常用生命周期钩子" code={lifecycleSnippet} />

      <h3>执行时机与典型用途</h3>
      <table>
        <thead>
          <tr>
            <th>钩子</th>
            <th>触发时机</th>
            <th>典型用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>onBeforeMount</code></td>
            <td>挂载前，DOM 尚未生成</td>
            <td>很少用，挂载前最后准备</td>
          </tr>
          <tr>
            <td><code>onMounted</code></td>
            <td>挂载后，DOM 已就绪</td>
            <td>取数、访问 DOM、初始化第三方库</td>
          </tr>
          <tr>
            <td><code>onBeforeUpdate</code></td>
            <td>数据变、DOM 更新前</td>
            <td>读取更新前的旧 DOM 状态</td>
          </tr>
          <tr>
            <td><code>onUpdated</code></td>
            <td>DOM 已按新数据更新后</td>
            <td>依赖最新 DOM 的操作（慎用，易死循环）</td>
          </tr>
          <tr>
            <td><code>onBeforeUnmount</code></td>
            <td>卸载前，实例仍可用</td>
            <td>收尾准备、保存状态</td>
          </tr>
          <tr>
            <td><code>onUnmounted</code></td>
            <td>卸载后</td>
            <td>清理定时器 / 事件监听 / 第三方实例</td>
          </tr>
        </tbody>
      </table>
      <p>
        最常打交道的是<strong>一头一尾</strong>这对：<code>onMounted</code> 里发请求取数据、
        操作刚渲染好的 DOM、初始化图表 / 地图等第三方库；<code>onUnmounted</code> 里把
        <code>onMounted</code> 建立的东西<strong>对称地清掉</strong>——清定时器、移除事件监听、
        销毁第三方实例，否则组件没了，这些东西还在后台跑，就是内存泄漏。
      </p>
      <CodeBlock lang="vue" title="onMounted 取数 + onUnmounted 清理" code={mountedFetchSnippet} />
      <Callout variant="info" title="和 React useEffect 的一句话类比">
        如果你熟悉 React：<code>onMounted</code> 约等于 <code>{'useEffect(fn, [])'}</code> 的首次执行，
        <code>onUnmounted</code> 约等于 <code>useEffect</code> 返回的那个清理函数——“建立”和“清理”成对出现。
      </Callout>

      <h2>七、keep-alive 与 onActivated / onDeactivated</h2>
      <p>
        当组件被 <code>{'<keep-alive>'}</code> 包裹时，它切走不会被销毁、切回也不会重建，而是被缓存起来；
        此时它不会触发 <code>onUnmounted</code> / <code>onMounted</code>，而是触发
        <strong><code>onActivated</code>（缓存组件重新显示时）和 <code>onDeactivated</code>（被切走进缓存时）</strong>。
      </p>
      <CodeBlock lang="vue" title="keep-alive 缓存组件的专属钩子" code={keepAliveSnippet} />

      <h2>八、综合例子：带具名 + 作用域插槽的卡片组件</h2>
      <p>
        把这一章的东西凑成一个真实组件：<code>DataCard</code> 在 <code>onMounted</code> 里取数，
        提供 <code>header</code> / <code>footer</code> 两个具名插槽让父组件定制头尾，
        再用一个名为 <code>row</code> 的<strong>作用域插槽</strong>把每一项数据 <code>item</code> 和序号
        <code>index</code> 传回父组件，让父组件自由渲染每一行。
      </p>
      <CodeBlock lang="vue" title="DataCard：具名插槽 + 作用域插槽 + onMounted 取数" code={slotCardSnippet} />
      <Example title="拆解这个组件的协作">
        <p>
          <strong>子组件 DataCard 负责</strong>：挂载时取数据（onMounted）、显示加载态、循环渲染、
          划出 header / row / footer 三个插槽口子。这些是“通用容器”该管的事。
        </p>
        <p>
          <strong>父组件负责</strong>：用 <code>#header</code> 填标题、用
          <code>{'#row="{ item, index }"'}</code> 接住每行数据并决定它长什么样、用 <code>#footer</code>
          填底部。同一个 DataCard，换不同父组件就能渲染用户列表、订单列表、商品列表——
          这就是插槽带来的复用力。
        </p>
      </Example>

      <h2>九、边界与易错点</h2>
      <ul>
        <li>
          <strong>作用域插槽的数据只在插槽内可用</strong>：子组件通过 <code>{'<slot :x="x">'}</code>
          传回的数据，只能在父组件对应的 <code>{'<template #...>'}</code> 里访问，出了这个范围就没有。
        </li>
        <li>
          <strong>onMounted 才能安全访问 DOM</strong>：在 setup 顶层或 onBeforeMount 里访问模板里的元素
          会拿到 null，因为那时 DOM 还没生成。
        </li>
        <li>
          <strong>onUpdated 里别改响应式数据</strong>：改了会再次触发更新，可能陷入死循环；
          要响应数据变化通常该用 <code>watch</code> 而非 onUpdated。
        </li>
        <li>
          <strong>清理要对称</strong>：onMounted 里 <code>addEventListener</code> / <code>setInterval</code> /
          建第三方实例，就要在 onUnmounted 里成对地移除 / 清除 / 销毁。
        </li>
      </ul>

      <Callout variant="tip">
        到这里，组件化这一卷的核心就齐了：通信（props / emit / provide-inject）解决“组件间怎么传”，
        插槽解决“怎么往里填内容”，生命周期解决“在什么时机做事”。把这三块捏合好，
        你就能写出既灵活复用、又行为可控的组件。
      </Callout>

      <Summary
        points={[
          '插槽让父组件往子组件“填内容”：子用 <slot> 占坑，父在标签内部写内容填进去，可设默认（后备）内容。',
          '具名插槽用 name 区分多个坑，父组件用 <template #名字>（即 v-slot:名字 简写）指定填充位置。',
          '作用域插槽让子组件把内部数据（如循环里的 item）通过 <slot :x="x"> 传回父组件，父用 v-slot="{ x }" 接住，常用于列表渲染定制。',
          '插槽典型用途：布局组件（header/body/footer）、列表渲染定制、无渲染组件。',
          '生命周期六钩子：onBeforeMount/onMounted、onBeforeUpdate/onUpdated、onBeforeUnmount/onUnmounted，对应挂载、更新、卸载三阶段的前后。',
          'onMounted 取数 / 访问 DOM / 初始化第三方库；onUnmounted 对称清理定时器、事件监听、第三方实例，防内存泄漏。',
          'onMounted≈React useEffect(fn,[]) 首次执行，onUnmounted≈其清理函数；keep-alive 缓存组件用 onActivated（显示）/ onDeactivated（切走）而非挂载卸载。',
        ]}
      />
    </article>
  )
}
