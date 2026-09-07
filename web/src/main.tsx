import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { wagmiConfig } from './lib/chain'
import App from './App'
import Home from './pages/Home'
import Kol from './pages/Kol'
import Kols from './pages/Kols'
import Coin from './pages/Coin'
import Launch from './pages/Launch'
import SearchPage from './pages/SearchPage'
import Me from './pages/Me'
import HowItWorks from './pages/HowItWorks'
import Endorse from './pages/Endorse'
import { Button, Empty } from './components/ui'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
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
              <Route path="endorse" element={<Endorse />} />
              <Route path="endorse/:address" element={<Endorse />} />
              <Route path="*" element={<div className="max-w-[560px] mx-auto"><Empty title="Page not found" body="That link doesn't go anywhere on MAIN." action={<Button to="/" variant="glass">Back to leaderboard</Button>} /></div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
