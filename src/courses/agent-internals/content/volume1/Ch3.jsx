import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ContextWindow from '@/courses/agent-internals/illustrations/ContextWindow.jsx'

const contextCode = `一次模型调用，上下文窗口里大致装着这些（默认约 200K token）

┌─────────────────────────────────────────────┐
│ system prompt        约 4200 token  身份/规则 │  ← 几乎固定
│ 工具定义              每个工具的名字/参数/说明  │  ← 几乎固定
│ CLAUDE.md            你写的项目规则/约定        │  ← 半固定
│ 自动记忆             跨会话记住的信息           │  ← 半固定
│ 环境信息             cwd / 操作系统 / 时间      │  ← 半固定
│ ───────────────────────────────────────────  │
│ 对话历史             你和它来回说过的每一句     │  ↑
│ 工具结果 / 文件内容   Read 出来的文件、命令输出  │  │ 越聊越涨
└─────────────────────────────────────────────┘  ↓ 直到逼近 200K`

const compactCode = `自动压缩（社区代号 wU2）大致这样工作

if 上下文用量 >= 约 92%:           # 阈值为社区分析，非官方
    summary = 子代理 + 轻量模型(如 Haiku).总结(旧对话)
    #   ↑ 把早期来回压成一份结构化摘要
    清理(旧的、占地方的工具输出)     # 比如几千行的旧 Read 结果
    重新注入(CLAUDE.md)              # 持久规则被重新塞回来
    上下文 = [system, 工具定义, CLAUDE.md, summary, 最近几轮]
    # 结果：腾出空间继续干，但早期细节可能已经丢了`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章说模型每轮都「看着全部历史」做决策。那这份「全部历史」到底装了什么？又能装多少？
          这一章我们打开上下文窗口，看清里面分成哪几块、为什么它是一种<strong>会越用越糟的有限资源</strong>，
          以及当它快满时 Claude Code 偷偷做了什么——理解这些，你才知道为什么「持久的规则要写进 CLAUDE.md」。
        </p>
      </Lead>

      <h2>上下文窗口里到底装了什么</h2>
      <p>
        模型每次生成回复，眼前能看到的全部信息，就是<em>上下文窗口</em>（context window）里这一堆 token。
        Claude Code 默认的窗口大约是 <strong>200K token</strong>。它不是只装你刚说的那句话，而是分成好几块拼起来的：
      </p>
      <ul>
        <li><strong>system prompt</strong>：定义模型身份、能力边界、工作方式，体量约 4200 token，基本固定。</li>
        <li><strong>工具定义</strong>：每个可用工具的名字、参数、用法说明，告诉模型「你有哪些手」。</li>
        <li><strong>CLAUDE.md</strong>：你写在项目里的规则和约定，会被读进上下文。</li>
        <li><strong>自动记忆</strong>：跨会话记下来的信息。</li>
        <li><strong>环境信息</strong>：当前工作目录、操作系统、时间这类背景。</li>
        <li><strong>对话历史</strong>：你和它来回说过的每一句话。</li>
        <li><strong>工具结果 / 文件内容</strong>：<code>Read</code> 出来的文件、<code>Bash</code> 的命令输出等。</li>
      </ul>
      <p>
        前面几块基本是固定的，真正会<strong>不断膨胀</strong>的是后两块：每读一个文件、每跑一条命令、每多聊几轮，
        对话历史和工具结果就往上堆，慢慢逼近那 200K 的天花板。
      </p>
      <CodeBlock lang="text" title="context-window" code={contextCode} />

      <ContextWindow />

      <h2>为什么上下文是「有限且会变质」的资源</h2>
      <p>
        很多人以为窗口够大就行——其实有两层限制。第一层是<strong>容量</strong>：200K 听着多，但读几个大文件、
        跑几轮带长输出的命令，很快就见底。第二层更隐蔽，叫 <em>context rot</em>（上下文腐烂）：
        <strong>上下文越长，模型越容易「读不准」</strong>。塞得越满，关键信息越容易被淹没在噪声里，
        模型可能忽略中间段落、记混早先的约定、被无关的旧内容带偏。所以上下文不是「越多越好」，
        而是<strong>越精准越好</strong>——这也是为什么「把不相关的东西及时清出去」本身就是一种性能优化。
      </p>

      <KeyIdea title="上下文是要主动经营的预算，不是无底的仓库">
        <p>
          把上下文窗口当成一笔有限的、还会随长度贬值的预算来花。每往里放一段内容，都在挤占别的内容的位置、
          也在加重 context rot 的风险。好的 Agent（和会用 Agent 的人）都在做同一件事：
          <strong>只让真正有用的信息留在窗口里</strong>，让模型把注意力花在刀刃上。
        </p>
      </KeyIdea>

      <h2>满了怎么办：约 92% 触发自动压缩</h2>
      <p>
        既然窗口会满，Claude Code 就得有个机制在撞墙前腾地方。社区逆向分析把这个自动压缩机制代号为 <em>wU2</em>：
        当上下文用量达到约 <strong>92%</strong> 时（阈值与代号均为社区分析、非官方），它会自动触发一次压缩。
      </p>
      <p>
        压缩的做法大致是：派出一个<strong>子代理</strong>，用一个<strong>轻量模型</strong>（比如 Haiku）把早期那一大段来回对话
        <strong>总结成一份结构化摘要</strong>，同时清理掉那些又老又占地方的工具输出（比如几千行的旧 <code>Read</code> 结果）。
        压缩之后，<strong>CLAUDE.md 会被重新注入</strong>到上下文里，但早期对话里的<strong>细节可能已经丢了</strong>——
        摘要保住的是大意，未必是某句具体约定。
      </p>
      <CodeBlock lang="text" title="auto-compact (wU2)" code={compactCode} />
      <p>
        压缩本质是一道<strong>取舍题</strong>：它的首要目标是<strong>先保住召回</strong>——别把后面还要用到的关键事实弄丢；
        在此基础上再尽量<strong>精炼</strong>、去掉冗余。所以你会发现，压缩后的 Agent 通常还记得「这个项目在做什么、
        刚才大方向是什么」，但可能忘了你二十轮之前随口定下的某个小规矩。
      </p>

      <Example title="长会话跑着跑着，忘了早先的约定">
        <p>
          你在一次很长的会话开头叮嘱：「所有新函数都写类型注解，注释一律用英文。」前几十轮它都照做。
          可随着你不断让它读文件、跑测试，上下文越堆越高，到了某一刻触发自动压缩——
          那句开头的叮嘱被压进了摘要，细节没保下来。再往后它新写的函数，类型注解开始时有时无，注释也冒出了中文。
        </p>
        <p>
          它不是「不听话」，而是<strong>那条约定已经从它眼前的上下文里淡出了</strong>。
          这就是 context rot 加自动压缩共同造成的典型现象：早期细节随会话变长而流失。
          解法不是反复在对话里重申，而是——把它写进 CLAUDE.md。
        </p>
      </Example>

      <Callout variant="tip" title="持久的规则，请写进 CLAUDE.md">
        <p>
          为什么 CLAUDE.md 这么关键？因为它在<strong>每次压缩后都会被重新注入</strong>上下文，
          而对话里随口说的话会随压缩流失。凡是你希望模型「自始至终都遵守」的东西——代码风格、命名约定、
          技术选型、不许碰的目录——都应该落到 CLAUDE.md 里，而不是指望它记住你某一轮说过的话。
          一句话：<strong>对话里的内容会过期，CLAUDE.md 里的内容会续命。</strong>
        </p>
      </Callout>

      <h2>这对做 Agent / 用 Agent 意味着什么</h2>
      <p>
        如果你在<strong>做</strong> Agent：把上下文管理当成一等公民。设计工具时让它的输出尽量精简、可被裁剪；
        设计流程时考虑「哪些是必须长期留的、哪些用完就该清」；并且明确区分「持久规则」（注入式、每轮都在）
        和「临时信息」（会被压缩掉）两条通道。
      </p>
      <p>
        如果你在<strong>用</strong> Agent：养成两个习惯。其一，长任务里把稳定不变的要求写进 CLAUDE.md，
        别靠对话口头约定；其二，发现会话变得又长又「不在状态」时，主动开新会话或精简上下文，
        而不是继续在一个已经腐烂的上下文里硬撑。你管好它的上下文，它才能管好你的代码。
      </p>

      <Practice title="写一份精简 CLAUDE.md 的要点清单">
        <p>
          给你正在做的某个项目，起草一份 CLAUDE.md。目标是<strong>短、稳、只放持久规则</strong>。先列出要点清单：
        </p>
        <ul>
          <li><strong>项目是什么</strong>：一两句话说清这个仓库在干嘛、用什么技术栈。</li>
          <li><strong>代码约定</strong>：语言/格式化工具、命名风格、注释语言、类型注解要求。</li>
          <li><strong>怎么验证</strong>：跑测试的命令、lint 命令、构建命令——让它能自我验证。</li>
          <li><strong>红线</strong>：哪些目录/文件不许改，哪些命令不许跑。</li>
          <li><strong>别写进去的</strong>：临时任务细节、一次性的解释——那些属于对话，不属于 CLAUDE.md。</li>
        </ul>
        <p>
          写完后做个减法：删掉任何「只对这一次任务有用」的句子。能留在 CLAUDE.md 里的，
          应该是你希望它在第一轮和第一百轮（甚至每次压缩之后）都一字不差遵守的东西。
        </p>
      </Practice>

      <Summary
        points={[
          '上下文窗口（默认约 200K token）由 system prompt（约 4200 token）、工具定义、CLAUDE.md、自动记忆、环境信息、对话历史、工具结果/文件内容拼成。',
          '会膨胀的主要是对话历史和工具结果：每读一个文件、每跑一条命令都在往里堆，逼近天花板。',
          '上下文是有限且会变质的资源：除了容量限制，还有 context rot——越长越容易读不准，所以越精准越好、该清就清。',
          '上下文用到约 92% 时触发自动压缩（社区代号 wU2）：用子代理+轻量模型（如 Haiku）把旧对话总结成结构化摘要、清理旧工具输出。',
          '压缩是取舍：先保召回再求精度；CLAUDE.md 压缩后会被重新注入，但对话里的早期细节可能丢失。',
          '所以持久规则（风格/约定/红线）要写进 CLAUDE.md，而不是靠对话口头约定——对话会过期，CLAUDE.md 会续命。',
        ]}
      />
    </>
  )
}
