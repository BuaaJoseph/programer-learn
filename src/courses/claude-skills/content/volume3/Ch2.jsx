import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pdfFront = `---
name: pdf
description: Process, read, extract, create, and manipulate PDF files. Use this skill when you need to read a PDF, extract text or tables from PDFs, merge PDFs, split PDFs, rotate pages, add watermarks, create new PDFs, fill PDF forms, encrypt/decrypt PDFs, extract images from PDFs, or perform OCR on scanned PDFs.
---`

const docxFront = `---
name: docx
description: Create, read, edit, and manipulate .docx (Word) documents. Use when the user asks for a document like a 'report', 'memo', 'letter', or 'template' as a .docx file, or when extracting content, inserting/replacing images, find-and-replace, working with tracked changes, or converting content into a polished Word document. Do NOT use for PDFs, spreadsheets, Google Docs, or general coding tasks.
---`

const creatorFront = `---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---`

const xlsxFront = `---
name: xlsx
description: Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or .tsv file (adding columns, computing formulas, formatting, charting, cleaning messy data); create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Trigger especially when the user references a spreadsheet file by name or path, even casually. Do NOT trigger when the primary deliverable is a Word document, HTML report, standalone Python script, database pipeline, or Google Sheets API integration, even if tabular data is involved.
---`

const mcpFront = `---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
---`

const descTemplate = `---
name: <用连字符的小写英文名，如 invoice-parser>
description: <动词1>, <动词2>, and <动词3> <对象/文件格式>. Use when <具体触发场景1>, <场景2>, or <场景3>. Do NOT use for <易混淆的场景，如 PDF / spreadsheet / general coding>.
---`

const wordBudgetCode = `# description 的"词预算"怎么分配（以 pdf 为例拆解）

# [功能动词区] 开门见山列动作
"Process, read, extract, create, and manipulate PDF files."
#  ^^^^^ 5 个动词，模型一眼知道它能干什么

# [触发场景区] Use when... 把用户会说的事一条条铺开
"Use when you need to read a PDF, extract text or tables, merge PDFs,
 split PDFs, rotate pages, add watermarks, ... or perform OCR ..."
#  ^^^^^ 每一项都对应一种真实提问，关键词密度拉满

# 一条好 description 基本就这两区：动词区 + 场景区
# docx/xlsx 多一个 [边界区]：Do NOT use for ...`

const antipatternCode = `# 把五个范例的"好"反过来，就是五条最常见的坏味道

# 坏味道 1：模糊词当主语
description: This skill helps with various document tasks.   # helps/various 零信息

# 坏味道 2：只说"是什么"，不说"何时用"
description: A PDF processing toolkit.                        # 缺 Use when

# 坏味道 3：没有负边界，和邻居抢触发
description: Work with tabular data.                          # 表格?那 docx/db 也沾边

# 坏味道 4：第一人称自我介绍腔
description: I can help you create Word documents!            # 给分诊机器看的，别对话

# 坏味道 5：正文用软措辞
# "建议尽量先 unpack" -> 模型当可选项 -> 不照做`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          想写出好 Skill，最快的路是拆解已经被验证过的好 Skill。本章把 Anthropic 五个官方 Skill——
          <em>pdf</em>、<em>docx</em>、<em>skill-creator</em>、<em>xlsx</em>、<em>mcp-builder</em>——的 frontmatter 原文摆出来逐个分析，
          看它们的 description 为什么能被准确触发、正文为什么能被照着执行。看完你会发现：好 Skill 有一套共通的范式。
        </p>
      </Lead>

      <h2>范例一：pdf——一个 Skill 覆盖整个生态</h2>
      <CodeBlock lang="yaml" title="pdf · SKILL.md frontmatter" code={pdfFront} />
      <p>
        好在哪？它的 description 不空谈「能处理 PDF」，而是一口气列出 8 个以上具体用途，且每个都用
        <strong>明确的动词</strong>开头：read、extract、merge、split、rotate、add watermarks、fill forms、
        encrypt/decrypt、OCR……
      </p>
      <ul>
        <li><strong>关键词丰富</strong>——用户无论问「提取表格」「合并」还是「给扫描件做 OCR」，都能命中其中某个词，触发率自然高。</li>
        <li><strong>动词驱动</strong>——每个用途都是「动词 + 对象」，模型一眼就知道这个 Skill 能干什么活。</li>
        <li><strong>覆盖整个生态</strong>——它不把 PDF 拆成十个小 Skill，而是用一个 Skill 收编整条 PDF 工作链，避免用户在多个相似 Skill 之间纠结。</li>
      </ul>
      <p>
        这里藏着一个值得展开的<strong>设计决策：粒度</strong>。为什么 pdf 选择「一个大 Skill 收编整条链」，
        而不是拆成 pdf-read、pdf-merge、pdf-ocr 十来个小 Skill？因为这些操作<em>共享同一套领域知识</em>
        （PDF 的结构、常见坑、依赖的库），强行拆开会导致每个小 Skill 都要重复一遍背景，还让用户和模型在
        「该选哪个」上犯难、彼此抢触发。判断粒度的经验法则是：<strong>能共享同一份正文与 reference、用户心智里属于「同一类活」的，
        就合成一个 Skill；领域知识、工作流明显不同的，才拆开。</strong>
      </p>

      <Example title="为什么不该写成「helps with PDF tasks」">
        <p>
          假设把 description 改成「This skill helps with various PDF tasks」，问题立刻暴露：没有具体动词、
          没有关键词，用户问「把扫描合同转成文字」时，模型根本不知道该不该触发它。
          pdf 的写法之所以好，正是因为它把<strong>所有可能的提问关键词</strong>都铺进了 description。
        </p>
      </Example>

      <h3>拆解 description 的「词预算」</h3>
      <p>
        把 pdf 的 description 当解剖标本，能看清一条高质量 description 的内部结构。它其实只有两个区——
        <strong>功能动词区</strong>（开门见山列动作）+ <strong>触发场景区</strong>（Use when 把用户会说的事铺开）：
      </p>
      <CodeBlock lang="yaml" title="description 的内部分区" code={wordBudgetCode} />
      <p>
        理解了这两区，你写 description 时就有了下笔的框架：先列动词、再铺场景，docx 和 xlsx 再补一个负边界区。
        与其对着空白发愁，不如照这个分区一格一格填。
      </p>

      <h2>范例二：docx——画清正负边界，规则不可协商</h2>
      <CodeBlock lang="yaml" title="docx · SKILL.md frontmatter" code={docxFront} />
      <p>
        docx 的 description 多了一个关键动作：它同时写了「Use when…」和「Do NOT use for…」两条边界。
        前者列出正面场景（report、memo、letter、template、tracked changes 等），
        后者明确划掉 PDF、spreadsheet、Google Docs、general coding——<strong>正负边界都画清楚</strong>。
      </p>
      <ul>
        <li><strong>明确文件格式与动作</strong>——锁定 .docx 格式与 create/read/edit/manipulate 等动词，触发判断毫不含糊。</li>
        <li><strong>避免与其它 Skill 冲突</strong>——一句「Do NOT use for PDFs」就让它和 pdf skill 划清地盘，不会互相抢触发。</li>
      </ul>
      <p>
        正文同样值得学。docx 的正文里有一批<strong>不可协商的硬规则</strong>，并用加粗加编号强调，例如：
        默认纸张是 A4 而非 Letter；段落要用独立的段落对象，而非在文本里塞换行符；
        表格宽度必须显式声明，不能依赖默认。它还规定了一条严格的工作流——
        先 unpack 解包，再编辑底层 XML，最后 pack 回去——任何编辑都得走这条链路。
      </p>
      <p>
        为什么 docx 要把工作流写得这么死（unpack → 编辑 XML → pack）？因为 .docx 本质是个 zip 包，
        里面是一堆相互引用的 XML。如果不走这条链路、直接用文本手段去改，极易破坏内部结构、产出一个打不开的文件。
        这给我们一个普适启示：<strong>当某类任务有一条「不这么做就会出错」的唯一正确路径时，正文就该把这条路径
        定成不可绕过的工作流，而不是留给模型自由发挥。</strong>软件里凡是「步骤顺序错了就坏事」的操作，都值得这样固化。
      </p>
      <Callout variant="warn" title="硬规则要写得像命令">
        <p>
          docx 把「默认 A4」「用段落对象而非换行符」「表宽必须显式」写成<strong>不容商量的编号条款</strong>，
          而不是「建议」「最好」。原因是：Skill 正文是给模型执行的，措辞越像命令、越具体，模型越会照做；
          含糊的「尽量」「可以考虑」很容易被忽略。
        </p>
      </Callout>

      <h2>范例三：skill-creator——覆盖全生命周期的 meta skill</h2>
      <CodeBlock lang="yaml" title="skill-creator · SKILL.md frontmatter" code={creatorFront} />
      <p>
        skill-creator 是一个 <em>meta skill</em>——写 Skill 的 Skill。它的 description 同样动词密集：
        create、modify、improve、measure，并把触发场景铺满：从零创建、编辑优化、跑 eval、
        做带方差分析的性能基准、优化 description 触发率。
      </p>
      <ul>
        <li><strong>覆盖全生命周期</strong>——创建 → 编辑 → 评测 → 优化，一个 Skill 管到底，而不是只管「生成初稿」。</li>
        <li><strong>每步都有可衡量产出</strong>——eval 看成功率、benchmark 看方差、description 优化看触发准确率，每个动作都对应一个数字。</li>
      </ul>
      <p>
        特别注意它把 <code>measure</code>、<code>run evals</code>、<code>variance analysis</code> 这些<strong>「度量」动词</strong>
        也写进了 description。这是个微妙但重要的信号：它告诉模型「评测」本身也是这个 Skill 的合法触发场景，
        而不只是「创建」。很多人写工具型 Skill 时只写「做什么」、忘了「验证/度量」也是一类该被触发的请求——
        skill-creator 把这一类显式纳入，正是它「管到底」的体现。
      </p>

      <h2>范例四：xlsx——把触发判断锚定在「交付物类型」</h2>
      <CodeBlock lang="yaml" title="xlsx · SKILL.md frontmatter" code={xlsxFront} />
      <p>
        xlsx 把 description 当「触发说明书」写到了极致。它不仅详尽描述何时<strong>触发</strong>
        （任何以表格文件为主要输入或输出的任务，甚至用户只是随口提到文件名或路径），
        还反复强调一个判定锚点：<strong>最终交付物是不是一个 spreadsheet 文件</strong>。
      </p>
      <ul>
        <li><strong>用交付物类型消歧</strong>——同样涉及表格数据，若交付物是 Word、HTML 报告、独立脚本、数据库管道或 Google Sheets API，它明确「Do NOT trigger」。把模糊的「和表格有关」收敛成清晰的「交付物是 .xlsx/.csv」。</li>
        <li><strong>覆盖随口表达</strong>——「the xlsx in my downloads」这种口语化引用也算触发信号，贴合真实用户说话方式。</li>
      </ul>
      <p>
        xlsx 这条 description 还演示了一个高级技巧：用<strong>「主要输入/输出」而非「话题」来定义触发边界</strong>。
        「话题相关」是个滑坡——表格数据几乎和所有数据处理任务都沾边，照这个标准 xlsx 会无止境地误触发。
        而「交付物是不是电子表格文件」是个<em>能被明确判定</em>的二元问题。当你的 Skill 处在一个热闹的领域、
        和好几个邻居都话题重叠时，找一个这样可判定的硬锚点，比堆再多关键词都管用。
      </p>
      <Callout variant="tip" title="当多个 Skill 容易抢触发时，用『交付物/主输入』来划界">
        <p>
          表格数据可能同时和 docx、数据库、脚本沾边。xlsx 的解法是：不看「话题」，看「主要输入/输出是不是电子表格」。
          当你的 Skill 和别的 Skill 领域重叠时，找一个这样的硬锚点写进 description，触发冲突会大幅减少。
        </p>
      </Callout>

      <h2>范例五：mcp-builder——知识型 Skill 也能写得很好</h2>
      <CodeBlock lang="yaml" title="mcp-builder · SKILL.md frontmatter" code={mcpFront} />
      <p>
        前四个都是「操作某类文件」的 Skill，mcp-builder 则是另一类：<strong>传授方法论的知识型 Skill</strong>。
        它不替你处理文件，而是指导你<em>构建高质量的 MCP server</em>。
      </p>
      <ul>
        <li><strong>用技术栈当触发线索</strong>——description 点明 Python(FastMCP) 与 Node/TypeScript(MCP SDK)，当用户在这些场景下「写 MCP server」时精准触发。</li>
        <li><strong>正文是结构化流程</strong>——它把开发拆成研究规划 → 实现 → 评审测试 → 生成 eval 四个阶段，并要求用「10 个真实复杂问题」验证 server，是一套可照着走的工程方法论。</li>
        <li><strong>启示</strong>——Skill 不一定要「动手做事」；把团队沉淀的最佳实践写成知识型 Skill，同样能在合适时机自动喂给模型。</li>
      </ul>
      <p>
        知识型 Skill 是被严重低估的一类。大多数人一想到 Skill 就是「能自动干活的工具」，但 mcp-builder 证明：
        把「<strong>怎么把一件事做好</strong>」的方法论沉淀下来，价值一点不亚于自动化。你团队里那些
        「评审要看哪几点」「设计 API 要遵守哪些约定」「这种重构该按什么顺序做」的隐性经验，全都可以写成知识型 Skill，
        在相关任务出现时自动喂给模型，相当于让每次对话都自带一位资深同事的 checklist。它<em>不替你动手，但替你把关</em>。
      </p>

      <KeyIdea title="这些范例的共同范式">
        <p>
          把三个 Skill 叠在一起看，会浮现出同一套写法：description <strong>精炼到 80~100 词</strong>，
          触发条件<strong>具体到动词与场景</strong>、绝不出现 helps、can、various 这类模糊词；
          正文围绕<strong>可执行的步骤</strong>展开，把不可协商的规则写成命令；
          而复杂细节（XML 结构、API 参数等）则拆到 <em>reference</em> 文件，正文只留主干。
        </p>
      </KeyIdea>

      <h2>对比小结：好 Skill 的四条共性</h2>
      <ul>
        <li><strong>description 精炼</strong>——控制在 80~100 词，信息密度高，不啰嗦。</li>
        <li><strong>触发条件具体</strong>——用动词与真实场景，必要时加 Do NOT use 负边界，杜绝 helps/can/various 等模糊词。</li>
        <li><strong>正文可执行</strong>——围绕步骤与硬规则，措辞像命令，让模型照做。</li>
        <li><strong>细节下沉</strong>——复杂内容拆到 reference，正文保持精简主干。</li>
      </ul>

      <p>
        把五个范例各自的「拿手招式」列成一张表，方便你照着挑——遇到不同处境，模仿不同范例：
      </p>
      <table>
        <thead>
          <tr>
            <th>范例</th>
            <th>类型</th>
            <th>最值得学的一招</th>
            <th>什么时候模仿它</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>pdf</td>
            <td>文件操作</td>
            <td>动词密集 + 一个 Skill 收编整条链</td>
            <td>你的领域有很多共享知识的相关操作</td>
          </tr>
          <tr>
            <td>docx</td>
            <td>文件操作</td>
            <td>正负边界 + 不可协商的工作流</td>
            <td>有「错了就坏事」的唯一正确路径</td>
          </tr>
          <tr>
            <td>skill-creator</td>
            <td>meta/全周期</td>
            <td>把「度量」也写成触发场景</td>
            <td>Skill 要管到验证/评测环节</td>
          </tr>
          <tr>
            <td>xlsx</td>
            <td>文件操作</td>
            <td>用「主输入/交付物」做可判定锚点</td>
            <td>领域热闹、和多个邻居话题重叠</td>
          </tr>
          <tr>
            <td>mcp-builder</td>
            <td>知识/方法论</td>
            <td>不动手，传授结构化流程</td>
            <td>要沉淀团队最佳实践与 checklist</td>
          </tr>
        </tbody>
      </table>

      <h3>反着看：五条最常见的坏味道</h3>
      <p>
        把上面五个「好」逐条反过来，恰好就是新手最容易踩的五种坏味道。写完自查时，对照这一组比对照「好范例」更快揪出问题：
      </p>
      <CodeBlock lang="yaml" title="description / 正文的五种坏味道" code={antipatternCode} />
      <Callout variant="note" title="范例是尺子，不是模板">
        <p>
          这些官方 Skill 强烈建议你去仓库读原文（包括它们的正文和 reference），但<strong>别照抄</strong>。
          它们的价值是给你一把尺子：你的 description 有没有具体动词？该不该加负边界？有没有可判定的触发锚点？
          正文的硬规则是不是写成了命令？照抄一个领域不同的 Skill，反而会带进不适用的约束。<em>学范式，不抄文本。</em>
        </p>
      </Callout>

      <h2>实战意味着什么</h2>
      <p>
        这三个范例不是给你抄的模板，而是给你一把尺子：当你写完自己的 Skill，回头对照——
        我的 description 有没有具体动词？触发场景列全了吗？有没有需要画的负边界？
        正文里的关键约束有没有写成不可协商的命令？复杂细节是不是该下沉到 reference？
        每问一遍，你的 Skill 就离「能被准确触发、能被照着执行」近一步。
      </p>

      <Practice title="用本章范式写一段高质量 description">
        <p>
          挑你手上一个真实需求（比如「解析发票 PDF 并导出 CSV」），照下面的模板套出 frontmatter，
          再用检查清单逐条过一遍：
        </p>
        <CodeBlock lang="yaml" title="description 模板" code={descTemplate} />
        <p>检查清单（每条都要能回答「是」）：</p>
        <ul>
          <li>description 是否在 80~100 词以内、信息密度足够？</li>
          <li>是否用了具体动词（extract、merge、convert…）而非 helps、can、various？</li>
          <li>「Use when」是否列了至少 3 个真实触发场景？</li>
          <li>是否需要加「Do NOT use for」来和相邻 Skill 划清边界？</li>
          <li>正文里的关键约束是否写成了不可协商的编号命令？</li>
          <li>复杂细节是否已下沉到 reference，正文只留可执行主干？</li>
        </ul>
        <p>
          写完后再做一步「对号入座」：你的需求最像本章哪个范例？是 pdf 那种「收编整条链」，docx 那种「有唯一正确工作流」，
          还是 xlsx 那种「领域热闹、要靠交付物锚点消歧」？找到最像的那个，回去重读它的招式，针对性地补强你的 Skill。
        </p>
      </Practice>

      <Summary
        points={[
          'pdf：description 列出 8+ 个具体用途与动词、关键词丰富，用一个 Skill 覆盖整个 PDF 生态；粒度法则是「共享知识的相关操作合并、领域不同才拆」。',
          'docx：同时写 Use when 与 Do NOT use 的正负边界，锁定文件格式与动词，避免与其它 Skill 冲突。',
          'docx 正文把不可协商的规则（默认 A4、用段落对象、表宽显式）写成编号命令，并强制 unpack→编辑 XML→pack 工作流——「错了就坏事」的唯一路径就该固化成不可绕过的流程。',
          'skill-creator 是 meta skill，覆盖创建→编辑→评测→优化全生命周期，连「度量/评测」也写进触发场景。',
          'xlsx 把触发判断锚定在「交付物是不是电子表格」这个可判定的硬锚点，比堆关键词更能消除与相邻 Skill 的触发冲突。',
          'mcp-builder 是知识型 Skill 范本：不动手做事，而是传授结构化方法论——这类「不替你动手但替你把关」的 Skill 被严重低估。',
          'description 的内部结构 = 功能动词区 + 触发场景区（+ 可选的负边界区），照分区填比对着空白发愁高效。',
          '五条坏味道：模糊词当主语、只说是什么不说何时用、没负边界抢触发、第一人称对话腔、正文软措辞。',
          '共同范式：description 精炼 80~100 词、触发条件具体不含 helps/can 等模糊词、正文围绕可执行步骤、复杂细节拆到 reference。',
          '范例是尺子不是模板：学范式、对号入座挑最像的范例补强，别照抄领域不同的 Skill。',
        ]}
      />
    </>
  )
}
