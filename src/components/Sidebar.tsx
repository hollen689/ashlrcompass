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
      style={{ width: 220, background: '#111111', borderRight: '1px solid #1e1e1e' }}
    >
      <nav className="flex flex-col gap-5 px-3 py-4 flex-1">
        {sections.map(section => (
          <div key={section.label}>
            <p
              className="px-3 mb-1 uppercase tracking-widest font-semibold"
              style={{ fontSize: 10, color: '#3a3a3a', letterSpacing: '0.1em' }}
            >
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive ? 'text-white' : 'text-[#555] hover:text-[#999] hover:bg-white/[0.03]',
                    ].join(' ')
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'rgba(59,130,246,0.09)', color: '#fff' }
                      : {}
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Left border indicator */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: 3, height: 18, background: '#3b82f6' }}
                        />
                      )}
                      <Icon size={15} color={isActive ? '#3b82f6' : undefined} />
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
      <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-xs" style={{ color: '#444' }}>All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
