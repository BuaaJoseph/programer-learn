import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const isoSql = `-- 查看与设置隔离级别
SELECT @@transaction_isolation;          -- 查看当前
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- 设置会话级
-- 四种：READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE`

const twoPcText = `两阶段提交（更新语句的收尾，保证 redo 与 binlog 一致）：
1. 执行器改 Buffer Pool 里的数据页（脏页）
2. 写 redo log，状态置为 prepare（准备）
3. 写 binlog
4. 提交事务：把 redo log 状态改为 commit
崩溃恢复时：
 - redo 是 commit -> 直接生效
 - redo 是 prepare 但 binlog 完整 -> 提交（生效）
 - redo 是 prepare 且 binlog 缺失 -> 回滚`

export default function Ch1() {
  return (
    <article>
      <Lead>
        事务和日志是 MySQL 面试的"深水区"。这一章把事务怎么实现、隔离级别、默认级别为何是 RR、
        三种并发异常、长事务危害、WAL、两阶段提交、redo/undo/binlog 的区别，以及 Doublewrite、
        Log Buffer 这些细节一次讲透。讲完你应该能把"一条更新语句怎么安全落盘"完整画出来。
      </Lead>

      <h2>一、事务是怎么实现的</h2>
      <h3>题目：MySQL 靠什么实现事务的 ACID？</h3>
      <p>事务的四个特性各有支撑它的机制，这是面试最爱追问的"对应关系"：</p>
      <table>
        <thead>
          <tr><th>特性</th><th>靠什么实现</th></tr>
        </thead>
        <tbody>
          <tr><td>原子性 Atomicity</td><td><strong>undo log</strong>：记录反向操作，回滚时据此撤销。</td></tr>
          <tr><td>持久性 Durability</td><td><strong>redo log</strong>：先写日志，崩溃后据此重做，保证已提交不丢。</td></tr>
          <tr><td>隔离性 Isolation</td><td><strong>MVCC + 锁</strong>：控制并发事务互相看到什么、等多久。</td></tr>
          <tr><td>一致性 Consistency</td><td>是<strong>目的</strong>，由上面三者 + 应用约束共同保证。</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        记住这张对应表：原子靠 undo、持久靠 redo、隔离靠 MVCC+锁、一致是结果。
        几乎所有事务深挖题都能从这张表展开。
      </KeyIdea>

      <h2>二、隔离级别与并发异常</h2>
      <h3>题目：四种隔离级别分别解决什么问题？</h3>
      <p>先讲三种并发异常，它们是隔离级别要对付的对象：</p>
      <ul>
        <li><strong>脏读</strong>：读到了别的事务<strong>还没提交</strong>的数据，对方一旦回滚，你读的就是不存在的脏数据。</li>
        <li><strong>不可重复读</strong>：同一事务里两次读<strong>同一行</strong>，结果不同（因为中间别人改了并提交）。针对 UPDATE。</li>
        <li><strong>幻读</strong>：同一事务里两次<strong>同样条件的范围查询</strong>，第二次多/少了几行（别人 INSERT/DELETE 并提交）。针对行数变化。</li>
      </ul>
      <table>
        <thead>
          <tr><th>隔离级别</th><th>脏读</th><th>不可重复读</th><th>幻读</th></tr>
        </thead>
        <tbody>
          <tr><td>READ UNCOMMITTED</td><td>可能</td><td>可能</td><td>可能</td></tr>
          <tr><td>READ COMMITTED (RC)</td><td>否</td><td>可能</td><td>可能</td></tr>
          <tr><td>REPEATABLE READ (RR)</td><td>否</td><td>否</td><td>基本否*</td></tr>
          <tr><td>SERIALIZABLE</td><td>否</td><td>否</td><td>否</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="sql" title="查看与设置隔离级别" code={isoSql} />
      <Callout variant="note" title="MySQL 的默认级别是 RR，为什么">
        InnoDB 默认 <strong>REPEATABLE READ</strong>。历史原因之一是早期 binlog 只有 statement 格式，
        在 RC 下主从复制可能出现数据不一致，RR 配合<strong>间隙锁</strong>能避免；同时 InnoDB 在 RR 下用
        MVCC + Next-Key Lock <strong>基本解决了幻读</strong>（*快照读靠 MVCC、当前读靠间隙锁）。
        所以它的 RR 比 SQL 标准里的 RR 更强。
      </Callout>
      <p>
        但<strong>生产环境很多公司用 RC</strong>：因为 RC 不加间隙锁、锁范围小、并发更高、死锁更少，
        且配合 row 格式 binlog 不会有一致性问题。所以"默认是什么"和"生产用什么"是两个答案，别混。
      </p>

      <h2>三、长事务的危害</h2>
      <h3>题目：长事务有什么问题？</h3>
      <ul>
        <li><strong>undo 膨胀</strong>：长事务可能让一个很老的 ReadView 一直存在，导致它要的旧版本
          undo 不能被清理，回滚段越积越大，磁盘暴涨。</li>
        <li><strong>锁占用久</strong>：持有的锁迟迟不释放，别的事务大量阻塞甚至超时。</li>
        <li><strong>主从延迟</strong>：大事务在从库要重放很久，拉大延迟。</li>
      </ul>
      <p>
        排查可查 <code>information_schema.innodb_trx</code> 找运行很久的事务。原则：事务尽量短小，
        不要在事务里做 RPC、发消息、等待用户输入这类慢操作。
      </p>

      <h2>四、WAL 与三种日志</h2>
      <h3>题目：redo、undo、binlog 有什么区别？</h3>
      <p>
        <strong>WAL（Write-Ahead Logging，预写日志）</strong>是核心思想：改数据时不立即把数据页刷盘
        （那是随机 IO、很慢），而是先<strong>顺序写 redo log</strong>（顺序 IO、很快），
        数据页之后由后台异步刷。崩溃后用 redo 把没刷的改动重做出来。这样既快又不丢数据。
      </p>
      <table>
        <thead>
          <tr><th>日志</th><th>层级</th><th>作用</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>redo log</td><td>InnoDB 引擎层</td><td>崩溃恢复、保证持久性</td><td>物理日志（记某页改成什么样），循环写、固定大小</td></tr>
          <tr><td>undo log</td><td>InnoDB 引擎层</td><td>回滚、支撑 MVCC 版本链</td><td>逻辑日志（记反向操作）</td></tr>
          <tr><td>binlog</td><td>Server 层</td><td>主从复制、数据恢复（按时间点）</td><td>逻辑日志，追加写、所有引擎都有</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="redo 和 binlog 的本质区别">
        redo 是 InnoDB 私有的、<strong>物理</strong>日志、<strong>循环覆盖</strong>（满了要先刷盘腾空间），
        用于崩溃恢复；binlog 是 Server 层的、<strong>逻辑</strong>日志、<strong>只追加</strong>，
        用于复制和按时间点恢复。一个保证"宕机不丢"，一个保证"能复制能回档"。
      </Callout>

      <h2>五、两阶段提交</h2>
      <h3>题目：为什么 redo 和 binlog 要两阶段提交？插入一条 SQL，redo 记什么？</h3>
      <p>
        两阶段提交是为了保证 redo 和 binlog 这两份日志的<strong>一致</strong>——否则崩溃恢复后，
        库里的数据（靠 redo 恢复）和从库的数据（靠 binlog 复制）会对不上。
      </p>
      <CodeBlock lang="text" title="两阶段提交流程" code={twoPcText} />
      <p>
        <strong>插入一条 SQL，redo 记什么</strong>：redo 是物理日志，记录的是"在哪个表空间、哪个页、
        哪个偏移，做了什么物理修改"（比如把某页某处插入这条记录、更新页头、维护索引页等），
        而不是记 "INSERT INTO ..." 这句 SQL 文本（那是 binlog 的 statement 格式才记的东西）。
      </p>

      <h2>六、Doublewrite Buffer 与 Log Buffer</h2>
      <h3>题目：Doublewrite Buffer 解决什么问题？</h3>
      <p>
        InnoDB 页是 16KB，而操作系统/磁盘一次原子写往往只有 4KB。如果刷盘刷到一半宕机，
        就出现<strong>页损坏（部分写，partial write）</strong>——半新半旧的页。
        而 redo 是基于"页是完整的"前提做物理重做的，损坏的页连重做的基础都没了。
      </p>
      <p>
        <strong>Doublewrite Buffer</strong> 的办法是：刷脏页前，先把页<strong>顺序</strong>写到一块
        doublewrite 区域，写成功后再写到真正的数据文件位置。万一第二步写崩了，
        恢复时能从 doublewrite 区域找到完整的页副本来修复。
      </p>
      <Callout variant="note" title="Log Buffer">
        <strong>Log Buffer</strong> 是 redo log 在内存里的缓冲区。写 redo 先写进 Log Buffer，
        再按 <code>innodb_flush_log_at_trx_commit</code> 策略刷到磁盘：值为 1（默认）每次提交都刷、最安全；
        0 和 2 性能更好但可能丢最近 1 秒的日志。这是"性能 vs 安全"的经典权衡参数。
      </Callout>

      <Example title="把一条 UPDATE 串起来">
        <p>
          UPDATE 一行：先在 Buffer Pool 改页生成脏页，同时写 undo（为了能回滚）→ 写 redo（prepare）→
          写 binlog → redo 改 commit。脏页之后由后台刷盘，刷盘时经 Doublewrite 防部分写。
          中途任何崩溃，都能靠 redo+binlog 的两阶段状态判断该提交还是回滚——这就是事务持久且安全的全貌。
        </p>
      </Example>

      <h2>七、再追几个日志相关问题</h2>
      <h3>题目：binlog 有哪几种格式，怎么选</h3>
      <p>
        三种：<strong>statement</strong> 记原始 SQL 语句，省空间但某些函数（如 <code>NOW()</code>、
        <code>UUID()</code>）在主从重放时结果不同，可能导致不一致；<strong>row</strong> 记每一行被改成什么样，
        精确、复制安全，但日志量大；<strong>mixed</strong> 让 MySQL 自动在两者间选。
        现在生产普遍用 <strong>row</strong>，因为它最安全，也是 CDC 工具能精确捕获变更的前提。
      </p>
      <h3>题目：redo log 写满了会怎样</h3>
      <p>
        redo log 是固定大小、循环写的，有一个"写到哪"的位置和一个"已经刷盘到哪"的位置。
        当写位置快追上刷盘位置（redo 快被写满）时，MySQL 必须<strong>停下来先把一批脏页刷盘</strong>、
        推进刷盘位置、腾出 redo 空间，才能继续。这会造成写入<strong>抖动</strong>。
        所以 redo log 不能配置太小，否则频繁刷盘、性能不稳。
      </p>
      <h3>题目：只有 redo 没有 binlog 行不行</h3>
      <p>
        对崩溃恢复来说，redo 自己就够了；但 binlog 承担<strong>主从复制</strong>和
        <strong>按时间点恢复</strong>，redo 是循环覆盖的、存不下历史，没法替代 binlog。
        两者职责不同：redo 保证"本机宕机不丢"，binlog 保证"能复制、能回档"。所以生产二者都要开，
        并用两阶段提交保证它们一致。
      </p>
      <h3>题目：脏页什么时候刷盘</h3>
      <p>
        InnoDB 不会改一次就刷一次（那样随机 IO 太多），脏页刷盘由几种时机触发：
        ① redo log 快写满，必须刷脏腾空间；② Buffer Pool 内存不够，要淘汰脏页前先刷；
        ③ 系统空闲时后台慢慢刷；④ 正常关闭时全部刷干净。其中前两种是"被迫刷"，
        会引起性能抖动，所以要给足 Buffer Pool 和 redo 空间，让刷盘尽量发生在空闲时。
      </p>
      <h3>题目：undo log 会一直保留吗</h3>
      <p>
        不会。undo 既支撑回滚也支撑 MVCC 的版本链，所以只要还有事务的 ReadView 可能读到某个旧版本，
        对应的 undo 就不能删。当没有任何事务再需要它时，由后台的 <strong>purge 线程</strong>清理。
        这也是长事务危害大的原因——一个老 ReadView 长期不释放，会让一大批 undo 迟迟不能被 purge，
        回滚段持续膨胀。
      </p>
      <Callout variant="tip" title="日志这章的主线">
        undo 管回滚、redo 管崩溃恢复、binlog 管复制与回档；WAL 是"先写日志后刷数据"的总思想；
        两阶段提交是为了让 redo 和 binlog 不打架。抓住这三句就抓住了全章。
      </Callout>

      <Summary
        points={[
          'ACID 对应：原子靠 undo、持久靠 redo、隔离靠 MVCC+锁、一致是结果。',
          '三种异常：脏读(读未提交)、不可重复读(同行两次不同)、幻读(范围两次行数变)；隔离级别逐级解决。',
          'InnoDB 默认 RR（历史+间隙锁防幻读+复制一致），但生产常用 RC（锁范围小、并发高、死锁少）。',
          '长事务危害：undo 膨胀、锁占用久、主从延迟；事务要短、别在事务里做慢操作。',
          'WAL=先顺序写日志再异步刷数据；redo 物理/循环/引擎层/崩溃恢复，undo 逻辑/回滚+MVCC，binlog 逻辑/追加/Server层/复制。',
          '两阶段提交(prepare-binlog-commit)保证 redo 与 binlog 一致；redo 记物理页修改；Doublewrite 防部分写、Log Buffer 由 flush 参数控刷盘安全。',
        ]}
      />
    </article>
  )
}
