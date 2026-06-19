import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '文档写入：先进内存 buffer，同时追加到 translog(防丢)', hl: ['buffer', 'translog'] },
  { desc: 'refresh(默认每 1s)：buffer 里的数据生成一个新 segment 进入文件系统缓存', hl: ['segment'] },
  { desc: '此刻文档就「可被搜索」了——这就是 ES 的近实时(NRT)，不是写完立刻可搜', hl: ['segment', 'search'] },
  { desc: 'flush(默认 30min 或 translog 满)：segment 真正刷盘(fsync)，清空 translog', hl: ['disk'] },
  { desc: 'segment 越来越多 → 后台 merge 合并小 segment、删除已标记删除的文档', hl: ['merge'] },
]

export default function EsWriteFlow() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.hl.includes(k)

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const box = (k, x, y, w, label, sub, color) => (
    <g>
      <rect x={x} y={y} width={w} height="44" rx="9" fill={on(k) ? color : 'var(--bg-subtle)'} stroke={on(k) ? color : 'var(--border-strong)'} strokeWidth={on(k) ? 2 : 1} />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={on(k) ? '#ffffff' : 'var(--ink)'}>{label}</text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={on(k) ? '#ffffff' : 'var(--ink-faint)'}>{sub}</text>
    </g>
  )

  return (
    <Figure caption="ES 写入是「近实时」的：数据先进内存 buffer + translog(保证不丢)，每秒 refresh 生成可搜索的 segment(所以写完约 1s 才搜得到)，flush 才真正落盘，后台再不断 merge 合并 segment。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ES 写入流程">
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">内存</text>
        {box('buffer', 20, 32, 110, 'index buffer', '内存暂存', 'var(--accent)')}
        {box('translog', 150, 32, 110, 'translog', '顺序写·防丢', 'var(--violet)')}
        {box('segment', 290, 32, 150, 'segment(FS cache)', 'refresh 生成·可搜索', 'var(--green)')}

        <text x="20" y="106" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">磁盘</text>
        {box('disk', 150, 110, 150, '磁盘 segment', 'flush·fsync 落盘', 'var(--accent-strong)')}
        {box('merge', 320, 110, 120, 'merge', '合并小段', 'var(--amber)')}

        <line x1="365" y1="76" x2="225" y2="110" stroke={on('disk') ? 'var(--accent-strong)' : 'var(--border-strong)'} strokeWidth={on('disk') ? 2 : 1} markerEnd="url(#ew-a)" />
        {on('search') && <text x="365" y="92" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">🔍 可搜索</text>}
        <defs><marker id="ew-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="160" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="162" width="404" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
