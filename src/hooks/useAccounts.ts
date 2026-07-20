import { useState, useEffect, useCallback } from 'react'

export interface YouTubeAccount {
  connected: true
  channelTitle: string
  handle: string
  thumbnailUrl: string
  subscriberCount: string
  viewCount: string
  videoCount: string
  hiddenSubscriberCount: boolean
}

export interface InstagramAccount {
  connected: true
  username: string
  name: string
  biography: string
  followersCount: number
  mediaCount: number
  profilePictureUrl: string
}

export interface AccountsData {
  youtube: YouTubeAccount | { connected: false }
  instagram: InstagramAccount | { connected: false }
}

export interface YouTubeVideo {
  id: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  viewCount: string
  likeCount: string
  commentCount: string
  duration: string
}

const EMPTY: AccountsData = {
  youtube: { connected: false },
  instagram: { connected: false },
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountsData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [backendDown, setBackendDown] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (!res.ok) throw new Error('non-200')
      setAccounts(await res.json() as AccountsData)
      setBackendDown(false)
    } catch {
      setBackendDown(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAccounts() }, [fetchAccounts])

  async function disconnect(platform: 'youtube' | 'instagram') {
    await fetch(`/api/accounts/${platform}`, { method: 'DELETE' })
    setAccounts(prev => ({ ...prev, [platform]: { connected: false } }))
  }

  return { accounts, loading, backendDown, refetch: fetchAccounts, disconnect }
}

export function isYouTubeConnected(a: AccountsData['youtube']): a is YouTubeAccount {
  return a.connected === true
}

export function isInstagramConnected(a: AccountsData['instagram']): a is InstagramAccount {
  return a.connected === true
}

export function fmtCount(n: string | number): string {
  const v = typeof n === 'string' ? parseInt(n, 10) : n
  if (isNaN(v)) return '–'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return v.toString()
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  if (d < 7) return `${d} days ago`
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  if (d < 365) return `${Math.floor(d / 30)} months ago`
  return `${Math.floor(d / 365)} years ago`
}
