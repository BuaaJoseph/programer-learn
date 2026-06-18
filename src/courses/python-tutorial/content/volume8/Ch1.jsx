import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const iterableDemo = `# 这些都是"可迭代对象"，能用 for 遍历
for x in [1, 2, 3]:       # 列表
    print(x)
for c in "abc":           # 字符串
    print(c)
for k in {"a": 1, "b": 2}: # 字典（遍历键）
    print(k)`

const iterNext = `# for 背后其实在做这些事
nums = [10, 20, 30]
it = iter(nums)       # 1. 拿到一个"迭代器"
print(next(it))       # 2. 反复 next() 取下一个
print(next(it))
print(next(it))
# print(next(it))     # 没有更多了，会抛 StopIteration

# for 循环就是自动帮你做 iter() + 不断 next()，遇到尽头自动停`

const iterNextResult = `10
20
30`

const genBasic = `# 用 yield 写生成器：调用时不立刻算，要一个才给一个
def count_up(n):
    i = 1
    while i <= n:
        yield i        # 每次 yield 吐出一个值，然后"暂停"在这里
        i += 1

for x in count_up(3):
    print(x)`

const genBasicResult = `1
2
3`

const genMemory = `# 列表：一次性把 100 万个数全造出来，占大量内存
big_list = [x * x for x in range(1_000_000)]

# 生成器：用到哪个才算哪个，几乎不占内存
big_gen = (x * x for x in range(1_000_000))   # 注意是圆括号

print(sum(big_gen))   # 边算边求和，内存友好`

const genMemoryResult = `333332833333500000`

const genLazy = `# 生成器是"惰性"的：不遍历就不会执行里面的代码
def make_numbers():
    print("开始生成")
    yield 1
    print("生成了 1，继续")
    yield 2

g = make_numbers()        # 此时什么都没打印！
print("还没开始取")
print(next(g))            # 取第一个，才执行到第一个 yield
print(next(g))            # 再取，继续往下执行`

const genLazyResult = `还没开始取
开始生成
1
生成了 1，继续
2`

const decoNoSugar = `# 装饰器：一个"包装函数的函数"
def my_decorator(func):
    def wrapper():
        print("调用前")
        func()              # 执行原来的函数
        print("调用后")
    return wrapper

def say_hi():
    print("你好")

say_hi = my_decorator(say_hi)   # 手动包装
say_hi()`

const decoNoSugarResult = `调用前
你好
调用后`

const decoSugar = `# @语法：和上面手动包装完全等价，但更优雅
def my_decorator(func):
    def wrapper():
        print("调用前")
        func()
        print("调用后")
    return wrapper

@my_decorator              # 等于 say_hi = my_decorator(say_hi)
def say_hi():
    print("你好")

say_hi()`

const decoTimer = `import time

# 给任意函数"计时"的装饰器
def timer(func):
    def wrapper(*args, **kwargs):       # 收下原函数的所有参数
        start = time.time()
        result = func(*args, **kwargs)  # 执行原函数，保留返回值
        cost = time.time() - start
        print(f"{func.__name__} 耗时 {cost:.4f} 秒")
        return result
    return wrapper

@timer
def slow_add(a, b):
    time.sleep(1)
    return a + b

print(slow_add(3, 4))`

const decoTimerResult = `slow_add 耗时 1.0012 秒
7`

const withDemo = `# with 上下文管理器：自动管理"开始 / 结束"成对的操作
with open("note.txt", "w", encoding="utf-8") as f:
    f.write("hello")
# 离开 with，文件自动关闭——哪怕中间出错也会关

# 自己也能写一个上下文管理器
from contextlib import contextmanager

@contextmanager
def timer_block():
    import time
    start = time.time()
    yield                      # yield 之前是"进入时"，之后是"离开时"
    print(f"耗时 {time.time() - start:.4f} 秒")

with timer_block():
    sum(range(1_000_000))`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一章讲三个让 Python 代码更优雅、也更"Pythonic"的概念：<strong>迭代器</strong>
        （for 循环背后的机制）、<strong>生成器</strong>（用 yield 边算边给、省内存）、
        <strong>装饰器</strong>（不改原函数就给它加功能）。再顺带认识一下 <code>with</code>
        背后的<strong>上下文管理器</strong>。它们在后面的实战代码里随处可见。
      </Lead>

      <h2>一、可迭代对象与 for 的背后</h2>
      <p>
        我们早就在用 <code>for</code> 遍历列表、字符串、字典——这些都叫<strong>可迭代对象</strong>。
      </p>
      <CodeBlock lang="python" title="各种可迭代对象" code={iterableDemo} />
      <p>
        <code>for</code> 其实是个语法糖。它背后做的是：先用 <code>iter()</code> 拿到一个
        <strong>迭代器</strong>，再不断调用 <code>next()</code> 取下一个值，直到没有为止。
      </p>
      <CodeBlock lang="python" title="for 背后的 iter / next" code={iterNext} />
      <CodeBlock lang="text" title="运行结果" code={iterNextResult} />
      <KeyIdea>
        一个对象只要实现了 <code>__iter__</code>（返回迭代器）和 <code>__next__</code>（返回下一个值），
        就能被 <code>for</code> 遍历。好在大多数时候我们不用手写这两个——用下面的生成器更简单。
      </KeyIdea>

      <h2>二、生成器：用 yield 边算边给</h2>
      <p>
        写一个带 <code>yield</code> 的函数，它就变成了<strong>生成器</strong>。和普通函数
        <code>return</code> 一次就结束不同，<code>yield</code> 可以<strong>吐出一个值后暂停</strong>，
        下次再要时从暂停处继续。
      </p>
      <CodeBlock lang="python" title="第一个生成器" code={genBasic} />
      <CodeBlock lang="text" title="运行结果" code={genBasicResult} />

      <h3>省内存：用到哪算到哪</h3>
      <p>
        生成器最大的好处是<strong>省内存</strong>。列表会把所有元素一次性全造出来，
        生成器则"要一个算一个"。处理大量数据时差别巨大。
      </p>
      <CodeBlock lang="python" title="列表 vs 生成器（内存）" code={genMemory} />
      <CodeBlock lang="text" title="运行结果" code={genMemoryResult} />
      <Callout variant="tip" title="生成器表达式">
        把列表推导的方括号 <code>[]</code> 换成圆括号 <code>()</code>，就得到一个
        <strong>生成器表达式</strong>，写法和列表推导几乎一样，但不占内存。
      </Callout>

      <h3>惰性：不取就不算</h3>
      <p>
        生成器是<strong>惰性</strong>的——你不去遍历（不 <code>next</code>），里面的代码根本不会执行。
      </p>
      <CodeBlock lang="python" title="生成器的惰性" code={genLazy} />
      <CodeBlock lang="text" title="运行结果" code={genLazyResult} />

      <Practice title="练一练">
        写一个生成器 <code>even_numbers(n)</code>，依次 <code>yield</code> 出前 n 个偶数。
        用 <code>for</code> 打印前 5 个，再用 <code>list(even_numbers(5))</code> 一次性收集成列表看看。
      </Practice>

      <h2>三、装饰器：给函数加功能而不改它</h2>
      <p>
        装饰器是<strong>"包装函数的函数"</strong>：它接收一个函数，返回一个新函数，
        在不动原函数代码的前提下给它加上额外行为（如打日志、计时、权限检查）。
        先看不用语法糖的原始形态：
      </p>
      <CodeBlock lang="python" title="装饰器的本质：包装函数" code={decoNoSugar} />
      <CodeBlock lang="text" title="运行结果" code={decoNoSugarResult} />

      <h3>@语法：优雅写法</h3>
      <p>
        手动写 <code>say_hi = my_decorator(say_hi)</code> 太啰嗦。Python 提供
        <code>@装饰器名</code> 的语法糖，放在函数定义上面即可，效果完全一样。
      </p>
      <CodeBlock lang="python" title="用 @ 语法" code={decoSugar} />
      <KeyIdea>
        <code>@my_decorator</code> 写在 <code>def say_hi</code> 上面，就等于
        <code>say_hi = my_decorator(say_hi)</code>。你在框架代码里见到的一堆 <code>@xxx</code>
        （如 <code>@tool</code>、<code>@dataclass</code>）全是这个机制。
      </KeyIdea>

      <h3>实用例子：给函数计时</h3>
      <p>
        下面这个 <code>@timer</code> 能给<strong>任意</strong>函数计时。关键是用
        <code>*args, **kwargs</code> 接住原函数的所有参数，并 <code>return</code> 它的结果，
        这样包装后功能不变、只是多了计时。
      </p>
      <CodeBlock lang="python" title="计时装饰器" code={decoTimer} />
      <CodeBlock lang="text" title="运行结果" code={decoTimerResult} />
      <Example title="为什么要 *args, **kwargs">
        <p>
          因为我们想让 <code>@timer</code> 能装饰各种函数——有的没参数，有的两个参数，有的带关键字参数。
          <code>*args</code> 收集所有位置参数、<code>**kwargs</code> 收集所有关键字参数，
          原样转交给被包装的函数，做到"通用"。
        </p>
      </Example>

      <h2>四、with 与上下文管理器一瞥</h2>
      <p>
        前面读写文件用过 <code>with</code>。它背后是<strong>上下文管理器</strong>：
        负责"进入时做准备、离开时做收尾"，而且<strong>哪怕中间出错也保证收尾</strong>
        （比如关文件）。我们也能用 <code>@contextmanager</code> + <code>yield</code> 自己写一个。
      </p>
      <CodeBlock lang="python" title="with 与自定义上下文管理器" code={withDemo} />
      <p>
        注意自定义那个里 <code>yield</code> 把代码分成两半：之前是"进入 with 时"执行，
        之后是"离开 with 时"执行。这和生成器的暂停机制是同一套思想。
      </p>
      <Callout variant="note" title="它们其实是一家人">
        迭代器、生成器、上下文管理器都建立在"协议（特定的双下方法）"之上。
        你不需要死记细节，记住它们各自解决什么问题，会用就够了。
      </Callout>

      <Summary
        points={[
          'for 背后是 iter() 拿迭代器 + 反复 next() 取值，到尽头抛 StopIteration 自动停。',
          '带 yield 的函数是生成器：吐一个值就暂停，下次从暂停处继续；省内存、且惰性（不取不算）。',
          '生成器表达式：把列表推导的 [] 换成 ()，写法相同但不一次性占内存。',
          '装饰器是"包装函数的函数"，不改原函数就加功能；@装饰器 等价于 函数 = 装饰器(函数)。',
          '通用装饰器用 *args, **kwargs 接住任意参数并 return 原结果，典型应用如计时、日志。',
          'with 背后是上下文管理器，保证"进入准备、离开收尾"（如自动关文件），可用 @contextmanager + yield 自定义。',
        ]}
      />
    </article>
  )
}
