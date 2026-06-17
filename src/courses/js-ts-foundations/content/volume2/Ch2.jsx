import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const defaultBindSnippet = `function whoAmI() {
  return this
}

// 独立调用（不挂在任何对象上）
// 非严格模式：this 指向全局对象（浏览器里是 window）
// 严格模式：this 是 undefined
'use strict'
function strictCheck() {
  console.log(this) // undefined（严格模式下的默认绑定）
}
strictCheck()`

const implicitBindSnippet = `const user = {
  name: '小明',
  greet() {
    // 谁“点”调用了我，this 就指向谁
    console.log('我是 ' + this.name)
  },
}

user.greet() // 我是 小明  —— this 指向点号左边的 user

// 只看“调用那一刻点号左边是谁”，跟函数定义在哪无关
const admin = { name: '管理员', greet: user.greet }
admin.greet() // 我是 管理员 —— 同一个函数，this 却变了`

const explicitBindSnippet = `function introduce(city, job) {
  console.log(this.name + ' 来自 ' + city + '，职业 ' + job)
}

const p = { name: '小红' }

// call：参数逐个传
introduce.call(p, '杭州', '工程师') // 小红 来自 杭州，职业 工程师

// apply：参数用数组传
introduce.apply(p, ['北京', '设计师']) // 小红 来自 北京，职业 设计师

// bind：不立即执行，返回一个“this 被永久绑定”的新函数
const boundIntro = introduce.bind(p, '广州')
boundIntro('产品经理') // 小红 来自 广州，职业 产品经理`

const newBindSnippet = `function Person(name) {
  // new 调用时，this 指向新创建的空对象
  this.name = name
  // 不写 return，构造函数默认返回这个新对象
}

const a = new Person('小李')
console.log(a.name) // 小李

// new 做了四件事：
// 1) 创建一个新空对象
// 2) 把它的原型指向 Person.prototype
// 3) 让函数体内的 this 指向这个新对象
// 4) 若函数没返回对象，则返回这个新对象`

const implicitLostSnippet = `const user = {
  name: '小明',
  greet() {
    console.log(this.name)
  },
}

// 坑一：把方法赋值出来，丢了点号左边的对象
const fn = user.greet
fn() // undefined（或报错）—— 退化成默认绑定，this 不再是 user

// 坑二：作为回调传出去，同样丢失
setTimeout(user.greet, 100) // undefined —— 内部是独立调用 greet()

// 修复：用 bind 锁住 this
setTimeout(user.greet.bind(user), 100) // 小明`

const arrowThisSnippet = `const timer = {
  seconds: 0,
  start() {
    // 箭头函数没有自己的 this，捕获外层 start 的 this（即 timer）
    setInterval(() => {
      this.seconds += 1 // 这里的 this 正确指向 timer
      console.log(this.seconds)
    }, 1000)
  },
}
timer.start() // 1, 2, 3, ...

// 反例：普通函数作回调，this 在调用时退化为默认绑定，拿不到 timer`

const arrowMethodBadSnippet = `const obj = {
  name: '小明',
  // 反例：用箭头函数当对象方法
  greet: () => {
    // 箭头函数捕获“定义时外层”的 this，而对象字面量不构成函数作用域，
    // 这里的 this 是模块/全局的 this，而不是 obj
    console.log(this.name)
  },
}
obj.greet() // undefined —— 箭头函数不适合做对象方法`

const myBindSnippet = `// 手写一个简化版 bind
Function.prototype.myBind = function (context, ...presetArgs) {
  const fn = this // this 是被调用 myBind 的那个原函数
  return function (...laterArgs) {
    // 用 apply 在调用时把 this 固定为 context，并合并两批参数
    return fn.apply(context, [...presetArgs, ...laterArgs])
  }
}

function say(greeting, punctuation) {
  return greeting + ', ' + this.name + punctuation
}
const bound = say.myBind({ name: '小红' }, '你好')
console.log(bound('！')) // 你好, 小红！`

export default function Ch2() {
  return (
    <article>
      <Lead>
        <code>this</code> 大概是 JavaScript 里最让初学者头疼的关键字。它的难点在于一个反直觉的事实：
        <strong><code>this</code> 的值不是在函数定义时确定的，而是在函数被调用时、由“调用方式”决定的</strong>。
        同一个函数，换种方式调用，<code>this</code> 就指向不同的东西。这一章我们用四条绑定规则
        把 <code>this</code> 彻底讲清，再讲 <code>call</code> / <code>apply</code> / <code>bind</code> 如何手动控制它，
        以及箭头函数为什么是个特例。
      </Lead>

      <h2>一、核心心法：看“调用方式”，不看“定义位置”</h2>
      <KeyIdea>
        判断 <code>this</code> 指向，<strong>永远先问一句：这个函数是“怎么被调用的”？</strong>
        而不是“它定义在哪里”。调用方式一共归纳为四条绑定规则，按优先级排序即可得出答案。
      </KeyIdea>
      <p>
        很多人习惯从“函数写在哪个对象里”去猜 <code>this</code>，这恰恰是错误的起点。
        在普通函数中，<code>this</code> 是一个在<strong>调用那一刻</strong>才被填入的“隐式参数”。
        下面四条规则覆盖了所有调用形态。
      </p>

      <h2>二、四条绑定规则</h2>
      <h3>规则 1：默认绑定（独立调用）</h3>
      <p>
        函数被“光秃秃”地直接调用（前面没有点号、没有 <code>call</code> 之类），适用默认绑定。
        此时<strong>非严格模式</strong>下 <code>this</code> 指向全局对象（浏览器是 <code>window</code>），
        <strong>严格模式</strong>下 <code>this</code> 是 <code>undefined</code>。
      </p>
      <CodeBlock lang="js" title="默认绑定" code={defaultBindSnippet} />

      <h3>规则 2：隐式绑定（obj.fn）</h3>
      <p>
        当函数作为某个对象的方法、通过 <code>对象.方法()</code> 形式调用时，<code>this</code> 指向
        <strong>点号左边的那个对象</strong>。记住关键词：看调用那一刻“点号左边是谁”。
      </p>
      <CodeBlock lang="js" title="隐式绑定" code={implicitBindSnippet} />

      <h3>规则 3：显式绑定（call / apply / bind）</h3>
      <p>
        通过 <code>call</code>、<code>apply</code>、<code>bind</code> 把 <code>this</code>
        <strong>手动指定</strong>为你给的对象。这是最“强势”的一种，详见第四节。
      </p>
      <CodeBlock lang="js" title="显式绑定" code={explicitBindSnippet} />

      <h3>规则 4：new 绑定（构造调用）</h3>
      <p>
        用 <code>new</code> 调用一个函数时，引擎会创建一个全新的对象，并把函数体内的 <code>this</code>
        指向这个新对象。这是构造函数的工作原理。
      </p>
      <CodeBlock lang="js" title="new 绑定" code={newBindSnippet} />

      <h2>三、四规则的优先级与判定流程</h2>
      <p>
        当多条规则看似都适用时，按优先级裁决：<strong>new 绑定 &gt; 显式绑定 &gt; 隐式绑定 &gt; 默认绑定</strong>。
        实用的判定流程是“从高往低问四个问题”：
      </p>
      <table>
        <thead>
          <tr>
            <th>优先级</th>
            <th>规则</th>
            <th>调用形态</th>
            <th>this 指向</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1（最高）</td>
            <td>new 绑定</td>
            <td><code>{'new Fn()'}</code></td>
            <td>新创建的对象</td>
          </tr>
          <tr>
            <td>2</td>
            <td>显式绑定</td>
            <td><code>{'fn.call(o)'}</code> / <code>{'fn.apply(o)'}</code> / <code>{'fn.bind(o)'}</code></td>
            <td>传入的 o</td>
          </tr>
          <tr>
            <td>3</td>
            <td>隐式绑定</td>
            <td><code>{'obj.fn()'}</code></td>
            <td>点号左边的 obj</td>
          </tr>
          <tr>
            <td>4（最低）</td>
            <td>默认绑定</td>
            <td><code>{'fn()'}</code></td>
            <td>全局对象 / 严格模式下 undefined</td>
          </tr>
        </tbody>
      </table>
      <Example title="用流程图心法判断 this">
        <p>拿到一个调用，依次自问：</p>
        <p>① 是 <code>{'new fn()'}</code> 吗？是 → <code>this</code> 是新对象。</p>
        <p>② 是 <code>{'fn.call/apply/bind(o)'}</code> 吗？是 → <code>this</code> 是 <code>o</code>。</p>
        <p>③ 是 <code>{'obj.fn()'}</code> 吗？是 → <code>this</code> 是 <code>obj</code>。</p>
        <p>④ 都不是 → 默认绑定（全局对象，严格模式下 <code>undefined</code>）。</p>
      </Example>

      <h2>四、隐式丢失：this 最常见的“走失”</h2>
      <KeyIdea>
        <strong>隐式丢失</strong>指的是：一个本该靠隐式绑定拿到对象的方法，因为被“赋值出来”或
        “作为回调传出去”，调用时丢掉了点号左边的对象，于是退化成默认绑定，
        <code>this</code> 不再是你期望的那个对象。
      </KeyIdea>
      <p>
        这是实战里最高频的 <code>this</code> bug。一旦你把 <code>obj.method</code> 取出来单独存或者
        当参数传走，那个“点号左边的 obj”就没了，调用时只剩一个孤零零的函数引用。
      </p>
      <CodeBlock lang="js" title="隐式丢失与用 bind 修复" code={implicitLostSnippet} />
      <Callout variant="warn" title="传方法当回调时务必小心">
        把对象方法直接传给 <code>setTimeout</code>、事件监听、数组的 <code>map</code> / <code>forEach</code>
        等接受回调的 API 时，<code>this</code> 极易丢失。常见解法：用 <code>bind</code> 锁定，
        或用箭头函数包一层（<code>{'() => obj.method()'}</code>）保留正确的调用形态。
      </Callout>

      <h2>五、箭头函数：没有自己的 this</h2>
      <KeyIdea>
        箭头函数<strong>没有自己的 <code>this</code></strong>。它内部的 <code>this</code> 不由调用方式决定，
        而是<strong>捕获定义时所在外层作用域的 <code>this</code></strong>（词法 this）。
        上面那四条规则对箭头函数统统不适用。
      </KeyIdea>
      <p>
        正因如此，箭头函数特别适合做<strong>回调</strong>：它会忠实地沿用外层的 <code>this</code>，
        不会在被异步调用时“走失”。下面这个计时器是经典正例：
      </p>
      <CodeBlock lang="js" title="箭头函数作回调：this 不丢失" code={arrowThisSnippet} />
      <p>
        但反过来，箭头函数<strong>不适合当对象方法</strong>。因为对象字面量并不构成函数作用域，
        写在对象里的箭头函数捕获的是更外层（模块 / 全局）的 <code>this</code>，而不是这个对象。
      </p>
      <CodeBlock lang="js" title="反例：箭头函数当对象方法会拿错 this" code={arrowMethodBadSnippet} />
      <Callout variant="tip" title="一句话口诀">
        <strong>对象的方法用普通函数，回调用箭头函数。</strong>
        前者要靠隐式绑定拿到对象本身，后者要的是“继承外层 this 而不被调用方式干扰”。
      </Callout>

      <h2>六、call / apply / bind 的区别</h2>
      <p>
        这三者都用来<strong>显式指定 <code>this</code></strong>，区别在于“是否立即执行”和“怎么传参”：
      </p>
      <table>
        <thead>
          <tr>
            <th>方法</th>
            <th>是否立即执行</th>
            <th>传参方式</th>
            <th>返回值</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>call</code></td>
            <td>立即执行</td>
            <td>参数逐个列出</td>
            <td>函数的返回值</td>
          </tr>
          <tr>
            <td><code>apply</code></td>
            <td>立即执行</td>
            <td>参数放一个数组</td>
            <td>函数的返回值</td>
          </tr>
          <tr>
            <td><code>bind</code></td>
            <td>不执行，返回新函数</td>
            <td>可预置部分参数</td>
            <td>this 被绑定的新函数</td>
          </tr>
        </tbody>
      </table>
      <p>
        记忆法：<code>call</code> 和 <code>apply</code> 只差在传参——
        <strong>c</strong>all 对应 <strong>逗号</strong>分隔，<strong>a</strong>pply 对应 <strong>数组</strong>（array）。
        而 <code>bind</code> 不调用，只是“先把 <code>this</code> 焊死”，返回一个新函数留着以后调用。
      </p>
      <Example title="手写一个简化版 bind">
        <p>
          理解 <code>bind</code> 的最好方式是亲手实现一遍。核心就两点：① 用闭包记住原函数和要绑定的
          <code>this</code>；② 返回一个新函数，调用时用 <code>apply</code> 把 <code>this</code>
          固定下来，并把“预置参数”和“后续参数”拼接起来。
        </p>
      </Example>
      <CodeBlock lang="js" title="myBind 实现" code={myBindSnippet} />

      <h2>七、事件处理器里的 this</h2>
      <p>
        在 DOM 事件处理中，<code>this</code> 也遵循同样的规则。用
        <code>el.addEventListener('click', function () {'{...}'})</code> 时，
        浏览器以隐式绑定的形态调用回调，<strong>普通函数</strong>里的 <code>this</code> 指向
        触发事件的那个 DOM 元素（<code>el</code>）。但如果回调写成<strong>箭头函数</strong>，
        <code>this</code> 就变成外层作用域的 <code>this</code>，不再是元素本身。
      </p>
      <Callout variant="warn" title="在类组件 / 对象里绑事件的常见坑">
        如果把一个对象 / 类的方法直接作为事件回调传进去，又是隐式丢失的重灾区——
        <code>this</code> 会指向触发事件的 DOM 元素或 <code>undefined</code>，而不是你的对象实例。
        解决办法照旧：在传入前 <code>bind(this)</code>，或用箭头函数包一层把调用形态留住。
      </Callout>

      <Callout variant="tip">
        把这一章和上一章连起来看：闭包关心“函数记住了哪些<strong>变量</strong>”（由定义位置决定，词法的），
        而 <code>this</code> 关心“函数被谁<strong>调用</strong>”（由调用方式决定，动态的）。
        唯一的例外是箭头函数——它的 <code>this</code> 也变成了词法的，于是和闭包一脉相承。
      </Callout>

      <Summary
        points={[
          'this 的值由“函数怎么被调用”决定，不看定义位置；判断 this 永远先问调用方式。',
          '四条绑定规则：默认绑定（独立调用 fn()，严格模式 undefined）、隐式绑定（obj.fn() 指向点号左边）、显式绑定（call/apply/bind 手动指定）、new 绑定（指向新建对象）。',
          '优先级：new 绑定 > 显式绑定 > 隐式绑定 > 默认绑定。',
          '隐式丢失：把方法赋值出来或作回调传走，会丢掉点号左边的对象而退化成默认绑定；用 bind 或箭头函数包裹修复。',
          '箭头函数没有自己的 this，捕获外层词法 this：适合做回调，不适合当对象方法。',
          'call/apply 立即执行（前者逐个传参、后者传数组），bind 返回 this 被绑定的新函数；事件处理器里普通函数的 this 指向触发元素，箭头函数则取外层 this。',
        ]}
      />
    </article>
  )
}
