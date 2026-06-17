import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './shared/AuthContext.jsx'
import Home from './platform/pages/Home.jsx'
import Browse from './platform/pages/Browse.jsx'
import CourseLanding from './platform/pages/CourseLanding.jsx'
import Search from './platform/pages/Search.jsx'
import NotFound from './platform/pages/NotFound.jsx'
import ChapterPage from './reader/ChapterPage.jsx'

// 在原生壳（Capacitor）里用 HashRouter——从 localhost/file 根加载、刷新不白屏；
// 普通网页仍用 BrowserRouter，保持干净 URL（/course/x）。
const isNativeApp =
  typeof window !== 'undefined' &&
  !!window.Capacitor &&
  (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : true)
const Router = isNativeApp ? HashRouter : BrowserRouter

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:cat" element={<Browse />} />
            <Route path="/c/:cat/:sub" element={<Browse />} />
            <Route path="/course/:courseSlug" element={<CourseLanding />} />
            <Route path="/course/:courseSlug/:chapterSlug" element={<ChapterPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  )
}
