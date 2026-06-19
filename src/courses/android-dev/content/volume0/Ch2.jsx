import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const manifestSnippet = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:label="HelloAndroid"
        android:theme="@style/Theme.HelloAndroid">

        <!-- 声明一个 Activity，并把它设为启动入口 -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`

const gradleSnippet = `// app/build.gradle.kts —— 模块级构建脚本（Kotlin DSL）
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.helloandroid"
    compileSdk = 35                 // 用哪个版本的 SDK 编译

    defaultConfig {
        applicationId = "com.example.helloandroid"
        minSdk = 24                 // 最低支持的系统版本
        targetSdk = 35              // 针对哪个版本做过适配
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true              // 打开 Jetpack Compose
    }
}

dependencies {
    // 依赖声明：Gradle 会自动下载这些库
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
}`

const mainActivitySnippet = `package com.example.helloandroid

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview

// ① 入口 Activity：用 ComponentActivity（支持 Compose）
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // ② setContent 把这棵 Composable 树设为本界面的内容
        setContent {
            Greeting(name = "Android")
        }
    }
}

// ③ 一个最简单的可组合函数：用 @Composable 标注
@Composable
fun Greeting(name: String) {
    Text(text = "Hello, \$name!")
}

// ④ Preview：不用装到手机，就能在 Android Studio 里预览这个 UI
@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    Greeting(name = "Compose")
}`

const projectTreeSnippet = `HelloAndroid/                  ← 项目根目录
├── settings.gradle.kts        ← 声明项目包含哪些模块
├── build.gradle.kts           ← 项目级构建脚本（全局配置）
├── gradle/                     ← Gradle Wrapper 与版本目录
└── app/                        ← 「app」模块（你的应用主体）
    ├── build.gradle.kts        ← 模块级构建脚本（依赖、SDK 版本…）
    └── src/
        └── main/
            ├── AndroidManifest.xml   ← 应用清单：组件、权限、入口
            ├── java/                 ← Kotlin/Java 源码（目录仍叫 java）
            │   └── com/example/helloandroid/MainActivity.kt
            └── res/                  ← 资源目录
                ├── drawable/         ← 图片 / 矢量图
                ├── mipmap/           ← 应用图标
                ├── values/           ← strings.xml、colors.xml、themes.xml
                └── layout/           ← 传统 XML 布局（用 Compose 时可不需要）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论看过一遍，是时候把工具装好、亲手让第一个 App 在屏幕上亮起来了。
        这一章我们从安装 Android Studio 与 SDK 开始，看懂一个 Android 项目的目录结构、
        搞清 Gradle 到底在帮你干什么，准备好模拟器或真机，
        然后用 Jetpack Compose 写一个最小可运行的 App——并完整追一遍「从你敲的代码到屏幕上的文字」这条链路。
      </Lead>

      <h2>一、安装 Android Studio 与 SDK</h2>
      <p>
        <strong>Android Studio</strong> 是 Google 官方的集成开发环境（IDE），
        基于 JetBrains 的 IntelliJ IDEA 打造，集代码编辑、调试、界面预览、模拟器、性能分析于一身。
        开发 Android，它几乎是唯一的官方选择。
      </p>
      <p>装机大致三步：</p>
      <ol>
        <li>
          从官网下载安装包，跟着 <strong>Setup Wizard（安装向导）</strong>走默认选项即可。
          向导会自动帮你下载 <strong>Android SDK</strong>（开发工具集）、一个 <strong>SDK 平台</strong>
          （某个 Android 版本的 API）、以及构建工具。
        </li>
        <li>
          需要时打开 <strong>SDK Manager</strong> 补装组件：不同的 <strong>API Level</strong>
          （对应不同 Android 版本）、命令行工具、模拟器系统镜像等。
        </li>
        <li>
          确认 <strong>JDK</strong> 就绪——新版 Android Studio 已<strong>内置 JDK</strong>，
          通常无需单独安装。
        </li>
      </ol>
      <Callout variant="note" title="SDK 是什么">
        SDK（Software Development Kit，软件开发工具包）= 一整套编译、构建、调试 Android App 所需的工具与库。
        <code>compileSdk</code> 指「用哪个版本的 SDK 来编译你的代码」，它决定了你能调用到哪些 API。
      </Callout>

      <h2>二、看懂项目结构</h2>
      <p>
        新建项目后，左侧的文件树初看会有点晕。其实抓住几个关键文件和目录就够了。
      </p>
      <CodeBlock lang="kotlin" title="一个典型的 Compose 项目结构" code={projectTreeSnippet} />

      <h3>app 模块与 src/main</h3>
      <p>
        Android 项目以<strong>模块（module）</strong>为单位组织，最主要的就是 <strong>app 模块</strong>——
        它是你应用的主体。模块里的 <code>src/main</code> 是「主源集」，放着你日常写的代码、清单和资源。
        随着项目变大，你可能会把功能拆成多个模块（如 <code>app</code>、<code>core</code>、<code>feature-login</code>），
        但起步阶段一个 app 模块足矣。
      </p>

      <h3>AndroidManifest.xml：应用清单</h3>
      <p>
        清单文件是 App 的「身份证 + 说明书」。系统在安装与运行前会先读它，从中得知：
        这个 App 有哪些组件（<code>Activity</code>、<code>Service</code> 等）、需要哪些权限、
        哪个 <code>Activity</code> 是<strong>启动入口</strong>、App 的图标和名字是什么。
      </p>
      <CodeBlock lang="kotlin" title="AndroidManifest.xml：注册入口 Activity" code={manifestSnippet} />
      <p>
        注意那段 <code>intent-filter</code>：把 <code>action.MAIN</code> 和
        <code>category.LAUNCHER</code> 配在一起，等于告诉系统「这个 Activity 是点桌面图标后第一个打开的界面」。
      </p>

      <h3>res 资源目录</h3>
      <p>
        <code>res</code> 目录放的是「非代码资源」，并按类型分子目录：
        <code>values/</code>（字符串、颜色、主题等 XML）、<code>drawable/</code>（图片与矢量图）、
        <code>mipmap/</code>（应用图标）、<code>layout/</code>（传统 XML 布局，用 Compose 时可以不用）。
        把文案、颜色、尺寸抽到资源里，好处是<strong>便于多语言、多屏幕适配与统一改样式</strong>，
        代码里通过 <code>R.string.xxx</code> 这样的引用去拿。
      </p>

      <h3>Gradle 构建脚本与 Gradle 的作用</h3>
      <KeyIdea>
        <strong>Gradle</strong> 是 Android 的构建系统：它负责把你的源码、资源、依赖<strong>编译并打包</strong>
        成最终的 APK/AAB。你「写代码」，Gradle「把代码变成能装的 App」——这中间所有的下载依赖、
        编译、转 DEX、合并资源、签名，都是它在干。
      </KeyIdea>
      <p>
        项目里有两层构建脚本，现代项目用 Kotlin DSL，文件名是 <code>build.gradle.kts</code>：
      </p>
      <ul>
        <li>
          <strong>项目级</strong> <code>build.gradle.kts</code>（根目录）：放全局配置，比如声明用到的插件版本。
        </li>
        <li>
          <strong>模块级</strong> <code>app/build.gradle.kts</code>：最常改的一个——
          配 <code>compileSdk</code> / <code>minSdk</code> / <code>targetSdk</code>、应用 ID、版本号，
          以及最重要的 <strong>依赖声明 <code>dependencies</code></strong>。
        </li>
      </ul>
      <CodeBlock lang="kotlin" title="app/build.gradle.kts：依赖与 SDK 配置" code={gradleSnippet} />
      <p>
        看 <code>dependencies</code> 块：你只要写一行
        <code>{'implementation("androidx.activity:activity-compose:1.9.0")'}</code>，
        Gradle 就会自动从仓库把这个库（及它依赖的其它库）下载下来并接进构建。
        你不必手动管理 jar 包——这正是构建系统最省心的地方。
      </p>
      <table>
        <thead>
          <tr><th>配置项</th><th>含义</th><th>选取建议</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>compileSdk</code></td>
            <td>用哪个版本 SDK 编译，决定可用 API</td>
            <td>通常取最新稳定版</td>
          </tr>
          <tr>
            <td><code>minSdk</code></td>
            <td>App 支持的最低系统版本</td>
            <td>越低覆盖设备越多，但能用的新 API 越少</td>
          </tr>
          <tr>
            <td><code>targetSdk</code></td>
            <td>声明「针对此版本做过适配」</td>
            <td>应跟随并对齐到较新版本</td>
          </tr>
        </tbody>
      </table>

      <h2>三、准备运行设备：模拟器与真机</h2>

      <h3>模拟器（AVD）</h3>
      <p>
        <strong>AVD（Android Virtual Device，安卓虚拟设备）</strong>是在你电脑上模拟出来的一台「虚拟手机」。
        通过 Android Studio 的 <strong>Device Manager</strong> 新建一个 AVD：选机型（如 Pixel 7）、
        选系统镜像（某个 API Level），点启动，就能在电脑上跑一台 Android。
        它适合日常快速验证，不用插线、不挑手机。
      </p>

      <h3>真机调试</h3>
      <p>
        想在真实设备上跑，需要先开启<strong>开发者选项</strong>与 <strong>USB 调试</strong>：
      </p>
      <ol>
        <li>
          打开手机「设置 → 关于手机」，连续点击<strong>「版本号」7 次</strong>，
          直到提示「你已成为开发者」——开发者选项就此解锁。
        </li>
        <li>
          回到设置，进入新出现的「开发者选项」，打开 <strong>USB 调试</strong>。
        </li>
        <li>
          用数据线把手机连上电脑，手机会弹窗问「是否允许 USB 调试」，点<strong>允许</strong>。
        </li>
        <li>
          此时 Android Studio 的设备下拉里就能看到你的真机，选中它点运行即可。
        </li>
      </ol>
      <Callout variant="tip" title="真机 vs 模拟器">
        模拟器方便、能模拟各种机型与系统版本；但涉及相机、传感器、性能体验、指纹等，
        还是<strong>真机更真实</strong>。实战中两者搭配使用最高效。
      </Callout>

      <h2>四、写第一个 Compose App</h2>
      <p>
        终于到了写代码的环节。<strong>Jetpack Compose</strong> 是 Android 现代的声明式 UI 工具包——
        你用 Kotlin <strong>描述「界面长什么样」</strong>，而不是像过去那样写 XML 布局再用代码去找控件、改控件。
        下面是一个最小可运行的 Compose App。
      </p>
      <CodeBlock lang="kotlin" title="MainActivity.kt：最小可运行的 Compose App" code={mainActivitySnippet} />
      <p>逐行看这四个关键点：</p>
      <ul>
        <li>
          <strong>① <code>MainActivity : ComponentActivity</code></strong>：界面入口。
          用 <code>ComponentActivity</code>（而非旧的 <code>Activity</code>），因为它对 Compose 提供支持。
        </li>
        <li>
          <strong>② <code>setContent {'{ ... }'}</code></strong>：在 <code>onCreate</code> 里调用，
          把花括号里的可组合内容设为这个界面的全部内容——这是从「Activity 世界」进入「Compose 世界」的桥。
        </li>
        <li>
          <strong>③ <code>@Composable fun Greeting</code></strong>：一个<strong>可组合函数</strong>。
          加上 <code>@Composable</code> 注解的普通 Kotlin 函数，就是一块 UI；它能接收参数（如 <code>name</code>）、
          能调用其它可组合函数，像搭积木一样拼出界面。这里它用一个 <code>Text</code> 显示一行字。
        </li>
        <li>
          <strong>④ <code>@Preview</code></strong>：标了 <code>@Preview</code> 的可组合函数，
          能在 Android Studio 右侧<strong>直接预览</strong>，不必每次都装到设备上跑，极大加快了调界面的速度。
        </li>
      </ul>
      <Callout variant="note" title="可组合函数的命名约定">
        <code>@Composable</code> 函数通常用<strong>大写开头的名词</strong>命名（如 <code>Greeting</code>、
        <code>Text</code>），且一般<strong>没有返回值</strong>——它不是「算一个值返回」，而是「往界面上发射 UI」。
        这和普通 Kotlin 函数小写开头、有返回值的习惯不同，是 Compose 的专属约定。
      </Callout>

      <h2>五、从源码到屏幕：完整链路</h2>
      <p>
        当你点下 Android Studio 那个绿色的运行按钮，背后这条链路被依次触发：
      </p>
      <Example title="一次运行发生了什么">
        <p>
          1）<strong>Gradle 构建</strong>：编译你的 Kotlin 源码，把 <code>.class</code> 转成 DEX，
          合并资源，连同清单一起打包并签名成 APK；
          2）<strong>安装</strong>：把 APK 推送到模拟器 / 真机并安装，系统为它分配 UID；
          3）<strong>启动</strong>：系统据清单找到入口 <code>MainActivity</code>，由
          <strong>Zygote</strong> fork 出 App 进程，ART 装载 DEX；
          4）<strong>执行</strong>：<code>onCreate()</code> 被回调，<code>setContent</code> 运行你的
          <code>Greeting</code>，Compose 把这棵 UI 树测量、布局、绘制；
          5）<strong>上屏</strong>：屏幕上出现 “Hello, Android!”。
        </p>
      </Example>
      <p>
        把这条链路和上一章的系统架构对照看：你写的 Kotlin（Framework API 层）→ 被编成 DEX、跑在 ART 上
        （运行时层）→ 经 Zygote fork 进程、由内核调度（内核层）→ 通过显示 HAL 与驱动最终点亮像素。
        一行 <code>Text</code>，串起了整座分层大厦。
      </p>

      <Callout variant="tip" title="动手是最好的学习">
        强烈建议你现在就把这个最小 App 亲手跑起来：改改 <code>Greeting</code> 里的文字、
        多放一个 <code>Text</code>、调一调 <code>@Preview</code>，看界面如何变化。
        把「代码改动—预览/运行—看到结果」这个循环跑顺，后面学 Compose 会快很多。
      </Callout>

      <Summary
        points={[
          'Android Studio 是官方 IDE，安装向导会自动配好 SDK；用 SDK Manager 按需补装不同 API Level 与组件，JDK 通常已内置。',
          '项目以模块组织，主体是 app 模块；src/main 下有 AndroidManifest.xml（清单：组件/权限/入口）、源码目录与 res 资源目录。',
          'Gradle 是构建系统：负责下载依赖、编译、转 DEX、打包签名成 APK/AAB；常改的是模块级 app/build.gradle.kts 里的 SDK 版本与 dependencies。',
          '运行设备有两类：AVD 模拟器（Device Manager 新建，方便快速验证）与真机（开启开发者选项 + USB 调试后连线调试）。',
          '第一个 Compose App 的要点：MainActivity 继承 ComponentActivity，在 onCreate 里用 setContent 挂载 @Composable 函数（如 Greeting），并可用 @Preview 免设备预览。',
          '从源码到屏幕的链路：Gradle 构建打包 → 安装分配 UID → Zygote fork 进程 + ART 装载 DEX → onCreate/setContent 执行 → Compose 测量布局绘制 → 上屏。',
        ]}
      />
    </article>
  )
}
