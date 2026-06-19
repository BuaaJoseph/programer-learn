import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const KINDS = {
  simple: { label: '简单工厂', desc: '一个工厂类用 if/switch 按参数 new 出不同产品。调用方不再自己 new；但新增产品要改工厂(违反开闭原则)。', not: '不属于 GoF 23 种' },
  method: { label: '工厂方法', desc: '定义创建产品的接口，每种产品对应一个具体工厂子类。新增产品只需加一个工厂子类(符合开闭)。', not: '一个工厂造一类产品' },
  abstract: { label: '抽象工厂', desc: '一个工厂创建「一族」相关产品(如同一风格的按钮+文本框)。适合产品成套出现的场景。', not: '一个工厂造一族产品' },
}

export default function Factory() {
  const [k, setK] = useState('method')
  const f = KINDS[k]

  const controls = (
    <>
      {Object.entries(KINDS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="工厂模式把对象创建集中起来、面向接口编程，让调用方与具体实现解耦。三兄弟解决不同程度的解耦：简单工厂(一个工厂全包)、工厂方法(一厂一品)、抽象工厂(一厂一族)。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="工厂模式">
        <rect x="40" y="40" width="90" height="40" rx="9" fill="var(--accent)" />
        <text x="85" y="64" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fontWeight="700" fill="#ffffff">调用方</text>
        <rect x="180" y="36" width="100" height="48" rx="9" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="230" y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--violet)">工厂</text>
        <text x="230" y="72" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-soft)">{f.not}</text>
        <line x1="130" y1="60" x2="180" y2="60" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#fa-a)" />

        {['产品A', '产品B', '产品C'].map((p, i) => (
          <g key={p}>
            <rect x="330" y={20 + i * 44} width="100" height="34" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="380" y={41 + i * 44} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">{p}</text>
            <line x1="280" y1="60" x2="330" y2={37 + i * 44} stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#fa-a)" />
          </g>
        ))}
        <defs><marker id="fa-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="146" width="420" height="0" fill="none" />
        <foreignObject x="20" y="120" width="300" height="56">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{f.label}：</strong>{f.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
