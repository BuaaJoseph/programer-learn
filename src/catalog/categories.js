// 全站两级分类。一级 = 大方向，二级 = 具体技术栈/方向。
// 课程通过 meta 里的 categoryId + subCategoryId 挂到对应二级分类下。
export const CATEGORIES = [
  {
    id: 'server',
    title: '服务端',
    subtitle: 'Backend',
    icon: '🗄️',
    subs: [
      { id: 'java', title: 'Java', subtitle: 'Java 后端' },
      { id: 'database', title: '数据库', subtitle: 'Database' },
      { id: 'middleware', title: '中间件', subtitle: 'Middleware' },
      { id: 'agent', title: 'Agent 开发', subtitle: 'LLM & Agents' },
    ],
  },
  {
    id: 'frontend',
    title: '前端',
    subtitle: 'Frontend',
    icon: '🎨',
    subs: [
      { id: 'vue', title: 'Vue', subtitle: 'Vue 生态' },
      { id: 'react', title: 'React', subtitle: 'React 生态' },
      { id: 'engineering', title: '前端工程化', subtitle: 'Engineering' },
    ],
  },
  {
    id: 'mobile',
    title: '移动端',
    subtitle: 'Mobile',
    icon: '📱',
    subs: [
      { id: 'android', title: 'Android', subtitle: 'Android' },
      { id: 'ios', title: 'iOS', subtitle: 'iOS' },
    ],
  },
  {
    id: 'cs',
    title: '计算机基础',
    subtitle: 'CS Fundamentals',
    icon: '🧱',
    subs: [
      { id: 'network', title: '计算机网络', subtitle: 'Network' },
      { id: 'os', title: '操作系统', subtitle: 'Operating System' },
      { id: 'design', title: '设计模式', subtitle: 'Design Patterns' },
    ],
  },
]

export function findCategory(catId) {
  return CATEGORIES.find((c) => c.id === catId) || null
}

export function findSubCategory(catId, subId) {
  const cat = findCategory(catId)
  if (!cat) return null
  const sub = cat.subs.find((s) => s.id === subId)
  return sub ? { category: cat, sub } : null
}

// 给定课程 meta，拼出可读的「一级 › 二级」面包屑文案。
export function categoryPath(catId, subId) {
  const cat = findCategory(catId)
  if (!cat) return []
  const sub = cat.subs.find((s) => s.id === subId)
  return sub ? [cat, sub] : [cat]
}
