// RPC 与 Dubbo：3 卷 10 章。slug 规则 rpc{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'rpc1',
    index: 1,
    title: 'RPC 原理',
    subtitle: 'RPC Internals',
    theme: 'RPC 的目标是「像调本地方法一样调远程」。看懂一次调用背后的代理、序列化、网络传输，你就抓住了所有 RPC 框架的共同骨架。',
    chapters: [
      { slug: 'rpc1-c1', title: '什么是 RPC：像调本地方法一样调远程', topic: 'RPC 概念', hook: 'RPC 让你 userService.getById(1) 一行代码就调到了另一台机器上的方法，网络细节全被框架藏了起来。', minutes: 90, hasContent: true },
      { slug: 'rpc1-c2', title: '一次 RPC 调用的全过程', topic: 'RPC 调用链路', hook: '动态代理拦截调用 → 序列化参数 → 网络发送 → 服务端反序列化 → 反射执行 → 结果原路返回，这就是全过程。', minutes: 120, hasContent: true },
      { slug: 'rpc1-c3', title: '序列化与协议：为什么不用 Java 原生序列化', topic: '序列化', hook: 'Java 原生序列化又大又慢还不能跨语言；RPC 普遍用 Hessian、Protobuf、Kryo 等更高效的方案。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'rpc2',
    index: 2,
    title: 'Dubbo 架构与核心',
    subtitle: 'Dubbo Core',
    theme: 'Dubbo 在 RPC 之上加了一整套服务治理。这一卷讲清它的架构与三大核心：注册发现、负载均衡、集群容错。',
    chapters: [
      { slug: 'rpc2-c1', title: 'Dubbo 架构：Provider / Consumer / Registry', topic: 'Dubbo 架构', hook: '提供者注册、消费者订阅、注册中心做牵线，调用时消费者直连提供者——注册中心不在调用链路上。', minutes: 120, hasContent: true },
      { slug: 'rpc2-c2', title: '服务注册与发现（ZooKeeper / Nacos）', topic: '注册发现', hook: '提供者上下线，注册中心实时把最新地址列表推给消费者，这样消费者永远调的是活着的节点。', minutes: 120, hasContent: true },
      { slug: 'rpc2-c3', title: '负载均衡：把请求合理分给多个节点', topic: '负载均衡', hook: 'random、roundrobin、leastactive、consistenthash——不同策略决定了请求如何分摊到提供者集群。', minutes: 120, hasContent: true },
      { slug: 'rpc2-c4', title: '集群容错：一个节点失败了怎么办', topic: '集群容错', hook: 'failover 重试别的节点、failfast 快速失败、failsafe 忽略异常、forking 并行调多个——按业务选策略。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'rpc3',
    index: 3,
    title: '进阶与服务治理',
    subtitle: 'Governance',
    theme: 'Dubbo 的扩展性来自 SPI，稳定性来自服务治理。这一卷讲清扩展机制、治理手段与 RPC 的选型。',
    chapters: [
      { slug: 'rpc3-c1', title: 'Dubbo SPI 与扩展机制', topic: 'Dubbo SPI', hook: 'Dubbo 几乎所有组件都能替换，靠的是它增强版的 SPI——按需加载、依赖注入、自适应扩展。', minutes: 120, hasContent: true },
      { slug: 'rpc3-c2', title: '服务治理：超时、重试、限流、熔断降级', topic: '服务治理', hook: '远程调用一定会失败，治理就是给它加上超时、重试、限流、熔断降级这些「安全带」。', minutes: 120, hasContent: true },
      { slug: 'rpc3-c3', title: '选型：Dubbo(RPC) vs Feign(HTTP)', topic: 'RPC 选型', hook: 'RPC 长连接 + 二进制更快、治理更强；HTTP 更通用、跨语言更易——内部高频调用选 RPC，对外开放选 HTTP。', minutes: 90, hasContent: true },
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
  return {
    chapter: FLAT_CHAPTERS[i],
    prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null,
    next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null,
  }
}

export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}
