// Java 并发编程：3 卷 10 章。slug 规则 jc{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'jc1',
    index: 1,
    title: '基础与内存模型',
    subtitle: 'Threads & JMM',
    theme: '并发 bug 的根源往往是「看不见、乱了序」。先搞懂线程和 Java 内存模型(JMM)，才知道并发问题从哪来。',
    chapters: [
      { slug: 'jc1-c1', title: '线程基础：状态与上下文切换', topic: '线程', hook: '线程有 6 种状态(NEW/RUNNABLE/BLOCKED/WAITING/TIMED_WAITING/TERMINATED)；上下文切换是有成本的，不是越多线程越快。', minutes: 90, hasContent: true },
      { slug: 'jc1-c2', title: 'JMM：可见性、有序性与原子性', topic: 'JMM', hook: '每个线程有自己的工作内存，改了主内存不一定立刻可见；加上指令重排，并发三大问题(可见性/有序性/原子性)就来了。', minutes: 120, hasContent: true },
      { slug: 'jc1-c3', title: 'volatile 原理：到底保证什么', topic: 'volatile', hook: 'volatile 保证可见性 + 禁止重排(内存屏障)，但不保证原子性——i++ 用 volatile 照样出错。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'jc2',
    index: 2,
    title: '锁与同步',
    subtitle: 'Locks',
    theme: '锁是并发的核心武器。从 synchronized 的锁升级到 CAS、再到撑起整个 JUC 的 AQS，一条线讲透。',
    chapters: [
      { slug: 'jc2-c1', title: 'synchronized 原理与锁升级', topic: 'synchronized', hook: 'synchronized 靠对象头 Mark Word；为减少开销，锁会随竞争从无锁→偏向锁→轻量级锁→重量级锁逐步升级。', minutes: 150, hasContent: true },
      { slug: 'jc2-c2', title: 'CAS 与原子类、ABA 问题', topic: 'CAS', hook: 'CAS 用「比较并交换」做无锁更新(乐观锁)，是原子类和 AQS 的基石；但有 ABA 和自旋开销问题。', minutes: 120, hasContent: true },
      { slug: 'jc2-c3', title: 'AQS 原理：JUC 的基石', topic: 'AQS', hook: 'AQS 用一个 volatile state + CLH 等待队列，撑起了 ReentrantLock、Semaphore、CountDownLatch 等几乎所有同步器。', minutes: 150, hasContent: true },
      { slug: 'jc2-c4', title: 'ReentrantLock 与读写锁', topic: '显式锁', hook: 'ReentrantLock 比 synchronized 多了可中断、可超时、公平锁、多条件变量；读写锁让读读并发、读写互斥。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'jc3',
    index: 3,
    title: '线程池与并发容器',
    subtitle: 'Pools & Containers',
    theme: '生产里几乎不手动 new 线程，而是用线程池和并发容器。理解它们的原理，才能用对、调好。',
    chapters: [
      { slug: 'jc3-c1', title: '线程池原理：七参数与提交流程', topic: '线程池', hook: '核心线程→阻塞队列→最大线程→拒绝策略，提交任务的流程顺序记反了，面试就挂了。', minutes: 150, hasContent: true },
      { slug: 'jc3-c2', title: 'ConcurrentHashMap：1.7 到 1.8', topic: 'CHM', hook: '1.7 用分段锁 Segment，1.8 改成 CAS + synchronized 锁单个桶 + 红黑树——并发度和性能都大幅提升。', minutes: 120, hasContent: true },
      { slug: 'jc3-c3', title: '并发工具：CountDownLatch 等', topic: '并发工具', hook: 'CountDownLatch(等一组完成)、CyclicBarrier(互相等齐)、Semaphore(限流)、ThreadLocal(线程隔离)——各有适用。', minutes: 120, hasContent: true },
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
