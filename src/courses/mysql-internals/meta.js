export const meta = {
  slug: 'mysql-internals',
  title: 'MySQL 深入浅出 · 引擎 · 事务 · 索引 · MVCC',
  shortTitle: 'MySQL 深入浅出',
  subtitle: 'How MySQL Works Under the Hood',
  categoryId: 'server',
  subCategoryId: 'database',
  level: '进阶',
  cover: '🐬',
  coverScene: 'bptree',
  accent: '#0e7490',
  pricing: 'free',
  description:
    '把 MySQL（InnoDB）的存储引擎、索引、事务与 MVCC 讲透。大量交互式动态图解配合直白文字，让你真正看懂 B+Tree 怎么查、隔离级别怎么回事、MVCC 凭什么不加锁也能读。',
  audience: [
    '会写 SQL，但说不清「为什么这条查询走不上索引」的后端工程师',
    '面试常被问 B+Tree / 隔离级别 / MVCC，想一次彻底搞懂的人',
    '需要排查死锁、慢查询、幻读等线上问题的开发者',
  ],
  outcomes: [
    '看懂 InnoDB 的体系结构：Buffer Pool、页、行格式与 WAL',
    '彻底理解 B+Tree 索引：聚簇/二级索引、回表、最左前缀、覆盖索引、索引失效',
    '讲清事务 ACID、四种隔离级别与脏读/不可重复读/幻读',
    '掌握行锁/间隙锁/Next-Key Lock，以及 MVCC 的版本链 + ReadView 原理',
  ],
}

export default meta
