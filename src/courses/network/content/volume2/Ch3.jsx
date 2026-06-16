import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Congestion from '@/courses/network/illustrations/Congestion.jsx'

const cwndCode = `# cwnd 随时间的典型变化（单位：MSS）
慢启动（指数增长）：    1 -> 2 -> 4 -> 8 -> 16 ... 直到达到 ssthresh
拥塞避免（线性增长）：  16 -> 17 -> 18 -> 19 ... 每个 RTT 加 1
丢包（超时）：          ssthresh = cwnd/2 ; cwnd = 1 ; 重新慢启动
丢包（三个重复 ACK）：  快重传 + 快恢复
                       ssthresh = cwnd/2 ; cwnd = ssthresh ; 进入拥塞避免`

const algoCode = `# 查看 Linux 当前可用 / 默认的拥塞控制算法
sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control

# 临时切换为 bbr（需要内核支持）
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章讲的窗口，到底由谁说了算？答案是两个「裁判」：一个怕<strong>压垮接收方</strong>，
          叫<em>流量控制</em>（flow control）；一个怕<strong>压垮整个网络</strong>，
          叫<em>拥塞控制</em>（congestion control）。它们都通过控制窗口大小起作用，但管的对象完全不同。
        </p>
      </Lead>

      <h2>流量控制：别撑爆接收方</h2>
      <p>
        流量控制是<strong>端到端</strong>的事，只关心收发双方。接收方在每个 ACK 里通过窗口字段通告自己的
        <em>接收窗口</em> <code>rwnd</code>——也就是缓冲区还剩多少空间。发送方的在途数据量不能超过 <code>rwnd</code>，
        于是接收方处理不过来时，就把通告窗口调小，逼发送方放慢；缓冲区空出来了，再调大。这就是上一章滑动窗口的
        「右边界」由谁决定的问题。
      </p>
      <Callout variant="warn" title="零窗口与死锁：零窗口探测">
        <p>
          当接收方缓冲区满了，会通告 <code>rwnd=0</code>，发送方随即停发。问题来了：之后接收方腾出了空间，
          想发一个「窗口又变大了」的通知，可这个通知报文万一丢了，发送方就会<strong>永远傻等</strong>，双方僵死。
          为打破僵局，发送方会启动<em>零窗口探测</em>（zero window probe）：定时发一个 1 字节的探测段，
          逼接收方回一个带最新 <code>rwnd</code> 的 ACK，从而恢复传输。
        </p>
      </Callout>

      <h2>拥塞控制：别压垮网络</h2>
      <p>
        拥塞控制关心的是<strong>整条路径上的中间网络</strong>（路由器、链路）会不会堵车。它在发送方维护一个
        <em>拥塞窗口</em> <code>cwnd</code>，并根据网络反馈（主要是丢包）动态调整。最终的发送窗口取
        <code>min(rwnd, cwnd)</code>——既听接收方的，也听网络的。经典的拥塞控制分四步：
      </p>
      <ul>
        <li>
          <strong>慢启动</strong>（slow start）：cwnd 从 1 个 MSS 开始，每收到一个 ACK 就翻倍，
          呈<strong>指数增长</strong>，快速试探可用带宽，直到达到阈值 <code>ssthresh</code>。
        </li>
        <li>
          <strong>拥塞避免</strong>（congestion avoidance）：cwnd 超过 <code>ssthresh</code> 后改为
          每个 RTT 只加 1，呈<strong>线性增长</strong>，小心翼翼地逼近极限，避免一下子冲爆网络。
        </li>
        <li>
          <strong>快重传</strong>（fast retransmit）：连续收到 <strong>3 个重复 ACK</strong>，
          说明某个段丢了但后面的段还在到，立即重传那个段，不必干等超时。
        </li>
        <li>
          <strong>快恢复</strong>（fast recovery）：配合快重传，把 <code>ssthresh</code> 设为当前 cwnd 的一半，
          cwnd 也降到这个值，然后直接进入拥塞避免，而不是像超时那样把 cwnd 砸回 1。
        </li>
      </ul>
      <p>
        区别在于对丢包的「态度」：<strong>超时</strong>意味着网络可能严重拥塞，反应激烈——
        <code>cwnd</code> 直接归 1、重新慢启动；而<strong>三个重复 ACK</strong>说明网络还算通畅、只丢了个别段，
        反应温和——只把窗口减半（快恢复）。
      </p>

      <Example title="一条 cwnd 变化曲线">
        <p>把 cwnd 随时间的变化画出来，整个拥塞控制就一目了然：</p>
        <CodeBlock lang="text" title="cwnd 变化" code={cwndCode} />
        <p>
          典型曲线是：先指数往上窜（慢启动），到 <code>ssthresh</code> 转成缓慢爬升（拥塞避免），
          一旦丢包就「锯齿」式回落，然后再爬——经典的<strong>加性增、乘性减</strong>（AIMD）形状。
        </p>
      </Example>

      <Congestion />

      <KeyIdea title="一句话区分两者">
        <p>
          流量控制是<strong>接收方</strong>对<strong>发送方</strong>的约束，靠 <code>rwnd</code> 通告，
          目的是别让接收方缓冲区溢出；拥塞控制是<strong>发送方</strong>对<strong>网络</strong>的自我约束，
          靠 <code>cwnd</code> 调节，目的是别让中间网络拥堵丢包。
          二者<strong>对象不同</strong>，但都落在「调窗口」上，最终发送窗口取 <code>min(rwnd, cwnd)</code>。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「流量控制和拥塞控制有什么区别」，先一句话点对象：一个防压垮<strong>接收方</strong>、一个防压垮
        <strong>网络</strong>；再把拥塞控制四步（慢启动指数、拥塞避免线性、快重传、快恢复）和
        <code>ssthresh</code> / <code>cwnd</code> 串起来；最后补一句两者通过 <code>min(rwnd, cwnd)</code>
        共同决定发送窗口，层次就很清楚了。
      </p>

      <Practice title="理解题 + 查看拥塞算法">
        <p>
          理解题：cwnd 当前为 16 MSS、ssthresh 为 32，此时发生了「三个重复 ACK」。
          快重传 + 快恢复之后，<code>ssthresh</code> 和 <code>cwnd</code> 各变成多少？接下来进入哪个阶段？
          （提示：减半到 8，进入拥塞避免线性增长。）再想想若是「超时」，结果又有什么不同。
        </p>
        <CodeBlock lang="bash" title="查看 / 切换拥塞算法" code={algoCode} />
        <p>
          实操：查看你机器上的拥塞控制算法。现代系统默认多为 <code>cubic</code>（按时间三次函数增长、对高带宽长肥管道更友好），
          也可切到 Google 的 <code>bbr</code>（基于带宽和 RTT 建模、而非单纯靠丢包判断拥塞）。
        </p>
      </Practice>

      <Summary
        points={[
          '流量控制是端到端的，靠接收方通告 rwnd，防止压垮接收方缓冲区。',
          '接收方通告零窗口后用零窗口探测打破死锁，避免窗口更新丢失导致双方僵死。',
          '拥塞控制靠发送方维护 cwnd，防止压垮中间网络；发送窗口取 min(rwnd, cwnd)。',
          '拥塞控制四步：慢启动指数增长到 ssthresh、拥塞避免线性增长、快重传、快恢复。',
          '超时反应激烈（cwnd 归 1 重新慢启动），三个重复 ACK 反应温和（窗口减半进入快恢复），呈 AIMD 锯齿曲线。',
          '两者对象不同（接收方 vs 网络），但都落在调窗口上；常见算法有 cubic 与 bbr。',
        ]}
      />
    </>
  )
}
