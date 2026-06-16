import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const ephemeralCode = `# 创建一个临时节点（-e = ephemeral）
create -e /servers/node1 192.168.1.10:8080

# 它只在当前会话存活。退出这个 zkCli（quit）或会话超时后，
# 重新连上来 ls /servers，会发现 /node1 已经自动消失了`

const seqCode = `# 创建顺序节点（-s = sequential），ZooKeeper 自动追加 10 位编号
create -s /lock/req- ''
# 返回：Created /lock/req-0000000000
create -s /lock/req- ''
# 返回：Created /lock/req-0000000001  <- 编号自增

# 临时 + 顺序可以叠加：分布式锁排队的标配
create -e -s /lock/req- ''`

const sessionStateCode = `// 客户端 session 的状态机（Java 客户端的 Watcher 会收到这些事件）
CONNECTING       // 正在连接 / 重连
CONNECTED        // 已连上某台服务端，心跳正常
SUSPENDED        // 连接暂时断开，正在尝试重连（session 还没过期）
RECONNECTED      // 重连成功，session 还活着，临时节点都还在
EXPIRED          // 服务端已判定 session 过期，临时节点已被删，需重建一切

// 关键：SUSPENDED 不等于 EXPIRED！
// 抖一下重连成功(RECONNECTED)，你的锁/注册节点都还在；
// 只有真正 EXPIRED 才意味着「一切归零」，必须重新注册、重新抢锁。`

const sessionMoveCode = `# session 是可以「漂移」的：客户端断线后能连到集群里另一台服务端
# 而 session 依然有效——因为 session 信息在集群内是被复制的（过半同步）。
#
# 续约逻辑（客户端自动做，无需你手写）：
#   - 每隔 sessionTimeout/3 发一次 ping 续约
#   - 连接断了，在 sessionTimeout 内不停换服务端重连
#   - 只要在超时窗口内连上任意一台，session 就保住了`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章讲了 znode 怎么存数据、watch 怎么通知。但还有个问题没解决：服务器宕机后，它在注册中心留下的节点
          凭什么会「自动消失」？答案藏在 <em>znode</em> 的<strong>类型</strong>和 <em>session</em>（会话）这两个概念里。
          这一章把它讲透，你就明白注册中心和分布式锁底层的「魔法」是怎么来的了。
        </p>
      </Lead>

      <h2>四种 znode 类型</h2>
      <p>
        创建 znode 时，你要选它的「类型」，组合自两个维度——<strong>是否持久</strong>、<strong>是否带顺序编号</strong>，
        于是有四种：
      </p>
      <ul>
        <li><strong>持久节点</strong>（PERSISTENT）：创建后一直存在，直到被显式删除。最普通的一种。</li>
        <li><strong>临时节点</strong>（EPHEMERAL）：和创建它的<strong>会话绑定</strong>，会话一结束，节点自动删除。</li>
        <li><strong>持久顺序节点</strong>（PERSISTENT_SEQUENTIAL）：持久 + ZooKeeper 自动在名字后追加一个全局自增编号。</li>
        <li><strong>临时顺序节点</strong>（EPHEMERAL_SEQUENTIAL）：临时 + 自增编号，分布式锁排队的主力。</li>
      </ul>
      <p>
        除了这四种经典类型，3.5+ 还引入了 <strong>容器节点</strong>（Container）和 <strong>TTL 节点</strong>。
        容器节点在最后一个子节点被删除后会被服务端后台线程自动清理，专为「父节点是临时性的命名空间」设计
        （比如 Curator 的锁父目录），省得你手动删空目录。TTL 节点则是持久节点带一个存活时长，到期无子节点且无修改就被回收。
        面试基础题只考四种，但能补一句容器/TTL 会显得你对版本演进有跟进。
      </p>

      <h3>顺序节点：编号是全局自增的</h3>
      <p>
        创建顺序节点时，你给个前缀比如 <code>/lock/req-</code>，ZooKeeper 会自动在后面补一个 10 位、左侧补零的编号，
        生成 <code>/lock/req-0000000000</code>、<code>/lock/req-0000000001</code>……这个编号<strong>由 ZooKeeper 保证单调递增、全局唯一</strong>，
        谁先创建谁的编号小。后面讲分布式锁时，「谁排第一谁拿锁」就是靠比较这个编号。
      </p>
      <p>
        编号到底从哪来？它取自<strong>父节点的 cversion 计数器</strong>（实际实现是父节点维护的一个递增计数），
        由 leader 串行分配，因此即便上万客户端并发创建，编号也绝不重复、严格有序。一个边界细节：编号是 32 位整数，
        理论上会溢出（约 21 亿次后变负），但绝大多数业务远到不了；真要担心，定期换一个全新的父目录即可。
      </p>

      <h2>session：客户端与服务端的「连接生命线」</h2>
      <p>
        客户端连上 ZooKeeper 时会建立一个 <em>session</em>（会话），它有一个<strong>超时时间</strong>（sessionTimeout）。
        客户端会周期性地发<strong>心跳</strong>（ping）告诉服务端「我还活着」。只要心跳正常，会话就一直有效；
        一旦客户端宕机、网络断开，心跳停了，服务端在超时时间内收不到心跳，就判定这个会话<strong>过期</strong>（expired），随即关闭它。
      </p>
      <p>
        session 的状态远不止「活」和「死」两种，理解中间态是写对生产代码的关键：
      </p>
      <CodeBlock lang="java" title="session 状态机" code={sessionStateCode} />
      <p>
        还有一个常被忽略的特性：<strong>session 可以在服务端之间「漂移」</strong>。客户端连的那台服务端挂了，
        客户端会自动去连集群里另一台，而 session 依然有效——因为 session 元信息（id、超时、关联的临时节点）
        在集群内是被过半复制的。这正是 ZooKeeper 高可用的体现：单台服务端宕机不影响你的会话和临时节点。
      </p>
      <CodeBlock lang="bash" title="session 续约与漂移" code={sessionMoveCode} />
      <p>
        还有个细节：实际的 sessionTimeout 是客户端请求值与服务端 <code>[minSessionTimeout, maxSessionTimeout]</code>
        范围协商后的结果（默认 <code>2*tickTime</code> 到 <code>20*tickTime</code>）。你在客户端设 50ms，服务端也会把它
        抬到下限，所以「设得太小」未必真生效，但「设得太大」会让故障感知变慢——这是个需要权衡的旋钮。
      </p>

      <KeyIdea title="临时节点 = 会话的「影子」">
        <p>
          关键来了：临时节点的生命周期<strong>完全跟着会话走</strong>。会话一旦过期或关闭，
          这个会话创建的<strong>所有临时节点</strong>会被 ZooKeeper <strong>自动删除</strong>。
          这就是注册中心「下线自动摘除」的全部秘密——机器宕机 → 心跳断 → 会话超时过期 → 它注册的临时节点被删 →
          ZooKeeper 通过 watch 通知消费者「列表变了」。整个过程没有任何人工干预，也不需要额外的健康检查脚本。
        </p>
        <p>
          回头看上一章的 stat 字段就懂了：临时节点的 <code>ephemeralOwner</code> 存的正是创建它的 session id。
          服务端为每个 session 维护一张「它创建了哪些临时节点」的表，session 一过期，照着这张表把节点全删掉，
          并广播对应的 NodeDeleted 事件。机制朴素，但正是这种朴素让它极其可靠。
        </p>
      </KeyIdea>

      <Example title="服务下线后注册信息自动消失">
        <p>
          回到上一章 Dubbo 的例子。订单服务的每台机器，注册时写的是<strong>临时节点</strong>，比如
          <code>/dubbo/订单服务/providers/192.168.1.10:8080</code>。这台机器和 ZooKeeper 之间维持着一个会话和心跳。
        </p>
        <p>
          某天这台机器进程崩了，心跳随之中断。ZooKeeper 等到会话超时（比如 10 秒）后判定会话过期，
          自动把它注册的那个临时节点删掉。消费者那边因为注册过 watch，立刻收到「providers 子节点变了」的通知，
          重新拉一次列表，这台坏机器就从候选里消失了。<strong>临时节点 + 会话超时 + watch</strong>，三件套配合，才有了「优雅下线」。
        </p>
        <p>
          但要小心一个经典生产事故：<strong>Full GC 导致的假性下线</strong>。某台健康的机器突然来一次长达十几秒的
          STW（Stop-The-World）GC，期间发不出心跳，ZK 判定 session 过期、删掉它的临时节点；GC 结束后机器恢复，
          却发现自己的注册节点没了，于是重新注册——这一删一加触发了消费者两次列表刷新，还可能让正在它上面跑的
          分布式锁瞬间失效。应对：sessionTimeout 设得比最坏 GC 停顿更长、监控 GC、必要时调优堆。
        </p>
      </Example>

      <Callout variant="warn" title="临时节点的两个限制">
        <ul>
          <li><strong>临时节点不能有子节点</strong>——它是会话的叶子，下面挂不了东西。</li>
          <li><strong>会话超时是「服务端判定」</strong>——网络抖动导致心跳短暂中断、超过 sessionTimeout，节点就会被误删，所以超时时间不能设得太小，否则网络一抖服务就「假性下线」。</li>
          <li><strong>过期是不可逆的</strong>——一旦 EXPIRED，原 session 创建的临时节点全部消失且不会自动恢复；客户端必须监听 Expired 事件、重建 session 并重新注册全部临时节点（Curator 这类框架会帮你自动做）。</li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「临时节点是怎么回事 / 注册中心怎么感知下线」，标准链路答出来就满分：
        <strong>注册时用临时节点，节点和创建它的会话绑定；客户端靠心跳维持会话；机器宕机后心跳停、会话超时过期，
        ZooKeeper 自动删除它的临时节点，再通过 watch 通知消费者更新列表。</strong>
        如果追问分布式锁，就接上顺序节点：每个抢锁的客户端创建一个<strong>临时顺序节点</strong>，
        编号最小的拿锁，其余的监听前一个节点，前者释放（或会话断）就轮到下一个，既能排队又能防死锁。
      </p>
      <p>
        高频追问：<strong>「session 断了临时节点一定没吗？」</strong>——不一定！连接断（SUSPENDED）但 session 没过期
        就重连成功的话，临时节点还在；只有 EXPIRED 才删。<strong>「sessionTimeout 设多大合适？」</strong>——
        要大于最坏网络抖动和 GC 停顿（常见 10～30 秒），太小误判下线、太大故障感知慢。
        <strong>「为什么注册中心用 ZK 而 GC 又是个坑？」</strong>——正好引出上面的假性下线案例，体现你有踩坑经验。
      </p>

      <Practice title="创建临时 / 顺序节点并观察">
        <p>
          先建一个临时节点，然后退出再连回来，验证它真的消失了：
        </p>
        <CodeBlock lang="bash" title="临时节点 create -e" code={ephemeralCode} />
        <p>
          再连续创建几个顺序节点，看 ZooKeeper 自动追加的自增编号；并把临时和顺序叠加，做出分布式锁排队用的节点：
        </p>
        <CodeBlock lang="bash" title="顺序节点 create -s" code={seqCode} />
        <p>
          额外练习：在另一台终端创建临时节点，主终端用 <code>ls -w</code> 监听父目录，然后把那台终端 <code>quit</code> 掉，
          观察主终端收到的子节点变更通知——这就是注册中心「下线感知」的完整复现。
        </p>
        <p>
          进阶练习：用 <code>create -e</code> 建一个临时节点，记下它的 <code>ephemeralOwner</code>（即 session id），
          再开一个 zkCli，用同一逻辑创建另一个临时节点，对比两者 ephemeralOwner 不同——直观看到「临时节点归属于各自的 session」。
        </p>
      </Practice>

      <Summary
        points={[
          '四种 znode 类型：持久、临时、持久顺序、临时顺序，由「是否持久」和「是否带顺序编号」两维组合而成。',
          '3.5+ 还有容器节点（空了自动清理）和 TTL 节点，框架的锁父目录常用容器节点。',
          '顺序节点由 ZooKeeper 自动追加全局单调递增的 10 位编号，由 leader 串行分配，是分布式锁排队的基础。',
          'session 是客户端与服务端的会话，靠心跳（ping）维持，可在服务端间漂移；实际超时由客户端与服务端协商。',
          'session 有 CONNECTED/SUSPENDED/EXPIRED 等状态，SUSPENDED 重连成功临时节点还在，只有 EXPIRED 才全删。',
          '临时节点与会话绑定（ephemeralOwner = session id）：会话过期或关闭时，它创建的所有临时节点被自动删除。',
          '注册中心「下线自动摘除」= 临时节点 + 会话超时 + watch 通知三者配合的结果。',
          '临时节点不能有子节点；sessionTimeout 要大于最坏抖动与 GC 停顿，否则会假性下线。',
        ]}
      />
    </>
  )
}
