import { useState } from 'react'
import Figure from './Figure.jsx'

const OFFLINE = [
  { desc: '准备资料：文档、网页、知识库', hl: 'doc' },
  { desc: '切块 chunking：把长文档切成小段', hl: 'chunk' },
  { desc: '向量化 embedding：每段转成一个向量', hl: 'embed' },
  { desc: '存入向量库(可做近似最近邻检索)', hl: 'store' },
]
const ONLINE = [
  { desc: '用户提问 → 把问题也向量化', hl: 'q' },
  { desc: '检索：在向量库里找最相似的 top-k 段', hl: 'retrieve' },
  { desc: '增强：把检索到的资料拼进 prompt', hl: 'augment' },
  { desc: '生成：LLM 基于资料作答(可附出处)', hl: 'gen' },
]

export default function RagPipeline() {
  const [phase, setPhase] = useState('online')
  const [step, setStep] = useState(0)
  const steps = phase === 'offline' ? OFFLINE : ONLINE
  const s = steps[Math.min(step, steps.length - 1)]

  const sw = (p) => { setPhase(p); setStep(0) }

  const controls = (
    <>
      <button className={`fig-btn ${phase === 'offline' ? 'active' : ''}`} onClick={() => sw('offline')}>离线建库</button>
      <button className={`fig-btn ${phase === 'online' ? 'active' : ''}`} onClick={() => sw('online')}>在线查询</button>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, steps.length - 1))}>下一步 ▸</button>
      <span className="fig-note">{`第 ${Math.min(step, steps.length - 1) + 1}/${steps.length} 步`}</span>
    </>
  )

  const box = (x, y, w, label, key, color) => {
    const active = s.hl === key
    return (
      <g>
        <rect x={x} y={y} width={w} height="40" rx="8" fill={active ? color : 'var(--bg-subtle)'} stroke={active ? color : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
        <text x={x + w / 2} y={y + 24} textAnchor="middle" fontFamily="var(--sans)" fontSize="11.5" fontWeight="600" fill={active ? '#ffffff' : 'var(--ink)'}>{label}</text>
      </g>
    )
  }

  return (
    <Figure caption="RAG = 检索增强生成。离线先把资料切块、向量化、存入向量库；在线时把问题向量化去检索最相关的片段，拼进 prompt 再让 LLM 作答——让模型「带着资料答」，缓解幻觉、可溯源。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="RAG 流程">
        {phase === 'offline' ? (
          <>
            {box(20, 60, 90, '文档/知识', 'doc', 'var(--accent)')}
            {box(130, 60, 80, '切块', 'chunk', 'var(--accent)')}
            {box(230, 60, 90, '向量化', 'embed', 'var(--violet)')}
            {box(340, 60, 100, '向量库', 'store', 'var(--green)')}
            {[110, 210, 320].map((x, i) => (
              <line key={i} x1={x} y1="80" x2={x + 20} y2="80" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rg-a)" />
            ))}
          </>
        ) : (
          <>
            {box(20, 40, 90, '用户提问', 'q', 'var(--accent)')}
            {box(20, 110, 90, '向量库', 'retrieve', 'var(--green)')}
            {box(150, 75, 100, '检索 top-k', 'retrieve', 'var(--green)')}
            {box(280, 75, 80, '拼进 prompt', 'augment', 'var(--violet)')}
            {box(370, 75, 70, 'LLM', 'gen', 'var(--rose)')}
            <line x1="110" y1="60" x2="150" y2="90" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rg-a)" />
            <line x1="110" y1="130" x2="150" y2="100" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rg-a)" />
            <line x1="250" y1="95" x2="280" y2="95" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rg-a)" />
            <line x1="360" y1="95" x2="370" y2="95" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rg-a)" />
          </>
        )}
        <defs><marker id="rg-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="158" width="420" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="178" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}
