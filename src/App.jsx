import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './shared/AuthContext.jsx'
import Home from './platform/pages/Home.jsx'
import Browse from './platform/pages/Browse.jsx'
import CourseLanding from './platform/pages/CourseLanding.jsx'
import Search from './platform/pages/Search.jsx'
import NotFound from './platform/pages/NotFound.jsx'
import ChapterPage from './reader/ChapterPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:cat" element={<Browse />} />
            <Route path="/c/:cat/:sub" element={<Browse />} />
            <Route path="/course/:courseSlug" element={<CourseLanding />} />
            <Route path="/course/:courseSlug/:chapterSlug" element={<ChapterPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
