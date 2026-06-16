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

      <h2>实战/面试怎么答</h2>
      <p>
        被问「Dubbo 有哪些负载均衡策略」，先报四个名字并各点一句擅长场景：
        <strong>Random 默认、加权随机；RoundRobin 加权轮询更均匀；LeastActive 避开慢节点；
        ConsistentHash 相同参数固定路由、利于缓存</strong>。
        再补一句「配合权重和预热，新机器上线可以平滑承接流量」，就显得既懂原理又懂线上。
        如果面试官追问「慢节点怎么办」，直接答 LeastActive 并解释「活跃数」的原理。
      </p>

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
