import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'

const createCode = `fruits = ["苹果", "香蕉", "橙子"]
nums = [10, 20, 30, 40]
mixed = [1, "你好", 3.14, True]   # 一个列表里可以放不同类型
empty = []                        # 空列表
print(fruits)
print(len(fruits))                # 列表里有几个元素`
const createOut = `['苹果', '香蕉', '橙子']
3`

const indexCode = `fruits = ["苹果", "香蕉", "橙子", "葡萄"]
print(fruits[0])     # 第一个，下标从 0 开始
print(fruits[-1])    # 倒数第一个
print(fruits[1:3])   # 切片，含头不含尾
fruits[0] = "西瓜"    # 修改某个元素
print(fruits)`
const indexOut = `苹果
葡萄
['香蕉', '橙子']
['西瓜', '香蕉', '橙子', '葡萄']`

const addRemoveCode = `nums = [1, 2, 3]
nums.append(4)        # 末尾追加
print(nums)
nums.insert(0, 99)    # 在下标 0 处插入
print(nums)
nums.pop()            # 删掉最后一个（并返回它）
print(nums)
nums.remove(99)       # 按值删除（删第一个匹配的）
print(nums)`
const addRemoveOut = `[1, 2, 3, 4]
[99, 1, 2, 3, 4]
[99, 1, 2, 3]
[1, 2, 3]`

const loopCode = `fruits = ["苹果", "香蕉", "橙子"]
for f in fruits:
    print("我爱吃", f)`
const loopOut = `我爱吃 苹果
我爱吃 香蕉
我爱吃 橙子`

const commonCode = `nums = [3, 1, 4, 1, 5, 9, 2]
print(len(nums))      # 长度
nums.sort()           # 原地排序（从小到大）
print(nums)
nums.reverse()        # 原地反转
print(nums)
print(9 in nums)      # 9 在列表里吗
print(7 in nums)`
const commonOut = `7
[1, 1, 2, 3, 4, 5, 9]
[9, 5, 4, 3, 2, 1, 1]
True
False`

const nestedCode = `# 用嵌套列表表示一个 2x3 的表格
matrix = [
    [1, 2, 3],
    [4, 5, 6],
]
print(matrix[0])      # 第一行
print(matrix[0][1])   # 第一行第二个元素
print(matrix[1][2])`
const nestedOut = `[1, 2, 3]
2
6`

const tupleCode = `point = (3, 5)        # 元组用圆括号
print(point[0])
print(point[1])

# 元组不可变：下面这行会报错
# point[0] = 99   ->  TypeError

# 常见用途：函数返回多个值、坐标、固定不变的一组数据
x, y = point          # 拆包：把元组的两个值分别给 x 和 y
print(x, y)`
const tupleOut = `3
5
3 5`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到目前为止我们一次只存一个数据。但现实里数据常常成批出现：一串学生名字、一组成绩……
        这就要用<strong>列表</strong>来装。这一章讲列表的创建、取值、增删改、遍历和常用操作，
        以及它的「亲戚」——不可变的<strong>元组</strong>。
      </Lead>

      <h2>一、列表是什么</h2>
      <KeyIdea>
        列表（list）是一串<strong>有序</strong>的数据，用方括号 <code>{'[]'}</code> 把元素括起来、
        用逗号隔开。它可以装任意类型，长度随时可变，是 Python 里最常用的容器。
      </KeyIdea>
      <CodeBlock lang="python" title="创建列表" code={createCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={createOut} />
      </Example>

      <h2>二、索引、切片与修改</h2>
      <p>
        和字符串一样，列表也用下标取值，<strong>从 0 开始</strong>，负数从末尾数，切片「含头不含尾」。
        不同的是，列表可以<strong>改</strong>某个位置的值：
      </p>
      <CodeBlock lang="python" title="取值、切片、修改" code={indexCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={indexOut} />
      </Example>

      <h2>三、增、删、改</h2>
      <p>
        列表是「活」的，可以随时往里加、往外删。最常用的几个方法：
      </p>
      <CodeBlock lang="python" title="append / insert / pop / remove" code={addRemoveCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={addRemoveOut} />
      </Example>
      <table>
        <thead>
          <tr><th>方法</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>append(x)</code></td><td>在末尾追加一个元素</td></tr>
          <tr><td><code>insert(i, x)</code></td><td>在下标 i 处插入 x</td></tr>
          <tr><td><code>pop()</code></td><td>删除并返回最后一个；<code>pop(i)</code> 删指定位置</td></tr>
          <tr><td><code>remove(x)</code></td><td>删除第一个值为 x 的元素</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="remove 删的是「值」，pop 删的是「位置」">
        <code>remove("苹果")</code> 是按内容删；<code>pop(2)</code> 是按下标删。
        用 <code>remove</code> 删一个不存在的值会报错，删之前可以先用 <code>in</code> 判断一下。
      </Callout>

      <h2>四、遍历列表</h2>
      <p>
        用 <code>for ... in</code> 可以把列表里的元素一个个拿出来处理（循环下一章会细讲，这里先体会用法）：
      </p>
      <CodeBlock lang="python" title="遍历每个元素" code={loopCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={loopOut} />
      </Example>

      <h2>五、常用操作</h2>
      <CodeBlock lang="python" title="len / sort / reverse / in" code={commonCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={commonOut} />
      </Example>
      <Callout variant="tip">
        <code>sort()</code> 和 <code>reverse()</code> 是<strong>原地</strong>修改列表本身、返回 <code>None</code>。
        如果想保留原列表、得到一个排好序的新列表，用 <code>sorted(nums)</code>（不改原列表）。
      </Callout>

      <h2>六、嵌套列表</h2>
      <p>
        列表里还能放列表，形成「表格」结构，常用来表示矩阵、棋盘等。用两个下标访问：
      </p>
      <CodeBlock lang="python" title="嵌套列表（二维）" code={nestedCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={nestedOut} />
      </Example>

      <h2>七、元组：不可变的列表</h2>
      <KeyIdea>
        元组（tuple）和列表很像，但用<strong>圆括号</strong> <code>()</code>，而且<strong>创建后不能修改</strong>
        （不能增删改元素）。它适合存放「一组固定不变」的数据。
      </KeyIdea>
      <CodeBlock lang="python" title="元组与拆包" code={tupleCode} />
      <Example title="运行结果">
        <CodeBlock lang="text" title="运行结果" code={tupleOut} />
      </Example>
      <p>
        元组的常见用途：表示坐标 <code>(x, y)</code>、作为函数的多个返回值（下一卷会用到）、
        以及当你想确保数据「不被改动」时。
      </p>
      <Callout variant="note" title="列表 vs 元组">
        简单记：会变的、要增删的用<strong>列表</strong>（方括号）；固定不变的用<strong>元组</strong>（圆括号）。
        元组因为不可变，还能当字典的「键」（下一章会讲），列表则不行。
      </Callout>

      <Practice title="动手练一练">
        <ol>
          <li>创建一个含 5 个数字的列表，用 <code>sort()</code> 排序后打印，再用 <code>sorted()</code> 对比看原列表有没有变。</li>
          <li>往列表末尾 <code>append</code> 一个新元素，再用 <code>pop()</code> 把它删掉。</li>
          <li>用嵌套列表表示三个同学的「姓名+成绩」，如 <code>[["小明", 90], ["小红", 85]]</code>，遍历打印每个人的名字和分数。</li>
        </ol>
      </Practice>

      <Summary
        points={[
          '列表用方括号创建，有序、可变、可装任意类型，len() 取长度。',
          '索引从 0 开始、负数从末尾数、切片含头不含尾；列表元素可直接赋值修改。',
          '增删改：append 末尾加、insert 指定位置插、pop 按位置删、remove 按值删。',
          'for ... in 遍历；常用 sort/reverse（原地改）、in 判断存在；sorted() 不改原列表返回新列表。',
          '列表可嵌套表示二维表格，用两个下标 matrix[行][列] 访问。',
          '元组用圆括号、创建后不可变，适合固定数据、坐标、函数多返回值，可拆包赋值。',
        ]}
      />
    </article>
  )
}
