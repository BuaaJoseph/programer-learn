// 计算机网络：3 卷 9 章。slug 规则 net{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'net1',
    index: 1,
    title: '分层模型与全景',
    subtitle: 'Layers',
    theme: '网络是分层设计的。先建立分层的全景图，再看一个请求是怎么穿过这些层走到对端的。',
    chapters: [
      { slug: 'net1-c1', title: '网络分层：OSI 七层与 TCP/IP 四层', topic: '分层模型', hook: '分层的意义是各司其职、互不干扰；记住每层干什么、对应什么协议与设备，是理解网络的地图。', minutes: 120, hasContent: true },
      { slug: 'net1-c2', title: '从输入 URL 到看到页面', topic: '请求全景', hook: 'DNS 解析→建立 TCP 连接→(TLS)→发 HTTP 请求→服务器响应→浏览器渲染——一道经典面试题串起整张网络。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'net2',
    index: 2,
    title: '传输层：TCP',
    subtitle: 'Transport',
    theme: 'TCP 是面试重灾区。握手挥手、可靠传输、拥塞控制，这一卷逐个用动图讲透。',
    chapters: [
      { slug: 'net2-c1', title: '三次握手与四次挥手', topic: '握手/挥手', hook: '为什么握手是三次、挥手是四次？为什么要有 TIME_WAIT？这些都能从「可靠建立/释放连接」推出来。', minutes: 150, hasContent: true },
      { slug: 'net2-c2', title: '可靠传输：序号、确认与滑动窗口', topic: '可靠传输', hook: 'TCP 凭序号+确认+重传保证不丢不乱，再用滑动窗口做到「边发边确认」的高效流水线。', minutes: 120, hasContent: true },
      { slug: 'net2-c3', title: '流量控制与拥塞控制', topic: '流控/拥塞', hook: '流量控制是别压垮接收方(滑动窗口)，拥塞控制是别压垮网络(慢启动、拥塞避免、快重传快恢复)。', minutes: 120, hasContent: true },
      { slug: 'net2-c4', title: 'TCP vs UDP：怎么选', topic: 'TCP/UDP', hook: 'TCP 可靠有序但重、UDP 简单快但不保证——视频/游戏/DNS 用 UDP，文件/网页用 TCP。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'net3',
    index: 3,
    title: '应用层与安全',
    subtitle: 'HTTP & HTTPS',
    theme: '最贴近开发的一层。HTTP 怎么收发、版本怎么演进、HTTPS 凭什么安全，这一卷讲清。',
    chapters: [
      { slug: 'net3-c1', title: 'HTTP：报文、方法、状态码与版本演进', topic: 'HTTP', hook: 'GET/POST、常见状态码、keep-alive，以及 HTTP/1.1 队头阻塞→HTTP/2 多路复用→HTTP/3 基于 QUIC 的演进。', minutes: 120, hasContent: true },
      { slug: 'net3-c2', title: 'HTTPS 与 TLS 握手', topic: 'HTTPS/TLS', hook: 'HTTPS = HTTP + TLS：用非对称加密安全地协商出一个对称密钥，之后用对称加密高效通信。', minutes: 120, hasContent: true },
      { slug: 'net3-c3', title: 'DNS、Cookie/Session 与跨域', topic: 'DNS/会话', hook: 'DNS 把域名翻译成 IP；Cookie/Session/Token 解决 HTTP 无状态；同源策略与 CORS 处理跨域。', minutes: 120, hasContent: true },
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
