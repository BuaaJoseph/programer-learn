import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const guardLevelsSnippet = `// 三个层级的守卫，触发范围由大到小

// 1) 全局守卫：每一次导航都会经过
router.beforeEach((to, from) => { /* ... */ })
router.afterEach((to, from) => { /* ... */ })

// 2) 路由独享守卫：只在进入「这一条」路由前触发
const routes = [
  { path: '/admin', component: Admin, beforeEnter: (to, from) => { /* ... */ } },
]

// 3) 组件内守卫：写在某个组件里，关心「这个组件」的进出
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'`

const beforeEachReturnSnippet = `// beforeEach 的返回值决定导航走向（Vue Router 4 推荐用 return，而非旧版 next）
router.beforeEach((to, from) => {
  // 返回 false：取消本次导航，留在 from
  if (someBlockedCase) return false

  // 返回一个路由地址：重定向到别处
  if (needRedirect) return { name: 'login' }

  // 返回 true 或不写 return（返回 undefined）：放行
  return true
})`

const nextStyleSnippet = `// 旧式 next 写法仍然支持（与 return 二选一，不要混用）
router.beforeEach((to, from, next) => {
  if (blocked) {
    next(false)              // 取消导航
  } else if (needRedirect) {
    next({ name: 'login' })  // 重定向
  } else {
    next()                   // 放行；务必恰好调用一次
  }
})`

const metaSnippet = `// 用 meta 给路由打标记：这是路由表里携带的「元数据」
const routes = [
  { path: '/', name: 'home', component: Home },                       // 公开
  { path: '/login', name: 'login', component: Login },               // 公开
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },                                    // 需要登录
  },
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: { requiresAuth: true, role: 'admin' },                     // 还需管理员角色
  },
]`

const authGuardSnippet = `// src/router/index.js —— 用全局守卫做登录鉴权
import { useAuthStore } from '@/stores/auth'   // 假设用 Pinia 存登录态

router.beforeEach((to) => {
  const auth = useAuthStore()

  // to.meta.requiresAuth 沿父子路由合并：父级标了，子级也算
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    // 未登录却访问受保护页 -> 跳登录页，并把原目标记到 query，登录后好跳回去
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  // 角色不足
  if (to.meta.role === 'admin' && !auth.isAdmin) {
    return { name: 'home' }
  }

  // 其余情况放行（不写 return 即放行）
})`

const loginRedirectBackSnippet = `<!-- Login.vue：登录成功后跳回原来想去的页面 -->
<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

async function onSubmit(form) {
  await auth.login(form)
  // 读 query 里记下的目标，没有就回首页
  const target = route.query.redirect || { name: 'home' }
  router.replace(target)   // 用 replace，避免后退又回到登录页
}
</script>`

const componentGuardSnippet = `<!-- 组件内守卫：处理「未保存就离开」与「同路由换参数」 -->
<script setup>
import { ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

const dirty = ref(false)   // 表单是否有未保存的改动

// 离开当前组件前触发：可拦截，防止误丢数据
onBeforeRouteLeave((to, from) => {
  if (dirty.value) {
    const ok = window.confirm('有未保存的修改，确定离开？')
    if (!ok) return false   // 取消导航，留在本页
  }
})

// 同一路由、参数变化时触发（如 /user/1 -> /user/2，组件被复用）
onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id) {
    fetchUser(to.params.id)   // 手动重新拉数据，因为组件没重建
  }
})
</script>`

const lazyLoadSnippet = `// 路由级懒加载：把 component 写成「返回 import 的箭头函数」
const routes = [
  // 立即加载（同步 import）：打进主包，首屏就下载
  // import Home from '@/views/Home.vue'

  // 懒加载（动态 import）：打包工具会把它拆成单独的 chunk，
  // 只有真正导航到这条路由时才下载这段代码
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },

  // 用魔法注释命名 chunk，便于在网络面板里辨认
  {
    path: '/admin',
    name: 'admin',
    component: () => import(/* webpackChunkName: "admin" */ '@/views/Admin.vue'),
  },
]`

const scrollBehaviorSnippet = `// scrollBehavior：每次导航后，告诉路由滚动到哪里
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 后退/前进时恢复上次位置，否则回到顶部
    return savedPosition ?? { top: 0 }
  },
})`

const fullAppSnippet = `// src/router/index.js —— 带登录保护 + 懒加载的完整路由
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // 公开页（懒加载）
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },

  // 受保护页：meta 标记 + 懒加载
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },

  // 受保护 + 路由独享守卫（再加一道针对本路由的检查）
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true },
    beforeEnter: () => {
      const auth = useAuthStore()
      if (!auth.isAdmin) return { name: 'home' }
    },
  },

  // 404 兜底
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

// 全局鉴权守卫
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们让 URL 映射到了组件。但真实应用里，导航不能「来者不拒」：后台页面要先登录才能进、
        填了一半的表单不该误关就丢、整站代码也不该一次性全塞进首屏。这一章讲两件事——
        用<strong>导航守卫</strong>在跳转的关键节点插入检查（最典型的就是登录鉴权），
        以及用<strong>路由级懒加载</strong>把代码按页面拆分、按需下载。
      </Lead>

      <h2>一、导航守卫是什么</h2>
      <p>
        导航守卫是 Vue Router 提供的一组钩子：在「从一个路由跳到另一个路由」的过程中，
        给你机会介入——放行、取消、或重定向到别处。最常见的用途就是<strong>鉴权</strong>：
        判断用户能不能进这个页面。守卫拿到两个核心参数：<code>to</code>（要去的目标路由）和
        <code>from</code>（当前来源路由），据此做决定。
      </p>

      <KeyIdea>
        导航守卫的心智模型是「关卡」：每次导航是一趟旅程，守卫是沿途的检查站。检查站可以放你过去、
        把你拦下、或把你引到别的地方。鉴权，本质就是在受保护页面的入口设一道检查站。
      </KeyIdea>

      <h2>二、三个层级：全局、路由独享、组件内</h2>
      <p>
        守卫按「触发范围」分三层，范围由大到小。理解这三层的区别，是用对守卫的前提。
      </p>
      <CodeBlock lang="js" title="三个层级的守卫" code={guardLevelsSnippet} />
      <table>
        <thead>
          <tr><th>层级</th><th>钩子</th><th>触发时机</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td>全局</td><td><code>beforeEach</code> / <code>afterEach</code></td><td>每一次导航都触发</td><td>全站登录鉴权、进度条、埋点</td></tr>
          <tr><td>路由独享</td><td><code>beforeEnter</code></td><td>仅进入某条路由前</td><td>某页特有的准入检查</td></tr>
          <tr><td>组件内</td><td><code>onBeforeRouteLeave</code> / <code>onBeforeRouteUpdate</code></td><td>组件被离开 / 复用时</td><td>未保存提醒、换参数重拉数据</td></tr>
        </tbody>
      </table>
      <p>
        其中 <code>beforeEach</code> 是<strong>前置</strong>守卫，在导航被确认<strong>之前</strong>跑，能拦截；
        <code>afterEach</code> 是<strong>后置</strong>钩子，导航完成后才跑，<strong>不能</strong>取消导航，
        常用来关进度条、记录页面访问。
      </p>

      <h2>三、beforeEach 的返回值：放行、取消、重定向</h2>
      <p>
        Vue Router 4 推荐用<strong>返回值</strong>来控制导航走向，比旧版的 <code>next</code> 回调更清晰、更不易出错。
      </p>
      <CodeBlock lang="js" title="用返回值控制导航" code={beforeEachReturnSnippet} />
      <table>
        <thead>
          <tr><th>返回值</th><th>效果</th></tr>
        </thead>
        <tbody>
          <tr><td><code>true</code> / <code>undefined</code>（不写 return）</td><td>放行，导航继续</td></tr>
          <tr><td><code>false</code></td><td>取消导航，停在 from</td></tr>
          <tr><td>路由地址对象 / 字符串，如 <code>{'{ name: \'login\' }'}</code></td><td>中断当前导航，改去这个新目标（重定向）</td></tr>
        </tbody>
      </table>
      <p>
        如果你维护的是老项目，也会见到 <code>next</code> 回调写法。它和返回值<strong>二选一</strong>，
        千万别在同一个守卫里既 return 又调 next，否则导航会出诡异问题。
      </p>
      <CodeBlock lang="js" title="旧式 next 写法（与 return 二选一）" code={nextStyleSnippet} />
      <Callout variant="warn" title="next 必须恰好调用一次">
        用 <code>next</code> 写法时，每条分支都要确保 <code>next</code> 被调用<strong>且只调用一次</strong>。
        漏调会导致导航永远挂起、页面卡住；多次调用则行为未定义。这正是新版推荐用返回值的原因——
        返回值天然不会「漏写」或「写两次」。
      </Callout>

      <h2>四、用 meta 标记需要登录的路由</h2>
      <p>
        鉴权要解决的第一个问题是：守卫怎么知道「哪些页面需要登录」？办法是给路由挂一个
        <code>meta</code> 字段——它是路由表里随路由携带的<strong>元数据</strong>，可以放任意自定义信息。
        约定俗成用 <code>meta.requiresAuth</code> 标记「此页需登录」。
      </p>
      <CodeBlock lang="js" title="用 meta 给路由打标记" code={metaSnippet} />
      <Callout variant="note" title="meta 会沿父子路由合并">
        在守卫里读 <code>to.meta.requiresAuth</code> 时，Vue Router 会把<strong>匹配到的所有层级</strong>
        （父路由 + 子路由）的 meta 合并起来。所以在父路由上标一次 <code>requiresAuth</code>，
        其下所有子路由都会被自动保护，不必逐个标。
      </Callout>

      <h2>五、用 beforeEach 做登录鉴权与重定向</h2>
      <p>
        把 meta 标记和全局守卫合起来，登录鉴权就成型了：每次导航前，检查目标是否需要登录、
        用户是否已登录；不满足就重定向到登录页，并把<strong>原本想去的地址</strong>记在
        <code>query.redirect</code> 里，登录成功后再跳回去。
      </p>
      <CodeBlock lang="js" title="全局鉴权守卫" code={authGuardSnippet} />
      <CodeBlock lang="vue" title="登录后跳回原目标" code={loginRedirectBackSnippet} />
      <Example title="一次被拦截的导航全过程">
        <ul>
          <li>未登录用户点链接想去 <code>/dashboard</code>。</li>
          <li><code>beforeEach</code> 触发：发现 <code>to.meta.requiresAuth</code> 为真，但 <code>isLoggedIn</code> 为假。</li>
          <li>守卫返回 <code>{'{ name: \'login\', query: { redirect: \'/dashboard\' } }'}</code>，导航被改向登录页。</li>
          <li>用户登录成功，<code>Login.vue</code> 读出 <code>route.query.redirect</code>，<code>router.replace(\'/dashboard\')</code> 跳回。</li>
        </ul>
      </Example>
      <Callout variant="warn" title="别造成重定向死循环">
        守卫里跳登录页时，要确保登录页本身<strong>不</strong>需要登录（即 <code>/login</code> 不带
        <code>requiresAuth</code>）。否则未登录访问 <code>/login</code> 又被拦回 <code>/login</code>，
        无限循环。一个稳妥写法是：只在「目标需登录且未登录」时才重定向，其余一律放行。
      </Callout>

      <h2>六、路由独享守卫 beforeEnter</h2>
      <p>
        如果某个准入逻辑只属于<strong>一条</strong>路由，没必要塞进全局 <code>beforeEach</code> 里挨个 if 判断，
        直接写在那条路由的 <code>beforeEnter</code> 上更内聚。它只在进入该路由时触发，参数和返回值规则与
        <code>beforeEach</code> 一致。比如「<code>/admin</code> 额外要求管理员角色」就很适合放这儿。
      </p>

      <h2>七、组件内守卫：离开拦截与同路由更新</h2>
      <p>
        有些检查天然属于<strong>组件自己</strong>，组合式 API 提供了两个钩子：
      </p>
      <ul>
        <li><code>onBeforeRouteLeave</code>：离开当前组件前触发。经典场景是「表单有未保存改动，离开前确认」。</li>
        <li><code>onBeforeRouteUpdate</code>：同一路由、参数变化导致组件被复用时触发。用来手动重新拉数据。</li>
      </ul>
      <CodeBlock lang="vue" title="组件内守卫" code={componentGuardSnippet} />
      <Callout variant="note" title="为什么需要 onBeforeRouteUpdate">
        上一章提到，<code>/user/1</code> 跳 <code>/user/2</code> 时组件被复用、不重建，<code>onMounted</code>
        不会再跑。<code>onBeforeRouteUpdate</code> 正是补这个缺口：参数一变它就触发，你在里面按新参数重新请求数据即可。
      </Callout>

      <h2>八、路由级懒加载：按需下载，做代码分割</h2>
      <p>
        默认情况下，所有路由组件都会被打进主包，用户首次访问就得下载整站的代码——页面越多首屏越慢。
        <strong>路由级懒加载</strong>的思路是：把 <code>component</code> 从「直接 import 的组件」改成
        「一个返回 <code>import()</code> 的箭头函数」。打包工具看到动态 <code>import()</code>，会自动把这个组件
        拆成独立的 chunk，<strong>只有真正导航到该路由时才下载</strong>。
      </p>
      <CodeBlock lang="js" title="把路由组件改成懒加载" code={lazyLoadSnippet} />
      <table>
        <thead>
          <tr><th>写法</th><th>打包结果</th><th>下载时机</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{'component: Home'}</code>（静态 import）</td><td>打进主包</td><td>首屏一次性下载</td></tr>
          <tr><td><code>{'component: () => import(...)'}</code></td><td>拆成单独 chunk</td><td>导航到该路由时才下载</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        懒加载的收益是「首屏更快」：把不常用、不在首屏的页面延后加载，让用户尽早看到主界面。
        代价是首次进入这些页面时会有一次小的网络请求，但通常远小于「首屏拖着全站代码」的损失。
      </KeyIdea>
      <Callout variant="tip">
        实践建议：首页、登录页这类高频或首屏页可以考虑同步加载，其余页面一律懒加载。
        对体积大的页面（图表、富文本编辑器等）尤其值得拆，避免它们拖慢整个应用的启动。
      </Callout>

      <h2>九、滚动行为 scrollBehavior（一句话）</h2>
      <p>
        创建 router 时可传 <code>scrollBehavior</code>，控制每次导航后页面滚到哪——
        通常「后退/前进恢复原位置、否则回到顶部」就够用了。
      </p>
      <CodeBlock lang="js" title="scrollBehavior 一例" code={scrollBehaviorSnippet} />

      <h2>十、合起来：带登录保护 + 懒加载的完整应用</h2>
      <p>
        下面把本章要点拼成一份可直接用的路由配置：meta 标记受保护页、全局守卫做鉴权与重定向、
        路由独享守卫做管理员校验、所有页面懒加载、加上滚动行为。
      </p>
      <CodeBlock lang="js" title="带登录保护 + 懒加载的完整路由" code={fullAppSnippet} />
      <Callout variant="tip">
        到这里，你已经能搭出一个「URL 映射视图、嵌套布局、登录保护、按需加载」的完整 SPA 路由层。
        守卫负责「能不能进」，懒加载负责「进得快不快」，两者一起把路由从「能用」推到了「好用」。
      </Callout>

      <Summary
        points={[
          '导航守卫分三层：全局（beforeEach / afterEach）、路由独享（beforeEnter）、组件内（onBeforeRouteLeave / onBeforeRouteUpdate）。',
          'beforeEach 是前置可拦截，返回 true/undefined 放行、false 取消、路由对象重定向；afterEach 后置不可取消。新版用返回值优于旧式 next 回调（next 必须恰好调一次）。',
          '用 meta.requiresAuth 标记需登录的路由，meta 会沿父子路由合并，父级标一次子级全保护。',
          '鉴权常规做法：beforeEach 里判断 to.meta.requiresAuth + 登录态，未登录则重定向到 login 并用 query.redirect 记下原目标，登录后跳回；注意 login 页本身别需要登录以免死循环。',
          'beforeEnter 适合只属于某条路由的准入检查；组件内 onBeforeRouteLeave 做离开拦截、onBeforeRouteUpdate 在同路由换参数时重拉数据。',
          '路由级懒加载把 component 写成 () => import(...)，打包工具拆成独立 chunk，按需下载、加快首屏。',
          'scrollBehavior 控制导航后的滚动位置（后退恢复原位、否则回顶部）。',
        ]}
      />
    </article>
  )
}
