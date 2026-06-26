// 鉴权后端入口：Express + 内置 SQLite。
// 启动时即初始化数据库（不存在则新建库表），再挂载 /api 路由。
import express from 'express'
import { getDb } from './db.js'
import authRoutes from './routes/auth.js'
import interviewRoutes from './routes/interview.js'

const PORT = Number(process.env.PORT || 8787)

// 启动即建库建表（满足「构建/启动判断库是否存在，不存在则新建」）。
getDb()

const app = express()

// 健康检查
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// 鉴权路由（请求体很小，限制 64kb）
app.use('/api/auth', express.json({ limit: '64kb' }), authRoutes)

// 面试模拟路由（简历正文/对话历史/代码可能较大，放宽到 4mb）
app.use('/api/interview', express.json({ limit: '4mb' }), interviewRoutes)

// 统一兜底错误处理
app.use((err, _req, res, _next) => {
  console.error('[server] 未捕获错误:', err)
  res.status(500).json({ error: 'internal', message: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[server] 鉴权服务已启动 → http://localhost:${PORT}`)
})
