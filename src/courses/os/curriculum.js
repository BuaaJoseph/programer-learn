// 操作系统：2 卷 8 章。slug 规则 os{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'os1',
    index: 1,
    title: '进程与线程',
    subtitle: 'Process & Thread',
    theme: '操作系统最核心的抽象是进程和线程。先搞懂它们的区别、怎么被调度、怎么通信、为什么会死锁。',
    chapters: [
      { slug: 'os1-c1', title: '进程、线程与协程', topic: '进程/线程', hook: '进程是资源分配的单位、线程是 CPU 调度的单位、协程是用户态的轻量线程——三者的区别是高频考点。', minutes: 120, hasContent: true },
      { slug: 'os1-c2', title: '进程调度算法', topic: '调度', hook: 'FCFS、短作业优先、时间片轮转、多级反馈队列——调度器在「公平、吞吐、响应」之间做权衡。', minutes: 120, hasContent: true },
      { slug: 'os1-c3', title: '进程间通信 IPC', topic: 'IPC', hook: '进程地址空间互相隔离，要通信得借助管道、消息队列、共享内存、信号量、Socket 等机制。', minutes: 90, hasContent: true },
      { slug: 'os1-c4', title: '死锁：成因、预防与避免', topic: '死锁', hook: '死锁需同时满足互斥、占有并等待、不可剥夺、循环等待四个条件——破坏任一个就能预防。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'os2',
    index: 2,
    title: '内存与 IO',
    subtitle: 'Memory & IO',
    theme: '内存怎么被虚拟化、页怎么换进换出、IO 为什么有那么多模型——这一卷直接连到后端高并发。',
    chapters: [
      { slug: 'os2-c1', title: '虚拟内存与分页', topic: '虚拟内存', hook: '虚拟内存让每个进程都以为独享一整块连续内存；靠分页 + 页表 + MMU 把虚拟地址翻译成物理地址。', minutes: 120, hasContent: true },
      { slug: 'os2-c2', title: '页面置换算法', topic: '页面置换', hook: '物理内存装不下时要换出某页：FIFO、LRU、Clock 各有取舍，缺页中断的多少直接决定性能。', minutes: 120, hasContent: true },
      { slug: 'os2-c3', title: '用户态、内核态与系统调用', topic: '用户/内核态', hook: '应用跑在用户态，要做 IO/分配内存等特权操作就得通过系统调用陷入内核态——切换是有成本的。', minutes: 90, hasContent: true },
      { slug: 'os2-c4', title: '五种 IO 模型', topic: 'IO 模型', hook: '阻塞、非阻塞、IO 多路复用(select/poll/epoll)、信号驱动、异步 IO——Redis/Netty 的高并发都建立在这上面。', minutes: 150, hasContent: true },
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
