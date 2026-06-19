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
