import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import AttentionGaze from '@/components/illustrations/AttentionGaze.jsx'

const attnCode = `import numpy as np

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)   # 数值稳定：先减最大值
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

# 假设有 3 个 token，每个 token 的表示是 4 维
np.random.seed(0)
X = np.random.randn(3, 4)        # (序列长度 n=3, d_model=4)

d_k = 4
# 三个投影矩阵：把输入投影成 Q、K、V（这里 d_k 取和 d_model 相同）
Wq = np.random.randn(4, d_k)
Wk = np.random.randn(4, d_k)
Wv = np.random.randn(4, d_k)

Q = X @ Wq    # (3, d_k)  我“在找”什么
K = X @ Wk    # (3, d_k)  我“能提供”什么
V = X @ Wv    # (3, d_k)  我“携带”的信息

# 第 1 步：打分，Q 和每个 K 做点积
scores = Q @ K.T               # (3, 3)
# 第 2 步：缩放，除以 sqrt(d_k)
scores = scores / np.sqrt(d_k)

# 第 3 步（可选）：因果掩码，禁止看后面的 token
mask = np.triu(np.ones((3, 3)), k=1).astype(bool)
scores = np.where(mask, -np.inf, scores)

# 第 4 步：softmax 得到注意力权重，再对 V 加权求和
weights = softmax(scores, axis=-1)   # 每一行加起来等于 1
out = weights @ V                    # (3, d_k)

print('注意力权重（每行和为 1）:\\n', np.round(weights, 3))
print('输出形状:', out.shape)`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章里，每个 token 变成了一个向量，但这些向量彼此独立、互不知道。可「它」指代谁、「银行」是河岸还是金融机构，
          都要靠上下文里别的词来决定。<em>注意力机制</em>（attention）就是干这件事的：它让每个 token 在生成自己的新表示时，
          按相关程度去「看」序列里其他 token，把有用的信息加权汇聚过来。这是 Transformer 的核心，也是大模型能处理长程依赖的关键。
        </p>
      </Lead>

      <h2>Q、K、V：查询、键、值</h2>
      <p>
        注意力的核心是三个由输入投影出来的矩阵。对每个 token 的向量，分别乘上三个学到的权重矩阵
        <code>Wq</code>、<code>Wk</code>、<code>Wv</code>，得到三个向量：
      </p>
      <ul>
        <li><strong>Query（查询，Q）</strong>：代表「我现在想找什么信息」。</li>
        <li><strong>Key（键，K）</strong>：代表「我这个 token 能提供什么、可以被什么样的查询匹配上」。</li>
        <li><strong>Value（值，V）</strong>：代表「如果你看中了我，我实际交给你的内容」。</li>
      </ul>
      <p>
        一个直观类比是查字典：Query 是你要查的词，Key 是每个词条的标题，Value 是词条的释义。
        匹配靠 Query 和 Key，取走的内容是 Value。注意这只是类比，模型并不真的「查」什么，
        三个矩阵全是训练学出来的连续向量。
      </p>

      <h3>注意力的四步，与那个著名公式</h3>
      <p>
        把所有 token 的 Q、K、V 分别堆成矩阵，整个自注意力（self-attention）就是一个公式：
      </p>
      <CodeBlock
        lang="text"
        title="scaled dot-product attention"
        code={`Attention(Q, K, V) = softmax( Q · K^T / sqrt(d_k) ) · V`}
      />
      <p>拆成四步看：</p>
      <ul>
        <li>
          <strong>第一步，打分</strong>：<code>Q · K^T</code>。每个 Query 和每个 Key 做点积，
          点积越大表示这两个 token 越「相关」。结果是一个 n×n 的分数矩阵（n 是序列长度）。
        </li>
        <li>
          <strong>第二步，缩放</strong>：除以 <code>sqrt(d_k)</code>（d_k 是 Key 向量的维度）。下面专门解释为什么要除。
        </li>
        <li>
          <strong>第三步，归一化</strong>：对每一行做 <em>softmax</em>，把分数变成一组加起来为 1 的<strong>注意力权重</strong>。
        </li>
        <li>
          <strong>第四步，加权求和</strong>：用这组权重去对所有 Value 加权平均，得到这个 token 的新表示。
        </li>
      </ul>

      <AttentionGaze />

      <h3>为什么要除以 √d_k</h3>
      <p>
        这一步不是装饰，是数值上的必需。Q 和 K 的点积是 d_k 个乘积之和；如果各分量是均值 0、方差 1 的独立随机量，
        那么点积的<strong>方差会随 d_k 线性增长</strong>，期望量级约为 <code>sqrt(d_k)</code>。d_k 一大（常见 64、128），
        点积就会变得很大或很小。
      </p>
      <p>
        而 softmax 对输入的绝对大小很敏感：当输入里某个值远大于其他值时，softmax 会<strong>饱和</strong>——几乎把全部权重压到那一个上，
        其余接近 0。一旦饱和，softmax 的梯度也几乎为 0（<em>梯度消失</em>），训练就推不动了。除以 <code>sqrt(d_k)</code>
        正好把点积的方差拉回 1 附近，让 softmax 处在「有区分度但不饱和」的区间，梯度健康。
      </p>

      <Example title="缩放前后，softmax 的差别">
        <p>
          假设 d_k=64，三个未缩放点积分数是 <code>[40, 8, 8]</code>。直接 softmax，第一个的权重约 0.99999，
          其余几乎为 0——分布几乎是 one-hot，等于「只看一个词，别的全不看」，且梯度趋近 0。
        </p>
        <p>
          除以 <code>sqrt(64)=8</code> 后变成 <code>[5, 1, 1]</code>，softmax 约为 <code>[0.96, 0.02, 0.02]</code>，
          仍突出第一个，但保留了对其余两个的少量关注，梯度也不会消失。这就是缩放的意义。
        </p>
      </Example>

      <h2>因果掩码：不许偷看未来</h2>
      <p>
        生成式语言模型是自回归的——预测第 t 个词时，只能依赖第 1 到 t-1 个词，绝不能看到第 t 个及之后的词
        （否则就是「抄答案」，训练出的模型没法做生成）。实现办法是 <em>causal mask</em>（因果掩码，也叫前瞻掩码）：
        在第二步打分之后、softmax 之前，把分数矩阵里「当前位置看向未来位置」的那些格子全部置为 <code>-inf</code>。
      </p>
      <p>
        <code>-inf</code> 经过 <code>exp</code> 后变成 0，于是 softmax 后这些未来位置的权重严格为 0。
        效果就是每个 token 只能注意到它自己和它前面的 token。Encoder 类模型（如做分类的 BERT）不需要这个掩码，
        但所有 GPT 式生成模型都用它。
      </p>

      <h2>多头注意力</h2>
      <p>
        只做一组 Q/K/V 表达力不够：一句话里「指代关系」「句法关系」「语义关联」可能需要同时关注不同方面。
        <em>multi-head attention</em>（多头注意力）的做法是：把 d_model 切成 h 份（比如 h=12、d_model=768，每头 64 维），
        每一「头」用自己独立的 Wq/Wk/Wv 各做一遍上面的注意力，得到各自的输出，最后把所有头的输出拼接起来，
        再过一个输出投影矩阵 <code>Wo</code> 合并。
      </p>
      <p>
        这样不同的头可以学到不同的「关注模式」：有的头专门盯着前一个词，有的头追踪主谓一致，有的头连接代词和它的先行词。
        多头是用基本相同的计算量，换来了关注多种关系的能力。
      </p>

      <KeyIdea title="注意力是“按相关度加权汇聚信息”">
        <p>
          剥开公式，注意力做的事就一句话：<strong>每个 token 用自己的 Query 去和所有 token 的 Key 算相关度，
          再按这个相关度把所有 Value 加权平均过来。</strong>它让原本孤立的词向量变成「看过上下文」的表示。
          这就是为什么经过注意力后，同一个词在不同句子里能有不同含义（contextual embedding）。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="高注意力权重 ≠ 模型“真懂”">
        <p>
          很多教程喜欢把注意力权重可视化，说「看，模型把代词和它指代的名词连起来了，说明它理解了语法」。要小心：
        </p>
        <ul>
          <li>
            注意力权重只是 softmax 出来的一组系数，它<strong>不等于解释</strong>。研究表明，attention 权重和模型最终决策的因果关系并不可靠，
            「注意力高」不代表「这就是它判断的依据」。
          </li>
          <li>
            多头、多层叠加后，信息高度混合，单看某一层某一头的权重图很容易过度解读。
          </li>
          <li>
            别用注意力图当作模型「理解了」的证据，更别用它来调试事实正确性。它是计算机制，不是认知。
          </li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        注意力是 n×n 的：序列里每个 token 都要和其他每个 token 算分。这意味着计算量随上下文长度<strong>平方增长</strong>
        （O(n²)）——这正是长上下文又慢又贵的根本原因，也是第 6 章 KV cache、FlashAttention 等优化要解决的问题。
        理解注意力还能帮你写更好的 prompt：把关键信息放在模型「容易注意到」的位置（开头和结尾），
        别把重要约束埋在超长上下文的正中间（第 6 章的 lost in the middle）。
      </p>

      <Practice title="用 numpy 手算一个单头注意力">
        <p>
          下面这段代码不依赖任何深度学习框架，纯 numpy 实现完整的四步缩放点积注意力，还带了因果掩码。
          跑一遍，重点看打印出来的注意力权重矩阵：每一行加起来都是 1，且上三角（未来位置）全是 0。
        </p>
        <CodeBlock lang="python" title="single_head_attention.py" code={attnCode} />
        <p>
          改改试试：把 <code>scores = scores / np.sqrt(d_k)</code> 这行注释掉，观察权重是不是变得更「尖」（更接近 one-hot）；
          再把因果掩码那几行删掉，看每行权重是不是不再是下三角结构。
        </p>
      </Practice>

      <Summary
        points={[
          '注意力让每个 token 按相关度去“看”其他 token，把有用信息加权汇聚，是 Transformer 的核心机制。',
          '每个 token 投影出 Query/Key/Value：Q 是“想找什么”，K 是“能匹配什么”，V 是“实际给出的内容”。',
          '完整公式是 softmax(Q·K^T / √d_k)·V，分为打分、缩放、softmax 归一化、对 V 加权求和四步。',
          '除以 √d_k 是为了把点积方差拉回 1，避免 softmax 饱和导致梯度消失。',
          'causal mask 把“看向未来”的分数置为 -inf，保证自回归生成不偷看后文；多头注意力让模型并行关注多种关系。',
          '高注意力权重不等于模型“真懂”，注意力图是计算机制而非可靠解释，别拿它当事实正确性的依据。',
        ]}
      />
    </>
  )
}
