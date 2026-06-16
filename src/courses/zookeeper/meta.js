export const meta = {
  slug: 'zookeeper',
  title: 'ZooKeeper 通关：分布式协调的基石',
  shortTitle: 'ZooKeeper 通关',
  subtitle: 'Distributed Coordination',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '进阶',
  cover: '🐘',
  coverScene: 'znodes',
  accent: '#1d4ed8',
  pricing: 'free',
  description:
    '用具体场景讲透 ZooKeeper：它为什么是注册中心/分布式锁的基石、znode 数据模型与 watch 机制、ZAB 协议与 Leader 选举、过半写成功的一致性，以及分布式锁、注册中心、选主等典型应用。每章配可交互的动态图。',
  audience: [
    '用过 Dubbo/Kafka 但说不清「ZooKeeper 在背后干了什么」的工程师',
    '面试常被问 ZAB、Leader 选举、watch、分布式锁、CAP 的人',
    '要基于 ZK 做注册发现、配置管理、分布式锁的开发者',
  ],
  outcomes: [
    '讲清 ZK 的定位、znode 数据模型与 watch 一次性通知机制',
    '理解 ZAB 协议、Leader 选举与「过半写成功」的一致性',
    '掌握用 ZK 实现分布式锁、注册中心、配置中心、选主',
    '理解 ZK 在 CAP 中的 CP 取舍与脑裂防护',
  ],
}

export default meta
