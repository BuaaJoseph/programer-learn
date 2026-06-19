import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LoadBalance from '@/courses/dubbo-rpc/illustrations/LoadBalance.jsx'

const lbCode = `# 方式一：在 Consumer 端给某个引用配置负载均衡策略
dubbo.reference.com.example.OrderService.loadbalance=leastactive

# 方式二：注解写法（Dubbo3）
# @DubboReference(loadbalance = "leastactive")
# private OrderService orderService;

# 可选值：random（默认）/ roundrobin / leastactive / consistenthash`

const weightCode = `# 给 Provider 配置权重，配合 random / roundrobin 生效
dubbo.provider.weight=200

# 预热：服务刚启动的 warmup 时间内（毫秒）权重线性爬升
dubbo.provider.warmup=600000`

const customLbCode = `// 自定义负载均衡：实现 LoadBalance 接口（走 Dubbo SPI 扩展）
public class TaggedLoadBalance extends AbstractLoadBalance {
    @Override
    protected <T> Invoker<T> doSelect(List<Invoker<T>> invokers,
                                      URL url, Invocation invocation) {
        // 例：把带有特定标签（如灰度 tag=gray）的请求只打到灰度机器
        String tag = invocation.getAttachment("tag");
        if (tag != null) {
            for (Invoker<T> inv : invokers) {
                if (tag.equals(inv.getUrl().getParameter("tag"))) return inv;
            }
        }
        // 兜底：退回随机
        return invokers.get(ThreadLocalRandom.current().nextInt(invokers.size()));
    }
}
// 注册：META-INF/dubbo/org.apache.dubbo.rpc.cluster.LoadBalance
//   tagged=com.example.TaggedLoadBalance
// 使用：@DubboReference(loadbalance = "tagged")`

const weightHashCode = `// 加权随机的核心思路（Random 默认策略的伪代码）
int totalWeight = invokers.stream().mapToInt(this::getWeight).sum();
int offset = ThreadLocalRandom.current().nextInt(totalWeight);
for (Invoker inv : invokers) {
    offset -= getWeight(inv);
    if (offset < 0) return inv;   // 落在哪个权重区间就选谁，权重越大区间越宽
}

// 一致性哈希：每个节点在环上放 160 个虚拟节点，避免数据倾斜
// hash(请求参数) -> 顺时针找到第一个虚拟节点 -> 对应真实节点
// 加一台机器，只有「新节点到它前驱之间」那段 key 重新归属，其余不动`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          Consumer 手里握着一串 Provider 地址，每次调用只能挑一台。挑哪台、怎么挑得「公平又聪明」，
          就是<em>负载均衡</em>（load balance）要回答的问题。Dubbo 把负载均衡放在
          <strong>Consumer 端</strong>做——它自己从本地地址列表里选，不需要额外的负载均衡器。
        </p>
      </Lead>

      <h2>四种内置策略</h2>
      <p>
        Dubbo 内置了四种负载均衡策略，覆盖了绝大多数场景，记住每种「擅长什么」就够用了：
      </p>
      <ul>
        <li>
          <strong>Random</strong>（加权随机，<em>默认</em>）：按权重随机选一台。权重大的被选中概率高。
          调用量大时，实际分布会自然趋近于权重比例，简单且高效。
        </li>
        <li>
          <strong>RoundRobin</strong>（加权轮询）：按权重依次轮着来，分配更均匀、更平滑，适合各节点性能接近的场景。
        </li>
        <li>
          <strong>LeastActive</strong>（最少活跃数）：优先选「当前正在处理请求数最少」的节点，
          <strong>能自动避开慢节点</strong>——慢节点积压的请求多、活跃数高，自然就少被选中。
        </li>
        <li>
          <strong>ConsistentHash</strong>（一致性哈希）：<strong>相同参数的请求固定路由到同一台</strong> Provider，
          利于缓存命中；且节点增减时只影响一小部分请求，而不是全部重新打散。
        </li>
      </ul>

      <LoadBalance />

      <h3>为什么负载均衡放在 Consumer 端</h3>
      <p>
        这是一个很值得品的设计选择。传统架构里负载均衡器（如 Nginx、F5）是<strong>独立一层</strong>，
        所有流量先打到它再转发。Dubbo 反其道而行，把负载均衡做进了 Consumer 进程内（<em>客户端负载均衡</em>），好处是：
      </p>
      <ul>
        <li><strong>少一跳</strong>：Consumer 直连选中的 Provider，没有中间转发节点，延迟更低。</li>
        <li><strong>无单点</strong>：不存在「负载均衡器挂了全挂」的问题，每个 Consumer 各自决策。</li>
        <li><strong>信息更全</strong>：Consumer 本地能掌握每个 Provider 的活跃数、响应时间，才能做 LeastActive 这种「感知后端状态」的策略，集中式 LB 很难拿到这么细的实时信息。</li>
      </ul>
      <p>
        代价是每个 Consumer 都要自己维护地址列表、自己算策略，逻辑下沉到了客户端——这正是 RPC 框架（而非纯网络层）来做这件事的原因。
      </p>

      <h3>加权随机和一致性哈希的实现要点</h3>
      <p>
        面试常追问「加权随机怎么实现的」。其实就是把所有节点的权重想成数轴上一段段宽度不同的区间，
        在总权重范围内取一个随机数，落在哪段就选哪个节点——权重越大区间越宽，被选中概率越高。
        一致性哈希则给每个真实节点在哈希环上撒 160 个<strong>虚拟节点</strong>，避免节点少时数据分布不均（倾斜）：
      </p>
      <CodeBlock lang="java" title="加权随机与一致性哈希的核心逻辑" code={weightHashCode} />

      <Example title="集群里混进一个慢节点，该用哪种">
        <p>
          假设 OrderService 有 3 台机器，其中一台因为 GC 或磁盘问题变慢了，处理一个请求要 2 秒，
          另外两台只要 50 毫秒。
        </p>
        <p>
          如果用 <strong>Random</strong> 或 <strong>RoundRobin</strong>，慢节点照样按概率/轮次分到请求，
          落到它身上的用户就得干等 2 秒，整体延迟被拖高。
        </p>
        <p>
          换成 <strong>LeastActive</strong> 就聪明了：慢节点处理得慢，它身上「正在进行中」的请求会堆积、活跃数变高，
          于是后续请求会自动倾向于发给那两台快的。<strong>慢节点被自然冷落</strong>，整体延迟显著下降。
          所以「集群里有慢节点」这道题，标准答案就是 LeastActive。
        </p>
      </Example>

      <KeyIdea title="ConsistentHash 是为「黏住同一台」而生">
        <p>
          当你希望「同一个用户/同一个 key 的请求总落到同一台 Provider」时（比如那台机器上缓存了这个用户的数据），
          用 <strong>ConsistentHash</strong>。它对请求参数做哈希，映射到哈希环上离它最近的节点。
        </p>
        <p>
          它的好处是<strong>稳定</strong>：普通哈希取模一旦节点数变化，几乎所有请求的归属都会变；
          而一致性哈希在加/减一台节点时，<strong>只有环上相邻的一小段请求会重新分配</strong>，缓存命中率受影响很小。
        </p>
      </KeyIdea>

      <Callout variant="tip" title="权重与预热（warmup）">
        <p>
          <strong>权重</strong>（weight）让你给性能强的机器分更多流量，配合 Random / RoundRobin 生效。
        </p>
        <p>
          <strong>预热</strong>（warmup）解决「新机器一上线就被打满」的问题：刚启动的 Provider，JVM 还没热、
          缓存还是空的，直接承接满流量容易抖动甚至被打挂。Dubbo 让它的权重在 warmup 时间内
          <strong>从小到大线性爬升</strong>，给它一个缓冲期，等热起来再承担全部流量。
        </p>
      </Callout>

      <h2>不够用？自定义一个负载均衡</h2>
      <p>
        四种内置策略覆盖了大多数场景，但真实业务总有特殊需求，比如<strong>灰度发布</strong>：
        带 <code>tag=gray</code> 的请求只能打到灰度机器，其余打到正式机器。Dubbo 的负载均衡是通过
        <strong>SPI 扩展</strong>暴露的，实现 <code>LoadBalance</code> 接口、在 <code>META-INF/dubbo</code> 下注册，
        就能像内置策略一样用名字引用。这也是 Dubbo「一切皆可扩展」设计哲学的体现（后续 SPI 章会细讲）：
      </p>
      <CodeBlock lang="java" title="自定义标签路由负载均衡" code={customLbCode} />
      <Callout variant="note" title="负载均衡 vs 路由，别混">
        <p>
          很多人把「灰度」直接塞进负载均衡，其实 Dubbo 更推荐用<strong>路由（Router）</strong>先<em>筛选</em>出候选 Invoker 子集，
          再由负载均衡在子集里<em>选一台</em>。职责是：<strong>路由决定「能选哪些」，负载均衡决定「选其中哪个」</strong>。
          标签路由、条件路由都属于路由层，上面那个例子是为了演示扩展点才写进 LB 里。
        </p>
      </Callout>

      <h2>实战/面试怎么答</h2>
      <p>
        被问「Dubbo 有哪些负载均衡策略」，先报四个名字并各点一句擅长场景：
        <strong>Random 默认、加权随机；RoundRobin 加权轮询更均匀；LeastActive 避开慢节点；
        ConsistentHash 相同参数固定路由、利于缓存</strong>。
        再补一句「配合权重和预热，新机器上线可以平滑承接流量」，就显得既懂原理又懂线上。
        如果面试官追问「慢节点怎么办」，直接答 LeastActive 并解释「活跃数」的原理。
      </p>

      <Callout variant="warn" title="负载均衡的坑与追问">
        <ul>
          <li><strong>ConsistentHash 默认对第一个参数哈希</strong>：如果第一个参数不是你想要的 key（比如它是个时间戳），路由会乱掉，要用 <code>hash.arguments</code> 指定参数下标。</li>
          <li><strong>LeastActive 依赖 ActiveLimitFilter 统计活跃数</strong>：活跃数是「调用开始 +1、结束 -1」维护的，若过滤器没生效，LeastActive 会退化成随机。</li>
          <li><strong>权重不预热的后果</strong>：新机器一上线 JVM 没热（JIT 没编译、连接池没建、缓存空），满流量直接打抖动甚至超时，warmup 就是治这个。</li>
          <li><strong>误区「轮询一定最均匀最好」</strong>：节点性能不一时，轮询会让弱节点被压垮；性能差异大应配权重或用 LeastActive。</li>
          <li><strong>误区「负载均衡能解决数据倾斜」</strong>：如果是热点 key（某个大客户请求特别多），ConsistentHash 反而会把它们全压到一台上，需在业务层打散。</li>
        </ul>
      </Callout>

      <Practice title="给服务配上合适的负载均衡策略">
        <p>
          负载均衡策略可以在 Consumer 端按引用配置。先用默认的 Random 跑，再切到 LeastActive，
          故意让一台 Provider 在方法里 sleep 模拟慢节点，观察请求分布的变化。
        </p>
        <CodeBlock lang="properties" title="loadbalance 配置" code={lbCode} />
        <CodeBlock lang="properties" title="权重与预热" code={weightCode} />
        <p>
          再试试 ConsistentHash：用同一个用户 ID 连续调用多次，确认它们始终落在同一台 Provider 上；
          然后上线一台新 Provider，看看有多少请求的归属发生了变化——你会发现绝大多数请求纹丝不动。
        </p>
      </Practice>

      <Summary
        points={[
          'Dubbo 的负载均衡在 Consumer 端完成：从本地地址列表里按策略挑一台，无需独立的负载均衡器。',
          'Random（默认）按权重随机；RoundRobin 按权重轮询、分配更均匀，适合性能接近的节点。',
          'LeastActive 选活跃数最少的节点，能自动避开慢节点，是「集群有慢节点」的标准答案。',
          'ConsistentHash 让相同参数固定路由到同一台，利于缓存命中，且节点增减只影响一小部分请求。',
          '权重让强机器多分流量；预热（warmup）让新机器权重线性爬升，避免刚上线就被流量打挂。',
          '面试按「四种策略各报一句擅长场景 + 权重预热」回答，追问慢节点就答 LeastActive。',
        ]}
      />
    </>
  )
}
