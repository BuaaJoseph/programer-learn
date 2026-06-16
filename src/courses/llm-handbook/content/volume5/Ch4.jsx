import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

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

const hybridCode = `"""hybrid 混合检索：向量分数 + BM25 关键词分数，做加权融合。
向量管语义模糊，BM25 管精确实体/数字，两者互补。
依赖：pip install rank-bm25 numpy sentence-transformers
"""
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer('all-MiniLM-L6-v2')

def minmax(xs):
    # 两路分数量纲不同，先各自归一化到 [0,1] 再融合
    xs = np.array(xs, dtype=float)
    lo, hi = xs.min(), xs.max()
    return (xs - lo) / (hi - lo + 1e-9)

def hybrid_search(query, docs, k=3, alpha=0.5):
    # 向量分
    qv = embedder.encode(query, normalize_embeddings=True)
    dv = embedder.encode(docs, normalize_embeddings=True)
    vec_scores = dv @ qv
    # BM25 关键词分（按空格/字粒度分词，中文可换更好的分词器）
    bm25 = BM25Okapi([list(d) for d in docs])
    kw_scores = bm25.get_scores(list(query))
    # 归一化后加权融合：alpha 越大越偏语义，越小越偏关键词
    fused = alpha * minmax(vec_scores) + (1 - alpha) * minmax(kw_scores)
    order = np.argsort(fused)[::-1][:k]
    return [(docs[i], round(float(fused[i]), 3)) for i in order]`

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
      <p>
        为什么是看方向而不是看距离？因为 embedding 模型在训练时，是把「语义」编码进了向量的<strong>方向</strong>里，向量的长度往往只反映「词频/置信度」之类的次要信息。
        一段长文和它的一句话摘要，意思一样，方向应当接近，但长度可能差很多——用余弦正好忽略这种长度差异。这也是为什么几乎所有 embedding 检索都用余弦（或归一化后的点积），而不是欧氏距离。
      </p>

      <h3>top-k 检索</h3>
      <p>
        有了相似度，检索就是：把查询向量和库里每个向量都算一遍相似度，按从高到低排序，取前 <code>k</code> 个。
        这就是 <em>top-k</em> 检索。<code>k</code> 是个关键旋钮：太小可能漏掉相关内容，太大会把噪声也捞进来、
        稀释模型注意力（见下一章）。
      </p>
      <Callout variant="tip" title="一个被低估的预处理：query 改写">
        <p>
          用户的问题往往口语、省略、含代词（「它支持退款吗」——「它」指谁？）。直接拿原始 query 去检索，召回常常很差。
          成熟系统会先做一次 <strong>query 改写</strong>：把对话上下文带上，让模型把问题补全成一句独立、完整、关键词明确的检索式（「金卡会员支持 7 天无理由退款吗」），再去检索。
          这一步改 query 比反复调 k 见效快得多。
        </p>
      </Callout>

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
      <p>
        理解 ANN 的取舍，关键是记住「近似」二字：它<strong>不保证</strong>一定找到真正最近的那个，只是大概率找到。HNSW 有个搜索宽度参数（常叫 <code>efSearch</code>），
        IVF 有个搜索簇数参数（<code>nprobe</code>）——调大它们，召回更准但更慢、更耗资源；调小则更快但可能漏掉真正相关的块。这就是「召回率 vs 延迟」的旋钮，没有免费午餐。
      </p>
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
      <table>
        <thead>
          <tr><th>切块方式</th><th>优点</th><th>缺点</th></tr>
        </thead>
        <tbody>
          <tr><td>固定字数</td><td>实现简单、块大小可控</td><td>可能从句子中间切断，语义破碎</td></tr>
          <tr><td>按句/段落</td><td>语义完整</td><td>块大小不均，过短或过长都可能出现</td></tr>
          <tr><td>带重叠滑窗</td><td>不会拦腰截断关键信息</td><td>存储和计算有冗余</td></tr>
          <tr><td>按结构（标题/章节）</td><td>贴合文档原有逻辑</td><td>依赖文档有清晰结构</td></tr>
        </tbody>
      </table>

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
      <Example title="为什么否定句会骗过向量">
        <p>
          embedding 是把整句话「揉」成一个向量，词与词的贡献被汇总。「好吃」和「难吃」只差一个字，
          在词向量空间里这两个词本身就很近（都在「评价食物味道」这个语义簇里），整句揉完，方向自然也近。
          模型并没有一个专门的「极性翻转」机制去把否定算清楚——这不是 bug，而是「语义相似度」这个度量天然抓不住逻辑极性。
          真要分清，得靠下面的 rerank（交叉编码器能看到 query 和文档的逐词交互，对否定更敏感）或干脆让生成阶段的模型去判断。
        </p>
      </Example>
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
      <p>
        这里要厘清 rerank 和向量检索的分工：向量检索是<strong>双编码器</strong>——query 和文档各自独立编码成向量再比相似度，所以能预先把整库向量算好、查得飞快，但 query 和文档「没见过面」，交互信息有限。
        rerank 用的<strong>交叉编码器</strong>则把 query 和某个候选文档<strong>拼在一起</strong>送进模型，逐词交互打一个精细分数，准但慢——所以只能用在「粗筛出的几十条」上，不能直接扫全库。先粗后精，正是为了兼顾速度与准度。
      </p>
      <CodeBlock lang="python" title="hybrid_search.py" code={hybridCode} />

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        当你的 RAG「检索回来的东西看着对、其实答非所问」时，先别怀疑模型，去查检索这一层：是不是被否定句骗了？
        是不是需要多跳？是不是该用关键词精确匹配？把 hybrid、rerank、metadata 过滤当成标准工具箱，
        遇到对应的失败模式就上对应的补丁。检索是 RAG 和长期记忆的共同地基，地基稳了，上层才稳。
      </p>
      <p>
        排查检索问题有个固定套路：先<strong>把检索结果打印出来</strong>看一眼（取回了哪几块、分数多少），别一上来就改 prompt。
        如果相关块根本没被召回 → 检查切块和 query 改写；如果召回了但排在很后面 → 上 rerank；如果是数字/实体没匹配上 → 上 hybrid；如果范围太杂 → 上 metadata 过滤。
        对症下药，比盲目试参数高效得多。
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
        <p>
          进阶练习：用上面的 <code>hybrid_search.py</code> 跑同一个否定句反例，调整 <code>alpha</code>（0 纯关键词、1 纯向量），
          看看融合关键词分数后，能不能把「好吃 / 难吃」的区分度拉开一点；再加一条带订单号的文档，验证 BM25 对精确数字的召回优势。
        </p>
      </Practice>

      <Summary
        points={[
          '余弦相似度 cos(a,b)=a·b/(|a||b|) 衡量两向量方向的接近度，只看方向不看长度；语义编码在方向里，故用余弦而非欧氏距离。',
          'top-k 检索：和库内每个向量算相似度、排序取前 k；k 太小会漏、太大会引入噪声；检索前先做 query 改写常常立竿见影。',
          '大库不能暴力全扫，需用近似最近邻 ANN（HNSW 图、IVF 聚类）；efSearch/nprobe 是召回率 vs 延迟的旋钮，近似不保证最优。',
          '切块策略直接决定检索质量：太大语义糊、太小不完整，常按语义边界切并让相邻块重叠。',
          '向量相似 ≠ 语义相关：否定句、多跳推理、精确实体/数字匹配是 embedding 的系统性盲区，因为它抓语感不抓逻辑。',
          '三个补丁：hybrid（BM25+向量）补精确召回、rerank 用交叉编码器做粗筛精排、metadata 过滤先缩小范围。',
          '排查检索先打印结果对症下药：没召回查切块/改写、排太后上 rerank、数字没中上 hybrid、范围太杂上过滤。',
        ]}
      />
    </>
  )
}
