import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Sentinel from '@/courses/redis-internals/illustrations/Sentinel.jsx'

const sentinelConf = `# sentinel.conf 哨兵配置
port 26379

# 监控名为 mymaster 的主库，最后的 2 表示：
# 至少 2 个哨兵都认为主库挂了，才判定客观下线（quorum）
sentinel monitor mymaster 127.0.0.1 6379 2

# 多少毫秒连不上就判定主观下线
sentinel down-after-milliseconds mymaster 5000

# 故障转移时，最多几个从库同时向新主同步（控制对外影响）
sentinel parallel-syncs mymaster 1

# 故障转移整体超时时间
sentinel failover-timeout mymaster 60000`

const sentinelStart = `# 启动哨兵（两种等价方式）
redis-sentinel /etc/redis/sentinel.conf
redis-server /etc/redis/sentinel.conf --sentinel`

const clientAsk = `# 客户端不连固定主库，而是先问哨兵「主库现在是谁」
127.0.0.1:26379> sentinel get-master-addr-by-name mymaster
1) "127.0.0.1"
2) "6381"          # 故障转移后，新主已变成 6381

# 查看某个被监控主库的运行状态
127.0.0.1:26379> sentinel master mymaster`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          主从复制解决了数据冗余，却没解决一个要命的问题：<strong>主库挂了谁来顶</strong>？总不能靠运维半夜爬起来手动切。
          <em>Sentinel</em>（哨兵）就是 Redis 官方的「自动值班员」：它一直盯着主从，发现主库挂了就自动选一台从库
          升为新主，并通知所有客户端改连新地址——这套机制叫<strong>自动故障转移</strong>。
        </p>
      </Lead>

      <h2>哨兵的三件事</h2>
      <p>
        哨兵是独立于数据节点的进程，干三件事：<strong>监控</strong>（不停给主从发 ping 看死活）、
        <strong>通知</strong>（节点出事时通过发布订阅告知管理员或客户端）、
        <strong>自动故障转移</strong>（主库挂了，选新主、改拓扑、引导客户端切换）。
      </p>

      <Sentinel />

      <h2>主观下线与客观下线</h2>
      <p>
        哨兵判断主库是否真挂，分两步，目的是<strong>避免一台哨兵的误判</strong>就引发切换：
      </p>
      <ul>
        <li>
          <em>主观下线</em>（SDOWN，Subjectively Down）：<strong>某一个</strong>哨兵在 <code>down-after-milliseconds</code>
          时间内 ping 不通主库，它<strong>单方面</strong>认为主库挂了。但这可能只是它自己网络抖动。
        </li>
        <li>
          <em>客观下线</em>（ODOWN，Objectively Down）：发现主观下线的哨兵会去问其他哨兵的意见，当<strong>认为主库下线的哨兵数量
          达到配置的 quorum</strong>（如 2 个），才升级为客观下线——这才真正触发故障转移。
        </li>
      </ul>

      <Callout variant="warn" title="quorum 不是用来选主的">
        <p>
          常见误解：把 quorum 当成「几个哨兵投票选新主」。其实 <strong>quorum 只用于判定客观下线</strong>（达成「主库确实挂了」的共识）。
          真正执行故障转移前，哨兵之间还要先选出一个 <strong>Leader</strong>，由 Leader 单独完成切换，两者是两个独立环节。
        </p>
      </Callout>

      <h2>哨兵 Leader 选举：Raft</h2>
      <p>
        判定客观下线后，谁来执行这次故障转移？哨兵们用 <em>Raft</em> 算法选一个 <strong>Leader</strong>：每个哨兵向其他哨兵
        拉票，先拿到<strong>超过半数</strong>票的成为 Leader。这就要求哨兵总数最好是<strong>奇数</strong>，否则容易出现平票选不出来。
        选出 Leader 后，由它一个人主导整个故障转移，避免多个哨兵同时操作造成混乱。
      </p>

      <h2>故障转移流程</h2>
      <p>
        Leader 哨兵执行切换，大致三步：
      </p>
      <ul>
        <li>
          <strong>选新主</strong>：从存活的从库里挑一个最优的（优先级 replica-priority 高的、复制 offset 最大即数据最新的、runid 最小的），
          对它执行 <code>replicaof no one</code> 升为新主。
        </li>
        <li>
          <strong>其余从库改指向</strong>：让剩下的从库执行 <code>replicaof 新主</code>，重新挂到新主下面同步。
        </li>
        <li>
          <strong>通知客户端</strong>：通过发布订阅广播主库切换事件，并把<strong>旧主</strong>降级——它恢复后会作为新主的从库回归。
        </li>
      </ul>

      <Example title="主库半夜宕机自动切换">
        <p>
          凌晨 3 点主库 6379 所在机器断电。哨兵 ping 不通它，先各自标记主观下线；互相一问，3 个哨兵里有 2 个都连不上，
          达到 quorum=2，判定<strong>客观下线</strong>。哨兵用 Raft 选出 Leader，Leader 从两台从库中挑出 offset 最大的 6381 升为新主，
          让 6380 改去同步 6381，再广播「主库现在是 6381」。整个过程几秒内完成，运维睡到天亮才看到告警——业务几乎无感。
        </p>
      </Example>

      <h2>为什么哨兵自己要集群</h2>
      <p>
        如果只部署一个哨兵，它一旦挂了或网络孤立，整套高可用就形同虚设；而且单哨兵无法做客观下线的「共识」，
        误判风险大。所以哨兵要<strong>部署多个、且为奇数个</strong>（常见 3 个）：奇数便于 Raft 选出 Leader（过半票），
        多个则能<strong>互相印证避免误判</strong>，并降低<strong>脑裂</strong>风险（网络分区时，少数派那边因凑不齐 quorum 无法擅自切换）。
      </p>

      <KeyIdea title="客户端如何拿到新主地址">
        <p>
          关键点：<strong>客户端不要写死主库 IP</strong>，而是配置哨兵地址列表。支持哨兵的客户端（如 Jedis、Lettuce、redis-py）
          启动时先问哨兵 <code>sentinel get-master-addr-by-name mymaster</code> 拿到当前主库地址，并订阅切换事件；
          一旦发生故障转移，客户端收到通知后<strong>自动重连新主</strong>，业务代码无需改动。这正是哨兵方案对应用透明的根本原因。
        </p>
      </KeyIdea>

      <h3>面试怎么答</h3>
      <p>
        被问「哨兵怎么实现高可用」，按「监控 → 判定下线 → 选 Leader → 故障转移 → 客户端切换」一条线讲：
        单哨兵 ping 超时是主观下线，多个哨兵达到 quorum 共识是客观下线；客观下线后用 Raft 选 Leader 执行切换
        （选数据最新的从库升主、其余改指向、广播通知）；哨兵自己要奇数台集群避免误判和脑裂；客户端连哨兵而非主库，切换后自动重连新主。
      </p>

      <Practice title="配置哨兵并验证故障转移">
        <CodeBlock lang="ini" title="sentinel.conf" code={sentinelConf} />
        <CodeBlock lang="text" title="启动哨兵" code={sentinelStart} />
        <CodeBlock lang="text" title="客户端通过哨兵拿主库地址" code={clientAsk} />
        <p>验证：手动 “redis-cli -p 6379 debug sleep 30” 模拟主库假死，观察哨兵日志里 +sdown、+odown、+switch-master 一连串事件。</p>
      </Practice>

      <Summary
        points={[
          '哨兵是独立进程，负责监控、通知、自动故障转移，解决主从复制无法自动切主的问题。',
          '主观下线 SDOWN 是单个哨兵 ping 超时的单方判断；客观下线 ODOWN 需达到 quorum 个哨兵共识才成立。',
          'quorum 只用于判定客观下线，不是选主；客观下线后哨兵用 Raft 选出唯一 Leader 来执行切换。',
          '故障转移三步：选数据最新的从库升为新主、其余从库改指向新主、广播通知并把旧主降为从库。',
          '哨兵要部署奇数个集群（常见 3 个），便于 Raft 过半选举、互相印证避免误判与脑裂。',
          '客户端配置哨兵地址而非主库地址，用 get-master-addr-by-name 拿主库并订阅切换事件，故障后自动重连新主。',
        ]}
      />
    </>
  )
}
