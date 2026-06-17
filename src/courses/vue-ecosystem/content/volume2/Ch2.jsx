import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const computedBasicSnippet = `<script setup>
import { ref, computed } from 'vue'

const firstName = ref('Ada')
const lastName = ref('Lovelace')

// computed 接收一个 getter，返回一个只读的 ref
const fullName = computed(() => {
  console.log('计算 fullName')   // 只在依赖变化时才打印
  return firstName.value + ' ' + lastName.value
})
<\/script>

<template>
  <!-- 模板里自动解包，直接写 fullName -->
  <p>{{ fullName }} / {{ fullName }} / {{ fullName }}</p>
</template>`

const computedCacheSnippet = `import { ref, computed } from 'vue'

const n = ref(2)
const square = computed(() => {
  console.log('squaring')
  return n.value * n.value
})

// 多次访问，但依赖 n 没变 —— getter 只执行一次，其余命中缓存
console.log(square.value)  // 打印 "squaring"，得 4
console.log(square.value)  // 不打印，直接返回缓存 4
console.log(square.value)  // 不打印，直接返回缓存 4

n.value = 3                // 依赖变了，缓存失效
console.log(square.value)  // 再次打印 "squaring"，得 9`

const methodVsComputedSnippet = `// 对比：用方法实现「派生」没有缓存
function squareFn() {
  console.log('squaring')   // 每次调用都执行
  return n.value * n.value
}
// 模板里 {{ squareFn() }} 写三次，就执行三次

// computed 则只在依赖变化时重算一次，之后命中缓存`

const writableComputedSnippet = `<script setup>
import { ref, computed } from 'vue'

const firstName = ref('Ada')
const lastName = ref('Lovelace')

// 可写计算属性：同时提供 get 与 set
const fullName = computed({
  get() {
    return firstName.value + ' ' + lastName.value
  },
  set(value) {
    // 给 fullName 赋值时，反向拆解到两个源 ref
    const [first, last] = value.split(' ')
    firstName.value = first
    lastName.value = last
  },
})

fullName.value = 'Grace Hopper'   // 触发 set
console.log(firstName.value)      // 'Grace'
<\/script>`

const watchBasicSnippet = `<script setup>
import { ref, watch } from 'vue'

const count = ref(0)

// watch(源, 回调)：源变化时，回调拿到 (新值, 旧值)
watch(count, (newVal, oldVal) => {
  console.log(\`count 从 \${oldVal} 变成了 \${newVal}\`)
})

// 默认是「惰性」的：定义时不执行回调，只有 count 真正变化才触发
count.value++   // 打印 "count 从 0 变成了 1"
<\/script>`

const watchSourcesSnippet = `import { ref, watch } from 'vue'

const x = ref(0)
const y = ref(0)

// 侦听单个 ref
watch(x, (val) => console.log('x =', val))

// 侦听 getter（来自 reactive 的属性，或任意表达式）
watch(() => x.value + y.value, (sum) => console.log('和 =', sum))

// 侦听多个源：新旧值都是数组
watch([x, y], ([nx, ny], [ox, oy]) => {
  console.log(\`x: \${ox}->\${nx}, y: \${oy}->\${ny}\`)
})`

const immediateSnippet = `import { ref, watch } from 'vue'

const userId = ref(1)

// immediate: true —— 定义时立即执行一次回调（旧值为 undefined）
watch(userId, (id) => {
  fetchUser(id)
}, { immediate: true })`

const watchEffectSnippet = `<script setup>
import { ref, watchEffect } from 'vue'

const a = ref(1)
const b = ref(2)

// watchEffect：立即执行一次，并自动收集回调里用到的响应式依赖
watchEffect(() => {
  // 这里读了 a 和 b，于是它们成为依赖；任一变化都会重跑
  console.log('a + b =', a.value + b.value)
})

a.value = 10   // 自动重跑，打印 "a + b = 12"
<\/script>`

const flushSnippet = `import { ref, watch } from 'vue'

const count = ref(0)

// flush 控制回调相对「DOM 更新」的时机
watch(count, cb, { flush: 'pre' })   // 默认：DOM 更新「之前」
watch(count, cb, { flush: 'post' })  // DOM 更新「之后」，能拿到最新 DOM
watch(count, cb, { flush: 'sync' })  // 同步触发，每次变更都立即执行（慎用）`

const onCleanupSnippet = `import { ref, watch } from 'vue'

const id = ref(1)

watch(id, (newId, oldId, onCleanup) => {
  const controller = new AbortController()
  fetch(\`/api/user/\${newId}\`, { signal: controller.signal })

  // 注册清理：下次回调触发前（或侦听停止时）调用，
  // 用来取消上一次还没结束的副作用，避免竞态
  onCleanup(() => controller.abort())
})`

const deepSnippet = `import { reactive, ref, watch } from 'vue'

const state = reactive({ nested: { count: 0 } })

// 坑：直接侦听 reactive 对象，Vue 会「隐式」深度侦听，
// 但此时新值和旧值是「同一个引用」，oldVal === newVal
watch(state, (newVal, oldVal) => {
  // newVal 与 oldVal 指向同一个对象，拿不到真正的旧值
})

// 侦听一个对象型的 ref / getter 时，默认「浅」，
// 改内部属性不会触发；要 deep 才会深入比对
watch(() => state.nested, (n) => {
  // 改 state.nested.count 不触发，除非加 { deep: true }
}, { deep: true })`

const debounceSearchExample = `<script setup>
import { ref, watch } from 'vue'

const keyword = ref('')
const results = ref([])

watch(keyword, (newKeyword, oldKeyword, onCleanup) => {
  // 空输入直接清空，不发请求
  if (!newKeyword.trim()) {
    results.value = []
    return
  }

  // 防抖：300ms 内若关键词又变了，先取消这次定时器
  const timer = setTimeout(async () => {
    const controller = new AbortController()
    // 同时用 onCleanup 取消还在飞的请求，避免「旧请求后到」覆盖新结果
    onCleanup(() => controller.abort())

    const res = await fetch(
      \`/api/search?q=\${encodeURIComponent(newKeyword)}\`,
      { signal: controller.signal },
    )
    results.value = await res.json()
  }, 300)

  // 关键：清理上一次的定时器，实现防抖
  onCleanup(() => clearTimeout(timer))
})
<\/script>

<template>
  <input v-model="keyword" placeholder="输入关键词搜索" />
  <ul>
    <li v-for="item in results" :key="item.id">{{ item.title }}</li>
  </ul>
</template>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        有了 <code>ref</code> 和 <code>reactive</code> 这两块响应式基石，接下来要解决两类常见需求：
        <strong>从现有状态派生出新值</strong>，以及<strong>在状态变化时执行副作用</strong>。
        前者交给 <code>computed</code>，后者交给 <code>watch</code> / <code>watchEffect</code>。
        这一章讲透三者的差异、缓存机制、侦听时机与副作用清理，并用一个「根据搜索词防抖请求」的
        例子把它们串起来。
      </Lead>

      <h2>一、computed：带缓存的派生值</h2>
      <p>
        <code>computed</code> 接收一个 getter 函数，返回一个<strong>只读的响应式 ref</strong>。
        它的值由 getter 算出，并且会随 getter 里用到的响应式依赖自动更新。模板里用它和用普通 ref
        一样，自动解包。
      </p>
      <CodeBlock lang="vue" title="computed 基本用法" code={computedBasicSnippet} />
      <KeyIdea>
        <code>computed</code> 最关键的特性是<strong>缓存</strong>：只要它依赖的响应式数据没变，
        无论你访问它多少次，getter 都<strong>只执行一次</strong>，其余访问直接返回上一次的结果。
        依赖变化时，缓存才失效、下次访问时重算。
      </KeyIdea>
      <CodeBlock lang="js" title="缓存：依赖不变就不重算" code={computedCacheSnippet} />
      <p>
        这正是 <code>computed</code> 区别于「普通方法」的地方。如果你在模板里写
        <code>{'{{ squareFn() }}'}</code>，那么模板每渲染一次就调用一次函数，没有任何缓存；
        而 <code>computed</code> 在依赖不变时直接吃缓存，对于开销大的派生计算能省下大量重复运算。
      </p>
      <CodeBlock lang="js" title="对比：方法没有缓存" code={methodVsComputedSnippet} />

      <h2>二、可写的 computed</h2>
      <p>
        <code>computed</code> 默认只读，但当你确实需要「写回去」时，可以传一个含
        <code>get</code> 与 <code>set</code> 的对象。读取走 <code>get</code>，赋值走 <code>set</code>，
        在 <code>set</code> 里把值反向拆解到底层源。
      </p>
      <CodeBlock lang="vue" title="可写计算属性（get / set）" code={writableComputedSnippet} />
      <Callout variant="info" title="可写 computed 的典型场景">
        最常见的是配合 <code>v-model</code>：让一个绑定值在读取时做格式化、在写入时做反向解析，
        或把一个全局状态适配成本地可双向绑定的形态。但别滥用——多数派生值是只读的。
      </Callout>

      <h2>三、watch：显式侦听</h2>
      <p>
        <code>watch</code> 用来<strong>显式</strong>指定「侦听什么、变化了做什么」。它接收一个侦听源
        和一个回调，源变化时回调被调用，并拿到<strong>新值与旧值</strong>。
      </p>
      <CodeBlock lang="vue" title="watch 基本用法" code={watchBasicSnippet} />
      <p>
        <code>watch</code> 默认是<strong>惰性</strong>的：定义时<em>不会</em>立即执行回调，
        只有侦听源真正发生变化才触发。侦听源可以有多种形态：
      </p>
      <CodeBlock lang="js" title="watch 的多种侦听源" code={watchSourcesSnippet} />
      <ul>
        <li>一个 ref：直接传它本身。</li>
        <li>一个 getter 函数：用于侦听 reactive 的某个属性，或任意计算表达式。</li>
        <li>一个由源组成的数组：侦听多个源，回调的新旧值也是对应的数组。</li>
      </ul>
      <p>
        如果希望「定义时就先跑一次」，传 <code>{'{ immediate: true }'}</code>——这在
        「组件一挂载就要按当前参数拉数据」的场景非常常用。
      </p>
      <CodeBlock lang="js" title="immediate：定义时立即执行一次" code={immediateSnippet} />

      <h2>四、watchEffect：自动收集依赖、立即执行</h2>
      <p>
        <code>watchEffect</code> 是另一种侦听方式：你<strong>不显式声明源</strong>，
        而是直接写一个副作用函数；Vue 会<strong>立即执行它一次</strong>，并在执行过程中
        <strong>自动收集</strong>用到的所有响应式依赖，之后任一依赖变化都会重跑该函数。
      </p>
      <CodeBlock lang="vue" title="watchEffect 自动追踪依赖" code={watchEffectSnippet} />
      <Callout variant="warn" title="watchEffect 拿不到旧值">
        因为没有显式声明源，<code>watchEffect</code> 的回调<strong>拿不到新旧值</strong>；
        它也总是立即执行（无法惰性）。需要对比新旧值、或想精确控制只在某个源变化时触发，就用
        <code>watch</code>。
      </Callout>

      <h2>五、三者怎么选：computed vs watch vs watchEffect</h2>
      <table>
        <thead>
          <tr>
            <th>维度</th><th>computed</th><th>watch</th><th>watchEffect</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>用途</td><td>派生出新值</td><td>变化时跑副作用</td><td>变化时跑副作用</td></tr>
          <tr><td>有返回值</td><td>有（只读 ref）</td><td>无</td><td>无</td></tr>
          <tr><td>缓存</td><td>有</td><td>—</td><td>—</td></tr>
          <tr><td>声明依赖</td><td>自动（读哪个算哪个）</td><td>显式指定源</td><td>自动收集</td></tr>
          <tr><td>能拿新旧值</td><td>—</td><td>能</td><td>不能</td></tr>
          <tr><td>是否立即执行</td><td>惰性求值</td><td>默认否（可 immediate）</td><td>是</td></tr>
        </tbody>
      </table>
      <p>
        经验法则：<strong>要算出一个值用 <code>computed</code></strong>（尤其是会被多处反复读取、
        或计算偏重的派生）；<strong>要在状态变化时做事（请求、写 localStorage、操作 DOM）用
        <code>watch</code></strong>，并且需要对比新旧值或惰性触发时优先选它；
        <strong>副作用依赖多个源、懒得一一列出、且不关心旧值时用 <code>watchEffect</code></strong>。
      </p>

      <h2>六、flush 时机与清理副作用</h2>
      <p>
        侦听回调相对「组件 DOM 更新」的执行时机由 <code>flush</code> 选项控制：
      </p>
      <CodeBlock lang="js" title="flush：pre / post / sync" code={flushSnippet} />
      <ul>
        <li><code>'pre'</code>（默认）：在组件 DOM 更新<strong>之前</strong>触发。</li>
        <li><code>'post'</code>：在 DOM 更新<strong>之后</strong>触发，回调里能读到最新的 DOM。</li>
        <li><code>'sync'</code>：每次响应式数据变化就<strong>同步</strong>触发，频繁变化时开销大，慎用。</li>
      </ul>
      <p>
        当回调里启动了异步操作（请求、定时器、订阅），就要考虑<strong>清理</strong>：在下一次回调触发前，
        把上一次还没结束的副作用取消掉，否则会出现「旧请求晚于新请求返回、用旧数据覆盖新数据」的竞态。
        回调的第三个参数 <code>onCleanup</code> 就是为此而生。
      </p>
      <CodeBlock lang="js" title="onCleanup：取消上一次的副作用" code={onCleanupSnippet} />

      <h2>七、深度侦听 deep 与对象的坑</h2>
      <p>
        当侦听源是对象时，行为有几处容易踩坑，需要单独说清：
      </p>
      <CodeBlock lang="js" title="对象侦听的两个坑" code={deepSnippet} />
      <ul>
        <li>
          <strong>直接侦听 reactive 对象会隐式深度侦听</strong>，但此时回调里的新值和旧值
          <strong>指向同一个引用</strong>（<code>newVal === oldVal</code>），拿不到真正的旧值。
        </li>
        <li>
          <strong>侦听一个返回对象的 getter 时默认是「浅」的</strong>：只在该对象引用整体被替换时触发，
          改它的内部属性不会触发。要响应内部变化，得显式加 <code>{'{ deep: true }'}</code>。
        </li>
      </ul>
      <Callout variant="warn" title="deep 不是免费的">
        <code>deep: true</code> 会递归遍历对象的每一层来建立依赖，<strong>对大对象开销不小</strong>。
        能精确侦听到具体属性（用 getter 指到 <code>state.a.b</code>）时，就别盲目开 deep。
      </Callout>

      <h2>八、动手：根据搜索词防抖请求</h2>
      <p>
        把本章的概念串起来：侦听搜索词 <code>keyword</code>，用户停止输入 300ms 后才真正发请求
        （防抖），同时用 <code>onCleanup</code> 在新输入到来时取消上一次的定时器和还在飞的请求，
        从而既减少无谓请求，又避免旧响应覆盖新结果的竞态。
      </p>
      <Example title="防抖搜索：watch + onCleanup">
        <p>
          关键有三处：① 空输入直接清空、不发请求；② <code>setTimeout</code> 实现 300ms 防抖；
          ③ 两个 <code>onCleanup</code> 分别负责「清掉上一次的定时器」和「中止上一次还没回来的请求」。
        </p>
      </Example>
      <CodeBlock lang="vue" title="防抖搜索组件" code={debounceSearchExample} />
      <p>
        这个例子里 <code>watch</code> 的优势体现得淋漓尽致：它惰性触发（不输入就不动）、能拿到新值
        去发请求、还能用 <code>onCleanup</code> 干净地收拾上一轮副作用——这些都是
        <code>computed</code> 做不到、<code>watchEffect</code> 做起来别扭的事。
      </p>

      <h2>九、小结</h2>
      <p>
        这一章我们把 Vue 3 的「派生与侦听」三件套讲全了：<code>computed</code> 算值且带缓存，
        <code>watch</code> 显式侦听、能拿新旧值、惰性可 immediate，<code>watchEffect</code>
        自动收集依赖并立即执行。再加上 <code>flush</code> 时机、<code>onCleanup</code> 清理、
        以及 <code>deep</code> 与对象侦听的坑，你已经能从容应对绝大多数「状态变了之后该怎么办」的场景。
      </p>

      <Summary
        points={[
          'computed 是带缓存的派生值：依赖不变时 getter 只执行一次、多次访问命中缓存，优于无缓存的普通方法。',
          'computed 默认只读，传 get/set 即可写，常配合 v-model 做格式化 / 反向解析。',
          'watch 显式侦听一个或多个源，能拿到新旧值，默认惰性（不立即执行），加 immediate 才在定义时先跑一次。',
          'watchEffect 立即执行并自动收集回调里用到的依赖，但拿不到新旧值、无法惰性。',
          'flush 控制回调时机（pre 默认 / post 拿最新 DOM / sync 同步慎用）；onCleanup 取消上一次副作用以避免竞态。',
          '深度侦听：直接侦 reactive 会隐式深度但新旧值同引用；侦对象 getter 默认浅、需 deep: true，而 deep 对大对象开销不小。',
        ]}
      />
    </article>
  )
}
