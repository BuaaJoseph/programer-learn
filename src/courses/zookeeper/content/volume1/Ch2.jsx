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

      <h2>watch 机制：节点变了就通知我</h2>
      <p>
        光能存还不够，关键是「改了要有人知道」。客户端可以在某个 znode 上<strong>注册一个 watch</strong>（监听器）。
        之后这个节点一旦发生变化——数据被改、节点被删、子节点增减——ZooKeeper 就会给注册过的客户端发一个通知。
        服务发现、配置推送的「实时性」全靠它。
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
      </KeyIdea>

      <Callout variant="warn" title="watch 的两个常见误区">
        <ul>
          <li><strong>以为能收到每次变更</strong>——一次性的，重新注册之间漏掉的变更不会补发，要的是「最终拿到最新值」而非「每条都不漏」。</li>
          <li><strong>以为通知里带新数据</strong>——通知只告诉你「变了 / 变成什么事件类型」，<strong>不携带新数据</strong>，你得自己再 <code>get</code> 一次去读。</li>
        </ul>
      </Callout>

      <h2>版本号做乐观锁（CAS）</h2>
      <p>
        多个客户端同时改一个节点会不会互相覆盖？ZooKeeper 用 <code>dataVersion</code> 实现了<strong>乐观锁</strong>：
        <code>set</code> 时可以带上你期望的版本号，只有当前版本号和你给的一致，更新才会成功；否则说明别人已经改过，更新被拒绝。
        这正是 <em>CAS</em>（compare-and-swap）的思路：比较版本，一致才交换。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「watch 机制讲一下」，标准答法是三句：<strong>第一，watch 是注册在 znode 上的监听器，节点变化时触发通知；
        第二，它是一次性的，触发后失效，需要重新注册；第三，通知不带数据，收到后要重新 get 读最新值。</strong>
        再补一句「正因为一次性会漏中间状态，ZooKeeper 不能当 MQ」，就把上一章的结论也串起来了。
        如果追问「怎么保证并发安全」，就答 dataVersion + CAS 的乐观锁。
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
      </Practice>

      <Summary
        points={[
          'ZooKeeper 数据是一棵 znode 树，路径类似文件系统，每个 znode 既能存数据又能挂子节点。',
          '单个 znode 数据默认 ≤ 1MB，只适合存元数据、配置、状态，不存业务大数据。',
          '每个 znode 带 stat 元信息，重点记 dataVersion（数据版本）和 cversion（子节点版本）。',
          'watch 是注册在节点上的监听器，节点变化时触发通知，是配置推送、服务发现的实时性来源。',
          'watch 是一次性的：触发后失效，需重新注册；通知不带新数据，需重新 get 读取。',
          'dataVersion 配合 set 的版本参数实现 CAS 乐观锁，版本不匹配则更新失败。',
        ]}
      />
    </>
  )
}
