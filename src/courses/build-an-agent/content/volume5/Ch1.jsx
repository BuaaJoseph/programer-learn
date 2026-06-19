import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const todoStoreCode = `// 任务清单的共享状态。todo_write 工具往里写，CLI 可读出来展示。
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

export interface TodoItem {
  content: string
  status: TodoStatus
}

export class TodoStore {
  items: TodoItem[] = []

  set(items: TodoItem[]): void {
    this.items = items
  }

  // 渲染成给人/模型看的清单文本。
  render(): string {
    if (this.items.length === 0) return '(暂无待办)'
    const mark: Record<TodoStatus, string> = { pending: '[ ]', in_progress: '[~]', completed: '[x]' }
    return this.items.map((t) => \`\${mark[t.status]} \${t.content}\`).join('\\n')
  }
}`

const todoToolCode = `import type { Tool } from './types.js'
import type { TodoStore, TodoItem, TodoStatus } from '../todo.js'

// todo_write：让 Agent 把大任务拆成清单、并随进度更新。覆盖式写入（每次传完整列表）。
// 它不碰文件系统，所以标记为只读——不需要确认、可静默执行。
export function makeTodoTool(store: TodoStore): Tool {
  return {
    name: 'todo_write',
    description:
      '维护任务清单。传入完整的待办列表（覆盖式）：每项含 content（任务描述）与 status（pending/in_progress/completed）。同一时刻最多一个 in_progress。用于规划多步任务、追踪进度，不要用于琐碎的单步任务。',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: '完整的待办列表',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            },
            required: ['content', 'status'],
          },
        },
      },
      required: ['todos'],
    },
    async execute(input) {
      const raw = Array.isArray(input.todos) ? (input.todos as unknown[]) : []
      const items: TodoItem[] = raw.map((t) => {
        const o = t as Record<string, unknown>
        return { content: String(o.content ?? ''), status: (o.status as TodoStatus) ?? 'pending' }
      })
      const inProgress = items.filter((t) => t.status === 'in_progress').length
      if (inProgress > 1) {
        return { output: '同一时刻只能有一个进行中(in_progress)的任务，请调整后重试。', isError: true }
      }
      store.set(items)
      return { output: '已更新任务清单：\\n' + store.render() }
    },
  }
}`

const wireUpCode = `const todos = new TodoStore()
// …
const tools: Tool[] = [...ALL_TOOLS, makeTodoTool(todos)]`

const stateMachineCode = `// 任务状态机：状态只能这样流转，不存在「completed 又退回 pending」之类的诡异跳变。
//
//   pending ──开始做──▶ in_progress ──做完──▶ completed
//      ▲                    │
//      └──────发现没法继续────┘  （极少数：把它退回 pending 重排，但绝不能两个同时 in_progress）
//
// 校验时我们其实只死守一条不变量：in_progress 的数量 <= 1。
// 其余流转交给模型自己拿捏——约束越少，模型越不容易被规则绊住。
function assertInvariant(items: TodoItem[]): string | null {
  const running = items.filter((t) => t.status === 'in_progress')
  if (running.length > 1) {
    return \`检测到 \${running.length} 个进行中任务，同一时刻最多一个。\`
  }
  return null
}`

const badVsGoodCode = `// ✗ 反例：增量打补丁。第二次调用只想「把第 2 项标完成」，却丢了第 1、3 项。
todo_write({ todos: [{ content: '写接口', status: 'completed' }] })
// → store 里现在只剩一项，另外两项凭空消失了。

// ✓ 正例：每次都传完整快照，状态始终自洽。
todo_write({ todos: [
  { content: '设计表结构', status: 'completed' },
  { content: '写接口',     status: 'completed' },
  { content: '写测试',     status: 'in_progress' },
]})`

export default function Ch1() {
  return (
    <article>
      <Lead>
        卷 5 我们进入「规划与子代理」。面对一个动辄十几步的大任务，Agent
        最怕的不是不会做，而是做着做着跑偏、漏步、忘了自己原本要干嘛。这一章我们做第一件武器：
        <code>todo_write</code> 任务清单工具——逼模型先把大任务拆成清单，再逐项推进，进度全程可见。
      </Lead>

      <h2>一、为什么 Agent 需要一份待办清单</h2>
      <p>
        模型在一轮对话里的「注意力」是有限的。任务一长，它很容易在第三步就忘了第一步定下的方向，或者跳过某个关键环节直接奔向结尾。
        人类对付这种情况的办法很朴素：列个清单，做一项划一项。我们把同样的工具交给 Agent。
      </p>
      <p>
        给它一个待办工具，本质上是给它一种「自我管理」的能力：先拆解，再逐项推进，每完成一步就更新状态。
        清单既是模型给自己的备忘录，也是用户能实时看到的进度条。
      </p>

      <KeyIdea>
        TodoWrite 让长任务「有计划、可追踪、不跑偏」：拆解在前，逐项推进，状态可见。
      </KeyIdea>

      <p>
        值得说清楚的是这背后的<strong>底层原理</strong>：大语言模型没有真正的「工作记忆」，它每一轮看到的，
        就是被一股脑塞进上下文窗口的全部历史。任务越长，历史越长，早期那句「先做 A 再做 B 最后别忘了 C」就被越埋越深，
        在注意力机制里的权重被后面成堆的工具输出稀释掉。<strong>清单的妙处在于：它把「计划」从一段会沉底的历史，变成了一份每轮都会被重新读到的、始终在上下文顶部的活文档。</strong>
        模型每调一次 <code>todo_write</code>，最新的清单就作为 tool_result 重新出现在上下文末尾——离当前推理最近、权重最高。
        这等于给模型外挂了一块「不会被遗忘的便签」。
      </p>

      <Example title="和人类 GTD 的类比">
        <p>
          这套机制几乎是 David Allen「Getting Things Done」的 Agent 版翻译：
        </p>
        <table>
          <thead>
            <tr><th>GTD 概念</th><th>TodoWrite 对应</th></tr>
          </thead>
          <tbody>
            <tr><td>把脑子里的事「清空」到外部清单</td><td>开局先 todo_write 把任务拆成列表</td></tr>
            <tr><td>下一步行动（Next Action）只锁定一件</td><td>同一时刻最多一个 in_progress</td></tr>
            <tr><td>定期 review、勾掉已完成的</td><td>每做完一步回来更新状态</td></tr>
            <tr><td>清单是外部记忆，不靠脑子记</td><td>清单是上下文外的便签，不靠模型记</td></tr>
          </tbody>
        </table>
        <p>
          人类用 GTD 是因为大脑短期记忆只有「7±2」个槽位、且容易被打断后丢失上下文；
          模型用 TodoWrite 是因为注意力会被长历史稀释。问题不同，解法却惊人地一致——<strong>把记忆外置成一份可反复读取的清单。</strong>
        </p>
      </Example>

      <h2>二、几条关键约束</h2>
      <p>这个工具的设计有三条硬规矩，每一条都对应一个具体的问题：</p>
      <ul>
        <li>
          <strong>覆盖式写入</strong>：每次调用都传<em>完整</em>的列表，而不是增量打补丁。这样状态永远是一份完整快照，不会出现「补丁丢失」导致的清单错乱。
        </li>
        <li>
          <strong>每项有 content + status</strong>：<code>content</code> 是任务描述，
          <code>status</code> 只有三种取值——<code>pending</code>（待办）、
          <code>in_progress</code>（进行中）、<code>completed</code>（已完成）。
        </li>
        <li>
          <strong>同一时刻最多一个 in_progress</strong>：强制模型一次只专注一件事，不允许并行乱跳。
        </li>
      </ul>

      <Callout variant="tip">
        「同时只能有一个进行中」看似限制，其实是在帮模型聚焦。允许多个并行的话，模型会倾向于把一堆任务全标成
        in_progress 然后东一榔头西一棒槌，最后哪个都没真正做完。一次一件，做完再开下一件——这正是可靠推进长任务的纪律。
      </Callout>

      <p>
        把这三条约束当成一台<strong>状态机</strong>来理解会更清楚。每一项任务只在三个状态间单向流转，
        而整张清单要永远满足一条不变量（invariant）：<em>in_progress 的数量不超过 1</em>。
        我们在 execute 里只死守这一条，其余流转都交给模型自己拿捏：
      </p>

      <CodeBlock lang="ts" title="任务状态机与唯一不变量" code={stateMachineCode} />

      <p>
        为什么<strong>只</strong>校验这一条、不把状态机写死成「pending 必须先变 in_progress 才能 completed」这种严格的转移表？
        因为约束越多，模型越容易被规则绊倒：它可能合理地想「这一项我看一眼就知道早做完了，直接标 completed」，
        若你强制它必须先 in_progress 再 completed，反而逼它多调一次工具、徒增噪声。
        <strong>工程经验是：对模型只设「最小必要约束」，把不变量守住即可，不要替它规划每一步合法路径。</strong>
      </p>

      <Callout variant="warn">
        常见误区：以为 status 的 enum 限制能挡住一切非法状态。enum 只能保证「单项的值合法」，
        挡不住「整张清单的组合非法」（比如两个 in_progress）。前者靠 schema，后者必须靠 execute 里的运行时校验——
        <strong>schema 管单点合法，业务不变量得自己在代码里兜。</strong>这是写工具时极易踩的边界。
      </Callout>

      <h2>三、共享状态：清单存在哪里</h2>
      <p>
        清单要有个地方存。工具本身应当是无状态的（每次调用都是纯函数式的输入到输出），所以状态得放在外面——我们做一个
        <code>TodoStore</code>。工具往里写，CLI 也能读出来展示给用户看。
      </p>

      <CodeBlock lang="ts" title="src/todo.ts" code={todoStoreCode} />

      <p>
        为什么要把状态独立成一个 store？因为有两方都要碰它：<code>todo_write</code> 工具负责写入，
        而 CLI 在每轮渲染时要读出来显示进度。把状态收拢到一个对象里，两边共享同一份数据，不会各执一份导致不一致。
      </p>
      <p>
        <code>render()</code> 做的事很简单：把每项的状态映射成醒目的标记——
        <code>{'[ ]'}</code> 待办、<code>{'[~]'}</code> 进行中、<code>{'[x]'}</code> 已完成，
        再逐行拼成一段文本。无论是回灌给模型还是打印给用户，看的都是这同一份渲染结果。
      </p>

      <Callout variant="note">
        为什么用「覆盖式写入」而不是「增量补丁」？因为模型是个不可靠的增量来源——它经常只想着改一项、忘了带上其余项。
        覆盖式让每次调用都是一份<strong>自洽的完整快照</strong>，杜绝了「补丁丢失」导致清单残缺。看一眼对比就懂：
      </Callout>

      <CodeBlock lang="ts" title="增量 vs 覆盖" code={badVsGoodCode} />

      <p>
        这其实是分布式与状态同步里的老智慧：<strong>传完整状态（state）比传变更事件（diff）更难出错</strong>。
        diff 要求双方对「基准版本」有共识，一旦丢一条就全乱；而每次传全量状态，最新一次永远是权威，天然幂等、可重放。
        代价是每次多传一点数据——对一份十来项的清单，这点开销完全可以忽略。
      </p>

      <h2>四、工具实现</h2>
      <p>下面是完整的工具实现。注意它用了一个工厂函数，把 store 注入进来：</p>

      <CodeBlock lang="ts" title="src/tools/todo.ts" code={todoToolCode} />

      <p>逐段拆解：</p>
      <ul>
        <li>
          <strong>工厂函数 makeTodoTool(store)</strong>：工具对象本身要保持无状态，但它又必须能访问那份共享清单。
          办法就是用工厂——把 <code>store</code> 当参数注入，闭包里持有引用，于是返回的工具既「无自身状态」又能读写外部的 store。
        </li>
        <li>
          <strong>description 是给模型立的规矩</strong>：覆盖式写入、最多一个进行中、别拿来记琐碎的单步任务。
          模型读到这些文字就知道该怎么用、什么时候不该用——这是工具自带的「使用说明书」。
        </li>
        <li>
          <strong>inputSchema 用 enum 锁死 status</strong>：把 <code>status</code> 限定为那三个合法值，模型无法瞎填别的字符串。
        </li>
        <li>
          <strong>execute 里校验并回灌</strong>：先数一遍有几个 <code>in_progress</code>，超过一个就报错让它重来；
          通过校验后写入 store，并把渲染后的清单作为返回值回灌给模型——模型据此知道「现在进度到哪了」。
        </li>
        <li>
          <strong>readOnly: true</strong>：它不碰文件系统、不产生副作用，纯粹是在组织自己的思路，因此可以不经用户确认、静默执行。
        </li>
      </ul>

      <h2>五、接进入口</h2>
      <p>
        和卷 1 里那些无状态工具不同，todo 工具是「有状态」的——它依赖一个活的 <code>TodoStore</code> 实例。
        所以不能像普通工具那样直接塞进静态数组，而要先在 <code>index.ts</code> 里造出 store，再用工厂把工具拼出来：
      </p>

      <CodeBlock lang="ts" title="src/index.ts（装配 todo）" code={wireUpCode} />

      <p>
        这正好呼应卷 1 的工具注册表思路：无状态工具直接列进 <code>ALL_TOOLS</code>，
        而有状态工具用「工厂 + 注入」的方式在装配时动态加入。CLI 之后还能拿着同一个 <code>todos</code> 实例去读清单、渲染进度。
      </p>

      <h2>六、模型实际怎么用它</h2>
      <Example title="模型怎么用它">
        <p>假设用户让 Agent 完成一个三步任务。它的工作节奏大概是这样：</p>
        <ol>
          <li>
            <strong>开局先规划</strong>：调用一次 <code>todo_write</code>，列出 3 项任务——
            第 1 项标 <code>in_progress</code>，其余两项 <code>pending</code>。
          </li>
          <li>
            <strong>动手做第 1 项</strong>：调用其它工具把第一件事真正做掉。
          </li>
          <li>
            <strong>更新清单</strong>：再调一次 <code>todo_write</code>，传完整列表——把第 1 项标
            <code>completed</code>，第 2 项标 <code>in_progress</code>，第 3 项仍 <code>pending</code>。
          </li>
          <li>
            <strong>循环推进</strong>：照这个节奏一路做下去，直到三项全部 <code>completed</code>。
          </li>
        </ol>
        <p>
          关键在于它<strong>边做边更新</strong>：每完成一步就回来改一次清单。用户在屏幕上看到的，
          就是一份不断从 <code>{'[ ]'}</code> 变成 <code>{'[~]'}</code> 再变成 <code>{'[x]'}</code> 的实时进度。
        </p>
      </Example>

      <Callout variant="note">
        要分清楚：清单本身并不「执行」任何事——它不写文件、不调 API，只是模型的<strong>自我组织</strong>。
        它帮模型把注意力一次聚焦在一件事上，也帮用户看清 Agent 此刻在干什么、走到哪一步了。真正干活的，永远是别的那些工具。
      </Callout>

      <h2>七、什么时候<em>不</em>该用清单，以及几个实战坑</h2>
      <p>
        清单不是免费的——每次 todo_write 都占一次工具调用、占一段上下文。用得不对，它从「助力」变成「噪声」。
        几条来自实战的经验：
      </p>
      <ul>
        <li>
          <strong>单步、琐碎任务别列清单</strong>：用户就让你「把这个变量改个名」，你还郑重其事列一条 todo，纯属仪式感，
          反而让用户觉得啰嗦。description 里那句「不要用于琐碎的单步任务」就是在拦这种情况。
        </li>
        <li>
          <strong>清单粒度别太细</strong>：把「打开文件」「读第 10 行」也列成一项，清单会膨胀成流水账，模型每轮都要重读一长串，
          得不偿失。一项应该是一个<em>有意义的里程碑</em>（「实现登录接口」），而不是一次工具调用。
        </li>
        <li>
          <strong>别忘了收尾</strong>：模型有时做完最后一步就直接收工，忘了把最后一项标 completed，留下一个「永远进行中」的尾巴。
          这不影响功能，但用户看着别扭。好的 system prompt 会提醒它「全部做完后确认清单已清零」。
        </li>
        <li>
          <strong>计划会变</strong>：做到一半发现还需要两步，正确做法是重新 todo_write 传一份<em>加长了</em>的完整清单，
          而不是硬塞进原计划。清单是活的，允许它随认知更新而生长。
        </li>
      </ul>

      <Callout variant="tip">
        一个判断标准：<strong>任务步数 &ge; 3 且彼此有依赖、或者预计要跨多轮工具调用</strong>，就值得开清单；
        否则直接做。把清单当成「给复杂任务上的安全带」，而不是每次出门都系的紧箍咒。
      </Callout>

      <h2>八、衔接下一章</h2>
      <p>
        有了清单，长任务就不容易跑偏了。但还差一层：清单解决的是「逐项推进」，却没解决「整体方案对不对」。
        对一个复杂任务，最好的做法是<strong>先把整体方案想清楚、跟用户对齐，再动手</strong>，
        而不是上来就边做边改。这就是下一章要做的——计划模式。
      </p>

      <KeyIdea>
        清单让你「一步一步走得稳」，计划让你「动手前先想清整条路」——两者配合，Agent 才既不跑偏也不蛮干。
      </KeyIdea>

      <Summary
        points={[
          'todo_write 给 Agent 一份待办清单，逼它先拆解、再逐项推进、进度全程可见。',
          '三条硬规矩：覆盖式写入、每项有 content + status、同一时刻最多一个 in_progress。',
          '状态独立成 TodoStore：工具往里写、CLI 读出来展示；render 把状态映射成 [ ] [~] [x] 标记。',
          '工具用工厂函数 makeTodoTool(store) 注入状态，保持自身无副作用，标记 readOnly 可静默执行。',
          '有状态工具在 index.ts 里用「工厂 + 注入」装配，呼应卷 1 的工具注册表。',
          '清单是自我组织而非执行；下一章用计划模式补上「动手前先想清整体方案」这一环。',
        ]}
      />
    </article>
  )
}
