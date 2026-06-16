import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const proxyConf = `proxy_cache_path /data/nginx/cache levels=1:2
                 keys_zone=api_cache:10m
                 max_size=1g inactive=60m;

server {
    listen 80;
    server_name www.example.com;

    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1k;

    # 静态资源：直接由 Nginx 读本地磁盘，并设长缓存
    location ~* \\.(js|css|png|jpg|gif|ico)$ {
        root /var/www/static;
        expires 7d;                 # 浏览器缓存 7 天
        add_header Cache-Control "public";
    }

    # 动态接口：反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache api_cache;                  # 启用缓存
        proxy_cache_key $scheme$request_method$host$request_uri;
        proxy_cache_valid 200 302 10m;          # 200/302 缓存 10 分钟
        proxy_cache_valid 404 1m;
        add_header X-Cache-Status $upstream_cache_status;   # 命中情况回写头
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          Nginx 最经典的用法不是直接处理业务，而是站在所有后端前面当「门面」：
          对外它是唯一入口，对内它把请求转给真正干活的服务。这种「替后端收发请求」的模式叫
          <em>reverse proxy</em>（反向代理）。在它之上，再叠动静分离和缓存，
          就能让站点又快又稳——这也是面试里被问到最多的一组组合拳。
        </p>
      </Lead>

      <h2>反向代理：Nginx 替后端出面</h2>
      <p>
        正向代理替<strong>客户端</strong>出面（比如翻墙代理，服务端不知道真实用户）；
        反向代理替<strong>服务端</strong>出面（客户端只认识 Nginx，不知道背后有几台后端）。
        在 Nginx 里实现反向代理只要一行 <code>proxy_pass</code>：把进来的请求原样转给后端地址。
      </p>

      <h3>proxy_set_header：别把真实信息丢了</h3>
      <p>
        请求经过 Nginx 中转后，后端直接看到的「来源」其实是 Nginx，不是真实客户端。
        如果不处理，后端拿到的 <code>Host</code> 是错的、看到的 IP 全是 Nginx 的内网地址。
        所以要靠 <code>proxy_set_header</code> 把关键信息透传下去：
      </p>
      <ul>
        <li>
          <code>Host $host</code>：把用户访问的域名带给后端，否则后端可能按错误的虚拟主机匹配。
        </li>
        <li>
          <code>X-Real-IP $remote_addr</code>：把真实客户端 IP 放进自定义头，后端做日志、风控、限流都要用。
        </li>
        <li>
          <code>X-Forwarded-For $proxy_add_x_forwarded_for</code>：记录请求经过的代理链，多层代理时尤其重要。
        </li>
      </ul>

      <Example title="静态走 Nginx、API 转后端">
        <p>
          一个典型站点：首页和详情页用了一堆 JS、CSS、图片，外加若干 <code>/api/</code> 开头的数据接口。
          合理的切法是——浏览器请求 <code>.js / .css / .png</code> 这类静态文件时，Nginx
          直接从本地磁盘读出来返回，根本不惊动后端；而请求 <code>/api/订单列表</code> 这类动态数据时，
          才用 <code>proxy_pass</code> 转给后端的应用服务。
        </p>
        <p>
          这样一来，后端只需处理真正需要计算的请求，静态资源全被 Nginx 这台「专业搬运工」消化掉，
          后端的压力可能直接降一个数量级。
        </p>
      </Example>

      <h2>动静分离：让专业的干专业的</h2>
      <p>
        Nginx 读取并返回静态文件的效率极高，而应用服务器（Tomcat、Node 等）真正的价值在于跑业务逻辑。
        让 Tomcat 去吐图片，纯属浪费。<strong>动静分离</strong>就是按请求类型分流：静态资源交给 Nginx，
        动态请求转给后端。实现上通常用 <code>location</code> 的正则匹配把静态后缀拦下来，
        其余的再走 <code>proxy_pass</code>。
      </p>

      <h2>缓存与压缩：再快一截</h2>
      <h3>proxy_cache：把后端的响应缓存下来</h3>
      <p>
        对于「短时间内结果不变」的动态接口（比如商品分类、首页推荐），Nginx 可以用
        <code>proxy_cache</code> 把后端的响应缓存起来，下次同样的请求直接由 Nginx 返回，不再打后端。
        几个关键概念：
      </p>
      <ul>
        <li>
          <strong>cache key</strong>：用什么来区分「同一个请求」。默认包含方法、host、URI，
          通过 <code>proxy_cache_key</code> 自定义。key 设得太粗会串数据，太细会几乎缓存不命中。
        </li>
        <li>
          <strong>过期</strong>：<code>proxy_cache_valid 200 10m</code> 表示状态码 200 的响应缓存 10 分钟，过期后回源刷新。
        </li>
        <li>
          <strong>命中率</strong>：用 <code>add_header X-Cache-Status $upstream_cache_status</code>
          把 HIT/MISS/EXPIRED 写到响应头里，是观察缓存效果最直接的办法。
        </li>
      </ul>
      <h3>expires：让浏览器自己缓存静态文件</h3>
      <p>
        <code>proxy_cache</code> 缓存在 Nginx 这一侧；而 <code>expires 7d</code> 是给静态资源加
        <code>Cache-Control</code> 头，让<strong>浏览器</strong>把文件缓存在本地，下次连请求都不发。
        两者一个管服务端、一个管客户端，配合使用。
      </p>
      <h3>gzip：压缩后再传</h3>
      <p>
        <code>gzip on</code> 让 Nginx 对文本类响应（HTML/CSS/JS/JSON）做压缩再发出，体积常能减到三分之一以下，
        显著省带宽、加快加载。注意只对文本生效，图片、视频本就是压缩格式，再压几乎无效还浪费 CPU，
        所以用 <code>gzip_types</code> 限定类型。
      </p>

      <KeyIdea title="一条请求的快慢，取决于它走多远">
        <p>
          这套组合拳的核心思路是<strong>让请求尽量在靠前的环节就被解决</strong>：
          能命中浏览器缓存的就不发请求，发了能命中 Nginx 缓存的就不打后端，
          实在要打后端的也先做动静分离、再 gzip 压缩着传。越往后端走代价越大，
          所以优化的方向永远是「把流量挡在前面」。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="缓存最容易踩的坑">
        <ul>
          <li>
            <strong>把带个性化数据的接口也缓存了</strong>：比如「我的订单」这种因人而异的响应，
            如果 cache key 里不含用户标识，A 用户会看到 B 用户的数据，事故级别。
          </li>
          <li>
            <strong>POST 等写操作被缓存</strong>：默认 Nginx 只缓存 GET/HEAD，别手贱去缓存写请求。
          </li>
          <li>
            <strong>静态文件加了长 expires 又没做版本号</strong>：发版后浏览器还拿旧文件。
            正解是给文件名带哈希（如 <code>app.3f9a.js</code>），内容变了文件名就变。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Nginx 怎么给站点提速」，按层次答：<strong>反向代理</strong>当统一入口，用
        <code>proxy_set_header</code> 把 Host / X-Real-IP / X-Forwarded-For 透传给后端；
        <strong>动静分离</strong>让静态资源由 Nginx 直接吐、动态请求才转后端；
        再叠<strong>缓存</strong>——<code>proxy_cache</code> 缓存后端响应（讲清 cache key、过期、命中率监控），
        <code>expires</code> 让浏览器缓存静态文件；最后 <code>gzip</code> 压缩文本响应。
        能把「客户端缓存 / Nginx 缓存 / 后端」三层分清，就显得有体系。
      </p>

      <Practice title="给一个站点配上动静分离与缓存">
        <p>
          准备一个有静态目录和后端接口的站点，按下面的配置把静态后缀交给 Nginx、
          把 <code>/api/</code> 转给后端并加缓存。访问接口两次，看响应头里的
          <code>X-Cache-Status</code> 第一次是 MISS、第二次变 HIT，再用 curl 带
          <code>Accept-Encoding: gzip</code> 看是否返回了压缩内容。
        </p>
        <CodeBlock lang="nginx" title="nginx.conf" code={proxyConf} />
        <p>
          把 <code>proxy_cache_valid</code> 的时间调短到 <code>10s</code>，
          连续刷新就能看到 HIT → EXPIRED → HIT 的循环，直观体会缓存的生命周期。
        </p>
      </Practice>

      <Summary
        points={[
          '反向代理用 proxy_pass 让 Nginx 替后端出面，是统一入口与后续优化的基础。',
          'proxy_set_header 把 Host / X-Real-IP / X-Forwarded-For 透传给后端，否则后端拿不到真实来源信息。',
          '动静分离：静态资源由 Nginx 直接返回，动态请求才 proxy_pass 转后端，给后端大幅减压。',
          'proxy_cache 缓存后端响应，关键是 cache key、过期时间，并用 X-Cache-Status 监控命中率。',
          'expires 让浏览器缓存静态文件、gzip 压缩文本响应，分别管客户端侧和传输体积。',
          '优化主线是把流量挡在前面：浏览器缓存 → Nginx 缓存 → 后端，越靠前解决代价越小。',
        ]}
      />
    </>
  )
}
