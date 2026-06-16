import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const CASES = {
  string: { cls: 'java.lang.String', loadBy: 'Bootstrap', up: true, desc: '加载请求层层上交到顶层 Bootstrap，它能加载核心类 → 由它加载。这保证了你写的 java.lang.String 永远用不了，核心类不被篡改。' },
  mybean: { cls: 'com.app.UserService', loadBy: 'Application', up: true, desc: '层层上交到 Bootstrap/Ext 都加载不了(不在它们路径)，最终回到 Application 类加载器加载你的业务类。' },
}

export default function ParentDelegation() {
  const [k, setK] = useState('string')
  const c = CASES[k]

  const controls = (
    <>
      <button className={`fig-btn ${k === 'string' ? 'active' : ''}`} onClick={() => setK('string')}>加载 String</button>
      <button className={`fig-btn ${k === 'mybean' ? 'active' : ''}`} onClick={() => setK('mybean')}>加载业务类</button>
      <span className="fig-note">先上交父加载器，父加载不了才自己加载</span>
    </>
  )

  const loaders = [
    { id: 'Application', name: 'Application 应用类加载器', sub: 'classpath / 业务类', y: 130 },
    { id: 'Ext', name: 'Extension 扩展类加载器', sub: 'lib/ext', y: 86 },
    { id: 'Bootstrap', name: 'Bootstrap 启动类加载器', sub: 'JRE 核心类 rt.jar', y: 42 },
  ]

  return (
    <Figure caption="双亲委派：类加载请求先一路向上委派给父加载器，父加载器能加载就加载、不能才往下回退。好处是核心类(如 String)总由顶层加载，既防篡改、又避免重复加载。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="双亲委派模型">
        {loaders.map((l) => {
          const isLoader = l.id === c.loadBy
          return (
            <g key={l.id}>
              <rect x="120" y={l.y} width="220" height="34" rx="8" fill={isLoader ? 'var(--green)' : 'var(--accent-soft)'} stroke={isLoader ? 'var(--green)' : 'var(--accent-line)'} strokeWidth={isLoader ? 2 : 1} />
              <text x="230" y={l.y + 15} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={isLoader ? '#ffffff' : 'var(--ink)'}>{l.name}</text>
              <text x="230" y={l.y + 28} textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={isLoader ? '#ffffff' : 'var(--ink-faint)'}>{l.sub}{isLoader ? '  ← 由它加载 ✓' : ''}</text>
            </g>
          )
        })}
        {/* 向上委派箭头 */}
        <line x1="110" y1="140" x2="110" y2="60" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#pd-a)" />
        <text x="86" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)" transform="rotate(-90 86 100)">向上委派</text>
        <line x1="350" y1="60" x2="350" y2="140" stroke="var(--ink-faint)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#pd-b)" />
        <text x="374" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)" transform="rotate(90 374 100)">加载不了才回退</text>
        <defs>
          <marker id="pd-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--accent)" /></marker>
          <marker id="pd-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
        </defs>

        <foreignObject x="14" y="166" width="432" height="24">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.25 }}><strong>加载 {c.cls}：</strong>{c.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
