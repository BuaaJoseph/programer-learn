import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const paramCode = `def estimate_params(d_model, n_layers, vocab=None):
    # 经验近似：Transformer 主体（不含 embedding）参数量约 12 * d^2 * 层数
    # 来源：每层 注意力 4*d^2（Q/K/V/O）+ FFN 8*d^2（升 4d 再降）= 12*d^2
    body = 12 * d_model**2 * n_layers
    total = body
    if vocab:
        # embedding 与输出层（常共享权重）约 vocab * d_model
        total += vocab * d_model
    return body, total

models = [
    # 名称, d_model, 层数, 词表, 官方参数量(十亿)
    ('GPT-2 small', 768,   12, 50257, 0.124),
    ('GPT-2 XL',    1600,  48, 50257, 1.5),
    ('GPT-3 175B',  12288, 96, 50257, 175.0),
    ('Llama 2 7B',  4096,  32, 32000, 7.0),
]

for name, d, L, v, official in models:
    body, total = estimate_params(d, L, v)
    print(f'{name:14} 主体≈{body/1e9:7.2f}B  含词表≈{total/1e9:7.2f}B  官方≈{official}B')`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          前几章拆开了单个注意力。但 GPT 这样的模型有几十上百<strong>层</strong>，一个词的向量要被这些层反复加工才出最终结果。
          这一章站高一点看：一个 token 进来后，它的向量是怎么在层与层之间「读取—计算—写回」的，
          每一层里有哪些零件，参数主要堆在哪儿，以及怎么用一个简单公式估出一个模型有多大。
        </p>
      </Lead>

      <h2>残差流：贯穿全模型的一条「主干道」</h2>
      <p>
        现代 Transformer 最关键的结构是<em>残差连接</em>（residual connection）。可以把它理解成一条贯穿所有层的
        <strong>残差流</strong>（residual stream）：一个 token 的向量（维度 d_model）从输入一路流到输出，
        中间每一层都不是「替换」它，而是「在它上面加点东西」。
      </p>
      <p>
        每个子层做的事可以概括为三步——<strong>读</strong>：从残差流读出当前向量；<strong>算</strong>：用注意力或 FFN 算出一个增量；
        <strong>写回</strong>：把这个增量加回残差流。形式上就是 <code>x = x + 子层(x)</code>。这条加法主干道让信息和梯度都能
        一路畅通地传到很深的层，是能训练几十上百层网络的关键（否则梯度会消失，深层学不动）。
      </p>

      <h3>一个 block = 注意力子层 + FFN 子层</h3>
      <p>
        每一层（常叫一个 transformer block）由两个子层串联组成，每个子层都带残差连接和层归一化：
      </p>
      <ul>
        <li>
          <strong>注意力子层</strong>：就是第 3 章讲的多头自注意力，负责让 token 之间<strong>交换信息</strong>
          （「混合」序列里不同位置的内容）。
        </li>
        <li>
          <strong>FFN 子层</strong>（前馈网络，feed-forward network，也叫 MLP）：对<strong>每个 token 独立</strong>地做一次非线性变换，
          位置之间不交互。它负责「加工、存储」信息，很多事实知识被认为就存在 FFN 里。
        </li>
      </ul>
      <p>
        注意力管「横向」沟通，FFN 管「纵向」加工，两者交替堆叠几十层，就是整个模型主体。
      </p>

      <h3>FFN：升维—激活—降维，吃掉约三分之二的参数</h3>
      <p>
        FFN 结构很简单，三步：先用一个矩阵把向量从 d_model <strong>升维</strong>到中间维度 d_ff（通常是 4 倍，即 4·d_model），
        过一个<strong>非线性激活</strong>函数，再用另一个矩阵<strong>降维</strong>回 d_model。
      </p>
      <CodeBlock
        lang="text"
        title="FFN（GELU 激活）"
        code={`FFN(x) = W2 · GELU( W1 · x + b1 ) + b2
# W1: d_model -> 4*d_model（升维）
# W2: 4*d_model -> d_model（降维）`}
      />
      <p>
        激活函数现代多用 <em>GELU</em>（Gaussian Error Linear Unit），比老的 ReLU 更平滑，对小负值不是直接砍成 0，
        而是平滑过渡（一些模型用 SwiGLU 等变体）。注意 FFN 这两个大矩阵：升维 4·d²、降维 4·d²，
        合计约 <strong>8·d²</strong> 个参数；而注意力的 Q/K/V/O 四个矩阵约 <strong>4·d²</strong>。所以
        <strong>FFN 占了每层约 2/3 的参数</strong>，是模型里最大的参数仓库。
      </p>

      <h2>归一化：Pre-LN 还是 Post-LN</h2>
      <p>
        每个子层还要做<em>层归一化</em>（Layer Normalization，LayerNorm），把向量重新缩放到稳定的分布，否则深层数值会爆炸或消失。
        关键是「归一化放在哪」：
      </p>
      <ul>
        <li>
          <strong>Post-LN</strong>（后归一化，原始 Transformer 论文用法）：先做子层和残差相加，再归一化，
          即 <code>x = LayerNorm(x + 子层(x))</code>。深层时训练不稳定，常需小心调学习率和 warmup。
        </li>
        <li>
          <strong>Pre-LN</strong>（前归一化，现代主流）：先归一化再进子层，把结果加回原始残差，
          即 <code>x = x + 子层(LayerNorm(x))</code>。残差流保持「干净」，梯度更稳，深层也好训，几乎是当今大模型的标配
          （很多还用 RMSNorm 这个更省的变体）。
        </li>
      </ul>

      <Example title="一个 token 走过一层，到底发生了什么">
        <p>设当前 token 向量为 x（维度 d_model），用 Pre-LN：</p>
        <ul>
          <li>注意力子层：<code>x = x + 多头注意力(LayerNorm(x))</code>——它从残差流读 x，归一化后算注意力，把结果加回去。</li>
          <li>FFN 子层：<code>x = x + FFN(LayerNorm(x))</code>——再读一次，归一化后过升维-GELU-降维，又加回去。</li>
        </ul>
        <p>
          于是 x 流出这一层，带上了「看过上下文」和「被非线性加工过」的两份增量。下一层重复同样的动作，
          一层层累加，直到最后一层。最末端再用 embedding 表的转置把 x 投影回词表，得到 logits。
        </p>
      </Example>

      <h2>用一个公式估模型有多大</h2>
      <p>
        把上面的零件加起来，每层参数约 <code>4·d² (注意力) + 8·d² (FFN) = 12·d²</code>。
        所以模型主体（不含 embedding）的参数量近似为：
      </p>
      <CodeBlock
        lang="text"
        title="参数量近似"
        code={`参数量 ≈ 12 · d_model^2 · 层数`}
      />
      <p>
        拿 GPT-3 175B 验证：据公开资料它 d_model≈12288、层数≈96。代入 <code>12 × 12288² × 96 ≈ 1.74×10¹¹</code>，
        约 174B——和官方的 175B 几乎吻合（差的部分是 embedding、bias 等）。这个公式好用就好用在：
        知道宽度和深度，心算就能估个量级，反过来也能从参数量倒推大致规模。
      </p>

      <KeyIdea title="深度带来层级化的抽象">
        <p>
          为什么要堆这么多层？粗略地说，浅层更多处理表层模式（拼写、局部语法、相邻词关系），
          越往深层越处理抽象的语义、长程依赖、任务级的推理结构。残差流像一块不断被各层补充信息的「公共草稿纸」，
          每层往上写一点。<strong>深度 + 残差流</strong>，是模型能逐步把「字面」加工成「含义」的结构性原因。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="估算和直觉里的几个坑">
        <ul>
          <li>
            <strong>12·d² 只是主体近似</strong>：没算 embedding（vocab·d_model），小模型里 embedding 占比可能很大，别忽略。
          </li>
          <li>
            <strong>参数量 ≠ 显存 ≠ 算力</strong>：推理还要算 KV cache、激活值的显存（第 6 章），训练显存更是参数的好几倍。
          </li>
          <li>
            <strong>MoE 模型的「总参数」会误导</strong>：混合专家模型每次只激活一部分专家，
            「激活参数量」才更能反映单次推理的算力，别被总参数吓到或骗到。
          </li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        理解「层级加工 + 残差流」能帮你校准对模型能力的预期：模型的「推理」其实是固定层数内的一次前向传播，
        层数是<strong>有限</strong>的，单次前向能做的串行计算步数有上限——这正是为什么复杂任务要靠思维链（把推理摊成文字，
        用更多 token 换更多计算）、要靠多步 Agent 循环来突破单次前向的深度限制。
        而参数量估算能让你在选型时快速判断一个模型「大概多大、大概多贵、能不能塞进你的显卡」。
      </p>

      <Practice title="写个脚本估参数量并验证已知模型">
        <p>
          用 <code>12·d²·层数</code> 的公式估几个公开模型的参数量，和官方数字对比，看看误差有多大。
        </p>
        <CodeBlock lang="python" title="estimate_params.py" code={paramCode} />
        <p>
          跑完会发现：大模型（GPT-3、Llama）主体估值和官方很接近，小模型（GPT-2 small）因为 embedding 占比高，
          要把词表那项加上才准。试着把某个模型的层数翻倍、宽度不变，看参数量是不是线性增长；宽度翻倍则是平方增长。
        </p>
      </Practice>

      <Summary
        points={[
          '残差流是贯穿全模型的主干道，每个子层“读—算—写回”，即 x = x + 子层(x)，让深层网络可训练。',
          '每个 transformer block = 注意力子层（token 间横向交换信息）+ FFN 子层（每个 token 独立纵向加工）。',
          'FFN 走升维(4d)—GELU 激活—降维 的路线，约 8·d² 参数，占每层约 2/3，是模型最大的参数仓库。',
          '现代模型用 Pre-LN（先归一化再进子层）比 Post-LN 更稳、更好训深层。',
          '主体参数量 ≈ 12·d_model²·层数；代入 GPT-3（d≈12288, 层≈96）得约 174B，与官方 175B 吻合。',
          '参数量不等于显存或算力，MoE 看激活参数才准；单次前向深度有限，复杂推理要靠思维链和多步 Agent。',
        ]}
      />
    </>
  )
}
