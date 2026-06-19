import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ProcessThread from '@/courses/os/illustrations/ProcessThread.jsx'

const forkCode = `#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();        // 一次调用，返回两次
    if (pid == 0) {
        // 子进程：拥有独立的地址空间（写时复制）
        printf('I am child, pid=%d\\n', getpid());
    } else {
        // 父进程：继续往下走
        printf('I am parent, child pid=%d\\n', pid);
    }
    return 0;
}`

const threadCode = `#include <stdio.h>
#include <pthread.h>

int counter = 0;   // 全局变量，被所有线程共享

void* work(void* arg) {
    counter++;     // 多个线程同时改它，就需要加锁
    printf('thread sees counter=%d\\n', counter);
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, work, NULL);  // 共享同一进程地址空间
    pthread_create(&t2, NULL, work, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}`

const pcbCode = `// Linux 内核里描述一个进程/线程的核心结构（极度简化）
struct task_struct {
    pid_t            pid;          // 任务 ID（线程也有）
    pid_t            tgid;         // 线程组 ID = 用户眼里的"进程 ID"
    long             state;        // 运行/就绪/睡眠/僵尸...
    struct mm_struct *mm;          // 地址空间；同进程的线程指向同一个 mm
    struct files_struct *files;    // 打开的文件描述符表
    void             *stack;       // 内核栈
    struct task_struct *parent;    // 父任务
    // 还有调度优先级、信号、cgroup、namespace 等大量字段
};`

const goroutineCode = `package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    // 启动 10 万个 goroutine，只占几百 MB，线程做不到
    for i := 0; i < 100000; i++ {
        wg.Add(1)
        go func(id int) {           // go 关键字 = 起一个协程
            defer wg.Done()
            _ = id * 2              // 模拟干点活
        }(i)
    }
    wg.Wait()
    fmt.Println("all done")
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          进程、线程、协程是操作系统并发世界里的三个主角，也是面试必问的开场题。一句话先记住它们的定位：
          进程是<strong>资源分配</strong>的基本单位，线程是 <em>CPU</em> <strong>调度</strong>的基本单位，
          协程是跑在用户态、由程序自己调度的<strong>轻量级线程</strong>。三者层层变轻，理解了它们的取舍，
          后面的调度、通信、死锁都顺理成章。
        </p>
      </Lead>

      <h2>进程：一个正在运行的程序</h2>
      <p>
        程序躺在磁盘上时只是一堆指令，被加载进内存、跑起来之后才叫<em>进程</em>（process）。操作系统给每个进程
        分配一套独立的资源：自己的<strong>虚拟地址空间</strong>（代码段、数据段、堆、栈）、打开的文件、信号处理器等。
        这种隔离是进程最大的特点——一个进程崩溃，原则上不会拖垮别的进程，因为它们根本访问不到彼此的内存。
      </p>
      <p>
        隔离带来安全，也带来代价：创建一个进程要复制一整套地址空间和内核数据结构，进程之间想说句话还得走专门的
        通信机制（也就是后面要讲的 <em>IPC</em>）。所以「重」是进程的代名词。
      </p>
      <p>
        操作系统怎么记住一个进程？靠一个叫 <em>PCB</em>（Process Control Block，进程控制块）的内核数据结构。
        它记录进程的 ID、状态、寄存器现场、页表指针、打开的文件、调度优先级等一切信息。进程切换的本质，
        就是把当前进程的现场存回它的 PCB，再把下一个进程的 PCB 现场恢复到 CPU 上。Linux 里这个结构叫
        <code>task_struct</code>，有趣的是：<strong>Linux 内核并不区分进程和线程</strong>，
        二者都是 <code>task_struct</code>，只是线程之间共享了 <code>mm</code>（地址空间）等字段而已。
      </p>
      <CodeBlock lang="c" title="task_struct（简化）" code={pcbCode} />
      <p>
        进程一生会在几个<strong>状态</strong>之间流转：新建（new）→ 就绪（ready，万事俱备只差 CPU）→
        运行（running，正占着 CPU）→ 阻塞（blocked/waiting，在等 IO 或某个事件）→ 终止（terminated）。
        就绪和阻塞的区别是面试高频点：<em>就绪</em>是缺 CPU，给它 CPU 就能跑；<em>阻塞</em>是缺资源（如磁盘数据没回来），
        给它 CPU 也没用，必须先等事件就绪。两个边界情况要记住：进程退出后若父进程还没回收它（没 <code>wait</code>），
        它就变成<strong>僵尸进程</strong>（zombie），占着 PCB 不放；父进程先死、子进程被 init/systemd 收养，
        就成了<strong>孤儿进程</strong>（orphan），孤儿无害，僵尸才是泄漏。
      </p>

      <h3>线程：进程里的多条执行流</h3>
      <p>
        一个进程内可以开多个<em>线程</em>（thread）。同一进程内的所有线程<strong>共享</strong>进程的地址空间和资源——
        全局变量、堆、打开的文件大家都看得到；但每个线程有自己<strong>私有</strong>的栈、寄存器和程序计数器，
        这样它们才能各自独立地执行。线程是操作系统真正拿去做 CPU 调度的单位。
      </p>
      <p>
        因为共享地址空间，线程之间通信几乎零成本（直接读写同一块内存），创建和切换也比进程便宜得多。代价是：
        共享意味着一个线程踩坏了内存，整个进程都跟着遭殃，而且多个线程改同一份数据时必须加锁同步（这正是死锁的温床）。
      </p>
      <p>
        线程还分三种实现模型，面试官常追问：<strong>用户级线程</strong>（多对一，N 个用户线程映射到 1 个内核线程）切换快、
        不用陷内核，但一个线程阻塞会让整个进程阻塞，且无法利用多核；<strong>内核级线程</strong>（一对一，现代 Linux/Windows 的做法）
        每个用户线程对应一个内核线程，能真正并行、单个阻塞不影响别的，代价是创建和切换要陷内核；
        <strong>混合模型</strong>（多对多，如 Go 的 G-M-P 调度）让 M 个用户线程跑在 N 个内核线程上，兼顾两者。
        Go 的 goroutine 正是把大量协程（G）复用到少量内核线程（M）上，由用户态调度器（P）负责分发。
      </p>

      <h3>协程：用户态的协作式调度</h3>
      <p>
        <em>协程</em>（coroutine）更轻。它完全活在用户态，由语言运行时或程序自己调度，内核根本不知道它的存在。
        线程的切换要陷入内核、保存恢复一大堆上下文；而协程切换只是用户态里几个寄存器和栈指针的腾挪，开销极小。
      </p>
      <p>
        协程是<strong>协作式</strong>调度：它不会被时间片强行打断，而是在自己「愿意」的地方（比如等待 IO 时）主动让出执行权。
        正因如此，一个线程上就能跑成千上万个协程，特别适合高并发、IO 密集的场景。Go 的 <code>goroutine</code>、
        Python 的 <code>async/await</code> 都是这个思路。
      </p>
      <p>
        协程为什么这么省？关键在<strong>栈</strong>。一个内核线程默认栈往往 1～8 MB，开 10 万个线程光栈就吃掉几百 GB，必然崩。
        而 goroutine 初始栈只有 2 KB，且能按需增长收缩，所以同样 10 万并发，协程只占几百 MB。
        下面这段 Go 代码起 10 万个协程毫无压力，换成 10 万个线程几乎必然 OOM 或创建失败。
      </p>
      <CodeBlock lang="go" title="十万协程" code={goroutineCode} />

      <Example title="一个浏览器就讲清三者">
        <p>现代浏览器是理解三者的绝佳样本：</p>
        <ul>
          <li>
            <strong>多进程</strong>：每个标签页通常是一个独立<em>进程</em>。这样一个页面崩了（吃满内存、跑死脚本），
            只挂掉那一个标签，其他标签和浏览器主体安然无恙——这就是地址空间隔离的价值。
          </li>
          <li>
            <strong>多线程</strong>：单个标签页进程内部又开了很多<em>线程</em>——渲染线程画页面、JS 引擎线程跑脚本、
            网络线程下载资源。它们共享这个页面的数据，配合紧密，切换成本低。
          </li>
          <li>
            <strong>协程式</strong>：页面里的 <code>async</code> 异步代码、定时器回调，在 JS 单线程上以协作的方式轮流执行，
            谁也不会阻塞谁——这正是协程的味道。
          </li>
        </ul>
      </Example>

      <ProcessThread />

      <KeyIdea title="一张表记住核心区别">
        <p>
          <strong>地址空间</strong>：进程各自独立；线程共享所属进程的空间；协程共享所属线程的空间。
          <strong>开销</strong>：进程最重（要复制整套资源），线程中等（只复制栈和寄存器），协程最轻（纯用户态切换）。
          <strong>通信</strong>：进程要走 IPC；线程、协程直接读写共享内存（但需同步）。
          <strong>调度</strong>：进程和线程由内核抢占式调度，协程由用户态协作式调度。
        </p>
      </KeyIdea>

      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>进程</th>
            <th>线程</th>
            <th>协程</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>定位</td>
            <td>资源分配单位</td>
            <td>CPU 调度单位</td>
            <td>用户态执行单位</td>
          </tr>
          <tr>
            <td>地址空间</td>
            <td>独立</td>
            <td>共享所属进程</td>
            <td>共享所属线程</td>
          </tr>
          <tr>
            <td>创建/切换开销</td>
            <td>最大（复制资源、切页表、刷 TLB）</td>
            <td>中等（陷内核、保存寄存器）</td>
            <td>最小（用户态切栈指针）</td>
          </tr>
          <tr>
            <td>调度者</td>
            <td>内核，抢占式</td>
            <td>内核，抢占式</td>
            <td>运行时，协作式</td>
          </tr>
          <tr>
            <td>典型代表</td>
            <td>一个独立程序</td>
            <td>pthread、Java Thread</td>
            <td>goroutine、async/await</td>
          </tr>
        </tbody>
      </table>

      <Callout variant="warn" title="并发不等于并行">
        <p>
          这两个词面试官最爱抠。<em>并发</em>（concurrency）是指多个任务在<strong>一段时间内</strong>都在推进，
          单核 CPU 靠快速切换也能实现，关注的是「结构上同时处理多件事」；<em>并行</em>（parallelism）是指多个任务在
          <strong>同一时刻</strong>真的一起执行，必须有多个核心才行，关注的是「物理上同时跑」。一句话：并发是逻辑上的同时，
          并行是物理上的同时。协程实现的是并发，多核上的多线程才可能做到并行。
        </p>
      </Callout>

      <h2>上下文切换：轻和重到底差在哪</h2>
      <p>
        「线程比进程轻」「协程比线程轻」反复说，但轻在哪要能落到细节。<strong>进程切换</strong>最贵，因为换的是地址空间：
        要切换页表寄存器（如 x86 的 <code>CR3</code>），而切了页表，CPU 里缓存虚拟地址到物理地址映射的 <em>TLB</em>
        基本要失效刷新，之后一段时间内访存频繁缺 TLB，性能有个明显的「冷启动」凹陷。<strong>线程切换</strong>因为同进程共享地址空间，
        页表不变、TLB 不刷，只需保存恢复寄存器和内核栈，但仍要陷入内核态、走调度器，有一次特权级切换的成本。
        <strong>协程切换</strong>压根不陷内核，就在用户态把当前寄存器和栈指针存一下、换成目标协程的，几十纳秒级别。
      </p>
      <Callout variant="info" title="切换的隐藏成本">
        <p>
          上下文切换还有看不见的代价：CPU 的 L1/L2 缓存、分支预测器都是为当前任务「预热」的，一切换，
          这些热数据被新任务挤掉，叫<strong>缓存污染</strong>。所以即便切换本身只花几微秒，对吞吐的实际伤害更大——
          这也是为什么高性能服务追求「少切换」，宁可用协程或事件循环把活攒在一个线程里干。
        </p>
      </Callout>

      <h2>进程间通信（IPC）速览</h2>
      <p>
        进程地址空间隔离，想协作就得借助内核提供的通道，常见几种各有取舍：
      </p>
      <ul>
        <li><strong>管道（pipe）/ 命名管道（FIFO）</strong>：半双工字节流，shell 里的 <code>{'a | b'}</code> 就是它，简单但只能单向、亲缘进程间用得多。</li>
        <li><strong>消息队列</strong>：带边界的消息，按类型收发，比管道灵活，但有大小限制。</li>
        <li><strong>共享内存</strong>：两个进程映射同一块物理内存，<strong>最快</strong>（数据不经过内核拷贝），但需要自己用信号量做同步。</li>
        <li><strong>信号量（semaphore）</strong>：本质是同步原语，不是传数据的，常配合共享内存用。</li>
        <li><strong>信号（signal）</strong>：异步通知，如 <code>SIGKILL</code>、<code>SIGTERM</code>，只能传「发生了什么事」，信息量极小。</li>
        <li><strong>套接字（socket）</strong>：唯一能跨机器的，本机进程间也能用（Unix domain socket）。</li>
      </ul>
      <p>
        面试追问「哪种最快」，答<strong>共享内存</strong>，因为别的方式数据都要在用户态和内核态之间拷来拷去，
        共享内存让两个进程直接读写同一块物理页，省掉了拷贝——但代价是同步要自己操心，容易踩坑。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「为什么多线程比多进程轻」时，抓住一句话：<strong>线程共享地址空间，进程不共享</strong>。
        创建进程要复制（或写时复制）整个地址空间、页表、文件描述符表等，切换时还要切换页表、刷新 <em>TLB</em>；
        而线程共用这些，创建只需分配私有栈和寄存器，切换也不动页表，自然轻得多。
      </p>
      <p>
        被问「协程的优势」时，落点在<strong>高并发</strong>和<strong>无内核切换</strong>：一个线程能承载海量协程，
        遇到 IO 就让出，避免了线程频繁陷入内核的开销，所以像 Go 这种语言能轻松撑起几十万并发连接。
        但别忘了补一句它的短板——协作式调度下，某个协程死循环不让出，会把同一线程上的其他协程全饿死。
      </p>
      <Callout variant="warn" title="几个常见误区">
        <p>
          其一，<strong>「协程没有上下文切换」是错的</strong>——协程也切换，只是切换发生在用户态、不陷内核，所以便宜，但不是零成本。
          其二，<strong>「多线程一定比单线程快」是错的</strong>——线程多了切换和锁竞争反而拖慢，CPU 密集任务线程数接近核数最优。
          其三，<strong>「fork 出的子进程会立刻复制全部内存」是错的</strong>——现代系统用写时复制（Copy-On-Write），
          只有真正写入时才复制对应的页，<code>fork</code> 后立刻 <code>exec</code> 几乎不花拷贝成本。
        </p>
      </Callout>

      <Practice title="对比 fork 进程与创建线程的开销">
        <p>
          下面两段代码分别用 <code>fork</code> 创建进程、用 <code>pthread_create</code> 创建线程。对照着看，
          体会「复制整个地址空间」和「共享地址空间」在代价上的差别。
        </p>
        <CodeBlock lang="c" title="fork_demo.c" code={forkCode} />
        <CodeBlock lang="c" title="thread_demo.c" code={threadCode} />
        <p>
          重点观察两处：其一，<code>fork</code> 后子进程改自己的变量不影响父进程（独立地址空间），而线程里的
          <code>counter</code> 是大家共享的，多个线程一起改就会出竞态、必须加锁；其二，如果用工具批量测创建耗时，
          会发现创建线程明显快于创建进程——这就是「轻」的直观体现。
        </p>
      </Practice>

      <Summary
        points={[
          '进程是资源分配单位，拥有独立地址空间，隔离性好但创建和通信开销大。',
          '线程是 CPU 调度单位，共享所属进程的地址空间，私有栈和寄存器，轻于进程但需加锁同步。',
          '协程是用户态轻量级线程，协作式调度、切换不陷内核，适合高并发 IO 场景，如 Go 的 goroutine。',
          '三者区别看四点：地址空间、开销、通信方式、调度方式，从进程到协程层层变轻。',
          '多线程比多进程轻，根因是线程共享地址空间，创建和切换都不必复制与切换整套资源。',
          '进程切换最贵在切页表、刷 TLB；线程切换要陷内核保存寄存器；协程切换纯用户态最便宜。',
          '进程有就绪/运行/阻塞等状态，回收不当会产生僵尸进程；fork 用写时复制避免立即拷贝。',
          'IPC 里共享内存最快（无内核拷贝），但需自己同步；socket 是唯一能跨机器的。',
          '并发是逻辑上同时处理多任务（单核也行），并行是物理上同时执行（必须多核）。',
        ]}
      />
    </>
  )
}
