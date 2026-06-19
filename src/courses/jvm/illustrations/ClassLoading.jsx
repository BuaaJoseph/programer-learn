import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { name: '加载 Loading', desc: '通过类的全限定名读取 .class 字节流，在方法区生成类的元信息，并在堆中生成 Class 对象。' },
  { name: '验证 Verification', desc: '校验字节码是否合法、安全(文件格式、元数据、字节码、符号引用)，防止恶意/损坏的 class 危害 JVM。' },
  { name: '准备 Preparation', desc: '给类的静态变量分配内存并赋「零值」(如 static int a 此时是 0，不是代码里的赋值)。' },
  { name: '解析 Resolution', desc: '把常量池里的符号引用替换为直接引用(指向真实内存地址)。' },
  { name: '初始化 Initialization', desc: '真正执行 static 变量赋值和 static 代码块(<clinit>)，此时类才算「就绪」。' },
]

export default function ClassLoading() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="类从 .class 文件变成可用的类，要经过五步：加载 → 验证 → 准备 → 解析 → 初始化。其中「验证、准备、解析」合称连接(Linking)。常考点：准备阶段只赋零值，初始化才执行真正赋值。" controls={controls}>
      <svg viewBox="0 0 460 170" width="460" role="img" aria-label="类加载过程">
        {STEPS.map((st, i) => {
          const active = i === step
          const done = i < step
          return (
            <g key={i}>
              <rect x={14 + i * 88} y="40" width="78" height="44" rx="8"
                fill={active ? 'var(--accent)' : done ? 'var(--accent-soft)' : 'var(--bg-subtle)'}
                stroke={active ? 'var(--accent-strong)' : done ? 'var(--accent-line)' : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
              <text x={53 + i * 88} y="60" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{st.name.split(' ')[0]}</text>
              <text x={53 + i * 88} y="75" textAnchor="middle" fontFamily="var(--mono)" fontSize="7" fill={active ? '#ffffff' : 'var(--ink-faint)'}>{st.name.split(' ')[1]}</text>
              {i < 4 && <text x={96 + i * 88} y="66" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink-faint)">▸</text>}
            </g>
          )
        })}
        <rect x="14" y="104" width="432" height="52" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="22" y="108" width="416" height="46">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}><strong style={{ color: 'var(--accent-strong)' }}>{s.name}：</strong>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
