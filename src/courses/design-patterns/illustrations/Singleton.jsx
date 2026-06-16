import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const WAYS = {
  hungry: { label: '饿汉式', safe: true, lazy: false, desc: '类加载时就创建实例(static final)。线程安全、简单；缺点是不管用不用都创建，可能浪费。' },
  lazyBad: { label: '懒汉式(非线程安全)', safe: false, lazy: true, desc: '用时才创建，但多线程下可能创建出多个实例——错误示范。' },
  dcl: { label: '双重检查锁 DCL', safe: true, lazy: true, desc: '两次判空 + synchronized + volatile(防指令重排导致拿到半初始化对象)。懒加载且线程安全。' },
  holder: { label: '静态内部类', safe: true, lazy: true, desc: '利用类加载机制：外部类加载时不创建，调用 getInstance 才加载内部类。懒加载、线程安全、写法优雅。' },
  enum: { label: '枚举', safe: true, lazy: false, desc: '《Effective Java》推荐：天然线程安全、且能防反射和反序列化破坏单例。' },
}

export default function Singleton() {
  const [k, setK] = useState('dcl')
  const w = WAYS[k]

  const controls = (
    <>
      {Object.entries(WAYS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label.split('(')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="单例保证一个类全局只有一个实例。五种写法各有取舍，面试重点是线程安全与懒加载：DCL 为什么要 volatile、静态内部类为什么优雅、枚举为什么最安全。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="单例模式五种写法">
        {Object.entries(WAYS).map(([key, v], i) => {
          const sel = k === key
          return (
            <g key={key}>
              <rect x="20" y={20 + i * 26} width="180" height="22" rx="5" fill={sel ? 'var(--accent)' : 'var(--bg-subtle)'} stroke={sel ? 'var(--accent-strong)' : 'var(--border)'} />
              <text x="30" y={35 + i * 26} fontFamily="var(--mono)" fontSize="10" fontWeight={sel ? '700' : '400'} fill={sel ? '#ffffff' : 'var(--ink)'}>{v.label}</text>
            </g>
          )
        })}
        {/* 两个属性灯 */}
        <g transform="translate(220 24)">
          <rect x="0" y="0" width="100" height="44" rx="8" fill={w.safe ? 'var(--green-soft)' : 'var(--rose-soft)'} stroke={w.safe ? 'var(--green)' : 'var(--rose)'} />
          <text x="50" y="20" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">线程安全</text>
          <text x="50" y="36" textAnchor="middle" fontFamily="var(--mono)" fontSize="13" fontWeight="700" fill={w.safe ? 'var(--green)' : 'var(--rose)'}>{w.safe ? '✓' : '✗'}</text>
          <rect x="110" y="0" width="100" height="44" rx="8" fill={w.lazy ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={w.lazy ? 'var(--green)' : 'var(--border-strong)'} />
          <text x="160" y="20" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">懒加载</text>
          <text x="160" y="36" textAnchor="middle" fontFamily="var(--mono)" fontSize="13" fontWeight="700" fill={w.lazy ? 'var(--green)' : 'var(--ink-faint)'}>{w.lazy ? '✓' : '✗'}</text>
        </g>

        <rect x="220" y="80" width="210" height="86" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="228" y="84" width="194" height="80">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{w.label}：</strong>{w.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
