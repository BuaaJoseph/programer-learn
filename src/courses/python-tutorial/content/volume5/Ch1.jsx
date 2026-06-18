import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const importCode = `import math               # 导入整个 math 模块

print(math.sqrt(16))      # 用「模块名.功能」的方式调用
print(math.pi)`
const importOut = `4.0
3.141592653589793`

const fromImportCode = `from math import sqrt, pi   # 只导入需要的几个

print(sqrt(25))             # 直接用，不用写 math.
print(pi)`
const fromImportOut = `5.0
3.141592653589793`

const asCode = `import datetime as dt       # 给模块起个短别名

now = dt.datetime.now()
print(type(now))`
const asOut = `<class 'datetime.datetime'>`

const myModuleCode = `# 文件：mymath.py
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

PI = 3.14159`

const useMyModuleCode = `# 文件：main.py（和 mymath.py 放在同一个文件夹）
import mymath

print(mymath.add(2, 3))
print(mymath.multiply(4, 5))
print(mymath.PI)`
const useMyModuleOut = `5
20
3.14159`

const mainCode = `# 文件：tool.py
def greet():
    print("你好")

if __name__ == "__main__":
    # 只有「直接运行这个文件」时，下面才执行；
    # 被别的文件 import 时，下面不执行
    print("我被直接运行了")
    greet()`
const mainOut = `# 直接 python tool.py 的输出：
我被直接运行了
你好

# 而在别的文件里 import tool 时，上面两行不会自动打印`

const stdlibCode = `import os
import random
import datetime

print(os.getcwd())                      # 当前工作目录
print(random.randint(1, 6))             # 1~6 的随机整数（掷骰子）
print(random.choice(["A", "B", "C"]))   # 随机选一个
print(datetime.date.today())            # 今天的日期`
const stdlibOut = `/home/user/project
4
B
2026-06-18`

const mathRandomCode = `import math

print(math.ceil(3.2))     # 向上取整 -> 4
print(math.floor(3.8))    # 向下取整 -> 3
print(math.sqrt(144))     # 平方根 -> 12.0
print(math.pow(2, 10))    # 2 的 10 次方 -> 1024.0`
const mathRandomOut = `4
3
12.0
1024.0`

export default function Ch1() {
  return (
    <article>
      <Lead>
        随着程序变大，把所有代码堆在一个文件里会乱成一团。Python 用<strong>模块</strong>来组织代码：
        每个 <code>.py</code> 文件就是一个模块，可以被别的文件「导入」来复用。
        这一章讲 <code>import</code> 的几种用法、如何把代码拆成自己的模块、那个神秘的
        <code>if __name__ == "__main__"</code>，以及最常用的几个标准库速览。
      </Lead>

      <h2>一、import：导入别人写好的模块</h2>
      <KeyIdea>
        Python 自带一大批现成的「标准库」模块（比如算数学的 math、生成随机数的 random）。
        用 <code>import 模块名</code> 把它请进来，之后用 <code>模块名.功能</code> 的方式调用里面的东西。
      </KeyIdea>
      <CodeBlock lang="python" title="import 整个模块" code={importCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={importOut} />
      </Example>

      <h3>from ... import：只拿需要的</h3>
      <p>
        如果只用模块里的某几样，用 <code>from 模块 import 名字</code> 直接导入，用的时候就不用加模块名前缀了：
      </p>
      <CodeBlock lang="python" title="from import" code={fromImportCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={fromImportOut} />
      </Example>

      <h3>as：起个别名</h3>
      <p>
        模块名太长，可以用 <code>as</code> 起个简短的别名。这在数据分析里很常见（如把 numpy 起名 np）：
      </p>
      <CodeBlock lang="python" title="as 别名" code={asCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={asOut} />
      </Example>

      <h2>二、把代码拆成自己的模块</h2>
      <p>
        你自己写的 <code>.py</code> 文件也是模块，可以被同目录的其他文件导入。比如先写一个 <code>mymath.py</code>：
      </p>
      <CodeBlock lang="python" title="mymath.py（自己的模块）" code={myModuleCode} />
      <p>然后在另一个文件里导入它、用它的函数和变量：</p>
      <CodeBlock lang="python" title="main.py（导入自己的模块）" code={useMyModuleCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={useMyModuleOut} />
      </Example>
      <Callout variant="tip">
        <code>import mymath</code> 写的是文件名<strong>去掉 .py</strong>。两个文件要在同一个文件夹里，
        这样 Python 才能找到。把功能拆进不同模块，是让大项目保持整洁的关键。
      </Callout>

      <h2>三、if __name__ == "__main__"</h2>
      <p>
        你会经常在 Python 文件末尾看到这一行，它的作用是：<strong>区分「直接运行」和「被导入」</strong>。
      </p>
      <CodeBlock lang="python" title="tool.py" code={mainCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={mainOut} />
      </Example>
      <KeyIdea>
        当你直接 <code>python tool.py</code> 运行时，Python 把这个文件的 <code>__name__</code> 设为
        <code>"__main__"</code>，于是 if 里的代码会执行；而当这个文件被别的文件 <code>import</code> 时，
        <code>__name__</code> 是模块名（如 <code>"tool"</code>），if 里的代码就不会执行。
      </KeyIdea>
      <Callout variant="note" title="为什么需要它">
        它让一个文件既能「被导入当工具库」，又能「直接运行做测试」。
        把测试 / 演示代码放进 <code>if __name__ == "__main__":</code> 里，导入时就不会被它干扰。
        这是一个非常标准、到处都能见到的写法。
      </Callout>

      <h2>四、常用标准库速览</h2>
      <p>
        Python「自带电池」——标准库非常丰富，不用安装就能用。下面挑几个最常用的各看一个小例子。
      </p>
      <table>
        <thead>
          <tr><th>模块</th><th>用来做什么</th></tr>
        </thead>
        <tbody>
          <tr><td><code>os</code></td><td>和操作系统打交道：路径、文件夹、环境变量</td></tr>
          <tr><td><code>sys</code></td><td>和 Python 解释器打交道：命令行参数、退出程序</td></tr>
          <tr><td><code>math</code></td><td>数学运算：开方、取整、三角函数等</td></tr>
          <tr><td><code>random</code></td><td>随机数：随机整数、随机选择、打乱</td></tr>
          <tr><td><code>datetime</code></td><td>日期和时间：今天几号、现在几点</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="python" title="os / random / datetime 小例" code={stdlibCode} />
      <Example title="运行结果（随机值每次不同）">
        <CodeBlock lang="text" title="运行结果" code={stdlibOut} />
      </Example>
      <p><code>math</code> 模块里几个常用函数：</p>
      <CodeBlock lang="python" title="math 常用函数" code={mathRandomCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={mathRandomOut} />
      </Example>
      <p>
        <code>sys</code> 模块常用 <code>sys.argv</code>（读取命令行传进来的参数）和 <code>sys.exit()</code>（提前退出程序）。
        这些模块你不用全记住，知道「遇到这类需求去查这个库」就够了。
      </p>

      <Practice title="动手练一练">
        <ol>
          <li>用 <code>random.randint</code> 模拟掷两个骰子，打印两个点数和它们的和。</li>
          <li>把你写过的几个工具函数（比如 <code>is_even</code>）放进一个 <code>utils.py</code>，在另一个文件里 import 并使用。</li>
          <li>给 <code>utils.py</code> 加上 <code>if __name__ == "__main__":</code>，里面写几行测试代码，确认直接运行时执行、被导入时不执行。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '每个 .py 文件是一个模块；import 模块名 后用「模块名.功能」调用。',
          'from 模块 import 名字 只导入需要的（用时免前缀）；import 模块 as 别名 起短名。',
          '自己的 .py 也能被同目录文件 import（写文件名去掉 .py），用来把大项目拆整洁。',
          'if __name__ == "__main__": 区分直接运行（执行）和被导入（不执行），适合放测试/入口代码。',
          '标准库自带不用装：os 系统/路径、sys 解释器、math 数学、random 随机、datetime 日期时间。',
          '不必背全部 API，记住「这类需求查这个库」即可。',
        ]}
      />
    </article>
  )
}
