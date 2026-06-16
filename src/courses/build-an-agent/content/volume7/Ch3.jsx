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

      <h2>三、数据源早就有了：事件流</h2>
      <p>
        好消息是：forge 的内部活动早在卷 2/卷 4 就通过 Agent 的 <code>onEvent</code> 事件流暴露出来了。可观测性本质不是「新加埋点」，而是「订阅这些已有事件、按需展示」。先看事件类型的定义：
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（事件类型）" code={eventTypesCode} />
      <p>
        这套事件流就是「可观测性的数据源」。平时我们只展示其中必要的部分（流式文本、工具名、错误）；debug 时把更多细节也打出来（成功的工具输出、每轮上下文占用）。数据一直在流，区别只在「展示多少」。
      </p>

      <h2>四、解析开关并按 debug 渲染</h2>
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

      <h2>五、可观测性底座</h2>
      <Callout variant="note">
        审计日志（落盘、事后回放）+ debug 开关（实时、当场观察）+ 卷 7-2 的 <code>/cost</code>（成本仪表盘），三者合起来构成 forge 的可观测性底座：看得见行为、看得见花费、留得下记录。生产环境里还可以把审计 JSONL 接入日志系统（如 ELK / Loki），做集中检索、聚合统计和异常告警，把单机调试升级成全链路监控。
      </Callout>
      <Callout variant="warn">
        debug 输出可能包含敏感内容——读到的文件内容、执行的命令、甚至密钥片段都会原样打到终端。别在共享终端、结对屏幕或录屏演示时开着 <code>--debug</code>，排查完随手关掉。
      </Callout>

      <h2>六、衔接下一章</h2>
      <p>
        现在你能「看见」Agent 的行为了。但看见只是第一步——改了代码、换了模型、调了 prompt 之后，怎么<strong>保证行为不退化</strong>？光靠每次手动开 debug 盯着看，既累又不可靠。
      </p>
      <KeyIdea>
        可观测让你「看见」行为，自动化测试让你「锁住」行为。下一章给 forge 的 Agent 写自动化测试，把「它该怎么表现」固化成可重复运行的断言，每次改动都自动验证不退化。
      </KeyIdea>

      <Summary
        points={[
          '可观测性 = 把 Agent 内部活动变可见，排错靠数据不靠猜。',
          '两条观测线互补：审计日志落盘复盘（always-on），debug 开关实时观察（按需开）。',
          '数据源是已有的 onEvent 事件流；可观测就是订阅事件、按需展示。',
          '--debug/--verbose 只控制展示多少：默认显示工具名与错误，debug 额外显示成功输出与上下文占用，绝不改变 Agent 行为。',
          'debug 输出含敏感内容，共享/录屏场景别开着。',
          '审计日志 + debug 开关 + /cost 构成可观测性底座，下一章用自动化测试锁住行为。',
        ]}
      />
    </article>
  )
}
