import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SkipList from '@/courses/redis-internals/illustrations/SkipList.jsx'

const rankCmd = `# 游戏排行榜：score=分数，member=玩家
127.0.0.1:6379> ZADD game:rank 1500 alice 1200 bob 1800 carol
(integer) 3

# 玩家加分（原子）：carol 又赢了一局 +50
127.0.0.1:6379> ZINCRBY game:rank 50 carol
"1850"

# Top10 排行榜（从高到低，带分数）
127.0.0.1:6379> ZREVRANGE game:rank 0 9 WITHSCORES
1) "carol"
2) "1850"
3) "alice"
4) "1500"
5) "bob"
6) "1200"

# 查某个玩家的排名（ZREVRANK 是从高到低的名次，0 开始）
127.0.0.1:6379> ZREVRANK game:rank alice
(integer) 1                 # alice 排第 2 名`

const delayCmd = `# 延时队列：score=到期时间戳(毫秒)，member=任务ID
# 把「30秒后执行」的任务塞进来
127.0.0.1:6379> ZADD delay:queue 1718500000000 task:order_close:99
(integer) 1

# 消费者轮询：取出所有「已到期」的任务（score <= 当前时间）
127.0.0.1:6379> ZRANGEBYSCORE delay:queue 0 1718500005000
1) "task:order_close:99"

# 取到后用 ZREM 删除，避免重复消费（生产中用 Lua 保证原子）
127.0.0.1:6379> ZREM delay:queue task:order_close:99
(integer) 1`

const encCmd = `# ZSet 小的时候是 listpack，大了切「跳表 + 字典」
127.0.0.1:6379> ZADD top 90 a 85 b
(integer) 2
127.0.0.1:6379> OBJECT ENCODING top
"listpack"

# 元素数超过 zset-max-listpack-entries(默认128)
# 或成员长度超过 zset-max-listpack-value(默认64) → skiplist
127.0.0.1:6379> CONFIG GET zset-max-listpack-entries
1) "zset-max-listpack-entries"
2) "128"`

const moreZsetCmd = `# ZSet 的范围与排名命令全家桶
# 按排名取区间（0 到 -1 表示全部，从低到高）
ZRANGE game:rank 0 -1 WITHSCORES

# 按分数区间取，( 表示开区间，+inf/-inf 表示无穷
ZRANGEBYSCORE game:rank 1000 (1800        # [1000, 1800)
ZRANGEBYSCORE game:rank -inf +inf         # 全量

# 分页：取分数 1000~2000 内的第 0~9 个（LIMIT offset count）
ZRANGEBYSCORE game:rank 1000 2000 LIMIT 0 10

# 统计某分数区间内有几个成员
ZCOUNT game:rank 1500 2000

# 字典序区间（同分场景，要求所有成员同分才有意义）
ZRANGEBYLEX names [a [c

# Redis 6.2+ 统一新命令：ZRANGE 支持 REV / BYSCORE / BYLEX
ZRANGE game:rank 0 9 REV WITHSCORES       # 等价 ZREVRANGE`

const skiplistStruct = `# 跳表节点的简化结构（zskiplistNode）
struct zskiplistNode {
    sds        ele;        // 成员名 member
    double     score;      // 分值，用于排序
    struct zskiplistNode *backward;   // 后退指针，支持反向遍历
    struct zskiplistLevel {
        struct zskiplistNode *forward; // 每一层的前进指针
        unsigned long span;            // 跨度：到下个节点跨过几个节点(算排名用)
    } level[];             // 柔性数组，层数随机决定
}

# 关键点：
# 1. 排序键是 (score, ele)：score 相同则按成员字典序排，保证全序
# 2. span 累加 = 排名，所以 ZRANK / ZREVRANK 也是 O(log N)
# 3. 层高随机生成，期望 1/4 概率升一层(Redis 默认 p=0.25)，最高 32 层`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          「做一个实时排行榜」几乎是后端面试的标准题，而标准答案永远是 Redis 的 <strong>ZSet</strong>。
          为什么排行榜偏偏用它？因为 ZSet 底层藏着一个叫<em>跳表</em>（skiplist）的结构，能在 O(log N) 内完成
          「按分数排序、查名次、取一段区间」——这些恰好是排行榜的全部需求。这一章把跳表讲透。
        </p>
      </Lead>

      <h2>ZSet 的底层：跳表 + 字典，一个都不能少</h2>
      <p>
        当 ZSet 元素变多（超过 <code>zset-max-listpack-entries</code>，默认 128）后，它的底层编码会从 listpack 切成
        <strong>跳表（skiplist）加字典（dict）的组合</strong>。这两个结构存的是同一批数据，但各管一头：
      </p>
      <ul>
        <li><strong>字典 dict</strong>：保存「member → score」的映射，让 <code>ZSCORE member</code>（按成员查分数）做到 O(1)。</li>
        <li><strong>跳表 skiplist</strong>：按 score 从小到大把成员串起来，支持<strong>按分数排序、范围查询、查排名</strong>，都是 O(log N)。</li>
      </ul>
      <p>
        两个结构的成员对象是<strong>共享</strong>的（指针指向同一份），所以不会双倍存数据。一句话：
        字典负责「按名字找分数」，跳表负责「按分数找排序」，配合起来 ZSet 才能既快查分又快排序。
        没有字典，<code>ZSCORE</code> 就得在跳表里 O(N) 找成员；没有跳表，<code>ZRANGE</code> 就得给字典全量排序——缺一不可。
      </p>

      <h3>跳表是什么：给链表加「快速通道」</h3>
      <p>
        想象一个按分数排好序的<em>有序链表</em>，查一个值得从头一个个走，O(N)。跳表的聪明之处是：在原始链表之上，
        随机给一部分节点<strong>加几层索引</strong>，高层索引节点稀疏、跨度大，像高速路的服务区。查找时<strong>从最高层开始，
        能跳就跳</strong>，跳过头了就下降一层、继续逼近目标，逐层下沉直到命中。
      </p>
      <p>
        因为每层的节点数大约是下一层的一半，层数约为 log N，所以查找、插入、删除都是 <strong>O(log N)</strong>。
        范围查询更是跳表的强项：先 O(log N) 定位到区间起点，然后沿最底层链表<strong>顺着指针往后扫</strong>即可，
        这正是 <code>ZRANGE</code> / <code>ZRANGEBYSCORE</code> 高效的原因。
      </p>

      <SkipList />

      <h3>层高怎么定？为什么是随机的</h3>
      <p>
        跳表不靠旋转、变色这类复杂操作维持平衡，而是靠<strong>随机层高</strong>。每插入一个新节点，就抛硬币决定它的层数：
        Redis 用概率 <code>p = 0.25</code>，即一个节点有 1/4 概率多升一层，期望层高约 1.33，最高 32 层（足以支撑约 2³² 个元素）。
        随机化让整张表在统计意义上保持「上稀下密」的平衡，避免了树结构那套旋转逻辑。下面是跳表节点的真实结构，
        注意 <code>span</code> 字段——它是查排名（<code>ZRANK</code>）能做到 O(log N) 的关键：
      </p>
      <CodeBlock lang="text" title="zskiplistNode 结构与排序键" code={skiplistStruct} />
      <p>
        一个易被忽略的点：跳表的排序键是 <strong>(score, member)</strong> 二元组。分数相同时按成员名的<strong>字典序</strong>排，
        这样保证全序、排名唯一，也让 <code>ZRANGEBYLEX</code>（同分时按字典序取区间）有了意义。
      </p>

      <Example title="游戏排行榜 Top10 怎么落地">
        <p>
          一个有上万玩家的游戏排行榜，用 ZSet 只需要几条命令就搞定，而且全是 O(log N) 级别：
        </p>
        <ul>
          <li><strong>加分</strong>：玩家得分用 <code>ZINCRBY game:rank 50 carol</code> 原子累加，不用读出来再写回。</li>
          <li><strong>Top10</strong>：<code>ZREVRANGE game:rank 0 9 WITHSCORES</code> 直接拿到分数最高的前 10 名及分数。</li>
          <li><strong>查我的名次</strong>：<code>ZREVRANK game:rank alice</code> 得到从高到低的排名，前端显示「你排第 N 名」。</li>
        </ul>
        <p>
          换成关系型数据库，每刷新一次排行榜都要 <code>ORDER BY score DESC LIMIT 10</code> 全表排序，上万玩家高并发下直接崩；
          ZSet 因为数据天然按分数有序，取 Top10 几乎零成本。
        </p>
      </Example>

      <Callout variant="info" title="实战进阶：同分如何按时间排序">
        <p>
          排行榜常有个需求：分数相同时，<strong>先达到的人排前面</strong>。但 ZSet 同分是按成员字典序排的，不满足这个需求。
          经典技巧是把<strong>时间编码进 score</strong>：用一个 double，整数部分放分数、小数部分放
          「（最大时间戳 - 当前时间戳）/ 一个大常数」，让早到的时间换算出更大的 score。或者更稳妥地用
          <code>score * 10^13 + (maxTs - ts)</code> 这种「高位放分、低位放时间」的复合分值。这是排行榜面试的高频追问。
        </p>
      </Callout>

      <h2>为什么用跳表，不用红黑树？</h2>
      <p>
        平衡二叉树（红黑树、AVL）同样能做到 O(log N) 的有序操作，但 Redis 作者偏偏选了跳表，原因很实际：
      </p>
      <ul>
        <li>
          <strong>范围查询更友好</strong>：跳表最底层就是一条有序链表，定位到起点后顺着指针扫一段即可；
          红黑树取区间得做中序遍历、来回上下跳节点，实现和效率都更别扭。<code>ZRANGE</code> 这种区间操作 ZSet 用得极多。
        </li>
        <li>
          <strong>实现简单、易维护</strong>：跳表插入删除只需调整少数几个指针，靠随机层高保持平衡，没有红黑树那套
          复杂的旋转和变色逻辑，代码少、出 bug 概率低。
        </li>
        <li>
          <strong>更易做并发/演进</strong>：跳表的局部修改特性，让它在需要并发或迭代时比树结构更容易处理。
        </li>
        <li>
          <strong>内存可调</strong>：通过调小概率 p 可以减少层数、省内存；树结构的内存开销是固定的。
        </li>
      </ul>

      <KeyIdea title="ZSet = 字典(O(1)查分) + 跳表(O(log N)排序)">
        <p>
          记住这个组合就抓住了 ZSet 的精髓：任何「既要按 key 精确查，又要按值排序/取区间」的需求，
          ZSet 都是首选。排行榜、带权重的去重列表、按时间排序的延时队列，本质都是这同一个能力的不同包装。
        </p>
      </KeyIdea>

      <h3>延时队列：把「到期时间」当 score</h3>
      <p>
        ZSet 还有个经典用法是<strong>延时队列</strong>：把任务的<em>到期时间戳</em>当作 score，任务 ID 当 member。
        消费者只需周期性地 <code>ZRANGEBYSCORE delay:queue 0 当前时间</code>，就能一次性捞出所有「已经到期」的任务来执行。
        订单 30 分钟未支付自动关闭、消息延迟推送，都能这么实现。
      </p>
      <Callout variant="warn" title="延时队列的坑">
        <ul>
          <li>
            「取出 + 删除」必须<strong>原子</strong>，否则多个消费者会重复消费同一个任务——生产中用 Lua 脚本把
            <code>ZRANGEBYSCORE</code> 和 <code>ZREM</code> 包成一步。
          </li>
          <li>
            轮询有延迟和空转开销，对实时性极高或量极大的场景，更适合用专门的消息队列（如 Kafka、RabbitMQ 延迟插件）。
          </li>
          <li>
            单个 ZSet 太大时操作会变慢，可按「到期时间分桶」拆成多个 ZSet（如每分钟一个 key），分摊压力。
          </li>
        </ul>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「排行榜为什么用 ZSet」，标准答法三句话：一是 <strong>ZSet 底层是跳表 + 字典</strong>，字典保证 O(1) 查分、
        跳表保证 O(log N) 排序和范围查询；二是<strong>排行榜的核心操作（加分、取 Top N、查名次）正好都被跳表覆盖</strong>，
        而数据库要全表排序扛不住高并发；三是<strong>跳表相比红黑树更适合范围查询、实现也更简单</strong>。
      </p>
      <p>
        常见追问：「跳表怎么查排名？」——靠每层指针上的 <code>span</code>（跨度），查找路径上把 span 累加起来就是排名。
        「层高怎么定？」——随机，Redis 用 p=0.25、最高 32 层。「同分怎么排？」——按成员字典序，要按时间排需把时间编码进 score。
        「为什么不用 B+ 树？」——B+ 树为磁盘 IO 优化（减少树高），而 ZSet 全在内存，跳表实现更简单、范围扫描同样高效。
      </p>

      <Practice title="动手做一个排行榜 + 延时队列">
        <p>
          先用几条命令把游戏排行榜跑起来，体会 <code>ZINCRBY</code> / <code>ZREVRANGE</code> / <code>ZREVRANK</code> 的配合：
        </p>
        <CodeBlock lang="bash" title="排行榜" code={rankCmd} />
        <p>
          再把范围、排名、分页命令都摸一遍，这是 ZSet 真正的威力所在：
        </p>
        <CodeBlock lang="bash" title="范围与排名命令全家桶" code={moreZsetCmd} />
        <p>
          再用同一个 ZSet 实现延时队列，把到期时间戳当分数：
        </p>
        <CodeBlock lang="bash" title="延时队列" code={delayCmd} />
        <p>
          最后用 <code>OBJECT ENCODING</code> 观察 ZSet 何时从 listpack 切到 skiplist：
        </p>
        <CodeBlock lang="bash" title="编码切换" code={encCmd} />
      </Practice>

      <Summary
        points={[
          'ZSet 底层是「跳表 skiplist + 字典 dict」的组合：字典管 O(1) 按成员查分，跳表管 O(log N) 排序与范围查询。',
          '跳表是给有序链表加多层稀疏索引，查找时从高层「能跳就跳」逐层下降，复杂度 O(log N)。',
          '层高随机生成(Redis 用 p=0.25、最高32层)，靠随机化保持平衡，无需旋转变色；span 跨度让查排名也是 O(log N)。',
          '排序键是 (score, member)：同分按成员字典序，要按时间排需把时间编码进 score。',
          '范围查询是跳表强项：定位起点后沿最底层链表顺扫，这是 ZRANGE/ZRANGEBYSCORE 高效的根本。',
          '选跳表不选红黑树/B+树：范围查询更友好、实现更简单、内存可调、更易并发与演进。',
          '排行榜用 ZADD/ZINCRBY 加分、ZREVRANGE 取 TopN、ZREVRANK 查名次；延时队列把到期时间戳当 score，取删用 Lua 保证原子。',
        ]}
      />
    </>
  )
}
