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

      <Callout variant="warn" title="并发不等于并行">
        <p>
          这两个词面试官最爱抠。<em>并发</em>（concurrency）是指多个任务在<strong>一段时间内</strong>都在推进，
          单核 CPU 靠快速切换也能实现，关注的是「结构上同时处理多件事」；<em>并行</em>（parallelism）是指多个任务在
          <strong>同一时刻</strong>真的一起执行，必须有多个核心才行，关注的是「物理上同时跑」。一句话：并发是逻辑上的同时，
          并行是物理上的同时。协程实现的是并发，多核上的多线程才可能做到并行。
        </p>
      </Callout>

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
          '并发是逻辑上同时处理多任务（单核也行），并行是物理上同时执行（必须多核）。',
        ]}
      />
    </>
  )
}
