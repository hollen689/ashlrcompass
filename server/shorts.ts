import { Router, type Request } from 'express'
import multer from 'multer'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required for Express Request augmentation
  namespace Express {
    interface Request {
      jobId?: string
      renderId?: string
    }
  }
}

const TMP_ROOT = path.join(process.cwd(), '.tmp', 'shorts')
fs.mkdirSync(TMP_ROOT, { recursive: true })

const JOB_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEGMENT_FILENAME_RE = /^output_\d+\.mp4$/
const EDITED_FILENAME_RE = /^edited_\d+_[0-9a-f]{12}\.mp4$/
// Both plain segments and re-rendered edits are served from the clips dir
const CLIP_FILENAME_RE = new RegExp(`(${SEGMENT_FILENAME_RE.source})|(${EDITED_FILENAME_RE.source})`)

// An edited clip may be extended past its original bounds, but not without limit
const MAX_RENDER_DURATION = 15 * 60
const MAX_OVERLAYS = 12

interface ClipInfo {
  filename: string
  index: number
  startTime: number
  duration: number
  /** Why this clip starts where it does. */
  cutReason: CutReason
}

interface Job {
  status: 'processing' | 'done' | 'error'
  /** Which stage of the split we are in, so the UI can label the wait. */
  phase?: 'analyzing' | 'splitting'
  progress: number
  error?: string
  clips?: ClipInfo[]
  /** How many cuts landed on a detected pause or scene change. */
  naturalCuts?: number
  /** Full length of the uploaded source, so the editor can extend past a clip's bounds. */
  sourceDuration?: number
  width?: number
  height?: number
}

interface RenderJob {
  status: 'processing' | 'done' | 'error'
  progress: number
  error?: string
  filename?: string
}

const jobs = new Map<string, Job>()
const renders = new Map<string, RenderJob>()

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const dir = path.join(TMP_ROOT, req.jobId!)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, _file, cb) => cb(null, 'input.mp4'),
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 * 1024 } })

export const shortsRouter = Router()

function ffprobeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]
    const proc = spawn(ffprobeStatic.path, args)
    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', code => {
      if (code !== 0) { reject(new Error('ffprobe failed')); return }
      const duration = parseFloat(out.trim())
      if (isNaN(duration)) { reject(new Error('Could not parse duration')); return }
      resolve(duration)
    })
    proc.on('error', reject)
  })
}

interface VideoInfo {
  duration: number
  /** Display dimensions, i.e. with any rotation metadata already applied. */
  width: number
  height: number
  hasAudio: boolean
}

function ffprobeVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath]
    const proc = spawn(ffprobeStatic.path, args)
    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', code => {
      if (code !== 0) { reject(new Error('ffprobe failed')); return }
      try {
        const parsed = JSON.parse(out) as {
          format?: { duration?: string }
          streams?: {
            codec_type?: string
            width?: number
            height?: number
            tags?: { rotate?: string }
            side_data_list?: { rotation?: number }[]
          }[]
        }
        const video = parsed.streams?.find(s => s.codec_type === 'video')
        const duration = parseFloat(parsed.format?.duration ?? '')
        if (!video?.width || !video.height || isNaN(duration)) {
          reject(new Error('Could not read video info')); return
        }
        const rotation =
          Number(video.tags?.rotate ?? video.side_data_list?.find(s => s.rotation != null)?.rotation ?? 0)
        const turned = Math.abs(rotation) % 180 === 90
        resolve({
          duration,
          width: turned ? video.height : video.width,
          height: turned ? video.width : video.height,
          hasAudio: parsed.streams?.some(s => s.codec_type === 'audio') ?? false,
        })
      } catch {
        reject(new Error('Could not parse ffprobe output'))
      }
    })
    proc.on('error', reject)
  })
}

function timeToSeconds(t: string): number {
  const [h, m, s] = t.split(':')
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(s)
}

// --- smart cut detection ----------------------------------------------------

type CutReason = 'pause' | 'scene' | 'fixed' | 'start'

interface CutCandidate {
  time: number
  reason: 'pause' | 'scene'
  /** How good a cut this is on its own merits, before distance to target. */
  weight: number
}

/** Anything quieter than this for at least MIN_PAUSE counts as a speech pause. */
const SILENCE_DB = -30
const MIN_PAUSE = 0.28
const SCENE_THRESHOLD = 0.4
/** How far from the target length we will move a cut to land on a natural break. */
const CUT_TOLERANCE_RATIO = 0.35
const MIN_TOLERANCE = 2
const MAX_TOLERANCE = 12
/** Shorter than one frame at any sane frame rate — see where this is used. */
const SEGMENT_NUDGE = 0.02

function runFfmpegAnalysis(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`ffmpeg analysis exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

/**
 * Speech pauses, from silencedetect. Cutting in the middle of a pause is what
 * makes a clip feel like it was meant to end there.
 */
async function detectPauses(inputPath: string): Promise<CutCandidate[]> {
  const { stderr } = await runFfmpegAnalysis([
    '-hide_banner', '-nostats',
    '-i', inputPath,
    '-vn',
    '-af', `silencedetect=noise=${SILENCE_DB}dB:d=${MIN_PAUSE}`,
    '-f', 'null', '-',
  ])

  const candidates: CutCandidate[] = []
  let openedAt: number | null = null
  for (const line of stderr.split('\n')) {
    const start = line.match(/silence_start:\s*(-?[\d.]+)/)
    if (start) { openedAt = parseFloat(start[1]); continue }
    const end = line.match(/silence_end:\s*([\d.]+)/)
    if (end && openedAt !== null) {
      const stop = parseFloat(end[1])
      const length = stop - openedAt
      candidates.push({
        time: (openedAt + stop) / 2,
        reason: 'pause',
        // A longer pause is a more decisive break in the delivery
        weight: 1 + Math.min(0.5, length / 4),
      })
      openedAt = null
    }
  }
  return candidates
}

/**
 * Visual cuts, from the scene score. Analysed on a downscaled, decimated copy —
 * we only need to know where the frame changes, not what it looks like.
 */
async function detectScenes(inputPath: string): Promise<CutCandidate[]> {
  const { stdout } = await runFfmpegAnalysis([
    '-hide_banner', '-nostats',
    '-i', inputPath,
    '-an',
    '-vf', `scale=-2:180,fps=8,select='gt(scene\\,${SCENE_THRESHOLD})',metadata=print:file=-`,
    '-f', 'null', '-',
  ])

  const candidates: CutCandidate[] = []
  for (const line of stdout.split('\n')) {
    const match = line.match(/pts_time:([\d.]+)/)
    if (match) candidates.push({ time: parseFloat(match[1]), reason: 'scene', weight: 0.85 })
  }
  return candidates
}

/**
 * Walks the video in target-length steps, snapping each cut to the best natural
 * break within tolerance. Falls back to an exact cut when nothing is nearby.
 */
function chooseCutPoints(
  duration: number,
  clipLength: number,
  candidates: CutCandidate[]
): { time: number; reason: CutReason }[] {
  const sorted = [...candidates].sort((a, b) => a.time - b.time)
  const tolerance = clamp(clipLength * CUT_TOLERANCE_RATIO, MIN_TOLERANCE, MAX_TOLERANCE)

  const cuts: { time: number; reason: CutReason }[] = [{ time: 0, reason: 'start' }]
  let cursor = 0

  // Leave the tail as one clip rather than emitting a stub at the end
  while (duration - cursor > clipLength * 1.35) {
    const target = cursor + clipLength
    const low = Math.max(cursor + clipLength * 0.4, target - tolerance)
    const high = Math.min(duration, target + tolerance)

    let best: CutCandidate | null = null
    let bestScore = -Infinity
    for (const candidate of sorted) {
      if (candidate.time < low) continue
      if (candidate.time > high) break
      const score = candidate.weight - Math.abs(candidate.time - target) / tolerance
      if (score > bestScore) { bestScore = score; best = candidate }
    }

    const next = best ? { time: best.time, reason: best.reason as CutReason } : { time: target, reason: 'fixed' as const }
    cuts.push(next)
    cursor = next.time
  }

  return cuts
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

async function processJob(jobId: string, clipLength: number, smart: boolean): Promise<void> {
  const dir = path.join(TMP_ROOT, jobId)
  const inputPath = path.join(dir, 'input.mp4')
  const clipsDir = path.join(dir, 'clips')
  fs.mkdirSync(clipsDir, { recursive: true })

  const job = jobs.get(jobId)
  if (!job) return

  let totalDuration = 0
  let hasAudio = true
  try {
    const info = await ffprobeVideoInfo(inputPath)
    totalDuration = info.duration
    hasAudio = info.hasAudio
    job.sourceDuration = info.duration
    job.width = info.width
    job.height = info.height
  } catch {
    // Progress percentage stays at 0 until completion if probing fails
  }

  // --- decide where to cut --------------------------------------------------

  let cutPoints: { time: number; reason: CutReason }[] = []
  if (smart && totalDuration > 0) {
    job.phase = 'analyzing'
    const candidates: CutCandidate[] = []

    if (hasAudio) {
      try {
        candidates.push(...await detectPauses(inputPath))
      } catch (err) {
        console.warn('Pause detection failed, continuing without it:', err)
      }
    }
    job.progress = 50

    try {
      candidates.push(...await detectScenes(inputPath))
    } catch (err) {
      console.warn('Scene detection failed, continuing without it:', err)
    }

    cutPoints = chooseCutPoints(totalDuration, clipLength, candidates)
  }

  job.phase = 'splitting'
  job.progress = 0

  // --- split ----------------------------------------------------------------

  const keyFrameTimes = cutPoints.slice(1).map(c => c.time)
  // The muxer breaks on the first keyframe strictly *after* the segment time, so
  // a cut that lands exactly on a frame boundary would be skipped to the next
  // keyframe. Ask a hair early; the forced keyframe is still the first match.
  const segmentTimes = keyFrameTimes.map(t => Math.max(0.001, t - SEGMENT_NUDGE))

  await new Promise<void>((resolve, reject) => {
    const args = ['-i', inputPath]

    if (keyFrameTimes.length > 0) {
      // The segment muxer can only break on a keyframe, so re-encode and force
      // one at each chosen point — otherwise cuts drift to the nearest GOP
      // boundary and land back in the middle of a word.
      args.push(
        '-map', '0:v:0', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '160k',
        '-force_key_frames', keyFrameTimes.map(t => t.toFixed(3)).join(','),
        '-segment_times', segmentTimes.map(t => t.toFixed(3)).join(','),
      )
    } else {
      // No smart cuts requested (or nothing to go on) — the fast stream copy
      args.push('-c', 'copy', '-map', '0', '-segment_time', String(clipLength))
    }

    args.push(
      '-f', 'segment',
      '-reset_timestamps', '1',
      path.join(clipsDir, 'output_%03d.mp4'),
    )

    const proc = spawn(ffmpegPath as unknown as string, args)
    proc.stderr.on('data', (chunk: Buffer) => {
      const match = chunk.toString().match(/time=(\d\d:\d\d:\d\d\.\d+)/)
      if (match && totalDuration > 0) {
        job.progress = Math.min(99, Math.round((timeToSeconds(match[1]) / totalDuration) * 100))
      }
    })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
    proc.on('error', reject)
  })

  const files = fs.readdirSync(clipsDir).filter(f => SEGMENT_FILENAME_RE.test(f)).sort()
  const clips: ClipInfo[] = []
  // Accumulated clip lengths are the ground truth for where a clip sits in the
  // source: the segment muxer does not always land exactly on the requested
  // time, and the editor positions its timeline from startTime.
  let cursor = 0
  for (let i = 0; i < files.length; i++) {
    let duration = clipLength
    try {
      duration = await ffprobeDuration(path.join(clipsDir, files[i]))
    } catch {
      // fall back to the requested clip length if probing an individual clip fails
    }

    const requested = cutPoints[i]
    // Only claim a natural cut if the split actually happened where we asked
    const landedOnCut = requested != null && Math.abs(requested.time - cursor) < 0.5

    clips.push({
      filename: files[i],
      index: i,
      startTime: cursor,
      duration,
      cutReason: i === 0 ? 'start' : landedOnCut ? requested.reason : 'fixed',
    })
    cursor += duration
  }

  job.naturalCuts = clips.filter(c => c.cutReason === 'pause' || c.cutReason === 'scene').length

  job.clips = clips
  job.progress = 100
  job.status = 'done'

  setTimeout(() => {
    fs.rm(dir, { recursive: true, force: true }, () => {})
    jobs.delete(jobId)
  }, 60 * 60 * 1000)
}

shortsRouter.post(
  '/api/shorts/split',
  (req, _res, next) => { req.jobId = crypto.randomUUID(); next() },
  upload.single('video'),
  (req, res) => {
    const jobId = req.jobId
    if (!jobId || !req.file) { res.status(400).json({ error: 'No video uploaded' }); return }

    const clipLength = Number(req.body.clipLength) || 60
    const smart = req.body.smartCuts !== 'false'
    jobs.set(jobId, { status: 'processing', progress: 0, phase: smart ? 'analyzing' : 'splitting' })

    processJob(jobId, clipLength, smart).catch(err => {
      console.error('Shorts split error:', err)
      const job = jobs.get(jobId)
      if (job) { job.status = 'error'; job.error = 'Processing failed. Please try a different video.' }
    })

    res.json({ jobId })
  }
)

shortsRouter.get('/api/shorts/split/:jobId/status', (req, res) => {
  if (!JOB_ID_RE.test(req.params.jobId)) { res.status(400).json({ error: 'Invalid job id' }); return }
  const job = jobs.get(req.params.jobId)
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }
  res.json(job)
})

interface OverlaySpec {
  /** Seconds from the start of the edited clip. */
  start: number
  end: number
}

interface RenderSpec {
  index: number
  start: number
  duration: number
  overlays: OverlaySpec[]
}

const overlayStorage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const dir = path.join(TMP_ROOT, String(req.params.jobId), 'overlays', req.renderId!)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  // Ordered by field index so the filter graph can line them up with the spec
  filename: (_req, file, cb) => cb(null, `${path.basename(file.fieldname)}.png`),
})

const uploadOverlays = multer({
  storage: overlayStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_OVERLAYS },
  fileFilter: (_req, file, cb) => cb(null, /^overlay_\d{1,2}$/.test(file.fieldname)),
})

function parseRenderSpec(raw: unknown, sourceDuration: number): RenderSpec {
  if (typeof raw !== 'string') throw new Error('Missing edit spec')
  const spec = JSON.parse(raw) as Partial<RenderSpec>
  const index = Number(spec.index)
  const start = Number(spec.start)
  const duration = Number(spec.duration)
  if (!Number.isInteger(index) || index < 0) throw new Error('Invalid clip index')
  if (!isFinite(start) || start < 0) throw new Error('Invalid start time')
  if (!isFinite(duration) || duration <= 0 || duration > MAX_RENDER_DURATION) {
    throw new Error('Invalid clip duration')
  }
  if (sourceDuration > 0 && start >= sourceDuration) throw new Error('Start is past the end of the video')

  const overlays = (Array.isArray(spec.overlays) ? spec.overlays : []).slice(0, MAX_OVERLAYS).map(o => ({
    start: Math.max(0, Number(o?.start) || 0),
    end: Math.min(duration, isFinite(Number(o?.end)) ? Number(o.end) : duration),
  }))

  return {
    index,
    start,
    // Never ask ffmpeg for footage past the end of the source
    duration: sourceDuration > 0 ? Math.min(duration, sourceDuration - start) : duration,
    overlays,
  }
}

function buildRenderArgs(
  inputPath: string,
  overlayPaths: string[],
  spec: RenderSpec,
  outputPath: string,
  size?: { width: number; height: number }
): string[] {
  const args = ['-y', '-ss', String(spec.start), '-i', inputPath]
  for (const p of overlayPaths) args.push('-i', p)
  args.push('-t', String(spec.duration))

  if (overlayPaths.length > 0) {
    const scale = size ? `scale=${size.width}:${size.height}` : 'null'
    const chain: string[] = []
    let base = '0:v'
    overlayPaths.forEach((_, i) => {
      const { start, end } = spec.overlays[i] ?? { start: 0, end: spec.duration }
      const out = `v${i}`
      chain.push(`[${i + 1}:v]${scale},format=rgba[o${i}]`)
      chain.push(`[${base}][o${i}]overlay=0:0:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'[${out}]`)
      base = out
    })
    args.push('-filter_complex', chain.join(';'), '-map', `[${base}]`)
  } else {
    args.push('-map', '0:v:0')
  }

  args.push(
    '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    outputPath
  )
  return args
}

async function processRender(
  jobId: string,
  renderId: string,
  spec: RenderSpec,
  overlayPaths: string[]
): Promise<void> {
  const render = renders.get(renderId)
  if (!render) return

  const dir = path.join(TMP_ROOT, jobId)
  const inputPath = path.join(dir, 'input.mp4')
  const job = jobs.get(jobId)
  const size = job?.width && job.height ? { width: job.width, height: job.height } : undefined
  const filename = `edited_${spec.index}_${crypto.randomBytes(6).toString('hex')}.mp4`
  const outputPath = path.join(dir, 'clips', filename)

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, buildRenderArgs(inputPath, overlayPaths, spec, outputPath, size))
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr = (stderr + text).slice(-4000)
      const match = text.match(/time=(\d\d:\d\d:\d\d\.\d+)/)
      if (match && spec.duration > 0) {
        render.progress = Math.min(99, Math.round((timeToSeconds(match[1]) / spec.duration) * 100))
      }
    })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`))
    })
    proc.on('error', reject)
  })

  render.filename = filename
  render.progress = 100
  render.status = 'done'

  fs.rm(path.join(dir, 'overlays', renderId), { recursive: true, force: true }, () => {})
}

shortsRouter.post(
  '/api/shorts/split/:jobId/render',
  (req, res, next) => {
    const jobId = String(req.params.jobId)
    if (!JOB_ID_RE.test(jobId)) { res.status(400).json({ error: 'Invalid job id' }); return }
    if (!jobs.has(jobId)) { res.status(404).json({ error: 'Job not found or expired' }); return }
    req.renderId = crypto.randomUUID()
    next()
  },
  uploadOverlays.any(),
  (req, res) => {
    const jobId = String(req.params.jobId)
    const renderId = req.renderId!

    let spec: RenderSpec
    try {
      spec = parseRenderSpec(req.body.spec, jobs.get(jobId)?.sourceDuration ?? 0)
    } catch (err) {
      fs.rm(path.join(TMP_ROOT, jobId, 'overlays', renderId), { recursive: true, force: true }, () => {})
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid edit spec' })
      return
    }

    // Sort by field index so overlay_0, overlay_1, ... line up with spec.overlays
    const overlayPaths = (req.files as Express.Multer.File[] ?? [])
      .sort((a, b) => Number(a.fieldname.split('_')[1]) - Number(b.fieldname.split('_')[1]))
      .map(f => f.path)

    renders.set(renderId, { status: 'processing', progress: 0 })
    // Matches the parent job's lifetime — the rendered file is deleted with its dir
    setTimeout(() => renders.delete(renderId), 60 * 60 * 1000)

    processRender(jobId, renderId, spec, overlayPaths).catch(err => {
      console.error('Shorts render error:', err)
      const render = renders.get(renderId)
      if (render) { render.status = 'error'; render.error = 'Could not render your edit. Please try again.' }
    })

    res.json({ renderId })
  }
)

shortsRouter.get('/api/shorts/split/:jobId/render/:renderId/status', (req, res) => {
  const { jobId, renderId } = req.params
  if (!JOB_ID_RE.test(jobId) || !JOB_ID_RE.test(renderId)) { res.status(400).json({ error: 'Invalid id' }); return }
  const render = renders.get(renderId)
  if (!render) { res.status(404).json({ error: 'Render not found' }); return }
  res.json(render)
})

shortsRouter.get('/api/shorts/split/:jobId/clips/:filename', (req, res) => {
  const { jobId, filename } = req.params
  if (!JOB_ID_RE.test(jobId) || !CLIP_FILENAME_RE.test(filename)) { res.status(400).send('Invalid request'); return }
  const filePath = path.join(TMP_ROOT, jobId, 'clips', filename)
  if (!fs.existsSync(filePath)) { res.status(404).send('Not found'); return }
  res.sendFile(filePath, { dotfiles: 'allow' })
})
