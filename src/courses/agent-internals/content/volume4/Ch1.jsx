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

const stateLeakPseudo = `# 图编排里最隐蔽的坑：共享 state 被多个节点改花了
state = {'budget': None, 'findings': []}

def planner(state):
    state['budget'] = 1000        # planner 拍了个预算
    return Command(goto='researcher')

def researcher(state):
    # 它并不知道 budget 是谁、什么时候、基于什么拍的
    state['findings'].append(fetch(state['budget']))
    state['budget'] = None        # 顺手把字段清了，下游再读就是 None
    return Command(goto='reporter')
# => reporter 读到 budget=None，却完全无法从一条线性历史里复盘是哪步改的`

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
      <p>
        <strong>为什么这么设计能成立？</strong>底层原因藏在大模型的工作方式里：模型是<em>无状态</em>的，
        它没有「记忆」，每一轮你都得把全部该知道的东西重新塞进 prompt。单主循环恰好把「该知道的东西」
        维护成了一条单一、连续、可追加的列表——这是和模型工作方式最贴合的数据结构。你不需要去同步多份
        state，也不需要担心「哪份上下文是权威的」，因为只有一份。<code>continue</code> 那一行看似平平无奇，
        它其实是整个范式的灵魂：每次带着<strong>完整且最新</strong>的上下文重新进入模型，模型的下一步判断
        因此永远建立在它自己亲眼见过的所有结果之上。
      </p>
      <p>
        <strong>边界情况</strong>也值得点一下：单主循环不是「永远只有一个上下文」。当任务里出现一段
        会把上下文撑爆的噪音（成百上千行日志、一次全库搜索的命中列表）时，主代理可以临时 spawn 一个子代理，
        让它在隔离的窗口里啃完，只回一句结论。这不违反范式——主循环依然是唯一的「决策者与写手」，
        子代理只是它派出去的「侦察兵」，不参与最终决策，也不并行去改同一批文件。
      </p>

      <h2>范式 B：图编排</h2>
      <p>
        图编排把任务拆成若干<strong>角色</strong>，每个角色是图上的一个节点，节点之间用边连起来，规定谁之后能去谁。
        <em>deer-flow</em>（字节跳动开源，基于 <em>LangGraph</em>）就是典型：coordinator 接活、planner 出计划、
        researcher 搜索、reporter 写报告，任务沿着这张图一站站走完。每个节点可以用 <code>{'Command(goto=...)'}</code>
        动态决定下一跳，所以这张图不是死的流水线，而是带条件分支的状态机。
      </p>
      <CodeBlock lang="python" title="图编排骨架" code={graphPseudo} />
      <p>
        它的好处是「显式」带来的：流程被画成了图，谁在什么条件下交给谁，一目了然、可控；
        想在某一步插入人工审核、或让两个角色并行跑独立的线索，都很自然。代价是这套显式结构需要你提前设计、
        并维护节点之间共享的状态，复杂度比一个 while 循环高出一截。
      </p>
      <p>
        <strong>底层原理</strong>上，图编排做的事是把「控制流」从模型的隐式判断里<em>抽出来</em>，
        变成代码里显式的节点和边。单主循环里，「下一步干什么」是模型在每一轮自己临场决定的；
        图编排里，「能从哪个节点去哪个节点」是你在编译图的时候就钉死的框架，模型只在这个框架内、
        在单个节点里做局部决策。这就是它「可控」的来源——你限制住了模型能走的路径空间。
      </p>
      <p>
        但<strong>最隐蔽的代价</strong>是共享 state。图上所有节点读写同一份状态对象，一旦节点多、分支密，
        「哪个字段是谁在什么条件下改的」就再也无法从一条线性历史里读出来——因为根本没有线性历史，
        只有一个被反复改花的字典。下面这段示意能让你直观感到这种「state 漂移」的痛：
      </p>
      <CodeBlock lang="python" title="图编排里最隐蔽的坑：共享 state 漂移" code={stateLeakPseudo} />

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

      <h2>两种范式的并排对照</h2>
      <p>
        把抽象的取舍落到具体维度上，一张表最直观。注意最后一行——这两种范式并不是对立的，更多时候是「外层选谁、
        内层混用」的关系：
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>单主循环（Claude Code）</th>
            <th>图编排（deer-flow）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>控制流由谁定</td>
            <td>模型每轮临场决定</td>
            <td>编译期钉死的图，模型只做局部决策</td>
          </tr>
          <tr>
            <td>上下文形态</td>
            <td>一条连续追加的消息历史</td>
            <td>多节点共享的 state 字典</td>
          </tr>
          <tr>
            <td>调试复盘</td>
            <td>从上往下读历史即可</td>
            <td>要追「谁改了哪个字段」，更难</td>
          </tr>
          <tr>
            <td>插入人审</td>
            <td>要手动打断循环</td>
            <td>就是图上一个节点，天然支持</td>
          </tr>
          <tr>
            <td>并行能力</td>
            <td>弱（子代理只做隔离）</td>
            <td>强（独立线索可并行节点）</td>
          </tr>
          <tr>
            <td>最擅长的任务</td>
            <td>强依赖串行（写代码、改 bug）</td>
            <td>广度优先可并行（深度研究）</td>
          </tr>
        </tbody>
      </table>

      <Callout variant="warn" title="别为了「看起来高级」上图编排">
        <p>
          图编排天生「显得专业」，但它不是免费的。一旦把任务拆成多个角色，你就要操心：它们看到的上下文是否一致、
          产出能不能拼回去、多跑的那些节点带来的额外 token 和延迟是否划算。如果任务本来就是一条直线，
          强行画成图只会徒增复杂度。<strong>能用一个 while 循环说清楚的事，就别先画图。</strong>
        </p>
      </Callout>

      <Callout variant="info" title="一个常见误区：以为「节点 = 子代理」">
        <p>
          很多人第一次接触图编排，会把它脑补成「一堆子代理在并行干活」。其实经典 deer-flow 的图是<strong>串行</strong>
          走完大多数节点的，节点之间是「角色交接」，不是「并行竞速」。真正的并行只发生在 researcher 这类
          可拆成独立子线索的地方。把「图编排」直接等同于「多 Agent 并行」，是理解上的第一个坑。
        </p>
      </Callout>

      <h2>真实工程里，二者常常是混合的</h2>
      <p>
        别把这两条路线想成水火不容。一线产品里更常见的形态是<strong>分层混合</strong>：外层用单主循环掌总
        （因为整体任务是强依赖的），内层在某个噪音大的环节临时派子代理去隔离；或者反过来，外层用图编排
        把「调研 → 人审 → 撰写」这条大流程显式画出来，而每个节点<em>内部</em>其实就是一个小小的 while 循环。
        deer-flow 2.0 往「lead + sub-agents」方向演进，本质上就是图编排在向「主导者调度子代理」收敛——
        这正是单主循环那套思路。范式之间的边界，远没有教科书画得那么清晰。
      </p>

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
          再进阶一步：上面哪个任务最适合「外层图编排、内层小循环」的混合形态？
        </p>
      </Practice>

      <Summary
        points={[
          '处理复杂任务有两种主流范式：单主循环（一个主代理跑 while 循环，按需派子代理）和图编排（多角色连成状态图、按边流转）。',
          '单主循环以简单换可靠：上下文连续、易调试、出错点少，写代码这类强依赖串行任务更稳，代表是 Claude Code。',
          '单主循环贴合模型「无状态」的本质：把该知道的一切维护成一条连续可追加的历史，continue 那一行让每轮都带最新完整上下文重新进入模型。',
          '图编排以结构换控制：把控制流从模型的隐式判断里抽成显式的节点和边，流程可控、可并行、易插人审，适合可拆成独立线索的研究类任务，代表是 deer-flow。',
          '单主循环里的子代理只是上下文隔离器：把噪音大的子任务隔出去，只回灌一句结论，保持主上下文干净。',
          '图编排不是免费的：拆角色会带来额外 token、延迟、上下文割裂，以及最隐蔽的共享 state 漂移（哪个字段谁改的难追），能用直线说清就别先画图。',
          '常见误区是把「图编排」直接等同于「多 Agent 并行」：经典 deer-flow 大多是串行交接，真正并行只在可独立的子线索处发生。',
          '真实工程多为分层混合：外层选一种范式掌总，内层混用另一种；选范式先看任务形状，而决定成败的底层变量始终是上下文工程。',
        ]}
      />
    </>
  )
}
