import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const slowBundleSnippet = `# 传统打包式 dev server 的体感（项目越大越明显）
$ npm run dev

  Building entry chunk...        # 必须先把整个依赖图打成 bundle
  [############----------] 58%   # 几千个模块全部走一遍编译 + 打包
  ...
  Server ready in 32.4 s         # 启动就要等半分钟

# 改一个文件 → 重新构建受影响的 bundle → 等几百毫秒甚至几秒才热更`

const viteStartSnippet = `# Vite 的体感：不打包，直接起一个静态服务器 + 按需编译
$ npm run dev

  VITE v6.0.0  ready in 312 ms   # 近乎瞬时，几乎与项目大小无关

  ->  Local:   http://localhost:5173/
  ->  Network: use --host to expose

# 浏览器请求哪个模块，Vite 才编译哪个模块（单文件转换）`

const nativeEsmSnippet = `<!-- 浏览器原生 ESM：<script type="module"> 让浏览器自己发起 import 请求 -->
<script type="module" src="/src/main.js"></script>

// /src/main.js —— 浏览器看到 import 就再发一个请求去取 counter.js
import { setupCounter } from '/src/counter.js'
import './style.css'

setupCounter(document.querySelector('#app'))

// 关键点：模块依赖关系由“浏览器按需 import”驱动，
// 没被某个页面用到的模块，dev 阶段根本不会被编译。`

const preBundleSnippet = `# 启动时 Vite 用 esbuild 对 node_modules 里的第三方依赖做“预构建”
$ npm run dev

  Pre-bundling dependencies:
    react
    react-dom
    lodash-es
  (this will be run only when your dependencies change)

# 产物缓存到 node_modules/.vite/deps/ ，下次直接命中缓存`

const viteConfigSnippet = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 1) 插件：扩展能力，react 插件负责 JSX 转换与 Fast Refresh
  plugins: [react()],

  // 2) base：部署时的公共基础路径，部署到子目录时要改
  //    例如部署到 https://cdn.example.com/app/ 就写 '/app/'
  base: '/',

  // 3) 开发服务器
  server: {
    port: 5173,
    open: true,                 // 启动自动开浏览器
    proxy: {                    // 把 /api 代理到后端，绕开跨域
      '/api': 'http://localhost:8080',
    },
  },

  // 4) build：生产构建走 Rollup，这里配产物相关选项
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {            // 直接透传给底层 Rollup
      output: {
        manualChunks: {         // 手动代码分割：把 react 单独拆一个 chunk
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})`

const buildSnippet = `# 生产构建：这一步 Vite 切换到 Rollup
$ npm run build

  vite v6.0.0 building for production...
  ✓ 134 modules transformed.
  dist/index.html                   0.46 kB
  dist/assets/index-a1b2c3.css      8.21 kB │ gzip:  2.10 kB
  dist/assets/vendor-d4e5f6.js    142.30 kB │ gzip: 45.70 kB   # 手动拆出的 vendor
  dist/assets/index-g7h8i9.js      24.18 kB │ gzip:  9.02 kB
  ✓ built in 1.84s`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Vite 在几年里几乎重写了前端开发者对「dev server 启动速度」的预期：以前大项目 npm run dev
        要等半分钟，现在常常几百毫秒就绪。它凭什么这么快？答案藏在一个略显「分裂」的设计里——
        <strong>开发用一套引擎、生产用另一套引擎</strong>。这一章我们讲透 Vite 的核心洞察、
        它在 dev 阶段如何利用浏览器原生 ESM 做到不打包按需编译、为什么还要用 esbuild 预构建依赖，
        以及为什么生产环境仍然要打包、并且选了 Rollup。
      </Lead>

      <h2>一、先理解痛点：传统打包式 dev server 为什么慢</h2>
      <p>
        在 Vite 之前，主流做法（以 webpack 为代表）是<strong>打包式（bundle-based）开发服务器</strong>：
        启动 dev server 时，工具会从入口文件出发，沿着 <code>import</code> 关系把<strong>整个应用</strong>
        的所有模块都遍历、编译、再打包成一个（或几个）bundle，然后才把这个 bundle 交给浏览器。
        换句话说，<em>你要先「构建完整个应用」才能开始开发</em>。
      </p>
      <p>
        这套机制在小项目上没问题，但它有一个致命的扩展性问题：<strong>启动时间随项目规模线性增长</strong>。
        项目里的模块越多、依赖越深，每次冷启动要编译和打包的东西就越多。大型项目里，
        启动一次 dev server 要等十几秒甚至几十秒，是很常见的体验。
      </p>
      <CodeBlock lang="bash" title="传统打包式 dev server 的启动体感" code={slowBundleSnippet} />
      <p>
        热更新（HMR）也受牵连：改一个文件，工具要重新构建受影响的 bundle 区块，项目越大、
        关联越复杂，这个「改完到看到效果」的延迟就越明显。开发体验随着项目长大而持续变差，
        这就是 Vite 想解决的核心问题。
      </p>

      <h2>二、核心洞察：开发阶段「根本不用打包」</h2>
      <KeyIdea>
        现代浏览器早已原生支持 ES Modules（<code>{'<script type="module">'}</code> + <code>import</code>）。
        既然浏览器自己会按 <code>import</code> 关系去请求模块，那么 dev 阶段就没必要由工具提前把整个应用
        打包好——让浏览器按需 import，工具只在「某个模块被请求到」时才<strong>单文件即时编译</strong>它。
        这就是 Vite 快的根本原因。
      </KeyIdea>
      <p>
        Vite 把模块分成两类区别对待：你自己的<strong>源码</strong>（业务代码、含 JSX/TS/Vue 等需要转换的语法），
        以及 <code>node_modules</code> 里的<strong>第三方依赖</strong>。对源码，Vite 不打包，
        而是起一个原生 ESM 的开发服务器：浏览器请求 <code>/src/main.js</code>，Vite 现场把它转换成
        浏览器能跑的标准 JS 再返回；浏览器解析到里面的 <code>import './counter.js'</code>，
        又发一个新请求，Vite 再现场转换 <code>counter.js</code>……
      </p>
      <CodeBlock lang="js" title="浏览器原生 ESM 驱动模块请求" code={nativeEsmSnippet} />
      <p>
        这带来两个直接好处。其一，<strong>启动近乎瞬时</strong>：启动时几乎不做编译工作，
        只把首屏真正用到的少数模块即时转换一下，启动时间几乎与项目总规模脱钩。其二，
        <strong>HMR 极快且稳定</strong>：改一个文件，只需让浏览器重新拉这一个模块，
        无关模块完全不动，所以热更新速度基本是个常数，不会随项目长大而变慢。
      </p>
      <Example title="按需编译到底「按需」在哪">
        <p>
          假设项目有 2000 个模块，但你正在开发的页面只用到其中 40 个。传统打包式服务器启动时
          要把 2000 个全部处理一遍；Vite 只在浏览器实际 <code>import</code> 到那 40 个时才逐个转换，
          剩下 1960 个在你没访问到对应页面之前<strong>一行都不碰</strong>。这就是「按需、单文件转换」。
        </p>
      </Example>

      <h2>三、为什么还需要 esbuild「依赖预构建」</h2>
      <p>
        纯靠原生 ESM 有两个现实障碍，Vite 用一个叫<strong>依赖预构建（dependency pre-bundling）</strong>
        的步骤来解决，执行者是 <strong>esbuild</strong>（用 Go 写的极快打包/转译器）。
      </p>
      <ul>
        <li>
          <strong>问题一：CommonJS / UMD 不是 ESM。</strong> 很多老牌 npm 包仍以 CJS（
          <code>{'module.exports'}</code>）发布，浏览器的原生 ESM 不认。预构建会把它们
          <strong>转换成 ESM</strong>，浏览器才能 <code>import</code>。
        </li>
        <li>
          <strong>问题二：模块太碎、请求爆炸。</strong> 像 <code>lodash-es</code> 这种包可能由几百个
          小文件组成，若每个都让浏览器单独发请求，会瞬间产生上百个 HTTP 请求拖慢页面。
          预构建会把这些零碎文件<strong>合并成少数几个</strong>，大幅减少请求数。
        </li>
      </ul>
      <CodeBlock lang="bash" title="启动时的依赖预构建" code={preBundleSnippet} />
      <p>
        预构建只对 <code>node_modules</code> 里的依赖做（它们不常变），产物缓存在
        <code>node_modules/.vite/deps/</code>。只要依赖没变化，下次启动直接命中缓存，无需重做——
        所以你平时启动看到的 312ms，多数情况下是连预构建都跳过了的。
      </p>
      <Callout variant="tip" title="为什么预构建用 esbuild 而不是 Rollup">
        预构建追求的是「快」，而不是「产物极致优化」。esbuild 用 Go 编写、原生多线程，
        转译/打包速度比 JS 写的工具快一两个数量级，正好适合放在启动这种对延迟敏感的环节。
      </Callout>

      <h2>四、双引擎：dev 与 prod 为什么不一样</h2>
      <p>
        到这里你可能会问：dev 不打包这么爽，<strong>生产环境直接也不打包不行吗</strong>？不行。
        原生 ESM 在生产环境会带来「请求瀑布」问题——一个深层依赖图意味着浏览器要发起大量串行
        请求，网络往返叠加起来，首屏会非常慢。生产环境恰恰需要把代码<strong>打包、压缩、合并</strong>，
        减少请求数、做 Tree Shaking 删掉死代码、按路由做代码分割。
      </p>
      <p>
        于是 Vite 采取了「双引擎」策略：<strong>开发用浏览器原生 ESM + esbuild 转换</strong>，
        <strong>生产用 Rollup 打包</strong>。这也是 Vite 设计里最需要理解的一点。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>开发（dev）引擎</th><th>生产（prod）引擎</th></tr>
        </thead>
        <tbody>
          <tr><td>核心机制</td><td>浏览器原生 ESM，不打包</td><td>Rollup 打包成静态产物</td></tr>
          <tr><td>编译/转换工具</td><td>esbuild（极快，单文件按需转换）</td><td>Rollup（+ esbuild 做压缩）</td></tr>
          <tr><td>启动/构建速度</td><td>近乎瞬时，与项目规模基本无关</td><td>较慢，需遍历整个依赖图</td></tr>
          <tr><td>目标</td><td>开发体验：快启动、快 HMR</td><td>产物质量：小体积、少请求、可控</td></tr>
          <tr><td>Tree Shaking</td><td>不需要（不打包）</td><td>需要，删除未使用代码</td></tr>
          <tr><td>代码分割</td><td>不需要</td><td>需要，按路由/vendor 拆 chunk</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="双引擎的代价：dev 与 prod 可能存在差异">
        因为两套引擎不同，理论上存在「dev 跑得好好的，build 后行为不一致」的风险（例如某些
        只在打包后才暴露的副作用、依赖被 Tree Shaking 误删等）。所以上线前<strong>务必跑一次
        <code>vite build</code> + <code>vite preview</code></strong> 验证生产产物，别只信 dev。
      </Callout>

      <h2>五、生产为什么选 Rollup</h2>
      <p>
        Vite 生产环境选用 <strong>Rollup</strong> 而非 esbuild 或 webpack，原因在于 Rollup 在
        「产出干净的应用/库产物」这件事上最成熟、最可控：
      </p>
      <ul>
        <li>
          <strong>更可控的产物</strong>：Rollup 的输出结构清晰，配合 <code>rollupOptions</code>
          能精细控制 chunk 划分、文件命名、输出格式。
        </li>
        <li>
          <strong>强 Tree Shaking</strong>：Rollup 以 ESM 静态分析见长，能较彻底地删除未被使用的导出，
          产物体积更小。
        </li>
        <li>
          <strong>成熟的代码分割</strong>：支持动态 <code>import()</code> 自动拆包，也支持
          <code>manualChunks</code> 手动把第三方库拆成独立 vendor chunk，利于缓存。
        </li>
      </ul>
      <p>
        esbuild 虽快，但在复杂代码分割、产物精细控制上还不如 Rollup 成熟（详见下一章对比），
        所以 Vite 把 esbuild 用在「快」最重要的预构建与压缩环节，把 Rollup 用在「产物质量」
        最重要的生产打包环节——各取所长。
      </p>
      <CodeBlock lang="bash" title="生产构建输出（走 Rollup）" code={buildSnippet} />

      <h2>六、vite.config 基础</h2>
      <p>
        配置文件是 <code>vite.config.js</code>（或 <code>.ts</code>），用 <code>defineConfig</code>
        包一层能拿到类型提示。下面这份配置覆盖了最常用的四块：<code>plugins</code>、<code>base</code>、
        <code>server</code>、<code>build</code>。
      </p>
      <CodeBlock lang="js" title="vite.config.js 基础配置" code={viteConfigSnippet} />
      <table>
        <thead>
          <tr><th>字段</th><th>作用</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td><code>plugins</code></td><td>扩展能力，兼容 Rollup 插件生态</td><td>react / vue 转换、SVG 内联、旧浏览器兼容</td></tr>
          <tr><td><code>base</code></td><td>部署的公共基础路径</td><td>部署到子目录或 CDN 时改非 <code>{'/'}</code></td></tr>
          <tr><td><code>server</code></td><td>dev server 配置</td><td>端口、自动打开、<code>proxy</code> 解决跨域</td></tr>
          <tr><td><code>build</code></td><td>生产构建（透传 Rollup）</td><td><code>outDir</code>、<code>sourcemap</code>、<code>manualChunks</code></td></tr>
        </tbody>
      </table>
      <p>
        一个值得记住的细节：Vite 的插件接口<strong>兼容 Rollup 插件</strong>。这意味着 Rollup
        庞大的插件生态可以直接复用，这也是 Vite 当初选 Rollup 做生产引擎的一个连带好处。
      </p>

      <h2>七、边界与注意点</h2>
      <p>
        Vite 并非银弹，几个边界值得心里有数：
      </p>
      <ul>
        <li>
          <strong>首次访问大页面可能有「请求瀑布」</strong>：dev 阶段不打包，若一个页面依赖很深，
          首次打开会看到大量模块请求。这是 dev 的正常现象，不影响生产（生产已打包）。
        </li>
        <li>
          <strong>依赖预构建偶尔需要手动干预</strong>：动态导入的依赖、monorepo 里的本地包，
          有时不会被自动发现，需要在 <code>optimizeDeps.include</code> 里显式声明。
        </li>
        <li>
          <strong>dev/prod 差异</strong>：如第四节强调，上线前要用 <code>vite preview</code> 验产物。
        </li>
        <li>
          <strong>极老旧浏览器</strong>：dev 依赖原生 ESM，需现代浏览器；生产产物可用
          <code>@vitejs/plugin-legacy</code> 兼容旧环境。
        </li>
      </ul>

      <Callout variant="tip">
        下一章我们把视角拉开，横向对比 webpack、Rollup、esbuild（以及 SWC、Turbopack/Rolldown
        这些趋势），并给出「应用还是库、要不要极致 dev 体验、生态需求多重」三个维度下的选型建议。
      </Callout>

      <Summary
        points={[
          '传统打包式 dev server 必须先打包整个应用才能启动，启动与 HMR 速度随项目规模线性变差。',
          'Vite 的核心洞察：dev 阶段利用浏览器原生 ESM 不打包，浏览器 import 哪个模块才编译哪个，单文件按需转换，启动近乎瞬时、HMR 快。',
          'Vite 用 esbuild 做依赖预构建：把 CJS/UMD 转成 ESM，并把零碎文件合并以减少请求，产物缓存到 node_modules/.vite/deps。',
          '生产仍要打包以避免请求瀑布，Vite 选 Rollup：产物更可控、Tree Shaking 强、代码分割成熟，且插件生态可复用。',
          'Vite 是双引擎设计：dev 用 ESM+esbuild、prod 用 Rollup；二者机制不同，上线前需用 vite build + vite preview 验证。',
          'vite.config 四大常用块：plugins（扩展，兼容 Rollup 插件）、base（部署路径）、server（端口/代理）、build（透传 Rollup 选项）。',
        ]}
      />
    </article>
  )
}
