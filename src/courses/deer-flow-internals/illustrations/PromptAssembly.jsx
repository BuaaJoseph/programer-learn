import { DiagramFrame, Box, Row, Col, Arrow, Lane } from './kit.jsx'

// 提示词组装流程图：静态 system prompt（构建期一次）+ 每轮动态注入
export default function PromptAssembly() {
  return (
    <DiagramFrame
      title="图 · 提示词组装流程（静态模板 + 每轮动态注入）"
      note="左：构建 agent 时 apply_prompt_template 把若干「段」填进 SYSTEM_PROMPT_TEMPLATE，产出一份跨用户/会话恒定的静态 system prompt（为复用 prefix-cache）。右：随用户输入变化的内容（记忆、日期、上传文件、技能激活）不进 system prompt，而是每轮由中间件注入到 HumanMessage 的 <system-reminder> 等标签里。"
    >
      <Row gap={16} align="flex-start" style={{ minWidth: 660 }}>
        {/* 左：静态 system prompt */}
        <Col gap={5} style={{ flex: 1 }}>
          <Box tone="green" title="① 构建期：apply_prompt_template()" sub="只跑一次，结果跨会话恒定" />
          <Arrow dir="down" label="按 config / 运行参数填充槽位" />
          <Box tone="base" title="<role> 你是 {agent_name}" sub="agent_name：自定义 agent 名或默认" />
          <Box tone="base" title="{soul} + {self_update}" sub="自定义 agent 才有：SOUL.md + update_agent 指南" />
          <Box tone="base" title="<thinking_style> / <clarification_system>" sub="恒定段：先澄清后行动" />
          <Box tone="amber" title="{skills_section}" sub="动态：列出已启用技能的 metadata（渐进加载）" />
          <Box tone="amber" title="{deferred_tools_section}" sub="动态：tool_search 开时列延迟 MCP 工具名" />
          <Box tone="amber" title="{subagent_section}" sub="动态：subagent_enabled 才注入，含并发上限 n" />
          <Box tone="base" title="<working_directory> / <citations> / <critical_reminders>" sub="恒定段（+ACP/自定义挂载动态补充）" />
          <Arrow dir="down" />
          <Box tone="green" title="静态 System Prompt" sub="同一份喂给所有用户 → 命中 prefix-cache" />
        </Col>

        {/* 右：每轮动态注入 */}
        <Col gap={5} style={{ flex: 1 }}>
          <Box tone="purple" title="② 每轮：中间件注入到 HumanMessage" sub="随用户输入/时间变化的内容走这里" />
          <Arrow dir="down" />
          <Box tone="purple" title="DynamicContextMiddleware" sub="首轮注入 <system-reminder>：<memory>…</memory> + <current_date>" />
          <Box tone="purple" title="UploadsMiddleware" sub="注入 <uploaded_files>：本轮上传文件清单" />
          <Box tone="green" title="SkillActivationMiddleware" sub="用户 /skill-name 时注入 <slash_skill_activation> + 整份 SKILL.md" />
          <Arrow dir="down" label="拼到首个/当前 HumanMessage 之前" />
          <Box tone="rose" title="后台独立 LLM 调用（各有提示词）" sub="记忆更新 / 标题生成 / 历史摘要 / TODO 提醒" />
        </Col>
      </Row>
    </DiagramFrame>
  )
}
