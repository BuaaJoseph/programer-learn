import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ACID from '@/courses/mysql-internals/illustrations/ACID.jsx'

const transferSql = `-- 转账：A(id=1) 给 B(id=2) 转 100 元
-- 整个过程要么全成功，要么全回滚，不允许只扣不加

START TRANSACTION;   -- 等价于 BEGIN，显式开启一个事务

UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;

-- 到这里两条语句的修改都还只在当前事务里可见
-- 确认无误后提交，修改才真正持久化、对其他会话可见
COMMIT;

-- 如果中途发现余额不足或程序报错，则整体撤销：
-- ROLLBACK;`

const savepointSql = `START TRANSACTION;

UPDATE account SET balance = balance - 100 WHERE id = 1;
SAVEPOINT after_debit;          -- 打一个保存点

UPDATE account SET balance = balance + 100 WHERE id = 2;

ROLLBACK TO SAVEPOINT after_debit;  -- 只回滚到保存点，扣款仍保留
COMMIT;`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你写过无数条 <code>UPDATE</code>，但有没有想过：当一条转账要「先扣 A、再加 B」时，万一扣完 A 之后程序崩了怎么办？
          钱凭空消失了。事务（<em>transaction</em>）就是为了解决这个问题——它把一组操作打包成一个不可分割的整体，
          要么全部成功，要么全部当作没发生过。这一章我们把事务和它背后的 <em>ACID</em> 四性彻底讲透。
        </p>
      </Lead>

      <h2>事务是什么</h2>
      <p>
        事务是一组要么<strong>全部成功</strong>、要么<strong>全部回滚</strong>的数据库操作。在 MySQL 里，
        一个事务由三个关键命令界定：<code>BEGIN</code>（或 <code>START TRANSACTION</code>）开启，
        <code>COMMIT</code> 提交（让修改永久生效），<code>ROLLBACK</code> 回滚（撤销本事务内的全部修改）。
      </p>
      <p>
        关键在于：在 <code>COMMIT</code> 之前，事务内的修改对其他会话是不可见的，而且随时可以被一笔勾销。
        这就给了我们一个「安全的暂存区」——可以先做一批互相依赖的改动，确认整体没问题了再一次性落地。
      </p>

      <Example title="一次转账的两种结局">
        <p>“A 给 B 转 100 元”由两步组成：A 减 100、B 加 100。事务保证这两步的命运绑在一起。</p>
        <ul>
          <li><strong>成功路径</strong>：两条 UPDATE 都执行 → <code>COMMIT</code> → A 少了 100、B 多了 100，账平。</li>
          <li><strong>失败路径</strong>：第二步出错（比如 B 账户被冻结）→ <code>ROLLBACK</code> → A 的扣款也被撤销，钱没丢。</li>
        </ul>
        <p>绝不会出现“A 扣了但 B 没加”这种中间状态对外可见的情况。</p>
      </Example>

      <ACID />

      <h2>ACID 四性逐条拆解</h2>
      <p>
        ACID 是事务的四个保证：原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持久性（Durability）。
        很多人能背出来，但说不清每一条具体靠什么实现。下面把它和 InnoDB 的内部机制对应起来。
      </p>

      <h3>原子性（A）：靠 undo log</h3>
      <p>
        原子性是说事务内的操作不可分割。InnoDB 在你每次修改数据前，会先把「修改前的旧值」记进 <em>undo log</em>。
        一旦 <code>ROLLBACK</code> 或事务异常中断，InnoDB 就拿着 undo log 把数据按反向操作逐条还原回去——
        这就是「撤销」能成立的物理基础。undo log 我们在第 4 章会展开。
      </p>

      <h3>持久性（D）：靠 redo log</h3>
      <p>
        持久性是说一旦 <code>COMMIT</code> 成功，哪怕下一秒断电，数据也不会丢。InnoDB 并不会在提交时立刻把数据页刷到磁盘
        （那太慢），而是先把「这次改了什么」顺序写进 <em>redo log</em>。重启后即使数据页还没落盘，
        也能靠 redo log 把已提交的修改重做一遍。这套「先写日志」的思路就是 WAL，同样留到第 4 章细讲。
      </p>

      <h3>隔离性（I）：靠锁 + MVCC</h3>
      <p>
        隔离性是说多个事务并发执行时，彼此不能互相干扰得到错误结果。InnoDB 用两套机制配合实现：
        <strong>锁</strong>（写写冲突、需要强一致读时用，见第 3 章）和 <em>MVCC</em>（多版本并发控制，让普通读不加锁也能读到一致的快照）。
        隔离性是四性里最复杂、也最容易踩坑的，第 2 章整章都在讲它。
      </p>

      <h3>一致性（C）：前三者 + 约束共同保证的目标</h3>
      <p>
        一致性不是一个独立机制，而是一个<strong>目标</strong>：事务执行前后，数据始终满足业务与数据库的所有规则
        （主键唯一、外键有效、余额非负、转账前后总额不变等）。它是由原子性、隔离性、持久性，再加上数据库的约束
        （constraint）和你自己写的业务逻辑<strong>共同</strong>达成的。换句话说，A、I、D 是手段，C 是结果。
      </p>

      <KeyIdea title="四性的分工">
        <p>
          记住这条对应关系，ACID 就不再是死记硬背：<strong>原子性由 undo log 实现，持久性由 redo log 实现，
          隔离性由锁和 MVCC 实现，而一致性是前三者加约束共同守护的最终目标</strong>。后面三章正好分别展开隔离性（锁与 MVCC）和日志（redo 与 undo）。
        </p>
      </KeyIdea>

      <h2>自动提交：你可能一直在用却没注意</h2>
      <p>
        MySQL 默认开启 <em>autocommit</em>：每一条单独的 SQL 都被自动包成一个事务并立即提交。这就是为什么你平时
        随手敲一条 <code>UPDATE</code> 不用 <code>COMMIT</code> 也能生效——它已经被自动提交了。
      </p>
      <p>
        当你显式执行 <code>BEGIN</code> / <code>START TRANSACTION</code> 时，autocommit 会临时让位，
        直到你 <code>COMMIT</code> 或 <code>ROLLBACK</code> 才结束。你也可以用 <code>SET autocommit = 0</code> 整体关掉它，
        之后每条语句都需要手动提交。
      </p>

      <Callout variant="warn" title="忘记提交 / 长事务的代价">
        <p>
          关掉 autocommit 又忘了 <code>COMMIT</code>，是线上最隐蔽的坑之一：你的修改对别人不可见，而且这个事务持有的锁和
          undo 版本会一直挂着。长时间不提交的<strong>长事务</strong>会撑大 undo log、阻塞其他事务、拖慢 MVCC 的版本清理（purge），
          严重时表面现象就是「明明没几条 SQL，数据库却越来越慢」。养成「开事务必有明确终点」的习惯。
        </p>
      </Callout>

      <h2>顺带一提：保存点 SAVEPOINT</h2>
      <p>
        在一个事务内部，你还可以用 <code>SAVEPOINT name</code> 打标记，之后 <code>ROLLBACK TO SAVEPOINT name</code>
        可以只回滚到该标记处，而不撤销整个事务。它适合长流程里「局部重试」，日常用得不多，知道有这个能力即可。
      </p>
      <CodeBlock lang="sql" title="savepoint.sql" code={savepointSql} />

      <h2>这对实际开发意味着什么</h2>
      <p>
        凡是「多步修改必须同生共死」的场景——下单扣库存、转账、积分变动配合订单状态——都必须放进同一个事务，
        而不是寄希望于「应用层一步步执行不出错」。同时要警惕事务边界：把不相干的远程调用、慢查询、用户交互塞进事务里，
        会无谓地拉长事务、放大锁竞争。原则是<strong>事务要小、要快、要有明确的提交或回滚出口</strong>。
      </p>

      <Practice title="亲手跑一遍转账事务">
        <p>
          建一张 <code>account</code> 表，初始化两条余额，然后分别走「提交」和「回滚」两条路径，对比最终余额，
          体会 <code>COMMIT</code> 与 <code>ROLLBACK</code> 的差别。
        </p>
        <CodeBlock lang="sql" title="transfer.sql" code={transferSql} />
        <p>
          再试一个反例：执行第一条 <code>UPDATE</code> 后<strong>先别提交</strong>，开另一个客户端连接去查这条记录，
          你会发现别的会话看到的还是旧余额——这正是隔离性在起作用，也是下一章的主题。
        </p>
      </Practice>

      <Summary
        points={[
          '事务是一组要么全部成功、要么全部回滚的操作，由 BEGIN/START TRANSACTION、COMMIT、ROLLBACK 界定。',
          '原子性靠 undo log（记录反向操作以撤销），持久性靠 redo log（先写日志保证已提交数据崩溃不丢）。',
          '隔离性靠锁 + MVCC 实现；一致性不是独立机制，而是前三者加上约束共同守护的最终目标。',
          'MySQL 默认开启 autocommit，单条 SQL 自动成事务并提交；显式 BEGIN 后须手动 COMMIT/ROLLBACK。',
          '长事务和忘记提交会撑大 undo、长期持锁、拖慢系统，事务要小而快、出口明确。',
          'SAVEPOINT 可在事务内部分回滚到某个标记处，适合长流程局部重试。',
        ]}
      />
    </>
  )
}
