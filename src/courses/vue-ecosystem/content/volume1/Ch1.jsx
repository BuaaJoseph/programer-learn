import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const interpolationSnippet = `<template>
  <!-- 文本插值：双大括号里只能放「表达式」 -->
  <p>{{ msg }}</p>
  <p>{{ count + 1 }}</p>
  <p>{{ ok ? '通过' : '未通过' }}</p>
  <p>{{ message.split('').reverse().join('') }}</p>

  <!-- 下面这些都【不行】，因为不是表达式 -->
  <!-- {{ if (ok) { return 1 } }}   语句不行 -->
  <!-- {{ const a = 1 }}            声明不行 -->
</template>

<script setup>
import { ref } from 'vue'

const msg = ref('你好，Vue')
const count = ref(0)
const ok = ref(true)
const message = ref('hello')
</script>`

const vBindSnippet = `<template>
  <!-- 完整写法 v-bind:attr -->
  <img v-bind:src="imgUrl" v-bind:alt="imgAlt" />

  <!-- 简写 :attr（最常用） -->
  <img :src="imgUrl" :alt="imgAlt" />

  <!-- 绑定布尔型 attribute：值为假时该属性会被移除 -->
  <button :disabled="isLoading">提交</button>

  <!-- 动态参数：属性名本身也来自变量 -->
  <a :[attrName]="attrValue">动态属性名</a>

  <!-- 一次绑定一个对象上的多个属性 -->
  <div v-bind="objAttrs"></div>
</template>

<script setup>
import { ref } from 'vue'

const imgUrl = ref('/logo.png')
const imgAlt = ref('站点 Logo')
const isLoading = ref(false)
const attrName = ref('href')
const attrValue = ref('https://vuejs.org')
const objAttrs = ref({ id: 'app', class: 'container' })
</script>`

const vIfShowSnippet = `<template>
  <!-- v-if / v-else-if / v-else：条件渲染，三者必须相邻 -->
  <p v-if="score >= 90">优秀</p>
  <p v-else-if="score >= 60">及格</p>
  <p v-else>不及格</p>

  <!-- v-show：始终渲染，只切换 CSS 的 display -->
  <p v-show="visible">我用 v-show 控制显隐</p>

  <!-- 想对「一组元素」整体做 v-if，用 template 包裹，它本身不渲染成标签 -->
  <template v-if="loggedIn">
    <h2>欢迎回来</h2>
    <p>这里是你的面板</p>
  </template>
</template>

<script setup>
import { ref } from 'vue'

const score = ref(75)
const visible = ref(true)
const loggedIn = ref(true)
</script>`

const vForSnippet = `<template>
  <!-- 遍历数组：item 是元素，index 是下标 -->
  <ul>
    <li v-for="(item, index) in fruits" :key="item.id">
      {{ index + 1 }}. {{ item.name }}
    </li>
  </ul>

  <!-- 遍历对象：value、key、index 三个参数 -->
  <ul>
    <li v-for="(value, key, index) in user" :key="key">
      {{ index }} - {{ key }}: {{ value }}
    </li>
  </ul>

  <!-- 遍历一个整数范围（从 1 开始） -->
  <span v-for="n in 5" :key="n">{{ n }} </span>
</template>

<script setup>
import { ref } from 'vue'

const fruits = ref([
  { id: 1, name: '苹果' },
  { id: 2, name: '香蕉' },
  { id: 3, name: '橙子' },
])
const user = ref({ name: '小杜', age: 28, city: '杭州' })
</script>`

const vOnSnippet = `<template>
  <!-- 完整写法 v-on:event -->
  <button v-on:click="onClick">点我</button>

  <!-- 简写 @event（最常用） -->
  <button @click="onClick">点我</button>

  <!-- 行内传参；要拿原生事件对象用特殊变量 $event -->
  <button @click="add(2, $event)">加 2</button>

  <!-- 事件修饰符：链式书写 -->
  <form @submit.prevent="onSubmit">
    <a @click.stop="onLink">阻止冒泡</a>
    <button @click.once="onceonly">只触发一次</button>
  </form>

  <!-- 按键修饰符：只在按下回车时触发 -->
  <input @keyup.enter="onEnter" />
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
function onClick() { count.value++ }
function add(n, e) { count.value += n; console.log(e.target) }
function onSubmit() { console.log('提交，且不刷新页面') }
function onLink() {}
function onceonly() {}
function onEnter() {}
</script>`

const classStyleSnippet = `<template>
  <!-- class 对象语法：键是类名，值为真则加上该类 -->
  <div :class="{ active: isActive, 'text-danger': hasError }"></div>

  <!-- class 数组语法 -->
  <div :class="[baseClass, isActive ? 'active' : '']"></div>

  <!-- 与静态 class 共存，最终会合并 -->
  <div class="card" :class="{ shadow: hovered }"></div>

  <!-- style 对象语法（属性名用驼峰或带引号的连字符） -->
  <div :style="{ color: textColor, fontSize: size + 'px' }"></div>

  <!-- style 数组：合并多个样式对象 -->
  <div :style="[baseStyle, overrideStyle]"></div>
</template>

<script setup>
import { ref } from 'vue'

const isActive = ref(true)
const hasError = ref(false)
const baseClass = ref('btn')
const hovered = ref(false)
const textColor = ref('red')
const size = ref(16)
const baseStyle = ref({ margin: '8px' })
const overrideStyle = ref({ color: 'blue' })
</script>`

const renderFnSnippet = `// 模板 <p>{{ msg }}</p> 大致被编译成这样的渲染函数（已简化）
function render() {
  return createElementVNode('p', null, toDisplayString(msg.value))
}
// 指令也一样：v-if 编译成三元 / 条件表达式，v-for 编译成一个把数组映射成 VNode 列表的循环。
// 也就是说，模板只是「写起来更顺手的渲染函数语法」。`

const todoSnippet = `<template>
  <section class="todo">
    <h2>待办清单（{{ remaining }} 项未完成）</h2>

    <!-- 输入框 + 回车新增；这里先用最朴素的 ref 取值方式 -->
    <input
      v-model="draft"
      @keyup.enter="addTodo"
      placeholder="输入后回车新增"
    />
    <button @click="addTodo" :disabled="!draft.trim()">添加</button>

    <!-- 过滤按钮 -->
    <div class="filters">
      <button
        v-for="f in filters"
        :key="f"
        :class="{ active: current === f }"
        @click="current = f"
      >
        {{ f }}
      </button>
    </div>

    <!-- 列表：用稳定的 id 作 key，绝不要用 index -->
    <ul>
      <li
        v-for="todo in visibleTodos"
        :key="todo.id"
        :class="{ done: todo.done }"
      >
        <input type="checkbox" v-model="todo.done" />
        <span>{{ todo.text }}</span>
        <button @click.stop="remove(todo.id)">删除</button>
      </li>
    </ul>

    <!-- 空状态：v-if 真正不渲染节点 -->
    <p v-if="visibleTodos.length === 0">这里空空如也～</p>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

let uid = 0
const draft = ref('')
const current = ref('全部')
const filters = ['全部', '未完成', '已完成']
const todos = ref([
  { id: ++uid, text: '学习模板语法', done: true },
  { id: ++uid, text: '搞懂 v-for 的 key', done: false },
])

const remaining = computed(() => todos.value.filter(t => !t.done).length)

const visibleTodos = computed(() => {
  if (current.value === '未完成') return todos.value.filter(t => !t.done)
  if (current.value === '已完成') return todos.value.filter(t => t.done)
  return todos.value
})

function addTodo() {
  const text = draft.value.trim()
  if (!text) return
  todos.value.push({ id: ++uid, text, done: false })
  draft.value = ''
}

function remove(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}
</script>`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Vue 3 的模板是「带指令的增强 HTML」：它看起来就是普通 HTML，但多了一套以
        <code>v-</code> 开头的特殊属性（指令）和一对双大括号文本插值。这套模板并不会原样交给浏览器，
        而是会被 Vue 在构建期或运行期<strong>编译成 JavaScript 渲染函数</strong>。这一章我们逐个拆解
        四个最核心的指令——<code>v-bind</code>、<code>v-if</code>、<code>v-for</code>、<code>v-on</code>，
        再加上文本插值、class / style 绑定，最后用一个待办列表把它们串起来。
      </Lead>

      <h2>一、模板的本质：会被编译成渲染函数的增强 HTML</h2>
      <p>
        很多初学者把 Vue 模板当成「字符串模板」或「会被正则替换的 HTML」，这是误解。Vue 的模板语法
        是<strong>合法的 HTML 超集</strong>：任何能解析 HTML 的工具都能解析它，而 Vue 在此之上加了
        插值与指令两类语法。真正运行时，模板早已被编译器翻译成一个返回虚拟节点（VNode）树的
        <strong>渲染函数</strong>。
      </p>
      <KeyIdea>
        模板不是魔法，而是「写起来更顺手的渲染函数语法糖」。
        <code>{'{{ msg }}'}</code> 会被编译成读取响应式数据并输出文本的代码；
        <code>v-if</code> 编译成条件表达式；<code>v-for</code> 编译成把数组映射成 VNode 列表的循环。
        理解这一点，后面所有指令的行为都会变得可预测。
      </KeyIdea>
      <CodeBlock lang="vue" title="模板大致被编译成什么" code={renderFnSnippet} />
      <p>
        既然最终是 JavaScript，那「模板里能写什么」就有了明确边界：插值和指令绑定里只能放
        <strong>单个表达式</strong>（能求出一个值的东西），不能放语句（如 <code>if</code> 块、
        变量声明）。这一条贯穿全章，请先记住。
      </p>

      <h2>二、文本插值：双大括号只接受表达式</h2>
      <p>
        最基础的数据展示就是双大括号 <code>{'{{ }}'}</code>。它会把里面表达式的求值结果作为文本插入，
        并且当依赖的响应式数据变化时自动更新。注意「表达式」这个限制：
        <code>{'{{ count + 1 }}'}</code>、<code>{'{{ ok ? "是" : "否" }}'}</code>、
        <code>{'{{ list.join(",") }}'}</code> 都可以，但 <code>if</code>、<code>for</code>、
        <code>const a = 1</code> 这类语句不行。
      </p>
      <CodeBlock lang="vue" title="文本插值与它的边界" code={interpolationSnippet} />
      <Callout variant="info" title="插值只对文本生效">
        双大括号只能用在标签的「文本内容」位置，<strong>不能</strong>用在 HTML 属性上。要给属性
        动态赋值，必须用下一节的 <code>v-bind</code>。例如 <code>{'<a href="{{ url }}">'}</code> 是错的，
        应写成 <code>{'<a :href="url">'}</code>。
      </Callout>

      <h2>三、v-bind：把数据绑到属性上</h2>
      <p>
        <code>v-bind</code> 让 HTML 属性的值来自数据而非写死的字符串。它的简写是一个冒号
        <code>:</code>，这也是实战中几乎唯一的写法。被绑定的值是 JavaScript 表达式，所以
        <code>:href="url"</code> 里的 <code>url</code> 是变量，而不是字面字符串。
      </p>
      <CodeBlock lang="vue" title="v-bind 的几种形态" code={vBindSnippet} />
      <ul>
        <li><strong>简写</strong>：<code>v-bind:src</code> 等价于 <code>:src</code>。</li>
        <li>
          <strong>布尔属性</strong>：像 <code>:disabled="false"</code> 时，Vue 会把该属性
          <strong>整个移除</strong>，而不是渲染成 <code>{'disabled="false"'}</code>。
        </li>
        <li>
          <strong>动态参数</strong>：<code>{':[attrName]="value"'}</code> 连「属性名」本身都可以是变量。
        </li>
        <li>
          <strong>批量绑定</strong>：<code>{'v-bind="obj"'}</code>（不带参数）会把对象的每个键值
          展开成一个个属性。
        </li>
      </ul>

      <h2>四、条件渲染：v-if 家族 vs v-show</h2>
      <p>
        让元素「出现或消失」有两条路。<code>v-if</code> / <code>v-else-if</code> / <code>v-else</code>
        是真正的条件渲染：条件为假时，元素压根不会出现在 DOM 里。<code>v-show</code> 则永远渲染元素，
        只是通过切换 CSS 的 <code>display</code> 来显隐。
      </p>
      <CodeBlock lang="vue" title="v-if 家族与 v-show" code={vIfShowSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>v-if 家族</th><th>v-show</th></tr>
        </thead>
        <tbody>
          <tr><td>实现方式</td><td>条件为假则不创建 / 销毁 DOM</td><td>始终创建，切换 <code>display:none</code></td></tr>
          <tr><td>初始开销</td><td>低（假则不渲染）</td><td>较高（无论真假都渲染）</td></tr>
          <tr><td>切换开销</td><td>较高（反复创建销毁）</td><td>低（只改样式）</td></tr>
          <tr><td>支持 else 链</td><td>支持 <code>v-else-if</code> / <code>v-else</code></td><td>不支持</td></tr>
          <tr><td>能用在 template 上</td><td>能（不渲染额外标签）</td><td>不能</td></tr>
          <tr><td>适用场景</td><td>条件很少改变、或初始就不需要</td><td>频繁切换显隐</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一句话取舍">
        切换非常频繁（如选项卡、折叠面板）用 <code>v-show</code>；条件很少变、或某些分支可能永远用不到
        用 <code>v-if</code>。
      </Callout>

      <h2>五、v-for：列表渲染与 key 的重要性</h2>
      <p>
        <code>v-for</code> 把一个数组 / 对象 / 数字范围渲染成一组元素。它的语法是
        <code>{'item in list'}</code> 或带下标的 <code>{'(item, index) in list'}</code>。
        遍历对象时还能拿到键与序号：<code>{'(value, key, index) in obj'}</code>。
      </p>
      <CodeBlock lang="vue" title="v-for 的几种遍历" code={vForSnippet} />
      <KeyIdea>
        每个 <code>v-for</code> 都应配一个 <code>:key</code>，且 key 要用<strong>稳定且唯一</strong>的标识
        （通常是数据的 id）。key 是 Vue 用来在更新时「认出谁是谁」的身份证，有了它，Vue 才能在列表
        增删、排序时高效地复用、移动节点。
      </KeyIdea>
      <Callout variant="warn" title="不要用 index 当 key">
        当列表会发生<strong>插入、删除、排序</strong>时，用数组下标 <code>index</code> 作 key 会让
        每个位置的 key 都跟着错位，导致 Vue 复用了错误的节点——常见症状是：删了第一项，结果勾选状态、
        输入框内容「串台」到了别的行。只有当列表是<strong>纯静态、永不重排</strong>时，用 index 才勉强安全。
      </Callout>

      <h2>六、v-on：事件与修饰符</h2>
      <p>
        <code>v-on</code> 监听 DOM 事件并执行处理逻辑，简写是 <code>@</code>。处理函数既可以是方法名，
        也可以是行内表达式；需要原生事件对象时用特殊变量 <code>$event</code>。
      </p>
      <CodeBlock lang="vue" title="v-on 与各类修饰符" code={vOnSnippet} />
      <p>修饰符让常见的事件处理写法更短，链式书写即可叠加：</p>
      <table>
        <thead>
          <tr><th>修饰符</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>.prevent</code></td><td>调用 <code>event.preventDefault()</code>，如阻止表单刷新页面</td></tr>
          <tr><td><code>.stop</code></td><td>调用 <code>event.stopPropagation()</code>，阻止事件冒泡</td></tr>
          <tr><td><code>.once</code></td><td>事件只触发一次后自动解绑</td></tr>
          <tr><td><code>.self</code></td><td>只有事件源是元素自身时才触发</td></tr>
          <tr><td><code>.enter</code> / <code>.esc</code></td><td>按键修饰符：仅在按下指定键时触发</td></tr>
          <tr><td><code>.ctrl</code> / <code>.shift</code></td><td>系统修饰键：需同时按下才触发</td></tr>
        </tbody>
      </table>

      <h2>七、class 与 style 绑定</h2>
      <p>
        给元素动态加类名或内联样式是高频需求，Vue 为 <code>:class</code> 和 <code>:style</code> 提供了
        专门的对象 / 数组语法，比手动拼字符串清晰得多。
      </p>
      <CodeBlock lang="vue" title="class 与 style 的对象 / 数组语法" code={classStyleSnippet} />
      <ul>
        <li><strong>class 对象语法</strong>：键是类名，值为真该类就生效，非常适合「状态决定样式」。</li>
        <li><strong>class 数组语法</strong>：适合需要同时拼多个类、或类名本身也是变量的场景。</li>
        <li><strong>与静态 class 共存</strong>：<code>{'class="card" :class="{...}"'}</code> 两者会自动合并。</li>
        <li><strong>style 对象</strong>：CSS 属性名写成驼峰（<code>fontSize</code>）或带引号的连字符形式。</li>
      </ul>

      <h2>八、综合实战：一个待办列表模板</h2>
      <p>
        下面把本章所有指令拢到一起：<code>v-model</code> 收集输入（下一章细讲）、
        <code>@keyup.enter</code> 回车新增、<code>:disabled</code> 控制按钮、<code>v-for</code> + 稳定
        <code>:key</code> 渲染列表、<code>:class</code> 标记完成态、<code>@click.stop</code> 删除、
        <code>v-if</code> 处理空状态。
      </p>
      <CodeBlock lang="vue" title="待办列表：指令综合演练" code={todoSnippet} />
      <Example title="读懂这个待办列表的几个关键点">
        <p>
          1. 列表用 <code>todo.id</code> 而非 <code>index</code> 作 key，删除中间项后勾选状态不会串台。
        </p>
        <p>
          2. <code>remaining</code> 和 <code>visibleTodos</code> 用计算属性派生，模板里只读结果，
          保持模板内只放表达式的纪律。
        </p>
        <p>
          3. 空状态用 <code>v-if</code> 而非 <code>v-show</code>：列表为空时根本不需要那个节点存在。
        </p>
      </Example>

      <Callout variant="tip">
        你可能注意到例子里的 <code>v-model</code> 还没正式讲——它其实是
        <code>v-bind</code> 加 <code>v-on</code> 的组合语法糖。下一章我们就把 <code>v-model</code>
        和表单处理彻底讲透。
      </Callout>

      <Summary
        points={[
          'Vue 模板是合法 HTML 的超集，最终会被编译成返回 VNode 的渲染函数；插值与指令里只能放单个表达式，不能放语句。',
          '文本插值用双大括号，只能用于文本位置，不能用于属性；属性动态赋值要用 v-bind（简写 :）。',
          'v-bind 支持简写、布尔属性自动增删、动态参数 :[name] 与无参批量绑定。',
          'v-if 家族真正增删 DOM 且支持 else 链与 template 包裹；v-show 只切换 display，适合频繁显隐。',
          'v-for 遍历数组 / 对象 / 范围，必须配稳定唯一的 :key；列表会增删排序时绝不能用 index 当 key。',
          'v-on（简写 @）监听事件，支持 .prevent / .stop / .once 等事件修饰符与 .enter 等按键修饰符。',
          'class / style 用对象与数组语法绑定，比拼字符串更清晰，且能与静态 class 自动合并。',
        ]}
      />
    </article>
  )
}
