import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 访问序列在 3 个页框下，FIFO vs LRU 的缺页情况。
const REF = [1, 2, 3, 4, 1, 2, 5]
function simulate(algo) {
  const frames = []
  const steps = []
  let faults = 0
  for (const page of REF) {
    let fault = false
    const idx = frames.indexOf(page)
    if (idx === -1) {
      fault = true; faults++
      if (frames.length < 3) frames.push(page)
      else {
        if (algo === 'fifo') frames.shift(), frames.push(page)
        else { frames.shift(); frames.push(page) } // LRU 简化：因访问后会重排，见下
      }
    } else if (algo === 'lru') {
      frames.splice(idx, 1); frames.push(page) // 命中则移到最近使用
    }
    steps.push({ page, frames: [...frames], fault })
  }
  return { steps, faults }
}
// 重新精确模拟 LRU
function simLRU() {
  const frames = []; const steps = []; let faults = 0
  for (const page of REF) {
    let fault = false; const idx = frames.indexOf(page)
    if (idx !== -1) { frames.splice(idx, 1); frames.push(page) }
    else { fault = true; faults++; if (frames.length >= 3) frames.shift(); frames.push(page) }
    steps.push({ page, frames: [...frames], fault })
  }
  return { steps, faults }
}
function simFIFO() {
  const frames = []; const steps = []; let faults = 0
  for (const page of REF) {
    let fault = false
    if (!frames.includes(page)) { fault = true; faults++; if (frames.length >= 3) frames.shift(); frames.push(page) }
    steps.push({ page, frames: [...frames], fault })
  }
  return { steps, faults }
}

export default function PageReplace() {
  const [algo, setAlgo] = useState('lru')
  const { steps, faults } = algo === 'lru' ? simLRU() : simFIFO()

  const controls = (
    <>
      <button className={`fig-btn ${algo === 'fifo' ? 'active' : ''}`} onClick={() => setAlgo('fifo')}>FIFO</button>
      <button className={`fig-btn ${algo === 'lru' ? 'active' : ''}`} onClick={() => setAlgo('lru')}>LRU</button>
      <span className="fig-note">3 个页框 · 缺页 {faults} 次</span>
    </>
  )

  return (
    <Figure caption="物理内存装不下所有页时，要按算法换出某一页。FIFO 换最早进来的(可能换掉热页、有 Belady 异常)；LRU 换最久没用的(更贴近实际，但要记录访问时间)。看相同访问序列下两者的缺页差异。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="页面置换算法">
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">访问序列：{REF.join(' ')}　（{algo === 'lru' ? 'LRU' : 'FIFO'}）</text>
        {steps.map((st, i) => (
          <g key={i}>
            <rect x={20 + i * 62} y="40" width="54" height="22" rx="4" fill={st.fault ? 'var(--rose)' : 'var(--green)'} />
            <text x={47 + i * 62} y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{st.page}</text>
            {[0, 1, 2].map((f) => (
              <g key={f}>
                <rect x={20 + i * 62} y={68 + f * 26} width="54" height="22" rx="3" fill="var(--bg-subtle)" stroke="var(--border)" />
                <text x={47 + i * 62} y={84 + f * 26} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{st.frames[f] ?? ''}</text>
              </g>
            ))}
            <text x={47 + i * 62} y="158" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={st.fault ? 'var(--rose)' : 'var(--green)'}>{st.fault ? '缺页' : '命中'}</text>
          </g>
        ))}
        <text x="20" y="180" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">红=缺页(换入)，绿=命中。LRU 通常比 FIFO 缺页更少；Clock 是 LRU 的近似实现。</text>
      </svg>
    </Figure>
  )
}
