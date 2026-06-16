import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const curlTimingCode = `# -w 让 curl 打印各阶段的累计耗时，把「输入 URL 到看到页面」拆开看
curl -s -o /dev/null -w \\
  'dns:    %{time_namelookup}s\\n\\
tcp:    %{time_connect}s\\n\\
tls:    %{time_appconnect}s\\n\\
ttfb:   %{time_starttransfer}s\\n\\
total:  %{time_total}s\\n' \\
  https://example.com

# time_namelookup ：DNS 解析完成的时刻
# time_connect    ：TCP 三次握手完成的时刻
# time_appconnect ：TLS 握手完成的时刻（HTTP 则为 0）
# time_starttransfer：拿到响应第一个字节（TTFB），含服务器处理时间
# time_total      ：整个过程结束`

const digCode = `# dig 直接观察 DNS 解析，能看到一层层往上问的过程
dig www.example.com

# +trace 显示完整递归路径：根域名服务器 -> 顶级域(.com) -> 权威域名服务器
dig +trace www.example.com`

const nslookupCode = `# 看一个域名的多条记录，理解 CDN 为什么会返回不同 IP
dig www.example.com A          # IPv4 地址
dig www.example.com AAAA       # IPv6 地址
dig www.example.com CNAME      # 别名，常见于接入 CDN 后
dig www.example.com NS         # 权威域名服务器

# 指定用不同的 DNS 服务器解析，对比结果（排查 DNS 污染/就近调度很有用）
dig @8.8.8.8 www.example.com
dig @223.5.5.5 www.example.com`

const tlsResumeCode = `# 观察 TLS 会话复用：第一次握手是完整 1-RTT，第二次可能走 0-RTT/会话票据
# --tlsv1.3 强制 1.3；多跑两次看 time_appconnect 是否明显下降
curl -s -o /dev/null -w 'tls: %{time_appconnect}s total: %{time_total}s\\n' \\
  --tlsv1.3 https://example.com

# 用 openssl 直接看证书链与协商出的协议版本、加密套件
openssl s_client -connect example.com:443 -servername example.com < /dev/null`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          「从浏览器输入一个 URL 到页面显示出来，中间发生了什么？」——这是网络面试里最经典、
          也最能看出深浅的一道题。它像一根线，把 DNS、TCP、TLS、HTTP、渲染等几乎所有知识点都串了起来。
          这一章我们就顺着这根线，把整条链路走一遍。
        </p>
      </Lead>

      <h2>完整链路一览</h2>
      <p>
        一次完整的访问大致按顺序经历这些阶段，记住这个骨架，回答时就不会漏：
      </p>
      <ul>
        <li><strong>URL 解析</strong>：浏览器拆出协议、域名、端口、路径。</li>
        <li><strong>DNS 解析</strong>：把域名翻译成 IP 地址。</li>
        <li><strong>建立 TCP 连接</strong>：和服务器完成三次握手。</li>
        <li><strong>TLS 握手</strong>：若是 HTTPS，再协商加密参数。</li>
        <li><strong>发 HTTP 请求</strong>：把请求报文发给服务器。</li>
        <li><strong>服务器处理并响应</strong>：返回 HTML 等内容。</li>
        <li><strong>浏览器解析渲染</strong>：构建页面并绘制到屏幕。</li>
        <li><strong>TCP 挥手</strong>：传输结束后关闭连接（四次挥手）。</li>
      </ul>

      <h3>第一步：URL 解析</h3>
      <p>
        浏览器先把 <code>https://www.example.com:443/path?q=1</code> 拆开：协议 <code>https</code>、
        主机 <code>www.example.com</code>、端口 <code>443</code>（HTTPS 默认 443、HTTP 默认 80）、
        路径与查询参数。拆出主机名之后，下一步就是把它变成能通信的 IP。
      </p>

      <h3>第二步：DNS 解析（域名变 IP）</h3>
      <p>
        计算机之间通信靠 IP，但人记不住一串数字，于是有了 <em>DNS</em>（Domain Name System）。
        解析时会层层查找缓存，命中就直接返回，越靠前越快：
      </p>
      <ul>
        <li><strong>浏览器缓存</strong>：浏览器自己记着最近解析过的域名。</li>
        <li><strong>系统缓存 / hosts</strong>：操作系统的 DNS 缓存，以及本地 <code>hosts</code> 文件里的静态映射。</li>
        <li><strong>本地 DNS 服务器</strong>：通常是运营商或公司提供的递归解析器，前面都没命中就由它出马。</li>
        <li>
          <strong>递归查询</strong>：本地 DNS 替你一路往上问——先问<em>根域名服务器</em>，
          再问 <code>.com</code> 这样的<em>顶级域服务器</em>，最后问 example.com 的<em>权威域名服务器</em>拿到最终 IP。
        </li>
      </ul>
      <p>
        每一级查到结果都会按 <em>TTL</em>（生存时间）缓存一段时间，所以同一个域名第二次访问通常快很多。
      </p>

      <h3>第二步补充：DNS 用 UDP 还是 TCP、记录类型与 CDN 调度</h3>
      <p>
        DNS 默认走 <strong>UDP 53</strong> 端口——查询和响应通常很小，UDP 无需握手、一来一回最快。
        但有两种情况会切到 <strong>TCP</strong>：一是响应内容太大超过 512 字节（UDP 报文上限，会先返回一个带
        <code>TC</code>「截断」标志的包，让客户端用 TCP 重发）；二是<em>区域传送</em>（zone transfer，主从 DNS 同步全量记录）。
        所以「DNS 用 UDP 还是 TCP」的标准答案是「以 UDP 为主，特定场景用 TCP」。
      </p>
      <p>
        域名解析返回的不只是一个 IP。常见<em>记录类型</em>有：<code>A</code>（IPv4）、<code>AAAA</code>（IPv6）、
        <code>CNAME</code>（别名，接入 CDN 后域名往往先 CNAME 到 CDN 厂商的域名）、<code>MX</code>（邮件服务器）、
        <code>NS</code>（权威服务器）、<code>TXT</code>（各种验证）。这也解释了一个常见现象：同一个域名，
        在不同地区、不同时间用 <code>dig</code> 解析出来的 IP 可能不一样——这是 CDN 在按地理位置、负载做<strong>就近调度</strong>，
        给你返回最近的边缘节点。
      </p>

      <h3>第三步：建立 TCP 连接（三次握手）</h3>
      <p>
        拿到 IP 后，传输层用 <em>TCP</em> 建立可靠连接，需要<strong>三次握手</strong>：
        客户端发 <code>SYN</code> → 服务器回 <code>SYN + ACK</code> → 客户端再回 <code>ACK</code>。
        三次的目的是<strong>双方都确认对方的收发能力都正常</strong>，连接才算建好（细节见后续章节）。
      </p>
      <p>
        这里有个常被忽略的细节：第三个 <code>ACK</code> 其实可以<strong>顺带把第一个 HTTP 请求一起发出去</strong>，
        而不必等 ACK 单独走完。Linux 的 <em>TCP Fast Open</em>（TFO）更进一步，能在 SYN 包里就携带数据，
        把建连和首个请求合并，省掉一个 RTT。理解这点，才能解释为什么有些场景「连接建立」和「发请求」的耗时几乎重叠。
      </p>

      <h3>第四步：TLS 握手（仅 HTTPS）</h3>
      <p>
        如果是 HTTPS，TCP 建好后还要做一次 <em>TLS</em> 握手：协商加密套件、验证服务器证书、交换密钥，
        之后的数据全程加密。这一步是 HTTPS 比 HTTP 多出来的耗时，但换来了机密性与完整性。
      </p>
      <p>
        握手耗时和 TLS 版本强相关：<strong>TLS 1.2 完整握手需要 2 个 RTT</strong>，<strong>TLS 1.3 优化到了 1 个 RTT</strong>，
        而且支持<em>会话复用</em>——第二次连同一个站点时，可凭上次的会话票据（session ticket）走 <strong>0-RTT</strong>，
        几乎不增加额外往返。这就是为什么「第二次访问 HTTPS 站点明显更快」的一个隐藏原因。HTTPS 的完整原理在后续章节单独讲，
        这里只要记住它在链路里的位置和量级即可。
      </p>
      <p>
        顺带一提，TLS 握手里有个叫 <code>SNI</code>（Server Name Indication）的扩展，作用是在一个 IP 上托管多个 HTTPS 站点时，
        告诉服务器「我要访问哪个域名」，好让它返回对应的证书。这也是 <code>curl --servername</code> 和
        <code>openssl s_client -servername</code> 要带域名的原因。
      </p>

      <h3>第五、六步：发 HTTP 请求 + 服务器响应</h3>
      <p>
        通道打通后，浏览器发出 HTTP 请求报文（请求行 + 请求头 + 可选请求体）。
        服务器处理后返回响应（状态行 + 响应头 + 响应体，比如 HTML）。
        这里 <em>HTTP 缓存</em>会介入：若命中强缓存（<code>Cache-Control</code>）直接用本地副本，
        否则带 <code>If-None-Match</code> 等问服务器，没变就返回 <code>304</code> 省掉传输。
      </p>

      <h3>第七步：浏览器解析渲染</h3>
      <p>
        拿到 HTML 后，浏览器开始把字符变成画面：
      </p>
      <ul>
        <li>解析 HTML 构建 <em>DOM</em> 树；解析 CSS 构建 <em>CSSOM</em> 树。</li>
        <li>两者合成<em>渲染树</em>（render tree），只包含要显示的内容。</li>
        <li><em>布局</em>（layout / reflow）：计算每个节点的位置和大小。</li>
        <li><em>绘制</em>（paint）：把像素画到屏幕上，必要时还有合成（composite）。</li>
      </ul>
      <p>
        期间遇到 <code>img</code>、<code>script</code>、<code>link</code> 等会再发起新的请求，整个链路可能并发地走很多遍。
      </p>

      <h3>第八步：TCP 挥手</h3>
      <p>
        数据传完、连接不再需要时，通过<strong>四次挥手</strong>优雅关闭。HTTP/1.1 默认 <code>keep-alive</code>，
        连接会复用一段时间再关，避免每个资源都重新握手。
      </p>

      <Example title="用面试官的追问串起整条链路">
        <p>面试官常常顺着你的回答一路深挖，提前想好这些追问，链路就活了：</p>
        <ul>
          <li>「为什么第二次访问更快？」→ DNS 缓存 + HTTP 缓存 + TCP 连接复用一起省了好几步。</li>
          <li>「DNS 用 TCP 还是 UDP？」→ 通常 UDP（快、无连接），响应过大或区域传送时用 TCP。</li>
          <li>「HTTPS 比 HTTP 慢在哪？」→ 多了一次 TLS 握手的往返。</li>
          <li>「输入 URL 后回车，连不上可能卡在哪？」→ 按链路逐段排查：DNS、TCP、TLS、HTTP、渲染。</li>
        </ul>
      </Example>

      <KeyIdea title="缓存是贯穿全程的隐藏主角">
        <p>
          这条链路里到处藏着缓存：<strong>DNS 缓存</strong>（浏览器/系统/本地 DNS 各级，按 TTL 失效）省掉解析，
          <strong>HTTP 缓存</strong>（强缓存直接用本地、协商缓存靠 304）省掉传输，<strong>TCP keep-alive</strong> 省掉重复握手。
          答这道题时主动点出缓存，往往是区分「背过」和「真懂」的关键。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="顺序和前提别说反">
        <p>常见踩坑，记牢这几个前提关系：</p>
        <ul>
          <li><strong>先 DNS 拿到 IP，才能 TCP 握手</strong>——没有 IP 就没法连接，顺序不能颠倒。</li>
          <li><strong>TLS 握手发生在 TCP 之后、HTTP 请求之前</strong>，而且只有 HTTPS 才有。</li>
          <li><strong>三次握手是建立连接、四次挥手是关闭连接</strong>，别把次数和场景搞混。</li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        回答这道题的最佳策略是<strong>先给骨架、再按需展开</strong>：先一口气说出
        「URL 解析 → DNS → TCP 三次握手 →（HTTPS 则 TLS 握手）→ 发 HTTP 请求 → 服务器响应 → 浏览器渲染 → TCP 挥手」，
        让面试官看到你脑子里有完整地图；然后每个阶段补一两句关键点（DNS 的多级缓存、三次握手的目的、缓存如何加速）。
        如果时间允许，主动抛出「第二次访问为什么更快」来引出缓存，加分明显。切忌一上来就钻进某个细节出不来。
      </p>

      <Practice title="把每个阶段的耗时量出来">
        <p>
          光会背不够，亲手测一次各阶段耗时，链路立刻具象。<code>curl -w</code> 能把 DNS、TCP、TLS、TTFB 拆开打印：
        </p>
        <CodeBlock lang="bash" title="curl 量各阶段耗时" code={curlTimingCode} />
        <p>
          想单独看 DNS 这一层，用 <code>dig</code>，<code>+trace</code> 还能看到从根服务器一路往下问的递归全过程：
        </p>
        <CodeBlock lang="bash" title="dig 观察 DNS 解析" code={digCode} />
        <p>
          再打开浏览器的 Network 面板，刷新页面看 Timing 一栏的 Queueing / DNS / Connection / TTFB / Content Download，
          和上面命令的结果对照，整条链路就从文字变成了你能亲眼看到的瀑布图。
        </p>
      </Practice>

      <Summary
        points={[
          '完整链路：URL 解析 → DNS 解析 → TCP 三次握手 →（HTTPS 则 TLS 握手）→ 发 HTTP 请求 → 服务器响应 → 浏览器渲染 → TCP 四次挥手。',
          'DNS 解析层层查缓存：浏览器缓存 → 系统缓存/hosts → 本地 DNS 服务器 → 递归查询（根 → 顶级域 → 权威），按 TTL 缓存。',
          '三次握手建立可靠 TCP 连接、确认双方收发能力；TLS 握手只在 HTTPS 出现，位于 TCP 之后、HTTP 请求之前。',
          '浏览器渲染：HTML→DOM、CSS→CSSOM，合成渲染树后经布局（layout）与绘制（paint）显示到屏幕。',
          '缓存贯穿全程：DNS 缓存省解析、HTTP 缓存（强缓存/304 协商缓存）省传输、TCP keep-alive 省重复握手，是第二次更快的原因。',
          '回答策略：先报完整骨架再逐段展开关键点，主动引出缓存，避免一头扎进单个细节。',
        ]}
      />
    </>
  )
}
