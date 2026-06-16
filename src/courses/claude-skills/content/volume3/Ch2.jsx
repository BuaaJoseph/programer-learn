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

const descTemplate = `---
name: <用连字符的小写英文名，如 invoice-parser>
description: <动词1>, <动词2>, and <动词3> <对象/文件格式>. Use when <具体触发场景1>, <场景2>, or <场景3>. Do NOT use for <易混淆的场景，如 PDF / spreadsheet / general coding>.
---`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          想写出好 Skill，最快的路是拆解已经被验证过的好 Skill。本章把 Anthropic 三个官方 Skill——
          <em>pdf</em>、<em>docx</em>、<em>skill-creator</em>——的 frontmatter 原文摆出来逐个分析，
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

      <Example title="为什么不该写成「helps with PDF tasks」">
        <p>
          假设把 description 改成「This skill helps with various PDF tasks」，问题立刻暴露：没有具体动词、
          没有关键词，用户问「把扫描合同转成文字」时，模型根本不知道该不该触发它。
          pdf 的写法之所以好，正是因为它把<strong>所有可能的提问关键词</strong>都铺进了 description。
        </p>
      </Example>

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

      <KeyIdea title="三个范例的共同范式">
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
      </Practice>

      <Summary
        points={[
          'pdf：description 列出 8+ 个具体用途与动词、关键词丰富，用一个 Skill 覆盖整个 PDF 生态。',
          'docx：同时写 Use when 与 Do NOT use 的正负边界，锁定文件格式与动词，避免与其它 Skill 冲突。',
          'docx 正文把不可协商的规则（默认 A4、用段落对象、表宽显式）写成编号命令，并强制 unpack→编辑 XML→pack 工作流。',
          'skill-creator 是 meta skill，覆盖创建→编辑→评测→优化全生命周期，每一步都有可衡量产出。',
          '共同范式：description 精炼 80~100 词、触发条件具体不含 helps/can 等模糊词、正文围绕可执行步骤、复杂细节拆到 reference。',
          '写完用检查清单逐条自查，是把 Skill 写好最实用的一步。',
        ]}
      />
    </>
  )
}
