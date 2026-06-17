import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cacheAsideSnippet = `// Cache Aside 读流程 + 防击穿（互斥锁 + 缓存空值防穿透）
public Object get(String key) {
    Object v = redis.get(key);
    if (v != null) return v;                 // 命中（含命中"空值"占位）
    String lockKey = "lock:" + key;
    if (redis.setnx(lockKey, "1", 3)) {      // 抢锁，只放一个线程查 DB
        try {
            Object db = mysql.query(key);
            if (db == null) {
                redis.set(key, "", 60);      // 缓存空值，短 TTL，防穿透
            } else {
                redis.set(key, db, 600 + rand(300)); // 随机 TTL，防雪崩
            }
            return db;
        } finally { redis.del(lockKey); }
    } else {
        Thread.sleep(50);                    // 没抢到锁，稍等重试
        return get(key);
    }
}`

const bloomCmd = `# 布隆过滤器：用 RedisBloom 模块或纯 Bitmap 自己实现
# RedisBloom 模块（推荐）：
127.0.0.1:6379> bf.reserve users 0.001 1000000   # 误判率 0.1%，预估 100 万
127.0.0.1:6379> bf.add users u123
127.0.0.1:6379> bf.exists users u123
(integer) 1
127.0.0.1:6379> bf.exists users u999
(integer) 0      # 一定不存在

# 纯 Bitmap 自实现：k 个哈希函数把元素映射到 k 个 bit 位
127.0.0.1:6379> setbit bloom 1234 1
127.0.0.1:6379> getbit bloom 1234`

const hllCmd = `# HyperLogLog 统计 UV：固定约 12KB 估算上亿基数，误差约 0.81%
127.0.0.1:6379> pfadd uv:20260617 user1 user2 user3
127.0.0.1:6379> pfadd uv:20260617 user1            # 重复不会重复计
127.0.0.1:6379> pfcount uv:20260617
(integer) 3
# 合并多天去重后的总 UV
127.0.0.1:6379> pfmerge uv:week uv:20260616 uv:20260617
127.0.0.1:6379> pfcount uv:week`

const rankCmd = `# 排行榜：ZSet 按分数排序
127.0.0.1:6379> zadd rank 1500 alice 2300 bob 1800 carol
127.0.0.1:6379> zincrby rank 100 alice          # alice 加 100 分
127.0.0.1:6379> zrevrange rank 0 9 withscores   # Top 10（降序）
127.0.0.1:6379> zrevrank rank bob               # 查某人排名（从 0 起）
(integer) 0`

export default function Ch2() {
  return (
    <article>
      <Lead>
        本章是缓存实战高频题：缓存击穿、穿透、雪崩怎么分清与解决，缓存与数据库的一致性方案，
        用 Redis 实现布隆过滤器，用 HyperLogLog 统计 UV，以及用 ZSet 实现排行榜。
      </Lead>

      <h2>一、缓存穿透、击穿、雪崩</h2>
      <KeyIdea>
        三者本质都是「请求绕过或压垮缓存直冲数据库」，但成因不同：
        <strong>穿透</strong>是查根本不存在的数据；<strong>击穿</strong>是单个热点 key 失效瞬间被并发打穿；
        <strong>雪崩</strong>是大量 key 同时失效或 Redis 宕机。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>问题</th><th>成因</th><th>解决</th></tr>
        </thead>
        <tbody>
          <tr><td>穿透</td><td>查不存在的数据，缓存永不命中，全打 DB</td><td>缓存空值（短 TTL）+ 布隆过滤器 + 参数校验</td></tr>
          <tr><td>击穿</td><td>单个超热点 key 过期瞬间，大量并发同时查 DB</td><td>互斥锁（只放一个查 DB）+ 逻辑过期（不真过期，后台异步刷新）</td></tr>
          <tr><td>雪崩</td><td>大批 key 同时过期 / Redis 整体宕机</td><td>随机过期时间 + 多级缓存 + 高可用集群 + 熔断限流</td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="击穿 vs 雪崩一句话">
        击穿是「一个点」被打穿（单个热点 key）；雪崩是「一大片」同时塌（大量 key 或整个 Redis）。
        所以击穿靠互斥锁/逻辑过期保单点，雪崩靠打散过期时间 + 高可用保整体。
      </Callout>
      <CodeBlock lang="java" title="一段代码同时防三害" code={cacheAsideSnippet} />

      <h2>二、缓存与数据库一致性</h2>
      <p>
        只要数据有缓存和 DB 两份副本，并发下就有不一致窗口。主流是 <strong>Cache Aside</strong>：
        读走缓存（未命中查 DB 回填），写则<strong>更新 DB 后删除缓存</strong>（而不是更新缓存）。
      </p>
      <table>
        <thead>
          <tr><th>方案</th><th>做法</th><th>适用/局限</th></tr>
        </thead>
        <tbody>
          <tr><td>先更 DB 再删缓存</td><td>Cache Aside 标准做法</td><td>极端并发仍有小概率不一致，最常用</td></tr>
          <tr><td>延迟双删</td><td>更新前删一次，更新后延迟再删一次</td><td>缓解「读到旧值又回填」的并发窗口</td></tr>
          <tr><td>订阅 binlog</td><td>用 Canal 监听 MySQL binlog 异步删缓存</td><td>解耦、可靠，但有异步延迟、架构重</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="为什么是删缓存而不是更新缓存">
        删除是惰性的——下次读时才回填最新值，避免「两个写并发更新缓存」的乱序覆盖，
        也省去算复杂派生值的开销。这是 Cache Aside 的核心取舍。强一致请用分布式锁或直接读 DB。
      </Callout>
      <p>
        <strong>面试追问：为什么不先删缓存再更新 DB？</strong>这个顺序更危险：删缓存后、更新 DB 前，
        若来了一个读请求，会把<strong>旧的 DB 值</strong>回填进缓存，然后 DB 才被更新——缓存就此长期是旧值，
        直到下次过期。而「先更 DB 再删缓存」即便出现并发，不一致窗口也极短（仅限读请求恰好卡在
        「查到旧 DB 值」和「写缓存」之间，且写线程的删除又恰好发生在这之前），概率低得多。
      </p>
      <p>
        <strong>面试追问：删缓存失败了怎么办？</strong>更新 DB 成功但删缓存失败，缓存就是脏的。
        兜底有两招：① 给删除操作加<strong>重试</strong>（失败丢进消息队列异步重试）；
        ② 用<strong>订阅 binlog</strong> 的方式，由 Canal 监听到 DB 变更后再去删缓存，把「删缓存」
        从业务代码里解耦出来，可靠性更高。这也是为什么大厂偏爱 binlog 方案。
      </p>

      <h2>三、用 Redis 实现布隆过滤器</h2>
      <KeyIdea>
        布隆过滤器用一个位数组 + k 个哈希函数判断「元素<strong>一定不存在</strong>或<strong>可能存在</strong>」。
        有<strong>误判（假阳性）但无漏判</strong>：说不存在就一定不存在，说存在可能是误判。常用来挡缓存穿透。
      </KeyIdea>
      <CodeBlock lang="bash" title="RedisBloom 模块 / Bitmap 自实现" code={bloomCmd} />
      <ul>
        <li><strong>原理</strong>：加元素时用 k 个哈希把它映射到 k 个 bit 置 1；查询时若任一 bit 为 0 则一定不存在。</li>
        <li><strong>误判来源</strong>：不同元素哈希到相同 bit，导致「碰巧都为 1」误以为存在。</li>
        <li><strong>不能删</strong>：普通布隆过滤器无法删除元素（删了会影响别的元素），需要删用 Cuckoo Filter 或计数布隆。</li>
      </ul>
      <p>
        <strong>面试追问：误判率怎么权衡？</strong>误判率由「位数组长度 m、哈希函数个数 k、元素个数 n」共同决定。
        m 越大、k 越合适，误判越低，但占的内存越多。RedisBloom 让你直接指定期望误判率和预估容量，
        它会自动算出 m 和 k。<strong>挡缓存穿透时，误判（把不存在的当成可能存在）只会让这次请求多查一次
        DB，无害；而布隆「说不存在」是绝对可靠的，正好用来拦截海量不存在的查询。</strong>
      </p>
      <p>
        <strong>面试追问：元素会变多怎么办？</strong>普通布隆容量是固定的，元素超过预估后误判率飙升。
        应对是用<strong>可扩展布隆过滤器</strong>（容量满了再叠一层新的），或一开始就按上限的若干倍预留容量。
        另外布隆里的数据要和 DB <strong>预热同步</strong>——上线前把已有 key 全灌进去，新增 key 写 DB 时
        同步 <code>BF.ADD</code>，否则新数据会被布隆误判为「不存在」而漏掉。
      </p>

      <h2>四、统计 UV：HyperLogLog</h2>
      <p>
        统计去重的独立访客数（UV），如果用 Set 存所有用户 ID，上亿用户会占巨量内存。
        <strong>HyperLogLog（HLL）</strong>用概率算法，固定约 <strong>12KB</strong> 就能估算上亿基数，
        标准误差约 <strong>0.81%</strong>。
      </p>
      <CodeBlock lang="bash" title="PFADD / PFCOUNT / PFMERGE" code={hllCmd} />
      <Callout variant="info" title="HLL 的取舍">
        HLL 用极小空间换「<strong>近似</strong>计数」：只能要总数，<strong>不能判断某个具体用户是否来过</strong>，
        也有约 0.81% 误差。要精确去重或要查具体成员，还得用 Set/Bitmap。
      </Callout>
      <p>
        <strong>面试追问：HLL、Set、Bitmap 怎么选？</strong>三者都能做去重统计，但取舍不同：
      </p>
      <table>
        <thead>
          <tr><th>方案</th><th>空间</th><th>精度</th><th>能否查具体成员</th></tr>
        </thead>
        <tbody>
          <tr><td>Set</td><td>大（存全部 ID）</td><td>精确</td><td>能</td></tr>
          <tr><td>Bitmap</td><td>中（ID 当下标，1 位/用户）</td><td>精确</td><td>能（GETBIT）</td></tr>
          <tr><td>HyperLogLog</td><td>极小（约 12KB 封顶）</td><td>约 0.81% 误差</td><td>不能</td></tr>
        </tbody>
      </table>
      <p>
        UV 这类「只要个总数、能容忍小误差、量级上亿」的场景选 HLL；要精确且用户 ID 连续紧凑，
        用 Bitmap（还能 BITCOUNT 数活跃、做签到）；要既精确又能查某人是否来过，用 Set（但内存代价大）。
        <strong>HLL 的原理</strong>简单说是：对每个元素哈希后看二进制里「前导 0 的最大个数」，
        前导 0 越多意味着见过的不同元素越多（罕见模式出现说明样本大），再用分桶取调和平均来降低方差，
        从而用极小空间估算基数。
      </p>

      <h2>五、实现排行榜</h2>
      <p>
        排行榜是 ZSet 的招牌场景：成员是用户、分数是积分，ZSet 天然按分数排序，
        加分、查 TopN、查名次都是 O(log N)。
      </p>
      <CodeBlock lang="bash" title="ZSet 实现排行榜" code={rankCmd} />
      <Example title="进阶：同分排序与时间衰减">
        <p>同分时想让先达到的人排前面，可以把分数设计成 <code>score = 积分 * 大常数 - 时间戳</code>，
          用一个 double 同时编码「积分主序 + 时间次序」。需要日榜/周榜就按时间维度建不同 key。</p>
      </Example>
      <p>
        <strong>面试追问：ZSet 的 score 是 double，精度够吗？</strong>ZSet 分数是 64 位浮点
        （double），能精确表示的整数上限约 <strong>2^53</strong>。所以用「积分 × 大常数 − 时间戳」
        编码组合排序时，要保证组合后的值不超过 2^53，否则会丢精度、排序错乱。如果积分范围大、又要叠时间，
        可能需要拆成两级 ZSet 或改用别的编码方式。
      </p>
      <p>
        <strong>面试追问：榜单数据量很大、还要实时怎么办？</strong>千万级用户的全量榜，ZSet 单 key 会变成
        大 Key。常见做法：① 只维护 <strong>Top N</strong>（如前 1000 名）的 ZSet，长尾用户不进榜；
        ② 按维度<strong>分片</strong>（地区榜、分组榜），各自小 ZSet；③ 日榜/周榜用带日期的 key 并设 TTL
        自动清理。查个人排名超出榜单范围时，回退到离线计算或近似排名。
      </p>
      <Callout variant="tip" title="三害 + 工具题串起来记">
        穿透/击穿/雪崩是「缓存被打穿」的三种形态；布隆挡穿透、HLL 省内存数 UV、ZSet 做榜单，
        都是用对结构解对问题。面试时先点清问题本质，再给结构和命令，最后补一句取舍，层次就出来了。
      </Callout>
      <p>
        <strong>面试追问：逻辑过期是什么，凭什么也能防击穿？</strong>互斥锁防击穿的代价是「没抢到锁的线程要等」，
        体验略差。<strong>逻辑过期</strong>换个思路：缓存的 value 里额外存一个<strong>逻辑过期时间字段</strong>，
        key 本身在 Redis 里<strong>永不真正过期</strong>。读到 value 后判断逻辑时间是否到期：没到期直接用；
        到期了就<strong>返回旧值的同时</strong>，异步起一个线程去刷新缓存。这样请求永远命中、永远不直冲 DB，
        代价是「过期后短暂返回的是旧数据」——拿一致性换可用性，适合热点榜单这类能容忍短暂旧值的场景。
      </p>

      <Summary
        points={[
          '穿透=查不存在的数据（缓存空值+布隆挡）；击穿=单热点 key 失效（互斥锁/逻辑过期）；雪崩=大批 key 同时失效或宕机（随机 TTL+多级缓存+高可用）。',
          '一致性主流是 Cache Aside：先更 DB 再删缓存；延迟双删缓解并发窗口；订阅 binlog（Canal）异步删更可靠但有延迟。',
          '删缓存而非更新缓存：避免并发乱序覆盖、省派生计算；强一致需分布式锁或直读 DB。',
          '布隆过滤器：位数组+k 个哈希，有假阳性无漏判，说不存在就一定不存在，常挡穿透；普通版不能删元素。',
          'HyperLogLog 用约 12KB 估算上亿基数（误差约 0.81%），PFADD/PFCOUNT/PFMERGE，只能要总数不能查具体成员。',
          '排行榜用 ZSet：ZADD/ZINCRBY 加分、ZREVRANGE 取 TopN、ZREVRANK 查名次，均 O(log N)。',
          '排行榜进阶可用「积分*常数 - 时间戳」编码同分先后，按日/周建不同 key 做时间维度榜单。',
        ]}
      />
    </article>
  )
}
