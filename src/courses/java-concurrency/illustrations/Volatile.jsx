import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 演示可见性：无 volatile 时 T2 读到自己工作内存的旧值；有 volatile 强制读写主内存。
export default function Volatile() {
  const [vol, setVol] = useState(false)

  const controls = (
    <>
      <button className={`fig-btn ${!vol ? 'active' : ''}`} onClick={() => setVol(false)}>普通变量</button>
      <button className={`fig-btn ${vol ? 'active' : ''}`} onClick={() => setVol(true)}>volatile 变量</button>
      <span className="fig-note">{vol ? 'T2 立刻看到新值' : 'T2 可能一直读到旧值(死循环)'}</span>
    </>
  )

  const mainVal = 'true'
  const t1Val = 'true'
  const t2Val = vol ? 'true' : 'false(旧)'

  return (
    <Figure caption="每个线程有自己的「工作内存」(对应 CPU 缓存)。T1 改了 flag 写回主内存，但 T2 若用普通变量可能一直读自己缓存里的旧值 → 死循环。volatile 强制每次读写都走主内存，保证可见性。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="volatile 可见性">
        {/* 主内存 */}
        <rect x="160" y="76" width="140" height="48" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="230" y="96" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">主内存</text>
        <text x="230" y="113" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--ink)">flag = {mainVal}</text>

        {/* T1 */}
        <rect x="20" y="30" width="120" height="60" rx="10" fill="var(--violet)" fillOpacity="0.12" stroke="var(--violet)" />
        <text x="80" y="50" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--violet)">线程 T1(写)</text>
        <text x="80" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">工作内存</text>
        <text x="80" y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">flag={t1Val}</text>
        <line x1="140" y1="70" x2="160" y2="90" stroke="var(--violet)" strokeWidth="2" markerEnd="url(#vo-a)" />
        <text x="150" y="64" fontFamily="var(--mono)" fontSize="8" fill="var(--violet)">写回</text>

        {/* T2 */}
        <rect x="320" y="30" width="120" height="60" rx="10" fill="var(--violet)" fillOpacity="0.12" stroke={vol ? 'var(--green)' : 'var(--rose)'} strokeWidth="1.5" />
        <text x="380" y="50" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--violet)">线程 T2(读)</text>
        <text x="380" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">工作内存</text>
        <text x="380" y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={vol ? 'var(--green)' : 'var(--rose)'}>flag={t2Val}</text>
        <line x1="300" y1="90" x2="320" y2="70" stroke={vol ? 'var(--green)' : 'var(--border-strong)'} strokeWidth="2" strokeDasharray={vol ? '0' : '4 3'} markerEnd="url(#vo-b)" />
        <text x="306" y="64" fontFamily="var(--mono)" fontSize="8" fill={vol ? 'var(--green)' : 'var(--ink-faint)'}>读</text>

        <defs>
          <marker id="vo-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--violet)" /></marker>
          <marker id="vo-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill={vol ? 'var(--green)' : 'var(--ink-faint)'} /></marker>
        </defs>

        <rect x="20" y="140" width="420" height="48" rx="8" fill={vol ? 'var(--green-soft)' : 'var(--rose-soft)'} stroke={vol ? 'var(--green-line)' : 'var(--rose-line)'} />
        <foreignObject x="28" y="144" width="404" height="42">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>
            {vol
              ? 'volatile：写操作立刻刷主内存、读操作直接从主内存取，T2 立刻看到 true。还会插入内存屏障禁止指令重排。但它不保证原子性——i++ 仍需 synchronized/原子类。'
              : '普通变量：T2 一直命中自己工作内存的旧值 false，看不到 T1 的修改 → while(!flag) 永远循环不退出。'}
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
