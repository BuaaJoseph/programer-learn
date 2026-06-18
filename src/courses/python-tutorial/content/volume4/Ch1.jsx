import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const defCode = `def say_hello():
    print("你好！")

say_hello()      # 调用：让函数跑起来
say_hello()      # 可以反复调用`
const defOut = `你好！
你好！`

const paramCode = `def greet(name):          # name 是参数
    print(f"你好，{name}")

greet("小明")             # "小明" 是传进去的参数值
greet("小红")`
const paramOut = `你好，小明
你好，小红`

const returnCode = `def add(a, b):
    return a + b          # 把结果返回给调用处

result = add(3, 5)        # 接住返回值
print(result)
print(add(10, 20) * 2)    # 返回值可以直接参与运算`
const returnOut = `8
60`

const noneCode = `def show(x):
    print(x)              # 只打印，没有 return

r = show(100)
print(r)                  # 没有 return 的函数返回 None`
const noneOut = `100
None`

const multiReturnCode = `def min_max(nums):
    return min(nums), max(nums)   # 用逗号返回多个值（其实是一个元组）

low, high = min_max([3, 1, 4, 1, 5])   # 拆包接住
print("最小:", low)
print("最大:", high)`
const multiReturnOut = `最小: 1
最大: 5`

const defaultCode = `def greet(name, greeting="你好"):   # greeting 有默认值
    print(f"{greeting}，{name}")

greet("小明")                       # 不传 greeting，用默认
greet("小红", "早上好")              # 传了就用传的`
const defaultOut = `你好，小明
早上好，小红`

const kwargsCode = `def info(name, age, city):
    print(f"{name}，{age}岁，来自{city}")

info("小明", 18, "杭州")                       # 按位置传
info(city="北京", name="小红", age=20)         # 按关键字传，顺序随意`
const kwargsOut = `小明，18岁，来自杭州
小红，20岁，来自北京`

const docCode = `def area(width, height):
    """计算矩形面积。

    参数：
        width: 宽
        height: 高
    返回：
        面积（宽乘高）
    """
    return width * height

print(area(3, 4))
print(area.__doc__)     # 可以读出文档字符串`
const docOut = `12
计算矩形面积。

    参数：
        width: 宽
        height: 高
    返回：
        面积（宽乘高）`

const scopeCode = `x = 10            # 全局变量

def change():
    x = 99        # 这是函数内部的「局部」变量，和外面的 x 不是一个
    print("函数内:", x)

change()
print("函数外:", x)   # 外面的 x 没被改变`
const scopeOut = `函数内: 99
函数外: 10`

const globalCode = `count = 0

def add_one():
    global count      # 声明：我要改的是外面那个 count
    count += 1

add_one()
add_one()
print(count)`
const globalOut = `2`

export default function Ch1() {
  return (
    <article>
      <Lead>
        当一段代码要反复用、或者逻辑变复杂时，我们就把它打包成一个<strong>函数</strong>，
        起个名字，需要时一调用就行。这一章讲怎么定义函数、怎么传参数和返回结果、默认参数和关键字参数、
        给函数写说明文档，以及一个新手必须搞懂的概念——变量的「作用域」。
      </Lead>

      <h2>一、定义和调用函数</h2>
      <KeyIdea>
        用 <code>def</code> 关键字定义函数：<code>def 函数名():</code>，下面缩进的就是函数体。
        定义只是「写好备用」，要用 <code>函数名()</code> 去<strong>调用</strong>，函数体里的代码才会真正执行。
      </KeyIdea>
      <CodeBlock lang="python" title="最简单的函数" code={defCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={defOut} />
      </Example>
      <Callout variant="tip">
        函数的好处：① 同一段逻辑写一次、用多次，不用复制粘贴；② 给一段代码起个有意义的名字，让程序更好读；
        ③ 改逻辑只要改一处。这是写出整洁代码的基础。
      </Callout>

      <h2>二、参数：给函数传入数据</h2>
      <p>
        括号里可以放<strong>参数</strong>，相当于函数的「输入口」。调用时把具体的值传进去：
      </p>
      <CodeBlock lang="python" title="带参数的函数" code={paramCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={paramOut} />
      </Example>

      <h2>三、返回值：让函数把结果交出来</h2>
      <p>
        用 <code>return</code> 把计算结果「交出来」，调用处可以接住它继续用。这是函数最常见的形态：
      </p>
      <CodeBlock lang="python" title="return 返回结果" code={returnCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={returnOut} />
      </Example>
      <Callout variant="note" title="print 和 return 不是一回事">
        <code>print</code> 是把东西「显示给人看」；<code>return</code> 是把结果「交回给程序」继续用。
        没有 <code>return</code> 的函数，默认返回 <code>None</code>：
      </Callout>
      <CodeBlock lang="python" title="没有 return 返回 None" code={noneCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={noneOut} />
      </Example>

      <h2>四、返回多个值</h2>
      <p>
        <code>return</code> 后面用逗号隔开多个值，就能一次返回多个（本质是打包成一个元组），用拆包接住：
      </p>
      <CodeBlock lang="python" title="多返回值" code={multiReturnCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={multiReturnOut} />
      </Example>

      <h2>五、默认参数</h2>
      <p>
        给参数设一个<strong>默认值</strong>，调用时不传这个参数就用默认值，传了就用传的。让函数更灵活：
      </p>
      <CodeBlock lang="python" title="默认参数" code={defaultCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={defaultOut} />
      </Example>
      <Callout variant="warn" title="默认参数必须放在后面">
        有默认值的参数必须排在没默认值的参数后面，否则报语法错误。
        例如 <code>def f(a, b=1)</code> 合法，<code>def f(a=1, b)</code> 不合法。
      </Callout>

      <h2>六、关键字参数</h2>
      <p>
        调用时可以用 <code>参数名=值</code> 的形式指定，叫<strong>关键字参数</strong>。好处是顺序随意、含义清晰：
      </p>
      <CodeBlock lang="python" title="关键字参数" code={kwargsCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={kwargsOut} />
      </Example>

      <h2>七、文档字符串</h2>
      <p>
        在函数体第一行写一段三引号字符串，就是<strong>文档字符串</strong>（docstring），用来说明这个函数干什么。
        它不是注释，是函数自带的说明，可以被工具读取：
      </p>
      <CodeBlock lang="python" title="文档字符串" code={docCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={docOut} />
      </Example>

      <h2>八、局部变量 vs 全局变量</h2>
      <KeyIdea>
        在函数<strong>内部</strong>定义的变量是<strong>局部变量</strong>，只在函数里有效，函数一结束就消失；
        在函数<strong>外部</strong>定义的是<strong>全局变量</strong>。函数内部可以「读」全局变量，
        但直接赋值会创建一个同名的局部变量，不会影响外面的。
      </KeyIdea>
      <CodeBlock lang="python" title="作用域演示" code={scopeCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={scopeOut} />
      </Example>
      <p>
        如果确实想在函数里修改外面的全局变量，要用 <code>global</code> 声明一下：
      </p>
      <CodeBlock lang="python" title="global 修改全局变量" code={globalCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={globalOut} />
      </Example>
      <Callout variant="tip">
        实际开发中，<code>global</code> 能不用就不用——过度依赖全局变量会让代码难以维护。
        更好的做法是把需要的数据用参数传进函数，用 <code>return</code> 把结果传出来。
      </Callout>

      <Practice title="动手练一练">
        <ol>
          <li>写一个函数 <code>is_even(n)</code>，返回 n 是否为偶数（True/False）。</li>
          <li>写一个函数 <code>describe(name, age=18)</code>，打印一句自我介绍，age 有默认值。</li>
          <li>写一个函数 <code>stats(nums)</code>，一次返回列表的「总和」和「平均值」两个值，并在调用处拆包打印。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          'def 定义函数，函数名() 调用；定义只是备用，调用才执行函数体。',
          '参数是输入口，return 把结果交回给程序；没有 return 的函数返回 None。',
          'print 给人看、return 给程序用，两者不同；return 加逗号可返回多个值（元组），用拆包接住。',
          '默认参数让调用更灵活（必须放在无默认参数后面）；关键字参数 名=值 顺序随意、含义清晰。',
          '函数第一行的三引号文档字符串说明函数用途，可用 函数.__doc__ 读取。',
          '函数内是局部变量、外是全局变量；内部直接赋值不影响外部，要改全局需 global 声明（尽量少用，优先用参数+返回值）。',
        ]}
      />
    </article>
  )
}
