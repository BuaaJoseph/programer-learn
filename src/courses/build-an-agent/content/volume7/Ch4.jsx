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

const snapshotTest = `import { test, snapshot } from 'node:test'
import { renderToolLine } from '../src/render.js'

// 快照测试：把"渲染出来长啥样"钉死。改动若让输出变了，diff 会立刻报出来。
test('工具调用行渲染快照', (t) => {
  const line = renderToolLine({ name: 'edit', input: { path: 'src/a.ts' } })
  // 第一次跑生成快照文件；之后跑比对，不一致即 fail
  t.assert.snapshot(line)
})`

const propertyTest = `// 属性测试：不写死具体例子，而是断言"对任意输入都成立的不变量"
test('edit 替换后，oldString 不再出现且长度变化符合预期', () => {
  for (const [text, oldS, newS] of cases()) {
    const cwd = tmp()
    writeFileSync(join(cwd, 'a.txt'), text)
    const before = (text.match(new RegExp(escape(oldS), 'g')) ?? []).length
    if (before !== 1) continue // 只测唯一命中
    editTool.execute({ path: 'a.txt', oldString: oldS, newString: newS }, { cwd })
    const after = readFileSync(join(cwd, 'a.txt'), 'utf8')
    // 不变量：恰好替换一处，长度变化 = newS.length - oldS.length
    assert.equal(after.length, text.length + (newS.length - oldS.length))
  }
})`

const ciYaml = `name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test
      # 注意：没有任何 API key——假 Provider 让测试完全离线，CI 才能稳定跑`

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

      <h2>Agent 测试的根本难题：非确定性</h2>
      <p>
        在动手前必须把这个坎讲透，否则你会写出一堆「时灵时不灵」的脆弱测试。普通函数测试的黄金假设是
        <strong>「同输入同输出」</strong>，可 LLM 偏偏违背它：同一句 prompt 调两次，措辞会不同、有时甚至连「调不调工具」
        都不一样。这意味着——
      </p>
      <ul>
        <li><strong>不能断言模型说了什么</strong>：<code>assert.equal(out, '已修改 port')</code> 这种断言注定时不时挂，因为措辞本就会变。</li>
        <li><strong>不能在 CI 里真调模型</strong>：要联网、要密钥、要花钱、还慢，而且因为输出不稳定，挂了你都分不清是「真退化」还是「模型今天换了个说法」。</li>
        <li><strong>不能依赖外部环境</strong>：网络抖一下、限流一下，测试就红，CI 根本没法当门禁用。</li>
      </ul>
      <p>
        破解之道是把「确定的」和「不确定的」<strong>切开</strong>：模型这块用<strong>假 Provider</strong>替换成可控脚本，
        于是整条主循环重新变回「同输入同输出」的确定性系统；而模型本身的质量，交给另一类专门的「评测（eval）」去做，
        不混进单元测试。这条切割线是整章的核心思想。
      </p>
      <table>
        <thead>
          <tr><th>层次</th><th>测什么</th><th>用什么</th><th>进 CI 门禁吗</th></tr>
        </thead>
        <tbody>
          <tr><td>单元/集成</td><td>主循环、权限、工具（确定性）</td><td>假 Provider + node:test</td><td>是，每次必跑</td></tr>
          <tr><td>快照</td><td>渲染输出格式不退化</td><td>node:test 快照</td><td>是</td></tr>
          <tr><td>评测 eval</td><td>真实模型完成任务的质量</td><td>真 Provider + 评分</td><td>否，单独跑、看趋势</td></tr>
        </tbody>
      </table>

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

      <Callout variant="note">
        <strong>为什么用真实文件而不是 mock fs？</strong>因为工具的价值恰恰在「它真能正确操作文件系统」。mock 掉 fs，
        你测的就只是「我以为 fs 怎么工作」，而临时目录里跑真实读写测的是「fs 真的怎么工作」。代价只是几毫秒的磁盘 IO，
        换来的是对真实行为的信心——这笔买卖非常划算。临时目录天然隔离、跑完即弃，不污染仓库，所以「真实」并不等于「危险」。
      </Callout>

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

      <Callout variant="tip">
        <strong>工程经验：优先测边界与错误路径。</strong>「写了能读回」这种 happy path 当然要测，但真正容易退化、
        真正会出事的是<strong>边界</strong>：多处命中、文件不存在、空内容、路径越界。上面四个测里有三个在测错误/边界——
        这个比例是对的。一条朴素的规律：bug 几乎都藏在 <code>if/else</code> 的那个「else」里。
      </Callout>

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

      <Callout variant="note">
        <strong>假 Provider 为什么比「mock 库打桩」更好？</strong>它是一个真实实现了接口的类，类型系统会逼着它和真 Provider
        保持同一个契约——接口一改，假 Provider 编译不过，你立刻知道要同步。而 mock 库往往用字符串/任意对象打桩，接口漂移了
        它还能「跑过」，给你虚假的安全感。<strong>用真类型约束的假实现 &gt; 无类型的 mock</strong>，这是 TS 项目里很值钱的一条经验。
      </Callout>

      <h2>快照测试：把「长啥样」钉死</h2>
      <p>
        有些东西不好用 <code>assert.equal</code> 一条条写——比如终端渲染出来的那一行带颜色、带截断的输出。
        手写期望值又臭又长，还容易写错。这时用<strong>快照测试</strong>：第一次跑把输出录成快照文件，之后每次跑拿当前输出
        和快照比，<strong>一旦 diff 就报警</strong>。Node 22+ 的 <code>node:test</code> 内置了快照能力：
      </p>
      <CodeBlock lang="ts" title="test/render.test.ts（快照）" code={snapshotTest} />
      <p>
        快照的价值在于「<strong>意外变更会被立刻揪出来</strong>」：你本来只想改个工具逻辑，结果手滑改了渲染格式，
        快照测试当场红给你看。它特别适合守「输出格式」这种「不该变、变了往往是 bug」的东西。
      </p>
      <Callout variant="warn">
        <strong>快照的常见误区：无脑 <code>--update</code>。</strong>快照红了，正确动作是<strong>看 diff、判断这变化是不是预期的</strong>——
        是预期的才更新快照，不是预期的就去修代码。养成「红了就 update」的肌肉记忆，快照测试就退化成了橡皮图章，等于没测。
        同理，别给快照里塞时间戳、随机 id 这类<strong>本就会变</strong>的内容，否则它永远红，最后只能被无视。
      </Callout>

      <h2>属性测试：与其举例，不如断言不变量</h2>
      <p>
        逐个写例子总有漏的角落。另一种思路是<strong>属性测试</strong>：不写死「输入 A 得输出 B」，而是断言
        「<strong>对任意合法输入，某个不变量恒成立</strong>」，然后喂一堆随机/构造的输入去撞它。比如 edit 工具有个天然不变量：
        唯一命中替换后，文件长度变化必然等于 <code>{'newString.length - oldString.length'}</code>：
      </p>
      <CodeBlock lang="ts" title="test/edit.property.test.ts（属性测试，示意）" code={propertyTest} />
      <p>
        属性测试常能逼出你举例时根本想不到的边界（空串、超长、含特殊字符）。它不取代举例测试，而是补在它旁边——
        举例测试讲清「典型行为」，属性测试守住「普适规律」。
      </p>

      <Example title="跑一次测试">
        <p>一条命令把全部测试跑起来：</p>
        <CodeBlock lang="bash" code={runTest} />
        <p>输出大致长这样，最后几行是汇总，7 个测试全绿：</p>
        <CodeBlock lang="text" code={testOutput} />
      </Example>

      <h2>接进 CI：每次推送自动把关</h2>
      <p>
        测试的价值在「自动、每次、挡在合并前」。把 <code>npm test</code> 接进 CI，每次 push / PR 自动跑，
        红了就别想合。最关键的一点前面已经埋好了——<strong>因为用了假 Provider，整套测试完全离线，CI 里不需要任何 API key</strong>，
        这才让 CI 能稳定、免费、秒级地跑：
      </p>
      <CodeBlock lang="yaml" title=".github/workflows/ci.yml" code={ciYaml} />
      <p>
        留意 <code>npm ci</code>（而非 <code>npm install</code>）：它严格按 lockfile 装、不改 lockfile，保证 CI 装的依赖和你本地一字不差——
        可复现是 CI 的命根子。再强调一遍那条注释：<strong>没有任何密钥</strong>，正是「确定性切割」带来的红利。
      </p>

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
          '根本难题是非确定性：不能断言模型措辞、不能在 CI 真调模型；解法是切开确定与不确定，模型用假 Provider 替换，质量交给单独的 eval。',
          '工具单测：用 node:test + node:assert + tsx，在临时目录里跑真实读写（不 mock fs），断言写读往返、edit 唯一性、失败返回 isError 而非抛异常等契约，优先测边界与错误路径。',
          'test 脚本 node --import tsx --test test/*.test.ts，零额外测试框架。',
          '主循环集成测试靠「假 Provider」：实现 Provider 接口、按脚本离线返回回合，覆盖停机、工具执行、权限闸门三大行为；类型约束的假实现优于无类型 mock。',
          '快照测试钉死渲染输出格式，红了要看 diff 别无脑 update；属性测试断言不变量、逼出举例想不到的边界。',
          '接 CI（npm ci + npm test）每次 push 自动把关；因假 Provider 离线，CI 无需任何 API key。',
          '卷 7 四件套（持久化 + 成本延迟 + 可观测性 + 测试）把 forge 推到「敢交付」，下一卷打包发布。',
        ]}
      />
    </article>
  )
}
