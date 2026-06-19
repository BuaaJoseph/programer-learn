// Elasticsearch 通关：3 卷 9 章。slug 规则 es{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'es1',
    index: 1,
    title: '搜索原理',
    subtitle: 'Search Internals',
    theme: 'ES 搜索快的核心是倒排索引。先看懂它为什么比数据库 LIKE 快几个数量级，以及分词如何决定搜得准不准。',
    chapters: [
      { slug: 'es1-c1', title: 'ES 是什么：为什么搜索这么快', topic: 'ES 定位', hook: '数据库 LIKE %关键词% 要全表扫描；ES 靠倒排索引「从词直接找到文档」，这是质的差别。', minutes: 90, hasContent: true },
      { slug: 'es1-c2', title: '倒排索引原理', topic: '倒排索引', hook: '正排是「文档→词」，倒排是「词→文档列表」。搜索时直接查词拿到文档列表，再求交集——所以快。', minutes: 120, hasContent: true },
      { slug: 'es1-c3', title: '分词与分析器 analyzer', topic: '分词', hook: '建索引和搜索都要分词；中文怎么切(ik 分词器)、analyzer 由 character filter + tokenizer + token filter 组成，切错就搜不到。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'es2',
    index: 2,
    title: '数据结构与分布式',
    subtitle: 'Data & Distribution',
    theme: 'ES 是分布式的：索引切成分片分散到多节点，副本提供高可用。理解写入流程，才懂「近实时」从何而来。',
    chapters: [
      { slug: 'es2-c1', title: '索引、文档与 mapping', topic: '数据模型', hook: 'index 像表、document 像行、mapping 像表结构；mapping 一旦定型字段类型很难改，设计要谨慎。', minutes: 90, hasContent: true },
      { slug: 'es2-c2', title: '分片与副本：shard 与 replica', topic: '分片/副本', hook: '主分片决定数据怎么拆、副本分片提供冗余与读扩展；主分片数建索引时定死、不能改。', minutes: 120, hasContent: true },
      { slug: 'es2-c3', title: '写入流程：translog、refresh 与 flush', topic: '写入流程', hook: '写入先进内存 buffer + translog，refresh(默认 1s)生成可搜索 segment(近实时)，flush 才真正落盘。', minutes: 150, hasContent: true },
      { slug: 'es2-c4', title: '查询流程与相关性打分', topic: '查询/打分', hook: '查询分 query then fetch 两阶段；打分用 BM25 衡量「这篇文档和查询有多相关」。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'es3',
    index: 3,
    title: '实战与进阶',
    subtitle: 'Practice',
    theme: '会查、会调优、会排坑。这一卷讲常见 query DSL、深分页问题与集群要点。',
    chapters: [
      { slug: 'es3-c1', title: '常见 Query DSL', topic: 'Query DSL', hook: 'match 走分词、term 精确匹配、bool 组合 must/should/filter——分不清就会查不准或慢。', minutes: 120, hasContent: true },
      { slug: 'es3-c2', title: '深分页、集群与 ELK', topic: '进阶/选型', hook: 'from+size 深分页会爆内存，要用 search_after/scroll；再看集群脑裂防护与 ELK 日志方案。', minutes: 120, hasContent: true },
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
