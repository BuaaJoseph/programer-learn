import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const eventTypesCode = `export type AgentEvent =
  | { type: 'assistant_delta'; text: string } // 流式增量文本，一段段到达
  | { type: 'assistant_text'; text: string } // 一轮的完整文本（增量结束后）
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; output: string; isError: boolean }
  | { type: 'context_usage'; used: number; limit: number } // 本轮上下文 token 占用
  | { type: 'compacted'; before: number; after: number } // 自动压缩前后的消息条数`

const debugFlagCode = `const args = process.argv.slice(2)
const debug = args.includes('--debug') || args.includes('--verbose')`

const rendererCode = `case 'tool_start':
  process.stdout.write(\`\\n\${DIM}· \${e.name}(\${compact(e.input)})\${RESET}\\n\`)
  break
case 'tool_end':
  if (e.isError) process.stdout.write(\`\${RED}  ✗ \${truncate(e.output)}\${RESET}\\n\`)
  else if (debug) process.stdout.write(\`\${DIM}  ✓ \${truncate(e.output)}\${RESET}\\n\`)
  break
case 'context_usage':
  if (debug) process.stdout.write(\`\${DIM}[ctx \${(e.used / 1000).toFixed(1)}k/\${(e.limit / 1000).toFixed(0)}k]\${RESET}\\n\`)
  break`

const runDebugCmd = `forge --debug`

const debugOutput = `你: 把 src/config.ts 里的端口改成 8080

· read(file_path: "src/config.ts")
  ✓ export const config = { port: 3000, host: "localhost", … }（共 24 行）
· edit(file_path: "src/config.ts", old: "port: 3000", new: "port: 8080")
  ✓ 已替换 1 处，文件 src/config.ts 写入成功
[ctx 12.3k/1000k]
助手: 已把 src/config.ts 的 port 从 3000 改成 8080。`

const structuredLog = `// 一条结构化日志 = 一行 JSON（JSONL）。机器可解析，人也勉强能读。
function log(event: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    sid: SESSION_ID,        // 同一会话的所有日志能串起来
    ...event,
  })
  appendFileSync(AUDIT_FILE, line + '\\n')
}

// 用法：键值结构化，而不是拼一句话
log({ kind: 'tool_start', name: 'edit', input: { path: 'src/config.ts' } })
log({ kind: 'tool_end', name: 'edit', ok: true, ms: 12 })`

const spanCode = `// 一个 span = 一段有起止的工作单元，带 traceId 把同一轮串起来
async function withSpan<T>(name: string, attrs: object, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now()
  const spanId = randomUUID()
  log({ kind: 'span_start', span: name, spanId, traceId: TRACE_ID, ...attrs })
  try {
    const out = await fn()
    log({ kind: 'span_end', span: name, spanId, traceId: TRACE_ID, ms: Date.now() - t0, ok: true })
    return out
  } catch (err) {
    log({ kind: 'span_end', span: name, spanId, traceId: TRACE_ID, ms: Date.now() - t0, ok: false, err: String(err) })
    throw err
  }
}

// 工具执行包一层 span，每个工具自带耗时与成败
await withSpan('tool', { name: tool.name }, () => tool.execute(input, ctx))`

const otelGrep = `# 没有 OTel 也能排障：JSONL + jq 就是穷人版的可观测平台
# 找出本会话所有失败的工具调用
cat .forge/audit-*.jsonl | jq 'select(.kind=="tool_end" and .ok==false)'

# 看哪个工具最慢（按 span 耗时排序，取前 5）
cat .forge/audit-*.jsonl | jq 'select(.kind=="span_end") | {span, ms}' | jq -s 'sort_by(-.ms)[:5]'`

export default function Ch3() {
  return (
    <article>
      <Lead>
        Agent 自己跑很多轮、自己决定调哪些工具，一旦出错——改错了文件、陷入死循环、莫名其妙拒绝任务——你最想知道的就一句话：它内部到底在干嘛？排查不能靠猜。本章把 forge 的两条观测线串起来，重点讲调试开关怎么接进事件渲染器。
      </Lead>

      <h2>一、为什么要可观测性</h2>
      <p>
        传统脚本是线性的，错了看堆栈就行。Agent 不是：它一轮一轮地推理、调工具、读结果、再决定下一步，整个过程是「黑盒」。当结果不对时，光看最终输出无法定位——是模型理解错了任务？是工具入参传错了？还是上下文被压缩丢了关键信息？你需要把这条内部链路「打开看」。
      </p>
      <p>
        更深一层：Agent 的失败是<strong>非确定性</strong>的。同一句话今天能跑对、明天可能跑歪，复现一次故障本身就难。传统调试靠「打断点、单步走、复现」，在 Agent 上常常失灵——你没法让模型「重来时做一模一样的决定」。所以可观测性对 Agent 不是锦上添花，而是<strong>唯一可靠的排障手段</strong>：既然没法稳定复现，那就把每一次发生的事都<strong>原样记录下来</strong>，事后照着记录倒推。
      </p>
      <KeyIdea>
        可观测性 = 把 Agent 的内部活动变得「可见」。每一轮推理、每一次工具调用的输入输出、每一次上下文变化都能被看到，排错就不再靠猜，而是有据可查。
      </KeyIdea>

      <h2>二、两条互补的观测线</h2>
      <p>
        forge 提供两种能力，分工不同，互为补充：
      </p>
      <ul>
        <li>
          <strong>审计日志（卷 3 已做）</strong>：结构化 JSONL，写到 <code>.forge/audit-*.jsonl</code>，always-on（不需要任何开关，每次运行都落盘）。事后用 <code>jq</code>/<code>grep</code> 慢慢复盘。适合「事后追责、回放、跑批对比」。
        </li>
        <li>
          <strong>调试开关（本章）</strong>：<code>--debug</code> / <code>--verbose</code>，实时把内部往返打到终端——每轮 token、每个工具的输入输出。适合「当场盯着它在干嘛」。
        </li>
      </ul>
      <Callout variant="tip">
        一句话记住分工：审计日志是<strong>落盘复盘</strong>（事后、可检索、永久留底），debug 开关是<strong>实时观察</strong>（当场、临时、看完就过）。前者回答「上周那次它为啥删了文件」，后者回答「现在这次它正卡在哪」。
      </Callout>

      <h2>三、可观测性的三大支柱</h2>
      <p>
        业界把可观测性拆成三件东西，forge 这套小系统也能一一对应上，理解了对应关系，扩展方向就清楚了：
      </p>
      <table>
        <thead>
          <tr><th>支柱</th><th>回答什么</th><th>forge 里的对应</th></tr>
        </thead>
        <tbody>
          <tr><td>日志 Logs</td><td>「发生了什么事」</td><td>审计 JSONL（每条工具调用/事件）</td></tr>
          <tr><td>指标 Metrics</td><td>「整体有多少/多快/多贵」</td><td>卷 7-2 的 /cost（token、延迟、花费）</td></tr>
          <tr><td>追踪 Traces</td><td>「一次请求内各步怎么串、各花多久」</td><td>span（下面会加）</td></tr>
        </tbody>
      </table>
      <p>
        三者是不同的「视角」而非「数据」：底层数据源都是那条事件流，只是聚合粒度和呈现方式不同。这也解释了为什么
        可观测性不用「新加埋点」——埋点早就有了，缺的只是把同一份数据按这三个视角组织出来。
      </p>

      <h2>四、数据源早就有了：事件流</h2>
      <p>
        好消息是：forge 的内部活动早在卷 2/卷 4 就通过 Agent 的 <code>onEvent</code> 事件流暴露出来了。可观测性本质不是「新加埋点」，而是「订阅这些已有事件、按需展示」。先看事件类型的定义：
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（事件类型）" code={eventTypesCode} />
      <p>
        这套事件流就是「可观测性的数据源」。平时我们只展示其中必要的部分（流式文本、工具名、错误）；debug 时把更多细节也打出来（成功的工具输出、每轮上下文占用）。数据一直在流，区别只在「展示多少」。
      </p>
      <Callout variant="note">
        <strong>为什么用「事件流 + 订阅者」而不是到处 <code>console.log</code>？</strong>因为这是关注点分离：Agent 只管<strong>发生了什么事就抛事件</strong>，至于这些事件是打到终端、写进 JSONL、还是发去远程 OTel，全由订阅者决定。
        一个数据源、多个消费者——这正是同一份事件能同时喂给「实时渲染器」和「审计日志」的根本原因，也是后面接 OpenTelemetry 时只需再加一个订阅者、不动 Agent 一行代码的底气。
      </Callout>

      <h2>五、解析开关并按 debug 渲染</h2>
      <p>
        第一步，从命令行参数里解析出 debug 标志——<code>--debug</code> 和 <code>--verbose</code> 等价：
      </p>
      <CodeBlock lang="ts" title="src/index.ts（--debug 开关）" code={debugFlagCode} />
      <p>
        第二步，在事件渲染器里用这个标志控制分支。注意这几个 <code>case</code> 怎么分层：
      </p>
      <CodeBlock lang="ts" title="src/index.ts（渲染器 debug 分支）" code={rendererCode} />
      <p>
        默认情况下只显示两件事：工具调用名（<code>tool_start</code>，让你知道它在调什么）和错误（<code>tool_end</code> 且 <code>{'isError'}</code> 为真，错误任何时候都要看见）。开了 <code>--debug</code> 才额外打印每个工具的成功输出（<code>tool_end</code> 的 ✓ 分支）和每轮上下文占用（<code>context_usage</code>）。
      </p>
      <KeyIdea>
        开关只控制「展示多少」，绝不改变 Agent 的行为。开不开 <code>--debug</code>，Agent 跑的轮数、调的工具、给出的结果完全一致——它只是决定终端上你能看到多少细节。这条边界一旦破坏，debug 就不再是「观察」而是「干扰」。
      </KeyIdea>

      <Example title="开 --debug 跑一次">
        <p>带上开关启动：</p>
        <CodeBlock lang="bash" code={runDebugCmd} />
        <p>同样一个改配置的任务，输出会啰嗦很多，但信息全：</p>
        <CodeBlock lang="text" code={debugOutput} />
        <p>
          对比平时：平时你只会看到 <code>· read(...)</code>、<code>· edit(...)</code> 两行工具名和最终回答；开了 debug，每个工具读到/写了什么（✓ 那行）、当前上下文吃了多少 token（<code>[ctx 12.3k/1000k]</code>）都摆在眼前。卡住、改错文件时，一眼就能看出是哪一步偏了。
        </p>
      </Example>

      <h2>六、结构化日志：别拼字符串，写键值</h2>
      <p>
        debug 输出是给人看的，可一旦要<strong>检索、聚合、跑批对比</strong>，人类可读的句子就成了灾难——你没法对
        「已替换 1 处，文件 src/config.ts 写入成功」这种自由文本做可靠的 <code>grep</code>。所以落盘的审计日志走的是另一条路：
        <strong>结构化日志</strong>，一行一条 JSON（JSONL 格式），每个维度是一个字段：
      </p>
      <CodeBlock lang="ts" title="src/audit.ts（结构化日志）" code={structuredLog} />
      <p>关键设计点：</p>
      <ul>
        <li><strong>一行一条 JSON</strong>：JSONL 既能 <code>jq</code> 逐行解析，又能 <code>grep</code> 粗筛，还能直接喂进日志系统，兼顾机器与人。</li>
        <li><strong>带 <code>sid</code>（会话 id）</strong>：同一会话的所有日志靠它串起来——这是事后能「把一次完整对话拼回来」的钥匙。</li>
        <li><strong>键值而非句子</strong>：<code>{'{ name: "edit", ok: true, ms: 12 }'}</code> 比「edit 成功耗时 12ms」强一万倍，因为你能精确按 <code>name</code>、按 <code>ok</code>、按 <code>ms</code> 过滤和聚合。</li>
      </ul>
      <Callout variant="warn">
        <strong>常见误区</strong>：把可读的 debug 输出和结构化审计日志混为一谈，结果两头不讨好——终端刷屏看不清，日志又没法解析。
        正确分工是：<strong>终端给人看（带颜色、截断、按需）</strong>，<strong>JSONL 给机器看（全量、结构化、always-on）</strong>。
        它们消费同一份事件流，但格式和受众完全不同。
      </Callout>

      <h2>七、追踪 span：一次请求里各步花了多久</h2>
      <p>
        日志告诉你「发生了什么」，但当一轮里串了好几个工具、还套着模型调用时，你想知道的是<strong>这次请求的「时间轴」</strong>：
        哪一步最慢、谁套着谁、总共耗在哪。这就是<strong>追踪（trace）</strong>要解决的——把一段有起止的工作包成一个
        <strong>span</strong>，带上 <code>traceId</code> 把同一轮的所有 span 串成一棵调用树：
      </p>
      <CodeBlock lang="ts" title="src/audit.ts（span 包裹）" code={spanCode} />
      <p>
        <code>withSpan</code> 把任意一段异步工作包起来：进去记 <code>span_start</code>，出来记 <code>span_end</code> 带上耗时和成败，
        异常也记下来再抛。<code>traceId</code> 把同一轮的 model span、各个 tool span 关联起来，事后就能还原「这一轮 3.2 秒，
        其中模型推理 2.1 秒、edit 工具 12ms、read 工具 8ms」这样的火焰图。<strong>这是定位「慢在哪」唯一靠谱的办法</strong>——
        没有 span，你只知道「这轮很慢」，有了 span，你知道「慢在模型还是慢在某个工具」。
      </p>

      <h3>OpenTelemetry：要不要上「正规军」</h3>
      <p>
        上面的 span 是「手搓的穷人版追踪」。生产环境里有现成的行业标准——<strong>OpenTelemetry（OTel）</strong>：
        统一的 trace/span/metrics 数据模型，配套一堆后端（Jaeger、Tempo、Honeycomb 等）做存储和可视化。要接它，
        靠的还是第四节那个「事件流多订阅者」的设计：<strong>再加一个把 AgentEvent 翻译成 OTel span 的订阅者即可</strong>，
        Agent 本体一行不动。
      </p>
      <table>
        <thead>
          <tr><th>场景</th><th>建议</th></tr>
        </thead>
        <tbody>
          <tr><td>本地 CLI、单人用</td><td>JSONL + jq 足够，别上 OTel（依赖重、收益小）</td></tr>
          <tr><td>多实例、跑在服务端、要看大盘</td><td>接 OTel，导出到统一后端做检索告警</td></tr>
          <tr><td>要和现有微服务链路打通</td><td>必上 OTel，traceId 才能跨服务串联</td></tr>
        </tbody>
      </table>
      <p>没有 OTel 时，<code>jq</code> 就是穷人版的可观测平台，照样能排障：</p>
      <CodeBlock lang="bash" title="用 jq 排障" code={otelGrep} />

      <h2>八、生产排障：从一条线索到根因</h2>
      <p>把上面的工具串成一套实战排障流程，遇到「forge 又抽风了」时照着走：</p>
      <ol>
        <li><strong>定位会话</strong>：用 <code>sid</code> 把那次出问题的会话日志全捞出来，先看时间轴。</li>
        <li><strong>找异常点</strong>：<code>jq 'select(.ok==false)'</code> 直接挑出所有失败的工具/span，错误几乎都在这。</li>
        <li><strong>看输入输出</strong>：盯着出错那步的 <code>input</code>——是模型给的参数就错了（prompt/工具描述问题），还是参数对但工具自己挂了（工具 bug）。</li>
        <li><strong>查上下文</strong>：看出错前有没有 <code>compacted</code> 事件——很多「Agent 突然忘事」其实是压缩把关键信息裁掉了。</li>
        <li><strong>对比正常 trace</strong>：把出错那轮的 span 树和一次正常的对比，多出/缺失的步骤往往就是根因。</li>
      </ol>

      <h2>九、可观测性底座</h2>
      <Callout variant="note">
        审计日志（落盘、事后回放）+ debug 开关（实时、当场观察）+ 卷 7-2 的 <code>/cost</code>（成本仪表盘），三者合起来构成 forge 的可观测性底座：看得见行为、看得见花费、留得下记录。生产环境里还可以把审计 JSONL 接入日志系统（如 ELK / Loki），做集中检索、聚合统计和异常告警，把单机调试升级成全链路监控。
      </Callout>
      <Callout variant="warn">
        debug 输出可能包含敏感内容——读到的文件内容、执行的命令、甚至密钥片段都会原样打到终端。别在共享终端、结对屏幕或录屏演示时开着 <code>--debug</code>，排查完随手关掉。同样，结构化日志落盘的 <code>input</code>/<code>output</code> 字段也含敏感数据，生产环境接入日志系统前应做<strong>脱敏</strong>（掩码路径、剔除疑似密钥），否则可观测性反倒成了泄密通道。
      </Callout>

      <h2>十、衔接下一章</h2>
      <p>
        现在你能「看见」Agent 的行为了。但看见只是第一步——改了代码、换了模型、调了 prompt 之后，怎么<strong>保证行为不退化</strong>？光靠每次手动开 debug 盯着看，既累又不可靠。
      </p>
      <KeyIdea>
        可观测让你「看见」行为，自动化测试让你「锁住」行为。下一章给 forge 的 Agent 写自动化测试，把「它该怎么表现」固化成可重复运行的断言，每次改动都自动验证不退化。
      </KeyIdea>

      <Summary
        points={[
          '可观测性 = 把 Agent 内部活动变可见，排错靠数据不靠猜——尤其因为 Agent 失败是非确定性的、难复现，记录是唯一可靠手段。',
          '两条观测线互补：审计日志落盘复盘（always-on），debug 开关实时观察（按需开）。',
          '三大支柱：日志(发生了什么)/指标(整体多少多快多贵=/cost)/追踪(一次请求内各步耗时)，同源事件流的不同视角。',
          '数据源是已有的 onEvent 事件流；一个数据源多个订阅者，所以同一事件能同时喂渲染器、JSONL、未来的 OTel。',
          '--debug/--verbose 只控制展示多少：默认显示工具名与错误，debug 额外显示成功输出与上下文占用，绝不改变 Agent 行为。',
          '结构化日志写键值 JSONL（带 sid 串起会话），机器可检索；终端给人看、JSONL 给机器看，别混。',
          'span 把有起止的工作包起来、用 traceId 串成调用树，是定位「慢在哪」的唯一靠谱办法；规模大了再接 OpenTelemetry。',
          'debug 输出与落盘日志都含敏感内容，共享/录屏别开 debug，接日志系统前要脱敏。',
        ]}
      />
    </article>
  )
}
