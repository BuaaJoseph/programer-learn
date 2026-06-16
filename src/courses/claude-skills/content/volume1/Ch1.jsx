import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const skillMdCode = `---
name: commit-helper
description: 提交前检查改动并写出规范的 commit message。当用户准备提交代码、需要审查 staged 改动或生成 commit 信息时使用。
---

# 提交前助手

在帮用户提交代码前，按以下步骤操作：

1. 运行 git status 与 git diff --staged，确认改动范围。
2. 检查是否混入了调试代码、密钥、注释掉的大段代码。
3. 按 Conventional Commits 规范写 message：
   - 格式 type(scope): summary
   - type 取值 feat / fix / docs / refactor / test / chore
   - 摘要用祈使句、不超过 50 字符
4. 把建议的 commit 命令给用户确认后再执行。`

const createSkillCode = `# 1. 创建个人 skill 目录（目录名即斜杠命令名 /commit-helper）
mkdir -p ~/.claude/skills/commit-helper

# 2. 写入 SKILL.md（frontmatter + 正文）
cat > ~/.claude/skills/commit-helper/SKILL.md <<'EOF'
---
name: commit-helper
description: 提交前检查改动并写出规范的 commit message。当用户准备提交代码、需要审查 staged 改动或生成 commit 信息时使用。
---

# 提交前助手

帮用户提交前：先看 git status / git diff --staged，检查有无密钥或调试代码，
再按 Conventional Commits 写 message，给出命令让用户确认后执行。
EOF

# 3. 确认文件就位
ls ~/.claude/skills/commit-helper/`

const promptVsSkillCode = `# 同一类任务，两种做法的对比

# 做法 A：每次会话都手敲一长串 prompt（一次性，下次还得重来）
"帮我提交，先看 git diff --staged，别带进 console.log 和密钥，
 commit message 按 Conventional Commits 写，type 用 feat/fix/...，
 摘要祈使句不超过 50 字符，给我命令我确认后再执行"

# 做法 B：把上面这段沉淀成 commit-helper skill，之后只说一句
"帮我提交这些改动"
# → Claude 读到 description 命中触发条件，自动套用整套流程`

const whenNotSkillCode = `# 不适合做成 Skill 的几种情况

# 1. 一次性的、不会重复的需求 —— 直接说就好，别为它建目录
"把这个函数改个名"

# 2. 需要"工具/能力"而非"流程说明" —— 那是 MCP 的活
"查一下生产库里 users 表有多少行"   # 需要数据库连接 = MCP server

# 3. 高度依赖当前对话上下文的临时判断 —— 写死成规则反而僵硬
"这一版你觉得 A 方案还是 B 方案好"`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          你有没有发现，同一类活儿总要对 Claude 重复交代一遍？「提交前先看一眼 diff、别带进密钥、commit message 按规范写」——
          每个项目、每一天都要手敲一长串提示。<em>Skill</em> 就是来终结这种重复的：把「某类任务该怎么做」沉淀成一个
          带触发条件的指令包，放到约定好的目录里，Claude 在合适的时候<strong>自动</strong>取来用。
        </p>
      </Lead>

      <h2>Skill 到底是什么</h2>
      <p>
        一句话：Skill 是给 Agent 的「按需说明书」。它本质是一个文件夹，里面有一个 <code>SKILL.md</code>，
        开头一段 frontmatter 写清楚「我叫什么、什么时候该用我」，正文写清楚「具体该怎么做」。
        除此之外还能附带脚本、模板、参考文档等资源。Claude 启动时只会先看到那一小段「我是谁、何时用我」，
        真正要用时才把正文读进来——这套机制叫<em>渐进式披露</em>，下一章细讲。
      </p>
      <p>
        所以 Skill 不是某种新模型能力，而是一种<strong>组织知识与流程的方式</strong>：
        把你脑子里那套「这类任务的标准做法」写下来一次，之后人人、每次都能复用。
      </p>
      <p>
        为什么 Anthropic 要专门设计这么一套机制，而不是让你把规则写进一个超大的系统提示里？根本原因是
        <strong>注意力是稀缺资源</strong>。模型的上下文窗口虽大，但塞进去的每个 token 都在稀释它对当前任务的注意力——
        无关内容越多，模型越容易「跑偏」或漏掉关键约束。如果你把十几套不同任务的规则一股脑写进系统提示，
        模型在写 commit 的时候还得分神去看那些跟 PDF 处理、跟发版无关的条款。Skill 的设计正是为了解决这个矛盾：
        平时只让模型看到一句「我是谁、何时用我」，等任务真正命中了，才把对应的完整指令喂进去。
        这就是「<em>按需加载</em>」相比「<em>一次性灌满</em>」的本质优势。
      </p>

      <h3>它解决的几个真实痛点</h3>
      <ul>
        <li>
          <strong>重复流程沉淀</strong>：把「发版前的检查清单」「写完代码跑哪些 lint」固化下来，不用每次口述。
        </li>
        <li>
          <strong>领域知识封装</strong>：公司内部某个 API 的调用规矩、某种文件格式的处理套路，写进 Skill，
          Claude 用到时自动拿，不用你贴一长段背景。
        </li>
        <li>
          <strong>省上下文</strong>：长 prompt 每轮都占着窗口；Skill 平时只占元数据那几十个字，用到了才加载正文。
        </li>
        <li>
          <strong>团队共享</strong>：放进项目的 <code>.claude/skills/</code> 提交到仓库，整个团队拉下来就都有了，
          还能随 plugin 分发。
        </li>
      </ul>

      <Example title="prompt 反复手敲 vs Skill 一次沉淀">
        <p>
          同一类「提交前检查」任务，左边是没有 Skill 时的现实——每次会话都得把整套要求复述一遍；
          右边是把它沉淀成 Skill 之后，你只需要说一句话：
        </p>
        <CodeBlock lang="bash" title="两种做法对照" code={promptVsSkillCode} />
        <p>
          差别不只是「少打字」。做法 A 里，规则散落在你的记忆和聊天记录里，今天说得全、明天可能漏一条；
          换个同事接手，他根本不知道你们团队的提交规矩。做法 B 把规则<strong>外化成一份可版本管理的文件</strong>，
          规则改了就改文件，所有人下次都自动用上新版本。
        </p>
      </Example>

      <Example title="把「提交前检查」做成一个 Skill">
        <p>
          假设你每次提交前都要叮嘱 Claude 一长串话。与其每次手敲，不如把这套做法写成一个名叫 commit-helper 的 Skill：
        </p>
        <CodeBlock lang="markdown" title="~/.claude/skills/commit-helper/SKILL.md" code={skillMdCode} />
        <p>
          之后你只要说「帮我提交这些改动」，Claude 读到 description 里「准备提交代码」这个触发条件，就会自动套用这套流程：
          先看 diff、查密钥、按规范写 message。你不用再复述任何一条规则。
        </p>
      </Example>

      <KeyIdea title="prompt 是说一次，Skill 是沉淀一次、自动复用">
        <p>
          普通 prompt 是一次性输入，说完就过去了，下次还得重说。Skill 把指令<strong>持久化</strong>成一个带触发条件的包：
          写一次，之后只要任务匹配上 description，Claude 就会主动取用。可以把它理解成
          「<em>给 Agent 装的一个个可触发的小技能</em>」，而不是一段临时的话。
        </p>
      </KeyIdea>

      <h3>和 prompt / MCP / subagent 的关系</h3>
      <p>
        这几个概念常被混在一起，其实分工很清楚，而且可以组合使用：
      </p>
      <ul>
        <li>
          <strong>prompt</strong>：一次性的输入，无法被自动复用。Skill 解决的正是「同一段 prompt 反复敲」的问题。
        </li>
        <li>
          <strong>Skill</strong>：可复用、可被自动触发的指令／知识包，还能携带脚本与资源。
        </li>
        <li>
          <strong>MCP</strong>：提供的是<em>工具</em>（可调用的函数，比如查数据库、发消息）。Skill 不提供工具，
          但可以在正文里引导 Claude「该用哪个 MCP 工具、怎么用」。
        </li>
        <li>
          <strong>subagent</strong>：一个隔离的执行体，有独立的上下文。Skill 是知识与流程，subagent 是干活的人，
          两者可以配合——比如让 subagent 在执行时遵循某个 Skill。
        </li>
      </ul>
      <Callout variant="tip" title="一句话记住区别">
        <p>
          prompt 是「这次怎么说」，Skill 是「这类活儿怎么做」，MCP 是「能动用哪些工具」，subagent 是「派谁去单独干」。
          它们不是互斥的，真实项目里常常叠在一起用。
        </p>
      </Callout>

      <p>
        下面这张表把四者的边界钉死，遇到「这事该用哪个」的纠结时可以直接对照：
      </p>
      <table>
        <thead>
          <tr>
            <th>概念</th>
            <th>本质</th>
            <th>能否复用</th>
            <th>能否自动触发</th>
            <th>典型用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>prompt</td>
            <td>一次性输入文本</td>
            <td>否</td>
            <td>不适用</td>
            <td>临时、一次性的请求</td>
          </tr>
          <tr>
            <td>Skill</td>
            <td>带触发条件的指令/知识包</td>
            <td>是</td>
            <td>是（靠 description）</td>
            <td>某类任务的标准做法、领域知识</td>
          </tr>
          <tr>
            <td>MCP</td>
            <td>可调用的工具/函数</td>
            <td>是</td>
            <td>由模型按需调用</td>
            <td>连数据库、发消息、调外部 API</td>
          </tr>
          <tr>
            <td>subagent</td>
            <td>独立上下文的执行体</td>
            <td>是</td>
            <td>由主 Agent 派发</td>
            <td>隔离的子任务、并行探索</td>
          </tr>
        </tbody>
      </table>

      <Callout variant="note" title="常见误区：把 Skill 当成「能调工具的东西」">
        <p>
          很多人第一次接触 Skill，会以为它和 MCP 一样能「连数据库、发请求」。这是混淆了<strong>知识</strong>与<strong>能力</strong>。
          Skill 本身<em>不携带任何可执行能力</em>——它顶多在正文里写一段 bash 让 Claude 去跑、或引导 Claude「这一步去调某个 MCP 工具」。
          真正提供「能力」（一个可被调用的函数接口）的永远是 MCP。一个清晰的心智模型是：
          Skill 是「<strong>剧本</strong>」，告诉演员怎么演；MCP 是「<strong>道具</strong>」，演员表演时可以拿起来用。
        </p>
      </Callout>

      <h3>什么时候不该做成 Skill</h3>
      <p>
        Skill 很好用，但不是什么都往里塞。判断标准只有一句话：<strong>这件事会重复、有相对固定的做法吗？</strong>
        如果答案是否定的，做成 Skill 反而是负担——你要维护一个永远只用一次的文件。下面几类就不适合：
      </p>
      <CodeBlock lang="bash" title="哪些情况不该建 Skill" code={whenNotSkillCode} />
      <p>
        尤其要警惕第二类：当你发现需求的核心是「访问某个外部系统」（数据库、第三方 API、内部服务）时，
        缺的是<em>工具</em>而不是<em>说明书</em>，该去配 MCP server。Skill 只能描述「调它的时候该注意什么」，
        变不出连接本身。把这两者分清楚，能省掉大量「为什么我的 Skill 不工作」的困惑。
      </p>

      <h3>存放位置与两种触发方式</h3>
      <p>
        Skill 按作用范围放在不同目录，目录名就是它的斜杠命令名（比如目录 <code>pdf</code> 对应命令 <code>/pdf</code>）：
      </p>
      <ul>
        <li><strong>个人级</strong>：<code>{'~/.claude/skills/<name>/SKILL.md'}</code>，只对你自己生效。</li>
        <li><strong>项目级</strong>：<code>{'.claude/skills/<name>/SKILL.md'}</code>，提交进仓库后团队共享。</li>
        <li><strong>插件分发</strong>：也可以随 plugin 一起打包发布。</li>
      </ul>
      <p>
        个人级与项目级分开放，是为了让「我自己的习惯」和「团队的规矩」互不污染。你装在 <code>~/.claude/skills/</code> 里的
        commit 习惯，不会因为换了个项目就丢；而项目里 <code>.claude/skills/</code> 下的发版流程，clone 仓库的每个人都自动继承。
        当两边出现同名 Skill 时，<strong>项目级通常优先</strong>——团队约定盖过个人偏好，这在协作中是更安全的默认。
      </p>
      <p>触发方式有两种：</p>
      <ul>
        <li>
          <strong>自动触发</strong>：Claude 根据 description 判断当前任务是否匹配，匹配就自动加载使用。
          description 写得越准，触发越靠谱。
        </li>
        <li>
          <strong>手动触发</strong>：直接输入 <code>/skill-name</code> 强制调用。
        </li>
      </ul>
      <p>
        frontmatter 里还能微调触发策略：<code>disable-model-invocation: true</code> 表示只允许手动调用（Claude 不会自动用）；
        <code>user-invocable: false</code> 表示只自动触发、不出现在斜杠菜单里。
      </p>
      <p>
        这两个开关看起来鸡肋，实战里却很关键。<code>disable-model-invocation: true</code> 适合那种
        「<strong>误触代价很高</strong>」的 Skill——比如一个会真的执行删除、部署、发邮件的流程，你不希望模型自作主张地触发它，
        只允许人明确敲 <code>/命令</code> 才走。反过来，<code>user-invocable: false</code> 适合那种纯背景知识型 Skill——
        比如「公司内部命名规范」，它不该作为一个命令出现在菜单里让人手动调，而应该在相关任务出现时静默地喂给模型。
        理解了「误触代价」和「是否该露脸」这两个维度，你就知道每个开关该在什么时候打开。
      </p>

      <Callout variant="warn" title="description 写不好，等于白做">
        <p>
          自动触发完全靠 description。如果写成「一个有用的 skill」这种含糊话，Claude 根本判断不出何时该用，
          它就永远不会被自动触发。description 要明确说出<strong>这个 Skill 做什么、在什么情境下该用</strong>，
          把用户可能说的关键词带进去（如「提交」「commit」「审查改动」）。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        理解了 Skill，你做 Agent 的思路会变：不再是每次会话都从零交代规则，而是把团队的「最佳实践」沉淀成一组 Skill，
        让它们随项目一起版本管理。新人拉下仓库就继承了整套做事方法；某个流程要改，改一个 <code>SKILL.md</code> 全员同步。
        更重要的是，因为渐进式加载，<strong>沉淀再多 Skill 也几乎不增加日常上下文成本</strong>——这让「为每类任务都写个 Skill」
        在工程上真正可行。
      </p>
      <p>
        把视角再拉高一层：Skill 让团队的「隐性知识」变成「显性资产」。过去那些只存在于资深工程师脑子里的
        「这个服务发版前一定要先跑契约测试」「这种文件别用默认编码」，全靠口口相传，人一走就断档。
        写成 Skill 之后，这些经验变成了<strong>可审阅、可 review、可演进</strong>的代码资产——它会进 PR、会被讨论、会留下
        git 历史。这是 Skill 在工程组织层面最被低估的价值：它不只是省你的事，它在<em>沉淀整个团队的工程文化</em>。
      </p>

      <Practice title="动手创建你的第一个 Skill">
        <p>
          下面用最少的命令搭出一个可用的 Skill：建目录、写 <code>SKILL.md</code>、确认就位。跑完后开一个新会话，
          说一句「帮我提交这些改动」，看 Claude 是否自动套用了这套流程。
        </p>
        <CodeBlock lang="bash" title="创建 commit-helper skill" code={createSkillCode} />
        <p>
          建好后试两件事：一是直接输入 <code>/commit-helper</code> 手动触发，二是把 description 改得更含糊些，
          观察自动触发是否就失灵了——亲手体会 description 的分量。
        </p>
        <p>
          进阶练习：把这个 Skill 从个人级 <code>~/.claude/skills/</code> 复制一份到某个项目的 <code>.claude/skills/</code> 下，
          把项目那份的 description 稍作修改（比如加一句团队特有的规则），然后在该项目里触发，确认<strong>项目级覆盖了个人级</strong>。
          再给它加上 <code>disable-model-invocation: true</code>，验证自然语言「帮我提交」不再自动触发、必须敲 <code>/commit-helper</code>。
          这一套走下来，你对「存放位置」和「触发策略」就有了肌肉记忆。
        </p>
      </Practice>

      <Summary
        points={[
          'Skill 是给 Agent 的「按需说明书」：把某类任务的标准做法写进一个带触发条件的指令包，Claude 在合适时自动取用。',
          'Skill 本质是一个含 SKILL.md 的目录，frontmatter 写「叫什么、何时用」，正文写「怎么做」，还可附带脚本与资源。',
          '设计动机是「注意力稀缺」：按需加载相关指令，胜过把所有规则一次性灌进系统提示稀释模型注意力。',
          '它解决重复流程沉淀、领域知识封装、省上下文、团队共享四类痛点，把「反复手敲长 prompt」一次性消除。',
          'prompt 是一次性输入，Skill 可复用可自动触发，MCP 提供工具，subagent 是隔离执行体，四者可组合而非互斥。',
          'Skill 是「剧本」不是「道具」：它不携带可执行能力，需要访问外部系统时缺的是 MCP，不是 Skill。',
          '不会重复、无固定做法、纯依赖临时上下文判断的需求，不适合做成 Skill。',
          'Skill 放在 ~/.claude/skills/（个人）或 .claude/skills/（项目）下，目录名即斜杠命令名，同名时项目级通常优先，也可随 plugin 分发。',
          '触发分自动（靠 description）与手动（/skill-name）；frontmatter 可用 disable-model-invocation、user-invocable 按「误触代价」与「是否该露脸」调整策略。',
        ]}
      />
    </>
  )
}
