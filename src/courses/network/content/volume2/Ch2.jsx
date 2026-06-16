import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SlidingWindow from '@/courses/network/illustrations/SlidingWindow.jsx'

const stopWaitCode = `# 停止等待：发一个就死等一个 ACK，链路大部分时间在「空转」
发送 段1 --------->
              <--------- ACK1   （这段往返时间里什么都没干）
发送 段2 --------->
              <--------- ACK2

# 滑动窗口：一口气发满一个窗口，ACK 陆续回来，链路被填满
发送 段1 段2 段3 段4 --->
              <--- ACK1   收到后窗口右移，立刻补发 段5
              <--- ACK2   ...流水线不断流`

const sackCode = `# 假设发了 段1..段5，其中 段2 丢失
收到 段1 -> ACK 期望 段2
段2 丢   -> 后续段3/4/5 即使收到，普通 ACK 仍只能确认到 段1（累积确认）
# 开启 SACK 后，接收方可额外告知：已收到 [段3,段4,段5]
# 发送方据此只重传 段2 一个段，而不是 段2..段5 全部重发`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          IP 层是「尽力而为」的：包可能丢失、重复、乱序、损坏。可 TCP 却向上层承诺了一条
          <strong>可靠、有序、不重不漏</strong>的字节流。它是怎么在不靠谱的网络上变出可靠传输的？
          答案藏在四个词里：<em>序号</em>、<em>确认</em>、<em>重传</em>、<em>滑动窗口</em>。
        </p>
      </Lead>

      <h2>TCP 靠什么做到可靠</h2>
      <p>
        TCP 把要发的数据看成一条连续的<strong>字节流</strong>，给每个字节都编上<em>序号</em>
        （sequence number）。接收方每收到数据，就回一个<em>确认</em>（<code>ACK</code>），
        告诉发送方「我已经连续收到了第几号字节，下一个我期望收到几号」。围绕这套序号 / 确认机制，TCP 叠加了一系列手段：
      </p>
      <ul>
        <li>
          <strong>超时重传</strong>：发出去的数据在一段时间内没收到 ACK，就认为丢了，重发一遍。
        </li>
        <li>
          <strong>累积确认</strong>（cumulative ACK）：ACK 号表示「这之前的字节我全收齐了」，
          一个 ACK 可以确认多个段，也能容忍个别 ACK 丢失。
        </li>
        <li>
          <strong>SACK 选择重传</strong>（selective ACK）：在累积确认之外，额外告诉发送方「我还收到了哪几段」，
          这样发送方只补丢的那一段，不必整批重发。
        </li>
        <li>
          <strong>去重与排序</strong>：靠序号识别重复的段直接丢弃，把乱序到达的段在接收缓冲区里重新排好，
          再按序交给应用。
        </li>
      </ul>

      <Callout variant="warn" title="累积确认的代价：SACK 的由来">
        <p>
          只有累积确认时有个尴尬：如果中间某个段丢了，后面的段即便都收到了，ACK 也只能停在丢失点之前，
          发送方可能误以为「丢失点之后的也全丢了」而重发一大批，白白浪费带宽。
          <strong>SACK</strong> 正是为了解决这个问题——让接收方精确报告已收到的不连续区间，使重传更精准。
        </p>
      </Callout>

      <h3>从停止等待到滑动窗口</h3>
      <p>
        最朴素的可靠方案是<em>停止等待</em>（stop-and-wait）：发一个段，死等它的 ACK 回来，再发下一个。
        正确是正确，但效率极低——链路在一来一回的<strong>往返时间</strong>（RTT）里几乎全程空转。
        假设带宽很高、RTT 又长，这种「发一个等一个」的方式连一点点带宽都吃不满。
      </p>
      <p>
        解决办法是<em>流水线</em>：不等 ACK，先一口气把好几个段发出去，让链路始终有数据在跑。
        但「能提前发多少」不能无限大，于是引入了<em>滑动窗口</em>（sliding window）来约束。
      </p>

      <Example title="连续发多个段">
        <p>
          假设窗口大小为 4，发送方可以不等 ACK 连发 段1、段2、段3、段4。当 段1 的 ACK 回来，
          窗口就向右<strong>滑动</strong>一格，于是 段5 立刻被允许发出。这样无论何时，链路上都有约 4 个段在飞，
          带宽被持续填满。对比停止等待「发一等一」，吞吐量可能提升好几倍。
        </p>
        <CodeBlock lang="text" title="停止等待 vs 滑动窗口" code={stopWaitCode} />
      </Example>

      <SlidingWindow />

      <KeyIdea title="窗口就是「允许在途未确认的量」">
        <p>
          滑动窗口的本质，是给「已发送但还没被确认」的数据量设一个上限。发送方维护
          <strong>发送窗口</strong>，接收方维护<strong>接收窗口</strong>。每收到一个 ACK，发送窗口的左边界右移，
          腾出空间，新的数据就能进入窗口被发送——窗口像一条履带一样不断向右滚动，这就是「滑动」的含义。
          没有窗口，要么退化成低效的停止等待，要么发送方无节制地灌数据、压垮接收方或网络。
        </p>
      </KeyIdea>

      <h3>发送窗口与接收窗口</h3>
      <p>
        <strong>接收窗口</strong>（<code>rwnd</code>）由接收方根据自己缓冲区的剩余空间决定，并通过 ACK
        里的「窗口字段」<em>通告</em>给发送方，意思是「我现在最多还能接收这么多」。
        <strong>发送窗口</strong>则取接收窗口和（下一章要讲的）拥塞窗口两者中的较小值——
        既不能撑爆接收方，也不能压垮网络。为什么需要窗口？一句话：在<strong>不牺牲可靠性的前提下尽量填满链路</strong>，
        同时又能随接收方和网络的状况动态收放。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「TCP 怎么保证可靠传输」，别只甩名词，按层次答：<strong>序号</strong>给数据定位、
        <strong>确认 + 超时重传</strong>保证不漏、<strong>累积确认 / SACK</strong>提高确认效率、
        <strong>去重排序</strong>保证有序，最后用<strong>滑动窗口</strong>把停止等待升级成流水线、兼顾效率与控制。
        再点一句：流量控制和拥塞控制就是在调这个窗口的大小（自然引出下一章）。
      </p>

      <Practice title="用思路题 + 抓包看窗口">
        <p>
          先做个估算思路题：带宽 100 Mbps、RTT 100 ms，要把链路填满，「在途数据量」至少需要多大？
          这其实就是<strong>带宽时延积</strong>（BDP），它正是窗口应该达到的量级，体会一下窗口太小为何吃不满带宽。
        </p>
        <CodeBlock lang="text" title="带宽时延积估算" code={`BDP = 带宽 × RTT
    = 100 Mbps × 0.1 s
    = 10 Mbit = 1.25 MB   # 窗口需达到这个量级才填满链路`} />
        <p>
          然后用 Wireshark 抓一次大文件下载，在 TCP 流里观察 <code>Window</code> 字段如何变化，
          以及发生丢包时 SACK 块（SACK block）是怎么标出缺失区间的，对照上面的 <code>{`段2 丢失`}</code> 场景。
        </p>
        <CodeBlock lang="text" title="SACK 选择重传场景" code={sackCode} />
      </Practice>

      <Summary
        points={[
          'TCP 把数据看成带序号的字节流，用确认 ACK + 超时重传保证不漏、用序号去重排序保证有序。',
          '累积确认让一个 ACK 确认多个段；SACK 在此之上精确报告已收区间，使重传只补丢的段。',
          '停止等待「发一等一」在高带宽长 RTT 下严重浪费链路，滑动窗口用流水线把链路填满。',
          '发送窗口约束「已发未确认」的数据量，每收一个 ACK 就向右滑动，腾出空间继续发。',
          '接收窗口 rwnd 由接收方通告，发送窗口取 rwnd 与拥塞窗口的较小值。',
          '需要窗口，是为了在保证可靠的前提下尽量填满链路，并能随接收方与网络状况动态收放。',
        ]}
      />
    </>
  )
}
