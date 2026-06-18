import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCode = `# 综合：lambda + map / filter + sorted(key=)
nums = [5, 2, 8, 1, 9, 3]

# map：每个数平方
squares = list(map(lambda x: x * x, nums))
print("平方:", squares)

# filter：只留大于 3 的
big = list(filter(lambda x: x > 3, nums))
print("大于3:", big)

# sorted：按字典字段排序
people = [{"name": "小明", "age": 18},
          {"name": "小红", "age": 16},
          {"name": "小刚", "age": 20}]
by_age = sorted(people, key=lambda p: p["age"])
for p in by_age:
    print(p["name"], p["age"])`

const argsCode = `def total(*nums):          # *nums 收集任意多个位置参数，变成元组
    print(nums)            # 看看它长什么样
    return sum(nums)

print(total(1, 2, 3))
print(total(10, 20, 30, 40))`
const argsOut = `(1, 2, 3)
6
(10, 20, 30, 40)
100`

const kwargsCode = `def show(**info):          # **info 收集任意多个关键字参数，变成字典
    print(info)
    for k, v in info.items():
        print(f"{k}: {v}")

show(name="小明", age=18, city="杭州")`
const kwargsOut = `{'name': '小明', 'age': 18, 'city': '杭州'}
name: 小明
age: 18
city: 杭州`

const bothCode = `def demo(a, *args, **kwargs):
    print("a =", a)
    print("args =", args)
    print("kwargs =", kwargs)

demo(1, 2, 3, x=10, y=20)`
const bothOut = `a = 1
args = (2, 3)
kwargs = {'x': 10, 'y': 20}`

const lambdaCode = `# 普通函数
def square(x):
    return x * x

# 等价的 lambda（匿名函数）
square2 = lambda x: x * x

print(square(5))
print(square2(5))`
const lambdaOut = `25
25`

const mapCode = `nums = [1, 2, 3, 4]
# map：对每个元素套用一个函数
result = map(lambda x: x * x, nums)
print(list(result))      # map 结果要用 list() 转成列表查看`
const mapOut = `[1, 4, 9, 16]`

const filterCode = `nums = [1, 2, 3, 4, 5, 6]
# filter：只保留让函数返回 True 的元素
evens = filter(lambda x: x % 2 == 0, nums)
print(list(evens))`
const filterOut = `[2, 4, 6]`

const sortedCode = `students = [
    {"name": "小明", "score": 90},
    {"name": "小红", "score": 85},
    {"name": "小刚", "score": 95},
]
# 用 key 指定按哪个字段排序
by_score = sorted(students, key=lambda s: s["score"], reverse=True)
for s in by_score:
    print(s["name"], s["score"])`
const sortedOut = `小刚 95
小明 90
小红 85`

const passFuncCode = `def shout(text):
    return text.upper() + "!"

def whisper(text):
    return text.lower() + "..."

def apply(func, text):       # func 是「一个函数」
    return func(text)        # 在内部调用它

print(apply(shout, "Hello"))
print(apply(whisper, "Hello"))`
const passFuncOut = `HELLO!
hello...`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章把函数玩得更花一点：用 <code>*args</code> 和 <code>**kwargs</code> 接收任意数量的参数；
        用 <code>lambda</code> 写「一次性」的小函数；用 <code>map</code>、<code>filter</code>、<code>sorted</code>
        这些「高阶函数」批量处理数据；最后理解一个很有用的思想——<strong>函数本身也能当数据传来传去</strong>。
        这个思想在后面做 AI Agent 时尤其重要。
      </Lead>

      <h2>一、*args：接收任意多个位置参数</h2>
      <KeyIdea>
        在参数名前加一个星号 <code>*</code>（习惯叫 <code>*args</code>），它会把传进来的<strong>多个位置参数
        打包成一个元组</strong>。这样函数就能接收「不确定个数」的参数。
      </KeyIdea>
      <CodeBlock lang="python" title="*args 收集多个参数" code={argsCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={argsOut} />
      </Example>

      <h2>二、**kwargs：接收任意多个关键字参数</h2>
      <p>
        两个星号 <code>**</code>（习惯叫 <code>**kwargs</code>）则把传进来的<strong>关键字参数打包成字典</strong>：
      </p>
      <CodeBlock lang="python" title="**kwargs 收集关键字参数" code={kwargsCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={kwargsOut} />
      </Example>
      <p>普通参数、<code>*args</code>、<code>**kwargs</code> 可以一起用，顺序是固定的：</p>
      <CodeBlock lang="python" title="三者一起用" code={bothCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={bothOut} />
      </Example>
      <Callout variant="note" title="名字不是固定的">
        <code>args</code> 和 <code>kwargs</code> 只是约定俗成的名字，真正起作用的是 <code>*</code> 和 <code>**</code>。
        你写 <code>*nums</code>、<code>**info</code> 也完全可以。
      </Callout>

      <h2>三、lambda：一次性的小函数</h2>
      <KeyIdea>
        <code>lambda</code> 用来快速定义一个<strong>简短的匿名函数</strong>（没有名字的函数）。
        格式：<code>lambda 参数: 表达式</code>，表达式的结果就是返回值。适合那种「就用一次、不值得专门 def」的小逻辑。
      </KeyIdea>
      <CodeBlock lang="python" title="lambda 对比普通函数" code={lambdaCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={lambdaOut} />
      </Example>
      <Callout variant="warn" title="lambda 只能写简单逻辑">
        lambda 里只能放一个表达式，不能写多行、不能写 if/for 语句块。逻辑稍复杂就老实用 <code>def</code>。
        lambda 的主战场是「临时丢给别的函数当参数」，见下面。
      </Callout>

      <h2>四、高阶函数：map / filter / sorted</h2>
      <p>
        「高阶函数」就是<strong>能接收另一个函数当参数</strong>的函数。它们常和 lambda 搭配，批量处理数据。
      </p>
      <h3>map：对每个元素做同样处理</h3>
      <CodeBlock lang="python" title="map" code={mapCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={mapOut} />
      </Example>

      <h3>filter：筛选出满足条件的元素</h3>
      <CodeBlock lang="python" title="filter" code={filterCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={filterOut} />
      </Example>
      <Callout variant="tip">
        <code>map</code> 和 <code>filter</code> 的结果需要用 <code>list()</code> 转一下才能直接打印查看。
        其实这两件事用列表推导式也能做，而且很多人觉得推导式更直观，可以对照上一卷复习。
      </Callout>

      <h3>sorted(key=...)：按指定规则排序</h3>
      <p>
        <code>sorted</code> 的 <code>key</code> 参数接收一个函数，告诉它「按什么排」。这是 lambda 最常见的用武之地：
      </p>
      <CodeBlock lang="python" title="按字典字段排序" code={sortedCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={sortedOut} />
      </Example>

      <h2>五、把函数当参数传</h2>
      <p>
        在 Python 里，函数和数字、字符串一样是「值」，可以赋给变量、放进列表、当参数传给别的函数。
        理解这一点，你才真正读懂了高阶函数：
      </p>
      <CodeBlock lang="python" title="函数作为参数" code={passFuncCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={passFuncOut} />
      </Example>
      <Callout variant="note" title="为什么这对学 AI Agent 重要">
        后面做 Agent 时，我们会把一个个「工具函数」交给框架，由框架在需要时调用——
        这正是「把函数当参数 / 当数据传递」的思想。现在打好这个底，后面会很顺。
      </Callout>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」。</p>
      <PyRunner initialCode={tryCode} />

      <Practice title="动手练一练">
        <ol>
          <li>写一个 <code>average(*nums)</code> 函数，能接收任意多个数字并返回它们的平均值。</li>
          <li>用 <code>filter</code> + lambda 从一个列表里筛出所有大于 60 的分数。</li>
          <li>有一个 <code>[("苹果", 5), ("香蕉", 3), ("橙子", 8)]</code> 的列表，用 <code>sorted</code> + lambda 按第二个元素（数量）从大到小排序。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '*args 把多个位置参数打包成元组，**kwargs 把多个关键字参数打包成字典，让函数接收不定数量参数。',
          'args/kwargs 只是习惯名，关键是 * 和 **；可与普通参数一起用，顺序固定。',
          'lambda 参数: 表达式 定义匿名小函数，只能放一个表达式，适合临时传给别的函数。',
          '高阶函数能接收函数当参数：map 逐个处理、filter 筛选、sorted(key=...) 按规则排序，常配 lambda。',
          'map/filter 结果用 list() 查看；这两件事也可用列表推导式完成。',
          '函数本身就是值，可赋给变量、当参数传递——这是高阶函数的本质，也是后续学 Agent 工具调用的基础。',
        ]}
      />
    </article>
  )
}
