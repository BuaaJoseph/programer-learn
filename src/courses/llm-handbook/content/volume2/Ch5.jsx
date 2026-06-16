import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const paramsCode = `# 常用参数一次看全：每个都是在干预「下一个词的概率分布」或采样过程
from openai import OpenAI
client = OpenAI()

resp = client.chat.completions.create(
    model='gpt-4o-mini',
    messages=[{'role': 'user', 'content': '用一句话介绍 Python。'}],

    max_tokens=60,          # 最多生成多少 token —— 硬性长度上限
    stop=['\\n\\n', '###'],  # 命中任一停止串就立刻停下
    temperature=0.7,        # 温度：>1 更随机，0 近似确定（拿最高概率词）
    top_p=0.9,              # 核采样：只在累积概率前 90% 的候选里采样
    frequency_penalty=0.5,  # 频率惩罚：词出现越多次，越压低它 —— 治复读
    presence_penalty=0.3,   # 存在惩罚：只要出现过就压低 —— 促换话题
    n=1,                    # 一次返回几条候选回复
)
print(resp.choices[0].message.content)`

const logitBiasCode = `# logit_bias：直接给某些 token 的 logit 加偏置（采样前生效）
# 正值促进、负值抑制；-100 近似「禁用」，+100 近似「强制」
# 注意：键是 token id，不是词；需要先用分词器查到 id

import tiktoken
enc = tiktoken.encoding_for_model('gpt-4o-mini')

# 假设我们想禁掉「抱歉」、促进「好的」
ban_ids = enc.encode('抱歉')
push_ids = enc.encode('好的')

bias = {}
for tid in ban_ids:
    bias[tid] = -100        # 几乎不可能再生成这些 token
for tid in push_ids:
    bias[tid] = 5           # 适度抬高，不要直接 +100 以免输出僵硬

from openai import OpenAI
client = OpenAI()
resp = client.chat.completions.create(
    model='gpt-4o-mini',
    messages=[{'role': 'user', 'content': '帮我确认一下这个安排。'}],
    logit_bias=bias,
    max_tokens=40,
)
print(resp.choices[0].message.content)`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          前面几章都在 prompt 这一层做功夫。但 API 还另给了一排<strong>旋钮</strong>，
          直接作用在「下一个词的概率分布」和采样过程上。看懂每个旋钮拧的是什么，
          你就能对症下药：治啰嗦、治复读、治跑题、治不守格式，各有各的招。
        </p>
      </Lead>

      <h2>先记住一句话：每个旋钮都对应概率视角里的一个动作</h2>
      <p>
        这些参数最容易被当成「玄学数字」来背。但只要套上第 1 卷的概率视角，它们立刻变得可解释：模型每步在词表上给出一个分布，
        而这一排参数，无非是在<strong>「分布生成 → 分布整形 → 从分布里采样 → 何时停」</strong>这条流水线的不同环节上拧一下。
      </p>
      <ul>
        <li><strong>整形分布</strong>：temperature（拉尖/抹平）、frequency/presence_penalty（压低出现过的词）、logit_bias（手动加减某些词）。</li>
        <li><strong>限定采样范围</strong>：top_p（只在高概率核心里采）。</li>
        <li><strong>控制停止与数量</strong>：max_tokens、stop（何时停）、n（采几条）。</li>
      </ul>
      <p>
        下面逐个拆，但请始终带着这条主线读——你会发现没有一个参数是孤立的魔法，它们各自对应着一个你能讲清楚因果的动作。
      </p>

      <h2>API 参数逐个讲</h2>
      <p>把它们和第 1 卷的概率视角对上，每个参数就不再是玄学：</p>
      <ul>
        <li>
          <strong>max_tokens</strong>：生成 token 数的硬上限。控成本、防失控，但设太小会把输出
          <strong>截成半截</strong>（结构化输出尤其危险——半截 JSON 直接解析失败）。
        </li>
        <li>
          <strong>stop</strong>：一组停止串，生成命中其中任意一个就立刻停。适合让模型「答完该答的就闭嘴」，
          比如让它在 <code>###</code> 或换行处停。
        </li>
        <li>
          <strong>temperature</strong>：温度。它在 softmax 前缩放 logits——温度高，分布被「抹平」，输出更随机更发散；
          温度趋近 0，分布被「拉尖」，几乎总取最高概率词，输出更确定、可复现。
        </li>
        <li>
          <strong>top_p</strong>：核采样（nucleus sampling）。只在「累积概率排前 p」的那批候选词里采样，砍掉长尾。
          和 temperature 都是控随机性，<strong>一般二选一调</strong>，别两个一起乱拧。
        </li>
        <li>
          <strong>frequency_penalty</strong>：频率惩罚。某 token 已出现的次数越多，就越压低它的概率——主要治<strong>复读</strong>。
        </li>
        <li>
          <strong>presence_penalty</strong>：存在惩罚。只要某 token 出现过（不论几次）就压低它——鼓励<strong>换新话题/新词</strong>。
        </li>
        <li>
          <strong>logit_bias</strong>：对指定 token 的 logit 直接加偏置，采样前生效。正值促进、负值抑制，
          <code>-100</code> 近乎禁用、<code>+100</code> 近乎强制。最精细的一把刀，按 token id 操作。
        </li>
        <li>
          <strong>n</strong>：一次返回几条候选回复。配合上一章的 self-consistency，或单纯想「多生几个挑一个」时用。
        </li>
      </ul>

      <h3>两类旋钮：作用在 logits 上 vs 作用在采样上</h3>
      <p>
        把这一排参数分成两类，立刻就清楚了。一类<strong>改变分布本身</strong>（在 softmax 前后动 logits）：temperature、
        frequency_penalty、presence_penalty、logit_bias——它们改的是「每个词有多大概率」。另一类<strong>限定从哪采、采到何时停</strong>：
        top_p（从哪些候选里采）、max_tokens 和 stop（采到什么时候停）、n（采几条）。
      </p>
      <p>
        这个分类的实用价值在于：当输出不对劲时，先判断问题属于「分布形状不对」（该调第一类）还是「采样范围/停止时机不对」（该调第二类）。
        比如「老蹦废词」是分布问题（用 logit_bias 压），「答到一半被切」是停止问题（调 max_tokens），别拿错工具治错病。
      </p>

      <h3>prompt 层面的约束</h3>
      <p>
        参数管的是「分布与采样」，但很多约束在 prompt 里说更直接：要求字数、句数、格式、语气。
        实践中两层配合：长度上限用 <code>max_tokens</code> 兜底硬限制，
        而「写 3 条、每条不超过 20 字」这种细粒度要求，写进 prompt（最好再给个示例）效果最好。
      </p>

      <h3>对症下药</h3>
      <ul>
        <li><strong>太啰嗦</strong>：prompt 里给简洁示范 + 收紧 <code>max_tokens</code> + 用 <code>stop</code> 卡住收尾。</li>
        <li><strong>复读 / 鬼打墙</strong>：调高 <code>frequency_penalty</code>（必要时配 <code>presence_penalty</code>）。</li>
        <li><strong>跑题发散</strong>：调低 <code>temperature</code> 或 <code>top_p</code>，让它别乱采样。</li>
        <li><strong>不守格式</strong>：优先上一章的 structured outputs；轻量场景用 few-shot 示例锁格式 + <code>stop</code> 收尾。</li>
        <li><strong>老蹦某个废词</strong>：用 <code>logit_bias</code> 把那个 token 压下去。</li>
      </ul>

      <Example title="一次调用里组合多种约束">
        <p>
          下面把参数和它们各自管的事标在注释里。注意 <code>temperature</code> 和 <code>top_p</code>
          这里同时出现只是为了展示，实际<strong>一般只调一个</strong>。
        </p>
        <CodeBlock lang="python" title="params_demo.py" code={paramsCode} />
        <p>
          建议把 temperature 设 0、固定其余参数，先拿到一个可复现的 baseline，
          再单独动某一个旋钮，观察它对输出的影响——一次只改一个变量，才看得清因果。
        </p>
      </Example>

      <Example title="logit_bias 为什么按 token id、而不是按词">
        <p>
          <code>logit_bias</code> 的键是 <strong>token id</strong>，不是「词」——这直接源于第 1 卷：模型在词表的 token 上输出 logits，
          偏置自然也加在 token 上。这带来两个实际后果：
        </p>
        <ul>
          <li>
            <strong>一个词可能是多个 token</strong>：「抱歉」可能被切成两个 token，你得把它们的 id 都查出来分别加偏置
            （看本章 Practice 里 <code>enc.encode('抱歉')</code> 返回的是一个 id 列表，就是这个原因）。
          </li>
          <li>
            <strong>带空格的 token 是另一个 id</strong>：<code>{' yes'}</code>（带前导空格）和 <code>{'yes'}</code> 是不同 token，
            想禁一个词，常常要把它的几种变体 id 都覆盖到，否则会从「漏网的那个变体」蹦出来。
          </li>
        </ul>
        <p>
          所以 logit_bias 是「最精细但也最琐碎」的一把刀：威力大（能从机制上禁/促），但要先和分词器打交道。
          能用 stop、structured outputs 这类更高层手段解决的，就别动用它。
        </p>
      </Example>

      <h3>temperature 和 top_p：别同时乱调</h3>
      <p>
        两者都在控随机性，但作用点不同：temperature 改整个分布的尖平（在 softmax 前缩放 logits），top_p 在改完的分布上做截断
        （只保留累积概率前 p 的核心候选）。它们是<strong>配合</strong>关系，不是替代——但正因为都管随机性，<strong>新手最好一次只主调一个</strong>。
      </p>
      <p>
        实战里两种稳妥玩法：要么固定 top_p=1.0、只调 temperature；要么固定 temperature=1.0、只调 top_p。两个一起从默认值乱拧，
        你会分不清输出的变化到底是谁造成的，调试时一团乱麻。生产中常见的安全组合是「temperature 0.7 + top_p 0.9」，但那是调好后的结果，
        不是你该一开始就同时动两个旋钮的理由。
      </p>

      <KeyIdea title="这些旋钮都在动同一件东西">
        <p>
          temperature、top_p、frequency/presence_penalty、logit_bias，看着各不相同，其实都在做同一件事：
          在采样前后<strong>重塑「下一个词」的概率分布</strong>，或限定从哪些候选里采样。
          理解了第 1 卷的「分布」视角，这一排参数就从一堆魔法数字，变成了一组你能讲清楚因果的杠杆。
        </p>
      </KeyIdea>

      <h3>一张「症状 → 旋钮」速查表</h3>
      <p>遇到输出问题，对着这张表找药方，比凭感觉乱拧高效得多：</p>
      <table>
        <thead>
          <tr><th>症状</th><th>首选旋钮</th><th>原理</th></tr>
        </thead>
        <tbody>
          <tr><td>啰嗦、说不完</td><td>max_tokens 收紧 + stop 收尾 + prompt 给简洁示范</td><td>限长 + 内容性收尾</td></tr>
          <tr><td>复读、鬼打墙</td><td>frequency_penalty 调高</td><td>按出现次数压低重复词</td></tr>
          <tr><td>翻来覆去不换话题</td><td>presence_penalty 调高</td><td>出现过就压，促新词</td></tr>
          <tr><td>跑题、太发散</td><td>temperature 或 top_p 调低</td><td>分布变尖，少采低概率词</td></tr>
          <tr><td>输出太死板、没创意</td><td>temperature 调高</td><td>分布抹平，给低概率词机会</td></tr>
          <tr><td>不守格式</td><td>structured outputs（第 4 章）</td><td>从机制上锁格式</td></tr>
          <tr><td>老蹦某个废词/口头禅</td><td>logit_bias 把它压到 -100</td><td>直接禁用该 token</td></tr>
          <tr><td>结果不可复现，难调试</td><td>temperature=0 + 固定 seed</td><td>去随机</td></tr>
        </tbody>
      </table>
      <p>
        切记<strong>一次只动一个</strong>：先固定一个 temperature=0 的可复现 baseline，再单独拧一个旋钮观察，才看得清是谁带来的变化。
      </p>

      <Callout variant="warn" title="负面指令陷阱：「不要提到 X」反而提示了 X">
        <p>
          想让模型别提某样东西，最忌在 prompt 里写「不要提到 X」——因为：
        </p>
        <ul>
          <li><strong>X 进了上下文</strong>：你一写「不要提到大象」，「大象」这个词就出现在前文里，反而抬高了相关 token 的概率。</li>
          <li><strong>负面指令易被忽略</strong>：模型对「该做什么」的遵循，普遍强于对「别做什么」的遵循。</li>
          <li>
            <strong>正确姿势</strong>：要么正面描述「应该聊什么」，把注意力引开；
            要么直接用 <code>logit_bias</code> 把相关 token 压到 <code>-100</code>，从机制上禁掉，而不是「拜托它别提」。
          </li>
        </ul>
      </Callout>

      <h2>stop 与 max_tokens：两种「停下来」</h2>
      <p>
        这两个参数都管「何时停止生成」，但性质完全不同，值得分清：
      </p>
      <ul>
        <li>
          <strong>stop 是「内容性停止」</strong>：命中某个字符串就停，是<strong>语义上的收尾</strong>。比如让它生成单条记录、遇到
          <code>\n\n</code> 或 <code>###</code> 就停，输出是「完整的一段」。停得干净、可预期。
        </li>
        <li>
          <strong>max_tokens 是「硬性截断」</strong>：到了上限不管说没说完都<strong>当场剁断</strong>。它是成本和失控的<strong>兜底闸门</strong>，
          不是收尾手段。被它截断的输出往往是「半句话」「半截 JSON」，下游要么解析失败、要么拿到残缺内容。
        </li>
      </ul>
      <p>
        正确姿势：用 stop 做<strong>正常收尾</strong>，用 max_tokens 做<strong>防失控的安全上限</strong>，并把上限设得比预期输出长一截，
        留足余量。很多「输出莫名其妙被切断」的事故，根源就是 max_tokens 设得太抠。检查响应里的 <code>finish_reason</code>——
        是 <code>stop</code>（正常）还是 <code>length</code>（被 max_tokens 截了），能帮你一眼定位。
      </p>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        Agent 流水线里，不同环节该用不同参数：需要<strong>稳定可复现</strong>的步骤（解析、决定调哪个工具、生成结构化参数）
        应把 temperature 压到 0；需要<strong>多样性</strong>的步骤（头脑风暴、self-consistency 多路采样）才调高温度。
        <code>max_tokens</code> 要按环节预算好，别让某一步把上下文撑爆或被截断。
        而真正的「禁止/强制」永远别只靠 prompt 里的祈使句——能用 <code>logit_bias</code>、
        <code>stop</code>、structured outputs 从机制上锁的，就别指望模型「自觉」。
      </p>

      <Practice title="用参数和 logit_bias 控制输出">
        <p>
          先跑 <code>params_demo.py</code>，固定其他参数、只改 temperature（0、0.7、1.3）各跑几次，
          感受随机性的变化。然后用下面的脚本，用 <code>logit_bias</code> 禁掉某个词、促进另一个词。
        </p>
        <CodeBlock lang="python" title="logit_bias_demo.py" code={logitBiasCode} />
        <p>
          练习：把一个常被复读的词的 id 设成 <code>-100</code>，看它是否真的从输出里消失；
          再对比「在 prompt 里写不要说抱歉」和「用 logit_bias 禁掉抱歉」两种做法，
          亲手验证负面指令陷阱——前者常常失效，后者从机制上生效。
        </p>
      </Practice>

      <Summary
        points={[
          'max_tokens 是硬性长度上限，设太小会截断输出（半截 JSON 会解析失败）；stop 命中即停，适合收尾。',
          'temperature 在 softmax 前缩放 logits 控随机性，top_p 是核采样砍长尾，二者一般二选一调。',
          'frequency_penalty 治复读、presence_penalty 促换话题、n 控候选数量、logit_bias 按 token id 精细促/禁。',
          '对症下药：啰嗦收 max_tokens、复读加 frequency_penalty、跑题降 temperature、不守格式上 structured outputs。',
          '负面指令陷阱：写「不要提到 X」反而把 X 带进上下文且常被忽略；改用正面引导或 logit_bias 从机制上禁掉。',
          'Agent 里按环节选参数：要稳就压温到 0、要多样才调高；真正的禁止/强制靠 logit_bias、stop、schema 锁，不靠 prompt 自觉。',
        ]}
      />
    </>
  )
}
