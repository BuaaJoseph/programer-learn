import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// Activity 生命周期：点一个回调看它何时被调用、该做什么。
const CBS = [
  { key: 'create', label: 'onCreate', title: 'onCreate()', note: 'Activity 首次创建时调用，且整个生命中只调一次。在这里做一次性初始化：setContent 设置 Compose UI、绑定 ViewModel、恢复保存的状态。此时界面还不可见。' },
  { key: 'start', label: 'onStart', title: 'onStart()', note: 'Activity 即将对用户可见时调用。从这里到 onStop 之间界面是「可见」的。常用来注册只在可见期间需要的资源（如某些广播）。' },
  { key: 'resume', label: 'onResume', title: 'onResume()', note: '进入前台、获得焦点、可以与用户交互。这是 Activity 的「运行态」。开始相机预览、传感器、动画等需要在前台进行的工作。' },
  { key: 'pause', label: 'onPause', title: 'onPause()', note: '失去焦点但可能仍部分可见（如弹出半透明对话框）。应快速做轻量收尾——它会阻塞下一个界面显示，重活别放这里。' },
  { key: 'stop', label: 'onStop', title: 'onStop()', note: '完全不可见时调用（被其它 Activity 完全遮挡或进入后台）。释放较重的资源、停止动画与刷新。被系统回收内存时可能不再回到 onDestroy。' },
  { key: 'destroy', label: 'onDestroy', title: 'onDestroy()', note: 'Activity 被销毁前的最后一次回调：用户退出或配置变更（如旋转屏幕）导致重建。注意配置变更会「销毁并立即重建」——这正是要用 ViewModel 与状态保存的原因。' },
]

export default function LifecycleDiagram() {
  const [k, setK] = useState('create')
  const cur = CBS.find((x) => x.key === k)
  const idx = CBS.findIndex((x) => x.key === k)

  const controls = (
    <>
      {CBS.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="Activity 生命周期：系统按 onCreate → onStart → onResume 把界面推到前台，再按 onPause → onStop → onDestroy 撤下。点每个回调看它何时触发、该做什么。理解它是写对 Android 的前提——尤其是「配置变更会销毁并重建」。" controls={controls}>
      <svg viewBox="0 0 480 250" width="480" role="img" aria-label="Activity 生命周期图">
        {CBS.map((x, i) => {
          const col = i % 3
          const row = Math.floor(i / 3)
          const X = 14 + col * 158
          const Y = 22 + row * 56
          const on = x.key === k
          const done = i <= idx
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={Y} width="144" height="40" rx="9" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={done ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 72} y={Y + 25} textAnchor="middle" fontFamily="var(--mono)" fontSize="12.5" fontWeight={on ? '700' : '600'} fill={done ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
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
