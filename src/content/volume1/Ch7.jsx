import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const selfCheckCode = `import numpy as np
from openai import OpenAI

client = OpenAI()

def ask(question, temperature):
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': question}],
        temperature=temperature,
        max_tokens=80,
    )
    return resp.choices[0].message.content.strip()

def self_consistency(question, n=5, temperature=0.8):
    # 同一个问题多次采样，看答案稳不稳
    samples = [ask(question, temperature) for _ in range(n)]
    # 简单归一化后统计：完全一致的答案越多，越可信
    norm = [s.lower().rstrip('.。 ') for s in samples]
    values, counts = np.unique(norm, return_counts=True)
    top = counts.max()
    agreement = top / n
    return {
        'samples': samples,
        'agreement': round(float(agreement), 2),  # 一致率，越接近 1 越可信
        'majority': values[counts.argmax()],
    }

# 事实清楚的问题：多次采样应高度一致
print(self_consistency('珠穆朗玛峰的高度约是多少米？只回答数字。'))
# 容易编造的问题：答案常常各不相同，一致率低 -> 可疑
print(self_consistency('请给出论文《XYZ 自适应注意力》的作者和年份。'))`

export default function Ch7() {
  return (
    <>
      <Lead>
        <p>
          大模型会一本正经地说错话：编造不存在的论文、写出语法完美但事实错误的解释、给出根本没有的 API 参数。
          这就是<em>幻觉</em>（hallucination）。它不是偶发 bug，而是 next-token prediction 这个机制的<strong>结构性结果</strong>。
          本章讲清楚幻觉的成因、有哪几类、怎么检测、怎么缓解，以及为什么它在 Agent 里格外危险。
        </p>
      </Lead>

      <h2>根因：训练只奖励「像不像人话」，不奖励「真不真」</h2>
      <p>
        回到第 1 章：预训练的目标是最小化交叉熵，也就是让模型预测的下一个词尽量接近真实文本。这个信号衡量的是
        <strong>「这段话像不像训练语料里会出现的话」</strong>，<strong>没有任何一项直接衡量「这句话是不是真的」</strong>。
        一个流畅、合理、符合语言习惯的句子，哪怕内容是编的，也能拿到很低的 loss。
      </p>
      <p>
        换句话说，模型被训练成一个极强的「合理文本生成器」，而不是「真理判别器」。当它对某个事实不确定时，
        它不会停下来说「我不知道」，而是<strong>顺着最像样的方向把话补完</strong>——因为补完一个流畅的句子，
        正是它被训练去做的事。这就是幻觉的第一层根因。
      </p>

      <h3>有损压缩：参数里装不下所有细节</h3>
      <p>
        模型把海量训练数据压缩进有限的参数里（第 1 章「压缩即智能」）。这是<strong>有损压缩</strong>：
        常见、规律性强的知识被记得牢，长尾的、具体的细节（某篇论文的确切标题、某个函数的精确签名、某个小地名）
        则可能被「压糊」了。推理时遇到这些被压糊的地方，模型会用「最可能的样子」去<strong>补空白</strong>，
        于是编出一个看起来很合理、实际不存在的细节。
      </p>

      <h3>校准：模型「知不知道自己不知道」</h3>
      <p>
        <em>calibration</em>（校准）指模型输出的概率是否反映真实的正确率——如果它对一批答案都给 80% 的置信度，
        理想情况下这批答案里应该约 80% 是对的。基座模型常常校准得还不错，但经过 RLHF 对齐后，
        模型往往变得<strong>过度自信</strong>：用同样笃定、流畅的口吻说对的和错的，置信度和正确率脱钩。
        这正是幻觉「难防」的地方：它听起来和正确答案一样自信。
      </p>

      <Callout variant="warn" title="幻觉的五个常见类型">
        <ul>
          <li><strong>事实错误</strong>：把事实说错，如错误的日期、数字、因果关系、人物事件。</li>
          <li><strong>虚构引用</strong>：编造不存在的论文、书目、URL、法条、API；细节齐全（作者、年份、卷期）却全是假的，最坑人。</li>
          <li><strong>过时信息</strong>：训练数据有截止日期，模型不知道之后发生的事，却仍按旧知识笃定作答。</li>
          <li><strong>指令误解</strong>：没真正听懂你的要求，答了一个相关但不对的问题，或漏掉关键约束。</li>
          <li><strong>逻辑自相矛盾</strong>：同一段回答里前后打架，或推理链条中间偷偷跳步、得出不成立的结论。</li>
        </ul>
      </Callout>

      <Example title="一个典型的虚构引用">
        <p>
          问模型「请推荐一篇关于 X 的权威论文」，它可能答：
        </p>
        <ul>
          <li>《Adaptive Attention for Long-Context Transformers》，作者 J. Smith 等，发表于 NeurIPS 2021，引用量 800+。</li>
        </ul>
        <p>
          标题像模像样、作者像真名、会议和年份都对得上格式、连引用量都给了——但这篇论文<strong>根本不存在</strong>。
          模型只是按「一篇该领域论文该长什么样」把字段一个个填了出来。这类幻觉因为细节完整，反而最容易骗过人，
          所以凡是引用、链接、API 名，都要<strong>独立核实</strong>。
        </p>
      </Example>

      <h2>怎么检测：低置信与自一致性</h2>
      <p>
        既然幻觉听起来很自信，怎么发现它？两个实用信号：
      </p>
      <ul>
        <li>
          <strong>低置信检测</strong>：看 token 的 logprobs（第 1 章）。如果模型在关键事实词（人名、数字、标题）上的概率分布很平、
          候选很分散，说明它其实「没把握」，这类输出更可能是编的。
        </li>
        <li>
          <strong>自一致性检测</strong>（self-consistency）：对同一个问题<strong>多次采样</strong>（用一定温度），
          比对多个答案。事实清楚的问题，多次回答会高度一致；它在编造的内容，多次回答往往<strong>各不相同</strong>。
          答案分歧大，就是一个强烈的「可疑」信号。这也是 SelfCheckGPT 等方法的核心思路。
        </li>
      </ul>

      <h2>怎么缓解：六层手段叠起来用</h2>
      <p>没有单一银弹，实战是把多层手段组合：</p>
      <ul>
        <li><strong>RAG（检索增强）</strong>：先检索可信资料，把它放进上下文，让模型基于给定材料作答，而不是凭参数记忆瞎补（第 5 卷）。</li>
        <li><strong>工具核查</strong>：能算的交给计算器/代码执行，能查的交给搜索/数据库 API，别让模型「心算」事实。</li>
        <li><strong>降温</strong>：把 temperature 调低（第 4 章），减少为追求多样性而引入的胡编（但低温不能消除幻觉，只是减少抖动）。</li>
        <li><strong>要求引用来源</strong>：让模型对每个事实标出处，并核对来源是否真实、是否支持该说法；答不出来源的就当不可信。</li>
        <li><strong>自检 / 自一致性</strong>：让模型复核自己的答案，或用上面的多次采样比对，分歧大就触发复查或拒答。</li>
        <li><strong>人审</strong>：高风险场景（医疗、法律、财务、不可逆操作）保留人工复核，这是兜底，不能省。</li>
      </ul>

      <KeyIdea title="把“我不知道”变成一个可接受的答案">
        <p>
          幻觉的很大一部分来自「模型不被允许说不知道」。在 prompt 里<strong>显式授权</strong>它在没把握时回答「不确定」或「无法确认」，
          并要求它区分「我记得的」和「我推测的」，往往能显著降低瞎编。再配合「先给来源、再给结论」「答不出来源就拒答」这类约束，
          把<strong>诚实地承认不确定</strong>变成一个被奖励的行为，而不是逼它硬答。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        在单轮问答里，一个幻觉就是一句错话；但在<strong>多步 Agent</strong> 里，幻觉会被<strong>放大</strong>：
        第一步编出的错误事实，会被当成「已知条件」写进上下文，第二步基于它继续推理、调用工具，错误沿着多步链条
        <strong>层层传播、累积</strong>，最后可能酿成一个完全跑偏、甚至执行了错误操作（删错文件、发错请求）的结果。
        所以 Agent 设计里要在每一步设关卡：工具返回的事实优先于模型记忆、关键步骤加校验、不可逆操作要确认，
        并尽量让每一步的结论可追溯到来源。把幻觉当成一个必然存在、需要全程防御的风险，而不是偶发故障。
      </p>

      <Practice title="写个多次采样 + 一致性检测的自检脚本">
        <p>
          下面的脚本对同一问题多次采样，用「答案一致率」当幻觉信号：一致率高说明模型有把握，
          一致率低（每次答案都不一样）说明它很可能在编。需要 OpenAI key，装 <code>pip install openai numpy</code>。
        </p>
        <CodeBlock lang="python" title="self_consistency_check.py" code={selfCheckCode} />
        <p>
          对比两类问题的输出：事实清楚的问题（珠峰高度）一致率应该接近 1；让它给一篇可能不存在的论文的作者和年份时，
          多次回答往往各说各话、一致率很低——这正是自动标记「这个回答不可信、需要核查或拒答」的依据。
          可以进一步把一致率阈值接进你的 Agent，低于阈值就触发工具核查或要求人审。
        </p>
      </Practice>

      <Summary
        points={[
          '幻觉是结构性问题：训练只奖励“像不像人话”（交叉熵），没有“真不真”的信号，流畅的错话也能拿低 loss。',
          '有损压缩让长尾细节被“压糊”，推理时模型用最合理的样子补空白，于是编出看似可信的虚构内容。',
          '对齐后的模型常过度自信（校准变差），用同样笃定的口吻说对的和错的，这让幻觉难以靠语气分辨。',
          '五类幻觉：事实错误、虚构引用、过时信息、指令误解、逻辑自相矛盾；其中虚构引用细节完整最坑人。',
          '检测靠低置信（看 logprobs）和自一致性（多次采样比对，分歧大即可疑）；缓解靠 RAG、工具核查、降温、要求来源、自检、人审六层叠加。',
          '多步 Agent 会放大幻觉：错误被当作已知条件层层传播累积，需在每步设校验、让事实可追溯、不可逆操作要确认。',
        ]}
      />
    </>
  )
}
