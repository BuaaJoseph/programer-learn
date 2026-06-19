import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const zkCliCode = `# 启动单机版 ZooKeeper（解压后进入安装目录）
cp conf/zoo_sample.cfg conf/zoo.cfg   # 准备配置文件
./bin/zkServer.sh start               # 启动服务端
./bin/zkServer.sh status              # 查看状态：单机为 standalone

# 用自带客户端连上来（默认端口 2181）
./bin/zkCli.sh -server 127.0.0.1:2181`

const zkBasicOps = `# 在 zkCli 交互界面里操作 znode（用法很像文件系统）
create /app    hello        # 创建节点 /app，数据为 hello
get    /app                 # 读取 /app 的数据，返回 hello
set    /app    world        # 修改 /app 的数据为 world
ls     /                    # 列出根目录下的子节点
create /app/db jdbc:mysql   # 创建子节点 /app/db
delete /app/db              # 删除节点（必须先删空子节点）`

const zooCfgSample = `# conf/zoo.cfg —— 单机最小配置，每一行都值得理解
tickTime=2000          # 心跳基本时间单位（毫秒），session、选举超时都以它为基准
dataDir=/var/lib/zk    # 数据快照与 myid 文件存放目录（生产务必改到独立磁盘）
clientPort=2181        # 对客户端开放的端口
initLimit=10           # follower 启动后与 leader 初始同步的最长时间 = 10*tickTime
syncLimit=5            # 运行期 leader 与 follower 心跳超时 = 5*tickTime`

const watchDemo = `# watch 是「一次性」的：触发一次后就失效，必须重新注册
get -w /config        # 注册一个 watch，监听 /config 的数据变化
# 另一个客户端执行：
set /config v2        # 第一个客户端会收到 NodeDataChanged 事件
# 但如果紧接着再 set /config v3，第一个客户端不会再收到——因为 watch 已被消费`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一提到 <em>ZooKeeper</em>，很多人第一反应是「一个数据库」或者「一个缓存」。这是最常见的误会。
          ZooKeeper 不是用来存业务数据的，它是一个<strong>分布式协调服务</strong>：一群机器要协同干活时，
          总得有人帮它们「对表」——谁是主、配置改没改、谁上线了谁掉线了。ZooKeeper 干的就是这件事。
        </p>
      </Lead>

      <h2>它到底是什么</h2>
      <p>
        把 ZooKeeper 想成一个<strong>强一致的小型「公告栏」</strong>：所有节点存的数据都很小，
        但每个客户端看到的内容必须完全一致，而且谁改了公告栏，关心的人能立刻收到通知。
        它的核心能力可以拆成两半：一是<strong>强一致的小数据存储</strong>，二是<strong>变化通知</strong>（watch）。
        业务系统正是靠这两样东西，把「协调」这件难事外包给了 ZooKeeper。
      </p>
      <p>
        注意「小数据」这三个字：每个节点存的内容默认不超过 1MB，它存的是元数据、配置、状态标记，
        而不是订单、用户表这种业务数据。如果你拿它当数据库用，迟早会被这个限制和性能问题教做人。
      </p>
      <p>
        为什么要专门搞一个协调服务，而不是让业务系统自己协调？因为「在多台机器间达成一致」是分布式系统里
        最难、最容易出 bug 的一块。脑裂、超时、消息重复、时钟漂移……每一个都是深坑。与其让每个业务团队
        各自踩一遍，不如把这套通用难题抽出来，交给一个经过千锤百炼的中间件统一解决。这就是 ZooKeeper 的设计哲学：
        <strong>把分布式一致性这件脏活累活集中做对，让上层业务只面对一个简单的「公告栏」抽象</strong>。
      </p>

      <h3>典型用途</h3>
      <p>
        ZooKeeper 几乎是分布式系统的「瑞士军刀」，常见场景有这么几类：
      </p>
      <ul>
        <li><strong>注册中心</strong>：服务提供者把自己的地址写进 ZooKeeper，消费者来这里查可用的服务列表。</li>
        <li><strong>配置中心</strong>：把配置放在一个节点上，配置一改，所有客户端通过 watch 立刻感知并更新。</li>
        <li><strong>分布式锁</strong>：多台机器抢同一把锁，靠 ZooKeeper 的顺序节点来排队，谁排第一谁拿锁。</li>
        <li><strong>选主</strong>（leader election）：一堆对等节点选出一个 leader，主挂了能自动重新选。</li>
        <li><strong>命名服务</strong>：给资源分配全局唯一的名字或编号。</li>
      </ul>
      <p>
        这些场景看似五花八门，但拆到底层，依赖的都是同两个原语：<strong>有序、唯一的节点创建</strong>
        （顺序节点保证排队、临时节点保证存活感知）和<strong>事件通知</strong>（watch 保证变化能被及时发现）。
        把这两个原语吃透，上面所有用途你都能自己推导出来——这正是后面几章要带你做的事。
      </p>

      <Example title="Dubbo 用 ZooKeeper 做注册中心">
        <p>
          假设你有一个订单服务，部署了三台机器。每台机器启动时，都会在 ZooKeeper 里
          <code>/dubbo/订单服务/providers</code> 这个路径下，写一个带自己 IP 端口的节点。消费者要调用订单服务时，
          先到这个路径下 <code>ls</code> 一把，拿到三台机器的地址列表，再挑一台发起调用。
        </p>
        <p>
          妙处在于：当其中一台机器宕机，它在 ZooKeeper 里写的那个节点会<strong>自动消失</strong>
          （后面讲临时节点时会展开），ZooKeeper 随即通知消费者「列表变了」，消费者立刻把这台坏机器从候选里剔除。
          整个上下线过程不需要人工干预，这就是「协调」的价值。
        </p>
        <p>
          更细一点：消费者拿到列表后会在本地缓存一份，同时对 <code>/dubbo/订单服务/providers</code> 注册
          watch。一旦节点增删，ZooKeeper 推一个 <code>NodeChildrenChanged</code> 事件，消费者收到后重新
          <code>ls</code> 拉取最新全量列表并刷新本地缓存。注意这里有个关键设计：watch 只告诉你「变了」，
          不告诉你「变成什么」，所以收到事件后必须主动重新拉取——这也是为什么说 ZooKeeper 不能当 MQ 用。
        </p>
      </Example>

      <KeyIdea title="ZooKeeper 是 CP，不是 AP">
        <p>
          按 CAP 理论，ZooKeeper 选择了<strong>一致性（C）</strong>和<strong>分区容错（P）</strong>，
          牺牲了部分可用性（A）。也就是说：当集群发生网络分区、正在重新选主时，ZooKeeper 宁可
          <strong>短暂不可用</strong>（拒绝服务），也不会返回一份过期或不一致的数据给你。
          它的几个保证——顺序一致性、原子性（要么成功要么失败）、单一系统映像（任意客户端连任意节点看到的视图一致）、可靠性
          ——都是围绕「一致」这个核心建立的。
        </p>
        <p>
          这里要破除一个常见误解：ZooKeeper 的「强一致」准确说是<strong>线性一致写 + 顺序一致读</strong>。
          写操作经过 ZAB 协议保证全局唯一顺序、过半提交；但读操作默认是<strong>本地读</strong>，
          follower 直接返回自己内存里的数据，可能比 leader 稍微落后一点点（毫秒级）。
          如果业务要求「写完立刻读到」，需要在读之前调用 <code>sync()</code> 强制该节点追平 leader。
          后面讲读写流程时会专门展开这个细节。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把它当数据库 / 消息队列用">
        <p>三个新手最容易踩的坑：</p>
        <ul>
          <li><strong>存大数据</strong>——单节点超过 1MB 直接报错，它从设计上就不是为存业务数据准备的。</li>
          <li><strong>当 MQ 用</strong>——watch 是一次性的，丢「中间状态」很正常，它不保证「每条变更都不漏」，做消息队列必翻车。</li>
          <li><strong>高频写</strong>——所有写都要走一遍集群内的一致性协议，写吞吐有限，读多写少才是它的舒适区。</li>
        </ul>
        <p>
          watch 的「一次性」特别坑新手，单独演示一下：注册一次只能收到一次事件，之后必须重新注册，
          否则后续变更全部丢失。
        </p>
        <CodeBlock lang="bash" title="watch 是一次性的" code={watchDemo} />
      </Callout>

      <h2>它和 etcd / Consul 有什么区别</h2>
      <p>
        面试里很容易被追问「为什么不用 etcd」。三者都是 CP 的协调服务，但定位和实现各有侧重：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>ZooKeeper</th><th>etcd</th><th>Consul</th></tr>
        </thead>
        <tbody>
          <tr><td>一致性协议</td><td>ZAB</td><td>Raft</td><td>Raft</td></tr>
          <tr><td>数据模型</td><td>树形 znode</td><td>扁平 KV（带前缀）</td><td>KV + 服务目录</td></tr>
          <tr><td>变更通知</td><td>watch（一次性）</td><td>watch（流式、可持续）</td><td>blocking query</td></tr>
          <tr><td>典型生态</td><td>Hadoop/Kafka/Dubbo</td><td>Kubernetes</td><td>HashiCorp 全家桶</td></tr>
          <tr><td>客户端语言</td><td>Java 为主</td><td>gRPC 多语言友好</td><td>HTTP 多语言友好</td></tr>
        </tbody>
      </table>
      <p>
        一句话总结：<strong>老牌大数据生态（Hadoop、Kafka、HBase、Dubbo）选 ZooKeeper，
        云原生 / K8s 生态选 etcd</strong>。ZAB 和 Raft 思路相通（都是过半提交、强 leader），
        最大区别是 etcd 的 watch 是基于 MVCC revision 的流式订阅，能从某个历史版本开始拿到所有变更、不漏事件，
        而 ZooKeeper 的 watch 是一次性的——这是新手做技术选型时最该记住的差异。
      </p>

      <h2>谁在用它</h2>
      <p>
        ZooKeeper 是分布式中间件的「基础设施」，一大批知名系统都依赖它：<strong>Dubbo</strong> 用它做注册中心，
        <strong>Kafka</strong>（早期版本）用它管理 broker 元数据和 controller 选举，<strong>HBase</strong> 用它做
        Master 选举和 RegionServer 的存活监控，Hadoop、Solr 等也都有它的身影。
        理解 ZooKeeper，相当于拿到了读懂这些系统协调层的钥匙。
      </p>
      <p>
        值得一提的是 Kafka 的演进：从 2.8 版本开始，Kafka 推出了 KRaft 模式，用自带的 Raft 实现替换掉 ZooKeeper，
        3.x 之后逐步成为默认。这并不意味着 ZooKeeper 过时了，而是说明<strong>「自带协调层」是大型系统的一种趋势</strong>
        ——减少外部依赖、简化部署。但在 Dubbo、HBase、Hadoop 这些场景里，ZooKeeper 仍是事实标准。
        面试时能讲出这个演进，会让面试官觉得你不是只背了几年前的八股。
      </p>

      <h2>先建立一张全局心智图</h2>
      <p>
        在开始敲命令之前，先把 ZooKeeper 的几个核心概念串成一张图，后面每一章都是在给这张图填细节：
      </p>
      <ul>
        <li><strong>znode</strong>：数据节点，组成一棵树，是存储的基本单位（第 2 章）。</li>
        <li><strong>watch</strong>：客户端对 znode 注册的一次性监听，节点变化时收到事件通知。</li>
        <li><strong>session</strong>：客户端与集群的会话，临时节点的生死跟着 session 走（第 3 章）。</li>
        <li><strong>集群角色</strong>：Leader（处理写）、Follower（处理读、参与投票）、Observer（只读、不投票）。</li>
        <li><strong>ZAB 协议</strong>：保证写操作在集群内有序、过半提交的一致性协议（第二卷）。</li>
      </ul>
      <p>
        记住这条主线：<strong>客户端通过 session 连上集群，在 znode 树上读写数据，用 watch 感知变化，
        而 ZAB 协议在背后保证所有写都被全集群一致地、按相同顺序应用</strong>。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「ZooKeeper 是什么」，别上来就背命令。先一句话定性：
        <strong>它是一个 CP 的分布式协调服务，提供强一致的小数据存储和一次性的变化通知</strong>。
        然后顺势举一个例子——比如 Dubbo 用它做注册中心，临时节点 + watch 实现服务的自动上下线。
        最后补一句它的边界：不是数据库、不是 MQ、单节点 ≤ 1MB、适合读多写少。
        这样定位、例子、边界三件套说全，面试官就知道你是真懂而不是背的。
      </p>
      <p>
        常见追问与误区，提前准备好：
      </p>
      <ul>
        <li><strong>「ZooKeeper 保证强一致，那读到的一定是最新的吗？」</strong>——不一定。默认本地读可能略有延迟，
          要最新得先 <code>sync()</code>。这个坑答对了直接拉开和其他候选人的差距。</li>
        <li><strong>「它和 Redis 分布式锁有什么区别？」</strong>——ZooKeeper 锁基于临时顺序节点 + watch，
          天然避免惊群、客户端崩溃锁自动释放（session 过期）；Redis 锁靠 TTL，存在锁误删、续期等问题。</li>
        <li><strong>「集群要部署几台？」</strong>——奇数台（3、5、7），因为过半才能写，奇数台在容错能力相同的前提下更省机器。
          这点第二卷讲选举时会算清楚。</li>
      </ul>

      <Practice title="装一个、连上去、敲几条命令">
        <p>
          先把单机版 ZooKeeper 跑起来。从官网下载二进制包解压后，复制一份示例配置就能启动：
        </p>
        <CodeBlock lang="bash" title="启动并连接 ZooKeeper" code={zkCliCode} />
        <p>
          顺便看一眼那份配置文件，每个参数后面章节都会用到，现在先混个眼熟：
        </p>
        <CodeBlock lang="ini" title="zoo.cfg 最小配置" code={zooCfgSample} />
        <p>
          连上之后，用自带的 <code>zkCli</code> 把增删改查这套基本命令都过一遍，建立对 znode 树的直观感受：
        </p>
        <CodeBlock lang="bash" title="zkCli 基本命令" code={zkBasicOps} />
        <p>
          多敲几次 <code>ls /</code> 和 <code>get</code>，注意 <code>get</code> 除了返回数据，还会带出一串
          stat 信息（版本号、时间戳等），这些下一章讲数据模型时会派上大用场。
        </p>
      </Practice>

      <Summary
        points={[
          'ZooKeeper 不是数据库，而是分布式协调服务：核心是「强一致的小数据存储 + 变化通知（watch）」。',
          '典型用途：注册中心、配置中心、分布式锁、选主、命名服务，本质都是帮多台机器「对表」。',
          '它是 CP 系统：优先保证一致性，重新选主时宁可短暂不可用，也不返回不一致的数据。',
          '强一致 = 线性一致写 + 顺序一致读，默认本地读可能略滞后，要最新得先 sync()。',
          '四大保证：顺序一致性、原子性、单一系统映像、可靠性，每个客户端看到的视图都相同。',
          '单节点数据 ≤ 1MB，读多写少，别拿它当数据库、消息队列或高频写存储。',
          'Dubbo、Kafka（早期）、HBase 等大量中间件都依赖它；Kafka 已用 KRaft 逐步替换 ZK。',
          '同类对比：ZK 用 ZAB、树形模型、一次性 watch；etcd 用 Raft、KV 模型、流式 watch，是云原生首选。',
        ]}
      />
    </>
  )
}
