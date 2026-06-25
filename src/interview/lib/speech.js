// 浏览器原生语音能力封装：语音识别（STT）与语音合成（TTS），无需任何第三方依赖。
//   - 识别：Web Speech API 的 SpeechRecognition（Chrome/Edge 支持，需 https 或 localhost）
//   - 合成：SpeechSynthesis（绝大多数浏览器支持）

export function sttSupported() {
  return typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function ttsSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

// 创建一个语音识别器。
// onResult(text, isFinal) 在识别出（中间/最终）结果时回调；onEnd 在结束时回调。
export function createRecognizer({ lang = 'zh-CN', onResult, onError, onEnd } = {}) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = true
  rec.interimResults = true
  rec.onresult = (e) => {
    let interim = ''
    let final = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) final += r[0].transcript
      else interim += r[0].transcript
    }
    if (final) onResult && onResult(final, true)
    else if (interim) onResult && onResult(interim, false)
  }
  rec.onerror = (e) => onError && onError(e)
  rec.onend = () => onEnd && onEnd()
  return rec
}

// 语音合成管理器：把文本按句子排队朗读，支持随时停止。
export function createSpeaker({ lang = 'zh-CN', rate = 1.05, pitch = 1 } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  let enabled = true
  let queue = []
  let speaking = false

  function pickVoice() {
    if (!synth) return null
    const voices = synth.getVoices() || []
    return (
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang && v.lang.startsWith(lang.split('-')[0])) ||
      null
    )
  }

  function pump() {
    if (!synth || speaking || queue.length === 0) return
    const text = queue.shift()
    if (!text.trim()) { pump(); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    u.pitch = pitch
    const v = pickVoice()
    if (v) u.voice = v
    u.onend = () => { speaking = false; pump() }
    u.onerror = () => { speaking = false; pump() }
    speaking = true
    synth.speak(u)
  }

  return {
    // 朗读一段文本（会切句后入队）。
    speak(text) {
      if (!synth || !enabled || !text) return
      const parts = String(text)
        .split(/(?<=[。！？.!?；;\n])/)
        .map((s) => s.trim())
        .filter(Boolean)
      queue.push(...(parts.length ? parts : [text]))
      pump()
    },
    stop() {
      queue = []
      speaking = false
      if (synth) synth.cancel()
    },
    setEnabled(v) {
      enabled = v
      if (!v) this.stop()
    },
    get enabled() { return enabled },
  }
}
