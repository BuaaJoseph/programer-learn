import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import KVCacheViz from '@/components/illustrations/KVCacheViz.jsx'

const budgetCode = `def kv_cache_bytes(n_tokens, n_layers, d_model, n_kv_heads=None,
                   n_heads=None, bytes_per_elem=2):
    # 默认 fp16/bf16，每个数 2 字节
    # 标准多头注意力：每层每 token 缓存 K 和 V 两份，各 d_model 维
    # 若用 GQA（分组查询注意力），KV 头更少：有效维度 = d_model * n_kv_heads / n_heads
    eff_dim = d_model
    if n_kv_heads and n_heads:
        eff_dim = d_model * n_kv_heads / n_heads
    # 2 = K 和 V 两份
    return 2 * n_tokens * n_layers * eff_dim * bytes_per_elem

def context_budget(system, history, user_input, reserve_output, window):
    used = system + history + user_input + reserve_output
    return {
        'window': window,
        'used': used,
        'free': window - used,
        'ok': used <= window,
    }

# 例：Llama 2 13B 规模 d_model=5120, 层数=40, 标准 MHA
n = 8192
b = kv_cache_bytes(n_tokens=n, n_layers=40, d_model=5120)
print(f'{n} tokens 的 KV cache ≈ {b/1e9:.2f} GB (fp16)')

print(context_budget(system=600, history=20000,
                     user_input=1500, reserve_output=2000, window=32000))`

export default function Ch6() {
  return (
    <>
      <Lead>
        <p>
          「上下文窗口」是你用 LLM 时绕不开的硬约束：模型一次最多能看多少 token。本章把这个数字拆开讲清楚——
          它由哪几部分预算瓜分，为什么注意力让长上下文又慢又贵（O(n²)），推理为什么分 prefill 和 decode 两个阶段，
          KV cache 是怎么省算力又怎么吃显存的，以及为什么把关键信息放在超长上下文正中间，模型反而容易看漏。
        </p>
      </Lead>

      <h2>上下文窗口是一笔需要分配的预算</h2>
      <p>
        <em>context window</em>（上下文窗口）是模型单次能处理的最大 token 数：GPT-4o 约 128K，Claude 一些版本 200K，
        部分模型号称 1M。但这个总额是<strong>输入和输出共享</strong>的，要被几部分瓜分：
      </p>
      <CodeBlock
        lang="text"
        title="上下文预算"
        code={`窗口总量 >= system 提示 + 对话历史 + 本轮输入 + 预留给输出的空间`}
      />
      <ul>
        <li><strong>system 提示</strong>：角色设定、规则、工具说明，每轮都占着，常常几百到几千 token。</li>
        <li><strong>对话历史</strong>：之前所有轮次的问答，会越积越多，是长对话里最大的吞噬者。</li>
        <li><strong>本轮输入</strong>：用户这次的问题，加上检索到的文档、贴进来的代码等。</li>
        <li><strong>预留输出</strong>：<code>max_tokens</code> 给回复留的额度。预留不够，回答会被中途截断。</li>
      </ul>
      <p>
        关键认知：这四项加起来不能超过窗口。做长对话或 RAG 时，必须主动管理预算——裁剪历史、压缩、或滚动摘要，
        否则要么报错，要么被迫丢掉最早的内容。
      </p>

      <h2>为什么越长越贵：注意力的 O(n²)</h2>
      <p>
        回忆第 3 章：注意力要让每个 token 和其他每个 token 算相关度，n 个 token 就有 n×n 个分数。
        所以注意力的计算量和显存都随序列长度<strong>平方增长</strong>，记作 <em>O(n²)</em>。
      </p>
      <p>
        这意味着上下文翻倍，注意力这部分的开销大约变成<strong>四倍</strong>。这就是长上下文 API 更贵、更慢的根本原因，
        也是学术界和工程界拼命做各种「次平方」注意力近似的动机。
      </p>

      <h3>prefill 与 decode：推理的两个阶段</h3>
      <p>
        自回归生成在工程上分成两个性质完全不同的阶段：
      </p>
      <ul>
        <li>
          <strong>prefill（预填充）</strong>：把整个输入 prompt 一次性喂进模型，并行算出所有输入 token 的表示。
          这一步是<strong>计算密集</strong>的（大矩阵乘法，GPU 吃满），长 prompt 的「首字延迟」（TTFT, time-to-first-token）主要花在这。
        </li>
        <li>
          <strong>decode（解码）</strong>：之后一个一个地往外吐词，每次只新增一个 token。这一步是<strong>访存密集</strong>的——
          每生成一个词都要把整个模型权重从显存读一遍，计算量小但被显存带宽卡住。生成速度（tokens/秒）主要由这一步决定。
        </li>
      </ul>

      <h2>KV cache：用显存换算力</h2>
      <p>
        decode 时有个浪费：每生成一个新词，注意力都需要它和<strong>前面所有 token</strong>的 K、V。
        如果每步都把前面所有 token 重新算一遍 K、V，会做大量重复计算。<em>KV cache</em> 的办法是：
        把每一层、每个已处理 token 的 K 和 V <strong>缓存</strong>起来，新词来了只算它自己的 K、V，
        再和缓存里的拼接。这样 decode 每步的注意力计算从「重算全部」降到「只算一个」。
      </p>
      <p>
        代价是显存。缓存大小正比于 <strong>token 数 × 层数 × 2（K 和 V）× 每个的维度 × 每个数的字节数</strong>。
        它随上下文长度<strong>线性增长</strong>，长上下文 + 大 batch 时，KV cache 经常比模型权重本身还吃显存，
        是部署时显存爆掉的常见原因。GQA（分组查询注意力，多个 Query 头共享一组 KV 头）就是为了把这块显存按比例砍小。
      </p>

      <Example title="算一笔 KV cache 的显存账">
        <p>
          以一个 d_model=5120、40 层、标准多头注意力、fp16（每数 2 字节）的模型为例，缓存 8192 个 token：
        </p>
        <ul>
          <li>每 token 每层缓存 K 和 V 共 <code>2 × 5120 = 10240</code> 个数。</li>
          <li>乘以 40 层、乘以 8192 token、乘以 2 字节：<code>10240 × 40 × 8192 × 2 ≈ 6.7 GB</code>。</li>
        </ul>
        <p>
          单条请求就 6.7GB，如果并发 10 条，光 KV cache 就要 67GB——很多卡直接放不下。
          这就是为什么长上下文、高并发的服务那么贵、那么难部署。
        </p>
      </Example>

      <KVCacheViz />

      <h2>位置外推：RoPE 与长度泛化</h2>
      <p>
        模型训练时见过的最长序列是固定的（比如 4K）。想让它在推理时处理更长（比如 32K），就涉及<em>长度外推</em>。
        现代模型多用 <em>RoPE</em>（Rotary Position Embedding，旋转位置编码）：它不是给位置加一个向量，
        而是按位置给 Q、K 向量做一个<strong>旋转</strong>，让注意力天然对「相对位置」敏感。
      </p>
      <p>
        RoPE 的好处是支持一些外推技巧（如 position interpolation 位置插值、NTK 缩放、YaRN），
        把训练时的短窗口「拉伸」到更长，而不必从头重训。但外推不是免费的——超出训练长度越多，质量下降越明显，
        所以「号称支持 1M」和「在 1M 上下文上真的好用」是两回事，要实测。
      </p>

      <Callout variant="warn" title="lost in the middle：放中间的信息容易被忽略">
        <p>
          有一个被反复验证的现象叫 <em>lost in the middle</em>：当关键信息放在长上下文的<strong>正中间</strong>时，
          模型回答的准确率明显低于把它放在<strong>开头或结尾</strong>。模型对上下文两端的注意力更强，中间的内容容易被「淹没」。
        </p>
        <ul>
          <li>别以为「塞进窗口里 = 模型一定看到了」。窗口装得下，不代表用得好。</li>
          <li>做 RAG 时，把最相关的检索结果放在 prompt 的<strong>开头或结尾</strong>，别埋在中间一大堆文档里。</li>
          <li>给指令、关键约束也尽量靠近开头或末尾，并考虑在末尾再重申一次重点。</li>
        </ul>
      </Callout>

      <h2>常见优化：FlashAttention 与 prefix caching</h2>
      <ul>
        <li>
          <strong>FlashAttention</strong>：一种 IO 感知的注意力实现，通过分块（tiling）计算、避免把 n×n 的大注意力矩阵整个写进显存，
          大幅降低显存占用并提速。它不改变数学结果（是精确注意力，不是近似），只是算得更聪明，现在几乎是标配。
        </li>
        <li>
          <strong>prefix caching（前缀缓存）</strong>：如果很多请求共享同一段前缀（比如固定的长 system 提示、相同的少样本示例），
          可以把这段前缀的 KV cache 缓存复用，省掉重复的 prefill。OpenAI、Anthropic 的「prompt caching」就是这个思路，
          能显著降低重复前缀的成本和延迟。
        </li>
      </ul>

      <KeyIdea title="上下文是稀缺资源，要当成预算来经营">
        <p>
          上下文窗口不是「能塞多少塞多少」的免费空间。它在<strong>成本</strong>上随长度增长（注意力 O(n²)、KV cache 线性增长），
          在<strong>效果</strong>上还有 lost in the middle 这类陷阱。把它当成一笔需要精打细算的预算：
          只放真正必要的内容，把重要的东西放在模型看得见的位置，能缓存的前缀就缓存。这是 Agent 工程里最核心的功夫之一。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        Agent 跑多步循环时，每一步的工具调用结果、观察、中间思考都会塞进上下文，历史<strong>累积得极快</strong>，
        很容易撞到窗口上限，且越往后每一步都更慢更贵（O(n²) 叠加 KV cache 增长）。所以实战里必须有上下文管理策略：
        滚动摘要旧历史、裁剪无关工具输出、用固定 system 前缀配合 prompt caching、把关键状态放在末尾。
        理解 prefill/decode 还能帮你优化体验：长 prompt 会拖慢首字延迟，可考虑流式输出和前缀缓存来改善感知速度。
      </p>

      <Practice title="写个上下文预算 + KV cache 显存估算脚本">
        <p>
          下面的脚本做两件事：估算一段对话占用的上下文预算够不够、还剩多少；以及给定模型规模和 token 数，估 KV cache 要多少显存。
        </p>
        <CodeBlock lang="python" title="context_budget.py" code={budgetCode} />
        <p>
          试着把 <code>history</code> 调大直到 <code>ok</code> 变成 False，体会长对话怎么撑爆窗口；
          再把 KV cache 那里的 token 数从 8192 翻到 32768，看显存是不是线性翻到约 4 倍，
          以及打开 GQA（传入 <code>n_kv_heads</code> 和 <code>n_heads</code>）后能省多少。
        </p>
      </Practice>

      <Summary
        points={[
          '上下文窗口是 system + 历史 + 本轮输入 + 预留输出 共享的总预算，四项之和不能超过窗口。',
          '注意力是 O(n²)，上下文翻倍开销约四倍，这是长上下文又慢又贵的根本原因。',
          '推理分两阶段：prefill 并行处理输入（计算密集，决定首字延迟），decode 逐词生成（访存密集，决定生成速度）。',
          'KV cache 缓存每层每 token 的 K/V 以省去重算，显存随长度线性增长，长上下文/高并发时常比权重还吃显存。',
          'RoPE 支持长度外推但超出训练长度质量会降；lost in the middle 表明放中间的信息易被忽略，关键内容应放首尾。',
          'FlashAttention 用分块精确计算省显存提速，prefix caching 复用共享前缀的 KV 降本降延迟。',
        ]}
      />
    </>
  )
}
