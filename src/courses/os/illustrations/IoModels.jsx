import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const MODELS = {
  bio: { label: '阻塞 IO (BIO)', desc: '发起读后线程一直阻塞，直到数据就绪并拷贝完成。每个连接一个线程，高并发下线程爆炸。', block: '全程阻塞' },
  nio: { label: '非阻塞 IO (NIO)', desc: '读不到就立即返回，靠线程不断轮询(忙等)。不阻塞但空轮询浪费 CPU。', block: '轮询' },
  mux: { label: 'IO 多路复用', desc: 'select/poll/epoll：一个线程用 epoll 同时监听大量 fd，谁就绪处理谁。Redis/Nginx/Netty 的基石。', block: '只在 epoll_wait 阻塞' },
  aio: { label: '异步 IO (AIO)', desc: '发起后立即返回，数据就绪并拷贝完成后由内核回调通知。真正的异步，但 Linux 支持不完善。', block: '不阻塞' },
}

export default function IoModels() {
  const [k, setK] = useState('mux')
  const m = MODELS[k]

  const controls = (
    <>
      {Object.entries(MODELS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label.split(' ')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="IO 分两阶段：等数据就绪、把数据从内核拷到用户空间。五种 IO 模型就是在这两阶段「阻不阻塞、要不要轮询、谁来通知」上做文章。重点理解 IO 多路复用——高并发服务的基石。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="IO 模型">
        {k === 'mux' ? (
          <>
            <rect x="20" y="30" width="90" height="50" rx="9" fill="var(--accent)" />
            <text x="65" y="52" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="#ffffff">1 个线程</text>
            <text x="65" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">epoll</text>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <rect x="200" y={20 + i * 26} width="100" height="20" rx="4" fill={i === 1 ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={i === 1 ? 'var(--green)' : 'var(--border-strong)'} />
                <text x="210" y={34 + i * 26} fontFamily="var(--mono)" fontSize="9" fill="var(--ink)">fd{i} {i === 1 ? '就绪✓' : '等待'}</text>
                <line x1="110" y1="55" x2="200" y2={30 + i * 26} stroke="var(--border-strong)" strokeWidth="1" />
              </g>
            ))}
            <text x="320" y="60" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">谁就绪处理谁</text>
          </>
        ) : (
          <>
            <rect x="40" y="30" width="120" height="44" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x="100" y="56" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">应用线程</text>
            <rect x="300" y="30" width="120" height="44" rx="9" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="360" y="56" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--green)">内核</text>
            <line x1="160" y1="52" x2="300" y2="52" stroke={k === 'bio' ? 'var(--rose)' : 'var(--accent)'} strokeWidth="2" strokeDasharray={k === 'nio' ? '4 3' : '0'} markerEnd="url(#io-a)" />
            <text x="230" y="44" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">{m.block}</text>
            <defs><marker id="io-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
          </>
        )}
        <rect x="20" y="120" width="420" height="50" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="124" width="404" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}><strong style={{ color: 'var(--accent-strong)' }}>{m.label}：</strong>{m.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
