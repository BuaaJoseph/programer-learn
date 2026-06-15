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
      <Example title="把答案藏在中间，模型就找不到了">
        <p>
          做个实验：在一段很长的资料里埋一句关键事实（「项目截止日期是 6 月 30 日」），分别把它放在开头、正中间、结尾，
          再问模型这个日期。放开头和结尾时它答得又快又准，放正中间时它常常答错或说「资料里没提」——
          内容明明在，它就是没「读」到。这就是 lost in the middle 的直接体现。
        </p>
      </Example>

      <h2>上下文预算：先给输出留位置</h2>
      <p>
        上下文窗口是输入和输出<strong>共享</strong>的一块额度。窗口 8K，如果你把输入塞到 7.9K，
        模型就只剩 0.1K 来生成回答——话还没说完就被截断。所以做预算的第一条铁律是：
        <strong>先从总额度里扣掉给输出预留的空间，剩下的才是输入能用的</strong>。把这个减法做在最前面，
        后面所有裁剪都围绕「输入预算」展开。
      </p>
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

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        一个要跑几百轮工具调用的 Agent，如果不管上下文，要么撑爆窗口直接崩，要么被一堆陈旧噪声拖得越来越笨、越来越贵。
        上面这套「滑窗 + 滚动摘要 + 按需检索 + 预算裁剪」就是让它能<strong>长跑不退化</strong>的关键基础设施。
        把它封装成一个上下文管理器，Agent 主循环每轮调用一次 <code>build()</code>，就能始终拿到一段「预算内、信息够、噪声少」的上下文。
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
      </Practice>

      <Summary
        points={[
          '给得多 ≠ 给得好：无关内容是噪声，会稀释模型注意力；长上下文还有 lost in the middle，中间信息易被读漏。',
          '上下文窗口由输入和输出共享，做预算第一步是先扣掉给输出预留的空间，剩下才是输入可用额度。',
          '把上下文当成有限预算而非仓库：按价值排序，高价值内容优先，低价值的该砍就砍。',
          '遗忘的五招：滑窗丢弃、摘要、去重、重要性打分裁剪、按需检索，各有保真度与成本的取舍。',
          '组合拳=滑窗保近处原文 + 滚动摘要吸收旧对话 + 按需检索取相关 + 预算裁剪兜底，token 稳定不再 O(N²) 膨胀。',
          '这套上下文流水线是长跑 Agent 不崩、不退化、成本可控的关键基础设施。',
        ]}
      />
    </>
  )
}
