import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Kol from './pages/Kol'
import Coin from './pages/Coin'
import Launch from './pages/Launch'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="kol/:handle" element={<Kol />} />
          <Route path="coin/:address" element={<Coin />} />
          <Route path="launch" element={<Launch />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
