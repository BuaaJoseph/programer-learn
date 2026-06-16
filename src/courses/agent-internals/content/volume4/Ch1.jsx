import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchCompare from '@/courses/agent-internals/illustrations/ArchCompare.jsx'

const loopPseudo = `# 范式 A：单主循环（Claude Code 风格）
messages = [system_prompt, user_task]
while True:
    reply = call_model(messages, tools)     # 一个主代理，全程在线
    messages.append(reply)
    if reply.has_tool_calls():
        for call in reply.tool_calls:
            result = run_tool(call)          # 读文件、跑命令、改代码……
            messages.append(result)          # 结果回灌同一条消息历史
        continue                             # 带着完整上下文再转一圈
    break                                    # 没有工具调用了 = 任务结束`

const graphPseudo = `# 范式 B：图编排（deer-flow 风格，伪代码）
graph = StateGraph(State)
graph.add_node('coordinator', coordinator)   # 入口：判断意图
graph.add_node('planner', planner)           # 出结构化计划
graph.add_node('researcher', researcher)     # 搜索/爬取
graph.add_node('reporter', reporter)         # 汇总成报告
# 每个节点返回 Command(goto=下一个节点)，由它自己决定下一跳
graph.add_edge('coordinator', 'planner')
graph.add_edge('planner', 'researcher')
graph.add_edge('researcher', 'reporter')
app = graph.compile()
app.invoke({'task': user_task})              # 任务在角色间沿边流转`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个 Agent 要处理「写一个功能」「做一份调研报告」这类复杂任务，业界其实只有两条主流路线。
          一条是<strong>单主循环</strong>：一个主代理跑一个 while 循环，从头到尾掌控全程，需要时才临时派子代理。
          另一条是<strong>图编排</strong>：把多个角色预先连成一张状态图，任务像水流一样在节点之间按边流转。
          这一章我们把两种范式摆在一起，看清各自擅长什么、代价是什么、什么时候该选哪个。
        </p>
      </Lead>

      <h2>范式 A：单主循环</h2>
      <p>
        单主循环的核心只有一句话：<strong>一个</strong>主代理，维护<strong>一条</strong>消息历史，反复调用模型，
        直到模型不再请求工具为止。<em>Claude Code</em> 就是这种结构的代表。每一轮，模型看到的是从头积累下来的
        完整上下文：用户的任务、它自己之前说过的话、每个工具返回的结果。它做的判断都建立在这份连续的上下文之上。
      </p>
      <CodeBlock lang="python" title="单主循环骨架" code={loopPseudo} />
      <p>
        这种结构的好处是「朴素」带来的：上下文天然连续，不存在「这个角色没看到那个角色干了什么」的问题；
        出了错也好查，因为整个过程就是一条线性的消息历史，从上往下读就能复盘。子代理在这里只是个
        <strong>上下文隔离器</strong>——当某个子任务会产生大量噪音（比如翻遍半个代码库找一个定义）时，
        主代理把它丢给子代理去做，子代理在自己的小上下文里折腾完，只把一句结论交回来，主循环的上下文因此保持干净。
      </p>

      <h2>范式 B：图编排</h2>
      <p>
        图编排把任务拆成若干<strong>角色</strong>，每个角色是图上的一个节点，节点之间用边连起来，规定谁之后能去谁。
        <em>deer-flow</em>（字节跳动开源，基于 <em>LangGraph</em>）就是典型：coordinator 接活、planner 出计划、
        researcher 搜索、reporter 写报告，任务沿着这张图一站站走完。每个节点可以用 <code>Command(goto=...)</code>
        动态决定下一跳，所以这张图不是死的流水线，而是带条件分支的状态机。
      </p>
      <CodeBlock lang="python" title="图编排骨架" code={graphPseudo} />
      <p>
        它的好处是「显式」带来的：流程被画成了图，谁在什么条件下交给谁，一目了然、可控；
        想在某一步插入人工审核、或让两个角色并行跑独立的线索，都很自然。代价是这套显式结构需要你提前设计、
        并维护节点之间共享的状态，复杂度比一个 while 循环高出一截。
      </p>

      <ArchCompare />

      <KeyIdea title="两种范式，两套取舍">
        <p>
          单主循环用<strong>简单换可靠</strong>：结构越朴素，能出错的地方越少，调试越容易，上下文越不容易割裂。
          图编排用<strong>结构换控制</strong>：把流程显式画出来，换来可控性和可并行性，但你得承担设计和维护这张图的成本。
          没有哪个绝对更好，只有「这个任务更吃哪一头」。
        </p>
      </KeyIdea>

      <Example title="写代码 vs 做深度研究，分别该选哪种">
        <p>
          <strong>写代码</strong>：任务是高度<em>串行且强依赖</em>的——改完 A 文件才知道 B 要怎么改，跑完测试才知道下一步。
          每一步都依赖上一步的完整上下文，硬拆给多个角色反而会让它们各写各的、最后拼不到一起。这类任务，
          单主循环明显更稳。
        </p>
        <p>
          <strong>做深度研究</strong>：任务往往能拆成<em>彼此独立的子线索</em>——「查 A 公司财报」和「查 B 公司财报」
          互不影响，可以并行去搜，最后再汇总。而且你常常想在「定了调研计划」这一步停下来人工审一眼。
          这类广度优先、可并行、需要人审环节的任务，图编排的显式结构就很值。
        </p>
      </Example>

      <Callout variant="warn" title="别为了「看起来高级」上图编排">
        <p>
          图编排天生「显得专业」，但它不是免费的。一旦把任务拆成多个角色，你就要操心：它们看到的上下文是否一致、
          产出能不能拼回去、多跑的那些节点带来的额外 token 和延迟是否划算。如果任务本来就是一条直线，
          强行画成图只会徒增复杂度。<strong>能用一个 while 循环说清楚的事，就别先画图。</strong>
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        选范式不是选「时髦的那个」，而是先看清你的任务长什么样：它是<strong>一条强依赖的链</strong>，
        还是<strong>一束可以各走各的独立线索</strong>？前者偏单主循环，后者偏图编排。
        更重要的是，这两种范式都不是非此即彼——单主循环里可以临时派子代理，图编排的某个节点内部也可能就是个小循环。
        真正决定成败的，是后面几章会反复出现的那句话：<em>谁看到什么上下文、谁来动手写</em>，这才是底层变量。
      </p>

      <Practice title="给任务挑范式">
        <p>
          下面几个任务，逐个判断更适合「单主循环」还是「图编排」，并写一句理由（关键看：是强依赖串行，还是可独立并行）。
        </p>
        <ul>
          <li>把一个 React 组件从类组件重写成函数组件，并让现有测试通过。</li>
          <li>为一篇综述同时调研 5 个互不相关的子主题，最后合成一份带引用的报告。</li>
          <li>修一个线上 bug：先复现、再定位、再改、再验证。</li>
          <li>给一个新需求做技术选型：分别评估 3 个候选库的优缺点，再给结论。</li>
          <li>给整个仓库做一次代码风格统一的批量重构。</li>
        </ul>
        <p>
          做完后想一想：有没有哪个任务其实是「主循环 + 临时派几个子代理」最合适，既不是纯单循环、也用不上整张图？
        </p>
      </Practice>

      <Summary
        points={[
          '处理复杂任务有两种主流范式：单主循环（一个主代理跑 while 循环，按需派子代理）和图编排（多角色连成状态图、按边流转）。',
          '单主循环以简单换可靠：上下文连续、易调试、出错点少，写代码这类强依赖串行任务更稳，代表是 Claude Code。',
          '图编排以结构换控制：流程显式可控、可并行、易插人审环节，适合可拆成独立线索的研究类任务，代表是 deer-flow。',
          '单主循环里的子代理只是上下文隔离器：把噪音大的子任务隔出去，只回灌一句结论，保持主上下文干净。',
          '图编排不是免费的：拆角色会带来额外 token、延迟、上下文割裂和产出拼接的风险，能用直线说清就别先画图。',
          '选范式先看任务形状：强依赖的链偏单主循环，可独立并行的束偏图编排，而决定成败的底层变量始终是上下文工程。',
        ]}
      />
    </>
  )
}
