import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import FateDice from '@/components/illustrations/FateDice.jsx'

const sampleCode = `import numpy as np

def softmax(x):
    x = x - x.max()
    e = np.exp(x)
    return e / e.sum()

def sample(logits, temperature=1.0, top_p=1.0, rng=None):
    rng = rng or np.random.default_rng()
    logits = np.asarray(logits, dtype=float)

    # temperature=0 视为贪心解码：直接取概率最高的词
    if temperature <= 0:
        return int(logits.argmax())

    # 1) 温度缩放：logits 除以 T 再 softmax
    probs = softmax(logits / temperature)

    # 2) top-p（nucleus）：按概率从高到低累加，
    #    只保留累计概率刚超过 p 的最小集合
    order = np.argsort(probs)[::-1]          # 概率从大到小的下标
    sorted_probs = probs[order]
    cumulative = np.cumsum(sorted_probs)
    keep = cumulative <= top_p
    keep[0] = True                            # 至少保留概率最高的那个
    cutoff = order[keep]

    # 3) 在保留集合上重新归一化，然后按概率抽样
    kept_probs = probs[cutoff]
    kept_probs = kept_probs / kept_probs.sum()
    return int(rng.choice(cutoff, p=kept_probs))

logits = np.array([3.0, 2.0, 1.0, 0.5, -1.0])

for T in [0.2, 0.7, 1.5]:
    picks = [sample(logits, temperature=T, top_p=0.9) for _ in range(1000)]
    counts = np.bincount(picks, minlength=len(logits))
    print(f'T={T}: 各词被选中的次数 {counts}')`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          模型每一步输出的是一整套「下一个词」的概率分布。可你只能接上一个词，那到底接哪个？这一步叫<em>采样</em>
          （sampling，也叫解码）。同一个问题，今天答「好的，我来帮你」，明天答「没问题，这就开始」——
          差别多半不在模型，而在采样策略。本章讲温度、top-k、top-p、惩罚项，以及一个反直觉的事实：
          就算把温度设成 0，也不保证逐字一模一样。
        </p>
      </Lead>

      <h2>温度：调节分布的「尖」与「平」</h2>
      <p>
        回忆第 1 章，logits 经 softmax 变成概率。<em>temperature</em>（温度，记作 T）就是在 softmax <strong>之前</strong>
        给所有 logits 除以 T：先 <code>logits / T</code>，再 softmax。
      </p>
      <ul>
        <li><strong>T &lt; 1</strong>（如 0.2）：相当于放大 logits 之间的差距，分布变<strong>尖</strong>，高概率词更占优，输出更确定、更保守。</li>
        <li><strong>T = 1</strong>：用模型原始的概率分布，不做调整。</li>
        <li><strong>T &gt; 1</strong>（如 1.5）：压缩差距，分布变<strong>平</strong>，低概率词也有机会，输出更随机、更有创意，但也更容易跑偏。</li>
      </ul>
      <p>
        极限情况：T 趋近 0 时，分布趋近 one-hot——永远选概率最高的那个词，这等价于<em>贪心解码</em>（greedy decoding）。
        T 趋近无穷大时，分布趋近均匀分布，等于瞎猜。实践中，事实问答、代码生成常用 0 到 0.3；
        头脑风暴、文案创作常用 0.7 到 1.0。
      </p>

      <FateDice />

      <h2>截断采样：top-k 与 top-p</h2>
      <p>
        光调温度有个问题：温度高时，那条长长的「低概率尾巴」（成千上万个几乎不可能但非零的词）累加起来也有可观概率，
        偶尔会蹦出一个完全不着调的词。截断采样就是先把尾巴砍掉，只在靠谱的候选里抽。
      </p>
      <h3>top-k</h3>
      <p>
        <em>top-k</em> 采样：每步只保留概率最高的 <strong>k 个</strong>词（比如 k=40），其余全部丢弃，
        在这 k 个里重新归一化后再抽样。缺点是 k 固定不灵活：分布很尖时 k 个里塞了很多垃圾，分布很平时又可能砍掉了合理候选。
      </p>
      <h3>top-p（nucleus 采样）</h3>
      <p>
        <em>top-p</em>（核采样，nucleus sampling）更聪明：不固定个数，而是按概率从高到低累加，
        保留累计概率刚好达到阈值 p（比如 0.9）的<strong>最小集合</strong>，其余丢弃。这样候选集大小会<strong>自适应</strong>：
        分布尖时可能只留几个，分布平时自动多留一些。top-p 是目前最常用的策略，常和温度一起用。
      </p>

      <Example title="同样的分布，top-p 怎么截">
        <p>
          假设某步五个候选词的概率是 <code>[0.5, 0.3, 0.1, 0.07, 0.03]</code>，设 top-p = 0.9：
        </p>
        <ul>
          <li>累加：0.5 → 0.8 → 0.9，到第三个词时累计已达 0.9。</li>
          <li>于是只保留前三个词，丢掉最后两个，在前三个里重新归一化再抽样。</li>
        </ul>
        <p>
          如果分布更尖、是 <code>[0.92, 0.05, ...]</code>，那第一个词就已超过 0.9，只保留它一个——这步几乎就是确定的。
          可见 top-p 会随分布形状自动调整候选数。
        </p>
      </Example>

      <h2>退化与惩罚项</h2>
      <p>
        温度调低、或用贪心解码时，模型容易陷入<em>退化</em>（degeneration）：重复同一个词、同一句话，
        或者啰嗦绕圈子（「总之，总而言之，综上所述……」）。这是因为高概率路径常常自我强化——
        一旦开始重复，重复内容反而进一步抬高了「继续重复」的概率。
      </p>
      <ul>
        <li>
          <strong>repetition penalty</strong>（重复惩罚）：对已经出现过的 token，给它的 logits 打个折扣，降低再次被选中的概率。
        </li>
        <li>
          <strong>frequency penalty</strong>（频率惩罚，OpenAI API 参数）：出现次数越多，惩罚越重，按出现频率线性增加。
        </li>
        <li>
          <strong>presence penalty</strong>（存在惩罚）：只要出现过就扣一次固定的分，鼓励引入新话题，和出现几次无关。
        </li>
      </ul>
      <p>
        这些惩罚都在 softmax 之前作用于 logits。设大了会让输出变得生硬、强行不重复（连必要的重复词如「的」也躲）；
        通常 0.1 到 0.5 的小值就够。
      </p>

      <Callout variant="warn" title="temperature=0 也不保证逐字复现">
        <p>
          很多人以为「温度设 0 就完全确定、每次输出一模一样」。在云端大模型 API 上，这<strong>往往不成立</strong>，原因有几个：
        </p>
        <ul>
          <li>
            <strong>浮点不确定性</strong>：GPU 上的并行归约（reduction）求和顺序不固定，浮点加法不满足结合律，
            微小误差可能让两个非常接近的 logits 的排序翻转，于是贪心选出的词就不同了。
          </li>
          <li>
            <strong>批处理（batching）影响</strong>：你的请求和别人的请求被拼进同一个 batch 一起算，
            batch 的组成会改变某些 kernel 的计算路径，进而影响数值结果。
          </li>
          <li>
            <strong>MoE 路由</strong>：混合专家模型（Mixture of Experts）里，token 被路由到哪个专家也可能受 batch 影响，带来额外抖动。
          </li>
        </ul>
        <p>
          所以追求可复现性时，除了 <code>temperature=0</code>，还要尽量固定 <code>seed</code>（部分 API 支持）、固定模型版本，
          并接受「仍可能有少量差异」。本地单卡、确定性 kernel 下才比较容易做到严格复现。
        </p>
      </Callout>

      <h2>beam search：为什么聊天里很少用</h2>
      <p>
        <em>beam search</em>（束搜索）是另一类解码：它不只保留一条路径，而是同时维护 b 条（束宽 beam width）累计概率最高的候选序列，
        每步都扩展再剪枝，最后选整体概率最高的那条。它在机器翻译、摘要这类「有标准答案、要最优」的任务上效果好。
      </p>
      <p>
        但开放式聊天里很少用 beam search，原因是：它倾向于产出<strong>高概率但乏味、安全、重复</strong>的句子
        （最可能的续写往往最平庸）；计算成本是单路解码的 b 倍；而且它和「多样、有人味」的对话目标相反。
        所以聊天模型几乎都用「温度 + top-p + 惩罚」的随机采样，而不是 beam search。
      </p>

      <KeyIdea title="随机性是“配置出来的”，不是模型的本性">
        <p>
          模型本身每一步给的是一个<strong>确定的概率分布</strong>；最终输出是否多变，取决于你怎么从这个分布里采样。
          需要稳定、可审计（如抽取结构化字段、跑评测）就把温度压到 0、关掉惩罚；需要创意、多样就调高温度配 top-p。
          把采样参数当成一个旋钮，根据任务来拧，而不是默认值一把梭。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        Agent 里要让模型输出可被解析的 JSON、要它严格走某个工具调用格式时，<strong>低温度</strong>几乎是必须的——
        高温度会让格式偶尔崩坏，导致解析失败、流程中断。反过来，要生成多个不同候选方案再投票（self-consistency）时，
        又需要适当的温度制造多样性。还要记住前面那条警告：即便温度为 0，线上结果也可能有抖动，
        所以关键判断别假设「输出永远逐字一致」，要做容错和校验。
      </p>

      <Practice title="自己实现 temperature + top-p 采样">
        <p>
          下面用纯 numpy 实现一个支持温度和 top-p 的采样函数，并统计不同温度下各候选词被选中的频次，直观感受温度对随机性的影响。
        </p>
        <CodeBlock lang="python" title="sampling.py" code={sampleCode} />
        <p>
          观察输出：T=0.2 时几乎总选第一个词（次数高度集中），T=1.5 时各词都分到不少次数（分布变平）。
          再把 <code>top_p</code> 从 0.9 调到 0.5，看候选是不是被砍得更狠、低概率词彻底没机会。
        </p>
      </Practice>

      <Summary
        points={[
          'temperature 在 softmax 前给 logits 除以 T：T<1 分布更尖更确定，T>1 更平更随机，T→0 等于贪心解码。',
          'top-k 固定保留前 k 个候选；top-p（nucleus）按累计概率自适应保留最小集合，是最常用的策略。',
          '低温/贪心易退化（重复啰嗦），用 repetition / frequency / presence penalty 在 logits 上做惩罚来缓解。',
          'temperature=0 也不保证逐字复现：GPU 浮点归约顺序、批处理组成、MoE 路由都会带来抖动。',
          'beam search 维护多条高概率路径，适合翻译/摘要；聊天里少用，因为它产出乏味重复且成本高。',
          '采样参数是按任务来拧的旋钮：要稳定可解析就压低温度，要多样创意就调高温度配 top-p。',
        ]}
      />
    </>
  )
}
