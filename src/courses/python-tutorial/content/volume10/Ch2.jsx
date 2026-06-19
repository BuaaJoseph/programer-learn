import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const reactIdea = `# ReAct 循环的核心思想（伪代码）
while 任务没完成:
    回复 = 问模型(messages)          # Reason：模型思考下一步
    if 模型要调工具:
        结果 = 执行工具(...)          # Act：真正执行
        把结果喂回 messages          # Observation：观察
    else:
        return 模型的最终答案         # 模型不再需要工具，收尾`

const tools = `import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# === 1. 准备几个工具 ===
def get_weather(city: str) -> str:
    db = {"杭州": "晴 26℃", "北京": "多云 22℃", "广州": "雷阵雨 30℃"}
    return db.get(city, f"暂无 {city} 数据")

def calculator(expression: str) -> str:
    try:
        return str(eval(expression))       # 演示用，真实项目别直接 eval
    except Exception as e:
        return f"计算出错：{e}"

available = {"get_weather": get_weather, "calculator": calculator}

# === 2. 用 JSON schema 描述工具 ===
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询某城市当前天气",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "城市名"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "计算一个数学表达式，如 23*19",
            "parameters": {
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
        },
    },
]`

const reactLoop = `# === 3. 手写一个最小 ReAct 循环 ===
def run_agent(question: str, max_steps: int = 6) -> str:
    messages = [
        {"role": "system", "content": "你是个能用工具的助手，需要时调用工具，最后用中文作答。"},
        {"role": "user", "content": question},
    ]

    for step in range(max_steps):                       # 护栏：最多循环几步
        resp = client.chat.completions.create(
            model="qwen-plus", messages=messages, tools=tools,
        )
        msg = resp.choices[0].message

        # 模型不再需要工具 -> 给出最终答案，结束循环
        if not msg.tool_calls:
            return msg.content

        # 模型要调工具：逐个执行，把结果喂回
        messages.append(msg)
        for call in msg.tool_calls:
            func = available[call.function.name]
            args = json.loads(call.function.arguments)
            result = func(**args)
            print(f"  [第 {step + 1} 步] 调用 {call.function.name}({args}) -> {result}")
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

    return "达到最大步数仍未完成。"

if __name__ == "__main__":
    print(run_agent("杭州天气怎么样？再帮我算一下 128 乘以 36 是多少。"))`

const reactLoopResult = `  [第 1 步] 调用 get_weather({'city': '杭州'}) -> 晴 26℃
  [第 1 步] 调用 calculator({'expression': '128*36'}) -> 4608
杭州现在是晴天，气温 26℃；128 乘以 36 等于 4608。`

const installSmol = `# 安装 smolagents 和 openai
pip install "smolagents[toolkit]" openai

# 配好百炼密钥
export DASHSCOPE_API_KEY="sk-你的密钥"`

const smolAgent = `import os
from smolagents import CodeAgent, OpenAIServerModel, tool

# 把百炼接成一个模型对象（OpenAI 兼容端点）
model = OpenAIServerModel(
    model_id="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

# 用 @tool 装饰器定义工具，比手写 JSON schema 省事得多
@tool
def get_weather(city: str) -> str:
    """查询某城市当前天气。

    Args:
        city: 城市名，例如 杭州。
    """
    db = {"杭州": "晴 26℃", "北京": "多云 22℃", "广州": "雷阵雨 30℃"}
    return db.get(city, f"暂无 {city} 数据")

# 几行就搭好一个带工具的 Agent；计算交给它写代码完成
agent = CodeAgent(
    tools=[get_weather],
    model=model,
    additional_authorized_imports=["math"],
)

result = agent.run("杭州天气怎么样？再帮我算一下 128 乘以 36。")
print(result)`

const smolResult = `杭州现在是晴天，26℃；128 乘以 36 等于 4608。`

const compareNote = `# 对比：同一件事
# 手写版：自己管 messages、自己解析 tool_calls、自己写循环和护栏
# smolagents：@tool 定义工具 + CodeAgent(...).run(...)，循环 / 解析 / 护栏框架全包了`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们手动完成了"一轮"工具调用。但真实任务常常要<strong>反复多轮</strong>：
        调工具、看结果、再决定下一步，直到完成。这一章先<strong>亲手写一个最小的
        ReAct 循环</strong>，把这个"自动多步"的过程彻底搞懂；再用 <strong>smolagents</strong>
        框架几行代码搭出同样的 Agent，感受框架替你省了多少事；最后指路《Agent 框架》课。
      </Lead>

      <h2>一、从一轮到多轮：ReAct 循环</h2>
      <p>
        上一章是"问一次、调一次工具、再问一次"。但如果任务需要先查天气、再根据天气算点东西、
        还要查个别的呢？这就需要一个<strong>循环</strong>：模型每一步要么调工具，要么给最终答案，
        程序不断地"问模型 → 执行 → 喂回"，直到模型说"我答完了"。
      </p>
      <p>
        这个"思考(Reason) → 行动(Act) → 观察(Observation)"反复进行的模式，就是经典的
        <strong>ReAct</strong>。
      </p>
      <CodeBlock lang="python" title="ReAct 循环的核心思想" code={reactIdea} />
      <KeyIdea>
        Agent 的灵魂就是这个循环：<strong>问模型 → 若要调工具则执行 → 把观察结果喂回 → 再问模型</strong>，
        如此往复，直到模型不再请求工具、直接给出最终答案。
      </KeyIdea>

      <h2>二、手写一个最小 Agent</h2>
      <p>我们在上一章的基础上，把"两次请求"升级成一个真正的循环。先准备工具：</p>
      <CodeBlock lang="python" title="第 1-2 部分：工具与描述" code={tools} />
      <p>这次准备了两个工具（查天气、计算器），这样任务就能涉及多步。再写循环主体：</p>
      <CodeBlock lang="python" title="第 3 部分：ReAct 循环" code={reactLoop} />
      <CodeBlock lang="text" title="运行结果" code={reactLoopResult} />
      <Example title="这个循环里发生了什么">
        <ul>
          <li>每一轮都把 <code>tools</code> 发给模型，让它决定"调工具还是收尾"。</li>
          <li>模型一次可能要调<strong>多个</strong>工具（如同时查天气 + 计算），所以用 <code>for</code> 遍历 <code>tool_calls</code> 逐个执行。</li>
          <li>每个工具结果都以 <code>role=tool</code> 喂回，模型下一轮就能看到。</li>
          <li><code>max_steps</code> 是<strong>护栏</strong>：万一模型陷入"反复调工具"的死循环，到了上限强制停止，避免无限烧钱。</li>
        </ul>
      </Example>
      <Callout variant="warn" title="务必加护栏">
        Agent 是自主循环的，没有 <code>max_steps</code> 这样的上限，一旦模型卡住，
        程序会无限请求 API，账单会很难看。任何真实 Agent 都要有步数 / 时间上限。
      </Callout>
      <Callout variant="note" title="关于 eval">
        例子里的 <code>calculator</code> 用了 <code>eval</code> 只为演示方便。真实项目中
        <code>eval</code> 会执行任意代码，<strong>有安全风险</strong>，应换成安全的表达式解析方案。
      </Callout>

      <h2>三、用 smolagents 几行搭一个 Agent</h2>
      <p>
        手写循环让你理解了原理，但每次都自己管 messages、解析 <code>tool_calls</code>、
        写循环和护栏，太繁琐。<strong>Agent 框架</strong>就是来替你做这些脏活的。
        我们用 Hugging Face 的 <code>smolagents</code> 演示，依旧接百炼。
      </p>
      <CodeBlock lang="bash" title="安装与配置" code={installSmol} />
      <CodeBlock lang="python" title="用 smolagents 搭 Agent" code={smolAgent} />
      <CodeBlock lang="text" title="运行结果" code={smolResult} />
      <Example title="框架帮你省了什么">
        <ul>
          <li><strong>工具定义</strong>：一个 <code>@tool</code> 装饰器搞定，函数的文档字符串自动变成给模型的说明，不用手写 JSON schema。</li>
          <li><strong>循环 / 解析 / 护栏</strong>：全藏在 <code>agent.run()</code> 里，你不用碰 messages，也不用自己解析 tool_calls。</li>
          <li><strong>模型无关</strong>：<code>OpenAIServerModel</code> 把 <code>api_base</code> 指向百炼即可，换后端只改这一处。</li>
          <li><strong>计算</strong>：CodeAgent 会自己写 Python 算 128×36，连计算器工具都不用单独提供。</li>
        </ul>
      </Example>
      <CodeBlock lang="python" title="手写 vs 框架，对比" code={compareNote} />
      <KeyIdea>
        框架不是魔法。<code>agent.run()</code> 内部做的，正是你刚刚手写的那个 ReAct 循环——
        问模型、执行工具、喂回观察、循环到收尾。理解了手写版，你就理解了所有 Agent 框架的本质。
      </KeyIdea>

      <Callout variant="tip" title="smolagents 接百炼的关键点">
        参数名是 <code>api_base</code>（不是 <code>base_url</code>），值要带
        <code>/compatible-mode/v1</code>；密钥用环境变量 <code>DASHSCOPE_API_KEY</code>。
        模型在生成代码里要 <code>import math</code> 等，需在 <code>additional_authorized_imports</code> 放行。
      </Callout>

      <Practice title="练一练">
        给 smolagents 版本再加一个 <code>@tool</code> 工具，比如
        <code>get_population(city: str)</code> 返回写死的城市人口，
        然后让 Agent 回答"杭州的人口比北京多还是少？"，观察它如何<strong>多步</strong>使用工具。
      </Practice>

      <h2>四、下一步：去学《Agent 框架》课</h2>
      <p>
        到这里，你已经走完了从"裸调大模型"到"手写 Agent 循环"再到"用框架搭 Agent"的完整路径。
        恭喜——你已经具备了开发 Agent 应用的全部基础知识！
      </p>
      <p>
        真实世界的 Agent 远不止一个循环：多 Agent 协作、复杂的状态与工作流、记忆与检索、
        可观测性与调试、生产环境的安全沙箱……不同框架各有侧重。本站的
        <strong>《Agent 框架》</strong>课会带你系统比较 smolagents、LangGraph、CrewAI、
        PydanticAI、LlamaIndex 等主流框架，全程同样以百炼 / Qwen 作后端，是这门课自然的续篇。
      </p>
      <Callout variant="tip" title="学习建议">
        带着这一章手写的 ReAct 循环去看任何框架，你都能一眼看穿它的"想—做—看"内核，
        框架的文档和源码会变得透明许多。这正是先理解原理、再用框架的最大好处。
      </Callout>

      <Summary
        points={[
          'Agent 的核心是 ReAct 循环：问模型 → 若要调工具则执行 → 把观察结果喂回 → 再问，直到模型给出最终答案。',
          '手写最小 Agent：准备工具与 JSON schema，写一个带 max_steps 护栏的循环，逐个执行 tool_calls 并以 role=tool 喂回。',
          '模型一次可能调多个工具，要 for 遍历 tool_calls；务必加步数上限护栏，避免死循环烧钱。',
          'smolagents 用 @tool 定义工具（文档字符串即说明）、CodeAgent(...).run() 把循环 / 解析 / 护栏全包了，几行搭好。',
          '接百炼：OpenAIServerModel 的 api_base 指向 /compatible-mode/v1，密钥用环境变量，需放行额外 import。',
          '框架内部就是你手写的那个循环；理解原理后，再去本站《Agent 框架》课系统学习各主流框架。',
        ]}
      />
    </article>
  )
}
