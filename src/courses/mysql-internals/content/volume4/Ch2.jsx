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

const realPhantomSql = `-- RR 下真正会暴露幻读的场景：先快照读建视图，再当前读/写「区间」
SET SESSION transaction_isolation = 'REPEATABLE-READ';
-- 表 t(id INT PRIMARY KEY), 现有 (1),(5),(10)

-- ===== 会话 A =====
START TRANSACTION;
SELECT * FROM t WHERE id BETWEEN 1 AND 10;   -- 快照读：看到 1,5,10，建 ReadView

-- ===== 会话 B =====
START TRANSACTION;
INSERT INTO t VALUES (7);   -- 往区间里插一行
COMMIT;

-- ===== 回到 A =====
SELECT * FROM t WHERE id BETWEEN 1 AND 10;             -- 快照读：仍是 1,5,10（MVCC 挡住）
SELECT * FROM t WHERE id BETWEEN 1 AND 10 FOR UPDATE;  -- 当前读：1,5,7,10！7 冒出来了
-- 若 A 一开始就用 FOR UPDATE，Next-Key Lock 会锁住 [1,10] 区间，
-- B 的 INSERT 7 会被阻塞，幻读才真正被挡住
COMMIT;`

const semiConsistentSql = `-- RC 下的“半一致读”：UPDATE 扫到不满足条件的行会跳过、不加锁，提升并发
-- （仅 RC + 特定条件下，了解即可）
SET SESSION transaction_isolation = 'READ-COMMITTED';

-- 秒杀式扣减库存：原子更新 + 条件判断，天然防超卖，且不需要先 SELECT
UPDATE stock SET num = num - 1
WHERE sku_id = 1001 AND num > 0;   -- 影响行数=0 即代表已售罄

-- 用受影响行数判断成败，比“先查再扣”少一次往返、也没有先读后写的丢失更新风险
SELECT ROW_COUNT();   -- 1=扣成功，0=没库存了`

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

      <h3>幻读真正暴露的那一刻：区间当前读</h3>
      <p>
        上面说“RR 两手防幻读”，但要看清它<strong>什么时候防住、什么时候防不住</strong>。关键在于：
        如果一个事务先用快照读建了 ReadView，中途别人往区间里插了行并提交，那么：
      </p>
      <ul>
        <li>这个事务再做<strong>快照读</strong>，MVCC 让它看不到新行，行数不变——幻读被“看不到”掩盖了。</li>
        <li>但它一旦做<strong>区间当前读</strong>（<code>SELECT ... FOR UPDATE</code> 或 <code>UPDATE ... WHERE 区间</code>），就读到了最新数据，新插的行赫然在列——<strong>幻读暴露</strong>。</li>
      </ul>
      <p>
        真正<strong>从源头挡住</strong>幻读的，是事务<strong>一开始就用当前读</strong>：第一条 <code>SELECT ... FOR UPDATE BETWEEN 1 AND 10</code>
        会对整个区间加 Next-Key Lock，别人的 <code>INSERT 7</code> 直接被阻塞，新行根本插不进来。这就是“防幻读靠的是当前读 + Next-Key Lock，
        而不是快照读”的精确含义。
      </p>
      <CodeBlock lang="sql" title="real_phantom.sql" code={realPhantomSql} />

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

      <Callout variant="tip" title="扣库存的正确姿势：能用原子更新就别先查后改">
        <p>
          “先 <code>SELECT</code> 查库存，应用层判断够不够，再 <code>UPDATE</code> 扣减”是新手最常见的超卖写法——两个请求同时读到
          库存 1，各自判断“够”，于是都扣，库存变成 -1。即便用 <code>FOR UPDATE</code> 锁住能解决，但更优雅的做法是
          <strong>把判断塞进 UPDATE 本身</strong>：<code>UPDATE stock SET num=num-1 WHERE sku_id=? AND num{'>'}0</code>，
          靠受影响行数（0 即售罄）判断成败。它是单条原子语句，没有“先读后写”的窗口，天然防超卖、还少一次往返。
        </p>
        <CodeBlock lang="sql" title="semi_consistent.sql" code={semiConsistentSql} />
      </Callout>

      <Callout variant="note" title="高频面试追问">
        <ul>
          <li><strong>“快照读和当前读的区别？”</strong>——快照读走 MVCC 读历史版本不加锁；当前读读最新已提交版本并加锁（X 或 S），<code>UPDATE/DELETE/SELECT...FOR UPDATE</code> 都是当前读。</li>
          <li><strong>“RR 真的解决幻读了吗？”</strong>——分两半：快照读靠 MVCC“看不到”，当前读靠 Next-Key Lock“锁住区间”；只用快照读时幻行其实已存在，当前读会暴露它。不能笼统说“RR 完全解决”。</li>
          <li><strong>“RC 和 RR 在 MVCC 上唯一的区别？”</strong>——ReadView 创建时机：RC 每次快照读都新建，RR 事务首次快照读建一次后复用。</li>
          <li><strong>“为什么 UPDATE 也算当前读？”</strong>——要改一行得先拿到它“此刻最新且可安全修改”的版本并加锁，否则两个事务基于旧值各改各的会丢失更新。</li>
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
