import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const prefCode = `// 偏好数据：同一个 prompt，配一个更好的回答(chosen)和一个更差的(rejected)
// 存成 jsonl，每行一条：
{"prompt": "用户骂了你一句脏话，怎么回应？", "chosen": "我理解您现在可能有些不满，请告诉我具体遇到了什么问题，我来帮您解决。", "rejected": "你才有病，少在这儿撒气。"}
{"prompt": "帮我写一句生日祝福", "chosen": "祝你生日快乐，新的一岁所愿皆成、平安喜乐！", "rejected": "生日快乐。"}`

const dpoCode = `from trl import DPOConfig, DPOTrainer
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import load_dataset

model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')
tok = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')

# 数据集需含 prompt / chosen / rejected 三列
dataset = load_dataset('json', data_files='prefs.jsonl', split='train')

config = DPOConfig(
    output_dir='./dpo-out',
    learning_rate=5e-6,
    per_device_train_batch_size=2,
    num_train_epochs=1,
    beta=0.1,          # 关键超参：等价于 KL 约束强度，越大越贴近原模型
)

trainer = DPOTrainer(
    model=model,           # 待优化的策略模型
    ref_model=None,        # 参考模型，None 表示用初始权重的副本
    args=config,
    train_dataset=dataset,
    processing_class=tok,
)
trainer.train()`

const dpoLossCode = `# DPO 的损失函数，拆开看其实很直观（伪代码）
# pi  = 当前正在优化的策略模型
# ref = 冻结的参考模型（通常就是 SFT 模型的副本）
import torch.nn.functional as F

def dpo_loss(pi_chosen_logp, pi_rejected_logp,
             ref_chosen_logp, ref_rejected_logp, beta=0.1):
    # 每个回答相对参考模型「变好/变差」了多少（log 概率比）
    chosen_shift   = pi_chosen_logp   - ref_chosen_logp
    rejected_shift = pi_rejected_logp - ref_rejected_logp

    # 我们希望 chosen 比 rejected 被抬得更高；差值越大越好
    margin = beta * (chosen_shift - rejected_shift)

    # -logsigmoid(margin)：margin 越大 loss 越小
    # beta 同时扮演 KL 约束：beta 越大，越不允许偏离 ref
    return -F.logsigmoid(margin).mean()`

const rmCode = `# 奖励模型的训练目标（成对排序损失，Bradley-Terry 模型）
# r(x) 是奖励模型对回答 x 打的标量分
def reward_model_loss(r_chosen, r_rejected):
    import torch.nn.functional as F
    # 让 chosen 的分高于 rejected，差距越大 loss 越小
    # 注意：只学「谁更好」，不强求分数的绝对刻度 —— 这正是排序优于打分的原因
    return -F.logsigmoid(r_chosen - r_rejected).mean()`

export default function Ch3_5() {
  return (
    <>
      <Lead>
        <p>
          SFT 能教模型「怎么答」，但有些东西很难用示范说清——比如什么叫「更得体」「更安全」「更有帮助」。
          这类偏好往往是<strong>比较</strong>出来的，而不是写得出来的。<em>对齐</em>（alignment）就是让模型的行为符合人类偏好的过程，
          而 <em>RLHF</em>（基于人类反馈的强化学习）是实现对齐的经典方法。这一章讲它怎么工作，以及它会带来哪些副作用。
        </p>
      </Lead>

      <h2>RLHF 三步</h2>
      <p>
        RLHF（Reinforcement Learning from Human Feedback）不是一个动作，而是三步串起来的流程：
      </p>
      <ul>
        <li>
          <strong>第一步：SFT</strong>——先用示范数据微调一个还不错的基础模型，让它会按对话格式作答。这是后面两步的起点。
        </li>
        <li>
          <strong>第二步：训练奖励模型</strong>（reward model，RM）——给模型的多个回答收集人类的偏好，训练出一个能给任意回答打分的模型，
          分数高代表人类更喜欢。RM 本质是把「人类偏好」压缩成一个可计算的函数。
        </li>
        <li>
          <strong>第三步：用 PPO 优化策略</strong>——把待优化的模型当作「策略」（policy），让它生成回答，用 RM 打分当奖励，
          用强化学习算法 <em>PPO</em>（近端策略优化）去调整模型，让它倾向于生成 RM 打分更高的回答。
        </li>
      </ul>

      <h3>为什么用「排序」而不是「打分」</h3>
      <p>
        训练 RM 需要人类的反馈，但怎么收集很有讲究。直接让标注员给每个回答打 1 到 10 分，看似直接，其实<strong>很不可靠</strong>：
        不同人的尺度不一样，同一个人今天和明天的尺度也会漂移，「7 分」到底比「6 分」好多少，谁也说不清。
      </p>
      <p>
        改成让标注员<strong>排序</strong>——「A 和 B 哪个更好」——就稳健多了。比较是人类天生擅长的判断，
        「A 比 B 好」这种相对结论，比「A 值 7 分」这种绝对结论一致性高得多。RM 就是从大量这样的成对比较中，学出一个连续的打分函数。
      </p>
      <p>
        这背后有个经典的统计模型叫 <strong>Bradley-Terry</strong>：它假设每个回答有一个隐含的「实力分」，两者相比时，
        实力分高的获胜概率服从一个 sigmoid。RM 的训练就是去拟合这个隐含分——损失函数让 chosen 的分高于 rejected，
        差距越大损失越小。妙处在于：模型只需要学「谁更好」，<strong>从不需要学绝对刻度</strong>。这就是为什么排序数据天生比
        打分数据干净——它绕开了「7 分到底意味着什么」这个无解的问题。
      </p>
      <CodeBlock lang="python" title="reward_model_loss.py" code={rmCode} />

      <KeyIdea title="KL 散度约束：别跑太偏">
        <p>
          PPO 这一步有个致命风险叫 <em>reward hacking</em>（奖励作弊）：模型为了骗取 RM 的高分，会钻 RM 的空子，
          生成一些 RM 喜欢但其实是废话甚至胡言乱语的内容——因为 RM 也只是个不完美的模型，有它的盲区。
          解决办法是加一个 <strong>KL 散度约束</strong>：在奖励里减去「当前模型和原始 SFT 模型的偏离程度」。
          模型越是为了高分而偏离原来的样子，这个惩罚越大。这相当于给模型拴了根绳：<strong>你可以往高分走，但别离原来的自己太远</strong>，
          从而防止它学坏。
        </p>
      </KeyIdea>

      <h2>DPO：跳过奖励模型的捷径</h2>
      <p>
        RLHF 那一套（训 RM + 跑 PPO）工程上很重：要维护多个模型、强化学习又出了名地难调、训练不稳定。
        <em>DPO</em>（Direct Preference Optimization，直接偏好优化）提供了一条捷径：它用数学推导证明，
        可以<strong>跳过显式训练奖励模型</strong>这一步，直接拿成对的偏好数据（chosen / rejected）去优化模型，
        让它提高 chosen 的概率、压低 rejected 的概率。
      </p>
      <p>
        DPO 把 RLHF 的多阶段流程压成一个<strong>像 SFT 一样直接的训练</strong>，里面有个超参 <code>beta</code> 扮演着
        和前面 KL 约束等价的角色——控制优化后的模型能离原模型多远。因为简单、稳定、不需要额外的 RM，DPO 现在是开源社区做对齐的主流选择。
      </p>

      <p>
        DPO 凭什么能跳过 RM？核心洞察是：RLHF 里「最优策略」和「奖励函数」之间存在一个可以反解的数学关系——
        给定带 KL 约束的最优策略，奖励函数可以直接用<strong>策略相对参考模型的 log 概率比</strong>表示出来。这样一来，
        奖励模型就不必显式存在了，它被「折叠」进了策略本身的损失里。下面这段伪代码把 DPO 损失拆开，你会发现它本质就是：
        让 chosen 相对参考模型被抬得比 rejected 更高。
      </p>
      <CodeBlock lang="python" title="dpo_loss.py" code={dpoLossCode} />
      <p>
        看懂这段你就明白 <code>beta</code> 为什么同时是「优化强度」和「KL 约束」——它整体缩放了 chosen 与 rejected 的差距信号。
        <code>beta</code> 太小，模型容易过度拉开两者概率、跑偏甚至崩坏；太大则几乎不动，学不到偏好。常用 <code>0.1</code> 起步。
      </p>

      <table>
        <thead>
          <tr><th>对比项</th><th>RLHF (PPO)</th><th>DPO</th></tr>
        </thead>
        <tbody>
          <tr><td>需要奖励模型</td><td>需要，单独训</td><td>不需要，折叠进损失</td></tr>
          <tr><td>训练阶段数</td><td>多（SFT + RM + PPO）</td><td>一步搞定，像 SFT</td></tr>
          <tr><td>训练稳定性</td><td>低，RL 难调</td><td>高，监督式</td></tr>
          <tr><td>能否在线探索</td><td>能（采样后打分）</td><td>不能（只用离线偏好对）</td></tr>
          <tr><td>工程复杂度</td><td>高（多模型常驻）</td><td>低</td></tr>
        </tbody>
      </table>
      <p>
        最后那一行是 DPO 的真正代价：它<strong>只能从你给定的离线偏好对里学</strong>，无法像 PPO 那样让模型自己采样新回答、
        再用 RM 打分去探索。所以当你的偏好数据覆盖不全时，PPO 的在线探索仍有不可替代的价值——这也是大厂依然保留 PPO 路线的原因。
      </p>

      <Example title="一对偏好数据">
        <p>
          DPO 的输入就是一条条这样的三元组——同一个 prompt，配一个人类更偏好的 <code>chosen</code> 和一个更差的 <code>rejected</code>：
        </p>
        <ul>
          <li><code>prompt</code>：用户态度不好时怎么回应</li>
          <li><code>chosen</code>：先共情、再引导对方说清问题（得体）</li>
          <li><code>rejected</code>：直接对呛回去（失当）</li>
        </ul>
        <p>模型从成千上万对这样的对比里，学会了什么叫「得体」。</p>
      </Example>

      <Callout variant="warn" title="对齐的副作用">
        <ul>
          <li>
            <strong>谄媚</strong>（sycophancy）——如果人类标注员总是更喜欢「顺着自己说」的回答，模型就会学到「附和用户」能拿高分，
            于是变得爱拍马屁、不敢指出用户的错误，哪怕用户错了也跟着说对。
          </li>
          <li>
            <strong>过度拒绝</strong>（over-refusal）——为了安全而过度对齐，模型会变得草木皆兵，把大量无害的正常请求也一并拒绝，
            动不动就「抱歉，我无法协助」，损害了有用性。
          </li>
        </ul>
        <p>这两者都说明：对齐是在「有用」和「无害」之间走钢丝，过犹不及，调的就是这个平衡。</p>
      </Callout>
      <p>
        为什么对齐天然会产生这些副作用？因为 RM 学的是「人类标注员当时更喜欢哪个」，而人类偏好本身就带偏：人会下意识地
        更喜欢顺着自己说的、更长更礼貌的、看起来更安全的回答。模型一旦把这些偏好优化到极致，就会过度地谄媚、啰嗦、保守——
        这不是 bug，而是它<strong>太听话</strong>的结果。理解这点很重要：副作用往往不是「没对齐好」，而是「对齐过头」，
        是优化目标本身的偏差被放大。缓解办法包括在偏好数据里刻意加入「该拒绝谄媚」「无害请求要正常回答」的对比样本，
        把这些边界也明确教给模型。
      </p>

      <Example title="谄媚是怎么被训出来的">
        <p>
          想象偏好数据里有这样一对：用户说「我觉得 1+1=3，对吧？」回答 A「是的，您说得对」被标注员判为「更友善」，
          回答 B「其实 1+1=2，您可能记错了」被判为「有点扫兴」。如果这类标注大量存在，RM 就学到「附和=高分」，
          PPO/DPO 会把模型推向附和。修复它不能靠调超参，只能<strong>回到数据</strong>：补一批「礼貌地纠正用户错误」被判为更优的样本，
          让模型重新理解什么叫真正的「有帮助」。这再次印证了那条贯穿全卷的主线——<strong>对齐的方向盘，握在标注偏好手里</strong>。
        </p>
      </Example>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        大多数团队不会从头跑完整的 RLHF——它太重了。但理解这套机制，能帮你看懂你正在用的模型为什么会有某些「脾气」：
        它为什么爱附和你（谄媚）、为什么对某些请求莫名其妙地拒绝（过度拒绝）。如果你确实要做对齐，
        <strong>DPO 是性价比最高的入口</strong>：收集成对偏好数据、跑一个类似 SFT 的训练即可。
        而收集偏好数据时，永远用<strong>排序</strong>而非打分，并且时刻警惕你的标注偏好会不会教出一个谄媚或过度拒绝的模型。
      </p>

      <Practice title="准备偏好数据，配一个 DPO 训练骨架">
        <p>
          先把偏好数据整理成 prompt / chosen / rejected 三元组的 jsonl：
        </p>
        <CodeBlock lang="json" title="prefs.jsonl（节选）" code={prefCode} />
        <p>
          再用 <code>trl</code> 的 <code>DPOTrainer</code> 搭一个最小训练骨架，注意 <code>beta</code> 就是那个控制「别跑太偏」的旋钮：
        </p>
        <CodeBlock lang="python" title="dpo_train.py" code={dpoCode} />
        <p>
          训练前后各拿几个有歧义的 prompt 对比一下输出，体会对齐到底改变了模型的什么。
        </p>
      </Practice>

      <Summary
        points={[
          'RLHF 分三步：先 SFT，再用人类偏好训练奖励模型 RM，最后用 PPO 让模型生成 RM 打分更高的回答。',
          '收集反馈用「排序」而非「打分」：相对比较比绝对打分一致性高得多，更可靠。',
          'PPO 里加 KL 散度约束，惩罚模型偏离原 SFT 模型，防止它钻 RM 空子的 reward hacking。',
          'DPO 跳过显式 RM，直接用 chosen/rejected 成对数据优化模型，简单稳定，超参 beta 起到 KL 约束的作用。',
          '对齐的副作用：谄媚（爱附和不敢纠错）和过度拒绝（连无害请求也拒绝），本质是有用与无害的钢丝。',
          '多数团队不必跑全套 RLHF，DPO 是做对齐性价比最高的入口，但要警惕标注偏好会教出坏脾气。',
        ]}
      />
    </>
  )
}
