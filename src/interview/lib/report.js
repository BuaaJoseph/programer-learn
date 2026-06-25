// 面试评分报告：构建评分 prompt、解析模型返回的结构化结果、生成可独立打开/下载的 HTML 报告。
import { COURSES } from '../../catalog/courses.js'
import { findPosition } from '../data/positions.js'

// 全站课程清单（喂给模型用于推荐 + 解析 slug 用）
export function courseCatalog() {
  return COURSES.map((c) => ({
    slug: c.meta.slug,
    title: c.meta.title,
    desc: c.meta.shortTitle || c.meta.subtitle || '',
    cat: `${c.meta.categoryId}/${c.meta.subCategoryId || ''}`,
  }))
}

export function courseUrl(slug) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/course/${slug}`
}

export function findCourse(slug) {
  return COURSES.find((c) => c.meta.slug === slug) || null
}

const GRADES = {
  A: { label: 'A · 非常满意', color: '#0e835a', desc: '语言表达、项目、技术与 Coding 近乎完美，正是公司需要的人才（极难获得）' },
  B: { label: 'B · 优秀人才', color: '#2563eb', desc: '整体优秀，个别方面略有差距，强烈推荐给后续面试官' },
  C: { label: 'C · 通过面试', color: '#b26a09', desc: '项目与技术基础扎实，可继续推进，但缺少特别亮眼的表现' },
  D: { label: 'D · 未通过（可荐他岗）', color: '#c0344d', desc: '部分方面欠缺，本岗位不再推进，其他岗位可继续面试' },
  E: { label: 'E · 不可行', color: '#7a1326', desc: '一个或多个方面表现很差，短期内不建议推进其他岗位' },
}

export function gradeMeta(g) {
  return GRADES[g] || { label: g, color: '#454c59', desc: '' }
}

// 构建评分 prompt。把全站课程清单给模型，让它推荐相关课程（用 slug）。
export function buildReportPrompt(cfg) {
  const pos = findPosition(cfg.position)
  const cats = courseCatalog()
    .map((c) => `${c.slug} | ${c.title}`)
    .join('\n')

  return `面试到此结束。现在请你切换为「面试评估官」，基于上面完整的面试对话记录，对这位「${pos ? pos.title : cfg.position}」候选人做一次严谨、客观的综合评估打分。

# 评分等级（必须从中选一个）
- A：非常满意。语言表达、项目考察、技术技能和 Coding 都基本做到完美，正是公司需要的人才（极难获得）。
- B：优秀人才。在 A 的基础上个别方面有差距，但仍优秀，会强烈推荐给后续面试官。
- C：通过面试。项目考察、技术基础都比较扎实，可继续推进；没有特别亮眼或打动面试官的表现一般定为此级。
- D：未通过，但可推荐其他岗位。综合评估有所欠缺，本岗位不再推进，其他岗位可继续面试。
- E：完全不可行。一个或多个方面表现很差（如项目说不清、追问细节或基础知识基本不了解），短期内不建议推进其他岗位。

# 评估要求
1. 必须「结合面试中的具体问答实例」给出理由，好的与不足的地方都要引用候选人实际说过的话或表现，不能空口无凭。
2. 分维度评估：语言表达、项目考察、技术基础、AI/LLM 编程、Coding 编码。每个维度给 1-5 分并附结合实例的点评。
3. 给出后续需要加强的知识/技能清单，并尽量从下面的「本站课程清单」中挑选相关课程推荐（用 slug）。

# 本站课程清单（slug | 课程名）
${cats}

# 输出格式（务必只输出一个 JSON，不要任何额外文字或 markdown 代码块标记）
{
  "grade": "A|B|C|D|E",
  "gradeReason": "为什么定这个等级（结合整体表现，2-4句）",
  "overallSummary": "整体评价（150字左右）",
  "dimensions": [
    {"name": "语言表达", "score": 1-5, "comment": "结合实例的点评"},
    {"name": "项目考察", "score": 1-5, "comment": "结合实例的点评"},
    {"name": "技术基础", "score": 1-5, "comment": "结合实例的点评"},
    {"name": "AI/LLM 编程", "score": 1-5, "comment": "结合实例的点评"},
    {"name": "Coding 编码", "score": 1-5, "comment": "结合实例的点评"}
  ],
  "strengths": [{"point": "亮点", "example": "面试中的具体实例"}],
  "weaknesses": [{"point": "不足", "example": "面试中的具体实例"}],
  "improvements": [{"topic": "需加强的知识/技能", "detail": "具体建议", "courseSlugs": ["相关课程slug"]}],
  "recommendedCourses": [{"slug": "课程slug", "reason": "推荐理由"}]
}`
}

// 从模型文本中解析出 JSON（容忍代码块包裹、前后噪声）。
export function parseReport(text) {
  if (!text) throw new Error('评估结果为空')
  let s = text.trim()
  // 去掉 ```json ... ``` 包裹
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  // 截取第一个 { 到最后一个 }
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  return JSON.parse(s)
}

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function stars(score) {
  const n = Math.max(0, Math.min(5, Number(score) || 0))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

// 生成完整、可独立打开的 HTML 报告字符串。
export function renderReportHtml(report, cfg) {
  const pos = findPosition(cfg.position)
  const gm = gradeMeta(report.grade)
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const dims = (report.dimensions || [])
    .map(
      (d) => `<tr>
        <td class="dim-name">${esc(d.name)}</td>
        <td class="dim-score"><span class="stars">${stars(d.score)}</span> <b>${esc(d.score)}</b>/5</td>
        <td class="dim-comment">${esc(d.comment)}</td>
      </tr>`,
    )
    .join('')

  const strengths = (report.strengths || [])
    .map((s) => `<li><div class="pt good">✔ ${esc(s.point)}</div>${s.example ? `<div class="ex">实例：${esc(s.example)}</div>` : ''}</li>`)
    .join('')

  const weaknesses = (report.weaknesses || [])
    .map((s) => `<li><div class="pt bad">✘ ${esc(s.point)}</div>${s.example ? `<div class="ex">实例：${esc(s.example)}</div>` : ''}</li>`)
    .join('')

  const improvements = (report.improvements || [])
    .map((im) => {
      const links = (im.courseSlugs || [])
        .map((slug) => {
          const c = findCourse(slug)
          if (!c) return ''
          return `<a class="course-link" href="${esc(courseUrl(slug))}" target="_blank" rel="noopener">📘 ${esc(c.meta.title)}</a>`
        })
        .filter(Boolean)
        .join('')
      return `<li><div class="imp-topic">${esc(im.topic)}</div><div class="imp-detail">${esc(im.detail)}</div>${links ? `<div class="imp-links">${links}</div>` : ''}</li>`
    })
    .join('')

  const recs = (report.recommendedCourses || [])
    .map((r) => {
      const c = findCourse(r.slug)
      if (!c) return ''
      return `<a class="rec-card" href="${esc(courseUrl(r.slug))}" target="_blank" rel="noopener">
        <div class="rec-cover">${esc(c.meta.cover || '📘')}</div>
        <div class="rec-body"><div class="rec-title">${esc(c.meta.title)}</div><div class="rec-reason">${esc(r.reason || c.meta.shortTitle || '')}</div></div>
      </a>`
    })
    .filter(Boolean)
    .join('')

  const skillsLine = (cfg.skills || []).map(esc).join('、')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>面试评估报告 · ${esc(pos ? pos.title : '')}</title>
<style>
  :root { --ink:#14171f; --soft:#454c59; --faint:#878e9c; --border:#e6e8ec; --bg:#fff; --sub:#f6f7f9; --accent:#4f46e5; }
  * { box-sizing: border-box; }
  body { margin:0; background:#eef0f4; color:var(--ink); font-family:-apple-system,'Segoe UI','Noto Sans SC',system-ui,sans-serif; line-height:1.7; }
  .sheet { max-width:880px; margin:32px auto; background:var(--bg); border-radius:16px; box-shadow:0 12px 40px rgba(20,23,31,.12); overflow:hidden; }
  .head { padding:34px 40px; background:linear-gradient(120deg,#4f46e5,#7c3aed); color:#fff; }
  .head h1 { margin:0 0 6px; font-size:1.6rem; }
  .head .meta { font-size:.9rem; opacity:.9; }
  .body { padding:32px 40px; }
  .grade-box { display:flex; align-items:center; gap:24px; padding:22px 26px; border-radius:14px; background:var(--sub); border:1px solid var(--border); margin-bottom:28px; }
  .grade-badge { width:92px; height:92px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:800; color:#fff; flex-shrink:0; }
  .grade-info .glabel { font-size:1.2rem; font-weight:700; }
  .grade-info .gdesc { color:var(--soft); font-size:.92rem; margin-top:4px; }
  .grade-info .greason { margin-top:10px; font-size:.92rem; }
  h2 { font-size:1.15rem; margin:30px 0 12px; padding-left:12px; border-left:4px solid var(--accent); }
  .summary { background:var(--sub); border-radius:10px; padding:16px 18px; font-size:.95rem; }
  table { width:100%; border-collapse:collapse; font-size:.92rem; }
  th,td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:top; }
  th { background:var(--sub); font-size:.82rem; color:var(--soft); }
  .dim-name { font-weight:700; white-space:nowrap; }
  .dim-score { white-space:nowrap; } .stars { color:#f5a623; letter-spacing:1px; }
  ul.list { list-style:none; padding:0; margin:0; }
  ul.list li { padding:12px 0; border-bottom:1px dashed var(--border); }
  .pt { font-weight:700; } .pt.good { color:#0e835a; } .pt.bad { color:#c0344d; }
  .ex { color:var(--soft); font-size:.9rem; margin-top:4px; padding-left:18px; border-left:2px solid var(--border); }
  .imp-topic { font-weight:700; }
  .imp-detail { color:var(--soft); font-size:.92rem; margin:4px 0; }
  .imp-links, .recs { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
  .course-link { display:inline-block; padding:5px 12px; background:#eef0fe; color:#4338ca; border:1px solid #c7cbf7; border-radius:999px; font-size:.84rem; text-decoration:none; }
  .course-link:hover { background:#4f46e5; color:#fff; }
  .recs { margin-top:12px; }
  .rec-card { display:flex; gap:12px; align-items:center; width:calc(50% - 6px); padding:12px 14px; border:1px solid var(--border); border-radius:12px; text-decoration:none; color:inherit; }
  .rec-card:hover { border-color:var(--accent); box-shadow:0 4px 14px rgba(20,23,31,.08); }
  .rec-cover { font-size:1.8rem; } .rec-title { font-weight:700; font-size:.95rem; } .rec-reason { color:var(--soft); font-size:.84rem; }
  .foot { padding:20px 40px; color:var(--faint); font-size:.82rem; border-top:1px solid var(--border); text-align:center; }
  @media print { body{background:#fff;} .sheet{box-shadow:none; margin:0;} }
  @media (max-width:640px){ .rec-card{width:100%;} .body,.head,.foot{padding-left:20px;padding-right:20px;} }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <h1>面试评估报告</h1>
      <div class="meta">岗位：${esc(pos ? pos.title : cfg.position)} ｜ 考察技能：${skillsLine || '—'} ｜ 生成时间：${esc(dateStr)}</div>
    </div>
    <div class="body">
      <div class="grade-box">
        <div class="grade-badge" style="background:${gm.color}">${esc(report.grade)}</div>
        <div class="grade-info">
          <div class="glabel" style="color:${gm.color}">${esc(gm.label)}</div>
          <div class="gdesc">${esc(gm.desc)}</div>
          <div class="greason">${esc(report.gradeReason)}</div>
        </div>
      </div>

      <h2>整体评价</h2>
      <div class="summary">${esc(report.overallSummary)}</div>

      <h2>分维度评估</h2>
      <table><thead><tr><th>维度</th><th>评分</th><th>结合实例的点评</th></tr></thead><tbody>${dims}</tbody></table>

      <h2>亮点</h2>
      <ul class="list">${strengths || '<li>（无）</li>'}</ul>

      <h2>不足</h2>
      <ul class="list">${weaknesses || '<li>（无）</li>'}</ul>

      <h2>后续需要加强的知识 / 技能</h2>
      <ul class="list">${improvements || '<li>（无）</li>'}</ul>

      ${recs ? `<h2>推荐课程</h2><div class="recs">${recs}</div>` : ''}
    </div>
    <div class="foot">本报告由「编程学习站 · 面试模拟」基于本次面试问答自动生成，仅供学习参考。</div>
  </div>
</body>
</html>`
}

// 触发下载 HTML 文件
export function downloadHtml(html, filename = '面试评估报告.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// 在新窗口打开 HTML
export function openHtml(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
