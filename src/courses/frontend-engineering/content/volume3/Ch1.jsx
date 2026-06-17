import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const minimalTsconfig = `{
  // tsconfig.json：TypeScript 项目的"中央配置"
  // 一旦目录下存在它，这个目录就被视为一个 TS 项目的根
  "compilerOptions": {
    "target": "ES2022",      // 编译产物用哪一代 JS 语法
    "module": "ESNext",      // 产物用哪种模块系统
    "strict": true           // 一键打开全部严格检查
  },
  "include": ["src"]         // 纳入编译/检查的文件范围
}`

const recommendedTsconfig = `{
  "compilerOptions": {
    /* —— 编译目标 —— */
    "target": "ES2022",                 // 降级到的目标语法版本
    "lib": ["ES2022", "DOM", "DOM.Iterable"], // 假定运行环境里存在哪些全局 API
    "useDefineForClassFields": true,    // 类字段语义对齐 ES 标准

    /* —— 模块系统 —— */
    "module": "ESNext",                 // 输出 ESM 语法
    "moduleResolution": "bundler",      // 交给打包器解析（Vite/esbuild 场景首选）
    "esModuleInterop": true,            // 让 import x from 'cjs' 这种写法可用
    "allowImportingTsExtensions": true, // 允许 import './x.ts'（仅在不产出时）
    "resolveJsonModule": true,          // 允许 import data from './x.json'
    "isolatedModules": true,            // 保证每个文件可被单独转译（配合 esbuild/swc）
    "verbatimModuleSyntax": true,       // import type 与值导入语义更明确

    /* —— 严格类型检查（strict 全家桶）—— */
    "strict": true,                     // 等价于一次性打开下面这一整组
    "noUnusedLocals": true,             // 报告未使用的局部变量
    "noUnusedParameters": true,         // 报告未使用的函数参数
    "noFallthroughCasesInSwitch": true, // switch case 漏写 break 时报错
    "noUncheckedIndexedAccess": true,   // 索引访问结果自动带上 undefined

    /* —— 路径别名 —— */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]                  // 把 @/foo 映射到 src/foo
    },

    /* —— 工程化与产物 —— */
    "skipLibCheck": true,               // 跳过对 .d.ts 的检查，提速
    "incremental": true,                // 增量编译，缓存上次结果
    "noEmit": true,                     // 只做类型检查，不产出 JS（产物交给打包器）
    "jsx": "react-jsx"                  // 处理 JSX（React 17+ 自动运行时）
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}`

const compositeConfig = `// tsconfig.json（根，只做"指挥"，不直接编译）
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/web" }
  ]
}

// packages/core/tsconfig.json（被引用方必须开 composite）
{
  "compilerOptions": {
    "composite": true,          // 声明这是一个可被引用的子项目
    "declaration": true,        // 必须产出 .d.ts，供上游消费
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}`

const moduleResolutionDemo = `// moduleResolution 决定 "怎么找到 import 的东西"
// node16 / nodenext：严格遵循 Node 的 ESM 规则，
//   import './util' 必须写成 import './util.js'（带扩展名）
import { add } from './util.js'

// bundler：放宽规则，交给打包器去解析，
//   可以省略扩展名，也支持 package.json 的 "exports" 字段
import { add as add2 } from './util'`

export default function Ch1() {
  return (
    <article>
      <Lead>
        几乎每个 TypeScript 项目根目录都躺着一个 <code>tsconfig.json</code>。它看上去只是一堆开关，
        但实际上是整个项目「类型有多严、编译成什么样、模块怎么找」的总闸。这一章我们不堆砌全部选项，
        而是按职责把关键选项分成几组讲透：<strong>严格检查</strong>、<strong>编译目标</strong>、
        <strong>模块系统</strong>、<strong>路径别名</strong>、<strong>大项目加速</strong>，
        并给你一份可直接抄走、带逐行注释的推荐配置。
      </Lead>

      <h2>一、tsconfig.json 是什么</h2>
      <p>
        <code>tsconfig.json</code> 是 TypeScript 编译器（<code>tsc</code>）和编辑器语言服务共同读取的配置文件。
        它的存在本身就有意义：<strong>一旦某个目录下有了 tsconfig.json，这个目录就被认定为一个 TS 项目的根</strong>，
        编译器会以它为基准去收集文件、应用规则。它主要回答三个问题——纳入哪些文件
        （<code>include</code> / <code>exclude</code> / <code>files</code>）、用什么规则检查与编译
        （<code>compilerOptions</code>）、以及在多项目里如何互相引用（<code>references</code>）。
      </p>
      <CodeBlock lang="json" title="最小可用配置" code={minimalTsconfig} />
      <p>
        别被几百个选项吓到。真正每天都在影响你的，是下面这几组。我们一组一组拆。
      </p>

      <h2>二、strict 全家桶：为什么该全开</h2>
      <KeyIdea>
        <code>{'"strict": true'}</code> 不是一个开关，而是一组严格检查的<strong>总开关</strong>。
        把它打开，等于一次性启用 <code>noImplicitAny</code>、<code>strictNullChecks</code> 等一整组规则。
        这些规则正是 TypeScript 类型安全价值的来源——关掉它们，TS 就退化成「带了点提示的 JS」。
      </KeyIdea>
      <p>
        <code>strict</code> 之所以推荐<strong>一开始就全开</strong>，是因为在新项目里养成习惯几乎没有成本；
        而一个写了半年的宽松项目想反过来开 strict，往往要面对成百上千条报错，迁移痛苦。
        下面逐个理解这组里最关键的几个：
      </p>
      <h3>noImplicitAny</h3>
      <p>
        当某个变量、参数无法被推断出类型时，TS 默认会悄悄把它当成 <code>any</code>（任意类型，等于放弃检查）。
        开启此项后，这种「隐式 any」会直接报错，逼你显式标注类型。它堵住了类型系统最大的漏洞——
        一个 <code>any</code> 会像传染病一样让一整条调用链失去检查。
      </p>
      <h3>strictNullChecks</h3>
      <p>
        关闭时，<code>null</code> 和 <code>undefined</code> 可以赋给任何类型，于是
        「读了一个可能不存在的值再 <code>.foo</code>」这种最常见的运行时崩溃，编译期完全发现不了。
        开启后，<code>string | undefined</code> 必须先收窄（判空）才能当 <code>string</code> 用。
        这是 strict 里<strong>价值最高</strong>的一项。
      </p>
      <h3>其余成员</h3>
      <p>
        <code>strictFunctionTypes</code>（函数参数的逆变检查）、
        <code>strictBindCallApply</code>（<code>bind/call/apply</code> 的参数检查）、
        <code>strictPropertyInitialization</code>（类属性必须初始化）、
        <code>noImplicitThis</code>（<code>this</code> 不能是隐式 any）、
        <code>alwaysStrict</code>（产物加 <code>'use strict'</code>）也都在这组里。
      </p>
      <Example title="strictNullChecks 的差别">
        <p>
          有一个函数 <code>{'function find(): User | undefined'}</code>。关闭 strictNullChecks 时，
          <code>{'find().name'}</code> 编译通过，但 <code>find()</code> 返回 undefined 时运行就崩。
          开启后，编译器直接报错，逼你写成 <code>{'const u = find(); if (u) { u.name }'}</code>，
          把崩溃挡在了上线前。
        </p>
      </Example>
      <p>
        除了 strict 本身，还有几个常被一起打开、但<strong>不</strong>属于 strict 的「准严格」项也值得开：
        <code>noUnusedLocals</code> / <code>noUnusedParameters</code>（清理死代码）、
        <code>noFallthroughCasesInSwitch</code>（防 switch 漏写 break）、
        <code>noUncheckedIndexedAccess</code>（数组 / 字典的索引访问结果自动带上 undefined，更安全）。
      </p>

      <h2>三、target 与 lib：编译目标和可用 API</h2>
      <p>
        这两个选项一起决定了「产物长什么样」和「代码里能用哪些全局 API」，初学者最容易把它们搞混。
      </p>
      <h3>target</h3>
      <p>
        <code>target</code> 指定把 TS / 新语法<strong>降级</strong>到哪一代 JS 语法。比如设成 <code>ES2015</code>，
        箭头函数会被转成普通函数、<code>class</code> 会被转成原型写法；设成 <code>ES2022</code>，
        这些现代语法则原样保留。<strong>target 越低，兼容越老的运行环境，但产物体积可能更大、性能可能更差。</strong>
        现代浏览器和 Node 环境通常 <code>ES2020</code> 或 <code>ES2022</code> 就够了。
      </p>
      <h3>lib</h3>
      <p>
        <code>lib</code> 告诉编译器「假定运行环境里存在哪些内置 API 的类型声明」。注意它<strong>只影响类型，
        不影响运行</strong>——它不会帮你 polyfill，只是决定 <code>document</code>、<code>Promise</code>、
        <code>Array.prototype.flat</code> 这些东西在类型层面是否「认识」。
      </p>
      <ul>
        <li>写浏览器代码：要带上 <code>{'"DOM"'}</code> 和 <code>{'"DOM.Iterable"'}</code>，否则 <code>document</code> 报「未定义」。</li>
        <li>写纯 Node 库：通常不带 DOM，避免误用浏览器 API。</li>
        <li>不显式写 lib 时，TS 会根据 <code>target</code> 推一个默认值，但一旦你手写 lib，默认就被覆盖。</li>
      </ul>
      <Callout variant="warn" title="lib 不等于 polyfill">
        把 <code>lib</code> 设成 <code>{'"ES2022"'}</code> 只是让类型系统「认识」<code>Array.prototype.at</code>，
        并<strong>不会</strong>让它在老浏览器里真的能跑。真要兼容老环境，polyfill 得另外引入
        （如 core-js），lib 只管类型那一半。
      </Callout>

      <h2>四、module 与 moduleResolution：模块系统与解析策略</h2>
      <p>
        这是 tsconfig 里最让人困惑的一对，但拆开看其实很清楚：<code>module</code> 管「输出成哪种模块语法」，
        <code>moduleResolution</code> 管「<code>import</code> 时怎么找到目标文件」。
      </p>
      <h3>module</h3>
      <p>
        决定产物用 <code>CommonJS</code>（<code>require</code> / <code>module.exports</code>）还是 ESM
        （<code>import</code> / <code>export</code>），或 <code>ESNext</code> / <code>NodeNext</code> 等。
        前端用打包器的项目几乎都选 <code>ESNext</code>，把模块交给打包器处理；纯 Node 项目可能用
        <code>NodeNext</code> 以贴合 Node 的双模块规则。
      </p>
      <h3>moduleResolution</h3>
      <p>
        现代项目主要在两种值之间选：
      </p>
      <table>
        <thead>
          <tr><th>值</th><th>适用场景</th><th>关键规则</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>bundler</code></td>
            <td>用 Vite / esbuild / webpack 等打包器的前端项目</td>
            <td>导入可省扩展名；支持 package.json 的 <code>exports</code> 字段；最贴近打包器实际行为</td>
          </tr>
          <tr>
            <td><code>node16</code> / <code>nodenext</code></td>
            <td>直接在 Node 里跑、要发布到 npm 的库</td>
            <td>严格遵循 Node ESM 规则，相对导入<strong>必须带 <code>.js</code> 扩展名</strong></td>
          </tr>
        </tbody>
      </table>
      <CodeBlock lang="ts" title="两种解析策略下的导入写法差异" code={moduleResolutionDemo} />
      <Callout variant="tip" title="选 bundler 还是 node16">
        判断标准很简单：<strong>谁来最终处理你的代码</strong>。交给打包器（典型前端应用）就用
        <code>bundler</code>；要直接被 Node 执行、或要发布给别人在 Node 里用的库，就用
        <code>node16</code> / <code>nodenext</code>。
      </Callout>
      <h3>esModuleInterop</h3>
      <p>
        历史遗留问题：CommonJS 模块没有「默认导出」的概念，导致
        <code>{"import express from 'express'"}</code> 这种写法在某些配置下会失败。
        打开 <code>esModuleInterop</code> 后，TS 会生成兼容性辅助代码，让你能像导入 ESM 一样导入 CJS 模块。
        几乎所有项目都应该开它。
      </p>

      <h2>五、paths：路径别名</h2>
      <p>
        随着项目变大，<code>{"import x from '../../../utils/x'"}</code> 这种相对路径会变得又长又脆。
        <code>paths</code> 让你定义别名，把 <code>@/utils/x</code> 映射到 <code>src/utils/x</code>。
        它需要配合 <code>baseUrl</code> 使用。
      </p>
      <KeyIdea>
        <code>paths</code> 只让 <strong>TypeScript 的类型检查</strong>认识别名，<strong>不会</strong>真正改写
        产物里的导入路径。所以打包工具（Vite / webpack）必须配上<strong>同样</strong>的别名规则，
        运行时才能真正找到文件。两边要保持一致，否则会出现「编辑器不报错、一打包就找不到模块」的怪现象。
      </KeyIdea>
      <p>
        在 Vite 里通常用 <code>vite-tsconfig-paths</code> 插件，或在 <code>resolve.alias</code> 里手动配一份，
        让构建侧和类型侧对齐。
      </p>

      <h2>六、大项目加速：incremental、composite 与项目引用</h2>
      <p>
        小项目编译很快，但当代码量上来、或者一个仓库里有多个包（monorepo）时，全量类型检查会变慢。
        TS 提供了两个层级的加速手段。
      </p>
      <h3>incremental</h3>
      <p>
        开启 <code>incremental</code> 后，<code>tsc</code> 会把上一次的类型信息缓存到一个
        <code>.tsbuildinfo</code> 文件里，下次只重新检查变化的部分，显著加快重复构建。它是单项目内的加速。
      </p>
      <h3>composite 与项目引用（references）</h3>
      <p>
        当仓库由多个相互依赖的子项目组成时，可以把每个子项目声明为 <code>composite</code>，再在上层用
        <code>references</code> 把它们串起来。这样 <code>tsc --build</code> 能按依赖顺序、增量地只重建
        发生变化的子项目，而不是每次全量。<code>composite</code> 会强制要求产出 <code>.d.ts</code>
        （这样上游才能消费下游的类型）。
      </p>
      <CodeBlock lang="json" title="composite + 项目引用（monorepo）" code={compositeConfig} />

      <h2>七、skipLibCheck 与一些实用项</h2>
      <p>
        <code>skipLibCheck</code> 让编译器<strong>跳过对 <code>.d.ts</code> 声明文件本身的检查</strong>。
        第三方库的类型声明可能彼此冲突或写得不规范，逐一检查既慢又常常报出你管不了的错。
        开启后能明显提速、减少噪音。代价是：如果你<em>自己</em>写的声明有错，也可能被一起跳过，
        但对绝大多数应用项目而言，开它利远大于弊。
      </p>
      <p>其它几个高频项：</p>
      <ul>
        <li><code>resolveJsonModule</code>：允许直接 <code>import data from './x.json'</code>。</li>
        <li><code>isolatedModules</code>：保证每个文件能被<strong>单独</strong>转译——这是 esbuild / SWC 这类「逐文件转译」工具能正确工作的前提。</li>
        <li><code>jsx</code>：处理 JSX，React 17+ 用 <code>react-jsx</code> 自动运行时，免去手写 <code>import React</code>。</li>
        <li><code>noEmit</code>：只做类型检查、不产出 JS——前端项目里产物交给打包器，<code>tsc</code> 只当「类型门禁」。下一章会专门讲这一点。</li>
      </ul>

      <h2>八、类型检查与编译的关系</h2>
      <KeyIdea>
        <code>tsc</code> 默认做两件事：<strong>类型检查</strong>（找出类型错误）和<strong>转译</strong>
        （把 TS 降级成 JS）。但这两件事可以拆开——很多现代项目让打包器负责转译，让 <code>tsc --noEmit</code>
        只负责类型检查。理解这一点，是看懂整条前端工程化链路的关键，下一章会深入展开。
      </KeyIdea>
      <p>
        无论是否产出文件，tsconfig.json 里的这些选项都同时作用于<strong>编辑器里的实时提示</strong>。
        你在 VS Code 里看到的红波浪线，背后正是语言服务读着同一份 tsconfig 在工作。
        所以把 tsconfig 配对，等于同时校准了「命令行检查」「编辑器提示」「构建产物」三处行为。
      </p>

      <h2>九、推荐配置（带注释，可直接抄）</h2>
      <p>
        把以上各组结论拼起来，给一份适用于「Vite + React + 现代浏览器」的应用项目模板。
        库项目把 <code>moduleResolution</code> 换成 <code>nodenext</code>、关掉 <code>noEmit</code>、
        打开 <code>declaration</code> 即可。
      </p>
      <CodeBlock lang="json" title="推荐 tsconfig（Vite + React）" code={recommendedTsconfig} />

      <h2>十、关键选项速查表</h2>
      <table>
        <thead>
          <tr><th>选项</th><th>作用</th><th>推荐</th></tr>
        </thead>
        <tbody>
          <tr><td><code>strict</code></td><td>一键开启全部严格检查</td><td>始终 true</td></tr>
          <tr><td><code>noUncheckedIndexedAccess</code></td><td>索引访问结果带 undefined</td><td>建议 true</td></tr>
          <tr><td><code>target</code></td><td>降级到的 JS 语法版本</td><td>ES2022（现代环境）</td></tr>
          <tr><td><code>lib</code></td><td>假定可用的全局 API 类型</td><td>含 DOM（浏览器）</td></tr>
          <tr><td><code>module</code></td><td>产物模块系统</td><td>ESNext（打包器）</td></tr>
          <tr><td><code>moduleResolution</code></td><td>模块解析策略</td><td>bundler / nodenext</td></tr>
          <tr><td><code>esModuleInterop</code></td><td>兼容 CJS 默认导入</td><td>true</td></tr>
          <tr><td><code>paths</code> + <code>baseUrl</code></td><td>路径别名（须同步构建工具）</td><td>按需</td></tr>
          <tr><td><code>incremental</code></td><td>单项目增量编译缓存</td><td>true</td></tr>
          <tr><td><code>composite</code> + <code>references</code></td><td>多项目按依赖增量重建</td><td>monorepo 用</td></tr>
          <tr><td><code>skipLibCheck</code></td><td>跳过 .d.ts 检查、提速</td><td>true</td></tr>
          <tr><td><code>noEmit</code></td><td>只检查不产出（产物交打包器）</td><td>前端应用 true</td></tr>
        </tbody>
      </table>

      <Callout variant="tip">
        下一章我们解释一个反直觉但极其重要的事实：Vite / esbuild / SWC 在转译时<strong>压根不做类型检查</strong>，
        所以光靠它们构建成功，并不代表类型没错——必须单独跑一遍 <code>tsc --noEmit</code> 当门禁。
      </Callout>

      <Summary
        points={[
          'tsconfig.json 是 TS 项目的中央配置：它决定纳入哪些文件、用什么规则检查与编译、多项目如何互相引用；它的存在本身就把所在目录标记为项目根。',
          'strict 是一组严格检查的总开关（含 noImplicitAny、strictNullChecks 等），是 TS 类型安全的核心价值来源，应从一开始就全开。',
          'target 决定产物降级到哪代 JS 语法；lib 决定类型层面认识哪些全局 API，但只管类型、不做 polyfill。',
          'module 管产物模块语法、moduleResolution 管 import 如何找文件：打包器项目用 bundler，发布到 Node 的库用 node16/nodenext；esModuleInterop 几乎必开。',
          'paths 别名只让类型检查认识，构建工具必须配同样规则，否则会出现编辑器不报错、打包却找不到模块。',
          'incremental 加速单项目；composite + references 让 monorepo 按依赖增量重建；skipLibCheck 跳过 .d.ts 检查提速；noEmit 让 tsc 只当类型门禁。',
        ]}
      />
    </article>
  )
}
