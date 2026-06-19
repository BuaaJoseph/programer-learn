export const meta = {
  slug: 'message-queue',
  title: '消息队列：原理与面试精讲',
  shortTitle: '消息队列',
  subtitle: 'Message Queues, Explained',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '系统',
  cover: '📨',
  coverScene: 'mqflow',
  accent: '#ff6a00',
  pricing: 'free',
  description:
    '一门把消息队列「原理 + 面试」一次讲透的课：先想清楚什么是消息队列、为什么需要它（解耦、削峰、异步），再深入通用模型与术语、推拉模式取舍；系统攻克所有 MQ 都绕不开的硬骨头——消息不丢、幂等去重、有序性与堆积；然后逐个拆解三大主流实现：Kafka（高性能、控制器与去 ZK、事务消息）、RabbitMQ（AMQP、交换机与路由、可靠投递、死信与延迟队列、集群）、RocketMQ（自研 NameServer、存储机制、事务消息、顺序与延迟、重试与高可用）；最后落到三者多维对比与选型决策、通用调优与最佳实践。全程以面试题为骨、以原理为肉，每题都有原创讲解、对比表与示意。',
  audience: [
    '会用 MQ 收发消息但说不清「为什么不丢、怎么去重、如何保序」的后端',
    '准备中高级后端 / 架构面试，想系统拿下消息队列高频考点的工程师',
    '要做技术选型、在 Kafka / RabbitMQ / RocketMQ 之间做决策的开发者',
  ],
  outcomes: [
    '讲清消息队列的动机、模型、术语与推拉模式取舍',
    '吃透不丢、不重、有序、不堆积这四大通用难题的解法',
    '分别掌握 Kafka / RabbitMQ / RocketMQ 的核心机制与面试要点',
    '能做三大 MQ 的多维对比、选型决策与通用调优',
  ],
}

export default meta
