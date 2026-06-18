import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCode = `# 定义一个类，创建对象并调用方法
class BankAccount:
    def __init__(self, owner, balance=0):   # 构造方法
        self.owner = owner                   # 实例属性
        self.balance = balance

    def deposit(self, amount):               # 方法：存钱
        self.balance += amount
        print(f"{self.owner} 存入 {amount}，余额 {self.balance}")

    def withdraw(self, amount):              # 方法：取钱
        if amount > self.balance:
            print("余额不足！")
            return
        self.balance -= amount
        print(f"{self.owner} 取出 {amount}，余额 {self.balance}")

acc = BankAccount("小明", 100)
acc.deposit(50)
acc.withdraw(120)
acc.withdraw(200)
print("最终余额:", acc.balance)`

const withoutClass = `# 用一堆零散的变量描述一个学生，很容易乱
name1 = "小明"
age1 = 18
score1 = 90

name2 = "小红"
age2 = 17
score2 = 95

# 100 个学生怎么办？变量满天飞，还容易配错对`

const firstClass = `# class 定义一个"学生"模板
class Student:
    def __init__(self, name, age):   # 构造方法：创建对象时自动调用
        self.name = name              # self.xxx 是这个对象自己的属性
        self.age = age

    def introduce(self):              # 方法：对象能做的事
        print(f"我叫 {self.name}，今年 {self.age} 岁")

# 用模板创建一个具体的学生（对象 / 实例）
s1 = Student("小明", 18)
s1.introduce()`

const firstClassResult = `我叫 小明，今年 18 岁`

const selfDemo = `class Student:
    def __init__(self, name):
        self.name = name

    def hello(self):
        print(f"你好，我是 {self.name}")

a = Student("小明")
b = Student("小红")
a.hello()    # self 指向 a，所以打印小明
b.hello()    # self 指向 b，所以打印小红`

const selfResult = `你好，我是 小明
你好，我是 小红`

const attrMethod = `class Student:
    def __init__(self, name, score):
        self.name = name        # 实例属性
        self.score = score

    def is_pass(self):          # 方法
        return self.score >= 60

s = Student("小明", 55)
print(s.name)        # 直接访问属性
print(s.is_pass())   # 调用方法
s.score = 80         # 属性可以修改
print(s.is_pass())`

const attrMethodResult = `小明
False
True`

const classVsInstance = `class Student:
    school = "阳光中学"        # 类属性：所有学生共享

    def __init__(self, name):
        self.name = name        # 实例属性：每个学生各自不同

a = Student("小明")
b = Student("小红")

print(a.school, b.school)       # 共享同一个类属性
print(a.name, b.name)           # 各自的实例属性

Student.school = "星辰中学"      # 改类属性，所有实例都变
print(a.school, b.school)`

const classVsInstanceResult = `阳光中学 阳光中学
小明 小红
星辰中学 星辰中学`

const bankAccount = `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):          # 存钱
        self.balance += amount
        print(f"{self.owner} 存入 {amount}，余额 {self.balance}")

    def withdraw(self, amount):         # 取钱
        if amount > self.balance:
            print("余额不足！")
            return
        self.balance -= amount
        print(f"{self.owner} 取出 {amount}，余额 {self.balance}")

# 创建并使用对象
acc = BankAccount("小明", 100)
acc.deposit(50)
acc.withdraw(120)
acc.withdraw(200)`

const bankAccountResult = `小明 存入 50，余额 150
小明 取出 120，余额 30
余额不足！`

const manyObjects = `class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

# 一个列表装多个对象，整齐又好管理
students = [
    Student("小明", 90),
    Student("小红", 85),
    Student("小刚", 60),
]

for s in students:
    status = "及格" if s.score >= 60 else "不及格"
    print(f"{s.name}: {s.score} 分 ({status})")`

const manyObjectsResult = `小明: 90 分 (及格)
小红: 85 分 (及格)
小刚: 60 分 (及格)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到现在我们都是用变量、列表、字典分别存数据，用函数处理它们。当程序变大，
        "数据"和"操作数据的代码"散落各处，越来越难管。<strong>面向对象编程（OOP）</strong>
        提供了一种把"数据 + 操作"打包在一起的方式——这就是<strong>类</strong>和<strong>对象</strong>。
        这一章我们用"学生""银行账户"两个例子把它讲明白。
      </Lead>

      <h2>一、为什么要面向对象</h2>
      <p>假设要描述很多学生，用零散变量会很快失控：</p>
      <CodeBlock lang="python" title="不用类：变量满天飞" code={withoutClass} />
      <p>
        问题很明显：相关的数据（姓名、年龄、分数）没有"绑在一起"，操作它们的函数又另写一摊。
        面向对象的思路是：<strong>定义一个"学生"模板，把数据和行为打包进去</strong>，
        然后照模板造出一个个具体的学生。
      </p>
      <KeyIdea>
        <strong>类（class）</strong>是模板（图纸），<strong>对象（object，也叫实例）</strong>
        是照模板造出来的具体东西。比如"学生"是类，"小明"这个具体的学生就是对象。
      </KeyIdea>

      <h2>二、定义第一个类</h2>
      <p>用 <code>class</code> 关键字定义类。下面这个 <code>Student</code> 类带一个构造方法和一个普通方法：</p>
      <CodeBlock lang="python" title="定义并使用 Student 类" code={firstClass} />
      <CodeBlock lang="text" title="运行结果" code={firstClassResult} />

      <h2>三、__init__ 与 self</h2>
      <p>
        这两个是新手最容易懵的地方，我们专门拆开讲。
      </p>
      <ul>
        <li>
          <code>__init__</code> 是<strong>构造方法</strong>：每次创建对象时 Python 自动调用它，
          用来给对象设置初始属性。注意前后都是两个下划线。
        </li>
        <li>
          <code>self</code> 代表<strong>"当前这个对象自己"</strong>。方法的第一个参数永远是 <code>self</code>，
          通过 <code>self.属性名</code> 来读写这个对象的数据。
        </li>
      </ul>
      <CodeBlock lang="python" title="self 指向当前对象" code={selfDemo} />
      <CodeBlock lang="text" title="运行结果" code={selfResult} />
      <Callout variant="note" title="调用时不用传 self">
        定义方法时要写 <code>def hello(self):</code>，但调用时写 <code>a.hello()</code> 即可——
        Python 会自动把 <code>a</code> 作为 <code>self</code> 传进去。
      </Callout>

      <h2>四、实例属性与方法</h2>
      <p>
        <strong>属性</strong>是对象的数据（如 name、score），<strong>方法</strong>是对象能做的事（如判断是否及格）。
        属性可以随时读取和修改。
      </p>
      <CodeBlock lang="python" title="访问属性、调用方法、修改属性" code={attrMethod} />
      <CodeBlock lang="text" title="运行结果" code={attrMethodResult} />

      <h2>五、类属性 vs 实例属性</h2>
      <p>
        <strong>实例属性</strong>写在 <code>__init__</code> 里、挂在 <code>self</code> 上，每个对象各有一份；
        <strong>类属性</strong>直接写在 class 里面，<strong>所有对象共享同一份</strong>。
      </p>
      <CodeBlock lang="python" title="共享的类属性 vs 各自的实例属性" code={classVsInstance} />
      <CodeBlock lang="text" title="运行结果" code={classVsInstanceResult} />
      <Callout variant="tip" title="什么时候用类属性">
        所有对象都一样、且属于"整个类"的信息（如学校名、圆周率常量），适合做类属性；
        每个对象各不相同的（如姓名、余额），用实例属性。
      </Callout>

      <h2>六、综合实例：银行账户</h2>
      <p>
        银行账户是讲 OOP 的经典例子：它有数据（户主、余额），也有行为（存钱、取钱），
        而且取钱时要检查余额——数据和逻辑天然绑在一起。
      </p>
      <CodeBlock lang="python" title="BankAccount 类" code={bankAccount} />
      <CodeBlock lang="text" title="运行结果" code={bankAccountResult} />
      <Example title="读懂这个类">
        <ul>
          <li><code>__init__</code> 里 <code>balance=0</code> 是默认值——创建账户可以不传余额。</li>
          <li><code>deposit</code> / <code>withdraw</code> 都通过 <code>self.balance</code> 改自己的余额。</li>
          <li><code>withdraw</code> 里的 <code>if</code> 判断把"业务规则"封进了对象，外部不用操心。</li>
        </ul>
      </Example>

      <h2>七、批量管理对象</h2>
      <p>真正的威力在于：你可以造出很多对象，用列表统一管理。</p>
      <CodeBlock lang="python" title="用列表管理多个对象" code={manyObjects} />
      <CodeBlock lang="text" title="运行结果" code={manyObjectsResult} />

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」。</p>
      <PyRunner initialCode={tryCode} />

      <Practice title="练一练">
        写一个 <code>Dog</code> 类：构造方法接收名字和年龄；加一个 <code>bark()</code> 方法打印
        <code>"汪汪！我是XX"</code>；再加一个类属性 <code>species = "犬科"</code>。
        造两只狗，分别让它们叫，并打印它们共享的 species。
      </Practice>

      <Summary
        points={[
          '面向对象把"数据 + 操作"打包：类（class）是模板，对象 / 实例是照模板造出的具体东西。',
          '__init__ 是构造方法，创建对象时自动调用，用来初始化属性；属性挂在 self 上。',
          'self 代表"当前这个对象自己"，方法第一个参数永远是 self，但调用时不用手动传。',
          '属性是对象的数据，方法是对象的行为；属性可随时读取和修改。',
          '类属性写在 class 里，所有对象共享一份；实例属性挂在 self 上，每个对象各有一份。',
          '可以创建很多对象并用列表统一管理，这正是 OOP 组织复杂程序的方式。',
        ]}
      />
    </article>
  )
}
