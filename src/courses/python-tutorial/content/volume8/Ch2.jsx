import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCode = `# 综合：正则 re.findall / re.sub + 一点类型注解
import re
from typing import List

def extract_phones(text: str) -> List[str]:   # 类型注解
    return re.findall(r"\\d{11}", text)        # 找出所有 11 位数字

def mask_phones(text: str) -> str:
    return re.sub(r"\\d{11}", "***", text)     # 把手机号替换成 ***

msg = "联系电话 13800001234，备用 13912345678"
print("找到手机号:", extract_phones(msg))
print("脱敏后:", mask_phones(msg))

# 提取所有邮箱
emails = re.findall(r"\\w+@\\w+\\.\\w+", "客服 a@qq.com 或 b@163.com")
print("邮箱:", emails)`

const reBasic = `import re

text = "我的电话是 13800001234，备用 13912345678"

# match：只从开头匹配
print(re.match(r"\\d+", text))            # 开头是"我"，不是数字 -> None

# search：在整个字符串里找第一个匹配
m = re.search(r"\\d+", text)
print(m.group())                         # 找到的内容

# findall：找出所有匹配，返回列表
print(re.findall(r"\\d{11}", text))       # 所有 11 位数字

# sub：替换匹配到的内容
print(re.sub(r"\\d{11}", "***", text))    # 把手机号换成 ***`

const reBasicResult = `None
13800001234
['13800001234', '13912345678']
我的电话是 ***，备用 ***`

const reMeta = `import re

# . 任意字符   \\d 数字   \\w 字母数字下划线   \\s 空白
# +一个或多个  *零个或多个  ? 零个或一个  {n} 恰好n个
# ^ 开头   $ 结尾   [] 字符集   | 或

print(re.findall(r"\\w+@\\w+\\.\\w+", "联系 a@qq.com 或 b@163.com"))  # 邮箱
print(re.findall(r"[0-9]+", "房间 101 和 202"))                       # 连续数字
print(bool(re.match(r"^1\\d{10}$", "13800001234")))                  # 整串是手机号吗`

const reMetaResult = `['a@qq.com', 'b@163.com']
['101', '202']
True`

const typeBasic = `# 类型注解：给参数和返回值标注"应该是什么类型"
def greet(name: str) -> str:        # 参数 name 是 str，返回 str
    return f"你好，{name}"

def add(a: int, b: int) -> int:     # 两个 int，返回 int
    return a + b

print(greet("小明"))
print(add(3, 4))`

const typeBasicResult = `你好，小明
7`

const typeContainer = `# 容器与可选类型：从 typing 导入（Python 3.9+ 也可直接用内置 list/dict）
from typing import Optional

def total(scores: list[int]) -> int:        # 一个由 int 组成的列表
    return sum(scores)

def get_age(info: dict[str, int]) -> int:   # 键是 str、值是 int 的字典
    return info["age"]

def find(name: str) -> Optional[str]:       # 返回 str 或 None
    users = {"小明": "北京"}
    return users.get(name)                   # 找不到返回 None

print(total([90, 85, 99]))
print(find("小红"))`

const typeContainerResult = `274
None`

const typeNote = `# 注意：类型注解只是"标注"，Python 不会强制检查！
def add(a: int, b: int) -> int:
    return a + b

print(add("你", "好"))   # 照样能跑，输出"你好"——注解只是给人和工具看的提示`

const typeNoteResult = `你好`

const builtins = `nums = [3, 1, 4, 1, 5, 9, 2, 6]

print(len(nums))            # 元素个数
print(sum(nums))            # 求和
print(max(nums), min(nums)) # 最大、最小
print(sorted(nums))         # 排序（返回新列表）
print(any(x > 8 for x in nums))   # 有没有大于 8 的
print(all(x > 0 for x in nums))   # 是不是全大于 0`

const builtinsResult = `8
31
9 1
[1, 1, 2, 3, 4, 5, 6, 9]
True
True`

const zipEnum = `names = ["小明", "小红", "小刚"]
scores = [90, 85, 99]

# zip：把多个列表"拉链"配对
for name, score in zip(names, scores):
    print(name, score)

print("---")

# enumerate：遍历时同时拿到下标
for i, name in enumerate(names, start=1):
    print(i, name)`

const zipEnumResult = `小明 90
小红 85
小刚 99
---
1 小明
2 小红
3 小刚`

const collectionsDemo = `from collections import Counter, defaultdict

# Counter：统计出现次数，超方便
words = ["苹果", "香蕉", "苹果", "苹果", "香蕉"]
print(Counter(words))
print(Counter(words).most_common(1))   # 出现最多的

# defaultdict：访问不存在的键时给个默认值，不报 KeyError
groups = defaultdict(list)
groups["水果"].append("苹果")           # 不用先建空列表
print(dict(groups))`

const collectionsResult = `Counter({'苹果': 3, '香蕉': 2})
[('苹果', 3)]
{'水果': ['苹果']}`

const itertoolsDemo = `import itertools

# 把多个列表首尾相连
print(list(itertools.chain([1, 2], [3, 4])))

# 累计求和
print(list(itertools.accumulate([1, 2, 3, 4])))

# 两两组合
print(list(itertools.combinations(["A", "B", "C"], 2)))`

const itertoolsResult = `[1, 2, 3, 4]
[1, 3, 6, 10]
[('A', 'B'), ('A', 'C'), ('B', 'C')]`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章是一组"日常高频工具"的合集：用<strong>正则表达式</strong>从文本里精准提取信息；
        用<strong>类型注解</strong>给代码加上类型说明、让它更易读易维护；复习一批
        <strong>常用内置函数</strong>；最后逛一逛 Python 自带的几个<strong>好用标准库</strong>。
        它们不一定每个都天天用，但认识了，写起代码来会顺手很多。
      </Lead>

      <h2>一、正则表达式 re：在文本里找规律</h2>
      <p>
        正则表达式是一种"描述文本规律"的小语言。比如"11 位连续数字"就是手机号的规律。
        Python 用内置 <code>re</code> 模块来用它。先看四个核心函数：
      </p>
      <CodeBlock lang="python" title="match / search / findall / sub" code={reBasic} />
      <CodeBlock lang="text" title="运行结果" code={reBasicResult} />
      <table>
        <thead>
          <tr><th>函数</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>re.match</code></td><td>只从字符串<strong>开头</strong>匹配</td></tr>
          <tr><td><code>re.search</code></td><td>在整个字符串里找<strong>第一个</strong>匹配</td></tr>
          <tr><td><code>re.findall</code></td><td>找出<strong>所有</strong>匹配，返回列表</td></tr>
          <tr><td><code>re.sub</code></td><td><strong>替换</strong>匹配到的内容</td></tr>
        </tbody>
      </table>

      <h3>常用元字符</h3>
      <p>正则的"规律"由元字符拼出来。下面是最常用的一批：</p>
      <CodeBlock lang="python" title="常用元字符示例" code={reMeta} />
      <CodeBlock lang="text" title="运行结果" code={reMetaResult} />
      <Callout variant="tip" title="为什么字符串前面加 r">
        正则里有很多反斜杠（如 <code>{'\\d'}</code>）。写成 <code>r"\\d+"</code> 这样的
        <strong>原始字符串</strong>，反斜杠就不会被 Python 当转义符处理，省去重复转义的麻烦。
      </Callout>

      <h2>二、类型注解：给代码加说明</h2>
      <p>
        类型注解是给参数和返回值标注"应该是什么类型"的语法。它让代码更易读，
        也让编辑器能帮你检查错误、自动补全。
      </p>
      <CodeBlock lang="python" title="基本类型注解" code={typeBasic} />
      <CodeBlock lang="text" title="运行结果" code={typeBasicResult} />

      <h3>容器与 Optional</h3>
      <p>
        列表、字典也能标注里面装什么；<code>Optional[X]</code> 表示"是 X 或者 None"。
      </p>
      <CodeBlock lang="python" title="list / dict / Optional" code={typeContainer} />
      <CodeBlock lang="text" title="运行结果" code={typeContainerResult} />
      <KeyIdea>
        <code>Optional[str]</code> 等价于"<code>str</code> 或 <code>None</code>"。
        函数可能返回 None（如查不到）时，用它标注最清楚。
      </KeyIdea>
      <Callout variant="warn" title="注解不会强制检查">
        类型注解只是<strong>给人和工具看的提示</strong>，Python 运行时<strong>不会</strong>
        因为类型不符而报错。它的价值在可读性和工具支持，不是运行时约束。
      </Callout>
      <CodeBlock lang="python" title="注解不会拦住你" code={typeNote} />
      <CodeBlock lang="text" title="运行结果" code={typeNoteResult} />

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」。</p>
      <PyRunner initialCode={tryCode} />

      <h2>三、常用内置函数</h2>
      <p>这些函数不用 import，直接就能用，处理列表 / 序列时极其顺手。</p>
      <CodeBlock lang="python" title="len/sum/max/min/sorted/any/all" code={builtins} />
      <CodeBlock lang="text" title="运行结果" code={builtinsResult} />

      <h3>zip 与 enumerate</h3>
      <p>
        <code>zip</code> 把多个列表配对，<code>enumerate</code> 在遍历时附带下标——
        这两个在 <code>for</code> 循环里出镜率极高。
      </p>
      <CodeBlock lang="python" title="zip 配对 / enumerate 带下标" code={zipEnum} />
      <CodeBlock lang="text" title="运行结果" code={zipEnumResult} />

      <Practice title="练一练">
        给定 <code>names = ["A", "B", "C"]</code> 和 <code>ages = [20, 19, 21]</code>，
        用 <code>zip</code> 配对，找出年龄最大的人的名字（提示：可配合 <code>max</code> 的 <code>key</code> 参数）。
      </Practice>

      <h2>四、好用的标准库一览</h2>
      <h3>collections：更趁手的容器</h3>
      <p>
        <code>Counter</code> 统计次数、<code>defaultdict</code> 给字典设默认值，两个救命神器。
      </p>
      <CodeBlock lang="python" title="Counter 与 defaultdict" code={collectionsDemo} />
      <CodeBlock lang="text" title="运行结果" code={collectionsResult} />

      <h3>itertools：迭代工具箱</h3>
      <p><code>itertools</code> 提供一堆高效的迭代工具，配合上一章的生成器思想很搭。</p>
      <CodeBlock lang="python" title="chain / accumulate / combinations" code={itertoolsDemo} />
      <CodeBlock lang="text" title="运行结果" code={itertoolsResult} />

      <h3>pathlib：现代路径处理</h3>
      <p>
        前面讲文件时见过它。<code>pathlib.Path</code> 用 <code>/</code> 拼路径、能直接读写、
        判断存在，是处理文件路径的现代首选。
      </p>
      <Example title="标准库速查">
        <ul>
          <li><strong>collections</strong>：Counter（计数）、defaultdict（带默认值的字典）、deque（双端队列）。</li>
          <li><strong>itertools</strong>：chain、accumulate、combinations、product 等迭代工具。</li>
          <li><strong>pathlib</strong>：面向对象的路径操作，读写 / 拼接 / 判断一把抓。</li>
          <li><strong>json</strong>（前面学过）、<strong>datetime</strong>（日期时间）、<strong>random</strong>（随机数）也都是高频常客。</li>
        </ul>
      </Example>
      <Callout variant="tip" title="不用全记">
        标准库非常庞大，没人能背全。记住"遇到某类问题，标准库里大概率有现成的"，
        需要时去查官方文档即可。会查，比死记更重要。
      </Callout>

      <Summary
        points={[
          '正则 re 四大函数：match（开头匹配）、search（找第一个）、findall（找全部）、sub（替换）。',
          '常用元字符：\\d 数字、\\w 字母数字、. 任意、+ 一或多、{n} 恰好n个、^ $ 头尾、[] 字符集、| 或；正则串用 r"..." 原始字符串。',
          '类型注解给参数 / 返回值标类型（如 def f(x: int) -> str），容器用 list[int]/dict[str,int]，可空用 Optional[X]；注解只是提示，不强制检查。',
          '内置函数高频：len/sum/max/min/sorted/any/all，加 zip（配对）、enumerate（带下标）。',
          'collections 的 Counter / defaultdict、itertools 的迭代工具、pathlib 的路径处理都很实用。',
          '标准库庞大，重点是"知道有、会去查"，不必死记。',
        ]}
      />
    </article>
  )
}
