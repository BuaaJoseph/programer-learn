import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CacheProblem from '@/courses/redis-internals/illustrations/CacheProblem.jsx'

const mutexCode = `def get_product(product_id):
    key = "product:" + str(product_id)

    # 1. 先查缓存，命中直接返回（绝大多数请求走这里）
    val = redis.get(key)
    if val is not None:
        return deserialize(val)

    # 2. 未命中，说明热点 key 刚刚过期，尝试抢一把互斥锁
    lock_key = "lock:" + key
    # set ... nx ex：只有锁不存在时才能设成功，谁设成功谁负责重建
    got_lock = redis.set(lock_key, "1", nx=True, ex=10)

    if got_lock:
        try:
            # 抢到锁的线程：去数据库重建缓存
            product = db.query_product(product_id)
            redis.set(key, serialize(product), ex=3600)
            return product
        finally:
            redis.delete(lock_key)   # 重建完务必释放锁
    else:
        # 没抢到锁的线程：短暂等待后重试，让它读到刚重建好的缓存
        sleep(50)                    # 毫秒
        return get_product(product_id)`

const logicalExpireCode = `# 逻辑过期：value 里自带一个「逻辑过期时间」，Redis 上不设真实 TTL（永不物理过期）
# 写入示例： {"data": {...}, "logical_expire_at": 1718500000}

def get_product(product_id):
    key = "product:" + str(product_id)
    obj = redis.get(key)            # 热点 key 永不物理过期，这里一定命中

    if obj["logical_expire_at"] > now():
        return obj["data"]          # 逻辑上没过期，直接返回

    # 逻辑上已过期：抢锁，抢到的线程「异步」重建，自己先返回旧数据
    lock_key = "lock:" + key
    if redis.set(lock_key, "1", nx=True, ex=10):
        submit_async(lambda: rebuild_and_release(product_id, lock_key))

    return obj["data"]              # 不阻塞：所有请求都先拿到旧数据`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          有一类 key，平时承载着极高的并发——比如一个爆款商品的详情。它一直命中缓存，岁月静好。
          可一旦它<strong>过期的那一瞬间</strong>，成千上万个还在涌入的请求会同时发现缓存没了，于是一起冲向数据库。
          这就是 <em>cache breakdown</em>，缓存击穿。
        </p>
      </Lead>

      <h2>什么是缓存击穿</h2>
      <p>
        缓存击穿指的是：某个<strong>超高并发的热点 key</strong> 在过期的瞬间，大量请求同时缓存未命中，
        于是同一时刻全部穿过缓存压向数据库。这些请求做的是<strong>同一件事</strong>——都去查同一条数据、
        都想把缓存重建出来。数据库在这一瞬间承受了远超平时的并发，很可能被打垮。
      </p>

      <Callout variant="warn" title="和穿透的关键区别：key 是存在的">
        <p>
          击穿和穿透最容易混。记住：穿透查的是<strong>根本不存在</strong>的数据，缓存永远建不起来；
          而击穿查的 key <strong>是真实存在</strong>的，只是它刚好过期了，在「过期到被重建」这个极短的空窗期里被并发打穿。
          所以击穿是个<strong>时间点</strong>问题，穿透是个<strong>数据存在性</strong>问题。
        </p>
      </Callout>

      <Example title="秒杀商品详情的热点 key">
        <p>
          某个秒杀爆款，详情页 QPS 高达 5 万。它的缓存 <code>product:8848</code> 设了 1 小时过期。
          整点到了，这个 key 正好过期：
        </p>
        <ul>
          <li>这一毫秒内涌入的几万个请求，全部查 <code>product:8848</code>，全部未命中；</li>
          <li>它们各自回查数据库，于是数据库瞬间被几万个「查同一条商品」的请求砸中；</li>
          <li>更糟的是，每个请求查完都想写回缓存，重复劳动叠加并发，数据库直接被打挂。</li>
        </ul>
        <p>
          注意：<code>product:8848</code> 这条数据在数据库里是真实存在的，问题只在于「重建缓存」这件事
          被几万个请求同时做了。
        </p>
      </Example>

      <CacheProblem />

      <h2>两种核心防护</h2>

      <h3>方案一：互斥锁 / 分布式锁</h3>
      <p>
        既然几万个请求做的是同一件事，那就<strong>只让一个去做</strong>。当缓存未命中时，请求先去抢一把锁
        （单机用本地锁，分布式环境用 <em>Redis</em> 的 <code>SET key value NX EX</code> 实现的分布式锁）。
        抢到锁的线程才去查数据库、重建缓存；没抢到的线程则<strong>稍等片刻再重试</strong>，等它们重试时，
        缓存往往已经被重建好了，直接命中返回。这样落到数据库的，从几万个降到了<strong>仅仅一个</strong>。
      </p>

      <h3>方案二：逻辑过期（logical expire）</h3>
      <p>
        换个思路：既然「物理过期的那一瞬间」最危险，那就<strong>不设真实的 TTL</strong>，让热点 key 在 Redis 上永不物理过期。
        取而代之，在 value 里存一个<strong>逻辑过期时间</strong>字段。读取时判断这个逻辑时间：没过就正常返回；
        逻辑上过期了，就抢锁开一个<strong>异步任务</strong>去后台重建，而当前请求<strong>先返回旧数据</strong>，不阻塞。
        于是任何请求都不会卡住，也不会有「缓存为空」的空窗。
      </p>

      <KeyIdea title="互斥锁 vs 逻辑过期：怎么权衡">
        <p>
          <strong>互斥锁</strong>：实现简单、能保证拿到的<strong>一定是最新数据</strong>（强一致倾向）；代价是没抢到锁的请求要
          <strong>等待/重试</strong>，重建期间响应变慢，极端情况下还可能因为锁没释放好而出问题。
        </p>
        <p>
          <strong>逻辑过期</strong>：所有请求<strong>永不阻塞</strong>、吞吐和响应最稳；代价是逻辑过期到异步重建完成之间，
          会有请求读到<strong>旧数据</strong>（牺牲一点一致性换可用性），且实现更复杂、需要常驻内存。
          一句话：要数据新就用互斥锁，要高可用、能容忍短暂旧值就用逻辑过期。
        </p>
      </KeyIdea>

      <h2>面试怎么答</h2>
      <p>
        先<strong>定义清楚并强调与穿透的区别</strong>：击穿是单个高并发热点 key 过期瞬间被大量请求打穿，而 key 本身是存在的。
        再给两种方案：<strong>互斥锁</strong>（只放一个线程重建，其余等待，保证新数据但响应变慢）和
        <strong>逻辑过期</strong>（不设真实 TTL，value 存逻辑过期时间，过期后异步重建、先返回旧值，不阻塞但有短暂旧数据）。
        最后用一句「一致性优先选互斥锁，可用性优先选逻辑过期」收尾，再补一句「对永远的热点 key 也可以干脆不设过期、靠后台定时更新」。
      </p>

      <Practice title="用互斥锁重建热点缓存">
        <p>
          核心是用 <code>SET lock NX EX</code> 抢锁：抢到的线程去重建，没抢到的稍等后重试。注意重建完一定要在
          <code>finally</code> 里释放锁，并给锁设过期时间防止死锁。
        </p>
        <CodeBlock lang="python" title="mutex_rebuild.py" code={mutexCode} />
        <p>
          作为对照，下面是逻辑过期的思路：热点 key 永不物理过期，靠 value 里的逻辑时间判断，过期就异步重建、先返回旧值。
        </p>
        <CodeBlock lang="python" title="logical_expire.py" code={logicalExpireCode} />
        <p>
          压测建议：用几千个并发同时请求一个刚过期的热点 key，统计真正落到数据库的查询次数——互斥锁应该接近 1 次，
          而无防护时会接近并发数。
        </p>
      </Practice>

      <Summary
        points={[
          '缓存击穿：单个超高并发的热点 key 过期瞬间，大量请求同时未命中并冲向数据库。',
          '与穿透的关键区别：击穿的 key 是真实存在的，只是过期了；穿透的数据压根不存在。',
          '防护一是互斥锁/分布式锁：只放一个线程去重建缓存，其余线程等待后重试，落库请求降到一个。',
          '防护二是逻辑过期：不设真实 TTL，value 里存逻辑过期时间，过期后异步重建并先返回旧数据。',
          '互斥锁保证拿到最新数据但重建期响应变慢；逻辑过期永不阻塞但会读到短暂旧值。',
          '选择原则：一致性优先用互斥锁，可用性优先用逻辑过期；永久热点可直接不过期靠后台更新。',
        ]}
      />
    </>
  )
}
