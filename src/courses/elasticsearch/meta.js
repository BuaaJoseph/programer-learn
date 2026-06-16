export const meta = {
  slug: 'elasticsearch',
  title: 'Elasticsearch 通关：搜索与倒排索引',
  shortTitle: 'Elasticsearch 通关',
  subtitle: 'Search & Inverted Index',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🔍',
  coverScene: 'invindex',
  accent: '#0891b2',
  pricing: 'free',
  description:
    '用具体例子讲透 Elasticsearch：为什么搜索比数据库 LIKE 快、倒排索引与分词原理、分片与副本、写入流程(translog/refresh/flush/segment merge)、查询与相关性打分，以及深分页、集群与 ELK。每章配可交互的动态图。',
  audience: [
    '用过 ES 但说不清「为什么搜索快、近实时是什么意思」的工程师',
    '面试常被问倒排索引、分片副本、写入流程、深分页的人',
    '要做全文检索、日志分析(ELK)、聚合统计的开发者',
  ],
  outcomes: [
    '讲清倒排索引与分词为什么让全文检索如此之快',
    '理解分片(shard)与副本(replica)的分布式设计',
    '掌握写入流程(translog/refresh/flush/segment merge)与近实时',
    '会写常见 query DSL，理解相关性打分、深分页与集群要点',
  ],
}

export default meta
