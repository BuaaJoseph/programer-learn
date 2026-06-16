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

const gatePseudo = `// harness 在执行任何工具调用前，先过一道闸
function checkPermission(toolCall) {
  if (matchAny(denyRules, toolCall))  return 'deny'   // 1) Deny 最先查
  if (matchAny(askRules,  toolCall))  return 'ask'    // 2) 再查 Ask
  if (matchAny(allowRules, toolCall)) return 'allow'  // 3) 最后查 Allow
  return DEFAULT_FOR(toolCall)                         // 没命中 → 走该工具默认
}

// 模型只能「提议」，真正决定执行与否的是这个函数，不是模型
const verdict = checkPermission(model.proposedToolCall)
if (verdict === 'deny') refuse()
else if (verdict === 'ask') await askUser()  // 停下来等你
else run(model.proposedToolCall)`

const auditLog = `# 完整会话日志：每个动作 + 结果都留痕，可逐条复盘
[10:02:31] tool_use   Grep    pattern="auth"               → 命中 4 个文件
[10:02:33] tool_use   Read    src/auth.js                  → 600 行
[10:02:51] tool_use   Edit    src/login.js  (new)          → ✅ 已写入
[10:03:08] ask        Bash    "git push origin refactor"   → 用户拒绝
[10:03:40] tool_use   Bash    "npm test"                   → 1 failed
[10:03:55] tool_use   Edit    src/token.js  L1             → ✅ 已写入
[10:04:02] tool_use   Bash    "npm test"                   → all passed`

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
      <p>
        <strong>为什么 Deny 必须排在最前</strong>？因为安全机制的铁律是「<em>失败要朝安全的方向失败</em>」。
        把最高优先级给「拒绝」，意味着只要一条 Deny 命中，无论你在 Allow 里怎么放行、规则写得多乱，
        危险动作都执行不了。反过来如果 Allow 能盖过 Deny，那一条过宽的 <code>Allow(Bash(**))</code>
        就可能把你精心设的 <code>Deny(rm -rf)</code> 架空——这是绝不能接受的。<strong>越危险的判定，越要优先、越要一票否决。</strong>
      </p>

      <h3>默认策略：读放行、写要问、危险挡死</h3>
      <p>
        在没特别配置时，默认就很合理：<strong>只读工具</strong>（Read、Grep）默认 Allow，因为看一眼不会造成破坏；
        <strong>写类工具</strong>（Edit、Write）和 <strong>Bash</strong> 默认 Ask，因为它们会改东西、会执行命令；
        而像 <code>rm -rf</code> 这种<strong>危险操作</strong>，可以用 Deny 永久封死，连误触的机会都不给。
      </p>
      <p>
        <strong>这个默认背后的设计哲学是「最小惊讶 + 最小权限」</strong>：默认放行的，都是改不坏东西的；
        会改变世界的，默认都先停一下问你。新手常犯的错是嫌 Ask 烦、直接 <code>Allow(Bash(**))</code> 一把全开，
        等于把所有 Bash 命令（包括删库、推远端）都无声放行——这就把默认精心设计的安全边界整个拆了。
        要省心，应该<em>精确地</em>把可信命令加进 Allow（如 <code>Bash(npm test:*)</code>），而不是用通配符一把梭。
      </p>

      <PermissionGate />

      <p>
        把上面的规则落到代码上，这道「闸」其实就是一个在执行前先跑的判定函数：
      </p>
      <CodeBlock lang="javascript" title="权限闸：执行前先判定（伪代码）" code={gatePseudo} />
      <p>
        看清楚关键：模型产出的只是一个 <code>proposedToolCall</code>（<em>提议</em>），它能不能真的 <code>run()</code>，
        完全由 <code>checkPermission</code> 这个<strong>确定性函数</strong>说了算。模型再「想」执行，
        判定函数返回 deny 就是不行。安全性建立在这段普通代码上，而不是建立在「但愿模型听话」上。
      </p>

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
      <Callout variant="warn" title="为什么不能把安全交给 prompt">
        <p>
          有人觉得「在 system prompt 里写一句『绝对不要删文件』不就行了？」——不行，而且很危险。
          prompt 是<strong>软约束</strong>：模型可能理解偏差、可能被后续输入诱导（提示注入），概率上总有漏网的一次。
          而权限规则是<strong>硬约束</strong>：它是代码层面的 <code>if</code> 判断，不存在「概率上听话」，命中就是命中。
          原则记牢：<em>能力可以交给模型，安全必须交给代码。</em>把生杀大权放在一个本质是概率系统的东西手里，是不负责任的。
        </p>
      </Callout>

      <h2>可中断、可审查</h2>
      <p>
        除了事前的规则，还有两道兜底。<strong>可中断</strong>：Agent 跑偏了，你随时按 <code>Esc</code> 打断它，
        不必等它把错事做完。<strong>可审查</strong>：每一次工具调用、每一个结果都记在<strong>完整的会话日志</strong>里，
        事后能逐条复盘「它到底做了什么」。能停、能查，你才真正握着控制权。
      </p>
      <CodeBlock lang="text" title="会话日志：每个动作都留痕" code={auditLog} />
      <p>
        <strong>这三道防线是分时段配合的</strong>：权限规则是<em>事前</em>拦截（动作执行前判定）；可中断是<em>事中</em>叫停
        （执行过程中你喊停）；可审查是<em>事后</em>追溯（出了问题翻日志定位）。事前、事中、事后各一道，
        哪一层漏了还有下一层兜——这正是安全工程里「纵深防御」的思路。单靠任何一道都不够：
        规则可能没覆盖到某个边界，那就靠事中中断；中断没来得及，那就靠事后审查复盘并补规则。
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
      <p>
        <strong>这三类的共同点是什么</strong>？都是「<em>错了之后很难或无法挽回</em>」的动作。可逆的小事（改个局部实现、
        加个测试）错了大不了再改一遍，交给 Agent 自主跑没问题；不可逆的大事（删数据、推线上、改对外接口）一旦错了
        代价极高，这时多花你几秒确认，是<strong>极其划算的保险</strong>。判断要不要问，本质就是在掂量这一动作的
        「不可逆程度 × 影响面」。
      </p>
      <Callout variant="warn" title="边界情况：问得太多也是一种失败">
        <p>
          人在回路不等于「事事都问」。如果 Agent 连「加一行 log」「读个文件」都来确认，你会被打断到崩溃，
          很快就会习惯性无脑点「同意」——而这恰恰让确认变成<strong>橡皮图章</strong>，等真正危险的请求来了你也照点不误。
          好的设计是<em>把确认留给真正重要的少数关口</em>：通过合理的 Allow 让琐事悄无声息，让每一次 Ask 都「值得你认真看一眼」。
          安全确认的有效性，建立在它足够<strong>稀有</strong>之上。
        </p>
      </Callout>

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
      <p>
        配规则有个好用的顺序：<strong>先把 Deny 写死</strong>（你的红线，比如 <code>rm -rf</code>、读 <code>.env</code>、
        碰生产数据库），这是底线，最先定；<strong>再按需放宽 Allow</strong>（用着用着发现哪个安全命令老被问，就精确加进去）；
        Ask 基本交给默认即可。记住一条：<em>Allow 要写得越精确越好，Deny 要写得越宽越安全</em>——
        放行宁可窄一点多问几次，禁止宁可宽一点别留缝。
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
        <p>
          进阶检验：再套一个刁钻的——「Agent 想跑 <code>npm test &amp;&amp; rm -rf dist</code>」这种<strong>把安全命令和危险命令串在一起</strong>的请求，
          你的规则挡得住吗？（提示：如果只 Allow 了 <code>npm test:*</code> 而 Deny 没覆盖到，可能就漏了。这正是 Deny 要写宽的原因。）
        </p>
      </Practice>

      <Summary
        points={[
          '每个工具调用都被一组权限规则评估，顺序是 Deny > Ask > Allow，第一个命中的赢。',
          'Deny 排最前是为了「朝安全方向失败」：危险判定必须一票否决，不能被过宽的 Allow 架空。',
          '默认策略（读放行、写与 Bash 要问、危险挡死）体现最小权限；别用通配符 Allow(Bash(**)) 一把全开把它拆了。',
          '权限由外层 harness 的确定性函数强制执行，模型只能提议；安全是硬约束（代码），prompt 只是软约束，不能用来兜安全。',
          '三道防线分时配合：权限规则事前拦截、Esc 可中断事中叫停、会话日志事后可审查，即纵深防御。',
          '重要、破坏式、有歧义（共性是难以挽回）的决策应交回人类；判断标准是「不可逆程度 × 影响面」。',
          '问得太多会让确认沦为橡皮图章——要让 Ask 足够稀有，每次都值得认真看一眼。',
          '配规则的顺序：先写死 Deny 红线，再精确放宽 Allow；放行要窄、禁止要宽。',
        ]}
      />
    </>
  )
}
