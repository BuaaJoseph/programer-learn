import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryDictSetCode = `# 字典：增、改、查、遍历
scores = {"语文": 88, "数学": 95}
scores["英语"] = 90        # 增
scores["语文"] = 92        # 改
print("数学成绩：", scores["数学"])   # 查

for subject, score in scores.items():
    print(f"{subject}: {score}")

# 集合：去重 + 交并
a = {1, 2, 3, 3, 2}        # 重复会自动去掉
b = {3, 4, 5}
print("去重后：", a)
print("交集：", a & b)
print("并集：", a | b)`

const createCode = `student = {
    "name": "小明",
    "age": 18,
    "score": 92,
}
print(student)
print(student["name"])   # 用键取值
print(student["age"])`
const createOut = `{'name': '小明', 'age': 18, 'score': 92}
小明
18`

const getCode = `student = {"name": "小明", "age": 18}
print(student.get("name"))        # 等同于 student["name"]
print(student.get("phone"))       # 键不存在，返回 None，不报错
print(student.get("phone", "未填")) # 不存在时返回默认值
# print(student["phone"])         # 这样写键不存在会直接 KeyError`
const getOut = `小明
None
未填`

const editCode = `d = {"a": 1, "b": 2}
d["c"] = 3        # 新增：键不存在就添加
d["a"] = 100      # 修改：键已存在就更新
del d["b"]        # 删除
print(d)`
const editOut = `{'a': 100, 'c': 3}`

const loopCode = `student = {"name": "小明", "age": 18, "score": 92}
for key in student:               # 直接遍历得到的是「键」
    print(key, "=", student[key])

print("---")
for k, v in student.items():      # items() 同时拿键和值
    print(k, "->", v)

print(list(student.keys()))       # 所有键
print(list(student.values()))     # 所有值`
const loopOut = `name = 小明
age = 18
score = 92
---
name -> 小明
age -> 18
score -> 92
['name', 'age', 'score']
['小明', '18', '92']`

const nestedCode = `users = {
    "u1": {"name": "小明", "age": 18},
    "u2": {"name": "小红", "age": 20},
}
print(users["u1"]["name"])    # 一层层取
print(users["u2"]["age"])`
const nestedOut = `小明
20`

const setCreateCode = `s = {1, 2, 3, 2, 1}     # 集合用花括号，自动去重
print(s)
nums = [1, 1, 2, 3, 3, 3]
print(set(nums))         # 用 set() 给列表去重
empty = set()            # 注意：空集合要用 set()，{} 是空字典`
const setCreateOut = `{1, 2, 3}
{1, 2, 3}`

const setOpCode = `a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(a & b)    # 交集：两边都有的
print(a | b)    # 并集：两边合起来
print(a - b)    # 差集：a 有但 b 没有的
print(3 in a)   # 判断元素是否在集合里（非常快）`
const setOpOut = `{3, 4}
{1, 2, 3, 4, 5, 6}
{1, 2}
True`

export default function Ch2() {
  return (
    <article>
      <Lead>
        列表用「位置」找数据，但很多时候我们想用「名字」找——比如用「name」拿到名字、用「age」拿到年龄。
        这就是<strong>字典</strong>的用武之地：键值对的集合。这一章讲字典的创建、取值、增删改、遍历和嵌套，
        再介绍另一个容器——擅长去重和集合运算的<strong>集合</strong>。
      </Lead>

      <h2>一、字典是什么</h2>
      <KeyIdea>
        字典（dict）存的是<strong>键值对</strong>（key: value）：每个「值」都有一个「键」做标签，
        用键就能取出值。用<strong>花括号</strong> <code>{'{}'}</code> 创建，键和值之间用冒号，对与对之间用逗号。
      </KeyIdea>
      <CodeBlock lang="python" title="创建字典、用键取值" code={createCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={createOut} />
      </Example>
      <Callout variant="note" title="键通常用字符串">
        键一般是字符串（也可以是数字、元组），且<strong>不能重复</strong>；值可以是任意类型。
        字典适合表示「一个有多种属性的东西」，比如一个学生、一件商品。
      </Callout>

      <h2>二、用 get 安全取值</h2>
      <p>
        直接用 <code>d["键"]</code> 取值时，如果键不存在会直接报 <code>KeyError</code>。
        更安全的做法是用 <code>get()</code>，键不存在时返回 <code>None</code> 或你指定的默认值，不报错：
      </p>
      <CodeBlock lang="python" title="get 安全取值" code={getCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={getOut} />
      </Example>
      <Callout variant="tip">
        不确定键在不在的时候，优先用 <code>get</code>，能避免程序因为 <code>KeyError</code> 直接崩溃。
      </Callout>

      <h2>三、增、删、改</h2>
      <p>
        字典的增和改都用 <code>d["键"] = 值</code>：键不存在就<strong>新增</strong>，键已存在就<strong>修改</strong>。
        删除用 <code>del</code>：
      </p>
      <CodeBlock lang="python" title="增删改" code={editCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={editOut} />
      </Example>

      <h2>四、遍历字典</h2>
      <p>
        遍历字典有几种方式，最常用的是 <code>items()</code>，能同时拿到键和值：
      </p>
      <CodeBlock lang="python" title="遍历键、键值对" code={loopCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={loopOut} />
      </Example>
      <table>
        <thead>
          <tr><th>写法</th><th>得到</th></tr>
        </thead>
        <tbody>
          <tr><td><code>for k in d</code></td><td>每个键</td></tr>
          <tr><td><code>d.keys()</code></td><td>所有键</td></tr>
          <tr><td><code>d.values()</code></td><td>所有值</td></tr>
          <tr><td><code>d.items()</code></td><td>每个 (键, 值) 对</td></tr>
        </tbody>
      </table>

      <h2>五、嵌套字典</h2>
      <p>
        字典的值也可以是字典，用来表示更复杂的结构（这也是网络数据 JSON 的常见形态，做 AI、爬虫时天天见）：
      </p>
      <CodeBlock lang="python" title="嵌套字典" code={nestedCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={nestedOut} />
      </Example>

      <h2>六、集合：去重与集合运算</h2>
      <KeyIdea>
        集合（set）也用花括号，但里面只有「值」没有「键」，而且元素<strong>不重复、无序</strong>。
        它最拿手两件事：<strong>去重</strong>和<strong>集合运算</strong>（交、并、差）。
      </KeyIdea>
      <CodeBlock lang="python" title="创建集合与去重" code={setCreateCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={setCreateOut} />
      </Example>
      <Callout variant="warn" title="空集合不能写成 {}">
        <code>{'{}'}</code> 是一个<strong>空字典</strong>，不是空集合！要创建空集合必须用 <code>set()</code>。
      </Callout>
      <p>
        集合运算用几个简单符号就能完成，处理「两组数据有什么交集 / 合在一起 / 谁多出来」非常方便：
      </p>
      <CodeBlock lang="python" title="交、并、差与 in" code={setOpCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={setOpOut} />
      </Example>
      <Callout variant="tip">
        用 <code>in</code> 判断某个值是否存在时，集合比列表<strong>快得多</strong>。
        当你只关心「在不在」、且数据量大时，优先用集合。
      </Callout>

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」，看看结果。</p>
      <PyRunner initialCode={tryDictSetCode} />

      <Practice title="动手练一练">
        <ol>
          <li>建一个字典记录一件商品的名称、价格、库存，然后把价格改成打 9 折后的值并打印。</li>
          <li>用 <code>items()</code> 遍历这个商品字典，按「键：值」的格式逐行打印。</li>
          <li>给一个有重复元素的列表去重（用 <code>set()</code>），再用 <code>&</code> 求出两个集合的共同元素。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '字典是键值对集合，用花括号 {键: 值} 创建，用 d[键] 取值；键不重复，常用字符串做键。',
          '取值优先用 d.get(键, 默认值)，键不存在不报错；直接 d[键] 取不存在的键会 KeyError。',
          '增和改都用 d[键] = 值（不存在则新增），删用 del d[键]。',
          '遍历：for k in d 得键；keys()/values()/items() 分别拿键/值/键值对，items 最常用。',
          '字典可嵌套，对应网络数据 JSON 结构，用多层下标访问。',
          '集合用花括号、元素不重复无序，擅长去重（set()）和交并差（& | -）；空集合要写 set()，in 判断很快。',
        ]}
      />
    </article>
  )
}
