import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

const pomXml = `<properties>
  <java.version>17</java.version>
  <spring-ai.version>1.1.8</spring-ai.version>
</properties>

<dependencyManagement>
  <dependencies>
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
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
  </dependency>
</dependencies>`;

const appYml = `spring:
  ai:
    openai:
      api-key: \${DASHSCOPE_API_KEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-plus`;

const mainClass = `package com.example.bailian;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BailianDemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(BailianDemoApplication.class, args);
    }
}`;

const runCmd = `export DASHSCOPE_API_KEY=sk-xxxxxxxx
mvn spring-boot:run`;

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论说够了，开干。本章我们建一个最小的 Spring Boot 工程，用 Spring AI 官方的 OpenAI starter，
        走「OpenAI 兼容模式」接入阿里云百炼。本章只有一个目标：把环境和接入彻底跑通——
        尤其是那个让无数人 404 的 <code>base-url</code> 拼接坑。工具调用和结构化输出留到下一章再加。
      </Lead>

      <h2>一、为什么用 OpenAI starter 接百炼</h2>
      <p>
        百炼（DashScope）提供了一个「OpenAI 兼容模式」端点，请求/响应格式和 OpenAI 一致。
        因此我们可以直接复用 Spring AI 的 <code>spring-ai-starter-model-openai</code>，
        只改 base-url 和 api-key，就能把请求打到百炼。这条路的好处是<strong>通用、可迁移</strong>：
        哪天想换回 OpenAI 或别的兼容服务，改配置即可。
      </p>

      <h2>二、Maven 依赖</h2>
      <p>
        关键是用 <code>dependencyManagement</code> 导入 <code>spring-ai-bom</code> 统一管理版本，
        再引入 web 和 openai model 两个 starter：
      </p>
      <CodeBlock lang="xml" title="pom.xml（关键依赖）">{pomXml}</CodeBlock>
      <p>
        其中 <code>spring-ai-bom</code> 负责锁定所有 Spring AI 模块的版本，子依赖就不必各自写版本号了。
        本工程还需要一个 <code>spring-boot-starter-parent</code> 作为父 POM（标准 Spring Boot 工程结构，此处略）。
      </p>

      <h2>三、base-url 拼接坑（本章核心）</h2>
      <p>先看配置文件：</p>
      <CodeBlock lang="yaml" title="src/main/resources/application.yml">{appYml}</CodeBlock>

      <KeyIdea>
        Spring AI 的 OpenAI client 最终请求 URL ={' '}
        <strong><code>base-url</code> + <code>completions-path</code></strong>。
        而 <code>completions-path</code> 的<strong>默认值就是</strong>{' '}
        <code>/v1/chat/completions</code>（注意：<code>/v1</code> 已经包含在 path 里了）。
      </KeyIdea>

      <p>
        所以正确做法是：<code>base-url</code> 只写到 <code>.../compatible-mode</code> 为止，
        框架会自动拼成：
      </p>
      <p>
        <code>{'https://dashscope.aliyuncs.com/compatible-mode'}</code> +{' '}
        <code>{'/v1/chat/completions'}</code> ={' '}
        <code>{'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'}</code>
      </p>
      <p>这正好命中百炼的端点。</p>

      <Callout variant="warn">
        <strong>最常见的错误：</strong>把 base-url 写成 <code>.../compatible-mode/v1</code>。
        这样框架会拼成 <code>.../compatible-mode/v1/v1/chat/completions</code>——
        <strong>双 v1 → 404</strong>。如果你接通时一直 404，第一件事就是检查 base-url 是不是多写了
        <code>/v1</code>。
      </Callout>

      <Example title="两种正确写法，二选一">
        <strong>写法 A（推荐）：</strong>base-url 写到 <code>.../compatible-mode</code>，
        completions-path 用默认值 <code>/v1/chat/completions</code>。<br />
        <strong>写法 B：</strong>base-url 带上 <code>/v1</code>（即 <code>.../compatible-mode/v1</code>），
        同时显式把 completions-path 改成 <code>/chat/completions</code>。<br />
        两者拼出来的最终 URL 一致——关键是 <strong>/v1 只能出现一次</strong>。
      </Example>

      <p>
        关于区域端点：北京区域用 <code>compatible-mode</code> 域（即上文配置）；
        新加坡区域用 <code>dashscope-intl</code> 域。根据你的百炼账号所在区域选择对应 base-url。
      </p>

      <h2>四、启动类 + 最小验证</h2>
      <p>标准的 Spring Boot 启动类，没有任何特殊代码：</p>
      <CodeBlock lang="java" title="BailianDemoApplication.java">{mainClass}</CodeBlock>

      <p>
        设置好 API Key 环境变量（对应 yml 里的 <code>{'${DASHSCOPE_API_KEY}'}</code>），然后启动：
      </p>
      <CodeBlock lang="bash" title="启动">{runCmd}</CodeBlock>
      <p>
        启动若无报错，说明 starter 已成功自动装配了 ChatModel 与 ChatClient.Builder，
        接通百炼的「地基」就打好了。
      </p>

      <Callout variant="note">
        本章我们只把「能连上百炼」跑通——这是一切的前提。下一章会在这个工程的基础上，
        加入 <code>@Tool</code> 工具与 <code>{'.entity()'}</code> 结构化输出，做出一个真正有用的 REST 接口。
      </Callout>

      <Summary points={[
        '用 spring-ai-starter-model-openai 走 OpenAI 兼容模式接百炼，通用可迁移。',
        'pom.xml 用 dependencyManagement 导入 spring-ai-bom（1.1.8）统一锁版本，再引 web + openai model starter。',
        '【核心坑】最终 URL = base-url + completions-path，而 completions-path 默认已含 /v1（即 /v1/chat/completions）。',
        '正确：base-url 写到 .../compatible-mode 即可；错误：写成 .../compatible-mode/v1 会拼出双 v1 → 404。',
        '替代写法：base-url 带 /v1，同时把 completions-path 改成 /chat/completions，二者取其一，/v1 只能出现一次。',
        '区域端点：北京 compatible-mode，新加坡 dashscope-intl。API Key 走环境变量 DASHSCOPE_API_KEY，配置外置。',
      ]} />
    </article>
  );
}
