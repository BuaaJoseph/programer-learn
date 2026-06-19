import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ProxyType from '@/courses/nginx/illustrations/ProxyType.jsx'

const minConf = `# 一个最小可用的 nginx.conf 片段
http {
    server {
        listen       80;
        server_name  example.com;

        # 把 /var/www/html 作为站点根目录，直接返回静态文件
        location / {
            root   /var/www/html;
            index  index.html;
        }
    }
}`

const forwardConf = `# 正向代理（客户端侧）：浏览器把代理地址配成这台机器
# 客户端主动把请求发给代理，由代理替自己出去访问目标
http {
    server {
        resolver 8.8.8.8;          # 代理需要自己做 DNS 解析
        listen 8080;

        location / {
            # $http_host 是客户端想访问的真实目标
            proxy_pass http://$http_host$request_uri;
            proxy_set_header Host $http_host;
        }
    }
}`

const reverseConf = `# 反向代理（服务端侧）：客户端以为直连，其实落到 Nginx
# Nginx 再把请求转发给藏在内网的真实后端
http {
    upstream backend {
        server 127.0.0.1:8080;     # 真实后端，客户端看不见
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://backend;
            # 把客户端真实信息透传给后端，否则后端只看到 Nginx 的 IP
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}`

const splitConf = `# 动静分离：静态文件 Nginx 直接吐，动态请求转后端
server {
    listen 80;
    server_name example.com;

    # 静态资源由 Nginx 直接返回，并加长缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|woff2)$ {
        root /var/www/static;
        expires 30d;
        access_log off;
    }

    # 其余动态请求统一转发给后端应用
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你在浏览器里敲下一个网址、按下回车，请求其实<strong>很少直接打到业务服务器</strong>上。
          绝大多数情况下，它先到达一台叫 Nginx 的服务器，由它决定：是直接返回一张图片，还是把请求转发给后端，
          又或者在好几台后端之间挑一台最闲的。理解 Nginx 是什么，要从「它站在谁的位置、替谁干活」说起。
        </p>
      </Lead>

      <h2>Nginx 的定位</h2>
      <p>
        Nginx（读作 engine-x）是一款<strong>高性能的 HTTP 服务器和反向代理服务器</strong>，
        由俄罗斯工程师 Igor Sysoev 为解决 <em>C10K</em>（单机一万并发连接）问题而写。
        它最大的标签就是「快」「省」「稳」：用很少的内存扛住海量并发连接，至于为什么能做到，
        是后面架构一章要讲的 master-worker 与事件驱动，这里先记住结论。
      </p>
      <p>
        要真正搞懂 Nginx，绕不开一个核心概念——<em>proxy</em>（代理）。代理就是「中间人」，
        但中间人站在客户端一边还是服务端一边，就分出了两种完全不同的东西：<em>forward proxy</em>（正向代理）
        和 <em>reverse proxy</em>（反向代理）。这是面试必问、也是最容易被说反的一对概念。
      </p>

      <h3>它和 Apache、Tomcat 是什么关系</h3>
      <p>
        刚入行常把这几个搞混，一句话理清：<strong>Apache 和 Nginx 是同类</strong>，都是 Web 服务器/反向代理；
        <strong>Tomcat 是应用服务器</strong>，是用来跑 Java Servlet/JSP 的容器，和 Nginx 不是一个层级。
        典型生产架构是 Nginx 在最前面挡门、做静态资源与负载均衡，后面挂一排 Tomcat/Node/Python 进程跑业务逻辑。
        Apache 用的是「一个连接一个进程/线程」的模型，连接一多内存就吃紧；Nginx 用事件驱动，
        一个 worker 进程能扛上万连接，这就是它在高并发场景里逐渐取代 Apache 的根本原因。
      </p>

      <h3>正向代理：替客户端跑腿，客户端有感知</h3>
      <p>
        正向代理代理的是<strong>客户端</strong>。客户端明确知道有这么一个代理，并主动把请求发给它，
        再由代理替自己去访问真正的目标服务器。典型场景是「科学上网」、公司内网统一出口、爬虫换 IP——
        本质都是「我不方便或不愿意直接去访问目标，让一个中间人替我去」。目标服务器看到的源 IP 是代理的 IP，
        它并不知道背后真正的客户端是谁。
      </p>
      <p>
        关键的边界细节是：正向代理<strong>需要客户端显式配置</strong>（在浏览器/系统/应用里填代理地址），
        没配它就不会生效。下面这段配置里有个常被忽略的点——代理机自己得能做 DNS 解析（<code>resolver</code>），
        因为它要替客户端去解析目标域名。
      </p>
      <CodeBlock lang="nginx" title="正向代理片段（需客户端显式配置）" code={forwardConf} />

      <h3>反向代理：替服务端挡门，客户端无感知</h3>
      <p>
        反向代理代理的是<strong>服务端</strong>。客户端以为自己直接访问的就是目标网站，
        其实请求先落在反向代理上，由它转发给藏在背后的真实后端。客户端<strong>完全感知不到</strong>后端有几台、是谁。
        网关、负载均衡、统一鉴权、SSL 卸载、隐藏内网结构——这些都是反向代理的活儿，也正是 Nginx 最常见的用法。
      </p>
      <p>
        反向代理对客户端是透明的，<strong>不需要客户端做任何配置</strong>，DNS 把域名解析到 Nginx 即可。
        实战里最容易踩的坑是：转发时要用 <code>proxy_set_header</code> 把客户端真实信息透传给后端，
        否则后端日志里清一色都是 Nginx 的内网 IP，丢了真实来源。
      </p>
      <CodeBlock lang="nginx" title="反向代理片段（客户端无感知）" code={reverseConf} />

      <Example title="同样是「替你访问」，方向相反">
        <p>用一句话区分这对孪生概念：</p>
        <ul>
          <li>
            <strong>正向代理</strong>：你（客户端）告诉代理「帮我去拿一下 google.com」，代理替你去拿。
            <em>客户端</em>知道代理存在，<em>服务器</em>不知道你是谁。
          </li>
          <li>
            <strong>反向代理</strong>：你访问 taobao.com，背后其实是 Nginx 把请求分给了某台后端机器。
            <em>客户端</em>不知道后端长什么样，<em>服务器</em>被代理保护着。
          </li>
        </ul>
        <p>
          一句口诀：<strong>正向代理藏客户端，反向代理藏服务器</strong>。代理替谁出面，就「藏」了谁。
        </p>
      </Example>

      <ProxyType />

      <h3>两者一张表彻底分清</h3>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>正向代理</th>
            <th>反向代理</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>代理对象</td>
            <td>客户端</td>
            <td>服务端</td>
          </tr>
          <tr>
            <td>客户端是否感知</td>
            <td>有感知，需显式配置</td>
            <td>无感知，DNS 指向即可</td>
          </tr>
          <tr>
            <td>服务端是否感知</td>
            <td>不知道真实客户端</td>
            <td>被代理保护，知道有代理</td>
          </tr>
          <tr>
            <td>隐藏了谁</td>
            <td>隐藏客户端</td>
            <td>隐藏服务端/内网结构</td>
          </tr>
          <tr>
            <td>典型场景</td>
            <td>科学上网、统一出口、爬虫换 IP</td>
            <td>网关、负载均衡、SSL 卸载、缓存</td>
          </tr>
        </tbody>
      </table>

      <KeyIdea title="判断正向还是反向，只看代理替谁出面">
        <p>
          别去背场景，记住判定标准：<strong>代理和谁是「一伙的」</strong>。和客户端一伙、替客户端发起访问，
          就是正向代理；和服务端一伙、替服务端接收访问，就是反向代理。Nginx 绝大多数时候扮演的是
          <em>reverse proxy</em>——它站在服务端门口，是后端集群的门面。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把两者说反了">
        <p>面试里最常见的翻车点，提前避坑：</p>
        <ul>
          <li>
            <strong>不要</strong>用「在客户端配的就是正向、在服务端配的就是反向」当唯一标准——位置只是表象，
            本质是「代理替谁出面」。
          </li>
          <li>
            <strong>感知方</strong>正好相反：正向代理客户端有感知、服务端无感知；反向代理客户端无感知、服务端有感知。
          </li>
          <li>
            <strong>别混进 NAT/网关</strong>：家用路由器的 NAT 不是正向代理，它工作在网络层、不解析 HTTP；
            正向代理工作在应用层、能看懂并改写 HTTP 请求。
          </li>
        </ul>
      </Callout>

      <h2>Nginx 的四大用途</h2>
      <p>
        理解了反向代理，Nginx 能干的事就好归类了。工程里它主要扮演这四种角色：
      </p>
      <ul>
        <li>
          <strong>静态资源服务</strong>：直接把 HTML、CSS、JS、图片等文件吐给客户端，这是它的老本行，又快又省。
        </li>
        <li>
          <strong>反向代理</strong>：把动态请求转发给后端（如 Tomcat、Node、Python 服务），自己当门面与网关。
        </li>
        <li>
          <strong>负载均衡</strong>：在多台后端之间分摊流量（轮询、加权、ip_hash 等），是反向代理的延伸。
        </li>
        <li>
          <strong>动静分离</strong>：静态文件由 Nginx 自己返回，动态请求转发给后端，各司其职，整体更快。
        </li>
      </ul>
      <p>
        这四件事在一个站点里往往是<strong>同时发生</strong>的——下面这段配置就把动静分离和反向代理捏在了一起：
        以静态后缀结尾的请求 Nginx 自己读盘返回并加 30 天缓存，其余请求转给后端应用。
      </p>
      <CodeBlock lang="nginx" title="动静分离 + 反向代理同台演出" code={splitConf} />

      <Callout variant="info" title="为什么静态资源交给 Nginx 而不是后端">
        <p>
          后端语言（Java/Node/Python）返回一个文件，要经过框架的路由、中间件、序列化层层包装，开销大；
          Nginx 用 <code>sendfile</code> 零拷贝把文件从磁盘直接送到网卡，几乎不经过用户态内存，
          再叠加 <code>expires</code> 让浏览器缓存。同样一张图，Nginx 的 QPS 能比后端高一个数量级，
          这就是「动静分离」性价比极高的原因。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「正向代理和反向代理的区别」，别堆场景，按这个框架答：
        <strong>第一句给本质</strong>——正向代理代理客户端、反向代理代理服务端；
        <strong>第二句给感知</strong>——正向代理客户端有感知、反向代理客户端无感知；
        <strong>第三句给场景</strong>——正向用于统一出口、科学上网，反向用于网关、负载均衡、隐藏内网。
        最后补一句「Nginx 通常作为反向代理使用」，回答就完整了。
      </p>
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「Nginx 和 Tomcat 区别？」——Nginx 是 Web 服务器/反向代理，处理静态与转发；Tomcat 是 Servlet 容器，跑 Java 业务。
          </li>
          <li>
            「为什么 Nginx 比 Apache 抗并发？」——Apache 一连接一进程/线程，Nginx 事件驱动单进程多路复用，内存占用小。
          </li>
          <li>
            「反向代理怎么拿到客户端真实 IP？」——靠 <code>X-Forwarded-For</code> / <code>X-Real-IP</code> 透传，后端从这里取。
          </li>
          <li>
            「正向代理一定要客户端配置吗？」——是，没配不生效；反向代理对客户端透明、无需配置。
          </li>
        </ul>
      </Callout>

      <Practice title="跑通一个只返回静态文件的 Nginx">
        <p>
          先不碰反向代理，从最简单的「静态资源服务器」入手。下面是一个最小 <code>nginx.conf</code> 片段：
          监听 80 端口，把某个目录作为站点根目录，访问 <code>/</code> 时返回里面的 <code>index.html</code>。
        </p>
        <CodeBlock lang="nginx" title="nginx.conf（最小静态站点）" code={minConf} />
        <p>
          这里 <code>root</code> 指定根目录，请求路径会拼在它后面去找文件；<code>listen</code> 是监听端口，
          <code>server_name</code> 是这个虚拟主机匹配的域名。把一个 <code>index.html</code> 放进
          <code>/var/www/html</code>，启动 Nginx 后访问机器的 80 端口，就能看到页面——你已经跑通了 Nginx 四大用途里的第一个。
        </p>
        <p>
          进阶练习：把上面的<strong>动静分离</strong>配置抄进去，准备一张图片和一个跑在 8080 的后端，
          分别访问 <code>/logo.png</code> 和 <code>/api/xxx</code>，观察前者由 Nginx 直接返回、后者被转发，
          这就把「静态服务 + 反向代理 + 动静分离」三件事一次性串起来了。
        </p>
      </Practice>

      <Summary
        points={[
          'Nginx 是高性能的 HTTP 服务器和反向代理服务器，标签是快、省、稳，为解决 C10K 高并发而生。',
          '正向代理替客户端出面（藏客户端），客户端有感知、需显式配置，服务端不知道真实客户端。',
          '反向代理替服务端出面（藏服务器），客户端无感知，是 Nginx 最常见的角色，靠 X-Forwarded-For 透传真实 IP。',
          '判断正反向只看一点：代理和客户端一伙就是正向，和服务端一伙就是反向。',
          'Nginx 与 Apache 同类、与 Tomcat 不同层级；事件驱动让它比 Apache 更抗并发。',
          'Nginx 四大用途：静态资源服务、反向代理、负载均衡、动静分离，生产中常同台演出。',
          '至于“为什么这么快”，靠的是 master-worker 与事件驱动，下一章展开。',
        ]}
      />
    </>
  )
}
