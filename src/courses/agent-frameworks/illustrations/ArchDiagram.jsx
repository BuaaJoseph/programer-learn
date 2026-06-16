import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 框架架构图：把一个框架的分层组件画出来 + 一句数据流，点组件看它的职责。
// 七个框架共用这一个渲染器，按 framework 选不同的 spec，保证风格一致、读者好对比。
const SPECS = {
  smolagents: {
    title: 'smolagents 架构',
    flow: '任务 → CodeAgent 生成一段 Python → 执行器运行代码(可调用 Tools) → 观察结果 → 循环直到得出答案',
    layers: [
      { label: '入口', items: [{ k: 'task', t: '用户任务', d: 'agent.run(task)：一句自然语言任务。' }] },
      { label: 'Agent', items: [
        { k: 'code', t: 'CodeAgent', d: '旗舰：每一步生成并执行一段 Python 作为动作（code-as-action）。' },
        { k: 'tc', t: 'ToolCallingAgent', d: '经典范式：每步输出 JSON 工具调用，作为补充。' },
      ] },
      { label: '执行', items: [
        { k: 'exec', t: 'PythonExecutor', d: '执行模型写的代码：local(AST 白名单) / e2b / docker 沙箱。' },
        { k: 'tools', t: 'Tools(@tool)', d: '可在代码里被调用的工具：函数加 @tool，或继承 Tool。' },
      ] },
      { label: '模型', items: [{ k: 'model', t: 'OpenAIServerModel → Qwen', d: 'api_base 指向百炼兼容端点；也可用 LiteLLMModel/InferenceClientModel 等。' }] },
    ],
  },
  'openai-agents': {
    title: 'OpenAI Agents SDK 架构',
    flow: 'Runner 跑 Agent → 命中 handoff 就切到另一个 Agent / guardrail 并行校验 → 工具循环 → final_output',
    layers: [
      { label: '入口', items: [{ k: 'runner', t: 'Runner.run', d: '驱动「调用→工具→再调用」循环直到产出最终输出。' }] },
      { label: 'Agent', items: [
        { k: 'agent', t: 'Agent', d: 'instructions + model + tools，一个可运行的角色。' },
        { k: 'handoff', t: 'Handoff', d: '把控制权交给另一个 Agent，本质是「返回 Agent」的特殊工具调用。' },
        { k: 'guard', t: 'Guardrail', d: '输入/输出并行校验，命中 tripwire 立即中断。' },
      ] },
      { label: '运行期', items: [
        { k: 'session', t: 'Session', d: '自动维护多轮会话状态。' },
        { k: 'trace', t: 'Tracing', d: '内置可观测；接第三方模型时通常关掉。' },
      ] },
      { label: '模型', items: [{ k: 'model', t: 'AsyncOpenAI → Qwen', d: '自定义 base_url + 切 chat_completions 接百炼。' }] },
    ],
  },
  'pydantic-ai': {
    title: 'PydanticAI 架构',
    flow: 'run(deps=) → 模型(工具用 ctx.deps 访问依赖) → 输出按 output_type 校验/重试 → 返回类型化对象',
    layers: [
      { label: '类型契约', items: [
        { k: 'out', t: 'output_type(BaseModel)', d: '输出按 Pydantic 模型校验，不合规自动重试，result.output 保类型。' },
        { k: 'deps', t: 'deps_type', d: '依赖类型：数据库/配置/当前用户，注入给 Agent。' },
      ] },
      { label: 'Agent', items: [
        { k: 'agent', t: 'Agent(泛型)', d: '把 model/deps/output 都绑进类型系统。' },
        { k: 'tool', t: '@agent.tool', d: '工具用 RunContext[Deps] 的 ctx.deps 访问注入依赖。' },
        { k: 'sys', t: 'system_prompt', d: '可动态生成的系统提示。' },
      ] },
      { label: '模型', items: [{ k: 'model', t: 'OpenAIChatModel + OpenAIProvider → Qwen', d: 'base_url 接百炼；也有原生 AlibabaProvider。' }] },
    ],
  },
  langgraph: {
    title: 'LangGraph 架构',
    flow: 'invoke → 节点改 State → 条件边决定下一跳 → checkpointer 存档 →（interrupt 等人审）→ 直到 END',
    layers: [
      { label: '状态', items: [{ k: 'state', t: 'State(类型化 + reducer)', d: '图在一个共享的、带类型的 State 上跑；reducer 定义字段如何合并。' }] },
      { label: '图', items: [
        { k: 'node', t: 'Nodes', d: '输入 state → 输出 state 更新的函数节点。' },
        { k: 'edge', t: 'Conditional Edges', d: '路由函数决定下一跳，从而构造 ReAct/循环/分支。' },
      ] },
      { label: '运行时', items: [
        { k: 'ckpt', t: 'Checkpointer', d: '每个节点后存 state → 记忆、可恢复、容错。' },
        { k: 'intr', t: 'Interrupt', d: '暂停等外部输入，用 Command(resume=) 继续——人审闸门。' },
      ] },
      { label: '模型/工具', items: [{ k: 'model', t: 'ChatOpenAI + Tools → Qwen', d: 'langchain-openai 的 ChatOpenAI(base_url=) 接百炼。' }] },
    ],
  },
  crewai: {
    title: 'CrewAI 架构',
    flow: 'kickoff → 按 Process 调度 Agent 执行 Task → context 把上一个产出接力 → 汇总最终结果',
    layers: [
      { label: '编排', items: [
        { k: 'crew', t: 'Crew(Process)', d: 'sequential 顺序 / hierarchical 有 manager 委派。' },
        { k: 'flow', t: 'Flows', d: '事件驱动的确定性编排：@start/@listen/@router + 状态。' },
      ] },
      { label: '角色', items: [{ k: 'agent', t: 'Agent(role/goal/backstory)', d: '有「人设」的角色，带 tools 与 memory。' }] },
      { label: '任务', items: [{ k: 'task', t: 'Task(context=...)', d: 'description + expected_output；context 把别的任务产出作为输入。' }] },
      { label: '模型/工具', items: [{ k: 'model', t: 'LLM + Tools + Memory → Qwen', d: 'LLM(model="openai/qwen-plus", base_url=) 接百炼。' }] },
    ],
  },
  llamaindex: {
    title: 'LlamaIndex 架构',
    flow: '文档→嵌入→建索引；Agent 收到问题→调 QueryEngineTool 检索→据检索结果回答',
    layers: [
      { label: '数据层', items: [
        { k: 'doc', t: 'Documents', d: '你的原始数据，切块后嵌入。' },
        { k: 'index', t: 'VectorStoreIndex', d: '向量索引：把文档块变成可检索的向量。' },
        { k: 'qe', t: 'QueryEngine', d: '检索 + 生成：按问题取相关块再回答。' },
      ] },
      { label: '工具化', items: [{ k: 'tool', t: 'QueryEngineTool', d: '把 query engine 包成工具，交给 Agent 调用。' }] },
      { label: 'Agent', items: [{ k: 'agent', t: 'FunctionAgent / AgentWorkflow', d: '决定何时检索、怎么用检索结果；Workflows 做事件驱动编排。' }] },
      { label: '模型/嵌入', items: [{ k: 'model', t: 'OpenAILike + DashScopeEmbedding → Qwen', d: 'LLM 用 OpenAILike(is_chat_model=True)；嵌入用百炼。' }] },
    ],
  },
  'spring-ai': {
    title: 'Spring AI 架构',
    flow: '注入 ChatClient → prompt().user().call() →（Advisor 链 / @Tool 工具调用）→ .entity() 映射成对象',
    layers: [
      { label: '应用', items: [{ k: 'ctrl', t: '@RestController / @Service', d: '构造注入 ChatClient，像用 JdbcTemplate 一样用 AI。' }] },
      { label: '客户端', items: [
        { k: 'client', t: 'ChatClient(fluent)', d: 'prompt().user().call().content()/entity() 的链式 API。' },
        { k: 'adv', t: 'Advisors', d: '横切链：ChatMemory 记忆、QuestionAnswerAdvisor 做 RAG。' },
      ] },
      { label: '能力', items: [
        { k: 'tool', t: '@Tool / @ToolParam', d: '方法级声明式工具，自动生成 schema。' },
        { k: 'ent', t: '.entity(Record.class)', d: '把回答直接映射成 Java record/POJO。' },
      ] },
      { label: '模型', items: [{ k: 'model', t: 'OpenAI starter(base-url) → Qwen', d: 'spring.ai.openai.base-url 写到 compatible-mode（不带 /v1）。' }] },
    ],
  },
}

export default function ArchDiagram({ framework }) {
  const spec = SPECS[framework]
  const [sel, setSel] = useState(null)
  if (!spec) return null

  const L = spec.layers
  const top0 = 34
  const rowH = 56
  const H = top0 + L.length * rowH + 50
  const left = 86
  const right = 452

  const info = sel ? sel.d : spec.flow

  return (
    <Figure caption={`${spec.title}：从上到下是它的分层组件，箭头是一次请求的大致流向。点任意组件看它的职责。`}>
      <svg viewBox={`0 0 460 ${H}`} width="460" role="img" aria-label={spec.title}>
        <text x="14" y="20" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--ink)">{spec.title}</text>

        {L.map((layer, li) => {
          const y = top0 + li * rowH
          const n = layer.items.length
          const gap = 8
          const totalW = right - left
          const w = (totalW - gap * (n - 1)) / n
          return (
            <g key={li}>
              <text x="14" y={y + 26} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">{layer.label}</text>
              {li < L.length - 1 && (
                <line x1="230" y1={y + 42} x2="230" y2={y + rowH} stroke="var(--border-strong)" strokeWidth="1.2" markerEnd="url(#ad-arr)" />
              )}
              {layer.items.map((it, ii) => {
                const x = left + ii * (w + gap)
                const on = sel && sel.k === it.k
                return (
                  <g key={it.k} onClick={() => setSel(it)} style={{ cursor: 'pointer' }}>
                    <rect x={x} y={y} width={w} height="40" rx="7" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
                    <foreignObject x={x + 4} y={y + 4} width={w - 8} height="32">
                      <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', font: '10px var(--mono)', color: on ? 'var(--accent-strong)' : 'var(--ink)', fontWeight: on ? 700 : 400, lineHeight: 1.15 }}>{it.t}</div>
                    </foreignObject>
                  </g>
                )
              })}
            </g>
          )
        })}

        <defs>
          <marker id="ad-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
        </defs>

        <rect x="14" y={H - 44} width="438" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <foreignObject x="22" y={H - 40} width="422" height="26">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3, display: 'flex', alignItems: 'center', height: '100%' }}>{info}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}
