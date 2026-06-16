import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SkillCreatorFlow from '@/courses/claude-skills/illustrations/SkillCreatorFlow.jsx'

const installCmd = `npx skills add https://github.com/anthropics/skills --skill skill-creator --agent claude-code -g -y`

const evalsJson = `{
  "skill": "pdf",
  "cases": [
    {
      "prompt": "帮我把这份扫描版合同里的文字提取出来",
      "expect": "调用 pdf skill，对扫描件做 OCR 后返回纯文本"
    },
    {
      "prompt": "把这三个 PDF 合并成一个",
      "expect": "调用 pdf skill 完成合并，输出单个 PDF"
    }
  ]
}`

const startSkill = `# 1. 安装 skill-creator（命令行方式，全局安装）
npx skills add https://github.com/anthropics/skills --skill skill-creator --agent claude-code -g -y

# 2. 在 Claude Code 里触发它
/skill-creator

# 3. 按提示回答：这个 Skill 做什么、何时触发、期望输出
#    skill-creator 会据此生成 SKILL.md 初稿与目录结构`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          写一个好用的 Skill，难点从来不是写 Markdown，而是「description 能不能被准确触发」「正文步骤会不会被照着执行」。
          与其从零硬写、靠运气调试，不如用一个专门写 Skill 的工具：<em>skill-creator</em>。
          它是 Anthropic 官方的「写 Skill 的 Skill」，把这件事变成一条<strong>可度量、可迭代</strong>的流水线。
        </p>
      </Lead>

      <h2>skill-creator 是什么</h2>
      <p>
        <em>skill-creator</em> 是一个 <em>meta skill</em>——一个用来生产其它 Skill 的 Skill。
        你把意图告诉它，它交互式地帮你生成符合规范的 <code>SKILL.md</code> 与目录结构，
        再帮你写评测、跑 <em>eval</em>，最后优化 description 的触发率。它覆盖的不是「写出来」这一步，
        而是「写出来 → 验证好不好用 → 持续改进」的整个闭环。
      </p>

      <h3>为什么用它，而不是手写</h3>
      <p>
        手写 Skill 有三件事很容易做砸：格式不规范导致加载失败、description 写得太模糊导致该触发时不触发、
        正文步骤含糊导致模型不照做。skill-creator 把这三件事都接管了：
      </p>
      <ul>
        <li><strong>不必从零硬写</strong>——它生成格式正确的初稿，你只需补充领域细节。</li>
        <li><strong>能 eval</strong>——它帮你建一份测试集，用真实提问对比「带 Skill」与「不带 Skill」的成功率。</li>
        <li><strong>能优化触发</strong>——它跑一个 description 优化循环，把触发准确率调上去。</li>
      </ul>

      <Example title="它生成的不只是一个文件">
        <p>
          你说「我想做一个处理发票 PDF 的 Skill」，skill-creator 不会只丢给你一段 Markdown，
          而是产出一整套：<code>SKILL.md</code>（含精炼的 description 与可执行步骤）、配套的目录结构、
          一份 <code>evals.json</code> 测试用例，以及一份评测报告，告诉你这个 Skill 到底有没有比裸模型更好。
        </p>
      </Example>

      <SkillCreatorFlow />

      <KeyIdea title="把写 Skill 变成可度量的工程">
        <p>
          手写 Skill 是「写完就上线，好不好用全凭感觉」；用 skill-creator 则是
          「<strong>写 → 测 → 看数据 → 改 → 再测</strong>」。当你能用成功率和 token 消耗这两个数字说话，
          调一个 Skill 就不再是玄学，而是和调代码一样的迭代过程。
        </p>
      </KeyIdea>

      <h2>怎么安装</h2>
      <p>
        最直接的是命令行：用 <code>npx skills add</code> 从官方仓库拉取 skill-creator，
        <code>-g</code> 表示全局安装、<code>-y</code> 跳过确认、<code>--agent claude-code</code> 指定装给 Claude Code。
      </p>
      <CodeBlock lang="bash" title="安装 skill-creator（命令行）" code={installCmd} />
      <p>
        如果你不想敲命令，也可以在 Claude Code 里直接说「帮我安装这个 Skill：
        https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md」，然后确认即可。
      </p>

      <h2>6 步工作流</h2>
      <p>
        装好之后，skill-creator 会带着你走一条固定的 6 步流水线，每一步都有可衡量的产出：
      </p>
      <ul>
        <li><strong>① 捕获意图</strong>——交互式追问：这个 Skill 做什么、何时触发、期望输出长什么样。</li>
        <li><strong>② 生成 SKILL.md 初稿</strong>——据意图产出格式正确的 frontmatter 与正文步骤。</li>
        <li><strong>③ 创建 evals.json</strong>——放 5~10 个真实提问与期望结果，作为这个 Skill 的「单元测试」。</li>
        <li><strong>④ 并行评测</strong>——对比带 Skill 与不带 Skill 的成功率和 token 消耗，量化它到底值不值。</li>
        <li><strong>⑤ 看失败用例迭代</strong>——在 <em>eval-viewer</em> 里逐条看哪里没做对，改正文再重跑。</li>
        <li><strong>⑥ 优化 description 触发率</strong>——用一组查询跑 description 优化循环，提高该触发时被触发的准确率。</li>
      </ul>

      <Callout variant="warn" title="别跳过第 3、4 步">
        <p>
          很多人拿到 ② 的初稿就直接上线了，这正是 Skill「时灵时不灵」的根源。
          没有 <code>evals.json</code>，你就没有判断「改动是变好还是变坏」的标尺；
          没有第 ④ 步的对比，你甚至不知道这个 Skill 比裸模型强在哪。<strong>测试集是 Skill 的护栏，不是可选项。</strong>
        </p>
      </Callout>

      <h2>实战意味着什么</h2>
      <p>
        在真实项目里，skill-creator 的价值不在「省下写 Markdown 的几分钟」，而在于它逼你把模糊的想法
        落成<strong>具体的触发条件</strong>和<strong>可执行的步骤</strong>，再用数据验证。
        当团队里多个 Skill 共存时，这套流程还能帮你避免 description 互相抢触发——因为每个 Skill 的触发率
        都是被单独评测和优化过的。换句话说，它让 Skill 从「个人小脚本」长成「能维护的工程资产」。
      </p>

      <Practice title="用 skill-creator 从零做一个 Skill">
        <p>
          目标：做一个处理 PDF 的小 Skill，完整走一遍 6 步。先安装并触发 skill-creator：
        </p>
        <CodeBlock lang="bash" title="安装并触发" code={startSkill} />
        <p>
          进入交互后，先回答清楚「做什么、何时触发、期望输出」（第 ① 步），让它生成 <code>SKILL.md</code>（第 ②
          步）。接着把下面这份测试集交给它，作为第 ③ 步的 <code>evals.json</code>：
        </p>
        <CodeBlock lang="json" title="evals.json" code={evalsJson} />
        <p>
          然后让它跑第 ④ 步的并行评测，在 eval-viewer 里看有没有失败用例（第 ⑤ 步），
          最后跑一轮 description 优化（第 ⑥ 步）。走完一遍，你手里就是一个被数据验证过、触发准确的 Skill。
        </p>
      </Practice>

      <Summary
        points={[
          'skill-creator 是 Anthropic 官方的「写 Skill 的 Skill」（meta skill），覆盖创建、评测、优化全过程。',
          '它的价值是把写 Skill 变成可度量的工程：不必从零硬写，还能 eval 验证并优化 description 触发率。',
          '安装可用命令行 npx skills add …，也可在 Claude Code 里发官方 SKILL.md 链接并确认。',
          '6 步工作流：捕获意图 → 生成初稿 → 写 evals.json → 并行评测 → 看失败用例迭代 → 优化触发率。',
          '别跳过 evals.json 与对比评测，它们是判断「改动是变好还是变坏」的唯一标尺。',
          '更多参考：官方仓库 github.com/anthropics/skills（17+ 范例）与社区模板 claude-code-skill-template。',
        ]}
      />
    </>
  )
}
