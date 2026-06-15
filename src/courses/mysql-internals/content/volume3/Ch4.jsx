import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RedoUndoWAL from '@/courses/mysql-internals/illustrations/RedoUndoWAL.jsx'

const redoParamsSql = `-- 查看 redo log 相关参数
SHOW VARIABLES LIKE 'innodb_log%';
-- innodb_log_file_size / innodb_redo_log_capacity：redo 日志总容量
-- innodb_log_buffer_size：内存里的 redo 缓冲大小

-- 最关键的持久性开关
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
-- 取值含义：
--   1（默认，最安全）：每次提交都把 redo 刷到磁盘并 fsync，崩溃零丢失，最慢
--   2：每次提交写到 OS 缓存，每秒 fsync 一次，数据库崩溃不丢、操作系统崩溃可能丢 1 秒
--   0：每秒由后台线程统一写并 fsync，性能最好，崩溃可能丢最近 1 秒已提交事务`

const checkpointSql = `-- 观察脏页与刷盘相关状态
SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct';   -- 脏页占缓冲池比例上限
SHOW VARIABLES LIKE 'innodb_io_capacity';           -- 后台刷脏页的 IO 能力预估

-- 看 binlog 是否开启（与 redo 是两套不同的日志）
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'sync_binlog';   -- binlog 自己的刷盘策略`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          前两章反复提到「持久性靠 redo log、原子性靠 undo log」，这一章把这两套日志和它们背后的核心思想
          <em>WAL</em> 讲清楚。理解了它们，你就能回答一连串面试和排查里的真问题：提交了的数据为什么断电也不丢？
          数据明明还没写进磁盘怎么就算「持久化」了？以及——为什么写日志反而比直接写数据更快。
        </p>
      </Lead>

      <h2>WAL：先写日志，再写数据</h2>
      <p>
        <em>WAL</em>（Write-Ahead Logging，预写式日志）是几乎所有数据库持久化的基石，思想极其简单：
        <strong>修改数据之前，先把「我要做这次修改」记进日志，并保证日志落盘；至于真正的数据页，可以稍后再慢慢刷到磁盘</strong>。
      </p>
      <p>
        为什么这样可以？因为只要日志安全落盘了，哪怕这一刻断电、数据页还停留在内存里，重启后也能照着日志把修改重新做一遍。
        于是「提交成功」只需要等日志落盘，而不必等数据页落盘——这就是持久性的实现方式，也是性能的来源。
      </p>

      <RedoUndoWAL />

      <h2>redo log：物理日志，保证已提交不丢</h2>
      <p>
        <em>redo log</em>（重做日志）记录的是「在某个数据页的某个偏移上，把内容改成了什么」这种<strong>物理层面的变更</strong>。
        它有几个关键特征：
      </p>
      <ul>
        <li>
          <strong>物理日志</strong>：记的是数据页的物理修改，不是 SQL 语句，重启时拿来「重做」非常快。
        </li>
        <li>
          <strong>循环写</strong>：redo log 是固定大小的一组文件，写满了就回到头覆盖——但只能覆盖那些<strong>对应数据页已经刷盘</strong>的旧日志。
        </li>
        <li>
          <strong>保证持久性</strong>：事务提交时把 redo 落盘，崩溃恢复时重做所有「已提交但数据页未落盘」的修改，已提交数据绝不丢失。
        </li>
      </ul>

      <h3>提交时刷不刷盘：innodb_flush_log_at_trx_commit</h3>
      <p>
        redo log 的落盘时机由参数 <code>innodb_flush_log_at_trx_commit</code> 控制，它是<strong>性能与安全的关键旋钮</strong>：
        取值 <code>1</code>（默认）每次提交都 fsync 到磁盘，崩溃零丢失但最慢；<code>2</code> 每次提交只写到操作系统缓存、每秒 fsync 一次，
        MySQL 进程崩溃不丢、整机断电可能丢 1 秒；<code>0</code> 完全交给后台每秒刷一次，最快但崩溃可能丢最近 1 秒的已提交事务。
      </p>

      <h2>undo log：逻辑日志，支撑回滚与 MVCC</h2>
      <p>
        <em>undo log</em>（回滚日志）记录的是<strong>反向操作</strong>：你 <code>INSERT</code> 了一行，undo 里记「删掉它」；
        你把某列从 100 改成 200，undo 里记「改回 100」。它是<strong>逻辑日志</strong>，作用有两个：
      </p>
      <ul>
        <li>
          <strong>支撑回滚</strong>：<code>ROLLBACK</code> 或事务异常时，按 undo log 把数据逐条还原，这就是第 1 章说的原子性。
        </li>
        <li>
          <strong>支撑 MVCC</strong>：一行被多个事务修改时，旧版本不会被立刻丢弃，而是通过 undo log 串成一条
          <strong>版本链</strong>。快照读时，事务沿着版本链找到「对自己可见的那个版本」，这就是 MVCC 不加锁也能读到一致快照的底层依靠。
          因此第 2、3 章里的 MVCC 快照读，本质就是「顺着 undo 版本链读历史版本」。
        </li>
      </ul>

      <Callout variant="note" title="redo 和 undo 是互补的两半">
        <p>
          一句话记住分工：<strong>redo 记「改成什么」、用来在崩溃后把已提交修改重做出来（保证不丢）；
          undo 记「原来是什么」、用来回滚和给 MVCC 提供历史版本（保证能撤销、能读旧值）</strong>。
          一个面向「向前恢复」，一个面向「向后撤销」。
        </p>
      </Callout>

      <h2>脏页与 checkpoint</h2>
      <p>
        被修改过、但还没刷回磁盘的内存数据页叫<strong>脏页</strong>（dirty page）。WAL 允许数据页延后落盘，
        但脏页不能无限堆积，否则 redo log 没法循环覆盖、崩溃恢复也会变慢。InnoDB 的后台线程会持续把脏页刷到磁盘，
        并推进 <em>checkpoint</em>（检查点）——checkpoint 之前的修改都已落盘，对应的 redo 日志就可以被安全覆盖。
        所以 redo log 大小、脏页比例上限（<code>innodb_max_dirty_pages_pct</code>）都会影响刷盘节奏和性能抖动。
      </p>

      <KeyIdea title="顺序写为什么快">
        <p>
          这是 WAL 性能优势的核心：<strong>redo log 是顺序追加写，而数据页散落在磁盘各处、刷下去是随机写</strong>。
          对磁盘（尤其是机械盘，SSD 也有类似规律）而言，顺序写远快于随机写。WAL 把「提交的关键路径」变成顺序写日志，
          把昂贵的随机写数据页挪到后台批量异步完成——既保证了持久性，又把延迟压到最低。这就是「写日志反而比直接写数据快」的原因。
        </p>
      </KeyIdea>

      <h2>redo log 与 binlog：两套不同的日志</h2>
      <p>
        新手常把 redo log 和 <em>binlog</em> 搞混，它们其实属于不同层次：<strong>redo log 是 InnoDB 引擎层</strong>的物理日志，
        循环写、用于崩溃恢复；<strong>binlog 是 MySQL Server 层</strong>的逻辑日志，记录的是逻辑变更、追加写不循环，
        用于主从复制和数据恢复，所有存储引擎共用。为保证二者一致（避免「主库恢复出来的数据和从库不一致」），
        InnoDB 提交时采用<strong>两阶段提交</strong>：先写 redo（prepare）→ 写 binlog → 再提交 redo（commit），
        中间任一步崩溃都能据此判定该回滚还是该提交。细节这里点到为止。
      </p>

      <h2>这对排查问题意味着什么</h2>
      <p>
        理解这套机制，很多线上现象就有了归宿：写入性能瓶颈常和 redo log 太小、脏页刷盘跟不上有关；
        追求极致写入吞吐时会调 <code>innodb_flush_log_at_trx_commit=2</code>，但要清楚自己放弃了「整机断电不丢 1 秒数据」的保证；
        长事务之所以危险，部分原因正是它撑着 undo 版本链不让回收，拖慢 MVCC。把每个参数和它保护的东西对应起来，
        你才能在「性能」和「安全」之间做出有依据的取舍，而不是抄一份配置了事。
      </p>

      <Practice title="查看日志相关参数">
        <p>
          在你的实例上把这几个参数查出来，逐个对照含义，尤其确认 <code>innodb_flush_log_at_trx_commit</code> 的当前取值，
          想清楚它意味着「崩溃时最多可能丢多少已提交数据」。
        </p>
        <CodeBlock lang="sql" title="redo_params.sql" code={redoParamsSql} />
        <CodeBlock lang="sql" title="checkpoint_params.sql" code={checkpointSql} />
        <p>
          做完后回答自己一个问题：如果现在拔电源，哪些刚提交的事务一定还在、哪些可能丢？答案完全取决于
          <code>innodb_flush_log_at_trx_commit</code> 和 <code>sync_binlog</code> 这两个值——这就是「持久性」在工程上的真实分量。
        </p>
      </Practice>

      <Summary
        points={[
          'WAL（预写式日志）：先把修改写进日志并落盘，数据页可延后刷盘，提交只等日志落盘即可，这是持久性与高性能的基础。',
          'redo log 是引擎层物理日志、循环写，记录数据页的物理变更，崩溃时重做已提交修改，保证已提交数据不丢。',
          'innodb_flush_log_at_trx_commit 控制 redo 落盘时机：1 最安全零丢失、2 崩溃不丢但断电可能丢 1 秒、0 性能最好可能丢 1 秒。',
          'undo log 是逻辑日志、记录反向操作，既支撑 ROLLBACK 回滚（原子性），又通过版本链支撑 MVCC 的快照读。',
          '脏页是改了未落盘的内存页，checkpoint 推进后对应 redo 才能被循环覆盖；redo 顺序写远快于数据页随机写。',
          'binlog 是 Server 层逻辑日志（用于复制/恢复），与引擎层 redo 不同，靠两阶段提交保证二者一致。',
        ]}
      />
    </>
  )
}
