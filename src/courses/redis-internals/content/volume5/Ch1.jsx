import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const benchCmd = `# 用自带的 redis-benchmark 压一压，直观感受吞吐
# -n 请求总数，-c 并发连接数，-t 只测指定命令
redis-benchmark -h 127.0.0.1 -p 6379 -n 100000 -c 50 -t get,set

# 典型单机结果（仅供感受量级，机器/网络差异很大）：
# SET: 约 10 万 QPS
# GET: 约 11 万 QPS
# 加上 pipeline 后单连接也能轻松上百万 QPS：
redis-benchmark -n 1000000 -t set -P 16 -q`

const ioThreadConf = `# Redis 6.0+ 的 IO 多线程：只把"读取请求 / 回写响应"的 socket IO 交给多线程
# 命令的执行仍然是单线程，所以不需要为数据结构加锁
io-threads 4              # IO 线程数，建议不超过物理核数，4 核机器设 2~3
io-threads-do-reads yes   # 是否也用多线程处理读（默认 no，只多线程写回）

# 注意：QPS 没到几十万、网卡没打满时，开多线程收益很小甚至更差`

const infoCmd = `# 排查性能瓶颈先看 INFO，再看慢日志
127.0.0.1:6379> INFO stats
instantaneous_ops_per_sec:48211     # 实时 QPS
total_net_input_bytes:...           # 网络入/出流量，判断是否网卡瓶颈
keyspace_hits:980000                # 命中
keyspace_misses:20000               # 未命中，算命中率

127.0.0.1:6379> SLOWLOG GET 10      # 看最近 10 条慢命令
127.0.0.1:6379> CONFIG SET slowlog-log-slower-than 10000  # 超过 10ms 记一条`

const lettuceSnippet = `// Java 侧最常用的客户端是 Lettuce（Spring Boot 2.x+ 默认）和 Jedis
// Lettuce 基于 Netty，单连接即可多路复用，线程安全
RedisClient client = RedisClient.create("redis://127.0.0.1:6379");
StatefulRedisConnection<String, String> conn = client.connect();
RedisCommands<String, String> sync = conn.sync();   // 同步 API
sync.set("user:1", "Tom");
String v = sync.get("user:1");

// Jedis 则是阻塞式、连接非线程安全，需要配连接池 JedisPool
// 高并发下用 Lettuce 的异步/响应式 API 或 Jedis 连接池都可以`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一卷开始是「面试精讲」。我不照搬八股，而是把每道高频题拆成「原理 → 对比 → 命令/代码 →
        易错点 → 追问」五段，让你既能答得出，也能讲得透。本章先打地基：Redis 用在哪、
        <strong>凭什么这么快</strong>、为什么早期坚持单线程、6.0 又为什么引入多线程、
        和 Memcached 怎么比、项目里用什么客户端，以及遇到性能瓶颈该怎么定位和处理。
      </Lead>

      <h2>一、Redis 的典型应用场景</h2>
      <p>
        面试常以「你项目里 Redis 用来干嘛」开场。别只答「做缓存」，要能铺开说出它作为
        内存数据结构服务器的多面性。
      </p>
      <table>
        <thead>
          <tr><th>场景</th><th>用到的结构/能力</th><th>一句话价值</th></tr>
        </thead>
        <tbody>
          <tr><td>数据库缓存</td><td>String / Hash + 过期</td><td>挡住读流量，降 DB 压力</td></tr>
          <tr><td>分布式锁</td><td>SET NX PX / Lua</td><td>跨进程互斥</td></tr>
          <tr><td>计数器/限流</td><td>INCR / 滑动窗口</td><td>原子自增，天然防并发</td></tr>
          <tr><td>排行榜</td><td>ZSet</td><td>按分数排序 + 范围查询</td></tr>
          <tr><td>消息队列</td><td>List / Stream / Pub-Sub</td><td>轻量异步解耦</td></tr>
          <tr><td>去重/UV</td><td>Set / HyperLogLog / Bitmap</td><td>极省内存的基数统计</td></tr>
          <tr><td>会话共享</td><td>String + 过期</td><td>多实例共享 Session</td></tr>
          <tr><td>地理位置</td><td>GEO（底层 ZSet）</td><td>附近的人/店</td></tr>
        </tbody>
      </table>

      <h2>二、Redis 为什么这么快</h2>
      <KeyIdea>
        Redis 快不是单一原因，而是「<strong>纯内存操作 + 高效数据结构 + 单线程避免锁与上下文切换 +
        IO 多路复用 + 自研协议</strong>」几条合力。把这几点串起来讲，比只说「因为在内存里」要扎实得多。
      </KeyIdea>
      <ul>
        <li><strong>纯内存</strong>：所有数据在内存里，读写是纳秒级，避开了磁盘寻道这个最大瓶颈。</li>
        <li><strong>高效数据结构</strong>：每种类型都按数据量自动切换底层编码（如小哈希用 listpack、
          大哈希用 hashtable），常见操作多为 O(1) 或 O(log N)。</li>
        <li><strong>单线程执行命令</strong>：命令处理串行，<strong>没有锁竞争、没有线程上下文切换</strong>，
          CPU 缓存友好，逻辑也简单。</li>
        <li><strong>IO 多路复用</strong>：基于 epoll/kqueue，一个线程用一个事件循环同时管理上万个连接，
          只在有事件时才处理，不为每个连接开线程。</li>
        <li><strong>RESP 协议</strong>：自研的 RESP 文本协议简单易解析，序列化开销小。</li>
      </ul>
      <CodeBlock lang="bash" title="redis-benchmark 感受吞吐量级" code={benchCmd} />
      <p>
        <strong>面试追问：IO 多路复用到底是什么？</strong>它指<strong>一个线程同时监听多个 socket 的事件</strong>。
        传统做法是「一个连接一个线程」，连接多了线程开销巨大；而 <code>epoll</code> 让内核帮你盯着成千上万个
        连接，只在「哪个连接有数据可读 / 可写」时才通知你的线程去处理。Redis 的主线程就是一个
        <strong>事件循环（event loop）</strong>：从 epoll 拿到就绪事件 → 读请求 → 执行命令 → 写回响应 →
        回到循环。没有空转、没有为每个连接开线程，这是它单线程却能扛高并发连接的关键。
      </p>
      <Callout variant="info" title="别把「快」全归功于内存">
        「Redis 快是因为在内存里」只答对了一半。Memcached、甚至本地 HashMap 也在内存里。Redis 的快是
        内存 + 高效结构 + 单线程免锁 + 多路复用 + 简单协议的<strong>合力</strong>，缺一块都不会这么稳。
        面试时把这几点都说全，比只甩「内存」要有说服力。
      </Callout>

      <h2>三、为什么早期坚持单线程</h2>
      <p>
        「Redis 不是多核服务器吗，为什么用单线程还快？」这是必考追问。要点是：
        <strong>Redis 的瓶颈通常不在 CPU，而在内存和网络 IO</strong>。既然 CPU 不是瓶颈，
        多线程带来的锁、竞争、上下文切换反而是负担。
      </p>
      <p>单线程的好处：</p>
      <ul>
        <li>实现简单，不用为每个数据结构加锁，bug 少。</li>
        <li>所有命令天然原子（一条命令执行期间不会被打断），这也是为什么 INCR、SETNX 能直接当原子操作用。</li>
        <li>避免多线程的锁开销与上下文切换。</li>
      </ul>
      <Callout variant="warn" title="「单线程」说的是命令执行">
        严格说 Redis 从来都不是只有一个线程：持久化的 bgsave 会 fork 子进程，4.0 起还有
        异步删除（lazyfree）、AOF 刷盘等后台线程。我们说的「单线程」特指
        <strong>处理客户端命令的主线程是单线程</strong>。
      </Callout>

      <h2>四、6.0 为什么引入多线程</h2>
      <p>
        既然单线程够快，6.0 为什么又加多线程？因为随着网卡和数据量变大，
        <strong>网络 IO（读取请求、回写响应）的耗时占比上升</strong>，单线程在解析/拷贝大量数据时
        会成为瓶颈。6.0 的多线程<strong>只用于网络 IO</strong>（read/parse 请求、write 响应），
        <strong>命令的真正执行仍然是单线程</strong>——所以依旧不需要加锁。
      </p>
      <CodeBlock lang="bash" title="开启 IO 多线程（按需）" code={ioThreadConf} />
      <Callout variant="tip" title="什么时候才该开">
        只有当 QPS 很高、单核网络 IO 确实打满时开才有收益。普通业务不要盲目开，
        线程切换和调度反而可能让延迟更差。开之前先用 INFO 看
        <code>instantaneous_ops_per_sec</code> 和网络流量确认瓶颈在 IO。
      </Callout>

      <h2>五、Redis vs Memcached</h2>
      <p>
        老牌对比题。Memcached 也是内存缓存，但定位窄得多。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Redis</th><th>Memcached</th></tr>
        </thead>
        <tbody>
          <tr><td>数据类型</td><td>String/Hash/List/Set/ZSet/Stream/Bitmap/HLL/GEO</td><td>只有 String（KV）</td></tr>
          <tr><td>持久化</td><td>支持 RDB/AOF</td><td>不支持，纯内存</td></tr>
          <tr><td>高可用</td><td>主从/哨兵/Cluster</td><td>原生无，靠客户端分片</td></tr>
          <tr><td>线程模型</td><td>命令单线程，6.0 网络多线程</td><td>多线程</td></tr>
          <tr><td>内存管理</td><td>jemalloc，自带淘汰策略</td><td>Slab 分配，预分配减碎片</td></tr>
          <tr><td>大 value</td><td>单 value 最大 512MB</td><td>默认单项 1MB</td></tr>
        </tbody>
      </table>
      <p>
        结论式回答：<strong>绝大多数场景选 Redis</strong>，因为类型丰富、能持久化、有完整高可用方案。
        Memcached 仅在「纯 KV、超大并发、value 较小、且本身用多线程吃满多核」的极简缓存场景还有一席之地。
      </p>

      <h2>六、项目里用什么客户端</h2>
      <p>
        Java 生态最常见的是 <strong>Lettuce</strong> 和 <strong>Jedis</strong>。Spring Boot 2.x 起默认用
        Lettuce。还有封装更高级的 <strong>Redisson</strong>（分布式锁、限流器等开箱即用，后面专门讲）。
      </p>
      <table>
        <thead>
          <tr><th></th><th>Jedis</th><th>Lettuce</th><th>Redisson</th></tr>
        </thead>
        <tbody>
          <tr><td>IO 模型</td><td>阻塞 BIO</td><td>Netty 异步 NIO</td><td>Netty 异步</td></tr>
          <tr><td>线程安全</td><td>连接不安全，需连接池</td><td>单连接可多路复用、线程安全</td><td>线程安全</td></tr>
          <tr><td>API</td><td>同步</td><td>同步/异步/响应式</td><td>同步/异步 + 分布式对象</td></tr>
          <tr><td>适合</td><td>简单、连接池场景</td><td>高并发、响应式</td><td>分布式锁/限流等高级能力</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="Lettuce 与 Jedis 用法对比" code={lettuceSnippet} />
      <p>
        <strong>面试追问：为什么 Spring Boot 默认换成了 Lettuce？</strong>Jedis 的连接是
        <strong>非线程安全</strong>的，多线程共享一个 Jedis 实例会出问题，必须配 <code>JedisPool</code>，
        高并发下连接数随线程数膨胀。Lettuce 基于 Netty 的异步事件模型，<strong>单个连接就能被多线程安全地
        复用</strong>（命令在 Netty 的事件循环里串行发送），连接数少、还支持异步与响应式 API，
        更契合现代高并发服务。需要分布式锁、限流器、布隆这类高级分布式对象时，再上 Redisson。
      </p>

      <h2>七、性能瓶颈如何处理</h2>
      <p>
        遇到「Redis 慢了怎么排查」，按层次答：先定位瓶颈在哪，再对症处理。
      </p>
      <CodeBlock lang="bash" title="先看 INFO + 慢日志定位" code={infoCmd} />
      <Example title="常见瓶颈与对策">
        <p><strong>1. 慢命令</strong>：误用 <code>KEYS *</code>、<code>HGETALL</code> 大哈希、
          <code>SMEMBERS</code> 大集合等 O(N) 命令。改用 <code>SCAN</code> 渐进遍历、拆小集合。</p>
        <p><strong>2. 大 Key</strong>：一个 value 几十 MB，删除/迁移/网络传输都卡。拆分、用
          <code>UNLINK</code> 异步删。</p>
        <p><strong>3. 网络</strong>：大量小请求来回。用 <strong>Pipeline</strong> 或 <code>MGET</code> 批量化，减少 RTT。</p>
        <p><strong>4. 内存</strong>：接近 maxmemory 触发频繁淘汰，或碎片率高。扩容、调淘汰策略、做碎片整理。</p>
        <p><strong>5. 持久化抖动</strong>：bgsave/AOF rewrite 时 fork 卡顿。错峰、用从库做持久化。</p>
        <p><strong>6. 单实例打满</strong>：垂直扩到头了就上 Cluster 做水平分片。</p>
      </Example>

      <p>
        <strong>面试追问：单线程的 Redis 会被一条命令拖垮吗？</strong>会，而且这是单线程模型最大的隐患。
        因为命令串行执行，<strong>一条慢命令会阻塞后面所有请求</strong>。典型元凶是 <code>KEYS *</code>
        （全量扫描）、对大集合的 <code>HGETALL</code>/<code>SMEMBERS</code>、删除大 Key 的 <code>DEL</code>、
        以及写得很重的 Lua 脚本。所以单线程下「避免慢命令」尤其重要：用 <code>SCAN</code> 渐进遍历替代
        <code>KEYS</code>，用 <code>UNLINK</code> 异步删大 Key，把重逻辑拆小。这也是慢日志（SLOWLOG）
        必须常态化监控的原因。
      </p>

      <Callout variant="tip">
        下一章我们钻进底层：String 的 SDS、EMBSTR 阈值 44、跳表与 listpack、Geo 实现，
        以及如何用 List 做队列和栈。
      </Callout>

      <Summary
        points={[
          'Redis 应用场景远不止缓存：锁、限流、排行榜、队列、去重、会话、地理位置都能做。',
          '快的原因是合力：纯内存 + 高效数据结构 + 单线程免锁 + IO 多路复用 + RESP 协议。',
          '早期单线程是因为瓶颈在内存/网络而非 CPU；单线程免锁、命令天然原子、实现简单。',
          '6.0 多线程只用于网络 IO，命令执行仍单线程，故无需加锁；只有 IO 真打满时才该开。',
          'vs Memcached：Redis 类型丰富、可持久化、有高可用方案，绝大多数场景优先选 Redis。',
          '客户端：Lettuce（Netty 异步、Spring 默认）、Jedis（阻塞需连接池）、Redisson（分布式高级能力）。',
          '排查性能先用 INFO + SLOWLOG 定位，再对症：慢命令、大 Key、网络批量化、内存、持久化抖动、上 Cluster。',
        ]}
      />
    </article>
  )
}
