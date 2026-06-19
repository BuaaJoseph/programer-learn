import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const serveCode = `# opencode 可以脱离 TUI 独立跑成一个服务
opencode serve            # 启动 TS/Bun 核心 server（Hono），暴露 HTTP + SSE

# 之后任何客户端都能通过 HTTP API 接进来：
#   - 自带的 Go (Bubble Tea) TUI
#   - 编辑器：Zed / Neovim / JetBrains 经 ACP 接入
#   - 你自己写的脚本（按 OpenAPI 规格调用）`

const providerCode = `# provider 无关：换模型基本只是换配置（示意）
# 底层基于 Vercel AI SDK + models.dev 的模型目录，号称 75+ provider + 本地模型
model: anthropic/claude-...     # 换成 openai/... 、google/... 或本地模型
# server 集中管 LLM 调用，上层工具与循环逻辑不用改`

const sseCode = `# 为什么是 SSE 而不是普通的「请求-响应」？
# 因为 Agent 一轮里会陆续吐出：思考文本、工具调用、工具结果、再思考……
# 客户端需要「边发生边看到」，而不是等整轮跑完才拿到一坨。

GET /session/:id/stream        # 客户端订阅一条 SSE 长连接
# server 持续推事件流：
#   event: message.part   data: {"type":"text","text":"我先读一下这个文件"}
#   event: tool.start     data: {"name":"read","input":{"path":"a.ts"}}
#   event: tool.end       data: {"output":"...文件内容..."}
#   event: message.part   data: {"type":"text","text":"好，问题在第 12 行"}
# TUI / 编辑器只是把这条事件流渲染成各自的界面`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          deer-flow 给我们看的是「换一种范式」（图编排）。这一章看的 <em>opencode</em>（sst/opencode，开源）
          则是另一种对照：它的 Agent 骨架和 Claude Code 高度相似——一个主循环加一套差不多的工具——
          但它在<strong>工程取舍</strong>上走了完全不同的路：开源、厂商无关、显式的 client-server 架构、还能被多个编辑器接入。
          它代表的是「同样的 Agent 内核，换一套工程外壳」。
        </p>
      </Lead>

      <h2>架构：显式的 client-server</h2>
      <p>
        opencode 把 Agent 拆成了清清楚楚的两半。<strong>核心是一个 TS/Bun 写的 server</strong>（用 Hono 框架），
        它集中管所有要紧的事：会话 state、对 LLM 的调用、工具的执行。<strong>前端是一个 Go 写的 TUI</strong>
        （基于 Bubble Tea 终端 UI 框架）。两者之间通过 HTTP 加 SSE（server-sent events）通信，并提供 OpenAPI 规格。
      </p>
      <p>
        这意味着 server 可以用 <code>opencode serve</code> <strong>独立运行</strong>，不依赖那个终端界面。
        Claude Code 把循环、工具、界面打包在一个进程里，而 opencode 把「大脑」和「脸」用一条 HTTP 边界劈开了。
      </p>
      <CodeBlock lang="bash" title="opencode serve：核心可独立运行" code={serveCode} />
      <p>
        <strong>为什么要刻意劈这一刀？</strong>因为「大脑」和「脸」的变化频率与复用诉求完全不同。Agent 内核
        （循环、工具、对模型的调用）相对稳定且只有一套；而界面是多样的——有人要终端 TUI，有人要在编辑器里用，
        有人想用脚本批量调。把内核做成一个带稳定 HTTP 契约的 server，就能让一套大脑服务无数张脸，
        每张脸只管渲染、不碰核心逻辑。这是经典的「机制与策略分离」在 Agent 上的落地。
      </p>
      <p>
        <strong>这条边界为什么必须是流式（SSE）的？</strong>这是新手最容易想偏的一点。Agent 一轮交互里会
        <em>陆续</em>产生思考文本、工具调用、工具结果、再思考……如果用普通的「一问一答」HTTP，用户得干等整轮跑完
        （可能几十秒）才看到一坨结果，体验极差，也无法中途打断。SSE 让 server 能「边发生边推」，
        客户端实时渲染每一个片段。下面把这条事件流摊开看：
      </p>
      <CodeBlock lang="bash" title="SSE 事件流：为什么不能用普通请求-响应" code={sseCode} />

      <h2>厂商无关：换模型只是换配置</h2>
      <p>
        opencode 刻意做到 <em>provider 无关</em>。它底层基于 <em>Vercel AI SDK</em> 加 <em>models.dev</em> 的模型目录，
        号称支持 75+ 个 provider，外加本地模型。对你来说，从一个厂商的模型切到另一个，
        基本就是改一行配置，上层的工具和主循环逻辑不用动。
      </p>
      <CodeBlock lang="yaml" title="换 provider 基本只是换配置" code={providerCode} />
      <p>
        <strong>底层是怎么做到的？</strong>关键在于 AI SDK 在你的代码和各家 API 之间插了一层<em>统一抽象</em>：
        无论底下是 Anthropic 的 <code>{'tool_use'}</code> 块、OpenAI 的 <code>{'function_call'}</code>、
        还是别家的格式，AI SDK 都把它们归一成同一套「文本片段 + 工具调用」的接口。opencode 的主循环只对着
        这层抽象编程，所以换模型才能只改配置。<strong>但这里有个常被忽略的边界</strong>：抽象只能拉平
        <em>共有</em>的能力。某个模型独有的特性（比如某家的 prompt caching、某家的并行工具调用上限、
        thinking token 的计费方式）抽象层往往覆盖不全，真换到生产你还是得逐家验证效果和成本，
        「一行配置切换」更多是<strong>工程上的便利</strong>，而非「换了模型行为完全一致」的保证。
      </p>

      <KeyIdea title="同样的骨架，不同的工程取舍">
        <p>
          opencode 证明了一件事：Agent 的<strong>内核</strong>（一个主循环 + 一套读写改、跑命令、搜索的工具）是相当通用的，
          真正区分各家产品的，往往是<strong>外面那层工程取舍</strong>——开源还是闭源、绑定一家模型还是厂商无关、
          单进程还是 client-server、单一界面还是多端接入。换骨架（像 deer-flow 换成图）是一种创新，
          换外壳（像 opencode）是另一种。
        </p>
      </KeyIdea>

      <h2>工具集：和 Claude Code 几乎一一对应</h2>
      <p>
        opencode 的工具几乎是 Claude Code 那套的镜像：<code>read</code>、<code>write</code>、<code>edit</code>、
        <code>bash</code>、<code>grep</code>、<code>glob</code>、<code>list</code>、<code>todo</code>、<code>webfetch</code>，
        另外还多一个独立的 <code>patch</code> 工具。它同样支持 MCP、子代理，以及上下文满了之后的自动压缩。
        换句话说，「一个 Agent 实用所需的工具集」业界已经收敛得差不多了。
      </p>
      <p>
        <strong>为什么会收敛到这几乎相同的一套？</strong>因为这套工具不是谁拍脑袋设计的，而是被「在一台机器上
        帮人改代码」这个任务本身<em>反推</em>出来的：你要看代码（read/grep/glob/list）、改代码（write/edit/patch）、
        验证（bash 跑测试）、查外部资料（webfetch）、记住多步计划（todo）。任何认真做编码 Agent 的团队，
        独立推演下来都会落到这个集合附近。这也解释了上一章 deer-flow 为什么工具长得完全不同——它的任务是研究，
        反推出来的是 search/crawl/python-repl。<strong>工具集是任务形状的镜像。</strong>
      </p>
      <p>
        值得单独说说那个独立的 <code>patch</code> 工具。<code>edit</code> 通常是「定位一段旧文本、替换成新文本」，
        而 <code>patch</code> 更接近「应用一份 diff」。后者在<em>跨多处、多文件的批量小改</em>时更省 token、更不易
        把无关代码改坏——这是个细微但很实用的工程选择，体现了 opencode 在编码场景上的打磨。
      </p>

      <Example title="一张对照表：opencode vs Claude Code">
        <ul>
          <li><strong>开源性</strong>：opencode 开源（sst/opencode）；Claude Code 是闭源产品。</li>
          <li><strong>模型绑定</strong>：opencode 厂商无关（AI SDK + models.dev，75+ provider + 本地模型）；Claude Code 绑定 Claude 系列。</li>
          <li><strong>架构</strong>：opencode 显式 client-server（TS server + Go TUI，HTTP/SSE，OpenAPI，可 serve）；Claude Code 是更一体化的单进程。</li>
          <li><strong>多端接入</strong>：opencode 经 ACP 被 Zed/Neovim/JetBrains 等接入；Claude Code 以自身 CLI 与 IDE 集成为主。</li>
          <li><strong>工具集</strong>：高度对应（read/write/edit/bash/grep/glob/list/todo/webfetch），opencode 另有独立 patch。</li>
          <li><strong>共同点</strong>：都是主循环骨架，都做 MCP、子代理、自动压缩。</li>
        </ul>
      </Example>

      <h2>多端接入：ACP</h2>
      <p>
        因为有了那条 HTTP 边界，opencode 还能通过 <em>ACP</em>（agent client protocol）被各种编辑器当成后端接进去——
        <em>Zed</em>、<em>Neovim</em>、<em>JetBrains</em> 系都可以。你在不同编辑器里用的是同一个 Agent 核心，
        只是换了张「脸」。这正是 client-server 解耦最直接的回报：一套大脑，多端复用。
      </p>
      <p>
        <strong>ACP 和 MCP 别搞混</strong>，这是一个高频误区。两者方向恰好相反：<em>MCP</em> 是让 Agent
        去<strong>接入工具/数据源</strong>（Agent 是客户端，工具是服务端）；<em>ACP</em> 是让<strong>编辑器去接入 Agent</strong>
        （编辑器是客户端，Agent 是服务端）。一个管「Agent 能用什么」，一个管「谁能用这个 Agent」。
        opencode 同时支持两者：对下用 MCP 扩工具，对上用 ACP 给编辑器当后端。
      </p>

      <Callout variant="warn" title="解耦不是免费的">
        <p>
          把 Agent 劈成 server 和 client，换来了独立部署、多端接入、厂商无关，但也引入了一层网络边界要维护：
          协议要设计、SSE 流要管、OpenAPI 要同步、版本要对齐。对一个只想跑在本机终端里的小工具来说，
          这层解耦可能是过度工程；对一个要被多个编辑器复用的开源项目来说，它就非常值。还是那句话——取舍取决于目标。
        </p>
      </Callout>

      <Callout variant="info" title="一个常见误区：以为「厂商无关」就该无脑选">
        <p>
          厂商无关听起来全是好处，但它也有隐性代价：你为了「兼容所有模型」，往往只能用到各家能力的
          <strong>最小公约数</strong>，那些深度绑定单一模型才能拿到的优化（特定的缓存、特定的工具调用格式、
          调好的系统提示）就用不上了。Claude Code 绑定 Claude，反而能把提示词、缓存、工具协议针对一个模型
          调到极致。通用与极致，本身就是一对取舍。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        看 opencode 的正确姿势，是把它当成「Claude Code 的工程对照组」：当你想自己做一个 Agent 时，
        内核（主循环 + 工具集）可以大胆照搬业界已经收敛的那套；真正要想清楚的是<strong>外壳的取舍</strong>——
        你需不需要厂商无关、需不需要被多端接入、要不要 server 独立部署。这些选择没有标准答案，
        但 opencode 给了你一个完整、可读的开源样本去参考。
      </p>

      <Practice title="做一张你自己的对比表">
        <p>
          以下面这些维度为列，亲手填一张 <strong>opencode vs Claude Code</strong> 的对比表，每格写一句话，
          并在最后一行写下：如果是你来做一个内部 Agent，这几个维度你会怎么选、为什么。
        </p>
        <ul>
          <li>开源 / 闭源</li>
          <li>模型绑定（单一厂商 / 厂商无关）</li>
          <li>架构（单进程 / client-server）</li>
          <li>多端接入能力（ACP 等）</li>
          <li>工具集差异（重点看那个独立的 patch）</li>
          <li>自动压缩与子代理是否支持</li>
        </ul>
        <p>
          进阶：再加一道思考题——你的内部 Agent 如果选「厂商无关」，会因此放弃哪些单一模型才有的优化？
          这笔账划算吗？
        </p>
      </Practice>

      <Summary
        points={[
          'opencode（sst/opencode）开源，Agent 内核与 Claude Code 高度相似，但工程取舍完全不同：开源、厂商无关、显式 client-server、多端接入。',
          '架构是显式的 client-server：TS/Bun 核心 server（Hono，集中管 state/LLM 调用/工具执行）+ Go（Bubble Tea）TUI，走 HTTP/SSE、有 OpenAPI，可 opencode serve 独立运行。',
          '劈成 server/client 是「机制与策略分离」：一套稳定内核服务多张脸；这条边界必须是 SSE 流式的，因为一轮交互会陆续吐出思考/工具调用/结果，用户要边发生边看到。',
          'provider 无关靠 AI SDK 的统一抽象，但抽象只能拉平共有能力，各家独有的缓存/并行/计费仍需逐家验证，「一行切换」是工程便利而非行为一致的保证。',
          '工具集（read/write/edit/bash/grep/glob/list/todo/webfetch + 独立 patch）是被「在机器上改代码」的任务反推出来的，所以各家收敛趋同；工具集是任务形状的镜像。',
          'ACP 与 MCP 方向相反：MCP 让 Agent 接入工具（Agent 当客户端），ACP 让编辑器接入 Agent（Agent 当服务端），opencode 两者都支持。',
          '它代表「同样的 Agent 骨架，换一套工程取舍」：内核可照搬，真正要想清的是开源/解耦/多端，以及通用（厂商无关）与极致（绑定单模型）之间的取舍。',
        ]}
      />
    </>
  )
}
