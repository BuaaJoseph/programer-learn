import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const mixedTemplateSnippet = `<template>
  <div class="page">
    <header class="title">静态标题</header>   <!-- 完全静态 -->
    <p :class="theme">{{ msg }}</p>            <!-- class 与文本都动态 -->
    <button @click="onClick">提交</button>     <!-- 事件 -->
    <footer>版权所有</footer>                  <!-- 完全静态 -->
  </div>
</template>`

const compiledSnippet = `import { createElementVNode as _createElementVNode,
         toDisplayString as _toDisplayString,
         normalizeClass as _normalizeClass,
         openBlock as _openBlock,
         createElementBlock as _createElementBlock } from "vue"

// 静态提升：静态 VNode 被提到渲染函数外，模块加载时只创建一次
const _hoisted_1 = _createElementVNode("header", { class: "title" }, "静态标题", -1 /* HOISTED */)
const _hoisted_2 = _createElementVNode("footer", null, "版权所有", -1 /* HOISTED */)

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "page" }, [
    _hoisted_1,                                          // 直接引用，不重新创建
    _createElementVNode("p", {
      class: _normalizeClass(_ctx.theme)
    }, _toDisplayString(_ctx.msg), 3 /* TEXT, CLASS */), // PatchFlag=3：只比文本和 class
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick(...args))
    }, "提交", 8 /* PROPS */, ["onClick"]),              // 事件被缓存进 _cache
    _hoisted_2
  ]))
}`

const patchFlagSnippet = `// PatchFlag 是位标记（bit flags），可按位组合
export const enum PatchFlags {
  TEXT = 1,            // 动态文本内容
  CLASS = 1 << 1,      // 2  动态 class
  STYLE = 1 << 2,      // 4  动态 style
  PROPS = 1 << 3,      // 8  动态普通属性（配合 dynamicProps 数组）
  FULL_PROPS = 1 << 4, // 16 属性含动态 key，需全量 diff
  HYDRATE_EVENTS = 1 << 5,
  STABLE_FRAGMENT = 1 << 6,
  // ...
  HOISTED = -1,        // 静态提升节点：patch 时直接跳过
  BAIL = -2,           // 退出优化模式，回退到全量 diff
}

// 例：PatchFlag = 3 表示 TEXT | CLASS —— 只需比对文本和 class，其余属性全跳过`

const blockSnippet = `// Block：openBlock 开启一个“收集区”，createElementBlock 收尾
// 区内所有带 PatchFlag 的动态子节点会被收集进该 Block 的 dynamicChildren 数组

(_openBlock(), _createElementBlock("div", null, [
  /* 静态子树... 不进 dynamicChildren */
  _createElementVNode("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */),
  _createElementVNode("span", { class: _normalizeClass(_ctx.cls) }, null, 2 /* CLASS */),
]))
// 更新时：渲染器不再递归遍历整棵子树，
// 而是直接拉平遍历 dynamicChildren = [那个 <p>, 那个 <span>]，
// 静态子树被整体跳过。`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们看到，虚拟 DOM 的 diff 本身是有开销的——每次更新都要重新创建 VNode、再逐层比较。
        Vue 3 相比 Vue 2 最大的性能飞跃，不在运行时算法，而在<strong>编译期</strong>：编译器在把模板翻译成
        render 函数时，会<strong>分析出哪些是静态、哪些是动态</strong>，并把这些信息以「静态提升、PatchFlag、
        Block」的形式编码进产物。运行时据此把「全树 diff」降为「只比动态部分」。这一章我们把这三大优化逐个讲透。
      </Lead>

      <h2>一、核心思想：把工作从运行时挪到编译期</h2>
      <p>
        Vue 2 的虚拟 DOM 是<strong>运行时主导</strong>的：它对模板的结构几乎一无所知，更新时只能
        <strong>从根到叶完整遍历</strong>新旧两棵树，挨个比对每个节点的每个属性——哪怕这个节点从头到尾压根不会变。
        模板里 90% 是静态内容时，绝大部分对比都是无用功。
      </p>
      <p>
        Vue 3 换了思路：模板是<strong>高度结构化、可静态分析</strong>的，编译器在编译时就能确定
        「哪些节点永远不变、哪些节点的哪些属性会变」。既然编译期就知道，何必留到运行时一遍遍重算？
        于是 Vue 3 把这份「动静地图」编码进 render 函数，运行时直接照着走捷径。
      </p>
      <KeyIdea>
        Vue 3 编译优化的总纲：<strong>能在编译期算清楚的，绝不留到运行时重复算</strong>。编译器分析出模板的动静结构，
        把它编码成静态提升、PatchFlag 与 Block，运行时据此<strong>只对真正会变的节点做 diff</strong>，跳过所有静态部分。
      </KeyIdea>
      <p>
        下面用一个静态与动态混合的模板贯穿全章。先看源代码，再看它的编译产物，最后逐个拆解里面的三种优化标记。
      </p>
      <CodeBlock lang="vue" title="一个静态 + 动态混合的模板" code={mixedTemplateSnippet} />
      <CodeBlock lang="js" title="它的编译产物（简化，含三大优化）" code={compiledSnippet} />

      <h2>二、静态提升 hoistStatic：静态 VNode 只创建一次</h2>
      <p>
        看上面产物里的 <code>_hoisted_1</code> 和 <code>_hoisted_2</code>：那两个完全静态的
        <code>{'<header>'}</code> 和 <code>{'<footer>'}</code>，被<strong>提升到 render 函数之外</strong>，
        作为模块级常量，在<strong>模块加载时只创建一次</strong>。
      </p>
      <p>
        这一步叫<strong>静态提升（hoistStatic）</strong>。它的意义在于：render 函数每次更新都会被重新调用，
        如果静态 VNode 写在函数体内，那它<strong>每次更新都被重新创建</strong>一遍——纯属浪费。提到函数外后，
        无论 render 被调用多少次，这些静态 VNode 都<strong>复用同一个对象引用</strong>。不仅节省创建开销，
        还让 diff 能用「引用相等」一眼判断「这俩是同一个，无需比较」。
      </p>
      <Example title="静态提升省了什么">
        <p>
          假设组件每秒更新 10 次。没有提升时，每次更新都要 <code>createElementVNode('footer', null, '版权所有')</code>，
          一分钟创建 600 个一模一样的 VNode。提升后，整个生命周期只创建<strong>一个</strong> <code>_hoisted_2</code>，
          其余更新全是引用复用。
        </p>
      </Example>
      <p>
        除了整个 VNode 提升，编译器还会做<strong>静态属性提升</strong>：当一个节点本身动态、但部分属性静态时，
        那组静态 props 对象也会被提到外面单独缓存。
      </p>

      <h2>三、PatchFlag：给动态节点打标记，只比会变的部分</h2>
      <p>
        看产物里那个 <code>{'<p>'}</code> 节点末尾的 <code>3 /* TEXT, CLASS */</code>，以及
        <code>{'<button>'}</code> 末尾的 <code>8 /* PROPS */</code>——这些数字就是 <strong>PatchFlag</strong>。
        它是编译器给<strong>动态节点</strong>打上的标记，精确说明「这个节点<strong>只有什么会变</strong>」。
      </p>
      <p>
        PatchFlag 是一组<strong>位标记（bit flags）</strong>，可按位或组合。运行时 patch 一个带 PatchFlag 的节点时，
        会读取这个标记，<strong>只比对标记指出的那部分</strong>，跳过其余所有属性。比如 <code>3</code> 是
        <code>TEXT | CLASS</code>，意味着「只需比文本和 class，其余 props 一律不看」。
      </p>
      <CodeBlock lang="js" title="PatchFlags 枚举（节选）" code={patchFlagSnippet} />
      <p>
        没有 PatchFlag 的世界（Vue 2），patch 一个节点要遍历它的全部属性逐个对比；有了 PatchFlag，
        Vue 3 直接「按图索骥」——标记说只有文本变，就只 <code>el.textContent = ...</code> 一句，
        class、style、其它属性连看都不看。这把单节点的属性对比成本从「全量」压到了「按需」。
      </p>
      <Callout variant="note" title="HOISTED = -1 与 BAIL = -2">
        负数 PatchFlag 有特殊含义：<code>{'-1 /* HOISTED */'}</code> 标记静态提升节点，patch 时直接跳过；
        <code>{'-2 /* BAIL */'}</code> 表示「该节点情况复杂，放弃优化」，运行时退回到 Vue 2 式的全量 diff
        （例如某些 <code>v-html</code>、动态组件等场景）。
      </Callout>

      <h2>四、Block Tree：把动态节点拉平收集，跳过静态子树</h2>
      <p>
        静态提升和 PatchFlag 优化的是「单个节点」，但还有个问题：要找到那些带 PatchFlag 的动态节点，
        难道不还得<strong>递归遍历整棵树</strong>去找吗？那静态子树不还是被走了一遍？<strong>Block</strong> 就是来解决这个的。
      </p>
      <p>
        看产物里每个区块开头的 <code>{'_openBlock()'}</code> 和 <code>{'_createElementBlock(...)'}</code>。
        <strong>Block</strong> 是一个特殊的 VNode：<code>{'openBlock()'}</code> 开启一个「收集区」，区内所有带
        PatchFlag 的<strong>动态子节点</strong>会被自动收集进这个 Block 的 <code>dynamicChildren</code> 数组里——
        无论它们嵌套多深，都被<strong>拉平</strong>收集到一处。
      </p>
      <CodeBlock lang="js" title="Block 收集 dynamicChildren" code={blockSnippet} />
      <p>
        更新时的妙处来了：渲染器对一个 Block 做 patch，<strong>不再递归遍历它的整棵子树</strong>，而是直接
        <strong>线性遍历 <code>dynamicChildren</code> 这个扁平数组</strong>，逐个 patch 里面的动态节点。
        所有静态子树连进入都不进入——它们根本不在这个数组里。这就把更新的工作量从「树的大小 O(n)」
        降到了「动态节点数量」，而后者通常远小于前者。
      </p>
      <KeyIdea>
        Block Tree 的关键：用 <code>{'openBlock()'}</code> + <code>{'createElementBlock()'}</code> 把整棵子树里的动态节点
        <strong>拉平</strong>收集到 <code>dynamicChildren</code>。更新时只遍历这个扁平数组、跳过全部静态子树——
        这是「全树 diff」降为「只比动态部分」的最后一块拼图。
      </KeyIdea>
      <Callout variant="warn" title="结构会变的指令要单独开 Block">
        <code>v-if</code> / <code>v-for</code> 这类<strong>会改变子节点结构</strong>的指令，会各自开启自己的 Block。
        因为 <code>dynamicChildren</code> 假设结构稳定（节点数量、顺序固定）；结构一旦可变，就需要新的 Block
        来重新界定收集范围，否则拉平的数组会对不上号。
      </Callout>

      <h2>五、事件缓存 cacheHandlers：内联处理器只创建一次</h2>
      <p>
        再看产物里 <code>{'<button>'}</code> 的 onClick：
        <code>{'_cache[0] || (_cache[0] = (...args) => _ctx.onClick(...args))'}</code>。
        这就是<strong>事件缓存（cacheHandlers）</strong>。
      </p>
      <p>
        模板里写 <code>@click="onClick"</code>，编译器本会在每次 render 时<strong>新建一个内联箭头函数</strong>来包装它。
        函数引用每次都变，会被当成「props 变了」从而触发不必要的 patch。开启事件缓存后，编译器把这个处理器
        <strong>缓存进 <code>_cache</code> 数组</strong>：第一次创建并存入，之后每次 render 都复用同一个引用。
        引用稳定，patch 就知道「onClick 没变」，连带这个节点都可能不需要更新——所以你会看到它甚至不带 PatchFlag。
      </p>

      <h2>六、Vue 2 vs Vue 3 更新策略对比</h2>
      <p>
        把四项优化合起来看，Vue 3 与 Vue 2 在「数据变了之后怎么更新视图」上的差别一目了然：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Vue 2</th><th>Vue 3</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>动静分析</td>
            <td>运行时几乎不知道，全凭实时比较</td>
            <td>编译期分析清楚，编码进 render</td>
          </tr>
          <tr>
            <td>更新遍历范围</td>
            <td>从根到叶，全树递归 diff</td>
            <td>只遍历 Block 的 dynamicChildren，跳过静态子树</td>
          </tr>
          <tr>
            <td>静态 VNode</td>
            <td>每次更新都重新创建</td>
            <td>静态提升，只创建一次、引用复用</td>
          </tr>
          <tr>
            <td>单节点属性对比</td>
            <td>遍历全部属性逐个比</td>
            <td>按 PatchFlag 只比会变的属性</td>
          </tr>
          <tr>
            <td>内联事件处理器</td>
            <td>每次 render 新建函数</td>
            <td>cacheHandlers 缓存，引用稳定</td>
          </tr>
          <tr>
            <td>更新成本量级</td>
            <td>约正比于模板节点总数</td>
            <td>约正比于动态节点数量</td>
          </tr>
        </tbody>
      </table>
      <p>
        结论一句话：Vue 2 的成本随<strong>模板总规模</strong>增长，Vue 3 的成本随<strong>动态内容多少</strong>增长。
        模板里静态比例越高，Vue 3 的优势越明显——而真实业务页面里，静态结构往往占大头。
      </p>

      <h2>七、亲手验证：去 Playground 看编译产物</h2>
      <p>
        这些优化标记不用死记。打开官方的 <strong>Vue SFC Playground</strong>，左边写模板，把右上角的输出切到
        <strong>Compiled（编译产物）</strong>视图，就能<strong>实时看到</strong>你的模板被编译成什么样的 render 函数——
        哪些节点被静态提升、哪个动态节点带了什么 PatchFlag、Block 怎么收集 dynamicChildren。
      </p>
      <Callout variant="tip">
        建议动手实验：写一段全静态模板看它被整体提升；再加一个 <code>{'{{ msg }}'}</code> 看出现
        <code>1 /* TEXT */</code>；再加 <code>:class</code> 看 PatchFlag 变成 <code>3</code>；
        加 <code>v-if</code> 看新的 Block 如何被开启。亲眼看一遍，编译优化就不再抽象了。
      </Callout>

      <Summary
        points={[
          'Vue 3 的性能飞跃来自编译期动静分析：能在编译时算清的，绝不留到运行时重复算。',
          '静态提升 hoistStatic：把静态 VNode 提到 render 函数外，模块加载时只创建一次、引用复用，避免每次更新重建。',
          'PatchFlag：给动态节点打位标记（如 1=TEXT、2=CLASS、8=PROPS），patch 时只比对标记指出的部分，跳过其余静态属性。',
          'Block Tree：openBlock + createElementBlock 把子树里的动态节点拉平收集进 dynamicChildren，更新时只遍历这个扁平数组、整体跳过静态子树。',
          '事件缓存 cacheHandlers：把内联事件处理器缓存进 _cache，引用稳定，避免被误判为 props 变化。',
          'Vue 2 更新成本约正比于模板节点总数（全树 diff）；Vue 3 约正比于动态节点数量；可在 Vue SFC Playground 切到 Compiled 视图实时查看编译产物。',
        ]}
      />
    </article>
  )
}
