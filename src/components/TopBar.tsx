import { Bell, Search, Compass, ChevronDown } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/insights': 'Insights',
  '/shorts-studio': 'Shorts Studio',
  '/shorts-composer': 'Shorts Composer',
  '/connect': 'Connect Accounts',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const pageLabel = PAGE_LABELS[pathname] ?? ''

  return (
    <header
      className="flex items-center shrink-0 z-20"
      style={{ height: 52, background: '#111111', borderBottom: '1px solid #1e1e1e' }}
    >
      {/* Logo area — matches sidebar width */}
      <div
        className="flex items-center gap-2.5 px-5 shrink-0"
        style={{ width: 220, borderRight: '1px solid #1e1e1e', height: '100%' }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', width: 26, height: 26 }}
        >
          <Compass size={13} color="#fff" />
        </div>
        <span className="font-bold tracking-tight text-white" style={{ fontSize: 15 }}>
          ashlr<span style={{ color: '#3b82f6' }}>compass</span>
        </span>
      </div>

      {/* Breadcrumb / page context */}
      <div className="flex items-center gap-2 px-5">
        {pageLabel && (
          <>
            <span className="text-xs" style={{ color: '#444' }}>›</span>
            <span className="text-sm font-medium" style={{ color: '#737373' }}>{pageLabel}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-8 max-w-lg mx-auto">
        <div
          className="w-full flex items-center gap-2 px-3 rounded-lg"
          style={{ background: '#1a1a1a', border: '1px solid #252525', height: 32 }}
        >
          <Search size={13} color="#444" />
          <input
            placeholder="Search tools & reports..."
            className="bg-transparent text-sm outline-none flex-1 text-white"
            style={{ caretColor: '#3b82f6' }}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#252525', color: '#444', fontSize: 10 }}>⌘K</kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 pr-5 ml-auto">
        <button
          className="relative flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ width: 34, height: 34 }}
        >
          <Bell size={15} color="#737373" />
          <span
            className="absolute top-1.5 right-1.5 rounded-full"
            style={{ width: 6, height: 6, background: '#3b82f6' }}
          />
        </button>

        <button
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/5 ml-1"
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#3b82f6,#818cf8)' }}
          >
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <span className="text-sm font-medium text-white">Alex</span>
          <ChevronDown size={13} color="#525252" />
        </button>
      </div>
    </header>
  )
}
