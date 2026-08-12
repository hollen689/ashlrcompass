import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Insights from './pages/Insights'
import ShortsStudio from './pages/ShortsStudio'
import ShortsComposer from './pages/ShortsComposer'
import ConnectAccounts from './pages/ConnectAccounts'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="insights" element={<Insights />} />
          <Route path="shorts-studio" element={<ShortsStudio />} />
          <Route path="shorts-composer" element={<ShortsComposer />} />
          <Route path="connect" element={<ConnectAccounts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
