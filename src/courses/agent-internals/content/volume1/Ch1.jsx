import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CapabilityMultiplier from '@/courses/agent-internals/illustrations/CapabilityMultiplier.jsx'

const chatVsAgentCode = `# 同一个模型，两种「身体」

# A. 聊天框里：你问，它答，仅此而已
你：帮我给这个 API 加上 OAuth
模型：可以，大致思路是这样……（贴出一段示例代码）
# —— 它看不到你的代码，跑不了测试，改不了文件，到此为止

# B. Claude Code 里：同一个模型，套了一层脚手架
模型 -> Grep('def login')           # 工具：先找到登录相关代码
模型 -> Read('auth/routes.py')      # 工具：把文件读进上下文
模型 -> Edit('auth/routes.py', ...) # 工具：真的改文件
模型 -> Bash('pytest tests/auth')   # 工具：跑测试验证
模型 -> Edit(...)                   # 测试失败，根据报错再改
模型 -> Bash('pytest tests/auth')   # 再验证，通过
模型：OAuth 已接好，测试全绿。      # 没有 tool_use 了，停下交回给你`

const leversCode = `脚手架(harness)的四大杠杆

1. 工具设计     给模型一双手：Read / Edit / Bash / Grep …
2. 上下文工程   决定每一轮往模型眼前喂什么、喂多少
3. 规划与验证   先列计划，再动手，做完跑测试自我纠错
4. 提示工程     system prompt 规定它的身份、边界与工作方式

  能力 = 模型  ×  (工具 · 上下文 · 验证 · 提示)
                \\________ 脚手架，是个乘法器 ________/`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          有一件事会让很多人吃惊：在聊天框里只会「给建议」的那个 Claude，和在 Claude Code 里能改一整天代码、
          把功能从零做到测试全绿的那个 Claude，<strong>是同一个模型</strong>。底层权重一模一样，没有谁更聪明。
          差距全部来自模型外面那层叫<em>脚手架</em>（harness）的东西。本章就把这层东西拆开给你看。
        </p>
      </Lead>

      <h2>一个等式：Agent = 模型 + 脚手架</h2>
      <p>
        我们平时说的「Agent」，并不是某个特别强的模型，而是一个组合：中间是一个普通的大语言模型（LLM），
        外面包了一圈代码——这圈代码 Anthropic 在工程博客里叫它 <em>harness</em>，中文一般译作「脚手架」。
        脚手架负责给模型一双手（工具）、给它一双眼睛（上下文）、给它一套工作流程（规划与验证），
        还给它定身份和规矩（提示）。
      </p>
      <p>
        换句话说：<strong>模型负责「想」，脚手架负责把「想」变成「能做的事」。</strong>
        一个再聪明的大脑，如果没有手、没有眼睛、不能动，也只能空想。脚手架就是给这个大脑接上身体。
        这也是为什么同一个模型在不同产品里表现天差地别——不是模型变了，是它的「身体」变了。
      </p>

      <Example title="同一个 Claude，给 API 加 OAuth">
        <p>
          假设你想给一个后端 API 加上 OAuth 登录。把同样一句话分别丢给聊天框和 Claude Code，
          你会看到两件完全不同的事情：
        </p>
        <CodeBlock lang="text" title="chat-vs-agent" code={chatVsAgentCode} />
        <p>
          聊天框里它只能<strong>说</strong>怎么做——因为它看不到你的代码库、不能读文件、不能跑测试、改不了任何东西。
          Claude Code 里它能<strong>做</strong>——因为脚手架给了它 <code>Read</code>、<code>Edit</code>、
          <code>Bash</code>、<code>Grep</code> 这些工具，还给了它「改完跑测试、失败就再改」这套循环。
          模型的智商没变一分，变的是它能伸手够到的东西。
        </p>
      </Example>

      <CapabilityMultiplier />

      <h2>脚手架的四大杠杆</h2>
      <p>
        Anthropic 在工程文章里把脚手架的发力点归纳为四类。把它们想成四根杠杆，每一根都能撬动同一个模型的实际能力：
      </p>
      <h3>1. 工具设计（给它手）</h3>
      <p>
        工具就是模型能调用的动作：读文件、改文件、执行命令、搜索代码。工具设计得好不好，直接决定模型能干多少活。
        一个描述清晰、参数合理、报错友好的工具，模型用起来又准又稳；一个含糊不清的工具，模型会反复试错、浪费回合。
        后面整整一卷都在讲工具怎么设计，这里先记住：<strong>有没有手、手好不好用，是第一道分水岭。</strong>
      </p>
      <h3>2. 上下文工程（给它眼睛）</h3>
      <p>
        模型每一轮能「看见」的，只有当前喂进上下文窗口的那些字。喂什么、喂多少、什么时候清理，
        是脚手架最核心的活儿。Anthropic 有一个很反直觉但被反复验证的观察：
        <strong>多 Agent 系统之所以有效，很大程度上是因为它们能花掉足够多的 token</strong>。
        在一个叫 <em>BrowseComp</em> 的评测里，token 用量大约能解释 80% 的性能方差——
        也就是说，「往模型眼前铺了多少信息、让它做了多少步」比模型本身的差异更能预测最终表现。
        （以上为 Anthropic engineering 文章给出的数据）
      </p>
      <h3>3. 规划与验证循环（给它工作流程）</h3>
      <p>
        强 Agent 不会一上来就乱改，而是先收集信息、列个计划，动手之后还会跑测试、读输出来验证对不对，错了再回头改。
        这套「行动—验证—纠错」的循环，是脚手架灌进去的纪律，不是模型自带的。下一章我们会把这个主循环整个走一遍。
      </p>
      <h3>4. 提示工程（给它身份和规矩）</h3>
      <p>
        system prompt 告诉模型「你是谁、你能碰什么、不能碰什么、按什么风格干活」。同一个模型，
        换一套 system prompt，行为可以截然不同。提示工程是四根杠杆里最轻、却往往最先被调的一根。
      </p>
      <CodeBlock lang="text" title="four-levers" code={leversCode} />

      <KeyIdea title="脚手架是乘法器，不是加法器">
        <p>
          这四根杠杆不是简单地「加」在模型上，而是<strong>乘</strong>上去。一个普通模型配上一套好脚手架，
          实际能力可以翻很多倍；反过来，把顶尖模型塞进一个糟糕的脚手架里，它一样寸步难行。
          所以当你的 Agent 表现不好，第一反应不该是「换个更强的模型」，而是问：
          它的工具够不够用？上下文喂对了吗？有没有验证环节？提示写清楚了吗？
        </p>
      </KeyIdea>

      <Callout variant="warn" title="不是模型更聪明，是脚手架更强">
        <p>
          很多人会把 Claude Code 的强大归功于「它背后一定是个更厉害的模型」。这往往是误判。
          公开资料反复指向同一个结论：聊天框和编程工具用的常常是同一档模型，拉开差距的是外面那层脚手架。
          这件事对工程师是个好消息——因为脚手架是<strong>你能动手改的部分</strong>：你改不了模型权重，
          但你能设计工具、能组织上下文、能加验证循环。能力的增量，主要握在脚手架手里。
        </p>
      </Callout>

      <h2>这对做 Agent / 用 Agent 意味着什么</h2>
      <p>
        如果你在<strong>做</strong> Agent：把精力放在四根杠杆上，而不是一味追新模型。先把工具设计清楚、
        把上下文管好、把验证循环搭起来——这些带来的回报，往往比换模型更大、更可控。
      </p>
      <p>
        如果你在<strong>用</strong> Agent（比如天天用 Claude Code 或 Cursor）：理解了脚手架的存在，
        你就知道为什么「让它先看一眼相关文件再动手」「让它跑完测试再说完成」这类操作能显著提升效果——
        你其实是在帮脚手架把上下文喂对、把验证补上。会用 Agent 的人，本质上是懂得怎么配合那层脚手架的人。
      </p>

      <Practice title="给你常用的 Agent 做一次「三件套」体检">
        <p>
          挑一个你每天在用的 Agent（Claude Code、Cursor，或别的），用一页纸列出它的脚手架三件套：
        </p>
        <ul>
          <li><strong>工具</strong>：它能调用哪些动作？读文件、改文件、跑命令、联网搜索……分别叫什么？</li>
          <li><strong>记忆</strong>：它靠什么记住跨轮、跨会话的信息？是 CLAUDE.md、规则文件，还是别的机制？</li>
          <li><strong>验证</strong>：它做完一件事后，怎么确认做对了？跑测试、读输出、还是全靠你人工检查？</li>
        </ul>
        <p>
          列完之后，找出那个最弱的环节——通常它就是你这个 Agent 表现忽好忽坏的根源。
          这份清单也会成为后面几卷的对照表：每学一个主题，就回来看看自己的 Agent 在那一项上能不能补强。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent = 模型 + 脚手架（harness）：聊天框里只会给建议、Claude Code 里能改一整天代码，背后常是同一个模型，差距全在脚手架。',
          '脚手架四大杠杆：工具设计（给手）、上下文工程（给眼睛）、规划与验证循环（给流程）、提示工程（给身份和规矩）。',
          '上下文是核心：Anthropic 指出多 Agent 有效很大程度因为能花掉足够多 token，BrowseComp 评测里 token 用量约能解释 80% 性能方差。',
          '脚手架是乘法器不是加法器：好脚手架能把普通模型翻倍，烂脚手架能让顶尖模型寸步难行。',
          '能力增量主要握在脚手架手里——模型权重你改不了，但工具、上下文、验证、提示都是你能动手改的部分。',
          '表现不好先别急着换模型，先体检脚手架的「工具 / 记忆 / 验证」三件套，补最弱的那一环。',
        ]}
      />
    </>
  )
}
