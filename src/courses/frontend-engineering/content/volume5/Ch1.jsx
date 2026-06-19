import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const packageJsonSnippet = `{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "lint": "eslint . --ext .js,.jsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "eslint": "~9.9.0",
    "vitest": "^2.0.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  }
}`

const semverSnippet = `# 版本号语义：主版本.次版本.修订号 = MAJOR.MINOR.PATCH
#   MAJOR 破坏性变更   MINOR 向后兼容的新功能   PATCH 向后兼容的修复

"react": "^18.3.1"   # ^ 允许：>=18.3.1 且 <19.0.0   （锁住主版本，放开次/修订）
"react": "~18.3.1"   # ~ 允许：>=18.3.1 且 <18.4.0   （锁住主+次，只放开修订）
"react": "18.3.1"    # 精确：只装 18.3.1，一个不差
"react": ">=18.0.0"  # 范围：任何不低于 18.0.0 的版本
"react": "*"         # 任意版本（几乎不该这么写，毫无确定性可言）
"react": "18.x"      # 18 这条主版本线上的任意版本`

const scriptsSnippet = `# 运行 package.json 里 scripts 字段定义的命令
npm run dev          # 执行 scripts.dev
npm run build
npm test             # test / start 是特例，可省略 run

# 安装依赖
npm install              # 按 package.json + lockfile 安装到 node_modules
npm install lodash       # 加一个生产依赖，写进 dependencies
npm install -D vitest    # -D / --save-dev 写进 devDependencies
npm ci                   # 严格按 lockfile 安装，CI 环境首选（更快、可复现）`

const phantomSnippet = `# 你的 package.json 只声明了 express
# 但 express 依赖了 debug，扁平化后 debug 也躺在顶层 node_modules

// app.js —— 这行能跑！但你从没声明过 debug
const debug = require('debug')  // 幽灵依赖 phantom dependency

# 风险：哪天 express 升级不再依赖 debug，或换了 debug 的版本，
# 你这行代码就会毫无预兆地崩掉 —— 因为你依赖了一个「碰巧在那」的包`

const pnpmStoreSnippet = `# pnpm 的两层结构
~/.pnpm-store/                 # 全局内容寻址存储：每个包的每个版本只存一份
project/node_modules/
  .pnpm/                       # 真实依赖都在这里，按 名称@版本 摊平
    express@4.19.2/node_modules/express        -> 硬链接到全局 store
    debug@4.3.4/node_modules/debug             -> 硬链接到全局 store
  express -> .pnpm/express@4.19.2/node_modules/express   # 符号链接

# 关键：顶层 node_modules 只有「你显式声明过」的包的符号链接，
# 没声明的（如 debug）根本不在顶层 —— require('debug') 直接报错，幽灵依赖无处遁形`

const lockfileSnippet = `# 三种锁文件，作用相同：把「这次实际装了哪些版本、来自哪、校验和是多少」钉死
package-lock.json   # npm
yarn.lock           # yarn
pnpm-lock.yaml      # pnpm

# 务必提交进 git。它保证：今天在你机器、明天在 CI、下周在同事机器，
# 装出来的 node_modules 完全一致 —— 这就是「确定性安装」`

export default function Ch1() {
  return (
    <article>
      <Lead>
        前端项目第一行真正的代码，往往不是你写的，而是 <code>npm install</code> 拉进来的几百个包。
        包管理器是现代前端工程的地基：它决定了依赖怎么声明、版本怎么选、文件怎么落到磁盘、
        以及「在我机器上能跑」能不能变成「在所有机器上都能跑」。这一章我们从 <code>package.json</code>
        讲起，剖开 <code>node_modules</code> 的扁平化为何会埋下幽灵依赖的雷，再讲清 pnpm 凭什么
        又快、又省、又安全。
      </Lead>

      <h2>一、package.json：项目的身份证与依赖清单</h2>
      <p>
        每个 Node / 前端项目的根目录都有一个 <code>package.json</code>，它是项目的元数据与依赖清单。
        包管理器读它来决定「该装什么」，构建工具读它来决定「入口在哪、怎么跑脚本」。
        我们先把几个最关键的字段讲透。
      </p>
      <CodeBlock lang="json" title="一个典型的 package.json" code={packageJsonSnippet} />

      <h3>三种依赖：dependencies / devDependencies / peerDependencies</h3>
      <p>
        依赖不是一锅烩，按「什么时候需要、谁来提供」分成三类。分清它们，打包体积和兼容性问题能少一大半。
      </p>
      <table>
        <thead>
          <tr><th>字段</th><th>含义</th><th>典型例子</th><th>会被打进产物吗</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dependencies</code></td>
            <td>运行时真正需要的依赖，项目跑起来缺它不行</td>
            <td>react、axios、lodash</td>
            <td>会</td>
          </tr>
          <tr>
            <td><code>devDependencies</code></td>
            <td>只在开发 / 构建 / 测试阶段用，上线产物里不需要</td>
            <td>vite、eslint、vitest</td>
            <td>不会</td>
          </tr>
          <tr>
            <td><code>peerDependencies</code></td>
            <td>「我需要宿主环境提供它，但我不自带」，多用于库 / 插件</td>
            <td>一个 React 组件库声明 peer 依赖 react</td>
            <td>不会（由宿主提供）</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>peerDependencies</code> 最容易被新手忽略。设想你写了个 React 组件库：你<strong>不能</strong>
        把 react 放进自己的 <code>dependencies</code>，否则用户的项目里会出现两份 react，
        hooks 直接报错。正确做法是声明 peer 依赖，意思是「请由使用我的那个项目提供 react，
        我只要和它<strong>共用同一份</strong>就行」。
      </p>

      <h3>版本范围：^ 与 ~ 到底放开了什么</h3>
      <p>
        依赖的值通常不是一个固定版本号，而是一个<strong>范围</strong>。这背后是
        <strong>语义化版本（SemVer）</strong>约定：版本号形如 <code>主.次.修订</code>
        （MAJOR.MINOR.PATCH），主版本表示破坏性变更，次版本表示向后兼容的新功能，修订号表示向后兼容的修复。
        理解了它，<code>^</code> 和 <code>~</code> 就一目了然。
      </p>
      <CodeBlock lang="bash" title="常见版本范围写法" code={semverSnippet} />
      <Callout variant="note" title="^ 与 ~ 的记忆口诀">
        <code>^</code>（caret，插入符）锁<strong>主版本</strong>，次和修订都能往上走；
        <code>~</code>（tilde，波浪号）锁<strong>主 + 次</strong>，只让修订号往上走。
        所以 <code>~</code> 比 <code>^</code> 更保守。注意一个边界：当主版本是 0 时（如 <code>^0.2.3</code>），
        <code>^</code> 的行为会收紧成只放开修订号，因为 0.x 阶段被视为 API 尚不稳定。
      </Callout>

      <h3>scripts：把常用命令收进来</h3>
      <p>
        <code>scripts</code> 字段把项目的常用命令起个名字，用 <code>npm run 名字</code> 触发。
        它让团队成员不必记一长串构建参数，也是 CI 流水线的统一入口。
      </p>
      <CodeBlock lang="bash" title="scripts 与常用安装命令" code={scriptsSnippet} />

      <h2>二、node_modules：从嵌套到扁平，以及随之而来的麻烦</h2>
      <KeyIdea>
        早期 npm 把依赖<strong>嵌套</strong>存放，导致路径过深、同一个包被重复安装无数份；
        后来 npm / yarn 改用<strong>扁平化（hoisting，依赖提升）</strong>把包尽量提到顶层
        <code>node_modules</code>。扁平化省了空间，却带来两个新问题：幽灵依赖与分身依赖。
      </KeyIdea>

      <h3>嵌套时代的痛</h3>
      <p>
        npm v2 时代，依赖是树状嵌套的：你装 A，A 依赖 B，磁盘上就是
        <code>node_modules/A/node_modules/B</code>。如果 B 又依赖 C，再往里套一层。结果有二：
        其一，路径长到 Windows 都受不了；其二，如果 A 和 D 都依赖 B，B 会被<strong>装两遍</strong>，
        放在各自的子目录里，空间爆炸。
      </p>

      <h3>扁平化：把包提到顶层</h3>
      <p>
        npm v3 起改为扁平化：安装时尽量把依赖<strong>提升（hoist）</strong>到顶层
        <code>node_modules</code>，让多个包共享同一份。Node 的模块解析算法会从当前目录的
        <code>node_modules</code> 一层层往上找，所以把 B 放在顶层，A 依然能 <code>require('B')</code>。
        重复安装大大减少。但「把没声明的包也放进了顶层、所有代码都能摸到」这件事，
        埋下了两颗雷。
      </p>

      <h3>雷一：幽灵依赖（phantom dependency）</h3>
      <p>
        你只在 <code>package.json</code> 里声明了 express，但 express 依赖的 debug 被提升到了顶层。
        于是你的代码里 <code>require('debug')</code> 竟然<strong>能跑</strong>——尽管你从没声明过它。
        这就是幽灵依赖：你用了一个自己没声明、只是「碰巧在那」的包。
      </p>
      <CodeBlock lang="bash" title="幽灵依赖是怎么发生的" code={phantomSnippet} />
      <Callout variant="warn" title="幽灵依赖为什么危险">
        它平时静悄悄，出事却很突然：哪天 express 升级、不再依赖 debug，或换了 debug 的大版本，
        那个「碰巧在顶层」的包就消失或变了样，你那行从没声明过的 <code>require</code> 会毫无预兆地崩。
        更糟的是这种 bug 只在升级依赖后才暴露，排查极费时间。
      </Callout>

      <h3>雷二：分身依赖（doppelganger）</h3>
      <p>
        扁平化只能把<strong>一个</strong>版本提到顶层。当项目里 A 需要 <code>lodash@3</code>、
        B 需要 <code>lodash@4</code>，包管理器只能把其中一个放顶层，另一个仍嵌套在子目录里——
        于是磁盘上出现了同一个包的<strong>两个副本</strong>（doppelganger，分身）。这不仅占空间，
        还可能让「同一个包」的实例在内存里出现多份，破坏单例假设（比如两份 React、两份某个全局状态库）。
      </p>

      <h2>三、lockfile：让安装变得确定</h2>
      <p>
        <code>package.json</code> 里写的是<strong>范围</strong>（<code>^18.3.1</code>），
        而范围会随时间「漂移」——今天解析成 18.3.1，明天上游发了 18.4.0 就可能装成 18.4.0。
        这会让「同一份代码在不同时间 / 不同机器装出不同的 node_modules」，可复现性崩塌。
        <strong>锁文件（lockfile）</strong>就是来钉死这件事的。
      </p>
      <CodeBlock lang="bash" title="三种锁文件" code={lockfileSnippet} />
      <p>
        锁文件记录了本次安装<strong>实际</strong>解析出的每个包的精确版本、下载地址和完整性校验和
        （integrity hash）。它必须提交进版本库。下次安装时，包管理器优先按锁文件还原，
        从而保证确定性。CI 里更应该用 <code>npm ci</code> / <code>pnpm install --frozen-lockfile</code>：
        它要求锁文件与 <code>package.json</code> 一致，否则直接失败，杜绝「装着装着版本就变了」。
      </p>

      <h2>四、pnpm：又快、又省、又安全的解法</h2>
      <KeyIdea>
        pnpm 的核心创新是<strong>全局内容寻址存储 + 链接</strong>：每个包的每个版本在全局只存<strong>一份</strong>，
        项目的 <code>node_modules</code> 通过<strong>硬链接</strong>指向它；同时用<strong>符号链接</strong>
        构造出一个「只暴露你声明过的依赖」的严格结构。一举解决省空间、提速度、灭幽灵依赖三件事。
      </KeyIdea>

      <h3>内容寻址存储 + 硬链接 = 省磁盘、装得快</h3>
      <p>
        npm / yarn 把包<strong>复制</strong>进每个项目的 <code>node_modules</code>，十个项目都用 react
        就有十份拷贝。pnpm 不复制：所有版本统一放进全局存储（默认在 <code>~/.pnpm-store</code>），
        按内容寻址（同样内容只存一份）。项目里的依赖是指向全局存储的<strong>硬链接</strong>——
        硬链接不占额外磁盘空间，也几乎不耗时间。于是第二个项目装同样的依赖时，
        大部分包<strong>秒装</strong>，磁盘占用也只增不多。
      </p>

      <h3>符号链接构造的严格结构 = 杜绝幽灵依赖</h3>
      <p>
        pnpm 的顶层 <code>node_modules</code> 里，<strong>只有你在 package.json 里显式声明过的包</strong>
        的符号链接；所有依赖的依赖都藏在 <code>.pnpm/</code> 目录里，不暴露到顶层。这意味着：
        你<strong>没法</strong> <code>require</code> 一个没声明的包——它根本不在你能解析到的路径上。
        幽灵依赖在 pnpm 下直接报错，逼你把真正用到的包老老实实写进 <code>package.json</code>。
      </p>
      <CodeBlock lang="bash" title="pnpm 的 node_modules 长什么样" code={pnpmStoreSnippet} />
      <Callout variant="tip" title="为什么这套设计同时拿下了三个目标">
        省空间：全局只存一份 + 硬链接，不重复复制；
        快：第二次起大量包命中全局存储，几乎零拷贝；
        安全 / 严格：符号链接结构让未声明的依赖不可见，分身依赖也因为按「名称@版本」精确摆放而不再混淆。
      </Callout>

      <h2>五、横向对比：npm / yarn / pnpm</h2>
      <p>
        三大包管理器并存，各有取舍。yarn 还分两代：Yarn Classic（v1）和 Yarn Berry（v2+，
        主打 PnP 即 Plug'n'Play，连 node_modules 都不要了，但生态兼容性是个坎）。下表帮你快速选型。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>npm</th><th>Yarn Classic (v1)</th><th>Yarn Berry (v2+)</th><th>pnpm</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>node_modules 布局</td>
            <td>扁平化</td>
            <td>扁平化</td>
            <td>PnP（默认无 node_modules）</td>
            <td>符号链接 + 全局存储</td>
          </tr>
          <tr>
            <td>磁盘占用</td>
            <td>高（每项目一份）</td>
            <td>高</td>
            <td>低</td>
            <td>低（全局共享 + 硬链接）</td>
          </tr>
          <tr>
            <td>安装速度</td>
            <td>中</td>
            <td>较快（带缓存）</td>
            <td>快</td>
            <td>快（命中存储近乎秒装）</td>
          </tr>
          <tr>
            <td>幽灵依赖</td>
            <td>可能出现</td>
            <td>可能出现</td>
            <td>不会</td>
            <td>不会（默认严格）</td>
          </tr>
          <tr>
            <td>锁文件</td>
            <td>package-lock.json</td>
            <td>yarn.lock</td>
            <td>yarn.lock</td>
            <td>pnpm-lock.yaml</td>
          </tr>
          <tr>
            <td>Monorepo / workspace</td>
            <td>支持</td>
            <td>支持</td>
            <td>支持</td>
            <td>支持（体验最佳）</td>
          </tr>
        </tbody>
      </table>

      <Example title="同一个安装命令，三家怎么写">
        <p>装一个生产依赖、一个开发依赖，再严格按锁文件安装：</p>
        <p>
          <strong>npm</strong>：<code>npm i axios</code> / <code>npm i -D vitest</code> / <code>npm ci</code>
        </p>
        <p>
          <strong>yarn</strong>：<code>yarn add axios</code> / <code>yarn add -D vitest</code> /
          <code>yarn install --frozen-lockfile</code>
        </p>
        <p>
          <strong>pnpm</strong>：<code>pnpm add axios</code> / <code>pnpm add -D vitest</code> /
          <code>pnpm install --frozen-lockfile</code>
        </p>
      </Example>

      <h2>六、边界与实务建议</h2>
      <p>
        没有银弹，但有默认推荐。<strong>新项目优先 pnpm</strong>：省盘、快、默认严格，能从一开始就堵住幽灵依赖。
        <strong>已有 npm / yarn 项目</strong>不必为了切而切——团队里统一一种、把锁文件提交进库、CI 用 frozen 安装，
        比用哪一家更重要。需要注意的边界：pnpm 的严格结构偶尔会让某些「依赖了幽灵依赖」的老旧包装不起来，
        这时可用 <code>.npmrc</code> 里的 hoist 配置临时放宽；多个包管理器的锁文件
        <strong>不要混用</strong>，一个仓库只留一种。
      </p>
      <Callout variant="note" title="一个仓库只用一种包管理器">
        同时存在 <code>package-lock.json</code> 和 <code>pnpm-lock.yaml</code> 是常见事故源：
        不同人用不同工具装，装出不一致的依赖，「在我机器上能跑」又回来了。
        可以用 <code>packageManager</code> 字段 + Corepack 把团队锁定到同一个包管理器及版本。
      </Callout>

      <Callout variant="tip">
        下一章我们把视角从「单个项目」放大到「一个仓库管很多包」：用 pnpm workspace 组织 Monorepo，
        再用 Turborepo 做任务编排与缓存。你会看到本章学到的 <code>workspace:*</code> 协议与严格依赖，
        如何成为 Monorepo 顺畅运转的基础。
      </Callout>

      <Summary
        points={[
          'package.json 是项目身份证：dependencies 运行时用、devDependencies 仅开发构建用、peerDependencies 由宿主提供（库常用，避免重复实例）。',
          '版本范围基于 SemVer（主.次.修订）：^ 锁主版本、~ 锁主+次只放开修订；scripts 用 npm run 触发。',
          'node_modules 从嵌套演进到扁平化（依赖提升）：省了重复安装，却带来幽灵依赖（用了没声明的包）与分身依赖（同包多版本多副本）。',
          'lockfile（package-lock / yarn.lock / pnpm-lock）钉死实际版本与校验和，保证确定性安装；CI 用 npm ci / --frozen-lockfile。',
          'pnpm = 全局内容寻址存储 + 硬链接（省空间、装得快）+ 符号链接严格结构（顶层只暴露已声明依赖，杜绝幽灵依赖）。',
          '选型：新项目优先 pnpm；关键是团队统一一种、提交锁文件、CI 用 frozen 安装，且一个仓库只用一种包管理器。',
        ]}
      />
    </article>
  )
}
