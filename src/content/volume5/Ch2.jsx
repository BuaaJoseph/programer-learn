import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const managerCode = `from openai import OpenAI

client = OpenAI()


class MemoryManager:
    """短期记忆：滑动窗口 + 摘要压缩；长期记忆：读写分离的存取接口。"""

    def __init__(self, window=6, summary_trigger=12):
        self.window = window               # 最近保留几条消息原文
        self.summary_trigger = summary_trigger  # 历史超过多少条就触发摘要
        self.messages = []                 # 短期：原始消息列表
        self.summary = ''                  # 短期：被压缩掉的旧对话摘要
        self.long_term = {}                # 长期：键值事实库（这里用内存字典代替向量库）

    # ---------- 短期记忆 ----------
    def add(self, role, content):
        self.messages.append({'role': role, 'content': content})
        if len(self.messages) > self.summary_trigger:
            self._compress()

    def _compress(self):
        # 把「窗口之外」的旧消息抽成一段摘要，腾出 token 预算
        old = self.messages[:-self.window]
        self.messages = self.messages[-self.window:]
        text = '\\n'.join(f"{m['role']}: {m['content']}" for m in old)
        resp = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': '把下面的对话压成要点，保留事实与决定，去掉寒暄。'},
                {'role': 'user', 'content': (self.summary + '\\n' + text).strip()},
            ],
        )
        self.summary = resp.choices[0].message.content

    # ---------- 长期记忆（读写分离） ----------
    def remember(self, key, fact):
        # 写入：把要点存库（真实系统里这里会做 embedding 再入向量库）
        self.long_term[key] = fact

    def recall(self, query):
        # 读取：按需检索（这里用朴素子串匹配代替语义检索）
        return [v for k, v in self.long_term.items() if query in k or query in v]

    # ---------- 组装最终上下文 ----------
    def build_context(self, system_prompt, recall_query=None):
        ctx = [{'role': 'system', 'content': system_prompt}]
        facts = self.recall(recall_query) if recall_query else []
        if facts:
            ctx.append({'role': 'system', 'content': '已知事实：' + '；'.join(facts)})
        if self.summary:
            ctx.append({'role': 'system', 'content': '早前对话摘要：' + self.summary})
        ctx.extend(self.messages)          # 最近窗口内的原文
        return ctx


# 用法
mem = MemoryManager(window=4, summary_trigger=8)
mem.remember('user.name', '用户叫小杜')
mem.remember('user.lang', '用户偏好 Python')
mem.add('user', '帮我写个排序函数')
mem.add('assistant', '好的，给你一个快排实现……')

ctx = mem.build_context('你是编程助手。', recall_query='user')
resp = client.chat.completions.create(model='gpt-4o-mini', messages=ctx)
print(resp.choices[0].message.content)`

export default function Ch5_2() {
  return (
    <>
      <Lead>
        <p>
          上一章说清了问题：不能把所有历史都原样重发。那到底该怎么取舍？答案是把记忆<strong>分层</strong>。
          像人一样，Agent 也有「短期记忆」（最近几轮的细节，新鲜但易逝）和「长期记忆」
          （久远但重要的事实，比如「这个用户偏好 Python」）。两层用完全不同的策略管理，
          这一章把四种短期策略、长期记忆的读写分离，以及它和 RAG 的边界一次讲透。
        </p>
      </Lead>

      <h2>短期记忆的四种策略</h2>
      <p>
        短期记忆要回答的问题是：「最近这段对话，怎么塞进有限的上下文窗口？」核心永远是一对矛盾——
        <strong>保真度</strong>（细节留得越多越好）和 <strong>token 预算</strong>（塞得越少越省）。四种主流策略，
        本质是在这条线上选不同的点：
      </p>
      <ul>
        <li>
          <strong>全量保留</strong>：一条不删，原样重发。保真度最高，但就是上一章那个 O(N²) 灾难，只适合短对话。
        </li>
        <li>
          <strong>滑动窗口</strong>：只保留最近 <code>k</code> 条消息，更早的直接丢弃。token 恒定、实现最简单，
          但代价是「窗口外」的信息彻底丢失——用户开头说的名字，聊到后面就忘了。
        </li>
        <li>
          <strong>摘要压缩</strong>：把旧对话交给模型压成一段要点，用「摘要」替代「原文」。保真度居中、token 大幅下降，
          代价是多一次 LLM 调用，且摘要本身可能丢细节或引入误差。
        </li>
        <li>
          <strong>混合</strong>：最近 <code>k</code> 条留原文（保细节），更早的滚动压成摘要（保大意）。
          这是工程上最常用的方案，兼顾了「近处清晰、远处概括」。
        </li>
      </ul>

      <Example title="同一段 20 轮对话，四种策略的差别">
        <p>
          用户第 2 轮说「我在做一个电商后台」，第 18 轮问「刚才那个项目用什么数据库好？」。
          <strong>全量保留</strong>能答（但很贵）；<strong>滑动窗口（k=6）</strong>答不上来，因为第 2 轮早被丢了；
          <strong>摘要压缩</strong>大概率能答，只要摘要里留了「电商后台」这个事实；<strong>混合</strong>同样能答，
          且最近几轮的代码细节还完整保留着。这就是为什么严肃系统几乎都选混合。
        </p>
      </Example>

      <h2>长期记忆：读写分离</h2>
      <p>
        短期记忆再怎么压，也只是「这次会话内」的事。可有些信息要跨会话、跨天甚至跨月地记住——
        用户的名字、长期偏好、过往的关键决定。把这些一直挂在上下文里既浪费又会被滑窗冲掉，
        正确做法是<strong>读写分离</strong>：
      </p>
      <p>
        <strong>写入时</strong>，从对话里<em>抽取</em>出值得长期保存的要点（「用户偏好 Python」「项目部署在 AWS」），
        存进一个外部库（键值库、数据库，或更常见的向量库）。<strong>读取时</strong>，不把整个库塞进去，
        而是根据当前问题<em>按需检索</em>出相关的几条，临时拼进上下文。写归写、读归读，库可以无限大，
        但每轮只取回最相关的一小撮。
      </p>
      <KeyIdea title="记忆系统 = 一个「该记什么 / 该取什么」的决策器">
        <p>
          把这一章的所有策略统一成一句话：记忆系统的本质，是在每一轮替模型回答两个问题——
          <strong>哪些旧内容值得带进这次上下文，哪些可以丢、可以压、可以存进库里等以后再取</strong>。
          短期策略决定「近处怎么放」，长期读写分离决定「远处怎么存与取」。模型本身一点不变，
          变聪明的是你喂给它的那段上下文。
        </p>
      </KeyIdea>

      <h2>记忆 vs RAG：别搞混</h2>
      <p>
        长期记忆的「按需检索」听起来很像下一章要讲的 RAG，技术栈也确实重叠（都可能用向量库）。但两者的<strong>内容性质不同</strong>：
      </p>
      <ul>
        <li>
          <strong>记忆</strong>存的是「关于<em>这个用户 / 这次会话</em>的事实」——名字、偏好、聊过的决定。它是个性化的、私有的、随交互动态增长的。
        </li>
        <li>
          <strong>RAG</strong>检索的是「<em>外部知识</em>」——产品文档、API 手册、法规条文。它是公共的、相对静态的、与具体用户无关的。
        </li>
      </ul>
      <Callout variant="tip" title="一句话区分">
        <p>
          记忆回答「<strong>关于你，我知道什么</strong>」；RAG 回答「<strong>关于这个世界 / 这套资料，我能查到什么</strong>」。
          一个成熟 Agent 通常两者都要：用记忆维持个性化连续性，用 RAG 接入权威知识。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        给 Agent 设计记忆，不是选「一个最好的策略」，而是搭一条<strong>流水线</strong>：最近几轮走滑动窗口保原文，
        溢出的旧对话滚动压成摘要，跨会话的关键事实抽出来写进长期库、用时再检索回来。每一层都在为下一次调用
        「攒出一段既省 token 又信息够用的上下文」。把这条流水线封装成一个 <code>MemoryManager</code>，
        业务代码就只管 <code>add()</code> 和 <code>build_context()</code>，复杂度全藏在里面。
      </p>

      <Practice title="实现一个可运行的 MemoryManager">
        <p>
          下面这个类同时实现了短期（滑动窗口 + 触发式摘要）和长期（读写分离的 <code>remember</code> /
          <code>recall</code> 接口），并用 <code>build_context()</code> 把摘要、检索到的事实、最近窗口
          三部分拼成最终发给模型的 <code>messages</code>。这里长期库用内存字典代替向量库，
          下一章会把它换成真正的语义检索。
        </p>
        <CodeBlock lang="python" title="memory_manager.py" code={managerCode} />
        <p>
          动手改两个旋钮感受取舍：把 <code>window</code> 调小，省 token 但近处细节也少了；把 <code>summary_trigger</code>
          调大，摘要触发得晚、保真度高但 token 涨得快。没有银弹，只有针对你的场景调出的那个平衡点。
        </p>
      </Practice>

      <Summary
        points={[
          '记忆要分层：短期记忆管最近几轮的细节，长期记忆管跨会话的重要事实，两层用不同策略。',
          '短期四策略——全量保留、滑动窗口、摘要压缩、混合——本质都是在「保真度 vs token 预算」上选点。',
          '混合策略（最近留原文 + 更早滚动摘要）兼顾近处清晰与远处概括，是工程上最常用的方案。',
          '长期记忆走读写分离：写入时抽取要点存库，读取时按当前问题检索出相关几条再拼进上下文。',
          '记忆 ≠ RAG：记忆存「关于用户 / 会话的事实」，RAG 检索「外部公共知识」，成熟 Agent 通常两者都用。',
          '把短期 + 长期封装成一个 MemoryManager，业务只管 add 与 build_context，复杂度全部内聚。',
        ]}
      />
    </>
  )
}
