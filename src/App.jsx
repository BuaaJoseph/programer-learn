import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import ChapterPage from './pages/ChapterPage.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chapter/:slug" element={<ChapterPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
