import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CacheProblem from '@/courses/redis-internals/illustrations/CacheProblem.jsx'

const nullCacheCode = `def get_user(user_id):
    key = "user:" + str(user_id)

    # 1. 先查缓存
    val = redis.get(key)
    if val is not None:
        # 命中：可能是真实数据，也可能是我们埋的「空值占位符」
        if val == "__NULL__":
            return None          # 这是一次被空值缓存挡下的请求
        return deserialize(val)

    # 2. 缓存没有，回查数据库
    user = db.query_user(user_id)
    if user is None:
        # 关键：数据库也没有，就把「空」也缓存起来，且给一个短过期时间
        redis.set(key, "__NULL__", ex=60)   # 60 秒，避免长期占用内存
        return None

    # 3. 数据库有，正常写回缓存
    redis.set(key, serialize(user), ex=3600)
    return user`

const bloomCode = `# 布隆过滤器：前置拦截「一定不存在」的 key
# 系统启动 / 数据变更时，把所有合法 user_id 灌进布隆过滤器
def warm_up_bloom():
    for user_id in db.all_user_ids():
        bloom.add("user:" + str(user_id))

def get_user(user_id):
    key = "user:" + str(user_id)

    # 布隆过滤器说「不存在」，则一定不存在，直接拒绝，连缓存和 DB 都不碰
    if not bloom.might_contain(key):
        return None

    # 说「可能存在」（有极小误判率），再走正常的缓存 + DB 流程
    return query_cache_then_db(user_id)`

const validateCode = `# 第一道防线：参数校验，把明显非法的请求挡在 Controller 层
def get_user_api(raw_id):
    # 类型/格式/范围校验，非法直接 400，不碰缓存和 DB
    if not raw_id.isdigit():
        raise BadRequest("id must be a positive integer")
    uid = int(raw_id)
    if uid <= 0 or uid > MAX_VALID_ID:
        raise BadRequest("id out of range")
    return get_user(uid)`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          缓存的价值在于「热数据不打数据库」。但有一类请求天生绕不过这层保护：它们查的 key
          在缓存里没有，在数据库里也没有。于是每一次请求都老老实实穿过缓存、砸到数据库上——这就是
          <em>cache penetration</em>，缓存穿透。
        </p>
      </Lead>

      <h2>什么是缓存穿透</h2>
      <p>
        正常情况下，缓存能挡住绝大多数读请求：命中就直接返回，未命中才回查数据库，然后把结果写回缓存，
        下次就命中了。缓存穿透打破的正是这个「下次就命中」的前提——因为<strong>数据本身就不存在</strong>，
        数据库查出来是空，没有任何东西可以写回缓存。结果是：每一次同样的请求都缓存不命中，每一次都落到数据库。
      </p>
      <p>
        换句话说，缓存这道防线对「查不存在数据」的请求<strong>完全失效</strong>了。数据库被迫直接承受全部流量，
        而数据库的并发承载能力通常比缓存低一两个数量级。
      </p>

      <Example title="黑客用不存在的用户 ID 刷接口">
        <p>
          假设你有一个接口 <code>/api/user?id=xxx</code>，正常用户 ID 都是正整数。攻击者写一个脚本，
          用 <code>id=-1</code>、<code>id=-2</code>、<code>id=999999999</code> 这种<strong>根本不存在</strong>的 ID
          疯狂请求。
        </p>
        <ul>
          <li>缓存里没有 <code>user:-1</code>，未命中；</li>
          <li>回查数据库，数据库里也没有，返回空；</li>
          <li>因为是空结果，代码通常不写回缓存，于是下一个 <code>id=-2</code> 重复上述过程。</li>
        </ul>
        <p>
          每秒上万个这样的请求，全部直接压在数据库上。缓存形同虚设，数据库连接池被打满，正常用户的请求也跟着雪崩。
        </p>
      </Example>

      <CacheProblem />

      <Callout variant="warn" title="面试陷阱：穿透、击穿、雪崩别混了">
        <p>
          这三个词长得像，面试官最爱让你区分。一句话记牢区别：
        </p>
        <ul>
          <li><strong>穿透</strong>：数据<strong>压根不存在</strong>，缓存永远建不起来；</li>
          <li><strong>击穿</strong>：数据存在，但<strong>单个热点 key</strong> 过期的那一瞬间被并发打穿（见下一章）；</li>
          <li><strong>雪崩</strong>：<strong>大量 key</strong> 同时过期或 Redis 整体宕机，大面积失守（见第三章）。</li>
        </ul>
        <p>
          一个记忆锚点：穿透是<strong>数据存在性</strong>问题（根本没有），击穿是<strong>时间点</strong>问题（恰好过期那一刻），
          雪崩是<strong>规模</strong>问题（一大片同时失效）。
        </p>
      </Callout>

      <h2>两种核心防护</h2>

      <h3>方案一：缓存空值（cache null）</h3>
      <p>
        既然问题出在「数据库返回空时没东西写回缓存」，那就<strong>把空也缓存起来</strong>。下次再查同一个不存在的 key，
        缓存直接命中并返回空，请求就不会再落到数据库。关键细节是给这个空值设一个<strong>较短的过期时间</strong>
        （比如 60 秒），原因有二：一是避免大量无效 key 长期占用内存；二是万一这个 key 之后真的有了数据，
        短过期能让它较快地被真实值替换掉。
      </p>
      <p>
        要注意：空值方案只对<strong>有限且重复</strong>的不存在 key 有效。如果攻击者每次用<strong>不同的随机 ID</strong>
        （如 <code>id=随机大数</code>），每个 ID 只查一次，缓存空值根本来不及发挥作用，还会被这些一次性空值塞满内存——
        这时就必须靠布隆过滤器。
      </p>

      <h3>方案二：布隆过滤器前置拦截</h3>
      <p>
        <em>bloom filter</em> 是一个空间效率极高的概率型数据结构，能判断「某元素一定不存在」或「可能存在」。
        把所有<strong>合法的 key</strong>预先灌进布隆过滤器，放在缓存前面当门卫：请求进来先问布隆过滤器，
        它说「不存在」就<strong>一定不存在</strong>，直接拒绝，连缓存和数据库都不用碰；它说「可能存在」才放行去走正常流程。
        布隆过滤器有极小的误判率（把不存在的判成可能存在），但绝不会把存在的判成不存在，所以用来挡穿透刚好合适——
        误判只是放过去多查一次，绝不会误杀真实数据。
      </p>

      <Callout variant="info" title="别忘了最朴素的一招：参数校验">
        <p>
          在接口入口先做<strong>参数合法性校验</strong>——ID 是不是正整数、格式对不对、是否在合理范围。
          像 <code>id=-1</code> 这种明显非法的请求，在 Controller 层就该被直接拒掉，根本轮不到缓存和数据库。
          这是成本最低、最该先做的一道防线。再叠加<strong>接口限流</strong>和<strong>风控封 IP</strong>，
          对恶意刷接口能起到很好的兜底作用。
        </p>
      </Callout>

      <KeyIdea title="两种方案怎么选：优缺点对比">
        <p>
          <strong>缓存空值</strong>：实现简单，几行代码就能上；缺点是会占用额外内存（每个被攻击的不存在 key 都存一份空值），
          且在空值过期窗口内若数据真的产生了，可能短暂读到旧的「空」（一致性略有损失）。适合不存在的 key
          数量可控、且会被重复查询的场景。
        </p>
        <p>
          <strong>布隆过滤器</strong>：内存占用极小、拦截在最前面，能扛住海量随机不存在 key 的攻击；缺点是有误判率、
          实现更复杂，且<strong>合法 key 集合变化时需要同步维护</strong>（新增数据要记得加进过滤器，删除则不好处理）。
          适合数据量大、攻击 key 高度随机的场景。实战中两者常<strong>组合使用</strong>：布隆挡掉大部分随机攻击，空值兜底剩余的重复查询。
        </p>
      </KeyIdea>

      <table>
        <thead>
          <tr><th>防护手段</th><th>挡住的请求</th><th>额外内存</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td>参数校验</td><td>明显非法(格式/范围)</td><td>无</td><td>第一道、必做</td></tr>
          <tr><td>缓存空值</td><td>重复查同一不存在 key</td><td>每个空 key 一份</td><td>不存在 key 有限可控</td></tr>
          <tr><td>布隆过滤器</td><td>海量随机不存在 key</td><td>极小(共享位数组)</td><td>数据量大、攻击随机</td></tr>
          <tr><td>限流/风控</td><td>异常高频来源</td><td>少量计数</td><td>恶意攻击兜底</td></tr>
        </tbody>
      </table>

      <h2>面试怎么答</h2>
      <p>
        被问到「如何解决缓存穿透」，建议这样组织：先<strong>讲清定义</strong>（查的数据缓存和数据库都没有，缓存永不命中，
        请求全打到 DB），再说<strong>危害</strong>（恶意攻击或异常请求直接压垮数据库），然后给出<strong>多层防护</strong>：
        入口处参数校验拦掉明显非法请求，缓存空值兜底，布隆过滤器前置拦截大流量，再加限流风控；最后<strong>对比两种缓存方案的取舍</strong>，
        说明实际会组合使用。能把「为什么空值要设短过期」「随机攻击为什么只能靠布隆」「布隆为什么不会误杀存在的 key」讲透，就明显高出一档。
      </p>

      <Practice title="实现缓存空值 + 布隆过滤拦截">
        <p>
          先做最朴素的参数校验，把明显非法的请求挡在最外层：
        </p>
        <CodeBlock lang="python" title="param_validate.py" code={validateCode} />
        <p>
          再实现缓存空值：数据库查不到时，把一个占位符 <code>__NULL__</code> 写进缓存并设短过期，
          下次同样的查询就能被缓存挡下。
        </p>
        <CodeBlock lang="python" title="cache_null.py" code={nullCacheCode} />
        <p>
          最后加上布隆过滤器做前置拦截，把「一定不存在」的请求挡在最外层，连缓存都不用碰：
        </p>
        <CodeBlock lang="python" title="bloom_filter.py" code={bloomCode} />
        <p>
          动手试试：用一批随机的不存在 ID 压测，对比「无防护」「只缓存空值」「布隆 + 空值」三种情况下，
          落到数据库的请求量分别是多少，体会两道防线各自挡掉了哪一部分流量。
        </p>
      </Practice>

      <Summary
        points={[
          '缓存穿透：查的数据缓存和数据库都没有，缓存永远建不起来，每次请求都打到数据库。',
          '典型危害是被恶意攻击或异常请求（如用不存在的用户 ID 刷接口）直接压垮数据库。',
          '防护一是缓存空值：数据库查空时把空也缓存起来，并设较短过期时间；只对重复查询的有限 key 有效。',
          '防护二是布隆过滤器：预存合法 key，请求先问它，说「不存在」就一定不存在，直接拒掉；专治海量随机攻击。',
          '入口处的参数合法性校验是成本最低的第一道防线，再叠加限流与风控封 IP。',
          '空值方案简单但占内存、对随机攻击无效；布隆省内存能扛海量但有误判、需维护 key 集合，实战常组合使用。',
        ]}
      />
    </>
  )
}
