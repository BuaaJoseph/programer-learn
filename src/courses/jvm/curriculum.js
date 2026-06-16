// JVM 通关：3 卷 10 章。slug 规则 jvm{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'jvm1',
    index: 1,
    title: '内存区域与对象',
    subtitle: 'Memory & Objects',
    theme: '搞懂一个对象在 JVM 里存在哪、怎么被访问，是理解 GC 和排查 OOM 的前提。先看运行时数据区。',
    chapters: [
      { slug: 'jvm1-c1', title: '运行时数据区：堆、栈、方法区', topic: '内存区域', hook: 'JVM 把内存分成几块：线程共享的堆和方法区、线程私有的虚拟机栈/本地方法栈/程序计数器——OOM 和栈溢出就发生在这。', minutes: 120, hasContent: true },
      { slug: 'jvm1-c2', title: '对象的创建、内存布局与访问定位', topic: '对象', hook: '一个 new 背后：类加载检查、分配内存(指针碰撞/空闲列表)、对象头(Mark Word)+实例数据+对齐填充。', minutes: 120, hasContent: true },
      { slug: 'jvm1-c3', title: '栈帧与方法执行', topic: '虚拟机栈', hook: '每次方法调用都压入一个栈帧，里面有局部变量表、操作数栈——递归太深就是它撑爆了(StackOverflowError)。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'jvm2',
    index: 2,
    title: '垃圾回收',
    subtitle: 'Garbage Collection',
    theme: 'GC 是 JVM 最核心也最常考的部分。先判断谁是垃圾，再用合适的算法和收集器回收它。',
    chapters: [
      { slug: 'jvm2-c1', title: '如何判断对象已死：可达性分析', topic: '对象存活判定', hook: '引用计数解决不了循环引用；JVM 用可达性分析：从 GC Roots 出发走不到的对象就是垃圾。', minutes: 120, hasContent: true },
      { slug: 'jvm2-c2', title: '垃圾回收算法：标记-清除/复制/标记-整理', topic: 'GC 算法', hook: '标记清除有碎片、复制浪费一半空间、标记整理要移动对象——分代收集就是按对象寿命分区用不同算法。', minutes: 120, hasContent: true },
      { slug: 'jvm2-c3', title: '分代模型与 Minor/Full GC', topic: '分代回收', hook: '新生代 Eden+两个 Survivor，对象朝生夕灭走 Minor GC；熬过多次进老年代，老年代满了触发 Full GC(最该避免)。', minutes: 120, hasContent: true },
      { slug: 'jvm2-c4', title: '垃圾收集器：CMS、G1 与 ZGC', topic: '收集器', hook: '从 Serial 到并行的 Parallel、并发的 CMS、分区的 G1、几乎无停顿的 ZGC——本质都在和 STW 停顿时间作斗争。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'jvm3',
    index: 3,
    title: '类加载与实战',
    subtitle: 'Class Loading',
    theme: '类怎么从 .class 变成可用的 Class 对象、为什么不会被乱加载，以及线上 OOM 怎么查——这一卷收尾。',
    chapters: [
      { slug: 'jvm3-c1', title: '类加载过程：加载到初始化', topic: '类加载', hook: '加载→验证→准备→解析→初始化五步；准备阶段给静态变量赋零值、初始化才执行 static 代码块。', minutes: 120, hasContent: true },
      { slug: 'jvm3-c2', title: '双亲委派模型', topic: '双亲委派', hook: '类加载器收到请求先交给父加载器，父加载不了才自己来——保证核心类不被篡改、同一个类不被重复加载。', minutes: 120, hasContent: true },
      { slug: 'jvm3-c3', title: 'OOM 排查与 JVM 调优', topic: '调优/排查', hook: '堆 OOM、栈溢出、元空间 OOM 各有成因；用 jstat/jmap/MAT/jstack + GC 日志定位，再调堆大小与收集器。', minutes: 120, hasContent: true },
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
