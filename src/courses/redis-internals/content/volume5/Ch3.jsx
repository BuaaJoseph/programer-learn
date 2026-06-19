import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const persistConf = `# RDB：周期性把整个内存快照写成一个二进制文件
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb

# AOF：把每条写命令追加到日志文件，重启时重放恢复
appendonly yes
appendfsync everysec    # always/everysec/no
aof-use-rdb-preamble yes  # 7.0 起默认混合持久化`

const bgsaveCmd = `# bgsave：主进程 fork 出子进程，由子进程负责把内存写成 RDB
127.0.0.1:6379> bgsave
Background saving started

# fork 期间主进程继续对外服务，靠 COW（写时复制）保证一致性`

const maxmemoryConf = `# 内存上限与淘汰策略
maxmemory 4gb
maxmemory-policy allkeys-lru   # 内存满后的淘汰策略，默认 noeviction

# 八种策略：
# noeviction        默认，不淘汰，写直接报错
# allkeys-lru       所有 key 里淘汰最久未用
# allkeys-lfu       所有 key 里淘汰最少使用
# allkeys-random    所有 key 里随机淘汰
# volatile-lru      只在设了过期的 key 里淘汰最久未用
# volatile-lfu      只在设了过期的 key 里淘汰最少使用
# volatile-random   只在设了过期的 key 里随机淘汰
# volatile-ttl      只在设了过期的 key 里淘汰最快过期的`

const bigKeyCmd = `# 找大 Key：bigkeys 抽样扫描各类型最大的 key
$ redis-cli --bigkeys

# 精确看一个 key 占多少内存
127.0.0.1:6379> memory usage user:123

# 安全删除大 Key：用 UNLINK 异步删，避免 DEL 阻塞主线程
127.0.0.1:6379> unlink huge:hash

# 内存碎片率：INFO memory 里 mem_fragmentation_ratio
127.0.0.1:6379> info memory
mem_fragmentation_ratio:1.45   # >1.5 碎片偏多
# 开启自动碎片整理（4.0+）
config set activedefrag yes`

export default function Ch3() {
  return (
    <article>
      <Lead>
        本章讲「持久化与内存」相关的面试题：RDB 与 AOF 两种持久化机制、生成 RDB 时怎么不阻塞请求、
        过期数据的删除策略、八种内存淘汰策略、内存碎片化及优化、历史上的虚拟内存 VM 机制、
        以及大 Key 与热点 Key 这两个高频问题怎么处理。
      </Lead>

      <h2>一、持久化机制：RDB 与 AOF</h2>
      <KeyIdea>
        RDB 是<strong>某一时刻的内存快照</strong>（二进制、小、恢复快，但可能丢最近几分钟数据）；
        AOF 是<strong>把每条写命令追加成日志</strong>（更全、可控、文件大、恢复慢）。
        生产常两者结合，7.0 起默认<strong>混合持久化</strong>。
      </KeyIdea>
      <CodeBlock lang="bash" title="RDB 与 AOF 配置" code={persistConf} />
      <table>
        <thead>
          <tr><th>对比</th><th>RDB</th><th>AOF</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>内存快照</td><td>写命令日志</td></tr>
          <tr><td>文件大小</td><td>小（紧凑二进制）</td><td>大（文本命令）</td></tr>
          <tr><td>恢复速度</td><td>快</td><td>慢（要重放命令）</td></tr>
          <tr><td>数据安全</td><td>可能丢两次快照间的数据</td><td>everysec 最多丢 1 秒</td></tr>
          <tr><td>对性能影响</td><td>fork 时有瞬时抖动</td><td>持续追加 + 重写</td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="混合持久化">
        7.0 起 AOF 重写后的文件 = 「RDB 格式的全量快照（头部）+ 之后增量的 AOF 命令（尾部）」。
        既享受 RDB 恢复快，又享受 AOF 丢数据少。
      </Callout>

      <h2>二、生成 RDB 时如何处理请求</h2>
      <p>
        这是必考题。答案核心是 <strong>fork + 写时复制（Copy-On-Write）</strong>。
      </p>
      <CodeBlock lang="bash" title="bgsave 的工作方式" code={bgsaveCmd} />
      <ul>
        <li>主进程调用 <code>fork()</code> 出一个<strong>子进程</strong>，由子进程负责把内存写成 RDB 文件。</li>
        <li>fork 后父子进程<strong>共享同一份物理内存页</strong>，主进程可以继续处理读写请求，不阻塞。</li>
        <li>当主进程<strong>修改</strong>某个内存页时，操作系统才<strong>复制</strong>那一页给主进程改
          （写时复制），子进程看到的仍是 fork 那一刻的旧数据，保证快照一致性。</li>
      </ul>
      <Callout variant="warn" title="两个坑">
        ① fork 本身要复制页表，<strong>内存越大 fork 越慢</strong>，会有瞬时延迟尖刺。
        ② 如果 fork 期间写入很频繁，COW 会复制大量页，<strong>内存可能翻倍</strong>。
        生产常让从库做持久化、或错峰执行。<code>save</code> 命令是同步阻塞的，生产基本只用 <code>bgsave</code>。
      </Callout>

      <h2>三、过期数据的删除策略</h2>
      <p>
        给 key 设了 TTL，到期后 Redis 怎么删？答案是<strong>惰性删除 + 定期删除</strong>组合，
        不存在「一到点就立刻删」。
      </p>
      <table>
        <thead>
          <tr><th>策略</th><th>做法</th><th>优缺点</th></tr>
        </thead>
        <tbody>
          <tr><td>惰性删除</td><td>访问 key 时才检查是否过期，过期才删</td><td>省 CPU，但过期 key 不被访问就一直占内存</td></tr>
          <tr><td>定期删除</td><td>每隔一段时间随机抽一批带 TTL 的 key 检查删除</td><td>折中：限制每次时长，避免抽查阻塞</td></tr>
        </tbody>
      </table>
      <p>
        Redis 同时用这两种：访问时惰性删，后台定期随机抽查删。两者都漏掉的过期 key，
        最终由<strong>内存淘汰策略</strong>兜底。
      </p>

      <h2>四、内存淘汰策略</h2>
      <p>
        当内存达到 <code>maxmemory</code>，再写入时按 <code>maxmemory-policy</code> 淘汰部分 key。
        共<strong>八种</strong>，按「作用范围（所有 key / 仅带过期的 key）× 淘汰依据（LRU/LFU/random/ttl）」组合。
      </p>
      <CodeBlock lang="bash" title="maxmemory 与八种淘汰策略" code={maxmemoryConf} />
      <ul>
        <li><strong>LRU</strong>（最久未使用）：Redis 是近似 LRU，靠抽样而非维护完整链表，省内存。</li>
        <li><strong>LFU</strong>（最少使用，4.0+）：按访问频率淘汰，更适合有明显冷热的场景。</li>
        <li><strong>默认是 noeviction</strong>：内存满后写命令直接报错，读和删仍可用。</li>
      </ul>
      <Callout variant="tip" title="怎么选">
        纯缓存场景常用 <code>allkeys-lru</code> 或 <code>allkeys-lfu</code>；
        Redis 同时存「缓存 + 不能丢的数据」时用 <code>volatile-*</code>，只淘汰设了过期的缓存 key。
      </Callout>

      <h2>五、内存碎片化及优化</h2>
      <p>
        Redis 用 jemalloc 分配内存，按固定档位分配；频繁的不等长分配/释放会让
        <strong>已申请但没法被复用的空隙</strong>累积，这就是内存碎片。
        指标是 <code>mem_fragmentation_ratio = 操作系统给的内存 / Redis 实际用的内存</code>，
        大于 1.5 就偏多。
      </p>
      <ul>
        <li><strong>自动碎片整理</strong>：4.0 起 <code>activedefrag yes</code>，在线把数据搬到紧凑的内存块。</li>
        <li><strong>重启</strong>：重启后从 RDB/AOF 重新加载，内存重新紧凑分配（代价是停机/切主）。</li>
        <li>避免大量大小不一的 value 频繁增删。</li>
      </ul>

      <h2>六、虚拟内存 VM 机制（历史）</h2>
      <p>
        早期 Redis（2.x）曾有过 <strong>VM（Virtual Memory）</strong>机制：内存放不下时
        把<strong>冷数据的 value 换出到磁盘</strong>，只在内存保留 key，访问时再换入。
        但它带来复杂度高、随机磁盘 IO 慢、与内存数据库定位冲突等问题，
        <strong>早已被废弃移除</strong>。如今需要「冷热分层 / 超出内存」时，正确做法是上 Cluster 分片或用
        其它存储，而不是 VM。面试问到能点明「VM 是历史特性、已废弃」即可。
      </p>

      <h2>七、Big Key 问题</h2>
      <KeyIdea>
        大 Key 指 value 很大或集合元素特别多的 key（如几 MB 的 String、上百万元素的 Hash/ZSet）。
        危害：读写慢、网络阻塞、删除/迁移卡顿、内存分布不均。
      </KeyIdea>
      <CodeBlock lang="bash" title="排查与处理 Big Key" code={bigKeyCmd} />
      <ul>
        <li><strong>排查</strong>：<code>redis-cli --bigkeys</code> 抽样、<code>MEMORY USAGE</code> 精确测量。</li>
        <li><strong>拆分</strong>：把一个大 Hash 拆成多个小 Hash（按字段哈希分桶），化整为零。</li>
        <li><strong>删除</strong>：用 <code>UNLINK</code> 异步删除，别用 <code>DEL</code>（同步删大 Key 会长时间阻塞主线程）。</li>
        <li><strong>预防</strong>：设计时控制单 key 体积与集合规模，必要时设 TTL。</li>
      </ul>

      <h2>八、热点 Key 问题</h2>
      <p>
        热点 Key 指某个 key 被极高频访问（如爆款商品、明星动态），瞬间把单个分片的某个节点打爆。
      </p>
      <table>
        <thead>
          <tr><th>方案</th><th>做法</th></tr>
        </thead>
        <tbody>
          <tr><td>本地缓存</td><td>在应用层加一层 JVM 本地缓存（如 Caffeine），热点请求不到 Redis</td></tr>
          <tr><td>多副本分散</td><td>把热点 key 复制成 <code>hot:1</code>...<code>hot:N</code> 打散到不同节点，读时随机选一个</td></tr>
          <tr><td>读写分离</td><td>用多个从库分摊热点读流量</td></tr>
          <tr><td>提前发现</td><td>用 <code>--hotkeys</code>（需 LFU 策略）或监控发现热点</td></tr>
        </tbody>
      </table>
      <Example title="热点 Key vs 大 Key 别混淆">
        <p>大 Key 是<strong>单个 key 太大</strong>（空间问题）；热点 Key 是<strong>单个 key 被访问太频繁</strong>
          （流量问题）。两者成因和解法完全不同，面试容易混着答，要分清。</p>
      </Example>
      <p>
        <strong>面试追问：删除大 Key 为什么会卡？</strong>因为 <code>DEL</code> 是同步的：释放一个有几百万
        元素的 Hash/ZSet，要逐个释放每个元素的内存，这个过程在<strong>主线程</strong>里跑，期间无法处理
        其它命令，可能卡顿几百毫秒甚至秒级。<code>UNLINK</code>（4.0+）则把真正的内存回收交给
        <strong>后台 lazyfree 线程</strong>，主线程只做「解除引用」这一步，立刻返回。同理，
        <code>FLUSHDB</code>/<code>FLUSHALL</code> 也有 <code>ASYNC</code> 选项异步清空。
      </p>
      <Callout variant="tip" title="过期与淘汰串起来记">
        过期删除（惰性+定期）针对的是「设了 TTL 的 key 到点该不该删」；内存淘汰针对的是「内存不够时
        主动腾地方」。前者是被动清理已过期数据，后者是内存压力下的主动取舍，两个机制互补，别混为一谈。
      </Callout>
      <p>
        <strong>面试追问：从库上的过期 key 会怎样？</strong>这是个经典坑。<strong>从库不会主动删除过期
        key</strong>，它只听主库的：主库删了某个过期 key，会向从库发一条 <code>DEL</code> 命令，从库才删。
        在主库发出 DEL 之前，<strong>从库读这个已过期的 key 仍可能返回旧值</strong>（老版本行为）。
        这样设计是为了保证主从数据一致、避免从库自作主张删出分歧。理解这点能解释「为什么从库偶尔读到本该
        过期的数据」。
      </p>

      <Summary
        points={[
          'RDB 是内存快照（小、恢复快、可能丢数据）；AOF 是命令日志（全、丢得少、文件大）；7.0 默认混合持久化。',
          '生成 RDB 靠 fork 子进程 + 写时复制（COW），主进程不阻塞；坑是 fork 慢与写多时内存翻倍。',
          '过期删除 = 惰性删除（访问时）+ 定期删除（后台随机抽查），漏网的由淘汰策略兜底。',
          '内存淘汰共八种：allkeys/volatile × lru/lfu/random/ttl，默认 noeviction；LRU 是近似抽样实现。',
          '内存碎片看 mem_fragmentation_ratio，>1.5 偏多，可开 activedefrag 在线整理或重启重载。',
          'VM 虚拟内存是早期换出冷数据到磁盘的机制，因复杂慢已废弃；超内存应上 Cluster 而非 VM。',
          'Big Key（空间大）用拆分 + UNLINK 异步删；热点 Key（访问频繁）用本地缓存/多副本打散/读写分离，二者勿混淆。',
        ]}
      />
    </article>
  )
}
