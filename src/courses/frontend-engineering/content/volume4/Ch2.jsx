import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const huskyInit = `# 1) 安装 husky（管理 git hooks）和 lint-staged（只查暂存文件）
npm install --save-dev husky lint-staged

# 2) 初始化 husky：会创建 .husky/ 目录并接管 git hooks
npx husky init

# 3) init 默认在 .husky/pre-commit 里写了 "npm test"，
#    我们把它改成跑 lint-staged（见下文）`

const huskyPreCommit = `#!/usr/bin/env sh
# .husky/pre-commit —— 提交前自动执行
# 只对「本次暂存的改动文件」跑 lint / format，速度快
npx lint-staged`

const lintStagedConfig = `// package.json 片段：lint-staged 配置
{
  "lint-staged": {
    // 对暂存的 js/jsx：先用 ESLint 修，再用 Prettier 排版
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    // 对暂存的样式 / 配置 / 文档：只跑 Prettier
    "*.{css,json,md}": [
      "prettier --write"
    ]
  }
}`

const commitlintConfig = `// commitlint.config.js —— 校验提交信息是否符合规范
export default {
  // 继承 Conventional Commits 的官方规则集
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 可在此覆盖默认规则，例如限制标题最大长度
    'header-max-length': [2, 'always', 72],
  },
}`

const commitMsgHook = `#!/usr/bin/env sh
# .husky/commit-msg —— 写完提交信息后校验它
# $1 是 git 传进来的、存放提交信息的临时文件路径
npx --no-install commitlint --edit "$1"`

const prePushHook = `#!/usr/bin/env sh
# .husky/pre-push —— 推送前跑一遍单元测试，挡住会让 CI 变红的提交
npm run test`

const packageScripts = `// package.json —— 相关脚本与依赖一览
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9",
    "lint-staged": "^15",
    "@commitlint/cli": "^19",
    "@commitlint/config-conventional": "^19"
  }
}`

const commitExamples = `# 符合 Conventional Commits 的提交信息
feat(auth): 支持手机号验证码登录
fix(cart): 修复优惠券叠加时金额算错的问题
docs(readme): 补充本地启动步骤
chore(deps): 升级 vite 到 6.0
refactor(api): 抽出统一的请求拦截器
# 带破坏性变更的写法（会触发大版本号 +1）
feat(api)!: 移除已废弃的 v1 接口`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们配好了 ESLint 和 Prettier。但有个致命前提：它们得有人去<strong>跑</strong>才有用。
        现实是——总有人赶进度时忘了格式化、忘了跑 lint，一段不合规范、甚至跑不过测试的代码
        就这么提交、推送、合并了。这一章解决的就是这个问题：<strong>不靠自觉，靠自动</strong>。
        我们用 Git hooks 把检查挂到「提交」「推送」这些动作上，再配合提交信息规范和测试集成，
        建起一道「本地把关 + CI 兜底」的双层防线。
      </Lead>

      <h2>一、为什么「自觉」靠不住</h2>
      <p>
        规范文档写得再漂亮，执行全靠人记，就一定会漏。原因不是人懒，而是人会忘、会赶时间、
        会觉得「这次就这一行，应该没事」。一旦坏代码进了主分支，后果是<strong>连锁</strong>的：
        别人拉下来发现格式炸了、CI 红了、review 时满屏都是格式噪音盖住了真正要看的逻辑改动。
      </p>
      <KeyIdea>
        规范要可靠，就必须<strong>自动执行、强制生效</strong>——把检查变成提交 / 推送流程里
        绕不过去的一环。让机器在恰当的时机自动拦截，而不是指望每个人每次都记得手动跑。
      </KeyIdea>

      <h2>二、Git hooks 是什么</h2>
      <p>
        Git 在执行某些操作时，会<strong>自动触发对应的脚本</strong>，这些脚本就叫
        <strong>Git hooks（钩子）</strong>。它们躺在仓库的 <code>.git/hooks</code> 目录里，
        在特定时机被 Git 调用。常用的几个：
      </p>
      <table>
        <thead>
          <tr><th>Hook</th><th>触发时机</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>pre-commit</code></td><td><code>git commit</code> 真正记录前</td><td>跑 lint / format，不过就阻止提交</td></tr>
          <tr><td><code>commit-msg</code></td><td>提交信息写好之后</td><td>校验提交信息格式是否合规</td></tr>
          <tr><td><code>pre-push</code></td><td><code>git push</code> 发送前</td><td>跑单元测试，挡住会让 CI 变红的提交</td></tr>
        </tbody>
      </table>
      <p>
        关键特性是：如果 hook 脚本以<strong>非 0 退出码</strong>结束，Git 就会<strong>中止</strong>
        当前操作。所以 <code>pre-commit</code> 里的 lint 一旦报错，这次 commit 直接被拦下——
        坏代码根本进不来。这正是「强制执行」的机制来源。
      </p>
      <Callout variant="warn" title="原生 hooks 不随仓库共享">
        <code>.git/hooks</code> 目录<strong>不会被 git 跟踪</strong>，clone 时也带不走。
        所以直接手写脚本到那里，别人是拿不到的。这正是我们需要 husky 的原因——
        它把 hooks 放到仓库里被跟踪的 <code>.husky/</code> 目录，让团队所有人自动共享同一套钩子。
      </Callout>

      <h2>三、用 husky 管理 hooks</h2>
      <p>
        <strong>husky</strong> 是管理 Git hooks 的事实标准工具。它做两件事：把 hooks 脚本放进
        被仓库跟踪的 <code>.husky/</code> 目录，并通过配置让 git 去那里找 hooks。这样别人
        <code>npm install</code> 后（借助 <code>prepare</code> 脚本）就自动装好了相同的钩子。
      </p>
      <CodeBlock lang="bash" title="安装并初始化 husky" code={huskyInit} />
      <p>
        <code>npx husky init</code> 会创建 <code>.husky/</code> 目录、写一个示例 <code>pre-commit</code>，
        并往 <code>package.json</code> 里加一条 <code>"prepare": "husky"</code> 脚本——
        <code>prepare</code> 会在每次 <code>npm install</code> 后自动运行，确保 hooks 始终就位。
      </p>

      <h2>四、用 lint-staged 只查暂存文件</h2>
      <p>
        如果 <code>pre-commit</code> 里直接跑 <code>eslint .</code>，会去检查<strong>整个项目</strong>——
        大项目里这可能要等十几秒，每次提交都卡一下，体验很差，而且你这次根本没改的文件
        也被一起查了，没必要。
      </p>
      <p>
        <strong>lint-staged</strong> 解决这个问题：它只对<strong>本次 git 暂存（staged）的改动文件</strong>
        跑你指定的命令。你只改了 3 个文件，它就只查这 3 个，<strong>快得多</strong>。
        而且它跑完 <code>--fix</code> / <code>--write</code> 后会把修好的内容自动重新 <code>git add</code>，
        保证「修复后的版本」才是真正被提交的版本。
      </p>
      <CodeBlock lang="bash" title=".husky/pre-commit" code={huskyPreCommit} />
      <CodeBlock lang="json" title="package.json 里的 lint-staged 配置" code={lintStagedConfig} />
      <Example title="lint-staged 在一次提交里做了什么">
        <p>
          你 <code>git add</code> 了 <code>a.jsx</code> 和 <code>style.css</code>，然后 <code>git commit</code>：
        </p>
        <ul>
          <li>对 <code>a.jsx</code>：先 <code>eslint --fix</code> 再 <code>prettier --write</code>；</li>
          <li>对 <code>style.css</code>：只 <code>prettier --write</code>；</li>
          <li>修复后的内容被自动重新暂存，没问题就放行提交；ESLint 报出无法自动修的错误，则中止提交。</li>
        </ul>
      </Example>

      <h2>五、提交信息规范：Conventional Commits</h2>
      <p>
        提交信息写成「改了点东西」「fix bug」「update」，等到要查历史、出 changelog 时就是灾难。
        <strong>Conventional Commits</strong> 是一套被广泛采用的提交信息规范，它要求每条信息有固定结构：
      </p>
      <p>
        <code>{'<类型>(<可选范围>): <简短描述>'}</code>
      </p>
      <p>常见的<strong>类型（type）</strong>及其含义：</p>
      <table>
        <thead>
          <tr><th>类型</th><th>含义</th><th>影响语义化版本</th></tr>
        </thead>
        <tbody>
          <tr><td><code>feat</code></td><td>新增功能</td><td>次版本号 +1（minor）</td></tr>
          <tr><td><code>fix</code></td><td>修复 bug</td><td>修订号 +1（patch）</td></tr>
          <tr><td><code>docs</code></td><td>只改文档</td><td>不影响</td></tr>
          <tr><td><code>style</code></td><td>格式调整（不影响逻辑）</td><td>不影响</td></tr>
          <tr><td><code>refactor</code></td><td>重构（既非新功能也非修 bug）</td><td>不影响</td></tr>
          <tr><td><code>test</code></td><td>新增 / 调整测试</td><td>不影响</td></tr>
          <tr><td><code>chore</code></td><td>杂务（依赖升级、构建配置等）</td><td>不影响</td></tr>
        </tbody>
      </table>
      <p>
        遵循它的两大好处：① <strong>自动生成 changelog</strong>——工具能按类型把提交归类成
        「新功能 / 修复 / 其他」；② <strong>语义化版本（SemVer）</strong>——工具能据此自动决定
        版本号怎么涨：<code>fix</code> 升修订号、<code>feat</code> 升次版本号，
        而带 <code>!</code> 或脚注 <code>BREAKING CHANGE</code> 的破坏性变更升主版本号。
      </p>
      <CodeBlock lang="bash" title="合规的提交信息示例" code={commitExamples} />

      <h3>用 commitlint 在 commit-msg 校验</h3>
      <p>
        规范同样不能靠自觉。<strong>commitlint</strong> 负责检查每条提交信息是否符合
        Conventional Commits。把它挂到 <code>commit-msg</code> hook 上：你写完提交信息后，
        commitlint 立刻校验，不合规就<strong>拒绝这次提交</strong>。
      </p>
      <CodeBlock lang="js" title="commitlint.config.js" code={commitlintConfig} />
      <CodeBlock lang="bash" title=".husky/commit-msg" code={commitMsgHook} />
      <Callout variant="tip">
        <code>commit-msg</code> hook 收到的 <code>$1</code> 是 git 传入的、存放本次提交信息的
        临时文件路径，<code>commitlint --edit "$1"</code> 就是去读这个文件来校验。
        所以乱写一句 <code>update</code> 会当场被打回，倒逼大家把信息写规范。
      </Callout>

      <h2>六、把测试接进流程</h2>
      <p>
        lint 和提交规范守住了「质量」与「记录」，但代码到底跑不跑得通，还得靠测试。
        测试通常比 lint 慢，所以放在更合适的时机：
      </p>
      <ul>
        <li>
          <strong>pre-push</strong>：推送前在本地跑一遍单元测试。比 CI 反馈快，能在代码离开你机器前
          就挡住明显的失败，避免「推上去才发现 CI 红了」。
        </li>
        <li>
          <strong>CI（持续集成）</strong>：代码推到远端后，在服务器上跑<strong>完整</strong>的测试与构建。
          这是最终的、不可绕过的关卡。
        </li>
      </ul>
      <CodeBlock lang="bash" title=".husky/pre-push" code={prePushHook} />

      <h2>七、双层防线：本地把关 + CI 兜底</h2>
      <p>
        把以上串起来，就是一套成熟的纵深防御。要理解为什么<strong>两层都要</strong>：本地 hooks 快、
        反馈即时，但<strong>可以被绕过</strong>——开发者用 <code>git commit --no-verify</code>
        就能跳过所有 hooks；而且 hooks 依赖每个人本地装好环境。所以本地这层是「第一时间提醒」，
        真正<strong>不可绕过</strong>的是 CI：它在服务器上运行，是合并进主分支前的最终裁判。
      </p>
      <KeyIdea>
        本地 hooks 求「快」（即时反馈、体验好），CI 求「稳」（不可绕过、最终把关）。
        两层互补：本地拦掉绝大多数低级问题，CI 兜住一切漏网之鱼。缺了 CI 这层，
        一个 <code>--no-verify</code> 就能让前面所有努力归零。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>层</th><th>位置</th><th>速度</th><th>能否绕过</th><th>职责</th></tr>
        </thead>
        <tbody>
          <tr><td>本地 hooks</td><td>开发者机器</td><td>快</td><td>能（--no-verify）</td><td>即时拦截低级问题</td></tr>
          <tr><td>CI</td><td>服务器</td><td>慢但完整</td><td>不能</td><td>合并前最终把关</td></tr>
        </tbody>
      </table>
      <p>下面是把这套工具连起来后，<code>package.json</code> 里相关脚本与依赖的样子：</p>
      <CodeBlock lang="json" title="package.json（脚本与依赖一览）" code={packageScripts} />
      <Callout variant="warn" title="--no-verify 不是常态用法">
        <code>git commit --no-verify</code> 能跳过 hooks，仅限紧急情况（如修复线上故障时）临时使用。
        日常依赖它会让本地防线形同虚设。正因为它的存在，<strong>CI 上的同等检查必须配齐</strong>——
        这样即便本地被跳过，坏代码也进不了主分支。
      </Callout>

      <h2>八、小结</h2>
      <p>
        这一章我们把上一章的规范从「靠自觉」升级成了「自动强制」：Git hooks 在提交 / 推送时自动触发，
        husky 让钩子能被团队共享，lint-staged 让提交前检查又快又准，commitlint 守住提交信息规范，
        测试则在 pre-push 与 CI 两道关卡上把关。规范一旦自动化，就不再依赖任何人的记性，
        代码质量才真正稳得住。
      </p>

      <Summary
        points={[
          '规范不能靠自觉，要自动执行、强制生效——把检查挂到提交 / 推送动作上，让坏代码绕不过去。',
          'Git hooks 在特定时机自动触发脚本，非 0 退出即中止操作；常用 pre-commit（lint）、commit-msg（校验信息）、pre-push（测试）。',
          '原生 hooks 不随仓库共享，用 husky 把钩子放进被跟踪的 .husky/ 目录，配合 prepare 脚本让团队自动共享。',
          'lint-staged 只对暂存的改动文件跑 lint / format，又快又准，并把修复结果自动重新暂存。',
          'Conventional Commits 用 feat/fix/chore... 等类型规范提交信息，便于自动生成 changelog 与语义化版本；用 commitlint 在 commit-msg 校验。',
          '测试放在 pre-push（本地快反馈）与 CI（服务器最终把关）；本地 hooks 可被 --no-verify 绕过，所以必须有 CI 兜底，形成双层防线。',
        ]}
      />
    </article>
  )
}
