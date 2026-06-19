// Nginx 通关：2 卷 8 章。slug 规则 ng{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'ng1',
    index: 1,
    title: '核心与架构',
    subtitle: 'Core & Architecture',
    theme: 'Nginx 能扛高并发，靠的是 master-worker 多进程 + 事件驱动(epoll)。先看懂它是什么、怎么处理请求。',
    chapters: [
      { slug: 'ng1-c1', title: 'Nginx 是什么：正向代理 vs 反向代理', topic: 'Nginx 定位', hook: '正向代理替客户端出门(翻墙)、反向代理替服务端挡门(网关)——Nginx 最常用的就是后者。', minutes: 90, hasContent: true },
      { slug: 'ng1-c2', title: '架构：master-worker 与事件驱动', topic: '架构原理', hook: '一个 master 管理多个 worker，每个 worker 用 epoll 事件驱动单线程处理成千上万连接——这是高并发的根。', minutes: 120, hasContent: true },
      { slug: 'ng1-c3', title: '请求处理流程与 location 匹配', topic: 'location 匹配', hook: 'server_name 选虚拟主机、location 选处理规则；= ^~ ~ ~* 前缀各有优先级，匹配错了请求就走偏。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ng2',
    index: 2,
    title: '应用与进阶',
    subtitle: 'Practice',
    theme: '负载均衡、动静分离、缓存、限流、高可用——这一卷把 Nginx 在生产里最常用的能力讲清并给可复制配置。',
    chapters: [
      { slug: 'ng2-c1', title: '负载均衡：把流量分给后端集群', topic: '负载均衡', hook: 'upstream 里配一组后端，round-robin / weight / ip_hash / least_conn 决定流量怎么分。', minutes: 120, hasContent: true },
      { slug: 'ng2-c2', title: '反向代理、动静分离与缓存', topic: '代理与缓存', hook: '静态资源交给 Nginx 直接发、动态请求转给后端，再加一层 proxy_cache，能极大减轻后端压力。', minutes: 120, hasContent: true },
      { slug: 'ng2-c3', title: '限流：limit_req 与 limit_conn', topic: '限流', hook: 'Nginx 用漏桶算法(limit_req)限请求速率、用 limit_conn 限并发连接，是最前置的一道流量防线。', minutes: 90, hasContent: true },
      { slug: 'ng2-c4', title: '高可用：Keepalived + 双机热备', topic: '高可用', hook: '单台 Nginx 也是单点；用 Keepalived 做 VIP 漂移，主挂了备机秒级顶上，对外 IP 不变。', minutes: 120, hasContent: true },
      { slug: 'ng2-c5', title: '进阶选型：Nginx vs LVS vs 网关', topic: '选型', hook: 'LVS 工作在四层更快、Nginx 在七层更灵活、API 网关功能更全——按层次和需求选。', minutes: 90, hasContent: true },
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
