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

const apiKeyConf = `# 按业务维度限流：不一定按 IP，可以按 API key / 用户 token
# 通过 map 从请求头取一个 key 作为限流维度
map $http_x_api_key $api_client {
    default        $http_x_api_key;   # 有 key 按 key 限
    ""             $binary_remote_addr; # 没 key 退回按 IP 限
}

limit_req_zone $api_client zone=api_zone:10m rate=100r/s;

server {
    location /api/ {
        limit_req zone=api_zone burst=50 nodelay;
        proxy_pass http://api_backend;
    }
}`

const whitelistConf = `# 白名单不限流：内部系统/合作方 IP 用 geo + map 设为空 key
geo $limit {
    default        1;
    10.0.0.0/8     0;     # 内网不限
    203.0.113.10   0;     # 某合作方公网 IP 不限
}

map $limit $limit_key {
    1   $binary_remote_addr;   # 需要限流的取 IP 作 key
    0   "";                    # 空 key = 不计入限流
}

limit_req_zone $limit_key zone=mixed_zone:10m rate=20r/s;`

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

      <h3>漏桶 vs 令牌桶：一个常被追问的细节</h3>
      <p>
        Nginx 的 <code>limit_req</code> 严格说是漏桶——<strong>出水恒定匀速</strong>，所以它能把流量整形得很平滑，
        后端看到的永远是稳定速率。这和<em>令牌桶</em>（token bucket，桶里按速率攒令牌，攒够了可以一次性放出一批突发）有本质区别：
        令牌桶允许「攒额度然后爆发」，漏桶则坚决匀速。
        <code>nodelay</code> 让 Nginx 表现得有点像令牌桶——突发的那 <code>burst</code> 个不排队、立即通过，但名额仍按 rate 恢复，
        所以可以理解成「漏桶的桶容量 + 令牌桶式的突发释放」的折中。面试被追问「Nginx 是漏桶还是令牌桶」，
        答「底层漏桶匀速整形，nodelay 借了令牌桶的突发体验」就很到位。
      </p>

      <h3>limit_conn：限并发连接数</h3>
      <p>
        <code>limit_req</code> 限的是「单位时间多少个请求」，<code>limit_conn</code> 限的是
        「同一时刻有多少条连接同时存在」。比如某个 IP 同时开了 100 条连接慢慢拖着下载大文件，
        请求速率不高但连接占满了，这时就该用 <code>limit_conn conn_zone 5</code> 限制每个 IP 最多 5 条并发连接。
        两者维度不同，常一起用。还有个常被忽略的 <code>limit_rate</code>——它限的是<strong>每个连接的下行带宽</strong>（如 <code>limit_rate 200k;</code>），
        防止单个大文件下载吃满出口带宽，和前两者凑成「速率 / 并发 / 带宽」三件套。
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
      <p>
        为什么要用<strong>共享内存</strong>而不是进程私有计数？因为 Nginx 有多个 worker，一个 IP 的请求可能落到不同 worker 上，
        计数必须放在所有 worker 都能读写的共享内存里，限流才准。这也是为什么 zone 一定定义在 http 块（全局），而不是某个 location 内。
      </p>

      <h3>限流维度不止 IP</h3>
      <p>
        key 可以是任何变量。对开放 API，按 IP 不合理（同一公司一个出口），更应该按 <strong>API key / 用户 token</strong> 限流：
      </p>
      <CodeBlock lang="nginx" title="按 API key 限流（map 取维度）" code={apiKeyConf} />
      <p>
        还有一类需求是<strong>白名单不限流</strong>：内部系统、合作方走快速通道。技巧是把 key 置空——空 key 不计入任何限流区：
      </p>
      <CodeBlock lang="nginx" title="白名单放行（geo + map 置空 key）" code={whitelistConf} />

      <h3>返回码：被限流时返回什么</h3>
      <p>
        请求被限流拒绝时，Nginx 默认返回 <strong>503</strong>（Service Unavailable）。
        但 503 含义太泛，前端不好区分。可以用 <code>limit_req_status 429</code>
        把它改成更语义化的 <strong>429</strong>（Too Many Requests），让客户端明确知道是被限流了、可以稍后重试。
        配合 <code>error_page 429 /busy.html;</code> 还能给用户返回一个友好的「活动太火爆」页面，而非生硬的错误码。
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
          <li>
            <strong>限流后未压测验证</strong>：rate 是否匹配后端真实容量，必须用 ab/wrk 压一遍校准，拍脑袋定值常常偏离实际。
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
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「Nginx 限流是漏桶还是令牌桶？」——底层漏桶匀速整形，nodelay 借了令牌桶的突发体验。
          </li>
          <li>
            「为什么 zone 要放在 http 块？」——多 worker 需共享计数，共享内存才能跨进程统计准确。
          </li>
          <li>
            「整个公司一个出口 IP 被误限怎么办？」——换限流维度（API key / token），或用 geo 白名单放行。
          </li>
          <li>
            「limit_req 和 limit_conn 区别？」——前者限单位时间请求数（漏桶），后者限同时存在的连接数。
          </li>
        </ul>
      </Callout>

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
          再把 key 换成 <code>$http_x_api_key</code>，用不同的 key 各打一轮，验证不同 key 之间额度互不影响。
        </p>
      </Practice>

      <Summary
        points={[
          'limit_req 限请求速率，基于漏桶算法：rate 定稳态速率、burst 吸收突发、nodelay 让突发请求立即处理而非排队。',
          '底层是漏桶匀速整形，nodelay 借了令牌桶的突发体验；这是面试高频追问点。',
          'limit_conn 限同一时刻的并发连接数，limit_rate 限单连接带宽，与 limit_req 凑成速率/并发/带宽三件套。',
          '先在 http 块用 *_zone 开共享内存区（多 worker 需跨进程共享计数），key 常用 $binary_remote_addr，也可按 API key / token。',
          '被限流默认返回 503，可用 limit_req_status 改成更语义化的 429，配 error_page 给友好页面。',
          'Nginx 限流是粗粒度第一道闸，需与应用层（Redis+Lua、Sentinel）的业务维度限流分层配合。',
          'key 选择和 zone 大小要结合实际，过严会误伤（NAT 出口）、过小会失准，burst 平滑突发，上线前务必压测校准。',
        ]}
      />
    </>
  )
}
