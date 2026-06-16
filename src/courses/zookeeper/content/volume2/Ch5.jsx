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

const quorumMath = `# 为什么「两个过半子集必相交」——脑裂不可能的数学证明
# 设集群 N 台，过半 = floor(N/2) + 1
#
# N=5  -> 过半=3。把 5 切成两块，最大也只能是 3+2。
#   3 那块过半(可工作)，2 那块不过半(拒绝服务)。
#   不存在「两块都 >=3」的切法，因为 3+3=6 > 5。
#
# 推广：若两个子集 A、B 都过半，则 |A|+|B| > N，
#   按容斥原理它们必有公共节点，而一个节点不可能同时
#   投票给两个不同的 Leader -> 所以最多一个 Leader。`

const observerCap = `# 跨机房部署的 CAP 取舍：用 Observer 缓解可用性，但不改变 CP 本质
机房A(主): zk1 zk2 zk3   <- 投票节点都在这，过半在这选主
机房B(备): zk4(observer) zk5(observer)  <- 只读副本，就近读，不投票

# 好处：机房B 的客户端能就近低延迟读
# 代价：机房A 整体挂了，机房B 因没有投票节点，无法选主 -> 仍不可写
# 想两机房都能独立工作，得上多集群 + 数据同步，那是另一套架构`

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
      <p>
        多补一句常被忽略的精确性：CAP 里的「一致性」特指<strong>线性一致性</strong>，而前面讲过 ZooKeeper 默认是
        顺序一致（本地读可能滞后）。所以严谨地说 ZooKeeper 是「写线性一致 + 读顺序一致」的 CP 系统，
        要线性化读得 sync。这不影响它「分区时保一致牺牲可用」的 CP 定位，但能让你的回答经得起追问。
        另外现实中更实用的是 <strong>PACELC</strong>：分区时（P）在 A/C 间取舍，不分区时（E）在延迟（L）和一致（C）间取舍——
        ZooKeeper 是 PC/EC（不分区时也偏一致），etcd 同理，而很多 AP 系统是 PA/EL。
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
        <p>
          还有个更隐蔽的边界：如果原 Leader zk1 落在了<strong>少数派</strong>一侧呢？此时 zk1 虽自认是主，但它收不到
          过半的心跳/ack，无法 commit 任何新写，等于<strong>自动降级</strong>；而多数派 zk2、zk3、zk4、zk5（假设这样切）
          会发现失联、重新选出新主。等网络恢复，老 Leader zk1 看到更高的 epoch，主动放弃主身份、按新 Leader 的数据对齐。
          「用 epoch（任期号）让旧主自动失效」正是 ZAB/Raft 这类协议防止旧主作乱的核心招数。
        </p>
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
        <CodeBlock lang="text" title="两个过半子集必相交（防脑裂证明）" code={quorumMath} />
      </KeyIdea>

      <h3>对比 Eureka / Nacos（AP）</h3>
      <p>
        Eureka 是典型的 AP 注册中心：分区时各节点照常对外提供注册和查询，宁可让你拿到<strong>可能过时的服务列表</strong>，
        也不让服务发现整体瘫痪——因为对注册中心来说，「拿到一个稍旧但能用的列表」往往比「直接不可用」更好。
        Nacos 则更灵活，默认 AP、也支持切到 CP。它们与 ZooKeeper 的根本分歧就在 CAP 的取舍上。
      </p>
      <CodeBlock lang="text" title="CP 与 AP 注册中心对比" code={capTable} />
      <p>
        顺带把同为 CP 的 <strong>etcd</strong> 放进来对照：etcd 用 Raft、默认线性一致读，定位和 ZooKeeper 几乎重合，
        都是 CP 的协调服务。但在 Kubernetes 里 etcd 做的是<strong>集群状态的唯一真相源</strong>（存的是期望状态，
        必须强一致），而不是「面向海量微服务的服务发现」——这正说明 CP 系统适合「元数据/状态强一致」，
        AP 系统适合「大规模、可容忍稍旧的服务发现」。选型不是比谁更先进，而是匹配场景对 C 还是 A 的偏好。
      </p>

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
        <p>
          实战缓解（而非根治）的办法：客户端<strong>本地缓存上次的服务列表</strong>，ZK 短暂不可用时仍用缓存兜底；
          跨机房用 Observer 就近读但不改变 CP 本质。下面这个跨机房例子能帮你看清「Observer 缓解了读可用，
          但救不了写可用」：
        </p>
        <CodeBlock lang="text" title="跨机房 Observer 的取舍" code={observerCap} />
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 是 CP 还是 AP，为什么」：先说 CAP 中 P 必选、实际在 C 和 A 间取舍；ZooKeeper 选 CP，
        分区时少数派不可写、保一致牺牲可用。再点过半 quorum 从根上防脑裂（两个过半子集必相交，不可能两个 Leader）。
        最后升华一句：正因为是 CP，选举期间不可用，所以高可用要求极高的注册中心更适合用 AP 的 Eureka/Nacos，
        ZooKeeper 强项在强一致协调（锁、选主、元数据）。
      </p>
      <p>
        高频追问：<strong>「ZK 的 C 是线性一致吗？」</strong>——写线性一致、读默认顺序一致（要 sync 才线性化），
        答这个能体现严谨。<strong>「旧 Leader 在少数派会乱写吗？」</strong>——不会，它 commit 不了、靠 epoch 自动降级。
        <strong>「ZK 和 etcd 都是 CP，区别在哪、为什么 K8s 用 etcd？」</strong>——etcd Raft、默认线性读、gRPC 多语言友好、
        是 K8s 集群状态真相源；ZK 更偏老牌大数据生态。能把这些串起来，CAP 这道题就答到顶了。
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
        <p>
          进阶思考题：把集群切成 1+1+3 三个分区，哪一侧能工作？再想——如果你把集群从 5 台扩到 6 台，
          容错能力（能挂几台）有没有变化？算完你就彻底理解了为什么推荐奇数台。
        </p>
      </Practice>

      <Summary
        points={[
          'CAP 中分区 P 必然存在不能放弃，真实取舍是在一致性 C 与可用性 A 之间二选一。',
          'CAP 的 C 指线性一致；ZK 是写线性一致+读顺序一致的 CP，更实用的框架是 PACELC（ZK 为 PC/EC）。',
          'ZooKeeper 选 CP：分区时只有过半的多数派能写，少数派不可写、选不出 Leader，牺牲可用性保一致。',
          '过半 quorum 从数学上根除脑裂：两个过半子集必然相交，集群不可能同时存在两个 Leader。',
          '旧 Leader 落入少数派会因 commit 不了而自动降级，靠 epoch（任期号）在恢复后让位，绝不乱写。',
          'Eureka 是 AP，Nacos 默认 AP 可切 CP；etcd 同为 CP，是 K8s 集群状态真相源，与 ZK 定位相近。',
          'ZK 因 CP 在选举期间整体不可用、少数派不可写，高可用服务发现更适合 AP；可用本地缓存兜底缓解。',
          'ZooKeeper 的强项是强一致协调（分布式锁、选主、元数据管理），别拿它硬扛高可用服务发现。',
        ]}
      />
    </>
  )
}
