import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const registryCode = `// 注册中心：provider 启动时把自己注册为临时节点
String base = "/dubbo/com.demo.OrderService/providers";
// 临时节点：provider 进程挂了，节点自动消失，consumer 即时感知下线
client.create()
      .creatingParentsIfNeeded()
      .withMode(CreateMode.EPHEMERAL)
      .forPath(base + "/192.168.1.10:20880");

// consumer 监听 providers 子节点变化，拿到最新可用列表
client.getChildren().usingWatcher(event -> {
    List<String> providers = client.getChildren().forPath(base);
    refreshLocalProviderList(providers);   // 刷新本地服务列表
}).forPath(base);`

const electCode = `// 选主：多实例抢建同一个临时节点，建成功者为主
try {
    client.create()
          .withMode(CreateMode.EPHEMERAL)
          .forPath("/election/master");   // 谁建成功谁是 master
    becomeMaster();
} catch (NodeExistsException e) {
    // 没抢到，watch 这个节点，主挂了（临时节点消失）就重新抢
    client.checkExists()
          .usingWatcher(ev -> tryElect())
          .forPath("/election/master");
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          分布式锁之外，ZooKeeper 在生产里更高频的用途是<strong>注册中心、配置中心和选主</strong>。
          这三个场景看似不同，底层其实就用到同样几招：临时节点、watch 监听、抢建节点。
          这一章用 Dubbo 注册发现的例子把它们串起来。
        </p>
      </Lead>

      <h2>注册中心</h2>
      <p>
        微服务里服务提供方（<em>provider</em>）和调用方（<em>consumer</em>）需要互相发现。用 ZooKeeper 做注册中心的套路是：
        provider 启动时在约定路径下创建一个<strong>临时节点</strong>，把自己的地址（IP + 端口）写进去；
        consumer <strong>watch 这个路径的子节点变化</strong>，从而随时拿到当前可用的 provider 列表。
      </p>
      <p>
        临时节点是精髓：一旦某个 provider 进程崩溃或下线，会话断开，它的临时节点<strong>自动消失</strong>，
        consumer 的 watch 立刻被触发，重新拉取列表，那台挂掉的实例就再也不会被调用到——这就实现了
        <strong>自动上下线、健康剔除</strong>，不需要额外的心跳探活逻辑。
      </p>

      <Example title="Dubbo 注册发现">
        <p>经典的 Dubbo + ZooKeeper 组合，工作流程是：</p>
        <ul>
          <li>OrderService 的两个实例启动，分别在 <code>/dubbo/OrderService/providers</code> 下建临时节点写入自己地址。</li>
          <li>consumer 启动时拉取该目录子节点，得到两个可用地址，并 watch 这个目录。</li>
          <li>其中一个实例宕机，临时节点消失，consumer 的 watch 触发，列表更新为只剩一个地址。</li>
          <li>consumer 后续的负载均衡只会打到存活实例，故障实例被自动摘除。</li>
        </ul>
      </Example>

      <KeyIdea title="临时节点 + watch = 服务发现">
        <p>
          注册中心的两个核心动作正好对应 ZooKeeper 的两个特性：注册用<strong>临时节点</strong>
          （进程在节点在、进程亡节点亡，等价于健康状态），发现用<strong>watch 子节点</strong>
          （列表一变就推送给 consumer）。把这两点记牢，注册中心的原理就吃透了。
        </p>
      </KeyIdea>

      <h2>配置中心</h2>
      <p>
        配置中心的思路同样朴素：把配置内容存进某个 <em>znode</em>（比如 <code>/config/app/db_url</code>），
        所有需要这份配置的实例都 <strong>watch 这个节点</strong>。运维要改配置时，直接更新该 znode 的数据，
        ZooKeeper 就把变更<strong>推送</strong>给所有监听者，各实例在回调里重新加载配置，实现
        <strong>热更新</strong>、不用重启。一处修改、全网即时生效，这就是 ZooKeeper 做配置中心的价值。
      </p>

      <Callout variant="warn" title="watch 是一次性的，记得重新注册">
        <p>
          ZooKeeper 的 watch 有个容易踩的坑：它是<strong>一次性触发</strong>的。也就是说一个 watch 被触发一次后就失效了，
          如果想继续监听后续变化，必须在回调里<strong>重新注册</strong>一个新的 watch。
        </p>
        <ul>
          <li>注册中心、配置中心的回调里都要记得「处理完变更后再次 watch」，否则只会收到第一次通知。</li>
          <li>用 Curator 的 <code>NodeCache</code>、<code>PathChildrenCache</code> 等封装可以自动帮你续 watch，省心。</li>
        </ul>
      </Callout>

      <h2>选主与命名服务</h2>
      <p>
        <strong>选主</strong>（leader election）指的是应用层面：多个实例里要选一个当主来执行定时任务或写操作，避免重复执行。
        实现极简——所有实例去<strong>抢着创建同一个临时节点</strong>（比如 <code>/election/master</code>），
        ZooKeeper 保证只有一个能建成功，<strong>建成功的就是主</strong>，其余的 watch 这个节点。
        主实例崩溃时临时节点消失，watch 触发，剩下的实例重新抢建，<strong>自动选出新主</strong>。
      </p>
      <p>
        <strong>命名服务</strong>（naming service）则是把 ZooKeeper 当成一个全局唯一的目录/字典：
        用顺序节点生成全局唯一 ID，或用路径作为全局统一的资源名，让分散的系统对同一资源达成共识。
      </p>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 有哪些应用场景」，按这条线答：分布式锁、注册中心（provider 建临时节点、consumer watch 子节点拿最新列表、
        临时节点实现自动上下线）、配置中心（配置存 znode、watch 实现热更新推送）、选主（抢建同一临时节点、建成功者为主、挂了重选）、命名服务。
        能点出「临时节点 + watch」是这些场景共同的底层机制，再补一句 watch 一次性需重新注册，就很完整。
      </p>

      <Practice title="用临时节点做注册与选主">
        <p>注册中心：provider 建临时节点，consumer watch 子节点变化：</p>
        <CodeBlock lang="java" title="注册与发现（伪代码）" code={registryCode} />
        <p>选主：所有实例抢建同一个临时节点，建成功即为主，主挂了重新抢：</p>
        <CodeBlock lang="java" title="抢建临时节点选主（伪代码）" code={electCode} />
      </Practice>

      <Summary
        points={[
          '注册中心：provider 建临时节点写地址，consumer watch 子节点变化拿到最新可用列表。',
          '临时节点等价于健康状态，provider 崩溃节点自动消失、consumer 即时感知，实现自动上下线与故障剔除。',
          '配置中心：配置存进 znode，监听者 watch 该节点，更新数据即推送变更，实现配置热更新不重启。',
          '选主：多实例抢建同一个临时节点，ZooKeeper 保证只有一个建成功即为主，主挂了节点消失后自动重选。',
          'watch 是一次性触发的，回调里要重新注册才能持续监听；Curator 的 Cache 封装可自动续 watch。',
          '注册中心/配置中心/选主的共同底层就是临时节点加 watch，记住这一点即可触类旁通。',
        ]}
      />
    </>
  )
}
