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

      <h2>三、配置模块 src/config.ts</h2>
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
      </Example>

      <h2>四、把配置接进入口</h2>
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
