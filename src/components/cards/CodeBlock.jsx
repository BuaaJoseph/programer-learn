import { useState } from 'react'

const KEYWORDS = new Set([
  // python
  'def', 'class', 'return', 'import', 'from', 'as', 'if', 'elif', 'else', 'for',
  'while', 'in', 'not', 'and', 'or', 'is', 'with', 'try', 'except', 'finally',
  'raise', 'yield', 'lambda', 'pass', 'break', 'continue', 'None', 'True', 'False',
  'async', 'await', 'global', 'assert', 'del',
  // js / ts
  'const', 'let', 'var', 'function', 'new', 'typeof', 'instanceof', 'void',
  'this', 'null', 'undefined', 'true', 'false', 'export', 'default', 'extends',
  'switch', 'case', 'throw', 'of', 'do',
])

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 轻量语法高亮：关键字紫、字符串绿、注释灰、数字橙。逐行处理，先抠出注释与字符串。
function highlightLine(line) {
  let out = ''
  let i = 0
  const n = line.length
  while (i < n) {
    const ch = line[i]
    // 注释 # 或 //
    if (ch === '#' || (ch === '/' && line[i + 1] === '/')) {
      out += `<span class="tok-com">${escapeHtml(line.slice(i))}</span>`
      break
    }
    // 字符串
    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < n && line[j] !== ch) {
        if (line[j] === '\\') j++
        j++
      }
      const str = line.slice(i, Math.min(j + 1, n))
      out += `<span class="tok-str">${escapeHtml(str)}</span>`
      i = j + 1
      continue
    }
    // 标识符 / 关键字
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1
      while (j < n && /[A-Za-z0-9_$]/.test(line[j])) j++
      const word = line.slice(i, j)
      if (KEYWORDS.has(word)) {
        out += `<span class="tok-kw">${escapeHtml(word)}</span>`
      } else if (line[j] === '(') {
        out += `<span class="tok-fn">${escapeHtml(word)}</span>`
      } else {
        out += escapeHtml(word)
      }
      i = j
      continue
    }
    // 数字
    if (/[0-9]/.test(ch)) {
      let j = i + 1
      while (j < n && /[0-9._]/.test(line[j])) j++
      out += `<span class="tok-num">${escapeHtml(line.slice(i, j))}</span>`
      i = j
      continue
    }
    out += escapeHtml(ch)
    i++
  }
  return out
}

function highlight(code) {
  return code.split('\n').map(highlightLine).join('\n')
}

export default function CodeBlock({ lang = 'text', title, code = '' }) {
  const [copied, setCopied] = useState(false)
  const text = typeof code === 'string' ? code.replace(/^\n/, '').replace(/\s+$/, '') : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span className="dots">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span className="codeblock-title">{title || lang}</span>
        <button className="copy-btn" onClick={copy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlight(text) }} />
      </pre>
    </div>
  )
}
