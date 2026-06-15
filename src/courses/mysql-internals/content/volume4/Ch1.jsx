import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MVCCVersionChain from '@/courses/mysql-internals/illustrations/MVCCVersionChain.jsx'

const rowHiddenCols = `-- 你建的表里只有这两列
CREATE TABLE account (
    id    INT PRIMARY KEY,
    money INT
);

-- 但 InnoDB 在每行后面偷偷加了三个隐藏字段：
--   DB_TRX_ID    6 字节  最近一次修改这行的事务 ID
--   DB_ROLL_PTR  7 字节  回滚指针，指向 undo log 里的上一个版本
--   DB_ROW_ID    6 字节  没有主键时才用，作为隐藏自增行号`

const readviewRule = `-- 设当前行版本的 DB_TRX_ID = trx_id，ReadView 四要素如下：
--   m_ids          : 创建 ReadView 时仍然活跃（未提交）的事务 ID 列表
--   min_trx_id     : m_ids 里的最小值
--   max_trx_id     : 系统下一个将要分配的事务 ID（比所有已出现的都大）
--   creator_trx_id : 创建这个 ReadView 的事务自己的 ID

-- 可见性判断（对版本链上的每个版本依次套用）：
IF trx_id == creator_trx_id THEN 可见          -- 自己改的，当然看得见
ELSE IF trx_id <  min_trx_id THEN 可见          -- 在我快照之前就提交了
ELSE IF trx_id >= max_trx_id THEN 不可见        -- 在我快照之后才开始的事务
ELSE IF trx_id IN m_ids      THEN 不可见        -- 快照那一刻还活跃，没提交
ELSE                              可见          -- 落在区间内但已提交`

const sessionDemo = `-- ========== 前置：准备数据 ==========
-- 任一会话执行一次
SET SESSION transaction_isolation = 'REPEATABLE-READ';
INSERT INTO account VALUES (1, 100);


-- ========== 会话 T1：修改但先不提交 ==========
START TRANSACTION;
UPDATE account SET money = 200 WHERE id = 1;
-- 注意：到这里 T1 还没 COMMIT
-- 此刻行上 DB_TRX_ID 已变成 T1 的事务号，
-- 旧版本(money=100)被 undo log 通过 DB_ROLL_PTR 串起来


-- ========== 会话 T2：快照读 ==========
START TRANSACTION;
SELECT money FROM account WHERE id = 1;
-- 结果是 100，而不是 200
-- 因为 T1 还在 m_ids 里（活跃未提交），最新版本对 T2 不可见，
-- T2 沿 DB_ROLL_PTR 回溯版本链，找到可见的旧版本 money=100


-- ========== 回到 T1：提交 ==========
COMMIT;`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你大概早就背过「InnoDB 默认隔离级别是可重复读，靠 MVCC 实现」这句话。但 <em>MVCC</em>
          （Multi-Version Concurrency Control，多版本并发控制）到底是怎么做到「读不加锁、写不阻塞读」的？
          答案藏在每一行数据的三个隐藏字段、一条由 undo log 串起来的版本链，以及一个叫 <em>ReadView</em>
          的「快照视角」里。这一章我们把这台机器拆开看。
        </p>
      </Lead>

      <h2>问题：为什么读和写可以不互相等待</h2>
      <p>
        在没有 MVCC 的世界里，要保证一个事务读到的数据是一致的，最朴素的做法是给读操作也加锁——别人正在改这行，
        你就得等它改完。这样读写互相阻塞，并发度很低。MVCC 的思路反过来：
        <strong>不删除旧数据，而是为每一次修改保留一个历史版本</strong>。这样写操作只管生成新版本，
        读操作去挑一个「对自己合适」的旧版本来看，两者各取所需，互不打扰。
      </p>
      <p>
        这里的「读」特指普通的 <code>SELECT</code>，也就是<em>快照读</em>（snapshot read），它完全不加锁。
        本章先讲清楚版本是怎么存的、快照是怎么选版本的；下一章再讲快照读和当前读的区别。
      </p>

      <h3>每一行的三个隐藏字段</h3>
      <p>
        你 <code>CREATE TABLE</code> 时只写了业务列，但 InnoDB 在每行后面还偷偷塞了几个字段，
        它们是整套 MVCC 的物理基础：
      </p>
      <CodeBlock lang="sql" title="行的隐藏字段" code={rowHiddenCols} />
      <p>
        最关键的是前两个：<code>DB_TRX_ID</code> 记下「这行最近是哪个事务改的」，
        <code>DB_ROLL_PTR</code> 是一根指针，指向 undo log 里这一行的「上一个版本」。
        有了这根指针，同一行的多个历史版本就能像链表一样首尾相接。
      </p>

      <h3>undo log 把历史版本串成版本链</h3>
      <p>
        每当一个事务修改某行，InnoDB 不是原地覆盖就完事——它会先把<strong>修改前的旧值</strong>写进
        <em>undo log</em>，然后让新版本的 <code>DB_ROLL_PTR</code> 指向那条 undo 记录。
        如果这行被改了很多次，就形成一条<strong>版本链</strong>：链头是最新版本，沿着
        <code>DB_ROLL_PTR</code> 一路往回，是越来越旧的历史版本。回滚（<code>ROLLBACK</code>）
        其实就是顺着这条链把数据还原回去。
      </p>

      <Example title="一行被改了两次后的版本链">
        <p>假设 id=1 这行依次被三个事务修改：</p>
        <ul>
          <li>
            链头（最新）：<code>money=300</code>，<code>DB_TRX_ID=trx80</code> ——指向↓
          </li>
          <li>
            中间：<code>money=200</code>，<code>DB_TRX_ID=trx60</code> ——指向↓
          </li>
          <li>
            链尾（最旧）：<code>money=100</code>，<code>DB_TRX_ID=trx40</code>
          </li>
        </ul>
        <p>
          注意：这三个版本里，<strong>只有链头存在聚簇索引的真实页上</strong>，
          下面两个都活在 undo log 里。一个读事务要看哪个版本，取决于它的 ReadView 怎么判断。
        </p>
      </Example>

      <MVCCVersionChain />

      <h3>ReadView：决定「我能看见哪个版本」</h3>
      <p>
        光有版本链还不够——读事务凭什么知道该停在哪个版本？这就是 <em>ReadView</em> 的职责。
        ReadView 是事务在做快照读那一刻，给整个数据库的「活跃状态」拍的一张照片，它由四个要素构成：
      </p>
      <ul>
        <li>
          <code>m_ids</code>：拍照那一刻<strong>仍然活跃（已开始但未提交）</strong>的事务 ID 列表。
        </li>
        <li>
          <code>min_trx_id</code>：<code>m_ids</code> 里的最小值，活跃事务的「下界」。
        </li>
        <li>
          <code>max_trx_id</code>：系统下一个将要分配的事务 ID，比此刻出现过的所有事务都大。
        </li>
        <li>
          <code>creator_trx_id</code>：创建这个 ReadView 的事务自己的 ID。
        </li>
      </ul>
      <p>
        拿着这张照片，读事务从版本链的链头开始，对每个版本的 <code>DB_TRX_ID</code> 套用一套固定规则，
        判断「这个版本对我可见吗」；不可见就顺着 <code>DB_ROLL_PTR</code> 往回找更旧的版本，
        直到找到第一个可见的为止。
      </p>
      <CodeBlock lang="sql" title="ReadView 可见性判断规则" code={readviewRule} />

      <KeyIdea title="可见性的核心直觉">
        <p>
          抛开公式，一句话概括：<strong>我只能看见「在我拍快照之前就已经提交」的修改</strong>。
          <code>trx_id &lt; min_trx_id</code> 说明它早就提交了，看得见；
          <code>trx_id &ge; max_trx_id</code> 说明它是我快照之后才出现的事务，看不见；
          落在区间内的，就看它当时在不在 <code>m_ids</code> 这份「未提交名单」里——
          在名单里=还没提交=看不见，不在名单里=已经提交=看得见。自己改的版本则永远看得见。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="MVCC 不是万能的">
        <p>
          MVCC 只管<strong>快照读</strong>的可见性，它处理不了下面这些场景，别把它当银弹：
        </p>
        <ul>
          <li>
            <code>SELECT ... FOR UPDATE</code>、<code>UPDATE</code>、<code>DELETE</code> 这类
            <strong>当前读</strong>不走 ReadView，它们读的是最新版本并加锁（下一章详谈）。
          </li>
          <li>
            版本链不会无限增长：旧版本要等到「没有任何 ReadView 还需要它」时，才会被 purge 线程清理。
            长事务迟迟不提交，会让 undo log 越堆越大，这是线上常见的隐患。
          </li>
        </ul>
      </Callout>

      <h2>这对实际开发意味着什么</h2>
      <p>
        理解了 ReadView，很多「灵异现象」就不灵异了。比如你在一个长事务里反复查同一行，
        中间别人改了又提交了，你却始终看到老值——这不是 bug，是 RR 隔离级别下 ReadView 复用的正常表现。
        再比如你发现 undo log 占用的表空间一直涨、<code>history list length</code> 居高不下，
        八成是哪个会话开了事务忘了提交，导致旧版本无法被回收。
        <strong>把「读看的是版本快照、写生成的是新版本」这件事刻进脑子，是排查并发问题的起点。</strong>
      </p>

      <Practice title="两会话亲眼看一次快照读">
        <p>
          开两个 MySQL 客户端连同一个库（下面记作会话 T1、T2）。T1 改了数据但<strong>先不提交</strong>，
          T2 用普通 <code>SELECT</code> 去读同一行——你会看到 T2 读到的是改之前的旧值。
          这正是 ReadView 把 T1 判为「活跃未提交、不可见」，T2 沿版本链回溯到旧版本的结果。
        </p>
        <CodeBlock lang="sql" title="snapshot_read_demo.sql" code={sessionDemo} />
        <p>
          再做个对照实验：让 T1 先 <code>COMMIT</code>，<strong>然后</strong>再开 T2 事务去查——
          这次 T2 会看到 200，因为创建 ReadView 时 T1 已不在 <code>m_ids</code> 里了。
          仅仅是「读的时机」差了一点，结果就完全不同，这就是 ReadView 时机的威力（下一章会专门讲它）。
        </p>
      </Practice>

      <Summary
        points={[
          'MVCC 让“读不加锁、写不阻塞读”：写操作生成新版本，读操作挑一个合适的旧版本看，互不等待。',
          '每行有三个隐藏字段：DB_TRX_ID（最近修改的事务）、DB_ROLL_PTR（指向旧版本的回滚指针）、DB_ROW_ID（无主键时的隐藏行号）。',
          'undo log 保存修改前的旧值，DB_ROLL_PTR 把同一行的历史版本串成一条版本链，链头最新、链尾最旧。',
          'ReadView 四要素：m_ids（活跃事务列表）、min_trx_id、max_trx_id、creator_trx_id，是快照那一刻的活跃状态照片。',
          '可见性规则：trx_id 小于 min 可见、不小于 max 不可见、在 m_ids 中=活跃未提交不可见、否则可见；自己改的永远可见。',
          '读事务从链头沿 DB_ROLL_PTR 回溯，找到第一个可见版本；旧版本要等没有 ReadView 需要时才被 purge 回收，长事务会拖垮 undo log。',
        ]}
      />
    </>
  )
}
