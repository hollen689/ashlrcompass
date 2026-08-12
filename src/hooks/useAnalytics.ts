import { useState, useEffect } from 'react'
import type { YouTubeVideo } from './useAccounts'

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: string
  thumbnail_url?: string
  media_url?: string
  permalink: string
  like_count: number
  comments_count: number
  timestamp: string
}

export function durationToSeconds(d: string): number {
  const parts = d.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

export function useYouTubeVideos(enabled: boolean) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    fetch('/api/youtube/videos')
      .then(res => res.ok ? res.json() as Promise<{ items?: YouTubeVideo[] }> : { items: [] })
      .then(data => { if (!cancelled) setVideos(data.items ?? []) })
      .catch(() => { if (!cancelled) setVideos([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled])

  return { videos: enabled ? videos : [], loading: enabled && loading }
}

export function useInstagramMedia(enabled: boolean) {
  const [media, setMedia] = useState<InstagramMedia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    fetch('/api/instagram/media')
      .then(res => res.ok ? res.json() as Promise<{ items?: InstagramMedia[] }> : { items: [] })
      .then(data => { if (!cancelled) setMedia(data.items ?? []) })
      .catch(() => { if (!cancelled) setMedia([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled])

  return { media: enabled ? media : [], loading: enabled && loading }
}
