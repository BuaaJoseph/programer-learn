import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DeerFlowGraph from '@/courses/agent-internals/illustrations/DeerFlowGraph.jsx'

const nodeCode = `# deer-flow 的节点用 Command(goto=...) 动态决定下一跳（伪代码）
from langgraph.types import Command

def planner(state) -> Command:
    plan = make_plan(state)
    if plan.has_enough_context:
        # 信息已经够了，直接去写报告
        return Command(goto='reporter', update={'plan': plan})
    # 还需要继续调研，交给研究团队
    return Command(goto='research_team', update={'plan': plan})`

const humanCode = `# human_feedback 节点：用 interrupt() 暂停，把控制权交还给用户
from langgraph.types import interrupt, Command

def human_feedback(state) -> Command:
    if state.get('auto_accepted_plan'):
        # 配了 auto_accepted_plan=True 就跳过人审，直接执行
        return Command(goto='research_team')

    # interrupt() 在这里挂起整张图，等待外部输入
    feedback = interrupt('请审阅计划：回复 [EDIT_PLAN] 或 [ACCEPTED]')

    if feedback.startswith('[EDIT_PLAN]'):
        # 用户要改计划 -> 退回 planner 重做
        return Command(goto='planner', update={'feedback': feedback})
    if feedback.startswith('[ACCEPTED]'):
        # 用户认可 -> 继续往下执行
        return Command(goto='research_team')`

const resumeCode = `# interrupt() 不是普通的「等待」：它会把图的执行真正中断、落盘
# 恢复时不是从头跑，而是从被中断的那个节点「续上」

# 1) 第一次 invoke：跑到 human_feedback 的 interrupt() 就停，状态存进 checkpointer
config = {'configurable': {'thread_id': 'task-001'}}
app.invoke({'task': user_task}, config=config)
# -> 抛出 __interrupt__，图挂起，等用户

# 2) 用户回复后，用 Command(resume=...) 把值喂回那个 interrupt()
app.invoke(Command(resume='[ACCEPTED]'), config=config)
# -> 图从 human_feedback 处继续，而不是重跑 coordinator/planner
# 关键：thread_id 把同一个任务的多次 invoke 串成一条可恢复的会话`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们说图编排是「把多个角色连成一张状态图」。这一章就拿一个真实的开源项目把这张图拆开看个透：
          <em>deer-flow</em>（字节跳动开源，仓库 bytedance/deer-flow），它基于 <em>LangGraph</em> 加 <em>LangChain</em>，
          是一个专门做深度研究的多角色 Agent。我们逐个讲清它的节点角色、它们之间怎么流转、计划处怎么让你人工审，
          最后再看它 2.0 往哪个方向演进，以及它和 Claude Code 的根本差异。
        </p>
      </Lead>

      <h2>这张图上有哪些角色</h2>
      <p>
        deer-flow 经典的图里，任务依次经过这样一串节点，每个节点是一个有明确职责的角色：
      </p>
      <ul>
        <li><strong>coordinator</strong>：入口，做意图判定——这到底是不是一个需要调研的研究任务。</li>
        <li><strong>background_investigator</strong>（可选）：在正式规划前先做一轮背景调查，给 planner 垫点底。</li>
        <li><strong>planner</strong>：产出结构化的调研计划，并判断<em>现有信息是否已经够</em>写报告了。</li>
        <li><strong>human_feedback</strong>：用 <code>{'interrupt()'}</code> 暂停整张图，让用户审一眼计划（细节见下）。</li>
        <li><strong>research_team</strong>：调度中枢，把计划里的步骤分发给下面两个执行角色。</li>
        <li><strong>researcher</strong>：实际去搜索、爬取网页、调用 MCP 工具拿信息。</li>
        <li><strong>coder</strong>：在 Python REPL 里跑代码（算数据、画图、处理文件等）。</li>
        <li><strong>reporter</strong>：把收集到的一切汇总，写成最终报告，然后到 <code>END</code> 结束。</li>
      </ul>
      <p>
        大致流转是：coordinator →（可选 background_investigator）→ planner → human_feedback → research_team →
        researcher / coder（来回若干轮）→ reporter → END。注意 planner 如果判断信息已经够了，也可以直接跳到 reporter，
        不必走完整的调研循环。
      </p>
      <p>
        <strong>为什么要拆成这么多角色，而不是一个 prompt 全干？</strong>核心原因是「职责单一」带来的可控与可测。
        每个节点只有一件事要做，它的 system prompt 因此可以写得又窄又专——coordinator 只判意图，
        不需要懂怎么写报告；reporter 只管汇总，不需要懂怎么搜索。窄 prompt 的好处是模型在单个节点里
        几乎不会跑偏，而且你可以<em>单独</em>给某个节点换提示词、换模型、加单测，不牵一发而动全身。
        这正是图编排「显式」红利在工程上的兑现：复杂度被切成了一块块可单独维护的积木。
      </p>

      <h2>Command(goto) 动态路由</h2>
      <p>
        这张图的边不是写死的流水线。每个节点执行完，返回一个 <code>{'Command(goto=下一个节点)'}</code> 对象，
        由节点自己根据当前状态<strong>动态决定</strong>下一跳去哪。这就是为什么同一张图能跑出不同的路径——
        planner 觉得信息够就去 reporter，不够就去 research_team。
      </p>
      <CodeBlock lang="python" title="planner 用 Command(goto) 决定下一跳" code={nodeCode} />
      <p>
        <strong>底层上，这里有两件事被合并进了一个对象</strong>：<code>goto</code> 决定「控制流去哪」，
        <code>update</code> 决定「往共享 state 里写什么」。LangGraph 把「跳转」和「更新状态」打包成一个
        <code>Command</code> 返回值，是为了让节点的副作用显式、可追踪——你一眼能看出这个节点改了哪些字段、
        然后把球传给了谁。<strong>常见误区</strong>是以为 <code>{'add_edge'}</code> 画的静态边和节点里返回的
        <code>goto</code> 是一回事。其实静态边是「默认路径」，而 <code>goto</code> 是「运行时覆盖」——
        当两者都存在时，节点里动态返回的 <code>goto</code> 说了算。这也是为什么光看图的连线，
        你并不能完全预测一次真实运行会走哪条路。
      </p>

      <DeerFlowGraph />

      <h2>human_feedback：把人插进循环里</h2>
      <p>
        deer-flow 最有代表性的设计，是在 planner 出完计划后专门设一个 human_feedback 节点，
        用 LangGraph 的 <code>{'interrupt()'}</code> 把整张图<strong>挂起</strong>，把控制权交还给用户。用户有两种回复：
        回 <code>[EDIT_PLAN]</code> 表示要改，节点就 <code>goto</code> 回 planner 重做计划；
        回 <code>[ACCEPTED]</code> 表示认可，节点就继续往下进入执行。如果配置了 <code>{'auto_accepted_plan=True'}</code>，
        这个暂停就被跳过，计划自动通过、直接执行。
      </p>
      <CodeBlock lang="python" title="human_feedback 节点" code={humanCode} />
      <p>
        <strong>这里有个容易被忽略的工程真相</strong>：<code>{'interrupt()'}</code> 不是 Python 里那种
        「线程 sleep 等输入」的阻塞——服务器不可能为了等用户而一直把一个请求挂在内存里。它的真实机制是：
        图执行到 <code>{'interrupt()'}</code> 时，把当前完整状态<strong>落盘</strong>到一个 checkpointer
        （持久化存储），然后<em>抛出</em>中断、结束这一次调用。用户几小时后回来，你用
        <code>{'Command(resume=值)'}</code> 配上同一个 <code>{'thread_id'}</code> 再发一次请求，
        图就从被中断的那个节点续上，而不是从头重跑。
      </p>
      <CodeBlock lang="python" title="interrupt 的真实机制：落盘 + 按 thread_id 恢复" code={resumeCode} />
      <p>
        <strong>边界情况</strong>：如果你忘了配 checkpointer，<code>{'interrupt()'}</code> 就没地方存状态，
        恢复时会从头重跑——这是新手最常踩的坑之一。另一个坑是 <code>{'thread_id'}</code> 用错，
        导致恢复请求接到了别的会话上。把这两点记牢，「人审」这件事才能在真实多用户服务里稳定工作。
      </p>

      <KeyIdea title="显式的图，让「人审计划」成为一等公民">
        <p>
          在单主循环里想插一个「停下来等人确认计划」的环节，得自己想办法打断循环。而在 deer-flow 这种图里，
          它就是图上一个普普通通的节点，用 <code>{'interrupt()'}</code> 一挂、用 <code>{'Command(goto)'}</code> 一跳就实现了。
          这正是图编排「显式、可控」的红利：流程里的每个关键决策点，都能被显式地建模成一个节点。
        </p>
      </KeyIdea>

      <Example title="同一任务，两条不同的真实路径">
        <p>
          任务：「调研三家新能源车企近三年的销量趋势并给对比结论」。同一张图，因为 planner 和用户的不同判断，
          会跑出截然不同的路径：
        </p>
        <p>
          <strong>路径甲（信息不足 + 用户改计划）</strong>：coordinator → planner（判定信息不够）→ human_feedback
          → 用户回 <code>[EDIT_PLAN]</code>「再加上出口数据」→ 退回 planner 重做 → human_feedback → 用户回
          <code>[ACCEPTED]</code> → research_team → researcher 搜销量、coder 算趋势画图（来回三轮）→ reporter → END。
        </p>
        <p>
          <strong>路径乙（背景调查已够 + 自动通过）</strong>：开了 background_investigator 且
          <code>{'auto_accepted_plan=True'}</code>：coordinator → background_investigator → planner（判定信息够）
          → <em>直接</em> reporter → END。同一张图，连 research_team 都没进。这就是动态路由的威力——
          图的「形状」固定，但「走法」千变万化。
        </p>
      </Example>

      <h2>2.0 的演进</h2>
      <p>
        deer-flow 2.0 正从「固定角色的 LangGraph 图」转向 <em>lead + sub-agents</em> 的 SuperAgent 形态：
        一个主导代理带一批子代理，并补上沙箱、记忆、skills、消息网关这些更通用的基础设施。
        这其实是个有意思的信号——从「把流程画死成图」往「一个主导者按需调度子代理」靠，
        某种程度上是在向单主循环那套「主代理 + 子代理」的思路收敛。范式之间的边界，并没有想象中那么泾渭分明。
      </p>
      <p>
        <strong>为什么会朝这个方向走？</strong>固定角色图的硬伤是：现实任务的形状千差万别，而图的节点和边是
        提前钉死的。一旦来了张图没预设的任务类型，你要么硬塞进现有节点（角色被迫干不擅长的事），
        要么改图（重新设计、回归测试）。而 lead + sub-agents 把「该派谁、派几个」的决策从编译期挪回了
        运行时——由主导代理临场判断。代价是又把控制流交还给了模型，可控性下降。这正是上一章那句话的回响：
        <em>没有银弹，只有把控制权放在编译期还是运行时的取舍</em>。
      </p>

      <h2>这对你意味着什么</h2>
      <p>
        deer-flow 给你的最大启发，不是「研究任务一定要用图」，而是<strong>把流程里的关键节点显式建模</strong>这件事本身的价值：
        意图判定、出计划、人审、执行、汇总，各是一个角色，看得见、改得动、可单测。如果你要做的就是一个深度研究类产品，
        这种结构能让「在哪一步插人审」「让哪些步骤并行」变得一目了然。但也别忘上一章的提醒：
        当任务其实是一条强依赖的链时，这张图反而是负担。
      </p>

      <Callout variant="warn" title="图越复杂，状态就越难管">
        <p>
          图里所有节点共享一份 state。节点一多、分支一密，「谁在什么时候改了 state 的哪个字段」就越来越难追。
          这正是图编排的隐性成本：你买来了显式的流程，却也要付出维护共享状态的代价。节点数量要克制。
        </p>
      </Callout>

      <Callout variant="info" title="一个常见误区：把 deer-flow 当通用 Agent 框架">
        <p>
          deer-flow 是为<strong>深度研究</strong>这一类任务量身定做的，它的节点（searcher、coder、reporter）
          都带着「研究」的烙印。直接拿它去做「写一个 Web 后端」，你会发现根本没有合适的角色——这不是 deer-flow
          的缺陷，而是它本就不是通用编码 Agent。选工具前先看它的角色集是不是和你的任务形状对得上。
        </p>
      </Callout>

      <Practice title="画出一次研究任务的流转路径">
        <p>
          假设用户的任务是「调研近三年三家新能源车企的销量趋势，并给出对比结论」，且没有开启
          <code>{'auto_accepted_plan'}</code>。请按 deer-flow 的节点，写出这次任务最可能的流转路径，要求覆盖：
        </p>
        <ul>
          <li>从 coordinator 进入，到 reporter 出报告、最后到 END 的完整节点序列。</li>
          <li>在 human_feedback 处，分别画出用户回 <code>[EDIT_PLAN]</code> 和回 <code>[ACCEPTED]</code> 两条不同的分支。</li>
          <li>research_team 这一段，researcher 和 coder 各会被调用来干什么（搜销量数据 vs 算趋势/画对比）。</li>
        </ul>
        <p>
          进阶：如果改成 <code>{'auto_accepted_plan=True'}</code>，这条路径会少掉哪个停顿？再进阶：
          如果中途服务重启了，<code>{'interrupt()'}</code> 处的状态靠什么才能恢复、而不是从头重跑？
        </p>
      </Practice>

      <Summary
        points={[
          'deer-flow 是字节跳动开源、基于 LangGraph + LangChain 的多角色研究 Agent，把流程显式建模成一张状态图。',
          '经典节点：coordinator 判意图 →（可选 background_investigator）→ planner 出计划 → human_feedback 人审 → research_team 调度 → researcher/coder 执行 → reporter 出报告 → END。',
          '拆成多个职责单一的角色，是为了让每个节点的 prompt 又窄又专、可单独换模型/加单测，复杂度被切成可维护的积木。',
          '节点用 Command(goto=...) 动态路由，并用 update 同时写 state：静态边是默认路径、运行时 goto 可覆盖，所以光看连线预测不出真实走法。',
          'human_feedback 用 interrupt() 挂起：它不是阻塞等待，而是把状态落盘到 checkpointer、按 thread_id 恢复；忘配 checkpointer 会从头重跑。',
          'deer-flow 2.0 转向 lead + sub-agents，把「派谁」的决策从编译期挪回运行时，向单主循环收敛——本质是控制权放哪的取舍。',
          '相比 Claude Code 的单主循环，deer-flow 的价值是把关键决策点显式建模成节点，代价是维护共享 state；且它是研究专用、并非通用编码 Agent。',
        ]}
      />
    </>
  )
}
