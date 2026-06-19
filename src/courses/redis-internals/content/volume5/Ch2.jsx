import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const sdsStruct = `// SDS（简单动态字符串）的结构示意（以 sdshdr8 为例）
struct sdshdr8 {
    uint8_t len;      // 已用长度：O(1) 拿到字符串长度
    uint8_t alloc;    // 已分配长度（不含头和结尾的 \\0）
    unsigned char flags; // 低 3 位标识用的是 sdshdr5/8/16/32/64 哪种
    char buf[];       // 真正的数据，结尾仍补一个 \\0 以兼容 C 字符串函数
};`

const encodingCmd = `# OBJECT ENCODING 查看一个 key 的底层编码
127.0.0.1:6379> set n 10086
127.0.0.1:6379> object encoding n
"int"                       # 能转成 long 的整数用 int 编码，直接存数字

127.0.0.1:6379> set s "hi"
127.0.0.1:6379> object encoding s
"embstr"                    # 短字符串（<=44 字节）用 embstr，一次分配

127.0.0.1:6379> set big "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
127.0.0.1:6379> object encoding big
"raw"                       # 超过 44 字节用 raw，redisObject 与 SDS 分开两次分配`

const zsetCmd = `# ZSet：成员 + 分数，按分数排序
127.0.0.1:6379> zadd rank 100 alice 80 bob 95 carol
127.0.0.1:6379> zrange rank 0 -1 withscores      # 按分数升序
1) "bob"
2) "80"
3) "carol"
4) "95"
5) "alice"
6) "100"
127.0.0.1:6379> zrevrange rank 0 2               # 前三名（降序）
127.0.0.1:6379> zrangebyscore rank 90 100        # 范围查询 O(log N + M)
127.0.0.1:6379> object encoding rank
"listpack"   # 元素少且小时用 listpack；超阈值转 skiplist`

const listQueueCmd = `# 用 List 实现队列（FIFO）：一端进，另一端出
127.0.0.1:6379> lpush queue a b c        # 左进
127.0.0.1:6379> rpop queue               # 右出 -> a（先进先出）

# 用 List 实现栈（LIFO）：同一端进出
127.0.0.1:6379> lpush stack a b c        # 左进
127.0.0.1:6379> lpop stack               # 左出 -> c（后进先出）

# 阻塞版：队列空时阻塞等待，常用于简单消息队列
127.0.0.1:6379> brpop queue 5            # 最多阻塞 5 秒等元素`

const geoCmd = `# GEO 底层就是 ZSet：把经纬度用 GeoHash 编码成一个 52 位整数当 score
127.0.0.1:6379> geoadd cities 116.40 39.90 beijing 121.47 31.23 shanghai
127.0.0.1:6379> geodist cities beijing shanghai km     # 两点距离
"1067.5970"
127.0.0.1:6379> geosearch cities frommember beijing byradius 1200 km asc
1) "beijing"
2) "shanghai"
127.0.0.1:6379> object encoding cities
"listpack"   # 本质是 ZSet，编码规则同 ZSet`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章把「数据类型与底层实现」一次讲透：常见类型有哪些、String 为什么用 SDS、
        EMBSTR 阈值 44 是怎么来的、hash 与 ZSet 底层、跳表实现原理、为什么 ZSet 用跳表而不用
        红黑树或 B+树、ziplist/quicklist/listpack 各自特点、Geo 怎么实现、List 常用命令、
        如何用 List 做队列和栈、以及 String 的最大长度。
      </Lead>

      <h2>一、常见数据类型一览</h2>
      <p>对外 5 种基础类型 + 几个特殊类型，对内每种都会按数据量自动切换底层编码。</p>
      <table>
        <thead>
          <tr><th>类型</th><th>用途</th><th>可能的底层编码</th></tr>
        </thead>
        <tbody>
          <tr><td>String</td><td>缓存/计数/分布式锁</td><td>int / embstr / raw</td></tr>
          <tr><td>Hash</td><td>对象字段</td><td>listpack / hashtable</td></tr>
          <tr><td>List</td><td>队列/栈</td><td>quicklist（内部由 listpack 节点组成）</td></tr>
          <tr><td>Set</td><td>去重/交并集</td><td>intset / listpack / hashtable</td></tr>
          <tr><td>ZSet</td><td>排行榜/延时队列</td><td>listpack / skiplist + dict</td></tr>
          <tr><td>Bitmap/HLL/GEO/Stream</td><td>位运算/基数/地理/流</td><td>基于上面几种实现</td></tr>
        </tbody>
      </table>

      <h2>二、String 底层：SDS</h2>
      <KeyIdea>
        Redis 没有直接用 C 字符串，而是自己设计了 <strong>SDS（Simple Dynamic String）</strong>：
        头部记录已用长度 <code>len</code> 和已分配 <code>alloc</code>，
        让取长度变成 O(1)、二进制安全、能预分配减少重分配、且仍兼容 C 字符串。
      </KeyIdea>
      <CodeBlock lang="text" title="SDS 结构（sdshdr8 示意）" code={sdsStruct} />
      <p>相比 C 原生 <code>char[]</code>，SDS 的优势：</p>
      <ul>
        <li><strong>O(1) 取长度</strong>：C 字符串要遍历到 <code>\0</code> 才知道长度（O(N)），SDS 直接读 <code>len</code>。</li>
        <li><strong>二进制安全</strong>：靠 <code>len</code> 判断结尾，value 里可以含 <code>\0</code>，能存图片等二进制。</li>
        <li><strong>杜绝缓冲区溢出</strong>：拼接前先按 <code>alloc</code> 检查容量、不够先扩容。</li>
        <li><strong>空间预分配 + 惰性释放</strong>：扩容时多分配一些（减少重分配次数），缩短时不立刻 free。</li>
      </ul>

      <h2>三、EMBSTR 阈值 44 的由来与历史</h2>
      <p>
        String 有三种编码：能转 long 的整数用 <code>int</code>；短字符串用 <code>embstr</code>；
        长字符串用 <code>raw</code>。<strong>embstr 与 raw 的分界线是 44 字节</strong>。
      </p>
      <CodeBlock lang="bash" title="三种 String 编码" code={encodingCmd} />
      <p>
        为什么是 44？因为 <code>embstr</code> 把 <code>redisObject</code> 和 SDS
        <strong>放在一块连续内存里一次性分配</strong>，对 CPU 缓存友好、分配/释放各只要一次。
        jemalloc 分配内存以 2 的幂为档位，Redis 希望「redisObject(16字节) + SDS 头 + buf + 结尾\0」
        正好落进 <strong>64 字节</strong>这一档。算下来留给字符串内容的空间就是 44 字节。
      </p>
      <Callout variant="info" title="历史小变迁">
        这个阈值不是一直是 44。早期（3.0 之前）embstr 上限是 <strong>39 字节</strong>。
        后来 SDS 头部结构精简（引入 sdshdr5/8 等更紧凑的头），省下的字节让内容空间扩到了 44。
        面试时能点出「39 → 44」的变化会很加分。
      </Callout>

      <h2>四、Hash 底层</h2>
      <p>
        Hash 在<strong>字段少且每个字段小</strong>时用 <code>listpack</code>（连续内存、省空间），
        超过 <code>hash-max-listpack-entries</code>（默认 128）或单值超
        <code>hash-max-listpack-value</code>（默认 64 字节）就转 <code>hashtable</code>（O(1) 读写）。
        早期 listpack 的前身叫 ziplist，7.0 起用 listpack 取代。
      </p>

      <h2>五、跳表实现原理</h2>
      <p>
        跳表（skiplist）是一种<strong>多层有序链表</strong>：底层是完整的有序链表，上面随机地抽取一部分节点
        建立「高速通道」。查找时从最高层开始往右走，走过头就下降一层，像跳格子一样快速逼近目标，
        平均时间 O(log N)。
      </p>
      <ul>
        <li>每个节点的层数由<strong>随机</strong>决定（抛硬币：约 1/2 概率升一层），无需像平衡树那样旋转维护。</li>
        <li>插入/删除只改局部指针，实现简单。</li>
        <li>Redis 的跳表节点还存了 <code>backward</code> 指针和每层的 <code>span</code>（跨度），
          能高效支持 <code>ZRANK</code>（按排名定位）和反向遍历。</li>
      </ul>

      <h2>六、ZSet 实现：为何用跳表，而不是红黑树或 B+树</h2>
      <KeyIdea>
        大 ZSet 用 <strong>跳表 + 字典（dict）</strong>双结构：跳表保证按分数有序、支持范围查询；
        字典保证按成员名 O(1) 查分数。两者指向同一份数据。小 ZSet 则用 listpack。
      </KeyIdea>
      <CodeBlock lang="bash" title="ZSet 命令与编码" code={zsetCmd} />
      <table>
        <thead>
          <tr><th>对比</th><th>跳表</th><th>红黑树</th><th>B+树</th></tr>
        </thead>
        <tbody>
          <tr><td>范围查询</td><td>底层链表顺序遍历，天然高效</td><td>需中序遍历，实现复杂</td><td>叶子链表也行，但偏磁盘场景</td></tr>
          <tr><td>实现复杂度</td><td>简单，靠随机层数，无旋转</td><td>插删要旋转/变色，复杂</td><td>更复杂</td></tr>
          <tr><td>定位场景</td><td>内存有序集</td><td>内存有序集</td><td>磁盘/数据库索引</td></tr>
        </tbody>
      </table>
      <p>
        作者本人的解释可以归纳为三点：① ZSet 高频做<strong>范围查询</strong>（ZRANGE/ZRANGEBYSCORE），
        跳表底层就是有序链表，范围遍历极自然；② 跳表<strong>实现远比红黑树简单</strong>，不需要旋转和颜色维护，
        改起来不容易出错；③ B+树是为<strong>磁盘</strong>设计的（一个节点装很多 key 减少磁盘 IO），
        而 Redis 在内存里，B+树多路分叉的优势用不上，反而更重。综合内存场景，跳表性价比最高。
      </p>

      <h2>七、ziplist / quicklist / listpack</h2>
      <table>
        <thead>
          <tr><th>编码</th><th>特点</th><th>问题/演进</th></tr>
        </thead>
        <tbody>
          <tr><td>ziplist</td><td>一块连续内存紧凑存多个元素，省内存</td><td>更新可能引发<strong>连锁更新</strong>（prevlen 字段变长导致后续节点级联扩容）</td></tr>
          <tr><td>quicklist</td><td>双向链表，每个节点是一个 ziplist/listpack</td><td>解决「单 ziplist 太大更新慢」与「纯链表指针太占内存」的折中，List 的底层</td></tr>
          <tr><td>listpack</td><td>ziplist 的改良版，每个元素自带长度、<strong>不再依赖前驱长度</strong></td><td>7.0 起取代 ziplist，<strong>彻底消除连锁更新</strong></td></tr>
        </tbody>
      </table>
      <Callout variant="info" title="连锁更新是什么">
        ziplist 每个节点记录前一节点长度 <code>prevlen</code>，长度小于 254 用 1 字节、否则 5 字节。
        当某节点扩容导致后一节点的 <code>prevlen</code> 要从 1 字节变 5 字节，可能再触发它后面的节点……
        最坏 O(N²)。listpack 不再记前驱长度，从根上解决了这个问题。
      </Callout>

      <h2>八、Geo 怎么实现</h2>
      <p>
        GEO 没有独立结构，<strong>底层就是 ZSet</strong>：把经纬度通过 <strong>GeoHash</strong>
        编码成一个 52 位整数，作为 ZSet 的 score。因为 GeoHash 把二维坐标映射成一维且
        <strong>位置相近的点编码也相近</strong>，所以范围查询「附近的人」就能转化为 ZSet 的分数区间查询。
      </p>
      <CodeBlock lang="bash" title="GEO 命令" code={geoCmd} />

      <h2>九、List 常用命令、队列与栈</h2>
      <p>
        List 是双端结构，<code>LPUSH/RPUSH</code> 两端进、<code>LPOP/RPOP</code> 两端出，
        靠「进出端的组合」就能实现队列或栈。
      </p>
      <CodeBlock lang="bash" title="List 实现队列和栈" code={listQueueCmd} />
      <ul>
        <li><strong>队列（FIFO）</strong>：一端进、另一端出，如 <code>LPUSH</code> + <code>RPOP</code>。</li>
        <li><strong>栈（LIFO）</strong>：同一端进出，如 <code>LPUSH</code> + <code>LPOP</code>。</li>
        <li><strong>阻塞队列</strong>：<code>BRPOP</code>/<code>BLPOP</code> 在空时阻塞等待，可做简单消息队列。</li>
      </ul>

      <h2>十、String 类型的最大值</h2>
      <p>
        单个 String value 最大 <strong>512MB</strong>（这是 Redis 字符串的硬上限）。
        但实战里<strong>远不该存这么大</strong>：超过几十 KB 就算偏大，几 MB 以上就是「大 Key」，
        会拖慢读写、阻塞迁移、撑爆网络带宽。下一章会专门讲大 Key 的危害与治理。
      </p>

      <Example title="一句话区分编码选择">
        <p>小而少 → 连续内存的 listpack（省）；大或多 → 哈希表/跳表（快）。Redis 自动切换，
          你只要知道阈值参数在哪调即可。</p>
      </Example>

      <Summary
        points={[
          'String 底层是 SDS：O(1) 取长度、二进制安全、防溢出、预分配；编码分 int/embstr/raw。',
          'embstr 与 raw 的阈值是 44 字节，为让 redisObject+SDS 一次性落进 jemalloc 的 64 字节档；历史上从 39 改到 44。',
          'Hash/Set/ZSet 都是「小用 listpack、大转 hashtable/skiplist」，靠阈值参数切换。',
          '跳表是多层有序链表，随机层数、无旋转、O(log N)，节点带 span 支持 ZRANK 与范围查询。',
          'ZSet 大数据用跳表+字典：跳表擅长范围查询、实现比红黑树简单，B+树是为磁盘设计、内存场景不划算。',
          'ziplist 有连锁更新缺陷，quicklist 是链表套 ziplist，listpack（7.0+）改良去掉前驱长度、消除连锁更新。',
          'GEO 底层是 ZSet（GeoHash 当 score）；List 靠进出端组合做队列(FIFO)/栈(LIFO)，BRPOP 可做阻塞队列；String 最大 512MB 但勿存大 Key。',
        ]}
      />
    </article>
  )
}
