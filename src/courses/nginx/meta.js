export const meta = {
  slug: 'nginx',
  title: 'Nginx 通关：反向代理与负载均衡',
  shortTitle: 'Nginx 通关',
  subtitle: 'Reverse Proxy & Load Balancer',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '入门到进阶',
  cover: '🌐',
  coverScene: 'proxy',
  accent: '#15803d',
  pricing: 'free',
  description:
    '用具体例子讲透 Nginx：正向 vs 反向代理、master-worker 与事件驱动为什么能扛高并发、location 匹配规则、负载均衡策略、动静分离与缓存、限流与高可用。每章配可交互的动态图与可复制配置。',
  audience: [
    '会改 Nginx 配置但说不清「它为什么能扛十万并发」的工程师',
    '面试常被问反向代理、负载均衡、location 匹配、限流的人',
    '要做网关、负载均衡、静态资源与限流的开发/运维',
  ],
  outcomes: [
    '讲清正向/反向代理区别与 Nginx 的核心用途',
    '理解 master-worker 架构与事件驱动的高并发原理',
    '掌握 location 匹配规则、负载均衡策略、动静分离与缓存',
    '会用 limit_req/limit_conn 限流，并搭建 keepalived 高可用',
  ],
}

export default meta
