import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const dynamicImportSnippet = `// 静态导入：构建时就被打进当前 chunk，首屏一定会下载、解析、执行
import Chart from './Chart.js'

// 动态导入：返回一个 Promise，构建工具会把它拆成独立 chunk，
// 只有真正执行到这行代码时才发请求下载。这就是「按需加载」。
async function openDashboard() {
  const { Chart } = await import('./Chart.js')
  const chart = new Chart()
  chart.render()
}`

const routeSplitSnippet = `// 路由级分包：每个页面组件用动态 import 包一层，
// 框架（React.lazy / Vue defineAsyncComponent）就会为每条路由生成独立 chunk。
import { lazy } from 'react'

const Home = lazy(() => import('./pages/Home.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Report = lazy(() => import('./pages/Report.jsx'))

// 访问 /home 只下载 Home 的 chunk，
// /settings、/report 的代码在用户没去之前一字节都不会下载。`

const viteChunkSnippet = `// vite.config.js —— 手动分包，把第三方依赖与业务代码分开
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 函数式 manualChunks：按模块路径决定它该进哪个 chunk
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 把体积大、更新慢的库各自单独成包，便于长效缓存
            if (id.includes('echarts')) return 'vendor-echarts'
            if (id.includes('lodash')) return 'vendor-lodash'
            return 'vendor' // 其余第三方统一进 vendor
          }
        },
      },
    },
  },
})`

const sideEffectsSnippet = `// package.json —— 声明本包「无副作用」，给 Tree Shaking 开绿灯
{
  "name": "my-utils",
  "module": "dist/index.esm.js",
  "sideEffects": false
}

// 如果个别文件确有副作用（例如全局样式、polyfill），用数组精确标注，
// 这些文件即使没被引用也不会被摇掉：
{
  "sideEffects": ["*.css", "./src/polyfill.js"]
}`

const treeShakingSnippet = `// utils.js —— ESM 的导出是静态的，构建工具能在「编译期」分析依赖图
export function used() { return 1 }
export function unused() { return 2 } // 没人 import，会被摇掉

// main.js
import { used } from './utils.js'
console.log(used())

// 打包后 unused 整个消失。
// 对比 CommonJS：module.exports 是运行时的普通对象，
// 可以被动态改写（module.exports[key] = ...），
// 构建工具无法静态确定哪些导出没被用到，因此 CJS 难以 Tree Shaking。`

const hashSnippet = `# 构建产物文件名带 contenthash（内容哈希）
dist/assets/index-a1b2c3d4.js      # 业务入口
dist/assets/vendor-9f8e7d6c.js     # 第三方依赖
dist/assets/Report-5c4b3a2f.js     # 按需加载的路由 chunk

# 内容不变 -> hash 不变 -> 浏览器命中强缓存，不再发请求。
# 改了业务代码、没动依赖 -> 只有 index 的 hash 变，vendor 仍可复用缓存。`

const minifyConfigSnippet = `// vite 默认用 esbuild 压缩（极快）；想要更激进可换 terser
export default defineConfig({
  build: {
    minify: 'esbuild',     // 或 'terser'（压得更狠但更慢），或 false 关闭
    terserOptions: {
      compress: {
        drop_console: true,  // 删掉所有 console.*
        drop_debugger: true, // 删掉 debugger 语句
      },
    },
  },
})`

const gzipSnippet = `# 传输层压缩通常在服务器 / CDN 上开启（nginx 示例）
gzip on;
gzip_types text/javascript application/javascript text/css application/json;
gzip_min_length 1024;

# brotli 压缩率比 gzip 更高，现代浏览器普遍支持，推荐优先
brotli on;
brotli_types text/javascript application/javascript text/css;

# 注意：minify 是「改源码本身」，gzip/brotli 是「传输时临时压缩」，
# 二者叠加生效，不是二选一。`

export default function Ch1() {
  return (
    <article>
      <Lead>
        构建产物是用户真正下载到浏览器里的东西。同样一份源码，优化得好不好，
        直接决定首屏是「秒开」还是「转圈三秒」。这一章我们讲透产物瘦身的四大支柱——
        <strong>代码分割</strong>、<strong>Tree Shaking</strong>、<strong>压缩</strong>、
        <strong>长效缓存</strong>，把每个手段的原理、配置与边界都掰开说清楚。
      </Lead>

      <h2>一、为什么产物体积这么要命</h2>
      <p>
        前端代码从服务器到「能用」要走三步：<strong>下载</strong>（受网络带宽限制）、
        <strong>解析</strong>（浏览器把 JS 文本解析成可执行代码）、<strong>执行</strong>
        （跑初始化逻辑、构建 DOM）。这三步全都和体积正相关——产物越大，每一步越慢。
      </p>
      <p>
        最直接的痛点在<strong>首屏</strong>：用户打开页面到看见内容的那段时间，浏览器很可能正卡在
        「下载 + 解析」一大坨 JS 上。移动端尤其残酷：4G 网络带宽有限，中低端手机 CPU 解析 JS 也慢，
        一个 2MB 的 bundle 在桌面端可能无感，到了手机上就是肉眼可见的白屏。
      </p>
      <KeyIdea>
        JS 的代价不只是「下载流量」。同样大小，图片下载完顶多慢点显示，而 JS 下载完还要
        <strong>解析 + 编译 + 执行</strong>，会占用主线程、阻塞渲染。所以「少发一点 JS」
        几乎总是性价比最高的优化。
      </KeyIdea>
      <p>
        理解了这一点，下面四个手段的目标就统一了：<strong>让用户在最需要的时刻，
        只下载当下真正用得到的、压缩过的、能长期缓存的最少字节</strong>。
      </p>

      <h2>二、代码分割：不要把所有代码塞进一个文件</h2>
      <p>
        默认情况下，打包工具会顺着入口的依赖图把所有代码合并成一个大文件（bundle）。
        代码分割（code splitting）就是把这个大文件<strong>切成多个 chunk</strong>，
        让浏览器按需、分批下载，而不是一上来就吞下全部。
      </p>

      <h3>1）动态 import() 拆出按需 chunk</h3>
      <p>
        静态 <code>import</code> 会在构建时被打进当前 chunk，首屏必下；而动态
        <code>{'import()'}</code> 返回一个 Promise，构建工具看到它就会把对应模块
        <strong>拆成独立 chunk</strong>，只有代码执行到那一行时才真正发请求。这是代码分割的语法基石。
      </p>
      <CodeBlock lang="js" title="静态 import vs 动态 import()" code={dynamicImportSnippet} />
      <Example title="什么时候该用动态 import">
        <p>
          一个后台管理系统里有个「导出 Excel」按钮，依赖一个 300KB 的表格库。
          90% 的用户从不点它。把这个库用动态 <code>{'import()'}</code> 包起来，
          只有真正点按钮时才下载——首屏直接省下 300KB。这就是「按需加载」的典型收益。
        </p>
      </Example>

      <h3>2）路由级分包</h3>
      <p>
        单页应用最自然的切分边界就是<strong>路由</strong>：用户一次只看一个页面，没必要把所有页面的代码
        一起下载。把每个页面组件用动态 import 包一层，框架就会为每条路由生成独立 chunk。
      </p>
      <CodeBlock lang="js" title="React 路由级分包" code={routeSplitSnippet} />

      <h3>3）提取公共依赖（vendor chunk）</h3>
      <p>
        第三方库（React、lodash、echarts……）有两个特点：<strong>体积大</strong>、
        <strong>更新慢</strong>。把它们从业务代码里抽出来单独成包，好处是缓存友好——
        你天天改业务代码，但只要依赖版本没动，用户浏览器里那份 vendor chunk 就一直命中缓存，
        不用重复下载。这一步通常通过手动分包配置完成。
      </p>
      <CodeBlock lang="js" title="Vite / Rollup 手动分包（manualChunks）" code={viteChunkSnippet} />
      <Callout variant="warn" title="分包不是越碎越好">
        chunk 切得太细会带来反效果：每个 chunk 都是一次 HTTP 请求，请求过多会增加往返开销，
        也会削弱压缩率（小文件压不动）。目标是<strong>合理分层</strong>——把稳定的大依赖、
        按需的功能、首屏必需的核心各归各位，而不是把每个模块都拆开。
      </Callout>

      <h2>三、Tree Shaking：摇掉没用到的导出</h2>
      <p>
        Tree Shaking（摇树）指构建工具在打包时<strong>删除从未被引用的导出</strong>，
        就像摇晃一棵树让枯叶掉落。它的前提是构建工具能在编译期「看清」整张依赖图——而这恰恰是
        <strong>ESM（ES Module）</strong>才具备的能力。
      </p>
      <KeyIdea>
        Tree Shaking 靠的是 ESM 的<strong>静态结构</strong>：<code>import</code> /
        <code>export</code> 只能写在模块顶层、模块名必须是字符串字面量，因此构建工具在
        <strong>不运行代码</strong>的前提下就能静态分析出「谁导出了什么、谁用到了什么」，
        把没人用的导出安全删掉。
      </KeyIdea>
      <CodeBlock lang="js" title="ESM 可被静态分析，CJS 不行" code={treeShakingSnippet} />
      <p>
        为什么 <strong>CommonJS（CJS）难以 Tree Shaking</strong>？因为 CJS 的
        <code>module.exports</code> 本质是一个<strong>运行时的普通对象</strong>，
        可以被动态地增删属性、可以 <code>{'require()'}</code> 一个变量拼出来的路径。
        构建工具无法在编译期确定它最终长什么样，只能保守地<strong>整包保留</strong>，
        不敢删任何东西。所以发布库时应优先提供 ESM 版本。
      </p>

      <h3>sideEffects 标记：告诉构建工具「删了也安全」</h3>
      <p>
        有些模块即使没被显式引用，import 它这个动作本身也会产生<strong>副作用</strong>——
        比如注册全局样式、打 polyfill、改全局变量。构建工具不敢贸然删这类模块。
        <code>package.json</code> 里的 <code>sideEffects</code> 字段就是用来澄清这一点的。
      </p>
      <CodeBlock lang="js" title="package.json 的 sideEffects 标记" code={sideEffectsSnippet} />
      <p>
        <code>{'"sideEffects": false'}</code> 意味着「本包所有文件都没副作用，没被引用的尽管删」；
        若个别文件确有副作用，就用数组精确列出，避免误删。库作者正确声明这个字段，
        能让使用方的 Tree Shaking 摇得更干净。
      </p>

      <h2>四、压缩：把字节数再砍一刀</h2>
      <p>
        分割和摇树解决的是「打不打进来」，压缩解决的是「同样的内容能不能用更少字节表达」。
        压缩分两层，<strong>叠加生效</strong>，不是二选一。
      </p>

      <h3>1）minify：在构建阶段改写源码</h3>
      <p>
        minify（代码压缩）发生在构建时，由 <strong>terser</strong> 或 <strong>esbuild</strong>
        这类工具完成。它做的事包括：去掉空白与换行、把长变量名缩短成
        <code>a</code> / <code>b</code>、删除死代码（dead code，永远执行不到的分支）、
        合并表达式等。产出的代码功能完全等价，但体积小得多、也更难读（这恰好顺带做了点混淆）。
      </p>
      <CodeBlock lang="js" title="配置 minify（esbuild / terser）" code={minifyConfigSnippet} />
      <p>
        Vite 默认用 <strong>esbuild</strong> 压缩，速度极快、收益已经很好；
        <strong>terser</strong> 压得更彻底（比如更激进的删 console、更聪明的死代码消除），
        但慢一些。多数项目用默认 esbuild 即可，对体积极度敏感时再换 terser。
      </p>

      <h3>2）传输层压缩：gzip / brotli</h3>
      <p>
        minify 后的文件传输时还能再压一道。服务器或 CDN 用 <strong>gzip</strong> 或
        <strong>brotli</strong> 算法把响应体临时压缩，浏览器收到后自动解压。
        brotli 压缩率通常比 gzip 高 15%~25%，现代浏览器普遍支持，应优先启用。
      </p>
      <CodeBlock lang="bash" title="服务器开启 gzip / brotli（nginx）" code={gzipSnippet} />
      <Callout variant="tip" title="minify 和 gzip 的分工">
        minify 是<strong>改源码本身</strong>（产物文件就是压缩后的样子），gzip/brotli 是
        <strong>传输时临时压缩</strong>（落到硬盘的还是 minify 后的文本）。前者构建时做一次，
        后者每次请求做。二者叠加，一个 1MB 的源码可能 minify 到 300KB、再 brotli 到 90KB 传给浏览器。
      </Callout>

      <h2>五、长效缓存：文件名带 contenthash</h2>
      <p>
        前面所有努力都是为了「少下载」，而<strong>最好的下载就是不下载</strong>——直接命中浏览器缓存。
        实现长效缓存的关键技巧是给产物文件名加上 <strong>contenthash</strong>（内容哈希）。
      </p>
      <KeyIdea>
        文件名里的 hash 由<strong>文件内容</strong>算出：内容不变则 hash 不变，浏览器命中强缓存、
        一字节都不再请求；内容一改 hash 就变，文件名随之改变，浏览器视为新文件去下载。
        这让我们可以放心地把静态资源设置成「永久缓存」，又不必担心更新发不出去。
      </KeyIdea>
      <CodeBlock lang="bash" title="带 contenthash 的产物文件名" code={hashSnippet} />
      <p>
        这也正是上文「把 vendor 单独分包」的价值所在：你改了业务代码，只有
        <code>index-xxxx.js</code> 的 hash 会变，<code>vendor-xxxx.js</code> 的 hash 不变，
        用户浏览器里那份依赖缓存继续复用，省下重复下载。<strong>分包 + contenthash</strong>
        是一对天然搭档。
      </p>

      <h2>六、手段对比：什么时候用什么</h2>
      <table>
        <thead>
          <tr>
            <th>手段</th><th>解决的问题</th><th>生效阶段</th><th>关键前提 / 注意</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>代码分割</td><td>首屏不必下载全部代码</td><td>构建 + 运行时按需</td>
            <td>需动态 <code>{'import()'}</code>；别切太碎</td>
          </tr>
          <tr>
            <td>Tree Shaking</td><td>删除未引用的导出</td><td>构建期静态分析</td>
            <td>依赖 ESM；正确声明 <code>sideEffects</code></td>
          </tr>
          <tr>
            <td>minify</td><td>等价改写、压缩源码</td><td>构建期</td>
            <td>esbuild 快 / terser 狠</td>
          </tr>
          <tr>
            <td>gzip / brotli</td><td>传输时再压一道</td><td>服务器 / CDN 响应时</td>
            <td>与 minify 叠加；brotli 优先</td>
          </tr>
          <tr>
            <td>contenthash 缓存</td><td>命中缓存、零下载</td><td>构建命名 + 浏览器缓存</td>
            <td>配合分包，缓存粒度才合理</td>
          </tr>
        </tbody>
      </table>

      <h2>七、边界与常见误区</h2>
      <p>
        <strong>不要为优化而优化</strong>。一个小项目首屏才 200KB，强行拆十几个 chunk 只会让请求数飙升、
        反而更慢。先用数据说话——下一章我们会讲怎么用产物分析工具找到真正的体积大头，再对症下药。
      </p>
      <p>
        <strong>Tree Shaking 不是万能的</strong>。若依赖发布的是 CJS、或副作用标注不当、
        或你写了 <code>{'import * as _ from "lodash"'}</code> 这种全量引入，摇树都会失效。
        体积没降下来时，先排查是不是这些原因。
      </p>
      <p>
        <strong>动态 import 也有代价</strong>。按需加载意味着用户点击那一刻要等一次网络请求，
        可能出现短暂的加载态。对「很可能马上用到」的资源，可以配合预加载（下一章讲 modulepreload）
        提前拉取，平衡「省首屏」与「点了不卡」。
      </p>

      <Callout variant="tip">
        下一章进入「性能分析与 Web 指标优化」：先用 visualizer 看清产物体积构成，
        再认识 Core Web Vitals（LCP / CLS / INP），把本章学到的优化手段对准真正的瓶颈落地。
      </Callout>

      <Summary
        points={[
          '产物体积同时影响下载、解析、执行三步，JS 的代价远大于同体积的图片，少发 JS 通常性价比最高。',
          '代码分割：用动态 import() 拆按需 chunk、做路由级分包、把大而稳定的第三方依赖提取成 vendor chunk；但别切太碎。',
          'Tree Shaking 靠 ESM 的静态结构在编译期摇掉未引用的导出；CJS 因导出是运行时对象难以摇树；用 package.json 的 sideEffects 标记给摇树开绿灯。',
          '压缩分两层并叠加：minify（terser/esbuild）在构建期改写源码、删死代码；gzip/brotli 在传输时再压一道，brotli 优先。',
          '长效缓存靠文件名带 contenthash：内容不变 hash 不变可命中强缓存，配合 vendor 分包让缓存粒度合理。',
          '别为优化而优化，先测后改；警惕 CJS、全量引入、副作用误标导致 Tree Shaking 失效，以及按需加载带来的加载态。',
        ]}
      />
    </article>
  )
}
