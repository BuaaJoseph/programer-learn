import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DispatchLanes from '@/courses/build-an-agent/illustrations/DispatchLanes.jsx'

const runToolsSrc = `// 工具调度：把一轮里的工具调用按「只读」分两组。
// 只读的并发执行（互不影响、省时间）；写的串行执行（会改状态、保一致性）。
private async runTools(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]> {
  const reads = toolUses.filter((t) => this.registry.get(t.name)?.readOnly)
  const writes = toolUses.filter((t) => !this.registry.get(t.name)?.readOnly)

  const readResults = await Promise.all(reads.map((t) => this.execOne(t)))
  const writeResults: ToolResultBlock[] = []
  for (const t of writes) writeResults.push(await this.execOne(t))

  // 回灌顺序按模型原始调用顺序排列，便于它对应。
  const byId = new Map<string, ToolResultBlock>()
  for (const r of [...readResults, ...writeResults]) byId.set(r.tool_use_id, r)
  return toolUses.map((t) => byId.get(t.id)!)
}`

const execOneSrc = `private async execOne(call: ToolUseBlock): Promise<ToolResultBlock> {
  const tool = this.registry.get(call.name)
  this.onEvent?.({ type: 'tool_start', name: call.name, input: call.input })
  if (!tool) {
    const msg = \`未知工具：\${call.name}\`
    this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
    return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
  }
  try {
    const r = await tool.execute(call.input, this.ctx)
    this.onEvent?.({ type: 'tool_end', name: call.name, output: r.output, isError: !!r.isError })
    return { type: 'tool_result', tool_use_id: call.id, content: r.output, is_error: r.isError }
  } catch (err) {
    const msg = \`工具异常：\${(err as Error).message}\`
    this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
    return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
  }
}`

export default function Ch6() {
  return (
    <>
      <Lead>
        <p>
          前几章我们把零件都打齐了：模型会一轮回复里点名工具（卷 1-1），工具有统一的 <code>Tool</code> 接口和
          <code>readOnly</code> 标记（卷 1-2），主循环会把工具结果回灌再续聊（卷 1-3），读工具能看（卷 1-4）、
          写工具能动（卷 1-5）。但有一个问题一直被我们悄悄绕过去：当模型在<strong>同一轮</strong>里一口气点名了好几个工具——
          同时 <code>read</code> 三个文件、再顺手 <code>edit</code> 一个——forge 到底该<strong>怎么执行它们</strong>？
          全串行？太慢。全并行？写操作会打架。这一章是第 1 卷的收尾，我们把「工具调度」这条规则讲透，
          并落到主循环里那段真实的 <code>runTools</code> 代码上。
        </p>
      </Lead>

      <h2>问题：一轮里来了好几个工具调用</h2>
      <p>
        回忆一下消息的结构。模型一轮回复里，<code>content</code> 可以同时塞进<strong>多个</strong> <code>tool_use</code> 块。
        这不是边角情况，而是常态：你让 forge「看看这个项目用了哪些测试框架」，它很可能一轮就发出
        <code>read package.json</code>、<code>glob **/*.test.ts</code>、<code>grep "describe"</code> 三个调用——
        因为它知道这三件事互不依赖，没必要分三轮来回。问题随之而来：拿到这一串调用，我们怎么跑？
      </p>
      <ul>
        <li>
          <strong>全部串行</strong>（一个 <code>await</code> 完再下一个）：正确，但慢。三个只读调用各自要等磁盘/进程，
          排队跑就是 1+1+1 的时间，白白浪费了它们本可以同时进行的事实。
        </li>
        <li>
          <strong>全部并行</strong>（一股脑 <code>Promise.all</code>）：快，但危险。如果这一轮里有两个<strong>写</strong>操作——
          比如同时 <code>edit</code> 同一个文件——它们并发跑就会<strong>互相覆盖、产生竞态</strong>，
          谁后写谁赢，结果不可预测。
        </li>
      </ul>
      <p>
        两个极端都不对。出路在于：<strong>不能一刀切，要看工具会不会改变状态</strong>。
      </p>

      <KeyIdea title="按「会不会改变状态」分流：只读并行、写串行">
        <p>
          调度的核心规则只有一句：<strong>只读工具之间互不影响，可以并行；写工具会改变磁盘状态，必须串行。</strong>
          只读工具（<code>read</code> / <code>list</code> / <code>glob</code> / <code>grep</code>）无论怎么并发、顺序怎么乱，
          结果都一样、世界纹丝不动——它们<strong>幂等、无副作用</strong>，所以尽管一起跑，省时间。
          写工具（<code>write</code> / <code>edit</code> / <code>bash</code>）每跑一次世界就变一次，两个并发就可能打架——
          所以一个改完再做下一个，保一致性。
          这正是卷 1-2 给 <code>Tool</code> 接口埋下 <code>readOnly</code> 字段的<strong>真正理由</strong>：
          它不是个无关紧要的元数据，而是调度器分流的<strong>唯一依据</strong>。
        </p>
      </KeyIdea>

      <p>
        下面这张图把三种情况摆出来，你可以切换「混合一轮 / 只读并行 / 写串行」感受调度器的分流逻辑。
      </p>

      <DispatchLanes />

      <h2>runTools：把一轮调用分两条道跑</h2>
      <p>
        这段调度代码住在 <code>src/agent.ts</code> 里，卷 1-3 讲主循环时它作为整体一闪而过；现在我们聚焦它本身，逐行拆。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts · runTools 调度" code={runToolsSrc} />

      <p>它分四步走，每一步都对应上面那条规则的一半：</p>
      <ol>
        <li>
          <strong>分组。</strong>用 <code>this.registry.get(t.name)?.readOnly</code> 去注册表里查每个工具的
          <code>readOnly</code> 标记，把这一轮的 <code>toolUses</code> 切成 <code>reads</code> 和 <code>writes</code> 两堆。
          注意那个 <code>?.</code>：如果模型点了个不存在的工具名，<code>get</code> 返回 <code>undefined</code>，
          <code>?.readOnly</code> 也就是 <code>undefined</code>（falsy），于是它会被归进 <code>writes</code>——
          按写来跑（串行），稳妥；真正的「未知工具」错误留给下一段的 <code>execOne</code> 处理。
        </li>
        <li>
          <strong>只读并发。</strong><code>Promise.all(reads.map((t) =&gt; this.execOne(t)))</code>：
          把所有只读调用<strong>同时</strong>发出去，一起等它们回来。这一步是省时间的关键——三个 read 不再排队，墙钟时间约等于最慢的那一个。
        </li>
        <li>
          <strong>写串行。</strong>用普通的 <code>for</code> 循环，<code>writeResults.push(await this.execOne(t))</code>：
          每一个都 <code>await</code> 到完成，再做下一个。这里<strong>故意不用</strong> <code>Promise.all</code>——
          串行正是我们要的，前一个写操作落盘了，后一个才开始，杜绝竞态。
        </li>
        <li>
          <strong>按原顺序回灌。</strong>这是最容易被忽略、却很要紧的一步。我们分两堆跑，结果天然就是
          「先所有 read、再所有 write」的顺序，跟模型原始的调用顺序很可能<strong>不一致</strong>。
          于是先建一个 <code>id → result</code> 的 <code>Map</code>（<code>byId</code>），把两堆结果都灌进去，
          再 <code>toolUses.map((t) =&gt; byId.get(t.id)!)</code>——<strong>照模型原始的 <code>toolUses</code> 顺序</strong>
          把结果重新排好。为什么顺序重要？因为模型是按它发出的次序来对应「哪个结果对应哪个调用」的，
          顺序对上了它才不容易错位理解。
        </li>
      </ol>

      <h2>execOne：一个工具失败，绝不炸掉整个循环</h2>
      <p>
        <code>runTools</code> 把每个调用都交给 <code>execOne</code> 去真正执行。这个函数的全部价值在于<strong>健壮</strong>——
        它必须保证：无论这个工具是不存在、还是执行时抛了异常，<strong>都得回一个规规矩矩的 <code>tool_result</code> 回来</strong>，
        而不是让异常往上冒、把这一轮甚至整个主循环掀翻。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts · execOne" code={execOneSrc} />

      <p>盯着它处理的三种结局：</p>
      <ul>
        <li>
          <strong>未知工具名。</strong>从注册表 <code>get</code> 不到，说明模型点了个根本不存在的工具。
          这时<strong>不能</strong>抛错挂掉，而是构造一个 <code>is_error: true</code> 的 <code>tool_result</code>，
          内容写明「未知工具：xxx」回灌给模型——模型读到这条错误，自己就明白「哦这个工具没有」，下一轮换别的。
        </li>
        <li>
          <strong>工具内部抛异常。</strong><code>try</code> 包住 <code>tool.execute(...)</code>，一旦工具实现里抛了异常
          （比如某个 bug、某次意外的 I/O 错误），<code>catch</code> 把它接住，转成
          <code>工具异常：&lt;message&gt;</code> 的 <code>is_error</code> 结果回灌。同样是「失败也如实告诉模型」，而不是让程序崩。
        </li>
        <li>
          <strong>正常执行。</strong>工具自己返回的 <code>r.isError</code>（比如 edit 没找到 oldString、bash 非零退出）
          也照实带进 <code>tool_result</code> 的 <code>is_error</code> 里——这些是「工具跑了但结果是失败」，一并交给模型判断。
        </li>
      </ul>
      <p>
        另外注意每一条路径上都成对地发了 <code>onEvent</code> 的 <code>tool_start</code> / <code>tool_end</code> 事件。
        这是给 CLI 层展示用的钩子——「正在执行 read a.ts……」「edit 完成」这类实时反馈，
        就靠这两个事件喂出去（卷 2 做 CLI 时会接上它）。它和调度逻辑解耦：<code>execOne</code> 只管「发生了什么」，怎么显示是上层的事。
      </p>

      <Callout variant="note" title="tool_result 的硬性配对：id 要对上，数量要相等">
        <p>
          这是 Messages API 雷打不动的规矩，写工具调度时必须时刻记牢两条：
        </p>
        <p>
          <strong>一、每个 <code>tool_result</code> 必须带回对应 <code>tool_use</code> 的 id</strong>
          （字段叫 <code>tool_use_id</code>，要等于那个调用的 <code>id</code>）。模型就靠这个 id 把「结果」和「我当初发的哪个调用」对上号。
          <strong>二、一轮里有几个 <code>tool_use</code>，下一轮就必须回几个 <code>tool_result</code></strong>，一个都不能少。
          少一个、或 id 对不上，模型那边（API）直接报错，这一轮就废了。
          回头看 <code>execOne</code> 为什么连「未知工具」「抛异常」都要老老实实造一个 <code>tool_result</code> 返回——
          正是为了凑齐这个配对：宁可回一条错误，也绝不能漏回。
        </p>
      </Callout>

      <Callout variant="warn" title="进阶坑：「只读并行」的前提是只读工具真的没副作用">
        <p>
          我们敢把只读工具一股脑并发，靠的是一个隐含假设：<strong>这些工具之间互不影响</strong>。
          这个假设现在成立，是因为 <code>read</code> / <code>list</code> / <code>glob</code> / <code>grep</code> 全都<strong>只看不写</strong>——
          不碰磁盘状态，并发一百个也乱不了。但这是<strong>约定</strong>，不是机制保证的。
          假如哪天你新增一个工具，名义上标了 <code>readOnly: true</code>，实际却偷偷写了缓存文件、改了某个全局变量、
          或发了个有副作用的网络请求——它一旦被归进只读道并发执行，就可能和别的工具撞车，重现你以为已经避开的竞态。
          所以一条铁律：<strong><code>readOnly</code> 字段必须诚实标注</strong>。只要一个工具会改变任何状态，它就该是
          <code>readOnly: false</code>，老老实实走串行道——哪怕慢一点。调度器信任这个标记，你就不能骗它。
        </p>
      </Callout>

      <Example title="一轮混合调用的执行顺序">
        <p>
          把规则落到一个具体例子上。假设模型在某一轮里一口气发了三个调用，顺序是：
          <code>read a.ts</code>、<code>grep "foo"</code>、<code>edit b.ts</code>。forge 的 <code>runTools</code> 会这样处理：
        </p>
        <ol>
          <li>
            <strong>分组。</strong>查 <code>readOnly</code>：<code>read</code> 和 <code>grep</code> 是只读，进 <code>reads</code>；
            <code>edit</code> 是写，进 <code>writes</code>。
          </li>
          <li>
            <strong>只读并发。</strong><code>read a.ts</code> 和 <code>grep "foo"</code> 用 <code>Promise.all</code>
            <strong>同时</strong>跑，谁先回来不一定，但一起等齐。
          </li>
          <li>
            <strong>写串行。</strong><code>edit b.ts</code> 在 <code>for</code> 循环里单独 <code>await</code> 跑完
            （这轮只有它一个写，但若有第二个写，会等它彻底完成再开始）。
          </li>
          <li>
            <strong>按原顺序回灌。</strong>不管实际跑完的先后，最终回给模型的 <code>tool_result</code> 顺序，
            严格照模型当初发的次序排：<code>a.ts 的结果</code> → <code>"foo" 的结果</code> → <code>b.ts 的结果</code>。
          </li>
        </ol>
        <p>
          于是模型既享受到了只读并发的速度，又不必担心写操作打架，回来的结果顺序还跟它发出的对得上——三个目标同时满足。
        </p>
      </Example>

      <h2>里程碑：第 1 卷到此完成</h2>
      <p>
        走到这里，停下来看看我们造出了什么。从卷 1-1 的「模型会点名工具」，到 1-2 的统一 <code>Tool</code> 接口、
        1-3 的主循环、1-4 的读工具、1-5 的写工具，再到本章的工具调度——这六章拼出来的，是一个<strong>麻雀虽小五脏俱全</strong>的
        Agent 内核：它<strong>能读会写</strong>（read/grep/glob + write/edit/bash），<strong>自己循环</strong>
        （回灌结果、续聊、直到任务完成），还<strong>能并发调度</strong>（只读并行、写串行、按序回灌）。
        这不是个演示玩具，而是一个真能干活的可用内核——你现在就能用它在沙盒目录里改代码、跑测试、自我纠错。
      </p>

      <KeyIdea title="一个能读会写、自己循环、并发调度的可用内核">
        <p>
          第 1 卷的目标是<strong>把 Agent 的本质讲清楚并落地</strong>：所谓 Agent，剥到底就是
          「模型 + 工具 + 一个把工具结果喂回去的循环」。这个内核已经完整了。
          但它现在还很「素」——只能在代码里调用、没有像样的交互界面、输出是一次性蹦出来而非流式、也没有
          <code>/help</code> 之类的斜杠命令。<strong>下一卷</strong>，我们就把这个硬核内核包装成一个真正趁手的 CLI：
          做 REPL 交互、做流式输出（让你看着字一个个冒出来）、做斜杠命令。内核不变，我们给它穿上得体的外衣。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '模型一轮回复可同时点名多个工具（多个 tool_use），这是常态；全串行太慢、全并行写操作会竞态，必须按工具类型分流调度。',
          '调度核心规则：按「会不会改变状态」分流——只读工具幂等无副作用，用 Promise.all 并行省时间；写工具改状态，用 for 循环串行 await 保一致性。这正是 readOnly 字段存在的理由。',
          'runTools 四步：用 registry.get(t.name)?.readOnly 分成 reads/writes；reads 并发、writes 串行；最后用 id→result 的 Map 按模型原始调用顺序重排回灌（顺序对上模型才好对应结果）。',
          '未知工具名因 ?.readOnly 为 falsy 会被归进 writes 走串行，真正的未知工具错误交由 execOne 处理。',
          'execOne 保证健壮：未知工具回一个 is_error 的 tool_result、工具内部抛异常也 catch 转成 is_error 回灌，绝不让单个工具失败炸掉整个循环；并用 onEvent 发 tool_start/tool_end 给 CLI 展示。',
          'Messages API 硬性配对：每个 tool_result 必须带回对应 tool_use 的 id（tool_use_id），且一轮有几个 tool_use 就要回几个 tool_result，缺一个或 id 对不上模型就报错。',
          '「只读并行」的前提是只读工具之间真无副作用——目前 read/list/glob/grep 都不写盘所以成立；若新增工具名义只读却有副作用，并行会出问题，所以 readOnly 必须诚实标注。',
          '里程碑：第 1 卷完成，forge 已是一个能读会写、自己循环、能并发调度的可用内核；下一卷把它包装成像样的 CLI（REPL、流式、斜杠命令）。',
        ]}
      />
    </>
  )
}
