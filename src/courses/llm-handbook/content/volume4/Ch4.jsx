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
