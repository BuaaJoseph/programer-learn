import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const ragIndexCode = `from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

# 1) 读数据：把一个目录下的文件（pdf/md/txt/docx…）读成 Document 列表
docs = SimpleDirectoryReader("./docs").load_data()

# 2) 建索引：一行完成「切块 → 嵌入 → 写入向量库」
index = VectorStoreIndex.from_documents(docs)

# 3) 提问：query engine 内部 = 检索器召回相关块 + LLM 据此生成答案
qe = index.as_query_engine()
print(qe.query("这份资料里 forge 是用什么写的？"))`

const retrieverCode = `# query engine 是「检索 + 生成」的组合。如果只想要「召回的原始片段」，
# 拆出底层的 retriever 单独用：
retriever = index.as_retriever(similarity_top_k=3)
nodes = retriever.retrieve("forge 的核心是什么？")
for n in nodes:
    print(round(n.score, 3), n.text[:60])  # 相似度分数 + 命中的文本块`

const agentCode = `from llama_index.core.agent.workflow import FunctionAgent, ReActAgent, AgentWorkflow
from llama_index.core.tools import QueryEngineTool

# 把一个查询引擎包成 Agent 可调用的工具 —— 这是数据层与 Agent 层的接缝
tool = QueryEngineTool.from_defaults(
    index.as_query_engine(),
    name="docs",
    description="回答关于内部文档的问题时，用它检索资料。",
)

# A. 原生工具调用：模型支持 function-calling 时首选（Qwen / GPT 等）
fn_agent = FunctionAgent(tools=[tool], llm=llm)

# B. prompt 式 ReAct：不依赖原生工具调用，任意模型都能跑
react_agent = ReActAgent(tools=[tool], llm=llm)

# C. 多 Agent：按模型能力自动挑 agent 类型，可挂多个子 Agent / 工具
workflow = AgentWorkflow.from_tools_or_functions([tool], llm=llm)`

const workflowCode = `from llama_index.core.workflow import Workflow, StartEvent, StopEvent, Event, step

# 自定义事件：步骤之间靠它传递数据
class RetrievedEvent(Event):
    chunks: str

class RagFlow(Workflow):
    @step
    async def retrieve(self, ev: StartEvent) -> RetrievedEvent:
        nodes = index.as_retriever().retrieve(ev.query)
        return RetrievedEvent(chunks="\\n".join(n.text for n in nodes))

    @step
    async def generate(self, ev: RetrievedEvent) -> StopEvent:
        answer = await llm.acomplete(f"据此回答：\${ev.chunks}")
        return StopEvent(result=str(answer))

# 运行：w = RagFlow(); await w.run(query="forge 是什么？")`

const baillianCode = `import os
from llama_index.core import Settings
from llama_index.llms.openai_like import OpenAILike
from llama_index.embeddings.dashscope import DashScopeEmbedding

Settings.llm = OpenAILike(
    model="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    is_chat_model=True,            # 关键坑：不写就打到 /completions，404
    is_function_calling_model=True, # 声明支持原生工具调用
)
Settings.embed_model = DashScopeEmbedding(model_name="text-embedding-v3")`

export default function Ch1() {
  return (
    <article>
      <Lead>
        前几卷的框架都在回答「怎么让 Agent 推理、调用工具、协作」。LlamaIndex 回答的是
        另一个更现实的问题：当你的答案藏在一堆私有文档里，Agent 怎么先把它们「找出来」，
        再据此回答？这一卷我们走进数据 / RAG 驱动的 LlamaIndex —— 它不教模型怎么想，
        而是教模型怎么<strong>用你的数据</strong>去想。
      </Lead>

      <h2>一、定位：连接 LLM 与你的数据</h2>
      <p>
        LlamaIndex 的一句话定位是「<strong>连接 LLM 与你的数据</strong>」。通用大模型再
        强，也不知道你公司昨天的合同、内部 wiki、产品手册里写了什么 —— 这些数据没进过它的
        训练集。把这些私有数据「喂」给模型、让它据此作答，正是 LlamaIndex 的主场：企业文档
        问答、研究助手、合同 / 报告分析、知识库客服，都是它的典型用户。
      </p>
      <p>
        它不是又一个通用编排框架，而是一个<strong>以数据为中心的数据 / RAG 框架</strong>。
        RAG（Retrieval-Augmented Generation，检索增强生成）是它的灵魂：先检索、再生成。
        核心 meta 包 <code>llama-index</code> 在 2026 年是 v0.14.x，仍在活跃维护。
      </p>

      <KeyIdea>
        LlamaIndex 是<strong>以数据为中心</strong>的框架：先把你的数据变成可检索的索引，
        再让 Agent 去用它。所有抽象都围绕「数据 → 索引 → 检索 → 生成」这条主线展开。
      </KeyIdea>

      <h2>二、起源：从 GPT Index 到 LlamaIndex</h2>
      <p>
        LlamaIndex 由 <strong>Jerry Liu</strong> 在 <strong>2022 年</strong>创建，最初的名字
        叫 <strong>GPT Index</strong>。那是 ChatGPT 刚刚引爆之后，所有人都发现一个尴尬的
        事实：模型很会聊，但它<strong>不知道你的数据</strong>，而且上下文窗口塞不下整个知识库。
        GPT Index 要解决的就是这个问题 —— 给私有数据建一层「索引」，让模型按需取用。后来项目
        改名为 LlamaIndex，定位也明确为「连接 LLM 与你的数据」的数据框架。
      </p>
      <p>
        和 LangChain 的分工差异值得说清：LangChain 是<strong>通用编排框架</strong>，什么都能
        接、什么链都能拼，外延很广；LlamaIndex 则<strong>专注数据 / RAG 这一垂直方向</strong>，
        在「读数据、切块、嵌入、索引、检索」这条链路上做得更深、更顺手。一句话区分：要做
        知识库问答、文档检索，LlamaIndex 更对口；要做万能编排，LangChain 外延更大。两者也常
        被混用 —— 用 LlamaIndex 做检索层，外面套别的框架编排。
      </p>
      <p>
        一个 2026 年必须知道的变化：<strong>Workflows 已经被拆成独立、独立版本的包</strong>
        <code>llama-index-workflows</code>（v2.x，2026）。Workflows 1.0 于
        <strong>2025-06-30</strong> 发布，是一个事件驱动、异步优先的步骤式编排引擎。它既可以
        脱离 LlamaIndex 单独使用，也是 LlamaIndex 内部多 Agent 编排的底座。
      </p>

      <h2>三、设计理念：以数据为中心的 RAG</h2>
      <p>
        理解 LlamaIndex，先理解它的世界观：<strong>答案不在模型脑子里，在你的数据里</strong>。
        所以它的工作流程永远是「先把数据准备好，再让模型去用」。这套流程展开就是 RAG：
      </p>
      <ul>
        <li>
          <strong>R（Retrieval，检索）</strong>：拿到问题，先去你的数据里捞最相关的几段。
        </li>
        <li>
          <strong>A（Augmented，增强）</strong>：把这几段塞进 prompt，给模型当「参考资料」。
        </li>
        <li>
          <strong>G（Generation，生成）</strong>：模型据此生成答案 —— 答案有据可依，不是瞎编。
        </li>
      </ul>
      <p>
        为什么不直接把全部文档丢进 prompt？因为上下文窗口有限、又贵又慢，而且无关内容会
        干扰模型。RAG 的精髓就是「<strong>只取相关的那几段</strong>」—— 而「怎么高效地找到
        相关片段」正是索引和检索要解决的核心问题。
      </p>

      <h2>四、架构总览：数据层 + Agent 层</h2>
      <p>
        LlamaIndex 的架构可以清晰地切成两层。下图点任意组件可看它的职责：
      </p>
      <ArchDiagram framework="llamaindex" />
      <p>
        两层各司其职，靠一个数据流串起来：
      </p>
      <ul>
        <li>
          <strong>离线（建索引）数据流</strong>：文档 → 切块 → 嵌入（embedding）→ 写入
          向量索引。这一步把你的数据「预处理」成可检索的形态。
        </li>
        <li>
          <strong>在线（查询）数据流</strong>：问题 → 嵌入成向量 → 在索引里检索最相似的块
          → 把块 + 问题给 LLM → 生成回答。
        </li>
      </ul>
      <Example title="两层的分工">
        <ul>
          <li>
            <strong>数据 / RAG 层</strong>负责「<strong>找到相关片段</strong>」—— 把问题嵌入
            成向量，在索引里召回最相似的几段文档。它保证「答案有据可依」。
          </li>
          <li>
            <strong>Agent 层</strong>负责「<strong>决定何时检索、怎么用检索结果回答</strong>」
            —— Agent 判断要不要查、查哪个工具，拿到片段后组织成最终答案。它保证「答得自然、
            答得对路」。
          </li>
        </ul>
        <p>数据层 + Agent 层，缺一不可。接缝就是把查询引擎包成工具的 QueryEngineTool。</p>
      </Example>

      <h2>五、RAG 数据层逐个详解</h2>
      <table>
        <thead>
          <tr><th>组件</th><th>职责</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>SimpleDirectoryReader</code> / <code>Document</code></td>
            <td>读数据：从目录读各类文件，产出 Document 对象（一段带元数据的文本）。</td>
          </tr>
          <tr>
            <td>节点切分（Node Parser）</td>
            <td>把长文档切成小块（Node），每块大小适合嵌入和检索。</td>
          </tr>
          <tr>
            <td>Embedding（嵌入模型）</td>
            <td>把每块文本翻译成向量，让「语义相近」变成「向量相近」。</td>
          </tr>
          <tr>
            <td><code>VectorStoreIndex</code></td>
            <td>核心数据结构：把切块 + 嵌入后的向量存进向量库，可检索。</td>
          </tr>
          <tr>
            <td><code>Retriever</code> / QueryEngine</td>
            <td>Retriever 只召回相关块；QueryEngine = Retriever + LLM 生成答案。</td>
          </tr>
          <tr>
            <td>Ingestion Pipeline</td>
            <td>把「读取 → 清洗 → 切块 → 嵌入 → 写入」整条数据准备流程编排起来。</td>
          </tr>
        </tbody>
      </table>
      <h3>建索引 + 查询的最小片段</h3>
      <CodeBlock lang="python" code={ragIndexCode} />
      <p>
        <code>VectorStoreIndex.from_documents(docs)</code> 这一行就替你做掉了切块、嵌入、
        写入三件事；<code>as_query_engine()</code> 则把索引变成一个能直接提问的引擎。
      </p>
      <h3>只要召回片段：单独用 Retriever</h3>
      <CodeBlock lang="python" code={retrieverCode} />
      <p>
        Retriever 是 QueryEngine 的内部组件，也能单独用。它只负责「按问题召回相关块」并给出
        相似度分数，不调 LLM。需要自己掌控「拿到片段后怎么用」时，单独用 Retriever 最灵活。
      </p>

      <h2>六、Agent 层详解</h2>
      <p>
        数据层产出可检索的索引，Agent 层负责<strong>决策</strong>。LlamaIndex 提供三种 Agent：
      </p>
      <table>
        <thead>
          <tr><th>Agent 类型</th><th>机制</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>FunctionAgent</code></td>
            <td>基于模型<strong>原生 tool-calling</strong> 能力</td>
            <td>支持函数调用的模型（Qwen、GPT 等），首选。</td>
          </tr>
          <tr>
            <td><code>ReActAgent</code></td>
            <td><strong>prompt 式</strong> ReAct 推理，不依赖原生工具调用</td>
            <td>任意模型都能用，适配能力差的小模型。</td>
          </tr>
          <tr>
            <td><code>AgentWorkflow</code></td>
            <td>多 Agent 编排，<strong>按模型能力自动选</strong> agent 类型</td>
            <td>多角色协作、复杂任务。</td>
          </tr>
        </tbody>
      </table>
      <p>
        三者的接口高度一致。关键的接缝是 <code>QueryEngineTool</code>：它把一个查询引擎包成
        Agent 可调用的工具，Agent 就能在需要时「自己决定」去查文档。
      </p>
      <CodeBlock lang="python" code={agentCode} />

      <h2>七、Workflows：事件驱动的编排引擎</h2>
      <p>
        当一次任务不只是「问一句答一句」，而是「检索 → 生成 → 校验 → 重试」这种多步流水线，
        就该上 <strong>Workflows</strong>。它的特点：
      </p>
      <ul>
        <li>
          用 <code>@step</code> 装饰的方法<strong>消费 / 产出 Event 子类</strong>，以事件流
          驱动整个流程 —— 每个步骤声明「我吃什么事件、吐什么事件」，引擎据此自动连线。
        </li>
        <li>带<strong>类型 state（状态）</strong>，在步骤之间安全传递数据。</li>
        <li><strong>异步优先</strong>，步骤天然并发；支持<strong>资源注入</strong>（把 LLM、索引等依赖注入步骤）。</li>
        <li>
          内建<strong>可观测性</strong>，可接 <strong>OpenTelemetry / Phoenix</strong> 追踪
          每一步的输入输出与耗时。
        </li>
      </ul>
      <p>它特别适合编排复杂的「检索 → 生成 → 校验」流水线。一个最小 <code>@step</code> 骨架：</p>
      <CodeBlock lang="python" code={workflowCode} />
      <p>
        注意：<code>@step</code> 方法的<strong>返回事件类型</strong>就是「下一步吃什么」的依据
        —— <code>retrieve</code> 吐 <code>RetrievedEvent</code>，<code>generate</code> 就吃
        <code>RetrievedEvent</code>，引擎自动把它们串成一条流水线，直到某步返回
        <code>StopEvent</code>。
      </p>

      <h2>八、接百炼与坑</h2>
      <p>
        把 LlamaIndex 接到阿里云百炼，只需配两样：LLM 和嵌入模型。LLM 用
        <code>OpenAILike</code>（包 <code>llama-index-llms-openai-like</code>）指向百炼的兼容
        端点；嵌入用百炼原生的 <code>DashScopeEmbedding</code>（包
        <code>llama-index-embeddings-dashscope</code>）。
      </p>
      <CodeBlock lang="python" code={baillianCode} />
      <Callout variant="warn">
        <strong>必踩的坑：is_chat_model=True。</strong> 百炼兼容模式只暴露
        <code>/chat/completions</code> 端点。如果不写这一行，<code>OpenAILike</code> 会默认把
        请求打到老式的 <code>/completions</code> 端点，结果就是一个莫名其妙的 <strong>404</strong>，
        而且报错信息往往看不出根因，能让你白白浪费半小时。配套的
        <code>is_function_calling_model=True</code> 则告诉框架这个模型支持函数调用，
        <code>FunctionAgent</code> 才能真正用上工具。
      </Callout>

      <h2>九、适合 / 不适合与生态</h2>
      <p><strong>适合：</strong></p>
      <ul>
        <li>RAG / 知识库（私有文档、企业内部知识库）；</li>
        <li>文档问答、客服助手；</li>
        <li>研究助手（跨多份资料检索、归纳）；</li>
        <li>文档处理流水线（批量摄取、切块、索引）；</li>
        <li>多 Agent 报告生成（检索 + 写作 + 校对协作）。</li>
      </ul>
      <p><strong>不适合：</strong></p>
      <ul>
        <li>纯 ETL（只有数据搬运、没有检索 / 生成需求，杀鸡用牛刀）；</li>
        <li>模型训练 / 微调（这是训练框架的活，不是 LlamaIndex 的定位）；</li>
        <li>超简单的单次调用 chatbot（建索引这套机制是额外开销，不值当）。</li>
      </ul>
      <p>
        <strong>生态：</strong>官方还提供 <strong>LlamaParse</strong>（把复杂 PDF / 表格 /
        扫描件解析成干净文本，RAG 的「脏数据清洗」利器）、<strong>LlamaCloud</strong>（托管的
        解析 + 索引 + 检索服务），以及<strong>数百个 reader 与向量库集成</strong>（Notion、
        Google Drive、Slack、各种数据库；Pinecone、Chroma、Milvus、PGVector 等向量库）—— 你
        几乎不用自己写「怎么读这种数据源」的胶水代码。
      </p>

      <Summary
        points={[
          'LlamaIndex 由 Jerry Liu 于 2022 年创建（原名 GPT Index），定位「连接 LLM 与你的数据」，是数据 / RAG 驱动的框架，专做基于私有数据的知识助手与 Agent。',
          'RAG = 检索增强生成：先从你的数据里检索相关片段，再让模型据此回答，答案有据可依而非瞎编。',
          '架构分两层：数据 / RAG 层（SimpleDirectoryReader、Document、节点切分、Embedding、VectorStoreIndex、Retriever、QueryEngine、Ingestion）负责找片段；Agent 层（FunctionAgent / ReActAgent / AgentWorkflow）负责何时检索、怎么回答；接缝是 QueryEngineTool。',
          'Workflows 已拆为独立、独立版本的包 llama-index-workflows（v2.x，2026；1.0 于 2025-06-30 发布），是事件驱动、异步优先的 @step + Event 编排引擎，带类型 state、资源注入、OpenTelemetry/Phoenix 可观测。',
          '接百炼：LLM 用 OpenAILike 指向 compatible-mode/v1，必须 is_chat_model=True（否则 /completions 404），加 is_function_calling_model=True；嵌入用 DashScopeEmbedding(text-embedding-v3)。',
          '适合 RAG / 知识库 / 文档问答 / 研究助手 / 文档流水线；不适合纯 ETL、训练微调、极简单次 chatbot。生态有 LlamaParse、LlamaCloud 及数百个 reader / 向量库集成。',
        ]}
      />
    </article>
  )
}
