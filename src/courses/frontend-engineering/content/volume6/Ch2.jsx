import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const visualizerSnippet = `// vite.config.js —— 接入 rollup-plugin-visualizer 生成产物分析图
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html', // 构建后生成可视化报告
      open: true,                  // 构建完自动打开浏览器
      gzipSize: true,              // 同时显示 gzip 后的大小（更接近真实传输量）
      brotliSize: true,            // 显示 brotli 后大小
      template: 'treemap',         // treemap / sunburst / network
    }),
  ],
})

// 运行 npm run build 后，打开 dist/stats.html，
// 矩形面积 = 模块体积，一眼看出谁是体积大头。`

const externalsSnippet = `// 把大库交给 CDN，不打进产物（externals）
export default defineConfig({
  build: {
    rollupOptions: {
      // 告诉构建工具：vue 由外部提供，不要打包
      external: ['vue'],
      output: {
        // 运行时 window.Vue 即为这个外部依赖
        globals: { vue: 'Vue' },
      },
    },
  },
})

// 同时在 index.html 里用 CDN 引入对应的全局变量：
// <script src="https://cdn.example.com/vue.global.prod.js"></script>`

const onDemandSnippet = `// 按需引入：只导入用到的部分，让 Tree Shaking 生效
// ❌ 全量引入，整个 lodash 都被打进来
import _ from 'lodash'
_.debounce(fn, 300)

// ✅ 只引入 debounce，构建工具只打包这一个函数
import debounce from 'lodash-es/debounce'
debounce(fn, 300)

// ❌ 整包引入组件库样式与组件
import ElementPlus from 'element-plus'
// ✅ 配合 unplugin 自动按需引入，只打包用到的组件`

const preloadSnippet = `<!-- modulepreload：提前并行拉取「马上要用」的 chunk，消除瀑布等待 -->
<link rel="modulepreload" href="/assets/Report-5c4b3a2f.js" />

<!-- preload 关键资源（首屏字体 / 首图） -->
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />

<!-- 懒加载：非首屏图片用原生 loading=lazy，滚动到可视区才下载 -->
<img src="/below-fold.jpg" loading="lazy" alt="..." />`

const lcpImgSnippet = `// 优化 LCP：首屏最大元素（常是主图）要尽快可见
// 1. 用现代格式 + 响应式尺寸，别让手机下载 4000px 的大图
<img
  src="/hero-800.avif"
  srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1600.avif 1600w"
  sizes="(max-width: 600px) 400px, 800px"
  fetchpriority="high"   // 告诉浏览器优先下载这张
  width="800" height="450"  // 显式宽高，避免布局偏移
  alt="hero"
/>`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们把优化手段一个个学过了，但「该用哪个、用在哪」不能靠拍脑袋。这一章讲
        <strong>先分析、再优化</strong>：用产物分析工具找到真正的体积大头，再针对性下手；
        然后把目光从「构建产物」转向「运行时体验」，认识 <strong>Core Web Vitals</strong>
        这套用户真实感受的度量，以及它们各自的工程化优化方向。
      </Lead>

      <h2>一、先分析再优化：别凭感觉砍代码</h2>
      <KeyIdea>
        优化的第一步永远是<strong>测量</strong>。你以为最大的依赖，可能根本不是;真正吃掉体积的，
        往往是某个被全量引入的工具库、或被重复打包的同名依赖。先看清产物构成，再决定动哪一刀，
        这样每一分优化精力都花在刀刃上。
      </KeyIdea>
      <p>
        产物分析工具会把打包结果画成可视化图——每个模块占多大面积一目了然。Rollup / Vite 生态用
        <strong>rollup-plugin-visualizer</strong>，Webpack 生态用 <strong>webpack-bundle-analyzer</strong>，
        二者思路相同：构建后生成一张 treemap，矩形面积等于模块体积。
      </p>
      <CodeBlock lang="js" title="接入 rollup-plugin-visualizer" code={visualizerSnippet} />
      <Callout variant="tip" title="要看 gzip 后的大小">
        原始体积会吓人，但用户实际下载的是 gzip / brotli 压缩后的字节。分析时开启
        <code>gzipSize</code>，以压缩后大小为准排序，才不会被「文本很长但压缩率极高」的库误导。
      </Callout>

      <h3>分析图里要找的三类「体积大头」</h3>
      <ul>
        <li>
          <strong>大依赖</strong>：单个第三方库占了产物一大块（如 moment、整包 lodash、整个图表库）。
          这类是替换 / 按需引入的首要目标。
        </li>
        <li>
          <strong>重复打包</strong>：同一个库的多个版本被打进来（比如直接依赖和某个插件的间接依赖版本不同），
          导致同样的代码出现好几份。可通过统一依赖版本解决。
        </li>
        <li>
          <strong>未摇掉的代码</strong>：本以为会被 Tree Shaking 删掉、却仍然存在的导出。
          多半是全量引入、CJS 依赖或副作用标注不当造成的（见上一章）。
        </li>
      </ul>

      <h2>二、产物优化手段：对症下药</h2>
      <h3>1）替换大库</h3>
      <p>
        最立竿见影的优化常常是换掉一个臃肿的库。经典案例：<code>moment</code>（含全部时区与本地化，
        体积庞大且不可摇树）换成 <code>day.js</code>（API 相似但只有几 KB），首屏直接瘦一大圈。
        遇到分析图里的大头，先问一句：有没有更轻的替代品？
      </p>

      <h3>2）按需引入</h3>
      <p>
        很多库的体积问题不在库本身，而在<strong>引入方式</strong>。整包 <code>import</code>
        会让 Tree Shaking 失效，把用不到的部分也带进来。改成只引入用到的子模块（或借助按需引入插件），
        体积往往断崖式下降。
      </p>
      <CodeBlock lang="js" title="全量引入 vs 按需引入" code={onDemandSnippet} />

      <h3>3）externals / CDN</h3>
      <p>
        对 Vue、React 这类几乎每个页面都要的稳定大库，可以用 <strong>externals</strong>
        把它们排除出打包，改由 <strong>CDN</strong> 提供。好处是：产物更小、构建更快、
        多个站点能共享 CDN 上同一份缓存。代价是多了一个外部依赖与网络请求，需自行兜底可用性。
      </p>
      <CodeBlock lang="js" title="externals 把大库交给 CDN" code={externalsSnippet} />

      <h3>4）分包策略</h3>
      <p>
        结合上一章的 <code>manualChunks</code>，把稳定的大依赖单独成包、配合 contenthash 长效缓存，
        让用户在版本迭代中尽量复用已下载的依赖。分析图能帮你判断哪些模块该归一组。
      </p>

      <h3>5）预加载与懒加载的权衡</h3>
      <p>
        代码分割省了首屏，但点击那一刻要等下载。<strong>modulepreload</strong> 可以在浏览器空闲时
        提前并行拉取「很可能马上用到」的 chunk，消除点击后的瀑布等待;反过来，
        对「未必用到」的资源则用<strong>懒加载</strong>推迟下载。两者是一对相反的杠杆，按概率取舍。
      </p>
      <CodeBlock lang="bash" title="modulepreload / preload / lazy" code={preloadSnippet} />
      <Callout variant="warn" title="preload 别滥用">
        把什么都标成 preload，等于没有优先级——会和首屏关键资源抢带宽，反而拖慢真正要紧的东西。
        只对「首屏必需且会被晚发现」的资源（如关键字体、首图、下一步极可能用到的路由 chunk）用它。
      </Callout>

      <h2>三、运行时性能：Core Web Vitals</h2>
      <p>
        产物体积是「下载成本」，但用户体验好不好还要看页面在浏览器里<strong>跑起来</strong>的表现。
        Google 提出的 <strong>Core Web Vitals（核心 Web 指标）</strong>用三个可量化指标，
        分别刻画「加载、视觉稳定、交互响应」三种真实感受。
      </p>
      <KeyIdea>
        Core Web Vitals 的价值在于<strong>以用户真实感受为锚</strong>：不是看「JS 多大」这种间接量，
        而是直接量「主内容多久出现」「画面跳不跳」「点了多久才有反应」。优化最终要落到这几个数上。
      </KeyIdea>

      <h3>LCP — Largest Contentful Paint（最大内容绘制）</h3>
      <p>
        衡量<strong>加载速度</strong>：从开始加载到视口内<strong>最大的内容元素</strong>
        （通常是主图或大标题）渲染完成的时间。良好阈值约 <strong>2.5 秒</strong>以内。
        工程化优化方向：拆 JS / 减少阻塞渲染的脚本、优化关键资源加载顺序、
        对主图用现代格式 + 响应式尺寸 + <code>fetchpriority</code> 优先下载、用 CDN 缩短首字节时间。
      </p>
      <CodeBlock lang="js" title="优化 LCP 主图" code={lcpImgSnippet} />

      <h3>CLS — Cumulative Layout Shift（累积布局偏移）</h3>
      <p>
        衡量<strong>视觉稳定性</strong>：页面加载过程中元素意外位移的累积程度。良好阈值约
        <strong>0.1</strong> 以内。最常见的「跳一下」来自：图片没写宽高、字体加载后撑开文字、
        广告 / 异步内容插进来把下面顶走。优化方向：给图片和媒体显式声明
        <code>width</code> / <code>height</code>（或用 aspect-ratio 占位）、为异步内容预留空间、
        谨慎处理字体切换。
      </p>

      <h3>INP — Interaction to Next Paint（交互到下一次绘制）</h3>
      <p>
        衡量<strong>交互响应</strong>，它在 2024 年取代了旧的 FID，成为正式的核心指标。
        INP 度量用户交互（点击、输入、按键）后，页面到下一帧绘制的延迟，反映「点了之后卡不卡」。
        良好阈值约 <strong>200 毫秒</strong>以内。卡顿的根因通常是<strong>长任务阻塞主线程</strong>——
        一大段 JS 同步执行时，浏览器没空响应交互。优化方向：拆分长任务、把重计算放到
        Web Worker、减少首屏一次性执行的 JS（又回到了拆 JS）。
      </p>

      <h2>四、指标到优化手段对照</h2>
      <table>
        <thead>
          <tr>
            <th>指标</th><th>含义</th><th>良好阈值</th><th>主要工程化手段</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LCP</td><td>最大内容元素绘制完成时间（加载）</td><td>&lt; 2.5s</td>
            <td>拆 JS、图片优化（格式/尺寸/fetchpriority）、CDN、preload 关键资源</td>
          </tr>
          <tr>
            <td>CLS</td><td>累积布局偏移（视觉稳定）</td><td>&lt; 0.1</td>
            <td>图片显式宽高、为异步内容预留空间、稳妥处理字体切换</td>
          </tr>
          <tr>
            <td>INP</td><td>交互到下一次绘制延迟（响应）</td><td>&lt; 200ms</td>
            <td>拆分长任务、Web Worker、减少首屏一次性执行的 JS</td>
          </tr>
        </tbody>
      </table>
      <p>
        注意一个共性：<strong>拆 JS / 减少首屏 JS</strong> 几乎同时利好 LCP 和 INP——这再次印证了
        上一章「少发 JS 性价比最高」的结论。还有<strong>骨架屏</strong>这类手段：它不直接改这三个数，
        但能在内容到位前给用户一个「正在加载」的视觉反馈，改善主观体感，常与上述优化搭配使用。
      </p>

      <h2>五、用 Lighthouse 度量</h2>
      <p>
        <strong>Lighthouse</strong> 是度量这些指标最常用的工具，内置在 Chrome DevTools 的
        Lighthouse 面板里，也可用 CLI / CI 集成。它会给出性能、可访问性等评分，并列出
        LCP / CLS 等指标的实测值与<strong>具体改进建议</strong>（如「移除阻塞渲染的资源」「为图片显式尺寸」）。
      </p>
      <Example title="一次典型的分析—优化闭环">
        <p>
          1. 跑 Lighthouse，发现 LCP 高达 4.8s，建议提示「主图过大、有阻塞脚本」。<br />
          2. 跑 visualizer，看到某图表库占了产物近一半，且它只在二级页面用到。<br />
          3. 动手：主图换 AVIF + 响应式尺寸 + <code>fetchpriority="high"</code>；
          图表库改成路由级动态 <code>{'import()'}</code> 拆出。<br />
          4. 再跑 Lighthouse 验证 LCP 降到 2.1s。<strong>测—改—再测</strong>，形成闭环。
        </p>
      </Example>
      <Callout variant="warn" title="实验室数据 ≠ 真实用户">
        Lighthouse 给的是<strong>实验室数据</strong>（固定网络与设备模拟），方便复现和调试;
        但真实用户分布在各种网络和机型上。重要项目应同时采集<strong>真实用户监测（RUM）</strong>
        数据，两者结合判断，避免只在「理想环境」里跑分好看。
      </Callout>

      <Summary
        points={[
          '优化前先测量：用 rollup-plugin-visualizer / webpack-bundle-analyzer 把产物画成 treemap，并以 gzip 后大小排序。',
          '分析图重点找三类体积大头：大依赖、重复打包（同库多版本）、未被摇掉的代码。',
          '产物优化手段：替换大库（moment→dayjs）、按需引入、externals/CDN、分包策略，以及 modulepreload 预加载与懒加载的概率权衡。',
          'Core Web Vitals 以用户真实感受为锚：LCP（加载，<2.5s）、CLS（视觉稳定，<0.1）、INP（交互响应，<200ms，已取代 FID）。',
          '优化方向：LCP 拆 JS + 图片优化，CLS 显式宽高 + 预留空间，INP 拆长任务 + Web Worker；骨架屏改善体感；拆 JS 同时利好 LCP 与 INP。',
          '用 Lighthouse 度量并拿到改进建议，形成「测—改—再测」闭环；注意实验室数据需结合真实用户监测（RUM）一起看。',
        ]}
      />
    </article>
  )
}
