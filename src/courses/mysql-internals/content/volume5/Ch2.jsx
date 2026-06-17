import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createIdxSql = `CREATE TABLE user (
  id      BIGINT       PRIMARY KEY AUTO_INCREMENT,  -- 聚簇索引
  name    VARCHAR(50),
  age     INT,
  city    VARCHAR(50),
  KEY idx_name_age_city (name, age, city)            -- 联合索引（二级索引）
);`

const leftmostSql = `-- 联合索引 (name, age, city) 的命中情况
WHERE name = 'A'                      -- 用到 name
WHERE name = 'A' AND age = 20         -- 用到 name, age
WHERE name = 'A' AND age = 20 AND city='HZ' -- 全用上
WHERE age = 20                        -- 用不上（跳过了最左列 name）
WHERE name = 'A' AND city = 'HZ'      -- 只用到 name，city 用不上（age 断了）`

const icpSql = `-- 索引下推（ICP）：联合索引 (name, age)
SELECT * FROM user WHERE name LIKE '张%' AND age = 20;
-- 无 ICP：用 name 找到一堆行，逐行回表再判断 age=20
-- 有 ICP：在索引层就顺手用 age=20 过滤，回表的行大大减少`

export default function Ch2() {
  return (
    <article>
      <Lead>
        索引是 MySQL 面试的绝对重灾区。这一章我们把"B+Tree 为什么是它、怎么查、能存多少"
        以及"聚簇/二级索引、回表、覆盖索引、最左前缀、索引下推"这一整套原理题一次讲透。
        理解了它们，你才能在下一章的"建索引实战"里知道每一条优化背后到底在省什么。
      </Lead>

      <h2>一、B+Tree 是怎么查找的</h2>
      <h3>题目：描述一次 B+Tree 索引查找的全过程</h3>
      <p>
        B+Tree 是一棵<strong>矮胖</strong>的多叉平衡树，特点是：非叶子节点只存"索引键 + 指向下层的指针"，
        <strong>不存数据</strong>；所有真正的数据都在<strong>叶子节点</strong>；叶子节点之间还用
        <strong>双向链表</strong>串起来。查找一个值的过程：
      </p>
      <ul>
        <li>从根节点开始，把要找的 key 和节点里的索引键比较，二分定位到该走哪个子指针；</li>
        <li>顺着指针下到下一层，重复比较、定位，一层层往下；</li>
        <li>最终到达叶子节点，在叶子里找到目标 key 对应的记录（或确认不存在）。</li>
      </ul>
      <p>
        每下降一层就是一次磁盘 IO（如果该页不在 Buffer Pool）。所以树有多少层，
        最多就大约多少次 IO——这就是为什么"树尽量矮"是索引结构的第一目标。
      </p>
      <KeyIdea>
        B+Tree 的两个杀手锏：① 非叶子不存数据，所以一个节点能塞下极多的索引键，扇出（分叉）极大、树极矮；
        ② 叶子用双向链表相连，所以<strong>范围查询</strong>（BETWEEN、{'>'}、ORDER BY）只要定位到起点，
        沿链表扫一段即可，不用回到根节点。
      </KeyIdea>

      <h2>二、为什么用 B+Tree，不用红黑树、B-Tree、Hash</h2>
      <h3>题目：索引为什么选 B+Tree？</h3>
      <table>
        <thead>
          <tr><th>结构</th><th>问题</th></tr>
        </thead>
        <tbody>
          <tr><td>二叉/红黑树</td><td>每个节点最多 2 个分叉，树太高。百万级数据要二三十层，意味着二三十次磁盘 IO，太慢。</td></tr>
          <tr><td>B-Tree</td><td>每个节点都存数据，单节点能放的索引键变少，树比 B+Tree 高；且范围查询要中序遍历回跳，不如叶子链表顺。</td></tr>
          <tr><td>Hash</td><td>等值查询 O(1) 很快，但<strong>不支持范围查询、不支持排序、不支持最左前缀</strong>，且有哈希冲突。</td></tr>
          <tr><td><strong>B+Tree</strong></td><td>非叶不存数据→扇出大→树矮（IO 少）；叶子链表→范围查询和排序友好。综合最优。</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="一个常被忽略的点">
        MySQL 也有 Hash 索引——InnoDB 的<strong>自适应哈希索引（AHI）</strong>是引擎根据访问热点
        <strong>自动建立</strong>的，你不能手动指定。Memory 引擎默认才是 Hash 索引。
        面试如果被问"InnoDB 支持哈希索引吗"，要答"支持但是自适应的、自动的"。
      </Callout>

      <h2>三、三层 B+Tree 能存多少数据</h2>
      <h3>题目：估算一棵三层 B+Tree 大概能存多少行</h3>
      <p>
        这是一道经典估算题，关键在于一步步推。前提：InnoDB 一页 16KB，假设主键是 bigint（8 字节），
        指针约 6 字节，所以非叶子节点里一条"键+指针"约 14 字节。
      </p>
      <ul>
        <li><strong>非叶子节点</strong>：16KB / 14B ≈ 1170 条，也就是每个非叶节点约能指向 1170 个下层节点。</li>
        <li><strong>叶子节点</strong>：存的是完整行，假设一行 1KB，那么一个叶子页能放 16KB/1KB ≈ 16 行。</li>
        <li><strong>两层（根 + 叶子）</strong>：1170 × 16 ≈ 1.87 万行。</li>
        <li><strong>三层（根 + 中间 + 叶子）</strong>：1170 × 1170 × 16 ≈ <strong>2190 万行</strong>。</li>
      </ul>
      <KeyIdea>
        结论：三层 B+Tree 大约能存两千万行级别的数据，意味着千万级表的查询通常只需要约 3 次磁盘 IO
        （而且上面两层很容易常驻 Buffer Pool，实际可能只需要 1 次 IO）。这就是 B+Tree 的威力。
      </KeyIdea>

      <h2>四、聚簇索引 vs 非聚簇索引</h2>
      <h3>题目：聚簇索引和二级索引有什么区别？</h3>
      <p>
        <strong>聚簇索引（clustered index）</strong>是指索引的叶子节点<strong>直接存放整行数据</strong>。
        在 InnoDB 里，主键索引就是聚簇索引——数据和主键索引是"长在一起"的。一张表只有一个聚簇索引。
        （如果没定义主键，InnoDB 会选一个非空唯一索引；再没有就用一个隐藏的 6 字节 row_id。）
      </p>
      <p>
        <strong>二级索引（非聚簇索引）</strong>是除主键外你建的索引，它的叶子节点<strong>存的不是整行</strong>，
        而是索引列的值 + <strong>主键值</strong>。
      </p>
      <table>
        <thead>
          <tr><th>对比</th><th>聚簇索引（主键）</th><th>二级索引</th></tr>
        </thead>
        <tbody>
          <tr><td>叶子存什么</td><td>整行数据</td><td>索引列 + 主键值</td></tr>
          <tr><td>数量</td><td>每表 1 个</td><td>可多个</td></tr>
          <tr><td>查整行</td><td>找到即得，无需回表</td><td>通常需要回表</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="为什么二级索引存主键而不是行地址">
        因为行可能移动（页分裂等），存行地址要到处更新；存主键值则只要聚簇索引内部维护即可，
        二级索引不受影响。代价是查整行要拿主键去聚簇索引再查一次——也就是"回表"。
      </Callout>

      <h2>五、回表与覆盖索引</h2>
      <h3>题目：什么是回表？怎么避免？</h3>
      <p>
        <strong>回表</strong>：走二级索引只能拿到"索引列 + 主键"，如果你 SELECT 的字段它没有，
        就得拿着主键再去聚簇索引查一次完整行。这"第二次查"就是回表，意味着多一棵树的遍历。
      </p>
      <CodeBlock lang="sql" title="建表与索引" code={createIdxSql} />
      <p>
        <strong>覆盖索引</strong>：如果一个查询需要的所有列，二级索引里都有
        （索引列本身 + 主键），那么不用回表就能直接返回——这叫"索引覆盖了查询"。
        EXPLAIN 的 Extra 里会出现 <code>Using index</code>。
      </p>
      <Example title="覆盖索引省掉回表">
        <p>
          有联合索引 <code>(name, age, city)</code>。查询
          <code>SELECT name, age FROM user WHERE name='A'</code> 只要 name、age，
          二级索引里都有，<strong>不回表</strong>；但
          <code>SELECT * FROM user WHERE name='A'</code> 要所有列，索引里没有，必须<strong>回表</strong>。
          这就是为什么"少写 SELECT *、按需取列"能直接省掉回表开销。
        </p>
      </Example>

      <h2>六、最左前缀匹配</h2>
      <h3>题目：联合索引 (a,b,c)，哪些查询能用上？</h3>
      <p>
        联合索引是按字段顺序<strong>从左到右</strong>排序的：先按 a 排，a 相同再按 b 排，b 相同再按 c 排。
        所以要用上索引，必须<strong>从最左列开始、且不能跳过</strong>。
      </p>
      <CodeBlock lang="sql" title="最左前缀命中规则" code={leftmostSql} />
      <p>
        一旦遇到<strong>范围查询</strong>（{'>'}、{'<'}、LIKE 'x%'、BETWEEN），范围列<strong>本身能用上索引，
        但它右边的列就用不上了</strong>。比如 <code>(a,b,c)</code> 查
        <code>a=1 AND b{'>'}5 AND c=3</code>，能用上 a、b，但 c 用不上（b 是范围，把 c 的有序性断了）。
      </p>
      <Callout variant="warn" title="建联合索引的顺序学问">
        把<strong>等值查询、区分度高</strong>的列放左边，<strong>范围查询</strong>的列放右边。
        这样等值列能层层精确定位，范围列放最后也不浪费右侧列。这是建索引的核心技巧。
      </Callout>

      <h2>七、索引下推（ICP）</h2>
      <h3>题目：什么是索引下推，它优化了什么？</h3>
      <p>
        索引下推（Index Condition Pushdown，5.6 引入）优化的是"回表前的过滤"。没有 ICP 时，
        存储引擎只用索引能直接定位的部分去找行，剩下的条件交给 Server 层在<strong>回表后</strong>判断；
        有了 ICP，能在<strong>索引层</strong>就把那些条件顺手判断掉，过滤后再回表，大大减少回表次数。
      </p>
      <CodeBlock lang="sql" title="索引下推示例" code={icpSql} />
      <p>
        上例联合索引 <code>(name, age)</code>，<code>name LIKE '张%'</code> 是范围、本来会"断"掉 age。
        但 age 的值就在二级索引叶子里，ICP 让引擎在回表前先用 <code>age=20</code> 过滤一遍，
        只对真正满足的行回表。EXPLAIN 的 Extra 会显示 <code>Using index condition</code>。
      </p>
      <KeyIdea>
        覆盖索引是"压根不回表"，索引下推是"回表前先在索引层过滤、减少回表次数"——
        两者都是围绕"少回表"做文章，是面试里很能体现深度的一对概念。
      </KeyIdea>

      <h2>八、几个常被追问的延伸点</h2>
      <h3>题目：自增主键和 UUID 做主键，对 B+Tree 有什么影响</h3>
      <p>
        聚簇索引的叶子是按主键<strong>有序</strong>存放的。自增主键意味着新行的主键总比已有的大，
        插入永远追加在 B+Tree 最右的叶子页，几乎不触发页分裂，页也填得满、碎片少。
        而 UUID 是随机值，新行会插到 B+Tree 中间的任意位置，频繁导致<strong>页分裂</strong>——
        一个满页要被拆成两个、数据搬移，既慢又产生碎片，还让索引变大。所以 InnoDB 强烈建议自增整型主键。
      </p>
      <h3>题目：为什么二级索引的叶子存主键值而不是物理地址</h3>
      <p>
        如果存物理地址，那么聚簇索引一旦发生页分裂、行迁移，物理地址就变了，所有二级索引都要跟着更新，
        代价巨大。改存主键值后，行怎么搬都不影响二级索引——二级索引只认主键，
        真正的定位交给聚簇索引内部维护。代价就是查整行要"回表"用主键再查一次聚簇索引。
        这是一个典型的"用一次额外查询换取维护简单"的工程取舍。
      </p>
      <h3>题目：联合索引 (a,b)，order by b 能用上索引吗</h3>
      <p>
        不能直接用。联合索引是"先按 a 排，a 相同再按 b 排"，单看 b 整体是无序的，
        所以 <code>ORDER BY b</code> 用不上它、会 filesort。但
        <code>WHERE a = 1 ORDER BY b</code> 可以——因为固定了 a，剩下的部分里 b 就是有序的。
        这正是最左前缀在排序上的体现，也是建联合索引顺序要考虑排序需求的原因。
      </p>
      <Callout variant="tip" title="索引这章的记忆主线">
        矮（B+Tree 树矮少 IO）、链（叶子链表利于范围）、聚（聚簇存整行）、回（二级索引要回表）、
        覆（覆盖不回表）、左（最左前缀）、推（索引下推减回表）。七个字，串起整章。
      </Callout>

      <Summary
        points={[
          'B+Tree 非叶不存数据→扇出大→树矮（IO 少），叶子双向链表→范围查询和排序友好；查找从根逐层二分到叶子。',
          '不用红黑树（太高）、B-Tree（节点存数据更高、范围差）、Hash（不支持范围/排序/最左前缀）；InnoDB 的哈希是自适应的。',
          '三层 B+Tree 约能存两千万行，千万级表查询约 3 次 IO（上层常驻内存，实际可能 1 次）。',
          '聚簇索引（主键）叶子存整行、每表一个；二级索引叶子存索引列+主键值，查整行要回表。',
          '回表=拿主键再查聚簇索引取整行；覆盖索引=查询所需列索引全有、不回表（Using index）。',
          '最左前缀：从最左列起、不跳过、范围列右侧列失效；ICP 在索引层提前过滤、减少回表（Using index condition）。',
        ]}
      />
    </article>
  )
}
