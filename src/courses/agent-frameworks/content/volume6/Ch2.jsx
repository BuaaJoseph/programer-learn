import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `# 三个包：核心框架 + 接百炼的 OpenAILike + 百炼原生嵌入
pip install llama-index llama-index-llms-openai-like llama-index-embeddings-dashscope

# 百炼控制台拿到的 key，LLM 和嵌入模型都会读它
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const mainCode = `import asyncio
import os

from llama_index.core import Document, Settings, VectorStoreIndex
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.core.tools import QueryEngineTool
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.llms.openai_like import OpenAILike

Settings.llm = OpenAILike(
    model="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    is_chat_model=True,
    is_function_calling_model=True,
)
Settings.embed_model = DashScopeEmbedding(model_name="text-embedding-v3")

docs = [
    Document(text="forge 是一个用 Node+TypeScript 手写的编码 Agent CLI，核心是一个工具调用主循环。"),
    Document(text="百炼是阿里云的大模型平台，提供 Qwen 系列模型，并兼容 OpenAI 接口。"),
    Document(text="RAG 指检索增强生成：先从知识库检索相关片段，再让模型据此回答。"),
]
index = VectorStoreIndex.from_documents(docs)

query_tool = QueryEngineTool.from_defaults(
    index.as_query_engine(),
    name="docs",
    description="回答关于 forge、百炼、RAG 的问题时，用它检索资料。",
)
agent = FunctionAgent(tools=[query_tool], llm=Settings.llm)


async def main() -> None:
    resp = await agent.run("forge 是用什么语言写的？它的核心是什么？")
    print(resp)


if __name__ == "__main__":
    asyncio.run(main())`

const readDirCode = `from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

# 把三段内置文本换成「读真实目录」：自动识别 .txt/.md/.pdf/.docx 等
docs = SimpleDirectoryReader("./docs").load_data()
index = VectorStoreIndex.from_documents(docs)

# 其余完全不变：as_query_engine → QueryEngineTool → FunctionAgent`

const queryOnlyCode = `# 对照：不要 Agent，直接用 query engine
# 适合「问一句答一句、不需要决策何时检索」的纯 RAG 场景
qe = index.as_query_engine()
print(qe.query("forge 是用什么语言写的？"))
# query engine 内部固定执行「检索 → 生成」，不会像 Agent 那样判断「要不要查」`

const persistCode = `from llama_index.core import StorageContext, load_index_from_storage

# 建好索引后落盘，避免每次启动都重新嵌入（嵌入要花钱花时间）
index.storage_context.persist(persist_dir="./storage")

# 下次直接从磁盘加载，秒级恢复
storage = StorageContext.from_defaults(persist_dir="./storage")
index = load_index_from_storage(storage)  # embed_model 仍取 Settings.embed_model`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，动手。这一章我们把几段文档建成索引，做一个真正能「查你文档」的
        Agent —— 它不会上来就瞎编，而是在需要时先检索资料再回答。一个完整的小程序，
        把数据层和 Agent 层串起来，跑在百炼上。
      </Lead>

      <h2>一、要做什么</h2>
      <p>
        目标是一个最小可跑的 <strong>chat-with-your-docs</strong> 助手：喂给它三段文本当
        「你的文档」，建成向量索引，再把索引包成一个名叫 <code>docs</code> 的工具交给
        <code>FunctionAgent</code>。当你问「forge 是用什么写的」，Agent 会自己决定调用
        <code>docs</code> 工具去检索，拿到答案再组织成回复。整条主线就是上一章那条：
        <strong>文档 → 索引 → 工具 → Agent</strong>。
      </p>

      <h2>二、安装与环境</h2>
      <CodeBlock lang="bash" code={installCode} />
      <p>
        三个包分别是：核心 <code>llama-index</code>、接百炼用的
        <code>llama-index-llms-openai-like</code>、百炼原生嵌入
        <code>llama-index-embeddings-dashscope</code>。注意 LlamaIndex 把各种集成拆成了独立
        小包，<strong>用哪个集成就要装哪个包</strong> —— 这点后面调试章节会再强调。
        <code>DASHSCOPE_API_KEY</code> 在百炼控制台获取，LLM 和嵌入模型都会读它。
      </p>

      <h2>三、完整代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/06-llamaindex/chat_with_docs.py"
        code={mainCode}
      />

      <h2>四、逐段讲解</h2>

      <h3>1. Settings 全局配置</h3>
      <p>
        <code>Settings</code> 是 LlamaIndex 的<strong>全局配置单例</strong>，设一次后处处生效。
        把 <code>Settings.llm</code> 和 <code>Settings.embed_model</code> 配好，后面建索引、
        建 Agent 就不用再到处传 <code>llm=</code> 参数 —— 框架内部默认就取这两个全局值。这是
        LlamaIndex 「约定优于配置」的体现。
      </p>

      <h3>2. LLM 与 is_chat_model 坑</h3>
      <p>
        我们用 <code>OpenAILike</code> 指向百炼的兼容端点 <code>compatible-mode/v1</code>。
        <code>OpenAILike</code> 的意思就是「一个长得像 OpenAI 接口、但不是官方 OpenAI」的服务。
      </p>
      <Callout variant="warn">
        <strong>核心坑：is_chat_model=True。</strong> 百炼兼容模式只暴露
        <code>/chat/completions</code>。如果不写这一行，<code>OpenAILike</code> 会默认把请求
        打到老式的 <code>/completions</code> 端点，结果就是一个莫名其妙的 <strong>404</strong>。
        <code>is_function_calling_model=True</code> 则告诉框架这个模型支持函数调用，
        <code>FunctionAgent</code> 才能真正用上工具 —— 不写它，Agent 可能退化成不会调工具。
      </Callout>

      <h3>3. 嵌入为何需要</h3>
      <p>
        <code>Settings.embed_model</code> 设成百炼原生的 <code>DashScopeEmbedding</code>
        （<code>text-embedding-v3</code>）。为什么 RAG 一定要嵌入？因为检索的本质是「找语义
        相近的片段」，而计算机不懂语义、只会算数。嵌入模型就是那个「<strong>文字 → 向量</strong>」
        的翻译器，把每段文字变成一串数字（向量），语义相近的文字向量也相近，于是「找相似文字」
        就变成了「算向量距离」。
      </p>
      <KeyIdea>
        建索引和查询时<strong>必须用同一个嵌入模型</strong>。如果建索引用 A、查询用 B，两套
        向量空间对不上，检索结果就是一堆噪声。所以嵌入模型一旦定了，就别中途换。
      </KeyIdea>

      <h3>4. from_documents 做了什么</h3>
      <p>
        <code>Document(text=...)</code> 把每段文字包成文档对象。
        <code>VectorStoreIndex.from_documents(docs)</code> 一行完成了三件事：
        <strong>切块</strong>（把长文档切成小片 Node）、<strong>嵌入</strong>（每片调嵌入模型
        变成向量）、<strong>建索引</strong>（存进向量库便于检索）。这一行背后其实就是完整的
        ingestion 流程，只是被高度封装了。
      </p>

      <h3>5. QueryEngineTool</h3>
      <p>
        <code>index.as_query_engine()</code> 得到一个检索问答引擎 —— 对它提问，它会先检索再让
        LLM 生成回答。但我们不直接用它，而是用 <code>QueryEngineTool.from_defaults</code>
        把它<strong>包成一个工具</strong>。这里的 <code>name</code> 和 <code>description</code>
        至关重要：它们是 Agent 判断「<strong>该不该调这个工具</strong>」的唯一依据，描述要写清楚
        「什么时候用它」，否则 Agent 可能该查的时候不查、不该查的时候乱查。
      </p>

      <h3>6. FunctionAgent 与 async run</h3>
      <p>
        <code>FunctionAgent(tools=[query_tool], llm=...)</code> 创建 Agent，它负责
        <strong>决策</strong>：要不要查、查完怎么答。最后 <code>await agent.run(...)</code>
        发起一轮对话 —— 注意 <code>run</code> 是<strong>异步</strong>的，所以要包在
        <code>async def main</code> 里，用 <code>asyncio.run(main())</code> 启动。忘了
        <code>await</code> 是新手最常见的错（见调试章节）。
      </p>

      <KeyIdea>
        一条主线：<strong>文档 → Document → VectorStoreIndex（切块+嵌入+索引）→
        as_query_engine → QueryEngineTool → FunctionAgent</strong>。数据层产出一个工具，
        Agent 层消费这个工具，接缝就在 QueryEngineTool。
      </KeyIdea>

      <h2>五、预期输出</h2>
      <Example title="一次检索增强问答">
        <p>当你运行这段程序，问出「forge 是用什么语言写的？它的核心是什么？」：</p>
        <ol>
          <li>Agent 收到问题，判断这需要查资料，于是调用 <code>docs</code> 工具；</li>
          <li>查询引擎把问题嵌入成向量，在索引里召回最相关的那条 —— 关于 forge 的描述；</li>
          <li>
            Agent 拿到检索片段，据此回答：「forge 用 <strong>Node + TypeScript</strong> 写成，
            核心是一个<strong>工具调用主循环</strong>。」
          </li>
        </ol>
        <p>
          关键在于：这个答案<strong>来自你的文档，而不是模型凭记忆瞎编</strong>。换一个你文档里
          没写的问题（比如「forge 的作者是谁」），Agent 检索不到对应片段，要么如实说不知道，
          要么明确表示资料里没有 —— 这正是 RAG「有据可依」的价值。
        </p>
      </Example>

      <h2>六、变体一：读真实目录</h2>
      <p>
        三段内置文本只是 demo。真实项目里你不会手写 <code>Document</code>，而是用
        <code>SimpleDirectoryReader</code> 一次性读入整个目录，它会自动识别
        <code>.txt</code> / <code>.md</code> / <code>.pdf</code> / <code>.docx</code> 等格式：
      </p>
      <CodeBlock lang="python" code={readDirCode} />
      <p>
        换掉的只有「造数据」那两行，<code>QueryEngineTool</code> 和 <code>FunctionAgent</code>
        的部分一字不改 —— 这正是分层设计的好处：数据来源换了，上层逻辑无感。
      </p>

      <h2>七、变体二：纯 query engine 与持久化</h2>
      <h3>不用 Agent，直接查</h3>
      <p>
        如果你的场景就是「问一句答一句」，根本不需要 Agent 去决策「要不要查」，那直接用 query
        engine 更轻：
      </p>
      <CodeBlock lang="python" code={queryOnlyCode} />
      <p>
        区别在于：query engine <strong>每次都固定执行「检索 → 生成」</strong>；而 Agent 会先
        判断「这个问题要不要查文档」，可能直接答、也可能调多个工具。需要决策和多工具，才上 Agent。
      </p>
      <h3>持久化索引：别每次都重新嵌入</h3>
      <p>
        嵌入是要<strong>花钱花时间</strong>的（每段文本都得调一次嵌入接口）。文档不变时，建好的
        索引应该落盘，下次直接加载：
      </p>
      <CodeBlock lang="python" code={persistCode} />

      <h2>八、常见报错与调试</h2>
      <ul>
        <li>
          <strong>404 / 接口找不到</strong>：十有八九是漏了 <code>is_chat_model=True</code>，
          请求被打到 <code>/completions</code> 而百炼只有 <code>/chat/completions</code>。
          这是头号坑，先查这个。
        </li>
        <li>
          <strong>嵌入相关报错（401 / 模型不存在）</strong>：检查 <code>DASHSCOPE_API_KEY</code>
          是否设置正确，以及嵌入模型名是否写对（<code>text-embedding-v3</code>）。
        </li>
        <li>
          <strong>ModuleNotFoundError / ImportError</strong>：LlamaIndex 把集成拆成独立小包，
          <strong>找不到包就装对应集成包</strong> —— 用 <code>OpenAILike</code> 要装
          <code>llama-index-llms-openai-like</code>，用 <code>DashScopeEmbedding</code> 要装
          <code>llama-index-embeddings-dashscope</code>。
        </li>
        <li>
          <strong>Agent 不调工具 / 直接瞎答</strong>：检查 <code>is_function_calling_model=True</code>
          有没有写；再看 <code>QueryEngineTool</code> 的 <code>description</code> 是否写清楚了
          「什么时候用它」。
        </li>
        <li>
          <strong>协程没跑 / 返回 coroutine 对象</strong>：<code>agent.run</code> 是异步的，
          忘了 <code>await</code> 会拿到一个协程对象而不是结果，记得包在 <code>async</code> 函数
          里并用 <code>asyncio.run</code> 启动。
        </li>
      </ul>

      <Callout variant="tip">
        想再进一步：给 <code>AgentWorkflow</code> 配多个工具和多个 Agent 做协作；想编排
        「检索 → 生成 → 校验」流水线，就上 Workflows（<code>@step</code> + <code>Event</code>），
        把每一步显式建模成事件，还能接 OpenTelemetry / Phoenix 看每步耗时。
      </Callout>

      <Summary
        points={[
          '一个程序串起两层：用 Document + VectorStoreIndex.from_documents 把文档切块、嵌入、建索引（数据层），用 FunctionAgent 决策何时检索、怎么回答（Agent 层）。',
          '接缝是 QueryEngineTool：index.as_query_engine() 得到查询引擎，再 from_defaults 包成带 name/description 的工具交给 Agent；name/description 是 Agent 判断「该不该调」的唯一依据。',
          '接百炼三件套：OpenAILike(is_chat_model=True, is_function_calling_model=True) 做 LLM、DashScopeEmbedding 做嵌入、DASHSCOPE_API_KEY 环境变量；建索引和查询必须用同一个嵌入模型。',
          '变体：SimpleDirectoryReader 读真实目录、纯 query engine 不用 Agent（每次固定检索→生成）、persist/load 持久化索引避免重复嵌入花钱。',
          '调试清单：404 查 is_chat_model、嵌入报错查 key/模型名、ImportError 装对应集成包、Agent 不调工具查 is_function_calling_model 和 description、协程没跑查 await/asyncio.run。',
        ]}
      />
    </article>
  )
}
