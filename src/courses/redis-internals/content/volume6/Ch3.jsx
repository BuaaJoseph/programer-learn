import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const multiCmd = `# Redis 事务：MULTI 开启，命令先入队，EXEC 一次性顺序执行
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> incr count
QUEUED                       # 命令只是入队，不立即执行
127.0.0.1:6379> incr stock
QUEUED
127.0.0.1:6379> EXEC         # 顺序执行队列里的命令
1) (integer) 1
2) (integer) 99

# WATCH 实现乐观锁：被监视的 key 在 EXEC 前被改动则事务取消
127.0.0.1:6379> WATCH stock
127.0.0.1:6379> MULTI
127.0.0.1:6379> decr stock
127.0.0.1:6379> EXEC        # 若 stock 期间被别人改过，返回 nil（事务作废）`

const luaCmd = `# Lua 脚本：服务端原子执行一整段逻辑，期间不会被其它命令插入
127.0.0.1:6379> eval "
  local stock = tonumber(redis.call('get', KEYS[1]))
  if stock <= 0 then return 0 end
  redis.call('decr', KEYS[1])
  return 1
" 1 stock

# 秒杀扣库存就靠这种"判断+扣减"原子脚本，避免超卖`

const pipelineSnippet = `// Pipeline：客户端把多条命令打包一次性发出，减少网络往返(RTT)
// 注意：Pipeline 不保证原子性，只是批量发送 + 批量收响应
Pipeline p = jedis.pipelined();
for (int i = 0; i < 1000; i++) {
    p.set("k" + i, "v" + i);   // 命令缓存在本地，不立即发
}
List<Object> results = p.syncAndReturnAll();  // 一次性发送并收齐响应

// 对比 MSET/MGET：原生批量命令是单条命令、原子；但只能同种操作
// MSET k1 v1 k2 v2 ...   一条命令设多个 key`

const redlockSnippet = `// Redisson 分布式锁（封装好的，生产首选）
RLock lock = redisson.getLock("order:123");
lock.lock();                 // 默认 30s 租约，看门狗自动续期
try {
    // 临界区
} finally {
    lock.unlock();
}

// 加锁底层是一段 Lua：用 Hash 记录 锁名->线程标识:重入次数，保证原子
// 解锁也是 Lua：校验是自己的锁才删，并按重入次数递减`

export default function Ch3() {
  return (
    <article>
      <Lead>
        本章讲事务、脚本与分布式锁这一大块高频题：Redis 事务及与关系型数据库事务的区别、Lua 脚本、
        Pipeline、原生批处理 MSET/MGET 与 Pipeline 的区别、订阅发布、分布式锁的实现、
        锁未执行完逻辑就过期怎么办、RedLock、分布式锁可能遇到的问题、Redisson 锁原理与看门狗机制，
        以及源码里一些巧妙设计。
      </Lead>

      <h2>一、Redis 事务及与关系型事务的区别</h2>
      <KeyIdea>
        Redis 事务用 <code>MULTI/EXEC</code> 把多条命令<strong>打包按顺序执行、中途不被其它命令插入</strong>，
        但它<strong>没有回滚</strong>，也没有关系型数据库那种完整的 ACID。
      </KeyIdea>
      <CodeBlock lang="bash" title="MULTI/EXEC 与 WATCH 乐观锁" code={multiCmd} />
      <table>
        <thead>
          <tr><th>维度</th><th>Redis 事务</th><th>关系型数据库事务</th></tr>
        </thead>
        <tbody>
          <tr><td>原子性</td><td>命令打包顺序执行，但出错<strong>不回滚</strong></td><td>失败整体回滚</td></tr>
          <tr><td>隔离性</td><td>单线程串行，天然隔离</td><td>有隔离级别（读未提交…可串行）</td></tr>
          <tr><td>语法错误</td><td>入队时报错则整个事务不执行</td><td>—</td></tr>
          <tr><td>运行期错误</td><td>某条出错，其余<strong>照常执行</strong></td><td>回滚</td></tr>
          <tr><td>并发控制</td><td>WATCH 做乐观锁（CAS）</td><td>行锁/MVCC</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="没有回滚是关键考点">
        Redis 事务里某条命令运行期出错（如对 String 做 LPUSH），<strong>不会回滚已执行的命令</strong>。
        作者认为运行期错误多是程序 bug，应在开发期发现，回滚反而增加复杂度。所以「Redis 事务不保证原子回滚」。
      </Callout>

      <h2>二、Lua 脚本</h2>
      <p>
        要把「判断 + 修改」这类多步逻辑做成真正的原子操作，用 Lua 脚本比事务更合适：
        整段脚本在服务端<strong>原子执行</strong>，期间不会被其它命令打断，还能带条件分支。
      </p>
      <CodeBlock lang="bash" title="EVAL 执行 Lua 原子逻辑" code={luaCmd} />
      <ul>
        <li>用 <code>EVALSHA</code> + <code>SCRIPT LOAD</code> 缓存脚本，避免每次传整段脚本。</li>
        <li>脚本要短、别写死循环，因为它会<strong>独占主线程</strong>，长脚本会阻塞所有请求。</li>
        <li>key 必须通过 <code>KEYS[]</code> 传入，以便 Cluster 正确路由。</li>
      </ul>

      <h2>三、Pipeline 与原生批处理（MSET/MGET）的区别</h2>
      <CodeBlock lang="java" title="Pipeline 批量发送" code={pipelineSnippet} />
      <table>
        <thead>
          <tr><th></th><th>Pipeline</th><th>MSET/MGET 等原生批处理</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>客户端把多条命令打包发，减少 RTT</td><td>服务端的单条多参命令</td></tr>
          <tr><td>原子性</td><td><strong>不保证原子</strong>，命令间可能被插入</td><td>单条命令，原子</td></tr>
          <tr><td>命令种类</td><td>任意命令混合</td><td>只能同种操作（都设/都取）</td></tr>
          <tr><td>用途</td><td>批量降低网络往返</td><td>批量读写同类 key</td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="一句话区分">
        Pipeline 解决的是「<strong>网络往返多</strong>」，不解决原子性；MSET/MGET 是原子的单条命令但只能同种。
        要既批量又原子且带逻辑，用 Lua。
      </Callout>

      <h2>四、订阅发布（Pub/Sub）</h2>
      <p>
        <code>SUBSCRIBE</code>/<code>PUBLISH</code> 实现广播：发布者发消息到频道，所有订阅者收到。
        特点是<strong>不持久化、消费者离线就丢消息</strong>，没有消费确认。要可靠消息队列用 Stream。
      </p>
      <CodeBlock lang="bash" title="Pub/Sub 广播" code={`127.0.0.1:6379> subscribe news     # 订阅频道
127.0.0.1:6379> publish news "hi"  # 另一连接发布，订阅者立即收到
# 仅在线订阅者能收到；离线期间的消息不会补发`} />

      <h2>五、分布式锁实现</h2>
      <KeyIdea>
        基础分布式锁就一行：<code>SET lock uuid NX PX 30000</code>——NX 保证只有一个客户端能拿到，
        PX 设过期防死锁，value 用唯一标识（uuid/线程ID）保证<strong>只能解自己的锁</strong>。
      </KeyIdea>
      <ul>
        <li><strong>NX</strong>：key 不存在才设置，实现互斥。</li>
        <li><strong>PX/EX</strong>：设过期时间，持锁者崩溃也能自动释放，防死锁。</li>
        <li><strong>value 唯一</strong>：解锁时先校验 value 是不是自己，再删——必须用 Lua 把
          「判断 + 删除」做成原子，否则判断后锁恰好过期被别人拿走，你会误删别人的锁。</li>
      </ul>

      <h2>六、锁未执行完逻辑就过期了怎么办</h2>
      <p>
        固定过期时间的两难：设短了，业务没跑完锁就过期、别人进来；设长了，持锁者崩溃后要等很久才释放。
        解法是<strong>自动续期（看门狗）</strong>：业务没执行完就周期性延长锁的过期时间。
      </p>

      <h2>七、RedLock 与分布式锁可能遇到的问题</h2>
      <p>
        单 Redis 节点的锁在主从切换时有风险：客户端在主库加了锁，主库还没把这个写同步给从库就挂了，
        从库被提升为主，新主上<strong>没有这把锁</strong>，于是两个客户端同时持锁。
        <strong>RedLock</strong> 为此提出：向 N（如 5）个<strong>独立</strong>的 Redis 节点都申请锁，
        多数（N/2+1）成功且总耗时小于锁有效期，才算加锁成功。
      </p>
      <table>
        <thead>
          <tr><th>问题</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>主从切换丢锁</td><td>异步复制，锁未同步主就挂，新主无锁 → RedLock 多节点缓解</td></tr>
          <tr><td>GC/网络停顿</td><td>持锁者长 STW 停顿，锁已过期但它以为还持有 → 用 fencing token 兜底</td></tr>
          <tr><td>时钟漂移</td><td>RedLock 依赖各节点时间，时钟跳变会破坏正确性（Martin Kleppmann 的著名质疑）</td></tr>
          <tr><td>误删别人锁</td><td>不校验 owner 直接 DEL → 必须 Lua 校验 value 再删</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="RedLock 有争议">
        Martin Kleppmann 指出 RedLock 在 GC 停顿、时钟漂移下并不安全，认为需要外部存储的
        <strong>fencing token</strong>（单调递增序号，下游校验）才能真正避免。Redis 作者则反驳。
        面试能说出「这是有争议的方案，且要正确性兜底需 fencing token」就到位了。
      </Callout>

      <h2>八、Redisson 分布式锁原理与看门狗</h2>
      <CodeBlock lang="java" title="Redisson 锁用法" code={redlockSnippet} />
      <p>Redisson 把上面的坑都封装好了，核心机制：</p>
      <ul>
        <li><strong>Lua 原子加解锁</strong>：用 <strong>Hash</strong> 存「锁名 → 线程标识:重入次数」，
          加锁/解锁都用 Lua 保证原子，并天然支持<strong>可重入</strong>（同线程再次加锁，计数 +1）。</li>
        <li><strong>看门狗（watchdog）</strong>：<code>lock()</code> 不传过期时间时，默认租约 30 秒，
          后台启一个定时任务<strong>每 10 秒（租约的 1/3）检查并把锁续到 30 秒</strong>，
          只要业务没执行完、客户端没崩，锁就不会过期。<code>unlock()</code> 时取消看门狗。</li>
        <li>若客户端崩溃，看门狗随之停止续期，锁到 30 秒自动释放，避免死锁。</li>
        <li><strong>注意</strong>：手动指定了过期时间（<code>lock(10, TimeUnit.SECONDS)</code>）就<strong>不会启看门狗</strong>。</li>
      </ul>

      <h2>九、源码里的巧妙设计举例</h2>
      <ul>
        <li><strong>渐进式 rehash</strong>：字典扩容时不一次性搬迁，而是维护两个哈希表，
          每次操作顺手搬一点，把大开销摊到多次操作里，避免一次扩容卡住主线程。</li>
        <li><strong>近似 LRU/LFU</strong>：不维护完整 LRU 链表，而是<strong>随机抽样</strong>若干 key 比较，
          用极小内存换接近 LRU 的效果。</li>
        <li><strong>redisObject 共享整数</strong>：0~9999 的小整数对象被<strong>共享复用</strong>，省内存。</li>
        <li><strong>listpack 去前驱长度</strong>：从根上消除了 ziplist 的连锁更新（见第五卷）。</li>
        <li><strong>SDS 预分配 + 惰性释放</strong>：减少字符串频繁扩缩的重分配。</li>
      </ul>
      <p>
        <strong>面试追问：可重入是怎么做到的？</strong>普通 SET NX 锁不可重入——同一线程第二次加锁会因
        key 已存在而失败，导致自己把自己锁死。Redisson 用 <strong>Hash</strong> 解决：field 是线程标识，
        value 是重入次数。加锁时若锁不存在则创建并置 1；若锁已存在且 field 是<strong>当前线程</strong>，
        则把次数 +1（重入成功）；否则返回锁的剩余 TTL 表示要等待。解锁时按线程 field 把次数 −1，
        减到 0 才真正 <code>DEL</code> 释放。整个判断和增减都在一段 Lua 里原子完成。
      </p>

      <Example title="一句话收束这一卷">
        <p>事务保顺序不保回滚，Lua 保原子带逻辑，Pipeline 省往返不保原子；分布式锁从一行 SET NX PX
          起步，靠唯一 value + Lua 解锁 + 看门狗续期 + RedLock/fencing 兜底层层加固。</p>
      </Example>

      <Summary
        points={[
          'Redis 事务 MULTI/EXEC 打包顺序执行、单线程天然隔离，但运行期出错不回滚，与关系型 ACID 不同。',
          'Lua 脚本在服务端原子执行整段逻辑、可带条件，比事务更适合「判断+修改」，但会独占主线程要写短。',
          'Pipeline 是客户端打包多命令减少 RTT、不保证原子；MSET/MGET 是原子单条命令但只能同种；要批量+原子+逻辑用 Lua。',
          'Pub/Sub 是不持久化、无确认的广播，离线即丢；可靠队列用 Stream。',
          '分布式锁 = SET NX PX + 唯一 value，解锁须用 Lua 校验 owner 再删；锁提前过期用看门狗自动续期。',
          'RedLock 向多数独立节点加锁以抗主从切换，但在 GC 停顿/时钟漂移下有争议，严格正确性需 fencing token。',
          'Redisson 用 Hash 记重入次数 + Lua 原子加解锁 + 看门狗每 10 秒续到 30 秒；手动指定过期则不启看门狗。',
        ]}
      />
    </article>
  )
}
