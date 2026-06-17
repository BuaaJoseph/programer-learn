import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BuildPipeline from '@/courses/frontend-engineering/illustrations/BuildPipeline.jsx'

const installFlow = `# ① 装依赖：读 package.json，把所有包下载到 node_modules，并写/校验 lockfile
pnpm install

# ② 开发：启动开发服务器，带热更新（HMR），改代码即时看到效果
pnpm dev

# ③ 构建：把源码打包、转译、优化成可部署的静态产物，输出到 dist/
pnpm build

# ④ 本地预览构建产物（可选）：用静态服务器跑一遍 dist，确认上线前没问题
pnpm preview`

const viteConfig = `// vite.config.js —— 构建工具的配置入口
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],     // 接入 React：处理 JSX、提供 Fast Refresh
  build: {
    outDir: 'dist',       // 产物输出目录
    sourcemap: true,      // 生成 sourcemap，便于线上排错
  },
  server: {
    port: 5173,           // 开发服务器端口
  },
})`

const ciYaml = `# .github/workflows/ci.yml —— 每次 push / PR 自动跑的流水线
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable
      - run: pnpm install --frozen-lockfile   # 严格按 lockfile 安装
      - run: pnpm lint                         # 代码规范检查
      - run: pnpm test                         # 自动化测试
      - run: pnpm build                        # 构建，确保产物能成功生成`

const dockerfile = `# Dockerfile —— 把构建产物打进 nginx 镜像，部署到任意容器平台
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build                       # 产出 dist/

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们弄清了前端为什么需要工程化。这一章把镜头拉高，俯瞰<strong>整条现代前端工具链</strong>：
        从你敲下 <code>pnpm install</code> 到应用最终跑在用户浏览器里，中间经过了包管理器、构建工具、
        转译器、Linter、测试、CI/CD、部署这一层层环节。我们逐层讲清每一层在干什么、彼此怎么衔接，
        最后把本课各卷在这张全景图上一一定位。
      </Lead>

      <h2>一、先有一张全景图</h2>
      <p>
        现代前端工具链可以理解为一条从「源码」到「线上」的传送带。每一层都有明确职责，下一层接着上一层
        的产出继续加工。把它们按从开发到上线的顺序排开，大致是：
      </p>
      <KeyIdea>
        工具链 = 包管理器 →（构建工具 / 开发服务器内部协调）转译器 → Linter / 格式化 → 测试 →
        CI/CD → 部署。源码从左流到右，每一层只关心自己那一段，组合起来就把「开发体验」和「上线质量」
        两头都照顾到了。
      </KeyIdea>

      <h2>二、逐层拆解</h2>

      <h3>1. 包管理器：npm / pnpm / yarn</h3>
      <p>
        工具链的起点。它读 <code>package.json</code> 里声明的依赖，把所有包及其子依赖下载到
        <code>node_modules</code>，并写下 lockfile 锁定每个包的确切版本，保证「在我机器上能装出来的，
        在 CI 和同事机器上也一模一样」。三者定位相同、命令相近：
      </p>
      <ul>
        <li><strong>npm</strong>：Node 自带，生态最通用，是事实上的基准。</li>
        <li><strong>pnpm</strong>：用全局内容寻址存储 + 硬链接，磁盘占用小、安装快，依赖隔离更严格。</li>
        <li><strong>yarn</strong>：早期以速度和 lockfile 著称，现代版本（Berry）有 PnP 等特性。</li>
      </ul>

      <h3>2. 构建工具 / 开发服务器：Vite / webpack</h3>
      <p>
        工具链的「总调度」。它一身两职：开发时启动<strong>开发服务器</strong>，提供热模块替换（HMR）——
        改一行代码浏览器局部即时更新；生产时执行<strong>构建</strong>，把整个项目打包、转译、优化成静态产物。
        它自己通常不亲自做转译，而是调度下面的转译器和各类插件来完成。
      </p>
      <ul>
        <li><strong>Vite</strong>：开发期基于浏览器原生 ESM + esbuild 预构建，启动近乎瞬时；生产期用 Rollup 打包。现代项目的主流默认。</li>
        <li><strong>webpack</strong>：老牌打包器，生态与插件极其丰富，可配置度高，仍是大量存量项目的基石。</li>
      </ul>
      <CodeBlock lang="js" title="vite.config.js：构建工具的配置入口" code={viteConfig} />

      <h3>3. 转译器：Babel / esbuild / SWC / tsc</h3>
      <p>
        负责「翻译」那一段：把 TS、JSX、新语法变成浏览器能跑的等价 JavaScript。它们通常被构建工具
        作为底层引擎调用，而非单独使用。
      </p>
      <ul>
        <li><strong>Babel</strong>：最经典、插件生态最全的 JS 转译器，可精细控制降级目标。</li>
        <li><strong>esbuild</strong>：用 Go 写的极速转译/打包器，比 Babel 快一两个数量级，是 Vite 开发期的引擎。</li>
        <li><strong>SWC</strong>：用 Rust 写的同类工具，被 Next.js 等采用。</li>
        <li><strong>tsc</strong>：TypeScript 官方编译器，既能转译也能做完整类型检查（转译器们一般只擦类型、不查类型）。</li>
      </ul>

      <h3>4. Linter 与格式化：ESLint / Prettier</h3>
      <p>
        守住代码质量与一致性的那一层，职责互补、各管一摊：
      </p>
      <ul>
        <li><strong>ESLint</strong>：静态分析<strong>代码逻辑与潜在错误</strong>——未使用变量、可疑写法、违反团队规则等。</li>
        <li><strong>Prettier</strong>：只管<strong>代码格式</strong>——缩进、引号、分号、换行，自动统一，不参与逻辑判断。</li>
      </ul>
      <p>
        二者常配合：Prettier 负责格式化，ESLint 负责找问题，分工不重叠。它们既能在编辑器里实时提示，
        也能在提交前通过 git hook 强制执行。
      </p>

      <h3>5. 测试：Vitest / Jest / Playwright</h3>
      <p>
        把验证逻辑固化成可重复运行的脚本，按粒度分几层：
      </p>
      <ul>
        <li><strong>Vitest</strong>：与 Vite 同源、共享配置的现代单元/组件测试框架，速度快。</li>
        <li><strong>Jest</strong>：历史悠久、生态成熟的单元测试框架，存量项目广泛使用。</li>
        <li><strong>Playwright</strong>：端到端（E2E）测试，驱动真实浏览器模拟用户点击、跳转、断言整条流程。</li>
      </ul>

      <h3>6. CI/CD：GitHub Actions</h3>
      <p>
        持续集成 / 持续交付，把上面这些检查自动串起来。每次 <code>push</code> 或提 PR，CI 自动在干净环境里
        装依赖、跑 Lint、跑测试、跑构建，<strong>全绿才允许合并</strong>；CD 则在合并后自动把产物发布到环境。
        它是「靠确定性取代靠人靠运气」最直接的体现。
      </p>
      <CodeBlock lang="yaml" title="GitHub Actions：自动跑 lint / test / build" code={ciYaml} />

      <h3>7. 部署：静态托管 / CDN / Docker</h3>
      <p>
        把 <code>dist/</code> 里的静态产物送到用户面前。SPA 构建出的就是一堆静态文件，部署方式有几类：
      </p>
      <ul>
        <li><strong>静态托管</strong>：Vercel、Netlify、GitHub Pages、对象存储等，上传 <code>dist/</code> 即可。</li>
        <li><strong>CDN</strong>：把静态资源分发到全球边缘节点，就近加速、带 hash 长效缓存。</li>
        <li><strong>Docker</strong>：把产物打进容器镜像（如 nginx），部署到任意容器平台，环境完全自带、可复现。</li>
      </ul>
      <CodeBlock lang="dockerfile" title="Dockerfile：把产物打进 nginx 镜像" code={dockerfile} />

      <h2>三、一个典型项目的全流程</h2>
      <p>
        把工具链串起来跑一遍，一个项目从拉下代码到上线，命令层面就这么几步：
      </p>
      <CodeBlock lang="bash" title="install → dev → build → preview" code={installFlow} />
      <Example title="顺着流程走一遍">
        <p>
          <code>pnpm install</code> 让包管理器装好依赖；<code>pnpm dev</code> 让构建工具起开发服务器，
          你在 HMR 加持下高效开发；写完提交，<strong>CI</strong> 自动跑 Lint + 测试 + 构建把关；
          合并后 <code>pnpm build</code> 产出 <code>dist/</code>，再由<strong>部署</strong>这一层送到
          静态托管 / CDN / 容器上，用户就能访问到了。
        </p>
        <p>
          整条链里，构建（build）这一步内部又是一条更细的流水线——下面这张图把它拆开看。
        </p>
      </Example>
      <BuildPipeline />
      <p>
        构建并不是一个黑盒：从入口出发解析依赖图、逐个转换各类资源、生成并拆分 chunk、做优化、
        最后产出 <code>dist/</code>。理解这条内部流水线，后面看任何打包器的报错和配置都会更有方向感。
      </p>

      <h2>四、工具链分层一览表</h2>
      <p>
        把七层职责、代表工具和它的输入产出列在一起，衔接关系一目了然——每一层的产出正是下一层的输入。
      </p>
      <table>
        <thead>
          <tr><th>层</th><th>代表工具</th><th>职责</th><th>输入 → 产出</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>包管理器</td>
            <td>npm / pnpm / yarn</td>
            <td>装依赖、锁版本</td>
            <td>package.json → node_modules + lockfile</td>
          </tr>
          <tr>
            <td>构建工具 / 开发服务器</td>
            <td>Vite / webpack</td>
            <td>开发 HMR、生产打包优化</td>
            <td>源码 → dev 服务 / dist 产物</td>
          </tr>
          <tr>
            <td>转译器</td>
            <td>Babel / esbuild / SWC / tsc</td>
            <td>TS/JSX/新语法降级翻译</td>
            <td>现代源码 → 浏览器可跑的 JS</td>
          </tr>
          <tr>
            <td>Linter / 格式化</td>
            <td>ESLint / Prettier</td>
            <td>查错 / 统一风格</td>
            <td>源码 → 报告 / 已格式化源码</td>
          </tr>
          <tr>
            <td>测试</td>
            <td>Vitest / Jest / Playwright</td>
            <td>单元 / 组件 / E2E 验证</td>
            <td>代码 + 用例 → 通过 / 失败报告</td>
          </tr>
          <tr>
            <td>CI/CD</td>
            <td>GitHub Actions</td>
            <td>自动跑全套检查与发布</td>
            <td>提交 → 通过则合并 / 部署</td>
          </tr>
          <tr>
            <td>部署</td>
            <td>静态托管 / CDN / Docker</td>
            <td>把产物送到用户面前</td>
            <td>dist → 线上可访问的应用</td>
          </tr>
        </tbody>
      </table>

      <h2>五、本课各卷在这张图的哪个位置</h2>
      <p>
        这张全景图也是本课的路线图。后续每一卷基本对应工具链里的一层或几层，你可以随时回到这里
        看自己学到了链条的哪一段：
      </p>
      <ul>
        <li><strong>本卷（e0 导论）</strong>：为什么要工程化 + 工具链全景，建立全局认知。</li>
        <li><strong>依赖与模块化</strong>：包管理器、lockfile、ES Module 与依赖图。</li>
        <li><strong>构建与转译</strong>：Vite/webpack 的构建原理、转译器、打包优化（即上图那条流水线）。</li>
        <li><strong>代码质量与协作</strong>：ESLint、Prettier、提交规范与 git hook。</li>
        <li><strong>测试</strong>：Vitest / Jest 单元组件测试，Playwright 端到端测试。</li>
        <li><strong>CI/CD 与部署</strong>：GitHub Actions 流水线、静态托管 / CDN / Docker 上线。</li>
      </ul>
      <Callout variant="note" title="层与层之间是「契约」，不是「绑死」">
        每一层只对上一层的产出负责，因此同一层的工具大多可替换：包管理器从 npm 换 pnpm、
        转译器从 Babel 换 SWC、测试从 Jest 换 Vitest，只要产出契约不变，其他层基本无感。
        理解了分层，你换工具时就知道动的是哪一格、会波及谁。
      </Callout>
      <Callout variant="tip">
        不必一上来就背全所有工具的配置。先记住<strong>这条传送带的形状和每层职责</strong>，
        后面学具体某一层时，你永远清楚它在整体里的位置和上下游是谁——这比死记命令重要得多。
      </Callout>

      <Summary
        points={[
          '现代前端工具链是一条从源码到线上的传送带：包管理器 → 构建工具/开发服务器 → 转译器 → Linter/格式化 → 测试 → CI/CD → 部署。',
          '包管理器（npm/pnpm/yarn）装依赖锁版本；构建工具（Vite/webpack）一身两职，开发期 HMR、生产期打包优化。',
          '转译器（Babel/esbuild/SWC/tsc）把 TS/JSX/新语法翻译成浏览器可跑的 JS，通常被构建工具作为底层引擎调用。',
          'ESLint 查逻辑错误、Prettier 统一格式；Vitest/Jest 做单元组件测试、Playwright 做端到端测试。',
          'CI/CD（GitHub Actions）每次提交自动跑 lint/test/build，全绿才合并；部署经静态托管/CDN/Docker 把 dist 送到用户面前。',
          '典型流程：install → dev → build → preview/部署；层与层之间是契约关系，同层工具大多可替换，本课各卷正是逐层展开这张全景图。',
        ]}
      />
    </article>
  )
}
