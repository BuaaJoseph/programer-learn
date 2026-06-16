import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const pkgScript = `"test": "node --import tsx --test test/*.test.ts"`

const toolsTest = `import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readTool } from '../src/tools/read.js'
import { writeTool } from '../src/tools/write.js'
import { editTool } from '../src/tools/edit.js'

// 工具单测：在临时目录里跑真实的文件读写，验证行为契约。
function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'forge-'))
}

test('write 后 read 能读回内容', async () => {
  const cwd = tmp()
  await writeTool.execute({ path: 'a.txt', content: 'hello' }, { cwd })
  const r = await readTool.execute({ path: 'a.txt' }, { cwd })
  assert.match(r.output, /hello/)
})

test('edit 要求 oldString 唯一：多处命中应报错', async () => {
  const cwd = tmp()
  writeFileSync(join(cwd, 'a.txt'), 'x\\nx\\n')
  const r = await editTool.execute({ path: 'a.txt', oldString: 'x', newString: 'y' }, { cwd })
  assert.equal(r.isError, true)
})

test('edit 唯一命中时正确替换', async () => {
  const cwd = tmp()
  writeFileSync(join(cwd, 'a.txt'), 'foo bar baz')
  const r = await editTool.execute({ path: 'a.txt', oldString: 'bar', newString: 'BAR' }, { cwd })
  assert.notEqual(r.isError, true)
  assert.equal(readFileSync(join(cwd, 'a.txt'), 'utf8'), 'foo BAR baz')
})

test('read 不存在的文件返回错误结果而非抛异常', async () => {
  const cwd = tmp()
  const r = await readTool.execute({ path: 'nope.txt' }, { cwd })
  assert.equal(r.isError, true)
})`

const agentTest = `import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Agent } from '../src/agent.js'
import type { Provider, CompleteParams } from '../src/provider/types.js'
import type { AssistantTurn } from '../src/types.js'
import { writeTool } from '../src/tools/write.js'

// 假 Provider：按脚本依次返回预设回合，完全离线——这样能在没有网络/密钥的情况下测主循环。
class FakeProvider implements Provider {
  readonly model = 'fake'
  readonly contextWindow = 100_000
  private i = 0
  constructor(private turns: AssistantTurn[]) {}
  async complete(_p: CompleteParams): Promise<AssistantTurn> {
    return this.turns[this.i++]
  }
  async countTokens(): Promise<number> {
    return 0
  }
}

test('主循环：纯文本回合即停机', async () => {
  const provider = new FakeProvider([
    { content: [{ type: 'text', text: '你好' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({ provider, tools: [], system: '', cwd: process.cwd() })
  const out = await agent.runTurn('hi')
  assert.equal(out, '你好')
})

test('主循环：执行工具后再停机', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'forge-'))
  const provider = new FakeProvider([
    {
      content: [{ type: 'tool_use', id: 't1', name: 'write', input: { path: 'a.txt', content: 'hi' } }],
      stopReason: 'tool_use',
      usage: { inputTokens: 1, outputTokens: 1 },
    },
    { content: [{ type: 'text', text: '写好了' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({
    provider,
    tools: [writeTool],
    system: '',
    cwd,
    // 测试里放行所有操作，避免卡在确认。
    permissions: { decide: () => ({ decision: 'allow', reason: '' }) },
  })
  const out = await agent.runTurn('写个文件')
  assert.equal(out, '写好了')
})

test('权限为 ask 且无 confirm 时拒绝执行', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'forge-'))
  const provider = new FakeProvider([
    {
      content: [{ type: 'tool_use', id: 't1', name: 'write', input: { path: 'a.txt', content: 'hi' } }],
      stopReason: 'tool_use',
      usage: { inputTokens: 1, outputTokens: 1 },
    },
    { content: [{ type: 'text', text: '没写成' }], stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
  ])
  const agent = new Agent({
    provider,
    tools: [writeTool],
    system: '',
    cwd,
    permissions: { decide: () => ({ decision: 'ask', reason: '写文件' }) },
    // 不提供 confirm：ask 应被视为拒绝
  })
  const out = await agent.runTurn('写个文件')
  assert.equal(out, '没写成')
})`

const runTest = `npm test`

const testOutput = `> forge@0.7.0 test
> node --import tsx --test test/*.test.ts

✔ write 后 read 能读回内容 (3.21ms)
✔ edit 要求 oldString 唯一：多处命中应报错 (1.08ms)
✔ edit 唯一命中时正确替换 (1.44ms)
✔ read 不存在的文件返回错误结果而非抛异常 (0.92ms)
✔ 主循环：纯文本回合即停机 (2.10ms)
✔ 主循环：执行工具后再停机 (3.67ms)
✔ 权限为 ask 且无 confirm 时拒绝执行 (2.55ms)

ℹ tests 7
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ duration_ms 142.3`

export default function Ch4() {
  return (
    <article>
      <Lead>
        没有测试的 Agent，你不敢重构、不敢发布——因为它会自己改代码、跑命令，一处退化就可能闹出大事。
        但好消息是：forge 的核心是确定性的。主循环、权限闸门、工具行为，给定输入就有确定输出，
        完全可以写成自动化测试。这一章我们用 Node 内置的测试运行器，给 Agent 织一张安全网。
      </Lead>

      <h2>为什么 Agent 一定要测</h2>
      <p>
        Agent 的回归风险比普通程序高一截。它会读写你的文件、执行 shell 命令、修改源码——
        一个工具行为悄悄变了，可能要等到它把某个文件改坏了你才发现。手动验证又特别累：
        每次改动都要起一个真实会话，喂一段对话，盯着它一步步走完。这种验证既慢又不可复现。
      </p>
      <p>
        关键在于看清哪些部分是确定性的。模型说什么我们控制不了，但模型之外的那一圈——
        主循环什么时候停机、权限怎么裁决、工具读写出什么结果——全都是普通的 TypeScript 逻辑，
        给定输入必有确定输出。这部分不测，等于把最该守住的地基交给运气。
      </p>

      <KeyIdea>
        能测的部分一定要测。主循环、权限、工具是确定性的——别让它们悄悄退化。
        不确定的（模型具体吐什么字）才交给运行时，确定的（流程与行为）交给测试。
      </KeyIdea>

      <h2>工具怎么测：在临时目录里跑真实读写</h2>
      <p>
        工具是 Agent 最贴近副作用的部分，恰恰也最好测：在一个临时目录里跑真实的文件读写，
        然后断言行为符合契约。我们不引第三方测试框架，直接用 Node 自带的{' '}
        <code>node:test</code> + <code>node:assert</code>，再配 <code>tsx</code> 直接跑 TypeScript。
        先看 <code>package.json</code> 里的 test 脚本：
      </p>

      <CodeBlock lang="json" title="package.json（test 脚本）" code={pkgScript} />

      <p>
        这一行有两个关键开关：<code>node --import tsx</code> 让测试运行器在加载时即时编译 TS，
        于是测试文件可以直接写 <code>.ts</code>、直接 import 项目里的 TS 模块；
        <code>--test</code> 是 Node 内置的测试运行器，会自动发现并跑匹配到的文件。
        零额外测试框架，零配置文件——这正是我们想要的轻量。
      </p>

      <CodeBlock lang="ts" title="test/tools.test.ts" code={toolsTest} />

      <p>逐段拆开看它在测什么：</p>
      <ul>
        <li>
          <code>tmp()</code> 用 <code>mkdtempSync</code> 建一个独立的临时目录。每个测试在自己的目录里跑，
          副作用互不干扰，跑完也不会污染仓库。
        </li>
        <li>
          <strong>写读往返</strong>：先 <code>writeTool</code> 写入，再 <code>readTool</code> 读回，
          断言内容能匹配上。这是工具最基本的契约。
        </li>
        <li>
          <strong>edit 唯一性约束</strong>：当 <code>oldString</code> 在文件里命中多处时，
          edit 必须报错而不是乱改——我们写入 <code>{'x\\nx\\n'}</code> 制造两处命中，断言{' '}
          <code>{'r.isError === true'}</code>。
        </li>
        <li>
          <strong>edit 正确替换</strong>：唯一命中时，替换结果必须精确，读回文件断言成{' '}
          <code>{'foo BAR baz'}</code>。
        </li>
        <li>
          <strong>失败不抛异常</strong>：读一个不存在的文件，工具应返回 <code>{'isError'}</code> 结果，
          而不是抛出异常崩掉主循环——这正是卷 1 给所有工具定下的契约：失败要变成可喂回模型的结果。
        </li>
      </ul>

      <h2>主循环集成测试：关键是「假 Provider」</h2>
      <p>
        测主循环就麻烦在 Provider 身上：真实 Provider 要联网、要密钥、返回还不确定。
        把这些塞进测试，结果就是又慢又脆又跑不动 CI。
        办法是给主循环喂一个<strong>假 Provider</strong>——它实现同样的接口，但不联网，
        而是按一份预先写好的脚本，一轮一轮返回我们设计好的回合。这样整条主循环完全离线、完全确定。
      </p>

      <CodeBlock lang="ts" title="test/agent.test.ts" code={agentTest} />

      <p>逐段讲解：</p>
      <ul>
        <li>
          <code>FakeProvider</code> 实现了 <code>Provider</code> 接口的四样东西：
          <code>model</code>、<code>contextWindow</code>、<code>complete</code>、<code>countTokens</code>——
          正好呼应卷 6 定下的抽象。<code>complete</code> 不联网，而是从构造时传入的数组里
          按下标依次取出下一回合。
        </li>
        <li>
          <strong>纯文本回合即停</strong>：脚本只有一个 <code>end_turn</code> 回合，
          断言主循环看到纯文本就停机，把文本作为结果返回。
        </li>
        <li>
          <strong>执行工具后再停</strong>：脚本是「先 tool_use 让它写文件，再 end_turn」两回合，
          权限全放行，断言主循环执行了工具、喂回结果、最后停在第二回合的文本上。
        </li>
        <li>
          <strong>ask 无 confirm 则拒绝</strong>：权限裁决返回 <code>ask</code> 但没提供 confirm 回调，
          主循环应当把它当作拒绝、不执行工具，最终走到「没写成」。
        </li>
      </ul>
      <p>
        这三个测试正好覆盖了主循环的三大核心行为：<strong>停机条件、工具执行、权限闸门</strong>。
        而能用一个几十行的假 Provider 就把整条主循环测起来，全靠卷 1 / 卷 6 那层 Provider 抽象——
        把「怎么拿到下一回合」抽象成接口，测试时就能换成离线脚本。这就是好设计在测试阶段的回报。
      </p>

      <Example title="跑一次测试">
        <p>一条命令把全部测试跑起来：</p>
        <CodeBlock lang="bash" code={runTest} />
        <p>输出大致长这样，最后几行是汇总，7 个测试全绿：</p>
        <CodeBlock lang="text" code={testOutput} />
      </Example>

      <Callout variant="tip">
        测试策略：确定性的核心都要测——工具、主循环、权限裁决、压缩触发条件。
        但不要去断言「模型说了什么」（那是不确定的），而要断言「行为/流程对不对」：
        该停的时候停没停、该执行的工具执行没执行、该拦的操作拦没拦。盯流程，不盯文案。
      </Callout>

      <Callout variant="note">
        有了这张网，卷 8 发布前就能用 <code>npm test</code> 一键把关，不让退化溜进 release。
        它也为毕业项目「用 forge 改造 forge」兜底：让 Agent 改完代码，紧接着跑一遍测试，
        立刻知道有没有把东西弄坏——这正是敢让 Agent 动自己代码的底气。
      </Callout>

      <h2>卷 7 小结</h2>
      <p>
        这一卷我们把 forge 从「能跑」推向「敢交付」，靠的是四件套：
        <strong>会话持久化</strong>让对话可中断可恢复；<strong>成本与延迟</strong>让每次调用心里有数；
        <strong>可观测性</strong>让出问题时有迹可循；<strong>测试</strong>让重构和发布有安全网。
        这四样都不改变 Agent「能做什么」，但决定了它能不能放心地交到别人手里。
      </p>

      <KeyIdea>
        会话持久化 + 成本延迟 + 可观测性 + 测试，这四件套是把工具从「能跑的玩具」
        推到「敢交付的产品」的那道坎。下一卷，我们给 forge 打包、发布。
      </KeyIdea>

      <Summary
        points={[
          'Agent 回归风险高（会改代码、跑命令），但核心逻辑是确定性的，必须测。',
          '工具单测：用 node:test + node:assert + tsx，在临时目录里跑真实读写，断言写读往返、edit 唯一性、失败返回 isError 而非抛异常等契约。',
          'test 脚本 node --import tsx --test test/*.test.ts，零额外测试框架。',
          '主循环集成测试靠「假 Provider」：实现 Provider 接口、按脚本离线返回回合，覆盖停机、工具执行、权限闸门三大行为。',
          '假 Provider 能成立，全靠卷 1 / 卷 6 的 Provider 抽象——好设计的回报。',
          '测确定性的核心（工具、主循环、权限、压缩），断言行为而非模型文案。',
          '卷 7 四件套（持久化 + 成本延迟 + 可观测性 + 测试）把 forge 推到「敢交付」，下一卷打包发布。',
        ]}
      />
    </article>
  )
}
