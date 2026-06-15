import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LockTypes from '@/courses/mysql-internals/illustrations/LockTypes.jsx'

const forUpdateSql = `-- 准备：CREATE TABLE t(id INT PRIMARY KEY, val INT);
--       INSERT INTO t VALUES (10,1),(20,2),(30,3);

-- 会话 A：当前读 + 排他锁
START TRANSACTION;
SELECT * FROM t WHERE id = 20 FOR UPDATE;   -- 给 id=20 这行加 X 锁
-- 在 RR 下，因为按主键等值命中已存在的行，这里是记录锁（Record Lock）

-- 会话 B（另一个连接）：
START TRANSACTION;
SELECT * FROM t WHERE id = 20 FOR UPDATE;   -- 被阻塞，等待会话 A 释放锁
UPDATE t SET val = 99 WHERE id = 20;        -- 同样会被阻塞

-- 共享锁则用 FOR SHARE（旧写法 LOCK IN SHARE MODE）：
-- SELECT * FROM t WHERE id = 20 FOR SHARE;`

const dataLocksSql = `-- 在会话 A 持锁、会话 B 阻塞时，开第三个连接查看锁信息

-- MySQL 8.0：直接查 performance_schema
SELECT
  ENGINE_TRANSACTION_ID, OBJECT_NAME, INDEX_NAME,
  LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks;

-- 看等待关系
SELECT * FROM performance_schema.data_lock_waits;

-- 万能手段：发生死锁后看最近一次死锁详情
SHOW ENGINE INNODB STATUS;   -- 关注 LATEST DETECTED DEADLOCK 段落`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章说 InnoDB 用锁来保证隔离性，但 InnoDB 的锁比你想象的精细得多——它不只锁「行」，
          还锁「行与行之间的空隙」。理解 <em>Record Lock</em>、<em>Gap Lock</em> 和 <em>Next-Key Lock</em>，
          你才能解释为什么有的 SQL 会莫名其妙地阻塞别人，为什么不带索引的更新会让整张表卡住，以及死锁是怎么发生的。
        </p>
      </Lead>

      <h2>两种基本锁：共享锁 S 与排他锁 X</h2>
      <p>
        InnoDB 行级锁有两种模式。<strong>共享锁 S</strong>（shared，读锁）：多个事务可以同时持有同一行的 S 锁，
        一起读但都不能改。<strong>排他锁 X</strong>（exclusive，写锁）：一个事务持有某行的 X 锁时，
        别的事务既不能拿 S 也不能拿 X，必须等它释放。
      </p>
      <p>
        简单记：<code>SELECT ... FOR SHARE</code> 加 S 锁，<code>SELECT ... FOR UPDATE</code> 以及
        <code>UPDATE</code>/<code>DELETE</code> 加 X 锁。S 与 S 兼容，其余组合互斥。
      </p>

      <h2>意向锁 IS / IX：表级的「占座声明」</h2>
      <p>
        在加行锁之前，InnoDB 会先在<strong>表级别</strong>加一个意向锁：要加行级 S 锁前先加意向共享锁 <em>IS</em>，
        要加行级 X 锁前先加意向排他锁 <em>IX</em>。意向锁之间互相兼容，它的作用是<strong>加速冲突判断</strong>：
        当某事务想给整张表加表锁（比如 <code>ALTER</code>）时，只要看表上有没有 IX/IS，
        就能立刻知道「表里有没有行被锁着」，不必逐行扫描。意向锁是 InnoDB 自动加的，你不用关心，但要知道它存在。
      </p>

      <h2>InnoDB 锁的是索引，不是行</h2>
      <p>
        这是最关键、也最反直觉的一点：<strong>InnoDB 的行锁实际加在索引记录上</strong>，而不是数据行本身。
        如果你的 <code>WHERE</code> 条件命中了索引，InnoDB 就精准地锁住对应的索引项；
        但如果条件<strong>没用上任何索引</strong>，InnoDB 只能全表扫描，于是把扫到的每一条记录都锁上——
        效果近似于<strong>锁住整张表</strong>，并发瞬间归零。
      </p>

      <Callout variant="warn" title="不走索引的 UPDATE 会锁全表">
        <p>
          一条 <code>UPDATE t SET ... WHERE non_indexed_col = ?</code> 如果 <code>non_indexed_col</code> 上没有索引，
          InnoDB 会锁住扫描路径上的<strong>所有记录</strong>，相当于把表锁死，其它写操作全部排队。这是线上「一个慢更新拖垮整个库」
          的经典成因。务必保证<strong>加锁语句的 WHERE 走索引</strong>，并用 <code>EXPLAIN</code> 确认。
        </p>
      </Callout>

      <h2>三种锁的粒度：Record、Gap、Next-Key</h2>
      <p>
        在 RR 隔离级别下，InnoDB 的当前读会用到三种锁，区别在于「锁什么范围」。假设索引上已有记录 10、20、30，
        它们把数轴切成若干区间。
      </p>
      <ul>
        <li>
          <strong>记录锁（Record Lock）</strong>：只锁某一条已存在的索引记录本身。等值命中已有行时用，比如 <code>WHERE id = 20</code>。
        </li>
        <li>
          <strong>间隙锁（Gap Lock）</strong>：只锁两条记录之间的「空隙」（比如区间 (10, 20)），<strong>不锁记录本身</strong>，
          目的是阻止别人往这个空隙里 <code>INSERT</code> 新行。
        </li>
        <li>
          <strong>Next-Key Lock</strong>：记录锁 + 间隙锁的组合，锁住「一条记录及其前面的间隙」（左开右闭，如 (10, 20]）。
          这是 InnoDB 在 RR 下范围查询/当前读时的<strong>默认加锁单位</strong>。
        </li>
      </ul>

      <LockTypes />

      <KeyIdea title="Next-Key Lock 如何防住幻读">
        <p>
          幻读的本质是「别人往我查询的范围里插了新行」。Next-Key Lock 既锁住命中的记录，又锁住它们之间和边缘的间隙，
          于是别的事务<strong>没法在这个范围里插入新记录</strong>——范围被冻住了，再查一次行数自然不变。
          这就是上一章说的「InnoDB 的 RR 用 MVCC + Next-Key Lock 很大程度避免幻读」里，
          <strong>当前读</strong>（FOR UPDATE / UPDATE / DELETE）这一半的实现原理；快照读那一半靠 MVCC。
        </p>
      </KeyIdea>

      <Example title="同一个 WHERE，锁的粒度可能不同">
        <p>对索引 10、20、30 来说：</p>
        <ul>
          <li><code>WHERE id = 20</code>（命中已存在行）→ <strong>记录锁</strong>，只锁 20 这一条。</li>
          <li><code>WHERE id = 15</code>（等值但不存在）→ <strong>间隙锁</strong>，锁住 (10, 20)，防止有人插入 15。</li>
          <li><code>WHERE id BETWEEN 15 AND 25</code>（范围）→ <strong>Next-Key Lock</strong>，锁住涉及的记录和间隙，挡住区间内插入。</li>
        </ul>
      </Example>

      <h2>死锁：成因与排查</h2>
      <p>
        <strong>死锁</strong>是两个（或多个）事务互相持有对方想要的锁、谁也不让，形成环路。最典型的成因是
        <strong>两个事务以相反的顺序去锁同一批资源</strong>：事务 A 先锁行 1 再想锁行 2，事务 B 先锁行 2 再想锁行 1，于是僵住。
      </p>
      <p>
        InnoDB 内置<strong>死锁检测</strong>（<code>innodb_deadlock_detect</code>，默认开启），一旦发现环路，会主动选一个
        「回滚代价较小」的事务作为牺牲者把它回滚，让另一个继续，被回滚的事务会收到死锁错误。所以死锁通常不会让数据库永久卡死，
        但你的应用必须<strong>捕获死锁错误并重试</strong>。
      </p>
      <p>
        排查时用 <code>SHOW ENGINE INNODB STATUS</code> 看 <code>LATEST DETECTED DEADLOCK</code> 段落，
        它会告诉你两个事务各自持有和等待的锁；MySQL 8.0 还能直接查 <code>performance_schema.data_locks</code> 和
        <code>data_lock_waits</code>。预防的黄金法则只有一条：<strong>让所有事务按固定顺序加锁</strong>（比如永远按主键从小到大），
        环就形不成。
      </p>

      <h2>这对排查并发问题意味着什么</h2>
      <p>
        当你看到大量 SQL「卡住不动」却没报错，多半是在等锁——用 <code>data_lock_waits</code> 找出谁在等谁、阻塞源头是哪个事务，
        往往能定位到一个忘了提交的长事务或一条不走索引的更新。死锁则相反：它会快速失败并报错，处理思路是「业务侧重试 + 统一加锁顺序」。
        理解锁加在索引上这一点，你就能解释绝大多数 InnoDB 的诡异阻塞。
      </p>

      <Practice title="用 FOR UPDATE 观察加锁">
        <p>
          开两个连接，会话 A 用 <code>SELECT ... FOR UPDATE</code> 锁住一行后<strong>不提交</strong>，
          会话 B 去更新同一行会被阻塞；再开第三个连接查 <code>performance_schema.data_locks</code> 看锁的类型和模式。
        </p>
        <CodeBlock lang="sql" title="for_update_demo.sql" code={forUpdateSql} />
        <CodeBlock lang="sql" title="inspect_locks.sql" code={dataLocksSql} />
        <p>
          进阶实验：把会话 A 的条件换成一个<strong>不存在的 id</strong>（如 15），再看 <code>LOCK_MODE</code> 里出现的 GAP，
          亲眼看到间隙锁；然后故意让两个事务以相反顺序锁两行，复现一次死锁并在 <code>INNODB STATUS</code> 里读它的现场。
        </p>
      </Practice>

      <Summary
        points={[
          '行锁有共享锁 S（读、可共存）和排他锁 X（写、互斥）；FOR SHARE 加 S，FOR UPDATE/UPDATE/DELETE 加 X。',
          '意向锁 IS/IX 是表级标记，加行锁前自动加，用于快速判断表上是否有行被锁、加速表锁冲突检测。',
          'InnoDB 锁的是索引项而非数据行；WHERE 不走索引会退化成锁全部扫描记录，近似锁全表。',
          '三种粒度：记录锁（锁单条记录）、间隙锁（锁记录间空隙，防插入）、Next-Key Lock（记录+间隙，RR 默认单位）。',
          'RR 下 Next-Key Lock 冻结查询范围，挡住区间内插入，从而在当前读时防住幻读。',
          '死锁多因相反顺序加锁，InnoDB 自动检测并回滚牺牲者；排查用 SHOW ENGINE INNODB STATUS / data_locks，预防靠固定加锁顺序 + 业务重试。',
        ]}
      />
    </>
  )
}
