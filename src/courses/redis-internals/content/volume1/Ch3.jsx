import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SingleThreadLoop from '@/courses/redis-internals/illustrations/SingleThreadLoop.jsx'

const scanCmd = `# 千万别在生产用 KEYS * —— 它会一次遍历所有 key，阻塞整个实例
127.0.0.1:6379> KEYS user:*        # 危险！O(N)，数据多时卡死所有请求

# 正确做法：SCAN 渐进式遍历，每次只取一小批，不阻塞
127.0.0.1:6379> SCAN 0 MATCH user:* COUNT 100
1) "17"                            # 返回游标(cursor)，下次带上它继续
2) 1) "user:1"
   2) "user:2"

# 拿返回的游标继续扫，直到游标变回 0 表示遍历完成
127.0.0.1:6379> SCAN 17 MATCH user:* COUNT 100
1) "0"                            # 游标为 0 → 遍历结束
2) 1) "user:3"`

const slowlogCmd = `# 设置慢查询阈值：超过 10000 微秒(10ms) 的命令记入慢日志
127.0.0.1:6379> CONFIG SET slowlog-log-slower-than 10000
OK

# 查看最近 5 条慢命令（含耗时、时间、命令本身）
127.0.0.1:6379> SLOWLOG GET 5
1) 1) (integer) 14               # 日志ID
   2) (integer) 1718500000       # 发生时间戳
   3) (integer) 23000            # 耗时(微秒)=23ms
   4) 1) "KEYS"                  # 元凶：一条 KEYS *
      2) "*"

# 查慢日志当前条数 / 清空
127.0.0.1:6379> SLOWLOG LEN
127.0.0.1:6379> SLOWLOG RESET`

const bigkeyCmd = `# 排查大 key（生产建议加 -i 0.1 限速，避免扫描本身造成压力）
$ redis-cli --bigkeys

# 看单个 key 占用的内存字节数
127.0.0.1:6379> MEMORY USAGE big:hash
(integer) 10485760              # 约 10MB，典型大 key

# 看集合类元素个数，判断是否过大
127.0.0.1:6379> HLEN big:hash
(integer) 2000000              # 200万字段，删除/读取都会阻塞`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          一个让无数人困惑的事实：Redis 处理命令<strong>只用一个线程</strong>，却能轻松扛住每秒十万级的请求。
          单线程不是更慢吗？恰恰相反——它快得有道理。这一章讲清「单线程为什么这么快」，
          以及单线程模型埋下的那些会被面试官反复追问的坑：大 key、慢命令、还有那条绝对不能上生产的 <code>KEYS *</code>。
        </p>
      </Lead>

      <h2>单线程指的是什么</h2>
      <p>
        说 Redis 单线程，准确含义是：<strong>命令的接收、解析、执行、返回，全部由一个主线程串行完成</strong>。
        所有命令进一个队列，一条一条执行，不会有两条命令同时改同一个 key——这也是为什么 Redis 的单个命令天然原子，
        不需要加锁。注意：持久化（RDB/AOF 重写）、惰性删除等后台工作早就有子进程/子线程在做，
        这里说的单线程，单指<strong>命令处理这条主路径</strong>。
      </p>

      <h2>为什么单线程还这么快</h2>
      <p>
        快的原因不是「单线程」本身，而是单线程<strong>避开了多线程的开销</strong>，又配上了几样利器：
      </p>
      <ul>
        <li>
          <strong>纯内存操作</strong>：数据全在内存里，读写是纳秒级，瓶颈根本不在 CPU 计算，而在网络 IO。
          既然 CPU 不是瓶颈，多开线程算命令也提升有限。
        </li>
        <li>
          <strong>IO 多路复用（epoll）</strong>：一个线程用 <em>epoll</em> 同时盯着成千上万个连接，
          哪个连接有数据就绪就处理哪个，不必为每个连接开一个线程傻等。这是单线程能扛高并发连接的关键。
        </li>
        <li>
          <strong>避免锁与线程切换</strong>：多线程要加锁防竞争、要频繁上下文切换，这些都是实打实的开销。
          单线程一条道走到黑，没有锁竞争、没有切换成本，反而更省。
        </li>
        <li>
          <strong>高效数据结构</strong>：前两章讲的 SDS、跳表、listpack、hashtable，都是为「每个命令尽量快」精心设计的，
          单条命令本身就快，串行执行自然吞吐高。
        </li>
      </ul>

      <SingleThreadLoop />

      <h3>Redis 6 的多线程 IO：别误会了</h3>
      <p>
        很多人听说「Redis 6 支持多线程」就以为命令也并行了——<strong>不是的</strong>。Redis 6 引入的多线程，
        只把<strong>网络数据的读取和写回（socket 的 read/write 以及协议解析）</strong>交给了多个 IO 线程，
        因为当请求量极大时，网络读写会成为瓶颈。但<strong>命令的实际执行，依然由主线程单线程串行完成</strong>。
        所以「命令执行无锁、单命令原子」这个核心特性没变，多线程只是把网络这段拓宽了。
      </p>

      <Example title="一条慢命令能拖垮整个实例">
        <p>
          因为是单线程串行，<strong>一条命令卡住，后面所有命令都得排队等它</strong>。设想线上有人执行了
          <code>KEYS *</code>，库里有 500 万个 key：这条命令要遍历全部 key，可能耗时几百毫秒甚至几秒。
        </p>
        <p>
          这几百毫秒里，Redis 主线程被它<strong>独占</strong>，其他所有正常请求（缓存读、计数器自增……）全部阻塞，
          整个实例表现为「卡死」，监控上是一波超时和雪崩。这就是单线程模型的代价：<strong>它要求每条命令都足够快</strong>。
        </p>
      </Example>

      <Callout variant="warn" title="单线程模型的三大坑（面试高频）">
        <ul>
          <li>
            <strong>禁用 KEYS *</strong>：它是 O(N) 全量遍历且会阻塞主线程，生产环境一律禁用，
            改用 <code>SCAN</code> 渐进式遍历——每次只扫一小批、靠游标续接，不会长时间占用主线程。
          </li>
          <li>
            <strong>慢命令</strong>：<code>SORT</code>、<code>SUNIONSTORE</code>、对大集合的 <code>SMEMBERS</code>/<code>HGETALL</code>、
            以及 <code>FLUSHALL</code> 都可能很慢，要靠 <code>SLOWLOG</code> 揪出来并优化。
          </li>
          <li>
            <strong>大 key</strong>：一个存了几百万元素的 Hash/Set，读取、删除、迁移都会长时间阻塞主线程。
            删除大 key 用 <code>UNLINK</code>（异步删除）代替 <code>DEL</code>，并从设计上拆分大 key。
          </li>
        </ul>
      </Callout>

      <KeyIdea title="单线程的代价：每条命令都必须快">
        <p>
          单线程换来了简单、无锁、原子，但代价是<strong>没有容错冗余</strong>——一条慢命令就能阻塞所有人。
          所以用 Redis 的纪律就是：<strong>避免大 key、避免 O(N) 命令、用 SCAN/UNLINK 替代阻塞操作、用 SLOWLOG 持续监控</strong>。
          理解了这条，你写的每一条 Redis 命令都会下意识地问一句「它会不会卡住主线程」。
        </p>
      </KeyIdea>

      <h2>面试怎么答</h2>
      <p>
        「Redis 单线程为什么快」标准答法：<strong>纯内存 + IO 多路复用(epoll) + 避免锁和上下文切换 + 高效数据结构</strong>，
        瓶颈在网络不在 CPU，所以单线程足够。紧接着主动补一句：Redis 6 的多线程<strong>只优化网络 IO，命令执行仍单线程</strong>。
        最后点出坑：单线程要求每条命令都快，所以<strong>禁用 KEYS *、警惕大 key 和慢命令</strong>——这一补，层次立刻就上去了。
      </p>

      <Practice title="用 SCAN 和 SLOWLOG 守住单线程">
        <p>
          先把「危险的 KEYS」换成「安全的 SCAN」，体会渐进式遍历靠游标续接：
        </p>
        <CodeBlock lang="bash" title="SCAN 替代 KEYS" code={scanCmd} />
        <p>
          再打开慢日志，把拖慢主线程的命令揪出来：
        </p>
        <CodeBlock lang="bash" title="SLOWLOG 查慢命令" code={slowlogCmd} />
        <p>
          最后练习排查大 key，从源头避免阻塞：
        </p>
        <CodeBlock lang="bash" title="排查大 key" code={bigkeyCmd} />
      </Practice>

      <Summary
        points={[
          'Redis 单线程指命令的接收/解析/执行/返回由一个主线程串行完成，因此单命令天然原子、无需加锁。',
          '它快的原因是纯内存 + IO 多路复用(epoll) + 避免锁与线程切换 + 高效数据结构，瓶颈在网络而非 CPU。',
          'Redis 6 的多线程只把网络读写多线程化，命令执行依然单线程，核心原子特性不变。',
          '单线程的代价：一条慢命令会阻塞所有请求，要求每条命令都足够快。',
          '生产禁用 KEYS *，改用 SCAN 渐进式遍历(靠游标续接，不阻塞主线程)。',
          '警惕大 key 与慢命令：用 SLOWLOG 监控、用 UNLINK 异步删除大 key、从设计上拆分大 key。',
        ]}
      />
    </>
  )
}
