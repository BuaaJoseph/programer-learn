import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 单线程 + IO 多路复用：一个线程用 epoll 同时盯多个连接，谁就绪处理谁。
const STEPS = [
  { desc: '多个客户端连接同时到达', hl: 'clients' },
  { desc: 'epoll 同时监听所有连接的「就绪」事件', hl: 'epoll' },
  { desc: '事件循环取出就绪事件，单线程逐个处理命令', hl: 'loop' },
  { desc: '命令在内存中执行（纯内存 + 高效结构 → 极快）', hl: 'exec' },
  { desc: '结果写回对应连接，继续下一个就绪事件', hl: 'reply' },
]

export default function SingleThreadLoop() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.hl === k

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="Redis 处理命令是单线程的：靠 IO 多路复用(epoll)一个线程同时盯住成千上万连接，谁就绪处理谁。没有锁、没有线程切换，配合纯内存操作所以极快。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="单线程与 IO 多路复用">
        {/* clients */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="14" y={20 + i * 46} width="74" height="34" rx="7" fill={on('clients') ? 'var(--rose)' : 'var(--bg-subtle)'} stroke={on('clients') ? 'var(--rose)' : 'var(--border-strong)'} />
            <text x="51" y={41 + i * 46} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={on('clients') ? '#ffffff' : 'var(--ink)'}>conn{i}</text>
          </g>
        ))}
        {/* epoll */}
        <rect x="130" y="44" width="90" height="80" rx="10" fill={on('epoll') ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
        <text x="175" y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={on('epoll') ? '#ffffff' : 'var(--accent-strong)'}>epoll</text>
        <text x="175" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={on('epoll') ? '#ffffff' : 'var(--ink-soft)'}>多路复用</text>
        {[0, 1, 2].map((i) => (
          <line key={i} x1="88" y1={37 + i * 46} x2="130" y2="84" stroke="var(--border-strong)" strokeWidth="1.2" />
        ))}

        {/* event loop + exec */}
        <rect x="256" y="44" width="100" height="80" rx="10" fill={on('loop') || on('exec') ? 'var(--rose)' : 'var(--rose-soft)'} stroke="var(--rose-line)" />
        <text x="306" y="78" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={on('loop') || on('exec') ? '#ffffff' : 'var(--rose)'}>事件循环</text>
        <text x="306" y="96" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={on('loop') || on('exec') ? '#ffffff' : 'var(--ink-soft)'}>单线程</text>
        <line x1="220" y1="84" x2="256" y2="84" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#st-a)" />

        {/* memory */}
        <rect x="384" y="44" width="64" height="80" rx="10" fill={on('exec') ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" />
        <text x="416" y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={on('exec') ? '#ffffff' : 'var(--green)'}>内存</text>
        <text x="416" y="96" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={on('exec') ? '#ffffff' : 'var(--ink-soft)'}>O(1)</text>
        <line x1="356" y1="84" x2="384" y2="84" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#st-a)" />

        <defs>
          <marker id="st-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
        </defs>

        <rect x="14" y="170" width="434" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="26" y="190" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}
