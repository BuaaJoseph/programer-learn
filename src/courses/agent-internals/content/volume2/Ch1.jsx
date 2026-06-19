import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RefactorTrace from '@/courses/agent-internals/illustrations/RefactorTrace.jsx'

const userMsg = `帮我重构 auth 模块：现在 auth.js 一个文件 600 行，
把它拆成 login / session / token 三块，顺手补上单元测试。`

const grepStep = `# 第 1 轮，Agent 选择的工具调用（模型输出的，不是人写的）
Grep  pattern="auth"        glob="**/*.js"     # 先看 auth 被谁引用
Read  file="src/auth.js"                       # 再把主文件读进上下文
Read  file="src/server.js"  offset=0 limit=80  # 看它怎么被挂载`

const todoStep = `TodoWrite todos=[
  { content: "通读 auth.js，标出可拆分的边界",  status: "in_progress" },
  { content: "确认是否需要保持旧 import 路径兼容", status: "pending" },
  { content: "拆出 login.js / session.js / token.js", status: "pending" },
  { content: "补 login / token 的单元测试",           status: "pending" },
  { content: "跑测试并修复直到全绿",                  status: "pending" },
]`

const testFail = `$ npm test
 FAIL  test/token.test.js
  ● token › verify() 拒绝过期 token
    TypeError: jwt.verify is not a function
      at Object.verify (src/token.js:12:18)`

const fixDiff = `// token.js 第 1 行——拆分时漏带了这一句 import
-const { sign } = require('jsonwebtoken')
+const jwt = require('jsonwebtoken')`

const loopPseudo = `// harness 的主循环，去掉细节后就这么几行
let messages = [systemPrompt, tools, claudeMd, userMsg]
while (true) {
  const turn = await callModel(messages)   // 发起一轮 LLM 调用
  messages.push(turn)                       // 把模型这一轮的输出压进历史

  if (turn.stopReason === 'end_turn') break // 只有纯文本 → 退出循环

  const result = await runTool(turn.toolUse) // 执行模型点名的工具
  messages.push({ role: 'user', content: result }) // 结果塞回上下文
}
// 循环一停，控制权就还给用户`

const badVsGood = `# 反面：一把梭，没探索就开改
Edit src/auth.js  ...   # 凭空猜 auth.js 长什么样 → 大概率改错

# 正面：先探索，把现状读进上下文，再动手
Grep pattern="auth"            # 它被谁引用？
Read src/auth.js               # 它内部什么结构？
Read test/auth.test.js         # 现有测试覆盖了什么？
# —— 读完才决定怎么拆 ——
Edit src/login.js ...`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你给 Agent 发一句「帮我重构 auth 模块」，几十秒后它交还一份改好的代码。中间这几十秒里到底发生了什么？
          很多人脑补成「它一下子就把代码改完了」。真相完全不是——它是<strong>一轮一轮</strong>地试探、观察、修正，
          像一个谨慎的工程师那样，先搞清楚现状，再动手，改完还要自己跑一遍。这一章，我们把这条真实轨迹逐轮拆开看。
        </p>
      </Lead>

      <h2>主线任务：一次真实的重构</h2>
      <p>
        全卷我们只跟一个任务死磕，把内部讲透。任务就是下面这条你随手发出去的指令：
      </p>
      <CodeBlock lang="text" title="你发的指令" code={userMsg} />
      <p>
        对你来说这是一句话；对 Agent 来说，这是一段需要<em>探索</em>、<em>计划</em>、<em>执行</em>、<em>验证</em>四个阶段、
        反复来回好几轮才能收敛的工作。我们从第一轮开始看。
      </p>
      <p>
        <strong>为什么要拿一个例子贯穿全卷？</strong>因为 Agent 的内部机制（上下文、工具循环、权限、计划）单独讲都很抽象，
        但落在同一条真实轨迹上，你就能看到它们是怎么<em>咬合</em>在一起的。后面每讲一个机制，我们都会回到这条 auth 重构线，
        指给你看「喏，刚才那一步，背后就是这个机制在起作用」。建议你现在就在自己脑子里挂上这个任务，跟着往下走。
      </p>

      <h2>第 1 轮：探索先行，先看清现状</h2>
      <p>
        老练的 Agent 不会上来就改代码。它做的第一件事是<strong>把现状读进上下文</strong>：auth 模块长什么样、被谁引用、
        测试现在有没有。这一轮模型不会输出最终答案，它会输出一串「只读」的工具调用：
      </p>
      <CodeBlock lang="text" title="第 1 轮的工具调用" code={grepStep} />
      <p>
        这背后是一条官方反复强调的实践：<em>先探索、后编码</em>。把「理解」和「修改」分成两个阶段，
        比端到端一把梭地改成功率高得多。原因很直接——模型只能基于<strong>它读到的内容</strong>来决策，
        没读 auth.js 就动手，等于闭着眼睛改。
      </p>
      <p>
        <strong>底层原理</strong>：模型没有「记忆」也没有「磁盘访问权」，它唯一能依据的就是当前上下文里的文字。
        探索的本质，就是<em>把外部世界的事实搬进上下文</em>——Grep 把「谁引用了 auth」变成可见文字，Read 把
        「auth.js 的真实内容」变成可见文字。在这些事实进上下文之前，模型对你的代码库一无所知，它的任何「修改」都是猜测。
      </p>
      <Callout variant="warn" title="常见误区：以为 Agent 能直接看到你的项目">
        <p>
          很多人下意识觉得 Agent 像一个坐在你电脑前的人，能随时翻看任意文件。不对。它<strong>只能看见被工具调用拉进上下文的那部分</strong>。
          你没让它 Read 的文件，对它就是不存在的黑箱。所以当它「改错了你以为它该知道的东西」，
          十有八九不是它笨，而是那段信息从没进过它的上下文。
        </p>
      </Callout>
      <p>
        <strong>边界情况</strong>：探索也不是越多越好。如果项目巨大，Agent 把几十个文件全 Read 进来，上下文会迅速被塞满
        （下一章细讲为什么这很贵）。好的探索是<em>有针对性的</em>：先用 Grep 定位到「auth 相关的少数文件」，
        再精读这几个，而不是把整个 src 目录吞下去。探索的目标是「读够做决策所需的最少信息」，不是「读全」。
      </p>
      <Example title="对比：探索 vs 一把梭">
        <p>
          下面把「没探索就开改」和「先探索再动手」并排放，你能直观感受到区别在哪：
        </p>
        <CodeBlock lang="text" title="两种开局" code={badVsGood} />
        <p>
          左边那种，模型在「不知道 auth.js 长什么样」的前提下硬写 Edit，等于蒙；右边把事实读进来再决策，
          改对的概率高一个量级。真实工程里，绝大多数「Agent 改崩了」的事故，根源都在它<strong>跳过了探索</strong>。
        </p>
      </Example>

      <h2>第 2 轮：出计划，并用 TodoWrite 外化</h2>
      <p>
        读懂之后，Agent 把多步工作拆成一份<strong>可见的清单</strong>，用 <code>TodoWrite</code> 写下来。
        这既是给你看的（你能实时知道它打算怎么干），也是给它自己看的（防止做着做着忘了还有几步）：
      </p>
      <CodeBlock lang="javascript" title="第 2 轮：写下 Todo 清单" code={todoStep} />
      <p>
        <strong>为什么这么设计</strong>：随着任务推进，上下文会越来越长，早期的目标很容易被后面大段的文件内容、
        报错信息「淹没」。把计划<em>显式地写下来</em>，等于在上下文里钉了一个不会被冲走的「锚」——每一轮模型都能重新看到
        「我总共要做这五件事、现在到第几件」。这是用外部结构来对抗模型「健忘」的经典手法（下一章你会看到上下文是怎么疯长的）。
      </p>
      <p>
        <strong>真实工程经验</strong>：对单步就能搞定的小任务（「把这个变量名改一下」），Agent 通常<em>不会</em>写 Todo——
        写了反而是噪声。TodoWrite 是给「多步、需要跟踪进度」的任务用的。你会发现，一个设计良好的 Agent 在面对琐碎任务时
        干脆利落，面对复杂任务时才掏出清单，这个「该不该列清单」的判断本身就是它成熟度的体现。
      </p>

      <RefactorTrace />

      <h2>第 3 轮：停下来，把决策交回给你</h2>
      <p>
        注意清单里第二条：<strong>是否保持旧 import 路径兼容</strong>。这是一个有歧义、且可能破坏别处代码的决策——
        如果直接删掉旧的 <code>require('./auth')</code> 入口，全项目引用它的地方都会炸。Agent 不会替你拍板，
        它会<strong>停下来问你</strong>：
      </p>
      <Example title="Agent 主动发问">
        <p>
          「auth.js 目前被 server.js、middleware.js 等 4 处直接 import。重构后是保留 auth.js 作为转发入口
          （改动最小、向后兼容），还是彻底删掉、让调用方改成引用新的三个文件？前者稳，后者干净。你选哪个？」
        </p>
        <p>
          你回答「保留 auth.js 当兼容入口」。这条约束一旦给定，后面所有的修改方向就被钉死了——
          这正是「人在回路」的价值：在岔路口让人来定方向。
        </p>
      </Example>
      <p>
        <strong>它凭什么知道该停下来问</strong>？一部分来自模型从 system prompt 里学到的「遇到破坏式/有歧义的决策应交回人类」的行为准则；
        另一部分来自硬性的权限机制（第 4 章细讲）——有些动作根本不允许它自己执行，必须先经你确认。
        换句话说，「停下来问」既是<em>行为习惯</em>，也是<em>制度约束</em>，两层叠在一起才靠得住。
      </p>
      <Callout variant="warn" title="常见误区：嫌它问得多，把约束都省了">
        <p>
          有人觉得「它老停下来问，烦」，于是把指令写得极简、把权限全开。结果是：在歧义点上它只能<strong>替你猜</strong>，
          猜错了再返工，反而更慢。正确做法是<em>把约束提前喂够</em>——一开始就说清「保留兼容入口、不要动数据库、用 jest」，
          它需要问的轮次自然就少了。少问，不该靠「不让它问」，而该靠「你提前说清楚」。
        </p>
      </Callout>

      <KeyIdea title="不是一步到位，而是一轮轮收敛">
        <p>
          整个过程没有任何一步是「一次性完成」的。每一轮，模型只做一件事：读完当前所有上下文，输出
          <strong>下一个</strong>动作（一个工具调用，或最终文本）。harness 执行这个动作、把结果塞回上下文，
          再发起下一轮。任务就在这「动作 → 观察结果 → 再动作」的循环里，像逼近一样一点点收敛到完成。
        </p>
      </KeyIdea>
      <p>
        把这句话落到代码上，整个 Agent 的「主循环」其实简单到出乎意料：
      </p>
      <CodeBlock lang="javascript" title="harness 主循环（去掉细节的伪代码）" code={loopPseudo} />
      <p>
        看清楚了：所谓「Agent」并不是某种神秘的智能体，它就是<strong>一个 while 循环包着一次次 LLM 调用</strong>。
        循环每转一圈，就把模型点名的工具执行掉、结果塞回上下文。智能全在模型那一侧，
        而「让智能持续行动起来」的，是这圈朴素到不能再朴素的循环。理解了这一点，后面所有机制你都能往这个循环上挂。
      </p>

      <h2>第 4~6 轮：分步 Edit，然后跑测试</h2>
      <p>
        拿到「保留兼容入口」的约束后，Agent 按 Todo 一项项推进：先 <code>Edit</code> 拆出 <code>login.js</code>、
        <code>session.js</code>、<code>token.js</code>，再把 <code>auth.js</code> 改成转发；接着补测试文件；
        然后用 <code>Bash</code> 跑一次测试来<strong>验证自己改对没有</strong>：
      </p>
      <CodeBlock lang="text" title="第 6 轮：测试失败了" code={testFail} />
      <p>
        测试挂了。这恰恰是好事——它说明 Agent 在<strong>自己检查自己</strong>，而不是改完就拍胸脯说完成。
      </p>
      <p>
        <strong>为什么要分步 Edit、而不是一次性把整个文件重写</strong>？两个原因。其一，精确的小 Edit 比整文件重写更安全——
        重写容易把原本没打算动的代码也一并改掉甚至丢掉。其二，分步推进意味着<em>每一步都可观察</em>：拆完一个文件就能单独验证，
        出了问题定位范围小。这和人类工程师「小步提交」的直觉完全一致。
      </p>
      <p>
        <strong>真实工程经验</strong>：「改完主动跑测试」是区分玩具 Agent 和可用 Agent 的分水岭。不会自我验证的 Agent，
        会信誓旦旦地说「已完成」，而代码其实是坏的；会跑测试的 Agent，把「我以为对」变成「我验证过对」。
        如果你的项目有快速可跑的测试或 lint，请务必让 Agent 知道怎么跑——这是它给自己兜底的唯一手段。
      </p>

      <h2>第 7~8 轮：读报错，定位，修复，再测</h2>
      <p>
        Agent 把报错信息读进上下文，定位到 <code>token.js</code> 第 12 行：拆分时漏带了 <code>jsonwebtoken</code>
        的完整 import。它做一次精准的 <code>Edit</code>：
      </p>
      <CodeBlock lang="diff" title="第 7 轮：修复" code={fixDiff} />
      <p>
        改完<strong>再跑一次</strong> <code>npm test</code>，这次全绿。注意这个「失败 → 读报错 → 修 → 再测」的小循环，
        是 Agent 工作里出现频率最高的模式之一。
      </p>
      <p>
        <strong>这个小循环为什么有效</strong>：报错信息是高质量的、结构化的反馈——它直接告诉模型「错在哪个文件、哪一行、什么类型」。
        模型把这段反馈读进上下文，就有了精准修复的依据。这其实又是「探索」的微缩版：报错就是被读进来的<em>新事实</em>，
        模型基于新事实做下一个动作。整个 Agent，从宏观的重构到微观的修 bug，跑的都是同一个「观察 → 行动」的循环。
      </p>
      <Callout variant="warn" title="边界情况：修不动时会不会死循环">
        <p>
          如果一个 bug 反复修不好，理论上这个小循环可能空转。成熟的 harness 会有<strong>步数上限</strong>等保护，
          到了上限会停下来如实汇报「我卡在这里了，需要你介入」，而不是无限烧 token。
          所以你偶尔会看到 Agent 说「我尝试了几种方法都没通过，建议你检查一下 X」——这不是它偷懒，是它在该求助的时候求助。
        </p>
      </Callout>

      <Callout variant="warn" title="纯文本回复 = 循环结束">
        <p>
          循环什么时候停？答案很机械：当模型这一轮<strong>不再输出工具调用、只输出纯文本</strong>时。
          Agent 最后会回一句「已拆分为三个文件并保留 auth.js 兼容入口，测试全部通过」——这条没有工具调用的纯文本回复，
          就是 harness 判定「任务完成、退出循环、把控制权还给你」的信号。在这之前的每一轮，它都还在干活。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        理解了「一轮轮收敛」，你和 Agent 的协作方式会变得高效得多。第一，<strong>别指望一句话就完美</strong>：
        把任务说清楚、把约束提前给够，能省掉它中途反复发问的轮次。第二，<strong>它停下来问你不是变笨了</strong>，
        恰恰是它在岔路口尊重你的决策权——认真回答这些问题，比事后返工划算。第三，看到它跑测试、改报错的来回，
        别嫌它磨蹭，那正是它在替你兜住质量。
      </p>
      <p>
        还有一条很实用：<strong>学会「读轨迹」</strong>。当 Agent 结果不对，别急着骂它笨，去回看它的轨迹——
        是探索阶段没读对文件？是计划拆错了步？还是某一步 Edit 改偏了？轨迹里几乎总能找到「事情从哪一轮开始走歪」。
        会读轨迹的人，能用一句精准的补充指令把它拉回正轨；不会读的人，只能反复重发「再试一次」。
      </p>

      <Practice title="预测头三步">
        <p>
          挑一条你自己项目里的真实指令，比如「把 utils 里的日期处理函数抽成单独模块并加测试」。
          在让 Agent 动手之前，先<strong>自己写下</strong>你预测它头三步会做什么工具调用（提示：大概率前两步都是只读的探索）。
        </p>
        <p>
          然后真的发给它，对照它实际的头三步。你会发现：凡是设计良好的 Agent，开头几乎一定在
          <em>Grep</em> 和 <em>Read</em>，而不是在 <em>Edit</em>。这个习惯本身，就是它靠谱的标志。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent 完成一个任务不是一步到位，而是「动作 → 观察结果 → 再动作」一轮轮收敛。',
          '本质上 Agent 就是一个 while 循环包着一次次 LLM 调用，循环每圈执行模型点名的工具并把结果塞回上下文。',
          '探索先行：先用 Grep/Read 把现状读进上下文，再出计划、再动手，比端到端一把改成功率高。',
          '模型只能看见被工具拉进上下文的内容，没读到的文件对它就是黑箱——这是很多“它改错了”的真正原因。',
          'TodoWrite 把多步工作外化成可见清单，既给用户看进度，也帮模型自己别漏步；琐碎任务则不必列。',
          '遇到有歧义或破坏式的决策（如是否保持旧 API 兼容），Agent 会停下来把选择权交回人类。',
          '改完会用 Bash 跑测试自我验证；失败就读报错、定位、Edit 修复、再测，直到全绿，这是最高频的小循环。',
          '当模型这一轮只输出纯文本、不再调用工具时，循环结束、控制权交还给你。',
        ]}
      />
    </>
  )
}
