import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const authMw = `class AuthMiddleware(BaseHTTPMiddleware):
    _PUBLIC_PATH_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")
    # 精确公共路径：login/local, register, logout, setup-status, initialize
    #   注意 /api/v1/auth/me、/change-password 不公共

    async def dispatch(self, request, call_next):
        if _is_public(request.url.path):
            return await call_next(request)
        internal_user = get_internal_user() if is_valid_internal_auth_token(...) else None
        if internal_user:                 # 可信内部调用（IM 渠道 worker）
            user = internal_user
        elif access_token:                # cookie 存在 → 严格校验
            try:    user = await get_current_user_from_request(request)
            except HTTPException as exc:
                if not is_auth_disabled(): return JSONResponse(exc.status_code, {...})
                user = get_auth_disabled_user()
        elif is_auth_disabled():          user = get_auth_disabled_user()
        else:    return JSONResponse(401, {"detail": "NOT_AUTHENTICATED"})  # fail-closed
        request.state.user = user; request.state.auth = AuthContext(user, _ALL_PERMISSIONS)
        set_current_user(user)            # 设置 ContextVar，repository 层据此按 owner 过滤
        ...`

const jwt = `def create_access_token(user_id, expires_delta=None, token_version=0):
    payload = {"sub": user_id, "exp": ..., "iat": ..., "ver": token_version}
    return jwt.encode(payload, SECRET, algorithm="HS256")

# 校验链（deps.get_current_user_from_request）：
#   cookie["access_token"] → decode_token → get_user(sub)
#   → 若 user.token_version != payload.ver: 401 TOKEN_INVALID  ← 改密即吊销旧 token`

const csrf = `class CSRFMiddleware:
    def should_check_csrf(self, request):
        return request.method in ("POST","PUT","DELETE","PATCH") \\
               and not is_auth_disabled() and request.url.path != "/api/v1/auth/me"

    # 状态变更非 auth 端点：要求 csrf_token cookie 与 X-CSRF-Token header
    #   同时存在且 secrets.compare_digest 相等，否则 403（Double Submit Cookie）
    # auth 端点（login/logout/register/initialize）：首次无 token，改用 Origin 校验`

export default function Ch3() {
  return (
    <article>
      <Lead>
        deer-flow 自带一整套账号鉴权，不依赖外部 IdP 也能跑。它的安全模型是<strong>四层叠加</strong>：
        <code>AuthMiddleware</code> 做 fail-closed 的全局认证兜底，CSRF 中间件挡跨站请求，<code>@require_permission</code>
        装饰器做细粒度授权与资源归属，<code>internal_auth</code> 给 IM 渠道 worker 一条「可信代用户」的通道。
        外加一条 LangGraph 兼容路径复用同一套规则。这一章把这四层逐一拆开。
      </Lead>

      <h2>一、AuthMiddleware：fail-closed 的兜底</h2>
      <p>
        第一层是 <code>app/gateway/auth_middleware.py</code> 的 <code>AuthMiddleware</code>。它的核心原则是
        <strong>fail-closed</strong>：非公共路径只要拿不到有效会话，直接 401，绝不放行。
      </p>
      <CodeBlock lang="python" title="app/gateway/auth_middleware.py — dispatch（精简）" code={authMw} />
      <KeyIdea title="为什么 fail-closed 很重要">
        源码注释引用了一个具体攻击：如果不 fail-closed，<code>/api/models</code> 会接受任意「形状像 cookie」的垃圾字符串
        而放行（junk cookie bypass）。所以这里的策略是：非公共路径 + 无有效会话 = 401，没有「容错放行」。
        认证成功后会把 <code>user</code> / <code>auth</code> 盖章到 <code>request.state</code>，并 <code>set_current_user</code> 设置
        ContextVar——这样下游 repository 层能自动按 owner 过滤数据，<code>finally</code> 里再 <code>reset</code>。
      </KeyIdea>
      <p>
        公共路径白名单很克制：前缀只有 <code>/health /docs /redoc /openapi.json</code>，精确路径只有登录/注册/登出/setup 那几个；
        <strong><code>/api/v1/auth/me</code> 和 <code>/change-password</code> 都不公共</strong>。
      </p>

      <h2>二、JWT：token_version 实现「改密即吊销」</h2>
      <p>
        会话用 JWT（HS256）承载，放在 <code>httponly</code> 的 <code>access_token</code> cookie 里。签发与校验在
        <code>app/gateway/auth/jwt.py</code> 与 <code>deps.py</code>：
      </p>
      <CodeBlock lang="python" title="auth/jwt.py + deps（校验链）" code={jwt} />
      <KeyIdea title="token_version：无状态吊销">
        payload 里带一个 <code>ver</code>（= 用户的 <code>token_version</code>）。校验时若
        <code>user.token_version != payload.ver</code> 就判 401。改密码时递增 <code>token_version</code> 并重签 cookie，
        于是<strong>所有旧 token 一次性失效</strong>——这是无状态 JWT 实现「主动吊销」的经典手法。
        口令哈希用版本化格式 <code>$dfv2$&lt;bcrypt&gt;</code>，v2 先 <code>sha256</code> 预哈希再 bcrypt，绕开 bcrypt 72 字节截断；
        登录时若发现旧版本会透明 rehash 升级。
      </KeyIdea>

      <h2>三、CSRF：双提交 Cookie</h2>
      <CodeBlock lang="python" title="app/gateway/csrf_middleware.py（精简）" code={csrf} />
      <p>
        对状态变更的非 auth 端点，要求 <code>csrf_token</code> cookie 与 <code>X-CSRF-Token</code> 请求头<strong>同时存在且相等</strong>
        （用 <code>secrets.compare_digest</code> 防时序攻击），否则 403。这就是 Double Submit Cookie：攻击者能让浏览器自动带上
        cookie，但读不到 cookie 值、伪造不出匹配的请求头。注意这个 <code>csrf_token</code> cookie 必须
        <code>httponly=False</code>（要让前端 JS 读出来塞进 header），<code>samesite="strict"</code>。
      </p>
      <Callout variant="note" title="登录端点的特殊处理">
        login/register/logout/initialize 这些 auth 端点首次访问还没有 csrf token，无法走双提交。它们改用
        <strong>Origin 校验</strong>：请求的 <code>Origin</code> 必须等于自身 origin 或在白名单内（无 Origin 的 curl/移动端放行），
        以防登录 CSRF / 会话固定。
      </Callout>

      <h2>四、细粒度授权：@require_permission 与归属校验</h2>
      <p>
        中间件只保证「是某个认证用户」，具体「能不能动这条资源」由 <code>app/gateway/authz.py</code> 的装饰器把守：
      </p>
      <CodeBlock
        lang="python"
        title="authz.py — @require_permission"
        code={`@require_permission("runs", "create", owner_check=True, require_existing=True)
# owner_check=True → thread_store.check_access(thread_id, user.id, require_existing=...)
#   规则：缺行/NULL-owner 视为允许（兼容遗留/共享数据）；
#         仅「存在且 user_id 不同」才 404（strict-deny，用 404 防 URL 枚举）
# require_existing=True：破坏性路由（DELETE/PATCH/state-update）缺行即拒`}
      />
      <p>
        授权目前主要靠 <strong>owner_check 做资源隔离</strong>（认证用户默认持全部权限 <code>_ALL_PERMISSIONS</code>）。
        即便是内部 token 调用（<code>system_role == "internal"</code>），也会按 <code>X-DeerFlow-Owner-User-Id</code> 缩小校验，
        <strong>不绕过归属</strong>——泄露内部 token 也不得跨用户。
      </p>

      <h2>五、内部可信调用：让渠道 worker 代用户行事</h2>
      <p>
        IM 渠道的后台 worker 不是浏览器，没有用户 cookie，但又需要替某个绑定用户发起 run。这条通道在
        <code>internal_auth.py</code>：
      </p>
      <ul>
        <li>请求头 <code>X-DeerFlow-Internal-Token</code>（环境变量 <code>DEER_FLOW_INTERNAL_AUTH_TOKEN</code>，未设则进程随机），
          用 <code>secrets.compare_digest</code> 校验。</li>
        <li>命中后 <code>get_internal_user()</code> 返回一个 <code>system_role="internal"</code> 的合成用户。</li>
        <li>再配合 <code>X-DeerFlow-Owner-User-Id</code>，<strong>只有在内部 token 已验证后</strong>，
          <code>get_trusted_internal_owner_user_id</code> 才认这个 owner 覆盖，让 worker 代连接 owner 行事。</li>
      </ul>
      <Example title="LangGraph 兼容路径：同一套规则的复用">
        若直连 LangGraph Server/Studio（而非嵌入式网关），<code>langgraph_auth.py</code> 提供
        <code>@auth.authenticate</code> 与 <code>@auth.on</code>：前者复用同样的 CSRF + JWT + token_version 校验，
        后者在写时把 <code>metadata.user_id</code> 设为当前用户、读/删时按 <code>user_id</code> 过滤——让 LangGraph Server
        强制与网关一致的 thread 隔离。默认嵌入式模式不加载它。
      </Example>

      <Summary
        points={[
          'AuthMiddleware 是 fail-closed 兜底：非公共路径无有效会话即 401；成功后盖章 request.state 并设 ContextVar 供 repository 按 owner 过滤。',
          'JWT(HS256) 用 payload.ver 对齐 user.token_version 实现「改密即吊销」；口令哈希 $dfv2$ 先 sha256 再 bcrypt，登录透明 rehash。',
          'CSRF 双提交 Cookie：状态变更需 csrf_token cookie 与 X-CSRF-Token header 相等；登录端点改用 Origin 校验。',
          '@require_permission 用 owner_check 做归属隔离（存在且非己→404 防枚举）；internal_auth 让渠道 worker 凭内部 token + Owner 头可信代用户行事，且不绕过归属。',
        ]}
      />
    </article>
  )
}
