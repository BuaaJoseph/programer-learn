import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import PermissionGate from '@/courses/agent-internals/illustrations/PermissionGate.jsx'

const rulesEval = `# 权限规则的评估顺序：Deny > Ask > Allow，第一个命中的赢
请求：Bash  rm -rf src/auth_old/

  1. 先查 Deny 规则 …… 命中 "Bash(rm -rf:*)"  → 拒绝，直接挡死
  （后面的 Ask / Allow 根本不会被看）

请求：Read  src/auth.js
  1. Deny  …… 不命中
  2. Ask   …… 不命中
  3. Allow …… 命中（只读工具默认放行）  → 直接执行，不打扰你`

const settingsRules = `{
  "permissions": {
    "allow": [
      "Read(**)",
      "Grep(**)",
      "Bash(npm test:*)",
      "Bash(npm run lint:*)"
    ],
    "ask": [
      "Edit(**)",
      "Write(**)",
      "Bash(git push:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Read(./.env)",
      "Read(**/secrets/**)"
    ]
  }
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          前面我们见过 Agent 在重构里<strong>停下来问你</strong>「要不要保留旧入口」。这不是它礼貌，
          也不是它「觉得」该问——而是有一套<strong>权限机制</strong>在背后强制它停。这一章讲清楚：
          哪些动作能自己做、哪些必须先问你、哪些被永久挡死，以及为什么「人在回路」是 Agent 敢上生产的前提。
        </p>
      </Lead>

      <h2>权限规则：Deny &gt; Ask &gt; Allow</h2>
      <p>
        每当 Agent 想执行一个工具调用，harness 会先拿这个请求去比对一组权限规则。规则分三类，
        按<strong>固定优先级</strong>评估，<strong>第一个命中的规则赢</strong>，后面的不再看：
      </p>
      <ul>
        <li><strong>Deny（拒绝）</strong>：优先级最高。命中就<strong>永久挡死</strong>，连问都不问。</li>
        <li><strong>Ask（询问）</strong>：命中就<strong>停下来问你</strong>，你同意才执行。</li>
        <li><strong>Allow（放行）</strong>：命中就<strong>直接执行</strong>，不打扰你。</li>
      </ul>
      <CodeBlock lang="text" title="评估顺序：第一个命中的赢" code={rulesEval} />

      <h3>默认策略：读放行、写要问、危险挡死</h3>
      <p>
        在没特别配置时，默认就很合理：<strong>只读工具</strong>（Read、Grep）默认 Allow，因为看一眼不会造成破坏；
        <strong>写类工具</strong>（Edit、Write）和 <strong>Bash</strong> 默认 Ask，因为它们会改东西、会执行命令；
        而像 <code>rm -rf</code> 这种<strong>危险操作</strong>，可以用 Deny 永久封死，连误触的机会都不给。
      </p>

      <PermissionGate />

      <Example title="重构里的两个关口">
        <p>
          回到 auth 重构。<strong>「要不要删掉旧文件」</strong>：删文件是破坏式的、不可逆的，命中 Ask（甚至你可以把
          <code>rm</code> 设成 Deny，逼它改用更安全的方式）。<strong>「要不要改公开 API」</strong>：这会影响所有调用方、
          带歧义，同样该停下来问你。而 Agent 全程的 <code>Read</code>、<code>Grep</code>、跑 <code>npm test</code>
          都命中 Allow，悄无声息地放行——你只在真正重要的岔路口被打扰。
        </p>
      </Example>

      <KeyIdea title="权限是 harness 强制的，不是 LLM 自觉">
        <p>
          这是最关键的一点：权限<strong>不靠模型自律</strong>。不是「我们在 prompt 里求模型别删文件」——
          模型可能忽略、可能被绕过。真正拦住它的是<strong>外层的 harness</strong>：模型只能<em>提出</em>工具调用，
          调用要不要真的执行，由 harness 拿规则去判。哪怕模型铁了心要 <code>rm -rf</code>，
          命中 Deny 就是执行不了。<strong>把安全放在模型之外、用确定性的代码强制</strong>，这才靠得住。
        </p>
      </KeyIdea>

      <h2>可中断、可审查</h2>
      <p>
        除了事前的规则，还有两道兜底。<strong>可中断</strong>：Agent 跑偏了，你随时按 <code>Esc</code> 打断它，
        不必等它把错事做完。<strong>可审查</strong>：每一次工具调用、每一个结果都记在<strong>完整的会话日志</strong>里，
        事后能逐条复盘「它到底做了什么」。能停、能查，你才真正握着控制权。
      </p>

      <h2>为什么要停下来问你：人在回路</h2>
      <p>
        Agent 该自己决定的事尽管做，但遇到三类情况，它应当把决策<strong>交回人类</strong>，而不是擅自拍板：
      </p>
      <ul>
        <li><strong>重要</strong>：影响面大的决定，比如改动公开 API、动数据库结构。</li>
        <li><strong>破坏式</strong>：不可逆的操作，比如删文件、强推、删分支。</li>
        <li><strong>有歧义</strong>：存在多种合理选择、需求没说死，比如「保兼容还是求干净」。</li>
      </ul>
      <p>
        这就是<em>人在回路</em>（human in the loop）：在这些岔路口，由人来定方向，Agent 负责把方向执行好。
        它停下来问，不是能力不足，恰恰是设计得对。
      </p>

      <Callout variant="warn" title="可控性，是上生产的前提">
        <p>
          一个想删什么就删什么、没人能拦、出了事查无可查的 Agent，没人敢放进生产环境。正是
          「Deny 挡死危险 + Ask 守住关键 + 可中断 + 全程可审查 + 重要决策交回人类」这一整套，
          让 Agent 从「好玩的玩具」变成「可被信任、敢上生产」的工具。<strong>能力让 Agent 有用，
          可控性才让它能用。</strong>
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        你不该把可控性全交给默认值，而要<strong>主动调权限</strong>。把你信得过的只读命令、测试命令加进 Allow，
        减少没必要的打扰；把会改代码、会推远端的放进 Ask，守住关口；把绝不能发生的（删库、读密钥）写死成 Deny。
        花十分钟配好规则，换来的是「日常顺滑、危险全挡」的体验。
      </p>

      <Practice title="写一段权限规则">
        <p>
          为你自己的一个项目，写一段 <code>.claude</code> 的 settings 权限配置，分 allow / ask / deny 三档：
          想清楚哪些命令你愿意它<strong>自动执行</strong>、哪些必须<strong>先问你</strong>、哪些要<strong>彻底禁止</strong>。
        </p>
        <CodeBlock lang="json" title=".claude/settings.json（示例）" code={settingsRules} />
        <p>
          写完自检：把这套规则套到「Agent 想跑 <code>rm -rf build/</code>」「想 <code>git push</code>」
          「想 Read 你的 <code>.env</code>」三个请求上，按 Deny &gt; Ask &gt; Allow 走一遍，
          结果是不是都和你的预期一致？不一致就调，直到规则真正替你守住边界。
        </p>
      </Practice>

      <Summary
        points={[
          '每个工具调用都被一组权限规则评估，顺序是 Deny > Ask > Allow，第一个命中的赢。',
          '默认策略：只读工具放行、写类与 Bash 要确认、危险操作可用 Deny 永久挡死。',
          '权限由外层 harness 强制执行，不靠 LLM 自觉；模型只能提议，执行与否由规则定。',
          'Agent 可随时被 Esc 中断，所有动作记入完整会话日志、事后可审查。',
          '重要、破坏式、有歧义的决策应交回人类（人在回路），而非 Agent 擅自决定。',
          '正是这套可控性（挡死危险、守住关键、可中断、可审查）让 Agent 敢上生产。',
        ]}
      />
    </>
  )
}
