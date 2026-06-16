import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCmd = `pip install smolagents openai
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const demoCode = `import os

from smolagents import CodeAgent, OpenAIServerModel

# 用 OpenAIServerModel 接百炼的 OpenAI 兼容端点（api_base 指到 /compatible-mode/v1）。
model = OpenAIServerModel(
    model_id="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

# tools 为空：本例就是要展示「纯代码行动」——Agent 自己写 Python 算，而不是调外部工具。
# additional_authorized_imports 放行 math（本地执行器默认有导入白名单）。
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

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们讲清了「代码行动」的原理，这一章把它跑出来。我们用 smolagents 接上阿里云百炼的
        Qwen 模型，让一个 <code>CodeAgent</code> 去解一道需要循环、筛选、判断的多步题，
        直观看看它是怎么在一步代码里把活全干完的。
      </Lead>

      <h2>引子：一道有编排逻辑的题</h2>
      <p>
        我们出的题是：<strong>斐波那契数列前 30 项里哪些是质数，把它们列出来、求和，再判断这个和是不是质数</strong>。
        这道题有意思的地方在于它不是一次计算能出结果的——需要生成数列、逐个判素、收集、求和、再判一次素。
        正好用来对照「代码行动」相对 JSON 工具调用的优势。
      </p>

      <h2>安装与环境</h2>
      <p>
        装好 smolagents 和 openai（<code>OpenAIServerModel</code> 底层用 openai SDK），
        再把百炼的 API Key 放进环境变量。
      </p>
      <CodeBlock lang="bash" title="安装与环境变量" code={installCmd} />

      <h2>完整代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/01-smolagents/code_agent_demo.py"
        code={demoCode}
      />

      <h2>逐段讲解</h2>
      <h3>OpenAIServerModel 怎么接百炼</h3>
      <p>
        百炼提供了 OpenAI 兼容端点，所以我们不需要专门的百炼适配类，直接用通用的
        <code>OpenAIServerModel</code> 即可，三个参数到位就能接通：
      </p>
      <ul>
        <li><code>model_id="qwen-plus"</code>：选用的模型，这里是通义千问 Plus。</li>
        <li>
          <code>api_base=".../compatible-mode/v1"</code>：把请求指向百炼的<strong>兼容模式</strong>端点，
          注意结尾是 <code>/compatible-mode/v1</code>，这是 OpenAI 兼容协议的基地址。
        </li>
        <li>
          <code>api_key=os.environ["DASHSCOPE_API_KEY"]</code>：从环境变量读 Key，不要硬编码进代码。
        </li>
      </ul>
      <h3>为什么 tools=[]</h3>
      <p>
        本例<strong>故意</strong>不给任何工具。我们要展示的是「纯代码行动」——Agent 不靠外部工具，
        而是自己写 Python 把题算出来。这恰恰凸显了 CodeAgent 的本质：它的「动作」就是写代码本身，
        即使一个工具都没有，它照样能干活。
      </p>
      <h3>additional_authorized_imports=["math"] 的作用与安全含义</h3>
      <p>
        本地执行器默认带导入白名单，绝大多数模块是被挡住的。这道题模型可能想用 <code>math</code>
        里的开方来优化判素，所以我们显式放行 <code>math</code>。这也提醒了安全的一面：
        <strong>放行哪些模块由你决定</strong>，白名单越宽风险越大，所以只放行确实需要的。
      </p>
      <h3>agent.run(task) 触发什么</h3>
      <p>
        这一行启动 ReAct 循环：模型 think（思考并写一段 Python）→ act（执行器跑这段代码）→
        observe（把输出喂回去），如此往复，直到它调用 <code>final_answer()</code> 给出最终答案。
      </p>

      <KeyIdea>
        即便 <code>tools=[]</code>，CodeAgent 依然是一个完整的 Agent——因为它的动作不是「调工具」，
        而是「写并执行代码」。写代码这个能力本身，就足以完成大量带编排逻辑的任务。
      </KeyIdea>

      <h2>它内部大致会怎么跑</h2>
      <Example title="CodeAgent 的一步代码">
        <p>
          模型很可能在<strong>一步</strong>里就写出这样一段代码：定义一个 <code>is_prime</code> 函数、
          用循环生成斐波那契前 30 项、过滤出其中的质数、对它们求和、再对这个和调一次 <code>is_prime</code>，
          最后 <code>final_answer(...)</code> 把列表、和、判断结果一起返回。
        </p>
        <p>
          整个「生成→筛选→求和→再判断」的链条在一段代码里跑完。换成 JSON 工具调用，
          光是逐项判素就要来回好几轮，再加求和、再加最后那次判断，步数明显多得多。
          这就是代码行动省调用、省延迟的地方。
        </p>
      </Example>

      <h2>加工具的进阶</h2>
      <Callout variant="tip">
        本例为了讲清原理用了空工具列表，真实场景常常需要工具。你可以加内置的
        <code>WebSearchTool()</code> 做检索，或用 <code>@tool</code> 自定义一个函数，
        让 Agent 把「检索→计算」拼成一条链。生产环境记得把 <code>executor_type</code>
        换成 <code>"e2b"</code> 或 <code>"docker"</code> 沙箱，别用本地执行器跑不可信代码。
        示意：<code>{'CodeAgent(tools=[WebSearchTool()], model=model)'}</code>。
      </Callout>

      <Callout variant="note">
        关于接百炼的小提醒：<code>OpenAIServerModel</code> 在某些版本里也有别名 <code>OpenAIModel</code>，
        两者指向同一实现；canonical 的参数名是 <code>api_base</code>（不是 base_url）。
        若构造时报参数名相关的错，先 <code>help(OpenAIServerModel)</code> 核对一下当前版本的签名再调整。
      </Callout>

      <Summary
        points={[
          '用通用的 OpenAIServerModel 接百炼：model_id 选 qwen-plus，api_base 指到 /compatible-mode/v1，api_key 从环境变量读。',
          'tools=[] 是刻意为之，用来展示纯代码行动——Agent 靠自己写 Python 解题，无需外部工具。',
          'additional_authorized_imports 放行 math，对应本地执行器的导入白名单；白名单越宽风险越大，只放需要的。',
          'agent.run(task) 触发 think→写代码→执行→观察的 ReAct 循环，直到 final_answer 收尾。',
          'CodeAgent 很可能一步代码就完成生成数列+判素+求和+再判断，比 JSON 工具调用省下多轮来回。',
          '进阶可加 WebSearchTool 或 @tool 自定义工具做检索+计算拼接；生产用 e2b/docker 沙箱替代本地执行器。',
        ]}
      />
    </article>
  )
}
