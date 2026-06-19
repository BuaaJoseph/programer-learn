import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const checklistConf = `# 选型决策清单（按场景对号入座）
# 1) 只需四层转发、追求极致性能、流量极大
#    -> LVS（工作在传输层，按 IP+端口转发，性能接近线速）
# 2) 需要按 URL / Header / Cookie 做七层路由、动静分离、缓存、限流
#    -> Nginx（工作在应用层，功能丰富）
# 3) 百万级并发、既要扛量又要七层能力
#    -> LVS + Nginx 两级：LVS 做四层入口分流，Nginx 做七层处理
# 4) 微服务，需要统一鉴权 / 限流 / 熔断 / 灰度 / 服务发现
#    -> API 网关（Spring Cloud Gateway / Kong / APISIX）
# 5) 小流量、单体应用、想省事
#    -> 单台 Nginx 足矣，别过度设计`

const streamConf = `# Nginx 也能做四层（stream 块，与 http 块平级）
# 直接转发 TCP/UDP，看不懂应用层协议，适合代理 MySQL、Redis、gRPC 等
stream {
    upstream mysql_pool {
        server 10.0.0.21:3306;
        server 10.0.0.22:3306;
    }
    server {
        listen 3306;
        proxy_pass mysql_pool;     # 纯 TCP 转发，不解析 SQL
    }
}`

const lvsModeConf = `# LVS 三种转发模式（面试常问）
# NAT  : 改写目的/源 IP，回包也要经过 LVS，LVS 易成瓶颈，部署简单
# DR   : 只改 MAC，回包由后端直接返回客户端（不经 LVS），性能最高
#        要求 LVS 与后端同网段、后端配 VIP（lo 上）
# TUN  : IP 隧道封装，可跨网段，回包也直返客户端`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          学完负载均衡、反向代理、限流、高可用，最后一个问题绕不开：流量入口这一层，
          到底该用什么？Nginx 不是唯一答案。面试官常借「Nginx、LVS、API 网关有什么区别、什么时候用谁」
          来考察你的架构视野。这一章把它们摆到一起，按「四层 vs 七层」这条主线讲清各自的定位。
        </p>
      </Lead>

      <h2>四层 vs 七层：分水岭在 OSI 模型</h2>
      <p>
        理解所有负载均衡设备，先抓住「它工作在哪一层」这条线。
      </p>
      <h3>四层：LVS</h3>
      <p>
        <em>LVS</em>（Linux Virtual Server）工作在<strong>传输层（四层）</strong>，
        它只看 IP + 端口就转发，根本不解析 HTTP 内容。因为处理得「浅」，又运行在内核态，
        所以<strong>性能极高</strong>，单机轻松扛百万级并发、接近网卡线速。代价是<strong>功能少</strong>：
        它看不到 URL、Header、Cookie，做不了按路径路由、动静分离、缓存这些应用层的活。
      </p>
      <p>
        为什么四层就一定快？因为它在内核态只对数据包做地址改写/转发，<strong>不需要建立到后端的应用层连接、不解析协议、不拷贝到用户态</strong>，
        路径短到接近网卡线速。LVS 还有三种转发模式，面试常被追问区别：
      </p>
      <CodeBlock lang="bash" title="LVS 三种转发模式" code={lvsModeConf} />
      <p>
        其中 <strong>DR 模式</strong>最常用——回包不经过 LVS、由后端直接返回客户端，所以 LVS 只处理「入向」流量，
        吞吐被压榨到极致；代价是部署要求高（同网段、后端 lo 配 VIP）。
      </p>
      <h3>七层：Nginx</h3>
      <p>
        Nginx 工作在<strong>应用层（七层）</strong>，它会解析完整的 HTTP 请求，
        因此能<strong>按 URL / Header / Cookie 做精细路由</strong>，能做动静分离、缓存、限流、改写、SSL 卸载……
        <strong>功能丰富</strong>得多。代价是处理得「深」、要解析协议，单机性能不如 LVS（但对绝大多数业务也绰绰有余）。
      </p>
      <p>
        要补一句：Nginx 也<strong>能做四层</strong>——用 <code>stream</code> 块（与 http 块平级）直接转发 TCP/UDP，
        常用来代理 MySQL、Redis、gRPC 这类非 HTTP 流量。所以「四层只能用 LVS」是误区，区别在于 LVS 在内核态、极致性能，
        Nginx 的 stream 在用户态、更灵活但吞吐不及 LVS。
      </p>
      <CodeBlock lang="nginx" title="Nginx stream 块做四层转发" code={streamConf} />

      <h3>三者速查表</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>LVS</th>
            <th>Nginx</th>
            <th>API 网关</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>工作层</td>
            <td>四层（内核态）</td>
            <td>七层为主（也能四层）</td>
            <td>七层 + 业务层</td>
          </tr>
          <tr>
            <td>性能</td>
            <td>极高，近线速</td>
            <td>高</td>
            <td>中（功能换性能）</td>
          </tr>
          <tr>
            <td>能否看 URL/Header</td>
            <td>否</td>
            <td>是</td>
            <td>是</td>
          </tr>
          <tr>
            <td>典型能力</td>
            <td>纯转发扛量</td>
            <td>路由/缓存/限流/SSL</td>
            <td>鉴权/熔断/灰度/服务发现</td>
          </tr>
          <tr>
            <td>配置变更</td>
            <td>规则级</td>
            <td>reload 生效</td>
            <td>动态热更、有控制台</td>
          </tr>
        </tbody>
      </table>

      <Callout variant="warn" title="一句话别记反">
        <p>
          <strong>四层快而粗，七层慢而精。</strong>LVS 是粗放的高速闸机（只认 IP 端口、快），
          Nginx 是智能的检票口（能看清每张票的内容、灵活）。它们不是替代关系，常常是搭档关系。
        </p>
      </Callout>

      <h2>大流量常用：LVS + Nginx 两级</h2>
      <p>
        当流量大到单台 Nginx 也吃力时，业界的经典做法是<strong>两级负载均衡</strong>：
        最前面用 LVS 做四层入口，仅按 IP+端口把海量连接快速摊给后面<strong>一组 Nginx</strong>；
        每台 Nginx 再做七层处理（路由、缓存、限流），转给真正的后端应用。
        这样既借 LVS 拿到了顶级吞吐，又保留了 Nginx 的七层能力，两全其美。
      </p>
      <p>
        为什么不直接堆 Nginx？因为 Nginx 之上仍需要一个入口把流量分给「一组 Nginx」，
        而这个入口本身要扛全站连接——七层 Nginx 当这个入口性价比低，四层 LVS 才是天选。
        LVS 用 DR 模式时回包还不经它，入口几乎不成瓶颈。这就是「四层在外扛量、七层在内治理」的分层逻辑。
      </p>

      <Example title="百万并发架构分层">
        <p>
          一个日活极高的电商大促，入口峰值上百万并发连接。架构自上而下大致这样分层：
        </p>
        <ul>
          <li><strong>LVS 集群（四层）</strong>：最前线，VIP 入口，把连接快速摊给下一层的 Nginx 群。</li>
          <li><strong>Nginx 集群（七层）</strong>：做动静分离、URL 路由、缓存、粗粒度限流，再转给网关或应用。</li>
          <li><strong>API 网关</strong>：微服务统一入口，做鉴权、按业务维度限流、熔断、灰度。</li>
          <li><strong>后端微服务</strong>：真正跑业务逻辑。</li>
        </ul>
        <p>
          每一层只干自己最擅长的事：LVS 扛量、Nginx 做七层流量治理、网关管业务侧的统一管控。
          配合 Keepalived，每一层自身也都是高可用的，没有单点。
        </p>
      </Example>

      <h2>API 网关：面向微服务的统一管控</h2>
      <p>
        Nginx 偏「流量层」的通用反向代理，而 <strong>API 网关</strong>偏「业务层」的统一入口，
        是微服务架构里的产物。典型选手有 <em>Spring Cloud Gateway</em>、<em>Kong</em>、<em>APISIX</em>
        （后两者其实底层也基于 Nginx/OpenResty）。它把各微服务共有的横切能力收口到一处：
      </p>
      <ul>
        <li><strong>鉴权</strong>：统一校验 Token / JWT，免得每个服务各写一套。</li>
        <li><strong>限流 / 熔断</strong>：按用户、按接口的业务维度限流，下游故障时熔断降级。</li>
        <li><strong>路由</strong>：结合<strong>服务发现</strong>（注册中心）把请求动态转给对应微服务，还能做灰度、A/B。</li>
        <li><strong>可观测</strong>：统一收集日志、监控、链路追踪。</li>
      </ul>
      <p>
        和 Nginx 的关系可以这么理解：Nginx 也能用配置硬怼出一部分网关功能，
        但网关把这些能力<strong>产品化、动态化、和微服务体系（注册中心、配置中心）打通</strong>了，
        改路由不用 reload、能热更新、有控制台。微服务场景下，网关比裸 Nginx 顺手得多。
      </p>
      <Callout variant="info" title="一个常见误区：网关会取代 Nginx 吗">
        <p>
          不会，它们在不同层。生产里常见的是<strong>网关跑在 Nginx 之后</strong>：Nginx（或 LVS+Nginx）先做流量入口、SSL 卸载、静态资源、粗粒度限流，
          再把动态请求交给 API 网关做业务级管控。何况 Kong/APISIX 本身就建在 OpenResty（Nginx + Lua）之上——
          说「网关取代 Nginx」既不准确，方向也常常反了。
        </p>
      </Callout>

      <KeyIdea title="何时用谁，看你缺的是什么">
        <p>
          缺<strong>极致吞吐</strong>、只做四层转发 → <strong>LVS</strong>；
          缺<strong>七层流量治理</strong>（路由、动静分离、缓存、限流） → <strong>Nginx</strong>；
          流量大到要<strong>既扛量又做七层</strong> → <strong>LVS + Nginx 两级</strong>；
          缺<strong>微服务的统一管控</strong>（鉴权、熔断、服务发现、灰度） → <strong>API 网关</strong>。
          不是谁更高级，而是看你当前的瓶颈和场景缺哪块能力，别为了用而用、过度设计。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Nginx、LVS、网关怎么选」，先立<strong>四层 vs 七层</strong>这根轴：
        LVS 四层、性能极高、功能少；Nginx 七层、能按 URL/Header 路由、功能多。
        再讲组合：<strong>大流量用 LVS + Nginx 两级</strong>（LVS 扛量、Nginx 做七层）。
        最后讲<strong>API 网关</strong>的定位——面向微服务的统一入口，做鉴权/限流/熔断/路由/服务发现，
        是业务层管控而非纯流量转发。收尾点一句「按瓶颈选型、避免过度设计」，格局就出来了。
      </p>
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「LVS 为什么比 Nginx 快？」——四层内核态只改地址转发、不解析协议不进用户态；DR 模式回包还不经 LVS。
          </li>
          <li>
            「Nginx 能做四层吗？」——能，用 stream 块代理 TCP/UDP（如 MySQL、Redis），但吞吐不及内核态的 LVS。
          </li>
          <li>
            「API 网关和 Nginx 区别？」——网关面向业务做鉴权/熔断/灰度/服务发现、可动态热更，常跑在 Nginx 之后。
          </li>
          <li>
            「小项目要不要上 LVS+网关？」——不要，单台 Nginx 足矣，避免过度设计。
          </li>
        </ul>
      </Callout>

      <Practice title="给三个场景做选型">
        <p>
          照着下面的决策清单，给这三个场景各选一套方案并说明理由：
          (1) 一个内部管理后台，日活几百人；
          (2) 一个有大量静态资源、需按路径分流的内容站；
          (3) 一个几十个微服务、需要统一登录鉴权和灰度发布的中台系统。
        </p>
        <CodeBlock lang="text" title="选型决策清单" code={checklistConf} />
        <p>
          做完对答案：(1) 单台 Nginx 足矣；(2) Nginx 做七层路由+缓存，量再大上 LVS+Nginx；
          (3) 在 Nginx/LVS 入口之后加 API 网关统管鉴权与灰度。体会「按需选型」的思路。
          额外想一想：如果还要代理一组 MySQL 读库，应该用谁？答案是 LVS 或 Nginx 的 stream 块（四层）。
        </p>
      </Practice>

      <Summary
        points={[
          '四层 vs 七层是选型主线：LVS 工作在传输层、只看 IP+端口、内核态不解析协议，性能极高但功能少。',
          'LVS 有 NAT/DR/TUN 三种模式，DR 回包不经 LVS、性能最高，是大流量入口的常用选择。',
          'Nginx 工作在应用层、能按 URL/Header/Cookie 路由、做动静分离/缓存/限流；也能用 stream 块做四层 TCP/UDP 转发。',
          '大流量常用 LVS + Nginx 两级：LVS 做四层入口扛量，Nginx 做七层流量治理。',
          'API 网关（Spring Cloud Gateway / Kong / APISIX）是面向微服务的统一入口，做鉴权、限流、熔断、路由、服务发现，常跑在 Nginx 之后。',
          '网关是业务层统一管控、可动态热更并打通注册中心，不取代 Nginx 而是分工协作。',
          '选型看当前缺的是吞吐、七层能力还是微服务管控，按瓶颈选、避免过度设计。',
        ]}
      />
    </>
  )
}
