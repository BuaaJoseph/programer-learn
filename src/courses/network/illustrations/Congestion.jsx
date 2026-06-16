import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 拥塞窗口 cwnd 随时间变化：慢启动指数增长 → 到阈值后拥塞避免线性增长 → 丢包后处理。
const PHASES = {
  slowstart: { label: '慢启动', desc: 'cwnd 从 1 开始，每个 RTT 翻倍(指数增长)，快速探测可用带宽，直到达到慢启动阈值 ssthresh。' },
  avoid: { label: '拥塞避免', desc: '超过 ssthresh 后改为每个 RTT 只 +1(线性增长)，谨慎地继续加速，避免一下子压垮网络。' },
  loss: { label: '超时丢包', desc: '发生超时：判定网络严重拥塞，ssthresh 减半、cwnd 直接回到 1，重新慢启动(老式 Reno)。' },
  fast: { label: '快重传/快恢复', desc: '收到 3 个重复 ACK：判定轻度丢包，ssthresh 减半、cwnd 减半后进入拥塞避免，不必从 1 重来。' },
}

export default function Congestion() {
  const [k, setK] = useState('slowstart')
  const p = PHASES[k]

  const controls = (
    <>
      {Object.entries(PHASES).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  // 折线点(示意 cwnd 曲线)
  const path = 'M 30 150 L 50 140 L 70 120 L 90 84 L 110 70 L 130 64 L 150 58 L 170 52'
  const linear = 'M 170 52 L 210 46 L 250 40 L 290 34'

  return (
    <Figure caption="拥塞控制是「别压垮整个网络」(区别于流量控制的别压垮接收方)。核心：慢启动指数涨、到阈值转拥塞避免线性涨、丢包就降速。点上方看各阶段。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="TCP 拥塞控制">
        <line x1="30" y1="150" x2="430" y2="150" stroke="var(--border-strong)" />
        <line x1="30" y1="20" x2="30" y2="150" stroke="var(--border-strong)" />
        <text x="14" y="24" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">cwnd</text>
        <text x="410" y="164" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">时间</text>
        <line x1="30" y1="56" x2="430" y2="56" stroke="var(--amber-line)" strokeDasharray="4 3" />
        <text x="360" y="52" fontFamily="var(--mono)" fontSize="9" fill="var(--amber)">ssthresh 阈值</text>

        <path d={path} fill="none" stroke={k === 'slowstart' ? 'var(--accent)' : 'var(--accent-line)'} strokeWidth={k === 'slowstart' ? 3 : 2} />
        <path d={linear} fill="none" stroke={k === 'avoid' ? 'var(--green)' : 'var(--green-line)'} strokeWidth={k === 'avoid' ? 3 : 2} />
        {(k === 'loss') && <><line x1="290" y1="34" x2="300" y2="150" stroke="var(--rose)" strokeWidth="2" strokeDasharray="3 2" /><text x="304" y="100" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">超时→cwnd=1</text></>}
        {(k === 'fast') && <><line x1="290" y1="34" x2="300" y2="92" stroke="var(--violet)" strokeWidth="2" strokeDasharray="3 2" /><text x="304" y="86" fontFamily="var(--mono)" fontSize="9" fill="var(--violet)">3 重复ACK→减半</text></>}
        <text x="80" y="170" fontFamily="var(--mono)" fontSize="8" fill="var(--accent-strong)">指数</text>
        <text x="230" y="170" fontFamily="var(--mono)" fontSize="8" fill="var(--green)">线性</text>

        <rect x="20" y="176" width="420" height="0" fill="none" />
        <foreignObject x="20" y="176" width="420" height="24">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.2 }}><strong style={{ color: 'var(--accent-strong)' }}>{p.label}：</strong>{p.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
