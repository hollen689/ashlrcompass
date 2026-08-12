import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart2,
  Lightbulb,
  Scissors,
  Layers,
  Link2,
} from 'lucide-react'

const sections = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/insights', icon: Lightbulb, label: 'Insights' },
    ],
  },
  {
    label: 'Create',
    items: [
      { to: '/shorts-studio', icon: Scissors, label: 'Shorts Studio' },
      { to: '/shorts-composer', icon: Layers, label: 'Shorts Composer' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/connect', icon: Link2, label: 'Connect Accounts' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-y-auto"
      style={{ width: 220, background: '#111111', borderRight: '1px solid var(--border-soft)' }}
    >
      <nav className="flex flex-col gap-5 px-3 py-4 flex-1">
        {sections.map(section => (
          <div key={section.label}>
            <p className="eyebrow px-3 mb-1.5">{section.label}</p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      'relative flex items-center gap-3 px-3 py-2 text-sm transition-all',
                      isActive ? 'text-white' : 'text-[#5a5a5a] hover:text-[#a0a0a0] hover:bg-white/[0.03]',
                    ].join(' ')
                  }
                  style={({ isActive }) => ({
                    fontFamily: 'var(--font-display)',
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: 'var(--r-pill)',
                    ...(isActive ? { background: 'var(--accent-tint)', color: 'var(--ink)' } : {}),
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={15} color={isActive ? 'var(--accent-soft)' : undefined} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-3 py-4">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-pill)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
