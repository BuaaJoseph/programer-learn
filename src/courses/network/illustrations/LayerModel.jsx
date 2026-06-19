import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const LAYERS = [
  { name: '应用层', en: 'Application', proto: 'HTTP/DNS/FTP', job: '为应用提供网络服务，处理具体业务报文', dev: '应用程序' },
  { name: '传输层', en: 'Transport', proto: 'TCP / UDP', job: '提供端到端通信，TCP 可靠、UDP 高效；用端口区分进程', dev: '—' },
  { name: '网络层', en: 'Network', proto: 'IP / ICMP', job: '寻址与路由，把数据包从源主机送到目的主机', dev: '路由器' },
  { name: '链路层', en: 'Link', proto: 'Ethernet / ARP', job: '在相邻节点间传输帧，用 MAC 地址寻址', dev: '交换机/网卡' },
]

export default function LayerModel() {
  const [i, setI] = useState(1)
  const l = LAYERS[i]

  const controls = (
    <>
      {LAYERS.map((x, idx) => (
        <button key={x.name} className={`fig-btn ${i === idx ? 'active' : ''}`} onClick={() => setI(idx)}>{x.name}</button>
      ))}
    </>
  )

  return (
    <Figure caption="网络分层让每层各司其职、互不干扰。这里用常用的 TCP/IP 四层模型(OSI 是七层，多拆了会话层、表示层)。点每一层看它干什么、对应什么协议与设备。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="网络分层模型">
        {LAYERS.map((x, idx) => {
          const sel = i === idx
          return (
            <g key={x.name}>
              <rect x={20 + idx * 6} y={20 + idx * 30} width="280" height="26" rx="6" fill={sel ? 'var(--accent)' : 'var(--accent-soft)'} stroke={sel ? 'var(--accent-strong)' : 'var(--accent-line)'} strokeWidth={sel ? 2 : 1} />
              <text x={32 + idx * 6} y={37 + idx * 30} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={sel ? '#ffffff' : 'var(--ink)'}>{x.name}</text>
              <text x={170 + idx * 6} y={37 + idx * 30} fontFamily="var(--mono)" fontSize="9" fill={sel ? '#ffffff' : 'var(--ink-soft)'}>{x.proto}</text>
            </g>
          )
        })}
        {/* 封装箭头 */}
        <text x="318" y="40" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">发</text>
        <line x1="325" y1="30" x2="325" y2="120" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#lm-a)" />
        <text x="312" y="80" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)" transform="rotate(90 312 80)">逐层封装(加头部)</text>
        <defs><marker id="lm-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="420" height="42" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="153" width="404" height="38">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{l.name}({l.en})：</strong>{l.job}。代表设备：{l.dev}。</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
