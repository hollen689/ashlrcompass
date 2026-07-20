import { useState, useRef, useEffect } from 'react'
import { Upload, Scissors, Download, CheckCircle, AlertCircle, Settings2 } from 'lucide-react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import PageHeader from '../components/PageHeader'

const coreURL = '/ffmpeg-core.js'
const wasmURL = '/ffmpeg-core.wasm'

interface GeneratedClip {
  id: number
  url: string
  startTime: number
  endTime: number
  duration: number
  filename: string
}

type Step = 'upload' | 'processing' | 'results'

const CLIP_LENGTHS = [15, 30, 45, 60] as const
type ClipLength = (typeof CLIP_LENGTHS)[number]

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function formatFileSize(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function ShortsStudio() {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [clipLength, setClipLength] = useState<ClipLength>(60)
  const [clips, setClips] = useState<GeneratedClip[]>([])
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const clipURLsRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL)
      clipURLsRef.current.forEach(u => URL.revokeObjectURL(u))
    }
  }, [videoURL])

  function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoURL(url)
    setVideoDuration(0)
    setError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) handleFile(file)
  }

  const estimatedClips = videoDuration > 0 ? Math.floor(videoDuration / clipLength) : 0

  async function generateClips() {
    if (!videoFile) return
    setStep('processing')
    setProgress(0)
    setError(null)
    clipURLsRef.current.forEach(u => URL.revokeObjectURL(u))
    clipURLsRef.current = []

    try {
      if (!ffmpegRef.current) {
        setProgressLabel('Loading video processor...')
        const ffmpeg = new FFmpeg()
        ffmpeg.on('progress', ({ progress: p }) => {
          setProgress(10 + Math.round(p * 80))
        })
        await ffmpeg.load({ coreURL, wasmURL })
        ffmpegRef.current = ffmpeg
      }

      const ffmpeg = ffmpegRef.current

      setProgressLabel('Reading video file...')
      setProgress(5)

      const inputData = await fetchFile(videoFile)
      await ffmpeg.writeFile('input.mp4', inputData)

      setProgressLabel(`Splitting into ${clipLength}s clips...`)
      setProgress(10)

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-c', 'copy',
        '-map', '0',
        '-segment_time', String(clipLength),
        '-f', 'segment',
        '-reset_timestamps', '1',
        'output_%03d.mp4',
      ])

      setProgressLabel('Reading generated clips...')
      setProgress(92)

      const generatedClips: GeneratedClip[] = []
      let i = 0
      while (true) {
        const name = `output_${String(i).padStart(3, '0')}.mp4`
        try {
          const data = await ffmpeg.readFile(name) as Uint8Array
          const blob = new Blob([data], { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)
          clipURLsRef.current.push(url)
          const startTime = i * clipLength
          const endTime = Math.min(startTime + clipLength, videoDuration)
          generatedClips.push({
            id: i,
            url,
            startTime,
            endTime,
            duration: endTime - startTime,
            filename: `short_${i + 1}_${formatTime(startTime).replace(':', 'm')}s.mp4`,
          })
          await ffmpeg.deleteFile(name)
          i++
        } catch {
          break
        }
      }

      await ffmpeg.deleteFile('input.mp4')

      setClips(generatedClips)
      setProgress(100)
      setStep('results')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Processing failed. Please try a different video.')
      setStep('upload')
    }
  }

  function downloadClip(clip: GeneratedClip) {
    const a = document.createElement('a')
    a.href = clip.url
    a.download = clip.filename
    a.click()
  }

  function downloadAll() {
    clips.forEach((clip, i) => setTimeout(() => downloadClip(clip), i * 200))
  }

  function reset() {
    clipURLsRef.current.forEach(u => URL.revokeObjectURL(u))
    clipURLsRef.current = []
    if (videoURL) URL.revokeObjectURL(videoURL)
    setStep('upload')
    setVideoFile(null)
    setVideoURL(null)
    setVideoDuration(0)
    setClips([])
    setError(null)
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Shorts Studio"
        subtitle="Upload a long video and split it into multiple clips for TikTok, Reels & YouTube Shorts"
      />

      {step === 'upload' && (
        <div className="max-w-2xl">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !videoFile && fileRef.current?.click()}
            className="relative rounded-2xl flex flex-col items-center justify-center transition-all"
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : videoFile ? 'rgba(59,130,246,0.3)' : '#333333'}`,
              background: dragging ? 'rgba(59,130,246,0.06)' : videoFile ? 'rgba(59,130,246,0.03)' : '#171717',
              minHeight: videoFile ? 'auto' : 280,
              padding: videoFile ? 24 : 48,
              cursor: videoFile ? 'default' : 'pointer',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {!videoFile ? (
              <>
                <div
                  className="flex items-center justify-center rounded-2xl mb-5"
                  style={{ width: 64, height: 64, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  <Upload size={26} color="#3b82f6" />
                </div>
                <p className="text-lg font-semibold text-white mb-2">Drop your video here</p>
                <p className="text-sm mb-4" style={{ color: '#737373' }}>MP4, MOV, AVI, WebM — any format</p>
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
                >
                  Browse files
                </button>
              </>
            ) : (
              <div className="w-full">
                <video
                  ref={previewVideoRef}
                  src={videoURL!}
                  onLoadedMetadata={() => {
                    if (previewVideoRef.current) setVideoDuration(previewVideoRef.current.duration)
                  }}
                  controls
                  className="w-full rounded-xl mb-4"
                  style={{ maxHeight: 320, background: '#000', display: 'block' }}
                />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{videoFile.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#737373' }}>
                      {formatFileSize(videoFile.size)}
                      {videoDuration > 0 && ` · ${formatDuration(videoDuration)}`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {videoFile && videoDuration > 0 && (
            <div
              className="mt-4 rounded-2xl p-5"
              style={{ background: '#171717', border: '1px solid #262626' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={15} color="#3b82f6" />
                <span className="text-sm font-semibold text-white">Clip settings</span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#737373' }}>Clip length</p>
              <div className="flex gap-2 mb-4">
                {CLIP_LENGTHS.map(len => (
                  <button
                    key={len}
                    onClick={() => setClipLength(len)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: clipLength === len ? 'rgba(59,130,246,0.15)' : '#262626',
                      border: `1px solid ${clipLength === len ? 'rgba(59,130,246,0.4)' : '#333333'}`,
                      color: clipLength === len ? '#93c5fd' : '#8a8a8a',
                    }}
                  >
                    {len}s
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs mb-5" style={{ color: '#737373' }}>
                <span>Video duration: <span className="text-white">{formatDuration(videoDuration)}</span></span>
                <span>Estimated clips: <span className="text-white">{estimatedClips}</span></span>
              </div>
              <button
                onClick={generateClips}
                disabled={estimatedClips === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
              >
                Generate {estimatedClips} clip{estimatedClips !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {error && (
            <div
              className="mt-4 flex items-start gap-2 p-4 rounded-xl text-sm"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080' }}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className="max-w-xl">
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: '#171717', border: '1px solid #262626' }}
          >
            <div
              className="flex items-center justify-center rounded-2xl mb-5"
              style={{ width: 64, height: 64, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <Scissors size={26} color="#3b82f6" />
            </div>
            <p className="text-lg font-semibold text-white mb-1">Processing your video</p>
            <p className="text-sm mb-1" style={{ color: '#737373' }}>{videoFile?.name}</p>
            <p className="text-xs mb-6" style={{ color: '#3b82f6' }}>{progressLabel}</p>
            <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 6, background: '#262626' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: '#737373' }}>{progress}%</p>
            <p className="text-xs mt-4" style={{ color: '#525252' }}>
              Processing happens entirely in your browser — large files may take a minute
            </p>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
              >
                <CheckCircle size={12} />
                {clips.length} clip{clips.length !== 1 ? 's' : ''} generated
              </div>
              <span className="text-xs" style={{ color: '#737373' }}>{videoFile?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                New video
              </button>
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
              >
                <Download size={14} />
                Download all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#171717', border: '1px solid #262626' }}
              >
                <video
                  src={clip.url}
                  controls
                  className="w-full"
                  style={{ maxHeight: 220, background: '#000', display: 'block' }}
                />
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Clip {clip.id + 1}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#737373' }}>
                      {formatTime(clip.startTime)} – {formatTime(clip.endTime)} · {formatDuration(clip.duration)}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadClip(clip)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    <Download size={12} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-2xl p-5"
            style={{ background: '#171717', border: '1px solid #262626' }}
          >
            <p className="text-sm font-semibold text-white mb-3">Platform tips for your clips</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { platform: 'TikTok', color: '#69C9D0', tip: 'Keep clips under 45s for max reach. Add captions — 85% of TikTok is watched without sound.' },
                { platform: 'YouTube Shorts', color: '#FF4444', tip: 'Vertical 9:16 required. First 3 seconds must hook — avoid slow intros.' },
                { platform: 'Instagram Reels', color: '#E1306C', tip: 'Music is key on Reels. Post between 9AM–12PM on weekdays for best reach.' },
              ].map(({ platform, color, tip }) => (
                <div key={platform}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold" style={{ color }}>{platform}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#737373' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
