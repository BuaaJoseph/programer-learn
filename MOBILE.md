# 打包成 App（Capacitor）

本站是纯前端 SPA，用 [Capacitor](https://capacitorjs.com/) 套壳成 iOS / Android 原生 App，
**业务代码零改动**，复用 `dist/`。网页部署不受影响（仍是干净 URL）。

## 已经做好的适配

- `vite.config.js`：APP 构建（`CAP_BUILD=1`）用相对 `base: './'`，网页构建仍用 `/`。
- `src/App.jsx`：在原生壳里自动切 `HashRouter`（刷新不白屏），网页仍用 `BrowserRouter`。
- `index.html`：`viewport-fit=cover` + `theme-color` + iOS 全屏 meta。
- `src/styles/platform.css`：用 `env(safe-area-inset-*)` 避开刘海/状态栏/底部指示条。
- `capacitor.config.ts`：`appId=site.aihaven.learn`，`webDir=dist`。

## 首次生成原生工程（在你本机执行）

需要本机装好：Node、以及 Android Studio（安卓）/ Xcode（iOS，仅 macOS）。

```bash
npm install

# 生成原生工程（只需一次）
npx cap add android
npx cap add ios        # 仅 macOS

# 构建 web 资源 + 同步进原生工程，并打开 IDE
npm run app:android    # 等价于 build:app + cap sync android + cap open android
npm run app:ios        # 仅 macOS
```

在 Android Studio / Xcode 里点运行，即可在模拟器或真机上跑。打包正式包（aab/ipa）按各 IDE 的发布流程走。

## 日常迭代

改完前端代码后：

```bash
npm run app:sync       # build:app + cap sync，把最新 dist 推进两端原生工程
```

然后在 IDE 里重新运行即可。

## 可选增强

- 启动闪屏：`npm i @capacitor/splash-screen`（`capacitor.config.ts` 已预留配置）。
- 设备信息 / 唯一标识：`npm i @capacitor/device`，用 `Device.getId()` 替代「IMEI」
  （现代手机无法读取 IMEI；Android 返回每次安装的 ID，iOS 返回 identifierForVendor）。
- 本地存储：当前学习进度存 `localStorage`，WebView 内可用；要更稳可换 `@capacitor/preferences`。
- 推送：`@capacitor/push-notifications`。

## 说明

- App 内的 API key（如接百炼的课程示例）不应硬编码进客户端——那是课程示例代码的运行方式，
  真要在 App 里调模型，应走你自己的后端中转，避免密钥泄露。
