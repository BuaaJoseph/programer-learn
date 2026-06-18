import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCode = `# 浏览器里也有一个临时文件系统，可以真的读写文件
# 写入
with open("demo.txt", "w", encoding="utf-8") as f:
    f.write("第一行：学习 Python\\n")
    f.write("第二行：今天很开心\\n")
    f.write("第三行：继续加油\\n")

# 读回全部
with open("demo.txt", "r", encoding="utf-8") as f:
    content = f.read()
print("===== 全部内容 =====")
print(content)

# 逐行读，加上行号
print("===== 逐行编号 =====")
with open("demo.txt", "r", encoding="utf-8") as f:
    for i, line in enumerate(f, start=1):
        print(i, line.strip())`

const openModes = `# 用 open() 打开文件，第二个参数是"模式"
f = open("note.txt", "r")   # r = read，只读（默认）
f = open("note.txt", "w")   # w = write，写入（清空原内容！）
f = open("note.txt", "a")   # a = append，追加（在末尾续写）
f.close()                    # 用完一定要关闭`

const writeBasic = `# 写入文本：用 "w" 模式
f = open("note.txt", "w", encoding="utf-8")
f.write("第一行\\n")    # \\n 是换行符
f.write("第二行\\n")
f.close()

# 运行后，当前目录会多出一个 note.txt，内容是：
# 第一行
# 第二行`

const withWrite = `# 推荐写法：用 with，自动关闭文件
with open("note.txt", "w", encoding="utf-8") as f:
    f.write("学习 Python\\n")
    f.write("今天很开心\\n")
# 离开 with 代码块，文件被自动关闭，不会忘`

const readAll = `# 一次读出全部内容（返回一个字符串）
with open("note.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(content)`

const readAllResult = `学习 Python
今天很开心`

const readLines = `# 按行读：直接 for 遍历文件对象，一行一行拿
with open("note.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())   # strip() 去掉行尾的换行符

# 或者一次性读成列表，每个元素是一行
with open("note.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
print(lines)`

const readLinesResult = `学习 Python
今天很开心
['学习 Python\\n', '今天很开心\\n']`

const appendDemo = `# 追加模式 a：不清空，在末尾续写
with open("note.txt", "a", encoding="utf-8") as f:
    f.write("又记了一笔\\n")

# 现在文件里有三行了`

const pathDemo = `import os

# 相对路径：相对于"当前工作目录"
open("data/note.txt")          # 当前目录下的 data 文件夹里

# 绝对路径：从根目录写全（Windows 用 C:\\\\ 开头）
open("/home/user/note.txt")    # Linux / macOS

# os.path 拼路径（自动用对系统的分隔符，跨平台更安全）
path = os.path.join("data", "logs", "note.txt")
print(path)                    # data/logs/note.txt（Linux）

# 判断文件是否存在
print(os.path.exists("note.txt"))`

const pathlibDemo = `from pathlib import Path

p = Path("data") / "note.txt"   # 用 / 拼路径，很直观
print(p)                         # data/note.txt

# pathlib 还能直接读写，超方便
Path("hello.txt").write_text("你好\\n", encoding="utf-8")
print(Path("hello.txt").read_text(encoding="utf-8"))`

const noteApp = `# 一个"记笔记到文件"的小程序
# 运行后不断输入笔记，每条追加到 notes.txt，输入 q 退出

FILE = "notes.txt"

def add_note(text):
    with open(FILE, "a", encoding="utf-8") as f:
        f.write(text + "\\n")

def show_notes():
    print("===== 我的笔记 =====")
    with open(FILE, "a", encoding="utf-8"):
        pass                      # 确保文件存在
    with open(FILE, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            print(f"{i}. {line.strip()}")
    print("===================")

while True:
    text = input("输入一条笔记（q 退出）：")
    if text == "q":
        break
    add_note(text)
    print("已保存！")

show_notes()`

const noteAppResult = `输入一条笔记（q 退出）：买牛奶
已保存！
输入一条笔记（q 退出）：写 Python
已保存！
输入一条笔记（q 退出）：q
===== 我的笔记 =====
1. 买牛奶
2. 写 Python
===================`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到目前为止，我们的程序一关就什么都没了——变量只活在内存里。要让数据"留下来"，
        就得把它写进文件。这一章我们学最常用的文本文件读写：怎么打开文件、怎么写、怎么读、
        怎么按行处理，以及怎么找到文件所在的"路径"。最后写一个能把笔记存进文件的小程序。
      </Lead>

      <h2>一、用 open() 打开文件</h2>
      <p>
        Python 用内置函数 <code>open()</code> 打开文件。它最少要两个信息：文件名，和你想干什么（模式）。
      </p>
      <CodeBlock lang="python" title="open 的三种常用模式" code={openModes} />
      <table>
        <thead>
          <tr><th>模式</th><th>含义</th><th>文件不存在时</th><th>会清空原内容吗</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"r"</code></td><td>只读（默认）</td><td>报错</td><td>否</td></tr>
          <tr><td><code>"w"</code></td><td>写入</td><td>自动创建</td><td><strong>是！会清空</strong></td></tr>
          <tr><td><code>"a"</code></td><td>追加</td><td>自动创建</td><td>否，在末尾续写</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="w 会清空文件">
        用 <code>"w"</code> 打开一个已有文件，里面的内容会<strong>立刻被清空</strong>。
        想保留旧内容、只往后加，请用 <code>"a"</code>（追加）。
      </Callout>

      <h2>二、写文本到文件</h2>
      <p>打开后用 <code>write()</code> 写字符串。注意 <code>write</code> 不会自动换行，要换行得自己加 <code>{'\\n'}</code>。</p>
      <CodeBlock lang="python" title="写入文本" code={writeBasic} />
      <Callout variant="tip" title="为什么写 encoding=&quot;utf-8&quot;">
        中文要正确保存，最好都加上 <code>encoding="utf-8"</code>。不加在某些系统上可能出现乱码，
        养成习惯总是带上它，最省心。
      </Callout>

      <h2>三、用 with 自动关闭文件</h2>
      <p>
        上面我们手动 <code>f.close()</code>，但万一中间报错就关不掉了。Python 提供了
        <code>with</code> 语句：代码块结束（无论正常还是出错）都会<strong>自动关闭</strong>文件。
        这是写文件的标准姿势。
      </p>
      <CodeBlock lang="python" title="推荐：用 with 打开" code={withWrite} />
      <KeyIdea>
        以后读写文件，一律用 <code>with open(...) as f:</code>。它帮你管好"用完就关"，
        你只管在代码块里读写就行。
      </KeyIdea>

      <h2>四、读取文件内容</h2>
      <h3>读全部：read()</h3>
      <p><code>read()</code> 把整个文件读成一个字符串。</p>
      <CodeBlock lang="python" title="一次读出全部" code={readAll} />
      <CodeBlock lang="text" title="运行结果" code={readAllResult} />

      <h3>按行读：for 遍历</h3>
      <p>
        文件如果很大，一次全读进内存不划算。更常见的是<strong>一行一行</strong>处理——
        直接 <code>for line in f</code> 遍历文件对象即可，Python 会自动逐行给你。
      </p>
      <CodeBlock lang="python" title="逐行读取" code={readLines} />
      <CodeBlock lang="text" title="运行结果" code={readLinesResult} />
      <Callout variant="note" title="行尾的换行符">
        每行读出来都带着结尾的 <code>{'\\n'}</code>。打印时常用 <code>line.strip()</code>
        去掉首尾空白（包括换行），输出才整齐。
      </Callout>

      <h2>五、追加内容：a 模式</h2>
      <p>想在不删除旧内容的前提下往后加，用 <code>"a"</code>。</p>
      <CodeBlock lang="python" title="追加一行" code={appendDemo} />

      <Practice title="练一练">
        新建一个 <code>diary.txt</code>，用 <code>"w"</code> 写入今天的日期，
        再用 <code>"a"</code> 追加三条心情，最后用 <code>for</code> 遍历打印出来。
        观察 <code>"w"</code> 和 <code>"a"</code> 的区别。
      </Practice>

      <h2>六、文件路径：相对、绝对、跨平台</h2>
      <p>
        程序怎么找到文件？靠<strong>路径</strong>。路径分两种：
      </p>
      <ul>
        <li><strong>相对路径</strong>：相对于程序运行时的"当前目录"，如 <code>data/note.txt</code>。</li>
        <li><strong>绝对路径</strong>：从根目录写到底，如 <code>/home/user/note.txt</code>（Windows 形如 <code>C:\\Users\\me\\note.txt</code>）。</li>
      </ul>
      <p>
        不同系统的路径分隔符不一样（Linux/macOS 用 <code>/</code>，Windows 用 <code>\\</code>）。
        别手写拼接，用标准库帮你拼，跨平台更安全。
      </p>
      <CodeBlock lang="python" title="os.path 处理路径" code={pathDemo} />

      <h3>更现代的 pathlib</h3>
      <p>
        Python 3 推荐用 <code>pathlib</code>，它把路径当对象，用 <code>/</code> 拼接，还能直接读写。
      </p>
      <CodeBlock lang="python" title="pathlib 简介" code={pathlibDemo} />
      <Callout variant="tip" title="选哪个">
        两个都能用。新代码推荐 <code>pathlib</code>，写起来更直观；看到老代码里的 <code>os.path</code>
        也别慌，它们做的是同一件事。
      </Callout>

      <h2>七、综合实例：记笔记到文件</h2>
      <p>
        把这一章学的串起来：写一个循环，不断接收用户输入的笔记，每条<strong>追加</strong>到文件，
        最后读出全部笔记编号显示。这就是一个最小的"持久化"小工具。
      </p>
      <CodeBlock lang="python" title="note_app.py" code={noteApp} />
      <CodeBlock lang="text" title="运行结果" code={noteAppResult} />
      <Example title="这段代码用到了什么">
        <ul>
          <li><code>add_note</code> 用 <code>"a"</code> 追加，所以每次运行都会累积笔记，不会丢。</li>
          <li><code>show_notes</code> 先用 <code>"a"</code> 模式"碰"一下文件，确保它存在（否则首次读会报错）。</li>
          <li>读取时用 <code>enumerate(f, start=1)</code> 给每行配上从 1 开始的编号。</li>
        </ul>
      </Example>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」。</p>
      <PyRunner initialCode={tryCode} />

      <Summary
        points={[
          'open(文件名, 模式) 打开文件：r 只读、w 写入（会清空）、a 追加（在末尾续写）。',
          '用 with open(...) as f: 打开，代码块结束自动关闭文件，不会忘记 close。',
          '写用 f.write(字符串)，换行要自己加 \\n；读全部用 f.read()，按行处理直接 for line in f。',
          '逐行读出的内容带 \\n，常配 line.strip() 去掉首尾空白。',
          '路径分相对（基于当前目录）和绝对（从根写起）；用 os.path.join 或 pathlib 拼路径，跨平台更安全。',
          '处理中文统一加 encoding="utf-8"，避免乱码。',
        ]}
      />
    </article>
  )
}
