import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'
import ReActLoop from '../../components/illustrations/ReActLoop.jsx'

const rawReactCode = `# 原始 ReAct：靠纯文本提示，让模型按固定格式输出，再用代码解析
SYSTEM = '''你可以使用工具来回答问题。请严格按以下格式逐步输出：
Thought: 你的思考
Action: 工具名
Action Input: 参数
（系统会返回 Observation，你再继续 Thought/Action）
当你已经能回答时，输出：
Final Answer: 最终答复
'''

import re

def parse(text):
    if 'Final Answer:' in text:
        return ('final', text.split('Final Answer:')[-1].strip())
    action = re.search(r'Action:\\s*(.+)', text)
    inp = re.search(r'Action Input:\\s*(.+)', text)
    return ('action', action.group(1).strip(), inp.group(1).strip())

# 缺点：模型一旦格式跑偏，正则就崩；这正是原生 function-calling 想解决的问题`

const reactLoopCode = `import json
from openai import OpenAI

client = OpenAI()

def run_react(question, tools, registry, max_iterations=8):
    messages = [{'role': 'user', 'content': question}]
    seen_calls = set()          # 记录已执行过的 (工具名, 参数) 组合，防重复

    for step in range(max_iterations):
        resp = client.chat.completions.create(
            model='gpt-4o-mini', messages=messages, tools=tools,
        )
        msg = resp.choices[0].message
        messages.append(msg)

        # 停止条件 1：模型不再请求工具 → 它给出了最终答复
        if not msg.tool_calls:
            return msg.content

        for call in msg.tool_calls:
            name = call.function.name
            raw_args = call.function.arguments
            signature = (name, raw_args)

            # 重复检测：同样的工具 + 同样的参数已经调过，别再调一次
            if signature in seen_calls:
                observation = {'error': f'你已用相同参数调用过 {name}，请换思路或直接给出答复'}
            else:
                seen_calls.add(signature)
                fn = registry.get(name)
                if fn is None:
                    observation = {'error': f'没有名为 {name} 的工具'}
                else:
                    try:
                        observation = fn(**json.loads(raw_args))
                    except Exception as e:
                        observation = {'error': f'{name} 执行失败：{e}'}

            # 把观察结果回灌，进入下一轮「思考」
            messages.append({
                'role': 'tool',
                'tool_call_id': call.id,
                'content': json.dumps(observation, ensure_ascii=False),
            })

    # 停止条件 2：到达上限仍未收敛 → 兜底，避免无限循环烧钱
    return '已达到最大迭代次数，未能得到最终答复'`

export default function Ch4_3() {
  return (
    <>
      <Lead>
        <p>
          单次工具调用只够回答「北京几度」这种一步问题。但「订一张明天去上海、价格最低的高铁票」要查车次、
          比价、再下单——得调好几次工具，每次都要先想一步、做一步、看结果再想下一步。这种
          <strong>思考（Reason）→ 行动（Act）→ 观察（Observe）</strong>反复交替的模式，就是 <em>ReAct</em> 循环，
          是几乎所有 Agent 的运转骨架。
        </p>
      </Lead>

      <h2>循环是怎么转起来的</h2>
      <p>
        ReAct 的每一轮都做三件事：模型<strong>思考</strong>下一步该干嘛、产出一个工具调用去<strong>行动</strong>、
        你的代码执行后把结果作为<strong>观察</strong>回灌。观察进入对话历史后，模型带着新信息再思考下一步——
        如此循环，直到它认为信息够了，不再请求工具、直接给出最终答复，循环才结束。
      </p>

      <ReActLoop />

      <p>
        注意一个关键点：驱动循环前进的，是不断<strong>累积的对话历史</strong>（常叫 <em>transcript</em>）。
        第 N 轮调用模型时，你喂进去的不只是最初的问题，而是「问题 + 前面每一轮的思考、工具调用、工具结果」全都带上。
        模型没有记忆，它能「连贯地推进任务」纯粹是因为你每轮都把完整历史重新喂给它。
      </p>

      <Callout variant="warn" title="transcript 越滚越长，token 成本是非线性的">
        <p>
          因为每一轮都要把<strong>全部历史</strong>重新发给模型，第 5 轮发送的内容远多于第 1 轮。
          假设每轮新增的内容差不多，那么到第 N 轮，累计发送的 token 量大致正比于 <code>1 + 2 + ... + N</code>，
          也就是 <strong>O(N²)</strong> 量级——轮数翻倍，成本不是翻倍，而是翻四倍左右。
        </p>
        <ul>
          <li>所以「让 Agent 多想几步」绝不是免费的，max_iterations 既是安全阀，也是成本阀。</li>
          <li>长任务要考虑截断/摘要历史、只保留关键观察，否则后期每一轮都在为前面的啰嗦买单。</li>
        </ul>
      </Callout>

      <h3>循环控制：四件必须做对的事</h3>
      <p>
        一个能上线的 ReAct 循环，控制逻辑比「调模型」本身更要紧：
      </p>
      <ul>
        <li>
          <strong>停止条件</strong>——必须能识别「模型给出了最终答复」（原生 function-calling 里就是
          <code>tool_calls</code> 为空）。这是循环正常退出的出口。
        </li>
        <li>
          <strong>max_iterations 上限</strong>——模型可能陷入「查了又查、就是不收尾」。设一个硬上限，
          到了就兜底退出，防止无限循环把钱烧光。
        </li>
        <li>
          <strong>防止重复调用同一工具</strong>——记录「工具名 + 参数」的指纹，发现模型用一模一样的参数又调一遍，
          就回灌一句提示让它换思路，而不是傻傻再执行。
        </li>
        <li>
          <strong>区分「最终答复」与「工具调用」</strong>——别把模型一段带 Thought 的文本误当成答复，
          也别把答复误当成还要执行工具。原生 function-calling 把这两者用结构区分开，省去了猜。
        </li>
      </ul>

      <Example title="两种实现风格：原始 ReAct vs 原生 function-calling">
        <p>
          <strong>原始 ReAct</strong>（论文里的做法）：没有专门的工具接口，全靠提示词约定一套
          <code>Thought / Action / Observation</code> 文本格式，模型按格式输出，你用正则去解析。
          灵活、任何模型都能用，但<strong>脆</strong>——模型格式稍跑偏，解析就崩。
        </p>
        <CodeBlock lang="python" title="raw_react.py" code={rawReactCode} />
        <p>
          <strong>原生 function-calling</strong>（如今主流）：模型把工具调用作为<strong>结构化字段</strong>
          （<code>tool_calls</code>）返回，你不用解析文本，直接读字段；模型也被专门训练过更少出格。
          代价是依赖支持该能力的模型与 API。两者思想完全一致，区别只在「靠文本约定」还是「靠结构契约」。
        </p>
      </Example>

      <KeyIdea title="Agent = 一个被精心控制的 while 循环">
        <p>
          去掉花哨的包装，绝大多数 Agent 框架的内核就是一个 while 循环：调模型、看它要不要用工具、用就执行并回灌、
          不用就返回。真正的工程难度不在这个骨架，而在<strong>循环控制</strong>——什么时候停、超限怎么办、
          重复了怎么办、历史太长怎么压缩。把这些想清楚，你不用任何框架也能写出可靠的 Agent。
        </p>
      </KeyIdea>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        别一上来就抄一个庞大的 Agent 框架。先自己写这个 while 循环，你会真正理解每一轮在 messages 里加了什么、
        token 为什么越烧越快、循环为什么会卡住。<strong>能观测、能调试、能掐断</strong>的循环，远比一个黑盒框架可靠。
        等你把控制逻辑摸透了，再决定要不要上框架，那时框架对你只是省代码，而不是省思考。
      </p>

      <Practice title="带 max_iterations 和重复检测的 ReAct 循环">
        <p>
          下面是一个生产味儿的 ReAct 循环：用原生 function-calling，包含两个停止条件（模型不再调工具、到达迭代上限）、
          重复调用检测（同名同参直接拦下并提示模型换思路）、以及工具执行的异常兜底（把错误作为观察回灌，而不是让程序崩）。
        </p>
        <CodeBlock lang="python" title="react_loop.py" code={reactLoopCode} />
        <p>
          挑战：给它一个故意会绕圈的问题，观察重复检测有没有把它从死循环里救出来；再打印每一轮 messages 的长度，
          亲眼看看 transcript 是怎么非线性膨胀的。
        </p>
      </Practice>

      <Summary
        points={[
          'ReAct 循环 = 思考 → 行动 → 观察 反复交替，是多步 Agent 的运转骨架。',
          '驱动循环的是不断累积的对话历史 transcript：模型无记忆，靠你每轮重喂完整历史来连贯推进。',
          '因为每轮都重发全部历史，到第 N 轮累计 token 约 O(N²)，多想几步的成本是非线性增长的。',
          '循环控制四件事：识别最终答复（停止条件）、max_iterations 上限、重复调用检测、区分答复与工具调用。',
          '两种实现风格：原始 ReAct 靠文本格式 + 正则解析（脆）；原生 function-calling 靠结构化字段（稳，主流）。',
          'Agent 内核就是一个被精心控制的 while 循环，难点不在骨架而在控制——先自己写，再考虑用框架。',
        ]}
      />
    </>
  )
}
