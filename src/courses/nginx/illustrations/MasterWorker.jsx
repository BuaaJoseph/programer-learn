import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: 'master 进程：读配置、管理 worker、平滑升级，不处理请求', hl: 'master' },
  { desc: '多个 worker 进程(通常=CPU 核数)抢着 accept 新连接', hl: 'accept' },
  { desc: '每个 worker 单线程用 epoll 同时处理成千上万连接(事件驱动、非阻塞)', hl: 'epoll' },
  { desc: 'reload 时 master 启新 worker、老 worker 处理完存量请求再退出 → 平滑无损', hl: 'reload' },
]

export default function MasterWorker() {
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
    <Figure caption="Nginx 高并发的根：1 个 master 管理多个 worker(通常等于 CPU 核数)；每个 worker 单线程、用 epoll 事件驱动非阻塞地处理海量连接——没有线程切换、没有阻塞等待。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="Nginx master-worker 架构">
        <rect x="170" y="20" width="120" height="40" rx="9" fill={on('master') || on('reload') ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" />
        <text x="230" y="44" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={on('master') || on('reload') ? '#ffffff' : 'var(--green)'}>master</text>

        {[60, 180, 300].map((x, i) => (
          <g key={i}>
            <line x1="230" y1="60" x2={x + 50} y2="92" stroke="var(--border-strong)" strokeWidth="1" />
            <rect x={x} y="92" width="100" height="40" rx="8" fill={on('epoll') || on('accept') ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
            <text x={x + 50} y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={on('epoll') || on('accept') ? '#ffffff' : 'var(--ink)'}>worker {i + 1}</text>
            <text x={x + 50} y="124" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={on('epoll') || on('accept') ? '#ffffff' : 'var(--ink-soft)'}>epoll · 单线程</text>
            {on('epoll') && Array.from({ length: 4 }).map((_, c) => <circle key={c} cx={x + 14 + c * 24} cy="146" r="4" fill="var(--accent)" />)}
          </g>
        ))}
        {on('epoll') && <text x="20" y="150" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">连接</text>}

        <rect x="20" y="160" width="420" height="0" fill="none" />
        <text x="20" y="178" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}
