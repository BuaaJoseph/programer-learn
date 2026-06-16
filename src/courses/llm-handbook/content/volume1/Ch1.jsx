import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import NextTokenAnim from '@/components/illustrations/NextTokenAnim.jsx'

const logprobCode = `from openai import OpenAI

client = OpenAI()

resp = client.chat.completions.create(
    model='gpt-4o-mini',
    messages=[{'role': 'user', 'content': '中国的首都是'}],
    max_tokens=1,
    logprobs=True,
    top_logprobs=5,   # 让 API 返回前 5 个候选词及其对数概率
)

# 打印模型对下一个词的候选分布
import math
top = resp.choices[0].logprobs.content[0].top_logprobs
for item in top:
    prob = math.exp(item.logprob)   # logprob 还原成概率
    print(f'{item.token!r:12} {prob:6.1%}')`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          很多人以为大模型在「理解」问题、在「思考」答案。其实它做的事可以用一句话说尽：
          根据前面已有的文字，预测下一个最可能出现的词，然后把它接上去，再预测下一个——如此反复。
          这个动作叫 <em>next-token prediction</em>，是整个大模型唯一的核心动作。
        </p>
      </Lead>

      <h2>它到底在做什么</h2>
      <p>
        语言模型本质是一个概率函数：给定一段前文（叫 <em>context</em> 或 prompt），它输出词表里
        <strong>每一个词</strong>作为「下一个词」的概率。比如输入「中国的首都是」，它会给「北京」一个很高的概率，
        给「上海」一个低一些的概率，给「香蕉」一个几乎为零的概率。
      </p>
      <p>
        生成一整句话，就是把这个动作一遍遍重复：预测出一个词 → 把它接到前文末尾 → 拿新的前文再预测下一个词。
        这种「用自己刚生成的内容当作下一步输入」的方式，叫<em>自回归</em>（autoregressive）生成。
      </p>

      <p>
        为什么非得是「概率」而不是直接吐一个词？因为语言天然是<strong>多解</strong>的：「我今天想吃」后面接「火锅」「面条」
        「点外卖」都说得通。把所有可能性用一个概率分布表达出来，既保留了这种多样性，又给后面的采样（第 4 章）留了调节空间——
        你可以选最稳的，也可以选更有创意的。一个只会输出单一答案的模型，写不出有变化的文字。
      </p>

      <h3>从 logits 到概率：softmax</h3>
      <p>
        模型最后一层吐出的是一串原始分数，叫 <em>logits</em>，每个词一个，可正可负、没有上下界。要把它们变成
        一组「加起来等于 1」的概率，用的是 <em>softmax</em> 函数：
      </p>
      <CodeBlock
        lang="text"
        title="softmax"
        code={`p_i = exp(logit_i) / sum_j( exp(logit_j) )`}
      />
      <p>
        指数运算 <code>exp</code> 会放大差距：logit 高一点的词，softmax 之后概率会高很多。后面讲温度采样时，
        我们就是在 softmax 之前给 logits 乘一个系数，来调节这种「放大」的程度。
      </p>
      <p>
        为什么要先取指数？两个原因。其一，<code>exp</code> 永远为正，保证概率非负；其二，它把「加性的分数差」变成
        「乘性的概率比」——两个 logit 差 1，概率比恒为 <code>e≈2.7</code> 倍，差 2 就是约 7.4 倍，与它们的绝对值无关。
        这个性质叫<strong>平移不变性</strong>：给所有 logits 同时加一个常数，softmax 结果完全不变。工程上正是利用这点，
        先减去最大值再算 <code>exp</code>，避免 <code>exp(很大的数)</code> 溢出（第 3 章的代码里 <code>x - x.max()</code> 就是干这个）。
      </p>
      <Callout variant="info" title="softmax 是「软」的 argmax">
        <p>
          名字里的 soft 是相对 <em>hard</em> 而言：硬性的 <code>argmax</code> 只会把全部权重压到最大那个词上（1, 0, 0…），
          丢掉了次优词的所有信息，而且不可导，没法做梯度训练。softmax 给出一个「带温度的、可微的」近似——它既能体现
          「谁更可能」，又保留了对其他候选的相对偏好，还能求导。整个深度学习的分类层几乎都用它，不是巧合。
        </p>
      </Callout>

      <h3>它是怎么学会的：交叉熵与 teacher forcing</h3>
      <p>
        预训练阶段，模型读海量文本，做的就是「完形填空」：遮住下一个词让它猜，再用真实的词来纠正。衡量「猜得准不准」
        的损失函数是<em>交叉熵</em>（cross-entropy），对单个位置就是 <code>loss = -log(正确词的概率)</code>。
        模型给正确词的概率越高，loss 越小；如果它把正确词的概率压得很低，loss 就会很大。
      </p>
      <p>
        训练时有个关键细节叫 <em>teacher forcing</em>：算下一个词时，喂给模型的前文用的是
        <strong>真实的标准答案</strong>，而不是模型自己上一步猜的词。这样训练能并行、也更稳定，但也埋下了一个隐患——
        推理时模型只能看自己生成的词，一旦前面错了，后面会跟着歪（这和后面要讲的幻觉、错误累积都有关）。
      </p>
      <p>
        为什么交叉熵偏偏用 <code>-log</code> 而不是别的？因为 <code>-log</code> 有个恰到好处的「惩罚曲线」：当模型给正确词的概率
        接近 1 时，loss 接近 0（几乎不罚）；当概率掉到 0.01，loss 就飙到约 4.6（重罚）；概率趋近 0 时 loss 趋于无穷大。
        这种「越自信地答错、罚得越狠」的特性，逼着模型不敢对没把握的词乱给高概率。数学上它还等价于「最大化训练数据出现的似然」，
        即让模型成为最能解释这批语料的那个概率模型，理论根基相当扎实。
      </p>
      <p>
        teacher forcing 带来的「训练用真答案、推理用自己生成」的不一致，有个专门的名字叫 <em>exposure bias</em>（曝光偏差）。
        训练时模型从没见过「自己上一步出错」的局面，所以推理时一旦走偏，它没学过怎么纠回来，只会顺着错误继续编——
        这正是长文本生成越往后越容易跑飞的底层原因之一。</p>

      <h3>困惑度：用一个数衡量「猜得多准」</h3>
      <p>
        交叉熵 loss 是给机器优化用的，人看着不直观。把它取指数 <code>exp(loss)</code> 就得到<em>困惑度</em>（perplexity），
        它有个非常具象的解释：<strong>模型平均每一步在多少个「等可能的词」之间犹豫</strong>。困惑度为 1，表示模型每步都笃定地知道下一个词；
        困惑度为 100，表示它平均像在 100 个候选里抓阄。
      </p>
      <p>
        早期模型困惑度动辄上千，如今好的大模型在通用文本上能压到个位数。这条曲线就是「大模型越来越强」最朴素的量化证据——
        本质上是它把语言的规律压缩得越来越好（下面的「压缩即智能」）。注意困惑度只在<strong>同一个分词器、同一份测试集</strong>上才可比，
        换了词表（中文切得碎、英文切得整）数字就没法横向对照，这是看 benchmark 时常踩的坑。
      </p>

      <Example title="同一个前缀，不同的概率分布">
        <p>输入「天空是」，模型可能给出这样的下一个词分布：</p>
        <ul>
          <li>
            <code>蓝</code> · 62%　<code>蓝色</code> · 18%　<code>晴</code> · 6%　<code>灰</code> · 4%……
          </li>
        </ul>
        <p>
          而输入「Python 是一种」，分布会完全不同：<code>编程</code> · 41%、<code>解释型</code> · 15%、
          <code>动态</code> · 11%……模型并没有「查」什么，它只是把训练时见过的语言规律，压缩成了这套概率。
        </p>
      </Example>

      <NextTokenAnim />

      <KeyIdea title="压缩即智能">
        <p>
          为了把「下一个词」预测得足够准，模型不得不在参数里压缩进语法、事实、推理模式乃至代码逻辑——
          因为这些都是降低预测误差的有效手段。所谓「智能」，很大程度上是<strong>极致压缩</strong>训练数据的副产物。
          困惑度 <em>perplexity</em>（≈ 平均每步在多少个词之间「犹豫」，等于交叉熵的指数）就是衡量这种压缩好坏的指标，越低越好。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="三个最常见的误解">
        <p>把下面这三句话从脑子里删掉，能避免后面 80% 的坑：</p>
        <ul>
          <li>
            <strong>「它在思考」</strong>——它没有思考，只是在做 next-token prediction；所谓「推理」是把推理过程也当成文字生成出来（见思维链一章）。
          </li>
          <li>
            <strong>「它想帮我」</strong>——它没有意图，只是补全最可能的后续；「乐于助人」是对齐训练塑造出的文本风格。
          </li>
          <li>
            <strong>「它会去查资料库」</strong>——基础模型不联网、不查库，答案全部来自冻结的参数；要查资料得靠 RAG（第 5 卷）。
          </li>
        </ul>
      </Callout>

      <h2>自回归的代价：为什么生成是「串行」的</h2>
      <p>
        next-token prediction 还藏着一个工程后果：生成必须<strong>一个词一个词来</strong>，无法并行。第 5 个词依赖前 4 个词，
        第 6 个又依赖前 5 个，环环相扣。这和训练形成鲜明对比——训练时全部正确答案已知（teacher forcing），整段话可以一次性并行算完；
        但推理时第 t 步的输入要等第 t-1 步算完才有，只能排队。
      </p>
      <p>
        这条「串行链」直接决定了你的体感延迟：输出 200 个词，约等于把模型跑 200 次前向传播。所以「首字快、整体慢」是常态，
        流式输出（一边生成一边吐字）之所以重要，正是因为它把这条必然的串行等待，变成了用户可以「边读边等」的体验。后面第 6 章讲的
        prefill / decode 两阶段、KV cache，本质都是在和这条串行链的开销死磕。
      </p>
      <Example title="一次生成，到底发生了几次预测">
        <p>
          输入「今天天气」，要它续写「今天天气真不错」。模型实际做了这样一串预测：
        </p>
        <ul>
          <li>看「今天天气」→ 预测出「真」，接上 → 「今天天气真」</li>
          <li>看「今天天气真」→ 预测出「不」，接上 → 「今天天气真不」</li>
          <li>看「今天天气真不」→ 预测出「错」，接上 → 「今天天气真不错」</li>
          <li>看「今天天气真不错」→ 预测出一个「结束符」，停止。</li>
        </ul>
        <p>
          每一行都是一次完整的前向传播、一次 softmax、一次采样。模型没有「想好整句再说」，
          它是真的在<strong>走一步看一步</strong>。理解这点，你就不会再问「它怎么知道这句话该多长」——它不知道，它只是一直预测到蹦出结束符为止。
        </p>
      </Example>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        推理时，模型参数是<strong>冻结</strong>的：你和它对话，它不会「记住」也不会「学到」任何东西，每一轮都是从零
        根据当前上下文重新预测（这正是后面要做记忆系统和 RAG 的根本原因）。理解了「它只是按概率补全」，你就会明白：
        想让它表现好，关键是<strong>把上下文（prompt）构造对</strong>——这就是 Prompt 工程和整个 Agent 工程的立足点。
      </p>
      <p>
        再往实战推一层：既然每一轮都是「无记忆地重新预测」，那么<strong>所有你想让它知道的东西，都必须出现在这一轮的上下文里</strong>——
        历史对话、检索到的资料、工具返回的结果，少一样它就当不存在。这就是为什么 Agent 工程里有大半的精力，
        花在「怎么把对的信息、用对的格式、放进有限的上下文窗口」上。模型的「智商」你改不了，但喂给它的上下文，完全是你说了算。
      </p>

      <Practice title="亲手看一眼模型的「犹豫」">
        <p>
          用 OpenAI API 的 <code>logprobs</code> 参数，把模型对下一个词的候选概率打印出来。换几个不同的前缀
          （确定的、模糊的、有歧义的），观察分布的尖锐程度有什么不同。
        </p>
        <CodeBlock lang="python" title="peek_logprobs.py" code={logprobCode} />
        <p>
          试试把输入换成「2 加 2 等于」（分布会非常尖，几乎全压在「4」上）和「我最喜欢的颜色是」
          （分布会很平，各种颜色都有份），体会一下「确定」和「不确定」在概率上长什么样。
        </p>
      </Practice>

      <Summary
        points={[
          '大模型的唯一核心动作是 next-token prediction：根据前文预测下一个词的概率分布，再自回归地一个个接下去。',
          'logits 经 softmax 变成概率；训练用交叉熵 loss = -log(正确词概率)，配合 teacher forcing 并行学习。',
          'perplexity（困惑度）衡量预测的好坏，本质是交叉熵的指数，越低代表压缩得越好。',
          '“压缩即智能”：为了预测准，模型把语法、事实、推理都压进了参数里。',
          '推理时参数冻结，模型不思考、无意图、不查库，对话中也学不到新东西。',
          '正因如此，做 Agent 的功夫几乎全在“如何构造上下文”，这是后面所有内容的根。',
        ]}
      />
    </>
  )
}
