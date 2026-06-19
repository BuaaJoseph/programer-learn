import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 多消费者并发会乱序；单队列单消费者 或 按 key 路由到同一队列 可保序。
export default function MessageOrder() {
  const [mode, setMode] = useState('multi')
  const multi = mode === 'multi'

  const controls = (
    <>
      <button className={`fig-btn ${multi ? 'active' : ''}`} onClick={() => setMode('multi')}>多消费者并发</button>
      <button className={`fig-btn ${!multi ? 'active' : ''}`} onClick={() => setMode('single')}>单队列单消费者</button>
      <span className="fig-note">{multi ? '并发处理 → 顺序被打乱' : '串行处理 → 顺序保持'}</span>
    </>
  )

  // 消息 1,2,3 顺序进入
  const out = multi ? ['2', '1', '3'] : ['1', '2', '3']

  return (
    <Figure caption="同一组有先后关系的消息(如订单：创建→支付→发货)被多个消费者并发处理时，谁先处理完不确定，顺序就乱了。保序的代价是放弃并发：单队列单消费者，或按业务 key 路由到同一队列。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="消息顺序性">
        {/* 入队顺序 */}
        <text x="20" y="32" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">入队顺序：创建(1) → 支付(2) → 发货(3)</text>
        {['1', '2', '3'].map((m, i) => (
          <g key={m}><rect x={20 + i * 44} y="40" width="38" height="30" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" /><text x={39 + i * 44} y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="13" fontWeight="700" fill="var(--ink)">{m}</text></g>
        ))}

        {/* 消费者 */}
        {multi ? (
          [0, 1, 2].map((i) => (
            <g key={i}><rect x={200 + 0} y={36 + i * 40} width="90" height="30" rx="6" fill="var(--bg-subtle)" stroke="var(--border-strong)" /><text x={245} y={56 + i * 40} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink)">消费者{i + 1}</text></g>
          ))
        ) : (
          <g><rect x="200" y="76" width="90" height="34" rx="6" fill="var(--green-soft)" stroke="var(--green-line)" /><text x="245" y="98" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">单消费者</text></g>
        )}

        {/* 处理结果顺序 */}
        <text x="320" y="32" fontFamily="var(--mono)" fontSize="10" fill={multi ? 'var(--rose)' : 'var(--green)'}>处理完成顺序</text>
        {out.map((m, i) => (
          <g key={i}><rect x="330" y={40 + i * 34} width="100" height="26" rx="6" fill={multi ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={multi ? 'var(--rose-line)' : 'var(--green-line)'} /><text x="380" y={57 + i * 34} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">第{i + 1}个完成：{m}</text></g>
        ))}

        <rect x="20" y="160" width="410" height="24" rx="6" fill={multi ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={multi ? 'var(--rose-line)' : 'var(--green-line)'} />
        <text x="30" y="176" fontFamily="var(--sans)" fontSize="11.5" fill={multi ? 'var(--rose)' : 'var(--green)'}>
          {multi ? '支付(2) 先于创建(1) 完成 → 业务出错；提高吞吐却丢了顺序' : '严格 1→2→3；保序但同一队列无法并发扩容'}
        </text>
      </svg>
    </Figure>
  )
}
