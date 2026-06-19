export const meta = {
  slug: 'os',
  title: '操作系统：进程、内存与 IO',
  shortTitle: '操作系统',
  subtitle: 'Operating Systems',
  categoryId: 'cs',
  subCategoryId: 'os',
  level: '入门到进阶',
  cover: '🖥️',
  coverScene: 'osproc',
  accent: '#9333ea',
  pricing: 'free',
  description:
    '用具体例子讲透操作系统核心：进程/线程/协程、调度算法、进程间通信、死锁、虚拟内存与分页、页面置换、用户态/内核态与系统调用、五种 IO 模型。每章配可交互的动态图。',
  audience: [
    '会编程但说不清「进程和线程到底差在哪」的工程师',
    '面试常被问进程线程、死锁、虚拟内存、IO 多路复用的人',
    '想把操作系统基础和后端开发联系起来的开发者',
  ],
  outcomes: [
    '讲清进程/线程/协程的区别与进程调度算法',
    '掌握进程间通信、死锁四条件与预防/避免/检测',
    '理解虚拟内存、分页与页面置换算法(LRU 等)',
    '看懂用户态/内核态、系统调用与五种 IO 模型(对应 BIO/NIO/多路复用)',
  ],
}

export default meta
