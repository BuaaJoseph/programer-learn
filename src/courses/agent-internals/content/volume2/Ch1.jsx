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

      <h2>第 2 轮：出计划，并用 TodoWrite 外化</h2>
      <p>
        读懂之后，Agent 把多步工作拆成一份<strong>可见的清单</strong>，用 <code>TodoWrite</code> 写下来。
        这既是给你看的（你能实时知道它打算怎么干），也是给它自己看的（防止做着做着忘了还有几步）：
      </p>
      <CodeBlock lang="javascript" title="第 2 轮：写下 Todo 清单" code={todoStep} />

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

      <KeyIdea title="不是一步到位，而是一轮轮收敛">
        <p>
          整个过程没有任何一步是「一次性完成」的。每一轮，模型只做一件事：读完当前所有上下文，输出
          <strong>下一个</strong>动作（一个工具调用，或最终文本）。harness 执行这个动作、把结果塞回上下文，
          再发起下一轮。任务就在这「动作 → 观察结果 → 再动作」的循环里，像逼近一样一点点收敛到完成。
        </p>
      </KeyIdea>

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
          '探索先行：先用 Grep/Read 把现状读进上下文，再出计划、再动手，比端到端一把改成功率高。',
          'TodoWrite 把多步工作外化成可见清单，既给用户看进度，也帮模型自己别漏步。',
          '遇到有歧义或破坏式的决策（如是否保持旧 API 兼容），Agent 会停下来把选择权交回人类。',
          '改完会用 Bash 跑测试自我验证；失败就读报错、定位、Edit 修复、再测，直到全绿。',
          '当模型这一轮只输出纯文本、不再调用工具时，循环结束、控制权交还给你。',
        ]}
      />
    </>
  )
}
