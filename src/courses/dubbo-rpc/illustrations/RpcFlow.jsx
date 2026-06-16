import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { side: 'c', desc: '① 调用接口方法，被动态代理(Proxy)拦截' },
  { side: 'c', desc: '② 把方法名、参数等封装成请求对象，序列化成字节' },
  { side: 'net', desc: '③ 通过网络(通常长连接)把字节发给服务端' },
  { side: 'p', desc: '④ 服务端收到字节，反序列化还原成请求对象' },
  { side: 'p', desc: '⑤ 通过反射找到真正的实现方法并执行' },
  { side: 'p', desc: '⑥ 把返回值序列化' },
  { side: 'net', desc: '⑦ 网络回传给消费端' },
  { side: 'c', desc: '⑧ 消费端反序列化得到结果，代理把它当作方法返回值交还' },
]

export default function RpcFlow() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="一次 RPC 调用的全过程，8 步走完 consumer ↔ provider。任何 RPC 框架(Dubbo/gRPC/Thrift)都是这套骨架，区别只在序列化、协议与治理。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="RPC 调用全过程">
        {/* consumer */}
        <rect x="20" y="30" width="130" height="100" rx="10" fill={s.side === 'c' ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
        <text x="85" y="50" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={s.side === 'c' ? '#ffffff' : 'var(--accent-strong)'}>Consumer</text>
        {['Proxy 代理', '序列化', '网络客户端'].map((t, i) => (
          <text key={t} x="85" y={72 + i * 18} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={s.side === 'c' ? '#ffffff' : 'var(--ink-soft)'}>{t}</text>
        ))}

        {/* provider */}
        <rect x="310" y="30" width="130" height="100" rx="10" fill={s.side === 'p' ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" />
        <text x="375" y="50" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={s.side === 'p' ? '#ffffff' : 'var(--green)'}>Provider</text>
        {['网络服务端', '反序列化', '反射执行'].map((t, i) => (
          <text key={t} x="375" y={72 + i * 18} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={s.side === 'p' ? '#ffffff' : 'var(--ink-soft)'}>{t}</text>
        ))}

        {/* network */}
        <line x1="150" y1="66" x2="310" y2="66" stroke={s.side === 'net' ? 'var(--violet)' : 'var(--border-strong)'} strokeWidth={s.side === 'net' ? 2.5 : 1.4} markerEnd="url(#rf-a)" />
        <line x1="310" y1="96" x2="150" y2="96" stroke={s.side === 'net' ? 'var(--violet)' : 'var(--border-strong)'} strokeWidth={s.side === 'net' ? 2.5 : 1.4} markerEnd="url(#rf-a)" />
        <text x="230" y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">request bytes</text>
        <text x="230" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">response bytes</text>
        <defs><marker id="rf-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="420" height="40" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="404" height="36">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
