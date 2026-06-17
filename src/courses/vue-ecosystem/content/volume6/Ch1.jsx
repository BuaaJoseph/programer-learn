import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installSnippet = `# 用包管理器安装官方路由库（Vue 3 对应 Vue Router 4）
npm install vue-router@4
# 或
pnpm add vue-router@4`

const createRouterSnippet = `// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'

// 路由表：每条记录把一个 path 映射到一个组件
const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/about', name: 'about', component: About },
]

const router = createRouter({
  // history 模式：用 HTML5 History API，URL 干净没有 #
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router`

const mountRouterSnippet = `// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)   // 把路由插件装到应用上，注入 router-link / router-view
app.mount('#app')`

const appShellSnippet = `<!-- src/App.vue：整个应用的外壳 -->
<template>
  <header>
    <nav>
      <!-- router-link 渲染成 <a>，但点击不刷新整页，由路由接管 -->
      <router-link to="/">首页</router-link>
      <router-link to="/about">关于</router-link>
      <!-- :to 绑定对象写法，等价于 to="/user/42" -->
      <router-link :to="{ name: 'user', params: { id: 42 } }">用户 42</router-link>
    </nav>
  </header>

  <main>
    <!-- 当前 URL 匹配到的组件会被渲染进这里 -->
    <router-view />
  </main>
</template>`

const historyModeSnippet = `// 两种 history 创建函数

// 1) HTML5 History 模式：URL 形如 https://site.com/about
//    优点：干净、利于 SEO；代价：服务端要把所有路径回退到 index.html
import { createWebHistory } from 'vue-router'
createRouter({ history: createWebHistory(), routes })

// 2) Hash 模式：URL 形如 https://site.com/#/about
//    优点：纯前端、无需服务端配置；代价：带 # 不够美观、对 SEO 略不利
import { createWebHashHistory } from 'vue-router'
createRouter({ history: createWebHashHistory(), routes })`

const serverConfigSnippet = `# history 模式下，刷新 /about 时浏览器会真的向服务端请求 /about，
# 服务端没有这个文件就会 404。解决办法：把所有未匹配的请求回退到 index.html，
# 由前端路由再去解析这个 path。

# Nginx 示例
location / {
  try_files $uri $uri/ /index.html;
}`

const nestedRoutesSnippet = `// 嵌套路由：children 里的 path 是相对父级的
const routes = [
  {
    path: '/settings',
    component: SettingsLayout,   // 父级布局，里面有自己的 <router-view />
    children: [
      // 访问 /settings 时默认渲染的子路由（path 为空字符串）
      { path: '', name: 'settings-home', component: SettingsHome },
      // 访问 /settings/profile
      { path: 'profile', name: 'settings-profile', component: SettingsProfile },
      // 访问 /settings/security
      { path: 'security', name: 'settings-security', component: SettingsSecurity },
    ],
  },
]`

const nestedLayoutSnippet = `<!-- SettingsLayout.vue：父级布局组件 -->
<template>
  <div class="settings">
    <aside>
      <router-link :to="{ name: 'settings-profile' }">资料</router-link>
      <router-link :to="{ name: 'settings-security' }">安全</router-link>
    </aside>
    <section>
      <!-- 子路由组件渲染进这个嵌套的出口 -->
      <router-view />
    </section>
  </div>
</template>`

const dynamicParamSnippet = `// 动态路由参数：用冒号声明占位段
const routes = [
  { path: '/user/:id', name: 'user', component: UserDetail },
]`

const useRouteSnippet = `<!-- UserDetail.vue：读取当前路由信息 -->
<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
// route 是响应式的：/user/42 时 route.params.id === '42'
const userId = computed(() => route.params.id)
// 查询参数 /user/42?tab=posts -> route.query.tab === 'posts'
const tab = computed(() => route.query.tab ?? 'overview')
</script>

<template>
  <h1>用户 {{ userId }}</h1>
  <p>当前标签页：{{ tab }}</p>
</template>`

const useRouterSnippet = `<!-- 编程式导航：在事件回调里跳转 -->
<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goUser() {
  // push：压入历史栈，可以「后退」回到当前页
  router.push({ name: 'user', params: { id: 7 }, query: { tab: 'posts' } })
}

function login() {
  // replace：替换当前历史记录，不留下「后退」入口（适合登录后跳转）
  router.replace({ name: 'home' })
}

function goBack() {
  router.back()   // 等价于浏览器后退
}
</script>`

const redirectAliasSnippet = `const routes = [
  // 重定向：访问 /home 会跳到 /，URL 也变成 /
  { path: '/home', redirect: '/' },

  // 用命名目标做重定向，更稳（path 改了也不怕）
  { path: '/start', redirect: { name: 'home' } },

  // 函数式重定向：根据来源动态决定去向
  { path: '/old/:id', redirect: (to) => ({ name: 'user', params: { id: to.params.id } }) },

  // 别名：URL 保持不变，但多个 path 命中同一组件
  { path: '/', name: 'home', component: Home, alias: ['/index', '/welcome'] },
]`

const notFoundSnippet = `const routes = [
  // ... 其它路由放前面

  // 404 通配：用正则参数捕获任意未匹配路径，放在最后兜底
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
  },
]`

const fullExampleSnippet = `// src/router/index.js —— 一个多页 + 嵌套布局的完整路由表
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/user/:id', name: 'user', component: () => import('@/views/UserDetail.vue') },
  {
    path: '/settings',
    component: () => import('@/views/SettingsLayout.vue'),
    children: [
      { path: '', name: 'settings-home', component: () => import('@/views/SettingsHome.vue') },
      { path: 'profile', name: 'settings-profile', component: () => import('@/views/SettingsProfile.vue') },
      { path: 'security', name: 'settings-security', component: () => import('@/views/SettingsSecurity.vue') },
    ],
  },
  { path: '/home', redirect: '/' },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})`

export default function Ch1() {
  return (
    <article>
      <Lead>
        在传统的多页网站里，每点一个链接，浏览器都向服务端要一个全新的 HTML 页面，整页白屏一闪再重绘。
        而单页应用（SPA）只在首次加载一份外壳，之后切换「页面」全靠 JavaScript 在前端完成。
        要让 SPA 也拥有「不同 URL 对应不同界面、支持前进后退、链接可分享」的体验，就需要一套
        <strong>前端路由</strong>。Vue 官方的方案就是 <strong>Vue Router</strong>。
        这一章我们讲透它的原理：URL 到底是怎么映射到组件的。
      </Lead>

      <h2>一、SPA 路由要解决什么问题</h2>
      <p>
        多页应用（MPA）的导航天然由浏览器和服务端负责：地址栏变了，浏览器发请求，服务端返回页面。
        但 SPA 把渲染搬到了前端，导航这件事也就落到了前端头上。一套合格的前端路由，需要同时解决下面几件事：
      </p>
      <ul>
        <li><strong>不刷新整页</strong>：切换视图时不能整页重载，否则就失去了 SPA「流畅、保持状态」的意义。</li>
        <li><strong>URL 映射视图</strong>：地址栏里的路径要能稳定对应到某个组件，刷新后还能回到同一个界面。</li>
        <li><strong>前进 / 后退</strong>：浏览器的前进后退按钮要正常工作，历史记录要符合用户直觉。</li>
        <li><strong>可分享 / 可收藏</strong>：把 URL 发给别人或存成书签，对方打开能看到一样的界面。</li>
      </ul>
      <p>
        Vue Router 借助浏览器的 <strong>History API</strong>（或 hash）来改写地址栏、维护历史栈，
        同时拦截站内跳转、根据当前路径动态渲染对应组件——这样既改了 URL、维护了历史，又没有真的去请求服务端整页。
      </p>

      <KeyIdea>
        前端路由的本质是：在不向服务端请求新页面的前提下，监听 URL 的变化，并把当前 URL「翻译」成应该渲染的组件。
        URL 是输入，组件树是输出，路由库就是中间那台映射机器。
      </KeyIdea>

      <h2>二、安装与最小骨架</h2>
      <p>
        Vue 3 配套的是 Vue Router 4。安装后，典型用法分三步：定义路由表、创建 router 实例、把它装到应用上。
      </p>
      <CodeBlock lang="js" title="安装 Vue Router 4" code={installSnippet} />
      <CodeBlock lang="js" title="创建 router 实例与路由表" code={createRouterSnippet} />
      <CodeBlock lang="js" title="在 main.js 里挂载路由" code={mountRouterSnippet} />
      <p>
        <code>app.use(router)</code> 这一步很关键：它把路由插件注册进应用，于是模板里就能用
        <code>{'<router-link>'}</code> 和 <code>{'<router-view />'}</code> 这两个全局组件，组件内也能用
        <code>useRoute()</code> / <code>useRouter()</code> 这两个组合式函数。
      </p>

      <h2>三、三个核心角色：router-link、router-view、routes</h2>
      <p>
        理解 Vue Router，先抓住三样东西的分工：
      </p>
      <table>
        <thead>
          <tr><th>角色</th><th>职责</th></tr>
        </thead>
        <tbody>
          <tr><td><code>routes</code> 配置</td><td>声明「哪个 path 对应哪个组件」的映射表，是路由的真相来源。</td></tr>
          <tr><td><code>{'<router-link>'}</code></td><td>声明式导航。渲染成 <code>{'<a>'}</code>，但点击被路由接管，不刷新整页。</td></tr>
          <tr><td><code>{'<router-view />'}</code></td><td>占位出口。当前 URL 匹配到的组件就渲染在这里。</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="vue" title="应用外壳 App.vue" code={appShellSnippet} />
      <p>
        <code>{'<router-link>'}</code> 的 <code>to</code> 既可以是字符串路径，也可以绑定成对象
        （<code>:to="{ name, params, query }"</code>）。对象写法更稳：用命名路由后，即使 path 字符串后来改了，
        链接也不会失效。
      </p>

      <Callout variant="note" title="为什么不用普通的 <a> 标签">
        普通 <code>{'<a href="/about">'}</code> 会触发浏览器整页跳转，向服务端请求新页面——这正是 SPA
        要避免的。<code>{'<router-link>'}</code> 在内部拦截了点击事件，改用 History API 更新 URL，
        然后只重渲染 <code>{'<router-view />'}</code> 里的那部分，体验上是「瞬切」。
      </Callout>

      <h2>四、history 模式 vs hash 模式</h2>
      <p>
        创建 router 时必须传一个 <code>history</code> 选项，它决定了 URL 长什么样、以及对服务端有什么要求。
        两种主流选择：
      </p>
      <CodeBlock lang="js" title="两种 history 创建函数" code={historyModeSnippet} />
      <table>
        <thead>
          <tr><th>对比项</th><th>createWebHistory（history 模式）</th><th>createWebHashHistory（hash 模式）</th></tr>
        </thead>
        <tbody>
          <tr><td>URL 形态</td><td><code>/about</code></td><td><code>/#/about</code></td></tr>
          <tr><td>美观度 / SEO</td><td>干净，利于 SEO</td><td>带 #，对 SEO 略不友好</td></tr>
          <tr><td>服务端配置</td><td>需要把所有路径回退到 index.html</td><td>无需任何服务端配置</td></tr>
          <tr><td>原理</td><td>HTML5 History API（pushState）</td><td>监听 URL 的 hash（# 后部分）变化</td></tr>
        </tbody>
      </table>
      <p>
        关键差异在<strong>服务端配置含义</strong>上。hash 模式里，<code>#</code> 后面的内容浏览器<strong>不会</strong>发给服务端，
        所以刷新 <code>/#/about</code> 时服务端只看到 <code>/</code>，永远能返回 index.html，前端再解析 hash——
        因此纯静态托管也能用。而 history 模式下，刷新 <code>/about</code> 时浏览器会真的请求
        <code>/about</code>，服务端若没配置回退就会返回 404。
      </p>
      <CodeBlock lang="js" title="history 模式所需的服务端回退（Nginx 示例）" code={serverConfigSnippet} />
      <Callout variant="tip">
        能控制服务端（或用 Vercel / Netlify 这类自动配好回退的平台）就优先用 history 模式，URL 更专业；
        如果只能丢到一个不可配置的静态空间（比如某些对象存储直链），hash 模式是省心的兜底选择。
      </Callout>

      <h2>五、嵌套路由：children 与嵌套的 router-view</h2>
      <p>
        真实应用常有「布局套布局」的结构：比如一个「设置」页面，左侧是固定的菜单，右侧才随子菜单切换内容。
        这种「外层框架不变、内层局部切换」的需求，正是<strong>嵌套路由</strong>的用武之地。
      </p>
      <p>
        做法是在父路由里写 <code>children</code> 数组，并在父组件的模板里再放一个
        <code>{'<router-view />'}</code> 作为子路由的出口。注意 <code>children</code> 里的
        <code>path</code> 是<strong>相对</strong>父级的，所以前面不要加斜杠。
      </p>
      <CodeBlock lang="js" title="嵌套路由配置" code={nestedRoutesSnippet} />
      <CodeBlock lang="vue" title="父级布局里的嵌套出口" code={nestedLayoutSnippet} />
      <p>
        于是渲染就分了两层：最外层 <code>App.vue</code> 的 <code>{'<router-view />'}</code> 渲染出
        <code>SettingsLayout</code>，而 <code>SettingsLayout</code> 内部的 <code>{'<router-view />'}</code>
        再渲染出 <code>SettingsProfile</code> 等子组件。切换右侧内容时，左侧菜单和外壳都纹丝不动。
      </p>

      <Example title="嵌套路由的 URL 与渲染对应关系">
        <p>访问 <code>/settings/profile</code> 时，组件树是这样拼起来的：</p>
        <ul>
          <li><code>App.vue</code> 的出口 -&gt; 渲染 <code>SettingsLayout</code></li>
          <li><code>SettingsLayout</code> 的出口 -&gt; 渲染 <code>SettingsProfile</code></li>
        </ul>
        <p>而访问 <code>/settings</code>（无子段）时，命中 <code>path: ''</code> 的默认子路由，渲染 <code>SettingsHome</code>。</p>
      </Example>

      <h2>六、动态参数与 useRoute</h2>
      <p>
        很多页面是「同一个模板、不同数据」，比如用户详情页 <code>/user/1</code>、<code>/user/2</code>……
        没必要为每个 id 写一条路由。用冒号声明<strong>动态参数</strong>即可，匹配到的具体值通过
        <code>useRoute().params</code> 读取。
      </p>
      <CodeBlock lang="js" title="声明动态参数 :id" code={dynamicParamSnippet} />
      <CodeBlock lang="vue" title="组件里用 useRoute 读取参数" code={useRouteSnippet} />
      <Callout variant="warn" title="同路由切参数时组件会被复用">
        从 <code>/user/1</code> 跳到 <code>/user/2</code>，命中的是同一条路由、同一个组件，Vue 默认会
        <strong>复用组件实例而不重新创建</strong>，所以 <code>onMounted</code> 不会再次触发。如果你在
        <code>onMounted</code> 里发了请求，换 id 时数据不会刷新。解决办法是 <code>watch</code> 监听
        <code>{'() => route.params.id'}</code>，或用组件内守卫 <code>onBeforeRouteUpdate</code>（下一章细讲）。
      </Callout>

      <h2>七、编程式导航：useRouter 的 push / replace</h2>
      <p>
        除了点链接，常常需要在代码里主动跳转——比如表单提交成功后跳到详情页。用
        <code>useRouter()</code> 拿到 router 实例，调用它的方法即可。
      </p>
      <CodeBlock lang="vue" title="编程式导航" code={useRouterSnippet} />
      <table>
        <thead>
          <tr><th>方法</th><th>行为</th></tr>
        </thead>
        <tbody>
          <tr><td><code>router.push(target)</code></td><td>压入一条新历史记录，可后退回当前页。最常用。</td></tr>
          <tr><td><code>router.replace(target)</code></td><td>替换当前记录，不留后退入口。适合登录跳转、重定向。</td></tr>
          <tr><td><code>router.back()</code> / <code>forward()</code></td><td>等价于浏览器的后退 / 前进。</td></tr>
        </tbody>
      </table>
      <p>
        <strong>别混淆</strong>：<code>useRoute()</code>（单数、含 route）返回<strong>当前路由信息</strong>（params、query、path），
        是只读的、响应式的；<code>useRouter()</code>（含 router）返回<strong>路由器实例</strong>，用来执行跳转动作。
      </p>

      <h2>八、命名路由与查询参数</h2>
      <p>
        给每条路由起个 <code>name</code>，跳转时就能用 <code>{'{ name: \'user\' }'}</code> 而不是手写 path 字符串。
        好处是：path 改了不用全局搜替换，参数也写得更清楚。<strong>查询参数</strong>（<code>?key=value</code>）
        则通过 <code>query</code> 传递，在目标组件里用 <code>route.query</code> 读取。
      </p>
      <Example title="params 与 query 的区别">
        <ul>
          <li><strong>params</strong>：是路径的一部分，由路由表的 <code>:id</code> 声明，如 <code>/user/42</code>。改了通常意味着「看的是另一个资源」。</li>
          <li><strong>query</strong>：附在 <code>?</code> 后面的可选参数，如 <code>/user/42?tab=posts</code>。常用于筛选、分页、标签等「同一资源的不同视图」。</li>
        </ul>
      </Example>

      <h2>九、重定向、别名与 404 通配</h2>
      <p>
        最后是三个常见的收尾配置：
      </p>
      <ul>
        <li><strong>重定向 redirect</strong>：访问 A 自动跳到 B，URL 也变成 B。适合旧路径迁移。</li>
        <li><strong>别名 alias</strong>：多个 path 命中同一组件，但 URL 保持你访问时的样子<strong>不变</strong>——这是它和 redirect 的核心区别。</li>
        <li><strong>404 通配</strong>：用正则参数 <code>/:pathMatch(.*)*</code> 兜住所有未匹配路径，放在路由表<strong>最后</strong>。</li>
      </ul>
      <CodeBlock lang="js" title="重定向与别名" code={redirectAliasSnippet} />
      <CodeBlock lang="js" title="404 通配兜底" code={notFoundSnippet} />

      <h2>十、把它们拼成一个完整路由表</h2>
      <p>
        下面这份路由表融合了本章所有要点：多页、嵌套布局、动态参数、重定向、404 兜底，可直接作为项目骨架。
      </p>
      <CodeBlock lang="js" title="一个多页 + 嵌套布局的完整路由表" code={fullExampleSnippet} />
      <Callout variant="tip">
        下一章我们给这份路由表加上「保安」：用导航守卫做登录鉴权、用 <code>meta</code> 标记哪些页面需要登录，
        并把组件改成路由级懒加载，让首屏只下载真正用到的代码。
      </Callout>

      <Summary
        points={[
          'SPA 路由要解决四件事：不刷新整页、URL 映射视图、支持前进后退、URL 可分享可收藏。',
          'Vue 3 用 Vue Router 4：定义 routes 路由表，createRouter 创建实例，app.use(router) 装载。',
          '三个核心角色：routes（映射真相）、router-link（声明式导航、不整页刷新）、router-view（组件渲染出口）。',
          'history 模式 URL 干净但需服务端把路径回退到 index.html；hash 模式带 # 但无需服务端配置。',
          '嵌套路由用 children + 父组件里再放一个 router-view；children 的 path 相对父级，不加斜杠。',
          '动态参数用 :id 声明，useRoute().params 读取（同路由切参数会复用组件，需 watch）；编程式导航用 useRouter().push / replace。',
          '命名路由用 name 跳转更稳；params 是路径段、query 是 ? 后参数；redirect 会改 URL、alias 不改；404 用 /:pathMatch(.*)* 兜底放最后。',
        ]}
      />
    </article>
  )
}
