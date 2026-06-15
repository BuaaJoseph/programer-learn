import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'
import RuneStarmap from '../../components/illustrations/RuneStarmap.jsx'

const tokenizeCode = `import tiktoken

# o200k_base 是 GPT-4o / GPT-4o-mini 用的分词器，词表约 20 万
enc = tiktoken.get_encoding('o200k_base')

texts = [
    'hello',
    'helloworld',
    '你好',
    '量子纠缠',
    'tokenization',
]

for t in texts:
    ids = enc.encode(t)
    pieces = [enc.decode([i]) for i in ids]
    print(f'{t!r:16} -> {len(ids)} tokens  {pieces}')`

const embedCode = `import numpy as np
from openai import OpenAI

client = OpenAI()

def embed(text):
    resp = client.embeddings.create(
        model='text-embedding-3-small',  # 输出 1536 维向量
        input=text,
    )
    return np.array(resp.data[0].embedding)

def cosine(a, b):
    return a.dot(b) / (np.linalg.norm(a) * np.linalg.norm(b))

a = embed('如何用 Python 读取 CSV 文件')
b = embed('pandas 怎么加载逗号分隔的数据')
c = embed('今天晚饭吃什么')

print('相关问题 :', round(cosine(a, b), 3))   # 接近 1
print('无关问题 :', round(cosine(a, c), 3))   # 明显更低`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          模型并不直接「看」字符。在它眼里，一段文字先被切成一串叫 <em>token</em> 的小片段，
          每个 token 再被换成一串数字（向量）。本章讲清这两步：文字怎么被切（分词），
          以及切出来的片段怎么变成模型能算的向量（embedding）。理解了这一层，你才会明白为什么按 token 计费、
          为什么模型会数错字、为什么相似的句子在模型内部「离得近」。
        </p>
      </Lead>

      <h2>token 不是字，也不是词</h2>
      <p>
        最常见的误解是把 token 当成「一个字」或「一个单词」。实际上 token 是一个介于字符和单词之间的<strong>子词单元</strong>
        （subword）。英文里常见单词往往是 1 个 token，但生僻词、长词会被拆成几个：<code>tokenization</code> 可能被切成
        <code>token</code> + <code>ization</code>。中文则更碎，常见字多是 1 个 token，生僻词或词组可能拆成多个。
      </p>
      <p>
        一个常用的经验值：英文大约 <strong>1 个 token ≈ 0.75 个单词</strong>，或者说 1000 个 token ≈ 750 个英文单词；
        中文大约 <strong>1 个汉字 ≈ 1 到 2 个 token</strong>，取决于分词器。这只是估算，真要精确就得用分词器实测。
      </p>

      <h3>BPE：把高频片段合并成一个 token</h3>
      <p>
        主流模型用的分词算法叫 <em>BPE</em>（Byte Pair Encoding，字节对编码）。它的训练思路很朴素：
        从单个字符开始，统计语料里相邻片段两两出现的频率，把最高频的一对<strong>合并</strong>成一个新片段，
        如此反复几万次，就得到一张「词表」（vocabulary）。高频的字、词、词缀会变成独立 token，
        低频的内容则保持拆开。这样既能覆盖任意文本，又不至于让词表无限膨胀。
      </p>
      <p>
        现代模型大多用 <em>byte-level BPE</em>（字节级 BPE）：先把文本按 UTF-8 编码成字节序列，再在<strong>字节</strong>上做 BPE。
        好处是无论遇到什么字符（emoji、生僻字、乱码）都不会「超出词表」，因为任何字符最终都能还原成那 256 个字节。
        代价是非英文（尤其中文，一个汉字占 3 个 UTF-8 字节）会切得更碎、更费 token。
      </p>

      <h3>词表规模与计费</h3>
      <p>
        典型模型的词表规模在 <strong>5 万到 20 万</strong> 之间：GPT-2 是 50257，Llama 2 是 32000，
        GPT-4o 的 o200k_base 约 20 万。词表越大，平均每个 token 能装下越多内容（切得越少），
        但 embedding 表和输出层也越大、越占参数。
      </p>
      <p>
        所有按量计费的 LLM API 都<strong>按 token 计费</strong>，输入和输出分别计价。这意味着：同样意思的一句话，
        中文往往比英文贵（切出的 token 更多）；JSON、代码里大量的标点和缩进也会吃掉 token。
        想省钱，先学会数 token。
      </p>

      <Example title="同一句话，切出来的 token 数差很多">
        <p>用 GPT-4o 的分词器粗略观察（实际数字以本章 Practice 跑出的为准）：</p>
        <ul>
          <li><code>hello</code> 通常是 <strong>1</strong> 个 token；<code>helloworld</code> 因为没空格反而可能被切成 2 个。</li>
          <li>英文句子 <code>The quick brown fox</code> 约 <strong>4</strong> 个 token，基本一词一 token。</li>
          <li>中文「量子纠缠」可能切成「量子」「纠」「缠」等 <strong>2 到 4</strong> 个 token，比直觉多。</li>
        </ul>
        <p>
          注意：很多模型对「数字」也会逐位或分段切分，这正是它们容易在长数字加减、数字符串里数错位的原因之一。
        </p>
      </Example>

      <RuneStarmap />

      <h2>embedding：把 token 换成向量</h2>
      <p>
        切好 token 后，每个 token 在词表里有一个整数 id。模型把这个 id 拿去查一张大表——
        <em>embedding</em> 查找表（embedding lookup table）。这张表的形状是 <strong>词表大小 × d_model</strong>，
        即「有多少个 token」乘以「模型隐藏维度」。比如词表 20 万、d_model 为 4096，这张表就有约 8 亿个参数。
        查表的动作很简单：第 id 行那一行向量，就是这个 token 的初始表示。
      </p>
      <p>
        这里的 d_model（也叫 hidden size）是贯穿整个模型的「宽度」：GPT-2 small 是 768，Llama 2 7B 是 4096，
        据估计 GPT-3 175B 约 12288。后面所有层处理的向量都是这个维度，第 5 章会用它来估算参数量。
      </p>

      <h3>静态词向量：意义藏在方向里</h3>
      <p>
        embedding 表里的向量是<strong>学出来</strong>的，不是随便给的。训练后，意义相近的词，其向量在空间里也彼此靠近。
        这类「每个词一个固定向量」的表示叫<em>静态词向量</em>（static word embedding，如更早的 word2vec、GloVe）。
        注意大模型里 token 的初始 embedding 也是静态的，但它经过 Transformer 各层后会变成「随上下文变化」的表示
        （contextual embedding）——这是后面注意力机制的功劳。
      </p>
      <p>
        静态词向量最著名的性质是<strong>向量算术</strong>：词与词之间的「关系」近似表现为向量的加减。经典例子是
        <code>vec(国王) - vec(男人) + vec(女人) ≈ vec(女王)</code>。这说明「性别」这个语义差，在向量空间里近似是一个
        固定方向。类似地 <code>vec(巴黎) - vec(法国) + vec(意大利) ≈ vec(罗马)</code>。这些不是模型「懂」语义，
        而是统计共现规律在几何上的投影。
      </p>

      <KeyIdea title="相似就是方向相近，用余弦度量">
        <p>
          判断两段文本「意思像不像」，标准做法是看它们 embedding 向量的<strong>余弦相似度</strong>
          （cosine similarity）：两个向量夹角越小，余弦值越接近 1，表示越相似；正交时为 0；方向相反为 -1。
          整个 RAG（检索增强）的「语义检索」就建立在这个度量上——把文档和查询都 embed 成向量，
          找余弦最高的几篇。我们会在第 5 卷大量用到它。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="关于 token 的几个常见坑">
        <ul>
          <li>
            <strong>别用「字数」估算成本和上下文</strong>：要用 token 数。中文、代码、JSON 的 token 密度和纯英文差异很大。
          </li>
          <li>
            <strong>模型「数字母」「数字符」常出错</strong>：因为它看到的是 token 而非字符，<code>strawberry</code> 里有几个 r
            这种题它天然不擅长，不是「笨」，是看不到字符粒度。
          </li>
          <li>
            <strong>截断要按 token 截</strong>：在 token 中间硬切会产生无效字节，引发乱码或解码错误。
          </li>
        </ul>
      </Callout>

      <h3>预告：位置编码</h3>
      <p>
        embedding 只编码了「这个 token 是什么」，没有编码「它在第几位」。但语序显然重要（「狗咬人」和「人咬狗」不同）。
        所以模型还会叠加一份<em>位置编码</em>（positional encoding），把位置信息注入向量。早期用正弦/余弦函数，
        现代模型多用 <em>RoPE</em>（旋转位置编码）——这也是后面讲「长上下文为什么能外推」的关键，第 6 章细说。
      </p>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        token 是你和模型之间的「计价单位」和「容量单位」：上下文窗口是按 token 算的，费用是按 token 算的，
        限流（rate limit）也常按 token 算。做 Agent 时，prompt 模板、工具返回的长 JSON、检索到的文档片段，
        都会实打实地消耗 token，必须心里有数。而 embedding 则是<strong>记忆与检索的基础设施</strong>：
        无论是向量数据库、语义去重，还是给 Agent 接长期记忆，底层都是「文本→向量→比余弦」。
      </p>

      <Practice title="数 token，并用 embedding 比相似度">
        <p>
          第一步，用 <code>tiktoken</code> 看看不同文本被切成几个 token、分别是什么。装一下：
          <code>pip install tiktoken</code>。
        </p>
        <CodeBlock lang="python" title="count_tokens.py" code={tokenizeCode} />
        <p>
          第二步，用真实的 embedding 接口，算两段「意思相近」和「意思无关」文本的余弦相似度，体会语义距离。
          需要 OpenAI key，装 <code>pip install openai numpy</code>。
        </p>
        <CodeBlock lang="python" title="cosine_sim.py" code={embedCode} />
        <p>
          试着把中文和英文同义句分别数 token，看看中文是不是更费；再把检索式问题和闲聊问题混着比余弦，
          观察「相关」和「无关」的分数差距能拉开多少。
        </p>
      </Practice>

      <Summary
        points={[
          'token 是子词单元，不等于字也不等于词；英文约 1 token≈0.75 词，中文 1 字常占 1 到 2 个 token。',
          'BPE 通过反复合并高频片段构建词表；byte-level BPE 在 UTF-8 字节上做，任何字符都不会超出词表。',
          '词表规模通常 5 万到 20 万；API 按 token 计费，中文与代码往往比英文更费 token。',
          'embedding 是一张 词表大小×d_model 的查找表，把 token id 换成向量；d_model 是模型贯穿全程的宽度。',
          '静态词向量把语义编码进方向，著名的“国王−男人+女人≈女王”说明语义差近似是固定向量方向。',
          '判断文本相似用余弦相似度，这是 RAG 语义检索的基础；位置信息靠位置编码另行注入，后续章节展开。',
        ]}
      />
    </>
  )
}
