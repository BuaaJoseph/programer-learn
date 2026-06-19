import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const messagesShape = `# 大模型 API 的核心是一个"对话消息列表"
messages = [
    {"role": "system", "content": "你是一个简洁的中文助手。"},   # 设定人设
    {"role": "user", "content": "用一句话介绍 Python。"},          # 用户说的话
]
# 模型会读完整个列表，然后续上一条 {"role": "assistant", "content": "..."}`

const installSdk = `# 百炼提供 OpenAI 兼容接口，所以直接用官方 openai SDK 即可
pip install openai`

const exportKey = `# 把 API Key 存进环境变量，绝不写进代码！
export DASHSCOPE_API_KEY="sk-你的真实密钥"

# 验证一下（Linux / macOS）
echo $DASHSCOPE_API_KEY`

const firstCall = `import os
from openai import OpenAI

# 用环境变量读 key；base_url 指向百炼的 OpenAI 兼容端点
client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

resp = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {"role": "system", "content": "你是一个简洁的中文助手。"},
        {"role": "user", "content": "用一句话介绍 Python。"},
    ],
)

# 取出模型回复的文本
print(resp.choices[0].message.content)`

const firstCallResult = `Python 是一门语法简洁、易学好用的通用编程语言，广泛用于数据分析、人工智能和 Web 开发。`

const getReply = `# 回复藏在 choices[0].message.content 里
reply = resp.choices[0].message.content
print(reply)

# 还能看本次用了多少 token（用来估算费用）
print("输入 token:", resp.usage.prompt_tokens)
print("输出 token:", resp.usage.completion_tokens)`

const safeKey = `import os

# 正确：从环境变量读取，代码里看不到密钥
api_key = os.environ["DASHSCOPE_API_KEY"]

# 更稳妥：用 os.getenv，没设置时返回 None 而不是直接报错
api_key = os.getenv("DASHSCOPE_API_KEY")
if not api_key:
    raise RuntimeError("请先设置环境变量 DASHSCOPE_API_KEY")`

const badKey = `# 千万别这样！硬编码密钥，一旦提交到 Git 就泄露了
client = OpenAI(api_key="sk-1234567890abcdef")   # ❌ 危险`

const multiTurn = `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 维护一个 messages 列表，就是"多轮对话"的全部秘密
messages = [
    {"role": "system", "content": "你是一个友好的中文助手，回答简洁。"},
]

def ask(question):
    messages.append({"role": "user", "content": question})   # 1. 加入用户提问
    resp = client.chat.completions.create(
        model="qwen-plus",
        messages=messages,                                    # 2. 把完整历史发过去
    )
    answer = resp.choices[0].message.content
    messages.append({"role": "assistant", "content": answer}) # 3. 把回复也存回历史
    return answer

print(ask("我叫小明，今年 18 岁。"))
print(ask("我多大了？"))     # 模型能记住，因为历史里有上一轮`

const multiTurnResult = `你好小明！很高兴认识你。
你今年 18 岁。`

const chatLoop = `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

messages = [{"role": "system", "content": "你是一个友好的中文助手。"}]

print("开始聊天（输入 q 退出）")
while True:
    user_input = input("你：")
    if user_input == "q":
        break
    messages.append({"role": "user", "content": user_input})
    try:
        resp = client.chat.completions.create(model="qwen-plus", messages=messages)
        answer = resp.choices[0].message.content
        messages.append({"role": "assistant", "content": answer})
        print("助手：", answer)
    except Exception as e:
        print("出错了：", e)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章学会了发 HTTP 请求，这一章就用它来做一件激动人心的事：<strong>调用大模型</strong>。
        我们用阿里云百炼（Qwen）作后端，借助它的 OpenAI 兼容接口，几行代码就能和大模型对话。
        本章讲清楚：大模型 API 长什么样、如何用环境变量安全保管密钥、怎么发一次对话、
        怎么维护一个 <code>messages</code> 列表实现<strong>多轮对话</strong>——全程给可运行的完整代码。
      </Lead>

      <h2>一、大模型 API 长什么样</h2>
      <p>
        大模型对话 API 的核心，是一个<strong>消息列表</strong>。每条消息有 <code>role</code>（角色）
        和 <code>content</code>（内容）。你把对话历史发过去，模型读完后续上一条它的回复。
      </p>
      <CodeBlock lang="python" title="messages 的结构" code={messagesShape} />
      <table>
        <thead>
          <tr><th>role</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td><code>system</code></td><td>系统设定，定义助手的人设、风格、规则（放在最前）</td></tr>
          <tr><td><code>user</code></td><td>用户说的话</td></tr>
          <tr><td><code>assistant</code></td><td>模型之前的回复（多轮时要带上）</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        记住这一点：和大模型对话，本质就是<strong>不断往 messages 列表里追加消息，再整个发过去</strong>。
        模型本身不"记得"任何东西——它的"记忆"全靠你每次把历史一起带上。
      </KeyIdea>

      <h2>二、准备工作</h2>
      <h3>安装 SDK</h3>
      <p>百炼兼容 OpenAI 接口，所以直接用官方 <code>openai</code> 库最省事。</p>
      <CodeBlock lang="bash" title="安装 openai" code={installSdk} />

      <h3>安全保管 API Key</h3>
      <p>
        从百炼控制台拿到 API Key 后，<strong>存进环境变量</strong>，代码里只读环境变量。
        这样密钥不会出现在源码中，也不会被误提交到 Git。
      </p>
      <CodeBlock lang="bash" title="导出环境变量" code={exportKey} />
      <Callout variant="warn" title="绝对不要硬编码密钥">
        把 <code>sk-</code> 开头的密钥直接写进代码、提交到 Git，是最常见也最危险的错误——
        一旦泄露，别人可以盗刷你的额度。永远用环境变量。
      </Callout>
      <CodeBlock lang="python" title="反面教材（别学）" code={badKey} />
      <p>正确做法是用 <code>os.getenv</code> 读取，并在缺失时给出友好提示：</p>
      <CodeBlock lang="python" title="安全读取密钥" code={safeKey} />

      <h2>三、发出第一次对话</h2>
      <p>下面是一段完整、可直接运行的代码。它把 <code>base_url</code> 指向百炼端点，发一条消息并打印回复。</p>
      <CodeBlock lang="python" title="first_chat.py" code={firstCall} />
      <CodeBlock lang="text" title="运行结果" code={firstCallResult} />
      <Example title="逐行看懂">
        <ul>
          <li><code>OpenAI(api_key=..., base_url=...)</code>：创建客户端。<code>base_url</code> 是把请求转向百炼的关键，结尾 <code>/v1</code> 不能少。</li>
          <li><code>model="qwen-plus"</code>：选用的模型。想更强用 <code>qwen-max</code>，更快更省用 <code>qwen-turbo</code>。</li>
          <li><code>messages=[...]</code>：本次对话的消息列表，system 设人设、user 是提问。</li>
          <li><code>resp.choices[0].message.content</code>：模型回复就藏在这里。</li>
        </ul>
      </Example>

      <h2>四、读取回复</h2>
      <p>
        回复永远在 <code>choices[0].message.content</code>。<code>choices</code> 是个列表
        （API 允许一次返回多个候选回复），通常取第 0 个。<code>usage</code> 里还能看到 token 用量。
      </p>
      <CodeBlock lang="python" title="取回复与 token 用量" code={getReply} />

      <h2>五、多轮对话：维护 messages 列表</h2>
      <p>
        模型不会自己记住上一句。要让它"记得"，每次请求都得把<strong>完整的对话历史</strong>带上。
        做法就是：把用户提问和模型回复，都<strong>追加进同一个 messages 列表</strong>。
      </p>
      <CodeBlock lang="python" title="multi_turn.py" code={multiTurn} />
      <CodeBlock lang="text" title="运行结果" code={multiTurnResult} />
      <KeyIdea>
        多轮对话的三步循环：① 把用户输入 append 进 messages；② 整个 messages 发给模型；
        ③ 把模型回复也 append 回 messages。下一轮历史就完整了，模型自然"记得"前文。
      </KeyIdea>
      <Callout variant="note" title="历史会越来越长">
        消息越积越多，token 用量（和费用）也会上涨，太长还可能超出模型上限。
        真实应用里常需要裁剪或总结旧历史——这是后话，先理解机制。
      </Callout>

      <h2>六、做一个能聊天的小程序</h2>
      <p>
        把多轮逻辑放进一个 <code>while</code> 循环，就是一个命令行聊天机器人了。
        加上异常处理，网络抖动也不至于直接崩溃。
      </p>
      <CodeBlock lang="python" title="chat_bot.py" code={chatLoop} />
      <p>
        运行后你就能在终端里和 Qwen 连续对话，输入 <code>q</code> 退出。
        这短短二十几行，已经是一个完整可用的对话程序了。
      </p>

      <Practice title="练一练">
        给上面的聊天程序加一个命令：当用户输入 <code>clear</code> 时，
        把 messages 重置成只剩 system 那一条（即"清空对话历史，重新开始"），并提示"已清空"。
      </Practice>

      <Callout variant="tip" title="承上启下">
        现在你已经能自如地调用大模型了。但目前模型只能"说"，不能"做事"——它没法查天气、算数、查数据库。
        下一卷我们会让模型学会<strong>调用工具</strong>，从一个"会聊天的模型"进化成一个"会办事的 Agent"。
      </Callout>

      <Summary
        points={[
          '大模型对话 API 的核心是 messages 列表，每条含 role（system/user/assistant）和 content；模型读完历史续上 assistant 回复。',
          '模型本身无记忆，"记忆"靠你每次把完整历史一起发过去。',
          'pip install openai；用环境变量 DASHSCOPE_API_KEY 保管密钥，os.getenv 读取，绝不硬编码进代码。',
          'base_url 指向百炼 OpenAI 兼容端点 https://dashscope.aliyuncs.com/compatible-mode/v1（结尾 /v1 必带），model 用 qwen-plus。',
          '回复在 resp.choices[0].message.content；resp.usage 看 token 用量。',
          '多轮对话三步：用户输入 append 进 messages → 整体发给模型 → 回复 append 回 messages，循环即得聊天机器人。',
        ]}
      />
    </article>
  )
}
