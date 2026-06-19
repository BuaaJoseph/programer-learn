import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 同一个对象用不同序列化方案的相对体积/速度(示意值，用于直观对比)。
const WAYS = [
  { name: 'Java 原生', size: 100, speed: 1, cross: false, note: '体积最大、慢、且只能 Java 用；带类元数据、有安全漏洞史。' },
  { name: 'Hessian2', size: 50, speed: 3, cross: true, note: 'Dubbo 默认：二进制、跨语言、体积和速度都不错。' },
  { name: 'Protobuf', size: 30, speed: 5, cross: true, note: '需写 IDL、要预定义 schema；体积最小、最快、强跨语言。' },
  { name: 'Kryo', size: 35, speed: 5, cross: false, note: '极快极小，但主要面向 Java，跨语言弱。' },
]

export default function SerializationCompare() {
  const [i, setI] = useState(1)
  const w = WAYS[i]

  const controls = (
    <>
      {WAYS.map((x, idx) => (
        <button key={x.name} className={`fig-btn ${i === idx ? 'active' : ''}`} onClick={() => setI(idx)}>{x.name}</button>
      ))}
    </>
  )

  return (
    <Figure caption="RPC 普遍不用 Java 原生序列化：它体积大、慢、不能跨语言、还有安全隐患。对比几种常用方案的相对体积与速度(示意)。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="序列化方案对比">
        {WAYS.map((x, idx) => {
          const sel = i === idx
          const y = 24 + idx * 32
          return (
            <g key={x.name}>
              <text x="20" y={y + 15} fontFamily="var(--mono)" fontSize="11" fontWeight={sel ? '700' : '400'} fill={sel ? 'var(--accent-strong)' : 'var(--ink)'}>{x.name}</text>
              <rect x="110" y={y + 3} width="220" height="14" rx="7" fill="var(--bg-sunken)" />
              <rect x="110" y={y + 3} width={2.2 * x.size} height="14" rx="7" fill={sel ? 'var(--accent)' : 'var(--accent-line)'} />
              <text x={336} y={y + 15} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">体积 {x.size}</text>
            </g>
          )
        })}
        <text x="110" y="20" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">相对体积(越短越好)</text>

        <rect x="20" y="158" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="160" width="404" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>
            <strong style={{ color: 'var(--accent-strong)' }}>{w.name}：</strong>{w.note}（速度 {'★'.repeat(w.speed)}，{w.cross ? '跨语言' : '偏 Java'}）
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
