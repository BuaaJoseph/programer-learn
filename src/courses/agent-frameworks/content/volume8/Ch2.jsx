import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

const unifiedConfig = `# 把「换模型」收敛到这三个变量，业务代码完全不感知
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_MODEL    = "qwen-plus"          # 或 qwen-max / qwen-turbo
DASHSCOPE_API_KEY  = os.environ["DASHSCOPE_API_KEY"]   # 走环境变量，别硬编码`;

const springYml = `# Spring AI：注意 base-url 写到 compatible-mode 为止，不带 /v1
spring:
  ai:
    openai:
      api-key: \${DASHSCOPE_API_KEY}
      base-url: https://dashscope.aliyuncs.com/compatible-mode
      chat:
        options:
          model: qwen-plus`;

export default function Ch2() {
  return (
    <article>
      <Lead>
        整门课，我们没有用 OpenAI 的官方模型，而是用阿里云百炼（DashScope）的 Qwen 系列把七个框架全跑通了。
        这不是巧合——而是想给你证明一件事：<strong>主流 Agent 框架几乎都能无痛接国产模型</strong>。
        这一章把「接国产模型」的经验收口，给你一张七框架对照表、一份避坑清单，最后看看趋势往哪走。
      </Lead>

      <KeyIdea>
        国产模型落地的统一抓手只有一个：<strong>OpenAI 兼容端点</strong>。
        几乎所有框架都支持自定义 <code>base_url</code> 指向一个「兼容 OpenAI 协议」的服务地址。
        只要把 base_url 指向百炼的 compatible-mode 端点、填上 API Key、写对模型名，
        框架就以为自己在调 OpenAI——这就是为什么七个框架都能接 Qwen。
      </KeyIdea>

      <h2>一、七种接法对照表</h2>
      <p>
        同一个抓手，七个框架各有各的写法。下表是每个框架接百炼的关键代码，记住模式即可：
      </p>

      <table>
        <thead>
          <tr>
            <th>框架</th>
            <th>接百炼的关键写法</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>smolagents</td>
            <td><code>{'OpenAIServerModel(model_id="qwen-plus", api_base=..., api_key=...)'}</code></td>
          </tr>
          <tr>
            <td>OpenAI Agents SDK</td>
            <td><code>{'AsyncOpenAI(base_url=...)'}</code> + <code>{'set_default_openai_client(...)'}</code> + <code>{'set_default_openai_api("chat_completions")'}</code></td>
          </tr>
          <tr>
            <td>PydanticAI</td>
            <td><code>{'OpenAIChatModel("qwen-max", provider=OpenAIProvider(base_url=...))'}</code>（或用 <code>AlibabaProvider</code>）</td>
          </tr>
          <tr>
            <td>LangGraph</td>
            <td><code>{'ChatOpenAI(model="qwen-plus", base_url=...)'}</code></td>
          </tr>
          <tr>
            <td>CrewAI</td>
            <td><code>{'LLM(model="openai/qwen-plus", base_url=...)'}</code></td>
          </tr>
          <tr>
            <td>LlamaIndex</td>
            <td><code>{'OpenAILike(model="qwen-plus", api_base=..., is_chat_model=True)'}</code></td>
          </tr>
          <tr>
            <td>Spring AI</td>
            <td><code>application.yml</code> 里 <code>{'spring.ai.openai.base-url'}</code> 写到 compatible-mode 为止（不带 <code>/v1</code>）</td>
          </tr>
        </tbody>
      </table>

      <p>看出共性了吗？除了语法外壳不同，全都是「base_url + model + key」三件套。</p>

      <h2>二、统一经验 / 避坑清单</h2>
      <p>这是整门课踩过的坑，集中收齐，下次接国产模型直接照着对：</p>
      <ul>
        <li>
          <strong>端点统一</strong>：北京区用
          <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>；
          国际区换成 <code>dashscope-intl</code> 域名。
        </li>
        <li>
          <strong>OpenAI Agents SDK 必须切 chat_completions</strong>：它默认走 Responses API，
          第三方兼容端点不支持，必须 <code>{'set_default_openai_api("chat_completions")'}</code>，
          否则报错。
        </li>
        <li>
          <strong>LlamaIndex 的 OpenAILike 必须 <code>is_chat_model=True</code></strong>：
          否则会打到 completions（补全）端点而非 chat 端点，直接 404。
        </li>
        <li>
          <strong>Spring AI 的 base-url 不带 <code>/v1</code></strong>：框架内部会自动补 <code>/v1</code>，
          你再写一遍就拼成双 <code>/v1</code> → 404。写到 compatible-mode 为止。
        </li>
        <li>
          <strong>模型名前缀</strong>：CrewAI 等经 LiteLLM 中转的框架，模型名要带
          <code>openai/</code> 前缀（如 <code>openai/qwen-plus</code>），告诉 LiteLLM 走 OpenAI 兼容协议。
        </li>
        <li>
          <strong>Key 走环境变量</strong>：统一用 <code>DASHSCOPE_API_KEY</code>，
          别硬编码进代码、别提交进 git。
        </li>
      </ul>

      <CodeBlock lang="yaml" title="Spring AI 接百炼：base-url 不带 /v1">{springYml}</CodeBlock>

      <Callout variant="tip">
        最值钱的一条经验：<strong>把「换模型」收敛到一处配置</strong>（base_url + model + key），
        业务代码完全不感知模型是谁。做到这一点，你就能在国产模型（Qwen、DeepSeek、Kimi…）
        和海外模型（GPT、Claude…）之间自由切换——改一处配置，全系统跟着换。
      </Callout>

      <CodeBlock lang="python" title="把换模型收敛到三个变量">{unifiedConfig}</CodeBlock>

      <Example title="同一份业务代码，两套模型">
        <p>
          一个用 LangGraph 写的客服 Agent，开发时接百炼 Qwen（便宜、国内快），
          上线海外版时只改环境变量里的 base_url、model、key 指向海外端点——
          图结构、节点逻辑、工具定义一行不改。这就是「模型可换」的威力。
        </p>
      </Example>

      <h2>三、趋势：生态在往哪走</h2>

      <h3>1. 协议互操作成为通用层</h3>
      <p>
        <strong>MCP</strong>（Model Context Protocol，工具 / 资源的标准接口）和
        <strong>A2A</strong>（Agent-to-Agent，Agent 间通信协议）正在成为跨框架的通用层。
        多个框架已经支持——这意味着一个 MCP 工具可以同时被 smolagents、LangGraph、Spring AI 复用，
        Agent 之间也能跨框架通信。工具和 Agent 越来越「可移植」。
      </p>

      <h3>2. 框架在收敛</h3>
      <ul>
        <li>微软把 <strong>AutoGen + Semantic Kernel 合并为 Microsoft Agent Framework</strong>，统一企业级方案。</li>
        <li>LangGraph、LlamaIndex Workflows 等都推出了 <strong>1.0 稳定线</strong>，API 趋于稳定。</li>
        <li>整体看，生态正从「百花齐放」走向「<strong>少数成熟栈</strong>」——选型空间在收窄，对学习者是好事。</li>
      </ul>

      <h3>3. 「模型可换」成为标配</h3>
      <p>
        OpenAI 兼容端点 + LiteLLM 这套组合，让框架越来越<strong>模型无关</strong>。
        国产模型（Qwen 等）接入几乎零门槛——这正是本课能用百炼跑通全部七个框架的根本原因。
        未来「换模型」会像「换数据库驱动」一样平常。
      </p>

      <Callout variant="note">
        本课讲的核心是<strong>「原理与范式」</strong>，不是某个版本的 API 速记。
        框架的具体 API 会变、会过时，但范式是稳定的认知资产：
        代码行动、图编排、角色协作、数据驱动、类型安全、企业集成——
        理解了这六类范式，无论将来出什么新框架，你都能一眼看穿它属于哪一类、解决什么问题。
      </Callout>

      <h2>四、写在最后</h2>
      <p>
        走到这里，你已经不是「只会用某一个框架」的人了。你能看懂主流框架各自在做什么、
        会用每一个写出能跑的小 case、会按真实场景在七个里挑出最合适的那个、
        还会用一套统一的方法把它们接到国产模型上。这就是从「会用某一个」升级到「理解一类」——
        以后遇到任何新框架，你都有坐标系去定位它。配套代码都在
        <code>examples/agent-frameworks/</code> 下，随时回去翻、改、跑。这门课到此结束，但你的 Agent 之路才刚开始。
      </p>

      <Summary points={[
        '国产模型落地的统一抓手是 OpenAI 兼容端点：自定义 base_url + model + key，框架就能接 Qwen。',
        '七框架接法殊途同归，都是「base_url + model + key」三件套，只是语法外壳不同。',
        '核心避坑：Agents SDK 切 chat_completions；LlamaIndex OpenAILike 加 is_chat_model=True；Spring AI base-url 不带 /v1（防双 v1 404）；LiteLLM 系模型名加 openai/ 前缀；key 走环境变量。',
        '工程要点：把换模型收敛到一处配置，业务代码不感知模型，国产/海外自由切换。',
        '趋势：MCP/A2A 协议互操作成通用层；框架收敛为少数成熟栈；「模型可换」成标配。',
        '本课交付的是稳定的范式认知（代码行动/图编排/角色协作/数据驱动/类型安全/企业集成）——从「会用某一个」升级到「理解一类」。',
      ]} />
    </article>
  );
}
