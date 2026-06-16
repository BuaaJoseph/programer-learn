import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CompositeIndex from '@/courses/mysql-internals/illustrations/CompositeIndex.jsx'

const schemaSql = `CREATE TABLE orders (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    status      TINYINT     NOT NULL,
    created_at  DATETIME    NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    -- 联合索引：排序规则是先 user_id，再 status，再 created_at
    KEY idx_u_s_c (user_id, status, created_at)
) ENGINE=InnoDB;`

const leftmostSql = `-- 命中：从最左列 user_id 开始，连续用上 user_id、status、created_at
EXPLAIN SELECT * FROM orders
WHERE user_id = 10086 AND status = 1 AND created_at > '2026-01-01';

-- 部分命中：用到 user_id、status，范围列 created_at 之后即便有列也用不上
EXPLAIN SELECT * FROM orders
WHERE user_id = 10086 AND status = 1;

-- 失效：跳过了最左列 user_id，整个联合索引用不上 → 全表扫描
EXPLAIN SELECT * FROM orders WHERE status = 1;`

const coveringSql = `-- 覆盖索引：要查的列（user_id、status、created_at）索引里全有 → 免回表
EXPLAIN SELECT user_id, status, created_at FROM orders
WHERE user_id = 10086 AND status = 1;
-- Extra 出现 Using index，表示没有回表

-- 失效场景集合
EXPLAIN SELECT * FROM orders WHERE user_id + 0 = 10086;        -- 函数/计算包裹列
EXPLAIN SELECT * FROM orders WHERE user_id = '10086';          -- 隐式类型转换（列是 BIGINT）
EXPLAIN SELECT * FROM orders WHERE status LIKE '%1';           -- 前导 % 的 LIKE
EXPLAIN SELECT * FROM orders WHERE user_id = 1 OR amount = 9;  -- OR 牵连无索引列`

const orderBySql = `-- 联合索引还能省掉排序：ORDER BY 命中索引顺序时，免去 filesort
-- idx_u_s_c (user_id, status, created_at)

-- ① 排序列与索引顺序一致 → Extra 不出现 Using filesort
EXPLAIN SELECT * FROM orders
WHERE user_id = 10086 ORDER BY status, created_at;

-- ② 等值列固定后按下一列排序，也能利用索引有序
EXPLAIN SELECT * FROM orders
WHERE user_id = 10086 AND status = 1 ORDER BY created_at;

-- ③ 排序方向不一致或跳列 → 退化为 Using filesort（在内存/磁盘里重新排）
EXPLAIN SELECT * FROM orders
WHERE user_id = 10086 ORDER BY created_at, status;   -- 顺序对不上索引`

const indexHintSql = `-- 优化器选错索引时的临时手段（先查清原因，别滥用）
-- 强制走某索引
SELECT * FROM orders FORCE INDEX (idx_u_s_c)
WHERE user_id = 10086 AND status = 1;

-- 禁止走某索引
SELECT * FROM orders IGNORE INDEX (idx_u_s_c)
WHERE user_id = 10086;

-- 选错的根因常是统计信息过期，先试着重新采样
ANALYZE TABLE orders;`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          单列索引你已经懂了，但实际业务里查询往往同时过滤好几个字段。这时该建几个单列索引，还是建一个
          <em>联合索引</em>？联合索引又为什么有“最左前缀”这种说法，哪些查询能用、哪些用不上？
          再加上能彻底干掉回表的<strong>覆盖索引</strong>，以及一堆让索引悄悄失效的写法——这一章把它们一次讲清。
        </p>
      </Lead>

      <h2>联合索引的排序规则：先 a，再 b，再 c</h2>
      <p>
        <em>联合索引</em>（composite index）<code>(a, b, c)</code> 的 B+Tree，键是这三列<strong>拼起来</strong>的，
        排序规则像字典：<strong>先按 a 排序；a 相同的，再按 b 排序；a、b 都相同的，才按 c 排序</strong>。
        理解这个排序规则，最左前缀和失效场景就都能自己推出来了。
      </p>

      <h3>最左前缀原则：从最左列开始，连续地用</h3>
      <p>
        正因为是“先 a 再 b 再 c”，这棵树只有在<strong>从最左列开始、连续不断地用</strong>时才有序可查。
        对 <code>(user_id, status, created_at)</code> 来说：
      </p>
      <ul>
        <li>
          <code>WHERE user_id = ?</code>、<code>user_id = ? AND status = ?</code>、
          <code>user_id = ? AND status = ? AND created_at = ?</code> 都能命中，且分别用到第 1、2、3 列。
        </li>
        <li>
          <code>WHERE status = ?</code>（跳过了最左的 user_id）<strong>用不上</strong>这个索引。
        </li>
        <li>
          <code>WHERE user_id = ? AND created_at = ?</code>（中间跳过了 status）只能用到 <code>user_id</code> 这一列，
          后面的 created_at 派不上用场。
        </li>
      </ul>
      <p>
        还有一条容易踩的：<strong>范围列之后的列会失效</strong>。
        <code>WHERE user_id = ? AND status &gt; ? AND created_at = ?</code> 里，status 用的是范围（<code>&gt;</code>），
        一旦某列用了范围匹配，它<strong>后面</strong>的 created_at 就无法再走索引定位（只能在结果里过滤）。
        所以建联合索引时，把<strong>等值列放前、范围列放最后</strong>。
      </p>

      <h3>联合索引还能消灭排序（filesort）</h3>
      <p>
        联合索引的价值不止于过滤，它的<strong>有序性</strong>还能直接给 <code>ORDER BY</code> 省掉一次排序。
        因为索引叶子本身就是按 <code>(a, b, c)</code> 有序排好的，如果 <code>ORDER BY</code> 的列正好和索引顺序对得上，
        InnoDB 顺着叶子链表扫出来就已经是有序的，<strong>不需要再做 filesort</strong>（在内存或磁盘临时空间里重排）。
        反之，执行计划 Extra 里出现 <code>Using filesort</code> 就意味着多了一笔排序开销，数据量大时排序还可能落盘，非常慢。
      </p>
      <ul>
        <li><code>WHERE user_id = ? ORDER BY status, created_at</code>：等值定住第一列，按后两列排序，<strong>和索引顺序一致，免排序</strong>。</li>
        <li><code>WHERE user_id = ? ORDER BY created_at, status</code>：排序列顺序和索引对不上，<strong>退化为 filesort</strong>。</li>
        <li>排序方向也要一致：8.0 支持降序索引，但混合 <code>ASC/DESC</code> 仍可能用不上索引顺序。</li>
      </ul>
      <CodeBlock lang="sql" title="order_by.sql" code={orderBySql} />

      <CompositeIndex />

      <h2>覆盖索引：要的列索引里全有，免回表</h2>
      <p>
        上一章讲过回表的代价。<em>覆盖索引</em>（covering index）就是它的解药：如果一条查询<strong>需要的所有列</strong>
        （SELECT 的列 + WHERE 的列）都已经包含在某个索引里，InnoDB 在二级索引上就把数据凑齐了，
        <strong>不必回聚簇索引</strong>。执行计划的 <code>Extra</code> 里会出现 <code>Using index</code>，这就是覆盖索引生效的标志。
      </p>
      <p>
        别忘了二级索引叶子还白送一个主键值，所以 <code>SELECT id, user_id ...</code> 也常常能被覆盖。
        把高频查询要返回的少数几列纳入联合索引，往往能用很小的存储代价换来回表的彻底消失。
      </p>

      <Example title="同一个索引，回表 vs 覆盖">
        <p>索引 <code>idx_u_s_c (user_id, status, created_at)</code>：</p>
        <ul>
          <li>
            <code>SELECT amount FROM orders WHERE user_id = 1</code>——amount 不在索引里，<strong>要回表</strong>。
          </li>
          <li>
            <code>SELECT status, created_at FROM orders WHERE user_id = 1</code>——要的列索引全有，
            <strong>覆盖索引，免回表</strong>，Extra 显示 Using index。
          </li>
        </ul>
      </Example>

      <Callout variant="tip" title="索引下推（ICP）顺带一提">
        <p>
          <em>索引下推</em>（Index Condition Pushdown，ICP，MySQL 5.6+）是个自动优化：当 WHERE 里有些条件
          不能用来定位、但涉及的列正好在索引里时，MySQL 会把这些条件<strong>下推到存储引擎层</strong>，
          在索引上就先过滤掉不满足的行，<strong>减少回表次数</strong>。命中时 Extra 会显示
          <code>Using index condition</code>。你不用手动开启，了解它能帮你读懂执行计划即可。
        </p>
      </Callout>

      <Callout variant="warn" title="常见的索引失效场景">
        <p>下面这些写法会让本该命中的索引悄悄失效，退化成全表扫描，是排查慢查询时最该先看的几处：</p>
        <ul>
          <li>
            <strong>函数或计算包裹了索引列</strong>：<code>WHERE YEAR(created_at) = 2026</code>、
            <code>WHERE user_id + 0 = 1</code>——列被运算后就不是原来的有序键了，改写成对原列的范围条件。
          </li>
          <li>
            <strong>隐式类型转换</strong>：列是 <code>BIGINT</code> 却写 <code>WHERE user_id = '10086'</code>，
            MySQL 会把列转成字符串再比，等于在列上套了函数，索引失效。
          </li>
          <li>
            <strong>前导 % 的 LIKE</strong>：<code>WHERE name LIKE '%三'</code> 无法用前缀定位；
            <code>LIKE '张%'</code> 则可以。
          </li>
          <li>
            <strong>OR 牵连无索引列</strong>：<code>WHERE a = 1 OR b = 2</code> 中 b 没索引，整条往往退化为全表扫描。
          </li>
        </ul>
      </Callout>

      <KeyIdea title="一条联合索引，胜过多条单列索引">
        <p>
          与其给 user_id、status、created_at 各建一个单列索引，不如按查询模式建一个联合索引
          <code>(user_id, status, created_at)</code>：它能服务“user_id”“user_id+status”“user_id+status+created_at”
          这一系列查询（最左前缀），还可能顺带做成覆盖索引。<strong>把等值列放前、范围列放后、高频返回列纳入</strong>，
          是设计联合索引的三条核心准则。
        </p>
      </KeyIdea>

      <h3>列顺序怎么排：选择性与查询模式</h3>
      <p>
        建联合索引时，列的先后顺序是门学问，三条准则按优先级排：
      </p>
      <ul>
        <li><strong>① 等值在前、范围在后</strong>：范围列后面的列无法再用于索引定位，所以范围列要放最后。</li>
        <li><strong>② 高选择性（区分度高）的等值列尽量靠前</strong>：区分度 = 不同值数量 / 总行数。把过滤性强的列放前面，能更快缩小扫描范围。但这条要让位于查询模式——如果某列几乎所有查询都不带它，放再前面也没用。</li>
        <li><strong>③ 兼顾 ORDER BY / GROUP BY</strong>：如果高频查询固定要按某列排序，把它纳入索引相应位置能顺带省掉 filesort。</li>
      </ul>
      <p>
        现实中这三条经常打架，没有标准答案，要看真实的<strong>查询分布</strong>。最稳妥的做法是把慢查询日志里的高频 SQL 捞出来，
        归纳出最常见的几种 WHERE+ORDER BY 组合，再设计能覆盖最多场景的少数几个联合索引。
      </p>

      <Callout variant="tip" title="优化器选错索引时怎么办">
        <p>
          偶尔会遇到优化器“放着好索引不用”，多半是<strong>统计信息过期</strong>导致它把代价算错了。
          第一步永远是 <code>ANALYZE TABLE</code> 重新采样校准统计信息。如果校准后仍选错，可临时用
          <code>FORCE INDEX</code> / <code>IGNORE INDEX</code> 提示（hint）兜底，但这是治标——hint 写死在 SQL 里，
          数据分布一变又可能成为新枷锁，要慎用。
        </p>
        <CodeBlock lang="sql" title="index_hint.sql" code={indexHintSql} />
      </Callout>

      <Callout variant="note" title="高频面试追问">
        <ul>
          <li><strong>“(a,b,c) 索引，WHERE b=? AND c=? 能用吗？”</strong>——用不上，跳过了最左列 a，整个索引失效。</li>
          <li><strong>“WHERE a=? AND b{'>'}? AND c=? 用到几列？”</strong>——只用到 a 和 b，b 是范围列，c 在它后面失效（但 ICP 可能用 c 在引擎层过滤）。</li>
          <li><strong>“为什么 != / not in / is null 容易不走索引？”</strong>——它们往往要扫描索引的大部分甚至全部，优化器算下来不如全表扫，于是放弃索引。</li>
          <li><strong>“覆盖索引和普通索引在 EXPLAIN 上怎么区分？”</strong>——看 Extra 是否有 <code>Using index</code>（覆盖，免回表）；注意别和 <code>Using index condition</code>（ICP）混淆。</li>
        </ul>
      </Callout>

      <h2>这对设计索引意味着什么</h2>
      <p>
        看一张表的慢查询，别急着加一堆单列索引。先归纳出高频查询的过滤字段和返回字段，按“最左前缀 + 等值在前范围在后 + 尽量覆盖”
        设计少而精的联合索引，再用 <code>EXPLAIN</code> 一条条验证 <code>key</code>、<code>type</code>、<code>Extra</code>。
        索引不是越多越好——每个索引都要占空间、拖慢写入，而设计得当的联合索引能一顶多个。
      </p>

      <Practice title="用 EXPLAIN 演示最左前缀命中/失效与覆盖索引">
        <p>
          建好联合索引后，跑下面几组 <code>EXPLAIN</code>，重点看三个字段：<code>key</code>（用了哪个索引）、
          <code>type</code>（ref/range/ALL）、<code>Extra</code>（是否 Using index / Using index condition）。
        </p>
        <CodeBlock lang="sql" title="schema.sql" code={schemaSql} />
        <CodeBlock lang="sql" title="leftmost_prefix.sql" code={leftmostSql} />
        <CodeBlock lang="sql" title="covering_and_failures.sql" code={coveringSql} />
        <p>
          逐条对照：哪条命中了索引、用到了第几列、是否覆盖、哪条退化成了 <code>type=ALL</code>。把这些现象和本章的排序规则对上号，你就真正吃透联合索引了。
        </p>
        <p>
          进阶：再跑下面这组 <code>ORDER BY</code>，重点观察 Extra 里 <code>Using filesort</code> 何时出现、何时消失，体会“索引有序性顺带省排序”。
        </p>
        <CodeBlock lang="sql" title="order_by_index.sql" code={orderBySql} />
      </Practice>

      <Summary
        points={[
          '联合索引 (a,b,c) 的键按字典序排：先 a，a 相同再 b，b 相同再 c——这是理解一切的基础。',
          '最左前缀原则：必须从最左列开始、连续地用；跳过最左列整个索引失效，中间跳列则只能用到断点前的列。',
          '范围列之后的列会失效，所以联合索引应把等值列放前、范围列放最后。',
          '覆盖索引：查询所需的列全在索引里时免回表，Extra 显示 Using index，是消灭回表的关键手段。',
          '索引下推（ICP）在引擎层用索引内的列提前过滤，减少回表，命中时 Extra 显示 Using index condition。',
          '常见失效场景：函数/计算包裹列、隐式类型转换、前导 % 的 LIKE、OR 牵连无索引列；一律用 EXPLAIN 的 key/type/Extra 验证。',
        ]}
      />
    </>
  )
}
