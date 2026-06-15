import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'
import NextTokenAnim from '../../components/illustrations/NextTokenAnim.jsx'

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

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        推理时，模型参数是<strong>冻结</strong>的：你和它对话，它不会「记住」也不会「学到」任何东西，每一轮都是从零
        根据当前上下文重新预测（这正是后面要做记忆系统和 RAG 的根本原因）。理解了「它只是按概率补全」，你就会明白：
        想让它表现好，关键是<strong>把上下文（prompt）构造对</strong>——这就是 Prompt 工程和整个 Agent 工程的立足点。
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
