import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const loraCode = `from transformers import AutoModelForCausalLM
from peft import LoraConfig, get_peft_model

base = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')

config = LoraConfig(
    r=8,                 # rank：低秩矩阵的秩，越小越省、表达力越弱
    lora_alpha=16,       # alpha：缩放系数，实际缩放 = alpha / r
    lora_dropout=0.05,
    bias='none',
    task_type='CAUSAL_LM',
    # target_modules：把 LoRA 插到哪些层，通常是注意力的 q/v 投影
    target_modules=['q_proj', 'v_proj'],
)

model = get_peft_model(base, config)

# 打印可训练参数占比
def count_params(m):
    trainable, total = 0, 0
    for p in m.parameters():
        total += p.numel()
        if p.requires_grad:
            trainable += p.numel()
    return trainable, total

trainable, total = count_params(model)
print(f'可训练参数: {trainable:,}')
print(f'总参数    : {total:,}')
print(f'占比      : {trainable / total:.4%}')   # 通常远小于 1%

# peft 也内置了同样的输出
model.print_trainable_parameters()`

const qloraCode = `from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# QLoRA：先把基座以 4bit 量化加载，显存直接砍到约四分之一
bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type='nf4',          # 专为正态分布权重设计的 4bit 类型
    bnb_4bit_compute_dtype='bfloat16',  # 计算时反量化回 bf16
    bnb_4bit_use_double_quant=True,
)

base = AutoModelForCausalLM.from_pretrained(
    'Qwen/Qwen2.5-7B-Instruct', quantization_config=bnb, device_map='auto',
)
base = prepare_model_for_kbit_training(base)

config = LoraConfig(
    r=16, lora_alpha=32, task_type='CAUSAL_LM',
    target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj'],
)
model = get_peft_model(base, config)
model.print_trainable_parameters()
# 这样一张消费级显卡就能微调 7B 模型`

export default function Ch3_3() {
  return (
    <>
      <Lead>
        <p>
          全量微调一个大模型，等于要更新它<strong>每一个参数</strong>，还要为每个参数存梯度和优化器状态——
          一个 7B 模型动辄要几十上百 GB 显存，普通人根本碰不起。<em>LoRA</em>（Low-Rank Adaptation）的出现，
          让你用一张消费级显卡、改动不到 1% 的参数，就能微调大模型，效果还能逼近全量。这一章讲清楚它凭什么这么省。
        </p>
      </Lead>

      <h2>核心思路：低秩分解</h2>
      <p>
        微调的本质是给原权重 <code>W</code> 加上一个改变量 <code>ΔW</code>，让模型变成 <code>W + ΔW</code>。
        全量微调直接训练这个 <code>ΔW</code>，它和 <code>W</code> 一样大。LoRA 的洞察是：
        这个 <code>ΔW</code> 其实「没那么复杂」，可以用两个又瘦又小的矩阵相乘来近似：
      </p>
      <CodeBlock
        lang="text"
        title="low-rank decomposition"
        code={`W + ΔW = W + B · A
  A 形状 (r, d)，B 形状 (d, r)，r 远小于 d`}
      />
      <p>
        这里 <code>r</code> 叫<em>秩</em>（rank），是一个很小的数（比如 8、16）；<code>d</code> 是原权重的维度（可能上千）。
        训练时<strong>冻住 W 不动</strong>，只训练 <code>A</code> 和 <code>B</code> 这两个小矩阵。
      </p>

      <h3>为什么能砍掉约 99% 的参数</h3>
      <p>
        原本 <code>ΔW</code> 有 <code>d × d</code> 个参数；换成 <code>B · A</code> 后，参数量变成 <code>2 × d × r</code>。
        当 <code>r</code> 远小于 <code>d</code> 时，这个比例小得惊人。
      </p>

      <Example title="算一笔账">
        <p>
          假设某层 <code>d = 4096</code>，全量微调这一层要训 <code>4096 × 4096 ≈ 1678 万</code> 个参数。
          用 <code>r = 8</code> 的 LoRA，只需 <code>2 × 4096 × 8 = 6.5 万</code> 个参数——不到原来的 <strong>0.4%</strong>。
          整个模型加起来，可训练参数通常能压到总量的零点几个百分点。
        </p>
      </Example>

      <KeyIdea title="推理时零额外延迟">
        <p>
          训练完，<code>A</code> 和 <code>B</code> 还是分开挂在原模型旁边的「旁路」。但上线前你可以把它们
          <strong>merge 回原权重</strong>：直接算出 <code>W_new = W + B · A</code>，得到一个和原模型结构完全一样的新权重。
          这样推理时既没有多出来的矩阵乘法，也没有任何额外延迟——这是 LoRA 相比其他旁路方法的一大工程优势。
          merge 之后它就是个普通模型，部署、量化都跟原来一样。
        </p>
      </KeyIdea>

      <h2>三个关键超参</h2>
      <ul>
        <li>
          <strong>rank</strong>（<code>r</code>）——低秩矩阵的秩，决定了改变量的「表达力」。太小学不动复杂行为，太大失去省参数的意义；
          常用 8、16、32，从小往大试。
        </li>
        <li>
          <strong>alpha</strong>（<code>lora_alpha</code>）——缩放系数，LoRA 旁路的实际贡献会乘上 <code>alpha / r</code>。
          它控制这个旁路「说话有多大声」，常见做法是设成 <code>r</code> 的 1 到 2 倍。
        </li>
        <li>
          <strong>target_modules</strong>——把 LoRA 插到哪些层。最经典的是注意力里的 <code>q_proj</code> 和 <code>v_proj</code>；
          想要更强可以把 <code>k_proj</code>、<code>o_proj</code> 乃至 MLP 层也加上，参数和效果一起涨。
        </li>
      </ul>

      <Callout variant="tip" title="QLoRA：再省一个数量级的显存">
        <p>
          LoRA 省的是「要训练的参数」，但冻结的基座本身仍要占显存。<em>QLoRA</em> 在此基础上再加一招：
          把基座以 <strong>4bit 量化</strong>加载（用 NF4 这种专为权重设计的量化类型），显存直接砍到约四分之一，
          再在量化后的模型上挂 LoRA 训练。计算时临时把 4bit 反量化回 bf16，精度损失很小。
          靠这套组合，一张 24GB 的消费级显卡就能微调 7B 甚至更大的模型——这是 LoRA 真正走进千家万户的关键。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        LoRA 的旁路特性带来一个很爽的工程模式：一个基座 + 多个 LoRA 适配器。你可以为不同任务、不同客户各训一个几十 MB 的
        小适配器，部署时<strong>共享同一份基座</strong>，按需挂载不同的 LoRA，甚至在一台机器上同时服务多个适配器。
        这让「为每个场景定制一个模型」从奢侈变得廉价。再加上 QLoRA 把训练门槛压到一张显卡，微调不再是大厂专属，
        小团队也能快速迭代自己的专用模型。
      </p>

      <Practice title="给模型挂上 LoRA，看看省了多少">
        <p>
          用 <code>peft</code> 库给一个模型加 LoRA，重点是亲眼看到可训练参数的占比有多小：
        </p>
        <CodeBlock lang="python" title="add_lora.py" code={loraCode} />
        <p>
          如果你的显存吃紧，换成 QLoRA：先 4bit 量化加载基座，再挂 LoRA，就能在小卡上微调更大的模型：
        </p>
        <CodeBlock lang="python" title="qlora.py" code={qloraCode} />
        <p>
          跑完对比一下两种配置打印出的可训练参数占比，体会 rank 和 target_modules 怎么影响这个数字。
        </p>
      </Practice>

      <Summary
        points={[
          'LoRA 用低秩分解近似改变量：W + ΔW = W + B·A，A 是 (r,d)、B 是 (d,r)，r 远小于 d，训练时冻住 W 只训 A、B。',
          '参数量从 d×d 降到 2×d×r，可训练参数通常砍到总量的不到 1%，一张消费级显卡就能微调大模型。',
          '推理时可把 B·A merge 回 W，得到结构不变的新权重，零额外延迟。',
          '三个超参：rank 控表达力、alpha/r 控旁路强度、target_modules 决定插在哪些层（经典是 q_proj、v_proj）。',
          'QLoRA = 4bit 量化基座 + LoRA，再省约四分之三显存，让单卡微调 7B 以上模型成为可能。',
          '工程模式：一份基座共享、多个几十 MB 的 LoRA 适配器按需挂载，为每个场景定制模型变得廉价。',
        ]}
      />
    </>
  )
}
