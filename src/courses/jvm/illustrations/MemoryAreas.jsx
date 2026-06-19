import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const AREAS = {
  heap: { name: '堆 Heap', shared: true, desc: '存放几乎所有对象实例，是 GC 的主战场。空间不足抛 OutOfMemoryError: Java heap space。', err: 'OOM' },
  method: { name: '方法区 / 元空间', shared: true, desc: '存类元信息、常量、静态变量。JDK8 后用本地内存的 Metaspace，加载类过多会 OOM: Metaspace。', err: 'OOM' },
  vmstack: { name: '虚拟机栈', shared: false, desc: '每个线程私有，方法调用即压入栈帧(局部变量表/操作数栈)。递归过深抛 StackOverflowError。', err: 'SOF' },
  natstack: { name: '本地方法栈', shared: false, desc: '为 native 方法服务，作用与虚拟机栈类似，线程私有。', err: 'SOF' },
  pc: { name: '程序计数器', shared: false, desc: '记录当前线程执行到的字节码行号，线程私有，是唯一不会 OOM 的区域。', err: '无' },
}

export default function MemoryAreas() {
  const [k, setK] = useState('heap')
  const a = AREAS[k]

  const controls = (
    <>
      {Object.entries(AREAS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.name.split(' ')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="JVM 运行时数据区分两类：线程共享的「堆 + 方法区」和线程私有的「虚拟机栈 + 本地方法栈 + 程序计数器」。点上方高亮，看每块存什么、会抛什么错。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="JVM 运行时数据区">
        <text x="30" y="28" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">线程共享</text>
        {['heap', 'method'].map((key, i) => {
          const sel = k === key
          return (
            <g key={key}>
              <rect x={30 + i * 150} y="34" width="140" height="40" rx="8" fill={sel ? 'var(--accent)' : 'var(--green-soft)'} stroke={sel ? 'var(--accent-strong)' : 'var(--green-line)'} strokeWidth={sel ? 2 : 1} />
              <text x={100 + i * 150} y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={sel ? '#ffffff' : 'var(--ink)'}>{AREAS[key].name}</text>
            </g>
          )
        })}
        <text x="30" y="98" fontFamily="var(--mono)" fontSize="10" fill="var(--violet)">线程私有（每个线程一份）</text>
        {['vmstack', 'natstack', 'pc'].map((key, i) => {
          const sel = k === key
          return (
            <g key={key}>
              <rect x={30 + i * 137} y="104" width="127" height="40" rx="8" fill={sel ? 'var(--accent)' : '#f0eafb'} stroke={sel ? 'var(--accent-strong)' : '#ddd0f2'} strokeWidth={sel ? 2 : 1} />
              <text x={93 + i * 137} y="122" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={sel ? '#ffffff' : 'var(--ink)'}>{AREAS[key].name}</text>
              <text x={93 + i * 137} y="136" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={sel ? '#ffffff' : 'var(--ink-faint)'}>{AREAS[key].err === 'SOF' ? 'StackOverflow' : AREAS[key].err === '无' ? '不会 OOM' : ''}</text>
            </g>
          )
        })}
        <rect x="30" y="156" width="400" height="36" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="38" y="158" width="384" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{a.name}：</strong>{a.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
