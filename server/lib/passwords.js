// 密码哈希：使用 Node 内置 crypto 的 scrypt（抗暴力破解的慢哈希）+ 每用户随机盐。
// 服务端只存 {salt, hash}，永不保存密码原文。校验用 timingSafeEqual 防时序攻击。
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

// 生成 {salt, hash}（均为十六进制字符串）。
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEYLEN).toString('hex')
  return { salt, hash }
}

// 校验明文密码是否匹配存储的 {salt, hash}。
export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

// 简单的密码强度校验：至少 8 位，且包含字母与数字。
export function isStrongPassword(pw) {
  return (
    typeof pw === 'string' &&
    pw.length >= 8 &&
    pw.length <= 64 &&
    /[A-Za-z]/.test(pw) &&
    /\d/.test(pw)
  )
}
