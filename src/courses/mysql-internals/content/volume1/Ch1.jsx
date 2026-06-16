import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import EngineCompare from '@/courses/mysql-internals/illustrations/EngineCompare.jsx'

const showEnginesSql = `-- 列出当前实例支持哪些存储引擎，以及哪个是默认
SHOW ENGINES;

-- 只想确认默认引擎，可以直接查变量
SHOW VARIABLES LIKE 'default_storage_engine';`

const tableEngineSql = `-- 建表时显式指定引擎（强烈建议显式写出，别依赖默认值）
CREATE TABLE orders (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  user_id     BIGINT      NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  created_at  DATETIME    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 查看某张表当前用的是什么引擎、行数估算、数据/索引大小
SHOW TABLE STATUS LIKE 'orders'\\G

-- 或者从 information_schema 里批量查（找出库里还有哪些非 InnoDB 的表）
SELECT table_name, engine
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND engine <> 'InnoDB';

-- 把一张老的 MyISAM 表转成 InnoDB
ALTER TABLE legacy_logs ENGINE=InnoDB;`

const traceSql = `-- 一条 SQL 在 Server 层都经历了什么？打开 optimizer_trace 看优化器的决策
SET optimizer_trace = 'enabled=on';

SELECT * FROM orders WHERE user_id = 10086 AND status = 1;

-- 看优化器对每个候选索引的代价估算、为什么选了这个索引、扫描行数预估
SELECT * FROM information_schema.optimizer_trace\\G

SET optimizer_trace = 'enabled=off';

-- 查看连接层的现状：当前连接数、最大连接数、被拒绝过几次
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Connection_errors_max_connections';`

const scanEnginesSql = `-- 体检脚本：一次性列出全库非 InnoDB 的表，以及它们的大小，便于评估迁移工作量
SELECT
  table_schema,
  table_name,
  engine,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
  table_rows
FROM information_schema.tables
WHERE engine IS NOT NULL
  AND engine NOT IN ('InnoDB')
  AND table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
ORDER BY size_mb DESC;`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你每天写的 <code>SELECT</code>、<code>INSERT</code> 最终落到磁盘上的某个文件、加上某种锁、在崩溃后能不能恢复——
          这些都不是「MySQL」笼统决定的，而是由一个可替换的模块决定的，它叫<em>存储引擎</em>。
          MySQL 把“怎么解析 SQL”和“怎么真正存数据”拆成了两层，而 InnoDB 就是后者从 5.5 版本起的默认实现。
          搞懂这条分界线，是理解后面所有 InnoDB 机制的前提。
        </p>
      </Lead>

      <h2>MySQL 的分层架构</h2>
      <p>
        一条 SQL 从客户端进来，到数据真正被读写，要穿过三层。把这三层分清楚，你就知道一个问题该到哪一层去排查。
      </p>
      <ul>
        <li>
          <strong>连接层</strong>：负责 TCP 连接、认证鉴权、维护连接池与线程。你看到的 <code>max_connections</code>、
          连接超时、SSL 都在这一层。它不碰一行数据，只决定“谁能进来、用哪个线程服务”。
        </li>
        <li>
          <strong>Server 层</strong>：MySQL 的“大脑”，跨引擎共享。它包含<em>解析器</em>（parser，把 SQL 文本变成语法树）、
          <em>优化器</em>（optimizer，决定用哪个索引、用什么连接顺序、生成执行计划）、
          <em>执行器</em>（executor，按计划一行行调用下层接口取数据）。此外视图、触发器、存储过程、binlog 也在这一层。
        </li>
        <li>
          <strong>存储引擎层</strong>：真正负责“怎么存、怎么读、怎么加锁”的地方，<strong>可插拔</strong>。
          Server 层通过一组统一的<em>handler</em> 接口调用它，至于底层是 InnoDB 还是 MyISAM，Server 层并不关心。
        </li>
      </ul>
      <p>
        关键点在于：<strong>存储引擎是表级别的</strong>。同一个库里，A 表可以是 InnoDB，B 表可以是 MyISAM，
        甚至可以是不落盘的 MEMORY 引擎。引擎决定的是“数据结构、并发控制、事务、崩溃恢复”这套底层能力，
        而 SQL 语法、优化器这些是公共的。
      </p>

      <h3>一条 SELECT 的完整旅程</h3>
      <p>
        把这三层串成一条时间线，你会更清楚每个组件的职责边界：
      </p>
      <ul>
        <li><strong>① 连接 / 鉴权</strong>：客户端建立 TCP 连接，三次握手后做账号密码与权限校验，分配一个工作线程。MySQL 8.0 前还有一层<em>查询缓存</em>（query cache），命中就直接返回结果——但它在高并发下争用严重，8.0 已彻底移除，别再依赖它。</li>
        <li><strong>② 解析（parser）</strong>：词法分析 + 语法分析，把 SQL 文本变成一棵语法树，顺便做关键字、列名是否存在等语义检查。SQL 写错（少写逗号、列名拼错）就在这一步报错。</li>
        <li><strong>③ 优化（optimizer）</strong>：这是 Server 层最“聪明”的部分。它基于<em>代价模型</em>（cost model）和表的统计信息，决定走哪个索引、多表 JOIN 的连接顺序、是否用临时表/文件排序。同一条 SQL，统计信息变了，优化器选的执行计划就可能变——这是很多“昨天还好好的，今天突然变慢”的根源。</li>
        <li><strong>④ 执行（executor）</strong>：拿着优化器给的执行计划，逐行调用存储引擎的 handler 接口（如「读下一行」「按索引定位」），把数据取上来、做聚合/排序、最终返回客户端，同时写 binlog。</li>
      </ul>
      <p>
        想看优化器到底是怎么想的，可以打开 <code>optimizer_trace</code>，它会把代价估算、候选索引、最终决策全部吐出来——
        这是排查“为什么没走我建的索引”最硬核的工具。
      </p>
      <CodeBlock lang="sql" title="optimizer_trace.sql" code={traceSql} />

      <h3>存储引擎到底负责什么</h3>
      <p>
        用一句话概括：存储引擎是“<strong>怎么存、怎么读、怎么加锁</strong>”的实现。具体落到三件事上：
      </p>
      <ul>
        <li><strong>数据组织</strong>：行和索引在磁盘/内存里用什么数据结构摆放。InnoDB 用 B+ 树聚簇索引，MyISAM 索引和数据分开存。</li>
        <li><strong>并发控制</strong>：多个会话同时读写时怎么加锁、是否支持 <em>MVCC</em>（多版本并发控制）来做到读不阻塞写。</li>
        <li><strong>事务与恢复</strong>：是否支持事务（<code>BEGIN/COMMIT/ROLLBACK</code>）、宕机后能不能把数据恢复到一致状态。</li>
      </ul>

      <h2>InnoDB vs MyISAM</h2>
      <p>
        MyISAM 是 MySQL 早年的默认引擎，结构简单、读取快，但它缺的恰恰是现代业务最需要的东西。下面是两者最核心的差异：
      </p>
      <ul>
        <li><strong>事务</strong>：InnoDB 支持完整的 ACID 事务；MyISAM <strong>完全不支持事务</strong>，一条 SQL 失败没法回滚。</li>
        <li>
          <strong>锁粒度</strong>：InnoDB 支持<em>行锁</em>（row lock），并发写互不干扰；MyISAM 只有<em>表锁</em>（table lock），
          一个写操作会锁住整张表，写并发几乎为零。这是高并发场景下两者性能天差地别的根本原因。
        </li>
        <li><strong>外键</strong>：InnoDB 支持外键约束；MyISAM 不支持，写了也会被忽略。</li>
        <li><strong>MVCC</strong>：InnoDB 通过 MVCC 让“读不加锁、不阻塞写”成为常态；MyISAM 没有，读写互斥。</li>
        <li>
          <strong>崩溃恢复</strong>：InnoDB 靠 <em>redo log</em> 实现 <em>WAL</em>，宕机后能自动恢复到一致状态；
          MyISAM 没有日志，崩溃后表可能损坏，得靠 <code>myisamchk</code> 手动修复，且不保证不丢数据。
        </li>
        <li>
          <strong>count(*)</strong>：MyISAM 把行数存在表元信息里，<code>SELECT COUNT(*)</code> 不带条件时直接返回，O(1) 极快；
          InnoDB 因为有 MVCC，不同事务看到的行数可能不同，无法缓存一个确定值，得实时扫描（通常走最小的二级索引），相对慢。
          这是很多人“感觉 MyISAM 快”的来源，但它快在一个很窄的场景上。
        </li>
      </ul>

      <h3>handler 接口：Server 层和引擎的「插座」</h3>
      <p>
        Server 层和存储引擎之间隔着一组抽象接口（C++ 里就是 <code>handler</code> 基类），定义了一堆方法：
        <code>{'rnd_init() / rnd_next()'}</code>（全表顺序扫）、<code>{'index_read() / index_next()'}</code>（按索引读）、
        <code>{'write_row() / update_row() / delete_row()'}</code>（增删改）等。InnoDB、MyISAM 各自实现这套接口。
        正因为有这层抽象，优化器在估算代价时调用的是统一接口，至于底层是 B+ 树还是别的结构，它通过接口返回的“扫描行数估算”“是否支持事务”等能力位来感知。
        理解这层接口，你就明白为什么<strong>引擎能插拔，而 SQL 语法和优化逻辑可以复用</strong>。
      </p>

      <Example title="同样一条 UPDATE，两种引擎下的并发表现">
        <p>
          假设两个会话同时更新 <code>orders</code> 表里<strong>不同的两行</strong>：
        </p>
        <ul>
          <li>
            <strong>InnoDB</strong>：会话 A 锁住 id=1 这一行，会话 B 锁住 id=2 这一行，两者互不影响，<strong>同时完成</strong>。
          </li>
          <li>
            <strong>MyISAM</strong>：会话 A 一旦开始写，就锁住整张表，会话 B 必须排队等 A 写完才能动——哪怕它们改的根本不是同一行。
          </li>
        </ul>
        <p>
          在一个每秒几百上千次写入的订单系统里，这个差别直接决定了系统是顺畅运行还是大面积超时。
        </p>
      </Example>

      <EngineCompare />

      <KeyIdea title="为什么 5.5 起 InnoDB 成了默认">
        <p>
          MySQL 5.5（2010 年）正式把默认引擎从 MyISAM 换成 InnoDB，原因可以归结为一句话：
          <strong>现代业务默认就需要事务、行锁和崩溃安全</strong>。Web 应用普遍高并发、要求数据不丢不乱，
          MyISAM 的表锁和“崩溃即损坏”在这种场景下是硬伤。InnoDB 用聚簇索引 + B+ 树 + MVCC + redo/undo log
          这一整套机制，既扛得住并发，又保证了 ACID。从此“不指定引擎就是 InnoDB”成为业界默认。
        </p>
      </KeyIdea>

      <h3>其它引擎：知道它们存在就够了</h3>
      <p>
        除了 InnoDB 和 MyISAM，MySQL 还内置了几个特殊引擎，日常很少用，但面试和排查时偶尔会遇到：
      </p>
      <ul>
        <li><strong>MEMORY（HEAP）</strong>：数据全放内存，重启即丢，只支持表锁、用哈希索引。曾用来做临时缓存表，但内存里的临时表用途已基本被应用层缓存（Redis）取代。</li>
        <li><strong>CSV</strong>：数据以纯文本 CSV 文件存储，可直接用 Excel 打开，适合做数据交换，但不支持索引，性能差。</li>
        <li><strong>ARCHIVE</strong>：高压缩比、只支持 INSERT 和 SELECT，适合归档冷数据（如日志），不能更新删除。</li>
        <li><strong>BLACKHOLE</strong>：写进去的数据直接丢弃（像 /dev/null），但会照常写 binlog，过去用在主从复制的中继转发节点上。</li>
      </ul>
      <p>
        注意：MySQL 内部执行 JOIN、GROUP BY 时会自动创建<em>内部临时表</em>，小的用 MEMORY 引擎、超过 <code>tmp_table_size</code> 就落盘转成 InnoDB（8.0 起）或 MyISAM（旧版本）。这是“某个聚合查询突然变慢”的常见隐藏原因。
      </p>

      <Callout variant="warn" title="老库里最常见的两个坑">
        <ul>
          <li>
            <strong>历史表还是 MyISAM 却没人发现</strong>：很多老库从 5.5 之前迁过来，建表时没写 <code>ENGINE=</code>，
            结果某些表至今还是 MyISAM。某天一个慢更新把整张表锁住，全站接口超时，排查半天才发现是表锁——
            一定要定期用 <code>information_schema</code> 扫一遍非 InnoDB 的表。
          </li>
          <li>
            <strong>误以为 MyISAM 的 count 快就拿来做统计表</strong>：它确实快，但不支持事务、一锁锁全表、崩溃还会坏，
            为了一个 <code>COUNT(*)</code> 牺牲掉这些得不偿失。要快速计数，正确做法是单独维护计数器或用近似行数。
          </li>
        </ul>
      </Callout>

      <Callout variant="note" title="高频面试追问">
        <ul>
          <li><strong>“为什么 InnoDB 的 count(*) 慢，怎么优化？”</strong>——慢是因为 MVCC 下行数不固定，必须实时统计。优化思路：优化器会自动选最小的二级索引来扫（扫得行少），所以保证有一个窄索引比对主键 count 快；要更快就单独维护计数表或用近似值 <code>SHOW TABLE STATUS</code> 里的 Rows（注意它是估算）。</li>
          <li><strong>“同一个 JOIN 在两台机器上一个走索引一个全表扫，为什么？”</strong>——大概率是统计信息不同。统计信息是采样估算的，可用 <code>ANALYZE TABLE</code> 重新采样校准。</li>
          <li><strong>“查询缓存为什么被移除？”</strong>——任何对表的写操作都会让该表所有缓存失效，写多读多的场景命中率低还要维护缓存，得不偿失，8.0 直接删掉。</li>
        </ul>
      </Callout>

      <h2>这对实际开发意味着什么</h2>
      <p>
        理解了“引擎是表级、可插拔”，你排查问题时就有了清晰的分层思路：SQL 解析报错、执行计划不对，去查 Server 层（优化器）；
        而行锁等待、死锁、事务回滚、宕机恢复这些，全是<strong>存储引擎层</strong>的事，要去看 InnoDB 的状态和日志。
        日常建表请<strong>显式写上 <code>ENGINE=InnoDB</code></strong>，别赌默认值；接手任何一个库，第一件事就是确认没有遗留的 MyISAM 表。
        除非你有明确的、引擎相关的理由（极少），否则答案永远是 InnoDB。
      </p>
      <p>
        迁移 MyISAM 到 InnoDB 不是无脑 <code>ALTER</code> 就完事：要先评估表大小（大表 ALTER 会长时间持锁或占大量临时空间）、确认没有依赖 MyISAM 全文索引的老代码（InnoDB 5.6+ 才支持全文索引）、留意自增列在两种引擎下的计数行为差异。下面这个体检脚本能帮你一眼看清全库还有哪些非 InnoDB 的表、各占多大，按大小排序好排迁移计划。
      </p>
      <CodeBlock lang="sql" title="scan_non_innodb.sql" code={scanEnginesSql} />

      <Practice title="盘一遍你手上库的引擎现状">
        <p>
          先看实例支持哪些引擎、默认是谁；再挑一张表确认它的实际引擎和大小；最后扫一遍整库，揪出还在用 MyISAM 的表。
        </p>
        <CodeBlock lang="sql" title="show_engines.sql" code={showEnginesSql} />
        <CodeBlock lang="sql" title="table_engine.sql" code={tableEngineSql} />
        <p>
          重点看 <code>SHOW ENGINES</code> 输出里 InnoDB 那行的 <code>Support</code> 是否为 <code>DEFAULT</code>，
          以及 <code>SHOW TABLE STATUS</code> 里的 <code>Engine</code>、<code>Rows</code>、<code>Data_length</code> 三列，
          它们分别告诉你引擎、行数估算和数据文件大小。
        </p>
      </Practice>

      <Summary
        points={[
          'MySQL 分三层：连接层（连接/认证）、Server 层（解析器/优化器/执行器，跨引擎共享）、存储引擎层（可插拔，负责真正的存读锁）。',
          '存储引擎是表级别的，决定“怎么存、怎么读、怎么加锁”，同一个库里不同表可以用不同引擎。',
          'InnoDB 支持事务、行锁、外键、MVCC 和基于 redo log 的崩溃恢复；MyISAM 都不支持，只有表锁，崩溃易损坏。',
          'MyISAM 唯一的优势是不带条件的 COUNT(*) 是 O(1)，但这换不来事务和并发安全，得不偿失。',
          'MySQL 5.5 起默认引擎改为 InnoDB，因为现代业务默认需要事务、行锁和崩溃安全。',
          '实践上：建表显式写 ENGINE=InnoDB，定期扫描揪出遗留 MyISAM 表，按“锁/事务问题看引擎层、SQL/计划问题看 Server 层”分层排查。',
        ]}
      />
    </>
  )
}
