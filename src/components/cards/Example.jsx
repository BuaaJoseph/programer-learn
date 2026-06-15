export default function Example({ title, children }) {
  return (
    <div className="callout example">
      <div className="callout-tag">例子</div>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  )
}
