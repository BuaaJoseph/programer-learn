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

      <h2>TodoWrite：把计划外化成可见清单</h2>
      <p>
        想好了怎么干，Agent 用 <code>TodoWrite</code> 把多步任务写成一份清单。这份清单同时服务两个对象：
        给<strong>你</strong>看（实时知道进度到哪了），也给<strong>模型自己</strong>看（在越来越长的上下文里，
        别忘了还有哪几步没做）。
      </p>
      <CodeBlock lang="javascript" title="重构任务的 Todo 清单" code={todoList} />

      <PlanTodo />

      <h3>三个状态，一条硬约束</h3>
      <p>
        每个 todo 只有三种状态：<code>pending</code>（待办）、<code>in_progress</code>（进行中）、
        <code>completed</code>（已完成）。配套有一条<strong>硬性约束</strong>：任意时刻，<strong>恰好只有一个</strong>
        任务处于 <code>in_progress</code>。完成当前这个，才能开下一个；而且做完<strong>立即</strong>把它标成 completed，
        不要攒着一起改。
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

      <Callout variant="warn" title="拆太碎和拆太粗都不好">
        <p>
          <strong>拆太碎</strong>：「打开文件」「找到第 12 行」「输入一个左括号」——这种琐碎到没有信息量的清单，
          只会刷屏、浪费 token，还掩盖了真正的进度。<strong>拆太粗</strong>：把整个任务写成「重构 auth 模块」一条，
          等于没拆——失败时无从定位，进度上要么 0% 要么 100%。好的颗粒度是<strong>一条对应一个可独立验证的产物</strong>：
          抽出一个文件、补一组测试、跑通一次测试，这种粒度刚刚好。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        懂了这套机制，你能更聪明地用 Agent。第一，<strong>大任务先让它进计划模式</strong>，看完方案再放它去改，
        省下大量返工。第二，<strong>把 Todo 清单当成沟通界面</strong>：它列出来的步骤如果方向不对，
        现在就纠正，比等它做完便宜得多。第三，你自己接到大需求时，也不妨先在脑子里走一遍「探索 → 计划 → 拆步」——
        这套方法对人同样有效。
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
      </Practice>

      <Summary
        points={[
          '先探索再编码：把「理解现状」和「动手修改」分成两阶段，比端到端一把过成功率高得多。',
          '计划模式只读不改、产出方案交用户审核，把决策风险挪到返工成本最低的时刻。',
          'TodoWrite 把多步计划外化成可见清单，既给用户看进度，也帮模型自己别漏步。',
          'todo 有 pending / in_progress / completed 三状态；硬约束是任意时刻恰好一个 in_progress。',
          '完成当前才能开下一个，且做完立即更新状态，逼出串行、专注、可追踪的执行。',
          '拆步颗粒度要恰当：一条对应一个可独立验证的产物，太碎是噪声、太粗无法定位。',
        ]}
      />
    </>
  )
}
