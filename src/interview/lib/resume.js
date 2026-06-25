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
