import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const configTs = `import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// 配置系统：两级配置，全局级(~/.forge/config.json) 与 项目级(<cwd>/.forge/config.json)。
// 项目级优先（覆盖全局级），这样既能有全局默认、又能让单个项目特殊化。

export interface McpServerConfig {
  command: string
  args?: string[]
}

export interface ForgeConfig {
  /** Provider 名称，默认 claude。 */
  provider?: string
  /** API 密钥（也可用环境变量 ANTHROPIC_API_KEY）。 */
  apiKey?: string
  /** API 基址 URL（接入代理或兼容端点时用；留空走官方默认）。 */
  baseURL?: string
  /** 模型标识。 */
  model?: string
  /** 单轮最大输出 token。 */
  maxTokens?: number
  /** 上下文窗口大小。 */
  contextWindow?: number
  /** 要接入的 MCP server 列表，键为名字。 */
  mcpServers?: Record<string, McpServerConfig>
}

function readJson(path: string): Partial<ForgeConfig> {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Partial<ForgeConfig>
  } catch {
    return {} // 文件不存在或非法都视为空配置
  }
}

export function loadConfig(cwd: string): ForgeConfig {
  const global = readJson(join(homedir(), '.forge', 'config.json'))
  const project = readJson(join(cwd, '.forge', 'config.json'))
  // 浅合并即可：项目级整体覆盖全局级的同名顶层字段。
  return { ...global, ...project }
}`

const exampleJson = `{
  "provider": "claude",
  "apiKey": "sk-ant-xxxxxxxx",
  "model": "claude-opus-4-8",
  "maxTokens": 8192,
  "contextWindow": 200000,
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"]
    }
  }
}`

const bailianJson = `{
  "provider": "bailian",
  "apiKey": "sk-百炼的-API-KEY",
  "model": "qwen-max"
}`

const deepMergeTs = `function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// 深合并：仅对「值都是对象」的同名键递归合并，其余一律「后者覆盖前者」。
// 用它能让 mcpServers 这类嵌套对象按键合并，而不是被整体替换。
function deepMerge<T>(base: T, override: Partial<T>): T {
  const out: Record<string, unknown> = { ...(base as object) }
  for (const [k, v] of Object.entries(override as object)) {
    if (v === undefined) continue // 显式 undefined 不参与覆盖，避免抹掉默认值
    if (isObject(v) && isObject(out[k])) {
      out[k] = deepMerge(out[k], v)
    } else {
      out[k] = v
    }
  }
  return out as T
}`

const envOverrideTs = `// 把环境变量当作「比文件更高优先级」的来源，叠在最上层。
// 这样既能在 CI / 容器里用 env 注入密钥（不落盘），又不破坏文件配置。
export function loadConfig(cwd: string): ForgeConfig {
  const global = readJson(join(homedir(), '.forge', 'config.json'))
  const project = readJson(join(cwd, '.forge', 'config.json'))
  const fromFiles = { ...global, ...project }
  const fromEnv: Partial<ForgeConfig> = {}
  if (process.env.ANTHROPIC_API_KEY) fromEnv.apiKey = process.env.ANTHROPIC_API_KEY
  if (process.env.FORGE_MODEL) fromEnv.model = process.env.FORGE_MODEL
  // 优先级（低 → 高）：内置默认 < 全局文件 < 项目文件 < 环境变量
  return { ...fromFiles, ...fromEnv }
}`

const indexTs = `const config = loadConfig(process.cwd())
const provider = createProvider({ provider: config.provider, model: config.model, contextWindow: config.contextWindow })
// …
agent = new Agent({
  provider,
  tools,
  system: buildSystemPrompt(process.cwd()),
  cwd: process.cwd(),
  audit,
  maxTokens: config.maxTokens,
  // …
})`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到目前为止，forge 的模型名、token 上限、上下文窗口都硬编码在源码里。换个模型就得改代码、重新构建——这不是一个能交付给别人用的工具该有的样子。本章我们给 forge 装上一套两级配置系统：全局默认加项目覆盖，让「用什么模型、单轮多少 token、接哪些 MCP server」都变成配置项。
      </Lead>

      <h2>一、为什么要配置</h2>
      <p>
        回顾前几卷，我们写下了不少「定死」的值：用哪个模型、单轮最多输出多少 token、上下文窗口多大。这些值写在代码里时一切都好，可一旦工具要给别人用、或者你自己想在不同项目里用不同模型，硬编码就成了枷锁——每次调整都要翻源码、改常量、重新构建。
      </p>
      <p>
        真正该外置的是这几类东西：用哪个 <code>provider</code> 和 <code>model</code>、单轮最大输出 token、上下文窗口大小、以及要接入哪些 MCP server。它们因人因项目而异，不该和实现逻辑搅在一起。
      </p>

      <KeyIdea>
        好工具的能力差异应该通过「配置」来表达，而不是通过「改源码」。把易变的决策从代码里抽出来放进配置文件，工具才能被复用、被分发、被不同场景调教，而核心逻辑保持稳定。
      </KeyIdea>

      <p>
        这背后其实有一条流传已久的工程原则：<strong>12-Factor App</strong> 的第三条——「在环境中存储配置」（Store config in the environment）。它的核心主张是把「随部署环境变化的东西」（密钥、端点、开关）与「不随环境变化的代码」严格分开。判断一个值该不该外置，有个朴素的试金石：<em>这份代码要是现在开源出去、推上公共仓库，会不会有什么东西不该被人看到、或者别人拿去跑不起来？</em>凡是「会泄露」（密钥）或「换个人/换台机器就得改」（模型、端点）的，都该外置。
      </p>

      <table>
        <thead>
          <tr><th>类别</th><th>例子</th><th>该放哪</th></tr>
        </thead>
        <tbody>
          <tr><td>稳定的实现逻辑</td><td>主循环、工具契约、消息编解码</td><td>源码（编译进产物）</td></tr>
          <tr><td>因人因项目而异的决策</td><td>provider、model、maxTokens、mcpServers</td><td>配置文件</td></tr>
          <tr><td>敏感且随环境变化</td><td>API key、自建代理的 baseURL</td><td>环境变量优先，文件兜底</td></tr>
        </tbody>
      </table>

      <Callout variant="note">
        有人会问：那「默认值」算配置吗？不算。默认值是代码对「绝大多数人不会去改的东西」给出的合理兜底——它属于实现的一部分，写在代码里。配置只负责表达「我和默认不一样的地方」。这条界线想清楚了，配置文件才会保持短小：一份健康的项目级配置往往只有三五行，而不是把每个参数都抄一遍。
      </Callout>

      <h2>二、两级配置：全局默认 + 项目覆盖</h2>
      <p>
        我们采用两级配置：
      </p>
      <ul>
        <li>
          <strong>全局级</strong>：<code>~/.forge/config.json</code>，是你所有项目共享的默认值。一次配好，处处生效。
        </li>
        <li>
          <strong>项目级</strong>：<code>{'<cwd>/.forge/config.json'}</code>，放在项目目录下，用来对单个项目做特殊化。
        </li>
      </ul>
      <p>
        加载时两份合并，<strong>项目级覆盖全局级</strong>：全局没配的字段走全局默认，项目里写了的就以项目为准。
      </p>

      <Callout variant="tip">
        这种「全局默认 + 项目覆盖」的分层非常实用，你天天都在用它——<code>git</code> 就是这么干的。<code>~/.gitconfig</code> 配你的全局 user.name、邮箱、别名，而仓库里的 <code>.git/config</code> 可以为这个项目单独覆盖。绝大多数项目沿用全局默认，个别项目按需特殊化，既省事又灵活。forge 的两级配置就是同一套思路。
      </Callout>

      <p>
        <strong>为什么只要两级，而不是三级、五级？</strong>层级越多，「最终生效的值到底来自哪」就越难推理——这是配置系统最常见的痛点。你可能见过那种工具：值能来自命令行参数、环境变量、项目文件、用户文件、系统级文件、再加上代码默认值，整整六层。出了问题想查「为什么 model 是这个值」，得在脑子里跑一遍六层覆盖。forge 刻意只保留「全局 + 项目」两级文件（外加密钥的环境变量旁路），覆盖原因永远能一句话说清。<strong>层级数是要克制的设计预算，不是越多越显得专业。</strong>
      </p>

      <p>
        说说优先级的精确顺序。从低到高是：<strong>内置默认值 → 全局文件 → 项目文件 → 环境变量</strong>。越靠近「具体使用场景」的来源，优先级越高——这符合直觉：你在某个项目目录里专门写下的，理应压过你给所有项目定的全局默认；而临时用环境变量注入的（常见于 CI、容器），又该压过落盘的文件，因为它最贴近「此刻这一次运行」。</p>

      <h2>三、合并的两个坑：浅合并 vs 深合并</h2>
      <p>
        前面的 <code>loadConfig</code> 用对象展开做<strong>浅合并</strong>。浅合并只看顶层键：项目里写了 <code>model</code>，就整体替换全局的 <code>model</code>。对 <code>model</code>、<code>maxTokens</code> 这种「值是标量」的字段，这完全正确。
      </p>
      <p>
        但有个隐蔽的坑藏在 <code>mcpServers</code> 这种<strong>嵌套对象</strong>上。假设你全局配了 <code>filesystem</code> 和 <code>git</code> 两个 MCP server，然后在某个项目里只想<strong>额外</strong>加一个 <code>postgres</code>。如果你在项目文件里写 <code>mcpServers</code>，浅合并会用项目的整个 <code>mcpServers</code> 对象替换掉全局的——结果 <code>filesystem</code> 和 <code>git</code> 全没了，只剩 <code>postgres</code>。这几乎一定不是你想要的。
      </p>
      <p>
        解决办法是对「值都是对象」的字段做<strong>深合并</strong>（递归地按键合并），其余字段仍走「后者覆盖」。下面是一个通用的小工具：
      </p>

      <CodeBlock lang="ts" title="src/config.ts（深合并）" code={deepMergeTs} />

      <p>
        注意两个细节。其一，<code>isObject</code> 把数组排除在「可深合并」之外——数组该整体替换还是逐项合并，没有放之四海皆准的答案，整体替换是最不容易让人意外的选择（你写了新数组，就是想要这个新数组）。其二，显式的 <code>undefined</code> 直接跳过，不参与覆盖：否则一个粗心写出的 <code>{'{ model: undefined }'}</code> 会把全局精心配好的 <code>model</code> 抹成空，这种「被空值覆盖」是配置系统里极常见、又极难排查的 bug。
      </p>

      <Callout variant="warn">
        <strong>常见误区：以为合并是「越深越好」。</strong>恰恰相反。深合并让「一个值到底从哪来」变得更难追踪——同一个 <code>mcpServers.filesystem.args</code> 可能一半来自全局、一半来自项目。forge 的取舍是：<em>只在真正需要按键累加的嵌套对象上用深合并，顶层标量一律浅覆盖。</em>能用简单语义就别上复杂语义，这是配置可维护性的关键。
      </Callout>

      <h2>四、配置模块 src/config.ts</h2>
      <p>
        下面是完整的配置模块。它只做三件事：定义配置的形状（<code>ForgeConfig</code>）、安全地读一个 JSON 文件（<code>readJson</code>）、把两级配置合并成最终配置（<code>loadConfig</code>）。
      </p>

      <CodeBlock lang="ts" title="src/config.ts" code={configTs} />

      <p>
        逐段看：
      </p>
      <p>
        <strong><code>ForgeConfig</code> 各字段。</strong>全部是可选的（带 <code>?</code>），因为缺省时应该走默认值而非报错。<code>provider</code> 选用哪个模型供应商（默认 claude）；<code>model</code> 是具体的模型标识；<code>maxTokens</code> 限制单轮最大输出 token；<code>contextWindow</code> 是上下文窗口大小；<code>mcpServers</code> 是要接入的 MCP server 列表，用 <code>Record</code> 以「名字」为键，每个值是一条 <code>McpServerConfig</code>（启动命令 <code>command</code> 加可选参数 <code>args</code>）。
      </p>
      <p>
        <strong><code>readJson</code> 为什么读失败就返回空对象。</strong>注意整个函数包在 <code>try/catch</code> 里，<code>catch</code> 直接返回 <code>{'{}'}</code>。这是有意为之：配置文件不存在、内容是非法 JSON——这些在现实中都是<strong>正常情况</strong>。用户大概率根本没建全局或项目配置，缺配置不该让程序崩溃，而应该平滑地当作「没有任何覆盖」处理。
      </p>
      <p>
        <strong><code>loadConfig</code> 怎么合并。</strong>先读全局，再读项目，然后用对象展开 <code>{'{ ...global, ...project }'}</code> 做<strong>浅合并</strong>。展开的顺序决定优先级：<code>project</code> 在后，它的同名顶层字段会覆盖 <code>global</code> 的。这里浅合并就够用——我们覆盖的是顶层字段（如换个 <code>model</code>、改个 <code>maxTokens</code>），不需要深入到 <code>mcpServers</code> 内部逐键合并。
      </p>

      <Example title="一份 config.json 示例">
        <p>来看一份具体的配置长什么样，直观感受一下各字段：</p>
        <CodeBlock lang="json" title="~/.forge/config.json" code={exampleJson} />
        <p>
          这份配置指定了 claude 供应商和具体模型，把单轮输出限制在 8192 token，声明 200000 的上下文窗口，并接入了一个名为 <code>filesystem</code> 的 MCP server——它会通过 <code>npx</code> 拉起文件系统 server。MCP 的接入细节我们留到本卷后面讲。
        </p>
        <p>
          换一个完全不同的平台也只是改几行配置。比如用<strong>阿里云百炼（Qwen 系列）</strong>：把 <code>provider</code> 设为 <code>bailian</code>、填上百炼的 key、选一个 Qwen 模型即可——它走的是百炼的 OpenAI 兼容接口（这个 Provider 的实现是下一章的内容）：
        </p>
        <CodeBlock lang="json" title="~/.forge/config.json（用百炼）" code={bailianJson} />
      </Example>

      <h2>五、密钥安全：别让 key 落进仓库</h2>
      <p>
        <code>apiKey</code> 是整套配置里唯一「泄露就出事」的字段——它等于你账号的付费权限。所以它的处理要比别的字段更小心一层。forge 的策略是<strong>双通道</strong>：既允许写进配置文件（方便本地开发），也允许走环境变量 <code>ANTHROPIC_API_KEY</code>（方便 CI、容器、共享机器），而且让环境变量优先。
      </p>

      <CodeBlock lang="ts" title="src/config.ts（环境变量叠在最上层）" code={envOverrideTs} />

      <p>
        为什么让 env 优先于文件？因为环境变量<strong>不落盘</strong>——它只活在进程的生命周期里，不会被 <code>git add .</code> 误提交，也不会随项目目录被拷贝、被压缩包发出去。在 CI 里，密钥通常存在平台的 Secret 管理里，运行时才注入成环境变量，全程不碰文件系统。这是密钥处理的黄金路径。
      </p>

      <table>
        <thead>
          <tr><th>放置方式</th><th>泄露风险</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td>硬编码进源码</td><td>极高（必进仓库）</td><td>永远不要</td></tr>
          <tr><td>项目级 config.json</td><td>中（靠 .gitignore 兜底）</td><td>本地单人开发</td></tr>
          <tr><td>全局 ~/.forge/config.json</td><td>低（在仓库外）</td><td>个人机器默认密钥</td></tr>
          <tr><td>环境变量 / Secret 管理</td><td>最低（不落盘）</td><td>CI、容器、团队协作</td></tr>
        </tbody>
      </table>

      <Callout variant="warn">
        <strong>最危险的一类事故：密钥进了 git 历史。</strong>很多人以为「我把含密钥的文件删了再提交一次就安全了」——错。git 记录全部历史，那次含密钥的 commit 永远躺在 <code>git log</code> 里，任何 clone 过仓库的人都能翻出来。一旦发生，唯一正确的处置是<strong>立刻吊销并轮换那把 key</strong>，而不是寄希望于「改写历史」。预防永远比补救便宜，所以 <code>.forge/</code> 进 <code>.gitignore</code> 这一步从项目第一天就要做对。
      </Callout>

      <h2>六、把配置接进入口</h2>
      <p>
        配置模块写好了，下一步是在程序启动时加载它，并把各字段喂给真正需要的地方。
      </p>

      <CodeBlock lang="ts" title="src/index.ts（加载配置）" code={indexTs} />

      <p>
        流程很直白：启动时第一件事就是 <code>loadConfig(process.cwd())</code>，拿当前工作目录去合并全局与项目两级配置。接着把配置分发出去——<code>provider</code>、<code>model</code>、<code>contextWindow</code> 交给 <code>createProvider</code>（这个工厂是下一章的主角），<code>maxTokens</code> 交给 <code>Agent</code>。
      </p>
      <p>
        注意：那些没在配置里出现的字段，会因为是 <code>undefined</code> 而落到各自的默认值上——也就是我们在前面几卷里为每个参数定下的默认。配置只负责「覆盖你想改的」，其余一切照旧。
      </p>

      <Callout variant="warn">
        <code>config.json</code> 里有可能放 API key 这类敏感信息。所以项目级的 <code>.forge/</code> 目录一定要进 <code>.gitignore</code>（forge 已经替你这么做了）。千万不要把含密钥的配置文件提交到仓库——一旦推上远端，密钥就等于泄露了。
      </Callout>

      <Example title="一次配置加载的完整推演">
        <p>
          把前面所有规则串起来走一遍，假设有这样三个来源：
        </p>
        <ul>
          <li>全局 <code>~/.forge/config.json</code>：<code>{'{ "model": "claude-opus-4-8", "maxTokens": 8192 }'}</code></li>
          <li>项目 <code>.forge/config.json</code>：<code>{'{ "maxTokens": 4096 }'}</code></li>
          <li>环境变量：<code>ANTHROPIC_API_KEY=sk-ant-xxx</code></li>
        </ul>
        <p>
          最终生效的配置是：<code>model</code> 取全局的 <code>claude-opus-4-8</code>（项目没覆盖）；<code>maxTokens</code> 取项目的 <code>4096</code>（项目压过全局）；<code>apiKey</code> 取环境变量的值（env 压过文件，也没落进任何文件）；而 <code>contextWindow</code> 三处都没写，于是落到代码里的默认值。一句话：<strong>每个字段独立地按「内置默认 &lt; 全局 &lt; 项目 &lt; 环境」取最高优先级的来源。</strong>这种「逐字段判定」正是浅合并/对象展开天然给你的行为。
        </p>
      </Example>

      <Callout variant="note">
        下一章预告：我们会用 <code>config.provider</code> 和 <code>config.model</code> 来驱动一个 Provider 工厂（<code>createProvider</code>），实现「换模型不改主循环」——把模型从硬依赖变成可插拔的组件。
      </Callout>

      <Summary points={[
        '硬编码模型名、token 上限等让工具难以复用，易变的决策应外置为配置。',
        '好工具靠「配置」表达能力差异，而不是靠「改源码」。',
        '两级配置：全局级 ~/.forge/config.json 提供默认，项目级 <cwd>/.forge/config.json 做覆盖，项目级优先。',
        '这与 .gitconfig 的全局/仓库两级是同一套「全局默认 + 项目覆盖」思路。',
        'config.ts 三件事：ForgeConfig 定形状、readJson 安全读（失败返回空对象）、loadConfig 浅合并（项目级在后覆盖全局级）。',
        '入口处先 loadConfig，再把字段分发给 createProvider 和 Agent；未配置的字段走各自默认值。',
        '配置可能含 API key，项目级 .forge/ 必须进 .gitignore，不要提交含密钥的配置。',
        '下一章用 config.provider/model 驱动 Provider 工厂，实现换模型不改主循环。',
      ]} />
    </article>
  )
}
