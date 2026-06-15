import { useState } from 'react'
import TopBar from './TopBar.jsx'
import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  const [drawer, setDrawer] = useState(false)
  const closeDrawer = () => setDrawer(false)

  return (
    <div className="layout">
      <Sidebar open={drawer} onNavigate={closeDrawer} />
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={closeDrawer} />
      <div className="layout-main">
        <TopBar onMenu={() => setDrawer((d) => !d)} />
        <main>{children}</main>
      </div>
    </div>
  )
}
