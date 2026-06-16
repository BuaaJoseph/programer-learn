// Redis 通关：4 卷 16 章。slug 规则 r{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'r1',
    index: 1,
    title: '数据结构与原理',
    subtitle: 'Data Structures',
    theme: 'Redis 快不只是因为在内存里。看懂它的数据结构与底层编码、单线程模型，你才知道「什么场景该用什么结构」。',
    chapters: [
      { slug: 'r1-c1', title: '五大数据结构与对象编码', topic: 'String/Hash/List/Set/ZSet', hook: 'Redis 对外是 5 种类型，对内每种类型还会按数据量自动切换底层编码（listpack/skiplist…），这决定了性能。', minutes: 120, hasContent: true },
      { slug: 'r1-c2', title: '跳表与 ZSet：排行榜为什么用它', topic: 'skiplist / 排行榜', hook: 'ZSet 用跳表实现「按分数排序 + O(log N) 范围查询」，这正是排行榜、延时队列的底座。', minutes: 120, hasContent: true },
      { slug: 'r1-c3', title: '单线程为什么这么快', topic: '单线程 / IO 多路复用', hook: 'Redis 用单线程处理命令，靠的是纯内存 + IO 多路复用 + 高效数据结构，避开了锁和上下文切换。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'r2',
    index: 2,
    title: '六大经典场景',
    subtitle: 'Real Scenarios',
    theme: 'Redis 的价值在场景里。缓存、分布式锁、消息、布隆过滤器、排行榜、秒杀——每个场景对应一套结构与套路。',
    chapters: [
      { slug: 'r2-c1', title: '数据库缓存：旁路缓存与读写流程', topic: 'Cache Aside', hook: '最常见的用法：读走缓存、写改数据库再删缓存。看清这套流程，才能理解后面的一致性与三大问题。', minutes: 120, hasContent: true },
      { slug: 'r2-c2', title: '分布式锁：从 SETNX 到 Redlock', topic: '分布式锁', hook: '一行 SETNX 只是入门；要做对，得处理过期、误删、续期(看门狗)和主从切换下的安全性。', minutes: 150, hasContent: true },
      { slug: 'r2-c3', title: '异步消息：List、Pub/Sub 与 Stream', topic: '消息模型', hook: 'Redis 能当轻量消息队列：List 做简单队列、Pub/Sub 做广播、Stream 才是支持消费组与持久化的正经方案。', minutes: 120, hasContent: true },
      { slug: 'r2-c4', title: '布隆过滤器：用一点空间挡住不存在的 key', topic: '布隆过滤器', hook: '布隆过滤器能用极小的空间判断「一个元素一定不存在 / 可能存在」，是缓存穿透的标准防线。', minutes: 120, hasContent: true },
      { slug: 'r2-c5', title: '秒杀：用 Lua 原子扣减库存', topic: '秒杀 / 原子性', hook: '高并发扣库存的关键是原子性：把「判断+扣减」用 Lua 脚本一次做完，避免超卖。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r3',
    index: 3,
    title: '缓存三大问题',
    subtitle: 'Cache Pitfalls',
    theme: '缓存用不好会反噬数据库。穿透、击穿、雪崩三个面试必考问题，本质都是「请求绕过/压垮缓存直冲 DB」。',
    chapters: [
      { slug: 'r3-c1', title: '缓存穿透：查一个根本不存在的 key', topic: '缓存穿透', hook: '恶意或异常请求一直查不存在的数据，缓存永远不命中、全部打到 DB——用布隆过滤器或缓存空值来挡。', minutes: 90, hasContent: true },
      { slug: 'r3-c2', title: '缓存击穿：热点 key 突然失效', topic: '缓存击穿', hook: '一个超高并发的热点 key 过期瞬间，大量请求同时穿过缓存压向 DB——用互斥锁或逻辑过期来扛。', minutes: 90, hasContent: true },
      { slug: 'r3-c3', title: '缓存雪崩：大量 key 同时过期', topic: '缓存雪崩', hook: '大批 key 在同一时刻集中过期、或 Redis 宕机，流量瞬间全压到 DB——用随机过期、多级缓存、熔断来防。', minutes: 90, hasContent: true },
      { slug: 'r3-c4', title: '缓存与数据库的一致性', topic: '一致性', hook: '只要数据有两份副本就有不一致风险。Cache Aside、延迟双删、订阅 binlog——各有适用与局限。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'r4',
    index: 4,
    title: '持久化与高可用',
    subtitle: 'Persistence & HA',
    theme: '内存数据怕丢、单点怕挂。持久化(RDB/AOF)解决「重启不丢」，主从/哨兵/Cluster 解决「不可用与扩展」。',
    chapters: [
      { slug: 'r4-c1', title: '持久化：RDB 快照与 AOF 日志', topic: 'RDB / AOF', hook: 'RDB 是某一刻的内存快照(小、快、可能丢几分钟)，AOF 是命令日志(全、可控、文件大)，生产常两者结合。', minutes: 120, hasContent: true },
      { slug: 'r4-c2', title: '主从复制：读写分离与数据冗余', topic: '主从复制', hook: '主写从读，主库把写操作同步给从库；理解全量同步与增量同步，才能排查主从延迟。', minutes: 120, hasContent: true },
      { slug: 'r4-c3', title: '哨兵 Sentinel 与自动故障转移', topic: 'Sentinel', hook: '哨兵持续监控主库，主库挂了就自动选一个从库提升为新主，并通知客户端——实现高可用。', minutes: 120, hasContent: true },
      { slug: 'r4-c4', title: 'Cluster：16384 个槽与水平扩展', topic: 'Cluster 分片', hook: '单机内存装不下时上 Cluster：用 CRC16 把 key 映射到 16384 个槽，再把槽分给多个节点，实现分片与扩容。', minutes: 150, hasContent: true },
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
