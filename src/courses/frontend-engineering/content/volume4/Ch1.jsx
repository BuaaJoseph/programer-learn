import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const eslintFlatConfig = `// eslint.config.js —— 新的扁平配置（flat config）
// 从 ESLint 9 起，这是默认且推荐的配置形态：导出一个数组，
// 数组里每个对象就是一段「对哪些文件、用哪些规则」的配置。
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default [
  // 1) 官方推荐的 JS 基础规则集
  js.configs.recommended,

  // 2) 针对项目源码的自定义段
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser }, // 声明 window/document 等全局变量
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks, // 插件：把额外规则「装」进 ESLint
    },
    rules: {
      'no-unused-vars': 'warn',          // 未使用变量 → 警告
      'no-undef': 'error',               // 用了未声明的变量 → 报错
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],     // 强制用 === 而非 ==
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  // 3) 放最后：关掉所有与 Prettier 冲突的「格式类」规则
  prettier,

  // 4) 忽略不该被检查的目录
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**'],
  },
]`

const prettierConfig = `// .prettierrc.json —— Prettier 只关心「长什么样」
{
  "semi": false,            // 行尾不加分号
  "singleQuote": true,      // 用单引号
  "trailingComma": "all",   // 多行结构尾随逗号
  "printWidth": 80,         // 每行最大宽度，超了就换行
  "tabWidth": 2,            // 缩进 2 空格
  "arrowParens": "always"   // 箭头函数参数总是带括号
}`

const ruleSeverity = `// 规则的三档严重级别
{
  "rules": {
    "no-debugger": "off",    // 0 关闭：不检查
    "no-unused-vars": "warn", // 1 警告：黄字提示，不阻断
    "no-undef": "error"      // 2 报错：红字，CI 里会让构建失败
  }
}`

const fixCommands = `# 只检查，不改动文件：把问题打印出来
npx eslint .

# 自动修复「可修复」的问题（如缺分号、可删的多余括号）
npx eslint . --fix

# 用 Prettier 把整个项目按格式规则重排一遍
npx prettier --write .

# 只检查格式是否达标（CI 里常用，不达标就退出码非 0）
npx prettier --check .`

const editorSettings = `// .vscode/settings.json —— 保存即修复
{
  // 保存时让 Prettier 接管格式化
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  // 保存时顺手跑一遍 ESLint 的自动修复
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        代码写出来「能跑」只是起点。一个多人协作、长期维护的前端项目，真正消耗精力的往往是
        那些<strong>本可避免的低级错误</strong>（用了没声明的变量、留下一堆没用的 import）
        和<strong>无休止的格式争论</strong>（用不用分号、单引号还是双引号、缩进 2 格还是 4 格）。
        这一章我们讲清楚两个最核心的工具——<strong>ESLint</strong> 与 <strong>Prettier</strong>：
        它们各自管什么、为什么要分工、底层原理是什么，以及怎么配置才能不打架、还能在保存时自动生效。
      </Lead>

      <h2>一、两个问题，两件工具</h2>
      <p>
        先把概念分清楚。代码的「好坏」其实是两个互相独立的维度：
      </p>
      <ul>
        <li>
          <strong>质量 / 正确性</strong>：这段代码有没有可能的 bug、有没有坏味道（code smell）？
          比如声明了却没用的变量、永远为真的判断、忘了 <code>await</code> 的异步调用。
          这是 <strong>ESLint</strong> 的领域。
        </li>
        <li>
          <strong>格式 / 排版</strong>：这段代码长什么样？缩进几格、字符串用单还是双引号、
          一行太长怎么折行。这<strong>不影响逻辑对错</strong>，只影响一致性与可读性。
          这是 <strong>Prettier</strong> 的领域。
        </li>
      </ul>
      <KeyIdea>
        一句话记住分工：<strong>ESLint 管「对不对」，Prettier 管「美不美」</strong>。
        前者是静态分析器（linter），找的是逻辑层面的问题；后者是格式化器（formatter），
        只按固定规则重排版面，从不评判你的逻辑。让它们各司其职，是这一章所有配置的出发点。
      </KeyIdea>

      <h2>二、ESLint 在做什么：静态分析找问题</h2>
      <p>
        ESLint 是一个<strong>静态分析</strong>工具——「静态」意味着它<strong>不运行你的代码</strong>，
        只是读源码本身，就能找出一类问题。它能发现的典型问题包括：
      </p>
      <ul>
        <li><strong>未使用的变量 / 导入</strong>：声明了 <code>const x = 1</code> 却从没用过。</li>
        <li><strong>误用</strong>：使用了一个从未声明的变量（拼错了名字），ESLint 会报 <code>no-undef</code>。</li>
        <li>
          <strong>可疑写法</strong>：用 <code>==</code> 而非 <code>===</code> 导致隐式类型转换、
          在循环里误用闭包、不小心写了 <code>if (a = b)</code> 这种把赋值当判断的笔误。
        </li>
        <li><strong>风格约定</strong>：是否强制函数必须有返回、是否禁止 <code>console.log</code> 进生产代码。</li>
      </ul>

      <h3>原理：解析成 AST，规则在树上匹配</h3>
      <p>
        ESLint 凭什么「读得懂」代码？关键在 <strong>AST（抽象语法树，Abstract Syntax Tree）</strong>。
        它的工作流程是这样的：
      </p>
      <ul>
        <li>① <strong>解析（parse）</strong>：把源码字符串交给解析器，转成一棵结构化的语法树。
          比如 <code>const x = 1</code> 会变成一个「变量声明」节点，下面挂着标识符 <code>x</code> 和数字字面量 <code>1</code>。</li>
        <li>② <strong>遍历（traverse）</strong>：ESLint 从树根开始走遍每一个节点。</li>
        <li>③ <strong>匹配（match）</strong>：每条规则其实是一个监听器，声明「我关心哪类节点」。
          走到对应节点时规则被触发，检查这个节点是否违规。</li>
        <li>④ <strong>报告（report）</strong>：违规就记录一条问题（含文件、行列、规则名、信息）。</li>
      </ul>
      <p>
        举个例子：<code>no-unused-vars</code> 规则会收集所有变量声明节点，再看整棵树里有没有
        引用它们的节点；一个都没有，就报告「该变量未被使用」。因为是在树结构上做精确匹配，
        ESLint 能做到比「文本搜索」精准得多——它知道 <code>const x</code> 里的 <code>x</code> 是变量，
        而字符串 <code>{"'x'"}</code> 里的 x 不是。
      </p>

      <h3>规则与严重级别</h3>
      <p>
        ESLint 的能力由一条条<strong>规则（rule）</strong>构成，每条规则可设三档严重级别：
        <code>off</code>（0，关闭）、<code>warn</code>（1，警告，不阻断）、<code>error</code>（2，报错，
        在 CI 里通常会让流程失败）。
      </p>
      <CodeBlock lang="json" title="规则的三档严重级别" code={ruleSeverity} />

      <h3>自动修复：--fix</h3>
      <p>
        很多规则不仅能<strong>发现</strong>问题，还能<strong>自动修复</strong>。这类规则在内部提供了
        「该怎么改」的信息，运行 <code>eslint . --fix</code> 时 ESLint 会就地改写源码。
        要注意：并非所有规则都可自动修复——能自动删的多是确定性的小问题（多余分号、可删空格），
        而像「这个变量没用」这种，删不删、怎么删需要人判断，通常只警告不自动改。
      </p>

      <h3>插件与共享配置</h3>
      <p>
        ESLint 核心只内置了通用 JS 规则。要检查 React、TypeScript、可访问性这些特定领域，
        就靠两类扩展：
      </p>
      <ul>
        <li>
          <strong>插件（plugin）</strong>：一包额外的规则。比如 <code>eslint-plugin-react-hooks</code>
          带来「Hooks 必须在顶层调用」这类只有 React 才需要的规则。插件提供规则，但默认不开启。
        </li>
        <li>
          <strong>共享配置（shareable config）</strong>：别人调好的一套规则组合，你直接引入即可。
          比如 <code>js.configs.recommended</code> 就是 ESLint 官方推荐的基础规则集。
        </li>
      </ul>

      <h3>新的扁平配置 flat config</h3>
      <p>
        从 ESLint 9 起，默认且推荐的配置形态是 <strong>flat config</strong>——一个名为
        <code>eslint.config.js</code> 的文件，导出一个<strong>数组</strong>。数组里每个对象描述
        「对哪些文件（<code>files</code>）、用哪些规则（<code>rules</code>）、装哪些插件（<code>plugins</code>）」。
        相比旧的 <code>.eslintrc</code> + 层层继承的 <code>extends</code>，扁平配置更直观：
        配置就是按顺序合并的数组，后面的能覆盖前面的，没有隐藏的继承魔法。
      </p>
      <CodeBlock lang="js" title="eslint.config.js（扁平配置示例）" code={eslintFlatConfig} />
      <Callout variant="tip" title="顺序很重要">
        flat config 是数组，<strong>后面的对象会覆盖前面的同名规则</strong>。所以把
        <code>eslint-config-prettier</code> 放在数组<strong>最后</strong>，才能保证它关掉的格式类规则
        不会又被前面的配置打开。这也是下一节「避免打架」的关键。
      </Callout>

      <h2>三、Prettier 在做什么：只管统一格式</h2>
      <p>
        Prettier 是一个<strong>固执的（opinionated）格式化器</strong>。它的工作方式很极端：
        把你的代码<strong>解析成 AST，然后完全丢掉原来的排版，按自己的规则重新打印一遍</strong>。
        也就是说，无论你原本缩进多乱、引号多杂，Prettier 输出的结果都是统一的。
      </p>
      <p>它管的东西非常有限，且<strong>只关于外观</strong>：</p>
      <ul>
        <li>缩进用几个空格、用空格还是 Tab；</li>
        <li>字符串用单引号还是双引号；</li>
        <li>行尾加不加分号；</li>
        <li>一行最多多宽、超了怎么折行；</li>
        <li>对象 / 数组多行时尾随逗号要不要加。</li>
      </ul>
      <p>
        它<strong>从不</strong>评判你的逻辑：不会告诉你变量没用、不会提醒你少了 <code>await</code>。
        这正是它和 ESLint 的根本区别。它的配置也因此极少——Prettier 的哲学就是「少给选项，
        减少争论」。
      </p>
      <CodeBlock lang="json" title=".prettierrc.json（格式配置示例）" code={prettierConfig} />
      <Example title="Prettier 重排前后">
        <p>
          输入（乱七八糟）：<code>{"const obj = {a:1 ,  b :2}"}</code>
        </p>
        <p>
          按上面配置输出：<code>{"const obj = { a: 1, b: 2 }"}</code>
          —— 加了空格、统一了风格，但 <strong>逻辑分毫未动</strong>。
        </p>
      </Example>

      <h2>四、为什么要分工，以及如何避免打架</h2>
      <p>
        既然 ESLint 也能管一些格式（它确实内置了 <code>indent</code>、<code>quotes</code> 这类格式规则），
        为什么还要 Prettier？因为<strong>专业的事交给专业的工具</strong>：用 ESLint 维护格式，
        意味着要逐条配几十个格式规则、还得处理它们彼此的冲突；而 Prettier 一个工具、几行配置
        就把整个格式问题包圆了，且<strong>团队里每个人输出完全一致</strong>。
      </p>
      <KeyIdea>
        让 ESLint <strong>专注质量</strong>、Prettier <strong>专注格式</strong>，是当下社区的共识做法。
        二者职责不重叠，配合才顺畅。
      </KeyIdea>
      <p>
        但这里有个经典坑：ESLint 自带的格式规则会和 Prettier <strong>打架</strong>。
        比如 ESLint 规则要求「行尾必须有分号」，而 Prettier 配成了「不加分号」——
        于是 Prettier 删掉分号，ESLint 立刻又报错，编辑器里红黄波浪线反复横跳。
      </p>
      <p>
        解法是引入 <strong><code>eslint-config-prettier</code></strong>：它本身不加任何规则，
        而是<strong>把 ESLint 里所有「格式类」规则统统关掉</strong>，从而把格式的话语权
        完全交给 Prettier。把它放在 flat config 数组的<strong>最后</strong>（见上一节的 Callout），
        冲突就消失了——ESLint 只剩下管质量的规则，Prettier 独占格式。
      </p>

      <h3>ESLint vs Prettier 职责对比</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>ESLint</th><th>Prettier</th></tr>
        </thead>
        <tbody>
          <tr><td>定位</td><td>静态分析器（linter）</td><td>格式化器（formatter）</td></tr>
          <tr><td>关心</td><td>代码质量 / 可能的 bug / 坏味道</td><td>排版外观（缩进 / 引号 / 换行）</td></tr>
          <tr><td>会不会评判逻辑</td><td>会（这是它的本职）</td><td>不会，只重排版面</td></tr>
          <tr><td>典型发现</td><td>未用变量、用了未声明的变量、<code>==</code> 误用</td><td>缩进不齐、引号不统一、行太长</td></tr>
          <tr><td>工作方式</td><td>AST 上跑规则并报告</td><td>解析后丢掉原排版、重新打印</td></tr>
          <tr><td>配置量</td><td>多（规则 / 插件 / 共享配置）</td><td>极少（刻意减少选项）</td></tr>
          <tr><td>自动修复</td><td><code>--fix</code>，部分规则可修</td><td><code>--write</code>，几乎总能重排</td></tr>
          <tr><td>冲突处理</td><td>用 <code>eslint-config-prettier</code> 关掉格式规则</td><td>独占格式话语权</td></tr>
        </tbody>
      </table>

      <h2>五、命令行：检查与修复</h2>
      <p>
        日常你会用到这几条命令。检查类命令在 CI 里很有用（不达标就退出码非 0、让流水线失败），
        修复类命令则在本地一键整理。
      </p>
      <CodeBlock lang="bash" title="常用命令" code={fixCommands} />
      <Callout variant="warn" title="--fix 与 --write 会改文件">
        自动修复命令会<strong>就地改写源码</strong>。第一次在老项目上跑之前，先确保改动已提交到 git，
        这样万一改坏了可以一键还原。也建议先 <code>--check</code> 看看影响范围，再决定 <code>--write</code>。
      </Callout>

      <h2>六、编辑器保存即修复</h2>
      <p>
        命令行适合 CI 和批量处理，但开发时最舒服的是<strong>保存即修复</strong>：一按 Ctrl/Cmd+S，
        Prettier 自动把格式排好、ESLint 自动修掉能修的问题。在 VS Code 里这样配：
      </p>
      <CodeBlock lang="json" title=".vscode/settings.json" code={editorSettings} />
      <p>
        这样做的好处是<strong>把规范前移到了「写代码的当下」</strong>：你几乎感觉不到它存在，
        代码却始终保持整洁。配合后面一章会讲的 Git hooks，就形成了「编辑器即时修 → 提交前再把关」
        的多重保障。
      </p>
      <Callout variant="tip">
        团队协作时，把 <code>eslint.config.js</code>、<code>.prettierrc.json</code> 和
        <code>.vscode/settings.json</code> 都<strong>提交进仓库</strong>，并在 README 里写清推荐插件。
        这样每个人 clone 下来就是同一套标准，新人入职零配置即可上手。
      </Callout>

      <h2>七、小结与下一步</h2>
      <p>
        到这里，你应该能清楚地区分「质量」和「格式」这两件事，并知道用哪个工具、怎么配、为什么
        要这么配。但有一个现实问题还没解决：<strong>这些规范靠开发者「自觉」去跑，并不可靠</strong>——
        总有人忘了保存格式、忘了跑 lint 就提交了。下一章我们就用 Git hooks 把这套检查
        <strong>自动化、强制化</strong>，让不合规范的代码根本提交不进去。
      </p>

      <Summary
        points={[
          'ESLint 管「对不对」（质量 / 可能的 bug / 坏味道），Prettier 管「美不美」（缩进 / 引号 / 换行），两者职责互不重叠。',
          'ESLint 是静态分析器：把源码解析成 AST，规则作为监听器在节点上匹配并报告问题，因此比文本搜索精准得多。',
          'ESLint 规则有 off / warn / error 三档；部分规则可用 --fix 自动修复；能力靠插件（提供规则）与共享配置（现成规则组合）扩展。',
          'ESLint 9 默认用 flat config（eslint.config.js 导出数组），按顺序合并、后者覆盖前者，比旧 .eslintrc 的继承更直观。',
          'Prettier 是固执的格式化器：解析后丢掉原排版、按固定规则重新打印，只管外观、从不评判逻辑，配置刻意极少。',
          '用 eslint-config-prettier（放数组最后）关掉 ESLint 的格式类规则，避免二者打架；再配 .vscode 保存即修复，把规范前移到写代码当下。',
        ]}
      />
    </article>
  )
}
