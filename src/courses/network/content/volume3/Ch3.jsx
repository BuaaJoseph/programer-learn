import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const dnsRecords = `; A 记录：域名直接指向一个 IP
www.example.com.    A      93.184.216.34

; CNAME 记录：域名指向另一个域名（别名），常用于 CDN
img.example.com.    CNAME  example.cdn-provider.com.
; 浏览器拿到 CNAME 后会继续解析那个目标域名，直到拿到 A 记录的 IP`

const setCookie = `# 登录成功后，服务端在响应头里下发 Cookie：
Set-Cookie: sessionId=abc123xyz; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
#   HttpOnly  → JS 读不到，防 XSS 偷 Cookie
#   Secure    → 只在 HTTPS 下发送
#   SameSite  → 限制跨站携带，防 CSRF

# 之后浏览器每次请求会自动带上：
Cookie: sessionId=abc123xyz
# 服务端拿 sessionId 去自己的 Session 存储里查出「这是谁」`

const corsHeaders = `# 简单请求：服务端在响应头里允许某个源
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true        ← 允许跨域带 Cookie

# 非简单请求（如带自定义头的 PUT）会先发预检 OPTIONS：
# 请求：
OPTIONS /api/user HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Authorization
# 服务端回复允许什么：
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Authorization
# 预检通过，浏览器才放行真正的 PUT 请求`

const digTraceCode = `# 看完整的递归路径：根 -> 顶级域 -> 权威，理解 DNS 是怎么一级级问下来的
dig +trace www.example.com

# 直接看本地 DNS 缓存里某域名的 TTL（每查一次 TTL 会递减）
dig www.example.com | grep -A1 'ANSWER SECTION'
# www.example.com.  281  IN  A  93.184.216.34
#                   ^TTL 还剩 281 秒，到 0 就要重新解析

# 看 CNAME 链：很多大站的域名会先 CNAME 到 CDN 再解析出 IP
dig img.example.com CNAME +short`

const recordTypeCode = `; 常见 DNS 记录类型一览
example.com.        A      93.184.216.34      ; IPv4
example.com.        AAAA   2606:2800:220:1::  ; IPv6
www.example.com.    CNAME  example.com.       ; 别名
example.com.        MX  10 mail.example.com.  ; 邮件服务器（带优先级）
example.com.        NS     ns1.example.com.   ; 权威域名服务器
example.com.        TXT    "v=spf1 ..."       ; 文本，常用于域名所有权验证/反垃圾邮件`

const csrfCode = `# CSRF 攻击：诱导你在已登录状态下，由恶意页面悄悄发请求
# 恶意网站里藏一个自动提交的表单（浏览器会自动带上你的 Cookie）：
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker"><input name="amount" value="10000">
</form>
<script>document.forms[0].submit()</script>

# 防御：
# 1) SameSite=Lax/Strict   -> 跨站请求不带 Cookie，从根上断掉
# 2) CSRF Token            -> 表单里放一个服务端校验的随机 token
# 3) 校验 Origin/Referer   -> 确认请求来自本站`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          前两章讲了 HTTP 怎么传、HTTPS 怎么加密。这一章补齐 Web 运转的三块拼图：
          <em>DNS</em> 负责把人记得住的域名翻译成机器用的 IP；<em>Cookie/Session</em> 负责在无状态的 HTTP 上
          「记住你是谁」；<strong>同源策略与跨域</strong>则是浏览器的安全红线，也是前后端分离开发里最常踩的坑。
          这三个问题——「域名怎么变 IP」「登录态怎么保持」「前后端分离为啥跨域报错」——几乎是面试必考。
        </p>
      </Lead>

      <h2>DNS：把域名翻译成 IP</h2>
      <p>
        你访问 <code>www.example.com</code>，但网络只认 IP 地址。<em>DNS</em>（Domain Name System）就是那本
        「域名 → IP」的电话簿。查询过程结合了两种方式：
      </p>
      <ul>
        <li>
          <strong>递归查询</strong>：你的电脑把任务全权委托给本地 DNS 服务器（通常是运营商提供的），
          说「你帮我查到底，直接给我最终 IP」。
        </li>
        <li>
          <strong>迭代查询</strong>：本地 DNS 服务器接力去问——先问根域名服务器，根说「去问 .com 服务器」，
          再问 .com，它说「去问 example.com 的权威服务器」，最后从权威服务器拿到 IP。每一步只给下一步的线索，
          自己一级级追下去。
        </li>
      </ul>
      <p>
        为了不每次都跑这一大圈，<strong>各级都有缓存</strong>：浏览器缓存、操作系统缓存、本地 DNS 服务器缓存，
        缓存时长由记录的 <em>TTL</em> 控制。这也是为什么改了域名解析后「要过一会儿才生效」。
      </p>

      <Example title="A 记录与 CNAME 记录">
        <CodeBlock lang="dns" title="两种最常见的 DNS 记录" code={dnsRecords} />
        <p>
          <strong>A 记录</strong>把域名直接钉到一个 IP；<strong>CNAME</strong> 把域名指向<em>另一个域名</em>（别名），
          常用于接入 CDN——你只管把自己的域名 CNAME 到 CDN 厂商的域名，IP 的事交给它去调度。
        </p>
      </Example>

      <h2>无状态的 HTTP 怎么保持会话</h2>
      <p>
        HTTP 是无状态的：服务器处理完一个请求就忘了你。可登录后浏览各页面又得「记得你已登录」，
        这个矛盾就靠 Cookie 和 Session 这对搭档解决。
      </p>
      <ul>
        <li>
          <strong>Cookie</strong>：存在<strong>浏览器</strong>端的一小块数据。服务端通过 <code>Set-Cookie</code>
          响应头下发，之后浏览器对该站点的<strong>每个请求</strong>都会自动把它带上。
        </li>
        <li>
          <strong>Session</strong>：存在<strong>服务端</strong>的会话数据（如「这个会话对应用户张三」）。
        </li>
        <li>
          <strong>两者怎么配合</strong>：登录成功后，服务端创建一份 Session，把它的钥匙
          <code>sessionId</code> 写进 Cookie 发给浏览器。此后浏览器每次请求都带着 <code>sessionId</code>，
          服务端拿它去 Session 存储里查出「这是张三」。Cookie 只存了一个不起眼的 ID，真正的用户数据在服务端。
        </li>
      </ul>

      <Example title="登录态怎么保持：Set-Cookie 全流程">
        <CodeBlock lang="http" title="下发与携带 Cookie" code={setCookie} />
        <p>
          <code>HttpOnly</code>、<code>Secure</code>、<code>SameSite</code> 这几个属性是安全标配，
          分别防 JS 偷 Cookie、强制 HTTPS、限制跨站携带。
        </p>
      </Example>

      <KeyIdea title="Token / JWT：无状态的另一条路">
        <p>
          Session 把状态存在服务端，多台服务器就得共享 Session（否则你这次请求落到另一台它就不认识你了）。
          <em>Token</em> 方案（如 <em>JWT</em>）换了个思路：登录后服务端签发一个自带签名的令牌交给客户端，
          令牌里<strong>本身就装着用户信息</strong>，客户端之后每次请求带上它。服务端只<strong>验签名</strong>、
          不必存会话，天然适合分布式和前后端分离。代价是令牌签发后难以主动失效，且体积比 sessionId 大。
        </p>
      </KeyIdea>

      <h2>同源策略与跨域</h2>
      <p>
        <strong>同源策略</strong>是浏览器的核心安全机制：只有<strong>协议、域名、端口三者完全相同</strong>
        才算「同源」，脚本默认只能访问同源的资源。它防止恶意网站 A 偷偷拿你在网站 B 的登录态去发请求。
        只要三要素有一个不同，就是<strong>跨域</strong>，浏览器会拦截响应。
      </p>

      <Callout variant="warn" title="跨域是浏览器拦的，不是请求没发出去">
        <p>
          常见误解：以为跨域时请求根本没到服务器。其实<strong>请求大多发出去了、服务器也响应了</strong>，
          是<strong>浏览器</strong>因为响应里缺少允许跨域的头，把结果<strong>拦在了交给 JS 之前</strong>。
          所以你在控制台看到红色报错，但在后端日志里能看到这条请求被正常处理过。这也意味着跨域限制
          只对浏览器里的 JS 生效，服务器之间互相调用并没有这个限制。
        </p>
      </Callout>

      <h2>解决跨域的几种办法</h2>
      <p>
        前后端分离时，前端 <code>app.example.com</code> 调后端 <code>api.example.com</code> 就是跨域，常用解法：
      </p>
      <ul>
        <li>
          <strong>CORS</strong>（跨域资源共享）：主流方案。由<strong>服务端</strong>在响应头里用
          <code>Access-Control-Allow-Origin</code> 明确声明「我允许哪个源来访问我」。对于 PUT、DELETE
          或带自定义头的「非简单请求」，浏览器会先自动发一个 <code>OPTIONS</code> <strong>预检请求</strong>问清楚，
          服务端放行后才发真正的请求。
        </li>
        <li>
          <strong>JSONP</strong>：老方案，利用 <code>&lt;script&gt;</code> 标签不受同源策略限制的特性绕过，
          只能发 GET，已基本被 CORS 取代。
        </li>
        <li>
          <strong>网关 / 反向代理</strong>：让前端把请求发给同源的服务器（如 Nginx），再由它转发到真正的后端。
          因为浏览器看到的是同源请求，自然不触发跨域。
        </li>
      </ul>

      <Example title="CORS 响应头与预检">
        <CodeBlock lang="http" title="CORS 与 OPTIONS 预检" code={corsHeaders} />
        <p>
          带 Cookie 跨域时，服务端要加 <code>Access-Control-Allow-Credentials: true</code>，
          且 <code>Allow-Origin</code> 不能用通配符 <code>*</code>，必须写明确的源。
        </p>
      </Example>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「登录态怎么保持」，答主线：Cookie 存浏览器、Session 存服务端，
        Cookie 携带 <code>sessionId</code> 让服务端查出身份；分布式/前后端分离场景再提 Token/JWT 的无状态优势。
        被问「前后端分离为什么跨域、怎么解决」，先点出同源策略是<strong>协议+域名+端口</strong>三者相同、
        且是浏览器拦截，再答首选 <strong>CORS</strong>（注意非简单请求的 OPTIONS 预检），开发时也常用代理。
      </p>

      <Practice title="动手看 Set-Cookie 与 CORS 响应头">
        <p>
          打开浏览器开发者工具的 Network 面板，登录一个网站，找到登录请求，
          在响应头里看 <code>Set-Cookie</code>；再刷新页面，看后续请求的请求头里有没有自动带上 <code>Cookie</code>。
          然后用 <code>curl</code> 模拟带 <code>Origin</code> 的请求，观察服务端回的 CORS 头：
        </p>
        <CodeBlock lang="bash" title="用 curl 触发并查看 CORS 头" code={`curl -i -H "Origin: https://app.example.com" https://api.example.com/data`} />
        <p>
          对比响应里有没有 <code>Access-Control-Allow-Origin</code>，再换一个不被允许的 Origin，
          体会服务端是怎么决定「放不放行」的。
        </p>
      </Practice>

      <Summary
        points={[
          'DNS 把域名翻译成 IP：递归（委托本地 DNS 查到底）+ 迭代（本地 DNS 逐级追问根/顶级/权威），各级有缓存。',
          'A 记录指向 IP，CNAME 指向另一个域名（别名），CNAME 常用于接入 CDN。',
          'HTTP 无状态，靠 Cookie（存浏览器）+ Session（存服务端）保持会话，Cookie 携带 sessionId 让服务端识别身份。',
          'Token/JWT 把用户信息装进自带签名的令牌、服务端只验签不存会话，天然适合分布式与前后端分离。',
          '同源 = 协议 + 域名 + 端口三者全同；跨域是浏览器拦响应，请求其实已到服务器。',
          '解决跨域首选 CORS（服务端声明 Allow-Origin，非简单请求先发 OPTIONS 预检），另有 JSONP 和网关代理。',
        ]}
      />
    </>
  )
}
