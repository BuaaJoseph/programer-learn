import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ProgressiveLoading from '@/courses/claude-skills/illustrations/ProgressiveLoading.jsx'

const skillLayoutCode = `pdf-tools/
├── SKILL.md            # 元数据 + 正文，正文在触发时加载
├── reference/
│   ├── pdf-api.md      # 详尽的 API 说明，几百行
│   └── examples.md     # 大量示例
└── scripts/
    └── extract.py      # 可执行脚本`

const frontmatterCode = `---
name: pdf-tools
description: 处理 PDF 的提取、合并、加水印。当用户要读取 PDF 文本、拆分合并页面或给 PDF 加水印时使用。
disable-model-invocation: true   # 仅允许手动 /pdf-tools，不自动触发
---

# PDF 工具

常见操作见下；复杂参数与边界情况请查 reference/pdf-api.md。

- 提取文本：python scripts/extract.py input.pdf
- 需要逐页控制、加密 PDF 处理时，再去读 reference/pdf-api.md`

const budgetMathCode = `# 一个粗略的"预算账"，帮你直觉化三层成本

# 元数据层（始终在场）：假设你装了 30 个 Skill
#   每个 description + when_to_use ≈ 100~200 token
#   30 个 × 150 ≈ 4500 token  —— 这是你为"拥有这些技能"付的固定租金

# 正文层（触发才加载）：单个正文 ≈ 1000~3000 token
#   一轮通常只触发 1~2 个，约 2000~5000 token

# reference 层（引用才加载）：一份 API 文档可能 5000+ token
#   不引用 = 0；一旦引用，可能瞬间吃掉一大块预算

# 结论：固定成本来自"装了多少个"，可变成本来自"正文多大 + 引用了多少 reference"`

const splitExampleCode = `# 反面：把一切塞进正文（正文 800 行，每次触发都全量加载）
# SKILL.md
#   ## 基本用法 ...
#   ## 全部 40 个参数逐一详解 ...   <- 90% 的会话用不到
#   ## 加密 PDF 的 6 种异常处理 ... <- 偶尔才用到
#   ## 30 个完整示例 ...            <- 偶尔才用到

# 正面：正文只留主干，长尾下沉到 reference（正文 80 行）
# SKILL.md
#   ## 基本用法 ...
#   ## 常见操作（提取/合并/水印）...
#   遇到加密 PDF、逐页控制、罕见参数？见 reference/pdf-api.md
#   需要更多示例？见 reference/examples.md`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说 Skill 平时几乎不占上下文，用到才加载——这是怎么做到的？答案是<em>渐进式加载</em>（progressive disclosure）：
          Skill 的内容被切成三层，按「需不需要」逐层送进模型的上下文。理解这三层，你才能写出既好用、又不浪费 token 的 Skill。
        </p>
      </Lead>

      <h2>三层渐进式加载</h2>
      <p>
        把一个 Skill 想象成一本说明书：封面（书名 + 一句简介）随时摆在桌上，正文用到了才翻开，附录里厚厚的参考资料只有真需要时才去查。
        Skill 正是这么分的三层：
      </p>
      <ul>
        <li>
          <strong>① 元数据层</strong>（<code>name</code> + <code>description</code>）：启动时就加载进上下文，所有 Skill 的这一层都在。
          它极小，成本几乎可以忽略——所以你装一百个 Skill，平时也不会撑爆窗口。
        </li>
        <li>
          <strong>② SKILL.md 正文</strong>：只有当这个 Skill 被触发时才加载，而且会<strong>保留整轮会话</strong>，
          后续步骤都能用到它。
        </li>
        <li>
          <strong>③ reference / scripts 等资源</strong>：仅当正文里引用到它们时，才按需从磁盘加载进来。
          平时它们安安静静躺在硬盘上，一个 token 都不占。
        </li>
      </ul>

      <h3>为什么要分三层，而不是两层或一层</h3>
      <p>
        你可能会想：直接「元数据 + 正文」两层不就够了？为什么还要单独切出第三层 reference？关键在于一个权衡——
        <strong>触发的粒度</strong>和<strong>加载的粒度</strong>不是一回事。description 决定「这个 Skill 该不该上场」，
        这是一次粗判断；但一旦上场，并不意味着它的<em>所有</em>细节都该立刻进上下文。
        以 PDF 处理为例：99% 的会话只是「提个文本、合并几页」，正文主干就够了；只有当你真撞上「加密 PDF 解不开」这种长尾情况，
        才需要那份几百行的 API 文档。如果把 API 文档塞进正文，那 99% 的会话都在为那 1% 的可能性<strong>白白付 token</strong>。
        第三层的存在，就是把「触发」和「细节加载」解耦：<em>命中了不等于全量加载，真用到了才逐份取</em>。
      </p>

      <Callout variant="note" title="渐进式披露不是 Skill 的发明，而是认知设计的老道理">
        <p>
          「先给概要、按需展开细节」这套思路在文档设计、API 设计、UI 设计里早就存在，名字就叫 progressive disclosure。
          它背后的洞察是：<strong>把所有信息一次性铺满，反而会让人（或模型）找不到重点</strong>。
          Skill 把这个原则用在了上下文管理上——元数据是「概要」，正文是「展开一层」，reference 是「再展开一层」。
          理解了这一点，你设计任何 Skill 的目录结构时，脑子里都应该有一根「这一层是给谁、在什么时机看的」的弦。
        </p>
      </Callout>

      <Example title="一个带大 reference 的 Skill，平时不占上下文">
        <p>
          假设有个处理 PDF 的 Skill，目录长这样：
        </p>
        <CodeBlock lang="text" title="pdf-tools 目录结构" code={skillLayoutCode} />
        <p>
          <code>reference/pdf-api.md</code> 可能有好几百行，<code>examples.md</code> 也很厚。但在你没问 PDF 的时候，
          上下文里只有元数据那一句话；当你说「帮我提取这个 PDF 的文字」，正文被加载进来；
          只有当任务真的涉及加密 PDF、需要查那份详尽 API 文档时，<code>reference/pdf-api.md</code> 才会被读进来。
          一份几百行的参考资料，<strong>九成时间是零成本的</strong>。
        </p>
      </Example>

      <ProgressiveLoading />

      <KeyIdea title="description 是唯一的「触发开关」">
        <p>
          Claude 怎么知道该不该加载某个 Skill 的正文？它<strong>只看元数据层</strong>，也就是 <code>description</code>。
          它拿当前任务和每个 Skill 的 description 比对，判断是否匹配。所以 description 既是「广告语」也是「触发条件」：
          写得准，正文才会在该来的时候来；写得含糊，正文要么不来，要么乱来。正文写得再好，description 不行也没人翻得开。
        </p>
      </KeyIdea>

      <h3>什么时候加载哪一层</h3>
      <p>
        把时间线理一遍就清楚了：会话一开始，所有 Skill 的<em>元数据</em>已经在上下文里；
        你发出请求，Claude 比对 description，命中的那个 Skill 的<em>正文</em>被加载，并在<strong>这一整轮</strong>里持续可用；
        执行过程中，正文若指向某个 <code>reference</code> 或要跑某个 <code>script</code>，对应资源此刻才被读取。
        没命中的 Skill，正文永远不会被加载；没被引用的 reference，永远不会进上下文。
      </p>

      <h3>把三层成本算成一笔「预算账」</h3>
      <p>
        光说「省」不够直观，把它换算成 token 你就有感觉了。下面这笔粗账能帮你建立量化直觉——
        <strong>固定成本来自「装了多少个 Skill」，可变成本来自「正文多大 + 引用了多少 reference」</strong>：
      </p>
      <CodeBlock lang="bash" title="三层加载的 token 预算直觉" code={budgetMathCode} />
      <p>
        这笔账揭示了一个反直觉的结论：<em>多装 Skill 不可怕，写胖正文才可怕</em>。
        装 30 个精简 Skill 的固定租金，可能还不如一个把 800 行全塞进正文的「巨型 Skill」触发一次贵。
        所以优化方向很明确：控制每个 Skill 的<strong>正文体积</strong>，把长尾内容下沉到 reference，让它在不被引用时保持零成本。
      </p>

      <Example title="同一个 Skill，胖正文 vs 瘦正文">
        <p>下面对比把所有内容塞进正文，和只留主干、长尾下沉两种写法的差别：</p>
        <CodeBlock lang="bash" title="正文减肥前后" code={splitExampleCode} />
        <p>
          右边的瘦正文每次触发只加载约 80 行，而那两份厚重的 reference 只在真正撞上长尾情况时才被读取。
          功能一点没少，常用路径的成本却降了一个数量级——这就是「正文管常用路径、reference 管长尾」的实际收益。
        </p>
      </Example>

      <Callout variant="warn" title="预算是硬约束，别把 Skill 写成大杂烩">
        <p>
          有几条数字要记住：<code>description</code> 加 when_to_use 合计<strong>不超过 1536 字符</strong>；
          正文建议<strong>少于 500 行 / 5000 词</strong>。触发太多 Skill 或单个正文太大时，
          <em>auto-compaction</em>（自动压缩）会在约 <strong>25000 token</strong> 的预算内重新附加技能内容，
          超出的旧内容可能被丢弃。所以正文要精简，把详尽材料下沉到 <code>reference</code>，靠按需加载省预算。
        </p>
      </Callout>

      <Callout variant="tip" title="一个常见误区：以为 reference 会「自动被读」">
        <p>
          很多人把详尽内容拆进了 <code>reference/</code>，却发现 Claude 干活时压根没去读它——以为是机制坏了。
          其实 reference <strong>不会自动加载</strong>，它只在<em>正文里明确用相对链接指向它、且模型判断当前需要</em>时才被读取。
          所以拆 reference 时，正文里必须留一句「<strong>什么情况下去读哪个文件</strong>」的指引，比如
          「遇到加密 PDF 请查 reference/pdf-api.md」。没有这句指引，再好的 reference 也是死文件。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        渐进式加载意味着你可以放心地「广撒网、精加载」：建很多 Skill 都不心疼，因为没触发的只占元数据。
        于是写 Skill 的功夫，重心落在两处——把 <code>description</code> 打磨到精准（决定触发），
        把正文压薄、详情外置到 <code>reference</code>（决定成本）。这正是「<strong>正文管常用路径，reference 管长尾</strong>」的设计原则：
        让模型每次只为它真正用到的内容付费。
      </p>
      <p>
        再往深想一层：这套机制其实把「上下文管理」这件原本很玄的事，变成了一道<strong>可以用结构去解的工程题</strong>。
        你不再需要靠玄学去猜「该给模型喂多少背景」，而是用目录结构把信息分成「常驻 / 触发加载 / 引用加载」三档，
        让加载时机由结构本身决定。当你团队的 Skill 多到几十上百个，这种结构化的成本控制就是它们能共存而不互相拖垮上下文的根本保障。
      </p>

      <Practice title="手动触发并观察加载行为">
        <p>
          要看清楚加载发生在哪一步，最直接的办法是手动触发，再控制是否允许自动触发。下面给一个把某 Skill 设为「仅手动」的写法：
        </p>
        <CodeBlock lang="markdown" title="SKILL.md frontmatter" code={frontmatterCode} />
        <p>
          加上 <code>disable-model-invocation: true</code> 后，Claude 不会自动用它，只有你输入 <code>/pdf-tools</code> 才会加载正文。
          对照试一下：去掉这行、问一句和 PDF 相关的话，看正文是否被自动加载；再加上这行，确认必须手动 <code>/pdf-tools</code> 才生效。
          这样你就能亲眼区分「元数据常驻」「正文按触发加载」「reference 按引用加载」这三层各自发生的时机。
        </p>
        <p>
          再加一步验证第三层：在 <code>reference/pdf-api.md</code> 里塞一句明显的「暗号」（比如一行
          <code>{'<!-- MAGIC-TOKEN-9527 -->'}</code>），正文里写「需要详细 API 时请读 reference/pdf-api.md」。
          先问个简单任务，观察 Claude <strong>没有</strong>读那份文件、也说不出暗号；再问个明确需要详细 API 的任务，
          观察它这时才去读、并能复述暗号。亲手验证「引用才加载」这一层，你对成本模型的理解就彻底落地了。
        </p>
      </Practice>

      <Summary
        points={[
          'Skill 内容分三层：元数据（name + description）启动即加载、SKILL.md 正文在触发时加载、reference/scripts 在被引用时按需加载。',
          '分三层而非两层，是为了把「触发」与「细节加载」解耦：命中不等于全量加载，真用到才逐份取，避免常用路径为长尾细节付费。',
          '正文一旦被触发加载，会保留整轮会话；后续步骤都能继续用到它。',
          'reference 等资源平时躺在磁盘上零成本，只有正文真正引用到时才读进上下文，长尾资料因此几乎不占预算。',
          '预算直觉：固定成本来自「装了多少个 Skill」，可变成本来自「正文多大 + 引用了多少 reference」——多装不可怕，胖正文才可怕。',
          'Claude 只凭 description 判断是否触发某个 Skill，所以 description 既是广告语也是触发开关，必须写准。',
          'reference 不会自动被读：正文里必须留「什么情况下去读哪个文件」的指引，否则它就是死文件。',
          '预算硬约束：description + when_to_use ≤ 1536 字符，正文建议 < 500 行 / 5000 词，auto-compaction 在约 25000 token 内重附技能、超出会丢弃。',
          '设计原则是「正文管常用路径、reference 管长尾」，可用 disable-model-invocation 改为仅手动 /skill 触发以便观察与控制。',
        ]}
      />
    </>
  )
}
