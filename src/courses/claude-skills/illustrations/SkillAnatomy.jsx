import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 点击 SKILL.md 各部位，看每部分的作用。
const PARTS = {
  name: { label: 'name', desc: 'Skill 名称(小写连字符)。省略则用目录名；目录名就是斜杠命令名。', color: 'var(--accent)' },
  desc: { label: 'description', desc: '最重要的字段：说明用途 + 触发条件 + 关键词。Claude 靠它决定是否自动触发。与 when_to_use 合计 ≤ 1536 字符。', color: 'var(--rose)' },
  body: { label: '正文 Markdown', desc: '触发后加载的具体指令、规则、步骤。建议 < 500 行；一旦加载会保留整轮会话。', color: 'var(--violet)' },
  ref: { label: 'reference / scripts', desc: '可选的捆绑资源，正文引用到时才按需加载。放长文档、API 细节、可执行脚本。', color: 'var(--green)' },
}

export default function SkillAnatomy() {
  const [sel, setSel] = useState('desc')
  const p = PARTS[sel]

  const controls = (
    <>
      {Object.entries(PARTS).map(([k, v]) => (
        <button key={k} className={`fig-btn ${sel === k ? 'active' : ''}`} onClick={() => setSel(k)}>{v.label}</button>
      ))}
    </>
  )

  const hl = (k) => (sel === k ? PARTS[k].color : 'var(--border-strong)')
  const hlw = (k) => (sel === k ? 2.5 : 1)

  return (
    <Figure caption="一个 SKILL.md = YAML frontmatter(name + description 等) + Markdown 正文 + 可选的 reference/scripts/assets 目录。点上方按钮高亮各部分，看它的作用。" controls={controls}>
      <svg viewBox="0 0 460 220" width="460" role="img" aria-label="SKILL.md 结构">
        {/* frontmatter 区 */}
        <rect x="20" y="16" width="280" height="96" rx="8" fill="var(--bg-code)" stroke="#2c3252" />
        <text x="32" y="34" fontFamily="var(--mono)" fontSize="11" fill="#6b7394">---</text>
        <rect x="30" y="40" width="120" height="18" rx="4" fill="none" stroke={hl('name')} strokeWidth={hlw('name')} />
        <text x="36" y="53" fontFamily="var(--mono)" fontSize="11" fill="#c4a7ff">name: <tspan fill="#7ee0a8">pdf</tspan></text>
        <rect x="30" y="62" width="262" height="40" rx="4" fill="none" stroke={hl('desc')} strokeWidth={hlw('desc')} />
        <text x="36" y="75" fontFamily="var(--mono)" fontSize="10" fill="#c4a7ff">description: <tspan fill="#7ee0a8">Process PDFs.</tspan></text>
        <text x="36" y="89" fontFamily="var(--mono)" fontSize="10" fill="#7ee0a8">Use when read/extract/merge…</text>
        <text x="32" y="108" fontFamily="var(--mono)" fontSize="11" fill="#6b7394">---</text>

        {/* body 区 */}
        <rect x="20" y="120" width="280" height="56" rx="8" fill="none" stroke={hl('body')} strokeWidth={hlw('body')} />
        <text x="32" y="138" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)"># PDF Skill</text>
        <text x="32" y="154" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-soft)">指令、规则、步骤、示例…</text>
        <text x="32" y="170" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">见 reference/api.md</text>

        {/* reference 区 */}
        <rect x="312" y="120" width="128" height="56" rx="8" fill="none" stroke={hl('ref')} strokeWidth={hlw('ref')} strokeDasharray="4 3" />
        <text x="322" y="138" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">reference/</text>
        <text x="322" y="153" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">scripts/</text>
        <text x="322" y="168" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">assets/</text>

        <text x="312" y="34" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">目录名 =</text>
        <text x="312" y="48" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">命令名</text>
        <text x="312" y="68" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">/pdf</text>

        {/* 说明条 */}
        <rect x="20" y="184" width="420" height="32" rx="8" fill="none" stroke={p.color} />
        <foreignObject x="28" y="186" width="404" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>
            <strong style={{ color: p.color }}>{p.label}：</strong>{p.desc}
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
