import { ArrowRight, AlertCircle, Info, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { insightCards } from '../data/mockData'

const priorityConfig = {
  high: {
    label: 'High Priority',
    icon: <Zap size={13} />,
    badge: 'rgba(239,68,68,0.12)',
    badgeText: '#f87171',
    border: 'rgba(239,68,68,0.2)',
    glow: 'rgba(239,68,68,0.04)',
  },
  medium: {
    label: 'Medium Priority',
    icon: <AlertCircle size={13} />,
    badge: 'rgba(255,189,107,0.15)',
    badgeText: '#ffbd6b',
    border: 'rgba(255,189,107,0.2)',
    glow: 'rgba(255,189,107,0.03)',
  },
  low: {
    label: 'Low Priority',
    icon: <Info size={13} />,
    badge: 'rgba(107,107,133,0.2)',
    badgeText: '#8a8a8a',
    border: '#262626',
    glow: 'transparent',
  },
}

const platformColors: Record<string, string> = {
  YouTube: '#FF4444',
  TikTok: '#69C9D0',
  Instagram: '#E1306C',
  all: '#3b82f6',
}

export default function Insights() {
  const navigate = useNavigate()
  const high = insightCards.filter((c) => c.priority === 'high')
  const medium = insightCards.filter((c) => c.priority === 'medium')
  const low = insightCards.filter((c) => c.priority === 'low')

  return (
    <div className="p-8">
      <PageHeader
        title="Insights & Advice"
        subtitle="AI-powered recommendations based on your content performance"
        action={
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Updated just now
          </div>
        }
      />

      {/* Summary bar */}
      <div
        className="rounded-2xl p-5 mb-8 flex items-center gap-8"
        style={{ background: '#171717', border: '1px solid #262626' }}
      >
        <div>
          <p className="text-xs mb-1" style={{ color: '#737373' }}>Total insights</p>
          <p className="text-2xl font-bold text-white">{insightCards.length}</p>
        </div>
        <div className="w-px h-10" style={{ background: '#333333' }} />
        <div>
          <p className="text-xs mb-1" style={{ color: '#737373' }}>Urgent actions</p>
          <p className="text-2xl font-bold" style={{ color: '#f87171' }}>{high.length}</p>
        </div>
        <div className="w-px h-10" style={{ background: '#333333' }} />
        <div>
          <p className="text-xs mb-1" style={{ color: '#737373' }}>Opportunities</p>
          <p className="text-2xl font-bold" style={{ color: '#ffbd6b' }}>{medium.length}</p>
        </div>
        <div className="ml-auto text-xs" style={{ color: '#737373' }}>
          Based on 30 days of data across 3 platforms
        </div>
      </div>

      <InsightSection title="High Priority" cards={high} navigate={navigate} />
      <InsightSection title="Medium Priority" cards={medium} navigate={navigate} />
      <InsightSection title="Low Priority" cards={low} navigate={navigate} />
    </div>
  )
}

function InsightSection({
  title,
  cards,
  navigate,
}: {
  title: string
  cards: typeof insightCards
  navigate: ReturnType<typeof useNavigate>
}) {
  if (!cards.length) return null
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#737373' }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {cards.map((card) => {
          const cfg = priorityConfig[card.priority as keyof typeof priorityConfig]
          return (
            <div
              key={card.id}
              className="rounded-2xl p-5"
              style={{
                background: `linear-gradient(135deg,${cfg.glow},#171717)`,
                border: `1px solid ${cfg.border}`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: cfg.badge, color: cfg.badgeText }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: `${platformColors[card.platform]}20`,
                        color: platformColors[card.platform],
                      }}
                    >
                      {card.platform === 'all' ? 'All Platforms' : card.platform}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#8a8a8a' }}>
                    {card.body}
                  </p>
                </div>
                {card.action && card.actionRoute && (
                  <button
                    onClick={() => navigate(card.actionRoute!)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
                    style={{ background: '#262626', color: '#93c5fd', border: '1px solid #333333' }}
                  >
                    {card.action}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
