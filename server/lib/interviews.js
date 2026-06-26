// 面试记录数据访问层。
import { getDb } from '../db.js'

export function createInterview(userId, { position, skills }) {
  const db = getDb()
  const now = Date.now()
  const r = db.prepare(
    `INSERT INTO interviews (user_id, position, skills, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(userId, position || '', JSON.stringify(skills || []), now, now)
  return Number(r.lastInsertRowid)
}

export function markReady(id, { grade, summary, reportKey }) {
  getDb().prepare(
    `UPDATE interviews SET status='ready', grade=?, summary=?, report_key=?, updated_at=? WHERE id=?`,
  ).run(grade || '', summary || '', reportKey || '', Date.now(), id)
}

export function markFailed(id, error) {
  getDb().prepare(
    `UPDATE interviews SET status='failed', error=?, updated_at=? WHERE id=?`,
  ).run(String(error || '').slice(0, 500), Date.now(), id)
}

export function listByUser(userId) {
  const rows = getDb().prepare(
    `SELECT id, position, skills, status, grade, summary, report_key, error, created_at
     FROM interviews WHERE user_id=? ORDER BY created_at DESC LIMIT 200`,
  ).all(userId)
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    skills: safeParse(r.skills),
    status: r.status,
    grade: r.grade,
    summary: r.summary,
    hasReport: !!r.report_key,
    error: r.error,
    createdAt: r.created_at,
  }))
}

export function getOwned(id, userId) {
  return getDb().prepare(
    `SELECT * FROM interviews WHERE id=? AND user_id=?`,
  ).get(id, userId) || null
}

function safeParse(s) { try { return JSON.parse(s) } catch { return [] } }
