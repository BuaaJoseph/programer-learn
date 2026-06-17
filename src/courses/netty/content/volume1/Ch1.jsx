import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pipelineSnippet = `// 一条 Channel 一条 Pipeline，Handler 按顺序串成责任链
ch.pipeline()
  .addLast("decoder", new MyProtocolDecoder())   // 入站：字节 -> 对象
  .addLast("encoder", new MyProtocolEncoder())   // 出站：对象 -> 字节
  .addLast("biz", new BizHandler());             // 业务处理

// 入站事件（read）从 head 向 tail 依次经过 InboundHandler
// 出站事件（write）从 tail 向 head 依次经过 OutboundHandler`

const ctxSnippet = `public class BizHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        // ctx 代表「本 Handler 在 Pipeline 中的节点」
        // ctx.writeAndFlush 从「当前节点」往前找出站 Handler
        ctx.writeAndFlush(response);
        // 对比：ctx.channel().writeAndFlush 会从 tail 重新走整条出站链
    }
}`

const byteBufSnippet = `// ByteBuf 读写指针分离，无需 flip
ByteBuf buf = ctx.alloc().buffer();   // 由分配器分配（默认池化堆外）
buf.writeInt(123);                    // writerIndex 前移
buf.writeBytes(data);
int v = buf.readInt();                // readerIndex 前移
// 结构：[已读 readerIndex] [可读 writerIndex] [可写 capacity]
buf.release();                        // 引用计数 -1，归零才回收（堆外内存关键）`

const rebuildSelectorSnippet = `// Netty 规避空轮询 Bug 的思路（简化）
long time = System.nanoTime();
int selected = selector.select(timeoutMillis);
if (selected == 0 && (System.nanoTime() - time) < timeoutMillis) {
    selectCnt++;                          // 本应阻塞却立刻返回 0：可疑的空轮询
}
if (selectCnt >= SELECTOR_AUTO_REBUILD_THRESHOLD) {  // 默认 512 次
    rebuildSelector();                    // 新建一个 Selector，把 Channel 迁移过去
    selectCnt = 0;
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        前两章解决了「为什么快」，这一章落到「由什么构成」。Netty 的核心组件——Channel、ChannelHandlerContext、
        EventLoop、ChannelPipeline、ChannelHandler、ByteBuf——它们各管一摊、彼此咬合，构成了 Netty 的骨架。
        我们逐个讲清职责与关系，再看 Netty 用了哪些设计模式，最后拆解一个经典面试题：JDK NIO 的 epoll 空轮询 Bug，
        以及 Netty 如何「重建 Selector」绕过它。
      </Lead>

      <h2>一、六大核心组件</h2>

      <h3>Channel：一条连接的抽象</h3>
      <p>
        Channel 代表一个<strong>网络连接（或能进行 I/O 操作的载体）</strong>，封装了底层 socket 的读、写、连接、绑定等操作。
        常见实现有 <code>NioServerSocketChannel</code>（服务端监听）和 <code>NioSocketChannel</code>（客户端 / 已建立的连接）。
        每个 Channel 都有自己的生命周期事件（注册、激活、读、读完成、失活、注销）和一条专属的 ChannelPipeline。
      </p>

      <h3>EventLoop：处理 Channel I/O 的线程</h3>
      <p>
        上一章已讲：EventLoop 绑定一条线程，跑死循环处理它名下所有 Channel 的 I/O 事件和任务队列。
        Channel 与 EventLoop 是 N:1，保证同一连接事件串行处理。
      </p>

      <h3>ChannelPipeline：Handler 的责任链</h3>
      <p>
        每个 Channel 创建时都会绑定一条 <strong>ChannelPipeline</strong>，它是一个<strong>双向链表</strong>，
        节点是 ChannelHandler（更准确说是包着 Handler 的 ChannelHandlerContext）。它定义了数据「进出」一个 Channel 时
        要依次经过哪些处理步骤。
      </p>
      <KeyIdea>
        Pipeline 是<strong>责任链 + 双向流动</strong>：<strong>入站</strong>事件（如读到数据 channelRead）从链头 head 向链尾 tail，
        依次经过 <code>ChannelInboundHandler</code>；<strong>出站</strong>事件（如 write）从链尾 tail 向链头 head，
        依次经过 <code>ChannelOutboundHandler</code>。两类 Handler 在同一条链上，按方向各取所需。
      </KeyIdea>
      <CodeBlock lang="java" title="Pipeline 添加 Handler 与流动方向" code={pipelineSnippet} />

      <h3>ChannelHandler：处理逻辑的载体</h3>
      <p>
        真正干活的单元。分两大类：<code>ChannelInboundHandler</code>（处理入站事件，如解码、读业务）和
        <code>ChannelOutboundHandler</code>（处理出站事件，如编码、写出）。常用适配器
        <code>ChannelInboundHandlerAdapter</code>、<code>ChannelOutboundHandlerAdapter</code> 让你只重写关心的方法。
        <code>ChannelDuplexHandler</code> 则同时处理入站与出站（编解码器常继承它）。
      </p>

      <h3>ChannelHandlerContext：Handler 在链中的「位置」</h3>
      <p>
        每个 Handler 加进 Pipeline 时，都会被包进一个 <strong>ChannelHandlerContext</strong>。它代表「这个 Handler 在
        Pipeline 链表中的那个节点」，是 Handler、Pipeline、Channel 三者之间的桥梁。通过它能拿到 Channel、Pipeline、
        EventLoop，也能向链的前后传播事件。
      </p>
      <Callout variant="warn" title="ctx.write 与 channel.write 的区别（高频）">
        <code>ctx.writeAndFlush(msg)</code> 从<strong>当前 Handler 节点</strong>开始往前（向 head）找出站 Handler；
        <code>ctx.channel().writeAndFlush(msg)</code> 则从 <strong>tail 重新走完整条出站链</strong>。
        若你在某个出站 Handler 之后又用 channel.write，会让消息重新经过前面已经处理过的出站 Handler，可能重复编码或死循环。
        理解这点要紧扣「ctx = 节点，channel/pipeline = 整条链」。
      </Callout>
      <CodeBlock lang="java" title="ctx 代表 Handler 在链中的节点" code={ctxSnippet} />

      <h3>ByteBuf：Netty 的字节容器</h3>
      <p>
        Netty 不用 JDK 的 <code>ByteBuffer</code>，而是自造 <code>ByteBuf</code>。核心改进：
        <strong>读写指针分离</strong>（readerIndex 与 writerIndex 各自独立），读写切换<strong>不需要 flip</strong>——
        JDK ByteBuffer 只有一个 position，读写切换得 flip()，极易用错。ByteBuf 还支持自动扩容、引用计数、池化与堆外内存。
      </p>
      <CodeBlock lang="java" title="ByteBuf：读写指针分离 + 引用计数" code={byteBufSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>JDK ByteBuffer</th><th>Netty ByteBuf</th></tr>
        </thead>
        <tbody>
          <tr><td>读写指针</td><td>单 position，需 flip</td><td>readerIndex/writerIndex 分离，免 flip</td></tr>
          <tr><td>扩容</td><td>固定容量，不能自动扩</td><td>可自动扩容</td></tr>
          <tr><td>池化</td><td>无</td><td>支持池化复用（PooledByteBufAllocator）</td></tr>
          <tr><td>引用计数</td><td>无</td><td>有，配合堆外内存回收</td></tr>
        </tbody>
      </table>

      <Example title="一次读请求，组件如何协作">
        <p>
          数据到达 → EventLoop 的 Selector 感知 OP_READ → 从 Channel 读出字节封进 ByteBuf →
          沿 Pipeline 从 head 向 tail 触发 channelRead，依次经过解码器（字节→对象）、业务 Handler →
          业务处理完调 ctx.writeAndFlush(响应) → 出站事件从该节点向 head 经过编码器（对象→字节）→
          最终写回 Channel 的 socket。ChannelHandlerContext 全程负责事件在链上传播。
        </p>
      </Example>

      <h2>二、Netty 采用了哪些设计模式</h2>
      <p>这是考察「设计功底」的高频题。Netty 是设计模式的活教材，挑最典型的几个说，并说出「用在哪、解决什么」：</p>
      <table>
        <thead>
          <tr><th>设计模式</th><th>Netty 中的体现</th></tr>
        </thead>
        <tbody>
          <tr><td>责任链模式</td><td>ChannelPipeline 把多个 Handler 串成链，事件沿链传递，每个 Handler 处理或传递</td></tr>
          <tr><td>观察者 / 事件驱动</td><td>ChannelFuture + GenericFutureListener，操作完成后回调监听器（异步通知）</td></tr>
          <tr><td>工厂模式</td><td>通过 channel(NioServerSocketChannel.class) 反射 + ChannelFactory 创建 Channel；ByteBufAllocator 生产 ByteBuf</td></tr>
          <tr><td>建造者模式</td><td>ServerBootstrap / Bootstrap 链式配置后 bind/connect，典型 Builder</td></tr>
          <tr><td>装饰器模式</td><td>WrappedByteBuf、UnreleasableByteBuf 等对 ByteBuf 增强包装</td></tr>
          <tr><td>适配器模式</td><td>ChannelInboundHandlerAdapter 等适配器，让你只重写关心的方法</td></tr>
          <tr><td>单例模式</td><td>如 ReadTimeoutException、各类共享的常量实例</td></tr>
          <tr><td>策略 / 模板方法</td><td>不同 EventLoop 实现、AbstractByteBuf 模板定义骨架由子类实现细节</td></tr>
        </tbody>
      </table>
      <Callout variant="tip">
        面试别一口气背完所有模式，挑 3 个讲透更有说服力：责任链（Pipeline）、观察者（ChannelFuture 回调）、
        建造者（Bootstrap）。每个都说清「Netty 哪个类用了它、为什么用它能解决什么问题」。
      </Callout>

      <h2>三、JDK NIO 的 epoll 空轮询 Bug 与 Netty 的解法</h2>
      <h3>Bug 是什么</h3>
      <p>
        JDK NIO 的 <code>Selector.select()</code> 本应在<strong>没有就绪事件时阻塞</strong>（直到有事件或超时）。
        但在某些 Linux 内核 + 特定网络异常（如对端异常断连导致 epoll 上报一个本不该处理的事件）下，
        <code>select()</code> 会<strong>立即返回 0（没有任何就绪事件）却不阻塞</strong>。于是外层的 <code>while(true)</code> 循环
        飞速空转，<strong>CPU 直接打满 100%</strong>。这就是著名的 JDK epoll 空轮询 Bug，Oracle 曾标记修复但并未根除。
      </p>
      <Callout variant="warn" title="为什么是「空」轮询">
        正常情况下 select 返回 0 是因为「超时到了」，此时已经阻塞了一段时间，循环频率不高。空轮询 Bug 的反常在于：
        select<strong>没等够超时时间就返回了 0</strong>——本该阻塞却没阻塞，循环以极高频率空跑，烧 CPU。
      </Callout>

      <h3>Netty 怎么绕过</h3>
      <p>
        Netty 无法修改 JDK 的 epoll 实现，于是采用<strong>「检测 + 重建 Selector」</strong>的策略：在 EventLoop 的循环里
        统计「select 过早返回 0 的连续次数」。如果短时间内这种可疑的空轮询累计达到阈值
        （默认 <code>SELECTOR_AUTO_REBUILD_THRESHOLD = 512</code>），就判定触发了空轮询 Bug——此时<strong>新建一个 Selector，
        把原 Selector 上注册的所有 Channel 重新注册到新 Selector，然后丢弃旧的</strong>。换个「干净」的 Selector，
        问题随之消失，计数清零。
      </p>
      <CodeBlock lang="java" title="检测空轮询并重建 Selector（简化思路）" code={rebuildSelectorSnippet} />
      <p>
        这是个典型的「绕过而非根治」工程方案——底层 Bug 在 JDK，Netty 在应用层用一套阈值检测 + 重建机制把它的影响消除，
        对上层完全透明。面试能讲清「Bug 现象（CPU 100% 空转）→ 根因（select 提前返回 0）→ Netty 解法（计数达阈值则重建 Selector 并迁移 Channel）」这条链，就足够亮眼。
      </p>

      <h2>四、面试精讲</h2>

      <h3>Q1：说说 Netty 的核心组件及关系。</h3>
      <p>
        Channel（连接抽象）绑定一条 EventLoop（处理其 I/O 的线程）和一条 ChannelPipeline（Handler 责任链）；
        Pipeline 里每个 ChannelHandler（处理逻辑）被包成一个 ChannelHandlerContext（链中节点）；数据用 ByteBuf 承载，
        沿 Pipeline 入站从 head→tail、出站从 tail→head 流动。一句话：<strong>Channel 是连接，EventLoop 是线程，
        Pipeline 是流水线，Handler 是工序，Context 是工序在流水线上的位置，ByteBuf 是流过的物料。</strong>
      </p>

      <h3>Q2：入站和出站事件的传播方向？</h3>
      <p>
        入站（如 channelActive、channelRead）从 head 向 tail，依次触发 InboundHandler；
        出站（如 write、connect、bind）从 tail 向 head，依次触发 OutboundHandler。
        <strong>易错点</strong>：addLast 的添加顺序不等于执行顺序——入站按添加顺序，出站按添加的逆序执行。
        所以解码器（入站）通常加在前、编码器（出站）的位置要考虑出站逆序流动。
      </p>

      <h3>Q3：ctx.write() 和 ctx.channel().write() 有什么区别？</h3>
      <p>
        ctx.write 从<strong>当前 Handler 节点</strong>向前（head 方向）找下一个出站 Handler 开始传播；
        channel.write（或 pipeline.write）从 <strong>tail</strong> 开始，重新走完整条出站链。
        在出站 Handler 内部想继续往下传，应该用 ctx.write，否则会重复经过本节点之前的出站 Handler，
        轻则重复编码，重则死循环。
      </p>

      <h3>Q4：Netty 的 ByteBuf 比 JDK ByteBuffer 好在哪？</h3>
      <p>
        ① 读写指针分离，免 flip，不易出错；② 可自动扩容；③ 支持池化复用，降 GC；④ 有引用计数，配合堆外内存安全回收；
        ⑤ 支持 CompositeByteBuf 等零拷贝操作。<strong>追问</strong>：引用计数怎么用？ByteBuf 实现 ReferenceCounted，
        retain() 计数 +1、release() 计数 -1，归零才真正回收底层内存（尤其堆外）。谁最后使用谁 release，
        否则堆外内存泄漏；Netty 也提供内存泄漏检测（ResourceLeakDetector）。
      </p>

      <h3>Q5：Netty 用了哪些设计模式？挑一个详细说。</h3>
      <p>
        责任链（Pipeline）、观察者（ChannelFuture/Listener）、工厂（ChannelFactory）、建造者（Bootstrap）、
        装饰器（WrappedByteBuf）、适配器（HandlerAdapter）等。详细说责任链：ChannelPipeline 把 Handler 串成双向链表，
        每个事件沿链传播，每个 Handler 可以处理后继续传给下一个、也可以拦截不再往下——好处是<strong>处理逻辑解耦、可插拔组合</strong>，
        加解密、日志、编解码、业务各做一个 Handler，按需 addLast 即可。
      </p>

      <h3>Q6：JDK NIO 的空轮询 Bug 是什么？Netty 怎么解决？</h3>
      <p>
        Bug：某些 Linux 内核下 Selector.select() 本应阻塞却提前返回 0，导致 EventLoop 的 while 循环空转，CPU 飙到 100%。
        Netty 解法：在循环里统计「select 过早返回 0」的连续次数，达到阈值（默认 512）就判定为空轮询，
        新建一个 Selector 并把所有 Channel 迁移过去、替换旧 Selector，从而绕过该 Bug。属于应用层「绕过」方案，对上层透明。
      </p>

      <Summary
        points={[
          '六大组件：Channel（连接）、EventLoop（处理 I/O 的线程）、ChannelPipeline（Handler 责任链）、ChannelHandler（处理逻辑）、ChannelHandlerContext（Handler 在链中的节点）、ByteBuf（字节容器）。',
          'Pipeline 是双向责任链：入站事件 head→tail 走 InboundHandler，出站事件 tail→head 走 OutboundHandler；入站按添加顺序、出站按逆序执行。',
          'ctx.write 从当前节点向前传播，channel.write 从 tail 重走整条出站链，混用易重复编码或死循环。',
          'ByteBuf 优于 ByteBuffer：读写指针分离免 flip、自动扩容、池化、引用计数（配合堆外内存安全回收）、支持零拷贝。',
          'Netty 是设计模式活教材：责任链（Pipeline）、观察者（ChannelFuture）、工厂、建造者（Bootstrap）、装饰器、适配器等。',
          '空轮询 Bug：select 本应阻塞却提前返回 0 致 CPU 100% 空转；Netty 用「连续空轮询达阈值 512 则重建 Selector 并迁移 Channel」绕过。',
        ]}
      />
    </article>
  )
}
