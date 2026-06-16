// 全站课程注册表。新增课程：在 src/courses/ 下建模块，再在这里 import 注册一行即可。
// 平台的「数据库」镜像——将来接后端时，返回结构与此对齐，迁移平滑。
import llmHandbook from '../courses/llm-handbook/index.js'
import mysqlInternals from '../courses/mysql-internals/index.js'
import redisInternals from '../courses/redis-internals/index.js'
import claudeSkills from '../courses/claude-skills/index.js'

export const COURSES = [llmHandbook, claudeSkills, mysqlInternals, redisInternals]

export function getCourse(slug) {
  return COURSES.find((c) => c.meta.slug === slug) || null
}

export function coursesByCategory(catId) {
  return COURSES.filter((c) => c.meta.categoryId === catId)
}

export function coursesBySubCategory(catId, subId) {
  return COURSES.filter((c) => c.meta.categoryId === catId && c.meta.subCategoryId === subId)
}

export const TOTAL_COURSES = COURSES.length
