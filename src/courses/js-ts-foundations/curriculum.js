// JavaScript 与 TypeScript 语言基础：9 卷 18 章。slug 规则 j{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'j0',
    index: 0,
    title: '导论：JS 是怎样一门语言',
    subtitle: 'Overview',
    theme: '先把 JS 这门语言看清楚：它是怎么来的、在哪里运行、有哪些「奇怪」的设计，以及现代 JS/TS 工程长什么样。建立贯穿全课的心智地图。',
    chapters: [
      { slug: 'j0-c1', title: 'JS 的来历、运行环境与特点', topic: '动机', hook: '10 天造出来的语言、动态弱类型、单线程、函数一等公民、原型继承——这些设计决定了 JS 的「脾气」。讲清它在浏览器/Node 里怎么跑，以及 ECMAScript 标准。', minutes: 90, hasContent: true },
      { slug: 'j0-c2', title: '现代 JS/TS 工程概览', topic: '概览', hook: '从 <script> 标签到模块化、打包、TypeScript、Node 与 npm——快速看清现代前端语言工具链的全貌，知道每块拼图在哪。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'j1',
    index: 1,
    title: '类型与值',
    subtitle: 'Types & Values',
    theme: 'JS 的一切从值开始。讲透原始类型与对象、类型转换的规则、== 与 === 的坑、以及引用类型的赋值/拷贝/比较——这是无数 bug 的根源。',
    chapters: [
      { slug: 'j1-c1', title: '原始类型、类型转换与相等', topic: '原理', hook: '七种原始类型、typeof 的坑、隐式转换的规则（为什么 [] == ![] 为真）、== 与 === 的区别、NaN/null/undefined 的脾气——一次讲清。', minutes: 120, hasContent: true },
      { slug: 'j1-c2', title: '引用类型：赋值、拷贝与比较', topic: '原理', hook: '对象/数组是按引用传递的：赋值只是复制引用、浅拷贝 vs 深拷贝、为什么 {} === {} 为假。讲清值类型与引用类型在内存里的差别。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'j2',
    index: 2,
    title: '函数、闭包与 this',
    subtitle: 'Functions & Closures',
    theme: 'JS 里函数是一等公民。讲透函数的多种形态、作用域与提升、闭包的原理与用途，以及最让人头疼的 this 指向规则。',
    chapters: [
      { slug: 'j2-c1', title: '函数、作用域与闭包', topic: '原理', hook: '函数声明 vs 表达式 vs 箭头、变量提升与 TDZ、词法作用域与作用域链、闭包是什么（函数 + 它出生时的环境）以及它的经典用途与坑。', minutes: 150, hasContent: true },
      { slug: 'j2-c2', title: 'this 指向与 call/apply/bind', topic: '原理', hook: 'this 不看「在哪定义」而看「怎么调用」：默认/隐式/显式/new 四条绑定规则、箭头函数没有自己的 this、call/apply/bind 手动改 this。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'j3',
    index: 3,
    title: '对象与原型',
    subtitle: 'Objects & Prototypes',
    theme: 'JS 的面向对象建立在原型之上。讲透对象的创建与属性、原型链查找、class 语法糖背后的原型继承，以及继承的几种实现。',
    chapters: [
      { slug: 'j3-c1', title: '原型与原型链', topic: '原理', hook: '每个对象都有一条原型链：访问属性时沿链向上找。讲清 [[Prototype]]/__proto__/prototype 的关系、原型链查找、以及继承的本质。', minutes: 150, hasContent: true },
      { slug: 'j3-c2', title: 'class 语法与面向对象', topic: '原理', hook: 'class 是原型继承的语法糖：构造器、实例/静态成员、extends/super、私有字段 #x、getter/setter。讲清它和原型的对应关系。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'j4',
    index: 4,
    title: '异步编程',
    subtitle: 'Async',
    theme: 'JS 是单线程的，靠事件循环处理异步。这是最该讲透也最容易出错的部分：事件循环与任务队列、Promise 的状态机、async/await 的本质。',
    chapters: [
      { slug: 'j4-c1', title: '事件循环：单线程如何并发', topic: '原理', hook: '调用栈、Web API、宏任务/微任务队列、事件循环——一张图讲清「setTimeout 0 为什么不立即执行」「Promise 回调为什么先于 setTimeout」。', minutes: 150, hasContent: true },
      { slug: 'j4-c2', title: 'Promise 与 async/await', topic: '原理', hook: 'Promise 是异步的状态机（pending/fulfilled/rejected）；then 链式、错误传播、Promise.all/race/allSettled；async/await 是 Promise 的语法糖，让异步像同步一样读。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'j5',
    index: 5,
    title: 'ES6+ 现代特性',
    subtitle: 'Modern JS',
    theme: '现代 JS 的日常写法。讲解构与展开、模块系统、模板字符串、可选链等语法糖，以及迭代器/生成器、Map/Set、Symbol 等进阶特性。',
    chapters: [
      { slug: 'j5-c1', title: '解构、展开、模块与常用语法糖', topic: '实战', hook: '解构赋值、展开/剩余 (...)、默认参数、模板字符串、可选链 ?. 与空值合并 ??、ES Module 的 import/export——把现代 JS 的日常写法一次过。', minutes: 120, hasContent: true },
      { slug: 'j5-c2', title: '迭代器、生成器与 Map/Set/Symbol', topic: '原理', hook: '可迭代协议（for...of 怎么工作）、生成器 function* 与 yield、Map/Set/WeakMap 的用途、Symbol 唯一键——这些进阶特性解决了什么。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'j6',
    index: 6,
    title: 'TypeScript 入门',
    subtitle: 'TypeScript Basics',
    theme: '从零搭起类型系统。讲 TS 解决了什么、基础类型标注、类型推断，再到接口、类型别名与泛型——给 JS 加上一层编译期的安全网。',
    chapters: [
      { slug: 'j6-c1', title: '为什么用 TS 与基础类型', topic: '原理', hook: 'TS 在编译期帮你抓 bug：类型标注、推断、字面量类型、数组/元组/枚举、any/unknown/never、联合类型——给动态的 JS 加上静态类型。', minutes: 150, hasContent: true },
      { slug: 'j6-c2', title: '接口、类型别名与泛型', topic: '原理', hook: 'interface 与 type 描述对象形状（及两者取舍）、可选/只读属性、函数类型；泛型 <T> 让类型可复用——写一个类型安全的容器与函数。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'j7',
    index: 7,
    title: 'TypeScript 进阶',
    subtitle: 'Advanced Types',
    theme: 'TS 类型系统的强大之处。讲联合/交叉、字面量与判别联合、类型收窄，再到条件类型、映射类型、infer 与内置工具类型——会读会写复杂类型。',
    chapters: [
      { slug: 'j7-c1', title: '联合/交叉、类型收窄与判别联合', topic: '原理', hook: '联合类型 A|B、交叉 A&B、类型守卫与收窄（typeof/in/instanceof）、判别联合（用一个 tag 字段安全地分支）、never 穷尽检查——写出健壮的类型分支。', minutes: 150, hasContent: true },
      { slug: 'j7-c2', title: '条件/映射类型与工具类型', topic: '原理', hook: 'keyof/索引访问、映射类型（遍历键生成新类型）、条件类型 T extends U ? X : Y 与 infer 提取、内置工具类型 Partial/Pick/Record/ReturnType——揭开「类型体操」的底层。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'j8',
    index: 8,
    title: '模块化与工程实践',
    subtitle: 'Modules & Practice',
    theme: '把语言放进真实工程：模块化的演进、TS 工程配置与最佳实践、以及一份收束全课的进阶地图。',
    chapters: [
      { slug: 'j8-c1', title: '模块化演进：从 IIFE 到 ESM', topic: '原理', hook: '全局变量污染 → IIFE → CommonJS（require/module.exports）→ ESM（import/export）。讲清各方案的由来、差异，以及 Node 与浏览器里的模块现状。', minutes: 120, hasContent: true },
      { slug: 'j8-c2', title: 'TS 工程配置、最佳实践与进阶地图', topic: '总结', hook: 'tsconfig 关键选项（strict、target、module）、类型声明 .d.ts、与构建工具集成、避免 any 的实践；最后给一张 JS/TS 进阶学习地图，收束全课。', minutes: 120, hasContent: true },
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
