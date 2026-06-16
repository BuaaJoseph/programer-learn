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

      <h2>采样在整条管线里的位置</h2>
      <p>
        先把全局理清。模型每一步吐出 logits 后，到选出一个词，中间经过一条<strong>有顺序</strong>的处理管线：
      </p>
      <ol>
        <li><strong>惩罚项</strong>：repetition / frequency / presence penalty 先在 logits 上做加减（治复读）。</li>
        <li><strong>温度缩放</strong>：logits 除以 T，调整分布尖平。</li>
        <li><strong>softmax</strong>：变成概率分布。</li>
        <li><strong>截断</strong>：top-k / top-p / min-p 砍掉不够格的候选，剩下的重新归一化。</li>
        <li><strong>抽样</strong>：在保留集合里按概率随机抽一个，得到这一步的词。</li>
      </ol>
      <p>
        本章后面所有参数，都是在这条管线的某一环上动手脚。记住这个顺序，你就不会再混淆「温度和 top-p 谁先谁后」「惩罚到底加在哪」
        这类问题——它们各管一段，互不替代。下面逐个拆开讲。
      </p>

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
      <p>
        为什么是「除以 T」而不是「乘以 T」？因为 softmax 看的是 logits 之间的<strong>差距</strong>。除以一个小于 1 的 T，
        等于把所有 logit 的差距放大，差距越大 softmax 越尖；除以一个大于 1 的 T，差距被压缩，分布变平。
        这个名字来自统计物理的玻尔兹曼分布——高温下粒子能量分布更均匀（更随机），低温下集中在低能态（更确定）。
        借这个物理直觉记：<strong>高温 = 乱，低温 = 稳</strong>。
      </p>
      <Callout variant="info" title="T=0 在数学上是个「除以零」">
        <p>
          严格说 <code>logits / 0</code> 没法算，所以 T=0 是一个<strong>特例约定</strong>：实现里直接跳过 softmax，
          用 <code>argmax</code> 取概率最高的词（看本章 Practice 代码里 <code>if temperature &lt;= 0</code> 那个分支）。
          理解这点能帮你看懂为什么有些 API 文档把 temperature 的下限标成一个很小的正数而不是 0——它们没专门处理这个特例。
        </p>
      </Callout>

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
      <p>
        「nucleus（核）」这个名字很贴切：一个分布里，真正靠谱的词集中在一小撮高概率词组成的「核心」里，剩下的是一条又长又稀的尾巴。
        top-p 做的就是只保留这个核心、砍掉尾巴。它比 top-k 强在哪？top-k 用「数量」一刀切，不管分布形状；top-p 用「累计概率」切，
        天然贴合分布形状。所以下面这条经验值得记：<strong>大多数场景默认用 top-p，需要更死板地限制候选时再叠 top-k</strong>。
      </p>
      <Callout variant="info" title="温度和 top-p：先后顺序与「别同时乱拧」">
        <p>
          两者作用在采样管线的不同阶段：温度<strong>先</strong>改变整个分布的尖平，top-p <strong>再</strong>在改完的分布上做截断。
          所以它们不是冗余，而是配合——但也正因为都在调「随机性」，新手最好<strong>一次只主调一个</strong>：固定 top-p（如 0.9），
          只动温度，否则两个旋钮互相干扰，你分不清是谁带来的变化。生产里常见的稳妥组合是「温度 0.7 + top-p 0.9」。
        </p>
      </Callout>

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
      <p>
        要分清 frequency 和 presence 的区别：<strong>frequency 是「按次数累加」的连续惩罚</strong>，一个词出现 3 次比出现 1 次罚得更重，
        适合压制「同一个词反复刷屏」；<strong>presence 是「出现过就一次性扣固定分」的开关惩罚</strong>，不管出现几次都只罚一档，
        作用是鼓励模型<strong>引入新词、换新话题</strong>，让内容更发散。一个治「复读」，一个促「破圈」，别用混了。
      </p>
      <Callout variant="info" title="为什么贪心解码反而最容易复读">
        <p>
          很反直觉：温度越低（越贪心）越容易陷入重复循环。原因是低温下模型只敢走「最高概率路径」，而语言里高概率的续写往往是
          「重复刚说过的话」——一旦它说了「非常重要」，下一步「非常重要」的概率又被自己抬高了，于是越转越深，卡进死循环。
          高温因为允许偶尔偏离，反而能「跳出」循环。这也是为什么纯贪心很少单用，通常要配上重复惩罚兜底。
        </p>
      </Callout>

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

      <Example title="一张表：什么任务配什么参数">
        <p>没有万能配置，但有一套靠谱的起点，按「要不要确定性」来分：</p>
        <table>
          <thead>
            <tr><th>任务</th><th>temperature</th><th>top-p</th><th>为什么</th></tr>
          </thead>
          <tbody>
            <tr><td>抽取结构化字段 / JSON</td><td>0</td><td>1.0</td><td>要可解析、可复现，不要任何花样</td></tr>
            <tr><td>事实问答 / 代码</td><td>0 ~ 0.3</td><td>0.9</td><td>要准，少发散</td></tr>
            <tr><td>翻译 / 改写</td><td>0.3 ~ 0.5</td><td>0.9</td><td>略留弹性，但别跑偏原意</td></tr>
            <tr><td>文案 / 头脑风暴</td><td>0.8 ~ 1.0</td><td>0.95</td><td>要多样、有创意</td></tr>
            <tr><td>多路采样投票（self-consistency）</td><td>0.7 ~ 0.9</td><td>0.95</td><td>故意制造不同推理路径</td></tr>
          </tbody>
        </table>
        <p>
          这些是<strong>起点</strong>不是定论。拿你的真实任务，固定其他参数、只扫温度，跑一组对比，才能定出最适合你场景的值。
        </p>
      </Example>

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

      <h2>min-p 与其它新策略</h2>
      <p>
        采样策略还在演进。一个近年流行的是 <em>min-p</em>：它不设绝对阈值，而是按「最高概率词的某个比例」来定门槛——
        比如 min-p=0.1，就保留概率不低于「最高词概率 × 0.1」的所有词。它的好处是<strong>自适应分布的尖锐度</strong>：
        分布很尖（模型很确定）时门槛自动抬高，几乎只留最优词；分布平时门槛降低，给更多词机会。比起 top-p，它在高温下更不容易蹦垃圾词。
      </p>
      <p>
        还有 <em>typical sampling</em>（典型采样，按信息量而非概率选词）等。不必都记住，记住一个框架即可：<strong>这些策略都在做同一件事——
        在采样前，决定「哪些词有资格被抽中」</strong>。它们只是用不同的规则划这条资格线。理解了这个共性，遇到新策略你也能秒懂它在干嘛。
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
