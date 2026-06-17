// Android 开发 · Kotlin 与 Jetpack Compose：9 卷 18 章。slug 规则 a{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'a0',
    index: 0,
    title: '导论：Android 全景',
    subtitle: 'The Big Picture',
    theme: '先看清 Android 是什么：系统分层架构、App 是怎么被系统运行起来的，再把开发环境搭好、跑通第一个 App，建立全课的心智地图。',
    chapters: [
      { slug: 'a0-c1', title: 'Android 系统架构与 App 运行机制', topic: '原理', hook: '从 Linux 内核、HAL、ART 运行时到 Framework 与应用层——一张分层图看清 Android；再讲 App 如何被打包成 APK、安装、由 Zygote 孵化进程运行。', minutes: 90, hasContent: true },
      { slug: 'a0-c2', title: '环境搭建与第一个 App', topic: '上手', hook: '装好 Android Studio、看懂项目结构（Gradle/manifest/资源）、在模拟器或真机上跑通第一个 Compose App，理清从代码到屏幕的链路。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'a1',
    index: 1,
    title: 'Kotlin 语言核心',
    subtitle: 'Kotlin Essentials',
    theme: 'Kotlin 是 Android 的官方语言。讲透它相比 Java 的关键改进——空安全、简洁语法、函数式特性，以及 Android 异步基石协程的入门。',
    chapters: [
      { slug: 'a1-c1', title: 'Kotlin 基础：空安全、函数与类', topic: '原理', hook: 'val/var、空安全（?./?:/!!）、数据类 data class、扩展函数、高阶函数与 lambda、when/密封类——Kotlin 为何能写得又短又安全。', minutes: 120, hasContent: true },
      { slug: 'a1-c2', title: '协程入门：让异步像同步一样写', topic: '原理', hook: 'suspend 函数、协程作用域与构建器（launch/async）、调度器、结构化并发——Android 处理网络/IO 的现代方式，先建立直觉。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'a2',
    index: 2,
    title: '应用基础：组件与生命周期',
    subtitle: 'Components & Lifecycle',
    theme: 'Android App 由四大组件搭成，由系统调度。讲透 Activity 生命周期（最该理解透的部分）、Intent 通信与页面导航。',
    chapters: [
      { slug: 'a2-c1', title: '四大组件与 Activity 生命周期', topic: '原理', hook: 'Activity/Service/Broadcast/Provider 四大组件各管什么；重点讲 Activity 生命周期回调（onCreate→onResume→onPause→onDestroy）与配置变更、状态保存。', minutes: 150, hasContent: true },
      { slug: 'a2-c2', title: 'Intent 与导航：页面如何跳转', topic: '原理', hook: '显式/隐式 Intent、传参与返回结果（Activity Result API）；再到 Compose 时代的 Navigation 组件做页面路由与回退栈。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'a3',
    index: 3,
    title: 'Jetpack Compose 基础',
    subtitle: 'Compose Basics',
    theme: 'Compose 是 Android 的现代声明式 UI 工具包。讲透「UI = f(state)」的可组合函数模型、状态与重组——这是从命令式 View 体系到声明式的范式转变。',
    chapters: [
      { slug: 'a3-c1', title: '可组合函数：声明式 UI 的范式', topic: '原理', hook: '@Composable 函数描述 UI 而非操作 View；对比传统 XML+findViewById 的命令式写法，理解声明式与组合优于继承。', minutes: 150, hasContent: true },
      { slug: 'a3-c2', title: '状态与重组：remember 与 recomposition', topic: '原理', hook: 'state 变化触发重组（recomposition）只更新受影响的部分；remember/mutableStateOf、状态提升（state hoisting）、副作用 LaunchedEffect——Compose 的灵魂。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'a4',
    index: 4,
    title: 'Compose 进阶：布局、列表与主题',
    subtitle: 'Layouts & Material',
    theme: '把界面做漂亮、做流畅。讲 Compose 的布局体系（Row/Column/Box/Modifier）、高性能列表 LazyColumn，以及 Material 3 主题与动画。',
    chapters: [
      { slug: 'a4-c1', title: '布局与列表：Modifier 与 LazyColumn', topic: '实战', hook: 'Row/Column/Box 与约束布局、Modifier 链式修饰的顺序为何重要、用 LazyColumn 做可回收的长列表（对标 RecyclerView）。', minutes: 150, hasContent: true },
      { slug: 'a4-c2', title: 'Material 3 主题与动画', topic: '实战', hook: 'Material 3 设计系统、动态取色、深色模式、排版与配色；再用 animate*AsState/AnimatedVisibility 给界面加上声明式动画。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'a5',
    index: 5,
    title: '架构：MVVM 与依赖注入',
    subtitle: 'Architecture',
    theme: '把 App 组织得可维护、可测试。讲官方推荐的分层架构、ViewModel 与 StateFlow 管理 UI 状态，以及用 Hilt 做依赖注入。',
    chapters: [
      { slug: 'a5-c1', title: 'MVVM 与 ViewModel / StateFlow', topic: '原理', hook: '官方架构分层（UI/Domain/Data）、ViewModel 为何能跨配置变更存活、用 StateFlow/UiState 把状态单向流给 UI——可测、可预测。', minutes: 150, hasContent: true },
      { slug: 'a5-c2', title: '依赖注入：Hilt 与可测试性', topic: '实战', hook: '为什么要 DI、Hilt 的 @HiltAndroidApp/@Inject/@Module/@HiltViewModel；把仓库注入 ViewModel，让依赖可替换、可 mock 测试。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'a6',
    index: 6,
    title: '数据：本地存储与网络',
    subtitle: 'Data Layer',
    theme: '真实 App 要存数据、要联网。讲 Room 做类型安全的本地数据库、Retrofit + 协程做网络请求，以及 Repository 模式把数据源统一。',
    chapters: [
      { slug: 'a6-c1', title: 'Room：类型安全的本地数据库', topic: '实战', hook: 'Entity/DAO/Database 三件套、编译期校验 SQL、用 Flow 观察数据库变化自动刷新 UI；对比 SharedPreferences/DataStore 的取舍。', minutes: 150, hasContent: true },
      { slug: 'a6-c2', title: 'Retrofit + 协程：网络请求与 Repository', topic: '实战', hook: 'Retrofit 声明式 API + suspend 函数、用 Moshi/kotlinx 序列化 JSON、Repository 统一本地与远程数据源并处理错误。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'a7',
    index: 7,
    title: '异步与后台任务',
    subtitle: 'Async & Background',
    theme: '移动端对异步与后台执行很敏感。深入协程与 Flow 的数据流，以及如何用 WorkManager 等机制可靠地跑后台任务、应对系统对后台的限制。',
    chapters: [
      { slug: 'a7-c1', title: '协程与 Flow 深入：冷流、操作符与背压', topic: '原理', hook: 'Flow 是冷的异步数据流、常用操作符、StateFlow/SharedFlow 热流、在 ViewModel 与 UI 间安全收集（repeatOnLifecycle）。', minutes: 150, hasContent: true },
      { slug: 'a7-c2', title: '后台任务：WorkManager 与系统限制', topic: '实战', hook: '前台/后台/省电限制下如何可靠执行任务：WorkManager 做可延迟的持久化任务、约束与重试，对比前台 Service 的适用场景。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'a8',
    index: 8,
    title: '工程化与发布',
    subtitle: 'Ship It',
    theme: '把 App 做稳、上线。讲权限与多设备适配、性能优化、测试体系，以及打包签名与上架 Google Play / 国内商店的发布流程。',
    chapters: [
      { slug: 'a8-c1', title: '权限、适配与性能优化', topic: '实战', hook: '运行时权限请求、不同屏幕/系统版本适配、Compose 性能（稳定性与重组优化）、内存与启动速度——让 App 在真机上跑得稳。', minutes: 150, hasContent: true },
      { slug: 'a8-c2', title: '测试与发布：签名、打包与上架', topic: '总结', hook: '单元测试/UI 测试（Compose testing）、用 Gradle 构建变体、签名与 AAB 打包、上架 Google Play 与国内商店的流程，收束全课。', minutes: 120, hasContent: true },
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
