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

      <Practice title="把读写流程写成代码并跑通命令">
        <p>
          先用伪代码理清读、写两条路径，再用真实的 Redis 命令验证回填与失效。
        </p>
        <CodeBlock lang="python" title="read_cache_aside.py" code={readPseudo} />
        <CodeBlock lang="python" title="write_cache_aside.py" code={writePseudo} />
        <CodeBlock lang="bash" title="redis-cli 命令" code={cmdCode} />
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
          'Read/Write Through 把加载与回写下沉到缓存层；Write Behind 异步回写、性能高但可能丢数据。',
          '给缓存设过期时间是最后一道保险，即使删缓存失败，过期后也能自愈到最新值。',
        ]}
      />
    </>
  )
}
