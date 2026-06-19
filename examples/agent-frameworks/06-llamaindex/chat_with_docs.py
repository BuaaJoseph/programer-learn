"""LlamaIndex · 数据/RAG 示例：把几段文档建成索引，做一个能查它们的 Agent，接百炼(Qwen)。

要点：
- 数据层：Document -> VectorStoreIndex -> query engine（检索）。
- Agent 层：把 query engine 包成 QueryEngineTool，交给 FunctionAgent。
- 接百炼：LLM 用 OpenAILike(is_chat_model=True)（关键！否则打到 completions 端点会 404）；
  嵌入用百炼原生 DashScopeEmbedding。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python chat_with_docs.py
"""
import asyncio
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
    asyncio.run(main())
