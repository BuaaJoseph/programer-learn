import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Replication from '@/courses/redis-internals/illustrations/Replication.jsx'

const replicaofCmd = `# 让本节点成为某个主库的从库（5.0+ 用 replicaof，旧版用 slaveof）
127.0.0.1:6380> replicaof 127.0.0.1 6379
OK

# 取消复制，从库升级为独立主库（不删除已有数据）
127.0.0.1:6380> replicaof no one
OK`

const replicaConf = `# redis.conf 中配置从库
replicaof 127.0.0.1 6379       # 启动即作为 6379 的从库
replica-read-only yes          # 从库只读，防止误写造成主从不一致
repl-backlog-size 1mb          # 复制积压缓冲区大小，影响断线续传成功率
repl-diskless-sync no          # 全量同步是否走无盘传输
min-replicas-to-write 1        # 至少有 N 个从库连着，主库才接受写(防数据丢失)
min-replicas-max-lag 10        # 且这些从库延迟不超过 N 秒`

const infoRepl = `127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:2
slave0:ip=127.0.0.1,port=6380,state=online,offset=8866,lag=0
slave1:ip=127.0.0.1,port=6381,state=online,offset=8866,lag=1
master_repl_offset:8866        # 主库已写入的复制偏移量
# 主从 offset 差得越多，说明这台从库延迟越大`

const psyncCmd = `# psync 的两种结果：FULLRESYNC(全量) vs CONTINUE(部分重同步)
# 从库重连时发：PSYNC <replid> <offset>
#   replid = 主库的复制 ID(40位16进制)，标识「同一段复制历史」
#   offset = 从库已复制到的偏移量

# 情况一：首次或 replid 对不上 → 全量
+FULLRESYNC 8d6e...replid 0     # 主库回复新的 replid 和起始 offset

# 情况二：replid 匹配且缺失命令还在 backlog 里 → 部分重同步
+CONTINUE                       # 主库只补发 backlog 中缺失的那一段命令

# 主从切换会用到两个 replid(replid + replid2)，减少切换后的全量同步`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          一台 Redis 扛不住所有流量，也经不起单点故障。<em>主从复制</em>（replication）是高可用的地基：让一台
          <strong>主库</strong>（master）负责写，把数据同步给若干<strong>从库</strong>（replica），从库负责读。
          这样既能<strong>读写分离</strong>分摊压力，又有<strong>数据冗余</strong>——主库挂了，从库手里还有一份。
        </p>
      </Lead>

      <h2>主写从读：复制的基本盘</h2>
      <p>
        主从复制的规则很简单：所有写操作只发给主库，主库把数据变更同步给所有从库；读操作可以分散到任意从库。
        从库默认是<strong>只读</strong>的（<code>replica-read-only yes</code>），防止有人误写从库导致主从数据不一致。
      </p>
      <p>
        建立复制关系只需一条命令：在从库上执行 <code>replicaof 主库IP 主库端口</code>。之后从库会主动连上主库，
        先做一次<strong>全量同步</strong>把存量数据搬过来，再持续接收主库的写命令做<strong>增量同步</strong>。
      </p>

      <Replication />

      <h2>全量同步：第一次握手搬家</h2>
      <p>
        从库第一次连上主库（或断线太久无法续传）时，触发<em>全量同步</em>，流程是：
      </p>
      <ul>
        <li>从库发送 <code>psync ? -1</code>，请求同步。</li>
        <li>主库回复 <code>+FULLRESYNC</code>，带上自己的<strong>复制 ID（replid）</strong>和当前 offset。</li>
        <li>主库执行 <code>bgsave</code> fork 子进程生成一份 <strong>RDB 快照</strong>，发给从库。</li>
        <li>生成 RDB <strong>期间到达的新写命令</strong>，主库先暂存到<em>复制缓冲区</em>（replication buffer）。</li>
        <li>从库清空自己的旧数据、加载 RDB，再回放复制缓冲区里那批命令，于是和主库对齐。</li>
      </ul>
      <p>
        全量同步默认走「磁盘」：主库把 RDB 先写盘再发。磁盘慢或多个从库同时全量时，可开 <code>repl-diskless-sync yes</code>
        走<strong>无盘传输</strong>——子进程直接把 RDB 通过 socket 流给从库，省掉落盘这一步，适合磁盘慢但网络好的环境。
      </p>

      <h2>增量同步：日常的命令流</h2>
      <p>
        对齐之后进入<em>增量同步</em>：主库每执行一条写命令，就顺手把它<strong>异步</strong>转发给从库（叫命令传播）。
        因为是异步的，所以主从之间天然存在毫秒级的延迟——这也是 Redis 复制是<strong>最终一致</strong>而非强一致的根源。
        主库<strong>不会等从库确认</strong>才回复客户端，这保证了写性能，但也意味着主库刚回复成功、还没传给从库就宕机的话，这条写可能丢。
      </p>

      <h3>断线重连：repl_backlog 续传</h3>
      <p>
        网络抖动让从库掉线后，并不一定要重新全量同步。主库维护着一个固定大小的<strong>环形缓冲区</strong>
        <em>repl_backlog</em>，里面缓存着最近传播过的命令。主从各自记着一个<em>复制偏移量</em>（offset）。
        从库重连时把自己的 offset 和主库的 replid 报给主库（<code>psync replid offset</code>）：如果 replid 对得上、
        且缺失的那段命令<strong>还在 backlog 里</strong>，主库回 <code>+CONTINUE</code>，只补发这一小段（<strong>部分重同步</strong>）；
        如果掉线太久、缺失命令已被环形覆盖，或 replid 对不上，才回 <code>+FULLRESYNC</code> 退化为全量同步。
      </p>
      <CodeBlock lang="text" title="psync：FULLRESYNC vs CONTINUE" code={psyncCmd} />

      <Callout variant="warn" title="repl-backlog-size 的坑">
        <p>
          backlog 默认只有 1mb。如果从库经常断线又恰逢写入高峰，缺失命令很容易超出 1mb 被覆盖，于是<strong>频繁触发全量同步</strong>，
          主库不断 bgsave + 传大 RDB，CPU 和网络被打爆，甚至形成「全量同步风暴」。网络不稳或写入量大的集群，应把
          <code>repl-backlog-size</code> 调大（如 64mb）。经验估算：backlog 要 ≥ 写入速率 × 最长断线时间。
        </p>
      </Callout>

      <Example title="读多写少的商品库">
        <p>
          电商商品详情页，读请求是写请求的几十倍。架构上让<strong>一主多从</strong>：主库只处理「上架、改价、改库存」这类写，
          把读详情、读价格的请求用客户端或代理分散到 3 台从库。这样主库压力骤降，整体 QPS 翻几倍。
        </p>
        <p>
          但要注意：刚改完价的瞬间，从库可能还没同步到，用户读到的是旧价（主从延迟）。对这种<strong>读自己刚写的</strong>
          强一致场景（比如改完价立刻回显），就要把这次读打到主库，或加一层短期缓存兜底——这就是「读写分离」的经典坑。
        </p>
      </Example>

      <h3>用 min-replicas 防止「裸奔写」</h3>
      <p>
        默认主库就算一个从库都没连着也照样接受写，万一此时宕机数据就丢了。用 <code>min-replicas-to-write</code> +
        <code>min-replicas-max-lag</code> 可以要求：必须有至少 N 个从库、且延迟在 M 秒内，主库才接受写，否则<strong>直接拒绝写</strong>。
        这是用「可用性换数据安全」的开关，对不能丢数据的场景很有用。注意它只是降低丢失概率，不能做到绝对零丢失（复制仍是异步的）。
      </p>

      <h2>主从延迟：成因与排查</h2>
      <p>
        主从延迟（lag）的常见成因：网络带宽不足或抖动；从库在执行<strong>慢命令</strong>（如 keys、大 range）阻塞了命令回放；
        主库写入瞬时洪峰；从库机器负载高；从库在做 RDB/AOF 持久化抢占资源。排查就一句话——看 <code>info replication</code> 里主库的
        <code>master_repl_offset</code> 和每个从库的 <code>offset</code> 差多少，差得越大延迟越大；从库侧还能看 <code>lag</code> 字段。
      </p>

      <h3>级联复制：减轻主库压力</h3>
      <p>
        从库数量很多时，主库要给每个从库都发一遍命令，扇出压力大。可以让<strong>从库再带从库</strong>（级联/链式复制）：
        主库只同步给少数几个一级从库，一级从库再同步给二级从库。代价是数据要多走一跳，二级从库延迟更高。
      </p>

      <table>
        <thead>
          <tr><th>同步类型</th><th>触发时机</th><th>代价</th></tr>
        </thead>
        <tbody>
          <tr><td>全量同步(FULLRESYNC)</td><td>首次连接、backlog 被覆盖、replid 不符</td><td>bgsave + 传整份 RDB，重</td></tr>
          <tr><td>部分重同步(CONTINUE)</td><td>短暂断线且缺失命令仍在 backlog</td><td>只补一小段命令，轻</td></tr>
          <tr><td>命令传播(增量)</td><td>日常每条写命令</td><td>异步转发，最轻</td></tr>
        </tbody>
      </table>

      <h3>面试怎么答</h3>
      <p>
        被问「Redis 主从同步原理」，按「全量 + 增量 + 断线续传」三段讲：第一次或续传失败走全量（bgsave 出 RDB + 复制缓冲区暂存期间命令）；
        日常走增量（命令异步传播）；断线靠 repl_backlog 环形缓冲 + offset + replid 做部分重同步，缺失命令没被覆盖就只补一小段，否则退回全量。
        再点一句「复制是异步的，所以是最终一致，存在主从延迟，主库不等从库确认」，并补充 min-replicas 可降低丢失风险、读写分离要防读到旧值，就把考点覆盖全了。
      </p>

      <Practice title="搭一主一从并观察复制状态">
        <CodeBlock lang="text" title="建立与解除复制关系" code={replicaofCmd} />
        <CodeBlock lang="ini" title="redis.conf（从库配置）" code={replicaConf} />
        <CodeBlock lang="text" title="info replication 看延迟" code={infoRepl} />
      </Practice>

      <Summary
        points={[
          '主从复制让主库写、从库读，实现读写分离与数据冗余，是高可用的地基；从库默认只读。',
          '建立复制用 replicaof 主库IP 端口；流程是先全量同步、再持续增量同步。',
          '全量同步：主库 bgsave 生成 RDB 发给从库(可走无盘传输)，期间的新写命令暂存复制缓冲区，从库加载后再回放。',
          '增量同步是异步命令传播，主库不等从库确认，所以主从是最终一致、存在毫秒级延迟，主库刚回复就宕机可能丢这条写。',
          '断线重连靠 repl_backlog 环形缓冲 + offset + replid 做部分重同步；缺失命令被覆盖才退化为全量，backlog 太小会频繁全量。',
          'min-replicas-to-write 可要求足够从库在线才接受写以降低丢失风险；读写分离要防「读自己刚写」读到旧值。',
          '延迟排查看 info replication 里主从 offset 差值；从库多时可用级联复制分摊主库扇出压力。',
        ]}
      />
    </>
  )
}
