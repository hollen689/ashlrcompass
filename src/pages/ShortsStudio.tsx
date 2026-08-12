import { useState, useRef, useEffect } from 'react'
import { Upload, Scissors, Download, CheckCircle, AlertCircle, Settings2, SlidersHorizontal, Wand2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PhoneFrame from '../components/PhoneFrame'
import ShortsShowcase from '../components/ShortsShowcase'
import ClipTimelineEditor, { type TextOverlay } from '../components/ClipTimelineEditor'

interface GeneratedClip {
  id: number
  url: string
  startTime: number
  endTime: number
  duration: number
  filename: string
  overlays: TextOverlay[]
  edited: boolean
  cutReason: CutReason
}

type CutReason = 'pause' | 'scene' | 'fixed' | 'start'

interface ShortsJobClip {
  filename: string
  index: number
  startTime: number
  duration: number
  cutReason: CutReason
}

interface ShortsJobStatus {
  status: 'processing' | 'done' | 'error'
  phase?: 'analyzing' | 'splitting'
  progress: number
  error?: string
  clips?: ShortsJobClip[]
  sourceDuration?: number
  width?: number
  height?: number
  naturalCuts?: number
}

const CUT_LABELS: Record<CutReason, string | null> = {
  pause: 'Cut on a pause',
  scene: 'Cut on a scene change',
  fixed: 'Cut at target length',
  start: null,
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

function clipFilename(index: number, startTime: number): string {
  return `short_${index + 1}_${formatTime(startTime).replace(':', 'm')}s.mp4`
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
  const [smartCuts, setSmartCuts] = useState(true)
  const [clips, setClips] = useState<GeneratedClip[]>([])
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })
  const [editingClipId, setEditingClipId] = useState<number | null>(null)
  const [naturalCuts, setNaturalCuts] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL)
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

  function uploadVideo(file: File, length: number, smart: boolean, onUploadProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/shorts/split')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { jobId?: string; error?: string }
            if (data.jobId) resolve(data.jobId)
            else reject(new Error(data.error ?? 'Upload failed'))
          } catch {
            reject(new Error('Upload failed'))
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
      xhr.onerror = () => reject(new Error('Upload failed — check your connection'))

      const formData = new FormData()
      formData.append('video', file)
      formData.append('clipLength', String(length))
      formData.append('smartCuts', String(smart))
      xhr.send(formData)
    })
  }

  async function generateClips() {
    if (!videoFile) return
    setStep('processing')
    setProgress(0)
    setError(null)

    try {
      setProgressLabel('Uploading video...')
      const newJobId = await uploadVideo(videoFile, clipLength, smartCuts, (pct) => setProgress(Math.round(pct * 0.5)))
      setJobId(newJobId)

      setProgress(50)
      setProgressLabel(smartCuts ? 'Listening for natural break points...' : `Splitting into ${clipLength}s clips...`)

      let status: ShortsJobStatus
      do {
        await new Promise(r => setTimeout(r, 1000))
        const res = await fetch(`/api/shorts/split/${newJobId}/status`)
        if (!res.ok) throw new Error('Lost connection to the processing job')
        status = await res.json() as ShortsJobStatus
        if (status.status === 'processing') {
          setProgress(50 + Math.round(status.progress * 0.5))
          setProgressLabel(status.phase === 'analyzing'
            ? 'Listening for natural break points...'
            : `Splitting into ~${clipLength}s clips...`)
        }
      } while (status.status === 'processing')

      if (status.status === 'error') {
        throw new Error(status.error ?? 'Processing failed. Please try a different video.')
      }

      // The editor needs the source dimensions to rasterise text at export scale
      setFrameSize({
        width: status.width ?? previewVideoRef.current?.videoWidth ?? 0,
        height: status.height ?? previewVideoRef.current?.videoHeight ?? 0,
      })
      if (status.sourceDuration) setVideoDuration(status.sourceDuration)

      const generatedClips: GeneratedClip[] = (status.clips ?? []).map(c => ({
        id: c.index,
        url: `/api/shorts/split/${newJobId}/clips/${c.filename}`,
        startTime: c.startTime,
        endTime: c.startTime + c.duration,
        duration: c.duration,
        filename: clipFilename(c.index, c.startTime),
        overlays: [],
        edited: false,
        cutReason: c.cutReason ?? 'fixed',
      }))

      setNaturalCuts(status.naturalCuts ?? 0)

      setClips(generatedClips)
      setProgress(100)
      setStep('results')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : null
      setError(message ? `Processing failed: ${message}` : 'Processing failed. Please try a different video.')
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
    if (videoURL) URL.revokeObjectURL(videoURL)
    setStep('upload')
    setVideoFile(null)
    setVideoURL(null)
    setVideoDuration(0)
    setClips([])
    setError(null)
    setProgress(0)
    setJobId(null)
    setFrameSize({ width: 0, height: 0 })
    setEditingClipId(null)
    setNaturalCuts(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const editingClip = clips.find(c => c.id === editingClipId) ?? null

  function applyEdit(clipId: number, url: string, startTime: number, endTime: number, overlays: TextOverlay[]) {
    setClips(prev => prev.map(c => c.id === clipId
      ? {
          ...c,
          // Cache-bust so the <video> picks up the freshly rendered file
          url: `${url}?v=${Date.now()}`,
          startTime,
          endTime,
          duration: endTime - startTime,
          filename: clipFilename(c.id, startTime),
          overlays,
          edited: true,
        }
      : c
    ))
    setEditingClipId(null)
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
              border: `2px dashed ${dragging ? '#f5a524' : videoFile ? 'rgba(245,165,36,0.3)' : 'var(--line)'}`,
              background: dragging ? 'rgba(245,165,36,0.06)' : videoFile ? 'rgba(245,165,36,0.03)' : 'var(--surface)',
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
                  style={{ width: 64, height: 64, background: 'rgba(245,165,36,0.12)', border: '1px solid rgba(245,165,36,0.3)' }}
                >
                  <Upload size={26} color="#f5a524" />
                </div>
                <p className="display-sm mb-2" style={{ fontSize: 20 }}>Drop your video here</p>
                <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>MP4, MOV, AVI, WebM — any format</p>
                <button
                  className="btn-pill btn-primary"
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
                    <p className="display-sm text-sm">{videoFile.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                      {formatFileSize(videoFile.size)}
                      {videoDuration > 0 && ` · ${formatDuration(videoDuration)}`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    className="text-xs px-3.5 py-1.5 rounded-full transition-opacity hover:opacity-70"
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
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={15} color="#f5a524" />
                <span className="display-sm text-sm">Clip settings</span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>Clip length</p>
              <div className="flex gap-2 mb-4">
                {CLIP_LENGTHS.map(len => (
                  <button
                    key={len}
                    onClick={() => setClipLength(len)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: clipLength === len ? 'rgba(245,165,36,0.15)' : '#262626',
                      border: `1px solid ${clipLength === len ? 'rgba(245,165,36,0.4)' : '#333333'}`,
                      color: clipLength === len ? '#f7bb59' : '#8a8a8a',
                    }}
                  >
                    {len}s
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSmartCuts(v => !v)}
                className="w-full flex items-start gap-3 p-3 rounded-xl mb-4 text-left transition-all"
                style={{
                  background: smartCuts ? 'rgba(245,165,36,0.06)' : '#262626',
                  border: `1px solid ${smartCuts ? 'rgba(245,165,36,0.3)' : '#333333'}`,
                }}
              >
                <div
                  className="shrink-0 rounded-full relative transition-colors"
                  style={{ width: 32, height: 18, background: smartCuts ? 'var(--accent)' : '#3a3a3a', marginTop: 1 }}
                >
                  <div
                    className="absolute rounded-full transition-all"
                    style={{
                      width: 14, height: 14, top: 2, left: smartCuts ? 16 : 2,
                      background: smartCuts ? '#0a0a0b' : '#8a8a8a',
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Wand2 size={12} color={smartCuts ? '#f5a524' : '#8a8a8a'} />
                    <span className="text-sm font-medium" style={{ color: smartCuts ? '#f7bb59' : '#8a8a8a' }}>
                      Smart cuts
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                    {smartCuts
                      ? 'Finds speech pauses and scene changes near your target length so clips start and end cleanly. Slower — the video is re-encoded at the chosen points.'
                      : 'Splits at an exact interval, on the nearest keyframe. Fast, but cuts can land mid-sentence.'}
                  </p>
                </div>
              </button>

              <div className="flex items-center justify-between text-xs mb-5" style={{ color: 'var(--ink-muted)' }}>
                <span>Video duration: <span className="text-white">{formatDuration(videoDuration)}</span></span>
                <span>
                  {smartCuts ? 'Around ' : 'Estimated clips: '}
                  <span className="text-white">{estimatedClips}</span>
                  {smartCuts ? ' clips' : ''}
                </span>
              </div>
              <button
                onClick={generateClips}
                disabled={estimatedClips === 0}
                className="btn-pill btn-primary w-full"
              >
                {smartCuts
                  ? `Generate ~${estimatedClips} clip${estimatedClips !== 1 ? 's' : ''}`
                  : `Generate ${estimatedClips} clip${estimatedClips !== 1 ? 's' : ''}`}
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

      {step === 'upload' && !videoFile && (
        <div className="mt-12">
          <p className="eyebrow text-center mb-1">What you'll get back</p>
          <p className="text-center text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
            Vertical 9:16 clips, ready to post to TikTok, Reels and Shorts
          </p>
          <ShortsShowcase centerWidth={124} />
        </div>
      )}

      {step === 'processing' && (
        <div className="max-w-xl">
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-center rounded-2xl mb-5"
              style={{ width: 64, height: 64, background: 'rgba(245,165,36,0.12)', border: '1px solid rgba(245,165,36,0.3)' }}
            >
              <Scissors size={26} color="#f5a524" />
            </div>
            <p className="display-sm mb-1" style={{ fontSize: 20 }}>Processing your video</p>
            <p className="text-sm mb-1" style={{ color: 'var(--ink-muted)' }}>{videoFile?.name}</p>
            <p className="text-xs mb-6" style={{ color: '#f5a524' }}>{progressLabel}</p>
            <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 6, background: '#262626' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg,#f5a524,#ffb63f)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{progress}%</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ink-faint)' }}>
              Uploading and processing on the server — large files may take a few minutes
            </p>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
              >
                <CheckCircle size={12} />
                {clips.length} clip{clips.length !== 1 ? 's' : ''} generated
              </div>
              {naturalCuts > 0 && (
                <div
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(245,165,36,0.1)', color: '#f7bb59', border: '1px solid rgba(245,165,36,0.2)' }}
                >
                  <Wand2 size={12} />
                  {naturalCuts} cut{naturalCuts !== 1 ? 's' : ''} on a natural break
                </div>
              )}
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{videoFile?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="btn-pill btn-ghost btn-sm"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                New video
              </button>
              <button
                onClick={downloadAll}
                className="btn-pill btn-primary btn-sm"
              >
                <Download size={14} />
                Download all
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 justify-center py-2">
            {clips.map((clip) => (
              <div key={clip.id} className="flex flex-col items-center gap-3">
                <PhoneFrame width={188}>
                  <video
                    src={clip.url}
                    controls
                    playsInline
                    className="w-full h-full"
                    style={{ objectFit: 'cover', background: '#000', display: 'block' }}
                  />
                </PhoneFrame>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="display-sm text-sm">Clip {clip.id + 1}</p>
                    {clip.edited && (
                      <span
                        className="px-1.5 py-0.5 rounded-full"
                        style={{ fontSize: 9, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        EDITED
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {formatTime(clip.startTime)} – {formatTime(clip.endTime)} · {formatDuration(clip.duration)}
                  </p>
                  <p className="text-xs mt-0.5 mb-2 flex items-center justify-center gap-1" style={{ color: 'var(--ink-faint)', minHeight: 16 }}>
                    {!clip.edited && CUT_LABELS[clip.cutReason] && (
                      <>
                        {(clip.cutReason === 'pause' || clip.cutReason === 'scene') && <Wand2 size={10} color="#f5a524" />}
                        {CUT_LABELS[clip.cutReason]}
                      </>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setEditingClipId(clip.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: 'var(--surface-3)', color: 'var(--ink-body)', border: '1px solid var(--border)' }}
                    >
                      <SlidersHorizontal size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => downloadClip(clip)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(245,165,36,0.1)', color: '#f7bb59', border: '1px solid rgba(245,165,36,0.2)' }}
                    >
                      <Download size={12} />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="display-sm text-sm mb-3">Platform tips for your clips</p>
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
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingClip && jobId && videoURL && (
        <ClipTimelineEditor
          jobId={jobId}
          clipIndex={editingClip.id}
          clipNumber={editingClip.id + 1}
          sourceURL={videoURL}
          sourceDuration={videoDuration}
          frameWidth={frameSize.width}
          frameHeight={frameSize.height}
          edit={{
            startTime: editingClip.startTime,
            endTime: editingClip.endTime,
            overlays: editingClip.overlays,
          }}
          siblings={clips.filter(c => c.id !== editingClip.id).map(c => ({ start: c.startTime, end: c.endTime }))}
          onClose={() => setEditingClipId(null)}
          onSaved={({ url, edit }) => applyEdit(editingClip.id, url, edit.startTime, edit.endTime, edit.overlays)}
        />
      )}
    </div>
  )
}
