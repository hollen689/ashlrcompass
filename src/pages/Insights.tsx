import { useMemo, useState } from 'react'
import { ArrowRight, AlertCircle, Info, Zap, Loader, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAccounts, isYouTubeConnected, isInstagramConnected, type YouTubeAccount, type InstagramAccount, type YouTubeVideo } from '../hooks/useAccounts'
import { useYouTubeVideos, useInstagramMedia, type InstagramMedia } from '../hooks/useAnalytics'
import { generateInsights, type InsightCard } from '../data/insights'

interface AiSuggestion {
  platform: 'YouTube' | 'Instagram'
  kind: 'title' | 'hook' | 'caption'
  text: string
  rationale: string
}

const kindLabels: Record<AiSuggestion['kind'], string> = {
  title: 'Title',
  hook: 'Hook',
  caption: 'Caption',
}

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
  Instagram: '#E1306C',
  all: '#f5a524',
}

export default function Insights() {
  const navigate = useNavigate()
  const { accounts, loading: accountsLoading } = useAccounts()
  const ytConnected = isYouTubeConnected(accounts.youtube)
  const igConnected = isInstagramConnected(accounts.instagram)

  const { videos: ytVideos, loading: ytLoading } = useYouTubeVideos(ytConnected)
  const { media: igMedia, loading: igLoading } = useInstagramMedia(igConnected)

  const cards = useMemo(
    () => generateInsights({ ytConnected, igConnected, ytVideos, igMedia }),
    [ytConnected, igConnected, ytVideos, igMedia]
  )

  const loading = accountsLoading || (ytConnected && ytLoading) || (igConnected && igLoading)
  const high = cards.filter((c) => c.priority === 'high')
  const medium = cards.filter((c) => c.priority === 'medium')
  const low = cards.filter((c) => c.priority === 'low')

  const dataSourceLabel = [
    ytConnected && `${ytVideos.length} YouTube videos`,
    igConnected && `${igMedia.length} Instagram posts`,
  ].filter(Boolean).join(' · ') || 'No accounts connected'

  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  async function generateSuggestions() {
    setSuggestLoading(true)
    setSuggestError(null)
    try {
      const body: {
        youtube?: { channelTitle: string; videos: YouTubeVideo[] }
        instagram?: { username: string; media: InstagramMedia[] }
      } = {}
      if (ytConnected) {
        body.youtube = { channelTitle: (accounts.youtube as YouTubeAccount).channelTitle, videos: ytVideos }
      }
      if (igConnected) {
        body.instagram = { username: (accounts.instagram as InstagramAccount).username, media: igMedia }
      }
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { suggestions?: AiSuggestion[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate suggestions')
      setSuggestions(data.suggestions ?? [])
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setSuggestLoading(false)
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Insights & Advice"
        subtitle="Recommendations generated from your real connected-account data"
        action={
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-muted)', border: '1px solid #333333', borderRadius: 'var(--r-pill)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Updated just now
          </div>
        }
      />

      {loading ? (
        <div className="card flex items-center gap-3 p-5">
          <Loader size={16} color="var(--accent-soft)" className="animate-spin" />
          <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Analyzing your real stats…</span>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="card-outline p-5 mb-8 flex items-center gap-8">
            <div>
              <p className="eyebrow mb-1.5">Total insights</p>
              <p className="numeric" style={{ fontSize: 30, lineHeight: 1 }}>{cards.length}</p>
            </div>
            <div className="self-stretch" style={{ borderLeft: '1px solid var(--line)' }} />
            <div>
              <p className="eyebrow mb-1.5">Urgent actions</p>
              <p className="numeric" style={{ fontSize: 30, lineHeight: 1, color: '#f87171' }}>{high.length}</p>
            </div>
            <div className="self-stretch" style={{ borderLeft: '1px solid var(--line)' }} />
            <div>
              <p className="eyebrow mb-1.5">Opportunities</p>
              <p className="numeric" style={{ fontSize: 30, lineHeight: 1, color: '#ffbd6b' }}>{medium.length}</p>
            </div>
            <div className="ml-auto text-xs" style={{ color: 'var(--ink-muted)' }}>
              Based on {dataSourceLabel}
            </div>
          </div>

          <InsightSection title="High Priority" cards={high} navigate={navigate} />
          <InsightSection title="Medium Priority" cards={medium} navigate={navigate} />
          <InsightSection title="Low Priority" cards={low} navigate={navigate} />

          {/* AI content suggestions */}
          <section>
            <h2 className="eyebrow mb-3">AI Content Ideas</h2>
            <div className="card p-5">
              {!ytConnected && !igConnected ? (
                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>Connect an account to generate content ideas from your real data.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                      Generate titles, hooks, and captions for your next upload — grounded in {dataSourceLabel}.
                    </p>
                    <button
                      onClick={() => void generateSuggestions()}
                      disabled={suggestLoading}
                      className="btn-pill btn-primary btn-sm whitespace-nowrap shrink-0"
                    >
                      {suggestLoading ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {suggestLoading ? 'Generating…' : 'Generate ideas'}
                    </button>
                  </div>

                  {suggestError && (
                    <div
                      className="flex items-start gap-2 p-3 text-sm mb-3"
                      style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.35)', color: '#ff8080', borderRadius: 'var(--r-md)' }}
                    >
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      {suggestError}
                    </div>
                  )}

                  {suggestions && (
                    <div className="flex flex-col gap-2">
                      {suggestions.map((s, i) => (
                        <div key={i} className="p-3.5" style={{ background: '#111111', borderRadius: 'var(--r-md)' }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: `${platformColors[s.platform]}20`, color: platformColors[s.platform] }}
                            >
                              {s.platform}
                            </span>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: 'var(--accent-tint-strong)', color: 'var(--accent-soft)' }}
                            >
                              {kindLabels[s.kind]}
                            </span>
                          </div>
                          <p className="display-sm text-sm mb-1">{s.text}</p>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{s.rationale}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function InsightSection({
  title,
  cards,
  navigate,
}: {
  title: string
  cards: InsightCard[]
  navigate: ReturnType<typeof useNavigate>
}) {
  if (!cards.length) return null
  return (
    <section className="mb-8">
      <h2 className="eyebrow mb-3">{title}</h2>
      <div className="flex flex-col gap-3">
        {cards.map((card) => {
          const cfg = priorityConfig[card.priority]
          return (
            <div
              key={card.id}
              className="p-5"
              style={{
                background: `linear-gradient(135deg,${cfg.glow},#171717)`,
                border: `1px solid ${cfg.border}`,
                borderRadius: 'var(--r-card)',
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
                  <h3 className="display-sm mb-1.5" style={{ fontSize: 19 }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                    {card.body}
                  </p>
                </div>
                {card.action && card.actionRoute && (
                  <button
                    onClick={() => navigate(card.actionRoute!)}
                    className="btn-pill btn-ghost btn-sm whitespace-nowrap shrink-0"
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
