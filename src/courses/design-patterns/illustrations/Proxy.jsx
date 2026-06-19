import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const KINDS = {
  static: { label: '静态代理', desc: '手写一个代理类，实现与目标相同的接口，方法里调用目标并加增强。简单直观，但每个接口都要写一个代理类，难维护。' },
  jdk: { label: 'JDK 动态代理', desc: '运行时用 Proxy + InvocationHandler 生成代理对象，要求目标必须实现接口。Spring AOP 默认对接口用它。' },
  cglib: { label: 'CGLIB', desc: '运行时生成目标类的子类来代理，不要求接口(基于继承)。无接口的类用它；final 类/方法不能被代理。' },
}

export default function Proxy() {
  const [k, setK] = useState('jdk')
  const p = KINDS[k]

  const controls = (
    <>
      {Object.entries(KINDS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="代理模式：不改原类的前提下增强它(加日志、事务、权限、缓存、远程调用)。Spring AOP、RPC、MyBatis Mapper 全靠它。三种实现：静态手写、JDK 动态(基于接口)、CGLIB(基于继承)。" controls={controls}>
      <svg viewBox="0 0 460 170" width="460" role="img" aria-label="代理模式">
        <rect x="20" y="50" width="80" height="40" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="60" y="74" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">调用方</text>
        <rect x="150" y="40" width="150" height="60" rx="10" fill="var(--accent)" />
        <text x="225" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">代理对象</text>
        <text x="225" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">{k === 'jdk' ? 'Proxy(实现接口)' : k === 'cglib' ? '目标子类' : '手写代理类'}</text>
        <text x="225" y="92" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">前置增强 → 调用 → 后置增强</text>
        <rect x="350" y="50" width="90" height="40" rx="9" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="395" y="74" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">目标对象</text>
        <line x1="100" y1="70" x2="150" y2="70" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#px-a)" />
        <line x1="300" y1="70" x2="350" y2="70" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#px-a)" />
        <defs><marker id="px-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="116" width="420" height="48" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="120" width="404" height="42">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{p.label}：</strong>{p.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
