import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { Users, Eye, TrendingUp, Scissors, ExternalLink } from 'lucide-react'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import DailyOutlook from '../components/DailyOutlook'
import { weeklyPerformance, monthlyGrowth } from '../data/mockData'
import { useNavigate } from 'react-router-dom'
import { useAccounts, isYouTubeConnected, fmtCount, timeAgo, type YouTubeVideo } from '../hooks/useAccounts'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; color: string; name: string; value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#1c1c1c', border: '1px solid #333333' }}>
      <p className="font-semibold text-white mb-2">{label}</p>
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
  const ytConnected = isYouTubeConnected(yt)

  const [videos, setVideos] = useState<YouTubeVideo[]>([])

  useEffect(() => {
    if (!ytConnected) return
    fetch('/api/youtube/videos')
      .then(r => r.ok ? r.json() : null)
      .then((data: { items?: YouTubeVideo[] } | null) => { if (data?.items) setVideos(data.items) })
      .catch(() => {})
  }, [ytConnected])

  const overviewStats = ytConnected
    ? [
        { label: 'Subscribers', value: fmtCount(yt.subscriberCount), change: 0 },
        { label: 'Total Views', value: fmtCount(yt.viewCount), change: 0 },
        { label: 'Videos Published', value: fmtCount(yt.videoCount), change: 0 },
        { label: 'Avg. Engagement', value: '—', change: 0 },
      ]
    : [
        { label: 'Total Followers', value: '—', change: 0 },
        { label: 'Total Views (30d)', value: '—', change: 0 },
        { label: 'Avg. Engagement', value: '—', change: 0 },
        { label: 'Shorts Published', value: '—', change: 0 },
      ]

  const icons = [
    <Users size={15} color="#93c5fd" />,
    <Eye size={15} color="#ff9f7c" />,
    <TrendingUp size={15} color="#7cffb2" />,
    <Scissors size={15} color="#93c5fd" />,
  ]

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle={ytConnected ? `${yt.channelTitle} · YouTube` : 'Connect an account to see your real stats'}
        action={
          <button
            onClick={() => navigate('/shorts-studio')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
          >
            <Scissors size={15} />
            Create Shorts
          </button>
        }
      />

      {/* Connect prompt */}
      {!ytConnected && (
        <div
          className="mb-6 flex items-center justify-between p-4 rounded-xl"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <p className="text-sm" style={{ color: '#8a8a8a' }}>
            Connect your YouTube account to see real subscriber counts, views, and recent videos.
          </p>
          <button
            onClick={() => navigate('/connect')}
            className="shrink-0 ml-4 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
          >
            Connect account
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {overviewStats.map((s, i) => (
          <StatCard key={s.label} {...s} icon={icons[i]} />
        ))}
      </div>

      {/* Daily outlook */}
      <DailyOutlook yt={accounts.youtube} ig={accounts.instagram} videos={videos} />

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="col-span-2 rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-1">Weekly Views by Platform</p>
          <p className="text-xs mb-4" style={{ color: '#737373' }}>Last 7 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyPerformance} barGap={4}>
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#737373' }} />
              <Bar dataKey="youtube" name="YouTube" fill="#FF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tiktok" name="TikTok" fill="#69C9D0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="instagram" name="Instagram" fill="#E1306C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-1">Follower Growth</p>
          <p className="text-xs mb-4" style={{ color: '#737373' }}>All platforms combined</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyGrowth}>
              <defs>
                <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#93c5fd' }}
                formatter={(v: number) => [fmt(v), 'Followers']}
              />
              <Area type="monotone" dataKey="followers" stroke="#3b82f6" strokeWidth={2} fill="url(#followersGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YouTube channel card (real data) or placeholder cards */}
      {ytConnected ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5" style={{ background: '#171717', border: '1px solid rgba(255,0,0,0.2)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ background: '#FF0000' }} />
              <span className="text-sm font-semibold text-white">YouTube</span>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
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
                  <p className="text-xs mb-0.5" style={{ color: '#737373' }}>{label}</p>
                  <p className="text-sm font-semibold text-white truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholder for other platforms */}
          {['TikTok', 'Instagram'].map(platform => (
            <div
              key={platform}
              className="rounded-2xl p-5 flex flex-col items-center justify-center text-center"
              style={{ background: '#171717', border: '1px dashed #333333', opacity: 0.6 }}
            >
              <p className="text-sm font-semibold text-white mb-1">{platform}</p>
              <p className="text-xs mb-3" style={{ color: '#737373' }}>Not connected</p>
              <button
                onClick={() => navigate('/connect')}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                Coming soon
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['YouTube', 'TikTok', 'Instagram'].map(platform => (
            <div
              key={platform}
              className="rounded-2xl p-5 flex flex-col items-center justify-center text-center"
              style={{ background: '#171717', border: '1px dashed #333333', minHeight: 120 }}
            >
              <p className="text-sm font-semibold text-white mb-1">{platform}</p>
              <p className="text-xs" style={{ color: '#737373' }}>Connect to see stats</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent videos */}
      <div className="rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Recent Uploads</p>
          {ytConnected && (
            <a
              href={`https://studio.youtube.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#93c5fd' }}
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
                className="flex items-center gap-4 rounded-xl p-3 transition-opacity hover:opacity-80"
                style={{ background: '#111111' }}
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
                  <p className="text-sm font-medium text-white truncate mb-1">{v.title}</p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#737373' }}>
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
          <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#737373' }}>
            {ytConnected ? 'Loading videos…' : 'Connect YouTube to see your recent uploads here.'}
          </div>
        )}
      </div>
    </div>
  )
}
