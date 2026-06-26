// 服务端渲染面试评估报告 HTML（含完整对话记录），以及报告通知邮件正文。
// 课程链接用前端传来的 courses 列表解析（slug -> title/cover），站点地址用 PUBLIC_SITE_URL。

const SITE = (process.env.PUBLIC_SITE_URL || 'https://learn.aihaven.site').replace(/\/+$/, '')

const GRADES = {
  A: { label: 'A · 非常满意', color: '#0e835a', desc: '语言表达、项目、技术与 Coding 近乎完美，正是公司需要的人才（极难获得）' },
  B: { label: 'B · 优秀人才', color: '#2563eb', desc: '整体优秀，个别方面略有差距，强烈推荐给后续面试官' },
  C: { label: 'C · 通过面试', color: '#b26a09', desc: '项目与技术基础扎实，可继续推进，但缺少特别亮眼的表现' },
  D: { label: 'D · 未通过（可荐他岗）', color: '#c0344d', desc: '部分方面欠缺，本岗位不再推进，其他岗位可继续面试' },
  E: { label: 'E · 不可行', color: '#7a1326', desc: '一个或多个方面表现很差，短期内不建议推进其他岗位' },
}
export function gradeMeta(g) { return GRADES[g] || { label: g || '—', color: '#454c59', desc: '' } }

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function stars(score) {
  const n = Math.max(0, Math.min(5, Number(score) || 0))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

export function courseUrl(slug) { return `${SITE}/course/${slug}` }

// report: 模型产出的结构化评估；meta: {positionTitle, skills[], dateStr}; conversation: [{role,content}]
// courses: [{slug,title,cover}]（用于解析推荐课程链接）
export function renderReportHtml(report, meta, conversation = [], courses = []) {
  const courseMap = {}
  for (const c of courses || []) courseMap[c.slug] = c
  const gm = gradeMeta(report.grade)

  const dims = (report.dimensions || []).map((d) => `<tr>
      <td class="dim-name">${esc(d.name)}</td>
      <td class="dim-score"><span class="stars">${stars(d.score)}</span> <b>${esc(d.score)}</b>/5</td>
      <td class="dim-comment">${esc(d.comment)}</td>
    </tr>`).join('')

  const strengths = (report.strengths || [])
    .map((s) => `<li><div class="pt good">✔ ${esc(s.point)}</div>${s.example ? `<div class="ex">实例：${esc(s.example)}</div>` : ''}</li>`).join('')
  const weaknesses = (report.weaknesses || [])
    .map((s) => `<li><div class="pt bad">✘ ${esc(s.point)}</div>${s.example ? `<div class="ex">实例：${esc(s.example)}</div>` : ''}</li>`).join('')

  const improvements = (report.improvements || []).map((im) => {
    const links = (im.courseSlugs || []).map((slug) => {
      const c = courseMap[slug]
      if (!c) return ''
      return `<a class="course-link" href="${esc(courseUrl(slug))}" target="_blank" rel="noopener">📘 ${esc(c.title)}</a>`
    }).filter(Boolean).join('')
    return `<li><div class="imp-topic">${esc(im.topic)}</div><div class="imp-detail">${esc(im.detail)}</div>${links ? `<div class="imp-links">${links}</div>` : ''}</li>`
  }).join('')

  const recs = (report.recommendedCourses || []).map((r) => {
    const c = courseMap[r.slug]
    if (!c) return ''
    return `<a class="rec-card" href="${esc(courseUrl(r.slug))}" target="_blank" rel="noopener">
      <div class="rec-cover">${esc(c.cover || '📘')}</div>
      <div class="rec-body"><div class="rec-title">${esc(c.title)}</div><div class="rec-reason">${esc(r.reason || '')}</div></div>
    </a>`
  }).filter(Boolean).join('')

  const convo = (conversation || []).map((m) => {
    const who = m.role === 'assistant' ? '面试官' : '我'
    return `<div class="cv-msg ${m.role === 'assistant' ? 'a' : 'u'}"><div class="cv-who">${who}</div><div class="cv-body">${esc(m.content)}</div></div>`
  }).join('')

  const skillsLine = (meta.skills || []).map(esc).join('、')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>面试评估报告 · ${esc(meta.positionTitle || '')}</title>
<style>
  :root { --ink:#14171f; --soft:#454c59; --faint:#878e9c; --border:#e6e8ec; --bg:#fff; --sub:#f6f7f9; --accent:#4f46e5; }
  * { box-sizing: border-box; }
  body { margin:0; background:#eef0f4; color:var(--ink); font-family:-apple-system,'Segoe UI','Noto Sans SC',system-ui,sans-serif; line-height:1.7; }
  .sheet { max-width:880px; margin:32px auto; background:var(--bg); border-radius:16px; box-shadow:0 12px 40px rgba(20,23,31,.12); overflow:hidden; }
  .head { padding:34px 40px; background:linear-gradient(120deg,#4f46e5,#7c3aed); color:#fff; }
  .head h1 { margin:0 0 6px; font-size:1.6rem; }
  .head .meta { font-size:.9rem; opacity:.92; }
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
  .recs { margin-top:12px; }
  .rec-card { display:flex; gap:12px; align-items:center; width:calc(50% - 6px); padding:12px 14px; border:1px solid var(--border); border-radius:12px; text-decoration:none; color:inherit; }
  .rec-cover { font-size:1.8rem; } .rec-title { font-weight:700; font-size:.95rem; } .rec-reason { color:var(--soft); font-size:.84rem; }
  .cv { margin-top:8px; }
  .cv-msg { margin:12px 0; max-width:88%; }
  .cv-msg.a { margin-right:auto; } .cv-msg.u { margin-left:auto; }
  .cv-who { font-size:.74rem; color:var(--faint); margin-bottom:3px; }
  .cv-msg.u .cv-who { text-align:right; }
  .cv-body { white-space:pre-wrap; word-break:break-word; padding:10px 14px; border-radius:12px; font-size:.92rem; }
  .cv-msg.a .cv-body { background:var(--sub); border:1px solid var(--border); border-top-left-radius:4px; }
  .cv-msg.u .cv-body { background:var(--accent); color:#fff; border-top-right-radius:4px; }
  .foot { padding:20px 40px; color:var(--faint); font-size:.82rem; border-top:1px solid var(--border); text-align:center; }
  @media print { body{background:#fff;} .sheet{box-shadow:none; margin:0;} }
  @media (max-width:640px){ .rec-card{width:100%;} .body,.head,.foot{padding-left:20px;padding-right:20px;} .cv-msg{max-width:100%;} }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <h1>面试评估报告</h1>
      <div class="meta">岗位：${esc(meta.positionTitle || '')} ｜ 考察技能：${skillsLine || '—'} ｜ 生成时间：${esc(meta.dateStr || '')}</div>
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

      <h2>完整面试对话记录</h2>
      <div class="cv">${convo || '<p class="gdesc">（无对话记录）</p>'}</div>
    </div>
    <div class="foot">本报告由「编程学习站 · 面试模拟」基于本次面试问答自动生成，仅供学习参考。</div>
  </div>
</body>
</html>`
}

// 报告完成通知邮件（含下载链接与站内查看链接）。
export function buildReportEmail({ positionTitle, grade, downloadUrl }) {
  const viewUrl = `${SITE}/me/interviews`
  const gm = gradeMeta(grade)
  const subject = `【编程学习站】你的面试报告已生成（${grade || '评估'}）`
  const text = `你好，\n\n你的「${positionTitle || ''}」模拟面试报告已生成。\n评级：${gm.label}\n\n下载报告：${downloadUrl}\n站内查看（个人中心）：${viewUrl}\n\n报告含完整对话记录，仅供学习参考。`
  const html = `<div style="font-family:-apple-system,'Segoe UI','Noto Sans SC',sans-serif;line-height:1.7;color:#14171f">
    <p>你好，</p>
    <p>你的「<b>${esc(positionTitle || '')}</b>」模拟面试报告已生成。</p>
    <p>评级：<b style="color:${gm.color}">${esc(gm.label)}</b></p>
    <p style="margin:20px 0">
      <a href="${esc(downloadUrl)}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;margin-right:10px">下载报告</a>
      <a href="${esc(viewUrl)}" style="display:inline-block;padding:10px 18px;background:#eef0fe;color:#4338ca;border:1px solid #c7cbf7;border-radius:8px;text-decoration:none">在个人中心查看</a>
    </p>
    <p style="color:#878e9c;font-size:13px">报告含完整对话记录，仅供学习参考。</p>
  </div>`
  return { subject, text, html }
}
