import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DescriptionQuality from '@/courses/claude-skills/illustrations/DescriptionQuality.jsx'

const badVsGood = `# 差例（太空泛，关键词缺失，没说何时用）
description: Helps with documents.

# 好例（触发条件 + 功能 + 关键词，第三人称）
description: Process and extract content from PDF files. Use when the
  user asks to read a PDF, extract text or tables, merge or split PDFs.`

const bodyShape = `---
name: release-notes
description: 根据两个 Git 标签之间的提交生成发布说明。当用户要写 release notes、整理更新日志、汇总版本变更时使用。
---

# 生成发布说明

## 概述
把指定区间内的提交，整理成面向用户的发布说明。

## 关键规则
- 按 feat / fix / 其它 分组，feat 在前
- 用面向用户的口吻，避免出现内部变量名
- 忽略 chore、ci、merge 类提交

## 步骤
1. 用 git log 取两个标签之间的提交
2. 按上面的规则分组与改写
3. 输出 Markdown，每组一个二级标题

## 示例
见 reference/examples.md 里的若干完整样例。`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          技能写得好不好，七分在 <code>description</code>，三分在正文。<code>description</code> 决定 Claude 会不会在
          「对的时机」想起用它；正文决定它一旦被调用，能不能照着把事做对。本章把这两件事讲透，再讲一个常被忽略的取舍：
          什么内容该留在正文、什么内容该拆到 <em>reference</em> 里去。
        </p>
      </Lead>

      <h2>description：技能的「触发开关」</h2>
      <p>
        Claude 平时只能看到所有技能的 <code>description</code>，看不到正文。所以它判断「这一刻该不该用某个技能」，
        靠的全是这一句话。写得含糊，技能就永远沉睡；写得精准，它才会在恰当的时机被唤醒。一句好的 description 有四个要点：
      </p>
      <ul>
        <li>
          <strong>触发条件在前</strong>——先说「什么时候用」，再说「做什么」，让匹配信息出现在最显眼的位置。
        </li>
        <li>
          <strong>用第三人称</strong>——描述这个技能客观上做什么，而不是用第一人称写成自我介绍。
        </li>
        <li>
          <strong>塞 3 到 5 个关键词</strong>——把用户可能用到的说法（同义词、动词、对象）都写进去，提高命中率。
        </li>
        <li>
          <strong>控制长度</strong>——<code>description</code> 和 <code>when_to_use</code> 合计不超过 1536 字符，写满没必要，写准才重要。
        </li>
      </ul>

      <Example title="差例 vs 好例">
        <p>同一个 PDF 处理技能，两种写法的命中率天差地别：</p>
        <CodeBlock lang="yaml" title="description 对比" code={badVsGood} />
        <p>
          差例的 <code>Helps with documents.</code> 既没说清是哪种文档、做什么操作，也没有任何触发词——
          用户说「帮我把这个 PDF 的表格抽出来」时，Claude 根本对不上号。好例把
          <code>read a PDF</code>、<code>extract text or tables</code>、<code>merge or split</code> 这些动作都点了名，命中就稳了。
        </p>
      </Example>

      <DescriptionQuality />

      <KeyIdea title="description 是写给「分诊台」看的">
        <p>
          把 Claude 想象成医院分诊台：它面前摆着一排技能的 <code>description</code>，要在一瞬间判断当前请求该转给谁。
          所以 description 的读者不是人类用户，而是这台<strong>分诊机器</strong>——写法要客观、要密集、要含触发词，
          而不是写得「好看」。一句话里塞进越多正确的匹配信号，就越不会被错过。
        </p>
      </KeyIdea>

      <h2>正文：被激活之后怎么干活</h2>
      <p>
        一旦技能被触发，整段正文会被加载进上下文，<strong>之后的每一轮都占着 token</strong>。所以正文的第一原则是简洁——
        只写「做这件事必须知道的」，把可有可无的背景、长篇示例都剔出去。一个好用的正文结构是：
      </p>
      <ul>
        <li><strong>概述</strong>——一两句话说清这个技能要达成什么。</li>
        <li><strong>关键规则</strong>——硬约束、禁忌、风格要求，用短句列点。</li>
        <li><strong>步骤</strong>——按顺序的可执行动作，能编号就编号。</li>
        <li><strong>示例</strong>——少量、典型；大量样例移到 reference。</li>
      </ul>
      <CodeBlock lang="markdown" title="SKILL.md 正文骨架" code={bodyShape} />

      <Callout variant="tip" title="正文建议控制在 500 行以内">
        <p>
          正文不是越详尽越好——它越长，激活后吃掉的上下文就越多，反而挤占了干活的空间。一个经验值是正文
          <strong>不超过 500 行</strong>；超出的部分，多半是该拆到 reference 的细节。
        </p>
      </Callout>

      <h2>什么时候拆到 reference</h2>
      <p>
        <code>reference/</code> 目录里的文件不会被自动加载，只有当 Claude 觉得需要时，才会顺着正文里的相对路径链接去读。
        这正好用来安放那些「偶尔才用到、但一用就得很全」的内容。判断标准很简单：
      </p>
      <ul>
        <li><strong>留在正文</strong>：核心规则、必经步骤、判断逻辑——每次干活都要用到的。</li>
        <li>
          <strong>拆到 reference</strong>：超过 100 行的 API 文档、成套的示例集合、详尽的排错指南——
          用得上才查、平时不必占上下文的。
        </li>
      </ul>
      <p>
        引用写法就是普通的 Markdown 相对链接，例如正文里写 <code>[完整 API 见这里](reference/api.md)</code>，
        Claude 读到、判断需要时就会去打开它。
      </p>

      <h2>这对实战意味着什么</h2>
      <p>
        日常里你会发现：技能「不触发」几乎都是 <code>description</code> 的锅，技能「干歪了」几乎都是正文不清楚或太啰嗦的锅。
        所以打磨技能的功夫，八成花在反复改这一句描述、和给正文做减法上。把核心留正文、把厚重移 reference，
        既能保住触发命中，又能让激活后的上下文保持轻盈——这就是写好技能的全部手艺。
      </p>

      <Practice title="把一个差 description 改写成好 description">
        <p>
          给你一个糟糕的描述，请按「触发条件在前 + 第三人称 + 3 到 5 个关键词」把它重写。原句：
        </p>
        <CodeBlock lang="yaml" title="改写前" code={`description: Useful for code stuff.`} />
        <p>假设这个技能其实是「审查 Pull Request 的改动并找出 bug」，一个合格的改写是：</p>
        <CodeBlock
          lang="yaml"
          title="改写后"
          code={`description: Review a pull request diff for correctness bugs and risky
  changes. Use when the user asks to review a PR, check a diff, find
  bugs in changed code, or do a code review before merging.`}
        />
        <p>
          自检三连：触发场景（review a PR / check a diff）在前了吗？是第三人称客观陈述吗？
          关键词（PR、diff、bug、code review、merge）够不够 3 到 5 个？三条都过，这条 description 就立住了。
        </p>
      </Practice>

      <Summary
        points={[
          'Claude 只能看到 description（看不到正文），它决定技能在什么时机被触发，是最该打磨的一句话。',
          'description 四要点：触发条件在前、用第三人称、塞 3 到 5 个关键词、与 when_to_use 合计 ≤1536 字符。',
          '差例「Helps with documents.」没场景没关键词；好例把动作与对象都点名，命中才稳。',
          '正文激活后整轮占 token，要简洁：概述 → 关键规则 → 步骤 → 少量示例，建议 <500 行。',
          'reference 不自动加载，靠正文相对链接按需读取；适合放 >100 行 API、示例集、排错指南。',
          '核心规则与步骤留正文，厚重细节拆 reference——既保触发命中，又让上下文轻盈。',
        ]}
      />
    </>
  )
}
