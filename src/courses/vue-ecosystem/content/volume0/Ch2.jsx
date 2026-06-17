import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createCmdSnippet = `# 用官方脚手架创建一个 Vue 工程（基于 Vite）
npm create vue@latest

# 它会问你项目名，以及要不要 Router、Pinia、TypeScript、测试等
# 全部可按需勾选；初学先一路默认 / 不勾附加项即可

cd my-vue-app      # 进入刚创建的目录
npm install        # 安装依赖
npm run dev        # 启动开发服务器，终端会打印本地访问地址`

const projectTreeSnippet = `my-vue-app/
├─ index.html          # 唯一的 HTML 入口，里面有 <div id="app">
├─ package.json
├─ vite.config.js      # Vite 配置
└─ src/
   ├─ main.js          # 应用入口：createApp(App).mount('#app')
   ├─ App.vue          # 根组件（单文件组件）
   └─ components/      # 你自己写的组件放这里`

const sfcSnippet = `<!-- HelloWorld.vue —— 单文件组件的三段式结构 -->

<template>
  <!-- 1) 模板：描述视图长什么样 -->
  <p class="greeting">{{ message }}</p>
</template>

<script setup>
// 2) 脚本：组件的逻辑、状态、导入
import { ref } from 'vue'
const message = ref('你好，单文件组件！')
</script>

<style scoped>
/* 3) 样式：只作用于本组件的 CSS */
.greeting {
  color: #42b883;
  font-weight: bold;
}
</style>`

const mainJsSnippet = `// src/main.js —— 应用的入口与挂载链路
import { createApp } from 'vue'
import App from './App.vue'   // 引入根组件
import './style.css'          // 全局样式（可选）

// createApp(根组件) 创建应用实例，再 .mount 到页面上的某个节点
createApp(App).mount('#app')`

const indexHtmlSnippet = `<!-- index.html —— 挂载点就在这里 -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>My Vue App</title>
  </head>
  <body>
    <!-- createApp(App).mount('#app') 会把根组件渲染进这个 div -->
    <div id="app"></div>
    <script type="module" src="/src/main.js"><\/script>
  </body>
</html>`

const counterCompositionSnippet = `<!-- Counter.vue —— 组合式 API + script setup（本课主用写法） -->

<template>
  <div class="counter">
    <p>当前计数：{{ count }}</p>
    <button @click="increment">加一</button>
    <button @click="count = 0">归零</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ref 创建一个响应式的数字
const count = ref(0)

// 在脚本里改 count 要用 .value；模板里则自动解包，直接写 count
function increment() {
  count.value++
}
</script>

<style scoped>
.counter button {
  margin-right: 8px;
}
</style>`

const counterOptionsSnippet = `<!-- 同一个计数器，用选项式 API（Options API）写 —— 作对照 -->

<template>
  <div class="counter">
    <p>当前计数：{{ count }}</p>
    <button @click="increment">加一</button>
    <button @click="count = 0">归零</button>
  </div>
</template>

<script>
export default {
  // data 返回组件的响应式状态
  data() {
    return { count: 0 }
  },
  // methods 里放方法，this 指向组件实例
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>`

const styleScopedSnippet = `<style scoped>
/* scoped 让这段 CSS 只对当前组件生效，不会泄漏到别的组件 */
.title { color: tomato; }
</style>

<!-- 编译后，Vue 会给元素加上独有的属性标记，
     并把选择器改写成类似 .title[data-v-xxxxxx] 的形式，
     从而把样式「圈」在本组件内 -->`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们建立了 Vue 的心智模型，这一章正式动手。我们会用官方脚手架基于
        <strong>Vite</strong> 创建一个真正的工程，认识 Vue 开发的基本单位——
        <strong>单文件组件（SFC，<code>{'.vue'}</code> 文件）</strong>，搞清楚应用是怎么从
        <code>{'main.js'}</code> 一路挂载到页面上的，最后亲手写一个会动的计数器，
        并用组合式与选项式两种写法对照，理解我们为什么主用前者。
      </Lead>

      <h2>一、用 Vite 创建 Vue 工程</h2>
      <p>
        现代 Vue 开发的标准起点是 <strong>Vite</strong>——一个由尤雨溪团队打造的极快的前端构建工具。
        它利用浏览器原生的 ES 模块实现近乎瞬时的开发服务器启动与热更新（HMR），
        体验比传统打包工具流畅得多。官方脚手架 <code>{'create-vue'}</code> 就是基于 Vite 的，
        一行命令就能把工程骨架搭好。
      </p>
      <CodeBlock lang="vue" title="创建并启动一个 Vue 工程" code={createCmdSnippet} />
      <p>
        执行后进入目录、安装依赖、启动开发服务器，终端会打印一个本地地址（通常是
        <code>{'http://localhost:5173'}</code>），打开就能看到初始页面。之后你改任何源码，
        页面会即时刷新。脚手架生成的目录大致如下：
      </p>
      <CodeBlock lang="vue" title="典型的工程目录结构" code={projectTreeSnippet} />
      <Callout variant="note" title="为什么是 Vite 而不是别的">
        Vite 启动快、热更新快，且与 Vue 同源、配合无缝，已是 Vue 官方推荐的默认构建工具。
        老项目里你可能见过基于 Webpack 的 Vue CLI，但新项目一律推荐 <code>{'npm create vue@latest'}</code>。
      </Callout>

      <h2>二、单文件组件（SFC）：三段式结构</h2>
      <p>
        Vue 开发的基本单位是<strong>单文件组件</strong>，文件后缀是 <code>{'.vue'}</code>。
        它的精妙之处在于：把一个组件相关的「结构、逻辑、样式」三件事，
        放进同一个文件的三个区块里，彼此邻近又职责分明。
      </p>
      <KeyIdea>
        一个 <code>{'.vue'}</code> 文件由三段构成：<code>{'<template>'}</code> 写视图结构、
        <code>{'<script setup>'}</code> 写逻辑与状态、<code>{'<style scoped>'}</code> 写只属于本组件的样式。
        关注点集中而不混乱，这是 Vue 组织代码的核心方式。
      </KeyIdea>
      <CodeBlock lang="vue" title="单文件组件的三段式" code={sfcSnippet} />
      <table>
        <thead>
          <tr><th>区块</th><th>职责</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{'<template>'}</code></td><td>视图结构</td><td>类 HTML，支持插值与指令</td></tr>
          <tr><td><code>{'<script setup>'}</code></td><td>逻辑与状态</td><td>组合式 API 的现代写法</td></tr>
          <tr><td><code>{'<style scoped>'}</code></td><td>组件样式</td><td>scoped 让 CSS 只作用于本组件</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="script setup 是什么">
        <code>{'<script setup>'}</code> 是组合式 API 的语法糖：在这个块里顶层声明的变量、函数、
        导入的组件，会<strong>自动暴露</strong>给模板使用，不用再手写 <code>{'return'}</code>。
        它是目前 Vue 3 最简洁、最推荐的组件写法，本课全程使用它。
      </Callout>

      <h2>三、挂载链路：从 main.js 到页面</h2>
      <p>
        组件写好了，应用是怎么「跑起来」并出现在页面上的？这条链路只有三个环节，但很值得看清楚。
        起点是 <code>{'index.html'}</code>，它是整个应用唯一的 HTML 文件，里面有一个空的挂载点
        <code>{'<div id="app">'}</code>，还引入了入口脚本 <code>{'main.js'}</code>。
      </p>
      <CodeBlock lang="vue" title="index.html：挂载点所在" code={indexHtmlSnippet} />
      <p>
        入口脚本 <code>{'main.js'}</code> 做三件事：引入根组件 <code>{'App.vue'}</code>、
        用 <code>{'createApp(App)'}</code> 创建一个应用实例、再用
        <code>{'.mount(\'#app\')'}</code> 把它挂到 <code>{'index.html'}</code> 里那个 <code>{'#app'}</code> 节点上。
        挂载完成后，Vue 接管这个节点，把 <code>{'App.vue'}</code> 及其所有子组件渲染进去。
      </p>
      <CodeBlock lang="vue" title="main.js：创建应用并挂载" code={mainJsSnippet} />
      <Example title="一句话串起整条链路">
        <p>
          <code>{'index.html'}</code> 提供空容器 <code>{'#app'}</code>
          {' → '} <code>{'main.js'}</code> 里 <code>{'createApp(App)'}</code> 造出应用
          {' → '} <code>{'.mount(\'#app\')'}</code> 把根组件 <code>{'App.vue'}</code> 渲染进那个容器。
          一个 Vue 应用通常只有<strong>一个根组件、一次 mount</strong>，其余都是它的子组件。
        </p>
      </Example>

      <h2>四、写第一个组件：一个会动的计数器</h2>
      <p>
        现在把前面的知识落到一个最小但完整的交互组件上——计数器。它要做的事很简单：
        显示一个数字，点「加一」按钮数字加一，点「归零」按钮数字清零。
        我们用<strong>组合式 API + <code>{'<script setup>'}</code></strong>来写。
      </p>
      <CodeBlock lang="vue" title="Counter.vue：组合式 API 写法" code={counterCompositionSnippet} />
      <p>
        拆解一下这个组件用到的几件事：
      </p>
      <ul>
        <li><strong><code>{'ref(0)'}</code></strong>：创建一个初始值为 0 的响应式数据 <code>{'count'}</code>。</li>
        <li><strong>模板插值 <code>{'{{ count }}'}</code></strong>：把 <code>{'count'}</code> 显示到页面上；它变，显示就变。</li>
        <li><strong><code>{'@click'}</code></strong>：监听按钮点击，<code>{'@click="increment"'}</code> 绑定方法，
          <code>{'@click="count = 0"'}</code> 直接写内联表达式。</li>
        <li><strong><code>{'count.value++'}</code></strong>：在脚本里改 <code>{'ref'}</code> 必须通过 <code>{'.value'}</code>；
          但模板里 Vue 自动解包，所以模板写 <code>{'count'}</code> 即可。</li>
      </ul>
      <Callout variant="warn" title="别忘了 .value">
        新手最常见的坑：在 <code>{'<script>'}</code> 里直接写 <code>{'count++'}</code> 而漏掉
        <code>{'.value'}</code>。脚本中操作 <code>{'ref'}</code> 一律要带 <code>{'.value'}</code>，
        只有模板里才自动解包。改的是数据，视图会自己更新——这正是上一章「改数据→视图更新」的承诺在起作用。
      </Callout>

      <h2>五、{'<style scoped>'} 的作用</h2>
      <p>
        计数器里那段 <code>{'<style scoped>'}</code> 看着普通，但 <code>{'scoped'}</code> 这个词很关键。
        默认情况下，CSS 是<strong>全局</strong>的——一个组件里写的 <code>{'.button { ... }'}</code>
        会影响到页面上所有 <code>{'.button'}</code>，组件一多就容易样式互相污染。
      </p>
      <p>
        加上 <code>{'scoped'}</code> 后，Vue 会在编译时给本组件的元素打上一个独有的属性标记，
        并把你的选择器改写成「带这个标记」的形式，于是这段样式<strong>只作用于当前组件</strong>，
        不会泄漏出去，也不会被外部误伤。
      </p>
      <CodeBlock lang="vue" title="scoped 把样式圈在组件内" code={styleScopedSnippet} />
      <Callout variant="tip" title="一个组件一份样式">
        有了 <code>{'scoped'}</code>，你可以放心地在每个组件里用简短、语义化的类名，
        不必担心和别处冲突。这让「组件自带样式」变得安全且自然。
      </Callout>

      <h2>六、两种风格对照：组合式 vs 选项式</h2>
      <p>
        Vue 3 支持两种组织组件逻辑的风格。上面用的是<strong>组合式 API（Composition API）</strong>，
        把状态和逻辑用 <code>{'ref'}</code>、函数等自由组合在 <code>{'<script setup>'}</code> 里。
        而 Vue 2 时代的主流是<strong>选项式 API（Options API）</strong>，
        把组件拆成 <code>{'data'}</code>、<code>{'methods'}</code> 等固定的「选项」。同一个计数器，选项式这样写：
      </p>
      <CodeBlock lang="vue" title="同一个计数器：选项式 API 写法" code={counterOptionsSnippet} />
      <p>
        对照着看：选项式里状态放进 <code>{'data()'}</code> 返回的对象，方法放进 <code>{'methods'}</code>，
        访问状态要用 <code>{'this.count'}</code>，而且<strong>不需要</strong> <code>{'.value'}</code>；
        组合式里则用 <code>{'ref'}</code> 声明、用 <code>{'.value'}</code> 读写，没有 <code>{'this'}</code> 的概念。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>组合式 API（script setup）</th><th>选项式 API</th></tr>
        </thead>
        <tbody>
          <tr><td>状态声明</td><td><code>{'const count = ref(0)'}</code></td><td><code>{'data() { return { count: 0 } }'}</code></td></tr>
          <tr><td>访问状态</td><td><code>{'count.value'}</code>（模板里 <code>{'count'}</code>）</td><td><code>{'this.count'}</code></td></tr>
          <tr><td>方法</td><td>普通函数，顶层声明即可</td><td>放进 <code>{'methods'}</code> 选项</td></tr>
          <tr><td>逻辑组织</td><td>按「关注点」自由组合，易复用</td><td>按「选项类型」分块</td></tr>
          <tr><td>适用</td><td>大组件、逻辑复用、现代项目</td><td>简单组件、Vue 2 习惯、教学入门</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        本课全程主用<strong>组合式 API + <code>{'<script setup>'}</code></strong>。
        它在大型组件里能把相关逻辑聚到一起、便于抽取复用，是 Vue 3 官方推荐的现代写法。
        选项式依然完全可用，了解它能帮你读懂大量存量代码，但我们以组合式为主线。
      </KeyIdea>

      <h2>七、本章小结与下一步</h2>
      <p>
        到这里你已经能创建工程、看懂单文件组件、理解挂载链路，并写出一个会动的组件。
        这是从「知道 Vue 是什么」到「能用 Vue 干活」的关键一跃。接下来的章节，
        我们会深入响应式（<code>{'ref'}</code> / <code>{'reactive'}</code> / <code>{'computed'}</code> / <code>{'watch'}</code>）、
        模板语法与指令、组件通信等核心主题，逐步把这个心智模型填充成扎实的工程能力。
      </p>
      <Callout variant="tip">
        动手建议：把本章的计数器亲手敲一遍跑起来，再试着加一个「减一」按钮，
        体会「只改数据、不碰 DOM」的开发手感。
      </Callout>

      <Summary
        points={[
          '用 npm create vue@latest 基于 Vite 创建工程：进目录、npm install、npm run dev 即可启动。',
          '单文件组件（.vue）三段式：<template> 写结构、<script setup> 写逻辑、<style scoped> 写本组件样式。',
          '挂载链路：index.html 提供 #app 空容器 → main.js 用 createApp(App) 创建应用 → .mount("#app") 渲染根组件。',
          '第一个计数器：ref(0) 建响应式数据，模板插值 {{ count }} 显示，@click 绑定交互，脚本里改要用 .value。',
          'scoped 让样式只作用于当前组件，编译期加属性标记改写选择器，避免全局污染。',
          '组合式 API（本课主用）按关注点组织、便于复用，用 ref + .value，无 this；选项式用 data/methods + this，适合入门与读旧代码。',
        ]}
      />
    </article>
  )
}
