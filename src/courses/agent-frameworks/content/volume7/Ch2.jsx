import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pomSnippet = `<properties>
    <java.version>17</java.version>
    <spring-ai.version>1.1.8</spring-ai.version>
</properties>

<dependencyManagement>
    <dependencies>
        <!-- 统一管理 Spring AI 全家桶版本 -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>\${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- Web：提供 @RestController -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- OpenAI 兼容 starter：用它走百炼的 compatible-mode -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
</dependencies>`

const ymlSnippet = `spring:
  ai:
    openai:
      api-key: \${DASHSCOPE_API_KEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-plus`

const mainClass = `package com.example.bailian;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BailianDemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(BailianDemoApplication.class, args);
    }
}`

const runSnippet = `# 把百炼 API Key 注入环境变量（与 yml 里的 \${DASHSCOPE_API_KEY} 对应）
export DASHSCOPE_API_KEY=sk-你的百炼key

# 启动应用
mvn spring-boot:run`

const controllerSnippet = `package com.example.bailian;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    private final ChatClient chat;

    // ChatClient.Builder 由 spring-ai-starter-model-openai 自动装配
    public ChatController(ChatClient.Builder builder) {
        this.chat = builder.build();
    }

    @GetMapping("/chat")
    public String chat(@RequestParam String q) {
        return chat.prompt().user(q).call().content();
    }
}`

const curlSnippet = `curl "http://localhost:8080/chat?q=用一句话介绍杭州"
# 预期返回一段模型生成的中文文本`

const urlGood = `base-url: https://dashscope.aliyuncs.com/compatible-mode
# 框架拼接 completions-path（默认 /v1/chat/completions）后：
# https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions   ← 正确`

const urlBad = `base-url: https://dashscope.aliyuncs.com/compatible-mode/v1
# 再拼默认的 /v1/chat/completions：
# https://dashscope.aliyuncs.com/compatible-mode/v1/v1/chat/completions ← 双 v1 → 404`

const urlAlt = `spring:
  ai:
    openai:
      base-url: https://dashscope.aliyuncs.com/compatible-mode/v1
      chat:
        completions-path: /chat/completions   # 改掉默认值，避免重复 /v1`

export default function Ch2() {
  return (
    <article>
      <Lead>
        本章用一个最小可跑的 Spring Boot 工程，通过 OpenAI 兼容模式接入阿里云百炼（DashScope），
        把 Qwen 模型用起来。全程只写三个文件 + 一段配置，并把最容易踩的 <strong>base-url 拼接坑</strong>讲透——
        这是 90% 新手第一次接百炼报 404 的根因。
      </Lead>

      <h2>一、为什么选 OpenAI 兼容模式接百炼</h2>
      <p>接百炼有两条路径：</p>
      <ul>
        <li><strong>路径 A（本章）</strong>：用官方 <code>spring-ai-starter-model-openai</code>，把 base-url 指向百炼的 compatible-mode 端点。无需引入阿里专属依赖，纯 Spring AI 原生抽象，迁移成本最低。</li>
        <li><strong>路径 B（Ch3 加餐）</strong>：用阿里官方 <strong>Spring AI Alibaba</strong>（<code>spring-ai-alibaba-starter-dashscope</code>）原生 DashScope，支持 Qwen 多模态/Embedding/Agent-Graph，且无 base-url 坑。</li>
      </ul>
      <p>路径 A 胜在通用：今天接百炼，明天换成任何兼容 OpenAI 协议的服务，改 yml 即可。</p>

      <h2>二、pom.xml 关键依赖</h2>
      <p>用 <code>spring-ai-bom</code> 统一管理版本（本卷锁定 1.1.8），再引入 Web 和 OpenAI starter：</p>
      <CodeBlock lang="xml" title="pom.xml（关键片段）" code={pomSnippet} />
      <Callout variant="note" title="为什么用 BOM">
        <code>spring-ai-bom</code> 统一约束 Spring AI 全家桶的版本，子依赖就不用再各自写 <code>{'<version>'}</code>，
        避免版本错配。注意 <code>{'${spring-ai.version}'}</code> 是 Maven 属性占位符，由上面的 <code>{'<properties>'}</code> 提供。
      </Callout>

      <h2>三、application.yml（完整配置）</h2>
      <CodeBlock lang="yaml" title="src/main/resources/application.yml" code={ymlSnippet} />
      <p>四个关键点：</p>
      <ul>
        <li><code>api-key</code> 用 <code>{'${DASHSCOPE_API_KEY}'}</code> 引用环境变量，绝不硬编码进仓库；</li>
        <li><code>base-url</code> 只写到 <code>.../compatible-mode</code>，<strong>不带 /v1</strong>（详见第五节）；</li>
        <li>虽然用的是百炼，但 starter 是 openai，所以配置节点在 <code>spring.ai.openai</code> 下；</li>
        <li><code>model</code> 填百炼模型名，如 <code>qwen-plus</code> / <code>qwen-max</code> / <code>qwen-turbo</code>。</li>
      </ul>

      <h2>四、启动类</h2>
      <CodeBlock lang="java" title="BailianDemoApplication.java" code={mainClass} />
      <p>标准 Spring Boot 启动类，无任何 AI 相关代码——所有装配由 starter + yml 自动完成，这正是 Spring AI 的设计哲学。</p>

      <h2>五、base-url 拼接坑（重点中的重点）</h2>
      <p>
        Spring AI 的 OpenAI client 请求的最终 URL 是<strong>拼出来的</strong>：
      </p>
      <p style={{ textAlign: 'center', fontWeight: 600 }}>
        最终 URL = base-url + completions-path
      </p>
      <p>
        而 <code>completions-path</code> 的默认值是 <code>/v1/chat/completions</code>。所以 base-url
        只需写到 <code>.../compatible-mode</code>，框架会自动补出正确路径：
      </p>
      <CodeBlock lang="yaml" title="正确：base-url 不带 /v1" code={urlGood} />
      <Callout variant="warn" title="最常见的 404：双 v1">
        如果你按直觉把 base-url 写成 <code>.../compatible-mode/v1</code>，框架再拼上默认的
        <code>/v1/chat/completions</code>，结果是 <code>.../compatible-mode/v1/v1/chat/completions</code>——
        多出一个 <code>/v1</code>，百炼直接返回 404。这是接百炼第一次必踩的坑。
      </Callout>
      <CodeBlock lang="yaml" title="错误：base-url 带 /v1 导致双 v1 → 404" code={urlBad} />
      <h3>替代写法（二者取一）</h3>
      <p>如果你确实想让 base-url 带上 <code>/v1</code>（比如团队规范要求），那就同时改掉 completions-path：</p>
      <CodeBlock lang="yaml" title="替代：base-url 带 /v1 + 改 completions-path" code={urlAlt} />
      <KeyIdea title="记牢这条规则">
        base-url 带不带 <code>/v1</code>，必须和 completions-path 配套：默认 path 是 <code>/v1/chat/completions</code>，
        所以默认就让 base-url 停在 <code>/compatible-mode</code>。两边都带 <code>/v1</code> = 双 v1 = 404。
      </KeyIdea>
      <h3>区域端点</h3>
      <p>
        百炼有不同地域端点。国内默认 <code>dashscope.aliyuncs.com</code>，国际站为
        <code>dashscope-intl.aliyuncs.com</code>。换区域只改 base-url 的域名部分，
        <code>/compatible-mode</code> 后缀与拼接规则不变。

      </p>

      <h2>六、环境与运行</h2>
      <CodeBlock lang="bash" title="设置 Key 并启动" code={runSnippet} />
      <p>
        <code>export</code> 的变量名必须与 yml 里 <code>{'${DASHSCOPE_API_KEY}'}</code> 一致。
        生产环境通常通过容器环境变量或配置中心注入，开发期用 export 即可。
      </p>

      <h2>七、最小 ChatClient 调用验证</h2>
      <p>写一个 <code>@RestController</code>，构造注入 <code>ChatClient.Builder</code>，链式调用返回字符串：</p>
      <CodeBlock lang="java" title="ChatController.java" code={controllerSnippet} />
      <CodeBlock lang="bash" title="curl 验证" code={curlSnippet} />
      <Example title="这一条链发生了什么">
        <code>{'prompt()'}</code> 开启构建 → <code>{'user(q)'}</code> 设置用户消息 → <code>{'call()'}</code>
        经 base-url 拼出的正确 URL 发请求给百炼 → 百炼用 Qwen 生成回复 → <code>{'content()'}</code> 取出纯文本返回浏览器。
      </Example>

      <h2>八、常见报错与调试清单</h2>
      <ul>
        <li><strong>404、URL 里出现 /v1/v1</strong>：base-url 多写了 <code>/v1</code>，去掉它（见第五节）。</li>
        <li><strong>401 Unauthorized</strong>：API Key 错误或未生效——检查 <code>export DASHSCOPE_API_KEY</code> 是否设置、是否与 yml 占位符同名、Key 是否是百炼（DashScope）的而非其它平台。</li>
        <li><strong>启动报找不到 ChatClient.Builder / 无 AI Bean</strong>：<code>spring-ai-starter-model-openai</code> 没引入，或被 BOM 版本约束遗漏。</li>
        <li><strong>依赖解析失败 / 版本冲突</strong>：Spring Boot 与 Spring AI 版本不匹配——1.1.x 需配 Spring Boot 3.x。</li>
        <li><strong>调试技巧</strong>：开 <code>logging.level.org.springframework.ai=DEBUG</code> 可看到实际请求的完整 URL，一眼确认是否双 v1。</li>
      </ul>

      <Summary points={[
        '路径 A：用 spring-ai-starter-model-openai + base-url 指向百炼 compatible-mode，纯原生抽象、迁移成本低。',
        'pom 用 spring-ai-bom（1.1.8）统一版本 + spring-boot-starter-web + spring-ai-starter-model-openai。',
        'application.yml 配在 spring.ai.openai 下：api-key 用环境变量、base-url 到 /compatible-mode、model 填 qwen-plus。',
        '【核心坑】最终URL = base-url + completions-path(默认 /v1/chat/completions)；base-url 必须不带 /v1，否则双 v1 → 404。',
        '替代写法：base-url 带 /v1 时，把 completions-path 改成 /chat/completions，二者取一。',
        '运行：export DASHSCOPE_API_KEY=... 后 mvn spring-boot:run；用 /chat?q=... 验证。',
        '排错：404 看双 v1、401 看 Key、无 Bean 看 starter、依赖冲突看 Boot/AI 版本（1.1.x 配 Boot 3.x）。',
      ]} />
    </article>
  )
}
