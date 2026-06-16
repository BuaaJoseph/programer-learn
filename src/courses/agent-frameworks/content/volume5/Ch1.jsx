import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

export default function Ch1() {
  return (
    <article>
      <Lead>
        CrewAI 是一个已经完全脱离 LangChain 的独立框架——它自己重写了底层，主打精简、快、零臃肿依赖。它的世界观很直接：把一群有「人设」的自治 Agent 组织成一支团队，让它们像真实团队那样分工协作，完成研究、写作、分析这类需要多视角的工作。
      </Lead>

      <h2>它是什么</h2>
      <p>
        CrewAI 是当下最活跃的多 Agent 编排框架之一（约 5 万星），社区迭代很快，目前稳定在 1.x 线（2026 年最新约 1.14.x）。早期它依赖 LangChain，如今已彻底独立实现。
      </p>
      <p>
        近期两个值得注意的变化：其一，<strong>LiteLLM 不再是强制依赖</strong>——框架提供了原生 SDK 集成，LiteLLM 变成可选项；其二，<strong>统一了 Memory</strong>，记忆机制被收敛成一套一致的接口。
      </p>

      <KeyIdea>
        CrewAI 的核心心法：用「角色 + 任务 + 流程」来组织一队会协作的 Agent。你定义谁（Agent）、做什么（Task）、怎么配合（Process），框架负责让它们跑起来并接力传递产出。
      </KeyIdea>

      <h2>核心抽象</h2>

      <h3>Agent：一个有人设的角色</h3>
      <ul>
        <li><strong>role / goal / backstory</strong>：角色定位、目标、背景故事——这三件套塑造出 Agent 的「人设」，决定它说话和思考的方式。</li>
        <li><strong>tools</strong>：这个角色能调用的工具集合。</li>
        <li><strong>memory</strong>：是否启用记忆，让角色在多轮中保留上下文。</li>
      </ul>

      <h3>Task：一件要完成的事</h3>
      <ul>
        <li><strong>description</strong>：任务描述，告诉 Agent 要做什么。</li>
        <li><strong>expected_output</strong>：期望产出的样子，给 Agent 一个明确的交付标准。</li>
        <li><strong>agent</strong>：把这件事指派给哪个 Agent 来做。</li>
      </ul>

      <h3>Crew：一支团队</h3>
      <ul>
        <li>一组 <strong>agents</strong> + 一组 <strong>tasks</strong> + 一个执行策略。Crew 就是把角色和任务装在一起、按策略跑起来的容器。</li>
      </ul>

      <h3>Process：怎么配合</h3>
      <ul>
        <li><strong>sequential</strong>（顺序）：任务一个接一个执行，前一个的产出可以喂给后一个。</li>
        <li><strong>hierarchical</strong>（层级）：有一个 manager 负责把任务委派给合适的成员、协调全局。</li>
      </ul>

      <h3>Flows：事件驱动的确定性编排</h3>
      <ul>
        <li>用 <code>@start</code> / <code>@listen</code> / <code>@router</code> 加上状态，把流程拆成可控的事件链——什么先跑、谁监听谁、何处分支，都由你精确定义。</li>
      </ul>

      <h3>统一的 Memory 与 Tools</h3>
      <ul>
        <li><strong>Memory</strong>：跨任务、跨轮次的记忆，已被收敛成统一接口。</li>
        <li><strong>Tools</strong>：内置与自定义工具，挂到 Agent 上扩展能力。</li>
      </ul>

      <Example title="Crews vs Flows：什么时候用哪个">
        <p>
          这是 CrewAI 里最容易混淆、也最关键的一组概念。
        </p>
        <p>
          <strong>Crews</strong> 是自治协作团队：你给一群角色定好人设和任务，剩下的交给它们自己商量、接力、涌现。适合那些没有标准答案、需要创造性和多视角的工作——头脑风暴、内容生成、综合分析。
        </p>
        <p>
          <strong>Flows</strong> 是确定性的事件驱动流程控制：每一步走向都被显式编排，可预测、可复现。适合需要严格分支、状态管理、精确控制的场景。
        </p>
        <p>
          官方推荐的最佳实践是<strong>「把 Crew 包在 Flow 里」</strong>：用 Flow 搭好确定性的骨架（什么时候触发、怎么分支、状态怎么流转），在某个节点里调用一个 Crew 去完成那段需要自治协作的「软」工作。这样既有可控性，又保留了多 Agent 协作的灵活性。
        </p>
      </Example>

      <h2>它的范式</h2>
      <p>
        一句话概括：<strong>角色扮演式的多 Agent 协作</strong>。不是一个全能 Agent 包打天下，而是让几个各有专长的角色像团队一样分工配合。
      </p>

      <h2>适合与不适合</h2>
      <p>
        <strong>适合</strong>：协作、创作、分析类的多 Agent 工作——技术研究、内容生成、多视角推理。这类任务受益于「分工 + 涌现」，多个角色比一个角色想得更全面。
      </p>
      <p>
        <strong>不适合</strong>：严格确定性的流水线、刚性的输出格式、需要精确分支的逻辑，或者简单的单步任务。多 Agent 的自治会引入额外的成本与不确定性——杀鸡用牛刀，反而更慢更贵更不稳。这类场景要么用 Flows，要么干脆别上多 Agent。
      </p>

      <Callout variant="tip">
        下一章我们就动手：用 <code>LLM(model="openai/qwen-plus", base_url=百炼)</code> 接上阿里云百炼的 Qwen 模型，搭一个两角色顺序协作的 Crew（研究员 + 撰稿人）。提醒一句：<strong>model 一定要带 openai/ 前缀</strong>——这是让 CrewAI 走 OpenAI 兼容协议去访问百炼的关键，缺了它就连不上。
      </Callout>

      <Summary
        points={[
          'CrewAI 是已脱离 LangChain 的独立多 Agent 框架，精简快、社区活跃，稳定在 1.x 线。',
          '核心抽象：Agent（有人设的角色）、Task（一件事）、Crew（团队）、Process（顺序或层级）、Flows（事件驱动编排）。',
          'Crews 适合自治协作的创造性工作，Flows 适合确定性流程；官方推荐把 Crew 包进 Flow。',
          '适合研究/创作/多视角分析，不适合刚性流水线、精确分支或简单单步任务。',
          '近期变化：LiteLLM 不再强制（有原生集成）、Memory 已统一。',
        ]}
      />
    </article>
  )
}
