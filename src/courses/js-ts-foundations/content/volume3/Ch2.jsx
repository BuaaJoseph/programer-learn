import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const classBasicSnippet = `class Person {
  // 实例字段：写在类体里，每个实例各有一份
  species = 'human'

  // 构造器：new 时被调用，用来初始化实例
  constructor(name) {
    this.name = name
  }

  // 方法：注意它其实挂在 Person.prototype 上，被所有实例共享
  greet() {
    return 'Hi, I am ' + this.name
  }
}

const p = new Person('Ada')
typeof Person                                  // 'function'（class 本质是函数）
p.greet()                                      // 'Hi, I am Ada'
Object.getPrototypeOf(p) === Person.prototype  // true
p.hasOwnProperty('greet')                      // false（greet 在原型上，不是自有）`

const memberSnippet = `class Counter {
  static label = 'a counter'   // 静态字段：挂在类上，不在实例上
  #count = 0                   // 私有字段：以 # 开头，外部无法访问

  static create() {            // 静态方法：通过 Counter.create() 调用
    return new Counter()
  }

  inc() { this.#count++ }      // 实例方法里可以读写私有字段

  get value() { return this.#count }   // getter：像读属性一样取值
  set value(v) {                       // setter：像写属性一样赋值
    if (v < 0) throw new Error('不能为负')
    this.#count = v
  }
}

const c = Counter.create()
c.inc()
c.value            // 1（走 getter，不用写括号）
c.value = 10       // 走 setter
Counter.label      // 'a counter'（静态成员通过类名访问）
// c.#count        // 语法错误：私有字段在类外不可访问`

const extendsSnippet = `class Animal {
  constructor(name) {
    this.name = name
  }
  speak() {
    return this.name + ' makes a sound'
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name)            // 必须先调 super()，才能使用 this
    this.breed = breed
  }
  speak() {                // 覆盖父类方法
    // super.speak() 调到父类的同名方法
    return super.speak() + ' (woof)'
  }
}

const d = new Dog('Rex', 'Husky')
d.speak()                  // 'Rex makes a sound (woof)'
d instanceof Dog           // true
d instanceof Animal        // true（沿原型链能找到 Animal.prototype）`

const equivalentSnippet = `// 上面的 Animal / Dog 用「function + prototype」写，等价如下：
function Animal(name) {
  this.name = name
}
Animal.prototype.speak = function () {
  return this.name + ' makes a sound'
}

function Dog(name, breed) {
  Animal.call(this, name)            // 等价于 super(name)
  this.breed = breed
}
// 把 Dog.prototype 的原型链接到 Animal.prototype（等价于 extends）
Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.constructor = Dog
Dog.prototype.speak = function () {
  // 等价于 super.speak()
  return Animal.prototype.speak.call(this) + ' (woof)'
}

const d = new Dog('Rex', 'Husky')
d.speak()   // 'Rex makes a sound (woof)' —— 和 class 版完全一致`

const instanceofSnippet = `// instanceof 的本质：检查「右侧函数的 prototype」是否出现在
// 「左侧对象的原型链」上。可以手写出它的逻辑：
function myInstanceof(obj, Ctor) {
  let proto = Object.getPrototypeOf(obj)
  const target = Ctor.prototype
  while (proto !== null) {
    if (proto === target) return true   // 在链上找到了
    proto = Object.getPrototypeOf(proto)
  }
  return false                          // 找到 null 都没有
}

myInstanceof(d, Dog)      // true
myInstanceof(d, Animal)   // true
myInstanceof(d, Array)    // false`

const factorySnippet = `// 工厂函数 + 闭包：不靠 class / this，用闭包封装私有状态
function createCounter() {
  let count = 0                       // 闭包变量，外部完全访问不到
  return {
    inc() { count++ },
    get value() { return count },
  }
}

const c = createCounter()
c.inc()
c.value   // 1
// 没有 new、没有 this、没有原型链——简单数据 + 强封装时很顺手`

export default function Ch2() {
  return (
    <article>
      <Lead>
        ES2015 引入的 <code>class</code> 关键字让 JavaScript 终于有了「看起来像传统面向对象」的写法。
        但请记住一句话贯穿全章：<strong>class 不是新的对象模型，它只是上一章原型继承的语法糖</strong>。
        你写的 class，引擎在底层仍然翻译成函数、<code>prototype</code> 和原型链。这一章我们逐个拆解
        class 的每个部件，并始终把它和等价的 function 写法对照，让你既会用 class，也看穿它的本质。
      </Lead>

      <h2>一、class 是原型继承的语法糖</h2>
      <p>
        第一个要打破的错觉：<code>class</code> 并没有引入新的类型。<code>typeof Person</code> 的结果是
        <code>'function'</code>——class 声明本质上就是创建了一个函数。类里定义的方法会被自动挂到这个
        函数的 <code>prototype</code> 上，实例通过原型链共享它们。一切都还是上一章那套机制。
      </p>
      <CodeBlock lang="js" title="一个最朴素的 class" code={classBasicSnippet} />
      <KeyIdea>
        <code>class</code> = <strong>更顺手的 function + prototype</strong>。它把「设置 prototype、挂方法、
        链接继承」这些容易写错的样板代码，封装成了清晰的语法。理解 class 的最佳方式，就是随时能在
        脑子里把它翻译回函数写法。
      </KeyIdea>

      <h2>二、class 的各个部件</h2>
      <p>一个完整的 class 可以包含下面这些成员，逐个来看它们的语义与落点：</p>
      <ul>
        <li><strong>构造器 constructor</strong>：<code>new</code> 时执行，用来初始化实例的自有属性。一个类最多一个。</li>
        <li><strong>实例字段</strong>：直接写在类体里的 <code>x = 1</code>，每个实例<strong>各有一份</strong>，落在实例自身上。</li>
        <li><strong>方法</strong>：写法像 <code>greet() {'{...}'}</code>，但实际<strong>挂在 prototype 上</strong>，被所有实例共享。</li>
        <li><strong>静态成员 static</strong>：<code>static x</code> / <code>static fn()</code>，挂在<strong>类本身</strong>上，通过类名访问，常用于工具方法或工厂。</li>
        <li><strong>getter / setter</strong>：用 <code>get</code> / <code>set</code> 定义访问器，让「方法调用」看起来像「读写属性」。</li>
        <li><strong>私有字段 #x</strong>：以 <code>#</code> 开头，<strong>只能在类内部访问</strong>，是语言级别的真正私有，外部连读都读不到。</li>
      </ul>
      <CodeBlock lang="js" title="静态成员、私有字段、getter / setter" code={memberSnippet} />
      <table>
        <thead>
          <tr><th>成员</th><th>落在哪里</th><th>如何访问</th></tr>
        </thead>
        <tbody>
          <tr><td>实例字段 <code>x = 1</code></td><td>每个实例自身</td><td><code>instance.x</code></td></tr>
          <tr><td>方法 <code>fn()</code></td><td>类的 <code>prototype</code></td><td><code>instance.fn()</code>（沿原型链）</td></tr>
          <tr><td>静态成员 <code>static fn()</code></td><td>类本身</td><td><code>ClassName.fn()</code></td></tr>
          <tr><td>getter / setter</td><td><code>prototype</code> 上的访问器</td><td><code>instance.value</code>（无括号）</td></tr>
          <tr><td>私有字段 <code>#x</code></td><td>实例自身（私有槽）</td><td>仅类内部 <code>this.#x</code></td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="getter / setter 不是普通属性">
        <p>
          访问器看起来像在读写一个字段，实际每次都在调用函数。所以 setter 里可以做校验
          （例子里负数直接抛错），getter 里可以做派生计算。但也要小心：在 getter 里写出无限递归
          （比如 <code>get value() {'{ return this.value }'}</code>）会直接把栈撑爆。
        </p>
      </Callout>

      <h2>三、extends 与 super</h2>
      <p>
        <code>extends</code> 建立继承关系，<code>super</code> 则是「访问父类」的通道。它有两种用法：
        在构造器里 <code>super(...)</code> 调用<strong>父类构造函数</strong>；在方法里
        <code>super.method(...)</code> 调用<strong>父类的同名方法</strong>。
      </p>
      <CodeBlock lang="js" title="继承：Animal 与 Dog" code={extendsSnippet} />
      <Callout variant="warn" title="子类构造器里 super() 必须先调用">
        <p>
          在派生类（写了 <code>extends</code> 的类）的 <code>constructor</code> 里，<strong>访问
          <code>this</code> 之前必须先调用 <code>super()</code></strong>，否则直接报
          <code>ReferenceError</code>。原因是：派生类的实例对象由父类构造链负责创建，
          <code>super()</code> 没跑完，<code>this</code> 还不存在。
        </p>
      </Callout>

      <h2>四、与等价的 function + prototype 写法对照</h2>
      <p>
        把上面的 <code>Animal</code> / <code>Dog</code> 用上一章的原型写法重写一遍，你会发现一一对应：
        <code>super(name)</code> 就是 <code>Animal.call(this, name)</code>；
        <code>extends</code> 就是 <code>Dog.prototype = Object.create(Animal.prototype)</code>；
        <code>super.speak()</code> 就是 <code>Animal.prototype.speak.call(this)</code>。
      </p>
      <CodeBlock lang="js" title="class 版的等价 function 写法" code={equivalentSnippet} />
      <Example title="对照着看，你就懂了 super 为什么要 .call(this)">
        <p>
          父类方法里用到了 <code>this.name</code>。如果只写 <code>Animal.prototype.speak()</code>，
          <code>this</code> 就不是当前的 Dog 实例了。必须 <code>.call(this)</code> 把 <code>this</code>
          显式传进去。class 的 <code>super.speak()</code> 替你自动做了这件事——这正是语法糖的价值：
          省掉容易写错的细节。
        </p>
      </Example>

      <h2>五、instanceof 的原理</h2>
      <p>
        <code>obj instanceof Ctor</code> 判断的不是「obj 是不是由 Ctor 造的」，而是更底层的一件事：
        <strong><code>Ctor.prototype</code> 是否出现在 <code>obj</code> 的原型链上</strong>。这也是为什么
        <code>d instanceof Animal</code> 为真——虽然 d 是 <code>new Dog</code> 造的，但 Animal.prototype
        就在它的原型链上。
      </p>
      <CodeBlock lang="js" title="手写 instanceof 看清它的逻辑" code={instanceofSnippet} />
      <p>
        因为它查的是原型链，所以 <code>instanceof</code> 会受原型链被改动的影响，跨 iframe / 跨 realm
        时也可能失灵（不同窗口有各自的 <code>Array.prototype</code>）。判断数组优先用
        <code>Array.isArray()</code>，判断更宽泛的类型用 <code>typeof</code> 或鸭子类型更稳。
      </p>

      <h2>六、何时用 class，何时用工厂函数 / 闭包</h2>
      <p>
        class 不是唯一的「组织对象」的方式。当你只需要封装一点私有状态、不需要继承、也不在乎
        <code>this</code> 的种种坑时，<strong>工厂函数 + 闭包</strong>往往更简单、更安全。
      </p>
      <CodeBlock lang="js" title="工厂函数 + 闭包：另一种封装方式" code={factorySnippet} />
      <table>
        <thead>
          <tr><th>场景</th><th>推荐</th><th>理由</th></tr>
        </thead>
        <tbody>
          <tr><td>有明确继承层级、要造大量实例、方法需共享</td><td>class</td><td>原型共享省内存，继承语义清晰</td></tr>
          <tr><td>只要封装私有状态、无继承、量不大</td><td>工厂 + 闭包</td><td>无 this 之坑，私有性靠闭包天然保证</td></tr>
          <tr><td>纯数据、无行为</td><td>对象字面量</td><td>最轻量，不必上 class</td></tr>
          <tr><td>需要明确指定原型</td><td>Object.create</td><td>对原型链有最直接的控制</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="class 的方法与 this">
        <p>
          class 方法里的 <code>this</code> 取决于<strong>怎么被调用</strong>，而非定义在哪。把方法
          单独取出来当回调（如 <code>setTimeout(obj.fn, 0)</code>）会丢失 <code>this</code>。解决办法：
          用箭头函数包一层，或在构造器里 <code>this.fn = this.fn.bind(this)</code>，或干脆把方法写成
          类字段里的箭头函数。闭包写法则天然没有这个烦恼。
        </p>
      </Callout>

      <h2>七、与 TypeScript 的衔接</h2>
      <p>
        在 TypeScript 里，class 这一套被进一步增强：可以给字段和方法标注类型，用
        <code>public</code> / <code>private</code> / <code>protected</code> 访问修饰符，配合
        <code>interface</code> 与 <code>implements</code> 约束结构——但运行时落地的，<strong>依然是这一章
        讲的原型继承</strong>，TS 只是在编译期多了一层类型检查。
      </p>

      <Callout variant="tip">
        到这里，「对象与原型」这一卷的核心就通了：对象靠原型链共享与查找，class 是它的语法糖，
        继承不过是把父类原型串进子类原型链。带着这套底层模型，你读任何 JS / TS 的面向对象代码
        都不会再有黑盒。
      </Callout>

      <Summary
        points={[
          'class 是原型继承的语法糖：typeof Class === "function"，方法自动挂到 prototype 上，本质仍是上一章那套机制。',
          'class 成员：constructor 初始化实例、实例字段在实例自身、方法在 prototype、static 在类本身、getter/setter 是访问器、#x 是语言级私有。',
          'extends 建立继承，super(...) 调父构造、super.method() 调父方法；派生类构造器里访问 this 前必须先调 super()。',
          'class 可一一翻译成 function + prototype：super 等价 Parent.call(this) / Parent.prototype.m.call(this)，extends 等价 Object.create。',
          'instanceof 的本质是查右侧 prototype 是否在左侧对象的原型链上，因此会受原型改动与跨 realm 影响。',
          '有继承层级、需共享方法用 class；仅需封装私有状态用工厂 + 闭包；纯数据用字面量。TS 在此基础上加类型与访问修饰符，运行时仍是原型继承。',
        ]}
      />
    </article>
  )
}
