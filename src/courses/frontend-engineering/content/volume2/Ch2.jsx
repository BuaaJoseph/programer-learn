import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const webpackConfigSnippet = `// webpack.config.js —— 配置较重，但能力最全
module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/dist',
    filename: '[name].[contenthash].js',
  },
  module: {
    rules: [
      // loader：把各种资源“翻译”成 webpack 能处理的模块
      { test: /\\.css$/,  use: ['style-loader', 'css-loader'] },
      { test: /\\.(png|svg)$/, type: 'asset/resource' },
      { test: /\\.jsx?$/, use: 'babel-loader', exclude: /node_modules/ },
    ],
  },
  plugins: [
    // plugin：介入打包生命周期，做更复杂的事
    // new HtmlWebpackPlugin(), new MiniCssExtractPlugin(), ...
  ],
}`

const rollupConfigSnippet = `// rollup.config.js —— 面向库打包，产物干净
export default {
  input: 'src/index.js',
  output: [
    // 库通常同时产出多种格式，供不同消费者使用
    { file: 'dist/lib.esm.js', format: 'es' },   // 给现代打包器，可 Tree Shaking
    { file: 'dist/lib.cjs.js', format: 'cjs' },  // 给 Node / 老环境
    { file: 'dist/lib.umd.js', format: 'umd', name: 'MyLib' }, // 给 <script>
  ],
  external: ['react'],   // 把 peer 依赖排除在产物外，不重复打包
}`

const esbuildSnippet = `// 用 esbuild 的 JS API 做一次极快的打包/转译
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/out.js',
})
// 同样的活，esbuild 常比 JS 写的工具快 10～100 倍
// 但它聚焦“转译 + 基础打包”，不做复杂的代码分割与精细产物控制`

const swcSnippet = `// SWC：用 Rust 写的转译器，定位是“更快的 Babel”
// .swcrc
{
  "jsc": {
    "parser": { "syntax": "ecmascript", "jsx": true },
    "transform": { "react": { "runtime": "automatic" } }
  }
}
// Next.js 等已用 SWC 取代 Babel 做 JS/TS/JSX 转译`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们看到 Vite 的「dev 用 ESM、prod 用 Rollup」双引擎，并顺带认识了 esbuild。
        但构建工具的世界远不止 Vite——webpack 仍是无数存量项目的基石，Rollup 是库作者的首选，
        esbuild 与 SWC 把「快」推到极致，Turbopack、Rolldown 又在酝酿下一代。这一章我们把
        <strong>webpack / Rollup / esbuild</strong> 三大主力放在一起多维对比，捎带讲清 SWC 与新趋势，
        最后给出一套「我该选谁」的决策思路。
      </Lead>

      <h2>一、为什么要懂这些工具的差异</h2>
      <p>
        它们的名字常被混着提，但定位其实大不相同：有的是<strong>打包器（bundler）</strong>——
        负责把一堆模块组织成可部署产物（webpack、Rollup）；有的本质是<strong>转译器（transpiler）</strong>
        ——负责把 TS/JSX/新语法翻成目标 JS（SWC，部分 esbuild 用法）；esbuild 则既能转译也能做基础打包。
        分不清这点，就容易问出「用 esbuild 还是 webpack」这种其实没法直接对比的问题。
      </p>
      <KeyIdea>
        选型的第一性问题不是「哪个最快」，而是「我在打包<strong>应用</strong>还是<strong>库</strong>，
        我需要的是<strong>极致 dev 体验</strong>、<strong>干净的产物</strong>，还是<strong>庞大的生态兼容</strong>」。
        速度只是众多维度之一，而且对大多数应用而言，dev 体验 + 生态 往往比构建快几秒更重要。
      </KeyIdea>

      <h2>二、webpack：最成熟、最全能、也最重</h2>
      <p>
        webpack 是上一时代的统治者，它的核心抽象是<strong>「一切皆模块」</strong>：JS、CSS、图片、字体、
        甚至 Wasm，都能通过 <strong>loader</strong> 被「翻译」成模块纳入依赖图，再通过 <strong>plugin</strong>
        介入打包生命周期做更复杂的事。这套 loader + plugin 机制造就了它<strong>无与伦比的生态</strong>——
        几乎任何资源、任何需求都有现成方案。
      </p>
      <CodeBlock lang="js" title="webpack 配置：loader + plugin" code={webpackConfigSnippet} />
      <p>
        代价是<strong>配置较重、心智负担高</strong>，且它本身用 JS 写、采用打包式 dev server，
        大项目启动慢（上一章讲过的痛点正是它）。但它擅长<strong>复杂应用打包</strong>：成熟的代码分割、
        模块联邦（Module Federation，做微前端）、对各种古怪资源的处理能力，至今仍是很多大型存量项目
        离不开它的原因。
      </p>

      <h2>三、Rollup：面向库，产物最干净</h2>
      <p>
        Rollup 从一开始就<strong>ESM 优先</strong>，主打打包<strong>库（library）</strong>。它的 Tree Shaking
        是同类里最强的之一，产物结构干净、没有多余运行时包裹，非常适合发布给别人用的包。Vite 的生产
        引擎正是它（见上一章）。
      </p>
      <CodeBlock lang="js" title="Rollup 配置：一份源码输出多种格式" code={rollupConfigSnippet} />
      <p>
        库打包的典型需求——同时输出 ESM / CJS / UMD 多种格式、用 <code>external</code> 排除 peer 依赖、
        产物里不带一堆框架样板——Rollup 都做得很自然。它在「复杂应用」场景（大量动态资源、热更新体验）
        不如 webpack 全面，但「打一个干净的库」这件事上，它是首选。
      </p>

      <h2>四、esbuild：Go 写的、极快、功能聚焦</h2>
      <p>
        esbuild 用 <strong>Go</strong> 编写、原生多线程，速度常比 JS 写的工具快一到两个数量级。它的角色
        是做<strong>转译与依赖预构建</strong>这类对速度极敏感的活——Vite 的依赖预构建和生产压缩都用它。
      </p>
      <CodeBlock lang="js" title="esbuild 的 JS API" code={esbuildSnippet} />
      <p>
        但 esbuild 是<strong>功能聚焦</strong>的：它<strong>不做复杂的代码分割</strong>、产物精细控制和插件
        能力都不如 Rollup/webpack 成熟。所以业界的普遍用法不是「用 esbuild 取代一切」，而是「把 esbuild
        塞进流水线里负责最吃速度的环节」，复杂打包仍交给 Rollup。
      </p>
      <Callout variant="warn" title="别误把 esbuild 当 webpack 的替代品">
        esbuild 极快，但它刻意不追求功能全面。需要模块联邦、复杂 chunk 策略、丰富 loader 生态时，
        它不是合适的选择——快和全，是两个不同的目标。
      </Callout>

      <h2>五、SWC 与新趋势一句话</h2>
      <p>
        <strong>SWC</strong>：用 <strong>Rust</strong> 写的转译器，定位是「<strong>更快的 Babel</strong>」——
        把 TS/JSX/新语法翻成目标 JS，Next.js 等已用它替代 Babel。它解决的是「转译」而非「打包」。
      </p>
      <CodeBlock lang="js" title="SWC 配置示意（.swcrc）" code={swcSnippet} />
      <p>
        <strong>Turbopack</strong>（Vercel，Rust，定位 webpack 的继任者）与 <strong>Rolldown</strong>
        （Rust 重写的 Rollup，将成为 Vite 未来的统一底层引擎）代表同一个趋势：<strong>用 Rust/Go
        把构建工具的核心重写一遍，换取数量级的速度提升，并尝试统一 dev 与 prod 两套引擎</strong>。
        方向已明朗，落地仍在进行中。
      </p>

      <h2>六、一条主线：构建工具为什么会「越来越多」</h2>
      <p>
        理解这些工具的演化，有一条清晰主线：<strong>每一代工具都在解决上一代暴露出的痛点</strong>。
        把时间线捋一遍，选型时就不会被名字淹没。
      </p>
      <ul>
        <li>
          <strong>第一阶段·能打包就行</strong>：早期浏览器没有模块系统，Browserify、早期 webpack
          解决的是「把分散的 JS 模块合并成浏览器能跑的一个文件」这个最基本的需求。
        </li>
        <li>
          <strong>第二阶段·什么都能打包</strong>：webpack 用 loader/plugin 把能力做到极致，CSS、图片、
          字体统统纳入依赖图，配合 Babel 处理新语法，成为事实标准——代价是配置复杂、构建变慢。
        </li>
        <li>
          <strong>第三阶段·产物要干净</strong>：库作者发现 webpack 产物臃肿，Rollup 以 ESM 优先 +
          强 Tree Shaking 接管「打库」场景，产出无样板的干净代码。
        </li>
        <li>
          <strong>第四阶段·速度要快</strong>：项目越来越大，JS 写的工具速度见顶。esbuild（Go）、
          SWC（Rust）用系统级语言重写核心，把转译/打包速度拉高一两个数量级。
        </li>
        <li>
          <strong>第五阶段·开发体验与统一</strong>：Vite 用「dev 用 ESM、prod 用 Rollup」组合出极致
          dev 体验；Turbopack、Rolldown 则试图用 Rust 重写、并<strong>统一 dev 与 prod 的引擎</strong>，
          消除上一章提到的「双引擎差异」隐患。
        </li>
      </ul>
      <Callout variant="tip" title="一句话记住演化逻辑">
        能打包 → 什么都能打包 → 产物要干净 → 速度要快 → 体验要好且引擎要统一。每个新工具都是对前一阶段
        某个痛点的回应，而不是凭空多出来的「轮子」。
      </Callout>

      <h2>七、loader 与 plugin：webpack 生态的两块基石</h2>
      <p>
        要理解「为什么 webpack 生态这么难被取代」，得分清它的两个扩展点：
      </p>
      <ul>
        <li>
          <strong>loader（加载器）</strong>：作用在<strong>单个文件</strong>上，把非 JS 资源「翻译」成
          webpack 能理解的模块。比如 <code>css-loader</code> 让你能 <code>import './a.css'</code>，
          <code>babel-loader</code> 把 JSX/新语法转成普通 JS。loader 是<strong>链式</strong>执行的，
          从右到左依次处理。
        </li>
        <li>
          <strong>plugin（插件）</strong>：作用在<strong>整个打包生命周期</strong>上，能力更宽。比如
          <code>HtmlWebpackPlugin</code> 自动生成注入了脚本的 HTML，<code>DefinePlugin</code> 注入环境变量。
          plugin 通过监听 webpack 暴露的钩子（hooks）介入构建的各个阶段。
        </li>
      </ul>
      <p>
        十多年沉淀下来的海量 loader 与 plugin，正是 webpack 最深的护城河——这也是为什么即便它更慢、
        配置更重，大型存量项目仍难以彻底迁出。值得一提的是，<strong>Rollup 与 Vite 共享一套插件接口</strong>，
        所以 Vite 能复用 Rollup 的插件生态，这是它当年快速起势的一个隐性助力。

      </p>

      <h2>八、四者多维对比</h2>
      <table>
        <thead>
          <tr>
            <th>维度</th><th>webpack</th><th>Rollup</th><th>esbuild</th><th>SWC</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>打包器</td><td>打包器</td><td>打包器 + 转译器</td><td>转译器</td></tr>
          <tr><td>语言</td><td>JS</td><td>JS</td><td>Go</td><td>Rust</td></tr>
          <tr><td>速度</td><td>较慢</td><td>中等</td><td>极快</td><td>极快</td></tr>
          <tr><td>最擅长</td><td>复杂应用、各种资源</td><td>库打包、干净产物</td><td>转译、依赖预构建</td><td>替代 Babel 做转译</td></tr>
          <tr><td>Tree Shaking</td><td>支持</td><td>很强</td><td>基础</td><td>不适用</td></tr>
          <tr><td>代码分割</td><td>成熟</td><td>成熟</td><td>较弱</td><td>不适用</td></tr>
          <tr><td>生态</td><td>最庞大</td><td>较丰富（Vite 复用）</td><td>聚焦、较少</td><td>聚焦</td></tr>
          <tr><td>配置复杂度</td><td>高</td><td>中</td><td>低</td><td>低</td></tr>
        </tbody>
      </table>

      <h2>九、我该选谁：按场景决策</h2>
      <Example title="决策建议（按场景对号入座）">
        <ul>
          <li>
            <strong>做一个新应用、想要最好的 dev 体验</strong> → 直接用 <strong>Vite</strong>
            （dev 用 ESM/esbuild，prod 用 Rollup），无需纠结底层。
          </li>
          <li>
            <strong>发布一个 npm 库 / 组件库</strong> → 用 <strong>Rollup</strong>（或封装它的
            tsup / unbuild），产物干净、多格式输出、Tree Shaking 强。
          </li>
          <li>
            <strong>大型存量应用、依赖模块联邦或大量定制 loader/plugin</strong> →
            继续用 <strong>webpack</strong>，它的生态和复杂打包能力暂时无可替代。
          </li>
          <li>
            <strong>只想要一个极快的转译/打包步骤（脚本、CLI、内部工具）</strong> →
            用 <strong>esbuild</strong>；若只需把 TS/JSX 翻成 JS（不打包）→ 用 <strong>SWC</strong>。
          </li>
          <li>
            <strong>追新、愿意尝鲜下一代</strong> → 关注 <strong>Turbopack / Rolldown</strong>，
            但生产关键项目建议等其更稳定。
          </li>
        </ul>
      </Example>
      <p>
        三个最关键的判断维度，记住它们基本就能做对选择：① <strong>应用还是库</strong>——库优先 Rollup，
        应用优先 Vite/webpack；② <strong>是否需要极致 dev 体验</strong>——是则 Vite；③ <strong>生态需求</strong>
        ——离不开 webpack 特有能力（如模块联邦、某些专有 loader）就留在 webpack。
      </p>
      <Callout variant="tip">
        实务上，今天绝大多数<strong>新应用</strong>直接选 Vite 即可，你几乎不用直接面对 Rollup 或 esbuild
        ——它们已被 Vite 封装在底层。真正需要你「亲自选底层工具」的，往往是<strong>发库</strong>、
        <strong>维护老项目</strong>，或<strong>写内部构建脚本</strong>这三类场景。
      </Callout>

      <Summary
        points={[
          'webpack：最成熟、loader/plugin 生态最庞大，擅长复杂应用与各种资源，但配置重、dev 启动慢。',
          'Rollup：面向库打包，ESM 优先、产物干净、Tree Shaking 强，是 Vite 的生产引擎，库作者首选。',
          'esbuild：Go 编写、极快，做转译与依赖预构建，但功能聚焦、不做复杂代码分割，常作为流水线的提速环节。',
          'SWC 是 Rust 写的转译器（更快的 Babel）；Turbopack / Rolldown 代表用 Rust 重写核心、统一 dev/prod 的下一代趋势。',
          '选型三维度：应用还是库、是否要极致 dev 体验、生态需求；多数新应用直接用 Vite，发库用 Rollup，存量复杂应用留在 webpack。',
        ]}
      />
    </article>
  )
}
