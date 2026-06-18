import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const crashDemo = `# 没有异常处理：一出错，程序直接崩溃停掉
num = int(input("输入一个整数："))   # 用户输入 "abc"
print(num * 2)`

const crashResult = `输入一个整数：abc
Traceback (most recent call last):
  File "demo.py", line 1, in <module>
    num = int(input("输入一个整数："))
ValueError: invalid literal for int() with base 10: 'abc'`

const tryExcept = `try:
    num = int(input("输入一个整数："))
    print("它的两倍是", num * 2)
except ValueError:
    print("这不是一个整数，请重试！")`

const tryExceptResult = `输入一个整数：abc
这不是一个整数，请重试！`

const fullStructure = `try:
    age = int(input("年龄："))
    result = 100 // age          # 可能除以零
except ValueError:
    print("请输入数字")           # 转换失败时执行
except ZeroDivisionError:
    print("年龄不能为 0")          # 除零时执行
else:
    print("没出错，结果是", result)  # try 顺利跑完才执行
finally:
    print("无论如何都会执行（常用来收尾）")`

const commonErrors = `# ValueError：值不对（比如把字母转成 int）
int("abc")

# KeyError：字典里没有这个键
{"a": 1}["b"]

# IndexError：列表越界
[1, 2, 3][10]

# FileNotFoundError：文件不存在
open("不存在.txt")

# TypeError：类型用错了
"abc" + 5`

const raiseDemo = `def set_age(age):
    if age < 0:
        raise ValueError("年龄不能为负数")   # 主动抛出异常
    return age

try:
    set_age(-5)
except ValueError as e:
    print("出错了：", e)`

const raiseResult = `出错了： 年龄不能为负数`

const customError = `# 自定义异常：继承 Exception 即可
class NotEnoughMoneyError(Exception):
    pass

def withdraw(balance, amount):
    if amount > balance:
        raise NotEnoughMoneyError(f"余额不足：有 {balance}，想取 {amount}")
    return balance - amount

try:
    withdraw(100, 200)
except NotEnoughMoneyError as e:
    print(e)`

const customErrorResult = `余额不足：有 100，想取 200`

const jsonBasics = `import json

# Python 对象 -> JSON 字符串：dumps（dump string）
data = {"name": "小明", "age": 18, "hobbies": ["篮球", "编程"]}
text = json.dumps(data, ensure_ascii=False)   # ensure_ascii=False 保留中文
print(text)

# JSON 字符串 -> Python 对象：loads（load string）
obj = json.loads(text)
print(obj["name"], obj["hobbies"][0])`

const jsonBasicsResult = `{"name": "小明", "age": 18, "hobbies": ["篮球", "编程"]}
小明 篮球`

const jsonFile = `import json

data = {"name": "小红", "scores": [90, 85, 99]}

# 写 JSON 到文件：dump（注意没有 s）
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 从文件读 JSON：load（注意没有 s）
with open("data.json", "r", encoding="utf-8") as f:
    obj = json.load(f)
print(obj["scores"])`

const jsonFileResult = `[90, 85, 99]`

const jsonFileContent = `{
  "name": "小红",
  "scores": [
    90,
    85,
    99
  ]
}`

const apiContext = `# 调用大模型 / 网络 API 时，请求和返回几乎都是 JSON
import json

# 你发出去的请求体（Python 字典 -> JSON）
payload = {
    "model": "qwen-plus",
    "messages": [{"role": "user", "content": "你好"}],
}
body = json.dumps(payload)

# 收到的回复（JSON 字符串 -> Python 字典，再取字段）
resp_text = '{"reply": "你好！有什么可以帮你？"}'
resp = json.loads(resp_text)
print(resp["reply"])`

const robustRead = `import json

def load_config(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"找不到 {path}，用默认配置")
        return {"theme": "light"}
    except json.JSONDecodeError:
        print(f"{path} 不是合法 JSON，用默认配置")
        return {"theme": "light"}

print(load_config("settings.json"))`

export default function Ch2() {
  return (
    <article>
      <Lead>
        程序运行时难免出错：用户输入了奇怪的东西、要读的文件不存在、网络断了……
        如果不管，程序就直接崩溃。这一章学<strong>异常处理</strong>，让程序遇到错误时优雅应对而不是死掉；
        再学 <strong>JSON</strong>——它是程序之间、尤其是和网络 API 打交道时交换数据的通用格式，
        后面调用大模型 API 全靠它。
      </Lead>

      <h2>一、为什么需要异常处理</h2>
      <p>先看一段没有保护的代码。如果用户不输入数字，会发生什么？</p>
      <CodeBlock lang="python" title="没有保护的代码" code={crashDemo} />
      <CodeBlock lang="text" title="运行结果（崩溃）" code={crashResult} />
      <p>
        程序直接报错停掉，后面的代码再也没机会执行。在真实程序里这很糟糕——
        我们希望即使出错，程序也能给个友好提示、继续运行。这就是异常处理要解决的事。
      </p>

      <h2>二、try-except：捕获错误</h2>
      <p>
        把"可能出错"的代码放进 <code>try</code>，把"出错后怎么办"放进 <code>except</code>。
      </p>
      <CodeBlock lang="python" title="用 try-except 兜住错误" code={tryExcept} />
      <CodeBlock lang="text" title="运行结果（不再崩溃）" code={tryExceptResult} />
      <KeyIdea>
        <code>try</code> 里的代码一旦出错，Python 立刻跳到 <code>except</code> 去处理，
        而不是让整个程序崩溃。处理完，程序继续往下走。
      </KeyIdea>

      <h2>三、捕获具体的异常类型</h2>
      <p>
        不同的错误有不同的"类型"（异常类）。最好<strong>按类型分别处理</strong>，
        而不是笼统地抓所有错误——这样你才知道到底哪里出了问题。
      </p>
      <CodeBlock lang="python" title="常见异常类型" code={commonErrors} />
      <table>
        <thead>
          <tr><th>异常</th><th>什么时候出现</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ValueError</code></td><td>值不合法，如 <code>int("abc")</code></td></tr>
          <tr><td><code>KeyError</code></td><td>字典里没有要的键</td></tr>
          <tr><td><code>IndexError</code></td><td>列表 / 字符串下标越界</td></tr>
          <tr><td><code>FileNotFoundError</code></td><td>要打开的文件不存在</td></tr>
          <tr><td><code>TypeError</code></td><td>类型不匹配，如字符串加数字</td></tr>
          <tr><td><code>ZeroDivisionError</code></td><td>除以 0</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="别用裸 except">
        直接写 <code>except:</code> 会吞掉所有错误（包括你写错代码导致的 bug），
        让问题更难发现。尽量写明具体类型，如 <code>except ValueError:</code>。
      </Callout>

      <h2>四、完整结构：try-except-else-finally</h2>
      <p>除了 try 和 except，还有两个可选部分：</p>
      <ul>
        <li><strong>else</strong>：<code>try</code> 没出错时执行。</li>
        <li><strong>finally</strong>：无论出不出错<strong>都会</strong>执行，常用来做收尾（关文件、断连接）。</li>
      </ul>
      <CodeBlock lang="python" title="四件套" code={fullStructure} />

      <h2>五、raise：主动抛出异常</h2>
      <p>
        异常不只是 Python 抛给你——你也可以在自己的代码里用 <code>raise</code> 主动抛出，
        告诉调用者"这个输入不对"。用 <code>as e</code> 还能拿到异常对象，读出错误信息。
      </p>
      <CodeBlock lang="python" title="用 raise 抛出异常" code={raiseDemo} />
      <CodeBlock lang="text" title="运行结果" code={raiseResult} />

      <h3>自定义异常</h3>
      <p>
        内置异常不够用时，可以定义自己的异常类型——只要<strong>继承 Exception</strong> 即可。
        这样错误的含义更清晰。
      </p>
      <CodeBlock lang="python" title="自定义异常" code={customError} />
      <CodeBlock lang="text" title="运行结果" code={customErrorResult} />

      <Practice title="练一练">
        写一个 <code>safe_divide(a, b)</code>，正常返回 <code>a / b</code>；
        当 <code>b</code> 为 0 时捕获 <code>ZeroDivisionError</code> 并返回字符串 <code>"不能除以零"</code>。
      </Practice>

      <h2>六、JSON：和 API 打交道的通用语言</h2>
      <p>
        JSON 是一种文本格式，长得很像 Python 的字典和列表。几乎所有网络 API
        （包括大模型 API）发送和接收的数据都是 JSON。Python 用内置 <code>json</code> 模块处理它。
      </p>
      <KeyIdea>
        记住四个名字：<code>dumps</code> / <code>loads</code> 处理<strong>字符串</strong>（带 s），
        <code>dump</code> / <code>load</code> 处理<strong>文件</strong>（不带 s）。
        "dump"= 把 Python 对象倒成 JSON，"load"= 把 JSON 装回 Python 对象。
      </KeyIdea>

      <h3>对象与字符串互转</h3>
      <CodeBlock lang="python" title="dumps / loads" code={jsonBasics} />
      <CodeBlock lang="text" title="运行结果" code={jsonBasicsResult} />
      <Callout variant="tip" title="中文别变 \u">
        <code>json.dumps</code> 默认会把中文转成 <code>{'\\uXXXX'}</code> 的形式。
        加上 <code>ensure_ascii=False</code> 就能保留原样的中文，更可读。
      </Callout>

      <h3>读写 JSON 文件</h3>
      <CodeBlock lang="python" title="dump / load 配合文件" code={jsonFile} />
      <CodeBlock lang="text" title="运行结果" code={jsonFileResult} />
      <p><code>indent=2</code> 让写出的文件带缩进、更好看：</p>
      <CodeBlock lang="json" title="data.json 的内容" code={jsonFileContent} />

      <h2>七、为什么这是 API 的基础</h2>
      <p>
        把异常处理和 JSON 放在一起讲不是巧合——它们是调用网络 API 的两块基石：
        请求和回复都是 JSON，而网络请求又随时可能出错（断网、超时、返回格式不对）。
      </p>
      <CodeBlock lang="python" title="预览：API 交互就是 JSON 进出" code={apiContext} />
      <Example title="健壮地读一个 JSON 配置文件">
        <p>真实程序里，读文件常常要同时防两种错：文件不存在、文件内容不是合法 JSON。</p>
        <CodeBlock lang="python" title="带异常处理的配置读取" code={robustRead} />
        <p>
          这正是后面调用大模型 API 时反复出现的模式：<strong>把可能出错的网络 / 解析操作放进 try，
          按类型处理失败</strong>，程序才不会因为一次意外就整个崩掉。
        </p>
      </Example>

      <Summary
        points={[
          '不处理异常，程序一出错就崩溃；用 try-except 把可能出错的代码兜住，出错后优雅应对。',
          '按具体类型捕获：ValueError / KeyError / IndexError / FileNotFoundError / TypeError 等；别用裸 except 吞掉所有错误。',
          '完整结构 try-except-else-finally：else 在没出错时跑，finally 无论如何都跑（用于收尾）。',
          '用 raise 主动抛异常；继承 Exception 可定义自己的异常类型，用 except ... as e 拿到错误信息。',
          'JSON 是 API 通信的通用格式：dumps/loads 处理字符串、dump/load 处理文件；中文加 ensure_ascii=False。',
          '调用网络 / 大模型 API = 收发 JSON + 防错处理，这一章是后续 API 编程的基础。',
        ]}
      />
    </article>
  )
}
