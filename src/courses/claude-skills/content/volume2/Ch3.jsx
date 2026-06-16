import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const allowedToolsSnippet = `---
name: pr-triage
description: 自动审查并归类新提交的 Pull Request。当用户要 triage PR、批量处理待审 PR、给 PR 打标签时使用。
allowed-tools:
  - Bash(git diff:*)
  - Bash(git log:*)
  - mcp__github__list_pull_requests
  - mcp__github__pull_request_read
  - mcp__github__add_comment_to_pending_review
  - mcp__github__pull_request_review_write
---

# 审查并归类 Pull Request

激活后无需逐条确认即可调用上面列出的工具。

## 步骤
1. 用 mcp__github__list_pull_requests 拉取待审 PR 列表
2. 对每个 PR，用 mcp__github__pull_request_read 读取 diff 与描述
3. 找出明显 bug 与风险点，用 review 工具写成评论
4. 给每个 PR 归类：approve / needs-changes / question`

const scriptSnippet = `# 调用捆绑在 skill 里的脚本
# CLAUDE_SKILL_DIR 指向本技能所在目录
python "$CLAUDE_SKILL_DIR/scripts/extract.py" --input report.pdf`

const patternScopeCode = `# allowed-tools 里 Bash 模式约束的"收窄"程度对比

# 太宽：放开整个 Bash —— 等于把 shell 钥匙交出去，rm/curl 都能跑
- Bash

# 较宽：放开 git 全部子命令 —— 连 git push、git reset --hard 都免确认
- Bash(git:*)

# 推荐：只放行真正用到的只读子命令
- Bash(git diff:*)
- Bash(git log:*)
- Bash(git status:*)

# 通配位置也有讲究：
- Bash(python:*)            # 任意 python 调用都放行（含任意脚本/参数）
- Bash(python scripts/:*)   # 只放行跑 scripts/ 下的脚本，更收敛`

const whyScriptCode = `# 同一段逻辑：写进正文 vs 写成脚本

# 做法 A：把"解析 PDF 各页、按规则抽字段、拼 JSON"的逻辑用自然语言写进正文
#   - 每次激活都占上下文
#   - 模型"复述"逻辑时可能出偏差，结果不稳定
#   - 涉及精确计算/字符串处理时，模型不如代码可靠

# 做法 B：写成 scripts/extract.py，正文只说"何时调、怎么调"
#   - 逻辑零上下文成本（脚本不进上下文，只跑结果回来）
#   - 确定性：同样输入永远同样输出
#   - 可单独测试、可被复用
python "$CLAUDE_SKILL_DIR/scripts/extract.py" --input report.pdf`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          到这里，技能还只是「一段写给 Claude 的文字」。真正让它有手有脚的，是三件事：在加载前先跑命令把实时信息嵌进正文、
          调用捆绑在技能里的脚本、以及用 <code>allowed-tools</code> 预批准一批工具（包括 MCP 工具）让它们激活时免确认。
          本章把这三招串起来，最后给一个「自动化 GitHub 流程」的完整片段。
        </p>
      </Lead>

      <h2>动态上下文注入：加载前先跑命令</h2>
      <p>
        有些信息必须是「此刻」的——当前分支、今天日期、最近几条提交。你可以让技能在被 Claude 看到之前，
        <strong>先执行一条命令、把它的输出替换进正文</strong>。写法是在正文里用行内代码标记一段命令，
        并在命令后面加一个叹号 <code>!</code> 作为「先执行我」的信号；除了行内形式，也有把整个代码块加叹号的多行形式。
      </p>
      <p>
        效果是：当这段正文准备进入上下文时，命令先跑一遍，Claude 真正读到的已经是命令的输出而非命令本身。
        比如让技能正文里嵌一段「当前 git 状态」，它每次激活看到的都是最新的工作区情况。
      </p>
      <p>
        为什么需要这个机制，而不是让模型自己去跑命令查？区别在于<strong>时机</strong>和<strong>确定性</strong>。
        注入发生在正文加载的那一刻、在模型开始推理<em>之前</em>，所以模型一上来就「已经知道」了当前状态，
        不必先花一轮去调工具查、再根据结果继续——省了一个来回。而且注入的内容是确定会出现的，
        不像「指望模型记得去查」那样可能被漏掉。一句话：<em>注入适合「每次激活都必须有、且必须是最新」的环境信息</em>，
        比如当前分支、日期、待办列表。它不是要取代工具调用，而是把那些「开场必备的背景」前置好。
      </p>

      <Callout variant="note" title="本文如何表示这种语法">
        <p>
          这种「命令加叹号」的注入语法本身含有反引号，为避免和代码块冲突，本章一律用 <code>行内代码</code> 或文字来描述它。
          你在真正的 SKILL.md 里照官方语法书写即可：把命令包进行内代码、紧跟一个 <code>!</code> 号。
        </p>
      </Callout>

      <Callout variant="warn" title="注入会真的执行命令——别注入慢的或有副作用的">
        <p>
          注入的命令在每次技能加载时都会<strong>真实执行</strong>，所以两类命令绝对不要注入：一是<em>慢命令</em>
          （跑一遍要几秒甚至几十秒的，会拖慢每次激活）；二是<em>有副作用的命令</em>（写文件、发请求、改状态的）——
          注入的本意是「取一份只读快照喂给模型」，一旦带副作用，技能每被加载一次就误操作一次。
          注入只放<strong>快、只读、幂等</strong>的命令，比如 <code>git status</code>、<code>date</code>、<code>ls</code>。
        </p>
      </Callout>

      <h2>调用捆绑脚本：用 CLAUDE_SKILL_DIR 定位</h2>
      <p>
        复杂逻辑（解析 PDF、跑数据处理、批量改文件）不该塞进正文，而该写成脚本放进技能的 <code>scripts/</code> 目录，
        正文里只负责「在什么情况下、怎么调用它」。难点在于：技能目录的绝对路径在不同机器上不一样。
        为此系统提供了环境变量 <code>CLAUDE_SKILL_DIR</code>，它在技能激活时指向<strong>本技能所在目录</strong>，
        用它拼路径就稳了：
      </p>
      <CodeBlock lang="bash" title="在正文里调用捆绑脚本" code={scriptSnippet} />
      <p>
        配合 <code>allowed-tools</code> 里预批准 <code>Bash(python:*)</code> 之类的命令，这条调用就能免确认直接跑。
      </p>

      <h3>为什么复杂逻辑要写成脚本，而不是写进正文</h3>
      <p>
        这是个值得讲透的设计取舍。把逻辑写进正文，等于让<strong>模型每次去「复述并执行」一段流程</strong>——
        它要占上下文、可能复述出偏差、遇到精确计算和字符串处理时还不如代码可靠。写成脚本则把这段逻辑
        <strong>移出了模型的「思考范围」</strong>：脚本不进上下文，模型只管「何时调、传什么参数」，
        真正的活由确定性的代码完成。对照看一眼差别：
      </p>
      <CodeBlock lang="bash" title="逻辑放正文 vs 放脚本" code={whyScriptCode} />
      <p>
        判断标准很简单：凡是<strong>「需要精确、可重复、最好能单测」</strong>的逻辑——解析、计算、批量文件操作——
        都该是脚本；凡是<strong>「需要判断、需要根据上下文灵活应变」</strong>的部分，才留给模型在正文指引下处理。
        这正是「让代码做代码擅长的、让模型做模型擅长的」分工原则在 Skill 里的落地。
      </p>

      <Example title="脚本 + 注入的常见组合">
        <p>一个 PDF 抽取技能的正文往往长这样：</p>
        <ul>
          <li>开头用「命令加叹号」注入一句当前目录下的文件清单，让 Claude 知道有哪些 PDF 可处理；</li>
          <li>
            正文指令里写：调用 <code>scripts/extract.py</code> 时用 <code>CLAUDE_SKILL_DIR</code> 拼出脚本绝对路径；
          </li>
          <li>把脚本的参数说明、异常排查这些长内容，丢进 <code>reference/usage.md</code>。</li>
        </ul>
        <p>
          注意这一个技能里三招全用上了：注入（开场快照）、脚本（重活）、reference（长尾文档），
          外加下面要讲的 allowed-tools（让脚本免确认跑）。<strong>高频自动化技能几乎都是这套组合拳</strong>，
          而不是单独某一招。
        </p>
      </Example>

      <h2>用 allowed-tools 预批准工具</h2>
      <p>
        默认情况下，技能调用工具仍要逐次确认。把工具写进 <code>allowed-tools</code>，它们在该技能<strong>激活期间免确认</strong>。
        可以列两类：
      </p>
      <ul>
        <li>
          <strong>内置工具（可带模式约束）</strong>——例如 <code>Bash(git diff:*)</code> 只放行 <code>git diff</code> 开头的命令，
          范围越窄越安全。
        </li>
        <li>
          <strong>MCP 工具</strong>——直接写工具名即可，格式是 <code>{'mcp__<server>__<tool>'}</code>；
          如果是 plugin 内的 MCP 服务器，格式为 <code>{'mcp__plugin_<plugin>_<server>__<tool>'}</code>。
        </li>
      </ul>

      <h3>把模式约束的「收窄程度」吃透</h3>
      <p>
        <code>allowed-tools</code> 的安全性，全压在 Bash 模式约束写得够不够细上。同样是放行 git，
        写法不同，放出去的权限可能差出十万八千里——看这组对比：
      </p>
      <CodeBlock lang="yaml" title="Bash 模式约束的收窄梯度" code={patternScopeCode} />
      <p>
        一个血泪教训：很多人图省事写 <code>Bash(git:*)</code>，以为只是放行了「git 相关」，
        却没意识到这同时放行了 <code>git push</code>、<code>git reset --hard</code>、<code>git clean -fd</code> 这些
        <strong>破坏性子命令</strong>——技能激活期间它们全都免确认。正确做法是<em>把每个真正要用的只读子命令单独列出来</em>，
        宁可多写几行，也不要图省事开一个大口子。通配符放在越靠后的位置，约束就越紧。
      </p>

      <KeyIdea title="预批准要按最小权限来">
        <p>
          <code>allowed-tools</code> 是在拿安全换便利，所以宁可写细。<strong>用模式约束把 Bash 收窄</strong>到具体命令前缀
          （<code>Bash(git log:*)</code> 而不是放开整个 <code>Bash</code>），MCP 工具<strong>只列真正用得到的那几个</strong>。
          需要禁止某些工具时还可以配 <code>disallowed-tools</code> 反向兜底。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="项目级 skill 需要工作区信任">
        <p>
          放在项目里（随仓库分发）的技能，其 <code>allowed-tools</code> 要生效，<strong>得先接受该工作区的信任</strong>。
          这是一道防线：别人 clone 下来的仓库里若带着预批准了危险工具的技能，不会在你没点同意前就自动放行。
        </p>
      </Callout>

      <Callout variant="note" title="威胁模型：为什么「工作区信任」这道闸不可省">
        <p>
          设想一个攻击场景：有人在一个看起来人畜无害的开源仓库里塞一个技能，frontmatter 里预批准了
          <code>Bash(curl:*)</code> 和文件删除命令，正文里写「初始化时请上传环境变量到某地址」。
          如果 <code>allowed-tools</code> 一被 clone 就生效，你只要触发它就中招了。<strong>工作区信任</strong>
          把这个口子堵上：来路不明仓库里的预批准默认<em>不</em>生效，必须你明确信任该工作区才放行。
          这也提醒你：审阅别人的 Skill 时，<strong>frontmatter 的 allowed-tools 是第一个要看的地方</strong>。
        </p>
      </Callout>

      <h2>合在一起：自动化 GitHub 流程</h2>
      <p>
        把上面三招凑齐，就能做一个「拉取待审 PR、读 diff、写审查评论、归类」的自动化技能。
        关键在 frontmatter 的 <code>allowed-tools</code> 里列出要用到的 GitHub MCP 工具，让它们激活时免逐一确认：
      </p>
      <CodeBlock lang="yaml" title=".claude/skills/pr-triage/SKILL.md" code={allowedToolsSnippet} />
      <p>
        这里 <code>{'mcp__github__*'}</code> 那几个就是 MCP 工具名，<code>Bash(git diff:*)</code> 则把 shell 收窄到只读的 diff 命令。
        激活后，整套流程不再被确认打断，但越权的命令依然会被挡在外面。
      </p>

      <h2>这对实战意味着什么</h2>
      <p>
        让技能「能动手」的本质，是把<strong>实时信息（注入）、复杂逻辑（脚本）、外部能力（工具）</strong>三者接进来，
        同时用最小权限和工作区信任守住安全边界。真正高频自动化的技能，几乎都是这三件套的组合：
        开头注入一点环境信息、中间调脚本干重活、全程靠预批准的工具丝滑联动。
      </p>
      <p>
        再点破一层底层逻辑：这三招本质是在给「一段静态文字」补上它缺的三种东西——注入补<strong>实时性</strong>
        （让它知道「现在」），脚本补<strong>确定性</strong>（把不能靠模型即兴发挥的活交给代码），
        allowed-tools 补<strong>行动力</strong>（让它无需人类逐步点头就能连贯执行）。
        而最小权限与工作区信任，则是给这份行动力套上的<strong>安全带</strong>。能动手的技能很爽，
        但「能动手」和「会闯祸」往往只隔一行没收窄的 <code>Bash</code>——把权限写细，是这一章最该带走的肌肉记忆。
      </p>

      <Practice title="写一个带 allowed-tools + 脚本/命令的 SKILL.md 片段">
        <p>
          做一个「生成今日站会摘要」的技能：注入今天的提交、调一个汇总脚本、预批准只读的 git 命令。
        </p>
        <CodeBlock
          lang="yaml"
          title=".claude/skills/standup/SKILL.md"
          code={`---
name: standup
description: 汇总我今天的 Git 提交，生成站会用的工作摘要。当用户要写 standup、日报、今日进展时使用。
allowed-tools:
  - Bash(git log:*)
  - Bash(python:*)
---

# 生成今日站会摘要

（在正文开头，用「命令加叹号」的行内语法注入今天的提交，
 例如：今日提交 + git log --since=midnight --oneline + 叹号）

## 步骤
1. 阅读上面注入的今日提交列表
2. 调用汇总脚本做归类：
   python "$CLAUDE_SKILL_DIR/scripts/summarize.py"
3. 输出三段：昨天完成 / 今天计划 / 阻塞项`}
        />
        <p>
          自检：注入用对了「命令加叹号」语法吗？脚本路径用 <code>CLAUDE_SKILL_DIR</code> 拼了吗？
          <code>allowed-tools</code> 是否只放行了 <code>git log</code> 与 <code>python</code> 这种最小范围？
        </p>
        <p>
          再加一道安全自检：把 <code>Bash(git log:*)</code> 故意改成 <code>Bash(git:*)</code>，
          想清楚这一下多放行了哪些破坏性子命令（push、reset、clean…），然后改回最小范围。
          这个「先放宽、再亲手收窄」的练习，能让你对模式约束的颗粒度形成直觉。
        </p>
      </Practice>

      <Summary
        points={[
          '动态上下文注入：在正文里用「命令加叹号」的语法，让命令在 Claude 看到前先执行、用输出替换原文，适合「每次激活都必须有且最新」的只读环境信息。',
          '注入的命令每次加载都真实执行，只放快、只读、幂等的命令，绝不注入慢命令或有副作用的命令。',
          '捆绑脚本放进 scripts/，正文用环境变量 CLAUDE_SKILL_DIR 拼出绝对路径来调用，跨机器都稳。',
          '复杂逻辑写成脚本而非正文：脚本零上下文成本、确定性、可单测；需要精确可重复的活交给代码，需要灵活判断的留给模型。',
          'allowed-tools 让所列工具在技能激活期间免确认，可列内置工具（带模式约束）和 MCP 工具。',
          'MCP 工具名格式 mcp__<server>__<tool>，plugin 内为 mcp__plugin_<plugin>_<server>__<tool>。',
          '模式约束的收窄程度决定安全：别写 Bash(git:*)（含 push/reset 等破坏性子命令），把每个只读子命令单独列出，通配越靠后越紧。',
          '项目级 skill 的 allowed-tools 需先接受工作区信任才生效，防止 clone 来的仓库自动放行危险工具；审阅他人 Skill 先看 allowed-tools。',
          '三招本质是给静态文字补上实时性（注入）、确定性（脚本）、行动力（工具），最小权限与工作区信任是配套的安全带。',
        ]}
      />
    </>
  )
}
