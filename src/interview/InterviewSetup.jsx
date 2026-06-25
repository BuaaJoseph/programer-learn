import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlatformLayout from '../platform/PlatformLayout.jsx'
import { POSITIONS, findPosition } from './data/positions.js'
import { parseResumeFile } from './lib/resume.js'
import { saveConfig, loadConfig } from './lib/session.js'

export default function InterviewSetup() {
  const navigate = useNavigate()
  const saved = loadConfig() || {}

  const [resumeText, setResumeText] = useState(saved.resumeText || '')
  const [resumeLink, setResumeLink] = useState(saved.resumeLink || '')
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseErr, setParseErr] = useState('')

  const [position, setPosition] = useState(saved.position || 'backend')
  const [skills, setSkills] = useState(saved.skills || [])
  const [customSkill, setCustomSkill] = useState('')

  const [llmUrl, setLlmUrl] = useState(saved.llmUrl || '')
  const [llmKey, setLlmKey] = useState(saved.llmKey || '')
  const [llmModel, setLlmModel] = useState(saved.llmModel || 'gpt-5.5')

  const [voice, setVoice] = useState(saved.voice !== false)
  const [error, setError] = useState('')

  const pos = findPosition(position)

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

  const start = () => {
    setError('')
    if (!resumeText.trim() && !resumeLink.trim()) {
      setError('请上传/粘贴简历内容，或提供简历链接')
      return
    }
    if (skills.length === 0) {
      setError('请至少勾选一个考察技能点')
      return
    }
    if (!llmUrl.trim() || !llmKey.trim()) {
      setError('请填写大模型接口地址（url）和密钥（ak）')
      return
    }
    saveConfig({
      resumeText, resumeLink, position, skills,
      llmUrl: llmUrl.trim(), llmKey: llmKey.trim(), llmModel: llmModel.trim() || 'gpt-5.5',
      voice,
    })
    navigate('/interview/session')
  }

  // 推荐技能 + 用户自定义添加的（不在推荐列表里的）合并展示
  const recommended = pos ? pos.skills : []
  const extras = skills.filter((s) => !recommended.includes(s))

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
          <label className="ce-label" style={{ marginTop: 12 }}>或：简历链接（可选）</label>
          <input
            className="iv-input"
            value={resumeLink}
            onChange={(e) => setResumeLink(e.target.value)}
            placeholder="https://… 你的在线简历地址"
          />
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

        {/* 4. 模型接口 */}
        <section className="iv-card">
          <h2 className="iv-card-title"><span className="iv-step">4</span> 面试官模型接口</h2>
          <p className="iv-sub">面试官由你提供的 GPT-5.5 接口驱动（OpenAI 兼容格式）。密钥仅用于本次会话，不会长期保存。</p>
          <div className="iv-grid2">
            <div>
              <label className="ce-label">接口地址 URL</label>
              <input
                className="iv-input"
                value={llmUrl}
                onChange={(e) => setLlmUrl(e.target.value)}
                placeholder="https://…/v1/chat/completions"
              />
            </div>
            <div>
              <label className="ce-label">密钥 AK</label>
              <input
                className="iv-input"
                type="password"
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
                placeholder="sk-…"
              />
            </div>
            <div>
              <label className="ce-label">模型名</label>
              <input
                className="iv-input"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-5.5"
              />
            </div>
            <div className="iv-voice-toggle">
              <label className="ce-label">语音</label>
              <label className="iv-switch">
                <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
                <span>开启语音对话（面试官朗读 + 语音作答）</span>
              </label>
            </div>
          </div>
        </section>

        {error && <div className="iv-error">{error}</div>}

        <div className="iv-start-row">
          <button className="btn btn-primary iv-start" onClick={start}>开始模拟面试 →</button>
        </div>
      </div>
    </PlatformLayout>
  )
}
