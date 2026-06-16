import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LocalVsRpc from '@/courses/dubbo-rpc/illustrations/LocalVsRpc.jsx'

const referenceCode = `// 1. 定义服务接口（消费者和提供者共享同一个 jar）
public interface UserService {
    User getById(Long id);
}

// 2. 提供者侧：实现并暴露服务
@DubboService
public class UserServiceImpl implements UserService {
    @Override
    public User getById(Long id) {
        // 真正查数据库的逻辑跑在「另一台机器」上
        return userRepository.findById(id);
    }
}

// 3. 消费者侧：像注入本地 Bean 一样注入远程服务
@Component
public class OrderService {

    @DubboReference   // 注意：这不是普通的 @Autowired
    private UserService userService;

    public void createOrder(Long userId) {
        // 看起来是本地方法调用，实际上一次网络往返已经发生
        User user = userService.getById(userId);
        System.out.println("下单用户：" + user.getName());
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          当你写下 <code>userService.getById(1)</code> 这一行时，看起来和调用任何一个本地方法没有区别。
          但如果 <code>userService</code> 是一个远程服务，这次调用其实跑去了「另一台机器」上执行，
          再把结果通过网络送回来。能让这件事看起来像本地调用一样自然的技术，就叫 <em>RPC</em>。
        </p>
      </Lead>

      <h2>RPC 到底是什么</h2>
      <p>
        RPC 是 <em>Remote Procedure Call</em>（远程过程调用）的缩写。一句话定义：
        “像调用本地方法一样，去调用另一个进程（通常在另一台机器上）里的方法”。
        调用方不需要自己写「打开 Socket、拼协议、发字节、收字节、解析返回值」这一整套代码，
        框架把这些全藏了起来，你只管 <code>对象.方法(参数)</code>。
      </p>
      <p>
        所以 RPC 的<strong>核心目标是「透明」</strong>：让远程调用对开发者尽量透明，
        写代码的人感觉不到「远程」这件事的存在。理想情况下，把一个本地服务改造成远程服务，
        调用方的业务代码一行都不用改——这正是 Dubbo、gRPC 这类框架想达到的体验。
      </p>

      <h3>它和本地调用的本质差异</h3>
      <p>
        虽然写法一样，但「调本地方法」和「调远程方法」在底层是两回事。这几个差异，恰恰是 RPC 框架要替你兜住的：
      </p>
      <ul>
        <li><strong>跨进程</strong>：本地调用共享同一块内存，直接传对象引用；远程调用要把参数<em>序列化</em>成字节再传过去。</li>
        <li><strong>序列化</strong>：对象在网络上传不了，必须先变成字节流，对端再还原成对象，这一来一回都有成本。</li>
        <li><strong>网络延迟</strong>：本地调用是纳秒级，远程调用要走网络，通常是毫秒级，慢了几个数量级。</li>
        <li><strong>可能失败</strong>：本地方法几乎不会「调不通」，远程调用却可能超时、连接断开、对端宕机——失败是常态而不是意外。</li>
      </ul>

      <Example title="userService.getById(1) 背后发生了什么">
        <p>
          假设订单服务要拿用户信息，写法是 <code>User user = userService.getById(1)</code>。
          在单体应用里，这就是一次普通的方法调用，JVM 内部跳转一下而已。
        </p>
        <p>
          但在微服务里，用户服务部署在另外一台机器上。这一行代码实际经历了：
          本地的 <code>userService</code> 其实是个<strong>代理对象</strong> →
          它把「调 getById、参数是 1」打包序列化 → 通过网络发到用户服务所在的机器 →
          那台机器执行真正的 <code>getById</code>、查库拿到 User → 把 User 序列化后送回来 →
          代理对象把字节还原成 User 对象返回给你。整个过程你都看不见，只看到一个返回值。
        </p>
      </Example>

      <LocalVsRpc />

      <KeyIdea title="RPC 框架到底替你做了哪几件事">
        <p>
          一个完整的 RPC 框架，至少要解决下面这几件事，少一件透明性就打折扣：
        </p>
        <ul>
          <li><strong>动态代理</strong>：生成一个假的本地对象，拦截方法调用，把它转成远程请求。</li>
          <li><strong>序列化</strong>：把参数和返回值在对象与字节流之间来回转换。</li>
          <li><strong>网络通信</strong>：负责把字节高效地发出去、收回来，通常用长连接加 NIO。</li>
          <li><strong>服务发现</strong>：消费者怎么知道提供者在哪台机器、哪个端口（靠注册中心）。</li>
          <li><strong>负载均衡</strong>：有多台提供者时，这次调用该路由到哪一台。</li>
          <li><strong>容错</strong>：调用失败了怎么办，是重试、快速失败还是降级。</li>
        </ul>
      </KeyIdea>

      <Callout variant="warn" title="透明不等于无感">
        <p>
          RPC 让远程调用「看起来像」本地调用，但你不能<strong>真的当成</strong>本地调用来写代码。
          本地调用里在循环里调一百次没关系，远程调用里在循环里调一百次就是一百次网络往返，性能可能直接崩掉。
          同样，远程调用必须考虑超时和失败，而本地调用几乎不用。<strong>记住「它其实是远程的」</strong>，
          是用好 RPC 的前提。
        </p>
      </Callout>

      <h2>常见的 RPC 框架</h2>
      <p>
        市面上主流的 RPC 框架，思路大同小异，区别主要在序列化方式、协议和生态上：
      </p>
      <ul>
        <li><strong>Dubbo</strong>：阿里开源、Java 生态最常用，注册中心 + 长连接 + 丰富的容错和治理能力，本课程的主角。</li>
        <li><strong>gRPC</strong>：Google 出品，基于 HTTP/2 和 Protobuf，天然跨语言，云原生场景很流行。</li>
        <li><strong>Thrift</strong>：Facebook 出品，靠 IDL 生成多语言代码，老牌的跨语言 RPC。</li>
        <li><strong>bRPC</strong>：百度开源，C++ 系，主打高性能。</li>
      </ul>

      <h3>实战 / 面试怎么答</h3>
      <p>
        被问「什么是 RPC」时，别只背定义。可以这样答：
        <strong>RPC 就是让你像调本地方法一样调远程方法，核心价值是屏蔽掉跨进程、序列化、网络通信这些细节，让远程调用对开发者透明</strong>。
        然后补一句关键的：<strong>但透明只是写法上的，本质上它仍是网络调用，有延迟、会失败</strong>，
        所以框架才需要序列化、服务发现、负载均衡、容错这一整套东西来支撑——这样答既有定义又有深度。
      </p>

      <Practice title="跑通一次最小的 Dubbo 远程调用">
        <p>
          用 <code>@DubboService</code> 暴露一个服务，再用 <code>@DubboReference</code> 在另一个应用里注入它，
          体会一下「注入远程服务」和「注入本地 Bean」在写法上几乎一模一样。下面是最小骨架：
        </p>
        <CodeBlock lang="java" title="UserService 的暴露与引用" code={referenceCode} />
        <p>
          重点观察 <code>@DubboReference</code> 这个注解：它注入进来的不是真正的实现类，而是一个
          <strong>代理对象</strong>。下一章我们就拆开这个代理，看一次 RPC 调用从头到尾的完整 8 步。
        </p>
      </Practice>

      <Summary
        points={[
          'RPC 是 Remote Procedure Call，目标是让开发者像调本地方法一样调远程方法，核心价值是「透明」。',
          '本地调用和远程调用的本质差异在于：跨进程、需要序列化、有网络延迟、调用可能失败。',
          'RPC 框架要解决六件事：动态代理、序列化、网络通信、服务发现、负载均衡、容错。',
          '透明只是写法上的透明，本质仍是网络调用，不能真的当本地方法用（小心循环里频繁远程调用）。',
          '常见框架有 Dubbo、gRPC、Thrift、bRPC，思路相近，区别在序列化、协议和生态。',
          'Dubbo 里用 @DubboService 暴露服务、@DubboReference 引用服务，注入的是一个代理对象。',
        ]}
      />
    </>
  )
}
