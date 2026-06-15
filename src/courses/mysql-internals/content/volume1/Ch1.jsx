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

      <h2>这对实际开发意味着什么</h2>
      <p>
        理解了“引擎是表级、可插拔”，你排查问题时就有了清晰的分层思路：SQL 解析报错、执行计划不对，去查 Server 层（优化器）；
        而行锁等待、死锁、事务回滚、宕机恢复这些，全是<strong>存储引擎层</strong>的事，要去看 InnoDB 的状态和日志。
        日常建表请<strong>显式写上 <code>ENGINE=InnoDB</code></strong>，别赌默认值；接手任何一个库，第一件事就是确认没有遗留的 MyISAM 表。
        除非你有明确的、引擎相关的理由（极少），否则答案永远是 InnoDB。
      </p>

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
