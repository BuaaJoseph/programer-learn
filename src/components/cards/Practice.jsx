export default function Practice({ title, children }) {
  return (
    <div className="callout practice">
      <div className="callout-tag">动手试试</div>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  )
}
