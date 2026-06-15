// MySQL 深入浅出：4 卷 12 章。slug 规则 m{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'm1',
    index: 1,
    title: '存储引擎与体系结构',
    subtitle: 'Storage Engine',
    theme: 'MySQL 是「分层」的：上面是 server 层，下面是可插拔的存储引擎。看懂 InnoDB 的结构，后面索引、事务、MVCC 才有立足点。',
    chapters: [
      { slug: 'm1-c1', title: '存储引擎总览：InnoDB 凭什么是默认', topic: 'InnoDB vs MyISAM', hook: 'MySQL 把「怎么存、怎么读、怎么加锁」交给了存储引擎，InnoDB 因为支持事务和行锁成为默认。', minutes: 90, hasContent: true },
      { slug: 'm1-c2', title: 'InnoDB 体系结构：Buffer Pool 与磁盘', topic: 'Buffer Pool / 内存结构', hook: '数据在磁盘、计算在内存：Buffer Pool 是 InnoDB 性能的命门，几乎所有读写都先经过它。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'm2',
    index: 2,
    title: '索引原理',
    subtitle: 'Indexing',
    theme: '索引不是「加了就快」的魔法。理解 B+Tree 的结构，你才知道一条查询为什么走索引、为什么回表、为什么失效。',
    chapters: [
      { slug: 'm2-c1', title: '为什么是 B+Tree：和二叉树/B-Tree/Hash 比', topic: 'B+Tree 选型', hook: '磁盘 IO 是瓶颈，索引结构的第一目标是「树尽量矮」——这正是 B+Tree 胜出的原因。', minutes: 120, hasContent: true },
      { slug: 'm2-c2', title: 'B+Tree 是怎么查找的', topic: 'B+Tree 查找', hook: '从根节点一路二分到叶子，再沿叶子链表范围扫描——这就是一次索引查询的全过程。', minutes: 120, hasContent: true },
      { slug: 'm2-c3', title: '聚簇索引与二级索引：回表是怎么回事', topic: '聚簇索引 / 回表', hook: 'InnoDB 的数据就存在主键索引的叶子里；走二级索引常常要「回表」再查一次主键树。', minutes: 120, hasContent: true },
      { slug: 'm2-c4', title: '联合索引、最左前缀与覆盖索引', topic: '联合索引', hook: '联合索引按字段顺序排序，用不用得上取决于你查询的「最左前缀」；覆盖索引能省掉回表。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'm3',
    index: 3,
    title: '事务与锁',
    subtitle: 'Transaction & Lock',
    theme: '并发是数据库最难的部分。事务给你 ACID 的承诺，隔离级别和锁决定了并发下「能看到什么、要等多久」。',
    chapters: [
      { slug: 'm3-c1', title: '事务与 ACID', topic: 'ACID', hook: '事务是一组要么全成功、要么全回滚的操作；ACID 是数据库对它的四条承诺。', minutes: 90, hasContent: true },
      { slug: 'm3-c2', title: '隔离级别与三种并发异常', topic: '隔离级别', hook: '脏读、不可重复读、幻读——四种隔离级别就是在「并发正确性」和「性能」之间做取舍。', minutes: 120, hasContent: true },
      { slug: 'm3-c3', title: 'InnoDB 的锁：行锁、间隙锁与 Next-Key', topic: '锁机制', hook: 'InnoDB 锁的是索引而不是行；间隙锁和 Next-Key Lock 正是它在 RR 下防幻读的武器。', minutes: 120, hasContent: true },
      { slug: 'm3-c4', title: 'redo log、undo log 与 WAL', topic: '日志与 WAL', hook: '先写日志再写数据（WAL）：redo 保证崩溃不丢数据，undo 支撑回滚与 MVCC。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'm4',
    index: 4,
    title: 'MVCC 多版本并发控制',
    subtitle: 'MVCC',
    theme: 'MVCC 是 InnoDB 高并发的核心：读不加锁、写不阻塞读。它靠 undo 版本链 + ReadView 实现「每个事务看到一致的快照」。',
    chapters: [
      { slug: 'm4-c1', title: 'MVCC 原理：版本链 + ReadView', topic: 'MVCC 原理', hook: '每行数据藏着隐藏字段，配合 undo 版本链与 ReadView，决定一个事务该看到哪个版本。', minutes: 150, hasContent: true },
      { slug: 'm4-c2', title: '快照读与当前读：RR 如何应对幻读', topic: '快照读 / 当前读', hook: '普通 SELECT 是快照读、走 MVCC；加锁读是当前读、走最新版本——幻读的玄机就在这里。', minutes: 120, hasContent: true },
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
