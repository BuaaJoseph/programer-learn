import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const maskCode = `import torch
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')

# 一条对话样本：我们只想让模型学「assistant 该怎么答」，
# 不想让它去拟合 user 的话。
messages = [
    {'role': 'user', 'content': '把这句话翻译成英文：今天天气很好。'},
    {'role': 'assistant', 'content': 'The weather is nice today.'},
]

# 1) 先只编码 prompt 部分（到 assistant 开头为止），量出它的长度
prompt_ids = tok.apply_chat_template(
    messages[:1], add_generation_prompt=True, tokenize=True,
)
# 2) 再编码完整对话（prompt + 答案）
full_ids = tok.apply_chat_template(
    messages, add_generation_prompt=False, tokenize=True,
)

input_ids = torch.tensor(full_ids)
labels = input_ids.clone()

# 3) 关键一步：把 prompt 段的 label 全部设为 -100。
#    交叉熵 loss 会忽略 label == -100 的位置，
#    于是只在 assistant 的回答上算 loss。
labels[: len(prompt_ids)] = -100

print('input_ids :', input_ids.tolist())
print('labels    :', labels.tolist())  # 前半段全是 -100`

const loopCode = `import torch
from torch.utils.data import DataLoader
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')
tok = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')
model.train()

# 三个旋钮
LR = 1e-5          # learning rate：步子大小
EPOCHS = 3         # 整个数据集过几遍
BATCH_SIZE = 4     # 一次喂几条

optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)

for epoch in range(EPOCHS):
    for batch in loader:
        # batch 里已带好 input_ids / attention_mask / labels(含 -100 掩码)
        out = model(**batch)        # 1) 前向：得到 logits 和 loss
        loss = out.loss             # 2) 算 loss（已自动忽略 -100 的位置）

        loss.backward()             # 3) 反向：算每个参数的梯度
        optimizer.step()            # 4) 更新：按梯度挪动权重
        optimizer.zero_grad()       #    清空梯度，准备下一步

        print(f'epoch {epoch} loss {loss.item():.4f}')`

const gradAccumCode = `# 显存不够开大 batch？用「梯度累积」假装一个大 batch。
# 真实 batch=4，但攒 4 个小步再更新一次 => 等效 batch=16。
ACCUM_STEPS = 4
optimizer.zero_grad()

for step, batch in enumerate(loader):
    out = model(**batch)
    # 关键：loss 先除以累积步数，否则梯度会被放大 ACCUM_STEPS 倍
    loss = out.loss / ACCUM_STEPS
    loss.backward()                     # 梯度持续累加，先不更新

    if (step + 1) % ACCUM_STEPS == 0:
        torch.nn.utils.clip_grad_norm_(  # 顺手裁剪梯度，防止偶发的大梯度炸训练
            model.parameters(), max_norm=1.0,
        )
        optimizer.step()                # 攒够了才真正挪一步
        optimizer.zero_grad()           # 清空，开始攒下一轮`

const splitCode = `import random

def split_dataset(samples, val_ratio=0.1, seed=42):
    """切出验证集。微调里最常见的事故就是没留验证集，
    训练 loss 一路下降你以为成了，其实早就过拟合。"""
    random.Random(seed).shuffle(samples)   # 固定 seed，保证每次切法一致、可复现
    n_val = max(1, int(len(samples) * val_ratio))
    val = samples[:n_val]
    train = samples[n_val:]
    # 体检：验证集分布要和训练集像，否则验证 loss 没有参考意义
    assert len(set(map(id, val)) & set(map(id, train))) == 0, '训练/验证不能重叠！'
    return train, val

train, val = split_dataset(all_samples)
print(f'train={len(train)}  val={len(val)}')`

export default function Ch3_2() {
  return (
    <>
      <Lead>
        <p>
          决定了要微调，最常见、最该先学的方式叫<em>监督微调</em>（supervised fine-tuning，简称 SFT）。
          它的思路朴素到近乎笨：给模型看大量「输入 → 理想输出」的示范，让它照着模仿。
          模仿得多了，它就学会了在你给的这类输入下，该用你想要的方式作答。
        </p>
      </Lead>

      <h2>SFT 在做什么</h2>
      <p>
        SFT 本质上还是第 1 卷讲的那个动作——<em>next-token prediction</em>，只不过这次喂的不是泛泛的网络文本，
        而是你精心准备的「示范题」：每条样本是一个 prompt 配上一个你认可的理想答案。模型逐个 token 地去预测这个理想答案，
        预测错了就用真实答案纠正，反复多轮之后，参数被轻轻推向「在这类问题上倾向于这样答」。
      </p>
      <p>
        说它是「监督」，是因为每条样本都带着标准答案（label）——这和预训练时漫无目的地读文本不同，SFT 是有明确目标的、
        被监督着学的。它不教模型新知识，而是<strong>调整它已有能力的发挥方式</strong>：语气、格式、做事的套路。
      </p>
      <p>
        换个更直觉的说法：预训练让模型读遍了互联网，肚子里什么都有一点，但它<em>不知道你想要哪一面</em>。
        同一个 prompt，它可能给你一段维基百科式的客观陈述，也可能给你一段论坛口吻的吐槽，因为这两种文本它都见过、概率都不低。
        SFT 做的事，就是反复给它看「在这类输入下，我要的是<strong>这一种</strong>回答」，把那条本来就存在、只是概率不够突出的路径
        一点点抬高，直到它成为模型的默认反应。所以 SFT 不是「往脑子里塞东西」，而是「在已有的众多可能里，把你要的那条调成首选」。
      </p>
      <p>
        从数学上看，每个位置的训练目标是最小化交叉熵 <code>{'-log P(正确token | 前文)'}</code>。模型给正确 token 的概率越低，
        这个 loss 越大，反传回去的「纠正力度」也越大；当模型已经很自信地预测对了，loss 接近 0，几乎不再调整。
        这就是为什么训练后期 loss 下降会变慢——容易学的早学会了，剩下的都是模型本来就拿不准的硬骨头。
      </p>

      <h3>训练循环：四步一圈</h3>
      <p>
        所有的深度学习训练，剥到底都是同一个循环转很多圈，每圈四步：
      </p>
      <ul>
        <li><strong>前向</strong>（forward）——把输入喂进模型，得到每个位置上的 logits。</li>
        <li><strong>算 loss</strong>——拿模型的预测和标准答案比，用交叉熵算出「错得多离谱」。</li>
        <li><strong>反向</strong>（backward）——反向传播，算出每个参数对这个 loss 的「责任」，也就是梯度。</li>
        <li><strong>更新</strong>（step）——优化器按梯度把参数挪一小步，让下次预测好一点点。</li>
      </ul>
      <p>
        一圈处理一个 batch，整个数据集过完一遍叫一个 <em>epoch</em>。这个循环你会反复看到，它就是训练的心脏。
      </p>

      <KeyIdea title="只在 assistant 段算 loss">
        <p>
          一条对话样本里同时有 user 的话和 assistant 的答，但我们<strong>只想教模型怎么答</strong>，不想让它学着去复述用户的话。
          做法是给每个 token 配一个 label，把 prompt（user 那部分）的 label 全设成 <code>-100</code>——PyTorch 的交叉熵会
          <strong>自动忽略</strong> label 等于 <code>-100</code> 的位置。于是 loss 只在 assistant 的回答上累加，
          梯度也只朝着「答得更好」的方向走。这一步叫 <em>label masking</em>，是 SFT 实现里最容易写错、也最关键的细节。
        </p>
      </KeyIdea>

      <Example title="label 掩码长什么样">
        <p>
          假设样本编码后是 8 个 token，前 5 个是 prompt、后 3 个是答案，那么 labels 大致是：
        </p>
        <ul>
          <li>
            <code>input_ids = [t0, t1, t2, t3, t4, a0, a1, a2]</code>
          </li>
          <li>
            <code>labels = [-100, -100, -100, -100, -100, a0, a1, a2]</code>
          </li>
        </ul>
        <p>
          前 5 个 <code>-100</code> 让模型「看得到 prompt 但不为它的预测负责」，后 3 个真实 token 才参与算 loss。
        </p>
      </Example>

      <Callout variant="warn" title="掩码写错的两种典型翻车">
        <ul>
          <li>
            <strong>忘了掩码、全程算 loss</strong>：模型会同时学着去「生成用户的提问」。轻则浪费容量，重则在多轮对话里
            学出「自问自答」的怪习惯——你只想让它答，它却开始替用户编问题。
          </li>
          <li>
            <strong>边界差一个 token</strong>：prompt 段和 assistant 段的切分点算错一位，常见于忘了把对话模板里的特殊标记
            （如 <code>{'<|assistant|>'}</code> 这种角色分隔符）算进 prompt 长度。结果要么把答案的第一个 token 也掩掉了、
            模型学不会怎么「起头」，要么把角色标记暴露给 loss、污染训练。<strong>务必打印一次对齐结果亲眼核对</strong>，
            别凭感觉。
          </li>
        </ul>
        <p>
          一个稳妥习惯：先 tokenize 出 <code>prompt_ids</code> 量长度，再 tokenize 完整对话，二者用<strong>同一套模板</strong>，
          掩码长度直接取 <code>len(prompt_ids)</code>，避免手动数 token。
        </p>
      </Callout>

      <h2>三个旋钮</h2>
      <p>
        SFT 真正要你调的超参不多，最核心的就三个：
      </p>
      <ul>
        <li>
          <strong>learning rate</strong>（学习率）——每步挪多大。太大模型会震荡、把原有能力学坏；太小则学不动。微调通常用很小的值，
          比如 <code>1e-5</code> 到 <code>2e-4</code> 量级，远小于从头训练。
        </li>
        <li>
          <strong>epochs</strong>——整个数据集过几遍。微调数据量小，过太多遍极易过拟合，常见就 1 到 3 遍。
        </li>
        <li>
          <strong>batch size</strong>——一次喂几条。大一点梯度更平稳但吃显存；显存不够时用梯度累积来「假装」大 batch。
        </li>
      </ul>
      <p>
        为什么微调的学习率要比预训练小一两个数量级？因为你拿到的是一个<strong>已经训好的</strong>模型，它的参数处在一个精心找到的
        「好位置」。学习率太大，相当于一脚把它从这个好位置踹出去，原有的语言能力、常识、推理全被冲散，业内叫
        <strong>灾难性遗忘</strong>（catastrophic forgetting）——你教会了它你那几百条样本，却把它本来会的东西忘了大半。
        小学习率的本质，是「在不破坏原有能力的前提下，轻轻偏移一点点」。这也呼应了上一章的判断：微调是塑形，不是重塑。
      </p>

      <h3>梯度累积：显存不够时的标准操作</h3>
      <p>
        batch size 越大，梯度估计越稳、训练越平滑，但它直接吃显存——一张卡放不下大 batch 是微调里最常见的拦路虎。
        梯度累积的思路很巧：既然一次性算 16 条放不下，那就分 4 次、每次算 4 条，把梯度<strong>攒起来不更新</strong>，
        攒满 4 次再一起 step。数学上这和真的用 batch=16 几乎等价（除了 BatchNorm 这类跨样本统计的层，但 Transformer 用的是 LayerNorm，不受影响）。
        唯一要小心的坑是<strong>loss 要先除以累积步数</strong>，否则累加起来的梯度会被放大，等效学习率失控。
      </p>
      <CodeBlock lang="python" title="grad_accum.py" code={gradAccumCode} />

      <Callout variant="warn" title="过拟合 vs 欠拟合">
        <ul>
          <li>
            <strong>过拟合</strong>（overfitting）：训练 loss 一路下降，但验证 loss 触底回升；模型把训练样本背了下来，
            一遇到没见过的输入就崩，甚至开始重复训练集里的原话。对策：减少 epochs、增大数据多样性、调小学习率、用早停。
          </li>
          <li>
            <strong>欠拟合</strong>（underfitting）：训练 loss 降不下去，模型根本没学到东西。对策：调大学习率、多训几个 epoch、
            检查数据质量和 label 掩码是不是写错了。
          </li>
        </ul>
        <p>判断的唯一办法是<strong>始终留一份验证集</strong>，盯着训练和验证两条 loss 曲线的走势。</p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        在工程里，SFT 的产出是一个新模型版本，它最适合固化那些「<strong>用 prompt 反复写还是不稳</strong>」的行为：
        固定的输出格式、特定的工具调用习惯、统一的语气。但要记住它的边界——SFT 只让模型学会<em>模仿示范</em>，
        示范里没有的它学不会，示范里的坏习惯它也会照单全收。所以 SFT 的成败<strong>八成在数据，两成在调参</strong>，
        这也是为什么后面专门有一章讲怎么造数据集。
      </p>
      <p>
        还有一个工程上的隐性成本要提前知道：SFT 产出的是一个<strong>完整的新模型权重</strong>（除非用后面要讲的 LoRA 等轻量方法）。
        这意味着每个微调版本都要单独存储、单独部署、单独占显存。如果你为五个不同任务各微调了一个全量模型，线上就要养五份权重，
        成本陡增。这也是为什么实践中大家越来越倾向参数高效微调——既要行为被固化，又不想为此背上一座模型动物园。
      </p>

      <Example title="一个真实的 SFT 失败复盘">
        <p>
          某团队想让模型把客服回复统一成「先共情、再给方案、最后留钩子」的三段式，造了 800 条样本微调。上线后发现：
          模型对训练里出现过的问题答得很漂亮，但稍微变个问法就退回原样，而且偶尔会一字不差地背出训练集里的某句原话。
          这是典型的<strong>过拟合 + 数据多样性不足</strong>：800 条里问法太集中，模型记住的是「这些具体句子」而非「三段式的套路」。
          修复办法不是加 epoch（那只会背得更死），而是把数据从 800 条扩充到 2000 条、刻意覆盖更多问法和领域，并把 epoch 从 5 降到 2。
          重训后泛化明显变好。结论再次印证：<strong>SFT 的天花板由数据多样性决定</strong>。
        </p>
      </Example>

      <Practice title="构造带掩码的样本，跑一个最小循环">
        <p>
          先用 HuggingFace 的 tokenizer 把一条对话做成带 <code>-100</code> 掩码的训练样本，看清楚 labels 的前半段确实被屏蔽了：
        </p>
        <CodeBlock lang="python" title="build_masked_sample.py" code={maskCode} />
        <p>
          再把样本喂进一个最小的训练循环骨架，亲手把「前向 / 算 loss / 反向 / 更新」这四步跑通：
        </p>
        <CodeBlock lang="python" title="min_train_loop.py" code={loopCode} />
        <p>
          先用极小模型（如 0.5B）和几十条数据跑通流程，确认 loss 在下降，再去考虑规模和效果。
        </p>
        <p>
          跑通之后，别忘了在训练前先切一份验证集——这是判断过拟合/欠拟合的唯一依据，缺了它你就是闭着眼睛训练：
        </p>
        <CodeBlock lang="python" title="split_dataset.py" code={splitCode} />
      </Practice>

      <Summary
        points={[
          'SFT 是给模型看大量「输入→理想输出」的示范让它模仿，本质仍是 next-token prediction，但带了标准答案。',
          '训练循环四步一圈：前向算 logits、算交叉熵 loss、反向求梯度、更新权重；过完整个数据集叫一个 epoch。',
          '只在 assistant 段算 loss：把 prompt 部分的 label 设为 -100，交叉熵会自动忽略这些位置（label masking）。',
          '三个旋钮：learning rate（微调取很小值）、epochs（小数据通常 1~3 遍）、batch size（不够就梯度累积）。',
          '过拟合看验证 loss 回升、模型背原话；欠拟合看 loss 降不动；唯一判据是盯住验证集两条曲线。',
          'SFT 只学示范里有的东西，成败八成在数据质量，调参只是两成。',
        ]}
      />
    </>
  )
}
