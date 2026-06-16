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

      <h2>主流的几种方式</h2>
      <p>
        <strong>管道（pipe）</strong>：本质是内核里的一段缓冲区，一端写、一端读，数据像水流一样单向流过。
        <em>匿名管道</em>只能用在有亲缘关系的进程之间（比如父子进程，靠 <code>fork</code> 继承文件描述符）；
        <em>命名管道</em>（FIFO）在文件系统里有个名字，没有亲缘关系的进程也能通过这个名字相连。简单好用，但只适合传字节流、单向。
      </p>
      <p>
        <strong>消息队列（message queue）</strong>：内核维护一个消息链表，进程按「消息」为单位收发，可以带类型、按类型选取。
        比管道灵活（有边界、可选择），但单条消息有大小上限，吞吐不如共享内存。
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
      </p>
      <p>
        <strong>Socket（套接字）</strong>：最通用，既能本机进程间通信（Unix domain socket），也能<strong>跨机器</strong>
        通过网络通信（TCP/UDP）。代价是要走协议栈、有拷贝开销，本机性能不如共享内存，但它是唯一天然支持跨主机的方式。
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
          '管道是单向字节流（匿名限亲缘进程、命名可跨进程）；消息队列以带类型的消息为单位收发。',
          '共享内存把同一块物理内存映射给多个进程，是最快的 IPC，但只共享不同步，必须额外配同步机制。',
          '信号量是计数器，靠 P/V 原子操作做同步、保护临界区，初值为 1 时即互斥锁；信号是信息量极小的异步事件通知。',
          'Socket 最通用，既能本机也能跨机器通信，代价是走协议栈、性能不如共享内存。',
          '线程共享进程地址空间，无需 IPC，直接读写共享内存，重点是用锁和条件变量做同步。',
        ]}
      />
    </>
  )
}
