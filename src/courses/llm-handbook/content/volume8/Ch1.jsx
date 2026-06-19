import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const tracingCode = `import time
import json
import contextvars
from contextlib import contextmanager
from dataclasses import dataclass, field

# 用 contextvar 记住「当前正在哪个 span 里」，
# 这样嵌套调用时新 span 能自动认到父亲。
_current_span = contextvars.ContextVar('current_span', default=None)


@dataclass
class Span:
    name: str
    kind: str                       # agent / tool / llm
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)
    start: float = 0.0
    end: float = 0.0
    error: str = None

    @property
    def duration_ms(self):
        return round((self.end - self.start) * 1000, 1)


@contextmanager
def span(name, kind, **attrs):
    s = Span(name=name, kind=kind, attrs=dict(attrs), start=time.perf_counter())
    parent = _current_span.get()
    if parent is not None:
        parent.children.append(s)   # 挂到父 span 下，形成树
    token = _current_span.set(s)
    try:
        yield s
    except Exception as e:
        s.error = repr(e)           # 异常也记进 span，别吞掉
        raise
    finally:
        s.end = time.perf_counter()
        _current_span.reset(token)


def redact(text):
    # PII 脱敏：上 trace 之前必须做。这里只做演示性掩码。
    import re
    text = re.sub(r'\\d{11}', '[PHONE]', text)
    text = re.sub(r'[\\w.+-]+@[\\w-]+\\.[\\w.]+', '[EMAIL]', text)
    return text


def print_tree(s, depth=0):
    pad = '  ' * depth
    flag = ' ERROR' if s.error else ''
    print(f'{pad}[{s.kind}] {s.name}  {s.duration_ms}ms{flag}')
    for k, v in s.attrs.items():
        print(f'{pad}  - {k}: {v}')
    for c in s.children:
        print_tree(c, depth + 1)


# ---- 模拟一次 Agent 请求：一个 trace 就是最外层那个 span ----
def fake_llm(prompt):
    time.sleep(0.05)
    return '北京'


def fake_tool(city):
    time.sleep(0.02)
    return {'city': city, 'temp': 26}


if __name__ == '__main__':
    user_input = '我叫张三，手机 13800001111，问下首都天气'
    with span('handle_request', 'agent', user=redact(user_input)) as root:
        with span('plan', 'llm', model='haiku', tokens_in=120, tokens_out=8):
            city = fake_llm(redact(user_input))
        with span('get_weather', 'tool', args=city):
            data = fake_tool(city)
        with span('answer', 'llm', model='sonnet', tokens_in=200, tokens_out=40):
            fake_llm(json.dumps(data, ensure_ascii=False))

    print_tree(root)`

const aggregateCode = `# 有了 span 树，聚合就是「遍历这棵树，按维度累加」
from collections import defaultdict

def walk(span):
    # 深度优先遍历，把整棵树压平成一串 span
    yield span
    for c in span.children:
        yield from walk(c)


def cost_by_model(root):
    # 按模型汇总 token，定位「钱花在哪个模型上」
    agg = defaultdict(lambda: {'in': 0, 'out': 0, 'calls': 0})
    for s in walk(root):
        if s.kind == 'llm':
            m = s.attrs.get('model', 'unknown')
            agg[m]['in'] += s.attrs.get('tokens_in', 0)
            agg[m]['out'] += s.attrs.get('tokens_out', 0)
            agg[m]['calls'] += 1
    return dict(agg)


def slowest_spans(root, top=3):
    # 按耗时排序，立刻看出延迟热点在哪一步
    spans = [s for s in walk(root) if s.children == []]   # 只看叶子
    spans.sort(key=lambda s: s.duration_ms, reverse=True)
    return [(s.name, s.duration_ms) for s in spans[:top]]


def first_error(root):
    # 一棵树里第一个报错的 span —— 调试时最先想看的东西
    for s in walk(root):
        if s.error:
            return s.name, s.error
    return None`

export default function Ch8_1() {
  return (
    <>
      <Lead>
        <p>
          一个 Agent 在生产环境里出错时，最折磨人的不是「它错了」，而是「我不知道它在哪一步、为什么错」。
          它可能调了三个工具、走了两轮 LLM、检索了五段文档，最后吐出一句莫名其妙的话。
          要把这条黑箱链路照亮，靠的就是<em>可观测性</em>（observability）——让系统的每一步内部状态，
          都能从外部观测到。本章讲清楚怎么给 Agent 装上「行车记录仪」。
        </p>
      </Lead>

      <h2>trace 与 span：把一次请求拆成一棵树</h2>
      <p>
        可观测性的基本数据结构只有两个词：<em>trace</em> 和 <em>span</em>。一次完整的用户请求是一个
        <strong>trace</strong>；这次请求里发生的每一个有意义的动作——一次 Agent 决策、一次工具调用、
        一次 LLM 请求——都是一个 <strong>span</strong>。span 之间有父子关系：协调器调 LLM 决定调哪个工具，
        工具内部又调了一次 LLM，于是这些 span 嵌套成一棵<strong>树</strong>。
      </p>
      <p>
        每个 span 至少带三样东西：名字（这步在干嘛）、起止时间（耗时）、以及一组<em>属性</em>（attributes，
        比如用了哪个模型、token 多少、输入输出是什么）。把整棵树画出来，你就能一眼看到「请求先走了规划，
        再调了天气工具，最后生成回复，其中天气工具慢了 800 毫秒」。
      </p>

      <Example title="一条 trace 长什么样">
        <p>一次「问首都天气」的请求，它的 span 树大致是这样：</p>
        <ul>
          <li><code>[agent] handle_request　310ms</code></li>
          <li>　<code>[llm] plan　120ms　model=haiku</code></li>
          <li>　<code>[tool] get_weather　85ms</code></li>
          <li>　<code>[llm] answer　105ms　model=sonnet</code></li>
        </ul>
        <p>
          缩进就是父子关系。哪一步慢、哪一步报错、哪一步烧 token，全摊在阳光下。
          这正是排查问题时你最想要的视图。
        </p>
      </Example>

      <h3>为什么是树，而不是一串日志</h3>
      <p>
        你可能会问：我打一行行带时间戳的日志不也能看吗？能，但你会丢掉最重要的信息——<strong>因果与归属</strong>。
        一串平铺的日志告诉你「11 点调了 LLM、11 点 01 调了工具」，却说不清这次工具调用是<em>哪一次</em>
        LLM 决策触发的；当并发上来，几条请求的日志交织在一起，更是彻底乱套。树结构天然回答了
        「谁触发了谁、这一步属于哪次请求」，这正是 Agent 这种嵌套调用系统的查错命门。
      </p>
      <p>
        实现上的关键技巧，是用 <code>contextvars</code> 记住「当前正处在哪个 span 里」，
        新开的 span 自动认这个为父亲。这样业务代码只管 <code>{'with span(...)'}</code>，
        父子关系自动织成树，无需手动传递 parent——这就是后面那段代码的核心机制。
      </p>

      <h3>监控 vs 可观测性：不是一回事</h3>
      <p>
        很多人把这俩混着说，但区别很关键。<em>监控</em>（monitoring）是<strong>盯着你预先定义好的指标</strong>：
        QPS、错误率、P99 延迟超没超阈值。它回答的是「系统现在健康吗」，前提是你<strong>提前知道该问什么问题</strong>。
      </p>
      <p>
        <em>可观测性</em>（observability）是<strong>能在事后追问任意问题</strong>：为什么<strong>这一条</strong>请求
        花了 12 秒？为什么<strong>这个用户</strong>触发了退款工具？监控告诉你「出事了」，可观测性让你能
        <strong>钻进单条 trace</strong> 还原现场。对 Agent 这种每条请求路径都可能不同、充满非确定性的系统，
        光有监控远远不够，必须有逐请求可回放的 trace。
      </p>

      <h3>该记哪些字段</h3>
      <p>span 里到底存什么，决定了你将来能查到什么。最低限度记全这几类：</p>
      <ul>
        <li><strong>输入与输出</strong>：这步的 prompt / 工具入参，以及返回结果。这是回放的命根子。</li>
        <li><strong>token 用量</strong>：输入 token、输出 token 分开记，直接关联到成本（下一章细讲）。</li>
        <li><strong>耗时</strong>：精确到毫秒，定位延迟热点全靠它。</li>
        <li><strong>模型与参数</strong>：用了哪个模型、temperature、是否命中缓存——便于横向对比。</li>
        <li><strong>错误</strong>：异常类型与消息。报错的 span 绝不能被静默吞掉。</li>
        <li><strong>关联键</strong>：trace_id、user_id、session_id，方便按维度聚合与串联多轮对话。</li>
      </ul>

      <h2>从一棵树到一万棵树：聚合</h2>
      <p>
        单条 trace 是用来<strong>调试个案</strong>的；当成千上万条 trace 汇到一起，它又能回答<strong>系统级</strong>
        的问题：钱主要花在哪个模型？哪一步是延迟瓶颈？哪类请求最容易报错？聚合的本质很朴素——
        <strong>遍历每棵 span 树，按你关心的维度累加</strong>。下面这几个小函数就分别回答了「成本归属」
        「延迟热点」「第一处报错」三个最高频的问题：
      </p>
      <CodeBlock lang="python" title="trace_aggregate.py" code={aggregateCode} />
      <Callout variant="info" title="一个反直觉的发现">
        <p>
          很多团队第一次跑 <code>cost_by_model</code> 都会吃一惊：以为成本大头是写作那次大模型调用，
          结果发现是<strong>分诊 / 规划那一步被反复调用</strong>，小模型单价低但次数多，累计反而最贵。
          没有聚合，你只会凭直觉去优化错的地方。<strong>先量，再优化</strong>，是下一章成本治理的前提。
        </p>
      </Callout>

      <KeyIdea title="trace 的四大用途">
        <p>把 trace 记全之后，它能同时干四件事，这也是为什么它值得投入：</p>
        <ul>
          <li><strong>调试</strong>：单条请求出问题，打开它的 trace 树，逐 span 看输入输出，五分钟定位。</li>
          <li><strong>回放</strong>：把某条线上 trace 的输入原样喂回去复现 bug，或作为回归测试样本。</li>
          <li><strong>聚合指标</strong>：成千上万条 trace 汇总，算出平均延迟、错误率、各模型调用占比。</li>
          <li><strong>定位成本与延迟热点</strong>：按 span 维度排序，立刻看出「钱花在哪个模型、时间耗在哪个工具」。</li>
        </ul>
      </KeyIdea>

      <Callout variant="warn" title="PII 脱敏是硬规则，不是可选项">
        <p>
          trace 会原样记录用户输入和模型输出，这意味着手机号、邮箱、身份证、地址会一股脑进你的日志系统。
          这些是<strong>个人身份信息</strong>（PII），在很多地区受法律严管。<strong>在写入 trace 之前</strong>
          必须做脱敏：掩码或哈希。别指望「日志反正没人看」——一旦日志泄露，脱敏与否就是合规事故和普通故障的区别。
          把脱敏做成 tracing 工具的<strong>默认入口</strong>，而不是靠每个调用点自觉。
        </p>
      </Callout>

      <Callout variant="tip" title="别把所有东西都记进 span">
        <p>
          可观测性有成本，过度埋点会反噬。常见的两个坑：一是<strong>记得太细</strong>——给每个循环变量都开 span，
          trace 树深到没法看，存储也撑爆；二是<strong>把超大 payload 原样塞进属性</strong>——
          一段 50KB 的检索原文进 span，几千条请求就把日志系统打爆。务实做法：
          对大字段只记<strong>长度 + 哈希 + 前 200 字</strong>，需要全文时按哈希去对象存储捞。
          埋点的颗粒度，跟着「将来真的会去查的问题」走。
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        Agent 是<strong>非确定性</strong>系统：同样的输入，今天走工具 A，明天可能走工具 B。传统那套
        「看不懂就加 print」在多轮多工具的场景下会彻底淹没在噪音里。所以<strong>可观测性要在第一天就内建</strong>，
        而不是出了事故再补。一个好习惯：让 tracing 成为框架级能力——每次 LLM 调用、每次工具调用都自动开一个 span，
        业务代码几乎无感。后面讲成本优化、讲部署稳定性、讲毕业项目时，所有的诊断都建立在这套 trace 之上。
      </p>

      <Practice title="用上下文管理器实现一个最小 tracing 工具">
        <p>
          下面这段代码用 Python 的 <code>contextmanager</code> 加 <code>contextvars</code> 实现了一个能自动嵌套的
          span 工具：进入 <code>with span(...)</code> 就开一个 span 并自动认父，退出时记录耗时，异常也照记。
          最后把整棵 span 树打印出来。注意 <code>redact</code> 在入树前做了脱敏。
        </p>
        <CodeBlock lang="python" title="mini_tracing.py" code={tracingCode} />
        <p>
          运行它，你会看到一棵带缩进、带耗时、带模型与 token 的 span 树。把 <code>fake_llm</code> 换成真实的
          API 调用、把属性换成真实的 token 数，这套骨架就能直接进生产——再往上接 OpenTelemetry 或专门的
          LLM 观测平台即可。
        </p>
      </Practice>

      <Summary
        points={[
          'trace = 一次请求；span = 请求里的一个动作（Agent/工具/LLM 调用），span 嵌套成一棵树。',
          '监控盯预设指标回答「系统健康吗」；可观测性支持事后追问任意问题、钻进单条请求还原现场。',
          'span 至少记全：输入输出、输入与输出 token、耗时、模型与参数、错误、trace_id/user_id 等关联键。',
          'PII 脱敏是写入 trace 之前的硬规则，应做成 tracing 工具的默认入口，避免合规事故。',
          'trace 的四大用途：调试单条请求、回放复现、聚合算指标、定位成本与延迟热点。',
          'Agent 是非确定性系统，tracing 要第一天就做成框架级能力，让业务代码无感地自动埋点。',
        ]}
      />
    </>
  )
}
