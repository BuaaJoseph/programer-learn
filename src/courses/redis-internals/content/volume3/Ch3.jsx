import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CacheProblem from '@/courses/redis-internals/illustrations/CacheProblem.jsx'

const jitterCode = `import random

BASE_TTL = 3600   # 基础过期时间：1 小时

def set_with_jitter(key, value):
    # 在基础过期时间上加一个随机抖动，把过期时刻打散开
    jitter = random.randint(0, 600)        # 0 ~ 10 分钟的随机量
    redis.set(key, serialize(value), ex=BASE_TTL + jitter)

# 对比：如果所有 key 都用固定的 ex=3600，
# 那么同一批次写入的 key 会在一小时后「同一秒」集体过期 —— 这正是雪崩的根源`

const fallbackCode = `# 兜底三件套：熔断 + 限流 + 降级
def get_data(key):
    # 1. 限流：单位时间内放行的请求数有上限，超出的直接拒绝，保护数据库
    if not rate_limiter.try_acquire():
        return DEGRADED_DEFAULT       # 降级：返回默认值/兜底页，而不是硬查 DB

    # 2. 熔断：若数据库已被判定为不健康，直接走降级，不再发起查询
    if circuit_breaker.is_open():
        return DEGRADED_DEFAULT

    try:
        val = redis.get(key)
        if val is not None:
            return deserialize(val)
        data = db.query(key)              # 缓存大面积失效时，这一步压力骤增
        set_with_jitter(key, data)        # 重建时带随机抖动，避免再次集体过期
        return data
    except DatabaseError:
        circuit_breaker.record_failure()  # 失败计数，触发熔断
        return DEGRADED_DEFAULT           # 降级兜底，绝不把异常抛给用户`

const multiLevelCode = `# 多级缓存：本地缓存(Caffeine/进程内) → Redis → DB，层层拦截
def get_data(key):
    # L1 本地缓存：进程内、纳秒级、不走网络，Redis 抖动时还能顶一阵
    val = local_cache.get(key)
    if val is not None:
        return val

    # L2 Redis：跨进程共享的分布式缓存
    val = redis.get(key)
    if val is not None:
        local_cache.put(key, val, ttl=10)   # 本地缓存设更短 TTL，减小不一致窗口
        return val

    # L3 DB：最后回源，并逐层回填
    data = db.query(key)
    set_with_jitter(key, data)              # 回填 Redis(带抖动)
    local_cache.put(key, data, ttl=10)      # 回填本地
    return data`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          击穿是单个热点 key 倒下；雪崩则是<strong>一整片缓存同时倒下</strong>。当大批 key 在同一时刻集中过期，
          或者 Redis 整体宕机，所有本该被缓存挡住的流量会在一瞬间全部压到数据库上——数据库扛不住，
          上游服务也跟着崩，这就是 <em>cache avalanche</em>，缓存雪崩。
        </p>
      </Lead>

      <h2>什么是缓存雪崩</h2>
      <p>
        缓存雪崩有两种典型成因。其一是<strong>大量 key 在同一时刻集中过期</strong>：常见于系统启动或某次批量预热时，
        一大批数据用了<strong>相同的过期时间</strong>写入，于是它们会在未来的同一秒一起失效，瞬间全部回查数据库。
        其二是 <strong>Redis 整体宕机</strong>：缓存层直接消失，所有读请求无差别地落到数据库。
        两种情况的共同结果是——数据库在极短时间内承受了平时根本扛不住的流量。
      </p>

      <Callout variant="warn" title="和击穿的区别：大面积 vs 单点">
        <p>
          面试官常把雪崩和击穿放一起问。一句话区分：<strong>击穿是单个热点 key 被打穿</strong>（点），
          <strong>雪崩是大批 key 同时失效或缓存整体崩溃</strong>（面）。规模不同，应对手段也就不同：
          击穿靠锁/逻辑过期保护那一个 key；雪崩要靠打散过期、多级缓存、高可用和兜底来扛整个面。
        </p>
      </Callout>

      <Example title="整点活动大量缓存同时失效">
        <p>
          某电商在晚上 8 点开启大促，运营在 7 点统一预热了几万个商品缓存，全部设置 <code>ex=3600</code>（1 小时）。
          结果到了 8 点整：
        </p>
        <ul>
          <li>这几万个 key 在<strong>同一秒</strong>集体过期；</li>
          <li>而 8 点正是活动开始、流量最高峰，海量请求全部缓存未命中；</li>
          <li>它们一起回查数据库，数据库 QPS 瞬间飙升十几倍，连接池打满、响应超时；</li>
          <li>上游应用线程被慢查询拖住，整条链路雪崩。</li>
        </ul>
        <p>
          症结在于「相同的过期时间」把所有 key 的失效时刻对齐到了同一点，又恰好撞上流量高峰。
        </p>
      </Example>

      <CacheProblem />

      <h2>四类核心防护</h2>

      <h3>一、过期时间加随机抖动</h3>
      <p>
        最直接、性价比最高的一招：给过期时间<strong>加上一个随机值</strong>，比如基础 1 小时再加 0 到 10 分钟的随机量。
        这样原本会对齐到同一秒的几万个 key，被<strong>打散</strong>到一段时间窗口里陆续过期，数据库的重建压力被摊平，
        不会再出现「同一秒集体失效」。注意抖动幅度要和业务匹配：太小打散不够，太大会让部分数据过早失效降低命中率。
      </p>

      <h3>二、多级缓存</h3>
      <p>
        在 Redis 之外，再加一层<strong>本地缓存</strong>（如进程内的 Caffeine、Guava Cache）。请求先查本地缓存，
        未命中再查 Redis，最后才到数据库。即便 Redis 出问题或某批 key 失效，本地缓存还能挡掉一部分流量，
        形成多道防线，降低数据库的瞬时冲击。代价是本地缓存与 Redis 之间会有<strong>短暂不一致</strong>，
        所以本地缓存的 TTL 通常设得很短，并可借助消息广播做失效通知。
      </p>
      <CodeBlock lang="python" title="multi_level_cache.py" code={multiLevelCode} />

      <h3>三、Redis 高可用集群</h3>
      <p>
        针对「Redis 整体宕机」这类成因，根本对策是<strong>不让缓存层成为单点</strong>：用<em>哨兵</em>（Sentinel）
        做主从自动故障转移，或用 <em>Cluster</em> 集群分片 + 副本。即使个别节点挂掉，整体缓存服务依然可用，
        流量不会因为缓存消失而无差别砸向数据库。这部分原理在卷四会专门展开。
      </p>

      <h3>四、熔断、限流、降级兜底</h3>
      <p>
        前面几招都是「尽量别让流量打到数据库」，这一招是「万一真打过来了，也要保住数据库不被打死」。
        <strong>限流</strong>给数据库设一道流量闸门，超出阈值的请求直接拒绝；<strong>熔断</strong>在检测到数据库已不健康时，
        快速失败、不再继续发请求；<strong>降级</strong>则在上述情况下返回兜底默认值或友好提示页，而不是把异常抛给用户。
        这是系统的最后一道安全网，常用 Sentinel(阿里)、Resilience4j、Hystrix 等组件落地。
      </p>

      <KeyIdea title="四道防线各管一段">
        <p>
          可以把这四招理解成四道由内而外的防线：<strong>随机抖动</strong>从源头避免集体过期；
          <strong>多级缓存</strong>增加拦截层次；<strong>高可用集群</strong>保证缓存层本身不倒；
          <strong>熔断限流降级</strong>则是流量真冲过来时保护数据库的兜底。实战中它们往往<strong>叠加使用</strong>，
          越靠前的防线性价比越高，越靠后的越是保命用的最后手段。
        </p>
      </KeyIdea>

      <table>
        <thead>
          <tr><th>成因</th><th>对症手段</th></tr>
        </thead>
        <tbody>
          <tr><td>大量 key 集中过期</td><td>过期加随机抖动、多级缓存、错峰预热</td></tr>
          <tr><td>Redis 整体宕机</td><td>哨兵/Cluster 高可用、多级缓存兜底</td></tr>
          <tr><td>流量已打到 DB</td><td>限流、熔断、降级返回兜底</td></tr>
        </tbody>
      </table>

      <Callout variant="info" title="一个常被忽略的细节：穿透/击穿/雪崩会叠加">
        <p>
          三大问题不是互斥的。大促时常常<strong>同时发生</strong>：热点 key 击穿、大批 key 雪崩、加上有人趁机刷不存在的 key 穿透。
          所以生产里这些防护手段（空值/布隆 + 锁/逻辑过期 + 抖动/多级/高可用 + 熔断限流降级）通常是<strong>全套上</strong>的，
          而不是三选一。能在面试里点出「它们会叠加、要组合防护」，比单独答每一道题更显工程经验。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        先<strong>讲定义和与击穿的区别</strong>：雪崩是大批 key 同时过期或 Redis 整体宕机导致大面积失守，
        而击穿是单个热点 key。再分两条线给方案：针对「集中过期」用<strong>过期时间加随机抖动</strong>和<strong>多级缓存</strong>；
        针对「Redis 宕机」用<strong>哨兵/集群做高可用</strong>。最后补上<strong>熔断、限流、降级</strong>这套兜底，
        说明它是「即便流量真打到 DB 也要保住 DB」的最后防线。能把成因拆成两类、再分别对症下药，逻辑就很清晰。
      </p>

      <Practice title="给过期时间加随机抖动">
        <p>
          核心一行：在固定 TTL 上叠加一个随机量，把同一批 key 的过期时刻打散开，从源头消除「集体失效」。
        </p>
        <CodeBlock lang="python" title="ttl_jitter.py" code={jitterCode} />
        <p>
          再看一段把限流、熔断、降级串起来的兜底逻辑，作为缓存大面积失效时保护数据库的最后一道防线：
        </p>
        <CodeBlock lang="python" title="fallback_guard.py" code={fallbackCode} />
        <p>
          做个实验：先让一批 key 用相同 TTL 过期，观察数据库 QPS 的尖峰；再换成加随机抖动，对比尖峰是否被摊平成一段平缓曲线。
        </p>
      </Practice>

      <Summary
        points={[
          '缓存雪崩：大批 key 在同一时刻集中过期，或 Redis 整体宕机，流量瞬间全压到数据库。',
          '与击穿的区别：雪崩是大面积失守（面），击穿是单个热点 key 被打穿（点）。',
          '防护一是过期时间加随机抖动：打散过期时刻，避免同一批 key 同一秒集体失效。',
          '防护二是多级缓存：本地缓存 + Redis 多道防线，降低数据库的瞬时冲击(注意本地缓存短 TTL 控不一致)。',
          '防护三是 Redis 高可用集群（哨兵/Cluster）：避免缓存层整体宕机这一单点风险。',
          '防护四是熔断、限流、降级兜底：流量真打到数据库时保住数据库；实战中穿透/击穿/雪崩防护常全套叠加使用。',
        ]}
      />
    </>
  )
}
