import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

const chatClientDemo = `// 在任意被 Spring 管理的 Bean 里注入并使用
ChatClient chatClient = builder.build();

String answer = chatClient
        .prompt()
        .user("用一句话解释什么是依赖注入")
        .call()
        .content();`;

const advisorChain = `// Advisors 是一条按顺序执行的拦截链
ChatClient chatClient = builder
        .defaultAdvisors(
            // 记忆：自动把历史对话注入 prompt
            MessageChatMemoryAdvisor.builder(chatMemory).build(),
            // RAG：先检索知识库，再把相关片段塞进 prompt
            QuestionAnswerAdvisor.builder(vectorStore).build()
        )
        .build();`;

const toolDemo = `@Component
public class TimeTools {

    @Tool(description = "获取当前服务器时间")
    public String now(@ToolParam(description = "时区，如 Asia/Shanghai") String zone) {
        return ZonedDateTime.now(ZoneId.of(zone)).toString();
    }
}

// 注册到 ChatClient
ChatClient chat = builder.defaultTools(new TimeTools()).build();`;

const entityDemo = `// 让模型直接吐出一个 Java record，而不是裸字符串
record CityInfo(String name, String country, long population) {}

CityInfo info = chatClient
        .prompt()
        .user("介绍一下东京")
        .call()
        .entity(CityInfo.class);`;

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果你是一名 Java/Spring 工程师，想给现有后端加上「会说话」的能力，却又不想为此切到 Python
        生态，那么 Spring AI 就是为你准备的。它把对话模型、嵌入、向量库、RAG、工具调用、MCP
        统统按 Spring 最熟悉的方式——自动配置、依赖注入、starter——重新封装了一遍。本章先讲清楚它到底是什么、
        核心抽象有哪些、什么场景该用它。
      </Lead>

      <h2>一、定位：Spring 官方出品的 AI 框架</h2>
      <p>
        Spring AI 是 Spring 官方团队出品、面向 Java/Spring 生态的 AI 应用开发框架。它的目标很直接：
        把和大模型打交道的所有能力——聊天补全、文本嵌入、向量检索、RAG、工具调用、MCP（Model Context Protocol）——
        都以 Spring 开发者最熟悉的「自动配置 + 依赖注入 + starter」风格统一抽象出来。
      </p>
      <p>
        版本节奏上：<strong>1.0 GA 于 2025-05-20</strong> 正式发布；进入 2026 年后，社区并行维护
        1.0.x 与 1.1.x 两条线（最新约 1.1.8），同时 2.0 里程碑正在推进，主打「可组合（composable）」与
        「agentic（自主代理）」能力。本卷教学统一采用 1.1.x 这条稳定线。
      </p>

      <KeyIdea>
        Spring AI 的核心心智模型：<strong>它把一次 LLM 调用，变成了「又一个被 Spring 管理的依赖」</strong>。
        你不再手动拼 HTTP 请求、处理流式响应，而是像注入 <code>JdbcTemplate</code> 或
        <code>RestTemplate</code> 一样，注入一个 <code>ChatClient</code> 就能用。
      </KeyIdea>

      <h2>二、核心抽象</h2>
      <p>下面这几个概念，是理解整个 Spring AI 的钥匙：</p>

      <h3>1. ChatClient —— 教学主入口（fluent API）</h3>
      <p>
        最常用的门面，提供链式 API。一句 <code>{'chatClient.prompt().user(...).call().content()'}</code>
        就能完成「发问 → 拿到文本回答」。
      </p>
      <CodeBlock lang="java" title="ChatClient 基本用法">{chatClientDemo}</CodeBlock>

      <h3>2. ChatModel / EmbeddingModel —— 底层模型接口</h3>
      <p>
        <code>ChatModel</code> 是对话模型的底层抽象，<code>EmbeddingModel</code> 是嵌入模型的底层抽象。
        引入对应的 starter（比如 OpenAI、DashScope）后，它们会被<strong>自动装配</strong>，
        ChatClient 默认就建立在 ChatModel 之上。
      </p>

      <h3>3. Advisors —— 拦截链（横切增强）</h3>
      <p>
        Advisor 是 Spring AI 实现横切关注点的机制，一条 Advisor 链会<strong>按顺序执行</strong>，
        在请求送往模型之前/响应返回之后做增强。两个最常见的内置 Advisor：
      </p>
      <ul>
        <li><strong>对话记忆</strong>：<code>MessageChatMemoryAdvisor</code>，自动维护多轮对话历史。</li>
        <li><strong>RAG 检索增强</strong>：<code>QuestionAnswerAdvisor</code>，先去向量库检索再回答。</li>
      </ul>
      <CodeBlock lang="java" title="Advisor 链">{advisorChain}</CodeBlock>

      <h3>4. 工具调用（Tool Calling）</h3>
      <p>
        用 <code>@Tool</code> 注解把一个普通方法变成模型可调用的工具，用
        <code>@ToolParam</code> 描述参数；通过 <code>{'ChatClient.builder().defaultTools(obj)'}</code>
        注册。注解里的 description 会被转成工具 schema 交给模型，让模型自己决定何时调用。
      </p>
      <CodeBlock lang="java" title="@Tool 工具">{toolDemo}</CodeBlock>

      <h3>5. 结构化输出（Structured Output）</h3>
      <p>
        调用链末尾用 <code>{'.entity(MyRecord.class)'}</code>，框架会自动让模型按目标类型的结构作答，
        并把回答直接映射成 Java record / POJO。从此告别手写 JSON 解析。
      </p>
      <CodeBlock lang="java" title="结构化输出">{entityDemo}</CodeBlock>

      <h3>6. MCP（Model Context Protocol）</h3>
      <p>
        Spring AI 提供 MCP 的 client / server starter，可以把外部 MCP 工具接进来，或把自己暴露为 MCP server。
      </p>

      <Callout variant="note">
        关于 Agent / Agentic：Spring AI 1.x <strong>并没有独立的 agents 模块</strong>。官方推荐用
        「ChatClient + @Tool + Advisor 链」自行编排自主行为。到 2.0，框架把「工具调用循环」提升为一等公民，
        引入了 <code>ToolCallingAdvisor</code>，让多轮工具调用更顺手。
      </Callout>

      <h2>三、范式：企业 Java 集成 + Spring 风格</h2>
      <p>
        Spring AI 的设计完全遵循 Spring 的世界观：自动配置（约定优于配置）、依赖注入、配置外置（application.yml）、
        Advisor 作为横切。它不是要你学一套全新的编程范式，而是让 AI 自然地融入你已有的 Spring Boot 工程。
      </p>

      <Example title="Spring 化的 AI">
        在一个 <code>@Service</code> 或 <code>@RestController</code> 里，你只需要构造器注入
        <code>ChatClient</code>，然后像调用 <code>JdbcTemplate</code> 查数据库一样调用 AI。
        用哪个模型、API Key、温度（temperature）这些，全部写在 <code>application.yml</code> 里，
        代码完全不感知。换模型？改一行配置即可，业务代码一行不动。
      </Example>

      <h2>四、适合 / 不适合</h2>
      <p><strong>适合：</strong></p>
      <ul>
        <li>已有 Spring Boot 后端，想加 AI 能力（智能问答、RAG 知识库、工具调用、智能客服）。</li>
        <li>企业 Java 团队，需要把 AI 嵌进现有的事务、安全、微服务体系。</li>
        <li>看重工程规范、可维护性、可观测性的生产级后端项目。</li>
      </ul>
      <p><strong>不适合：</strong></p>
      <ul>
        <li>纯 Python 的数据科学 / 模型训练工作流。</li>
        <li>一次性的探索脚本（杀鸡用牛刀）。</li>
        <li>前沿研究型的复杂 Agent 编排——这块生态目前仍以 Python 为主。</li>
      </ul>

      <Callout variant="warn">
        下一章我们就动手用 Spring Boot 接入阿里云百炼。这里先剧透一个<strong>最容易踩的坑</strong>：
        OpenAI 兼容模式下的 <code>base-url</code> 拼接问题——一不小心就会拼出双 <code>/v1</code> 导致
        404。下章会把这个坑掰开揉碎讲清楚。
      </Callout>

      <Summary points={[
        'Spring AI 是 Spring 官方出品的 Java/Spring 生态 AI 框架，1.0 GA 于 2025-05-20，教学用 1.1.x 稳定线。',
        '核心心智：把一次 LLM 调用变成「又一个被 Spring 管理的依赖」，像注入 JdbcTemplate 一样注入 ChatClient。',
        '六大抽象：ChatClient（fluent 入口）、ChatModel/EmbeddingModel（底层接口）、Advisors（拦截链：记忆/RAG）、@Tool 工具调用、.entity() 结构化输出、MCP。',
        'Agent 能力：1.x 用 ChatClient + @Tool + Advisor 自行编排；2.0 引入 ToolCallingAdvisor 把工具调用循环变成一等公民。',
        '适合给现有 Spring Boot 后端加 AI、企业 Java 团队；不适合纯 Python 数据科学与前沿 agent 研究。',
        '下一章重点：接百炼时的 base-url 双 /v1 → 404 坑。',
      ]} />
    </article>
  );
}
