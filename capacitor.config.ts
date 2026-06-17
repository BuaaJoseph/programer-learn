import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor 配置：把 vite 打出的 dist/ 作为原生 APP 的 web 资源目录。
// 构建用 `npm run build:app`（CAP_BUILD=1，base 设为相对路径），再 `cap sync`。
const config: CapacitorConfig = {
  appId: 'site.aihaven.learn',
  appName: '编程学习站',
  webDir: 'dist',
  // 启动闪屏（可选）：装了 @capacitor/splash-screen 时生效
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0f1320',
    },
  },
}

export default config
