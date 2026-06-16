import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MasterWorker from '@/courses/nginx/illustrations/MasterWorker.jsx'

const workerConf = `# nginx.conf 中与进程模型相关的核心配置
# auto 表示自动设为 CPU 核数，是推荐写法
worker_processes  auto;

events {
    # 单个 worker 能同时维持的最大连接数
    worker_connections  10240;
    # 开启后一个 worker 一次 accept 多个新连接，吞吐更高
    multi_accept        on;
}`

const reloadCmd = `# 检查配置语法是否正确（reload 前必做）
nginx -t

# 平滑重载：不中断现有连接，让新配置生效
nginx -s reload

# 优雅停止：处理完手头请求再退出
nginx -s quit`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          同样一台机器，为什么 Nginx 能轻松扛住十万并发连接，而很多传统服务器几千连接就开始喘？
          答案不在「写得更努力」，而在<strong>进程模型和处理连接的方式</strong>完全不同。
          这一章拆开 Nginx 的「引擎盖」：master-worker 多进程，加上每个 worker 单线程跑事件驱动。
        </p>
      </Lead>

      <h2>master-worker：分工明确的两类进程</h2>
      <p>
        Nginx 启动后你会看到一个 <em>master</em> 进程和若干个 <em>worker</em> 进程。它们分工很清楚：
      </p>
      <ul>
        <li>
          <strong>master 进程</strong>：不处理任何业务请求。它负责读取和校验配置文件、根据配置 fork 出 worker、
          监控 worker 的存活（挂了就重新拉起），以及接收 <code>reload</code> / <code>quit</code> 等管理信号。它是「管理者」。
        </li>
        <li>
          <strong>worker 进程</strong>：真正干活的「工人」，所有客户端请求都由 worker 处理。
          worker 数量一般设为 CPU 核数，配置就是 <code>worker_processes auto</code>，这样每个 worker 大致独占一个核，
          减少进程间切换。
        </li>
      </ul>

      <h3>每个 worker：单线程 + epoll + 非阻塞 IO</h3>
      <p>
        关键来了：一个 worker 是<strong>单线程</strong>的，却能同时处理成千上万个连接。秘诀是
        <em>事件驱动</em>（event-driven）配合 Linux 的 <em>epoll</em> 和<strong>非阻塞 IO</strong>。
        worker 不会「为某个连接傻等数据」，而是把所有连接的 socket 都交给 epoll 统一监听；
        哪个连接的数据准备好了，epoll 就通知 worker 去处理哪个。一个线程在大量连接之间快速来回切换，
        永远只处理「已经就绪」的事件，CPU 一刻不闲、也不被某个慢连接卡住。
      </p>

      <Example title="对比 Apache：一个连接一个线程/进程">
        <p>
          传统的 Apache prefork/worker 模式是「一个连接配一个进程或线程」。假设一万个并发连接：
        </p>
        <ul>
          <li>
            <strong>Apache 式</strong>：需要约一万个线程/进程，每个都吃内存、还得频繁上下文切换。
            如果很多连接是「慢连接」（在等待客户端慢慢发数据），这些线程就一直被占着空等，资源浪费严重。
          </li>
          <li>
            <strong>Nginx 式</strong>：只要几个 worker（≈ CPU 核数），每个 worker 用 epoll 同时盯着上万个连接，
            只在事件就绪时干活。内存占用低、几乎没有空等，这就是它能扛高并发的根本原因。
          </li>
        </ul>
      </Example>

      <MasterWorker />

      <KeyIdea title="为什么能扛十万并发">
        <p>
          核心就两条：<strong>进程数少而精</strong>（worker ≈ CPU 核数，不为每个连接开线程），
          加上<strong>事件驱动不空等</strong>（epoll 只通知就绪的连接，非阻塞 IO 让单线程也能复用海量连接）。
          连接数和线程数<strong>解耦</strong>了——这才是 Nginx 高并发的钥匙，背的时候记住「少进程、不阻塞、靠事件」。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="惊群与 accept_mutex">
        <p>
          多个 worker 同时监听同一个端口，当一个新连接到来，内核可能<strong>唤醒所有 worker</strong>去争抢，
          但最终只有一个能 accept 成功，其余白白被唤醒——这就是<em>惊群</em>（thundering herd）问题。
        </p>
        <ul>
          <li>
            老办法是用 <code>accept_mutex</code> 加一把锁，让 worker 轮流去 accept，避免一起惊醒；
            代价是高并发下可能略增延迟。
          </li>
          <li>
            新内核支持 <code>SO_REUSEPORT</code>（Nginx 里用 <code>reuseport</code>），由内核把新连接均匀分给各 worker，
            从根上消除惊群，现在更推荐这种方式。
          </li>
        </ul>
      </Callout>

      <h2>平滑重启：reload 为什么不断连接</h2>
      <p>
        改了配置想生效，又不想中断正在处理的请求，靠的是<strong>平滑重启</strong>（graceful reload）。
        执行 <code>nginx -s reload</code> 后，master 重新读取并校验配置，然后<strong>用新配置 fork 出一批新 worker</strong>，
        同时通知老 worker「不要再接新连接，把手头的请求处理完就退出」。于是新请求走新 worker、老请求在老 worker 上善终，
        整个过程对用户无感知，这就是「平滑」。
      </p>

      <h2>面试怎么答</h2>
      <p>
        被问「Nginx 为什么高性能/能扛高并发」，按层次答：
        <strong>进程模型</strong>——master 管理、多 worker（≈ CPU 核数）干活；
        <strong>处理方式</strong>——每个 worker 单线程靠 epoll 事件驱动 + 非阻塞 IO，连接数与线程数解耦，不为每连接开线程；
        <strong>对比</strong>——区别于 Apache 一连接一线程的空等浪费；
        再点一句惊群用 <code>accept_mutex</code> 或 <code>reuseport</code> 解决、reload 平滑不断连接，回答就有深度了。
      </p>

      <Practice title="配置 worker 并平滑重载">
        <p>
          先把进程相关的核心配置写对，再练熟 reload 的标准动作。配置如下：
        </p>
        <CodeBlock lang="nginx" title="nginx.conf（进程模型配置）" code={workerConf} />
        <p>
          单机理论最大并发连接数约等于 <code>worker_processes × worker_connections</code>（反向代理还要再除以 2，
          因为对外、对后端各占一条连接）。改完配置后，务必先 <code>nginx -t</code> 校验语法，再 reload：
        </p>
        <CodeBlock lang="bash" title="管理命令" code={reloadCmd} />
        <p>
          养成「先 <code>nginx -t</code> 再 <code>nginx -s reload</code>」的习惯——配置写错时 <code>-t</code> 会直接报错，
          避免把坏配置推上线导致服务异常。
        </p>
      </Practice>

      <Summary
        points={[
          'Nginx 采用 master-worker 多进程模型：master 只读配置、管理与监控 worker，不处理请求；worker 才干活。',
          'worker 数一般等于 CPU 核数，用 worker_processes auto 自动设置，减少进程切换。',
          '每个 worker 单线程，靠 epoll 事件驱动 + 非阻塞 IO 同时复用海量连接，只处理就绪事件、绝不空等。',
          '相比 Apache 一连接一线程/进程的空等浪费，Nginx 把连接数和线程数解耦，所以能扛十万并发。',
          '多 worker 抢同一端口会有惊群问题，用 accept_mutex 加锁或 reuseport 交给内核分配来解决。',
          'reload 平滑重启：master 用新配置起新 worker，老 worker 处理完手头请求再退出，对用户无感知。',
        ]}
      />
    </>
  )
}
