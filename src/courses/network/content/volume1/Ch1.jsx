import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LayerModel from '@/courses/network/illustrations/LayerModel.jsx'

const curlVerboseCode = `# -v 让 curl 把每一层都打印出来，是观察分层最直观的工具
curl -v https://example.com

# 你会看到类似下面这些行，分别对应不同的层：
# * Trying 93.184.216.34:443...      <- 网络层：拿到 IP，准备连接
# * Connected to example.com         <- 传输层：TCP 三次握手完成
# * TLS handshake, TLS 1.3           <- 应用层之下的安全协商
# > GET / HTTP/2                     <- 应用层：发出 HTTP 请求（> 是发送）
# < HTTP/2 200                       <- 应用层：收到 HTTP 响应（< 是接收）`

const traceCode = `# ping：靠网络层的 ICMP 协议探测目标是否可达、往返时延多少
ping example.com

# traceroute：逐跳显示数据包经过了哪些路由器（网络层设备）
# 每一跳就是一台路由器，体现了网络层「逐跳转发」的工作方式
traceroute example.com   # Windows 上是 tracert`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          网络通信是一件极其复杂的事：要把一段文字从你的浏览器送到地球另一端的服务器，
          中间要经过网卡、网线、交换机、无数台路由器，还要处理丢包、乱序、寻址。
          如果让一个程序从头管到尾，没人写得出来。工程师的办法是<em>分层</em>：
          把大问题切成若干层，每层只解决一小块、只和上下相邻的层打交道。
          这就是 <em>OSI</em> 七层与 <em>TCP/IP</em> 四层模型要讲的事。
        </p>
      </Lead>

      <h2>为什么要分层</h2>
      <p>
        分层的核心价值是<strong>解耦</strong>与<strong>各司其职</strong>。每一层只做自己份内的事，
        并通过固定的接口向上一层提供服务、向下一层索取服务。上层不需要关心下层怎么实现：
        写 HTTP 的人不用关心数据到底是走网线还是 WiFi，因为那是链路层的事。
      </p>
      <p>
        这样带来的好处是：某一层的实现可以独立替换而不影响其他层。把网线换成无线、把 IPv4 换成 IPv6，
        上层的 HTTP 完全不用改动。复杂度被分摊到各层，每层都能单独设计、单独排错。
      </p>

      <h2>OSI 七层 vs TCP/IP 四层</h2>
      <p>
        <em>OSI</em>（Open Systems Interconnection）是理论上的参考模型，把通信分成七层；
        而真正跑在互联网上的是 <em>TCP/IP</em> 模型，它更务实，合并成四层。两者的对应关系是面试高频考点：
      </p>
      <ul>
        <li>
          <strong>应用层</strong>（TCP/IP）≈ OSI 的应用层 + 表示层 + 会话层：
          直接面向应用，代表协议有 <code>HTTP</code>、<code>DNS</code>、<code>FTP</code>、<code>SMTP</code>。
        </li>
        <li>
          <strong>传输层</strong>：提供端到端通信，用<em>端口</em>区分进程。代表协议是 <code>TCP</code>（可靠）和 <code>UDP</code>（高效）。
        </li>
        <li>
          <strong>网络层</strong>：负责<em>寻址</em>与<em>路由</em>，把数据包从源主机送到目的主机。
          代表协议 <code>IP</code>、<code>ICMP</code>，代表设备是<strong>路由器</strong>。
        </li>
        <li>
          <strong>链路层</strong>（OSI 拆成数据链路层 + 物理层）：在相邻节点间传输<em>帧</em>，用 <code>MAC</code> 地址寻址。
          代表协议 <code>Ethernet</code>、<code>ARP</code>，代表设备是<strong>交换机</strong>和网卡；物理层则负责比特在网线/光纤上的传输。
        </li>
      </ul>
      <p>
        记忆要点：OSI 比 TCP/IP 多出来的<em>表示层</em>（数据编码、加密、压缩）和<em>会话层</em>（建立、管理会话），
        在 TCP/IP 里都被并入了应用层，由应用自己处理。
      </p>

      <Example title="一个 HTTP 请求是怎样逐层封装的">
        <p>
          假设浏览器要发一条 <code>GET /index.html</code>，数据从上往下穿过每一层，每经过一层就被<strong>加上一个头部</strong>，
          像套娃一样一层层包起来，这个过程叫<em>封装</em>（encapsulation）：
        </p>
        <ul>
          <li>应用层：生成 HTTP 报文 <code>GET /index.html HTTP/1.1 ...</code>。</li>
          <li>传输层：加上 <code>TCP</code> 头（含源端口、目的端口 80/443），变成<em>段</em>（segment）。</li>
          <li>网络层：加上 <code>IP</code> 头（含源 IP、目的 IP），变成<em>包</em>（packet）。</li>
          <li>链路层：加上以太网帧头（含源 MAC、目的 MAC），变成<em>帧</em>（frame），交给物理层变成比特发出去。</li>
        </ul>
        <p>
          到了对端服务器，过程完全反过来：从链路层往上，每层<strong>剥掉</strong>属于自己的那个头部、读取里面的信息后交给上一层，
          这叫<em>解封装</em>（decapsulation），最后应用层重新拿到原始的 HTTP 报文。
        </p>
      </Example>

      <LayerModel />

      <KeyIdea title="每层只认自己的头部">
        <p>
          封装与解封装的精髓是：<strong>每一层只关心自己那一层的头部，把上层的所有内容统统当成不透明的「数据」</strong>。
          路由器只看 IP 头来决定往哪转发，根本不在乎里面装的是 HTTP 还是别的；交换机只看 MAC 头。
          正是这种「各扫门前雪」的约定，让分层得以解耦——任何一层都不必理解其他层的内容格式。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="路由器和交换机别搞混">
        <p>这是面试最爱抓的细节，对应不同的层：</p>
        <ul>
          <li>
            <strong>交换机</strong>工作在<em>链路层</em>，看 <code>MAC</code> 地址，负责局域网内部相邻设备之间转发帧。
          </li>
          <li>
            <strong>路由器</strong>工作在<em>网络层</em>，看 <code>IP</code> 地址，负责跨网络（不同子网之间）转发数据包。
          </li>
          <li>
            一句话区分：<strong>同一个局域网内</strong>靠交换机 + MAC；<strong>跨网段、跨城市</strong>靠路由器 + IP。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「为什么网络要分层」，别只背「解耦」两个字，要落到具体：
        分层让<strong>每层独立演进</strong>（IPv4 换 IPv6 不影响 HTTP）、<strong>复杂度可控</strong>（每层只解决一个小问题）、
        <strong>标准化协作</strong>（不同厂商的设备只要遵守同层协议就能互通）。
        被问「OSI 和 TCP/IP 区别」，答出层数对应关系，再点明谁是理论模型、谁是实际跑的，最后补一句表示层/会话层被并入应用层，就很完整了。
        被问「数据在网络里怎么走」，画出封装/解封装的套娃图，点明「每层加/剥自己的头部」，基本满分。
      </p>

      <Practice title="用命令行观察分层">
        <p>
          理论看十遍不如亲手敲一遍。<code>curl -v</code> 能把一次请求在各层发生的事按顺序打印出来，
          是把分层从抽象概念变成可见现象的最好工具：
        </p>
        <CodeBlock lang="bash" title="curl 观察一次请求的分层" code={curlVerboseCode} />
        <p>
          再用 <code>ping</code> 和 <code>traceroute</code> 直接观察网络层：前者靠 ICMP 测可达性和时延，
          后者把数据包途经的每一台路由器逐跳列出来，让你亲眼看到「逐跳转发」：
        </p>
        <CodeBlock lang="bash" title="ping / traceroute 观察网络层" code={traceCode} />
      </Practice>

      <Summary
        points={[
          '分层的核心是解耦与各司其职：每层只做一件事、只和相邻层用固定接口打交道，从而能独立演进、复杂度可控。',
          'OSI 是七层理论参考模型，TCP/IP 是实际运行的四层模型；OSI 的表示层、会话层在 TCP/IP 里被并入应用层。',
          '四层职责：应用层（HTTP/DNS）、传输层（TCP/UDP，用端口区分进程）、网络层（IP，寻址路由）、链路层（Ethernet/MAC，相邻节点传帧）。',
          '代表设备要分清：交换机在链路层看 MAC、管局域网内部；路由器在网络层看 IP、管跨网络转发。',
          '数据自上而下逐层加头部叫封装（报文→段→包→帧），到对端自下而上逐层剥头部叫解封装。',
          '关键约定：每层只认自己的头部，把上层内容当成不透明数据，这正是分层得以解耦的根本。',
        ]}
      />
    </>
  )
}
