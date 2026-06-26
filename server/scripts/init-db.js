// 构建/部署时执行：判断数据库是否存在，不存在则新建库表（幂等）。
// 由 `npm run db:init` 调用，也被 `npm run build` 串联触发。
import { getDb, DB_PATH } from '../db.js'

getDb()
console.log(`[db:init] 完成，数据库位于 ${DB_PATH}`)
process.exit(0)
