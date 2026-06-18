import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryLoopCode = `# for + if：打印 1~10 里的偶数
n = 10
print(f"1~{n} 里的偶数：")
for i in range(1, n + 1):
    if i % 2 == 0:
        print(i, end=" ")
print()   # 换行

# while：累加 1+2+...+5
total = 0
k = 1
while k <= 5:
    total += k
    k += 1
print("1+2+3+4+5 =", total)

# 九九乘法表片段（第 3 行）
row = 3
for col in range(1, row + 1):
    print(f"{col}x{row}={col * row}", end="  ")
print()`

const ifCode = `age = 18
if age >= 18:
    print("成年了")
else:
    print("未成年")`
const ifOut = `成年了`

const elifCode = `score = 75
if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")`
const elifOut = `及格`

const compareCode = `print(3 > 2)     # 大于
print(3 == 3)    # 等于（两个等号！）
print(3 != 5)    # 不等于
print(3 <= 2)    # 小于等于`
const compareOut = `True
True
True
False`

const logicCode = `age = 20
has_ticket = True
if age >= 18 and has_ticket:      # 两个条件都成立
    print("可以进场")
if age < 12 or age > 60:          # 任一条件成立
    print("享受优惠票")
if not has_ticket:                # 取反
    print("请先买票")`
const logicOut = `可以进场`

const truthyCode = `# 这些会被当成「假」：0、空字符串、空列表、空字典、None
if "":
    print("不会打印")
if "你好":
    print("非空字符串是真")
if []:
    print("不会打印")
if [1, 2]:
    print("非空列表是真")`
const truthyOut = `非空字符串是真
非空列表是真`

const forListCode = `for fruit in ["苹果", "香蕉", "橙子"]:
    print(fruit)`
const forListOut = `苹果
香蕉
橙子`

const forRangeCode = `for i in range(5):        # 0,1,2,3,4
    print(i, end=" ")
print()
for i in range(1, 4):     # 1,2,3
    print(i, end=" ")
print()
for i in range(0, 10, 2): # 0 到 9，步长 2
    print(i, end=" ")`
const forRangeOut = `0 1 2 3 4
1 2 3
0 2 4 6 8`

const forStrCode = `for ch in "Hi":
    print(ch)`
const forStrOut = `H
i`

const whileCode = `n = 1
while n <= 3:        # 条件为真就一直循环
    print("第", n, "次")
    n = n + 1        # 别忘了改变量，否则死循环！`
const whileOut = `第 1 次
第 2 次
第 3 次`

const breakContinueCode = `for i in range(1, 10):
    if i == 3:
        continue     # 跳过本次，进入下一次
    if i == 6:
        break        # 直接结束整个循环
    print(i, end=" ")`
const breakContinueOut = `1 2 4 5`

const multTableCode = `for i in range(1, 10):
    for j in range(1, i + 1):
        print(f"{j}x{i}={i*j}", end="\\t")
    print()   # 每行末尾换行`
const multTableOut = `1x1=1
1x2=2	2x2=4
1x3=3	2x3=6	3x3=9
1x4=4	2x4=8	3x4=12	4x4=16
... (共 9 行)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        程序要会「做选择」和「重复干活」，才算真正聪明起来。这一章讲两大流程控制：
        用 <strong>if / elif / else</strong> 做条件判断，用 <strong>for / while</strong> 做循环，
        以及 <code>break</code>、<code>continue</code> 这两个循环里的「急刹车」和「跳过」。
        最后用嵌套循环打印一张九九乘法表。
      </Lead>

      <h2>一、if / elif / else 条件判断</h2>
      <KeyIdea>
        <code>if</code> 后面跟一个条件，条件成立（为真）就执行它下面缩进的代码块。
        可以加 <code>else</code> 表示「否则」，加 <code>elif</code>（else if 的缩写）表示「再不然」。
        注意每个 <code>if/elif/else</code> 行末都有冒号，下面的代码要缩进。
      </KeyIdea>
      <CodeBlock lang="python" title="最简单的 if / else" code={ifCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={ifOut} />
      </Example>
      <p>
        多个分支用 <code>elif</code> 连起来，Python 会<strong>从上往下</strong>逐个检查，命中第一个成立的就执行、不再往下看：
      </p>
      <CodeBlock lang="python" title="多分支 elif" code={elifCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={elifOut} />
      </Example>

      <h2>二、比较与逻辑运算</h2>
      <p>条件通常由比较运算符构成，结果是 <code>True</code>（真）或 <code>False</code>（假）：</p>
      <CodeBlock lang="python" title="比较运算符" code={compareCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={compareOut} />
      </Example>
      <Callout variant="warn" title="判断相等用 == 不是 =">
        <code>=</code> 是赋值，<code>==</code> 才是「判断相等」。在 <code>if</code> 里写错成 <code>=</code> 会直接报语法错误。
      </Callout>
      <p>
        多个条件可以用<strong>逻辑运算符</strong>组合：<code>and</code>（且）、<code>or</code>（或）、<code>not</code>（非）。
      </p>
      <CodeBlock lang="python" title="and / or / not" code={logicCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={logicOut} />
      </Example>

      <h3>真假值：什么算「真」</h3>
      <p>
        条件不一定非得是比较表达式。Python 里有些值天生被当作「假」：
        <strong>0、空字符串 <code>""</code>、空列表 <code>[]</code>、空字典 <code>{'{}'}</code>、<code>None</code></strong>。
        其余非空、非零的值都算「真」。
      </p>
      <CodeBlock lang="python" title="真假值实验" code={truthyCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={truthyOut} />
      </Example>
      <Callout variant="tip">
        这个特性让代码很简洁：判断列表是否非空，直接写 <code>if mylist:</code> 即可，不用写 <code>if len(mylist) {'>'} 0:</code>。
      </Callout>

      <h2>三、for 循环：把一组东西逐个处理</h2>
      <p><code>for ... in</code> 会把一个序列里的元素一个个取出来。先看遍历列表：</p>
      <CodeBlock lang="python" title="遍历列表" code={forListCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={forListOut} />
      </Example>

      <h3>用 range 生成数字序列</h3>
      <p>
        想循环固定次数，用 <code>range</code>。<code>range(n)</code> 产生 0 到 n-1；
        <code>range(a, b)</code> 产生 a 到 b-1；<code>range(a, b, step)</code> 还能指定步长。
      </p>
      <CodeBlock lang="python" title="range 的三种用法" code={forRangeCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={forRangeOut} />
      </Example>

      <h3>遍历字符串</h3>
      <CodeBlock lang="python" title="遍历字符串的每个字符" code={forStrCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={forStrOut} />
      </Example>

      <h2>四、while 循环：条件为真就一直转</h2>
      <p>
        <code>while</code> 后跟一个条件，只要条件成立就反复执行循环体。适合「不知道要循环几次、但知道停止条件」的情况。
      </p>
      <CodeBlock lang="python" title="while 循环" code={whileCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={whileOut} />
      </Example>
      <Callout variant="warn" title="当心死循环">
        写 <code>while</code> 一定要保证条件最终会变成「假」。上面例子里如果忘了 <code>n = n + 1</code>，
        <code>n</code> 永远是 1，程序会无限打印，卡死。按 Ctrl+C 可以强制停止。
      </Callout>

      <h2>五、break 和 continue</h2>
      <ul>
        <li><code>break</code>：<strong>立即结束</strong>整个循环，跳出去。</li>
        <li><code>continue</code>：<strong>跳过本次</strong>剩下的代码，直接进入下一次循环。</li>
      </ul>
      <CodeBlock lang="python" title="break 与 continue" code={breakContinueCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={breakContinueOut} />
      </Example>
      <p>
        分析：<code>i=3</code> 时 <code>continue</code> 跳过了打印；<code>i=6</code> 时 <code>break</code> 直接结束，所以只打印了 1 2 4 5。
      </p>

      <h2>六、嵌套循环：九九乘法表</h2>
      <p>
        循环里还能套循环。经典练习就是九九乘法表——外层控制行，内层控制每行的列：
      </p>
      <CodeBlock lang="python" title="九九乘法表" code={multTableCode} />
      <Example title="运行结果（节选）">
        <CodeBlock lang="text" title="运行结果" code={multTableOut} />
      </Example>
      <p>
        外层 <code>i</code> 从 1 到 9 是每一行；内层 <code>j</code> 从 1 到 <code>i</code> 打印这一行的每个乘式，
        <code>\t</code> 让它们对齐；内层结束后用一个空 <code>print()</code> 换行。
      </p>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」，看看结果。</p>
      <PyRunner initialCode={tryLoopCode} />

      <Practice title="动手练一练">
        <ol>
          <li>让用户输入一个分数，用 if/elif/else 判断等级（90 以上优秀，60 以上及格，否则不及格）。</li>
          <li>用 for + range 打印 1 到 100 所有偶数的和。</li>
          <li>用 while 实现一个简单的「猜数字」：心里设定一个数，让用户反复输入直到猜中，猜中就 break。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          'if 条件成立执行缩进代码块，else 否则，elif 再不然；从上往下命中第一个成立的分支。',
          '比较运算符 > < >= <= == !=（相等是 ==），逻辑运算 and 且 / or 或 / not 非。',
          '真假值：0、空字符串、空列表、空字典、None 为假，其余为真，可直接 if mylist 判断非空。',
          'for ... in 遍历列表/字符串；range(n)、range(a,b)、range(a,b,step) 生成数字序列。',
          'while 条件为真就循环，务必保证条件会变假，否则死循环（Ctrl+C 停止）。',
          'break 结束整个循环，continue 跳过本次；循环可嵌套，如九九乘法表外层管行内层管列。',
        ]}
      />
    </article>
  )
}
