import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import QuorumWrite from '@/courses/zookeeper/illustrations/QuorumWrite.jsx'

const capTable = `CAP 三选二（分区 P 必选，只能在 C 和 A 之间取舍）：

注册中心选型对比：
              一致性(C)   可用性(A)   分区时的行为
ZooKeeper      强(CP)      牺牲       少数派不可写/不选举，整体不可用
Eureka         弱(AP)      保证       各分区继续提供服务，数据可能不一致
Nacos          可切换      可切换     默认 AP，也支持 CP（用于配置等场景）`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          面试聊到 ZooKeeper 几乎必问一句：<strong>它在 CAP 里是 CP 还是 AP？</strong>答案是 CP。
          这一章讲清 ZooKeeper 为什么选 CP、它如何从根上防脑裂，以及为什么正因为是 CP，
          它反而<strong>不太适合做对高可用要求极高的注册中心</strong>。
        </p>
      </Lead>

      <h2>CAP 简述</h2>
      <p>
        CAP 说的是分布式系统的三个属性：<em>一致性</em>（Consistency，所有节点看到一致的数据）、
        <em>可用性</em>（Availability，每个请求都能得到响应）、<em>分区容错</em>（Partition tolerance，网络分裂时系统仍能运行）。
        定理指出三者最多同时满足两个。而在真实网络里，分区 P 是必然会发生的、不能放弃，
        所以实际的取舍是<strong>在 C 和 A 之间二选一</strong>：要么保一致牺牲可用（CP），要么保可用牺牲一致（AP）。
      </p>

      <h2>ZooKeeper 选 CP</h2>
      <p>
        ZooKeeper 坚定地选 CP。它的逻辑是：<strong>宁可拒绝服务，也不返回不一致的数据</strong>。
        当网络发生分区，集群被切成几块，只有<strong>包含过半节点的那一块</strong>才能继续选举和写入；
        其余的少数派分区<strong>既不能写、也无法选出 Leader，进入不可用状态</strong>。这样就杜绝了
        「不同分区各写各的、数据冲突」的可能，代价就是牺牲了少数派那一侧的可用性。
      </p>

      <Example title="网络分区时 ZK 的取舍">
        <p>五节点集群 zk1~zk5，原 Leader 在 zk1。某时刻网络把集群切成两块：</p>
        <ul>
          <li>多数派一侧 zk1、zk2、zk3（3 个，过半），能正常选举/维持 Leader，<strong>继续提供读写</strong>。</li>
          <li>少数派一侧 zk4、zk5（2 个，不过半），<strong>选不出 Leader、不可写</strong>，对外拒绝写请求。</li>
          <li>于是绝不会出现两个分区各自有 Leader、各写各的的局面——一致性被保住了。</li>
          <li>网络恢复后，少数派与多数派对齐数据，重新加入集群。</li>
        </ul>
      </Example>

      <QuorumWrite />

      <KeyIdea title="过半机制从根上防脑裂">
        <p>
          <em>脑裂</em>（split-brain）指网络分区后出现两个都自认为是主、各自接受写入的「大脑」，
          导致数据分叉冲突。ZooKeeper 用<strong>过半 quorum</strong> 从数学上根除了它：
          一个 Leader 必须拿到过半节点支持才成立，而<strong>一个集群里不可能同时存在两个都过半的子集</strong>
          （两个超过一半的集合必然相交）。所以任何时刻最多只有一个分区能选出 Leader，
          天生<strong>不可能脑裂</strong>。这也是前一卷强调奇数台、过半的根本意义。
        </p>
      </KeyIdea>

      <h3>对比 Eureka / Nacos（AP）</h3>
      <p>
        Eureka 是典型的 AP 注册中心：分区时各节点照常对外提供注册和查询，宁可让你拿到<strong>可能过时的服务列表</strong>，
        也不让服务发现整体瘫痪——因为对注册中心来说，「拿到一个稍旧但能用的列表」往往比「直接不可用」更好。
        Nacos 则更灵活，默认 AP、也支持切到 CP。它们与 ZooKeeper 的根本分歧就在 CAP 的取舍上。
      </p>
      <CodeBlock lang="text" title="CP 与 AP 注册中心对比" code={capTable} />

      <Callout variant="warn" title="为什么 ZK 不适合做高可用注册中心">
        <p>
          正因为 ZooKeeper 是 CP，它做注册中心有个尴尬：
        </p>
        <ul>
          <li>Leader 宕机后<strong>选举期间整个集群不可用</strong>（虽是秒级，但确实有窗口），此间服务发现会受影响。</li>
          <li>少数派分区直接不可写，那一侧的服务即使健康也无法注册/续约。</li>
          <li>而注册中心最该保证的恰恰是<strong>高可用</strong>——读到稍旧的列表通常可以接受，整个发现机制挂掉才致命。</li>
        </ul>
        <p>
          所以业界普遍认为，对可用性要求极高的服务发现场景，AP 的 Eureka/Nacos 比 CP 的 ZooKeeper 更合适；
          ZooKeeper 更适合需要强一致的协调场景，比如分布式锁、选主、元数据管理。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 是 CP 还是 AP，为什么」：先说 CAP 中 P 必选、实际在 C 和 A 间取舍；ZooKeeper 选 CP，
        分区时少数派不可写、保一致牺牲可用。再点过半 quorum 从根上防脑裂（两个过半子集必相交，不可能两个 Leader）。
        最后升华一句：正因为是 CP，选举期间不可用，所以高可用要求极高的注册中心更适合用 AP 的 Eureka/Nacos，
        ZooKeeper 强项在强一致协调（锁、选主、元数据）。
      </p>

      <Practice title="选型对比清单（思考题）">
        <p>给自己一套场景，判断该选 CP 还是 AP，并说出理由：</p>
        <ul>
          <li>分布式锁 / 选主 / 唯一序列号——该选哪类？（提示：错一次就出大事，要强一致）</li>
          <li>大规模微服务的服务发现——该选哪类？（提示：宁可列表稍旧也不能整体挂）</li>
          <li>配置中心既要强一致又想高可用——能否两全？（提示：看 Nacos 的 CP/AP 可切换）</li>
        </ul>
        <p>
          再想一个问题：如果把一个 5 节点 ZooKeeper 切成 2 + 3，两侧分别能否写？为什么不可能两侧都能写？
          能用「两个过半集合必相交」答出来，就真正理解了 ZooKeeper 的 CP 与防脑裂。
        </p>
      </Practice>

      <Summary
        points={[
          'CAP 中分区 P 必然存在不能放弃，真实取舍是在一致性 C 与可用性 A 之间二选一。',
          'ZooKeeper 选 CP：分区时只有过半的多数派能写，少数派不可写、选不出 Leader，牺牲可用性保一致。',
          '过半 quorum 从数学上根除脑裂：两个过半子集必然相交，集群不可能同时存在两个 Leader。',
          'Eureka 是 AP（分区时仍提供可能过时的列表），Nacos 默认 AP 且支持切 CP，与 ZK 取舍相反。',
          'ZK 因 CP 在选举期间整体不可用、少数派不可写，所以高可用要求极高的注册中心更适合用 AP 方案。',
          'ZooKeeper 的强项是强一致协调（分布式锁、选主、元数据管理），别拿它硬扛高可用服务发现。',
        ]}
      />
    </>
  )
}
