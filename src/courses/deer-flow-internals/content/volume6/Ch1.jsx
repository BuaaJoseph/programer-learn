import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const skillMd = `---
name: pdf-form-filler
description: Fill PDF forms from structured data. Use when the user uploads a PDF form.
license: MIT
allowed-tools: [bash, read_file, write_file, str_replace]
---

# PDF Form Filler

Step 1. Inspect the form fields with \`...\`
Step 2. ...`

const scan = `def scan_skill_content(content, ...) -> dict:
    # LLM 审查员，只回一行 JSON：{"decision": "allow|warn|block", "reason": ...}
    # 封堵 prompt-injection / 越权 / 提权 / 数据外泄 / 不安全代码
    # 保守回退：解析失败 / 调用失败 / 可执行脚本 → block（需人工复核）`

const toolPolicy = `def allowed_tool_names_for_skills(skills) -> set[str] | None:
    # 取所有启用 skill 的 allowed-tools 并集
    # 返回 None = legacy allow-all（仅当「没有任何 skill 声明该字段」）
    # 一旦有 skill 显式声明 → 未声明的 skill 贡献空集（fail-closed 收敛）`

export default function Ch1() {
  return (
    <article>
      <Lead>
        「Skill」是 deer-flow 把领域知识喂给模型的机制——但它不是把所有知识一股脑塞进 prompt，而是<strong>渐进式加载</strong>：
        system prompt 里只放每个技能的名字和一句描述，模型觉得相关才去 <code>read_file</code> 读完整的 SKILL.md。
        这一章讲清 skill 的结构、安装链（含一道 LLM 安全扫描）、权限收敛与 slash 命令，以及一个反直觉的事实——
        <strong>技能的「启用状态」根本不在 config.yaml 里</strong>。
      </Lead>

      <h2>一、一个 skill 长什么样</h2>
      <p>
        <code>deerflow/skills/types.py</code>：skill = <strong>一个目录 + 一份 <code>SKILL.md</code></strong>（YAML frontmatter + markdown 正文）。
        分两类：<code>PUBLIC</code>（内置只读）与 <code>CUSTOM</code>（可编辑）。
      </p>
      <CodeBlock lang="markdown" title="SKILL.md 结构示意" code={skillMd} />
      <p>
        frontmatter 由 <code>parser.py::parse_skill_file</code> 解析（<code>yaml.safe_load</code>），<code>name</code>/<code>description</code> 必填；
        <code>validation.py</code> 限定允许的属性集（name/description/license/allowed-tools/metadata/compatibility/version/author），
        <code>name</code> 须 hyphen-case ≤64、<code>description</code> 禁 <code>&lt;</code>/<code>&gt;</code> 且 ≤1024。
      </p>
      <KeyIdea title="渐进式加载（Progressive Loading）">
        lead agent 的 system prompt 里只渲染 <code>&lt;available_skills&gt;</code> 列表——每个技能只放 metadata（name/description/
        是否可编辑/位置）。模型按需自己 <code>read_file</code> 去读 SKILL.md 主体。这样一来，挂一百个技能也不会撑爆 system prompt，
        而真正用到的那个才会被完整加载。卷 2-1 讲过的「system prompt 完全静态 + skills 后台缓存」就是为它服务的。
      </KeyIdea>

      <h2>二、安装链：解压一个 .skill 要过几道关</h2>
      <p>
        <code>installer.py</code> 是纯逻辑、Gateway 与 Client 共用。安装一个 <code>.skill</code>（ZIP）要过的安全关卡：
      </p>
      <ul>
        <li><strong>路径安全</strong>：拒绝绝对路径 / <code>..</code> 穿越、跳过 symlink；<code>safe_extract_skill_archive</code> 设 512MiB 上限
          （zip 炸弹防御）+ <code>is_relative_to</code> 校验，<code>0o700</code> 预留目录原子落地。</li>
        <li><strong>逐文件 LLM 安全扫描</strong>：必扫 SKILL.md；<code>scripts/</code> 按可执行扫；<code>references/</code>/<code>templates/</code> 指定后缀扫；
          禁嵌套 SKILL.md。</li>
      </ul>
      <CodeBlock lang="python" title="security_scanner.py — scan_skill_content" code={scan} />
      <Callout variant="warn" title="安全扫描的「保守回退」">
        <code>scan_skill_content</code> 让一个 LLM 当审查员，只回一行 JSON 决策。关键是它的<strong>失败策略是 block</strong>：
        解析失败、调用失败、或文件是可执行脚本，一律判 <code>block</code> 交人工复核。安全相关的地方，deer-flow 反复体现同一个原则——
        <strong>不确定就拒绝</strong>，而不是放行。审查用的模型取 <code>skill_evolution.moderation_model_name</code>。
      </Callout>

      <h2>三、权限：技能能动哪些工具</h2>
      <p>
        skill 的 <code>allowed-tools</code> 不只是声明，它真的会收敛 agent 的工具集（卷 3-1 提过的过滤）。规则在 <code>tool_policy.py</code>：
      </p>
      <CodeBlock lang="python" title="skills/tool_policy.py — allowed_tool_names_for_skills" code={toolPolicy} />
      <p>
        外加 <code>permissions.py</code> 的 <code>make_skill_tree_sandbox_readable</code>：递归把技能目录去掉写位、补读/执行位
        （目录 <code>0o555</code>、文件 <code>0o444</code>），保证它在沙箱里<strong>只读</strong>——技能能被读、被执行，但不能被运行中的 agent 篡改。
      </p>

      <h2>四、slash 命令：/skill-name 与保留字</h2>
      <p>
        <code>slash.py</code> 处理 <code>/xxx</code> 形式的输入。保留名有 <code>bootstrap / help / memory / models / new / status</code>；
        其余按正则 <code>^/([a-z0-9]+(?:-[a-z0-9]+)*)</code> 当技能名解析。<code>resolve_slash_skill</code> 仅当该技能 <strong>enabled 且在白名单内</strong>
        才返回。命中后由卷 2-2 的 <code>SkillActivationMiddleware</code> 确定性地把整份 SKILL.md 注入——<strong>显式激活优先于模型的相关性猜测</strong>。
      </p>

      <h2>五、启用状态在哪：不是 config.yaml</h2>
      <KeyIdea title="一个容易踩的坑">
        skill 的真实「启用/禁用」状态<strong>不在 <code>config.yaml</code></strong>，而在一份独立的 extensions 配置 JSON
        （<code>config/extensions_config.py</code>，也管 MCP servers 的启停）。<code>is_skill_enabled</code> 在没有显式条目时
        public 与 custom <strong>默认启用</strong>。存储层 <code>load_skills</code> 每次都重读 <code>ExtensionsConfig.from_file()</code>
        合入 enabled——所以另一个进程改了启用状态，这边即时生效，无需重启。
      </KeyIdea>
      <p>
        存储抽象在 <code>storage/skill_storage.py</code>（模板方法基类，校验 name/path/markdown、限定 support 路径只能是
        references/templates/scripts/assets），本地实现 <code>local_skill_storage.py</code> 用 <code>NamedTemporaryFile + replace</code>
        原子写并设只读，自定义技能存 <code>custom/&lt;name&gt;/SKILL.md</code>、历史存 <code>custom/.history/&lt;name&gt;.jsonl</code>（可回滚）。
        而 agent 能否自己写 <code>skills/custom</code>（技能演化）由 <code>skill_evolution.enabled</code>（默认 False）控制。
      </p>

      <Example title="技能 vs 工具 vs 子代理">
        三者很容易混。<strong>工具</strong>是「一个可调用的函数」；<strong>技能</strong>是「一段告诉模型怎么用工具完成某类任务的说明书」（渐进加载）；
        <strong>子代理</strong>是「一个带受限工具集和独立上下文、可被委派的子 agent」。技能不增加新能力，只增加「怎么用现有能力」的知识，
        且能反过来用 <code>allowed-tools</code> 收窄工具集。
      </Example>

      <Summary
        points={[
          'Skill = 目录 + SKILL.md（frontmatter + markdown），分 PUBLIC/CUSTOM；采用渐进式加载——system prompt 只列 metadata，模型按需 read_file 主体。',
          '安装链多道安全关：路径穿越/symlink/zip 炸弹防御 + 逐文件 LLM 安全扫描，失败策略一律 block（不确定就拒绝）。',
          'allowed-tools 经 tool_policy fail-closed 收敛工具集；permissions 把技能目录设为沙箱只读；/skill-name 由 SkillActivationMiddleware 确定性注入，优先于模型猜测。',
          '技能启用状态在独立的 extensions JSON（非 config.yaml），默认启用且每次重读即时生效；技能演化（agent 自写 skill）由 skill_evolution.enabled 控制，默认关闭。',
        ]}
      />
    </article>
  )
}
