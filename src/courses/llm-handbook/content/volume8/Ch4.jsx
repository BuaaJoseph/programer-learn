import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const treeCode = `customer_support/
├── app/
│   ├── service.py          # FastAPI 服务入口（第 3 章那套）
│   ├── orchestrator.py     # 协调器：路由 + 主循环
│   ├── llm.py              # LLM 分级调用 + tracing 包装
│   ├── tracing.py          # span/trace 工具（第 1 章那套）
│   ├── memory.py           # 短期(会话) + 长期(用户画像)记忆
│   ├── rag.py              # 知识库检索（第 5 卷）
│   ├── tools.py            # 工具层 + 退款护栏
│   └── agents/
│       ├── faq.py          # FAQ 专家 Agent
│       ├── order.py        # 订单查询专家 Agent
│       └── refund.py       # 退款专家 Agent（带护栏）
├── data/
│   └── kb/                 # 知识库文档（向量库的源）
├── tests/
│   └── test_refund_guard.py
├── .env.example            # 列出需要的环境变量名（不含真实值）
└── requirements.txt`

const llmCode = `import os
from contextlib import contextmanager
from tracing import span          # 复用第 1 章的 span 工具

API_KEY = os.environ['LLM_API_KEY']   # 密钥从环境变量读，启动即校验

TIERS = {'small': 'haiku', 'medium': 'sonnet', 'large': 'opus'}


def route_model(task: str, needs_reasoning: bool) -> str:
    # 分级路由（第 2 章）：判别类用小模型，推理类才上大模型。
    if task in ('classify', 'route', 'extract'):
        return 'small'
    return 'large' if needs_reasoning else 'medium'


def call_llm(task, messages, *, needs_reasoning=False):
    tier = route_model(task, needs_reasoning)
    # 每次 LLM 调用都自动开一个 span，记模型/token/耗时（为成本与调试服务）。
    with span(f'llm:{task}', 'llm', model=TIERS[tier]) as s:
        # resp = client.messages.create(model=TIERS[tier], messages=messages, ...)
        resp = {'text': '...', 'tokens_in': 800, 'tokens_out': 120}  # 占位
        s.attrs['tokens_in'] = resp['tokens_in']
        s.attrs['tokens_out'] = resp['tokens_out']
        return resp['text']`

const memoryCode = `import json, time

class Memory:
    def __init__(self, redis_client, db):
        self.redis = redis_client      # 短期：会话历史，带 TTL
        self.db = db                   # 长期：用户画像，持久化

    # ---- 短期记忆：当前会话，放 Redis，外置状态以支持横向扩展（第 3 章）----
    def load_session(self, session_id):
        raw = self.redis.get(f'sess:{session_id}')
        return json.loads(raw) if raw else []

    def append_turn(self, session_id, role, content):
        history = self.load_session(session_id)
        history.append({'role': role, 'content': content, 'ts': time.time()})
        history = history[-20:]        # 只留最近 20 轮，裁剪上下文控成本（第 2 章）
        self.redis.set(f'sess:{session_id}', json.dumps(history), ex=3600)

    # ---- 长期记忆：跨会话的用户画像（第 4 卷）----
    def load_profile(self, user_id):
        return self.db.get_profile(user_id) or {}

    def remember_fact(self, user_id, key, value):
        self.db.upsert_profile(user_id, {key: value})`

const ragCode = `from llm import call_llm

class KnowledgeBase:
    def __init__(self, vector_store, embedder):
        self.store = vector_store
        self.embed = embedder

    def search(self, query: str, k: int = 4):
        # 检索增强生成（第 5 卷）：把问题向量化，召回最相关的 k 段文档。
        qvec = self.embed(query)
        hits = self.store.query(qvec, top_k=k)
        return [h['text'] for h in hits]

    def answer(self, query: str):
        chunks = self.search(query)
        context = '\\n---\\n'.join(chunks)
        messages = [
            {'role': 'system',
             'content': '只依据下面资料回答，资料没提到就说不知道，不要编造。'},
            {'role': 'user', 'content': f'资料:\\n{context}\\n\\n问题: {query}'},
        ]
        # 强约束「只依据资料」是抑制幻觉的护栏（第 5、6 卷）。
        return call_llm('faq_answer', messages)`

const toolCode = `from tracing import span

class RefundError(Exception):
    pass

MAX_AUTO_REFUND = 200.0     # 自动退款上限，超过须转人工

def get_order(order_id: str) -> dict:
    with span('tool:get_order', 'tool', order_id=order_id):
        # return order_api.fetch(order_id)
        return {'id': order_id, 'amount': 150.0, 'status': 'delivered',
                'refundable': True}

def issue_refund(order_id: str, amount: float, reason: str) -> dict:
    # 退款护栏：高风险动作必须层层校验（第 6、7 卷的安全与对齐落地）。
    with span('tool:issue_refund', 'tool', order_id=order_id, amount=amount) as s:
        order = get_order(order_id)
        if not order['refundable']:
            raise RefundError('该订单不可退款')
        if amount > order['amount']:
            raise RefundError('退款金额超过订单金额')        # 防越权/防幻觉金额
        if amount > MAX_AUTO_REFUND:
            s.attrs['escalated'] = True
            return {'status': 'need_human', 'reason': '金额超限，转人工审核'}
        # result = refund_api.create(order_id, amount, reason)
        return {'status': 'refunded', 'amount': amount}`

const agentsCode = `from llm import call_llm
from rag import KnowledgeBase
from tools import get_order, issue_refund, RefundError

# 三个专家 Agent：各自只懂一件事，职责单一、便于测试与护栏（第 7 卷分工思想）。

def faq_agent(kb: KnowledgeBase, query: str) -> str:
    return kb.answer(query)                      # 走 RAG，只答知识库内的问题

def order_agent(query: str, order_id: str) -> str:
    order = get_order(order_id)
    messages = [{'role': 'user',
                 'content': f'用户问: {query}\\n订单数据: {order}\\n用自然语言回答。'}]
    return call_llm('order_reply', messages)

def refund_agent(query: str, order_id: str, amount: float) -> str:
    try:
        result = issue_refund(order_id, amount, reason=query)   # 受护栏保护
    except RefundError as e:
        return f'抱歉，无法退款：{e}'
    if result['status'] == 'need_human':
        return '您的退款金额较大，已转交人工审核，1 个工作日内联系您。'
    return f'已为订单 {order_id} 退款 {result[\"amount\"]} 元。'`

const orchestratorCode = `import json
from llm import call_llm
from memory import Memory
from rag import KnowledgeBase
from agents.faq import faq_agent
from agents.order import order_agent
from agents.refund import refund_agent
from tracing import span

def classify_intent(query: str) -> dict:
    # 用小模型做意图路由，要求结构化输出，便于程序分发（第 2 章省成本）。
    messages = [{'role': 'system',
                 'content': '把用户问题分类为 faq/order/refund，'
                            '并抽取 order_id 与 amount，输出 JSON。'},
                {'role': 'user', 'content': query}]
    raw = call_llm('route', messages)            # 小模型
    return json.loads(raw)

def handle(session_id, user_id, query, mem: Memory, kb: KnowledgeBase) -> str:
    # 协调器主循环：一个 trace 的最外层 span（第 1 章）。
    with span('handle_request', 'agent', user=user_id):
        history = mem.load_session(session_id)   # 取短期记忆（外置状态）
        intent = classify_intent(query)          # 路由

        if intent['type'] == 'faq':
            reply = faq_agent(kb, query)
        elif intent['type'] == 'order':
            reply = order_agent(query, intent['order_id'])
        elif intent['type'] == 'refund':
            reply = refund_agent(query, intent['order_id'], intent['amount'])
        else:
            reply = '抱歉，我没太理解，能再说一下吗？'

        mem.append_turn(session_id, 'user', query)
        mem.append_turn(session_id, 'assistant', reply)   # 回写短期记忆
        return reply`

const dataflowCode = `# 一条请求在系统里流动的「数据契约」长什么样
# 每一层只认上一层产出的结构，层与层之间靠契约解耦（第 7 卷思想）。

# 1) 路由层产出：结构化意图（小模型 + JSON 输出）
intent = {
    'type': 'refund',          # faq / order / refund / unknown
    'order_id': 'A1023',
    'amount': 150.0,
    'confidence': 0.92,        # 置信度低可触发「请你确认一下」的澄清话术
}

# 2) 专家层产出：统一回复契约（成败显式，便于服务层兜底）
reply = {
    'success': True,
    'text': '已为订单 A1023 退款 150 元。',
    'handled_by': 'refund_agent',
    'escalated': False,        # 是否转人工，服务层据此决定要不要建工单
}

# 3) 服务层产出：对外响应（脱敏后、不含内部字段）
response = {
    'reply': reply['text'],    # 只把对外该看的字段透出去
    'session_id': 'S-7781',
}
# 关键：内部字段（confidence/handled_by/escalated）只进 trace 和日志，
# 不透传给前端 —— 单一出口处统一收口与脱敏。`

const testCode = `# tests/test_refund_guard.py —— 高风险动作必须有测试兜底
import pytest
from app.tools import issue_refund, RefundError

def test_refund_within_limit(monkeypatch):
    # 正常路径：金额合规、订单可退 -> 成功退款
    result = issue_refund('A1023', 150.0, reason='不喜欢')
    assert result['status'] == 'refunded'
    assert result['amount'] == 150.0

def test_refund_over_auto_limit():
    # 超自动上限(200) -> 必须转人工，绝不自动放款
    result = issue_refund('A1023', 500.0, reason='太贵')
    assert result['status'] == 'need_human'

def test_refund_exceeds_order_amount():
    # 退款金额 > 订单金额 -> 拒绝（防模型算出越界/幻觉金额）
    with pytest.raises(RefundError):
        issue_refund('A1023', 99999.0, reason='薅羊毛')
# 这三条用例覆盖了护栏的三条关键分支：放行 / 升级 / 拒绝。
# 高风险动作的护栏，永远要用测试钉死，而不是靠人工每次回归。`

export default function Ch8_4() {
  return (
    <>
      <Lead>
        <p>
          走到这里，你已经手里攥着八卷的全部零件：从 next-token 预测的原理，到 prompt 工程、记忆、RAG、
          安全对齐、多 Agent 协作，再到这一卷的可观测性、成本优化与部署。这一章是终点，也是检验——
          我们把所有零件拼成一台真正能上线的机器：<strong>一个完整的多 Agent 客服系统</strong>。
          看完你会清楚地知道：之前学的每一样东西，在真实系统里到底落在哪个位置。
        </p>
      </Lead>

      <h2>系统蓝图：先看全局</h2>
      <p>
        这个客服系统要做的事：用户发来一句话，系统判断他是想问常见问题、查订单、还是要退款，
        分发给对应的<strong>专家 Agent</strong> 处理，过程中查知识库、调工具、走护栏，最后给出回复，
        全程被 trace 记录、状态外置、可横向扩展。下面是它的项目结构——每个文件对应一个职责分明的模块：
      </p>
      <CodeBlock lang="text" title="项目结构" code={treeCode} />

      <KeyIdea title="分层而非堆叠">
        <p>
          注意这套结构的核心思想：<strong>每一层只干一件事，且向上提供干净的接口</strong>。
          LLM 调用层不关心业务，工具层不关心路由，专家 Agent 不关心怎么部署。
          这种<strong>关注点分离</strong>让系统能被分别测试、分别优化、分别替换——
          这正是它从「能跑的 Demo」迈向「能维护的生产系统」的分水岭。
        </p>
      </KeyIdea>

      <h2>逐模块拆解</h2>

      <h3>1. LLM 分级与 tracing 层</h3>
      <p>
        最底层是对 LLM 的统一封装。它做两件事：按任务难度<strong>分级路由</strong>到不同档位的模型（省钱），
        以及把每次调用<strong>自动包进一个 span</strong>（可观测）。所有上层模块都通过它调模型，
        于是成本控制和埋点是<strong>框架级</strong>的，业务代码完全无感。
      </p>
      <CodeBlock lang="python" title="app/llm.py" code={llmCode} />
      <p>
        对应<strong>第 1 章</strong>（tracing）与<strong>第 2 章</strong>（分级路由）。
        生产中的坑：千万别在业务代码里直接调原始 SDK，否则埋点和路由会四处漏掉，成本和 trace 都不准。
      </p>

      <h3>2. 短期 + 长期记忆</h3>
      <p>
        会话历史（短期）放 Redis 带过期时间，且只留最近若干轮以裁剪上下文；用户画像（长期）落库持久化。
        二者都是<strong>外置状态</strong>，服务进程不存任何东西。
      </p>
      <CodeBlock lang="python" title="app/memory.py" code={memoryCode} />
      <p>
        对应<strong>第 4 卷</strong>（记忆）与<strong>第 3 章</strong>（状态外置）。坑：短期历史不裁剪，
        上下文会越滚越长，成本和延迟双双失控（第 2 章那个雪球）。
      </p>

      <h3>3. 知识库 RAG</h3>
      <p>
        FAQ 类问题不该让模型凭记忆瞎答，而要<strong>检索知识库</strong>后基于资料作答，并强约束「资料没提到就说不知道」。
      </p>
      <CodeBlock lang="python" title="app/rag.py" code={ragCode} />
      <p>
        对应<strong>第 5 卷</strong>（RAG）与<strong>第 6 卷</strong>（抑制幻觉）。坑：不加「只依据资料」的约束，
        模型会把检索到的内容和自己的记忆混着编，幻觉照样发生。
      </p>

      <h3>4. 工具层 + 退款护栏</h3>
      <p>
        查订单、发退款这些<strong>会改变真实世界状态</strong>的动作放在工具层。其中退款是高风险动作，
        必须套上<strong>护栏</strong>：校验可退款、校验金额不越界、超额自动转人工。
      </p>
      <CodeBlock lang="python" title="app/tools.py" code={toolCode} />
      <p>
        对应<strong>第 7 卷</strong>（工具与多 Agent）与<strong>第 6 卷</strong>（安全对齐落地）。坑：
        永远不要相信 LLM 算出来的金额或 ID——护栏要在<strong>代码层</strong>硬校验，而不是寄希望于 prompt 让模型「别乱来」。
      </p>

      <h3>5. 三个专家 Agent</h3>
      <p>
        FAQ、订单、退款各自一个 Agent，<strong>职责单一</strong>：FAQ 走 RAG，订单查数据后转述，退款走受护栏保护的工具。
        单一职责让每个 Agent 都能被单独测试、单独加约束。
      </p>
      <CodeBlock lang="python" title="app/agents/*.py" code={agentsCode} />
      <p>
        对应<strong>第 7 卷</strong>（多 Agent 分工）。坑：别造一个「什么都能干」的全能 Agent——
        它的 prompt 会臃肿到无法维护，护栏也无处下手。
      </p>

      <h3>6. 协调器路由循环</h3>
      <p>
        协调器是大脑：先用小模型把意图分类成 faq/order/refund，再分发给对应专家 Agent，最后回写记忆。
        整个过程是一个 trace 的最外层 span。
      </p>
      <CodeBlock lang="python" title="app/orchestrator.py" code={orchestratorCode} />
      <p>
        对应<strong>第 7 卷</strong>（协调器模式）。坑：路由用大模型是浪费——分类是判别任务，小模型足够，
        而且结构化 JSON 输出比让模型自由发挥可靠得多。
      </p>

      <h3>7. FastAPI 服务</h3>
      <p>
        最外层是第 3 章那套无状态 HTTP 服务：<code>/chat</code> 接口带超时与优雅降级，密钥从环境变量读，
        多 worker 起进程，前面挂负载均衡。它把协调器包起来对外提供服务，本身不存任何状态。
        （代码同第 3 章 <code>service.py</code>，把 <code>run_agent</code> 换成调用本章的
        <code>orchestrator.handle</code> 即可。）
      </p>

      <Example title="一条用户请求走完五步">
        <p>用户发来：「我上周买的订单 A1023 想退款，150 块。」系统这样走完全程：</p>
        <ul>
          <li><strong>路由</strong>：协调器用小模型分类，得到 <code>type=refund, order_id=A1023, amount=150</code>。</li>
          <li><strong>检索</strong>：退款这类不查知识库；若是「怎么退款」这种 FAQ 才会走 RAG 检索退款政策。</li>
          <li><strong>工具</strong>：refund_agent 调 <code>issue_refund(A1023, 150)</code>，工具内先 <code>get_order</code> 拿到订单。</li>
          <li><strong>护栏</strong>：校验订单可退、150 不超过订单金额、未超自动退款上限 200——全部通过，放行。</li>
          <li><strong>回复</strong>：返回「已为订单 A1023 退款 150 元」，回写会话记忆，整条 trace 落库。</li>
        </ul>
        <p>
          如果金额是 500（超过上限 200），第四步护栏会拦截并返回「已转人工审核」——
          高风险动作绝不让模型说了算。
        </p>
      </Example>

      <Callout variant="tip" title="先跑通最小闭环，再逐层加固">
        <p>
          别想着一口气把所有模块都做到生产级。正确的搭法是：先用占位实现把
          「路由 → 专家 Agent → 回复」这条主干跑通，确认数据流对了，再逐个模块替换成真实实现、
          逐个加上护栏、缓存、限流、熔断。<strong>每一步都有可运行的系统</strong>，比憋一个大版本可靠得多。
        </p>
      </Callout>

      <h2>八卷如何映射到这个项目</h2>
      <p>这台机器就是八卷知识的总装。逐一对照，你会看到每一卷都没有白学：</p>
      <ul>
        <li><strong>第 1 卷·原理</strong>：LLM 是按概率补全的，所以护栏不能靠「求它别乱来」，要在代码层硬校验。</li>
        <li><strong>第 2 卷·Prompt 工程</strong>：意图分类、RAG 作答的系统提示，都是结构化、带约束的 prompt。</li>
        <li><strong>第 3 卷·结构化输出与工具</strong>：路由要求 JSON 输出，工具层是模型与真实世界的接口。</li>
        <li><strong>第 4 卷·记忆</strong>：<code>memory.py</code> 的短期会话 + 长期画像。</li>
        <li><strong>第 5 卷·RAG</strong>：<code>rag.py</code> 检索知识库回答 FAQ。</li>
        <li><strong>第 6 卷·安全与对齐</strong>：「只依据资料」的抗幻觉约束、退款护栏。</li>
        <li><strong>第 7 卷·多 Agent</strong>：三个专家 Agent + 协调器路由循环。</li>
        <li><strong>第 8 卷·上线</strong>：<code>tracing.py</code> 可观测、<code>llm.py</code> 分级省成本、<code>service.py</code> 无状态可扩展部署。</li>
      </ul>

      <Practice title="把它真正搭起来">
        <p>
          按上面的项目结构建好目录，先用占位实现（返回固定字符串）把
          <code>orchestrator.handle</code> 这条主干跑通，确认「输入一句话 → 走到对应 Agent → 返回回复」
          数据流正确。然后逐个模块换真：先接真实 LLM，再接 Redis 记忆，再接向量库 RAG，
          最后给退款工具补全护栏并写 <code>test_refund_guard.py</code> 覆盖「超额转人工」「金额越界拒绝」两条路径。
        </p>
        <p>
          完成时你手里就是一个麻雀虽小五脏俱全的生产级多 Agent 系统——也是这趟八卷旅程的毕业证书。
          接下来要做的，就是把它接上你自己的真实业务，让它真正为用户干活。
        </p>
      </Practice>

      <Summary
        points={[
          '完整客服系统按职责分层：LLM/tracing 层、记忆、RAG、工具+护栏、专家 Agent、协调器、FastAPI 服务。',
          'LLM 层把分级路由（省成本）与 span 埋点（可观测）做成框架级能力，业务代码无感复用。',
          '状态全部外置（Redis 短期 + DB 长期），服务无状态，从而可横向扩展。',
          '退款等高风险动作的护栏必须在代码层硬校验金额与权限，绝不依赖 prompt 让模型自觉。',
          '协调器用小模型做结构化意图路由，分发给职责单一的专家 Agent，全程被一个 trace 串起。',
          '一条请求走路由→检索→工具→护栏→回复五步；八卷知识逐一映射到本项目的对应模块。',
        ]}
      />
    </>
  )
}
