import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const chatClientBasic = `// 注入即用：ChatClient 是 Spring AI 的主入口（fluent API）
String answer = chatClient
        .prompt()                 // 开启一次对话构建
        .user("用一句话解释什么是向量数据库")  // 设置用户消息
        .call()                   // 同步调用底层 ChatModel
        .content();               // 取出纯文本回复`

const advisorsSnippet = `// Advisor 即拦截链：在请求/响应两侧织入横切逻辑
var chatClient = ChatClient.builder(chatModel)
        .defaultAdvisors(
                // 多轮记忆：自动把历史消息塞进 prompt
                MessageChatMemoryAdvisor.builder(chatMemory).build(),
                // RAG：检索向量库相关文档并拼进上下文
                new QuestionAnswerAdvisor(vectorStore)
        )
        .build();`

const toolSnippet = `@Component
public class WeatherTools {

    @Tool(description = "查询某个城市的当前天气")
    public WeatherInfo getWeather(
            @ToolParam(description = "城市名，例如 北京") String city) {
        // 框架根据方法签名 + 注解自动生成 JSON Schema 交给模型
        return new WeatherInfo(city, 26, "晴");
    }
}`

const entitySnippet = `// 结构化输出：直接把模型回复反序列化成 Java 类型
public record Movie(String title, int year, String director) {}

Movie m = chatClient.prompt()
        .user("推荐一部 2010 年的科幻电影，给出导演")
        .call()
        .entity(Movie.class);   // 自动注入 format 指令并解析 JSON`

const serviceSnippet = `@Service
public class SupportService {

    private final ChatClient chat;

    // 构造注入：ChatClient.Builder 由 starter 自动装配
    public SupportService(ChatClient.Builder builder) {
        this.chat = builder
                .defaultSystem("你是一个礼貌的客服助手")
                .build();
    }

    public String reply(String question) {
        return chat.prompt().user(question).call().content();
    }
}`

const ymlSnippet = `# 配置外置：换模型/换厂商/调温度都不改一行 Java
spring:
  ai:
    openai:
      api-key: \${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini
          temperature: 0.3`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Spring AI 是 Spring 官方的一级项目，它做的事情可以一句话概括：把对话模型、嵌入、向量库、RAG、工具调用、MCP
        这些 AI 能力，用 Spring Boot 程序员最熟悉的「自动配置 + 依赖注入 + starter」方式统一抽象出来——
        让你在 <code>@Service</code> 里用 AI，像用 <code>JdbcTemplate</code> 一样自然。
      </Lead>

      <h2>一、起源：Spring 为什么要做 Spring AI</h2>
      <p>
        2023 年大模型应用爆发时，Java 生态相对被动：主流的 LLM 编排库（LangChain、LlamaIndex）都在 Python，
        Java 团队要么裸调 HTTP，要么用零散的第三方封装。Spring 团队判断「AI 调用」终将和「数据库访问」一样，
        成为后端应用的常规依赖，于是把它纳入 Spring 体系，复用 Spring 二十年沉淀的工程能力：依赖注入、
        自动配置、配置外置、可观测、事务与安全。
      </p>
      <p>
        Spring AI 的生态位是「企业级 Java 后端接入 AI 的标准层」。它不和数据科学/训练抢生意，而是站在
        Spring Boot 之上，让既有的微服务、交易系统、CRM 等以最小成本嵌入大模型能力。
      </p>
      <h3>版本演进与活跃度</h3>
      <table>
        <thead>
          <tr><th>里程碑</th><th>时间</th><th>要点</th></tr>
        </thead>
        <tbody>
          <tr><td>1.0 GA</td><td>2025-05-20</td><td>首个正式版，确立 ChatClient / Advisors / 工具调用 / RAG 的核心抽象</td></tr>
          <tr><td>1.1.x</td><td>2026（约 1.1.8，配 Spring Boot 3.x）</td><td>当前稳定维护线，本卷教学采用</td></tr>
          <tr><td>2.0 里程碑</td><td>推进中</td><td>主打可组合 / agentic，新增 ToolCallingAdvisor 把工具调用循环提为一等公民</td></tr>
        </tbody>
      </table>
      <p>2026 年 1.0.x 与 1.1.x 并行维护，社区活跃，与 Spring Boot 主线节奏保持同步。</p>

      <h2>二、设计理念：把 LLM 调用变成「又一个被 Spring 管理的依赖」</h2>
      <p>Spring AI 的全部设计都围绕一个目标：让 AI 调用融入 Spring 的心智模型，而不是另起炉灶。四根支柱：</p>
      <ul>
        <li><strong>自动配置（Auto-configuration）</strong>：引入对应 starter，框架自动根据 classpath 与 yml 装配出 <code>ChatModel</code> / <code>ChatClient.Builder</code> 等 Bean。</li>
        <li><strong>依赖注入（DI）</strong>：你在任意 <code>@Service</code> / <code>@RestController</code> 里构造注入 <code>ChatClient</code> 即可，无需手动 new。</li>
        <li><strong>配置外置</strong>：模型名、API Key、base-url、温度全部进 <code>application.yml</code>，换厂商不改代码。</li>
        <li><strong>横切即 Advisor</strong>：记忆、RAG、日志、安全过滤等通用逻辑做成可插拔的拦截链。</li>
      </ul>
      <CodeBlock lang="yaml" title="配置外置：application.yml 决定用哪个模型" code={ymlSnippet} />

      <h2>三、架构总览与数据流</h2>
      <ArchDiagram framework="spring-ai" />
      <p>一次典型调用的数据流：</p>
      <ol>
        <li>容器启动时，starter 读取 <code>application.yml</code> 自动装配出 <code>ChatModel</code> 与 <code>ChatClient.Builder</code>。</li>
        <li>业务类构造注入 <code>ChatClient</code>，调用 <code>{'prompt().user(...)'}</code> 构建请求。</li>
        <li><code>call()</code> 触发请求，先经过 <strong>Advisor 链</strong>（可注入记忆、检索文档等），再发给底层 <code>ChatModel</code>。</li>
        <li>若注册了 <code>@Tool</code> 工具，模型可在回复中请求调用工具，框架执行后把结果回传模型。</li>
        <li>响应经 Advisor 链返回，<code>.content()</code> 取文本或 <code>{'.entity(Xxx.class)'}</code> 映射成 Java 对象。</li>
      </ol>

      <h2>四、核心组件逐个详解</h2>
      <h3>ChatClient（主入口，fluent API）</h3>
      <p>最常用的高层接口。链式调用：<code>prompt()</code> → <code>{'user()/system()'}</code> → <code>call()</code> → <code>{'content()/entity()'}</code>。</p>
      <CodeBlock lang="java" title="ChatClient 最小调用" code={chatClientBasic} />
      <h3>ChatModel / EmbeddingModel（底层模型抽象）</h3>
      <p>
        <code>ChatModel</code> 是对话模型的统一接口，<code>EmbeddingModel</code> 负责把文本转成向量。它们由各厂商
        starter（OpenAI、DashScope、Ollama 等）自动装配，<code>ChatClient</code> 就构建在 <code>ChatModel</code> 之上。
        一般业务代码只面向 <code>ChatClient</code>，不直接碰 <code>ChatModel</code>。
      </p>
      <h3>Advisors（拦截链）</h3>
      <p>类似 Servlet Filter / Spring AOP 的请求-响应拦截器，是 Spring AI 实现记忆与 RAG 的核心机制。</p>
      <table>
        <thead><tr><th>Advisor</th><th>作用</th></tr></thead>
        <tbody>
          <tr><td><code>MessageChatMemoryAdvisor</code></td><td>多轮记忆：自动把历史消息注入 prompt</td></tr>
          <tr><td><code>QuestionAnswerAdvisor</code></td><td>RAG：按问题检索 VectorStore，相关文档拼进上下文</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="给 ChatClient 装上记忆与 RAG" code={advisorsSnippet} />
      <h3>@Tool / @ToolParam（工具调用）</h3>
      <p>
        在普通方法上加 <code>@Tool</code>，Spring AI 自动据方法签名生成 JSON Schema 交给模型；模型决定何时调用，
        框架负责执行并回传结果。通过 <code>{'ChatClient.builder().defaultTools(obj)'}</code> 注册。
      </p>
      <CodeBlock lang="java" title="声明一个工具" code={toolSnippet} />
      <h3>结构化输出 .entity()</h3>
      <p>把模型自由文本直接映射成 Java <code>record</code> / POJO，框架自动注入格式指令并解析。</p>
      <CodeBlock lang="java" title="结构化输出" code={entitySnippet} />
      <h3>VectorStore / RAG、ChatMemory、MCP</h3>
      <ul>
        <li><strong>VectorStore</strong>：向量库统一抽象（SimpleVectorStore 内存版、Redis、PgVector、Milvus 等），配合 <code>QuestionAnswerAdvisor</code> 做检索增强。</li>
        <li><strong>ChatMemory</strong>：对话历史存储抽象，喂给 <code>MessageChatMemoryAdvisor</code> 实现多轮上下文。</li>
        <li><strong>MCP</strong>：提供 MCP client / server starter，让应用接入或暴露 Model Context Protocol 工具。</li>
      </ul>

      <h2>五、Spring 风格的 AI：在 @Service 里注入 ChatClient</h2>
      <p>所有抽象最终落到一个熟悉的画面——把 AI 当成一个被容器托管的协作者：</p>
      <CodeBlock lang="java" title="像注入任何 Bean 一样使用 AI" code={serviceSnippet} />
      <Example title="它和 JdbcTemplate 有多像">
        你不会手动管理数据库连接，而是注入 <code>JdbcTemplate</code> 直接写 SQL；同样，你也不手动拼 HTTP、管
        API Key，而是注入 <code>ChatClient</code> 直接写 prompt。连接、鉴权、序列化都由 starter 与自动配置处理。
      </Example>

      <h2>六、Agent / Agentic 现状</h2>
      <p>很多人问：Spring AI 能做 Agent 吗？答案要分版本看：</p>
      <ul>
        <li><strong>1.x</strong>：没有独立的 agents 模块，推荐用 <code>ChatClient + @Tool + advisor 链</code> 自行编排。多步推理通过工具调用与多轮交互实现。</li>
        <li><strong>2.0</strong>：新增 <code>ToolCallingAdvisor</code>，把「调用工具 → 把结果回传 → 模型可能再调工具」的递归循环提升为一等公民，递归执行直到模型不再请求工具，更接近 agentic 体验。</li>
        <li><strong>重型多 Agent / Graph 编排</strong>：在 <strong>Spring AI Alibaba</strong> 子生态（Agent-Graph）里更成熟，适合复杂工作流。</li>
      </ul>
      <KeyIdea title="一句话">
        1.x 的「Agent」= ChatClient 编排 + 工具调用循环；2.0 用 ToolCallingAdvisor 把这个循环内建化。
      </KeyIdea>

      <h2>七、适合与不适合</h2>
      <p><strong>适合：</strong></p>
      <ul>
        <li>已有 Spring Boot 后端、想加 AI 能力的团队；</li>
        <li>企业 Java 团队，需要把 AI 嵌入事务、安全、微服务体系；</li>
        <li>需要把对话/RAG/工具调用做成稳定服务而非一次性脚本。</li>
      </ul>
      <p><strong>不适合：</strong></p>
      <ul>
        <li>纯 Python 的数据科学 / 模型训练场景；</li>
        <li>一次性、轻量脚本（用 Python + 厂商 SDK 更快）；</li>
        <li>最前沿的研究型多 Agent 编排（生态仍在追赶）。</li>
      </ul>

      <h2>八、生态定位小结</h2>
      <p>
        Spring AI 不是「Java 版 LangChain」的简单复制，而是「让 AI 成为 Spring 应用的标准依赖」。
        它的价值不在算法新颖，而在工程一致性：同一套 DI / 配置 / 拦截器心智，覆盖从单次问答到 RAG、
        工具调用、MCP 的全链路，让 Java 团队以最小学习成本把 AI 投入生产。
      </p>

      <Summary points={[
        'Spring AI 是 Spring 官方一级项目，把对话/嵌入/向量库/RAG/工具/MCP 用 starter + 自动配置 + DI 统一抽象。',
        '1.0 GA 于 2025-05-20，2026 年稳定线为 1.1.x（配 Spring Boot 3.x），2.0 推进可组合/agentic。',
        'ChatClient 是主入口（fluent API）：prompt().user().call().content()/entity()；底层是 ChatModel/EmbeddingModel。',
        'Advisors 是横切拦截链：MessageChatMemoryAdvisor 做记忆、QuestionAnswerAdvisor 做 RAG。',
        '@Tool/@ToolParam 自动生成 schema 供模型调用；.entity() 直接结构化输出。',
        'Agent：1.x 自行编排，2.0 用 ToolCallingAdvisor 内建工具循环，重型 Graph 在 Spring AI Alibaba。',
        '适合 Spring Boot 后端 / 企业 Java 团队嵌入 AI；不适合纯 Python 数据科学与一次性脚本。',
      ]} />
    </article>
  )
}
