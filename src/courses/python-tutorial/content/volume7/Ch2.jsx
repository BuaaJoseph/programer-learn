import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Practice from '@/components/cards/Practice.jsx'
import PyRunner from '@/platform/components/PyRunner.jsx'

const tryCode = `# 综合：继承 + super + 方法重写 + __str__
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "某种声音"

    def __str__(self):                       # 决定 print 时的显示
        return f"{self.name}（{self.speak()}）"

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)               # 调用父类构造方法
        self.breed = breed

    def speak(self):                          # 重写父类方法
        return "汪汪"

    def __str__(self):
        base = super().__str__()             # 复用父类的 __str__
        return base + f" 品种={self.breed}"

a = Animal("神秘生物")
d = Dog("旺财", "柴犬")
for x in [a, d]:
    print(x)                                 # 触发 __str__
print("旺财会叫:", d.speak())`

const inheritBasic = `# 父类：通用的"动物"
class Animal:
    def __init__(self, name):
        self.name = name

    def eat(self):
        print(f"{self.name} 在吃东西")

# 子类：狗，继承 Animal，自动拥有 eat 方法
class Dog(Animal):
    def bark(self):
        print(f"{self.name} 汪汪叫")

d = Dog("旺财")
d.eat()      # 继承自父类
d.bark()     # 子类自己的`

const inheritBasicResult = `旺财 在吃东西
旺财 汪汪叫`

const superDemo = `class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)    # 先调用父类的 __init__ 设置 name
        self.breed = breed         # 再加上子类自己的属性

d = Dog("旺财", "柴犬")
print(d.name, d.breed)`

const superResult = `旺财 柴犬`

const overrideDemo = `class Animal:
    def speak(self):
        print("某种动物的叫声")

class Cat(Animal):
    def speak(self):                # 重写父类的同名方法
        print("喵喵")

class Dog(Animal):
    def speak(self):
        print("汪汪")

for a in [Cat(), Dog(), Animal()]:
    a.speak()                       # 各自表现不同`

const overrideResult = `喵喵
汪汪
某种动物的叫声`

const isinstanceDemo = `class Animal:
    pass

class Dog(Animal):
    pass

d = Dog()
print(isinstance(d, Dog))      # 是 Dog 吗？
print(isinstance(d, Animal))   # 也是 Animal 吗？（子类也算父类）
print(isinstance(d, str))      # 是字符串吗？`

const isinstanceResult = `True
True
False`

const strRepr = `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):              # print() 时显示，给人看
        return f"点({self.x}, {self.y})"

    def __repr__(self):             # 调试 / 在列表里显示，给程序员看
        return f"Point(x={self.x}, y={self.y})"

p = Point(3, 4)
print(p)            # 调用 __str__
print([p])          # 列表里的元素用 __repr__
print(repr(p))      # 直接要 repr`

const strReprResult = `点(3, 4)
[Point(x=3, y=4)]
Point(x=3, y=4)`

const noStr = `# 没定义 __str__ 时，print 出来是一串没意义的内存地址
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

print(Point(3, 4))`

const noStrResult = `<__main__.Point object at 0x7f9a1c0d3e50>`

const eqDemo = `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):        # 定义"两个对象相等"的规则
        return self.x == other.x and self.y == other.y

a = Point(1, 2)
b = Point(1, 2)
print(a == b)        # 没有 __eq__ 时是 False（比内存地址）；有了就比内容`

const eqResult = `True`

const lenDemo = `class Team:
    def __init__(self, members):
        self.members = members

    def __len__(self):              # 让 len() 能作用在对象上
        return len(self.members)

t = Team(["小明", "小红", "小刚"])
print(len(t))`

const lenResult = `3`

const dataclassBefore = `# 普通写法：__init__、__repr__、__eq__ 都得自己写，很啰嗦
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point(x={self.x}, y={self.y})"

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y`

const dataclassAfter = `# 用 @dataclass：上面那些样板代码自动帮你生成！
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(3, 4)
print(p)                 # 自动有好看的 __repr__
print(p == Point(3, 4))  # 自动有按内容比较的 __eq__`

const dataclassAfterResult = `Point(x=3, y=4)
True`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们学会了定义类。这一章再上一层：<strong>继承</strong>让一个类复用另一个类的代码，
        避免重复造轮子；<strong>魔术方法</strong>（带双下划线的特殊方法）让你的对象能像内置类型一样，
        被 <code>print</code>、<code>==</code>、<code>len()</code> 等优雅地使用；
        最后用 <code>@dataclass</code> 一招省掉大量样板代码。
      </Lead>

      <h2>一、继承：复用已有的类</h2>
      <p>
        很多类有共性。比如猫、狗都是动物，都会吃东西。与其在每个类里重写一遍，
        不如定义一个父类 <code>Animal</code>，让子类<strong>继承</strong>它，自动获得父类的属性和方法。
      </p>
      <CodeBlock lang="python" title="子类继承父类" code={inheritBasic} />
      <CodeBlock lang="text" title="运行结果" code={inheritBasicResult} />
      <KeyIdea>
        写法是 <code>class 子类(父类):</code>。子类自动拥有父类的全部属性和方法，
        还能再添加自己专属的——这就是"复用 + 扩展"。
      </KeyIdea>

      <h2>二、super()：调用父类的方法</h2>
      <p>
        当子类也要写 <code>__init__</code>，通常先让父类把它那部分初始化做完，再加自己的。
        用 <code>super()</code> 调用父类的方法。
      </p>
      <CodeBlock lang="python" title="super() 调用父类构造方法" code={superDemo} />
      <CodeBlock lang="text" title="运行结果" code={superResult} />
      <Callout variant="tip" title="为什么用 super">
        直接写父类名调用也行，但用 <code>super()</code> 不用写死父类名字，
        以后改继承关系更省心，是推荐写法。
      </Callout>

      <h2>三、方法重写（覆盖）</h2>
      <p>
        子类可以定义一个和父类<strong>同名</strong>的方法，覆盖掉父类的版本。
        这样同一个方法名，不同子类有不同表现。
      </p>
      <CodeBlock lang="python" title="重写父类方法" code={overrideDemo} />
      <CodeBlock lang="text" title="运行结果" code={overrideResult} />
      <p>
        注意最后一行：同样调用 <code>speak()</code>，猫喵狗汪，父类是默认的。
        这种"同一个调用、不同对象表现不同"的特性，是面向对象很强大的一点。
      </p>

      <h2>四、isinstance：判断对象的类型</h2>
      <p>
        <code>isinstance(对象, 类)</code> 判断一个对象是不是某个类（或其父类）的实例。
      </p>
      <CodeBlock lang="python" title="isinstance 判断类型" code={isinstanceDemo} />
      <CodeBlock lang="text" title="运行结果" code={isinstanceResult} />
      <Callout variant="note" title="子类也算父类">
        <code>isinstance(d, Animal)</code> 是 <code>True</code>——因为 Dog 继承自 Animal，
        一只狗当然"也是"一种动物。这点在写通用函数时很有用。
      </Callout>

      <h2>五、魔术方法：让对象更"像样"</h2>
      <p>
        魔术方法（也叫双下方法，dunder method）是名字前后带双下划线的特殊方法。
        定义它们，对象就能配合 Python 的内置语法。我们看几个最常用的。
      </p>

      <h3>__str__ 与 __repr__：决定怎么显示</h3>
      <p>不定义 <code>__str__</code> 时，打印对象是一串没用的内存地址：</p>
      <CodeBlock lang="python" title="没有 __str__ 的尴尬" code={noStr} />
      <CodeBlock lang="text" title="运行结果" code={noStrResult} />
      <p>定义了 <code>__str__</code>（给人看）和 <code>__repr__</code>（给程序员调试看）后就友好多了：</p>
      <CodeBlock lang="python" title="__str__ 和 __repr__" code={strRepr} />
      <CodeBlock lang="text" title="运行结果" code={strReprResult} />

      <h3>__eq__：定义"相等"</h3>
      <p>
        默认情况下，两个对象只有"是同一个"才相等（比内存地址）。定义 <code>__eq__</code>
        可以让它们按<strong>内容</strong>比较。
      </p>
      <CodeBlock lang="python" title="__eq__ 按内容比较" code={eqDemo} />
      <CodeBlock lang="text" title="运行结果" code={eqResult} />

      <h3>__len__：让 len() 可用</h3>
      <CodeBlock lang="python" title="__len__" code={lenDemo} />
      <CodeBlock lang="text" title="运行结果" code={lenResult} />

      <p><strong>动手试试：</strong>改改下面的代码再点「运行」。</p>
      <PyRunner initialCode={tryCode} />

      <Practice title="练一练">
        给上一章的 <code>BankAccount</code> 加一个 <code>__str__</code>，
        让 <code>print(账户)</code> 显示 <code>"账户[户主]: 余额 X"</code>；
        再加 <code>__eq__</code>，规则是户主和余额都相同才算相等。
      </Practice>

      <h2>六、@dataclass：少写样板代码</h2>
      <p>
        你会发现，很多类的 <code>__init__</code>、<code>__repr__</code>、<code>__eq__</code>
        写法都很套路。Python 提供 <code>@dataclass</code> 装饰器，自动帮你生成这些方法。
      </p>
      <CodeBlock lang="python" title="繁琐的手写版本" code={dataclassBefore} />
      <p>用 <code>@dataclass</code> 后，同样的功能只要几行：</p>
      <CodeBlock lang="python" title="用 @dataclass 自动生成" code={dataclassAfter} />
      <CodeBlock lang="text" title="运行结果" code={dataclassAfterResult} />
      <Example title="@dataclass 帮你做了什么">
        <ul>
          <li>根据 <code>x: int</code>、<code>y: int</code> 这些字段，自动生成 <code>__init__</code>。</li>
          <li>自动生成好看的 <code>__repr__</code>（就是上面那个 <code>Point(x=3, y=4)</code>）。</li>
          <li>自动生成按内容比较的 <code>__eq__</code>。</li>
        </ul>
        <p>它特别适合"主要用来装数据"的类，能大幅减少重复代码。</p>
      </Example>
      <Callout variant="tip" title="字段那行的 : int 是什么">
        <code>x: int</code> 是<strong>类型注解</strong>，告诉读代码的人（和工具）这个字段应该是整数。
        类型注解我们会在后面的章节专门讲，这里先知道 dataclass 靠它来识别字段即可。
      </Callout>

      <Summary
        points={[
          '继承用 class 子类(父类)：子类自动获得父类的属性和方法，可再扩展自己的。',
          'super() 调用父类方法，常在子类 __init__ 里先 super().__init__(...) 再加自己的属性。',
          '方法重写：子类定义同名方法覆盖父类版本，实现"同一调用、不同表现"。',
          'isinstance(对象, 类) 判断类型，子类实例也算父类的实例。',
          '魔术方法让对象配合内置语法：__str__/__repr__ 控制显示、__eq__ 定义相等、__len__ 支持 len()。',
          '@dataclass 自动生成 __init__/__repr__/__eq__，特别适合装数据的类，大幅减少样板代码。',
        ]}
      />
    </article>
  )
}
