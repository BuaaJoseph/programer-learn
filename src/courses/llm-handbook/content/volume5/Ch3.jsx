import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const ragCode = `"""mini_rag.py —— 一个能跑的最小 RAG。
依赖：pip install sentence-transformers numpy openai
embedding 用本地的 sentence-transformers；生成用 OpenAI。
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from openai import OpenAI

embedder = SentenceTransformer('all-MiniLM-L6-v2')
client = OpenAI()

# ---------- 离线：建库 ----------
DOCS = [
    '退款政策：商品签收后 7 天内可无理由退款，生鲜类除外。',
    '会员等级：累计消费满 1000 元升级为银卡，满 5000 元升级为金卡。',
    '配送范围：目前仅支持中国大陆，港澳台与海外暂不发货。',
    '金卡权益：包邮、专属客服、生日双倍积分。',
]

def build_index(docs):
    # 切块这里已是「一句一块」；真实数据要先切块再 embedding
    vecs = embedder.encode(docs, normalize_embeddings=True)  # 归一化后点积=余弦
    return np.array(vecs)

INDEX = build_index(DOCS)

# ---------- 在线：检索 ----------
def retrieve(query, k=2):
    q = embedder.encode([query], normalize_embeddings=True)[0]
    scores = INDEX @ q                 # 余弦相似度（已归一化）
    top = np.argsort(scores)[::-1][:k] # 取分数最高的 k 块
    return [(DOCS[i], float(scores[i])) for i in top]

# ---------- 增强 + 生成 ----------
def answer(query, k=2):
    hits = retrieve(query, k)
    context = '\\n'.join(f'- {doc}' for doc, _ in hits)
    prompt = (
        '只能根据下面的资料回答，资料里没有就说「资料中没有相关信息」。\\n\\n'
        f'资料：\\n{context}\\n\\n问题：{query}'
    )
    resp = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
    )
    return resp.choices[0].message.content, hits


if __name__ == '__main__':
    text, hits = answer('金卡有什么好处？')
    print('命中片段：', [round(s, 3) for _, s in hits])
    print('回答：', text)`

export default function Ch5_3() {
  return (
    <>
      <Lead>
        <p>
          模型的知识冻结在训练时刻，它不知道你公司昨天改的退款政策，也答不准你私有文档里的细节——硬问，
          它就开始<strong>一本正经地编</strong>（幻觉）。<em>RAG</em>（Retrieval-Augmented Generation，检索增强生成）
          的办法很朴素：回答之前，先去资料库里<strong>查</strong>出相关片段，把它们拼进 prompt，让模型「看着资料答」。
          这是给静态模型接入动态、私有、可溯源知识的主力方案。
        </p>
      </Lead>

      <h2>检索 - 增强 - 生成：三拍</h2>
      <p>
        RAG 这个名字本身就是流程：<strong>检索</strong>（Retrieval）——拿用户的问题去库里找出最相关的几段资料；
        <strong>增强</strong>（Augmented）——把这几段资料塞进 prompt，作为模型回答的依据；
        <strong>生成</strong>（Generation）——模型基于「问题 + 资料」生成答案。模型还是那个只会 next-token prediction 的模型，
        变的只是它这次看到的上下文里多了一份「刚查到的参考资料」。
      </p>

      <h3>RAG vs 微调：什么时候用哪个</h3>
      <p>
        想让模型「掌握」新知识，有两条路：把知识<strong>训进参数</strong>（微调 fine-tuning），或把知识<strong>放进上下文</strong>（RAG）。选型有清晰的判据：
      </p>
      <ul>
        <li>
          <strong>事实类、要可更新、要可溯源</strong> → 选 RAG。文档改了，库里换一条就行，不用重训；
          还能告诉用户「这句答案出自第几条资料」。
        </li>
        <li>
          <strong>风格、格式、固定技能（比如总是输出某种 JSON、模仿某种语气）</strong> → 偏向微调。
          这类「行为模式」塞进上下文不划算，训进参数更稳定。
        </li>
      </ul>
      <Callout variant="tip" title="经验法则">
        <p>
          「知识」用 RAG，「行为」用微调。绝大多数「让模型懂我们公司业务」的需求，其实是知识问题，
          先上 RAG，几乎总比急着微调更快、更便宜、也更好维护。
        </p>
      </Callout>

      <h2>两段管线：离线建库 + 在线查询</h2>
      <p>
        一套 RAG 系统在物理上分成两个阶段，跑在不同时间：
      </p>
      <ul>
        <li>
          <strong>离线建库</strong>（只做一次或定期更新）：把文档<em>切块</em>（chunking，切成几百字一段）→
          每块算出 <em>embedding</em>（一个语义向量）→ 连同原文存进<strong>向量库</strong>。
        </li>
        <li>
          <strong>在线查询</strong>（每次提问都做）：把用户问题也算成 embedding → 在向量库里检索出
          <em>top-k</em> 最相似的块 → 把这些块拼进 prompt → 交给模型生成答案。
        </li>
      </ul>
      <Example title="一次查询走了哪些步骤">
        <p>
          用户问「金卡有什么好处？」。系统先把这句话编码成向量，去库里和每个文档块的向量比相似度，
          取回最相关的两块——大概率是「金卡权益：包邮、专属客服……」和「会员等级：满 5000 元升级金卡」。
          然后把这两块拼成「资料：…… 问题：金卡有什么好处？」发给模型。模型照着资料答，
          而不是凭空回忆。资料更新了，下次查询自动用新的——这就是「可更新」。
        </p>
      </Example>

      <h2>为什么能缓解幻觉</h2>
      <p>
        模型瞎编，很多时候是因为「被问到不知道的事，又被训练得倾向于给个流畅答案」。RAG 把<strong>依据</strong>
        直接摆在它眼前：上下文里有现成的、相关的资料，模型「抄」比「编」更省力，也更符合训练目标。
        再配一句强约束的指令（「资料里没有就说不知道」），就能把大量幻觉压下去。
      </p>
      <KeyIdea title="RAG 缓解幻觉，但不消灭幻觉">
        <p>
          注意是「缓解」不是「消灭」。RAG 只在<strong>检索到的资料确实相关且正确</strong>时才有效。
          如果检索回来的是无关片段，模型照样会基于错误前提胡说——而且因为「有据可依」，
          这种幻觉看起来更可信、更难发现。<strong>RAG 把问题从「模型会不会编」转移成了「检索准不准」。</strong>
        </p>
      </KeyIdea>

      <h2>三个旋钮 + 最大的坑</h2>
      <p>
        调一套 RAG，主要拧三个旋钮：<strong>chunk 大小</strong>（块太大噪声多、块太小语义碎）；
        <strong>top-k</strong>（取太少会漏、取太多会稀释注意力并烧 token）；
        <strong>注入位置</strong>（资料放 prompt 开头、结尾还是中间，会因「lost in the middle」影响命中率，详见第 5 章）。
      </p>
      <Callout variant="warn" title="最大的坑：检索不准 = 垃圾进垃圾出">
        <p>
          新手总爱调生成那头的 prompt，其实 RAG 八成的效果好坏由<strong>检索质量</strong>决定。
          检索回来的若是无关或错误片段，再好的 prompt、再强的模型也救不回来——这就是「<strong>garbage in, garbage out</strong>」。
          所以做 RAG 的功夫，大半要花在切块、embedding、检索这条链路上（下一章专讲向量检索为什么会失准、怎么补救）。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        对 Agent 来说，RAG 是它的「外接资料库」，和上一章的长期记忆互补：记忆装「关于用户的事」，
        RAG 装「关于世界 / 业务的事」。工程上要把建库做成可重跑的离线流水线（文档一更新就重建相关块），
        把检索做成一个可观测的环节（记录每次取回了哪些块、分数多少），这样答案出错时你能一眼看出是「检索没召回」
        还是「模型没用好资料」，而不是对着一个黑盒干瞪眼。
      </p>

      <Practice title="写一个能跑的 mini RAG">
        <p>
          下面 <code>mini_rag.py</code> 用本地的 <code>sentence-transformers</code> 做 embedding、用 numpy 做余弦检索、
          用 OpenAI 生成答案，完整走通「建库 → 检索 → 增强 → 生成」四步，是真实可复制的最小骨架。
        </p>
        <CodeBlock lang="python" title="mini_rag.py" code={ragCode} />
        <p>
          跑通后做两个实验：问一个资料里<strong>没有</strong>的问题（比如「支持货到付款吗？」），看模型会不会老实说「资料中没有」；
          再把 <code>k</code> 从 2 调到 4，观察命中片段和答案质量的变化——你会直观感到 top-k 这个旋钮的脾气。
        </p>
      </Practice>

      <Summary
        points={[
          'RAG 让冻结知识的模型「先查资料再回答」，是接入动态、私有、可溯源知识、缓解幻觉的主力方案。',
          '三拍流程：检索（找相关片段）→ 增强（拼进 prompt）→ 生成（基于问题+资料作答）。',
          '选型：事实/可更新/可溯源用 RAG，风格/格式/固定行为偏向微调；多数「懂业务」需求其实先上 RAG。',
          '两段管线：离线建库（切块→embedding→存向量库）+ 在线查询（问题 embedding→检索 top-k→拼 prompt→生成）。',
          'RAG 缓解而非消灭幻觉，它把问题从「模型会不会编」转移成「检索准不准」。',
          '三个旋钮是 chunk 大小 / top-k / 注入位置；最大的坑是检索不准——垃圾进垃圾出，功夫大半在检索链路。',
        ]}
      />
    </>
  )
}
