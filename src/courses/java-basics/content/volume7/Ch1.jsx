import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const ioStreamSnippet = `// IO 流的两个维度分类：
// 1) 按方向：输入流 InputStream/Reader，输出流 OutputStream/Writer
// 2) 按单位：字节流（8 位，处理二进制）vs 字符流（16 位，处理文本）

// 字节流：读图片、视频等二进制
try (var in = new FileInputStream("a.jpg");
     var out = new FileOutputStream("b.jpg")) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
}

// 字符流 + 缓冲：读写文本更高效（装饰器模式层层包装）
try (var reader = new BufferedReader(
        new InputStreamReader(new FileInputStream("a.txt"), "UTF-8"))) {
    String line;
    while ((line = reader.readLine()) != null) System.out.println(line);
}`

const nioSnippet = `import java.nio.*;
import java.nio.channels.*;

// NIO 三大核心：Channel（双向通道）、Buffer（缓冲区）、Selector（多路复用器）
try (var channel = FileChannel.open(java.nio.file.Path.of("a.txt"))) {
    ByteBuffer buf = ByteBuffer.allocate(1024);
    int n = channel.read(buf);   // 数据从 channel 读进 buffer
    buf.flip();                  // 切换为读模式（limit=position, position=0）
    while (buf.hasRemaining()) {
        System.out.print((char) buf.get());
    }
}`

const selectorSnippet = `// Selector：一个线程管理多个连接（多路复用），高并发的关键
Selector selector = Selector.open();
ServerSocketChannel server = ServerSocketChannel.open();
server.bind(new java.net.InetSocketAddress(8080));
server.configureBlocking(false);                 // 非阻塞
server.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select();                           // 阻塞直到有就绪事件
    for (SelectionKey key : selector.selectedKeys()) {
        if (key.isAcceptable()) { /* 接受新连接 */ }
        else if (key.isReadable()) { /* 读数据 */ }
    }
    selector.selectedKeys().clear();
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        IO 与网络是后端的硬功夫，也是面试里区分「会调 API」与「懂模型」的关键。本章讲清 I/O 流的分类、
        BIO/NIO/AIO 三种 IO 模型的本质差异、NIO 的 Channel 与 Selector 如何支撑高并发，
        以及 Java 网络编程的基本套路。把 IO 模型讲明白，并发框架（如 Netty）的原理也就通了一半。
      </Lead>

      <h2>一、I/O 流</h2>
      <KeyIdea>
        Java 的 IO 流按两个维度分类：按<strong>方向</strong>分输入流/输出流，按<strong>处理单位</strong>分字节流
        （<code>InputStream</code>/<code>OutputStream</code>，处理二进制）和字符流
        （<code>Reader</code>/<code>Writer</code>，处理文本）。流的设计大量用了<strong>装饰器模式</strong>——
        用 BufferedXxx 包一层加缓冲、用 InputStreamReader 在字节流和字符流间转换。
      </KeyIdea>
      <CodeBlock lang="java" title="字节流与字符流" code={ioStreamSnippet} />
      <h3>面试题 1：字节流和字符流有什么区别？</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>字节流</th><th>字符流</th></tr>
        </thead>
        <tbody>
          <tr><td>处理单位</td><td>字节（8 位）</td><td>字符（16 位）</td></tr>
          <tr><td>基类</td><td>InputStream / OutputStream</td><td>Reader / Writer</td></tr>
          <tr><td>适用</td><td>图片、视频等二进制</td><td>文本（自动处理字符编码）</td></tr>
          <tr><td>编码</td><td>不涉及</td><td>涉及字符集，需注意编码一致</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="装饰器模式是 IO 体系的灵魂">
        <code>new BufferedReader(new InputStreamReader(new FileInputStream(f), "UTF-8"))</code>
        这种层层包装就是装饰器模式：FileInputStream 提供原始字节流，InputStreamReader 加上「字节转字符」能力，
        BufferedReader 再加上「缓冲 + 按行读」能力。每一层只关注一个功能，灵活组合。理解这点比死记类名重要。
      </Callout>

      <h2>二、BIO / NIO / AIO</h2>
      <h3>面试题 2：BIO、NIO、AIO 有什么区别？</h3>
      <KeyIdea>
        三种 IO 模型的差异在「<strong>是否阻塞</strong>」和「<strong>谁来等数据</strong>」：
        <strong>BIO</strong> 同步阻塞，一连接一线程；<strong>NIO</strong> 同步非阻塞，一线程靠 Selector 管多个连接；
        <strong>AIO</strong> 异步非阻塞，数据就绪由系统回调通知。从 BIO 到 AIO，是「让线程少干等活」的不断演进。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>BIO</th><th>NIO</th><th>AIO</th></tr>
        </thead>
        <tbody>
          <tr><td>全称</td><td>Blocking IO</td><td>Non-blocking IO</td><td>Asynchronous IO</td></tr>
          <tr><td>模型</td><td>同步阻塞</td><td>同步非阻塞（多路复用）</td><td>异步非阻塞</td></tr>
          <tr><td>线程模型</td><td>一连接一线程</td><td>一线程管多连接</td><td>回调/Future，无需轮询</td></tr>
          <tr><td>引入版本</td><td>JDK 1.0</td><td>JDK 1.4</td><td>JDK 1.7</td></tr>
          <tr><td>适用</td><td>连接少、逻辑简单</td><td>高并发连接（Netty）</td><td>超高并发、长连接</td></tr>
        </tbody>
      </table>
      <Example title="为什么 BIO 扛不住高并发？">
        <p>
          BIO 里每个连接都要独占一个线程，线程在 <code>read</code> 时会<strong>阻塞干等</strong>数据到来。
          一万个连接就要一万个线程，线程的内存开销和上下文切换成本会把系统压垮。
          NIO 用一个（或少数）线程 + Selector 监听所有连接，哪个连接<strong>就绪了</strong>才去处理，
          线程不再为每个连接傻等，于是少量线程就能扛住海量连接——这就是「IO 多路复用」的威力。
        </p>
      </Example>
      <Callout variant="note" title="同步/异步 vs 阻塞/非阻塞">
        别把两组概念混为一谈。「阻塞/非阻塞」说的是<strong>发起调用后要不要干等</strong>；
        「同步/异步」说的是<strong>数据拷贝/处理由谁完成</strong>。NIO 虽「非阻塞」，但数据就绪后仍要应用自己去读（同步）；
        AIO 才是真异步——连读取都交给系统，完成后回调你。能讲清这两组维度，面试就稳了。
      </Callout>

      <h2>三、Channel 与 Selector</h2>
      <h3>面试题 3：NIO 的 Channel、Buffer、Selector 各是什么？</h3>
      <p>NIO 有三大核心组件，配合实现非阻塞多路复用：</p>
      <ul>
        <li><strong>Channel（通道）</strong>：类似流，但是<strong>双向</strong>的（可读可写），且支持非阻塞模式。数据通过 Channel 在网络/文件与 Buffer 之间流动。</li>
        <li><strong>Buffer（缓冲区）</strong>：本质是一块内存（数组），数据先进 Buffer 再处理。靠 <code>position</code>/<code>limit</code>/<code>capacity</code> 三个指针管理读写，<code>flip()</code> 在读写模式间切换。</li>
        <li><strong>Selector（多路复用器）</strong>：一个线程用它<strong>同时监听多个 Channel</strong> 的就绪事件（连接、可读、可写），底层依赖操作系统的 epoll/kqueue 等多路复用机制。</li>
      </ul>
      <CodeBlock lang="java" title="Channel 与 Buffer 的读取" code={nioSnippet} />
      <CodeBlock lang="java" title="Selector 实现单线程管多连接" code={selectorSnippet} />
      <Callout variant="warn" title="易错点：Buffer 读写要 flip">
        往 Buffer 写完数据后要读，必须先调 <code>flip()</code>——它把 limit 设为当前 position、position 归零，
        从「写模式」切到「读模式」。忘了 flip 直接读，会读到一堆空数据或读不到，是新手常见 bug。
        读完想再写则用 <code>clear()</code> 或 <code>compact()</code>。
      </Callout>

      <h2>四、网络编程</h2>
      <h3>面试题 4：Java 网络编程的基本套路？</h3>
      <p>
        传统 BIO 网络编程围绕 <code>ServerSocket</code>（服务端监听）和 <code>Socket</code>（连接）展开：
        服务端 <code>accept()</code> 阻塞等连接，来一个连接就拿到一个 Socket，从它的输入流读、输出流写。
        要支持多客户端，就为每个 Socket 开一个线程——这正是 BIO 的「一连接一线程」。
      </p>
      <table>
        <thead>
          <tr><th>层次</th><th>关键类/概念</th></tr>
        </thead>
        <tbody>
          <tr><td>TCP 服务端</td><td><code>ServerSocket</code> + <code>accept()</code></td></tr>
          <tr><td>TCP 客户端</td><td><code>Socket</code> + 输入/输出流</td></tr>
          <tr><td>UDP</td><td><code>DatagramSocket</code> + <code>DatagramPacket</code></td></tr>
          <tr><td>高并发</td><td>NIO + Selector，或直接用 Netty</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="实战首选 Netty">
        裸写 NIO 代码繁琐且易错（粘包拆包、缓冲管理、事件处理）。生产中高性能网络服务几乎都用 <strong>Netty</strong>——
        它基于 NIO 封装了 Reactor 线程模型、编解码、内存池等，是 Dubbo、RocketMQ、gRPC 等的底层。
        面试讲完 NIO 原理后点一句「实战用 Netty」会很自然。
      </Callout>

      <h3>面试题 5：TCP 和 UDP 在 Java 网络编程里怎么选？</h3>
      <p>
        虽然这偏网络协议，但 Java 网络编程绕不开。<strong>TCP</strong> 面向连接、可靠、有序、有流量/拥塞控制，
        用 <code>Socket</code>/<code>ServerSocket</code>；<strong>UDP</strong> 无连接、不保证可靠与顺序但开销小、延迟低，
        用 <code>DatagramSocket</code>。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>TCP</th><th>UDP</th></tr>
        </thead>
        <tbody>
          <tr><td>连接</td><td>面向连接（三次握手）</td><td>无连接</td></tr>
          <tr><td>可靠性</td><td>可靠、有序、重传</td><td>不保证送达与顺序</td></tr>
          <tr><td>开销/延迟</td><td>较高</td><td>低</td></tr>
          <tr><td>Java 类</td><td>Socket / ServerSocket</td><td>DatagramSocket / DatagramPacket</td></tr>
          <tr><td>适用</td><td>文件、网页、要求可靠的业务</td><td>音视频、直播、游戏、DNS</td></tr>
        </tbody>
      </table>
      <Example title="为什么直播/游戏多用 UDP？">
        <p>
          实时音视频和游戏更怕「卡顿/延迟」而不太怕「偶尔丢一帧」。TCP 为了可靠会重传、按序等待，
          一旦丢包就可能造成明显卡顿；UDP 丢了就丢了、不重传，配合应用层自己做轻量补偿，反而更流畅。
          所以选 TCP 还是 UDP，本质是<strong>在「可靠」和「低延迟」之间做权衡</strong>，看业务更在乎哪个。
        </p>
      </Example>

      <h3>面试题 6：BIO 模型里「一连接一线程」的瓶颈具体在哪？</h3>
      <p>
        把 BIO 扛不住高并发的原因讲细，能体现深度。瓶颈有三层：
      </p>
      <ul>
        <li><strong>线程内存开销</strong>：每个线程默认占用约 1MB 栈空间，上万线程就是上 GB 内存，很快耗尽。</li>
        <li><strong>上下文切换</strong>：线程数远超 CPU 核数时，操作系统频繁切换线程，大量 CPU 浪费在切换而非干活上。</li>
        <li><strong>阻塞空等</strong>：线程在 <code>read</code> 上阻塞时什么也干不了，连接虽多但大部分线程都在「干等」，资源利用率极低。</li>
      </ul>
      <Callout variant="note" title="呼应虚拟线程">
        有意思的是，下一章会讲到的 Java 21 <strong>虚拟线程</strong>正是来解这个老问题的：
        它让「一连接一线程」的简单写法重新可行——因为虚拟线程极轻量、阻塞时自动让出载体线程，
        既保留了 BIO 的好写，又获得了 NIO 级的高并发。这是 IO 模型演进的最新一环。
      </Callout>

      <h3>面试题 7：什么是 Reactor 模型？它和 NIO 是什么关系？</h3>
      <p>
        Reactor 是基于 NIO 多路复用的<strong>事件驱动设计模式</strong>，是 Netty 等高性能框架的核心架构。
        它用少数线程通过 Selector 监听所有连接的事件，事件就绪时<strong>分发（dispatch）</strong>给对应的处理器，
        从而用极少线程处理海量连接。常见有三种演进形态：
      </p>
      <table>
        <thead>
          <tr><th>形态</th><th>结构</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>单 Reactor 单线程</td><td>一个线程管所有</td><td>简单，但处理慢会阻塞全局</td></tr>
          <tr><td>单 Reactor 多线程</td><td>一个线程分发，线程池处理业务</td><td>业务并行，但单线程分发可能成瓶颈</td></tr>
          <tr><td>主从 Reactor</td><td>主线程管 accept，从线程组管 IO 读写</td><td>Netty 默认，扩展性最好</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="NIO 是机制，Reactor 是模式">
        关系可以这样理解：NIO（Selector/Channel/Buffer）提供了「单线程监听多连接」的底层<strong>能力</strong>，
        而 Reactor 是把这套能力组织起来、做到「事件来了分发给谁处理」的<strong>架构模式</strong>。
        Netty 就是在 NIO 之上实现了主从 Reactor。面试讲完 NIO 三件套，能再点出「Reactor 是其上的架构模式」会显得很有体系。
      </Callout>

      <Summary
        points={[
          'IO 流按方向分输入/输出，按单位分字节流（二进制）与字符流（文本，涉及编码）；IO 体系大量用装饰器模式层层加能力。',
          'BIO 同步阻塞、一连接一线程；NIO 同步非阻塞、一线程靠 Selector 管多连接；AIO 异步非阻塞、数据就绪由系统回调。',
          'BIO 扛不住高并发因每连接独占线程且阻塞干等；NIO 用 IO 多路复用让少量线程管海量连接。',
          '同步/异步看「数据处理由谁完成」，阻塞/非阻塞看「发起调用要不要干等」；NIO 非阻塞但读取仍同步，AIO 才是真异步。',
          'NIO 三核心：Channel（双向通道）、Buffer（带 position/limit/capacity 的内存，读前要 flip）、Selector（依赖 epoll 等监听多 Channel）。',
          '网络编程 BIO 用 ServerSocket/Socket 一连接一线程，高并发用 NIO+Selector；实战高性能服务首选 Netty。',
        ]}
      />
    </article>
  )
}
