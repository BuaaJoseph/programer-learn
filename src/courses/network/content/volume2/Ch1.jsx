import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Handshake from '@/courses/network/illustrations/Handshake.jsx'

const netstatCode = `# 看所有 TCP 连接及其状态
netstat -ant

# 只看处于某些状态的连接（Linux）
ss -ant state established
ss -ant state time-wait

# 统计各状态各有多少条，排查 TIME_WAIT 过多
netstat -ant | awk 'NR>2 {print $6}' | sort | uniq -c | sort -rn`

const tcpdumpCode = `# 抓与目标主机的握手包，-S 显示绝对序号，便于看 seq/ack
sudo tcpdump -i any -nnS 'tcp port 80 and host example.com'

# 典型的三次握手会看到三行（Flags 依次为 [S] [S.] [.]）：
# IP A.5000 > B.80: Flags [S],  seq 1000
# IP B.80 > A.5000: Flags [S.], seq 9000, ack 1001
# IP A.5000 > B.80: Flags [.],  ack 9001`

const synQueueCode = `# 半连接队列（SYN_RCVD 排队等第三次握手）上限
sysctl net.ipv4.tcp_max_syn_backlog
# 全连接队列（握手完成、等 accept 取走）上限由 listen(backlog) 与 somaxconn 共同决定
sysctl net.core.somaxconn

# 开启 SYN cookies，遭遇 SYN flood 时不占半连接队列
sysctl net.ipv4.tcp_syncookies     # 1 = 开启

# 全连接队列溢出会被丢弃并计数，用这条看有没有发生
nstat -az | grep -i ListenDrop
# 或：netstat -s | grep -i 'listen queue'`

const timeWaitCode = `# 统计本机各状态连接数，TIME_WAIT 异常多就要警觉
ss -ant | awk 'NR>1{print $1}' | sort | uniq -c | sort -rn

# 缓解 TIME_WAIT 堆积的内核参数（按需，谨慎）
sysctl net.ipv4.tcp_tw_reuse      # 1 = 允许复用 TIME_WAIT 连接给新的对外连接
sysctl net.ipv4.tcp_fin_timeout   # FIN_WAIT_2 的超时（不是 TIME_WAIT 时长）
# 注意：tcp_tw_recycle 在新内核已移除，NAT 环境下用它会丢包，别再用`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          TCP 是面向连接的协议：在真正传数据之前，双方要先「打个招呼」把连接建立起来；传完了，
          再「好好道别」把连接关掉。建立连接要三步，关闭连接要四步——这就是大名鼎鼎的
          <em>three-way handshake</em> 和 <em>four-way handshake</em>，几乎是每场面试的必考题。
        </p>
      </Lead>

      <h2>三次握手：建立连接</h2>
      <p>
        握手的目的，是让双方<strong>互相确认对方的收发能力都正常</strong>，并交换各自的初始序号
        （<em>ISN</em>，initial sequence number）。整个过程靠 TCP 首部里的两个标志位 <code>SYN</code>
        （想建立连接）和 <code>ACK</code>（确认收到）来驱动。
      </p>
      <ul>
        <li>
          <strong>第一次</strong>：客户端发 <code>SYN</code>，带上自己的初始序号 <code>seq=x</code>，
          自己进入 <code>SYN_SENT</code> 状态。意思是「我想和你建连，我的序号从 x 开始」。
        </li>
        <li>
          <strong>第二次</strong>：服务端回 <code>SYN+ACK</code>，带自己的序号 <code>seq=y</code>，
          同时 <code>ack=x+1</code> 确认收到了客户端的 SYN，进入 <code>SYN_RCVD</code> 状态。
          意思是「收到了你的 x，我的序号从 y 开始」。
        </li>
        <li>
          <strong>第三次</strong>：客户端回 <code>ACK</code>，带 <code>ack=y+1</code> 确认服务端的 SYN，
          双方都进入 <code>ESTABLISHED</code>，连接建立完成，可以开始传数据了。
        </li>
      </ul>
      <p>
        注意 <code>SYN</code> 报文本身不携带数据，但要<strong>消耗一个序号</strong>，所以确认号都是对方序号加一。
        同样道理，<code>FIN</code> 也消耗一个序号。而纯 <code>ACK</code>（不带数据）不消耗序号，这也是为什么挥手时
        中间那个单独的 ACK 不会让序号往前走。
      </p>
      <p>
        三次握手不只是「打招呼」，它还顺带<strong>协商了一批连接参数</strong>，都写在 SYN/SYN+ACK 的 TCP 选项里：
        <code>MSS</code>（本端能接收的最大段大小，避免 IP 分片）、<em>窗口缩放因子</em>（让接收窗口能超过 64KB，
        是高带宽链路必需的）、<em>SACK 允许</em>（选择性确认，丢包时只重传缺的那段）、时间戳（用于 RTT 测量和防序号回绕）。
        所以握手既是建连也是「能力协商」，这点常被忽略，但答出来很加分。
      </p>

      <h2>半连接队列与全连接队列</h2>
      <p>
        握手过程在内核里对应两个队列，面试和线上排障都绕不开：
      </p>
      <ul>
        <li>
          <strong>半连接队列</strong>（SYN queue）：服务端收到第一个 <code>SYN</code> 回了 SYN+ACK 后，
          连接处于 <code>SYN_RCVD</code>，就排在这里等第三次握手的 ACK。SYN flood 攻击塞满的就是它。
        </li>
        <li>
          <strong>全连接队列</strong>（accept queue）：三次握手完成、连接进入 <code>ESTABLISHED</code> 后，
          排在这里等应用调用 <code>accept()</code> 取走。如果应用 accept 太慢、队列满了，
          新完成的连接会被丢弃（甚至丢掉客户端的 ACK），表现为「偶发连接超时但服务器 CPU 不高」这类诡异现象。
        </li>
      </ul>
      <p>
        全连接队列的长度由 <code>listen(fd, backlog)</code> 的 backlog 和内核 <code>somaxconn</code> 取较小值决定。
        这是一个非常实战的考点：很多「连接数上不去」的问题，根因就在 backlog 设小了或 accept 处理不过来。
      </p>

      <Example title="跟着序号走一遍">
        <p>假设客户端 ISN 为 1000，服务端 ISN 为 9000：</p>
        <ul>
          <li>
            <code>C → S: SYN, seq=1000</code>　→　<code>S → C: SYN ACK, seq=9000, ack=1001</code>　→
            <code>C → S: ACK, seq=1001, ack=9001</code>
          </li>
        </ul>
        <p>
          第三步之后，客户端接下来发的第一个数据段就从 <code>seq=1001</code> 开始。
          ISN 不是固定的 0，而是随机生成的，目的是防止旧连接的报文被新连接误收，也提高了一点安全性。
        </p>
      </Example>

      <Handshake />

      <KeyIdea title="为什么是三次，不是两次">
        <p>
          三次握手是<strong>确认双方收发能力都正常</strong>的最小步数：第二次握手让客户端确认「服务端能收能发」，
          第三次握手让服务端确认「客户端能收能发」。如果只有两次，服务端无法确认客户端是否真的收到了自己的 SYN+ACK。
          更关键的是<strong>防止历史失效连接</strong>：如果一个早已超时的旧 SYN 在网络里兜了一圈才到达服务端，
          两次握手会让服务端直接建连并白白等待；而三次握手中，客户端发现这个连接不是自己想要的，会回
          <code>RST</code> 拒绝，避免浪费资源。
        </p>
      </KeyIdea>

      <h2>四次挥手：关闭连接</h2>
      <p>
        TCP 连接是<strong>全双工</strong>的——两个方向各自独立。关闭时要把两个方向分别关掉，所以需要四步。
        假设由客户端主动关闭：
      </p>
      <ul>
        <li>
          <strong>第一次</strong>：客户端发 <code>FIN</code>，表示「我没有数据要发了」，进入 <code>FIN_WAIT_1</code>。
        </li>
        <li>
          <strong>第二次</strong>：服务端回 <code>ACK</code>，进入 <code>CLOSE_WAIT</code>；客户端收到后进入
          <code>FIN_WAIT_2</code>。此时<strong>客户端到服务端方向已关闭，但服务端到客户端方向还能发</strong>（半关闭状态）。
        </li>
        <li>
          <strong>第三次</strong>：服务端把剩余数据发完后，再发自己的 <code>FIN</code>，进入 <code>LAST_ACK</code>。
        </li>
        <li>
          <strong>第四次</strong>：客户端回 <code>ACK</code>，进入 <code>TIME_WAIT</code>；服务端收到后立即进入
          <code>CLOSED</code>。
        </li>
      </ul>
      <p>
        为什么挥手要四次而握手只要三次？因为握手时服务端可以把 <code>SYN</code> 和 <code>ACK</code>
        合在一个报文里；而挥手时，服务端收到 FIN 后<strong>可能还有数据没发完</strong>，所以只能先单独回 ACK，
        等数据发完再单独发 FIN——<code>ACK</code> 和 <code>FIN</code> 必须分开，于是多了一步。
      </p>

      <Callout variant="warn" title="TIME_WAIT 与 2MSL">
        <p>
          主动关闭方在最后会停留在 <code>TIME_WAIT</code> 状态，等待 <strong>2MSL</strong>
          （MSL 是报文最大生存时间）才真正关闭，原因有两个：
        </p>
        <ul>
          <li>
            <strong>保证最后一个 ACK 能到达对方</strong>：万一这个 ACK 丢了，对方会重发 FIN，
            而处于 TIME_WAIT 的一方还能再回一次 ACK；2MSL 足够覆盖一来一回。
          </li>
          <li>
            <strong>让本连接的残留报文在网络中消散</strong>，避免它们「串门」到使用相同四元组的新连接里。
          </li>
        </ul>
        <p>
          高并发短连接的服务器容易堆积大量 TIME_WAIT，占满端口。常见缓解手段：开启
          <code>net.ipv4.tcp_tw_reuse</code>、用长连接 / 连接池减少连接数、让被动方（如客户端）来主动关闭。
        </p>
      </Callout>

      <h2>TCP 状态机：握手挥手只是它的两条路径</h2>
      <p>
        握手和挥手里出现的那些大写状态（<code>SYN_SENT</code>、<code>ESTABLISHED</code>、<code>TIME_WAIT</code> 等），
        其实都是 TCP <strong>有限状态机</strong>上的节点。把它当成一张状态图来记，比死背流程牢得多：
      </p>
      <table>
        <thead>
          <tr>
            <th>状态</th>
            <th>谁会处于</th>
            <th>含义</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LISTEN</td>
            <td>服务端</td>
            <td>已 listen，等待 SYN</td>
          </tr>
          <tr>
            <td>SYN_SENT</td>
            <td>主动方</td>
            <td>已发 SYN，等 SYN+ACK</td>
          </tr>
          <tr>
            <td>SYN_RCVD</td>
            <td>被动方</td>
            <td>已回 SYN+ACK，等第三次 ACK（在半连接队列）</td>
          </tr>
          <tr>
            <td>ESTABLISHED</td>
            <td>双方</td>
            <td>连接建立，正常传数据</td>
          </tr>
          <tr>
            <td>FIN_WAIT_1 / FIN_WAIT_2</td>
            <td>主动关闭方</td>
            <td>已发 FIN，等对方 ACK / 等对方 FIN</td>
          </tr>
          <tr>
            <td>CLOSE_WAIT</td>
            <td>被动关闭方</td>
            <td>收到对方 FIN、回了 ACK，自己还没发 FIN</td>
          </tr>
          <tr>
            <td>LAST_ACK</td>
            <td>被动关闭方</td>
            <td>已发自己的 FIN，等最后一个 ACK</td>
          </tr>
          <tr>
            <td>TIME_WAIT</td>
            <td>主动关闭方</td>
            <td>已发最后 ACK，等 2MSL</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="warn" title="CLOSE_WAIT 堆积几乎一定是代码 bug">
        <p>
          这是高频线上事故。<code>TIME_WAIT</code> 多是正常现象（主动关闭的代价），但 <code>CLOSE_WAIT</code> 大量堆积，
          几乎都是<strong>应用层收到了对端的 FIN 却忘了调用 <code>close()</code></strong>——比如没正确关闭连接、连接池泄漏、
          某个异常分支没走到关闭逻辑。内核已经替你回了 ACK 进入 CLOSE_WAIT，但只有你的代码 close 了才会发出自己的 FIN。
          所以排障口诀：<em>TIME_WAIT 多看参数和架构，CLOSE_WAIT 多查自己的代码</em>。
        </p>
      </Callout>

      <h2>SYN 洪泛攻击</h2>
      <p>
        攻击者用伪造的源地址疯狂发 <code>SYN</code>，服务端每收到一个就回 SYN+ACK 并在<em>半连接队列</em>
        里留一个 <code>SYN_RCVD</code> 表项等待第三次握手；但攻击者永远不回 ACK，队列很快被占满，
        正常用户再也连不上——这就是 <em>SYN flood</em>。常见防御是 <strong>SYN cookies</strong>：
        服务端不急着分配资源，而是把连接信息编码进序号里，等收到合法的第三次握手再恢复，从而绕过半连接队列。
      </p>

      <Callout variant="info" title="面试追问与常见误区">
        <ul>
          <li>
            <strong>追问：两次握手到底差在哪个具体场景？</strong>关键是「确认<em>客户端</em>的接收能力」和「防历史连接」。
            两次握手下，服务端发完 SYN+ACK 就认为连接建立，但它无法确认客户端真的收到了；一个迟到的旧 SYN 也会让它白白建连。
          </li>
          <li>
            <strong>追问：四次挥手能变三次吗？</strong>能。如果被动方收到 FIN 时<em>恰好也没有数据要发了</em>，
            就能把 ACK 和自己的 FIN 合并成一个包，挥手就变成三次。这正说明「四次」不是铁律，而是「ACK 和 FIN 通常不能合并」的结果。
          </li>
          <li>
            <strong>追问：为什么 TIME_WAIT 在主动关闭方，不在被动方？</strong>因为最后一个 ACK 是主动方发的，
            必须停留以便对端 FIN 丢失时能重发 ACK；被动方收到这个 ACK 就直接 CLOSED 了。
          </li>
          <li>
            <strong>误区：以为 ISN 是 0。</strong>ISN 是随机的，既防旧报文串连接，也增加序号被猜中的难度（安全）。
          </li>
          <li>
            <strong>追问：连接建立后某一方突然断电会怎样？</strong>对端不会立刻知道，要靠 <em>keepalive</em> 探测或
            上层超时才能发现，这就是「半打开连接」问题。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「讲讲三次握手」，按「<strong>为什么</strong>（确认双方收发能力、交换 ISN）→
        <strong>怎么做</strong>（SYN / SYN+ACK / ACK 三步加状态变化）→ <strong>为什么不是两次</strong>
        （防历史连接、确认双向能力）」的顺序讲，再补一句四次挥手的差异和 TIME_WAIT，基本就满分了。
        切忌只背流程不讲原因。能顺带提一句握手时还协商了 MSS、窗口缩放、SACK 这些参数，立刻显得不一样。
      </p>

      <Practice title="亲手抓一次握手">
        <p>
          先用 <code>netstat</code> / <code>ss</code> 观察本机连接的状态分布，重点找
          <code>ESTABLISHED</code> 和 <code>TIME_WAIT</code>；再用 <code>tcpdump</code> 抓一次访问网页时的握手包，
          对照 seq / ack 号的变化。
        </p>
        <CodeBlock lang="bash" title="看连接状态" code={netstatCode} />
        <CodeBlock lang="bash" title="抓握手包" code={tcpdumpCode} />
        <p>
          想理解半连接/全连接队列和 SYN cookies，看看这些内核参数与溢出计数：
        </p>
        <CodeBlock lang="bash" title="看两个队列与 SYN cookies" code={synQueueCode} />
        <p>
          再统计 TIME_WAIT 数量、看看缓解参数，建立「TIME_WAIT 多是正常代价、CLOSE_WAIT 多是 bug」的直觉：
        </p>
        <CodeBlock lang="bash" title="TIME_WAIT 统计与缓解" code={timeWaitCode} />
        <p>
          观察后想一想：当你 <code>curl</code> 一个网址再关闭时，主动关闭的是哪一方？谁停在了 TIME_WAIT？
          如果你的服务里出现一堆 CLOSE_WAIT，第一反应应该去查什么？
        </p>
      </Practice>

      <Summary
        points={[
          '三次握手：SYN → SYN+ACK → ACK，双方交换初始序号 ISN 并各自从 SYN_SENT/SYN_RCVD 进入 ESTABLISHED。',
          '三次而非两次：既要确认双方收发能力都正常，又要防止历史失效连接被误建。',
          '四次挥手：FIN → ACK → FIN → ACK，因为连接全双工要分别关闭，且服务端的 ACK 与 FIN 通常分两步发。',
          'TIME_WAIT 等待 2MSL，是为了确保最后一个 ACK 送达、并让残留报文消散；过多可用 tw_reuse、长连接等缓解。',
          'SYN flood 用伪造 SYN 占满半连接队列，SYN cookies 是常见防御手段。',
          '握手同时协商连接参数：MSS、窗口缩放因子、SACK 允许、时间戳——建连即能力协商。',
          '内核有半连接队列（等第三次握手）与全连接队列（等 accept），后者溢出会丢连接，常是连接数上不去的根因。',
          '把状态当成状态机记：TIME_WAIT 多是正常代价（在主动关闭方），CLOSE_WAIT 大量堆积几乎一定是没调用 close 的代码 bug。',
          '用 netstat/ss 看状态、用 tcpdump 抓包对照 seq/ack，是把握手原理落到实处的最佳方式。',
        ]}
      />
    </>
  )
}
