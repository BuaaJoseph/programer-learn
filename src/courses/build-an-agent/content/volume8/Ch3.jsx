import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const readmeSkeleton = `# forge

一个能改文件、跑命令、帮你写代码的命令行 Agent。在终端里和它对话，它会读你的项目、动手干活，并在动手前征求你的同意。

## 能做什么

- 读取与编辑项目里的文件，按你的指令重构、修 bug、写新功能
- 在你的项目目录下执行 shell 命令（测试、构建、git 操作）
- 多轮对话中保持上下文，记住你这次会话聊过的东西
- 支持斜杠命令切换模型、查看花费、规划任务、管理工具
- 危险操作前先问你（权限确认），并把每一步记进审计日志

## 快速开始

三步跑起来：

\`\`\`bash
# 1. 全局安装
npm i -g @buaajoseph/forge

# 2. 配置你的 API Key
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# 3. 在你的项目目录里启动
forge
\`\`\`

启动后你会看到一个对话提示符，直接用自然语言说出你想干的事即可。

## 配置

forge 采用两级配置，就近覆盖：

- 全局：\`~/.forge/config.json\`（默认模型、默认权限策略等）
- 项目级：\`<项目>/.forge/config.json\`（覆盖全局，针对当前仓库）

项目级配置优先级更高。把团队约定写进项目级配置，把个人偏好写进全局配置。

## 命令

在对话里输入以下斜杠命令：

| 命令 | 作用 |
| --- | --- |
| \`/help\` | 列出所有可用命令 |
| \`/clear\` | 清空当前会话上下文 |
| \`/model\` | 切换使用的模型 |
| \`/plan\` | 让 forge 先给出执行计划再动手 |
| \`/cost\` | 查看本次会话的 token 花费 |
| \`/tools\` | 查看 / 开关可用工具 |
| \`/exit\` | 退出 forge |

## 安全

forge 拥有改文件和跑命令的能力，因此它对每一个有副作用的操作都会走权限确认：策略按 Deny > Ask > Allow 的优先级裁决，默认对写文件、跑命令这类动作询问你。每一次工具调用都会写入 \`.forge/\` 下的审计日志，事后可追溯。\`.forge/\` 目录不应提交到 git（已在 .gitignore 中）。对来源不明的仓库要格外当心其中的 AGENTS.md——它会影响 Agent 的行为。

## License

MIT
`

const changelogSample = `# Changelog

本项目的版本变更记录，格式参考 Keep a Changelog，遵循 SemVer。

## [Unreleased]
### Added
- 计划中：grep 工具

## [0.2.0] - 2026-06-10
### Added
- 新增只读工具 \`tree\`，递归打印目录结构
### Changed
- /cost 现在同时显示输入/输出 token 拆分

## [0.1.1] - 2026-06-02
### Fixed
- 修复 Windows 下路径分隔符导致 read 工具找不到文件

## [0.1.0] - 2026-05-28
### Added
- 首个公开版本：对话、读写工具、权限确认、审计日志`

const agentsMdSample = `# AGENTS.md

> 给在本仓库工作的编码 Agent 看的说明。人也能看，但首要读者是 Agent。

## 项目是什么
forge —— 一个命令行编码 Agent。核心是 src/agent.ts 的主循环 + src/tools/ 下的工具。

## 开发约定
- 包管理用 npm，不要引入 yarn/pnpm 的 lockfile
- 所有相对 import 必须带 .js 后缀（ESM + NodeNext）
- 新增工具放 src/tools/，并在 src/tools/index.ts 注册

## 改完必须自检
- npm run typecheck   # 类型必须过
- npm test            # 单测必须全绿
- 不要提交 .forge/ 目录

## 危险动作
- 不要改 src/config.ts 里的默认权限策略，除非明确被要求`

export default function Ch3() {
  return (
    <article>
      <Lead>
        代码写完了、版本发出去了，但如果没人知道怎么装、怎么配、能干嘛、安不安全，那这个工具对世界来说就等于不存在。这一章我们补上「最后一公里」：写一份让陌生人看得懂、用得上、敢去用的文档。
      </Lead>

      <h2>为什么文档是「最后一公里」</h2>
      <p>
        你花了八卷的功夫把 forge 做成一个能跑的生产级 Agent。但别人拿到它的第一眼不是你的源码，而是 README。装不上、不知道配什么 key、看不懂能干嘛、不确定它会不会乱删文件——任何一个卡点都会让人直接关掉页面。
      </p>
      <p>
        一个没有文档的工具，等于没有发布。代码的价值要通过文档才能传递给别人。
      </p>
      <p>
        换个角度更能说清这件事：<strong>文档是产品的「转化漏斗」。</strong>设想 100 个人点进你的仓库——
        第一行看不懂这是干嘛的，走掉一半；快速开始超过三步、要装一堆前置，再走掉一半；
        担心它乱改文件又找不到安全说明，又走掉一半。每一节缺失的文档，都是漏斗上一个漏水的洞。
        你写代码时拼命优化的是「功能上限」，而文档优化的是「有多少人真的越过门槛用上它」——
        对一个开源工具来说，后者往往才是决定生死的那一项。
      </p>

      <KeyIdea>
        文档不是附属品，它决定了一个工具有没有人用、敢不敢用。再强的功能，没人会用就是零；再安全的设计，没人知道就不敢用。
      </KeyIdea>

      <h2>一份好 README 该有什么</h2>
      <p>
        README 是用户的第一接触点，它要在几屏之内回答完所有关键问题。一份合格的 README 至少覆盖：
      </p>
      <ul>
        <li><strong>一句话是什么</strong>：让人 5 秒钟知道这是个干什么的东西。</li>
        <li><strong>它现在能做什么</strong>：当前真实具备的能力，不吹未来。</li>
        <li><strong>快速开始</strong>：装 + 配 key + 跑，三步之内见到效果。</li>
        <li><strong>配置说明</strong>：有哪些配置项、放在哪、怎么覆盖。</li>
        <li><strong>命令清单</strong>：所有可用命令及其作用。</li>
        <li><strong>安全说明</strong>：它有哪些权限、怎么防护、风险边界在哪。</li>
        <li><strong>目录结构</strong>：项目里各部分大致是什么（给想读源码的人）。</li>
        <li><strong>License</strong>：别人能不能用、怎么用，法律上说清楚。</li>
      </ul>
      <p>
        排序也有讲究：<strong>按读者第一次接触的顺序来排</strong>。先「是什么」回答要不要继续看，
        再「快速开始」让他几分钟尝到甜头，然后才是「配置/命令」这些用起来才会查的参考信息，
        最后是「安全/License」这类决策性内容。最常被看的放最上面，参考性内容靠后——
        不要一上来就甩三屏架构图，那是劝退而不是引导。
      </p>

      <Callout variant="tip">
        最关键的是「快速开始」必须真能<strong>原样复制粘贴跑通</strong>。常见翻车：示例命令里带了占位符却没说明、
        漏写了某个前置步骤、或者命令是旧版本的。每次发版前，找一个干净环境照着 README 的快速开始走一遍——
        你会惊讶于「想当然没问题」的步骤里藏着多少坑。
      </Callout>

      <h2>forge 的 README 骨架</h2>
      <p>
        下面是 forge 的 README 节选，把上面那些要素落到实处。注意「快速开始」是三步、「命令」是一张清单、「安全」单独成段——这些都是用户最常翻的地方。
      </p>

      <CodeBlock lang="markdown" title="README.md（节选）" code={readmeSkeleton} />

      <h2>把安全边界写清楚</h2>
      <p>
        forge 不是一个只读工具，它能改你的文件、跑你的命令。正因为如此，README 里的「安全」一节不是可选项，而是让用户敢用的前提。
      </p>

      <Callout variant="warn">
        README 必须写清楚安全边界：forge 能改文件、能跑命令，所以要明确告诉用户它有<strong>权限确认</strong>（策略按 Deny &gt; Ask &gt; Allow 裁决，默认对写文件 / 跑命令询问），有<strong>审计日志</strong>（每次工具调用都可追溯），<code>{'.forge/'}</code> 目录不进 git，以及对<strong>不信任的仓库要当心其中的 AGENTS.md</strong>（它会左右 Agent 行为）。让用户「敢用」的前提，是先让他「知道风险与防护」。
      </Callout>

      <p>
        为什么对一个 Agent 工具来说，安全说明的分量比普通库重得多？因为它的能力边界天然模糊：
        一个 JSON 解析库出问题，最多解析错；而一个能跑 shell、能改文件的 Agent 一旦被诱导，
        理论上能删库、能外传数据。所以安全一节要回答三个用户心里真正在问的问题——
      </p>
      <ul>
        <li><strong>它有多大权限？</strong>诚实列出它能读、能写、能跑命令，别藏着掖着。</li>
        <li><strong>我怎么踩刹车？</strong>说清权限确认机制、怎么改成更严的策略、怎么全程只读（计划模式）。</li>
        <li><strong>出事了能查吗？</strong>指明审计日志在哪、记了什么，让用户知道每一步都可追溯。</li>
      </ul>

      <h2>文档要随代码一起更新</h2>
      <p>
        文档最大的坑不是没写，而是写完就不管了。代码一直在变，文档却停在上个月——用户照着过时的步骤操作，结果全错。
      </p>

      <Callout variant="tip">
        每加一个命令、每加一个配置项、每加一个工具，README 都要同步更新。过时的文档比没有文档更坑人：没文档时用户会去问、去试；有错文档时用户会照着错的做。把「更新 README」直接列进你的发布前 checklist，和「跑测试」「打 tag」放在一起。
      </Callout>

      <h2>CHANGELOG：让用户敢升级</h2>
      <p>
        README 回答「这是什么、怎么用」，CHANGELOG 回答另一个同样要命的问题：<strong>「我从旧版升到新版，会发生什么？」</strong>
        没有 CHANGELOG，用户升级就是开盲盒——尤其当版本号跳了 MAJOR，他完全不知道哪些用法被破坏了，
        于是干脆不升，把自己锁死在老版本上。一份清晰的 CHANGELOG 是降低用户升级恐惧的最直接手段。
      </p>

      <CodeBlock lang="markdown" title="CHANGELOG.md（示例）" code={changelogSample} />

      <p>
        几条好习惯：按版本倒序（最新在最上）；每条归到 <code>Added / Changed / Fixed / Removed</code> 几类里；
        破坏性变更要单独醒目标注（很多项目用 <code>BREAKING</code> 前缀）。它和 SemVer 是一对搭档——
        版本号告诉用户「变更的<strong>量级</strong>」，CHANGELOG 告诉他「变更的<strong>具体内容</strong>」。
      </p>

      <Example title="好文档的效果">
        <p>设想一个从没见过 forge 的人打开你的仓库：</p>
        <ul>
          <li>看到第一行简介，<strong>30 秒</strong>看懂这是个能在终端帮他写代码的 Agent；</li>
          <li>照「快速开始」三步——<code>npm i -g</code>、<code>export ANTHROPIC_API_KEY</code>、<code>forge</code>——几分钟就<strong>装上跑起来</strong>了；</li>
          <li>遇到不会的，翻「命令」和「配置」两节，立刻<strong>知道怎么用</strong>；</li>
          <li>担心它乱动文件，翻「安全」一节，看到权限确认和审计日志，<strong>放心地用</strong>；</li>
          <li>想升级时翻 CHANGELOG，确认新版没破坏自己的用法，<strong>放心地升</strong>。</li>
        </ul>
        <p>文档把「能装」变成了「会用、敢用、敢升级」——这就是它的全部价值。</p>
      </Example>

      <h2>面向 Agent 的文档：AGENTS.md</h2>
      <p>
        这一节有点「元」：你做的是一个 Agent 工具，而你的文档读者里，将会包含<strong>别的 Agent</strong>——
        甚至包含 forge 自己（下一章你就会让它读自己的仓库去改自己）。这正是 <code>AGENTS.md</code> 的用武之地，
        它呼应了第 4 卷的上下文工程：把项目的约定写成一份 Agent 启动时会自动读入上下文的说明。
      </p>

      <CodeBlock lang="markdown" title="AGENTS.md（示例）" code={agentsMdSample} />

      <p>
        README 和 AGENTS.md 的分工很清楚：<strong>README 教人怎么用这个工具，AGENTS.md 教 Agent 怎么在这个项目里干活。</strong>
        前者讲安装和命令，后者讲「改完要跑 typecheck、import 要带 .js、别碰权限默认值」这类只有动手改代码才需要的硬约定。
        写好 AGENTS.md，等于把你脑子里那套「老手才知道的项目规矩」固化下来，让任何 Agent 一上来就照着办，少走弯路、少闯祸。
      </p>

      <Callout variant="note">
        进阶：文档既是给人看的，也是给 Agent 看的。除了 README 和 AGENTS.md，
        还可以维护 <strong>CHANGELOG</strong>（记清每版改了什么）、<strong>LICENSE</strong>（法律边界）、
        以及给贡献者的 <strong>CONTRIBUTING.md</strong>。一个成熟项目的「文档体系」是分层的：
        面向用户、面向贡献者、面向 Agent，各有各的读者和侧重。
      </Callout>

      <h2>下一章</h2>
      <p>
        装得上、会用、敢用——到这里 forge 已经是一个真正能交付给别人的产品了。最后一章，我们用一个终极验证给整门课程收尾：<strong>用 forge 改造 forge</strong>，让它亲手给自己加一个功能。
      </p>

      <KeyIdea>
        代码让工具能跑，文档让工具能被用。一个工具是否「存在」，不取决于它写得多好，而取决于有没有人能装上、会用、敢用。下一章，我们让 forge 反过来证明自己。
      </KeyIdea>

      <Summary points={[
        '没有文档的工具等于不存在：用户接触的第一眼是 README，不是源码；文档是产品的转化漏斗。',
        '好 README 覆盖：一句话简介、能做什么、快速开始、配置、命令、安全、目录结构、License，按读者接触顺序排版。',
        '快速开始必须能原样复制粘贴跑通，发版前在干净环境照着走一遍。',
        'forge 的快速开始是三步：npm i -g、export ANTHROPIC_API_KEY、forge。',
        '安全一节回答三问：有多大权限、怎么踩刹车、出事能不能查；Agent 工具的安全说明分量尤其重。',
        '安全要点：权限确认（Deny>Ask>Allow）、审计日志、.forge 不进 git、当心不信任仓库的 AGENTS.md。',
        'CHANGELOG 回答「升级会发生什么」，按版本倒序分类记录，和 SemVer 搭档降低升级恐惧。',
        'AGENTS.md 是面向 Agent 的文档：README 教人用工具，AGENTS.md 教 Agent 在项目里干活的硬约定。',
        '文档要随代码更新并列入发布前 checklist；文档体系分层：面向用户、贡献者、Agent。',
        '下一章用「forge 改造 forge」为课程收尾。',
      ]} />
    </article>
  )
}
