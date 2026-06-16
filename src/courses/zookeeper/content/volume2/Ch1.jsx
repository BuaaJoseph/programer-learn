import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ZabElection from '@/courses/zookeeper/illustrations/ZabElection.jsx'

const serverConfig = `# zoo.cfg（每台机器一份，内容相同）
tickTime=2000
dataDir=/var/lib/zookeeper
clientPort=2181
initLimit=10
syncLimit=5

# 集群成员列表：server.<myid>=<host>:<数据同步端口>:<选举端口>
server.1=zk1:2888:3888
server.2=zk2:2888:3888
server.3=zk3:2888:3888`

const myidFile = `# 在每台机器的 dataDir 下放一个 myid 文件
# zk1 上：
echo 1 > /var/lib/zookeeper/myid
# zk2 上：
echo 2 > /var/lib/zookeeper/myid
# zk3 上：
echo 3 > /var/lib/zookeeper/myid

# 查看本节点角色（leader / follower）
echo stat | nc localhost 2181 | grep Mode`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          ZooKeeper 是个集群，但任何时刻只有一个节点说了算，这个节点叫 <em>Leader</em>。一旦 Leader 宕机，
          集群必须在极短时间内重新选出一个新 Leader，否则整个服务就不可写。撑起这套机制的，正是
          <em>ZAB</em>（ZooKeeper Atomic Broadcast）协议。这一章讲清楚 ZAB 是什么、Leader 怎么选出来。
        </p>
      </Lead>

      <h2>ZAB 的两种模式</h2>
      <p>
        ZAB 协议在两种模式之间来回切换。一种是<strong>崩溃恢复</strong>（crash recovery）：集群刚启动、
        或者 Leader 挂了的时候，进入这个模式选出新 Leader 并把各节点的数据对齐到一致。另一种是
        <strong>消息广播</strong>（message broadcast）：选好 Leader、数据对齐完成后，集群进入正常工作状态，
        Leader 把写请求以广播的方式同步给所有 Follower。
      </p>
      <p>
        简单记：没有 Leader 或数据不一致时就走崩溃恢复，恢复完毕、超过半数节点与 Leader 完成同步后，
        就切到消息广播对外提供服务。下一章讲的过半写成功，就是消息广播模式里的事。
      </p>

      <h3>三种角色</h3>
      <p>
        ZooKeeper 集群里的节点分三种角色。<em>Leader</em>：唯一能处理写请求的节点，负责发起提案并广播。
        <em>Follower</em>：参与选举和投票、处理读请求、把写请求转发给 Leader。<em>Observer</em>：
        只读不投票，用来扩展读性能而不影响选举的过半计算——加再多 Observer 也不改变集群对「过半」的判定。
      </p>

      <h3>选举依据：epoch 和 zxid</h3>
      <p>
        选 Leader 不是随便选，而是要选出<strong>数据最新</strong>的那个节点当主，否则会丢数据。判断谁更新，
        靠两个值。<em>epoch</em>：可以理解成「第几届 Leader 任期」，每次新选举都会让 epoch 加一，
        epoch 大的更新。<em>zxid</em>：每个事务的全局递增编号，<strong>zxid 越大代表数据越新</strong>。
        其实 zxid 是 64 位整数，高 32 位就是 epoch、低 32 位是该任期内的递增计数，所以比 zxid 一个值即可。
      </p>
      <p>
        选举时每个节点的投票内容是「我认为谁该当 Leader」，比较规则是：先比 epoch，epoch 大者胜；
        epoch 相同比 zxid，zxid 大者胜；zxid 还相同就比 <em>myid</em>（机器编号），myid 大者胜。
      </p>

      <Example title="Leader 宕机，秒级选出新主">
        <p>
          假设有三台机器 zk1、zk2、zk3，当前 Leader 是 zk1。某一刻 zk1 进程崩溃：
        </p>
        <ul>
          <li>zk2、zk3 发现与 Leader 的心跳断了，立刻从消息广播模式切回崩溃恢复模式，发起新一轮选举。</li>
          <li>两者互相交换投票，比较 zxid：假设 zk3 的 zxid 更大（数据更新），那么 zk2 改投 zk3。</li>
          <li>zk3 获得 2 票，达到过半（3 台过半是 2 票），当选新 Leader，epoch 加一。</li>
          <li>新 Leader 把数据同步给 Follower，集群重新进入消息广播模式，整个过程通常在秒级完成。</li>
        </ul>
      </Example>

      <ZabElection />

      <KeyIdea title="为什么 zxid 最大的当 Leader">
        <p>
          因为新 Leader 当选后会以自己的数据为基准，把其他节点对齐过来。如果选了一个数据落后的节点当 Leader，
          那些它没有、而别人有的最新事务就会被<strong>覆盖丢失</strong>。所以 ZAB 强制选 zxid 最大者，
          本质是保证<strong>已经被过半节点确认的写不会丢</strong>，这是整个一致性的地基。
        </p>
      </KeyIdea>

      <h3>FastLeaderElection 快速选举</h3>
      <p>
        现在 ZooKeeper 默认用的选举算法叫 <em>FastLeaderElection</em>。它的核心思路是：每个节点先投自己，
        然后把投票广播出去；收到别人的投票后，按上面「epoch &gt; zxid &gt; myid」的规则比较，
        如果对方的候选比自己手里的更优，就改投对方并再次广播。这样投票会不断向「最优候选」收敛，
        一旦某个候选拿到过半票，选举立即结束，故名「快速」。
      </p>

      <Callout variant="warn" title="集群为什么推荐奇数台">
        <p>
          ZooKeeper 的可用与选举都依赖<strong>过半</strong>（quorum）。过半的含义是：要正常工作，
          存活节点必须严格大于总数的一半。来算一笔账：
        </p>
        <ul>
          <li>3 台：过半是 2，能容忍挂 1 台。</li>
          <li>4 台：过半是 3，也只能容忍挂 1 台——多花一台机器，容错能力却没提升。</li>
          <li>5 台：过半是 3，能容忍挂 2 台。</li>
        </ul>
        <p>
          所以从「容错性价比」看，偶数台是浪费；而且偶数台在网络对半分区时更容易两边都凑不齐过半导致整体不可用。
          因此生产环境一律推荐 <strong>3、5、7</strong> 这样的奇数台。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问到「ZooKeeper 怎么选 Leader」，可以这样组织：先说 ZAB 有崩溃恢复和消息广播两种模式，选举发生在崩溃恢复阶段；
        再说选举依据是数据最新，比较顺序 epoch &gt; zxid &gt; myid，zxid 大代表数据新，必须选最新的当主才不丢数据；
        然后点出算法是 FastLeaderElection，靠不断改投最优候选加过半票快速收敛；最后补一句集群推荐奇数台、因为过半机制。
        能把「为什么选 zxid 最大」讲明白，基本就过关了。
      </p>

      <Practice title="搭一个三节点集群">
        <p>
          准备三台机器（或三个不同端口的实例），每台一份相同的 <code>zoo.cfg</code>，列出全部 server 成员：
        </p>
        <CodeBlock lang="properties" title="zoo.cfg" code={serverConfig} />
        <p>
          再给每台机器在 <code>dataDir</code> 下写一个 <code>myid</code> 文件，内容就是该机器在配置里的编号，
          启动后用命令查看谁是 Leader：
        </p>
        <CodeBlock lang="bash" title="myid 与查看角色" code={myidFile} />
        <p>
          启动后试着把 Leader 进程 kill 掉，观察日志，你会看到剩下两台立刻重新选举并选出新 Leader。
        </p>
      </Practice>

      <Summary
        points={[
          'ZAB 协议有崩溃恢复和消息广播两种模式：选举与数据对齐在崩溃恢复阶段，正常对外服务在消息广播阶段。',
          '集群三种角色：Leader 处理写并广播，Follower 投票/读/转发写，Observer 只读不投票仅扩展读性能。',
          '选举比较顺序是 epoch > zxid > myid，zxid 越大代表数据越新，必须选数据最新者当 Leader 才不丢数据。',
          '默认算法 FastLeaderElection：先投自己再广播，遇到更优候选就改投，过半票即收敛，故称快速选举。',
          '集群依赖过半（quorum）才能工作，推荐 3/5/7 奇数台，偶数台浪费机器且分区时更易整体不可用。',
          '记住一句话：ZooKeeper 任意时刻只有一个 Leader 负责写，Leader 挂了秒级重选，靠 ZAB 保证不丢已确认的写。',
        ]}
      />
    </>
  )
}
