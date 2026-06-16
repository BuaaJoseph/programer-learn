export const meta = {
  slug: 'rabbitmq',
  title: 'RabbitMQ 实战：从模型到可靠投递',
  shortTitle: 'RabbitMQ 实战',
  subtitle: 'Message Queue in Practice',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🐰',
  coverScene: 'mqflow',
  accent: '#b26a09',
  pricing: 'free',
  description:
    '用具体场景讲透消息队列：为什么用 MQ（解耦/异步/削峰）、AMQP 模型与四种 Exchange 的路由、消息如何做到「不丢不重不乱」、死信与延迟队列、堆积流控与高可用。每章配可交互的动态图。',
  audience: [
    '用过 MQ 但说不清「消息为什么会丢、怎么保证不丢」的后端工程师',
    '面试常被问可靠投递、幂等、死信队列、镜像队列的人',
    '要在解耦、异步、削峰场景里正确落地 MQ 的开发者',
  ],
  outcomes: [
    '讲清 MQ 的三大用途与 AMQP 核心模型、四种 Exchange 的路由规则',
    '掌握消息不丢（confirm + 持久化 + 手动 ack）、不重（幂等）、不乱（顺序）',
    '会用死信队列与 TTL 实现延迟队列，理解堆积与 QoS 流控',
    '理解镜像队列 / Quorum Queue 的高可用，并能做 MQ 选型',
  ],
}

export default meta
