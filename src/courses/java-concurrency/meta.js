export const meta = {
  slug: 'java-concurrency',
  title: 'Java 并发编程：JMM、锁与线程池',
  shortTitle: 'Java 并发',
  subtitle: 'Java Concurrency',
  categoryId: 'server',
  subCategoryId: 'java',
  level: '进阶',
  cover: '🧵',
  coverScene: 'threads',
  accent: '#7c3aed',
  pricing: 'free',
  description:
    '用具体例子讲透 Java 并发：线程与上下文切换、JMM 与可见性/有序性/原子性、volatile 与 synchronized 锁升级、CAS 与 AQS、ReentrantLock、线程池七参数与 ConcurrentHashMap。每章配可交互的动态图。',
  audience: [
    '会用 synchronized/线程池但说不清原理的 Java 工程师',
    '面试必被问 JMM、volatile、锁升级、AQS、线程池、CHM 的人',
    '要写正确高效并发代码、排查并发 bug 的开发者',
  ],
  outcomes: [
    '讲清 JMM 与可见性/有序性/原子性，volatile 到底保证什么',
    '理解 synchronized 锁升级、CAS/ABA 与 AQS 同步器原理',
    '掌握线程池七参数、提交流程与拒绝策略',
    '看懂 ConcurrentHashMap 1.7→1.8 的演进与并发工具类',
  ],
}

export default meta
