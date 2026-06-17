// 分类图标：统一的线性 SVG 图标，替代随意的 emoji。
// 用 currentColor 继承文字颜色，尺寸默认 1em，可被父级 color 染色。
const PATHS = {
  // 大模型与 Agent —— 芯片 + 火花
  agent: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
      <path d="M9.5 9.5h5v5h-5z" />
      <path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2" />
    </>
  ),
  // 服务端 —— 服务器机架
  server: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.6" />
      <rect x="4" y="14" width="16" height="6" rx="1.6" />
      <path d="M7.5 7h.01M7.5 17h.01" />
      <path d="M11 7h6M11 17h6" />
    </>
  ),
  // 前端 —— 浏览器窗口
  frontend: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <path d="M6 7h.01M8.5 7h.01M11 7h.01" />
    </>
  ),
  // 移动端 —— 手机
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  // 计算机基础 —— 堆叠的基石
  cs: (
    <>
      <path d="M12 3l8 4.5-8 4.5-8-4.5z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16.5l8 4.5 8-4.5" />
    </>
  ),
}

export default function CategoryIcon({ id, size = 18, className = '' }) {
  const body = PATHS[id]
  if (!body) return null
  return (
    <svg
      className={`cat-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  )
}
