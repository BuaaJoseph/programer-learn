import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const hostedCode = `from openai import OpenAI

client = OpenAI()

# --- 1) 上传训练/验证文件（chat 格式的 jsonl）---
train_file = client.files.create(
    file=open('train.jsonl', 'rb'), purpose='fine-tune',
)
val_file = client.files.create(
    file=open('val.jsonl', 'rb'), purpose='fine-tune',
)

# --- 2) 创建微调任务 ---
job = client.fine_tuning.jobs.create(
    training_file=train_file.id,
    validation_file=val_file.id,
    model='gpt-4o-mini-2024-07-18',
    hyperparameters={'n_epochs': 3},
)
print('job id:', job.id)

# --- 3) 轮询状态，等它训练完 ---
import time
while True:
    job = client.fine_tuning.jobs.retrieve(job.id)
    print('status:', job.status)
    if job.status in ('succeeded', 'failed', 'cancelled'):
        break
    time.sleep(30)

# --- 4) 用训练出来的新模型 ---
if job.status == 'succeeded':
    resp = client.chat.completions.create(
        model=job.fine_tuned_model,   # 形如 ft:gpt-4o-mini:...
        messages=[{'role': 'user', 'content': '怎么退款？'}],
    )
    print(resp.choices[0].message.content)`

const localCode = `from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

MODEL = 'Qwen/Qwen2.5-0.5B-Instruct'

# --- 1) 选模型 ---
model = AutoModelForCausalLM.from_pretrained(MODEL)
tok = AutoTokenizer.from_pretrained(MODEL)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token

# --- 2) 备数据（chat 格式的 jsonl，含 messages 字段）---
train_ds = load_dataset('json', data_files='train.jsonl', split='train')
val_ds = load_dataset('json', data_files='val.jsonl', split='train')

# --- 3) 配训练：用 LoRA + SFTConfig ---
peft_config = LoraConfig(
    r=8, lora_alpha=16, lora_dropout=0.05,
    task_type='CAUSAL_LM', target_modules=['q_proj', 'v_proj'],
)
sft_config = SFTConfig(
    output_dir='./sft-out',
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,   # 等效 batch=8，省显存
    learning_rate=2e-4,
    logging_steps=10,
    eval_strategy='epoch',           # 每个 epoch 在 val 上评估
    save_strategy='epoch',
)

# --- 4) 训练 ---
trainer = SFTTrainer(
    model=model,
    args=sft_config,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    peft_config=peft_config,
    processing_class=tok,
)
trainer.train()
trainer.save_model('./sft-out/final')

# --- 5) 评估：在留出集上看一眼输出 ---
model.eval()
for sample in val_ds.select(range(5)):
    msgs = sample['messages'][:-1]            # 去掉标准答案，只留 prompt
    ids = tok.apply_chat_template(
        msgs, add_generation_prompt=True, return_tensors='pt',
    )
    out = model.generate(ids, max_new_tokens=128)
    print(tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True))`

export default function Ch3_6() {
  return (
    <>
      <Lead>
        <p>
          前面几章把零件讲齐了：什么时候该微调、SFT 怎么回事、LoRA 怎么省、数据怎么造、对齐是什么。这一章把它们拼成一条
          <strong>能真正跑起来</strong>的流水线。我们走两条并排的路：一条是托管微调 API（把数据扔给云端，它帮你训），
          一条是本地用 HuggingFace 全家桶自己训。两条都给完整可跑的代码，你按手头的资源选一条照着走即可。
        </p>
      </Lead>

      <h2>五步骨架</h2>
      <p>
        不管走哪条路，微调都是同样的五步，记住这个骨架，剩下的只是填代码：
      </p>
      <ul>
        <li><strong>选模型</strong>——挑一个合适大小的基座；先从小模型起步，跑通了再放大。</li>
        <li><strong>备数据</strong>——把第 4 章造好的 chat 格式 jsonl 准备好，train 和 val 分开。</li>
        <li><strong>配训练</strong>——设好那几个旋钮（学习率、epochs、batch、LoRA 配置）。</li>
        <li><strong>训练</strong>——跑起来，盯着 train/val 两条 loss 曲线。</li>
        <li><strong>评估</strong>——别只看 loss，要真的拿没见过的输入让它答，看效果。</li>
      </ul>

      <h2>路线一：托管微调 API</h2>
      <p>
        如果你不想碰显卡和训练细节，托管方案最省心。以 OpenAI fine-tuning 为例，整个流程就三个动作：
        <strong>上传 jsonl → 创建 fine_tuning job → 用训练出来的新模型</strong>。云端帮你搞定算力、调度、checkpoint，
        你只管准备数据和等结果。它的代价是：数据要交给第三方、模型权重你拿不到、按量收费。
      </p>

      <Example title="托管路线的产物">
        <p>
          训练成功后，你会拿到一个形如 <code>ft:gpt-4o-mini:your-org::abc123</code> 的模型名。之后调用时把
          <code>model</code> 换成这个名字，其余和普通 API 调用完全一样——这就是它最大的好处：<strong>无缝接入</strong>。
        </p>
      </Example>

      <h2>路线二：本地 HuggingFace + PEFT + trl</h2>
      <p>
        如果你要数据不出门、要拿到权重、或想省钱，就自己训。技术栈是：<code>transformers</code> 加载模型、
        <code>peft</code> 挂 LoRA、<code>trl</code> 的 <em>SFTTrainer</em> 把训练循环封装好。SFTTrainer 替你处理了
        chat 模板套用、label 掩码、batch 拼接这些第 2 章里要手写的脏活，你只需把数据和配置交给它。
      </p>

      <KeyIdea title="SFTTrainer 替你做了什么">
        <p>
          还记得第 2 章那个手写的训练循环和 label 掩码吗？<strong>SFTTrainer 把这些全包了</strong>：它认识 chat 格式的
          <code>messages</code>，自动套用模型的对话模板、自动把 prompt 段的 label 屏蔽掉、自动算只在 assistant 段累加的 loss、
          自动跑前向反向更新。再配上 <code>peft_config</code>，它连 LoRA 都帮你挂好。你写几十行配置，就等于手写几百行训练代码。
          这就是为什么生产里几乎没人手写训练循环——但理解第 2 章那套底层，你才知道它在替你做什么、出错时去哪查。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="避坑清单">
        <ul>
          <li><strong>先小后大</strong>——先用 0.5B 模型和几十条数据把全流程跑通，确认 loss 在降，再换大模型和全量数据，别一上来就烧大钱。</li>
          <li><strong>设好 pad_token</strong>——很多模型默认没有 pad token，不设会在拼 batch 时报错，常见做法是用 eos_token 顶上。</li>
          <li><strong>盯住 val loss</strong>——train loss 一直降不代表学好了，val loss 触底回升就是过拟合的信号，该减 epoch 或加数据。</li>
          <li><strong>学习率别照搬</strong>——LoRA 用的学习率（如 2e-4）比全量微调（如 1e-5）大得多，两者不能混用。</li>
          <li><strong>显存不够用梯度累积</strong>——把 batch 调小、accumulation 调大，等效大 batch 又不爆显存。</li>
          <li><strong>留好随机种子和配置</strong>——每次训练记录种子、超参、数据版本，否则效果好了你都复现不出来。</li>
        </ul>
      </Callout>

      <h2>三层评估</h2>
      <p>
        训练跑完最危险的事，是只看着 loss 下降就以为成功了。loss 低只说明它在训练分布上拟合得好，不代表它真的有用、没学坏。
        评估要分三层，从便宜到贵：
      </p>
      <ul>
        <li>
          <strong>自动指标</strong>——最便宜，能批量跑：分类任务看准确率，生成任务看 BLEU/ROUGE 或格式合规率。快速但粗糙，只能筛掉明显的烂。
        </li>
        <li>
          <strong>留出集</strong>（held-out）——拿一份训练时<strong>完全没碰过</strong>的数据，让模型逐条作答，人工或用更强的模型当裁判打分。
          这是最能反映「在新数据上表现」的一层。
        </li>
        <li>
          <strong>人工抽检</strong>——最贵但不可省：人亲眼读一批真实场景的输出，看语气、看边界、看有没有谄媚或过度拒绝这类对齐副作用。
          数字看不出来的问题，眼睛能看出来。
        </li>
      </ul>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        把微调当成一条<strong>可重复的流水线</strong>，而不是一次性的炼丹。两条路线的取舍很清楚：托管 API 适合不想碰基础设施、
        数据可外发、要快速验证的场景；本地 PEFT 适合数据敏感、要掌控权重、要长期迭代或控成本的场景。
        无论哪条，真正决定成败的还是前面那几章——数据质量、决策是否该微调、评估是否扎实。代码只是把决定落地的最后一公里。
        微调上线后，记得保留对照的基座版本，用同一套留出集持续对比，确认新模型确实更好，而不是只是「不一样」。
      </p>

      <Practice title="两条路线，各跑一遍">
        <p>
          路线一，托管微调 API：上传 jsonl、创建任务、轮询、用新模型，四步一气呵成：
        </p>
        <CodeBlock lang="python" title="hosted_finetune.py" code={hostedCode} />
        <p>
          路线二，本地 SFTTrainer：选模型、备数据、配 LoRA、训练、在留出集上评估，五步走完：
        </p>
        <CodeBlock lang="python" title="local_sft.py" code={localCode} />
        <p>
          建议先跑本地路线的小模型版把流程摸熟（不花钱、看得见每一步），再决定要不要上托管或放大规模。
        </p>
      </Practice>

      <Summary
        points={[
          '微调五步骨架：选模型→备数据→配训练→训练→评估，两条路线都套这个框架。',
          '托管路线（如 OpenAI fine-tuning）：上传 jsonl→create job→用 ft: 开头的新模型，省心但数据外发、拿不到权重。',
          '本地路线：transformers + peft（LoRA）+ trl 的 SFTTrainer，数据不出门、拿得到权重、可控成本。',
          'SFTTrainer 替你处理了 chat 模板、label 掩码、loss 计算和训练循环，几十行配置顶手写几百行。',
          '避坑：先小后大、设 pad_token、盯 val loss、LoRA 学习率别照搬、显存不够用梯度累积、记录种子与配置。',
          '三层评估缺一不可：自动指标筛烂、留出集看新数据表现、人工抽检揪出 loss 看不见的问题。',
        ]}
      />
    </>
  )
}
