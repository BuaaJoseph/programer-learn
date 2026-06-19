import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const rdbConf = `# redis.conf 中的 RDB 配置
# save 触发条件：在 N 秒内有 M 次写入，就自动 bgsave
save 900 1      # 900 秒内至少 1 次写入
save 300 10     # 300 秒内至少 10 次写入
save 60 10000   # 60 秒内至少 10000 次写入

dbfilename dump.rdb       # 快照文件名
dir /var/lib/redis        # 快照保存目录
rdbcompression yes        # 对字符串做 LZF 压缩
rdb-del-sync-files no`

const rdbCmd = `# 手动触发：save 同步阻塞（生产禁用），bgsave fork 子进程后台保存
127.0.0.1:6379> bgsave
Background saving started

# 查看最后一次成功保存的时间戳
127.0.0.1:6379> lastsave
(integer) 1718500000`

const aofConf = `# 开启 AOF
appendonly yes
appendfilename "appendonly.aof"

# 刷盘策略，三选一
# appendfsync always     # 每条写命令都 fsync，最安全也最慢
appendfsync everysec     # 每秒 fsync 一次，折中（默认推荐）
# appendfsync no         # 交给操作系统决定，最快但可能丢更多

# AOF 自动重写：体积比上次重写后增长 100% 且大于 64mb 时触发
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb`

const hybridConf = `# 混合持久化（Redis 4.0+，7.0 起默认开启）
appendonly yes
aof-use-rdb-preamble yes
# 重写后的 AOF 文件 = RDB 格式的全量快照（头部） + 之后增量的 AOF 命令（尾部）`

const monitorCmd = `# 持久化健康巡检：INFO persistence 里的关键指标
127.0.0.1:6379> INFO persistence
rdb_last_bgsave_status:ok          # 上次 bgsave 成功了吗
rdb_last_save_time:1718500000      # 上次成功保存的时间
rdb_changes_since_last_save:1287   # 距上次保存又写了多少次(评估丢失风险)
aof_enabled:1
aof_last_bgrewrite_status:ok       # 上次 AOF 重写成功了吗
aof_last_write_status:ok           # 上次 AOF 写盘成功了吗
aof_rewrite_in_progress:0          # 当前是否正在重写

# 修复损坏的 AOF(如断电导致尾部命令不完整)
$ redis-check-aof --fix appendonly.aof`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          Redis 把数据放在内存里，快是快，可一断电就全没了。要让数据在重启后还能回来，就得把内存里的东西
          落到磁盘上，这就是<em>持久化</em>。Redis 给了两条路：<strong>RDB</strong> 拍一张内存的「全家福」快照，
          <strong>AOF</strong> 把每一条写命令都记成「流水账」。理解它们各自的取舍，是面试持久化话题的核心。
        </p>
      </Lead>

      <h2>RDB：某一刻的内存快照</h2>
      <p>
        <em>RDB</em>（Redis DataBase）是把<strong>某一个时间点</strong>的全部内存数据，序列化成一个紧凑的二进制
        文件（默认 dump.rdb）。可以把它想成给内存拍照：文件小、加载快，特别适合做备份和灾难恢复。
      </p>
      <p>
        触发方式有两种。<code>save</code> 会在<strong>主线程里同步</strong>地把数据写盘，期间 Redis 完全阻塞，
        无法处理任何请求，所以生产环境基本不用。<code>bgsave</code> 则会 <em>fork</em> 出一个子进程，由子进程
        负责写盘，主进程继续对外服务——这才是常用方式。配置里的 <code>save 900 1</code> 这类规则，触发的就是 bgsave。
        此外主从全量同步、<code>SHUTDOWN</code> 正常关闭时也会触发一次 RDB。
      </p>

      <h3>fork 与写时复制</h3>
      <p>
        bgsave 之所以不阻塞，靠的是操作系统的<em>写时复制</em>（copy-on-write，COW）。fork 出子进程时，父子共享同一份
        内存页，子进程照着这份「冻结视图」写盘；只有当主进程在这期间修改了某个 key，操作系统才把对应的内存页复制
        一份给主进程改。所以子进程看到的，永远是 fork 那一刻的数据。这也解释了 RDB 的最大缺点：
        <strong>两次快照之间宕机，那段时间的写入会全部丢失</strong>。
      </p>
      <Callout variant="warn" title="COW 的两个隐藏代价">
        <ul>
          <li>
            <strong>fork 本身会卡顿</strong>：fork 要复制父进程的<strong>页表</strong>，内存越大页表越大，几十 GB 的实例 fork 可能卡几百毫秒，
            这期间主线程是阻塞的。所以别在业务高峰手动 bgsave。
          </li>
          <li>
            <strong>内存可能翻倍</strong>：如果 bgsave 期间写入很猛，大量内存页被复制，最坏情况内存接近翻倍。
            生产要预留足够内存、避免在大量写入时触发，并关注 Linux 的 <code>vm.overcommit_memory=1</code> 配置以防 fork 失败。
          </li>
        </ul>
      </Callout>

      <Example title="一次断电，RDB 丢了多少数据">
        <p>
          假设配置是 “save 300 10”，10:00 完成了一次 bgsave，之后陆续写入了 200 个订单，到 10:04 机器突然断电。
          重启后 Redis 加载 dump.rdb，恢复的只是 10:00 那一刻的数据，10:00 到 10:04 的 200 个订单<strong>全部消失</strong>。
        </p>
        <p>
          如果这是缓存，问题不大（回源重建即可）；如果当成了唯一存储，那就是事故。这正是 RDB 适合「能容忍丢一点」
          场景、不适合「一条都不能丢」场景的原因。
        </p>
      </Example>

      <Practice title="动手配置并触发 RDB">
        <CodeBlock lang="ini" title="redis.conf（RDB 部分）" code={rdbConf} />
        <CodeBlock lang="text" title="手动触发与查看" code={rdbCmd} />
      </Practice>

      <h2>AOF：记录写命令的流水账</h2>
      <p>
        <em>AOF</em>（Append Only File）换了个思路：不存数据本身，而是把<strong>每一条修改数据的写命令</strong>
        （如 set、lpush）按执行顺序追加到日志文件里。重启时，Redis 把这些命令<strong>重新执行一遍</strong>，
        数据就回来了。因为记录得更细，AOF 通常比 RDB 丢得更少。注意 AOF 只记<strong>写命令</strong>，且会把
        部分命令改写成确定性形式（如把 <code>EXPIRE</code> 改成绝对时间戳的 <code>PEXPIREAT</code>），保证重放结果一致。
      </p>

      <h3>三种刷盘策略 appendfsync</h3>
      <p>
        写命令先进操作系统的缓冲区（aof_buf 再到 page cache），什么时候真正 <code>fsync</code> 到磁盘，由 <code>appendfsync</code> 决定，
        这是 AOF「安全 vs 性能」的核心旋钮：
      </p>
      <ul>
        <li><strong>always</strong>：每条命令都 fsync，最多丢一条，但每次写都要等磁盘，最慢。</li>
        <li><strong>everysec</strong>：每秒 fsync 一次，宕机最多丢 1 秒数据，性能与安全的折中，<strong>默认推荐</strong>。</li>
        <li><strong>no</strong>：从不主动 fsync，交给操作系统（一般 30 秒），最快但宕机可能丢几十秒。</li>
      </ul>
      <table>
        <thead>
          <tr><th>策略</th><th>最多丢失</th><th>性能</th></tr>
        </thead>
        <tbody>
          <tr><td>always</td><td>≈ 一条命令</td><td>最慢</td></tr>
          <tr><td>everysec</td><td>≈ 1 秒数据</td><td>折中(默认)</td></tr>
          <tr><td>no</td><td>≈ 30 秒数据</td><td>最快</td></tr>
        </tbody>
      </table>

      <h3>AOF 重写：给流水账瘦身</h3>
      <p>
        流水账会越记越长：对同一个 key <code>incr</code> 一百次，AOF 里就有一百条命令。<em>AOF 重写</em>
        （<code>bgrewriteaof</code>）会 fork 子进程，<strong>直接读当前内存的最终状态</strong>，生成一份能得到相同
        数据的最短命令集——上面那一百条会被压成一条 <code>set key 100</code>。重写期间的新写命令会先进
        「AOF 重写缓冲区」，重写完成后再追加，保证数据不丢。Redis 7 起 AOF 改成 <strong>multi-part</strong> 结构
        （一个 base 文件 + 若干 incr 文件 + 一个 manifest 清单），重写更高效、不再需要把整份 AOF 复制一遍。
      </p>

      <Callout variant="warn" title="面试常见陷阱">
        <ul>
          <li>
            <strong>「AOF 比 RDB 一定更安全」要看策略</strong>：只有 always/everysec 才安全，配成 no 时丢的数据可能比 RDB 还多。
          </li>
          <li>
            <strong>bgsave 和 bgrewriteaof 都会 fork</strong>：大内存实例 fork 时复制页表本身就耗时，可能导致主线程短暂卡顿，别在高峰期手动触发；两者也不应同时进行。
          </li>
          <li>
            <strong>RDB 文件不能直接编辑</strong>：它是二进制的；AOF 是文本命令，可读、出错时甚至能用 <code>redis-check-aof --fix</code> 修复尾部不完整的命令。
          </li>
          <li>
            <strong>恢复优先级</strong>：同时开启 RDB 和 AOF 时，重启<strong>优先用 AOF 恢复</strong>，因为它通常更完整、丢得更少。
          </li>
        </ul>
      </Callout>

      <h2>混合持久化：两者的好处都要</h2>
      <p>
        Redis 4.0 起支持<em>混合持久化</em>（<code>aof-use-rdb-preamble</code>，7.0 起默认开）。它在 AOF 重写时，
        把文件头部写成<strong>紧凑的 RDB 格式全量快照</strong>，尾部接上重写之后产生的<strong>增量 AOF 命令</strong>。
        重启加载时，先用 RDB 头快速恢复大部分数据，再回放尾部少量命令——既有 RDB 加载快的优点，又保留了 AOF 丢得少的优点。
      </p>
      <CodeBlock lang="ini" title="redis.conf（混合持久化）" code={hybridConf} />

      <KeyIdea title="如何选型">
        <p>
          纯<strong>缓存</strong>、能接受丢一点、追求恢复速度：用 RDB 就够了。对<strong>数据安全</strong>有要求、
          不能丢太多：开 AOF（everysec）。绝大多数生产场景的最优解是<strong>同时开启 RDB 和 AOF 并启用混合持久化</strong>——
          重启时 Redis 会优先用 AOF 恢复（因为它更完整）。记住一句话：RDB 管「备份与快速恢复」，AOF 管「尽量少丢」，混合持久化把两者合一。
        </p>
      </KeyIdea>

      <h3>面试怎么答</h3>
      <p>
        被问「RDB 和 AOF 怎么选」，别背概念，按「丢失容忍度 + 恢复速度 + 文件体积」三个维度展开：
        RDB 体积小、恢复快，但两次快照间会丢数据；AOF 丢得少（取决于 appendfsync），但文件大、恢复慢、需要重写来控制体积；
        生产上一般两者都开 + 混合持久化，重启优先用 AOF。再补一句 fork 与写时复制（及其 fork 卡顿、内存翻倍的代价），基本就满分了。
        误区澄清：AOF 不是「实时落盘」（everysec 仍会丢 1 秒）；RDB 也不是「定时」而是「按写入次数规则」触发。
      </p>

      <Practice title="配置 AOF 与混合持久化">
        <p>开启 AOF，选择 everysec 策略，并配置自动重写阈值；最后启用混合持久化。</p>
        <CodeBlock lang="ini" title="redis.conf（AOF 部分）" code={aofConf} />
        <p>改完后用 “redis-cli config get appendonly” 和 “redis-cli config get appendfsync” 确认生效，再手动 “bgrewriteaof” 观察重写后文件体积的变化。</p>
        <p>日常运维要会看持久化健康指标，并掌握 AOF 修复：</p>
        <CodeBlock lang="text" title="INFO persistence / redis-check-aof" code={monitorCmd} />
      </Practice>

      <Summary
        points={[
          'RDB 是某一刻内存的二进制快照，文件小、恢复快；save 会阻塞主线程，生产用 bgsave（fork 子进程 + 写时复制）。',
          'fork 有隐藏代价：复制页表导致短暂卡顿、写入猛时 COW 可能让内存接近翻倍，要预留内存、避开高峰。',
          'RDB 的缺点是两次快照之间宕机会丢数据，适合缓存和备份，不适合「一条都不能丢」的场景。',
          'AOF 记录每条写命令，靠 appendfsync 三种策略（always/everysec/no）在安全与性能间取舍，默认推荐 everysec。',
          'AOF 文件会膨胀，用 bgrewriteaof 读取内存最终状态生成最短命令集压缩体积；Redis 7 改为 multi-part 结构。',
          '混合持久化（aof-use-rdb-preamble）让 AOF 头部是 RDB 全量、尾部是增量命令，兼顾恢复快与少丢。',
          '选型口诀：纯缓存用 RDB，要安全用 AOF，生产最优是两者都开 + 混合持久化，重启优先用 AOF 恢复。',
        ]}
      />
    </>
  )
}
