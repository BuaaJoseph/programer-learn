# 主流 Agent 开发框架 · 配套可运行示例

这是课程《主流 Agent 开发框架：原理解析与实战》的配套代码。每个框架一个子目录，
里面是课程实战章里逐行讲解的那段代码——「章节代码 = 可运行代码」。

全程用**阿里云百炼（DashScope）的 OpenAI 兼容端点**作模型后端，跑 Qwen 系列模型。

## 通用前提

1. 注册阿里云百炼、拿一个 API Key。
2. 设环境变量：
   ```bash
   export DASHSCOPE_API_KEY=sk-xxxxxxxx
   ```
3. 百炼 OpenAI 兼容端点（北京区）：
   `https://dashscope.aliyuncs.com/compatible-mode/v1`
   （国际区把 `dashscope` 换成 `dashscope-intl`。）
4. 每个子目录有自己的 `requirements.txt`（Spring AI 子目录是 Maven 项目），按目录说明安装运行。

## 目录

| 目录 | 框架 | 范式 | case |
| --- | --- | --- | --- |
| `00-intro/` | —— | 裸 OpenAI 兼容调用 | 不借助框架，直接用 openai SDK 接百炼打底 |
| `01-smolagents/` | smolagents | 代码行动 | CodeAgent 解多步题 |
| `02-openai-agents/` | OpenAI Agents SDK | 轻量+handoff | 客服分诊 + 输入护栏 |
| `03-pydantic-ai/` | PydanticAI | 类型安全 | 工单分级（结构化输出+依赖注入） |
| `04-langgraph/` | LangGraph | 图/状态机 | 带记忆与人审的 ReAct |
| `05-crewai/` | CrewAI | 角色协作 | Researcher→Writer 出报告 |
| `06-llamaindex/` | LlamaIndex | 数据/RAG | chat-with-your-docs |
| `07-spring-ai/` | Spring AI (Java) | 企业 Java | Spring Boot + ChatClient + @Tool |

> 说明：示例代码按各框架官方文档与当前版本（2026 年）编写。由于运行需要你自己的
> 百炼 API Key，仓库不附带 key；个别框架经 LiteLLM/兼容层接百炼的写法建议用真实 key 自测一次。
