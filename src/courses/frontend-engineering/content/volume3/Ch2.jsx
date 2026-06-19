import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const typecheckScripts = `{
  "name": "my-app",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",   // 先类型门禁，过了再打包
    "typecheck": "tsc --noEmit",             // 只检查类型、不产出文件
    "typecheck:watch": "tsc --noEmit --watch" // 监听模式，边写边查
  }
}`

const vueTypecheckScripts = `{
  "scripts": {
    // Vue 单文件组件里的 <template> 也要查类型，
    // 普通 tsc 看不懂 .vue，要用 vue-tsc
    "typecheck": "vue-tsc --noEmit",
    "build": "vue-tsc --noEmit && vite build"
  }
}`

const ambientDts = `// global.d.ts —— ambient（环境）声明，描述"全局已存在"的东西
// 没有 import / export 的 .d.ts 文件，其声明对全局可见

// 1) 给 Vite 注入的环境变量补类型
interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_FEATURE_FLAG: 'on' | 'off'
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 2) 让 import 静态资源不报错（Vite 会处理这些导入）
declare module '*.svg' {
  const src: string
  export default src
}

// 3) 给一个没有自带类型、也没有 @types 的老库补类型
declare module 'legacy-untyped-lib' {
  export function doThing(input: string): number
  export const VERSION: string
}`

const libDts = `// dist/index.d.ts —— 由 tsc 自动生成的"类型说明书"
// 只有类型签名，没有任何实现

export interface FormatOptions {
  locale?: string
  currency?: string
}

export declare function formatMoney(
  value: number,
  options?: FormatOptions
): string

export declare const VERSION: string`

const libPackageJson = `{
  "name": "@acme/utils",
  "version": "1.2.0",
  "type": "module",
  "main": "./dist/index.js",       // 运行时入口（JS 实现）
  "types": "./dist/index.d.ts",    // 类型入口：消费者据此获得类型提示
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],               // 发布时把 dist（含 .d.ts）一并带上
  "scripts": {
    "build": "tsc"                 // 配合 declaration:true 同时产出 .js 与 .d.ts
  }
}`

const ciYaml = `# .github/workflows/ci.yml —— 把类型检查接进 CI 流水线
name: CI
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run typecheck    # tsc --noEmit，类型有错就让这一步失败
      - run: npm run build`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们配好了 <code>tsconfig.json</code>。这一章要纠正一个许多人都踩过的认知误区：
        <strong>「构建成功」不等于「类型没错」</strong>。现代构建工具（Vite / esbuild / SWC）为了快，
        转译时<strong>根本不做类型检查</strong>。也就是说，你的代码里可能有一堆类型错误，照样能打包出包、
        照样能跑——直到它在某个用户的浏览器里崩溃。本章讲清类型与构建的分工，以及如何用
        <code>tsc --noEmit</code> 和声明文件把类型这条防线补齐。
      </Lead>

      <h2>一、最关键的认知：转译 ≠ 类型检查</h2>
      <KeyIdea>
        Vite、esbuild、SWC 这类工具只负责<strong>转译</strong>——把 TS「删掉类型注解、把新语法降级成旧语法」，
        变成能跑的 JS。它们<strong>故意不做类型检查</strong>，因为类型检查慢，会拖垮开发时的热更新速度。
        所以类型错误<strong>不会</strong>让构建失败，你必须单独跑一遍 <code>tsc --noEmit</code> 来把关。
      </KeyIdea>
      <p>
        为什么这些工具能「不检查类型也能转译」？因为对它们来说，TypeScript 的类型注解就是一段段
        <strong>可以直接擦除的文本</strong>。<code>{'const x: number = 1'}</code> 里的 <code>: number</code>
        会被原样删掉，剩下 <code>{'const x = 1'}</code>。整个过程<strong>逐文件</strong>进行、不需要理解
        跨文件的类型关系，所以快得惊人。但也正因为它「不理解类型」，
        <code>{'const x: number = "hello"'}</code> 这种明显的类型错误，它擦完类型后照样产出能跑的 JS，
        毫不在意。
      </p>
      <Example title="构建成功，类型却是错的">
        <p>
          假设你写了 <code>{'function area(r: number) { return 3.14 * r * r }'}</code>，
          然后在别处调用 <code>{'area("5")'}</code>（传了字符串）。
        </p>
        <p>
          用 Vite <code>build</code>：<strong>构建成功</strong>，因为 esbuild 只擦类型不检查。
          产物里 <code>{'area("5")'}</code> 原样保留，运行时 <code>"5" * "5"</code> 得到 <code>NaN</code>，
          页面显示一个莫名其妙的结果。
        </p>
        <p>
          跑 <code>tsc --noEmit</code>：<strong>立刻报错</strong>——「类型 string 不能赋给参数 number」。
          错误在上线前就被拦住。这就是为什么不能只依赖构建工具。
        </p>
      </Example>
      <Callout variant="warn" title="不要被「构建通过」骗了">
        「<code>npm run build</code> 成功」只代表语法能转译、能打包，<strong>完全不代表类型正确</strong>。
        真正的类型保障来自一道独立的关卡：<code>tsc --noEmit</code>（Vue 项目用 <code>vue-tsc --noEmit</code>）。
      </Callout>

      <h2>二、tsc --noEmit：专职的类型门禁</h2>
      <p>
        <code>tsc --noEmit</code> 的意思是「只做类型检查，<strong>不产出</strong>（no emit）任何 JS 文件」。
        它把 <code>tsc</code> 默认的两件事（检查 + 转译）裁剪到只剩检查，扮演纯粹的「类型门禁」角色。
        转译那一半，交给又快又好的打包器去做。
      </p>
      <KeyIdea>
        现代前端工程的标准分工是：<strong>转译用打包器</strong>（快、负责产物），
        <strong>类型检查用 <code>tsc --noEmit</code></strong>（慢、负责正确性）。两者各司其职，互不阻塞。
      </KeyIdea>
      <p>
        放在哪里跑？分三个层次，缺一不可：
      </p>
      <table>
        <thead>
          <tr><th>位置</th><th>形式</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>编辑器</td>
            <td>VS Code 语言服务实时提示</td>
            <td>边写边发现，反馈最快，但只看你打开的文件</td>
          </tr>
          <tr>
            <td>构建脚本</td>
            <td><code>tsc --noEmit && vite build</code></td>
            <td>打包前先过类型，类型有错就不让打包</td>
          </tr>
          <tr>
            <td>CI 流水线</td>
            <td><code>npm run typecheck</code> 作为独立步骤</td>
            <td>提交 / PR 时全量把关，谁都绕不过</td>
          </tr>
        </tbody>
      </table>
      <Callout variant="tip" title="为什么不在 dev 时阻塞">
        别把类型检查塞进开发服务器的热更新链路里——它慢，会毁掉「保存即刷新」的爽快体验。
        让类型错误在<strong>编辑器</strong>里以红波浪线提示就够了，真正的「阻塞」放到
        <strong>构建</strong>和 <strong>CI</strong> 这两道关卡。这样既快又安全。
      </Callout>

      <h2>三、在 npm scripts 里加 typecheck</h2>
      <p>
        把类型门禁固化成一个可复用的命令，是工程化的第一步。约定俗成的脚本名叫 <code>typecheck</code>。
      </p>
      <CodeBlock lang="json" title="package.json：加入 typecheck 脚本" code={typecheckScripts} />
      <p>
        其中 <code>build</code> 用 <code>&amp;&amp;</code> 把两步串起来：<code>tsc --noEmit</code> 先跑，
        它若发现类型错误会以非零退出码结束，<code>&amp;&amp;</code> 后面的 <code>vite build</code> 就不会执行——
        于是「类型不过就打不出包」。
      </p>
      <p>
        如果项目是 Vue，<code>.vue</code> 单文件组件里 <code>&lt;template&gt;</code> 内的类型，
        普通 <code>tsc</code> 是看不懂的，要换成专门的 <code>vue-tsc</code>：
      </p>
      <CodeBlock lang="json" title="Vue 项目用 vue-tsc" code={vueTypecheckScripts} />

      <h2>四、把类型检查接进 CI</h2>
      <p>
        编辑器提示只对「正在看这个文件的人」有效；要保证<strong>整个团队、每一次提交</strong>都不引入类型错误，
        必须把 <code>typecheck</code> 放进 CI，让它成为合并代码的硬性门槛。
      </p>
      <CodeBlock lang="bash" title="CI 中的类型检查步骤（GitHub Actions）" code={ciYaml} />
      <p>
        关键在于把 <code>npm run typecheck</code> 作为一个<strong>独立的、会让流水线失败的步骤</strong>。
        一旦有人提交了类型错误的代码，这一步会变红，PR 无法合并，问题在进主干前就被挡住。
      </p>

      <h2>五、声明文件 .d.ts 是什么</h2>
      <KeyIdea>
        <code>.d.ts</code>（declaration file，声明文件）是「<strong>只描述类型、没有任何实现</strong>」的文件。
        它告诉编译器「某个东西<em>长什么样</em>」——有哪些函数、参数和返回值是什么类型——
        但不包含这些函数<em>怎么实现</em>。可以把它理解成一份「类型说明书」。
      </KeyIdea>
      <p>
        为什么需要它？因为类型信息在转译成 JS 后<strong>会被擦掉</strong>。一个用 TS 写的库，
        发布出去的是擦掉类型的 JS（<code>.js</code>）；如果不额外提供 <code>.d.ts</code>，
        使用它的人就拿不到任何类型提示。所以 <code>.d.ts</code> 的作用，就是把那份被擦掉的类型信息
        <strong>单独打包随库附带</strong>，让消费者重新获得类型安全。
      </p>
      <CodeBlock lang="ts" title="一个由 tsc 生成的 .d.ts" code={libDts} />
      <p>
        注意里面全是 <code>declare</code>、<code>interface</code>、类型签名，没有一行函数体。这正是声明文件的本质：
        只说「是什么」，不说「怎么做」。
      </p>

      <h2>六、ambient declarations 与 declare module</h2>
      <h3>ambient（环境）声明</h3>
      <p>
        当一个 <code>.d.ts</code> 文件里<strong>没有任何顶层 <code>import</code> / <code>export</code></strong> 时，
        它的声明是「环境级」的——对整个项目<strong>全局可见</strong>，无需导入即可使用。
        典型用途是描述那些「凭空就存在」的全局变量、给静态资源导入补类型、扩展全局接口等。
      </p>
      <h3>declare module：给无类型的库补类型</h3>
      <p>
        现实中总会遇到一些<strong>没有自带类型、社区也没有 <code>@types</code></strong> 的老库。直接 import 它，
        TS 会报「找不到模块的声明文件」。这时可以用 <code>declare module '库名'</code> 自己补一份类型。
      </p>
      <CodeBlock lang="ts" title="ambient 声明与 declare module" code={ambientDts} />
      <Callout variant="note" title="declare module 也用于扩展静态资源导入">
        像 <code>import logo from './logo.svg'</code> 这种导入，本质上不是合法的 JS 模块，
        是打包器在帮忙处理。所以要用 <code>{"declare module '*.svg'"}</code> 告诉 TS「这种导入返回一个字符串」，
        否则类型检查会报错。Vite 项目通常已自带 <code>vite/client</code> 这份声明。
      </Callout>

      <h2>七、@types 与 DefinitelyTyped</h2>
      <p>
        很多流行的纯 JS 库（如早期的 lodash、express）本身不带类型。社区为它们维护了一个庞大的仓库——
        <strong>DefinitelyTyped</strong>，里面是成千上万个 <code>.d.ts</code>，以
        <code>@types/包名</code> 的形式发布到 npm。
      </p>
      <ul>
        <li>需要某个库的类型时，先看它有没有自带（package.json 里有 <code>types</code> 字段就是自带）。</li>
        <li>没自带，就试 <code>npm i -D @types/库名</code>，多半 DefinitelyTyped 已经有了。</li>
        <li>装上后，TS 会自动从 <code>node_modules/@types</code> 里捡起这些类型，无需手动 import。</li>
        <li>连 <code>@types</code> 也没有的小众 / 内部库，才轮到自己写 <code>declare module</code>。</li>
      </ul>
      <table>
        <thead>
          <tr><th>情况</th><th>处理方式</th></tr>
        </thead>
        <tbody>
          <tr><td>库自带类型（有 <code>types</code> 字段）</td><td>什么都不用做，直接用</td></tr>
          <tr><td>库无类型，但 DefinitelyTyped 有</td><td><code>npm i -D @types/库名</code></td></tr>
          <tr><td>完全没有现成类型</td><td>自己写 <code>declare module</code> 补一份</td></tr>
        </tbody>
      </table>

      <h2>八、给自己的库产出类型</h2>
      <p>
        反过来，如果你<strong>发布</strong>一个库，就该让用它的人享受到类型提示。这需要两步：
        <strong>生成 <code>.d.ts</code></strong>，并在 package.json 里用 <strong><code>types</code> 字段</strong>指向它。
      </p>
      <ul>
        <li>在 tsconfig 里开 <code>{'"declaration": true'}</code>，<code>tsc</code> 编译时就会在产出 <code>.js</code> 的同时产出对应的 <code>.d.ts</code>。</li>
        <li>在 package.json 里加 <code>{'"types": "./dist/index.d.ts"'}</code>，告诉消费者类型入口在哪。</li>
        <li>现代做法还会在 <code>exports</code> 字段里也声明 <code>types</code> 条件，并确保 <code>files</code> 把 <code>dist</code> 一起发布。</li>
      </ul>
      <CodeBlock lang="json" title="库的 package.json：types 字段" code={libPackageJson} />
      <Callout variant="tip" title="types 字段是消费者拿到提示的关键">
        消费者安装你的库后，TS 正是顺着 package.json 的 <code>types</code>（或 <code>exports</code> 里的
        <code>types</code> 条件）去找声明文件的。<strong>忘了配 types 字段，或忘了把 .d.ts 发布出去</strong>，
        用户就只能得到一个「没有类型」的库——这是发布 TS 库最常见的疏漏。
      </Callout>

      <h2>九、把整条链路串起来</h2>
      <p>
        回到全局视角，一个成熟的 TS 项目里，类型与构建是这样分工的：
      </p>
      <ul>
        <li><strong>编辑器</strong>读 tsconfig，实时给你红波浪线——反馈最快，不阻塞。</li>
        <li><strong>打包器</strong>（Vite / esbuild / SWC）只转译、不检查——产物快，但对类型一无所知。</li>
        <li><strong><code>tsc --noEmit</code></strong>（或 <code>vue-tsc</code>）当独立门禁——构建脚本里前置一次，CI 里全量再来一次。</li>
        <li><strong>声明文件</strong>把类型信息在库的边界上传递——消费 <code>@types</code>，产出时配好 <code>types</code> 字段。</li>
      </ul>
      <p>
        理解了「转译和类型检查是两件可拆开的事」，你就不会再被「构建通过」迷惑，
        也能解释清楚为什么团队需要 <code>typecheck</code> 脚本和 CI 门禁——它们补的，正是构建工具<strong>故意</strong>留下的那道缺口。
      </p>

      <Summary
        points={[
          'Vite / esbuild / SWC 只做转译（擦类型、降语法），故意不做类型检查，所以类型错误不会让构建失败——构建成功不等于类型正确。',
          '类型保障要靠独立的门禁 tsc --noEmit（Vue 用 vue-tsc --noEmit）：只检查、不产出，把转译交给打包器。',
          '类型检查放三处：编辑器实时提示（不阻塞）、构建脚本前置（tsc --noEmit && vite build）、CI 独立步骤（全量把关），但不要塞进 dev 热更新拖慢速度。',
          '.d.ts 声明文件只描述类型、无实现；没有 import/export 的是 ambient 全局声明；declare module 可给无类型的库或静态资源导入补类型。',
          '@types 来自 DefinitelyTyped：库无自带类型时优先装 @types/库名，都没有才自己写 declare module。',
          '发布库要让消费者有类型：开 declaration:true 生成 .d.ts，并在 package.json 的 types 字段（及 exports 的 types 条件）指向它、把 dist 一并发布。',
        ]}
      />
    </article>
  )
}
