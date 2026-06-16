import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const budgetCode = `"""context_budget.py —— 按 token 预算裁剪 + 滚动摘要的上下文管理器。
依赖：pip install tiktoken openai
"""
import tiktoken
from openai import OpenAI

client = OpenAI()
enc = tiktoken.get_encoding('cl100k_base')


def count(text):
    return len(enc.encode(text))


class ContextBudget:
    def __init__(self, max_tokens=8000, reserve_output=1500, keep_recent=4):
        # 总预算里要给「输出」预留空间，剩下的才是「输入」能用的额度
        self.input_budget = max_tokens - reserve_output
        self.keep_recent = keep_recent     # 至少保留最近几条原文
        self.messages = []                 # 历史原文
        self.summary = ''                  # 滚动摘要

    def add(self, role, content):
        self.messages.append({'role': role, 'content': content})

    def _summarize(self, msgs):
        text = '\\n'.join(f"{m['role']}: {m['content']}" for m in msgs)
        resp = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': '把对话压成要点，保留事实与决定，越短越好。'},
                {'role': 'user', 'content': (self.summary + '\\n' + text).strip()},
            ],
        )
        return resp.choices[0].message.content

    def build(self, system_prompt):
        recent = self.messages[-self.keep_recent:]
        older = self.messages[:-self.keep_recent]

        # 1) 把溢出窗口的旧消息滚动压进摘要
        if older:
            self.summary = self._summarize(older)
            self.messages = recent          # 旧原文已被摘要吸收，丢弃

        # 2) 组装，并按预算从「最旧」开始裁剪
        head = [{'role': 'system', 'content': system_prompt}]
        if self.summary:
            head.append({'role': 'system', 'content': '对话摘要：' + self.summary})

        used = sum(count(m['content']) for m in head)
        kept = []
        for m in reversed(self.messages):   # 从最新往回收，预算用完即停
            c = count(m['content'])
            if used + c > self.input_budget:
                break
            used += c
            kept.append(m)
        kept.reverse()
        return head + kept, used


# 用法
ctx = ContextBudget(max_tokens=4000, reserve_output=800, keep_recent=2)
for i in range(20):
    ctx.add('user', f'第 {i} 轮的问题，内容比较长……' * 10)
    ctx.add('assistant', f'第 {i} 轮的回答，内容也不短……' * 10)

messages, used = ctx.build('你是助手。')
print(f'实际用了 {used} tokens，发送 {len(messages)} 条消息')`

const placementCode = `"""把重要资料放在「模型最容易看见的位置」——对抗 lost in the middle。
经验：开头放指令，结尾放最关键的资料，把次要资料夹在中间。"""

def build_prompt(question, chunks):
    # chunks 已按相关性从高到低排好序
    most = chunks[0]              # 最相关的一块
    rest = chunks[1:]            # 其余

    # 开头：任务指令（模型对开头敏感）
    head = '只能依据资料回答，没有就说不知道。\\n\\n'
    # 中间：次要资料（容易被忽略，放不那么关键的）
    middle = '参考资料：\\n' + '\\n'.join(f'- {c}' for c in rest)
    # 结尾：最关键资料 + 问题（模型对结尾也敏感，把答案依据放这）
    tail = (
        '\\n最重要的资料：\\n- ' + most +
        '\\n\\n问题：' + question
    )
    return head + middle + tail
# 同样几块资料，仅仅换个摆放顺序，命中率就能明显不同——
# 位置是真旋钮，不是玄学。`

export default function Ch5_5() {
  return (
    <>
      <Lead>
        <p>
          学完前几章，你手里有了滑动窗口、摘要、长期记忆、RAG 一堆工具，很容易得出一个错觉：
          <strong>把能塞的都塞进上下文，模型就答得最好。</strong>错。给得多 ≠ 给得好——多余的内容会稀释模型的注意力，
          长上下文里的关键信息还会被「读漏」。这一章讲上下文的<strong>取舍</strong>：怎么花好每一分 token 预算，
          以及让一个 Agent 能长跑几百轮不崩的组合拳。
        </p>
      </Lead>

      <h2>给得多 ≠ 给得好</h2>
      <p>
        模型的注意力是有限的资源。上下文里塞进十段资料，其中只有两段相关，剩下八段就成了<strong>噪声</strong>，
        会把模型的注意力从真正重要的地方拉走，让回答变模糊、甚至被无关内容带偏。这不是「多多益善」，
        而是「信噪比」的问题。
      </p>
      <p>
        更隐蔽的是 <em>lost in the middle</em>（中间迷失）现象：当上下文很长时，模型对<strong>开头和结尾</strong>
        的信息记得清楚，对<strong>正中间</strong>的内容则明显容易忽略。也就是说，同一段关键资料，放在中间和放在结尾，
        被模型用上的概率天差地别。所以「注入位置」是个真旋钮——重要的东西要放在模型最容易看见的地方。
      </p>
      <p>
        为什么会「中间迷失」？这和注意力机制、以及训练数据的分布都有关：文本里关键信息（标题、结论、问题）天然更常出现在段落首尾，
        模型被训练得对首尾更敏感；超长上下文里，正中间的位置在训练中见得相对少，模型对它的「检索能力」也就弱。理解成因后你就明白：这不是某个模型的缺陷，而是当前架构下的<strong>普遍倾向</strong>，长上下文越长越明显。
      </p>
      <Example title="把答案藏在中间，模型就找不到了">
        <p>
          做个实验：在一段很长的资料里埋一句关键事实（「项目截止日期是 6 月 30 日」），分别把它放在开头、正中间、结尾，
          再问模型这个日期。放开头和结尾时它答得又快又准，放正中间时它常常答错或说「资料里没提」——
          内容明明在，它就是没「读」到。这就是 lost in the middle 的直接体现。
        </p>
      </Example>
      <p>
        既然位置是真旋钮，工程上就有对应手法：把最相关的资料和当前问题放在<strong>结尾</strong>（离生成最近、最受关注），
        把任务指令放在<strong>开头</strong>，次要资料夹在中间。再配合 rerank 让最相关的块排到最前/最后，命中率能明显回升。
      </p>
      <CodeBlock lang="python" title="placement.py" code={placementCode} />

      <h2>上下文预算：先给输出留位置</h2>
      <p>
        上下文窗口是输入和输出<strong>共享</strong>的一块额度。窗口 8K，如果你把输入塞到 7.9K，
        模型就只剩 0.1K 来生成回答——话还没说完就被截断。所以做预算的第一条铁律是：
        <strong>先从总额度里扣掉给输出预留的空间，剩下的才是输入能用的</strong>。把这个减法做在最前面，
        后面所有裁剪都围绕「输入预算」展开。
      </p>
      <Callout variant="warn" title="预留输出空间是个最常被忘的坑">
        <p>
          很多「模型回答突然被截断、句子说一半」的 bug，根因就是没给输出留位置：输入把窗口占满了，
          <code>max_tokens</code> 没空间分配。尤其是要求模型输出长 JSON、长代码、长报告时，输出本身可能占好几千 token，
          预留太小必崩。规则：<strong>先估计这次输出最多要多少 token，乘个安全系数从总窗口里扣掉，再去裁输入。</strong>
        </p>
      </Callout>
      <KeyIdea title="上下文是预算，不是仓库">
        <p>
          换个心智模型：别把上下文当成「能装多少装多少」的仓库，而当成一笔<strong>有限的、要精打细算的预算</strong>。
          每放进一条内容，都要问「它配得上占的这点 token 吗？」高价值的（当前问题、最相关的资料、最近几轮）优先，
          低价值的（寒暄、远古历史、勉强相关的检索结果）该砍就砍。<strong>会花预算，比有大窗口更重要。</strong>
        </p>
      </KeyIdea>

      <h2>遗忘的五招</h2>
      <p>
        既然要砍，就得有章法。把「遗忘」拆成五种互补的手段：
      </p>
      <ul>
        <li><strong>滑窗丢弃</strong>：只留最近 <code>k</code> 条，最旧的直接扔。最便宜，但会硬丢信息。</li>
        <li><strong>摘要</strong>：把旧内容压成要点，用更少 token 保住大意。比丢弃保真，代价是一次 LLM 调用。</li>
        <li><strong>去重</strong>：删掉重复或高度相似的内容（同一份资料被多次检索回来、反复确认的同一句话）。</li>
        <li><strong>重要性打分裁剪</strong>：给每条内容打个相关性 / 重要性分，按分数从低到高裁掉，而不是单纯按时间。</li>
        <li><strong>按需检索</strong>：平时不放，把内容存进库（记忆 / RAG），只在当前问题需要时才检索回来——这是最优雅的「遗忘」。</li>
      </ul>
      <table>
        <thead>
          <tr><th>手段</th><th>成本</th><th>信息损失</th><th>最适合</th></tr>
        </thead>
        <tbody>
          <tr><td>滑窗丢弃</td><td>极低</td><td>硬丢，最重</td><td>近期信息足够用的场景</td></tr>
          <tr><td>摘要</td><td>一次 LLM 调用</td><td>丢细节、留大意</td><td>需保住早期决定</td></tr>
          <tr><td>去重</td><td>低（相似度计算）</td><td>几乎无（只删冗余）</td><td>检索/工具结果重复多</td></tr>
          <tr><td>重要性裁剪</td><td>中（要打分）</td><td>低价值内容</td><td>内容价值差异大</td></tr>
          <tr><td>按需检索</td><td>检索开销</td><td>近乎无（原文都还在库里）</td><td>知识量远大于窗口</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="别只会用滑窗">
        <p>
          滑窗最简单，所以新手最爱用，但它会粗暴地丢掉「很久以前但很重要」的信息（用户开头定的需求）。
          真实系统几乎不会单用一招——把这五招<strong>组合</strong>起来，才能既省 token 又不丢关键信息。
        </p>
      </Callout>

      <h2>组合拳：长跑 Agent 的上下文流水线</h2>
      <p>
        把前面所有东西拼成一条流水线，就是长跑 Agent 管理上下文的标准姿势：
      </p>
      <ul>
        <li><strong>滑窗</strong>保最近几轮的原文细节；</li>
        <li><strong>滚动摘要</strong>把溢出窗口的旧对话不断压进一段持续更新的摘要里；</li>
        <li><strong>按需检索</strong>从长期记忆 / RAG 里只取回与当前问题相关的几条；</li>
        <li><strong>预算裁剪</strong>在组装好之后，按 token 预算从最旧 / 最低价值的内容开始砍，确保不超额、还给输出留够空间。</li>
      </ul>
      <p>
        这套组合让上下文的 token 占用<strong>稳定在一个上限附近</strong>，不再随轮数 O(N²) 膨胀——这正是第 1 章那个成本灾难的解药。
      </p>
      <Example title="同一个长跑任务，管与不管的差别">
        <p>
          一个要连续调 200 次工具的研究型 Agent。<strong>不管上下文</strong>：每轮把所有历史和工具返回全塞回去，
          大约第 40 轮就撑爆 128K 窗口，直接报错退出；即便没爆，到后期每轮成本也涨到开头的几十倍，且答案越来越散。
          <strong>上了流水线</strong>：每轮 token 稳定在两三万，工具的大块返回被即时去重/摘要，旧步骤压进滚动摘要，
          需要时再从记忆里检索回某一步的结论——它能稳稳跑完 200 轮，成本和延迟全程平稳。差别不是「好一点」，是「能不能跑完」。
        </p>
      </Example>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        一个要跑几百轮工具调用的 Agent，如果不管上下文，要么撑爆窗口直接崩，要么被一堆陈旧噪声拖得越来越笨、越来越贵。
        上面这套「滑窗 + 滚动摘要 + 按需检索 + 预算裁剪」就是让它能<strong>长跑不退化</strong>的关键基础设施。
        把它封装成一个上下文管理器，Agent 主循环每轮调用一次 <code>build()</code>，就能始终拿到一段「预算内、信息够、噪声少」的上下文。
      </p>
      <p>
        最后提醒一条心态：上下文管理没有「调好就一劳永逸」的参数，它和你的任务强相关。要把 <code>keep_recent</code>、摘要触发阈值、检索 top-k、输出预留
        这几个旋钮当成<strong>可观测、可调</strong>的系统参数，配上日志（每轮实际用了多少 token、裁掉了什么、检索命中了什么），上线后持续根据真实表现微调。
      </p>

      <Practice title="写一个 context budget 管理器">
        <p>
          下面这个 <code>ContextBudget</code> 同时实现了「先给输出预留空间」「溢出旧消息滚动摘要」
          「按 token 预算从最旧开始裁剪」。用 <code>tiktoken</code> 真实地数 token，确保发出去的上下文不会超额。
        </p>
        <CodeBlock lang="python" title="context_budget.py" code={budgetCode} />
        <p>
          跑完看 <code>used</code>：无论你 <code>add</code> 多少轮，最终发送的 token 都被压在预算之内。
          再调小 <code>max_tokens</code>，观察它如何更激进地摘要和裁剪——这就是让 Agent 在固定成本下长跑的核心机制。
        </p>
        <p>
          进阶练习：把上面 <code>placement.py</code> 的「重要资料放结尾」融进 <code>build()</code> 的组装顺序；再加一个「重要性打分」函数，
          让裁剪不再单纯按时间从旧到新砍，而是先砍掉打分最低的内容。改完你就把这一章的五招拼成了一套真正的组合拳。
        </p>
      </Practice>

      <Summary
        points={[
          '给得多 ≠ 给得好：无关内容是噪声，会稀释模型注意力；长上下文还有 lost in the middle，中间信息易被读漏。',
          'lost in the middle 是当前架构的普遍倾向、越长越明显；对策是把最相关资料和问题放结尾、指令放开头，配 rerank。',
          '上下文窗口由输入和输出共享，做预算第一步是先扣掉给输出预留的空间——预留不足是回答被截断的常见根因。',
          '把上下文当成有限预算而非仓库：按价值排序，高价值内容优先，低价值的该砍就砍。',
          '遗忘的五招：滑窗丢弃、摘要、去重、重要性打分裁剪、按需检索，各有成本与信息损失的取舍。',
          '组合拳=滑窗保近处原文 + 滚动摘要吸收旧对话 + 按需检索取相关 + 预算裁剪兜底，token 稳定不再 O(N²) 膨胀。',
          '这套上下文流水线是长跑 Agent 不崩、不退化、成本可控的关键基础设施，且旋钮要可观测、按真实表现持续微调。',
        ]}
      />
    </>
  )
}
