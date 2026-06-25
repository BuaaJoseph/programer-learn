import { useEffect, useMemo, useRef, useState } from 'react'
import { runCode } from '../lib/api.js'
import { CODE_TEMPLATES } from '../data/codingProblems.js'

// 各语言的「基础库联想」词表：关键字 + 常用标准库 API。
// 这是一个轻量自动联想（非完整 LSP），随输入实时提示并可回车/Tab 补全。
const COMPLETIONS = {
  python: [
    'print(', 'input(', 'len(', 'range(', 'int(', 'str(', 'float(', 'list(', 'dict(',
    'set(', 'tuple(', 'sorted(', 'reversed(', 'enumerate(', 'zip(', 'map(', 'filter(',
    'sum(', 'min(', 'max(', 'abs(', 'round(', 'any(', 'all(', 'isinstance(',
    'append(', 'extend(', 'insert(', 'pop(', 'remove(', 'sort(', 'split(', 'join(',
    'strip(', 'replace(', 'startswith(', 'endswith(', 'find(', 'format(', 'keys(',
    'values(', 'items(', 'get(', 'setdefault(',
    'def ', 'class ', 'return ', 'import ', 'from ', 'for ', 'while ', 'if ', 'elif ',
    'else:', 'try:', 'except ', 'finally:', 'with ', 'lambda ', 'yield ', 'global ',
    'collections', 'defaultdict(', 'Counter(', 'deque(', 'heapq', 'heappush(',
    'heappop(', 'heapify(', 'bisect', 'bisect_left(', 'bisect_right(', 'itertools',
    'functools', 'lru_cache', 'math', 'sys.stdin', 'sys.stdin.read(',
  ],
  java: [
    'public ', 'private ', 'protected ', 'static ', 'final ', 'void ', 'class ',
    'interface ', 'extends ', 'implements ', 'return ', 'new ', 'import ', 'package ',
    'if ', 'else ', 'for ', 'while ', 'switch ', 'case ', 'break;', 'continue;',
    'try ', 'catch ', 'finally ', 'throw ', 'throws ',
    'int ', 'long ', 'double ', 'float ', 'boolean ', 'char ', 'byte ', 'short ',
    'String ', 'Integer', 'Long', 'Double', 'Boolean', 'Character', 'Math.',
    'System.out.println(', 'System.out.print(', 'System.out.printf(',
    'List<', 'ArrayList<', 'LinkedList<', 'Map<', 'HashMap<', 'TreeMap<',
    'Set<', 'HashSet<', 'TreeSet<', 'Queue<', 'Deque<', 'ArrayDeque<',
    'PriorityQueue<', 'Stack<', 'Collections.', 'Arrays.', 'Arrays.sort(',
    'Arrays.asList(', 'StringBuilder', 'append(', 'toString()', 'length()',
    'size()', 'add(', 'get(', 'put(', 'getOrDefault(', 'containsKey(',
    'contains(', 'remove(', 'poll(', 'offer(', 'peek(', 'push(', 'pop(',
    'BufferedReader', 'InputStreamReader', 'readLine()', 'split(',
    'Integer.parseInt(', 'Long.parseLong(', 'String.valueOf(', 'Math.max(',
    'Math.min(', 'Math.abs(',
  ],
}

// 取光标前最后一个「词」用于联想匹配。
function currentToken(text, caret) {
  const before = text.slice(0, caret)
  const m = before.match(/[A-Za-z_.][A-Za-z0-9_.]*$/)
  return m ? m[0] : ''
}

export default function CodeEditor({ initialLang = 'python', onSubmit }) {
  const [lang, setLang] = useState(initialLang)
  const [codeByLang, setCodeByLang] = useState({
    python: CODE_TEMPLATES.python,
    java: CODE_TEMPLATES.java,
  })
  const [stdin, setStdin] = useState('')
  const [output, setOutput] = useState('')
  const [isError, setIsError] = useState(false)
  const [running, setRunning] = useState(false)

  // 自动联想状态
  const [suggest, setSuggest] = useState({ open: false, items: [], index: 0 })
  const taRef = useRef(null)

  const code = codeByLang[lang]
  const setCode = (v) => setCodeByLang((m) => ({ ...m, [lang]: v }))

  const pool = useMemo(() => COMPLETIONS[lang] || [], [lang])

  const refreshSuggest = (text, caret) => {
    const tok = currentToken(text, caret)
    if (tok.length < 1) { setSuggest({ open: false, items: [], index: 0 }); return }
    const low = tok.toLowerCase()
    const items = pool
      .filter((w) => w.toLowerCase().startsWith(low) && w.toLowerCase() !== low)
      .slice(0, 8)
    setSuggest(items.length ? { open: true, items, index: 0 } : { open: false, items: [], index: 0 })
  }

  const applySuggest = (item) => {
    const el = taRef.current
    if (!el) return
    const caret = el.selectionStart
    const tok = currentToken(code, caret)
    const start = caret - tok.length
    const next = code.slice(0, start) + item + code.slice(caret)
    setCode(next)
    const pos = start + item.length
    setSuggest({ open: false, items: [], index: 0 })
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = pos
    })
  }

  const onChange = (e) => {
    setCode(e.target.value)
    refreshSuggest(e.target.value, e.target.selectionStart)
  }

  const onKeyDown = (e) => {
    // 联想浮层的键盘操作
    if (suggest.open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggest((s) => ({ ...s, index: (s.index + 1) % s.items.length })); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggest((s) => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length })); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggest(suggest.items[suggest.index]); return }
      if (e.key === 'Escape') { setSuggest({ open: false, items: [], index: 0 }); return }
    }
    // Tab 缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.target
      const s = el.selectionStart, en = el.selectionEnd
      const next = code.slice(0, s) + '    ' + code.slice(en)
      setCode(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4 })
    }
    // Ctrl/Cmd + Enter 运行
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!running) run()
    }
  }

  const run = async () => {
    setRunning(true)
    setIsError(false)
    setOutput('正在执行…')
    try {
      const res = await runCode({ language: lang, source: code, stdin })
      const out = res.output || res.stdout || ''
      const err = res.stderr || ''
      const combined = [out, err].filter(Boolean).join('\n')
      setIsError(!!err && !out)
      setOutput(combined || '（没有任何输出）')
    } catch (e) {
      setIsError(true)
      setOutput(String(e?.message || e))
    } finally {
      setRunning(false)
    }
  }

  const reset = () => setCode(CODE_TEMPLATES[lang])

  const rows = Math.max(14, code.split('\n').length + 1)

  return (
    <div className="code-editor">
      <div className="ce-tabs">
        {['python', 'java'].map((l) => (
          <button
            key={l}
            className={`ce-tab ${l === lang ? 'active' : ''}`}
            onClick={() => { setLang(l); setSuggest({ open: false, items: [], index: 0 }) }}
          >
            {l === 'python' ? 'Python' : 'Java'}
          </button>
        ))}
        <div className="ce-tab-actions">
          <button className="btn btn-ghost ce-small" onClick={reset} disabled={running}>重置模板</button>
          <button className="btn btn-primary ce-small" onClick={run} disabled={running}>
            {running ? '执行中…' : '▶ 运行'}
          </button>
        </div>
      </div>

      <div className="ce-editor-wrap">
        <textarea
          ref={taRef}
          className="ce-textarea"
          value={code}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setSuggest({ open: false, items: [], index: 0 }), 120)}
          spellCheck={false}
          rows={rows}
          aria-label="代码编辑器"
        />
        {suggest.open && (
          <ul className="ce-suggest">
            {suggest.items.map((it, i) => (
              <li
                key={it}
                className={i === suggest.index ? 'active' : ''}
                onMouseDown={(e) => { e.preventDefault(); applySuggest(it) }}
              >
                {it}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ce-io">
        <div className="ce-io-col">
          <label className="ce-label">标准输入（stdin，可留空）</label>
          <textarea
            className="ce-stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            spellCheck={false}
            rows={4}
            placeholder="把样例输入粘到这里，运行时会作为程序的标准输入"
          />
        </div>
        <div className="ce-io-col">
          <label className="ce-label">运行结果</label>
          <pre className={`ce-output${isError ? ' is-error' : ''}`}>{output || '（点击「运行」查看输出）'}</pre>
        </div>
      </div>

      <div className="ce-bottom">
        <span className="ce-hint">提示：输入时会出现基础库联想（↑↓ 选择，Enter/Tab 补全）；Ctrl/⌘ + Enter 运行。</span>
        {onSubmit && (
          <button
            className="btn btn-primary"
            onClick={() => onSubmit({ language: lang, source: code })}
          >
            提交给面试官点评
          </button>
        )}
      </div>
    </div>
  )
}
