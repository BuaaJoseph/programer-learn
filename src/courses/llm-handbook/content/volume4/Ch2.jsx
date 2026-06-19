import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const badVsGoodCode = `# ✗ 描述含糊，模型不知道什么时候该用它
{
    'name': 'query',
    'description': '查询数据',
    'parameters': {'type': 'object', 'properties': {'q': {'type': 'string'}}},
}

# ✓ 描述把「能力边界」和「用法」都讲清楚
{
    'name': 'search_orders',
    'description': (
        '按用户 ID 查询其历史订单列表。只读，不会修改任何数据。'
        '当用户问到「我的订单 / 上次买了什么 / 订单状态」时使用。'
        '不能用于查询商品库存或物流详情。'
    ),
    'parameters': {
        'type': 'object',
        'properties': {
            'user_id': {'type': 'string', 'description': '用户唯一 ID，形如 u_12345'},
            'limit': {
                'type': 'integer',
                'description': '返回最近几条，默认 10，最多 50',
                'minimum': 1, 'maximum': 50,
            },
            'status': {
                'type': 'string',
                'description': '可选，按订单状态过滤',
                'enum': ['paid', 'shipped', 'done', 'refunded'],
            },
        },
        'required': ['user_id'],
    },
}`

const schemaCode = `# 一个只读查询工具：description 明确「何时用 / 不用于什么」
search_kb = {
    'type': 'function',
    'function': {
        'name': 'search_knowledge_base',
        'description': (
            '在公司内部知识库中做语义检索，返回最相关的若干文档片段。'
            '当用户问及产品文档、操作流程、政策规定等内部知识时使用。'
            '只读、可安全重复调用。不要用它来回答与公司无关的通用常识问题。'
        ),
        'parameters': {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': '检索关键词或自然语言问题'},
                'top_k': {
                    'type': 'integer',
                    'description': '返回片段数量，默认 5，范围 1~20',
                    'minimum': 1, 'maximum': 20,
                },
            },
            'required': ['query'],
        },
    },
}

# 一个有副作用的写入工具：description 必须警示其后果
send_refund = {
    'type': 'function',
    'function': {
        'name': 'create_refund',
        'description': (
            '为指定订单发起退款，会真实扣减商家余额，属于写操作、不可随意重试。'
            '仅在已确认订单存在且金额无误时调用。'
            '同一 idempotency_key 重复调用只会退款一次（幂等）。'
        ),
        'parameters': {
            'type': 'object',
            'properties': {
                'order_id': {'type': 'string', 'description': '订单 ID，形如 o_98765'},
                'amount_cents': {
                    'type': 'integer',
                    'description': '退款金额，单位「分」，必须为正整数且不超过订单实付金额',
                    'minimum': 1,
                },
                'idempotency_key': {
                    'type': 'string',
                    'description': '幂等键，由调用方生成的唯一字符串，用于防止重复退款',
                },
            },
            'required': ['order_id', 'amount_cents', 'idempotency_key'],
        },
    },
}`

const errorCode = `# 自解释的错误：把「错在哪 + 怎么改」直接写给模型看
def search_orders(user_id, limit=10, status=None):
    # 1) 参数校验：与 schema 呼应，是最后一道防线
    if not user_id.startswith('u_'):
        return {'error': 'invalid_user_id',
                'message': f'user_id 必须形如 u_12345，你传的是 {user_id!r}，请修正后重试'}
    if limit > 50:
        return {'error': 'limit_too_large',
                'message': f'limit 最大为 50，你填了 {limit}，已自动按 50 处理'}
    # 2) 业务异常也要翻译成模型能懂的话，而不是抛裸异常
    try:
        rows = db.query_orders(user_id, limit, status)
    except RecordNotFound:
        return {'error': 'user_not_found',
                'message': f'查无此用户 {user_id}，请先确认用户 ID 是否正确'}
    # 3) 成功：返回结构稳定、字段自解释的结果
    return {'orders': rows, 'count': len(rows)}`

export default function Ch4_2() {
  return (
    <>
      <Lead>
        <p>
          第 1 章说过，模型靠你给的工具清单来决定调什么。那份清单里每个工具的「契约」写得好不好，
          直接决定模型用得对不对。一个工具的契约有四个要素：<em>name</em>、<em>description</em>、
          <em>parameters</em>、<em>returns</em>。它们不是填表，每一项都在替模型回答一个问题。
        </p>
      </Lead>

      <h2>契约四要素，各自在回答什么</h2>
      <p>
        别把工具定义当成 API 文档来写——它的读者不是人类工程师，而是模型。模型在生成时，靠这份契约判断
        「这个工具是不是我现在需要的、参数该怎么填」。四要素分别承担不同的角色：
      </p>
      <ul>
        <li>
          <strong>name</strong>——工具的标识。要见名知意（<code>search_orders</code> 远胜 <code>query</code>），
          因为模型也会从名字里读语义。
        </li>
        <li>
          <strong>description</strong>——<strong>最重要的一项</strong>。它是模型决定「选不选这个工具」的几乎唯一依据。
          要写清楚「这个工具能做什么、什么时候该用、什么时候不该用、有无副作用」。
        </li>
        <li>
          <strong>parameters</strong>——用 <em>JSON Schema</em> 描述入参：类型、是否必填、取值范围、枚举。
          它既告诉模型怎么填，也是你做参数校验的依据。
        </li>
        <li>
          <strong>returns</strong>——工具返回什么结构。虽然多数 API 不强制声明它，但你应在 description 里
          或文档里讲清返回格式，让模型知道拿到结果后能怎么用。
        </li>
      </ul>

      <KeyIdea title="description 是模型选工具的唯一依据">
        <p>
          模型看不到你的函数实现，也看不到注释，它只能读 <strong>name 和 description</strong>。
          如果两个工具描述含糊、边界重叠，模型就会选错、或在该用工具时不用。把 description 当成
          「写给模型看的、决定它是否出手的提示词」来打磨——这是工具调用质量的第一杠杆。
        </p>
      </KeyIdea>

      <p>
        为什么 description 比参数定义更要命？因为参数填错，往往还能靠 Schema 校验拦下来、或让模型重填；但
        <strong>选错工具</strong>或<strong>该用不用</strong>，这种错误发生在更上游，校验根本拦不住。模型在生成的那一刻，
        脑子里只有这堆工具的 name 和 description，它就是凭这点文字做的决策。一个写得含糊的 description，
        相当于给模型一张模糊的地图，它当然容易走错路。所以打磨 description 的投入产出比，远高于事后写一堆纠错代码。
      </p>
      <p>
        一个实用的写法模板：description 至少包含三句话——<strong>它做什么</strong>（一句话能力概述）、
        <strong>什么时候用</strong>（触发场景，最好举几个典型问法）、<strong>什么时候不用 / 有什么副作用</strong>（边界和警示）。
        前两句帮模型「该出手时出手」，第三句帮模型「不该出手时收手」，两者同等重要。很多人只写了前两句，
        结果工具被滥用到不相干的场景。</p>

      <Example title="同一个工具，差描述 vs 好描述">
        <p>
          含糊的 <code>query / 查询数据</code> 会让模型在任何「查」的场景都想调它，参数也不知道怎么填；
          而把用途、边界、参数约束都写明的版本，模型不仅知道何时用，还知道 <code>limit</code> 最多 50、
          <code>status</code> 只有四个合法值。
        </p>
        <CodeBlock lang="python" title="bad_vs_good.py" code={badVsGoodCode} />
      </Example>

      <h2>工具一多，就有了路由问题</h2>
      <p>
        当工具只有两三个时，模型很少选错。但工具上到几十个，描述稍有重叠，模型就开始「选不准」——
        这本质是个<strong>路由问题</strong>：在一堆工具里挑对那一个。缓解办法：让每个 description 的边界互斥
        （明确写「不用于 X」）、给工具分组、必要时先用一个「分类/检索」步骤筛出候选工具子集，再交给模型选。
        工具越多，description 的措辞就越要锱铢必较。
      </p>
      <p>
        路由问题的根源在于：所有工具的 description 会一股脑塞进 context，模型要在生成时同时权衡几十段描述。这有两个代价——
        一是<strong>占 token</strong>，几十个工具的 schema 可能吃掉几千 token，每次调用都付费；二是<strong>注意力稀释</strong>，
        选项太多反而降低选对的概率，就像人面对几十个相似按钮也会犹豫。所以「把所有工具一次性全给模型」并不是越多越好。
        当工具规模上去，常见的工程做法是<strong>两阶段路由</strong>：先用一个轻量步骤（关键词匹配、向量检索，甚至一次小模型调用）
        从全量工具里筛出最相关的 5~10 个候选，再把这个子集喂给主模型去选。这既省 token 又提准确率。
      </p>
      <table>
        <thead>
          <tr><th>工具规模</th><th>推荐策略</th><th>主要风险</th></tr>
        </thead>
        <tbody>
          <tr><td>2~5 个</td><td>全部直接给模型</td><td>几乎不会选错</td></tr>
          <tr><td>5~20 个</td><td>全给，但 description 严格互斥、分组</td><td>边界重叠导致偶发选错</td></tr>
          <tr><td>20 个以上</td><td>两阶段路由，先筛候选子集</td><td>token 浪费 + 注意力稀释</td></tr>
        </tbody>
      </table>

      <Callout variant="warn" title="副作用与幂等性：写操作的命根子">
        <p>
          只读工具（查天气、搜文档）多调几次无所谓；但<strong>写操作</strong>（退款、下单、发邮件）一旦被重复调用，
          后果是真金白银。而 Agent 循环里，因为重试、因为模型反复，工具<strong>被调多次是常态</strong>。
        </p>
        <ul>
          <li>
            在 description 里<strong>明确标注副作用</strong>：「会真实扣款」「会发送邮件」，让模型谨慎对待。
          </li>
          <li>
            为写操作设计<strong>幂等键</strong>（idempotency_key）：同一个键重复调用只生效一次。
            这是抵御「重复执行」的根本手段，比在循环里小心翼翼更可靠。
          </li>
        </ul>
      </Callout>

      <h3>让工具返回「自解释的错误」</h3>
      <p>
        工具出错时，别只返回 <code>{'{error: true}'}</code> 或抛一个裸异常。模型看不到你的日志，它只能看到你回灌的
        那段文字。所以错误信息要<strong>能指导模型的下一步</strong>：说清楚错在哪、怎么改。比如参数越界，就返回
        「limit 最大为 50，你填了 100，请改小后重试」——模型读到这句，下一轮往往能自己修正（这正是第 4 章「把错误变成学习信号」的基础）。
      </p>
      <CodeBlock lang="python" title="self_explaining_errors.py" code={errorCode} />
      <p>
        注意上面这个实现里藏着三层防线：参数格式校验、业务异常翻译、稳定的成功返回结构。三层都把「机器味」的错误
        翻译成了「给模型读的人话」。一个对比鲜明的反例是直接 <code>raise ValueError('bad input')</code> 然后把堆栈
        塞回去——模型读到一坨 Python traceback，既不知道是哪个参数错了，也不知道该怎么改，多半会原样重试、陷入死循环。
        好的错误信息应当包含三件事：<strong>错误类型</strong>（机器可判断）、<strong>人话解释</strong>（模型可理解）、
        <strong>修复建议</strong>（模型可执行）。
      </p>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        工具契约是模型和你代码之间的接口，也是你能施加约束的地方。<strong>能用 JSON Schema 表达的约束就别只写在文字里</strong>
        （<code>enum</code>、<code>minimum/maximum</code>、<code>required</code> 都会实打实地降低模型填错的概率）；
        <strong>能写进 description 的边界就别让模型靠猜</strong>。一份打磨过的契约，胜过事后一堆补救代码——
        它让模型在源头就少犯错。
      </p>

      <Practice title="写两个规范的工具 schema">
        <p>
          下面给出一个只读工具（知识库检索）和一个有副作用的写操作（退款）。注意它们的差异：只读工具强调
          「可安全重复调用」，写操作强调「会扣款、靠 idempotency_key 防重」；参数都带了清晰的 description 和
          类型/范围约束。照这个模板，给你自己的业务写一两个工具。
        </p>
        <CodeBlock lang="python" title="tool_schemas.py" code={schemaCode} />
        <p>
          自检三问：① 只读 description 能让模型分清「内部知识」和「通用常识」吗？② 写操作有没有把副作用讲明白？
          ③ 每个参数是否都用 Schema 表达了能表达的约束（枚举、范围、必填）？
        </p>
      </Practice>

      <Summary
        points={[
          '工具契约四要素：name 见名知意、description 讲清用途与边界、parameters 用 JSON Schema 约束、returns 说明返回结构。',
          'description 是模型选不选这个工具的几乎唯一依据，要当成「写给模型的提示词」来打磨。',
          '工具一多就出现路由问题：靠互斥的描述、分组、先筛候选子集来缓解模型选错。',
          '写操作有副作用，且在 Agent 循环里常被重复调用：用 description 标注后果、用幂等键防重。',
          '让工具返回「自解释的错误」：说清错在哪、怎么改，模型下一轮往往能自我修正。',
          '能用 Schema 表达的约束就别只写文字，能写进 description 的边界就别让模型猜——在源头减少错误。',
        ]}
      />
    </>
  )
}
