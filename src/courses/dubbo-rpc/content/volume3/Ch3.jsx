import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const dubboCallCode = `// Dubbo：像调本地方法一样调远程，协议和序列化对业务透明
@DubboReference
private OrderService orderService;     // 远端服务，注入即用

public void demo() {
    Order order = orderService.queryOrder(1001L);   // 看着就是普通方法调用
    // 底层：长连接 + 二进制序列化，性能高，但调试时抓包看不懂
}`

const feignCallCode = `// Feign：声明式 HTTP 客户端，本质是发 HTTP 请求收 JSON
@FeignClient(name = "order-service")
public interface OrderClient {

    // 这就是一个 GET http://order-service/orders/1001
    @GetMapping("/orders/{id}")
    Order queryOrder(@PathVariable("id") Long id);
}

// 调试时可以直接用 curl 复现，浏览器也能打开看 JSON：
//   curl http://order-service/orders/1001`

const checklistCode = `选型决策清单（自上而下，命中即定）

1. 调用方是浏览器 / App / 第三方公司？
   → 只能 HTTP（Feign / REST）。对外开放一律走 HTTP。

2. 跨语言吗（Go、Python、Node 等混合栈）？
   → 倾向 HTTP+JSON（最通用）；或选 gRPC（跨语言 RPC）。

3. 公司内部、同语言、调用频率很高、对延迟敏感？
   → 倾向 Dubbo（长连接 + 二进制，性能更好）。

4. 需要开箱即用的丰富服务治理（路由、灰度、限流细到方法级）？
   → 倾向 Dubbo（内置完善）。

5. 团队已重度使用 Spring Cloud 全家桶 / 重视可调试性？
   → 倾向 Feign（生态顺手、HTTP 直观好排查）。

一句话：对内高频用 RPC（Dubbo），对外开放用 HTTP（Feign）。`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          「服务之间该用 Dubbo 还是 Feign？」是微服务里最常被问的选型题。它俩不是谁取代谁，而是两条路线：
          <em>Dubbo</em> 是基于长连接和二进制的 <strong>RPC</strong>，主打性能与治理；<em>Feign</em> 是 Spring Cloud 体系里的
          声明式 <strong>HTTP</strong> 客户端，主打通用与直观。选对的关键，是看清各自的取舍。
        </p>
      </Lead>

      <h2>两种调用，长什么样</h2>
      <p>
        先建立直觉。Dubbo 让你「像调本地方法一样调远程」，协议和序列化都藏在底层；Feign 则是把一次 HTTP 请求，
        包装成一个接口方法的声明：
      </p>
      <CodeBlock lang="java" title="Dubbo 调用" code={dubboCallCode} />
      <CodeBlock lang="java" title="Feign 调用" code={feignCallCode} />
      <p>
        代码长得有点像，但底层完全是两回事：Dubbo 走的是长连接加二进制编码，Feign 走的是标准 HTTP 加 JSON。
        这个底层差异，决定了下面所有的对比维度。
      </p>

      <h2>逐维度对比</h2>
      <ul>
        <li>
          <strong>协议</strong>——Dubbo 默认 <em>长连接 + 二进制</em>（如 Dubbo 协议、Hessian 序列化）；
          Feign 是 <em>HTTP + JSON</em>，建立在无状态的 HTTP 之上。
        </li>
        <li>
          <strong>性能</strong>——RPC 更快：二进制体积小、长连接省去反复握手、序列化开销低。同等条件下 Dubbo 的吞吐和延迟通常优于 HTTP+JSON。
        </li>
        <li>
          <strong>跨语言</strong>——HTTP 更通用：任何语言、任何客户端都能发 HTTP，天然跨语言；Dubbo 早期偏 Java 生态，跨语言要额外成本。
        </li>
        <li>
          <strong>服务治理</strong>——Dubbo <em>内置丰富</em>：负载均衡、集群容错、路由、方法级配置开箱即用；
          Spring Cloud 这边是「生态拼装」，治理能力靠 LoadBalancer、Gateway、Sentinel 等组件组合出来。
        </li>
        <li>
          <strong>易用与可调试</strong>——HTTP 更直观：能用 <code>curl</code> 复现、浏览器能打开看 JSON、抓包就能读懂；
          Dubbo 的二进制流抓包看不懂，排查门槛高一些。
        </li>
        <li>
          <strong>适用场景</strong>——公司内部高频微服务调用偏向 RPC；对外开放 API、异构系统、浏览器直连偏向 HTTP。
        </li>
      </ul>

      <Callout variant="tip" title="gRPC：HTTP/2 上的 RPC">
        <p>
          顺带提一句 <em>gRPC</em>：它跑在 HTTP/2 上、用 Protobuf 做二进制序列化，相当于「HTTP/2 上的 RPC」——
          既有 RPC 的高性能，又凭 HTTP/2 和 IDL 拿到不错的跨语言能力，是 Dubbo 和纯 HTTP 之间的第三条路。
        </p>
      </Callout>

      <Example title="内部订单服务 vs 对外开放接口，分别选谁">
        <p>同一家电商公司，两个场景，结论恰好相反：</p>
        <ul>
          <li>
            <strong>内部订单服务调库存、用户、营销</strong>——都是自家 Java 服务、调用量极大、对延迟敏感、需要细粒度治理。
            选 <em>Dubbo</em>：性能更高，路由灰度限流这些治理能力开箱即用，省心。
          </li>
          <li>
            <strong>对外开放的订单查询 API</strong>——调用方是合作商的 Go 服务、是浏览器、是 App，谁都得能接。
            选 <em>HTTP</em>（Feign / REST）：跨语言无障碍，对方用 <code>curl</code> 就能联调，文档和调试都简单。
          </li>
        </ul>
        <p>
          可见选型从来不是「哪个更强」，而是<strong>「这次的调用方是谁、跨不跨语言、要不要对外」</strong>。
        </p>
      </Example>

      <KeyIdea title="对内高频用 RPC，对外开放用 HTTP">
        <p>
          一句话记住这道题的答案：<strong>性能与治理优先、且是公司内部同栈高频调用，选 Dubbo</strong>；
          <strong>通用性与可调试优先、要对外开放或对接异构系统，选 HTTP</strong>。
          想兼得高性能与跨语言，再考虑 gRPC。脱离场景比「谁更好」，没有意义。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        遇到「Dubbo 和 Feign 怎么选」，别背「Dubbo 快」三个字就完了。先讲清底层差异——
        <strong>Dubbo 是长连接二进制 RPC，Feign 是 HTTP+JSON</strong>；再从性能、跨语言、治理、可调试四个维度铺开取舍；
        最后落到场景：对内高频选 Dubbo、对外开放选 HTTP，并补一句 gRPC 是兼顾性能与跨语言的折中。
        能把「按场景选」这个判断逻辑讲出来，远比报结论加分。
      </p>

      <Practice title="一份「按场景选 RPC 还是 HTTP」的决策清单">
        <p>
          把选型沉淀成一张自上而下的清单：先问「调用方是谁」，再问「跨不跨语言」，再问「性能与治理要求」，
          逐条命中即可定调。下次再遇到选型，照着走一遍就有答案。
        </p>
        <CodeBlock lang="text" title="选型决策清单" code={checklistCode} />
        <p>
          可以拿你正在做的项目套一遍：列出三四个典型调用链路，逐个过清单，看看哪些该走 Dubbo、哪些该走 HTTP，
          再对照现状，往往能发现「对外接口误用了 RPC」或「内部高频调用浪费在 HTTP 上」这类可优化点。
        </p>
      </Practice>

      <Summary
        points={[
          'Dubbo 是长连接+二进制的 RPC，Feign 是 Spring Cloud 体系的声明式 HTTP+JSON 客户端，是两条路线而非互相取代。',
          '协议与性能：RPC 二进制+长连接更快；HTTP+JSON 更通用、天然跨语言。',
          '服务治理：Dubbo 内置丰富（路由/容错/方法级配置开箱即用），Spring Cloud 靠组件拼装。',
          '可调试：HTTP 直观，curl/浏览器即可复现；Dubbo 二进制流排查门槛更高。',
          '场景结论：公司内部高频同栈调用选 Dubbo，对外开放/异构系统/浏览器直连选 HTTP；gRPC 是 HTTP/2 上的 RPC，兼顾性能与跨语言。',
          '面试要点：先讲底层差异，再铺四个维度取舍，最后按「调用方是谁」落到场景，而非空报「谁更好」。',
        ]}
      />
    </>
  )
}
