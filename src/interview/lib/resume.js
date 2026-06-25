// 简历附件解析：纯文本/Markdown 直接读取；PDF 用 CDN 懒加载的 pdf.js 提取文字。
// 复杂的 docx 不做深度解析（提示用户改用粘贴或 PDF）。
const PDFJS_VERSION = '4.7.76'
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/`

let pdfjsPromise = null
function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = import(/* @vite-ignore */ `${PDFJS_BASE}pdf.min.mjs`).then((mod) => {
    const pdfjs = mod.default || mod
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`
    return pdfjs
  })
  return pdfjsPromise
}

async function extractPdf(file) {
  const pdfjs = await loadPdfJs()
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return text.trim()
}

const API_BASE = (import.meta.env?.VITE_API_BASE || '') + '/api'

// 把 HTML 转成可读纯文本（去脚本/样式/标签，压缩空白）。
function htmlToText(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script, style, noscript, svg').forEach((el) => el.remove())
    const t = (doc.body ? doc.body.textContent : doc.textContent) || ''
    return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '')
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

// 经后端代理抓取简历链接并提取文字（支持 PDF / HTML / 纯文本）。
export async function fetchResumeFromUrl(url) {
  const res = await fetch(`${API_BASE}/interview/fetch-resume?url=${encodeURIComponent(url)}`)
  if (!res.ok) {
    let msg = `抓取失败 (${res.status})`
    try { const d = await res.json(); if (d?.message) msg = d.message } catch { /* ignore */ }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const ct = (blob.type || '').toLowerCase()
  if (ct.includes('pdf')) {
    const text = await extractPdf(blob)
    if (!text) throw new Error('该 PDF 没有可提取的文字（可能是扫描件），请改为粘贴简历内容')
    return text
  }
  const raw = await blob.text()
  if (ct.includes('html') || ct.includes('xml') || /^\s*<(!doctype|html)/i.test(raw)) {
    const text = htmlToText(raw)
    if (!text) throw new Error('未能从该网页提取到简历文字，请改为粘贴简历内容')
    return text
  }
  return raw.trim()
}

// 解析上传的简历文件，返回提取出的纯文本。失败时抛出友好错误。
export async function parseResumeFile(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return await extractPdf(file)
  }
  if (
    name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') ||
    (file.type && file.type.startsWith('text/'))
  ) {
    return (await file.text()).trim()
  }
  // 其它格式（doc/docx 等）尝试按文本读，多数会乱码——提示用户。
  throw new Error('暂不支持该格式的自动解析，请上传 PDF / TXT / Markdown，或直接粘贴简历内容')
}
