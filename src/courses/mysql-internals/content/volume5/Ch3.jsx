import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const failSql = `-- 这些写法会让索引失效（以 idx(name) 为例）
WHERE LEFT(name, 3) = 'abc'      -- 对索引列做函数/运算
WHERE name + 0 = 123             -- 隐式运算
WHERE name LIKE '%abc'           -- 左模糊（前导 %）
WHERE name != 'A'                -- 不等于，通常走全表
WHERE phone = 13800000000        -- phone 是 varchar 却传数字，隐式类型转换
-- OR 连接的列只要有一个没索引，整体可能全表扫描`

const explainSql = `EXPLAIN SELECT * FROM orders WHERE user_id = 100 AND status = 1;
/*
看四个关键列：
type : 访问类型，性能从好到差 system>const>eq_ref>ref>range>index>ALL
       ALL 是全表扫描，要警惕；range 以上算合格
key  : 实际用到的索引，NULL 表示没走索引
rows : 预估要扫描的行数，越小越好
Extra: Using index(覆盖)/Using where/Using filesort/Using temporary
*/`

const deepPageSql = `-- 慢：偏移量大，要先扫描并丢弃前 1000000 行
SELECT * FROM orders ORDER BY id LIMIT 1000000, 10;

-- 快(子查询/延迟关联)：先用覆盖索引定位主键，再回表取 10 行
SELECT * FROM orders o
JOIN (SELECT id FROM orders ORDER BY id LIMIT 1000000, 10) t
  ON o.id = t.id;

-- 更快(书签/游标记住上次最大 id，适合连续翻页)
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 10;`

export default function Ch3() {
  return (
    <article>
      <Lead>
        上一章讲清了索引"为什么快"，这一章面对真实工程问题：到底该不该建索引、建多少、为什么我建了却没用、
        以及怎么排查。我们还会讲两个高频题——Change Buffer 和深度分页优化，最后把 EXPLAIN 的读法吃透。
        这些是从"懂原理"走到"会调优"的关键一跃。
      </Lead>

      <h2>一、建索引要注意什么</h2>
      <h3>题目：建索引有哪些原则？</h3>
      <ul>
        <li><strong>选区分度高的列</strong>：区分度 = 不同值数量 / 总行数，越接近 1 越好。
          性别这种只有几个值的列单独建索引几乎没意义。</li>
        <li><strong>优先建联合索引、利用最左前缀和覆盖</strong>：一个精心设计的联合索引能顶好几个单列索引，
          还能做覆盖避免回表。</li>
        <li><strong>把高频查询、排序、分组的列纳入考虑</strong>：WHERE、ORDER BY、GROUP BY、JOIN 的列都是候选。</li>
        <li><strong>控制索引列长度</strong>：长字符串可用<strong>前缀索引</strong>
          <code>KEY(col(10))</code>，只索引前 N 个字符，省空间，但会丧失覆盖能力和排序能力。</li>
        <li><strong>选自增主键</strong>：自增能让插入总是追加在 B+Tree 末尾，避免页分裂；
          用 UUID 这种随机值做主键会导致频繁页分裂、碎片多。</li>
      </ul>

      <h2>二、索引是越多越好吗 / 什么情况不建索引</h2>
      <h3>题目：索引越多查询越快吗？</h3>
      <p>不是。索引是"空间和写入"换"读取"，过多索引有明确代价：</p>
      <table>
        <thead>
          <tr><th>代价</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>占空间</td><td>每个二级索引都是一棵 B+Tree，要额外磁盘和内存。</td></tr>
          <tr><td>拖慢写入</td><td>INSERT/UPDATE/DELETE 时每个相关索引都要同步维护，索引越多写越慢。</td></tr>
          <tr><td>干扰优化器</td><td>候选索引太多，优化器可能选错，反而变慢。</td></tr>
        </tbody>
      </table>
      <p><strong>什么情况不建索引</strong>：</p>
      <ul>
        <li>区分度极低的列（如状态、性别）；</li>
        <li>很少作为查询条件的列；</li>
        <li>频繁更新的列（每次更新都要维护索引）；</li>
        <li>数据量很小的表（全表扫描本就很快，索引反而是负担）；</li>
        <li>写多读少的表，要谨慎加索引。</li>
      </ul>
      <KeyIdea>
        索引的本质是用"写入变慢 + 占用空间"去换"查询变快"。所以判断要不要建索引，
        本质是判断这张表、这个列的<strong>读写比</strong>和<strong>查询收益</strong>是否划算。
      </KeyIdea>

      <h2>三、建了索引一定有效吗 / 怎么排查失效</h2>
      <h3>题目：我明明建了索引，为什么 SQL 还是很慢？</h3>
      <p>建了不等于走了。下面这些写法会导致索引失效：</p>
      <CodeBlock lang="sql" title="常见索引失效场景" code={failSql} />
      <ul>
        <li><strong>对索引列做函数/运算</strong>：索引存的是原值，运算后的值索引里没有，只能全表算。</li>
        <li><strong>隐式类型转换</strong>：varchar 列传数字，MySQL 会把列转成数字再比，等于对列做了函数。</li>
        <li><strong>左模糊 LIKE '%x'</strong>：前导 % 无法利用最左前缀。</li>
        <li><strong>违反最左前缀</strong>：联合索引没从最左列开始或跳列。</li>
        <li><strong>OR 两边有未建索引的列</strong>：可能退化为全表扫描。</li>
        <li><strong>优化器认为全表更快</strong>：当要扫描的行占比很大时，走索引+大量回表还不如直接全表。</li>
      </ul>
      <Callout variant="tip" title="排查三板斧">
        ① <code>EXPLAIN</code> 看 type 和 key——key 为 NULL 或 type 为 ALL 就是没走索引；
        ② 检查 SQL 写法有没有上面的失效情形；
        ③ <code>SHOW INDEX FROM t</code> 看基数是否异常、必要时 <code>ANALYZE TABLE</code> 更新统计。
      </Callout>

      <h2>四、Change Buffer</h2>
      <h3>题目：Change Buffer 是干什么的？</h3>
      <p>
        当对<strong>非唯一二级索引</strong>做写操作（INSERT/UPDATE/DELETE）时，如果对应的数据页
        <strong>不在 Buffer Pool</strong> 里，正常做法是先把页从磁盘读进来再改——这要一次随机 IO。
        Change Buffer 的优化是：先把这个"改动"记录在 Change Buffer 里<strong>不立即读页</strong>，
        等到将来某次查询真的需要读这一页时，再把缓存的改动<strong>合并（merge）</strong>进去。
      </p>
      <Callout variant="note" title="两个限制">
        ① 只对<strong>非唯一</strong>二级索引有效——唯一索引要判重，必须把页读进来确认是否冲突，没法延迟；
        ② 聚簇索引（主键）也不用，因为主键查询本就要读页。所以它特别适合"写多读少、且二级索引非唯一"的场景。
      </Callout>

      <h2>五、深度分页（LIMIT 优化）</h2>
      <h3>题目：LIMIT 1000000, 10 为什么慢，怎么优化？</h3>
      <p>
        慢的原因是：<code>LIMIT 1000000, 10</code> 要先<strong>扫描并丢弃前 100 万行</strong>，
        才取到要的 10 行。偏移量越大，白扫的行越多。如果还走二级索引，这 100 万行可能每行都回表，更是雪上加霜。
      </p>
      <CodeBlock lang="sql" title="深度分页优化" code={deepPageSql} />
      <ul>
        <li><strong>延迟关联</strong>：先用覆盖索引（只查主键）定位到那 10 个主键，再回表取整行。
          关键是"丢弃前 100 万行"这一步只在小小的索引上做，不回表。</li>
        <li><strong>书签/游标记住上次位置</strong>：用 <code>WHERE id {'>'} 上次最大 id</code> 直接跳过，
          无需偏移，效率最高，但要求连续翻页、有有序唯一键。</li>
      </ul>

      <h2>六、EXPLAIN 怎么读</h2>
      <h3>题目：EXPLAIN 你重点看哪几列？</h3>
      <CodeBlock lang="sql" title="EXPLAIN 关键列" code={explainSql} />
      <table>
        <thead>
          <tr><th>列</th><th>关注点</th></tr>
        </thead>
        <tbody>
          <tr><td>type</td><td>访问类型，<code>ALL</code> 全表要警惕；<code>range</code> 以上算合格；<code>const/eq_ref</code> 最佳。</td></tr>
          <tr><td>key</td><td>实际用的索引，NULL = 没走索引。</td></tr>
          <tr><td>rows</td><td>预估扫描行数，越小越好（估算值，仅供参考）。</td></tr>
          <tr><td>Extra</td><td><code>Using index</code>=覆盖索引（好）；<code>Using filesort</code>/<code>Using temporary</code>=要额外排序/临时表（需优化）。</td></tr>
        </tbody>
      </table>
      <Example title="一次实战判断">
        <p>
          EXPLAIN 显示 type=ALL、key=NULL、rows=200000、Extra=Using filesort，说明这条 SQL
          既没走索引、又要全表扫描、还要额外排序——典型的需要加索引的慢查询。加上覆盖
          WHERE 与 ORDER BY 列的联合索引后，type 变 range、Extra 出现 Using index，问题解决。
        </p>
      </Example>

      <h2>七、再补几个实战追问</h2>
      <h3>题目：前缀索引怎么选长度</h3>
      <p>
        对很长的字符串列（如 URL、邮箱）建完整索引太占空间，可以只索引前 N 个字符。
        关键是选一个<strong>区分度足够</strong>的长度——用
        <code>SELECT COUNT(DISTINCT LEFT(col, N)) / COUNT(*) FROM t</code> 试不同 N，
        找到区分度接近完整列的最小 N。代价是前缀索引<strong>无法做覆盖</strong>（拿不到完整值）、
        也<strong>无法用于排序</strong>，所以是"省空间"和"功能完整"之间的取舍。
      </p>
      <h3>题目：为什么有时候加了索引反而更慢</h3>
      <p>
        如果查询要返回的行占全表比例很高（比如过滤后还剩 80% 的行），走二级索引意味着先扫索引、
        再为这 80% 的行逐个回表——大量随机 IO，还不如直接顺序全表扫描。优化器会据此选全表，
        即使你建了索引。这说明索引适合"高选择性"的查询（过滤掉大部分行），低选择性场景索引帮不上忙。
      </p>
      <h3>题目：怎么发现没用上的"僵尸索引"</h3>
      <p>
        一张表上线久了往往堆了很多没人用的索引，白白拖慢写入。可以查
        <code>sys.schema_unused_indexes</code>（基于 performance_schema 的统计）找出从未被使用的索引，
        评估后删掉。定期做这种索引体检，是维护写入性能的好习惯。
      </p>
      <h3>题目：联合索引能合并代替吗，索引合并是什么</h3>
      <p>
        当一条 SQL 的 WHERE 用 <code>OR</code> 连接了两个分别有<strong>单列索引</strong>的条件时，
        MySQL 可能用<strong>索引合并（index merge）</strong>：分别走两个索引拿到主键集合，再做并集/交集。
        EXPLAIN 的 Extra 会出现 <code>Using union/intersect</code>。但索引合并通常不如一个设计良好的
        <strong>联合索引</strong>高效，看到它往往提示"这里更适合建联合索引"。
      </p>
      <h3>题目：怎么给一个慢的 ORDER BY ... LIMIT 提速</h3>
      <p>
        如果排序列没索引，会先全表扫描再 filesort，数据量大时很慢。给排序列（必要时连同 WHERE 列）
        建联合索引，让 MySQL 能<strong>沿索引顺序直接取前 N 行</strong>、边扫边停，
        既省掉 filesort 又能在拿够 LIMIT 行数后提前结束扫描，效果立竿见影。
      </p>
      <Callout variant="tip" title="实战这章的判断顺序">
        遇到慢查询，先 EXPLAIN（走没走索引）→ 查 SQL 写法（有没有触发失效）→ 看选择性（值不值得走索引）
        → 考虑分页/回表优化 → 最后才动表结构和架构。从便宜到贵，逐级排查。
      </Callout>

      <Summary
        points={[
          '建索引原则：选区分度高的列、优先联合索引利用最左前缀与覆盖、长串用前缀索引、用自增主键避免页分裂。',
          '索引不是越多越好：占空间、拖慢写入、干扰优化器；区分度低/极少查询/频繁更新/小表的列不建索引。',
          '索引失效常见原因：对列做函数运算、隐式类型转换、左模糊、违反最左前缀、OR 含无索引列、优化器选择全表。',
          'Change Buffer：把非唯一二级索引的写改动先缓存，待读取该页时再 merge，省随机 IO；唯一索引和主键不适用。',
          '深度分页慢在丢弃前大量行；用延迟关联（覆盖索引定位主键再回表）或书签法（WHERE id>上次值）优化。',
          'EXPLAIN 重点看 type（避免 ALL）、key（避免 NULL）、rows（越小越好）、Extra（追求 Using index、避免 filesort/temporary）。',
        ]}
      />
    </article>
  )
}
