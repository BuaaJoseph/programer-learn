import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const triggerSnippet = `# .github/workflows/ci.yml —— 触发部分
name: CI

on:
  push:
    branches: [main]            # 推到 main 时跑
  pull_request:
    branches: [main]            # 针对 main 开 / 更新 PR 时跑
  workflow_dispatch:            # 也允许在 Actions 页面手动点一下触发`

const oneJobSnippet = `jobs:
  verify:                       # job 的 id，自取
    runs-on: ubuntu-latest      # 在哪个 runner 上跑
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm            # 自动缓存 ~/.npm，命中后装依赖快得多

      - name: 安装依赖
        run: npm ci             # ci 比 install 更适合流水线：严格按 lock 文件、可复现

      - name: Lint
        run: npm run lint

      - name: 类型检查
        run: npm run typecheck

      - name: 单元测试
        run: npm test

      - name: 构建
        run: npm run build`

const artifactSnippet = `      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: dist            # 制品名
          path: dist/           # 要打包上传的目录
          retention-days: 7     # 保留 7 天后自动清理`

const matrixSnippet = `jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false          # 一个组合挂了，别急着取消其它组合
      matrix:
        node: [18, 20, 22]      # 同一套步骤，在 3 个 Node 版本上各跑一遍
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test`

const parallelSnippet = `jobs:
  lint:                         # 这三个 job 没有 needs，会并行起跑
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test

  build:
    needs: [lint, test]         # 必须 lint 和 test 都绿了才开始 build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build`

const secretSnippet = `      - name: 上报覆盖率
        run: npx codecov
        env:
          CODECOV_TOKEN: \${{ secrets.CODECOV_TOKEN }}  # 敏感值放 仓库 Settings → Secrets，绝不写进代码`

const fullSnippet = `# .github/workflows/ci.yml —— 一条完整可用的前端 CI
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# 同一分支新推送时，自动取消上一次还没跑完的运行，省额度
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:                      # 第一关：质量门禁，并行跑 lint / typecheck / test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

  build:                        # 第二关：质量过了才构建并产出制品
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7`

export default function Ch1() {
  return (
    <article>
      <Lead>
        写完代码、跑过本地测试、推上去——然后呢？在团队协作里，光靠「我本地是好的」远远不够：
        别人的机器环境不同、有人忘了跑 lint、某次合并悄悄引入了类型错误。
        <strong>CI（持续集成）</strong>就是用来堵住这些缝隙的：每一次提交都由一台干净的机器
        自动把检查、测试、构建从头跑一遍，绿了才让合并。这一章我们把 CI/CD 的概念讲透，
        再用 GitHub Actions 亲手搭一条能用的前端流水线。
      </Lead>

      <h2>一、先分清三个词：CI、持续交付、持续部署</h2>
      <p>
        这三个词常被混着说，但指的是流水线上不同的「自动化深度」。理解它们的差别，
        才知道自己的项目要做到哪一步。
      </p>
      <ul>
        <li>
          <strong>持续集成（Continuous Integration, CI）</strong>：每次提交 / PR
          都自动验证——装依赖、跑 lint、类型检查、测试、构建。目标是<strong>尽早发现问题</strong>，
          让「能不能合并」有客观依据，而不是靠人肉 review 猜。
        </li>
        <li>
          <strong>持续交付（Continuous Delivery, CD）</strong>：在 CI 之上，自动把验证通过的代码
          <strong>打包成随时可上线的制品</strong>，但最后「要不要发布」由人点一下确认。
        </li>
        <li>
          <strong>持续部署（Continuous Deployment, CD）</strong>：再进一步，连那一下确认都省了——
          只要主干绿，<strong>自动上线到生产</strong>。这要求测试覆盖足够可信。
        </li>
      </ul>
      <table>
        <thead>
          <tr><th>能力</th><th>自动验证</th><th>自动产出制品</th><th>自动上线生产</th></tr>
        </thead>
        <tbody>
          <tr><td>持续集成 CI</td><td>是</td><td>否 / 可选</td><td>否</td></tr>
          <tr><td>持续交付</td><td>是</td><td>是</td><td>否（人工点确认）</td></tr>
          <tr><td>持续部署</td><td>是</td><td>是</td><td>是</td></tr>
        </tbody>
      </table>

      <KeyIdea>
        CI 解决的是「我的改动会不会弄坏别人 / 别人的改动会不会弄坏我」。
        它把「在干净环境里从头验证一遍」这件事自动化、强制化，
        让代码质量不再依赖每个人的自觉与记忆。
      </KeyIdea>

      <h2>二、为什么非要 CI 不可</h2>
      <p>
        小项目一个人写，似乎本地跑跑就够了。但只要协作规模一上来，没有 CI 的代价会迅速放大：
      </p>
      <ul>
        <li>
          <strong>早发现问题</strong>：错误越晚被发现，定位和修复成本越高。CI 在每次提交时就拦下问题，
          而不是等到上线前甚至上线后才暴雷。
        </li>
        <li>
          <strong>统一环境</strong>：CI 永远在一台<strong>干净、可复现</strong>的机器上跑，
          根治「在我电脑上是好的」——因为参照系不再是某个人的电脑，而是这台标准机器。
        </li>
        <li>
          <strong>质量门禁</strong>：把 lint / 类型 / 测试 / 构建变成合并的<strong>硬性前置条件</strong>，
          没绿就合不进去。质量标准从「靠自觉」升级为「靠机器强制」。
        </li>
        <li>
          <strong>解放 review</strong>：机器能查的（格式、类型、用例）交给机器，
          人就能专注看真正需要判断的设计与逻辑。
        </li>
      </ul>

      <h2>三、GitHub Actions 的心智模型</h2>
      <p>
        GitHub Actions 是 GitHub 内置的 CI/CD 平台，配置就是仓库里
        <code>.github/workflows/</code> 下的 YAML 文件。它的层级从大到小是：
      </p>
      <ul>
        <li><strong>workflow（工作流）</strong>：一个 YAML 文件就是一条流水线，由某些事件触发。</li>
        <li><strong>job（任务）</strong>：一条流水线里的并列单元，各自跑在独立的 runner（虚拟机）上，默认<strong>并行</strong>。</li>
        <li><strong>step（步骤）</strong>：job 内部按顺序执行的一步，要么 <code>run</code> 一条命令，要么 <code>uses</code> 一个现成 action。</li>
        <li><strong>action</strong>：可复用的步骤封装，比如 <code>actions/checkout</code>（检出代码）、<code>actions/setup-node</code>（装 Node）。</li>
      </ul>
      <Callout variant="info" title="job 之间默认不共享文件">
        每个 job 在<strong>全新的虚拟机</strong>上启动，互相之间硬盘是隔离的。
        所以 job A 装的依赖、build 的产物，job B 看不到——要么各自重装，
        要么通过 artifact / cache 显式传递。同一个 job 内的 step 才共享同一个工作目录。
      </Callout>

      <h2>四、触发：什么时候跑</h2>
      <p>
        <code>on</code> 字段定义触发条件。前端 CI 最常用两个事件：
        <code>push</code>（推送到指定分支）和 <code>pull_request</code>（开 / 更新 PR）。
        前者守护主干，后者在合并前就把关。
      </p>
      <CodeBlock lang="yaml" title="触发条件 on" code={triggerSnippet} />

      <h2>五、一个 job 跑通整条检查链</h2>
      <p>
        最朴素的做法是把所有步骤塞进一个 job，按顺序跑：检出 → 装 Node → 装依赖 →
        lint → 类型检查 → 测试 → 构建。注意装依赖用 <code>npm ci</code> 而不是
        <code>npm install</code>——前者严格依据 <code>package-lock.json</code> 安装，结果可复现，正是 CI 想要的。
      </p>
      <CodeBlock lang="yaml" title="单 job 完成检出 / 安装 / 检查 / 构建" code={oneJobSnippet} />
      <p>
        其中 <code>setup-node</code> 的 <code>cache: npm</code> 是关键加速点：它把 npm 的下载缓存
        按 lock 文件做哈希存起来，下次只要依赖没变就直接命中，省下大量重复下载时间。
        依赖缓存往往能把一次 CI 从几分钟压到几十秒。
      </p>

      <h2>六、产出制品 artifact</h2>
      <p>
        构建出来的 <code>dist/</code> 在 job 结束时会随虚拟机一起销毁。如果想把它留下来——
        给后续 job 用、给人下载、或交给部署步骤——就用 <code>actions/upload-artifact</code> 上传成制品。
      </p>
      <CodeBlock lang="yaml" title="把 dist 上传为 artifact" code={artifactSnippet} />
      <p>
        制品可以在那次运行的页面下载，也能被同一 workflow 里的其它 job 用
        <code>actions/download-artifact</code> 取回。这是「构建一次、到处复用」的基础。
      </p>

      <h2>七、并行 job 与矩阵 matrix</h2>
      <p>
        既然 job 默认并行，就可以把彼此独立的检查拆开同时跑，缩短总时长；
        再用 <code>needs</code> 表达依赖关系，让有先后的环节排好队。
      </p>
      <CodeBlock lang="yaml" title="并行 job + needs 表达依赖" code={parallelSnippet} />
      <p>
        而当你想用<strong>同一套步骤</strong>覆盖<strong>多种环境组合</strong>（比如多个 Node 版本、
        多个操作系统）时，不必复制粘贴——用 <code>strategy.matrix</code> 让 GitHub
        自动展开成多个并行 job。
      </p>
      <CodeBlock lang="yaml" title="矩阵 matrix：一套步骤跑多版本" code={matrixSnippet} />
      <Callout variant="tip" title="fail-fast 的取舍">
        <code>fail-fast: true</code>（默认）会在任一组合失败时立刻取消其余组合，省时间但少信息；
        设成 <code>false</code> 则让所有组合都跑完，便于一次看清「到底哪些版本挂了」。
        调试兼容性问题时常关掉它。
      </Callout>

      <h2>八、合并门禁：分支保护 + 必需检查</h2>
      <p>
        CI 跑出绿勾只是第一步，真正的「门禁」要靠仓库设置来强制。在
        <strong>Settings → Branches → Branch protection rules</strong> 里给 <code>main</code> 加保护：
      </p>
      <ul>
        <li><strong>Require status checks to pass</strong>：把 CI 的 job 设为<strong>必需检查</strong>，没绿就禁止合并。</li>
        <li><strong>Require branches to be up to date</strong>：要求 PR 先同步主干最新代码再合，避免「各自都绿、合到一起却坏」。</li>
        <li><strong>Require pull request reviews</strong>：要求至少一个人 approve，把机器把关和人工 review 叠加。</li>
      </ul>
      <p>
        配好之后，红勾的 PR 连「Merge」按钮都点不动——质量标准就此变成不可绕过的硬约束。
      </p>

      <h2>九、Secrets：敏感信息怎么传</h2>
      <p>
        部署 token、第三方服务密钥这类敏感值，绝不能写进仓库。把它们存到
        <strong>Settings → Secrets and variables → Actions</strong>，在 YAML 里用
        <code>{'${{ secrets.XXX }}'}</code> 引用即可，GitHub 会在日志里自动打码。
      </p>
      <CodeBlock lang="yaml" title="通过 secrets 注入敏感值" code={secretSnippet} />

      <h2>十、一份完整可用的前端 CI</h2>
      <p>
        把上面的要点收拢成一条真正能跑的流水线：质量门禁（lint / typecheck / test）先并行成关，
        过了再 build 并上传制品；外加 <code>concurrency</code> 自动取消同分支的旧运行省额度。
      </p>
      <CodeBlock lang="yaml" title="完整的 .github/workflows/ci.yml" code={fullSnippet} />

      <Example title="一次 PR 在 CI 里的旅程">
        <p>
          你开了一个 PR：① GitHub 检测到 <code>pull_request</code> 事件，触发 workflow；
          ② <code>quality</code> job 在干净机器上 <code>npm ci</code> 后跑 lint / typecheck / test；
          ③ 全绿则 <code>build</code> job 接力构建并上传 <code>dist</code> 制品；
          ④ 两个 job 都绿，PR 页面显示必需检查通过，「Merge」按钮亮起；
          ⑤ 若任一步红了，按钮置灰，你修完再推，CI 自动重跑。
        </p>
      </Example>

      <h2>十一、流水线阶段一览</h2>
      <table>
        <thead>
          <tr><th>阶段</th><th>命令 / action</th><th>拦住什么</th></tr>
        </thead>
        <tbody>
          <tr><td>检出</td><td><code>actions/checkout</code></td><td>—（取到代码）</td></tr>
          <tr><td>装环境 + 缓存</td><td><code>actions/setup-node</code>（<code>cache: npm</code>）</td><td>环境不一致 / 重复下载</td></tr>
          <tr><td>装依赖</td><td><code>npm ci</code></td><td>依赖漂移、lock 不一致</td></tr>
          <tr><td>Lint</td><td><code>npm run lint</code></td><td>风格问题、可疑写法</td></tr>
          <tr><td>类型检查</td><td><code>npm run typecheck</code></td><td>类型错误</td></tr>
          <tr><td>测试</td><td><code>npm test</code></td><td>逻辑回归</td></tr>
          <tr><td>构建</td><td><code>npm run build</code></td><td>构建期错误、产物异常</td></tr>
          <tr><td>制品</td><td><code>actions/upload-artifact</code></td><td>—（产出可部署的 dist）</td></tr>
        </tbody>
      </table>

      <h2>十二、边界与常见坑</h2>
      <ul>
        <li>
          <strong>本地能过、CI 挂了</strong>：八成是环境差异——本地装了全局工具、Node 版本不同、
          或 lock 文件没提交。让本地尽量贴近 CI（同版本、用 <code>npm ci</code>）。
        </li>
        <li>
          <strong>CI 太慢</strong>：先上依赖缓存；再把独立检查拆成并行 job；
          用 <code>concurrency</code> 取消同分支旧运行，别让排队堆积。
        </li>
        <li>
          <strong>不稳定的测试（flaky test）</strong>：偶尔红偶尔绿会摧毁团队对 CI 的信任，
          要么修稳定、要么隔离，绝不能用「重跑一次」糊弄过去。
        </li>
        <li>
          <strong>把秘密写进 YAML</strong>：任何 token / 密钥都走 secrets，
          一旦明文进过仓库历史，等同泄露，必须立即吊销重置。
        </li>
      </ul>

      <Callout variant="tip">
        下一章我们顺着这条流水线往后走：制品有了，接下来就是<strong>部署</strong>——
        静态托管平台怎么零运维上线、自托管怎么用 Nginx + Docker、CDN 缓存怎么配，
        以及如何把 CI 和部署接成一条自动化的链路。
      </Callout>

      <Summary
        points={[
          'CI（持续集成）= 每次提交自动验证；持续交付 = 再自动产出可上线制品；持续部署 = 连上线都自动化。',
          'CI 的价值：早发现问题、统一可复现环境、把检查变成不可绕过的质量门禁、解放人工 review。',
          'GitHub Actions 层级：workflow（一个 YAML）→ job（并行、各自独立虚拟机）→ step（顺序执行，run 或 uses）。',
          '一条前端流水线：checkout → setup-node（cache: npm 加速）→ npm ci → lint → typecheck → test → build → upload-artifact。',
          '用并行 job + needs 表达依赖、用 strategy.matrix 一套步骤覆盖多 Node 版本；用 concurrency 取消同分支旧运行。',
          '分支保护把 CI 设为必需检查 = 合并门禁；敏感值走 secrets，用 ${{ secrets.X }} 引用，绝不明文进仓库。',
        ]}
      />
    </article>
  )
}
