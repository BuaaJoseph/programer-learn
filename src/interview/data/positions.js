// 面试岗位 + 每个岗位推荐考察的技能点。
// 用户在面试设置页选择岗位后，会按这里的 skills 推荐勾选项；也可自定义添加。
export const POSITIONS = [
  {
    id: 'backend',
    title: '服务端开发',
    desc: 'Java / Go 后端、分布式、中间件、高并发',
    skills: [
      'Java 基础', 'JVM 与垃圾回收', '并发编程', 'MySQL', 'Redis',
      'RPC', '消息队列 MQ', 'Spring / Spring Boot', '计算机网络',
      '操作系统', '分布式与微服务', '设计模式',
    ],
  },
  {
    id: 'frontend',
    title: '前端开发',
    desc: 'JS/TS、框架、浏览器原理、工程化',
    skills: [
      'JavaScript 基础', 'TypeScript', 'HTML / CSS', '浏览器原理',
      'React', 'Vue', '网络与 HTTP', '前端工程化', '性能优化', 'Node.js',
    ],
  },
  {
    id: 'ios',
    title: 'iOS 开发',
    desc: 'Swift / OC、UIKit、内存与性能',
    skills: [
      'Swift', 'Objective-C', 'UIKit', 'SwiftUI', '内存管理 / ARC',
      'Runtime 运行时', '多线程 / GCD', '网络层', '性能优化', '架构设计',
    ],
  },
  {
    id: 'android',
    title: 'Android 开发',
    desc: 'Kotlin / Java、Jetpack、性能优化',
    skills: [
      'Kotlin', 'Java 基础', 'Android 四大组件', 'Jetpack', '自定义 View',
      'Handler / Looper', '内存优化', '多线程', '架构（MVVM/MVI）', '性能优化',
    ],
  },
  {
    id: 'algorithm',
    title: '算法',
    desc: '数据结构、刷题、机器学习基础',
    skills: [
      '数组与字符串', '链表 / 树 / 图', '动态规划', '贪心', '回溯',
      '二分查找', '排序', '哈希', '数学', '机器学习基础',
    ],
  },
  {
    id: 'agent',
    title: 'Agent 开发',
    desc: 'LLM 应用、RAG、Agent 编排',
    skills: [
      'Prompt 工程', 'RAG 检索增强', 'Function Calling', 'Agent 框架',
      '向量数据库', '记忆系统', '多 Agent 协作', 'LLM 应用架构',
      '评估与可观测', '工具集成 MCP',
    ],
  },
  {
    id: 'llm-algo',
    title: '大模型算法',
    desc: '预训练、微调、推理优化',
    skills: [
      'Transformer 结构', 'Attention 机制', '预训练', 'SFT 微调',
      'LoRA / PEFT', 'RLHF', '分布式训练', '推理优化', '模型评估', '强化学习基础',
    ],
  },
]

// 每个技能点对应的「常见考题」种子。面试官（LLM）会在面试前阅读这些题目用于安排技术考察。
// 不必穷尽——LLM 会据此延展并结合简历追问。重点覆盖服务端常见中间件原理题。
export const SKILL_QUESTIONS = {
  'Java 基础': [
    'ThreadLocal 的实现原理与内存泄漏问题',
    'synchronized 的锁升级（偏向锁/轻量级锁/重量级锁）',
    'HashMap 的扩容、红黑树退化与线程安全问题',
    'volatile 的可见性与有序性（happens-before）',
    'final / static 关键字、不可变对象',
  ],
  'JVM 与垃圾回收': [
    'JVM 内存区域划分（堆/栈/方法区/元空间）',
    '垃圾回收算法（标记清除/复制/标记整理）与分代收集',
    'GC Roots 可达性分析、CMS 与 G1 的区别',
    '类加载过程与双亲委派模型',
    '一次 Full GC 频繁的排查思路',
  ],
  '并发编程': [
    'AQS 的实现原理（state + CLH 队列）',
    'ReentrantLock 与 synchronized 的区别',
    '线程池核心参数与拒绝策略、execute 流程',
    'CAS 与 ABA 问题、原子类',
    'ConcurrentHashMap 1.7/1.8 的实现差异',
  ],
  MySQL: [
    'B+Tree 索引结构、为什么用 B+Tree 而不是 B-Tree/红黑树',
    '聚簇索引与二级索引、回表与覆盖索引',
    '最左前缀原则、索引失效场景',
    '事务隔离级别与对应的并发异常（脏读/不可重复读/幻读）',
    'MVCC 的实现（undo log 版本链 + ReadView）',
    'redo log / undo log / binlog 的作用与两阶段提交',
    '间隙锁 / Next-Key Lock 如何解决幻读',
  ],
  Redis: [
    'Redis 常用数据结构与底层实现（SDS/ziplist/quicklist/skiplist/hash)',
    '缓存穿透 / 击穿 / 雪崩及解决方案',
    '分布式锁的实现、Redisson watchdog 续约原理',
    '持久化 RDB 与 AOF 的取舍',
    '过期删除策略与内存淘汰策略',
    '哨兵模式、主从复制与数据同步、Cluster 分片',
  ],
  RPC: [
    'RPC 调用的完整流程（代理/序列化/网络/反序列化）',
    '常见序列化协议对比（Protobuf/Hessian/JSON)',
    '服务注册与发现、负载均衡策略',
    '熔断、限流、降级的实现',
    'Netty 在 RPC 中的作用与 Reactor 模型',
  ],
  '消息队列 MQ': [
    '发布订阅与点对点模式',
    'MQ 如何保证消息不丢失（生产者/Broker/消费者三端）',
    '消费端如何防止重复消费（幂等设计）',
    '消息顺序性如何保证',
    '消息积压如何处理、死信队列',
    'Kafka 高吞吐的原因（顺序写/零拷贝/分区）',
  ],
  'Spring / Spring Boot': [
    'IOC 与 DI、Bean 的生命周期',
    'AOP 实现原理（JDK 动态代理 vs CGLIB）',
    '循环依赖与三级缓存',
    '@Transactional 失效的场景',
    'Spring Boot 自动装配原理',
  ],
  '计算机网络': [
    'TCP 三次握手 / 四次挥手、为什么',
    'TCP 如何保证可靠传输（滑动窗口/拥塞控制）',
    'HTTP/1.1 / 2 / 3 的区别，HTTPS 握手过程',
    'HTTP 与 TCP 长连接、keep-alive',
    '从输入 URL 到页面展示的全过程',
  ],
  '操作系统': [
    '进程与线程、协程的区别',
    '进程间通信方式',
    '虚拟内存、分页与缺页中断',
    '死锁的条件与避免',
    'IO 多路复用 select/poll/epoll',
  ],
  '分布式与微服务': [
    'CAP 与 BASE 理论',
    '分布式事务（2PC/TCC/本地消息表/Seata)',
    '分布式 ID 生成方案（雪花算法）',
    '一致性哈希',
    '限流算法（令牌桶/漏桶/滑动窗口）',
  ],
  '设计模式': [
    '单例模式的几种写法与线程安全',
    '工厂 / 策略 / 模板方法的应用场景',
    '代理模式与装饰器模式的区别',
    '观察者模式与发布订阅',
  ],
  // —— 前端 ——
  'JavaScript 基础': [
    '原型链与继承', '闭包与作用域链', 'this 指向与 call/apply/bind',
    '事件循环（宏任务/微任务）', 'Promise 实现原理',
  ],
  TypeScript: ['类型体操（泛型/条件类型/映射类型）', 'interface 与 type 的区别', '类型守卫与协变逆变'],
  'HTML / CSS': ['盒模型与 BFC', 'flex/grid 布局', '水平垂直居中方案', '重排与重绘'],
  '浏览器原理': ['浏览器渲染流程', '回流与重绘', '跨域与 CORS', '存储 cookie/localStorage/sessionStorage'],
  React: ['Fiber 架构与协调', 'Hooks 原理与闭包陷阱', 'diff 算法与 key', '状态管理与性能优化(memo/useMemo)'],
  Vue: ['响应式原理（Vue2 defineProperty / Vue3 Proxy)', 'diff 与虚拟 DOM', 'nextTick 原理', 'computed 与 watch'],
  '网络与 HTTP': ['HTTP 缓存（强缓存/协商缓存）', '跨域解决方案', 'HTTPS 过程', 'HTTP/2 多路复用'],
  '前端工程化': ['Webpack/Vite 构建原理', 'tree-shaking', '懒加载与代码分割', 'Babel 与 AST'],
  '性能优化': ['首屏优化', '资源加载优化', '长列表虚拟滚动', 'Lighthouse 指标'],
  'Node.js': ['事件循环与 libuv', 'Stream 与 Buffer', '进程与 cluster', '中间件机制'],
  // —— 算法 ——
  '动态规划': ['背包问题', '最长递增子序列', '编辑距离', '股票买卖系列'],
  '链表 / 树 / 图': ['链表反转与环检测', '二叉树遍历', 'LCA 最近公共祖先', '拓扑排序/最短路径'],
  '机器学习基础': ['过拟合与正则化', '常见损失函数', '梯度下降与优化器', '评估指标(AUC/F1)'],
  // —— 大模型 / Agent ——
  'Transformer 结构': ['Self-Attention 计算', '位置编码', 'Multi-Head 作用', 'LayerNorm 位置（Pre/Post)'],
  'Attention 机制': ['QKV 含义与缩放点积', 'Causal Mask', 'KV Cache 原理', 'Flash Attention'],
  'SFT 微调': ['指令微调数据构造', '全参微调 vs PEFT', '灾难性遗忘', '学习率与 warmup'],
  'LoRA / PEFT': ['LoRA 原理（低秩分解）', 'QLoRA', 'Adapter / Prefix Tuning 对比', 'rank 选择'],
  RLHF: ['RLHF 三阶段', 'PPO 与 DPO 的区别', '奖励模型训练', 'KL 惩罚作用'],
  '推理优化': ['量化（INT8/INT4）', 'KV Cache 与 PagedAttention', '投机解码', '连续批处理'],
  'Prompt 工程': ['Few-shot / CoT', '结构化输出', 'Prompt 注入与防护', '角色与系统提示设计'],
  'RAG 检索增强': ['切块与 embedding 策略', '向量检索与重排', '幻觉抑制', '多路召回'],
  'Function Calling': ['工具定义与参数 schema', '并行工具调用', '错误处理与重试', 'ReAct 循环'],
}

// 给定已选技能列表，汇总它们的常见考题（用于喂给面试官）。
export function questionsForSkills(skills) {
  const out = []
  for (const s of skills) {
    const qs = SKILL_QUESTIONS[s]
    if (qs && qs.length) out.push({ skill: s, questions: qs })
  }
  return out
}

export function findPosition(id) {
  return POSITIONS.find((p) => p.id === id) || null
}
