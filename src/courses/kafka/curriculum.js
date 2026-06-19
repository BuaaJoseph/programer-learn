// Kafka 通关：3 卷 9 章。slug 规则 k{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'k1',
    index: 1,
    title: '模型与存储',
    subtitle: 'Model & Storage',
    theme: 'Kafka 的高吞吐不是魔法，而是「分区并行 + 顺序写磁盘 + 零拷贝」的工程结果。先看懂它的模型与存储。',
    chapters: [
      { slug: 'k1-c1', title: '为什么用 Kafka：高吞吐的日志型 MQ', topic: 'Kafka 定位', hook: 'Kafka 把消息当成「只追加的日志」，靠分区并行和顺序写，把吞吐做到了百万级——这是它和 RabbitMQ 的根本区别。', minutes: 90, hasContent: true },
      { slug: 'k1-c2', title: '核心概念：Topic、Partition、Offset', topic: '核心模型', hook: '一个 Topic 拆成多个 Partition 分散到多台机器并行读写；每条消息在分区内有唯一递增的 offset。', minutes: 120, hasContent: true },
      { slug: 'k1-c3', title: '存储原理：顺序写、分段日志与零拷贝', topic: '高吞吐原理', hook: '顺序写磁盘不比随机写内存慢；配合分段日志、页缓存和零拷贝(sendfile)，Kafka 把磁盘用到了极致。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'k2',
    index: 2,
    title: '生产与消费',
    subtitle: 'Produce & Consume',
    theme: '生产端决定消息怎么进、可靠不可靠；消费端决定消息怎么出、会不会重复或丢失。这一卷讲透两端。',
    chapters: [
      { slug: 'k2-c1', title: '生产者：分区策略、ack 与幂等事务', topic: '生产者', hook: 'acks=0/1/all 决定可靠性等级；幂等生产者和事务则让 Kafka 能做到「不重复、原子写多分区」。', minutes: 120, hasContent: true },
      { slug: 'k2-c2', title: '消费者组与 Rebalance', topic: '消费者组', hook: '同组消费者分摊分区、组间互不影响；成员变化会触发 rebalance 重新分配分区——这是消费侧最常见的坑。', minutes: 120, hasContent: true },
      { slug: 'k2-c3', title: '消费位移：offset 提交与重复/丢失', topic: 'offset', hook: '先提交后处理会丢消息、先处理后提交会重复——offset 的提交时机决定了消息语义。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'k3',
    index: 3,
    title: '可靠与高可用',
    subtitle: 'Reliability & HA',
    theme: '副本是 Kafka 高可用的根。理解 Leader/Follower/ISR，你才能说清消息到底丢不丢、怎么做到 exactly-once。',
    chapters: [
      { slug: 'k3-c1', title: '副本机制：Leader、Follower 与 ISR', topic: '副本/ISR', hook: '每个分区有多个副本，只有 ISR(同步副本集合)里的才有资格被选为新 Leader——这是不丢消息的关键。', minutes: 120, hasContent: true },
      { slug: 'k3-c2', title: '消息不丢、不重、不乱与 Exactly-Once', topic: '消息语义', hook: '生产 acks=all + 消费手动提交 + 幂等/事务，三者配齐才能逼近 exactly-once；顺序只在单分区内保证。', minutes: 120, hasContent: true },
      { slug: 'k3-c3', title: '选型：Kafka vs RabbitMQ vs RocketMQ', topic: 'MQ 选型', hook: '从 Kafka 的视角再看一次选型：要极致吞吐和日志流选 Kafka，要灵活路由选 RabbitMQ。', minutes: 90, hasContent: true },
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
