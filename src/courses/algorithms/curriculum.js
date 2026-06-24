// 算法思路讲解：3 卷 13 章。slug 规则 alg{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'alg1',
    index: 1,
    title: '数据结构基础',
    subtitle: 'Data Structures',
    theme: '算法操作的是数据，数据怎么摆放决定了算法能多快。先把数组、链表、栈队列、树、图这几种「容器」的结构和代价看懂。',
    chapters: [
      { slug: 'alg1-c1', title: '数组：连续内存的力量', topic: '数组', hook: '数组把元素紧挨着放在一块连续内存里，靠下标一步算出地址，所以随机访问是 O(1)；但插入删除要搬一大片数据。', minutes: 70, hasContent: true },
      { slug: 'alg1-c2', title: '链表：指针串起的珠子', topic: '链表', hook: '链表把节点散落各处、用 next 指针串起来，插入删除只改指针 O(1)，代价是随机访问要一个个跳 O(n)。', minutes: 80, hasContent: true },
      { slug: 'alg1-c3', title: '栈与队列：受限的线性表', topic: '栈/队列', hook: '故意限制只能从某一端进出，反而换来清晰的语义：栈是后进先出(LIFO)、队列是先进先出(FIFO)，DFS 和 BFS 就建立在它们之上。', minutes: 75, hasContent: true },
      { slug: 'alg1-c4', title: '二叉树与二叉搜索树', topic: '二叉树', hook: '树用分叉表达层级关系。二叉搜索树让「左小右大」成为规则，查找像猜数字一样每次排除一半，平均 O(log n)。', minutes: 90, hasContent: true },
      { slug: 'alg1-c5', title: '多叉树、B 树与 B+ 树', topic: 'B/B+树', hook: '当数据躺在磁盘上，树要尽量「矮胖」减少读盘次数。B 树和 B+ 树让一个节点存很多键、有很多孩子——这就是数据库索引的底座。', minutes: 90, hasContent: true },
      { slug: 'alg1-c6', title: '图：万物互联的结构', topic: '图', hook: '图用顶点和边描述任意关系：社交网络、地图、依赖。它怎么存(邻接矩阵 vs 邻接表)直接影响遍历效率。', minutes: 85, hasContent: true },
    ],
  },
  {
    id: 'alg2',
    index: 2,
    title: '排序算法：循序渐进',
    subtitle: 'Sorting',
    theme: '从最直观的插入、冒泡，到分治思想的快速、归并——每一种都配可播放的动画，按下播放看数据怎样一步步变得有序。',
    chapters: [
      { slug: 'alg2-c1', title: '插入排序：像整理扑克牌', topic: '插入排序', hook: '把每张新牌插到左手已排好的牌里合适的位置。简单直观，对近乎有序的数据极快，是理解排序的最佳起点。', minutes: 75, hasContent: true },
      { slug: 'alg2-c2', title: '冒泡排序：相邻交换', topic: '冒泡排序', hook: '反复比较相邻两个、把大的往右换，每一轮都有一个最大值「冒」到末尾。它慢，但把「交换排序」的思路讲得最清楚。', minutes: 70, hasContent: true },
      { slug: 'alg2-c3', title: '快速排序：分而治之', topic: '快速排序', hook: '选一个基准，把小的甩左、大的甩右，基准一次就位，再对两边递归。平均 O(n log n)，是工程里最常用的排序。', minutes: 95, hasContent: true },
      { slug: 'alg2-c4', title: '归并排序：拆开再合并', topic: '归并排序', hook: '把数组对半拆到不能再拆，再把两个有序段合并成更大的有序段。稳定、最坏也是 O(n log n)，外部排序的基础。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'alg3',
    index: 3,
    title: '遍历算法：树与图',
    subtitle: 'Traversal',
    theme: '怎么不重不漏地走遍一棵树、一张图？前中后序、层序，以及通用的深度优先(DFS)与广度优先(BFS)——全部配动态演示。',
    chapters: [
      { slug: 'alg3-c1', title: '二叉树的遍历：前序/中序/后序/层序', topic: '树遍历', hook: '同一棵树，先访问根还是先访问子树，决定了前序、中序、后序；一层层访问则是层序。一个动画看清四种顺序的差别。', minutes: 90, hasContent: true },
      { slug: 'alg3-c2', title: '深度优先搜索 DFS', topic: 'DFS', hook: '沿着一条路一直往深走，走到底再回退换路。用递归或栈实现，是走迷宫、找连通块、拓扑排序的通用套路。', minutes: 85, hasContent: true },
      { slug: 'alg3-c3', title: '广度优先搜索 BFS', topic: 'BFS', hook: '像水波一样从起点一圈圈向外扩散，用队列实现。它能找到无权图里的最短路径，是最短步数类问题的首选。', minutes: 85, hasContent: true },
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
