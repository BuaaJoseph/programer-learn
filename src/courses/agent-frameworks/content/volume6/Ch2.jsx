import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `pip install llama-index llama-index-llms-openai-like llama-index-embeddings-dashscope
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const mainCode = `import asyncio
import os

from llama_index.core import Document, Settings, VectorStoreIndex
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.core.tools import QueryEngineTool
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.llms.openai_like import OpenAILike

# LLM：OpenAILike 接百炼兼容端点。is_chat_model=True 是关键坑——
# 不写它，框架会打到 /completions 端点导致 404。
Settings.llm = OpenAILike(
    model="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    is_chat_model=True,
    is_function_calling_model=True,
)
# 向量嵌入：用百炼原生 DashScope 嵌入模型（读 DASHSCOPE_API_KEY）。
Settings.embed_model = DashScopeEmbedding(model_name="text-embedding-v3")

# 用几段内置文本当「你的文档」。真实项目可用 SimpleDirectoryReader("./docs").load_data()。
docs = [
    Document(text="forge 是一个用 Node+TypeScript 手写的编码 Agent CLI，核心是一个工具调用主循环。"),
    Document(text="百炼是阿里云的大模型平台，提供 Qwen 系列模型，并兼容 OpenAI 接口。"),
    Document(text="RAG 指检索增强生成：先从知识库检索相关片段，再让模型据此回答。"),
]
index = VectorStoreIndex.from_documents(docs)

# 把「查文档」封装成一个工具，交给 Agent 决定何时调用。
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

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，动手。这一章我们把几段文档建成索引，做一个真正能「查你文档」的
        Agent —— 它不会上来就瞎编，而是在需要时先检索资料再回答。一个程序，把数据层
        和 Agent 层串起来。
      </Lead>

      <h2>一、要做什么</h2>
      <p>
        目标是一个最小可跑的 chat-with-your-docs 助手：喂给它三段文本当「你的文档」，
        建成向量索引，再把索引包成一个名叫 <code>docs</code> 的工具交给{' '}
        <code>FunctionAgent</code>。当你问「forge 是用什么写的」，Agent 会自己决定
        调用 <code>docs</code> 工具去检索，拿到答案再组织成回复。

      </p>

      <h2>二、安装与环境</h2>
      <CodeBlock lang="bash" code={installCode} />
      <p>
        三个包分别是：核心 <code>llama-index</code>、接百炼用的{' '}
        <code>llama-index-llms-openai-like</code>、百炼原生嵌入{' '}
        <code>llama-index-embeddings-dashscope</code>。<code>DASHSCOPE_API_KEY</code>{' '}
        在百炼控制台获取，LLM 和嵌入模型都会读它。
      </p>

      <h2>三、完整代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/06-llamaindex/chat_with_docs.py"
        code={mainCode}
      />

      <h2>四、逐段讲解</h2>

      <h3>1. 全局设置 LLM</h3>
      <p>
        <code>Settings.llm</code> 是 LlamaIndex 的全局配置，设一次后处处生效。我们用{' '}
        <code>OpenAILike</code> 指向百炼的兼容端点{' '}
        <code>compatible-mode/v1</code>。
      </p>
      <Callout variant="warn">
        <strong>核心坑：is_chat_model=True。</strong> 百炼兼容模式只暴露{' '}
        <code>/chat/completions</code>。如果不写这一行，OpenAILike 会默认把请求打到老式的{' '}
        <code>/completions</code> 端点，结果就是一个莫名其妙的 404。
        <code>is_function_calling_model=True</code> 则告诉框架这个模型支持函数调用，
        Agent 才能真正用上工具。
      </Callout>

      <h3>2. 向量嵌入</h3>
      <p>
        <code>Settings.embed_model</code> 设成百炼原生的{' '}
        <code>DashScopeEmbedding</code>（<code>text-embedding-v3</code>）。
        为什么 RAG 需要嵌入？因为检索的本质是「找语义相近的片段」，必须先把文字变成
        向量，才能用向量相似度去匹配。嵌入模型就是这个「文字 → 向量」的翻译器，
        建索引和查询时都要用它，所以两边的嵌入模型必须一致。
      </p>

      <h3>3. 把文档建成索引</h3>
      <p>
        <code>Document(text=...)</code> 把每段文字包成文档对象。
        <code>VectorStoreIndex.from_documents(docs)</code> 一行完成了三件事：
        <strong>切块</strong>（把长文档切成小片）、<strong>嵌入</strong>
        （每片调嵌入模型变成向量）、<strong>建索引</strong>（存进向量库便于检索）。
        真实项目里把这三段文本换成{' '}
        <code>SimpleDirectoryReader("./docs").load_data()</code> 就能读整个目录。
      </p>

      <h3>4. 查询引擎与工具</h3>
      <p>
        <code>index.as_query_engine()</code> 得到一个检索问答引擎 —— 对它提问，
        它会先检索再让 LLM 生成回答。但我们不直接用它，而是用{' '}
        <code>QueryEngineTool.from_defaults</code> 把它<strong>包成一个工具</strong>。
        这里的 <code>name</code> 和 <code>description</code> 至关重要：它们是 Agent
        判断「该不该调这个工具」的唯一依据，描述要写清楚「什么时候用它」。
      </p>

      <h3>5. Agent 与异步运行</h3>
      <p>
        <code>FunctionAgent(tools=[query_tool], llm=...)</code> 创建 Agent，它负责
        <strong>决策</strong>：要不要查、查完怎么答。最后{' '}
        <code>await agent.run(...)</code> 发起一轮对话 —— 注意 <code>run</code>{' '}
        是异步的，所以要包在 <code>async def main</code> 里，用{' '}
        <code>asyncio.run(main())</code> 启动。
      </p>

      <KeyIdea>
        一条主线：<strong>文档 → Document → VectorStoreIndex（切块+嵌入+索引）→
        as_query_engine → QueryEngineTool → FunctionAgent</strong>。
        数据层产出一个工具，Agent 层消费这个工具，接缝就在 QueryEngineTool。
      </KeyIdea>

      <h2>五、一次真实的问答</h2>
      <Example title="一次检索增强问答">
        <p>当你运行这段程序，问出「forge 是用什么语言写的？它的核心是什么？」：</p>
        <ol>
          <li>Agent 收到问题，判断这需要查资料，于是调用 <code>docs</code> 工具；</li>
          <li>
            查询引擎把问题嵌入成向量，在索引里召回最相关的那条 —— 关于 forge 的描述；
          </li>
          <li>
            Agent 拿到检索片段，据此回答：「forge 用 <strong>Node + TypeScript</strong>{' '}
            写成，核心是一个<strong>工具调用主循环</strong>。」
          </li>
        </ol>
        <p>
          关键在于：这个答案<strong>来自你的文档</strong>，而不是模型凭记忆瞎编。
          换一个你文档里没写的问题，Agent 就检索不到对应片段 —— 这正是 RAG
          「有据可依」的价值。
        </p>
      </Example>

      <h2>六、进阶</h2>
      <Callout variant="tip">
        真实项目里，用 <code>SimpleDirectoryReader("./docs").load_data()</code>{' '}
        一次性读入整个目录的文档；想做多 Agent 协作，可以给{' '}
        <code>AgentWorkflow</code> 配多个工具和多个 Agent；想编排更复杂的
        「检索 → 生成 → 校验」流水线，就上 Workflows（<code>@step</code> +{' '}
        <code>Event</code>），把每一步显式建模成事件。
      </Callout>
      <Callout variant="note">
        嵌入其实也能走 <code>OpenAILike</code> 的嵌入端点，但接百炼时用{' '}
        <code>DashScopeEmbedding</code> 原生最省事，不用操心端点和参数。最后再提醒一遍
        那个会让你浪费半小时的坑：<strong>is_chat_model=True</strong>。
      </Callout>

      <Summary
        points={[
          '一个程序串起两层：用 Document + VectorStoreIndex.from_documents 把文档切块、嵌入、建索引（数据层），用 FunctionAgent 决策何时检索、怎么回答（Agent 层）。',
          '接缝是 QueryEngineTool：index.as_query_engine() 得到查询引擎，再 from_defaults 包成带 name/description 的工具交给 Agent。',
          '接百炼三件套：OpenAILike(is_chat_model=True, is_function_calling_model=True) 做 LLM、DashScopeEmbedding 做嵌入、DASHSCOPE_API_KEY 环境变量。',
          'RAG 让答案来自你的文档而非模型瞎编；agent.run 是异步的，需要 asyncio.run 启动。',
          '进阶：SimpleDirectoryReader 读整目录、AgentWorkflow 做多 Agent、Workflows(@step+Event) 编排复杂流水线；永远记住 is_chat_model=True 这个坑。',
        ]}
      />
    </article>
  )
}
