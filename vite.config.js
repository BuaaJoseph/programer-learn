import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 原生 APP 打包（Capacitor）时用相对 base './'（资源从 localhost/file 根加载）；
// 普通网页部署仍用绝对 '/'，保持深链接刷新与干净 URL。用 CAP_BUILD=1 走 APP 构建。
export default defineConfig({
  base: process.env.CAP_BUILD ? './' : '/',
  plugins: [react()],
  build: {
    // 关闭压缩体积统计：在低内存服务器上现场构建时，这一步既慢又吃内存，
    // 容易让构建卡在「computing gzip size」处假死甚至 OOM。
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
  },
  // 开发期把 /api 代理到本地鉴权后端，前端无需关心跨域。
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
