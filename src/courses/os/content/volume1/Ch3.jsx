import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pipeCode = `#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    int fd[2];
    pipe(fd);              // fd[0] 读端，fd[1] 写端

    if (fork() == 0) {
        // 子进程：负责写
        close(fd[0]);                       // 关掉用不到的读端
        write(fd[1], 'hello parent', 12);
        close(fd[1]);
    } else {
        // 父进程：负责读
        close(fd[1]);                       // 关掉用不到的写端
        char buf[32] = {0};
        read(fd[0], buf, sizeof(buf));
        printf('parent got: %s\\n', buf);
        close(fd[0]);
    }
    return 0;
}`

const shmCode = `# 共享内存 + 信号量 配合的逻辑（伪代码）
# 共享内存负责“传数据”，信号量负责“管同步”，二者缺一不可

sem = Semaphore(1)          # 初值 1，当作互斥锁用
shm = SharedMemory(size=4096)

# 写进程
sem.wait()                  # P 操作：申请进入临界区（值减 1）
shm.write(data)             # 独占地写共享内存，别的进程进不来
sem.signal()                # V 操作：离开临界区（值加 1）

# 读进程
sem.wait()
data = shm.read()
sem.signal()`

const prodConsCode = `# 生产者-消费者：条件变量经典用法
# 三个不变量：缓冲区有空位才能生产，有数据才能消费，访问要互斥
lock = Lock()
not_full = Condition(lock)      # "有空位"条件
not_empty = Condition(lock)     # "有数据"条件
buf = []
CAP = 10

def producer(item):
    with lock:
        while len(buf) == CAP:  # 注意：必须用 while 不是 if（防虚假唤醒）
            not_full.wait()     # 满了就挂起，自动释放锁
        buf.append(item)
        not_empty.notify()      # 通知消费者：有货了

def consumer():
    with lock:
        while len(buf) == 0:
            not_empty.wait()
        item = buf.pop(0)
        not_full.notify()       # 通知生产者：腾出空位了
        return item`

const signalCode = `#include <stdio.h>
#include <signal.h>
#include <unistd.h>

volatile sig_atomic_t flag = 0;   // 信号处理里只能碰这种类型

void handler(int sig) {           // 异步打断主流程来执行
    flag = 1;                     // 处理函数里只做最小的事
}

int main() {
    signal(SIGINT, handler);      // Ctrl+C 不再杀进程，转交 handler
    while (!flag) pause();        // 等一个信号到来
    printf('caught SIGINT, exiting gracefully\\n');
    return 0;
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章我们知道：进程之间地址空间是<strong>相互隔离</strong>的，你的内存我看不到、我的内存你也碰不着。
          那两个进程想协作、想交换数据怎么办？答案就是<em>进程间通信</em>（IPC，Inter-Process Communication）。
          这一章把管道、消息队列、共享内存、信号量、信号、Socket 这几种主流方式讲清，它们各有擅长，面试常考「怎么选」。
        </p>
      </Lead>

      <h2>为什么需要 IPC</h2>
      <p>
        正因为进程地址空间隔离带来了安全和稳定，进程之间就不能像线程那样直接读写同一个变量来交换信息。
        要打破这堵墙又不破坏隔离，只能借助操作系统提供的「官方通道」——这些通道就是各种 IPC 机制。
        理解这个前提，你才会明白：IPC 的本质，是<strong>在隔离的前提下安全地共享或传递数据</strong>。
      </p>
      <p>
        从更底层看，IPC 的成本差异几乎都来自一件事：<strong>数据要不要经过内核拷贝</strong>。管道、消息队列、Socket
        本质都是「用户态 → 内核缓冲区 → 用户态」两次拷贝；而共享内存让两个进程映射同一块物理页，数据从头到尾不离开内存，
        所以最快。理解了这条主线，六种机制的性能排序就不用死记了。
      </p>

      <h2>主流的几种方式</h2>
      <p>
        <strong>管道（pipe）</strong>：本质是内核里的一段缓冲区，一端写、一端读，数据像水流一样单向流过。
        <em>匿名管道</em>只能用在有亲缘关系的进程之间（比如父子进程，靠 <code>fork</code> 继承文件描述符）；
        <em>命名管道</em>（FIFO）在文件系统里有个名字，没有亲缘关系的进程也能通过这个名字相连。简单好用，但只适合传字节流、单向。
      </p>
      <p>
        管道有两个边界行为面试常问：缓冲区满时写端会<strong>阻塞</strong>，缓冲区空时读端会阻塞——这其实天然实现了流控；
        当所有写端都关闭后，读端会读到 <code>EOF</code>；反过来，如果所有读端都关了还往里写，写端会收到 <code>SIGPIPE</code>
        信号（默认会杀掉进程），这正是 <code>ps | head</code> 中 <code>head</code> 提前退出后 <code>ps</code> 也跟着停的原因。
      </p>
      <p>
        <strong>消息队列（message queue）</strong>：内核维护一个消息链表，进程按「消息」为单位收发，可以带类型、按类型选取。
        比管道灵活（有边界、可选择），但单条消息有大小上限，吞吐不如共享内存。它和管道的本质区别是<strong>有边界</strong>：
        管道是字节流，读 100 字节可能拿到两条消息的拼接；消息队列保留消息边界，读一次就是一条完整消息。
      </p>
      <p>
        <strong>共享内存（shared memory）</strong>：让多个进程把同一块物理内存映射进各自的地址空间，直接读写。
        因为数据不用在内核和用户态之间反复拷贝，它是<strong>最快</strong>的 IPC。但它本身只「共享」不「同步」，
        谁什么时候能写、什么时候能读，必须另外配同步机制（通常是信号量），否则就会读到写一半的脏数据。
      </p>
      <p>
        <strong>信号量（semaphore）</strong>：严格说它不是用来「传数据」的，而是用来「<strong>同步</strong>」的——
        它是一个计数器，配 <code>P</code>（申请、减一，没了就阻塞）和 <code>V</code>（释放、加一）两个原子操作，
        常和共享内存搭档，保护临界区。初值为 1 的信号量就退化成一把互斥锁。
      </p>
      <p>
        <strong>信号（signal）</strong>：一种异步通知，内核或进程给目标进程发一个编号（如 <code>SIGINT</code>、<code>SIGKILL</code>），
        通知它「发生了某件事」。它传递的信息量极小（基本就是「事件类型」本身），适合做控制和中断，不适合传数据。
        要注意 <code>SIGKILL</code>（9）和 <code>SIGSTOP</code> 是<strong>不可捕获、不可忽略</strong>的——这就是为什么
        <code>kill -9</code> 总能生效，而进程没机会做清理。信号处理函数里只能调用<strong>异步信号安全</strong>的函数，
        碰共享变量也只能用 <code>sig_atomic_t</code>，否则会踩重入坑。
      </p>
      <CodeBlock lang="c" title="signal_demo.c" code={signalCode} />
      <p>
        <strong>Socket（套接字）</strong>：最通用，既能本机进程间通信（Unix domain socket），也能<strong>跨机器</strong>
        通过网络通信（TCP/UDP）。代价是要走协议栈、有拷贝开销，本机性能不如共享内存，但它是唯一天然支持跨主机的方式。
        本机场景里 Unix domain socket 比 TCP loopback 快不少，因为它不走 TCP/IP 协议栈，常用于 Docker、数据库本地连接。
      </p>

      <Example title="父子进程用管道传话">
        <p>
          最经典的例子：父进程 <code>fork</code> 出子进程前先建好一条匿名管道，子进程往写端写、父进程从读端读，
          一句话就传过去了。shell 里的 <code>ps aux | grep python</code> 也是同一原理——
          shell 用管道把 <code>ps</code> 的标准输出接到 <code>grep</code> 的标准输入上，两个进程就这样串起来协作。
        </p>
        <CodeBlock lang="c" title="pipe_demo.c" code={pipeCode} />
      </Example>

      <KeyIdea title="选型口诀：传数据 vs 管同步">
        <p>
          把六种方式分两类记最清楚。<strong>偏传数据</strong>：管道（简单单向字节流）、消息队列（带边界可分类）、
          共享内存（最快、需配同步）、Socket（最通用、能跨机）。<strong>偏控制同步</strong>：信号量（同步、保护临界区）、
          信号（异步事件通知、信息量极小）。一句话选型：要快选共享内存加信号量，要跨机选 Socket，
          要简单选管道，只是通知用信号。
        </p>
      </KeyIdea>

      <table>
        <thead>
          <tr>
            <th>机制</th>
            <th>方向/形态</th>
            <th>是否跨机</th>
            <th>性能</th>
            <th>是否自带同步</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>匿名管道</td><td>单向字节流</td><td>否</td><td>中</td><td>满/空阻塞</td></tr>
          <tr><td>命名管道</td><td>单向字节流</td><td>否</td><td>中</td><td>满/空阻塞</td></tr>
          <tr><td>消息队列</td><td>带边界消息</td><td>否</td><td>中</td><td>是（按消息）</td></tr>
          <tr><td>共享内存</td><td>共享内存块</td><td>否</td><td>最快</td><td>否，需配信号量</td></tr>
          <tr><td>信号量</td><td>计数器</td><td>否</td><td>—</td><td>本身就是同步</td></tr>
          <tr><td>信号</td><td>异步通知</td><td>否</td><td>—</td><td>不传数据</td></tr>
          <tr><td>Socket</td><td>字节流/数据报</td><td>是</td><td>较慢</td><td>否</td></tr>
        </tbody>
      </table>

      <Callout variant="warn" title="共享内存最快，但别忘了同步">
        <p>
          面试里只要说出「共享内存最快」却没补一句「它必须配同步机制」，就会被追问。原因是共享内存只负责让大家看到同一块内存，
          <strong>它完全不管谁先谁后</strong>。两个进程同时写，或一个读一个正写到一半，就会出现<em>竞态条件</em>（race condition），
          读到不一致的脏数据。所以共享内存几乎总是和<strong>信号量</strong>成对出现，由信号量来仲裁访问顺序。
        </p>
      </Callout>

      <h2>顺带一提：线程间通信</h2>
      <p>
        线程之间因为本来就<strong>共享同一进程的地址空间</strong>，全局变量、堆都是公用的，所以根本不需要这套笨重的 IPC——
        直接读写共享变量就能交换数据。线程通信真正的难点不在「怎么传」，而在「怎么同步」：靠<strong>锁</strong>（mutex）
        保证同一时刻只有一个线程进临界区，靠<strong>条件变量</strong>（condition variable）让线程在条件不满足时挂起、
        满足时被唤醒（典型如生产者—消费者模型）。
      </p>
      <CodeBlock lang="python" title="producer_consumer.py" code={prodConsCode} />
      <Callout variant="info" title="为什么条件变量要用 while 而不是 if">
        <p>
          上面代码里等待条件用的是 <code>while</code> 循环而不是 <code>if</code>，这是个高频考点。原因有二：一是
          <strong>虚假唤醒</strong>（spurious wakeup），线程可能在没人通知的情况下被唤醒，醒来必须重新检查条件；
          二是<strong>惊群</strong>，<code>notify_all</code> 唤醒了多个等待者，但资源只够一个用，其余醒来发现条件又不满足，
          得继续等。用 <code>while</code> 兜底重新判断，才能保证醒来时条件确实成立。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「有哪些 IPC，怎么选」时，先按「传数据 / 管同步」分类报菜名，再点出每种的关键标签：管道单向简单、
        消息队列有边界、共享内存最快但要同步、信号量管同步、信号是异步通知、Socket 能跨机。
        最后用一句场景化的话收尾，比如「本机要高吞吐就共享内存加信号量，要跨机器就 Socket」，显得既全面又有判断力。
      </p>
      <p>
        被问「进程通信和线程通信的区别」时，落点在地址空间：进程隔离所以要走 IPC，线程共享所以直接读写共享内存、
        重点变成用锁和条件变量做同步。
      </p>
      <Callout variant="info" title="一个真实案例：Chrome 与数据库的选择">
        <p>
          Chrome 多进程架构里，渲染进程和 GPU 进程之间传图像帧用的是<strong>共享内存</strong>（大块像素数据，拷贝代价太高），
          而控制消息走 Mojo IPC（基于消息）。PostgreSQL、Redis 在本机连接时优先用 <strong>Unix domain socket</strong>
          而非 TCP，省掉协议栈开销。这些设计的共同逻辑就是：<strong>大数据走共享内存，控制信令走消息，本机连接绕开网络栈</strong>。
        </p>
      </Callout>

      <Practice title="共享内存 + 信号量的配合">
        <p>
          下面这段伪代码展示了 IPC 里最经典的搭档：<strong>共享内存负责传数据，信号量负责管同步</strong>。
          注意 <code>P</code> 操作（申请进入临界区）和 <code>V</code> 操作（离开临界区）必须成对出现，把读写包在中间。
        </p>
        <CodeBlock lang="python" title="shm_with_sem.py" code={shmCode} />
        <p>
          想想看：如果去掉这两个信号量操作，让两个进程不加约束地同时写共享内存，会发生什么？
          （会出现竞态，读到写一半的脏数据。）这正是「共享内存最快但必须配同步」那句话的实战注脚。
        </p>
      </Practice>

      <Summary
        points={[
          '进程地址空间相互隔离，无法直接读写彼此内存，所以需要 IPC 在隔离前提下安全地传递或共享数据。',
          'IPC 性能差异的主线是数据要不要经内核拷贝：管道/队列/Socket 两次拷贝，共享内存零拷贝故最快。',
          '管道是单向字节流（匿名限亲缘进程、命名可跨进程），满/空会阻塞，读端关后写会触发 SIGPIPE。',
          '消息队列以带类型的消息为单位收发、保留消息边界，区别于管道的无边界字节流。',
          '共享内存把同一块物理内存映射给多个进程，是最快的 IPC，但只共享不同步，必须额外配同步机制。',
          '信号量靠 P/V 原子操作做同步，初值 1 即互斥锁；信号是信息量极小的异步通知，SIGKILL/SIGSTOP 不可捕获。',
          'Socket 最通用、能跨机器，本机用 Unix domain socket 比 TCP loopback 快，因为不走协议栈。',
          '线程共享地址空间无需 IPC，重点是用锁和条件变量做同步，条件判断要用 while 防虚假唤醒。',
        ]}
      />
    </>
  )
}
