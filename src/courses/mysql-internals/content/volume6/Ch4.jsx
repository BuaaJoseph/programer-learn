import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const slowLogSql = `-- 开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;      -- 超过 1 秒记为慢查询
-- 看哪些 SQL 慢（用 mysqldumpslow 或 pt-query-digest 分析慢日志）
SHOW VARIABLES LIKE 'slow_query_log%';`

const tuneSql = `-- 调优常用手段
EXPLAIN SELECT ...;                 -- 先看执行计划
-- 1) 避免 SELECT *，只取需要的列（利于覆盖索引）
-- 2) WHERE/排序/分组列建合适的联合索引，注意最左前缀
-- 3) 避免索引列上做函数/隐式转换导致失效
-- 4) 大偏移分页改为游标/延迟关联
-- 5) 大事务拆小、批量写入控制批大小`

export default function Ch4() {
  return (
    <article>
      <Lead>
        最后一章聊"设计与优化"：怎么建一张好表、范式怎么用、逻辑删除与外键的取舍、视图游标、
        SQL 调优与慢 SQL 治理、InnoDB 与 MyISAM 的区别，以及一串"为什么不"的经典题——
        为什么不存大字段、为什么不推荐存储过程。这些题考的是工程经验和取舍判断。
      </Lead>

      <h2>一、三大范式</h2>
      <h3>题目：三大范式分别是什么？要严格遵守吗？</h3>
      <ul>
        <li><strong>第一范式（1NF）</strong>：每个字段都是<strong>原子的</strong>、不可再分。
          比如"地址"拆成省市区而不是塞一个大字符串（视业务）。</li>
        <li><strong>第二范式（2NF）</strong>：在 1NF 基础上，非主键字段必须<strong>完全依赖</strong>整个主键，
          不能只依赖联合主键的一部分。</li>
        <li><strong>第三范式（3NF）</strong>：在 2NF 基础上，非主键字段不能<strong>传递依赖</strong>主键
          （A→B、B→C 这种间接依赖要拆开）。</li>
      </ul>
      <KeyIdea>
        范式减少冗余、保证一致；但实战中常<strong>反范式</strong>——故意冗余一些字段（如把用户名冗余到订单表），
        用空间换取少做 JOIN、提升查询性能。所以原则是"理解范式、按需反范式"，不必教条遵守。
      </KeyIdea>

      <h2>二、建表注意什么</h2>
      <h3>题目：设计一张表你会注意哪些点？</h3>
      <ul>
        <li>选合适的主键：用<strong>自增 bigint</strong>，避免 UUID 随机主键导致页分裂。</li>
        <li>字段尽量<strong>NOT NULL</strong> 并给默认值：NULL 占额外空间、让索引和比较更复杂。</li>
        <li>类型够用就好：能用 int 不用 bigint、能用 varchar(50) 不用 varchar(255)，金额用 DECIMAL。</li>
        <li>加必要的<strong>审计字段</strong>：created_at、updated_at、逻辑删除标记。</li>
        <li>合理建索引，控制单表字段数和单行长度，预估数据量决定是否提前分表。</li>
      </ul>

      <h2>三、逻辑删除 vs 物理删除 / 逻辑外键 vs 物理外键</h2>
      <h3>题目：删除数据该真删还是标记删？外键要不要建？</h3>
      <table>
        <thead>
          <tr><th>对比</th><th>逻辑删除（标记 is_deleted）</th><th>物理删除（DELETE）</th></tr>
        </thead>
        <tbody>
          <tr><td>做法</td><td>加删除标记字段，查询带 where is_deleted=0</td><td>真正从表里删掉行</td></tr>
          <tr><td>优点</td><td>可恢复、保留历史、可审计</td><td>表干净、不占空间</td></tr>
          <tr><td>缺点</td><td>数据越积越多、每个查询要带条件、影响索引</td><td>删了难恢复</td></tr>
        </tbody>
      </table>
      <p>
        互联网业务多用<strong>逻辑删除</strong>（数据可恢复、有审计需求），但要配合定期归档老数据避免膨胀。
      </p>
      <Callout variant="note" title="逻辑外键 vs 物理外键">
        <strong>物理外键</strong>是数据库 <code>FOREIGN KEY</code> 约束，能自动保证引用完整性，
        但<strong>每次增删改都要检查约束、加锁，影响性能、且不利于分库分表</strong>。
        所以互联网大厂普遍<strong>不用物理外键</strong>，改用<strong>逻辑外键</strong>——
        只在表里存关联字段（如 user_id），由<strong>应用层</strong>保证一致性。
      </Callout>

      <h2>四、视图与游标</h2>
      <h3>题目：视图和游标是什么，什么时候用？</h3>
      <p>
        <strong>视图（View）</strong>是一条 SQL 的"虚拟表"，本身不存数据，查询它时执行底层 SQL。
        好处是封装复杂查询、做权限隔离（只暴露部分列）；坏处是可能掩盖性能问题、嵌套视图难优化。
      </p>
      <p>
        <strong>游标（Cursor）</strong>是在存储过程里逐行遍历结果集的机制。它一次处理一行，
        在大数据量下效率低（逐行慢），所以能用集合操作（一条 SQL 批量处理）就别用游标。
      </p>

      <h2>五、SQL 调优与慢 SQL 治理</h2>
      <h3>题目：线上有慢 SQL，你怎么定位和优化？</h3>
      <p>
        <strong>定位</strong>：开<strong>慢查询日志</strong>，把执行超过阈值的 SQL 记下来，
        用 <code>pt-query-digest</code> 等工具按耗时、频次聚合排序，找出最该优化的几条。
      </p>
      <CodeBlock lang="sql" title="慢查询日志" code={slowLogSql} />
      <p><strong>优化</strong>：拿到慢 SQL 先 EXPLAIN 看执行计划，再对症下药：</p>
      <CodeBlock lang="sql" title="常用调优手段" code={tuneSql} />
      <p>
        <strong>整体性能优化方法</strong>分层来看：① SQL 与索引层（最常见、收益最高）；
        ② 表结构层（合理类型、反范式、归档）；③ 架构层（读写分离、缓存、分库分表）；
        ④ 配置层（Buffer Pool 大小等参数）；⑤ 硬件层（SSD、内存）。优先从上往下做，性价比最高。
      </p>

      <h2>六、InnoDB vs MyISAM 与存储引擎</h2>
      <h3>题目：InnoDB 和 MyISAM 有什么区别？</h3>
      <table>
        <thead>
          <tr><th>对比</th><th>InnoDB</th><th>MyISAM</th></tr>
        </thead>
        <tbody>
          <tr><td>事务</td><td>支持（ACID）</td><td>不支持</td></tr>
          <tr><td>锁</td><td>行锁（并发好）</td><td>表锁</td></tr>
          <tr><td>外键</td><td>支持</td><td>不支持</td></tr>
          <tr><td>崩溃恢复</td><td>有 redo，支持</td><td>无，易损坏</td></tr>
          <tr><td>索引</td><td>聚簇索引（数据和主键索引一起）</td><td>非聚簇（索引和数据分离）</td></tr>
          <tr><td>count(*)</td><td>实时数（因 MVCC）</td><td>存了总数、O(1)</td></tr>
        </tbody>
      </table>
      <p>需要事务、行锁、高并发用 InnoDB（默认且推荐）；只读、count 多的归档表才可能考虑 MyISAM。</p>

      <h2>七、几个"为什么不"</h2>
      <ul>
        <li><strong>为什么不在 MySQL 存图片/音视频等大字段</strong>：大字段撑大行、占满 Buffer Pool、
          拖慢所有查询、备份和复制变慢。正确做法是把文件存对象存储（OSS/S3），
          表里只存<strong>URL/路径</strong>。</li>
        <li><strong>为什么不推荐用存储过程</strong>：难以版本管理和调试、把业务逻辑耦合进数据库、
          可移植性差、不利于水平扩展和监控。互联网倾向把逻辑放在应用层，数据库只管存取。</li>
        <li><strong>相比 Oracle 的优势</strong>：MySQL <strong>开源免费</strong>、轻量、部署运维简单、
          生态和社区庞大、与互联网技术栈契合，扩展（主从、分库分表）方案成熟。
          Oracle 功能更全、单机能力更强，但昂贵且重。</li>
      </ul>
      <Example title="大字段的真实代价">
        <p>
          把一张用户表里塞了 base64 头像，单行从几百字节涨到几十 KB。结果一次普通的列表查询要读大量页，
          Buffer Pool 被这些大行挤占，缓存命中率骤降，整库查询都变慢。改成只存头像 URL 后，
          单行回到几百字节，查询恢复正常——这就是"不在库里存大字段"的直接收益。
        </p>
      </Example>

      <h2>八、再追几个设计取舍问题</h2>
      <h3>题目：宽表好还是拆表好</h3>
      <p>
        宽表（一张表很多列）查询时一次拿全、少 JOIN，但单行变长、冷热字段混在一起、
        Buffer Pool 利用率低，且改表结构影响面大。把<strong>不常用或大字段拆到副表</strong>
        （垂直拆分），让主表保持精简、命中率高，是常见做法。判断依据是字段的访问频率和大小——
        高频小字段留主表，低频大字段拆出去。</p>
      <h3>题目：为什么不建议用太多触发器</h3>
      <p>
        触发器把逻辑藏在数据库里，应用层看不到，<strong>排查问题时极易遗漏</strong>；
        它在 DML 时同步执行、增加写入开销和锁持有时间；还难以版本管理和测试。
        和存储过程一样，互联网倾向把这类逻辑放到应用层显式处理，让数据库回归"纯粹存取"的角色。
      </p>
      <h3>题目：怎么判断该加缓存还是优化 SQL</h3>
      <p>
        先优化 SQL 和索引（治本、成本低）；当单条已经很快但<strong>QPS 极高、且数据读多写少</strong>时，
        再上缓存（如 Redis）挡住重复读。缓存是"用一致性复杂度换吞吐"——要处理缓存更新、穿透、雪崩，
        所以不是第一选择，而是 SQL 层榨干后的下一步。优化永远遵循"先便宜后昂贵"的顺序。
      </p>
      <h3>题目：分区表和分库分表是一回事吗</h3>
      <p>
        不是。<strong>分区表</strong>是 MySQL 内置功能，把一张表在<strong>同一个实例</strong>内按规则
        （范围/哈希等）拆成多个物理分区，对应用透明、SQL 不用改，但所有分区还在同一台机器上、
        无法突破单机瓶颈，能力有限。<strong>分库分表</strong>是把数据分散到<strong>多个实例/多台机器</strong>，
        能真正水平扩展，但要中间件、要改造、要处理跨库问题。一句话：分区表是单机内的拆，
        分库分表是跨机器的拆。
      </p>
      <h3>题目：怎么做容量评估和提前分表</h3>
      <p>
        建表前先估算<strong>年增长行数</strong>和单行大小，结合"单表千万级开始变慢"的经验值，
        判断几年内会不会到瓶颈。如果会，宁可<strong>一开始就按合理数量分表</strong>
        （如按 user_id 取模分 16/32/64 张），避免上线后再迁移的巨大代价。
        分表数量最好取 2 的幂，方便后续按倍数扩容时的数据再分布。
      </p>
      <Callout variant="tip" title="设计这章的主线">
        理解范式但按需反范式；建表选自增主键、尽量 NOT NULL、类型够用；逻辑删除/逻辑外键由应用兜底；
        优化从 SQL/索引到架构逐级来；大字段、存储过程、过多触发器都让数据库回归"纯存取"。
      </Callout>

      <Summary
        points={[
          '三大范式=原子(1NF)、完全依赖(2NF)、无传递依赖(3NF)；实战常反范式冗余字段换查询性能，按需而非教条。',
          '建表：自增 bigint 主键、字段尽量 NOT NULL 给默认值、类型够用就好、加审计字段、合理索引。',
          '逻辑删除可恢复有审计但会膨胀需归档；互联网普遍不用物理外键、改逻辑外键由应用层保证一致性。',
          '视图是虚拟表封装查询、游标逐行慢能用集合就别用；慢 SQL 靠慢查询日志+pt-query-digest 定位、EXPLAIN 后对症优化。',
          'InnoDB(事务/行锁/外键/聚簇/崩溃恢复/count实时) vs MyISAM(无事务/表锁/count O(1))；优先 InnoDB。',
          '不存大字段(撑行污染缓存，存URL)、不推荐存储过程(难维护耦合不利扩展)；MySQL 相比 Oracle 胜在开源轻量生态好。',
        ]}
      />
    </article>
  )
}
