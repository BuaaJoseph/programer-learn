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
      <KeyIdea title="贵的不是新内容，是重复的旧内容">
        <p>
          多轮对话里，绝大部分 token 都花在<strong>反复重发同一段历史</strong>上。聊到第 100 轮，最后那一次调用里
          可能 99% 都是早就发过无数遍的旧消息。token 计费是按「每次调用发送的 prompt tokens」算的，
          所以你为同一句开场白付了上百遍钱。这就是为什么长对话的成本会失控，也是记忆系统要解决的核心矛盾：
          <strong>既要让模型「记得」，又不能把所有东西都原样塞回去。</strong>
        </p>
      </KeyIdea>

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
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        一个能长跑的 Agent，往往要经历成百上千轮工具调用与思考。如果还用「全量重发」的天真做法，
        它会在跑到一半时撞上窗口上限、或者把预算烧穿。所以严肃的 Agent 系统都必须配一套<strong>记忆架构</strong>：
        短期记忆决定「最近这些轮怎么放进上下文」（滑动窗口、摘要压缩），长期记忆决定「久远但重要的事实存哪、怎么按需取回」
        （这正是 RAG 与向量检索的用武之地）。
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
      </Practice>

      <Summary
        points={[
          '模型是 stateless 的：两次调用之间不保存任何东西，「记得」是应用层每轮重发完整历史造出来的假象。',
          '聊天应用维护一个 messages 列表，把历轮的输入与回答按序塞进去，下一轮整个发回模型。',
          '重发有两个硬约束：历史堆大会撑爆上下文窗口；累计发送的 token 随轮数近似 O(N²) 平方增长。',
          '长对话里绝大多数 token 都花在反复重发旧内容上，按 prompt tokens 计费，成本因此失控。',
          '调大窗口只是推迟问题、并不改变成本曲线；决定记什么、忘什么是工程责任，模型不会自己挑重点。',
          '能长跑的 Agent 必须配记忆架构：短期记忆管最近几轮，长期记忆按需检索久远事实，这是后续各章的主题。',
        ]}
      />
    </>
  )
}
