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

const stubVsSkeletonCode = `// RPC 的经典模型：Stub（消费端桩）+ Skeleton（提供端骨架）
// 这是 1980 年代 Sun RPC、后来 Java RMI 沿用的术语，理解它能看穿所有 RPC 框架

// ① 消费端 Stub：和接口长得一模一样，但每个方法都是「打包 + 发网络」
class UserServiceStub implements UserService {
    private final RemoteClient client;
    public User getById(Long id) {
        // 把调用「编组」(marshal) 成字节，发出去，等回包，再「解组」(unmarshal)
        Request req = new Request("UserService", "getById", new Object[]{id});
        Response resp = client.invokeSync(req);   // 阻塞直到网络返回
        return (User) resp.getResult();
    }
}

// ② 提供端 Skeleton：收到字节后「解组」，反射定位真实实现，再「编组」结果
class UserServiceSkeleton {
    private final UserService impl = new UserServiceImpl();
    public Response handle(Request req) {
        Method m = impl.getClass().getMethod(req.getMethod(), /*参数类型*/);
        Object result = m.invoke(impl, req.getArgs());   // 真正执行落到这里
        return new Response(result);
    }
}`

const rpcVsRestCode = `// 同一个「查用户」需求，RPC 风格 vs REST 风格的对比

// —— RPC 风格（Dubbo）：面向「方法/动作」，调用方看到的是接口 ——
User user = userService.getById(1L);            // 像本地方法
List<User> list = userService.listByDept(10L);  // 再来一个方法

// —— REST 风格（HTTP）：面向「资源」，调用方拼 URL、解析 JSON ——
// GET /users/1            -> 解析返回的 JSON 成 User
// GET /users?deptId=10    -> 解析返回的 JSON 数组
// 你得自己关心：URL 怎么拼、状态码怎么判、JSON 字段怎么映射

// 经验法则：
//  - 公司内部、Java 技术栈、追求性能与强类型 -> RPC（Dubbo）
//  - 对外开放、跨语言、要给浏览器/第三方用    -> REST（HTTP/JSON）`

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
      <p>
        这里还藏着一个容易被忽略的差异：<strong>参数传递的语义变了</strong>。本地调用传的是对象引用，
        方法里改了入参对象的字段，调用方拿到的也是改过的；远程调用传的是「值的副本」（序列化后传字节），
        提供端怎么改入参，消费端都看不到。这就是为什么 RPC 里的「出参回填」（把结果塞回入参对象）这种写法行不通——
        别拿本地编程的直觉去用远程方法。

      </p>
      <p>
        另外有一组术语值得记住：把一次方法调用打包成可传输字节的过程叫 <em>编组（marshalling）</em>，
        对端拆开还原叫 <em>解组（unmarshalling）</em>；消费端那个假对象在经典 RPC 模型里叫 <strong>Stub（桩）</strong>，
        提供端负责接收并分派的叫 <strong>Skeleton（骨架）</strong>。这套词从 1980 年代的 Sun RPC、
        到 Java RMI、再到今天的 Dubbo 一脉相承，看穿了它，所有 RPC 框架的结构都长一个样。
      </p>

      <Example title="为什么参数语义会变：一个真实踩坑">
        <p>
          有人在单体里写惯了「方法内部 <code>order.setStatus(PAID)</code> 修改入参，外面直接读改过的状态」。
          拆成 Dubbo 服务后，这段逻辑悄悄失效了：提供端确实把 <code>order</code> 的状态改了，
          但那是<strong>提供端那份反序列化出来的副本</strong>，消费端手里的 <code>order</code> 根本没动。
          线上表现是「订单明明处理了，状态却没更新」。正解是把结果<strong>作为返回值显式传回</strong>，
          而不是依赖入参被「就地修改」。
        </p>
      </Example>

      <h3>RPC 的经典结构：Stub 与 Skeleton</h3>
      <p>
        把上面的术语落成代码就一目了然了。消费端的 Stub 和接口长得一模一样，
        但每个方法体都是「打包 → 发网络 → 等回包 → 解包」；提供端的 Skeleton 收到字节后解包、
        反射定位真实实现、执行、再把结果打包回传。中间所有框架做的事，都是在丰富这两端：
      </p>
      <CodeBlock lang="java" title="Stub + Skeleton 的最小心智模型" code={stubVsSkeletonCode} />

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

      <h2>RPC 和 HTTP/REST 是什么关系</h2>
      <p>
        新人最常问的一个问题：「都是远程调用，RPC 和直接发 HTTP 请求有啥区别？」这其实是一个层次混淆的问题。
        <strong>HTTP 是一种协议，RPC 是一种调用风格</strong>——RPC 完全可以「基于 HTTP」实现（gRPC 就是跑在 HTTP/2 上的，
        Dubbo 也支持 tri/rest 协议）。它们不是对立面。真正的区别在于<strong>编程心智</strong>：
      </p>
      <ul>
        <li><strong>RPC 面向「方法」</strong>：调用方看到的是接口和方法，<code>userService.getById(1)</code>，强类型、有 IDE 补全、编译期能查错。</li>
        <li><strong>REST 面向「资源」</strong>：调用方拼 URL、选 HTTP 动词、解析 JSON，<code>{'GET /users/1'}</code>，弱契约、靠文档约定。</li>
        <li><strong>性能取向不同</strong>：内部 RPC 常用长连接 + 二进制序列化，省去 HTTP 头开销和反复建连，吞吐更高、延迟更低。</li>
        <li><strong>适用边界</strong>：公司内部、Java 栈、追求性能 → 用 RPC；对外开放、跨语言、给浏览器和第三方 → 用 REST。</li>
      </ul>
      <CodeBlock lang="java" title="同一需求的 RPC 风格 vs REST 风格" code={rpcVsRestCode} />

      <Callout variant="note" title="一句话回答面试官">
        <p>
          「RPC 和 HTTP 不是一个层面的东西。HTTP 是协议，RPC 是一种<em>让远程调用像本地方法</em>的编程范式，
          它底层可以走 HTTP，也可以走自定义 TCP 协议。选 RPC 还是 REST，本质是选<strong>内部强类型高性能</strong>
          还是<strong>对外通用易调试</strong>。」这样答能立刻把层次理清，比纠结「谁快」高明得多。
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
      <p>
        一个小八卦：Dubbo 最早是阿里 2011 年开源的，中间一度停止维护，2017 年重启并在 2019 年正式从 Apache 毕业成为顶级项目，
        现在叫 Apache Dubbo，3.x 版本主推 Triple 协议（兼容 gRPC）、应用级服务发现等新特性。所以你在网上看到的老资料，
        很多是 2.6/2.7 时代的，注解从 <code>@Reference</code> 改成了 <code>@DubboReference</code>，这点要留意版本差异。
      </p>

      <table>
        <thead>
          <tr><th>维度</th><th>Dubbo</th><th>gRPC</th><th>Thrift</th></tr>
        </thead>
        <tbody>
          <tr><td>默认协议</td><td>Dubbo/Triple(TCP)</td><td>HTTP/2</td><td>自定义 TCP</td></tr>
          <tr><td>序列化</td><td>Hessian2/Protobuf 等可换</td><td>Protobuf</td><td>Thrift 二进制</td></tr>
          <tr><td>跨语言</td><td>较弱（Java 为主）</td><td>强</td><td>强</td></tr>
          <tr><td>服务治理</td><td>非常丰富</td><td>需配合 Istio 等</td><td>较弱</td></tr>
          <tr><td>契约定义</td><td>Java 接口</td><td>.proto IDL</td><td>.thrift IDL</td></tr>
        </tbody>
      </table>

      <h3>实战 / 面试怎么答</h3>
      <p>
        被问「什么是 RPC」时，别只背定义。可以这样答：
        <strong>RPC 就是让你像调本地方法一样调远程方法，核心价值是屏蔽掉跨进程、序列化、网络通信这些细节，让远程调用对开发者透明</strong>。
        然后补一句关键的：<strong>但透明只是写法上的，本质上它仍是网络调用，有延迟、会失败</strong>，
        所以框架才需要序列化、服务发现、负载均衡、容错这一整套东西来支撑——这样答既有定义又有深度。
      </p>

      <Callout variant="warn" title="新手常见误区">
        <ul>
          <li><strong>「RPC 就是 HTTP 的封装」</strong>：错。RPC 是调用范式，可以走 HTTP 也可以走自定义协议，二者不在一个层面。</li>
          <li><strong>「远程调用和本地调用没差，加个注解就行」</strong>：写法像，语义不同——会失败、有延迟、参数是值拷贝。</li>
          <li><strong>「接口里塞个大 List 一次返回几万条没事」</strong>：序列化 + 网络传输成本巨大，远程接口要控制返回体积、做分页。</li>
          <li><strong>「在 for 循环里逐条远程查」</strong>：N 次网络往返，典型的 N+1 问题，应改成批量接口一次取回。</li>
        </ul>
      </Callout>

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
