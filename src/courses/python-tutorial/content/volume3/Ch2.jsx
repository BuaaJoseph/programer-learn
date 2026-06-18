import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCompCode = `# 列表推导式：1~5 的平方
squares = [x ** 2 for x in range(1, 6)]
print("平方：", squares)

# 带条件的推导式：只要偶数
evens = [x for x in range(1, 11) if x % 2 == 0]
print("偶数：", evens)

# 字典推导式：数字 -> 立方
cubes = {x: x ** 3 for x in range(1, 5)}
print("立方字典：", cubes)

# enumerate：同时拿到下标和值
fruits = ["苹果", "香蕉", "橙子"]
for i, name in enumerate(fruits, start=1):
    print(f"第{i}个：{name}")

# zip：把两个列表配对
names = ["小明", "小红"]
ages = [18, 17]
for name, age in zip(names, ages):
    print(f"{name} 今年 {age} 岁")`

const beforeCode = `# 普通写法：把 1~5 的平方收集到一个新列表
squares = []
for i in range(1, 6):
    squares.append(i * i)
print(squares)`
const beforeOut = `[1, 4, 9, 16, 25]`

const afterCode = `# 列表推导式：一行搞定
squares = [i * i for i in range(1, 6)]
print(squares)`
const afterOut = `[1, 4, 9, 16, 25]`

const condCode = `# 带条件：只要偶数的平方
even_sq = [i * i for i in range(1, 11) if i % 2 == 0]
print(even_sq)`
const condOut = `[4, 16, 36, 64, 100]`

const strCompCode = `names = ["  小明 ", "小红  ", " 小刚"]
clean = [n.strip() for n in names]   # 把每个名字去掉空格
print(clean)`
const strCompOut = `['小明', '小红', '小刚']`

const dictCompCode = `# 字典推导式：名字 -> 名字长度
names = ["Tom", "Jerry", "Bob"]
length_map = {name: len(name) for name in names}
print(length_map)`
const dictCompOut = `{'Tom': 3, 'Jerry': 5, 'Bob': 3}`

const setCompCode = `# 集合推导式：自动去重
nums = [1, 2, 2, 3, 3, 3]
squares = {n * n for n in nums}
print(squares)`
const setCompOut = `{1, 4, 9}`

const enumCode = `fruits = ["苹果", "香蕉", "橙子"]
# 不用 enumerate：要自己维护下标
i = 0
for f in fruits:
    print(i, f)
    i += 1
print("---")
# 用 enumerate：一步拿到下标和值
for index, f in enumerate(fruits):
    print(index, f)`
const enumOut = `0 苹果
1 香蕉
2 橙子
---
0 苹果
1 香蕉
2 橙子`

const enumStartCode = `for num, name in enumerate(["甲", "乙", "丙"], start=1):
    print(f"第{num}名：{name}")`
const enumStartOut = `第1名：甲
第2名：乙
第3名：丙`

const zipCode = `names = ["小明", "小红", "小刚"]
scores = [90, 85, 95]
for name, score in zip(names, scores):   # 两个列表并排走
    print(f"{name} 考了 {score} 分")`
const zipOut = `小明 考了 90 分
小红 考了 85 分
小刚 考了 95 分`

const zipDictCode = `keys = ["name", "age", "city"]
values = ["小明", 18, "杭州"]
person = dict(zip(keys, values))   # 两个列表合成字典
print(person)`
const zipDictOut = `{'name': '小明', 'age': 18, 'city': '杭州'}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们用 for 循环处理数据，写起来有点啰嗦。这一章学几个让代码更短、更优雅的 Python 招牌技巧：
        <strong>推导式</strong>（一行生成列表/字典/集合）、<strong>enumerate</strong>（遍历时顺手拿下标）、
        <strong>zip</strong>（并排遍历多个列表）。它们都不是必须的，但用好了能让代码清爽很多。
      </Lead>

      <h2>一、列表推导式</h2>
      <p>先看一个常见需求：把 1 到 5 的平方收集成列表。普通 for 写法是这样：</p>
      <CodeBlock lang="python" title="普通写法" code={beforeCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={beforeOut} />
      </Example>
      <KeyIdea>
        列表推导式把「创建空列表 + for 循环 + append」三步压缩成一行：
        <code>[表达式 for 变量 in 序列]</code>。读法：「对序列里的每个变量，算出表达式，收集成列表」。
      </KeyIdea>
      <CodeBlock lang="python" title="列表推导式" code={afterCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={afterOut} />
      </Example>

      <h3>带条件的推导式</h3>
      <p>在后面加一个 <code>if</code>，就能只保留满足条件的元素：</p>
      <CodeBlock lang="python" title="带 if 条件" code={condCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={condOut} />
      </Example>
      <p>表达式里也可以调用方法，比如批量清理字符串：</p>
      <CodeBlock lang="python" title="对每个元素做处理" code={strCompCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={strCompOut} />
      </Example>

      <h2>二、字典推导式</h2>
      <p>
        把方括号换成花括号、写成 <code>{'{键: 值 for ...}'}</code>，就能一行生成字典：
      </p>
      <CodeBlock lang="python" title="字典推导式" code={dictCompCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={dictCompOut} />
      </Example>

      <h2>三、集合推导式</h2>
      <p>
        花括号但只写一个表达式（没有冒号），生成的是集合，自带去重：
      </p>
      <CodeBlock lang="python" title="集合推导式" code={setCompCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={setCompOut} />
      </Example>
      <Callout variant="tip">
        花括号里有冒号 <code>键: 值</code> 是字典推导式，没冒号是集合推导式——靠有没有冒号区分。
      </Callout>
      <Callout variant="warn" title="别为了炫技把推导式写得太复杂">
        推导式适合简单的「映射 + 过滤」。如果逻辑很复杂（多重嵌套、好几个条件），
        老老实实写普通 for 循环反而更清楚易读。代码是给人看的。
      </Callout>

      <h3>推导式语法小结</h3>
      <table>
        <thead>
          <tr><th>类型</th><th>写法</th><th>得到</th></tr>
        </thead>
        <tbody>
          <tr><td>列表推导式</td><td><code>[x for x in 序列]</code></td><td>列表</td></tr>
          <tr><td>带条件</td><td><code>[x for x in 序列 if 条件]</code></td><td>过滤后的列表</td></tr>
          <tr><td>字典推导式</td><td><code>{'{k: v for ...}'}</code></td><td>字典</td></tr>
          <tr><td>集合推导式</td><td><code>{'{x for ...}'}</code></td><td>集合（去重）</td></tr>
        </tbody>
      </table>

      <h2>四、enumerate：遍历时顺带拿下标</h2>
      <p>
        遍历列表时如果既想要元素、又想要它的下标（第几个），不用自己维护一个计数器，用 <code>enumerate</code> 即可：
      </p>
      <CodeBlock lang="python" title="enumerate 对比普通写法" code={enumCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={enumOut} />
      </Example>
      <p>下标默认从 0 开始，可以用 <code>start</code> 改起始值，比如做排名时从 1 开始：</p>
      <CodeBlock lang="python" title="enumerate 指定起始值" code={enumStartCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={enumStartOut} />
      </Example>

      <h2>五、zip：把多个列表并排走</h2>
      <KeyIdea>
        <code>zip</code> 像拉链一样，把多个列表「对齐配对」：第 1 个和第 1 个一组、第 2 个和第 2 个一组……
        非常适合同时遍历两个相关的列表，比如名字和成绩。
      </KeyIdea>
      <CodeBlock lang="python" title="zip 并行遍历" code={zipCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={zipOut} />
      </Example>
      <p>配合 <code>dict()</code>，还能把两个列表（键列表 + 值列表）直接合成一个字典：</p>
      <CodeBlock lang="python" title="zip 合成字典" code={zipDictCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={zipDictOut} />
      </Example>
      <Callout variant="note" title="zip 以最短的为准">
        如果几个列表长度不一样，<code>zip</code> 会在最短的那个用完时停下，多出来的元素被忽略。
      </Callout>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」，看看结果。</p>
      <PyRunner initialCode={tryCompCode} />

      <Practice title="动手练一练">
        <ol>
          <li>用列表推导式生成 1 到 20 中所有能被 3 整除的数。</li>
          <li>给定一个单词列表，用字典推导式生成「单词 -&gt; 大写形式」的映射。</li>
          <li>有 <code>names</code> 和 <code>ages</code> 两个等长列表，用 zip + enumerate 打印「1. 小明，18岁」这样带序号的信息。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '列表推导式 [表达式 for x in 序列] 一行生成列表，可加 if 过滤、可对元素做处理。',
          '字典推导式 {键: 值 for ...}、集合推导式 {表达式 for ...}（无冒号、自动去重）。',
          '推导式适合简单映射+过滤，逻辑复杂时改用普通 for 更易读。',
          'enumerate 遍历时同时拿下标和值，免去手动计数，可用 start 指定起始下标。',
          'zip 把多个列表对齐配对并行遍历，配合 dict() 可把键列表+值列表合成字典。',
          'zip 以最短列表为准，多余元素被忽略。',
        ]}
      />
    </article>
  )
}
