import type { YouTubeVideo } from '../hooks/useAccounts'
import type { InstagramMedia } from '../hooks/useAnalytics'
import { durationToSeconds } from '../hooks/useAnalytics'

export interface InsightCard {
  id: string
  priority: 'high' | 'medium' | 'low'
  platform: 'YouTube' | 'Instagram' | 'all'
  title: string
  body: string
  action: string | null
  actionRoute: string | null
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toString()
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function average(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

interface GenerateInsightsInput {
  ytConnected: boolean
  igConnected: boolean
  ytVideos: YouTubeVideo[]
  igMedia: InstagramMedia[]
}

export function generateInsights({ ytConnected, igConnected, ytVideos, igMedia }: GenerateInsightsInput): InsightCard[] {
  const cards: InsightCard[] = []

  if (!ytConnected) {
    cards.push({
      id: 'connect-youtube',
      priority: 'medium',
      platform: 'YouTube',
      title: 'Connect YouTube to unlock insights',
      body: 'We can only generate recommendations from real performance data — connect your YouTube channel to get started.',
      action: 'Connect Account',
      actionRoute: '/connect',
    })
  }

  if (!igConnected) {
    cards.push({
      id: 'connect-instagram',
      priority: 'medium',
      platform: 'Instagram',
      title: 'Connect Instagram to unlock insights',
      body: 'We can only generate recommendations from real performance data — connect your Instagram Business account to get started.',
      action: 'Connect Account',
      actionRoute: '/connect',
    })
  }

  if (ytConnected) {
    if (ytVideos.length === 0) {
      cards.push({
        id: 'yt-no-videos',
        priority: 'medium',
        platform: 'YouTube',
        title: 'No YouTube videos yet',
        body: 'Upload your first video to start seeing real performance insights here.',
        action: 'Create a Short',
        actionRoute: '/shorts-studio',
      })
    } else {
      const views = ytVideos.map(v => +v.viewCount)
      const avgViews = average(views)
      const totalLikes = ytVideos.reduce((a, v) => a + +v.likeCount, 0)
      const totalComments = ytVideos.reduce((a, v) => a + +v.commentCount, 0)
      const totalViews = views.reduce((a, b) => a + b, 0)

      if (ytVideos.length >= 2) {
        const top = ytVideos.reduce((a, b) => (+a.viewCount > +b.viewCount ? a : b))
        if (+top.viewCount > avgViews * 1.3) {
          cards.push({
            id: 'yt-top-performer',
            priority: 'high',
            platform: 'YouTube',
            title: `"${top.title}" is your top performer`,
            body: `It has ${fmt(+top.viewCount)} views — ${(+top.viewCount / avgViews).toFixed(1)}x your average of ${fmt(avgViews)} across your last ${ytVideos.length} uploads.`,
            action: 'View Analytics',
            actionRoute: '/analytics',
          })
        }
      }

      if (totalViews > 0) {
        const engagementRate = ((totalLikes + totalComments) / totalViews) * 100
        cards.push({
          id: 'yt-engagement-rate',
          priority: 'low',
          platform: 'YouTube',
          title: `Your average engagement rate is ${engagementRate.toFixed(1)}%`,
          body: `Based on ${fmt(totalLikes)} likes and ${fmt(totalComments)} comments across ${fmt(totalViews)} views over your last ${ytVideos.length} videos.`,
          action: 'View Analytics',
          actionRoute: '/analytics',
        })
      }

      const lastPublished = ytVideos.reduce((a, v) => (new Date(v.publishedAt) > new Date(a) ? v.publishedAt : a), ytVideos[0].publishedAt)
      const gap = daysSince(lastPublished)
      if (gap > 14) {
        cards.push({
          id: 'yt-posting-gap',
          priority: 'medium',
          platform: 'YouTube',
          title: `It's been ${gap} days since your last upload`,
          body: 'Posting on a regular cadence tends to help keep your audience engaged and coming back.',
          action: 'Create a Short',
          actionRoute: '/shorts-studio',
        })
      }

      if (ytVideos.length >= 3) {
        const worst = ytVideos.reduce((a, b) => (+a.viewCount < +b.viewCount ? a : b))
        if (+worst.viewCount < avgViews * 0.5) {
          cards.push({
            id: 'yt-underperformer',
            priority: 'low',
            platform: 'YouTube',
            title: `"${worst.title}" underperformed`,
            body: `It got ${fmt(+worst.viewCount)} views, well below your average of ${fmt(avgViews)}. Worth a look at the hook or thumbnail for similar clips going forward.`,
            action: 'View Analytics',
            actionRoute: '/analytics',
          })
        }
      }

      const shorts = ytVideos.filter(v => durationToSeconds(v.duration) < 60)
      const longForm = ytVideos.filter(v => durationToSeconds(v.duration) >= 60)
      if (shorts.length >= 2 && longForm.length >= 2) {
        const avgShortViews = average(shorts.map(v => +v.viewCount))
        const avgLongViews = average(longForm.map(v => +v.viewCount))
        const winner = avgShortViews > avgLongViews ? 'Shorts' : 'long-form videos'
        const ratio = Math.max(avgShortViews, avgLongViews) / Math.min(avgShortViews, avgLongViews)
        if (ratio > 1.3) {
          cards.push({
            id: 'yt-content-mix',
            priority: 'medium',
            platform: 'YouTube',
            title: `Your ${winner} are outperforming`,
            body: `${winner} average ${fmt(Math.max(avgShortViews, avgLongViews))} views vs. ${fmt(Math.min(avgShortViews, avgLongViews))} for the other format — ${ratio.toFixed(1)}x difference.`,
            action: winner === 'Shorts' ? 'Create a Short' : 'View Analytics',
            actionRoute: winner === 'Shorts' ? '/shorts-studio' : '/analytics',
          })
        }
      }
    }
  }

  if (igConnected) {
    if (igMedia.length === 0) {
      cards.push({
        id: 'ig-no-posts',
        priority: 'medium',
        platform: 'Instagram',
        title: 'No Instagram posts yet',
        body: 'Publish your first post to start seeing real performance insights here.',
        action: null,
        actionRoute: null,
      })
    } else {
      const likes = igMedia.map(m => m.like_count)
      const avgLikes = average(likes)
      const totalLikes = likes.reduce((a, b) => a + b, 0)
      const totalComments = igMedia.reduce((a, m) => a + m.comments_count, 0)

      if (igMedia.length >= 2) {
        const top = igMedia.reduce((a, b) => (a.like_count > b.like_count ? a : b))
        if (top.like_count > avgLikes * 1.3) {
          cards.push({
            id: 'ig-top-performer',
            priority: 'high',
            platform: 'Instagram',
            title: `Your top post is driving the most engagement`,
            body: `"${(top.caption ?? top.media_type).slice(0, 60)}" has ${fmt(top.like_count)} likes — ${(top.like_count / avgLikes).toFixed(1)}x your average of ${fmt(avgLikes)} across your last ${igMedia.length} posts.`,
            action: 'View Analytics',
            actionRoute: '/analytics',
          })
        }
      }

      cards.push({
        id: 'ig-engagement-summary',
        priority: 'low',
        platform: 'Instagram',
        title: `Your posts average ${fmt(avgLikes)} likes`,
        body: `Across your last ${igMedia.length} posts: ${fmt(totalLikes)} total likes and ${fmt(totalComments)} total comments.`,
        action: 'View Analytics',
        actionRoute: '/analytics',
      })

      const lastPosted = igMedia.reduce((a, m) => (new Date(m.timestamp) > new Date(a) ? m.timestamp : a), igMedia[0].timestamp)
      const gap = daysSince(lastPosted)
      if (gap > 14) {
        cards.push({
          id: 'ig-posting-gap',
          priority: 'medium',
          platform: 'Instagram',
          title: `It's been ${gap} days since your last Instagram post`,
          body: 'Posting on a regular cadence tends to help keep your audience engaged and coming back.',
          action: null,
          actionRoute: null,
        })
      }
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return cards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
