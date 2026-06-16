import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Scheduling from '@/courses/os/illustrations/Scheduling.jsx'

const ganttCode = `进程   到达时间   突发时间
P1       0         7
P2       2         4
P3       4         1
P4       5         4

FCFS（先来先服务，按到达顺序）甘特图：
| P1      | P2    | P3 | P4    |
0         7       11   12      16

平均等待时间 = ((0) + (7-2) + (11-4) + (12-5)) / 4
            = (0 + 5 + 7 + 7) / 4
            = 4.75`

const waitCode = `# 计算非抢占式 FCFS 的平均等待时间思路
# 等待时间 = 开始执行时间 - 到达时间
#         = （前面所有进程的突发时间之和） - 自己的到达时间

procs = [
    {'name': 'P1', 'arrive': 0, 'burst': 7},
    {'name': 'P2', 'arrive': 2, 'burst': 4},
    {'name': 'P3', 'arrive': 4, 'burst': 1},
    {'name': 'P4', 'arrive': 5, 'burst': 4},
]

clock = 0
total_wait = 0
for p in procs:                 # FCFS 按到达顺序逐个执行
    start = max(clock, p['arrive'])
    wait = start - p['arrive']   # 这段就是它干等的时间
    total_wait += wait
    clock = start + p['burst']   # CPU 走到该进程结束
    print(p['name'], 'wait =', wait)

print('平均等待时间 =', total_wait / len(procs))`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          CPU 只有那么几个核心，等着运行的进程却一大把。决定「下一个让谁上 CPU」的那套规则，就是
          <em>进程调度算法</em>（CPU scheduling）。同一批任务，换个调度策略，平均响应和吞吐能差出几倍。
          这一章把经典算法一网打尽，并教你用甘特图把「平均等待时间」算明白——这是面试笔试的高频计算题。
        </p>
      </Lead>

      <h2>先想清楚：调度在追求什么</h2>
      <p>
        没有一种调度能同时把所有指标做到最好，所以先得明确目标，再谈算法。常见的衡量维度有几个：
      </p>
      <ul>
        <li><strong>公平</strong>：每个进程都能拿到合理的 CPU 份额，别让谁一直饿着。</li>
        <li><strong>吞吐量</strong>（throughput）：单位时间内完成的进程数，越多越好。</li>
        <li><strong>响应时间</strong>（response time）：从提交到第一次有反应的间隔，交互式系统最看重它。</li>
        <li>
          <strong>周转时间</strong>（turnaround time）：从进程到达到彻底完成的总耗时；其中减去真正执行的部分，
          剩下干等的就是<strong>等待时间</strong>（waiting time）。
        </li>
      </ul>
      <p>
        批处理系统偏爱吞吐和周转，交互系统偏爱响应。理解了目标的取舍，就能看懂每种算法是为谁服务的。
      </p>

      <h3>非抢占 vs 抢占</h3>
      <p>
        调度有两大流派。<em>非抢占式</em>（non-preemptive）：进程一旦上了 CPU，就一直跑到主动让出或结束，
        中途谁也抢不走。<em>抢占式</em>（preemptive）：操作系统可以在某个时刻（比如时间片用完、来了更高优先级的进程）
        强行把当前进程踢下来。抢占式响应更好、更公平，但频繁切换会带来上下文切换的开销。
      </p>

      <h2>经典算法逐个看</h2>
      <p>
        <strong>FCFS（先来先服务，First Come First Served）</strong>：最朴素，按到达顺序排队，非抢占。实现简单，
        但有个致命毛病叫<em>护航效应</em>（convoy effect）——一个超长进程排在前面，后面一堆短进程全被它拖住，平均等待时间飙高。
      </p>
      <p>
        <strong>SJF / SRTF（最短作业优先 / 最短剩余时间优先）</strong>：每次挑「剩余突发时间最短」的先跑。
        SJF 是非抢占版，SRTF 是它的抢占版。它能让平均等待时间<strong>理论最优</strong>，但需要预知每个进程要跑多久（现实里难），
        而且长进程可能被源源不断的短进程挤到永远轮不上——这就是<em>饥饿</em>（starvation）。
      </p>
      <p>
        <strong>优先级调度</strong>：给每个进程一个优先级，高的先跑，可抢占可不抢占。问题同样是低优先级进程会饿死，
        常用的解法是<strong>老化</strong>（aging）：等得越久就慢慢提升优先级。
      </p>
      <p>
        <strong>时间片轮转（RR，Round Robin）</strong>：抢占式，给每个进程一个固定<em>时间片</em>（time slice），
        到点就换下一个，循环排队。它对响应时间友好、天然公平，是交互式系统的常客。时间片大小是关键：太大退化成 FCFS，
        太小则上下文切换的开销占比过高。
      </p>
      <p>
        <strong>多级反馈队列（MLFQ，Multi-Level Feedback Queue）</strong>：维护多个不同优先级的队列，
        新进程进最高优先级队列；如果它用完时间片还没结束，就被降到低一级队列。这样<strong>交互型短任务</strong>
        （很快让出 CPU 的）总能待在高优先级、响应快，<strong>计算型长任务</strong>则逐步沉到底层慢慢跑，
        无需预知运行时间，兼顾了响应和吞吐，是工程上最实用的思路之一。
      </p>

      <Example title="同一批进程，FCFS 的护航效应">
        <p>
          假设三个进程几乎同时到达：P1 突发 24、P2 突发 3、P3 突发 3。用 FCFS 按 P1、P2、P3 顺序跑：
        </p>
        <ul>
          <li>P1 等 0，P2 等 24，P3 等 27 → 平均等待 <code>(0+24+27)/3 = 17</code></li>
          <li>若换成短作业先跑（P2、P3、P1）：P2 等 0，P3 等 3，P1 等 6 → 平均等待 <code>(0+3+6)/3 = 3</code></li>
        </ul>
        <p>
          同样一批任务，仅仅换了执行顺序，平均等待时间从 17 降到 3。这就是护航效应的威力，也是 SJF 优越性的直观来源。
        </p>
      </Example>

      <Scheduling />

      <KeyIdea title="甘特图是算等待时间的利器">
        <p>
          做调度计算题，先在草稿上画<strong>甘特图</strong>（Gantt chart）：横轴是时间，把每个进程占用 CPU 的区段一段段排出来。
          排完后，每个进程的<strong>等待时间 = 它开始执行的时刻 − 它的到达时刻</strong>（抢占式则要把多段空隙累加）。
          把所有进程的等待时间求平均，就是平均等待时间。先画图、再读数，基本不会算错。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="小心饥饿和时间片陷阱">
        <p>
          凡是「优先照顾某类进程」的算法（SJF、优先级）都可能让另一类进程<em>饥饿</em>，标准答法是配上
          <strong>老化机制</strong>。另外 RR 的时间片不能拍脑袋定：太大就退化成 FCFS 失去响应优势，太小则上下文切换
          频繁、CPU 大量时间耗在切换而非干活上。面试里能主动点出这两点，会很加分。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「现代系统用什么调度」时，可以点 Linux 的 <em>CFS</em>（Completely Fair Scheduler，完全公平调度器）。
        它的核心思想是：给每个进程记一个<strong>虚拟运行时间</strong>（vruntime），每次总是挑 vruntime 最小的进程跑，
        谁跑得多 vruntime 就涨得快，于是自然被排到后面，从而逼近「人人平分 CPU」的理想。它用红黑树维护进程，
        取最小值很快。能讲到「靠 vruntime 实现公平」这一层，就答到位了。
      </p>
      <p>
        被问算法对比时，按「目标 → 优缺点 → 典型问题」三段式说：FCFS 简单但有护航效应；SJF 平均等待最优但要预知时长且会饥饿；
        RR 响应好且公平但依赖时间片大小；MLFQ 不需预知时长、自动区分长短任务，最贴近实际。
      </p>

      <Practice title="算一算平均等待时间">
        <p>
          给定一组进程的到达时间和突发时间，先画甘特图，再算每个进程的等待时间，最后求平均。下面是题面和 FCFS 的算法。
        </p>
        <CodeBlock lang="text" title="gantt.txt" code={ganttCode} />
        <CodeBlock lang="python" title="avg_wait.py" code={waitCode} />
        <p>
          练熟之后，把这道题换成 SJF（非抢占）和 RR（时间片设为 2）各算一遍，对比三者的平均等待时间，
          你会对「调度策略如何影响指标」有非常直观的体感。
        </p>
      </Practice>

      <Summary
        points={[
          '调度的目标是在公平、吞吐量、响应时间、周转/等待时间之间权衡，没有一种算法能全占。',
          '非抢占式跑完才让出，抢占式可被时间片或高优先级打断，后者响应更好但切换开销更大。',
          'FCFS 简单但有护航效应；SJF/SRTF 平均等待最优却要预知时长且会导致饥饿。',
          '优先级调度靠老化防饥饿；RR 用时间片轮转保证响应与公平；MLFQ 自动区分长短任务、无需预知时长。',
          'Linux CFS 用 vruntime（虚拟运行时间）取最小者运行，逼近完全公平的调度。',
          '计算平均等待时间先画甘特图，等待时间 = 开始执行时刻 − 到达时刻，再求平均。',
        ]}
      />
    </>
  )
}
