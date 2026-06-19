import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const csrFlowSnippet = `<!-- CSR 下浏览器最初拿到的 HTML 几乎是空壳 -->
<!DOCTYPE html>
<html>
  <head><title>我的应用</title></head>
  <body>
    <div id="app"></div>        <!-- 真正的内容此刻还不存在 -->
    <script src="/assets/index-abc123.js"></script>
  </body>
</html>

<!-- 浏览器要先下载、解析、执行这段 JS，Vue 才在客户端把界面「画」出来。
     在那之前，用户看到的是空白；搜索引擎爬到的也是空壳。 -->`

const renderToStringSnippet = `// server.js —— Vue 官方 SSR 的最小骨架（Node 端）
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

// 注意：用 createSSRApp 而不是 createApp，它专为服务端渲染设计
const app = createSSRApp({
  data: () => ({ count: 1 }),
  template: \`<button>已点击 \${'{{ count }}'} 次</button>\`,
})

// 把组件树同步渲染成一段 HTML 字符串
const html = await renderToString(app)

// 这段 html 是带真实内容的，可以直接塞进页面骨架返回给浏览器
console.log(html)  // => <button>已点击 1 次</button>`

const serverSnippet = `// 用任意 Node 服务框架把渲染结果拼进完整页面
import express from 'express'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.js'

const server = express()

server.get('*', async (req, res) => {
  const app = createSSRApp(App)
  const appHtml = await renderToString(app)

  // 服务端把内容直接写进 #app，浏览器一拿到就有东西可看
  res.send(\`<!DOCTYPE html>
<html>
  <head><title>SSR 示例</title></head>
  <body>
    <div id="app">\${appHtml}</div>
    <script type="module" src="/entry-client.js"></script>
  </body>
</html>\`)
})

server.listen(3000)`

const hydrateSnippet = `// entry-client.js —— 客户端入口，负责「注水」(hydration)
import { createSSRApp } from 'vue'
import App from './App.js'

const app = createSSRApp(App)

// 关键：用 mount 接管服务端已经渲染好的 DOM，而不是重新创建。
// Vue 会复用现有节点、只挂上事件监听与响应式，这一步就叫 hydration。
app.mount('#app')`

const mismatchSnippet = `<script setup>
// 反例：服务端和客户端渲染出不同内容，会触发 hydration mismatch 警告
// 服务端渲染时 Date.now() 是一个值，客户端注水时又是另一个值
const now = Date.now()
</script>

<template>
  <p>当前时间戳：{{ now }}</p>
</template>

<!-- 控制台会报：Hydration text mismatch。
     正确做法：把这类「仅客户端」的差异放到 onMounted 里，
     或用 <ClientOnly>（Nuxt 提供）包裹，避免两端渲染结果不一致。 -->`

const nuxtPagesSnippet = `<!-- Nuxt 基于文件的路由：目录结构即路由表 -->
pages/
  index.vue            ->  /
  about.vue            ->  /about
  posts/
    index.vue          ->  /posts
    [id].vue           ->  /posts/:id   动态路由，[id] 即参数

<!-- 你不用手写 router 配置，Nuxt 扫描 pages/ 自动生成 -->`

const useFetchSnippet = `<script setup>
// Nuxt 的数据获取：useFetch 在服务端先取数，结果随 HTML 一起下发，
// 客户端注水时直接复用，不会重复请求。
const route = useRoute()
const { data: post, pending, error } = await useFetch(
  \`/api/posts/\${route.params.id}\`
)

// useAsyncData 更通用：你自己写取数函数，它负责 SSR 协调与缓存
// const { data } = await useAsyncData('post', () => $fetch('/api/...'))
</script>

<template>
  <p v-if="pending">加载中…</p>
  <article v-else-if="post">
    <h1>{{ post.title }}</h1>
    <div v-html="post.body" />
  </article>
</template>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        我们这一整门课，从模板语法到组合式 API、从 Pinia 到 Vue Router，讲的几乎都是
        「浏览器里」的事——这套默认模式叫<strong>客户端渲染（CSR）</strong>。但当你要做一个
        需要被搜索引擎收录的内容站、或者追求极致首屏速度的页面时，CSR 就会暴露短板。
        这一章我们把视野从浏览器扩展到服务器：先讲清 CSR 的痛点，对比
        CSR / SSR / SSG / ISR 四种渲染策略，再看 Vue 自带的 SSR 能力是怎么回事，
        最后认识 Vue 的全栈框架 <strong>Nuxt</strong>，以及「到底什么时候才需要它」。
      </Lead>

      <h2>一、客户端渲染（CSR）的短板</h2>
      <p>
        我们平时用 Vite 起的 Vue 项目，默认就是 CSR：服务器只返回一个几乎空白的 HTML 外壳，
        里面一个空的 <code>{'<div id="app">'}</code> 和一坨打包后的 JavaScript。浏览器必须先
        把这堆 JS 下载、解析、执行完，Vue 才在<strong>客户端</strong>把界面一笔一笔画出来。
      </p>
      <CodeBlock lang="vue" title="CSR：浏览器最初拿到的是空壳" code={csrFlowSnippet} />
      <p>这个「先下 JS、再画界面」的流程带来三个典型问题：</p>
      <ul>
        <li>
          <strong>首屏白屏</strong>：在 JS 下载并执行完之前，用户盯着的是一片空白。
          应用越大、网络越慢，白屏越久。这段时间也叫「白屏时间」或首次内容绘制延迟。
        </li>
        <li>
          <strong>SEO 不友好</strong>：很多搜索引擎爬虫、社交平台抓取器拿到的就是那个空壳 HTML，
          里面没有真实内容。虽然主流引擎能执行 JS，但执行有延迟、有配额，内容站靠 CSR 做 SEO
          风险很大。
        </li>
        <li>
          <strong>慢设备吃力</strong>：把「渲染界面」这件事完全压在用户的设备上，低端手机、
          老旧机器跑起来明显卡顿——渲染成本从服务器转嫁到了最弱的那一环。
        </li>
      </ul>

      <h2>二、四种渲染策略：CSR / SSR / SSG / ISR</h2>
      <p>
        解决上面问题的思路，本质是「把渲染这件事，挪一部分到服务器或构建阶段去做」。
        按「在哪里、什么时候生成 HTML」可以分成四种主流策略：
      </p>
      <table>
        <thead>
          <tr>
            <th>策略</th>
            <th>HTML 在哪里 / 何时生成</th>
            <th>首屏</th>
            <th>SEO</th>
            <th>典型场景</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CSR</strong> 客户端渲染</td>
            <td>浏览器运行时，由 JS 生成</td>
            <td>慢（先下 JS）</td>
            <td>差</td>
            <td>后台管理、登录后应用</td>
          </tr>
          <tr>
            <td><strong>SSR</strong> 服务端渲染</td>
            <td>每次请求时，服务器现渲染</td>
            <td>快（直接给内容）</td>
            <td>好</td>
            <td>动态内容、个性化页面</td>
          </tr>
          <tr>
            <td><strong>SSG</strong> 静态站点生成</td>
            <td>构建时一次性渲染成静态文件</td>
            <td>最快（纯静态）</td>
            <td>好</td>
            <td>博客、文档、营销页</td>
          </tr>
          <tr>
            <td><strong>ISR</strong> 增量静态再生</td>
            <td>构建时生成 + 运行时按需后台重生</td>
            <td>最快（命中缓存）</td>
            <td>好</td>
            <td>内容多、更新不频繁的大站</td>
          </tr>
        </tbody>
      </table>
      <KeyIdea>
        这四者不是「谁取代谁」，而是把「生成 HTML 的时机」放在了不同位置：CSR 放在
        浏览器运行时，SSR 放在每次请求时，SSG 放在构建时，ISR 则是「构建时打底 + 运行时
        按需增量更新」的折中。选哪种，取决于你的内容多不多、变不变、要不要被搜索引擎收录。
      </KeyIdea>
      <p>
        补充理解几个概念：<strong>SSG</strong> 把页面在打包阶段就渲染成一堆现成的
        <code>.html</code> 文件，部署后服务器只是把文件原样吐出去，所以最快、最便宜，
        但内容一旦变化就得重新构建。<strong>ISR</strong> 是 SSG 的进化：先用构建时的静态版本
        顶上，等到了设定的过期时间，再在后台悄悄重新生成那一页，兼顾「静态的快」和
        「能更新」。<strong>SSR</strong> 则是每来一个请求就现场渲染一次，最灵活、最适合
        千人千面的动态内容，代价是需要一台一直在跑的服务器。
      </p>

      <h2>三、Vue 自带的 SSR 基础</h2>
      <p>
        很多人以为 SSR 必须上框架，其实 Vue 核心包就内置了 SSR 能力。理解这层「裸 SSR」，
        能帮你看穿 Nuxt 这类框架底下到底在做什么。它的关键就两个 API：服务端的
        <code>renderToString</code> 和创建实例的 <code>createSSRApp</code>。
      </p>
      <CodeBlock lang="js" title="renderToString：把组件渲染成 HTML 字符串" code={renderToStringSnippet} />
      <p>
        注意这里用的是 <code>createSSRApp</code> 而不是我们前面一直用的 <code>createApp</code>。
        前者专为服务端渲染设计，它创建的实例知道自己是要被「注水」接管的，行为和纯客户端实例
        略有不同。配上一个 Node 服务框架，就能把渲染出来的 HTML 拼进完整页面返回：
      </p>
      <CodeBlock lang="js" title="把 SSR 结果拼进页面返回给浏览器" code={serverSnippet} />

      <h3>客户端注水（hydration）</h3>
      <p>
        服务端只是「画好了静态的 HTML」，但这些 DOM 还没有事件监听、没有响应式——
        点按钮没反应。让这堆静态 DOM「活过来」的过程，就叫<strong>注水（hydration）</strong>。
        客户端的 Vue 不会推倒重来，而是复用服务端已经渲染好的节点，只补上交互逻辑。
      </p>
      <CodeBlock lang="js" title="entry-client.js：客户端注水" code={hydrateSnippet} />
      <p>
        这里同样用 <code>createSSRApp</code> 创建实例，再调用 <code>mount</code> 接管现有 DOM。
        因为是「接管」而非「重建」，所以服务端和客户端必须渲染出<strong>完全一致</strong>的内容，
        否则就会出问题。
      </p>

      <h3>注水不匹配（hydration mismatch）的坑</h3>
      <p>
        最常见的 SSR 翻车现场，就是<strong>注水不匹配</strong>：服务端渲染出的 HTML 和客户端
        注水时算出来的内容对不上。Vue 会在控制台报 hydration mismatch 警告，轻则界面闪一下、
        重则交互错乱。
      </p>
      <CodeBlock lang="vue" title="反例：会触发注水不匹配的代码" code={mismatchSnippet} />
      <Callout variant="warn" title="两端必须渲染出一致的内容">
        任何「服务端和客户端会算出不同结果」的东西都可能引发不匹配：
        <code>Date.now()</code>、随机数、<code>window</code> / <code>localStorage</code>
        等浏览器专属 API、依赖时区或语言环境的格式化。正确做法是把这类逻辑放进
        <code>onMounted</code>（只在客户端跑），或用 Nuxt 提供的
        <code>{'<ClientOnly>'}</code> 把仅客户端的部分包起来。
      </Callout>

      <h2>四、Nuxt 是什么</h2>
      <p>
        手写上面那套 SSR——服务端入口、客户端入口、路由、数据获取、构建配置——既繁琐又容易出错。
        <strong>Nuxt</strong> 就是 Vue 生态里把这一切打包好的<strong>全栈框架</strong>，
        让你专注写页面，框架替你搞定渲染策略和服务端那一摊。它的核心特性有：
      </p>
      <ul>
        <li>
          <strong>基于文件的路由</strong>：把 <code>.vue</code> 文件丢进 <code>pages/</code> 目录，
          目录结构自动变成路由表，不用手写 Vue Router 配置。
        </li>
        <li>
          <strong>服务端渲染（默认开启）</strong>：Nuxt 默认就是 SSR，也能一键切成 SSG
          （<code>nuxt generate</code>）或纯 CSR，同一套代码适配多种渲染策略。
        </li>
        <li>
          <strong>数据获取</strong>：内置 <code>useFetch</code> / <code>useAsyncData</code>，
          自动协调「服务端先取数、随 HTML 下发、客户端复用」，避免重复请求。
        </li>
        <li>
          <strong>自动导入</strong>：组件、composables、Vue / Nuxt 的 API
          （如 <code>ref</code>、<code>useRoute</code>）都自动导入，不用满文件写 import。
        </li>
      </ul>
      <CodeBlock lang="js" title="基于文件的路由：目录即路由表" code={nuxtPagesSnippet} />
      <CodeBlock lang="vue" title="useFetch：SSR 友好的数据获取" code={useFetchSnippet} />
      <Example title="一句话类比：Nuxt 之于 Vue，约等于 Next 之于 React">
        <p>
          如果你或你的同事熟悉 React 生态：<strong>Nuxt 在 Vue 世界里的定位，
          就相当于 Next.js 在 React 世界里的定位</strong>——都是「在框架之上再封一层」的
          全栈元框架，提供文件路由、SSR / SSG、服务端数据获取、约定式工程结构。
          会其中一个，理解另一个会很快。
        </p>
      </Example>

      <h2>五、何时需要 Nuxt，何时纯 SPA 就够</h2>
      <p>
        SSR / Nuxt 不是「更高级所以更好」，它带来真实的复杂度成本：你得维护一个一直在跑的
        Node 服务、要处理两端一致性、调试链路也更长。所以关键是分清场景。
      </p>
      <table>
        <thead>
          <tr>
            <th>你的项目是…</th>
            <th>推荐</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>博客 / 文档 / 营销官网</td>
            <td>Nuxt（SSG / SSR）</td>
            <td>要被搜索引擎收录，首屏要快</td>
          </tr>
          <tr>
            <td>电商商品页、内容社区</td>
            <td>Nuxt（SSR / ISR）</td>
            <td>既要 SEO，内容又会动态变化</td>
          </tr>
          <tr>
            <td>需要服务端逻辑的全栈小应用</td>
            <td>Nuxt</td>
            <td>自带服务端 API 路由，前后端一把梭</td>
          </tr>
          <tr>
            <td>登录后才能看的后台管理系统</td>
            <td>纯 SPA（CSR）</td>
            <td>不需要 SEO，省掉 SSR 的复杂度</td>
          </tr>
          <tr>
            <td>内部工具、仪表盘</td>
            <td>纯 SPA（CSR）</td>
            <td>用户固定、内容私有，CSR 完全够用</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一条朴素的判断法则">
        先问自己一句：<strong>「这个页面需不需要被搜索引擎收录、需不需要极致首屏？」</strong>
        答案是「需要」就考虑 Nuxt / SSR / SSG；答案是「不需要、用户都得先登录」，
        那纯 SPA（我们前面学的 Vite + Vue Router 那套）就是最省心的选择，别为不存在的
        需求徒增复杂度。
      </Callout>

      <h2>六、边界与注意事项</h2>
      <p>
        最后提几个容易踩的边界：① SSR 环境下没有 <code>window</code> / <code>document</code>，
        任何直接访问浏览器对象的代码都得挪进 <code>onMounted</code> 或做环境判断；
        ② SSR 需要服务器持续运行，部署和成本都比纯静态高，SSG 则可以扔到任意静态托管上；
        ③ 注水不匹配是最常见的 bug 来源，写 SSR 时要时刻意识到「这段代码两端会不会算出不同结果」；
        ④ 并非所有页面都要 SSR——Nuxt 支持按页配置渲染策略，可以混搭。
      </p>

      <Summary
        points={[
          'CSR（客户端渲染）是 Vue 默认模式：服务器只给空壳，靠浏览器跑 JS 画界面，存在首屏白屏、SEO 不友好、慢设备吃力三大短板。',
          '四种渲染策略按「何时何地生成 HTML」区分：CSR（浏览器运行时）、SSR（每次请求）、SSG（构建时）、ISR（构建时打底 + 运行时增量重生）。',
          'Vue 核心内置 SSR 能力：服务端用 renderToString 把组件渲染成 HTML 字符串，实例用 createSSRApp 创建。',
          '客户端注水（hydration）让服务端渲染的静态 DOM「活过来」，复用现有节点补上交互；两端内容必须一致，否则触发注水不匹配（Date.now、随机数、window 等是常见诱因）。',
          'Nuxt 是 Vue 的全栈框架：基于文件的路由、默认 SSR、useFetch / useAsyncData 数据获取、自动导入；定位约等于 React 世界的 Next.js。',
          '内容站 / 要 SEO / 要极致首屏 / 全栈应用就用 Nuxt；登录后的后台管理、内部工具用纯 SPA（CSR）即可，别为不存在的需求增加复杂度。',
        ]}
      />
    </article>
  )
}
