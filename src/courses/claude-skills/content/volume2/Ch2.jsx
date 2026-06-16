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

const triggerWordsCode = `# 给同一功能想"用户可能怎么说"，把同义表达都铺进 description

# 功能：审查 PR 找 bug
# 用户实际会说的：
#   "review 一下这个 PR"        -> review, PR
#   "看看这个 diff 有没有问题"   -> diff, 检查
#   "合并前帮我把把关"          -> before merge, 把关
#   "这段改动有 bug 吗"          -> bug, 改动

# 于是 description 里把这些词都点名：
description: Review a pull request diff for correctness bugs and risky
  changes. Use when the user asks to review a PR, check a diff, find
  bugs in changed code, or do a code review before merging.`

const overlapCode = `# 两个领域相邻的 Skill，容易互相抢触发

# skill A: pdf  —— description 只说 "处理 PDF"
# skill B: invoice-parser —— "解析发票并导出结构化数据"
# 用户说 "把这张发票 PDF 的金额抽出来" 时，A 和 B 都觉得是自己该上

# 解法：给 invoice-parser 加正负边界把地盘划清
description: Parse invoices and export line items, totals, and tax to
  CSV/JSON. Use when the user asks to extract structured fields from an
  invoice. Do NOT use for general PDF reading or non-invoice documents.`

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

      <h3>为什么这四条有效：从「匹配」的角度理解</h3>
      <p>
        这四条不是凭空的格式要求，背后是同一个机制：模型拿当前请求和每个 description 做<strong>语义匹配</strong>，
        匹配信号越强、越早出现，命中越稳。逐条拆开看就明白了——
      </p>
      <ul>
        <li>
          <strong>触发条件在前</strong>之所以重要，是因为模型扫一长串 description 时，开头的信息权重更高；
          把「Use when…」往前提，等于把最关键的匹配线索摆在最显眼处。
        </li>
        <li>
          <strong>第三人称</strong>是因为这段文字的读者不是用户，而是做匹配的模型。第一人称的「我可以帮你……」
          混入了对话口吻，反而稀释了客观的功能信号。
        </li>
        <li>
          <strong>多塞关键词</strong>直接对应「用户表达的多样性」——同一个需求，十个人有十种说法，
          你铺的同义表达越全，能接住的说法就越多（下面专门讲怎么穷举）。
        </li>
        <li>
          <strong>控长度</strong>是因为超长 description 会稀释关键信号，也会挤占元数据层预算；密度比篇幅重要。
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

      <h3>实操技巧：先穷举「用户怎么说」，再写 description</h3>
      <p>
        最常见的失误是：作者太熟悉自己的技能，于是用<em>自己的术语</em>写 description，却忘了用户根本不会那么说。
        一个屡试不爽的方法是<strong>反着来</strong>——先别写 description，而是列出「用户可能用哪些话触发它」，
        把这些口语化的说法逐条记下，再从中提炼出动词和关键词铺进 description：
      </p>
      <CodeBlock lang="bash" title="先列用户说法，再回填关键词" code={triggerWordsCode} />
      <p>
        这一步看似笨，却能逼出你自己想不到的同义表达。真实项目里，「该触发却没触发」十有八九是因为
        <strong>用户用了你没料到的词</strong>。先穷举说法，能从源头堵住这个漏洞。
      </p>

      <h3>避免 Skill 之间「抢触发」</h3>
      <p>
        当你只有一个 Skill 时，description 写得粗一点也无妨；可一旦多个 Skill 领域相邻，麻烦就来了——
        它们会<strong>互相抢触发</strong>，模型在两个都「沾边」的 description 之间摇摆。解决的钥匙是画清边界：
      </p>
      <CodeBlock lang="yaml" title="用正负边界划清地盘" code={overlapCode} />
      <p>
        核心招式有两个：一是给容易混淆的 Skill 加一句 <strong>Do NOT use for…</strong> 的负边界，明确「这种情况别找我」；
        二是找一个<strong>硬锚点</strong>来消歧——比如「交付物是不是发票/电子表格」「主要输入是不是某种文件」——
        让模型有一个可判定的依据，而不是靠模糊的「话题相关」去猜。Skill 装得越多，这种边界设计就越重要。
      </p>

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

      <h3>正文是「指令」不是「文档」</h3>
      <p>
        写正文时最该扭转的观念是：它不是给人读的产品文档，而是给模型执行的<strong>操作指令</strong>。两者笔法完全不同——
        文档喜欢铺背景、讲来龙去脉、用「通常」「一般来说」这种留有余地的措辞；指令则要<em>直接、具体、可执行</em>。
        几条经验：
      </p>
      <ul>
        <li>
          <strong>用祈使句下命令</strong>——写「按 feat/fix 分组」，而不是「你可以考虑按类型分组」。
          带「建议」「最好」「尽量」的软措辞，模型很容易当成可选项而忽略掉。
        </li>
        <li>
          <strong>硬约束要醒目</strong>——绝对不能违反的规则，单独列点、必要时加粗，别埋在长段落里。
        </li>
        <li>
          <strong>步骤可被逐条检查</strong>——每一步都是一个能判定「做了没做」的动作，而不是模糊的目标。
        </li>
        <li>
          <strong>给出输出格式</strong>——明确要 Markdown、要表格、要哪些字段，别让模型自由发挥。
        </li>
      </ul>

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
        引用写法就是普通的 Markdown 相对链接，例如正文里写 <code>{'[完整 API 见这里](reference/api.md)'}</code>，
        Claude 读到、判断需要时就会去打开它。
      </p>

      <Callout variant="note" title="拆 reference 时，正文一定要留「路标」">
        <p>
          拆分有个隐藏前提常被忽略：reference 不会被自动读，正文里必须<strong>明确告诉模型「什么情况下去读哪个文件」</strong>。
          只是把内容挪进 reference、正文里却不留一句指引，结果就是模型遇到长尾情况时根本不知道有这份资料、也就不会去读。
          正确做法是在正文相应位置留下路标：「遇到 X 时，详见 reference/y.md」。<em>路标 + 文件</em>才构成一次有效的拆分。
        </p>
      </Callout>

      <h2>这对实战意味着什么</h2>
      <p>
        日常里你会发现：技能「不触发」几乎都是 <code>description</code> 的锅，技能「干歪了」几乎都是正文不清楚或太啰嗦的锅。
        所以打磨技能的功夫，八成花在反复改这一句描述、和给正文做减法上。把核心留正文、把厚重移 reference，
        既能保住触发命中，又能让激活后的上下文保持轻盈——这就是写好技能的全部手艺。
      </p>
      <p>
        把这套手艺总结成一个可执行的「诊断流程」就更好用了：技能<strong>没触发</strong>→ 回去检查 description
        是不是缺了用户的说法、是不是被相邻 Skill 抢了；技能<strong>触发了但做错</strong>→ 回去检查正文是不是软措辞太多、
        步骤不够具体、缺了硬约束；技能<strong>激活后变迟钝、上下文吃紧</strong>→ 回去给正文减肥、把长尾下沉到 reference。
        三种症状对应三个修改方向，调技能从此不再靠猜。
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
        <p>
          进阶：再为它加一句负边界，想想这个「审查 PR」技能容易和哪个相邻技能抢触发（比如一个「生成提交信息」的技能），
          写一句 <code>Do NOT use for…</code> 把地盘划清。然后回到正文，把任意一条规则从「建议……」改写成祈使句命令，
          体会两种笔法在「模型会不会照做」上的差别。
        </p>
      </Practice>

      <Summary
        points={[
          'Claude 只能看到 description（看不到正文），它决定技能在什么时机被触发，是最该打磨的一句话。',
          'description 四要点：触发条件在前、用第三人称、塞 3 到 5 个关键词、与 when_to_use 合计 ≤1536 字符——本质是让语义匹配信号更强、更早出现。',
          '实操技巧：先穷举「用户可能怎么说」再回填关键词，堵住「用了你没料到的词导致不触发」这个最常见漏洞。',
          '多个相邻 Skill 会互相抢触发，用 Do NOT use 负边界和「交付物/主输入」硬锚点划清地盘。',
          '差例「Helps with documents.」没场景没关键词；好例把动作与对象都点名，命中才稳。',
          '正文是「指令」不是「文档」：用祈使句下命令、硬约束醒目、步骤可逐条检查、明确输出格式，别用「建议/尽量」等软措辞。',
          '正文激活后整轮占 token，要简洁：概述 → 关键规则 → 步骤 → 少量示例，建议 <500 行。',
          'reference 不自动加载，靠正文相对链接按需读取；拆分时正文必须留「什么情况读哪个文件」的路标，否则是死文件。',
          '诊断流程：不触发查 description、干错查正文、变迟钝就给正文减肥下沉 reference。',
        ]}
      />
    </>
  )
}
