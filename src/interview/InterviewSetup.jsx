import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlatformLayout from '../platform/PlatformLayout.jsx'
import { POSITIONS, findPosition } from './data/positions.js'
import { parseResumeFile, fetchResumeFromUrl } from './lib/resume.js'
import { saveConfig, loadConfig } from './lib/session.js'
import { getInterviewConfig, pingModel } from './lib/api.js'
import { useAuth } from '../shared/AuthContext.jsx'

export default function InterviewSetup() {
  const navigate = useNavigate()
  const auth = useAuth()
  const saved = loadConfig() || {}

  const [resumeText, setResumeText] = useState(saved.resumeText || '')
  const [resumeLink, setResumeLink] = useState(saved.resumeLink || '')
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseErr, setParseErr] = useState('')
  const [fetchingLink, setFetchingLink] = useState(false)
  const [linkNote, setLinkNote] = useState('')

  const [position, setPosition] = useState(saved.position || 'backend')
  const [skills, setSkills] = useState(saved.skills || [])
  const [customSkill, setCustomSkill] = useState('')

  const [voice, setVoice] = useState(saved.voice !== false)
  const [error, setError] = useState('')

  // 面试官模型配置状态（来自服务端 env）
  const [modelCfg, setModelCfg] = useState(null) // { configured, model }
  const [ping, setPing] = useState({ state: 'idle', msg: '' }) // idle | testing | ok | fail

  const pos = findPosition(position)

  // 进页面查询服务端是否已配置面试官模型
  useEffect(() => {
    getInterviewConfig()
      .then(setModelCfg)
      .catch(() => setModelCfg({ configured: false }))
  }, [])

  const testConn = async () => {
    setPing({ state: 'testing', msg: '' })
    try {
      const r = await pingModel()
      let msg = r.sample ? `面试官模型连通正常，回复：${r.sample}` : '面试官模型连通正常'
      let state = 'ok'
      if (r.tts && r.tts.configured) {
        msg += '\n' + (r.tts.ok ? '✓ ' : '✗ ') + r.tts.message
        if (!r.tts.ok) state = 'warn'
      }
      setPing({ state, msg })
      setModelCfg((c) => ({ ...(c || {}), configured: true }))
    } catch (e) {
      setPing({ state: 'fail', msg: String(e?.message || e) })
    }
  }

  // 切换岗位时，把推荐技能默认全选（仅当用户尚未自定义过该岗位的勾选）。
  useEffect(() => {
    if (!saved.position || saved.position !== position) {
      setSkills(pos ? [...pos.skills] : [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  const toggleSkill = (s) => {
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }

  const addCustomSkill = () => {
    const s = customSkill.trim()
    if (s && !skills.includes(s)) setSkills((cur) => [...cur, s])
    setCustomSkill('')
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    setFileName(file.name)
    setParsing(true)
    try {
      const text = await parseResumeFile(file)
      setResumeText(text)
    } catch (err) {
      setParseErr(String(err?.message || err))
    } finally {
      setParsing(false)
    }
  }

  // 抓取简历链接内容，填入简历正文（让面试官真正读到简历）。
  const fetchLink = async () => {
    const url = resumeLink.trim()
    setLinkNote('')
    setParseErr('')
    if (!url) { setParseErr('请先填写简历链接'); return null }
    setFetchingLink(true)
    try {
      const text = await fetchResumeFromUrl(url)
      setResumeText(text)
      setLinkNote(`已读取链接内容（约 ${text.length} 字），可在上方正文里核对/编辑。`)
      return text
    } catch (err) {
      setParseErr('读取链接失败：' + String(err?.message || err) + '（可改为直接粘贴简历内容）')
      return null
    } finally {
      setFetchingLink(false)
    }
  }

  const start = async () => {
    setError('')
    let resume = resumeText
    // 只给了链接、还没抓取正文：开始前先抓一次，确保面试官真正读到简历
    if (!resume.trim() && resumeLink.trim()) {
      const text = await fetchLink()
      if (!text) { setError('未能从链接读取到简历内容，请点「读取链接内容」重试，或直接粘贴简历正文'); return }
      resume = text
    }
    if (!resume.trim() && !resumeLink.trim()) {
      setError('请上传/粘贴简历内容，或提供简历链接')
      return
    }
    if (skills.length === 0) {
      setError('请至少勾选一个考察技能点')
      return
    }
    if (modelCfg && modelCfg.configured === false) {
      setError('面试官模型尚未在服务端配置，请在 .env 中设置 ANTHROPIC_BASE_URL 与 ANTHROPIC_AUTH_TOKEN 后重试')
      return
    }
    saveConfig({ resumeText: resume, resumeLink, position, skills, voice })
    navigate('/interview/session')
  }

  // 推荐技能 + 用户自定义添加的（不在推荐列表里的）合并展示
  const recommended = pos ? pos.skills : []
  const extras = skills.filter((s) => !recommended.includes(s))

  // 面试模拟需要登录
  if (auth.ready && !auth.isAuthed) {
    return (
      <PlatformLayout>
        <div className="container iv-setup">
          <div className="iv-hero">
            <h1 className="browse-h1">面试模拟</h1>
          </div>
          <div className="paywall">
            <div className="paywall-lock">🔒</div>
            <h2>登录后使用面试模拟</h2>
            <p>面试模拟会保存你的每次面试记录与评估报告，需登录后使用。登录 / 注册即可开始。</p>
            <div className="paywall-actions">
              <button className="btn btn-primary" onClick={auth.login}>登录 / 注册</button>
            </div>
          </div>
        </div>
      </PlatformLayout>
    )
  }

  return (
    <PlatformLayout>
      <div className="container iv-setup">
        <div className="iv-hero">
          <h1 className="browse-h1">面试模拟</h1>
          <p className="section-desc">
            上传简历、选择岗位与考察技能点，由 AI 面试官（GPT-5.5）为你进行一场约 1 小时的全真模拟面试：
            自我介绍 → 项目深挖 → 技术原理 → AI 编程 → 动手写代码，全程支持语音对话。
          </p>
        </div>

        {/* 1. 简历 */}
        <section className="iv-card">
          <h2 className="iv-card-title"><span className="iv-step">1</span> 简历信息</h2>
          <div className="iv-resume-actions">
            <label className="btn btn-ghost iv-upload">
              {parsing ? '解析中…' : '上传简历附件'}
              <input type="file" accept=".pdf,.txt,.md,.markdown,text/*" onChange={onFile} hidden />
            </label>
            {fileName && <span className="iv-filename">{fileName}</span>}
            <span className="iv-or">支持 PDF / TXT / Markdown</span>
          </div>
          {parseErr && <div className="iv-warn">{parseErr}</div>}
          <label className="ce-label">简历正文（可粘贴，或由上方附件自动填充）</label>
          <textarea
            className="iv-textarea"
            rows={8}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="把你的简历内容粘贴到这里，面试官会据此提问与追问…"
          />
          <label className="ce-label" style={{ marginTop: 12 }}>或：简历链接（点「读取」把网页/PDF 内容抓成正文，面试官才能真正读到）</label>
          <div className="iv-custom">
            <input
              className="iv-input"
              value={resumeLink}
              onChange={(e) => { setResumeLink(e.target.value); setLinkNote('') }}
              placeholder="https:// 或 http:// 你的在线简历地址"
            />
            <button className="btn btn-ghost" onClick={fetchLink} disabled={fetchingLink || !resumeLink.trim()}>
              {fetchingLink ? '读取中…' : '读取链接内容'}
            </button>
          </div>
          {linkNote && <div className="iv-link-note">{linkNote}</div>}
        </section>

        {/* 2. 岗位 */}
        <section className="iv-card">
          <h2 className="iv-card-title"><span className="iv-step">2</span> 选择岗位</h2>
          <div className="iv-pos-grid">
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                className={`iv-pos ${p.id === position ? 'active' : ''}`}
                onClick={() => setPosition(p.id)}
              >
                <span className="iv-pos-title">{p.title}</span>
                <span className="iv-pos-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. 技能点 */}
        <section className="iv-card">
          <h2 className="iv-card-title"><span className="iv-step">3</span> 考察技能点</h2>
          <p className="iv-sub">根据岗位推荐如下技能（已默认勾选），可自由增减：</p>
          <div className="iv-skills">
            {recommended.map((s) => (
              <label key={s} className={`iv-chip ${skills.includes(s) ? 'on' : ''}`}>
                <input type="checkbox" checked={skills.includes(s)} onChange={() => toggleSkill(s)} hidden />
                {s}
              </label>
            ))}
            {extras.map((s) => (
              <label key={s} className={`iv-chip custom ${skills.includes(s) ? 'on' : ''}`}>
                <input type="checkbox" checked={skills.includes(s)} onChange={() => toggleSkill(s)} hidden />
                {s} ✕
              </label>
            ))}
          </div>
          <div className="iv-custom">
            <input
              className="iv-input"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
              placeholder="自定义技能点，回车添加，如：Kafka、gRPC…"
            />
            <button className="btn btn-ghost" onClick={addCustomSkill}>添加</button>
          </div>
        </section>

        {/* 4. 面试官模型（服务端配置） */}
        <section className="iv-card">
          <h2 className="iv-card-title"><span className="iv-step">4</span> 面试官模型</h2>
          <p className="iv-sub">
            面试官的接口地址与密钥已改为在<strong>服务端 <code>.env</code> 配置</strong>（类似 Claude Code 的配置方式），
            无需在页面填写。配置项见 <code>server/.env.example</code>。
          </p>
          <div className="iv-model-status">
            {modelCfg == null ? (
              <span className="iv-status checking">正在检查配置…</span>
            ) : modelCfg.configured ? (
              <span className="iv-status ok">✓ 已配置{modelCfg.model ? `（模型：${modelCfg.model}）` : ''}</span>
            ) : (
              <span className="iv-status bad">✗ 未配置：请在 .env 设置 ANTHROPIC_BASE_URL 与 ANTHROPIC_AUTH_TOKEN</span>
            )}
            <button className="btn btn-ghost ce-small" onClick={testConn} disabled={ping.state === 'testing'}>
              {ping.state === 'testing' ? '测试中…' : '测试连通性'}
            </button>
          </div>
          {ping.state === 'ok' && <div className="iv-status-msg ok" style={{ whiteSpace: 'pre-line' }}>{ping.msg}</div>}
          {ping.state === 'warn' && <div className="iv-status-msg warn" style={{ whiteSpace: 'pre-line' }}>{ping.msg}</div>}
          {ping.state === 'fail' && <div className="iv-status-msg bad">{ping.msg}</div>}

          <div className="iv-voice-toggle" style={{ marginTop: 16 }}>
            <label className="iv-switch">
              <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
              <span>开启语音对话（面试官朗读 + 语音作答）</span>
            </label>
          </div>
          <p className="iv-sub" style={{ marginTop: 8 }}>
            想要接近 ChatGPT 的自然人声？在 <code>.env</code> 配置 <code>INTERVIEW_TTS_*</code>（OpenAI 兼容的语音接口）即可启用云端神经语音；
            未配置时用浏览器内置语音（可在面试页右上角切换音色）。
          </p>
        </section>

        {error && <div className="iv-error">{error}</div>}

        <div className="iv-start-row">
          <button className="btn btn-primary iv-start" onClick={start}>开始模拟面试 →</button>
        </div>
      </div>
    </PlatformLayout>
  )
}
