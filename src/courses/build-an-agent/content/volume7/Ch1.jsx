import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const sessionTs = `import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Message } from './types.js'

// 会话持久化：把消息历史存盘，支持 forge --resume 接着上次继续。
export interface SessionData {
  id: string
  updated: string
  messages: Message[]
}

export class SessionStore {
  readonly id: string
  private file: string

  constructor(cwd: string, id: string) {
    this.id = id
    const dir = join(cwd, '.forge', 'sessions')
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, \`\${id}.json\`)
  }

  save(messages: Message[]): void {
    const data: SessionData = { id: this.id, updated: new Date().toISOString(), messages }
    try {
      writeFileSync(this.file, JSON.stringify(data, null, 2), 'utf8')
    } catch {
      // 存盘失败不应中断对话
    }
  }
}

// 找最近修改的会话文件并读出来，用于 --resume。
export function loadLatestSession(cwd: string): SessionData | null {
  const dir = join(cwd, '.forge', 'sessions')
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    if (files.length === 0) return null
    let latest = files[0]
    let latestMs = 0
    for (const f of files) {
      const ms = statSync(join(dir, f)).mtimeMs
      if (ms > latestMs) {
        latestMs = ms
        latest = f
      }
    }
    return JSON.parse(readFileSync(join(dir, latest), 'utf8')) as SessionData
  } catch {
    return null
  }
}`

const agentHooks = `/** 恢复历史（供 --resume 使用）。 */
loadHistory(messages: Message[]): void {
  this.messages = messages
}`

const runTurnTail = `this.onTurnComplete?.()
return finalText`

const indexTs = `const resume = args.includes('--resume')
// …
const session = new SessionStore(process.cwd(), sessionId)
// 构造 Agent 时：
//   onTurnComplete: () => session.save(agent.messages),

if (resume) {
  const prev = loadLatestSession(process.cwd())
  if (prev) {
    agent.loadHistory(prev.messages)
    console.log(\`\${DIM}（已恢复会话 \${prev.id}，\${prev.messages.length} 条消息）\${RESET}\`)
  } else {
    console.log(\`\${DIM}（没有可恢复的会话，开新的）\${RESET}\`)
  }
}`

const demoBash = `# 第一次启动，问点东西
$ forge
> 帮我把 src/utils 下的函数都加上 JSDoc 注释
（forge 开始干活，改了几个文件……）
^C        # 临时有事，Ctrl-C 关掉

# 过会儿回来，带 --resume 接着上次
$ forge --resume
（已恢复会话 a1b2c3，14 条消息）
> 刚才 format.ts 那个还没加完，继续
（Agent 记得上下文：知道"刚才"指的是哪个文件、之前的约定）`

const atomicSave = `save(messages: Message[]): void {
  const data: SessionData = { id: this.id, updated: new Date().toISOString(), messages }
  const tmp = \`\${this.file}.tmp\`
  try {
    // 先写临时文件，再原子 rename，避免半截文件
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    renameSync(tmp, this.file)
  } catch {
    // 存盘失败不应中断对话
  }
}`

const sessionMeta = `{
  "id": "a1b2c3",
  "updated": "2026-06-16T09:12:44.108Z",
  "messages": [
    { "role": "user", "content": "帮我把 src/utils 下的函数都加上 JSDoc 注释" },
    { "role": "assistant", "content": [ /* text + tool_use … */ ] },
    { "role": "tool", "content": [ /* tool_result … */ ] }
  ]
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到这一卷为止，forge 已经能干活了。但它有个致命的"健忘症"：进程一退，所有对话记忆灰飞烟灭。
        长任务跑到一半被 Ctrl-C、机器崩了、终端关了——再启动就是一张白纸。这一章我们给 forge 装上
        "记忆存档"：会话持久化，以及 <code>forge --resume</code> 接着上次继续。
      </Lead>

      <h2>一、为什么要持久化会话</h2>

      <p>
        真实的 Agent 任务往往很长：重构一个模块、跑一轮调试、逐文件改注释，可能要十几个甚至几十个往返。
        这中间任何意外——你手滑按了 Ctrl-C、SSH 断线、电脑睡眠——都会让整个进程消失。如果记忆只活在内存里，
        重来一遍就意味着从头解释一遍背景，之前 Agent 摸清的上下文全白费了。
      </p>

      <p>
        解决办法很朴素：把消息历史<strong>存盘</strong>。每处理完一轮就把当前的 <code>messages</code> 写到磁盘，
        下次启动带上 <code>--resume</code>，把存档<strong>读回来</strong>灌进 Agent，它就接着上次的上下文继续了。
      </p>

      <p>
        <strong>为什么这么设计，而不是把状态塞进数据库或常驻进程？</strong>因为 forge 是一个 CLI——它的生命周期就是
        "启动、干活、退出"，没有常驻服务来兜住内存里的状态。让记忆活过进程，唯一现实的办法就是落盘。
        而落到本地文件（而非远程服务）是因为：CLI 工具要能离线用、要零依赖启动、要让用户对自己的数据有完全控制权。
        一个 JSON 文件，<code>cat</code> 能看、<code>rm</code> 能删、<code>git</code> 能忽略——这种"透明"本身就是工程上的优点。
      </p>

      <KeyIdea>
        会话持久化 = 让 Agent 的"记忆"跨进程存活。内存里的 <code>messages</code> 一旦落盘，
        进程死了也无所谓——下次开机把它读回来，记忆就续上了。
      </KeyIdea>

      <h2>二、存什么、存哪</h2>

      <p>
        <strong>存什么？</strong>就存 <code>messages</code> 数组——这是 Agent 的全部工作记忆：
        system 提示、用户每一句、模型每一次回复、每一次工具调用与结果，全在里面。把它存下来，记忆就完整了。
      </p>

      <p>
        <strong>存哪？</strong>按会话 id 存成一个文件：<code>.forge/sessions/&lt;id&gt;.json</code>。
        一个会话一个文件，互不干扰。<strong>什么时候存？</strong>每处理完用户的一轮就存一次——
        这样即使中途崩了，最多也只丢掉最后那一轮还没存的内容，已经完成的全部安全落地。
      </p>

      <h3>序列化：为什么 messages 能直接 JSON.stringify</h3>

      <p>
        这里藏着一个早在卷 1 就埋下的好处：forge 的 <code>messages</code> 从一开始就是<strong>纯数据</strong>——
        全是 <code>{'{ role, content }'}</code> 这样的普通对象和数组，没有类实例、没有函数、没有 <code>Date</code>、没有
        循环引用。所以 <code>JSON.stringify</code> 一把就能序列化，读回来 <code>JSON.parse</code> 也原样还原，不需要任何
        自定义 reviver。这不是巧合，而是"状态即数据"这条设计原则的回报：凡是要跨进程、跨网络传的东西，越是朴素的
        数据结构，序列化就越省心。
      </p>

      <Callout variant="warn">
        一个常见误区：往 <code>messages</code> 里塞了不可序列化的东西（比如一个流对象、一个回调、一个
        <code>Buffer</code>），结果 <code>JSON.stringify</code> 要么丢字段要么报错。守住"消息只装纯文本和结构化数据"
        这条线，持久化才稳。图片、二进制这类大块内容，正确做法是存引用（路径/URL），而不是把字节塞进对话历史。
      </Callout>

      <h3>存储选型：为什么是 JSON 文件而不是 SQLite</h3>

      <table>
        <thead>
          <tr><th>方案</th><th>优点</th><th>代价</th><th>forge 选它吗</th></tr>
        </thead>
        <tbody>
          <tr><td>单个 JSON 文件/会话</td><td>零依赖、可读、易调试、易 gitignore</td><td>大会话每轮整份重写</td><td>是</td></tr>
          <tr><td>JSONL 追加</td><td>只追加、写入快</td><td>读时要全量回放重建</td><td>否（审计日志才用）</td></tr>
          <tr><td>SQLite</td><td>查询/索引强、并发好</td><td>引入原生依赖、过度设计</td><td>否</td></tr>
          <tr><td>远程 KV / 云端</td><td>多端同步</td><td>要联网、有隐私面、要鉴权</td><td>否</td></tr>
        </tbody>
      </table>

      <p>
        选型的核心权衡是<strong>会话规模</strong>。forge 的单会话消息量通常在几十到几百条，整份 JSON 也就几十 KB 到
        几 MB，"每轮整份重写"的成本完全可以忽略。一旦会话能涨到上万条、或者要并发高频写，整份重写就成了瓶颈，
        那时才该考虑 JSONL 追加或 SQLite。<strong>工程经验：先用最简单能跑的方案，等规模真正逼近瓶颈再换</strong>——
        过早上 SQLite 只会换来一堆迁移、锁、损坏修复的复杂度。
      </p>

      <h2>三、会话模块 session.ts</h2>

      <p>下面是完整的会话持久化模块。它只做三件事：建目录、整份存、挑最近的读。</p>

      <CodeBlock lang="ts" title="src/session.ts" code={sessionTs} />

      <p>逐段拆解：</p>

      <ul>
        <li>
          <strong><code>SessionData</code> 结构</strong>：<code>id</code>（会话标识）、
          <code>updated</code>（最后更新时间，ISO 字符串，方便人眼看）、
          <code>messages</code>（全部消息历史，核心）。一份存档就是这么个对象。
        </li>
        <li>
          <strong><code>SessionStore</code> 构造</strong>：拼出 <code>.forge/sessions</code> 目录并
          <code>mkdirSync</code> 递归创建（目录不存在也不报错），记下本会话的文件路径 <code>{'<id>.json'}</code>。
        </li>
        <li>
          <strong><code>save</code></strong>：把 <code>messages</code> 连同当前时间打包成 <code>SessionData</code>，
          整份 <code>JSON.stringify</code> 写进文件。注意那个 <code>try/catch</code>——
          <strong>存盘失败是静默的</strong>：磁盘满了、权限不对，都不该把正在进行的对话打断。存档失败顶多丢点历史，
          打断对话才是真灾难。
        </li>
        <li>
          <strong><code>loadLatestSession</code></strong>：列出目录里所有 <code>.json</code>，
          按 <code>mtimeMs</code>（修改时间）挑出最近的那个读回来。没有文件就返回 <code>null</code>，
          交给调用方决定"开个新的"。这就是 <code>--resume</code> 默认恢复"最近一次会话"的实现。
        </li>
      </ul>

      <h3>底层原理：为什么 updated 用 ISO 字符串，但挑最近却用 mtime</h3>

      <p>
        留意一个细节：<code>SessionData.updated</code> 里存的是 ISO 时间字符串，可<code>loadLatestSession</code> 挑"最近"
        用的却是文件系统的 <code>mtimeMs</code>，根本没读 <code>updated</code>。这是<strong>故意</strong>的两套时间，各司其职：
      </p>
      <ul>
        <li><strong><code>updated</code>（文件内）</strong>：给人看的、可移植的元信息。哪怕文件被拷来拷去 mtime 变了，它仍记得"内容最后一次更新"的真实时刻。</li>
        <li><strong><code>mtime</code>（文件系统）</strong>：挑最近用它，因为不必把每个文件都 <code>readFileSync</code> + <code>JSON.parse</code> 出来比 <code>updated</code>，只 <code>statSync</code> 拿元数据就够，<strong>快得多</strong>。会话一多，这个差别就明显了。</li>
      </ul>

      <Callout variant="note">
        <strong>边界情况</strong>：极个别文件系统的 mtime 精度只到秒，同一秒内连存两份可能并列；拷贝/解压也会刷新
        mtime。所以"按 mtime 挑最近"只是一个<strong>足够好</strong>的启发式，不是强一致的真相。要 100% 准，就改读
        <code>updated</code> 字段排序——代价是得把每个文件解析出来。forge 选了"快且够用"。
      </Callout>

      <h3>断点续聊为什么是"每轮一存"</h3>

      <p>
        存盘频率是个权衡：<strong>存太勤</strong>（比如每个流式 token 都存）浪费 IO；<strong>存太懒</strong>（比如退出时才存）
        一旦崩溃就全丢。"每处理完一轮存一次"踩在最佳点上——一轮是用户能感知的最小完整单元，丢一轮的损失可接受，
        而每轮一次的写入频率对几十 KB 的文件毫无压力。这就是为什么钩子挂在 <code>runTurn</code> 的<strong>末尾</strong>而非中间。
      </p>

      <h2>四、Agent 侧的两个钩子</h2>

      <p>
        会话模块负责存读，但<strong>什么时候触发存盘</strong>、<strong>读回来的历史怎么灌进去</strong>，
        得在 Agent 上开两个口子。第一个是恢复历史的方法：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（钩子）" code={agentHooks} />

      <p>第二个是每轮结束的回调。在 <code>runTurn</code> 的末尾加上：</p>

      <CodeBlock lang="ts" title="src/agent.ts（runTurn 末尾）" code={runTurnTail} />

      <p>讲解：</p>

      <ul>
        <li>
          <strong><code>onTurnComplete</code></strong>：在每轮处理完后触发——
          <strong>无论这一轮有没有调过工具</strong>都触发（它就在 <code>return finalText</code> 前面）。
          回调具体干什么由入口 <code>index.ts</code> 注入，我们会让它去"存盘当前 messages"。
          用可选链 <code>?.()</code> 是为了：没注入回调时也不报错。
        </li>
        <li>
          <strong><code>loadHistory</code></strong>：把 <code>--resume</code> 读回来的历史，
          直接赋给 <code>this.messages</code>。一句话，Agent 的记忆就被"还原"了。
        </li>
      </ul>

      <Callout variant="note">
        <strong>为什么用回调注入，而不是让 Agent 直接 import SessionStore？</strong>这是一处刻意的解耦：Agent 的职责
        是"跑对话循环"，它不该知道"记忆要存到哪个文件、用什么格式"。把存盘做成一个 <code>onTurnComplete</code> 回调，
        Agent 就对持久化一无所知——将来换成存数据库、存云端、或者测试里干脆不存，都只改注入的那一行，Agent 代码纹丝不动。
        这正是依赖倒置：高层逻辑不依赖低层实现细节。
      </Callout>

      <h2>五、入口接线 index.ts</h2>

      <p>最后在入口把三块串起来：解析标志、注入存盘回调、启动时恢复历史。</p>

      <CodeBlock lang="ts" title="src/index.ts（--resume）" code={indexTs} />

      <p>讲解：</p>

      <ul>
        <li><strong>解析标志</strong>：<code>args.includes('--resume')</code> 判断用户是否要恢复。</li>
        <li>
          <strong>注入存盘回调</strong>：构造 Agent 时把 <code>onTurnComplete</code> 设为
          <code>() =&gt; session.save(agent.messages)</code>。于是每轮一结束，当前记忆就自动落盘。
        </li>
        <li>
          <strong>启动时恢复</strong>：如果带了 <code>--resume</code>，就 <code>loadLatestSession</code> 读最近会话，
          有则 <code>agent.loadHistory</code> 灌回历史并打印"已恢复 N 条消息"，没有则提示"开新的"。
        </li>
      </ul>

      <Example title="一次断点续聊">
        <p>把整个流程串成一次真实的"中断—恢复"：</p>
        <CodeBlock lang="bash" title="终端" code={demoBash} />
        <p>
          关键在那行 <code>（已恢复会话 a1b2c3，14 条消息）</code>——它告诉你记忆真的续上了。
          于是你能用"刚才""继续"这种指代词，Agent 都懂，因为前 14 条消息就摆在它的工作记忆里。
        </p>
      </Example>

      <p>读回来的文件长这样，结构一目了然：</p>
      <CodeBlock lang="json" title=".forge/sessions/a1b2c3.json" code={sessionMeta} />

      <h2>六、并发会话：同一目录两个 forge 怎么办</h2>

      <p>
        当前实现按会话 id 一文件一存，所以<strong>不同会话天然隔离</strong>，互不覆盖——这是按 id 分文件最大的好处。
        但有两个并发边界值得想清楚：
      </p>
      <ul>
        <li>
          <strong>同一 id 被两个进程同时写</strong>：理论上后写覆盖先写，可能丢数据。CLI 场景下两个进程共用同一会话 id
          很罕见，所以 forge 没上文件锁。真要防，可在 id 里掺进程信息，或用下面的原子写把"写半截"的风险也一并堵掉。
        </li>
        <li>
          <strong><code>--resume</code> 时谁是"最近"</strong>：多个会话并行跑，mtime 最大的那个被恢复。如果你想恢复的不是
          最新那个，就需要 <code>--resume &lt;id&gt;</code> 这样的显式指定（当前默认实现只取最近，显式指定可作为练习扩展）。
        </li>
      </ul>

      <h3>工程加固：原子写，避免"写到一半崩了"</h3>

      <p>
        基础版 <code>writeFileSync</code> 有个隐患：如果正写到一半进程被杀，文件就成了半截的、解析会失败的损坏 JSON——
        而它恰恰是"最近"那个，<code>--resume</code> 一读就 <code>JSON.parse</code> 抛错（好在外层 <code>try/catch</code> 兜住会回退到"开新的"，
        但那一份历史就废了）。工程上的标准做法是<strong>先写临时文件，再原子 rename</strong>：
      </p>
      <CodeBlock lang="ts" title="src/session.ts（原子写，加固版）" code={atomicSave} />
      <p>
        <code>rename</code> 在同一文件系统上是原子操作：要么旧文件、要么完整新文件，永远不会出现"半截"。
        这一招几乎零成本，却把"写中途崩溃导致存档损坏"这个长尾故障直接消灭，是生产化里非常值的一笔投入。
      </p>

      <Callout variant="tip">
        会话文件就是纯 JSON，没有任何加密或压缩。随手 <code>cat .forge/sessions/a1b2c3.json</code> 就能看，
        想复盘"当时 Agent 到底想了啥、调了哪些工具"一目了然。配合卷 3 的审计日志一起看，
        一边是结构化对话历史、一边是逐条工具调用流水，排查问题更全。
      </Callout>

      <Callout variant="warn">
        会话 JSON 含<strong>完整对话</strong>：你贴进去的代码、文件路径、甚至可能粘过的密钥片段，都原样躺在里面。
        所以 <code>.forge/</code> 必须在 <code>.gitignore</code> 里（我们之前已经加好了），千万别误提交到仓库。
      </Callout>

      <h3>隐私：记忆是一把双刃剑</h3>

      <p>
        持久化让 Agent 更好用，但也意味着<strong>你的对话被永久留底在磁盘上</strong>。这在工程上必须当成隐私面来对待：
      </p>
      <ul>
        <li><strong>留底范围</strong>：会话存在<code>项目目录</code>下的 <code>.forge/</code>，不出本机、不上传——这是相对安全的默认。</li>
        <li><strong>清理</strong>：提供 <code>forge --clear-sessions</code> 之类的命令（或直接 <code>rm -rf .forge/sessions</code>）让用户能一键抹除，是基本的尊重。</li>
        <li><strong>共享机器</strong>：在多人共用的服务器上，<code>.forge/</code> 的文件权限应限制为当前用户可读，别让同机其他人 <code>cat</code> 到你的对话。</li>
        <li><strong>误读勿改</strong>：会话文件能看不代表能随手手改——手改可能破坏 messages 的结构契约（比如 tool_use 和 tool_result 配不上对），导致下次恢复时模型行为错乱。</li>
      </ul>

      <h2>七、衔接下一章</h2>

      <p>
        现在 forge 的记忆能存、能续了——长任务被打断也不再可怕。但有了"跨进程的记忆"，
        马上冒出新问题：每次和模型往返，到底<strong>花了多少钱、慢了多久</strong>？历史越长，
        每轮带的上下文越多，成本和延迟都会涨。下一章我们就把这两个数字测出来、显出来。
      </p>

      <KeyIdea>
        持久化解决的是"记忆活不活得过进程"；接下来要解决的是"这份记忆每用一次值多少钱、要等多久"——
        成本与延迟，是生产化绕不开的第二道关。
      </KeyIdea>

      <Summary
        points={[
          '会话持久化 = 让 Agent 的 messages 跨进程存活：存盘 + --resume 读回。',
          'messages 是纯数据（无类/函数/循环引用），所以能直接 JSON.stringify/parse，这是"状态即数据"设计的回报。',
          '存储选型选最简单够用的：单会话单 JSON 文件，零依赖可调试；规模真到瓶颈再考虑 JSONL/SQLite。',
          '存 messages（全部工作记忆），按会话 id 存成 .forge/sessions/<id>.json，每轮结束存一次（频率的最佳折中）。',
          'SessionStore.save 整份写 JSON，存盘失败静默不打断对话；loadLatestSession 用 statSync 的 mtime 快速挑最近会话读回。',
          'Agent 两个钩子：onTurnComplete 每轮触发存盘（回调注入解耦），loadHistory 把历史灌回 messages。',
          'index.ts 接线：解析 --resume、注入 onTurnComplete 存盘、启动时恢复最近会话。',
          '并发按 id 分文件天然隔离；用"先写临时文件再原子 rename"消灭写中途崩溃导致的存档损坏。',
          '会话 JSON 含完整对话：务必 .gitignore、可清理、限权限——记忆是隐私双刃剑。',
        ]}
      />
    </article>
  )
}
