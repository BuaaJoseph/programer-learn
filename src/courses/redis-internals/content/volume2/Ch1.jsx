import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CacheAside from '@/courses/redis-internals/illustrations/CacheAside.jsx'

const readPseudo = `# 读流程：Cache Aside（旁路缓存）
def get_product(pid):
    key = 'product:' + pid
    data = redis.get(key)        # 1. 先查缓存
    if data is not None:
        return data              # 2. 命中：直接返回
    data = db.query_product(pid) # 3. 未命中：回源数据库
    if data is not None:
        redis.set(key, data, ex=600)  # 4. 回填缓存，设 10 分钟过期
    return data`

const writePseudo = `# 写流程：先更新数据库，再删缓存
def update_product(pid, new_data):
    db.update_product(pid, new_data)  # 1. 先写数据库
    redis.delete('product:' + pid)    # 2. 再删缓存（不是更新缓存）
    # 下次读请求自然会未命中，再从 DB 回填最新值`

const cmdCode = `# 读未命中后回填，带过期时间
GET  product:1001
SET  product:1001 "{...商品JSON...}" EX 600

# 写完数据库后删除缓存（让缓存失效）
DEL  product:1001

# 单独设置过期，常用于已有 key 续期
EXPIRE product:1001 600`

const nullCacheCode = `# 给「不存在的结果」也缓存一个短命占位，防穿透
def get_product(pid):
    key = 'product:' + pid
    data = redis.get(key)
    if data is not None:
        return None if data == '__NULL__' else data
    data = db.query_product(pid)
    if data is None:
        redis.set(key, '__NULL__', ex=30)  # 空值短过期，避免反复回源
        return None
    redis.set(key, data, ex=600)
    return data`

const ttlCmd = `# 过期相关命令：设置/查看/移除 TTL
SET product:1001 "{...}" EX 600     # 写入即设 600 秒过期
EXPIRE product:1001 600             # 给已有 key 设过期
PEXPIRE product:1001 600000         # 毫秒级过期
TTL product:1001                    # 查剩余秒数：-1=永不过期 -2=不存在
PERSIST product:1001                # 移除过期，变永久

# 原子写入：仅当 key 不存在时写(常用于回填竞争控制)
SET product:1001 "{...}" EX 600 NX`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          数据库扛不住高并发读，于是我们在它前面放一层 Redis。最常见的玩法叫
          <em>Cache Aside</em>（旁路缓存）：应用自己负责「读时回填、写时失效」，缓存只是个旁路加速器，
          而不是数据的唯一来源。理解它的读写流程，是几乎所有缓存面试题的起点。
        </p>
      </Lead>

      <h2>读流程：缓存优先，未命中回填</h2>
      <p>
        “旁路”的意思是：缓存站在数据库旁边，应用先问缓存，缓存没有再问数据库。
        读一个商品详情，标准四步是：先 <code>GET</code> 缓存；命中就直接返回；未命中就回源查数据库；
        查到后 <code>SET</code> 回缓存并设过期时间，下次就能命中了。
      </p>
      <p>
        这里有个常被忽略的细节：<strong>回填一定要带过期时间</strong>。过期时间是缓存系统最重要的「自愈机制」——
        即便后续某次删缓存失败、或缓存与数据库短暂不一致，过期之后下一次读也会回源拿到最新值，把脏数据冲掉。
        没有过期时间的缓存，一旦写脏就永远脏，且会无限占用内存。
      </p>

      <h2>写流程：更新数据库，然后删缓存</h2>
      <p>
        写的时候只有两步：先把数据库改掉，再把对应的缓存 <strong>删掉</strong>（注意是删，不是改）。
        删掉之后缓存里就没这条数据了，下一次读请求会未命中，自然从数据库读到最新值再回填。
      </p>

      <Example title="商品详情页缓存">
        <p>
          假设一个电商商品详情页 QPS 上万，绝大多数是读。第一个用户访问商品 1001 时缓存未命中，
          回源数据库拿到详情，写进 <code>product:1001</code> 并设 10 分钟过期；
          后面成千上万个用户都直接命中缓存，数据库几乎没压力。
        </p>
        <p>
          运营改了这个商品的价格，调用更新接口：先把 MySQL 里的价格改成新值，
          然后 <code>DEL product:1001</code>。下一个看详情的用户未命中，回源读到新价格再回填。整个过程数据库只被读了一次。
        </p>
      </Example>

      <CacheAside />

      <h2>为什么写时是「删缓存」而不是「更新缓存」</h2>
      <p>
        这是最经典的面试追问。直觉上「数据库改了，顺手把缓存也改成新值」似乎更省事，
        但在并发下它会埋下脏数据，原因有两个。
      </p>

      <Example title="并发双写产生脏数据">
        <p>
          假设用「更新缓存」策略，请求 A 把价格改成 100，请求 B 把价格改成 200，几乎同时发生：
        </p>
        <ul>
          <li>A 先写数据库为 100，B 后写数据库为 200（数据库最终是 200，正确）</li>
          <li>但由于线程调度，B 先更新缓存为 200，A 后更新缓存为 100</li>
          <li>结果：数据库是 200，缓存是 100，<strong>缓存与数据库长期不一致</strong></li>
        </ul>
        <p>
          如果改成「删缓存」，两个请求最后都只是把同一个 key 删掉，删两次也无所谓，
          下次读自然回填出数据库里的 200，不会留下脏值。
        </p>
      </Example>

      <KeyIdea title="删缓存的两个理由">
        <p>
          一是<strong>避免并发双写脏数据</strong>：删是幂等的，谁先删谁后删都得到「缓存为空」这一确定状态；
          二是<strong>更新代价</strong>：缓存里常存的是经过聚合、拼装的复杂结果（比如详情页是多表 join 出来的），
          写时去重算这份结果很浪费，而且这个商品可能根本没人看，算了也白算。删掉、按需懒加载更划算。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="面试陷阱：先删缓存还是先写库">
        <p>
          要先写数据库、再删缓存。如果反过来「先删缓存、再写库」，在两步之间若有读请求未命中，
          会把<strong>旧值</strong>回填进缓存，等数据库写完后缓存里却是旧数据。
          先写库再删缓存能把这个不一致窗口压到最小（极端边界仍可能出现，工程上常用「延迟双删」或给缓存设较短过期兜底）。
        </p>
      </Callout>

      <h2>命中率：缓存的生命线</h2>
      <p>
        Cache Aside 能不能挡住数据库，全看<strong>命中率</strong>（hit rate = 命中数 / 总请求数）。
        命中率 99% 和 90% 落库压力相差 10 倍。影响命中率的关键有三：
      </p>
      <ul>
        <li>
          <strong>过期时间设置</strong>：太短频繁回源、命中率低；太长又占内存、数据陈旧。要按数据更新频率与读热度调，
          热数据可适当长、冷数据可短。
        </li>
        <li>
          <strong>缓存预热</strong>：系统上线或大促前，提前把热点数据批量灌进缓存，避免冷启动时大量请求齐刷刷回源。
        </li>
        <li>
          <strong>淘汰策略</strong>：内存满时 Redis 按 <code>maxmemory-policy</code>（如 <code>allkeys-lru</code>）淘汰冷 key，
          配错了会把热点也淘汰掉，命中率骤降。
        </li>
      </ul>

      <h3>三种缓存粒度</h3>
      <p>
        同一份数据可以缓存在不同粒度上，命中率与一致性各有取舍：<strong>对象级</strong>（一个商品一个 key，最常用，
        改一个商品只失效一个 key）、<strong>列表/结果级</strong>（缓存一整页查询结果，命中率高但任一元素变更都得整页失效）、
        <strong>页面级</strong>（缓存整个渲染好的 HTML 片段，最快但最难维护一致）。粒度越粗越快、越难一致。
      </p>

      <h2>和 Read/Write Through、Write Behind 的区别</h2>
      <p>
        <em>Cache Aside</em> 是<strong>应用</strong>自己管缓存。另外几种把缓存逻辑下沉到了缓存层本身：
      </p>
      <ul>
        <li>
          <strong>Read/Write Through</strong>（读写穿透）：应用只跟缓存打交道，缓存未命中时由<strong>缓存组件</strong>
          自己去数据库加载并返回；写也只写缓存，由缓存<strong>同步</strong>写回数据库。应用代码更干净，但要缓存层支持。
        </li>
        <li>
          <strong>Write Behind</strong>（写回 / 异步回写）：写只写缓存就立刻返回，缓存<strong>异步批量</strong>刷回数据库。
          写性能极高，但缓存宕机可能丢数据，一致性最弱，适合可容忍丢失的计数、点赞类场景。
        </li>
      </ul>
      <table>
        <thead>
          <tr><th>模式</th><th>谁管缓存</th><th>一致性</th><th>性能</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td>Cache Aside</td><td>应用</td><td>最终一致</td><td>读快</td><td>读多写少的通用缓存</td></tr>
          <tr><td>Read/Write Through</td><td>缓存组件</td><td>较强</td><td>写同步偏慢</td><td>本地缓存框架</td></tr>
          <tr><td>Write Behind</td><td>缓存组件</td><td>最弱</td><td>写极快</td><td>计数、点赞等可丢数据</td></tr>
        </tbody>
      </table>

      <h2>面试怎么答</h2>
      <p>
        被问「缓存读写怎么设计」，主线是 Cache Aside：读缓存优先、未命中回源回填并设过期；写先更库再删缓存。
        追问「为什么删不更新」答并发覆盖 + 省无用计算；追问「为什么先库后缓存」答先删缓存会被旧值回写；
        追问「删失败怎么办」答靠过期兜底、或延迟双删、或 binlog 订阅重试。再补一句命中率与预热，层次就全了。
      </p>

      <Practice title="把读写流程写成代码并跑通命令">
        <p>
          先用伪代码理清读、写两条路径，再用真实的 Redis 命令验证回填与失效。
        </p>
        <CodeBlock lang="python" title="read_cache_aside.py" code={readPseudo} />
        <CodeBlock lang="python" title="write_cache_aside.py" code={writePseudo} />
        <CodeBlock lang="bash" title="redis-cli 命令" code={cmdCode} />
        <p>
          再看一版带「空值缓存」的读流程，顺便防住查不存在数据的穿透：
        </p>
        <CodeBlock lang="python" title="read_with_null_cache.py" code={nullCacheCode} />
        <p>
          熟悉一下过期相关命令，理解过期时间这道兜底保险：
        </p>
        <CodeBlock lang="bash" title="TTL / EXPIRE / PERSIST" code={ttlCmd} />
        <p>
          动手试试：先 <code>SET product:1001 ... EX 600</code>，再 <code>DEL product:1001</code>，
          然后 <code>GET product:1001</code> 看到返回 nil，体会「删缓存让下次读回源」的效果。
        </p>
      </Practice>

      <Summary
        points={[
          'Cache Aside（旁路缓存）由应用自己管缓存：读时缓存优先、未命中回源并回填；写时更新数据库后删缓存。',
          '读流程四步：GET 缓存 → 命中返回 → 未命中查库 → SET 回填并设过期时间。',
          '写时删缓存而非更新缓存：删是幂等的，能避免并发双写产生的脏数据，也省去重算复杂缓存值的代价。',
          '顺序要「先写库、再删缓存」，把不一致窗口压到最小；极端场景用延迟双删或短过期兜底。',
          '过期时间是缓存自愈机制；命中率靠合理 TTL、缓存预热、正确淘汰策略来保证。',
          'Read/Write Through 把加载与回写下沉到缓存层；Write Behind 异步回写、性能高但可能丢数据。',
        ]}
      />
    </>
  )
}
