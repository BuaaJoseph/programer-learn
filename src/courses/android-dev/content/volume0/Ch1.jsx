import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const appProcessSnippet = `// 一个最普通的 Activity，运行在「你的 App 进程」里
// 这个进程不是凭空启动的，而是由系统的 Zygote 进程 fork 出来的
package com.example.helloandroid

import android.app.Activity
import android.os.Bundle

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 此刻：Linux 内核已起、ART 已加载本进程的 DEX 字节码、
        // Framework 已通过 Binder 把生命周期回调发到这里
        println("我运行在 UID=\${android.os.Process.myUid()} 的独立沙盒里")
    }
}`

const dexSnippet = `// 1) 你写的是 Kotlin（或 Java）源码
fun greet(name: String): String = "Hello, \$name"

// 2) kotlinc 把它编译成 JVM .class 字节码
// 3) d8 / R8 再把 .class 转成 Android 专用的 DEX 字节码（classes.dex）
// 4) ART 运行时负责装载并执行 DEX：
//      - 安装时 / 空闲时做 AOT（提前编译成机器码，启动快、运行省电）
//      - 运行时对热点代码做 JIT（即时编译，兼顾灵活性）
// 这一套「DEX + ART + AOT/JIT 混合」就是早期 Dalvik 虚拟机的继任者`

const sandboxSnippet = `// Android 的安全模型：每个 App 默认是一个独立的 Linux 用户
// 安装时系统分配一个唯一的 UID（如 u0_a123），App 的文件、进程都归这个 UID
//
// /data/data/com.example.helloandroid/   <- 仅本 App 的 UID 可读写
//
// 想访问别人的数据或敏感硬件？必须：
//   - 在 AndroidManifest.xml 里声明权限
//   - 危险权限还要在运行时由用户点「允许」
val canRead = checkSelfPermission(android.Manifest.permission.READ_CONTACTS)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        在写第一行 Kotlin 之前，先把「脚下的地基」看清楚会让你少走很多弯路。
        Android 不是一个单一的程序，而是一座<strong>分层的系统大厦</strong>：
        最底下是 Linux 内核，往上是硬件抽象层、运行时、Framework API，最上面才是你写的 App。
        这一章我们自底向上把这座大厦逐层讲清，再看一个 App 是怎么被打包、安装、由系统 fork 出进程跑起来的，
        以及为什么每个 App 都被关进自己的「沙盒」里，最后聊聊 Google 为什么选 Kotlin 当官方语言。
      </Lead>

      <h2>一、Android 是什么：一套分层操作系统</h2>
      <p>
        很多初学者以为「Android = 写界面的那套 API」，其实那只是最顶上的一层。
        Android 的全貌是一套完整的、基于 Linux 的移动操作系统，从驱动硬件的内核，
        到管理内存与进程的运行时，再到给开发者用的高层接口，层层叠叠、各司其职。
        理解这套分层，你才能明白「为什么一个 <code>Button</code> 点下去会震动」「为什么 App 崩了不会拖垮整机」。
      </p>
      <KeyIdea>
        Android 采用<strong>分层架构</strong>：上层只依赖下层暴露的接口，不关心下层怎么实现。
        这种「关注点分离」让硬件厂商、系统厂商、App 开发者可以各自演进——
        你换手机、换芯片，App 代码却几乎不用动，靠的就是中间这些稳定的抽象层。
      </KeyIdea>

      <h2>二、五层架构自底向上逐层拆解</h2>

      <h3>第 1 层：Linux 内核（Linux Kernel）</h3>
      <p>
        Android 的最底层是一个经过定制的 <strong>Linux 内核</strong>。它负责操作系统最核心的脏活累活：
        进程调度、内存管理、底层电源管理、网络协议栈，以及最重要的——<strong>设备驱动</strong>
        （摄像头驱动、显示驱动、音频驱动、Wi-Fi 驱动等）。Android 还在标准 Linux 之上加了一些专属机制，
        比如进程间通信用的 <strong>Binder</strong> 驱动、内存吃紧时回收进程的 <strong>Low Memory Killer</strong>、
        以及唤醒锁 <code>wakelock</code> 等省电设施。
      </p>
      <p>
        关键认知：你写 App 时几乎<strong>永远不会直接碰到内核</strong>。它在最底下默默干活，
        通过上层抽象把能力暴露出来。但知道它存在，能帮你理解「为什么后台进程会被系统杀掉」
        （Low Memory Killer 在工作）这类现象。
      </p>

      <h3>第 2 层：硬件抽象层（HAL）</h3>
      <p>
        硬件五花八门——同样是「拍照」，不同厂商的摄像头芯片差异极大。
        <strong>HAL（Hardware Abstraction Layer，硬件抽象层）</strong>就是为了抹平这些差异而生的。
        它定义了一组<strong>标准接口</strong>（比如「相机模块应该提供这些方法」），
        硬件厂商按这个接口去实现自家驱动的对接代码。
      </p>
      <p>
        这样一来，上层 Framework 只管按标准接口调用「打开相机」，
        至于底下是高通还是联发科的芯片、具体驱动怎么写，HAL 帮你屏蔽掉了。
        HAL 是连接「软件世界」和「具体硬件」的转换插头。
      </p>

      <h3>第 3 层：ART 运行时与核心库（Runtime &amp; Native Libraries）</h3>
      <p>
        这一层是 Android 的「发动机」。它包含两部分：一是用 C/C++ 写的<strong>原生核心库</strong>
        （如图形渲染的 OpenGL/Vulkan、数据库 SQLite、网络与加密库等），二是<strong>ART 运行时</strong>
        （Android Runtime）——你写的每一段 Kotlin/Java 代码，最终都是在 ART 里被执行的。
      </p>
      <p>
        ART 是早期 <strong>Dalvik 虚拟机</strong>的继任者（从 Android 5.0 起全面取代 Dalvik）。
        它执行的不是标准 JVM 的 <code>.class</code> 字节码，而是 Android 专用的 <strong>DEX</strong>
        （Dalvik Executable）字节码——多个 <code>.class</code> 会被合并压进 <code>classes.dex</code>，更紧凑、更省内存。
      </p>
      <CodeBlock lang="kotlin" title="从 Kotlin 源码到 DEX 再到 ART 执行" code={dexSnippet} />
      <p>
        ART 与 Dalvik 最大的区别在<strong>编译策略</strong>：
      </p>
      <ul>
        <li>
          <strong>Dalvik（旧）</strong>：纯 <strong>JIT</strong>（Just-In-Time，即时编译）——
          App 每次运行时才把字节码逐步翻成机器码，启动慢、运行时还要耗 CPU 翻译。
        </li>
        <li>
          <strong>ART（新）</strong>：早期改成纯 <strong>AOT</strong>（Ahead-Of-Time，提前编译）——
          安装 App 时就把 DEX 编译成机器码，启动快、运行省电，代价是安装慢、占空间。
        </li>
        <li>
          <strong>ART 现状</strong>：演进为 <strong>AOT + JIT + Profile 混合</strong>——
          先解释执行 / JIT，记录哪些是「热点代码」，等设备空闲、充电时再针对热点做 AOT。
          兼顾了启动速度、安装速度与运行效率。
        </li>
      </ul>
      <Callout variant="note" title="为什么要有自己的字节码与运行时">
        手机的内存、电量、存储都比 PC 紧张得多。DEX 格式比标准 <code>.class</code> 更省空间，
        ART 的混合编译策略则是在「启动快、运行省电、安装别太慢」之间反复权衡的结果。
        这是 Android 区别于桌面 JVM 的一个核心工程取舍。
      </Callout>

      <h3>第 4 层：Java/Kotlin Framework API</h3>
      <p>
        这是你作为 App 开发者<strong>每天打交道</strong>的一层，全部用 Java/Kotlin 接口暴露。
        它把下层的能力封装成一套好用的「积木」：<code>Activity</code> / <code>Fragment</code>
        （界面与生命周期）、各种 <code>View</code> 与 <code>Composable</code>（界面元素）、
        <code>Intent</code>（组件间跳转与通信）、各类 <strong>Manager</strong>（如
        <code>ActivityManager</code>、<code>PackageManager</code>、<code>NotificationManager</code>）等。
      </p>
      <p>
        这些高层 API 在底层往往通过 <strong>Binder</strong> 与系统服务进程通信。
        比如你调一个「发通知」的方法，实际是把请求经 Binder 发给系统的
        <code>NotificationManagerService</code> 去真正处理。你看到的是简单的方法调用，
        背后是一整套跨进程协作。
      </p>

      <h3>第 5 层：系统应用与你的 App（Applications）</h3>
      <p>
        最顶层是各种应用：系统预装的电话、短信、设置、桌面 Launcher，
        以及你即将写出来的 App。重要的是——<strong>系统 App 和你的 App 用的是同一套 Framework API</strong>，
        没有「特权 API」之分（少数系统级权限除外）。你完全有能力写出和系统应用一样级别的程序。
      </p>

      <h2>三、分层架构总表</h2>
      <table>
        <thead>
          <tr><th>层级</th><th>名称</th><th>主要职责</th><th>典型实现 / 例子</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>5（顶）</td><td>应用层 Applications</td>
            <td>用户直接使用的程序</td>
            <td>电话、短信、Launcher、你的 App</td>
          </tr>
          <tr>
            <td>4</td><td>Framework API（Java/Kotlin）</td>
            <td>给开发者用的高层接口</td>
            <td>Activity、View/Compose、Intent、各类 Manager</td>
          </tr>
          <tr>
            <td>3</td><td>运行时与原生库</td>
            <td>执行字节码、提供底层能力</td>
            <td>ART 运行时、OpenGL/Vulkan、SQLite</td>
          </tr>
          <tr>
            <td>2</td><td>HAL 硬件抽象层</td>
            <td>抹平硬件差异的标准接口</td>
            <td>相机 HAL、音频 HAL、传感器 HAL</td>
          </tr>
          <tr>
            <td>1（底）</td><td>Linux 内核</td>
            <td>调度、内存、驱动、IPC</td>
            <td>进程调度、Binder 驱动、设备驱动</td>
          </tr>
        </tbody>
      </table>

      <h2>四、一个 App 是怎么跑起来的：打包、安装、运行</h2>

      <h3>打包：APK 与 AAB</h3>
      <p>
        你的源码、资源、清单文件最终会被打包成一个安装产物。历史上的标准格式是
        <strong>APK</strong>（Android Package，本质是一个 zip）：里面有编译好的 <code>classes.dex</code>、
        <code>res</code> 资源、<code>AndroidManifest.xml</code> 清单、签名信息等。
      </p>
      <p>
        现在上架 Google Play 用的是更新的 <strong>AAB</strong>（Android App Bundle）格式：
        你上传一个包含全部内容的 <code>.aab</code>，Google Play 再根据每台设备的
        屏幕密度、CPU 架构、语言等，<strong>动态生成并下发量身定制的精简 APK</strong>，
        用户下载的体积更小。简单记：<strong>AAB 是上传给商店的，APK 是最终装到设备上的</strong>。
      </p>

      <h3>安装：注册与分配身份</h3>
      <p>
        安装时，系统的 <code>PackageManager</code> 会校验签名、解析清单、把 App 注册进系统，
        并为它<strong>分配一个唯一的 Linux UID</strong>（用户 ID）。从这一刻起，
        这个 App 在系统眼里就是一个独立的「用户」。
      </p>

      <h3>运行：由 Zygote 进程 fork 出来</h3>
      <p>
        这是 Android 一个很巧妙的设计。系统启动时会先起一个特殊进程 <strong>Zygote</strong>（受精卵），
        它<strong>预先加载好</strong>了 ART 运行时和大量常用的 Framework 类库，然后就「待命」。
        当你点开一个 App，系统不会从零启动一个新进程，而是让 Zygote <strong>fork</strong>（分裂）出一个子进程——
        子进程瞬间「继承」了那些已加载好的运行时和类库（靠写时复制 copy-on-write 共享内存），
        启动速度因此快得多，内存也更省。
      </p>
      <KeyIdea>
        「Zygote fork」是 Android App 冷启动快的关键：每个 App 进程都不是从空白开始，
        而是从一个已经热好身的母进程分裂出来，天生就带着 ART 和核心类库。
      </KeyIdea>
      <CodeBlock lang="kotlin" title="App 进程里的代码：它运行在自己的 UID 沙盒中" code={appProcessSnippet} />
      <Example title="从点击图标到界面出现，发生了什么">
        <p>
          1）你点桌面图标，Launcher 发一个 <code>Intent</code> 请求启动；
          2）系统的 <code>ActivityManagerService</code> 收到，发现该 App 还没进程；
          3）它请 <strong>Zygote</strong> fork 出一个新进程，并赋予该 App 的 UID；
          4）新进程里 ART 装载 <code>classes.dex</code>，创建 <code>Application</code> 与
          <code>MainActivity</code>；5）Framework 经 Binder 回调 <code>onCreate()</code>，
          你的界面被构建并渲染上屏。整个链路通常只要几百毫秒。
        </p>
      </Example>

      <h2>五、安全模型：沙盒与每 App 独立 UID</h2>
      <p>
        前面反复提到的 UID，正是 Android 安全模型的基石。
        Android <strong>直接复用了 Linux 的多用户文件权限机制</strong>：既然每个 App 都是一个独立的
        Linux「用户」，那么 A 应用就<strong>天然无权</strong>读写 B 应用的私有文件——这就是<strong>应用沙盒</strong>。
      </p>
      <CodeBlock lang="kotlin" title="沙盒与权限：想越界就得显式申请" code={sandboxSnippet} />
      <ul>
        <li>
          <strong>私有数据隔离</strong>：每个 App 有自己的私有目录
          <code>/data/data/包名/</code>，仅本 App 的 UID 能访问，其他 App 看不到也碰不到。
        </li>
        <li>
          <strong>进程隔离</strong>：App 跑在自己的进程里，一个 App 崩溃<strong>不会拖垮</strong>其他 App 或整个系统。
        </li>
        <li>
          <strong>权限模型</strong>：要访问敏感资源（通讯录、定位、相机），必须在
          <code>AndroidManifest.xml</code> 声明权限；其中「危险权限」还要在<strong>运行时</strong>
          弹窗让用户当场点「允许」，用户可随时撤销。
        </li>
      </ul>
      <Callout variant="tip" title="沙盒的好处对开发者也成立">
        因为有沙盒，你写 App 时不用担心「会不会一不小心改坏了别的 App 的数据」——
        系统已经从底层把边界划好了。要跨边界协作（共享数据、调用对方功能），
        得走规范的渠道：<code>Intent</code>、<code>ContentProvider</code>、权限声明等。
      </Callout>

      <h2>六、为什么是 Kotlin：Android 的官方语言</h2>
      <p>
        Android 早期用 Java 开发。2017 年的 Google I/O 大会上，Google 宣布
        <strong>Kotlin 成为 Android 官方支持的开发语言</strong>；到 2019 年更进一步提出
        <strong>「Kotlin First（Kotlin 优先）」</strong>——新的 API、文档、示例、最佳实践都优先面向 Kotlin。
        如今 Jetpack Compose 这套现代 UI 工具包更是<strong>只用 Kotlin</strong>。
      </p>
      <table>
        <thead>
          <tr><th>痛点（Java）</th><th>Kotlin 的改进</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>空指针异常 NPE 频发</td>
            <td>语言级<strong>空安全</strong>：<code>String</code> 与 <code>String?</code> 类型上就区分可空</td>
          </tr>
          <tr>
            <td>样板代码冗长（getter/setter、findViewById）</td>
            <td>数据类 <code>data class</code>、属性、字符串模板等大幅减少样板</td>
          </tr>
          <tr>
            <td>函数式表达力弱</td>
            <td>一等公民的 lambda、高阶函数、扩展函数、协程处理异步</td>
          </tr>
          <tr>
            <td>与已有代码的兼容</td>
            <td>与 Java <strong>100% 互操作</strong>，可在同一项目里混用、渐进迁移</td>
          </tr>
        </tbody>
      </table>
      <p>
        简而言之：Kotlin 更<strong>简洁、安全、现代</strong>，又能和海量既有 Java 代码无缝共存，
        还能用<strong>协程</strong>优雅地处理异步——这些恰好命中了移动开发的核心痛点。
        本课程从此全程使用 Kotlin。
      </p>

      <Callout variant="note" title="先有全局，再动手">
        这一章你不需要记住每个细节。只要建立起「Android 是分层的、App 跑在 ART 上、
        每个 App 有自己的沙盒、Kotlin 是首选语言」这个全局图景就够了。
        下一章我们就装好工具、亲手跑起第一个 Compose App。
      </Callout>

      <Summary
        points={[
          'Android 是基于 Linux 的分层操作系统，自底向上：Linux 内核 → HAL 硬件抽象层 → ART 运行时与原生库 → Framework API → 系统应用与你的 App。',
          '你写的 Kotlin 被编译成 DEX 字节码，由 ART 运行时执行；ART 是 Dalvik 的继任者，采用 AOT + JIT + Profile 的混合编译策略，兼顾启动、安装与运行效率。',
          'App 打包成 APK（装到设备）或 AAB（上传商店，由 Play 动态生成精简 APK）；安装时由 PackageManager 分配唯一 UID。',
          '运行时由系统的 Zygote 进程 fork 出 App 进程，子进程继承预加载的 ART 与核心类库，因此启动快、内存省。',
          '安全模型基于「每个 App 一个独立 Linux UID」的沙盒：私有数据隔离、进程隔离、访问敏感资源须在清单声明并经运行时授权。',
          'Google 2017 年定 Kotlin 为官方语言、2019 年提出 Kotlin First：空安全、少样板、强函数式与协程、与 Java 完全互操作，本课程全程用 Kotlin。',
        ]}
      />
    </article>
  )
}
