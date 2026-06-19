import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import NginxLB from '@/courses/nginx/illustrations/NginxLB.jsx'

const upstreamCode = `# 定义一组后端：一个 upstream 块就是一个后端集群
upstream tomcat_pool {
    # 默认策略是轮询（round-robin），这里再加上权重和长连接
    server 10.0.0.11:8080 weight=3 max_fails=2 fail_timeout=10s;
    server 10.0.0.12:8080 weight=1 max_fails=2 fail_timeout=10s;
    server 10.0.0.13:8080 backup;   # 备份机，只有前面全挂了才启用

    keepalive 32;   # 到后端保持 32 条空闲长连接，复用 TCP
}

server {
    listen 80;
    server_name shop.example.com;

    location / {
        proxy_pass http://tomcat_pool;        # 把请求转给这组后端
        proxy_http_version 1.1;               # 用长连接必须 1.1
        proxy_set_header Connection "";        # 清掉 Connection 头才能复用
        proxy_set_header Host $host;

        # 后端故障/超时时自动换下一台重试，提升可用性
        proxy_next_upstream error timeout http_502 http_503;
        proxy_connect_timeout 2s;             # 连后端超时，宜短
        proxy_read_timeout    30s;            # 等后端响应超时
    }
}`

const ipHashCode = `upstream tomcat_pool {
    ip_hash;   # 同一来源 IP 永远落到同一台后端，保住会话
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
}`

const leastConnCode = `upstream tomcat_pool {
    least_conn;                # 发给当前活跃连接最少的那台
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
    server 10.0.0.13:8080;
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一台后端扛不住了，最自然的想法就是「多上几台，把流量分一分」。
          负载均衡（<em>load balancing</em>）做的正是这件事：前面摆一个 Nginx，
          后面挂一组干同样活的服务器，Nginx 按某种规则把每个请求派给其中一台。
          它既能横向扩容，又能在某台挂掉时自动绕开，是高可用架构的第一块基石。
        </p>
      </Lead>

      <h2>upstream：先把后端集群定义出来</h2>
      <p>
        在 Nginx 里，一组后端用一个 <code>upstream</code> 块来描述，每行一个
        <code>server</code>。定义好之后，在 <code>location</code> 里用
        <code>proxy_pass http://集群名</code> 引用它，Nginx 就会在这组机器之间分流。
        最常见的场景就是「一组 Tomcat 后端分流」：三台 Tomcat 提供相同的接口，
        Nginx 在前面把用户请求轮流派下去。
      </p>
      <p>
        <code>server</code> 行后面还能挂一串参数，实战里都用得上：<code>weight</code> 权重、
        <code>max_fails</code>/<code>fail_timeout</code> 被动健康检查、<code>backup</code> 备份机（前面全挂才启用）、
        <code>down</code> 手动摘除（发版时先标 down 再 reload，把这台从流量里平滑摘掉）。
        理解这几个参数，比单纯背策略名更能体现你真的部署过。
      </p>

      <h3>分流策略：把请求派给谁</h3>
      <p>Nginx 内置和常用的几种策略要分清楚，这也是面试高频考点：</p>
      <ul>
        <li>
          <strong>round-robin（轮询）</strong>：默认策略，请求按顺序一台一台轮着发，最简单也最均匀。
        </li>
        <li>
          <strong>weight（加权轮询）</strong>：给配置高的机器更大权重，
          <code>weight=3</code> 就比 <code>weight=1</code> 多分到三倍流量，适合后端机器配置不一致的情况。
        </li>
        <li>
          <strong>ip_hash（会话保持）</strong>：按客户端 IP 做哈希，同一个 IP 永远落到同一台后端，
          解决「session 存在本机内存、换台机器就掉登录」的问题。
        </li>
        <li>
          <strong>least_conn（最少连接）</strong>：把请求发给当前活跃连接数最少的那台，
          适合请求耗时差异大的场景，避免慢请求把某台压垮。
        </li>
        <li>
          <strong>fair / url_hash</strong>：第三方模块。<em>fair</em> 按后端响应时间分配（谁快给谁），
          <em>url_hash</em> 按 URL 哈希分配（同一资源固定打到同一台，便于命中缓存），都需要额外编译模块。
        </li>
      </ul>

      <h3>策略选型一张表</h3>
      <table>
        <thead>
          <tr>
            <th>策略</th>
            <th>分流依据</th>
            <th>适用场景</th>
            <th>注意</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>round-robin</td>
            <td>顺序轮流</td>
            <td>后端同构、请求均匀</td>
            <td>默认，无需配置</td>
          </tr>
          <tr>
            <td>weight</td>
            <td>权重比例</td>
            <td>后端配置不一致</td>
            <td>本质仍是轮询</td>
          </tr>
          <tr>
            <td>ip_hash</td>
            <td>客户端 IP 哈希</td>
            <td>有本地 session</td>
            <td>节点变动会重哈希丢会话</td>
          </tr>
          <tr>
            <td>least_conn</td>
            <td>活跃连接数</td>
            <td>请求耗时差异大</td>
            <td>长短请求混合更优</td>
          </tr>
          <tr>
            <td>url_hash</td>
            <td>URL 哈希</td>
            <td>缓存命中优化</td>
            <td>需第三方模块</td>
          </tr>
        </tbody>
      </table>

      <Example title="一组 Tomcat 后端，配置不一样怎么分">
        <p>
          假设有三台 Tomcat：两台 16 核新机器、一台 8 核老机器。直接平均分显然不公平，
          老机器会先扛不住。用加权轮询：新机器各 <code>weight=3</code>，老机器
          <code>weight=1</code>，于是七份流量里新机器各拿三份、老机器拿一份，按能力分配。
        </p>
        <p>
          如果业务还把登录态存在 Tomcat 本地 session 里，那再叠一层
          <code>ip_hash</code>：同一用户始终回到同一台，就不会刚登录完一刷新又变成未登录了。
          不过 ip_hash 和 weight 不能完美共存，更彻底的做法是把 session 外置到 Redis，
          让后端变成无状态——这样任何策略都能随便用。
        </p>
      </Example>

      <NginxLB />

      <h3>least_conn：耗时不均时更聪明</h3>
      <p>
        轮询有个隐患：如果某些请求特别慢（大查询、导出报表），轮询照样往那台塞新请求，慢请求堆积、它先被压垮。
        <code>least_conn</code> 改成「谁手上活少给谁」，自然把流量从忙碌节点引开。它的代价是 Nginx 要维护每台的连接计数，
        但在请求耗时分布不均的真实业务里，往往比纯轮询稳得多。
      </p>
      <CodeBlock lang="nginx" title="least_conn 最少连接" code={leastConnCode} />

      <h3>健康检查：把挂掉的机器踢出去</h3>
      <p>
        分流的前提是「派过去的机器还活着」。Nginx 开源版自带的是<strong>被动健康检查</strong>：
        靠 <code>max_fails</code> 和 <code>fail_timeout</code> 两个参数。
        含义是「在 <code>fail_timeout</code> 时间窗内，对某台后端失败累计达到
        <code>max_fails</code> 次，就把它标记为不可用，并在 <code>fail_timeout</code>
        这段时间内不再往它派请求」，过后再试探性放行。它不主动探活，而是借真实请求的成败来判断。
      </p>
      <p>
        和它配套的是 <code>proxy_next_upstream</code>：当一台返回 error/timeout/502 等，Nginx 自动换下一台重试，
        对用户来说这次请求依旧成功。被动检查的边界是「<strong>要先有真实请求踩坑，才能发现故障</strong>」，
        所以低流量时故障可能发现得慢。如果想要<strong>主动健康检查</strong>（Nginx 定时发探测请求、不靠真实流量去试错），
        要么用商业版 Nginx Plus 的 <code>health_check</code>，要么上
        <code>nginx_upstream_check_module</code> 这个第三方模块。面试里能说清
        「开源版被动、Plus/第三方主动」这条分界，就很到位了。
      </p>

      <h3>keepalive：到后端也用长连接</h3>
      <p>
        默认情况下，Nginx 每次转发都和后端新建一条 TCP 连接、用完就关，高并发下三次握手的开销很可观。
        在 upstream 里加 <code>keepalive 32</code>，Nginx 就会维护一个到后端的空闲长连接池，反复复用，
        省下大量握手与挥手。要注意两个配套项：<code>proxy_http_version 1.1</code> 和
        <code>proxy_set_header Connection ""</code>，缺了它们长连接是开不起来的。
        原理上 HTTP/1.0 默认短连接、且默认带 <code>Connection: close</code>，所以必须升到 1.1 并清空该头，
        TCP 连接才会被池子留住复用。
      </p>

      <KeyIdea title="负载均衡的两层目标">
        <p>
          负载均衡同时解决<strong>扩展性</strong>和<strong>可用性</strong>两件事：平时把流量摊到多台机器上提升吞吐，
          某台故障时靠健康检查自动绕开、不影响整体。要让它真正好用，关键是把后端做成
          <strong>无状态</strong>——会话外置、本地不存数据，这样加机器、踢机器都是即插即用。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="几个容易翻车的点">
        <ul>
          <li>
            用了 <code>ip_hash</code> 又指望它万无一失：某台后端下线时，
            原本打到它的用户会被重新哈希到别的机器，会话照样丢——会话保持不是万能药。
          </li>
          <li>
            <code>proxy_pass</code> 引用集群名时要注意末尾斜杠（带不带斜杠会改变 URI 拼接规则），
            转发路径出问题往往就在这。
          </li>
          <li>
            开了 keepalive 却忘了设 <code>proxy_http_version 1.1</code> 和清空
            <code>Connection</code> 头，长连接池形同虚设，白配。
          </li>
          <li>
            ip_hash 遇到客户端都在同一个 NAT 出口（如整个公司一个公网 IP）时会严重倾斜，全压到一台——
            这种场景宁可上 cookie 粘性或会话外置。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Nginx 怎么做负载均衡」，可以这样组织：先说<strong>用 upstream 定义一组后端、proxy_pass 引用</strong>；
        再说<strong>策略</strong>（默认轮询，可加 weight 加权、ip_hash 保会话、least_conn 按连接数，第三方还有 fair/url_hash）；
        然后说<strong>健康检查</strong>（开源版被动靠 max_fails/fail_timeout，主动探活要 Plus 或第三方模块）；
        最后补一句<strong>到后端用 keepalive 长连接复用</strong>，并强调
        <strong>把后端做成无状态</strong>是让这套机制好用的前提。层层递进，面试官会觉得你真用过。
      </p>
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「ip_hash 和 weight 能一起用吗？」——ip_hash 下 weight 基本失效，会话保持与按权重分流是矛盾的，要保会话优先用外置 session。
          </li>
          <li>
            「后端某台挂了用户会报错吗？」——配了 proxy_next_upstream 会自动重试下一台，用户通常无感。
          </li>
          <li>
            「发版怎么不影响线上？」——把该节点标 <code>down</code> 或摘出 upstream，等流量排空再重启，再放回（滚动发布）。
          </li>
          <li>
            「四层还是七层负载？」——upstream 在 http 块是七层（看得懂 HTTP）；stream 块是四层（TCP/UDP 转发，看不懂应用层）。
          </li>
        </ul>
      </Callout>

      <Practice title="搭一组后端，亲手分流">
        <p>
          在本地用三个不同端口模拟三台 Tomcat（比如 8081/8082/8083 各跑一个返回自身端口的服务），
          配一个 upstream 把它们组起来，反复刷新看请求是否在三台之间轮转；
          再把策略换成 weight 和 ip_hash，对比效果。
        </p>
        <CodeBlock lang="nginx" title="nginx.conf" code={upstreamCode} />
        <p>
          想体验会话保持，把上面的 upstream 换成下面这版加 <code>ip_hash</code> 的，
          用同一台机器连续访问，观察是不是始终落在同一个后端端口：
        </p>
        <CodeBlock lang="nginx" title="nginx.conf（会话保持版）" code={ipHashCode} />
        <p>
          进阶：把其中一个端口的服务关掉，观察 Nginx 是否在 <code>max_fails</code> 次失败后把它踢出、请求自动落到其余两台，
          再把它重新拉起，看 <code>fail_timeout</code> 过后流量是否回流——这就把健康检查的闭环亲手跑通了。
        </p>
      </Practice>

      <Summary
        points={[
          'upstream 块定义一组后端，location 里用 proxy_pass http://集群名 引用，Nginx 即在这组机器间分流。',
          '策略：默认 round-robin 轮询，weight 加权、ip_hash 会话保持、least_conn 最少连接，fair/url_hash 是第三方模块。',
          'least_conn 在请求耗时不均时优于轮询，把流量从忙碌节点引开。',
          '健康检查：开源版被动检查靠 max_fails 与 fail_timeout 把故障机踢出再试探恢复，配 proxy_next_upstream 自动重试；主动探活需 Nginx Plus 或第三方模块。',
          'keepalive 到后端复用长连接省握手开销，需配 proxy_http_version 1.1 和清空 Connection 头。',
          'ip_hash 会话保持有局限（节点变动重哈希、NAT 倾斜），更彻底的做法是把 session 外置、让后端无状态。',
          '负载均衡同时换来扩展性与可用性，无状态后端是它即插即用的前提；http 块是七层、stream 块是四层。',
        ]}
      />
    </>
  )
}
