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
      </Example>

      <KeyIdea title="ZooKeeper 是 CP，不是 AP">
        <p>
          按 CAP 理论，ZooKeeper 选择了<strong>一致性（C）</strong>和<strong>分区容错（P）</strong>，
          牺牲了部分可用性（A）。也就是说：当集群发生网络分区、正在重新选主时，ZooKeeper 宁可
          <strong>短暂不可用</strong>（拒绝服务），也不会返回一份过期或不一致的数据给你。
          它的几个保证——顺序一致性、原子性（要么成功要么失败）、单一系统映像（任意客户端连任意节点看到的视图一致）、可靠性
          ——都是围绕「一致」这个核心建立的。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把它当数据库 / 消息队列用">
        <p>三个新手最容易踩的坑：</p>
        <ul>
          <li><strong>存大数据</strong>——单节点超过 1MB 直接报错，它从设计上就不是为存业务数据准备的。</li>
          <li><strong>当 MQ 用</strong>——watch 是一次性的，丢「中间状态」很正常，它不保证「每条变更都不漏」，做消息队列必翻车。</li>
          <li><strong>高频写</strong>——所有写都要走一遍集群内的一致性协议，写吞吐有限，读多写少才是它的舒适区。</li>
        </ul>
      </Callout>

      <h2>谁在用它</h2>
      <p>
        ZooKeeper 是分布式中间件的「基础设施」，一大批知名系统都依赖它：<strong>Dubbo</strong> 用它做注册中心，
        <strong>Kafka</strong>（早期版本）用它管理 broker 元数据和 controller 选举，<strong>HBase</strong> 用它做
        Master 选举和 RegionServer 的存活监控，Hadoop、Solr 等也都有它的身影。
        理解 ZooKeeper，相当于拿到了读懂这些系统协调层的钥匙。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「ZooKeeper 是什么」，别上来就背命令。先一句话定性：
        <strong>它是一个 CP 的分布式协调服务，提供强一致的小数据存储和一次性的变化通知</strong>。
        然后顺势举一个例子——比如 Dubbo 用它做注册中心，临时节点 + watch 实现服务的自动上下线。
        最后补一句它的边界：不是数据库、不是 MQ、单节点 ≤ 1MB、适合读多写少。
        这样定位、例子、边界三件套说全，面试官就知道你是真懂而不是背的。
      </p>

      <Practice title="装一个、连上去、敲几条命令">
        <p>
          先把单机版 ZooKeeper 跑起来。从官网下载二进制包解压后，复制一份示例配置就能启动：
        </p>
        <CodeBlock lang="bash" title="启动并连接 ZooKeeper" code={zkCliCode} />
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
          '四大保证：顺序一致性、原子性、单一系统映像、可靠性，每个客户端看到的视图都相同。',
          '单节点数据 ≤ 1MB，读多写少，别拿它当数据库、消息队列或高频写存储。',
          'Dubbo、Kafka、HBase 等大量中间件都依赖它，是分布式系统协调层的基础设施。',
        ]}
      />
    </>
  )
}
