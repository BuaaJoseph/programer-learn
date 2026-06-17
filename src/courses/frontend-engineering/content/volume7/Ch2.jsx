import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const nginxSnippet = `# /etc/nginx/conf.d/app.conf —— 自托管 SPA 的最小配置
server {
  listen 80;
  server_name example.com;
  root /usr/share/nginx/html;   # dist 拷到这里
  index index.html;

  # 关键：前端路由刷新不 404
  # 找不到对应文件就回退到 index.html，交给前端路由接管
  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # 带 hash 的静态资源：长缓存 + immutable
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # index.html 永不缓存，保证用户总能拿到最新入口
  location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
}`

const dockerfileSnippet = `# Dockerfile —— 多阶段构建
# ---------- 阶段一：构建 ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 先只拷依赖清单，利用 Docker 层缓存：源码变了也不必重装依赖
COPY package*.json ./
RUN npm ci

# 再拷源码并构建
COPY . .
RUN npm run build           # 产物落在 /app/dist

# ---------- 阶段二：运行 ----------
FROM nginx:alpine
# 只把第一阶段的 dist 拷进来，node / node_modules 统统不要
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`

const dockerBuildSnippet = `# 构建镜像并本地跑起来验证
docker build -t my-spa:latest .
docker run --rm -p 8080:80 my-spa:latest
# 浏览器打开 http://localhost:8080
# 刷新任意前端路由都不会 404，说明 try_files 生效

# 看看镜像多大：多阶段构建后通常只有几十 MB（基于 nginx:alpine）
docker images my-spa`

const envSnippet = `# .env.production —— 构建期注入，VITE_ 前缀才会被打进产物
VITE_API_BASE=https://api.example.com
VITE_APP_ENV=prod

# 代码里这样读（构建时被静态替换为字面量）
# const base = import.meta.env.VITE_API_BASE`

const multiEnvBuildSnippet = `# 不同环境用不同的 mode，对应不同的 .env.[mode] 文件
npm run build -- --mode staging    # 读 .env.staging
npm run build -- --mode production # 读 .env.production

# package.json 里也可以预置好脚本
# "build:staging": "vite build --mode staging",
# "build:prod":    "vite build --mode production"`

const deployJobSnippet = `# 续上一章的 ci.yml，新增一个部署 job
  deploy:
    needs: build                 # 构建绿了才部署
    if: github.ref == 'refs/heads/main'   # 只在 main 上部署
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 取回构建产物
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist

      - name: 部署到静态托管
        run: npx vercel deploy --prod --token \${{ secrets.VERCEL_TOKEN }}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        CI 把代码验证好、构建成 <code>dist/</code>，最后一步是让用户真正访问到它——<strong>部署</strong>。
        前端构建产物本质上是一堆静态文件（HTML / JS / CSS / 图片），部署方式因此也比后端轻得多。
        这一章我们把三条主流路线讲清：静态托管平台（零运维）、自托管 Nginx + Docker（可控）、
        以及贯穿其中的 CDN 与缓存、多环境变量，最后把它接回 CI，并回顾整条工程化链路。
      </Lead>

      <h2>一、SPA 的部署本质：发布一堆静态文件</h2>
      <p>
        现代前端项目（Vite / React 等）<code>build</code> 之后得到的 <code>dist/</code> 里，
        是一个 <code>index.html</code> 加若干带哈希名的 JS / CSS / 资源文件。
        所谓「部署」，就是把这堆文件放到一个能通过 HTTP 访问的地方。
        没有常驻的应用进程，因此部署既简单又便宜——但 SPA 有一个绕不过去的坑：<strong>前端路由刷新</strong>，
        后面会专门讲。
      </p>
      <KeyIdea>
        前端部署 = 把静态产物放到能被 HTTP 访问的位置。
        三条路线：托管平台帮你全包（零运维）、自己用 Nginx / Docker 起服务（可控）、
        再叠加 CDN 做全球加速与缓存。选哪条，取决于你要多少控制权与多少运维成本。
      </KeyIdea>

      <h2>二、路线一：静态托管平台（推荐起步）</h2>
      <p>
        Vercel、Netlify、Cloudflare Pages 这类平台是上手最快的选择：你把仓库连上去，
        告诉它「构建命令是 <code>npm run build</code>、产物目录是 <code>dist</code>」，剩下的全自动。它们的共同卖点：
      </p>
      <ul>
        <li><strong>零运维</strong>：不用管服务器、Nginx、证书、扩容，平台全包了，还自带全球 CDN。</li>
        <li><strong>自动 CI</strong>：每次 <code>git push</code> 自动拉代码、构建、上线，不用自己写流水线也能跑。</li>
        <li>
          <strong>预览部署（preview deploy）</strong>：每个 PR 自动得到一个独立 URL，
          reviewer 点开就能看到这次改动的<strong>真实运行效果</strong>，再也不用「拉下来本地跑」。
        </li>
        <li><strong>自动回退</strong>：每次部署都是不可变版本，出问题一键回滚到上一个。</li>
      </ul>
      <Callout variant="tip" title="SPA 路由它们也帮你兜住了">
        这些平台默认知道你是 SPA，会自动把找不到的路径回退到 <code>index.html</code>
        （或让你在配置里声明一条 <code>/* → /index.html</code> 的 rewrite）。
        所以「刷新 404」的坑在托管平台上基本不用操心——但自托管时就得自己配，见第四节。
      </Callout>

      <h2>三、路线二：自托管 Nginx</h2>
      <p>
        当你需要完全的控制权（内网部署、合规要求、特殊网络），就自己用 Nginx 托管 <code>dist/</code>。
        Nginx 作为静态文件服务器又快又稳，配置也不复杂——但有一处对 SPA 至关重要的设置必须做对。
      </p>

      <h2>四、SPA 路由刷新 404 与 try_files</h2>
      <p>
        SPA 只有一个真实的 <code>index.html</code>，<code>/about</code>、<code>/user/42</code>
        这些路径都是<strong>前端路由</strong>在浏览器里虚构出来的，磁盘上并不存在对应文件。
        在首页点链接跳过去没问题（路由在前端切换）；但用户<strong>直接刷新</strong> <code>/about</code> 时，
        浏览器会拿着这个路径去问服务器，Nginx 一看磁盘上没有 <code>/about</code> 这个文件——<strong>返回 404</strong>。
      </p>
      <p>
        解法是告诉 Nginx：找不到对应文件时，别报 404，<strong>回退到 <code>index.html</code></strong>，
        把路由交给前端 JS 接管。这就是 <code>try_files</code> 的作用。
      </p>
      <CodeBlock lang="nginx" title="Nginx 配置：try_files 回退 + 缓存策略" code={nginxSnippet} />
      <p>
        核心那一行 <code>try_files $uri $uri/ /index.html;</code> 的含义是：
        依次尝试「这个文件」「这个目录」，都没有就返回 <code>/index.html</code>。
        静态资源（真实存在的 JS / CSS）正常命中，虚拟路由则统一落到入口页，404 问题就此根治。
      </p>

      <h2>五、路线三补强：Docker 多阶段构建</h2>
      <p>
        自托管时通常把应用打成 Docker 镜像，便于在任意机器上一致地跑起来。但直接把整个
        Node 项目塞进镜像会很臃肿（<code>node_modules</code> 动辄上百 MB，运行时根本用不到）。
        正确做法是<strong>多阶段构建</strong>：第一阶段用 node 镜像构建，第二阶段用极小的
        nginx 镜像只拷构建产物。
      </p>
      <CodeBlock lang="dockerfile" title="多阶段构建的 Dockerfile" code={dockerfileSnippet} />
      <p>
        关键在 <code>COPY --from=builder /app/dist ...</code>：最终镜像只继承第二阶段，
        第一阶段的 node 和 <code>node_modules</code> 全被丢弃。最后产出的镜像基于
        <code>nginx:alpine</code>，通常只有几十 MB，启动快、攻击面也小。
      </p>
      <CodeBlock lang="bash" title="构建并本地验证镜像" code={dockerBuildSnippet} />
      <table>
        <thead>
          <tr><th>对比</th><th>单阶段（直接塞）</th><th>多阶段</th></tr>
        </thead>
        <tbody>
          <tr><td>镜像内容</td><td>node + node_modules + 源码 + 产物</td><td>nginx + dist</td></tr>
          <tr><td>镜像体积</td><td>数百 MB ~ 1 GB+</td><td>几十 MB</td></tr>
          <tr><td>运行时</td><td>多余的构建工具一并带上</td><td>只剩静态服务器</td></tr>
          <tr><td>安全面</td><td>大（带编译链）</td><td>小</td></tr>
        </tbody>
      </table>

      <h2>六、CDN 与缓存：让访问又快又新</h2>
      <p>
        CDN（内容分发网络）把静态文件复制到全球各地的边缘节点，用户就近取，又快又省源站带宽。
        但缓存是把双刃剑：缓存太狠，用户看不到新版本；不缓存，又白白浪费 CDN。
        前端构建的<strong>哈希文件名</strong>机制恰好给出了完美答案。
      </p>
      <ul>
        <li>
          <strong>带 hash 的资源 → 长缓存</strong>：构建产物形如 <code>app.4f2a1b.js</code>，
          内容一变，文件名就变。所以这些文件可以放心设
          <code>Cache-Control: max-age=31536000, immutable</code>（缓存一年）——
          因为「同名文件内容永远相同」。
        </li>
        <li>
          <strong>index.html → 不缓存</strong>：入口页文件名固定、且引用着那些带 hash 的资源，
          所以它必须 <code>no-cache</code>，保证用户每次都拿到最新入口、进而引到最新资源。
        </li>
      </ul>
      <KeyIdea>
        缓存失效（cache busting）靠文件名哈希自动完成：发新版 = 资源换了新哈希名 = 新文件名。
        旧文件名的长缓存不影响任何人，新入口页（不缓存）引导大家去拉新文件。
        这套「内容寻址 + 长缓存 + 入口不缓存」的组合是前端缓存的标准答案。
      </KeyIdea>
      <Callout variant="warn" title="把 index.html 也长缓存 = 用户卡在旧版本">
        最常见的部署事故：图省事给所有文件统一长缓存。结果发了新版，用户的浏览器 / CDN
        还死抱着旧的 <code>index.html</code>，引用的全是旧资源，新功能怎么都不出现。
        务必让入口页 <code>no-cache</code>，必要时手动刷新 CDN 缓存。
      </Callout>

      <h2>七、环境变量与多环境</h2>
      <p>
        同一份代码往往要部署到 dev / staging / prod 多个环境，差异（如 API 地址）通过
        <strong>环境变量</strong>注入。关键认知：前端的环境变量是<strong>构建期</strong>生效的——
        Vite 在 <code>build</code> 时把 <code>import.meta.env.VITE_XXX</code> 静态替换成字面量，
        打进产物。所以「换环境」意味着「用不同变量重新构建一次」，而不是运行时读取。
      </p>
      <CodeBlock lang="bash" title="VITE_ 前缀变量在构建期注入" code={envSnippet} />
      <CodeBlock lang="bash" title="用 --mode 区分多环境构建" code={multiEnvBuildSnippet} />
      <Callout variant="info" title="只有 VITE_ 前缀的变量会进产物">
        这是有意的安全设计：避免把服务器密钥之类的变量误打进前端 bundle。
        而且要记住——任何打进前端的变量都是<strong>公开的</strong>（用户能在浏览器里看到），
        真正的密钥永远不该出现在前端，得留在后端。
      </Callout>

      <h2>八、与 CI 衔接：自动部署</h2>
      <p>
        把部署接回上一章的流水线，就完成了从「提交」到「上线」的全自动闭环。常见做法是在 CI 里
        新增一个 <code>deploy</code> job：依赖 <code>build</code> 成功、只在 <code>main</code> 分支触发、
        取回制品后调用平台 CLI 发布。
      </p>
      <CodeBlock lang="yaml" title="CI 里追加部署 job" code={deployJobSnippet} />
      <p>
        其中 <code>if: github.ref == 'refs/heads/main'</code> 保证只有主干才部署（PR 只验证不发布），
        部署 token 走 <code>{'${{ secrets.VERCEL_TOKEN }}'}</code> 注入。
        若用 Docker 路线，则把这一步换成「构建并推送镜像 → 通知服务器拉取重启」。
      </p>
      <Example title="一次主干合并的完整自动旅程">
        <p>
          ① 你把 PR 合进 <code>main</code>；② <code>push</code> 触发 CI：lint / typecheck / test 全绿；
          ③ <code>build</code> job 用 <code>--mode production</code> 构建并上传 <code>dist</code> 制品；
          ④ <code>deploy</code> job 取回制品、调用平台 CLI 发布到生产；
          ⑤ CDN 边缘节点更新，用户刷新页面就用上新版（入口页不缓存，资源走新哈希名）。
          全程无人工介入——这就是持续部署。
        </p>
      </Example>

      <h2>九、三条路线怎么选</h2>
      <table>
        <thead>
          <tr><th>方案</th><th>运维成本</th><th>控制力</th><th>适合</th></tr>
        </thead>
        <tbody>
          <tr><td>静态托管平台</td><td>几乎为零</td><td>较低</td><td>绝大多数项目、起步、个人 / 中小团队</td></tr>
          <tr><td>自托管 Nginx</td><td>中</td><td>高</td><td>内网 / 合规 / 已有服务器</td></tr>
          <tr><td>Docker + Nginx</td><td>中高</td><td>高</td><td>需要可移植、与后端统一编排（K8s 等）</td></tr>
        </tbody>
      </table>
      <p>
        没有特殊约束就从静态托管平台起步——零运维、自带 CDN 和预览部署，性价比最高；
        等到有了自托管 / 合规 / 编排需求，再上 Nginx + Docker。
      </p>

      <h2>十、收束：回望整条前端工程化链路</h2>
      <p>
        到这里，整门课的工程化链路就闭环了。回头看，我们从「怎么写」一路走到了「怎么上线」：
      </p>
      <ul>
        <li><strong>语言与模块</strong>：ES 模块、包管理，让代码能被组织和复用。</li>
        <li><strong>构建工具</strong>：Vite 把源码打包成浏览器能跑的产物，开发时还有热更新。</li>
        <li><strong>代码质量</strong>：ESLint / Prettier / TypeScript，让风格统一、类型可靠。</li>
        <li><strong>测试</strong>：单元 / 组件 / E2E，给改动一张安全网。</li>
        <li><strong>版本协作</strong>：Git 工作流、PR、code review，让多人并行不打架。</li>
        <li><strong>CI</strong>：每次提交在干净环境自动验证，把质量变成合并门禁。</li>
        <li><strong>部署</strong>：把构建产物发到托管平台 / Nginx / Docker，配好缓存与多环境，并接回 CI 自动上线。</li>
      </ul>
      <p>
        这些环节不是孤立的工具堆砌，而是一条<strong>从键盘到用户</strong>的流水线：每一环都在
        「让正确的代码更容易写、让错误的代码更难溜过去、让上线这件事可重复且可信」。
        工程化的终极目标，就是把「能跑」升级为「可靠、可协作、可持续地跑」。
      </p>

      <Callout variant="tip">
        建议你挑一个自己的小项目，亲手把这条链路走一遍：连上 Vercel 配自动部署，
        或写一个多阶段 Dockerfile 在本地跑起来，并故意制造一次「刷新 404」再用
        <code>try_files</code> 修好。亲手踩过的坑，才真正变成你的能力。
      </Callout>

      <Summary
        points={[
          'SPA 部署 = 发布静态产物（index.html + 带哈希的资源）；三条路线：托管平台、自托管 Nginx、Docker + Nginx。',
          '静态托管平台（Vercel / Netlify / Cloudflare Pages）零运维、自动 CI、PR 预览部署、自带 CDN，推荐起步。',
          '自托管必须配 try_files $uri $uri/ /index.html，把前端路由回退到入口页，解决刷新 404。',
          'Docker 多阶段构建：阶段一 node 构建、阶段二 nginx 只拷 dist，镜像从数百 MB 降到几十 MB。',
          '缓存：带 hash 资源长缓存 immutable、index.html 不缓存；哈希文件名让缓存失效自动完成。',
          '前端环境变量在构建期注入（VITE_ 前缀、import.meta.env），用 --mode 区分多环境；最后用 CI 的 deploy job 接成自动上线闭环。',
        ]}
      />
    </article>
  )
}
