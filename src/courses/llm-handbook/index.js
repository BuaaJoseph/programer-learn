// 一门课的统一出口：元信息 + 大纲数据 + 正文组件注册表。
// 新增课程时照此结构再建一个目录即可。
import { meta } from './meta.js'
import {
  VOLUMES,
  FLAT_CHAPTERS,
  TOTAL_CHAPTERS,
  TOTAL_MINUTES,
  findChapterBySlug,
  findVolumeById,
} from './curriculum.js'
import { hasContent, getContent } from './content/registry.js'

const course = {
  meta,
  volumes: VOLUMES,
  flatChapters: FLAT_CHAPTERS,
  totalChapters: TOTAL_CHAPTERS,
  totalMinutes: TOTAL_MINUTES,
  findChapterBySlug,
  findVolumeById,
  hasContent,
  getContent,
}

export default course
