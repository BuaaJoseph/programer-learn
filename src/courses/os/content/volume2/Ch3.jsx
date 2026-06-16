import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const readCode = `// 一次最普通的 read，背后是一次系统调用
#include <unistd.h>
#include <fcntl.h>

int main() {
    int fd = open("data.txt", O_RDONLY);   // open 也是系统调用
    char buf[4096];

    // read 触发 trap：从用户态陷入内核态
    // 内核去读磁盘/页缓存，把数据拷进 buf，再返回用户态
    ssize_t n = read(fd, buf, sizeof(buf));

    close(fd);
    return 0;
}`

const straceCode = `# 用 strace 把一个程序执行的所有系统调用打出来
strace -f ./a.out

# 只看某几个系统调用，并统计耗时与次数
strace -c -e trace=read,write,open,close ./a.out

# 典型输出片段：
# openat(AT_FDCWD, "data.txt", O_RDONLY) = 3
# read(3, "hello world\\n...", 4096)      = 12
# close(3)                                = 0
# 每一行就是一次用户态到内核态的陷入与返回`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          你写的程序想读个文件、发个网络包、申请块内存，自己其实<strong>办不到</strong>——这些动作都得求操作系统内核代劳。
          程序通过<em>系统调用</em>（system call）发出请求，CPU 随之从<em>用户态</em>切到<em>内核态</em>去执行。
          这道「两态分治、有事陷入内核」的设计，是操作系统保护自己、也保护硬件的根基。
        </p>
      </Lead>

      <h2>为什么要分两态</h2>
      <p>
        CPU 把指令分成两类：普通指令谁都能跑，而像「直接操作硬件」「修改页表」「关中断」这种
        <em>特权指令</em>，只有处于高权限模式时才能执行。如果让用户程序随便跑特权指令，一个写错的程序就能改掉别的进程的内存、
        甚至搞垮整台机器。于是 CPU 用两个等级把权力分开：
      </p>
      <ul>
        <li>
          <strong>用户态（user mode）</strong>：权限低，只能跑普通指令、只能碰自己被分到的内存。应用程序平时都在这一态运行。
        </li>
        <li>
          <strong>内核态（kernel mode）</strong>：权限最高，能执行特权指令、访问全部硬件和内存。只有操作系统内核运行在这一态。
        </li>
      </ul>
      <p>
        这样一来，所有危险动作都被收口到内核，由内核统一审查和执行；用户程序想越权，硬件直接拦下。隔离与稳定就有了保障。
      </p>

      <h2>系统调用：从用户态陷入内核态</h2>
      <p>
        用户程序要内核帮忙，靠的就是系统调用。它的本质是一次主动触发的<em>陷入</em>（trap）——也叫软中断：程序把
        要调用的功能编号和参数准备好，执行一条特殊指令（如 x86 的 <code>syscall</code>），CPU 立刻切到内核态、
        跳进内核预设的入口；内核根据编号找到对应处理函数、干完活、把结果带回来，再切回用户态继续往下跑。
      </p>

      <Example title="一次 read 系统调用都经历了什么">
        <p>看似一行 <code>read(fd, buf, n)</code>，背后是一整套态切换：</p>
        <CodeBlock lang="c" title="read_demo.c" code={readCode} />
        <p>
          步骤拆开看：① 用户态准备好参数；② 执行 <code>syscall</code> 陷入，CPU 切到内核态、保存现场；
          ③ 内核检查权限、去页缓存或磁盘取数据，把数据从内核缓冲区拷到你的 <code>buf</code>；④ 返回用户态、恢复现场，
          <code>read</code> 带着读到的字节数返回。中间「切态、保存/恢复现场、内核到用户的拷贝」全是实打实的开销。
        </p>
      </Example>

      <h2>哪些操作必须走内核态</h2>
      <p>
        凡是涉及共享资源或硬件的事，用户程序都没权限自己干，必须经系统调用进内核：
      </p>
      <ul>
        <li><strong>I/O 操作</strong>：读写文件、收发网络数据，要操作磁盘、网卡。</li>
        <li><strong>内存管理</strong>：向系统要内存（如 <code>mmap</code>、<code>brk</code>），改的是页表。</li>
        <li><strong>进程控制</strong>：创建/销毁进程线程（<code>fork</code>、<code>clone</code>）、等待、发信号。</li>
      </ul>

      <Callout variant="warn" title="切换有成本，别滥用系统调用">
        <p>
          每次系统调用都要切态、保存与恢复寄存器现场、可能还伴随<em>上下文切换</em>，并且会让 CPU 流水线和缓存「凉一截」。
          单次开销看着小，<strong>高频调用累积起来就很可观</strong>。这也是为什么工程上提倡「批量读写」「用缓冲区攒够再一次系统调用」
          「减少不必要的线程切换」——本质都是在省切态和拷贝的钱。
        </p>
      </Callout>

      <h2>零拷贝为什么快</h2>
      <p>
        传统「读文件再发网络」的路径，数据要在<strong>内核缓冲区和用户缓冲区之间来回拷贝</strong>，还要多次在用户态/内核态之间切换：
        磁盘读到内核页缓存 → 拷到用户缓冲区 → 再拷回内核的 socket 缓冲区 → 发出去，四次拷贝、多次切态，纯属搬运。
      </p>
      <p>
        <em>零拷贝</em>（zero-copy）技术（如 <code>sendfile</code>、<code>mmap</code>+write）的思路就是<strong>让数据不再绕到用户态</strong>，
        直接在内核里从页缓存送到网卡，省掉了用户态那两次拷贝和对应的态切换。这正是 Kafka、Nginx 等中间件传输大文件时高吞吐的关键——
        理解了「态切换和拷贝都是成本」，你就懂了零拷贝优化的所有动机。
      </p>

      <KeyIdea title="一句话抓住本质">
        <p>
          用户态和内核态的分界，是用<strong>权限</strong>把「危险操作」隔离到内核；系统调用是用户程序<strong>主动陷入内核</strong>请求服务的唯一正门。
          它带来安全和隔离，代价是每次进出都要切态、保存现场、可能还拷贝数据。性能优化的很大一块，
          就是在<em>减少陷入内核的次数和每次搬运的数据量</em>。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「用户态和内核态的区别」时，先点出<strong>为什么分（保护、特权指令）</strong>，再说<strong>怎么从用户态进内核态（系统调用、trap/软中断）</strong>，
        最后落到<strong>切换有开销，所以要少调</strong>，并能举零拷贝当例子把知识点和中间件性能串起来。
        常见追问还有：系统调用和普通函数调用的区别（要不要切态）、上下文切换的代价具体在哪。
      </p>

      <Practice title="用 strace 观察系统调用">
        <p>
          想看清程序到底向内核请求了什么，<code>strace</code> 是最直观的工具：它能把进程执行的每一次系统调用、参数和返回值都打出来。
        </p>
        <CodeBlock lang="bash" title="trace.sh" code={straceCode} />
        <p>
          挑一个最简单的「读文件并打印」的小程序跑 <code>strace -c</code>，看看一次普通运行竟然有多少次 <code>read</code>/<code>write</code>/<code>mmap</code>，
          再体会一句话：<strong>你以为的「一行代码」，对内核而言往往是好几次陷入</strong>。
        </p>
      </Practice>

      <Summary
        points={[
          '分用户态和内核态是为了保护：特权指令和硬件操作只允许在高权限的内核态执行，防止用户程序搞垮系统。',
          '用户态权限低、只能碰自己的内存；内核态权限最高、能操作全部硬件和内存，只有内核运行其中。',
          '系统调用是用户程序请求内核服务的正门，本质是一次 trap（软中断），CPU 随之从用户态切到内核态。',
          'I/O、内存分配、进程创建等涉及共享资源和硬件的操作都必须经系统调用进内核。',
          '每次系统调用/上下文切换都有切态、保存恢复现场、缓存失效等开销，所以要尽量减少调用次数。',
          '零拷贝让数据不绕用户态、省掉多次拷贝与切态，是 Kafka、Nginx 等中间件高吞吐的关键。',
        ]}
      />
    </>
  )
}
