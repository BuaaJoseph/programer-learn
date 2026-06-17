// React 生态 · 从原理到工程实战：10 卷 21 章。slug 规则 r{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'r0',
    index: 0,
    title: '导论：React 的心智模型',
    subtitle: 'Mental Model',
    theme: '先想清楚 React 到底解决了什么问题：从命令式操作 DOM 到「声明式 + 组件化」的范式转变，建立贯穿全课的心智模型，并跑通第一个组件。',
    chapters: [
      { slug: 'r0-c1', title: '为什么是 React：声明式与组件化', topic: '动机', hook: '手动 querySelector 改 DOM 为什么会失控？React 用「UI = f(state)」把你从同步 DOM 的泥潭里解放出来——你只描述「长什么样」，它负责「怎么变」。', minutes: 90, hasContent: true },
      { slug: 'r0-c2', title: '环境与第一个组件：Vite + 函数组件', topic: '上手', hook: '用 Vite 起一个 React 工程，写下第一个函数组件，看清一个组件从定义到挂载到屏幕上的完整链路。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'r1',
    index: 1,
    title: 'JSX 与组件',
    subtitle: 'JSX & Components',
    theme: 'JSX 不是模板而是语法糖：它编译成 createElement 调用，产出描述 UI 的对象树。讲透 JSX 的本质、组件组合与 Props 的数据流。',
    chapters: [
      { slug: 'r1-c1', title: 'JSX 的本质：它编译成了什么', topic: '原理', hook: 'JSX 既不是字符串也不是 HTML——它被编译成 React.createElement（或新 JSX 转换的 jsx() 调用），返回一棵描述 UI 的普通对象树（React Element）。', minutes: 120, hasContent: true },
      { slug: 'r1-c2', title: '组件与 Props：自上而下的数据流', topic: '原理', hook: 'Props 只读、单向向下流动；组件靠组合而非继承拼装 UI。讲清 children、props 解构、默认值与「数据向下、事件向上」。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r2',
    index: 2,
    title: '状态与交互',
    subtitle: 'State & Events',
    theme: 'state 是会随时间变化、并驱动 UI 重渲染的数据。讲 useState、事件处理、受控组件与表单，建立「改 state → 自动重渲染」的因果直觉。',
    chapters: [
      { slug: 'r2-c1', title: 'useState 与事件：状态驱动渲染', topic: '原理', hook: 'setState 不是「立即改变量」，而是「请求一次重渲染」。讲清 state 的快照语义、批处理、函数式更新与「为什么不能直接改 state」。', minutes: 120, hasContent: true },
      { slug: 'r2-c2', title: '受控组件与表单：让 React 掌管输入', topic: '实战', hook: '受控组件把表单值交给 state 当唯一数据源（single source of truth）；讲受控 vs 非受控、多字段表单、以及表单状态该不该上库。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r3',
    index: 3,
    title: '渲染原理：虚拟 DOM 与 Fiber',
    subtitle: 'Rendering & Fiber',
    theme: 'React 最该被讲透的部分：一次更新如何从 state 变化，经过 render（算出新元素树）、reconcile（diff）、commit（改真实 DOM）三步落地，以及 Fiber 架构与 key 的作用。',
    chapters: [
      { slug: 'r3-c1', title: '渲染流程：render → reconcile → commit', topic: '原理', hook: '把一次更新拆成三相：render 阶段算出新的元素树（可中断），reconcile 阶段 diff 出最小改动，commit 阶段一次性改真实 DOM。Fiber 让 render 阶段可被打断与恢复。', minutes: 150, hasContent: true },
      { slug: 'r3-c2', title: '重渲染与 key：什么时候、改了什么', topic: '原理', hook: '组件何时重渲染？diff 如何靠 key 复用节点？讲清「父渲染则子默认重渲染」、列表 key 用 index 的坑、以及如何只改最小 DOM。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'r4',
    index: 4,
    title: 'Hooks 深入',
    subtitle: 'Hooks In Depth',
    theme: 'Hooks 让函数组件拥有状态与副作用。讲透 Hooks 的规则与底层链表原理、useEffect 的依赖与清理、useMemo/useCallback/useRef 的取舍，以及如何抽自定义 Hook。',
    chapters: [
      { slug: 'r4-c1', title: 'Hooks 规则与原理：闭包与调用顺序', topic: '原理', hook: 'Hooks 为什么不能写在条件里？因为 React 靠「调用顺序」把每次渲染的 hook 对应到 fiber 上的链表节点。讲透闭包陷阱与心智模型。', minutes: 150, hasContent: true },
      { slug: 'r4-c2', title: 'useEffect：副作用、依赖与清理', topic: '原理', hook: 'effect 是「渲染之后与外部世界同步」，不是生命周期回调。讲依赖数组、清理函数、竞态请求，以及那条「你可能不需要 effect」的金律。', minutes: 150, hasContent: true },
      { slug: 'r4-c3', title: 'useMemo / useCallback / useRef 与自定义 Hook', topic: '实战', hook: 'memo 化是性能优化不是默认操作；useRef 存「不触发渲染的可变值」；把有状态逻辑抽成自定义 Hook 复用。讲清三者取舍与抽象时机。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'r5',
    index: 5,
    title: '状态管理',
    subtitle: 'State Management',
    theme: '组件树一大，状态就需要跨层共享。从 React 自带的 Context 讲起，再到 Redux Toolkit（规范、可追踪）与 Zustand（极简、无样板），讲清各自的取舍与选型。',
    chapters: [
      { slug: 'r5-c1', title: 'Context 与状态提升：先用好原生方案', topic: '原理', hook: 'prop drilling 太烦？先学会状态提升与 Context。但 Context 不是状态管理库——讲清它的定位、重渲染陷阱与适用边界。', minutes: 120, hasContent: true },
      { slug: 'r5-c2', title: 'Redux Toolkit 与 Zustand：两种范式', topic: '实战', hook: 'Redux Toolkit 用 slice/store/单向数据流换可追踪与可预测；Zustand 用一个 hook 式 store 把样板降到最低。同一个计数器/购物车，两种写法对照。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'r6',
    index: 6,
    title: '路由：React Router',
    subtitle: 'Routing',
    theme: '单页应用靠前端路由把 URL 映射到组件。讲 React Router 的路由配置、嵌套路由与 Outlet、动态参数、编程式导航，以及 loader/action 数据路由范式。',
    chapters: [
      { slug: 'r6-c1', title: 'React Router 原理：URL ↔ 组件', topic: '原理', hook: 'SPA 路由如何在不刷新页面的前提下换内容？讲 history API、BrowserRouter vs HashRouter、路由表、嵌套路由与 Outlet、动态参数与编程式导航。', minutes: 120, hasContent: true },
      { slug: 'r6-c2', title: '数据路由：loader / action 与懒加载', topic: '实战', hook: 'Data Router 让数据获取跟着路由走：loader 在进入路由前取数、action 处理提交、lazy 做路由级代码分割。搭一个多页 + 嵌套 + 懒加载的应用。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'r7',
    index: 7,
    title: '数据请求与服务端状态',
    subtitle: 'Data Fetching',
    theme: '服务端数据不是普通 state：它有缓存、过期、重试、竞态等问题。讲 useEffect 取数的痛点，再用 TanStack Query 把「服务端状态」管起来，以及 Suspense 的数据加载范式。',
    chapters: [
      { slug: 'r7-c1', title: '从 useEffect 取数到 TanStack Query', topic: '原理', hook: '手写 loading/error/竞态/缓存太累。TanStack Query 把服务端状态抽象成带缓存、自动重取、去重、失效的 query/mutation——讲清它解决了什么。', minutes: 150, hasContent: true },
      { slug: 'r7-c2', title: 'Suspense 与并发特性：更顺滑的加载', topic: '原理', hook: 'Suspense 让组件「等数据/等代码」时声明式地展示 fallback；配合 useTransition、useDeferredValue 等并发特性，让重更新不卡输入。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r8',
    index: 8,
    title: '性能优化',
    subtitle: 'Performance',
    theme: '先会测，再去优。讲重渲染的定位与消除（memo/useMemo/useCallback、状态下沉、组合）、列表虚拟化、代码分割与懒加载，建立「按需优化」的工程判断。',
    chapters: [
      { slug: 'r8-c1', title: '重渲染优化：先定位再消除', topic: '实战', hook: '用 Profiler 找出多余渲染，再对症下药：React.memo、状态下沉、把昂贵计算 memo 化、用组合避免 context 大面积重渲染。别过早优化。', minutes: 150, hasContent: true },
      { slug: 'r8-c2', title: '代码分割与懒加载：让首屏更快', topic: '实战', hook: 'React.lazy + Suspense 做组件级懒加载，路由级分包，配合预加载与虚拟列表，把首屏体积和长列表渲染压下来。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r9',
    index: 9,
    title: '工程化与生态',
    subtitle: 'Engineering',
    theme: '把 React 放进真实工程：构建工具、SSR/Next.js 概览、组件测试与可访问性。最后给一张生态地图与学习路径，收束全课。',
    chapters: [
      { slug: 'r9-c1', title: 'SSR 与 Next.js 概览：CSR/SSR/SSG/RSC', topic: '原理', hook: '纯客户端渲染有首屏与 SEO 短板。讲清 CSR/SSR/SSG/ISR 的取舍，以及 Next.js 与 React Server Components 把渲染搬到服务端的思路。', minutes: 120, hasContent: true },
      { slug: 'r9-c2', title: '测试与生态地图：收束全课', topic: '总结', hook: '用 React Testing Library 按「用户视角」测组件；再给一张 React 生态地图（构建/状态/路由/数据/UI 库/测试）与一条进阶路径。', minutes: 120, hasContent: true },
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
