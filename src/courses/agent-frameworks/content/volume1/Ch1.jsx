import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const reactLoopPseudo = `# smolagents 的极简 ReAct 循环（伪代码）
while not done:
    thought, code = model.generate(prompt, history)   # think：模型边想边写 Python
    observation = executor.run(code)                  # act：在执行器里跑这段代码
    history.append(thought, code, observation)        # observe：把结果喂回上下文
    if "final_answer(" in code:                        # 调用 final_answer() 即收尾
        done = True`

const toolPseudo = `from smolagents import tool

@tool
def get_weather(city: str) -> str:
    """查询某城市的天气。

    Args:
        city: 城市名，例如 "Hangzhou"。
    """
    return query_weather_api(city)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        smolagents 是 Hugging Face 出品的极简 Agent 框架，核心代码只有约一千行。
        它最大的特点不是「功能多」，而是一个反直觉的设计选择：让 Agent 把每一步动作
        <strong>直接写成 Python 代码并执行</strong>，而不是输出一段 JSON 来描述「我要调用哪个工具」。
        这一章我们讲透它的核心范式——代码行动（code-as-action），以及它的抽象、安全模型和适用边界。
      </Lead>

      <h2>定位：一个一千行的极简框架</h2>
      <p>
        smolagents 由 Hugging Face 维护，是早期 <code>transformers.agents</code> 的继任者。
        到 2026 年大约是 1.26.x 版本，活跃迭代。它的设计哲学是「小而锋利」：
        不堆砌复杂的编排层，而是把一个能干活的 Agent 压缩到最小，让你能一眼读懂它在做什么。
      </p>

      <KeyIdea>
        smolagents 的核心范式是<strong>代码行动（code-as-action）</strong>：Agent 每一步不是输出
        结构化的工具调用，而是生成一段可执行的 Python 代码，由框架在执行器里运行，再把运行结果作为
        观察喂回模型。动作即代码，这就是整个框架的灵魂。
      </KeyIdea>

      <h2>代码行动 vs JSON 工具调用</h2>
      <p>
        主流 Agent 框架大多走 JSON 工具调用路线：模型每一步输出一个结构化对象，
        指明「调用哪个工具、传什么参数」，框架解析后执行，再把结果返回。这种方式清晰、可控，
        但有个天然限制——<strong>每一步只能发出一个调用</strong>，要做循环、条件分支、
        把一个工具的输出接到下一个工具的输入，都得拆成多轮来回。
      </p>
      <p>
        代码行动则把「一步」的表达力拉满：在一段 Python 代码里，你可以写 <code>for</code> 循环、
        写 <code>if</code> 判断、把一个函数的返回值<strong>直接</strong>传给另一个函数、顺手做中间计算。
        本来需要 LLM 来回好几轮才能完成的编排，模型在一段代码里就一次性写完了。
      </p>
      <p>
        Hugging Face 援引相关研究指出：相比 JSON 工具调用范式，代码行动大约能<strong>减少 30%
        的步数 / LLM 调用次数</strong>。少一次调用就少一次延迟、少一份 token 成本、也少一个出错环节。
      </p>

      <Example title="同一个动作：JSON vs 代码">
        <p>
          任务：查 3 个城市的天气，挑出最热的那个。
        </p>
        <p>
          <strong>JSON 工具调用</strong>：第 1 轮发 <code>{'{"tool":"get_weather","city":"A"}'}</code>，
          等结果；第 2 轮发 B；第 3 轮发 C；第 4 轮模型才在脑子里比大小给出答案。四轮起步。
        </p>
        <p>
          <strong>代码行动</strong>：模型一步写出
          <code>{'temps = {c: get_weather(c) for c in ["A","B","C"]}; hottest = max(temps, key=temps.get)'}</code>，
          循环、收集、比较一气呵成，一轮搞定。
        </p>
      </Example>

      <h2>核心抽象</h2>
      <h3>CodeAgent（旗舰）</h3>
      <p>
        框架的主角。每一步生成并执行一段 Python 代码来完成动作，是代码行动范式的承载者。
        多数实战场景都用它。
      </p>
      <h3>ToolCallingAgent（补充）</h3>
      <p>
        经典的 JSON 工具调用范式实现，作为补充存在。当你确实需要传统的结构化调用、
        或对接只支持工具调用接口的场景时使用。
      </p>
      <h3>Tool（工具）</h3>
      <p>
        用 <code>@tool</code> 装饰器或继承 <code>Tool</code> 类来定义。每个工具都有
        <code>name</code>、<code>description</code>、类型化的 <code>inputs</code> 和 <code>output</code>——
        这些信息会被拼进提示，让模型知道有哪些工具、怎么用。
      </p>
      <CodeBlock lang="python" title="用 @tool 定义一个工具" code={toolPseudo} />
      <h3>极简 ReAct 循环</h3>
      <p>
        底层是一个朴素的 think → act → observe 循环：模型思考并写代码（think），执行器运行代码（act），
        把结果喂回上下文（observe），直到模型调用 <code>final_answer()</code> 收尾。
      </p>
      <CodeBlock lang="python" title="ReAct 循环骨架" code={reactLoopPseudo} />
      <h3>模型类（模型无关）</h3>
      <p>
        smolagents 与模型解耦，提供大量模型适配类：<code>OpenAIServerModel</code>、
        <code>LiteLLMModel</code>、<code>InferenceClientModel</code>、<code>TransformersModel</code>、
        <code>VLLMModel</code> 等。同一套 Agent 代码，换个模型类就能从云端 API 切到本地推理。
      </p>

      <h2>安全：代码会被真的执行</h2>
      <p>
        代码行动的代价是：模型写出来的代码<strong>真的会被运行</strong>。所以 smolagents 内置了
        执行器与沙箱机制。<code>executor_type</code> 可选 <code>local</code>（<code>LocalPythonExecutor</code>，
        通过 AST 解析做导入白名单，用 <code>additional_authorized_imports</code> 放行额外模块）、
        以及 <code>e2b</code> / <code>docker</code> / <code>modal</code> 等远程沙箱。
      </p>

      <Callout variant="warn">
        本地执行器（<code>local</code>）即便有导入白名单，官方也明确警告它<strong>并不绝对安全</strong>——
        AST 白名单不是牢不可破的沙箱。生产环境务必使用远程沙箱（e2b / docker / modal），
        并且永远不要在没有隔离的情况下运行不可信来源的代码。
      </Callout>

      <h2>什么时候适合用它</h2>
      <p>
        <strong>适合</strong>：需要多步推理 + 中间计算 + 工具组合的任务，比如「检索数据→筛选→计算→
        判断」这类有编排逻辑的活；教学与原型，因为框架小、可读性强；以及模型无关的实验，
        想横向对比不同模型时换一行就行。
      </p>
      <p>
        <strong>不适合</strong>：重型企业级编排、需要复杂状态图 / 持久化工作流的场景——
        那是 LangGraph 这类框架的主场；安全要求极高却又不愿配置沙箱的环境；
        以及纯粹的单次简单调用——为了一次问答套上 CodeAgent 属于过度设计，直接调模型更划算。
      </p>

      <Callout variant="tip">
        下一章我们就动手：用 <code>OpenAIServerModel</code> 把 <code>api_base</code> 指向阿里云百炼的
        OpenAI 兼容端点，接上 Qwen 模型，写一个 <code>CodeAgent</code> 跑通一道真实的多步题，
        亲眼看看「代码行动」是怎么一段代码搞定的。
      </Callout>

      <Summary
        points={[
          'smolagents 是 HF 出品的极简框架（核心约 1000 行），是 transformers.agents 的继任者，2026 年约 1.26.x。',
          '核心范式是代码行动：Agent 把动作写成 Python 代码执行，而非输出 JSON 工具调用。',
          '代码行动能在一步里写循环 / 条件 / 链式传递，相比 JSON 调用约减少 30% 步数。',
          '核心抽象：CodeAgent（旗舰）、ToolCallingAgent（补充）、Tool（@tool）、ReAct 循环、多种模型类。',
          '代码会被真的执行：本地执行器有导入白名单但不绝对安全，生产务必用 e2b / docker 等远程沙箱。',
          '适合多步推理与工具组合、教学原型、模型无关实验；不适合重型编排、无沙箱的高安全场景、单次简单调用。',
        ]}
      />
    </article>
  )
}
