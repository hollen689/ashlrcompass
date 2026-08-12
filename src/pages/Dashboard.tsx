import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { Users, Eye, TrendingUp, Scissors, ExternalLink } from 'lucide-react'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import DailyOutlook from '../components/DailyOutlook'
import ShortsShowcase from '../components/ShortsShowcase'
import { PLACEHOLDER_ITEMS, type ShowcaseItem } from '../data/showcase'
import { useNavigate } from 'react-router-dom'
import { useAccounts, isYouTubeConnected, isInstagramConnected, fmtCount, timeAgo } from '../hooks/useAccounts'
import { useYouTubeVideos } from '../hooks/useAnalytics'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; color: string; name: string; value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-4 py-3 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid #333333', borderRadius: 'var(--r-md)' }}>
      <p className="display-sm mb-2" style={{ fontSize: 13 }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#8a8a8a' }}>{p.name}:</span>
          <span className="text-white font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const yt = accounts.youtube
  const ig = accounts.instagram
  const ytConnected = isYouTubeConnected(yt)
  const igConnected = isInstagramConnected(ig)

  const { videos } = useYouTubeVideos(ytConnected)

  const totalViews = videos.reduce((a, v) => a + +v.viewCount, 0)
  const totalLikes = videos.reduce((a, v) => a + +v.likeCount, 0)
  const totalComments = videos.reduce((a, v) => a + +v.commentCount, 0)
  const avgEngagement = totalViews > 0 ? `${((totalLikes + totalComments) / totalViews * 100).toFixed(1)}%` : '—'

  const overviewStats = ytConnected
    ? [
        { label: 'Subscribers', value: yt.hiddenSubscriberCount ? 'Hidden' : fmtCount(yt.subscriberCount), change: 0 },
        { label: 'Total Views', value: fmtCount(yt.viewCount), change: 0 },
        { label: 'Videos Published', value: fmtCount(yt.videoCount), change: 0 },
        { label: 'Avg. Engagement', value: avgEngagement, change: 0 },
      ]
    : [
        { label: 'Total Followers', value: '—', change: 0 },
        { label: 'Total Views (30d)', value: '—', change: 0 },
        { label: 'Avg. Engagement', value: '—', change: 0 },
        { label: 'Shorts Published', value: '—', change: 0 },
      ]

  const followersData = [
    ytConnected && !yt.hiddenSubscriberCount && { platform: 'YouTube', followers: +yt.subscriberCount, fill: '#FF4444' },
    igConnected && { platform: 'Instagram', followers: ig.followersCount, fill: '#E1306C' },
  ].filter((x): x is { platform: string; followers: number; fill: string } => Boolean(x))

  const viewsData = videos
    .slice(0, 8)
    .map(v => ({ name: v.title.length > 18 ? v.title.slice(0, 18) + '…' : v.title, views: +v.viewCount }))

  // Real uploads fill the showcase once we have them; otherwise it runs on samples.
  const usingSampleShowcase = videos.length < 3
  const showcaseItems: ShowcaseItem[] = usingSampleShowcase
    ? PLACEHOLDER_ITEMS
    : videos.slice(0, 7).map((v, i) => ({
        id: v.id,
        thumbnailUrl: v.thumbnailUrl,
        gradient: PLACEHOLDER_ITEMS[i % PLACEHOLDER_ITEMS.length].gradient,
      }))

  const icons = [
    <Users size={15} color="#f7bb59" />,
    <Eye size={15} color="#ff9f7c" />,
    <TrendingUp size={15} color="#7cffb2" />,
    <Scissors size={15} color="#f7bb59" />,
  ]

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle={ytConnected ? `${yt.channelTitle} · YouTube` : 'Connect an account to see your real stats'}
        action={
          <button onClick={() => navigate('/shorts-studio')} className="btn-pill btn-primary">
            <Scissors size={15} />
            Create Shorts
          </button>
        }
      />

      {/* Connect prompt */}
      {!ytConnected && (
        <div
          className="mb-6 flex items-center justify-between p-4 pl-5"
          style={{
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent-tint-strong)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            Connect your YouTube account to see real subscriber counts, views, and recent videos.
          </p>
          <button
            onClick={() => navigate('/connect')}
            className="btn-pill btn-primary btn-sm shrink-0 ml-4"
          >
            Connect account
          </button>
        </div>
      )}

      {/* Showcase strip */}
      <div className="mb-8">
        <ShortsShowcase items={showcaseItems} />
        <p className="text-center text-xs -mt-2" style={{ color: 'var(--ink-faint)' }}>
          {usingSampleShowcase
            ? 'Sample previews — your own Shorts appear here once you have uploads'
            : `Your ${Math.min(videos.length, 7)} most recent uploads`}
        </p>
      </div>

      {/* Stats row — dashed grid, no fill */}
      <div className="cell-grid grid-cols-4 mb-8">
        {overviewStats.map((s, i) => (
          <StatCard key={s.label} {...s} icon={icons[i]} />
        ))}
      </div>

      {/* Daily outlook */}
      <DailyOutlook yt={accounts.youtube} ig={accounts.instagram} videos={videos} />

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card col-span-2 p-5">
          <p className="display-sm mb-1" style={{ fontSize: 16 }}>Views by Recent Upload</p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>YouTube · most recent first</p>
          {viewsData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 200, color: 'var(--ink-faint)' }}>
              <p className="text-xs">{ytConnected ? 'No uploads yet' : 'Connect YouTube to see real view data'}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={viewsData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views" name="Views" fill="#FF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <p className="display-sm mb-1" style={{ fontSize: 16 }}>Followers by Platform</p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>Current snapshot</p>
          {followersData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 200, color: 'var(--ink-faint)' }}>
              <p className="text-xs">Connect an account to see real follower counts</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={followersData} barGap={4}>
                <XAxis dataKey="platform" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700 }}
                  itemStyle={{ color: '#f7bb59' }}
                  formatter={(v: any) => [fmt(v as number), 'Followers']}
                />
                <Bar dataKey="followers" name="Followers" radius={[4, 4, 0, 0]}>
                  {followersData.map(d => <Cell key={d.platform} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Per-platform cards: real data if connected, connect prompt otherwise */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {ytConnected ? (
          <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 'var(--r-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ background: '#FF0000' }} />
              <span className="display-sm" style={{ fontSize: 15 }}>YouTube</span>
              <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Subscribers', value: yt.hiddenSubscriberCount ? 'Hidden' : fmtCount(yt.subscriberCount) },
                { label: 'Total Views', value: fmtCount(yt.viewCount) },
                { label: 'Videos', value: fmtCount(yt.videoCount) },
                { label: 'Handle', value: yt.handle },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--ink-muted)' }}>{label}</p>
                  <p className="display-sm text-sm truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="card-outline p-5 flex flex-col items-center justify-center text-center"
            style={{ minHeight: 120 }}
          >
            <p className="display-sm mb-1" style={{ fontSize: 15 }}>YouTube</p>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>Connect to see stats</p>
            <button onClick={() => navigate('/connect')} className="btn-pill btn-primary btn-sm">
              Connect
            </button>
          </div>
        )}

        {igConnected ? (
          <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(225,48,108,0.2)', borderRadius: 'var(--r-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ background: '#E1306C' }} />
              <span className="display-sm" style={{ fontSize: 15 }}>Instagram</span>
              <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Followers', value: fmtCount(ig.followersCount) },
                { label: 'Posts', value: fmtCount(ig.mediaCount) },
                { label: 'Username', value: `@${ig.username}` },
                { label: 'Name', value: ig.name || ig.username },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--ink-muted)' }}>{label}</p>
                  <p className="display-sm text-sm truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="card-outline p-5 flex flex-col items-center justify-center text-center"
            style={{ minHeight: 120 }}
          >
            <p className="display-sm mb-1" style={{ fontSize: 15 }}>Instagram</p>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>Connect to see stats</p>
            <button onClick={() => navigate('/connect')} className="btn-pill btn-primary btn-sm">
              Connect
            </button>
          </div>
        )}

        <div
          className="card-outline p-5 flex flex-col items-center justify-center text-center"
          style={{ opacity: 0.6 }}
        >
          <p className="display-sm mb-1" style={{ fontSize: 15 }}>TikTok</p>
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Integration on hold</p>
        </div>
      </div>

      {/* Recent videos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="display-sm" style={{ fontSize: 16 }}>Recent Uploads</p>
          {ytConnected && (
            <a
              href={`https://studio.youtube.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-soft)' }}
            >
              YouTube Studio <ExternalLink size={11} />
            </a>
          )}
        </div>

        {ytConnected && videos.length > 0 ? (
          <div className="flex flex-col gap-3">
            {videos.slice(0, 5).map(v => (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 transition-colors hover:bg-[#1c1c1c]"
                style={{ background: '#111111', borderRadius: 'var(--r-md)' }}
              >
                {v.thumbnailUrl ? (
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    className="rounded-lg shrink-0 object-cover"
                    style={{ width: 72, height: 42 }}
                  />
                ) : (
                  <div
                    className="rounded-lg shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ width: 72, height: 42, background: '#262626', color: '#737373' }}
                  >
                    {v.duration}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="display-sm text-sm truncate mb-1">{v.title}</p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
                    <span>YouTube</span>
                    <span>{fmtCount(v.viewCount)} views</span>
                    <span>{fmtCount(v.likeCount)} likes</span>
                    <span>{v.duration}</span>
                    <span>{timeAgo(v.publishedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--ink-muted)' }}>
            {ytConnected ? 'Loading videos…' : 'Connect YouTube to see your recent uploads here.'}
          </div>
        )}
      </div>
    </div>
  )
}
