import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LifecycleDiagram from '@/courses/android-dev/illustrations/LifecycleDiagram.jsx'

const manifestSnippet = `<!-- AndroidManifest.xml：四大组件都要在这里登记 -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="MyApp">

        <!-- Activity：界面入口；带 LAUNCHER 的就是点图标进的那个 -->
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Service：后台干活，没有界面 -->
        <service android:name=".SyncService" android:exported="false" />

        <!-- BroadcastReceiver：监听系统/应用广播 -->
        <receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

        <!-- ContentProvider：把数据安全地共享给别的应用 -->
        <provider
            android:name=".NoteProvider"
            android:authorities="com.example.myapp.notes"
            android:exported="false" />

    </application>
</manifest>`

const lifecycleSnippet = `class MainActivity : ComponentActivity() {

    // 整个生命中只调一次：做一次性初始化
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AppRoot() }            // 设置 Compose UI 树
        // 从 savedInstanceState 里恢复少量临时状态（可能为 null）
        val draft = savedInstanceState?.getString("draft")
    }

    override fun onStart() {                // 即将可见
        super.onStart()
    }

    override fun onResume() {               // 进入前台、可交互（运行态）
        super.onResume()
        // 开始相机预览、传感器监听、动画等前台工作
    }

    override fun onPause() {                // 失去焦点，可能仍部分可见
        super.onPause()
        // 只做轻量收尾，别放重活——它会拖慢下一个界面
    }

    override fun onStop() {                 // 完全不可见
        super.onStop()
        // 释放较重资源、停止刷新
    }

    override fun onDestroy() {              // 被销毁前最后一次回调
        super.onDestroy()
    }
}`

const saveStateSnippet = `class MainActivity : ComponentActivity() {

    // 配置变更（如旋转）会销毁并立即重建 Activity。
    // onSaveInstanceState 在销毁前被调用，用来存「少量」临时 UI 状态。
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("draft", currentDraft)   // 只放小数据
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 重建后从 Bundle 取回
        currentDraft = savedInstanceState?.getString("draft") ?: ""
    }
}`

const viewModelSnippet = `// ViewModel 的实例在配置变更（旋转屏幕）时不会被销毁，
// 因此适合保存「界面级状态」，比 Bundle 能装更多、也不必序列化。
class CounterViewModel : ViewModel() {
    var count by mutableStateOf(0)
        private set

    fun increment() { count++ }
}

@Composable
fun CounterScreen(vm: CounterViewModel = viewModel()) {
    // 旋转屏幕后 Activity 重建，但 vm 还是同一个，count 不丢
    Button(onClick = { vm.increment() }) {
        Text("点了 \${vm.count} 次")
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        一个 Android 应用不是「一个程序从 main 跑到结束」，而是由系统调度的若干<strong>组件</strong>拼成的。
        系统可能在你没注意时把界面切到后台、把进程回收、又在用户点回来时把它重建。这一章先认全
        Android 的<strong>四大组件</strong>各管什么，再把最常打交道的 Activity 的<strong>生命周期</strong>讲透：
        每个回调何时被调用、该在里面做什么，以及为什么「旋转一下屏幕」会让你辛苦准备的界面状态凭空消失——
        以及如何用 <code>onSaveInstanceState</code> 和 <code>ViewModel</code> 把它救回来。
      </Lead>

      <h2>一、四大组件：应用由什么搭成</h2>
      <p>
        传统桌面程序有一个明确的入口函数，从头跑到尾。Android 不是这样：应用被拆成若干种
        <strong>组件（Component）</strong>，每种组件是一个「系统能单独启动、单独调度」的单元。
        系统（而非你的代码）决定它们何时被创建、何时被销毁。理解这一点是理解整个 Android 模型的前提。
      </p>
      <KeyIdea>
        Android 应用由<strong>四大组件</strong>构成——Activity、Service、BroadcastReceiver、ContentProvider。
        它们都必须在 <code>AndroidManifest.xml</code> 里声明，系统才认得、才能启动它们。
        组件的生命由系统掌控，你的工作是在系统给的「回调时机」里做对的事。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>组件</th><th>有界面吗</th><th>管什么</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Activity</strong></td><td>有</td><td>一个可交互的界面（一屏）</td><td>登录页、列表页、详情页；应用入口</td></tr>
          <tr><td><strong>Service</strong></td><td>无</td><td>后台长时间运行的工作</td><td>音乐播放、数据同步、下载</td></tr>
          <tr><td><strong>BroadcastReceiver</strong></td><td>无</td><td>接收并响应系统或应用广播</td><td>开机完成、网络变化、电量低</td></tr>
          <tr><td><strong>ContentProvider</strong></td><td>无</td><td>以统一接口对外共享结构化数据</td><td>把通讯录 / 笔记数据给别的应用读写</td></tr>
        </tbody>
      </table>

      <h3>Activity：界面入口</h3>
      <p>
        Activity 代表「一屏可交互的界面」。用户能看到、能点的，几乎都挂在某个 Activity 上。
        带 <code>LAUNCHER</code> 类别的那个 Activity 就是点桌面图标启动的入口。现代应用常用
        <strong>单 Activity</strong> + 多个 Compose 页面的结构（下一章细讲导航），但 Activity 仍是承载界面的根容器。
      </p>
      <h3>Service：后台</h3>
      <p>
        Service 没有界面，用来在后台做较长时间的工作，比如播放音乐、同步数据。注意现代 Android 对后台
        执行限制很严，长时间前台可感知的任务通常要用<strong>前台 Service</strong>（带通知）或
        <code>WorkManager</code> 来调度，不能随意在后台常驻。
      </p>
      <h3>BroadcastReceiver：广播</h3>
      <p>
        广播是一种「一对多」的系统级消息。系统会在开机完成、网络切换、电量变化等事件发生时发出广播，
        BroadcastReceiver 负责接收并做出反应。它的运行窗口很短，只适合做轻量的触发，重活要转交给 Service 或 WorkManager。
      </p>
      <h3>ContentProvider：数据共享</h3>
      <p>
        ContentProvider 给「把本应用的结构化数据安全地共享给其它应用」提供统一接口（通过 <code>content://</code> URI 访问）。
        系统的通讯录、媒体库都是通过 ContentProvider 暴露的。如果数据只在应用内部用，一般用数据库（Room）即可，不必上 Provider。
      </p>

      <Example title="四大组件都在 Manifest 里登记">
        <p>
          下面这份 Manifest 同时声明了四种组件。没有在这里声明的组件，系统启动时会直接抛异常——
          它根本不知道这个类是个组件。注意每个组件的 <code>android:exported</code>：决定它能否被<strong>其它应用</strong>启动。
        </p>
      </Example>
      <CodeBlock lang="xml" title="AndroidManifest.xml：四大组件声明" code={manifestSnippet} />

      <h2>二、Activity 生命周期：系统给你的「时机」</h2>
      <p>
        Activity 不是你 new 出来的——是系统创建并管理的。系统在它生命的不同阶段调用一系列
        <strong>生命周期回调</strong>方法，你重写这些方法、在「对的时机做对的事」。点下面图里的回调，看它何时触发、该干什么。
      </p>
      <LifecycleDiagram />
      <p>
        这些回调成对出现：<code>onCreate</code> 配 <code>onDestroy</code>（创建/销毁），
        <code>onStart</code> 配 <code>onStop</code>（可见/不可见），<code>onResume</code> 配 <code>onPause</code>（前台/失焦）。
        把它们当成「资源的获取与释放」的对子来记：在前半个回调里申请的东西，往往要在对应的后半个回调里释放。
      </p>

      <h3>各回调的时机与该做的事</h3>
      <table>
        <thead>
          <tr><th>回调</th><th>何时调用</th><th>该做什么</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>onCreate()</code></td>
            <td>首次创建时，整个生命中<strong>只一次</strong>（重建也算一次新的创建）</td>
            <td>一次性初始化：<code>setContent</code> 设置 Compose UI、绑定 ViewModel、从 Bundle 恢复状态。此时界面还不可见。</td>
          </tr>
          <tr>
            <td><code>onStart()</code></td>
            <td>即将对用户可见时</td>
            <td>注册只在可见期间需要的资源；准备显示数据。</td>
          </tr>
          <tr>
            <td><code>onResume()</code></td>
            <td>进入前台、获得焦点，可与用户交互（运行态）</td>
            <td>开始相机预览、传感器、动画等需要前台进行的工作。</td>
          </tr>
          <tr>
            <td><code>onPause()</code></td>
            <td>失去焦点，但可能仍部分可见（如半透明对话框遮挡）</td>
            <td>只做<strong>轻量</strong>收尾。它会阻塞下一个界面显示，重活别放这里。</td>
          </tr>
          <tr>
            <td><code>onStop()</code></td>
            <td>完全不可见（被完全遮挡或进入后台）</td>
            <td>释放较重资源、停止刷新与动画。</td>
          </tr>
          <tr>
            <td><code>onDestroy()</code></td>
            <td>被销毁前最后一次（用户退出，或配置变更触发重建）</td>
            <td>最终清理。注意系统因内存回收销毁时可能<strong>不</strong>走这里。</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock lang="kotlin" title="重写生命周期回调" code={lifecycleSnippet} />

      <h2>三、前台 / 后台的切换路径</h2>
      <p>
        把回调串成路径，就能看清用户操作背后系统在做什么：
      </p>
      <ul>
        <li><strong>启动到可交互</strong>：<code>onCreate</code> {'->'} <code>onStart</code> {'->'} <code>onResume</code>，界面出现并可点。</li>
        <li><strong>按 Home 回桌面（退到后台）</strong>：<code>onPause</code> {'->'} <code>onStop</code>，界面不可见但实例还在。</li>
        <li><strong>从最近任务切回来（回到前台）</strong>：<code>onStart</code> {'->'} <code>onResume</code>，注意<strong>不</strong>再走 <code>onCreate</code>。</li>
        <li><strong>被半透明对话框/分屏部分遮挡</strong>：只到 <code>onPause</code>，仍部分可见；遮挡消失再 <code>onResume</code>。</li>
        <li><strong>彻底退出</strong>：<code>onPause</code> {'->'} <code>onStop</code> {'->'} <code>onDestroy</code>。</li>
      </ul>
      <Callout variant="tip" title="为什么 onPause 不能放重活">
        从一个界面跳到另一个界面时，旧界面的 <code>onPause</code> 会先跑完，新界面才开始显示。
        如果你在 <code>onPause</code> 里写网络请求或大文件保存，用户会感到明显卡顿——所以这里只做轻量收尾，
        重的持久化交给 <code>onStop</code> 或后台任务。
      </Callout>

      <h2>四、配置变更：旋转屏幕为什么会「重建」</h2>
      <p>
        当设备发生<strong>配置变更</strong>（最常见的是旋转屏幕，还有切换深色模式、改系统语言、字体大小等），
        系统默认的处理方式是：<strong>销毁当前 Activity 并立即重建一个新的</strong>。这样新 Activity 才能加载
        与新配置匹配的资源（比如横屏布局、深色主题色）。
      </p>
      <KeyIdea>
        配置变更会让 Activity <strong>销毁并重建</strong>，<code>onCreate</code> 会再跑一遍。
        这意味着所有放在 Activity 实例字段里的临时状态都会丢失——除非你主动把它存下来。
        这正是 <code>onSaveInstanceState</code> 与 <code>ViewModel</code> 存在的理由。
      </KeyIdea>
      <p>
        想象一个计数器：用户点了 7 次，屏幕上显示 7。这时旋转手机，Activity 被销毁重建，
        新实例的 <code>count</code> 字段回到初始值 0——用户的 7 次点击「凭空消失」。这不是 bug，是默认行为。
      </p>

      <h3>方案一：onSaveInstanceState 存少量临时状态</h3>
      <p>
        系统在销毁 Activity 前会调用 <code>onSaveInstanceState(outState: Bundle)</code>，你把要保留的
        <strong>少量</strong>临时 UI 状态写进 Bundle；重建后在 <code>onCreate</code> 的 <code>savedInstanceState</code> 里取回。
        Bundle 要走序列化、且系统限制大小，<strong>只适合放小数据</strong>（如输入框草稿、滚动位置）。
      </p>
      <CodeBlock lang="kotlin" title="onSaveInstanceState + 在 onCreate 恢复" code={saveStateSnippet} />

      <h3>方案二：ViewModel 保存界面级状态</h3>
      <p>
        <code>ViewModel</code> 的实例在配置变更时<strong>不会</strong>被销毁——它的生命周期比单个 Activity 实例更长，
        横跨整个重建过程。因此「界面级状态」（列表数据、加载状态、计数值等）放在 ViewModel 里最合适：
        旋转屏幕后 Activity 换了，但 ViewModel 还是同一个，状态自然保住，而且不必序列化、能装得更多。
      </p>
      <CodeBlock lang="kotlin" title="用 ViewModel 让状态扛过旋转" code={viewModelSnippet} />
      <Callout variant="warn" title="两者分工，不是二选一">
        <code>ViewModel</code> 扛配置变更，但当系统因内存压力<strong>杀掉整个进程</strong>再恢复时，ViewModel 也会丢；
        <code>onSaveInstanceState</code> 写进 Bundle 的数据则能在进程被杀后恢复。实战里二者配合：
        大块界面状态用 ViewModel，少量「即使进程被杀也想留住」的关键值用 saved state（如 <code>SavedStateHandle</code>）。
      </Callout>

      <h2>五、进程与任务栈（一句话）</h2>
      <p>
        补两个常被混淆的概念：每个应用默认跑在自己的 <strong>Linux 进程</strong>里，系统内存紧张时会按优先级回收后台进程
        （所以「能被随时杀掉再恢复」是常态，状态保存才如此重要）；而<strong>任务栈（Task / Back Stack）</strong>
        是 Activity 按打开顺序叠成的栈，按返回键就是把栈顶 Activity 弹出、回到下面一个——这就是「返回」的本质。
      </p>

      <Callout variant="tip">
        下一章我们讲 Activity / 页面之间<strong>怎么跳转、怎么传参、怎么拿返回结果</strong>——
        从 Intent 到现代的 Activity Result API，再到 Compose 时代的 Navigation-Compose 应用内路由。
      </Callout>

      <Summary
        points={[
          'Android 应用由四大组件构成：Activity（界面入口）、Service（后台）、BroadcastReceiver（广播）、ContentProvider（数据共享），且都必须在 AndroidManifest.xml 中声明。',
          'Activity 生命周期回调成对出现：onCreate/onDestroy、onStart/onStop、onResume/onPause；在对的时机做对的事，把它们当作资源获取与释放的对子来记。',
          'onCreate 做一次性初始化（setContent、绑定 ViewModel）；onResume 是可交互的运行态；onPause 只做轻量收尾，重活别放这里以免拖慢下一个界面。',
          '前后台切换有固定路径：退到后台走 onPause->onStop，切回前台走 onStart->onResume（不再走 onCreate）。',
          '配置变更（如旋转屏幕）会销毁并立即重建 Activity，导致实例字段里的临时状态丢失，需要主动保存。',
          'onSaveInstanceState 把少量状态写入 Bundle（可扛进程被杀）；ViewModel 在配置变更时不销毁，适合保存较大的界面级状态，二者配合使用。',
        ]}
      />
    </article>
  )
}
