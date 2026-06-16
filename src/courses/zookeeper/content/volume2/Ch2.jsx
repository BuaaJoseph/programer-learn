import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import QuorumWrite from '@/courses/zookeeper/illustrations/QuorumWrite.jsx'

const writeDemo = `# 终端 A：连到 zk1（恰好是 Follower），发起一次写
[zk1] create /config/color blue
# 写请求被转发给 Leader，Leader 广播 proposal，过半 ACK 后 commit
Created /config/color

# 终端 B：连到 zk3（另一个节点），紧接着读
[zk3] get /config/color
blue          # 同步完成后能读到；若读得太快可能看到旧值或读不到

# 需要强制读到最新时，先 sync 再 get
[zk3] sync /config/color
[zk3] get /config/color
blue`

const orderDemo = `# zxid 保证全局顺序：连续三次写
create /seq/a v1   # zxid = 0x100000001
create /seq/b v2   # zxid = 0x100000002
set    /seq/a v3   # zxid = 0x100000003
# 所有节点回放事务的顺序都严格按 zxid 递增，绝不会乱序`

const twoPhaseDemo = `# 写的「类两阶段提交」时间线（一条写在集群里的旅程）
1) 客户端 -> Follower:   发起 create/set/delete
2) Follower -> Leader:   转发写请求（读不转发）
3) Leader:               分配 zxid，写本地事务日志
4) Leader -> 所有节点:   广播 PROPOSAL（含 zxid + 变更内容）
5) Follower:             落事务日志 -> 回 ACK
6) Leader:               收齐「过半 ACK」（含自己）
7) Leader -> 所有节点:   广播 COMMIT
8) 各节点:               应用到内存数据树，写对外可见
9) Follower -> 客户端:   返回成功

# 注意：第 6 步只要过半即可返回成功，落后的节点稍后由 COMMIT 追上`

const fsyncDemo = `# 写在「落盘」上的关键参数：proposal 要先 fsync 到事务日志才回 ACK
# zoo.cfg
dataLogDir=/ssd/zk-log     # 强烈建议事务日志单独放 SSD，写性能瓶颈在这
forceSync=yes              # 默认 yes：每条事务 fsync 落盘后才 ACK（安全但慢）
                           # 改 no 会快很多，但宕机可能丢已 ACK 的事务，慎用！

# 经验：ZK 写慢，十有八九是事务日志和快照抢同一块机械盘的 IO`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          ZooKeeper 常被说成「强一致」，但严格讲它给的是<em>顺序一致性</em>，不是线性一致性。理解读写流程，
          关键就在两句话：<strong>写必须过半才算成功，读可以走任意节点但可能读到旧数据</strong>。
          这一章把写广播、过半 commit、读的代价、以及 zxid 如何保证顺序讲透。
        </p>
      </Lead>

      <h2>写流程：转发 + 广播 + 过半 commit</h2>
      <p>
        ZooKeeper 的写请求只有 Leader 能处理。如果客户端连的是 Follower，那么这个写会被
        <strong>转发给 Leader</strong>。Leader 拿到写请求后，做的不是直接落地，而是发起一个
        <em>proposal</em>（提案），广播给所有 Follower。
      </p>
      <p>
        每个 Follower 收到 proposal 后把它写入本地事务日志，然后回一个 <em>ACK</em> 给 Leader。
        Leader 统计 ACK，<strong>只要超过半数节点（含自己）确认</strong>，就认为这次写「成功」了，
        于是广播一条 <em>commit</em>，各节点正式提交这个事务，写才对外可见。注意是「过半」而不是「全部」，
        所以个别 Follower 慢一点或暂时挂掉，并不会阻塞写。
      </p>
      <p>
        这套流程很像<strong>两阶段提交（2PC）的简化版</strong>：proposal 相当于「准备」阶段，commit 相当于「提交」阶段。
        但它比标准 2PC 更健壮——标准 2PC 要求所有参与者都 ACK 才提交，一个挂了就卡死；ZAB 只要<strong>过半</strong>
        就提交，天然容忍少数节点故障。把整条写请求的旅程拆开看：
      </p>
      <CodeBlock lang="text" title="一条写在集群里的完整旅程" code={twoPhaseDemo} />
      <p>
        这里有个性能命门：第 3、5 步要把事务<strong>fsync 到磁盘</strong>才能回 ACK（默认 <code>forceSync=yes</code>），
        所以磁盘 IO 直接决定写吞吐。生产上最常见的优化就是把事务日志单独放到 SSD，与快照分盘：
      </p>
      <CodeBlock lang="properties" title="事务日志落盘与分盘" code={fsyncDemo} />

      <Example title="写要过半，读可能旧">
        <p>三节点集群 zk1（Leader）、zk2、zk3，客户端向 zk1 写 <code>/config/color = blue</code>：</p>
        <ul>
          <li>zk1 广播 proposal 给 zk2、zk3。</li>
          <li>zk2 先回了 ACK，此时 zk1 + zk2 已经 2 票，过半（≥2）成立，写立即 commit 成功返回。</li>
          <li>而 zk3 可能因为网络稍慢，此刻还没提交这条数据。</li>
          <li>如果客户端紧接着去 zk3 读，就<strong>可能读到旧值</strong>，因为 zk3 还没追上。</li>
        </ul>
        <p>
          但要注意这个「旧」是有边界的：zk3 不会读到一个<strong>乱序</strong>或<strong>从未存在过</strong>的中间态，
          它只会停在某个历史一致点上——要么是写之前的状态，要么是写之后的状态，绝不会出现「a 的新值配 b 的旧值」
          这种撕裂。这正是顺序一致性给的保证：每个节点看到的都是同一条事务序列的某个前缀。
        </p>
      </Example>

      <QuorumWrite />

      <KeyIdea title="读为什么可能旧，怎么读到最新">
        <p>
          读请求<strong>不转发</strong>，直接由当前连接的节点用本地数据回答，所以读很快、可扩展。代价是：
          某个 Follower 的数据可能还没同步到最新，于是你会读到旧值。如果业务必须读到最新，
          可以先调用 <code>sync</code> 命令，它会让该节点先和 Leader 对齐，再执行读，从而读到最新数据。
          一句话：<strong>默认读快但可能旧，要最新就先 sync</strong>。
        </p>
        <p>
          <code>sync</code> 的原理：它让 Follower 给 Leader 发一个 sync 请求，Leader 把它排在自己的请求队列里，
          当这个 sync「流」到 Follower 时，意味着此前所有已提交事务都已到达该 Follower，此时再读就是最新。
          它本质是「读之前插一道屏障，等数据追平」。代价是这次读要多一次到 Leader 的往返，所以别无脑全加 sync——
          只在「写完必须立刻读到」的强一致读场景才用，绝大多数配置/服务发现场景容忍毫秒级滞后，根本不需要。
        </p>
      </KeyIdea>

      <h3>zxid 保证全局顺序</h3>
      <p>
        每个被 commit 的事务都有一个全局唯一且递增的编号 <em>zxid</em>。Leader 发起 proposal 时按 zxid 递增编号，
        所有节点回放事务也严格按 zxid 从小到大执行。这意味着：<strong>不会出现两个节点把同样两个写以不同顺序应用</strong>。
        客户端先发的写一定先生效、后发的后生效，这就是「顺序」的来源。
      </p>
      <CodeBlock lang="text" title="zxid 递增保证顺序" code={orderDemo} />
      <p>
        FIFO 也体现在单客户端层面：同一个客户端连接上发出的所有请求（读和写）都按发送顺序被处理，
        这叫<strong>客户端 FIFO 顺序</strong>。所以你可以放心地「先 create 父节点、再 create 子节点」连续发出，
        不用等前一个返回——ZooKeeper 保证按序执行。这是写并发代码时很好用的一个保证。
      </p>

      <Callout variant="warn" title="顺序一致 ≠ 线性一致">
        <p>
          很多人误以为 ZooKeeper 是线性一致（读总能读到最新已提交值）。实际上它只承诺：
        </p>
        <ul>
          <li><strong>顺序一致性</strong>：同一客户端的更新按发出顺序生效；所有更新有全局唯一顺序（zxid）。</li>
          <li>但<strong>不保证</strong>你随便连一个节点读就一定是最新——Follower 可能滞后。</li>
        </ul>
        <p>
          所以面试里说「ZooKeeper 是 CP、强一致」要补一句：它的强一致是<strong>写的强一致</strong>（过半才成功、
          有全局顺序），读默认是<strong>可能滞后</strong>的，要线性化读得靠 sync。别把它当线性一致系统乱用。
        </p>
        <p>
          对比 etcd：etcd 默认提供的是<strong>线性一致读</strong>（读会走一次 ReadIndex 与 Leader 确认），
          代价是读也有 Leader 往返、吞吐低于 ZK 的本地读；它也提供 <code>WithSerializable</code> 选项退化成本地读换吞吐。
          可见这是同一个权衡的两种默认选择：<strong>ZK 默认偏读吞吐、etcd 默认偏读一致</strong>。理解了这个，
          你就能解释「为什么 K8s 选 etcd」——它要 apiserver 读到的就是最新集群状态。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 读写流程」，标准答法：写只能 Leader 处理，连 Follower 会被转发；Leader 把写做成 proposal 广播，
        过半 Follower 回 ACK 后 commit，写才成功——所以慢节点不阻塞写。读直接由本地节点回答、不转发，因此快但可能读到旧数据，
        要最新先 sync。再点 zxid 全局递增保证所有节点回放顺序一致，故 ZooKeeper 是顺序一致性而非线性一致。
      </p>
      <p>
        高频追问：<strong>「过半 ACK 就返回，没 ACK 的节点丢数据吗？」</strong>——不丢，它们随后会收到 COMMIT
        或在重连/选举同步阶段追平。<strong>「写慢怎么优化？」</strong>——事务日志单独上 SSD、与快照分盘、
        减小单 znode 数据、降低写频率、用 Observer 卸载读。<strong>「sync 能保证之后所有读都最新吗？」</strong>——
        只保证这一次读看到了 sync 时刻前的全部已提交事务，是「这一刻」的快照对齐，不是永久线性化。
      </p>

      <Practice title="复现写后另一节点读">
        <p>
          连到一个 Follower 写入一个值，立刻连到另一个节点读，多试几次，观察是否偶尔读到旧值或读不到；
          再用 <code>sync</code> 强制对齐后读，确认一定读到最新：
        </p>
        <CodeBlock lang="bash" title="zkCli 写后读" code={writeDemo} />
        <p>
          把写和读放在脚本里高速循环执行，更容易在读端观察到「短暂滞后」的窗口，这就是顺序一致与线性一致的差别。
        </p>
        <p>
          进阶：用 <code>echo mntr | nc localhost 2181</code> 看 <code>zk_outstanding_requests</code>（积压请求数）和
          <code>zk_avg_latency</code>（平均延迟），在高速写循环下观察它们涨起来，直观感受写吞吐的瓶颈在哪。
        </p>
      </Practice>

      <Summary
        points={[
          '写只能由 Leader 处理，连到 Follower 的写会被转发给 Leader。',
          'Leader 把写做成 proposal 广播，过半节点回 ACK 后才 commit，写才算成功，所以慢节点不阻塞写。',
          '写流程像简化版 2PC（proposal=准备、commit=提交），但只需过半，比标准 2PC 更能容忍故障。',
          '事务要 fsync 落盘才回 ACK，磁盘 IO 是写吞吐命门：事务日志单独上 SSD、与快照分盘。',
          '读直接由当前连接的节点用本地数据回答、不转发，因此读快可扩展，但可能读到滞后的旧数据。',
          '要读到最新数据时先用 sync 让该节点与 Leader 对齐再读；sync 只对齐这一刻，别无脑全加。',
          'zxid 全局唯一且递增，加上客户端 FIFO 顺序，保证所有节点按同一顺序回放事务。',
          'ZooKeeper 是顺序一致性（写强一致），不是线性一致；etcd 默认线性一致读，是同一权衡的另一种选择。',
        ]}
      />
    </>
  )
}
