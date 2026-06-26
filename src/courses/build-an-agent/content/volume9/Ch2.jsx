import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jailSrc = `// sandbox/path-jail.ts —— 把所有文件路径关进一个「围栏」目录
import path from 'node:path'

export class PathJail {
  constructor(private readonly root: string) {}   // 例如 /项目根 或 ~/.forge/workspace/<sid>

  /** 把工具传入的路径解析成真实绝对路径，并确保它没逃出围栏。 */
  resolve(p: string): string {
    const abs = path.resolve(this.root, p)
    const rel = path.relative(this.root, abs)
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new SandboxError('EACCES', \`拒绝访问：路径逃出了沙箱围栏: \${p}\`)
    }
    return abs
  }
}`

const bashGateSrc = `// sandbox/host-bash.ts —— host bash 默认禁用（对照 DeerFlow security.py）
export function isHostBashAllowed(cfg: Config): boolean {
  // 没有真正的容器隔离时，直接在主机跑任意 shell 风险太大 → 默认拒绝
  if (cfg.sandbox.kind !== 'host') return true        // 容器/远程沙箱本身隔离，放行
  return cfg.sandbox.allowHostBash === true           // host 模式必须显式开启
}

const HOST_BASH_DISABLED =
  'host bash 已禁用：当前是非隔离的 host 沙箱。请在 .forge 配置里设 ' +
  'sandbox.allowHostBash=true，或改用容器沙箱后再运行 shell 命令。'`

const mwSrc = `// middleware/sandbox.ts —— 把文件/命令工具关进围栏，并遮蔽真实路径
export function sandboxMiddleware(cfg: SandboxConfig): Middleware {
  return {
    name: 'sandbox',
    beforeAgent(c) {
      // 懒创建：每个会话一个 jail（host 模式下就是项目根/工作区）
      c.scratch.jail = new PathJail(cfg.root)
    },
    async wrapTool(tu, next) {
      const jail = /* from scratch */ getJail(c)
      if (tu.name === 'bash' && !isHostBashAllowed(cfg)) {
        return toolError(HOST_BASH_DISABLED)
      }
      // 对文件类工具：把 input.path 收进围栏（逃逸即拒）
      if (FILE_TOOLS.has(tu.name) && typeof tu.input.path === 'string') {
        tu.input.path = jail.resolve(tu.input.path)   // 抛 EACCES 即被 errorHealing 转成 tool_result
      }
      const out = await next()
      return maskPaths(out, jail.root)                // 输出里把真实根目录遮蔽成相对路径
    },
  }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        forge 的 <code>write</code> / <code>bash</code> 工具是直接在你主机上跑的——模型说删哪个文件就删哪个，说
        <code>rm -rf /</code> 它也照敲（第 3 卷的危险确认能拦一部分，但那是「问一句」而不是「关进围栏」）。
        DeerFlow 在这件事上有一条非常清醒的判断：<strong>本地直接执行不是安全边界</strong>，所以它默认禁用 host bash，并把所有路径
        关进虚拟围栏。这一章我们照搬这套思路，给 forge 的工具执行套上沙箱。
      </Lead>

      <h2>一、两种隔离强度</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>沙箱模式</th><th>隔离强度</th><th>host bash</th></tr></thead>
          <tbody>
            <tr><td><code>host</code>（默认，路径围栏）</td><td>仅「路径作用域」，非内核隔离</td><td><strong>默认禁用</strong>，需显式开启</td></tr>
            <tr><td><code>container</code>（docker 等）</td><td>真正的内核隔离</td><td>放行（容器内随便跑）</td></tr>
          </tbody>
        </table>
      </div>
      <KeyIdea title="DeerFlow 的核心论断">
        DeerFlow 的 <code>sandbox/security.py::is_host_bash_allowed</code> 写得很直白：本地 Provider 默认 <strong>禁</strong> host bash，
        必须显式 <code>allow_host_bash: true</code> 才放行；而容器化的 aio-sandbox 因为有真隔离，则直接放行。
        理由是：本地沙箱只有「路径作用域」而非内核隔离，让模型在主机随意跑 shell 风险太大。我们给 forge 抄这条规则。
      </KeyIdea>

      <h2>二、路径围栏：拒绝逃逸</h2>
      <CodeBlock lang="ts" title="sandbox/path-jail.ts" code={jailSrc} />
      <p>
        关键就是 <code>path.relative(root, abs)</code> 之后判断它<strong>没有以 <code>..</code> 开头、也不是绝对路径</strong>——
        任何想用 <code>../../etc/passwd</code> 或软链接逃出围栏的尝试都会被拒。这对应 DeerFlow <code>local_sandbox.py</code> 里用
        <code>resolved_path.relative_to(local_root)</code> 失败即抛 <code>PermissionError</code> 的逃逸校验。
      </p>

      <h2>三、host bash 门控</h2>
      <CodeBlock lang="ts" title="sandbox/host-bash.ts" code={bashGateSrc} />

      <h2>四、写成一个中间件</h2>
      <p>有了围栏和门控，把它们装进上一章的中间件框架——一个 <code>wrapTool</code> 就够了：</p>
      <CodeBlock lang="ts" title="middleware/sandbox.ts" code={mwSrc} />
      <ul>
        <li><strong>bash 门控</strong>：host 模式未放行时，直接返回一条 <code>tool_result</code> 错误，根本不执行。</li>
        <li><strong>路径收口</strong>：文件类工具的 <code>path</code> 参数先过 <code>jail.resolve</code>，逃逸就抛错（被 c4 的错误自愈中间件转成 tool_result）。</li>
        <li><strong>路径遮蔽</strong>：工具输出里把真实根目录替换成相对路径，避免把主机目录结构泄露给模型——对应 DeerFlow 的 <code>mask_local_paths_in_output</code>。</li>
      </ul>
      <Callout variant="warn" title="围栏不是万能的">
        和 DeerFlow 一样要诚实：纯路径围栏挡得住「老实」的路径，挡不住 shell 里的变量展开、子 shell、编码绕过。所以它是
        <strong>纵深防御的一层，不是边界</strong>。真要跑不可信代码，得上容器（forge 的 <code>container</code> 模式，可作为课后扩展）。
        但即便只是路径围栏 + 默认禁 host bash，也已经远比「裸在主机上跑」安全。
      </Callout>

      <Example title="和第 3 卷权限的关系">
        权限（第 3 卷）回答「这个操作要不要问用户」；沙箱回答「这个操作能触达哪些文件、能不能跑 shell」。两者正交、叠加：
        一次 <code>write</code> 既要通过沙箱围栏（路径合法），又要通过权限策略（用户允许）。生产级 Agent 两道都要有。
      </Example>

      <Summary
        points={[
          'forge 的写/执行工具直接跑在主机上，缺乏隔离；DeerFlow 的清醒判断是「本地执行不是安全边界」，默认禁 host bash。',
          'PathJail 用 path.relative 后判断不以 .. 开头、非绝对路径来拒绝逃逸，对应 DeerFlow 的 relative_to 逃逸校验。',
          'isHostBashAllowed：host 模式默认禁 bash、需显式开启；容器模式放行——抄自 DeerFlow security.py。',
          '把围栏+门控+路径遮蔽写成一个 sandbox 中间件（wrapTool）；它与权限正交：一个管「能触达哪」，一个管「要不要问」。',
        ]}
      />
    </article>
  )
}
