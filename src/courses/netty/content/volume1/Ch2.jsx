import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const stickyDemoSnippet = `// 客户端连发两条消息
ctx.writeAndFlush("ABC");
ctx.writeAndFlush("DEF");

// 服务端可能读到的几种情况（TCP 是字节流，不保证一发一收）：
// 1) 正常：收到 "ABC"，再收到 "DEF"
// 2) 粘包：一次收到 "ABCDEF"          —— 两条粘在一起
// 3) 拆包/半包：先收到 "ABCD"，再收到 "EF"  —— 一条被拆开
// 4) 混合：先 "AB"，再 "CDEF"`

const fixedLengthSnippet = `// 方案一：定长。每条消息固定 N 字节，不足补空格
ch.pipeline().addLast(new FixedLengthFrameDecoder(20));
// 收到的每个 ByteBuf 恰好 20 字节，简单但浪费空间、不灵活`

const delimiterSnippet = `// 方案二：分隔符。以特定字节序列作为消息边界
ByteBuf delimiter = Unpooled.copiedBuffer("$_".getBytes());
ch.pipeline().addLast(new DelimiterBasedFrameDecoder(1024, delimiter));

// 特例：以换行符分隔
ch.pipeline().addLast(new LineBasedFrameDecoder(1024));`

const lengthFieldSnippet = `// 方案三（最常用）：长度字段。消息头里写明消息体长度
// 报文格式：[4 字节 length][length 字节的 body]
ch.pipeline().addLast(new LengthFieldBasedFrameDecoder(
    1024 * 1024,  // maxFrameLength：单条消息最大长度，防超大包攻击
    0,            // lengthFieldOffset：长度字段从第 0 字节开始
    4,            // lengthFieldLength：长度字段占 4 字节
    0,            // lengthAdjustment：length 之后到 body 的修正（这里 length 就是 body 长度）
    4));          // initialBytesToStrip：解析后剥掉前 4 字节长度头，只把 body 交给后续 Handler`

const customCodecSnippet = `// 自定义编解码：配合 LengthFieldPrepender 在出站时自动写入长度头
ch.pipeline()
  .addLast(new LengthFieldBasedFrameDecoder(1048576, 0, 4, 0, 4)) // 入站：拆出完整帧
  .addLast(new LengthFieldPrepender(4))                            // 出站：自动加 4 字节长度头
  .addLast(new StringDecoder(CharsetUtil.UTF_8))                   // 入站：字节 -> String
  .addLast(new StringEncoder(CharsetUtil.UTF_8))                   // 出站：String -> 字节
  .addLast(new BizHandler());                                      // 业务`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这是 Netty 面试里最「实战」也最容易暴露真假水平的一题：TCP 的粘包与拆包。它本质是个协议设计问题——
        TCP 是面向字节流的，根本不懂你的「一条消息」从哪到哪。这一章先讲清粘包/半包为什么必然发生，
        再系统过一遍 Netty 提供的几种解码器解决方案（定长、分隔符、长度字段），最后串起编解码器与 Pipeline 的处理流程。
      </Lead>

      <h2>一、什么是粘包与拆包（半包）</h2>
      <p>
        发送端连续发了两条应用层消息 A、B，接收端读取时可能出现：一次性读到 A+B 粘在一起（<strong>粘包</strong>）、
        或者一条消息 A 被分成两次读到（<strong>拆包 / 半包</strong>），甚至两者混合。注意：<strong>这不是 bug，是 TCP 的固有特性</strong>。
      </p>
      <CodeBlock lang="java" title="同样发两条，接收端可能读成各种样子" code={stickyDemoSnippet} />
      <KeyIdea>
        根因一句话：<strong>TCP 是面向字节流的、没有消息边界</strong>。它只保证字节按序、可靠到达，
        但「这些字节属于哪一条应用消息」TCP 完全不管——边界要由<strong>应用层协议</strong>自己定义。
      </KeyIdea>

      <h2>二、粘包 / 拆包的成因</h2>
      <p>从发送到接收，多个环节都会造成它：</p>
      <ul>
        <li><strong>TCP 字节流无边界</strong>：根本原因。TCP 把数据当连续字节流，发送 N 次 write 不等于接收 N 次 read。</li>
        <li><strong>Nagle 算法</strong>：为提高网络利用率，TCP 会把多个小包<strong>攒一攒合并</strong>再发——多条小消息被粘成一个 TCP 段（粘包）。可用 <code>TCP_NODELAY</code> 关闭。</li>
        <li><strong>MSS / MTU 限制</strong>：一条消息超过单个 TCP 段最大长度（MSS）时，会被<strong>拆成多个段</strong>分别发送（拆包）。</li>
        <li><strong>接收方缓冲区与读取节奏</strong>：接收缓冲区里可能已堆了多条消息，应用一次 read 把它们一起读出来（粘包）；或缓冲区只到了半条，应用就读了（半包）。</li>
        <li><strong>滑动窗口 / 流量控制</strong>：发送数据量受窗口限制，也会影响数据被拆分发送的形态。</li>
      </ul>
      <Example title="一个直观例子">
        <p>
          你寄信，邮局（TCP）只保证「这一袋字母按顺序、不丢地送到」，但不管「哪几个字母拼成一个单词」。
          收信人要自己知道断词规则——要么每个单词固定长度、要么单词间用空格隔开、要么先告诉他「下一个单词有几个字母」。
          这三种「断词规则」正好对应下面三种解码方案。
        </p>
      </Example>
      <Callout variant="note" title="UDP 为什么没有粘包问题">
        UDP 是面向数据报（message）的，每个 sendto 对应一个独立数据报，有天然边界，接收方一次 recv 收到的就是完整一条。
        粘包/拆包是 TCP 这种<strong>字节流</strong>协议特有的问题。这是个常见追问。
      </Callout>

      <h2>三、Netty 如何解决：四类解码器</h2>
      <p>
        解决思路统一：<strong>在应用层定义消息边界，让解码器把字节流切回一条条完整消息</strong>。Netty 内置了开箱即用的解码器，
        无需自己缓存半包、拼接粘包。它们都继承自 <code>ByteToMessageDecoder</code>，内部维护一个累积缓冲区，
        凑齐一条完整消息才向后传，否则继续等后续字节——半包/粘包都被它消化掉。
      </p>

      <h3>方案一：定长 FixedLengthFrameDecoder</h3>
      <p>
        约定每条消息固定 N 字节，不足的补位。解码器每攒满 N 字节就切一刀。<strong>优点</strong>：实现极简。
        <strong>缺点</strong>：消息长度差异大时浪费空间、不灵活，实际用得少。
      </p>
      <CodeBlock lang="java" title="定长解码器" code={fixedLengthSnippet} />

      <h3>方案二：分隔符 DelimiterBasedFrameDecoder / LineBasedFrameDecoder</h3>
      <p>
        约定用特殊字节序列作为消息结尾（如 <code>$_</code> 或换行符）。解码器扫描到分隔符就切一条。
        <code>LineBasedFrameDecoder</code> 是以换行符为分隔的特例（适合文本协议如 Redis、HTTP 头）。
        <strong>缺点</strong>：消息体里若出现分隔符需要转义，且要逐字节扫描找分隔符。
      </p>
      <CodeBlock lang="java" title="分隔符解码器" code={delimiterSnippet} />

      <h3>方案三：长度字段 LengthFieldBasedFrameDecoder（最常用）</h3>
      <p>
        在消息头里放一个<strong>长度字段</strong>，写明消息体有多少字节。解码器先读长度字段，再据此读取相应字节数，
        凑齐才算一条完整消息。这是<strong>自定义二进制协议的主流做法</strong>——Dubbo、RocketMQ 等都用这种「长度 + 内容」帧格式。
        它的几个构造参数最值得记牢：
      </p>
      <table>
        <thead>
          <tr><th>参数</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>maxFrameLength</td><td>单帧最大长度，防止超大包导致 OOM 或攻击</td></tr>
          <tr><td>lengthFieldOffset</td><td>长度字段从报文第几字节开始（前面可能有魔数等）</td></tr>
          <tr><td>lengthFieldLength</td><td>长度字段本身占几个字节（如 4）</td></tr>
          <tr><td>lengthAdjustment</td><td>长度值的修正：length 字段值与「剩余 body 长度」的差值</td></tr>
          <tr><td>initialBytesToStrip</td><td>解析后从头部剥掉多少字节（通常剥掉长度头，只留 body）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="长度字段解码器：最通用的方案" code={lengthFieldSnippet} />
      <Callout variant="tip">
        出站方向配一个 <code>LengthFieldPrepender(4)</code>，它会在写出时自动给消息加上 4 字节长度头，
        和入站的 LengthFieldBasedFrameDecoder 正好对称。一进一出成对使用，自定义协议就稳了。
      </Callout>

      <h3>方案四：自定义编解码器</h3>
      <p>
        协议复杂时（魔数 + 版本 + 序列化方式 + 长度 + body），可继承 <code>ByteToMessageDecoder</code> 自己写入站解码、
        继承 <code>MessageToByteEncoder</code> 写出站编码，或用 <code>MessageToMessageCodec</code> 双向。
        核心仍是「靠长度字段或边界标记切出完整帧」，再做序列化/反序列化。
      </p>

      <table>
        <thead>
          <tr><th>方案</th><th>边界规则</th><th>优点</th><th>缺点 / 适用</th></tr>
        </thead>
        <tbody>
          <tr><td>定长</td><td>固定 N 字节</td><td>最简单</td><td>浪费空间，少用</td></tr>
          <tr><td>分隔符</td><td>特殊字节/换行</td><td>适合文本协议</td><td>需转义、要扫描</td></tr>
          <tr><td>长度字段</td><td>头部声明 body 长度</td><td>通用、高效、主流</td><td>需设计协议头</td></tr>
          <tr><td>自定义</td><td>复合协议头</td><td>最灵活</td><td>实现成本高</td></tr>
        </tbody>
      </table>

      <h2>四、编解码器与 Pipeline 处理流程</h2>
      <p>
        编解码器本质就是<strong>特殊的 ChannelHandler</strong>，加进 Pipeline 后随事件流动工作。把上一章的入站/出站方向用到这里：
      </p>
      <ul>
        <li><strong>入站（读）方向</strong>：socket 字节 → ByteBuf →（先经过）<strong>帧解码器</strong>（如 LengthFieldBasedFrameDecoder）切出一条完整帧 →（再经过）<strong>解码器</strong>（如 StringDecoder / 反序列化）转成业务对象 → 业务 Handler。</li>
        <li><strong>出站（写）方向</strong>：业务对象 →（经过）<strong>编码器</strong>（如 StringEncoder / 序列化）转成字节 →（经过）<strong>LengthFieldPrepender</strong> 加长度头 → 写回 socket。</li>
      </ul>
      <KeyIdea>
        Handler 的<strong>添加顺序</strong>很关键：解码器要放在业务 Handler <em>之前</em>（入站从前往后，先解码再处理）；
        编码器因为出站是逆序流动，要保证它在出站路径上被业务写出的消息经过。一般把「帧解码器 + 解码器 + 编码器 + 业务」
        按合适顺序 addLast，即可让一条消息正确地「字节→帧→对象→业务→对象→字节」走一圈。
      </KeyIdea>
      <CodeBlock lang="java" title="一套对称的编解码 Pipeline" code={customCodecSnippet} />

      <Example title="为什么帧解码器必须在解码器之前">
        <p>
          如果直接用 StringDecoder 而不先用帧解码器，StringDecoder 会把「这次 read 到的所有字节」一股脑转成字符串——
          粘包时把两条消息拼一起、半包时给半条。必须先用 LengthFieldBasedFrameDecoder 按长度切出<strong>恰好一条完整帧</strong>，
          再交给 StringDecoder，才能保证「一次解码 = 一条完整消息」。这就是「先切帧、再解码」的顺序铁律。
        </p>
      </Example>

      <h2>五、面试精讲</h2>

      <h3>Q1：什么是 TCP 粘包和拆包？为什么会发生？</h3>
      <p>
        粘包：接收方一次读到多条应用消息粘在一起；拆包/半包：一条应用消息被分成多次读到。
        根因是 <strong>TCP 面向字节流、没有消息边界</strong>；具体诱因有 Nagle 算法合并小包（粘）、消息超过 MSS 被拆（拆）、
        接收缓冲区堆积或只到半条（粘/半）、滑动窗口流控影响发送形态。
        <strong>对比 UDP</strong>：UDP 面向数据报，有天然边界，不存在此问题。
      </p>

      <h3>Q2：粘包拆包怎么解决？Netty 提供了哪些手段？</h3>
      <p>
        本质是<strong>在应用层定义消息边界</strong>，常见三招：① 定长（FixedLengthFrameDecoder）；
        ② 分隔符（DelimiterBasedFrameDecoder / LineBasedFrameDecoder）；
        ③ 长度字段（LengthFieldBasedFrameDecoder，头部声明 body 长度，最常用）。
        复杂协议可自定义 ByteToMessageDecoder。Netty 这些解码器内部维护累积缓冲，自动消化半包/粘包，凑齐一条才向后传。
      </p>

      <h3>Q3：LengthFieldBasedFrameDecoder 的几个参数分别是什么？</h3>
      <p>
        maxFrameLength（单帧最大长度，防超大包）、lengthFieldOffset（长度字段起始偏移）、
        lengthFieldLength（长度字段占几字节）、lengthAdjustment（长度值与剩余 body 的修正差）、
        initialBytesToStrip（解析后剥掉头部多少字节）。最常见的「4 字节长度 + body」配置是
        <code>(max, 0, 4, 0, 4)</code>。<strong>易错点</strong>：lengthAdjustment 用于「长度字段表示的不只是 body」的情况，
        比如长度还包含了头部其他字段时要修正。
      </p>

      <h3>Q4：为什么 Netty 的解码器能解决粘包，而原生 NIO 不能？</h3>
      <p>
        不是 Netty 比 NIO「更懂 TCP」，而是 Netty 在 <code>ByteToMessageDecoder</code> 里内置了<strong>累积缓冲 + 半包处理</strong>逻辑：
        每次读到数据先追加到累积 buffer，再尝试按规则切帧——切得出完整帧就向后传，切不出就保留等下次。
        原生 NIO 没这套机制，你得自己写累积、判断、切分，极易出错。Netty 把这套通用逻辑封装成了开箱即用的解码器。
      </p>

      <h3>Q5：编码器和解码器在 Pipeline 里的顺序怎么放？</h3>
      <p>
        入站是 head→tail，所以「帧解码器」要在「业务解码器」之前、二者都在业务 Handler 之前，保证「先切帧→再转对象→才到业务」。
        出站是 tail→head 逆序，编码器要处在业务写出消息会经过的出站路径上。实践中常用对称组合：
        LengthFieldBasedFrameDecoder + LengthFieldPrepender + 业务解码/编码器 + BizHandler。
        <strong>易错点</strong>：把 StringDecoder 放在帧解码器前面，会因为没切帧而把粘包/半包直接转成错误字符串。
      </p>

      <h3>Q6：关闭 Nagle 算法能彻底解决粘包吗？</h3>
      <p>
        不能。<code>TCP_NODELAY</code> 关闭 Nagle 只是减少「小包被攒着合并」这一种粘包诱因，但拆包（超 MSS）、
        接收缓冲区堆积等仍会造成粘包/半包。根治办法只能是<strong>应用层定义消息边界 + 用解码器切帧</strong>，
        关 Nagle 顶多算降低延迟的辅助手段，不是解决粘包的正解。这是个容易答错的追问。
      </p>

      <h3>Q7：自定义协议一般怎么设计帧格式？</h3>
      <p>
        实战中典型的二进制协议帧由几部分组成：<strong>魔数</strong>（如 2 字节，快速识别/拒绝非法连接）、
        <strong>版本号</strong>（协议升级兼容）、<strong>序列化类型</strong>（标明 body 用 JSON / Protobuf / 自定义）、
        <strong>消息类型</strong>（请求/响应/心跳）、<strong>长度字段</strong>（body 字节数）、<strong>body</strong>（真正的业务数据）。
        解码时用 LengthFieldBasedFrameDecoder 按长度字段切出完整帧（通过 lengthFieldOffset 跳过前面的魔数等头部），
        再读头部各字段、按序列化类型反序列化 body。Dubbo、RocketMQ 的协议都是这个套路。
        <strong>追问</strong>：为什么要魔数？为了在连接入口快速校验「这是不是我的协议」，挡掉乱连和探测流量，
        避免把垃圾字节当成长度字段解析出一个巨大的 frame 导致内存问题（再叠加 maxFrameLength 兜底）。
      </p>

      <Summary
        points={[
          '粘包/拆包根因：TCP 面向字节流、没有消息边界，N 次 write 不等于 N 次 read；UDP 面向数据报有边界故无此问题。',
          '成因：TCP 流无边界（根本）、Nagle 合并小包（粘）、超 MSS 被拆（拆）、接收缓冲堆积或半条（粘/半）、滑动窗口流控。',
          '解决本质：应用层定义消息边界。Netty 三招：定长 FixedLengthFrameDecoder、分隔符 DelimiterBased/LineBased、长度字段 LengthFieldBasedFrameDecoder（最常用）。',
          'LengthFieldBasedFrameDecoder 五参数：maxFrameLength、lengthFieldOffset、lengthFieldLength、lengthAdjustment、initialBytesToStrip；出站配 LengthFieldPrepender 自动加长度头。',
          '解码器继承 ByteToMessageDecoder，内部累积缓冲 + 半包处理，凑齐完整帧才向后传——这是原生 NIO 要自己写的部分。',
          'Pipeline 顺序铁律：先帧解码器切出完整帧、再业务解码器转对象、最后业务 Handler；关 Nagle 不能彻底解决粘包，只是辅助降延迟。',
        ]}
      />
    </article>
  )
}
