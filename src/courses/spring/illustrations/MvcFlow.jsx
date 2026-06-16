import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '请求先到达前端控制器 DispatcherServlet(统一入口)', hl: 'ds' },
  { desc: 'DispatcherServlet 问 HandlerMapping：这个 URL 该交给哪个 Controller？', hl: 'hm' },
  { desc: 'HandlerAdapter 适配并真正调用对应的 Controller 方法', hl: 'ha' },
  { desc: 'Controller 执行业务，返回 ModelAndView(模型数据 + 视图名)', hl: 'c' },
  { desc: 'ViewResolver 把视图名解析成具体视图(如 JSP/Thymeleaf)', hl: 'vr' },
  { desc: '视图渲染(填入模型数据)，结果返回给客户端', hl: 'view' },
]

export default function MvcFlow() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.hl === k

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const box = (k, x, y, w, label, color) => (
    <g>
      <rect x={x} y={y} width={w} height="38" rx="8" fill={on(k) ? color : 'var(--bg-subtle)'} stroke={on(k) ? color : 'var(--border-strong)'} strokeWidth={on(k) ? 2 : 1} />
      <text x={x + w / 2} y={y + 23} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={on(k) ? '#ffffff' : 'var(--ink)'}>{label}</text>
    </g>
  )

  return (
    <Figure caption="SpringMVC 一次请求的处理流程，核心是前端控制器 DispatcherServlet 统一调度：找处理器 → 适配调用 → 拿 ModelAndView → 解析视图 → 渲染返回。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="SpringMVC 流程">
        {box('ds', 160, 20, 140, 'DispatcherServlet', 'var(--accent)')}
        {box('hm', 20, 78, 130, 'HandlerMapping', 'var(--violet)')}
        {box('ha', 165, 78, 130, 'HandlerAdapter', 'var(--violet)')}
        {box('c', 310, 78, 130, 'Controller', 'var(--green)')}
        {box('vr', 95, 130, 130, 'ViewResolver', 'var(--amber)')}
        {box('view', 250, 130, 110, 'View 渲染', 'var(--amber)')}

        <line x1="200" y1="58" x2="85" y2="78" stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#mv-a)" />
        <line x1="230" y1="58" x2="230" y2="78" stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#mv-a)" />
        <line x1="295" y1="97" x2="310" y2="97" stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#mv-a)" />
        <line x1="230" y1="58" x2="160" y2="130" stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#mv-a)" />
        <line x1="225" y1="149" x2="250" y2="149" stroke="var(--ink-faint)" strokeWidth="1.2" markerEnd="url(#mv-a)" />
        <defs><marker id="mv-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="160" width="420" height="0" fill="none" />
        <text x="20" y="176" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}
