import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

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
