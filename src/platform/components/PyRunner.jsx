import { useEffect, useRef, useState } from 'react'

// 浏览器内 Python 运行环境：基于 Pyodide（CPython 编译成 WebAssembly）。
// 首次运行时从 CDN 懒加载运行时（约几 MB，仅一次），之后完全在用户浏览器本地执行，
// 不需要任何后端。适合跑纯 Python 教学例子（变量、循环、函数、数据结构、面向对象等）。
// 说明：浏览器沙箱里没有真实网络与文件系统，调用大模型 API / requests 等联网示例无法在此运行。

const PYODIDE_VERSION = 'v0.26.4'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`

let pyodidePromise = null

// 全局只加载一次 Pyodide，所有 PyRunner 共享同一个解释器实例。
function loadPyodideOnce() {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'))
      return
    }
    const start = (loader) =>
      loader({ indexURL: PYODIDE_BASE })
        .then(async (py) => {
          // 用浏览器 prompt 实现 input()，让带输入的教学例子也能跑。
          await py.runPythonAsync(`
import builtins, js
def __web_input(prompt=""):
    v = js.window.prompt(prompt if prompt else "请输入：")
    return "" if v is None else v
builtins.input = __web_input
`)
          return py
        })
        .then(resolve)
        .catch(reject)

    if (window.loadPyodide) {
      start(window.loadPyodide)
      return
    }
    const s = document.createElement('script')
    s.src = `${PYODIDE_BASE}pyodide.js`
    s.onload = () => {
      if (window.loadPyodide) start(window.loadPyodide)
      else reject(new Error('Pyodide 加载失败'))
    }
    s.onerror = () => reject(new Error('无法加载 Python 运行环境（需要网络连接到 CDN）'))
    document.head.appendChild(s)
  })
  return pyodidePromise
}

export default function PyRunner({ initialCode = '', title = 'Python 在线运行', minLines = 6 }) {
  const seed = initialCode.replace(/^\n/, '').replace(/\s+$/, '')
  const [code, setCode] = useState(seed)
  const [output, setOutput] = useState('')
  const [isError, setIsError] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | running
  const taRef = useRef(null)

  useEffect(() => {
    setCode(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  const run = async () => {
    setIsError(false)
    setOutput('')
    let py
    try {
      setStatus('loading')
      py = await loadPyodideOnce()
    } catch (e) {
      setStatus('idle')
      setIsError(true)
      setOutput(String(e && e.message ? e.message : e))
      return
    }
    setStatus('running')
    let buf = ''
    try {
      py.setStdout({ batched: (s) => { buf += s + '\n' } })
      py.setStderr({ batched: (s) => { buf += s + '\n' } })
      await py.runPythonAsync(code)
      setOutput(buf.length ? buf : '（程序没有任何输出。试试用 print(...) 打印点什么？）')
      setIsError(false)
    } catch (e) {
      // 运行时异常：把已有 stdout 加上 Python 报错信息一起展示。
      setOutput((buf ? buf + '\n' : '') + String(e && e.message ? e.message : e))
      setIsError(true)
    } finally {
      try {
        py.setStdout({})
        py.setStderr({})
      } catch { /* ignore */ }
      setStatus('idle')
    }
  }

  const reset = () => {
    setCode(seed)
    setOutput('')
    setIsError(false)
  }

  // Tab 键插入 4 个空格（Python 缩进），而不是跳出输入框。
  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.target
      const s = el.selectionStart
      const en = el.selectionEnd
      const next = code.slice(0, s) + '    ' + code.slice(en)
      setCode(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 4
      })
    }
    // Ctrl/Cmd + Enter 运行
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (status === 'idle') run()
    }
  }

  const rows = Math.max(minLines, code.split('\n').length + 1)
  const busy = status !== 'idle'

  return (
    <div className="pyrunner">
      <div className="pyrunner-bar">
        <span className="dots"><i></i><i></i><i></i></span>
        <span className="pyrunner-title">{title}</span>
        <div className="pyrunner-actions">
          <button className="pyrunner-reset" onClick={reset} disabled={busy}>重置</button>
          <button className="pyrunner-run" onClick={run} disabled={busy}>
            {status === 'loading' ? '加载运行环境…' : status === 'running' ? '运行中…' : '▶ 运行'}
          </button>
        </div>
      </div>
      <textarea
        ref={taRef}
        className="pyrunner-editor"
        value={code}
        spellCheck={false}
        rows={rows}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Python 代码编辑器"
      />
      {(output || busy) && (
        <pre className={`pyrunner-output${isError ? ' is-error' : ''}`}>
          {status === 'loading'
            ? '正在加载 Python 运行环境（首次约需几秒，仅一次）…'
            : status === 'running'
              ? '运行中…'
              : output}
        </pre>
      )}
      <div className="pyrunner-hint">在浏览器本地运行（Pyodide）。提示：Tab 缩进，Ctrl/⌘ + Enter 运行。联网类示例（调用大模型 API 等）无法在此执行。</div>
    </div>
  )
}
