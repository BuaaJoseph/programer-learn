// Netty 网络编程 · 原理与面试精讲：2 卷 4 章。slug 规则 nt{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'nt0',
    index: 0,
    title: 'I/O 模型与线程模型',
    subtitle: 'I/O & Threading',
    theme: '打地基。先想清网络 I/O 的几种模型（BIO/NIO/AIO 与多路复用）与 Netty 的来由，再讲透 Reactor 线程模型与 Netty 的 EventLoop 工作机制——这是「Netty 为什么高性能」的根。',
    chapters: [
      { slug: 'nt0-c1', title: 'Netty 是什么 · I/O 模型与选型', topic: '原理', hook: 'BIO 一连接一线程为何扛不住高并发、NIO 多路复用如何用一个线程管成千上万连接、AIO 为何在 Linux 上不流行；原生 NIO 有哪些坑，Netty 到底解决了什么问题、用在哪些场景。', minutes: 90, hasContent: true },
      { slug: 'nt0-c2', title: 'Reactor 线程模型与 Netty 的高性能', topic: '原理', hook: '单 Reactor 单线程 / 单 Reactor 多线程 / 主从 Reactor 的演进与取舍；Netty 的 BossGroup·WorkerGroup·EventLoop 如何分工干活；Netty 性能为什么这么高；零拷贝机制（CompositeByteBuf、堆外内存、FileRegion）到底零在哪。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'nt1',
    index: 1,
    title: '核心组件与实战',
    subtitle: 'Core & Practice',
    theme: '把模型落到组件与实战。讲透 Channel / Pipeline / Handler / ByteBuf 等核心抽象与设计模式，Netty 如何规避 JDK NIO 的空轮询 Bug；再深入 TCP 粘包拆包成因与 Netty 的解码器解决方案。',
    chapters: [
      { slug: 'nt1-c1', title: '核心组件 · 设计模式 · 空轮询 Bug', topic: '原理', hook: 'Channel / ChannelHandlerContext / EventLoop / ChannelPipeline / ChannelHandler / ByteBuf 各管什么、怎么串起来；Netty 用了哪些设计模式；JDK NIO 的 epoll 空轮询 Bug 是怎么回事，Netty 如何用「重建 Selector」绕开它。', minutes: 120, hasContent: true },
      { slug: 'nt1-c2', title: 'TCP 粘包拆包与解码器', topic: '实战', hook: 'TCP 为什么会粘包 / 半包（流式协议、Nagle、滑动窗口、MSS）；Netty 如何解决：定长、分隔符、LengthFieldBasedFrameDecoder、行解码器；编解码器与 Pipeline 的入站出站处理流程怎么走。', minutes: 120, hasContent: true },
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
