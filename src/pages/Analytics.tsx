import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Loader, AlertCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAccounts, isYouTubeConnected, isInstagramConnected, fmtCount, timeAgo } from '../hooks/useAccounts'
import { useYouTubeVideos, useInstagramMedia, durationToSeconds } from '../hooks/useAnalytics'

const PLATFORMS = ['All Platforms', 'YouTube', 'Instagram']
const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const platformColors: Record<string, string> = {
  YouTube: '#FF4444',
  Instagram: '#E1306C',
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-4 py-3 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid #333333', borderRadius: 'var(--r-md)' }}>
      <p className="display-sm mb-2" style={{ fontSize: 13 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#8a8a8a' }}>{p.name}:</span>
          <span className="text-white font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function ConnectPrompt({ platform }: { platform: string }) {
  return (
    <div className="card-outline p-5 flex items-center justify-between gap-4">
      <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
        Connect {platform} to see real stats here.
      </p>
      <a href="/connect" className="btn-pill btn-primary btn-sm shrink-0">
        Connect
      </a>
    </div>
  )
}

export default function Analytics() {
  const [platform, setPlatform] = useState('All Platforms')
  const [range, setRange] = useState(RANGES[0])

  const { accounts, loading: accountsLoading } = useAccounts()
  const yt = accounts.youtube
  const ig = accounts.instagram
  const ytConnected = isYouTubeConnected(yt)
  const igConnected = isInstagramConnected(ig)

  const { videos: ytVideos, loading: ytLoading } = useYouTubeVideos(ytConnected)
  const { media: igMedia, loading: igLoading } = useInstagramMedia(igConnected)

  const showYouTube = platform === 'All Platforms' || platform === 'YouTube'
  const showInstagram = platform === 'All Platforms' || platform === 'Instagram'

  const [now] = useState(() => Date.now())
  const sinceMs = useMemo(() => now - range.days * 86_400_000, [now, range.days])

  const ytInRange = useMemo(
    () => ytVideos.filter(v => new Date(v.publishedAt).getTime() >= sinceMs),
    [ytVideos, sinceMs]
  )
  const igInRange = useMemo(
    () => igMedia.filter(m => new Date(m.timestamp).getTime() >= sinceMs),
    [igMedia, sinceMs]
  )

  const ytViewsData = useMemo(
    () =>
      [...ytInRange]
        .sort((a, b) => +b.viewCount - +a.viewCount)
        .slice(0, 8)
        .map(v => ({ name: v.title.length > 20 ? v.title.slice(0, 20) + '…' : v.title, views: +v.viewCount })),
    [ytInRange]
  )

  const igEngagementData = useMemo(
    () =>
      [...igInRange]
        .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
        .slice(0, 8)
        .map(m => ({
          name: (m.caption ?? m.media_type).length > 20 ? (m.caption ?? m.media_type).slice(0, 20) + '…' : (m.caption ?? m.media_type),
          likes: m.like_count,
          comments: m.comments_count,
        })),
    [igInRange]
  )

  const contentBreakdown = useMemo(() => {
    const shorts = ytInRange.filter(v => durationToSeconds(v.duration) < 60).length
    const longForm = ytInRange.filter(v => durationToSeconds(v.duration) >= 60).length
    const byIgType: Record<string, number> = {}
    igInRange.forEach(m => { byIgType[m.media_type] = (byIgType[m.media_type] ?? 0) + 1 })
    const rows: { type: string; count: number }[] = []
    if (showYouTube) {
      if (shorts) rows.push({ type: 'YouTube Shorts', count: shorts })
      if (longForm) rows.push({ type: 'YouTube Long-form', count: longForm })
    }
    if (showInstagram) {
      Object.entries(byIgType).forEach(([type, count]) => {
        const label = type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
        rows.push({ type: `Instagram ${label}`, count })
      })
    }
    return rows
  }, [ytInRange, igInRange, showYouTube, showInstagram])

  const topContent = useMemo(() => {
    const ytTop = showYouTube
      ? ytInRange
          .slice()
          .sort((a, b) => +b.viewCount - +a.viewCount)
          .slice(0, 5)
          .map(v => ({
            id: `yt-${v.id}`,
            title: v.title,
            platform: 'YouTube',
            value: +v.viewCount,
            stat: `${fmt(+v.viewCount)} views`,
            duration: v.duration,
            uploadedAt: timeAgo(v.publishedAt),
          }))
      : []
    const igTop = showInstagram
      ? igInRange
          .slice()
          .sort((a, b) => b.like_count - a.like_count)
          .slice(0, 5)
          .map(m => ({
            id: `ig-${m.id}`,
            title: m.caption ? (m.caption.length > 60 ? m.caption.slice(0, 60) + '…' : m.caption) : m.media_type,
            platform: 'Instagram',
            value: m.like_count,
            stat: `${fmt(m.like_count)} likes`,
            duration: '',
            uploadedAt: timeAgo(m.timestamp),
          }))
      : []
    return [...ytTop, ...igTop]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [ytInRange, igInRange, showYouTube, showInstagram])

  const loading = accountsLoading || (ytConnected && ytLoading) || (igConnected && igLoading)
  const nothingConnected = !ytConnected && !igConnected

  return (
    <div className="p-8">
      <PageHeader
        title="Analytics"
        subtitle="Real performance data from your connected accounts"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-8">
        <div
          className="flex p-1 gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)' }}
        >
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className="px-4 py-1.5 text-xs transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                borderRadius: 'var(--r-pill)',
                ...(platform === p
                  ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--ink-muted)' }),
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div
          className="flex p-1 gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)' }}
        >
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className="px-4 py-1.5 text-xs transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                borderRadius: 'var(--r-pill)',
                ...(range.label === r.label
                  ? { background: 'var(--surface-3)', color: 'var(--ink)' }
                  : { color: 'var(--ink-muted)' }),
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center gap-3 p-5">
          <Loader size={16} color="var(--accent-soft)" className="animate-spin" />
          <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Loading your real stats…</span>
        </div>
      ) : nothingConnected ? (
        <div
          className="flex items-start gap-3 p-5"
          style={{
            background: 'rgba(255,189,107,0.08)',
            border: '1px solid rgba(255,189,107,0.35)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <AlertCircle size={16} color="#ffbd6b" className="shrink-0 mt-0.5" />
          <div style={{ color: 'var(--ink-muted)' }}>
            <span className="display-sm">No accounts connected.</span>
            {' '}Connect YouTube or Instagram on the{' '}
            <a href="/connect" className="underline" style={{ color: 'var(--accent-soft)' }}>Connect Accounts</a> page to see real analytics.
          </div>
        </div>
      ) : (
        <>
          {/* Platform summary row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {showYouTube && (
              ytConnected ? (
                <div
                  className="p-5"
                  style={{ background: 'var(--surface)', border: `1px solid ${platformColors.YouTube}40`, borderRadius: 'var(--r-card)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: platformColors.YouTube }} />
                    <span className="display-sm" style={{ fontSize: 15 }}>YouTube</span>
                  </div>
                  <div className="numeric mb-1" style={{ fontSize: 32, lineHeight: 1 }}>{fmtCount(yt.subscriberCount)}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                    subscribers · {fmtCount(yt.viewCount)} total views · {ytInRange.length} videos in range
                  </div>
                </div>
              ) : <ConnectPrompt platform="YouTube" />
            )}
            {showInstagram && (
              igConnected ? (
                <div
                  className="p-5"
                  style={{ background: 'var(--surface)', border: `1px solid ${platformColors.Instagram}40`, borderRadius: 'var(--r-card)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: platformColors.Instagram }} />
                    <span className="display-sm" style={{ fontSize: 15 }}>Instagram</span>
                  </div>
                  <div className="numeric mb-1" style={{ fontSize: 32, lineHeight: 1 }}>{fmtCount(ig.followersCount)}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                    followers · {fmtCount(ig.mediaCount)} total posts · {igInRange.length} posts in range
                  </div>
                </div>
              ) : <ConnectPrompt platform="Instagram" />
            )}
          </div>

          {/* Main charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {showYouTube && (
              <div className="card p-5">
                <p className="display-sm mb-1" style={{ fontSize: 16 }}>Views by Video</p>
                <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>YouTube · {range.label}</p>
                {!ytConnected ? (
                  <ConnectPrompt platform="YouTube" />
                ) : ytViewsData.length === 0 ? (
                  <p className="text-xs py-16 text-center" style={{ color: 'var(--ink-faint)' }}>No videos published in this range</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ytViewsData}>
                      <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
                      <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmt} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="views" name="Views" fill={platformColors.YouTube} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {showInstagram && (
              <div className="card p-5">
                <p className="display-sm mb-1" style={{ fontSize: 16 }}>Engagement by Post</p>
                <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>Instagram · {range.label}</p>
                {!igConnected ? (
                  <ConnectPrompt platform="Instagram" />
                ) : igEngagementData.length === 0 ? (
                  <p className="text-xs py-16 text-center" style={{ color: 'var(--ink-faint)' }}>No posts published in this range</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={igEngagementData}>
                      <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
                      <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="likes" name="Likes" stackId="a" fill={platformColors.Instagram} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" name="Comments" stackId="a" fill="#F77737" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>

          {/* Content breakdown + top content */}
          <div className="grid grid-cols-5 gap-4">
            <div className="card col-span-2 p-5">
              <p className="display-sm mb-4" style={{ fontSize: 16 }}>Content Mix</p>
              {contentBreakdown.length === 0 ? (
                <p className="text-xs py-16 text-center" style={{ color: 'var(--ink-faint)' }}>No content in this range</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={contentBreakdown} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="type" tick={{ fill: '#8a8a8a', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700 }}
                      itemStyle={{ color: '#f7bb59' }}
                      formatter={(v: any) => [v, 'Count']}
                    />
                    <Bar dataKey="count" name="Count" fill="#f5a524" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card col-span-3 p-5">
              <p className="display-sm mb-4" style={{ fontSize: 16 }}>Top Performing Content</p>
              {topContent.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: 'var(--ink-faint)' }}>No content in this range</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topContent.map((v, i) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 p-3"
                      style={{ background: '#111111', borderRadius: 'var(--r-md)' }}
                    >
                      <span
                        className="step-badge shrink-0"
                        style={i === 0 ? undefined : { background: 'var(--surface-3)', color: 'var(--ink-muted)' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="display-sm text-sm truncate">{v.title}</p>
                        <div className="flex gap-3 text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                          <span style={{ color: platformColors[v.platform] }}>{v.platform}</span>
                          <span>{v.stat}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {v.duration && <p className="display-sm text-xs">{v.duration}</p>}
                        <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{v.uploadedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
