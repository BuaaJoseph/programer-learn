import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const feedbackCode = `# 模型的错：把错误信息原样回灌，让它自己修正
# 比如模型把 limit 填成了 100（schema 规定最多 50）

observation = {
    'error': 'INVALID_ARGUMENT',
    'message': 'limit 最大为 50，你填的是 100。请改小后重试。',
}
# 把这条作为 tool 消息回灌，下一轮模型通常会自己改成 50
messages.append({
    'role': 'tool',
    'tool_call_id': call.id,
    'content': json.dumps(observation, ensure_ascii=False),
})`

const safeCallCode = `import time
import random
from jsonschema import validate, ValidationError

# 可重试的「环境错误」——超时、限流、5xx 这类瞬时故障
class RetryableError(Exception):
    pass

def safe_call(fn, args, schema, *, timeout=10, max_retries=3):
    '''统一的工具执行封装：校验 → 超时 → 指数退避重试 → 兜底。'''

    # ① 参数校验：模型填的参数先按 JSON Schema 验一遍
    try:
        validate(instance=args, schema=schema)
    except ValidationError as e:
        # 模型的错：返回自解释错误，交给上层回灌让模型自我修正（不重试）
        return {'ok': False, 'kind': 'model_error', 'message': f'参数不合法：{e.message}'}

    # ② 重试上限：最多尝试 max_retries 次
    for attempt in range(max_retries):
        try:
            # ③ 超时：给单次执行设上限，别让一次卡死拖垮整个 Agent
            result = fn(args, timeout=timeout)
            return {'ok': True, 'data': result}

        except RetryableError as e:
            # 环境的错：指数退避后重试。退避时间 = base * 2**attempt + 抖动
            if attempt == max_retries - 1:
                break
            backoff = (0.5 * (2 ** attempt)) + random.uniform(0, 0.3)
            time.sleep(backoff)

        except Exception as e:
            # 不可重试的硬错误：立刻停，别白白重试
            return {'ok': False, 'kind': 'fatal', 'message': str(e)}

    # ④ 兜底降级：重试都用完仍失败，返回一个安全的降级结果
    return {'ok': False, 'kind': 'degraded', 'message': '工具暂不可用，已降级，请稍后再试或换方案'}`

const circuitCode = `import time

class CircuitBreaker:
    '''熔断器：一个依赖连续失败到一定次数，就「跳闸」一段时间，
    期间直接快速失败，不再徒劳调用 —— 避免雪崩，也省 token 和延迟。'''
    def __init__(self, fail_threshold=5, cooldown=30):
        self.fail_threshold = fail_threshold
        self.cooldown = cooldown
        self.fails = 0
        self.open_until = 0.0          # 跳闸状态的截止时间

    def allow(self):
        # 在冷却期内：拒绝调用，快速失败
        if time.time() < self.open_until:
            return False
        return True

    def record(self, ok):
        if ok:
            self.fails = 0             # 成功一次就清零，闸门恢复
        else:
            self.fails += 1
            if self.fails >= self.fail_threshold:
                self.open_until = time.time() + self.cooldown   # 跳闸

# 用法：调用前先 allow()，调用后 record(成功与否)
breaker = CircuitBreaker()
def guarded_call(fn, args):
    if not breaker.allow():
        return {'ok': False, 'kind': 'degraded', 'message': '该依赖暂时熔断，已跳过'}
    res = safe_call(fn, args, schema={})
    breaker.record(res['ok'])
    return res`

const observeCode = `import logging, time, uuid

log = logging.getLogger('agent')

def traced_tool(name, fn):
    '''给每次工具调用打结构化日志：可观测性是排障的前提。
    没有 trace，线上出问题你连「哪一步、为什么失败」都无从查起。'''
    def wrapper(args):
        trace_id = uuid.uuid4().hex[:8]
        t0 = time.time()
        log.info('tool_start', extra={'trace': trace_id, 'tool': name, 'args': args})
        try:
            res = fn(args)
            log.info('tool_ok', extra={
                'trace': trace_id, 'tool': name,
                'ms': int((time.time() - t0) * 1000),
            })
            return res
        except Exception as e:
            log.error('tool_fail', extra={
                'trace': trace_id, 'tool': name, 'err': str(e),
                'ms': int((time.time() - t0) * 1000),
            })
            raise
    return wrapper`

export default function Ch4_4() {
  return (
    <>
      <Lead>
        <p>
          只要工具接上了真实世界，出错就是常态而非意外：网络会超时，接口会限流，服务会返回 5xx，
          模型也会把参数填错。Agent 能不能上线，很大程度上看你怎么处理这些错。关键的第一步，是分清两类完全不同的错——
          <strong>模型的错</strong>和<strong>环境的错</strong>，因为它们的应对方式正好相反。
        </p>
      </Lead>

      <h2>两类错，两套打法</h2>
      <p>
        把所有错误一视同仁地「重试」是新手最常见的误区。错误得先分类：
      </p>
      <ul>
        <li>
          <strong>① 模型的错</strong>——参数填错了、值越界、调错了工具、甚至调了不存在的工具。
          这类错<strong>重试一万遍也是同样的错</strong>，因为问题出在模型的决策上。正确做法是把
          <strong>自解释的错误信息回灌</strong>给模型，让它在下一轮自我修正。
        </li>
        <li>
          <strong>② 环境的错</strong>——超时、限流（429）、服务端 5xx 这类<strong>瞬时故障</strong>。
          它和模型决策无关，参数本身没问题，只是「这次没成」。正确做法是<strong>原地重试</strong>，
          而且要用<em>指数退避</em>（exponential backoff），别一窝蜂猛打。
        </li>
      </ul>
      <p>
        为什么这个区分如此关键？因为<strong>用错打法的代价是对称放大的</strong>。把模型的错当环境的错去重试，会陷入死循环：
        模型每次都填同样的越界参数，你每次都重试、每次都失败，白白烧 token 还卡住任务。反过来，把环境的错当模型的错去回灌，
        模型会一脸茫然——它根本修不了别人服务器的 503，只能瞎改参数或干脆放弃。所以分类不是洁癖，而是<strong>决定 Agent 能否自愈</strong>的分水岭。
      </p>
      <table>
        <thead>
          <tr><th></th><th>模型的错</th><th>环境的错</th></tr>
        </thead>
        <tbody>
          <tr><td>典型表现</td><td>参数越界、调错/调不存在的工具</td><td>超时、429 限流、5xx</td></tr>
          <tr><td>根因</td><td>模型的决策</td><td>下游服务的瞬时状态</td></tr>
          <tr><td>重试有用吗</td><td>无用，结果一样</td><td>有用，下次可能就成</td></tr>
          <tr><td>正确打法</td><td>回灌自解释错误，让模型自改</td><td>指数退避 + 抖动，原地重试</td></tr>
          <tr><td>用错的后果</td><td>当环境错重试 → 死循环烧钱</td><td>当模型错回灌 → 模型茫然乱改</td></tr>
        </tbody>
      </table>
      <p>
        实践中还有第三类容易被忽略：<strong>下游持续不可用</strong>——不是抖动，而是真的挂了。这时一味退避重试反而拖慢一切。
        正确的应对是<strong>熔断</strong>（circuit breaker）：某个依赖连续失败到阈值就「跳闸」，一段时间内直接快速失败、不再尝试，
        等冷却期过了再放行试探。它把「瞬时故障重试」和「持续故障躲开」区分开，避免一个挂掉的依赖拖垮整条链路。
      </p>
      <CodeBlock lang="python" title="circuit_breaker.py" code={circuitCode} />

      <Example title="同样是“失败”，处理方式南辕北辙">
        <p>
          模型把 <code>limit</code> 填成 100（schema 上限 50）：这是模型的错。你重试也没用——它还会填 100。
          应该回灌「limit 最大 50，你填了 100，请改小」，下一轮它就改对了。
        </p>
        <CodeBlock lang="python" title="feedback.py" code={feedbackCode} />
        <p>
          而调用天气 API 时收到 503：这是环境的错，参数没问题，纯属服务抖动。直接回灌错误给模型毫无意义
          （它也修不了别人的服务器），应该在你的代码里等一会儿再重试。
        </p>
      </Example>

      <KeyIdea title="指数退避：失败后等得越来越久">
        <p>
          瞬时故障常常是「大家同时重试把服务又压垮了」。<em>指数退避</em>的思路是：第 1 次失败等 0.5 秒，
          第 2 次等 1 秒，第 3 次等 2 秒……等待时间随失败次数<strong>指数增长</strong>，给下游喘息的机会。
          再叠加一点随机<strong>抖动</strong>（jitter），避免所有客户端卡在同一节拍上同时重试。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="上线五件套，少一件都可能出事">
        <p>把工具接进生产，这五样是底线：</p>
        <ul>
          <li><strong>参数校验</strong>——执行前用 JSON Schema 验一遍，挡住模型填的非法参数。</li>
          <li><strong>重试上限</strong>——max_retries，重试不能无限，否则一个挂掉的依赖会拖垮整条链路。</li>
          <li><strong>幂等</strong>——写操作配幂等键，保证重试不会重复扣款、重复下单（见第 2 章）。</li>
          <li><strong>超时</strong>——单次调用设 timeout，别让一个卡住的请求把整个 Agent 阻塞住。</li>
          <li><strong>兜底降级</strong>——重试都用尽仍失败时，返回一个安全的降级结果，而不是让程序崩溃。</li>
        </ul>
      </Callout>

      <h3>把错误变成学习信号</h3>
      <p>
        模型的错其实是个机会。只要你的工具返回的错误是<strong>自解释</strong>的——说清「错在哪、期望是什么、怎么改」——
        模型在下一轮往往能自己纠正过来。这等于把一次失败转化成了一条<strong>免费的纠错提示</strong>。
        反过来，如果你只返回 <code>{'{error: true}'}</code> 或一个裸异常栈，模型读不出有用信息，只能瞎猜或反复犯同样的错。
        好的错误信息，是 Agent 自我修复能力的燃料。
      </p>

      <Callout variant="info" title="可观测性：出事后你能查到吗">
        <p>
          容错让 Agent 不崩，但崩没崩之外，你还得知道<strong>它每一步到底干了什么</strong>。Agent 是非确定性的——同一个问题
          两次跑可能走不同路径，线上出问题时如果没有日志，你连复现都做不到。所以每次工具调用都该打一条结构化日志：
          带上 trace id（串起一次任务的所有步骤）、工具名、参数、耗时、成功与否。这点投入在排障时会成倍回报：
          没有 trace，「Agent 偶尔答错」这种 bug 你根本无从下手。
        </p>
        <CodeBlock lang="python" title="traced_tool.py" code={observeCode} />
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        别把容错逻辑散落在每个工具里——抽一个<strong>统一的执行封装</strong>（下面的 <code>safe_call</code>），
        让所有工具调用都先过这一层：校验、超时、重试、兜底一气呵成。这样新增工具时，你只管写业务逻辑，
        容错由封装统一保证。一个健壮的 Agent，<strong>稳定性几乎全靠这层封装撑着</strong>，而不是靠模型不出错。
      </p>

      <Practice title="写一个 safe_call 封装">
        <p>
          下面把上线五件套里能在调用层做的都揉进了一个 <code>safe_call</code>：先做参数校验（不合法直接返回模型可读的错误，
          不重试）；执行时带超时；遇到可重试的环境错误就指数退避 + 抖动重试；超过上限则降级兜底；遇到硬错误立即停止。
        </p>
        <CodeBlock lang="python" title="safe_call.py" code={safeCallCode} />
        <p>
          把它接到第 3 章的 ReAct 循环里：<code>model_error</code> 和 <code>degraded</code> 的结果都作为观察回灌给模型，
          让它要么修正参数、要么换个方案。跑几次故意触发超时和越界，看看 Agent 是不是还能稳稳地走完。
        </p>
        <p>
          进阶练习：在 <code>safe_call</code> 外面再包一层熔断器，模拟一个「连续返回 503」的工具，观察熔断器跳闸后
          调用是如何被快速短路掉、不再徒劳重试的；再给每次调用加上结构化日志，事后用同一个 trace id 把一次任务的
          完整轨迹串起来看。这两样——熔断和可观测——是 demo 级 Agent 和生产级 Agent 之间真正的分水岭。
        </p>
      </Practice>

      <Summary
        points={[
          '出错是接入真实世界的常态，先分两类：模型的错 vs 环境的错，二者应对方式相反。',
          '模型的错（参数越界、调错工具）重试无用，要把自解释的错误回灌，让模型下一轮自我修正。',
          '环境的错（超时、限流、5xx）是瞬时故障，要用指数退避 + 抖动原地重试。',
          '上线五件套：参数校验、重试上限、幂等、超时、兜底降级，少一件都可能出事。',
          '把错误变成学习信号：自解释的错误信息是 Agent 自我修复的燃料，别只返回裸异常。',
          '抽一个统一的 safe_call 执行封装承载所有容错，Agent 的稳定性主要靠这层撑着。',
        ]}
      />
    </>
  )
}
