// 图形验证码：服务端零依赖生成 SVG，答案存内存（一次性、5min 过期）。
// 作用：在「发送邮箱验证码」之前先通过图形验证码，防止发信接口被脚本刷。
import { randomBytes, randomInt } from 'node:crypto'

const TTL_MS = 5 * 60 * 1000
const store = new Map() // id -> { text, expiresAt }

// 去掉易混淆字符（0/O、1/I/l 等）。
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomText(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

// 生成一张 SVG 验证码图。返回 { id, svg }；答案不返回给前端。
export function createCaptcha() {
  const text = randomText(4)
  const id = randomBytes(16).toString('hex')
  store.set(id, { text, expiresAt: Date.now() + TTL_MS })

  const W = 120
  const H = 40
  const colors = ['#2563eb', '#7c3aed', '#0d9488', '#dc2626', '#ca8a04']
  let body = ''

  // 干扰线
  for (let i = 0; i < 4; i++) {
    body += `<path d="M${rand(0, W).toFixed(0)} ${rand(0, H).toFixed(0)} Q ${rand(0, W).toFixed(0)} ${rand(0, H).toFixed(0)} ${rand(0, W).toFixed(0)} ${rand(0, H).toFixed(0)}" stroke="${colors[randomInt(colors.length)]}" stroke-width="1" fill="none" opacity="0.5"/>`
  }
  // 文字（每个字符独立旋转/位移）
  const step = W / (text.length + 1)
  for (let i = 0; i < text.length; i++) {
    const x = step * (i + 1)
    const y = H / 2 + rand(-3, 3)
    const rot = rand(-22, 22).toFixed(1)
    body += `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-size="${rand(22, 26).toFixed(0)}" font-family="monospace" font-weight="700" fill="${colors[randomInt(colors.length)]}" text-anchor="middle" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})">${text[i]}</text>`
  }
  // 干扰点
  for (let i = 0; i < 24; i++) {
    body += `<circle cx="${rand(0, W).toFixed(0)}" cy="${rand(0, H).toFixed(0)}" r="1" fill="${colors[randomInt(colors.length)]}" opacity="0.6"/>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#f8fafc"/>${body}</svg>`
  return { id, svg }
}

// 校验图形验证码（大小写不敏感、一次性消费）。返回 boolean。
export function verifyCaptcha(id, input) {
  if (!id || !input) return false
  const item = store.get(id)
  if (!item) return false
  store.delete(id) // 一次性：无论对错都作废，防重放
  if (Date.now() > item.expiresAt) return false
  return item.text.toUpperCase() === String(input).trim().toUpperCase()
}

// 定期清理过期项，避免内存堆积。
setInterval(() => {
  const now = Date.now()
  for (const [id, item] of store) if (now > item.expiresAt) store.delete(id)
}, 60 * 1000).unref?.()
