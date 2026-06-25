import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlatformLayout from '../platform/PlatformLayout.jsx'
import CodeEditor from './components/CodeEditor.jsx'
import { chatStream, chatOnce, getInterviewConfig, synthesizeSpeech } from './lib/api.js'
import { loadConfig, buildSystemPrompt, STAGES } from './lib/session.js'
import {
  buildReportPrompt, parseReport, renderReportHtml, downloadHtml, openHtml, gradeMeta,
} from './lib/report.js'
import {
  createBrowserSpeaker, createCloudSpeaker, createRecognizer,
  sttSupported, ttsSupported, listZhVoices,
} from './lib/speech.js'
import { randomProblem } from './data/codingProblems.js'
import { findPosition } from './data/positions.js'

function fmtTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function InterviewSession() {
  const navigate = useNavigate()
  const cfg = loadConfig()

  const [messages, setMessages] = useState([]) // 含 system 的完整对话
  const [streaming, setStreaming] = useState('') // 面试官正在输出的增量文本
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')

  const [stage, setStage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)

  const [listening, setListening] = useState(false)
  const [voiceOn, setVoiceOn] = useState(cfg?.voice !== false)
  const [ttsMode, setTtsMode] = useState('browser') // 'cloud' | 'browser'
  const [zhVoices, setZhVoices] = useState([])
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem('interview.voiceURI') || '')

  const [showCoding, setShowCoding] = useState(false)
  const [problem, setProblem] = useState(null)

  // 评分报告
  const [reportState, setReportState] = useState('idle') // idle | loading | ready | error
  const [report, setReport] = useState(null)
  const [reportHtml, setReportHtml] = useState('')
  const [reportErr, setReportErr] = useState('')

  const speakerRef = useRef(null)
  const recRef = useRef(null)
  const ttsBufRef = useRef('') // TTS 按句朗读的缓冲
  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  // 无配置则回设置页
  useEffect(() => {
    if (!cfg) navigate('/interview', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 初始化语音：优先用服务端配置的云端神经 TTS（接近 ChatGPT 的自然人声），
  // 未配置则回退到浏览器内置 TTS。
  useEffect(() => {
    let disposed = false
    getInterviewConfig()
      .then((c) => {
        if (disposed) return
        if (c?.ttsConfigured) {
          speakerRef.current = createCloudSpeaker({ synthesize: synthesizeSpeech })
          setTtsMode('cloud')
        } else if (ttsSupported()) {
          speakerRef.current = createBrowserSpeaker({ lang: 'zh-CN' })
          setTtsMode('browser')
        }
        if (speakerRef.current) {
          speakerRef.current.setEnabled(voiceOn)
          if (voiceURI) speakerRef.current.setVoiceURI(voiceURI)
        }
      })
      .catch(() => {
        if (disposed) return
        if (ttsSupported()) { speakerRef.current = createBrowserSpeaker({ lang: 'zh-CN' }); speakerRef.current.setEnabled(voiceOn) }
      })
    return () => { disposed = true; speakerRef.current && speakerRef.current.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 浏览器音色列表（异步加载，监听 voiceschanged）
  useEffect(() => {
    if (!ttsSupported()) return
    const load = () => setZhVoices(listZhVoices())
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load)
  }, [])

  useEffect(() => {
    if (speakerRef.current) speakerRef.current.setEnabled(voiceOn)
  }, [voiceOn])

  const onPickVoice = (uri) => {
    setVoiceURI(uri)
    localStorage.setItem('interview.voiceURI', uri || '')
    if (speakerRef.current) speakerRef.current.setVoiceURI(uri)
  }

  // 计时器
  useEffect(() => {
    if (!started) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [started])

  // 自动滚动到底
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streaming])

  // TTS：把流式增量按句子朗读
  const feedTTS = (delta) => {
    if (!voiceOn || !speakerRef.current) return
    ttsBufRef.current += delta
    const buf = ttsBufRef.current
    const m = buf.match(/^[\s\S]*[。！？.!?；;\n]/)
    if (m) {
      speakerRef.current.speak(m[0])
      ttsBufRef.current = buf.slice(m[0].length)
    }
  }
  const flushTTS = () => {
    if (voiceOn && speakerRef.current && ttsBufRef.current.trim()) {
      speakerRef.current.speak(ttsBufRef.current)
    }
    ttsBufRef.current = ''
  }

  // 跑一轮：给定完整历史（含 system），流式获取面试官回复并落库
  const runTurn = async (history) => {
    setBusy(true)
    setError('')
    setStreaming('')
    ttsBufRef.current = ''
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const full = await chatStream(
        { messages: history },
        (delta) => { setStreaming((s) => s + delta); feedTTS(delta) },
        ac.signal,
      )
      flushTTS()
      setMessages([...history, { role: 'assistant', content: full }])
      setStreaming('')
    } catch (e) {
      if (e?.name !== 'AbortError') setError(String(e?.message || e))
      setStreaming('')
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  // 开始面试：构建 system prompt 并让面试官开场
  const beginInterview = async () => {
    const sys = { role: 'system', content: buildSystemPrompt(cfg) }
    setStarted(true)
    await runTurn([sys])
  }

  // 发送候选人的一段话
  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || busy) return
    if (speakerRef.current) speakerRef.current.stop()
    setInput('')
    const history = [...messages, { role: 'user', content }]
    setMessages(history)
    await runTurn(history)
  }

  // 语音识别开关
  const toggleMic = () => {
    if (!sttSupported()) {
      setError('当前浏览器不支持语音识别，请用 Chrome / Edge，或直接打字作答')
      return
    }
    if (listening) {
      recRef.current && recRef.current.stop()
      return
    }
    if (speakerRef.current) speakerRef.current.stop()
    const rec = createRecognizer({
      lang: 'zh-CN',
      onResult: (t, isFinal) => {
        if (isFinal) setInput((prev) => (prev ? prev + ' ' : '') + t)
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    })
    if (!rec) return
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  // 进入编程考察
  const enterCoding = () => {
    if (!problem) setProblem(randomProblem())
    setShowCoding(true)
    setStage(4)
  }

  // 提交代码给面试官点评
  const submitCode = async ({ language, source }) => {
    const msg = `（编程环节）题目：${problem?.title}\n我用 ${language === 'java' ? 'Java' : 'Python'} 作答，代码如下：\n\n\`\`\`${language}\n${source}\n\`\`\`\n\n请点评我的思路、时间/空间复杂度和边界处理，并指出可以改进的地方。`
    await send(msg)
  }

  // 请面试官总结
  const askSummary = async () => {
    await send('面试官您好，本次面试到这里，麻烦您对我今天的整体表现做一个总结评价：包括优点、不足，以及针对性的提升建议。')
  }

  const stop = () => {
    if (abortRef.current) abortRef.current.abort()
    if (speakerRef.current) speakerRef.current.stop()
  }

  // 结束面试，生成评分报告（A/B/C/D/E + 结合实例的理由 + 提升建议 + 课程推荐）
  const generateReport = async () => {
    if (speakerRef.current) speakerRef.current.stop()
    if (messages.filter((m) => m.role !== 'system').length < 2) {
      setReportErr('面试内容太少，请先进行面试再生成报告')
      setReportState('error')
      return
    }
    setReportState('loading')
    setReportErr('')
    try {
      const history = [...messages, { role: 'user', content: buildReportPrompt(cfg) }]
      const text = await chatOnce({ messages: history })
      const parsed = parseReport(text)
      const html = renderReportHtml(parsed, cfg)
      setReport(parsed)
      setReportHtml(html)
      setReportState('ready')
    } catch (e) {
      setReportErr('生成报告失败：' + String(e?.message || e))
      setReportState('error')
    }
  }

  if (!cfg) return null
  const pos = findPosition(cfg.position)
  const visible = messages.filter((m) => m.role !== 'system')

  return (
    <PlatformLayout>
      <div className="container iv-session">
        {/* 顶部状态条 */}
        <div className="iv-bar">
          <div className="iv-bar-left">
            <span className="iv-bar-title">模拟面试 · {pos ? pos.title : ''}</span>
            <span className="iv-timer">⏱ {fmtTime(elapsed)}</span>
          </div>
          <div className="iv-bar-right">
            {(ttsMode === 'cloud' || ttsSupported()) && (
              <button
                className={`iv-pill ${voiceOn ? 'on' : ''}`}
                onClick={() => setVoiceOn((v) => !v)}
                title="面试官语音朗读"
              >
                {voiceOn ? '🔊 语音开' : '🔇 语音关'}
              </button>
            )}
            {ttsMode === 'cloud' ? (
              <span className="iv-pill on" title="使用云端神经语音">✨ 自然语音</span>
            ) : (
              voiceOn && zhVoices.length > 0 && (
                <select
                  className="iv-voice-select"
                  value={voiceURI}
                  onChange={(e) => onPickVoice(e.target.value)}
                  title="选择语音音色（建议选带 Google/在线/Natural 的更自然）"
                >
                  <option value="">默认音色（自动挑最优）</option>
                  {zhVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}{v.local ? '（本地）' : '（在线）'}
                    </option>
                  ))}
                </select>
              )
            )}
            <button className="btn btn-ghost ce-small" onClick={() => navigate('/interview')}>退出</button>
          </div>
        </div>

        {/* 阶段进度 */}
        <div className="iv-stages">
          {STAGES.map((s, i) => (
            <button
              key={s.id}
              className={`iv-stage ${i === stage ? 'active' : ''} ${i < stage ? 'done' : ''}`}
              onClick={() => { setStage(i); if (s.id === 'coding') enterCoding() }}
              title={`${s.desc} · 约${s.minutes}分钟`}
            >
              <span className="iv-stage-no">{i + 1}</span>
              <span className="iv-stage-name">{s.title}</span>
              <span className="iv-stage-min">{s.minutes}min</span>
            </button>
          ))}
        </div>

        <div className={`iv-main ${showCoding ? 'with-code' : ''}`}>
          {/* 对话区 */}
          <div className="iv-chat-col">
            {!started ? (
              <div className="iv-prestart">
                <p>准备好了吗？点击下方按钮，面试官将先做自我介绍并请你介绍自己。</p>
                <p className="iv-sub">全程约 1 小时，建议在安静环境、用 Chrome/Edge 浏览器以获得最佳语音体验。</p>
                <button className="btn btn-primary iv-start" onClick={beginInterview} disabled={busy}>
                  {busy ? '面试官准备中…' : '开始面试'}
                </button>
              </div>
            ) : (
              <>
                <div className="iv-messages" ref={scrollRef}>
                  {visible.map((m, i) => (
                    <div key={i} className={`iv-msg ${m.role}`}>
                      <div className="iv-msg-who">{m.role === 'assistant' ? '面试官' : '我'}</div>
                      <div className="iv-msg-body">{m.content}</div>
                    </div>
                  ))}
                  {streaming && (
                    <div className="iv-msg assistant">
                      <div className="iv-msg-who">面试官</div>
                      <div className="iv-msg-body">{streaming}<span className="iv-caret">▍</span></div>
                    </div>
                  )}
                  {busy && !streaming && (
                    <div className="iv-msg assistant"><div className="iv-msg-who">面试官</div><div className="iv-msg-body iv-thinking">思考中…</div></div>
                  )}
                </div>

                {error && <div className="iv-error">{error}</div>}

                {/* 输入区 */}
                <div className="iv-input-area">
                  <textarea
                    className="iv-answer"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send() } }}
                    placeholder={listening ? '正在聆听，请说话…（识别结果会填到这里）' : '输入你的回答，或点麦克风语音作答（Ctrl/⌘+Enter 发送）'}
                    rows={3}
                    disabled={busy}
                  />
                  <div className="iv-input-actions">
                    <button
                      className={`iv-mic ${listening ? 'on' : ''}`}
                      onClick={toggleMic}
                      disabled={busy}
                      title="语音作答"
                    >
                      {listening ? '● 停止录音' : '🎤 语音'}
                    </button>
                    <div className="iv-spacer" />
                    {busy && <button className="btn btn-ghost ce-small" onClick={stop}>停止</button>}
                    <button className="btn btn-primary" onClick={() => send()} disabled={busy || !input.trim()}>发送</button>
                  </div>
                  <div className="iv-quick">
                    <button className="iv-quick-btn" onClick={enterCoding} disabled={busy}>进入编程环节 ⌨️</button>
                    <button className="iv-quick-btn" onClick={askSummary} disabled={busy}>请面试官总结评价</button>
                    <button className="iv-quick-btn primary" onClick={generateReport} disabled={busy || reportState === 'loading'}>
                      {reportState === 'loading' ? '正在生成报告…' : '结束并生成评分报告 📄'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 编程区 */}
          {showCoding && (
            <div className="iv-code-col">
              <div className="iv-problem">
                <div className="iv-problem-head">
                  <h3>{problem?.title} <span className={`iv-diff ${problem?.difficulty}`}>{problem?.difficulty}</span></h3>
                  <button className="iv-quick-btn" onClick={() => setProblem(randomProblem())}>换一题</button>
                </div>
                <div className="iv-problem-tags">{(problem?.tags || []).map((t) => <span key={t} className="iv-tag">{t}</span>)}</div>
                <pre className="iv-problem-body">{problem?.statement}</pre>
                {problem?.sampleInput != null && (
                  <div className="iv-sample">
                    <div><strong>示例输入</strong><pre>{problem.sampleInput}</pre></div>
                    <div><strong>示例输出</strong><pre>{problem.sampleOutput}</pre></div>
                  </div>
                )}
              </div>
              <CodeEditor key={problem?.id} initialLang="python" onSubmit={submitCode} />
            </div>
          )}
        </div>

        {/* 评分报告弹窗 */}
        {(reportState === 'ready' || reportState === 'error' || reportState === 'loading') && (
          <div className="iv-modal-mask" onClick={() => reportState !== 'loading' && setReportState('idle')}>
            <div className="iv-modal" onClick={(e) => e.stopPropagation()}>
              {reportState === 'loading' && (
                <div className="iv-modal-loading">
                  <div className="iv-spin" />
                  <p>面试评估官正在结合本次问答为你打分、撰写报告…</p>
                </div>
              )}
              {reportState === 'error' && (
                <div className="iv-modal-body">
                  <h3>生成失败</h3>
                  <div className="iv-error">{reportErr}</div>
                  <div className="iv-modal-actions">
                    <button className="btn btn-ghost" onClick={() => setReportState('idle')}>关闭</button>
                    <button className="btn btn-primary" onClick={generateReport}>重试</button>
                  </div>
                </div>
              )}
              {reportState === 'ready' && report && (
                <div className="iv-modal-body">
                  <div className="iv-report-grade">
                    <div className="iv-grade-badge" style={{ background: gradeMeta(report.grade).color }}>{report.grade}</div>
                    <div>
                      <div className="iv-grade-label" style={{ color: gradeMeta(report.grade).color }}>{gradeMeta(report.grade).label}</div>
                      <div className="iv-grade-desc">{gradeMeta(report.grade).desc}</div>
                    </div>
                  </div>
                  <p className="iv-report-reason">{report.gradeReason}</p>
                  <p className="iv-report-summary">{report.overallSummary}</p>
                  <p className="iv-sub">完整报告（含分维度评分、结合实例的亮点与不足、提升建议与课程推荐）可下载或在新窗口查看：</p>
                  <div className="iv-modal-actions">
                    <button className="btn btn-ghost" onClick={() => setReportState('idle')}>关闭</button>
                    <button className="btn btn-ghost" onClick={() => openHtml(reportHtml)}>在新窗口打开</button>
                    <button className="btn btn-primary" onClick={() => downloadHtml(reportHtml, `面试评估报告_${report.grade}.html`)}>下载 HTML 报告</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  )
}
