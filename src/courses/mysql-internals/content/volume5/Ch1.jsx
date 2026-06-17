import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const selectOrderSql = `-- 你写的顺序（书写顺序）
SELECT  d.name, COUNT(*) AS cnt
FROM    employee e
JOIN    dept d ON d.id = e.dept_id
WHERE   e.status = 'active'
GROUP BY d.name
HAVING  COUNT(*) > 5
ORDER BY cnt DESC
LIMIT   10;`

const execOrderText = `MySQL 真正的逻辑执行顺序：
1. FROM / JOIN     先确定数据来自哪些表，做笛卡尔积 + ON 连接
2. WHERE           对单行做过滤（此时还不能用 SELECT 里的别名）
3. GROUP BY        按分组键把行折叠成组
4. HAVING          对"组"做过滤（可用聚合函数结果）
5. SELECT          计算要输出的列与表达式（别名在此才诞生）
6. DISTINCT        去重
7. ORDER BY        排序（可用 SELECT 里定义的别名）
8. LIMIT           取前 N 行`

const explainSql = `EXPLAIN SELECT * FROM employee WHERE dept_id = 3 ORDER BY salary;
-- 关注 type / key / rows / Extra
-- Extra 出现 Using filesort 表示排序无法靠索引完成，需要额外排序`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一章我们把"一条 SQL 是怎么被执行的"讲透。它几乎是所有 MySQL 面试的第一题，因为答好它，
        就等于在面试官脑子里画出了一张 MySQL 的整体架构图：连接器、分析器、优化器、执行器、
        存储引擎各司其职。我们还会顺手解决几个高频追问——SELECT 各子句的真实执行顺序、
        优化器凭什么挑执行计划、Buffer Pool 到底从不从磁盘读、以及排序是怎么用 filesort 实现的。
      </Lead>

      <h2>一、一条查询 SQL 的完整执行过程</h2>
      <h3>题目：说说一条 select 语句在 MySQL 里是怎么执行的？</h3>
      <p>
        这道题考的不是背诵，而是你脑子里有没有"分层"的概念。MySQL 在逻辑上分成两层：
        <strong>Server 层</strong>（连接、分析、优化、执行，以及 binlog）和<strong>存储引擎层</strong>
        （真正读写数据，InnoDB 是默认）。一条查询自上而下穿过这两层：
      </p>
      <ul>
        <li><strong>连接器</strong>：建立 TCP 连接、做权限校验、维持会话。连接建立后权限就固定了，
          中途改权限不影响已存在的连接。长连接省握手开销，但会累积内存，需要定期断或用
          <code>mysql_reset_connection</code> 复位。</li>
        <li><strong>查询缓存</strong>：MySQL 8.0 已彻底移除。早期它把"SQL 文本→结果"缓存起来，
          但只要表有任何写入，相关缓存全部失效，命中率极低、维护成本高，所以被砍掉。
          面试说到这里能加分。</li>
        <li><strong>分析器</strong>：做词法分析（识别出关键字、表名、列名）和语法分析
          （检查 SQL 是否符合语法），同时判断表和列是否真实存在。</li>
        <li><strong>优化器</strong>：在多种执行方案里挑一条它认为代价最低的，比如该用哪个索引、
          多表 JOIN 用什么连接顺序。详见本章第三节。</li>
        <li><strong>执行器</strong>：先做一次权限校验（确认对这张表有权限），然后调用存储引擎提供的接口，
          一行行把数据取出来、判断是否满足条件、组装成结果集返回。</li>
        <li><strong>存储引擎</strong>：执行器调它的接口，它负责真正从 Buffer Pool 或磁盘读数据、写数据。</li>
      </ul>
      <KeyIdea>
        记忆口诀：连（连接器）→ 分（分析器）→ 优（优化器）→ 执（执行器）→ 存（存储引擎）。
        Server 层负责"决策"，存储引擎负责"干活"，两层通过接口解耦——这正是 MySQL 能换引擎的根因。
      </KeyIdea>
      <p>
        更新语句还要多走一段：因为涉及 redo log 和 binlog 的两阶段提交（这部分留到 m6-c1 细讲），
        而查询语句只要把数据取出来返回即可。面试时如果被问"更新呢"，记得补一句两阶段提交。
      </p>

      <h2>二、SELECT 各子句的真实执行顺序</h2>
      <h3>题目：你写的 SQL 和 MySQL 执行它的顺序一样吗？</h3>
      <p>
        不一样，而且这个差异正是很多 bug 的根源。我们书写 SQL 是从 <code>SELECT</code> 开头的，
        但 MySQL 在逻辑上是从 <code>FROM</code> 开始的。看下面这条 SQL：
      </p>
      <CodeBlock lang="sql" title="书写顺序" code={selectOrderSql} />
      <p>它的真实逻辑执行顺序是：</p>
      <CodeBlock lang="text" title="逻辑执行顺序" code={execOrderText} />
      <p>
        理解这个顺序能解释两个经典坑：
      </p>
      <ul>
        <li><strong>为什么 WHERE 里不能用 SELECT 里的别名？</strong> 因为 WHERE 在第 2 步执行，
          而别名在第 5 步的 SELECT 才诞生，引用一个还不存在的东西自然报错。</li>
        <li><strong>为什么 ORDER BY 里可以用别名？</strong> 因为 ORDER BY 在第 7 步，
          那时 SELECT 已经算完，别名已经存在。</li>
      </ul>
      <Callout variant="warn" title="WHERE 与 HAVING 的区别别答反">
        <code>WHERE</code> 对"单行"过滤、发生在分组之前、不能用聚合函数；
        <code>HAVING</code> 对"分组后的组"过滤、能用 <code>COUNT/SUM</code> 等聚合结果。
        能用 WHERE 先过滤就别留给 HAVING，因为 WHERE 先把行砍掉了，分组的数据量更小、更快。
      </Callout>
      <Example title="一个常见错误">
        <p>
          有人想"查工资大于平均工资的人"，写成
          <code>WHERE salary {'>'} AVG(salary)</code>，直接报错——因为 WHERE 阶段还没分组、
          不能用聚合函数。正确做法是子查询先算出 <code>AVG(salary)</code>，再在外层 WHERE 里比较。
        </p>
      </Example>

      <h2>三、查询优化器如何选执行计划</h2>
      <h3>题目：一张表有好几个索引，MySQL 怎么决定走哪个？</h3>
      <p>
        MySQL 用的是<strong>基于成本（cost-based）</strong>的优化器。它会枚举可能的执行方案
        （走索引 A、走索引 B、全表扫描、不同的 JOIN 顺序……），给每个方案估算一个"代价"，
        挑代价最小的那个。代价主要由两部分构成：
      </p>
      <table>
        <thead>
          <tr><th>代价类型</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>IO 成本</td><td>把数据页从磁盘读到内存的开销，与要扫描的页数成正比</td></tr>
          <tr><td>CPU 成本</td><td>在内存里比较、判断每一行是否满足条件的开销</td></tr>
        </tbody>
      </table>
      <p>
        优化器估算时靠的是<strong>统计信息</strong>——主要是索引的<strong>区分度（cardinality，基数）</strong>，
        即这个索引大概有多少个不同值。区分度高（比如身份证号）的索引过滤效果好，优化器更愿意走它；
        区分度低（比如性别只有两个值）的索引可能还不如全表扫描。这些统计信息是
        <strong>采样估算</strong>出来的，不是精确值，所以优化器偶尔会"选错"。
      </p>
      <Callout variant="tip" title="优化器选错了怎么办">
        ① 用 <code>ANALYZE TABLE</code> 重新统计，让基数更新到位；
        ② 用 <code>FORCE INDEX(idx_name)</code> 强制走某个索引；
        ③ 检查是不是写法导致索引失效（比如对列做了函数运算）。面试能说出这三招就很扎实。
      </Callout>

      <h2>四、Buffer Pool：数据都从磁盘读吗</h2>
      <h3>题目：InnoDB 查数据每次都去磁盘读吗？</h3>
      <p>
        不是。这就是 <strong>Buffer Pool</strong> 存在的意义。InnoDB 把数据和索引按"页"
        （默认 16KB）组织，所有读写都<strong>先经过内存里的 Buffer Pool</strong>：
      </p>
      <ul>
        <li><strong>读</strong>：要某一页时先看 Buffer Pool 里有没有，命中就直接用（不碰磁盘）；
          没命中才从磁盘读这一页进来、再用。</li>
        <li><strong>写</strong>：先改 Buffer Pool 里的页（此时叫"脏页"），并写 redo log 保证不丢，
          之后由后台线程在合适时机把脏页刷回磁盘——这就是 WAL（先写日志）思想。</li>
      </ul>
      <p>
        Buffer Pool 用<strong>改良版 LRU</strong> 管理：把链表分成 young（热数据）和 old（冷数据）两段，
        新读进来的页先放 old 段头部，只有在一定时间间隔后再次被访问才"晋升"到 young 段。
        这样做是为了防止<strong>全表扫描</strong>这种一次性大批量读入的页，把真正的热点数据从内存里挤出去。
      </p>
      <KeyIdea>
        一句话答 Buffer Pool：它是 InnoDB 在内存里的数据缓存，命中就不读磁盘，
        写也先写它再异步刷盘，配合改良 LRU 抗住全表扫描污染——它是 InnoDB 性能的命门。
      </KeyIdea>

      <h2>五、排序是怎么实现的：filesort 详解</h2>
      <h3>题目：ORDER BY 是怎么排序的？什么时候会出现 filesort？</h3>
      <p>
        排序有两种情况。如果 <code>ORDER BY</code> 的列正好是索引的顺序（索引本身就是有序的），
        那么<strong>沿着索引扫一遍就是有序的</strong>，不需要额外排序，EXPLAIN 的 Extra 是
        <code>Using index</code> 一类，效率最高。
      </p>
      <p>
        如果排序列用不上索引，MySQL 就得自己排，这个过程叫 <strong>filesort</strong>（文件排序，
        名字有"file"但不一定真用磁盘）。它有两种方式：
      </p>
      <table>
        <thead>
          <tr><th>方式</th><th>做法</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>全字段排序</td><td>把查询要用的所有字段一起放进 sort_buffer 排序</td><td>排完直接返回，不用回表，但占内存大</td></tr>
          <tr><td>rowid 排序</td><td>只把排序列 + 主键放进 sort_buffer 排序，排完再按主键回表取其他字段</td><td>占内存小，但要多一次回表</td></tr>
        </tbody>
      </table>
      <p>
        选哪种取决于单行长度和 <code>max_length_for_sort_data</code> 的对比。排序在内存的
        <code>sort_buffer</code> 里进行；如果数据量超过 sort_buffer 装不下，就会借助磁盘临时文件做
        <strong>外部归并排序</strong>——这时才真的"落文件"，也是 filesort 慢的根源。
      </p>
      <CodeBlock lang="sql" title="用 EXPLAIN 看排序" code={explainSql} />
      <Callout variant="warn" title="面试追问">
        看到 <code>Using filesort</code> 不等于一定有性能问题，数据量小时它很快。
        真正要警惕的是"大数据量 + filesort + 还要回表"。优化方向：给排序列建合适的（联合）索引，
        让排序能直接用索引顺序消化掉。
      </Callout>

      <h2>六、再追几个高频小问</h2>
      <h3>题目：为什么说 MySQL 是"分层"架构，这样设计有什么好处</h3>
      <p>
        分层的最大价值是<strong>解耦与可插拔</strong>。Server 层处理所有引擎通用的事情——连接管理、
        SQL 解析、权限、优化器、binlog；存储引擎层只管"数据怎么存、怎么读、怎么加锁"。
        两层用统一接口对接，于是同一条 SQL 不用改，底层换 InnoDB 还是 MyISAM 都能跑。
        这也是为什么 binlog 在 Server 层（所有引擎都有），而 redo log 在 InnoDB 引擎层（只有它有）。
      </p>
      <h3>题目：连接器里的长连接和短连接怎么权衡</h3>
      <p>
        短连接每次操作都建连、断连，握手和权限校验开销大，但不占用常驻资源。长连接复用同一个连接，
        省去反复握手，性能好；代价是连接对象在执行过程中临时使用的内存只有断开时才释放，
        长时间不断会让内存涨高，甚至触发 OOM 被系统杀掉。实践上要么定期主动断开长连接，
        要么在执行较大查询后用 <code>mysql_reset_connection</code> 把连接状态复位、释放内存而不重连。
      </p>
      <h3>题目：优化器会不会"想太多"反而变慢</h3>
      <p>
        会。当一条 SQL 涉及很多张表 JOIN 时，连接顺序的排列组合是阶乘级的，优化器穷举所有顺序本身就很慢。
        MySQL 用 <code>optimizer_search_depth</code> 控制搜索深度做剪枝，超过一定复杂度就用启发式而非穷举。
        这也是"不推荐过多表 JOIN"的一个底层原因——不只是执行慢，连"选计划"这一步都可能成为负担。
      </p>
      <Callout variant="tip" title="把这章串成一句话">
        一条 SQL 的旅程，就是"Server 层决定怎么做、存储引擎负责做、Buffer Pool 决定快不快、
        filesort/优化器决定细节"。面试时能把这条主线讲顺，比背任何零散知识点都管用。
      </Callout>

      <Summary
        points={[
          '一条查询 SQL 路径：连接器→分析器→优化器→执行器→存储引擎；Server 层决策、存储引擎干活，8.0 已删查询缓存。',
          'SELECT 真实执行顺序是 FROM/JOIN→WHERE→GROUP BY→HAVING→SELECT→DISTINCT→ORDER BY→LIMIT，这解释了别名能用在 ORDER BY 却不能用在 WHERE。',
          'WHERE 过滤单行、在分组前、不能用聚合；HAVING 过滤分组、在分组后、可用聚合。',
          '优化器基于成本（IO+CPU）选计划，依赖采样的索引基数统计，可能选错，可用 ANALYZE/FORCE INDEX 纠正。',
          'Buffer Pool 是内存数据缓存，命中不读磁盘，写先改内存脏页再异步刷盘，用改良 LRU（young/old 分段）抗全表扫描污染。',
          '排序能走索引顺序最快；否则走 filesort（全字段或 rowid 两种方式），数据量大时借磁盘做外部归并，是优化重点。',
        ]}
      />
    </article>
  )
}
