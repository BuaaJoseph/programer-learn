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

      <Example title="写要过半，读可能旧">
        <p>三节点集群 zk1（Leader）、zk2、zk3，客户端向 zk1 写 <code>/config/color = blue</code>：</p>
        <ul>
          <li>zk1 广播 proposal 给 zk2、zk3。</li>
          <li>zk2 先回了 ACK，此时 zk1 + zk2 已经 2 票，过半（≥2）成立，写立即 commit 成功返回。</li>
          <li>而 zk3 可能因为网络稍慢，此刻还没提交这条数据。</li>
          <li>如果客户端紧接着去 zk3 读，就<strong>可能读到旧值</strong>，因为 zk3 还没追上。</li>
        </ul>
      </Example>

      <QuorumWrite />

      <KeyIdea title="读为什么可能旧，怎么读到最新">
        <p>
          读请求<strong>不转发</strong>，直接由当前连接的节点用本地数据回答，所以读很快、可扩展。代价是：
          某个 Follower 的数据可能还没同步到最新，于是你会读到旧值。如果业务必须读到最新，
          可以先调用 <code>sync</code> 命令，它会让该节点先和 Leader 对齐，再执行读，从而读到最新数据。
          一句话：<strong>默认读快但可能旧，要最新就先 sync</strong>。
        </p>
      </KeyIdea>

      <h3>zxid 保证全局顺序</h3>
      <p>
        每个被 commit 的事务都有一个全局唯一且递增的编号 <em>zxid</em>。Leader 发起 proposal 时按 zxid 递增编号，
        所有节点回放事务也严格按 zxid 从小到大执行。这意味着：<strong>不会出现两个节点把同样两个写以不同顺序应用</strong>。
        客户端先发的写一定先生效、后发的后生效，这就是「顺序」的来源。
      </p>
      <CodeBlock lang="text" title="zxid 递增保证顺序" code={orderDemo} />

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
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 读写流程」，标准答法：写只能 Leader 处理，连 Follower 会被转发；Leader 把写做成 proposal 广播，
        过半 Follower 回 ACK 后 commit，写才成功——所以慢节点不阻塞写。读直接由本地节点回答、不转发，因此快但可能读到旧数据，
        要最新先 sync。再点 zxid 全局递增保证所有节点回放顺序一致，故 ZooKeeper 是顺序一致性而非线性一致。
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
      </Practice>

      <Summary
        points={[
          '写只能由 Leader 处理，连到 Follower 的写会被转发给 Leader。',
          'Leader 把写做成 proposal 广播，过半节点回 ACK 后才 commit，写才算成功，所以慢节点不阻塞写。',
          '读直接由当前连接的节点用本地数据回答、不转发，因此读快可扩展，但可能读到滞后的旧数据。',
          '要读到最新数据时先用 sync 让该节点与 Leader 对齐，再执行读。',
          'zxid 全局唯一且递增，保证所有节点按同一顺序回放事务，是顺序一致性的根基。',
          'ZooKeeper 是顺序一致性（写强一致、有全局顺序），不是线性一致，别当成随便读都最新的系统。',
        ]}
      />
    </>
  )
}
