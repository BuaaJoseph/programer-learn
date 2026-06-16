import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BloomFilter from '@/courses/redis-internals/illustrations/BloomFilter.jsx'

const redisBloomCode = `# 用 RedisBloom 模块（命令以 BF. 开头）
# 创建一个布隆过滤器，指定误判率 0.01、预计 100 万个元素
BF.RESERVE bf:users 0.01 1000000

# 把已存在的用户 ID 加进去（系统启动时批量灌入）
BF.ADD bf:users 10086
BF.MADD bf:users 10087 10088 10089

# 查询某个 ID 是否可能存在
BF.EXISTS bf:users 10086   # 返回 1：可能存在
BF.EXISTS bf:users 99999   # 返回 0：一定不存在`

const bitCode = `# 不装模块时，可用位图自己模拟（演示原理，生产建议用 RedisBloom）
# 假设 3 个哈希函数把 user:10086 映射到位 5、112、880
SETBIT bf:users 5   1
SETBIT bf:users 112 1
SETBIT bf:users 880 1

# 查询：对同一个值算出 5、112、880 三个位，逐个 GETBIT
GETBIT bf:users 5     # 任意一位为 0 → 一定不存在
GETBIT bf:users 112   # 三位全为 1 → 可能存在`

const guardCode = `# 缓存穿透防护：查 DB 前先问布隆过滤器
def get_user(uid):
    if not bloom.exists(uid):     # 一定不存在，直接挡掉，不查缓存也不查 DB
        return None
    data = redis.get('user:' + uid)
    if data is not None:
        return data
    data = db.query_user(uid)     # 可能存在，才回源
    redis.set('user:' + uid, data, ex=600)
    return data`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          有时我们只想快速回答一个问题：「这个东西<strong>在不在</strong>集合里？」如果集合有上亿个元素，
          用 Set 存太占内存。<em>布隆过滤器</em>（Bloom Filter）用极少的空间就能给出回答——
          代价是它偶尔会「误报」。理解它「能挡住一定不存在的、放过可能存在的」这个特性，是防缓存穿透的关键。
        </p>
      </Lead>

      <h2>原理：位数组 + 多个哈希函数</h2>
      <p>
        布隆过滤器就是一个很长的<strong>位数组</strong>（一串 0），外加 <strong>k 个哈希函数</strong>。
        <strong>加入</strong>一个元素时，用 k 个哈希函数分别算出 k 个位置，把这些位置统统<strong>置 1</strong>；
        <strong>查询</strong>一个元素时，同样算出 k 个位置，去看这 k 位是不是<strong>都为 1</strong>。
      </p>

      <KeyIdea title="判定规则（务必记牢）">
        <p>
          <strong>只要有一位是 0，这个元素就一定不存在</strong>（因为加入时一定会把所有位置都置 1）；
          <strong>如果 k 位全是 1，则元素「可能」存在</strong>——因为这些 1 也许是别的元素「凑」出来的。
          这种「明明没加过却被判为可能存在」就是<em>false positive</em>（误判 / 假阳性）。
          注意：布隆过滤器<strong>不会漏报</strong>，说「不存在」一定对。
        </p>
      </KeyIdea>

      <BloomFilter />

      <Example title="为什么会误判">
        <p>
          假设位数组长 1000 位，3 个哈希函数。加入「张三」时置了位 5、112、880；加入「李四」时置了位 5、340、880。
          现在来查一个从没加过的「王五」，恰好它的三个哈希位算出来是 112、340、880——
          这三位刚好被张三和李四凑齐成了 1，于是过滤器回答「可能存在」，这就是误判。
        </p>
        <p>
          元素越多、位数组越满，1 越密集，误判率就越高。所以位数组要留足够的空间。
        </p>
      </Example>

      <h2>误判率取决于什么</h2>
      <p>
        误判率由三者决定：<strong>位数组大小 m</strong>、<strong>哈希函数个数 k</strong>、<strong>已插入元素数 n</strong>。
        位数组越大（m 越大）误判率越低；元素越多（n 越大）误判率越高；哈希个数 k 有个最优值，
        太少区分度不够、太多又把位数组填得太满。工程上通常只需指定「预计元素数」和「能接受的误判率」，
        让库自动算出 m 和 k。
      </p>

      <Callout variant="warn" title="标准布隆不能删除">
        <p>
          想删一个元素？不能直接把它的 k 位清 0——因为这些位可能<strong>被别的元素共用</strong>，清 0 会误伤别人，
          导致漏报。解决办法是<em>计数布隆过滤器</em>（Counting Bloom Filter）：把每一位从「0/1」换成一个<strong>小计数器</strong>，
          加入时 +1、删除时 -1，计数器大于 0 才算该位被占。代价是空间变大好几倍。
        </p>
      </Callout>

      <h2>实现方式与典型用途</h2>
      <p>
        实现上有两条路：用 Redis 官方的 <em>RedisBloom</em> 模块，命令以 <code>BF.</code> 开头（<code>BF.ADD</code>、<code>BF.EXISTS</code>），
        最省心；或者自己用位图命令 <code>SETBIT</code> / <code>GETBIT</code> 加上几个哈希函数手撸一个。
      </p>
      <p>
        最经典的用途是<strong>缓存穿透防护</strong>：恶意请求或脏数据不停查询<strong>根本不存在</strong>的 key，
        每次都穿过缓存打到数据库。把所有合法 key 预先灌进布隆过滤器，查 DB 前先问一句，
        过滤器说「一定不存在」就直接挡回，数据库压力骤降。此外还常用于<strong>黑名单</strong>、URL 去重、垃圾邮件判定等。
      </p>

      <Example title="防止查询不存在的用户 ID 击穿到 DB">
        <p>
          系统里所有用户 ID 一共几千万。攻击者用 <code>uid=99999999</code> 这种不存在的 ID 疯狂请求，
          缓存里没有、数据库里也没有，于是每次都回源查 DB，把数据库拖垮。
        </p>
        <p>
          加上布隆过滤器：启动时把全部真实用户 ID 灌进去。请求进来先 <code>BF.EXISTS</code>，
          对不存在的 ID 直接返回 null，<strong>连缓存和数据库都不碰</strong>。
          少数误判（极个别不存在的 ID 被放过）只是多查一次 DB，无伤大雅。
        </p>
      </Example>

      <Practice title="用 RedisBloom 或位图实现">
        <p>
          首选 RedisBloom 模块，一条命令建好、加值、查值；没有模块时可用位图理解底层。
        </p>
        <CodeBlock lang="bash" title="RedisBloom：BF.ADD / BF.EXISTS" code={redisBloomCode} />
        <CodeBlock lang="bash" title="位图模拟：SETBIT / GETBIT" code={bitCode} />
        <p>把它接到查询入口前，就是一道缓存穿透的防线：</p>
        <CodeBlock lang="python" title="bloom_guard.py" code={guardCode} />
      </Practice>

      <Summary
        points={[
          '布隆过滤器 = 一个位数组 + k 个哈希函数：加入时把 k 个位置置 1，查询时看这 k 位是否全为 1。',
          '判定规则：有一位为 0 则一定不存在；k 位全为 1 则「可能存在」，存在 false positive 误判，但绝不漏报。',
          '误判率由位数组大小 m、哈希个数 k、元素数 n 共同决定：m 越大越低、n 越多越高，k 有最优值。',
          '标准布隆不能删除（位被多元素共用），要删除得用计数布隆（每位换成计数器，代价是更占空间）。',
          '实现可用 RedisBloom 模块的 BF.* 命令，或自己用 SETBIT/GETBIT 加哈希函数模拟。',
          '最典型用途是缓存穿透防护和黑名单：查库前先问过滤器，挡掉一定不存在的 key，护住数据库。',
        ]}
      />
    </>
  )
}
