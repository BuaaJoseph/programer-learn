import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const treeSnippet = `my-monorepo/
├── package.json            # 根 package.json：管工具链与公共脚本，private: true
├── pnpm-workspace.yaml     # 声明哪些目录是 workspace 成员
├── turbo.json              # Turborepo 任务编排配置
├── apps/                   # 可独立部署的应用
│   ├── web/                #   官网（依赖 packages/ui、packages/utils）
│   │   └── package.json
│   └── admin/              #   后台
│       └── package.json
└── packages/               # 被复用的内部包（库 / 配置 / 组件）
    ├── ui/                 #   共享组件库
    │   └── package.json
    ├── utils/              #   共享工具函数
    │   └── package.json
    └── tsconfig/           #   共享 TS 配置`

const workspaceYamlSnippet = `# pnpm-workspace.yaml —— 告诉 pnpm 哪些目录是工作区成员
packages:
  - "apps/*"
  - "packages/*"
  # 也可以排除：
  # - "!**/test/**"`

const rootPkgSnippet = `{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.7.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.0"
  }
}`

const workspaceProtocolSnippet = `// apps/web/package.json —— 应用引用内部包
{
  "name": "web",
  "dependencies": {
    "@myorg/ui": "workspace:*",     // 永远用工作区里的本地版本，不去 registry 找
    "@myorg/utils": "workspace:*",
    "react": "^18.3.1"
  }
}

// packages/ui/package.json —— 被引用的内部包
{
  "name": "@myorg/ui",
  "version": "0.1.0",
  "main": "src/index.ts"
}`

const importSnippet = `// apps/web/src/App.tsx
// 像引用任何 npm 包一样引用本地内部包 —— pnpm 已把它符号链接进 node_modules
import { Button } from '@myorg/ui'
import { formatDate } from '@myorg/utils'

export function App() {
  return <Button>{formatDate(Date.now())}</Button>
}`

const turboJsonSnippet = `{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],          // ^ 表示「先构建本包的依赖包」=> 拓扑顺序
      "outputs": ["dist/**", ".next/**"] // 声明产物路径，供缓存命中后直接还原
    },
    "test": {
      "dependsOn": ["build"]            // 测试前先构建（同一个包内）
    },
    "lint": {},
    "dev": {
      "cache": false,                   // dev 是长任务，不缓存
      "persistent": true
    }
  }
}`

const turboRunSnippet = `# 全量：按拓扑顺序构建所有包，命中缓存的直接跳过
turbo run build

# 只跑「受改动影响」的包及其下游（基于 git diff）
turbo run build --filter="...[origin/main]"

# 只构建某个应用及其依赖链
turbo run build --filter=web

# 远程缓存：把构建产物上传/下载共享，CI 与同事之间复用
turbo run build --remote-only`

export default function Ch2() {
  return (
    <article>
      <Lead>
        当一个项目长大到「官网 + 后台 + 移动端 + 一堆共享组件和工具」，你会面临一个组织问题：
        是把它们拆成一个个独立仓库（polyrepo），还是塞进同一个仓库统一管理（monorepo）？
        这一章讲清 Monorepo 是什么、值不值得，再手把手用 <strong>pnpm workspace</strong> 把多个包组织起来，
        用 <strong>Turborepo</strong> 解决「这么多包，怎么高效地只构建该构建的」。
      </Lead>

      <h2>一、Monorepo 是什么</h2>
      <KeyIdea>
        Monorepo（单一仓库）= <strong>一个 git 仓库里管理多个包 / 应用</strong>。它不是把代码乱堆在一起，
        而是有清晰边界的多个包共处一仓，彼此可直接引用、统一工具链、一次提交就能跨包改动。
      </KeyIdea>
      <p>
        注意 Monorepo 和「巨型单体应用（monolith）」是两回事。Monolith 指一坨没有内部边界的大代码；
        Monorepo 恰恰相反，仓库里是<strong>多个边界分明的包</strong>，只是住在同一个仓库里。
        Google、Meta 这类公司用超大型 Monorepo 管理几乎全部代码，前端世界里 React、Vue、Babel
        等知名项目也都是 Monorepo。
      </p>

      <h2>二、好处与代价</h2>
      <p>
        Monorepo 流行不是赶时髦，它实打实解决了多包协作的几个痛点；但它也不是免费的，
        代价主要落在「仓库变大」和「需要工具来编排」。
      </p>
      <table>
        <thead>
          <tr><th>好处</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>代码共享零成本</td>
            <td>共享组件 / 工具直接以本地包形式被引用，改了立刻生效，不必发版再安装</td>
          </tr>
          <tr>
            <td>原子提交</td>
            <td>一次跨多个包的改动（比如改接口同时改所有调用方）能在一个 commit / PR 里完成，永不版本错位</td>
          </tr>
          <tr>
            <td>统一工具链</td>
            <td>ESLint、TS 配置、CI、依赖版本全仓统一，新人一次配置处处可用</td>
          </tr>
          <tr>
            <td>可见性</td>
            <td>谁用了哪个包、改它会影响谁，一目了然，重构有底气</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr><th>代价</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>仓库体积大</td>
            <td>所有代码挤在一起，clone / 拉取变重，超大规模还需 sparse-checkout 等手段</td>
          </tr>
          <tr>
            <td>需要任务编排</td>
            <td>「构建全部」会重复跑很多活，必须有工具按依赖顺序、只跑受影响的包，并复用缓存</td>
          </tr>
          <tr>
            <td>权限 / CI 更复杂</td>
            <td>谁能改哪个包、CI 如何只测改动相关部分，都需要额外设计</td>
          </tr>
        </tbody>
      </table>

      <h3>polyrepo vs monorepo 怎么选</h3>
      <p>
        <strong>polyrepo</strong>（每个包一个仓库）的优点是边界天然、权限好分、仓库轻；代价是跨包改动要发版
        + 升级 + 联调，依赖版本极易错位，「改一处牵动多仓」非常痛苦。
        <strong>monorepo</strong> 反过来：跨包改动顺滑、共享省心，代价是要工具撑起编排与缓存。
        经验法则：<strong>包之间耦合紧、需要频繁联动改动</strong>，选 monorepo；
        <strong>各自独立、由不同团队拥有、发布节奏完全不同</strong>，polyrepo 更省心。
      </p>

      <h2>三、用 pnpm workspace 组织 Monorepo</h2>
      <p>
        pnpm 对 workspace 的支持体验最好（也正因为上一章讲的严格依赖结构）。它要的东西很少：
        一个 <code>pnpm-workspace.yaml</code> 声明成员目录，一个根 <code>package.json</code> 管工具链，
        各个包用 <code>workspace:*</code> 协议互相引用。
      </p>

      <h3>典型目录结构：apps/* + packages/*</h3>
      <p>
        最常见的约定是两层：<code>apps/</code> 放可独立部署的应用，<code>packages/</code>
        放被复用的内部包（组件库、工具函数、共享配置）。应用引用包，包之间也可以互相引用。
      </p>
      <CodeBlock lang="bash" title="一个典型的 Monorepo 目录" code={treeSnippet} />

      <h3>pnpm-workspace.yaml：声明成员</h3>
      <p>
        这个文件告诉 pnpm：哪些目录下的 <code>package.json</code> 算工作区成员。pnpm 会把它们当作
        一个整体来解析依赖、做提升与链接。
      </p>
      <CodeBlock lang="json" title="pnpm-workspace.yaml" code={workspaceYamlSnippet} />

      <h3>根 package.json：工具链与公共脚本</h3>
      <p>
        根包通常标 <code>private: true</code>（它不发布），集中放公共 devDependencies（如 turbo、typescript），
        并把全仓脚本统一委托给 Turborepo。<code>packageManager</code> 字段把团队锁定到同一个 pnpm 版本。
      </p>
      <CodeBlock lang="json" title="根 package.json" code={rootPkgSnippet} />

      <h3>workspace:* 协议：让本地包互相引用</h3>
      <KeyIdea>
        <code>workspace:*</code> 是 Monorepo 的黏合剂：在某个包的依赖里写
        <code>"@myorg/ui": "workspace:*"</code>，意思是「用工作区里那个本地的 @myorg/ui，
        别去 npm registry 下载」。pnpm 会把本地包<strong>符号链接</strong>进 node_modules，
        改了源码立刻生效，无需发版。
      </KeyIdea>
      <CodeBlock lang="json" title="用 workspace:* 引用本地包" code={workspaceProtocolSnippet} />
      <p>
        引用之后，在应用代码里就像引用任何 npm 包一样 import 它——这正是「代码共享零成本」的由来。
      </p>
      <CodeBlock lang="bash" title="在应用里 import 本地包" code={importSnippet} />
      <Callout variant="note" title="发布时 workspace:* 会被自动改写">
        如果某个内部包要发布到 npm，发布工具（如 pnpm publish / changesets）会在打包时把
        <code>workspace:*</code> 替换成真实的版本号（如 <code>^0.1.0</code>），
        所以下游用户拿到的是正常的版本范围，不会看到 <code>workspace:</code> 这种本地协议。
      </Callout>

      <h2>四、用 Turborepo 做任务编排</h2>
      <p>
        包多了之后，「构建全部」会遇到三个真问题：① 顺序——@myorg/ui 必须先于依赖它的 web 构建；
        ② 重复——没改过的包不该重复构建；③ 范围——改了一个包，没必要把全仓都重跑一遍。
        <strong>Turborepo</strong> 就是来解决这三件事的任务编排器。
      </p>

      <h3>拓扑顺序：dependsOn 与 ^</h3>
      <p>
        Turborepo 读各包的依赖关系建出一张<strong>依赖图</strong>，据此决定任务执行顺序。
        <code>turbo.json</code> 里 <code>dependsOn</code> 中的 <code>^</code> 前缀是关键：
        <code>"dependsOn": ["^build"]</code> 表示「在构建本包前，先构建本包的所有依赖包」——
        这就保证了<strong>拓扑顺序</strong>，且互不依赖的包还能<strong>并行</strong>构建。
      </p>
      <CodeBlock lang="json" title="turbo.json" code={turboJsonSnippet} />

      <h3>增量缓存：算过的别再算</h3>
      <p>
        Turborepo 给每个任务算一个<strong>哈希指纹</strong>（基于输入文件、依赖、环境变量、配置）。
        指纹没变，说明输入没变，输出必然一样——于是它<strong>跳过执行，直接还原上次缓存的产物与日志</strong>，
        这就是「命中缓存」。这要求你在 <code>outputs</code> 里如实声明产物路径，缓存才知道要存 / 还原什么。
        日常开发中，「只改了一个包」往往让大半个仓库的 build 秒级命中缓存。
      </p>

      <h3>只跑受影响的包：--filter</h3>
      <p>
        <code>--filter</code> 让你按依赖图裁剪要跑的范围。最常用的是基于 git 的
        <code>--filter="...[origin/main]"</code>：只跑相对某分支有改动的包<strong>以及依赖它们的下游包</strong>，
        其余一概不碰。CI 里这一招能把「全量跑一小时」压到「只跑改动相关的几分钟」。
      </p>
      <CodeBlock lang="bash" title="Turborepo 常用命令" code={turboRunSnippet} />

      <h3>远程缓存：团队与 CI 之间复用</h3>
      <p>
        本地缓存只惠及你自己；<strong>远程缓存</strong>把任务产物上传到共享存储，于是同事、CI 之间能互相复用：
        CI 构建过的产物，你本地拉下来直接命中；你构建过的，CI 也能用。对中大型团队，这往往是
        Turborepo 提速最显著的一环——「别人已经构建过的，整个团队都不必再构建第二次」。
      </p>

      <Example title="一次改动在 Turborepo 下的真实流程">
        <p>你只改了 <code>packages/utils</code> 里一个函数，跑 <code>turbo run build test</code>：</p>
        <p>① Turborepo 算指纹，发现 utils 变了；</p>
        <p>② 受影响的是 utils 本身、以及依赖它的 web、admin；packages/ui 没依赖 utils，<strong>命中缓存跳过</strong>；</p>
        <p>③ 按拓扑顺序构建 utils → 再并行构建 web、admin；</p>
        <p>④ 没受影响的任务全部秒过。一个改动只触发了真正必要的工作。</p>
      </Example>

      <Callout variant="note" title="Turborepo 与 Nx 一句话">
        Nx 是另一套主流 Monorepo 工具，能力更全（代码生成器、插件体系、模块边界约束、可视化依赖图等），
        更「重」也更体系化；Turborepo 走极简路线，配置少、上手快，专注任务编排与缓存。
        小到中型前端 Monorepo 多选 Turborepo，需要强治理与生成器能力时考虑 Nx。
      </Callout>

      <h2>五、边界与实务建议</h2>
      <p>
        几个常见坑：<strong>outputs 没声明全</strong>会导致缓存命中后产物缺失，构建「看似成功实则不全」，
        务必把所有产物目录写进 <code>turbo.json</code>；<strong>带副作用 / 随机性的任务不要缓存</strong>
        （如 dev、deploy），给它们设 <code>"cache": false</code>；<strong>环境变量影响产物</strong>时
        要在配置里声明进哈希，否则换了环境却命中了旧缓存。最后，Monorepo 不是越大越好——
        如果包之间根本不联动、由完全独立的团队拥有，硬塞进一个仓库只会徒增 CI 与权限的复杂度。
      </p>

      <Callout variant="tip">
        组合拳就此成型：<strong>pnpm workspace</strong> 负责「把多个包组织进一个仓、用 workspace:* 互相引用」，
        <strong>Turborepo</strong> 负责「按拓扑顺序、只跑受影响的、最大化复用缓存」。
        前者解决结构，后者解决效率，二者相加就是现代前端 Monorepo 的主流方案。
      </Callout>

      <Summary
        points={[
          'Monorepo = 一个仓库管多个有边界的包/应用（区别于无边界的 monolith），带来代码共享、原子提交、统一工具链。',
          '代价是仓库变大、必须有任务编排与缓存、CI/权限更复杂；包间耦合紧选 monorepo，各自独立选 polyrepo。',
          'pnpm workspace 三件套：pnpm-workspace.yaml 声明成员、根 package.json（private + packageManager）管工具链、workspace:* 协议引用本地包。',
          'workspace:* 让本地包以符号链接被引用，改了立刻生效、无需发版；发布时会被自动改写成真实版本号。',
          'Turborepo 做任务编排：dependsOn 的 ^ 保证拓扑顺序并行构建、指纹哈希实现增量缓存、--filter 只跑受影响的包、远程缓存让团队与 CI 复用产物。',
          '实务：outputs 要声明全、dev/deploy 设 cache:false、影响产物的环境变量要入哈希；Nx 更重更全，中小前端 Monorepo 多用 Turborepo。',
        ]}
      />
    </article>
  )
}
