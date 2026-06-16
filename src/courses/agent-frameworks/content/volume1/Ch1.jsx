import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const toolSnippet = `from smolagents import tool

@tool
def get_weather(city: str) -> str:
    """查询某城市当前天气。

    Args:
        city: 城市名，例如 "Hangzhou"。
    """
    return query_weather_api(city)`

const toolClassSnippet = `from smolagents import Tool

class WeatherTool(Tool):
    name = "get_weather"
    description = "查询某城市当前天气"
    inputs = {
        "city": {"type": "string", "description": "城市名，例如 Hangzhou"}
    }
    output_type = "string"

    def forward(self, city: str) -> str:
        return query_weather_api(city)`

const codeAgentSnippet = `from smolagents import CodeAgent, InferenceClientModel

agent = CodeAgent(
    tools=[get_weather],          # 模型可在生成的代码里直接调用的工具
    model=InferenceClientModel(), # 任意模型类，与 Agent 解耦
    additional_authorized_imports=["math", "statistics"],  # 放行额外的标准库
    max_steps=8,                  # 最多迭代多少步
)

result = agent.run("杭州、北京、广州里哪个城市现在最热？")`

const modelFamilySnippet = `# 同一套 Agent 代码，换一个模型类就能切换后端
from smolagents import (
    InferenceClientModel,   # HF Inference 端点 / Serverless
    TransformersModel,      # 本机用 transformers 直接加载权重
    VLLMModel,              # 本机 / 服务端用 vLLM 高吞吐推理
    MLXModel,               # Apple Silicon 上用 MLX
    LiteLLMModel,           # 经 LiteLLM 路由到上百家供应商
    OpenAIServerModel,      # 任意 OpenAI 兼容端点（含百炼）
    AzureOpenAIServerModel, # Azure OpenAI
)`

const reactLoopPseudo = `# smolagents 的极简 ReAct 循环（伪代码）
step = 0
while step < max_steps:
    thought, code = model.generate(prompt, memory)   # think：模型边想边写 Python
    observation = python_executor.run(code)          # act：在执行器里跑这段代码
    memory.append(thought, code, observation)        # observe：把结果写回记忆
    if called_final_answer(code):                    # 代码里调用 final_answer(...) 即收尾
        return observation
    step += 1
# 超过 max_steps 仍未收尾，则强制收束并返回当前最优答案`

const sandboxSnippet = `# 本地执行（默认）：快，但靠 AST 白名单做防护，官方明确「不绝对安全」
agent = CodeAgent(tools=[], model=model,
                  additional_authorized_imports=["math", "json"])

# 生产推荐：把代码丢进远程隔离沙箱执行
agent = CodeAgent(tools=[], model=model, executor_type="e2b")     # e2b 云沙箱
agent = CodeAgent(tools=[], model=model, executor_type="docker")  # 本地 docker 容器`

export default function Ch1() {
  return (
    <article>
      <Lead>
        smolagents 是 Hugging Face 出品的极简 Agent 框架，核心代码刻意压到只有约一千行。
        它最大的特点不是「功能多」，而是一个反直觉的设计选择：让 Agent 把每一步动作
        <strong>直接写成 Python 代码并执行</strong>，而不是输出一段 JSON 来描述「我要调用哪个工具」。
        这一章我们讲透它的来历、核心范式——代码行动（code-as-action）、内部循环、抽象层次、
        安全模型，以及它的适用边界。
      </Lead>

      <h2>一、起源与背景：HF 为什么造一个「极简」框架</h2>
      <p>
        smolagents 由 Hugging Face 维护，是早期 <code>transformers.agents</code> 的<strong>正式继任者</strong>——
        后者已被弃用，HF 把对 Agent 的探索沉淀进了这个新的独立库。它的命名本身就是态度：
        <code>smol</code>（small 的网络写法）= 小。整个核心逻辑刻意保持在<strong>约 1000 行</strong>，
        让你能在一个下午读完它「到底在干什么」。
      </p>
      <p>
        到 2026 年，它大约是 <strong>1.26.x</strong> 版本（2026-05 前后），GitHub 上约 2.6 万 stars，
        差不多每月发版，社区相当活跃。和那些把编排层、状态机、回调体系堆得很厚的框架不同，
        smolagents 的设计哲学是 <em>barebones</em>（精光、不加料）：把一个能干活的 Agent 抽象到最小，
        其余交给「让模型用代码思考」这一条主线。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>事实</th></tr>
        </thead>
        <tbody>
          <tr><td>出品方</td><td>Hugging Face</td></tr>
          <tr><td>前身</td><td><code>transformers.agents</code>（已弃用）</td></tr>
          <tr><td>版本（2026）</td><td>约 1.26.0（2026-05）</td></tr>
          <tr><td>规模</td><td>核心约 1000 行，约 2.6 万 stars，约每月发版</td></tr>
          <tr><td>定位</td><td>极简、模型无关、以「代码行动」为核心范式</td></tr>
        </tbody>
      </table>

      <h2>二、核心理念：让 Agent「写代码」而不是「填 JSON」</h2>
      <KeyIdea>
        smolagents 的核心范式是<strong>代码行动（code-as-action）</strong>：Agent 每一步不是输出
        结构化的工具调用 JSON，而是生成一段可执行的 Python 代码，由框架在执行器里运行，
        再把运行结果作为观察喂回模型。动作即代码，这就是整个框架的灵魂。
      </KeyIdea>
      <p>
        主流 Agent 框架大多走 <strong>JSON 工具调用</strong>路线：模型每一步输出一个结构化对象，
        指明「调用哪个工具、传什么参数」，框架解析后执行，再把结果返回。这种方式清晰、可控，
        但有个天然限制——<strong>每一步只能发出一个调用</strong>。要做循环、条件分支、
        把一个工具的输出接到下一个工具的输入、顺手算个中间值，都得拆成多轮 LLM 来回。
      </p>
      <p>
        代码行动则把「一步」的表达力拉满：在一段 Python 里，模型可以写 <code>for</code> 循环、
        写 <code>if</code> 判断、把一个函数的返回值<strong>直接</strong>传给另一个函数、声明中间变量、
        顺手做计算。本来要 LLM 来回好几轮才能完成的编排，模型在一段代码里就一次性写完了。
        Hugging Face 援引相关研究指出：相比 JSON 工具调用，代码行动大约能<strong>减少 30%
        的步数 / LLM 调用次数</strong>——少一次调用就少一份延迟、少一份 token 成本、也少一个出错环节。
      </p>

      <Example title="同一个动作：JSON 工具调用 vs 代码行动">
        <p>任务：查 3 个城市的天气，挑出最热的那个。</p>
        <p>
          <strong>JSON 工具调用</strong>：第 1 轮发
          <code>{'{"tool":"get_weather","city":"A"}'}</code>，等结果；第 2 轮发 B；第 3 轮发 C；
          第 4 轮模型才在脑子里比大小给答案。<strong>四轮起步</strong>。
        </p>
        <p>
          <strong>代码行动</strong>：模型一步写出
          <code>{'temps = {c: get_weather(c) for c in ["A","B","C"]}'}</code> 再
          <code>{'hottest = max(temps, key=temps.get)'}</code>，
          循环、收集、比较一气呵成，<strong>一轮搞定</strong>。
        </p>
      </Example>

      <h2>三、架构总览：一张图看清数据流</h2>
      <p>
        下面这张图把 smolagents 的分层拆开看：最上面是<strong>入口</strong>，你用一句自然语言任务
        调 <code>agent.run(task)</code>；任务交给 <strong>CodeAgent</strong>（或 ToolCallingAgent），
        它问模型「这一步该写什么代码」；模型回的代码送进 <strong>PythonExecutor</strong> 执行，
        执行过程中可以调用注册进来的 <strong>Tools</strong>；执行结果（观察）再回到 Agent，
        拼进上下文喂给<strong>模型</strong>，进入下一轮——如此循环，直到模型在代码里调用
        <code>final_answer(...)</code>。
      </p>
      <ArchDiagram framework="smolagents" />
      <p>
        注意三条关键连线：① Agent 与<strong>模型</strong>解耦——换模型类就换后端，逻辑不变；
        ② 执行器与<strong>工具</strong>是「代码运行时」的一对——工具就是代码里能直接 call 的函数；
        ③ 观察结果回流形成闭环——这正是 ReAct 的「想—做—看」循环在 smolagents 里的具体形态。
      </p>

      <h2>四、核心组件逐个详解</h2>
      <h3>CodeAgent（旗舰）</h3>
      <p>
        框架的主角，代码行动范式的承载者。每一步生成并执行一段 Python 来完成动作，多数实战都用它。
        构造时传入 <code>tools</code>、<code>model</code>，并可配 <code>additional_authorized_imports</code>、
        <code>max_steps</code>、<code>executor_type</code> 等。
      </p>
      <CodeBlock lang="python" title="构造并运行一个 CodeAgent" code={codeAgentSnippet} />

      <h3>ToolCallingAgent（JSON 范式）</h3>
      <p>
        经典 JSON 工具调用范式的实现，作为补充存在。当你确实需要传统的结构化调用、
        要对接只支持 function-calling 接口的场景、或想做范式对比实验时用它。
        它和 CodeAgent 共享同一套 Tool 和 Model 抽象，切换成本极低。
      </p>

      <h3>Tool：@tool 装饰器或继承 Tool 类</h3>
      <p>
        工具有两种定义方式。最快的是给普通函数加 <code>@tool</code> 装饰器；要更显式可继承
        <code>Tool</code> 类。无论哪种，一个工具都带 <code>name</code>、<code>description</code>、
        类型化的 <code>inputs</code> 与 <code>output_type</code>，以及真正干活的 <code>forward()</code>——
        这些元信息会被拼进提示，让模型知道「有哪些工具、各自怎么用」。
      </p>
      <CodeBlock lang="python" title="方式一：@tool 装饰器（最简）" code={toolSnippet} />
      <CodeBlock lang="python" title="方式二：继承 Tool 类（更显式）" code={toolClassSnippet} />

      <h3>模型类家族（模型无关）</h3>
      <p>
        smolagents 与具体模型彻底解耦，提供一大批模型适配类。同一套 Agent 代码，换个模型类就能从
        云端 API 切到本地推理，或在不同供应商间横跳。
      </p>
      <CodeBlock lang="python" title="可选的模型类" code={modelFamilySnippet} />
      <table>
        <thead>
          <tr><th>模型类</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>InferenceClientModel</code></td><td>HF Inference 端点 / Serverless 推理</td></tr>
          <tr><td><code>TransformersModel</code></td><td>本机用 transformers 直接加载权重</td></tr>
          <tr><td><code>VLLMModel</code> / <code>MLXModel</code></td><td>vLLM 高吞吐 / Apple Silicon 上的 MLX</td></tr>
          <tr><td><code>LiteLLMModel</code></td><td>经 LiteLLM 路由到上百家供应商（含百炼）</td></tr>
          <tr><td><code>OpenAIServerModel</code></td><td>任意 OpenAI 兼容端点；别名 <code>OpenAIModel</code></td></tr>
          <tr><td><code>AzureOpenAIServerModel</code></td><td>Azure OpenAI</td></tr>
        </tbody>
      </table>

      <h3>执行器 / 沙箱</h3>
      <p>
        模型写出的代码需要一个地方运行，这就是执行器。<code>executor_type="local"</code> 用
        <code>LocalPythonExecutor</code>，在本进程里跑，靠 AST 解析做导入白名单；
        <code>e2b</code> / <code>docker</code> / <code>modal</code> / <code>blaxel</code> 则把代码丢进远程隔离环境。
        细节见第七节。
      </p>

      <h2>五、一次运行的内部循环：think → act → observe</h2>
      <p>
        把上面的组件串起来，一次 <code>agent.run(task)</code> 的内部就是一个朴素的 ReAct 循环：
      </p>
      <ul>
        <li><strong>think</strong>：模型读当前上下文（任务 + 历史观察），思考并写出一段 Python 代码。</li>
        <li><strong>act</strong>：执行器运行这段代码，期间可调用注册的工具，产生输出 / 副作用。</li>
        <li><strong>observe</strong>：把执行结果（含 <code>print</code> 输出、异常信息）写回记忆。</li>
        <li><strong>收尾</strong>：当模型在代码里调用 <code>final_answer(...)</code>，循环结束并返回该值。</li>
        <li><strong>护栏</strong>：<code>max_steps</code> 限制最大迭代步数，避免模型陷入死循环烧钱。</li>
      </ul>
      <CodeBlock lang="python" title="内部循环骨架（伪代码）" code={reactLoopPseudo} />

      <h2>六、安全与沙箱：代码会被真的执行</h2>
      <p>
        代码行动的代价是：模型写出来的代码<strong>真的会被运行</strong>。本地执行器为此做了防护——
        通过 AST 解析限制能 import 哪些模块，你要用额外的库得在
        <code>additional_authorized_imports</code> 里显式放行。1.26 还移除了早期的 WasmExecutor，
        并对执行做了多轮安全加固。
      </p>
      <CodeBlock lang="python" title="本地白名单 vs 远程沙箱" code={sandboxSnippet} />
      <Callout variant="warn" title="本地执行器并不绝对安全">
        即便有 AST 导入白名单，官方也<strong>明确警告</strong> <code>LocalPythonExecutor</code> 不是
        牢不可破的沙箱——白名单可被绕过。生产环境务必用远程沙箱
        （<code>e2b</code> / <code>docker</code> / <code>modal</code> / <code>blaxel</code>），
        并且<strong>永远不要在没有隔离的情况下运行不可信来源的代码</strong>。
      </Callout>

      <h2>七、能力延伸：视觉浏览与结构化输出</h2>
      <p>
        近期版本里 smolagents 不止能跑纯文本任务：它支持基于 VLM（视觉语言模型）的
        <strong>网页浏览 Agent</strong>——让模型「看」截图来操作网页；也支持
        <strong>结构化 CodeAgent 输出</strong>，把最终答案约束成你想要的结构而非自由文本。
        这两点让它在「看屏幕做事」和「产出可被下游程序消费的结果」两个方向都能用。
      </p>

      <h2>八、适合 / 不适合，以及它的生态位</h2>
      <p>
        <strong>适合</strong>：需要多步推理 + 中间计算 + 工具组合的任务，比如「检索→筛选→计算→判断」
        这类有编排逻辑的活；教学与原型，因为框架小、可读性强；以及模型无关的实验，
        想横向对比不同模型时换一行就行。
      </p>
      <p>
        <strong>不适合</strong>：重型企业级编排、需要复杂状态图 / 持久化工作流的场景——那是
        LangGraph 这类框架的主场；安全要求极高却又不愿配置沙箱的环境；以及纯粹的单次简单调用——
        为一次问答套上 CodeAgent 属于过度设计，直接调模型更划算。
      </p>
      <p>
        <strong>生态</strong>：smolagents 与 HF 生态深度联动——工具可以从 <strong>Hub</strong> 分享 / 拉取，
        Agent 可以一键包成 <strong>Gradio</strong> 界面做演示，也支持通过 <strong>MCP</strong>
        接入外部工具服务器。它既是独立框架，也是 HF 工具链里的一块拼图。
      </p>

      <Callout variant="tip">
        下一章我们就动手：用 <code>OpenAIServerModel</code> 把 <code>api_base</code> 指向阿里云百炼的
        OpenAI 兼容端点，接上 Qwen，写一个 <code>CodeAgent</code> 跑通一道真实多步题，
        亲眼看看「代码行动」如何用一段代码搞定循环、筛选与计算。
      </Callout>

      <Summary
        points={[
          'smolagents 是 HF 出品的极简框架（核心约 1000 行），是已弃用的 transformers.agents 的继任者，2026 年约 1.26.x，约每月发版。',
          '核心范式是代码行动（code-as-action）：Agent 把动作写成并执行 Python 代码，而非输出 JSON 工具调用。',
          '代码行动能在一步里写循环 / 条件 / 链式传递，HF 援引研究称相比 JSON 调用约减少 30% 步数。',
          '核心抽象：CodeAgent（旗舰）、ToolCallingAgent（JSON 范式）、Tool（@tool 或继承）、ReAct 循环、丰富的模型类家族。',
          '代码会被真的执行：local 执行器靠 AST 白名单但不绝对安全，生产务必用 e2b / docker / modal 等远程沙箱。',
          '适合多步推理与工具组合、教学原型、模型无关实验；不适合重型编排、无沙箱的高安全场景、单次简单调用；与 HF Hub / Gradio / MCP 深度联动。',
        ]}
      />
    </article>
  )
}
