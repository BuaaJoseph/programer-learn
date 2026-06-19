import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const exportKey = `# 去 Anthropic 控制台（console.anthropic.com）创建一个 API key，
# 然后在终端里把它设成环境变量。sk-... 换成你真实的 key：
export ANTHROPIC_API_KEY=sk-ant-...

# 验证一下当前 shell 里确实有了（应当打印出你的 key）：
echo $ANTHROPIC_API_KEY`

const helloTs = `import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // 自动读取环境变量 ANTHROPIC_API_KEY

const res = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '用一句话介绍你自己' }],
})

for (const block of res.content) {
  if (block.type === 'text') console.log(block.text)
}`

const runHello = `npx tsx src/hello.ts
# 顺利的话，终端会打印出 Claude 的一句自我介绍。`

const thinkingTs = `const res = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  thinking: { type: 'adaptive' }, // 开启自适应思考
  messages: [{ role: 'user', content: '推导一下：一个房间里 23 个人，至少两人生日相同的概率超过 50% 吗？' }],
})`

const multiTurnTs = `// messages 是一本「对话账本」，多轮就是不断往里追加
const history = [
  { role: 'user', content: '我叫小明。' },
]
let res = await client.messages.create({ model: 'claude-opus-4-8', max_tokens: 1024, messages: history })

// 把模型这轮的回复，以 assistant 角色追加回账本
history.push({ role: 'assistant', content: res.content })

// 再问一句——模型「记得」上文，只因为我们把完整 history 又发了一遍
history.push({ role: 'user', content: '我叫什么名字？' })
res = await client.messages.create({ model: 'claude-opus-4-8', max_tokens: 1024, messages: history })
// → 模型答得出「小明」，是因为它能看到整本账本，而不是因为它「有记忆」`

const streamTs = `// 流式：用 .stream() 边生成边收，最后用 finalMessage() 拿到完整结果
const stream = client.messages.stream({
  model: 'claude-opus-4-8',
  max_tokens: 4096,
  messages: [{ role: 'user', content: '写一段较长的说明文字' }],
})

stream.on('text', (delta) => process.stdout.write(delta)) // 一块块实时打印

const final = await stream.finalMessage() // 需要完整消息时再取`

const usageTs = `const res = await client.messages.create({ /* ... */ })

// 每次响应都带 usage，记着算成本与上下文占用
console.log(res.usage.input_tokens)   // 这次发进去的 token 数（计费按输入价）
console.log(res.usage.output_tokens)  // 这次生成出来的 token 数（计费按输出价，单价更高）`

const errorTs = `import Anthropic from '@anthropic-ai/sdk'

try {
  const res = await client.messages.create({ /* ... */ })
} catch (err) {
  // 用 SDK 提供的「类型化异常」分类处理，别去 match 错误字符串
  if (err instanceof Anthropic.RateLimitError) {
    // 429：被限流。SDK 默认已带指数退避重试，这里是兜底
  } else if (err instanceof Anthropic.APIError) {
    console.error(\`API 出错 \${err.status}：\`, err.message)
  } else {
    throw err // 不是 API 错误，原样抛出
  }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          脚手架已经能跑了，但它还只会打印一句「forge 起来了」。这一章我们让 forge 第一次真正和 Claude 说话——
          发出一句话、收到一句回答。代码很短，但每一行背后都有要讲清的概念：key 从哪来、客户端怎么找到它、
          一次请求里到底装了什么、返回的东西为什么是个数组。把这一次最小调用吃透，后面整个 Agent 循环都是在它之上长出来的。
        </p>
      </Lead>

      <h2>第一步：拿到 API key</h2>
      <p>
        和 Claude 说话需要凭证。去 <strong>Anthropic 控制台</strong>（<code>console.anthropic.com</code>）创建一个 API key，
        它形如 <code>sk-ant-...</code>。拿到后，不要把它写进代码，而是设成<strong>环境变量</strong> <code>ANTHROPIC_API_KEY</code>：
      </p>

      <CodeBlock lang="bash" title="设置 API key 环境变量" code={exportKey} />

      <p>
        注意 <code>export</code> 设置的环境变量只在<strong>当前终端会话</strong>里有效，关掉终端就没了。
        临时跑跑实验够用了；要长期使用，可以把这行写进 <code>~/.zshrc</code> 或 <code>~/.bashrc</code>，
        或者用项目级的 <code>.env</code> 配合工具加载（后面章节会讲）。
      </p>

      <Callout variant="warn" title="key 是密码，别写进代码、别提交到 git">
        <p>
          API key 等同于你账户的密码，泄露出去别人就能拿你的额度、甚至产生费用。两条铁律：
          <strong>第一，绝不把 key 硬编码进源码</strong>——一旦写进 <code>.ts</code> 文件，它就跟着代码到处跑。
          <strong>第二，绝不把含 key 的文件提交到 git</strong>——务必把 <code>.env</code> 之类的文件加进 <code>.gitignore</code>。
          正确做法就是上面这样：key 留在环境变量里，代码只去「读」它，从不「写死」它。
        </p>
      </Callout>

      <h2>第二步：最小的一次调用</h2>
      <p>
        在 <code>src/</code> 下新建 <code>hello.ts</code>，写下这段——目前能写出的、和 Claude 对话的最短代码：
      </p>

      <CodeBlock lang="ts" title="src/hello.ts" code={helloTs} />

      <p>逐行拆开看，每一行都对应一个要理解的点：</p>
      <ul>
        <li>
          <code>new Anthropic()</code>：创建客户端。注意括号里<strong>什么都没传</strong>——它会
          <strong>自动去读环境变量 <code>ANTHROPIC_API_KEY</code></strong>。这就是上一步设置环境变量的回报：
          代码里完全看不到 key 的影子，客户端却能拿到它。这也是为什么我们坚持用环境变量而不是硬编码。
        </li>
        <li>
          <code>client.messages.create(...)</code>：发起一次对话请求。它有三个此刻必须懂的字段——
          <code>model</code>（用哪个模型）、<code>max_tokens</code>（这次回复最多输出多少 token）、
          <code>messages</code>（要发给模型的对话内容）。下一节我们把它们一个个讲透。
        </li>
        <li>
          <code>model: 'claude-opus-4-8'</code>：选用 Opus 4.8，它是当前默认、最能干的模型。
          整个课程都会用它，除非你有明确理由换别的。
        </li>
        <li>
          <code>messages: [&#123; role: 'user', content: '...' &#125;]</code>：一个数组，里面放一条
          「用户说的话」。<code>role: 'user'</code> 表示这条是用户发的，<code>content</code> 是具体内容。
        </li>
        <li>
          <code>for (const block of res.content)</code>：返回结果的 <code>content</code> 是一个<strong>块数组</strong>，
          不是一个字符串。我们遍历它，挑出 <code>type === 'text'</code> 的文本块，打印它的 <code>text</code>。
          为什么是数组、为什么要判断 type，下一节专门讲。
        </li>
      </ul>

      <p>跑起来——用 <code>tsx</code> 直接运行这个 TypeScript 源码，不用先编译：</p>

      <CodeBlock lang="bash" title="运行 hello.ts" code={runHello} />

      <Callout variant="note" title="为什么用 SDK，而不是自己 fetch HTTP 接口？">
        <p>
          Claude 的接口本质是一个 HTTP 端点（<code>POST /v1/messages</code>），你完全可以用 <code>fetch</code> 裸调。
          但官方 SDK <code>@anthropic-ai/sdk</code> 替你包好了一堆「不写就要踩坑」的事：
          <strong>自动读环境变量里的 key、对 429/5xx 错误做指数退避重试、把响应解析成带类型的对象、
          提供流式辅助方法（如 <code>finalMessage()</code>）、暴露类型化的异常类</strong>。
          自己 fetch 不是不行，但等于把这些都重写一遍，且很容易写漏（比如忘了重试、忘了处理流式分块）。
          所以本课程一律走 SDK——把精力留给真正属于我们的脚手架逻辑，而不是重复造轮子。
        </p>
      </Callout>

      <h2>第三步：一次请求里到底有什么</h2>
      <p>
        这段代码能跑通只是第一步，更重要的是理解这次请求的「形状」。把它讲透，后面所有和模型打交道的代码都不再神秘。
      </p>

      <Example title="一次请求里有什么">
        <ul>
          <li>
            <strong><code>messages</code> 是「对话历史」数组。</strong>它不是「一句话」，而是一串消息。
            每条消息有两个部分：<code>role</code>（谁说的，<code>user</code> 表示用户、<code>assistant</code> 表示模型）
            和 <code>content</code>（说了什么）。现在我们只发了一条 user 消息；等做多轮对话时，
            会把模型的回复以 <code>assistant</code> 角色追加进同一个数组，再连同新问题一起发回去——
            模型「记得上文」，靠的就是你每次把完整历史重新发给它。
          </li>
          <li>
            <strong><code>model</code> 选哪个。</strong>我们用 <code>claude-opus-4-8</code>，它是默认且最强的选择。
            模型决定了智能水平和价格；课程里统一用它。
          </li>
          <li>
            <strong><code>max_tokens</code> 是这次回复的输出上限。</strong>它限制模型这一次<strong>最多生成多少 token</strong>。
            设小了，长回答会被截断；设大了也只是上限，模型说完就停，不会硬凑。它管的是「输出」，和输入长度无关。
          </li>
          <li>
            <strong><code>content</code> 为什么是数组。</strong>因为模型的一条回复可能<strong>包含多种类型的块</strong>，
            不只是纯文本。现在只有 <code>text</code> 块；等后面给模型接上工具，它的回复里还会出现
            <code>tool_use</code> 块（表示「我要调用某个工具」）。返回设计成块数组，正是为了容纳这种「一条回复里混着文字和动作」的情况。
            所以我们才要遍历 <code>content</code>、按 <code>type</code> 分别处理，而不是直接 <code>res.content[0].text</code> 一把梭。
          </li>
        </ul>
      </Example>

      <h3>多轮对话：模型为什么「记得」上文</h3>
      <p>
        既然 <code>messages</code> 是一本账本，多轮对话就不是什么新机制——<strong>无非是不停地往同一个数组里追加</strong>。
        这是初学者最该早点想通的一件事：
      </p>
      <CodeBlock lang="ts" title="多轮对话：把回复追加回历史，再发一次" code={multiTurnTs} />
      <KeyIdea title="模型是无状态的，「记忆」是你给的">
        <p>
          Claude 的接口<strong>不在服务器上替你存对话</strong>。它每次只看你这一次请求里发去的 <code>messages</code>，
          答完就「忘」。所谓「它记得我刚才说的名字」，纯粹是因为你把<strong>包含那句话的完整历史</strong>又发了一遍。
          这一点直接决定了 forge 的内核形态：上一章那个 while 循环，本质就是
          <strong>「把越来越厚的历史反复发给一个无状态的模型」</strong>。也正因为历史只增不减，
          它迟早会撑爆上下文窗口——这就是卷 4「上下文工程」（预算、压缩）存在的根本原因。
          现在记住这条因果链，后面很多设计你会觉得理所当然。
        </p>
      </KeyIdea>

      <h2>第四步：开启自适应思考</h2>
      <p>
        对于需要推理的复杂任务，建议给请求加上 <code>thinking</code> 参数，让模型在回答前先「想一想」。
        在 <code>messages.create</code> 里多加一行即可：
      </p>

      <CodeBlock lang="ts" title="带自适应思考的 create 调用" code={thinkingTs} />

      <Callout variant="note" title="Opus 4.8 上 thinking 只有 adaptive 这一种开法">
        <p>
          在 Opus 4.8 上，开启思考<strong>只支持 <code>adaptive</code>（自适应）这一种方式</strong>——
          即 <code>thinking: &#123; type: 'adaptive' &#125;</code>，由模型自己决定要不要想、想多深，你不用去设思考的 token 预算。
          旧模型上那种 <code>type: 'enabled'</code> 加固定 <code>budget_tokens</code> 的写法在这里会直接报 400 错误。
          简单的一问一答可以<strong>不加 thinking</strong>，省时省钱；只有遇到需要多步推理的硬任务，再把它打开。
        </p>
      </Callout>
      <p>
        再补两个会影响你后面写 forge 的事实。其一，开了思考后，<strong>返回的 <code>content</code> 里会多出
        <code>thinking</code> 类型的块</strong>——这正好印证了上一节「content 是块数组」的设计：思考、文字、
        将来的工具调用，都是并列的块类型，你按 <code>type</code> 分别处理即可。其二，在 Opus 4.8 上思考过程默认是
        <strong>「省略」</strong>的（<code>thinking</code> 块的文本为空），需要把它展示给用户时要显式设
        <code>thinking: &#123; type: 'adaptive', display: 'summarized' &#125;</code> 才能拿到一段可读的思考摘要。
        无论是否展示，思考都真实发生、也都照常计费——<code>display</code> 只控制「给不给你看」，不影响「想不想、花不花钱」。
      </p>

      <h2>第五步：长输出，用「流式」边收边显示</h2>
      <Callout variant="tip" title="长回答用流式边收边显示">
        <p>
          当模型要输出很长一段内容时，一次性等它全写完再返回，体验差、还容易触发超时。
          更好的做法是用 <strong>流式</strong>（<code>client.messages.stream(...)</code>）——边生成边一块块收，实时显示出来，
          就像你在网页上看到 Claude 一个字一个字往外蹦。这一章我们先用最简单的 <code>create</code> 把链路跑通；
          流式的完整用法留到<strong>第 2 卷</strong>再做，这里先在脑子里记下「有这么个东西」。
        </p>
      </Callout>
      <p>
        虽然完整实现留到卷 2，但这里值得先把「为什么需要它」说透，因为它不只是个体验优化，
        更是个<strong>工程必需品</strong>。非流式的 <code>create</code> 是「发出去 → 干等到全部生成完 → 一次性返回」，
        这有两个硬伤：一是<strong>用户要盯着一个不动的光标等几十秒</strong>，体验糟糕；二是当
        <code>max_tokens</code> 设得很大、生成很长时，<strong>整个 HTTP 请求可能在 SDK 默认超时前还没返回，直接报错</strong>。
        流式从根上绕开这两点——它在第一个字生成出来时就开始往回传，所以「立刻有反馈」且「不会因为生成太久而超时」。
        经验法则：<strong>预期输出较短就用 <code>create</code>，预期输出长（或 <code>max_tokens</code> 设得大）就用 <code>stream</code></strong>。
        提前感受一下它的样子：
      </p>
      <CodeBlock lang="ts" title="流式调用的样子（卷 2 详讲）" code={streamTs} />

      <h2>第六步：token、计费与错误处理</h2>
      <p>
        forge 是要长期跑、反复调模型的工具，所以从第一次调用起就该对两件事有概念：
        <strong>这次花了多少钱</strong>，以及<strong>调用失败了怎么办</strong>。
      </p>
      <p>
        先说 token 和计费。模型不是按「字数」而是按 <strong>token</strong> 计费——token 是模型切分文本的最小单位，
        一个英文单词大致 1 个多 token，中文一个字往往算 1～2 个 token。每次响应都会带一个 <code>usage</code> 对象，
        告诉你这次的输入、输出各用了多少 token：
      </p>
      <CodeBlock lang="ts" title="读取 usage：每次都知道花了多少" code={usageTs} />
      <p>
        两个要点：其一，<strong>输出 token 通常比输入 token 贵得多</strong>（Opus 4.8 大致是输入 $5、输出 $25 每百万 token，
        约 5 倍差），所以「让模型少废话、直接给结论」不只是体验问题，也是成本问题。其二，回想上一节那条因果链——
        <strong>对话历史是只增不减的</strong>，意味着随着轮次变多，每一轮的<em>输入</em> token 都在变大，
        成本会悄悄滚雪球。这正是卷 4「上下文工程」要解决的事（用压缩、预算把历史控制住），也是卷 7
        会专门做成本与延迟度量的原因。现在你只需养成习惯：<strong>每次调用都心里有本账</strong>。
      </p>
      <Example title="错误处理：用类型化异常，别 match 字符串">
        <p>
          网络调用一定会失败——限流（429）、服务过载（529）、偶发的 5xx、或者你请求本身写错了（400）。
          一个能长期跑的 Agent 必须把这些处理好。SDK 为每种错误提供了<strong>类型化的异常类</strong>，
          请用 <code>instanceof</code> 判断，而不是去 <code>err.message.includes('429')</code> 抠字符串（脆弱且易错）：
        </p>
        <CodeBlock lang="ts" title="结构化的错误处理" code={errorTs} />
        <ul>
          <li>
            <strong>哪些该重试，哪些不该。</strong>429（限流）、529（过载）、500+（服务端临时故障）是<strong>可重试</strong>的；
            400（请求写错了）、401（key 无效）是<strong>不可重试</strong>的——重试一万次还是错，得去改请求或换 key。
          </li>
          <li>
            <strong>SDK 已经替你重试了一部分。</strong>对 429/5xx，SDK 默认带指数退避自动重试（默认 2 次）。
            所以你的 <code>catch</code> 往往是<strong>兜底</strong>：处理重试耗尽后仍失败的情况，而不是从零实现重试。
          </li>
          <li>
            <strong>从最具体到最宽泛。</strong><code>instanceof</code> 的判断顺序要先窄后宽——先判 <code>RateLimitError</code>，
            再判它的父类 <code>APIError</code>，否则具体分支永远进不去。
          </li>
        </ul>
      </Example>

      <h2>从「问一句答一句」到 Agent，还差什么</h2>
      <p>
        到这里，forge 已经能和 Claude 说上话了——发一句、答一句。但这<strong>还不是 Agent</strong>。
        一次性的问答，模型只能凭它脑子里已有的知识回你；它不能自己去查文件、跑命令、看结果，更不能根据结果决定下一步做什么。
        真正的 Agent 要能<strong>多轮对话</strong>（记得上文、持续推进）、能<strong>调用工具</strong>（动手干活、读真实世界的数据）、
        还能<strong>自己循环</strong>（看了工具结果再决定下一步，直到任务完成）。这三样，正是第 1 卷要一件件造出来的东西。
      </p>

      <KeyIdea title="单次调用 → Agent，差距在于「循环」和「工具」">
        <p>
          你现在写的这段，是一次<strong>无状态、无动作</strong>的调用：发出去、收回来，结束。
          而 Agent 的本质，是把这次调用<strong>放进一个循环</strong>里，并给模型接上<strong>工具</strong>——
          模型说「我要读这个文件」，我们替它读、把结果塞回 <code>messages</code>，再调一次；它说「我要改这行代码」，
          我们替它改、再塞回去……如此往复，直到它说「干完了」。
          所以从单次调用到 Agent，新增的不是更聪明的模型，而是<strong>外面那层循环</strong>和<strong>它能动手的工具</strong>。
          这一章把「一次调用」打通了，第 1 卷就把这层循环和工具盖上去。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '去 Anthropic 控制台拿 API key，用 export 设成环境变量 ANTHROPIC_API_KEY；绝不硬编码进代码、绝不提交到 git。',
          'new Anthropic() 不传参数，会自动读取环境变量 ANTHROPIC_API_KEY——这正是用环境变量而非硬编码的回报。',
          '用官方 SDK 而非裸 fetch：它替你包好读 key、重试 429/5xx、解析类型、流式辅助、类型化异常，让你专注脚手架逻辑。',
          'messages.create 三要素：model（用哪个模型）、max_tokens（这次回复的输出上限）、messages（要发的对话内容）。',
          'messages 是对话账本，每条有 role（user/assistant）和 content；模型是无状态的，「记得上文」靠的是你每次把完整历史重发——这也注定历史会膨胀（卷 4 上下文工程的由来）。',
          '返回的 content 是块数组，因为一条回复可能含多种块（text、thinking，以后还有工具调用 tool_use），所以要遍历、按 type 处理。',
          '复杂任务加 thinking: { type: "adaptive" }；Opus 4.8 上 thinking 只支持 adaptive，思考默认省略、想看摘要要设 display: "summarized"，且思考照常计费。',
          '长输出/大 max_tokens 用 client.messages.stream(...) 边收边显示，既改善体验又避免 HTTP 超时；卷 2 详讲，本章先用 create 跑通链路。',
          '按 token 计费且输出比输入贵约 5 倍，每次响应的 usage 都该看；错误用 SDK 的类型化异常（instanceof，先窄后宽）分类处理，429/5xx 可重试且 SDK 已带退避重试、400/401 不可重试。',
          '单次调用还不是 Agent——Agent 多出来的是「外层循环」和「能动手的工具」，这正是第 1 卷要造的。',
        ]}
      />
    </>
  )
}
