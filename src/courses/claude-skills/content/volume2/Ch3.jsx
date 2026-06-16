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

      <Callout variant="note" title="本文如何表示这种语法">
        <p>
          这种「命令加叹号」的注入语法本身含有反引号，为避免和代码块冲突，本章一律用 <code>行内代码</code> 或文字来描述它。
          你在真正的 SKILL.md 里照官方语法书写即可：把命令包进行内代码、紧跟一个 <code>!</code> 号。
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

      <Example title="脚本 + 注入的常见组合">
        <p>一个 PDF 抽取技能的正文往往长这样：</p>
        <ul>
          <li>开头用「命令加叹号」注入一句当前目录下的文件清单，让 Claude 知道有哪些 PDF 可处理；</li>
          <li>
            正文指令里写：调用 <code>scripts/extract.py</code> 时用 <code>CLAUDE_SKILL_DIR</code> 拼出脚本绝对路径；
          </li>
          <li>把脚本的参数说明、异常排查这些长内容，丢进 <code>reference/usage.md</code>。</li>
        </ul>
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
          <strong>MCP 工具</strong>——直接写工具名即可，格式是 <code>mcp__&lt;server&gt;__&lt;tool&gt;</code>；
          如果是 plugin 内的 MCP 服务器，格式为 <code>mcp__plugin_&lt;plugin&gt;_&lt;server&gt;__&lt;tool&gt;</code>。
        </li>
      </ul>

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

      <h2>合在一起：自动化 GitHub 流程</h2>
      <p>
        把上面三招凑齐，就能做一个「拉取待审 PR、读 diff、写审查评论、归类」的自动化技能。
        关键在 frontmatter 的 <code>allowed-tools</code> 里列出要用到的 GitHub MCP 工具，让它们激活时免逐一确认：
      </p>
      <CodeBlock lang="yaml" title=".claude/skills/pr-triage/SKILL.md" code={allowedToolsSnippet} />
      <p>
        这里 <code>mcp__github__*</code> 那几个就是 MCP 工具名，<code>Bash(git diff:*)</code> 则把 shell 收窄到只读的 diff 命令。
        激活后，整套流程不再被确认打断，但越权的命令依然会被挡在外面。
      </p>

      <h2>这对实战意味着什么</h2>
      <p>
        让技能「能动手」的本质，是把<strong>实时信息（注入）、复杂逻辑（脚本）、外部能力（工具）</strong>三者接进来，
        同时用最小权限和工作区信任守住安全边界。真正高频自动化的技能，几乎都是这三件套的组合：
        开头注入一点环境信息、中间调脚本干重活、全程靠预批准的工具丝滑联动。
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
      </Practice>

      <Summary
        points={[
          '动态上下文注入：在正文里用「命令加叹号」的语法，让命令在 Claude 看到前先执行、用输出替换原文。',
          '捆绑脚本放进 scripts/，正文用环境变量 CLAUDE_SKILL_DIR 拼出绝对路径来调用，跨机器都稳。',
          'allowed-tools 让所列工具在技能激活期间免确认，可列内置工具（带模式约束）和 MCP 工具。',
          'MCP 工具名格式 mcp__<server>__<tool>，plugin 内为 mcp__plugin_<plugin>_<server>__<tool>。',
          '预批准按最小权限：用 Bash(cmd:*) 收窄命令、只列必要的 MCP 工具，必要时配 disallowed-tools。',
          '项目级 skill 的 allowed-tools 需先接受工作区信任才生效，防止 clone 来的仓库自动放行危险工具。',
        ]}
      />
    </>
  )
}
