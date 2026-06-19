import { DiagramFrame, Box, Col, Arrow } from './kit.jsx'

const STACK = [
  ['ToolOutputBudgetMiddleware', 'wrap_tool_call / wrap_model_call', '超大工具返回落盘 + 紧凑预览', 'gray'],
  ['ThreadDataMiddleware', 'before_agent', '解析 thread_id，写 workspace/uploads/outputs 路径', 'gray'],
  ['UploadsMiddleware', 'before_agent', '注入 <uploaded_files> 上下文', 'gray'],
  ['SandboxMiddleware', 'before_agent / wrap_tool_call', '懒初始化沙箱，写回 sandbox_id', 'base'],
  ['DanglingToolCallMiddleware', 'wrap_model_call', '补合成 ToolMessage 修复中断历史', 'gray'],
  ['LLMErrorHandlingMiddleware', 'wrap_model_call', 'LLM 调用重试/退避 + 兜底回复', 'rose'],
  ['SandboxAuditMiddleware', 'wrap_tool_call', 'bash 命令安全审计', 'base'],
  ['ToolErrorHandlingMiddleware', 'wrap_tool_call', '工具异常转 ToolMessage + task 状态盖章', 'rose'],
  ['DynamicContextMiddleware', 'before_agent', '把日期/记忆注入 <system-reminder>（保 prefix-cache）', 'purple'],
  ['SkillActivationMiddleware', 'wrap_model_call', '/skill-name 确定性注入 SKILL.md', 'green'],
  ['DeerFlowSummarizationMiddleware', 'before_model', '历史压缩 + memory flush 钩子', 'purple'],
  ['TodoMiddleware', 'before/after_model …', '复杂任务 todo 跟踪，阻止过早收尾', 'amber'],
  ['TokenUsageMiddleware', 'after_model', '按 step 归因 token 用量', 'gray'],
  ['TitleMiddleware', 'after_model', '首轮后异步生成会话标题', 'gray'],
  ['MemoryMiddleware', 'after_agent', '入队 + LLM 异步去抖动更新记忆', 'purple'],
  ['ViewImageMiddleware', 'before_model', '把图片细节注入供 vision 模型查看', 'gray'],
  ['DeferredToolFilterMiddleware', 'wrap_model_call / wrap_tool_call', '隐藏未 promote 的 MCP 工具 schema', 'amber'],
  ['SubagentLimitMiddleware', 'after_model', '截断单次响应内的并发 task 调用', 'amber'],
  ['LoopDetectionMiddleware', 'before_agent / after_model …', '检测重复 tool_calls 循环并打断', 'rose'],
  ['SafetyFinishReasonMiddleware', 'after_model', '剥离安全终止留下的半截 tool_calls', 'rose'],
  ['ClarificationMiddleware', 'wrap_tool_call（恒为链尾）', '拦截 ask_clarification，Command(goto=END) 等用户', 'green'],
]

export default function MiddlewareStack() {
  return (
    <DiagramFrame
      title="图 2-2 · lead agent 中间件栈（自上而下的装配顺序）"
      note="顺序即语义：before_* 钩子按装配顺序执行，after_* 钩子逆序分发。例如 SafetyFinishReasonMiddleware 故意排在末段，使其 after_model 先跑、先清理被安全终止的 tool_calls，再流经 Loop/Subagent 计数。ClarificationMiddleware 恒被强制拉回链尾。"
    >
      <Col gap={3} style={{ minWidth: 560 }}>
        {STACK.map(([name, hook, desc, tone], i) => (
          <Box
            key={i}
            tone={tone}
            mono
            title={`${String(i + 1).padStart(2, '0')}. ${name}`}
            sub={`【${hook}】 ${desc}`}
          />
        ))}
        <Arrow dir="down" label="create_agent(... middleware=[以上顺序] ...) → LangGraph 状态图" />
      </Col>
    </DiagramFrame>
  )
}
