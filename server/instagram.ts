import { Router } from 'express'
import { readTokens, writeTokens, type InstagramTokens } from './storage.js'

export const instagramRouter = Router()

const GRAPH_API = 'https://graph.facebook.com/v21.0'
const SCOPES = 'instagram_business_basic,instagram_business_manage_insights'

function cfg() {
  return {
    APP_ID: process.env.INSTAGRAM_APP_ID ?? '',
    APP_SECRET: process.env.INSTAGRAM_APP_SECRET ?? '',
    REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI ?? 'http://localhost:3001/auth/instagram/callback',
    FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5175',
  }
}

instagramRouter.get('/auth/instagram', (_, res) => {
  const { APP_ID, REDIRECT_URI } = cfg()
  if (!APP_ID) {
    res.status(500).send('INSTAGRAM_APP_ID not set. Copy .env.example to .env and fill in your credentials.')
    return
  }
  const url = new URL('https://www.facebook.com/dialog/oauth')
  url.searchParams.set('client_id', APP_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('response_type', 'code')
  res.redirect(url.toString())
})

instagramRouter.get('/auth/instagram/callback', async (req, res) => {
  const { APP_ID, APP_SECRET, REDIRECT_URI, FRONTEND_URL } = cfg()
  const code = req.query.code as string | undefined
  const error = req.query.error as string | undefined

  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/connect?error=cancelled`)
    return
  }

  try {
    // 1. Exchange code for short-lived Facebook user access token
    const tokenRes = await fetch(`${GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }).toString(),
    })
    const shortToken = await tokenRes.json() as {
      access_token?: string
      error?: { message: string; type: string; code: number }
    }
    if (!shortToken.access_token) {
      throw new Error(shortToken.error?.message ?? 'No access token returned')
    }

    // 2. Exchange short-lived user token for long-lived user token (60-day expiry)
    const longTokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken.access_token!}`
    )
    const longToken = await longTokenRes.json() as {
      access_token?: string
      expires_in?: number
      error?: { message: string }
    }
    if (!longToken.access_token) {
      throw new Error(longToken.error?.message ?? 'Long-lived token exchange failed')
    }

    // 3. Get Facebook Pages + connected Instagram Business Accounts
    // Page access tokens derived from a long-lived user token are permanent (never expire)
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=access_token,instagram_business_account{id,name,username,biography,followers_count,media_count,profile_picture_url}&access_token=${longToken.access_token}`
    )
    const pagesData = await pagesRes.json() as {
      data?: Array<{
        id: string
        access_token: string
        instagram_business_account?: {
          id: string
          name?: string
          username?: string
          biography?: string
          followers_count?: number
          media_count?: number
          profile_picture_url?: string
        }
      }>
      error?: { message: string }
    }
    if (pagesData.error) throw new Error(pagesData.error.message)

    const igPage = pagesData.data?.find(p => p.instagram_business_account)
    if (!igPage?.instagram_business_account) {
      throw new Error(
        'No Instagram Business Account found. Make sure your Instagram account is connected to a Facebook Page in Meta Business Suite.'
      )
    }

    const ig = igPage.instagram_business_account
    const tokens = readTokens()
    tokens.instagram = {
      accessToken: igPage.access_token, // Page access token — permanent when derived from long-lived user token
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // Page tokens don't expire; store 1 year as sentinel
      userId: ig.id,
      username: ig.username ?? '',
      name: ig.name ?? ig.username ?? '',
      biography: ig.biography ?? '',
      followersCount: ig.followers_count ?? 0,
      mediaCount: ig.media_count ?? 0,
      profilePictureUrl: ig.profile_picture_url ?? '',
    }
    writeTokens(tokens)

    res.redirect(`${FRONTEND_URL}/connect?connected=instagram`)
  } catch (err) {
    console.error('Instagram OAuth error:', err)
    res.redirect(`${FRONTEND_URL}/connect?error=failed`)
  }
})

instagramRouter.get('/api/instagram/media', async (_, res) => {
  const tokens = readTokens()
  if (!tokens.instagram) { res.status(401).json({ error: 'Not connected' }); return }

  try {
    const { accessToken, userId } = tokens.instagram
    const mediaRes = await fetch(
      `${GRAPH_API}/${userId}/media?fields=id,caption,media_type,thumbnail_url,media_url,permalink,like_count,comments_count,timestamp&limit=10&access_token=${accessToken}`
    )
    const data = await mediaRes.json() as {
      data?: Array<{
        id: string
        caption?: string
        media_type: string
        thumbnail_url?: string
        media_url?: string
        permalink: string
        like_count: number
        comments_count: number
        timestamp: string
      }>
      error?: { message: string }
    }
    if (data.error) throw new Error(data.error.message)
    res.json({ items: data.data ?? [] })
  } catch (err) {
    console.error('Instagram media error:', err)
    res.status(500).json({ error: 'Failed to fetch media' })
  }
})
