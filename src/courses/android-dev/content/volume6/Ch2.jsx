import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const apiSnippet = `import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Body

// Retrofit 用注解声明式地描述 HTTP API：
// 你只写接口，Retrofit 在运行时生成发请求、解析响应的实现。
interface NoteApi {

    // GET /notes?page=1&size=20
    // suspend 方法直接返回解析好的数据，无需 Call/回调。
    @GET("notes")
    suspend fun listNotes(
        @Query("page") page: Int,
        @Query("size") size: Int = 20
    ): List<NoteDto>

    // GET /notes/{id} —— @Path 把参数填进 URL 路径占位符。
    @GET("notes/{id}")
    suspend fun getNote(@Path("id") id: Long): NoteDto

    // POST /notes，请求体是序列化后的 note 对象。
    @POST("notes")
    suspend fun createNote(@Body note: NoteDto): NoteDto
}`

const dtoSnippet = `import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// DTO（Data Transfer Object）= 网络传输用的数据形状，
// 通常和数据库 Entity 分开，二者各自演化、互不绑死。
// @JsonClass(generateAdapter = true) 让 Moshi 用代码生成（而非反射）解析，更快。
@JsonClass(generateAdapter = true)
data class NoteDto(
    val id: Long,
    val title: String,
    // 服务端字段叫 body，本地属性叫 content，用 @Json 对上。
    @Json(name = "body") val content: String,
    @Json(name = "updated_at") val updatedAt: Long
)`

const retrofitBuildSnippet = `import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import com.squareup.moshi.Moshi
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor

// OkHttp 拦截器：在请求/响应链路上插一脚。
// 这里加日志拦截器（打印请求与响应）和鉴权拦截器（统一加 token 头）。
val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }

val authInterceptor = okhttp3.Interceptor { chain ->
    val request = chain.request().newBuilder()
        .addHeader("Authorization", "Bearer \${TokenStore.current()}")
        .build()
    chain.proceed(request)
}

val client = OkHttpClient.Builder()
    .addInterceptor(authInterceptor)
    .addInterceptor(logging)
    .build()

val moshi = Moshi.Builder().build()

// converterFactory 负责把 JSON 文本 <-> Kotlin 对象。
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com/")
    .client(client)
    .addConverterFactory(MoshiConverterFactory.create(moshi))
    .build()

val api: NoteApi = retrofit.create(NoteApi::class.java)`

const resultSnippet = `// 用 sealed class 显式表达"成功 / 失败"两种结局，
// 让调用方在编译期就被迫处理失败分支，而不是漏掉 try/catch。
sealed interface Outcome<out T> {
    data class Success<T>(val data: T) : Outcome<T>
    data class Failure(val error: Throwable) : Outcome<Nothing>
}

// 一个小工具：把可能抛异常的网络调用包成 Outcome。
suspend fun <T> runCatchingOutcome(block: suspend () -> T): Outcome<T> =
    try {
        Outcome.Success(block())
    } catch (e: Exception) {
        Outcome.Failure(e)
    }`

const repositorySnippet = `import kotlinx.coroutines.flow.Flow

// Repository 同时持有远程（Retrofit）和本地（Room Dao）两个数据源，
// 对上层只暴露统一、干净的接口。
class NoteRepository(
    private val api: NoteApi,
    private val dao: NoteDao
) {
    // 单一可信来源（Single Source of Truth）：UI 永远只看本地数据库的 Flow。
    // 网络只负责"把新数据写进数据库"，写完 Flow 自动发射、UI 自动刷新。
    val notes: Flow<List<NoteEntity>> = dao.observeAll()

    // 先读缓存、再刷新：UI 先拿到本地数据立刻显示（上面的 Flow 已经在供数据），
    // 这里去网络拉最新的写回数据库；成功与否都用 Outcome 表达。
    suspend fun refresh(): Outcome<Unit> = runCatchingOutcome {
        val remote = api.listNotes(page = 1)        // 网络请求（suspend）
        val entities = remote.map { it.toEntity() } // DTO -> Entity
        dao.replaceAll(entities)                    // 写回本地，触发 Flow 刷新
    }

    suspend fun create(title: String, content: String): Outcome<NoteEntity> =
        runCatchingOutcome {
            val created = api.createNote(NoteDto.of(title, content))
            val entity = created.toEntity()
            dao.upsert(entity)   // 远程成功后落本地
            entity
        }
}`

const viewModelSnippet = `import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

// UI 状态：用一个 sealed/data 模型同时表达加载中、数据、错误。
data class NotesUiState(
    val notes: List<NoteEntity> = emptyList(),
    val loading: Boolean = false,
    val errorMessage: String? = null
)

class NotesViewModel(private val repo: NoteRepository) : ViewModel() {

    private val _error = MutableStateFlow<String?>(null)
    private val _loading = MutableStateFlow(false)

    // 把"本地数据 Flow + 加载态 + 错误态"合并成一个 UI 状态流。
    val uiState: StateFlow<NotesUiState> =
        combine(repo.notes, _loading, _error) { notes, loading, error ->
            NotesUiState(notes = notes, loading = loading, errorMessage = error)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), NotesUiState())

    // 进入界面或下拉刷新时调用：去网络刷新，按 Outcome 分支处理。
    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            when (val r = repo.refresh()) {
                is Outcome.Success -> _error.value = null
                is Outcome.Failure -> _error.value = r.error.message ?: "刷新失败"
            }
            _loading.value = false
        }
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们把数据存进了本地的 Room 数据库。但绝大多数 App 的数据来自服务器，本地只是缓存。
        这一章讲网络层：用 <strong>Retrofit</strong> 以注解声明式地定义 HTTP API，配合<strong>协程</strong>让接口方法直接返回数据；
        用转换器把 JSON 解析成 Kotlin 对象；再用 <strong>Repository 模式</strong>把远程（Retrofit）与本地（Room 缓存）
        两个数据源统一起来，做成"先读缓存、再刷新网络"的流程，并用 <code>sealed class</code> 把成功与失败表达清楚。
      </Lead>

      <h2>一、Retrofit：用注解声明 HTTP API</h2>
      <p>
        Retrofit 是 Square 出品、Android 上最主流的 HTTP 客户端封装。它的核心思路和 Room 异曲同工：
        你<strong>只写一个接口</strong>，用注解描述每个方法对应哪个 HTTP 请求，Retrofit 在运行时生成真正的实现。
        你不必手动拼 URL、设方法、读响应流——这些都交给框架。
      </p>
      <KeyIdea>
        Retrofit 把一次 HTTP 请求映射成一个接口方法：方法上的 <code>@GET</code>/<code>@POST</code> 决定请求类型与路径，
        参数上的 <code>@Path</code>/<code>@Query</code>/<code>@Body</code> 决定参数怎么进 URL 或请求体。
        声明即实现，你专注"要什么数据"，不操心"怎么发请求"。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>注解</th><th>位置</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>@GET</code> / <code>@POST</code></td><td>方法</td><td>声明 HTTP 方法与相对路径</td></tr>
          <tr><td><code>@Path</code></td><td>参数</td><td>填进 URL 路径占位符，如 <code>notes/{'{id}'}</code></td></tr>
          <tr><td><code>@Query</code></td><td>参数</td><td>拼成查询串，如 <code>?page=1</code></td></tr>
          <tr><td><code>@Body</code></td><td>参数</td><td>作为请求体（会被序列化成 JSON）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="kotlin" title="NoteApi.kt —— 声明式 HTTP 接口" code={apiSnippet} />

      <h2>二、suspend：让接口方法直接返回数据</h2>
      <p>
        早期 Retrofit 的方法返回 <code>{'Call<T>'}</code>，你得手动 <code>enqueue</code> 一个回调来拿结果，
        代码很容易陷进"回调地狱"。和协程集成后，做法干净多了：把接口方法标成 <code>suspend</code>，
        直接声明返回 <code>{'List<NoteDto>'}</code> 这样的<strong>数据类型</strong>即可。
      </p>
      <p>
        调用时 <code>val notes = api.listNotes(page = 1)</code> 读起来像同步代码，实际上 Retrofit 在后台
        发请求、解析响应，完成后把结果挂起返回，整个过程不阻塞主线程。网络出错（超时、4xx/5xx、解析失败）
        会以<strong>抛异常</strong>的形式冒出来，由调用方用 <code>try/catch</code> 或下文的 <code>Outcome</code> 接住。
      </p>

      <h2>三、JSON 解析：转换器与 DTO</h2>
      <p>
        服务器返回的是 JSON 文本，Kotlin 这边要的是对象。中间的翻译工作交给 <strong>转换器</strong>
        （ConverterFactory）。两种主流选择：<strong>Moshi</strong> 和 Kotlin 官方的 <strong>kotlinx.serialization</strong>。
        二者都支持代码生成（编译期生成解析逻辑，比反射快、可被 R8 友好裁剪）。
      </p>
      <p>
        被解析出来的对象通常叫 <strong>DTO</strong>（数据传输对象），它代表"网络传输的形状"，
        刻意和数据库 <code>Entity</code> 分开：服务端字段名可能是 <code>updated_at</code> 这种下划线风格，
        用 <code>@Json(name = ...)</code> 映射到 Kotlin 的驼峰属性即可。两层分开后，网络协议变了不会直接污染数据库结构。
      </p>
      <CodeBlock lang="kotlin" title="NoteDto.kt —— 网络层数据对象（Moshi）" code={dtoSnippet} />
      <table>
        <thead>
          <tr><th>转换器</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>Moshi</td><td>Square 出品，与 Retrofit/OkHttp 同源；用 <code>codegen</code> 生成适配器</td></tr>
          <tr><td>kotlinx.serialization</td><td>Kotlin 官方，编译期插件生成；多平台友好</td></tr>
        </tbody>
      </table>

      <h2>四、OkHttp 拦截器与组装 Retrofit</h2>
      <p>
        Retrofit 底层用 OkHttp 发请求。OkHttp 的<strong>拦截器</strong>能在每个请求/响应经过时插一脚，
        常见两类：<strong>日志拦截器</strong>（开发期打印请求与响应，便于调试）和<strong>鉴权拦截器</strong>
        （给每个请求统一加上 <code>Authorization</code> 头，省得每个接口方法都写一遍）。把 OkHttpClient、
        转换器、baseUrl 装进 <code>Retrofit.Builder</code>，最后 <code>create</code> 出接口实例即可。
      </p>
      <CodeBlock lang="kotlin" title="组装 OkHttp + 拦截器 + Retrofit" code={retrofitBuildSnippet} />
      <Callout variant="warn" title="日志拦截器别带上线">
        <code>Level.BODY</code> 会把请求体、响应体、甚至鉴权头打进日志。这在开发期很方便，
        但发布版里必须关掉或降级，否则可能把 token、用户隐私写进日志。一般用构建类型（debug/release）
        来区分拦截器的日志级别。
      </Callout>

      <h2>五、错误处理：用 Result / sealed class 表达成功失败</h2>
      <p>
        网络一定会失败：断网、超时、服务端 500、JSON 对不上。如果让异常裸奔，调用方很容易忘记 catch，
        某次失败就变成崩溃。更稳的做法是用 <strong>sealed class</strong>（或 Kotlin 自带的 <code>Result</code>）
        把"成功带数据 / 失败带错误"显式建模成一个封闭类型——这样 <code>when</code> 表达式会强制你处理两个分支，
        编译器替你盯着"别漏了失败的情况"。
      </p>
      <CodeBlock lang="kotlin" title="Outcome —— 成功/失败的封闭类型" code={resultSnippet} />
      <Callout variant="tip" title="为什么用 sealed class">
        <code>sealed interface</code> 把所有可能的子类型在编译期固定下来。对它做 <code>when</code> 时，
        编译器知道一共就 <code>Success</code> 和 <code>Failure</code> 两种，漏掉一个就会警告/报错。
        失败再也不会被悄悄忽略——这正是我们想要的"逼着调用方处理错误"。
      </Callout>

      <h2>六、Repository：统一远程与本地两个数据源</h2>
      <p>
        现在把网络和上一章的 Room 揉到一起。<strong>Repository</strong> 同时持有 <code>api</code>（远程）和
        <code>dao</code>（本地），对上层只暴露干净接口。这里采用业界常用的 <strong>单一可信来源</strong>
        （Single Source of Truth）模式：UI 永远只读本地数据库的 Flow，网络的唯一职责是"把最新数据写进数据库"。
      </p>
      <KeyIdea>
        先读缓存、再刷新：UI 订阅 <code>dao.observeAll()</code> 的 Flow，打开页面立刻显示本地缓存（哪怕离线也有内容）；
        与此同时 <code>refresh()</code> 去网络拉最新数据写回数据库，写入触发 Flow 重新发射，UI 无缝刷新成最新值。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="NoteRepository.kt —— 远程 + 本地" code={repositorySnippet} />
      <Example title="一次刷新的完整数据流">
        <p>
          用户打开列表页：UI 立刻 collect 到 <code>dao.observeAll()</code> 的本地缓存并渲染——
          <strong>零延迟、可离线</strong>。
        </p>
        <p>
          同时 ViewModel 触发 <code>repo.refresh()</code>：Retrofit 发 <code>GET /notes</code>（suspend，后台执行）→
          拿到 <code>{'List<NoteDto>'}</code> → 映射成 Entity → <code>dao.replaceAll(...)</code> 写回数据库。
          写回的瞬间 Flow 重新发射，列表自动更新成服务器最新数据。若网络失败，返回 <code>Outcome.Failure</code>，
          本地缓存原样保留，UI 顶多弹个错误提示而不会白屏崩溃。
        </p>
      </Example>

      <h2>七、在 ViewModel 里调用</h2>
      <p>
        最后一层是 ViewModel。它在 <code>viewModelScope</code>（生命周期感知的协程作用域）里调用 Repository，
        把"本地数据 Flow""加载中""错误信息"合并成一个 <code>UiState</code> 暴露给界面。界面只观察这一个状态流，
        逻辑全部收口在 ViewModel 里。
      </p>
      <CodeBlock lang="kotlin" title="NotesViewModel.kt —— 调用 Repository 并管理状态" code={viewModelSnippet} />
      <p>
        注意 <code>refresh()</code> 里对 <code>Outcome</code> 的 <code>when</code> 分支：成功就清空错误、失败就把错误消息
        放进状态。<code>viewModelScope</code> 还会在 ViewModel 销毁时自动取消未完成的协程，避免界面已关闭、
        网络回调还在跑导致的泄漏与崩溃。
      </p>

      <h2>八、小结</h2>
      <p>
        至此，一条完整的数据链路打通了：Retrofit 用注解声明 API、suspend 直接返回数据、转换器解析 JSON，
        OkHttp 拦截器处理日志与鉴权；Repository 把远程与本地统一成单一可信来源，做"先读缓存再刷新"，
        并用 sealed class 把成功失败表达清楚；ViewModel 在协程作用域里驱动这一切，向界面输出一个状态流。
        本地 + 网络两章合起来，就是 Android 现代数据层的标准骨架。
      </p>

      <Summary
        points={[
          'Retrofit 用注解（@GET/@POST/@Path/@Query/@Body）声明式定义 HTTP API，运行时生成实现，你只写接口。',
          '接口方法用 suspend 直接返回数据类型，配合协程在后台发请求、不阻塞主线程；出错以异常形式抛出。',
          '转换器（Moshi 或 kotlinx.serialization）负责 JSON 与 Kotlin 对象互转；DTO 与数据库 Entity 分层，互不绑死。',
          'OkHttp 拦截器在请求/响应链上插一脚，常用于打日志和统一加鉴权头；日志级别需按构建类型区分，别带上线。',
          'Repository 统一远程（Retrofit）与本地（Room 缓存）数据源，按单一可信来源做"先读缓存、再刷新网络"，用 sealed class/Result 表达成功失败。',
          'ViewModel 在 viewModelScope 里调用 Repository，把本地 Flow、加载态、错误态合并成 UiState 暴露给界面，并按 Outcome 分支处理错误。',
        ]}
      />
    </article>
  )
}
