import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 前端构建流水线：点一个阶段看打包器在这一步做什么。
const STAGES = [
  { key: 'entry', label: '① 入口', title: 'Entry（入口）', note: '从配置的入口文件出发（如 src/main.tsx）。打包器以它为根，准备递归分析整个项目用到了哪些模块。' },
  { key: 'resolve', label: '② 解析依赖', title: 'Resolve & Graph（解析依赖图）', note: '解析每个文件里的 import/require，定位被依赖的模块（走 node_modules 解析规则），递归构建一张「模块依赖图」——谁依赖谁一目了然。' },
  { key: 'transform', label: '③ 转换', title: 'Transform（加载与转换）', note: '每个模块按类型交给对应 loader/插件处理：TS→JS、JSX 编译、CSS 处理、资源转 base64/URL。一切非 JS 资源都被转成模块。' },
  { key: 'bundle', label: '④ 分块', title: 'Bundle & Split（生成 chunk）', note: '把依赖图组织成若干 chunk：入口 chunk、动态 import 拆出的异步 chunk、被多处共享的公共 chunk。加上运行时把模块在浏览器里串起来。' },
  { key: 'optimize', label: '⑤ 优化', title: 'Optimize（优化）', note: 'Tree Shaking 摇掉未用到的导出、minify 压缩代码、作用域提升、给文件名加 contenthash 以便长效缓存。产物体积在这一步被压到最小。' },
  { key: 'output', label: '⑥ 产出', title: 'Output（产出）', note: '把优化后的 JS/CSS/资源与 index.html 一起写到 dist/，并注入带 hash 的引用。这就是最终能部署到服务器/CDN 的静态产物。' },
]

export default function BuildPipeline() {
  const [k, setK] = useState('entry')
  const cur = STAGES.find((x) => x.key === k)
  const idx = STAGES.findIndex((x) => x.key === k)

  const controls = (
    <>
      {STAGES.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="一次前端构建的流水线：入口 → 解析依赖图 → 转换各类资源 → 生成并拆分 chunk → 优化（Tree Shaking/压缩/hash）→ 产出 dist。点每一步看打包器具体在做什么。Vite/webpack/Rollup 都是这条主线的不同实现。" controls={controls}>
      <svg viewBox="0 0 480 250" width="480" role="img" aria-label="前端构建流水线图">
        {STAGES.map((x, i) => {
          const col = i % 3
          const row = Math.floor(i / 3)
          const X = 14 + col * 158
          const Y = 22 + row * 56
          const on = x.key === k
          const done = i <= idx
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={Y} width="144" height="40" rx="9" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={done ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 72} y={Y + 25} textAnchor="middle" fontFamily="var(--sans)" fontSize="12.5" fontWeight={on ? '700' : '600'} fill={done ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
            </g>
          )
        })}
        <rect x="14" y="142" width="452" height="96" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="28" y="164" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">{cur.title}</text>
        <foreignObject x="26" y="172" width="430" height="60">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.45 }}>{cur.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
