import { useId } from 'react'

// 课程封面：按课程主题手绘的 SVG 构图。
// scene='bptree' 画一棵 B+Tree（MySQL）；scene='attention' 画 token 序列 + 注意力弧线（大模型）。
// 设计要点：主色对角渐变 + 左上柔光 + 网点纹理 + 居中主体（卡片/详情页两种裁剪都保持视觉重心）。
export default function CourseCover({ course }) {
  const { slug, accent = '#4f46e5', coverScene } = course.meta
  const uid = useId().replace(/:/g, '')
  const g = `${uid}-g`
  const glow = `${uid}-glow`
  const dots = `${uid}-dots`

  return (
    <svg
      className="course-cover-svg"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${course.meta.shortTitle || course.meta.title} 封面`}
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="55%" stopColor={accent} />
          <stop offset="100%" stopColor="#0f1320" />
        </linearGradient>
        <radialGradient id={glow} cx="0.24" cy="0.18" r="0.9">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern id={dots} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#ffffff" fillOpacity="0.07" />
        </pattern>
      </defs>

      <rect width="400" height="200" fill={`url(#${g})`} />
      <rect width="400" height="200" fill={`url(#${dots})`} />
      <rect width="400" height="200" fill={`url(#${glow})`} />

      {coverScene === 'bptree' ? (
        <BPlusTreeScene />
      ) : coverScene === 'kvgrid' ? (
        <KvGridScene />
      ) : coverScene === 'layers' ? (
        <LayersScene />
      ) : coverScene === 'skilldoc' ? (
        <SkillDocScene />
      ) : coverScene === 'mqflow' ? (
        <MqFlowScene />
      ) : coverScene === 'rpccall' ? (
        <RpcCallScene />
      ) : coverScene === 'partition' ? (
        <PartitionScene />
      ) : coverScene === 'znodes' ? (
        <ZnodesScene />
      ) : coverScene === 'proxy' ? (
        <ProxyScene />
      ) : coverScene === 'invindex' ? (
        <InvIndexScene />
      ) : coverScene === 'heap' ? (
        <HeapScene />
      ) : coverScene === 'threads' ? (
        <ThreadsScene />
      ) : coverScene === 'beans' ? (
        <BeansScene />
      ) : coverScene === 'netlayers' ? (
        <NetLayersScene />
      ) : coverScene === 'osproc' ? (
        <OsProcScene />
      ) : coverScene === 'patterns' ? (
        <PatternsScene />
      ) : coverScene === 'agentloop' ? (
        <AgentLoopScene />
      ) : coverScene === 'forge' ? (
        <ForgeScene />
      ) : coverScene === 'frameworks' ? (
        <FrameworksScene />
      ) : coverScene === 'react' ? (
        <ReactScene />
      ) : coverScene === 'vue' ? (
        <VueScene />
      ) : coverScene === 'jsts' ? (
        <JsTsScene />
      ) : coverScene === 'android' ? (
        <AndroidScene />
      ) : coverScene === 'ios' ? (
        <IosScene />
      ) : (
        <AttentionScene />
      )}
    </svg>
  )
}

// 玻璃质感节点
function GlassRect({ x, y, w, h, bright = 0.16, children }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#ffffff" fillOpacity={bright} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" />
      {children}
    </g>
  )
}

function BPlusTreeScene() {
  // 连线坐标
  const lines = [
    [200, 78, 136, 96], [200, 78, 264, 96], // root → internal
    [136, 120, 76, 136], [136, 120, 152, 136], // internalL → leaves
    [264, 120, 244, 136], [264, 120, 320, 136], // internalR → leaves
  ]
  const leaves = [44, 120, 212, 288]
  return (
    <g>
      {/* 右下角光晕弧线，增加层次 */}
      <g stroke="#ffffff" strokeOpacity="0.08" fill="none" strokeWidth="2">
        <circle cx="370" cy="180" r="60" />
        <circle cx="370" cy="180" r="92" />
      </g>

      {/* 连线 */}
      <g stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4">
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      {/* 根节点 */}
      <GlassRect x={160} y={52} w={80} h={26} bright={0.26}>
        <text x="200" y="69" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">30 · 60</text>
      </GlassRect>

      {/* 内部节点 */}
      <GlassRect x={100} y={96} w={72} h={24} bright={0.18}>
        <text x="136" y="112" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#ffffff">10 · 20</text>
      </GlassRect>
      <GlassRect x={228} y={96} w={72} h={24} bright={0.18}>
        <text x="264" y="112" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#ffffff">70 · 90</text>
      </GlassRect>

      {/* 叶子节点（含数据行）+ 链表 */}
      <line x1="44" y1="149" x2="352" y2="149" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="3 3" />
      {leaves.map((lx, i) => (
        <GlassRect key={i} x={lx} y={136} w={64} h={30} bright={0.13}>
          {[0, 1].map((r) => (
            <rect key={r} x={lx + 8} y={143 + r * 8} width={48 - r * 16} height="3" rx="1.5" fill="#ffffff" fillOpacity="0.55" />
          ))}
        </GlassRect>
      ))}
    </g>
  )
}

function KvGridScene() {
  // key→value 内存格 + 数据结构标签，呼应 Redis 的「内存键值 + 多结构」
  const cells = [
    { k: 'user:1', tag: 'Hash' },
    { k: 'rank', tag: 'ZSet' },
    { k: 'lock:x', tag: 'String' },
    { k: 'queue', tag: 'List' },
    { k: 'tags', tag: 'Set' },
    { k: 'stock', tag: 'String' },
  ]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.08" fill="none" strokeWidth="2">
        <circle cx="360" cy="170" r="58" />
        <circle cx="360" cy="170" r="90" />
      </g>
      {cells.map((c, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 40 + col * 116
        const y = 52 + row * 52
        return (
          <GlassRect key={c.k} x={x} y={y} w={104} h={40} bright={0.15}>
            <text x={x + 12} y={y + 18} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{c.k}</text>
            <rect x={x + 12} y={y + 24} width="80" height="8" rx="4" fill="#ffffff" fillOpacity="0.22" />
            <text x={x + 96} y={y + 14} textAnchor="end" fontFamily="var(--mono)" fontSize="8.5" fill="#ffffff" fillOpacity="0.8">{c.tag}</text>
          </GlassRect>
        )
      })}
      <text x="40" y="168" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">in-memory · key → value</text>
    </g>
  )
}

function LayersScene() {
  // 三层渐进式加载：元数据 / 正文 / 引用资源，叠成立体的「按需展开」卡片
  const layers = [
    { y: 44, w: 300, label: '元数据 · 始终加载', op: 0.3 },
    { y: 78, w: 300, label: 'SKILL.md 正文 · 触发时', op: 0.2 },
    { y: 112, w: 300, label: 'reference / scripts · 按需', op: 0.12 },
  ]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.08" fill="none" strokeWidth="2">
        <circle cx="360" cy="40" r="56" />
        <circle cx="360" cy="40" r="88" />
      </g>
      {layers.map((l, i) => (
        <g key={i}>
          <rect x={50 + i * 16} y={l.y} width={l.w} height="30" rx="8" fill="#ffffff" fillOpacity={l.op} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
          <text x={64 + i * 16} y={l.y + 20} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{l.label}</text>
        </g>
      ))}
      <text x="50" y="170" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">progressive disclosure</text>
    </g>
  )
}

function SkillDocScene() {
  // 一份 SKILL.md 文档卡 + 拼图块，点题「写 Skill」
  return (
    <g>
      {/* 右侧拼图块（半透明） */}
      <path
        d="M250 54 h44 a8 8 0 0 1 8 8 v18 a14 14 0 0 1 28 0 v18 a8 8 0 0 1 -8 8 h-18 a14 14 0 0 0 0 28 h18 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 v-44 a8 8 0 0 1 8 -8 v0 a14 14 0 0 0 0 -28 v-44 z"
        fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5"
        transform="translate(40 0)"
      />

      {/* 文档卡 */}
      <rect x="32" y="34" width="210" height="132" rx="10" fill="#ffffff" fillOpacity="0.16" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
      <text x="46" y="54" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">SKILL.md</text>
      <line x1="46" y1="62" x2="228" y2="62" stroke="#ffffff" strokeOpacity="0.25" />

      <text x="46" y="80" fontFamily="var(--mono)" fontSize="10" fill="#ffffff" fillOpacity="0.7">---</text>
      <text x="46" y="95" fontFamily="var(--mono)" fontSize="10.5" fill="#ffffff">name: skill</text>
      <text x="46" y="110" fontFamily="var(--mono)" fontSize="10.5" fill="#ffffff">description:</text>
      <rect x="118" y="102" width="110" height="8" rx="4" fill="#ffffff" fillOpacity="0.45" />
      <text x="46" y="125" fontFamily="var(--mono)" fontSize="10" fill="#ffffff" fillOpacity="0.7">---</text>

      {/* 正文行 */}
      {[138, 150].map((y, i) => (
        <rect key={i} x="46" y={y} width={i === 0 ? 170 : 130} height="7" rx="3.5" fill="#ffffff" fillOpacity="0.3" />
      ))}

      <text x="32" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">write your SKILL.md</text>
    </g>
  )
}

function MqFlowScene() {
  // 生产者 → 交换机 → 多个队列 → 消费者，点题消息路由与解耦
  return (
    <g>
      {/* producer */}
      <rect x="24" y="84" width="64" height="34" rx="8" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeOpacity="0.5" />
      <text x="56" y="105" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="#ffffff">producer</text>
      {/* exchange (菱形) */}
      <g transform="translate(150 101)">
        <rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(45)" fill="#ffffff" fillOpacity="0.22" stroke="#ffffff" strokeOpacity="0.55" />
        <text x="0" y="4" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill="#ffffff">X</text>
      </g>
      <line x1="88" y1="101" x2="124" y2="101" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
      {/* queues */}
      {[56, 101, 146].map((y, i) => (
        <g key={i}>
          <line x1="178" y1="101" x2="244" y2={y + 13} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.3" />
          <rect x="244" y={y} width="86" height="26" rx="5" fill="#ffffff" fillOpacity="0.15" stroke="#ffffff" strokeOpacity="0.45" />
          {[0, 1, 2, 3].map((b) => (
            <rect key={b} x={252 + b * 16} y={y + 8} width="11" height="10" rx="2" fill="#ffffff" fillOpacity={0.55 - b * 0.1} />
          ))}
          <line x1="330" y1={y + 13} x2="356" y2={y + 13} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.3" />
          <circle cx="368" cy={y + 13} r="10" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeOpacity="0.5" />
        </g>
      ))}
      <text x="24" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">producer → exchange → queues</text>
    </g>
  )
}

function RpcCallScene() {
  // consumer ↔ provider 调用链，中间是序列化/网络
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.08" fill="none" strokeWidth="2">
        <circle cx="360" cy="36" r="50" />
        <circle cx="360" cy="36" r="80" />
      </g>
      {/* consumer */}
      <rect x="28" y="74" width="96" height="52" rx="10" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeOpacity="0.55" />
      <text x="76" y="96" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">Consumer</text>
      <text x="76" y="112" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.8">proxy stub</text>
      {/* provider */}
      <rect x="276" y="74" width="96" height="52" rx="10" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeOpacity="0.55" />
      <text x="324" y="96" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">Provider</text>
      <text x="324" y="112" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.8">real impl</text>
      {/* 中间：序列化/网络 */}
      <line x1="124" y1="90" x2="276" y2="90" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.6" markerEnd="url(#rc-a)" />
      <line x1="276" y1="110" x2="124" y2="110" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.4" markerEnd="url(#rc-a)" />
      <text x="200" y="84" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.85">request · 序列化</text>
      <text x="200" y="124" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.7">response</text>
      <defs><marker id="rc-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="#ffffff" fillOpacity="0.7" /></marker></defs>
      <text x="28" y="170" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">call remote like local</text>
    </g>
  )
}

function PartitionScene() {
  // Topic 分成多个 partition，每个是只追加的日志段
  return (
    <g>
      <text x="40" y="44" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff" fillOpacity="0.9">Topic</text>
      {[0, 1, 2].map((p) => (
        <g key={p} transform={`translate(40 ${56 + p * 36})`}>
          <text x="0" y="16" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.7">P{p}</text>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={28 + i * 36} y="2" width="32" height="20" rx="3" fill="#ffffff" fillOpacity={0.1 + (i < 6 ? 0.12 : 0)} stroke="#ffffff" strokeOpacity="0.4" />
          ))}
          <text x={28 + 8 * 36 + 6} y="16" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.6">→</text>
        </g>
      ))}
      <text x="40" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">append-only log · offset →</text>
    </g>
  )
}

function ZnodesScene() {
  // znode 树
  const edges = [[200, 40, 110, 96], [200, 40, 200, 96], [200, 40, 300, 96], [110, 120, 70, 160], [110, 120, 150, 160]]
  const nodes = [[200, 40], [110, 108], [200, 108], [300, 108], [70, 160], [150, 160]]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4">
        {edges.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      {nodes.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="13" fill="#ffffff" fillOpacity={i === 0 ? 0.28 : 0.16} stroke="#ffffff" strokeOpacity="0.55" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">/{i === 0 ? '' : i}</text>
        </g>
      ))}
      <text x="40" y="186" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">znode tree · watch</text>
    </g>
  )
}

function ProxyScene() {
  // client → nginx → 多后端
  return (
    <g>
      <rect x="24" y="84" width="64" height="34" rx="8" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeOpacity="0.5" />
      <text x="56" y="105" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="#ffffff">client</text>
      <rect x="150" y="80" width="70" height="42" rx="9" fill="#ffffff" fillOpacity="0.26" stroke="#ffffff" strokeOpacity="0.6" />
      <text x="185" y="105" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">NGINX</text>
      <line x1="88" y1="101" x2="150" y2="101" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
      {[60, 101, 142].map((y, i) => (
        <g key={i}>
          <line x1="220" y1="101" x2="300" y2={y + 13} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.3" />
          <rect x="300" y={y} width="96" height="26" rx="5" fill="#ffffff" fillOpacity="0.15" stroke="#ffffff" strokeOpacity="0.45" />
          <text x="348" y={y + 17} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">server {i + 1}</text>
        </g>
      ))}
      <text x="24" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">reverse proxy · load balance</text>
    </g>
  )
}

function InvIndexScene() {
  // 倒排：词 → 文档列表
  const rows = [['搜索', '1, 3, 7'], ['引擎', '3, 5'], ['倒排', '1, 5, 9']]
  return (
    <g>
      <text x="40" y="44" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">term → doc ids</text>
      {rows.map(([term, ids], i) => (
        <g key={i} transform={`translate(40 ${56 + i * 34})`}>
          <rect x="0" y="0" width="90" height="26" rx="5" fill="#ffffff" fillOpacity="0.22" stroke="#ffffff" strokeOpacity="0.5" />
          <text x="45" y="17" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">{term}</text>
          <text x="104" y="17" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.6">→</text>
          <rect x="126" y="0" width="150" height="26" rx="5" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeOpacity="0.4" />
          <text x="138" y="17" fontFamily="var(--mono)" fontSize="11" fill="#ffffff">[{ids}]</text>
        </g>
      ))}
      <text x="40" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">inverted index</text>
    </g>
  )
}

function HeapScene() {
  // JVM 内存分区
  const regions = [
    { name: '堆 Heap', w: 200, sub: '新生代 + 老年代' },
    { name: '方法区', w: 120, sub: 'Metaspace' },
    { name: '虚拟机栈', w: 100, sub: '栈帧' },
    { name: '程序计数器', w: 120, sub: 'PC' },
  ]
  return (
    <g>
      <text x="40" y="42" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">JVM Runtime Data Areas</text>
      {regions.map((r, i) => {
        const x = 40 + (i % 2) * 170
        const y = 56 + Math.floor(i / 2) * 50
        return (
          <g key={i}>
            <rect x={x} y={y} width="150" height="40" rx="8" fill="#ffffff" fillOpacity={i === 0 ? 0.26 : 0.15} stroke="#ffffff" strokeOpacity="0.5" />
            <text x={x + 12} y={y + 18} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{r.name}</text>
            <text x={x + 12} y={y + 32} fontFamily="var(--mono)" fontSize="8" fill="#ffffff" fillOpacity="0.7">{r.sub}</text>
          </g>
        )
      })}
      <text x="40" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">heap · gc · class loading</text>
    </g>
  )
}

function ThreadsScene() {
  // 多线程时间线
  return (
    <g>
      <text x="40" y="42" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">threads · locks · JMM</text>
      {[0, 1, 2].map((t) => (
        <g key={t} transform={`translate(40 ${60 + t * 32})`}>
          <text x="0" y="14" fontFamily="var(--mono)" fontSize="9" fill="#ffffff" fillOpacity="0.7">T{t}</text>
          <line x1="28" y1="10" x2="320" y2="10" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          {[0, 1, 2, 3].map((b) => (
            <rect key={b} x={28 + b * 80 + (t * 14)} y="4" width="46" height="12" rx="3" fill="#ffffff" fillOpacity={0.15 + ((b + t) % 2) * 0.18} />
          ))}
        </g>
      ))}
      {/* 锁标记 */}
      <circle cx="200" cy="70" r="9" fill="#ffffff" fillOpacity="0.3" />
      <text x="200" y="74" textAnchor="middle" fontSize="10">🔒</text>
      <text x="40" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">synchronized · AQS · pool</text>
    </g>
  )
}

function BeansScene() {
  // IoC 容器装着 beans
  return (
    <g>
      <rect x="40" y="40" width="280" height="110" rx="12" fill="#ffffff" fillOpacity="0.1" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
      <text x="54" y="60" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">IoC Container</text>
      {['UserService', 'OrderDao', 'RedisConfig', 'Controller', 'TxManager', 'AopProxy'].map((b, i) => {
        const x = 56 + (i % 3) * 90
        const y = 74 + Math.floor(i / 3) * 38
        return (
          <g key={b}>
            <rect x={x} y={y} width="82" height="28" rx="14" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeOpacity="0.5" />
            <text x={x + 41} y={y + 18} textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5" fill="#ffffff">{b}</text>
          </g>
        )
      })}
      <text x="40" y="184" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">IoC · AOP · transaction</text>
    </g>
  )
}

function NetLayersScene() {
  const layers = ['应用层 HTTP', '传输层 TCP/UDP', '网络层 IP', '链路层']
  return (
    <g>
      <text x="40" y="42" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">TCP/IP layers</text>
      {layers.map((l, i) => (
        <g key={i}>
          <rect x={40 + i * 8} y={54 + i * 28} width="300" height="22" rx="6" fill="#ffffff" fillOpacity={0.24 - i * 0.04} stroke="#ffffff" strokeOpacity="0.5" />
          <text x={52 + i * 8} y={69 + i * 28} fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="#ffffff">{l}</text>
        </g>
      ))}
      <text x="40" y="186" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">TCP · HTTP · HTTPS</text>
    </g>
  )
}

function OsProcScene() {
  return (
    <g>
      <text x="40" y="42" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">process / thread / memory</text>
      {[0, 1].map((p) => (
        <g key={p}>
          <rect x={40 + p * 160} y="56" width="140" height="80" rx="10" fill="#ffffff" fillOpacity="0.1" stroke="#ffffff" strokeOpacity="0.5" />
          <text x={52 + p * 160} y="74" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="#ffffff">进程 {p + 1}</text>
          {[0, 1, 2].map((t) => (
            <rect key={t} x={52 + p * 160 + t * 40} y="84" width="32" height="42" rx="4" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeOpacity="0.4" />
          ))}
          <text x={110 + p * 160} y="148" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff" fillOpacity="0.7">threads</text>
        </g>
      ))}
      <text x="40" y="186" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">scheduling · IO · 虚拟内存</text>
    </g>
  )
}

function PatternsScene() {
  const cells = ['单例', '工厂', '代理', '策略', '观察者', '装饰器']
  return (
    <g>
      <text x="40" y="42" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff" fillOpacity="0.9">design patterns</text>
      {cells.map((c, i) => {
        const x = 40 + (i % 3) * 100
        const y = 56 + Math.floor(i / 3) * 48
        return (
          <g key={c}>
            <rect x={x} y={y} width="88" height="38" rx="9" fill="#ffffff" fillOpacity="0.16" stroke="#ffffff" strokeOpacity="0.5" />
            <text x={x + 44} y={y + 24} textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill="#ffffff">{c}</text>
          </g>
        )
      })}
      <text x="40" y="186" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">SOLID · 创建/结构/行为型</text>
    </g>
  )
}

function AgentLoopScene() {
  // 三阶段环形主循环：收集→行动→验证
  const nodes = [
    { x: 110, y: 60, t: '收集' },
    { x: 250, y: 60, t: '行动' },
    { x: 180, y: 130, t: '验证' },
  ]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.1" fill="none" strokeWidth="2">
        <circle cx="360" cy="40" r="50" />
        <circle cx="360" cy="40" r="80" />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" fill="none">
        <path d="M150 66 L210 66" markerEnd="url(#al-cov)" />
        <path d="M248 80 L196 122" markerEnd="url(#al-cov)" />
        <path d="M150 124 L124 84" markerEnd="url(#al-cov)" />
      </g>
      <defs>
        <marker id="al-cov" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ffffff" fillOpacity="0.6" /></marker>
      </defs>
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="30" fill="#ffffff" fillOpacity={i === 0 ? 0.26 : 0.16} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.4" />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill="#ffffff">{n.t}</text>
        </g>
      ))}
      <text x="40" y="178" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">model + harness · agentic loop</text>
    </g>
  )
}

function ForgeScene() {
  // 从零打造一把 CLI：终端提示符 forge> + 一圈火花，呼应「锻造」与「构建」。
  const sparks = [
    { x: 300, y: 40 }, { x: 330, y: 70 }, { x: 285, y: 78 },
    { x: 350, y: 50 }, { x: 318, y: 28 }, { x: 360, y: 92 },
  ]
  return (
    <g>
      {/* 终端窗口 */}
      <rect x="40" y="56" width="230" height="100" rx="10" fill="#0b1020" fillOpacity="0.55" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
      <g>
        <circle cx="58" cy="72" r="3.5" fill="#ff6058" />
        <circle cx="72" cy="72" r="3.5" fill="#ffbd2e" />
        <circle cx="86" cy="72" r="3.5" fill="#28c940" />
      </g>
      <line x1="40" y1="84" x2="270" y2="84" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
      <text x="58" y="108" fontFamily="var(--mono)" fontSize="14" fontWeight="700" fill="#ffffff">
        <tspan fillOpacity="0.6">$ </tspan>forge
      </text>
      <text x="58" y="130" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.78">
        <tspan fill="#7dd3fc">forge&gt;</tspan> 帮我重构这个项目
      </text>
      <rect x="200" y="121" width="8" height="13" fill="#7dd3fc" fillOpacity="0.85">
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
      </rect>
      {/* 铁砧 */}
      <g transform="translate(300 118)">
        <path d="M-34 0 H34 L26 10 H10 L8 22 H-8 L-10 10 H-26 Z" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.3" />
        <rect x="-12" y="22" width="24" height="12" fill="#ffffff" fillOpacity="0.14" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
      </g>
      {/* 火花 */}
      {sparks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={1.5 + (i % 3)} fill="#ffd27a" fillOpacity={0.5 + (i % 2) * 0.3} />
      ))}
      <text x="40" y="178" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">node + typescript · build your own coding agent</text>
    </g>
  )
}

function FrameworksScene() {
  // 多个框架节点连成一张网：同一个模型后端(中心) 被不同框架(外围)接入。
  const hub = { x: 200, y: 100 }
  const nodes = [
    { x: 70, y: 40, t: 'smol' },
    { x: 330, y: 40, t: 'OpenAI' },
    { x: 50, y: 110, t: 'Pydantic' },
    { x: 350, y: 110, t: 'LangGraph' },
    { x: 90, y: 168, t: 'CrewAI' },
    { x: 250, y: 170, t: 'LlamaIdx' },
    { x: 320, y: 168, t: 'Spring' },
  ]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.3">
        {nodes.map((n, i) => (
          <line key={i} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} />
        ))}
      </g>
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x - 34} y={n.y - 13} width="68" height="26" rx="7" fill="#ffffff" fillOpacity="0.14" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.1" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">{n.t}</text>
        </g>
      ))}
      {/* 中心：统一的模型后端 */}
      <circle cx={hub.x} cy={hub.y} r="34" fill="#ffffff" fillOpacity="0.22" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.4" />
      <text x={hub.x} y={hub.y - 2} textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">Qwen</text>
      <text x={hub.x} y={hub.y + 12} textAnchor="middle" fontFamily="var(--mono)" fontSize="7.5" fill="#ffffff" fillOpacity="0.85">百炼后端</text>
    </g>
  )
}

function ReactScene() {
  // React 经典原子标志：中心核 + 三条椭圆轨道。声明式 UI = f(state) 的隐喻。
  const cx = 200
  const cy = 100
  return (
    <g>
      <g transform={`translate(${cx} ${cy})`} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.6" fill="none">
        <ellipse rx="92" ry="34" />
        <ellipse rx="92" ry="34" transform="rotate(60)" />
        <ellipse rx="92" ry="34" transform="rotate(120)" />
      </g>
      <circle cx={cx} cy={cy} r="11" fill="#ffffff" fillOpacity="0.92" />
      {/* 三个轨道上的电子 */}
      <circle cx={cx + 92} cy={cy} r="5" fill="#ffffff" />
      <circle cx={cx - 46} cy={cy - 29} r="5" fill="#ffffff" fillOpacity="0.85" />
      <circle cx={cx - 46} cy={cy + 29} r="5" fill="#ffffff" fillOpacity="0.85" />
      <text x={cx} y={cy + 70} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.9">UI = f(state)</text>
    </g>
  )
}

function VueScene() {
  // Vue 经典三角 logo + 「数据→视图自动更新」的响应式隐喻。
  const cx = 200
  const cy = 84
  return (
    <g>
      {/* 外层 V 形三角 */}
      <path d={`M ${cx - 78} ${cy - 40} L ${cx} ${cy + 70} L ${cx + 78} ${cy - 40} L ${cx + 48} ${cy - 40} L ${cx} ${cy + 18} L ${cx - 48} ${cy - 40} Z`} fill="#ffffff" fillOpacity="0.92" />
      {/* 内层小三角 */}
      <path d={`M ${cx - 48} ${cy - 40} L ${cx} ${cy + 18} L ${cx + 48} ${cy - 40} L ${cx + 24} ${cy - 40} L ${cx} ${cy - 4} L ${cx - 24} ${cy - 40} Z`} fill="#ffffff" fillOpacity="0.5" />
      {/* 响应式：data → view */}
      <g transform={`translate(${cx} 172)`}>
        <rect x="-96" y="-13" width="74" height="26" rx="7" fill="#ffffff" fillOpacity="0.16" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.1" />
        <text x="-59" y="4" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">data</text>
        <path d="M -18 0 L 18 0" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.4" markerEnd="url(#vueArr)" />
        <rect x="22" y="-13" width="74" height="26" rx="7" fill="#ffffff" fillOpacity="0.16" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.1" />
        <text x="59" y="4" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">view</text>
      </g>
      <defs>
        <marker id="vueArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ffffff" fillOpacity="0.8" />
        </marker>
      </defs>
    </g>
  )
}

function JsTsScene() {
  // JS / TS 两块标志方块：动态的 JS 之上叠一层静态类型 TS。
  return (
    <g>
      <g transform="translate(118 60)">
        <rect x="0" y="0" width="92" height="92" rx="12" fill="#ffffff" fillOpacity="0.9" />
        <text x="78" y="78" textAnchor="end" fontFamily="var(--display)" fontSize="34" fontWeight="800" fill="#0f1320">JS</text>
      </g>
      <g transform="translate(190 88)">
        <rect x="0" y="0" width="92" height="92" rx="12" fill="#ffffff" fillOpacity="0.6" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" />
        <text x="78" y="78" textAnchor="end" fontFamily="var(--display)" fontSize="34" fontWeight="800" fill="#0f1320">TS</text>
      </g>
      <text x="200" y="196" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#ffffff" fillOpacity="0.9">动态 JS + 静态类型 TS</text>
    </g>
  )
}

function AndroidScene() {
  // Android 机器人头像：半圆头 + 两根天线 + 两只眼睛。
  const cx = 200
  const cy = 100
  return (
    <g>
      {/* 头（半圆 + 方角底） */}
      <path d={`M ${cx - 56} ${cy + 30} L ${cx - 56} ${cy} A 56 56 0 0 1 ${cx + 56} ${cy} L ${cx + 56} ${cy + 30} Z`} fill="#ffffff" fillOpacity="0.92" />
      {/* 天线 */}
      <g stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round">
        <line x1={cx - 30} y1={cy - 52} x2={cx - 18} y2={cy - 34} />
        <line x1={cx + 30} y1={cy - 52} x2={cx + 18} y2={cy - 34} />
      </g>
      {/* 眼睛 */}
      <circle cx={cx - 22} cy={cy - 10} r="5.5" fill="#0f1320" />
      <circle cx={cx + 22} cy={cy - 10} r="5.5" fill="#0f1320" />
      <text x={cx} y={cy + 66} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.9">Kotlin · Compose</text>
    </g>
  )
}

function IosScene() {
  // 一部手机轮廓 + 苹果咬痕暗示，传达 SwiftUI 声明式 UI。
  const cx = 200
  return (
    <g>
      {/* 手机外框 */}
      <rect x={cx - 44} y="30" width="88" height="140" rx="16" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2.4" />
      {/* 刘海 */}
      <rect x={cx - 14} y="36" width="28" height="6" rx="3" fill="#ffffff" fillOpacity="0.7" />
      {/* 屏幕里的声明式卡片 */}
      <g fill="#ffffff">
        <rect x={cx - 32} y="56" width="64" height="14" rx="4" fillOpacity="0.85" />
        <rect x={cx - 32} y="78" width="44" height="9" rx="3" fillOpacity="0.55" />
        <rect x={cx - 32} y="94" width="56" height="9" rx="3" fillOpacity="0.55" />
        <rect x={cx - 32} y="118" width="64" height="26" rx="7" fillOpacity="0.25" />
        <text x={cx} y="135" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">Button</text>
      </g>
      <text x={cx} y="190" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.9">Swift · SwiftUI</text>
    </g>
  )
}

function AttentionScene() {
  const tokens = ['床', '前', '明', '月', '光']
  const tx = (i) => 48 + i * 64
  const ty = 138
  // 注意力弧线：从「光」回看前面的字
  const arcs = [
    [4, 0], [4, 2], [3, 0], [2, 0],
  ]
  return (
    <g>
      <g stroke="#ffffff" strokeOpacity="0.08" fill="none" strokeWidth="2">
        <circle cx="360" cy="34" r="54" />
        <circle cx="360" cy="34" r="84" />
      </g>

      {/* 注意力弧线 */}
      <g stroke="#ffffff" fill="none">
        {arcs.map(([a, b], i) => {
          const x1 = tx(a) + 20
          const x2 = tx(b) + 20
          const mx = (x1 + x2) / 2
          const lift = 40 + Math.abs(a - b) * 14
          return (
            <path key={i} d={`M ${x1} ${ty - 6} Q ${mx} ${ty - lift} ${x2} ${ty - 6}`}
              strokeOpacity={0.25 + 0.12 * i} strokeWidth={1 + 0.6 * i} />
          )
        })}
      </g>

      {/* 概率条（下一个 token 分布） */}
      <g>
        {[0.62, 0.22, 0.1].map((p, i) => (
          <g key={i}>
            <rect x="300" y={150 + i * 14} width="74" height="8" rx="4" fill="#ffffff" fillOpacity="0.16" />
            <rect x="300" y={150 + i * 14} width={74 * p} height="8" rx="4" fill="#ffffff" fillOpacity={0.85 - i * 0.18} />
          </g>
        ))}
      </g>

      {/* token 芯片 */}
      {tokens.map((t, i) => (
        <GlassRect key={i} x={tx(i)} y={ty - 18} w={40} h={36} bright={i === 4 ? 0.28 : 0.15}>
          <text x={tx(i) + 20} y={ty + 6} textAnchor="middle" fontFamily="var(--display)" fontSize="18" fontWeight="700" fill="#ffffff">{t}</text>
        </GlassRect>
      ))}
      <text x="48" y={ty - 96} fontFamily="var(--mono)" fontSize="11" fill="#ffffff" fillOpacity="0.7">next-token · attention</text>
    </g>
  )
}
