import { useEffect, useState } from 'react'
import PlatformLayout from '../PlatformLayout.jsx'
import { useAuth } from '../../shared/AuthContext.jsx'
import {
  fetchMyInterviews, interviewViewUrl, interviewDownloadUrl,
} from '../../interview/lib/api.js'

const GRADE_COLOR = { A: '#0e835a', B: '#2563eb', C: '#b26a09', D: '#c0344d', E: '#7a1326' }

function fmtDate(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function MyInterviews() {
  const auth = useAuth()
  const [records, setRecords] = useState(null)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(null) // 正在查看的记录 id

  const load = () => {
    fetchMyInterviews().then(setRecords).catch((e) => setError(String(e?.message || e)))
  }

  useEffect(() => {
    if (auth.ready && auth.isAuthed) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.isAuthed])

  if (auth.ready && !auth.isAuthed) {
    return (
      <PlatformLayout>
        <div className="container">
          <div className="paywall" style={{ marginTop: 24 }}>
            <div className="paywall-lock">🔒</div>
            <h2>登录后查看个人中心</h2>
            <div className="paywall-actions"><button className="btn btn-primary" onClick={auth.login}>登录 / 注册</button></div>
          </div>
        </div>
      </PlatformLayout>
    )
  }

  return (
    <PlatformLayout>
      <div className="container mine">
        <div className="iv-hero">
          <h1 className="browse-h1">个人中心 · 我的面试</h1>
          <p className="section-desc">这里保存你每一次模拟面试的记录与评估报告（含完整对话）。报告生成完成后会邮件通知你。</p>
        </div>

        {error && <div className="iv-error">{error}</div>}

        {records == null ? (
          <p className="iv-sub">加载中…</p>
        ) : records.length === 0 ? (
          <div className="mine-empty">
            <p>还没有面试记录。</p>
            <a className="btn btn-primary" href="/interview">去开始一次模拟面试 →</a>
          </div>
        ) : (
          <div className="mine-list">
            {records.map((r) => (
              <div className="mine-card" key={r.id}>
                <div className="mine-card-top">
                  <div className="mine-grade" style={{ background: GRADE_COLOR[r.grade] || '#878e9c' }}>
                    {r.status === 'ready' ? (r.grade || '—') : r.status === 'failed' ? '✕' : '…'}
                  </div>
                  <div className="mine-meta">
                    <div className="mine-pos">{r.position || '面试'}</div>
                    <div className="mine-time">{fmtDate(r.createdAt)}</div>
                  </div>
                  <div className="mine-status">
                    {r.status === 'pending' && <span className="ms pending">生成中…</span>}
                    {r.status === 'failed' && <span className="ms failed">生成失败</span>}
                    {r.status === 'ready' && <span className="ms ready">已完成</span>}
                  </div>
                </div>

                {r.skills?.length > 0 && (
                  <div className="mine-skills">
                    {r.skills.map((s) => <span className="iv-tag" key={s}>{s}</span>)}
                  </div>
                )}

                {r.status === 'ready' && r.summary && <p className="mine-summary">{r.summary}</p>}
                {r.status === 'failed' && <p className="mine-summary err">{r.error || '生成失败，可重新面试再试'}</p>}

                {r.status === 'ready' && r.hasReport && (
                  <div className="mine-actions">
                    <button className="btn btn-primary ce-small" onClick={() => setViewing(r.id)}>查看报告与完整对话</button>
                    <a className="btn btn-ghost ce-small" href={interviewDownloadUrl(r.id)}>下载 HTML</a>
                    <a className="btn btn-ghost ce-small" href={interviewViewUrl(r.id)} target="_blank" rel="noopener">新窗口打开</a>
                  </div>
                )}
                {r.status === 'pending' && (
                  <div className="mine-actions"><button className="btn btn-ghost ce-small" onClick={load}>刷新状态</button></div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewing != null && (
          <div className="iv-modal-mask" onClick={() => setViewing(null)}>
            <div className="mine-viewer" onClick={(e) => e.stopPropagation()}>
              <div className="mine-viewer-bar">
                <span>面试报告</span>
                <button className="btn btn-ghost ce-small" onClick={() => setViewing(null)}>关闭</button>
              </div>
              <iframe className="mine-iframe" title="面试报告" src={interviewViewUrl(viewing)} />
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  )
}
