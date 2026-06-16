import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

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

const guardedLoopCode = `# 在最小循环上叠加四个「上线及格线」控制点：
# 轮数上限、预算上限、人审关卡、可终止。
import json, time
from anthropic import Anthropic

client = Anthropic()

# 哪些动作不可逆，必须人审后才执行
NEEDS_APPROVAL = {'archive_email', 'send_email', 'delete_file'}

def run_tool(name, args):
    return {'ok': True, 'name': name}  # 省略真实实现

def agent_loop(goal, tools, run_tool,
               max_turns=20, token_budget=200_000, should_stop=None):
    messages = [{'role': 'user', 'content': goal}]
    used_tokens = 0
    for turn in range(max_turns):                 # 控制点①：轮数上限
        if should_stop and should_stop():          # 控制点④：外部可终止
            return '已被外部终止'
        resp = client.messages.create(
            # 推荐用最新模型 + 自适应思考；这里 effort 取 high 兼顾质量
            model='claude-opus-4-8',
            max_tokens=4096,
            thinking={'type': 'adaptive'},
            output_config={'effort': 'high'},
            tools=tools,
            messages=messages,
        )
        used_tokens += resp.usage.input_tokens + resp.usage.output_tokens
        if used_tokens > token_budget:             # 控制点②：预算上限
            raise RuntimeError(f'token 预算 {token_budget} 已耗尽')

        messages.append({'role': 'assistant', 'content': resp.content})
        if resp.stop_reason != 'tool_use':
            return resp.content

        results = []
        for block in resp.content:
            if block.type != 'tool_use':
                continue
            if block.name in NEEDS_APPROVAL:        # 控制点③：人审关卡
                ok = input(f'执行 {block.name}({block.input})? [y/N] ')
                if ok.strip().lower() != 'y':
                    results.append({'type': 'tool_result', 'tool_use_id': block.id,
                                    'content': '用户拒绝了此操作', 'is_error': True})
                    continue
            out = run_tool(block.name, block.input)
            results.append({'type': 'tool_result', 'tool_use_id': block.id,
                            'content': json.dumps(out, ensure_ascii=False)})
        messages.append({'role': 'user', 'content': results})
    raise RuntimeError('超过最大轮数，强制终止')`

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
      <p>
        值得强调的一点是：<strong>模型本身一点没变</strong>。它依旧是第 1 卷讲的那个只会做 next-token prediction 的概率机器，
        既不能联网、也不能动你的文件。所谓「调用工具」，其实是模型<strong>生成了一段结构化文本</strong>（「我想调 archive_email，参数 id=1」），
        你的代码读到这段文本、解析出工具名和参数、真正去执行、再把结果当成新的上下文喂回去。Agent 的「自主」是一种<strong>编排上的错觉</strong>——
        是你用一个循环，把模型的「文字意图」反复翻译成真实动作而已。理解这层，你才知道所有护栏该装在哪：装在代码这一侧，而不是指望模型自律。
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
      <p>
        注意这个循环和第 5 卷的关系：每转一圈，上下文都会变长（多了一轮工具调用和它的返回结果）。跑几十上百轮的 Agent，
        正是第 5 卷那套「滑窗 + 摘要 + 按需检索 + 预算裁剪」的主战场。<strong>Agent 循环负责「决定做什么」，上下文管理负责「在窗口和预算内可持续地做下去」</strong>，两者缺一不可。

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
      <table>
        <thead>
          <tr><th>维度</th><th>ReAct（边想边做）</th><th>Plan-and-Execute（先规划再执行）</th></tr>
        </thead>
        <tbody>
          <tr><td>灵活性</td><td>高，能随中间结果改方向</td><td>低，执行阶段按计划走</td></tr>
          <tr><td>可控/可审</td><td>难审，路径运行时才确定</td><td>易审，计划一次性产出可先过目</td></tr>
          <tr><td>token 成本</td><td>较高，每轮都带思考</td><td>较省，规划集中在前期</td></tr>
          <tr><td>失败处理</td><td>就地调整</td><td>需要显式的重规划机制</td></tr>
          <tr><td>适合</td><td>探索型、步骤不定的任务</td><td>步骤较清晰、要可审计的任务</td></tr>
        </tbody>
      </table>

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

      <p>
        判断「该不该上 Agent」有四个可操作的检查项，缺一就往简单的那头退：<strong>复杂度</strong>（任务是否多步且难以提前完整描述）、
        <strong>价值</strong>（结果是否值得更高的成本与延迟）、<strong>可行性</strong>（模型在这类任务上是否真的能做好）、<strong>错误代价</strong>（出错能不能被测试/审查/回滚兜住）。
        四项都为「是」，自主 Agent 才划算；任何一项为「否」，优先单次调用或固定 workflow。
      </p>

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
      <p>
        人审关卡这一项要点在于<strong>按可逆性分级</strong>，而不是逢动作就拦。读文件、搜网页这类只读、可重来的动作可以放行；
        发邮件、删库、付款、对外发请求这类<strong>不可逆</strong>的动作才该卡住等人点头。这也呼应了「工具设计」的一条原则：把需要审批的高危动作
        做成<strong>专门的工具</strong>（如 <code>send_email</code>），而不是塞进一个万能的 <code>bash</code>——前者你能精准拦截，后者你只看到一串不透明的命令字符串，没法分级。
      </p>

      <CodeBlock lang="python" title="guarded_agent_loop.py" code={guardedLoopCode} />
      <p>
        上面这版在最小循环上把四个控制点都补齐了：轮数上限、token 预算、按可逆性分级的人审、外部 <code>should_stop</code> 钩子。
        模型用的是最新的 <code>claude-opus-4-8</code> 配自适应思考（<code>thinking: adaptive</code>）——让模型自己决定每一轮想多深，比手动设思考预算更省心；
        <code>effort</code> 设为 <code>high</code> 兼顾智能与成本，长程 Agent 通常用 <code>high</code> 或 <code>xhigh</code>。这就是一个能上线的 Agent 内核雏形。
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
        <p>
          进阶练习：把上面 <code>guarded_agent_loop.py</code> 的四个控制点逐一加进来，再人为让某个工具每次都返回错误，
          观察模型会不会在 <code>max_turns</code> 内反复重试、最终被轮数上限兜住——亲眼看到「失控循环」是怎么被挡住的。
        </p>
      </Practice>

      <Summary
        points={[
          'Agent 的本质是控制权翻转：从「代码调模型」变成「模型调代码」，分支逻辑从代码移进了模型的临场决策。',
          '模型本身没变，仍是概率补全机器；「调用工具」只是它生成结构化文本、由你的代码翻译成真实动作——护栏因此必须装在代码侧。',
          '自主循环只有四步——观察、决策、执行、反馈——反复转；模型只「说」要调什么工具，真正执行的永远是代码。',
          'ReAct 边想边做、灵活但易跑偏；Plan-and-Execute 先规划再执行、可控省钱但需重规划，实践中常混用。',
          '能画成固定流程图的任务就用 workflow 或普通代码解决；用复杂度/价值/可行性/错误代价四项判断该不该上自主 Agent。',
          '自主带来四类新风险：失控循环、成本失控、错误累积、不可预测。',
          '对应四个必装控制点：轮数上限、预算上限、按可逆性分级的人审关卡、可终止——这是 Agent 上线的及格线。',
        ]}
      />
    </>
  )
}
