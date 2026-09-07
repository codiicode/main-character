import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Kol from './pages/Kol'
import Kols from './pages/Kols'
import Coin from './pages/Coin'
import Launch from './pages/Launch'
import SearchPage from './pages/SearchPage'
import Me from './pages/Me'
import HowItWorks from './pages/HowItWorks'
import { Button, Empty } from './components/ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="kols" element={<Kols />} />
          <Route path="kol/:handle" element={<Kol />} />
          <Route path="coin/:address" element={<Coin />} />
          <Route path="launch" element={<Launch />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="me" element={<Me />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<div className="max-w-[560px] mx-auto"><Empty title="Page not found" body="That link doesn't go anywhere on MAIN." action={<Button to="/" variant="glass">Back to leaderboard</Button>} /></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
