import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const bioServerSnippet = `// BIO：一连接一线程，accept 与 read 都会阻塞
ServerSocket server = new ServerSocket(8080);
while (true) {
    Socket socket = server.accept();        // 没有连接进来时，这里阻塞
    new Thread(() -> {
        InputStream in = socket.getInputStream();
        byte[] buf = new byte[1024];
        int n = in.read(buf);                // 没有数据时，这条线程一直阻塞
        // ... 处理请求
    }).start();                              // 每来一个连接就开一条线程
}`

const nioSelectorSnippet = `// NIO：一个线程 + 一个 Selector 管多个连接
Selector selector = Selector.open();
ServerSocketChannel ssc = ServerSocketChannel.open();
ssc.configureBlocking(false);               // 关键：非阻塞
ssc.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select();                      // 阻塞直到有就绪事件（可带超时）
    Iterator<SelectionKey> it = selector.selectedKeys().iterator();
    while (it.hasNext()) {
        SelectionKey key = it.next();
        it.remove();                        // 必须手动移除，否则重复处理
        if (key.isAcceptable()) {
            // 接受新连接，注册 OP_READ
        } else if (key.isReadable()) {
            // 从就绪的 channel 读数据
        }
    }
}`

const nettyServerSnippet = `// Netty：几十行搭起一个高性能服务端
EventLoopGroup boss = new NioEventLoopGroup(1);     // 接连接
EventLoopGroup worker = new NioEventLoopGroup();    // 处理 I/O
try {
    ServerBootstrap b = new ServerBootstrap();
    b.group(boss, worker)
     .channel(NioServerSocketChannel.class)
     .childHandler(new ChannelInitializer<SocketChannel>() {
         protected void initChannel(SocketChannel ch) {
             ch.pipeline().addLast(new StringDecoder());
             ch.pipeline().addLast(new EchoHandler());
         }
     });
    ChannelFuture f = b.bind(8080).sync();
    f.channel().closeFuture().sync();
} finally {
    boss.shutdownGracefully();
    worker.shutdownGracefully();
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        几乎所有 Netty 面试的第一刀，都落在「I/O 模型」上：BIO、NIO、AIO 是什么、差在哪？多路复用凭什么用一个线程
        扛住几万连接？原生 NIO 既然 JDK 自带，为什么大家还要再套一层 Netty？这一章我们把这条主线讲透——
        它是后面所有 Netty 高性能话题的地基，也是面试官判断你「是真懂还是背过」的试金石。
      </Lead>

      <h2>一、先建立坐标系：什么是 Netty</h2>
      <p>
        Netty 是一个<strong>基于 Java NIO 的异步事件驱动网络应用框架</strong>。它不是替代 JDK 的网络库，
        而是封装在 JDK NIO 之上、把那些「难写、易错、性能坑多」的部分替你处理好，让你专注于业务编解码与逻辑。
        Dubbo、RocketMQ、gRPC-Java、Elasticsearch 的传输层、Spring WebFlux（默认 Reactor Netty）等大量中间件，
        底层网络通信都用 Netty——可以说它是 Java 高性能网络编程的事实标准。
      </p>
      <KeyIdea>
        一句话记住 Netty 的定位：它是<strong>对 Java NIO 的工程化封装</strong>——用 Reactor 线程模型 + 事件驱动 +
        责任链式的 Pipeline，把「高性能、高可靠、易扩展」的网络程序变得可写、可维护。
      </KeyIdea>

      <h2>二、四种 I/O 模型：BIO / NIO / AIO 与多路复用</h2>
      <p>
        面试常把它们混在一起问，先把概念厘清。这里的 BIO/NIO/AIO 是 Java 层面的三套 API，而「多路复用」是操作系统
        层面的一种 I/O 模型（Linux 上是 epoll，macOS 上是 kqueue）。Java 的 NIO 之所以高效，正是因为它底层用了
        操作系统的多路复用。下面逐个讲。
      </p>

      <h3>BIO（Blocking I/O，同步阻塞）</h3>
      <p>
        最朴素的模型：<strong>一个连接一条线程</strong>。线程在 <code>accept()</code> 上阻塞等连接，连上后又在
        <code>read()</code> 上阻塞等数据。优点是编程模型直观、代码好懂；致命缺点是<strong>连接数和线程数 1:1 绑定</strong>——
        一万个连接就要一万条线程，而绝大多数连接其实大部分时间在「发呆」（没有数据收发），线程却被白白占着阻塞，
        线程的创建、调度、上下文切换、内存（每条线程栈默认约 1MB）开销随之爆炸。所以 BIO 只适合连接数少、
        每个连接都很活跃的场景。
      </p>
      <CodeBlock lang="java" title="BIO 服务端骨架：每来一个连接开一条线程" code={bioServerSnippet} />

      <h3>NIO（Non-blocking I/O / New I/O，同步非阻塞 + 多路复用）</h3>
      <p>
        JDK 1.4 引入的 <code>java.nio</code>。核心三件套：<strong>Channel（通道）</strong>、<strong>Buffer（缓冲区）</strong>、
        <strong>Selector（选择器）</strong>。Channel 设为非阻塞后，读写不会卡住线程；而 Selector 是关键——它能让
        <strong>一个线程同时监听多个 Channel</strong> 上的事件（连接就绪、可读、可写），哪个 Channel 有事件就处理哪个。
        这就是<strong>多路复用</strong>：用一个（或少数几个）线程管成千上万个连接，CPU 不再浪费在「为空闲连接保留阻塞线程」上。
      </p>
      <Callout variant="note" title="为什么 NIO 常被叫「同步非阻塞」">
        NIO 是「非阻塞」的：调用立即返回，不傻等。但它仍是「同步」的：真正的数据读写（把内核缓冲区数据拷到用户空间）
        还得由你的线程自己在事件就绪后主动去做，不是操作系统替你做完再通知你。这点是和 AIO 的本质区别。
      </Callout>
      <CodeBlock lang="java" title="NIO 服务端骨架：一个 Selector 监听多个 Channel" code={nioSelectorSnippet} />

      <h3>AIO（Asynchronous I/O，异步非阻塞）</h3>
      <p>
        JDK 1.7 引入的 NIO.2（<code>AsynchronousServerSocketChannel</code> 等）。它是真正的「异步」：你发起读写后立刻返回，
        操作系统<strong>把数据真正读写完成后</strong>，再通过回调（CompletionHandler）或 Future 通知你。理论上最省心、最高效。
      </p>
      <Callout variant="warn" title="AIO 为什么在 Linux 上不流行">
        Linux 的异步 I/O（早期的 AIO、后来的 io_uring）成熟度与生态长期不如 epoll，JDK 在 Linux 上的 AIO 实现底层其实
        还是用 epoll 模拟的，并没有带来本质性能优势，反而增加复杂度。所以包括 Netty 在内的主流框架在 Linux 上都<strong>不用 AIO</strong>，
        Netty 干脆移除了 AIO 传输实现。这也是高频追问点。
      </Callout>

      <h3>四者横向对比</h3>
      <table>
        <thead>
          <tr><th>模型</th><th>阻塞 / 同步</th><th>连接:线程</th><th>底层机制</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td>BIO</td><td>同步阻塞</td><td>1:1</td><td>每连接独占线程</td><td>连接少且活跃，如内部 RPC 短连接</td></tr>
          <tr><td>NIO</td><td>同步非阻塞</td><td>N:1（多路复用）</td><td>Selector + epoll/kqueue</td><td>高并发长连接，如 IM、网关</td></tr>
          <tr><td>AIO</td><td>异步非阻塞</td><td>N:少量</td><td>OS 异步通知 / 回调</td><td>连接多、操作耗时；Linux 上少用</td></tr>
        </tbody>
      </table>

      <Example title="一个比喻：餐厅取餐">
        <p>
          BIO：每位顾客配一名服务员站在窗口前，菜没好就一直干等——人多了服务员（线程）不够用。
          NIO：一名服务员拿一块叫号屏（Selector），盯着所有窗口，哪个窗口菜好了（事件就绪）就去端哪个——
          一个人服务全场。AIO：顾客点完餐回座位，菜做好后厨房（OS）直接送到桌上（回调），服务员都省了。
        </p>
      </Example>

      <h2>三、原生 NIO 有哪些坑：为什么不直接用它</h2>
      <p>
        既然 JDK 自带 NIO，为什么还要 Netty？因为<strong>原生 NIO 只是给了你「能多路复用」的底层能力，
        要把它写成生产级程序，坑多到劝退</strong>。逐条看：
      </p>
      <ul>
        <li><strong>API 繁琐、心智负担重</strong>：Selector、SelectionKey、ByteBuf 的 position/limit/flip、要手动 <code>remove()</code> 已处理的 key……一不小心就死循环或漏处理事件。</li>
        <li><strong>需要自己处理拆包粘包</strong>：TCP 是字节流，原生 NIO 不帮你做消息边界，得自己设计协议和缓冲，极易出错。</li>
        <li><strong>epoll 空轮询 Bug</strong>：JDK NIO 的 <code>Selector.select()</code> 在某些 Linux 内核下会无故返回 0 却不阻塞，导致 CPU 飙到 100% 空转。原生 NIO 不替你处理，得自己想办法绕。</li>
        <li><strong>断连重连、半包、流量控制、堆外内存管理</strong>：这些可靠性细节都得自己实现，写对很难。</li>
        <li><strong>缺乏成熟的线程模型与扩展机制</strong>：如何分配 Reactor 线程、如何把业务和 I/O 解耦，全靠自己造轮子。</li>
      </ul>
      <KeyIdea>
        Netty 把上面每一条都替你解决了：屏蔽繁琐 API、内置丰富编解码器解决粘包、内部用「重建 Selector」绕过空轮询 Bug、
        提供成熟的主从 Reactor 线程模型、引用计数的 ByteBuf 与内存池、断连重连与可靠性保障。这就是「为什么用 Netty 而不用原生 NIO」的标准答案。
      </KeyIdea>
      <CodeBlock lang="java" title="Netty 服务端：把上面那堆坑都收进框架里" code={nettyServerSnippet} />

      <h2>四、Netty 到底解决了什么问题</h2>
      <p>把上一节反过来正面陈述，就是 Netty 的核心价值，面试可以分三层答：</p>
      <table>
        <thead>
          <tr><th>层面</th><th>原生 NIO 的痛</th><th>Netty 的解法</th></tr>
        </thead>
        <tbody>
          <tr><td>易用性</td><td>API 复杂、模板代码多</td><td>Bootstrap + Pipeline + Handler，几十行搭起服务</td></tr>
          <tr><td>可靠性</td><td>空轮询 Bug、断连、内存泄漏</td><td>重建 Selector、自动重连、引用计数 ByteBuf</td></tr>
          <tr><td>性能</td><td>线程模型与内存要自己优化</td><td>主从 Reactor、零拷贝、内存池、高效编解码</td></tr>
          <tr><td>扩展性</td><td>缺乏统一编排机制</td><td>责任链 Pipeline，Handler 即插即用</td></tr>
        </tbody>
      </table>

      <h2>五、Netty 的典型应用场景</h2>
      <p>凡是需要「高并发、长连接、自定义协议、低延迟」的网络通信，几乎都能见到 Netty：</p>
      <ul>
        <li><strong>RPC 框架的传输层</strong>：Dubbo 默认传输用 Netty，gRPC-Java 也基于 Netty。</li>
        <li><strong>消息中间件</strong>：RocketMQ 的 remoting 模块用 Netty 做 broker 与客户端通信。</li>
        <li><strong>即时通讯 / 推送 / IM</strong>：海量长连接、需要自定义协议，Netty 是天然之选。</li>
        <li><strong>API 网关 / 反向代理</strong>：Spring Cloud Gateway 基于 Reactor Netty。</li>
        <li><strong>游戏服务器、物联网网关、行情推送</strong>：低延迟、高并发的实时通信。</li>
        <li><strong>大数据组件通信层</strong>：如 Elasticsearch 节点间传输。</li>
      </ul>
      <Callout variant="tip">
        面试时把场景和特性挂钩着说更出彩：「Netty 适合高并发长连接 + 自定义协议的场景，因为它的多路复用线程模型省线程、
        Pipeline 编解码器好做协议、零拷贝与内存池降延迟」——一句话同时答了「场景」和「为什么」。
      </Callout>

      <h2>六、面试精讲</h2>

      <h3>Q1：BIO、NIO、AIO 有什么区别？</h3>
      <p>
        从两个维度区分：<strong>阻塞 / 非阻塞</strong>（发起调用要不要等）和<strong>同步 / 异步</strong>（数据的读写由谁来做）。
        BIO 是同步阻塞——调用会卡住线程，一连接一线程；NIO 是同步非阻塞——调用立即返回，用 Selector 多路复用，
        但数据读写仍要自己线程做；AIO 是异步非阻塞——发起后操作系统把数据读写完再回调通知你。
        <strong>易错点</strong>：很多人把 NIO 说成「异步」，错。NIO 是同步的，只是「非阻塞」。真正异步的只有 AIO。
      </p>

      <h3>Q2：什么是 I/O 多路复用？select / poll / epoll 有什么区别？</h3>
      <p>
        多路复用指<strong>用一个线程监听多个 fd（连接）的就绪事件</strong>，由内核统一通知哪些 fd 可读 / 可写，
        从而避免为每个连接保留一条阻塞线程。Linux 上有三代实现：
      </p>
      <table>
        <thead>
          <tr><th>机制</th><th>fd 上限</th><th>查找就绪</th><th>每次调用开销</th></tr>
        </thead>
        <tbody>
          <tr><td>select</td><td>1024（FD_SETSIZE）</td><td>遍历所有 fd，O(n)</td><td>每次拷贝整个 fd 集合到内核</td></tr>
          <tr><td>poll</td><td>无硬上限</td><td>遍历所有 fd，O(n)</td><td>同样每次传全量 fd</td></tr>
          <tr><td>epoll</td><td>无硬上限</td><td>只返回就绪 fd，O(1)</td><td>内核维护红黑树 + 就绪链表，无需每次全量传</td></tr>
        </tbody>
      </table>
      <p>
        epoll 的优势在于：用 <code>epoll_ctl</code> 一次注册 fd 到内核红黑树，<code>epoll_wait</code> 只返回就绪的 fd，
        连接数再多，开销也只和「活跃连接数」相关，而非「总连接数」。这就是它能撑起 C10K/C100K 的原因。
        <strong>追问</strong>：epoll 的水平触发（LT）与边缘触发（ET）？LT 是只要 fd 还可读就一直通知（默认、好用），
        ET 是只在状态变化时通知一次（高效但要一次读干净，否则丢事件）。Java NIO 用的是 LT。
      </p>

      <h3>Q3：Netty 为什么不用 AIO？</h3>
      <p>
        核心原因：<strong>在 Linux 上 AIO 没有实际收益</strong>。Linux 的 epoll 已经足够高效，而 JDK 的 AIO 在 Linux 底层
        仍是用 epoll 模拟的异步，并没有真正的内核异步 I/O 加持，性能不比 NIO 强，还引入额外复杂度和不一致行为
        （不同平台实现差异大）。加之 Netty 自己的线程模型已经把 NIO 用得很高效，AIO 的「省回调线程」优势在 Netty 里体现不出来。
        所以 Netty 4 直接<strong>移除了 AIO 传输</strong>，只保留 NIO 与平台原生的 epoll/kqueue 传输。
      </p>

      <h3>Q4：既然有 JDK NIO，为什么还要 Netty？（高频）</h3>
      <p>
        分四点答（对应第三、四节）：① <strong>易用</strong>——屏蔽 Selector/SelectionKey 的繁琐与陷阱；
        ② <strong>可靠</strong>——内置解决粘包拆包、修复 epoll 空轮询 Bug、引用计数防内存泄漏、断连重连；
        ③ <strong>高性能</strong>——成熟的主从 Reactor 线程模型、零拷贝、内存池、高效编解码；
        ④ <strong>可扩展</strong>——责任链 Pipeline 让协议编解码与业务逻辑可插拔组合。
        一句话收尾：原生 NIO 给的是「能力」，Netty 给的是「能直接上生产的工程化方案」。
      </p>

      <h3>Q5：Netty 的应用场景有哪些？说一个你知道的。</h3>
      <p>
        RPC 传输层（Dubbo / gRPC）、消息中间件（RocketMQ）、IM 与推送、API 网关（Spring Cloud Gateway / Reactor Netty）、
        游戏与物联网网关。可以举 Dubbo：默认用 Netty 做服务端与消费端的长连接通信，自定义 Dubbo 协议头 + 心跳，
        正好用到 Netty 的 Pipeline 编解码、长连接管理与高并发线程模型——把「场景 + 为什么用 Netty」一起说清。
      </p>

      <Summary
        points={[
          'BIO 同步阻塞、一连接一线程，扛不住高并发；NIO 同步非阻塞、用 Selector 多路复用一个线程管多连接；AIO 异步非阻塞、由 OS 完成读写后回调。',
          '多路复用是 OS 能力（Linux epoll）；epoll 相比 select/poll 无 fd 上限、只返回就绪 fd（O(1)），是高并发的基石。',
          'Netty 不用 AIO：Linux 上 AIO 底层仍是 epoll 模拟，无实际收益还增复杂度，Netty 4 已移除 AIO 传输。',
          '原生 NIO 坑多：API 繁琐、要自己处理粘包、有 epoll 空轮询 Bug、可靠性细节难写——Netty 把这些都工程化解决了。',
          'Netty 的价值四层：易用、可靠、高性能、可扩展，是 Java 高性能网络编程事实标准。',
          '典型场景：RPC（Dubbo/gRPC）、消息中间件（RocketMQ）、IM/推送、API 网关、游戏与物联网——高并发长连接 + 自定义协议。',
        ]}
      />
    </article>
  )
}
