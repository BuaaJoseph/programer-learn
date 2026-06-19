import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

const decisionTree = `开始：我要选一个 Agent 框架
│
├─ 团队是 Java / Spring 栈？
│     └─ 是 ─────────────────────────────► Spring AI（企业 Java 集成）
│
├─ 任务以「私有文档问答 / 知识库 / RAG」为主？
│     └─ 是 ─────────────────────────────► LlamaIndex（数据驱动）
│
├─ 需要严格结构化输出 / 强类型 / 可单元测试？
│     └─ 是 ─────────────────────────────► PydanticAI（类型安全）
│
├─ 复杂长流程，要持久化 + 人审 + 确定性分支（控制力最强）？
│     └─ 是 ─────────────────────────────► LangGraph（图 / 状态机）
│
├─ 多角色协作 / 研究创作类任务？
│     └─ 是 ─────────────────────────────► CrewAI（角色 crews）
│
├─ 多 Agent 分诊路由，想用官方轻量方案？
│     └─ 是 ─────────────────────────────► OpenAI Agents SDK（轻量循环 + handoff）
│
└─ 想最轻，教学 / 原型，多步计算 / 工具组合？
      └─ 是 ─────────────────────────────► smolagents（代码行动）`;

export default function Ch1() {
  return (
    <article>
      <Lead>
        七个框架，我们一个一个拆过来了。smolagents 的代码行动、OpenAI Agents SDK 的轻量循环、
        PydanticAI 的类型安全、LangGraph 的图编排、CrewAI 的角色协作、LlamaIndex 的数据驱动、
        Spring AI 的企业集成——每一个都写过小 case。现在到了收尾卷：把它们摆在一张桌子上对比，
        给你一套能直接落地的选型方法。看完这一章，下次有人问你「这个项目该用哪个框架」，你能在三句话里答出来。
      </Lead>

      <KeyIdea>
        选框架，本质上不是选「哪个最强」，而是<strong>选范式</strong>。先想清楚三件事：
        任务是什么形态（问答 / 流程 / 协作 / 计算）、团队是什么技术栈（Python / Java）、
        要部署到什么环境（脚本 / 服务 / 企业后端）。这三点定了，框架基本就定了——
        剩下的差异多半是口味问题。
      </KeyIdea>

      <h2>一、七框架总览对比</h2>
      <p>先用一张表把全貌建立起来。每一行抓住「范式」和「最适合」两列，其余是辅助。</p>

      <table>
        <thead>
          <tr>
            <th>框架</th>
            <th>范式</th>
            <th>核心抽象</th>
            <th>最适合</th>
            <th>语言 / 生态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>smolagents</td>
            <td>代码行动（code-as-action）</td>
            <td>CodeAgent / Tool</td>
            <td>教学、原型、多步计算与工具组合，要最轻</td>
            <td>Python（Hugging Face）</td>
          </tr>
          <tr>
            <td>OpenAI Agents SDK</td>
            <td>轻量 Agent 循环</td>
            <td>Agent / handoff / guardrail</td>
            <td>多 Agent 分诊路由，想用官方极简方案</td>
            <td>Python（OpenAI）</td>
          </tr>
          <tr>
            <td>PydanticAI</td>
            <td>类型安全 / 结构化输出</td>
            <td>Agent + 依赖注入 + 输出模型</td>
            <td>要强类型、可测试、结构化结果的生产代码</td>
            <td>Python（Pydantic）</td>
          </tr>
          <tr>
            <td>LangGraph</td>
            <td>图 / 状态机</td>
            <td>StateGraph / Node / 持久化</td>
            <td>复杂长流程，要持久化、人审、确定性分支</td>
            <td>Python / JS（LangChain）</td>
          </tr>
          <tr>
            <td>CrewAI</td>
            <td>角色协作</td>
            <td>Agent / Task / Crew</td>
            <td>多角色分工、研究创作类协作任务</td>
            <td>Python（独立生态）</td>
          </tr>
          <tr>
            <td>LlamaIndex</td>
            <td>数据 / RAG 驱动</td>
            <td>Index / Retriever / QueryEngine</td>
            <td>私有文档问答、知识库、检索增强</td>
            <td>Python / TS（LlamaIndex）</td>
          </tr>
          <tr>
            <td>Spring AI</td>
            <td>企业 Java 集成</td>
            <td>ChatClient / Advisor / @Tool</td>
            <td>给现有 Spring Boot 后端加 AI 能力</td>
            <td>Java（Spring 生态）</td>
          </tr>
        </tbody>
      </table>

      <h2>二、选型决策树</h2>
      <p>
        把上面的表压成一条可执行的判断路径。从上往下走，第一个命中的就是你的首选——
        这棵树按「约束硬度」排序：技术栈和任务形态是硬约束，排在前面。
      </p>
      <CodeBlock lang="text" title="Agent 框架选型决策树">{decisionTree}</CodeBlock>

      <p>
        注意这棵树<strong>不是互斥的</strong>：很多真实项目会组合使用，比如用 LlamaIndex 做检索层、
        外面套 LangGraph 做流程编排。决策树给的是「主框架」，组合是常态。
      </p>

      <Example title="三个真实场景怎么选">
        <p>
          <strong>场景一：给现有 Spring Boot 电商后端加智能客服。</strong>
          团队是 Java 栈，要复用现有的订单 / 用户服务、事务与权限体系。
          走决策树第一条 → <strong>Spring AI</strong>。注入一个 ChatClient，配上 @Tool 调内部接口，
          业务代码几乎不动。换成 Python 框架反而要起一套新服务、跨语言调用，得不偿失。
        </p>
        <p>
          <strong>场景二：做一个查公司内部 wiki 的助手。</strong>
          核心是「把几千篇内部文档变成可问答的知识库」，RAG 是绝对主线。
          → <strong>LlamaIndex</strong>。它的索引、检索、查询引擎就是为这件事造的，
          文档加载器、分块、向量库集成一应俱全，省掉大量胶水代码。
        </p>
        <p>
          <strong>场景三：做一个需要人工审批的自动化运维 Agent。</strong>
          流程长（诊断 → 生成方案 → 等人确认 → 执行 → 回滚），要求执行高危操作前必须人审、
          中断后能恢复。这是控制力需求最强的场景 → <strong>LangGraph</strong>。
          它的状态持久化（checkpoint）和 interrupt 人审机制就是为这类流程设计的。
        </p>
      </Example>

      <Callout variant="note">
        本课聚焦这七个框架，但生态里还有几个主流选手按范式定位也值得你知道：
        <strong>Google ADK</strong>（Google 出品，代码优先的多 Agent，Vertex AI 生态）、
        <strong>Microsoft Agent Framework</strong>（AutoGen + Semantic Kernel 合并后的企业级继任者，
        支持 .NET 与 Python）、<strong>Strands Agents</strong>（AWS，模型驱动的 Agent 循环）、
        <strong>AG2</strong>（AutoGen 的社区分叉）。它们和本课某些框架范式有重叠，
        如果你绑定特定云厂商或语言生态，可按需去了解。
      </Callout>

      <Callout variant="warn">
        三条选型纪律：第一，<strong>别为了用框架而用框架</strong>——一次性脚本、单轮调用，
        直接裸 SDK（甚至一个 requests）更省心。第二，框架越重，调试与升级成本越高，
        简单任务用轻框架。第三，<strong>这个领域版本变动极快</strong>，认准稳定大版本（1.0+ GA 线），
        升级前务必读官方迁移说明（migration guide），别盲目追最新。
      </Callout>

      <Summary points={[
        '选框架本质是选范式：先定任务形态、团队技术栈、部署环境，框架基本就定了。',
        '七框架定位：smolagents（代码行动·最轻）、OpenAI Agents SDK（轻量循环+handoff）、PydanticAI（类型安全）、LangGraph（图编排·控制力最强）、CrewAI（角色协作）、LlamaIndex（RAG 数据驱动）、Spring AI（企业 Java）。',
        '决策树按约束硬度排序：Java→Spring AI；RAG→LlamaIndex；强类型→PydanticAI；长流程+人审→LangGraph；多角色→CrewAI；分诊路由→OpenAI Agents SDK；最轻原型→smolagents。',
        '决策树给的是主框架，真实项目常组合（如 LlamaIndex 检索 + LangGraph 编排）。',
        '生态里还有 Google ADK、Microsoft Agent Framework、Strands、AG2 等按云/语言生态可选。',
        '纪律：别为用框架而用框架，简单任务裸 SDK 更省；认准稳定大版本，升级读迁移说明。',
      ]} />
    </article>
  );
}
