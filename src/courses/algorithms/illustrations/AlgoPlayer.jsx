import { useEffect, useRef, useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 通用算法动画播放器。
// 把算法执行过程预先「录制」成 frames（每一帧是一个状态快照），
// 这里只负责播放：▶ 播放 / ⏸ 暂停 / 单步前进后退 / 重置 / 调速，并显示当帧的解说文字。
//
// props:
//   frames    : 帧数组，每帧至少含 { note }（解说），其余字段由 renderFrame 解释
//   renderFrame(frame, index) => SVG 子元素
//   caption   : 图注
//   width     : SVG 宽度（viewBox 宽，默认 460）
//   height    : SVG 高度（viewBox 高，默认 220）
//   speeds    : 可选速度档（毫秒/帧）
export default function AlgoPlayer({
  frames,
  renderFrame,
  caption,
  width = 460,
  height = 220,
  ariaLabel = '算法动画',
  speeds = [
    { label: '0.5×', ms: 1600 },
    { label: '1×', ms: 850 },
    { label: '2×', ms: 380 },
  ],
}) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1)
  const timer = useRef(null)
  const last = frames.length - 1

  // 自动播放：每隔 ms 推进一帧，到末尾自动停。
  useEffect(() => {
    if (!playing) return
    if (step >= last) {
      setPlaying(false)
      return
    }
    timer.current = setTimeout(() => setStep((s) => Math.min(s + 1, last)), speeds[speedIdx].ms)
    return () => clearTimeout(timer.current)
  }, [playing, step, speedIdx, last, speeds])

  const reset = () => {
    setPlaying(false)
    setStep(0)
  }
  const toggle = () => {
    if (step >= last) {
      setStep(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }
  const back = () => {
    setPlaying(false)
    setStep((s) => Math.max(0, s - 1))
  }
  const fwd = () => {
    setPlaying(false)
    setStep((s) => Math.min(last, s + 1))
  }

  const frame = frames[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={reset} title="重置" aria-label="重置">⏮</button>
      <button className="fig-btn" onClick={back} title="上一步" aria-label="上一步" disabled={step === 0}>◀</button>
      <button className="fig-btn active" onClick={toggle} title="播放/暂停" style={{ minWidth: 64 }}>
        {playing ? '⏸ 暂停' : step >= last ? '↻ 重放' : '▶ 播放'}
      </button>
      <button className="fig-btn" onClick={fwd} title="下一步" aria-label="下一步" disabled={step === last}>▶</button>
      {speeds.map((sp, i) => (
        <button key={sp.label} className={`fig-btn ${i === speedIdx ? 'active' : ''}`} onClick={() => setSpeedIdx(i)}>
          {sp.label}
        </button>
      ))}
      <span className="fig-note">第 {step + 1} / {frames.length} 步</span>
    </>
  )

  return (
    <Figure caption={caption} controls={controls}>
      <div style={{ width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} role="img" aria-label={ariaLabel}>
          {renderFrame(frame, step)}
        </svg>
        {/* 进度条 */}
        <div style={{ display: 'flex', gap: 3, padding: '4px 0 8px', justifyContent: 'center' }}>
          {frames.map((_, i) => (
            <span
              key={i}
              onClick={() => { setPlaying(false); setStep(i) }}
              style={{
                width: Math.max(4, Math.min(14, 360 / frames.length)),
                height: 6,
                borderRadius: 3,
                cursor: 'pointer',
                background: i <= step ? 'var(--accent)' : 'var(--border-strong)',
              }}
            />
          ))}
        </div>
        {/* 当帧解说 */}
        <div
          style={{
            minHeight: 40,
            padding: '10px 14px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: '0.86rem',
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {frame?.note}
        </div>
      </div>
    </Figure>
  )
}
