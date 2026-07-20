import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { weeklyPerformance, recentVideos, platformStats } from '../data/mockData'

const PLATFORMS = ['All Platforms', 'YouTube', 'TikTok', 'Instagram']
const RANGES = ['7 days', '30 days', '90 days']

const platformColors: Record<string, string> = {
  YouTube: '#FF4444',
  TikTok: '#69C9D0',
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
    <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#1c1c1c', border: '1px solid #333333' }}>
      <p className="font-semibold text-white mb-2">{label}</p>
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

const engagementData = weeklyPerformance.map((d) => ({
  day: d.day,
  rate: +(Math.random() * 4 + 3).toFixed(1),
}))

const contentBreakdown = [
  { type: 'Long-form', views: 580000 },
  { type: 'Shorts (<60s)', views: 820000 },
  { type: 'Live Streams', views: 140000 },
  { type: 'Clips', views: 240000 },
]

export default function Analytics() {
  const [platform, setPlatform] = useState('All Platforms')
  const [range, setRange] = useState('7 days')

  return (
    <div className="p-8">
      <PageHeader
        title="Analytics"
        subtitle="Deep dive into your performance metrics"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-8">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: '#171717', border: '1px solid #262626' }}>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                platform === p
                  ? { background: '#3b82f6', color: '#fff' }
                  : { color: '#737373' }
              }
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl p-1 gap-1" style={{ background: '#171717', border: '1px solid #262626' }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                range === r
                  ? { background: '#262626', color: '#fff' }
                  : { color: '#737373' }
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Platform summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {platformStats.map((p) => (
          <div
            key={p.platform}
            className="rounded-2xl p-4 cursor-pointer transition-all"
            style={{
              background: '#171717',
              border: platform === p.platform ? `1px solid ${p.color}40` : '1px solid #262626',
              boxShadow: platform === p.platform ? `0 0 20px ${p.color}15` : 'none',
            }}
            onClick={() => setPlatform(p.platform)}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-sm font-semibold text-white">{p.platform}</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{p.followers}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              +{p.weeklyGrowth}% this week
            </div>
          </div>
        ))}
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-1">Views Over Time</p>
          <p className="text-xs mb-4" style={{ color: '#737373' }}>Combined across platforms</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyPerformance}>
              <defs>
                <linearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ttGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#69C9D0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#69C9D0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {(platform === 'All Platforms' || platform === 'YouTube') && (
                <Area type="monotone" dataKey="youtube" name="YouTube" stroke="#FF4444" strokeWidth={2} fill="url(#ytGrad)" />
              )}
              {(platform === 'All Platforms' || platform === 'TikTok') && (
                <Area type="monotone" dataKey="tiktok" name="TikTok" stroke="#69C9D0" strokeWidth={2} fill="url(#ttGrad)" />
              )}
              {(platform === 'All Platforms' || platform === 'Instagram') && (
                <Area type="monotone" dataKey="instagram" name="Instagram" stroke="#E1306C" strokeWidth={2} fill="url(#igGrad)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-1">Engagement Rate</p>
          <p className="text-xs mb-4" style={{ color: '#737373' }}>Daily average (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={engagementData}>
              <defs>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#93c5fd' }}
                formatter={(v: any) => [`${v}%`, 'Engagement']}
              />
              <Area type="monotone" dataKey="rate" name="Engagement" stroke="#3b82f6" strokeWidth={2} fill="url(#engGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content breakdown + top videos */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-4">Views by Content Type</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={contentBreakdown} layout="vertical" barSize={14}>
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#8a8a8a', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#93c5fd' }}
                formatter={(v: any) => [fmt(v as number), 'Views']}
              />
              <Bar dataKey="views" name="Views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-3 rounded-2xl p-5" style={{ background: '#171717', border: '1px solid #262626' }}>
          <p className="text-sm font-semibold text-white mb-4">Top Performing Videos</p>
          <div className="flex flex-col gap-2">
            {recentVideos.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: '#111111' }}
              >
                <span
                  className="text-xs font-bold w-5 text-center shrink-0"
                  style={{ color: i === 0 ? '#ffd700' : '#737373' }}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.title}</p>
                  <div className="flex gap-3 text-xs mt-0.5" style={{ color: '#737373' }}>
                    <span style={{ color: platformColors[v.platform] }}>{v.platform}</span>
                    <span>{fmt(v.views)} views</span>
                    <span>{fmt(v.likes)} likes</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-white">{v.duration}</p>
                  <p className="text-xs" style={{ color: '#737373' }}>{v.uploadedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
