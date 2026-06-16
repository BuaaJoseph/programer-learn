import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const systemPromptCode = `// forge 的基础 system prompt。后续「上下文工程」卷会扩充它（加入 AGENTS.md、工具纪律等）。
export const SYSTEM_PROMPT = \`你是 forge，一个运行在用户终端里的编码助手。

工作方式：
- 你可以读写文件、搜索代码、执行 shell 命令来完成任务。
- 动手改代码前，先用只读工具（read/list/glob/grep）把相关代码看清楚。
- 修改已有文件优先用 edit 做精确替换；新建文件用 write。
- 需要验证时用 bash 跑测试或构建，根据输出自行纠错。
- 任务完成后，用简洁的中文说明你做了什么、改了哪些文件。

原则：保持简单、就事论事，不要做用户没要求的多余改动。\``

const contextCode = `import { platform } from 'node:os'
import { SYSTEM_PROMPT } from './system.js'

export function buildSystemPrompt(cwd: string): string {
  const parts: string[] = [SYSTEM_PROMPT]

  parts.push(
    [
      '',
      '# 运行环境',
      \`- 工作目录：\${cwd}\`,
      \`- 平台：\${platform()}\`,
      \`- 日期：\${new Date().toISOString().slice(0, 10)}\`,
    ].join('\\n'),
  )

  // …（下一章会在这里追加 AGENTS.md 项目记忆）
  return parts.join('\\n')
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        欢迎来到第 4 卷「上下文工程」。前三卷里你已经造出了一个能读写文件、跑命令、循环到任务完成的 Agent。但你可能发现它有时候像个莽夫：上来就改文件、不验证、做一堆你没要求的事。问题不在循环逻辑，而在于——你还没给它「立人设和规矩」。这一章，我们来写 forge 的第一份 system prompt。
      </Lead>

      <h2>一次请求里到底装了什么</h2>
      <p>
        在动手之前，先搞清楚「上下文」是什么。每一轮调用模型时，我们送过去的输入，并不是只有用户那句话。它由几块拼成，而且共享同一个 token 窗口：
      </p>

      <KeyIdea title="上下文的四块组成">
        <ul>
          <li><strong>system prompt</strong>：Agent 的人设与规矩。它定义「你是谁、怎么干活」。</li>
          <li><strong>tools</strong>：工具的说明书。告诉模型有哪些工具、参数长什么样。</li>
          <li><strong>messages</strong>：对话历史，包括用户消息、模型的回复，以及每次工具调用的结果。</li>
          <li><strong>tool results</strong>：上一轮工具跑出来的输出，会作为新的 message 塞回去。</li>
        </ul>
        <p>
          这四块都在抢同一个有限的 token 窗口。其中 <strong>system prompt 是最稳定、最该精心设计的一块</strong>：它每一轮都在、影响模型的每一个决定。messages 会越滚越长，tools 是固定的，而 system prompt 是你唯一能用自然语言「编程」Agent 行为的地方。
        </p>
      </KeyIdea>

      <h2>一份好的 system prompt 该包含什么</h2>
      <p>
        别把 system prompt 当成功能列表往里堆。它的本质是「行为基线」——一套即使在没人盯着时，Agent 也会自觉遵守的纪律。一份称职的编码 Agent system prompt，通常要交代清楚四件事：
      </p>
      <ul>
        <li><strong>身份</strong>：你是谁、运行在什么环境里（比如「运行在用户终端里的编码助手」）。</li>
        <li><strong>工具使用纪律</strong>：先探索再动手、改局部用 edit、需要验证就用 bash。</li>
        <li><strong>输出风格</strong>：用简洁的中文、说清楚改了哪些文件。</li>
        <li><strong>安全与边界约束</strong>：不做用户没要求的多余改动。</li>
      </ul>

      <Callout variant="tip" title="写 system prompt 的几条经验">
        <ul>
          <li><strong>具体优于空泛</strong>：「先用 read/grep 看清楚再改」比「请仔细工作」有用一万倍。</li>
          <li><strong>给纪律，不给长篇大论</strong>：模型不需要教科书，它需要几条可执行的行为约束。</li>
          <li><strong>把最重要的放前面</strong>：身份和核心工作方式靠前，边界约束收尾点睛。</li>
        </ul>
      </Callout>

      <h2>forge 的基础 system prompt</h2>
      <p>
        下面是 forge 的第一版 system prompt。它很短——这是故意的。我们只立基线，后面几章再往上叠项目记忆和更细的纪律。
      </p>

      <CodeBlock lang="ts" title="src/system.ts" code={systemPromptCode} />

      <p>逐条看，为什么每一句都这么写：</p>
      <ul>
        <li>
          <strong>「动手改代码前，先用只读工具把相关代码看清楚」</strong>——这呼应了第 1 卷里我们专门拆出的只读工具（read/list/glob/grep）。模型天生有「想直接给答案」的冲动，这条纪律强迫它先建立对代码的真实认知，而不是凭想象改。
        </li>
        <li>
          <strong>「修改已有文件优先用 edit；新建文件用 write」</strong>——这是 edit 与 write 的分工。edit 做精确替换，只动该动的几行，既省 token 又不容易误删；write 会整个覆盖文件，只适合新建。不规定这条，模型常常用 write 重写整个文件，把无关代码也一并「重新生成」一遍，风险极大。
        </li>
        <li>
          <strong>「用 bash 跑测试或构建，根据输出自行纠错」</strong>——这把「验证」也变成 Agent 自己的职责。它不该改完就拍胸脯说「搞定了」，而要跑一遍、看输出、错了自己接着修。这正是 Agent 循环存在的意义。
        </li>
        <li>
          <strong>「不要做用户没要求的多余改动」</strong>——这是边界。能干活的模型往往「热心过头」，顺手重构、顺手改格式。这条约束让它保持就事论事，diff 干净、可审查。
        </li>
      </ul>

      <h2>把运行环境也喂给模型</h2>
      <p>
        这里有个容易被忽略的坑：模型并不知道「现在几号、当前在哪个目录、跑在什么平台上」。它的世界停在训练截止那一刻。如果你不告诉它，它就会瞎猜——用训练时的旧日期、假设是某个目录、默认是 Linux。所以我们要把这些运行环境信息，在启动时拼到 system prompt 后面。
      </p>
      <p>
        这就引出了下一章的主角 <code>buildSystemPrompt</code>。本章先看它最基础的形态：在基础 prompt 后面追加一个「运行环境」块。
      </p>

      <CodeBlock lang="ts" title="src/context.ts（运行环境部分）" code={contextCode} />

      <p>
        为什么非要把 cwd、平台、日期喂进去？因为这些是 Agent 做决策的硬事实：它要拼相对路径、判断该用什么 shell 命令、回答「今天」这类问题。少了它们，模型只能猜，而猜错的代价是路径错乱、命令跑不通。注意这段拼接发生在 <strong>启动时一次</strong>，结果会在整个会话里复用，不必每轮重算。
      </p>

      <Example title="有没有 system prompt 的差别">
        <p>同样一句「帮我把 <code>{'getUser'}</code> 改成异步函数」，两种 Agent 的反应天差地别：</p>
        <p>
          <strong>没有 system prompt：</strong>模型可能凭印象直接 write 一个它「想象中」的 <code>{'getUser'}</code>，覆盖掉原文件里你不知道的其它逻辑，改完也不验证，还顺手把周围代码重排了一遍。
        </p>
        <p>
          <strong>有了这份 prompt：</strong>它会先 grep 找到 <code>{'getUser'}</code> 的定义、read 看清上下文，用 edit 精确替换那几行，再用 bash 跑一下测试确认没破坏什么，最后用一句中文告诉你改了哪个文件。
        </p>
        <p>
          差别不在模型能力，而在于规矩。<strong>system prompt 就是用自然语言给 Agent 编程</strong>——你写下的每一条纪律，都会变成它的默认行为。
        </p>
      </Example>

      <Callout variant="warn" title="别把它写成说明书">
        system prompt 每一轮都会被完整送进窗口，越长越烧 token，而且过多的细节会稀释重点——模型在一堆话里反而抓不住最关键的那几条纪律。给关键行为约束就够了，不要把每个工具的用法、每种边角情况都写进来。那些应该交给工具定义和后面的项目记忆。
      </Callout>

      <Callout variant="note" title="下一章预告">
        基础 system prompt 立的是「通用」规矩。但每个项目都有自己的脾气：用什么包管理器、测试怎么跑、代码风格如何。下一章我们把项目级的 <code>AGENTS.md</code> 注入进来，让 forge 记住「这个项目」的特殊约定，真正做到「入乡随俗」。
      </Callout>

      <Summary
        points={[
          '一次请求的上下文由 system prompt、tools、messages、tool results 四块构成，共享同一个 token 窗口；system prompt 是其中最稳定、最该精心设计的一块。',
          '一份好的 system prompt 要交代四件事：身份、工具使用纪律、输出风格、安全与边界约束。',
          'forge 的基础 prompt 用「先看后改、edit/write 分工、自行验证纠错、不做多余改动」四条纪律，给 Agent 立行为基线。',
          '模型不知道当前日期、目录和平台，要靠 buildSystemPrompt 在启动时把运行环境拼到 prompt 后面，否则它会瞎猜。',
          'system prompt 是用自然语言给 Agent 编程；要给关键纪律而非长篇说明书，越长越烧 token 且稀释重点。',
          '下一章把项目级 AGENTS.md 注入进来，让 forge 记住具体项目的特殊约定。',
        ]}
      />
    </article>
  )
}
