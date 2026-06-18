import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const createCode = `a = '单引号字符串'
b = "双引号字符串"
c = """三引号
可以跨越
多行"""
print(a)
print(b)
print(c)`
const createOut = `单引号字符串
双引号字符串
三引号
可以跨越
多行`

const indexCode = `s = "Python"
print(s[0])    # 第一个字符，下标从 0 开始
print(s[1])    # 第二个字符
print(s[-1])   # 倒数第一个字符
print(len(s))  # 字符串长度（几个字符）`
const indexOut = `P
y
n
6`

const sliceCode = `s = "Python"
print(s[0:3])   # 下标 0、1、2，不含 3
print(s[2:])    # 从下标 2 到结尾
print(s[:4])    # 从开头到下标 3
print(s[::2])   # 每隔一个取一个`
const sliceOut = `Pyt
thon
Pyth
Pto`

const concatCode = `first = "Hello"
second = "World"
print(first + " " + second)   # 用 + 拼接
print("ha" * 3)               # 用 * 重复`
const concatOut = `Hello World
hahaha`

const methodCode = `s = "  Hello Python  "
print(s.upper())          # 全部大写
print(s.lower())          # 全部小写
print(s.strip())          # 去掉两端空白
print(s.replace("o", "0"))# 替换
print("a,b,c".split(",")) # 按逗号切成列表
print("Python".find("th"))# 找子串的起始下标，找不到返回 -1
print(len("你好"))         # 长度`
const methodOut = `  HELLO PYTHON
  hello python
Hello Python
  Hell0 Pyth0n
['a', 'b', 'c']
2
2`

const fstringCode = `name = "小明"
age = 18
score = 92.5
print(f"我叫{name}，今年{age}岁")
print(f"分数：{score:.1f}")     # 保留 1 位小数
print(f"明年{age + 1}岁")        # 大括号里能写表达式`
const fstringOut = `我叫小明，今年18岁
分数：92.5
明年19岁`

const escapeCode = `print("他说：\\"你好\\"")    # \\" 表示一个双引号
print("第一行\\n第二行")       # \\n 换行
print("姓名\\t年龄")           # \\t 制表符（一段空白）
print("路径 C:\\\\Users")      # \\\\ 表示一个反斜杠`
const escapeOut = `他说："你好"
第一行
第二行
姓名	年龄
路径 C:\\Users`

export default function Ch2() {
  return (
    <article>
      <Lead>
        字符串就是「一串文字」，是编程中最常打交道的数据之一。这一章讲清楚字符串怎么创建、
        怎么用下标和切片取出其中一部分、怎么拼接和重复、最常用的几个处理方法，
        以及超好用的 <strong>f-string</strong> 格式化和转义字符。
      </Lead>

      <h2>一、创建字符串：三种引号</h2>
      <KeyIdea>
        用引号包起来的文字就是字符串。单引号 <code>' '</code> 和双引号 <code>" "</code> 效果一样；
        三引号 <code>""" """</code> 可以写跨多行的文字。
      </KeyIdea>
      <CodeBlock lang="python" title="三种引号" code={createCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={createOut} />
      </Example>
      <Callout variant="tip">
        什么时候用单、什么时候用双？当文字里本身含有引号时，用另一种把它包起来最省事。
        比如内容里有双引号，就用单引号包：<code>{`'他说"你好"'`}</code>。
      </Callout>

      <h2>二、索引与切片：取出其中一部分</h2>
      <p>
        字符串里每个字符都有一个编号（下标），<strong>从 0 开始数</strong>。用方括号
        <code>{'[]'}</code> 加下标就能取出某个字符。负数下标从末尾倒着数。
      </p>
      <CodeBlock lang="python" title="索引取单个字符" code={indexCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={indexOut} />
      </Example>
      <Callout variant="warn" title="下标从 0 开始">
        新手最容易搞错：第一个字符是 <code>s[0]</code> 不是 <code>s[1]</code>。
        长度为 6 的字符串，合法下标是 0 到 5，访问 <code>s[6]</code> 会报 <code>IndexError</code>。
      </Callout>
      <p>
        <strong>切片</strong>用 <code>[开始:结束]</code> 一次取出一段，遵循「含头不含尾」——取到「结束」前一个为止：
      </p>
      <CodeBlock lang="python" title="切片取一段" code={sliceCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={sliceOut} />
      </Example>

      <h2>三、拼接与重复</h2>
      <p>
        字符串之间用 <code>+</code> 连接，用 <code>*</code> 重复多次：
      </p>
      <CodeBlock lang="python" title="拼接和重复" code={concatCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={concatOut} />
      </Example>

      <h2>四、常用字符串方法</h2>
      <p>
        字符串自带一堆好用的「方法」，用<strong>点号</strong>调用，如 <code>s.upper()</code>。
        记住：这些方法都<strong>返回一个新字符串，不会改动原来的</strong>。
      </p>
      <CodeBlock lang="python" title="常用方法一览" code={methodCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={methodOut} />
      </Example>
      <table>
        <thead>
          <tr><th>方法</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>upper()</code> / <code>lower()</code></td><td>转大写 / 小写</td></tr>
          <tr><td><code>strip()</code></td><td>去掉两端的空格、换行等空白</td></tr>
          <tr><td><code>replace(旧, 新)</code></td><td>把所有「旧」替换成「新」</td></tr>
          <tr><td><code>split(分隔符)</code></td><td>按分隔符切开，得到一个列表</td></tr>
          <tr><td><code>find(子串)</code></td><td>找子串的起始下标，找不到返回 -1</td></tr>
          <tr><td><code>len(s)</code></td><td>字符串长度（注意：len 是函数不是方法）</td></tr>
        </tbody>
      </table>

      <h2>五、f-string：最方便的格式化</h2>
      <KeyIdea>
        f-string 是在字符串前面加一个字母 <code>f</code>，然后在字符串里用大括号 <code>{'{}'}</code>
        嵌入变量或表达式。它是把变量「填」进文字里的最简洁方式，强烈推荐。
      </KeyIdea>
      <CodeBlock lang="python" title="f-string 实战" code={fstringCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={fstringOut} />
      </Example>
      <p>
        大括号里不仅能放变量，还能放运算（如 <code>{'{age + 1}'}</code>），还能跟格式说明
        （如 <code>{'{score:.1f}'}</code> 表示保留一位小数）。这比用 <code>+</code> 拼接、还要到处
        <code>str()</code> 转换方便太多了。
      </p>
      <Callout variant="tip">
        想在 f-string 里输出一个真正的大括号，写两个：<code>{'{{'}</code> 显示成 <code>{'{'}</code>。
      </Callout>

      <h2>六、转义字符</h2>
      <p>
        有些字符不好直接打出来（比如换行、引号本身），就用反斜杠 <code>\</code> 加一个字母来表示，
        叫「转义字符」：
      </p>
      <CodeBlock lang="python" title="常见转义" code={escapeCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={escapeOut} />
      </Example>
      <table>
        <thead>
          <tr><th>转义</th><th>表示</th></tr>
        </thead>
        <tbody>
          <tr><td><code>\n</code></td><td>换行</td></tr>
          <tr><td><code>\t</code></td><td>制表符（一段对齐用的空白）</td></tr>
          <tr><td><code>\"</code> / <code>\'</code></td><td>一个双引号 / 单引号</td></tr>
          <tr><td><code>\\</code></td><td>一个反斜杠本身</td></tr>
        </tbody>
      </table>

      <Practice title="动手练一练">
        <ol>
          <li>让用户输入一句英文，把它全部转成大写后打印。</li>
          <li>定义 <code>email = "test@example.com"</code>，用 <code>split("@")</code> 把用户名和域名分开打印。</li>
          <li>用 f-string 打印一句：「我叫XX，身高1.7米」，其中名字和身高用变量填入，身高保留 2 位小数。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '字符串用单/双引号创建（等价），三引号可写多行；引号里含引号时用另一种包起来。',
          '索引从 0 开始，s[0] 是第一个，负数从末尾数；切片 [开始:结束] 含头不含尾。',
          '+ 拼接字符串，* 重复字符串。',
          '常用方法 upper/lower/strip/replace/split/find 返回新串不改原串，len() 取长度。',
          'f-string（前缀 f）用 {} 嵌入变量和表达式，可带 :.1f 等格式，是最推荐的格式化方式。',
          '转义字符用反斜杠：\\n 换行、\\t 制表、\\" 引号、\\\\ 反斜杠。',
        ]}
      />
    </article>
  )
}
