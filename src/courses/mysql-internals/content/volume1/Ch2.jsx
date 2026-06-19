import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BufferPool from '@/courses/mysql-internals/illustrations/BufferPool.jsx'

const poolSizeSql = `-- 当前 Buffer Pool 大小（字节）。生产上常设为物理内存的 50%~75%
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Buffer Pool 被切成几个实例（减少并发争用），以及每页大小（默认 16KB）
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
SHOW VARIABLES LIKE 'innodb_page_size';`

const hitRateSql = `-- 取出两个累计计数器：逻辑读总次数 与 真正读磁盘的次数
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';  -- 逻辑读（总请求）
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads';          -- 物理读（未命中、走了磁盘）

-- 命中率 = (1 - 物理读 / 逻辑读) * 100%
-- 例：read_requests=10_000_000, reads=5_000
--     命中率 = (1 - 5000 / 10000000) * 100% = 99.95%
-- 在线 OLTP 系统通常应 >= 99%，若明显偏低，多半是 Buffer Pool 太小、内存装不下热数据

-- 更详细的运行态（含 LRU、脏页、等待）看这条的 BUFFER POOL AND MEMORY 段落
SHOW ENGINE INNODB STATUS\\G`

const poolStatusSql = `-- 用结构化视图看 Buffer Pool 的家底，比扒 SHOW ENGINE INNODB STATUS 直观
SELECT
  POOL_ID,
  POOL_SIZE                AS pages_total,        -- 总页数
  FREE_BUFFERS             AS pages_free,         -- 空闲页
  DATABASE_PAGES           AS pages_data,         -- 装着数据/索引的页
  OLD_DATABASE_PAGES       AS pages_old,          -- old 区页数
  MODIFIED_DATABASE_PAGES  AS pages_dirty,        -- 脏页数
  PAGES_MADE_YOUNG,                               -- 累计：old 晋升 young 的次数
  PAGES_NOT_MADE_YOUNG     -- 累计：在 old 区被访问但没满足晋升条件的次数
FROM information_schema.INNODB_BUFFER_POOL_STATS\\G

-- 脏页比例 = MODIFIED_DATABASE_PAGES / DATABASE_PAGES，
-- 长期顶着 innodb_max_dirty_pages_pct 说明刷盘跟不上写入`

const preheatSql = `-- 让 Buffer Pool 在关机时把“热页清单”dump 到磁盘，重启自动 load 预热
SHOW VARIABLES LIKE 'innodb_buffer_pool_dump_at_shutdown';  -- 建议 ON
SHOW VARIABLES LIKE 'innodb_buffer_pool_load_at_startup';   -- 建议 ON

-- 也可以手动触发一次 dump（不停机预演）
SET GLOBAL innodb_buffer_pool_dump_now = ON;

-- 观察预热进度
SHOW STATUS LIKE 'Innodb_buffer_pool_load_status';`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          InnoDB 的数据最终都躺在磁盘上，但它几乎从不直接读写磁盘——所有的读和写都先经过一块内存缓存，
          它叫 <em>Buffer Pool</em>。理解了「内存负责快、磁盘负责久，两者怎么分工和同步」，
          你就抓住了 InnoDB 性能的命门：为什么有的查询毫秒返回、有的却卡几百毫秒，答案常常就在「这页在不在内存里」。
        </p>
      </Lead>

      <h2>内存与磁盘的分工</h2>
      <p>
        磁盘（哪怕是 SSD）的随机访问也比内存慢几个数量级，所以 InnoDB 的核心策略是：
        <strong>把热数据尽量留在内存里，磁盘只做持久化的最终归宿</strong>。这条分界线两边各有一套结构：
      </p>
      <ul>
        <li><strong>内存侧</strong>：以 Buffer Pool 为主，外加 Change Buffer、Adaptive Hash Index、Log Buffer 等。</li>
        <li><strong>磁盘侧</strong>：表空间文件（<code>.ibd</code>）、redo log、undo log 等。</li>
      </ul>
      <p>
        InnoDB 读写的最小单位不是「行」，而是<em>页</em>（page），默认 <strong>16KB</strong>。
        哪怕你只 <code>SELECT</code> 一行，InnoDB 也是把这一行所在的整个 16KB 页从磁盘读进 Buffer Pool，再从页里取出那一行。
        所以「页」是贯穿内存和磁盘的统一搬运单位。
      </p>

      <h3>为什么要切成多个 instance</h3>
      <p>
        Buffer Pool 不是一整块大内存就万事大吉。它内部有一堆链表（LRU 链、free 链、flush 链）和哈希表，
        多线程同时读写时要抢同一把互斥锁（mutex），并发一高就成了瓶颈。InnoDB 的对策是把 Buffer Pool
        切成多个<em>实例</em>（<code>innodb_buffer_pool_instances</code>），每个实例有自己独立的链表和锁，
        一个页按哈希值固定落到某个实例里，从而把锁争用分散开。经验值：当 <code>innodb_buffer_pool_size</code> 大于 1GB 时，
        每个实例分到 1GB 左右比较合理；太小的实例反而浪费。注意这两个参数都需要重启才生效。
      </p>

      <Callout variant="note" title="页内部长什么样">
        <p>
          一个 16KB 的数据页不是简单的字节堆。它有固定的结构：<strong>File Header</strong>（页号、前后页指针，叶子链表就靠它）、
          <strong>Page Header</strong>（页内记录数、堆顶位置等）、<strong>User Records</strong>（真实行，按主键链成单向有序链表）、
          <strong>Free Space</strong>、<strong>Page Directory</strong>（页内的“稀疏目录”，让页内查找能二分而不是逐行扫）、<strong>File Trailer</strong>（校验和，检测半写损坏）。
          理解“页内还有个目录、页之间用 File Header 的指针串成双向链表”，你才真正懂了上一卷 B+ 树叶子链表是怎么落地的。
        </p>
      </Callout>

      <h2>Buffer Pool：一切读写的必经之路</h2>
      <p>
        Buffer Pool 缓存的是<strong>数据页和索引页</strong>。它的工作方式是：
      </p>
      <ul>
        <li>
          <strong>读</strong>：先在 Buffer Pool 里找目标页。找到了叫<em>命中</em>（hit），直接从内存返回，极快；
          没找到叫<em>未命中</em>（miss），就去磁盘把整页读进来，放进 Buffer Pool，再返回。
        </li>
        <li>
          <strong>写</strong>：修改也是先改内存里的页（改完的页叫<em>脏页</em>，dirty page），
          <strong>不立刻写磁盘</strong>，而是稍后由后台线程批量<em>刷盘</em>（flush）。这样把大量随机写攒成顺序的批量写，大幅提速。
        </li>
      </ul>
      <p>
        衡量 Buffer Pool 好不好用，最直接的指标是<em>命中率</em>：<code>命中率 = 1 - 物理读次数 / 逻辑读次数</code>。
        在线业务里这个值通常应在 <strong>99% 以上</strong>，若明显偏低，往往意味着 Buffer Pool 太小，热数据装不下，大量请求被迫读盘。
      </p>

      <h3>LRU 链表：young 区与 old 区</h3>
      <p>
        内存有限，Buffer Pool 满了就得淘汰旧页。它用的是改良过的 <em>LRU</em>（最近最少使用）链表——但不是教科书那种简单 LRU，
        而是把链表切成<strong>两段</strong>：
      </p>
      <ul>
        <li><strong>young 区</strong>（约占 5/8）：放真正的热页，最近被频繁访问的。</li>
        <li><strong>old 区</strong>（约占 3/8）：新读进来的页<strong>先放在这里</strong>，而不是直接进 young 区头部。</li>
      </ul>
      <p>
        为什么要这么设计？为了防<strong>全表扫描污染缓存</strong>。一次大表扫描或一个不走索引的统计查询，会瞬间读进海量页，
        如果它们直接挤进 young 区头部，会把真正的热数据全部挤出内存。InnoDB 的对策是：新页先进 old 区，只有当它
        在 <code>innodb_old_blocks_time</code>（默认 <strong>1000ms</strong>）之后<strong>再次被访问</strong>，才会晋升到 young 区。
        全表扫描的页大多读一次就不再用，自然就停留在 old 区被很快淘汰，热数据得以保全。
      </p>

      <Example title="一次查询的两种命运">
        <p>同样 <code>SELECT * FROM orders WHERE id = 1001</code>：</p>
        <ul>
          <li>
            <strong>页已在内存（命中）</strong>：直接从 Buffer Pool 的 young 区拿到页、取出行返回，耗时在微秒级。
          </li>
          <li>
            <strong>页不在内存（未命中）</strong>：触发一次磁盘随机读，把 16KB 页加载到 old 区，再返回。
            一次磁盘读可能就是几百微秒到几毫秒，比命中慢上千倍——这就是「冷查询慢、热查询快」的真相。
          </li>
        </ul>
      </Example>

      <BufferPool />

      <h3>预读：InnoDB 的「猜你要读」</h3>
      <p>
        除了被动地“用到才读”，InnoDB 还会主动<em>预读</em>（read-ahead），提前把可能用到的页搬进来，把多次随机读凑成一次批量顺序读：
      </p>
      <ul>
        <li><strong>线性预读</strong>（linear read-ahead）：当一个 extent（连续 64 个页 = 1MB）里被顺序访问的页数超过 <code>innodb_read_ahead_threshold</code>（默认 56）时，预判你会接着读下一个 extent，提前把它整段读进来。范围扫描特别受益。</li>
        <li><strong>随机预读</strong>（random read-ahead）：当一个 extent 里有很多页已在 Buffer Pool 时，把该 extent 剩余页也读进来。这个策略容易误判、默认关闭（<code>innodb_random_read_ahead=OFF</code>）。</li>
      </ul>
      <p>
        预读是把双刃剑：命中了省 IO，猜错了就白读、还污染缓存。可以用 <code>Innodb_buffer_pool_read_ahead</code> 和
        <code>Innodb_buffer_pool_read_ahead_evicted</code>（预读进来还没被用就被淘汰的页数）这两个状态值评估它的效果。</p>

      <KeyIdea title="脏页、刷盘与 WAL 的配合">
        <p>
          写操作只改内存、产生脏页，那宕机时还没刷盘的修改岂不是丢了？这正是 <em>redo log</em> 要解决的：
          修改在改内存页的同时，会把「这次改了什么」顺序写进 redo log（这就是 <em>WAL</em>，Write-Ahead Logging）。
          于是即使脏页还没落盘，只要 redo log 落了，宕机后就能靠它把内存重建出来。脏页的实际刷盘由后台线程按需进行，
          受 <code>innodb_io_capacity</code> 等参数控制——内存负责快，redo log 负责不丢，磁盘上的数据页负责最终一致，三者各司其职。
        </p>
      </KeyIdea>

      <h3>其它内存结构（一句话过一遍）</h3>
      <ul>
        <li>
          <strong>Change Buffer</strong>：当要改的<strong>二级索引页</strong>不在内存时，先把改动缓存起来，等那页因别的原因被读进来时再合并，省掉一次随机读盘。
        </li>
        <li>
          <strong>Adaptive Hash Index</strong>（自适应哈希索引）：InnoDB 观察到某些页被频繁等值查询时，自动为它们建一个哈希索引，把 B+ 树查找变成 O(1)。
        </li>
        <li>
          <strong>Log Buffer</strong>：redo log 写盘前的内存缓冲，事务提交时按 <code>innodb_flush_log_at_trx_commit</code> 策略刷到磁盘。
        </li>
      </ul>

      <Example title="一次诡异的命中率骤降排障">
        <p>
          某电商的商品详情接口凌晨 2 点开始集体超时，命中率从 99.8% 掉到 87%，但 SQL 没改、流量也没涨。排查过程：
        </p>
        <ul>
          <li>先看 <code>SHOW ENGINE INNODB STATUS</code> 的 BUFFER POOL 段，<code>pages evicted without access</code> 飙升——大量页被读进来还没被用就淘汰了。</li>
          <li>定位到凌晨有个定时任务在跑全表统计 <code>SELECT COUNT(*) ... GROUP BY</code>，扫了一张几千万行的大表。</li>
          <li>本该被 old/young 机制挡住，但该任务在 1 秒内反复访问同一批页（因为 GROUP BY 排序回读），触发了 young 晋升，把真正的热商品页挤出去了。</li>
        </ul>
        <p>
          解决：给统计任务加 <code>/*+ SET_VAR(...) */</code> 隔离、或挪到只读从库跑。教训：<strong>old/young 机制能挡“读一遍就走”的扫描，但挡不住“反复回读同一批冷页”的查询</strong>。
        </p>
      </Example>

      <h3>磁盘上的表空间与页</h3>
      <p>
        开启 <code>innodb_file_per_table</code>（默认开）后，每张表的数据和索引存在一个独立的 <code>.ibd</code> 文件里，叫<em>独立表空间</em>。
        文件内部按页组织，每页默认 16KB，页里再装行、页之间用 B+ 树的指针串起来。Buffer Pool 缓存的，就是从这些 <code>.ibd</code> 文件里搬上来的页。
      </p>

      <Callout variant="warn" title="别被这几个现象误导">
        <ul>
          <li>
            <strong>把 buffer_pool_size 设得过大</strong>：超过物理内存会引发操作系统换页（swap），反而比读盘还慢。常规上限是物理内存的 75% 左右，要给操作系统和连接留余量。
          </li>
          <li>
            <strong>一次大查询后命中率突然下降</strong>：可能是某个全表扫描把缓存搅乱了。先确认 LRU 的 old/young 机制是否生效，再看那条 SQL 能不能走索引避免全表扫。
          </li>
          <li>
            <strong>重启后前几分钟都慢</strong>：Buffer Pool 是空的（冷启动），热数据还没加载进来，命中率低很正常。可开启 Buffer Pool dump/load 在重启时预热。
          </li>
        </ul>
      </Callout>

      <h2>这对排查问题意味着什么</h2>
      <p>
        当某个接口偶发变慢，先别急着怀疑 SQL 写错：看一眼 Buffer Pool 命中率和这条查询命中的页是冷是热。
        命中率长期偏低，通常是<strong>内存不够装下热数据</strong>，加内存、调大 <code>innodb_buffer_pool_size</code> 往往比改 SQL 见效更快；
        而某条 SQL 单独慢、整体命中率却很高，则更可能是它走了全表扫描、读了大量冷页。
        把「这页在不在内存里」当成性能排查的第一性原理，很多玄学问题就清晰了。
      </p>

      <Practice title="量一量你的 Buffer Pool 命中率">
        <p>
          先看 Buffer Pool 配多大、每页多大；再取两个累计计数器算出命中率；最后用 <code>SHOW ENGINE INNODB STATUS</code> 看运行态细节。
        </p>
        <CodeBlock lang="sql" title="buffer_pool_size.sql" code={poolSizeSql} />
        <CodeBlock lang="sql" title="hit_rate.sql" code={hitRateSql} />
        <p>
          注意 <code>Innodb_buffer_pool_read_requests</code> 和 <code>Innodb_buffer_pool_reads</code> 都是<strong>累计值</strong>，
          想看实时命中率，应该取两个时间点的差值再代入公式，而不是直接用启动至今的总量（那会被历史数据稀释）。
        </p>
        <p>
          进阶：用 <code>INNODB_BUFFER_POOL_STATS</code> 视图看 old/young 区页数和晋升次数，再确认重启预热是否开启。
        </p>
        <CodeBlock lang="sql" title="pool_stats.sql" code={poolStatusSql} />
        <CodeBlock lang="sql" title="preheat.sql" code={preheatSql} />
      </Practice>

      <Summary
        points={[
          'InnoDB 读写都先经过内存里的 Buffer Pool，磁盘只做持久化；搬运的最小单位是页，默认 16KB。',
          'Buffer Pool 缓存数据页和索引页：读命中直接返回、未命中读盘加载；写先改内存生成脏页，再由后台批量刷盘。',
          '命中率 = 1 - 物理读 / 逻辑读，在线业务通常应在 99% 以上，偏低多半是 Buffer Pool 太小。',
          'LRU 链表分 young 区和 old 区，新页先进 old 区，1 秒后再次被访问才晋升 young，以防全表扫描污染热数据。',
          '脏页刷盘配合 redo log 的 WAL 机制保证宕机不丢数据；Change Buffer、Adaptive Hash Index、Log Buffer 各自再做优化。',
          '排查性能时把“这页在不在内存里”当第一性原理：命中率整体低就加内存，单条 SQL 慢就查它是不是读了大量冷页。',
        ]}
      />
    </>
  )
}
