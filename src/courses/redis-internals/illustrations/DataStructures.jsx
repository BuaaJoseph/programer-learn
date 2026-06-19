import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const TYPES = {
  String: { enc: 'int / embstr / raw', scene: '缓存、计数器、分布式锁、Session', cmd: 'SET k v · INCR k · SETNX' },
  Hash: { enc: 'listpack → hashtable', scene: '存对象（用户信息等），可单字段读写', cmd: 'HSET k f v · HGET k f' },
  List: { enc: 'listpack → quicklist', scene: '消息队列、最新列表、栈', cmd: 'LPUSH · RPOP · LRANGE' },
  Set: { enc: 'intset → hashtable', scene: '去重、标签、共同好友(交并差)', cmd: 'SADD · SINTER · SISMEMBER' },
  ZSet: { enc: 'listpack → skiplist', scene: '排行榜、延时队列、范围查询', cmd: 'ZADD · ZRANGE · ZRANK' },
}

export default function DataStructures() {
  const [t, setT] = useState('ZSet')
  const info = TYPES[t]

  const controls = (
    <>
      {Object.keys(TYPES).map((k) => (
        <button key={k} className={`fig-btn ${t === k ? 'active' : ''}`} onClick={() => setT(k)}>
          {k}
        </button>
      ))}
      <span className="fig-note">编码会随数据量自动切换</span>
    </>
  )

  return (
    <Figure caption="Redis 对外是 5 种类型，对内每种类型会按元素数量/大小自动在两种底层编码间切换（小数据省内存、大数据保性能）。点上方切换查看。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="Redis 五大数据结构">
        <rect x="14" y="16" width="180" height="40" rx="10" fill="var(--rose)" />
        <text x="104" y="41" textAnchor="middle" fontFamily="var(--display)" fontSize="18" fontWeight="700" fill="#ffffff">{t}</text>

        {/* 结构示意 */}
        <g>
          {t === 'String' && <rect x="220" y="20" width="220" height="32" rx="6" fill="var(--rose-soft)" stroke="var(--rose-line)" />}
          {t === 'String' && <text x="330" y="41" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">一段字节序列 (最大 512MB)</text>}
          {t === 'Hash' && ['name→李四', 'age→30', 'city→北京'].map((s, i) => (
            <g key={i}><rect x="220" y={18 + i * 14} width="220" height="12" rx="3" fill="var(--rose-soft)" stroke="var(--rose-line)" /><text x="226" y={28 + i * 14} fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{s}</text></g>
          ))}
          {t === 'List' && [0, 1, 2, 3].map((i) => (
            <g key={i}><rect x={220 + i * 56} y="20" width="50" height="32" rx="6" fill="var(--rose-soft)" stroke="var(--rose-line)" /><text x={245 + i * 56} y="41" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">e{i}</text></g>
          ))}
          {t === 'Set' && ['a', 'b', 'c'].map((s, i) => (
            <g key={i}><circle cx={250 + i * 64} cy="36" r="18" fill="var(--rose-soft)" stroke="var(--rose-line)" /><text x={250 + i * 64} y="40" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">{s}</text></g>
          ))}
          {t === 'ZSet' && ['90:A', '85:B', '70:C'].map((s, i) => (
            <g key={i}><rect x="220" y={18 + i * 14} width={170 - i * 30} height="12" rx="3" fill="var(--rose)" fillOpacity={0.85 - i * 0.2} /><text x="396" y={28 + i * 14} fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{s}</text></g>
          ))}
        </g>

        <rect x="14" y="76" width="426" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="26" y="95" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)"><tspan fill="var(--rose)">底层编码：</tspan>{info.enc}</text>

        <rect x="14" y="114" width="426" height="34" rx="7" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="26" y="135" fontFamily="var(--sans)" fontSize="13" fill="var(--ink)"><tspan fontWeight="700" fill="var(--accent-strong)">典型场景：</tspan>{info.scene}</text>

        <rect x="14" y="156" width="426" height="30" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="26" y="175" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)"><tspan fill="var(--green)">常用命令：</tspan>{info.cmd}</text>
      </svg>
    </Figure>
  )
}
