import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const workerSnippet = `import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

// CoroutineWorker：doWork 是 suspend 函数，可直接写协程代码
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val token = inputData.getString("token") ?: return Result.failure()
            repository.syncWithServer(token)   // 真正干活：拉取 / 上传数据
            Result.success()                   // 成功：本次任务完成
        } catch (e: IOException) {
            // 可恢复的错误（如断网）：交给系统按退避策略稍后重试
            Result.retry()
        } catch (e: Exception) {
            Result.failure()                   // 不可恢复：放弃，不再重试
        }
    }
}`

const requestSnippet = `import androidx.work.*
import java.util.concurrent.TimeUnit

// 1) 约束：仅在「联网 + 充电」时才执行，避免打扰用户、省电省流量
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .setRequiresCharging(true)
    .build()

// 2) 周期任务：每 6 小时同步一次（系统会在窗口内择机执行，并非精确定时）
val periodicSync = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
    .setConstraints(constraints)
    .setInputData(workDataOf("token" to userToken))
    .setBackoffCriteria(            // 重试退避：失败后等待时间逐次拉长
        BackoffPolicy.EXPONENTIAL,
        15, TimeUnit.SECONDS
    )
    .build()

// 3) 入队：用唯一名 + KEEP 保证「已存在就不重复排队」
WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "periodic_sync",
    ExistingPeriodicWorkPolicy.KEEP,
    periodicSync
)`

const chainSnippet = `import androidx.work.*

// 链式 work：先压缩，成功后并行上传两份，全部成功再清理
val compress = OneTimeWorkRequestBuilder<CompressWorker>().build()
val uploadA  = OneTimeWorkRequestBuilder<UploadWorker>().build()
val uploadB  = OneTimeWorkRequestBuilder<UploadWorker>().build()
val cleanup  = OneTimeWorkRequestBuilder<CleanupWorker>().build()

WorkManager.getInstance(context)
    .beginWith(compress)            // 第一步
    .then(listOf(uploadA, uploadB)) // compress 成功后，两个上传并行
    .then(cleanup)                  // 两个上传都成功后再清理
    .enqueue()`

export default function Ch2() {
  return (
    <article>
      <Lead>
        在手机上「让一段代码在后台一直跑」远不像桌面那么自由。Android 为了省电与隐私，
        对后台执行设了层层限制：应用被切走后，它的进程随时可能被冻结甚至杀死。
        这一章讲清楚这些限制<strong>为什么</strong>存在，然后给你一张清晰的决策表：
        即时短任务、可延迟的持久任务、用户可见的持续任务，分别该用协程、
        <strong>WorkManager</strong> 还是<strong>前台 Service</strong>。
      </Lead>

      <h2>一、为什么后台执行被严格限制</h2>
      <p>
        早期 Android 上，应用可以随意注册定时器、长期持有唤醒锁、在后台频繁拉数据。
        结果是：一堆应用在你看不见的地方偷偷活动，电量哗哗掉、流量被偷跑。从 Android 6.0
        起，系统开始系统性地收紧后台行为，核心就是两套省电机制和一系列后台启动限制。
      </p>
      <KeyIdea>
        核心约束只有一句话：<strong>应用不在前台时，它能消耗的资源被系统强力管控。</strong>
        你不能假设后台代码会「立刻、持续、可靠地」运行；你只能<strong>声明意图</strong>
        （我要做什么、需要什么条件），由系统在合适的时机替你调度。
      </KeyIdea>
      <h3>Doze（瞌睡模式）</h3>
      <p>
        当设备<strong>长时间静止、熄屏、未充电</strong>时，系统进入 Doze。此时网络访问被切断、
        唤醒锁被忽略、<code>AlarmManager</code> 闹钟和后台任务被推迟到周期性的「维护窗口」里批量执行。
        设备动一动或插上电就退出 Doze。它的目的是：人睡了、手机放着不动时，别让一堆应用持续耗电。
      </p>
      <h3>App Standby（应用待机）</h3>
      <p>
        系统会根据每个应用<strong>最近被使用的频率</strong>把它分到不同的「待机桶（standby bucket）」——
        从「活跃」到「很少使用」。你越久没打开某个应用，它被分到的桶越靠后，它能跑后台任务、
        发通知、联网的<strong>配额就越紧</strong>。这让长期不用的应用自然「安静」下来。
      </p>
      <h3>后台启动限制</h3>
      <p>
        从 Android 8.0 起，后台应用不能随意启动普通后台 Service（会抛异常），也限制了后台启动 Activity。
        想在后台干活，要么用系统认可的调度框架（WorkManager），要么把任务升级成用户<strong>看得见</strong>的
        前台 Service。这背后是同一个逻辑：<strong>用户看不见的活动必须受控</strong>。
      </p>
      <Callout variant="warn" title="不要和系统对着干">
        试图绕开这些限制（滥用前台 Service、偷偷长期持锁、用粘性 Service 复活进程）几乎一定会
        在新系统版本上失效，还可能被应用商店下架。正确姿势是：<strong>顺着系统提供的机制声明你的需求</strong>，
        让系统替你在省电的前提下完成调度。
      </Callout>

      <h2>二、三类后台工作，三种正确工具</h2>
      <p>
        面对一个「要在后台做点事」的需求，先别急着写代码，先把它归类。绝大多数需求落在下面三类里，
        每一类有明确的「正确工具」：
      </p>
      <table>
        <thead>
          <tr><th>任务类型</th><th>特征</th><th>正确工具</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>即时短任务</td>
            <td>结果马上要、与当前界面相关、几秒内完成（如点按钮拉一次数据）</td>
            <td>协程 + <code>viewModelScope</code></td>
          </tr>
          <tr>
            <td>可延迟、需保证最终执行</td>
            <td>不必立刻、但必须可靠完成；进程被杀、重启后仍要做（如同步、上传日志）</td>
            <td><strong>WorkManager</strong></td>
          </tr>
          <tr>
            <td>用户可见的持续任务</td>
            <td>立刻开始、持续较久、用户需要知道它在进行（如音乐播放、跑步轨迹、大文件下载）</td>
            <td>前台 Service（带通知）</td>
          </tr>
        </tbody>
      </table>

      <h2>三、即时短任务：直接用协程</h2>
      <p>
        如果工作只在「用户正看着这个界面」时有意义，做完就完了——那根本不需要后台框架。
        在 <code>viewModelScope</code> 里起个协程即可：界面销毁、ViewModel 清理时协程自动取消，
        既不泄漏也不浪费。这类任务<strong>不需要</strong>跨进程存活，所以也<strong>不要</strong>用 WorkManager
        （那是杀鸡用牛刀，还引入不必要的延迟）。
      </p>
      <Example title="什么算即时短任务">
        <p>
          「下拉刷新列表」「提交一个表单」「点开详情页拉详情」——这些都是即时短任务：用户在等结果，
          界面没了任务也没意义。它们用 <code>{'viewModelScope.launch { ... }'}</code> 配合
          Repository 的 <code>suspend</code> 函数就够了，不沾后台框架。
        </p>
      </Example>

      <h2>四、可延迟的持久任务：WorkManager</h2>
      <p>
        当任务满足两个条件——<strong>不必立刻执行</strong>，但<strong>必须保证最终一定被执行</strong>
        （哪怕应用被杀、设备重启）——就该用 WorkManager。它是 Jetpack 推荐的<strong>可保证、可延迟</strong>
        后台任务调度器，会把任务持久化到磁盘，并自动适配 Doze、待机桶等系统约束，在合适的时机替你执行。
      </p>
      <h3>Worker：定义「要做的活」</h3>
      <p>
        把任务逻辑写在一个 Worker 里。最常用的是 <code>CoroutineWorker</code>，它的
        <code>doWork()</code> 是挂起函数，可以直接写协程代码。<code>doWork()</code> 返回三种结果之一：
        <code>Result.success()</code>（完成）、<code>Result.retry()</code>（可恢复失败，
        请系统按退避策略稍后重试）、<code>Result.failure()</code>（不可恢复，放弃）。
      </p>
      <CodeBlock lang="kotlin" title="一个用于同步的 CoroutineWorker" code={workerSnippet} />
      <h3>WorkRequest：定义「怎么执行」</h3>
      <p>
        Worker 描述「做什么」，WorkRequest 描述「何时、在什么条件下做」。它分两种：
      </p>
      <ul>
        <li>
          <strong>OneTimeWorkRequest</strong>：一次性任务，做完即止（如「上传这一份日志」）。
        </li>
        <li>
          <strong>PeriodicWorkRequest</strong>：周期任务，按间隔反复执行（如「每 6 小时同步一次」）。
          注意最小间隔是 <strong>15 分钟</strong>，且执行时刻是系统在窗口内择机决定的，<strong>并非精确定时</strong>。
        </li>
      </ul>
      <h3>Constraints：执行前必须满足的条件</h3>
      <p>
        约束让系统替你「等条件成熟」再跑，是省电省流量的关键。常见约束：
        <code>NetworkType.CONNECTED</code>（需联网）、<code>setRequiresCharging(true)</code>（仅充电时）、
        <code>setRequiresBatteryNotLow(true)</code>（电量不低时）、<code>setRequiresDeviceIdle(true)</code>（设备空闲时）。
        所有约束都满足前，任务不会被执行。
      </p>
      <h3>重试与退避</h3>
      <p>
        当 <code>doWork()</code> 返回 <code>Result.retry()</code>，系统按你设的退避策略稍后重试：
        <code>BackoffPolicy.LINEAR</code>（线性增加等待）或 <code>EXPONENTIAL</code>（指数增加，更常用）。
        指数退避避免了断网时反复无效重试把电耗光。
      </p>
      <CodeBlock lang="kotlin" title="构建并入队一个周期同步任务" code={requestSnippet} />
      <Callout variant="info" title="唯一任务：避免重复排队">
        周期任务一般用 <code>enqueueUniquePeriodicWork</code> 配唯一名入队。
        <code>ExistingPeriodicWorkPolicy.KEEP</code> 表示「已有同名任务就保留旧的、忽略本次」，
        防止每次进应用都重复排一份同步任务。需要替换时用 <code>UPDATE</code> / <code>REPLACE</code>。
      </Callout>
      <h3>链式 work：编排多步任务</h3>
      <p>
        多个任务有先后 / 并行关系时，可用 <code>beginWith().then().enqueue()</code> 把它们串成一张
        有向图：上一步成功才进入下一步，<code>then(listOf(...))</code> 表示这几个任务并行。
        任一环节最终失败，后续依赖它的任务都不会执行。
      </p>
      <CodeBlock lang="kotlin" title="链式 work：压缩 → 并行上传 → 清理" code={chainSnippet} />

      <h2>五、用户可见的持续任务：前台 Service</h2>
      <p>
        有些任务必须<strong>立刻开始、持续运行较久，而且用户需要明确知道它正在进行</strong>——
        音乐播放、导航、健身轨迹记录、大文件持续下载。这类不能交给 WorkManager（它是「可延迟」的，
        不保证立刻跑），而要用<strong>前台 Service</strong>。
      </p>
      <p>
        前台 Service 的核心特征是：它必须<strong>持续显示一条用户可见的通知</strong>。这是系统和用户之间的
        「契约」——你想长时间占用资源、不被轻易杀掉，代价就是必须让用户随时看得见你在干什么，
        并能一键停止。从 Android 14 起还必须为前台 Service 声明<strong>类型</strong>
        （如 <code>mediaPlayback</code>、<code>location</code>），系统据此判断用途是否正当。
      </p>
      <Callout variant="tip" title="一句话区分 WorkManager 与前台 Service">
        问：「这件事用户<strong>现在</strong>就想看着它进行吗？」——是（播放、导航、可见下载）用前台 Service；
        否（可以晚点、悄悄做完即可）用 WorkManager。再加一问：「它<strong>必须可靠完成</strong>吗？」——
        这是 WorkManager 区别于裸协程的关键。
      </Callout>

      <h2>六、边界与易错点</h2>
      <ul>
        <li>
          <strong>别把即时任务塞进 WorkManager</strong>：会引入不必要的延迟，且任务可能被系统推迟到几分钟后才跑。
        </li>
        <li>
          <strong>周期任务不是精确闹钟</strong>：最小间隔 15 分钟，真正执行时刻受 Doze / 待机桶影响。
          需要精确定时（如闹钟应用）应使用 <code>AlarmManager</code> 的精确闹钟接口。
        </li>
        <li>
          <strong>doWork 抛异常 ≠ retry</strong>：未捕获的异常会被当作 <code>failure</code>。
          要重试必须显式 <code>try/catch</code> 后返回 <code>Result.retry()</code>。
        </li>
        <li>
          <strong>前台 Service 不是绕开限制的后门</strong>：滥用（无正当类型、不显示通知）会被系统拦截或上架被拒。
        </li>
      </ul>

      <Summary
        points={[
          'Android 用 Doze（设备静止熄屏未充电时切网、推迟任务到维护窗口）和 App Standby（按使用频率分桶限配额）省电，并从 8.0 起限制后台启动 Service；核心是「不在前台就受控」。',
          '不要对抗系统：应顺着官方机制声明意图，由系统在省电前提下调度，否则会在新版本失效或被下架。',
          '三类工作三种工具：即时短任务用协程（viewModelScope）；可延迟但必须保证最终执行的持久任务用 WorkManager；用户可见的持续任务用前台 Service。',
          'WorkManager：Worker（doWork 返回 success/retry/failure）定义做什么，WorkRequest（OneTime / Periodic，周期最小 15 分钟且非精确）定义怎么做，Constraints 设充电/联网等条件，配指数退避重试，唯一任务 + KEEP 防重复，链式 work 编排先后与并行。',
          '前台 Service：必须持续显示用户可见通知（Android 14+ 还需声明 service type），用于立刻开始、持续较久、用户需知情的任务，如播放、导航、可见下载。',
          '决策口诀：用户现在就想看着它进行吗？是→前台 Service；它必须可靠完成吗？是且可延迟→WorkManager；否则→裸协程。',
        ]}
      />
    </article>
  )
}
