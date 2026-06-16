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

const frontmatterValidCode = `# 合法的 frontmatter：必须是文件最开头的三横线块
---
name: pdf-extract
description: ...
---
# ↑ 上面这对 --- 必须是文件第 1 行就开始，前面不能有空行或 BOM

# 常见的几种"踩坑"写法（会导致解析失败或字段失效）：

# 坑 1：--- 前面有空行 / 注释 / 任何字符
<!-- 我的技能 -->
---
name: ...

# 坑 2：YAML 缩进用了 Tab（YAML 只认空格）
description: ...
	when_to_use: ...   # ← 这里是 Tab，非法

# 坑 3：description 里有冒号但没加引号
description: Process: read and extract   # ← 冒号会被当成键值分隔
# 正确写法：用引号包起来
description: "Process: read and extract"`

const refLinkCode = `# 正文里引用资源，一律用相对于 SKILL.md 的相对路径

阅读完整 API 见 [api 文档](reference/api.md)。
处理扫描件时调用脚本：python scripts/extract.py --ocr input.pdf
套用模板：参考 templates/report.md 的结构。

# 不要写绝对路径（/Users/xxx/... 在别人机器上必然失效）
# 也不要写 ../../ 跳出技能目录（不可移植，分发后会断）`

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
      <p>
        为什么偏偏选 Markdown + YAML frontmatter 这个组合，而不是 JSON 或某种自定义格式？这是个深思熟虑的设计。
        YAML frontmatter 是给<strong>机器读的结构化元数据</strong>——系统要拿它去比对触发、解析配置，需要严格的键值结构；
        而正文是给<strong>模型读的自然语言指令</strong>——它本来就该是人类写得舒服、模型读得自然的散文与列表。
        Markdown 恰好同时满足「人写着顺手、模型读着自然、还能嵌代码块与链接」三件事。
        这种「机器读的头 + 模型读的身」的分工，是后面一切设计的地基。
      </p>

      <Example title="一眼看懂一个 Skill 文件夹">
        <p>「目录名就是命令名」：下面这个技能放在 pdf-extract 文件夹里，它的命令名就是 pdf-extract。</p>
        <CodeBlock lang="text" title="技能目录结构" code={dirTree} />
        <p>
          正文里引用其它文件，一律用<strong>相对路径</strong>，例如 <code>{'[api](reference/api.md)'}</code>。
          这样 Claude 需要时才会去读 reference 里的详细内容，平时不占上下文。
        </p>
      </Example>

      <p>
        这几个可选目录各有分工，不是随便起名的约定，理解它们的边界能让你的技能结构更清晰：
      </p>
      <table>
        <thead>
          <tr>
            <th>目录</th>
            <th>放什么</th>
            <th>加载时机</th>
            <th>典型例子</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>reference/</code></td>
            <td>详尽文档、长尾知识</td>
            <td>正文链接指向且模型判断需要时</td>
            <td>完整 API 说明、排错手册</td>
          </tr>
          <tr>
            <td><code>scripts/</code></td>
            <td>可执行脚本</td>
            <td>正文指示运行时</td>
            <td>extract.py、build.sh</td>
          </tr>
          <tr>
            <td><code>templates/</code></td>
            <td>待填充的模板</td>
            <td>正文指示套用时</td>
            <td>报告骨架、配置样板</td>
          </tr>
          <tr>
            <td><code>assets/</code></td>
            <td>静态资源</td>
            <td>脚本或正文需要时</td>
            <td>图片、字体、示例数据</td>
          </tr>
        </tbody>
      </table>

      <SkillAnatomy />

      <h3>frontmatter 的语法红线</h3>
      <p>
        frontmatter 是 YAML，而 YAML 对格式相当挑剔——绝大多数「技能莫名其妙不生效」的问题，根子都在这里。
        下面把几条最常踩的坑摆出来，记住它们能省你大量调试时间：
      </p>
      <CodeBlock lang="yaml" title="合法 frontmatter 与常见踩坑" code={frontmatterValidCode} />
      <p>
        其中第一条是绝对红线：<strong>那对 <code>---</code> 必须从文件第一行就开始</strong>，
        前面哪怕多一个空行、一个注释、一个不可见的 BOM 字符，整段 frontmatter 都可能被当成普通正文，
        于是 description 失效、技能永远不触发。当你的技能「装了但完全不响应」，第一件事就是检查文件头是否干净。
      </p>

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

      <p>
        这些字段可以按「目的」归成几类，理解分类比死记字段更有用：
      </p>
      <table>
        <thead>
          <tr>
            <th>这一类字段</th>
            <th>解决的问题</th>
            <th>代表字段</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>身份与触发</td>
            <td>叫什么、何时被唤醒</td>
            <td>name、description、when_to_use、paths</td>
          </tr>
          <tr>
            <td>触发策略</td>
            <td>能否自动 / 手动调用</td>
            <td>disable-model-invocation、user-invocable</td>
          </tr>
          <tr>
            <td>输入</td>
            <td>接收什么参数</td>
            <td>argument-hint、arguments</td>
          </tr>
          <tr>
            <td>权限与安全</td>
            <td>激活时能用哪些工具</td>
            <td>allowed-tools、disallowed-tools</td>
          </tr>
          <tr>
            <td>执行环境</td>
            <td>用什么模型/隔离度跑</td>
            <td>model、effort、context、agent、shell</td>
          </tr>
        </tbody>
      </table>

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

      <Callout variant="warn" title="堆满字段，往往是新手最容易犯的错">
        <p>
          见过不少初学者刚学会有 <code>model</code>、<code>effort</code>、<code>context: fork</code> 这些字段，
          就一股脑全加上，结果技能在简单任务上也开 <code>effort: max</code> 慢吞吞地跑、或在不需要隔离时白白 fork 出一个子上下文。
          每个高级字段都有<strong>实打实的成本</strong>（更慢、更贵、或更难调试）。原则是：
          <em>没有具体理由要加某个字段，就不加</em>。等你遇到「这个技能确实需要隔离环境/确实需要更强推理」的具体痛点，再针对性地加。
        </p>
      </Callout>

      <h3>引用资源：只用相对路径</h3>
      <p>
        正文里指向 reference、scripts、templates 时，<strong>一律用相对于 SKILL.md 的相对路径</strong>。
        这不是风格偏好，而是<em>可移植性</em>的硬要求——技能会被分发到别人的机器、别的项目里，绝对路径在那里必然失效：
      </p>
      <CodeBlock lang="markdown" title="资源引用的正确与错误写法" code={refLinkCode} />

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
      <p>
        换个角度说：Skill 的「零脚手架」本身就是一种设计哲学。它故意不引入构建步骤、不要求注册中心、不需要打包命令——
        因为<strong>越低的创建门槛，越能鼓励你为每类小任务都顺手沉淀一个 Skill</strong>。
        当创建一个 Skill 的成本低到「新建目录 + 写几行 Markdown」时，它才会真正成为你日常工作流的一部分，
        而不是一个需要郑重其事去「立项」的工程。把结构吃透，本质是让你能毫无负担地随手创建。
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
        <p>
          再做一个「破坏性实验」来印证语法红线：在 <code>---</code> 之前故意插入一个空行，保存后重新触发，
          观察技能是否彻底失效（命令菜单里消失、自然语言也不触发）；然后删掉那个空行恢复，确认它又活了。
          亲手制造一次「头部不干净」的故障，以后你排查「技能不响应」就有了第一直觉。
        </p>
      </Practice>

      <Summary
        points={[
          'Skill = 一个文件夹 + 一个 SKILL.md，目录名即命令名（全小写、连字符分词）。',
          'SKILL.md 由三段组成：--- 夹住的 frontmatter、给 Claude 看的正文、可选的资源目录。',
          '选 Markdown + YAML 是刻意设计：YAML 头给机器读（结构化元数据），Markdown 身给模型读（自然语言指令）。',
          '只有 SKILL.md 是必需的；reference/scripts/templates/assets 都是可选资源，各有分工，用相对路径引用。',
          'frontmatter 是 YAML、对格式挑剔：--- 必须在文件第一行、缩进只能用空格、含冒号的值要加引号，否则技能静默失效。',
          'frontmatter 字段虽多，但日常多数只用 name 和 description，可按身份/触发策略/输入/权限/执行环境分类理解，其余按需添加，别堆满。',
          'description 是最关键字段，决定技能何时被触发，下一章专门打磨它。',
          '资源引用只用相对路径，绝对路径与 ../ 跳出目录都会让分发后的技能断链。',
          '最小模板：name + description + 空行 + # 标题与正文，存进 .claude/skills/ 即可生效；零脚手架是为了鼓励随手沉淀。',
        ]}
      />
    </>
  )
}
