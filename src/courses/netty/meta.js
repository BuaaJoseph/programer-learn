export const meta = {
  slug: 'netty',
  title: 'Netty 网络编程：原理与面试精讲',
  shortTitle: 'Netty',
  subtitle: 'Netty, Explained',
  categoryId: 'server',
  subCategoryId: 'middleware',
  level: '系统',
  cover: '🔌',
  coverScene: 'netlayers',
  accent: '#0891b2',
  pricing: 'free',
  description:
    '一门把 Netty「为什么快、怎么设计、面试怎么答」讲透的课。从 I/O 模型（BIO/NIO/AIO 与多路复用）讲起，说清原生 NIO 的痛点与 Netty 的取舍；深入 Reactor 线程模型（单线程 / 多线程 / 主从）与 Netty 的 BossGroup·WorkerGroup·EventLoop 工作机制，剖析高性能与零拷贝的来由；再到核心组件（Channel / ChannelHandlerContext / EventLoop / ChannelPipeline / ChannelHandler / ByteBuf）、设计模式、空轮询 Bug 的规避；最后讲透 TCP 粘包拆包成因与 Netty 的解码器解决方案。每章围绕高频面试题展开，原理 + 对比 + 代码 + 易错点 + 追问，照着讲也能从容应对面试。',
  audience: [
    '会用 Netty 写 demo 但说不清「它为什么比原生 NIO 好」的 Java 工程师',
    '要准备中高级 Java / 后端面试，想系统拿下 Netty 高频题的同学',
    '做 RPC、网关、长连接、IM 等中间件，想吃透底层网络模型的开发者',
  ],
  outcomes: [
    '讲清 BIO/NIO/AIO 与多路复用的差异，以及为什么选 Netty 而非原生 NIO',
    '说透 Reactor 三种线程模型与 Netty 的 EventLoop 工作机制，答清「为什么高性能」',
    '掌握 Netty 核心组件、设计模式与零拷贝、空轮询 Bug 的应对',
    '理解 TCP 粘包拆包成因，能用 Netty 的解码器从容解决并讲清 Pipeline 流程',
  ],
}

export default meta
