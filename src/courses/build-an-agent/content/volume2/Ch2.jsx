import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const typesSrc = `export interface CompleteParams {
  system: string
  messages: Message[]
  tools: Tool[]
  maxTokens: number
  /** 流式文本回调：每收到一段增量文本就调用一次。用于让回答逐字蹦出来。 */
  onTextDelta?: (delta: string) => void
}`

const completeSrc = `async complete(params: CompleteParams): Promise<AssistantTurn> {
  // 始终走流式：长输出/高 max_tokens 下可避免请求超时，也让回答能逐字呈现。
  const stream = this.client.messages.stream({
    model: this.model,
    max_tokens: params.maxTokens,
    system: params.system,
    messages: params.messages.map(toSdkMessage),
    tools: params.tools.map(toSdkTool),
    // 复杂任务默认开启自适应思考（Opus 4.8 只支持 adaptive 这一种开启方式）。
    thinking: { type: 'adaptive' } as unknown as Anthropic.ThinkingConfigParam,
  })
  if (params.onTextDelta) {
    stream.on('text', (delta) => params.onTextDelta!(delta))
  }
  // finalMessage() 等流结束、拿到拼好的完整消息，再按非流式一样解析。
  const res = await stream.finalMessage()

  const content: ContentBlock[] = []
  for (const block of res.content) {
    if (block.type === 'text') {
      content.push({ type: 'text', text: block.text })
    } else if (block.type === 'tool_use') {
      content.push({
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      })
    }
  }

  return {
    content,
    stopReason: res.stop_reason,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    },
  }
}`

const eventSrc = `export type AgentEvent =
  | { type: 'assistant_delta'; text: string } // 流式增量文本，一段段到达
  | { type: 'assistant_text'; text: string } // 一轮的完整文本（增量结束后）
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; output: string; isError: boolean }`

const callSrc = `const res = await this.provider.complete({
  system: this.system,
  messages: this.messages,
  tools: this.toolList,
  maxTokens: this.maxTokens,
  onTextDelta: (delta) => this.onEvent?.({ type: 'assistant_delta', text: delta }),
})`

const renderSrc = `onEvent: (e) => {
  switch (e.type) {
    case 'assistant_delta':
      // 流式文本：逐段直接写出，造成「一个字一个字蹦出来」的效果。
      process.stdout.write(e.text)
      break
    case 'tool_start':
      process.stdout.write(\`\\n\${DIM}· \${e.name}(\${compact(e.input)})\${RESET}\\n\`)
      break
    case 'tool_end':
      if (e.isError) process.stdout.write(\`\${RED}  ✗ \${truncate(e.output)}\${RESET}\\n\`)
      break
  }
},`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          卷 1 里的 <code>Provider.complete</code> 有一个我们一直没动的行为：它<strong>等模型把一整段回答全部生成完</strong>，
          才一次性 <code>return</code> 给上层。在代码里调用、跑测试时这没什么问题；可一旦把它放进一个要给人用的 CLI，
          这个「等」就刺眼了——你敲下任务、回车，然后盯着一个不动的光标干等十几秒，才「啪」地一下整段文字蹦出来。
          这一章我们把它改成<strong>流式</strong>：模型边生成、forge 边显示，回答一个字一个字往外冒；
          工具调用也实时显示出来。内核的逻辑一行都不改，我们只改「结果是怎么到你眼前的」。
        </p>
      </Lead>

      <h2>为什么要流式</h2>
      <p>
        先想清楚非流式到底差在哪。一次稍微复杂点的回答，模型可能要生成几百上千个 token，这要花十几秒甚至更久。
        非流式模式下，这十几秒里<strong>屏幕上什么都没有</strong>——用户不知道是卡死了、还是在想、还是网断了，只能干等。
        更糟的是长输出场景：当你把 <code>max_tokens</code> 调得很高、让模型写一大段代码或长篇分析时，
        「攒齐再返回」的整段请求很容易<strong>顶到 HTTP 超时</strong>，直接报错收场。
      </p>
      <p>
        流式把这两个问题一起解决。模型那边每生成一小段文本，就立刻通过流推过来，forge 收到就显示——
        于是回答从「等十几秒再整段出现」变成「立刻开始、逐字流出」。对一个交互式工具来说，这不是锦上添花，是体验的分水岭：
        前者像在和一个死机的程序对话，后者像看着对面的人在打字。
      </p>

      <KeyIdea title="流式不改变 Agent 的逻辑，只改变结果怎么到达眼前">
        <p>
          要先把一件事摆正：<strong>流式不动 Agent 的任何决策</strong>。模型点哪些工具、主循环怎么回灌结果、
          什么时候停——这些卷 1 定下的逻辑，流式之后<strong>一字不变</strong>。流式改的只是<strong>「同一段回答，是攒齐了一次性给你，还是边生成边给你」</strong>。
          换句话说，它是一层纯粹的<strong>呈现</strong>改造，发生在「模型已经决定要说什么」之后。
          但别因此小看它——对一个要人盯着用的 CLI 来说，「结果怎么到达眼前」恰恰就是体验的全部。
          内核还是那个内核，我们只是给它换了一种把话说出口的方式。
        </p>
      </KeyIdea>

      <h2>SDK 是怎么做流式的</h2>
      <p>
        好消息是 Anthropic SDK 把流式封装得很顺手，三个动作就够了：
      </p>
      <ul>
        <li>
          <strong>开流。</strong><code>client.messages.stream(params)</code> 的入参和 <code>messages.create</code> 几乎一样，
          但它不返回「一个 Promise 解析成完整消息」，而是返回<strong>一个可监听的流对象</strong>。请求此刻就发出去了，
          模型开始一边生成、一边往这个流里推事件。
        </li>
        <li>
          <strong>监听增量。</strong><code>stream.on('text', delta =&gt; ...)</code> 注册一个回调：
          模型<strong>每生成一段文本</strong>，这个回调就被调用一次，参数 <code>delta</code> 是这一小段新增的文字。
          一次回答的过程中它会被触发很多次，把整段文字切成一连串小片喂给你。
        </li>
        <li>
          <strong>拿完整消息。</strong><code>await stream.finalMessage()</code> 等整个流结束，
          返回一个<strong>拼好的完整 <code>Message</code></strong>——含 <code>content</code>（所有文本块、工具调用块）、
          <code>stop_reason</code>、<code>usage</code>，和非流式那个 <code>Message</code> 长得一模一样。
          于是<strong>拿到它之后的解析逻辑，和卷 1 完全相同</strong>。
        </li>
      </ul>
      <p>
        这套设计很巧：<code>on('text')</code> 负责「实时呈现」，<code>finalMessage()</code> 负责「拿到结果干正事」，
        两条线井水不犯河水。增量只是顺手让用户看个动态，真正喂回主循环的还是那个完整消息。
      </p>

      <Callout variant="tip" title="SDK 的建议：长输入/长输出/高 max_tokens 一律用流式">
        <p>
          Anthropic SDK 的官方建议很直接：<strong>只要请求可能涉及长输入、长输出，或者把 <code>max_tokens</code> 调得很高，就用流式。</strong>
          原因就是前面说的——整段非流式请求在大输出下会撞上 HTTP 超时，而流式因为是边生成边吐字节、连接一直有数据流动，
          能稳稳避开超时。对 forge 这种「模型可能要写一大段代码」的 Agent 来说，流式不是「想要更好体验时的选项」，
          而是<strong>正确性的保障</strong>。所以我们干脆让 <code>complete</code> <strong>始终</strong>走流式，不再保留非流式分支。
        </p>
      </Callout>

      <h2>改造 Provider：先动接口</h2>
      <p>
        动手从最小的地方开始——给 <code>CompleteParams</code> 加一个<strong>可选</strong>回调 <code>onTextDelta</code>。
      </p>

      <CodeBlock lang="ts" title="src/provider/types.ts（节选）" code={typesSrc} />

      <p>
        就加了这一个字段，而且是<strong>可选的</strong>（<code>?</code>）。它的语义是：<strong>「谁调用 <code>complete</code>，谁决定要不要消费增量」</strong>。
        在代码里跑测试、不关心实时显示的调用方，干脆不传 <code>onTextDelta</code>，<code>complete</code> 内部就不会去监听 <code>text</code> 事件，
        行为和以前一样（只是底层换成了流式，但外部感知不到）；而 CLI 这种需要逐字显示的调用方，传一个回调进来，每段增量就会流到它手上。
        接口的改动越小越好，这一个可选回调就够了。
      </p>

      <h2>改造 Provider：再动 Claude 的实现</h2>
      <p>
        接口加好了，落到 Claude Provider 的 <code>complete</code> 方法里。整段改动其实只有上半部分——把发请求的方式从「攒齐」换成「流式」；
        下半部分（解析 <code>content</code>、读 <code>stop_reason</code> 和 <code>usage</code>）和卷 1 一模一样，原封不动。
      </p>

      <CodeBlock lang="ts" title="src/provider/claude.ts（complete 方法）" code={completeSrc} />

      <p>逐段看它做了什么：</p>
      <ul>
        <li>
          <strong>把 <code>messages.create</code> 换成 <code>messages.stream</code>。</strong>入参几乎照搬——同样的
          <code>model</code> / <code>max_tokens</code> / <code>system</code> / <code>messages</code> / <code>tools</code>，
          差别只在返回的是流对象。注释里写明了为什么始终走流式：长输出、高 <code>max_tokens</code> 下能避免请求超时，顺带让回答能逐字呈现。
        </li>
        <li>
          <strong>有回调才监听。</strong><code>if (params.onTextDelta)</code> 这一层判断对应接口的「可选」语义——
          只有上层真的传了回调，才 <code>stream.on('text', ...)</code> 把每段 <code>delta</code> 转交出去；没传就什么都不挂，
          流照样跑，只是没人接增量而已。
        </li>
        <li>
          <strong><code>await stream.finalMessage()</code> 等流结束。</strong>这一行是关键的「合流点」：
          它阻塞到模型把所有 token 都生成完、流彻底结束，然后把这一路推过来的碎片<strong>拼成一个完整的 <code>Message</code></strong> 还给你。
          拿到 <code>res</code> 之后，世界就回到了卷 1 的样子。
        </li>
        <li>
          <strong>后面的解析逐行不变。</strong>遍历 <code>res.content</code>，<code>text</code> 块取 <code>text</code>、
          <code>tool_use</code> 块取 <code>id</code>/<code>name</code>/<code>input</code>，再读 <code>res.stop_reason</code> 和 <code>res.usage</code>——
          这套逻辑你在卷 1-1、1-3 已经见过，这里一字没改。这正印证了上面那句话：<strong>流式只改「怎么到达」，不改「拿到之后怎么处理」</strong>。
        </li>
      </ul>

      <Callout variant="note" title="thinking: {'{ type: \'adaptive\' }'} 那行的类型放行注释">
        <p>
          代码里 <code>thinking</code> 那一行用了
          <code>{'{ type: \'adaptive\' } as unknown as Anthropic.ThinkingConfigParam'}</code>，这个 <code>as unknown as</code> 看着别扭，是有原因的：
          部分版本的 SDK 类型定义里<strong>还没收录 <code>adaptive</code> 这个取值</strong>，直接写会被 TypeScript 报类型错误。
          但运行时 API 是<strong>支持</strong>的——Opus 4.8 开启思考就只有 <code>adaptive</code> 这一种方式。
          所以这里用一次类型断言「放行」，本质是「我知道这个值合法，只是类型表暂时没跟上」。
          等 SDK 类型更新后，这层断言就能去掉了。这不是 hack，是类型定义和实际能力之间短暂的时间差。
        </p>
      </Callout>

      <h2>让增量穿过 Agent 到达 CLI</h2>
      <p>
        Provider 现在会吐增量了，但它只认识 <code>onTextDelta</code> 这个回调；CLI 想要的是<strong>事件</strong>。
        所以增量得借道 Agent 的事件系统——卷 1-6 我们已经有了 <code>tool_start</code> / <code>tool_end</code> 这套
        <code>AgentEvent</code>，现在给它<strong>再添一种</strong>：<code>assistant_delta</code>。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（事件类型 + 调用处）" code={eventSrc} />

      <p>
        注意这里有两个看起来像、其实分工不同的事件：<code>assistant_delta</code> 是<strong>流式增量</strong>，一小段一小段到达，
        用来实时显示；<code>assistant_text</code> 是<strong>这一轮的完整文本</strong>，在增量都结束之后给出，
        用于需要整段文字的场合（比如记日志、写历史）。流式呈现靠前者，逻辑留底靠后者，各司其职。
      </p>
      <p>
        然后在主循环里，把 Provider 的 <code>onTextDelta</code> 接到这个新事件上：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（调用 complete 处）" code={callSrc} />

      <p>
        看那一行 <code>onTextDelta</code>：Provider 每吐一段 <code>delta</code>，Agent 就立刻 <code>onEvent</code> 发一个
        <code>assistant_delta</code> 事件出去。把整条路串起来，就是一条干净的<strong>数据管线</strong>：
      </p>
      <ol>
        <li><strong>SDK 流</strong>——模型生成一段文本，<code>stream.on('text')</code> 触发。</li>
        <li><strong>Provider 的 <code>onTextDelta</code></strong>——把这段 <code>delta</code> 透传给上层。</li>
        <li><strong>Agent 的 <code>onEvent(assistant_delta)</code></strong>——包装成一个事件发出去。</li>
        <li><strong>CLI 渲染器</strong>——收到事件，写到屏幕上。</li>
      </ol>

      <KeyIdea title="分层回调：每一层只透传、不耦合">
        <p>
          这条管线最值得玩味的地方，是<strong>每一层都只做透传，谁都不知道下游具体是谁</strong>。
          Provider 不知道 <code>onTextDelta</code> 最后会变成屏幕上的字，它只管「来一段就调一次回调」；
          Agent 不知道 <code>assistant_delta</code> 事件会被谁消费，它只管「把 Provider 的回调转成自己的事件」；
          CLI 不知道这段文字是流式来的还是攒齐的，它只管「收到 delta 就 <code>write</code>」。
          正因为层层解耦，你可以随时换掉任何一环——把 CLI 换成 Web 前端、把 Provider 换成另一家模型——
          只要回调/事件的形状不变，其余各层一行都不用动。这就是<strong>分层回调的解耦之美</strong>：
          流式这个看似要侵入式改造的功能，最后落地成了「在既有事件系统里加一种事件」这么轻的一笔。
        </p>
      </KeyIdea>

      <h2>CLI 端：把事件画到屏幕上</h2>
      <p>
        管线的最后一站是 CLI 的事件渲染器。它就是一个 <code>switch</code>，按事件类型决定怎么显示：
      </p>

      <CodeBlock lang="ts" title="src/index.ts（事件渲染器）" code={renderSrc} />

      <p>三种事件，三种画法：</p>
      <ul>
        <li>
          <strong><code>assistant_delta</code>：逐字蹦出来的核心。</strong>处理极简——
          <code>process.stdout.write(e.text)</code> 直接把这段增量写到标准输出。注意是 <code>write</code> 不是
          <code>console.log</code>：<code>write</code> 不换行、不缓冲成整行，每段 <code>delta</code> 一到就立刻出现在光标处。
          一段段增量连续写出来，肉眼看到的就是「文字一个个往外冒」的效果——这正是这一章想要的画面。
        </li>
        <li>
          <strong><code>tool_start</code>：暗色显示正在调用什么。</strong>当模型决定调工具时，
          用 <code>DIM</code>（暗色）打印一行 <code>· read(...)</code>，把工具名和精简后的入参（<code>compact(e.input)</code>）显示出来，
          末了用 <code>RESET</code> 还原颜色。暗色是刻意的：它是「过程信息」，不该和回答正文抢注意力，淡淡地提示一句「forge 正在读文件」就够了。
        </li>
        <li>
          <strong><code>tool_end</code>：出错才红色提示。</strong>这里只在 <code>e.isError</code> 为真时才打印，
          而且用 <code>RED</code>（红色）配一个 <code>✗</code>，把（截断后的）错误信息亮出来。
          成功的工具结果不在这里刷屏——它已经回灌给模型、会体现在后续回答里，没必要再让用户读一遍；
          只有失败值得用醒目的红色拎出来，让人一眼看到「这一步出岔子了」。
        </li>
      </ul>

      <Example title="流式下你看到的画面">
        <p>
          把这一切落到一次真实交互上。你在 forge 里敲下「读一下 a.ts，告诉我它导出了什么」，回车——
        </p>
        <ol>
          <li>
            先是一行<strong>暗色</strong>的工具提示静静浮现：<code>· read(&#123;path: 'a.ts'&#125;)</code>——
            这是 <code>tool_start</code> 事件，告诉你 forge 正在读文件。
          </li>
          <li>
            紧接着，回答的文字<strong>一段段流出来</strong>：「这个文件导出了……」一个词、一个词地往外冒，
            而不是空等几秒后整段砸下来——这是一连串 <code>assistant_delta</code> 被逐段 <code>write</code> 出来的效果。
          </li>
          <li>
            文字流到结尾自然<strong>停住</strong>，光标停在最后一个字后面，等你的下一句话。
            （这一轮工具没出错，所以你没看到任何红色提示。）
          </li>
        </ol>
        <p>
          整个过程从头到尾都有动静：先知道它在干嘛（读文件），再看着它一字一句作答。
          对比卷 1 那个「回车后干瞪眼十几秒、然后整段蹦出」的版本，体验完全是两回事。
        </p>
      </Example>

      <Summary
        points={[
          '非流式 complete「等模型整段回完再返回」：用户要干等十几秒才见第一个字，长输出/高 max_tokens 还可能撞 HTTP 超时。流式边生成边显示，是交互式 CLI 体验的分水岭。',
          '流式不改变 Agent 的任何逻辑（点哪些工具、怎么回灌、何时停都不变），只改「同一段回答是攒齐一次性给、还是边生成边给」——是一层纯粹的呈现改造。',
          'SDK 三步走：client.messages.stream(params) 返回可监听的流；stream.on(\'text\', delta => ...) 每来一段文本回调一次；await stream.finalMessage() 等流结束拿到完整 Message，之后解析逻辑与非流式完全相同。SDK 建议长输入/长输出/高 max_tokens 一律用流式以避免超时。',
          '改 Provider：给 CompleteParams 加可选回调 onTextDelta（谁调用谁决定要不要消费增量）；complete 内把 messages.create 换成 messages.stream，传了回调才 stream.on(\'text\')，finalMessage() 之后的 content/stop_reason/usage 解析一字不改。',
          'thinking: { type: \'adaptive\' } 用 as unknown as 断言放行：部分 SDK 版本类型尚未收录 adaptive，但运行时 API 已支持（Opus 4.8 开启思考只有 adaptive 一种方式）。',
          'Agent 新增 assistant_delta 事件（流式增量，实时显示）区别于 assistant_text（一轮完整文本）；主循环把 onTextDelta 接成 onEvent(assistant_delta)。',
          '数据管线：SDK 流 → Provider 的 onTextDelta → Agent 的 onEvent(assistant_delta) → CLI 渲染器，每层只透传不耦合，所以任何一环都可替换——分层回调的解耦之美。',
          'CLI 渲染器按事件分画：assistant_delta 直接 process.stdout.write 造成逐字蹦出，tool_start 暗色显示正在调用什么工具，tool_end 仅在出错时红色提示。',
          '下一章做斜杠命令（/help、/clear 等），给这个流式 CLI 再添一层趁手的交互入口。',
        ]}
      />
    </>
  )
}
