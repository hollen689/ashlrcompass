import { Router } from 'express'
import { readTokens, writeTokens, clearToken, type YouTubeTokens } from './storage.js'

export const youtubeRouter = Router()

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI = process.env.REDIRECT_URI ?? 'http://localhost:3001/auth/youtube/callback'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'openid',
  'profile',
].join(' ')

youtubeRouter.get('/auth/youtube', (_, res) => {
  if (!CLIENT_ID) {
    res.status(500).send('GOOGLE_CLIENT_ID not set. Copy .env.example to .env and fill in your credentials.')
    return
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  res.redirect(url.toString())
})

youtubeRouter.get('/auth/youtube/callback', async (req, res) => {
  const code = req.query.code as string | undefined
  const error = req.query.error as string | undefined

  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/connect?error=cancelled`)
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    })

    const tokenData = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      error?: string
    }

    if (!tokenData.access_token) {
      throw new Error(tokenData.error ?? 'No access token returned')
    }

    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    const channelData = await channelRes.json() as {
      items?: Array<{
        id: string
        snippet: {
          title: string
          customUrl?: string
          thumbnails: { default?: { url: string } }
        }
        statistics: {
          subscriberCount?: string
          viewCount?: string
          videoCount?: string
          hiddenSubscriberCount?: boolean
        }
      }>
    }

    const ch = channelData.items?.[0]
    if (!ch) throw new Error('No YouTube channel found on this account')

    const tokens = readTokens()
    tokens.youtube = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? tokens.youtube?.refreshToken ?? '',
      expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      channelId: ch.id,
      channelTitle: ch.snippet.title,
      channelHandle: ch.snippet.customUrl ?? ch.snippet.title,
      thumbnailUrl: ch.snippet.thumbnails.default?.url ?? '',
      subscriberCount: ch.statistics.subscriberCount ?? '0',
      viewCount: ch.statistics.viewCount ?? '0',
      videoCount: ch.statistics.videoCount ?? '0',
      hiddenSubscriberCount: ch.statistics.hiddenSubscriberCount ?? false,
    }
    writeTokens(tokens)

    res.redirect(`${FRONTEND_URL}/connect?connected=youtube`)
  } catch (err) {
    console.error('YouTube OAuth error:', err)
    res.redirect(`${FRONTEND_URL}/connect?error=failed`)
  }
})

youtubeRouter.get('/api/accounts', (_, res) => {
  const tokens = readTokens()
  const yt = tokens.youtube
  const ig = tokens.instagram
  res.json({
    youtube: yt
      ? {
          connected: true,
          channelTitle: yt.channelTitle,
          handle: yt.channelHandle.startsWith('@') ? yt.channelHandle : `@${yt.channelHandle}`,
          thumbnailUrl: yt.thumbnailUrl,
          subscriberCount: yt.subscriberCount,
          viewCount: yt.viewCount,
          videoCount: yt.videoCount,
          hiddenSubscriberCount: yt.hiddenSubscriberCount,
        }
      : { connected: false },
    instagram: ig
      ? {
          connected: true,
          username: ig.username,
          name: ig.name,
          biography: ig.biography,
          followersCount: ig.followersCount,
          mediaCount: ig.mediaCount,
          profilePictureUrl: ig.profilePictureUrl,
        }
      : { connected: false },
  })
})

youtubeRouter.delete('/api/accounts/:platform', (req, res) => {
  const { platform } = req.params
  if (platform === 'youtube') clearToken('youtube')
  if (platform === 'instagram') clearToken('instagram')
  res.json({ ok: true })
})

youtubeRouter.get('/api/youtube/videos', async (_, res) => {
  const tokens = readTokens()
  if (!tokens.youtube) { res.status(401).json({ error: 'Not connected' }); return }

  try {
    const accessToken = await refreshIfNeeded(tokens.youtube)

    // Get the uploads playlist ID
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${tokens.youtube.channelId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const chData = await chRes.json() as {
      items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>
    }
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsId) { res.json({ items: [] }); return }

    // Get recent uploads
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const plData = await plRes.json() as {
      items?: Array<{
        snippet: {
          title: string
          publishedAt: string
          thumbnails: { medium?: { url: string } }
          resourceId: { videoId: string }
        }
      }>
    }
    if (!plData.items?.length) { res.json({ items: [] }); return }

    // Fetch video stats + duration
    const ids = plData.items.map(i => i.snippet.resourceId.videoId).join(',')
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const statsData = await statsRes.json() as {
      items?: Array<{
        id: string
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
        contentDetails: { duration: string }
      }>
    }
    const byId = Object.fromEntries(statsData.items?.map(v => [v.id, v]) ?? [])

    const videos = plData.items.map(item => {
      const vid = item.snippet.resourceId.videoId
      const stats = byId[vid]
      return {
        id: vid,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.medium?.url ?? '',
        publishedAt: item.snippet.publishedAt,
        viewCount: stats?.statistics.viewCount ?? '0',
        likeCount: stats?.statistics.likeCount ?? '0',
        commentCount: stats?.statistics.commentCount ?? '0',
        duration: isoDurationToDisplay(stats?.contentDetails.duration ?? 'PT0S'),
      }
    })

    res.json({ items: videos })
  } catch (err) {
    console.error('YouTube videos error:', err)
    res.status(500).json({ error: 'Failed to fetch videos' })
  }
})

async function refreshIfNeeded(yt: YouTubeTokens): Promise<string> {
  if (Date.now() < yt.expiresAt - 60_000) return yt.accessToken
  if (!yt.refreshToken) throw new Error('No refresh token — user must reconnect')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: yt.refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }).toString(),
  })
  const data = await tokenRes.json() as { access_token?: string; expires_in?: number; error?: string }
  if (!data.access_token) throw new Error(data.error ?? 'Token refresh failed')

  const tokens = readTokens()
  if (tokens.youtube) {
    tokens.youtube.accessToken = data.access_token
    tokens.youtube.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000
    writeTokens(tokens)
  }
  return data.access_token
}

function isoDurationToDisplay(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return '0:00'
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const s = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${min}:${String(s).padStart(2, '0')}`
}
