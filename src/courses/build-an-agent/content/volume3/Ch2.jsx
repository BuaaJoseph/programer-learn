import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const confirmTypeSrc = `/** 危险操作确认请求：交给上层（CLI）向用户问一句 y/N。 */
export interface ConfirmRequest {
  tool: string
  input: Record<string, unknown>
  /** 给人看的这次操作摘要。 */
  reason: string
}`

const confirmFieldSrc = `/** 需要确认时回调上层；返回 true 表示用户同意执行。不提供则视为拒绝。 */
confirm?: (req: ConfirmRequest) => Promise<boolean>`

const setConfirmSrc = `/** 设置危险操作确认回调（供 REPL 注入 y/N 提问）。 */
setConfirm(confirm: (req: ConfirmRequest) => Promise<boolean>): void {
  this.confirm = confirm
}`

const execOneSrc = `// execOne 里的 ask 分支（回顾上一章）：
case 'ask': {
  // 没注入 confirm，或用户说不 —— 两种情况都不执行，把拒绝回灌给模型。
  const ok = this.confirm ? await this.confirm({
    tool: call.name,
    input: call.input,
    reason: describe(call),
  }) : false
  if (!ok) return { ok: false, output: '用户拒绝了这次操作。' }
  break // 放行，继续往下真正执行
}`

const replConfirmSrc = `const YELLOW = '\\x1b[33m'

// ……（startRepl 内部）
const rl = createInterface({ input: stdin, output: stdout, prompt: 'forge> ' })

// 把 readline 的提问包成 Promise，方便在异步流程里 await。
const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res))

// 危险操作确认：执行有风险的工具前，向用户问一句 y/N（人在回路的闸门）。
agent.setConfirm(async (req) => {
  console.log(\`\\n\${YELLOW}⚠ forge 想要执行：\${req.reason}\${RESET}\`)
  const ans = (await ask(\`\${YELLOW}允许吗？[y/N] \${RESET}\`)).trim().toLowerCase()
  return ans === 'y' || ans === 'yes'
})`

const sessionAllowSrc = `forge> 把 README 里的版本号改成 1.0

好的，我来看一下 README.md 当前的版本号……
找到了 "version: 0.9"，我把它改成 "version: 1.0"。

⚠ forge 想要执行：修改文件：README.md
允许吗？[y/N] y

已写入 README.md（1 处改动）。版本号已更新为 1.0。`

const sessionDenySrc = `forge> 把 README 里的版本号改成 1.0

好的，我来看一下 README.md 当前的版本号……

⚠ forge 想要执行：修改文件：README.md
允许吗？[y/N] n

明白，这次我不改了。如果你想先看看具体会改哪一行，
我可以把 diff 贴出来给你确认，再决定要不要动手。`

const tocttouSrc = `// TOCTOU：Time-Of-Check To Time-Of-Use（检查时与使用时之间的窗口）
// 危险确认天生有这个缝隙——「问人」和「执行」是两个时刻，中间状态可能变。

// 1) 用户看到的确认：
//    ⚠ forge 想要执行：写入文件 config.json
//    允许吗？[y/N] y          ← 此刻 config.json 是普通文件

// 2) 用户点头到真正落盘之间（哪怕只有几十毫秒）：
//    └─ 另一个进程把 config.json 换成了指向 /etc/passwd 的符号链接

// 3) forge 真正执行 write 时：
//    └─ 内容被写进了 /etc/passwd —— 用户批准的根本不是这件事！

// 缓解思路：
//   · 确认时展示的标识，要和执行时校验的标识一致（比如对内容/路径做快照再核对）
//   · 尽量缩短 check→use 的窗口，别在确认后还做一堆可被插队的中间步骤
//   · 真正高危场景用文件描述符（openat + O_NOFOLLOW）而非「路径」来操作`

const autoApproveSrc = `// 自动批准策略：在「安全」和「省心」之间分档，而不是一刀切全放或全问。
type AutoApprove =
  | { mode: 'never' }                          // 永远问人（最安全，最累）
  | { mode: 'session', scope: string[] }       // 本次会话内，某些类别记住批准
  | { mode: 'pattern', allow: RegExp[] }        // 命中白名单模式的自动放行

// 关键：自动批准只能降低「ask → allow」，绝不能动「deny」。
// 红线规则永远压在最上面，再怎么图省事也不能把 deny 自动批掉。
function shouldAutoApprove(req: ConfirmRequest, cfg: AutoApprove): boolean {
  if (cfg.mode === 'never') return false
  if (cfg.mode === 'session') return cfg.scope.includes(req.tool)
  if (cfg.mode === 'pattern') {
    const text = String(req.input.command ?? req.input.path ?? '')
    return cfg.allow.some((re) => re.test(text))
  }
  return false
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章，权限策略把每一次工具调用裁定成三种结果：<code>allow</code> 直接放行、<code>deny</code> 当场拦死、
        <code>ask</code> 表示「这事得问问人」。<code>allow</code> 和 <code>deny</code> 都是机器自己就能下的判断，
        唯独 <code>ask</code> 留了个悬而未决的钩子——它要的是一个活人点头。这一章，我们就把「问」这件事真正做出来：
        人在回路（Human-in-the-Loop, HITL）的确认闸门。
      </Lead>

      <h2>一、为什么 Agent 上生产，离不开人在回路</h2>
      <p>
        一个能读文件、能跑 shell、能改代码的 agent，威力和危险是一体两面。它可能把版本号从 0.9 改成 1.0，
        也可能把一整个目录 <code>rm -rf</code> 掉。模型再聪明，也会误读你的意图、会把测试目录当成生产目录、
        会在你只想「看看」的时候动手「改了」。指望模型永不犯错，不是工程，是赌博。
      </p>
      <p>
        工程的做法是：把不可逆、有副作用的关键写操作，做成<strong>可中断、可审查</strong>的。在真正落盘、
        真正执行命令之前，停一下，把「我接下来要干什么」摊开给人看，等人点头才继续。这一停，就是 agent
        从「玩具 demo」迈向「敢交真实文件系统」的那道门槛。
      </p>

      <p>
        往深一层说，人在回路解决的不是「模型不够强」，而是<strong>责任归属</strong>和<strong>不可逆性</strong>两个根本问题。
        责任归属：当一个写操作落盘前有人点过头，这件事就从「Agent 擅自做的」变成「人授权 Agent 做的」——
        无论结果好坏，链路上有一个明确的决策点，事后查得清、说得明。不可逆性：读操作错了重读一遍即可，
        但 <code>rm</code>、<code>git push --force</code>、<code>DROP TABLE</code> 这类操作一旦发生就<strong>没有撤销键</strong>。
        HITL 的精髓，就是在<strong>不可逆的那一刻之前</strong>插入一个可逆的暂停点。能撤销的操作不必拦，
        拦的成本得花在真正回不了头的地方。
      </p>

      <KeyIdea title="危险确认 = 把「执行权」在关键节点交还给人">
        允许 agent 自主思考、自主规划、自主调用只读工具，这是效率；但在每一次有副作用的关键操作前，
        把最终的「执行权」交还给坐在终端前的那个人——这是信任的基础。模型负责想清楚「要做什么」，
        人负责守住「准不准做」。两者各司其职，agent 才敢上生产。
      </KeyIdea>

      <h2>二、解耦：Agent 只「请求确认」，不负责「怎么问」</h2>
      <p>
        这里有一个很容易做错的设计冲动：直接在 Agent 内核里 <code>console.log</code> 一行、再读一下终端输入。
        能跑，但你立刻就把内核和「终端」这种具体前端焊死了。可 forge 的 agent 内核，明天可能跑在一个 GUI 弹窗后面、
        跑在一个网页里、跑在 CI 流水线里被自动批准——它根本不该知道「问用户」长什么样。
      </p>
      <p>
        所以我们让 Agent 只持有一个 <code>confirm</code> 回调：当遇到 <code>ask</code> 级别的操作时，
        它构造一份「确认请求」，把决定权抛给这个回调，然后 <code>await</code> 一个布尔结果。至于这个回调
        是弹窗、是终端 y/N、还是「无脑返回 true」的自动批准——由上层注入，内核一概不管。
      </p>

      <Callout variant="note" title="这是一次标准的依赖注入">
        <p>
          Agent 声明的是一种<strong>能力需求</strong>（「我需要一个能向人确认的函数」），而不是一种<strong>具体实现</strong>
          （「我要在终端打印并读取 y/N」）。具体实现由外面注入进来。这样带来两个直接好处：
        </p>
        <ul>
          <li><strong>可适配多前端</strong>：终端注入 y/N 实现，GUI 注入弹窗实现，测试注入一个固定返回值的桩函数。内核一行不改。</li>
          <li><strong>可测试</strong>：测内核时塞一个 <code>{'async () => true'}</code> 或 <code>{'async () => false'}</code>，就能精确断言「同意」和「拒绝」两条路径的行为，完全不碰真实终端。</li>
        </ul>
      </Callout>

      <h2>三、Agent 侧：confirm 的类型与注入口</h2>
      <p>
        先看请求的形状。当 agent 想做一件需要确认的事，它会打包出这样一份 <code>ConfirmRequest</code>：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（ConfirmRequest 与注入）" code={confirmTypeSrc} />

      <p>
        三个字段各有用处：<code>tool</code> 是工具名（如 <code>write</code>、<code>bash</code>），<code>input</code>
        是这次调用的原始参数，而 <code>reason</code> 是一句<strong>给人看的</strong>操作摘要——它才是用户真正用来判断的依据，
        第六节我们会专门强调它的分量。
      </p>
      <p>
        然后是 Agent 上持有的那个回调字段：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（confirm 字段）" code={confirmFieldSrc} />

      <p>
        两个细节值得停下来想清楚：
      </p>
      <ul>
        <li>
          <strong>为什么返回 <code>{'Promise<boolean>'}</code>？</strong>因为「问用户」天生是异步的——你要等他抬头看一眼、
          再敲一个键。无论是终端读一行，还是弹窗等点击，都不可能同步拿到答案。返回 Promise，
          agent 才能在执行流程里干净地 <code>await</code> 住，等人回话。
        </li>
        <li>
          <strong>为什么字段是可选的（<code>confirm?:</code>），且「不提供就视为拒绝」？</strong>这是一个刻意的
          <strong>安全默认</strong>。如果某个上层忘了注入确认回调，那就意味着此刻「没有任何人能被问到」——
          既然问不到人，正确的做法不是偷偷执行，而是当作「没人点头」，直接拒绝。宁可少做一件事，也不冒险做错一件事。
        </li>
      </ul>

      <p>
        注入口是一个简单的 setter，留给 REPL（或任何上层）在启动时调用：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（setConfirm 注入）" code={setConfirmSrc} />

      <p>
        回过头看上一章 <code>execOne</code> 里处理 <code>ask</code> 的那几行，整条链路就闭合了：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（execOne 的 ask 分支，回顾）" code={execOneSrc} />

      <p>
        注意这里把两种「不执行」的情况合并成了一句：<code>this.confirm</code> 不存在（问不到人），
        或者它返回了 <code>false</code>（人说不）——两种情况都走 <code>ok ? ... : false</code> 的同一条拒绝路径，
        返回 <code>「用户拒绝了这次操作。」</code> 这个字符串会作为工具结果<strong>回灌给模型</strong>，
        让它知道这条路没走通，从而停手或换个方案。
      </p>

      <h2>四、REPL 侧：把 readline 包成 Promise，实现终端 y/N</h2>
      <p>
        内核挖好了坑，现在轮到上层填。forge 的 CLI 在 <code>startRepl</code> 启动时，注入一个「向终端问 y/N」的实现。
        难点只有一个：Node 的 <code>readline</code> 用的是回调式 API（<code>rl.question(q, cb)</code>），
        而我们的 <code>confirm</code> 要返回 Promise。所以先写一个小辅助函数把它「Promise 化」：
      </p>

      <CodeBlock lang="ts" title="src/repl.ts（确认提示）" code={replConfirmSrc} />

      <p>
        逐段看清楚：
      </p>
      <ul>
        <li>
          <strong><code>ask</code> 辅助函数</strong>：用 <code>new Promise</code> 把 <code>rl.question</code>
          的回调包起来——用户敲完回车那一刻，<code>res</code> 被调用，Promise 兑现成那行输入。
          有了它，<code>confirm</code> 里就能写出 <code>{'await ask(...)'}</code> 这样顺直的异步代码，而不是嵌一层回调。
        </li>
        <li>
          <strong>默认是大写的 <code>N</code></strong>：提示 <code>[y/N]</code> 里大写的那个字母代表默认选项。
          回看判断逻辑——只有输入精确等于 <code>y</code> / <code>yes</code> 才返回 <code>true</code>，
          其余任何输入（包括直接回车、敲个空格、手一抖打了别的）一律视为拒绝。这又是一个安全默认：
          <strong>必须显式点头才放行</strong>，沉默和含糊都算否。
        </li>
        <li>
          <strong>为什么能安全复用同一个 <code>rl</code>？</strong>这一刻，REPL 的主循环正 <code>await</code> 在
          <code>agent.runTurn(...)</code> 上——它把控制权交给了 agent，自己并没有在读取终端。
          所以当 <code>confirm</code> 借用这个 <code>rl</code> 去问 y/N 时，不存在两处同时抢读 stdin 的并发问题。
          一个 readline 实例，在串行的流程里被两处「分时复用」，干净且无冲突。
        </li>
      </ul>

      <h2>五、跑起来看看</h2>
      <p>
        假设你对 forge 说：「把 README 里的版本号改成 1.0」。模型会先读文件、想清楚要改哪一行，
        然后准备调用 <code>write</code>（或 <code>edit</code>）。这是个写操作，权限策略把它判成 <code>ask</code>——
        于是闸门落下，终端上跳出黄色的确认行：
      </p>

      <Example title="一次确认的终端画面">
        <CodeBlock lang="text" title="同意：输入 y 后执行成功" code={sessionAllowSrc} />
      </Example>

      <p>
        你看清了「要改 README.md」，敲 <code>y</code> 回车，操作放行、文件落盘。现在换一种结局——
        如果你这会儿其实想先看看 diff、或者干脆改了主意，就敲 <code>n</code>：
      </p>

      <Example title="同一道闸门，输入 n 的另一种结局">
        <CodeBlock lang="text" title="拒绝：输入 n 后模型停手并换方案" code={sessionDenySrc} />
      </Example>

      <p>
        关键在于：<code>n</code> 之后，<code>「用户拒绝了这次操作。」</code> 作为工具结果被回灌进对话。
        模型读到这条结果，<strong>不会装作没发生继续硬干</strong>，而是据此调整——要么停手，要么主动提出
        「我先把 diff 贴给你看看」这样的替代方案。拒绝不是一个死胡同，而是一次反馈，模型会顺着它往下走。
      </p>

      <h2>六、确认提示，必须说清「具体要做什么」</h2>
      <Callout variant="warn" title="一个真实的坑：看不清的确认，等于没有确认">
        <p>
          如果确认提示只是干巴巴地问一句「forge 想执行一个操作，允许吗？[y/N]」，而不告诉用户<strong>具体是什么操作</strong>，
          那会发生什么？用户会盲目地按 <code>y</code>。问得多了，<code>y</code> 就成了肌肉记忆——这道闸门形同虚设，
          甚至比没有更糟，因为它给了你一种「我有在审查」的虚假安全感。
        </p>
        <p>
          确认提示必须摊开<strong>命令全文 / 文件路径</strong>这类能让人当场判断的关键信息。
          <code>ConfirmRequest</code> 里那个 <code>reason</code> 字段，就是为此而生：它不是给机器看的，
          是给人看的一句话摘要——「修改文件：README.md」「执行命令：<code>rm -rf ./dist</code>」。
          人要靠它在一秒内分辨「这是我想要的」还是「不对，停」。摘要写得越准，闸门才越有用。
        </p>
      </Callout>

      <h2>七、如果每次都问，会不会太烦？</h2>
      <Callout variant="tip" title="进阶：本次会话内记住某类批准">
        <p>
          很现实的体验问题：连续改十个文件，难道要点十次 <code>y</code>？一个常见的进阶做法是「会话级记忆」——
          用户对某类操作点头后，本次会话内同类操作就不再反复打扰（类似很多工具的「本次会话内允许」选项）。
        </p>
        <p>
          但这要<strong>非常谨慎</strong>：记忆的粒度多大？是「这一个文件」还是「所有写操作」？
          范围一放宽，闸门就一寸寸失效。这恰恰是卷 6「权限配置化」要正面解决的问题——
          把 <code>allow</code> / <code>ask</code> / <code>deny</code> 做成可配置、可分层、可记忆的规则系统，
          让你在「省心」和「安全」之间精确地调档，而不是临时拍脑袋放权。这里先埋个伏笔。
        </p>
      </Callout>

      <h2>八、两道闸门，合成安全底座</h2>
      <p>
        到这里，forge 的安全机制有了清晰的两层防线：上一章的 <code>deny</code> 是<strong>硬拦截</strong>——
        危险到不该问的操作，机器直接拦死，根本不给人犹豫的机会；这一章的 <code>ask</code> 是<strong>软闸门</strong>——
        有副作用但合理的操作，停下来交给人点头。一刚一柔，覆盖了「绝对不行」和「请你确认」两种典型场景。
      </p>

      <KeyIdea title="deny 拦死、ask 问人，合起来就是 forge 的安全底座">
        <code>deny</code> 守住那条「机器自己就能划清的红线」，<code>ask</code> 守住那条「必须由人来拍板的灰线」。
        两道闸门叠在一起，agent 才既敢放手去做事，又不会在关键处脱缰。这就是把一个能动手的 agent
        交到真实环境里的底气所在。
      </KeyIdea>

      <p>
        但安全不止于「拦」和「问」。当 agent 真的动了手——改了哪个文件、跑了哪条命令、哪次被拒、哪次放行——
        这些都该被记下来，事后能回放、能复盘、能追责。下一章，我们给 forge 加上<strong>审计日志</strong>：
        把每一次裁定和每一次执行都落进可回放的记录，让整个过程经得起回头看。
      </p>

      <Summary
        points={[
          '人在回路（HITL）是 Agent 上生产的前提：关键写操作前可中断、可审查，把「执行权」在关键节点交还给人。',
          'Agent 内核不知道「怎么问用户」，只持有一个 confirm 回调；终端 y/N、GUI 弹窗、自动批准等具体实现由上层注入——这是依赖注入，内核可测试、可适配多前端。',
          'confirm 返回 Promise<boolean>（问人是异步的）；字段可选且「不提供就视为拒绝」，是一个安全默认——问不到人就别做。',
          'execOne 的 ask 分支把「没注入 confirm」和「用户说不」合并成同一条拒绝路径，返回「用户拒绝了这次操作。」回灌给模型。',
          'REPL 侧用 new Promise 把 rl.question 包成 ask 辅助函数，从而能在 confirm 里 await 用户输入；默认大写 N，必须显式 y 才放行。',
          '主循环此刻正 await 在 runTurn 上、没有并发读取 stdin，所以 confirm 能安全复用同一个 rl 实例。',
          '确认提示必须展示命令全文 / 文件路径，reason 字段就为此而生——看不清的确认等于没有闸门，用户会盲目 y。',
          '进阶可做会话级批准记忆以减少打扰，但要谨慎；这正是卷 6 权限配置化要正面解决的。deny 拦死 + ask 问人 = forge 的安全底座，下一章接审计日志。',
        ]}
      />
    </article>
  )
}
