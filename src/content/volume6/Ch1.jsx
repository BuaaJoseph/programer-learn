import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const loopCode = `import json
from anthropic import Anthropic

client = Anthropic()

# 工具：把模型「想做的事」落到真实世界
def run_tool(name, args):
    if name == 'list_unread_emails':
        return [{'id': 1, 'subject': '周会改到周四', 'from': 'pm@x.com'},
                {'id': 2, 'subject': '发票报销', 'from': 'fin@x.com'}]
    if name == 'archive_email':
        return {'ok': True, 'id': args['id']}
    return {'error': 'unknown tool'}

TOOLS = [
    {'name': 'list_unread_emails', 'description': '列出未读邮件',
     'input_schema': {'type': 'object', 'properties': {}}},
    {'name': 'archive_email', 'description': '归档一封邮件',
     'input_schema': {'type': 'object',
                      'properties': {'id': {'type': 'integer'}},
                      'required': ['id']}},
]

def agent_loop(goal, max_turns=8):
    messages = [{'role': 'user', 'content': goal}]
    for turn in range(max_turns):   # 控制点一：轮数上限，防止失控循环
        resp = client.messages.create(
            model='claude-sonnet-4-5',
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )
        messages.append({'role': 'assistant', 'content': resp.content})

        if resp.stop_reason != 'tool_use':
            # 模型不再调用工具，认为任务完成
            return resp.content
        # 模型决定调用工具：由代码去执行，再把结果喂回去
        results = []
        for block in resp.content:
            if block.type == 'tool_use':
                out = run_tool(block.name, block.input)
                results.append({'type': 'tool_result',
                                'tool_use_id': block.id,
                                'content': json.dumps(out, ensure_ascii=False)})
        messages.append({'role': 'user', 'content': results})
    raise RuntimeError('超过最大轮数，强制终止')

print(agent_loop('帮我整理本周未读邮件，把通知类的归档'))`

export default function Ch6_1() {
  return (
    <>
      <Lead>
        <p>
          前几卷里，控制权一直在你手上：你写代码，代码调用模型，模型吐出一段文本，流程到此为止，下一步做什么由你的
          if-else 决定。<em>Agent</em> 翻转了这件事——你把目标交给模型，由<strong>模型决定下一步调用哪个工具</strong>，
          代码退化成「听模型指挥去执行」的角色。这一卷讲的全部内容，都是围绕这个控制权翻转展开的。
        </p>
      </Lead>

      <h2>控制权翻转：从「代码调模型」到「模型调代码」</h2>
      <p>
        传统程序里，流程是写死的：第一步查库、第二步算价格、第三步发邮件。模型即使参与，也只是流程中一个被动的环节，
        什么时候调、调几次、调完干嘛，全是代码说了算。而一个自主 Agent 的运行方式是一个<em>循环</em>：模型看着当前
        状态，自己决定「现在该调哪个工具、传什么参数」，代码忠实执行后把结果喂回去，模型再看一眼，再决定下一步——
        直到它认为目标达成。
      </p>
      <p>
        这个循环里，<strong>分支逻辑从代码移到了模型的脑子里</strong>。你不再写「如果邮件是通知就归档」，你只说
        「帮我整理本周邮件」，至于怎么算「整理」、要不要先列出来再逐封判断，由模型在运行时临场决定。这是 Agent 强大的
        来源，也是它一切风险的来源。
      </p>

      <h3>循环的最小骨架</h3>
      <p>
        把术语剥光，一个 Agent 循环只有四步，反复转：
      </p>
      <ul>
        <li><strong>观察</strong>：把当前上下文（目标 + 已有的工具返回结果）交给模型；</li>
        <li><strong>决策</strong>：模型输出「我要调用工具 X，参数 Y」，或者「我答完了」；</li>
        <li><strong>执行</strong>：代码真正去调用工具 X，拿到结果；</li>
        <li><strong>反馈</strong>：把结果追加进上下文，回到第一步。</li>
      </ul>
      <p>
        模型本身不会执行任何动作——它只会「说」它想调什么工具，真正动手的永远是你的代码。这条边界，是后面讲护栏时
        所有约束能生效的物理前提。
      </p>

      <h3>两种主流编排：ReAct vs Plan-and-Execute</h3>
      <p>
        让模型驱动循环，主要有两种风格。<em>ReAct</em>（Reason + Act）是「边想边做」：每一轮模型先写一小段思考
        （为什么要这么做），再调一个工具，看到结果后再想下一步。它灵活、能随机应变，适合步骤数不确定、需要根据中间
        结果调整方向的任务，缺点是走一步看一步，容易在中途跑偏。
      </p>
      <p>
        <em>Plan-and-Execute</em> 是「先规划再执行」：模型先一次性产出一份完整计划（第一步做什么、第二步做什么），
        然后按计划逐条执行，执行阶段不再随意改主意。它更可控、token 更省、便于人审计划，缺点是计划一旦在中途被现实
        打脸（某步失败了），需要额外的重规划机制。实践中常常混用：用 Plan 定大方向，用 ReAct 处理每一步内部的临场判断。
      </p>

      <Example title="走一轮「整理本周邮件」">
        <p>你对 Agent 说：「帮我整理本周未读邮件，把通知类的归档。」循环可能这样转：</p>
        <ul>
          <li><strong>第 1 轮</strong>　模型想：我得先知道有哪些邮件 → 调用 <code>list_unread_emails()</code>。</li>
          <li><strong>第 2 轮</strong>　代码返回两封：「周会改到周四」「发票报销」。模型判断前者是通知 → 调用 <code>archive_email(id=1)</code>。</li>
          <li><strong>第 3 轮</strong>　归档成功。模型判断「发票报销」需要你处理，不归档 → 输出总结「已归档 1 封通知，1 封需你跟进」，不再调工具。</li>
        </ul>
        <p>
          注意：没有一行代码写过「通知类该归档」的规则。是模型在第 2 轮临场把「周会改到周四」归为通知的。换个模型、
          换次运行，它甚至可能做出不同判断——这正是自主带来的不确定性。
        </p>
      </Example>

      <KeyIdea title="能写死的流程，就别上自主 Agent">
        <p>
          自主不是越多越好。如果任务的步骤是固定的、条件是清晰的（「读文件 → 转格式 → 写回」），那就用普通代码或一条
          <em>workflow</em>（把若干次模型调用串成固定管线）解决，确定、便宜、好调试。只有当步骤数<strong>事先不知道</strong>、
          需要根据中间结果<strong>动态决定下一步</strong>时，自主 Agent 的灵活性才值回它带来的不可预测和成本。先问一句
          「这流程我能不能画成固定流程图」，能，就别上 Agent。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="自主带来的四类新风险">
        <p>一旦把方向盘交给模型，下面四件以前不会发生的事就成了常态：</p>
        <ul>
          <li><strong>失控循环</strong>——模型反复调同一个工具、来回打转，永远不输出「完成」，把循环卡死。</li>
          <li><strong>成本失控</strong>——每一轮都是一次完整的模型调用，上下文还越滚越长，一个跑飞的 Agent 能在几分钟里烧掉大笔 token 费用。</li>
          <li><strong>错误累积</strong>——第 2 步的小错误会被当成「事实」喂进第 3 步，越滚越偏（这与第 1 卷讲的 teacher forcing 隐患同源）。</li>
          <li><strong>不可预测</strong>——同样的输入，两次运行可能走完全不同的路径，给测试、复现、问责都带来麻烦。</li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        因为方向盘交了出去，工程的重点就从「写对逻辑」变成「设好边界」。对应上面四类风险，有四个必须默认装上的<strong>控制点</strong>：
        <strong>轮数上限</strong>（循环最多转 N 次就强制停，挡住失控循环）、<strong>预算上限</strong>（累计 token 或调用次数超阈值即中断，挡住成本失控）、
        <strong>人审关卡</strong>（删数据、发邮件、付款这类不可逆动作前暂停，等人点头）、<strong>可终止</strong>（任何时候外部能干净地把循环叫停）。
        这四个不是优化项，是上线前的及格线——后面几章讲的分解、反思、护栏、评估，本质都是在这个循环上加更细的控制。
      </p>

      <Practice title="跑一个最小自主循环">
        <p>
          下面是一个能真正跑起来的最小 Agent 循环：两个假工具（列邮件、归档），一个 <code>agent_loop</code>。重点看三处——
          循环里的 <code>max_turns</code> 是轮数上限，<code>stop_reason != 'tool_use'</code> 是退出条件，工具的真正执行
          在 <code>run_tool</code> 里而非模型里。
        </p>
        <CodeBlock lang="python" title="min_agent_loop.py" code={loopCode} />
        <p>
          动手改三处感受控制权：把 <code>max_turns</code> 调到 1，看它来不及归档就被掐断；在 <code>run_tool</code> 里给
          <code>archive_email</code> 加一行「执行前 print 并 input 等你回车」，这就是最朴素的人审关卡；再故意让
          <code>list_unread_emails</code> 返回一封措辞像指令的邮件，观察模型会不会被带跑——这正是第 4 章护栏要解决的。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent 的本质是控制权翻转：从「代码调模型」变成「模型调代码」，分支逻辑从代码移进了模型的临场决策。',
          '自主循环只有四步——观察、决策、执行、反馈——反复转；模型只「说」要调什么工具，真正执行的永远是代码。',
          'ReAct 边想边做、灵活但易跑偏；Plan-and-Execute 先规划再执行、可控省钱但需重规划，实践中常混用。',
          '能画成固定流程图的任务就用 workflow 或普通代码解决，只有步骤数不定、需动态决策时才上自主 Agent。',
          '自主带来四类新风险：失控循环、成本失控、错误累积、不可预测。',
          '对应四个必装控制点：轮数上限、预算上限、人审关卡、可终止——这是 Agent 上线的及格线。',
        ]}
      />
    </>
  )
}
