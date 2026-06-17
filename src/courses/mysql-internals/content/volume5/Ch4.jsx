import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const countSql = `-- 统计行数的几种写法
SELECT COUNT(*)    FROM t;  -- 统计所有行，含 NULL；优化器会挑最小的索引扫
SELECT COUNT(1)    FROM t;  -- 等价 count(*)，性能几乎一样
SELECT COUNT(id)   FROM t;  -- 统计 id 非 NULL 的行
SELECT COUNT(name) FROM t;  -- 统计 name 非 NULL 的行（NULL 不计）`

const joinSql = `-- 三种 JOIN
SELECT * FROM a INNER JOIN b ON a.id=b.aid;  -- 只保留两边都匹配的行
SELECT * FROM a LEFT  JOIN b ON a.id=b.aid;  -- 保留左表全部，右表无匹配补 NULL
SELECT * FROM a RIGHT JOIN b ON a.id=b.aid;  -- 保留右表全部，左表无匹配补 NULL`

const existsSql = `-- EXISTS vs IN
SELECT * FROM a WHERE a.id IN (SELECT aid FROM b);       -- 适合子查询结果集小
SELECT * FROM a WHERE EXISTS (SELECT 1 FROM b WHERE b.aid=a.id); -- 适合外表小`

export default function Ch4() {
  return (
    <article>
      <Lead>
        这一章是"细节题集中营"：数据类型怎么选、count 怎么用、JOIN 怎么分、DELETE/TRUNCATE/DROP 有何不同、
        自增到顶会怎样、一张表最多多少列……这些题单个看都不难，但答得是否精准，最能体现一个人对 MySQL 的
        熟悉程度。我们逐题给出原理和易错点。
      </Lead>

      <h2>一、字符串类型：char / varchar</h2>
      <h3>题目：char 和 varchar 区别？VARCHAR(100) 和 VARCHAR(10) 存 'ab' 占用一样吗？</h3>
      <table>
        <thead>
          <tr><th>对比</th><th>CHAR(n)</th><th>VARCHAR(n)</th></tr>
        </thead>
        <tbody>
          <tr><td>长度</td><td>定长，不足用空格补齐，取出时去掉尾部空格</td><td>变长，按实际长度存 + 1~2 字节长度前缀</td></tr>
          <tr><td>适用</td><td>长度固定的列：MD5、手机号、状态码</td><td>长度不定的列：名字、地址</td></tr>
          <tr><td>性能</td><td>定长、无需算长度，略快；但可能浪费空间</td><td>省空间，但更新可能引起行迁移</td></tr>
        </tbody>
      </table>
      <p>
        <strong>VARCHAR(100) 和 VARCHAR(10) 存 'ab' 占用一样吗？</strong>
        在<strong>磁盘存储</strong>上几乎一样——varchar 按实际长度存，'ab' 都是 2 字节 + 长度前缀。
        但括号里的数字<strong>不是没意义</strong>：它影响<strong>内存里的临时表/排序缓冲</strong>，
        因为这些场景可能按"最大长度"分配空间。所以定义时应按业务实际需要给一个合理上限，别一律开很大。
      </p>
      <Callout variant="note" title="int(11) 的 11 是什么">
        很多人以为是"能存 11 位数字"，错。int 占用固定 4 字节、范围固定，括号里的数字只是
        <strong>显示宽度</strong>，且仅在配合 <code>ZEROFILL</code> 时才用来补零，对存储范围毫无影响。
        MySQL 8.0 已废弃这个显示宽度。所以 <code>int(11)</code> 和 <code>int(4)</code> 存的数完全一样。
      </Callout>

      <h2>二、时间与大文本类型</h2>
      <h3>题目：DATETIME 和 TIMESTAMP 怎么选？TEXT 最大多大？</h3>
      <table>
        <thead>
          <tr><th>对比</th><th>DATETIME</th><th>TIMESTAMP</th></tr>
        </thead>
        <tbody>
          <tr><td>占用</td><td>8 字节</td><td>4 字节</td></tr>
          <tr><td>范围</td><td>1000~9999 年</td><td>1970~2038 年（有 2038 问题）</td></tr>
          <tr><td>时区</td><td>存什么读什么，与时区无关</td><td>存 UTC，按会话时区转换</td></tr>
        </tbody>
      </table>
      <p>
        需要跨时区、想自动随时区转换且时间在 2038 前，用 TIMESTAMP 省空间；
        要存很大或很早的时间、不想被时区影响，用 DATETIME。
        <strong>TEXT</strong> 最大约 64KB（65535 字节），更大有 MEDIUMTEXT（约 16MB）、LONGTEXT（约 4GB）。
      </p>

      <h2>三、存金额用什么类型</h2>
      <h3>题目：金额字段该用什么类型？</h3>
      <p>
        <strong>用 DECIMAL</strong>，不要用 float/double。因为 float/double 是<strong>二进制浮点</strong>，
        无法精确表示很多十进制小数，做加减会出现 0.1 + 0.2 ≠ 0.3 这类精度误差，金额场景绝不能接受。
        DECIMAL 是<strong>定点数</strong>，按十进制精确存储。例如 <code>DECIMAL(10,2)</code> 表示总共 10 位、
        小数 2 位。另一种做法是<strong>用整型存"分"</strong>（如 1099 表示 10.99 元），靠应用层换算，
        也很常见。
      </p>
      <KeyIdea>
        金额选型口诀：要精确，要么 DECIMAL，要么用 BIGINT 存最小货币单位（分）；
        永远不要用 float/double 存钱。
      </KeyIdea>

      <h2>四、count(*) / count(1) / count(字段)</h2>
      <h3>题目：count(*)、count(1)、count(字段) 有什么区别，哪个快？</h3>
      <CodeBlock lang="sql" title="几种 count" code={countSql} />
      <ul>
        <li><strong>count(*)</strong>：统计总行数（包含值为 NULL 的行）。是 SQL 标准语法，
          InnoDB 做了专门优化，会选一棵最小的索引树来扫，<strong>推荐用它</strong>。</li>
        <li><strong>count(1)</strong>：和 count(*) 几乎等价，性能差不多，不必纠结。</li>
        <li><strong>count(字段)</strong>：只统计该字段<strong>不为 NULL</strong> 的行数，
          如果字段可空且有 NULL，结果会比 count(*) 小；还要读取该字段，可能更慢。</li>
      </ul>
      <Callout variant="warn" title="为什么 InnoDB 的 count 比 MyISAM 慢">
        MyISAM 把行数直接存在表元信息里，count(*) 不带 WHERE 时 O(1) 返回；
        InnoDB 因为有 MVCC、不同事务看到的行数不同，必须<strong>实时一行行数</strong>，没法存个总数。
        想要快速近似行数可看 <code>SHOW TABLE STATUS</code> 的 rows（估算值，不精确）。
      </Callout>

      <h2>五、DELETE / TRUNCATE / DROP</h2>
      <h3>题目：清空一张表，三者怎么选？</h3>
      <table>
        <thead>
          <tr><th>命令</th><th>类型</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>DELETE</td><td>DML</td><td>逐行删、可带 WHERE、可回滚、走事务、触发器生效；不重置自增；慢。</td></tr>
          <tr><td>TRUNCATE</td><td>DDL</td><td>整表清空、不可回滚、自增<strong>重置</strong>为初始、不触发触发器；快。</td></tr>
          <tr><td>DROP</td><td>DDL</td><td>连表结构一起删除，表都不存在了；不可回滚。</td></tr>
        </tbody>
      </table>
      <p>只删数据保结构且要可回滚用 DELETE；快速清空整表用 TRUNCATE；连表一起删用 DROP。</p>

      <h2>六、三种 JOIN 与 EXISTS / IN</h2>
      <h3>题目：INNER / LEFT / RIGHT JOIN 区别？EXISTS 和 IN 怎么选？</h3>
      <CodeBlock lang="sql" title="三种 JOIN" code={joinSql} />
      <CodeBlock lang="sql" title="EXISTS vs IN" code={existsSql} />
      <p>
        <strong>EXISTS vs IN</strong> 的经验法则：<code>IN</code> 会把子查询结果集物化后逐个比对，
        适合<strong>子查询结果集小</strong>；<code>EXISTS</code> 是对外表每行去探测子查询是否有匹配，
        适合<strong>外表小、子查询大</strong>。现代优化器已能对很多场景自动改写，差距没以前那么大，
        但思路要会讲。另外 <code>NOT IN</code> 遇到子查询里有 NULL 会返回空结果，是个经典坑，
        这种场景更建议用 <code>NOT EXISTS</code>。
      </p>

      <h2>七、零散但高频的小题</h2>
      <ul>
        <li><strong>LIMIT 1000000,10 vs LIMIT 10</strong>：后者从头取 10 行极快；前者要先扫描丢弃 100 万行，
          很慢（深度分页问题，见 m5-c3 的优化）。</li>
        <li><strong>为什么不推荐多表 JOIN</strong>：JOIN 多了优化器难选最优连接顺序、容易产生大中间结果、
          难以分库分表。互联网做法常是单表查询 + 应用层组装。但这不是绝对，小数据量、有索引的 JOIN 仍然高效。</li>
        <li><strong>AUTO_INCREMENT 达到最大值会怎样</strong>：再插入会报主键冲突错误（值不再增长，停在最大值），
          所以高写入的表主键要用 <code>bigint</code> 而不是 <code>int</code>，避免几十亿就到顶。</li>
        <li><strong>一张表最多多少列</strong>：InnoDB 硬上限是 1017 列；且<strong>行长度</strong>还受
          单行不超过半页（约 8KB，不含大字段溢出部分）的限制，所以实际能放的列数还跟类型有关。
          列太多本身就是设计不良的信号。</li>
        <li><strong>常用函数</strong>：字符串 <code>CONCAT/SUBSTRING/LENGTH</code>，
          时间 <code>NOW/DATE_FORMAT/DATEDIFF</code>，聚合 <code>SUM/AVG/MAX/MIN/COUNT</code>，
          条件 <code>IFNULL/COALESCE/CASE WHEN</code>。注意：在 WHERE 的索引列上套函数会导致索引失效。</li>
      </ul>
      <Example title="自增到顶的真实影响">
        <p>
          假设订单表用 <code>int unsigned</code> 自增主键（上限约 42 亿），业务高速增长几年后到顶，
          新订单 INSERT 直接报 <code>Duplicate entry</code> 错误、下单失败。这就是为什么核心表
          一开始就该用 <code>bigint</code>——改类型要锁表、迁移，代价巨大。
        </p>
      </Example>

      <h2>八、再补几个类型与写法细节</h2>
      <h3>题目：NULL 有什么坑</h3>
      <p>
        NULL 表示"未知"，行为常反直觉：<code>NULL = NULL</code> 结果不是真而是 NULL，要用
        <code>IS NULL</code> 判断；<code>NOT IN</code> 子查询里含 NULL 会让整个结果变空；
        聚合函数 <code>COUNT(列)</code>、<code>SUM</code> 会跳过 NULL。NULL 还占用额外标记位、
        让索引和比较更复杂。所以建表时能 <code>NOT NULL</code> 就 NOT NULL，并给合理默认值。
      </p>
      <h3>题目：UNION 和 UNION ALL 区别</h3>
      <p>
        <code>UNION</code> 会对合并后的结果<strong>去重</strong>（要排序/建临时表，慢）；
        <code>UNION ALL</code> 直接拼接、<strong>不去重</strong>（快）。如果业务上确定没有重复、
        或不在乎重复，优先用 UNION ALL 省掉去重开销。
      </p>
      <h3>题目：自增主键不连续是 bug 吗</h3>
      <p>
        不是。自增值是分配后就"用掉"的，即使事务回滚、INSERT 失败，被分配的值也不会退回，
        所以出现空洞很正常。另外不同 <code>innodb_autoinc_lock_mode</code> 下批量插入的取值方式不同，
        也可能产生间隙。业务上<strong>不要依赖自增主键连续</strong>，只把它当唯一标识用。
      </p>
      <h3>题目：WHERE 1=1 这种写法有问题吗</h3>
      <p>
        <code>WHERE 1=1</code> 常出现在动态拼 SQL 时（方便后面统一拼 <code>AND ...</code>）。
        功能上没错，<strong>优化器会把恒真条件优化掉</strong>，不影响性能。但它是个代码味道——
        提示你在用字符串拼 SQL，要警惕 SQL 注入风险，应该用<strong>参数化查询/预编译</strong>，
        而不是手工拼接用户输入。
      </p>
      <h3>题目：DISTINCT 和 GROUP BY 去重哪个好</h3>
      <p>
        两者都能去重，单纯去重时 <code>DISTINCT</code> 语义更清晰；需要在分组后做聚合
        （count/sum）时用 <code>GROUP BY</code>。性能上现代优化器对二者处理接近，
        都可能用到索引或临时表。真正影响速度的是去重列上有没有合适索引，而不是用哪个关键字。
      </p>
      <Callout variant="tip" title="类型选型的总原则">
        够用最小、能 NOT NULL 就 NOT NULL、金额用 DECIMAL、时间按时区需求选 DATETIME/TIMESTAMP、
        大文本/大文件不进核心表。把这几条记牢，类型题基本都能稳答。
      </Callout>

      <Summary
        points={[
          'char 定长适合固定长度列、varchar 变长省空间；varchar(n) 的 n 影响内存临时表分配；int(11) 的 11 只是显示宽度、不影响存储。',
          'DATETIME 8字节无时区、范围大；TIMESTAMP 4字节存UTC随时区转、有2038问题；TEXT 约64KB、更大用 MEDIUM/LONGTEXT。',
          '金额用 DECIMAL 或用整型存分，绝不用 float/double（二进制浮点不精确）。',
          'count(*) 与 count(1) 等价且推荐；count(字段)只数非NULL；InnoDB 因 MVCC 必须实时数行、比 MyISAM 慢。',
          'DELETE 可回滚走事务不重置自增；TRUNCATE 快、重置自增、不可回滚；DROP 连表结构一起删。',
          'IN 适合子查询小、EXISTS 适合外表小、NOT IN 遇 NULL 有坑用 NOT EXISTS；自增到顶会报主键冲突，核心表用 bigint；InnoDB 单表上限 1017 列。',
        ]}
      />
    </article>
  )
}
