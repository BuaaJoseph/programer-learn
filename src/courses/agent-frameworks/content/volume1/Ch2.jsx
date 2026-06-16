import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installSnippet = `# 安装核心库；[toolkit] 带上常用工具（如 WebSearchTool）
pip install "smolagents[toolkit]"

# 接百炼用的是 OpenAI 兼容端点，OpenAIServerModel 走 openai 客户端
pip install openai

# 把百炼的 API Key 放进环境变量（不要硬编码进代码）
export DASHSCOPE_API_KEY="sk-你的密钥"`

const mainSnippet = `import os

from smolagents import CodeAgent, OpenAIServerModel

model = OpenAIServerModel(
    model_id="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

agent = CodeAgent(tools=[], model=model, additional_authorized_imports=["math"])


def main() -> None:
    task = (
        "斐波那契数列的前 30 项里，哪些是质数？"
        "请列出这些质数，求它们的和，并判断这个和本身是不是质数。"
    )
    answer = agent.run(task)
    print("=== 最终答案 ===")
    print(answer)


if __name__ == "__main__":
    main()`

const modelThinksSnippet = `# 模型在某一步可能写出类似这样的一段 Python（由执行器运行）
import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for d in range(2, int(math.isqrt(n)) + 1):
        if n % d == 0:
            return False
    return True

# 生成斐波那契前 30 项
fib = [0, 1]
for _ in range(28):
    fib.append(fib[-1] + fib[-2])

primes = [x for x in fib if is_prime(x)]
total = sum(primes)
print(primes, total, is_prime(total))   # 这行 print 会成为「观察」回到模型`

const finalAnswerSnippet = `# 看完观察后，模型在下一步直接收尾
final_answer(
    f"质数: {primes}; 它们的和: {total}; 和是否为质数: {is_prime(total)}"
)`

const toolVariantSnippet = `import os

from smolagents import CodeAgent, OpenAIServerModel, tool


@tool
def get_exchange_rate(base: str, quote: str) -> float:
    """查询 base 兑 quote 的实时汇率（演示，返回写死值）。

    Args:
        base: 源货币代码，例如 "USD"。
        quote: 目标货币代码，例如 "CNY"。
    """
    rates = {("USD", "CNY"): 7.18, ("EUR", "CNY"): 7.85}
    return rates[(base, quote)]


model = OpenAIServerModel(
    model_id="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

# 把工具注册进 Agent；模型就能在生成的代码里直接 call 它
agent = CodeAgent(tools=[get_exchange_rate], model=model)

task = "我有 1200 美元和 800 欧元，全部换成人民币一共是多少？请给出总额。"
print(agent.run(task))`

const e2bSnippet = `# 进阶 1：把代码丢进远程隔离沙箱执行（生产更安全）
agent = CodeAgent(tools=[], model=model, executor_type="e2b")    # e2b 云沙箱
agent = CodeAgent(tools=[], model=model, executor_type="docker") # 本地 docker

# 进阶 2：加一个内置联网搜索工具
from smolagents import WebSearchTool
agent = CodeAgent(tools=[WebSearchTool()], model=model)

# 进阶 3：换成 JSON 工具调用范式做对比（同一套 tools/model）
from smolagents import ToolCallingAgent
agent = ToolCallingAgent(tools=[get_exchange_rate], model=model)`

const liteLLMSnippet = `# 另一种接百炼的写法：用 LiteLLMModel，model_id 带上 dashscope/ 前缀
from smolagents import LiteLLMModel

model = LiteLLMModel(
    model_id="dashscope/qwen-plus",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，这一章我们动手。目标：用 <code>OpenAIServerModel</code> 把 smolagents 接到
        阿里云百炼的 Qwen 模型上，让一个 <code>CodeAgent</code> 跑通一道真实的多步数学题，
        再扩展到「带自定义工具」的版本，最后把常见报错与进阶用法一并讲清。
      </Lead>

      <h2>一、安装与环境准备</h2>
      <p>
        百炼提供 OpenAI 兼容端点，所以我们用 smolagents 的 <code>OpenAIServerModel</code>（底层是
        <code>openai</code> 客户端）。先装依赖、配好密钥：
      </p>
      <CodeBlock lang="bash" title="安装与环境变量" code={installSnippet} />
      <Callout variant="tip">
        密钥用环境变量 <code>DASHSCOPE_API_KEY</code> 注入，代码里只写
        <code>{'os.environ["DASHSCOPE_API_KEY"]'}</code>，千万别把 <code>sk-</code> 开头的明文提交进仓库。
      </Callout>

      <h2>二、完整示例：让 Agent 解一道多步题</h2>
      <p>这是本章的主例，一字不差可直接运行：</p>
      <CodeBlock lang="python" title="fib_primes.py — CodeAgent 接百炼 Qwen" code={mainSnippet} />

      <h2>三、逐段拆解</h2>
      <ul>
        <li>
          <code>OpenAIServerModel(...)</code>：构造模型客户端。<code>model_id="qwen-plus"</code> 选百炼模型；
          <code>api_base</code> 指向百炼的 OpenAI <strong>兼容</strong>端点
          （注意结尾的 <code>/compatible-mode/v1</code>）；<code>api_key</code> 从环境变量读。
        </li>
        <li>
          <code>{'CodeAgent(tools=[], model=model, ...)'}</code>：构造 Agent。这道题不需要外部工具，
          所以 <code>{'tools=[]'}</code>；关键在 <code>{'additional_authorized_imports=["math"]'}</code>——
          放行 <code>math</code>，否则模型写的代码里 <code>import math</code> 会被本地白名单拦下。
        </li>
        <li>
          <code>task</code>：一句中文自然语言任务，含三个子目标（找质数、求和、判断和是否为质数）——
          典型的多步推理 + 计算，正好展示代码行动的威力。
        </li>
        <li>
          <code>agent.run(task)</code>：启动 think→act→observe 循环，返回模型调用
          <code>final_answer(...)</code> 时给出的最终答案。
        </li>
      </ul>

      <h2>四、它内部大致会怎么跑</h2>
      <p>
        你只写了一句中文任务，但 <code>agent.run</code> 内部经历了若干轮。模型不会「心算」，
        而是<strong>写一段 Python 让执行器替它算</strong>。某一步它很可能生成类似这样的代码：
      </p>
      <CodeBlock lang="python" title="模型某一步可能写出的代码" code={modelThinksSnippet} />
      <Example title="一轮 think→act→observe 是这样的">
        <p>
          <strong>think</strong>：模型判断「需要先生成斐波那契、再写质数判断、再筛选求和」，于是写出上面那段代码。
        </p>
        <p>
          <strong>act</strong>：执行器运行它，<code>{'print(primes, total, is_prime(total))'}</code> 的输出被捕获。
        </p>
        <p>
          <strong>observe</strong>：输出（质数列表、和、和是否为质数）作为「观察」回到模型上下文。
        </p>
        <p>
          <strong>收尾</strong>：模型确认结果无误，下一步直接调用 <code>final_answer(...)</code> 收束：
        </p>
        <CodeBlock lang="python" title="收尾那一步" code={finalAnswerSnippet} />
      </Example>
      <KeyIdea>
        注意：循环、列表推导、辅助函数、求和、二次判断——这些<strong>全在一段代码里完成</strong>，
        没有为每个子步骤单独发一次 LLM 调用。这就是上一章说的「代码行动省步数」在真实题目里的样子。
      </KeyIdea>

      <h2>五、变体示例：加一个自定义工具</h2>
      <p>
        主例没用工具。现在加一个 <code>@tool</code> 定义的 <code>get_exchange_rate</code>，
        看代码行动如何<strong>把工具输出直接喂给后续计算</strong>：模型在一段代码里调用工具拿到汇率，
        再用拿到的数字做乘法和求和，一气呵成。
      </p>
      <CodeBlock lang="python" title="带自定义工具的 CodeAgent" code={toolVariantSnippet} />
      <p>
        模型很可能写出
        <code>{'usd = get_exchange_rate("USD", "CNY")'}</code> 与
        <code>{'eur = get_exchange_rate("EUR", "CNY")'}</code>，
        然后 <code>{'total = 1200 * usd + 800 * eur'}</code>，最后 <code>final_answer(total)</code>。
        工具调用结果直接进入同一段代码的变量，无需多轮往返——这正是 code-as-action 的核心优势。
      </p>

      <h2>六、常见报错与调试</h2>
      <ul>
        <li>
          <strong>api_base 写错</strong>：漏掉 <code>/compatible-mode/v1</code> 或写成普通 dashscope 域名，
          会得到 404 / 认证失败。百炼兼容端点必须是
          <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>。
        </li>
        <li>
          <strong>本地执行被白名单拦</strong>：报类似「import of X is not allowed」。
          把需要的模块加进 <code>{'additional_authorized_imports'}</code>（如 <code>{'["math", "statistics"]'}</code>）。
          主例正是为此放行了 <code>math</code>。
        </li>
        <li>
          <strong>模型不支持工具 / 函数调用</strong>：用 <code>ToolCallingAgent</code> 时若所选模型不支持
          function-calling 会失败；<code>CodeAgent</code> 不依赖原生工具调用接口，对这类模型更友好。
        </li>
        <li>
          <strong>OpenAIServerModel 别名问题</strong>：它与 <code>OpenAIModel</code> 等价；
          canonical 的参数名是 <code>api_base</code>（不是 <code>base_url</code>），传错参数名会被忽略或报错。
        </li>
        <li>
          <strong>密钥未设置</strong>：<code>{'os.environ["DASHSCOPE_API_KEY"]'}</code> 会抛 <code>KeyError</code>——
          先确认 <code>export</code> 过、或在同一个 shell 会话里运行。
        </li>
        <li>
          <strong>步数耗尽</strong>：复杂任务可能撞到默认 <code>max_steps</code>。适当调大，
          或把目标在任务描述里拆得更清楚，减少模型试错。
        </li>
      </ul>

      <h2>七、进阶用法</h2>
      <p>跑通基础版后，下面几个方向值得继续探索：</p>
      <CodeBlock lang="python" title="沙箱 / 联网 / 范式切换" code={e2bSnippet} />
      <ul>
        <li>
          <strong>远程沙箱</strong>：<code>executor_type="e2b"</code> 或 <code>"docker"</code>，
          把模型写的代码丢进隔离环境跑，生产环境强烈建议。
        </li>
        <li>
          <strong>联网搜索</strong>：<code>WebSearchTool()</code> 让 Agent 能查实时信息，
          配合 code-as-action 可「搜到→解析→计算」一条龙。
        </li>
        <li>
          <strong>范式对比</strong>：把 <code>CodeAgent</code> 换成 <code>ToolCallingAgent</code>
          （tools/model 不变），亲手感受 JSON 工具调用与代码行动在步数、可读性上的差异。
        </li>
      </ul>
      <p>另外，接百炼也可以不用 OpenAIServerModel，而走 LiteLLM 路由：</p>
      <CodeBlock lang="python" title="用 LiteLLMModel 接百炼" code={liteLLMSnippet} />

      <Summary
        points={[
          '装 smolagents[toolkit] 与 openai，把密钥放进 DASHSCOPE_API_KEY 环境变量。',
          'OpenAIServerModel 用 api_base 指向百炼的 /compatible-mode/v1 端点接 qwen-plus；canonical 参数是 api_base，别名 OpenAIModel。',
          'CodeAgent(tools=[], additional_authorized_imports=["math"]) 解多步题：模型把循环/质数判断/求和写进一段 Python 由执行器运行，再 final_answer 收尾。',
          '加 @tool 自定义工具（如 get_exchange_rate）后，模型能在一段代码里调用工具并把输出直接喂给后续计算——code-as-action 的核心优势。',
          '常见坑：api_base 漏 /compatible-mode/v1、模块未加白名单被拦、模型不支持工具调用、参数名应为 api_base、密钥未设置、max_steps 耗尽。',
          '进阶：executor_type=e2b/docker 远程沙箱、WebSearchTool 联网、ToolCallingAgent 做范式对比、LiteLLMModel(dashscope/qwen-plus) 另一种接法。',
        ]}
      />
    </article>
  )
}
