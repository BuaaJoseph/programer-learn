export default function Figure({ caption, controls, children }) {
  return (
    <figure className="figure">
      <div className="figure-canvas">{children}</div>
      {controls && <div className="figure-controls">{controls}</div>}
      {caption && <figcaption className="figure-caption">{caption}</figcaption>}
    </figure>
  )
}
