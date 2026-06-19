import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 原生 APP 打包（Capacitor）时用相对 base './'（资源从 localhost/file 根加载）；
// 普通网页部署仍用绝对 '/'，保持深链接刷新与干净 URL。用 CAP_BUILD=1 走 APP 构建。
export default defineConfig({
  base: process.env.CAP_BUILD ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
