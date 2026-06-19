// DeerFlow 课程专用「图解套件」：纯内联样式的盒子/箭头/泳道，
// 不依赖任何外部图库（满足「内联 CSS、可读性强」要求，与平台手写 SVG/CSS 风格一致）。

const TONES = {
  base: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' }, // 主色（orange）
  blue: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  green: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
  purple: { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
  gray: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' },
  amber: { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  rose: { bg: '#fff1f2', border: '#fda4af', text: '#9f1239' },
}

export function DiagramFrame({ title, children, note }) {
  return (
    <figure
      style={{
        margin: '1.6rem 0',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        background: 'linear-gradient(180deg,#fff,#fafafa)',
        padding: '1.1rem 1.1rem 0.9rem',
        overflowX: 'auto',
      }}
    >
      {title && (
        <figcaption
          style={{
            fontSize: '.82rem',
            fontWeight: 700,
            letterSpacing: '.04em',
            color: '#c2410c',
            marginBottom: '.9rem',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </figcaption>
      )}
      {children}
      {note && (
        <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: '.8rem', lineHeight: 1.6 }}>
          {note}
        </div>
      )}
    </figure>
  )
}

export function Box({ title, sub, tone = 'gray', mono, style, flex }) {
  const t = TONES[tone] || TONES.gray
  return (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 9,
        padding: '.55rem .7rem',
        minWidth: 96,
        flex: flex ? '1 1 0' : '0 0 auto',
        ...style,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: '.83rem',
          color: t.text,
          fontFamily: mono ? 'var(--font-mono, ui-monospace, monospace)' : 'inherit',
        }}
      >
        {title}
      </div>
      {sub && <div style={{ fontSize: '.72rem', color: '#475569', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

export function Row({ children, gap = 10, wrap, align = 'stretch', style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap,
        alignItems: align,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Col({ children, gap = 10, align = 'stretch', style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: align, ...style }}>
      {children}
    </div>
  )
}

// 方向箭头：down / up / right / left，可带标签
export function Arrow({ dir = 'down', label, dashed }) {
  const glyph = { down: '↓', up: '↑', right: '→', left: '←' }[dir] || '↓'
  const horizontal = dir === 'right' || dir === 'left'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        color: '#c2410c',
        fontSize: horizontal ? '1.1rem' : '1rem',
        padding: horizontal ? '0 2px' : '2px 0',
      }}
    >
      <span style={{ opacity: dashed ? 0.5 : 1 }}>{glyph}</span>
      {label && (
        <span style={{ fontSize: '.7rem', color: '#64748b', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {label}
        </span>
      )}
    </div>
  )
}

// 一层「泳道」：左侧标签 + 右侧内容
export function Lane({ label, tone = 'gray', children }) {
  const t = TONES[tone] || TONES.gray
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'stretch',
        border: `1px dashed ${t.border}`,
        borderRadius: 10,
        padding: '.6rem .7rem',
        background: 'rgba(255,255,255,.5)',
      }}
    >
      <div
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: '.74rem',
          fontWeight: 700,
          color: t.text,
          textAlign: 'center',
          letterSpacing: '.05em',
          minWidth: 22,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// 时序图的一步：编号 + 角色 + 描述
export function Step({ n, actor, children, tone = 'base' }) {
  const t = TONES[tone] || TONES.base
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          flex: '0 0 auto',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: t.text,
          color: '#fff',
          fontSize: '.74rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1, fontSize: '.84rem', lineHeight: 1.65, color: '#334155' }}>
        {actor && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '.7rem',
              fontWeight: 700,
              color: t.text,
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 5,
              padding: '0 6px',
              marginRight: 6,
            }}
          >
            {actor}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}
