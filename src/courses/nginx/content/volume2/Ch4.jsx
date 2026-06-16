import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const keepalivedConf = `# 主机（MASTER）上的 keepalived.conf
vrrp_script chk_nginx {
    script "/etc/keepalived/chk_nginx.sh"   # 健康检查脚本：探测本机 Nginx
    interval 2                              # 每 2 秒执行一次
    weight -30                             # 检查失败则把本机优先级降 30
    fall 3                                 # 连续 3 次失败才算挂
    rise 2                                 # 连续 2 次成功才算恢复
}

vrrp_instance VI_1 {
    state MASTER                # 主机为 MASTER，备机写 BACKUP
    interface eth0              # 绑定的网卡
    virtual_router_id 51        # 主备必须一致，标识同一组
    priority 100               # 主机优先级高（备机写 90）
    advert_int 1               # 心跳间隔 1 秒

    authentication {
        auth_type PASS
        auth_pass 1111         # 主备一致，防止误加入
    }

    virtual_ipaddress {
        192.168.1.200          # 对外服务的 VIP（虚拟 IP）
    }

    track_script {
        chk_nginx              # 关联健康检查
    }
}`

const chkScript = `#!/bin/bash
# chk_nginx.sh —— 探测本机 Nginx 是否真的在服务
# 不只看进程在不在，最好真发一个请求确认能响应
if ! curl -fs --max-time 1 http://127.0.0.1/healthz > /dev/null; then
    exit 1        # 非 0 → keepalived 认为检查失败，按 weight 降优先级
fi
exit 0`

const dualMasterConf = `# 双主：A 机上跑两个实例，VI_1 当主、VI_2 当备
vrrp_instance VI_1 {            # 对应 VIP1
    state MASTER
    virtual_router_id 51
    priority 100
    virtual_ipaddress { 192.168.1.200; }
}
vrrp_instance VI_2 {            # 对应 VIP2，本机是备
    state BACKUP
    virtual_router_id 52
    priority 90
    virtual_ipaddress { 192.168.1.201; }
}
# B 机配置相反：VI_1 为 BACKUP/90，VI_2 为 MASTER/100
# 平时两个 VIP 各在一台机器，都在干活；一台挂了另一台接管两个 VIP`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          前面我们用 Nginx 给后端做负载均衡——可 Nginx 自己呢？如果整个集群前面只有一台 Nginx，
          它一挂，后面再多的健康后端也无人转发，整站瞬间不可用。这台 Nginx 就是<em>单点</em>（single point of failure）。
          解决办法是再加一台备机，用 Keepalived 做双机热备，让对外的 IP 永不掉线。
        </p>
      </Lead>

      <h2>单点问题：谁来守门 Nginx</h2>
      <p>
        高可用的核心矛盾是：任何单台机器都可能宕机、断电、网卡坏。负载均衡解决了后端的单点，
        但把单点上移到了 Nginx 本身。要消除它，就得让 Nginx 也变成「至少两台、一台挂了另一台顶上」，
        而且对客户端来说<strong>访问的 IP 不能变</strong>——这正是 Keepalived 要解决的。
      </p>
      <p>
        为什么不用 DNS 轮询挂两个 IP 来做高可用？因为 DNS 有缓存、生效慢，一台挂了客户端可能几分钟还在往坏的那个 IP 打，
        体验断崖。VIP 漂移是<strong>秒级</strong>且对客户端透明的，这就是 Keepalived 比「DNS 多 A 记录」更适合做入口高可用的根本原因。
      </p>

      <h3>Keepalived 与 VRRP：一个 VIP 在主备间漂移</h3>
      <p>
        Keepalived 基于 <em>VRRP</em>（Virtual Router Redundancy Protocol，虚拟路由冗余协议）工作。
        它的核心是维护一个 <strong>VIP</strong>（virtual IP，虚拟 IP）：对外暴露的、客户端真正访问的就是这个 VIP，
        它并不绑死在某台物理机上，而是「浮动」在主备之间。
      </p>
      <ul>
        <li>
          正常时，VIP 绑在<strong>主机（MASTER）</strong>上，主机用心跳（advert）不断向备机宣告「我还活着」。
        </li>
        <li>
          主机一旦宕机，备机收不到心跳，便<strong>接管 VIP</strong>，自己升为 MASTER 继续对外服务。
        </li>
        <li>
          整个切换是<strong>秒级</strong>的，而且对外 IP 始终是那个 VIP、<strong>不变</strong>，
          客户端几乎无感知，最多重试一两次。
        </li>
      </ul>
      <p>
        底层细节值得一提：VIP 漂移到新机器后，新主会主动广播一个 <strong>免费 ARP（gratuitous ARP）</strong>，
        告诉同网段所有设备「VIP 现在对应我这块网卡的 MAC」，交换机据此刷新 ARP 表，流量才会改道到新主。
        所以 Keepalived 高可用<strong>要求主备在同一个二层网段</strong>——这也是它在跨机房场景下的天然边界。
      </p>

      <Example title="Nginx 主备秒级切换">
        <p>
          两台机器 192.168.1.10（主）和 192.168.1.11（备）都装 Nginx 和 Keepalived，
          对外用 VIP 192.168.1.200。域名解析指向 VIP。平时所有流量都打到主机，备机闲着待命。
        </p>
        <p>
          某天主机 Nginx 进程崩了，健康检查脚本探测失败，Keepalived 把主机优先级降下来，
          备机优先级反超、接管 VIP 192.168.1.200。客户端访问的还是同一个 IP，
          只是背后悄悄换成了备机在服务，整个过程一两秒完成。等主机修好恢复，
          它优先级又最高，VIP 可以再切回去（这叫抢占模式）。
        </p>
      </Example>

      <Callout variant="info" title="抢占 vs 非抢占：要不要切回去">
        <p>
          主机修好后是否抢回 VIP，由 <code>nopreempt</code> 控制。<strong>抢占模式</strong>（默认）下主机一恢复就抢回，
          逻辑直观但会带来「<strong>二次切换</strong>」——一次故障切走、一次恢复切回，流量抖动两次。
          生产里常用<strong>非抢占模式</strong>：谁在当主就让它继续当，主机恢复后只待命，避免不必要的二次抖动。
          配非抢占时两台 state 都建议写 BACKUP，靠 priority 选主。
        </p>
      </Callout>

      <h3>主备 vs 双主</h3>
      <p>
        最经典的是<strong>主备模式</strong>：一主一备，备机平时纯待命，资源利用率只有一半。
        更省的是<strong>双主模式</strong>（双活）：起两个 VRRP 实例、两个 VIP，
        A 机是 VIP1 的主、VIP2 的备，B 机反过来。平时两个 VIP 各在一台机器上、都在干活；
        任一台挂了，另一台同时接管两个 VIP。代价是两台机器的容量都得留有余量，能扛下对方的流量。
      </p>
      <CodeBlock lang="nginx" title="双主：A 机的两个 vrrp_instance" code={dualMasterConf} />

      <h3>脑裂与解决</h3>
      <p>
        <em>脑裂</em>（split-brain）是 Keepalived 最危险的故障：主备之间的心跳网络断了
        （但两台机器其实都活着），备机以为主机挂了、也抢去 VIP，于是<strong>两台机器同时持有同一个 VIP</strong>，
        IP 冲突、流量错乱。常见的防范手段：
      </p>
      <ul>
        <li>用<strong>独立的心跳线</strong>（单独网卡/网段）传 VRRP，降低心跳被业务流量挤断的概率。</li>
        <li>引入<strong>第三方仲裁</strong>：比如让节点去 ping 一个公共网关，ping 不通的一方主动放弃当主。</li>
        <li>配好 <code>auth_pass</code> 认证，避免无关节点误加入同一组。</li>
      </ul>
      <p>
        要注意脑裂的本质是「<strong>检测不到对方却都活着</strong>」，所以再多的健康检查也不能根治，只能靠仲裁打破对称。
        云环境里没法配独立物理心跳线，更稳的做法往往是直接用云厂商的 <strong>SLB/ELB</strong> 托管负载均衡，把高可用甩给云平台。
      </p>

      <h3>健康检查脚本：不只看机器活没活</h3>
      <p>
        默认 VRRP 只检测「机器/网络」是否存活，但机器活着不代表 Nginx 进程活着。
        所以要配 <code>vrrp_script</code> 健康检查脚本，定期探测本机 Nginx
        （比如 <code>pgrep nginx</code> 或 <code>curl localhost</code>）。
        一旦探测失败，就用 <code>weight</code> 把本机优先级降下去，触发 VIP 漂移到备机。
        这样「Nginx 挂了但机器还在」也能正确切换。脚本要用 <code>fall</code>/<code>rise</code> 设防抖
        （连续几次才判定挂/恢复），否则一次偶发抖动就引发无谓的主备切换。
      </p>
      <CodeBlock lang="bash" title="chk_nginx.sh 健康检查脚本" code={chkScript} />

      <KeyIdea title="高可用是要消灭每一个单点">
        <p>
          架构里凡是「只有一份、挂了就停摆」的环节，都是单点。负载均衡消灭了后端单点，
          Keepalived 消灭了 Nginx 单点，再往上还有数据库主从、机房双活……
          高可用的本质就是<strong>给每个关键节点准备一个能秒级顶上的替身，并保证对外入口不变</strong>。
          Keepalived 用一个漂移的 VIP，优雅地满足了「替身」和「入口不变」这两个要求。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="部署时的注意点">
        <ul>
          <li>
            主备的 <code>virtual_router_id</code> 必须<strong>一致</strong>（标识同一组），
            <code>priority</code> 必须<strong>不同</strong>（决定谁是主），别配反了。
          </li>
          <li>
            一定要配<strong>健康检查脚本</strong>，否则 Nginx 进程崩了机器还活着，VIP 不会漂移，等于没做高可用。
          </li>
          <li>
            警惕<strong>脑裂</strong>：心跳网络要可靠，最好独立网卡，必要时加仲裁机制。
          </li>
          <li>
            同网段多组 Keepalived 时 <code>virtual_router_id</code> 不能撞号，撞号会互相干扰、错乱选主。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Nginx 怎么做高可用」，主线是：单台 Nginx 是<strong>单点</strong>，
        用 <strong>Keepalived（基于 VRRP）</strong>维护一个 <strong>VIP</strong>，
        平时绑在主机、主机挂了备机<strong>秒级接管 VIP</strong>且<strong>对外 IP 不变</strong>。
        再展开<strong>主备 vs 双主</strong>（双主资源利用率更高）、<strong>脑裂</strong>（心跳断导致双主抢 VIP，靠独立心跳线+仲裁防范）、
        以及<strong>健康检查脚本</strong>（探测 Nginx 进程，挂了降优先级触发漂移）。能讲到脑裂和抢占/非抢占，基本就拉开差距了。
      </p>
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「VIP 怎么让流量改道？」——新主广播免费 ARP 刷新交换机 ARP 表，所以要求主备同二层网段。
          </li>
          <li>
            「为什么不用 DNS 轮询做高可用？」——DNS 有缓存生效慢，VIP 漂移秒级且对客户端透明。
          </li>
          <li>
            「脑裂能靠健康检查解决吗？」——不能，本质是双方都活却互相检测不到，只能靠仲裁打破对称。
          </li>
          <li>
            「主机恢复要切回吗？」——非抢占模式不切回，避免二次抖动；抢占模式会切回。
          </li>
        </ul>
      </Callout>

      <Practice title="用 Keepalived 配一组主备 VIP">
        <p>
          准备两台装好 Nginx 的机器，分别配置 Keepalived：主机
          <code>state MASTER</code>、<code>priority 100</code>，备机
          <code>state BACKUP</code>、<code>priority 90</code>，两者
          <code>virtual_router_id</code> 一致、<code>virtual_ipaddress</code> 填同一个 VIP。
          启动后用 <code>ip addr</code> 看 VIP 在主机上；停掉主机 Nginx，
          观察 VIP 几秒内漂到备机。
        </p>
        <CodeBlock lang="nginx" title="keepalived.conf" code={keepalivedConf} />
        <p>
          重点盯三个字段：<code>state</code>（主/备角色）、<code>priority</code>（谁优先当主）、
          <code>virtual_ipaddress</code>（漂移的 VIP）。把主机 Nginx 杀掉再拉起，
          完整走一遍「漂走—修复—抢回」的过程。再加上上面的健康检查脚本，验证「Nginx 进程崩了但机器还在」也能正确触发漂移。
        </p>
      </Practice>

      <Summary
        points={[
          '单台 Nginx 是单点，一挂整站不可用，需要双机热备来消除。',
          'Keepalived 基于 VRRP 维护一个漂移的 VIP：平时绑主机，主机挂了备机秒级接管，对外 IP 始终不变。',
          'VIP 漂移靠新主广播免费 ARP 刷新交换机 ARP 表，要求主备同二层网段；比 DNS 轮询更快更透明。',
          '主备模式备机闲置、利用率低；双主模式起两个 VIP 互为主备，两台都在干活、利用率更高。',
          '脑裂是心跳断导致主备同时抢 VIP，本质是双方都活却互测不到，靠独立心跳线、仲裁和认证防范，健康检查救不了。',
          '抢占模式主机恢复会切回（二次抖动），非抢占模式不切回更平稳。',
          '必须配 vrrp_script 健康检查脚本探测 Nginx 进程并用 fall/rise 防抖，失败时降优先级触发漂移。',
          '配置上 virtual_router_id 主备一致且同网段不撞号、priority 主备不同、virtual_ipaddress 填同一 VIP。',
        ]}
      />
    </>
  )
}
