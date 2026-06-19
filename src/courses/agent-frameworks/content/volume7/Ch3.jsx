import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const weatherTools = `package com.example.bailian;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class WeatherTools {

    @Tool(description = "查询某个城市的当前天气")
    public WeatherInfo getWeather(@ToolParam(description = "城市名，例如 北京") String city) {
        return new WeatherInfo(city, 26, "晴");
    }
}`

const weatherInfo = `package com.example.bailian;

public record WeatherInfo(String city, int tempC, String desc) {
}`

const askController = `package com.example.bailian;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AskController {

    private final ChatClient chat;

    public AskController(ChatClient.Builder builder, WeatherTools tools) {
        this.chat = builder.defaultTools(tools).build();
    }

    @GetMapping("/ask")
    public WeatherInfo ask(@RequestParam String q) {
        return chat.prompt()
                .user(q)
                .call()
                .entity(WeatherInfo.class);
    }
}`

const curlSnippet = `curl "http://localhost:8080/ask?q=北京今天天气怎么样"

# 预期 JSON（字段对应 WeatherInfo record）：
# {"city":"北京","tempC":26,"desc":"晴"}`

const ragSnippet = `// 1) 建一个内存向量库并灌入文档
@Bean
SimpleVectorStore vectorStore(EmbeddingModel embeddingModel) {
    SimpleVectorStore store = SimpleVectorStore.builder(embeddingModel).build();
    store.add(List.of(
            new Document("公司年假为每年 15 天，入职满一年起算。"),
            new Document("报销需在月底前提交，超过 500 元需经理审批。")
    ));
    return store;
}

// 2) 给 ChatClient 挂上 QuestionAnswerAdvisor，问答自动检索
ChatClient chat = builder
        .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore))
        .build();

String ans = chat.prompt()
        .user("年假有多少天？")   // 框架先检索相关文档，再连同问题发给模型
        .call()
        .content();`

const memorySnippet = `// 多轮记忆：把历史对话自动注入 prompt
ChatMemory chatMemory = MessageWindowChatMemory.builder().build();

ChatClient chat = builder
        .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(chatMemory).build())
        .build();

// 用 conversationId 区分不同会话
chat.prompt().user("我叫小杜")
        .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, "user-42"))
        .call().content();

chat.prompt().user("我叫什么名字？")  // 同一会话能记起「小杜」
        .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, "user-42"))
        .call().content();`

const alibabaPom = `<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>`

const alibabaYml = `spring:
  ai:
    dashscope:
      api-key: \${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-plus`

export default function Ch3() {
  return (
    <article>
      <Lead>
        本章把 Ch2 的最小工程升级为「能调用工具 + 返回结构化结果」的智能接口：模型自己判断该不该查天气，
        框架自动执行 <code>@Tool</code> 方法，再把结果以 <code>WeatherInfo</code> 对象直接返回。随后加餐 RAG、
        多轮记忆与 Spring AI Alibaba 原生接百炼，给出两条路径的取舍。
      </Lead>

      <h2>一、目标：一个会查天气的结构化接口</h2>
      <p>
        我们要做的 <code>/ask</code> 接口：用户问「北京天气怎么样」，模型识别出需要查天气、决定调用 <code>getWeather("北京")</code>，
        框架执行工具拿到数据回传模型，模型再把答案整理成 <code>WeatherInfo</code> 结构返回。三段代码搞定。
      </p>

      <h2>二、WeatherTools：声明一个工具</h2>
      <CodeBlock lang="java" title="WeatherTools.java" code={weatherTools} />
      <p>逐点拆解：</p>
      <ul>
        <li><code>@Component</code>：让它成为 Spring Bean，可被注入到 Controller。</li>
        <li><code>@Tool(description=...)</code>：把方法暴露为模型可调用的工具，description 是给模型看的「这工具能干嘛」，模型靠它判断何时调用。</li>
        <li><code>@ToolParam(description=...)</code>：描述参数语义，框架据此 + 方法签名自动生成 JSON Schema，模型才知道要传什么。</li>
        <li>返回 <code>WeatherInfo</code>：工具结果会被序列化后回传模型。这里返回写死的示例数据，真实场景换成调用天气 API。</li>
      </ul>

      <h2>三、WeatherInfo：结构化返回类型</h2>
      <CodeBlock lang="java" title="WeatherInfo.java" code={weatherInfo} />
      <p>
        用 Java <code>record</code> 一行定义不可变数据类，三个字段 <code>city / tempC / desc</code>。它身兼两职：
        既是工具的返回类型，又是接口的结构化输出类型——下面 <code>.entity(WeatherInfo.class)</code> 会用到。
      </p>

      <h2>四、AskController：工具 + 结构化输出一条链</h2>
      <CodeBlock lang="java" title="AskController.java" code={askController} />
      <p>关键三处：</p>
      <ul>
        <li><strong>构造注入</strong>：<code>ChatClient.Builder</code> 由 starter 自动装配，<code>WeatherTools</code> 由容器注入。</li>
        <li><strong><code>defaultTools(tools)</code></strong>：把工具对象注册给这个 ChatClient，之后每次对话模型都可调用它。</li>
        <li><strong><code>{'prompt().user(q).call().entity(WeatherInfo.class)'}</code></strong>：一条链完成「构建请求 → 调用（含工具循环）→ 把最终回复映射成 WeatherInfo」。</li>
      </ul>
      <KeyIdea title="模型自动决定调用工具">
        你没有写任何「if 用户问天气 then 调 getWeather」的逻辑。是模型读了 <code>@Tool</code> 的 description 后<strong>自主决定</strong>
        要不要调、传什么参数，框架负责执行与回传。这就是工具调用（function calling）的本质。
      </KeyIdea>

      <h2>五、验证：curl 与预期 JSON</h2>
      <CodeBlock lang="bash" title="curl 验证 /ask" code={curlSnippet} />
      <Example title="一次 /ask 请求里发生了什么">
        <ol>
          <li>请求带 q=「北京今天天气怎么样」到达 Controller。</li>
          <li><code>call()</code> 把问题 + 工具 schema 发给百炼 Qwen 模型。</li>
          <li>模型返回「请调用 getWeather，参数 city=北京」。</li>
          <li>框架执行 <code>WeatherTools.getWeather("北京")</code>，得到 <code>WeatherInfo("北京",26,"晴")</code>，回传模型。</li>
          <li>模型据工具结果生成最终回复；<code>.entity(WeatherInfo.class)</code> 把它解析成对象，序列化为 JSON 返回。</li>
        </ol>
      </Example>

      <h2>六、进阶：RAG advisor 文档问答</h2>
      <p>让模型基于你的私有文档回答，只需建一个 <code>VectorStore</code> 并挂上 <code>QuestionAnswerAdvisor</code>：</p>
      <Callout variant="tip" title="RAG 的最小心智">
        建库灌文档 → 给 ChatClient 装 <code>QuestionAnswerAdvisor(vectorStore)</code> → 正常提问。
        Advisor 会在调用模型前自动检索最相关的文档，拼进上下文，模型据此作答。你的业务代码几乎不变。
      </Callout>
      <CodeBlock lang="java" title="QuestionAnswerAdvisor + SimpleVectorStore" code={ragSnippet} />
      <p>
        <code>SimpleVectorStore</code> 是内存版，适合教学与小规模；生产可换 PgVector / Redis / Milvus，
        代码层面只换 Bean，<code>QuestionAnswerAdvisor</code> 用法不变——这正是 VectorStore 抽象的价值。
      </p>

      <h2>七、进阶：ChatMemory advisor 多轮记忆</h2>
      <p>默认每次 <code>call()</code> 都是无状态的。要让模型记住上下文，挂 <code>MessageChatMemoryAdvisor</code>：</p>
      <CodeBlock lang="java" title="MessageChatMemoryAdvisor 多轮记忆" code={memorySnippet} />
      <p>
        用 <code>conversationId</code> 隔离不同用户/会话的历史。Advisor 在每次请求前把该会话的历史消息注入 prompt，
        实现「记得上文」。记忆与 RAG 可同时挂多个 Advisor，组成拦截链。
      </p>

      <h2>八、加餐：Spring AI Alibaba 原生接百炼</h2>
      <p>除了 Ch2 的 OpenAI 兼容路径，阿里还提供官方原生 starter，体验更顺滑：</p>
      <CodeBlock lang="xml" title="引入 Spring AI Alibaba starter" code={alibabaPom} />
      <CodeBlock lang="yaml" title="原生 DashScope 配置（无 base-url 坑）" code={alibabaYml} />
      <Callout variant="note" title="原生路径的优势">
        配置节点在 <code>spring.ai.dashscope</code> 下，<code>api-key</code> 用 <code>{'${AI_DASHSCOPE_API_KEY}'}</code>。
        它原生对接 DashScope，<strong>无需写 base-url，也就没有 Ch2 的双 v1 坑</strong>；
        还支持 Qwen 多模态、Embedding，以及更重型的 Agent-Graph 编排。
      </Callout>
      <h3>两条路径取舍</h3>
      <table>
        <thead><tr><th>维度</th><th>路径 A：OpenAI 兼容</th><th>路径 B：Spring AI Alibaba</th></tr></thead>
        <tbody>
          <tr><td>依赖</td><td>spring-ai-starter-model-openai</td><td>spring-ai-alibaba-starter-dashscope</td></tr>
          <tr><td>配置节点</td><td>spring.ai.openai + base-url</td><td>spring.ai.dashscope（无 base-url）</td></tr>
          <tr><td>base-url 坑</td><td>有（双 v1 → 404）</td><td>无</td></tr>
          <tr><td>可移植性</td><td>强：换任何 OpenAI 兼容服务只改 yml</td><td>绑定 DashScope</td></tr>
          <tr><td>能力</td><td>对话/工具/结构化</td><td>额外：多模态、Embedding、Agent-Graph</td></tr>
        </tbody>
      </table>
      <p>简单说：要通用与可迁移选 A；要吃透 Qwen 全部能力、做复杂 Agent 编排选 B。</p>

      <h2>九、卷七小结</h2>
      <KeyIdea title="本卷一句话">
        Spring AI 把 AI 变成「被 Spring 管理的依赖」：ChatClient 是入口，@Tool 让模型动手，.entity() 拿结构化结果，
        Advisor 链插入记忆与 RAG；接百炼记牢 base-url 别带 /v1，要省心就用 Spring AI Alibaba 原生 starter。
      </KeyIdea>

      <Summary points={[
        '@Tool/@ToolParam 让方法成为模型可调用工具，框架据签名+注解自动生成 JSON Schema。',
        'ChatClient.builder().defaultTools(tools) 注册工具；模型自主决定何时调用、传什么参数。',
        'prompt().user(q).call().entity(WeatherInfo.class) 一条链完成请求、工具循环与结构化映射。',
        'RAG：建 SimpleVectorStore 灌文档 + 挂 QuestionAnswerAdvisor，提问自动检索增强。',
        '多轮记忆：MessageChatMemoryAdvisor + conversationId，自动把历史注入 prompt。',
        'Spring AI Alibaba（spring-ai-alibaba-starter-dashscope）原生接百炼，无 base-url 坑，支持多模态/Embedding/Agent-Graph。',
        '两条路径取舍：要通用可迁移选 OpenAI 兼容；要 Qwen 全能力与复杂编排选 Spring AI Alibaba。',
      ]} />
    </article>
  )
}
