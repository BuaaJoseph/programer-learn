import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const FACTORS = {
  seq: { label: '顺序写', desc: '消息只追加到日志末尾，磁盘磁头不来回寻道——顺序写磁盘的速度接近内存，远超随机写。' },
  pagecache: { label: '页缓存', desc: '写先进操作系统 page cache，由 OS 异步刷盘；读也多命中缓存，Kafka 自己几乎不管缓存。' },
  zerocopy: { label: '零拷贝', desc: 'sendfile 让数据从页缓存直接进网卡，跳过「内核→用户态→内核」的多次拷贝，省 CPU 省内存。' },
  batch: { label: '批量+压缩', desc: '生产者把多条消息攒成一批、压缩后再发；broker 也按批存储转发，大幅降低网络与 IO 次数。' },
}

export default function LogStorage() {
  const [k, setK] = useState('zerocopy')
  const f = FACTORS[k]

  const controls = (
    <>
      {Object.entries(FACTORS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="Kafka 用磁盘却快，靠四板斧：顺序写、页缓存、零拷贝、批量压缩。点上方逐个看。重点是零拷贝——传统要 4 次拷贝，sendfile 直接从页缓存到网卡。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Kafka 高吞吐存储原理">
        {k === 'zerocopy' ? (
          <>
            <text x="20" y="28" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">零拷贝 sendfile：磁盘/页缓存 → 网卡，跳过用户态</text>
            {['磁盘文件', '页缓存', '网卡 NIC'].map((t, i) => (
              <g key={t}>
                <rect x={40 + i * 140} y="56" width="100" height="44" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x={90 + i * 140} y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">{t}</text>
                {i < 2 && <line x1={140 + i * 140} y1="78" x2={180 + i * 140} y2="78" stroke="var(--green)" strokeWidth="2.5" markerEnd="url(#ls-a)" />}
              </g>
            ))}
            <text x="40" y="124" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">对比传统：磁盘→内核缓冲→用户缓冲→socket缓冲→网卡（4 次拷贝 + 2 次上下文切换）</text>
            <defs><marker id="ls-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker></defs>
          </>
        ) : (
          <>
            <text x="20" y="30" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">分区日志按 segment 分段，消息只在末尾追加</text>
            {[0, 1, 2].map((seg) => (
              <g key={seg}>
                <text x={28 + seg * 140} y="56" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">segment {seg}</text>
                {Array.from({ length: 4 }).map((_, m) => (
                  <rect key={m} x={28 + seg * 140 + m * 32} y="62" width="28" height="26" rx="4" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                ))}
              </g>
            ))}
            <text x="20" y="110" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">↑ 新消息总是追加到最后一个 segment 末尾（顺序写）</text>
          </>
        )}

        <rect x="20" y="150" width="420" height="40" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="404" height="36">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{f.label}：</strong>{f.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
