// 数据访问层：基于 Node 22 内置的 node:sqlite（零原生依赖、单文件库）。
// 启动时若数据库文件不存在会自动创建，并幂等地建表（CREATE TABLE IF NOT EXISTS），
// 满足「随项目构建/启动判断库是否存在，不存在则新建」的需求。
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 数据库文件路径：默认 server/data/app.db，可用 DB_PATH 覆盖。
const DB_PATH = process.env.DB_PATH
  ? resolve(process.env.DB_PATH)
  : resolve(__dirname, 'data', 'app.db')

// 建表 DDL。全部使用 IF NOT EXISTS，可安全重复执行。
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 用户表：邮箱唯一；只存密码哈希与盐，绝不存原文；password_hash 可为空（验证码登录可先建号、后设密码）。
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  nickname      TEXT,
  status        INTEGER NOT NULL DEFAULT 1,   -- 1 正常，0 禁用
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 邮箱验证码表：记录每次下发，用于校验、10min 有效期与 60s 限流。
CREATE TABLE IF NOT EXISTS email_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  code_hash   TEXT    NOT NULL,              -- 验证码的 HMAC，不存明文
  scene       TEXT    NOT NULL DEFAULT 'login',
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER,                       -- 已使用时间，NULL 表示未使用
  attempts    INTEGER NOT NULL DEFAULT 0,    -- 校验失败次数，超限作废
  ip          TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes_lookup ON email_codes(email, scene, created_at);

-- 会话表：登录后下发的不透明 token，可服务端撤销（登出）。
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 面试记录表：每次模拟面试一条。报告与完整对话以 HTML 存到对象存储（COS），库里只存文件地址。
CREATE TABLE IF NOT EXISTS interviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  position    TEXT,                          -- 岗位标题
  skills      TEXT,                          -- 考察技能（JSON 数组字符串）
  status      TEXT    NOT NULL DEFAULT 'pending', -- pending | ready | failed
  grade       TEXT,                          -- A/B/C/D/E
  summary     TEXT,                          -- 报告整体评价摘要
  report_key  TEXT,                          -- COS 对象 key（报告+完整对话的 HTML）
  error       TEXT,                          -- 失败原因
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id, created_at);
`

let db

// 获取（并惰性初始化）数据库连接。首次调用会建目录、建库、建表。
export function getDb() {
  if (db) return db
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const fresh = !existsSync(DB_PATH)
  db = new DatabaseSync(DB_PATH)
  db.exec(SCHEMA)
  console.log(
    `[db] SQLite ${fresh ? '已新建' : '已就绪'} → ${DB_PATH}`,
  )
  return db
}

export { DB_PATH }
