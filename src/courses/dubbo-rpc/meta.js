export const meta = {
  slug: 'dubbo-rpc',
  title: 'RPC 与 Dubbo：从原理到服务治理',
  shortTitle: 'RPC 与 Dubbo',
  subtitle: 'RPC Internals & Dubbo',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🔗',
  coverScene: 'rpccall',
  accent: '#0e835a',
  pricing: 'free',
  description:
    '用具体例子讲透 RPC：像调本地方法一样调远程到底怎么实现、一次调用的全过程、为什么要自定义序列化与协议；再深入 Dubbo 架构与四大核心——注册发现、负载均衡、集群容错，以及 SPI 与服务治理。每章配可交互的动态图。',
  audience: [
    '用过 Dubbo/Feign 但说不清「一次远程调用到底经过哪些步骤」的工程师',
    '面试常被问 RPC 原理、注册发现、负载均衡、集群容错、SPI 的人',
    '要做微服务拆分、服务治理与选型的后端开发者',
  ],
  outcomes: [
    '讲清 RPC 的本质与一次调用的全过程（代理/序列化/传输/容错）',
    '理解 Dubbo 架构与服务注册发现机制',
    '掌握负载均衡与集群容错的各种策略及适用场景',
    '了解 Dubbo SPI、服务治理（超时/重试/限流/降级）与 RPC vs HTTP 选型',
  ],
}

export default meta
