import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const permissionsSrc = `import { resolve } from 'node:path'
import type { Tool } from './tools/types.js'

// 权限模型：每次工具调用执行前，先由权限策略裁定 allow / ask / deny。
// 设计原则：只读放行、写操作问一句、明确危险的直接拒绝（Deny > Ask > Allow）。

export type Decision = 'allow' | 'ask' | 'deny'

export interface PermissionResult {
  decision: Decision
  /** 给人看的理由 / 这次操作的摘要，用于确认提示与审计。 */
  reason: string
}

// 一眼就该拒绝的破坏性命令（宁可误伤，也不让 Agent 误删整台机器）。
const DESTRUCTIVE = [
  /\\brm\\s+-[a-z]*r[a-z]*f?\\b.*(\\/|~|\\*)/, // rm -rf / 之类
  /\\bmkfs\\b/,
  /\\bdd\\b.*\\bof=\\/dev\\//,
  /:\\(\\)\\s*\\{.*\\}\\s*;:/, // fork bomb
  /\\bshutdown\\b|\\breboot\\b/,
  />\\s*\\/dev\\/sd/,
]

export interface PermissionPolicy {
  decide(tool: Tool, input: Record<string, unknown>, cwd: string): PermissionResult
}

// 默认策略。后续「扩展性」卷会让它可由配置文件覆盖（按工具/参数加白名单等）。
export const defaultPolicy: PermissionPolicy = {
  decide(tool, input, cwd) {
    // 1) 只读工具：永远放行。
    if (tool.readOnly) return { decision: 'allow', reason: \`\${tool.name}（只读）\` }

    // 2) bash：按命令内容分级。
    if (tool.name === 'bash') {
      const cmd = String(input.command ?? '')
      if (DESTRUCTIVE.some((re) => re.test(cmd))) {
        return { decision: 'deny', reason: \`疑似破坏性命令，已拒绝：\${cmd}\` }
      }
      return { decision: 'ask', reason: \`执行命令：\${cmd}\` }
    }

    // 3) write / edit：写到 .git 或工作目录之外，直接拒绝；否则问一句。
    if (tool.name === 'write' || tool.name === 'edit') {
      const path = String(input.path ?? '')
      const abs = resolve(cwd, path)
      if (path.includes('.git/') || path.startsWith('.git')) {
        return { decision: 'deny', reason: \`拒绝写入 .git 目录：\${path}\` }
      }
      if (!abs.startsWith(resolve(cwd))) {
        return { decision: 'deny', reason: \`拒绝写到工作目录之外：\${path}\` }
      }
      return { decision: 'ask', reason: \`\${tool.name === 'write' ? '写入' : '修改'}文件：\${path}\` }
    }

    // 4) 其它写工具：保守起见，问一句。
    return { decision: 'ask', reason: \`执行 \${tool.name}\` }
  },
}`

const gateSrc = `// —— 安全闸门：执行前先过权限策略 ——
const verdict = this.policy.decide(tool, call.input, this.ctx.cwd)
this.audit.log({ type: 'permission', tool: tool.name, input: call.input, decision: verdict.decision, reason: verdict.reason })
if (verdict.decision === 'deny') {
  const msg = \`已被权限策略拒绝：\${verdict.reason}\`
  this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
  return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
}
if (verdict.decision === 'ask') {
  const approved = this.confirm ? await this.confirm({ tool: tool.name, input: call.input, reason: verdict.reason }) : false
  this.audit.log({ type: 'confirm', tool: tool.name, reason: verdict.reason, approved })
  if (!approved) {
    const msg = '用户拒绝了这次操作。'
    this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
    return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
  }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        <p>
          卷 1 里，模型说要调哪个工具，<code>execOne</code> 就老老实实去执行：要 <code>write</code> 就写、要 <code>bash</code> 就跑。
          这在你自己玩玩时没问题，可一旦这个 Agent 真能动你的文件、真能在你的机器上敲 shell，事情就严肃了——
          它可能误删一整个目录、把没提交的改动覆盖掉、甚至往 <code>.git</code> 里乱写把仓库搞坏。
          卷 3 要在「模型决定调用」和「真正执行」之间插进一道安全闸门。本章先把这道闸门的大脑——<strong>权限模型</strong>造出来。
        </p>
      </Lead>

      <h2>为什么需要权限</h2>
      <p>
        模型不是恶意的，但它会犯错，而且它对「这条命令有多危险」没有体感。你让它「清理一下临时文件」，
        它可能生成一句 <code>rm -rf</code> 带上一个被它算错的路径；你让它「把配置写到上一级目录」，
        它可能真的写到了工作区之外去。问题不在于模型聪不聪明，而在于<strong>它的每一次工具调用都有真实的、不可逆的副作用</strong>。
        删掉的文件不会自己回来，覆盖掉的代码找不回上一版。所以我们不能赌「模型这次不会出错」，
        必须在执行前加一道独立的、不依赖模型判断的闸门。
      </p>

      <KeyIdea title="Deny &gt; Ask &gt; Allow：优先级从严">
        <p>
          闸门的裁定不是「行/不行」两档，而是三档，并且优先级<strong>从严到宽</strong>：
          明确危险的操作<strong>直接拒绝（Deny）</strong>，连问都不问；会改动状态的写操作<strong>默认先问一句（Ask）</strong>，
          让人来拍板；纯只读的操作<strong>静默放行（Allow）</strong>，不打扰你。
          判定时永远先看会不会命中 Deny，再看要不要 Ask，最后才轮到 Allow——
          越危险的判断越靠前，宁可严一点，也不放过一次破坏。
        </p>
      </KeyIdea>

      <h2>三种裁定的语义</h2>
      <p>
        把这三档说清楚，后面的代码就是把它翻译成 TypeScript 而已：
      </p>
      <ul>
        <li>
          <strong>allow（放行）</strong>：闸门认为这次调用无害，<strong>静默执行</strong>，用户甚至不会注意到刚才裁定过。
          读文件、列目录、搜索这类只读操作都走这条路——它们不改变任何状态，没有问的必要。
        </li>
        <li>
          <strong>ask（询问）</strong>：闸门拿不准，把决定权交回给人。执行<strong>暂停</strong>，向用户弹一句确认
          （下一章细讲怎么问 y/N），用户点头才继续，摇头就当这次调用失败。写文件、改文件、跑普通 shell 命令都默认走这条。
        </li>
        <li>
          <strong>deny（拒绝）</strong>：闸门认定这次调用明显危险，<strong>根本不执行</strong>，连问都不问。
          但关键在于它<strong>怎么拒</strong>——不是抛个异常把进程炸了，而是把「为什么拒」当成工具的执行结果回灌给模型。
        </li>
      </ul>

      <Callout variant="note" title="deny 不是抛异常，而是给模型的反馈">
        <p>
          很容易把 deny 写成 <code>throw new Error(...)</code>，但那样模型什么都看不到，整轮对话也可能崩掉。
          正确的做法是：构造一个 <code>is_error</code> 为真的 <code>tool_result</code>，把拒绝的理由塞进 <code>content</code>，
          像一次「失败的工具调用」一样回灌给模型。这样模型就能在下一步看到「我那条 <code>rm -rf /</code> 被权限策略拒了，原因是疑似破坏性命令」，
          从而<strong>换一个更安全的做法</strong>——比如先列目录确认、或者改用更精确的路径。
          换句话说，这道闸门不只是拦人，它也是给模型的一条反馈通道：拒绝即提示。
        </p>
      </Callout>

      <h2>forge 真实的权限模块</h2>
      <p>
        下面是 forge 里 <code>src/permissions.ts</code> 的完整内容。它就是上面那套语义的落地：一个 <code>Decision</code> 类型、
        一个带理由的 <code>PermissionResult</code>、一份破坏性命令黑名单，外加一个默认策略 <code>defaultPolicy</code>。先整体看一遍，再逐段拆。
      </p>

      <CodeBlock lang="ts" title="src/permissions.ts" code={permissionsSrc} />

      <h3>PermissionResult 为什么带 reason</h3>
      <p>
        裁定结果不只是一个 <code>decision</code> 枚举，还附带一段 <code>reason</code> 文本。这段理由要被用两次：
        一是当裁定是 <code>ask</code> 时，它就是弹给用户看的那句确认提示——「执行命令：npm test，确认吗？」；
        二是不管裁定是什么，它都会被<strong>写进审计日志</strong>（本卷第三章），将来你能回查「那次到底拒了什么、为什么放行」。
        一个字段，同时服务于「当下问人」和「事后追责」两个场景，所以每条裁定都顺手把摘要拼好。
      </p>

      <h3>DESTRUCTIVE 黑名单各匹配什么</h3>
      <p>
        这是一组正则，专门盯那些一眼就该拒的破坏性 shell 命令。逐条看：
      </p>
      <ul>
        <li>
          <code>{'/\\brm\\s+-[a-z]*r[a-z]*f?\\b.*(\\/|~|\\*)/'}</code>：匹配带递归/强制标志、且作用在
          <code>/</code>、<code>~</code> 或 <code>*</code> 上的 <code>rm</code>，也就是 <code>rm -rf /</code> 这种能删半台机器的命令。
        </li>
        <li>
          <code>{'/\\bmkfs\\b/'}</code>：<code>mkfs</code> 是格式化文件系统，跑错盘等于一键清空。
        </li>
        <li>
          <code>{'/\\bdd\\b.*\\bof=\\/dev\\//'}</code>：<code>dd</code> 把数据直接写到 <code>/dev/</code> 下的设备节点，
          可以绕过文件系统直接糊掉整块硬盘。
        </li>
        <li>
          <code>{'/:\\(\\)\\s*\\{.*\\}\\s*;:/'}</code>：经典的 fork bomb <code>{':(){ :|:& };:'}</code>，会无限自我复制把系统拖垮。
        </li>
        <li>
          <code>{'/\\bshutdown\\b|\\breboot\\b/'}</code>：关机、重启——Agent 没理由动这些。
        </li>
        <li>
          <code>{'/>\\s*\\/dev\\/sd/'}</code>：把输出重定向写到 <code>/dev/sd</code> 开头的裸盘设备上，同样是绕过文件系统直写磁盘。
        </li>
      </ul>
      <p>
        这些 <code>\\b</code> 是单词边界、<code>\\s</code> 是空白、<code>\\/</code> 是转义的斜杠——别被它们吓到，
        本质就是「长得像这几种灾难命令」的模式匹配。
      </p>

      <h3>decide 的判定顺序</h3>
      <p>
        策略的核心是 <code>decide</code>，它严格按 <strong>Deny &gt; Ask &gt; Allow</strong> 的优先级一层层往下判：
      </p>
      <ul>
        <li>
          <strong>第一步，只读工具直接 allow。</strong>每个工具自带一个 <code>readOnly</code> 标记，读类工具（read、ls、grep）
          一律放行，连后面的逻辑都不用进——只读没有副作用，没什么可拦的。
        </li>
        <li>
          <strong>第二步，bash 按命令内容分级。</strong>取出 <code>input.command</code>，先拿它去匹配 <code>DESTRUCTIVE</code> 黑名单，
          命中就 <code>deny</code>；没命中也不放行，而是 <code>ask</code>——shell 能干的事太杂，默认都要人点头。
        </li>
        <li>
          <strong>第三步，write / edit 做越界检查。</strong>把相对路径用 <code>resolve(cwd, path)</code> 解析成绝对路径，
          然后两道红线：写 <code>.git</code> 目录直接 <code>deny</code>，写到工作目录之外直接 <code>deny</code>；都过了才 <code>ask</code>。
        </li>
        <li>
          <strong>第四步，其它写工具兜底 ask。</strong>将来新增的、不在上面三类里的写工具，保守起见一律先问一句，绝不默认放行。
        </li>
      </ul>

      <h3>为什么 .git 和工作目录之外要直接 deny</h3>
      <p>
        这两条不是「问一句」而是「直接拒」，因为它们几乎不可能是用户的真实意图，破坏性却很大。
        往 <code>.git</code> 里乱写可能损坏对象库、引用，把整个仓库的历史搞坏，这种损坏往往很隐蔽、事后极难修。
        而写到工作目录之外（用 <code>abs.startsWith(resolve(cwd))</code> 判断），意味着 Agent 正试图碰它本不该碰的地方——
        可能是模型把路径算错了，也可能是被诱导越权。无论哪种，都没有「问一下也许是对的」的余地，直接 <code>deny</code> 最安全。
      </p>

      <h2>把闸门接进主循环</h2>
      <p>
        策略造好了，接下来要把它<strong>插进执行路径</strong>。位置就在 <code>agent.ts</code> 的 <code>execOne</code> 里，
        在真正调用 <code>tool.run</code> 之前。下面这段就是那道闸门：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（execOne 的安全闸门）" code={gateSrc} />

      <p>
        第一行先让策略裁定，拿到 <code>verdict</code>，并立刻 <code>this.audit.log</code> 记一笔——不管最后执不执行，
        「裁定发生过」这件事先落到审计里。接着分两种拦截情况：
      </p>
      <ul>
        <li>
          <strong>deny</strong>：不执行，直接构造一个 <code>is_error: true</code> 的 <code>tool_result</code> 返回，
          把理由放进 <code>content</code>。模型下一步就能读到这条「失败」并调整做法（呼应前面那个 Callout）。
          同时 <code>onEvent</code> 抛一个 <code>tool_end</code> 事件，让终端把这次拒绝显示出来。
        </li>
        <li>
          <strong>ask</strong>：调用 <code>this.confirm</code> 向用户征求同意。如果用户拒绝（或压根没接 <code>confirm</code> 回调），
          同样返回一个 <code>is_error</code> 的结果，内容是「用户拒绝了这次操作」。点头了才会落到这段代码之后的真正执行。
        </li>
      </ul>
      <p>
        注意一个安全细节：<code>const approved = this.confirm ? await this.confirm(...) : false</code>。
        要是没装 <code>confirm</code> 回调，默认值是 <code>false</code> 而不是 <code>true</code>——
        <strong>缺省即拒绝</strong>，安全优先。绝不能因为「忘了接确认回调」就让需要确认的操作悄悄放行。
      </p>
      <Callout variant="note" title="confirm 与 audit 的细节在后两章">
        <p>
          这里出现的 <code>this.confirm</code> 和 <code>this.audit</code> 本章只需知道它们存在、以及在闸门里的位置。
          <code>confirm</code> 怎么连到 REPL、怎么读一个 y/N 出来，是<strong>下一章</strong>的内容；
          <code>audit.log</code> 把裁定记到哪、记成什么格式、怎么回查，是<strong>第三章</strong>的内容。
          本章的主角是 <code>policy.decide</code>：闸门的「判」这一半，已经齐了。
        </p>
      </Callout>

      <Example title="三种裁定各举一例">
        <p>
          <strong>read package.json → allow</strong>：模型想读一下依赖。<code>read</code> 是只读工具，
          第一步就放行，文件内容直接喂回去，你全程没被打扰。
        </p>
        <p>
          <strong>edit src/app.ts → ask</strong>：模型要改一个工作区里的源码文件。路径没越界、不在 <code>.git</code>，
          所以裁定是 <code>ask</code>，终端弹出「修改文件：src/app.ts，确认吗？(y/N)」，等你点头。
        </p>
        <p>
          <strong>bash &quot;rm -rf /&quot; → deny</strong>：命中 <code>DESTRUCTIVE</code> 第一条正则，直接拒绝，根本不执行。
          理由「疑似破坏性命令，已拒绝：rm -rf /」作为 <code>is_error</code> 的结果回灌给模型，模型看到后会换个安全的思路重来。
        </p>
      </Example>

      <Callout variant="warn" title="黑名单不是银弹，要靠纵深防御">
        <p>
          千万别以为列了六条正则就「安全了」。攻击和事故的形态无穷无尽——换个写法的 <code>rm</code>、拼接出来的危险命令、
          黑名单没想到的工具，永远有漏网之鱼。所以 forge 的真正防线不是那份黑名单，而是<strong>策略的默认姿态</strong>：
          只对最明显的破坏 <code>deny</code>，而对<strong>所有</strong>写操作一律 <code>ask</code>。
          黑名单挡住已知的灾难，「写操作默认问一句」挡住未知的风险，人作为最后一道关卡兜底。
          多层叠加、互相补位，这就是纵深防御——不指望任何单独一层做到滴水不漏。
        </p>
      </Callout>

      <Callout variant="tip" title="这套策略以后能由配置覆盖">
        <p>
          现在的 <code>defaultPolicy</code> 是写死的，但接口 <code>PermissionPolicy</code> 已经留好了扩展点。
          等到卷 6 的配置系统，你就能用配置文件覆盖默认策略——比如给 <code>npm test</code>、<code>git status</code>
          这类你信得过的命令加白名单，让它们从 <code>ask</code> 降级成 <code>allow</code>，实现「免确认」，
          少敲很多次 y。安全和顺手之间的平衡，最终交给用户自己调。
        </p>
      </Callout>

      <Summary
        points={[
          '能改文件、能跑 shell 的 Agent 副作用不可逆，必须在「模型决定」和「真正执行」之间加一道独立的安全闸门。',
          '裁定分三档，优先级从严：Deny（明确危险，直接拒）> Ask（写操作，先问一句）> Allow（只读，静默放行）。',
          'deny 不抛异常，而是构造 is_error 的 tool_result 把理由回灌给模型——拒绝即反馈，让模型换个安全做法。',
          'permissions.ts：PermissionResult 带 reason（既给人看确认、也写审计）；DESTRUCTIVE 黑名单挡最明显的灾难命令。',
          'decide 严格按只读→bash 分级→write/edit 越界检查→其它默认 ask 的顺序判；写 .git 或工作目录之外直接 deny。',
          '闸门接在 execOne 执行工具之前：deny 直接返回错误结果，ask 调 confirm 征求同意，没有 confirm 回调时默认拒绝。',
          '黑名单永远不全，所以靠纵深防御：写操作一律 ask、最明显的破坏才 deny，人作为最后兜底。',
          '下一章：危险确认——把 ask 的 this.confirm 接到 REPL，看它怎么向用户问出那句 y/N。',
        ]}
      />
    </article>
  )
}
