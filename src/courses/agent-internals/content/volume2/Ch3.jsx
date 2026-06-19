import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import PlanTodo from '@/courses/agent-internals/illustrations/PlanTodo.jsx'

const explorePhase = `# 阶段一：探索（只读，不改任何东西）
Grep  pattern="require\\\\('./auth'\\\\)"  glob="**/*.js"  # 谁在用 auth
Read  file="src/auth.js"                                   # 主文件
Read  file="test/auth.test.js"                             # 现有测试
# —— 读完，对现状有了完整认识，才进入下一阶段 ——

# 阶段二：编码（基于探索的结论动手）
Edit  …  # 拆分
Edit  …  # 补测试`

const todoList = `TodoWrite todos=[
  { content: "读 auth.js 与其调用方，确认拆分边界",   status: "completed"  },
  { content: "确认是否保留 auth.js 兼容入口",          status: "completed"  },
  { content: "抽出 login.js（登录流程）",              status: "in_progress" },  // ← 恰好一个
  { content: "抽出 session.js（会话管理）",            status: "pending"     },
  { content: "抽出 token.js（签发与校验）",            status: "pending"     },
  { content: "auth.js 改为转发，保持旧接口",           status: "pending"     },
  { content: "补 login / token 单元测试并跑通",        status: "pending"     },
]`

const goodVsBadTodo = `# ✗ 拆太碎：全是噪声，刷屏又浪费 token
- 打开 auth.js
- 找到 login 函数
- 选中第 40 到 92 行
- 复制
- 新建 login.js
- 粘贴
...

# ✗ 拆太粗：等于没拆，失败时无从定位
- 重构 auth 模块

# ✓ 恰当：一条 = 一个可独立验证的产物
- 抽出 login.js（登录流程），原 import 同步迁移
- 抽出 token.js（签发与校验）
- auth.js 改为转发，保持旧接口
- 补 login / token 单元测试并跑通`

const paymentTodo = `TodoWrite todos=[
  // —— 探索步 ——
  { content: "读现有结算/下单逻辑，定位接钱的位置", status: "pending" },
  { content: "看密钥与环境变量怎么管（找 config）",  status: "pending" },
  // —— 实现步 ——
  { content: "接入 Stripe SDK，封装一个 payment 模块", status: "pending" },
  { content: "实现创建支付意图 + 处理回调 webhook",    status: "pending" },
  // —— 验证步 ——
  { content: "用 Stripe 测试卡跑通一笔完整支付",       status: "pending" },
]`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          Agent 怎么知道「下一步该干什么」？它不是随机乱试。在动手之前，一个好的 Agent 会先<strong>探索</strong>、
          再<strong>计划</strong>，并把计划拆成一份可勾选的 <em>Todo</em> 清单，然后才一项一项地执行。
          这一章讲的就是：执行的步骤到底是怎么被定下来的。
        </p>
      </Lead>

      <h2>为什么要先探索再动手</h2>
      <p>
        回想第一章那条「先探索、后编码」的实践。它的逻辑很硬：模型只能基于<strong>它读到的东西</strong>来决策。
        如果上来就改代码，它对「auth.js 被谁依赖、现有测试覆盖了什么、命名风格是怎样」一无所知，改出来的东西
        多半是错的或不合群的。所以官方建议把大任务<strong>明确分成两个阶段</strong>：先读、先理解、先出计划，再实现。
      </p>
      <CodeBlock lang="text" title="两阶段：探索 → 编码" code={explorePhase} />
      <p>
        实践反复证明：这样分阶段，比让模型端到端地「边读边改一把过」<strong>成功率高得多</strong>——因为它把
        「搞清楚要做什么」和「具体怎么做」这两件容易互相干扰的事，拆开来分别专注。
      </p>
      <p>
        <strong>底层原理：为什么「混着干」更容易出错</strong>。模型在生成时是顺序往下推的，一旦它在还没读懂全貌时
        就开始 Edit，后续的每一步都建立在一个<em>残缺的认知</em>上，错误会沿着轨迹累积、放大。先探索，
        相当于先把一个<strong>稳固的事实地基</strong>铺进上下文，后面的计划和修改都站在这块地基上，自然更稳。
        这和人写代码前先通读相关模块、是同一个道理——只不过对模型来说，「通读」就是把内容 Read 进上下文这个动作。
      </p>
      <Callout variant="warn" title="常见误区：把探索当成浪费时间">
        <p>
          有人看到 Agent 开头连读好几个文件，觉得「磨叽、烧 token、赶紧改啊」。但跳过探索省下的那几轮，
          往往要用<strong>后面十几轮的返工</strong>来还。探索不是成本，是<em>投资</em>：花在前面理解上的 token，
          换来的是后面少改错、少推倒重来。真正该避免的是<em>无目的的乱读</em>（整个目录全吞），而不是探索本身。
        </p>
      </Callout>

      <h2>计划模式：只读，给你审</h2>
      <p>
        探索的极致形态是<em>计划模式</em>（plan mode）。在这个模式下，Agent <strong>只读不改</strong>：
        它可以 Grep、Read、调研，然后产出一份「我打算怎么干」的方案，<strong>交给你审核</strong>，
        在你点头之前一行代码都不会动。
      </p>
      <KeyIdea title="计划模式的价值：把风险前置">
        <p>
          对一个会动很多文件的大任务，让 Agent 先在「只读」的安全区里把方案想清楚、给你过一遍，
          远比它闷头改了一半你才发现方向错了要划算。<strong>计划阶段改方案的成本几乎为零，
          执行阶段返工的成本很高。</strong>计划模式就是把决策的风险挪到最便宜的时刻。
        </p>
      </KeyIdea>
      <p>
        <strong>计划模式 vs 普通模式，怎么选</strong>？经验法则：任务<em>越大、越发散、越不可逆</em>，
        越值得先进计划模式。给一行代码改个 typo，进计划模式纯属仪式感；而「重构核心模块」「迁移整套配置」「批量改接口」
        这类会动很多文件的活，先看一份方案再放行，几乎总是稳赚。判断标准很朴素：<strong>万一它理解错了方向，返工代价大不大？</strong>
        代价大，就先计划。
      </p>
      <Callout variant="warn" title="边界情况：计划模式不是万能保险">
        <p>
          计划模式只能保证「动手前你看过方案」，不能保证方案<strong>本身一定对</strong>。如果探索阶段它读漏了关键文件，
          产出的方案照样会带着这个盲区。所以审方案时别只看「步骤排得顺不顺」，要重点看
          <em>它的事实依据对不对</em>——「它说 auth 只被 4 处引用，真的只有 4 处吗？」基于错前提的漂亮计划，
          照样会翻车。
        </p>
      </Callout>

      <h2>TodoWrite：把计划外化成可见清单</h2>
      <p>
        想好了怎么干，Agent 用 <code>TodoWrite</code> 把多步任务写成一份清单。这份清单同时服务两个对象：
        给<strong>你</strong>看（实时知道进度到哪了），也给<strong>模型自己</strong>看（在越来越长的上下文里，
        别忘了还有哪几步没做）。
      </p>
      <CodeBlock lang="javascript" title="重构任务的 Todo 清单" code={todoList} />
      <p>
        <strong>为什么要把计划「写下来」，而不是让模型记在脑子里</strong>？因为上一章讲过——模型没有脑子，
        只有上下文。计划如果不落成文字塞进上下文，到了第 10 轮，早期那句「我打算分七步」早被后面大段的文件内容、
        报错淹没了。TodoWrite 把计划变成上下文里一块<strong>持续可见、每轮都会被重新读到</strong>的结构，
        相当于给模型外挂了一份「不会遗忘的备忘录」。这是用工程手段补足模型「无记忆」短板的典型设计。
      </p>

      <PlanTodo />

      <h3>三个状态，一条硬约束</h3>
      <p>
        每个 todo 只有三种状态：<code>pending</code>（待办）、<code>in_progress</code>（进行中）、
        <code>completed</code>（已完成）。配套有一条<strong>硬性约束</strong>：任意时刻，<strong>恰好只有一个</strong>
        任务处于 <code>in_progress</code>。完成当前这个，才能开下一个；而且做完<strong>立即</strong>把它标成 completed，
        不要攒着一起改。
      </p>
      <p>
        <strong>为什么是「恰好一个」而不是「随便几个并行」</strong>？因为 Agent 在单条轨迹里本质是<em>串行</em>地一轮做一件事——
        硬约束「只有一个 in_progress」正是把这个串行特性显式化，逼模型聚焦：先把手上这件干完、验证、收尾，再开下一件。
        如果允许同时挂三个进行中，模型很容易这件做一半、那件做一半，最后哪件都没真正完成，进度上也看不出到底卡在哪。
        「做完立即标 completed」则是为了让进度<strong>实时准确</strong>——攒着一起改，你看到的进度就是过期的假象。
      </p>
      <Example title="约束在重构里怎么体现">
        <p>
          上面的清单里，前两条已 completed，「抽出 login.js」是唯一的 in_progress，其余全是 pending。
          Agent 不会同时挂着「抽 login」和「抽 session」两个进行中——它做完 login、测一下、标 completed，
          才把 session 这条翻成 in_progress。这条规则逼着它<strong>串行、专注、可追踪</strong>，
          也让你随时一眼看出「它现在卡在哪一步」。
        </p>
      </Example>

      <h2>大任务怎么拆步</h2>
      <p>
        拆步的目标是：每一步都<strong>足够具体到能直接动手</strong>，又<strong>足够大到值得单独列一条</strong>。
        重构任务被拆成「读懂 → 定约束 → 抽 login → 抽 session → 抽 token → 改转发 → 补测试」七步，
        每一步对应明确的产物，做完能验证。
      </p>
      <CodeBlock lang="text" title="同一个任务，三种拆法" code={goodVsBadTodo} />

      <Callout variant="warn" title="拆太碎和拆太粗都不好">
        <p>
          <strong>拆太碎</strong>：「打开文件」「找到第 12 行」「输入一个左括号」——这种琐碎到没有信息量的清单，
          只会刷屏、浪费 token，还掩盖了真正的进度。<strong>拆太粗</strong>：把整个任务写成「重构 auth 模块」一条，
          等于没拆——失败时无从定位，进度上要么 0% 要么 100%。好的颗粒度是<strong>一条对应一个可独立验证的产物</strong>：
          抽出一个文件、补一组测试、跑通一次测试，这种粒度刚刚好。
        </p>
      </Callout>
      <p>
        <strong>一个好用的判据</strong>：问自己「这一条做完，能不能用一句话说清它产出了什么、并且能当场验证？」
        「抽出 login.js 并迁移 import」——能，跑一下看 import 没断就验证了。「找到 login 函数」——不能，
        它没产出任何可验证的东西，只是个中间动作。<em>可独立验证的产物</em>，就是拆步颗粒度的那把尺子。
      </p>

      <h2>这对你意味着什么</h2>
      <p>
        懂了这套机制，你能更聪明地用 Agent。第一，<strong>大任务先让它进计划模式</strong>，看完方案再放它去改，
        省下大量返工。第二，<strong>把 Todo 清单当成沟通界面</strong>：它列出来的步骤如果方向不对，
        现在就纠正，比等它做完便宜得多。第三，你自己接到大需求时，也不妨先在脑子里走一遍「探索 → 计划 → 拆步」——
        这套方法对人同样有效。
      </p>
      <p>
        第四，<strong>审 Todo 时重点看「探索步在不在」</strong>。一份只有实现步、上来就「写 payment 模块」的清单，
        说明它还没搞清楚现状就要动手，是危险信号。好清单的开头几条，通常都是「读 X、看 Y 怎么配」这类探索动作——
        这和第一章「开头几乎一定在 Grep/Read」是同一件事，只不过这次体现在计划层面。
      </p>

      <Practice title="给「接入支付」列一个合理的 Todo">
        <p>
          假设任务是「给项目接入 Stripe 支付」。<strong>不要</strong>写代码，先像 Agent 那样列一份 Todo 清单：
          先有探索步（读现有结算逻辑、看配置怎么管），再有实现步，最后有验证步。
        </p>
        <p>
          检验你列得好不好：每一条是不是都<strong>具体到能直接动手</strong>、又<strong>对应一个能单独验证的产物</strong>？
          有没有一条粗到「接入支付」这种废话，或碎到「import 一个包」这种噪声？调整到刚好的颗粒度为止。
        </p>
        <p>下面是一份参考答案，注意它的探索步—实现步—验证步三段结构：</p>
        <CodeBlock lang="javascript" title="参考：接入 Stripe 的 Todo" code={paymentTodo} />
      </Practice>

      <Summary
        points={[
          '先探索再编码：把「理解现状」和「动手修改」分成两阶段，比端到端一把过成功率高得多。',
          '探索是投资不是浪费：先铺稳事实地基，后面的修改才不会沿着残缺认知累积错误。',
          '计划模式只读不改、产出方案交用户审核，把决策风险挪到返工成本最低的时刻；任务越大越不可逆越该用。',
          '计划模式只保证你看过方案，不保证方案对——审方案要重点看它的事实依据，而非步骤是否顺。',
          'TodoWrite 把多步计划外化成上下文里持续可见的结构，补足模型「无记忆」的短板。',
          'todo 有 pending / in_progress / completed 三状态；硬约束是任意时刻恰好一个 in_progress，逼出串行与聚焦。',
          '做完立即标 completed，进度才实时准确；攒着一起改会让你看到过期的假进度。',
          '拆步颗粒度的尺子是「一条 = 一个可独立验证的产物」，太碎是噪声、太粗无法定位。',
        ]}
      />
    </>
  )
}
