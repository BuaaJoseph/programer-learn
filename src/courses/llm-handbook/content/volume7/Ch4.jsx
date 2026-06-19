import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const systemCode = `# 最小三人团队：协调器 + 检索专家 + 写作专家
# 把前三章的原则全用上：路由四拍、单一出口、result 契约、显式错误、轮数上限。
from dataclasses import dataclass, field, asdict
from typing import Any
from anthropic import Anthropic

client = Anthropic()


# ---------- 第三章的契约：统一 result ----------
@dataclass
class AgentResult:
    success: bool
    data: Any = None
    reason: str = ''
    meta: dict = field(default_factory=dict)

    def to_dict(self):
        return asdict(self)


def ok(data, **meta):
    return AgentResult(success=True, data=data, meta=meta)


def fail(reason, **meta):
    return AgentResult(success=False, reason=reason, meta=meta)


# ---------- 专家一：检索专家 ----------
def retriever_agent(query):
    # 真实项目里这里会调向量库 / 搜索 API；这里用占位语料演示。
    corpus = {
        'rag': '检索增强生成（RAG）= 先检索相关文档，再让模型基于文档作答。',
        'agent': 'Agent = 在一个循环里反复「思考-调用工具-观察」，直到完成目标。',
    }
    hits = [v for k, v in corpus.items() if k in query.lower()]
    if not hits:
        return fail('未检索到相关资料', query=query)
    return ok({'docs': hits}, source='corpus', count=len(hits))


# ---------- 专家二：写作专家 ----------
def writer_agent(query, retrieval):
    if not retrieval.success:
        return fail('上游检索失败，写作中止：' + retrieval.reason)
    docs = '\\n'.join('- ' + d for d in retrieval.data['docs'])
    resp = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=400,
        system='你是写作专家。只依据给定资料作答，不要编造资料以外的内容。',
        messages=[{
            'role': 'user',
            'content': '问题：' + query + '\\n资料：\\n' + docs,
        }],
    )
    return ok({'article': resp.content[0].text})


# ---------- 分诊：便宜小模型 + 温度 0 ----------
def classify(query):
    resp = client.messages.create(
        model='claude-haiku-4-5',
        max_tokens=10,
        temperature=0,
        system='判断该问题是否需要查资料后撰写。只回 need_write 或 chitchat。',
        messages=[{'role': 'user', 'content': query}],
    )
    label = resp.content[0].text.strip()
    return label if label in ('need_write', 'chitchat') else 'need_write'


# ---------- 协调器：路由四拍 + 主循环（ReAct 的心脏）+ 单一出口 ----------
MAX_TURNS = 5   # 上线必备：轮数上限，防止打转烧钱

def coordinator(query):
    route = classify(query)                       # 四拍：理解 + 选 Agent
    if route == 'chitchat':
        return {'success': True, 'answer': '你好，有什么可以帮你？', 'route': route}

    state = {'query': query}
    for turn in range(MAX_TURNS):                 # while 循环就是 ReAct 的心脏
        try:
            if 'retrieval' not in state:          # 第一步：检索
                state['retrieval'] = retriever_agent(query)
                if not state['retrieval'].success:
                    # 显式失败：单一出口统一返回，不静默
                    return {'success': False,
                            'reason': state['retrieval'].reason,
                            'route': route}
                continue
            # 第二步：写作（拿检索结果交接过来）
            written = writer_agent(query, state['retrieval'])
            if not written.success:
                return {'success': False, 'reason': written.reason, 'route': route}
            # 单一出口：所有路径最终从这里收口成一种结构
            return {'success': True,
                    'answer': written.data['article'],
                    'route': route,
                    'turns': turn + 1}
        except Exception as e:                    # 上线必备：异常处理，别让循环崩掉
            return {'success': False, 'reason': 'internal error: ' + str(e)}

    return {'success': False, 'reason': '超出最大轮数仍未完成'}


if __name__ == '__main__':
    print(coordinator('帮我讲讲什么是 RAG'))`

const reviewerCode = `# 扩展：加一个审校专家，把 pipeline 升级成 evaluator-optimizer
def reviewer_agent(query, article):
    resp = client.messages.create(
        model='claude-haiku-4-5',     # 审校是判断题，小模型 + 温度 0 够用
        max_tokens=200,
        temperature=0,
        system=('你是审校。判断这段回答是否「只依据资料、无编造、答到了问题」。'
                '通过回 PASS；否则回 FAIL: 后跟一句具体修改意见。'),
        messages=[{'role': 'user',
                   'content': '问题：' + query + '\\n回答：' + article}],
    )
    text = resp.content[0].text.strip()
    if text.startswith('PASS'):
        return ok({'passed': True})
    return ok({'passed': False, 'notes': text[5:].strip()})


# 协调器主循环里多走一拍：写 -> 审 -> 不过则带着意见重写
def coordinator_with_review(query, max_rewrites=2):
    retrieval = retriever_agent(query)
    if not retrieval.success:
        return {'success': False, 'reason': retrieval.reason}

    feedback = ''
    for attempt in range(max_rewrites + 1):
        written = writer_agent(query, retrieval)   # 真实现里把 feedback 拼进 prompt
        if not written.success:
            return {'success': False, 'reason': written.reason}
        verdict = reviewer_agent(query, written.data['article'])
        if verdict.data['passed']:
            return {'success': True,
                    'answer': written.data['article'],
                    'rewrites': attempt}            # 几轮才过，留痕可观测
        feedback = verdict.data['notes']            # 带着意见进下一轮
    # 重写到上限仍不过：显式收口，绝不死循环
    return {'success': True,
            'answer': written.data['article'],
            'warning': '达重写上限，未完全通过审校'}`

export default function Ch7_4() {
  return (
    <>
      <Lead>
        <p>
          理论讲够了，这一章动手搭。我们用前三章的全部原则——路由四拍、单一出口、result 契约、显式错误——
          组一个能跑通的<strong>最小三人团队</strong>：一个协调器，加两个专家（检索 + 写作）。
          代码不长，但麻雀虽小五脏俱全，把它吃透，你就握住了多 Agent 系统的骨架。
        </p>
      </Lead>

      <h2>最小三人团队的结构</h2>
      <p>
        三个角色，各司其职：
      </p>
      <ul>
        <li><strong>检索专家</strong>——只负责找资料，按 result 契约返回结构化文档，找不到就显式失败。</li>
        <li><strong>写作专家</strong>——只负责基于资料写正文，先校验输入契约，再动笔。</li>
        <li><strong>协调器</strong>——跑路由四拍，串起两个专家，并守住唯一出口。</li>
      </ul>

      <KeyIdea title="while 循环就是 ReAct 的心脏">
        <p>
          协调器里那个 <code>for</code>/<code>while</code> 循环，不是普通的流程控制——它就是
          <em>ReAct</em>（Reasoning + Acting）的心脏：每一轮「看当前状态 → 决定下一步动作 → 执行 → 把结果写回状态」，
          循环往复直到任务完成或触发退出条件。多 Agent 系统的协调器，本质就是一个
          <strong>在循环里反复决策「该轮到哪个 Agent 了」的调度器</strong>。理解了这点，
          你会发现单 Agent 和多 Agent 共用同一颗心脏，区别只在循环体里调的是工具还是子 Agent。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="上线前必须补的两件事">
        <p>能跑的 demo 和能上线的系统之间，至少隔着这两道闸门：</p>
        <ul>
          <li>
            <strong>轮数上限</strong>——给主循环设 <code>MAX_TURNS</code>。Agent 之间可能互相推诿、原地打转，
            没有上限，一个卡住的循环能把你的账单烧穿。
          </li>
          <li>
            <strong>异常处理</strong>——任何一个专家、任何一次模型调用都可能抛错。用
            <code>try/except</code> 把循环体兜住，转成契约里的 <code>success: false</code> 从单一出口返回，
            而不是让整个系统崩在半路。
          </li>
        </ul>
      </Callout>

      <h2>为什么把状态放在 state 字典里</h2>
      <p>
        注意协调器没有把检索结果、写作结果当成局部变量随手用，而是统一塞进一个 <code>state</code> 字典。
        这不是啰嗦——它是多 Agent 系统能<strong>可观测、可恢复、可调试</strong>的前提。把每一拍的产物都落进
        state，你就随时能回答三个关键问题：现在跑到哪一步了？上一步产出了什么？如果在这里崩了，
        我能不能从 state 续跑而不必从头再来？
      </p>
      <p>
        这也是单 Agent 和多 Agent 的一个分水岭。单 Agent 的「状态」就是那段对话历史，模型自己记着；
        多 Agent 里没有一段统一的对话，<strong>state 字典就是这个系统的「短期记忆」</strong>，
        由协调器显式持有和推进。把它设计好，等于给系统装了一块仪表盘。
      </p>

      <h2>分诊用便宜小模型</h2>
      <p>
        协调器开头那一步「这条请求该怎么走」，是个轻量分类任务，<strong>不该用最贵的大模型去做</strong>。
        用一个便宜的小模型（如 <code>claude-haiku-4-5</code>）配上<em>低温度</em>（温度拉到 0，让分类稳定可复现）就够了。
        把贵模型的算力省给真正需要推理和生成的写作专家。这是多 Agent 省成本的一个常用技巧：
        <strong>按任务难度匹配模型档位</strong>，而不是全程一个大模型到底。
      </p>
      <table>
        <thead>
          <tr>
            <th>环节</th>
            <th>任务性质</th>
            <th>建议档位</th>
            <th>温度</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>分诊 / 路由</td>
            <td>短分类</td>
            <td>小模型（haiku）</td>
            <td>0</td>
          </tr>
          <tr>
            <td>审校 / 判断</td>
            <td>是非判断</td>
            <td>小模型</td>
            <td>0</td>
          </tr>
          <tr>
            <td>写作 / 推理</td>
            <td>开放生成</td>
            <td>大模型（sonnet）</td>
            <td>0.3~0.7</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="info" title="为什么分类要温度 0">
        <p>
          分诊和审校这类「应该有唯一正确答案」的任务，你要的是<strong>可复现</strong>：同样的输入永远走同样的路。
          温度一高，同一个问题今天判 need_write、明天判 chitchat，整个系统的行为就变得无法测试。
          而写作这类创造性任务，适度的温度反而让产出更自然——温度不是越低越好，而是<strong>跟着任务性质走</strong>。
        </p>
      </Callout>

      <Example title="走通一条请求的完整调用树">
        <p>用户问「帮我讲讲什么是 RAG」，系统内部会这样跑：</p>
        <ul>
          <li><code>coordinator()</code> 收到请求，调 <code>classify()</code> →（小模型，温度 0）判定 need_write。</li>
          <li>进主循环第 1 轮：状态里还没有检索结果，调 <code>retriever_agent()</code> → 命中语料，返回 <code>success=true</code> 的结构化文档。</li>
          <li>主循环第 2 轮：把检索 result 交接给 <code>writer_agent()</code> →（大模型）基于资料生成正文。</li>
          <li>写作成功，从协调器<strong>单一出口</strong>收口成 <code>{'{ success, answer, route, turns }'}</code> 返回。</li>
        </ul>
        <p>
          一条请求，三个角色接力，每一步的成败都显式可见。任意环节失败，都会从同一个出口带着
          <code>reason</code> 返回，你能立刻定位是检索还是写作出的问题。
        </p>
      </Example>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        这套三人团队就是一个<strong>可生长的种子</strong>。要扩成评估-优化，就在写作后面再挂一个审校专家，
        让它返回「通过 / 打回 + 意见」，不通过就回到循环重写；要扩成更多专家，
        只需按同一份 result 契约接进来、在协调器里加一条分发分支。骨架不变，长出的全是新枝。
        到了第 8 卷的毕业项目，你会把这颗种子养成一个真正端到端的多 Agent 系统——
        加上记忆、加上更丰富的工具、加上可观测性和评估，而它的内核，仍然是这一章你亲手搭起来的这个循环。
      </p>

      <Practice title="完整可跑的最小三 Agent 系统">
        <p>
          下面是协调器 + 检索专家 + 写作专家 + 主循环的完整代码。它把本卷四章的原则全用上了：
          路由四拍、单一出口、result 契约、显式错误、轮数上限、异常兜底、分诊用小模型。
          填上你的 API Key 即可运行，把检索专家的占位语料换成真实检索，就是一个能用的雏形。
        </p>
        <CodeBlock lang="python" title="mini_multi_agent.py" code={systemCode} />
        <p>
          动手扩一扩：在 <code>writer_agent</code> 后面加一个 <code>reviewer_agent</code>，
          让协调器在主循环里多走一拍「写 → 审 → 不过则重写」，亲手把它从 pipeline 升级成 evaluator-optimizer。
          这一步走通，你就为第 8 卷的毕业项目热好身了。
        </p>
        <p>
          下面就是这个扩展的参考实现——审校用小模型做是非判断，不过就带着意见回炉重写，
          重写有上限、到顶也显式收口，绝不死循环：
        </p>
        <CodeBlock lang="python" title="add_reviewer.py" code={reviewerCode} />
      </Practice>

      <Callout variant="warn" title="搭多 Agent 最常见的三个翻车点">
        <ul>
          <li>
            <strong>忘了轮数 / 重写上限</strong>——只要循环里有「不达标就重来」，就必须有上限。
            两个 Agent 互相不满意能把账单跑穿。
          </li>
          <li>
            <strong>异常没兜住</strong>——一次模型超时、一次 JSON 解析失败，没有 <code>try/except</code>
            就会让整条链路崩在半路，用户看到的是 500 而不是降级回复。
          </li>
          <li>
            <strong>多个出口</strong>——图省事在某个专家内部直接 return 给用户，绕过了协调器出口。
            一旦这么干，统一兜底、打点、脱敏全部失效，系统很快退化成意大利面。
          </li>
        </ul>
      </Callout>

      <Summary
        points={[
          '最小多 Agent 系统 = 协调器 + 两个专家（检索 + 写作），各按 result 契约收发，协调器守唯一出口。',
          'while/for 主循环就是 ReAct 的心脏：看状态 → 决定下一步调谁 → 执行 → 写回状态，循环到完成或退出。',
          '上线必补两件事：轮数上限（防打转烧钱）和异常处理（转成 success:false 从单一出口返回，不崩在半路）。',
          '分诊用便宜小模型 + 温度 0：按任务难度匹配模型档位，把贵模型省给真正要推理生成的环节。',
          '一条请求的调用树清晰可追：分诊 → 检索 → 写作 → 单一出口收口，任意环节失败都带 reason 可定位。',
          '这套三人团队是可生长的种子，加审校即升级为 evaluator-optimizer，直通第 8 卷毕业项目。',
        ]}
      />
    </>
  )
}
