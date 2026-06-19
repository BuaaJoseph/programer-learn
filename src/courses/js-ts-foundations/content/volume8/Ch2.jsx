import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const tsconfigSnippet = `{
  "compilerOptions": {
    "target": "ES2022",          // 编译产物的 JS 语法版本
    "module": "ESNext",          // 输出哪种模块系统（配合打包器用 ESNext）
    "moduleResolution": "Bundler", // 如何解析 import 路径（用 Vite/esbuild 选 Bundler）
    "lib": ["ES2022", "DOM"],    // 引入哪些内置类型（DOM 提供 window/document 等）
    "strict": true,              // 一键开启全部严格检查（强烈推荐）
    "esModuleInterop": true,     // 让 import x from "cjs-pkg" 这种默认导入正常工作
    "skipLibCheck": true,        // 跳过对 .d.ts 的检查，加快编译
    "noEmit": true,              // 只做类型检查、不产出文件（产物交给打包器）
    "paths": {                   // 路径别名，需配合打包器同步配置
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"]
}`

const strictFamilySnippet = `// strict: true 等价于一次性打开下面这一整组开关：

// noImplicitAny        —— 不允许「隐式 any」（参数 / 变量推断不出类型就报错）
// strictNullChecks     —— null 和 undefined 不再能赋给任意类型（最重要的一项）
// strictFunctionTypes  —— 函数参数做更严格的逆变检查
// strictBindCallApply  —— bind/call/apply 的参数也做类型检查
// strictPropertyInitialization —— 类的属性必须被初始化
// noImplicitThis       —— this 类型不明时报错
// useUnknownInCatchVariables —— catch 的 e 类型为 unknown 而非 any
// alwaysStrict         —— 输出 "use strict"

// 想逐项体会，可以先只开 strictNullChecks 感受威力，最终目标仍是 strict: true`

const unknownVsAnySnippet = `// ❌ any：彻底关闭类型检查，像没写 TS 一样，错误会漏到运行时
function parseAny(json: string): any {
  return JSON.parse(json)
}
const u1 = parseAny("{}")
u1.foo.bar.baz   // 编译通过，运行时直接炸（any 不报错）

// ✅ unknown：表示「类型未知」，但用之前必须先收窄，逼你做检查
function parseUnknown(json: string): unknown {
  return JSON.parse(json)
}
const u2 = parseUnknown("{}")
// u2.foo                       // ❌ 编译报错：u2 类型是 unknown
if (typeof u2 === "object" && u2 !== null && "foo" in u2) {
  // 这里 u2 已被收窄，安全访问
}`

const discriminatedUnionSnippet = `// 判别联合（discriminated union）：用一个公共字面量字段当「标签」
type Loading = { status: "loading" }
type Success = { status: "success"; data: string[] }
type Failure = { status: "failure"; error: string }

type State = Loading | Success | Failure

function render(state: State): string {
  switch (state.status) {       // 用 status 这个判别字段分流
    case "loading":
      return "加载中…"
    case "success":
      return state.data.join(", ")  // 此分支里 TS 知道一定有 data
    case "failure":
      return "出错：" + state.error  // 此分支里 TS 知道一定有 error
    default:
      // 穷尽检查：漏掉某个分支时这里会编译报错
      const _exhaustive: never = state
      return _exhaustive
  }
}`

const utilityTypesSnippet = `interface User {
  id: number
  name: string
  email: string
}

// Partial<T>：所有字段变可选（常用于「更新部分字段」）
type UserPatch = Partial<User>          // { id?, name?, email? }

// Pick<T, K>：只挑选部分字段
type UserPreview = Pick<User, "id" | "name">

// Omit<T, K>：排除部分字段
type UserWithoutEmail = Omit<User, "email">

// Record<K, V>：构造键值映射
type UsersById = Record<number, User>

// Readonly<T>：所有字段只读
type FrozenUser = Readonly<User>

// ReturnType<F>：取函数返回值类型
function makeUser(): User { return {} as User }
type Made = ReturnType<typeof makeUser>   // User`

const dtsSnippet = `// legacy-lib.js（一个没有类型的旧 JS 库）
export function greet(name) {
  return "Hi, " + name
}

// legacy-lib.d.ts（手写声明文件：只描述类型，不含实现）
export function greet(name: string): string

// 之后 import { greet } from "legacy-lib" 就有完整类型提示了

// 对发布到 npm 的第三方库，社区把声明集中维护在 DefinitelyTyped 仓库，
// 通过 @types 包安装，例如：
//   npm i -D @types/node @types/lodash
// 装上后，import _ from "lodash" 自动获得类型`

const tscNoEmitSnippet = `// package.json —— 把「类型检查」和「打包」分成两个独立步骤
{
  "scripts": {
    "dev": "vite",                       // esbuild 转译，飞快，但不做类型检查
    "build": "tsc --noEmit && vite build", // 先用 tsc 检查类型，过了再交给 vite 打包
    "typecheck": "tsc --noEmit"          // CI 里单独跑，挡住类型错误
  }
}`

const zodSnippet = `// 类型只在编译期存在，运行时就被抹掉了。
// 面对「外部数据」（接口响应、表单、localStorage），编译期的 type 保证不了运行时的真实形状。
// 用 zod 这类库在运行时做校验，并自动推导出对应的静态类型：
import { z } from "zod"

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>   // 从 schema 反推出静态类型，免得写两遍

const data: unknown = await fetch("/api/user").then((r) => r.json())
const user = UserSchema.parse(data)      // 运行时校验：形状不对就抛错
// 校验通过后，user 的静态类型就是 User，安全又有提示`

export default function Ch2() {
  return (
    <article>
      <Lead>
        到这里，语言层面的 JavaScript 与 TypeScript 你已经走过一遍。最后一章我们把视角拉到
        <strong>工程</strong>：一个真实 TS 项目靠 <code>tsconfig.json</code> 配置编译行为，
        靠 <code>.d.ts</code> 声明文件与 <code>@types</code> 让无类型的库也有类型，
        靠「类型检查」与「打包」两条分工明确的流水线协作。本章讲清这些配置与最佳实践，
        最后给出一张 JS/TS 进阶学习地图，为整门课收束。
      </Lead>

      <h2>一、tsconfig.json：项目的类型契约</h2>
      <p>
        <code>tsconfig.json</code> 是 TypeScript 项目的总开关，放在项目根目录，告诉编译器
        「检查哪些文件、按什么规则检查、产出什么」。核心都在 <code>compilerOptions</code> 里。
      </p>
      <CodeBlock lang="json" title="一份典型的现代 tsconfig.json" code={tsconfigSnippet} />
      <p>逐个理解最关键的几项：</p>
      <table>
        <thead>
          <tr><th>选项</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>strict</code></td>
            <td>一键开启全部严格检查（详见下节），新项目<strong>务必开</strong>。</td>
          </tr>
          <tr>
            <td><code>target</code></td>
            <td>编译产物的 JS 语法版本，如 <code>ES2022</code>；决定箭头函数、可选链等是否被降级。</td>
          </tr>
          <tr>
            <td><code>module</code></td>
            <td>输出的模块系统（<code>ESNext</code> / <code>CommonJS</code> 等）。</td>
          </tr>
          <tr>
            <td><code>moduleResolution</code></td>
            <td>如何解析 <code>import</code> 路径；用 Vite/esbuild 选 <code>Bundler</code>，Node 项目选 <code>NodeNext</code>。</td>
          </tr>
          <tr>
            <td><code>lib</code></td>
            <td>引入哪些内置类型声明，如 <code>DOM</code>（浏览器 API）、<code>ES2022</code>。</td>
          </tr>
          <tr>
            <td><code>esModuleInterop</code></td>
            <td>抹平 CJS/ESM 互操作差异，让 <code>import x from "cjs-pkg"</code> 正常工作。</td>
          </tr>
          <tr>
            <td><code>paths</code> / <code>baseUrl</code></td>
            <td>配置路径别名（如 <code>@/*</code> 指向 <code>src/*</code>），需与打包器配置同步。</td>
          </tr>
        </tbody>
      </table>

      <h2>二、strict 全家桶</h2>
      <KeyIdea>
        <code>{'"strict": true'}</code> 不是单个开关，而是一组严格检查的总闸。它的灵魂是
        <strong>strictNullChecks</strong>——让 <code>null</code> 和 <code>undefined</code>
        不再能随便赋给任意类型，从根上消灭最常见的运行时错误「读取 undefined 的属性」。
      </KeyIdea>
      <CodeBlock lang="ts" title="strict 展开后包含的子开关" code={strictFamilySnippet} />
      <Callout variant="tip" title="给老项目逐步开 strict">
        存量项目一次性开 strict 可能报出成百上千个错。可在 tsconfig 里先单独打开
        <code>strictNullChecks</code>，分模块修，最终再切到 <code>{'"strict": true'}</code>。
        新项目则从第一天就开，成本最低。
      </Callout>

      <h2>三、最佳实践</h2>
      <h3>1. 避免 any，需要时用 unknown</h3>
      <p>
        <code>any</code> 会彻底关闭对该值的类型检查，等于在那一处放弃了 TS。当你确实不知道类型
        （如 <code>JSON.parse</code> 的结果、外部输入），改用 <code>unknown</code>：它逼你在使用前
        先做<strong>类型收窄</strong>，把检查从运行时提前到编译期。
      </p>
      <CodeBlock lang="ts" title="any 漏掉错误，unknown 逼你检查" code={unknownVsAnySnippet} />

      <h3>2. 优先类型推断，少写冗余注解</h3>
      <p>
        TS 的推断能力很强。<code>const n = 1</code> 不必写 <code>: number</code>，
        函数返回值多数时候也能推出来。注解留给「函数参数、公共 API 边界、推断不准」这些真正需要的地方，
        其余交给推断，代码更干净也更易改。
      </p>

      <h3>3. 用判别联合表达「多种状态」</h3>
      <p>
        异步请求的 loading / success / failure、不同形状的事件……与其用一堆可选字段加 <code>if</code>，
        不如用<strong>判别联合</strong>：每个成员带一个公共的字面量「标签」字段，
        在 <code>switch</code> 里分流，TS 会在每个分支自动收窄出精确类型，还能配合
        <code>never</code> 做<strong>穷尽检查</strong>，漏分支直接编译报错。
      </p>
      <CodeBlock lang="ts" title="判别联合 + 穷尽检查" code={discriminatedUnionSnippet} />

      <h3>4. 善用内置工具类型</h3>
      <p>
        TS 自带一批<strong>工具类型</strong>，能从已有类型派生出新类型，避免重复定义。
      </p>
      <CodeBlock lang="ts" title="常用工具类型" code={utilityTypesSnippet} />

      <h3>5. 类型 + 运行时校验</h3>
      <p>
        关键认知：<strong>TS 的类型在编译后会被完全抹除</strong>，运行时一行都不剩。所以面对
        来自接口、表单、本地存储的「外部数据」，编译期的 <code>type</code> 给不了任何运行时保证。
        这时用 <code>zod</code> 这类库在运行时校验数据形状，并自动推导出对应的静态类型，一举两得。
      </p>
      <CodeBlock lang="ts" title="用 zod 做运行时校验并反推类型" code={zodSnippet} />

      <h2>四、声明文件 .d.ts 与 DefinitelyTyped</h2>
      <p>
        许多 npm 库本身用 JS 写、不带类型。<strong>声明文件 <code>.d.ts</code></strong> 是
        「只有类型、没有实现」的文件，专门用来描述某段 JS 代码的类型形状，让 TS 看得懂它。
        你既可以手写，也可以——对绝大多数流行库而言——直接安装社区维护的类型包。
      </p>
      <CodeBlock lang="ts" title="手写 .d.ts，以及 @types 类型包" code={dtsSnippet} />
      <p>
        社区把成千上万个库的声明集中维护在一个叫 <strong>DefinitelyTyped</strong> 的仓库里，
        发布为 <code>@types/xxx</code> 系列包。装上 <code>@types/node</code>、<code>@types/lodash</code>
        之类，对应库立刻获得完整类型提示。许多现代库则<strong>自带</strong> <code>.d.ts</code>，无需额外安装。
      </p>

      <h2>五、TS 与构建工具的关系</h2>
      <KeyIdea>
        现代工具链里，<strong>类型检查</strong>与<strong>转译打包</strong>往往是两件事。
        Vite / esbuild / SWC 为了快，只把 TS「<strong>剥掉类型语法</strong>」转成 JS，
        <strong>不做类型检查</strong>；真正的类型检查得靠 <code>tsc --noEmit</code> 单独跑。
      </KeyIdea>
      <p>
        这意味着：开发时 Vite 跑得飞快，但它<strong>不会因为你写错类型而报错</strong>——
        类型错误会被它直接无视掉。所以正确做法是把两步分开：日常用 esbuild/Vite 转译，
        在构建前和 CI 里用 <code>tsc --noEmit</code> 把类型错误挡住。
      </p>
      <CodeBlock lang="json" title="把类型检查与打包分成独立脚本" code={tscNoEmitSnippet} />
      <Callout variant="warn" title="别以为 Vite 跑起来就等于类型没问题">
        因为 esbuild 只转译不检查，许多类型错误在开发阶段悄无声息。务必在提交前或 CI 里跑
        <code>tsc --noEmit</code>（或编辑器全量检查），否则类型安全形同虚设。
      </Callout>

      <h2>六、JS/TS 进阶学习地图</h2>
      <p>
        语言基础打完，往后还有广阔天地。下面这张地图把进阶方向分成六块，按推荐顺序给一条路径。
      </p>
      <table>
        <thead>
          <tr><th>方向</th><th>主要内容</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>语言深入</td>
            <td>事件循环与微 / 宏任务、原型链、闭包内存、迭代器 / 生成器、Proxy / Reflect、性能。</td>
          </tr>
          <tr>
            <td>TS 类型体操</td>
            <td>条件类型、映射类型、<code>infer</code>、模板字面量类型、泛型约束，写出可复用的类型工具。</td>
          </tr>
          <tr>
            <td>Node 与后端</td>
            <td>文件 / 网络 / 流、HTTP 服务、包管理与发布、CLI 工具、与数据库交互。</td>
          </tr>
          <tr>
            <td>构建工具</td>
            <td>Vite / esbuild / Rollup / Webpack，打包、Tree Shaking、代码分割、Monorepo。</td>
          </tr>
          <tr>
            <td>前端框架</td>
            <td>React 或 Vue，组件、状态管理、路由、配合 TS 写类型安全的 UI。</td>
          </tr>
          <tr>
            <td>测试与质量</td>
            <td>Vitest / Jest 单元测试、Playwright 端到端，ESLint / Prettier，CI 流水线。</td>
          </tr>
        </tbody>
      </table>
      <Example title="一条推荐路径">
        <p>
          1）先把<strong>语言深入</strong>里的事件循环、原型、闭包吃透——这是看懂一切框架源码的地基；
          2）顺手补<strong>TS 类型体操</strong>，让类型成为你的助手而非负担；
          3）选 <strong>React 或 Vue</strong> 之一深入，做几个真实项目；
          4）项目里自然会接触<strong>构建工具</strong>，按需深入打包配置；
          5）想做服务端 / 工具就转<strong>Node</strong>；
          6）全程让<strong>测试与质量</strong>（ESLint + Prettier + 单测 + CI）成为习惯，而非最后才补。
        </p>
      </Example>

      <Callout variant="tip">
        最重要的一条：<strong>动手做项目</strong>。把本课学到的类型、异步、模块化、工具配置，
        真正用在一个能跑起来、能部署、有测试的小项目里，知识才会沉淀成能力。
      </Callout>

      <Summary
        points={[
          'tsconfig.json 是项目类型契约：关键项有 strict、target、module、moduleResolution、lib、esModuleInterop、paths，新项目务必开 strict。',
          'strict 是一组严格检查的总闸，灵魂是 strictNullChecks（杜绝 null/undefined 乱赋值）；老项目可先单开它再逐步切全量。',
          '最佳实践：避免 any 改用 unknown 逼你收窄；优先类型推断；用判别联合 + 穷尽检查表达多状态；善用 Partial/Pick/Omit/Record 等工具类型；外部数据用 zod 做运行时校验并反推类型。',
          '.d.ts 声明文件只描述类型不含实现；无类型的库可手写声明或装社区维护的 @types（DefinitelyTyped）类型包，许多现代库自带类型。',
          'TS 类型编译后被完全抹除；Vite/esbuild 只转译不检查类型，必须单独跑 tsc --noEmit（构建前 / CI）才能挡住类型错误。',
          '进阶地图六向：语言深入、TS 类型体操、Node、构建工具、前端框架（React/Vue）、测试与质量；推荐路径以语言地基与做真实项目为核心。',
        ]}
      />
    </article>
  )
}
