import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SerializationCompare from '@/courses/dubbo-rpc/illustrations/SerializationCompare.jsx'

const dubboSerializeCode = `# application.yml —— 全局指定序列化方式
dubbo:
  protocol:
    name: dubbo          # 使用 Dubbo 协议（单一长连接 + 二进制头）
    port: 20880
    serialization: hessian2   # 默认就是 hessian2，可换成 kryo / fastjson2 等

# 也可以在单个服务上覆盖
# @DubboService(serialization = "kryo")
# public class UserServiceImpl implements UserService { ... }`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章的第 2、6 步都要做序列化：把对象变成字节、把字节还原成对象。这一步看着不起眼，却直接决定了
          RPC 的性能和能不能跨语言。Java 自带一套序列化机制，为什么几乎没有 RPC 框架愿意用它？
          这一章我们就把序列化和协议讲清楚。
        </p>
      </Lead>

      <h2>Java 原生序列化的问题</h2>
      <p>
        Java 只要让类 <code>implements Serializable</code>，就能用 <code>ObjectOutputStream</code>
        把对象写成字节。方便归方便，但拿来做 RPC 有一堆毛病：
      </p>
      <ul>
        <li><strong>体积大</strong>：会把完整的类名、字段元信息都写进字节流，传一个小对象也很臃肿。</li>
        <li><strong>慢</strong>：序列化和反序列化的 CPU 开销高，高并发下成为瓶颈。</li>
        <li><strong>不能跨语言</strong>：生成的字节只有 Java 认得，对端是 Go、C++ 就彻底没法用。</li>
        <li><strong>安全漏洞</strong>：反序列化任意字节流可能触发恶意类的构造，历史上爆出过大量反序列化漏洞。</li>
        <li><strong>侵入性</strong>：每个要传输的类都得实现 <code>Serializable</code>，还要操心 <code>serialVersionUID</code>。</li>
      </ul>

      <h3>常用的替代方案</h3>
      <p>
        正因为原生序列化不堪用，RPC 框架普遍换成更高效的序列化库，各有取舍：
      </p>
      <ul>
        <li><strong>Hessian2</strong>：Dubbo 的<strong>默认</strong>方案，二进制、比 Java 原生快且小，支持跨语言，综合最均衡。</li>
        <li><strong>Protobuf</strong>：Google 出品，体积最小、速度最快、强跨语言，但需要写 <em>IDL</em>（.proto 文件）再生成代码，稍重。</li>
        <li><strong>Kryo</strong>：序列化非常快、体积小，但<strong>偏 Java 专用</strong>，跨语言支持弱。</li>
        <li><strong>JSON</strong>（如 fastjson2）：文本格式、人可读、调试方便、天然跨语言，但体积大、解析相对慢。</li>
      </ul>

      <Example title="传一个 User 对象，各方案体积差多少">
        <p>
          假设要传 <code>User(id=1, name=张三, age=28)</code>，不同序列化方式产出的字节量大致是这样的量级（示意）：
        </p>
        <ul>
          <li><code>Java 原生</code> · 约 200+ 字节（夹带大量类元信息）</li>
          <li><code>JSON</code> · 约 50 字节（含字段名「id」「name」「age」等文本）</li>
          <li><code>Hessian2</code> · 约 35 字节（二进制，紧凑）</li>
          <li><code>Protobuf</code> · 约 15 字节（用字段编号代替字段名，最紧凑）</li>
        </ul>
        <p>
          数字只是示意，但量级关系是真实的：<strong>Protobuf 最省、Hessian2 次之、JSON 偏大、Java 原生最臃肿</strong>。
          在每秒几万次调用的系统里，这点差距会被放大成巨大的带宽和 CPU 成本。
        </p>
      </Example>

      <SerializationCompare />

      <h2>协议层：Dubbo 协议 vs HTTP</h2>
      <p>
        序列化解决「对象怎么变字节」，<strong>协议</strong>解决「这些字节怎么在网络上组织和传输」。
        Dubbo 默认用自家的 <em>Dubbo 协议</em>：
      </p>
      <ul>
        <li><strong>单一长连接</strong>：消费端和提供端之间维持一条复用的 TCP 长连接，多次调用共用，避免反复建连。</li>
        <li><strong>二进制头</strong>：协议头是固定长度的二进制（魔数、请求 ID、序列化类型、数据长度等），解析快、开销小。</li>
      </ul>
      <p>
        对比一下 HTTP：HTTP 是<strong>文本协议</strong>，头部是一行行可读的文本（<code>Content-Type</code> 之类），
        人可读、通用性强，但头部冗长、解析更重，早期 HTTP/1.1 还容易一请求一连接。
        所以追求极致性能的内部 RPC 多用二进制私有协议，而对外、要穿网关的接口才更常用 HTTP。
      </p>

      <KeyIdea title="序列化和协议是两件事">
        <p>
          别把序列化和协议混为一谈。<strong>序列化</strong>管的是「一个对象怎么编码成字节」（Hessian2、Protobuf……）；
          <strong>协议</strong>管的是「一次请求的字节怎么组织、怎么在连接上收发」（Dubbo 协议、HTTP……）。
          二者可以自由组合：Dubbo 协议里可以塞 Hessian2 的字节，也可以塞 Kryo 的字节。
        </p>
      </KeyIdea>

      <Callout variant="tip" title="到底怎么选">
        <p>
          选型就是在三个维度间权衡：<strong>性能</strong>（Protobuf、Kryo 强）、
          <strong>跨语言</strong>（Protobuf、Hessian2、JSON 行，Kryo 弱）、
          <strong>易用性</strong>（JSON、Hessian2 免 IDL，Protobuf 要写 .proto）。
          纯 Java 内部、要极致性能可选 Kryo；要跨语言又怕麻烦用 Hessian2（Dubbo 默认）；
          多语言、长期演进且能接受 IDL 选 Protobuf；要可读、好调试用 JSON。
        </p>
      </Callout>

      <h3>实战 / 面试怎么答</h3>
      <p>
        被问「为什么不用 Java 原生序列化」，按这几条答：
        <strong>体积大、速度慢、不能跨语言、有安全漏洞、还要求实现 Serializable</strong>。
        再追问「那用什么」，答 <strong>Dubbo 默认 Hessian2，要极致性能上 Protobuf 或 Kryo，要可读用 JSON</strong>，
        并点明<strong>序列化和协议是两层，可以自由组合</strong>——这样就答到点上了。
      </p>

      <Practice title="给 Dubbo 配置序列化方式">
        <p>
          Dubbo 的序列化方式可以全局配置，也可以在单个服务上覆盖。下面是最常见的 yml 配置：
        </p>
        <CodeBlock lang="yaml" title="application.yml 配置序列化" code={dubboSerializeCode} />
        <p>
          试着把 <code>serialization</code> 从 <code>hessian2</code> 改成 <code>kryo</code>，
          压测同一个接口，观察吞吐和字节量的变化，亲手感受一下不同序列化方案的差距。
        </p>
      </Practice>

      <Summary
        points={[
          'Java 原生序列化的五宗罪：体积大、慢、不能跨语言、有安全漏洞、要求实现 Serializable。',
          'Hessian2 是 Dubbo 默认，二进制、跨语言、综合均衡，是最常用的选择。',
          'Protobuf 最小最快、强跨语言但需写 IDL；Kryo 快但偏 Java；JSON 可读但体积大。',
          '协议层：Dubbo 协议用单一长连接 + 二进制头，对比 HTTP 的文本协议更紧凑、解析更快。',
          '序列化（对象怎么变字节）和协议（字节怎么收发）是两件事，可以自由组合。',
          '选型在性能、跨语言、易用性之间权衡，可在 application.yml 里用 serialization 配置。',
        ]}
      />
    </>
  )
}
