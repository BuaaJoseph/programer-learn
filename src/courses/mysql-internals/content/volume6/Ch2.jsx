import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const optimisticSql = `-- 乐观锁：靠版本号 / CAS，不真的加数据库锁
UPDATE account
   SET balance = balance - 100, version = version + 1
 WHERE id = 1 AND version = 5;   -- 受影响行=0 说明被别人改过，重试

-- 悲观锁：先用 SELECT ... FOR UPDATE 把行锁住
BEGIN;
SELECT balance FROM account WHERE id = 1 FOR UPDATE;  -- 加排他行锁
UPDATE account SET balance = balance - 100 WHERE id = 1;
COMMIT;`

const deadlockSql = `-- 查看最近一次死锁详情
SHOW ENGINE INNODB STATUS;
-- 死锁检测开关（默认 ON，会自动回滚代价小的事务）
SELECT @@innodb_deadlock_detect;
-- 锁等待超时（等不到锁多久报错回滚）
SELECT @@innodb_lock_wait_timeout;`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章讲并发控制的两大支柱：MVCC 和锁。MVCC 让"读不加锁、写不阻塞读"，是 InnoDB 高并发的核心；
        锁则解决"写写冲突"。我们会讲清 MVCC 的版本链与 ReadView、二级索引有没有快照、没有 MVCC 会怎样、
        锁有哪些类型、乐观锁悲观锁怎么选、死锁怎么排查化解。
      </Lead>

      <h2>一、MVCC 是什么、怎么工作</h2>
      <h3>题目：讲讲 MVCC 的原理</h3>
      <p>
        MVCC（多版本并发控制）让读操作读一个<strong>历史快照</strong>而不是去抢锁，从而实现
        "读不加锁、读写不互相阻塞"。它靠三样东西：
      </p>
      <ul>
        <li><strong>隐藏字段</strong>：每行有 <code>trx_id</code>（最后修改它的事务 ID）和
          <code>roll_pointer</code>（指向上一个版本的 undo 记录）。</li>
        <li><strong>undo 版本链</strong>：每次修改都把旧值存进 undo，用 roll_pointer 串成一条
          "从新到旧"的版本链。</li>
        <li><strong>ReadView</strong>：一致性读时生成的"快照视图"，记录当时哪些事务还活跃。
          沿版本链找到第一个"对本 ReadView 可见"的版本返回。</li>
      </ul>
      <KeyIdea>
        可见性判断的直觉：一个版本的 trx_id 如果是"已提交且在我开始之前提交的"，就可见；
        如果是"还没提交"或"在我之后才开始的"，就不可见，要沿 roll_pointer 往更旧的版本找。
        RR 在事务第一次快照读时生成 ReadView 并复用，所以整个事务看到同一份快照；
        RC 每次快照读都重新生成，所以能看到别人新提交的数据。
      </KeyIdea>

      <h2>二、二级索引有没有 MVCC 快照</h2>
      <h3>题目：二级索引也走 MVCC 吗？</h3>
      <p>
        <strong>版本链和 ReadView 信息只在聚簇索引（主键）记录上</strong>——隐藏字段
        trx_id、roll_pointer 都在聚簇索引的行里，二级索引的叶子节点<strong>不存这些</strong>。
        所以走二级索引做一致性读时，InnoDB 会先看二级索引页上的一个事务标记快速判断；
        如果不能确定该记录对当前 ReadView 是否可见，就<strong>回到聚簇索引</strong>，
        沿那里的版本链做完整的 MVCC 可见性判断。
      </p>
      <Callout variant="note" title="一句话回答">
        MVCC 的多版本数据本质上挂在聚簇索引上；二级索引本身没有版本链，
        需要 MVCC 判断时要回聚簇索引走版本链。这也是覆盖索引在某些一致性读下仍可能要回表的原因之一。
      </Callout>

      <h2>三、没有 MVCC 会怎样</h2>
      <h3>题目：如果没有 MVCC，数据库会变成什么样？</h3>
      <p>
        没有 MVCC，要保证一致性读就只能<strong>靠加锁</strong>：读的时候也要加共享锁，
        防止别人修改。后果是<strong>读写互相阻塞</strong>——一个事务在读，写就得等；一个在写，读就得等。
        在读多写多的高并发系统里，这会造成大量锁等待，吞吐急剧下降。
      </p>
      <p>
        MVCC 的价值正在于：让普通 SELECT（快照读）读一份历史快照，<strong>完全不加锁</strong>，
        和写操作并行不悖。这就是为什么 InnoDB 能扛住高并发，而纯靠锁的方案不行。
      </p>

      <h2>四、锁的类型</h2>
      <h3>题目：InnoDB 有哪些锁？</h3>
      <table>
        <thead>
          <tr><th>分类维度</th><th>锁</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>粒度</td><td>表锁 / 行锁</td><td>InnoDB 支持行锁（锁的是索引），并发好；MyISAM 只有表锁。</td></tr>
          <tr><td>读写</td><td>共享锁 S / 排他锁 X</td><td>S 锁可共存、X 锁互斥。<code>FOR SHARE</code> 加 S、<code>FOR UPDATE</code> 加 X。</td></tr>
          <tr><td>意向</td><td>意向锁 IS / IX</td><td>表级"声明"，表示表内有行将加 S/X 锁，加速表锁冲突判断。</td></tr>
          <tr><td>行锁形态</td><td>记录锁 / 间隙锁 / Next-Key</td><td>记录锁锁单行；间隙锁锁区间防插入；Next-Key=记录锁+间隙锁，RR 下防幻读。</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="行锁锁的是索引">
        InnoDB 的行锁加在<strong>索引</strong>上，不是物理行。所以如果一条 UPDATE 的 WHERE
        没走到任何索引，会退化成<strong>给所有扫描到的记录加锁</strong>（近似锁全表），并发直接崩。
        这也是"更新时务必走索引"的重要原因。
      </Callout>

      <h2>五、乐观锁 vs 悲观锁</h2>
      <h3>题目：乐观锁和悲观锁怎么选？</h3>
      <table>
        <thead>
          <tr><th>对比</th><th>乐观锁</th><th>悲观锁</th></tr>
        </thead>
        <tbody>
          <tr><td>思想</td><td>假设冲突少，先改再校验（版本号/CAS）</td><td>假设冲突多，先锁住再操作</td></tr>
          <tr><td>实现</td><td>应用层加 version 列，UPDATE 带 version 条件</td><td>数据库 <code>SELECT ... FOR UPDATE</code></td></tr>
          <tr><td>适合</td><td>读多写少、冲突低</td><td>写多、冲突高、必须串行</td></tr>
          <tr><td>代价</td><td>冲突时要重试，可能多次失败</td><td>锁占用、降低并发、可能死锁</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="sql" title="乐观锁与悲观锁" code={optimisticSql} />
      <p>
        注意：乐观锁不是数据库的"锁"，它是一种<strong>无锁并发控制思路</strong>，靠版本号比对实现，
        冲突时受影响行数为 0，应用层据此重试。悲观锁才是真的用数据库行锁。
      </p>

      <h2>六、死锁怎么解决</h2>
      <h3>题目：发生死锁怎么排查和预防？</h3>
      <p>
        死锁是两个事务互相持有对方想要的锁、循环等待。InnoDB 默认开启<strong>死锁检测</strong>
        （<code>innodb_deadlock_detect=ON</code>），一旦检测到环，会<strong>自动回滚代价较小的那个事务</strong>
        让另一个继续，被回滚方收到死锁错误后重试即可。此外还有<strong>锁等待超时</strong>
        （<code>innodb_lock_wait_timeout</code>）兜底——等不到锁超时就报错回滚。
      </p>
      <CodeBlock lang="sql" title="死锁排查相关命令" code={deadlockSql} />
      <p><strong>预防死锁的实践</strong>：</p>
      <ul>
        <li><strong>固定加锁顺序</strong>：所有事务都按同一顺序（如按主键升序）访问资源，破坏循环等待条件。</li>
        <li><strong>事务尽量短小</strong>：少持锁、快释放。</li>
        <li><strong>一次锁定需要的全部行</strong>，避免分步加锁。</li>
        <li><strong>降低隔离级别</strong>：RC 不加间隙锁，死锁概率比 RR 低。</li>
        <li><strong>给查询条件加合适索引</strong>，避免行锁退化成大范围锁。</li>
      </ul>
      <Example title="一个典型死锁">
        <p>
          事务 A 先改 id=1 再改 id=2，事务 B 先改 id=2 再改 id=1，两者并发就可能互相等对方的行锁。
          只要统一规定"都按 id 从小到大改"，A 和 B 就不会交叉持锁，死锁自然消失——
          这就是"固定加锁顺序"的威力。
        </p>
      </Example>

      <h2>七、再追几个并发深水问题</h2>
      <h3>题目：快照读和当前读分别加不加锁</h3>
      <p>
        <strong>快照读</strong>是普通 <code>SELECT</code>，走 MVCC 读历史版本，<strong>不加锁</strong>；
        <strong>当前读</strong>是 <code>SELECT ... FOR UPDATE / FOR SHARE</code> 以及
        <code>UPDATE/DELETE</code>，读的是<strong>最新版本并加锁</strong>。
        RR 下幻读的玄机就在这：快照读靠 MVCC 不受别人新插入影响，但当前读会读到新插入的行，
        于是 InnoDB 用<strong>间隙锁/Next-Key</strong>锁住区间，阻止别人在范围内插入，从而连当前读也防住幻读。
      </p>
      <h3>题目：间隙锁为什么有时让人困惑</h3>
      <p>
        间隙锁锁的是"两条记录之间的空隙"，目的是不让别人往里插。它的困惑点在于：
        间隙锁之间<strong>不互斥</strong>（多个事务可以同时持有同一间隙的间隙锁），
        但它会阻塞别人的<strong>插入</strong>。这导致一些看似无冲突的并发插入互相等待，
        是 RR 下死锁增多的常见来源——也是不少公司选 RC（无间隙锁）的现实原因。
      </p>
      <h3>题目：UPDATE 没命中索引为什么危险</h3>
      <p>
        因为行锁加在索引上。如果 WHERE 没走索引，InnoDB 会扫描全部记录并给扫到的<strong>每一行加锁</strong>，
        近似锁全表，并发瞬间归零，还极易死锁。所以"更新/删除务必带能走索引的条件"不是性能建议，
        而是并发安全的硬要求。
      </p>
      <h3>题目：RC 和 RR 在 MVCC 上的区别到底在哪</h3>
      <p>
        关键在 <strong>ReadView 的生成时机</strong>。RC 是<strong>每条快照读都重新生成</strong> ReadView，
        所以每次 SELECT 都能看到别人最新提交的数据——会出现不可重复读。RR 是
        <strong>事务内第一次快照读生成后就复用</strong>同一个 ReadView，所以整个事务看到的是一致的快照——
        因此可重复读。同一套 MVCC 机制，靠 ReadView 时机不同，就实现了两种隔离级别。
      </p>
      <h3>题目：行锁会升级成表锁吗</h3>
      <p>
        InnoDB <strong>不会</strong>像某些数据库那样自动把大量行锁"升级"成表锁。但前面说过，
        如果 WHERE 走不到索引，它会给扫到的每一行加锁，效果上近似锁全表——这不是锁升级，
        而是锁的记录太多。区别要讲清：InnoDB 没有锁升级机制，所谓"锁全表"是索引没用上导致加锁范围过大。
      </p>
      <Callout variant="tip" title="并发这章的主线">
        MVCC 解决"读写不打架"（快照读不加锁），锁解决"写写冲突"；乐观锁靠版本号无锁重试、
        悲观锁靠真锁串行；死锁靠固定加锁顺序 + 短事务 + 索引 + 自动检测兜底。
      </Callout>

      <Summary
        points={[
          'MVCC 靠隐藏字段(trx_id/roll_pointer)+undo 版本链+ReadView 实现读不加锁；RR 复用首次快照、RC 每次重建快照。',
          '版本链与 ReadView 信息在聚簇索引上，二级索引无版本链，需 MVCC 判断时回聚簇索引走版本链。',
          '没有 MVCC 就只能靠加锁实现一致性读，导致读写互相阻塞、高并发吞吐骤降。',
          '锁类型：表/行锁、共享S/排他X、意向IS/IX、记录锁/间隙锁/Next-Key；行锁加在索引上，无索引会退化锁全表。',
          '乐观锁是版本号/CAS 的无锁思路、适合冲突少；悲观锁是 FOR UPDATE 真加锁、适合冲突多。',
          '死锁靠 InnoDB 自动检测回滚小事务+锁等待超时兜底；预防靠固定加锁顺序、短事务、合适索引、降级到 RC。',
        ]}
      />
    </article>
  )
}
