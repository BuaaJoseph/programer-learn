import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const limitDemo = `# 纯聊天模型的局限：它没法获取实时 / 真实信息
messages = [
    {"role": "user", "content": "杭州现在天气怎么样？"},
]
# 模型只能回："抱歉，我无法获取实时天气。" —— 因为它没有"工具"`

const systemDemo = `# system 消息给 Agent 立"人设 + 规则"，是 Agent 行为的基石
messages = [
    {
        "role": "system",
        "content": (
            "你是一个天气助手。当用户询问天气时，"
            "你应当调用 get_weather 工具来获取真实数据，"
            "而不是凭空编造。"
        ),
    },
    {"role": "user", "content": "杭州今天热吗？"},
]`

const toolSchema = `# 用 JSON schema 向模型"描述"一个工具：它叫什么、干什么、要什么参数
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的当前天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名，例如 杭州",
                    }
                },
                "required": ["city"],
            },
        },
    }
]`

const realFunc = `# 这才是真正"干活"的 Python 函数（这里用写死的数据演示）
def get_weather(city: str) -> str:
    fake_db = {
        "杭州": "晴，26℃",
        "北京": "多云，22℃",
        "广州": "雷阵雨，30℃",
    }
    return fake_db.get(city, f"暂无 {city} 的天气数据")`

const modelDecide = `import os, json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

messages = [{"role": "user", "content": "杭州现在天气怎么样？"}]

# 第一次请求：把 tools 一起发过去，问模型"要不要用工具"
resp = client.chat.completions.create(
    model="qwen-plus",
    messages=messages,
    tools=tools,            # 上面定义的工具描述
)

msg = resp.choices[0].message
print(msg.tool_calls)      # 模型决定调用工具时，这里不为空`

const modelDecideResult = `[ChatCompletionMessageToolCall(
    id='call_abc123',
    function=Function(name='get_weather', arguments='{"city": "杭州"}'),
    type='function')]`

const feedBack = `# 模型说"要调 get_weather('杭州')"，我们执行它，再把结果喂回去
import json

if msg.tool_calls:
    # 1. 把模型这条"我要调工具"的消息加入历史
    messages.append(msg)

    for call in msg.tool_calls:
        # 2. 解析模型给的参数（是 JSON 字符串）
        args = json.loads(call.function.arguments)
        # 3. 真正执行对应的 Python 函数
        result = get_weather(**args)
        # 4. 把执行结果作为 role=tool 的消息喂回
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,     # 对应上面那次调用
            "content": result,
        })

# 5. 再请求一次：模型拿到工具结果，给出自然语言答案
resp2 = client.chat.completions.create(model="qwen-plus", messages=messages)
print(resp2.choices[0].message.content)`

const feedBackResult = `杭州现在是晴天，气温 26℃，很适合出门哦～`

const fullExample = `import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# ① 真正干活的函数
def get_weather(city: str) -> str:
    fake_db = {"杭州": "晴，26℃", "北京": "多云，22℃", "广州": "雷阵雨，30℃"}
    return fake_db.get(city, f"暂无 {city} 的天气数据")

# ② 用 JSON schema 描述这个工具
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "查询指定城市的当前天气",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名，例如 杭州"},
            },
            "required": ["city"],
        },
    },
}]

# ③ 工具名 -> 真实函数 的映射表，方便按名字调用
available = {"get_weather": get_weather}

def run(question: str) -> str:
    messages = [
        {"role": "system", "content": "你是天气助手，需要时调用工具获取真实数据。"},
        {"role": "user", "content": question},
    ]

    # 第一次请求：模型可能决定调用工具
    resp = client.chat.completions.create(
        model="qwen-plus", messages=messages, tools=tools,
    )
    msg = resp.choices[0].message

    # 模型不需要工具：直接回答
    if not msg.tool_calls:
        return msg.content

    # 模型要调工具：执行并把结果喂回
    messages.append(msg)
    for call in msg.tool_calls:
        func = available[call.function.name]        # 按名字找到函数
        args = json.loads(call.function.arguments)  # 解析参数
        result = func(**args)                        # 执行
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": result,
        })

    # 第二次请求：模型基于工具结果给出最终答案
    final = client.chat.completions.create(model="qwen-plus", messages=messages)
    return final.choices[0].message.content

if __name__ == "__main__":
    print(run("杭州现在天气怎么样？"))
    print(run("你好呀"))           # 这种不需要工具，模型会直接回答`

const fullExampleResult = `杭州现在是晴天，26℃，天气不错～
你好！有什么我可以帮你的吗？`

export default function Ch1() {
  return (
    <article>
      <Lead>
        上一卷我们让模型"会聊天"了，但它只能动嘴：问它实时天气、让它算一道精确的数学题，
        它要么说"我不知道"，要么一本正经地编。要让模型真正<strong>办事</strong>，
        就得给它<strong>工具</strong>。这一章讲清楚 Agent 是什么、system 提示和多轮上下文的作用，
        以及 Agent 的核心机制——<strong>工具调用（function calling）</strong>，
        并用一个"查天气"的完整例子（接百炼）把整个流程跑通。
      </Lead>

      <h2>一、Agent 是什么</h2>
      <p>
        一句话：<strong>Agent 是一个会用工具、能自主分多步完成任务的程序</strong>。
        普通的大模型调用是"你问一句、它答一句"；Agent 则能在中途说"我需要先查个天气"，
        去调用一个真实函数拿到数据，再基于结果继续，直到把任务办完。
      </p>
      <CodeBlock lang="python" title="纯聊天的局限" code={limitDemo} />
      <KeyIdea>
        模型本身只会"生成文字"。Agent 的关键在于：把模型生成的文字解读成"它想调用哪个工具、
        传什么参数"，由<strong>我们的程序去真正执行</strong>，再把结果喂回模型。
        模型负责"决策"，程序负责"动手"。
      </KeyIdea>

      <h2>二、system 提示与多轮上下文</h2>
      <p>
        要让模型表现得像个称职的 Agent，<code>system</code> 消息很关键——它给模型立规矩：
        你是谁、有哪些工具、什么时候该用。多轮上下文（不断追加的 messages）则是 Agent 的"记忆"。
      </p>
      <CodeBlock lang="python" title="用 system 给 Agent 定规则" code={systemDemo} />
      <Callout variant="tip" title="好的 system 提示很重要">
        清晰地告诉模型"遇到 X 情况就调用 Y 工具，不要编造"，能显著提升它正确使用工具的概率。
        含糊的提示则容易让它瞎答。
      </Callout>

      <h2>三、工具调用（function calling）原理</h2>
      <p>整个机制可以拆成清晰的几步，请先记住这个全景图：</p>
      <ol>
        <li>你用 <strong>JSON schema</strong> 向模型"描述"有哪些工具（名字、用途、参数）。</li>
        <li>把工具描述连同问题一起发给模型。</li>
        <li>模型<strong>不会自己执行</strong>，而是返回"我想调用 <code>get_weather</code>，参数是 <code>{'{"city":"杭州"}'}</code>"。</li>
        <li>你的程序解析它，<strong>真正运行</strong>那个 Python 函数，拿到结果。</li>
        <li>把结果作为一条 <code>role=tool</code> 的消息<strong>喂回</strong>模型。</li>
        <li>模型读到结果，给出最终的自然语言答案。</li>
      </ol>

      <h3>第一步：用 JSON schema 描述工具</h3>
      <p>
        模型怎么知道你有哪些工具？靠你用结构化的 JSON 把它"说"清楚：工具叫什么、做什么、
        需要哪些参数、参数是什么类型。
      </p>
      <CodeBlock lang="python" title="工具描述（JSON schema）" code={toolSchema} />

      <h3>真正干活的函数</h3>
      <p>描述归描述，真正执行的是一个普通 Python 函数。这里用写死的数据演示：</p>
      <CodeBlock lang="python" title="真实函数" code={realFunc} />

      <h3>第二步：模型决定要不要用工具</h3>
      <p>
        把 <code>tools</code> 随请求发过去。如果模型认为需要工具，它的回复里
        <code>tool_calls</code> 就不为空，告诉你要调哪个、传什么参数。
      </p>
      <CodeBlock lang="python" title="发起带 tools 的请求" code={modelDecide} />
      <CodeBlock lang="text" title="模型的决定（tool_calls）" code={modelDecideResult} />
      <Callout variant="note" title="注意：参数是字符串">
        <code>function.arguments</code> 是一段 <strong>JSON 字符串</strong>（如
        <code>{'\'{"city": "杭州"}\''}</code>），用 <code>json.loads</code> 解析成字典后才能用。
      </Callout>

      <h3>第三步：执行函数并把结果喂回</h3>
      <p>
        这是整个机制的精髓：模型只是"说"要调哪个函数，<strong>真正执行的是你的代码</strong>。
        执行完，把结果作为 <code>role=tool</code> 的消息加进历史，再请求一次，模型就能给出答案。
      </p>
      <CodeBlock lang="python" title="执行 + 喂回 + 再次请求" code={feedBack} />
      <CodeBlock lang="text" title="模型的最终回答" code={feedBackResult} />

      <h2>四、完整可运行示例：查天气 Agent</h2>
      <p>
        把上面所有片段拼成一个完整程序。它能处理两种情况：需要工具时走完整流程，
        不需要工具（如打招呼）时直接回答。
      </p>
      <CodeBlock lang="python" title="weather_agent.py" code={fullExample} />
      <CodeBlock lang="text" title="运行结果" code={fullExampleResult} />
      <Example title="再梳理一遍数据流">
        <ul>
          <li>① <code>get_weather</code> 是真正干活的函数；② <code>tools</code> 是给模型看的"说明书"。</li>
          <li>③ <code>available</code> 把"工具名字符串"映射到"真实函数"，便于按名字调用。</li>
          <li>第一次请求带上 <code>tools</code>，模型若返回 <code>tool_calls</code> 就执行、喂回；否则直接回答。</li>
          <li>第二次请求不再带 tools，模型看到 <code>role=tool</code> 的结果，组织成自然语言回复。</li>
        </ul>
      </Example>
      <Callout variant="warn" title="模型不直接碰你的系统">
        模型永远只是<strong>返回一个调用意图</strong>，它不能直接运行代码、读你的文件。
        是否执行、怎么执行，完全由你的程序掌控。这也是为什么工具函数要自己写得安全可靠。
      </Callout>

      <Practice title="练一练">
        给这个 Agent 再加一个工具 <code>calculate(expression: str)</code>，
        用来计算数学表达式（可用 <code>eval</code> 演示，真实项目要更安全）。
        补上对应的 JSON schema，并加进 <code>available</code> 映射，
        然后问它"杭州天气如何，顺便算一下 23 乘以 19"。
      </Practice>

      <Callout variant="tip" title="承上启下">
        现在你已经手动完成了一轮工具调用。但真实任务往往要<strong>反复多轮</strong>：
        调一个工具、看结果、再调下一个……直到任务完成。下一章我们就把它写成一个会自动循环的小 Agent，
        再看看框架（smolagents）如何几行代码就帮你搞定这一切。
      </Callout>

      <Summary
        points={[
          'Agent 是会用工具、能自主多步完成任务的程序；模型负责"决策调哪个工具"，你的程序负责"真正执行"。',
          'system 提示给 Agent 立人设和规则（何时用工具、不要编造），多轮 messages 是它的记忆。',
          'function calling 流程：用 JSON schema 描述工具 → 随请求发给模型 → 模型返回 tool_calls（调谁、什么参数）→ 你执行函数 → 把结果以 role=tool 喂回 → 模型给出最终答案。',
          'tool_calls 里的 arguments 是 JSON 字符串，要 json.loads 解析；用"名字->函数"的映射表按名调用。',
          '模型只返回"调用意图"，绝不会自己运行代码或碰你的系统，执行权完全在你手里。',
          '完整流程通常是两次请求：第一次带 tools 让模型决策，第二次让模型基于工具结果作答。',
        ]}
      />
    </article>
  )
}
