import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlatformLayout from '../platform/PlatformLayout.jsx'
import CodeEditor from './components/CodeEditor.jsx'
import { chatStream, getInterviewConfig, synthesizeSpeech, transcribeSpeech } from './lib/api.js'
import { loadConfig, buildSystemPrompt, STAGES, parseStageTag, STAGE_INDEX } from './lib/session.js'
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
  const [transcribing, setTranscribing] = useState(false)
  const [sttMode, setSttMode] = useState('browser') // 'cloud'(Whisper) | 'browser'
  const [voiceOn, setVoiceOn] = useState(cfg?.voice !== false)
  const [ttsMode, setTtsMode] = useState('browser') // 'cloud' | 'browser'
  const [zhVoices, setZhVoices] = useState([])
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem('interview.voiceURI') || '')
  const [rate, setRate] = useState(() => Number(localStorage.getItem('interview.rate')) || 1.15)

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
  const voiceOnRef = useRef(voiceOn)
  const voiceURIRef = useRef(voiceURI)
  const rateRef = useRef(rate)
  const mediaRecRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sttBaseRef = useRef('')      // 开始识别时输入框已有的文字
  const sttFinalRef = useRef('')     // 本次识别已确定（final）的文字
  const silenceTimerRef = useRef(null) // 停顿自动发送计时器

  // 云端 TTS 不可用时回退到浏览器内置语音（并提示，避免「以为没生效/还是女声」）
  const fallbackToBrowser = () => {
    setError('云端语音调用失败，已临时回退到浏览器语音（可能不是男声）。请到「面试模拟」设置页点「测试连通性」查看原因，多为 INTERVIEW_TTS_MODEL 不被中转支持，改成 tts-1 即可。')
    if (!ttsSupported()) return
    try { speakerRef.current && speakerRef.current.stop() } catch { /* ignore */ }
    const b = createBrowserSpeaker({ lang: 'zh-CN', rate: rateRef.current })
    b.setEnabled(voiceOnRef.current)
    b.setRate(rateRef.current)
    if (voiceURIRef.current) b.setVoiceURI(voiceURIRef.current)
    speakerRef.current = b
    setTtsMode('browser')
  }

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
        if (c?.sttConfigured) setSttMode('cloud')
        if (c?.ttsConfigured) {
          // 云端：每次合成带上当前倍速（实时读 rateRef）
          speakerRef.current = createCloudSpeaker({
            synthesize: (text, signal) => synthesizeSpeech(text, signal, rateRef.current),
            onUnavailable: fallbackToBrowser,
          })
          setTtsMode('cloud')
        } else if (ttsSupported()) {
          speakerRef.current = createBrowserSpeaker({ lang: 'zh-CN', rate: rateRef.current })
          setTtsMode('browser')
        }
        if (speakerRef.current) {
          speakerRef.current.setEnabled(voiceOn)
          speakerRef.current.setRate(rateRef.current)
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
    voiceOnRef.current = voiceOn
    if (speakerRef.current) speakerRef.current.setEnabled(voiceOn)
  }, [voiceOn])

  // 卸载时清理识别器与静音计时器
  useEffect(() => () => {
    clearTimeout(silenceTimerRef.current)
    try { recRef.current && recRef.current.stop() } catch { /* ignore */ }
  }, [])

  const onPickVoice = (uri) => {
    setVoiceURI(uri)
    voiceURIRef.current = uri
    localStorage.setItem('interview.voiceURI', uri || '')
    if (speakerRef.current) speakerRef.current.setVoiceURI(uri)
  }

  const onPickRate = (r) => {
    setRate(r)
    rateRef.current = r
    localStorage.setItem('interview.rate', String(r))
    if (speakerRef.current) speakerRef.current.setRate(r)
    if (speakerRef.current) speakerRef.current.stop() // 立刻生效，下一句用新语速
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

  // 根据面试官回复里的阶段标记同步顶部进度条（只前进，避免来回跳）
  const applyStage = (id) => {
    const i = STAGE_INDEX[id]
    if (i == null) return
    setStage((cur) => (i > cur ? i : cur))
    if (id === 'coding') enterCoding()
  }

  // 跑一轮：给定完整历史（含 system），流式获取面试官回复并落库。
  // 回复首行是 [[STAGE:xxx]] 标记：用于同步进度条，且不展示、不朗读。
  const runTurn = async (history) => {
    setBusy(true)
    setError('')
    setStreaming('')
    ttsBufRef.current = ''
    const ac = new AbortController()
    abortRef.current = ac
    let raw = ''
    let spoken = 0
    let stageSet = false
    try {
      const full = await chatStream(
        { messages: history },
        (delta) => {
          raw += delta
          const { stage, clean } = parseStageTag(raw)
          if (stage && !stageSet) { stageSet = true; applyStage(stage) }
          // 首行疑似仍在拼 [[STAGE:..]] 标记、尚未闭合时，先不渲染/朗读
          const formingTag = !stage && /^\s*\[/.test(raw) && !raw.includes('\n') && raw.length < 40
          if (formingTag) return
          setStreaming(clean)
          const newPart = clean.slice(spoken)
          if (newPart) { spoken = clean.length; feedTTS(newPart) }
        },
        ac.signal,
      )
      const { stage, clean } = parseStageTag(full)
      if (stage && !stageSet) applyStage(stage)
      flushTTS()
      setMessages([...history, { role: 'assistant', content: clean }])
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

  // 回车发送、Alt/Shift+回车换行；中文输入法组字中的回车不触发发送。
  const onAnswerKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return
    if (e.altKey || e.shiftKey) {
      e.preventDefault()
      const el = e.target
      const s = el.selectionStart, en = el.selectionEnd
      const next = input.slice(0, s) + '\n' + input.slice(en)
      setInput(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 1 })
      return
    }
    e.preventDefault()
    if (!busy && input.trim()) send()
  }

  // 云端 Whisper 录音：按一下开始录、再按一下停止并转写（更准、支持各浏览器）
  const startCloudMic = async () => {
    if (speakerRef.current) speakerRef.current.stop()
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('无法访问麦克风，请检查浏览器权限')
      return
    }
    mediaStreamRef.current = stream
    const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    const chunks = []
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    mr.onstop = async () => {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      setListening(false)
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
      if (!blob.size) return
      setTranscribing(true)
      try {
        const text = await transcribeSpeech(blob)
        if (text) setInput((prev) => (prev ? prev + ' ' : '') + text)
      } catch (e) {
        setError('语音转写失败：' + String(e?.message || e))
      } finally {
        setTranscribing(false)
      }
    }
    mediaRecRef.current = mr
    mr.start()
    setListening(true)
  }
  const stopCloudMic = () => {
    try { if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') mediaRecRef.current.stop() } catch { /* ignore */ }
  }

  // 语音识别开关：优先云端 Whisper，未配置则用浏览器原生识别
  const toggleMic = () => {
    if (transcribing) return
    if (sttMode === 'cloud') {
      if (listening) stopCloudMic()
      else startCloudMic()
      return
    }
    if (!sttSupported()) {
      setError('当前浏览器不支持语音识别，请用 Chrome / Edge，或直接打字作答')
      return
    }
    if (listening) {
      recRef.current && recRef.current.stop()
      return
    }
    if (speakerRef.current) speakerRef.current.stop()
    // 实时识别：边说边把文字填进输入框；停顿 ~2.5s 自动发送，无需手动点
    sttBaseRef.current = input ? input.trim() + ' ' : ''
    sttFinalRef.current = ''
    const armSilence = () => {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        const text = (sttBaseRef.current + sttFinalRef.current).trim()
        try { recRef.current && recRef.current.stop() } catch { /* ignore */ }
        if (text && !busy) send(text)
      }, 2500)
    }
    const rec = createRecognizer({
      lang: 'zh-CN',
      onResult: (t, isFinal) => {
        if (isFinal) {
          sttFinalRef.current = (sttFinalRef.current ? sttFinalRef.current + ' ' : '') + t
          setInput(sttBaseRef.current + sttFinalRef.current)
        } else {
          // 中间结果：实时预览（不落库），让用户看到边说边出字
          setInput(sttBaseRef.current + (sttFinalRef.current ? sttFinalRef.current + ' ' : '') + t)
        }
        armSilence()
      },
      onError: () => { clearTimeout(silenceTimerRef.current); setListening(false) },
      onEnd: () => { clearTimeout(silenceTimerRef.current); setListening(false) },
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
      // 用流式生成：报告内容较长，非流式会被网关超时（504）；放宽输出上限避免 JSON 被截断。
      const text = await chatStream({ messages: history, maxTokens: 4096 }, () => {})
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
            {voiceOn && (ttsMode === 'cloud' || ttsSupported()) && (
              <select
                className="iv-voice-select"
                value={String(rate)}
                onChange={(e) => onPickRate(Number(e.target.value))}
                title="面试官语速"
              >
                {[['0.9', '0.9x 慢'], ['1', '1.0x'], ['1.15', '1.15x'], ['1.3', '1.3x'], ['1.5', '1.5x 快'], ['1.75', '1.75x 很快']].map(([v, l]) => (
                  <option key={v} value={v}>🐢 {l}</option>
                ))}
              </select>
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
                    onKeyDown={onAnswerKeyDown}
                    placeholder={
                      transcribing ? '正在转写录音…'
                        : listening ? (sttMode === 'cloud' ? '正在录音，再次点击麦克风停止并转写…' : '正在聆听，边说边出字，停顿约 2.5 秒自动发送…')
                          : '输入你的回答（Enter 发送，Alt+Enter 换行），或点麦克风语音作答'
                    }
                    rows={3}
                    disabled={busy || transcribing}
                  />
                  <div className="iv-input-actions">
                    <button
                      className={`iv-mic ${listening ? 'on' : ''}`}
                      onClick={toggleMic}
                      disabled={busy || transcribing}
                      title={sttMode === 'cloud' ? '语音作答（Whisper 识别）' : '语音作答'}
                    >
                      {transcribing ? '转写中…' : listening ? (sttMode === 'cloud' ? '● 停止并转写' : '● 停止录音') : '🎤 语音'}
                    </button>
                    <span className="iv-kbd-hint">Enter 发送 · Alt+Enter 换行</span>
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
