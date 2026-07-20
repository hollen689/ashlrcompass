import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0a' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ background: '#0a0a0a' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
