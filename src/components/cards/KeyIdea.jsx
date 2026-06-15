export default function KeyIdea({ title, children }) {
  return (
    <div className="callout key">
      <div className="callout-tag">核心要点</div>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  )
}
