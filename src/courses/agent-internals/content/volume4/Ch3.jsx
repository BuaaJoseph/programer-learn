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

      <h2>厂商无关：换模型只是换配置</h2>
      <p>
        opencode 刻意做到 <em>provider 无关</em>。它底层基于 <em>Vercel AI SDK</em> 加 <em>models.dev</em> 的模型目录，
        号称支持 75+ 个 provider，外加本地模型。对你来说，从一个厂商的模型切到另一个，
        基本就是改一行配置，上层的工具和主循环逻辑不用动。
      </p>
      <CodeBlock lang="yaml" title="换 provider 基本只是换配置" code={providerCode} />

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

      <Callout variant="warn" title="解耦不是免费的">
        <p>
          把 Agent 劈成 server 和 client，换来了独立部署、多端接入、厂商无关，但也引入了一层网络边界要维护：
          协议要设计、SSE 流要管、OpenAPI 要同步、版本要对齐。对一个只想跑在本机终端里的小工具来说，
          这层解耦可能是过度工程；对一个要被多个编辑器复用的开源项目来说，它就非常值。还是那句话——取舍取决于目标。
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
      </Practice>

      <Summary
        points={[
          'opencode（sst/opencode）开源，Agent 内核与 Claude Code 高度相似，但工程取舍完全不同：开源、厂商无关、显式 client-server、多端接入。',
          '架构是显式的 client-server：TS/Bun 核心 server（Hono，集中管 state/LLM 调用/工具执行）+ Go（Bubble Tea）TUI，走 HTTP/SSE、有 OpenAPI，可 opencode serve 独立运行。',
          'provider 无关：基于 Vercel AI SDK + models.dev，号称 75+ provider 加本地模型，换模型基本只改配置。',
          '工具集与 Claude Code 几乎一一对应（read/write/edit/bash/grep/glob/list/todo/webfetch），另有独立 patch，同样支持 MCP、子代理、自动压缩。',
          '凭借 HTTP 边界，opencode 经 ACP 被 Zed/Neovim/JetBrains 等编辑器接入，实现一套核心、多端复用。',
          '它代表「同样的 Agent 骨架，换一套工程取舍」：内核可照搬业界收敛的那套，真正要想清的是开源/解耦/多端这些外壳选择。',
        ]}
      />
    </>
  )
}
