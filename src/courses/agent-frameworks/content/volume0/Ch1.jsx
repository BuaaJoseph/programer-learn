import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const bareSdkCode = `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 这就是一次"单次问答"：发一句话，拿一句回复，结束
resp = client.chat.completions.create(
    model="qwen-plus",
    messages=[{"role": "user", "content": "今天北京天气怎么样？"}],
)

print(resp.choices[0].message.content)
# 输出：很抱歉，我无法获取实时天气……（模型只会聊天，不会真的去查）`

const handcraftCode = `# 要把上面那"一次问答"变成"会自己干活的 Agent"，
# 你至少还得自己手写下面这一大堆东西：
import json

# ① 工具定义 + JSON Schema（把 Python 函数翻译成模型能读懂的描述）
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "查询指定城市的实时天气",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string", "description": "城市名"}},
            "required": ["city"],
        },
    },
}]

def get_weather(city: str) -> str:
    return f"\${city}今天晴，26 摄氏度"   # 真实实现可能是一次 HTTP 请求

# ② 工具调用主循环：调模型 → 解析 tool_calls → 执行 → 回灌 → 再调模型
messages = [{"role": "user", "content": "今天北京天气怎么样？"}]
while True:
    resp = client.chat.completions.create(
        model="qwen-plus", messages=messages, tools=tools,
    )
    msg = resp.choices[0].message
    messages.append(msg)                       # 多轮：把模型的话也存进历史

    if not msg.tool_calls:                      # 模型不再要工具 → 收尾
        print(msg.content)
        break

    for call in msg.tool_calls:                 # ③ 解析 tool_calls
        args = json.loads(call.function.arguments)
        try:
            result = get_weather(**args)        # ④ 真正执行（还要做权限校验）
        except Exception as e:                  # ⑤ 错误重试 / 兜底
            result = f"工具出错：\${e}"
        messages.append({                       # ⑥ 把结果回灌给模型
            "role": "tool",
            "tool_call_id": call.id,
            "content": result,
        })
# 还没写：并发执行多个工具、记忆压缩、规划、可观测追踪、超出 token 截断……`

export default function Ch1() {
  return (
    <article>
      <Lead>
        大模型本身只会"接话"：你给一句，它回一句。可一旦你想让它<strong>自己查资料、调接口、分步骤把一件真事办完</strong>，
        你就得在裸 SDK 外面手写一大圈管道——工具循环、状态、记忆、重试、追踪。Agent 框架，正是把这圈反复重写的管道沉淀成了基础设施。
        这一章先讲清楚：为什么"裸调一次模型"远远不够，框架到底替你做了什么，以及它的代价。
      </Lead>

      <h2>一、先对齐概念：什么是 Agent</h2>
      <p>
        在本课里，<strong>Agent（智能体）</strong> 不是某个产品名，而是一种运行模式。它由四个部件构成，缺一不可：
      </p>
      <ul>
        <li><strong>LLM（大脑）</strong>：负责理解、推理、决定"下一步干什么"。</li>
        <li><strong>工具 Tools（手脚）</strong>：搜索、读写文件、调 API、执行代码——让模型能影响外部世界。</li>
        <li><strong>循环 Loop（心跳）</strong>：模型给出动作 → 系统执行 → 把结果喂回模型 → 模型再决定下一步，直到任务完成。</li>
        <li><strong>状态 State（记忆）</strong>：跨多轮保存对话历史、中间结果、目标，让它"记得自己在干嘛"。</li>
      </ul>
      <KeyIdea title="一句话区分">
        <strong>单次问答</strong>是"输入 → 输出"的一锤子买卖；<strong>Agent</strong> 是"观察 → 思考 → 行动 → 再观察"的循环，
        它会自己决定调用几次模型、调哪些工具，直到目标达成。把这个循环跑起来，就是所有 Agent 框架最核心的职责。
      </KeyIdea>

      <h2>二、从裸 SDK 说起：一次调用能做什么</h2>
      <p>
        下面是最朴素的一次模型调用。注意它的边界：模型只会<strong>生成文本</strong>，它说"我查不到天气"——因为它根本没有"去查"的能力。
      </p>
      <CodeBlock lang="python" title="裸 openai SDK：一次性问答" code={bareSdkCode} />
      <p>
        这段代码能跑、能聊，但它<strong>不是 Agent</strong>：没有工具、没有循环、没有记忆。它就是个聊天框。
      </p>

      <h2>三、要把它变成 Agent，你得自己手写什么</h2>
      <p>
        从"会聊天"到"会干活"，中间隔着一大段你必须亲手填的管道。下面这段代码把最基础的一层铺开给你看——而这还只是开始：
      </p>
      <CodeBlock lang="python" title="手搓一个最小 Agent 循环（节选，仍不完整）" code={handcraftCode} />
      <p>把上面代码里出现、以及注释里提到的活儿列全，你至少要自己实现：</p>
      <ul>
        <li><strong>工具定义与 Schema 生成</strong>：把函数翻译成 JSON Schema 描述给模型。</li>
        <li><strong>解析 tool_calls</strong>：从模型回复里取出函数名和参数（还得处理 JSON 解析失败）。</li>
        <li><strong>执行与回灌</strong>：调用真实函数，把结果按 <code>tool</code> 角色塞回 messages。</li>
        <li><strong>工具调用主循环</strong>：判断何时该再调模型、何时收尾。</li>
        <li><strong>多轮对话管理</strong>：维护 messages 历史，避免上下文丢失或超长。</li>
        <li><strong>规划</strong>：复杂任务要先拆步骤，而不是一头扎进去。</li>
        <li><strong>记忆</strong>：长对话需要摘要 / 检索，否则 token 爆掉。</li>
        <li><strong>错误重试</strong>：网络抖动、限流、工具异常的兜底与退避。</li>
        <li><strong>并发</strong>：模型一次要调多个工具时并行执行。</li>
        <li><strong>可观测</strong>：每一步的输入输出要能追踪、能回放、能调试。</li>
        <li><strong>权限</strong>：危险操作（删文件、发请求、花钱）要拦一道。</li>
      </ul>
      <p>
        这些每一个项目都得重写一遍，且都是细节密集的脏活。<strong>这就是 Agent 框架存在的理由。</strong>
      </p>

      <h2>四、框架到底替你实现了什么</h2>
      <p>下面这张表，是本课后续所有框架的"公约数"——它们的差异在风格，但这些能力几乎都提供：</p>
      <table>
        <thead>
          <tr><th>能力</th><th>框架替你做了什么</th></tr>
        </thead>
        <tbody>
          <tr><td>工具调用循环</td><td>自动跑"调模型 → 执行工具 → 回灌 → 再调"的循环，直到任务结束。</td></tr>
          <tr><td>工具定义与 Schema</td><td>从函数签名 / 类型注解 / 文档字符串自动生成 JSON Schema，不用手写。</td></tr>
          <tr><td>多 Agent 协作与 handoff</td><td>支持把任务在多个专职 Agent 间移交、分工、汇总。</td></tr>
          <tr><td>状态与记忆</td><td>内置对话历史管理、短期 / 长期记忆、上下文压缩。</td></tr>
          <tr><td>结构化输出</td><td>强制模型按 Pydantic 模型 / JSON Schema 返回，并校验、重试。</td></tr>
          <tr><td>RAG / 检索</td><td>提供文档加载、切块、向量化、检索增强的现成管线。</td></tr>
          <tr><td>人在回路 HITL</td><td>关键步骤可暂停，等人审批后再继续。</td></tr>
          <tr><td>可观测 / 追踪</td><td>记录每一步的 prompt、工具调用、耗时、token，可视化回放。</td></tr>
          <tr><td>模型供应商抽象</td><td>同一套代码切换 OpenAI / 百炼 / 本地模型，只改配置。</td></tr>
        </tbody>
      </table>

      <h2>五、框架的代价</h2>
      <Callout variant="warn" title="天下没有免费的抽象">
        <ul>
          <li><strong>抽象泄漏</strong>：框架替你包好了循环，但出 bug 时你还是得看懂它内部怎么拼 prompt、怎么解析 tool_calls。</li>
          <li><strong>版本变动快</strong>：Agent 生态仍在高速迭代，API 经常 breaking change，去年的教程今年可能跑不通。</li>
          <li><strong>调试要懂内部</strong>：黑盒越厚，定位问题越难，往往要开追踪、读源码才能搞清模型为什么这么干。</li>
          <li><strong>简单任务过度设计</strong>：如果只是"一次问答"或固定流程，引入框架反而是负担——直接裸调更清爽。</li>
        </ul>
      </Callout>

      <h2>六、怎么选（本课预告）</h2>
      <p>选框架不是比谁 star 多，而是按场景对号入座，主要看三条：</p>
      <ul>
        <li><strong>任务复杂度</strong>：单工具小循环 vs 多步骤、多分支、需要严格流程控制。</li>
        <li><strong>团队技术栈</strong>：Python 为主，还是 Java 企业后端（决定 Spring AI 是否进入视野）。</li>
        <li><strong>部署环境</strong>：脚本 / 原型 vs 生产服务，对可观测、稳定性、类型安全的要求天差地别。</li>
      </ul>
      <p>
        本课覆盖 <strong>7 个框架</strong>，不按 API 罗列，而是<strong>按范式</strong>讲清每一类"该怎么想问题"，最后给一棵<strong>选型决策树</strong>。
      </p>

      <h2>七、一段简史：Agent 框架的格局演变</h2>
      <Example title="三年演进的主线">
        <ul>
          <li><strong>2023</strong>：LangChain 与 AutoGPT 引爆热度，"让大模型自己规划 + 调工具"成为全民话题，但工程上脆弱、难控、难调。</li>
          <li><strong>2024</strong>：进入"可控化"阶段——LangGraph（图 / 状态机）、CrewAI（角色协作）、AutoGen（多 Agent 对话）登场，强调流程可控与多智能体协作。</li>
          <li><strong>2025</strong>：走向"收敛与 1.0"——OpenAI Agents SDK（轻量 + handoff）、Google ADK、PydanticAI（类型安全）、Spring AI（Java 企业集成）相继成熟，范式分工逐渐清晰，框架纷纷迈向稳定版本。</li>
        </ul>
      </Example>
      <p>这条主线的方向很明确：<strong>从"能跑"到"可控、可观测、可上生产"。</strong>本课正是站在这个收敛点上做横向对比。</p>

      <h2>八、本课约定</h2>
      <ul>
        <li><strong>统一后端</strong>：全程用阿里云百炼（Qwen）作模型后端，靠 OpenAI 兼容端点接入，保证横向对比公平（详见第三章）。</li>
        <li><strong>每框架一个可运行 case</strong>：不只讲概念，每个框架都配一个能跑通的最小实战。</li>
        <li><strong>配套代码</strong>：所有示例集中在 <code>examples/agent-frameworks/</code> 目录，按章节编号组织。</li>
      </ul>

      <Summary points={[
        'Agent = LLM + 工具 + 循环 + 状态；它与"单次问答"的本质区别是"会自己多步行动直到完成任务"。',
        '裸 SDK 只会聊天；要变成 Agent，工具循环、Schema、回灌、记忆、重试、并发、可观测、权限都得你自己写。',
        'Agent 框架的价值就是把这圈反复重写的管道沉淀成基础设施，提供工具循环、结构化输出、RAG、HITL、追踪、供应商抽象等公共能力。',
        '代价是抽象泄漏、版本快变、调试要懂内部、简单任务过度设计——选框架要按任务复杂度 / 团队栈 / 部署环境权衡。',
        '本课覆盖 7 个框架，按范式讲解，统一用百炼(Qwen)后端，每框架配一个可运行 case。',
      ]} />
    </article>
  )
}
