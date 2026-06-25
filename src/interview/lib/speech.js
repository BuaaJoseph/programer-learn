// 浏览器原生语音能力封装：语音识别（STT）与语音合成（TTS）。
//   - 识别：Web Speech API 的 SpeechRecognition（Chrome/Edge 支持，需 https 或 localhost）
//   - 合成：两种实现，统一接口（speak/stop/setEnabled）：
//       1) 云端神经 TTS（createCloudSpeaker）：接近 ChatGPT 的自然人声，音频来自后端 /api/interview/tts
//       2) 浏览器 SpeechSynthesis（createBrowserSpeaker）：免依赖兜底，配术语读音修正与更优音色挑选

export function sttSupported() {
  return typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function ttsSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

// 创建一个语音识别器。
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

// 把文本按句子切分（用于逐句合成、降低首字延迟）。
function splitSentences(text) {
  return String(text)
    .split(/(?<=[。！？.!?；;\n])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// —— 术语读音修正：浏览器中文音色常把英文缩写/中间件名读错，这里在朗读前做替换 ——
// 缩写 → 拆成字母逐个念；产品名 → 中文近似音。云端神经 TTS 一般不需要，仅用于浏览器兜底。
const PRONUNCIATION = [
  [/\bJVM\b/gi, 'J V M'], [/\bJDK\b/gi, 'J D K'], [/\bJRE\b/gi, 'J R E'],
  [/\bGC\b/gi, 'G C'], [/\bJIT\b/gi, 'J I T'], [/\bAOP\b/gi, 'A O P'],
  [/\bIOC\b/gi, 'I O C'], [/\bRPC\b/gi, 'R P C'], [/\bMQ\b/gi, 'M Q'],
  [/\bSQL\b/gi, 'S Q L'], [/\bNIO\b/gi, 'N I O'], [/\bBIO\b/gi, 'B I O'],
  [/\bXML\b/gi, 'X M L'], [/\bHTTPS\b/gi, 'H T T P S'], [/\bHTTP\b/gi, 'H T T P'],
  [/\bTCP\b/gi, 'T C P'], [/\bUDP\b/gi, 'U D P'], [/\bDNS\b/gi, 'D N S'],
  [/\bCDN\b/gi, 'C D N'], [/\bAPI\b/gi, 'A P I'], [/\bSDK\b/gi, 'S D K'],
  [/\bCSS\b/gi, 'C S S'], [/\bDOM\b/gi, 'D O M'], [/\bJWT\b/gi, 'J W T'],
  [/\bORM\b/gi, 'O R M'], [/\bMVC\b/gi, 'M V C'], [/\bMVVM\b/gi, 'M V V M'],
  [/\bMVCC\b/gi, 'M V C C'], [/\bWAL\b/gi, 'W A L'], [/\bLRU\b/gi, 'L R U'],
  [/\bLFU\b/gi, 'L F U'], [/\bFIFO\b/gi, 'fai fo'], [/\bQPS\b/gi, 'Q P S'],
  [/\bTPS\b/gi, 'T P S'], [/\bOOM\b/gi, 'O O M'], [/\bCPU\b/gi, 'C P U'],
  [/\bGPU\b/gi, 'G P U'], [/\bAQS\b/gi, 'A Q S'], [/\bCAS\b/gi, 'C A S'],
  [/\bLLM\b/gi, 'L L M'], [/\bRAG\b/gi, '拉格'], [/\bSFT\b/gi, 'S F T'],
  [/\bRLHF\b/gi, 'R L H F'], [/\bLoRA\b/gi, '楼拉'], [/\bKV\b/gi, 'K V'],
  [/\bHTML\b/gi, 'H T M L'], [/\bACID\b/gi, 'A C I D'], [/\bCAP\b/gi, 'C A P'],
  [/\bRedis\b/gi, '瑞迪斯'], [/\bMySQL\b/gi, 'My S Q L'], [/\bNginx\b/gi, 'Engine X'],
  [/\bKafka\b/gi, '卡夫卡'], [/\bRabbitMQ\b/gi, 'Rabbit M Q'], [/\bNetty\b/gi, '奈提'],
  [/\bZooKeeper\b/gi, 'Zoo Keeper'], [/\bElasticSearch\b/gi, 'Elastic Search'],
  [/\bTomcat\b/gi, '汤姆Cat'], [/\bLinux\b/gi, '里纳克斯'], [/\bPython\b/gi, '派森'],
  [/\bThreadLocal\b/gi, 'Thread Local'], [/\bArrayList\b/gi, 'Array List'],
  [/\bHashMap\b/gi, 'Hash Map'], [/\bB\+?Tree\b/gi, 'B 加 Tree'],
]

function fixPronunciation(text) {
  let s = text
  for (const [re, rep] of PRONUNCIATION) s = s.replace(re, rep)
  return s
}

// 给浏览器音色打分：在线/神经音色 + 知名优质音色优先，尽量摆脱机械音。
function scoreVoice(v, lang) {
  const n = (v.name || '').toLowerCase()
  let s = 0
  if (v.lang && v.lang.toLowerCase().startsWith(lang.split('-')[0])) s += 10
  if (v.localService === false) s += 5
  if (/google/.test(n)) s += 4
  if (/(natural|neural|premium|enhanced|online)/.test(n)) s += 4
  if (/(tingting|mei-?jia|sin-?ji|yue|yu-?shu|huihui|kangkang|xiaoxiao|yunyang|yunxi)/.test(n)) s += 3
  return s
}

// 列出可用的中文音色（供 UI 选择）。
export function listZhVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return (window.speechSynthesis.getVoices() || [])
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('zh'))
    .map((v) => ({ name: v.name, voiceURI: v.voiceURI, lang: v.lang, local: v.localService }))
}

// 浏览器内置 TTS（兜底）。
export function createBrowserSpeaker({ lang = 'zh-CN', rate = 1, pitch = 1 } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  let enabled = true
  let queue = []
  let speaking = false
  let preferredURI = null

  function pickVoice() {
    if (!synth) return null
    const voices = synth.getVoices() || []
    if (preferredURI) {
      const hit = voices.find((v) => v.voiceURI === preferredURI)
      if (hit) return hit
    }
    let best = null, bestScore = -1
    for (const v of voices) {
      const sc = scoreVoice(v, lang)
      if (sc > bestScore) { best = v; bestScore = sc }
    }
    return bestScore >= 10 ? best : null
  }

  function pump() {
    if (!synth || speaking || queue.length === 0) return
    const text = queue.shift()
    if (!text.trim()) { pump(); return }
    const u = new SpeechSynthesisUtterance(fixPronunciation(text))
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
    kind: 'browser',
    speak(text) {
      if (!synth || !enabled || !text) return
      const parts = splitSentences(text)
      queue.push(...(parts.length ? parts : [text]))
      pump()
    },
    stop() { queue = []; speaking = false; if (synth) synth.cancel() },
    setEnabled(v) { enabled = v; if (!v) this.stop() },
    setVoiceURI(uri) { preferredURI = uri || null },
    get enabled() { return enabled },
  }
}

// 云端神经 TTS：synthesize(text, signal) => Promise<ArrayBuffer(mp3)>。
// 逐句并发请求音频、按顺序播放，接近 ChatGPT 的连贯自然语音。
export function createCloudSpeaker({ synthesize }) {
  let enabled = true
  let jobs = []      // { promise, ac }
  let idx = 0
  let running = false
  let curAudio = null
  let curUrl = null

  async function loop() {
    running = true
    while (idx < jobs.length) {
      const job = jobs[idx]
      let buf = null
      try { buf = await job.promise } catch { buf = null }
      if (!enabled) break
      if (buf && buf.byteLength) {
        const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))
        curUrl = url
        const a = new Audio(url)
        curAudio = a
        await new Promise((res) => {
          a.onended = res
          a.onerror = res
          a.play().catch(() => res())
        })
        if (curUrl) { URL.revokeObjectURL(curUrl); curUrl = null }
        curAudio = null
      }
      idx++
    }
    running = false
  }

  return {
    kind: 'cloud',
    speak(text) {
      if (!enabled || !text) return
      for (const part of splitSentences(text)) {
        const ac = new AbortController()
        jobs.push({ promise: synthesize(part, ac.signal), ac })
      }
      if (!running) loop()
    },
    stop() {
      for (const j of jobs) { try { j.ac.abort() } catch { /* ignore */ } }
      jobs = []; idx = 0; running = false
      if (curAudio) { try { curAudio.pause() } catch { /* ignore */ } curAudio = null }
      if (curUrl) { URL.revokeObjectURL(curUrl); curUrl = null }
    },
    setEnabled(v) { enabled = v; if (!v) this.stop() },
    setVoiceURI() { /* 云端音色由服务端 env 决定 */ },
    get enabled() { return enabled },
  }
}
