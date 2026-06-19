// iOS 开发 · Swift 与 SwiftUI：9 卷 18 章。slug 规则 i{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'i0',
    index: 0,
    title: '导论：苹果生态与 iOS',
    subtitle: 'The Apple Stack',
    theme: '先看清苹果开发生态：iOS 系统分层、App 运行机制与沙盒，再装好 Xcode、跑通第一个 SwiftUI App，建立全课的心智地图。',
    chapters: [
      { slug: 'i0-c1', title: 'iOS 系统、App 机制与开发生态', topic: '原理', hook: '从 Darwin 内核、Cocoa Touch 到 App 沙盒与生命周期；UIKit 与 SwiftUI 的关系、Swift 与 Objective-C 的历史——一图看清苹果开发栈。', minutes: 90, hasContent: true },
      { slug: 'i0-c2', title: 'Xcode 与第一个 SwiftUI App', topic: '上手', hook: '看懂 Xcode 工程结构、用 Swift Package 管理依赖、在模拟器/真机上跑通第一个 SwiftUI App，理清从代码到屏幕与预览（Preview）的链路。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'i1',
    index: 1,
    title: 'Swift 语言基础',
    subtitle: 'Swift Essentials',
    theme: 'Swift 是安全、现代、富有表达力的语言。讲透它最有特色的可选类型（消灭空指针）、枚举与模式匹配，打好语言地基。',
    chapters: [
      { slug: 'i1-c1', title: 'Swift 基础：let/var、可选类型与解包', topic: '原理', hook: 'let/var、类型推断、可选类型 Optional 如何用类型系统消灭 nil 崩溃；可选绑定 if let/guard let、?./??、强解包的风险——Swift 安全性的核心。', minutes: 120, hasContent: true },
      { slug: 'i1-c2', title: '枚举、模式匹配与错误处理', topic: '原理', hook: '带关联值的枚举（比其它语言强大得多）、switch 模式匹配的穷尽性、Result 类型，以及 throws/try/catch 的错误处理模型。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'i2',
    index: 2,
    title: 'Swift 进阶：协议与值语义',
    subtitle: 'Protocols & Value Types',
    theme: 'Swift 是「面向协议」的语言，且偏爱值类型。讲透 struct vs class 的值/引用语义、协议与协议扩展、泛型与闭包——这是写好 Swift 与 SwiftUI 的关键。',
    chapters: [
      { slug: 'i2-c1', title: '值类型 vs 引用类型：struct 与 class', topic: '原理', hook: 'struct 是值类型（复制）、class 是引用类型（共享）；写时复制、为什么 SwiftUI 偏爱 struct、何时该用 class——值语义如何让状态更可控。', minutes: 150, hasContent: true },
      { slug: 'i2-c2', title: '协议、协议扩展、泛型与闭包', topic: '原理', hook: '面向协议编程（POP）、协议扩展提供默认实现、泛型与 some/any、闭包与尾随闭包语法——SwiftUI 的声明式 API 正建立其上。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'i3',
    index: 3,
    title: 'Swift 并发',
    subtitle: 'Concurrency',
    theme: 'Swift 现代并发模型。讲 async/await 让异步像同步一样读、结构化并发的任务树，以及用 actor 在编译期消灭数据竞争。',
    chapters: [
      { slug: 'i3-c1', title: 'async/await 与结构化并发', topic: '原理', hook: 'async/await 取代回调地狱、Task 与结构化并发、async let 与 TaskGroup 并行、取消传播——iOS 现代异步的写法与心智。', minutes: 150, hasContent: true },
      { slug: 'i3-c2', title: 'actor 与数据隔离', topic: '原理', hook: 'actor 用「同一时刻只有一个任务进入」消灭数据竞争、@MainActor 保证 UI 在主线程、Sendable 检查——编译期的并发安全。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'i4',
    index: 4,
    title: 'SwiftUI 基础',
    subtitle: 'SwiftUI Basics',
    theme: 'SwiftUI 是苹果的声明式 UI 框架。讲透「View 是状态的函数」的范式、View 协议与组合，以及状态驱动（@State/@Binding）这一灵魂机制。',
    chapters: [
      { slug: 'i4-c1', title: 'View 协议与声明式 UI', topic: '原理', hook: 'View 是描述界面的值类型、body 计算属性、用组合而非继承拼界面；对比 UIKit 命令式的 addSubview，理解声明式范式的转变。', minutes: 150, hasContent: true },
      { slug: 'i4-c2', title: '状态驱动：@State 与 @Binding', topic: '原理', hook: 'SwiftUI 里「改状态 → 自动刷新界面」。@State 持有视图私有状态、@Binding 把状态读写权传给子视图——单一数据源与单向数据流。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'i5',
    index: 5,
    title: 'SwiftUI 进阶：布局、列表与导航',
    subtitle: 'Layout & Navigation',
    theme: '把界面做出来、连起来。讲 SwiftUI 的布局体系（Stack/Frame/GeometryReader）、List 与可滚动列表，以及 NavigationStack 的导航与路由。',
    chapters: [
      { slug: 'i5-c1', title: '布局与列表：Stack、Modifier 与 List', topic: '实战', hook: 'VStack/HStack/ZStack 与对齐间距、修饰符（modifier）链的顺序、Frame 与 Spacer；用 List/ForEach 做高性能列表与下拉刷新。', minutes: 150, hasContent: true },
      { slug: 'i5-c2', title: '导航与数据流：NavigationStack 与 @Observable', topic: '实战', hook: 'NavigationStack 的路径驱动导航与深链；跨视图共享状态——@Observable/@Environment（新 Observation 框架）取代 ObservableObject。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'i6',
    index: 6,
    title: '架构：MVVM 与模块化',
    subtitle: 'Architecture',
    theme: '把 App 组织得可维护、可测试。讲 SwiftUI 下的 MVVM、用 @Observable 的 ViewModel 管理状态，以及依赖注入与模块化拆分。',
    chapters: [
      { slug: 'i6-c1', title: 'MVVM 与 @Observable ViewModel', topic: '原理', hook: '为什么要把逻辑从 View 抽到 ViewModel、用 @Observable 暴露状态、View 只读状态发意图——可测、可预测的 SwiftUI 架构。', minutes: 150, hasContent: true },
      { slug: 'i6-c2', title: '依赖注入与模块化', topic: '实战', hook: '用 @Environment / 初始化注入依赖、面向协议解耦让 ViewModel 可 mock；用 Swift Package 把功能拆成模块，提升编译与复用。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'i7',
    index: 7,
    title: '数据：持久化与网络',
    subtitle: 'Data Layer',
    theme: '真实 App 要存数据、要联网。讲 SwiftData（与 Core Data）做本地持久化、URLSession + Codable 做类型安全的网络请求，并用 Repository 统一数据源。',
    chapters: [
      { slug: 'i7-c1', title: 'SwiftData 与本地持久化', topic: '实战', hook: '用 @Model 声明模型、@Query 自动驱动 UI、ModelContext 增删改查；SwiftData 与底层 Core Data 的关系，以及 UserDefaults 的取舍。', minutes: 150, hasContent: true },
      { slug: 'i7-c2', title: 'URLSession + Codable：网络与数据层', topic: '实战', hook: 'async 的 URLSession 请求、用 Codable 自动解析 JSON、错误处理与重试，用 Repository 把网络与本地缓存统一给 ViewModel。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'i8',
    index: 8,
    title: '工程化与发布',
    subtitle: 'Ship It',
    theme: '把 App 做稳、上线。讲性能与调试（Instruments）、测试体系，以及签名、TestFlight 与上架 App Store 的完整发布流程。',
    chapters: [
      { slug: 'i8-c1', title: '性能、调试与测试', topic: '实战', hook: '用 Instruments 找性能/内存问题、SwiftUI 渲染调试、单元测试与 UI 测试（XCTest/Swift Testing）——让 App 在真机上稳定流畅。', minutes: 150, hasContent: true },
      { slug: 'i8-c2', title: '签名、TestFlight 与上架 App Store', topic: '总结', hook: '证书与 Provisioning、Archive 打包、用 TestFlight 做 Beta 分发、App Store 审核与上架流程，收束全课。', minutes: 120, hasContent: true },
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
