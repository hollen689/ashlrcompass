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
      style={{ height: 52, background: '#111111', borderBottom: '1px solid var(--border-soft)' }}
    >
      {/* Logo area — matches sidebar width */}
      <div
        className="flex items-center gap-2.5 px-5 shrink-0"
        style={{ width: 220, borderRight: '1px solid var(--border-soft)', height: '100%' }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--accent)', width: 26, height: 26 }}
        >
          <Compass size={13} color="#0a0a0b" />
        </div>
        <span
          className="text-white"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em' }}
        >
          ashlr<span style={{ color: 'var(--accent-soft)' }}>compass</span>
        </span>
      </div>

      {/* Breadcrumb / page context */}
      <div className="flex items-center gap-2 px-5">
        {pageLabel && (
          <>
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>›</span>
            <span
              className="text-sm"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--ink-muted)' }}
            >
              {pageLabel}
            </span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-8 max-w-lg mx-auto">
        <div
          className="w-full flex items-center gap-2 px-4"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid #252525',
            borderRadius: 'var(--r-pill)',
            height: 34,
          }}
        >
          <Search size={13} color="var(--ink-faint)" />
          <input
            placeholder="Search tools & reports..."
            className="bg-transparent text-sm outline-none flex-1 text-white"
            style={{ caretColor: 'var(--accent-soft)' }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5"
            style={{ background: '#252525', color: 'var(--ink-faint)', fontSize: 10, borderRadius: 'var(--r-pill)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 pr-5 ml-auto">
        <button
          className="relative flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ width: 34, height: 34 }}
        >
          <Bell size={15} color="var(--ink-muted)" />
          <span
            className="absolute top-1.5 right-1.5 rounded-full"
            style={{ width: 6, height: 6, background: 'var(--accent-soft)' }}
          />
        </button>

        <button
          className="flex items-center gap-2 px-2 py-1 transition-colors hover:bg-white/5 ml-1"
          style={{ borderRadius: 'var(--r-pill)' }}
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 26, height: 26, background: 'var(--accent)' }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--on-accent)' }}>A</span>
          </div>
          <span
            className="text-sm text-white"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Alex
          </span>
          <ChevronDown size={13} color="var(--ink-faint)" />
        </button>
      </div>
    </header>
  )
}
