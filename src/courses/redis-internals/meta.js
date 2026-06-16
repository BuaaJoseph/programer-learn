export const meta = {
  slug: 'redis-internals',
  title: 'Redis 通关 · 数据结构 · 场景 · 高可用',
  shortTitle: 'Redis 通关',
  subtitle: 'Redis for Real Scenarios & Interviews',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🧱',
  coverScene: 'kvgrid',
  accent: '#c0344d',
  pricing: 'free',
  description:
    '不背概念，用具体场景讲透 Redis：缓存、分布式锁、异步消息、布隆过滤器、排行榜、秒杀怎么落地；五大数据结构与底层编码；主从/哨兵/Cluster 如何保证高可用；缓存穿透/击穿/雪崩怎么防。每章配可交互的动态图。',
  audience: [
    '会用 Redis 做缓存，但说不清「为什么用它、什么场景用什么结构」的后端工程师',
    '面试常被问分布式锁、缓存三大问题、主从哨兵 Cluster，想一次讲明白的人',
    '要在高并发场景（秒杀、排行榜、限流）里正确使用 Redis 的开发者',
  ],
  outcomes: [
    '掌握五大数据结构与底层编码，知道每种场景该用哪种结构',
    '吃透六大经典场景：缓存、分布式锁、消息、布隆过滤器、排行榜、秒杀',
    '讲清缓存穿透/击穿/雪崩的成因与防护，以及缓存与 DB 的一致性',
    '理解持久化(RDB/AOF)与高可用(主从/哨兵/Cluster)的原理与取舍',
  ],
}

export default meta
