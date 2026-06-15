import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const contractCode = `# Agent 之间的消息契约：一个结构化、自包含的 result 对象
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class AgentResult:
    success: bool                    # 成败必须显式，不靠「返回空」来暗示
    data: Any = None                 # 成功时的结构化产出（自包含，下游能直接用）
    reason: str = ''                 # 失败时说清为什么，方便上游决策与排查
    meta: dict = field(default_factory=dict)   # 来源、耗时、token 等可选信息

    def to_dict(self):
        return asdict(self)


def ok(data, **meta):
    return AgentResult(success=True, data=data, meta=meta)


def fail(reason, **meta):
    # 显式上报失败，绝不静默吞掉
    return AgentResult(success=False, reason=reason, meta=meta)


# --- 检索专家：按契约返回 ---
def retriever(query):
    docs = search_docs(query)
    if not docs:
        return fail('未检索到任何相关文档', query=query)
    return ok({'docs': docs}, source='kb', count=len(docs))


# --- 写作专家：先验输入契约，再干活 ---
def writer(prev):
    if not prev.success:
        # 上游失败就显式向上传播，不要拿着空数据硬写
        return fail('上游检索失败，写作中止：' + prev.reason)
    docs = prev.data['docs']
    article = compose(docs)
    return ok({'article': article}, words=len(article))


# --- 交接（handoff）：把检索结果直接喂给写作 ---
def handoff_demo(query):
    r = retriever(query)
    w = writer(r)          # 契约统一，交接就是「上一个的 result 传给下一个」
    return w.to_dict()


# 占位实现，便于本文件独立演示
def search_docs(q):
    return [{'title': 'RAG 入门', 'text': '检索增强生成的基本思路……'}]

def compose(docs):
    return '基于 ' + str(len(docs)) + ' 篇资料写成的正文……'


if __name__ == '__main__':
    print(handoff_demo('什么是 RAG'))`

export default function Ch7_3() {
  return (
    <>
      <Lead>
        <p>
          把 Agent 拆开之后，新问题立刻浮现：它们之间怎么交换信息？是直接相互调用，还是各自往一块公共区域读写，
          还是经由一条总线广播？这章先讲三种通信机制，但真正的重点不在「传给谁」，而在
          <strong>「传什么」</strong>——传错了内容，再优雅的机制也救不回来。
        </p>
      </Lead>

      <h2>三种通信机制</h2>

      <h3>agent-as-tool（把子 Agent 当工具调用 / 交接 handoff）</h3>
      <p>
        最直接的一种：把一个子 Agent 包装成普通工具，主 Agent 像调用 <code>search()</code> 一样调用它，
        拿到返回值继续往下走。当主 Agent 不只是调用、而是把整个对话<strong>移交</strong>给另一个 Agent 接管时，
        这种特殊形式叫<em>handoff</em>（交接）——常见于客服从「通用助手」交接给「人工坐席专家」。
        它的好处是控制流清晰、和单 Agent 的工具调用心智完全一致，适合层级分明的协作。
      </p>

      <h3>共享黑板 shared blackboard</h3>
      <p>
        所有 Agent 读写同一块公共状态（一个共享的字典、文档或数据库），像几个人围着同一块黑板各写各的、也互相看。
        <em>blackboard</em> 模式适合多个 Agent 需要看到彼此中间成果、协作边界不那么清晰的场景。
        代价是容易产生竞争和耦合——谁都能改的黑板，也是谁都说不清「现在到底是什么状态」的黑板。
      </p>

      <h3>消息总线 message bus</h3>
      <p>
        Agent 之间不直接相互引用，而是往一条<em>message bus</em>（消息总线）上发消息，
        感兴趣的 Agent 自行订阅消费。这是事件驱动的解耦方式，适合 Agent 多、关系动态、需要异步和扩展的大系统。
        它最灵活，但也最重——你得额外维护一套消息基础设施，调试时还得跨消息追踪一条请求的来龙去脉。
      </p>

      <Callout variant="tip" title="从最轻的开始">
        <p>
          三种机制由轻到重：agent-as-tool 最轻，blackboard 居中，message bus 最重。
          小团队的几个 Agent，直接当工具互相调用往往就够了。别因为「总线听起来更解耦」就给三个 Agent 上一套消息中间件。
        </p>
      </Callout>

      <h2>传什么，比传给谁更要命</h2>
      <p>
        机制只决定信息流动的<em>形状</em>，真正决定系统好坏的是流动的<em>内容</em>。这里有一条核心纪律：
        <strong>只传结构化、自包含的结果，不传半成品和原始上下文</strong>。
      </p>
      <p>
        所谓<strong>结构化</strong>，是指有固定字段、可被程序直接解析，而不是一坨自然语言让下游再去猜。
        所谓<strong>自包含</strong>，是指下游拿到它就能直接干活，不必回头去问「你说的那个文档在哪」。
        如果检索专家把它思考的全过程、原始网页 HTML、几十段无关原文一股脑甩给写作专家，
        那你不过是把单 Agent 的「上下文撑爆」问题，原封不动搬到了 Agent 之间。
      </p>

      <Example title="坏传递 vs. 好传递">
        <p>
          坏的：检索专家返回「我搜了三个关键词，第一个没结果，第二个找到一堆，下面是原文 1、原文 2、原文 3……（八千字）」。
          写作专家读完一半上下文就满了，还得自己从噪声里挑有用的。
        </p>
        <p>
          好的：检索专家返回一个 result 对象，<code>success=true</code>，
          <code>data</code> 里是三条已筛选、带标题和摘要的结构化文档。写作专家拿到就能直接写，干净利落。
        </p>
      </Example>

      <KeyIdea title="为每次交接立输入 / 输出契约">
        <p>
          两个 Agent 之间的接缝，就是一份<strong>契约</strong>：上游承诺输出长什么样，下游声明需要什么样的输入。
          把这份契约固定成一个统一的 result 结构——比如 <code>success</code> / <code>data</code> /
          <code>reason</code> 三件套——所有 Agent 都按它收发。这样交接就退化成「把上一个的 result 传给下一个」，
          下游还能先校验输入再干活。契约统一了，整个系统的接缝才可拼装、可替换、可测试。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="错误要显式上报，不要静默吞掉">
        <p>
          最危险的反模式，是子 Agent 出错了却<strong>假装成功</strong>——检索没找到却返回空列表、
          或干脆编一段看似合理的内容。下游不知情，会拿着这份「假数据」一本正经地往下做，
          错误被悄悄放大到最终结果，你还查不出源头。正确做法是：失败时显式返回
          <code>success: false</code> 并附上 <code>reason</code>，让上游有机会重试、降级或终止。
          <strong>宁可响亮地失败，也不要安静地骗人。</strong>
        </p>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        通信机制按系统规模选最轻的够用就行，真正要花心思的是<strong>内容纪律</strong>：
        只传结构化、自包含的结果；为每个接缝立输入 / 输出契约；错误一律显式上报。
        把这三条做到位，多 Agent 系统才不会在 Agent 之间复刻单 Agent 的所有毛病。下一章的实战，
        正是把这套契约落进真实代码。
      </p>

      <Practice title="定义 Agent 间消息契约并演示交接">
        <p>
          下面用一个统一的 <code>AgentResult</code>（含 <code>success</code> / <code>data</code> /
          <code>reason</code>）当契约：检索专家按契约产出，写作专家先校验输入再干活，
          交接就是把上一个的 result 传给下一个。注意失败是怎么显式向上传播、而非被吞掉的。
        </p>
        <CodeBlock lang="python" title="agent_contract.py" code={contractCode} />
        <p>
          试着把 <code>search_docs</code> 改成返回空列表，看检索专家如何返回
          <code>success=false</code>，写作专家又如何识别上游失败并中止——错误一路可见，而不是闷在某个角落。
        </p>
      </Practice>

      <Summary
        points={[
          '三种通信机制：agent-as-tool（当工具调用 / 交接 handoff）、共享黑板 blackboard、消息总线 message bus，由轻到重按规模选。',
          '机制只决定信息流的形状，「传什么」比「传给谁」更要命。',
          '只传结构化、自包含的结果：有固定字段可解析、下游拿到就能直接干活，别甩半成品和原始上下文。',
          '为每次交接立输入 / 输出契约，统一成 success / data / reason 三件套，接缝才可拼装可替换可测试。',
          '错误必须显式上报：失败返回 success:false + reason，绝不静默吞掉或假装成功。',
          '宁可响亮地失败，也不要安静地骗人——否则错误会被悄悄放大到最终结果且无法定位。',
        ]}
      />
    </>
  )
}
