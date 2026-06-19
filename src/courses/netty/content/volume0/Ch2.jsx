import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const bossWorkerSnippet = `// 主从 Reactor：boss 接连接，worker 处理 I/O
EventLoopGroup boss = new NioEventLoopGroup(1);    // 主 Reactor，通常 1 条线程
EventLoopGroup worker = new NioEventLoopGroup();   // 从 Reactor，默认 2*CPU 核数

ServerBootstrap b = new ServerBootstrap();
b.group(boss, worker)                              // 两个 group 即主从模型
 .channel(NioServerSocketChannel.class)
 .childHandler(new ChannelInitializer<SocketChannel>() {
     protected void initChannel(SocketChannel ch) {
         ch.pipeline().addLast(new BizHandler());
     }
 });
b.bind(8080).sync();`

const eventLoopRunSnippet = `// EventLoop 的本质：一个线程跑一个死循环（简化示意）
for (;;) {
    int ready = selector.select(timeout);   // 1. 等就绪的 I/O 事件
    if (ready > 0) {
        processSelectedKeys();              // 2. 处理 accept/read/write 等 I/O 事件
    }
    runAllTasks();                          // 3. 处理任务队列里的普通任务/定时任务
    // ioRatio 控制 I/O 与任务处理的时间配比，默认 50:50
}`

const inEventLoopSnippet = `// Netty 保证同一个 Channel 的所有操作都在它绑定的 EventLoop 线程里执行
public void write(Object msg) {
    if (eventLoop.inEventLoop()) {          // 当前就在本 EventLoop 线程
        doWrite(msg);                       // 直接执行，无需加锁
    } else {
        eventLoop.execute(() -> doWrite(msg)); // 否则封装成任务投递过去
    }
}`

const compositeSnippet = `// 零拷贝之一：CompositeByteBuf 逻辑合并，避免内存拷贝
ByteBuf header = ...;   // 协议头
ByteBuf body = ...;     // 消息体
CompositeByteBuf composite = Unpooled.compositeBuffer();
composite.addComponents(true, header, body);  // 不复制字节，只是逻辑上拼成一个

// 对比：传统做法要 new 一个大数组再两次 System.arraycopy
// byte[] merged = new byte[header.readableBytes() + body.readableBytes()];
// ... 两次拷贝`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们知道 NIO 用多路复用省线程。但「一个 Selector 一个线程」只是起点——真要做高性能服务器，
        还得回答：用几个线程？谁负责接连接、谁负责读写、谁负责业务？这就是 <strong>Reactor 线程模型</strong>。
        这一章把 Reactor 的三种形态讲透，对上 Netty 的 BossGroup·WorkerGroup·EventLoop，再回答两道压轴题：
        Netty 为什么这么快、它的「零拷贝」到底零在哪。
      </Lead>

      <h2>一、Reactor 模式：事件来了，分发给谁处理</h2>
      <p>
        Reactor 是一种<strong>事件驱动的处理模式</strong>：有一个（或多个）线程专门负责「等事件、分发事件」，
        称为 Reactor；具体的事件处理逻辑交给 Handler。Reactor 基于多路复用（Selector）感知「哪个连接有事件」，
        然后把事件派发给对应的处理器。按「Reactor 用几个线程、I/O 与业务怎么分工」，演化出三种经典形态。
      </p>

      <h3>① 单 Reactor 单线程</h3>
      <p>
        一个线程一个 Selector，既负责 accept 新连接，又负责所有连接的 read/write，还负责业务处理。
        优点是简单、无锁、无线程切换；缺点是<strong>一旦某个 Handler 处理慢，整个服务全卡住</strong>——
        它把接连接、I/O、业务全压在一条线程上。Redis 的网络模型就接近这种（命令执行单线程），
        但 Redis 业务极快才扛得住，普通业务用这个模型很危险。
      </p>

      <h3>② 单 Reactor 多线程</h3>
      <p>
        Reactor 仍是单线程，负责 accept 和 I/O 读写；但把<strong>耗时的业务处理丢给一个线程池</strong>。
        这样业务慢不会阻塞 I/O。问题在于：所有连接的 accept 和读写仍挤在一个 Reactor 线程上，
        <strong>单线程的 I/O 能力成为瓶颈</strong>，高并发下接连接 + 读写忙不过来。
      </p>

      <h3>③ 主从 Reactor（Netty 采用的模型）</h3>
      <p>
        把 Reactor 拆成两组：<strong>主 Reactor（MainReactor）只负责 accept 新连接</strong>，连接建立后把它注册到
        <strong>从 Reactor（SubReactor）组</strong>；从 Reactor 们各自负责一批连接的 read/write 事件。
        业务处理可再交给业务线程池。这样：接连接和读写分离、读写被多个从 Reactor 分摊，能充分利用多核，
        是高并发服务器的最优解。
      </p>
      <table>
        <thead>
          <tr><th>模型</th><th>accept</th><th>I/O 读写</th><th>业务</th><th>瓶颈</th></tr>
        </thead>
        <tbody>
          <tr><td>单 Reactor 单线程</td><td>同一线程</td><td>同一线程</td><td>同一线程</td><td>业务慢则全卡</td></tr>
          <tr><td>单 Reactor 多线程</td><td>Reactor 线程</td><td>Reactor 线程</td><td>线程池</td><td>单 Reactor I/O 瓶颈</td></tr>
          <tr><td>主从 Reactor</td><td>主 Reactor</td><td>从 Reactor 组</td><td>线程池</td><td>基本无明显瓶颈</td></tr>
        </tbody>
      </table>

      <h2>二、Netty 的线程模型：BossGroup、WorkerGroup、EventLoop</h2>
      <KeyIdea>
        Netty 的线程模型就是<strong>主从 Reactor 多线程模型</strong>的实现：BossGroup 是主 Reactor（接连接），
        WorkerGroup 是从 Reactor 组（处理 I/O）。每个 Group 里有多个 EventLoop，每个 EventLoop 绑定一条线程 + 一个 Selector，
        负责一批 Channel。
      </KeyIdea>
      <CodeBlock lang="java" title="两个 EventLoopGroup 即主从 Reactor" code={bossWorkerSnippet} />
      <p>它的工作流程一步步是这样的：</p>
      <ul>
        <li><strong>BossGroup 的 EventLoop</strong> 轮询 <code>OP_ACCEPT</code> 事件，接收客户端连接，生成代表该连接的 <code>SocketChannel</code>。</li>
        <li>把这个 SocketChannel <strong>注册到 WorkerGroup 中某个 EventLoop 的 Selector</strong> 上（按规则分配，之后这个连接就固定归该 EventLoop 管）。</li>
        <li><strong>WorkerGroup 的 EventLoop</strong> 轮询它名下所有 Channel 的 <code>OP_READ/OP_WRITE</code> 事件，有数据就读出，触发 Pipeline 里的 Handler 链处理。</li>
        <li>Handler 链完成解码、业务、编码、写回。耗时业务可交给独立业务线程池，避免占用 I/O 线程。</li>
      </ul>

      <h3>EventLoop 与 EventLoopGroup 的关系（核心）</h3>
      <p>
        <code>EventLoopGroup</code> 是一组 <code>EventLoop</code> 的容器。每个 <code>EventLoop</code> 内部是<strong>一条线程</strong>，
        跑一个死循环：select 等事件 → 处理 I/O 事件 → 处理任务队列。三个关键事实，面试必答：
      </p>
      <ul>
        <li><strong>一个 EventLoop 在其生命周期内只绑定一条线程</strong>——线程和 EventLoop 是 1:1。</li>
        <li><strong>一个 Channel 一旦注册，整个生命周期只由一个 EventLoop 处理</strong>——Channel 和 EventLoop 是 N:1。</li>
        <li>因此<strong>同一个 Channel 的所有事件都在同一条线程里串行处理</strong>——这就是 Netty 的「无锁化」：你写 Handler 时一般不用加锁，因为同一连接不会被多线程并发处理。</li>
      </ul>
      <CodeBlock lang="java" title="EventLoop 的死循环本质（简化）" code={eventLoopRunSnippet} />
      <Callout variant="note" title="WorkerGroup 默认几条线程">
        <code>NioEventLoopGroup</code> 不传参时，线程数默认为 <code>2 * CPU 核数</code>（可由系统属性
        <code>io.netty.eventLoopThreads</code> 覆盖）。BossGroup 通常设 1 即可——服务端一般只 bind 一个端口，
        一条线程接连接绰绰有余。
      </Callout>

      <h2>三、Netty 性能为什么这么高</h2>
      <p>面试压轴题。把原因归到几个支柱，逐条带「为什么」地说：</p>
      <ol>
        <li><strong>主从 Reactor + NIO 多路复用</strong>：少量线程管海量连接，省去 BIO 的线程爆炸与上下文切换。</li>
        <li><strong>无锁串行化设计</strong>：单 Channel 的处理固定在一个 EventLoop 线程串行执行，避免锁竞争——并发性能往往败在锁上，Netty 从模型上消除了它。</li>
        <li><strong>零拷贝</strong>：CompositeByteBuf 逻辑合并、堆外直接内存、FileRegion 用 <code>sendfile</code> 文件传输，减少内存拷贝与用户态/内核态切换（下一节细讲）。</li>
        <li><strong>内存池（PooledByteBufAllocator）</strong>：用 jemalloc 思路池化 ByteBuf，复用内存、减少 GC 压力与频繁的堆外内存分配/回收。</li>
        <li><strong>高效的 ByteBuf</strong>：读写指针分离（readerIndex/writerIndex），无需像 NIO 的 ByteBuffer 那样 flip 切换模式。</li>
        <li><strong>高效并发组件</strong>：用 FastThreadLocal、MpscQueue 等针对性优化的数据结构提升任务调度与本地变量访问。</li>
        <li><strong>规避 JDK epoll 空轮询 Bug</strong>：自动重建 Selector，避免 CPU 空转 100%（下一章细讲）。</li>
      </ol>
      <KeyIdea>
        一句话答 Netty 为什么快：<strong>合理的线程模型（主从 Reactor + 无锁串行）+ 高效的内存管理（零拷贝 + 内存池）+
        对 JDK NIO 缺陷的修补</strong>，三者叠加。
      </KeyIdea>

      <h2>四、Netty 的零拷贝机制</h2>
      <p>
        「零拷贝」是个容易答偏的词。它其实有两层含义，面试要分清：<strong>操作系统层面的零拷贝</strong>（避免内核态与用户态之间的数据拷贝，
        如 <code>sendfile</code>、<code>mmap</code>），和 <strong>Netty 应用层面的零拷贝</strong>（在 JVM 用户态内减少不必要的字节数组拷贝）。
        Netty 两层都沾。
      </p>
      <h3>Netty 应用层的「零拷贝」</h3>
      <ul>
        <li><strong>CompositeByteBuf</strong>：把多个 ByteBuf <em>逻辑上</em>组合成一个，而不真的拷贝字节合并。常用于「协议头 + 消息体」拼接。</li>
        <li><strong>ByteBuf.slice() / duplicate()</strong>：对同一块底层内存做切片或视图，多个 ByteBuf 共享底层数组，不复制。</li>
        <li><strong>wrap 包装</strong>：<code>Unpooled.wrappedBuffer(byteArray)</code> 直接把已有字节数组包成 ByteBuf，不拷贝。</li>
      </ul>
      <CodeBlock lang="java" title="CompositeByteBuf：逻辑合并，零拷贝" code={compositeSnippet} />
      <h3>依托操作系统的零拷贝</h3>
      <ul>
        <li><strong>堆外直接内存（Direct Buffer）</strong>：用 <code>DirectByteBuf</code> 在堆外分配，Socket 读写时<strong>少一次「堆内 ↔ 堆外」的拷贝</strong>——JDK 的 socket 发送堆内数组前必须先拷到一块堆外内存，直接用堆外内存就省了这步。</li>
        <li><strong>FileRegion + sendfile</strong>：传输文件时用 <code>DefaultFileRegion</code>，底层调操作系统的 <code>sendfile</code>，数据直接从磁盘文件经内核缓冲送到网卡，<strong>不经过用户态</strong>，这是真正的 OS 级零拷贝。</li>
      </ul>
      <Example title="堆外内存为何省一次拷贝">
        <p>
          用堆内数组发数据：JVM 堆内的 byte[] 在 GC 时可能被移动，操作系统的写系统调用拿不到稳定地址，
          所以 JDK 会先把它拷到一块堆外的「临时 DirectByteBuffer」再发——多了一次拷贝。
          Netty 默认用堆外 DirectByteBuf 做 I/O，地址稳定，省掉这次中转拷贝。代价是堆外内存需要手动管理，
          这正是 Netty 引用计数 + 内存池存在的原因。
        </p>
      </Example>
      <Callout variant="warn" title="别把零拷贝说成「完全不拷贝」">
        Netty 的零拷贝是「<strong>减少不必要的拷贝</strong>」，不是字节一次都不动。面试若被追问，要点出两层含义
        （应用层逻辑合并/视图 vs OS 层 sendfile/直接内存），并说清各自省掉的是哪一次拷贝。这正是区分「背过」与「真懂」的地方。
      </Callout>

      <h2>五、面试精讲</h2>

      <h3>Q1：讲讲 Reactor 的三种线程模型，Netty 用的是哪种？</h3>
      <p>
        三种：单 Reactor 单线程（接连接、I/O、业务全在一条线程，简单但业务慢则全卡）；
        单 Reactor 多线程（Reactor 单线程管 accept+I/O，业务交线程池，单 Reactor 仍是 I/O 瓶颈）；
        主从 Reactor 多线程（主 Reactor 只 accept，从 Reactor 组分摊 I/O，最优）。
        Netty 用<strong>主从 Reactor</strong>：BossGroup 是主、WorkerGroup 是从。
        <strong>追问</strong>：单 group 时呢？如果 <code>b.group(group)</code> 只传一个，boss 和 worker 共用一组，就退化成单 Reactor 多线程。
      </p>

      <h3>Q2：EventLoop、EventLoopGroup、Channel、线程之间什么关系？</h3>
      <p>
        EventLoopGroup 含多个 EventLoop；一个 EventLoop 绑定一条线程（1:1）；一个 EventLoop 可管多个 Channel，
        但一个 Channel 整个生命周期只归一个 EventLoop（N:1）。结论：<strong>同一 Channel 的所有事件在同一线程串行处理</strong>，
        所以 Handler 内一般无需加锁。<strong>易错点</strong>：误以为一个连接会被多个线程并发处理——不会。
      </p>

      <h3>Q3：为什么说 Netty 是「无锁串行化」设计？有什么好处？</h3>
      <p>
        因为每个 Channel 固定由一个 EventLoop 线程处理，对同一连接的所有读写、Handler 调用都在这条线程串行排队执行，
        天然没有多线程竞争同一连接状态的问题，省去加锁与锁竞争开销，性能更稳更高。
        Netty 还提供 <code>inEventLoop()</code> 判断：若当前线程不是该 Channel 的 EventLoop，就把操作封装成任务投递过去执行，保证串行性。
      </p>
      <CodeBlock lang="java" title="inEventLoop 保证操作落在正确的线程" code={inEventLoopSnippet} />

      <h3>Q4：Netty 性能为什么高？（请系统回答）</h3>
      <p>
        主从 Reactor + NIO 多路复用（省线程、省切换）；无锁串行化（消除锁竞争）；零拷贝（CompositeByteBuf / 直接内存 / sendfile）；
        内存池化（复用 ByteBuf、降 GC）；高效 ByteBuf（读写指针分离免 flip）；FastThreadLocal/MpscQueue 等并发优化；
        修复 epoll 空轮询 Bug。归纳为「好的线程模型 + 好的内存管理 + 补 JDK 的坑」。
      </p>

      <h3>Q5：Netty 零拷贝具体指什么？</h3>
      <p>
        两层。应用层：CompositeByteBuf 逻辑合并、slice/duplicate 共享底层内存视图、wrappedBuffer 包装已有数组——都不复制字节。
        OS 层：用堆外 DirectByteBuf 做 socket I/O，省掉「堆内→堆外」的中转拷贝；用 FileRegion 触发 sendfile，
        文件数据不经用户态直达网卡。<strong>追问</strong>：堆外内存怎么管理？引用计数（ReferenceCounted）+ 内存池，
        用完 release，计数归零才回收，避免堆外内存泄漏。
      </p>

      <h3>Q6：BossGroup 设几条线程合适？</h3>
      <p>
        服务端通常只监听一个端口，accept 不是瓶颈，BossGroup 设 1 条线程即可。若监听多个端口，可适当增加。
        WorkerGroup 才是干 I/O 的主力，默认 2*CPU 核数，可按业务压测调整。
      </p>

      <h3>Q7：业务处理耗时，会不会拖垮 EventLoop？怎么办？</h3>
      <p>
        会。EventLoop 线程同时负责 I/O 和它名下所有 Channel 的 Handler 执行——如果某个业务 Handler 里做了慢查询、
        远程调用、大计算，就会<strong>阻塞这条 EventLoop 线程</strong>，导致它管的其它连接的 I/O 都被拖慢。
        解决办法：把耗时业务<strong>从 I/O 线程剥离</strong>，常见两种做法：① 给该 Handler 单独指定一个业务线程池（
        <code>pipeline.addLast(bizExecutorGroup, new BizHandler())</code>，传入一个 EventExecutorGroup）；
        ② 在 Handler 内把任务提交到自定义线程池处理，处理完再用 <code>ctx.channel().eventLoop().execute(...)</code> 回到
        I/O 线程写回结果。<strong>铁律</strong>：永远不要在 EventLoop 线程里做阻塞调用。
      </p>

      <Summary
        points={[
          'Reactor 三模型：单 Reactor 单线程（全在一条线程、业务慢则全卡）、单 Reactor 多线程（业务交线程池、单 Reactor 仍瓶颈）、主从 Reactor（accept 与 I/O 分离、最优）。',
          'Netty 用主从 Reactor：BossGroup 主 Reactor 接连接，WorkerGroup 从 Reactor 组处理 I/O；EventLoopGroup 含多个 EventLoop。',
          'EventLoop 绑定一条线程（1:1），一个 Channel 整个生命周期只归一个 EventLoop（N:1），故同一连接事件串行处理、无需加锁。',
          'Netty 高性能来自：主从 Reactor 多路复用 + 无锁串行 + 零拷贝 + 内存池 + 高效 ByteBuf + 修复空轮询 Bug。',
          '零拷贝两层：应用层 CompositeByteBuf/slice/wrap 不复制字节；OS 层堆外直接内存省中转拷贝、FileRegion 用 sendfile 直达网卡。',
          '零拷贝是「减少不必要的拷贝」而非完全不拷贝；堆外内存靠引用计数 + 内存池管理，用完 release 防泄漏。',
        ]}
      />
    </article>
  )
}
