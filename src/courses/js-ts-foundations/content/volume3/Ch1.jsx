import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createSnippet = `// 1) 对象字面量：最常用，直接写出键值对
const point = { x: 1, y: 2 }

// 2) 构造函数 + new：用一个函数当模板批量造对象
function Person(name) {
  this.name = name
}
const p = new Person('Ada')

// 3) Object.create：显式指定新对象的原型
const base = { greet() { return 'hi' } }
const obj = Object.create(base)   // obj 的原型就是 base
console.log(obj.greet())          // 'hi'（greet 是从 base 继承来的）`

const protoAccessSnippet = `const arr = [1, 2, 3]

// 读取一个对象的原型，推荐用 Object.getPrototypeOf
Object.getPrototypeOf(arr) === Array.prototype   // true

// 历史遗留的访问器：__proto__（能用，但不推荐在代码里直接写）
arr.__proto__ === Array.prototype                // true

// 数组的原型链：arr -> Array.prototype -> Object.prototype -> null
Object.getPrototypeOf(Array.prototype) === Object.prototype  // true
Object.getPrototypeOf(Object.prototype) === null             // true`

const funcProtoSnippet = `function Dog(name) {
  this.name = name
}
// 给「原型对象」加方法，所有实例共享同一份
Dog.prototype.bark = function () {
  return this.name + ': woof'
}

const d = new Dog('Rex')

// 关键三角关系：
d.__proto__ === Dog.prototype              // true（实例的原型 = 构造函数的 prototype）
Dog.prototype.constructor === Dog          // true（prototype 自带 constructor 指回构造函数）
d.constructor === Dog                      // true（d 自己没有 constructor，沿原型链找到了）

d.bark()                                   // 'Rex: woof'（方法在原型上，被实例共享）`

const newStepsSnippet = `// new Dog('Rex') 在底层大致等价于这四步：
function fakeNew(Ctor, ...args) {
  // 1) 创建一个新空对象，并把它的原型链接到 Ctor.prototype
  const obj = Object.create(Ctor.prototype)
  // 2) 把构造函数里的 this 绑定到这个新对象，执行构造逻辑
  const ret = Ctor.apply(obj, args)
  // 3) 如果构造函数显式返回了一个对象，就用那个；否则返回新建的 obj
  return (typeof ret === 'object' && ret !== null) ? ret : obj
}

const d = fakeNew(Dog, 'Rex')   // 与 new Dog('Rex') 行为一致`

const lookupSnippet = `function Animal() {}
Animal.prototype.kind = 'animal'

const a = new Animal()
a.name = 'Tom'      // 自有属性

// 查找 a.name：a 自己有 -> 直接返回 'Tom'
// 查找 a.kind：a 自己没有 -> 沿原型链到 Animal.prototype 找到 'animal'
// 查找 a.toString：一路找到 Object.prototype.toString
// 查找 a.nope：找到 null 仍没有 -> 返回 undefined

console.log(a.name)        // 'Tom'
console.log(a.kind)        // 'animal'
console.log(a.nope)        // undefined`

const hasOwnSnippet = `function Animal() {}
Animal.prototype.kind = 'animal'

const a = new Animal()
a.name = 'Tom'

a.hasOwnProperty('name')   // true（自有属性）
a.hasOwnProperty('kind')   // false（继承来的，不是自有）
'kind' in a                // true（in 运算符会顺着原型链一起查）

// 更稳妥的写法（避免对象自己覆盖了 hasOwnProperty）：
Object.prototype.hasOwnProperty.call(a, 'name')   // true
Object.hasOwn(a, 'name')                          // true（ES2022 新增，推荐）`

const inheritSnippet = `// 用原型链实现「继承」的本质：把子类型的原型对象，
// 指向一个以父类型原型为原型的对象。
function Animal(name) {
  this.name = name
}
Animal.prototype.eat = function () {
  return this.name + ' is eating'
}

function Dog(name) {
  Animal.call(this, name)        // 借父构造函数初始化自有属性
}
// 让 Dog.prototype 的原型 = Animal.prototype，从而继承 eat
Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.constructor = Dog  // 修回 constructor，否则指向 Animal
Dog.prototype.bark = function () {
  return this.name + ': woof'
}

const d = new Dog('Rex')
d.bark()   // 'Rex: woof'（Dog.prototype 上）
d.eat()    // 'Rex is eating'（沿链到 Animal.prototype 上）
// 原型链：d -> Dog.prototype -> Animal.prototype -> Object.prototype -> null`

export default function Ch1() {
  return (
    <article>
      <Lead>
        JavaScript 的对象系统与 Java、C++ 那种「先有类、再由类造对象」的模型不同：它的底层只有
        一种机制——<strong>原型（prototype）</strong>。每个对象都偷偷链着另一个对象，找不到的属性
        就顺着这条链往上问，直到尽头。理解了这条「原型链」，你就理解了 JS 里继承、共享方法、
        <code>new</code>、乃至后面 class 语法的全部底层真相。这一章我们从对象怎么创建讲起，
        一路把原型链拆到底。
      </Lead>

      <h2>一、对象是怎么创建出来的</h2>
      <p>
        在 JS 里造一个对象有三条主要路径，它们的差别不在「造出来的是不是对象」，而在
        <strong>新对象的原型被设成了什么</strong>。
      </p>
      <ul>
        <li><strong>对象字面量</strong> <code>{'{ ... }'}</code>：最常用，原型默认是 <code>Object.prototype</code>。</li>
        <li><strong>构造函数 + new</strong>：把一个函数当模板批量造对象，原型是该函数的 <code>prototype</code>。</li>
        <li><strong>Object.create(proto)</strong>：最直接，明明白白告诉引擎「新对象的原型就是 proto」。</li>
      </ul>
      <CodeBlock lang="js" title="三种创建对象的方式" code={createSnippet} />
      <KeyIdea>
        不管用哪种方式创建，结果都是一个对象，并且这个对象内部都挂着一个指向「另一个对象（或
        null）」的隐藏链接——这就是它的<strong>原型</strong>。对象的能力，一半来自它自己，一半来自
        它的原型。
      </KeyIdea>

      <h2>二、每个对象都有内部 [[Prototype]]</h2>
      <p>
        规范里，每个对象都有一个内部槽位叫 <code>{'[[Prototype]]'}</code>，它要么指向另一个对象，
        要么是 <code>null</code>。这个槽位本身看不见，但 JS 给了两种方式去访问它：
      </p>
      <ul>
        <li>
          标准方法 <code>Object.getPrototypeOf(obj)</code>——读取原型，推荐使用；
          对应的设置方法是 <code>Object.setPrototypeOf(obj, proto)</code>。
        </li>
        <li>
          历史遗留访问器 <code>{'obj.__proto__'}</code>——能读能写，但它是早期浏览器的产物，
          标准里只为兼容而保留，<strong>正式代码里别直接用</strong>，理解原理时用它讲解很方便。
        </li>
      </ul>
      <CodeBlock lang="js" title="访问一个对象的原型" code={protoAccessSnippet} />
      <Callout variant="warn" title="区分两个容易混淆的名字">
        <p>
          <code>{'__proto__'}</code> 是<strong>实例对象</strong>上的访问器，指向「我的原型」；
          而 <code>prototype</code> 是<strong>函数</strong>才有的普通属性，指向「将来用 new 调我时，
          新实例的原型」。一个挂在实例上，一个挂在函数上，名字像但完全不是一回事。
        </p>
      </Callout>

      <h2>三、函数的 prototype 与实例的关系</h2>
      <p>
        在 JS 里，<strong>函数</strong>是个特别的存在：每个普通函数被定义时，引擎都会顺手给它配一个
        <code>prototype</code> 属性，指向一个对象（称为「原型对象」）。这个原型对象天生带一个
        <code>constructor</code> 属性，指回函数本身。当你用 <code>new</code> 调用这个函数时，
        新造出来的实例的 <code>{'[[Prototype]]'}</code> 就会被设成这个 <code>prototype</code> 对象。
      </p>
      <CodeBlock lang="js" title="构造函数、prototype、实例三者的关系" code={funcProtoSnippet} />
      <table>
        <thead>
          <tr><th>名字</th><th>挂在谁身上</th><th>指向什么</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Dog.prototype</code></td><td>构造函数 Dog</td><td>原型对象（实例将共享它）</td></tr>
          <tr><td><code>{'d.__proto__'}</code></td><td>实例 d</td><td>就是 <code>Dog.prototype</code></td></tr>
          <tr><td><code>Dog.prototype.constructor</code></td><td>原型对象</td><td>指回构造函数 <code>Dog</code></td></tr>
          <tr><td><code>d.constructor</code></td><td>实例自己没有</td><td>沿链找到 <code>Dog</code></td></tr>
        </tbody>
      </table>
      <Example title="把方法放原型上，为什么省内存">
        <p>
          如果在构造函数里写 <code>{'this.bark = function(){...}'}</code>，那每造一个实例都复制一份
          函数；造一万个实例就有一万份相同的函数。把方法放到 <code>Dog.prototype.bark</code> 上，
          一万个实例<strong>共享同一份</strong> bark——它们调用时只是沿原型链找到了同一个函数。
          这就是「数据放实例、方法放原型」的经典分工。
        </p>
      </Example>

      <h2>四、new 到底做了什么</h2>
      <p>
        <code>new Dog('Rex')</code> 看着像魔法，其实就是四个固定动作。把它拆开你就再也不会被
        <code>this</code> 指向问题困住：
      </p>
      <ol>
        <li><strong>创建</strong>一个全新的空对象。</li>
        <li><strong>链接原型</strong>：把这个新对象的 <code>{'[[Prototype]]'}</code> 设为 <code>Dog.prototype</code>。</li>
        <li><strong>绑定 this</strong>：以新对象为 <code>this</code> 执行构造函数体（于是 <code>this.name = ...</code> 写到了新对象上）。</li>
        <li><strong>返回</strong>：若构造函数没有显式返回一个对象，就自动返回这个新对象。</li>
      </ol>
      <CodeBlock lang="js" title="手写一个 new 来理解它的四步" code={newStepsSnippet} />
      <Callout variant="tip" title="构造函数返回值的小坑">
        <p>
          构造函数若 <code>return</code> 一个<strong>对象</strong>，<code>new</code> 的结果就是那个对象，
          新建的实例被丢弃；若返回的是原始值（数字、字符串等）或什么都不返回，<code>new</code>
          照常返回新建的实例。绝大多数情况下，构造函数不写 return 即可。
        </p>
      </Callout>

      <h2>五、属性查找沿原型链向上</h2>
      <p>
        读取 <code>obj.x</code> 时，引擎的算法是：先看 <code>obj</code> 自己有没有 <code>x</code>；
        没有就去它的原型上找；还没有就去原型的原型……一层层往上，<strong>直到遇到
        <code>null</code> 为止</strong>。整条链都没有，结果就是 <code>undefined</code>，而不会报错。
      </p>
      <CodeBlock lang="js" title="属性查找：从自身到原型链顶端" code={lookupSnippet} />
      <p>
        这条链的<strong>顶端几乎总是 <code>Object.prototype</code></strong>，再往上就是 <code>null</code>。
        正因为如此，几乎所有对象都能调用 <code>toString()</code>、<code>hasOwnProperty()</code>——
        它们都定义在 <code>Object.prototype</code> 上，被整个对象世界共享。
      </p>
      <Callout variant="warn" title="赋值不走原型链">
        <p>
          注意：<strong>查找</strong>会沿原型链向上，但<strong>赋值</strong> <code>obj.x = v</code> 通常只会
          在 <code>obj</code> 自己身上创建（或修改）属性，而不会去改原型上的同名属性。也就是说，
          给实例赋值会「遮蔽」（shadow）原型上的同名属性，而非覆盖它。
        </p>
      </Callout>

      <h2>六、原型链顶端：Object.prototype</h2>
      <p>
        把前面的例子串起来，一条典型的原型链长这样（用文字图表示，箭头表示「的原型是」）：
      </p>
      <CodeBlock
        lang="js"
        title="一条原型链的文字图"
        code={`d                       // 实例：{ name: 'Rex' }
  │  __proto__
  ▼
Dog.prototype           // { bark, constructor: Dog }
  │  __proto__
  ▼
Object.prototype        // { toString, hasOwnProperty, ... }
  │  __proto__
  ▼
null                    // 链的尽头，到此为止`}
      />
      <p>
        如果想造一个<strong>完全没有原型</strong>的「纯净」对象（连 <code>toString</code> 都没有），
        可以用 <code>Object.create(null)</code>，它的 <code>{'[[Prototype]]'}</code> 直接是
        <code>null</code>，常用于当作干净的字典 / 哈希表，避免与继承属性冲突。
      </p>

      <h2>七、hasOwnProperty：区分自有与继承</h2>
      <p>
        既然属性可能来自自身、也可能来自原型链，那就需要一个办法判断「这个属性到底是不是它自己
        的」。这就是 <code>hasOwnProperty</code> 的职责：只看自有属性，不顺着原型链找。
        与之相对，<code>in</code> 运算符会连原型链一起查。
      </p>
      <CodeBlock lang="js" title="hasOwnProperty、in 与 Object.hasOwn" code={hasOwnSnippet} />
      <table>
        <thead>
          <tr><th>判断方式</th><th>查自有属性</th><th>查原型链</th></tr>
        </thead>
        <tbody>
          <tr><td><code>obj.hasOwnProperty(k)</code></td><td>是</td><td>否</td></tr>
          <tr><td><code>Object.hasOwn(obj, k)</code></td><td>是</td><td>否（ES2022，推荐）</td></tr>
          <tr><td><code>{"k in obj"}</code></td><td>是</td><td>是</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="为什么推荐 Object.hasOwn">
        <p>
          如果对象自己定义了一个叫 <code>hasOwnProperty</code> 的属性，或它是
          <code>Object.create(null)</code> 造的没有原型的对象，直接调 <code>obj.hasOwnProperty()</code>
          可能出错。ES2022 的 <code>Object.hasOwn(obj, k)</code> 不依赖原型链，是更安全的现代写法。
        </p>
      </Callout>

      <h2>八、原型链实现继承的本质</h2>
      <p>
        所谓「继承」，在 JS 里没有任何额外魔法：无非是让子类型实例的原型链上，<strong>串进父类型的
        原型对象</strong>。子类型实例找不到的方法，自然就沿链找到父类型原型上去了。
      </p>
      <CodeBlock lang="js" title="用原型链手写继承（class 出现前的经典写法）" code={inheritSnippet} />
      <p>
        这段代码里有两个关键动作：① <code>Animal.call(this, name)</code> 在子构造里借父构造函数初始化
        <strong>自有属性</strong>；② <code>Dog.prototype = Object.create(Animal.prototype)</code> 把
        <strong>方法继承</strong>这条链接好。这两步合起来，就是下一章 <code>class ... extends</code>
        在底层替你做的事——class 只是把这套样板代码包装成了更顺手的语法。
      </p>

      <Callout variant="tip">
        下一章我们看 <code>class</code> 语法：它读起来像传统面向对象的「类」，但骨子里仍是这一章讲的
        原型继承。把这一章的原型链印在脑子里，再看 class 你会发现「原来不过如此」。
      </Callout>

      <Summary
        points={[
          '对象有三种创建方式：字面量、构造函数 + new、Object.create；区别在于新对象的原型被设成了什么。',
          '每个对象都有内部 [[Prototype]]，可用 Object.getPrototypeOf 读取（__proto__ 是遗留访问器，仅用于讲解）。',
          '函数的 prototype 是「将来实例的原型」；实例的 __proto__ 就指向构造函数的 prototype；prototype.constructor 指回构造函数。',
          'new 做四件事：创建新对象、把原型链接到构造函数的 prototype、以新对象为 this 执行构造体、返回该对象。',
          '属性查找沿原型链向上直到 null；顶端通常是 Object.prototype；赋值只作用于对象自身（遮蔽而非覆盖原型）。',
          'hasOwnProperty / Object.hasOwn 只看自有属性，in 连原型链一起查；继承的本质就是把父类型原型串进子类型实例的原型链。',
        ]}
      />
    </article>
  )
}
