import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DataStructures from '@/courses/redis-internals/illustrations/DataStructures.jsx'

const objectEncodingCmd = `# OBJECT ENCODING 直接看 key 当前用的是哪种底层编码
127.0.0.1:6379> SET n 100
OK
127.0.0.1:6379> OBJECT ENCODING n
"int"                       # 纯数字 → int 编码，直接存 long

127.0.0.1:6379> SET s "hi"
OK
127.0.0.1:6379> OBJECT ENCODING s
"embstr"                    # 短字符串(<=44字节) → embstr，一次内存分配

127.0.0.1:6379> APPEND s " there, this is a longer value..."
(integer) 35
127.0.0.1:6379> OBJECT ENCODING s
"raw"                       # 变长/变大后 → raw，SDS 单独分配`

const hashCmd = `# Hash 小的时候是 listpack（连续内存、省空间），大了切 hashtable
127.0.0.1:6379> HSET user:1 name lisi age 30 city beijing
(integer) 3
127.0.0.1:6379> OBJECT ENCODING user:1
"listpack"

# 字段数超过 hash-max-listpack-entries(默认128) 或单值超过
# hash-max-listpack-value(默认64字节)，就升级成 hashtable
127.0.0.1:6379> CONFIG GET hash-max-listpack-entries
1) "hash-max-listpack-entries"
2) "128"`

const typeCmd = `# String：计数器 / 缓存 / 分布式锁
SET lock:order:99 token EX 10 NX        # NX+EX 实现简易分布式锁
INCR page:view:home                     # 原子自增做计数

# List：消息队列 / 最新N条
LPUSH feed:1 post99                      # 头插一条新动态
LRANGE feed:1 0 9                        # 取最新10条

# Set：去重 / 共同好友
SADD tag:redis u1 u2 u3
SINTER friend:a friend:b                 # 求共同好友(集合交集)

# ZSet：排行榜
ZADD rank 90 alice 85 bob
ZREVRANGE rank 0 2 WITHSCORES            # 取分数最高的前3名`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你每天用 <code>SET</code>、<code>HSET</code>、<code>ZADD</code>，把 Redis 当成五种数据类型在用。
          但同样是 Hash，存三个字段和存三万个字段，Redis 内部用的<strong>根本不是同一套结构</strong>。
          这一章把「对外的五种类型」和「对内的底层编码」分开讲清楚——这是理解 Redis 既省内存又快的起点，
          也是面试官最爱追问的第一刀。
        </p>
      </Lead>

      <h2>类型与编码：一层皮，两套骨架</h2>
      <p>
        Redis 对外暴露 <strong>String / Hash / List / Set / ZSet</strong> 五种数据类型。但每种类型在内部都不止一种实现，
        Redis 会根据<strong>元素数量和元素大小</strong>，在两种底层编码（encoding）之间自动切换：数据小的时候用
        <em>紧凑编码</em>（连续内存、省空间但操作偏 O(N)），数据大了自动升级成<em>性能编码</em>（哈希表、跳表，操作快但更费内存）。
      </p>
      <ul>
        <li><strong>String</strong>：<code>int</code>（纯整数）→ <code>embstr</code>（短字符串，不超过 44 字节）→ <code>raw</code>（长字符串）</li>
        <li><strong>Hash</strong>：<code>listpack</code> → <code>hashtable</code></li>
        <li><strong>List</strong>：<code>listpack</code> → <code>quicklist</code>（多个 listpack 用双向链表串起来）</li>
        <li><strong>Set</strong>：<code>intset</code>（全是整数时）→ <code>listpack</code>（少量非整数）→ <code>hashtable</code></li>
        <li><strong>ZSet</strong>：<code>listpack</code> → <code>skiplist</code>（跳表 + 字典，详见第 2 章）</li>
      </ul>
      <p>
        切换是<strong>单向且自动</strong>的：一旦升级到大编码就不会再降回去。触发升级的阈值由配置控制，比如 Hash 受
        <code>hash-max-listpack-entries</code>（默认 128 个字段）和 <code>hash-max-listpack-value</code>（默认单值 64 字节）约束，
        任一超标就从 listpack 切到 hashtable。
      </p>

      <Example title="存一个用户对象：用 Hash 还是用 String？">
        <p>
          假设要缓存用户资料「name、age、city」。两种常见写法：
        </p>
        <ul>
          <li>
            <strong>String + JSON</strong>：<code>SET user:1 {'...json...'}</code>。优点是读写整体最快、序列化简单；
            缺点是改一个字段也要把整串读出来反序列化、改完再写回。
          </li>
          <li>
            <strong>Hash</strong>：<code>HSET user:1 name lisi age 30 city beijing</code>。优点是能单字段读写
            （<code>HGET user:1 age</code>），而且字段少时用 listpack 编码，<strong>比一堆独立 String key 更省内存</strong>。
          </li>
        </ul>
        <p>
          结论：字段需要<strong>独立更新</strong>、对象不大 → 用 Hash；整体读写、很少改单字段 → String + JSON 更省事。
          这正是「懂编码」带来的工程判断，而不是死记「对象就该用 Hash」。
        </p>
      </Example>

      <DataStructures />

      <h3>为什么 String 不用 C 字符串：SDS</h3>
      <p>
        Redis 的字符串底层不是 C 语言的 <code>char*</code>，而是自己设计的 <em>SDS</em>（simple dynamic string，简单动态字符串）。
        C 字符串靠结尾的空字符判断长度、求长度要从头数到尾，这对 Redis 来说有三个致命问题，SDS 都解决了：
      </p>
      <ul>
        <li>
          <strong>O(1) 取长度</strong>：SDS 头部直接记了 <code>len</code> 字段，<code>STRLEN</code> 不用遍历，而 C 字符串求长度是 O(N)。
        </li>
        <li>
          <strong>二进制安全</strong>：SDS 用 <code>len</code> 界定边界，中间可以包含任意字节（包括空字符），
          所以能存图片、protobuf 等二进制；C 字符串遇到空字符就当结束了。
        </li>
        <li>
          <strong>预分配 + 惰性释放</strong>：扩容时多分配一些空间记录余量，反复 <code>APPEND</code> 不必每次都重新分配，
          把「N 次重分配」摊薄成少数几次，避免频繁内存操作拖慢性能。
        </li>
      </ul>

      <KeyIdea title="小编码省内存，大编码保性能">
        <p>
          listpack、intset、quicklist 里的小 listpack，本质都是<strong>一块连续内存</strong>：没有指针开销、对 CPU 缓存友好，
          元素少时遍历也很快，所以小数据用它最划算。一旦数据量上来，连续内存的插入/查找退化成 O(N)，Redis 就果断切到
          hashtable / skiplist 这种 O(1)/O(log N) 的结构。<strong>用空间换时间的时机，Redis 帮你按阈值自动选好了。</strong>
        </p>
      </KeyIdea>

      <Callout variant="warn" title="面试 / 踩坑提醒">
        <ul>
          <li>
            别背 ziplist 了——Redis 7 起 Hash/List/ZSet 的紧凑编码已统一为 <strong>listpack</strong>，ziplist 是旧版本说法。
          </li>
          <li>
            编码切换<strong>只升不降</strong>：曾经塞过大量数据再删空，编码仍停在 hashtable，内存不会自动缩回 listpack。
          </li>
          <li>
            把阈值（如 <code>hash-max-listpack-entries</code>）调得过大，会让本该升级的结构长期停在 listpack，
            大对象的单次操作退化成 O(N)，反而拖慢——别为了省内存盲目调高。
          </li>
        </ul>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「Redis 有哪些数据结构」时，别只报五个类型名。高分答法是分两层：先讲<strong>对外五种类型及典型场景</strong>，
        再点出<strong>每种类型对内有两套编码、按阈值自动切换</strong>，最后举一个具体例子（比如 Hash 的 listpack 到 hashtable，
        阈值是 <code>hash-max-listpack-entries</code>）。如果还能补一句 SDS 相比 C 字符串的三点优势，基本就稳了。
      </p>

      <Practice title="亲手观察编码切换">
        <p>
          用 <code>OBJECT ENCODING</code> 这个命令，亲眼看 Redis 怎么随数据变化切换底层编码——这是把这一章「看懂」最快的方法。
        </p>
        <CodeBlock lang="bash" title="String 的三种编码" code={objectEncodingCmd} />
        <CodeBlock lang="bash" title="Hash 的编码与阈值" code={hashCmd} />
        <p>
          再练一遍五种类型最常用的命令，把「类型 ↔ 场景」对上号：
        </p>
        <CodeBlock lang="bash" title="五大类型常用命令" code={typeCmd} />
        <p>
          挑战：往一个 Hash 里 <code>HSET</code> 超过 128 个字段，再 <code>OBJECT ENCODING</code> 看看是不是从
          listpack 变成了 hashtable。
        </p>
      </Practice>

      <Summary
        points={[
          'Redis 对外是 String/Hash/List/Set/ZSet 五种类型，对内每种都有两套底层编码，按元素数量与大小自动切换。',
          '小数据用紧凑编码(listpack/intset/quicklist)省内存且缓存友好，大数据切 hashtable/skiplist 保住操作复杂度。',
          'String 编码为 int/embstr/raw；Hash 为 listpack 到 hashtable，由 hash-max-listpack-entries 等阈值控制升级。',
          '编码切换是单向的(只升不降)，阈值调得过大会让大对象停在 O(N) 编码反而变慢。',
          'String 底层是 SDS 而非 C 字符串：O(1) 取长度、二进制安全、预分配减少重分配。',
          '选型看场景：需单字段独立更新且对象不大用 Hash，整体读写用 String+JSON。',
        ]}
      />
    </>
  )
}
