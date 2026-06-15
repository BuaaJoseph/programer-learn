// 课程封面图：用 SVG 根据课程 meta（主色、图标、motif）生成一张有辨识度的封面。
// motif 决定装饰图案：'db' 画堆叠的数据库圆柱，'ai' 画连线的神经网络节点。
export default function CourseCover({ course }) {
  const { slug, accent = '#4f46e5', cover = '📘', coverMotif, subtitle } = course.meta
  const gid = `cov-${slug}`

  return (
    <svg
      className="course-cover-svg"
      viewBox="0 0 320 150"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${course.meta.shortTitle || course.meta.title} 封面`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#0f1320" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${gid})`} />

      {/* 装饰 motif（半透明白） */}
      <g opacity="0.16" fill="none" stroke="#ffffff" strokeWidth="2">
        {coverMotif === 'db' && (
          <g transform="translate(212 30)">
            {[0, 26, 52].map((dy) => (
              <g key={dy} transform={`translate(0 ${dy})`}>
                <ellipse cx="44" cy="10" rx="40" ry="12" />
                <path d="M4 10 V34 A40 12 0 0 0 84 34 V10" />
              </g>
            ))}
          </g>
        )}
        {coverMotif === 'ai' && (
          <g transform="translate(206 18)">
            <line x1="20" y1="20" x2="70" y2="55" />
            <line x1="20" y1="20" x2="60" y2="100" />
            <line x1="70" y1="55" x2="60" y2="100" />
            <line x1="70" y1="55" x2="100" y2="30" />
            <line x1="60" y1="100" x2="100" y2="95" />
            <line x1="100" y1="30" x2="100" y2="95" />
            {[
              [20, 20], [70, 55], [60, 100], [100, 30], [100, 95],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="7" fill="#ffffff" />
            ))}
          </g>
        )}
      </g>

      {/* 主图标徽章 */}
      <rect x="22" y="38" width="56" height="56" rx="14" fill="#ffffff" fillOpacity="0.16" />
      <text x="50" y="80" textAnchor="middle" fontSize="34">{cover}</text>

      {/* 副标题 */}
      <text x="24" y="124" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.85" letterSpacing="0.5">
        {subtitle}
      </text>
    </svg>
  )
}
