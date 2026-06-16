import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const replayCode = `from openai import OpenAI

client = OpenAI()

# 模型是无状态的：要让它「记得」前面说过什么，
# 唯一办法是每一轮都把完整历史重新发一遍。

history = [
    {'role': 'system', 'content': '你是一个简洁的助手。'},
]

def chat(user_text):
    # 1) 把这一轮的用户输入追加进历史
    history.append({'role': 'user', 'content': user_text})

    # 2) 把「整个 history」发给模型——它不会记得上一次调用
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=history,
    )
    answer = resp.choices[0].message.content

    # 3) 把模型的回答也追加进历史，下一轮才能带上
    history.append({'role': 'assistant', 'content': answer})
    return answer, resp.usage.prompt_tokens

# 对比：不带历史，每次都是「失忆」的一问一答
def chat_stateless(user_text):
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': user_text}],
    )
    return resp.choices[0].message.content

print(chat('我叫小杜，记住。'))
print(chat('我叫什么名字？'))          # 带历史：能答上来
print(chat_stateless('我叫什么名字？')) # 不带历史：答不上来`

const costCode = `# 量化「多轮重发」的 token 代价：为什么是近似 O(N^2)
# 假设每一轮新增的「用户问 + 模型答」平均 tokens 数恒定为 t。

def total_tokens(rounds, t=300):
    sent = 0          # 累计「发送给模型」的 prompt tokens
    history_len = 0   # 当前历史的 token 长度
    for i in range(1, rounds + 1):
        history_len += t        # 第 i 轮历史里多了一轮的内容
        sent += history_len     # 这一轮要把「整个历史」重发一遍
    return sent

for n in [5, 10, 20, 50, 100]:
    sent = total_tokens(n)
    # 单看「最后一轮」要发多少，以及累计发了多少
    print(f'{n:>4} 轮  最后一轮 prompt={n*300:>7} tokens  累计发送={sent:>9} tokens')

# 累计发送 ~= t * N*(N+1)/2 —— 随轮数 N 平方增长。
# 100 轮时累计要发约 150 万 tokens，绝大多数是「重复的旧内容」。`

const statefulApiCode = `# 一个常见误解：Assistants / Threads 这类「有状态」API
# 真的让模型有记忆了吗？并没有——它只是把「重发历史」这件事
# 从你的代码挪到了服务端，账单照样按每轮发送的 token 算。

# 伪代码示意：服务端维护 thread，但每次 run 仍要把
# 整个 thread 的历史喂给模型推理。
thread = client.beta.threads.create()

def ask(text):
    # 你只发了一句话……
    client.beta.threads.messages.create(thread.id, role='user', content=text)
    run = client.beta.threads.runs.create(thread.id, assistant_id=ASSISTANT_ID)
    # ……但服务端在 run 内部，把 thread 里所有历史消息
    # 重新拼成 messages 发给模型。无状态的本质没变，
    # 只是「重发」这步对你透明了。你为之付费的 prompt_tokens
    # 依然随对话变长而平方级膨胀。
    return wait_and_get(run)`

export default function Ch5_1() {
  return (
    <>
      <Lead>
        <p>
          你和 ChatGPT 聊了二十轮，它好像一直「记得」你前面说过的话。但模型本身其实没有任何记忆——
          它是 <em>stateless</em>（无状态）的，每一次 API 调用都是独立的、从零开始的。它之所以显得记得，
          是因为程序在背后悄悄做了一件笨拙却有效的事：<strong>每一轮都把完整的对话历史重新发一遍</strong>。
          这一卷要讲的所有东西——记忆系统、RAG、上下文压缩——都是为了对付这个笨办法带来的代价。
        </p>
      </Lead>

      <h2>模型没有记忆，只有上下文</h2>
      <p>
        回忆第 1 卷的结论：推理时模型参数是冻结的，它唯一能看到的输入就是这一次传进去的那段文字（上下文）。
        两次调用之间，模型不保存任何东西，也不知道你们之前聊过。所以「记住名字」「接着上文继续」这类能力，
        全都不是模型自带的，而是<strong>应用层</strong>替它造出来的假象。
      </p>
      <p>
        造假象的方式简单粗暴：维护一个 <code>messages</code> 列表，把每一轮的用户输入和模型回答都按顺序塞进去，
        下一轮调用时把<strong>整个列表</strong>原样发过去。模型读到这段长长的历史，自然就能「接得上」。
        这就是几乎所有聊天应用的底层做法——没有魔法，只有重发。
      </p>
      <p>
        为什么模型一定要做成无状态的？这是<strong>工程上必然的选择</strong>，不是疏忽。如果模型要为每个用户维护状态，
        服务端就得给每个会话开一块常驻显存、绑定一台特定 GPU，用户一多就彻底没法横向扩展。无状态意味着任何一台空闲机器都能
        接手任何一次请求——你这一轮和下一轮的调用，很可能落在<strong>完全不同的物理机器</strong>上。这正是大模型服务能用一个 API
        撑住上亿用户的前提。代价就转嫁成了：状态（也就是对话历史）必须由调用方在每次请求里自带。
      </p>

      <Example title="同一个问题，带历史和不带历史">
        <p>
          问「我叫什么名字？」。如果上一轮你说过「我叫小杜」，并且这句话还在 <code>messages</code> 里被一起发过去，
          模型能答「小杜」。如果不带历史、单独问这一句，模型只能回「抱歉，我不知道你的名字」——
          因为它从来就没有「记住」过，那句话根本不在它的视野里。
        </p>
        <p>
          关键区别不在模型，而在<strong>你给它看了什么</strong>。记忆系统的全部工作，就是决定「这一轮该把哪些旧内容放进上下文」。
        </p>
      </Example>

      <KeyIdea title="角色字段不是给模型「记忆」，是给它「读法」">
        <p>
          很多人以为 <code>messages</code> 里的 <code>system</code> / <code>user</code> / <code>assistant</code> 角色字段，是模型用来「区分谁说的话、并记住」的开关。
          其实不是。这些角色在底层会被拼接成<strong>一段带特殊分隔符的纯文本</strong>（chat template），模型读到的依然是一整段连续 token。
          角色的作用是告诉模型「这段是指令、这段是用户、这段是你自己之前的回答」，从而调整补全风格——它并不创造任何跨调用的持久状态。
          换句话说，把上一轮 assistant 的回答标记成 <code>assistant</code> 角色塞回去，模型才会把它当成「自己说过的话」顺着接，而不是当成新指令。
        </p>
      </KeyIdea>

      <h2>重发的代价：上下文窗口与 O(N²)</h2>
      <p>
        重发能用，但它有两个硬约束。第一个是<strong>上下文窗口</strong>：模型一次能读的 token 数有上限
        （比如 128K）。对话越聊越长，历史越堆越大，迟早会把窗口撑爆——超出部分要么报错，要么被悄悄截断，
        于是模型「突然失忆」，把开头说的话忘得一干二净。
      </p>
      <p>
        第二个约束更隐蔽，也更烧钱。设每一轮新增的内容平均是 <code>t</code> 个 token，聊到第 <code>N</code> 轮。
        第 1 轮发 <code>t</code>，第 2 轮要把前一轮也带上、发 <code>2t</code>，第 <code>N</code> 轮发 <code>N·t</code>。
        累计发送的 token 数是 <code>t·(1+2+…+N) = t·N(N+1)/2</code>，随轮数 <strong>近似平方（O(N²)）增长</strong>。
      </p>
      <p>
        别只盯着钱。这条平方曲线同时拖垮三件事：<strong>延迟</strong>（prefill 阶段要处理的输入越长，首 token 越慢，长上下文的注意力计算本身也随长度增长）、
        <strong>成本</strong>（按 prompt token 计费）、以及<strong>正确性</strong>（历史越长，真正关键的那句话被淹没的概率越大）。三者在长对话里同时恶化，这才是问题的全貌。
      </p>
      <KeyIdea title="贵的不是新内容，是重复的旧内容">
        <p>
          多轮对话里，绝大部分 token 都花在<strong>反复重发同一段历史</strong>上。聊到第 100 轮，最后那一次调用里
          可能 99% 都是早就发过无数遍的旧消息。token 计费是按「每次调用发送的 prompt tokens」算的，
          所以你为同一句开场白付了上百遍钱。这就是为什么长对话的成本会失控，也是记忆系统要解决的核心矛盾：
          <strong>既要让模型「记得」，又不能把所有东西都原样塞回去。</strong>
        </p>
      </KeyIdea>

      <h2>几种省钱手段的边界：缓存不是免死金牌</h2>
      <p>
        你可能会想：既然历史前缀每轮都重复，厂商不能缓存吗？能——这就是 <strong>prompt caching（前缀缓存）</strong>。
        如果连续两次请求的开头一大段 token 完全相同，服务端可以复用上一次算好的 KV 状态，省掉重复 prefill，缓存命中的那部分通常打折计费。
        这确实能缓解一部分成本和延迟。但它有明确边界，不能让你高枕无忧：
      </p>
      <table>
        <thead>
          <tr><th>手段</th><th>解决什么</th><th>没解决什么</th></tr>
        </thead>
        <tbody>
          <tr><td>前缀缓存</td><td>重复前缀的 prefill 计算与部分计费</td><td>窗口上限；缓存有过期时间；前缀一变即失效</td></tr>
          <tr><td>调大窗口</td><td>推迟撑爆的时间点</td><td>O(N²) 成本曲线；单价更贵；中段被忽略</td></tr>
          <tr><td>滑动窗口（丢旧消息）</td><td>控制窗口与成本</td><td>被丢掉的早期信息真的丢了，模型会失忆</td></tr>
          <tr><td>摘要压缩</td><td>用少量 token 保留早期要点</td><td>摘要会丢细节，且压缩本身要花一次调用</td></tr>
          <tr><td>RAG / 检索</td><td>海量知识按需取回，不占常驻窗口</td><td>检索质量；召回不准时模型答不出或答错</td></tr>
        </tbody>
      </table>
      <p>
        缓存的致命弱点是：只要你在历史<strong>中间</strong>插入或修改任何一条消息（比如做了摘要压缩、或者换了 system prompt），
        后面所有 token 的前缀都变了，缓存<strong>整段失效</strong>，又要从头算起。所以缓存友好的设计是「只在末尾追加、稳定内容放最前」——
        这也解释了为什么很多系统把 system prompt 和长期事实固定在最前面，把易变的部分放后面。
      </p>

      <Example title="把摘要插进历史中间，缓存全废">
        <p>
          假设你的对话是 <code>{'[system, msg1, msg2, ..., msg50]'}</code>，前缀缓存命中得很好。某轮你决定把 msg1~msg40 压成一条摘要，
          于是历史变成 <code>{'[system, summary, msg41, ..., msg50]'}</code>。问题来了：<code>summary</code> 这条插在了 system 之后、
          msg41 之前——从它往后的所有 token 前缀都和缓存里的不一样了，缓存命中率瞬间归零。压缩省下了窗口，却可能让这一轮的实际计算不降反升。
          这就是为什么压缩要挑时机：在缓存即将过期、或历史确实快撑爆时再做，而不是每轮都做。
        </p>
      </Example>

      <Callout variant="warn" title="两个常见误区">
        <ul>
          <li>
            <strong>「调长上下文窗口就行了」</strong>——窗口变大只是推迟了撑爆的时间，O(N²) 的成本曲线一点没变，
            而且窗口越长单价越贵、延迟越高，还会触发后面要讲的「lost in the middle」（中间内容被忽略）。
          </li>
          <li>
            <strong>「模型自己会挑重点记」</strong>——不会。你不主动裁剪、不主动检索，它就只会把你塞进去的东西
            全部当成等价的上下文去读。决定记什么、忘什么，是<strong>你的工程责任</strong>。
          </li>
          <li>
            <strong>「用有状态的 Threads/Assistants API 就不用管历史了」</strong>——服务端帮你存了历史，但它在每次 run 里
            仍然要把整个 thread 重新喂给模型。无状态的本质没变，账单照样按每轮发送的 token 平方级增长，只是这步对你透明了。
          </li>
        </ul>
      </Callout>

      <Practice title="拆穿『有状态 API』的假象">
        <p>
          很多新手以为切到 Threads/Assistants 这类「有状态」接口，记忆问题就自动解决了。
          下面这段伪代码点破它：服务端只是替你存了历史、并在每次 run 内部重发，本质仍是无状态推理 + 重发。
        </p>
        <CodeBlock lang="python" title="stateful_illusion.py" code={statefulApiCode} />
        <p>
          结论：无论 API 长什么样，<strong>token 都是按「每次推理实际读进去多少」算的</strong>。理解这一点，你才不会被「有状态」三个字误导，
          才会主动去做裁剪、压缩和检索。
        </p>
      </Practice>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        一个能长跑的 Agent，往往要经历成百上千轮工具调用与思考。如果还用「全量重发」的天真做法，
        它会在跑到一半时撞上窗口上限、或者把预算烧穿。所以严肃的 Agent 系统都必须配一套<strong>记忆架构</strong>：
        短期记忆决定「最近这些轮怎么放进上下文」（滑动窗口、摘要压缩），长期记忆决定「久远但重要的事实存哪、怎么按需取回」
        （这正是 RAG 与向量检索的用武之地）。
      </p>
      <p>
        Agent 的上下文压力还比聊天更大：每次工具调用的<strong>返回结果</strong>（一段网页、一份 JSON、一个报错堆栈）也要塞进历史，
        而这些「观察」往往又长又啰嗦。一个搜了十次网页的 Agent，光是工具输出就能把窗口占满。所以 Agent 记忆设计里有一条专门的功课：
        <strong>对工具结果做即时压缩</strong>——只留对后续决策有用的那几行，原始大块要么丢弃、要么落到外部存储里按需再取。
      </p>
      <p>
        换句话说，第 1 卷讲的是「模型怎么按概率补全」，这一卷讲的是「在窗口有限、成本敏感的现实里，
        到底该把什么放进那段补全的前文里」。把上下文管好，就是把 Agent 的成本、延迟和正确性同时管好。
      </p>

      <Practice title="量化多轮重发的 token 代价">
        <p>
          先跑通「带历史 vs 不带历史」的对比，亲眼看到模型本身没有记忆；再用一个纯计算的脚本，
          画出累计发送 token 数随轮数的增长曲线，体会 O(N²) 有多吓人。
        </p>
        <CodeBlock lang="python" title="replay_demo.py" code={replayCode} />
        <CodeBlock lang="python" title="token_cost.py" code={costCode} />
        <p>
          跑完 <code>token_cost.py</code> 你会看到：100 轮对话累计要发约 150 万 tokens，其中真正「新」的内容只有 3 万。
          剩下的全是重复——这就是接下来几章要砍掉的浪费。
        </p>
        <p>
          进阶练习：在 <code>total_tokens</code> 里加一个「滑动窗口」版本——只保留最近 <code>k</code> 轮历史，看看累计发送量从 O(N²) 退化成 O(N·k) 的线性增长。
          你会立刻直观感受到「裁剪」带来的成本回报，这正是下一章滑动窗口策略的动机。
        </p>
      </Practice>

      <Summary
        points={[
          '模型是 stateless 的：两次调用之间不保存任何东西，「记得」是应用层每轮重发完整历史造出来的假象。',
          '无状态是工程必然：这样任何空闲机器都能接任何请求，才能横向扩展撑住海量用户，代价是历史必须调用方自带。',
          '聊天应用维护一个 messages 列表，把历轮的输入与回答按序塞进去，下一轮整个发回模型；角色字段只影响读法，不创造记忆。',
          '重发有两个硬约束：历史堆大会撑爆上下文窗口；累计发送的 token 随轮数近似 O(N²) 平方增长，成本、延迟、正确性同时恶化。',
          '前缀缓存能省重复 prefill，但有窗口、过期和「前缀一变即整段失效」的边界，所以稳定内容放前、只在末尾追加。',
          '调大窗口只是推迟问题、并不改变成本曲线；有状态 API 只是把重发挪到服务端，账单照旧；决定记什么是工程责任。',
          '能长跑的 Agent 必须配记忆架构：短期记忆管最近几轮，长期记忆按需检索久远事实，还要对啰嗦的工具结果即时压缩。',
        ]}
      />
    </>
  )
}
