import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ClusteredIndex from '@/courses/mysql-internals/illustrations/ClusteredIndex.jsx'

const schemaSql = `CREATE TABLE users (
    id     BIGINT      NOT NULL AUTO_INCREMENT,  -- 聚簇索引的键
    name   VARCHAR(64) NOT NULL,
    email  VARCHAR(128) NOT NULL,
    age    TINYINT     NOT NULL,
    PRIMARY KEY (id),                            -- 聚簇索引：整行数据存在这棵 B+Tree 的叶子里
    KEY idx_name (name)                          -- 二级索引：叶子只存 name + id
) ENGINE=InnoDB;`

const backToTableSql = `-- 走二级索引 idx_name 找到主键，再回聚簇索引取整行 → 回表
EXPLAIN SELECT * FROM users WHERE name = '张三';
-- 关注 Extra：没有 Using index，就说明发生了回表

-- 只取索引里已有的列（name 本身 + 主键 id），无需回表
EXPLAIN SELECT id FROM users WHERE name = '张三';
-- Extra 会出现 Using index（覆盖索引，下一章详细讲）`

const mrrSql = `-- 当回表行数很多时，MRR（Multi-Range Read）能把“随机回表”优化成“近似顺序回表”
SHOW VARIABLES LIKE 'optimizer_switch';   -- 看 mrr=on / mrr_cost_based=on

-- 命中 MRR 时 EXPLAIN 的 Extra 会出现 Using MRR
EXPLAIN SELECT * FROM users WHERE name BETWEEN '张三' AND '李四';
-- 原理：先把二级索引扫到的主键收集、排序，再按主键有序去聚簇索引回表，
-- 把杂乱的随机 IO 变成大致顺序的 IO，减少 Buffer Pool 抖动`

const deepPageSql = `-- 深分页之痛：OFFSET 越大，回表浪费越多（前 100000 行全要回表后丢弃）
SELECT * FROM users ORDER BY name LIMIT 100000, 20;   -- 慢

-- 优化一：延迟回表（先用覆盖索引拿到主键，再 JOIN 回表只取这 20 行）
SELECT u.* FROM users u
JOIN (
  SELECT id FROM users ORDER BY name LIMIT 100000, 20
) t ON u.id = t.id;

-- 优化二：游标式分页（记住上一页最后一个 name，彻底干掉 OFFSET）
SELECT * FROM users WHERE name > ? ORDER BY name LIMIT 20;`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          很多人对“索引”的想象停留在“一本字典的目录”，但 InnoDB 的故事更微妙：主键索引和普通索引在底层
          长得不一样，存的东西也不一样。理解这两者的区别，以及一个叫<em>回表</em>的隐藏开销，
          是你写出高效查询、读懂执行计划的关键。这一章就把<strong>聚簇索引</strong>和<strong>二级索引</strong>讲透。
        </p>
      </Lead>

      <h2>聚簇索引：主键就是数据</h2>
      <p>
        InnoDB 有一个反直觉的设计：<em>聚簇索引</em>（clustered index）的叶子节点里，
        存的<strong>不是指向数据的指针，而是整行数据本身</strong>。也就是说，主键的 B+Tree 就是表数据本身，
        数据按主键顺序物理排列。一张 InnoDB 表<strong>有且只有一个聚簇索引</strong>，默认就是主键。
      </p>
      <p>
        这解释了上一章为什么主键选型那么重要——主键的 B+Tree 不只是个目录，它<strong>承载了全部行数据</strong>。
        用主键查询 <code>WHERE id = 150</code> 时，下探到叶子的那一刻整行数据就在手里了，一步到位，不需要再跳。
      </p>

      <h3>二级索引：叶子只存“索引列 + 主键”</h3>
      <p>
        你额外建的索引叫<em>二级索引</em>（secondary index，也叫辅助索引）。它的叶子节点里
        <strong>不存整行数据</strong>，只存两样东西：<strong>索引列的值</strong>和<strong>对应行的主键值</strong>。
        比如 <code>KEY idx_name (name)</code> 的叶子里，存的是 <code>(name, id)</code>。
      </p>

      <h3>回表：从二级索引绕回聚簇索引</h3>
      <p>
        那么 <code>SELECT * FROM users WHERE name = '张三'</code> 是怎么走的？InnoDB 先在 <code>idx_name</code> 这棵
        二级索引的 B+Tree 里查到 “张三”，拿到它的主键 <code>id</code>；但二级索引里没有 <code>email</code>、<code>age</code> 这些列，
        于是它<strong>拿着这个主键，再去聚簇索引里查一次</strong>，把整行捞出来。这个“再查一次主键索引”的动作，就叫
        <em>回表</em>（也叫 lookup）。一次查询走了两棵 B+Tree。
      </p>

      <Example title="一次回表查询的两段路">
        <p><code>SELECT email FROM users WHERE name = '张三'</code> 的执行轨迹：</p>
        <ul>
          <li>第一段：在二级索引 <code>idx_name</code> 上下探，找到 <code>('张三', id=42)</code>，拿到主键 42。</li>
          <li>第二段（回表）：拿着主键 42 到聚簇索引上再下探一次，找到整行，取出 <code>email</code>。</li>
        </ul>
        <p>
          如果命中很多行（比如几千个“张三”），每一行都要回表一次——几千次随机 IO，代价就很可观了。
          下一章的覆盖索引，正是为了消灭这种回表。
        </p>
      </Example>

      <h3>回表的代价到底有多大：随机 IO 的诅咒</h3>
      <p>
        回表慢，慢在它是<strong>随机 IO</strong>。二级索引上扫到的主键值是按二级索引的列排序的，但这些主键在聚簇索引里的物理位置却是乱的，
        于是每回一次表，就要去聚簇索引的一个“随机位置”下探。命中 100 行就是 100 次可能未命中 Buffer Pool 的随机读盘。
        这就是为什么<strong>优化器在估算到“回表行数太多”时，宁愿放弃二级索引、直接全表扫描</strong>——全表扫是顺序 IO，
        当回表占比超过某个阈值（经验上约 20%~30%），顺序全扫反而更快。这条规律解释了大量“我建了索引但优化器不走”的困惑。
      </p>
      <p>
        InnoDB 对这种“扫一批二级索引、回一批表”的场景有个优化叫 <em>MRR</em>（Multi-Range Read）：
        先把二级索引扫出来的主键<strong>攒起来排序</strong>，再按主键顺序去聚簇索引回表，把随机 IO 拉成近似顺序 IO。
        命中时 <code>EXPLAIN</code> 的 Extra 会显示 <code>Using MRR</code>。
      </p>
      <CodeBlock lang="sql" title="mrr.sql" code={mrrSql} />

      <ClusteredIndex />

      <KeyIdea title="二级索引指向的是主键，不是物理地址">
        <p>
          很多数据库的二级索引叶子存的是“行的物理地址”，但 InnoDB 存的是<strong>主键值</strong>。
          好处是行在聚簇索引里因页分裂而移动时，二级索引<strong>不用跟着改</strong>；
          代价是每次通过二级索引取完整行都得回表，而且<strong>每个二级索引都要额外存一份主键</strong>。
          这两点直接推导出后面那条重要结论：主键要短。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="没有显式主键时，InnoDB 会怎么办">
        <p>
          聚簇索引必须有一个键。如果你建表时<strong>没指定主键</strong>，InnoDB 会按下面的顺序自己挑一个：
        </p>
        <ul>
          <li>选第一个<strong>所有列都 NOT NULL 的唯一索引</strong>（UNIQUE KEY）当聚簇索引的键。</li>
          <li>如果连这样的唯一索引都没有，InnoDB 会<strong>自动生成一个 6 字节的隐藏列 rowid</strong> 作为聚簇索引键。</li>
        </ul>
        <p>
          这个隐藏 rowid 是全库共享的自增值，你无法访问也无法控制，还白白占空间。所以——<strong>永远显式建主键</strong>。
        </p>
      </Callout>

      <h2>为什么主键要短：每个二级索引都背着它</h2>
      <p>
        既然每个二级索引的叶子都要存一份主键值，主键越长，<strong>每一个</strong>二级索引就越胖：占更多磁盘、
        每页能放的索引项更少、树更高、IO 更多、buffer pool 缓存命中率更低。一张表如果有五个二级索引、主键是 36 字节的
        UUID，那这 36 字节就在五棵树里各存了一遍。<strong>用短小的自增整型主键</strong>，
        既减少页分裂（上一章），又让所有二级索引都更紧凑，是一举多得的最佳实践。
      </p>

      <Example title="深分页：回表代价的放大器">
        <p>
          <code>SELECT * FROM users ORDER BY name LIMIT 100000, 20</code> 为什么慢得离谱？因为 InnoDB 要沿
          <code>idx_name</code> 扫描并<strong>回表前 100020 行</strong>，然后把前 100000 行直接丢弃，只留最后 20 行。
          那 10 万次回表全是白干的随机 IO。
        </p>
        <ul>
          <li><strong>延迟回表</strong>：先在覆盖索引里只取主键、走 LIMIT，把 10 万次回表压缩成 20 次。</li>
          <li><strong>游标分页</strong>：记住上一页最后的 name 值，用 <code>WHERE name {'>'} ?</code> 接着翻，彻底消灭 OFFSET 的扫描浪费。</li>
        </ul>
        <CodeBlock lang="sql" title="deep_page.sql" code={deepPageSql} />
      </Example>

      <Callout variant="note" title="高频面试追问">
        <ul>
          <li><strong>“为什么 InnoDB 二级索引存主键而不是物理地址？”</strong>——因为聚簇索引会因页分裂移动行的物理位置，存物理地址就得全部跟着改；存主键则行怎么动都不影响二级索引。代价是回表和每个二级索引多存一份主键。</li>
          <li><strong>“一张表能有几个聚簇索引？”</strong>——只能有一个，因为它就是数据本身的物理排列，数据不能同时按两种顺序物理存放。</li>
          <li><strong>“回表一定慢吗，怎么消除？”</strong>——回表多了才慢。消除手段是覆盖索引（下一章），把查询需要的列都纳入二级索引，免去回聚簇索引。</li>
        </ul>
      </Callout>

      <Practice title="用 EXPLAIN 观察回表（Extra 无 Using index）">
        <p>
          建一张带二级索引的表，分别查“需要回表的列”和“索引里已有的列”，对比 <code>EXPLAIN</code> 的
          <code>Extra</code> 字段：出现 <code>Using index</code> 表示走了覆盖索引、<strong>没有回表</strong>；
          反之就是发生了回表。
        </p>
        <CodeBlock lang="sql" title="schema.sql" code={schemaSql} />
        <CodeBlock lang="sql" title="back_to_table.sql" code={backToTableSql} />
        <p>
          把两条 <code>EXPLAIN</code> 的 <code>Extra</code> 列贴在一起对比，你就能一眼分辨哪条查询多走了一趟聚簇索引。
        </p>
      </Practice>

      <Summary
        points={[
          'InnoDB 的聚簇索引（clustered index）叶子里存的是整行数据，主键的 B+Tree 就是表本身，一张表只有一个。',
          '二级索引（secondary index）叶子只存“索引列 + 主键值”，不含其他列。',
          '通过二级索引查完整行时，要拿主键回聚簇索引再查一次，这就是回表；命中多行就回表多次。',
          '二级索引指向主键而非物理地址，行移动时无需更新二级索引，但代价是回表和每个二级索引都额外存一份主键。',
          '没有显式主键时，InnoDB 选第一个全 NOT NULL 的唯一索引，否则生成 6 字节隐藏 rowid——所以应永远显式建主键。',
          '主键要短：它被每个二级索引各存一份，越长则所有二级索引越胖、越高、越费 IO；用 EXPLAIN 看 Extra 是否有 Using index 判断是否回表。',
        ]}
      />
    </>
  )
}
