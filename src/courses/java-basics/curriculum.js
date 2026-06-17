// Java 基础：核心原理与面试精讲 · 8 卷 16 章。slug 规则 jb{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'jb0',
    index: 0,
    title: 'Java 与面向对象',
    subtitle: 'Java & OOP',
    theme: '先把语言与平台讲透：Java 凭什么流行、JDK/JRE/JVM 各是什么、字节码如何「一次编写到处运行」；再立起面向对象的三大支柱，把封装、继承、多态讲到能答面试。',
    chapters: [
      { slug: 'jb0-c1', title: '平台概览：JDK/JRE/JVM 与字节码', topic: '原理', hook: 'Java 的核心优势、JDK 与 JRE 与 JVM 的层次关系、字节码与「一次编写到处运行」、常用 JDK 工具，以及 Java 与 Go 的取舍对比——把语言与平台的底座一次讲清。', minutes: 120, hasContent: true },
      { slug: 'jb0-c2', title: '面向对象：封装、继承、多态', topic: '原理', hook: '面向对象三大特性各解决什么问题、OOP 与面向过程的根本差异、Java 为何不支持类的多继承——把 OOP 从口号讲成可落地的设计思维。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'jb1',
    index: 1,
    title: '类、接口与对象',
    subtitle: 'Class, Interface & Object',
    theme: '面向对象的语言细节。先把接口与抽象类、内部类、不可变类、访问修饰符讲透，再深入方法与对象：重载与重写、静态与实例、参数传递、Object 类方法。',
    chapters: [
      { slug: 'jb1-c1', title: '类型体系：接口、抽象类、内部类、不可变类', topic: '原理', hook: '接口 vs 抽象类怎么选、四种内部类各自的用途、如何设计一个不可变类、四种访问修饰符的可见范围——把类型设计的常考点逐一拆开。', minutes: 130, hasContent: true },
      { slug: 'jb1-c2', title: '方法与对象：重载、重写、参数传递', topic: '原理', hook: '重载与重写的判定规则、静态方法与实例方法的差异、Java 参数传递到底是值还是引用、Object 类的核心方法、for 与 foreach 的取舍。', minutes: 130, hasContent: true },
    ],
  },
  {
    id: 'jb2',
    index: 2,
    title: '基本类型与数值',
    subtitle: 'Primitives & Numbers',
    theme: '数值世界的坑最多。先讲八种基本类型、包装类、自动装箱拆箱与 Integer 缓存池；再深入数值精度：BigDecimal、浮点比较、编码乱码与 JDK9 紧凑字符串。',
    chapters: [
      { slug: 'jb2-c1', title: '基本类型与装箱：包装类与 Integer 缓存', topic: '原理', hook: '八种基本数据类型、包装类与基本类型的区别、自动装箱与拆箱的底层、Integer 缓存池为何让 == 时灵时不灵——把数值的基础与陷阱讲明白。', minutes: 120, hasContent: true },
      { slug: 'jb2-c2', title: '数值精度：BigDecimal、浮点与编码', topic: '原理', hook: 'BigDecimal 为何不丢精度、float/double 为何不能直接用 == 比较、字符编码与乱码的成因、JDK9 String 从 char[] 改 byte[] 的紧凑字符串优化。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'jb3',
    index: 3,
    title: '字符串与常用类',
    subtitle: 'String & Common Classes',
    theme: '最常用也最常考。先把 String/StringBuffer/StringBuilder 三兄弟讲透，再到栈与队列、迭代器、Optional，以及 hashCode/equals/== 的关系。',
    chapters: [
      { slug: 'jb3-c1', title: 'String 家族：不可变、三兄弟与对象创建', topic: '原理', hook: 'String 为何不可变、StringBuffer 与 StringBuilder 的区别、StringBuilder 的扩容实现、new String("x") 到底创建几个对象——字符串高频题一网打尽。', minutes: 130, hasContent: true },
      { slug: 'jb3-c2', title: '常用类：栈/队列、迭代器、Optional、equals', topic: '原理', hook: '栈与队列的结构差异、迭代器 Iterator 的设计、Optional 如何优雅处理空值、hashCode 与 equals 与 == 三者的关系与契约。', minutes: 130, hasContent: true },
    ],
  },
  {
    id: 'jb4',
    index: 4,
    title: '异常与泛型',
    subtitle: 'Exception & Generics',
    theme: '健壮性与抽象能力。先把异常体系、受检与非受检、final/finally/finalize 讲清，再到泛型：作用、类型擦除、上下界通配符与深浅拷贝。',
    chapters: [
      { slug: 'jb4-c1', title: '异常体系：Exception/Error 与 finally', topic: '原理', hook: 'Exception 与 Error 的分界、运行时异常与编译时异常怎么区分、final 与 finally 与 finalize 三个长得像的关键字各干什么——把异常处理讲到位。', minutes: 120, hasContent: true },
      { slug: 'jb4-c2', title: '泛型：类型擦除、通配符与拷贝', topic: '原理', hook: '泛型解决什么问题、类型擦除导致哪些限制、上界 extends 与下界 super 通配符怎么用（PECS）、深拷贝与浅拷贝的实现差异。', minutes: 130, hasContent: true },
    ],
  },
  {
    id: 'jb5',
    index: 5,
    title: '反射、注解与代理',
    subtitle: 'Reflection, Annotation & Proxy',
    theme: '框架背后的魔法。先讲反射机制与注解原理，再到动态代理：JDK 动态代理与 CGLIB 的差异，以及 Java 的 SPI 服务发现机制。',
    chapters: [
      { slug: 'jb5-c1', title: '反射与注解：运行时的自省能力', topic: '原理', hook: '反射机制如何在运行时操作类与对象、它的典型应用与代价、注解的本质与处理原理——理解 Spring 等框架「凭空注入」的底层。', minutes: 120, hasContent: true },
      { slug: 'jb5-c2', title: '动态代理与 SPI：JDK Proxy vs CGLIB', topic: '原理', hook: '动态代理的原理与用途、JDK 动态代理与 CGLIB 的实现差异与取舍、Java SPI 机制如何实现「面向接口编程、运行时插拔实现」。', minutes: 130, hasContent: true },
    ],
  },
  {
    id: 'jb6',
    index: 6,
    title: '类加载与高频杂项',
    subtitle: 'ClassLoading & Misc',
    theme: '深入运行时与高频细节。先把类加载过程与双亲委派模型讲透，再扫一遍序列化、线程 start、调用系统命令、wait 与 sleep 等高频杂项。',
    chapters: [
      { slug: 'jb6-c1', title: '类加载机制与双亲委派模型', topic: '原理', hook: '一个类从加载到卸载经历哪些阶段、双亲委派模型是什么、它如何保证核心类库安全、何时需要打破它——把 JVM 加载类的全过程讲清。', minutes: 130, hasContent: true },
      { slug: 'jb6-c2', title: '高频杂项：序列化、线程与系统命令', topic: '原理', hook: '序列化与反序列化的机制与坑、为何线程不能两次调用 start()、如何在 Java 里调用外部程序或系统命令、wait 与 sleep 的本质区别。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'jb7',
    index: 7,
    title: 'IO 与新特性',
    subtitle: 'IO & New Features',
    theme: '收束全课。先讲 IO 流体系与 BIO/NIO/AIO、Channel/Selector 与网络编程，再纵览 Java 8 到 25 的关键新特性与各类对象命名规范。',
    chapters: [
      { slug: 'jb7-c1', title: 'IO 与网络：BIO/NIO/AIO 与 Selector', topic: '原理', hook: 'I/O 流的分类、BIO 与 NIO 与 AIO 的模型差异、NIO 的 Channel 与 Selector 如何支撑高并发、Java 网络编程的基本套路。', minutes: 130, hasContent: true },
      { slug: 'jb7-c2', title: '新特性与规范：Java 8~25 与 POJO 家族', topic: '总结', hook: 'Java 8/11/17/21/25 的关键新特性脉络、PO/VO/BO/DTO/DAO/POJO 这些命名到底各指什么——收束全课并对齐工程实践。', minutes: 110, hasContent: true },
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
