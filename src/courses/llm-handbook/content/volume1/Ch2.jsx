import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RuneStarmap from '@/components/illustrations/RuneStarmap.jsx'

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

      <h2>整条流水线：从字符串到向量</h2>
      <p>
        在拆细节之前，先把全貌摆出来。一段文字进到模型里，要经过这样一条不可逆顺序的流水线：
      </p>
      <ol>
        <li><strong>原始字符串</strong>：「你好世界」。</li>
        <li><strong>分词（tokenize）</strong>：切成 token 序列，并查出每个 token 的整数 id，如 <code>[1820, 9234, 401]</code>。</li>
        <li><strong>查 embedding 表</strong>：每个 id 去查表，换成一个 d_model 维向量。</li>
        <li><strong>叠加位置编码</strong>：给每个向量注入「它排第几位」的信息。</li>
        <li><strong>进 Transformer 各层</strong>：这才轮到第 3 章的注意力登场。</li>
      </ol>
      <p>
        本章只讲第 2、3 步。但记住这条链很重要：模型<strong>从头到尾没碰过原始字符</strong>，它接触的最小单位就是 token。
        后面很多「怪现象」（数不对字母、中文费钱、截断乱码）都能在这条流水线的某一环找到根源。
      </p>

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
      <p>
        为什么是 BPE 而不是「直接按词切」或「直接按字符切」？这是一个经典的<strong>权衡</strong>。按词切：词表会爆炸
        （英语几十万词、还不算变体），而且永远会遇到没见过的新词（OOV，out-of-vocabulary），只能标成 <code>[UNK]</code> 丢信息。
        按字符切：词表极小（几十上百个），但一个词被拆成一长串字符，序列变得极长，模型要花更多算力才能「看懂」一个词。
        BPE 卡在两者中间：高频整词整片保留（短序列），低频内容拆成子词（不丢信息），是「序列长度」和「词表大小」之间一个漂亮的折中。
      </p>
      <p>
        还有个常被忽略的细节：BPE 一般把<strong>前导空格</strong>也并进 token。所以 <code>{' token'}</code>（带空格）和
        <code>{'token'}</code>（不带）在模型眼里是<strong>两个不同的 token</strong>。这解释了很多「为什么换个写法 token 数变了」的怪现象，
        也是为什么句首词和句中词的切分有时不一样。</p>

      <Example title="同一句话，中文为什么比英文费 token">
        <p>
          拿一句意思相同的话对比（数字以分词器实测为准，这里取量级）：
        </p>
        <table>
          <thead>
            <tr><th>文本</th><th>大致 token 数</th><th>为什么</th></tr>
          </thead>
          <tbody>
            <tr><td><code>I love programming</code></td><td>约 3</td><td>常见英文词基本一词一 token</td></tr>
            <tr><td>「我喜欢编程」</td><td>约 5 到 7</td><td>汉字占 3 字节、切得碎，常见词组也未必合成一个 token</td></tr>
            <tr><td><code>{'{"name": "Tom"}'}</code></td><td>约 7</td><td>引号、冒号、花括号各自吃 token</td></tr>
          </tbody>
        </table>
        <p>
          结论很实在：同样一段内容，中文 prompt 往往比英文贵 1.5 到 2 倍，结构化的 JSON / 代码因为标点密集也偏贵。
          做成本估算时，<strong>务必拿目标模型的分词器实测</strong>，别用「字数 × 系数」拍脑袋。
        </p>
      </Example>

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

      <Callout variant="info" title="为什么模型能写代码却数不对字母">
        <p>
          这是 tokenization 最反直觉的后果。模型看到的是 token，不是字符——<code>strawberry</code> 在它眼里可能就是
          <code>str</code>+<code>aw</code>+<code>berry</code> 三个整块，它<strong>从来没见过里面单独的 r</strong>。
          让它数「有几个 r」，相当于让你数一个你只听过读音、没见过拼写的外语词里有几个某字母——只能靠记忆和推断，自然容易错。
        </p>
        <p>
          这不是「智商不够」，而是「输入粒度」的硬限制。理解这点，你就知道：凡是涉及字符级操作（数字母、判断回文、按字母排序、
          处理长数字的逐位运算），都不该指望模型心算，要么换成让它写代码来算，要么在 prompt 里把字符一个个空格隔开喂给它。
        </p>
      </Callout>

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
      <p>
        注意一个常见混淆：模型内部 token 的 embedding 维度（d_model），和你调 <code>text-embedding-3-small</code> 这类
        <strong>句向量 API</strong> 拿到的维度（如 1536）<strong>不是一回事</strong>。前者是模型每一层流动的隐藏向量宽度，
        是模型的内部结构；后者是专门训练来「把整段文本压成一个向量」的产物，服务于检索。本章 Practice 里用的就是后者。
        实战中你接触最多的是句向量——它是 RAG、语义去重、聚类的基础原料。
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
      <p>
        这背后的直觉是<em>分布假说</em>（distributional hypothesis）：<strong>「一个词的意义，由它常和哪些词一起出现决定」</strong>。
        「猫」和「狗」常出现在相似的上下文里（喂、养、抱、宠物），于是它们的向量被训练得彼此靠近；「猫」和「微积分」几乎不共现，
        向量就离得远。所谓语义，在这套表示里被还原成了「共现统计的几何结构」——这既是它强大的地方，也是它的局限：模型对世界的「理解」，
        终究是建立在「谁和谁一起出现」之上的，没有真正落地到现实。
      </p>
      <Callout variant="info" title="高维空间里，向量「几乎都正交」">
        <p>
          embedding 动辄上千维，高维空间有一些违背直觉的几何性质。其中最重要的一条：随机取两个高维向量，它们的夹角
          <strong>几乎总是接近 90 度</strong>（余弦相似度接近 0）。这反而是好事——它意味着空间「很空」，能塞下海量互不干扰的概念，
          每个语义方向都能找到自己的「角落」。正因如此，几千维的向量足以编码几十万个词之间错综复杂的关系，而不会互相打架。
        </p>
      </Callout>

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
          <li>
            <strong>不同模型 token 数不通用</strong>：换了模型就换了分词器，同一段文本的 token 数会变，迁移成本估算时别照搬旧数字。
          </li>
        </ul>
      </Callout>

      <h3>tied embedding：输入和输出共用一张表</h3>
      <p>
        还记得第 1 章模型最后要输出每个词的 logits 吗？那一步需要一个「从 d_model 维向量映射回词表大小」的输出矩阵，形状是
        <strong>d_model × 词表大小</strong>——和输入 embedding 表正好是转置关系。很多模型干脆让这两者<strong>共享同一份权重</strong>
        （weight tying，权重绑定）：进来时用它查向量，出去时用它的转置算 logits。
      </p>
      <p>
        这么做一是<strong>省参数</strong>（词表 20 万、d_model 几千，这张表本身就上亿参数，省一份很可观），
        二是逻辑上更自洽——「这个词长什么样」和「怎么预测出这个词」用同一套表示，训练信号也更一致。知道这点，
        你再看第 5 章的参数量估算，就明白为什么 embedding 那项通常只算一次而不是两次。
      </p>

      <h3>预告：位置编码</h3>
      <p>
        embedding 只编码了「这个 token 是什么」，没有编码「它在第几位」。但语序显然重要（「狗咬人」和「人咬狗」不同）。
        所以模型还会叠加一份<em>位置编码</em>（positional encoding），把位置信息注入向量。早期用正弦/余弦函数，
        现代模型多用 <em>RoPE</em>（旋转位置编码）——这也是后面讲「长上下文为什么能外推」的关键，第 6 章细说。
      </p>

      <h3>为什么余弦相似度，而不是欧氏距离</h3>
      <p>
        判断两个向量像不像，常见的有两种度量：余弦相似度（看夹角）和欧氏距离（看直线距离）。文本检索里几乎都用余弦，原因在于：
        embedding 的「意义」主要编码在<strong>方向</strong>里，而不是<strong>长度</strong>里。一段长文本和它的一句话摘要，主题相同（方向一致），
        但向量长度（模长）可能差很多——用欧氏距离会因为长度差判它们「不像」，用余弦则只看方向、自动忽略长度，正好抓住「主题相不相关」。
      </p>
      <p>
        实践中常把向量先<strong>归一化</strong>（缩放到模长为 1），此时余弦相似度和欧氏距离就等价了，向量数据库里很多「内积检索」
        其实就是在归一化向量上算的。记住这条结论即可：<strong>比语义相关性，认余弦</strong>。
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
