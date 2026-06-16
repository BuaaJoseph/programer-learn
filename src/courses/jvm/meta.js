export const meta = {
  slug: 'jvm',
  title: 'JVM 通关：内存、GC 与类加载',
  shortTitle: 'JVM 通关',
  subtitle: 'JVM Internals',
  categoryId: 'server',
  subCategoryId: 'java',
  level: '进阶',
  cover: '☕',
  coverScene: 'heap',
  accent: '#b45309',
  pricing: 'free',
  description:
    '用具体例子讲透 JVM：运行时内存区域、对象在堆里的一生、垃圾回收算法与收集器(CMS/G1/ZGC)、分代与 Minor/Full GC、类加载过程与双亲委派，以及 OOM 排查与调优。每章配可交互的动态图。',
  audience: [
    '写 Java 但说不清「对象到底在哪、什么时候被回收」的工程师',
    '面试常被问内存区域、GC 算法、G1、类加载、双亲委派的人',
    '需要排查 OOM、GC 卡顿、做 JVM 调优的开发者',
  ],
  outcomes: [
    '讲清 JVM 运行时数据区与对象的创建、布局、访问',
    '掌握可达性分析、GC 算法与主流收集器(CMS/G1/ZGC)的取舍',
    '理解分代模型与 Minor/Major/Full GC 的触发',
    '吃透类加载过程与双亲委派，会排查 OOM 与做基本调优',
  ],
}

export default meta
