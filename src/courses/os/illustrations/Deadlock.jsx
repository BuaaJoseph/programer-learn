import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const CONDS = {
  mutex: { label: '互斥', desc: '资源同一时刻只能被一个进程占用。', fix: '让资源可共享(很多资源天生不行，如打印机)。' },
  hold: { label: '占有并等待', desc: '已占有资源的进程又去申请新资源，且不释放已占有的。', fix: '一次性申请全部资源；申请新的前先释放已有的。' },
  noPreempt: { label: '不可剥夺', desc: '进程已占有的资源不能被强行抢走，只能自己释放。', fix: '允许抢占：申请不到就释放已占有的资源。' },
  circular: { label: '循环等待', desc: '存在一个进程-资源的环形等待链(A 等 B、B 等 A)。', fix: '给资源编号，规定按固定顺序申请(破坏环)。' },
}

export default function Deadlock() {
  const [k, setK] = useState('circular')
  const c = CONDS[k]

  const controls = (
    <>
      {Object.entries(CONDS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
      <span className="fig-note">破坏任意一个条件即可预防死锁</span>
    </>
  )

  return (
    <Figure caption="死锁需同时满足四个必要条件：互斥、占有并等待、不可剥夺、循环等待。预防死锁 = 破坏其中任意一个。下面的环形等待图最直观：P1 拿着 R1 等 R2，P2 拿着 R2 等 R1。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="死锁四条件">
        {/* 环形等待图 */}
        <rect x="40" y="50" width="70" height="40" rx="8" fill="var(--accent)" />
        <text x="75" y="74" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">P1</text>
        <rect x="200" y="50" width="70" height="40" rx="8" fill="var(--green)" />
        <text x="235" y="74" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">P2</text>
        <circle cx="75" cy="130" r="18" fill="var(--accent-soft)" stroke="var(--accent-line)" /><text x="75" y="134" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">R1</text>
        <circle cx="235" cy="130" r="18" fill="var(--green-soft)" stroke="var(--green-line)" /><text x="235" y="134" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">R2</text>
        <line x1="75" y1="112" x2="75" y2="90" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#dl-a)" /><text x="80" y="106" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">持有</text>
        <line x1="110" y1="70" x2="218" y2="116" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#dl-a)" /><text x="150" y="86" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">P1 等 R2</text>
        <line x1="235" y1="112" x2="235" y2="90" stroke="var(--green)" strokeWidth="2" markerEnd="url(#dl-a)" /><text x="240" y="106" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">持有</text>
        <line x1="200" y1="78" x2="92" y2="118" stroke="var(--green)" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#dl-a)" /><text x="120" y="112" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">P2 等 R1</text>
        <defs><marker id="dl-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        {/* 文案 */}
        <rect x="290" y="44" width="150" height="100" rx="10" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="302" y="64" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--rose)">{c.label}</text>
        <foreignObject x="300" y="70" width="132" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{c.desc}</div>
        </foreignObject>
        <foreignObject x="300" y="112" width="132" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '9.5px var(--sans)', color: 'var(--green)', lineHeight: 1.25 }}>破坏：{c.fix}</div>
        </foreignObject>

        <text x="20" y="178" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">处理策略：预防(破坏条件) · 避免(银行家算法) · 检测+恢复 · 鸵鸟策略(忽略)</text>
      </svg>
    </Figure>
  )
}
