import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import TreeCompare from '@/courses/mysql-internals/illustrations/TreeCompare.jsx'

const createIndexSql = `-- 一张订单表，先只有主键
CREATE TABLE orders (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    status      TINYINT     NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    created_at  DATETIME    NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 给经常用来过滤的 user_id 建一个二级索引（底层就是一棵 B+Tree）
CREATE INDEX idx_user_id ON orders (user_id);

-- 等值查询：能走索引精确定位
SELECT * FROM orders WHERE user_id = 10086;

-- 范围查询：B+Tree 的强项，定位起点后沿叶子链表顺序扫
SELECT * FROM orders WHERE user_id BETWEEN 10000 AND 10100;`

const explainSql = `-- 看等值查询：type 应为 ref，key 命中 idx_user_id
EXPLAIN SELECT * FROM orders WHERE user_id = 10086;

-- 看范围查询：type 应为 range
EXPLAIN SELECT * FROM orders WHERE user_id BETWEEN 10000 AND 10100;

-- 对比：对没建索引的列过滤，type 会退化成 ALL（全表扫描）
EXPLAIN SELECT * FROM orders WHERE amount = 99.00;`

const treeHeightSql = `-- 想知道一个索引到底有几层（树高）？8.0 可以从内部视图估算
-- 先找到索引的 index_id
SELECT name, index_id
FROM information_schema.INNODB_INDEXES
WHERE name = 'idx_user_id';

-- 也可以用 innodb_ruby 等工具直接读 .ibd 文件看 PAGE_LEVEL，
-- 根页的 level 就是“树高-1”：level=2 表示三层树（根+中间+叶子）

-- 估算扇出的经验值（主键 BIGINT、二级索引）：
--   非叶页扇出 ≈ 16KB / (索引列字节 + 主键字节 + 头部开销)
--   叶子页能放的行 ≈ 16KB / 平均行长
-- 行越宽、主键越长，扇出越小，树越容易多一层`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你写 <code>WHERE user_id = 10086</code> 时，MySQL 凭什么不用把整张表翻一遍？答案是索引。
          而几乎所有关系型数据库的索引，底层都不约而同地选了同一种数据结构：<em>B+Tree</em>。
          要真正理解索引为什么快、什么时候会失效，得先搞清楚一个问题——为什么是 B+Tree，而不是二叉树、B-Tree 或 Hash。
        </p>
      </Lead>

      <h2>真正的瓶颈是磁盘 IO</h2>
      <p>
        数据量一大，索引就放不进内存，得存在磁盘上。这里有个数量级的常识：内存访问是纳秒级，
        一次磁盘随机 IO（哪怕是 SSD）也要几十到几百微秒，比内存慢成千上万倍。所以衡量一个索引结构好不好，
        关键不是“比较了多少次”，而是<strong>一次查询要读多少次磁盘</strong>。
      </p>
      <p>
        InnoDB 把数据按<em>页</em>（page）来组织，默认一页 <strong>16KB</strong>，磁盘 IO 也以页为单位。
        树的每一层节点对应一页，从根走到叶子经过几层，就大致意味着几次 IO。结论很直接：
        <strong>我们要的是一棵尽可能“矮”的树</strong>，层数越少，IO 越少。
      </p>

      <h3>二叉搜索树和 AVL：太瘦太高</h3>
      <p>
        二叉搜索树每个节点只有两个孩子，存 N 个键，树高大约是 log₂N。即使用 AVL 树或红黑树保证平衡，
        100 万行也得二十层左右——意味着最坏二十次磁盘 IO。更糟的是每个节点只存一个键就占一次 IO，
        把 16KB 一页的空间几乎全浪费了。它适合做内存里的结构，但搬到磁盘上就是灾难。
      </p>

      <h3>B-Tree：变矮了，但非叶节点也存数据</h3>
      <p>
        <em>B-Tree</em>（注意不是 B 减 Tree，是 Balanced Tree）让一个节点有很多孩子，把一页塞满键，
        于是树一下子矮了下来。但 B-Tree 有个特点：<strong>每个节点（包括非叶节点）都存完整的行数据</strong>。
        行数据很占空间，一页能放下的键就少了，扇出（一个节点能有多少孩子）受限，树没法做到最矮。
      </p>

      <h3>B+Tree：非叶只存键，叶子串成链表</h3>
      <p>
        <em>B+Tree</em> 做了两个关键改进。第一，<strong>非叶节点只存键和指针，不存数据</strong>，
        数据全部下放到叶子节点。一页能放的键因此暴增，扇出更大，树更矮。第二，
        <strong>所有叶子节点用双向链表串起来</strong>，且按键有序。这样范围查询只要定位到起点叶子，
        顺着链表往后扫就行，不必再回到根节点重新下探。
      </p>

      <Example title="一页能放多少索引项，三层能撑多少行">
        <p>
          假设主键是 <code>BIGINT</code>（8 字节），页内指针约 6 字节，一个非叶索引项约 14 字节。
          一页 16KB ≈ 16384 字节，那么一个非叶节点大约能放 <code>16384 / 14 ≈ 1170</code> 个孩子指针。
        </p>
        <ul>
          <li>第 1 层（根）：1 个节点，约 1170 个指针。</li>
          <li>第 2 层：1170 个节点，约 1170 × 1170 ≈ 137 万个指针。</li>
          <li>第 3 层（叶子）：假设一行 1KB，一个叶子页放 16 行，那么 137 万 × 16 ≈ <strong>2200 万行</strong>。</li>
        </ul>
        <p>
          也就是说，<strong>三层 B+Tree 就能装下两千多万行</strong>，而查任意一行最多三次 IO。
          再加上根节点和上层节点常驻内存（buffer pool 缓存），实际磁盘 IO 往往只有一两次。这就是它快的根本原因。
        </p>
      </Example>

      <h3>扇出（fan-out）：决定树高的真正旋钮</h3>
      <p>
        <em>扇出</em>是指一个非叶节点能挂多少个子节点。扇出越大，同样的数据量树就越矮。
        而扇出 ≈ <code>一页能放下的「键+指针」对数</code>。这就推出几个直接结论：
      </p>
      <ul>
        <li><strong>键越短，扇出越大</strong>：所以主键、索引列都该尽量短，<code>BIGINT</code>（8 字节）就比 <code>CHAR(36)</code> 的 UUID（36 字节）能让非叶页多放好几倍的指针。</li>
        <li><strong>页越大，扇出越大</strong>：所以 <code>innodb_page_size</code> 默认 16KB 而非 4KB，但页太大又会让一次 IO 搬运过多无用数据，16KB 是个权衡点。</li>
        <li><strong>树高每加一层，承载量翻约“扇出”倍</strong>：扇出 1170 时，1→2→3 层就从约千行涨到两千万行。这就是为什么千万级表的 B+ 树通常只有 3 层。</li>
      </ul>
      <p>
        反过来，如果你的二级索引建在一个很长的字符串列上（比如 <code>VARCHAR(255)</code> 的 URL），扇出会骤降、树容易长到 4~5 层，
        每次查询多一两次 IO。这时<em>前缀索引</em>（<code>INDEX(url(20))</code>）就是常用的折中——只索引前 N 个字符，牺牲一点选择性换回扇出。
      </p>

      <TreeCompare />

      <KeyIdea title="矮，是一切的目标">
        <p>
          B+Tree 的所有设计——非叶不存数据、把键塞满一整页、提高扇出——都服务于同一个目标：
          <strong>让树尽可能矮</strong>，从而把磁盘 IO 次数压到三四次以内。理解了这一点，
          后面所有关于索引的取舍（主键为什么要短、为什么要覆盖索引）你都能自己推导出来。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="那 Hash 索引呢，不是更快吗">
        <p>
          Hash 索引等值查询确实是 O(1)，理论上比 B+Tree 还快一点，但它有两个致命短板，让它在通用场景里出局：
        </p>
        <ul>
          <li>
            <strong>不支持范围查询</strong>——哈希把键打散了，<code>WHERE age &gt; 18</code> 这种查询完全用不上。
          </li>
          <li>
            <strong>不支持排序和最左前缀</strong>——<code>ORDER BY</code>、联合索引的前缀匹配都依赖键有序，Hash 做不到。
          </li>
        </ul>
        <p>
          所以 InnoDB 的索引一律是 B+Tree（它内部有个“自适应哈希索引”是自动优化，不是你能建的索引类型）。
          Hash 索引只在 Memory 引擎等特殊场景才用得上。
        </p>
      </Callout>

      <Callout variant="note" title="为什么不用 B 树而是 B+ 树存数据库，再追问一句">
        <p>
          面试官常会顺着追问：“B 树非叶也存数据，单点查询不是可能更早命中、更快吗？”答案是：<strong>数据库的查询模式以范围扫描和有序遍历为主，不是只有单点等值</strong>。
          B 树的范围查询要在树里中序遍历、来回上下跳，IO 不连续；B+ 树数据全在叶子、叶子又用双向链表顺序串联，
          范围扫描就是“定位起点 + 顺着链表扫”，几乎是顺序 IO。再加上 B+ 树非叶不存数据、扇出更大、树更矮、整棵树更适合缓存进 Buffer Pool，
          综合下来 B+ 树全面胜出。<strong>“偶尔单点更快”换不来“范围扫描和稳定矮树”这两个数据库刚需。</strong>
        </p>
      </Callout>

      <Callout variant="note" title="高频面试追问">
        <ul>
          <li><strong>“一棵 B+ 树最多存多少数据？”</strong>——别背死数字，要会推：三层、主键 BIGINT、行 1KB 时约 2000 万行。关键是说清推导链路（扇出 × 层数 × 每叶子行数）。</li>
          <li><strong>“为什么索引列要尽量选区分度高的？”</strong>——区分度（基数 / 总行数）低（如性别）时，即使走索引也要扫出大量行再回表，优化器可能干脆放弃索引走全表扫。</li>
          <li><strong>“索引是不是越多越好？”</strong>——不是。每个二级索引都是一棵独立 B+ 树，写入时要同步维护，<code>INSERT/UPDATE/DELETE</code> 都变慢，还占空间。索引要少而精。</li>
        </ul>
      </Callout>

      <h2>这对写 SQL 意味着什么</h2>
      <p>
        理解了 B+Tree “定位快、范围扫描更快”的特性，你就会明白：等值查询（<code>=</code>）和范围查询
        （<code>BETWEEN</code>、<code>&gt;</code>、<code>&lt;</code>）都能很好地走索引；而那些破坏“键有序”前提的写法
        （对列做函数运算、前导 <code>%</code> 的 <code>LIKE</code>）就会让索引失效，退化成全表扫描。
        判断一条 SQL 有没有用上索引，最直接的工具就是 <code>EXPLAIN</code>。
      </p>

      <Practice title="用 EXPLAIN 看 type=ref 和 range">
        <p>
          先建表和索引，再用 <code>EXPLAIN</code> 观察执行计划里的 <code>type</code> 列：
          <code>ref</code> 表示走索引做等值匹配，<code>range</code> 表示走索引做范围扫描，
          <code>ALL</code> 则代表全表扫描——这是你要警惕的信号。
        </p>
        <CodeBlock lang="sql" title="schema.sql" code={createIndexSql} />
        <CodeBlock lang="sql" title="explain.sql" code={explainSql} />
        <p>
          对比有索引和没索引两条 SQL 的 <code>type</code> 和 <code>rows</code> 字段，感受一下扫描行数的数量级差异。
        </p>
        <p>
          进阶：用下面的脚本查索引的 index_id，并理解扇出与树高的估算逻辑——当你怀疑某索引“太胖、树太高”时，这是判断依据。
        </p>
        <CodeBlock lang="sql" title="tree_height.sql" code={treeHeightSql} />
      </Practice>

      <Summary
        points={[
          '索引的真正瓶颈是磁盘 IO，不是 CPU 比较次数；树每多一层就大致多一次 IO，所以目标是让树尽可能矮。',
          'InnoDB 以页为单位组织数据，默认一页 16KB，磁盘 IO 也按页进行。',
          '二叉树/AVL 太高（每节点一个键），B-Tree 因非叶也存数据而扇出受限，都不够矮。',
          'B+Tree 非叶只存键 → 扇出更大更矮；数据全在叶子且叶子用双向链表串起来 → 范围查询极快。',
          '一页 16KB 能放上千个索引项，三层 B+Tree 就能撑约两千万行，单次查询最多三四次 IO。',
          'Hash 索引等值快但不支持范围与排序，所以 InnoDB 一律用 B+Tree；用 EXPLAIN 看 type=ref/range 验证是否命中索引。',
        ]}
      />
    </>
  )
}
