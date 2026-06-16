// ZooKeeper 通关：2 卷 8 章。slug 规则 zk{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'zk1',
    index: 1,
    title: '基础与数据模型',
    subtitle: 'Basics & Data Model',
    theme: 'ZooKeeper 本质是一个「带通知的、强一致的小型文件系统」。先看懂它的 znode 模型与 watch，再谈应用。',
    chapters: [
      { slug: 'zk1-c1', title: 'ZooKeeper 是什么：分布式协调服务', topic: 'ZK 定位', hook: 'ZK 不是数据库，而是给分布式系统做「协调」的：选主、配置、注册、锁——都靠它的强一致小数据存储。', minutes: 90, hasContent: true },
      { slug: 'zk1-c2', title: '数据模型：znode 树与 watch 机制', topic: 'znode / watch', hook: 'ZK 的数据是一棵 znode 树，每个节点能存小数据；客户端能在节点上注册 watch，节点变化时收到一次性通知。', minutes: 120, hasContent: true },
      { slug: 'zk1-c3', title: '节点类型与会话：临时节点是怎么回事', topic: '节点类型 / Session', hook: '持久、临时、顺序节点各有妙用；临时节点随会话(session)消失而自动删除，是注册中心摘除下线机器的关键。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'zk2',
    index: 2,
    title: '原理与典型应用',
    subtitle: 'Internals & Patterns',
    theme: 'ZK 的强一致来自 ZAB 协议与过半机制。理解它，你就能看懂分布式锁、注册中心、选主这些经典用法为什么可靠。',
    chapters: [
      { slug: 'zk2-c1', title: 'ZAB 协议与 Leader 选举', topic: 'ZAB / 选举', hook: 'ZK 集群只有一个 Leader 处理写；Leader 挂了用 ZAB 协议快速选出新 Leader，保证数据不乱。', minutes: 120, hasContent: true },
      { slug: 'zk2-c2', title: '读写流程与过半写成功', topic: '一致性', hook: '写必须经 Leader 广播、过半节点确认才算成功；读可以走任意节点(可能读到旧值)——这是 CP 的取舍。', minutes: 120, hasContent: true },
      { slug: 'zk2-c3', title: '用 ZooKeeper 实现分布式锁', topic: '分布式锁', hook: '用临时顺序节点 + 只监听前一个节点，就能实现公平、无惊群、自动释放的分布式锁。', minutes: 120, hasContent: true },
      { slug: 'zk2-c4', title: '注册中心、配置中心与选主', topic: '典型应用', hook: '临时节点做服务注册、watch 做配置推送、抢建同一节点做选主——ZK 的经典三大应用。', minutes: 120, hasContent: true },
      { slug: 'zk2-c5', title: 'CAP 中的 CP 与脑裂防护', topic: 'CAP / 脑裂', hook: 'ZK 选择了 CP：分区时少数派不可写以保一致；过半机制(quorum)从根上避免了脑裂。', minutes: 90, hasContent: true },
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
