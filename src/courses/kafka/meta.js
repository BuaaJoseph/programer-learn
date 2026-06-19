export const meta = {
  slug: 'kafka',
  title: 'Kafka 通关：高吞吐的分布式日志',
  shortTitle: 'Kafka 通关',
  subtitle: 'Distributed Log & Streaming',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🪵',
  coverScene: 'partition',
  accent: '#c2410c',
  pricing: 'free',
  description:
    '用具体场景讲透 Kafka：为什么它能扛百万级吞吐、Topic/Partition/Offset 模型、顺序写与零拷贝、生产者 ack 与幂等事务、消费者组与 rebalance、ISR 副本与消息不丢不重。每章配可交互的动态图。',
  audience: [
    '用过 Kafka 但说不清「为什么这么快、消息会不会丢」的后端工程师',
    '面试常被问分区、消费者组、rebalance、ISR、exactly-once 的人',
    '要做日志收集、流处理、异步解耦的高吞吐场景开发者',
  ],
  outcomes: [
    '讲清 Kafka 的存储模型与高吞吐原理（顺序写/分段/零拷贝/批量）',
    '掌握生产者分区与 ack、幂等与事务，消费者组与 rebalance',
    '理解 offset 提交与重复/丢失，ISR 副本机制与高可用',
    '能讲清 Kafka 的不丢不重不乱与 exactly-once，并做 MQ 选型',
  ],
}

export default meta
