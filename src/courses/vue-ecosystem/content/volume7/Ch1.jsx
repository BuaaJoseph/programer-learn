import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const templateSnippet = `<!-- 一段最朴素的模板 -->
<template>
  <div class="box">
    <h1>标题</h1>
    <p>{{ msg }}</p>
  </div>
</template>`

const renderSnippet = `// 上面的模板会被编译器编译成大致这样的 render 函数
import { createElementVNode as _createElementVNode,
         toDisplayString as _toDisplayString,
         openBlock as _openBlock,
         createElementBlock as _createElementBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "box" }, [
    _createElementVNode("h1", null, "标题"),       // 完全静态
    _createElementVNode("p", null,
      _toDisplayString(_ctx.msg),                   // 动态文本：依赖 msg
      1 /* TEXT */)                                 // 1 是 PatchFlag，标记“文本会变”
  ]))
}`

const vnodeShapeSnippet = `// VNode 本质上就是一个描述“要渲染成什么”的普通 JS 对象
const vnode = {
  type: 'p',                 // 标签名 / 组件对象 / Fragment / Text
  props: { class: 'box' },   // 属性、事件（onClick 等）
  children: 'hello',         // 字符串、数组(子 VNode) 或对象(插槽)
  key: null,                 // diff 时用于身份匹配
  patchFlag: 1,              // 编译期打的优化标记
  el: null,                  // 挂载后指向真实 DOM 节点
}`

const hRenderSnippet = `import { h, ref } from 'vue'

// 不写 template，直接用 h() 函数手写 render —— 适合高度动态的结构
export default {
  setup() {
    const count = ref(0)
    // 返回的是一个“渲染函数”，每次更新都会被重新调用
    return () => h('button', {
      onClick: () => count.value++,
    }, \`点击了 \${count.value} 次\`)
  },
}`

const diffSnippet = `// 同层比较：只在“同一父节点、同一层级”的子节点之间做 diff
// 不会跨层移动节点（Vue 假设跨层移动极少，换来 O(n) 复杂度）

// 旧子节点： [a, b, c, d]
// 新子节点： [a, c, d, b]
//
// 借助 key，Vue 能识别出这是“同一批节点换了顺序”，
// 于是复用 DOM 并移动，而不是销毁重建。
// 没有 key 时只能按位置硬比，往往退化成大量重建。`

export default function Ch1() {
  return (
    <article>
      <Lead>
        你在 <code>.vue</code> 文件里写的 <code>{'<template>'}</code> 看起来像 HTML，但浏览器从来不会
        直接执行它。Vue 在背后做了一件关键的事：把模板<strong>编译</strong>成一个 JavaScript 函数——
        render 函数。这个函数运行后产出一棵<strong>虚拟 DOM 树</strong>，Vue 再拿它和上一次的树做对比，
        算出最小的真实 DOM 改动。这一章我们把这条主线讲透：template 怎样变成 render、VNode 是什么、
        首次挂载与后续更新的区别、diff 的核心策略，以及一个常被误解的问题——虚拟 DOM 真的更快吗。
      </Lead>

      <h2>一、从 template 到 render：模板只是「写法」</h2>
      <p>
        模板是给人看的<strong>声明式语法</strong>，它直观、贴近 HTML，但运行时并不存在「模板」这种东西。
        Vue 的编译器（<code>@vue/compiler-dom</code>）会在构建阶段（或运行时）把模板翻译成一个
        <strong>render 函数</strong>。换句话说，<code>{'<template>'}</code> 是源代码，render 函数才是
        真正被执行的产物。
      </p>
      <p>
        编译大致分三步：先把模板字符串<strong>解析（parse）</strong>成抽象语法树（AST）；再对 AST 做
        <strong>转换（transform）</strong>，这一步会插入大量优化信息（下一章的静态提升、PatchFlag 都在此发生）；
        最后<strong>生成（generate）</strong>出 render 函数的源码字符串。下面看一段最朴素的模板和它的编译产物。
      </p>
      <CodeBlock lang="vue" title="源代码：一段朴素模板" code={templateSnippet} />
      <CodeBlock lang="js" title="编译产物：等价的 render 函数（简化）" code={renderSnippet} />
      <p>
        注意几个细节：<code>{'<h1>标题</h1>'}</code> 是纯静态的，编译后就是一个写死内容的
        <code>{'_createElementVNode'}</code>；而 <code>{'{{ msg }}'}</code> 这段动态文本，编译器在它的 VNode
        末尾打了一个数字 <code>1</code>——这就是 <strong>PatchFlag</strong>，告诉运行时「这个节点只有文本会变」。
        编译期就把动静分析清楚，是 Vue 3 性能的根基，下一章专门讲它。
      </p>
      <KeyIdea>
        模板（template）是写给人的声明式语法；render 函数才是真正运行的代码。编译器在
        parse → transform → generate 三步里把模板翻译成 render 函数，并顺手插入大量优化标记。
        理解「模板会被编译成 render」，是理解 Vue 渲染机制的第一块基石。
      </KeyIdea>

      <h2>二、render 函数产出 VNode：什么是虚拟 DOM</h2>
      <p>
        render 函数运行后，并不会直接去操作浏览器的真实 DOM，而是返回一个（或一棵）
        <strong>VNode（虚拟节点，virtual node）</strong>。VNode 就是一个<strong>普通的 JavaScript 对象</strong>，
        用来描述「界面应该长什么样」：是什么标签、有哪些属性、子节点是谁。一整棵 VNode 树，
        就是所谓的<strong>虚拟 DOM（virtual DOM）</strong>——它是真实 DOM 的一份轻量级 JS 描述。
      </p>
      <CodeBlock lang="js" title="一个 VNode 的大致结构" code={vnodeShapeSnippet} />
      <p>
        为什么不直接操作真实 DOM？因为真实 DOM 节点是<strong>重对象</strong>——一个 DOM 元素挂着成百上千个
        属性和方法，创建、读取、修改它都可能触发浏览器内部的布局与重绘。而 VNode 只是几个字段的普通对象，
        创建和比较都极其廉价。Vue 的策略是：先在<strong>廉价的 JS 对象层</strong>上把「该改哪儿」算清楚，
        再一次性把最小改动落到<strong>昂贵的真实 DOM</strong> 上。
      </p>
      <table>
        <thead>
          <tr><th>对比项</th><th>真实 DOM 节点</th><th>VNode（虚拟节点）</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>浏览器宿主对象</td><td>普通 JS 对象</td></tr>
          <tr><td>创建成本</td><td>高（牵涉布局/重绘）</td><td>低（几个字段赋值）</td></tr>
          <tr><td>能否随意比较</td><td>代价大</td><td>极廉价</td></tr>
          <tr><td>跨平台</td><td>绑定浏览器</td><td>与平台无关，可渲染到任意目标</td></tr>
        </tbody>
      </table>

      <h2>三、首次挂载 mount 与后续更新 patch</h2>
      <p>
        组件的生命有两个关键时刻，对应渲染器（renderer）的两条路径：
      </p>
      <ul>
        <li>
          <strong>mount（首次挂载）</strong>：第一次渲染时，还没有旧的 VNode 树可比。渲染器会
          <strong>遍历整棵 VNode 树</strong>，为每个 VNode 创建对应的真实 DOM 节点、设置属性、绑定事件，
          然后插入页面。VNode 上的 <code>el</code> 字段会被填上它创建出来的真实 DOM 引用。
        </li>
        <li>
          <strong>patch（更新打补丁）</strong>：当响应式数据变化，render 函数被<strong>重新调用</strong>，
          产出一棵<strong>新的</strong> VNode 树。渲染器拿新树和旧树逐一对比（diff），只把<strong>有差异的部分</strong>
          落到真实 DOM 上——能复用的节点就复用（连同它的 <code>el</code>），不重建整棵子树。
        </li>
      </ul>
      <p>
        所以「响应式数据变了 → 视图更新」的完整链路是：依赖触发 → 重新运行 render → 得到新 VNode 树 →
        patch 对比新旧树 → 把最小改动写入真实 DOM。mount 是「从无到有」，patch 是「从旧到新」。
      </p>
      <Example title="一次更新发生了什么">
        <p>
          假设 <code>msg</code> 从 <code>{"'A'"}</code> 改成 <code>{"'B'"}</code>。render 函数重新运行，
          产出新 VNode 树。patch 比较后发现：<code>{'<div>'}</code> 和 <code>{'<h1>'}</code> 没变（静态），
          只有那个带 <code>1 /* TEXT */</code> 标记的 <code>{'<p>'}</code> 文本不同。
          于是 Vue 只执行一句 <code>el.textContent = 'B'</code>，其余 DOM 一动不动。
        </p>
      </Example>

      <h2>四、diff 算法：同层比较 + key 匹配</h2>
      <p>
        patch 的核心是 diff——如何高效地比较新旧两棵 VNode 树。理论上「两棵任意树的最小编辑距离」是
        O(n³) 的昂贵问题，直接用在 UI 上不现实。Vue（和 React 一样）用两条<strong>启发式假设</strong>把它
        压到接近 O(n)：
      </p>
      <ul>
        <li>
          <strong>同层比较（only compare same level）</strong>：只在「同一个父节点下、同一层级」的节点之间做对比，
          <strong>不跨层移动</strong>节点。如果一个节点在新树里换了父亲，Vue 不会去搬它，而是直接销毁重建。
          这基于一个经验：界面更新时跨层移动节点极其罕见。
        </li>
        <li>
          <strong>类型不同就重建</strong>：同一位置如果标签 / 组件类型变了（比如 <code>{'<div>'}</code> 变
          <code>{'<span>'}</code>），不再深入比较，直接卸载旧的、挂载新的。
        </li>
        <li>
          <strong>key 做身份匹配</strong>：在列表里，<code>key</code> 给每个节点一个稳定身份。有了 key，
          Vue 能识别出「这还是同一个节点，只是换了位置」，从而<strong>复用并移动</strong> DOM，而不是逐个重建。
        </li>
      </ul>
      <CodeBlock lang="js" title="同层比较与 key 的直觉" code={diffSnippet} />
      <p>
        对于列表子节点的对比，Vue 3 采用<strong>双端 diff</strong>配合<strong>最长递增子序列（LIS）</strong>的策略。
        一句话直觉：先从两端往中间快速「掐掉」头尾相同的节点；剩下中间乱序的部分，通过求
        <strong>最长递增子序列</strong>找出「本来就保持相对顺序、无需移动」的最大一批节点让它们待着不动，
        只移动其余少数节点——把 DOM 移动次数降到最少。你不必背实现，记住结论即可：<strong>给列表正确的 key，
        diff 才能高效复用</strong>。
      </p>
      <Callout variant="warn" title="不要用 index 当列表 key">
        用数组下标作 <code>key</code>，在列表顺序变化或中间插删时会误导 diff——它会以为「位置 0 始终是同一个节点」，
        导致状态错位、复用错误。请使用数据本身稳定且唯一的标识（如 id）作为 key。
      </Callout>

      <h2>五、为什么要虚拟 DOM：取舍而非银弹</h2>
      <p>
        虚拟 DOM 常被误读成「比直接操作 DOM 更快」。更准确的说法是：它用<strong>可接受的计算成本</strong>，
        换来了三样东西。
      </p>
      <ul>
        <li>
          <strong>批量计算最小改动</strong>：把多次零散的 DOM 操作，归并成「先在 JS 层算出 diff，再一次性落地」。
          这避免了开发者手写命令式 DOM 操作时容易产生的重复读写与多次重排。
        </li>
        <li>
          <strong>声明式开发</strong>：你只描述「状态对应的界面应该是什么样」，不用手写「先删这个再插那个」。
          UI = f(state)，心智负担大幅下降。
        </li>
        <li>
          <strong>跨平台</strong>：VNode 是与平台无关的 JS 对象。换一套<strong>渲染器</strong>，同一套组件就能渲染到
          浏览器之外的目标——比如原生移动端、canvas、甚至字符终端。
        </li>
      </ul>
      <KeyIdea>
        虚拟 DOM 不是「一定更快」。它本身是<strong>额外的开销</strong>（创建 VNode、跑 diff 都要 CPU）。
        它真正的价值是用这点开销，换来<strong>声明式心智</strong>、<strong>跨平台能力</strong>，以及<strong>把改动归并到最小</strong>
        的工程保证。和精心手写的命令式 DOM 操作相比，虚拟 DOM 不见得更快——但它让「大多数代码自动够快」。
      </KeyIdea>
      <p>
        正因为虚拟 DOM 有运行时开销，Vue 3 才下大力气在<strong>编译期</strong>把动静分析清楚，让 diff 只在真正
        会变的节点上发生——这就是下一章「编译优化」要讲的内容。也有些框架（如 Svelte、Solid）干脆选择
        「无虚拟 DOM」，在编译期直接生成精确的 DOM 更新代码；这是另一条技术路线，各有取舍。
      </p>

      <h2>六、不写模板也行：直接用 render / JSX</h2>
      <p>
        既然模板最终都会变成 render 函数，那你当然也可以<strong>跳过模板，直接手写 render</strong>。Vue 暴露了
        <code>h()</code> 函数（hyperscript，「创建 VNode」的工厂）来手动构造 VNode。在结构高度动态、难以用模板表达
        的场景（比如根据配置动态决定标签名、需要复杂的程序化逻辑），手写 render 或用 JSX 会更顺手。
      </p>
      <CodeBlock lang="js" title="用 h() 手写 render 函数" code={hRenderSnippet} />
      <p>
        <code>h(type, props, children)</code> 三个参数分别对应 VNode 的标签 / 组件、属性、子节点。
        日常开发推荐用模板（可读、可被编译器优化），但理解 <code>h()</code> 能帮你看清「模板不过是 render 的语法糖」。
      </p>
      <Callout variant="note" title="模板 vs 手写 render，怎么选">
        绝大多数业务组件用<strong>模板</strong>即可：可读性好，且能享受下一章讲的编译期优化（静态提升、PatchFlag 等）。
        只有当结构高度动态、难以用模板声明（如运行时决定标签名、需要复杂分支与循环生成节点）时，才考虑手写
        <code>render</code> 或 JSX——代价是这些手写产物默认拿不到编译器的优化标记。
      </Callout>

      <Callout variant="tip">
        下一章我们深入<strong>编译优化</strong>：静态提升、PatchFlag、Block Tree、事件缓存——看 Vue 3 如何在编译期
        把「全树 diff」降为「只比动态部分」，这正是它相比 Vue 2 在更新性能上的关键飞跃。
      </Callout>

      <Summary
        points={[
          '模板 template 是给人写的声明式语法，会被编译器经 parse → transform → generate 三步编译成 render 函数；render 才是真正运行的代码。',
          'render 函数产出 VNode（普通 JS 对象，描述 UI），一整棵 VNode 树就是虚拟 DOM——真实 DOM 的轻量级 JS 描述。',
          'mount 是首次挂载（遍历整棵 VNode 树创建真实 DOM）；patch 是更新（重新运行 render 得到新树，diff 后只改有差异的部分）。',
          'diff 基于启发式：同层比较、不跨层移动、类型不同就重建；列表靠 key 做身份匹配，Vue 3 用双端 diff + 最长递增子序列把 DOM 移动降到最少。',
          '虚拟 DOM 不是“一定更快”，而是用可控的计算开销换来批量最小改动、声明式心智与跨平台能力。',
          '模板是 render 的语法糖：也可用 h() 函数或 JSX 直接手写 render，适合高度动态的结构。',
        ]}
      />
    </article>
  )
}
