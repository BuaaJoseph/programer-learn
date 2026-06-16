import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RpcFlow from '@/courses/dubbo-rpc/illustrations/RpcFlow.jsx'

const invokeSkeletonCode = `// 消费端的代理对象，拦截所有接口方法调用
public class RpcProxy implements InvocationHandler {

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 第 2 步：封装请求，把「调谁、调什么、参数、版本」装进一个对象
        RpcRequest request = new RpcRequest();
        request.setInterfaceName(method.getDeclaringClass().getName());
        request.setMethodName(method.getName());
        request.setParameterTypes(method.getParameterTypes());
        request.setArguments(args);
        request.setVersion("1.0.0");

        // 第 2 步续：序列化成字节
        byte[] data = serializer.serialize(request);

        // 第 3 步：通过网络发出去（长连接 + NIO），拿到字节响应
        byte[] respData = client.send(data);

        // 第 8 步：把响应字节反序列化成结果对象
        RpcResponse response = serializer.deserialize(respData, RpcResponse.class);
        if (response.getException() != null) {
            throw response.getException();
        }
        return response.getResult();   // 由代理把结果原样返回，调用方无感
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们知道 <code>userService.getById(1)</code> 注入的是个代理对象。这一章我们就把这次调用
          按下慢放键，看看从「调用方按下回车」到「拿到返回值」中间，到底走了哪 8 步、每一步在干什么。
          搞清楚这条主线，后面所有的序列化、注册中心、负载均衡，都能挂到这条线上理解。
        </p>
      </Lead>

      <h2>一次 RPC 调用的 8 步</h2>
      <p>
        我们用一次具体调用走完：消费端的订单服务调 <code>userService.getById(1)</code>，
        提供端在另一台机器上执行后把 User 返回。整个链路可以拆成 8 步：
      </p>
      <ul>
        <li><strong>1. 动态代理拦截</strong>：<code>userService</code> 是代理对象，方法调用被它的 <code>invoke</code> 拦下，业务代码以为这是本地调用。</li>
        <li><strong>2. 封装请求并序列化</strong>：代理把「接口名、方法名、参数类型、参数值、版本号」装进一个请求对象，再序列化成字节流。</li>
        <li><strong>3. 网络发送</strong>：通过和提供端之间的连接把字节发出去，通常是一条复用的<em>长连接</em>，底层用 <em>NIO</em>（Dubbo 用 Netty）。</li>
        <li><strong>4. 服务端反序列化</strong>：提供端收到字节，反序列化还原成请求对象，知道「要调哪个接口的哪个方法、参数是什么」。</li>
        <li><strong>5. 反射定位并执行</strong>：服务端根据接口名和版本找到真正的实现类实例，用<em>反射</em>调用对应方法，真正执行 <code>getById(1)</code> 查库。</li>
        <li><strong>6. 返回值序列化</strong>：把执行得到的 User 对象（或抛出的异常）包成响应对象，序列化成字节。</li>
        <li><strong>7. 网络回传</strong>：响应字节沿着原来的连接送回消费端。</li>
        <li><strong>8. 消费端反序列化并返回</strong>：消费端收到字节，反序列化成响应对象，由代理把结果 <code>return</code> 给业务代码。</li>
      </ul>

      <Example title="getById(1) 走完这 8 步">
        <p>
          订单服务执行到 <code>userService.getById(1)</code>：代理拦下调用（1），
          封装成「接口=UserService、方法=getById、参数=1、版本=1.0.0」并序列化（2），
          通过到用户服务那台机器的长连接发出去（3）。
        </p>
        <p>
          用户服务那台机器收到字节、反序列化（4），找到 <code>UserServiceImpl</code> 实例、
          反射调用 <code>getById</code>、查库得到 <code>User(id=1, name=张三)</code>（5），
          把它序列化（6）、沿连接送回（7）。订单服务这边反序列化拿到 User 对象（8），
          代理把它 return 出去。业务代码全程只看到一个返回的 User，看不到中间这 7 步。
        </p>
      </Example>

      <RpcFlow />

      <KeyIdea title="两个代理，一个反射">
        <p>
          这条链路里有三个最关键的技术点。
          <strong>消费端靠动态代理</strong>把本地方法调用变成网络请求；
          <strong>提供端靠反射</strong>把网络请求变回本地方法调用；
          中间<strong>靠序列化</strong>让对象能在网络上传输。
          说穿了，RPC 就是「代理把调用打包发出去，反射在对端拆包执行，序列化负责打包拆包」。
        </p>
      </KeyIdea>

      <Callout variant="note" title="同步还是异步">
        <p>
          上面描述的是<strong>同步调用</strong>：发出请求后线程阻塞等响应回来。Dubbo 也支持<strong>异步调用</strong>，
          发出请求后立刻返回一个 <code>CompletableFuture</code>，结果到了再回调，线程不用干等。
          但不管同步异步，底层这 8 步的本质是一样的，区别只在「消费端线程要不要原地等结果」。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「讲一下一次 RPC 调用的过程」时，按这条主线答最清楚：
        <strong>消费端动态代理拦截 → 封装请求并序列化 → 通过长连接发出 → 服务端反序列化 → 反射定位实现并执行 → 返回值序列化 → 网络回传 → 消费端反序列化由代理返回</strong>。
        能把「代理负责消费端、反射负责服务端、序列化贯穿全程」这条逻辑说出来，就说明你真的理解了，
        而不是背流程。
      </p>

      <Practice title="手写代理 invoke 的骨架">
        <p>
          理解 RPC 最快的方式，是自己画一遍代理的 <code>invoke</code> 方法骨架。
          下面这段伪代码（去掉了连接管理、超时等细节）把消费端的第 2、3、8 步串了起来：
        </p>
        <CodeBlock lang="java" title="RpcProxy.invoke 骨架" code={invokeSkeletonCode} />
        <p>
          注意这里 <code>client.send</code> 是同步阻塞的；如果改成异步，就把它换成返回 future、
          并让 <code>invoke</code> 直接返回这个 future。下一章我们深入第 2 步的核心——序列化，
          看看为什么 Dubbo 默认不用 Java 原生序列化。
        </p>
      </Practice>

      <Summary
        points={[
          '一次 RPC 调用的 8 步：代理拦截 → 封装请求并序列化 → 网络发送 → 服务端反序列化 → 反射执行 → 返回值序列化 → 网络回传 → 消费端反序列化并返回。',
          '请求里要带「接口名、方法名、参数类型、参数值、版本号」，对端才能精确定位到要执行的方法。',
          '消费端靠动态代理把本地调用变成网络请求，提供端靠反射把网络请求变回本地调用。',
          '序列化贯穿全程：参数和返回值都要在对象和字节流之间来回转换。',
          '网络通信通常用复用的长连接加 NIO（Dubbo 基于 Netty），避免频繁建连。',
          '同步调用阻塞等结果，异步调用返回 future 后回调，底层 8 步本质一致。',
        ]}
      />
    </>
  )
}
