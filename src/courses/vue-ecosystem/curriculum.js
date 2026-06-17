// Vue 生态 · 从响应式原理到工程实战：10 卷 21 章。slug 规则 v{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'v0',
    index: 0,
    title: '导论：Vue 的心智模型',
    subtitle: 'Mental Model',
    theme: '先想清楚 Vue 解决了什么：用「模板 + 响应式数据」让视图自动跟随状态变化。建立贯穿全课的心智模型，跑通第一个组件，并理清选项式与组合式两种风格。',
    chapters: [
      { slug: 'v0-c1', title: '为什么是 Vue：渐进式与响应式', topic: '动机', hook: 'Vue 的核心承诺：你改数据，视图自动更新。讲清「渐进式框架」的定位、声明式渲染与响应式的直觉，以及 Vue 在前端生态里的位置。', minutes: 90, hasContent: true },
      { slug: 'v0-c2', title: '环境与第一个组件：Vite + SFC', topic: '上手', hook: '用 Vite 起一个 Vue 工程，写下第一个单文件组件（.vue），看清 template/script/style 三段式与一个组件从定义到挂载的链路。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'v1',
    index: 1,
    title: '模板语法与指令',
    subtitle: 'Template & Directives',
    theme: 'Vue 的模板是带指令的增强 HTML，会被编译成渲染函数。讲透插值、绑定、条件、列表、事件等指令，以及 class/style 绑定与模板背后的编译直觉。',
    chapters: [
      { slug: 'v1-c1', title: '模板与指令：v-bind/v-if/v-for/v-on', topic: '原理', hook: '双大括号插值、v-bind 绑属性、v-if/v-show 条件、v-for 列表（与 key）、v-on 事件与修饰符——模板语法一次讲清，并看它编译成什么。', minutes: 120, hasContent: true },
      { slug: 'v1-c2', title: '双向绑定 v-model 与表单', topic: '原理', hook: 'v-model 不是魔法，它是 :value + @input 的语法糖。讲清表单各控件的 v-model、修饰符(.lazy/.number/.trim)，以及组件上的 v-model。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'v2',
    index: 2,
    title: 'Composition API 与 script setup',
    subtitle: 'Composition API',
    theme: 'Vue 3 的核心写法：用 setup 组织逻辑、用 ref/reactive 声明状态。讲透 <script setup>、ref vs reactive、computed/watch，以及它相比选项式 API 的优势。',
    chapters: [
      { slug: 'v2-c1', title: 'ref / reactive 与 script setup', topic: '原理', hook: 'ref 包裝基本类型（.value）、reactive 代理对象；<script setup> 让组合式写法极简。讲清两者取舍、解构会丢响应性的坑与 toRefs。', minutes: 150, hasContent: true },
      { slug: 'v2-c2', title: 'computed 与 watch：派生与侦听', topic: '原理', hook: 'computed 是带缓存的派生值（依赖不变就不重算）；watch/watchEffect 做副作用侦听。讲清两者区别、何时用哪个、以及侦听的清理与时机。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v3',
    index: 3,
    title: '响应式原理',
    subtitle: 'Reactivity Internals',
    theme: 'Vue 最该被讲透的部分：响应式如何实现。从 Vue 2 的 Object.defineProperty 到 Vue 3 的 Proxy，讲透依赖收集（track）与触发更新（trigger）的闭环，以及 ref/computed 的底层。',
    chapters: [
      { slug: 'v3-c1', title: 'Proxy 与依赖收集：track / trigger', topic: '原理', hook: '把响应式拆开看：Proxy 拦截读写，读时 track 收集依赖、写时 trigger 通知重跑。对比 Vue 2 defineProperty 的局限（数组/新增属性）。', minutes: 150, hasContent: true },
      { slug: 'v3-c2', title: 'effect / computed 的实现与响应式陷阱', topic: '原理', hook: 'reactive effect 是依赖收集的承载者；computed 是带缓存的 lazy effect。讲清 ref 为何要 .value、解构丢响应、深浅响应(shallow)、以及常见响应式陷阱。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v4',
    index: 4,
    title: '组件化：通信、插槽、生命周期',
    subtitle: 'Components',
    theme: '把 UI 拆成组件后，组件间如何协作。讲 props/emit 通信、插槽（默认/具名/作用域）、生命周期钩子、provide/inject 跨层注入，以及组件复用模式。',
    chapters: [
      { slug: 'v4-c1', title: '组件通信：props / emit / provide-inject', topic: '原理', hook: 'props 向下、emit 向上、v-model 双向、provide/inject 跨层。讲清单向数据流、defineProps/defineEmits、以及该用哪种通信方式。', minutes: 150, hasContent: true },
      { slug: 'v4-c2', title: '插槽与生命周期：组合与时机', topic: '原理', hook: '插槽让父组件往子组件「填内容」：默认/具名/作用域插槽。再讲生命周期钩子（onMounted/onUnmounted 等）的执行时机与典型用途。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v5',
    index: 5,
    title: '状态管理：Pinia',
    subtitle: 'State with Pinia',
    theme: '组件树一大，状态就要跨组件共享。讲为什么需要状态库、Pinia 的设计（store/state/getters/actions）、组合式与选项式两种写法，以及它相比 Vuex 的简化。',
    chapters: [
      { slug: 'v5-c1', title: 'Pinia 原理：store / state / getters / actions', topic: '原理', hook: 'Pinia 是 Vue 官方推荐的状态库：用 defineStore 定义、state/getters/actions 三件套，天然支持组合式、TS 友好、无 mutation 样板。讲清它和 Vuex 的差异。', minutes: 120, hasContent: true },
      { slug: 'v5-c2', title: '实战：用 Pinia 组织购物车状态', topic: '实战', hook: '搭一个购物车 store：state 存商品、getters 算总价、actions 改数量并调接口；在多个组件里共享，并看 storeToRefs 保持响应性。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v6',
    index: 6,
    title: '路由：Vue Router',
    subtitle: 'Routing',
    theme: '单页应用靠前端路由把 URL 映射到组件。讲 Vue Router 的路由配置、嵌套路由与 router-view、动态参数、编程式导航与导航守卫（鉴权）。',
    chapters: [
      { slug: 'v6-c1', title: 'Vue Router 原理：URL ↔ 组件', topic: '原理', hook: 'createRouter + history 模式、router-link/router-view、嵌套路由、动态参数 :id 与 useRoute、编程式导航 useRouter。讲清 history vs hash 模式。', minutes: 120, hasContent: true },
      { slug: 'v6-c2', title: '导航守卫与懒加载：鉴权与分包', topic: '实战', hook: '全局/路由级/组件内守卫做登录鉴权与拦截；路由级动态 import 做代码分割。搭一个带登录保护与懒加载的多页应用。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v7',
    index: 7,
    title: '渲染机制与编译优化',
    subtitle: 'Rendering & Compiler',
    theme: 'Vue 模板会被编译成渲染函数，产出虚拟 DOM。讲清渲染流程、虚拟 DOM diff，以及 Vue 3 编译期做的优化（静态提升、PatchFlag、Block Tree）为何让它更快。',
    chapters: [
      { slug: 'v7-c1', title: '虚拟 DOM 与渲染流程：template → render', topic: '原理', hook: '模板编译成 render 函数→产出 VNode→挂载/patch 到真实 DOM。讲清 diff 的 key 与同层比较，以及和直接操作 DOM 的取舍。', minutes: 150, hasContent: true },
      { slug: 'v7-c2', title: '编译优化：静态提升 / PatchFlag / Block', topic: '原理', hook: 'Vue 3 在编译期就知道哪些是静态、哪些会变：静态提升复用 VNode、PatchFlag 标记动态部分、Block Tree 跳过静态子树——讲清它为何比 Vue 2 快。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'v8',
    index: 8,
    title: '性能优化与进阶特性',
    subtitle: 'Performance & Advanced',
    theme: '把 Vue 用在真实工程里：性能优化（避免不必要更新、列表虚拟化、异步组件）与进阶特性（Teleport、Suspense、KeepAlive、自定义指令、组合式函数复用）。',
    chapters: [
      { slug: 'v8-c1', title: '性能优化：更新粒度、异步组件与虚拟列表', topic: '实战', hook: '定位多余更新，用 v-once/v-memo、合理的 key、computed 缓存、defineAsyncComponent 懒加载、虚拟列表把性能压下来。', minutes: 150, hasContent: true },
      { slug: 'v8-c2', title: '进阶特性与组合式函数复用', topic: '实战', hook: 'Teleport 传送 DOM、Suspense 等异步、KeepAlive 缓存组件、自定义指令；再把可复用逻辑抽成组合式函数（useXxx），写一个 useMouse/useFetch。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'v9',
    index: 9,
    title: '工程化与生态',
    subtitle: 'Engineering',
    theme: '把 Vue 放进真实工程：构建与 Vite、SSR/Nuxt 概览、组件测试，以及 Vue 2 到 Vue 3 的迁移要点。最后给一张生态地图与学习路径，收束全课。',
    chapters: [
      { slug: 'v9-c1', title: 'SSR 与 Nuxt 概览：CSR/SSR/SSG', topic: '原理', hook: '纯客户端渲染的短板与 SSR/SSG 的取舍；Nuxt 是什么（Vue 的全栈框架：文件路由、数据获取、服务端渲染）；hydration 与适用场景。', minutes: 120, hasContent: true },
      { slug: 'v9-c2', title: '测试、迁移与生态地图：收束全课', topic: '总结', hook: '用 Vitest + Vue Test Utils 测组件；Vue 2→3 迁移要点（组合式、破坏性变更）；最后给一张 Vue 生态地图（Vite/Pinia/Router/Nuxt/UI 库/测试）与进阶路径。', minutes: 120, hasContent: true },
    ],
  },
]

export const FLAT_CHAPTERS = VOLUMES.flatMap((vol) =>
  vol.chapters.map((ch) => ({ ...ch, volumeId: vol.id, volumeIndex: vol.index, volumeTitle: vol.title })),
)
export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length
export const TOTAL_MINUTES = FLAT_CHAPTERS.reduce((sum, ch) => sum + ch.minutes, 0)
export function findChapterBySlug(slug) {
  const i = FLAT_CHAPTERS.findIndex((ch) => ch.slug === slug)
  if (i === -1) return { chapter: null, prev: null, next: null }
  return { chapter: FLAT_CHAPTERS[i], prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null, next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null }
}
export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}
