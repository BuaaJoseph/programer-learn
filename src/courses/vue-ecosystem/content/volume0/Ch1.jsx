import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cdnSnippet = `<!-- 只用一个 script 标签，就能在任何 HTML 页面里跑起 Vue -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body>
  <div id="app">
    <!-- 双花括号是「文本插值」，把数据放进视图 -->
    <p>{{ message }}</p>
    <button @click="count++">你点了 {{ count }} 次</button>
  </div>

  <script>
    const { createApp, ref } = Vue

    createApp({
      setup() {
        const message = ref('你好，Vue！')
        const count = ref(0)
        return { message, count }
      }
    }).mount('#app')
  <\/script>
</body>
</html>`

const reactiveIntuitionSnippet = `import { ref, reactive, computed, watchEffect } from 'vue'

// ref 包裹基本类型，.value 是它的「真身」
const count = ref(0)

// reactive 代理一个对象，访问属性时透明地被追踪
const state = reactive({ price: 10, qty: 2 })

// computed 是「被推导出来的数据」：依赖变了就自动重算
const total = computed(() => state.price * state.qty)

// 读 total 时记录依赖，写 price/qty 时通知 total 失效并重算
watchEffect(() => {
  console.log('当前总价：', total.value)
})

state.qty = 5 // 这一行写操作，会触发上面的 watchEffect 重新打印`

const declarativeSnippet = `<!-- 声明式：你描述「视图应该长什么样」，而不是「怎么一步步改 DOM」 -->
<template>
  <ul>
    <!-- 数据是 todos，视图是它的映射；todos 变，列表自动跟着变 -->
    <li v-for="todo in todos" :key="todo.id">
      {{ todo.text }}
    </li>
  </ul>
</template>

<script setup>
import { ref } from 'vue'
const todos = ref([
  { id: 1, text: '学习响应式' },
  { id: 2, text: '写第一个组件' },
])
</script>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Vue 是一套用来构建用户界面的渐进式 JavaScript 框架。它的一句话承诺极其朴素，却足够迷人：
        <strong>你只管改数据，视图会自动跟着更新</strong>。你不需要亲手去找某个 DOM 节点、再手动塞进新值，
        而是把「数据长什么样」声明出来，剩下的同步工作交给框架。这一章我们把 Vue 的来历、
        两个最核心的直觉——声明式渲染与响应式——以及「渐进式」到底意味着什么讲透，
        最后把它放回前端生态里，和 React 做一次冷静的取舍对比。
      </Lead>

      <h2>一、Vue 的核心承诺：改数据，视图自动更新</h2>
      <p>
        要理解 Vue，先要理解它想替你解决的痛点。在没有框架的「手写 DOM」时代，
        界面和数据是两套各自独立的东西：你在 JavaScript 里维护一份数据，又在页面上有一堆 DOM 节点，
        每当数据变了，你得亲自写代码去找到对应节点、改它的文本或属性，保证两边一致。
        应用一大，这种「手动对账」就成了 bug 的温床——你很容易漏掉某处该更新的地方。
      </p>
      <p>
        Vue 把这件事彻底翻转过来。你只需要声明「视图是数据的函数」，然后<strong>专心修改数据</strong>，
        视图的更新由框架负责。数据加一，界面上的数字就跟着加一；往数组里推一项，列表上就多一行。
        这就是 Vue 最朴素也最强的承诺：<em>数据是唯一的真相源，视图永远是它的镜像</em>。
      </p>
      <KeyIdea>
        Vue 的世界里，视图是数据的「投影」。你不直接操作界面，而是操作数据；
        框架监听数据的变化，自动把变化反映到界面上。把「怎么改 DOM」这件苦差事交出去，
        正是 Vue 让前端开发变轻松的根本原因。
      </KeyIdea>

      <h2>二、声明式渲染：描述结果，而非过程</h2>
      <p>
        和「核心承诺」一体两面的，是 Vue 的<strong>声明式渲染</strong>。所谓声明式，
        意思是你只描述「界面在某个数据状态下应该长什么样」，而不去写「先删掉这个节点、
        再插入那个节点」这样一步步的命令式操作。
      </p>
      <p>
        在 Vue 的模板里，<code>{'{{ message }}'}</code> 这样的双花括号叫<strong>文本插值</strong>，
        它把数据塞进视图的某个位置；<code>{'v-for'}</code> 把一个数组映射成一串元素；
        <code>{'@click'}</code> 把用户的点击绑定到一段逻辑。你写的是「视图与数据的对应关系」，
        而不是「DOM 操作的流水账」。
      </p>
      <CodeBlock lang="vue" title="声明式：视图是数据的映射" code={declarativeSnippet} />
      <p>
        上面这段里，列表的每一行都来自 <code>{'todos'}</code> 数组。你永远不用手写
        <code>{'appendChild'}</code> 之类的代码——往 <code>{'todos'}</code> 里增删一项，
        界面上的列表就自动多一行少一行。这就是声明式带来的直觉：<strong>盯着数据，别盯着 DOM</strong>。
      </p>

      <h2>三、「渐进式框架」到底是什么意思</h2>
      <p>
        Vue 官方自称「渐进式框架（The Progressive Framework）」。这四个字常被一带而过，
        但它其实是 Vue 设计哲学的核心：<strong>你可以按需要决定用多少 Vue</strong>，
        从「往现有页面里点一滴」到「撑起一个完整的大型单页应用」之间，是一条平滑的连续光谱，
        而不是一道要么全用要么不用的门槛。
      </p>
      <p>
        最轻量的一端：你完全可以只在一个普通 HTML 页面里加<strong>一个 <code>{'<script>'}</code> 标签</strong>
        引入 Vue，给页面某一小块加上响应式交互，其余部分照旧是静态 HTML。
        这种「增强已有页面」的用法不需要构建工具、不需要打包、不需要脚手架。
      </p>
      <CodeBlock lang="vue" title="最轻一端：一个 script 标签就能用" code={cdnSnippet} />
      <p>
        最重的一端：你用 Vite 搭一个完整工程，写一堆单文件组件，按需引入官方配套库——
        用 <strong>Vue Router</strong> 管理页面路由、用 <strong>Pinia</strong> 管理全局状态，
        最终构建出一个功能完整、可维护的大型单页应用（SPA）。关键在「按需」二字：
        路由、状态管理这些不是强塞给你的，你需要时再引入，不需要时一行都不用写。
      </p>
      <Callout variant="note" title="渐进式 = 平滑的采用曲线">
        渐进式的真正价值，是让 Vue 既能服务「给老项目某个表单加点交互」的小需求，
        也能服务「从零搭一个企业级 SPA」的大需求，而且这两者之间的迁移是顺滑的——
        你的知识和代码可以随着需求增长一点点扩展，不必推倒重来。
      </Callout>

      <h2>四、响应式：一句话直觉</h2>
      <p>
        前面反复说「数据变，视图自动更新」，那框架是<em>怎么知道</em>数据变了的？这就是
        <strong>响应式系统（Reactivity）</strong>要回答的问题。它的一句话直觉是：
      </p>
      <KeyIdea>
        响应式数据被框架<strong>代理（proxy）</strong>包了一层。当你<strong>读</strong>它时，
        框架悄悄记下「谁用到了这份数据」（收集依赖）；当你<strong>写</strong>它时，
        框架就去通知所有用到它的地方「该更新了」（派发更新）。读时记账、写时通知，仅此而已。
      </KeyIdea>
      <p>
        换句话说，Vue 在你访问数据的那一刻就在背后建立了一张「谁依赖谁」的关系网。
        某个组件的渲染函数读了 <code>{'count'}</code>，这层关系就被记录下来；
        之后只要 <code>{'count'}</code> 被改写，Vue 就精确地知道「只有这个组件需要重渲染」，
        于是定向更新，而不是把整个页面推倒重来。
      </p>
      <CodeBlock lang="vue" title="响应式的几种基本形态" code={reactiveIntuitionSnippet} />
      <p>
        这里的 <code>{'ref'}</code>、<code>{'reactive'}</code>、<code>{'computed'}</code> 是后面章节会反复出现的主角，
        现在你只需要抓住直觉：它们都是「被代理过、能被追踪」的数据。
        <code>{'computed'}</code> 尤其能说明问题——它是「被推导出来的数据」，
        一旦它依赖的源头变了，它会自动失效并重新计算，无需你手动触发。
      </p>
      <Callout variant="tip" title="ref 为什么要 .value">
        基本类型（数字、字符串）没法直接被代理，所以 <code>{'ref'}</code> 用一个对象把值包起来，
        真正的值放在 <code>{'.value'}</code> 上——读写 <code>{'.value'}</code> 才能触发依赖收集与派发。
        好消息是：在 <code>{'<template>'}</code> 里 Vue 会帮你自动解包，模板里写 <code>{'{{ count }}'}</code> 即可，
        不用写 <code>{'.value'}</code>。
      </Callout>

      <h2>五、Vue 的历史：从 2014 到今天</h2>
      <p>
        Vue 由<strong>尤雨溪（Evan You）</strong>在 <strong>2014 年</strong>发布。
        他当时在 Google 做项目，受 Angular 启发又觉得它太重，于是抽取出「数据驱动视图」
        这一最迷人的部分，做成一个轻巧、好上手的库。Vue 一开始就主打「易学、渐进」，
        很快在中文社区和全球都积累了大量拥趸。
      </p>
      <p>
        <strong>Vue 2</strong> 时代，组件的主流写法是 <strong>Options API（选项式 API）</strong>：
        把组件拆成 <code>{'data'}</code>、<code>{'methods'}</code>、<code>{'computed'}</code>、
        <code>{'watch'}</code> 等一个个「选项」对象。这种写法直观、易教，但当组件变大，
        同一个功能的逻辑会散落在不同选项块里，难以聚合复用。
      </p>
      <p>
        <strong>2020 年</strong>，<strong>Vue 3</strong> 正式发布，带来两个深远变化：一是引入
        <strong>Composition API（组合式 API）</strong>，让你能按「逻辑关注点」而非「选项类型」
        组织代码，复用逻辑也更自然；二是把底层响应式系统从 Vue 2 的 <code>{'Object.defineProperty'}</code>
        换成了 <strong>Proxy</strong>，从而能侦测到数组下标赋值、新增属性等过去监听不到的变化，能力更完整。
      </p>
      <p>
        <strong>2022 年</strong>，Vue 3 正式成为<strong>默认版本</strong>，官方文档、脚手架、生态库全面转向 Vue 3。
        如今你新建一个 Vue 项目，默认拿到的就是 Vue 3 + Composition API 的现代写法。
      </p>
      <table>
        <thead>
          <tr><th>时间</th><th>里程碑</th><th>意义</th></tr>
        </thead>
        <tbody>
          <tr><td>2014</td><td>尤雨溪发布 Vue</td><td>主打数据驱动、易学、渐进</td></tr>
          <tr><td>Vue 2 时代</td><td>Options API 为主流</td><td>选项式写法直观，但大组件逻辑分散</td></tr>
          <tr><td>2020</td><td>Vue 3 发布</td><td>引入 Composition API + Proxy 响应式</td></tr>
          <tr><td>2022</td><td>Vue 3 切为默认版本</td><td>生态全面转向现代写法</td></tr>
        </tbody>
      </table>

      <h2>六、生态位与对比：Vue 与 React 的取舍</h2>
      <p>
        在今天的前端世界里，Vue 与 React 是最主流的两个选择（外加 Angular、Svelte 等）。
        它们解决的是同一类问题——构建数据驱动的界面——但在「怎么解决」上做了不同取舍。
        理解这些取舍，能帮你判断什么时候用哪个，也能让你学 Vue 时心里有个参照系。
      </p>
      <h3>模板（template）vs JSX</h3>
      <p>
        Vue 默认用<strong>模板</strong>描述视图：贴近 HTML 的语法，配合 <code>{'v-if'}</code>、
        <code>{'v-for'}</code> 等指令，结构一目了然，对设计师和初学者都很友好，且模板的静态结构
        便于编译器做优化。React 则用 <strong>JSX</strong>：在 JavaScript 里直接写类 HTML 的表达式，
        更灵活、更「全是 JS」，但也把视图和逻辑揉在一起，自由度高的代价是约束少。
        （注意：Vue 也支持 JSX，只是模板是它的默认与主流选择。）
      </p>
      <h3>响应式 vs 不可变数据 + 重渲染</h3>
      <p>
        这是两者最本质的分野。Vue 走<strong>细粒度响应式</strong>：数据被代理，框架精确知道哪些视图依赖哪些数据，
        改一处只更新真正受影响的地方，你直接修改数据即可。React 走<strong>不可变 + 重渲染</strong>：
        你用 <code>{'setState'}</code> / <code>{'useState'}</code> 提供新的不可变数据，
        组件函数<strong>重新执行</strong>生成新的虚拟 DOM，再由 diff 决定怎么更新真实 DOM。
        前者「改了哪儿更新哪儿」，后者「重算一遍再对比」，心智模型截然不同。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Vue</th><th>React</th></tr>
        </thead>
        <tbody>
          <tr><td>视图描述</td><td>模板（默认，也支持 JSX）</td><td>JSX</td></tr>
          <tr><td>更新机制</td><td>细粒度响应式，定向更新</td><td>不可变数据 + 组件重渲染 + diff</td></tr>
          <tr><td>改数据方式</td><td>直接改（赋值、push 等）</td><td>用 setState / 返回新对象</td></tr>
          <tr><td>上手曲线</td><td>较平缓，模板贴近 HTML</td><td>需先适应 JSX 与不可变思维</td></tr>
          <tr><td>哲学</td><td>渐进式，框架替你管同步</td><td>库为核心，更「全是 JavaScript」</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="没有谁绝对更好">
        Vue 与 React 都是成熟、强大的方案，选择更多取决于团队习惯、项目类型与生态偏好。
        本课聚焦 Vue，但理解它和 React 的取舍，会让你在「为什么 Vue 这样设计」的问题上有更深的洞察。
      </Callout>

      <h2>七、本章小结与下一步</h2>
      <p>
        这一章我们没有写多少代码，重点在建立<strong>心智模型</strong>：Vue 让你专注于数据，
        视图自动同步；声明式渲染让你描述结果而非过程；渐进式让你按需取用；
        响应式则是这一切背后的引擎。下一章我们就动手——用 Vite 创建一个真正的 Vue 工程，
        写下你的第一个单文件组件，把这些直觉落到可运行的代码上。
      </p>
      <Callout variant="tip">
        下一章：用 <code>{'npm create vue@latest'}</code> 创建工程，认识单文件组件的三段式结构，
        写一个会动的计数器，亲手体验「改数据→视图更新」。
      </Callout>

      <Summary
        points={[
          'Vue 的核心承诺：你只管改数据，视图自动跟着更新——数据是唯一真相源，视图是它的镜像。',
          '声明式渲染：用模板描述「视图与数据的对应关系」，而非手写一步步的 DOM 操作。',
          '渐进式框架：从一个 script 标签增强已有页面，到用 Vite + Router + Pinia 撑起大型 SPA，按需取用、平滑过渡。',
          '响应式一句话直觉：数据被代理，读时收集依赖、写时派发更新，框架据此定向更新视图。',
          '历史脉络：2014 尤雨溪发布；Vue 2 以 Options API 为主；2020 Vue 3 带来 Composition API + Proxy 响应式；2022 Vue 3 成为默认。',
          '与 React 的取舍：模板 vs JSX，细粒度响应式（直接改数据）vs 不可变数据 + 重渲染 + diff，没有谁绝对更好。',
        ]}
      />
    </article>
  )
}
