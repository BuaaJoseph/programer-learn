import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ModuleDependency from '@/courses/deer-flow-internals/illustrations/ModuleDependency.jsx'

const tree = `deer-flow/
├── backend/
│   ├── app/                      # ← Gateway「应用层」（依赖内核，不可被内核反依赖）
│   │   ├── gateway/              #   FastAPI app、routers、auth、deps、config
│   │   └── channels/            #   IM 渠道适配（feishu/slack/telegram/...）
│   ├── packages/
│   │   └── harness/
│   │       └── deerflow/        # ← 可复用「内核」(deerflow-harness)
│   │           ├── agents/      #   factory + lead_agent + middlewares(20+) + memory
│   │           ├── subagents/   #   registry/executor/builtins + task 委派
│   │           ├── tools/       #   BaseTool 装配 + builtins + mcp
│   │           ├── sandbox/     #   Sandbox 抽象 + local 实现 + security
│   │           ├── runtime/     #   stream_bridge/events/runs/checkpointer/store
│   │           ├── skills/      #   技能安装/解析/权限/存储
│   │           ├── config/      #   AppConfig + 各 *_config + YAML 加载
│   │           ├── community/   #   aio_sandbox、各检索 provider（可选生态）
│   │           ├── mcp/、persistence/、reflection/ ...
│   ├── pyproject.toml           # uv workspace 根
│   ├── langgraph.json           # graph/auth/checkpointer 入口声明
│   └── Makefile
├── frontend/                    # Next.js 16 (App Router) + React 19
│   ├── src/app/、src/core/、src/components/
│   └── package.json
├── config.example.yaml          # 配置模板（config_version: 14）
├── Makefile                     # 顶层统一命令（dev/start/docker/...）
└── docker/、scripts/、docs/`

const workspaceCfg = `[tool.uv.workspace]
members = ["packages/harness"]

[tool.uv.sources]
deerflow-harness = { workspace = true }`

export default function Ch2() {
  return (
    <article>
      <Lead>
        读一个大项目，第一件事是搞清「<strong>哪段代码依赖哪段</strong>」。deer-flow 用 uv workspace 把后端硬切成两半：
        <code>app/</code> 是只能往内依赖的「应用层」，<code>packages/harness/deerflow/</code> 是可被复用、不反依赖应用的「内核」。
        这一刀切得很干净，理解了它，后面每个模块该放哪、能调谁就一目了然。
      </Lead>

      <h2>一、顶层目录：三块 + 一份配置模板</h2>
      <CodeBlock lang="text" title="仓库结构（精简到职责层）" code={tree} />
      <p>
        三块主体是 <code>backend/</code>、<code>frontend/</code>、以及根目录的 <code>config.example.yaml</code>（一份巨大的配置模板，
        <code>config_version: 14</code>）。顶层 <code>Makefile</code> 把前后端 + 沙箱的启动统一成一组命令（下一章细讲）。
      </p>

      <h2>二、后端的两层：app（应用）vs harness（内核）</h2>
      <p>
        后端是一个 <strong>uv workspace</strong>。根 <code>backend/pyproject.toml</code> 把
        <code>packages/harness</code> 声明为 workspace member，并把内核包命名为 <code>deerflow-harness</code>：
      </p>
      <CodeBlock lang="toml" title="backend/pyproject.toml（workspace 声明）" code={workspaceCfg} />
      <KeyIdea title="依赖方向（架构红线）">
        <code>app/</code>（gateway、channels）<strong>可以</strong> <code>import deerflow.*</code> 使用内核；
        但内核 <code>packages/harness/deerflow/*</code> <strong>不依赖</strong> <code>app/</code>。
        这让内核能脱离 Web 网关被单独复用（例如被 DeerFlow Client、测试、或别的宿主嵌入）。
        课程里看到 <code>from deerflow.runtime import ...</code> 出现在 gateway 里，就是这条线在起作用。
      </KeyIdea>

      <h2>三、内核 deerflow/ 的子模块与依赖关系</h2>
      <p>
        内核内部并不是一团乱麻，而是分层清晰的。<code>agents</code> 居中，向下依赖
        <code>tools / subagents / sandbox</code> 这些执行能力，再向下依赖
        <code>runtime / config / skills / mcp / persistence / reflection</code> 这些基础设施。
        其中 <code>config</code> 与 <code>runtime</code> 几乎被所有人依赖。
      </p>
      <ModuleDependency />

      <h2>四、每个子模块一句话职责</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>模块</th><th>对应卷</th><th>职责一句话</th></tr>
          </thead>
          <tbody>
            <tr><td><code>app/gateway</code></td><td>卷 1</td><td>FastAPI 应用：路由、SSE、鉴权、运行时单例装配</td></tr>
            <tr><td><code>app/channels</code></td><td>卷 7</td><td>把飞书/Slack/Telegram 等统一成 Channel，inbound→agent run</td></tr>
            <tr><td><code>agents</code></td><td>卷 2</td><td>两层工厂 + 二十余个 AgentMiddleware + ThreadState + 记忆</td></tr>
            <tr><td><code>subagents</code></td><td>卷 3</td><td>子代理注册/执行；task 工具委派；token/状态回传父代理</td></tr>
            <tr><td><code>tools</code></td><td>卷 3</td><td><code>get_available_tools</code> 统一装配工具；内置工具 + MCP 接入</td></tr>
            <tr><td><code>sandbox</code></td><td>卷 4</td><td>Sandbox/Provider 抽象、本地沙箱实现、安全门控、注入中间件</td></tr>
            <tr><td><code>runtime</code></td><td>卷 5</td><td>StreamBridge 流式、事件持久化、RunManager、checkpointer/store</td></tr>
            <tr><td><code>skills</code></td><td>卷 6</td><td>SKILL.md 安装/解析/安全扫描/权限/存储/slash</td></tr>
            <tr><td><code>config</code></td><td>卷 6</td><td>AppConfig + 各子配置 + YAML 热加载 + 反射装配</td></tr>
            <tr><td><code>community</code></td><td>卷 4</td><td>可选生态：aio-sandbox 容器、各检索/抓取 provider</td></tr>
            <tr><td><code>mcp / persistence / reflection</code></td><td>—</td><td>MCP 客户端缓存 / ORM 仓储 / 「module:Class」字符串反射装配</td></tr>
          </tbody>
        </table>
      </div>

      <h2>五、前端：Next.js 16 + React 19</h2>
      <p>
        前端是独立的 <code>pnpm</code> 工程（<code>frontend/package.json</code>，version 同为 <code>2.1.0</code>）。核心栈：
        <code>next@16</code>（App Router，<code>next dev --turbo</code>）、<code>react@19</code>、
        <strong><code>@langchain/langgraph-sdk</code></strong>（流式交互核心，提供 <code>useStream</code> hook）、
        <code>@tanstack/react-query</code>（服务端状态）、<code>streamdown</code>（边流边渲染 markdown）、<code>tailwindcss@4</code>。
        细节留到卷 7。
      </p>
      <Callout variant="warn" title="一个易错点：没有 zustand">
        网上不少介绍说 deer-flow 前端用 zustand。实测 v2.1.0 的 <code>package.json</code> 与 <code>src</code> 里
        <strong>没有 zustand</strong>。状态分三摊：流式会话状态在 <code>useStream</code>、服务端缓存在 react-query、
        本地偏好在 <code>core/settings/store.ts</code> 自实现的 <code>useSyncExternalStore</code> external store。
      </Callout>

      <Example title="动手：用一条命令验证依赖红线">
        想确认「内核不反依赖 app」，可以在仓库根执行
        <code>grep -rn "from app" backend/packages/harness/</code> 与
        <code>grep -rn "import app\\." backend/packages/harness/</code>，正常情况下应几乎无命中（除测试外）。
      </Example>

      <Summary
        points={[
          '后端是 uv workspace：app/ 是应用层（可依赖内核），packages/harness/deerflow/ 是内核 deerflow-harness（不反依赖 app）——这是最重要的架构红线。',
          '内核子模块分层：agents 居中，向下是 tools/subagents/sandbox 执行层，再向下是 runtime/config/skills/mcp/persistence/reflection 基础设施；config 与 runtime 被广泛依赖。',
          '前端是独立 Next.js 16 + React 19 工程，流式交互依赖 @langchain/langgraph-sdk 的 useStream；没有 zustand。',
          '每个子模块对应本课程的一卷，按图索骥即可定位源码。',
        ]}
      />
    </article>
  )
}
