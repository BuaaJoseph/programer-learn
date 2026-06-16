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

const redisObjectCode = `# 每个 value 背后都是一个 redisObject（C 结构体的简化示意）
struct redisObject {
    unsigned type:4;        // 类型：OBJ_STRING / OBJ_HASH / OBJ_LIST ...
    unsigned encoding:4;    // 底层编码：int/embstr/raw/listpack/hashtable...
    unsigned lru:24;        // LRU 时间戳 / LFU 计数（淘汰时用，见后续章节）
    int refcount;           // 引用计数：共享对象(如 0~9999 整数)靠它复用
    void *ptr;              // 真正指向底层数据结构(SDS、dict、zskiplist...)
}

# TYPE 看对外类型，OBJECT ENCODING 看对内编码，二者是两个维度
127.0.0.1:6379> TYPE user:1
hash
127.0.0.1:6379> OBJECT ENCODING user:1
listpack
127.0.0.1:6379> OBJECT REFCOUNT n
(integer) 2147483647        # 共享整数对象，refcount 被钉成 INT_MAX`

const tuneCmd = `# 五种类型的编码切换阈值，都能在 CONFIG 里看到/调整
CONFIG GET hash-max-listpack-entries     # Hash 字段数阈值，默认128
CONFIG GET hash-max-listpack-value       # Hash 单值字节阈值，默认64
CONFIG GET list-max-listpack-size        # List 单个listpack节点上限，默认128
CONFIG GET set-max-intset-entries        # intset 元素上限，默认512
CONFIG GET set-max-listpack-entries      # Set listpack 元素上限，默认128
CONFIG GET zset-max-listpack-entries     # ZSet 元素阈值，默认128

# 临时调整（重启失效，永久要写 redis.conf）
CONFIG SET hash-max-listpack-entries 256`

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

      <h3>每个 value 都被包了一层 redisObject</h3>
      <p>
        为什么 Redis 能同时记住「对外类型」和「对内编码」？因为它没有把裸数据直接挂在 key 上，而是给每个 value 套了一层
        <code>redisObject</code> 对象头。这个结构里有 <code>type</code>（对外类型，<code>TYPE</code> 命令看的就是它）、
        <code>encoding</code>（对内编码，<code>OBJECT ENCODING</code> 看的就是它）、用于淘汰的 <code>lru</code> 时钟、
        用于共享对象的 <code>refcount</code> 引用计数，以及一个指向真实底层结构的 <code>ptr</code>。
        理解这一层，你就明白「类型」和「编码」是两个正交的维度——同一个 Hash 类型，可以是 listpack 也可以是 hashtable 编码。
      </p>
      <CodeBlock lang="text" title="redisObject 对象头与共享整数" code={redisObjectCode} />
      <p>
        一个常被追问的细节：Redis 启动时会预先创建 <code>0~9999</code> 这 1 万个整数的共享对象，
        像计数器这种存小整数的 key，<code>ptr</code> 直接指向共享对象、<code>refcount</code> 被钉成最大值，
        既省内存又免去重复分配。这也是为什么 <code>OBJECT REFCOUNT</code> 一个小整数会返回一个巨大的数字。
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
      <p>
        细节补充：SDS 在 Redis 3.2 后按字符串长度选用 <code>sdshdr5/8/16/32/64</code> 多种头部，短字符串用更小的 <code>len</code>/<code>alloc</code>
        字段（如 1 字节）省内存。预分配规则是：新长度小于 1MB 时翻倍预留，大于 1MB 时每次多留 1MB。
        embstr 编码把 redisObject 和 SDS <strong>放在一块连续内存里一次分配</strong>（只读、改动即转 raw），
        而 raw 则是两次分配、SDS 单独存——这就是 44 字节那条分界线背后的真正原因。
      </p>

      <KeyIdea title="小编码省内存，大编码保性能">
        <p>
          listpack、intset、quicklist 里的小 listpack，本质都是<strong>一块连续内存</strong>：没有指针开销、对 CPU 缓存友好，
          元素少时遍历也很快，所以小数据用它最划算。一旦数据量上来，连续内存的插入/查找退化成 O(N)，Redis 就果断切到
          hashtable / skiplist 这种 O(1)/O(log N) 的结构。<strong>用空间换时间的时机，Redis 帮你按阈值自动选好了。</strong>
        </p>
      </KeyIdea>

      <h3>listpack 凭什么取代 ziplist</h3>
      <p>
        老版本紧凑编码叫 ziplist，它的每个 entry 都记录「前一个 entry 的长度」用于反向遍历。问题在于：当某个 entry 长度跨过
        254 字节边界时，记录它长度的字段会从 1 字节涨到 5 字节，可能<strong>连锁触发后面所有 entry 重新分配</strong>——
        这就是臭名昭著的 <em>连锁更新</em>（cascade update），最坏 O(N²)。Redis 7 用 <strong>listpack</strong> 彻底重构：
        每个 entry 把自己的长度信息放在<strong>自己尾部</strong>，反向遍历靠从尾部回退解析，不再依赖「前一项长度」，
        从根上消除了连锁更新。所以现在 Hash/List/ZSet 的小编码统一是 listpack，ziplist 已成历史名词。
      </p>

      <table>
        <thead>
          <tr><th>类型</th><th>小编码</th><th>大编码</th><th>主要阈值参数</th></tr>
        </thead>
        <tbody>
          <tr><td>String</td><td>int / embstr</td><td>raw</td><td>44 字节（embstr↔raw）</td></tr>
          <tr><td>Hash</td><td>listpack</td><td>hashtable</td><td>hash-max-listpack-entries / value</td></tr>
          <tr><td>List</td><td>listpack</td><td>quicklist</td><td>list-max-listpack-size</td></tr>
          <tr><td>Set</td><td>intset / listpack</td><td>hashtable</td><td>set-max-intset-entries / set-max-listpack-entries</td></tr>
          <tr><td>ZSet</td><td>listpack</td><td>skiplist</td><td>zset-max-listpack-entries / value</td></tr>
        </tbody>
      </table>

      <Callout variant="warn" title="面试 / 踩坑提醒">
        <ul>
          <li>
            别背 ziplist 了——Redis 7 起 Hash/List/ZSet 的紧凑编码已统一为 <strong>listpack</strong>，ziplist 是旧版本说法，
            且 listpack 解决了 ziplist 的<strong>连锁更新</strong>问题。
          </li>
          <li>
            编码切换<strong>只升不降</strong>：曾经塞过大量数据再删空，编码仍停在 hashtable，内存不会自动缩回 listpack。
          </li>
          <li>
            把阈值（如 <code>hash-max-listpack-entries</code>）调得过大，会让本该升级的结构长期停在 listpack，
            大对象的单次操作退化成 O(N)，反而拖慢——别为了省内存盲目调高。
          </li>
          <li>
            <strong>Set 的 intset 也会升级</strong>：全是整数时用 intset（有序、二分查找），一旦插入非整数成员或超过
            <code>set-max-intset-entries</code>（默认 512），就转成 listpack 或 hashtable。
          </li>
        </ul>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「Redis 有哪些数据结构」时，别只报五个类型名。高分答法是分两层：先讲<strong>对外五种类型及典型场景</strong>，
        再点出<strong>每种类型对内有两套编码、按阈值自动切换</strong>，最后举一个具体例子（比如 Hash 的 listpack 到 hashtable，
        阈值是 <code>hash-max-listpack-entries</code>）。如果还能补一句 SDS 相比 C 字符串的三点优势、再点到
        <code>redisObject</code> 对象头和 listpack 取代 ziplist 的连锁更新问题，基本就稳了。
      </p>
      <p>
        常见追问与误区澄清：「embstr 和 raw 的分界是 44 字节吗？」——是的，因为 redisObject(16) + sdshdr8 头部 + 内容 + 结尾
        正好让 64 字节内存块容纳 44 字节内容。「embstr 能不能改？」——不能，embstr 是只读优化，任何修改（如 <code>APPEND</code>）都会让它转成 raw。
        「为什么不用一种万能结构？」——因为没有任何单一结构能同时做到「小数据省内存」和「大数据快操作」，分场景切换才是最优解。
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
          所有切换阈值都能在 CONFIG 里看到和调整，动手摸一遍参数能加深印象：
        </p>
        <CodeBlock lang="bash" title="编码阈值参数一览" code={tuneCmd} />
        <p>
          挑战：往一个 Hash 里 <code>HSET</code> 超过 128 个字段，再 <code>OBJECT ENCODING</code> 看看是不是从
          listpack 变成了 hashtable；再删到只剩 1 个字段，确认编码<strong>不会</strong>降回去。
        </p>
      </Practice>

      <Summary
        points={[
          'Redis 对外是 String/Hash/List/Set/ZSet 五种类型，对内每种都有两套底层编码，按元素数量与大小自动切换。',
          '每个 value 都被 redisObject 对象头包裹：type 是对外类型、encoding 是对内编码，二者是正交的两个维度。',
          '小数据用紧凑编码(listpack/intset/quicklist)省内存且缓存友好，大数据切 hashtable/skiplist 保住操作复杂度。',
          'String 编码为 int/embstr/raw(44字节分界)；Hash 为 listpack 到 hashtable，由 hash-max-listpack-entries 等阈值控制升级。',
          '编码切换是单向的(只升不降)，阈值调得过大会让大对象停在 O(N) 编码反而变慢。',
          'String 底层是 SDS 而非 C 字符串：O(1) 取长度、二进制安全、预分配减少重分配；listpack 取代 ziplist 解决了连锁更新。',
          '选型看场景：需单字段独立更新且对象不大用 Hash，整体读写用 String+JSON。',
        ]}
      />
    </>
  )
}
