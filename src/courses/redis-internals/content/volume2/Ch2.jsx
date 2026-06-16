import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DistributedLock from '@/courses/redis-internals/illustrations/DistributedLock.jsx'

const setnxBad = `# 最朴素版本：SETNX（有坑）
SETNX lock:order:8001 1   # 抢锁：不存在才设置成功，返回 1
# ... 执行业务 ...
DEL lock:order:8001       # 释放锁
# 问题：如果业务中途宕机，DEL 没执行，锁永远留着 → 死锁`

const setGood = `# 推荐版本：一条命令同时加锁 + 设过期 + 写唯一标识
SET lock:order:8001 a1b2c3-uuid NX EX 30
# NX = 不存在才设置（保证互斥）
# EX 30 = 30 秒后自动过期（即使宕机也不会死锁）
# value 存当前线程的唯一 uuid（释放时校验，避免误删别人的锁）`

const luaRelease = `-- 释放锁的 Lua 脚本：先校验 value 再删，保证原子性
-- KEYS[1] = 锁的 key   ARGV[1] = 当前线程的 uuid
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end`

const releaseCall = `# 用 EVAL 调用上面的 Lua 脚本来安全释放锁
EVAL "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end" 1 lock:order:8001 a1b2c3-uuid`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          单机用 synchronized 就能保证一段代码同一时刻只有一个线程进。但服务部署成多台机器后，
          锁得放到所有机器都能访问的地方——这就是<em>分布式锁</em>。Redis 做分布式锁是面试高频题，
          它的演进过程几乎就是一部「踩坑史」：从 SETNX 到 Redlock，每一步都在补前一步的漏洞。
        </p>
      </Lead>

      <h2>从 SETNX 起步</h2>
      <p>
        分布式锁的核心需求是<strong>互斥</strong>：同一时刻只有一个客户端能拿到锁。
        Redis 的 <code>SETNX</code>（SET if Not eXists）天生适合：key 不存在才设置成功，返回 1；
        已存在则失败返回 0。谁设置成功谁就拿到锁，用完 <code>DEL</code> 释放。
      </p>

      <Example title="订单防重复提交">
        <p>
          用户手抖连点两次「提交订单」，两个请求几乎同时到达不同机器。我们希望只有一个真正下单。
          于是用订单关键信息（比如用户 ID + 商品 ID）拼成锁 key，谁先 <code>SETNX</code> 成功谁就处理，
          另一个拿不到锁就直接拒绝或提示「请勿重复提交」。
        </p>
      </Example>

      <h2>三大坑，逐个补</h2>
      <p>
        朴素的 <code>SETNX</code> + <code>DEL</code> 在生产里会接连暴露三个问题，正是面试官最爱追问的地方。
      </p>

      <KeyIdea title="坑一：死锁 → 加过期时间">
        <p>
          拿到锁的进程如果在 <code>DEL</code> 之前宕机或崩溃，锁就永远留在 Redis 里，
          后面所有人都拿不到锁——<strong>死锁</strong>。解法是给锁加<strong>过期时间</strong>，
          到点自动释放。但「先 SETNX、再 EXPIRE」是两条命令，中间宕机仍会死锁，所以要用一条原子命令：
          <code>SET key uuid NX EX 30</code>，加锁与设过期一步完成。
        </p>
      </KeyIdea>

      <KeyIdea title="坑二：误删别人的锁 → value 存唯一 uuid + Lua 校验">
        <p>
          线程 A 拿锁后业务执行太久，锁<strong>过期</strong>自动释放了；此时线程 B 拿到了同名锁；
          A 业务终于跑完，执行 <code>DEL</code>，结果删掉的是 <strong>B 的锁</strong>。
          解法：加锁时 value 写入当前线程的<strong>唯一 uuid</strong>，释放时先 <code>GET</code> 校验
          value 是不是自己的 uuid，是才删。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="校验和删除必须原子：用 Lua">
        <p>
          「GET 校验 + DEL」是两步，如果中间锁恰好过期、又被别人拿走，仍可能误删。
          所以校验和删除要打包成一个 <em>Lua</em> 脚本由 Redis 原子执行——Redis 单线程跑完一整段脚本期间不会插入别的命令。
        </p>
      </Callout>

      <KeyIdea title="坑三：业务没做完锁就过期 → 看门狗续期">
        <p>
          过期时间设短了，业务还没跑完锁就没了，等于没锁；设长了，宕机后别人要等很久。
          成熟方案是<strong>看门狗</strong>（watch dog）：起一个后台线程，每隔一段时间（通常是过期时间的三分之一）
          检查业务是否还在执行，若在就<strong>自动续期</strong>，业务结束才停止续期并释放。Redisson 就内置了这套机制。
        </p>
      </KeyIdea>

      <DistributedLock />

      <h2>Redlock 与它的争议</h2>
      <p>
        上面都是<strong>单点</strong> Redis。如果这台 Redis 是主从架构，主节点拿锁成功后还没把数据同步到从节点就<strong>宕机</strong>，
        从节点被提升为主，新主上没有这把锁，于是<strong>另一个客户端也能拿到同一把锁</strong>，互斥被破坏。
      </p>
      <p>
        为此 Redis 作者提出 <em>Redlock</em> 算法：部署多个（通常 5 个）相互独立的 Redis 节点，
        客户端依次向它们申请锁，<strong>超过半数</strong>（如 3 个）在限定时间内成功才算拿到锁，释放时向所有节点发释放。
        它不依赖主从复制，单节点挂掉也不影响多数派。
      </p>
      <Callout variant="warn" title="Redlock 的争议">
        <p>
          分布式专家 Martin Kleppmann 质疑过 Redlock：在<strong>时钟漂移</strong>、GC 长暂停、网络延迟等情况下它仍可能失效，
          认为它不适合对正确性要求极高的场景。面试时能说出「Redlock 提高了可用性，但不是绝对安全；
          强一致需求应配合 fencing token 或换用 ZooKeeper/etcd」就很加分。
        </p>
      </Callout>

      <h2>工程上怎么用：Redisson</h2>
      <p>
        实际项目很少手写这些命令，Java 生态常用 <em>Redisson</em>：一行 <code>lock.lock()</code> / <code>lock.unlock()</code>
        就帮你做好了 uuid 标识、Lua 释放、看门狗自动续期，还提供 RedLock 的封装。
        理解底层原理是为了用得明白、出问题能定位。
      </p>

      <Practice title="手写加锁与安全释放">
        <p>
          先用一条 <code>SET</code> 命令完成加锁，再用 Lua 脚本完成校验式释放。
        </p>
        <CodeBlock lang="bash" title="加锁（原子）" code={setGood} />
        <CodeBlock lang="lua" title="release_lock.lua" code={luaRelease} />
        <CodeBlock lang="bash" title="用 EVAL 安全释放" code={releaseCall} />
        <p>
          对比一下不安全的老写法，体会每一处改动补的是哪个坑：
        </p>
        <CodeBlock lang="bash" title="反例：SETNX 老写法" code={setnxBad} />
      </Practice>

      <Summary
        points={[
          '分布式锁的核心是互斥：多机环境下把锁放到大家都能访问的 Redis 里，SETNX 提供「不存在才设置」的天然互斥。',
          '坑一死锁：拿锁后宕机锁不释放，解法是用 SET key uuid NX EX 30 一条命令原子地加锁并设过期。',
          '坑二误删：锁过期后被别人拿走，自己再 DEL 会误删别人的锁，解法是 value 存唯一 uuid、释放用 Lua 先校验再删。',
          '坑三过期：业务没做完锁就到期，解法是看门狗后台线程自动续期，Redisson 内置了这套机制。',
          'Redlock 用多节点过半数算法避免单点主从切换丢锁，但在时钟漂移、GC 暂停下仍有争议，并非绝对安全。',
          '生产中常用 Redisson 封装；强一致场景考虑 fencing token 或 ZooKeeper/etcd。',
        ]}
      />
    </>
  )
}
