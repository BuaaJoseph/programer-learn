import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const helloCode = `print("Hello, World!")`

const saveRunBash = `# 假设你把文件存成 hello.py，在终端里进入它所在的文件夹，运行：
python hello.py`

const multiArgCode = `print("我", "爱", "Python")`
const multiArgOut = `我 爱 Python`

const sepEndCode = `print("2026", "06", "18", sep="-")
print("没有换行", end="")
print("，它们连在一起了")`
const sepEndOut = `2026-06-18
没有换行，它们连在一起了`

const newlineCode = `print("第一行")
print("第二行")
print("上一行\\n下一行")`
const newlineOut = `第一行
第二行
上一行
下一行`

const commentCode = `# 这是一条注释，Python 会完全忽略它
print("代码会执行")  # 行尾也能写注释：右边这部分被忽略
# print("这一行被注释掉了，不会运行")`
const commentOut = `代码会执行`

const indentGoodCode = `if 10 > 5:
    print("10 比 5 大")   # 这一行缩进了 4 个空格，属于 if 内部
print("这句永远会执行")    # 没缩进，不属于 if`
const indentGoodOut = `10 比 5 大
这句永远会执行`

const indentErrCode = `if 10 > 5:
print("忘了缩进")`
const indentErrOut = `  File "hello.py", line 2
    print("忘了缩进")
    ^
IndentationError: expected an indented block after 'if' statement on line 1`

const syntaxErrCode = `print("少了一个右括号"`
const syntaxErrOut = `  File "hello.py", line 1
    print("少了一个右括号"
         ^
SyntaxError: '(' was never closed`

export default function Ch2() {
  return (
    <article>
      <Lead>
        准备工作做完了，这一章我们真正写出并运行第一个程序：经典的「Hello, World!」。
        然后学会两种运行方式（REPL 临时试 vs 存成文件正式跑）、<code>print</code> 的几个常用花样、
        怎么写注释，以及 Python 一个很重要的特点——用「缩进」来组织代码。最后认识两个新手最常遇到的报错。
      </Lead>

      <h2>一、第一个程序：Hello, World!</h2>
      <p>
        几乎所有编程教程的第一个程序都是让屏幕显示「Hello, World!」。在 Python 里，它只要一行：
      </p>
      <CodeBlock lang="python" title="史上最短的第一个程序" code={helloCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={`Hello, World!`} />
      </Example>
      <p>
        这里的 <code>print</code> 是 Python 内置的「打印」功能（叫「函数」），作用就是把括号里的内容显示到屏幕上。
        要显示的文字用<strong>引号</strong>包起来（单引号双引号都行），这种被引号包住的文字叫「字符串」。
      </p>

      <h2>二、两种运行方式</h2>
      <h3>方式一：在 REPL 里临时试</h3>
      <p>
        上一章学过的交互式环境（终端输入 <code>python</code> 进入）就能直接跑：
      </p>
      <CodeBlock lang="python" title="在 REPL 里直接敲" code={`>>> print("Hello, World!")
Hello, World!`} />
      <p>这种方式适合快速试一两行，但程序一关就没了，不能保存。</p>

      <h3>方式二：存成 .py 文件再运行（正式做法）</h3>
      <p>
        真正写程序时，我们会把代码保存成一个以 <code>.py</code> 结尾的文件。步骤：
      </p>
      <ol>
        <li>用编辑器（如 VS Code）新建一个文件，写上 <code>print("Hello, World!")</code>。</li>
        <li>保存为 <code>hello.py</code>。</li>
        <li>打开终端，进入这个文件所在的文件夹，运行下面的命令。</li>
      </ol>
      <CodeBlock lang="bash" title="运行一个 .py 文件" code={saveRunBash} />
      <Callout variant="tip">
        <code>.py</code> 是 Python 文件的标准后缀。文件名最好用英文字母、数字和下划线，别用空格和中文，避免麻烦。
      </Callout>

      <h2>三、print 的更多用法</h2>
      <h3>1. 一次打印多个内容</h3>
      <p>
        <code>print</code> 括号里可以放多个内容，用逗号隔开，它们之间默认用一个<strong>空格</strong>连接：
      </p>
      <CodeBlock lang="python" title="print 多个参数" code={multiArgCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={multiArgOut} />
      </Example>

      <h3>2. 自定义分隔符和结尾</h3>
      <p>
        默认每个 <code>print</code> 之间用空格分隔、末尾自动换行。可以用 <code>sep</code>（分隔符）和
        <code>end</code>（结尾）来改：
      </p>
      <CodeBlock lang="python" title="sep 和 end" code={sepEndCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={sepEndOut} />
      </Example>
      <p>
        第一行用 <code>sep="-"</code> 把日期连成 <code>2026-06-18</code>；后两行用 <code>end=""</code>
        （空字符串）取消了自动换行，所以它俩接在了一起。
      </p>

      <h3>3. 换行符 \\n</h3>
      <p>
        每个 <code>print</code> 默认会换行。如果想在一句话中间换行，用<strong>换行符</strong> <code>\n</code>：
      </p>
      <CodeBlock lang="python" title="换行" code={newlineCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={newlineOut} />
      </Example>

      <h2>四、注释：写给人看的说明</h2>
      <KeyIdea>
        注释是写在代码里、给人读的说明文字，Python 运行时会<strong>完全忽略</strong>它们。
        在 Python 里，以 <code>#</code> 号开头的内容就是注释。
      </KeyIdea>
      <CodeBlock lang="python" title="注释怎么写" code={commentCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={commentOut} />
      </Example>
      <Callout variant="tip">
        注释有两个用途：① 解释代码「为什么这么写」，方便日后自己和别人看懂；
        ② 临时「关掉」某行代码——在它前面加个 <code>#</code>，它就不执行了，调试时很常用。
      </Callout>

      <h2>五、为什么 Python 靠「缩进」</h2>
      <p>
        很多语言（比如 Java、C）用<strong>花括号</strong> <code>{'{ }'}</code> 来圈出「哪些代码属于一组」。
        Python 不用花括号，而是用<strong>缩进</strong>（行首的空格）来表达这种从属关系。
      </p>
      <CodeBlock lang="python" title="缩进决定代码归属" code={indentGoodCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={indentGoodOut} />
      </Example>
      <p>
        看上面：<code>if</code> 这行末尾有个冒号 <code>:</code>，下一行<strong>缩进</strong>的
        <code>print</code> 就属于 <code>if</code> 的「内部」，只有条件成立才执行；
        而没缩进的那行 <code>print</code> 不属于 <code>if</code>，总会执行。
      </p>
      <Callout variant="warn" title="缩进规则">
        Python 官方推荐缩进用 <strong>4 个空格</strong>。同一组代码缩进必须一致，不能一会儿 2 格一会儿 4 格。
        VS Code 等编辑器一般会帮你自动缩进，按 Tab 键也行（编辑器通常会转成空格）。
      </Callout>

      <h2>六、新手最常见的两个报错</h2>
      <h3>IndentationError（缩进错误）</h3>
      <p>
        该缩进的地方没缩进，就会报这个错。比如 <code>if</code> 后面那行忘了缩进：
      </p>
      <CodeBlock lang="python" title="错误示范：忘了缩进" code={indentErrCode} />
      <Example title="运行结果（报错）">
        <CodeBlock lang="text" title="运行结果" code={indentErrOut} />
      </Example>
      <p>看到 <code>IndentationError</code> 就检查：冒号下面那行有没有正确缩进。</p>

      <h3>SyntaxError（语法错误）</h3>
      <p>
        代码「写得不符合语法」，比如括号、引号没配对。下面少了一个右括号：
      </p>
      <CodeBlock lang="python" title="错误示范：括号没闭合" code={syntaxErrCode} />
      <Example title="运行结果（报错）">
        <CodeBlock lang="text" title="运行结果" code={syntaxErrOut} />
      </Example>
      <Callout variant="tip">
        报错不可怕！Python 的报错信息会告诉你<strong>哪个文件、第几行、什么类型</strong>的错。
        看到报错，先看最后一行的错误类型，再看它指出的行号，问题往往就在那附近。
      </Callout>

      <Practice title="动手练一练">
        <ol>
          <li>新建 <code>hello.py</code>，写一行 <code>print("Hello, World!")</code>，用 <code>python hello.py</code> 跑起来。</li>
          <li>用一个 <code>print</code> 同时打印你的姓、名两个字符串，看它们之间是不是有空格。</li>
          <li>故意把某个 <code>print</code> 的右括号删掉，运行看看报的是不是 <code>SyntaxError</code>，再把它改回来。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          'print 把内容显示到屏幕上，要显示的文字（字符串）用引号包起来。',
          '运行方式两种：REPL 临时试（关了就没）；存成 .py 文件用 python 文件名.py 正式运行。',
          'print 可用逗号打印多个内容（默认空格分隔），用 sep 改分隔符、end 改结尾，\\n 表示换行。',
          '以 # 开头的是注释，运行时被忽略，用来解释代码或临时关掉某行。',
          'Python 用缩进（推荐 4 空格）代替花括号来组织代码，冒号下面要缩进。',
          '两个高频报错：IndentationError（缩进不对）、SyntaxError（语法/括号引号没配对），看报错的行号和类型来定位。',
        ]}
      />
    </article>
  )
}
