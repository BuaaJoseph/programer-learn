const TAGS = {
  note: '说明',
  warn: '注意',
  tip: '提示',
}

export default function Callout({ variant = 'note', title, children }) {
  const v = TAGS[variant] ? variant : 'note'
  return (
    <div className={`callout ${v}`}>
      <div className="callout-tag">{TAGS[v]}</div>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  )
}
