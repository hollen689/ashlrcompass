import { Router } from 'express'

export const aiRouter = Router()

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_MODEL = process.env.XAI_MODEL ?? 'grok-4'

interface YtVideoInput {
  title: string
  viewCount: string
  likeCount: string
  commentCount: string
  duration: string
  publishedAt: string
}

interface IgMediaInput {
  caption?: string
  media_type: string
  like_count: number
  comments_count: number
  timestamp: string
}

interface SuggestionsRequest {
  youtube?: { channelTitle: string; videos: YtVideoInput[] }
  instagram?: { username: string; media: IgMediaInput[] }
}

interface AiSuggestion {
  platform: 'YouTube' | 'Instagram'
  kind: 'title' | 'hook' | 'caption'
  text: string
  rationale: string
}

const SYSTEM_PROMPT = `You are a social media growth strategist. Generate concrete, actionable content suggestions (titles, hooks, captions) for the creator's next upload, grounded strictly in the real performance data provided. Reference specific numbers from the data in your rationale. Do not invent facts, statistics, or trends not present in the data.

Respond with ONLY a JSON object of this exact shape, no other text:
{
  "suggestions": [
    { "platform": "YouTube" | "Instagram", "kind": "title" | "hook" | "caption", "text": "...", "rationale": "..." }
  ]
}
Generate 4-6 suggestions total.`

function buildDataSummary(body: SuggestionsRequest): string {
  const parts: string[] = []

  if (body.youtube) {
    parts.push(`YouTube channel: ${body.youtube.channelTitle}`)
    if (body.youtube.videos.length === 0) {
      parts.push('No videos yet.')
    } else {
      parts.push('Recent videos:')
      for (const v of body.youtube.videos) {
        parts.push(`- "${v.title}" — ${v.viewCount} views, ${v.likeCount} likes, ${v.commentCount} comments, ${v.duration} long, published ${v.publishedAt}`)
      }
    }
  }

  if (body.instagram) {
    parts.push(`Instagram account: @${body.instagram.username}`)
    if (body.instagram.media.length === 0) {
      parts.push('No posts yet.')
    } else {
      parts.push('Recent posts:')
      for (const m of body.instagram.media) {
        const caption = m.caption ? ` "${m.caption.slice(0, 80)}"` : ''
        parts.push(`- ${m.media_type}${caption} — ${m.like_count} likes, ${m.comments_count} comments, posted ${m.timestamp}`)
      }
    }
  }

  parts.push('\nBased on this real performance data, suggest 4-6 concrete titles, hooks, or captions for upcoming content. Each rationale must cite specific numbers from the data above.')
  return parts.join('\n')
}

aiRouter.post('/api/ai/suggestions', async (req, res) => {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'XAI_API_KEY not set. Copy .env.example to .env and fill in your key.' })
    return
  }

  const body = req.body as SuggestionsRequest
  if (!body.youtube && !body.instagram) {
    res.status(400).json({ error: 'No performance data provided' })
    return
  }

  try {
    const xaiRes = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildDataSummary(body) },
        ],
      }),
    })

    if (!xaiRes.ok) {
      const errText = await xaiRes.text()
      throw new Error(`xAI API error ${xaiRes.status}: ${errText}`)
    }

    const data = await xaiRes.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No content in xAI response')

    const parsed = JSON.parse(content) as { suggestions?: AiSuggestion[] }
    res.json({ suggestions: parsed.suggestions ?? [] })
  } catch (err) {
    console.error('AI suggestions error:', err)
    res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})
