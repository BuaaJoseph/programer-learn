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

      <Callout variant="tip">
        会话文件就是纯 JSON，没有任何加密或压缩。随手 <code>cat .forge/sessions/a1b2c3.json</code> 就能看，
        想复盘"当时 Agent 到底想了啥、调了哪些工具"一目了然。配合卷 3 的审计日志一起看，
        一边是结构化对话历史、一边是逐条工具调用流水，排查问题更全。
      </Callout>

      <Callout variant="warn">
        会话 JSON 含<strong>完整对话</strong>：你贴进去的代码、文件路径、甚至可能粘过的密钥片段，都原样躺在里面。
        所以 <code>.forge/</code> 必须在 <code>.gitignore</code> 里（我们之前已经加好了），千万别误提交到仓库。
      </Callout>

      <h2>六、衔接下一章</h2>

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
          '存 messages（全部工作记忆），按会话 id 存成 .forge/sessions/<id>.json，每轮结束存一次。',
          'SessionStore.save 整份写 JSON，存盘失败静默不打断对话；loadLatestSession 按 mtime 挑最近会话读回。',
          'Agent 两个钩子：onTurnComplete 每轮触发存盘，loadHistory 把历史灌回 messages。',
          'index.ts 接线：解析 --resume、注入 onTurnComplete 存盘、启动时恢复最近会话。',
          '会话 JSON 可 cat 复盘，配合审计日志更全；含完整对话务必走 .gitignore 不提交。',
        ]}
      />
    </article>
  )
}
