import GlobalNav from './components/GlobalNav.jsx'

export default function PlatformLayout({ children }) {
  return (
    <div className="platform">
      <GlobalNav />
      <main className="platform-main">{children}</main>
      <footer className="platform-footer">
        <div className="platform-footer-inner">
          <span>编程学习站 · 用直白讲解和动手实践讲透每一门技术</span>
          <span className="muted">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
