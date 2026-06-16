import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果说前几卷的框架都在回答「怎么让 Agent 推理、调用工具、协作」，那么
        LlamaIndex 回答的是另一个更现实的问题：当你的答案藏在一堆私有文档里，
        Agent 怎么先把它们「找出来」，再据此回答？这一卷我们走进数据 / RAG 驱动的
        LlamaIndex。
      </Lead>

      <h2>一、定位：连接 LLM 与你的数据</h2>
      <p>
        LlamaIndex 的一句话定位是「连接 LLM 与你的数据」。它不是又一个通用编排框架，
        而是把重心放在<strong>基于私有数据的知识助手与 Agent</strong>上：企业文档问答、
        研究助手、合同 / 报告分析这类场景，正是它的主场。核心包{' '}
        <code>llama-index</code> 在 2026 年仍然活跃维护。
      </p>
      <p>
        一个需要特别注意的变化：<strong>Workflows 已经被拆成独立包</strong>
        （<code>llama-index-workflows</code>，在 2025-06 发布了 1.0）。它是一个
        事件驱动、异步优先的步骤式编排引擎，既可以单独用，也是 LlamaIndex 内部
        多 Agent 编排的底座。

      </p>

      <KeyIdea>
        LlamaIndex 是<strong>以数据为中心</strong>的框架：先把你的数据变成可检索的
        索引，再让 Agent 去用它。所有抽象都围绕「数据 → 索引 → 检索 → 生成」这条
        主线展开。
      </KeyIdea>

      <h2>二、核心抽象</h2>

      <h3>数据 / RAG 层</h3>
      <ul>
        <li>
          <strong>VectorStoreIndex</strong>：把文档切块、嵌入（embedding）、建成
          向量索引的核心数据结构。
        </li>
        <li>
          <strong>query engine（查询引擎）</strong>：对一个索引提问，它负责检索 +
          调用 LLM 生成回答。
        </li>
        <li>
          <strong>retriever（检索器）</strong>：只负责「按问题召回相关片段」，是
          query engine 的内部组件，也可单独使用。
        </li>
        <li>
          <strong>ingestion（摄取）</strong>：读取文档、清洗、切块、嵌入、写入索引
          的整条数据准备流程。
        </li>
      </ul>

      <h3>Agent 层</h3>
      <ul>
        <li>
          <strong>FunctionAgent</strong>：基于模型原生 tool-calling 能力的 Agent，
          适合支持函数调用的模型（如 Qwen、GPT 系列）。
        </li>
        <li>
          <strong>ReActAgent</strong>：prompt 式的 ReAct 推理，不依赖原生工具调用，
          <strong>任意模型</strong>都能用。
        </li>
        <li>
          <strong>AgentWorkflow</strong>：多 Agent 编排，会按模型能力
          <strong>自动选择 agent 类型</strong>（能 tool-call 就用 FunctionAgent，
          否则退回 ReAct）。
        </li>
      </ul>

      <h3>Workflows</h3>
      <ul>
        <li>
          用 <code>@step</code> 装饰的方法消费 / 产出 <strong>Event 子类</strong>，
          以事件流的方式驱动整个流程。
        </li>
        <li>带类型的 <strong>state（状态）</strong>，在步骤之间安全传递数据。</li>
        <li>支持<strong>资源注入</strong>（把 LLM、索引等依赖注入到步骤中）。</li>
        <li>
          内建<strong>可观测性</strong>，可接 OpenTelemetry / Phoenix 追踪每一步。
        </li>
      </ul>

      <h3>Tools 与 Memory</h3>
      <p>
        和其它框架一样，LlamaIndex 也提供 <strong>Tools</strong>（把任意函数或
        query engine 包成 Agent 可调用的工具）和 <strong>Memory</strong>
        （对话记忆 / 历史管理）。它最大的特色，是能把一个「查询引擎」直接包成工具
        交给 Agent —— 这正是数据层与 Agent 层的接缝。
      </p>

      <h2>三、范式：数据驱动 + 事件驱动</h2>
      <p>
        LlamaIndex 同时融合了两种范式：底层是<strong>数据驱动</strong>
        （索引 / 检索决定 Agent 能看到什么），上层是<strong>事件驱动的异步
        Workflows</strong>（编排决定流程怎么走）。理解 RAG 的关键，是看清它的两层结构。
      </p>

      <Example title="RAG 的两层">
        <p>
          一次「查文档」的问答其实分工明确：
        </p>
        <ul>
          <li>
            <strong>数据层</strong>负责「找到相关片段」—— 把问题嵌入成向量，在索引里
            召回最相似的几段文档。
          </li>
          <li>
            <strong>Agent 层</strong>负责「决定何时检索、怎么用检索结果回答」——
            Agent 看到问题后判断要不要查、查哪个工具，拿到片段后组织成最终答案。
          </li>
        </ul>
        <p>
          数据层保证「答案有据可依」，Agent 层保证「答得自然、答得对路」。两层缺一不可。
        </p>
      </Example>

      <h2>四、适合与不适合</h2>
      <p>
        <strong>适合：</strong>
      </p>
      <ul>
        <li>RAG / 知识助手（私有文档、企业内部知识库）；</li>
        <li>研究助手（跨多份资料检索、归纳）；</li>
        <li>文档处理流水线（批量摄取、切块、索引）；</li>
        <li>多 Agent 报告生成（检索 + 写作 + 校对协作）；</li>
        <li>人审内容流水线（检索生成草稿 → 人工审核 → 发布）。</li>
      </ul>
      <p>
        <strong>不适合：</strong>
      </p>
      <ul>
        <li>纯 ETL（只有数据搬运、没有检索 / 生成需求）；</li>
        <li>模型训练 / 微调（这是训练框架的活，不是 LlamaIndex 的定位）；</li>
        <li>
          超极简单次调用的 chatbot —— 建索引这套机制是额外开销，杀鸡用牛刀。
        </li>
      </ul>

      <h2>五、接百炼预告</h2>
      <Callout variant="warn">
        下一章我们用 <code>OpenAILike</code> 把 LlamaIndex 接到阿里云百炼。这里先
        埋一个<strong>必踩的坑</strong>：一定要写{' '}
        <code>is_chat_model=True</code>！否则框架会把请求打到{' '}
        <code>/completions</code> 端点，而百炼兼容模式只有{' '}
        <code>/chat/completions</code>，直接 404。嵌入（embedding）则推荐用百炼原生的{' '}
        <code>DashScopeEmbedding</code>，最省事。
      </Callout>

      <Summary
        points={[
          'LlamaIndex 定位「连接 LLM 与你的数据」，是数据 / RAG 驱动的框架，专做基于私有数据的知识助手与 Agent。',
          '核心分两层：数据 / RAG 层（VectorStoreIndex、query engine、retriever、ingestion）负责找片段，Agent 层（FunctionAgent / ReActAgent / AgentWorkflow）负责何时检索、怎么回答。',
          'Workflows 已拆为独立包 llama-index-workflows（2025-06 的 1.0），是事件驱动、异步优先的 @step + Event 编排引擎，自带可观测性。',
          '范式 = 数据驱动（索引 / 检索）+ 事件驱动异步编排；适合 RAG、研究助手、文档流水线、多 Agent 报告，不适合纯 ETL、训练微调、极简单次 chatbot。',
          '接百炼记住两点：OpenAILike 必须 is_chat_model=True，嵌入用 DashScopeEmbedding。',
        ]}
      />
    </article>
  )
}
