import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CacheAside from '@/courses/redis-internals/illustrations/CacheAside.jsx'

const delayDoubleDeleteCode = `def update_price(product_id, new_price):
    key = "product:" + str(product_id)

    # 1. 先删一次缓存（让并发的读尽快感知到「该重新加载了」）
    redis.delete(key)

    # 2. 更新数据库（这是最终的事实来源）
    db.update_price(product_id, new_price)

    # 3. 延迟一小段时间后，再删一次缓存
    #    目的：清掉「在 1 和 2 之间，被旧值重新写回缓存」的脏数据
    sleep(0.5)            # 延迟 500 毫秒，覆盖一次读+回写的时间窗口
    redis.delete(key)`

const binlogCode = `# 订阅 binlog 由 canal 删缓存：业务代码只管写库，删缓存交给中间件
#
#   业务服务  --写-->  MySQL
#                        |  产生 binlog（数据变更日志）
#                        v
#   canal 伪装成从库，监听 binlog
#                        |  解析出「哪张表的哪行变了」
#                        v
#   消费者收到变更事件  --删-->  Redis 对应的 key
#
# 好处：删缓存动作与业务解耦；canal 自带重试，删失败可重投，保证最终一致`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          只要同一份数据在缓存和数据库里各存了一份，就有「两边对不上」的风险。更新到底先动谁、慢一步会发生什么、
          删缓存失败了怎么办——这些问题没有银弹，只有权衡。这一章我们把<em>缓存一致性</em>讲透。
        </p>
      </Lead>

      <h2>不一致的根源</h2>
      <p>
        本质很简单：数据有<strong>两份副本</strong>（缓存一份、数据库一份），而更新这两份不可能是「同一个瞬间」完成的，
        总有先后；再叠加<strong>并发</strong>——多个读写请求交错执行，就可能出现「数据库已经是新值，缓存里还是旧值」
        这种双写不一致。理解了「两份副本 + 有先后 + 有并发」这三要素，后面所有方案都是在围绕它们做文章。
      </p>

      <Example title="更新商品价格">
        <p>
          商品原价 100 元，运营改成 90 元。系统要做两件事：把数据库改成 90，把缓存也变成 90。如果中间出岔子：
        </p>
        <ul>
          <li>数据库已经是 90，缓存却还是 100 —— 用户看到的、下单算的都是旧价，可能造成资损或投诉；</li>
          <li>或者反过来，缓存先成了 90，数据库更新却失败回滚到 100 —— 缓存比数据库还「新」，同样不一致。</li>
        </ul>
        <p>
          整章我们都用「更新商品价格」这个例子，看不同策略下缓存和数据库会怎么对不上、又怎么尽量对上。
        </p>
      </Example>

      <CacheAside />

      <h2>为什么 Cache Aside 选「删缓存」而不是「更新缓存」</h2>
      <p>
        最常用的 <em>Cache Aside</em> 模式，写操作的标准做法是<strong>更新数据库 + 删除缓存</strong>，而不是
        <strong>更新数据库 + 更新缓存</strong>。原因有三：
      </p>
      <ul>
        <li>
          <strong>避免并发覆盖</strong>：两个写请求若都「更新缓存」，后完成的数据库写可能反而先写缓存，导致缓存留下旧值；
          而「删缓存」没有这个先后陷阱。
        </li>
        <li>
          <strong>省去无用计算</strong>：缓存值常常是多表聚合、计算后的结果。每次写都重算并更新缓存，若这条数据后续根本没人读，
          就是白费力气；删掉它，等真有人读时再按需重建（lazy loading）更划算。
        </li>
        <li>
          <strong>逻辑更简单</strong>：删除是幂等的，不用关心缓存里原来存的是什么格式。
        </li>
      </ul>

      <Callout variant="warn" title="面试陷阱：先删缓存还是先操作 DB">
        <p>
          这是高频追问。<strong>先删缓存、再更新 DB</strong> 有个并发漏洞：线程 A 删了缓存还没来得及更新 DB，
          线程 B 恰好来读，未命中→从 DB 读到<strong>旧值</strong>→把旧值写回缓存；随后 A 更新了 DB。
          结果缓存里是旧值、DB 是新值，长期不一致。
        </p>
        <p>
          所以更稳的顺序是<strong>先更新 DB、再删缓存</strong>。它也有极小概率不一致（B 在 A 删缓存前读到旧值并回写），
          但触发条件苛刻（要求读比写还慢且时序极其凑巧），实践中概率远低于前者。这就是大多数团队的默认选择。
        </p>
      </Callout>

      <h2>删缓存失败了怎么办</h2>
      <p>
        「先更新 DB 再删缓存」的前提是删缓存这一步要成功。可万一 Redis 抖动、网络超时，删除失败了呢？缓存就会一直留着旧值。
        两种常见兜底：
      </p>
      <ul>
        <li>
          <strong>消息队列重试</strong>：删缓存失败时，把这个 key 投递到 <em>MQ</em>，由消费者不断重试删除，直到成功为止。
        </li>
        <li>
          <strong>订阅 binlog 由 canal 删缓存</strong>：业务代码只负责写数据库，删缓存的动作完全交给中间件——
          用 <em>canal</em> 伪装成 MySQL 从库去监听 <em>binlog</em>，解析出数据变更后再去删对应的缓存 key。
          这样删缓存与业务解耦，且 canal 自带重试，能保证最终一致。
        </li>
      </ul>

      <h3>延迟双删</h3>
      <p>
        为了进一步压低「先更 DB 再删缓存」窗口期里被旧值回写的概率，可以用<strong>延迟双删</strong>：
        <strong>先删一次缓存 → 更新数据库 → 延迟一小段时间后再删一次缓存</strong>。第二次删除的意义在于：
        清掉「在第一次删除和数据库更新之间，被某个并发读用旧值重新写回」的脏缓存。延迟时长要略大于一次「读 DB + 写缓存」
        的耗时（常取几百毫秒），确保把那条可能的脏数据覆盖掉。
      </p>

      <KeyIdea title="强一致代价大，多数业务接受最终一致">
        <p>
          要做到缓存和数据库<strong>时刻强一致</strong>，往往得引入分布式锁、串行化写、甚至 2PC，
          这会大幅牺牲性能和可用性，得不偿失。所以绝大多数业务采用<strong>最终一致</strong>：允许极短时间的不一致，
          靠「删缓存 + 失败重试 + 延迟双删 / binlog 订阅」把窗口压到足够小、把最终结果对齐。
          像商品价格这种，短暂看到旧价可加上「下单时以数据库为准」的校验来兜底。
        </p>
      </KeyIdea>

      <h2>面试怎么答</h2>
      <p>
        先点出<strong>根因</strong>：数据有两份副本、更新有先后、又有并发，所以会不一致。再讲 <strong>Cache Aside 为什么用删缓存
        而非更新缓存</strong>（避免并发覆盖、省去无用计算、逻辑简单）。然后分析<strong>顺序问题</strong>：先删缓存再更 DB 容易被旧值回写，
        所以选先更 DB 再删缓存。接着给<strong>删失败的兜底</strong>（MQ 重试、canal 订阅 binlog）和<strong>延迟双删</strong>。
        最后表态：<strong>强一致代价高，业务上多取最终一致</strong>，并配以「关键操作以 DB 为准」的校验。层层递进，态度务实，最稳。
      </p>

      <Practice title="延迟双删的实现">
        <p>
          延迟双删的三步：先删一次、更新数据库、延迟后再删一次。第二次删除专门清理窗口期内被并发读回写的脏缓存。
        </p>
        <CodeBlock lang="python" title="delay_double_delete.py" code={delayDoubleDeleteCode} />
        <p>
          若想让删缓存更可靠、与业务彻底解耦，可以走订阅 binlog 由 canal 删缓存这条路：
        </p>
        <CodeBlock lang="text" title="canal_binlog.txt" code={binlogCode} />
        <p>
          动手验证：用两个线程模拟「一个写、一个读」的交错时序，观察先删缓存再更 DB 与先更 DB 再删缓存两种顺序下，
          缓存最终是旧值还是新值；再加上延迟双删，看脏数据是否被第二次删除清掉。
        </p>
      </Practice>

      <Summary
        points={[
          '双写不一致的根因：数据有缓存和数据库两份副本，更新有先后、又有并发交错。',
          'Cache Aside 写操作选「删缓存」而非「更新缓存」：避免并发覆盖、省去无用计算、逻辑更简单。',
          '顺序上先更新 DB 再删缓存更稳；先删缓存再更 DB 容易被并发读用旧值回写造成长期不一致。',
          '删缓存失败的兜底：用消息队列重试，或订阅 binlog 由 canal 异步删缓存，保证最终一致。',
          '延迟双删：先删缓存→更新 DB→延迟再删一次，清掉窗口期内被旧值回写的脏缓存。',
          '强一致代价大，多数业务接受最终一致，再以「关键操作以数据库为准」的校验兜底。',
        ]}
      />
    </>
  )
}
