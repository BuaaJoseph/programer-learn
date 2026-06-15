import { useState } from 'react'
import TopBar from './TopBar.jsx'
import Sidebar from './Sidebar.jsx'

export default function ReaderLayout({ course, children }) {
  const [drawer, setDrawer] = useState(false)
  const closeDrawer = () => setDrawer(false)

  return (
    <div className="layout">
      <Sidebar course={course} open={drawer} onNavigate={closeDrawer} />
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={closeDrawer} />
      <div className="layout-main">
        <TopBar course={course} onMenu={() => setDrawer((d) => !d)} />
        <main>{children}</main>
      </div>
    </div>
  )
}
