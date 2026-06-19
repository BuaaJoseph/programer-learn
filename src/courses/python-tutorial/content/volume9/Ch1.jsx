import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const installReq = `# requests 不是内置库，先安装
pip install requests`

const getBasic = `import requests

# 最简单的 GET 请求：去一个测试 API 取数据
resp = requests.get("https://httpbin.org/get")

print(resp.status_code)   # 状态码：200 表示成功
print(resp.json())        # 把返回的 JSON 解析成 Python 字典`

const getBasicResult = `200
{'args': {}, 'headers': {...}, 'url': 'https://httpbin.org/get'}`

const getParams = `import requests

# GET 带查询参数：用 params 传字典，自动拼成 ?key=value
resp = requests.get(
    "https://httpbin.org/get",
    params={"city": "杭州", "days": 3},
)

print(resp.url)                  # 看看最终请求的完整地址
print(resp.json()["args"])       # 服务器收到的参数`

const getParamsResult = `https://httpbin.org/get?city=%E6%9D%AD%E5%B7%9E&days=3
{'city': '杭州', 'days': '3'}`

const postJson = `import requests

# POST 带 JSON：用 json= 传字典，requests 自动序列化并设好请求头
resp = requests.post(
    "https://httpbin.org/post",
    json={"name": "小明", "age": 18},
)

data = resp.json()
print(data["json"])      # 服务器收到的 JSON 内容`

const postJsonResult = `{'name': '小明', 'age': 18}`

const headersDemo = `import requests

# 设置请求头：常用于带认证 token、声明数据格式
headers = {
    "Authorization": "Bearer sk-你的token",
    "User-Agent": "my-app/1.0",
}
resp = requests.get("https://httpbin.org/headers", headers=headers)
print(resp.json()["headers"]["User-Agent"])`

const headersResult = `my-app/1.0`

const statusDemo = `import requests

resp = requests.get("https://httpbin.org/status/404")

print(resp.status_code)        # 404
print(resp.ok)                 # status_code < 400 时为 True

# 常见状态码：
# 200 成功   201 创建成功   400 请求错误
# 401 未认证  403 禁止访问   404 找不到   500 服务器错误`

const statusResult = `404
False`

const timeoutErr = `import requests

try:
    # timeout：超过 5 秒没响应就放弃，避免程序卡死
    resp = requests.get("https://httpbin.org/delay/10", timeout=5)
    resp.raise_for_status()        # 状态码 >= 400 时主动抛异常
    print(resp.json())
except requests.exceptions.Timeout:
    print("请求超时了！")
except requests.exceptions.HTTPError as e:
    print("服务器返回了错误状态：", e)
except requests.exceptions.RequestException as e:
    print("请求出错：", e)`

const timeoutResult = `请求超时了！`

const fullExample = `import requests

# 调用一个公开 API：随机获取一条"猫咪小知识"（无需 key）
def get_cat_fact():
    url = "https://catfact.ninja/fact"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()        # 4xx/5xx 直接抛异常
        data = resp.json()             # 解析 JSON 为字典
        return data["fact"]            # 取出我们要的字段
    except requests.exceptions.RequestException as e:
        return f"请求失败：{e}"

if __name__ == "__main__":
    print("今日猫咪冷知识：")
    print(get_cat_fact())`

const fullResult = `今日猫咪冷知识：
Cats can jump up to six times their length.`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到这里，我们的程序终于要"上网"了。绝大多数有用的服务——天气、翻译、地图，
        当然还有大模型——都通过 <strong>HTTP API</strong> 对外提供。这一章学会用 Python 最流行的
        <code>requests</code> 库发请求：GET 取数据、POST 提交数据、带参数和请求头、
        看状态码、处理超时和异常，最后调一个真实的公开 API 跑通完整流程。
      </Lead>

      <h2>一、什么是 HTTP</h2>
      <p>
        HTTP 是浏览器、App 和服务器之间约定好的"对话规则"。你的程序作为<strong>客户端</strong>
        发出一个<strong>请求</strong>，服务器返回一个<strong>响应</strong>。请求里有：
      </p>
      <ul>
        <li><strong>方法</strong>：最常见 <code>GET</code>（取数据）和 <code>POST</code>（提交数据）。</li>
        <li><strong>URL</strong>：要访问的地址。</li>
        <li><strong>请求头（headers）</strong>：附加信息，如认证 token、数据格式。</li>
        <li><strong>请求体（body）</strong>：POST 时携带的数据，通常是 JSON。</li>
      </ul>
      <p>响应里则有<strong>状态码</strong>（成功还是失败）和<strong>响应体</strong>（返回的数据，多为 JSON）。</p>
      <KeyIdea>
        调 API 的本质就是：<strong>按规则发一个请求，拿回一个响应，从响应里取出你要的数据</strong>。
        后面调大模型 API，无非是请求体里装对话内容、响应里取回复——同一套流程。
      </KeyIdea>

      <h2>二、安装 requests</h2>
      <p>Python 内置也能发请求，但 <code>requests</code> 库更简单好用，是事实标准。</p>
      <CodeBlock lang="bash" title="安装 requests" code={installReq} />

      <h2>三、GET 请求：取数据</h2>
      <CodeBlock lang="python" title="最简单的 GET" code={getBasic} />
      <CodeBlock lang="text" title="运行结果" code={getBasicResult} />
      <p>
        <code>resp.status_code</code> 是状态码，<code>resp.json()</code> 把返回的 JSON
        直接解析成 Python 字典——这是最常用的两个操作。
      </p>

      <h3>带查询参数</h3>
      <p>
        GET 常带参数（如查哪个城市的天气）。用 <code>params</code> 传一个字典，
        requests 会自动拼成 <code>?city=杭州&days=3</code> 这样的形式，连中文转码都帮你做了。
      </p>
      <CodeBlock lang="python" title="GET 带参数" code={getParams} />
      <CodeBlock lang="text" title="运行结果" code={getParamsResult} />

      <h2>四、POST 请求：提交数据</h2>
      <p>
        提交数据用 POST。最常见的是发 JSON——用 <code>json=</code> 传字典，
        requests 自动把它序列化成 JSON 字符串，并设好对应的请求头。
      </p>
      <CodeBlock lang="python" title="POST 带 JSON" code={postJson} />
      <CodeBlock lang="text" title="运行结果" code={postJsonResult} />
      <Callout variant="tip" title="json= 和 data= 的区别">
        发 JSON 用 <code>json=字典</code>（自动序列化 + 设头）；发表单用 <code>data=字典</code>。
        调大模型 API 几乎都用 <code>json=</code>。
      </Callout>

      <h2>五、设置请求头</h2>
      <p>
        请求头携带附加信息。最常见的是 <code>Authorization</code>——很多 API（包括大模型）
        靠它来验证你的身份（带上 API Key / token）。
      </p>
      <CodeBlock lang="python" title="设置 headers" code={headersDemo} />
      <CodeBlock lang="text" title="运行结果" code={headersResult} />

      <h2>六、看懂状态码</h2>
      <p>
        状态码告诉你请求成功还是失败。<code>2xx</code> 成功，<code>4xx</code> 是你的请求有问题，
        <code>5xx</code> 是服务器出错。
      </p>
      <CodeBlock lang="python" title="检查状态码" code={statusDemo} />
      <CodeBlock lang="text" title="运行结果" code={statusResult} />
      <table>
        <thead>
          <tr><th>状态码</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>200 / 201</td><td>成功 / 创建成功</td></tr>
          <tr><td>400</td><td>请求格式错误</td></tr>
          <tr><td>401 / 403</td><td>未认证（key 错） / 被禁止</td></tr>
          <tr><td>404</td><td>地址找不到</td></tr>
          <tr><td>429</td><td>请求太频繁（限流）</td></tr>
          <tr><td>500</td><td>服务器内部错误</td></tr>
        </tbody>
      </table>

      <h2>七、超时与异常处理</h2>
      <p>
        网络随时可能出问题：服务器半天不回、地址错了、断网了。一定要设
        <strong>超时</strong>，并用 <code>try-except</code> 兜住异常，否则程序可能卡死或崩溃。
      </p>
      <CodeBlock lang="python" title="超时 + 异常处理" code={timeoutErr} />
      <CodeBlock lang="text" title="运行结果" code={timeoutResult} />
      <Callout variant="warn" title="永远设 timeout">
        不设 <code>timeout</code>，一旦对方不响应，你的程序会<strong>无限期卡住</strong>。
        任何真实的网络请求都应该带超时。
      </Callout>
      <p>
        <code>resp.raise_for_status()</code> 是个好习惯：状态码 ≥ 400 时它会主动抛
        <code>HTTPError</code>，让你在 except 里统一处理失败，而不用每次手动判断状态码。
      </p>

      <h2>八、完整实例：调一个公开 API</h2>
      <p>
        把前面所有要点串起来，调用一个无需 key 的公开 API（随机猫咪冷知识），
        包含超时、状态检查、JSON 解析、异常处理——这就是一个标准、健壮的 API 调用函数。
      </p>
      <CodeBlock lang="python" title="get_cat_fact.py" code={fullExample} />
      <CodeBlock lang="text" title="运行结果" code={fullResult} />
      <Example title="这个函数的标准套路">
        <ul>
          <li>请求统一带 <code>timeout</code>，防卡死。</li>
          <li><code>raise_for_status()</code> 把 HTTP 错误转成异常，集中处理。</li>
          <li><code>resp.json()</code> 解析，再按字段名取出需要的数据。</li>
          <li>用 <code>except RequestException</code> 兜住所有 requests 相关的网络异常。</li>
        </ul>
        <p>记住这套模板，下一章调大模型 API 时，你会发现结构几乎一模一样。</p>
      </Example>

      <Practice title="练一练">
        把 <code>get_cat_fact</code> 改成调用 <code>https://api.ipify.org?format=json</code>
        （返回你的公网 IP），取出 <code>data["ip"]</code> 打印。注意保留 timeout 和异常处理。
      </Practice>

      <Summary
        points={[
          'HTTP 调用 = 客户端发请求、服务器回响应；请求含方法/URL/headers/body，响应含状态码和数据。',
          'pip install requests；GET 取数据用 requests.get，POST 提交用 requests.post。',
          'GET 带参数用 params=字典；POST 发 JSON 用 json=字典（自动序列化并设头）。',
          'headers 携带附加信息，认证常用 Authorization 带 token / API Key。',
          'resp.status_code 看状态（200 成功、401 认证失败、404 找不到、429 限流、500 服务器错），resp.json() 解析返回。',
          '务必设 timeout 防卡死，用 try-except 兜住 RequestException，raise_for_status 把 HTTP 错误转异常——这套模板下一章调大模型 API 照用。',
        ]}
      />
    </article>
  )
}
