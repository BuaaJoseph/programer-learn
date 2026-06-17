import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const sugarSnippet = `<template>
  <!-- 这一行 v-model -->
  <input v-model="text" />

  <!-- 完全等价于下面这一行（:value 绑值 + @input 回写） -->
  <input :value="text" @input="text = $event.target.value" />
</template>

<script setup>
import { ref } from 'vue'
const text = ref('')
</script>`

const inputsSnippet = `<template>
  <!-- 文本框 / 文本域：绑 value，监听 input -->
  <input v-model="name" />
  <textarea v-model="bio"></textarea>

  <!-- 单选框 radio：绑 value，监听 change，结果是被选中那项的 value -->
  <label><input type="radio" value="男" v-model="gender" /> 男</label>
  <label><input type="radio" value="女" v-model="gender" /> 女</label>

  <!-- 单个复选框：绑 checked，结果是布尔值 -->
  <label><input type="checkbox" v-model="agree" /> 同意条款</label>

  <!-- 下拉选择：绑 value，监听 change -->
  <select v-model="city">
    <option value="hz">杭州</option>
    <option value="bj">北京</option>
  </select>
</template>

<script setup>
import { ref } from 'vue'
const name = ref('')
const bio = ref('')
const gender = ref('男')
const agree = ref(false)
const city = ref('hz')
</script>`

const modifierSnippet = `<template>
  <!-- .lazy：改为监听 change 而非 input，即失焦/回车后才同步 -->
  <input v-model.lazy="msg" />

  <!-- .number：自动把输入转成数字（转不了则保留原值） -->
  <input v-model.number="age" />

  <!-- .trim：自动去掉首尾空白 -->
  <input v-model.trim="username" />

  <!-- 修饰符可以叠加 -->
  <input v-model.lazy.trim="title" />
</template>

<script setup>
import { ref } from 'vue'
const msg = ref('')
const age = ref(0)
const username = ref('')
const title = ref('')
</script>`

const checkboxArraySnippet = `<template>
  <!-- 多个复选框共享同一个【数组】，选中项的 value 会进数组 -->
  <label><input type="checkbox" value="vue" v-model="skills" /> Vue</label>
  <label><input type="checkbox" value="react" v-model="skills" /> React</label>
  <label><input type="checkbox" value="node" v-model="skills" /> Node</label>

  <p>已选：{{ skills.join('、') }}</p>
</template>

<script setup>
import { ref } from 'vue'
// 初值是数组，勾选哪个就把它的 value 推进来
const skills = ref([])
</script>`

const defineModelSnippet = `<!-- 子组件 MyInput.vue：用 defineModel 实现自定义 v-model -->
<template>
  <input :value="model" @input="model = $event.target.value" />
</template>

<script setup>
// defineModel 返回一个可读写的 ref，读它就是父级传入的值，
// 写它就会自动 emit update:modelValue 通知父级。
const model = defineModel()
</script>`

const useModelSnippet = `<!-- 父组件：像用原生 input 一样用子组件 -->
<template>
  <MyInput v-model="keyword" />
  <p>父级看到的值：{{ keyword }}</p>
</template>

<script setup>
import { ref } from 'vue'
import MyInput from './MyInput.vue'
const keyword = ref('')
</script>`

const manualModelSnippet = `<!-- 不用 defineModel 时，v-model 的「手动」等价实现 -->
<template>
  <input
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
// 组件上的 v-model 本质：父传 modelValue 这个 prop，
// 子通过 emit('update:modelValue', 新值) 回写。
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>`

const formSnippet = `<template>
  <form class="login" @submit.prevent="onSubmit">
    <div>
      <label>用户名</label>
      <input v-model.trim="form.username" />
      <small v-if="errors.username">{{ errors.username }}</small>
    </div>

    <div>
      <label>密码</label>
      <input type="password" v-model="form.password" />
      <small v-if="errors.password">{{ errors.password }}</small>
    </div>

    <div>
      <label>年龄</label>
      <input type="number" v-model.number="form.age" />
    </div>

    <label>
      <input type="checkbox" v-model="form.agree" /> 我已阅读并同意条款
    </label>

    <button type="submit" :disabled="!form.agree">注册</button>
  </form>
</template>

<script setup>
import { reactive } from 'vue'

const form = reactive({
  username: '',
  password: '',
  age: null,
  agree: false,
})

const errors = reactive({ username: '', password: '' })

function validate() {
  errors.username = form.username.length < 3 ? '用户名至少 3 个字符' : ''
  errors.password = form.password.length < 6 ? '密码至少 6 位' : ''
  return !errors.username && !errors.password
}

function onSubmit() {
  if (!validate()) return
  console.log('提交：', { ...form })
  // 这里发起真正的注册请求……
}
</script>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        表单是绝大多数应用都绕不开的交互：登录、注册、搜索、设置……Vue 用一个指令
        <code>v-model</code> 把「读取输入框的值」和「把值写回数据」这件来回的苦差事抹平成了一行。
        这一章我们先拆穿 <code>v-model</code> 的语法糖本质，再看它在各类表单控件上分别绑什么、
        三个常用修饰符、多选 checkbox 绑数组的技巧，最后讲如何用 <code>defineModel</code>
        给自定义组件也装上 <code>v-model</code>，并附一个登录 / 注册表单的完整例子。
      </Lead>

      <h2>一、v-model 的本质：一段语法糖</h2>
      <KeyIdea>
        <code>v-model</code> 不是什么新机制，它就是
        <strong><code>v-bind</code>（绑值）+ <code>v-on</code>（监听事件回写）</strong>
        的组合简写。它替你把「把数据显示到控件上」和「用户一改就把新值存回数据」这两半连了起来，
        形成<strong>双向绑定</strong>。
      </KeyIdea>
      <p>
        看下面这组对照，上下两种写法在文本框上完全等价：
      </p>
      <CodeBlock lang="vue" title="v-model 展开后的样子" code={sugarSnippet} />
      <p>
        理解这一点很关键：既然 <code>v-model</code> 只是 <code>:value</code> 加上一个事件监听，
        那么它在不同控件上「绑什么属性、听什么事件」自然就不一样——因为不同控件表达「当前值」的
        方式本就不同。
      </p>

      <h2>二、v-model 在各类控件上分别绑什么</h2>
      <p>
        Vue 会根据控件类型自动选择正确的属性和事件，你只管写 <code>v-model</code> 就行。
        但心里要清楚它背后做了什么：
      </p>
      <table>
        <thead>
          <tr><th>控件</th><th>绑定的属性</th><th>监听的事件</th><th>得到的值</th></tr>
        </thead>
        <tbody>
          <tr><td>text / textarea</td><td><code>value</code></td><td><code>input</code></td><td>字符串</td></tr>
          <tr><td>checkbox（单个）</td><td><code>checked</code></td><td><code>change</code></td><td>布尔值</td></tr>
          <tr><td>checkbox（多个）</td><td><code>checked</code></td><td><code>change</code></td><td>数组</td></tr>
          <tr><td>radio</td><td><code>checked</code></td><td><code>change</code></td><td>被选项的 value</td></tr>
          <tr><td>select（单选）</td><td><code>value</code></td><td><code>change</code></td><td>被选项的 value</td></tr>
          <tr><td>select（多选）</td><td><code>value</code></td><td><code>change</code></td><td>数组</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="vue" title="各类控件上的 v-model" code={inputsSnippet} />
      <Callout variant="info" title="单个 checkbox 是布尔，多个是数组">
        一个孤立的复选框，<code>v-model</code> 绑的是 <strong>布尔值</strong>（勾上为 true）；
        而当多个复选框共享同一个 <code>v-model</code> 且初值为<strong>数组</strong>时，行为会切换成
        「把选中项的 value 收集进数组」。这两种语义靠绑定值的类型区分，下一节专门演示。
      </Callout>

      <h2>三、三个常用修饰符：.lazy / .number / .trim</h2>
      <p>
        <code>v-model</code> 自带三个能省去手工处理的修饰符：
      </p>
      <CodeBlock lang="vue" title="v-model 修饰符" code={modifierSnippet} />
      <ul>
        <li>
          <strong>.lazy</strong>：把同步时机从 <code>input</code>（每次敲键）改成 <code>change</code>
          （失焦或回车后）。适合不想随每次按键都触发计算 / 校验的场景。
        </li>
        <li>
          <strong>.number</strong>：自动把输入字符串转成数字。表单里数字输入框几乎必加，否则你拿到的
          是 <code>{'"18"'}</code> 这样的字符串而非 <code>18</code>。
        </li>
        <li>
          <strong>.trim</strong>：自动去掉首尾空白，避免「用户名末尾多了个空格」这类隐蔽 bug。
        </li>
      </ul>
      <Callout variant="tip" title="修饰符可叠加">
        修饰符能链式组合，如 <code>v-model.lazy.trim</code>：失焦后同步、并去掉首尾空格。顺序不影响结果。
      </Callout>

      <h2>四、多选 checkbox 绑数组</h2>
      <p>
        当你想让一组复选框收集成「选了哪些」的列表时，让它们共享同一个 <code>v-model</code>，
        并把该数据初始化成<strong>数组</strong>。勾选某项就把它的 <code>value</code> 推入数组，
        取消勾选则移除。
      </p>
      <CodeBlock lang="vue" title="多选复选框收集成数组" code={checkboxArraySnippet} />
      <Example title="为什么初值必须是数组">
        <p>
          <code>v-model</code> 是靠绑定值的类型来决定行为的：初值是
          <code>{'ref(false)'}</code> 这种布尔，它就当单个开关；初值是
          <code>{'ref([])'}</code> 这种数组，它才进入「收集 value」模式。所以多选场景一定要把初值写成
          <code>[]</code>，否则会退化成布尔语义、行为全乱。
        </p>
      </Example>

      <h2>五、给自定义组件装上 v-model</h2>
      <p>
        <code>v-model</code> 不止能用在原生控件上，也能用在你自己写的组件上，实现父子组件之间的
        双向绑定。它的约定是：父组件传入一个名为 <code>modelValue</code> 的 prop，子组件通过
        <code>emit('update:modelValue', 新值)</code> 把变化通知回去。
      </p>
      <CodeBlock lang="vue" title="手动实现：modelValue + update:modelValue" code={manualModelSnippet} />
      <p>
        Vue 3.4 起提供了 <code>defineModel</code> 宏，把上面这套样板代码压缩成一行。它返回一个
        可读写的 ref：读它拿到的是父级传入的值，写它会自动触发对应的 <code>update</code> 事件。
      </p>
      <CodeBlock lang="vue" title="推荐写法：defineModel（子组件）" code={defineModelSnippet} />
      <CodeBlock lang="vue" title="父组件像用原生控件一样使用它" code={useModelSnippet} />
      <Callout variant="info" title="defineModel 与手动写法的关系">
        <code>defineModel()</code> 本质上仍是 <code>modelValue</code> prop 加
        <code>update:modelValue</code> 事件，只是把声明 prop、声明 emit、读写转发这三步合并掉了。
        理解底层约定，遇到旧代码或需要自定义事件名时才不会懵。
      </Callout>

      <h2>六、受控思想与表单校验</h2>
      <KeyIdea>
        Vue 的表单是<strong>受控</strong>的：控件显示什么，永远以数据（如
        <code>form.username</code>）为准；用户的每次输入都先经过 <code>v-model</code> 写回数据，
        再由数据驱动界面。换句话说，<strong>数据是唯一真相源</strong>，校验、联动、回填都围着它转。
      </KeyIdea>
      <p>
        正因为数据是唯一真相源，表单校验就变得直接：在提交前（或输入时）读这些响应式数据、
        判断是否合规、把错误信息写进另一组响应式状态，模板用 <code>v-if</code> 显示出来即可。
      </p>

      <h2>七、综合实战：登录 / 注册表单</h2>
      <p>
        下面这个表单把本章要点全用上了：<code>v-model.trim</code> 处理用户名、
        <code>v-model.number</code> 处理年龄、单个 checkbox 绑布尔控制按钮可用性、
        <code>@submit.prevent</code> 阻止默认刷新、提交前做校验并用 <code>v-if</code> 显示错误。
      </p>
      <CodeBlock lang="vue" title="可运行的登录 / 注册表单" code={formSnippet} />
      <Example title="读懂这个表单的设计">
        <p>
          1. 用 <code>reactive</code> 把整个表单收进一个对象 <code>form</code>，提交时
          <code>{'{ ...form }'}</code> 一把取走，比一堆散落的 ref 更整洁。
        </p>
        <p>
          2. 年龄用 <code>.number</code>，确保后端拿到的是数字而非字符串。
        </p>
        <p>
          3. <code>:disabled="!form.agree"</code> 让「同意条款」直接驱动按钮可用性——数据驱动 UI 的典型。
        </p>
        <p>
          4. 校验失败时把信息写进 <code>errors</code>，模板用 <code>v-if</code> 渲染，是受控表单的标准做法。
        </p>
      </Example>

      <Callout variant="warn" title="前端校验不能替代后端校验">
        前端校验是为了体验（即时反馈），但它<strong>可被绕过</strong>。任何安全相关的规则
        （唯一性、权限、防注入）都必须在后端再校验一遍，前端校验只是第一道而非唯一一道防线。
      </Callout>

      <Summary
        points={[
          'v-model 是 v-bind 绑值加 v-on 监听回写的语法糖，本质就是双向绑定的简写。',
          '不同控件 v-model 绑的属性 / 事件不同：text 绑 value 听 input，checkbox/radio 绑 checked 听 change，select 绑 value 听 change。',
          '单个 checkbox 得到布尔值，多个 checkbox 共享数组型 v-model 则收集选中项的 value。',
          '三个修饰符：.lazy 改为 change 时机同步，.number 转数字，.trim 去首尾空白，且可叠加。',
          '组件上的 v-model 约定是 modelValue prop 加 update:modelValue 事件；defineModel 把这套样板压成一行。',
          'Vue 表单是受控的，数据是唯一真相源，校验围绕响应式数据展开，用 v-if 显示错误信息。',
          '前端校验只为体验，可被绕过，安全相关规则必须在后端再次校验。',
        ]}
      />
    </article>
  )
}
