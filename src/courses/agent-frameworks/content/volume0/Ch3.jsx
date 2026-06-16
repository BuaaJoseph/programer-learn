import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const SET_KEY = `export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const BARE_CALL = `import os

from openai import OpenAI

# 百炼 OpenAI 兼容端点（北京区）。国际区把 dashscope 换成 dashscope-intl。
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

const RUN_IT = `pip install openai
python bare_openai_compatible.py`

export default function Ch3() {
  return (
    <article>
      <h1>统一前提：用百炼(Qwen)作模型后端</h1>

      <Lead>
        这门课要讲七个框架，如果每个框架都换一个模型、换一套 key、换一个调用方式，那对比起来就乱成一锅粥了。
        所以我们先定一个规矩：全课统一用阿里云百炼（DashScope）上的 Qwen 作为模型后端。本章不讲任何框架，
        只把这个「底座」夯实——拿 key、记端点、选模型，再写一段完全不借助框架的「裸兼容调用」。
        把这一段吃透，后面每个框架你都会发现，它们无非是在这段调用外面套了层脚手架。
      </Lead>

      <h2>为什么统一用百炼 / Qwen</h2>

      <KeyIdea>
        几乎所有主流 Agent 框架都支持自定义 <code>base_url</code>，把模型调用指向任意一个「OpenAI 兼容端点」。
        既然如此，与其各选各的模型，不如挑一个国产、可直接注册就用的后端——这样七个框架站在同一条起跑线上，
        对比才公平，也更贴近国内团队真实的落地环境。百炼（DashScope）正好提供了 OpenAI 兼容端点，
        而 Qwen 是它上面的主力模型，能力与生态都成熟，是这个统一底座的理想人选。
      </KeyIdea>

      <p>
        说白了，本课关心的是「各个框架的范式与写法」，而不是「哪个模型更聪明」。固定后端，就把模型这个变量摁住了，
        你看到的每一处差异都来自框架本身，而不是模型不同带来的噪声。
      </p>

      <h2>准备工作：拿 key、设环境变量、记住端点</h2>

      <p>
        第一步，去阿里云百炼控制台注册并开通服务，创建一个 API Key（形如 <code>sk-</code> 开头的字符串）。
        拿到之后，最稳妥的用法是把它放进环境变量，让代码从环境里读，而不是硬编码：
      </p>

      <CodeBlock lang="bash" code={SET_KEY} />

      <p>
        第二步，记住端点和模型名。百炼的 OpenAI 兼容端点（北京区）是
        <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>；如果你在海外、需要走国际区，
        把其中的 <code>dashscope</code> 换成 <code>dashscope-intl</code> 即可。常用模型名有三个梯度：
        <code>qwen-plus</code>（均衡，日常首选）、<code>qwen-max</code>（最强，复杂推理）、
        <code>qwen-turbo</code>（最快最省，简单任务）。本课大多数示例默认用 <code>qwen-plus</code>。
      </p>

      <Callout variant="warn" title="key 是钱，别泄露">
        <p>
          API Key 直接关联你的账单。<strong>绝不要</strong>把 key 写进源码、也<strong>绝不要</strong>提交进 git。
          一律走环境变量（或 <code>.env</code> 文件，并把它加进 <code>.gitignore</code>）。一旦怀疑泄露，
          立刻去控制台吊销重建。
        </p>
      </Callout>

      <h2>裸兼容调用打底</h2>

      <p>
        现在写一段「不带任何框架」的最小调用，把整条链路跑通。它用的是官方 <code>openai</code> SDK，
        但通过 <code>base_url</code> 把请求指向百炼的兼容端点——这就是所有框架接百炼的本质做法：
      </p>

      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/00-intro/bare_openai_compatible.py"
        code={BARE_CALL}
      />

      <p>逐行看清楚它在干什么：</p>
      <ul>
        <li>
          <code>from openai import OpenAI</code>：用的是 OpenAI 官方 SDK，
          百炼提供的是「兼容接口」，所以客户端代码与连真正的 OpenAI 完全一样，只是端点不同。
        </li>
        <li>
          <code>BASE_URL = "...compatible-mode/v1"</code>：把请求指向百炼兼容端点。
          这一行就是整段代码的「灵魂」——换掉它，就换了后端。
        </li>
        <li>
          <code>OpenAI(api_key=..., base_url=BASE_URL)</code>：key 从环境变量读出，端点显式指定。
        </li>
        <li>
          <code>client.chat.completions.create(model="qwen-plus", messages=[...])</code>：
          标准的 chat completions 调用，<code>messages</code> 是 system / user 两条消息。
        </li>
        <li>
          <code>resp.choices[0].message.content</code>：模型的回答就在这里取。
        </li>
        <li>
          <code>resp.usage.prompt_tokens</code> 与 <code>resp.usage.completion_tokens</code>：
          本次调用的输入 / 输出 token 用量。<strong>各框架的成本统计，归根结底都来自这个 usage 字段</strong>。
        </li>
      </ul>

      <p>跑起来也只有两步：</p>

      <CodeBlock lang="bash" code={RUN_IT} />

      <h2>这段「裸调用」与框架的关系</h2>

      <KeyIdea>
        无论后面哪个框架，最终落到模型上的，都是这种 <code>chat.completions</code> 调用。
        框架做的事情，是在这一行调用<strong>外面</strong>包一层：工具循环（让模型反复「思考-调用工具-再思考」）、
        多 Agent 协作、状态与记忆、RAG 检索……理解了这个底座，你再看任何框架，问题都会变成同一个——
        「它在这层调用外面，到底加了什么？」答案清楚了，框架也就不神秘了。
      </KeyIdea>

      <h2>各框架怎么接同一个百炼</h2>

      <p>
        下面把七个框架接百炼的关键写法先列出来，让你心里有个数。现在不必看懂细节，
        每条都会在对应的卷里展开——你只需要确认一件事：它们接的都是同一个端点、同一个 Qwen。
      </p>

      <Example title="七种接法，一个后端">
        <ul>
          <li>
            <strong>smolagents</strong>：
            <code>OpenAIServerModel(model_id="qwen-plus", api_base=..., api_key=...)</code>
          </li>
          <li>
            <strong>OpenAI Agents SDK</strong>：
            <code>AsyncOpenAI(base_url=...)</code> 配合
            <code>set_default_openai_client(...)</code> 和
            <code>set_default_openai_api("chat_completions")</code>
          </li>
          <li>
            <strong>PydanticAI</strong>：
            <code>OpenAIChatModel("qwen-max", provider=OpenAIProvider(base_url=...))</code>
          </li>
          <li>
            <strong>LangGraph</strong>：
            <code>ChatOpenAI(base_url=..., model="qwen-plus")</code>
          </li>
          <li>
            <strong>CrewAI</strong>：
            <code>LLM(model="openai/qwen-plus", base_url=...)</code>
          </li>
          <li>
            <strong>LlamaIndex</strong>：
            <code>OpenAILike(model="qwen-plus", api_base=..., is_chat_model=True)</code>
          </li>
          <li>
            <strong>Spring AI</strong>：在 <code>application.yml</code> 里配
            <code>spring.ai.openai.base-url</code>（注意只写到 <code>compatible-mode</code> 为止、
            <strong>不带 /v1</strong>）
          </li>
        </ul>
      </Example>

      <Callout variant="note" title="经兼容层接入时，留意 provider 前缀">
        <p>
          像 CrewAI 这类经 LiteLLM / 兼容层路由的框架，模型名往往要带 provider 前缀
          （例如 <code>openai/qwen-plus</code>），不同版本的写法偶有出入。建议拿到真实 key 后，
          照对应章节先自测一次跑通再继续——课程会在相关章节明确标注当时验证过的写法。
        </p>
      </Callout>

      <Callout variant="tip" title="配套代码在哪">
        <p>
          本课的可运行示例放在 <code>examples/agent-frameworks/</code> 下，每个框架一个目录。
          本章这段裸调用在 <code>00-intro/</code> 里（即上面 <code>bare_openai_compatible.py</code>）。
          之后每一章都会有对应目录，clone 下来照着跑即可。
        </p>
      </Callout>

      <Summary
        points={[
          '全课统一用百炼(DashScope)的 OpenAI 兼容端点跑 Qwen，把「模型」这个变量摁住，让七个框架的对比只反映框架本身的差异。',
          '准备三件事：注册百炼拿 key 并设进环境变量 DASHSCOPE_API_KEY；记住端点 compatible-mode/v1（国际区用 dashscope-intl）；模型名 qwen-plus / qwen-max / qwen-turbo。',
          'key 绝不写进代码、绝不提交 git，一律走环境变量。',
          '裸兼容调用是底座：用 openai SDK + 自定义 base_url 调 chat.completions，回答取自 choices[0].message.content，token 用量在 usage 里——框架的成本统计都来自这里。',
          '所有框架最终都落到这种 chat.completions 调用上，区别只在外面包的工具循环/多Agent/状态/RAG；理解底座后，看每个框架都只剩一个问题：它在外面加了什么。',
          '七个框架接同一个百炼的写法已先行预告，细节在各卷展开；经 LiteLLM/兼容层接入时注意 provider 前缀，建议用真实 key 自测一次。',
        ]}
      />
    </article>
  )
}
