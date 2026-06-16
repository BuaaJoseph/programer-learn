import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const toolsCode = `# tools.py —— 三个最基础的工具 + 它们的 schema
import os
import subprocess

# ---- 工具的实际实现 ----

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return 'ok: wrote ' + str(len(content)) + ' chars to ' + path

def run_bash(command):
    # 真正去跑一条 shell 命令，把 stdout / stderr 都收回来
    proc = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=60
    )
    out = proc.stdout + proc.stderr
    return out.strip() or '(no output)'

# 名字 -> 函数 的派发表，主循环靠它把模型点名的工具找出来
TOOL_IMPL = {
    'read_file': lambda args: read_file(args['path']),
    'write_file': lambda args: write_file(args['path'], args['content']),
    'run_bash': lambda args: run_bash(args['command']),
}

# ---- 告诉模型「你有哪些工具、怎么调」的 schema ----
TOOLS = [
    {
        'name': 'read_file',
        'description': '读取一个文本文件并返回它的全部内容。',
        'input_schema': {
            'type': 'object',
            'properties': {'path': {'type': 'string', 'description': '文件路径'}},
            'required': ['path'],
        },
    },
    {
        'name': 'write_file',
        'description': '把内容写入一个文件（覆盖写）。',
        'input_schema': {
            'type': 'object',
            'properties': {
                'path': {'type': 'string'},
                'content': {'type': 'string'},
            },
            'required': ['path', 'content'],
        },
    },
    {
        'name': 'run_bash',
        'description': '在 shell 里执行一条命令，返回它的输出。',
        'input_schema': {
            'type': 'object',
            'properties': {'command': {'type': 'string'}},
            'required': ['command'],
        },
    },
]`

const loopCode = `# agent.py —— 几十行的主循环，就是一个 Agent
import anthropic
from tools import TOOLS, TOOL_IMPL

client = anthropic.Anthropic()   # 读环境变量 ANTHROPIC_API_KEY
MODEL = 'claude-sonnet-4-5'      # 换成你有权限的模型名即可

# 最简单的权限：危险命令先问一句人
DANGER = ('rm ', 'rm -', 'sudo', 'mkfs', 'dd ', ':(){', 'shutdown', 'reboot')

def needs_confirm(name, args):
    if name != 'run_bash':
        return False
    cmd = args.get('command', '')
    return any(token in cmd for token in DANGER)

def dispatch(name, args):
    # 危险命令 -> 暂停，交给人拍板（这就是最朴素的权限闸门）
    if needs_confirm(name, args):
        print('\\n[需要确认] 即将执行: ' + args.get('command', ''))
        if input('放行吗? (y/N) ').strip().lower() != 'y':
            return '用户拒绝了这条命令。'
    impl = TOOL_IMPL.get(name)
    if impl is None:
        return 'error: unknown tool ' + name
    try:
        return impl(args)
    except Exception as e:           # 工具出错也要回灌，让模型自己想办法
        return 'error: ' + str(e)

def run(task):
    # messages 就是 Agent 的全部记忆：从头到尾积累的一条历史
    messages = [{'role': 'user', 'content': task}]

    while True:                      # 这就是 Agent 的心脏
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system='你是一个动手能力很强的编程助手，会用工具完成任务。',
            tools=TOOLS,
            messages=messages,
        )
        # 把模型这一轮说的话原样存进历史
        messages.append({'role': 'assistant', 'content': resp.content})

        # 模型没有再请求工具 -> 它觉得任务完成了，打印结果、收工
        if resp.stop_reason != 'tool_use':
            text = ''.join(b.text for b in resp.content if b.type == 'text')
            print('\\n=== 完成 ===\\n' + text)
            return

        # 模型请求了一个或多个工具 -> 逐个执行，把结果回灌
        results = []
        for block in resp.content:
            if block.type != 'tool_use':
                continue
            print('-> 调用工具 ' + block.name + ' ' + str(block.input))
            output = dispatch(block.name, block.input)
            results.append({
                'type': 'tool_result',
                'tool_use_id': block.id,    # 用 id 对应回是哪一次调用
                'content': output,
            })
        # 工具结果作为一条 user 消息塞回历史，再转一圈
        messages.append({'role': 'user', 'content': results})

if __name__ == '__main__':
    run('在当前目录建一个 hello.txt，写入「你好，Agent」，然后用命令读出来确认。')`

const verifyCode = `# 给最小 Agent 加一道「验证循环」：模型说完成，先别信，跑一遍测试
def run_with_verify(task, verify_cmd='pytest -q'):
    messages = [{'role': 'user', 'content': task}]
    verified = False                 # 这一轮的「完成」有没有过校验

    while True:
        resp = client.messages.create(
            model=MODEL, max_tokens=2048,
            system='你是一个动手能力很强的编程助手，会用工具完成任务。',
            tools=TOOLS, messages=messages,
        )
        messages.append({'role': 'assistant', 'content': resp.content})

        if resp.stop_reason != 'tool_use':
            if verified:
                return               # 校验过了，真退出
            # 模型说完成，但还没过校验 -> 自动跑一遍，把结果回灌
            out = run_bash(verify_cmd)
            verified = ('failed' not in out.lower() and 'error' not in out.lower())
            messages.append({'role': 'user', 'content': [{
                'type': 'text',
                'text': '自动校验结果（' + verify_cmd + '）:\\n' + out +
                        ('\\n校验通过。' if verified else '\\n校验未过，请继续修。'),
            }]})
            continue                 # 带着校验结果再转一圈，让模型自己改
        # ……（工具执行与回灌同前，略）`

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          讲了四章原理，这一章我们亲手把它做出来：用几十行 Python，写一个<strong>真正能跑</strong>的最小 Agent。
          你会看到，所谓「Agent」并没有什么魔法——它就是<em>一个 while 循环</em>，反复把消息发给模型，
          模型点名要用工具就执行、把结果回灌，模型说完了就停。把这几十行看懂、跑起来，
          你就摸到了 Claude Code、opencode 这些工具最核心的那颗心脏。
        </p>
      </Lead>

      <h2>一个 Agent 需要哪几样东西</h2>
      <p>
        拆到最小，一个 Agent 只需要四样东西：一组<strong>工具</strong>（让模型能动手，比如读写文件、跑命令）、
        一份描述工具的 <strong>schema</strong>（告诉模型「你有什么、怎么调」）、一条<strong>消息历史</strong>
        （Agent 的全部记忆）、以及一个<strong>主循环</strong>（把上面三样串起来反复转）。下面我们一样样写。
      </p>
      <p>
        <strong>为什么恰好是这四样、不多不少？</strong>因为它们一一对应着「让一个只会出文本的模型能在世界里行动」
        所必需的四个环节：工具是<em>手</em>（能改变世界）、schema 是<em>说明书</em>（让模型知道有哪些手、怎么用）、
        消息历史是<em>记忆</em>（模型本身无状态，记忆得由你维护）、主循环是<em>心跳</em>（把感知→决策→行动→再感知
        串成持续的节奏）。少任何一样，这套就转不起来：没工具模型只能空谈，没 schema 模型不知道能干啥，
        没历史模型每轮都失忆，没循环就只是一次性的问答而非「持续完成任务」。
      </p>

      <h3>第一步：定义工具和它们的 schema</h3>
      <p>
        我们给它三个最常用的工具：<code>read_file</code>、<code>write_file</code>、<code>run_bash</code>。
        每个工具有两部分——真正干活的 Python 函数，和一段 schema（告诉模型这个工具叫什么、干什么、要哪些参数）。
        模型看的是 schema，执行的是函数。
      </p>
      <CodeBlock lang="python" title="tools.py" code={toolsCode} />
      <p>
        <strong>这里有个新手最常踩、却又最隐蔽的坑：schema 的 description 不是写给人看的注释，而是模型唯一的
        「使用说明」。</strong>模型决定<em>什么时候、用什么参数</em>调一个工具，完全依赖你这段描述。
        如果 <code>{'description'}</code> 含糊（比如只写「处理文件」），模型就会乱用、传错参数、或该用时不用。
        反过来，把描述写清楚（「读取一个<em>文本</em>文件并返回<em>全部</em>内容；不要用于二进制文件」）
        就是最廉价、最有效的「调教」。<strong>写好工具描述，是 Agent 工程里性价比最高的功夫之一</strong>，
        其重要性常被低估。
      </p>

      <h3>第二步：写主循环</h3>
      <p>
        主循环就是 Agent 的全部。它维护一条 <code>messages</code> 历史，反复调用模型：
        如果模型的 <code>stop_reason</code> 是 <code>{'tool_use'}</code>，说明它想用工具——我们逐个执行，
        把结果作为一条 <code>{'tool_result'}</code> 消息回灌历史，然后<strong>带着更新后的完整上下文再转一圈</strong>；
        如果模型不再请求工具，说明它认为任务完成了，打印文本、收工。我们还顺手加了最朴素的权限：
        危险命令先暂停问人一句。
      </p>
      <CodeBlock lang="python" title="agent.py" code={loopCode} />
      <p>
        <strong>几个容易被一眼略过、但全是设计要点的细节</strong>：其一，工具结果是用一条
        <code>role: 'user'</code> 的消息回灌的——在工具调用协议里，「工具的输出」被建模成「用户发来的新信息」，
        因为对模型而言它就是「外部世界给我的反馈」。其二，<code>{'tool_use_id'}</code> 必须原样带回，
        模型才能把这条结果对应回它发起的<em>那一次</em>调用（一轮里可能同时调了好几个工具）。其三，
        工具<strong>出错也要把错误信息回灌</strong>，而不是直接抛异常崩掉——让模型看到 <code>error: ...</code>，
        它往往能自己换个路子重试，这正是 Agent「有韧性」的来源。
      </p>

      <Example title="跑起来是什么样">
        <p>
          设好 <code>ANTHROPIC_API_KEY</code>，装上 <code>anthropic</code> 包，直接 <code>python agent.py</code>，
          你大概会看到这样的过程：
        </p>
        <ul>
          <li>模型先请求 <code>write_file</code>，把「你好，Agent」写进 hello.txt（终端打印一行「调用工具 write_file ...」）。</li>
          <li>工具结果回灌后，模型再请求 <code>run_bash</code> 跑一条读文件的命令来确认（如果命令里带了危险词，会停下来问你 y/N）。</li>
          <li>拿到输出后，模型不再请求工具，<code>stop_reason</code> 变回普通文本，循环打印「完成」并退出。</li>
        </ul>
        <p>
          整个过程里，模型从没「直接」碰过你的磁盘——它只是<strong>说</strong>「我想调 write_file，参数是这些」，
          真正动手的是你那几行 Python。这层「模型出意图、宿主来执行」的分工，是所有 Agent 工具的安全基石。
        </p>
      </Example>

      <KeyIdea title="几十行就能让模型变成 Agent">
        <p>
          模型本身只会输出文本。把它变成能读写文件、跑命令的 Agent，<strong>全部的魔法就在那个 while 循环里</strong>：
          发消息 → 模型要工具就执行并回灌 → 没要工具就停。Claude Code、opencode 再复杂，剥到最里层也是这颗心脏。
          你已经把它写出来了。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="这是教学版，别直接上生产">
        <p>
          这份代码为了讲清原理做了大量简化：<code>run_bash</code> 直接在你的真实机器上执行命令、
          危险命令的判断只是关键词匹配（很容易被绕过）、没有沙箱、没有超时之外的资源限制、没有上下文长度管理。
          真要用，<strong>务必把工具放进沙箱、收紧权限、并对模型能碰的范围做白名单</strong>。
          学原理可以裸跑，碰生产必须加防护。
        </p>
      </Callout>

      <Callout variant="info" title="为什么关键词黑名单注定挡不住">
        <p>
          这里用 <code>DANGER</code> 关键词来拦危险命令，是教学上够直观、工程上却注定漏的做法。原因很根本：
          shell 的表达力太强，绕过黑名单的方式无穷无尽——比如把命令 base64 编码后再 <code>{'eval'}</code>、
          用变量拼接、用别名、用等价但不含关键词的命令。任何<strong>黑名单</strong>（列出「不许做什么」）
          在面对开放空间时都守不住，正确方向是<strong>白名单</strong>（只许做这几件）加<strong>沙箱</strong>
          （就算被绕过，能造成的破坏也被关在隔离环境里）。这是安全设计的一条通则，不止于 Agent。
        </p>
      </Callout>

      <h2>从最小到更强：接下来加什么</h2>
      <p>
        这个最小循环是个干净的地基，往上加能力的方向，恰好对应前几章讲过的东西：
      </p>
      <ul>
        <li><strong>验证循环</strong>：在「模型说完成」之后，别急着退出——自动跑一遍测试或 lint，
          把结果作为新的 <code>{'tool_result'}</code> 回灌，让模型看到失败就接着改。这是质量的关键一环。</li>
        <li><strong>记忆 / 压缩</strong>：消息历史会越来越长。当它快撑满上下文窗口时，把早期内容
          总结压缩成一小段再继续，长任务才不会断（正是 Cognition 推荐的「单线程 + 上下文压缩」）。</li>
        <li><strong>子代理</strong>：遇到噪音大的子任务（翻一大堆文件找一处定义），派一个独立的小循环去做，
          只把一句结论回灌主线——子代理作为上下文隔离器，主循环保持干净。</li>
      </ul>
      <p>
        其中<strong>验证循环</strong>最值得马上动手，因为它把质量从「靠模型自觉」变成「结构上兜底」。
        核心改动只有一处：模型说完成时不立刻退出，而是先自动跑一遍校验命令，把结果回灌，
        只有真过了才退出。下面是骨架：
      </p>
      <CodeBlock lang="python" title="给最小 Agent 加一道验证循环" code={verifyCode} />
      <p>
        体会一下这个改动的分量：加了它之后，Agent 不再是「写完就拍胸脯说好了」，而是「写完→自己验→没过接着改」。
        这正是把<strong>反馈</strong>显式接进循环——Agent 的能力上限，很大程度上取决于你给它接了多紧的反馈回路。
      </p>

      <h2>这对你意味着什么</h2>
      <p>
        把这几十行真正跑通一次，你对 Agent 的理解会从「听说过」变成「我知道它怎么转」。
        以后再看任何 Agent 框架，你都能一眼找到它的主循环、它的工具 schema、它怎么管消息历史——
        因为骨架就这一套。剩下的全是工程取舍：要不要图编排、要不要 client-server、要不要多 Agent。
        而你现在，已经能从地基开始把它一层层搭起来了。
      </p>

      <Practice title="给最小 Agent 加一样东西">
        <p>
          在上面这份代码的基础上，二选一动手实现（建议两个都试）：
        </p>
        <ul>
          <li>
            <strong>加一个工具</strong>：实现 <code>list_dir</code>（列出某个目录下的文件），写好它的实现、
            schema，并登记进 <code>TOOL_IMPL</code> 和 <code>TOOLS</code>。然后给模型一个需要先列目录、
            再读其中某个文件的任务，看它会不会自己先调 <code>list_dir</code>。
            做完后特意把 schema 的 description 改得很含糊，再跑一次，观察模型用错或不用它——
            亲手感受「描述就是模型唯一的说明书」。
          </li>
          <li>
            <strong>加一个验证步骤</strong>：当模型说完成时，先自动跑一遍 <code>run_bash('pytest -q')</code>
            （或任意一条校验命令），把结果回灌成一条 <code>{'tool_result'}</code>；只有校验通过了才真正退出循环，
            否则让模型看着失败信息继续改。体会一下「验证循环」是怎么把质量兜住的。
          </li>
        </ul>
      </Practice>

      <Summary
        points={[
          '一个最小 Agent 只需四样东西：工具（手）、schema（说明书）、消息历史（记忆）、主循环（心跳）；少任何一样这套都转不起来。',
          '主循环就是 Agent 的心脏：发 messages 给模型 -> 模型请求 tool_use 就执行并把 tool_result 回灌 -> 模型不再请求工具就停。',
          '工具有两部分：真正干活的函数，和告诉模型「有什么、怎么调」的 schema；模型只出意图，真正动手执行的是宿主代码。',
          'schema 的 description 是模型唯一的使用说明（不是注释），写清楚它是性价比最高的「调教」；工具出错也要回灌，模型才能自己重试、有韧性。',
          '最朴素的权限是危险命令先问人一句；但关键词黑名单注定被 shell 绕过，正确方向是白名单 + 沙箱，这是安全设计通则。',
          '往上增强对应前几章：验证循环（模型说完先自动跑测试再回灌）把质量从靠自觉变成结构兜底，是最该先加的一环；再是上下文压缩保长任务、子代理作隔离器。',
        ]}
      />
    </>
  )
}
