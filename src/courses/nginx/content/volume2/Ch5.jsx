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
      <h3>七层：Nginx</h3>
      <p>
        Nginx 工作在<strong>应用层（七层）</strong>，它会解析完整的 HTTP 请求，
        因此能<strong>按 URL / Header / Cookie 做精细路由</strong>，能做动静分离、缓存、限流、改写、SSL 卸载……
        <strong>功能丰富</strong>得多。代价是处理得「深」、要解析协议，单机性能不如 LVS（但对绝大多数业务也绰绰有余）。
      </p>

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
        </p>
      </Practice>

      <Summary
        points={[
          '四层 vs 七层是选型主线：LVS 工作在传输层、只看 IP+端口、性能极高但功能少。',
          'Nginx 工作在应用层、能按 URL/Header/Cookie 路由、做动静分离/缓存/限流，功能多但单机性能不及 LVS。',
          '大流量常用 LVS + Nginx 两级：LVS 做四层入口扛量，Nginx 做七层流量治理。',
          'API 网关（Spring Cloud Gateway / Kong / APISIX）是面向微服务的统一入口，做鉴权、限流、熔断、路由、服务发现。',
          '网关是业务层统一管控、可动态热更并打通注册中心，比裸 Nginx 更适合微服务场景。',
          '选型看当前缺的是吞吐、七层能力还是微服务管控，按瓶颈选、避免过度设计。',
        ]}
      />
    </>
  )
}
