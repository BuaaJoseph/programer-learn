import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const signingPieces = `// 苹果签名体系里几个名词的关系（概念示意，非真实代码）
//
//  开发者账号 (Apple Developer Program，¥688/年)
//        │
//        ├── Certificate（证书）── 证明「这台机器/团队」可信，分两类：
//        │        • Development  开发证书（装到调试设备）
//        │        • Distribution 分发证书（上架 / TestFlight）
//        │
//        ├── App ID ──────────── 唯一标识一个 App，绑定 Bundle ID
//        │        • com.yourcompany.MyApp（显式，需开启 capability 时用）
//        │
//        └── Provisioning Profile（描述文件）= 把上面三者绑在一起：
//                 证书 + App ID + （开发时）设备列表 + 能力(capabilities)
//                 → 决定「哪个证书、能跑哪个 App、在哪些设备/场景下合法」`

const bundleIdSnippet = `// Bundle ID 是 App 的全局唯一身份，反向域名风格，一经上架不可更改
com.yourcompany.MyApp

// capabilities（能力）= App 想用的系统服务，需在 App ID 与项目里都打开，
// 例如：推送通知 (Push Notifications)、iCloud、Sign in with Apple、
//       后台模式 (Background Modes)、App Groups …
// 打开某个 capability 后，Xcode 会自动把对应权限写进 entitlements 文件`

const archiveSnippet = `# 命令行打包（Archive → 导出 .ipa），CI 上常用
# 1) 归档：以 Release 配置构建出 .xcarchive
xcodebuild archive \\
  -scheme MyApp \\
  -configuration Release \\
  -archivePath ./build/MyApp.xcarchive \\
  -destination "generic/platform=iOS"

# 2) 导出 .ipa（需要一个 ExportOptions.plist 指定签名方式与方法)
xcodebuild -exportArchive \\
  -archivePath ./build/MyApp.xcarchive \\
  -exportOptionsPlist ExportOptions.plist \\
  -exportPath ./build/export

# GUI 等价操作：Xcode 菜单 Product ▸ Archive，
# 在 Organizer 窗口里点 Distribute App 走向导`

const transporterSnippet = `# 把构建产物上传到 App Store Connect，有三种常见途径：
# A) Xcode Organizer：Archive 后直接「Distribute App ▸ App Store Connect ▸ Upload」
# B) Transporter.app：把导出的 .ipa 拖进去上传（适合与打包解耦）
# C) 命令行（CI 友好）：
xcrun altool --upload-app \\
  -f ./build/export/MyApp.ipa \\
  -t ios \\
  --apiKey  $ASC_KEY_ID \\
  --apiIssuer $ASC_ISSUER_ID
# 上传后构建会先经苹果「处理(Processing)」，几分钟到几十分钟后
# 才出现在 TestFlight 与「构建版本」列表里`

const infoPlistSnippet = `<!-- Info.plist：凡是访问敏感数据/硬件的权限，
     都必须给「用途说明」，否则 App 一访问就崩，且审核必拒 -->
<key>NSCameraUsageDescription</key>
<string>App 需要使用相机来扫描二维码完成支付。</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>App 需要访问相册，以便你选择并上传头像图片。</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>App 需要在使用期间获取你的位置，用来推荐附近的门店。</string>

<key>NSMicrophoneUsageDescription</key>
<string>App 需要使用麦克风来录制语音留言。</string>

<key>NSContactsUsageDescription</key>
<string>App 需要读取通讯录，帮你快速邀请好友。</string>`

const semverSnippet = `// 两个「版本号」别混淆：
// • Version (CFBundleShortVersionString)：给用户看的市场版本，如 1.2.0
// • Build  (CFBundleVersion)：每次上传必须递增的内部构建号，如 42
//
// 同一个 Version 下可以上传多个 Build（TestFlight 测试时常见），
// 但提交到 App Store 审核的是其中某一个具体 Build。`

export default function Ch2() {
  return (
    <article>
      <Lead>
        写好的 App 要走到用户手机上，中间隔着苹果一整套<strong>身份与分发机制</strong>：先证明
        「这段代码是可信的你发布的」（签名），再经 TestFlight 让真人试用，最后通过 App Store 审核上架。
        这一章把这条「从 Xcode 到 App Store」的流水线讲清楚——证书体系、Bundle ID 与能力、Archive 打包、
        上传、Beta 测试、提交审核与发布策略。它也是整门 iOS 课程的收束章。
      </Lead>

      <h2>一、为什么 iOS 上架这么「重」</h2>
      <KeyIdea>
        iOS 是<strong>封闭分发</strong>的平台：一个 App 想装到普通用户设备上，几乎只有 App Store 一条路，
        且必须经过苹果<strong>代码签名</strong>与<strong>人工审核</strong>。签名保证「代码来源可信、未被篡改」，
        审核保证「内容与行为合规」。这套机制换来了平台的安全与一致体验，代价是开发者要先理解一堆证书名词。
      </KeyIdea>
      <p>
        理解签名体系，本质上是理解几张「凭证」如何互相绑定。把它们的关系先摆出来，后面就不再混乱。
      </p>
      <CodeBlock lang="swift" title="签名体系的几个名词及其关系" code={signingPieces} />

      <h2>二、开发者账号与证书体系</h2>
      <p>
        一切的起点是 <strong>Apple Developer Program</strong> 会员资格（个人 / 公司，约 99 美元、
        国区 ¥688 一年）。有了账号，才能创建证书、上架、用 TestFlight。证书体系由四件东西构成：
      </p>
      <table>
        <thead>
          <tr><th>概念</th><th>作用</th><th>类比</th></tr>
        </thead>
        <tbody>
          <tr><td>Certificate（证书）</td><td>证明「这个开发者/团队」可信，分 Development 与 Distribution 两类</td><td>身份证</td></tr>
          <tr><td>App ID</td><td>唯一标识一个 App，绑定 Bundle ID 与可用的 capabilities</td><td>App 的户口</td></tr>
          <tr><td>Devices</td><td>开发阶段允许安装调试包的设备 UDID 列表</td><td>准入名单（仅开发用）</td></tr>
          <tr><td>Provisioning Profile（描述文件）</td><td>把证书 + App ID +（开发时）设备 + 能力打包绑定，决定「合法运行的条件」</td><td>通行证</td></tr>
        </tbody>
      </table>

      <h3>自动签名 vs 手动签名</h3>
      <p>
        Xcode 提供两种管理方式。<strong>自动签名（Automatically manage signing）</strong>：勾上后选好团队，
        Xcode 自动帮你创建并维护证书与描述文件，绝大多数项目用它就够了。<strong>手动签名</strong>：
        自己在开发者网站创建证书 / 描述文件、再在项目里逐一指定——团队多人协作、CI 流水线、
        或对证书有严格管控时才需要它。
      </p>
      <Callout variant="tip" title="新手就用自动签名">
        个人开发与学习阶段强烈建议开自动签名，省去手动管理证书的繁琐。等到团队协作或上 CI、
        遇到「证书要在多台机器共享」的问题时，再去学手动签名（以及 fastlane match 这类证书同步方案）。
      </Callout>

      <h2>三、Bundle ID 与 Capabilities</h2>
      <p>
        <strong>Bundle ID</strong> 是 App 的全局唯一身份，采用反向域名风格（如
        <code>com.yourcompany.MyApp</code>）。它一旦随某个版本上架，<strong>就不能再改</strong>——
        改了等于另一个 App。<strong>Capabilities（能力）</strong>则是 App 想使用的系统服务，
        比如推送、iCloud、Sign in with Apple、后台模式等；开启某个能力时，Xcode 会自动把对应的
        <strong>entitlements（授权）</strong>写进项目，并在 App ID 上同步打开。
      </p>
      <CodeBlock lang="bash" title="Bundle ID 与 capabilities" code={bundleIdSnippet} />

      <h2>四、Archive：打包生成可分发产物</h2>
      <p>
        日常调试用的是 Debug 包，不能上架。上架要走 <strong>Archive（归档）</strong>：以 Release 配置编译，
        产出一个 <code>.xcarchive</code>，再从中<strong>导出</strong>带分发签名的 <code>.ipa</code>
        （iOS App 的安装包格式）。在 Xcode 里就是 <code>Product ▸ Archive</code>，
        之后在 Organizer 窗口走分发向导；CI 上则用 <code>xcodebuild</code> 命令完成同样的事。
      </p>
      <CodeBlock lang="bash" title="命令行 Archive 与导出 .ipa" code={archiveSnippet} />
      <Callout variant="warn" title="Build 号每次上传都要递增">
        注意区分两个版本号：给用户看的 <strong>Version</strong> 与内部 <strong>Build 号</strong>。
        每次上传到 App Store Connect，Build 号<strong>必须比上一次大</strong>，否则会被拒收。
        这是新手最常踩的上传报错之一。
      </Callout>
      <CodeBlock lang="swift" title="Version 与 Build 的区别" code={semverSnippet} />

      <h2>五、App Store Connect 与上传构建</h2>
      <p>
        <strong>App Store Connect</strong> 是苹果的网页后台，管理 App 的全部「商店侧」信息：
        创建 App 记录（填入名称、Bundle ID、SKU）、维护版本、填写商店元数据（截图、描述、关键词、
        分级、隐私清单），以及发起 TestFlight 与提交审核。流程上先在这里创建 App 记录，
        再把前一步导出的构建<strong>上传</strong>上去。
      </p>
      <CodeBlock lang="bash" title="把构建上传到 App Store Connect" code={transporterSnippet} />
      <p>
        上传后构建不会立刻可用，要先经苹果<strong>处理（Processing）</strong>——做合规扫描、
        生成符号等，几分钟到几十分钟不等。处理完成后，构建才会出现在 TestFlight 与版本列表里供选用。
      </p>

      <h2>六、TestFlight：上线前的 Beta 测试</h2>
      <KeyIdea>
        TestFlight 让真人在<strong>正式上架之前</strong>试用你的构建并反馈问题，是「写完到发布」之间的缓冲带。
        它分两条通道：<strong>内部测试</strong>面向团队成员、即时可用；<strong>外部测试</strong>面向更广的用户、
        但首个构建需经苹果一次轻量 Beta 审核。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>内部测试 (Internal)</th><th>外部测试 (External)</th></tr>
        </thead>
        <tbody>
          <tr><td>测试人是谁</td><td>App Store Connect 团队成员（有角色）</td><td>任意受邀用户（邮件 / 公开链接）</td></tr>
          <tr><td>人数上限</td><td>较少（团队成员，约 100 名）</td><td>多（最高约 1 万名）</td></tr>
          <tr><td>是否需 Beta 审核</td><td>否，上传处理完即可测</td><td>首个构建需一次轻量审核</td></tr>
          <tr><td>典型用途</td><td>研发自测、冒烟</td><td>更大范围灰度、收集真实反馈</td></tr>
        </tbody>
      </table>
      <p>
        测试者通过 <strong>TestFlight App</strong> 安装 Beta 构建，可直接在里面<strong>截屏批注、
        提交反馈与崩溃日志</strong>，开发者在 App Store Connect 后台统一查看。每个 Beta 构建有
        90 天有效期。用 TestFlight 把明显问题在上架前清掉，能显著降低审核被拒和上线翻车的概率。
      </p>

      <h2>七、提交审核：合规是硬门槛</h2>
      <p>
        Beta 验证后，就在 App Store Connect 选定一个构建、填齐元数据，<strong>提交审核（Submit for Review）</strong>。
        审核由苹果团队按 <strong>App Review Guidelines（审核指南）</strong>逐条把关，覆盖安全、性能、商业模式、
        设计、法律合规等维度。下面是新手最常踩的拒绝原因。
      </p>
      <table>
        <thead>
          <tr><th>常见拒绝原因</th><th>说明与对策</th></tr>
        </thead>
        <tbody>
          <tr><td>缺少权限用途说明</td><td>用了相机/相册/定位等却没在 Info.plist 写 usage description —— 补全且文案要具体</td></tr>
          <tr><td>隐私信息不实 / 缺隐私清单</td><td>App 隐私（Privacy Nutrition Label）与实际收集不符，或缺隐私政策链接</td></tr>
          <tr><td>崩溃与明显 Bug</td><td>审核机一启动就崩、核心功能不可用 —— 提交前务必真机过一遍主流程</td></tr>
          <tr><td>功能太单薄 / 占位</td><td>更像网页套壳或半成品，缺乏原生价值</td></tr>
          <tr><td>支付绕过内购</td><td>数字商品须走 App 内购买（IAP），不能引导外部支付</td></tr>
          <tr><td>登录问题</td><td>提供第三方登录却未提供 Sign in with Apple；未给审核员可用测试账号</td></tr>
        </tbody>
      </table>
      <p>
        其中「<strong>权限用途说明</strong>」是出现频率最高、也最容易避免的一类。任何访问敏感数据 / 硬件的能力，
        都必须在 <code>Info.plist</code> 里给出一句<strong>具体、说人话</strong>的用途说明，否则 App 一访问就直接崩溃，
        审核也必拒。
      </p>
      <CodeBlock lang="bash" title="Info.plist 权限用途说明示例" code={infoPlistSnippet} />
      <Callout variant="warn" title="用途说明要具体，别写废话">
        像「App 需要相机权限」这种空话容易被拒。要写清<strong>为什么用、用来做什么</strong>，
        例如「使用相机扫描二维码完成支付」。系统弹授权框时会原样展示这句话，
        它既影响过审，也直接影响用户是否愿意点「允许」。
      </Callout>

      <h2>八、发布与分阶段发布</h2>
      <p>
        审核通过后，App 进入「待发布」。你可以选择<strong>立即发布</strong>、<strong>定时发布</strong>，
        或开启<strong>分阶段发布（Phased Release）</strong>——让新版本在约 7 天内按比例（1% → 2% → 5% …）
        逐步推送给自动更新用户。分阶段发布能在小范围先暴露问题，万一发现严重 Bug 可随时暂停，
        避免一次性铺给全量用户。
      </p>
      <Example title="一次典型上架的完整路径">
        <p>
          ① 在 App ID 配好 Bundle ID 与 capabilities → ② Xcode 开自动签名、把 Build 号 +1 →
          ③ <code>Product ▸ Archive</code> 打包 → ④ Organizer 上传到 App Store Connect →
          ⑤ 等处理完成，先发<strong>内部 TestFlight</strong> 自测，再发外部 Beta →
          ⑥ 填齐元数据与隐私、补全 Info.plist 权限说明 → ⑦ 提交审核 →
          ⑧ 过审后开<strong>分阶段发布</strong>，观察崩溃率与反馈。
        </p>
      </Example>

      <Callout variant="tip" title="与 Android 上架的一句话差异">
        和 Google Play 相比，iOS 的分发更<strong>集中且强制</strong>：几乎只有 App Store 一条正规通道、
        强制代码签名、且每个版本都要过人工审核；而 Android 允许多渠道分发与侧载，审核相对更宽松更快。
      </Callout>

      <h2>九、收束：你已经走完了一整条 iOS 之路</h2>
      <p>
        从语言与界面，到状态、数据、网络与架构，再到本卷的性能、测试与发布——你已经掌握了把一个想法
        变成「真机上能跑、用户能下载、改起来有底气」的完整 iOS App 所需的全部主干能力。
        接下来要做的，是用一个真实的小项目把这条链路<strong>从头到尾走一遍</strong>：
        立项、写功能、加测试、用 Instruments 调优、过 TestFlight、提交审核上架。
        工程能力是在「真的发出去一个 App」的过程里长出来的。
      </p>

      <Summary
        points={[
          'iOS 是封闭分发平台：装到用户设备几乎只能走 App Store，且必须代码签名 + 人工审核——签名保来源可信、审核保内容合规。',
          '签名体系四件套：Certificate（身份）、App ID（App 户口，绑 Bundle ID 与 capabilities）、Devices（开发设备）、Provisioning Profile（把它们绑在一起的通行证）；新手用自动签名即可。',
          '上架流程主干：配好 Bundle ID/能力 → Archive 打 Release 包导出 .ipa（Build 号每次必须递增）→ 经 Xcode/Transporter 上传到 App Store Connect。',
          'TestFlight 在上架前做 Beta：内部测试即时可用、外部测试覆盖更广但首个构建需轻量审核，测试者可直接截屏反馈与回传崩溃日志。',
          '审核按 App Review Guidelines 把关，最常见拒绝原因是缺 Info.plist 权限用途说明、隐私不实、崩溃；用途说明要具体说人话，否则一访问就崩且必拒。',
          '过审后可立即/定时/分阶段发布，Phased Release 按比例灰度便于及时止损；相比 Android 多渠道+宽松审核，iOS 分发更集中、强制签名、逐版本审核。',
        ]}
      />
    </article>
  )
}
