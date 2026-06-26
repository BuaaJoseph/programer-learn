import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const mwSrc = `// middleware/tool-budget.ts —— 单个工具的超大返回值不准撑爆上下文
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const MAX_TOOL_OUTPUT_CHARS = 20_000   // 单次工具结果上限（对照 DeerFlow bash_output_max_chars）

export function toolBudgetMiddleware(): Middleware {
  return {
    name: 'tool-budget',
    async wrapTool(tu, next) {
      const out = await next()
      const text = out.content ?? ''
      if (text.length <= MAX_TOOL_OUTPUT_CHARS) return out

      // 1) 把完整结果落盘，换成一个可被 read_file 取回的引用
      const file = path.join(scratchDir(), \`tool-\${tu.id}.txt\`)
      try {
        await writeFile(file, text, 'utf8')
        return { content: preview(text) +
          \`\\n\\n[完整输出已存到 \${file}（共 \${text.length} 字符）。需要时用 read_file 取回片段。]\` }
      } catch {
        // 2) 磁盘不可用 → 退化为「头 + 尾」截断，保住关键信息
        return { content: headTail(text, MAX_TOOL_OUTPUT_CHARS) }
      }
    },
  }
}

function headTail(s: string, n: number): string {
  const half = Math.floor(n / 2)
  return s.slice(0, half) + \`\\n\\n…（省略 \${s.length - n} 字符）…\\n\\n\` + s.slice(-half)
}
function preview(s: string): string { return s.slice(0, 2_000) + '\\n…（预览）' }`

export default function Ch5() {
  return (
    <article>
      <Lead>
        第 4 卷做过「自动压缩」——那是把<strong>整段历史</strong>变短。但还有一种撑爆上下文的方式它管不了：<strong>单次工具调用</strong>就吐回
        十万行日志、一个几 MB 的文件、一段超长的 <code>grep</code> 结果。一条这样的 <code>tool_result</code> 就能把窗口塞满。
        DeerFlow 专门有个 <code>ToolOutputBudgetMiddleware</code> 处理这件事。这一章给 forge 补上「工具输出预算」。
      </Lead>

      <h2>一、两种「太长」要分开治</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>问题</th><th>谁负责</th><th>手段</th></tr></thead>
          <tbody>
            <tr><td>历史累计太长（很多轮攒出来的）</td><td>自动压缩（第 4 卷）</td><td>把早期历史总结成摘要</td></tr>
            <tr><td>单次工具返回太大（一下子塞爆）</td><td><strong>工具输出预算（本章）</strong></td><td>超限就落盘 + 给紧凑预览</td></tr>
          </tbody>
        </table>
      </div>
      <KeyIdea title="为什么压缩管不了它">
        压缩是在「调模型之前」对历史动手，但一条超大 <code>tool_result</code> 是在工具<strong>刚执行完、还没进历史</strong>时产生的。
        等它进了历史再压缩，一来可能已经超了单条上限、二来里面多半是噪声（满屏日志），压缩它纯属浪费。正确的拦截点是
        <code>wrapTool</code> 的<strong>出口</strong>——结果刚出来就上预算。
      </KeyIdea>

      <h2>二、超限就落盘 + 给预览</h2>
      <CodeBlock lang="ts" title="middleware/tool-budget.ts" code={mwSrc} />
      <p>策略和 DeerFlow 的 <code>ToolOutputBudgetMiddleware</code> 一模一样，两级降级：</p>
      <ol>
        <li><strong>首选落盘</strong>：把完整输出写到工作区文件，<code>tool_result</code> 里只放一段预览 + 文件引用。模型若真需要细节，
          可以自己 <code>read_file</code> 把相关片段取回来——<strong>把「要不要看全文」的决定权交还模型</strong>，而不是无脑塞给它。</li>
        <li><strong>磁盘不可用则截断</strong>：退化为「头 + 尾」保留（中间省略），因为一段输出的关键信息通常在开头（命令/报错）和结尾（结论/退出码）。</li>
      </ol>
      <Callout variant="note" title="阈值从配置来">
        DeerFlow 把上限做成可配（<code>bash_output_max_chars</code>、<code>read_file_output_max_chars</code> 等，各工具不同）。forge 同理：
        把 <code>MAX_TOOL_OUTPUT_CHARS</code> 挪进第 6 卷的配置系统，按工具名给不同上限（bash 取中段、read_file 取头部）。
      </Callout>

      <h2>三、它和子代理是绝配</h2>
      <p>
        第 5 卷的子代理（Task）是另一种「省上下文」的手段：把会读很多文件的脏活丢给子代理，只把<strong>摘要</strong>带回主线。
        工具输出预算则是更细一层的防线：即便在主线里，单个工具的超大返回也不会破窗。两者叠加，forge 才能跑那种「翻几百个文件」的大任务而不爆。
      </p>

      <Example title="一个具体场景">
        模型为了定位 bug 跑了 <code>grep -rn "TODO" .</code>，结果命中 8000 行。没有预算：这 8000 行直接进上下文，窗口瞬间见底，后面啥也干不了。
        有预算：8000 行落盘成 <code>tool-xxx.txt</code>，模型看到「共 8000 行，预览如下，需要时 read_file 取回」，于是它改用更精确的查询——
        <strong>反而被逼着学会了「先收窄再细看」的好习惯。</strong>
      </Example>

      <Summary
        points={[
          '自动压缩治「历史累计太长」，治不了「单次工具返回太大」——后者要在 wrapTool 出口拦截，对应 DeerFlow 的 ToolOutputBudgetMiddleware。',
          '策略两级降级：超限优先把完整输出落盘、tool_result 只留预览+文件引用（把看全文的决定权交还模型）；磁盘不可用则头+尾截断。',
          '阈值应按工具名可配（bash 取中段、read_file 取头部），挪进配置系统。',
          '工具输出预算 + 子代理摘要叠加，才能让 forge 跑「翻几百个文件」的大任务而不撑爆上下文。',
        ]}
      />
    </article>
  )
}
