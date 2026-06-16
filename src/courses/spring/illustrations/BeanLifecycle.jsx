import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { name: '实例化', desc: '通过构造器/工厂反射创建 Bean 的原始对象(此时属性还是空的)。' },
  { name: '属性填充', desc: '依赖注入：把 @Autowired/配置的依赖设置进去(populateBean)。' },
  { name: 'Aware 回调', desc: '若实现了 BeanNameAware/ApplicationContextAware 等，回调注入容器相关资源。' },
  { name: '初始化前', desc: 'BeanPostProcessor.postProcessBeforeInitialization；@PostConstruct 也在这附近执行。' },
  { name: '初始化', desc: '执行 InitializingBean.afterPropertiesSet 与自定义 init-method。' },
  { name: '初始化后', desc: 'postProcessAfterInitialization——AOP 代理就在这一步把目标对象包成代理对象返回！' },
  { name: '使用', desc: 'Bean 就绪，被注入到别处、对外提供服务。' },
  { name: '销毁', desc: '容器关闭时执行 @PreDestroy / DisposableBean.destroy / destroy-method。' },
]

export default function BeanLifecycle() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步 · ${s.name}`}</span>
    </>
  )

  return (
    <Figure caption="一个 Bean 从无到有要经历这几步。两个高频考点：① AOP 代理是在「初始化后(postProcessAfterInitialization)」织入的；② BeanPostProcessor 是 Spring 扩展的核心钩子。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Bean 生命周期">
        {STEPS.map((st, i) => {
          const active = i === step
          const done = i < step
          const x = 16 + (i % 4) * 110
          const y = 30 + Math.floor(i / 4) * 46
          return (
            <g key={i}>
              <rect x={x} y={y} width="98" height="36" rx="8"
                fill={active ? 'var(--accent)' : done ? 'var(--accent-soft)' : 'var(--bg-subtle)'}
                stroke={active ? 'var(--accent-strong)' : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
              <text x={x + 49} y={y + 16} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{i + 1}. {st.name}</text>
              <text x={x + 49} y={y + 29} textAnchor="middle" fontFamily="var(--mono)" fontSize="7" fill={active ? '#ffffff' : 'var(--ink-faint)'}>{i === 5 ? 'AOP 在此' : ''}</text>
            </g>
          )
        })}
        <rect x="16" y="128" width="432" height="58" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="24" y="132" width="416" height="52">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}><strong style={{ color: 'var(--accent-strong)' }}>{s.name}：</strong>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
