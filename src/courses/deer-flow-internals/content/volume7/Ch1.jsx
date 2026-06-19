import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const apiClient = `// core/api/api-client.ts
import { Client as LangGraphClient } from "@langchain/langgraph-sdk/client";
const client = new LangGraphClient({ apiUrl, onRequest: injectCsrfHeader });
// apiUrl = getLangGraphBaseURL() = \`\${window.location.origin}/api/langgraph\`
// → 经 next.config.js rewrites 反代到网关 :8001/api`

const layout = `// app/workspace/layout.tsx（服务端组件，force-dynamic）
const user = await getServerSideUser();
switch (user.tag) {
  case "authenticated":        return <AuthProvider><WorkspaceContent>{children}</…>;
  case "needs_setup":          redirect("/setup");
  case "unauthenticated":      redirect("/login");
  case "gateway_unavailable":  return <GatewayOfflineFallback/>;
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        前端是一个独立的 <strong>Next.js 16（App Router）+ React 19</strong> 工程。它最值得学的不是 UI 细节，而是<strong>领域模块的切分</strong>
        （<code>src/core/*</code>）和一个清晰的结论：它<strong>不自己解析 SSE</strong>，流式交互整个交给 <code>@langchain/langgraph-sdk</code> 的
        <code>useStream</code>。这一章把前端结构、路由、状态管理摸清，为下一章的端到端时序打底。
      </Lead>

      <h2>一、技术栈：几个关键依赖说明了架构</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>依赖</th><th>角色</th></tr></thead>
          <tbody>
            <tr><td><code>next@16</code> / <code>react@19</code></td><td>App Router 框架 / UI（<code>next dev --turbo</code>）</td></tr>
            <tr><td><strong><code>@langchain/langgraph-sdk</code></strong></td><td><strong>流式交互核心</strong>：Client + <code>useStream</code> React hook</td></tr>
            <tr><td><code>@tanstack/react-query</code></td><td>服务端状态/缓存（会话列表、history、token usage）</td></tr>
            <tr><td><code>streamdown</code></td><td>边流边渲染 markdown</td></tr>
            <tr><td><code>ai</code>（Vercel AI SDK）</td><td>仅用于 UI 元件类型（<code>UIMessage</code>/PromptInput），<strong>不负责网络流</strong></td></tr>
            <tr><td><code>tailwindcss@4</code> / <code>shiki</code> / <code>katex</code></td><td>样式 / 代码高亮 / 公式</td></tr>
          </tbody>
        </table>
      </div>
      <Callout variant="warn" title="两个常见误解">
        ① <strong>没有 zustand</strong>（卷 0-2 已提）：状态分三摊——流式会话在 <code>useStream</code>、服务端缓存在 react-query、本地偏好在
        <code>core/settings/store.ts</code> 自实现的 <code>useSyncExternalStore</code>。② <code>ai</code> 包<strong>不做流式传输</strong>，
        只贡献 UI 类型；真正的流走 langgraph-sdk。读源码时别被依赖名误导。
      </Callout>

      <h2>二、core 模块：按领域切分</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>模块</th><th>职责</th></tr></thead>
          <tbody>
            <tr><td><code>core/api/api-client.ts</code></td><td>创建/缓存 langgraph-sdk <code>Client</code>，注入 CSRF，包装 <code>runs.stream</code>/<code>joinStream</code></td></tr>
            <tr><td><code>core/api/fetcher.ts</code></td><td>fetch 包装：<code>credentials:"include"</code> + <code>X-CSRF-Token</code>，401 自动跳 <code>/login</code></td></tr>
            <tr><td><code>core/threads/hooks.ts</code></td><td><strong>核心</strong>：<code>useThreadStream</code>（封装 useStream）、<code>useThreadHistory</code>、会话增删改</td></tr>
            <tr><td><code>core/messages/utils.ts</code></td><td>消息分组、内容/推理抽取、<code>hide_from_ui</code> 过滤、上传标签解析</td></tr>
            <tr><td><code>core/streamdown/*</code></td><td>streamdown 的 remark/rehype 插件、防深层嵌套栈溢出的预处理</td></tr>
            <tr><td><code>core/artifacts/*</code></td><td>产物文件加载，流式期从 <code>write_file</code> 工具调用构造草稿预览</td></tr>
            <tr><td><code>core/tasks/*</code></td><td>subagent 子任务状态 Context（消费 <code>task_running</code> 事件）</td></tr>
            <tr><td><code>core/settings/*</code></td><td>本地偏好 external store（mode、token 展示）</td></tr>
            <tr><td><code>core/auth / models / skills / mcp / memory / channels</code></td><td>各自的 REST + react-query hooks</td></tr>
          </tbody>
        </table>
      </div>

      <h2>三、API client：apiUrl 与反向代理</h2>
      <CodeBlock lang="ts" title="core/api/api-client.ts" code={apiClient} />
      <KeyIdea title="前端怎么打到后端">
        前端把 <code>apiUrl</code> 设成 <code>{'`${window.location.origin}/api/langgraph`'}</code>，是个<strong>同源</strong>地址；
        <code>next.config.js</code> 的 rewrites 再把 <code>/api/langgraph/*</code> 反代到网关 <code>:8001/api/*</code>（卷 0-3 见过）。
        这样浏览器侧永远同源（CSRF/cookie 友好），跨进程的事交给 Next/nginx。CSRF 由 <code>injectCsrfHeader</code> 在每个状态变更请求
        从 <code>csrf_token</code> cookie 读出塞进 <code>X-CSRF-Token</code>——和卷 1-3 的后端双提交校验对上。
      </KeyIdea>

      <h2>四、App Router 路由与页面</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>路由</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td><code>/</code></td><td>Landing 营销页（纯静态）</td></tr>
            <tr><td><code>/workspace</code></td><td>服务端 <code>redirect("/workspace/chats/new")</code></td></tr>
            <tr><td><code>/workspace/chats/[thread_id]</code></td><td><strong>主聊天页</strong>（thread_id 可为字面量 <code>new</code>）</td></tr>
            <tr><td><code>/workspace/agents/...</code></td><td>自定义 agent 列表/创建/对话</td></tr>
            <tr><td><code>/login</code>、<code>/setup</code></td><td>认证路由组 <code>(auth)</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>鉴权在布局层做（服务端组件），按 <code>getServerSideUser()</code> 的标签分支：</p>
      <CodeBlock lang="ts" title="app/workspace/layout.tsx（鉴权分支）" code={layout} />
      <Callout variant="note" title="一个很讲究的 URL 处理">
        新会话路径是 <code>/chats/new</code>，前端用 <code>uuid()</code> 本地生成临时 thread_id（避免把字面量 <code>"new"</code> 传后端导致 422）。
        run 真正建立后，<code>onStart</code> 回调用<strong>原生</strong> <code>history.replaceState</code> 把 URL 改成真实 thread_id——
        源码注释特意强调<strong>不能用 next router</strong>，否则组件 remount 会丢掉流式状态。
      </Callout>

      <h2>五、状态管理：三摊各管一段</h2>
      <ul>
        <li><strong>流式会话状态</strong>：<code>useStream</code> 持有 <code>messages</code> / <code>values</code>（即 <code>AgentThreadState</code>）/
          <code>isLoading</code> / <code>submit</code> / <code>stop</code>；<code>useThreadStream</code> 在外层维护乐观消息与跨 thread 切换。</li>
        <li><strong>服务端缓存</strong>：react-query。会话列表 <code>useInfiniteThreads</code>、历史 <code>useThreadHistory</code>、token usage 等；
          流式回调里主动 upsert/invalidate 缓存保持同步。</li>
        <li><strong>本地偏好</strong>：<code>core/settings/store.ts</code> 的 external store（<code>localStorage</code> + <code>storage</code> 事件跨标签同步），
          承载 <code>context.mode</code>（flash/thinking/pro/ultra）等。</li>
      </ul>

      <Example title="mode 是怎么变成后端开关的">
        前端的 <code>context.mode</code> 在提交时被翻译成后端能懂的标志：<code>thinking_enabled</code>（非 flash）、
        <code>is_plan_mode</code>（pro/ultra）、<code>subagent_enabled</code>（ultra）、<code>reasoning_effort</code>。这正好对接卷 2-1
        <code>make_lead_agent</code> 从 <code>RunnableConfig.context</code> 读出的那些运行参数——前后端在这里精确咬合。
      </Example>

      <Summary
        points={[
          '前端是 Next.js 16 + React 19；流式交互核心是 @langchain/langgraph-sdk 的 useStream，前端不自己解析 SSE；没有 zustand，ai 包只贡献 UI 类型。',
          'core/* 按领域切分：api（client/fetcher）、threads（useThreadStream）、messages、streamdown、artifacts、tasks、settings、各 REST hooks。',
          'apiUrl 同源 /api/langgraph 经 next rewrites 反代到网关，CSRF 由 injectCsrfHeader 从 cookie 注入 header，与后端双提交对上。',
          '状态三摊：useStream（流式会话）+ react-query（服务端缓存）+ settings external store（本地偏好）；context.mode 翻译成 thinking/plan/subagent 等后端开关。',
        ]}
      />
    </article>
  )
}
