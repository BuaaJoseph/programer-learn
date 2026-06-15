import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BPlusTree from '@/courses/mysql-internals/illustrations/BPlusTree.jsx'

const autoIncSql = `-- 自增主键：每次插入都追加到 B+Tree 的最右端
CREATE TABLE t_auto (
    id   BIGINT      NOT NULL AUTO_INCREMENT,
    val  VARCHAR(64) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO t_auto (val) VALUES ('a'), ('b'), ('c');
-- id 自动递增：1, 2, 3 ... 永远插在末尾，几乎不触发页分裂`

const uuidSql = `-- UUID 主键：值随机分布，插入位置不可预测
CREATE TABLE t_uuid (
    id   CHAR(36)    NOT NULL,   -- 形如 9b1deb4d-3b7d-...
    val  VARCHAR(64) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO t_uuid (id, val) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a'),
    ('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 'b'),
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'c');
-- 三个 id 大小乱序：插入要往树中间塞，频繁触发页分裂`

const explainRangeSql = `-- 自增主键表上做主键范围查询：type=range，沿叶子链表顺序扫
EXPLAIN SELECT * FROM t_auto WHERE id BETWEEN 100 AND 200;

-- 对比单点等值查询：type=const（主键唯一），一次下探到底
EXPLAIN SELECT * FROM t_auto WHERE id = 150;`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们知道了 B+Tree 长什么样、为什么矮。这一章把它“跑起来”：一次等值查询是怎么从根一路下探到叶子的？
          范围查询又是怎么省掉重复下探的？以及一个对性能影响巨大、却常被忽略的问题——
          插入和删除会让树<strong>分裂</strong>和<strong>合并</strong>，而这正是“为什么主键最好用自增”的根本原因。
        </p>
      </Lead>

      <h2>等值查询：从根二分下探到叶子</h2>
      <p>
        假设要查 <code>WHERE id = 150</code>。InnoDB 从根节点开始：根节点里存着一串有序的键和指向下层的指针，
        它在这些键里做<strong>二分查找</strong>，确定 150 落在哪两个键之间，顺着对应指针读下一层的页（一次 IO）。
        到了下一层再二分、再下探，直到抵达叶子节点。叶子里存着实际数据（或指向数据的信息），找到 150 那条记录返回。
      </p>
      <p>
        整个过程经过的层数，就是“树高”。三层的树最多读三个页——加上上层节点通常已经缓存在 buffer pool 里，
        真正落盘的 IO 往往只有一两次。<strong>树高直接决定 IO 次数</strong>，这就是上一章拼命让树变矮的回报。
      </p>

      <h3>范围查询：定位起点后顺着叶子链表扫</h3>
      <p>
        查 <code>WHERE id BETWEEN 100 AND 200</code> 时，B+Tree 先用上面那套下探流程找到 100 所在的叶子节点（起点），
        然后<strong>不再回到根节点</strong>，而是沿着叶子之间的双向链表，一个叶子页接一个叶子页地顺序读，
        直到遇到大于 200 的键为止。因为叶子本身有序又互相串联，范围扫描几乎是顺序 IO，效率极高。
        这正是上一章强调“数据全在叶子、叶子用链表串起来”的意义所在。
      </p>

      <Example title="一次范围查询的轨迹">
        <p>查 <code>id BETWEEN 100 AND 200</code>，假设是一棵三层树：</p>
        <ul>
          <li>根 → 中间层 → 叶子：三次下探，定位到 <code>id = 100</code> 所在叶子页（起点）。</li>
          <li>在该叶子页内顺序读出 100、101…直到本页读完。</li>
          <li>顺着叶子链表的“下一页”指针，跳到相邻叶子继续读，重复到出现 &gt; 200 的键。</li>
        </ul>
        <p>
          注意：下探只发生<strong>一次</strong>（找起点），后面全是叶子层的顺序扫描。这就是范围查询比“反复单点查询”快得多的原因。
        </p>
      </Example>

      <BPlusTree />

      <h2>插入与删除：页分裂和页合并</h2>
      <p>
        B+Tree 要时刻保持有序和平衡。插入一条记录时，InnoDB 先定位到它该在的叶子页，把它插进去。
        如果这个叶子页<strong>已经满了</strong>，就放不下，只能<em>页分裂</em>（page split）：申请一个新页，
        把原页里大约一半的记录搬过去，再调整上层指针。页分裂代价不小——要分配页、搬数据、改父节点，还会留下碎片。
      </p>
      <p>
        删除则相反。当一个页里的记录少到某个阈值（比如低于半页），InnoDB 可能把它和相邻页<em>合并</em>（merge），
        回收空间、保持树的紧凑。频繁的删改会让页变得稀疏，留下空洞，这就是“碎片”的来源，需要靠重建表或
        <code>OPTIMIZE TABLE</code> 来整理。
      </p>

      <KeyIdea title="为什么自增主键比随机主键好">
        <p>
          <strong>自增主键</strong>的值单调递增，新记录永远插在 B+Tree 的<strong>最右端</strong>，
          只在末页写满时才在末尾追加一个新页，几乎不触发中间的页分裂，写入是顺序的，碎片少。
        </p>
        <p>
          而 <strong>UUID 等随机主键</strong>的值大小是乱的，新记录可能要插到树的任意中间位置，
          频繁撑破已经写满的页，触发大量<strong>页分裂</strong>，写入变成随机 IO，页填充率低、碎片多、索引更大。
          这就是为什么 InnoDB 表强烈建议用自增整型主键。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="UUID 真的非用不可时">
        <p>
          有些场景（分库分表、客户端预生成 ID）确实需要全局唯一 ID。这时别用随机 UUID 直接当主键，可以考虑：
          有序的雪花算法 ID、或把时间戳放在高位的有序 UUID（如 UUIDv7），让它仍然<strong>大致递增</strong>，
          从而保留“总是插在末尾”的好处，避开页分裂的代价。
        </p>
      </Callout>

      <h2>这对排查性能问题意味着什么</h2>
      <p>
        当你看到一张用 UUID 主键的大表写入越来越慢、磁盘占用远超数据量本身，多半就是页分裂和碎片在作祟。
        理解了“树高决定读 IO、插入位置决定写代价”，你就能把建表选型、批量导入、范围查询优化这些事都串起来。
        而验证一条查询走的是单点还是范围扫描，仍然交给 <code>EXPLAIN</code>。
      </p>

      <Practice title="对比自增主键与 UUID 主键，并 EXPLAIN 范围查询">
        <p>
          建两张结构相同、只是主键类型不同的表，各插入大量数据，对比插入耗时和表文件大小；
          再对自增主键表做一个范围查询，确认 <code>type=range</code>。
        </p>
        <CodeBlock lang="sql" title="auto_increment.sql" code={autoIncSql} />
        <CodeBlock lang="sql" title="uuid.sql" code={uuidSql} />
        <CodeBlock lang="sql" title="explain_range.sql" code={explainRangeSql} />
        <p>
          把两张表各批量插入几十万行，对比 <code>information_schema.TABLES</code> 里的 <code>DATA_LENGTH</code>，
          UUID 表通常明显更大、更碎——这就是页分裂的代价被你亲眼看见了。
        </p>
      </Practice>

      <Summary
        points={[
          '等值查询从根节点开始，在每层有序键里二分查找并下探，直到叶子节点取出数据，经过的层数就是 IO 次数。',
          '范围查询只下探一次定位到起点叶子，之后沿叶子双向链表顺序扫描，效率远高于反复单点查询。',
          '树高直接决定读 IO 次数，这是上一章让树变矮的直接回报。',
          '插入若遇到满页会触发页分裂（搬一半数据、改父指针、产生碎片）；删除到阈值以下会触发页合并。',
          '自增主键总是追加在最右端，几乎不分裂、写入顺序、碎片少；随机主键（UUID）频繁页分裂，写入慢、表更大更碎。',
          '必须用全局唯一 ID 时，优先选有序方案（雪花 ID / UUIDv7），保留“总在末尾插入”的优势；用 EXPLAIN 验证范围查询命中 range。',
        ]}
      />
    </>
  )
}
