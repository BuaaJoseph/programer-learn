import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const replText = `主从复制三线程：
主库  -- dump 线程：把 binlog 发给从库
从库  -- IO 线程：接收 binlog，写入本地 relay log（中继日志）
从库  -- SQL 线程：读 relay log，重放 SQL，应用到从库数据
=> 异步：主库写完不等从库，所以会有"主从延迟"`

const cursorSql = `-- 游标/书签分页：记住上次最大 id，避免大 OFFSET 全表扫描
-- 第一页
SELECT * FROM orders WHERE id > 0 ORDER BY id LIMIT 1000;
-- 下一页（用上一页返回的最大 id）
SELECT * FROM orders WHERE id > 1000 ORDER BY id LIMIT 1000;`

const shardText = `分库分表的拆分方式：
垂直拆分：按"列/业务"拆 —— 把大表的字段、不同业务表拆到不同库/表
水平拆分：按"行"拆 —— 同一张表的数据按规则分散到多个库/表
  分片键策略：
   - 范围(Range)：按 id/时间区间分，扩容易但易热点
   - 取模(Hash)：id % N，分布均匀但扩容要迁数据
   - 一致性哈希：扩容时迁移量小`

export default function Ch3() {
  return (
    <article>
      <Lead>
        当单库单表扛不住时，就要谈高可用与水平扩展。这一章讲主从同步机制、主从延迟怎么处理、读写分离、
        如何避免单点故障，以及最硬核的分库分表——拆分策略、实施流程、引发的问题、不停服迁移、
        CDC 与全量增量同步。这些是高级面试和架构设计题的常客。
      </Lead>

      <h2>一、主从同步机制</h2>
      <h3>题目：MySQL 主从是怎么同步的？</h3>
      <p>主从复制基于 binlog，核心是<strong>三个线程</strong>：</p>
      <CodeBlock lang="text" title="主从复制流程" code={replText} />
      <p>
        默认是<strong>异步复制</strong>：主库写完 binlog 就返回，不等从库，性能好但主库宕机可能丢未同步的数据。
        改进有<strong>半同步复制</strong>（主库等至少一个从库收到 binlog 才返回，更安全）和
        基于 <strong>GTID</strong>（全局事务 ID）的复制（便于故障切换和定位）。
      </p>

      <h2>二、主从延迟怎么处理</h2>
      <h3>题目：主从延迟会带来什么问题，怎么解决？</h3>
      <p>
        延迟的典型坑是"写后读"：刚在主库写完，马上去从库读却读不到（还没同步过来）。处理思路：
      </p>
      <ul>
        <li><strong>强制读主</strong>：对一致性敏感的"写后立即读"，直接读主库。</li>
        <li><strong>从库并行重放</strong>：开启从库多线程复制，加快重放、减少延迟。</li>
        <li><strong>判断同步位点</strong>：用 GTID/位点确认从库已追上再读从库。</li>
        <li><strong>缓存兜底</strong>：写主库后把结果写一份缓存，读时先读缓存。</li>
      </ul>
      <KeyIdea>
        主从延迟的根因是复制是异步的、从库重放需要时间。解决不是消灭延迟（做不到），
        而是<strong>对一致性敏感的读绕开从库</strong>，对能容忍短暂不一致的读放心走从库。
      </KeyIdea>

      <h2>三、读写分离与避免单点</h2>
      <h3>题目：读写分离怎么落地？怎么避免单点故障？</h3>
      <p>
        <strong>读写分离</strong>：写走主库、读走从库（一主多从），把读压力分摊到从库，提升整体吞吐。
        落地靠中间件（如 ShardingSphere、MyCat）或应用层数据源路由。
      </p>
      <p>
        <strong>避免单点故障</strong>：
      </p>
      <ul>
        <li><strong>主库高可用</strong>：用 MHA、MGR（MySQL Group Replication）等，主库挂了自动选新主、切换。</li>
        <li><strong>多从</strong>：一个从库挂了还有其他从库分担读。</li>
        <li><strong>VIP/中间件</strong>：应用连虚 IP 或中间件，切换对应用透明。</li>
      </ul>

      <h2>四、分库分表</h2>
      <h3>题目：什么时候分库分表？怎么拆？</h3>
      <p>
        当单表数据量过大（通常千万级以上、B+Tree 层数变高、查询变慢）、单库连接/写入达瓶颈时考虑。
        拆分有两个方向：
      </p>
      <CodeBlock lang="text" title="分库分表方式" code={shardText} />
      <Callout variant="warn" title="分库分表引发的新问题">
        ① <strong>跨库 JOIN 难</strong>：数据分散，JOIN 要在应用层做或冗余字段；
        ② <strong>分布式事务</strong>：跨库写一致性变难，常用最终一致/TCC/Saga；
        ③ <strong>全局唯一 ID</strong>：自增主键不再全局唯一，要用雪花算法等；
        ④ <strong>跨库分页/排序/聚合</strong>变复杂；⑤ <strong>分片键选不好会数据倾斜</strong>。
        所以分库分表是"不得已"的方案，能靠索引、读写分离、归档先扛就别急着拆。
      </Callout>
      <p>
        <strong>实施流程</strong>大致是：评估容量与增长 → 选分片键（要选查询最常用、分布均匀的列）→
        选拆分策略（范围/取模/一致性哈希）→ 双写或数据迁移 → 灰度切流 → 下线旧库。
      </p>

      <h2>五、不停服迁移与数据同步</h2>
      <h3>题目：怎么在不停服的情况下做数据迁移？</h3>
      <p>经典做法是<strong>双写 + 全量 + 增量</strong>：</p>
      <ul>
        <li><strong>全量同步</strong>：把存量历史数据一次性搬到新库（批量、分批跑）。</li>
        <li><strong>增量同步</strong>：全量期间和之后产生的新变更，靠订阅 binlog 持续追到新库。</li>
        <li><strong>双写</strong>：迁移期间应用同时写新旧库，保证不丢数据。</li>
        <li><strong>校验 + 切流</strong>：比对新旧库一致后，灰度把读写切到新库，观察无误再下线旧库。</li>
      </ul>
      <Callout variant="note" title="CDC 是什么">
        <strong>CDC（Change Data Capture，变更数据捕获）</strong>就是通过解析 binlog 把数据变更
        实时捕获出来同步到别处。Canal、Debezium 都是常用 CDC 工具——它们伪装成一个从库，
        订阅主库 binlog，从而拿到增量变更。增量同步、迁移、缓存/搜索引擎同步都靠它。
      </Callout>

      <h2>六、同步与入库的工程细节</h2>
      <h3>题目：批量入库、多线程同步、游标分页要注意什么？</h3>
      <ul>
        <li><strong>全量 vs 增量</strong>：全量是搬存量、一次性、量大；增量是持续追变更、靠 binlog。
          一般先全量打底，再用增量补齐期间的变化。</li>
        <li><strong>批量入库 vs 单条</strong>：批量（一条 INSERT 插多行、或多条合一事务）能大幅减少网络往返和事务开销，
          远快于单条循环插入；但批太大会撑爆事务/内存，要控制每批大小（如 500~1000 行）。</li>
        <li><strong>多线程并发同步</strong>：要注意同一主键/同一行的变更必须<strong>保持顺序</strong>
          （否则旧覆盖新），常按主键哈希分配线程保证同一行串行；还要做幂等，避免重复消费 binlog 导致重复写。</li>
        <li><strong>游标(Cursor)分页</strong>：迁移大表读取时别用 <code>LIMIT 大offset</code>（深度分页慢），
          用"记住上次最大 id 往后取"的游标方式，每批稳定快速。</li>
      </ul>
      <CodeBlock lang="sql" title="游标分页读取大表" code={cursorSql} />
      <Example title="一次典型的迁移流水">
        <p>
          先用游标分页全量把旧表搬到新表（每批 1000 行、批量 INSERT）；同时用 Canal 订阅旧库 binlog，
          把全量期间的增量变更按主键哈希分多线程、保序地写到新库；全量完成后等增量追平，
          做行数与抽样校验；一致后灰度切读、再切写，双写观察一段时间，最后下线旧表。
        </p>
      </Example>

      <h2>七、再追几个扩展架构问题</h2>
      <h3>题目：分库分表后怎么生成全局唯一 ID</h3>
      <p>
        各库各自的自增主键不再全局唯一，常见方案：① <strong>雪花算法（Snowflake）</strong>——
        用"时间戳 + 机器号 + 序列号"拼成 64 位整数，趋势递增、对索引友好、本地生成无中心瓶颈；
        ② <strong>号段模式</strong>——从一张中心表批量取一段 ID 缓存在本地发放，减少中心库压力；
        ③ Redis 自增等。要避免用 UUID 做分布式主键，因为它无序、会引发页分裂。
      </p>
      <h3>题目：分片键选错了有多严重</h3>
      <p>
        分片键决定数据落在哪个分片，选错的后果很难补救：选了区分度低或分布不均的列会
        <strong>数据倾斜</strong>（某个分片爆满、其他空闲）；选了查询不常用的列，
        大量查询要<strong>扫所有分片再聚合</strong>，等于没分。原则是选<strong>查询最频繁、分布均匀</strong>的列
        （常是 user_id）。改分片键基本等于重做一次迁移，所以要在设计期想清楚。
      </p>
      <h3>题目：半同步复制和异步复制怎么选</h3>
      <p>
        异步复制主库写完就返回，性能最好但主库宕机可能丢未传走的事务；半同步要求至少一个从库
        确认收到 binlog 才返回，牺牲一点延迟换<strong>更强的不丢数据保证</strong>。
        对金融等强一致场景用半同步（或 MGR 的多数派提交），对一般业务异步够用。
      </p>
      <h3>题目：分库分表后跨库分页怎么做</h3>
      <p>
        单库分页直接 <code>LIMIT</code> 即可，跨库就麻烦了。要取"全局第 100~110 条按时间排序"，
        不能简单地让每个分片各取第 100~110 条——因为合并后顺序会乱。常见做法是
        <strong>各分片都取前 110 条</strong>，在应用层归并排序后再截取 100~110，
        代价是偏移越大、各分片要返回的数据越多。所以分库分表后应尽量避免深度跨库分页，
        改用游标（记住上次最大排序值）或把结果导到 ES 这类擅长聚合的系统里查。
      </p>
      <h3>题目：双写期间数据不一致怎么兜底</h3>
      <p>
        双写很难做到两库严格同时成功（写完旧库、还没写新库就宕机）。所以双写要配
        <strong>对账校验</strong>：定时比对新旧库的行数和关键字段，发现不一致就以某一方为准修复；
        增量同步也要做<strong>幂等</strong>（按主键 upsert），即使 binlog 重复消费也不会写错。
        切流前一定要等校验通过，宁可多观察一段时间也不要急着下线旧库。
      </p>
      <Callout variant="tip" title="扩展这章的主线">
        先用读写分离分摊读、缓存挡热点，扛不住再分库分表；分表带来全局 ID、跨库事务、跨库分页、
        倾斜等问题，迁移用全量+增量(CDC)+双写+校验切流。能不拆就不拆，拆就提前想清分片键。
      </Callout>

      <Summary
        points={[
          '主从复制三线程：主 dump 线程发 binlog，从 IO 线程写 relay log，从 SQL 线程重放；默认异步，故有延迟。',
          '主从延迟处理：敏感的写后读强制读主、从库并行重放、按位点/GTID 判断、缓存兜底；目标是绕开而非消灭延迟。',
          '读写分离=写主读从分摊读压力；避免单点靠 MHA/MGR 自动切主、多从、VIP/中间件透明切换。',
          '分库分表：垂直按业务拆、水平按行拆(范围/取模/一致性哈希)；引发跨库JOIN、分布式事务、全局ID、数据倾斜等问题，是不得已方案。',
          '不停服迁移=双写+全量+增量+校验切流；CDC(Canal/Debezium)伪装从库解析 binlog 捕获增量变更。',
          '工程细节：先全量后增量、批量入库远快于单条但要控批大小、多线程同步要按主键保序且幂等、读大表用游标分页而非大 offset。',
        ]}
      />
    </article>
  )
}
