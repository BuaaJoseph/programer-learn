import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryHelloCode = `# 第一个程序：打个招呼，再算点小账
print("你好，Python！")
print("欢迎来到编程的世界～")

# Python 也是个好用的计算器
a = 12
b = 8
print("12 + 8 =", a + b)
print("12 * 8 =", a * b)
print("我今年", 2026 - 1991, "岁的 Python 陪你一起学")`

const checkVersionBash = `# 在终端（命令行）里输入下面这一行，回车
python --version

# 有些系统上 Python 3 的命令叫 python3
python3 --version`

const checkVersionOut = `Python 3.12.4`

const replStart = `# 在终端里直接输入 python（或 python3）回车，就进入了交互式环境
python`

const replSession = `>>> 1 + 1
2
>>> print("你好，Python")
你好，Python
>>> name = "小明"
>>> name
'小明'
>>> exit()`

export default function Ch1() {
  return (
    <article>
      <Lead>
        欢迎来到 Python 的世界！这一章我们先不写复杂的程序，而是把最基础的几件事讲清楚：
        Python 到底是什么、它能做什么、为什么这么火；怎么把它安装到你的电脑上；用什么软件来写代码；
        以及一个超级好用的「随写随试」工具——交互式 REPL。读完这一章，你的电脑就准备好开始学编程了。
      </Lead>

      <h2>一、Python 是什么</h2>
      <p>
        Python 是一门<strong>编程语言</strong>——也就是一套你用来「指挥电脑干活」的语言。
        你用它写下一行行指令，电脑就照着执行。它由荷兰人 Guido van Rossum 在 1991 年发明，
        名字来源于一部英国喜剧《Monty Python》，所以它和「蟒蛇」其实没什么关系（虽然图标常画一条蛇）。
      </p>
      <p>
        和很多老牌语言比，Python 最大的特点是<strong>读起来像英语、写起来很简洁</strong>。
        别的语言可能要写一大堆符号，Python 往往一两行就能表达同样的意思。看下面这个对比你就懂了：
      </p>
      <CodeBlock lang="python" title="Python 打印一句话，就这么短" code={`print("Hello, World!")`} />
      <Example title="运行结果">
        <p>屏幕上会显示：</p>
        <CodeBlock lang="text" title="运行结果" code={`Hello, World!`} />
      </Example>
      <Callout variant="tip">
        现在看不懂 <code>print</code> 没关系，下一章会专门讲它。这里你只需要感受到：Python 的代码很「短、很像人话」。
      </Callout>

      <h2>二、Python 能做什么</h2>
      <p>
        Python 是一门<strong>通用</strong>语言，几乎什么领域都能插一脚。下面列几个最常见的方向，
        让你对「学会它能干嘛」有个直观印象：
      </p>
      <table>
        <thead>
          <tr><th>方向</th><th>能做的事</th></tr>
        </thead>
        <tbody>
          <tr><td>数据分析</td><td>处理表格、画图表、做统计，金融和科研常用</td></tr>
          <tr><td>人工智能 / AI</td><td>训练模型、做聊天机器人、开发 AI Agent（本教程的终点）</td></tr>
          <tr><td>网站后端</td><td>用 Django、Flask 等框架搭建网站的服务器</td></tr>
          <tr><td>自动化办公</td><td>批量改文件名、自动发邮件、抓取网页数据</td></tr>
          <tr><td>爬虫</td><td>从网页上自动抓取信息</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        本教程会从最基础的语法一路带你走到「用 Python 开发 AI Agent」。
        所以你现在学的每一个小知识点，都是为后面那个酷炫目标打地基。
      </KeyIdea>

      <h2>三、为什么 Python 这么流行</h2>
      <p>
        Python 常年排在最受欢迎编程语言的前列，原因主要有三个：
      </p>
      <ul>
        <li><strong>简单易学</strong>：语法接近自然语言，没基础的人也能快速上手——这正是它适合作为第一门语言的原因。</li>
        <li><strong>库特别多</strong>：别人已经写好了海量「工具包」（叫「库」或「第三方库」），你直接拿来用，不用重复造轮子。想做 AI、画图、爬虫，都有现成的库。</li>
        <li><strong>用途广、社区大</strong>：遇到问题，网上几乎都能搜到答案；从大公司到个人项目都在用它。</li>
      </ul>

      <h2>四、如何安装 Python</h2>
      <p>
        安装非常简单，记住一个原则：<strong>从官方网站下载</strong>，别在乱七八糟的网站下，避免装到被改过的版本。
      </p>
      <ol>
        <li>打开浏览器，访问官网 <code>https://www.python.org</code>。</li>
        <li>把鼠标移到顶部的 <strong>Downloads</strong>（下载）菜单，网站会自动识别你的系统（Windows / macOS），点那个大大的下载按钮。</li>
        <li>下载完双击安装包，按提示一路「下一步」。</li>
      </ol>
      <Callout variant="warn" title="Windows 用户最容易踩的坑">
        在 Windows 的安装界面里，<strong>第一步就要勾上「Add Python to PATH」</strong>（把 Python 加入环境变量）这个复选框，
        然后再点安装。否则装完后在命令行里敲 <code>python</code> 会提示「找不到命令」，让你抓狂。
      </Callout>
      <p>
        关于版本：请安装 <strong>Python 3</strong> 的较新版本（比如 3.12、3.13 这种）。
        网上偶尔还能看到 Python 2 的教程，那是已经被淘汰的老版本，<strong>千万别装</strong>。本教程全程用 Python 3。
      </p>

      <h3>验证是否安装成功</h3>
      <p>
        装完后，打开你系统的「终端」（Windows 叫「命令提示符」或「PowerShell」，macOS 叫「终端 Terminal」），输入：
      </p>
      <CodeBlock lang="bash" title="检查 Python 版本" code={checkVersionBash} />
      <Example title="运行结果">
        <p>如果看到类似下面这样的输出，说明安装成功了（版本号可能不同）：</p>
        <CodeBlock lang="text" title="运行结果" code={checkVersionOut} />
      </Example>
      <Callout variant="tip">
        如果敲 <code>python</code> 没反应，试试 <code>python3</code>。在 macOS 和 Linux 上经常要用 <code>python3</code> 这个命令。
      </Callout>

      <h2>五、用什么写代码</h2>
      <p>
        写 Python 代码不需要什么神秘软件，下面几种工具任选其一即可，都是免费的：
      </p>
      <h3>1. VS Code（推荐新手）</h3>
      <p>
        微软出的免费编辑器，轻量、好用、插件多。装好后再装一个官方的「Python」插件，就能高亮代码、提示错误、一键运行。
        本教程推荐你用它。
      </p>
      <h3>2. PyCharm</h3>
      <p>
        专门为 Python 打造的「重型」工具（IDE），功能强大，但对新手来说稍微有点重。有免费的社区版（Community）。
      </p>
      <h3>3. 在线运行（零安装）</h3>
      <p>
        如果你暂时不想装任何东西，可以用网页版的在线编辑器（搜索「在线 Python 运行」就有很多），打开网页就能写、就能跑，
        非常适合先体验一下。
      </p>
      <Callout variant="note" title="编辑器 vs Python 本身">
        要分清两件事：<strong>Python</strong> 是真正执行代码的「引擎」（必须安装）；
        <strong>编辑器</strong>（VS Code 等）只是帮你方便地敲代码的「文本工具」。两者配合使用。
      </Callout>

      <h2>六、交互式 REPL：随写随试的好帮手</h2>
      <KeyIdea>
        REPL 是「读取-求值-打印-循环」（Read-Eval-Print Loop）的缩写。
        简单说，就是一个你敲一行代码、它马上给你一行结果的「即时问答」环境，特别适合做小实验、验证想法。
      </KeyIdea>
      <p>
        在终端里直接输入 <code>python</code>（或 <code>python3</code>）回车，就进入了 REPL：
      </p>
      <CodeBlock lang="bash" title="进入交互式环境" code={replStart} />
      <p>
        进入后，你会看到三个尖括号 <code>{'>>>'}</code> 的提示符。这表示「Python 在等你输入」。
        在它后面随便敲点东西试试：
      </p>
      <CodeBlock lang="python" title="在 REPL 里随便玩" code={replSession} />
      <p>
        注意看：你输入 <code>1 + 1</code>，它立刻回 <code>2</code>；你把 <code>"小明"</code> 存进变量 <code>name</code>，
        再敲 <code>name</code> 它就把内容显示出来。最后用 <code>exit()</code> 退出 REPL，回到普通终端。
      </p>
      <Callout variant="tip">
        <code>{'>>>'}</code> 是 REPL 的标志。看到它就知道「我现在在 Python 交互环境里」。
        想退出，输入 <code>exit()</code> 回车，或者按快捷键 Ctrl+D（macOS/Linux）/ Ctrl+Z 再回车（Windows）。
      </Callout>

      <h2>七、常见疑问快答</h2>
      <table>
        <thead>
          <tr><th>疑问</th><th>解答</th></tr>
        </thead>
        <tbody>
          <tr><td>Python 收费吗？</td><td>完全免费、开源，随便用。</td></tr>
          <tr><td>装 Python 2 还是 3？</td><td>一定装 Python 3，Python 2 已淘汰。</td></tr>
          <tr><td>编辑器和 Python 有啥区别？</td><td>Python 是执行引擎，编辑器只是写代码的工具。</td></tr>
          <tr><td>必须联网才能写吗？</td><td>装好后本地就能写能跑，不用联网。</td></tr>
          <tr><td>没编程基础能学吗？</td><td>能，Python 正是最适合零基础的第一门语言。</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="学习心态">
        编程是「练」出来的，不是「看」会的。这套教程的每一章都配了可以直接运行的小例子，
        请务必动手敲一遍、改一改参数看看结果变化——这比单纯读十遍都管用。
      </Callout>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」，看看结果。</p>
      <PyRunner initialCode={tryHelloCode} />

      <Practice title="动手练一练">
        <ol>
          <li>到官网把 Python 装到你的电脑上，并在终端里用 <code>python --version</code> 确认装好了。</li>
          <li>输入 <code>python</code> 进入 REPL，算一算 <code>2026 - 1991</code>（Python 诞生到今年过了多少年），看它回什么。</li>
          <li>在 REPL 里敲 <code>print("我开始学 Python 了")</code>，看看屏幕上显示什么，然后 <code>exit()</code> 退出。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          'Python 是一门简洁、易读、像英语的通用编程语言，常用于数据分析、AI、网站后端、自动化等。',
          '它流行的原因：简单易学、现成的库特别多、用途广社区大。',
          '安装请认准官网 python.org，装 Python 3 的新版本；Windows 安装时务必勾选「Add Python to PATH」。',
          '写代码可用 VS Code（推荐）、PyCharm 或在线编辑器；编辑器只是工具，真正执行代码的是 Python 本身。',
          'REPL 是交互式环境，终端输入 python 即可进入，提示符是 >>>，适合随写随试，exit() 退出。',
        ]}
      />
    </article>
  )
}
