import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SkillAnatomy from '@/courses/claude-skills/illustrations/SkillAnatomy.jsx'

const minimalSkill = `---
name: my-skill-name
description: 一句话说明做什么、何时使用，含关键词帮助触发
---

# 我的技能标题

正文写给 Claude 看的指令、规则、步骤和示例。
比如：当用户要做某件事时，请按以下顺序执行……

1. 第一步做什么
2. 第二步做什么
3. 输出格式要求是什么`

const dirTree = `.claude/skills/
└── pdf-extract/
    ├── SKILL.md         # 必需：frontmatter + 正文
    ├── reference/       # 可选：详细文档（API、排错指南）
    │   └── api.md
    ├── scripts/         # 可选：可执行脚本
    │   └── extract.py
    ├── templates/       # 可选：模板文件
    └── assets/          # 可选：图片、数据等`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个 Skill 说到底就是<strong>一个文件夹加一个 Markdown 文件</strong>。文件夹的名字就是这个技能的名字，
          里面那个 SKILL.md 把「这个技能做什么、什么时候该用、具体怎么做」一次性讲清楚。
          本章拆开 SKILL.md 的两个部分——开头的 <em>frontmatter</em> 和后面的正文——再给你一个能直接跑的最小模板。
        </p>
      </Lead>

      <h2>SKILL.md 的三段式结构</h2>
      <p>
        每个 SKILL.md 文件都由固定的几块拼成：最上面用两行 <code>---</code> 夹住的一段 YAML，叫 frontmatter，
        是给系统看的元信息；下面是正文，是给 Claude 看的指令；而文件夹里除了 SKILL.md，
        还可以放 reference、scripts、templates、assets 这些「可选资源目录」。
      </p>
      <p>
        其中只有 SKILL.md 是必需的。frontmatter 里也只有 <code>description</code> 一个字段真正关键——
        它决定了 Claude 在什么时候会「想起来」用这个技能。其余字段都是按需添加。
      </p>

      <Example title="一眼看懂一个 Skill 文件夹">
        <p>「目录名就是命令名」：下面这个技能放在 pdf-extract 文件夹里，它的命令名就是 pdf-extract。</p>
        <CodeBlock lang="text" title="技能目录结构" code={dirTree} />
        <p>
          正文里引用其它文件，一律用<strong>相对路径</strong>，例如 <code>[api](reference/api.md)</code>。
          这样 Claude 需要时才会去读 reference 里的详细内容，平时不占上下文。
        </p>
      </Example>

      <SkillAnatomy />

      <h2>常用 frontmatter 字段</h2>
      <p>
        frontmatter 字段不少，但绝大多数场景只会用到前两三个。下面按「常用程度」从上到下排，挑你需要的用：
      </p>
      <ul>
        <li>
          <code>name</code>——技能名，省略时默认取目录名。一般无需手写。
        </li>
        <li>
          <code>description</code>——<strong>最重要</strong>。一句话说清「做什么 + 何时使用」，要带触发关键词。下一章专门讲它。
        </li>
        <li>
          <code>when_to_use</code>——追加的触发条件，和 <code>description</code> 合计不超过 1536 字符。
        </li>
        <li>
          <code>argument-hint</code> / <code>arguments</code>——声明这个技能接受什么参数，给出输入提示。
        </li>
        <li>
          <code>disable-model-invocation</code>——设为 <code>true</code> 时，技能<strong>只能手动调用</strong>，模型不会自动触发。
        </li>
        <li>
          <code>user-invocable</code>——设为 <code>false</code> 时，技能<strong>只能自动触发</strong>，并从命令菜单里隐藏。
        </li>
        <li>
          <code>allowed-tools</code> / <code>disallowed-tools</code>——预批准 / 禁用的工具，激活时免确认。第 3 章细讲。
        </li>
        <li>
          <code>model</code> / <code>effort</code>——指定运行模型与思考强度（low/medium/high/xhigh/max）。
        </li>
        <li>
          <code>context</code> / <code>agent</code>——<code>context: fork</code> 让技能在隔离的 subagent 里跑；<code>agent</code> 配合指定 Explore、Plan 等。
        </li>
        <li>
          <code>hooks</code> / <code>paths</code> / <code>shell</code>——挂钩子、用 glob 限制自动触发的路径、指定 bash 或 powershell。
        </li>
      </ul>

      <KeyIdea title="先把 description 写好，其余字段按需加">
        <p>
          一个能用的技能，frontmatter 里往往<strong>只有 name 和 description</strong>。
          其余字段都是为特定需求服务的——要参数才加 <code>argument-hint</code>，要隔离环境才加 <code>context: fork</code>，
          要免确认调工具才加 <code>allowed-tools</code>。不要一上来就把所有字段堆满。
        </p>
      </KeyIdea>

      <Callout variant="note" title="name 的取值规则">
        <p>
          <code>name</code> 省略时默认就是目录名，所以<strong>目录名最好直接起成你想要的命令名</strong>，
          全小写、用连字符分词，例如 pdf-extract、release-notes。这样既是文件夹名，也是命令名，还是技能名，三位一体。
        </p>
      </Callout>

      <h2>最小可用模板</h2>
      <p>
        把下面这段存成 SKILL.md，它就是一个合法、能被识别的技能。两行 <code>---</code> 之间是 frontmatter，
        空一行之后是以 <code>#</code> 开头的正文：
      </p>
      <CodeBlock lang="markdown" title="SKILL.md（最小模板）" code={minimalSkill} />

      <h2>这对实战意味着什么</h2>
      <p>
        理解了「一个文件夹 + 一个 SKILL.md」，你就明白创建技能没有任何脚手架负担：新建目录、写一个 Markdown、
        放进 <code>.claude/skills/</code> 就完事。难的从来不是结构，而是把 <code>description</code> 写得能被准确触发、
        把正文写得简洁可执行——这正是后两章要解决的。先把结构这层彻底吃透，剩下的都是内容打磨。
      </p>

      <Practice title="写一个最小 SKILL.md 并装上">
        <p>
          在项目根目录建一个技能目录，把最小模板填进去，给它起个真实可触发的名字和描述：
        </p>
        <CodeBlock
          lang="bash"
          title="创建技能目录"
          code={`mkdir -p .claude/skills/commit-msg
$EDITOR .claude/skills/commit-msg/SKILL.md`}
        />
        <CodeBlock
          lang="markdown"
          title=".claude/skills/commit-msg/SKILL.md"
          code={`---
name: commit-msg
description: 根据暂存区改动生成规范的 Git 提交信息。当用户要写 commit message、整理提交说明时使用。
---

# 生成提交信息

阅读暂存区的 diff，按 Conventional Commits 规范生成一条提交信息：

1. 用 git diff --staged 查看改动
2. 判断类型：feat / fix / docs / refactor / test / chore
3. 输出格式：type(scope): 简短描述（不超过 50 字符）
4. 必要时在空行后补充正文说明改动原因`}
        />
        <p>
          存好后，在 Claude Code 里输入 <code>/commit-msg</code> 看它是否出现在命令菜单里；
          再随手暂存一处改动、用自然语言说「帮我写个提交信息」，看它会不会被自动触发。
        </p>
      </Practice>

      <Summary
        points={[
          'Skill = 一个文件夹 + 一个 SKILL.md，目录名即命令名（全小写、连字符分词）。',
          'SKILL.md 由三段组成：--- 夹住的 frontmatter、给 Claude 看的正文、可选的资源目录。',
          '只有 SKILL.md 是必需的；reference/scripts/templates/assets 都是可选资源，用相对路径引用。',
          'frontmatter 字段虽多，但日常多数只用 name 和 description，其余按需添加。',
          'description 是最关键字段，决定技能何时被触发，下一章专门打磨它。',
          '最小模板：name + description + 空行 + # 标题与正文，存进 .claude/skills/ 即可生效。',
        ]}
      />
    </>
  )
}
