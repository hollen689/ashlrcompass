import { useState, useMemo } from 'react'
import { CheckCircle2, Circle, Link2, BarChart2, Pencil, TrendingUp, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type YouTubeAccount, type InstagramAccount, type YouTubeVideo } from '../hooks/useAccounts'

type Priority = 'high' | 'medium' | 'low'
type Category = 'content' | 'engagement' | 'analytics' | 'growth'

interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  category: Category
  action?: { label: string; href?: string; route?: string }
}

const CATEGORY_META: Record<Category, { label: string; color: string; icon: React.ReactNode }> = {
  content:    { label: 'Content',    color: '#818cf8', icon: <Pencil size={11} /> },
  engagement: { label: 'Engage',     color: '#34d399', icon: <Zap size={11} /> },
  analytics:  { label: 'Analytics',  color: '#fb923c', icon: <BarChart2 size={11} /> },
  growth:     { label: 'Growth',     color: '#60a5fa', icon: <TrendingUp size={11} /> },
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#4ade80',
}

function buildTasks(
  yt: YouTubeAccount | { connected: false },
  ig: InstagramAccount | { connected: false },
  videos: YouTubeVideo[],
): Task[] {
  const tasks: Task[] = []

  if (!yt.connected) {
    tasks.push({
      id: 'connect-yt',
      title: 'Connect your YouTube account',
      description: 'Unlock real subscriber counts, view data, and personalised recommendations.',
      priority: 'high',
      category: 'growth',
      action: { label: 'Connect', route: '/connect' },
    })
  }

  if (!ig.connected) {
    tasks.push({
      id: 'connect-ig',
      title: 'Connect your Instagram account',
      description: 'Track follower growth and engagement across both platforms in one place.',
      priority: 'medium',
      category: 'growth',
      action: { label: 'Connect', route: '/connect' },
    })
  }

  if (yt.connected) {
    const latestVideo = videos[0]

    if (latestVideo) {
      const daysSince = Math.floor(
        (Date.now() - new Date(latestVideo.publishedAt).getTime()) / 86_400_000,
      )

      if (daysSince >= 7) {
        tasks.push({
          id: 'post-content',
          title: `You haven't posted in ${daysSince} days`,
          description: 'Consistent uploads are the #1 driver of channel growth. Aim for at least one video this week.',
          priority: 'high',
          category: 'content',
          action: { label: 'Open Studio', href: 'https://studio.youtube.com' },
        })
      } else {
        tasks.push({
          id: 'plan-content',
          title: 'Plan your next upload',
          description: 'Brainstorm titles, outline a script, or batch-film your next piece of content.',
          priority: 'medium',
          category: 'content',
          action: { label: 'Open Studio', href: 'https://studio.youtube.com' },
        })
      }

      const commentCount = parseInt(latestVideo.commentCount ?? '0', 10)
      if (commentCount > 0) {
        tasks.push({
          id: 'reply-comments',
          title: `Reply to comments on "${latestVideo.title.slice(0, 40)}${latestVideo.title.length > 40 ? '…' : ''}"`,
          description: `${commentCount.toLocaleString()} comment${commentCount !== 1 ? 's' : ''} — early engagement boosts your video in the algorithm.`,
          priority: commentCount >= 10 ? 'high' : 'medium',
          category: 'engagement',
          action: { label: 'View comments', href: `https://youtube.com/watch?v=${latestVideo.id}` },
        })
      }

      tasks.push({
        id: 'create-short',
        title: 'Repurpose a video into a Short',
        description: 'Clip a highlight from your latest upload to reach a new audience on YouTube Shorts.',
        priority: 'low',
        category: 'content',
        action: { label: 'Shorts Studio', route: '/shorts-studio' },
      })
    }

    tasks.push({
      id: 'check-analytics',
      title: 'Review this week\'s performance',
      description: 'Check which content types and upload times drove the most views and engagement.',
      priority: 'low',
      category: 'analytics',
      action: { label: 'View Analytics', route: '/analytics' },
    })
  }

  if (ig.connected) {
    tasks.push({
      id: 'ig-engagement',
      title: 'Engage on Instagram',
      description: `You have ${ig.followersCount.toLocaleString()} followers — reply to DMs and story replies to strengthen community.`,
      priority: 'medium',
      category: 'engagement',
      action: { label: 'Open Instagram', href: 'https://instagram.com' },
    })
  }

  if (!yt.connected && !ig.connected) {
    tasks.push({
      id: 'research-trends',
      title: 'Research trending topics in your niche',
      description: 'Use YouTube Trending, TikTok Discover, or Google Trends to find high-demand content ideas.',
      priority: 'low',
      category: 'growth',
    })
    tasks.push({
      id: 'check-insights',
      title: 'Browse your AI-powered insights',
      description: 'See recommended actions tailored to your current growth stage.',
      priority: 'low',
      category: 'analytics',
      action: { label: 'View Insights', route: '/insights' },
    })
  }

  const order: Priority[] = ['high', 'medium', 'low']
  return tasks.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority)).slice(0, 6)
}

interface Props {
  yt: YouTubeAccount | { connected: false }
  ig: InstagramAccount | { connected: false }
  videos: YouTubeVideo[]
}

export default function DailyOutlook({ yt, ig, videos }: Props) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const tasks = useMemo(() => buildTasks(yt, ig, videos), [yt, ig, videos])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const done = tasks.filter(t => checked.has(t.id)).length

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-2xl p-5 mb-8" style={{ background: '#171717', border: '1px solid #262626' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Today's Focus</p>
          <p className="text-xs mt-0.5" style={{ color: '#737373' }}>{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#737373' }}>{done}/{tasks.length} done</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#262626' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`, background: '#3b82f6' }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map(task => {
          const isDone = checked.has(task.id)
          const cat = CATEGORY_META[task.category]
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-xl p-3 transition-opacity"
              style={{
                background: '#111111',
                opacity: isDone ? 0.45 : 1,
              }}
            >
              <button
                onClick={() => toggle(task.id)}
                className="shrink-0 mt-0.5 transition-opacity hover:opacity-70"
              >
                {isDone
                  ? <CheckCircle2 size={17} color="#3b82f6" />
                  : <Circle size={17} color="#404040" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: PRIORITY_COLOR[task.priority] }}
                  />
                  <p className="text-sm font-medium text-white leading-snug" style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                    {task.title}
                  </p>
                  <span
                    className="shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: `${cat.color}18`, color: cat.color }}
                  >
                    {cat.icon}{cat.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#737373' }}>{task.description}</p>
              </div>

              {task.action && (
                <button
                  onClick={() => {
                    if (task.action!.route) navigate(task.action!.route)
                    else if (task.action!.href) window.open(task.action!.href, '_blank', 'noopener,noreferrer')
                  }}
                  className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70 mt-0.5"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}
                >
                  <Link2 size={10} />
                  {task.action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
