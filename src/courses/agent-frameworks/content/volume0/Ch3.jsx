import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const bareCode = `import os

from openai import OpenAI

BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

client = OpenAI(api_key=os.environ["DASHSCOPE_API_KEY"], base_url=BASE_URL)


def main() -> None:
    resp = client.chat.completions.create(
        model="qwen-plus",
        messages=[
            {"role": "system", "content": "你是一个简洁的中文助手。"},
            {"role": "user", "content": "用一句话说明 Agent 框架解决了什么问题。"},
        ],
    )
    print(resp.choices[0].message.content)
    print("tokens:", resp.usage.prompt_tokens, "+", resp.usage.completion_tokens)


if __name__ == "__main__":
    main()`

const exportKeyCode = `# 从百炼控制台拿到 API Key 后，导出环境变量（不要写进代码！）
export DASHSCOPE_API_KEY="sk-你的真实key"

# 验证（Linux / macOS）
echo $DASHSCOPE_API_KEY`

export default function Ch3() {
  return (
    <article>
      <Lead>
        要公平地横向对比七个框架，必须先钉死一个变量：<strong>底层模型</strong>。本课全程用阿里云百炼（Qwen）作模型后端，
        靠的是它兼容 OpenAI 的接口。这一章把这个统一前提讲透——为什么选百炼、什么是"OpenAI 兼容端点"、怎么准备、
        以及所有框架最终都会落到同一行 <code>chat.completions</code> 调用上。
      </Lead>

      <h2>一、为什么统一用百炼 / Qwen</h2>
      <p>把后端固定下来，对比才有意义。选阿里云百炼（Qwen）有三个实在理由：</p>
      <ul>
        <li><strong>OpenAI 兼容</strong>：百炼提供 OpenAI 兼容端点，绝大多数框架都能用"换 base_url + 换 model 名"的方式直接接入，改动极小。</li>
        <li><strong>国产可直接用</strong>：国内网络直连、注册即用、计费透明，不需要折腾代理就能跑通本课所有示例。</li>
        <li><strong>公平对比</strong>：所有框架共用同一个模型、同一个端点，框架之间的差异才能真正归因到"框架本身"，而不是模型强弱。</li>
      </ul>
      <KeyIdea title="控制变量">
        本课比的是"框架的工程能力与风格"，不是"模型谁更聪明"。所以模型这一项必须锁死——这就是统一用百炼的全部出发点。
      </KeyIdea>

      <h2>二、什么是"OpenAI 兼容端点"</h2>
      <p>
        OpenAI 的 <strong>Chat Completions</strong> 接口（<code>/v1/chat/completions</code>，请求体里有 messages、model、tools 等字段）
        已经成为业界<strong>事实标准</strong>。于是各家模型服务（包括百炼）都额外提供一套"长得和 OpenAI 一模一样"的端点。
      </p>
      <p>
        这就是为什么这么多框架都允许你设置<strong>自定义 <code>base_url</code></strong>：只要把请求地址从 OpenAI 换成百炼的兼容地址、
        把 model 名换成 <code>qwen-plus</code>，同一套客户端代码就能无缝改用 Qwen。框架们也正是借这一点，才能"一份代码、任意后端"。
      </p>

      <h2>三、准备工作</h2>
      <ul>
        <li><strong>拿 Key</strong>：登录阿里云百炼控制台，开通服务并创建 API Key。</li>
        <li><strong>设置环境变量</strong>：把 Key 导出为 <code>DASHSCOPE_API_KEY</code>，代码里只读环境变量，绝不硬编码。</li>
        <li><strong>端点 / 区域</strong>：OpenAI 兼容地址为 <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>（注意结尾带 <code>/v1</code>）。</li>
        <li>
          <strong>常用模型名</strong>：<code>qwen-plus</code>（均衡，推荐默认）、<code>qwen-max</code>（最强、最贵）、
          <code>qwen-turbo</code>（最快、最省）。
        </li>
      </ul>
      <CodeBlock lang="bash" title="导出 API Key" code={exportKeyCode} />
      <Callout variant="warn" title="千万别提交 Key">
        <strong>永远不要</strong>把 API Key 写进源码或提交到 Git。用环境变量读取（<code>os.environ["DASHSCOPE_API_KEY"]</code>），
        并把 <code>.env</code> 加进 <code>.gitignore</code>。一旦泄露，立刻去控制台吊销并重建。
      </Callout>

      <h2>四、裸调用打底：一段最小完整代码</h2>
      <p>
        在碰任何框架之前，先把"不依赖框架、纯 SDK 直连百炼"的调用跑通。这段代码是本课所有示例的地基：
      </p>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/00-intro/bare_openai_compatible.py"
        code={bareCode}
      />

      <h2>五、逐行讲解</h2>
      <ul>
        <li><code>BASE_URL</code>：百炼的 OpenAI 兼容端点，结尾的 <code>/v1</code> 不能少——它就是"换后端"的开关。</li>
        <li><code>client = OpenAI(api_key=..., base_url=BASE_URL)</code>：用官方 openai SDK，但把请求指向百炼；api_key 从环境变量读取。</li>
        <li><code>model="qwen-plus"</code>：指定 Qwen 模型；想更强换 <code>qwen-max</code>，想更快换 <code>qwen-turbo</code>。</li>
        <li>
          <code>messages=[...]</code>：标准的角色化对话——<code>system</code> 设定人设与约束，<code>user</code> 是用户输入；这正是 Chat Completions 的核心结构。
        </li>
        <li><code>resp.choices[0].message.content</code>：取出模型回复文本。<code>choices</code> 是个列表（可要求多条候选），通常取第 0 条。</li>
        <li><code>resp.usage.prompt_tokens / completion_tokens</code>：本次调用的输入 / 输出 token 数，用来估算成本与监控用量。</li>
      </ul>

      <h2>六、这段代码与框架的关系</h2>
      <p>
        无论后面用 smolagents、LangGraph 还是 Spring AI，<strong>它们最终都会落到这种 <code>chat.completions</code> 调用上</strong>。
        框架做的是在它外面包一圈：自动拼 messages、生成 tools 的 Schema、解析 tool_calls、跑循环、管理状态。
        但最底下那一次"发 messages、收 message"的请求，本质和这段裸代码一模一样。
      </p>
      <Callout variant="tip" title="先懂底座，再看抽象">
        把这段裸调用吃透，后面读任何框架的 tracing / 日志时，你都能一眼认出"哦，它这一步其实就是在调 chat.completions"。
        这会让框架的黑盒瞬间变透明。
      </Callout>

      <h2>七、七框架接百炼的写法预告</h2>
      <p>下面是每个框架接百炼后端的关键写法与关键类，细节在各自章节展开，这里先建立全局印象：</p>
      <table>
        <thead>
          <tr><th>框架</th><th>关键写法</th></tr>
        </thead>
        <tbody>
          <tr><td>smolagents</td><td><code>OpenAIServerModel(model_id="qwen-plus", api_base=BASE_URL, api_key=...)</code></td></tr>
          <tr><td>OpenAI Agents SDK</td><td>用 <code>AsyncOpenAI</code> 自定义 client + <code>OpenAIChatCompletionsModel</code>（须切到 chat_completions）</td></tr>
          <tr><td>PydanticAI</td><td><code>OpenAIModel("qwen-plus", provider=OpenAIProvider(base_url=BASE_URL, api_key=...))</code></td></tr>
          <tr><td>LangGraph</td><td>底层用 <code>ChatOpenAI(model="qwen-plus", base_url=BASE_URL, api_key=...)</code></td></tr>
          <tr><td>CrewAI</td><td><code>LLM(model="openai/qwen-plus", base_url=BASE_URL, api_key=...)</code>（经 LiteLLM）</td></tr>
          <tr><td>LlamaIndex</td><td><code>OpenAILike(model="qwen-plus", api_base=BASE_URL, is_chat_model=True)</code></td></tr>
          <tr><td>Spring AI</td><td>配置 <code>spring.ai.openai.base-url</code> + <code>api-key</code> + <code>chat.options.model</code></td></tr>
        </tbody>
      </table>

      <h2>八、易踩坑预告</h2>
      <Example title="几个一踩一个准的坑">
        <ul>
          <li><strong>OpenAI Agents SDK</strong>：默认走 Responses API，百炼不支持，必须显式切到 <strong>chat_completions</strong> 模型。</li>
          <li><strong>LlamaIndex</strong>：用 <code>OpenAILike</code> 时记得设 <code>is_chat_model=True</code>，否则会当成补全模型调错接口。</li>
          <li><strong>Spring AI</strong>：<code>base-url</code> 填到 <code>compatible-mode</code> 即可，<strong>不要带 <code>/v1</code></strong>（Spring AI 会自动补路径），多写一段反而 404。</li>
          <li><strong>CrewAI / LiteLLM</strong>：model 名要带 <code>openai/</code> 前缀（如 <code>openai/qwen-plus</code>），LiteLLM 靠前缀识别这是 OpenAI 兼容协议。</li>
        </ul>
      </Example>

      <Summary points={[
        '全程统一用百炼(Qwen)作后端：OpenAI 兼容、国产可直接用、能公平对比框架本身。',
        'OpenAI Chat Completions 已是事实标准，各框架都支持自定义 base_url，所以一份代码可任意切后端。',
        '准备：百炼控制台拿 Key → export DASHSCOPE_API_KEY → 端点结尾带 /v1 → 模型用 qwen-plus/max/turbo；Key 绝不入库。',
        '裸调用打底要会逐行读：base_url 是换后端开关，model 选 Qwen，messages 角色化，choices[0].message.content 取回复，usage 看 token。',
        '所有框架最终都落到 chat.completions；接百炼各有关键类与坑：Agents SDK 切 chat_completions、LlamaIndex 设 is_chat_model、Spring AI base-url 不带 /v1、LiteLLM 加 openai/ 前缀。',
      ]} />
    </article>
  )
}
