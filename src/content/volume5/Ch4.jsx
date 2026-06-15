import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const cosineCode = `"""向量检索：余弦 top-k，外加一个「相似但不相关」的反例。
依赖：pip install numpy sentence-transformers
"""
import numpy as np
from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer('all-MiniLM-L6-v2')


def cosine(a, b):
    # 余弦相似度 = 点积 / (模长乘积)，衡量「方向」是否一致
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


def top_k(query, docs, k=2):
    qv = embedder.encode(query)
    dvs = embedder.encode(docs)
    scores = [cosine(qv, d) for d in dvs]
    order = np.argsort(scores)[::-1][:k]
    return [(docs[i], round(scores[i], 3)) for i in order]


# ---------- 正常检索 ----------
docs = [
    '如何重置账户密码',
    '修改账户的登录密码步骤',
    '今天北京的天气怎么样',
]
print('问「忘记密码怎么办」:')
for doc, s in top_k('忘记密码怎么办', docs, k=2):
    print(f'  {s}  {doc}')

# ---------- 反例：相似但语义相反（否定句） ----------
print('\\n反例（否定句陷阱）:')
pair = ['这家餐厅很好吃', '这家餐厅很难吃']
qv = embedder.encode('这家餐厅好吃吗')
for doc in pair:
    print(f'  {cosine(qv, embedder.encode(doc)):.3f}  {doc}')
# 两句话用词几乎相同，向量方向极近，相似度都很高——
# 但语义完全相反。「好吃」和「难吃」检索器分不清，这就是向量相似 != 语义相关。`

export default function Ch5_4() {
  return (
    <>
      <Lead>
        <p>
          RAG 的命脉是检索，检索的核心是「<strong>给一句话，找出库里意思最接近的几段</strong>」。怎么衡量「意思接近」？
          答案是把文本变成向量（embedding），再比较向量的方向有多一致——这个度量叫<em>余弦相似度</em>。
          这一章讲清楚向量检索怎么工作、为什么大库必须用近似算法，以及一个常被忽视的真相：
          <strong>向量相似，并不等于语义相关。</strong>
        </p>
      </Lead>

      <h2>余弦相似度：比的是方向</h2>
      <p>
        embedding 把每段文本映射成高维空间里的一个向量，「意思相近」的文本，向量方向也相近。
        余弦相似度正是衡量两个向量夹角的指标：
      </p>
      <CodeBlock
        lang="text"
        title="cosine similarity"
        code={`cos(a, b) = (a · b) / (|a| × |b|)
            = sum_i(a_i * b_i) / ( sqrt(sum a_i^2) * sqrt(sum b_i^2) )`}
      />
      <p>
        结果在 -1 到 1 之间：1 表示方向完全一致（最相似），0 表示垂直（不相关），-1 表示完全相反。
        注意它只看<strong>方向</strong>、不看<strong>长度</strong>——这正合需要，因为我们关心的是「意思像不像」，
        而不是「文本长不长」。工程上常把向量先<strong>归一化</strong>（变成单位长度），这样余弦相似度就退化成简单的点积，
        算起来更快。
      </p>

      <h3>top-k 检索</h3>
      <p>
        有了相似度，检索就是：把查询向量和库里每个向量都算一遍相似度，按从高到低排序，取前 <code>k</code> 个。
        这就是 <em>top-k</em> 检索。<code>k</code> 是个关键旋钮：太小可能漏掉相关内容，太大会把噪声也捞进来、
        稀释模型注意力（见下一章）。
      </p>

      <h2>为什么需要近似最近邻（ANN）</h2>
      <p>
        「和库里每个向量都算一遍」叫<strong>暴力检索</strong>（brute force）。库里几百条还行，可一旦上到百万、千万级，
        每次查询都全量扫一遍，延迟高到不可用。于是有了<em>近似最近邻</em>（ANN，Approximate Nearest Neighbor）：
        牺牲一点点准确率，换来几个数量级的速度提升。
      </p>
      <ul>
        <li>
          <strong>HNSW</strong>（分层可导航小世界图）：把向量组织成多层图，查询时从稀疏的高层快速跳到目标区域、
          再到稠密底层精搜。召回高、查询快，是目前最主流的方案。
        </li>
        <li>
          <strong>IVF</strong>（倒排文件）：先把向量空间聚成若干簇，查询时只在最近的几个簇里搜，跳过其余。
          省内存、建库快，适合超大规模。
        </li>
      </ul>
      <Callout variant="tip" title="你大概率不用自己实现 ANN">
        <p>
          FAISS、Milvus、Qdrant、pgvector 这些向量库都内置了 HNSW / IVF。你要做的是<strong>理解它们的取舍</strong>——
          调高召回参数更准但更慢、更耗内存；调低则反之。知道有这个旋钮，比手写一遍算法重要得多。
        </p>
      </Callout>

      <h2>切块策略影响检索质量</h2>
      <p>
        检索的最小单位是「块」（chunk），块怎么切，直接决定能不能被检索准。块切得太大，一段里混了好几个主题，
        向量被「平均」成一团糊，谁都不太像；切得太小，一句话的语义不完整，又容易丢上下文。常见做法是按语义边界
        （段落、标题）切，并让相邻块<strong>重叠</strong>一部分，避免把一个完整意思拦腰截断。
        记住：<strong>没被切好的内容，再强的检索器也找不准。</strong>
      </p>

      <h2>向量相似 ≠ 语义相关</h2>
      <p>
        这是整章最重要、也最反直觉的一点。embedding 捕捉的是「整体语义氛围」，在几类场景下会系统性翻车：
      </p>
      <ul>
        <li>
          <strong>否定句</strong>：「这家餐厅很好吃」和「这家餐厅很难吃」用词几乎一样，向量方向极近、相似度很高，
          但意思完全相反。检索器分不清肯定与否定。
        </li>
        <li>
          <strong>多跳推理</strong>：问「A 公司 CEO 的母校在哪」，需要先查到 CEO 是谁、再查他的母校。
          单次向量检索只会找「字面像」的段落，没法替你做这两跳推理。
        </li>
        <li>
          <strong>精确匹配实体 / 数字</strong>：找订单号「20240613」或函数名 <code>parse_config_v2</code>，
          向量会把它和一堆「长得像的别的编号 / 别的函数」混在一起，反而不如关键词精确匹配。
        </li>
      </ul>
      <KeyIdea title="embedding 擅长「意思像」，不擅长「逻辑对」">
        <p>
          向量检索的强项是模糊的语义召回——同义改写、近义概念它都能找到。但它对<strong>否定、推理链、精确符号</strong>
          这类需要「逻辑」而非「语感」的判断无能为力。把它当成一个语感很好但不会算账的助手，
          你就知道什么时候该给它加补丁了。
        </p>
      </KeyIdea>

      <h3>三个补丁</h3>
      <ul>
        <li>
          <strong>hybrid 混合检索</strong>：把向量检索和关键词检索（<em>BM25</em>）的结果融合。
          向量管语义模糊，BM25 管精确实体 / 数字，两者互补，召回明显更稳。
        </li>
        <li>
          <strong>rerank 重排</strong>：先用快速的向量检索粗选 top-50，再用一个更强、更慢的<em>交叉编码器</em>
          对这 50 条逐一精算相关性、重新排序取 top-5。粗筛 + 精排，兼顾速度与准度。
        </li>
        <li>
          <strong>metadata 过滤</strong>：给每块打上结构化标签（日期、作者、分类），检索前先按标签硬过滤
          （「只在 2024 年的文档里找」），把无关范围直接排除，再做向量检索。
        </li>
      </ul>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        当你的 RAG「检索回来的东西看着对、其实答非所问」时，先别怀疑模型，去查检索这一层：是不是被否定句骗了？
        是不是需要多跳？是不是该用关键词精确匹配？把 hybrid、rerank、metadata 过滤当成标准工具箱，
        遇到对应的失败模式就上对应的补丁。检索是 RAG 和长期记忆的共同地基，地基稳了，上层才稳。
      </p>

      <Practice title="手写余弦 top-k + 复现「相似但不相关」反例">
        <p>
          下面用 numpy 实现余弦相似度和 top-k 检索（先跑通正常场景），再用一对「好吃 / 难吃」的否定句，
          亲手复现「向量方向极近、语义却相反」的经典失败案例。
        </p>
        <CodeBlock lang="python" title="vector_search.py" code={cosineCode} />
        <p>
          你会看到两句相反的评价相似度都很高、几乎分不开。把它记牢：下次 RAG 在带否定、带数字的查询上出错，
          第一反应应该是「该上 hybrid 或 rerank 了」，而不是反复改 prompt。
        </p>
      </Practice>

      <Summary
        points={[
          '余弦相似度 cos(a,b)=a·b/(|a||b|) 衡量两向量方向的接近度，只看方向不看长度；归一化后退化为点积。',
          'top-k 检索：和库内每个向量算相似度、排序取前 k；k 太小会漏、太大会引入噪声。',
          '大库不能暴力全扫，需用近似最近邻 ANN（HNSW 图、IVF 聚类）牺牲微小准确率换数量级的速度。',
          '切块策略直接决定检索质量：太大语义糊、太小不完整，常按语义边界切并让相邻块重叠。',
          '向量相似 ≠ 语义相关：否定句、多跳推理、精确实体/数字匹配是 embedding 的系统性盲区。',
          '三个补丁：hybrid（BM25+向量）补精确召回、rerank 重排做粗筛精排、metadata 过滤先缩小范围。',
        ]}
      />
    </>
  )
}
