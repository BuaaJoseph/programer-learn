// 设计模式：3 卷 8 章。slug 规则 dp{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'dp1',
    index: 1,
    title: '原则与创建型',
    subtitle: 'Principles & Creational',
    theme: '设计模式的根是设计原则。先立住原则，再看怎么优雅地「创建对象」。',
    chapters: [
      { slug: 'dp1-c1', title: '七大设计原则', topic: '设计原则', hook: '单一职责、开闭、里氏替换、依赖倒置、接口隔离、迪米特、合成复用——所有模式都在践行这些原则。', minutes: 120, hasContent: true },
      { slug: 'dp1-c2', title: '单例模式：五种写法', topic: '单例', hook: '饿汉、懒汉、双重检查锁(volatile)、静态内部类、枚举——面试最爱问的就是它们的线程安全与优劣。', minutes: 120, hasContent: true },
      { slug: 'dp1-c3', title: '工厂模式：简单工厂到抽象工厂', topic: '工厂', hook: '把 new 集中起来、面向接口编程：简单工厂、工厂方法、抽象工厂解决不同程度的创建解耦。', minutes: 120, hasContent: true },
      { slug: 'dp1-c4', title: '建造者与原型模式', topic: '建造者/原型', hook: '建造者用链式调用一步步装配复杂对象(如 Lombok @Builder)；原型用克隆来复制对象。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'dp2',
    index: 2,
    title: '结构型模式',
    subtitle: 'Structural',
    theme: '结构型模式关注「怎么把类和对象组合成更大的结构」，代理是其中的重中之重。',
    chapters: [
      { slug: 'dp2-c1', title: '代理模式：静态、JDK 与 CGLIB', topic: '代理', hook: '代理在不改原类的前提下增强它——Spring AOP、RPC、MyBatis Mapper 全靠它，是面试超高频。', minutes: 120, hasContent: true },
      { slug: 'dp2-c2', title: '装饰器、适配器与外观', topic: '结构型', hook: '装饰器动态加功能(如 Java IO 流)、适配器转换接口、外观给子系统一个简单入口。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'dp3',
    index: 3,
    title: '行为型模式',
    subtitle: 'Behavioral',
    theme: '行为型模式关注「对象之间怎么协作、分配职责」，能消灭大量 if-else。',
    chapters: [
      { slug: 'dp3-c1', title: '策略模式：消灭 if-else', topic: '策略', hook: '把一族可互换的算法各自封装，运行时按需选择——支付方式、促销规则用它最合适。', minutes: 120, hasContent: true },
      { slug: 'dp3-c2', title: '观察者、模板方法与责任链', topic: '行为型', hook: '观察者做事件通知(发布订阅)、模板方法定骨架留钩子、责任链让多个处理器顺序处理(如过滤器链)。', minutes: 120, hasContent: true },
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
