import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const compareCode = `维度            TCP                       UDP
连接            面向连接（要握手）         无连接（直接发）
可靠            可靠（确认 + 重传）        不可靠（尽力而为，可能丢）
有序            保证有序                   不保证顺序
拥塞/流量控制   有                         无
首部开销        20 字节起                  固定 8 字节
通信方式        一对一                     一对一/一对多/广播/组播
速度/时延       较慢，有控制开销           快，几乎零额外开销`

const stickyCode = `# 长度字段法拆包：每条消息前加 4 字节长度头
# 发送端
def send_msg(sock, payload: bytes):
    header = len(payload).to_bytes(4, 'big')   # 先写消息长度
    sock.sendall(header + payload)              # 再写消息体

# 接收端：先读满 4 字节长度，再按长度读满消息体
def recv_msg(sock):
    header = recv_exactly(sock, 4)              # 必须读够 4 字节
    if header is None:
        return None
    length = int.from_bytes(header, 'big')
    return recv_exactly(sock, length)           # 再精确读够 length 字节

def recv_exactly(sock, n):
    buf = b''
    while len(buf) < n:                          # 循环直到凑够 n 字节
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None                          # 连接关闭
        buf += chunk
    return buf`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          TCP 可靠但「重」，UDP 轻快但「不管」。它们是传输层的两位主角，没有谁更好，只有谁更合适。
          这一章把它们摆在一起逐项对比，再讲清楚什么场景该选谁、以及绕不开的两道坎：
          <strong>UDP 上怎么做可靠</strong>，和 <strong>TCP 的粘包 / 拆包</strong>。
        </p>
      </Lead>

      <h2>逐项对比</h2>
      <p>
        两者的差异，本质都源于「<em>TCP 为可靠有序付出了代价，UDP 把这些代价省掉换取了速度</em>」：
      </p>
      <CodeBlock lang="text" title="TCP vs UDP" code={compareCode} />
      <ul>
        <li>
          <strong>连接</strong>：TCP 通信前要三次握手，UDP 拿起来就发，没有连接的概念。
        </li>
        <li>
          <strong>可靠与有序</strong>：TCP 用确认、重传、排序保证不丢不乱；UDP 尽力而为，丢了不补、乱了不管。
        </li>
        <li>
          <strong>首部开销</strong>：UDP 首部固定 8 字节，TCP 首部至少 20 字节，UDP 更省。
        </li>
        <li>
          <strong>通信方式</strong>：TCP 只能一对一；UDP 支持一对一、一对多、广播、组播。
        </li>
          <li>
          <strong>速度</strong>：UDP 没有握手、确认、拥塞控制的开销，时延更低、更快。
        </li>
      </ul>

      <h2>各自适合什么</h2>
      <ul>
        <li>
          <strong>TCP</strong>：要求数据一字节都不能错的场景——网页（HTTP）、文件传输（FTP）、邮件（SMTP）。
        </li>
        <li>
          <strong>UDP</strong>：要求快、能容忍少量丢失的场景——DNS 查询、视频直播、在线游戏，以及 HTTP/3 底层的 QUIC。
        </li>
      </ul>

      <Example title="直播为什么用 UDP">
        <p>
          看直播时，最怕的是「卡住等待」。如果用 TCP，某一帧画面的数据包丢了，TCP 会停下来反复重传、
          等它补齐才往后放——结果就是<strong>画面卡死、越拖越久</strong>。可对直播来说，一帧旧画面补回来已经没意义了，
          观众宁可<strong>丢掉这帧、直接看最新的</strong>。UDP 正好「不管丢包、不管顺序」，
          应用层只挑最新的画面渲染，体验反而更流畅。这就是「实时性比完整性更重要」的典型取舍。
        </p>
      </Example>

      <KeyIdea title="选型的一句话原则">
        <p>
          要<strong>不丢不乱</strong>、能容忍一点延迟，选 <strong>TCP</strong>；要<strong>低延迟、实时</strong>、
          能容忍少量丢失，选 <strong>UDP</strong>。如果既想要 UDP 的快、又想要部分可靠，那就在
          <strong>应用层自己实现可靠机制</strong>——这正是下面要讲的。
        </p>
      </KeyIdea>

      <h2>在 UDP 上实现可靠</h2>
      <p>
        UDP 本身不可靠，但我们可以把 TCP 那套思路<strong>搬到应用层</strong>：给每个包加序号、收到要回 ACK、
        没收到 ACK 就重传、乱序到达自己排序。这样既保留了 UDP 的灵活与低延迟，又按需补上可靠性。
        现实中的代表就是 <em>QUIC</em>（HTTP/3 的传输层，跑在 UDP 之上，自带可靠、有序、多路复用和加密）
        和 <em>KCP</em>（一种为低延迟优化的可靠 UDP 协议，游戏里常用）。
      </p>
      <Callout variant="warn" title="为什么不直接用 TCP">
        <p>
          既然要可靠，为何不干脆用 TCP？因为 TCP 内核实现僵化、改不动，还有<strong>队头阻塞</strong>
          （head-of-line blocking）等老问题；而在 UDP 上自建协议，可以按业务定制重传策略、拥塞算法、
          多路复用，灵活性高得多。QUIC 能在弱网下表现更好、连接迁移更顺滑，正是得益于此。
        </p>
      </Callout>

      <h2>TCP 粘包 / 拆包</h2>
      <p>
        TCP 是<strong>面向字节流</strong>的，它眼里没有「一条消息」的边界，只有连续的字节。于是会出现：
        你连发两条消息，接收方可能一次就读到了两条拼在一起（<em>粘包</em>），
        也可能一条消息被分成两次才读全（<em>拆包</em>）。注意 UDP 是面向报文的，天然保留边界，没有这个问题。
      </p>
      <p>解决办法是在应用层自己定义消息边界，常见三种：</p>
      <ul>
        <li><strong>定长消息</strong>：每条消息固定字节数，读满就是一条。简单但浪费、不灵活。</li>
        <li><strong>分隔符</strong>：用特殊字符（如换行符）分隔消息。要处理消息体里出现分隔符的转义问题。</li>
        <li>
          <strong>长度字段</strong>：每条消息前面加一个头，写明消息体的长度；接收方先读长度、再按长度读消息体。
          最通用，主流 RPC 框架基本都用它。
        </li>
      </ul>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「TCP 和 UDP 区别」，按「连接 / 可靠 / 有序 / 开销 / 通信方式 / 速度」六维对比，
        再各举两个典型场景；被追问「直播为什么用 UDP」就讲实时性优先于完整性的取舍；
        被问「粘包怎么解决」，直接答<strong>定长 / 分隔符 / 长度字段</strong>三选一，并说明长度字段最常用、
        强调这是因为 TCP 面向字节流、没有消息边界，而 UDP 面向报文不存在此问题。
      </p>

      <Practice title="用长度字段解决粘包">
        <p>
          下面是「长度字段」方案的伪代码：发送端给每条消息加 4 字节长度头；接收端先<strong>读满 4 字节</strong>
          拿到长度，再<strong>精确读够这么多字节</strong>作为消息体。关键在那个
          <code>recv_exactly</code>——必须循环读到凑够指定字节数，才能彻底躲开粘包 / 拆包。
        </p>
        <CodeBlock lang="python" title="length_prefix.py" code={stickyCode} />
        <p>
          想一想：如果不用 <code>recv_exactly</code> 而是一次 <code>recv</code> 就当成一条消息处理，
          在高并发或大消息下会出什么问题？（答案：读到半条或多条，正是粘包 / 拆包。）
        </p>
      </Practice>

      <Summary
        points={[
          'TCP 面向连接、可靠、有序但开销大、只能一对一；UDP 无连接、不可靠、首部小、支持广播组播、更快。',
          'TCP 适合网页/文件/邮件等不容出错的场景，UDP 适合 DNS/直播/游戏/QUIC 等低延迟可容错的场景。',
          '直播用 UDP，是因为实时性比完整性更重要——丢帧比卡顿更可接受。',
          '想在 UDP 上要可靠，就在应用层自建序号/确认/重传，代表是 QUIC 和 KCP，灵活性优于改不动的 TCP。',
          'TCP 面向字节流没有消息边界，会出现粘包/拆包；UDP 面向报文不存在该问题。',
          '解决粘包三法：定长、分隔符、长度字段，其中长度字段最通用，配合 recv_exactly 循环读满。',
        ]}
      />
    </>
  )
}
