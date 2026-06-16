import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const auditTs = `import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// 审计日志：把每一次工具调用、权限裁定、确认结果，以结构化 JSONL 追加到 .forge/audit-*.jsonl。
// 事后可回放、可排查、可信任——这是 Agent 能上生产的前提之一。

export interface AuditEntry {
  ts: string
  type: 'tool_call' | 'permission' | 'confirm' | 'llm_round'
  [key: string]: unknown
}

export interface AuditLog {
  log(entry: Omit<AuditEntry, 'ts'>): void
}

// 写文件的审计实现。落在 <cwd>/.forge/ 下，按会话 id 分文件。
export class FileAuditLog implements AuditLog {
  private file: string

  constructor(cwd: string, sessionId: string) {
    const dir = join(cwd, '.forge')
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, \`audit-\${sessionId}.jsonl\`)
  }

  log(entry: Omit<AuditEntry, 'ts'>): void {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\\n'
    try {
      appendFileSync(this.file, line, 'utf8')
    } catch {
      // 审计失败不应影响主流程，静默忽略。
    }
  }
}

// 一个什么都不做的审计实现，用于测试或关闭审计时。
export const noopAudit: AuditLog = { log() {} }`

const agentHook = `// 每轮 LLM 往返后
this.audit.log({ type: 'llm_round', model: this.provider.model, stopReason: res.stopReason, usage: res.usage })

// 权限裁定时
this.audit.log({ type: 'permission', tool: tool.name, input: call.input, decision: verdict.decision, reason: verdict.reason })

// 确认结果
this.audit.log({ type: 'confirm', tool: tool.name, reason: verdict.reason, approved })

// 工具执行后
this.audit.log({ type: 'tool_call', tool: call.name, input: call.input, isError: !!r.isError })`

const indexTs = `const sessionId = new Date().toISOString().replace(/[:.]/g, '-')
const audit = new FileAuditLog(process.cwd(), sessionId)
const agent = new Agent({
  provider,
  tools: ALL_TOOLS,
  system: SYSTEM_PROMPT,
  cwd: process.cwd(),
  audit,
})`

const sampleJsonl = `{"ts":"2026-06-16T09:12:03.118Z","type":"llm_round","model":"claude-opus-4-8","stopReason":"tool_use","usage":{"inputTokens":1842,"outputTokens":156}}
{"ts":"2026-06-16T09:12:03.402Z","type":"permission","tool":"edit","input":{"path":"src/server.ts","old":"port = 3000","new":"port = 8080"},"decision":"ask","reason":"写入工作区文件需确认"}
{"ts":"2026-06-16T09:12:07.951Z","type":"confirm","tool":"edit","reason":"写入工作区文件需确认","approved":true}
{"ts":"2026-06-16T09:12:08.063Z","type":"tool_call","tool":"edit","input":{"path":"src/server.ts","old":"port = 3000","new":"port = 8080"},"isError":false}`

const structuredVsTextSrc = `// 两种记日志的方式，事后能不能查，天差地别。

// ✗ 非结构化（拼成一句人话）：好读，但机器没法筛、没法统计。
console.log(\`[\${new Date().toISOString()}] 执行了 edit src/server.ts，用户已确认\`)
//  事后想问「哪些 edit 被拒了」？只能正则去抠这行字符串，脆且不准。

// ✓ 结构化（字段化的对象）：好查、可聚合、可机读。
audit.log({ type: 'tool_call', tool: 'edit', input: { path: 'src/server.ts' }, isError: false })
//  事后 jq 一句就能筛 type=tool_call 且 isError=true 的全部记录。

// 原则：日志是写给「未来的查询」看的，不是写给「此刻的眼睛」看的。
// 先结构化存字段，要给人看时再渲染成人话——反过来就回不去了。`

const replaySrc = `import { readFileSync } from 'node:fs'

// 回放：把一次会话的审计日志逐行读出来，重建「发生过什么」的时间线。
// 注意——回放的是「决策与事件」，不是「重新执行」。审计不是录像带，是飞行记录。
export function replay(file: string): void {
  const lines = readFileSync(file, 'utf8').split('\\n').filter(Boolean)
  for (const line of lines) {
    const e = JSON.parse(line)
    switch (e.type) {
      case 'llm_round':
        console.log(\`\${e.ts}  🧠 模型决定（\${e.model}，\${e.usage?.outputTokens ?? 0} tok）\`)
        break
      case 'permission':
        console.log(\`\${e.ts}  🔒 裁定 \${e.tool} → \${e.decision}：\${e.reason}\`)
        break
      case 'confirm':
        console.log(\`\${e.ts}  🙋 用户\${e.approved ? '同意' : '拒绝'}了 \${e.tool}\`)
        break
      case 'tool_call':
        console.log(\`\${e.ts}  ⚙ 执行 \${e.tool}\${e.isError ? '（失败）' : ''}\`)
        break
    }
  }
}`

const traceSrc = `// 把审计事件升级成「分布式追踪」里的 span，就能接进 OpenTelemetry 之类的可观测体系。
// 关键是给每条记录补两个字段：traceId（整次会话）和 spanId（单步操作）+ 父子关系。
interface TracedEntry extends AuditEntry {
  traceId: string      // 一次会话 = 一条 trace
  spanId: string       // 一步操作 = 一个 span
  parentSpanId?: string // 谁触发了我（llm_round → permission → tool_call 形成树）
  durationMs?: number  // 这步耗时，用来画火焰图、找瓶颈
}

// 有了 trace/span，一次会话就能在 Jaeger / Tempo 里画成一棵调用树：
//   llm_round (1.2s)
//   └─ permission edit (0.3ms)
//      └─ confirm edit (4.5s ← 用户在这儿想了半天)
//         └─ tool_call edit (12ms)
// 一眼看出时间花在哪、哪步出错、模型绕了几个来回。`

export default function Ch3() {
  return (
    <article>
      <Lead>
        权限能拦、确认能问，可一旦放手让它干，事后你还是想知道：它到底调了什么工具、传了什么参数、谁批准的、模型为什么这么决定。这一章，我们把 Agent 的每一步都写成结构化日志，落到磁盘——给 forge 装上黑匣子。
      </Lead>

      <h2>一、为什么要审计</h2>
      <p>
        Agent 和普通程序最大的不同，是它会<strong>自己动手</strong>：自己决定调哪个工具、自己拼参数、自己改文件跑命令。一切顺利时你不会在意，可一旦出了岔子——文件被改错、命令删了不该删的东西、模型莫名其妙绕了一大圈——你需要能<strong>复盘</strong>。
      </p>
      <p>复盘要回答的，无非是这几个问题：</p>
      <ul>
        <li>它<strong>调了哪些工具</strong>、按什么顺序？</li>
        <li>每次工具的<strong>参数</strong>到底是什么？（光看结果往往看不出问题，参数才是真相）</li>
        <li>哪一步触发了确认、<strong>是谁批准</strong>的？</li>
        <li>模型为什么这么决定？每轮往返的 <code>stopReason</code> 和 token 消耗是多少？</li>
      </ul>
      <p>
        靠 stdout 滚屏是答不了这些问题的——屏幕会清，日志会丢，事后也没法按字段筛。我们需要把这些信息<strong>结构化</strong>地、<strong>持久</strong>地存下来。
      </p>

      <KeyIdea title="审计日志 = Agent 的黑匣子">
        飞机的黑匣子不参与飞行，但出事后能还原每一个动作。审计日志对 Agent 是同样的角色：它不影响主流程，却记录下「模型决定 → 权限裁定 → 确认 → 执行」的完整链路，让每一步都可回放、可排查、可追责。
      </KeyIdea>

      <h2>二、为什么选 JSONL</h2>
      <p>
        我们选 JSONL（JSON Lines，每行一个独立 JSON 对象）作为格式，而不是一个大 JSON 数组，也不是纯文本。理由很实在：
      </p>
      <ul>
        <li><strong>可追加</strong>：每条记录就是一行，直接 append 到文件末尾，不用把整个文件读出来再写回去——这对一个会跑很久、产生很多条记录的会话至关重要。</li>
        <li><strong>可逐行处理</strong>：<code>grep</code> 一行、<code>jq</code> 一行，工具天然按行流式处理，几 GB 的日志也不用整块加载进内存。</li>
        <li><strong>易解析</strong>：每行 <code>JSON.parse</code> 一下就是结构化对象，崩溃中断也不会让整个文件变成废 JSON（数组格式少个 <code>]</code> 就全废了）。</li>
      </ul>

      <Callout variant="tip" title="JSONL 的日常用法">
        想看这次会话调了几次 edit？<code>{'grep \'"tool_call"\' .forge/audit-*.jsonl | grep edit | wc -l'}</code>。想统计 token 总消耗？<code>{'jq -s \'map(.usage.outputTokens // 0) | add\' .forge/audit-*.jsonl'}</code>。结构化 + 逐行，命令行就是你的分析器。
      </Callout>

      <h2>三、审计模块实现</h2>
      <p>新建 <code>src/audit.ts</code>。它定义审计的数据结构、接口，以及两个实现：</p>

      <CodeBlock lang="ts" title="src/audit.ts" code={auditTs} />

      <p>逐段拆开看：</p>
      <ul>
        <li>
          <strong><code>AuditEntry</code></strong>：每条记录都有 <code>ts</code>（时间戳）和 <code>type</code>（四类之一：<code>tool_call</code> 工具执行、<code>permission</code> 权限裁定、<code>confirm</code> 确认结果、<code>llm_round</code> 一轮 LLM 往返）。后面那个<strong>索引签名</strong> <code>{'[key: string]: unknown'}</code> 是关键——它允许每一类事件携带自己特有的字段（权限事件带 <code>decision</code>，往返事件带 <code>usage</code>），不必为四种类型各写一个死板的接口。
        </li>
        <li>
          <strong><code>AuditLog</code> 接口</strong>：只有一个 <code>log()</code> 方法。面向接口而非具体类，意味着主流程不关心日志落在哪——可以是文件、可以是数据库、测试时可以是空实现。这正是依赖倒置的好处。
        </li>
        <li>
          <strong><code>FileAuditLog</code> 构造函数</strong>：在 <code>{'<cwd>/.forge'}</code> 下建目录（<code>{'{ recursive: true }'}</code> 保证已存在也不报错），并按 <code>sessionId</code> 拼出独立文件名。<strong>每个会话一个文件</strong>，互不干扰，回放时一目了然。
        </li>
        <li>
          <strong><code>log()</code></strong>：把 <code>ts</code> 自动补在最前面，序列化成一行再加换行符，用 <code>appendFileSync</code> 追加。注意那个 <code>try/catch</code>——<strong>审计失败必须静默</strong>。磁盘满了、权限不够，都不能让记日志这件事把 Agent 主流程拖垮。黑匣子坏了，飞机还得能飞。
        </li>
        <li>
          <strong><code>noopAudit</code></strong>：一个什么都不做的实现。单元测试里不想产生真实文件、或用户显式关闭审计时，注入它即可，主流程代码一行都不用改。
        </li>
      </ul>

      <h2>四、在主循环里埋点</h2>
      <p>
        审计模块只是个能写日志的容器，真正有价值的是<strong>在对的地方记对的事</strong>。回到上一卷的 <code>Agent</code> 主循环，在四个关键节点各埋一行：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（审计埋点）" code={agentHook} />

      <p>
        这四个点不是随便挑的，它们正好串起一次操作的完整生命周期：<strong>模型决定</strong>（llm_round 记下模型、停止原因、token）→ <strong>权限裁定</strong>（permission 记下裁定结果和理由）→ <strong>（可能的）确认</strong>（confirm 记下用户批没批）→ <strong>执行</strong>（tool_call 记下实际跑了什么、成没成功）。
      </p>
      <p>
        把同一会话的这几行按时间读出来，你就能完整还原：模型想干什么、系统准不准、人同不同意、最后干成没干成。
      </p>

      <h2>五、在入口接上审计</h2>
      <p>最后，在 <code>src/index.ts</code> 创建审计实例并注入 <code>Agent</code>：</p>

      <CodeBlock lang="ts" title="src/index.ts（创建审计）" code={indexTs} />

      <p>
        <code>sessionId</code> 直接用当前时间的 ISO 字符串。但 ISO 字符串里有冒号和点（<code>2026-06-16T09:12:03.118Z</code>），冒号在不少文件系统里是非法字符，于是用 <code>{'replace(/[:.]/g, \'-\')'}</code> 把冒号和点统一换成连字符，得到 <code>2026-06-16T09-12-03-118Z</code> 这样既合法、又自然按时间排序的文件名。会话一启动，<code>.forge/audit-&lt;时间戳&gt;.jsonl</code> 就建好了。
      </p>

      <Example title="一段真实的审计日志">
        <p>跑一次「把端口从 3000 改成 8080」的任务，<code>.forge/audit-*.jsonl</code> 里会长出这样四行：</p>
        <CodeBlock lang="json" code={sampleJsonl} />
        <p>
          顺着读下来：模型决定调 edit（llm_round）→ 权限模块裁定为 <code>ask</code> 需要确认（permission）→ 用户点了同意（confirm，<code>approved:true</code>）→ edit 实际执行成功（tool_call，<code>isError:false</code>）。一次有人参与的安全改动，前因后果全在四行里。
        </p>
      </Example>

      <Callout variant="warn" title="审计日志别提交到 git">
        审计里塞满了敏感信息：绝对路径、执行过的命令、文件 diff 的具体内容，甚至可能间接带出密钥或内部结构。这些东西<strong>绝不能进版本库</strong>。好在 forge 在初始化时已经把 <code>.forge/</code> 写进了 <code>.gitignore</code>，默认就帮你拦住了——但接手别人项目时，记得确认这一行还在。
      </Callout>

      <Callout variant="note" title="这只是观测性的地基">
        现在我们只是把日志写下来了。有了这套<strong>结构化</strong>的事件流，卷 7「可观测性」会在它之上继续盖楼：基于 type 的调试开关（只看权限事件 / 只看工具调用）、按 <code>usage</code> 字段做成本统计、把 llm_round 串成耗时火焰图。地基打得越规整，上层越省力。
      </Callout>

      <h2>六、卷 3 小结</h2>
      <p>
        这一卷我们围绕一个主题：<strong>让一个会自己动手的 Agent 变得可信</strong>。三章下来，攒齐了三件套：
      </p>
      <ul>
        <li><strong>权限（deny）</strong>：危险操作直接拒，画出 Agent 绝不能越的红线。</li>
        <li><strong>确认（ask）</strong>：拿不准的操作停下来问人，把最终决定权交还给你。</li>
        <li><strong>审计（留痕）</strong>：每一步都写进黑匣子，事后能复盘、能追责。</li>
      </ul>
      <p>
        拦得住、问得对、查得清——这三层叠在一起，forge 才从一个「看起来挺能干但不敢用」的玩具，变成一个你<strong>敢放手</strong>让它改代码、跑命令的工具。
      </p>

      <KeyIdea title="可信，是放手的前提">
        权限负责「不该做的不做」，确认负责「拿不准的先问」，审计负责「做过的都留痕」。三者合一，把不可控的自动化变成可控的协作。信任不是凭感觉给的，是靠这套机制挣来的。
      </KeyIdea>

      <p>
        下一卷，我们换一个战场——<strong>上下文工程</strong>。当对话越来越长、工具结果越来越多，如何让模型在有限的上下文窗口里始终抓住重点，是决定 Agent 聪不聪明的另一半答案。
      </p>

      <Summary
        points={[
          '审计日志是 Agent 的黑匣子：记录「模型决定 → 权限裁定 → 确认 → 执行」全链路，不影响主流程却让每一步可回放、可排查。',
          '选 JSONL 格式：可追加、可 grep/jq 逐行处理、易解析，崩溃也不会让整个文件作废。',
          'src/audit.ts 用接口 AuditLog 解耦实现：FileAuditLog 按 sessionId 分文件落到 .forge/，log() 自动加 ts 并 try/catch 静默失败；noopAudit 供测试或关闭审计时注入。',
          '在主循环四个节点埋点：llm_round、permission、confirm、tool_call，串起一次操作的完整生命周期。',
          'sessionId 用 ISO 时间戳并把冒号点号换成连字符，得到合法且自然按时间排序的文件名。',
          '审计含敏感信息，.forge/ 已写进 .gitignore，绝不提交版本库。',
          '卷 3 收官：权限(deny) + 确认(ask) + 审计(留痕) 三件套让 forge 可被信任、敢放手；下一卷进入上下文工程。',
        ]}
      />
    </article>
  )
}
