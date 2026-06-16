import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RateLimit from '@/courses/nginx/illustrations/RateLimit.jsx'

const limitConf = `# 在 http 块里定义共享内存区
# 按客户端 IP 做 key，区名 req_zone，分配 10MB，限速每秒 10 个请求
limit_req_zone $binary_remote_addr zone=req_zone:10m rate=10r/s;
# 再定义一个限并发连接数的区
limit_conn_zone $binary_remote_addr zone=conn_zone:10m;

server {
    listen 80;
    server_name seckill.example.com;

    # 秒杀下单接口：前置限流
    location /seckill/order {
        # 速率限流：每秒 10 个，突发再放 20 个排队
        limit_req zone=req_zone burst=20 nodelay;
        # 并发限流：同一 IP 最多 5 条并发连接
        limit_conn conn_zone 5;
        # 被限流时返回 429 而不是默认的 503
        limit_req_status 429;
        limit_conn_status 429;

        proxy_pass http://order_backend;
    }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          再强的后端也有上限，一旦瞬时流量超过它的处理能力，整个系统会被拖垮、引发雪崩。
          限流（<em>rate limiting</em>）的思路很朴素：在 Nginx 这一层就把超出额度的请求挡掉或排队，
          只放后端扛得住的量进去。它是秒杀、抢购、防爬虫、抗刷接口的标配，也是面试的高频考点。
        </p>
      </Lead>

      <h2>limit_req：限请求速率（漏桶）</h2>
      <p>
        <code>limit_req</code> 控制的是<strong>请求进来的速率</strong>，底层是<em>漏桶</em>（leaky bucket）算法：
        请求像水一样倒进桶里，桶底以固定速率漏出（交给后端处理），超过桶容量的就溢出（被拒绝）。
        三个核心参数：
      </p>
      <ul>
        <li>
          <code>rate=10r/s</code>：漏出速率，每秒放行 10 个请求（也可写 <code>r/m</code> 按分钟）。
          这是稳态下后端实际承受的速率。
        </li>
        <li>
          <code>burst=20</code>：桶的额外容量。允许短时间内多来 20 个请求先排队等着，
          按 rate 慢慢漏出去，吸收突发尖峰，不至于一超速就直接拒。
        </li>
        <li>
          <code>nodelay</code>：配合 burst 使用。加了它，burst 里的请求<strong>立即处理</strong>而不是排队等待，
          只是仍占用桶的名额；不加 nodelay，这些请求会被均匀地延迟放行。
        </li>
      </ul>

      <h3>limit_conn：限并发连接数</h3>
      <p>
        <code>limit_req</code> 限的是「单位时间多少个请求」，<code>limit_conn</code> 限的是
        「同一时刻有多少条连接同时存在」。比如某个 IP 同时开了 100 条连接慢慢拖着下载大文件，
        请求速率不高但连接占满了，这时就该用 <code>limit_conn conn_zone 5</code> 限制每个 IP 最多 5 条并发连接。
        两者维度不同，常一起用。
      </p>

      <Example title="秒杀接口前置限流">
        <p>
          一个秒杀活动，开抢瞬间几十万人同时点「立即购买」。后端实际只有 1000 件库存，
          根本没必要让几十万请求全打到后端去抢锁、压数据库。合理的做法是在 Nginx 层就先限流：
          把下单接口的速率限到后端能稳定处理的水平，再用 <code>burst</code> 吸收一点尖峰，
          其余请求直接返回「活动太火爆，请稍后再试」。
        </p>
        <p>
          这样既保护了后端不被瞬时洪峰冲垮，又让真正有机会抢到的请求顺畅通过。
          这就是「把流量挡在最前面」在限流场景的体现——后端没必要为注定失败的请求买单。
        </p>
      </Example>

      <RateLimit />

      <h3>共享内存：limit_req_zone 与 limit_conn_zone</h3>
      <p>
        限流要在所有 worker 进程之间共享计数，所以得先在 <code>http</code> 块用
        <code>limit_req_zone</code> / <code>limit_conn_zone</code> 划一块<strong>共享内存区</strong>。
        定义里有三部分：限流的 <strong>key</strong>（按什么维度限，通常是
        <code>$binary_remote_addr</code>，即客户端 IP 的紧凑二进制形式，比字符串省内存）、
        区的<strong>名字和大小</strong>（如 <code>zone=req_zone:10m</code>，10MB 约能存十几万个 IP 的状态），
        以及 <code>limit_req_zone</code> 特有的 <strong>rate</strong>。
        在 <code>location</code> 里再用 <code>limit_req zone=区名 ...</code> 引用它。
      </p>

      <h3>返回码：被限流时返回什么</h3>
      <p>
        请求被限流拒绝时，Nginx 默认返回 <strong>503</strong>（Service Unavailable）。
        但 503 含义太泛，前端不好区分。可以用 <code>limit_req_status 429</code>
        把它改成更语义化的 <strong>429</strong>（Too Many Requests），让客户端明确知道是被限流了、可以稍后重试。
      </p>

      <KeyIdea title="限流是分层的，Nginx 是第一道闸">
        <p>
          Nginx 限流挡的是<strong>粗粒度</strong>的洪峰（按 IP、按接口的整体速率），优点是离用户最近、成本极低；
          但它看不到业务细节（比如「同一用户 ID 一分钟只能下一单」「某商品全局限购」）。
          所以它通常和<strong>应用层限流</strong>（基于 Redis + Lua 的令牌桶、Sentinel 等）配合：
          Nginx 先削峰，应用层再按业务维度精细控制。两层各司其职，不是二选一。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="限流的常见误区">
        <ul>
          <li>
            <strong>rate 设得过于严格</strong>：误伤正常用户。比如 NAT 后面一整个公司共用一个出口 IP，
            按 IP 限流可能把整间公司都限了，要结合实际评估 key 的选择。
          </li>
          <li>
            <strong>不加 burst 导致体验割裂</strong>：纯按 rate 卡，正常用户偶尔快点几下就被拒，
            适当的 burst 能平滑掉合理的突发。
          </li>
          <li>
            <strong>共享内存区太小</strong>：zone 设小了，存不下那么多 key，老的 key 会被挤掉，限流就不准了。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Nginx 怎么限流」，分两类讲：<strong>limit_req 限速率</strong>（漏桶算法，
        <code>rate</code> 定稳态速率、<code>burst</code> 吸收突发、<code>nodelay</code> 让突发请求不排队立即处理）；
        <strong>limit_conn 限并发连接数</strong>。两者都先用 <code>*_zone</code> 在 http 块开共享内存区、
        以 <code>$binary_remote_addr</code> 为 key，再在 location 里引用。
        补充<strong>默认 503、可改 429</strong>，以及<strong>和应用层限流配合</strong>分层削峰。
        这套答下来，覆盖了算法、参数、实现、返回码、架构定位五个维度。
      </p>

      <Practice title="给秒杀接口加一道限流闸">
        <p>
          搭一个简单后端，配上 <code>limit_req_zone</code> + <code>limit_req</code>，
          把速率限到 <code>10r/s</code>、<code>burst=20 nodelay</code>。
          用压测工具（如 <code>ab</code> 或 <code>wrk</code>）打超过这个速率的流量，
          观察有多少请求返回 200、多少被限流返回 429。
        </p>
        <CodeBlock lang="nginx" title="nginx.conf" code={limitConf} />
        <p>
          试着去掉 <code>nodelay</code> 再压一次，对比响应延迟的变化：
          有 nodelay 时突发请求秒回，没有时它们会被均匀地拖慢——这就是漏桶「匀速漏出」的直观表现。
        </p>
      </Practice>

      <Summary
        points={[
          'limit_req 限请求速率，基于漏桶算法：rate 定稳态速率、burst 吸收突发、nodelay 让突发请求立即处理而非排队。',
          'limit_conn 限同一时刻的并发连接数，与 limit_req 维度不同，常一起使用。',
          '先在 http 块用 limit_req_zone / limit_conn_zone 开共享内存区（key 常用 $binary_remote_addr），再在 location 里引用。',
          '被限流默认返回 503，可用 limit_req_status 改成更语义化的 429。',
          'Nginx 限流是粗粒度第一道闸，需与应用层（Redis+Lua、Sentinel）的业务维度限流分层配合。',
          'key 选择和 zone 大小要结合实际，过严会误伤、过小会失准，burst 用来平滑合理突发。',
        ]}
      />
    </>
  )
}
