# 鉴权后端（邮箱登录）

为「编程学习站」提供登录 / 注册能力的轻量后端：**Express + Node 内置 SQLite**，
零原生编译依赖。支持两种登录方式：

- **邮箱 + 验证码**：发码前需通过图形验证码；未注册的邮箱会自动建号，并引导设置密码。
- **邮箱 + 密码**：使用已设置的登录密码。

## 安全要点

- 密码用 `scrypt + 每用户随机盐` 哈希存储，**不保存原文**（`server/lib/passwords.js`）。
- 发送邮箱验证码前必须通过**图形验证码**，防止发信接口被刷（`server/lib/captcha.js`）。
- 同一邮箱 **60s** 内只能发送一次验证码；验证码 **6 位、10 分钟**有效、一次性消费、
  校验失败累计达上限作废（`server/lib/codes.js`）。验证码以 HMAC 存储，不存明文。
- 登录态用服务端会话 token（7 天）维持，可登出撤销（`server/lib/users.js`）。

## 数据库

使用 SQLite 单文件库（默认 `server/data/app.db`，可用 `DB_PATH` 覆盖）。
启动或执行 `npm run db:init` 时会**判断库是否存在，不存在则新建**并幂等建表
（`users` / `email_codes` / `sessions`，见 `server/db.js`）。该文件已被 `.gitignore` 忽略。

## 运行

```bash
npm run server       # 启动后端（默认 http://localhost:8787）
npm run server:dev   # 带 --watch 的开发模式
npm run dev          # 前端；Vite 已把 /api 代理到后端
npm run db:init      # 仅初始化数据库（构建时也会自动执行）
```

## 邮件发送

默认 `EMAIL_PROVIDER=mock`：不真正发信，开发期由接口回显 `devCode` 方便联调。
配置真实 SMTP（如 QQ 邮箱）后改为 `EMAIL_PROVIDER=smtp` 即用 nodemailer 发信，
业务代码无需改动。环境变量见 [`.env.example`](./.env.example)。

## 主要接口（前缀 `/api/auth`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/captcha` | 获取图形验证码 `{ captchaId, svg }` |
| POST | `/send-code` | 发送邮箱验证码（需图形验证码 + 60s 限流） |
| POST | `/login-code` | 邮箱 + 验证码登录（未注册自动建号） |
| POST | `/login-password` | 邮箱 + 密码登录 |
| POST | `/set-password` | 设置 / 修改密码（需登录） |
| GET | `/me` | 当前登录用户 |
| POST | `/logout` | 登出（撤销会话） |
