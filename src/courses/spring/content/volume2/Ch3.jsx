import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MvcFlow from '@/courses/spring/illustrations/MvcFlow.jsx'

const controllerCode = `@RestController          // = @Controller + @ResponseBody，返回值直接写进响应体
@RequestMapping("/api/users")
class UserController {

    @Autowired
    private UserService userService;

    // GET /api/users/123 → 直接返回 JSON，不走视图解析
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
}`

const interceptorCode = `// 拦截器：实现 HandlerInterceptor，由 DispatcherServlet 在分发前后调用
@Component
class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse resp,
                             Object handler) {
        String token = req.getHeader("Authorization");
        if (token == null) {
            resp.setStatus(401);
            return false;   // 返回 false 直接中断，不再进入 Controller
        }
        return true;        // 放行
    }
}

@Configuration
class WebConfig implements WebMvcConfigurer {
    @Autowired
    private AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**");   // 只拦 /api 开头的请求
    }
}`

const exceptionCode = `// 全局异常处理：一处定义，所有 Controller 通用
@RestControllerAdvice          // = @ControllerAdvice + @ResponseBody
class GlobalExceptionHandler {

    // 参数校验失败统一转成 400 + 友好提示
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldError().getDefaultMessage();
        return Result.fail(400, msg);
    }

    // 业务异常 → 统一包装；兜底 Exception → 500，避免堆栈泄露给前端
    @ExceptionHandler(BizException.class)
    public Result<?> handleBiz(BizException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleAll(Exception e) {
        log.error("未捕获异常", e);
        return Result.fail(500, "系统繁忙，请稍后再试");
    }
}`

const paramCode = `@RestController
@RequestMapping("/api/orders")
class OrderController {

    // 1. 路径变量
    @GetMapping("/{id}")
    public Order get(@PathVariable Long id) { /* ... */ }

    // 2. 查询参数，带默认值与是否必填
    @GetMapping
    public List<Order> list(@RequestParam(defaultValue = "1") int page,
                            @RequestParam(required = false) String status) { /* ... */ }

    // 3. JSON 请求体 + 参数校验（@Valid 触发 JSR-303 校验）
    @PostMapping
    public Order create(@RequestBody @Valid OrderForm form) { /* ... */ }

    // 4. 请求头
    @GetMapping("/whoami")
    public String who(@RequestHeader("Authorization") String token) { /* ... */ }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          一个 HTTP 请求打到 Spring 应用，是怎么一步步走到你写的 <code>Controller</code> 方法、又怎么把结果返回去的？
          答案的中枢是 <em>DispatcherServlet</em>（前端控制器）。这一章我们顺着「一个请求的旅程」，
          把 SpringMVC 的核心组件和完整流程串起来，这是面试 Web 层几乎必问的题。
        </p>
      </Lead>

      <h2>核心组件</h2>
      <p>SpringMVC 把请求处理拆成几个各司其职的组件，记住它们的分工，流程就自然清晰了：</p>
      <ul>
        <li><strong>DispatcherServlet</strong>：<em>前端控制器</em>，所有请求的统一入口，负责调度下面这些组件。</li>
        <li><strong>HandlerMapping</strong>：根据请求 URL 找到对应的处理器（哪个 Controller 的哪个方法）。</li>
        <li><strong>HandlerAdapter</strong>：适配并真正调用处理器方法，屏蔽不同类型 Controller 的差异。</li>
        <li><strong>Controller</strong>：你写的业务处理器，执行逻辑并返回结果。</li>
        <li><strong>ViewResolver</strong>：把逻辑视图名解析成具体视图对象（如 JSP、Thymeleaf 模板）。</li>
        <li><strong>HandlerExceptionResolver</strong>：处理整个流程中抛出的异常，把它们转成合适的响应（<code>@ExceptionHandler</code> 就走这里）。</li>
      </ul>
      <p>
        <strong>为什么要搞这么多组件、而不是一个大 Servlet 全包？</strong>这是<strong>前端控制器模式</strong>
        加<strong>策略模式</strong>的经典落地：DispatcherServlet 只负责「调度」，把「URL 怎么映射」「方法怎么调用」
        「视图怎么解析」「异常怎么处理」分别抽成可插拔的策略接口。于是你想支持一种新的参数类型、
        新的返回值格式、新的视图技术，只要往对应的扩展点塞实现，<strong>完全不用改 DispatcherServlet 本身</strong>——
        这正是「对扩展开放、对修改关闭」的开闭原则在框架级别的体现。
      </p>

      <h3>完整流程</h3>
      <p>把上面的组件按顺序连起来，就是一个请求的完整生命周期：</p>
      <ul>
        <li>请求到达 <strong>DispatcherServlet</strong>（统一入口）。</li>
        <li>DispatcherServlet 问 <strong>HandlerMapping</strong>：这个 URL 该交给哪个 handler？</li>
        <li>拿到 handler 后，交给 <strong>HandlerAdapter</strong> 执行，真正调用 Controller 方法。</li>
        <li>Controller 执行业务，返回 <strong>ModelAndView</strong>（模型数据 + 逻辑视图名）。</li>
        <li>DispatcherServlet 把视图名交给 <strong>ViewResolver</strong> 解析成具体视图。</li>
        <li>视图<em>渲染</em>（填入模型数据），结果返回给客户端。</li>
      </ul>

      <Example title="一个 GET 请求的旅程">
        <p>
          浏览器发出 <code>GET /api/users/123</code>，它会这样走完全程：请求先撞上
          <strong>DispatcherServlet</strong>；DispatcherServlet 拿 URL 去问
          <strong>HandlerMapping</strong>，得知该交给 <code>UserController#getUser</code>；
          <strong>HandlerAdapter</strong> 把路径里的 <code>123</code> 绑定到 <code>@PathVariable id</code> 并调用方法；
          方法返回一个 <code>User</code> 对象。由于这是 <code>@RestController</code>，结果不走视图解析，
          而是被消息转换器序列化成 JSON 直接写回响应体。
        </p>
      </Example>

      <MvcFlow />

      <h3>参数是怎么从 HTTP 绑到方法形参的</h3>
      <p>
        Controller 方法的参数五花八门（路径变量、查询参数、JSON 体、请求头），它们能自动「填进来」，
        靠的是 <code>HandlerAdapter</code> 背后一组 <strong>HandlerMethodArgumentResolver</strong>（参数解析器）。
        每个解析器认领一种注解：<code>@PathVariable</code>、<code>@RequestParam</code>、<code>@RequestBody</code>、
        <code>@RequestHeader</code> 各有专门的解析器；返回值同理由 <strong>HandlerMethodReturnValueHandler</strong> 处理。
      </p>
      <CodeBlock lang="java" title="OrderController.java（四类参数绑定）" code={paramCode} />
      <Callout variant="info" title="@RequestParam 与 @RequestBody 的高频混淆">
        <p>
          <code>@RequestParam</code> 取的是 URL 查询串或表单字段（<code>application/x-www-form-urlencoded</code>），
          一个请求里可以有多个；<code>@RequestBody</code> 取的是整个请求体并交给消息转换器反序列化（通常是 JSON），
          一个方法<strong>最多一个</strong>。把前端发的 JSON 用 <code>@RequestParam</code> 接，必然接到 null——这是新手最常见的 400/null 来源。
        </p>
      </Callout>

      <KeyIdea title="@RestController 为什么不走视图解析">
        <p>
          <code>@RestController</code> 等于 <code>@Controller</code> 加 <code>@ResponseBody</code>。
          普通 <code>@Controller</code> 方法返回的字符串会被当成<em>逻辑视图名</em>交给 ViewResolver 去找页面；
          而加了 <code>@ResponseBody</code> 后，返回值被 <em>HttpMessageConverter</em>（如 Jackson）直接序列化成
          JSON 写进响应体，<strong>完全跳过 ViewResolver 这一步</strong>。这就是前后端分离时人人用 @RestController 的原因——
          它要的是数据，不是页面。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="拦截器 Interceptor vs 过滤器 Filter">
        <p>这两个都能在请求前后做处理，但层级和能力不同，别混为一谈：</p>
        <ul>
          <li><strong>Filter（过滤器）</strong>：属于 Servlet 规范，由 Servlet 容器（如 Tomcat）管理，作用在 DispatcherServlet <em>之前</em>，
          能拦截一切请求（包括静态资源），但拿不到 Spring 的 handler 信息。</li>
          <li><strong>Interceptor（拦截器）</strong>：属于 SpringMVC，由 DispatcherServlet 调用，作用在<em>找到 handler 之后</em>，
          能拿到具体的 Controller 方法、能访问 Spring 容器里的 Bean，粒度更细。</li>
          <li>执行顺序：Filter 包在最外层，Interceptor 在内层；请求是 Filter → Interceptor → Controller，响应反向。</li>
        </ul>
      </Callout>

      <table>
        <thead>
          <tr><th>对比项</th><th>Filter</th><th>Interceptor</th><th>AOP</th></tr>
        </thead>
        <tbody>
          <tr><td>规范来源</td><td>Servlet 规范</td><td>SpringMVC</td><td>Spring AOP</td></tr>
          <tr><td>作用位置</td><td>进 DispatcherServlet 前</td><td>找到 handler 后</td><td>任意 Bean 方法</td></tr>
          <tr><td>能否拿到 handler</td><td>不能</td><td>能</td><td>能（方法签名/参数）</td></tr>
          <tr><td>典型用途</td><td>编码、跨域、压缩、全局日志</td><td>登录鉴权、权限、耗时统计</td><td>事务、细粒度日志、缓存</td></tr>
        </tbody>
      </table>

      <Example title="HandlerInterceptor 的三个回调时机">
        <p>
          拦截器有三个钩子，对应请求处理的不同阶段，组合起来能做很多事：
        </p>
        <ul>
          <li><strong>preHandle</strong>：Controller 执行<em>前</em>，返回 <code>false</code> 直接中断（鉴权常用）。</li>
          <li><strong>postHandle</strong>：Controller 执行<em>后</em>、视图渲染<em>前</em>，能改 <code>ModelAndView</code>。</li>
          <li><strong>afterCompletion</strong>：整个请求<em>完成后</em>（视图也渲染完），无论成功失败都执行，适合做耗时统计、资源清理。</li>
        </ul>
        <p>
          一个坑：多个拦截器时，<code>preHandle</code> 按注册顺序<strong>正序</strong>执行，
          而 <code>postHandle</code> 和 <code>afterCompletion</code> <strong>逆序</strong>执行，像栈一样。
          且只要某个拦截器的 <code>preHandle</code> 返回了 <code>true</code>，它的 <code>afterCompletion</code> 就一定会被调用——
          这保证了「已经放行的拦截器一定有机会清理」。
        </p>
      </Example>

      <Callout variant="info" title="全局异常处理：生产必备的 @RestControllerAdvice">
        <p>
          没有统一异常处理，每个 Controller 都得写一堆 try-catch，异常堆栈还可能直接糊到前端脸上。
          <code>@RestControllerAdvice</code> + <code>@ExceptionHandler</code> 让你<strong>一处定义、全局生效</strong>，
          把各类异常转成统一的返回结构，是企业项目的标配：
        </p>
        <CodeBlock lang="java" title="GlobalExceptionHandler.java" code={exceptionCode} />
        <p>
          注意它处理的是<strong>进入 DispatcherServlet 之后</strong>抛出的异常；如果异常发生在 Filter 层
          （还没到 SpringMVC），<code>@ControllerAdvice</code> 是兜不住的，那种得靠 Filter 自己处理或交给容器的错误页。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「SpringMVC 处理流程」时，先报出五大组件及其分工，再按
        「请求 → DispatcherServlet → HandlerMapping 找 handler → HandlerAdapter 执行 → 返回 ModelAndView → ViewResolver 解析 → 渲染返回」
        这条主线一气呵成。能主动补充「<code>@RestController</code> / <code>@ResponseBody</code> 走消息转换器、不走视图解析」和
        「Interceptor 与 Filter 的层级区别」，会明显加分。
      </p>

      <Practice title="一个 RestController + 拦截器">
        <p>先写一个返回 JSON 的 <code>@RestController</code>：</p>
        <CodeBlock lang="java" title="UserController.java" code={controllerCode} />
        <p>
          再加一个鉴权拦截器，在请求进入 Controller 前校验 token，并通过 <code>WebMvcConfigurer</code> 注册到
          <code>/api/**</code> 路径：
        </p>
        <CodeBlock lang="java" title="AuthInterceptor.java" code={interceptorCode} />
        <p>
          动手验证：不带 <code>Authorization</code> 头访问 <code>/api/users/1</code> 应返回 401（被 preHandle 中断、根本没进 Controller）；
          带上头则正常返回 JSON。借此体会拦截器「在 handler 之后、Controller 之前」的位置。
        </p>
      </Practice>

      <Summary
        points={[
          'DispatcherServlet 是前端控制器，所有请求的统一入口，负责调度其余组件。',
          '核心组件：HandlerMapping 找 handler、HandlerAdapter 执行、Controller 处理业务、ViewResolver 解析视图。',
          '完整流程：请求 → DispatcherServlet → HandlerMapping → HandlerAdapter → ModelAndView → ViewResolver → 渲染返回。',
          '@RestController / @ResponseBody 经 HttpMessageConverter 直接返回 JSON，跳过 ViewResolver。',
          'Filter 属 Servlet 容器、在 DispatcherServlet 之前；Interceptor 属 SpringMVC、在找到 handler 之后，粒度更细。',
          'MVC 用前端控制器+策略模式：参数靠 ArgumentResolver 绑定，@RequestParam 取查询/表单、@RequestBody 取 JSON 体且最多一个。',
          'Interceptor 三钩子 preHandle/postHandle/afterCompletion；多拦截器 preHandle 正序、后两者逆序，放行过的一定会 afterCompletion。',
          '生产用 @RestControllerAdvice + @ExceptionHandler 做全局异常处理，但兜不住 Filter 层（进 DispatcherServlet 前）的异常。',
          '面试落点：先报组件分工，再串完整流程，主动补 JSON 返回与拦截器/过滤器区别即可拿高分。',
        ]}
      />
    </>
  )
}
