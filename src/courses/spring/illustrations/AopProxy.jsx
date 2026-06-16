import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const MODES = {
  jdk: { label: 'JDK 动态代理', cond: '目标类实现了接口', how: '运行时生成一个实现同样接口的代理类(Proxy)，内部持有目标对象，通过 InvocationHandler 转发并织入切面。', limit: '只能代理接口里的方法。' },
  cglib: { label: 'CGLIB 代理', cond: '目标类没有接口', how: '运行时生成目标类的子类，重写方法、在调用前后织入切面(基于继承)。', limit: 'final 类/方法无法被代理(不能被继承/重写)。' },
}

export default function AopProxy() {
  const [k, setK] = useState('jdk')
  const m = MODES[k]

  const controls = (
    <>
      <button className={`fig-btn ${k === 'jdk' ? 'active' : ''}`} onClick={() => setK('jdk')}>JDK 动态代理</button>
      <button className={`fig-btn ${k === 'cglib' ? 'active' : ''}`} onClick={() => setK('cglib')}>CGLIB</button>
      <span className="fig-note">{m.cond}</span>
    </>
  )

  return (
    <Figure caption="AOP(如 @Transactional、日志、权限)靠动态代理实现：调用方拿到的其实是代理对象，它在调用真实方法前后插入切面逻辑。Spring 默认：有接口用 JDK 动态代理、无接口用 CGLIB。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="AOP 动态代理">
        <rect x="20" y="64" width="80" height="44" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="60" y="90" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink)">调用方</text>

        {/* 代理对象 */}
        <rect x="150" y="50" width="150" height="72" rx="10" fill="var(--accent)" />
        <text x="225" y="70" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">代理对象</text>
        <text x="225" y="86" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">{k === 'jdk' ? 'Proxy(实现接口)' : '目标类的子类'}</text>
        <text x="225" y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">前置切面 → 调用 → 后置切面</text>

        {/* 目标对象 */}
        <rect x="350" y="64" width="90" height="44" rx="9" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="395" y="84" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">目标对象</text>
        <text x="395" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-soft)">真实业务</text>

        <line x1="100" y1="86" x2="150" y2="86" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#ap-a)" />
        <line x1="300" y1="86" x2="350" y2="86" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#ap-a)" />
        <defs><marker id="ap-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="138" width="420" height="48" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="142" width="404" height="42">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{m.label}：</strong>{m.how} <span style={{ color: 'var(--rose)' }}>{m.limit}</span></div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
