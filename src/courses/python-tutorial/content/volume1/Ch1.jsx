import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const assignCode = `name = "小红"
age = 18
height = 1.65

print(name)
print(age)
print(height)`
const assignOut = `小红
18
1.65`

const renameCode = `score = 90
score = 95      # 重新赋值，旧值被覆盖
print(score)`
const renameOut = `95`

const numTypeCode = `a = 10          # 整数 int
b = 3.14        # 小数 float
print(type(a))
print(type(b))`
const numTypeOut = `<class 'int'>
<class 'float'>`

const arithCode = `print(7 + 3)    # 加
print(7 - 3)    # 减
print(7 * 3)    # 乘
print(7 / 3)    # 除（结果是小数）
print(7 // 3)   # 整除（只取整数部分）
print(7 % 3)    # 取余（除不尽的余数）
print(7 ** 3)   # 幂（7 的 3 次方）`
const arithOut = `10
4
21
2.3333333333333335
2
1
343`

const convertCode = `x = "100"           # 这是字符串，不是数字
y = int(x) + 5      # 先转成整数才能做加法
print(y)

pi = 3.9
print(int(pi))      # 转成整数会直接砍掉小数部分（不是四舍五入）

n = 42
print("年龄是" + str(n) + "岁")   # 数字转成字符串才能和文字拼接`
const convertOut = `105
3
年龄是42岁`

const typeErrCode = `x = "100"
print(x + 5)        # 字符串和数字不能直接相加`
const typeErrOut = `TypeError: can only concatenate str (not "int") to str`

const inputCode = `name = input("请输入你的名字：")
print("你好，" + name)`
const inputOut = `请输入你的名字：小明
你好，小明`

const inputNumCode = `age = input("请输入你的年龄：")   # input 读到的永远是字符串
age = int(age)                    # 要转成数字才能计算
print("明年你", age + 1, "岁")`
const inputNumOut = `请输入你的年龄：18
明年你 19 岁`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一章开始接触编程的核心：用<strong>变量</strong>给数据起名字、存起来反复用；认识两种数字
        （整数和小数）和它们的<strong>运算</strong>；学会在不同类型之间<strong>转换</strong>；
        用 <code>type()</code> 查看一个东西是什么类型；最后用 <code>input()</code> 读取用户从键盘输入的内容，
        写出能「和人对话」的程序。
      </Lead>

      <h2>一、变量：给数据起个名字</h2>
      <KeyIdea>
        变量就像一个贴了标签的盒子：你把数据放进去，给盒子起个名字，以后用名字就能取出里面的数据。
        在 Python 里，用一个等号 <code>=</code> 来「赋值」——把右边的值装进左边的名字里。
      </KeyIdea>
      <CodeBlock lang="python" title="创建变量并使用" code={assignCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={assignOut} />
      </Example>
      <p>
        变量是可以「变」的——再赋一次值，旧值就被新值覆盖：
      </p>
      <CodeBlock lang="python" title="变量可以重新赋值" code={renameCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={renameOut} />
      </Example>
      <Callout variant="warn" title="= 不是「等于」">
        编程里的 <code>=</code> 念作「赋值」，意思是「把右边的值放进左边」，<strong>不是数学里的「相等」</strong>。
        判断相等用的是两个等号 <code>==</code>，后面章节会讲。
      </Callout>

      <h3>变量命名规则</h3>
      <ul>
        <li>只能用<strong>字母、数字、下划线</strong> <code>_</code>，且<strong>不能用数字开头</strong>。</li>
        <li>区分大小写：<code>age</code> 和 <code>Age</code> 是两个不同的变量。</li>
        <li>不能用 Python 的<strong>关键字</strong>（如 <code>if</code>、<code>for</code>、<code>print</code> 这类）做变量名。</li>
        <li>建议起<strong>有意义</strong>的名字，比如用 <code>user_age</code> 而不是 <code>a</code>，让代码一看就懂。</li>
      </ul>

      <h2>二、两种数字：整数 int 和小数 float</h2>
      <p>
        Python 里最常用的两种数字：<strong>整数</strong>（int，没有小数点，如 <code>10</code>、<code>-3</code>）
        和<strong>浮点数</strong>（float，带小数点，如 <code>3.14</code>、<code>1.0</code>）。
      </p>
      <CodeBlock lang="python" title="两种数字类型" code={numTypeCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={numTypeOut} />
      </Example>

      <h2>三、算术运算符</h2>
      <p>
        Python 能像计算器一样算数，下面是全部 7 个常用运算符：
      </p>
      <CodeBlock lang="python" title="七种算术运算" code={arithCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={arithOut} />
      </Example>
      <table>
        <thead>
          <tr><th>运算符</th><th>含义</th><th>例子（7 和 3）</th></tr>
        </thead>
        <tbody>
          <tr><td><code>+</code></td><td>加</td><td>10</td></tr>
          <tr><td><code>-</code></td><td>减</td><td>4</td></tr>
          <tr><td><code>*</code></td><td>乘</td><td>21</td></tr>
          <tr><td><code>/</code></td><td>除（结果是小数）</td><td>2.333...</td></tr>
          <tr><td><code>//</code></td><td>整除（去掉小数部分）</td><td>2</td></tr>
          <tr><td><code>%</code></td><td>取余（余数）</td><td>1</td></tr>
          <tr><td><code>**</code></td><td>幂（次方）</td><td>343</td></tr>
        </tbody>
      </table>
      <Callout variant="tip">
        <code>%</code>（取余）非常有用：判断一个数能不能被另一个整除——比如 <code>n % 2 == 0</code> 就是「n 是偶数」。
      </Callout>

      <h2>四、类型转换</h2>
      <p>
        不同类型的数据有时需要互相转换。常用三个转换函数：<code>int()</code> 转整数、
        <code>float()</code> 转小数、<code>str()</code> 转字符串。
      </p>
      <CodeBlock lang="python" title="类型转换实例" code={convertCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={convertOut} />
      </Example>
      <Callout variant="warn" title="字符串和数字不能直接运算">
        文字（字符串）和数字是两种东西，不能直接相加。下面这段会报错：
      </Callout>
      <CodeBlock lang="python" title="错误示范" code={typeErrCode} />
      <Example title="运行结果（报错）">
        <CodeBlock lang="text" title="运行结果" code={typeErrOut} />
      </Example>
      <p>
        解决办法：要么把字符串 <code>"100"</code> 用 <code>int()</code> 转成数字，要么把数字 <code>5</code> 用
        <code>str()</code> 转成字符串——取决于你想做加法还是拼接。
      </p>

      <h2>五、用 type() 查看类型</h2>
      <p>
        不确定一个变量是什么类型？用 <code>type()</code> 一查便知，调试时特别有用：
      </p>
      <CodeBlock lang="python" title="查看类型" code={`print(type(10))
print(type(3.14))
print(type("你好"))`} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={`<class 'int'>
<class 'float'>
<class 'str'>`} />
      </Example>

      <h2>六、input()：读取用户输入</h2>
      <KeyIdea>
        <code>input()</code> 会暂停程序、等用户在键盘上敲字并回车，然后把敲的内容交给你。
        括号里可以写一句提示语。<strong>关键点：input 读到的永远是字符串</strong>，哪怕用户输入的是数字。
      </KeyIdea>
      <CodeBlock lang="python" title="读取一段文字" code={inputCode} />
      <Example title="运行结果（下划线部分是用户输入的）">
        <CodeBlock lang="text" title="运行结果" code={inputOut} />
      </Example>
      <p>
        因为 <code>input</code> 给的是字符串，想拿来计算就必须先用 <code>int()</code> 或 <code>float()</code> 转换：
      </p>
      <CodeBlock lang="python" title="读取数字要转换" code={inputNumCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={inputNumOut} />
      </Example>
      <Callout variant="warn" title="最常见的新手坑">
        忘了转换，直接拿 <code>input()</code> 的结果做加减乘除，要么报错，要么得到奇怪的结果
        （比如 <code>"3" * 2</code> 会得到 <code>"33"</code> 而不是 6）。读数字记得 <code>int(input(...))</code>。
      </Callout>

      <Practice title="动手练一练">
        <ol>
          <li>写一个程序，问用户两个数字，输出它们的和、差、积、商。</li>
          <li>用 <code>%</code> 判断用户输入的数字是奇数还是偶数（提示：偶数 <code>n % 2 == 0</code>）。</li>
          <li>问用户出生年份，算出今年（2026）他多少岁并打印出来。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '变量用 = 赋值，把右边的值装进左边的名字，可重新赋值覆盖旧值；= 是赋值不是相等。',
          '命名规则：字母数字下划线、不能数字开头、区分大小写、别用关键字，起有意义的名字。',
          '两种数字：整数 int 和小数 float；type() 可查看类型。',
          '七个算术运算符：+ - * / // % **，其中 / 得小数、// 是整除、% 取余、** 是幂。',
          '类型转换用 int() / float() / str()；字符串和数字不能直接运算，否则 TypeError。',
          'input() 读用户输入，结果永远是字符串，要计算先用 int()/float() 转换。',
        ]}
      />
    </article>
  )
}
