import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ZnodeWatch from '@/courses/zookeeper/illustrations/ZnodeWatch.jsx'

const statCode = `# get 一个节点，除了数据还会带出 stat 信息
get /config

# 返回示例（节选关键字段）：
# version = 3            <- dataVersion，数据被改了 3 次
# cversion = 1          <- 子节点列表的变更次数
# ctime/mtime           <- 创建/最后修改时间
# dataLength = 12       <- 数据字节数`

const casCode = `# 用版本号做乐观锁（CAS）：只在版本号匹配时才更新
set /config newdata 3   # 第三个参数是期望的 dataVersion

# 如果当前版本确实是 3，更新成功，version 变 4
# 如果别人已经先改过（version 变成 4），本次更新报错：
#   version No is not valid : /config
# 客户端据此知道「我手里的数据已过期」，需重新读取再试`

const fullStatCode = `# get -s 查看完整 stat，每个字段都对应一种用途
cZxid = 0x300000002     # 创建该节点的事务 id（全局有序，越大越新）
ctime = ...             # 创建时间
mZxid = 0x300000007     # 最后一次修改数据的事务 id
mtime = ...             # 最后修改时间
pZxid = 0x300000005     # 最后一次子节点列表变更的事务 id
cversion = 2            # 子节点列表版本（增删子节点 +1）
dataVersion = 3         # 数据版本（CAS 用它）
aclVersion = 0          # ACL 权限版本
ephemeralOwner = 0x0    # 临时节点所属 session id；0 表示这是持久节点
dataLength = 12         # 数据字节数
numChildren = 1         # 子节点个数`

const watchTypesCode = `# 不同 API 注册的 watch，触发的事件类型不同
getData(path, watch)        // 触发 NodeDataChanged / NodeDeleted
exists(path, watch)         // 触发 NodeCreated / NodeDataChanged / NodeDeleted
getChildren(path, watch)    // 触发 NodeChildrenChanged / NodeDeleted

# 经验法则：
#  - 想知道「某节点数据/存在性变了」→ getData / exists
#  - 想知道「子节点增减了」→ getChildren（服务发现就靠它）`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说 ZooKeeper 是个「公告栏」，那这块公告栏长什么样、怎么存数据、改了之后又是怎么通知人的？
          答案就是两个核心机制：<strong>znode 树</strong>（数据怎么组织）和 <em>watch</em>（变化怎么通知）。
          搞懂这两样，配置推送、服务发现这些场景你就能自己推导出来了。
        </p>
      </Lead>

      <h2>数据模型：一棵 znode 树</h2>
      <p>
        ZooKeeper 把所有数据组织成一棵<strong>树</strong>，长得跟 Unix 文件系统一模一样：用斜杠分隔的路径来定位，
        比如 <code>/app/db/config</code>。树上的每个节点叫 <em>znode</em>，它有点特别——
        <strong>既像文件又像目录</strong>：它自己能存数据，同时又能挂子节点。
      </p>
      <p>
        但有个硬约束：每个 znode 存的数据很小，<strong>默认上限 1MB</strong>。这再次提醒你它是存元数据的，
        不是存业务大对象的。路径必须用绝对路径（以 <code>/</code> 开头），没有相对路径这一说。
      </p>
      <p>
        为什么选树形而不是扁平 KV？因为协调场景天然有层级：<code>/dubbo/服务名/providers/实例</code>、
        <code>/config/模块/项</code>。树形结构让「按前缀批量管理」「对一棵子树做 ACL 授权」「ls 一把拿到一组相关节点」
        都变得自然。这正是 ZooKeeper 与 etcd（扁平 KV，靠 key 前缀模拟层级）在数据模型上的根本分野。
        整个数据树常驻内存（叫 ZKDatabase），所以读极快；写则要先落事务日志、再改内存、再异步打快照，
        这也是为什么它读多写少表现最好。
      </p>

      <h3>每个 znode 都带一身「stat」</h3>
      <p>
        除了数据本身，每个 znode 还附带一组元信息，叫 <em>stat</em>，其中最该记住的是两个版本号：
      </p>
      <ul>
        <li><code>dataVersion</code>：节点<strong>数据</strong>每被修改一次就加一。</li>
        <li><code>cversion</code>：节点的<strong>子节点列表</strong>每变一次（增删子节点）就加一。</li>
      </ul>
      <p>
        别小看这两个数字，它们是后面做<strong>乐观锁</strong>的关键。还有 ctime/mtime（创建、修改时间）、
        dataLength（数据长度）等字段，都是写在 stat 里随 <code>get</code> 一起返回的。
      </p>
      <p>
        完整的 stat 共 11 个字段，面试常考其中三个 <code>Zxid</code>（cZxid/mZxid/pZxid）和
        <code>ephemeralOwner</code>。<strong>Zxid 是 64 位的全局事务 id，是整个 ZooKeeper 一致性的「时间戳」</strong>：
        高 32 位是 epoch（每选一次主 +1），低 32 位是计数器（每提交一个写 +1）。看到一个节点的 mZxid 比另一个大，
        就能确定它后被修改。<code>ephemeralOwner</code> 则告诉你这是不是临时节点（非 0 即临时，值是 session id），
        下一章讲临时节点会回头用到它。
      </p>
      <CodeBlock lang="bash" title="get -s 查看完整 stat" code={fullStatCode} />

      <h2>watch 机制：节点变了就通知我</h2>
      <p>
        光能存还不够，关键是「改了要有人知道」。客户端可以在某个 znode 上<strong>注册一个 watch</strong>（监听器）。
        之后这个节点一旦发生变化——数据被改、节点被删、子节点增减——ZooKeeper 就会给注册过的客户端发一个通知。
        服务发现、配置推送的「实时性」全靠它。
      </p>
      <p>
        watch 注册在哪个 API 上，决定了你能收到哪类事件。这是实战里最容易搞混的细节：
      </p>
      <CodeBlock lang="java" title="三种 watch 对应的事件类型" code={watchTypesCode} />
      <p>
        通知的传递链路也值得了解一下：watch 注册在客户端发起读请求时随请求一起带到服务端，
        服务端把它登记在该 znode 上；当节点变化触发时，服务端通过<strong>客户端原本连接的那条 TCP 长连接</strong>
        把事件推回去，客户端的事件线程再回调你的 Watcher。所以 watch 的及时性依赖这条连接是否健康——
        连接断了重连后，客户端会自动把本地登记的 watch 重新发给新连接的服务端（这叫 watch 的自动重注册，
        与「触发后失效」是两码事，别混淆）。
      </p>

      <Example title="配置变更推送给所有客户端">
        <p>
          假设 10 台应用机器都依赖 <code>/config/db-url</code> 这个节点里的数据库连接串。每台机器启动时，
          读一次 <code>/config/db-url</code>，并<strong>顺手在上面注册一个 watch</strong>。
        </p>
        <p>
          某天运维要切库，只需 <code>set /config/db-url 新连接串</code> 改这一个节点。ZooKeeper 立刻给那 10 台
          注册过 watch 的机器各发一个「节点数据变了」的通知。机器收到通知后重新 <code>get</code> 一次，
          就拿到了新连接串——一处修改，全局生效，这就是配置中心的底层原理。
        </p>
        <p>
          这里藏着一个边界情况：10 台机器几乎同时收到通知、同时回来 <code>get</code>，会不会把集群打垮？
          一般不会，因为读是本地读、不走一致性协议，吞吐很高。但如果是几万个客户端监听同一个节点（典型如惊群），
          瞬时的重新拉取就可能形成<strong>读风暴</strong>。生产上的应对是：节点别太热、必要时分片、客户端加随机退避。
          这也是后面讲分布式锁时要用「监听前一个节点」而非「都监听锁节点」来避免惊群的根本原因。
        </p>
      </Example>

      <ZnodeWatch />

      <KeyIdea title="watch 是「一次性」的">
        <p>
          这是面试和实战里最容易翻车的点：watch 触发后<strong>就失效了</strong>，是<em>one-time trigger</em>。
          也就是说，你注册一次 watch，只能收到<strong>一次</strong>通知；想继续监听，必须在收到通知后
          <strong>重新注册</strong>一次 watch。如果两次变更之间你还没来得及重新注册，中间那次变更你是收不到通知的——
          这也是为什么 ZooKeeper 不能当消息队列用。好在收到通知后你一般会重新 <code>get</code> 读取最新值，
          拿到的总是「当前最新状态」，不会读到过期数据。
        </p>
        <p>
          为什么要设计成一次性？这是性能与简单性的取舍：如果 watch 是持久的，服务端就要为每个客户端维护
          完整的事件队列、处理积压与重试，复杂度和内存开销陡增。一次性 watch 把「保证拿到最终状态」的责任
          交给客户端（收到事件就重新拉取），服务端只需推一个轻量信号。代价就是中间状态会丢。
          新版 ZooKeeper（3.6+）补充了 <code>addWatch</code> 持久递归 watch 来缓解这个痛点，但「收到事件后重新读」
          仍是最稳妥的编程模型。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="watch 的两个常见误区">
        <ul>
          <li><strong>以为能收到每次变更</strong>——一次性的，重新注册之间漏掉的变更不会补发，要的是「最终拿到最新值」而非「每条都不漏」。</li>
          <li><strong>以为通知里带新数据</strong>——通知只告诉你「变了 / 变成什么事件类型」，<strong>不携带新数据</strong>，你得自己再 <code>get</code> 一次去读。</li>
          <li><strong>以为连接断了 watch 就丢</strong>——其实客户端重连后会自动重注册尚未触发的 watch；真正丢的是「重注册期间发生的变更」。</li>
        </ul>
      </Callout>

      <h2>版本号做乐观锁（CAS）</h2>
      <p>
        多个客户端同时改一个节点会不会互相覆盖？ZooKeeper 用 <code>dataVersion</code> 实现了<strong>乐观锁</strong>：
        <code>set</code> 时可以带上你期望的版本号，只有当前版本号和你给的一致，更新才会成功；否则说明别人已经改过，更新被拒绝。
        这正是 <em>CAS</em>（compare-and-swap）的思路：比较版本，一致才交换。
      </p>
      <p>
        这套机制的价值在于：<strong>用无锁的方式解决并发写冲突</strong>。比如做一个分布式计数器，
        读出当前值 v 和版本 ver，本地加一，用 <code>set 路径 v+1 ver</code> 写回。若期间别人也改了，
        版本对不上，你的写失败，重新读再试（自旋）。整个过程不需要加任何分布式锁，吞吐高、无死锁。
        把版本号传 <code>-1</code> 则表示「不做版本检查，强制覆盖」——方便但危险，相当于放弃了乐观锁保护，
        生产代码里要慎用。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「watch 机制讲一下」，标准答法是三句：<strong>第一，watch 是注册在 znode 上的监听器，节点变化时触发通知；
        第二，它是一次性的，触发后失效，需要重新注册；第三，通知不带数据，收到后要重新 get 读最新值。</strong>
        再补一句「正因为一次性会漏中间状态，ZooKeeper 不能当 MQ」，就把上一章的结论也串起来了。
        如果追问「怎么保证并发安全」，就答 dataVersion + CAS 的乐观锁。
      </p>
      <p>
        高频追问：<strong>「watch 和 Redis 的 keyspace notification 有什么区别？」</strong>——ZK 的 watch 是
        基于强一致数据树、推送可靠（连接在就一定送达），但一次性；Redis 通知基于 pub/sub，是「best effort」，
        订阅者不在线就彻底丢。<strong>「getChildren 注册 watch，子节点的数据变了会通知吗？」</strong>——不会，
        getChildren 只关心子节点列表的增减，子节点内部数据变化要单独对那个子节点 getData 注册 watch。
        这个区分答对了很显功底。
      </p>

      <Practice title="亲手注册 watch 并触发它">
        <p>
          先看一个节点的 stat 信息，认一认两个版本号：
        </p>
        <CodeBlock lang="bash" title="查看 stat" code={statCode} />
        <p>
          再在 zkCli 里用 <code>get -w</code> 给节点注册一个 watch，然后<strong>另开一个 zkCli 窗口</strong>去 <code>set</code> 修改它，
          观察第一个窗口收到的通知（形如 <code>WatchedEvent ... type:NodeDataChanged</code>）。注意通知只来一次，
          想再监听得再 <code>get -w</code> 一次。最后试试带版本号的乐观锁更新：
        </p>
        <CodeBlock lang="bash" title="版本号 CAS 更新" code={casCode} />
        <p>
          进阶练习：开两个窗口，都用 <code>ls -w /app</code> 监听同一个父节点，在第三个窗口里
          <code>create /app/x</code>，观察两个窗口是否都收到 <code>NodeChildrenChanged</code>——验证一次变更可以
          通知多个注册者，但每个注册者也都只收到这一次。
        </p>
      </Practice>

      <Summary
        points={[
          'ZooKeeper 数据是一棵 znode 树，路径类似文件系统，每个 znode 既能存数据又能挂子节点。',
          '树形模型天然适合层级化的协调场景；整棵树常驻内存，所以读极快、写要走日志+快照。',
          '单个 znode 数据默认 ≤ 1MB，只适合存元数据、配置、状态，不存业务大数据。',
          '每个 znode 带 stat 元信息，重点记 dataVersion、cversion，以及全局有序的 Zxid 和 ephemeralOwner。',
          'watch 是注册在节点上的监听器，节点变化时触发通知，是配置推送、服务发现的实时性来源。',
          'watch 注册在 getData/exists/getChildren 上，对应不同事件类型；getChildren 只感知子节点增减。',
          'watch 是一次性的（设计上为了简单与性能）：触发后失效需重新注册；通知不带新数据，需重新 get。',
          'dataVersion 配合 set 的版本参数实现 CAS 乐观锁，版本不匹配则更新失败，传 -1 强制覆盖。',
        ]}
      />
    </>
  )
}
