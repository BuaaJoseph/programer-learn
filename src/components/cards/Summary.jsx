export default function Summary({ points = [] }) {
  return (
    <div className="summary">
      <div className="summary-tag">本章小结</div>
      <ul>
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  )
}
