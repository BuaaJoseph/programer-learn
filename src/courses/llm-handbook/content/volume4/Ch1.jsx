import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const oneTurnCode = `from openai import OpenAI

client = OpenAI()

# 1. 把工具契约告诉模型（这只是一段描述，不是真的函数）
tools = [{
    'type': 'function',
    'function': {
        'name': 'get_weather',
        'description': '查询某个城市当前的天气，返回温度和天气状况',
        'parameters': {
            'type': 'object',
            'properties': {
                'city': {'type': 'string', 'description': '城市名，例如 北京'},
            },
            'required': ['city'],
        },
    },
}]

messages = [{'role': 'user', 'content': '北京今天几度？'}]

# 2. 第一次调用：模型只会产出「调用意图」，不会真的去查
resp = client.chat.completions.create(
    model='gpt-4o-mini', messages=messages, tools=tools,
)
msg = resp.choices[0].message
messages.append(msg)              # 把模型这条带 tool_calls 的消息也存进历史

# 3. 真正执行工具的是你的代码
import json
for call in msg.tool_calls:
    args = json.loads(call.function.arguments)   # {'city': '北京'}
    result = real_get_weather(args['city'])      # 这才是真去查天气的函数
    messages.append({
        'role': 'tool',
        'tool_call_id': call.id,                 # 把结果对应回那次调用
        'content': json.dumps(result, ensure_ascii=False),
    })

# 4. 把工具结果回灌，模型再生成最终的自然语言答复
final = client.chat.completions.create(
    model='gpt-4o-mini', messages=messages, tools=tools,
)
print(final.choices[0].message.content)   # 北京今天 26 度，晴。`

const miniAgentCode = `import json
from openai import OpenAI

client = OpenAI()

# ---- 工具契约：告诉模型有哪些工具、怎么用 ----
TOOLS = [{
    'type': 'function',
    'function': {
        'name': 'get_weather',
        'description': '查询某城市当前天气，返回温度（摄氏度）与状况',
        'parameters': {
            'type': 'object',
            'properties': {'city': {'type': 'string', 'description': '城市名'}},
            'required': ['city'],
        },
    },
}]

# ---- 工具的真实实现：由你的代码负责执行 ----
def get_weather(city):
    fake_db = {'北京': {'temp': 26, 'sky': '晴'}, '上海': {'temp': 29, 'sky': '多云'}}
    return fake_db.get(city, {'error': '没有该城市数据'})

REGISTRY = {'get_weather': get_weather}

def run_agent(question, max_iterations=5):
    messages = [{'role': 'user', 'content': question}]
    for _ in range(max_iterations):
        resp = client.chat.completions.create(
            model='gpt-4o-mini', messages=messages, tools=TOOLS,
        )
        msg = resp.choices[0].message
        messages.append(msg)

        # 没有工具调用，说明模型给出了最终答复 → 退出循环
        if not msg.tool_calls:
            return msg.content

        # 有工具调用：逐个执行，把观察结果回灌
        for call in msg.tool_calls:
            fn = REGISTRY[call.function.name]
            args = json.loads(call.function.arguments)
            result = fn(**args)
            messages.append({
                'role': 'tool',
                'tool_call_id': call.id,
                'content': json.dumps(result, ensure_ascii=False),
            })
    return '超过最大轮数仍未得到答案'

print(run_agent('北京今天几度？'))`

const wrongFlowCode = `# 反面教材：这是新手最常见的「断裂历史」写法，会让模型困惑甚至报错。
resp = client.chat.completions.create(model='gpt-4o-mini', messages=messages, tools=tools)
msg = resp.choices[0].message

# ❌ 错误：直接把工具结果塞进去，却没先把模型那条 tool_calls 消息加回历史
result = real_get_weather('北京')
messages.append({'role': 'tool', 'content': str(result)})   # 缺 tool_call_id！
# 模型看到一条凭空冒出来的 tool 结果，前面却没有对应的 tool_calls，历史对不上。

# ✅ 正确：先 append(msg)，再 append 带 tool_call_id 的结果
messages.append(msg)                                         # 1) 模型的调用意图
for call in msg.tool_calls:                                  # 2) 逐个工具结果
    messages.append({
        'role': 'tool',
        'tool_call_id': call.id,                             # 必须能对应回那次调用
        'content': str(real_get_weather('北京')),
    })`

export default function Ch4_1() {
  return (
    <>
      <Lead>
        <p>
          上一卷我们反复强调：模型唯一会做的事是 next-token prediction，它不联网、不查库、参数是冻结的。
          那它怎么可能帮你「查天气」「下订单」「跑一段代码」？答案是：它<strong>自己做不到</strong>。
          模型能做的，只是生成一段「我想调用某个工具、参数是这些」的结构化意图，叫 <em>tool call</em>；
          真正动手执行的，永远是你写的代码。
        </p>
      </Lead>

      <h2>一条清晰的边界：意图归模型，执行归你</h2>
      <p>
        给模型接上工具，常被说成「让模型能调用函数」，这个说法会误导人。更准确的描述是：你在请求里附上一份
        <strong>工具清单</strong>（每个工具的名字、用途、参数格式），模型在生成时如果判断该用某个工具，就不会直接吐答案，
        而是吐出一段 <code>tool_call</code>——里面是它选中的工具名和它填好的参数（一段 JSON）。
      </p>
      <p>
        这段 <code>tool_call</code> 本身没有任何执行力，它只是文字。<strong>是你的程序</strong>读到这段意图，去调用真实的
        函数、API 或数据库，拿到结果，再把结果作为一条新消息塞回对话历史，让模型接着往下生成。这一整套约定，
        OpenAI 叫 <em>function calling</em>，更通用的思想框架叫 <em>ReAct</em>（Reason + Act，推理与行动交替）。
      </p>
      <p>
        从底层看，「工具调用」并不是模型多了什么新能力，它本质上还是 next-token prediction。训练时模型见过大量
        「在这种 prompt 下，下一步该输出一段调用某工具的结构化文本」的样本，于是学会了在合适的时机生成这种格式的 token。
        所谓 <code>tool_calls</code> 字段，只是 API 把模型吐出的那段特殊格式文本<strong>解析成了结构化对象</strong>方便你读取而已。
        理解这一点能消除很多误解：模型没有「真的在调用」什么，它只是在「预测此处应该出现一段调用意图」。这也解释了为什么
        它填的参数会出错、会幻觉——因为那终究是生成出来的，不是计算出来的。
      </p>

      <h3>为什么非要绕这一圈</h3>
      <p>
        因为模型的能力天然有边界：它不知道「今天」是哪天，不知道你数据库里有什么，更不能替你扣款。
        而这些事，一段普通代码轻轻松松就能做。于是分工变得自然——模型负责<strong>判断该做什么、参数填什么</strong>
        （它擅长理解自然语言、做决策），你的代码负责<strong>真正去做</strong>（确定性、可控、可审计）。工具调用就是把这两半拼起来的协议。
      </p>

      <Example title="“北京今天几度” 走完整一轮">
        <p>一次工具调用，对话历史里其实经历了四步，缺一不可：</p>
        <ul>
          <li>
            <strong>① 用户提问</strong>：messages 里只有一条 <code>{'{role: user, content: 北京今天几度？}'}</code>。
          </li>
          <li>
            <strong>② 模型产出意图</strong>：模型发现自己不知道天气，于是不直接回答，而是返回一条带
            <code>tool_calls</code> 的消息——<code>get_weather(city=北京)</code>。注意此刻天气还没被查到。
          </li>
          <li>
            <strong>③ 你的代码执行</strong>：程序解析出工具名和参数，真正调用 <code>real_get_weather(北京)</code>，
            拿到 <code>{'{temp: 26, sky: 晴}'}</code>，把它作为一条 <code>role=tool</code> 的消息追加进 messages。
          </li>
          <li>
            <strong>④ 模型给最终答复</strong>：带着工具结果再调用一次模型，这次它有了真实数据，生成
            「北京今天 26 度，晴」。
          </li>
        </ul>
      </Example>

      <CodeBlock lang="python" title="one_turn.py" code={oneTurnCode} />

      <KeyIdea title="模型产出的是意图，不是结果">
        <p>
          把这句话刻进脑子：模型返回 <code>tool_call</code> 那一刻，<strong>工具还没有被执行</strong>。
          它只是说「我建议调用 get_weather，参数是北京」。是否执行、怎么执行、出错怎么办，全在你的代码里。
          所以一个 Agent 的可靠性，绝大部分不取决于模型多聪明，而取决于<strong>你这层执行代码写得多稳</strong>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="三个新手必踩的坑">
        <p>这三件事不做对，工具调用根本跑不起来：</p>
        <ul>
          <li>
            <strong>忘了把模型那条 tool_calls 消息也加回 messages</strong>——只加工具结果会让历史「断裂」，
            模型会困惑甚至报错。带 <code>tool_call_id</code> 的结果必须能对应上前面那次调用。
          </li>
          <li>
            <strong>把模型填的参数当成可信输入</strong>——参数是模型「生成」出来的文本，可能格式错、值越界、甚至是幻觉，
            执行前必须校验（第 2、4 章会细讲）。
          </li>
          <li>
            <strong>只调一次模型就结束</strong>——工具结果回灌后，要再调一次模型才能拿到自然语言答复；
            多步任务还得循环（第 3 章）。
          </li>
        </ul>
      </Callout>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        理解了「意图与执行分离」，你就抓住了 Agent 工程的骨架：所谓 Agent，不过是一个
        <strong>「调模型 → 解析意图 → 执行工具 → 回灌结果 → 再调模型」的循环</strong>。模型是循环里的「决策中枢」，
        工具是它伸向真实世界的「手」，而循环本身、错误处理、安全校验都是你的工程活儿。后面几章——工具契约怎么写、
        循环怎么控、出错怎么兜底——讲的全是这层代码该怎么写稳。
      </p>

      <Practice title="写一个最小可跑的 Agent">
        <p>
          下面是一个完整的最小 Agent：定义工具契约、提供真实实现、用一个 ReAct 风格的 while/for 循环把
          「调模型—执行—回灌」串起来，直到模型不再请求工具、给出最终答复为止。先看懂每一步在 messages 里加了什么。
        </p>
        <CodeBlock lang="python" title="mini_agent.py" code={miniAgentCode} />
        <p>
          试着加一个 <code>get_time</code> 工具，再问它「北京现在几度、几点了」，观察它是否会在一轮里同时
          请求两个工具，或者分两轮依次请求——这取决于模型的判断，而你的循环要能从容应对两种情况。
        </p>
      </Practice>

      <Summary
        points={[
          '模型本身做不到「查天气、下订单」，它只能生成一段结构化的调用意图 tool_call。',
          '真正执行工具的是你的代码：解析意图 → 调用真实函数/API → 把结果回灌进 messages。',
          '一次完整调用有四步：用户提问 → 模型产出 tool_call → 代码执行并追加 tool 消息 → 模型给最终答复。',
          'tool_call 那一刻工具还没执行；模型填的参数是生成的文本，执行前必须校验，不可轻信。',
          '别忘了把模型的 tool_calls 消息和带 tool_call_id 的结果都加回历史，否则对话会断裂。',
          'Agent 的本质就是「调模型 → 执行工具 → 回灌 → 再调模型」的循环，可靠性主要靠你这层代码。',
        ]}
      />
    </>
  )
}
