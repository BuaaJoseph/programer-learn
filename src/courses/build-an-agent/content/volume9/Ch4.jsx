import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const loopSrc = `// middleware/loop-detection.ts —— 检测「同一个工具调用反复出现」的死循环
import { createHash } from 'node:crypto'

export function loopDetectionMiddleware(warnAt = 3, hardLimitAt = 5): Middleware {
  return {
    name: 'loop-detection',
    afterModel(c, res) {
      const calls = res.content.filter((b) => b.type === 'tool_use')
      const window = (c.scratch.toolHashes ??= [] as string[])
      for (const call of calls) {
        const h = createHash('sha1')
          .update(call.name + JSON.stringify(call.input)).digest('hex')
        window.push(h)
      }
      const last = window.at(-1)
      const repeats = window.slice(-hardLimitAt).filter((h) => h === last).length

      if (repeats >= hardLimitAt) {
        // 硬上限：直接剥掉这一轮的 tool_use，逼模型给出文本结论
        res.content = res.content.filter((b) => b.type !== 'tool_use')
        c.messages.push({ role: 'user', content: [{ type: 'text',
          text: '检测到重复调用同一工具且无进展，请停止重试并直接给出结论或换个思路。' }] })
      } else if (repeats >= warnAt) {
        // 软警告：注入一句提醒，但不打断
        c.messages.push({ role: 'user', content: [{ type: 'text',
          text: '提醒：你正在重复相同的工具调用，换个参数或思路。' }] })
      }
    },
  }
}`

const danglingSrc = `// middleware/dangling.ts —— 修复「有 tool_use 却没有对应 tool_result」的残缺历史
// 场景：用户上一轮 Ctrl-C 中断，历史里留下了没有结果的 tool_use → 直接发给模型会报错
export function danglingMiddleware(): Middleware {
  return {
    name: 'dangling-tool-call',
    beforeModel(c) {
      const pendingIds = new Set<string>()
      for (const m of c.messages) {
        for (const b of asBlocks(m.content)) {
          if (b.type === 'tool_use') pendingIds.add(b.id)
          if (b.type === 'tool_result') pendingIds.delete(b.tool_use_id)
        }
      }
      // 给每个悬空的 tool_use 补一条合成的 error 结果，修复消息顺序
      if (pendingIds.size) {
        c.messages.push({ role: 'user', content: [...pendingIds].map((id) => ({
          type: 'tool_result', tool_use_id: id, is_error: true,
          content: '上一次调用被中断，没有结果。',
        })) })
      }
    },
  }
}`

const errSrc = `// middleware/error-healing.ts —— 工具抛异常不该让整个 Agent 崩
export function errorHealingMiddleware(): Middleware {
  return {
    name: 'error-healing',
    async wrapTool(tu, next) {
      try {
        return await next()
      } catch (e) {
        // 把异常变成一条 is_error 的 tool_result，喂回模型让它自己纠正
        return { content: \`错误：\${(e as Error).message}\`, isError: true }
      }
    },
  }
}

// provider 层的重试退避：网络抖动/限流不该一次就放弃
export async function completeWithRetry(p: Provider, msgs, system, signal, max = 4) {
  for (let i = 0; ; i++) {
    try { return await p.complete(msgs, system, signal) }
    catch (e) {
      if (i >= max || !isTransient(e)) throw e
      const waitMs = retryAfter(e) ?? 2 ** i * 1000     // 解析 Retry-After，否则指数退避
      await sleep(waitMs)
    }
  }
}`

export default function Ch4() {
  return (
    <article>
      <Lead>
        能自己转圈、自己调工具的 Agent，也会自己<strong>卡死</strong>：同一个 grep 反复跑十遍、一个工具抛异常把整个进程带崩、
        上一轮 Ctrl-C 留下半截调用导致下一轮直接报错……这些都是「让 Agent 失控」的真实方式。DeerFlow 为此专门有一组安全中间件。
        这一章我们一次补齐四道护栏：<strong>循环检测、悬空调用修复、工具错误自愈、LLM 重试退避</strong>。
      </Lead>

      <h2>一、循环检测：别让它原地打转</h2>
      <p>
        <code>maxTurns</code>（第 1 卷）只能在「转够 N 圈」后兜底，太晚了。更聪明的做法是：对每个工具调用算个哈希，
        发现<strong>同一个调用在滑动窗口里反复出现</strong>就出手——先软提醒，不行再硬打断。
      </p>
      <CodeBlock lang="ts" title="middleware/loop-detection.ts" code={loopSrc} />
      <KeyIdea title="两道阈值（抄 DeerFlow）">
        DeerFlow 的 <code>LoopDetectionMiddleware</code> 就是两级：达 <code>warn</code> 阈值在下次调用前注入「别重复了」的提醒；
        达 <code>hard_limit</code> 直接<strong>剥掉 tool_use 逼模型产出最终文本</strong>。比单纯的步数上限聪明得多——它看的是「有没有进展」，
        而不是「转了几圈」。
      </KeyIdea>

      <h2>二、悬空 tool_use 修复</h2>
      <p>
        Anthropic/OpenAI 的消息协议有个硬规则：每个 <code>tool_use</code> 必须紧跟一个对应的 <code>tool_result</code>。
        但用户中途 Ctrl-C 时，历史里会留下「有调用、没结果」的悬空块——下一轮把这段历史发给模型会直接 400 报错。
      </p>
      <CodeBlock lang="ts" title="middleware/dangling.ts" code={danglingSrc} />
      <p>
        这对应 DeerFlow 的 <code>DanglingToolCallMiddleware</code>：在正确位置补一条合成的 error <code>tool_result</code>，修复消息顺序。
        它特意用 <code>beforeModel</code>（DeerFlow 用 <code>wrap_model_call</code>）以保证插入位置正确。
      </p>

      <h2>三、工具错误自愈 + LLM 重试退避</h2>
      <CodeBlock lang="ts" title="middleware/error-healing.ts" code={errSrc} />
      <ul>
        <li>
          <strong>工具错误不崩</strong>：工具 <code>execute</code> 抛异常时，<code>wrapTool</code> 把它转成 <code>is_error</code> 的
          <code>tool_result</code> 喂回模型——让模型「看到报错并自己换个做法」，而不是让整个 Agent 崩掉。对应 DeerFlow 的
          <code>ToolErrorHandlingMiddleware</code>。上一卷沙箱抛的 <code>EACCES</code>、本章悬空修复，全靠它兜住。
        </li>
        <li>
          <strong>LLM 调用重试</strong>：网络抖动、429 限流不该一次就放弃。<code>completeWithRetry</code> 解析 <code>Retry-After</code>、
          否则指数退避，最多重试几次——对应 DeerFlow 的 <code>LLMErrorHandlingMiddleware</code>。
        </li>
      </ul>

      <h2>四、顺序很关键</h2>
      <Callout variant="warn" title="为什么 safety 要排在 loop-detection 前面">
        回忆第 1 章定的装配顺序：<code>safetyMiddleware</code> 在 <code>loopDetectionMiddleware</code> 之前。原因是——如果模型因为某种安全策略
        被中途截断、留下半截 tool_use，应该<strong>先把这些半截调用剥掉</strong>，再做循环计数；否则这些「废调用」会被误计入循环、触发假的死循环警告。
        DeerFlow 在中间件装配注释里专门讲了这个顺序坑（after_model 逆序分发）。这就是为什么我们要把护栏拆成独立中间件——顺序能精确控制。
      </Callout>

      <Example title="四道护栏各管一段失控">
        循环检测管「原地打转」；悬空修复管「中断留下的残缺历史」；错误自愈管「工具炸了别带崩 Agent」；重试退避管「网络/限流抖动」。
        合起来，forge 才算从「能跑」变成「跑得久、跑不飞」。这正是从玩具到生产的分水岭。
      </Example>

      <Summary
        points={[
          'maxTurns 兜底太晚；loop-detection 对工具调用哈希做滑窗检测，两级阈值：软提醒 → 硬剥 tool_use 逼出文本（抄 DeerFlow LoopDetectionMiddleware）。',
          'danglingMiddleware 给「有 tool_use 没 tool_result」的悬空历史补合成 error 结果，修复协议顺序，避免 400（对应 DanglingToolCallMiddleware）。',
          '错误自愈：wrapTool 把工具异常转成 is_error 的 tool_result 喂回模型而非崩溃；completeWithRetry 解析 Retry-After/指数退避重试 LLM 调用。',
          'safety 必须排在 loop-detection 之前：先剥半截 tool_use 再做循环计数，否则误报——拆成独立中间件正是为了精确控制顺序。',
        ]}
      />
    </article>
  )
}
