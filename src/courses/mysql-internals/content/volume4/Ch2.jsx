import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MVCCVersionChain from '@/courses/mysql-internals/illustrations/MVCCVersionChain.jsx'

const twoReads = `-- 快照读 snapshot read：普通 SELECT，走 MVCC、读历史快照、不加锁
SELECT money FROM account WHERE id = 1;

-- 当前读 current read：读最新已提交版本，并对读到的行加锁
SELECT money FROM account WHERE id = 1 FOR UPDATE;       -- 加排他锁(X)
SELECT money FROM account WHERE id = 1 LOCK IN SHARE MODE; -- 加共享锁(S)
UPDATE account SET money = money - 10 WHERE id = 1;       -- 隐式当前读 + X 锁
DELETE FROM account WHERE id = 1;                         -- 同上`

const rcVsRr = `-- ===== READ COMMITTED（RC）：每次快照读都新建 ReadView =====
SET SESSION transaction_isolation = 'READ-COMMITTED';
START TRANSACTION;
SELECT money FROM account WHERE id = 1;   -- 新建 ReadView_A，读到 100
--   （此时别的事务把 money 改成 200 并提交）
SELECT money FROM account WHERE id = 1;   -- 又新建 ReadView_B，读到 200
COMMIT;
-- RC 能看到别人新提交的结果，所以同一事务里两次读可能不一样

-- ===== REPEATABLE READ（RR）：首次快照读建一次，之后复用 =====
SET SESSION transaction_isolation = 'REPEATABLE-READ';
START TRANSACTION;
SELECT money FROM account WHERE id = 1;   -- 首次读，建 ReadView 并固定下来，读到 100
--   （此时别的事务把 money 改成 200 并提交）
SELECT money FROM account WHERE id = 1;   -- 复用同一个 ReadView，仍然读到 100
COMMIT;`

const phantomDemo = `-- 前置：RR 隔离级别，表里先有一行
SET SESSION transaction_isolation = 'REPEATABLE-READ';
-- account 中已有 (1, 100)


-- ========== 会话 T1 ==========
START TRANSACTION;
SELECT money FROM account WHERE id = 1;   -- 快照读，建 ReadView，读到 100


-- ========== 会话 T2 ==========
START TRANSACTION;
UPDATE account SET money = 999 WHERE id = 1;
COMMIT;                                    -- T2 已提交，最新版本=999


-- ========== 回到 T1 ==========
SELECT money FROM account WHERE id = 1;            -- 快照读，复用旧 ReadView → 仍是 100
SELECT money FROM account WHERE id = 1 FOR UPDATE; -- 当前读 → 读到最新的 999！
-- 同一个事务、同一行：快照读看不到 T2 的修改，当前读却看得到
COMMIT;`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们拆开了版本链和 ReadView，但留了个尾巴：为什么只有普通 <code>SELECT</code> 走 MVCC？
          这一章把读分成两类——<em>快照读</em>和<em>当前读</em>——讲清楚它们各自读哪个版本、加不加锁，
          再用它们解释一个让无数人困惑的话题：<strong>RR 隔离级别下，幻读到底防住了没有？</strong>
        </p>
      </Lead>

      <h2>两种读：快照读 vs 当前读</h2>
      <p>
        InnoDB 里的「读」其实分两种，它们对待版本和锁的态度完全相反：
      </p>
      <ul>
        <li>
          <em>快照读</em>（snapshot read）：就是普通的 <code>SELECT</code>。它走 MVCC，
          读的是 ReadView 选中的<strong>历史快照版本</strong>，<strong>全程不加锁</strong>，
          所以并发度极高。这是绝大多数查询的形态。
        </li>
        <li>
          <em>当前读</em>（current read）：包括 <code>SELECT ... FOR UPDATE</code>、
          <code>SELECT ... LOCK IN SHARE MODE</code>，以及所有 <code>UPDATE</code> / <code>DELETE</code>
          （它们内部要先读到最新行才能改）。当前读读的是<strong>最新的已提交版本</strong>，
          并且会<strong>对读到的行加锁</strong>，不走 ReadView。
        </li>
      </ul>
      <CodeBlock lang="sql" title="两种读的写法" code={twoReads} />
      <p>
        记住这条分界线：<strong>要不要拿到「此刻最新的、可以安全地接着改」的数据</strong>。
        要改数据，就必须看最新值并锁住它，否则两个事务基于同一个旧值各改各的就乱套了——这就是当前读存在的理由。
      </p>

      <MVCCVersionChain />

      <h3>RC 与 RR 的真正区别：ReadView 的创建时机</h3>
      <p>
        很多人记不住 <em>READ COMMITTED</em>（RC）和 <em>REPEATABLE READ</em>（RR）的差别，
        其实差别只有一处，而且非常具体：<strong>ReadView 是什么时候创建的</strong>。
      </p>
      <ul>
        <li>
          <strong>RC</strong>：<strong>每一次快照读都新建一个 ReadView</strong>。所以只要别的事务提交了新值，
          你下一次 <code>SELECT</code> 就能看到——同一个事务里前后两次读，结果可能不一样（这就是「不可重复读」）。
        </li>
        <li>
          <strong>RR</strong>：<strong>事务里第一次快照读时创建一个 ReadView，之后整个事务一直复用它</strong>。
          所以无论别人怎么提交，你这个事务看到的快照都「冻」在第一次读的那一刻，前后多次读结果一致（「可重复读」）。
        </li>
      </ul>
      <CodeBlock lang="sql" title="RC 与 RR 的 ReadView 时机对比" code={rcVsRr} />

      <KeyIdea title="一句话记住 RC 和 RR">
        <p>
          <strong>RC 是「每次读都刷新快照」，RR 是「一个事务一张快照用到底」。</strong>
          它们用的版本链、可见性规则一模一样，唯一不同就是 ReadView 建几次。
          理解了这点，就不用死记「RC 会不可重复读、RR 不会」这种结论了——它是 ReadView 时机的自然推论。
        </p>
      </KeyIdea>

      <h3>幻读为什么棘手：两手都得防</h3>
      <p>
        <em>幻读</em>（phantom read）指的是同一个查询条件，前后两次执行返回的<strong>行数变了</strong>
        （比如别人插入了符合条件的新行）。它之所以棘手，是因为快照读和当前读要靠<strong>两种完全不同的机制</strong>
        来防：
      </p>
      <ul>
        <li>
          <strong>快照读这一侧</strong>，靠 MVCC 防：因为 RR 复用同一个 ReadView，
          别人新插入并提交的行 <code>DB_TRX_ID</code> 落在你快照之后，对你不可见，所以你「看不到」幻影行。
        </li>
        <li>
          <strong>当前读这一侧</strong>，靠 <em>Next-Key Lock</em>（行锁 + 间隙锁）防：
          当前读不走 ReadView，它读最新版本，光靠 MVCC 挡不住，必须用锁把「这个范围内不准插新行」锁死，
          才能防止幻行被插进来。
        </li>
      </ul>
      <p>
        换句话说，RR 下幻读是<strong>分两条战线</strong>对付的：快照读靠多版本，当前读靠 Next-Key Lock。
        缺了任何一手，幻读都会在对应的读方式下重新冒出来。
      </p>

      <Example title="经典现象：快照读看不到，当前读却能更新到">
        <p>
          在 RR 下，一个事务里可能出现这样看似矛盾的一幕：
        </p>
        <ul>
          <li>
            你用普通 <code>SELECT</code> 查 id=1，由于复用旧 ReadView，读到的是老值 <code>money=100</code>；
          </li>
          <li>
            紧接着你用 <code>SELECT ... FOR UPDATE</code>（当前读）查同一行，却读到了别人刚提交的最新值
            <code>money=999</code>。
          </li>
        </ul>
        <p>
          同一个事务、同一行，两次读结果不同——这不是 bug，而是「快照读看历史版本、当前读看最新版本」的必然结果。
          下面的 Practice 会让你亲手复现它。
        </p>
      </Example>

      <Callout variant="warn" title="别被“RR 完美防幻读”误导">
        <p>
          常听到「InnoDB 的 RR 解决了幻读」，这话只对了一半，要补两个前提：
        </p>
        <ul>
          <li>
            <strong>快照读</strong>层面，RR 确实让你看不到幻行——但那只是「看不到」，最新数据其实已经变了。
          </li>
          <li>
            <strong>当前读</strong>层面，要靠 Next-Key Lock 才防得住；如果你的查询走不到合适的索引导致退化为表锁/全扫，
            或者隔离级别被改成 RC，幻读就可能卷土重来。把它当成「自动且无条件成立」的保证，迟早踩坑。
          </li>
        </ul>
      </Callout>

      <h2>这对实际开发意味着什么</h2>
      <p>
        最实用的一条经验：<strong>当你要「先查后改」并且不能容忍中间被别人插队时，普通 SELECT 是不够的</strong>。
        因为快照读读的是旧版本，你基于它算出来的结果可能早就过期了；正确做法是用
        <code>SELECT ... FOR UPDATE</code> 把行锁住再改，让它走当前读看到最新值。
        反过来，纯报表、纯展示类的只读查询，就该用普通 <code>SELECT</code>，享受 MVCC 不加锁的高并发。
        <strong>选对读的方式，本质上就是在「要不要拿最新值、要不要排他」之间做权衡。</strong>
      </p>

      <Practice title="两会话复现：快照读可重复 + 当前读看最新">
        <p>
          开两个客户端（T1、T2），都在 RR 下。T1 先做一次快照读固定住 ReadView；
          T2 改这行并提交；然后 T1 再做一次快照读（仍是旧值，证明可重复读），
          紧接着做一次 <code>FOR UPDATE</code> 当前读（读到最新值，证明当前读绕过快照）。
        </p>
        <CodeBlock lang="sql" title="rr_snapshot_vs_current.sql" code={phantomDemo} />
        <p>
          关键观察点在 T1 最后两条：同一行，普通 <code>SELECT</code> 还是 100，
          <code>SELECT ... FOR UPDATE</code> 却变成了 999。把这两行输出对照着看，
          你就彻底分清快照读和当前读了。
        </p>
      </Practice>

      <Summary
        points={[
          '快照读=普通 SELECT，走 MVCC、读历史快照版本、不加锁，是绝大多数查询的形态。',
          '当前读=SELECT ... FOR UPDATE / LOCK IN SHARE MODE / UPDATE / DELETE，读最新已提交版本并加锁，不走 ReadView。',
          'RC 与 RR 唯一的差别是 ReadView 创建时机：RC 每次快照读都新建（能看到别人新提交），RR 首次创建后整个事务复用（可重复读）。',
          '幻读要两手防：快照读靠 MVCC 的不可见性挡住幻行，当前读靠 Next-Key Lock 锁住范围，缺一不可。',
          '经典现象：RR 下同一行，快照读看到旧值、当前读看到最新值，这是版本机制的必然，不是 bug。',
          '工程取舍：先查后改且不能被插队就用 FOR UPDATE 走当前读，纯只读展示就用普通 SELECT 享受不加锁的高并发。',
        ]}
      />
    </>
  )
}
