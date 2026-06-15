import Lead from '../../components/cards/Lead.jsx'
import KeyIdea from '../../components/cards/KeyIdea.jsx'
import Example from '../../components/cards/Example.jsx'
import Practice from '../../components/cards/Practice.jsx'
import Callout from '../../components/cards/Callout.jsx'
import CodeBlock from '../../components/cards/CodeBlock.jsx'
import Summary from '../../components/cards/Summary.jsx'

const serviceCode = `import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 密钥从环境变量读，绝不硬编码。启动时若缺失就直接报错，别等运行时才炸。
API_KEY = os.environ['LLM_API_KEY']

app = FastAPI()


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str


async def run_agent(session_id: str, message: str) -> str:
    # 这里调用你的 Agent。状态（历史/记忆）从外置存储按 session_id 取，
    # 服务本身不存任何用户状态 —— 这是横向扩展的关键。
    await asyncio.sleep(0.1)         # 占位：真实是 LLM/工具调用
    return f'已收到: {message}'


@app.get('/healthz')
def health():
    # 健康检查：给负载均衡和编排系统探活用，必须轻量、不打外部依赖。
    return {'status': 'ok'}


@app.post('/chat', response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        # 超时护栏：Agent 链路可能很长，绝不能让单个请求无限期挂住。
        reply = await asyncio.wait_for(
            run_agent(req.session_id, req.message),
            timeout=20.0,
        )
        return ChatResponse(reply=reply)
    except asyncio.TimeoutError:
        # 优雅降级：超时不抛 500 给用户看堆栈，返回可读的兜底话术。
        raise HTTPException(status_code=504, detail='处理超时，请稍后重试')
    except Exception:
        # 同样不暴露内部细节，错误进 trace/日志，对外只给通用信息。
        raise HTTPException(status_code=500, detail='服务暂时不可用')

# 启动:  uvicorn service:app --host 0.0.0.0 --port 8000 --workers 4`

export default function Ch8_3() {
  return (
    <>
      <Lead>
        <p>
          在你笔记本上跑得好好的 Agent 脚本，离「能扛住一万个用户同时用」还差着一整套工程。
          部署要解决的不是「怎么让它跑起来」，而是「怎么让它在流量、故障、攻击面前都还稳得住」。
          本章把一个 Agent 从本地脚本送上线要踩过的关键台阶讲一遍。
        </p>
      </Lead>

      <h2>从本地脚本到 HTTP 服务</h2>
      <p>
        第一步是把 <code>main.py</code> 里那个 while 循环，变成一个能被远程调用的 <em>HTTP 服务</em>。
        Python 圈最顺手的是 <em>FastAPI</em>：定义几个路由，把 Agent 包在 <code>/chat</code> 接口后面，
        再用 <em>uvicorn</em> 起多个 worker 进程。从此前端、App、其它服务都能通过一个稳定的接口调用它，
        而不是登到你机器上跑脚本。
      </p>

      <KeyIdea title="无状态服务 + 外置状态，是横向扩展的关键">
        <p>
          想从一台机器扩到一百台，唯一的办法是让<strong>服务本身不存任何用户状态</strong>。
          对话历史、记忆、会话数据全部放到<strong>外置存储</strong>——Redis、数据库——里，
          服务进程只是个无记忆的「计算器」：来一个请求，按 <code>session_id</code> 从外置存储取出状态，
          算完再写回去。这样任何一台机器都能处理任何用户的任何请求，加机器就能加吞吐，
          挂一台也不丢数据。这就是 <em>stateless</em> 设计的全部意义。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="sticky-session 是反模式">
        <p>
          有人图省事，把状态存在进程内存里，再用 <em>sticky session</em>（让同一用户的请求始终打到同一台机器）
          来「保证」状态可用。这是个陷阱：那台机器一重启或一宕机，该用户的会话就全丢；负载也没法均衡，
          热门用户会把某台机器压垮，别的机器却闲着。<strong>状态外置、服务无状态</strong>才是正解，
          sticky session 只是把扩展性问题往后拖延，并不解决它。
        </p>
      </Callout>

      <h3>稳定性档位：给服务加保险</h3>
      <p>
        Agent 依赖外部 LLM API 和各种工具，这些都会慢、会抖、会挂。一个生产级服务必须层层设防，
        下面这几个档位缺一不可：
      </p>
      <ul>
        <li>
          <strong>限流</strong>（rate limit）：给每个用户/每个接口设上限，防止个别调用者或突发流量打爆下游和你的账单。
        </li>
        <li>
          <strong>超时</strong>（timeout）：每一次外部调用、每一个请求都要有超时上限，绝不允许无限期挂住。
        </li>
        <li>
          <strong>重试退避</strong>（retry with backoff）：对临时性失败做有限次重试，且间隔指数级增大，
          避免在下游已经过载时还去火上浇油。
        </li>
        <li>
          <strong>熔断</strong>（circuit breaker）：当某个依赖连续失败时，<strong>暂时停止</strong>对它的调用、直接走兜底，
          给它喘息恢复的时间，而不是让失败把整个系统拖垮。
        </li>
        <li>
          <strong>优雅降级</strong>（graceful degradation）：依赖不可用时，返回一个可读的兜底回复或缓存结果，
          而不是把 500 错误和堆栈甩给用户。
        </li>
      </ul>

      <Callout variant="warn" title="密钥管理红线">
        <p>
          <strong>API 密钥绝不能硬编码进代码，更不能提交进 git。</strong>这是工程纪律里最不能破的一条。
          密钥应从<strong>环境变量</strong>或专门的<strong>密钥管理服务</strong>读取，并在服务启动时校验其存在性——
          缺了就直接启动失败，而不是等到第一个请求才在运行时崩。一旦密钥进了代码库，
          就当它已经泄露，立刻轮换。
        </p>
      </Callout>

      <h3>冷热路径分离与灰度发布</h3>
      <p>
        <em>冷热路径分离</em>指的是：把用户在等的「热路径」（生成回复）和不必让用户等的「冷路径」
        （写日志、落库、发统计、更新长期记忆）拆开。热路径只做最少必要的事尽快返回，冷路径丢进队列异步处理。
        这样用户体感延迟最低，后台的重活也不会阻塞响应。
      </p>
      <p>
        上线新版本时用<em>灰度发布</em>（canary）：先把新版本放给 1%~5% 的流量，盯着 trace 和监控指标，
        确认没问题再逐步放量。一旦错误率或延迟异常，立刻<strong>回滚</strong>到旧版本。
        Agent 系统的行为对 prompt 和模型版本极其敏感，「直接全量上线」的风险远高于普通服务，
        灰度 + 可快速回滚是底线。
      </p>

      <Example title="一次请求在生产里的旅程">
        <p>用户点了「发送」之后，请求大致这样走：</p>
        <ul>
          <li>打到负载均衡，被分到任意一台无状态服务实例。</li>
          <li>先过限流：这个用户这分钟内没超额，放行。</li>
          <li>按 <code>session_id</code> 从 Redis 取出会话历史。</li>
          <li>调 Agent，对每次外部调用套上超时与重试退避；某依赖在熔断中则走降级。</li>
          <li>热路径返回回复；写日志、更新长期记忆等冷路径丢进队列异步做。</li>
        </ul>
        <p>整条链路上每一步都有保险，任何一个依赖抖动都不会让用户看到白屏或堆栈。</p>
      </Example>

      <h2>这对做 Agent / 工程实践意味着什么</h2>
      <p>
        部署阶段你会发现，<strong>Agent 的「智能」部分只占工程量的一小块</strong>，剩下的大半是这些
        和普通后端服务共通的稳定性功夫。好消息是：把服务设计成无状态、状态外置、层层加保险，
        这些模式一旦搭好就能复用。而上一章和上上章讲的 trace 与成本观测，正是你在灰度时判断
        「新版本到底好不好」的依据。下一章的毕业项目，会把这套部署骨架真正落到一个完整系统上。
      </p>

      <Practice title="用 FastAPI 封装一个最小 Agent 服务">
        <p>
          下面这段代码把 Agent 包成一个 FastAPI 服务：密钥从环境变量读且启动时校验、
          <code>/chat</code> 接口带超时护栏、异常做优雅降级（不向用户暴露堆栈）、另有轻量的
          <code>/healthz</code> 供探活。状态按 <code>session_id</code> 从外置存储取，服务本身无状态。
        </p>
        <CodeBlock lang="python" title="service.py" code={serviceCode} />
        <p>
          用 <code>uvicorn service:app --workers 4</code> 起多进程，前面挂个负载均衡，
          就有了一个可横向扩展的雏形。再往上补限流、重试退避、熔断，它就逐步接近生产形态了。
        </p>
      </Practice>

      <Summary
        points={[
          '上线第一步是把脚本变成 HTTP 服务（如 FastAPI + uvicorn 多 worker），暴露稳定接口。',
          '横向扩展的关键是无状态服务 + 外置状态：会话/记忆放 Redis/DB，进程不存用户状态。',
          'sticky-session 是反模式，一宕机就丢会话、负载也不均，应改为状态外置。',
          '稳定性档位缺一不可：限流、超时、重试退避、熔断、优雅降级。',
          '密钥红线：绝不硬编码或提交进 git，用环境变量/密钥管理服务并在启动时校验。',
          '冷热路径分离让热路径尽快返回；新版本用灰度发布加可快速回滚来控风险。',
        ]}
      />
    </>
  )
}
