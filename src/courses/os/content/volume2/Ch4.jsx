import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import IoModels from '@/courses/os/illustrations/IoModels.jsx'

const epollCode = `// epoll 三步走：create 建实例，ctl 注册/修改/删除关注的 fd，wait 收就绪事件
#include <sys/epoll.h>

int ep = epoll_create1(0);                 // 1. 创建 epoll 实例

struct epoll_event ev;
ev.events  = EPOLLIN;                       // 关注「可读」
ev.data.fd = listen_fd;
epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);  // 2. 把监听 fd 加进来

struct epoll_event events[1024];
while (1) {
    // 3. 阻塞等待，只返回真正就绪的 fd（不用遍历全部）
    int n = epoll_wait(ep, events, 1024, -1);
    for (int i = 0; i < n; i++) {
        int fd = events[i].data.fd;
        // 处理这个就绪的连接：accept 或 read
    }
}`

const selectCode = `// select：每次调用都要重新传入全部 fd 集合，内核线性遍历找就绪的
fd_set rset;
while (1) {
    FD_ZERO(&rset);
    for (each fd) FD_SET(fd, &rset);       // 每轮都要重建集合
    select(maxfd + 1, &rset, NULL, NULL, NULL);
    for (each fd)                          // 返回后还要自己遍历一遍找就绪
        if (FD_ISSET(fd, &rset)) handle(fd);
}
// 痛点：fd 数量有上限（FD_SETSIZE，通常 1024）；每次 O(n) 拷贝+遍历`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          一个线程同时扛住上万条网络连接，靠的不是更多线程，而是更聪明的 I/O 模型。同样是「读一个 socket」，
          可以傻等、可以不停问、可以让内核回调通知你。这一章把 <em>I/O</em> 的五种模型讲透，
          顺带说清 Redis、Nginx、Netty 为什么不约而同选了 <em>epoll</em>。
        </p>
      </Lead>

      <h2>先搞懂：一次 I/O 分两个阶段</h2>
      <p>
        以「从 socket 读数据」为例，一次 I/O 其实分成两步，理解了它才能分清五种模型的差别：
      </p>
      <ul>
        <li><strong>阶段一：等数据就绪</strong>。数据还没到（对端没发、网卡没收到），得等内核缓冲区里有数据可读。</li>
        <li><strong>阶段二：拷贝数据</strong>。数据就绪后，把它从内核缓冲区拷贝到用户空间的 buffer 里。</li>
      </ul>
      <p>
        五种模型的区别，全在于这两个阶段「谁来等、要不要让线程阻塞、谁来通知」。
      </p>

      <h2>五种 I/O 模型</h2>
      <ul>
        <li>
          <strong>阻塞 I/O（BIO）</strong>：调 <code>read</code> 后，两个阶段都让线程<em>挂起</em>，直到数据拷完才返回。最简单，
          但一个线程只能守一个连接，万级连接就得万级线程，扛不住。
        </li>
        <li>
          <strong>非阻塞 I/O（NIO）</strong>：把 socket 设为非阻塞，<code>read</code> 在没数据时立刻返回错误而不挂起，
          于是线程可以<em>轮询</em>。省了阻塞，但反复空转问内核很费 CPU。
        </li>
        <li>
          <strong>I/O 多路复用</strong>：用 <code>select</code>/<code>poll</code>/<code>epoll</code> 让<em>一个线程同时监视一堆 fd</em>，
          内核告诉你哪些就绪了，再去读就绪的。这是高并发服务器的主流。
        </li>
        <li>
          <strong>信号驱动 I/O</strong>：向内核注册，数据就绪时内核发<em>信号</em>（SIGIO）通知，收到信号再去读。用得较少。
        </li>
        <li>
          <strong>异步 I/O（AIO）</strong>：发起后<em>两个阶段都交给内核</em>，连「拷贝」也由内核完成，全部干完才通知你，
          期间线程完全不用管。理论最省心，但 Linux 上生态和支持一直不够成熟。
        </li>
      </ul>

      <IoModels />

      <h2>同步/异步、阻塞/非阻塞，到底怎么分</h2>
      <p>
        这是最容易绕晕、也最爱考的点。判据就盯住上面那两个阶段：
      </p>
      <ul>
        <li>
          <strong>阻塞 vs 非阻塞</strong>：说的是「等数据就绪」这一步要不要把线程挂起。挂起就是阻塞，立刻返回就是非阻塞。
        </li>
        <li>
          <strong>同步 vs 异步</strong>：说的是「拷贝数据」这一步由谁做。要你自己（线程）去发起读取并等拷贝完成，就是同步；
          连拷贝都由内核完成、完成后才通知你，才是异步。
        </li>
      </ul>
      <p>
        按这个判据：前四种（BIO、NIO、多路复用、信号驱动）的拷贝阶段都要线程自己来，所以<strong>都属于同步</strong>；
        只有 AIO 是真异步。很多人误以为「多路复用是异步」，其实它只是把「等」这一步交给内核统一盯着，拷贝还得自己来。
      </p>

      <h2>select / poll / epoll 的区别</h2>
      <p>
        三者都是 I/O 多路复用，但效率差很多：
      </p>
      <CodeBlock lang="c" title="select_loop.c" code={selectCode} />
      <ul>
        <li>
          <strong>select</strong>：fd 数量有上限（<code>FD_SETSIZE</code> 通常 1024）；每次调用都要把整个 fd 集合从用户态拷到内核态，
          内核还要<em>线性遍历</em>所有 fd 找就绪的，返回后用户也得再遍历一遍。连接一多就是 O(n) 的浪费。
        </li>
        <li>
          <strong>poll</strong>：用数组取代了位图，去掉了 1024 的硬上限，但「每次拷贝全集合 + 线性遍历」的老毛病还在。
        </li>
        <li>
          <strong>epoll</strong>：fd 在内核里用红黑树管理、只注册一次；数据就绪时靠<em>回调</em>把就绪的 fd 放进就绪队列，
          <code>epoll_wait</code> 直接返回就绪列表，<strong>不必遍历全部 fd</strong>，效率几乎不随连接数增长而下降。
        </li>
      </ul>
      <p>
        epoll 还有两种触发模式：<em>LT</em>（水平触发，只要还有数据没读完就一直通知，默认、好用不易丢事件）和
        <em>ET</em>（边缘触发，状态变化时只通知一次，必须一次把数据读干净，效率更高但编程更难）。
      </p>

      <Example title="一个线程处理万级连接">
        <p>
          用 epoll，<code>epoll_create</code> 建实例，把上万个连接的 fd 一次性 <code>epoll_ctl</code> 注册进去，
          然后循环 <code>epoll_wait</code>：每次只拿回「这一刻真正有数据」的几十个 fd 去处理。
        </p>
        <CodeBlock lang="c" title="epoll_server.c" code={epollCode} />
        <p>
          哪怕同时有 5 万条连接、其中只有 50 条有数据，<code>epoll_wait</code> 也只返回这 50 条，线程只干这 50 份活。
          换成 select，就得每轮把 5 万个 fd 拷进内核再遍历一遍——这就是 epoll 能用一个线程扛万级连接的根本原因。
        </p>
      </Example>

      <Callout variant="warn" title="为什么 Redis / Nginx / Netty 都选 epoll">
        <p>
          它们都要在<strong>少量线程上服务海量连接</strong>，而连接大多数时间是空闲的——这正是 epoll 的主场：注册一次、
          回调通知、只处理就绪的 fd，开销不随连接数膨胀。Redis 单线程靠 epoll 就能跑出极高 QPS；Nginx、Netty 也都以 epoll
          为核心构建事件驱动模型。<strong>「C10K 问题」（单机万级并发）的标准答案，就是 I/O 多路复用 + epoll</strong>。
        </p>
      </Callout>

      <KeyIdea title="一句话抓住本质">
        <p>
          I/O 模型的演进，是在不断回答「怎样用<strong>更少的线程</strong>盯住<strong>更多的连接</strong>」。从 BIO 一线程一连接，
          到 NIO 轮询，再到多路复用让一个线程靠内核帮忙盯一大堆 fd，epoll 又把「盯」的开销从 O(n) 降到接近 O(1)。
          理解了「I/O 分等待和拷贝两阶段」，五种模型和同步/异步之分就一通百通。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问 I/O 模型，先抛出<strong>两阶段（等待就绪、拷贝数据）</strong>这把尺，再用它量五种模型，顺势讲清同步/异步、阻塞/非阻塞的判据。
        接着重点对比 <strong>select/poll/epoll</strong>：fd 上限、每次是否重复拷贝全集合、遍历还是回调、epoll 的 LT/ET。
        最后落到「Redis/Nginx/Netty 为什么用 epoll、它怎么解 C10K」，知识点就完整闭环了。
      </p>

      <Practice title="说清 epoll 的三步用法">
        <p>
          epoll 的 API 只有三个，记牢「建、注、等」就不会乱：
        </p>
        <ul>
          <li><code>epoll_create</code>：创建一个 epoll 实例，拿到一个 epoll 文件描述符。</li>
          <li><code>epoll_ctl</code>：往实例里 ADD/MOD/DEL 你关注的 fd 及其事件（如可读 EPOLLIN）。</li>
          <li><code>epoll_wait</code>：阻塞等待，返回此刻真正就绪的 fd 列表，逐个处理。</li>
        </ul>
        <CodeBlock lang="c" title="epoll_steps.c" code={epollCode} />
        <p>
          自己跑一个 echo 服务器试试：用 epoll 同时挂监听 fd 和所有连接 fd，<code>epoll_wait</code> 返回谁就处理谁，
          体会「一个线程、一个循环」如何吃下大量连接。
        </p>
      </Practice>

      <Summary
        points={[
          '一次 I/O 分两阶段：等数据就绪、把数据从内核拷到用户空间；五种模型的差别全在这两步怎么处理。',
          '五种模型：阻塞 BIO、非阻塞 NIO（轮询）、I/O 多路复用、信号驱动、异步 AIO。',
          '阻塞/非阻塞看「等待」要不要挂起线程；同步/异步看「拷贝」是不是内核替你完成——只有 AIO 是真异步。',
          'select 有 fd 上限且每次拷贝全集合并线性遍历；poll 去掉上限但仍遍历；epoll 注册一次、回调通知、只返回就绪 fd。',
          'epoll 有 LT（水平触发，默认安全）和 ET（边缘触发，效率高但要一次读干净）两种模式。',
          'Redis、Nginx、Netty 都用 epoll 在少量线程上服务海量连接，这正是 C10K 高并发问题的标准解法。',
        ]}
      />
    </>
  )
}
