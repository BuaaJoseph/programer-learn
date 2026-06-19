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

const evalCasesKindsJson = `{
  "skill": "pdf",
  "cases": [
    // 1) 正面用例：该触发、且要做对
    { "prompt": "提取这份 PDF 的所有表格", "expect": "触发 pdf，输出表格数据" },

    // 2) 负面用例：不该触发（防止"过度触发"抢别的 skill 的活)
    { "prompt": "帮我写个排序函数", "expect": "不触发 pdf" },

    // 3) 边界/口语用例：用户随口说，仍要能命中
    { "prompt": "我下载里那个 pdf 第二页转成图", "expect": "触发 pdf，导出第2页为图片" },

    // 4) 长尾用例：偶发但必须做对的硬骨头
    { "prompt": "这份是加密 PDF，密码 1234，解开取文字", "expect": "触发 pdf，解密后提取文本" }
  ]
}`

const metricsCode = `# eval 跑出来该看哪两个数，怎么解读

# 触发准确率（description 好不好的体现）
#   该触发的有没有触发？不该触发的有没有误触发？
#   低 -> 回去改 description（加关键词 / 加 Do NOT use 边界）

# 任务成功率（正文好不好的体现）
#   触发之后，结果符合 expect 吗？
#   低 -> 回去改正文（步骤更具体 / 硬约束写成命令 / 补 reference）

# 顺带看 token 消耗：
#   带 skill vs 不带 skill，多花的 token 换来的成功率提升值不值`

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

      <h3>为什么「能 eval」是质变而非小改进</h3>
      <p>
        很多人觉得 eval 只是「锦上添花」，其实它是手写和工程化的<strong>分水岭</strong>。没有 eval，你改一句 description
        到底是变好还是变坏，全靠感觉——今天觉得好、明天用着不灵，根本说不清是改对了还是改错了。
        eval 把这件事变成<em>有标尺的实验</em>：每次改动跑一遍同样的测试集，成功率上去了就是改对了，下去了就回滚。
        这和软件工程里「没有测试就不敢重构」是一个道理。<strong>没有 eval 的 Skill 迭代，本质上是在黑暗里乱改；
        有了 eval，你才第一次能「看着数据」做决策。</strong>这就是为什么后面会反复强调：别跳过测试集这一步。
      </p>

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

      <p>
        这 6 步不是线性走一遍就完，而是一个<strong>带回路的循环</strong>。理解每一步「改的是什么、看的是什么数」最关键：
      </p>
      <table>
        <thead>
          <tr>
            <th>步骤</th>
            <th>产出</th>
            <th>它在打磨哪一层</th>
            <th>失败时回去改哪</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>① 捕获意图</td>
            <td>明确的目标与触发场景</td>
            <td>需求本身</td>
            <td>想清楚再继续</td>
          </tr>
          <tr>
            <td>② 生成初稿</td>
            <td>SKILL.md</td>
            <td>结构与格式</td>
            <td>补领域细节</td>
          </tr>
          <tr>
            <td>③ evals.json</td>
            <td>测试集</td>
            <td>验收标准</td>
            <td>补用例覆盖</td>
          </tr>
          <tr>
            <td>④ 并行评测</td>
            <td>成功率 / token 数</td>
            <td>整体效果</td>
            <td>看是哪种用例挂了</td>
          </tr>
          <tr>
            <td>⑤ 看失败迭代</td>
            <td>修正后的正文</td>
            <td>正文执行质量</td>
            <td>改正文步骤/约束</td>
          </tr>
          <tr>
            <td>⑥ 优化触发</td>
            <td>调优后的 description</td>
            <td>触发准确率</td>
            <td>改 description 关键词/边界</td>
          </tr>
        </tbody>
      </table>

      <h3>测试集该放哪几种用例</h3>
      <p>
        第 ③ 步常被草草应付——只塞两三个「正面」用例就了事。但一份能真正护航的测试集，应该覆盖<strong>四种</strong>用例，
        每一种都在防一类不同的失败：
      </p>
      <CodeBlock lang="json" title="一份覆盖四类用例的测试集" code={evalCasesKindsJson} />
      <ul>
        <li><strong>正面用例</strong>：该触发、且做对——验证基本功能。</li>
        <li><strong>负面用例</strong>：不该触发——防止 description 太贪、把别的 Skill 该干的活也抢了（「过度触发」）。</li>
        <li><strong>边界/口语用例</strong>：用户随口说的表达——验证 description 的关键词覆盖够不够野。</li>
        <li><strong>长尾用例</strong>：加密 PDF 这种偶发但必须做对的硬骨头——验证 reference 与正文有没有覆盖到。</li>
      </ul>
      <p>
        尤其别忘了<strong>负面用例</strong>：一个只测「该触发」的测试集，会纵容你把 description 写得越来越贪，
        最后这个 Skill 见谁都想插一脚，反而干扰了别的 Skill。负面用例是给触发率装的「刹车」。
      </p>

      <h3>看懂评测报告：盯住两个数</h3>
      <p>
        第 ④ 步跑完会给你一堆数字，新手容易看花眼。其实只需盯住两个，且它们各自指向一个明确的修改方向：
      </p>
      <CodeBlock lang="bash" title="两个核心指标怎么解读" code={metricsCode} />
      <p>
        这套对应关系是整个工作流的「诊断逻辑」：<strong>触发准确率低 → 病在 description；任务成功率低 → 病在正文。</strong>
        把这两个数和两个修改方向钉在一起，你就再也不会「改了半天不知道改对没」。

      </p>

      <Callout variant="warn" title="别跳过第 3、4 步">
        <p>
          很多人拿到 ② 的初稿就直接上线了，这正是 Skill「时灵时不灵」的根源。
          没有 <code>evals.json</code>，你就没有判断「改动是变好还是变坏」的标尺；
          没有第 ④ 步的对比，你甚至不知道这个 Skill 比裸模型强在哪。<strong>测试集是 Skill 的护栏，不是可选项。</strong>
        </p>
      </Callout>

      <Callout variant="tip" title="一个反直觉的结论：评测可能告诉你「这个 Skill 不值得做」">
        <p>
          第 ④ 步对比「带 Skill vs 不带 Skill」，有时会跑出一个让人意外的结果：裸模型本来就做得挺好，
          加了 Skill 只是多烧了 token、成功率没明显提升。这恰恰是评测最有价值的时刻——
          它<strong>帮你及时止损</strong>，省下维护一个鸡肋 Skill 的长期成本。能被数据「劝退」的 Skill，
          远比一个上线后才发现没用、却还得有人维护的 Skill 划算。
        </p>
      </Callout>

      <h2>实战意味着什么</h2>
      <p>
        在真实项目里，skill-creator 的价值不在「省下写 Markdown 的几分钟」，而在于它逼你把模糊的想法
        落成<strong>具体的触发条件</strong>和<strong>可执行的步骤</strong>，再用数据验证。
        当团队里多个 Skill 共存时，这套流程还能帮你避免 description 互相抢触发——因为每个 Skill 的触发率
        都是被单独评测和优化过的。换句话说，它让 Skill 从「个人小脚本」长成「能维护的工程资产」。
      </p>
      <p>
        把这件事放到团队尺度看，意义更大：当 Skill 都带着 evals.json 进了仓库，它们就和被测试覆盖的代码一样，
        <strong>可以被安全地修改和演进</strong>。有人想改某个 Skill 的正文，跑一遍 eval 就知道有没有改坏；
        新加一个 Skill，跑全量 eval 就知道有没有抢了别人的触发。<em>测试集让一堆 Skill 从「各自为政的散件」
        变成「可回归、可协作演进的体系」</em>——这才是 skill-creator 真正的工程价值。
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
        <p>
          进阶练习：给上面的 evals.json 补上一条<strong>负面用例</strong>（比如「帮我写个排序函数」，expect 是「不触发 pdf」）
          和一条<strong>长尾用例</strong>（加密 PDF），重跑评测，观察触发准确率与任务成功率分别怎么变；
          再故意把 description 写贪一点（去掉限定词），看负面用例是不是开始误触发了——亲手验证负面用例这道「刹车」的作用。
        </p>
      </Practice>

      <Summary
        points={[
          'skill-creator 是 Anthropic 官方的「写 Skill 的 Skill」（meta skill），覆盖创建、评测、优化全过程。',
          '它的价值是把写 Skill 变成可度量的工程：不必从零硬写，还能 eval 验证并优化 description 触发率。',
          '能 eval 是手写与工程化的分水岭：它把「改得对不对」从凭感觉变成有标尺的实验，如同代码有测试才敢重构。',
          '安装可用命令行 npx skills add …，也可在 Claude Code 里发官方 SKILL.md 链接并确认。',
          '6 步工作流：捕获意图 → 生成初稿 → 写 evals.json → 并行评测 → 看失败用例迭代 → 优化触发率，是带回路的循环。',
          '测试集应覆盖四类用例：正面、负面（防过度触发）、口语边界、长尾硬骨头；别只测「该触发」。',
          '看报告盯两个数：触发准确率低→改 description，任务成功率低→改正文，这是整个流程的诊断逻辑。',
          '评测有时会「劝退」一个鸡肋 Skill（带它没比裸模型强多少），这正是它帮你及时止损的价值。',
          '别跳过 evals.json 与对比评测，它们是判断「改动是变好还是变坏」的唯一标尺，也让多个 Skill 能可回归地协作演进。',
          '更多参考：官方仓库 github.com/anthropics/skills（17+ 范例）与社区模板 claude-code-skill-template。',
        ]}
      />
    </>
  )
}
