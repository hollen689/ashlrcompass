import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { youtubeRouter } from './youtube.js'
import { instagramRouter } from './instagram.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use('/', youtubeRouter)
app.use('/', instagramRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`\nAPI server running at http://localhost:${PORT}`)
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('\n⚠  GOOGLE_CLIENT_ID not set — YouTube OAuth will not work.')
    console.log('   Copy .env.example to .env and fill in your credentials.\n')
  }
  if (!process.env.INSTAGRAM_APP_ID) {
    console.log('\n⚠  INSTAGRAM_APP_ID not set — Instagram OAuth will not work.')
    console.log('   Copy .env.example to .env and fill in your credentials.\n')
  }
})
