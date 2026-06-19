import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const rootMake = `dev:
	@$(PYTHON) ./scripts/check.py
	@$(RUN_WITH_GIT_BASH) ./scripts/serve.sh --dev

start:
	@$(PYTHON) ./scripts/check.py
	@$(RUN_WITH_GIT_BASH) ./scripts/serve.sh --prod

config:
	@$(PYTHON) ./scripts/configure.py          # 由 config.example.yaml 生成 config.yaml

install:
	@cd backend && uv sync                      # 后端依赖（uv）
	@cd frontend && pnpm install                # 前端依赖（pnpm）
	@uv tool install pre-commit && pre-commit install --overwrite

up:                                             # 生产 Docker
	@$(RUN_WITH_GIT_BASH) ./scripts/deploy.sh`

const backMake = `dev:
	PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 \\
	  uv run uvicorn app.gateway.app:app --host 0.0.0.0 --port 8001 --reload

gateway:
	uv run uvicorn app.gateway.app:app --host 0.0.0.0 --port 8001`

export default function Ch3() {
  return (
    <article>
      <Lead>
        一条 <code>make dev</code> 背后，到底是谁把前端、后端网关、沙箱镜像都拉起来的？这一章把构建/运行体系讲清楚：
        顶层 <code>Makefile</code> → <code>scripts/serve.sh</code> 的统一启动器 → uvicorn 加载 <code>app.gateway.app:app</code>；
        以及 <code>langgraph.json</code> 如何把入口点声明给运行时、Docker 怎么打包。把这条链摸熟，你就能在本地把整套系统跑起来调试。
      </Lead>

      <h2>一、顶层 Makefile：一组面向人的命令</h2>
      <p>
        根目录 <code>Makefile</code> 是「给人用的入口」，它把繁琐的脚本调用收敛成几个动词。关键目标：
      </p>
      <CodeBlock lang="makefile" title="Makefile（节选关键目标）" code={rootMake} />
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>命令</th><th>作用</th></tr></thead>
          <tbody>
            <tr><td><code>make setup</code></td><td>交互式向导（<code>scripts/setup_wizard.py</code>），新手推荐</td></tr>
            <tr><td><code>make config</code></td><td>由 <code>config.example.yaml</code> 生成本地 <code>config.yaml</code>（已存在则中止）</td></tr>
            <tr><td><code>make config-upgrade</code></td><td>把 example 的新字段并进现有 <code>config.yaml</code></td></tr>
            <tr><td><code>make doctor</code></td><td>体检配置与系统要求（<code>scripts/doctor.py</code>）</td></tr>
            <tr><td><code>make install</code></td><td>后端 <code>uv sync</code> + 前端 <code>pnpm install</code> + pre-commit</td></tr>
            <tr><td><code>make dev</code> / <code>make start</code></td><td>开发（热重载）/ 生产 模式启动全部服务</td></tr>
            <tr><td><code>make up</code> / <code>make down</code></td><td>生产 Docker 起停（默认 localhost:2026）</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        注意 <code>install</code> 暴露的两个事实：后端用 <strong>uv</strong> 管依赖、前端用 <strong>pnpm</strong>。
        而 <code>dev</code>/<code>start</code> 都先跑 <code>scripts/check.py</code> 校验工具链，再委托给 <code>scripts/serve.sh</code>。
      </p>

      <h2>二、serve.sh：统一启动器</h2>
      <p>
        真正干活的是 <code>scripts/serve.sh</code>。它的 usage 头注释已经把能力说清楚：
      </p>
      <CodeBlock
        lang="bash"
        title="scripts/serve.sh（头部注释）"
        code={`# Usage:
#   ./scripts/serve.sh [--dev|--prod] [--daemon] [--stop|--restart]
#
#   --dev       Development mode with hot-reload (default)
#   --prod      Production mode, pre-built frontend, no hot-reload
#   --daemon    Run all services in background (nohup), exit after startup
#   --stop      Stop all running services and exit
#
# 启动时会 source 仓库根的 .env`}
      />
      <p>
        它会先 <code>source .env</code> 注入环境变量，挑选可用的 Python，然后按模式拉起后端网关（以及开发模式下的前端）。
        网关本体由后端 <code>Makefile</code> 的 <code>dev</code>/<code>gateway</code> 目标定义——就是一行 uvicorn：
      </p>
      <CodeBlock lang="makefile" title="backend/Makefile（dev / gateway）" code={backMake} />
      <KeyIdea title="进程入口">
        后端就是 <code>uvicorn app.gateway.app:app</code> 跑在 <code>:8001</code>。这里的
        <code>app.gateway.app:app</code> 正是上一卷见过的 <code>create_app()</code> 返回的 FastAPI 实例
        （模块底部 <code>app = create_app()</code>）。开发模式加 <code>--reload</code> 热重载。
      </KeyIdea>

      <h2>三、前端如何接到后端：rewrites 反向代理</h2>
      <p>
        前端 <code>frontend/Makefile</code> 同样是 pnpm 的薄封装（<code>dev</code>→<code>pnpm dev</code>、<code>build</code>→<code>pnpm build</code>）。
        前端默认不直接打后端端口，而是通过 <code>next.config.js</code> 的 <code>rewrites()</code> 把
        <code>/api/langgraph/*</code> 反代到内部网关 <code>http://127.0.0.1:8001/api/*</code>：
      </p>
      <CodeBlock
        lang="js"
        title="frontend/next.config.js（rewrites，节选）"
        code={`// /api/langgraph → 网关 /api；/api/langgraph/:path* → 网关 /api/:path*
// gatewayURL 默认 http://127.0.0.1:8001（env DEER_FLOW_INTERNAL_GATEWAY_BASE_URL）
rewrites.push({ source: "/api/langgraph", destination: gatewayURL + "/api" });
rewrites.push({ source: "/api/langgraph/:path*", destination: gatewayURL + "/api/:path*" });`}
      />
      <p>
        这就是为什么前端的 LangGraph SDK 把 <code>apiUrl</code> 设成
        <code>{'${window.location.origin}/api/langgraph'}</code> 却能打到后端——中间隔着 Next 的反代。生产部署里这层通常由 nginx 承担。
      </p>

      <h2>四、langgraph.json：把入口点声明给运行时</h2>
      <p>
        上一章见过 <code>langgraph.json</code>，这里强调它在「运行」语境下的意义：它不是注释，而是<strong>被运行时读取的契约</strong>。
        <code>graphs.lead_agent</code> 指向 <code>make_lead_agent</code>，<code>checkpointer.path</code> 指向
        <code>make_checkpointer</code>，<code>auth.path</code> 指向 <code>langgraph_auth.py:auth</code>。
        无论是嵌入式跑（uvicorn 直接加载 <code>create_app</code>）还是接 LangGraph Server/Studio，这三个入口都是同一套。
      </p>

      <h2>五、Docker 与生产</h2>
      <p>
        <code>make up</code> 走 <code>scripts/deploy.sh</code>，使用 <code>docker/</code> 下的编排，默认把统一入口暴露在
        <code>localhost:2026</code>（nginx 同源聚合前端与网关）。沙箱镜像可用 <code>make setup-sandbox</code> 预拉
        （<code>agent-infra/sandbox</code> 系镜像），供容器化沙箱（aio-sandbox，卷 4）使用。
      </p>
      <Callout variant="tip" title="最小本地跑通路径">
        <code>make install</code> → <code>make config</code>（生成 <code>config.yaml</code>，填好至少一个模型的 key）→
        <code>make dev</code>。然后浏览器开前端，发一条消息即可触发卷 1 描述的完整 run 链路。
      </Callout>

      <Example title="怎么自己核对启动链">
        想确认「make dev 到底跑了什么」，按这条线读：<code>Makefile:dev</code> →
        <code>scripts/serve.sh</code>（看它怎么 source .env、选模式、起进程）→
        <code>backend/Makefile:dev</code>（uvicorn 命令）→ <code>app/gateway/app.py:create_app</code>。
      </Example>

      <Summary
        points={[
          '顶层 Makefile 是面向人的命令集合（setup/config/install/dev/start/up），dev/start 先 check.py 再委托 scripts/serve.sh。',
          'serve.sh 是统一启动器：source .env、选模式（dev/prod/daemon/stop），后端本体是 uvicorn app.gateway.app:app（:8001）。',
          '前端通过 next.config.js 的 rewrites 把 /api/langgraph/* 反代到网关 :8001/api/*，生产则由 nginx 同源聚合（:2026）。',
          'langgraph.json 的 graphs/auth/checkpointer 是被运行时读取的入口契约；Docker 部署用 deploy.sh + docker/ 编排，沙箱镜像可预拉。',
        ]}
      />
    </article>
  )
}
