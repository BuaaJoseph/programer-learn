// Python 教程 · 从入门到 Agent 开发：11 卷 22 章。slug 规则 py{卷}-c{章}。实例驱动、零基础友好。
export const VOLUMES = [
  {
    id: 'py0',
    index: 0,
    title: 'Python 入门',
    subtitle: 'Getting Started',
    theme: '先认识 Python 是什么、能干什么，把环境装好，跑通第一个程序，建立「写代码—运行—看结果」的循环。',
    chapters: [
      { slug: 'py0-c1', title: '认识 Python 与安装环境', topic: '入门', hook: 'Python 为什么这么流行、适合做什么；如何安装 Python、用什么写代码（IDE/编辑器），以及交互式 REPL 怎么玩。', minutes: 60, hasContent: true },
      { slug: 'py0-c2', title: '第一个程序与运行方式', topic: '入门', hook: '用 print 输出 Hello World、怎么运行脚本、注释怎么写、为什么 Python 靠缩进而不是花括号——第一课就动手。', minutes: 60, hasContent: true },
    ],
  },
  {
    id: 'py1',
    index: 1,
    title: '变量与基本类型',
    subtitle: 'Variables & Types',
    theme: '程序就是处理数据。先学会用变量装数据，认识数字、字符串这些最基本的类型，以及怎么读输入、做运算。',
    chapters: [
      { slug: 'py1-c1', title: '变量、数字与运算', topic: '基础', hook: '变量赋值、整数与小数、算术运算符、类型转换、用 type 看类型、input 读输入——配大量小例子。', minutes: 90, hasContent: true },
      { slug: 'py1-c2', title: '字符串', topic: '基础', hook: '字符串的创建、索引与切片、常用方法（大小写/查找/替换/分割）、用 f-string 漂亮地拼接——字符串是最常用的数据。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py2',
    index: 2,
    title: '常用数据结构',
    subtitle: 'Data Structures',
    theme: '列表、字典是 Python 里用得最多的容器。学会它们，就能组织和处理成批的数据。',
    chapters: [
      { slug: 'py2-c1', title: '列表与元组', topic: '基础', hook: '列表的增删改查、切片、遍历、常用方法（append/sort 等）；元组为什么不可变、什么时候用——配可运行例子。', minutes: 90, hasContent: true },
      { slug: 'py2-c2', title: '字典与集合', topic: '基础', hook: '字典用键取值、增删改查、遍历键值对；集合自动去重、做交并差——这两个结构在实战里无处不在。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py3',
    index: 3,
    title: '流程控制',
    subtitle: 'Control Flow',
    theme: '让程序「会判断、会重复」。条件语句和循环是把死代码变成活逻辑的关键。',
    chapters: [
      { slug: 'py3-c1', title: '条件判断与循环', topic: '基础', hook: 'if/elif/else 做分支、比较与逻辑运算、for 遍历、while 循环、break/continue、range——用小题目练手。', minutes: 90, hasContent: true },
      { slug: 'py3-c2', title: '推导式与常用技巧', topic: '基础', hook: '列表/字典推导式一行搞定循环、enumerate 带下标遍历、zip 并行遍历——写出更 Pythonic 的代码。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py4',
    index: 4,
    title: '函数',
    subtitle: 'Functions',
    theme: '把重复的逻辑封装成函数，是写出可复用、可读代码的第一步。',
    chapters: [
      { slug: 'py4-c1', title: '函数基础', topic: '基础', hook: 'def 定义函数、传参与返回值、默认参数与关键字参数、局部与全局作用域——把一段逻辑变成可复用的工具。', minutes: 90, hasContent: true },
      { slug: 'py4-c2', title: '可变参数与 lambda', topic: '基础', hook: '*args/**kwargs 接收任意参数、匿名函数 lambda、高阶函数 map/filter/sorted——函数还能更灵活。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py5',
    index: 5,
    title: '模块与包管理',
    subtitle: 'Modules & pip',
    theme: '一个人写不完所有代码。学会用标准库、装第三方库、管理依赖，才能站在巨人肩膀上。',
    chapters: [
      { slug: 'py5-c1', title: '模块与标准库', topic: '基础', hook: 'import 导入模块、from 取出函数、把代码拆成自己的模块；常用标准库 os/sys/math/random/datetime 速览。', minutes: 90, hasContent: true },
      { slug: 'py5-c2', title: '第三方库与虚拟环境', topic: '基础', hook: '用 pip 安装第三方库、用 venv 建隔离的虚拟环境、requirements.txt 锁依赖——为后面装 requests、openai 做准备。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py6',
    index: 6,
    title: '文件与异常',
    subtitle: 'Files & Errors',
    theme: '真实程序要读写文件、要应对出错。学会文件操作、异常处理和 JSON，程序才健壮、能落地。',
    chapters: [
      { slug: 'py6-c1', title: '文件读写', topic: '基础', hook: 'open 打开文件、用 with 自动关闭、读写文本、按行处理、文件路径——把数据存下来、读回来。', minutes: 90, hasContent: true },
      { slug: 'py6-c2', title: '异常处理与 JSON', topic: '基础', hook: 'try/except/finally 捕获错误、raise 抛异常；用 json 模块读写 JSON——这是和 API 打交道的必备技能。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py7',
    index: 7,
    title: '面向对象',
    subtitle: 'OOP',
    theme: '用类把「数据 + 操作」打包成对象，是组织复杂程序的主流方式，也是读懂各种库的基础。',
    chapters: [
      { slug: 'py7-c1', title: '类与对象', topic: '基础', hook: 'class 定义类、__init__ 初始化、属性与方法、self 是什么、实例属性 vs 类属性——从面向过程跨到面向对象。', minutes: 90, hasContent: true },
      { slug: 'py7-c2', title: '继承与魔术方法', topic: '基础', hook: '继承复用父类、super 调用、重写方法；__str__/__repr__ 等魔术方法、用 dataclass 少写样板——让类更好用。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py8',
    index: 8,
    title: '进阶实用技巧',
    subtitle: 'Practical Python',
    theme: '一批让代码更优雅、在实战和读库时常遇到的特性：迭代器、生成器、装饰器，以及正则、类型注解等。',
    chapters: [
      { slug: 'py8-c1', title: '迭代器、生成器与装饰器', topic: '进阶', hook: '可迭代对象与 for 的原理、用 yield 写生成器省内存、装饰器给函数「加料」、with 上下文管理器——读库必备。', minutes: 120, hasContent: true },
      { slug: 'py8-c2', title: '正则、类型注解与常用工具', topic: '进阶', hook: '正则 re 做文本匹配、类型注解让代码更清晰、常用内置函数（len/sum/sorted/any 等）与好用的标准库一览。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'py9',
    index: 9,
    title: '连接真实世界（Agent 前置）',
    subtitle: 'HTTP & LLM API',
    theme: '从「在本地跑」到「和外部世界交互」。学会发 HTTP 请求、调用大模型 API，是迈向 Agent 开发的桥梁。',
    chapters: [
      { slug: 'py9-c1', title: '用 Python 发 HTTP 请求', topic: '实战', hook: '装 requests、发 GET/POST、带 headers 和参数、解析 JSON 响应、处理状态码与超时——程序学会上网。', minutes: 120, hasContent: true },
      { slug: 'py9-c2', title: '调用大模型 API（百炼/Qwen）', topic: '实战', hook: '用环境变量安全保管 API key、用 openai SDK 接百炼的 OpenAI 兼容端点、发一次对话、读多轮上下文——第一次让程序「会说话」。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'py10',
    index: 10,
    title: 'Agent 开发入门',
    subtitle: 'Build Your First Agent',
    theme: '把前面学的全部串起来：让大模型不只是聊天，而是能调用你写的工具、按「想—做—看」的循环自主完成任务——写出你的第一个 Agent。',
    chapters: [
      { slug: 'py10-c1', title: '从裸调 LLM 到工具调用', topic: '实战', hook: 'Agent 到底是什么、系统提示与多轮对话怎么管；function calling（工具调用）的原理——让模型决定「调用哪个函数、传什么参数」，你来执行。', minutes: 150, hasContent: true },
      { slug: 'py10-c2', title: '写一个能跑的小 Agent', topic: '实战', hook: '先手写一个最小 ReAct 循环（想→调工具→看结果→再想），再用 smolagents 接百炼几行搭一个带工具的 Agent——为进阶《Agent 框架》课打好地基。', minutes: 150, hasContent: true },
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
