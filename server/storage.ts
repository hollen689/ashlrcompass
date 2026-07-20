import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = path.join(__dirname, '..', '.tokens.json')

export interface YouTubeTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  channelId: string
  channelTitle: string
  channelHandle: string
  thumbnailUrl: string
  subscriberCount: string
  viewCount: string
  videoCount: string
  hiddenSubscriberCount: boolean
}

export interface InstagramTokens {
  accessToken: string
  expiresAt: number
  userId: string
  username: string
  name: string
  biography: string
  followersCount: number
  mediaCount: number
  profilePictureUrl: string
}

export interface StoredTokens {
  youtube?: YouTubeTokens
  instagram?: InstagramTokens
}

export function readTokens(): StoredTokens {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as StoredTokens
    }
  } catch {}
  return {}
}

export function writeTokens(tokens: StoredTokens): void {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
}

export function clearToken(platform: keyof StoredTokens): void {
  const t = readTokens()
  delete t[platform]
  writeTokens(t)
}
