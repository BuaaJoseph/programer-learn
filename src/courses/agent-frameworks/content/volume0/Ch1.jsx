import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const bareSdkCode = `from openai import OpenAI

client = OpenAI(
    api_key="sk-xxx",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

resp = client.chat.completions.create(
    model="qwen-plus",
    messages=[{"role": "user", "content": "今天北京天气怎么样？"}],
)

print(resp.choices[0].message.content)
# 输出：很抱歉，我无法获取实时天气……（模型只会聊天，不会真的去查）`

const toolLoopCode = `# 把"一次问答"变成"会自己干活的 Agent"，你至少还要手写这些：

# 1. 工具定义 + JSON Schema（描述给模型听）
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "查询指定城市的天气",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

# 2. 工具调用主循环：调模型 → 解析 tool_calls → 执行 → 回灌结果 → 再调模型
messages = [{"role": "user", "content": "今天北京天气怎么样？"}]
while True:
    resp = client.chat.completions.create(
        model="qwen-plus", messages=messages, tools=tools,
    )
    msg = resp.choices[0].message
    messages.append(msg)

    if not msg.tool_calls:        # 模型不再要工具，说明它给出了最终答案
        print(msg.content)
        break

    for call in msg.tool_calls:   # 3. 自己分发、自己执行、自己处理异常
        args = json.loads(call.function.arguments)
        result = run_tool(call.function.name, args)
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": json.dumps(result, ensure_ascii=False),
        })
    # 4. 还得管：超时、重试、上下文超长截断、并发工具、权限确认……`

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果你跟着上一门《从零构建 Agent》手写过 forge，你会记得那种"什么都要自己来"的感觉：主循环、工具调用、权限确认、上下文管理、子代理调度，每一块都得亲手实现。
        本章我们换个视角——这些反复出现的脚手架，正是 Agent 框架想替你产品化的东西。在动手学具体框架之前，先把一个判断建立起来：框架到底解决了什么，以及什么时候<strong>不该</strong>用它。
      </Lead>

      <h2>从"裸调 SDK"说起</h2>
      <p>
        用 OpenAI 或 Anthropic 的 SDK 直接发一次请求，是非常简单的。一个 <code>chat.completions.create</code> 调用，你就能得到一次问答：
      </p>

      <CodeBlock lang="python" code={bareSdkCode} />

      <p>
        问题在于：这只是"一次问答"。模型回了一段文字，仅此而已。它不会真的去查天气、不会自己决定下一步、更不会连续干好几步活。
        要把这段代码变成一个<strong>能自己调工具、能多轮推进、会规划</strong>的 Agent，你得在它外面手写一大圈东西：
      </p>

      <CodeBlock lang="python" code={toolLoopCode} />

      <p>
        看出来了吧：真正"难"的不是调模型，而是调模型<strong>外面的那一圈</strong>——解析工具调用、回灌结果、控制循环、处理异常与上下文。手写一遍能学到原理，但每个项目都重写一遍，就是在重复造轮子。
      </p>

      <h2>框架到底实现了什么</h2>
      <KeyIdea>
        Agent 框架的本质，是把"裸 SDK 之外那一圈反复出现的脚手架"抽象成可复用的组件。你写过 forge 的每一个模块，几乎都能在框架里找到对应物。
      </KeyIdea>

      <p>这些被产品化的"重复脚手架"，主要包括：</p>
      <ul>
        <li><strong>工具调用循环</strong>：让模型反复调工具、读结果、再决策，直到任务完成——这正是 forge 主循环干的事。</li>
        <li><strong>工具定义与 schema 生成</strong>：很多框架能从函数签名或类型注解自动生成 JSON Schema，省掉手写 <code>parameters</code> 的苦力活。</li>
        <li><strong>多 Agent 协作与 handoff</strong>：把一个大任务拆给若干专职 Agent，并在它们之间移交控制权（对应 forge 里的子代理）。</li>
        <li><strong>状态与记忆</strong>：短期对话状态、长期记忆、跨会话持久化。</li>
        <li><strong>结构化输出</strong>：强制模型按指定的数据结构返回，便于程序直接消费。</li>
        <li><strong>RAG / 检索集成</strong>：把向量检索、文档召回接进上下文。</li>
        <li><strong>人在回路（human-in-the-loop）</strong>：在关键动作前暂停、等人确认——也就是 forge 里的权限机制。</li>
        <li><strong>可观测 / 追踪</strong>：记录每一步的输入输出、工具调用、token 消耗，方便调试与复盘。</li>
        <li><strong>模型供应商抽象</strong>：用统一接口接不同厂商的模型，换后端不用改业务代码。</li>
      </ul>

      <p>
        每一项单独看都不难，但当它们叠在一起、还要在生产里稳定运行时，自己维护一套就成了不小的负担。框架的价值，就是把这些变成你 <code>{'import'}</code> 进来就能用的组件。
      </p>

      <Example title="同一件事：裸写 vs 框架">
        <p>目标：用户问"今天北京天气怎么样？"，Agent 自动调用天气工具，再给出自然语言回答。</p>
        <p>
          <strong>裸写</strong>：你要先把工具定义成 JSON Schema 交给模型；第一次调用后，从返回里解析出 <code>tool_calls</code>，判断模型是不是真的要调工具；自己执行 <code>get_weather("北京")</code>；把结果作为一条 <code>role: "tool"</code> 的消息回灌进 <code>messages</code>；再发起第二次调用，模型才会基于天气数据组织出最终回答。中间还要兜住 JSON 解析失败、工具报错、上下文超长等情况。
        </p>
        <p>
          <strong>用框架</strong>：你往往只需把 <code>get_weather</code> 注册成一个工具、把它和指令一起交给一个 Agent 对象，然后 <code>run("今天北京天气怎么样？")</code>。解析、回灌、二次调用这一整套循环由框架内部完成，业务代码常常就几行。
        </p>
        <p>同一件事，裸写是几十行加一堆边界处理，框架里是几行——这就是脚手架被产品化后的直观差距。</p>
      </Example>

      <h2>框架不是银弹</h2>
      <Callout variant="warn">
        <p>框架省事，但也有实打实的代价，别无脑套用：</p>
        <ul>
          <li><strong>抽象泄漏</strong>：框架把循环藏起来了，可一旦行为不符合预期，你还是得理解它内部到底怎么调的模型，否则根本无从下手。</li>
          <li><strong>版本变动快</strong>：这个领域迭代极快，API 经常 breaking change，去年的教程今年可能就跑不通。</li>
          <li><strong>调试门槛</strong>：出问题时要顺着框架的调用栈往下挖，比调自己写的代码更费劲。</li>
          <li><strong>过度设计</strong>：如果任务只是"一次问答"或简单的固定流程，套个重框架反而是杀鸡用牛刀——这种场景，能裸写就裸写。</li>
        </ul>
      </Callout>

      <h2>那到底怎么选</h2>
      <Callout variant="tip">
        <p>判断"要不要用、用哪个"，盯住三个维度：</p>
        <ul>
          <li><strong>任务复杂度</strong>：单次调用或简单流程，裸 SDK 足矣；需要多步推理、多 Agent 协作、长期记忆时，框架的价值才显现。</li>
          <li><strong>团队技术栈</strong>：是 Python 生态还是 Java / 企业级技术栈？不同框架的语言归属和生态差别很大，选顺手的。</li>
          <li><strong>部署环境</strong>：本地跑、上云、还是嵌进企业内部系统？这会直接影响对可观测性、托管、私有化的要求。</li>
        </ul>
      </Callout>

      <p>
        本课会按"范式"覆盖 <strong>7 个主流框架</strong>——不是逐个念 API 文档，而是讲清每个框架背后的设计取向：它把哪一类脚手架做成了一等公民、又为此牺牲了什么。最后一卷（卷 8）会给出一棵<strong>选型决策树</strong>，帮你把上面三个维度落到具体框架上。
      </p>

      <h2>本课的几条约定</h2>
      <KeyIdea>
        全程统一用<strong>阿里云百炼（Qwen）</strong>作为模型后端。原因很实际：几乎所有框架都支持自定义 <code>base_url</code> 去接 OpenAI 兼容端点，而百炼正好提供这样的兼容接口。这样我们就能用同一个后端横向对比不同框架，把变量控制在"框架本身"上。
      </KeyIdea>
      <ul>
        <li>每讲一个框架，都会配一个<strong>能真正跑起来的小 case</strong>，而不是只看伪代码。</li>
        <li>所有配套代码统一放在 <code>examples/agent-frameworks/</code> 目录下，按框架分子目录，照着就能复现。</li>
        <li>凡是涉及模型调用，默认就是接百炼的 OpenAI 兼容端点，后面不再每次重复说明。</li>
      </ul>

      <Summary points={[
        '裸调 SDK 只能得到"一次问答"；要变成会调工具、多轮、能规划的 Agent，难点在于模型外面那一圈脚手架。',
        'Agent 框架的本质，是把工具调用循环、schema 生成、多 Agent 协作、记忆、结构化输出、RAG、人在回路、可观测、供应商抽象这些重复脚手架产品化成可复用组件。',
        '框架不是银弹：抽象泄漏、版本变动快、调试门槛高，简单任务用框架是过度设计——能裸写就裸写。',
        '选型看三点：任务复杂度、团队技术栈、部署环境；本课覆盖 7 个主流框架，卷 8 给出选型决策树。',
        '本课约定：统一用阿里云百炼（Qwen）接 OpenAI 兼容端点，每个框架配一个可跑的小 case，代码在 examples/agent-frameworks/ 下。',
      ]} />
    </article>
  )
}
