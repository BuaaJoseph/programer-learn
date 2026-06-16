import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const requestMsg = `GET /index.html HTTP/1.1      ← 请求行：方法 + 路径 + 协议版本
Host: www.example.com          ← 请求头开始
User-Agent: curl/8.4.0
Accept: text/html
Connection: keep-alive
                               ← 这里有一个空行，表示头部结束
（GET 没有请求体；POST 的表单数据就放在空行之后）`

const responseMsg = `HTTP/1.1 200 OK                ← 状态行：协议版本 + 状态码 + 原因短语
Content-Type: text/html; charset=utf-8
Content-Length: 1024
Cache-Control: max-age=3600
Connection: keep-alive
                               ← 空行，头部结束
<!DOCTYPE html>...             ← 响应体`

const curlCmd = `# -I 只发 HEAD 请求，只看响应头不下载正文
curl -I https://www.example.com/

# 典型输出（节选）：
HTTP/2 200
content-type: text/html; charset=utf-8
cache-control: max-age=600
etag: "3f80f-1b6-3e1cb03b"
last-modified: Wed, 21 Oct 2025 07:28:00 GMT`

const cacheHeaders = `# 强缓存：服务端告诉浏览器「这份资源 1 小时内别再来问我」
Cache-Control: max-age=3600
Expires: Wed, 16 Jul 2026 10:00:00 GMT   ← 老式写法，绝对时间

# 协商缓存：浏览器带着上次的标识来问「变了没」
# 请求头：
If-None-Match: "3f80f-1b6-3e1cb03b"      ← 对应上次的 ETag
If-Modified-Since: Wed, 21 Oct 2025 07:28:00 GMT
# 没变，服务端回 304，不带正文：
HTTP/1.1 304 Not Modified`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你在浏览器地址栏敲下一个网址、按下回车，背后真正发生的事，是浏览器按照一套约定好的格式，
          往服务器发了一段纯文本，服务器又按同样的格式回了一段纯文本。这套「约定」就是 <em>HTTP</em>
          （HyperText Transfer Protocol），它是 Web 世界最核心的应用层协议。把报文格式、方法、状态码
          和版本演进搞清楚，几乎覆盖了前后端面试里关于网络的半壁江山。
        </p>
      </Lead>

      <h2>HTTP 的三个底层特点</h2>
      <p>
        在记任何细节之前，先记住 HTTP 的三个性格，后面很多设计都是从这三点推导出来的：
      </p>
      <ul>
        <li>
          <strong>无状态</strong>（stateless）：服务器不会天然记得「你是谁」。每个请求都是独立的，
          服务器处理完就忘。这就引出了后面要讲的 Cookie/Session——靠它们在无状态的协议上「装」出会话。
        </li>
        <li>
          <strong>明文传输</strong>：HTTP 报文本身是没有加密的纯文本，链路上任何人都能看、能改。
          这正是 HTTPS 存在的理由（下一章细讲）。
        </li>
        <li>
          <strong>基于 TCP</strong>：HTTP 是应用层协议，它把可靠传输这件苦活外包给了传输层的 <em>TCP</em>，
          所以发请求前要先 TCP 三次握手建立连接。
        </li>
      </ul>

      <h2>请求与响应报文长什么样</h2>
      <p>
        HTTP 报文分两类：客户端发的<strong>请求报文</strong>和服务端回的<strong>响应报文</strong>。
        两者结构高度对称，都由三部分组成：起始行、头部（headers）、以及一个空行之后的可选消息体（body）。
      </p>

      <Example title="一个最朴素的请求报文">
        <p>请求行写明「我要干什么」，头部补充各种元信息，空行之后才是请求体：</p>
        <CodeBlock lang="http" title="HTTP 请求报文" code={requestMsg} />
        <p>
          注意那个<strong>空行</strong>：它是头部和正文的分界线，缺了它服务器就不知道头到哪结束了。
        </p>
      </Example>

      <Example title="对应的响应报文">
        <CodeBlock lang="http" title="HTTP 响应报文" code={responseMsg} />
        <p>
          响应的起始行叫<strong>状态行</strong>，里面那个 <code>200</code> 就是状态码，
          <code>OK</code> 是给人看的原因短语。
        </p>
      </Example>

      <h2>常见方法：GET vs POST 与幂等性</h2>
      <p>
        HTTP 方法表示「对资源想做的动作」。面试最爱问 GET 和 POST 的区别，标准答案是这几条：
      </p>
      <ul>
        <li>
          <strong>语义</strong>：<code>GET</code> 用来获取资源，<code>POST</code> 用来提交数据（如创建）。
        </li>
        <li>
          <strong>参数位置</strong>：GET 参数拼在 URL 的查询串里（会被浏览器历史、日志记录），
          POST 参数放在请求体里（相对不那么显眼，但<em>不等于</em>安全，明文一样能被抓包）。
        </li>
        <li>
          <strong>幂等性</strong>：GET 是幂等的，重复发多少次结果都一样；POST 不幂等，重复提交可能创建多条数据
          （这就是为什么刷新提交表单的页面会弹「确认重新提交」）。
        </li>
      </ul>
      <p>
        其余常用方法：<code>PUT</code>（整体替换/更新资源，幂等）、<code>DELETE</code>（删除资源，幂等）、
        <code>HEAD</code>（只要响应头不要正文）、<code>OPTIONS</code>（询问服务器支持什么，跨域预检会用到）。
      </p>

      <KeyIdea title="幂等不是「只能调一次」，而是「调多次效果等于调一次」">
        <p>
          很多人把幂等理解成「只能执行一次」，其实它说的是：用同样的参数发 N 次请求，
          对服务器状态的<strong>最终影响</strong>和发 1 次一样。<code>DELETE /user/5</code> 删一次和删三次，
          结果都是「5 号没了」，所以幂等；而 <code>POST /order</code> 提交三次会生成三个订单，所以不幂等。
          幂等性是做<strong>失败重试</strong>时的关键依据。
        </p>
      </KeyIdea>

      <h2>常见状态码：用首位数字分大类</h2>
      <p>
        状态码三位数，第一位定大类，记住大类再记几个高频的就够用了：
      </p>
      <ul>
        <li>
          <strong>2xx 成功</strong>：<code>200 OK</code>（成功）、<code>201 Created</code>（创建成功）、
          <code>204 No Content</code>（成功但无正文）。
        </li>
        <li>
          <strong>3xx 重定向</strong>：<code>301</code> 永久重定向（搜索引擎会更新收录，浏览器会缓存跳转），
          <code>302</code> 临时重定向（这次先去别处，下次还来问我）；<code>304 Not Modified</code> 用于协商缓存。
        </li>
        <li>
          <strong>4xx 客户端错误</strong>：<code>400</code> 请求格式错，<code>401 Unauthorized</code>（未认证，你还没登录），
          <code>403 Forbidden</code>（已认证但没权限），<code>404 Not Found</code>（资源不存在）。
        </li>
        <li>
          <strong>5xx 服务端错误</strong>：<code>500</code> 服务器内部错误，<code>502 Bad Gateway</code>（网关拿到的上游响应有问题），
          <code>503 Service Unavailable</code>（服务暂时不可用，如过载或维护）。
        </li>
      </ul>

      <Callout variant="warn" title="别混淆的两组状态码">
        <p>
          <strong>301 vs 302</strong>：301 是「这地址永久搬家了」，会被强缓存，慎用——一旦发错很难纠回来；
          302 是「临时去别处」，每次仍走原地址。<strong>401 vs 403</strong>：401 是「我不知道你是谁」（去登录），
          403 是「我知道你是谁，但这事你没资格做」（别白费劲登录了）。
        </p>
      </Callout>

      <h2>连接复用：keep-alive</h2>
      <p>
        早期 HTTP 每发一个请求就要新建一个 TCP 连接、用完就关，而 TCP 三次握手是有成本的。
        <em>keep-alive</em>（持久连接）让一个 TCP 连接发完一个请求后<strong>不立刻关闭</strong>，
        后续请求继续复用它，省掉了反复握手的开销。HTTP/1.1 默认开启 keep-alive，靠
        <code>Connection: keep-alive</code> 头协商。
      </p>

      <h2>版本演进：每一代解决上一代的痛</h2>
      <p>
        HTTP 的版本史，就是一部「不断压榨延迟」的历史，每一代都在补前一代的短板：
      </p>
      <ul>
        <li>
          <strong>HTTP/1.0</strong>：一个连接一个请求，用完即关，每次都重新握手，慢。
        </li>
        <li>
          <strong>HTTP/1.1</strong>：默认<strong>长连接</strong>（keep-alive）复用 TCP；引入<em>管道化</em>（pipelining）
          允许不等响应就连发多个请求——但响应必须按序返回，前一个慢就堵住后面，即<strong>队头阻塞</strong>
          （head-of-line blocking），所以管道化实际很少用。
        </li>
        <li>
          <strong>HTTP/2</strong>：把文本报文改成<strong>二进制分帧</strong>，在一个连接上用<em>多路复用</em>
          （multiplexing）并行跑多个请求/响应，互不阻塞；用 <em>HPACK</em> 做<strong>头部压缩</strong>（重复的头只发一次）；
          还支持<em>服务端推送</em>（server push，主动把资源推给客户端，现已逐渐废弃）。但它仍跑在 TCP 上，
          一旦底层 TCP 丢包，所有流都得等重传——队头阻塞从应用层下沉到了传输层。
        </li>
        <li>
          <strong>HTTP/3</strong>：干脆抛弃 TCP，改用基于 <strong>UDP</strong> 的 <em>QUIC</em> 协议。
          QUIC 在 UDP 之上自己实现了多路复用和可靠传输，各个流相互独立，一个流丢包不会卡住其它流，
          从根上解决了 TCP 层的队头阻塞，弱网下尤其明显。
        </li>
      </ul>

      <h2>HTTP 缓存：强缓存与协商缓存</h2>
      <p>
        缓存是性能优化的大头，分两档，浏览器先查强缓存、不命中再走协商缓存：
      </p>
      <ul>
        <li>
          <strong>强缓存</strong>：服务端用 <code>Cache-Control: max-age=3600</code>（或老式的 <code>Expires</code>）
          告诉浏览器「这份资源多少秒内有效」。有效期内浏览器<strong>直接用本地缓存，根本不发请求</strong>。
        </li>
        <li>
          <strong>协商缓存</strong>：强缓存过期后，浏览器并不盲目重下，而是带上标识去问服务器「变了没」。
          标识有两套：<em>ETag</em>（资源内容的指纹，请求时放进 <code>If-None-Match</code>）和
          <em>Last-Modified</em>（最后修改时间，请求时放进 <code>If-Modified-Since</code>）。
          没变服务器回 <code>304 Not Modified</code>（不带正文，省流量），变了才回 200 加新内容。
        </li>
      </ul>

      <Example title="缓存头实战">
        <CodeBlock lang="http" title="强缓存与协商缓存的头" code={cacheHeaders} />
        <p>
          <code>ETag</code> 比 <code>Last-Modified</code> 更精确——后者只精确到秒，且文件内容没变只是被重新保存时
          时间也会变，导致缓存白白失效；ETag 是按内容算的指纹，更靠谱。
        </p>
      </Example>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「在浏览器输入 URL 到看到页面经历了什么」，HTTP 这一段可以这样串：DNS 解析拿到 IP →
        TCP 三次握手（HTTPS 还要 TLS 握手）→ 浏览器构造 HTTP 请求报文发出 → 服务器返回响应报文（可能命中缓存走 304）→
        浏览器解析渲染。被问 GET/POST，别只背「一个在 URL 一个在 body」，要点出<strong>语义</strong>和
        <strong>幂等性</strong>。被问版本演进，主线就一句话：<strong>1.1 长连接、2.0 多路复用、3.0 用 QUIC 灭队头阻塞</strong>。
      </p>

      <Practice title="用 curl 亲手看一遍响应头">
        <p>
          <code>curl -I</code> 只发 HEAD 请求，能干净地看到服务器返回的所有响应头，
          重点观察里面的 <code>cache-control</code>、<code>etag</code>、<code>last-modified</code>，
          再连发两次、对照第二次有没有命中协商缓存返回 304。
        </p>
        <CodeBlock lang="bash" title="curl 看响应头" code={curlCmd} />
        <p>
          进阶：加 <code>-v</code> 看完整的请求和响应头，加 <code>--http2</code> 或 <code>--http3</code>
          指定协议版本，对比响应行里是 <code>HTTP/1.1</code> 还是 <code>HTTP/2</code>。
        </p>
      </Practice>

      <Summary
        points={[
          'HTTP 的三个底色：无状态、明文、基于 TCP——后面 Cookie、HTTPS 都是从这三点补出来的。',
          '报文 = 起始行 + 头部 + 空行 + 可选消息体；请求行带方法和路径，状态行带状态码。',
          'GET 幂等、参数在 URL；POST 不幂等、参数在体内；幂等指「调多次等于调一次」，是重试的依据。',
          '状态码看首位：2xx 成功、3xx 重定向（301 永久 vs 302 临时）、4xx 客户端错（401 未认证 vs 403 没权限）、5xx 服务端错。',
          '版本主线：1.1 长连接 → 2.0 二进制分帧/多路复用/HPACK → 3.0 基于 QUIC/UDP 根除队头阻塞。',
          '缓存分强缓存（Cache-Control/Expires，不发请求）和协商缓存（ETag/Last-Modified，命中回 304）。',
        ]}
      />
    </>
  )
}
