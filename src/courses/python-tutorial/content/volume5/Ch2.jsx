import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const pipInstallCode = `# 安装一个第三方库（以 requests 为例）
pip install requests

# 指定版本
pip install requests==2.32.0

# 升级到最新版
pip install --upgrade requests`

const pipListCode = `pip list        # 列出当前环境里已安装的所有库
pip show requests   # 看某个库的详细信息（版本、位置等）`
const pipListOut = `Package    Version
---------- -------
pip        24.0
requests   2.32.3
...`

const venvCreateCode = `# 1) 在项目文件夹里创建一个名为 venv 的虚拟环境
python -m venv venv

# 2) 激活它（不同系统命令不同）
# macOS / Linux：
source venv/bin/activate
# Windows（PowerShell）：
venv\\Scripts\\Activate.ps1`

const venvActiveCode = `# 激活成功后，命令行最前面会出现 (venv) 字样：
(venv) $ pip install requests   # 现在装的库只进这个环境

# 用完退出虚拟环境：
deactivate`

const reqCode = `# 把当前环境的所有库和版本导出到 requirements.txt
pip freeze > requirements.txt

# 别人拿到你的项目后，一键装齐所有依赖
pip install -r requirements.txt`

const reqFileOut = `certifi==2024.7.4
charset-normalizer==3.3.2
idna==3.7
requests==2.32.3
urllib3==2.2.2`

const requestsCode = `import requests   # 第三方库，需要先 pip install requests

resp = requests.get("https://httpbin.org/get")
print(resp.status_code)     # 200 表示请求成功
print(resp.json())          # 把返回的内容当作 JSON（字典）解析`
const requestsOut = `200
{'args': {}, 'headers': {...}, 'url': 'https://httpbin.org/get'}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        标准库已经很强，但真正让 Python 无所不能的，是社区贡献的海量<strong>第三方库</strong>——
        别人写好、你拿来即用。这一章讲怎么用 <code>pip</code> 安装它们、为什么强烈建议用
        <strong>虚拟环境</strong>把每个项目的依赖隔离开、怎么创建和激活虚拟环境、
        用 <code>requirements.txt</code> 记录依赖，最后用 <code>requests</code> 预告一下后面要用到的网络请求。
      </Lead>

      <h2>一、pip：Python 的「应用商店」</h2>
      <KeyIdea>
        <code>pip</code> 是 Python 自带的<strong>包管理工具</strong>，用来下载安装第三方库。
        它会从官方仓库 PyPI（Python Package Index）上把库下载到你的电脑。命令在<strong>终端</strong>里运行，不是在 Python 里。
      </KeyIdea>
      <CodeBlock lang="bash" title="安装第三方库" code={pipInstallCode} />
      <Callout variant="tip">
        如果 <code>pip</code> 命令不行，试试 <code>pip3</code>，或者用更稳妥的写法
        <code>python -m pip install requests</code>（明确用当前这个 Python 来装）。
      </Callout>
      <p>装完后，可以查看已安装了哪些库：</p>
      <CodeBlock lang="bash" title="查看已装的库" code={pipListCode} />
      <Example title="运行结果（节选）">
        <CodeBlock lang="text" title="运行结果" code={pipListOut} />
      </Example>
      <table>
        <thead>
          <tr><th>命令</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>pip install 库名</code></td><td>安装一个库</td></tr>
          <tr><td><code>pip install 库名==版本</code></td><td>安装指定版本</td></tr>
          <tr><td><code>pip uninstall 库名</code></td><td>卸载一个库</td></tr>
          <tr><td><code>pip list</code></td><td>列出已安装的库</td></tr>
          <tr><td><code>pip show 库名</code></td><td>查看某个库的详情</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="第三方库 vs 标准库">
        上一章的 os、math、random 是<strong>标准库</strong>——Python 自带、无需安装。
        而这一章要装的 requests、numpy、pandas 等是<strong>第三方库</strong>——别人写的、要先 pip install 才能用。
        两者都用 <code>import</code> 导入，区别只在于「要不要先装」。
      </Callout>

      <h2>二、为什么需要虚拟环境</h2>
      <p>
        想象你有两个项目：项目 A 需要某个库的 1.0 版，项目 B 需要它的 2.0 版。如果所有库都装在
        「同一个全局环境」里，这两个版本就会打架。<strong>虚拟环境</strong>就是为了解决这个问题。
      </p>
      <KeyIdea>
        虚拟环境是一个<strong>独立、隔离的 Python 环境</strong>。每个项目用自己的虚拟环境，
        在里面装的库只属于这个项目，互不干扰。这是 Python 开发的标准做法，强烈建议养成习惯。
      </KeyIdea>
      <Callout variant="warn" title="不用虚拟环境的后果">
        把所有库一股脑装进全局环境，时间久了会变成一锅粥：版本冲突、说不清哪个项目用了什么、
        难以在别人电脑上复现。一个项目一个虚拟环境，能避免绝大多数这类麻烦。
      </Callout>

      <h2>三、创建和激活虚拟环境</h2>
      <p>
        Python 自带的 <code>venv</code> 模块就能创建虚拟环境，三步走：创建、激活、使用。
      </p>
      <CodeBlock lang="bash" title="创建并激活虚拟环境" code={venvCreateCode} />
      <p>激活后，终端提示符前面会多出 <code>(venv)</code>，表示你现在「在虚拟环境里」：</p>
      <CodeBlock lang="bash" title="激活后的样子" code={venvActiveCode} />
      <p>
        理解一下这几步在干什么：<code>python -m venv venv</code> 会在当前文件夹里建一个叫 <code>venv</code> 的子文件夹，
        里面放着一份「独立的 Python」；<code>activate</code> 让你的终端切换到用这份独立 Python；
        之后所有 <code>pip install</code> 装的库都只进这个文件夹，不污染系统。<code>deactivate</code> 则切回正常状态。
      </p>
      <Callout variant="note" title="venv 文件夹不要提交">
        <code>venv</code>（虚拟环境文件夹）体积大、且和具体电脑相关，<strong>不应该</strong>提交到 Git 等版本库。
        通常会把它写进 <code>.gitignore</code> 忽略掉——真正要分享的是下面的 <code>requirements.txt</code>。
      </Callout>

      <h2>四、requirements.txt：记录项目依赖</h2>
      <p>
        一个项目用了哪些库、各自什么版本，记在一个 <code>requirements.txt</code> 文件里。
        这样换台电脑或别人接手时，一条命令就能把环境装得一模一样：
      </p>
      <CodeBlock lang="bash" title="导出与安装依赖" code={reqCode} />
      <p>生成的 <code>requirements.txt</code> 长这样（库名==版本号，一行一个）：</p>
      <Example title="requirements.txt 内容示例">
        <CodeBlock lang="text" title="requirements.txt" code={reqFileOut} />
      </Example>
      <Callout variant="tip">
        标准流程：进项目文件夹 → <code>python -m venv venv</code> 创建 → 激活 → <code>pip install</code> 装依赖
        → <code>pip freeze {'>'} requirements.txt</code> 记录。这套组合拳能让你的项目随时随地可复现。
      </Callout>

      <h2>五、用一个第三方库：requests 预告</h2>
      <p>
        <code>requests</code> 是最受欢迎的第三方库之一，用来发网络请求（访问网页、调用 API）。
        先 <code>pip install requests</code>，然后几行就能从网上拿数据：
      </p>
      <CodeBlock lang="python" title="requests 发一个请求" code={requestsCode} />
      <Example title="运行结果（节选）">
        <CodeBlock lang="text" title="运行结果" code={requestsOut} />
      </Example>
      <p>
        这里出现了 <code>.json()</code>、<code>.status_code</code> 这些「点号」用法——它们就是前面学过的
        对象方法和属性。可见前几章打下的基础，到了用真实库的时候全都用得上。
        每个第三方库都有自己的文档，遇到不会用的，去搜「库名 + 你想做的事」基本都能找到例子。
      </p>
      <table>
        <thead>
          <tr><th>常见第三方库</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>requests</code></td><td>发网络请求、调用 API</td></tr>
          <tr><td><code>numpy</code> / <code>pandas</code></td><td>数值计算、表格数据分析</td></tr>
          <tr><td><code>flask</code> / <code>django</code></td><td>搭建网站后端</td></tr>
          <tr><td><code>openai</code> 等</td><td>调用大模型，做 AI 应用与 Agent</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="这正是通往 AI Agent 的桥">
        后面学做 AI Agent 时，调用大模型的 API 本质上就是用 <code>requests</code> 这类工具向服务器发请求、拿回结果。
        你现在掌握的「装库 → 导入 → 调用」这套流程，就是接下来一切实战的基础。
      </Callout>

      <Practice title="动手练一练">
        <ol>
          <li>在一个新文件夹里用 <code>python -m venv venv</code> 创建虚拟环境并激活，观察提示符是否出现 (venv)。</li>
          <li>在虚拟环境里 <code>pip install requests</code>，再用 <code>pip list</code> 确认它装上了。</li>
          <li>运行本章的 requests 例子，把它打印出来的状态码和返回内容看一看；最后用 <code>pip freeze {'>'} requirements.txt</code> 导出依赖。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          'pip 是包管理工具（在终端运行），pip install 装库、pip list 看已装、pip show 看详情；命令不行可用 python -m pip。',
          '第三方库来自 PyPI，是 Python 强大的关键，装好后即可 import 使用。',
          '虚拟环境隔离每个项目的依赖，避免版本冲突——一个项目一个虚拟环境是标准做法。',
          'python -m venv venv 创建，source venv/bin/activate（Win 用 Scripts\\Activate.ps1）激活，deactivate 退出；venv 文件夹不提交。',
          'pip freeze > requirements.txt 导出依赖，pip install -r requirements.txt 一键复现环境。',
          'requests 是常用的网络请求库，调用大模型 API 也基于同类流程，是后续 Agent 实战的基础。',
        ]}
      />
    </article>
  )
}
