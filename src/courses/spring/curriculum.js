// Spring 通关：3 卷 8 章。slug 规则 sp{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'sp1',
    index: 1,
    title: 'IoC 与 AOP',
    subtitle: 'IoC & AOP',
    theme: 'Spring 的两大基石是 IoC 和 AOP。先搞懂对象是怎么被容器管起来的、切面是怎么织进去的。',
    chapters: [
      { slug: 'sp1-c1', title: 'IoC 与 DI：把对象交给容器', topic: 'IoC/DI', hook: '控制反转就是把「自己 new 依赖」变成「容器把依赖喂给你」，于是对象之间解耦、可替换、好测试。', minutes: 120, hasContent: true },
      { slug: 'sp1-c2', title: 'Bean 的生命周期', topic: 'Bean 生命周期', hook: '实例化→属性填充→Aware 回调→初始化前后(BeanPostProcessor)→可用→销毁，AOP 代理就是在初始化后这一步织入的。', minutes: 150, hasContent: true },
      { slug: 'sp1-c3', title: 'AOP 原理：JDK 动态代理 vs CGLIB', topic: 'AOP', hook: 'AOP 靠动态代理：有接口用 JDK 代理(基于接口)、没接口用 CGLIB(基于继承子类)——这决定了一些注解失效的坑。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'sp2',
    index: 2,
    title: '进阶原理',
    subtitle: 'Internals',
    theme: '循环依赖、事务、MVC 流程——这三个是 Spring 面试的高频深水区。',
    chapters: [
      { slug: 'sp2-c1', title: '三级缓存解决循环依赖', topic: '循环依赖', hook: 'A 依赖 B、B 依赖 A，Spring 用三级缓存提前暴露半成品对象来破环——但构造器注入的循环依赖解决不了。', minutes: 150, hasContent: true },
      { slug: 'sp2-c2', title: 'Spring 事务：传播行为与失效场景', topic: '事务', hook: '@Transactional 靠 AOP 代理；传播行为决定嵌套事务怎么走，而方法内部自调用、非 public、异常被吞都会让事务失效。', minutes: 120, hasContent: true },
      { slug: 'sp2-c3', title: 'SpringMVC 请求处理流程', topic: 'SpringMVC', hook: '请求经 DispatcherServlet → HandlerMapping 找处理器 → HandlerAdapter 执行 → 返回 ModelAndView → 视图解析渲染。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'sp3',
    index: 3,
    title: 'SpringBoot',
    subtitle: 'Spring Boot',
    theme: 'SpringBoot 让一切「开箱即用」，魔法背后是自动配置和条件装配。',
    chapters: [
      { slug: 'sp3-c1', title: 'SpringBoot 自动配置原理', topic: '自动配置', hook: '@SpringBootApplication 里的 @EnableAutoConfiguration 扫描所有 starter 的配置类，再按条件决定装不装。', minutes: 120, hasContent: true },
      { slug: 'sp3-c2', title: 'starter 与条件装配', topic: 'starter/条件装配', hook: 'starter 把一组依赖和默认配置打包；@Conditional 系列注解让 Bean「满足条件才创建」，这就是按需装配。', minutes: 90, hasContent: true },
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
