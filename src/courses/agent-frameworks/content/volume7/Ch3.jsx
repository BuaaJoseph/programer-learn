import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

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
}`;

const weatherInfo = `package com.example.bailian;

public record WeatherInfo(String city, int tempC, String desc) {
}`;

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
}`;

const curlCmd = `curl "http://localhost:8080/ask?q=北京今天天气怎么样"`;

const ragSnippet = `// 概念示意：用向量库做文档问答（RAG）
ChatClient chat = builder
        .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore))
        .build();`;

const alibabaYml = `spring:
  ai:
    dashscope:
      api-key: \${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-plus`;

export default function Ch3() {
  return (
    <article>
      <Lead>
        接通百炼只是开始。本章我们在上一章工程的基础上，做一个 REST 接口，把 Spring AI 三大特色
        一锅端：构造器注入 <code>ChatClient</code> + <code>@Tool</code> 工具调用 +{' '}
        <code>{'.entity()'}</code> 结构化输出。一个 <code>/ask</code> 接口，把这三件事讲透。
      </Lead>

      <h2>一、定义工具与结构化输出类型</h2>
      <p>
        先写一个天气查询工具。<code>@Tool</code> 把方法暴露为模型可调用的工具，
        <code>@ToolParam</code> 描述参数。这里返回值 demo 写死，真实场景里换成调外部天气 API 即可：
      </p>
      <CodeBlock lang="java" title="WeatherTools.java">{weatherTools}</CodeBlock>

      <p>再定义结构化输出的目标类型——一个简洁的 Java record：</p>
      <CodeBlock lang="java" title="WeatherInfo.java">{weatherInfo}</CodeBlock>

      <h2>二、控制器：三件事一条链</h2>
      <CodeBlock lang="java" title="AskController.java">{askController}</CodeBlock>

      <h2>三、逐段讲解</h2>
      <ul>
        <li>
          <strong>@Tool / @ToolParam：</strong>把普通方法变成工具，注解里的 description
          会被框架生成为工具的 schema 描述，模型据此判断是否、如何调用。
        </li>
        <li>
          <strong>构造器注入：</strong>构造器里注入 <code>ChatClient.Builder</code>（由 starter 自动装配）
          和 <code>WeatherTools</code>（Spring Bean），用 <code>{'defaultTools(tools)'}</code>
          把工具注册进 ChatClient。
        </li>
        <li>
          <strong>调用链：</strong><code>{'prompt().user(q).call().entity(WeatherInfo.class)'}</code>
          一条链完成：发问 → 模型自动调用 <code>getWeather</code> 工具 → 把结果结构化映射成
          <code>WeatherInfo</code> record → Spring MVC 再把它序列化成 JSON 返回。
        </li>
      </ul>

      <h2>四、验证</h2>
      <CodeBlock lang="bash" title="测试接口">{curlCmd}</CodeBlock>

      <Example title="一次请求里发生了什么">
        当请求 <code>{'/ask?q=北京今天天气怎么样'}</code> 到达：<br />
        1. 模型识别出「需要查天气」，决定调用工具；<br />
        2. 模型发起工具调用 <code>getWeather("北京")</code>；<br />
        3. 框架执行该方法，拿到 <code>WeatherInfo</code> 对象；<br />
        4. 模型按 record 的 schema 输出结构化结果；<br />
        5. Spring 把它映射成 <code>{'{ "city": ..., "tempC": ..., "desc": ... }'}</code> JSON 返回。<br />
        <strong>依赖注入 + 工具调用 + 结构化输出</strong>，三件事在一个接口里全讲透了。
      </Example>

      <h2>五、进阶：用 RAG advisor 做文档问答</h2>
      <Callout variant="tip">
        想让 AI 基于你自己的文档（产品手册、知识库）回答？把文档切片、向量化后存进
        <code>VectorStore</code>，再挂一个检索增强 Advisor 即可。核心就一行：
        <code>{'.advisors(new QuestionAnswerAdvisor(vectorStore))'}</code>。
        每次提问，Advisor 会先去向量库检索相关片段，拼进 prompt 再交给模型回答。
        <CodeBlock lang="java" title="RAG 概念示意">{ragSnippet}</CodeBlock>
      </Callout>

      <h2>六、国内生产加餐：Spring AI Alibaba</h2>
      <Callout variant="note">
        除了走 OpenAI 兼容模式，阿里官方还出了
        <code>spring-ai-alibaba-starter-dashscope</code>——<strong>原生</strong>接入百炼，
        没有上一章那个 base-url 双 v1 的坑，而且支持 Qwen 的多模态、Embedding 以及国产的
        Agent-Graph 编排能力。配置更简洁：
        <CodeBlock lang="yaml" title="application.yml（Spring AI Alibaba）">{alibabaYml}</CodeBlock>
      </Callout>

      <p><strong>两条路径如何取舍：</strong></p>
      <ul>
        <li>
          <strong>OpenAI starter（OpenAI 兼容模式）：</strong>通用、可迁移，换模型/换供应商成本低，
          但要小心 base-url 拼接，能力以「OpenAI 公共子集」为主。
        </li>
        <li>
          <strong>Spring AI Alibaba：</strong>原生接入，无 base-url 坑，能用上 Qwen 全部能力
          （多模态、Embedding、Agent-Graph 等），适合国内生产环境深度集成。
        </li>
      </ul>

      <h2>七、卷 7 小结</h2>
      <KeyIdea>
        Spring AI 做的核心一件事，就是<strong>把 AI 变成一个普通的 Spring 依赖</strong>：
        注入 ChatClient、用 @Tool 扩工具、用 .entity() 拿结构化结果、用 Advisor 加记忆和 RAG，
        全程都是 Spring 工程师最熟悉的姿势。AI 不再是外挂，而是后端体系里的一等公民。
      </KeyIdea>
      <p>
        下一卷，我们将把本课程讲过的七个主流 Agent 开发框架放在一起，做一次横向对比与选型分析，
        帮你在真实项目里做出正确的技术选择。
      </p>

      <Summary points={[
        '一个 /ask 接口同时演示 Spring AI 三大特色：构造器注入 ChatClient、@Tool 工具调用、.entity() 结构化输出。',
        '@Tool/@ToolParam 把方法变工具并自动生成 schema；defaultTools 注册；prompt().user().call().entity() 一条链发问→自动调工具→映射成 record。',
        'RAG 进阶：文档向量化存入 VectorStore，挂 .advisors(new QuestionAnswerAdvisor(vectorStore)) 即可做文档问答。',
        'Spring AI Alibaba（spring-ai-alibaba-starter-dashscope）原生接百炼，无 base-url 坑，支持 Qwen 多模态/Embedding/Agent-Graph。',
        '选型：OpenAI starter 通用可迁移；Spring AI Alibaba 原生、能力全、适合国内生产。',
        '卷 7 核心：Spring AI 把 AI 变成一个被 Spring 管理的依赖。下一卷做七框架横向对比与选型。',
      ]} />
    </article>
  );
}
