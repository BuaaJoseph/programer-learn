import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const inlineScriptSnippet = `<!-- 最原始的方式：直接把 JS 写进网页 -->
<!DOCTYPE html>
<html>
  <body>
    <button onclick="sayHi()">点我</button>

    <script>
      function sayHi() {
        alert("你好！")
      }
    </script>
  </body>
</html>`

const globalMessSnippet = `<!-- 多个脚本靠全局变量「打招呼」，很容易撞名 -->
<script src="a.js"></script>  <!-- 里面定义了 var util = ... -->
<script src="b.js"></script>  <!-- 里面又定义了 var util = ...，把 a 覆盖了！ -->
<script src="main.js"></script> <!-- 顺序还必须人工保证对 -->`

const esmSnippet = `// math.js —— 用 export 导出
export function add(a, b) {
  return a + b
}

export const PI = 3.14159

// 默认导出（一个模块只能有一个）
export default function multiply(a, b) {
  return a * b
}`

const esmImportSnippet = `// main.js —— 用 import 引入别的模块
import multiply, { add, PI } from "./math.js"
//     ^默认导出   ^具名导出（用花括号）

console.log(add(2, 3))      // 5
console.log(PI)             // 3.14159
console.log(multiply(4, 5)) // 20

// 也可以整体引入，挂到一个命名空间下
import * as math from "./math.js"
console.log(math.add(1, 1)) // 2`

const packageJsonSnippet = `{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}`

const tsSnippet = `// TypeScript：给 JS 加上类型注解

// 参数和返回值都标了类型
function greet(name: string): string {
  return "你好, " + name
}

interface User {
  id: number
  name: string
  active?: boolean   // 问号表示可选
}

const u: User = { id: 1, name: "Ada" }

// greet(123)  // 编译期就报错：number 不能赋给 string —— 提前抓出 bug`

const npmCmdSnippet = `# 初始化项目，生成 package.json
npm init -y

# 安装一个运行时依赖（写进 dependencies）
npm install react

# 安装一个开发期依赖（写进 devDependencies）
npm install -D typescript eslint prettier

# 运行 package.json 里 scripts 定义的命令
npm run dev

# pnpm 用法几乎一致，但用硬链接共享依赖，更省磁盘、更快
pnpm install
pnpm add react`

export default function Ch2() {
  return (
    <article>
      <Lead>
        今天打开任何一个真实的 JS 项目，你都会看到一堆配置文件：<code>package.json</code>、
        <code>vite.config.js</code>、<code>tsconfig.json</code>、<code>.eslintrc</code>……
        初学者很容易被这套「工具链」劝退。这一章我们不背配置，而是讲清楚一件事：
        <strong>这些工具分别解决了什么痛点、它们是怎么一步步演化出来的、彼此又如何衔接</strong>。
        理解了「为什么需要它们」，你再看那些配置就不再是天书。
      </Lead>

      <h2>一、起点：把 JS 写进 &lt;script&gt; 标签</h2>
      <p>
        最早的 JS 就一种用法：在 HTML 里写一个 <code>{'<script>'}</code> 标签，
        把代码塞进去，浏览器加载页面时顺带执行。要么内联写在标签里，
        要么用 <code>{'<script src="...">'}</code> 引入一个外部 <code>.js</code> 文件。
      </p>
      <CodeBlock lang="html" title="最原始的内联脚本" code={inlineScriptSnippet} />
      <p>
        项目小的时候这没问题。但随着代码变多，问题就来了：所有脚本共享<strong>同一个全局作用域</strong>，
        不同文件里的变量、函数很容易<strong>同名冲突</strong>，后加载的悄悄覆盖先加载的；
        而且文件之间的<strong>依赖顺序</strong>必须靠人工在 HTML 里排好——A 用到了 B 的函数，
        就必须保证 B 的 <code>{'<script>'}</code> 写在 A 前面。项目一大，这种管理方式立刻崩盘。
      </p>
      <CodeBlock lang="html" title="全局变量打架与手工排序的噩梦" code={globalMessSnippet} />
      <KeyIdea>
        现代 JS 工程链上的每一块工具，本质上都是在解决「项目规模变大后」冒出来的某个具体痛点：
        命名冲突、依赖管理、浏览器兼容、类型安全、代码风格统一。
        把它们串起来，就是从一个 <code>{'<script>'}</code> 标签到一条工程流水线的进化史。
      </KeyIdea>

      <h2>二、模块化（ESM）：解决「全局打架」</h2>
      <p>
        为了根治全局变量冲突和依赖顺序问题，JS 在 ES6（2015）引入了官方的
        <strong>模块系统（ES Modules，简称 ESM）</strong>。核心思想很简单：
        <strong>每个文件是一个独立模块，有自己的作用域</strong>；要把东西给别人用，就用
        <code>export</code> 显式导出；要用别人的东西，就用 <code>import</code> 显式引入。
        文件之间的依赖关系写在代码里，清清楚楚，不再靠 HTML 里的顺序。
      </p>
      <CodeBlock lang="js" title="用 export 把功能导出" code={esmSnippet} />
      <CodeBlock lang="js" title="用 import 引入别的模块" code={esmImportSnippet} />
      <Callout variant="note" title="具名导出 vs 默认导出">
        一个模块可以有多个<strong>具名导出</strong>（import 时用花括号 <code>{'{ add, PI }'}</code>，
        名字要对得上），但最多只能有<strong>一个默认导出</strong>（import 时不带花括号，名字随你起）。
        本课后面的「ES6+」部分会专门细讲模块的各种用法。
      </Callout>

      <h2>三、包管理（npm / pnpm）：解决「别人的代码怎么用」</h2>
      <p>
        你写的项目不可能什么都从零造。要用 React、要用日期库、要用 HTTP 请求库——这些都是
        别人写好的<strong>第三方包（package）</strong>。管理这些包的工具叫<strong>包管理器</strong>，
        最经典的是 <strong>npm</strong>（Node 自带），还有更快更省空间的 <strong>pnpm</strong>、以及 yarn。
      </p>
      <h3>package.json：项目的「身份证 + 清单」</h3>
      <p>
        每个 JS 项目根目录都有一个 <code>package.json</code>，它记录了项目的名字、版本，以及最关键的两样东西：
        <strong>依赖列表</strong>（用到了哪些包、什么版本）和 <strong>scripts</strong>（项目常用命令的别名）。
        有了它，别人拿到你的项目只需 <code>npm install</code>，就能照着清单把所有依赖自动装齐。
      </p>
      <CodeBlock lang="json" title="一个最小的 package.json" code={packageJsonSnippet} />
      <CodeBlock lang="bash" title="常用的 npm / pnpm 命令" code={npmCmdSnippet} />
      <table>
        <thead>
          <tr><th>字段</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>name</code> / <code>version</code></td><td>项目名与版本号</td></tr>
          <tr><td><code>type</code></td><td>设为 <code>"module"</code> 时，<code>.js</code> 默认按 ESM 解析</td></tr>
          <tr><td><code>scripts</code></td><td>命令别名，<code>npm run dev</code> 即执行对应脚本</td></tr>
          <tr><td><code>dependencies</code></td><td>运行时必需的包（如 React）</td></tr>
          <tr><td><code>devDependencies</code></td><td>只在开发期用的包（如构建、检查工具）</td></tr>
        </tbody>
      </table>

      <h2>四、构建 / 打包（Vite、esbuild）：解决「浏览器跑不动现代代码」</h2>
      <p>
        现代 JS 用了 ESM、最新语法，有时还用 TypeScript，但老浏览器不一定都认；
        而且一个项目可能由几百个模块组成，全部直接丢给浏览器加载会很慢。
        <strong>构建工具</strong>就是干这个的：它把你写的现代代码<strong>转译</strong>成浏览器能懂的形式，
        把成百上千个模块<strong>打包</strong>、压缩、优化成少数几个文件。
        <strong>Vite</strong> 是当前主流的构建工具，开发时启动飞快、热更新即时；
        它底层用到的 <strong>esbuild</strong> 则是用 Go 写的超高速打包器。一句话：
        构建工具让「开发时舒服、上线时高效」两头兼顾。
      </p>

      <h2>五、TypeScript：解决「动态类型带来的 bug」</h2>
      <p>
        上一章讲过，JS 是动态弱类型，灵活但容易出错——把字符串当数字用、访问了不存在的属性，
        这类问题往往要等到运行时才暴露。<strong>TypeScript（TS）</strong>是 JS 的「超集」：
        它在 JS 之上<strong>加了一套类型系统</strong>，让你给变量、参数、返回值标注类型。
        类型错误会在<strong>编译期</strong>就被揪出来，而不是等用户点出 bug 才发现。
      </p>
      <CodeBlock lang="ts" title="TypeScript：给代码加上类型护栏" code={tsSnippet} />
      <Callout variant="tip" title="TS 最终还是变回 JS">
        浏览器和 Node 并不直接认识 TS，TS 代码需要先被<strong>编译（去掉类型）成普通 JS</strong> 才能运行。
        类型只在开发期帮你检查，运行时其实「不存在」。所以 TS 不会改变 JS 的运行机制，
        它是给开发者用的「安全护栏」。本课会先把 JS 学扎实，再进入 TS。
      </Callout>

      <h2>六、Node.js：解决「JS 只能在浏览器跑」</h2>
      <p>
        前面提到，<strong>Node.js</strong> 是浏览器之外的 JS 运行时。它的意义不只是「能写后端」——
        整条工具链（npm、Vite、ESLint、TypeScript 编译器）其实都是跑在 Node 上的命令行程序。
        换句话说，<strong>没有 Node，就没有现代前端工程</strong>。哪怕你只写浏览器里的代码，
        开发时也离不开 Node 来跑这些工具。
      </p>

      <h2>七、代码规范（ESLint / Prettier）：解决「人多手杂风格乱」</h2>
      <p>
        团队协作时，每个人的代码风格、习惯不同，很容易写出风格混乱、暗藏隐患的代码。两个工具来管这事：
      </p>
      <ul>
        <li>
          <strong>ESLint</strong>：代码<strong>质量检查器（linter）</strong>。它能在你写代码时就发现潜在问题——
          用了未声明的变量、定义了却没用的变量、可能出错的写法等，并给出警告或报错。
        </li>
        <li>
          <strong>Prettier</strong>：代码<strong>格式化工具</strong>。它只管「长相」——缩进、引号、
          分号、换行，按统一规则自动排版，从此团队不必再为「该不该加分号」吵架。
        </li>
      </ul>
      <Callout variant="note" title="分工不同，常常搭配使用">
        简单记：<strong>ESLint 管「对不对」（找 bug 和坏味道），Prettier 管「好不好看」（统一排版）</strong>。
        两者职责不同，实际项目里经常一起用。
      </Callout>

      <h2>八、把整条链串起来</h2>
      <p>
        现在回头看，这些工具不是凭空堆砌，而是各自补上一块短板，最后拼成一条完整的流水线：
      </p>
      <Example title="一次典型的开发流程">
        <p>
          你用 <strong>ESM</strong> 把代码拆成模块、用 <code>import</code>/<code>export</code> 组织依赖；
          用 <strong>npm/pnpm</strong> 按 <code>package.json</code> 装好第三方包；
          用 <strong>TypeScript</strong> 加类型护栏；写代码时 <strong>ESLint</strong> 实时挑错、
          <strong>Prettier</strong> 自动排版；运行 <code>npm run dev</code>，<strong>Vite</strong>
          在毫秒级转译打包并热更新；最后 <code>npm run build</code> 产出优化好的上线文件。
          这一切，都跑在 <strong>Node.js</strong> 之上。
        </p>
      </Example>
      <table>
        <thead>
          <tr><th>工具 / 概念</th><th>解决的痛点</th></tr>
        </thead>
        <tbody>
          <tr><td>ESM 模块化</td><td>全局变量冲突、依赖顺序难维护</td></tr>
          <tr><td>npm / pnpm + package.json</td><td>第三方包的安装与版本管理</td></tr>
          <tr><td>Vite / esbuild</td><td>转译现代语法、打包优化、加速开发</td></tr>
          <tr><td>TypeScript</td><td>动态类型导致的运行时 bug</td></tr>
          <tr><td>Node.js</td><td>让 JS 与整条工具链能在浏览器外运行</td></tr>
          <tr><td>ESLint / Prettier</td><td>代码质量与风格的统一</td></tr>
        </tbody>
      </table>

      <h2>九、本课的学习路线</h2>
      <p>
        工具链虽然重要，但都是「外围」。真正的内功是语言本身。所以本课的顺序是：
      </p>
      <ul>
        <li><strong>第一阶段，JS 核心</strong>：变量、类型、运算符、函数、对象、数组、作用域、this、原型——打牢地基。</li>
        <li><strong>第二阶段，ES6+</strong>：解构、箭头函数、模块、Promise、async/await 等现代语法，写出地道的现代 JS。</li>
        <li><strong>第三阶段，TypeScript</strong>：在扎实的 JS 之上加类型系统，写出更健壮、可维护的代码。</li>
      </ul>
      <Callout variant="tip" title="先打地基，再添护栏">
        不必一上来就纠结配置文件和工具。先把 JS 这门语言学透，工具链会在你真正动手做项目时
        自然而然地学会。下一卷，我们就从最基础的变量与数据类型开始。
      </Callout>

      <Summary
        points={[
          '现代 JS 工具链的每一块，都是为解决「项目变大后」的某个痛点而生：从一个 <script> 标签进化成一条流水线。',
          'ESM 模块化（import/export）解决全局变量冲突与依赖顺序问题，每个文件是独立作用域。',
          'npm/pnpm 配合 package.json 管理第三方依赖与命令脚本；dependencies 是运行时依赖，devDependencies 是开发期依赖。',
          'Vite/esbuild 负责转译现代语法并打包优化；TypeScript 加类型护栏在编译期抓 bug；ESLint 管质量、Prettier 管格式。',
          'Node.js 是浏览器外的运行时，整条工具链都跑在它之上——没有 Node 就没有现代前端工程。',
          '本课学习路线：先 JS 核心，再 ES6+ 现代语法，最后进入 TypeScript。',
        ]}
      />
    </article>
  )
}
