import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X, Plus, Trash2, Play, Pause, Type, AlertCircle, Scissors } from 'lucide-react'

export interface TextOverlay {
  id: string
  text: string
  /** Centre of the text box, as a percentage of the frame. */
  xPct: number
  yPct: number
  /** Font size as a percentage of frame height, so it scales with the export. */
  sizePct: number
  color: string
  outline: boolean
  /** Seconds from the start of the clip. */
  start: number
  end: number
}

export interface ClipEdit {
  startTime: number
  endTime: number
  overlays: TextOverlay[]
}

interface Props {
  jobId: string
  clipIndex: number
  clipNumber: number
  /** Object URL for the full source video — lets the editor extend past the clip's bounds. */
  sourceURL: string
  sourceDuration: number
  frameWidth: number
  frameHeight: number
  edit: ClipEdit
  /** The other clips' ranges, drawn faintly for context. */
  siblings: { start: number; end: number }[]
  onClose: () => void
  onSaved: (result: { url: string; edit: ClipEdit }) => void
}

const MIN_CLIP = 1
const MAX_CLIP = 15 * 60
const FONT_STACK = 'Inter, system-ui, sans-serif'
const FONT_WEIGHT = 800
const LINE_HEIGHT = 1.15
const TEXT_MAX_WIDTH = 0.86
/** Cap the rasterised overlay so a 4K source does not produce an enormous PNG. */
const MAX_RASTER_HEIGHT = 2160

const COLORS = ['#ffffff', '#f5a524', '#34d399', '#ff5f5f', '#000000']

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatPrecise(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) { lines.push(''); continue }
    let line = words[0]
    for (const word of words.slice(1)) {
      if (ctx.measureText(`${line} ${word}`).width <= maxWidth) line += ` ${word}`
      else { lines.push(line); line = word }
    }
    lines.push(line)
  }
  return lines
}

async function rasterizeOverlay(overlay: TextOverlay, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not render text overlay')

  const fontSize = (overlay.sizePct / 100) * height
  const font = `${FONT_WEIGHT} ${fontSize}px ${FONT_STACK}`
  // Without this the canvas silently falls back to a system face and the
  // export stops matching the preview.
  try { await document.fonts.load(font) } catch { /* fall back to the system face */ }

  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  const lines = wrapLines(ctx, overlay.text, canvas.width * TEXT_MAX_WIDTH)
  const lineStep = fontSize * LINE_HEIGHT
  const cx = (overlay.xPct / 100) * canvas.width
  const cy = (overlay.yPct / 100) * canvas.height
  const top = cy - ((lines.length - 1) * lineStep) / 2

  lines.forEach((line, i) => {
    const y = top + i * lineStep
    if (overlay.outline) {
      ctx.lineWidth = fontSize * 0.16
      ctx.strokeStyle = overlay.color === '#000000' ? '#ffffff' : '#000000'
      ctx.strokeText(line, cx, y)
    }
    ctx.fillStyle = overlay.color
    ctx.fillText(line, cx, y)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not render text overlay')), 'image/png')
  })
}

export default function ClipTimelineEditor({
  jobId, clipIndex, clipNumber, sourceURL, sourceDuration,
  frameWidth, frameHeight, edit, siblings, onClose, onSaved,
}: Props) {
  const [startTime, setStartTime] = useState(edit.startTime)
  const [endTime, setEndTime] = useState(edit.endTime)
  const [overlays, setOverlays] = useState<TextOverlay[]>(edit.overlays)
  const [selectedId, setSelectedId] = useState<string | null>(edit.overlays[0]?.id ?? null)
  const [playhead, setPlayhead] = useState(edit.startTime)
  const [playing, setPlaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [dragMode, setDragMode] = useState<'start' | 'end' | 'move' | 'seek' | null>(null)
  const [textDragId, setTextDragId] = useState<string | null>(null)
  const grabOffset = useRef(0)
  // Lets a click inside the window seek, while a drag moves the window
  const dragMoved = useRef(false)

  const duration = endTime - startTime
  const aspect = frameWidth > 0 && frameHeight > 0 ? frameWidth / frameHeight : 16 / 9

  // Overlay font sizes are a percentage of frame height, so the preview needs its pixel height
  const [previewHeight, setPreviewHeight] = useState(0)
  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setPreviewHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // --- playback, constrained to the selected window -------------------------

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const video = videoRef.current
      if (video) {
        if (video.currentTime >= endTime) {
          video.pause()
          video.currentTime = startTime
          setPlayhead(startTime)
          setPlaying(false)
          return
        }
        setPlayhead(video.currentTime)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, startTime, endTime])

  function seekTo(t: number) {
    const clamped = clamp(t, 0, sourceDuration)
    setPlayhead(clamped)
    if (videoRef.current) videoRef.current.currentTime = clamped
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime
        setPlayhead(startTime)
      }
      void video.play()
      setPlaying(true)
    }
  }

  // --- timeline dragging ----------------------------------------------------

  function secondsAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return clamp(((clientX - rect.left) / rect.width) * sourceDuration, 0, sourceDuration)
  }

  function beginDrag(mode: 'start' | 'end' | 'move' | 'seek', e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    grabOffset.current = secondsAt(e.clientX) - startTime
    dragMoved.current = false
    setDragMode(mode)
    if (mode === 'seek') seekTo(secondsAt(e.clientX))
    if (playing) { videoRef.current?.pause(); setPlaying(false) }
  }

  useEffect(() => {
    if (!dragMode) return

    function onMove(e: PointerEvent) {
      dragMoved.current = true
      const t = secondsAt(e.clientX)
      if (dragMode === 'start') {
        const next = clamp(t, Math.max(0, endTime - MAX_CLIP), endTime - MIN_CLIP)
        setStartTime(next)
        seekTo(next)
      } else if (dragMode === 'end') {
        const next = clamp(t, startTime + MIN_CLIP, Math.min(sourceDuration, startTime + MAX_CLIP))
        setEndTime(next)
        seekTo(next)
      } else if (dragMode === 'move') {
        const length = endTime - startTime
        const nextStart = clamp(t - grabOffset.current, 0, sourceDuration - length)
        setStartTime(nextStart)
        setEndTime(nextStart + length)
        seekTo(nextStart)
      } else {
        seekTo(t)
      }
    }
    function onUp(e: PointerEvent) {
      // A click inside the window is a seek, not a zero-distance move
      if (dragMode === 'move' && !dragMoved.current) seekTo(secondsAt(e.clientX))
      setDragMode(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // secondsAt/seekTo are re-created every render; the values they close over
    // are already listed, so listing them too would just re-bind the listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragMode, startTime, endTime, sourceDuration])

  // --- dragging text on the preview ----------------------------------------

  useEffect(() => {
    if (!textDragId) return

    function onMove(e: PointerEvent) {
      const rect = previewRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98)
      const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98)
      setOverlays(prev => prev.map(o => o.id === textDragId ? { ...o, xPct, yPct } : o))
    }
    function onUp() { setTextDragId(null) }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [textDragId])

  // --- overlay list ---------------------------------------------------------

  function addOverlay() {
    const overlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: 'Your text here',
      xPct: 50,
      yPct: 78,
      sizePct: 7,
      color: '#ffffff',
      outline: true,
      start: 0,
      end: duration,
    }
    setOverlays(prev => [...prev, overlay])
    setSelectedId(overlay.id)
  }

  function updateOverlay(id: string, patch: Partial<TextOverlay>) {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  function removeOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const visibleOverlays = useMemo(() => {
    const t = playhead - startTime
    return overlays.filter(o => t >= o.start - 0.001 && t <= Math.min(o.end, duration) + 0.001)
  }, [overlays, playhead, startTime, duration])

  // --- save -----------------------------------------------------------------

  async function save() {
    setSaving(true)
    setError(null)
    setRenderProgress(0)

    if (playing) { videoRef.current?.pause(); setPlaying(false) }

    try {
      const active = overlays.filter(o => o.text.trim().length > 0)
      const rasterHeight = Math.min(frameHeight || 1080, MAX_RASTER_HEIGHT)
      const rasterWidth = Math.round(rasterHeight * aspect)

      const form = new FormData()
      form.append('spec', JSON.stringify({
        index: clipIndex,
        start: startTime,
        duration,
        overlays: active.map(o => ({
          start: clamp(o.start, 0, duration),
          end: clamp(o.end, 0, duration),
        })),
      }))

      for (let i = 0; i < active.length; i++) {
        const blob = await rasterizeOverlay(active[i], rasterWidth, rasterHeight)
        form.append(`overlay_${i}`, blob, `overlay_${i}.png`)
      }

      const res = await fetch(`/api/shorts/split/${jobId}/render`, { method: 'POST', body: form })
      const data = await res.json() as { renderId?: string; error?: string }
      if (!res.ok || !data.renderId) throw new Error(data.error ?? 'Could not start the render')

      let status: { status: string; progress: number; filename?: string; error?: string }
      do {
        await new Promise(r => setTimeout(r, 800))
        const poll = await fetch(`/api/shorts/split/${jobId}/render/${data.renderId}/status`)
        if (!poll.ok) throw new Error('Lost connection to the render job')
        status = await poll.json()
        if (status.status === 'processing') setRenderProgress(status.progress)
      } while (status.status === 'processing')

      if (status.status === 'error' || !status.filename) {
        throw new Error(status.error ?? 'Could not render your edit')
      }

      onSaved({
        url: `/api/shorts/split/${jobId}/clips/${status.filename}`,
        edit: { startTime, endTime, overlays },
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Could not render your edit')
      setSaving(false)
    }
  }

  const pct = (t: number) => sourceDuration > 0 ? (t / sourceDuration) * 100 : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(4,4,6,0.82)', backdropFilter: 'blur(3px)' }}
      onPointerDown={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        className="w-full rounded-2xl flex flex-col"
        style={{
          maxWidth: 1120,
          maxHeight: '92vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-center gap-2.5">
            <Scissors size={15} color="var(--accent)" />
            <span className="display-sm text-sm">Edit clip {clipNumber}</span>
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {formatPrecise(startTime)} – {formatPrecise(endTime)} · {duration.toFixed(1)}s
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-muted)' }}
            aria-label="Close editor"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex gap-6 items-start">
            {/* Preview */}
            <div className="flex-1 min-w-0">
              <div
                ref={previewRef}
                className="relative w-full rounded-xl overflow-hidden select-none"
                style={{ aspectRatio: String(aspect), background: '#000', maxHeight: '46vh', margin: '0 auto' }}
              >
                <video
                  ref={videoRef}
                  src={sourceURL}
                  playsInline
                  onLoadedMetadata={() => seekTo(startTime)}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: 'contain' }}
                />
                {visibleOverlays.map(o => {
                  const fontSize = (o.sizePct / 100) * previewHeight
                  const isSelected = o.id === selectedId
                  return (
                    <div
                      key={o.id}
                      onPointerDown={e => {
                        e.preventDefault()
                        setSelectedId(o.id)
                        setTextDragId(o.id)
                      }}
                      className="absolute cursor-move"
                      style={{
                        left: `${o.xPct}%`,
                        top: `${o.yPct}%`,
                        transform: 'translate(-50%,-50%)',
                        maxWidth: `${TEXT_MAX_WIDTH * 100}%`,
                        fontFamily: FONT_STACK,
                        fontWeight: FONT_WEIGHT,
                        fontSize: `${fontSize}px`,
                        lineHeight: LINE_HEIGHT,
                        color: o.color,
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        WebkitTextStroke: o.outline
                          ? `${fontSize * 0.08}px ${o.color === '#000000' ? '#ffffff' : '#000000'}`
                          : undefined,
                        paintOrder: 'stroke fill',
                        outline: isSelected ? '1px dashed rgba(245,165,36,0.8)' : undefined,
                        outlineOffset: 4,
                      }}
                    >
                      {o.text}
                    </div>
                  )
                })}
              </div>

              {/* Transport */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={togglePlay}
                  className="flex items-center justify-center rounded-full shrink-0 transition-opacity hover:opacity-80"
                  style={{ width: 34, height: 34, background: 'var(--accent-tint)', border: '1px solid var(--accent-tint-strong)', color: 'var(--accent)' }}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                </button>
                <span className="text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                  {formatPrecise(playhead)} <span style={{ color: 'var(--ink-faint)' }}>/ {formatTime(sourceDuration)}</span>
                </span>
                <span className="text-xs ml-auto" style={{ color: 'var(--ink-faint)' }}>
                  Drag the handles to extend or trim · drag text to reposition
                </span>
              </div>
            </div>

            {/* Text panel */}
            <div className="shrink-0" style={{ width: 300 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Type size={14} color="var(--accent)" />
                  <span className="display-sm text-sm">Text</span>
                </div>
                <button
                  onClick={addOverlay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent-tint)', color: 'var(--accent-soft)', border: '1px solid var(--accent-tint-strong)' }}
                >
                  <Plus size={12} />
                  Add text
                </button>
              </div>

              {overlays.length === 0 && (
                <p className="text-xs leading-relaxed p-4 rounded-xl" style={{ color: 'var(--ink-faint)', background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                  No text on this clip yet. Add a hook or caption — it gets burned into the exported video.
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                {overlays.map(o => {
                  const isSelected = o.id === selectedId
                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className="rounded-xl p-3 cursor-pointer transition-all"
                      style={{
                        background: isSelected ? 'var(--surface-3)' : 'var(--surface-2)',
                        border: `1px solid ${isSelected ? 'var(--accent-tint-strong)' : 'var(--border-soft)'}`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <textarea
                          value={o.text}
                          rows={2}
                          onChange={e => updateOverlay(o.id, { text: e.target.value })}
                          onFocus={() => setSelectedId(o.id)}
                          className="flex-1 min-w-0 text-xs rounded-lg px-2.5 py-2 resize-none outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); removeOverlay(o.id) }}
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
                          style={{ background: 'var(--surface)', color: 'var(--ink-faint)' }}
                          aria-label="Remove text"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {isSelected && (
                        <div className="mt-3 flex flex-col gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs shrink-0" style={{ color: 'var(--ink-faint)', width: 32 }}>Size</span>
                            <input
                              type="range"
                              min={3}
                              max={18}
                              step={0.5}
                              value={o.sizePct}
                              onChange={e => updateOverlay(o.id, { sizePct: Number(e.target.value) })}
                              className="flex-1 min-w-0"
                              style={{ accentColor: 'var(--accent)' }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs shrink-0" style={{ color: 'var(--ink-faint)', width: 32 }}>Color</span>
                            <div className="flex gap-1.5">
                              {COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={e => { e.stopPropagation(); updateOverlay(o.id, { color: c }) }}
                                  className="rounded-full transition-transform hover:scale-110"
                                  style={{
                                    width: 18,
                                    height: 18,
                                    background: c,
                                    border: o.color === c ? '2px solid var(--accent)' : '1px solid var(--line)',
                                  }}
                                  aria-label={`Color ${c}`}
                                />
                              ))}
                            </div>
                            <label className="flex items-center gap-1.5 ml-auto text-xs cursor-pointer" style={{ color: 'var(--ink-muted)' }}>
                              <input
                                type="checkbox"
                                checked={o.outline}
                                onChange={e => updateOverlay(o.id, { outline: e.target.checked })}
                                style={{ accentColor: 'var(--accent)' }}
                              />
                              Outline
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs shrink-0" style={{ color: 'var(--ink-faint)', width: 32 }}>Show</span>
                            <input
                              type="number"
                              min={0}
                              max={duration}
                              step={0.1}
                              value={Number(o.start.toFixed(1))}
                              onChange={e => updateOverlay(o.id, { start: clamp(Number(e.target.value), 0, duration) })}
                              className="w-16 text-xs rounded-lg px-2 py-1.5 outline-none tabular-nums"
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                            />
                            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>to</span>
                            <input
                              type="number"
                              min={0}
                              max={duration}
                              step={0.1}
                              value={Number(Math.min(o.end, duration).toFixed(1))}
                              onChange={e => updateOverlay(o.id, { end: clamp(Number(e.target.value), 0, duration) })}
                              className="w-16 text-xs rounded-lg px-2 py-1.5 outline-none tabular-nums"
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                            />
                            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>s</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow" style={{ fontSize: 10 }}>Source timeline</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                {formatPrecise(startTime)} – {formatPrecise(endTime)}
                <span style={{ color: 'var(--ink-faint)' }}> · {duration.toFixed(1)}s</span>
              </span>
            </div>

            <div
              ref={trackRef}
              onPointerDown={e => beginDrag('seek', e)}
              className="relative w-full rounded-lg select-none"
              style={{ height: 62, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', cursor: 'pointer', touchAction: 'none' }}
            >
              {/* Neighbouring clips, for context */}
              {siblings.map((s, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${pct(s.start)}%`,
                    width: `${pct(s.end - s.start)}%`,
                    background: 'rgba(250,250,247,0.03)',
                    borderLeft: '1px solid var(--line-faint)',
                  }}
                />
              ))}

              {/* The clip window */}
              <div
                onPointerDown={e => beginDrag('move', e)}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${pct(startTime)}%`,
                  width: `${pct(duration)}%`,
                  background: 'rgba(245,165,36,0.14)',
                  borderTop: '1px solid var(--accent)',
                  borderBottom: '1px solid var(--accent)',
                  cursor: 'grab',
                }}
              />

              {/* Handles */}
              {(['start', 'end'] as const).map(side => (
                <div
                  key={side}
                  onPointerDown={e => beginDrag(side, e)}
                  className="absolute top-0 bottom-0 flex items-center justify-center"
                  style={{
                    left: `${pct(side === 'start' ? startTime : endTime)}%`,
                    width: 14,
                    marginLeft: -7,
                    cursor: 'ew-resize',
                    touchAction: 'none',
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{ width: 6, height: '78%', background: 'var(--accent)', boxShadow: '0 0 0 2px rgba(10,10,11,0.6)' }}
                  />
                </div>
              ))}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: `${pct(playhead)}%`, width: 1, background: 'var(--ink)', opacity: 0.85 }}
              />
            </div>

            <div className="flex justify-between mt-1.5">
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-faint)' }}>0:00</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-faint)' }}>{formatTime(sourceDuration)}</span>
            </div>
          </div>

          {error && (
            <div
              className="mt-4 flex items-start gap-2 p-3.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080' }}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border-soft)' }}
        >
          {saving ? (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-3)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, renderProgress)}%`,
                    background: 'linear-gradient(90deg,#f5a524,#ffb63f)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--ink-muted)' }}>
                Rendering {renderProgress}%
              </span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              Text is burned into the exported clip
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="btn-pill btn-ghost btn-sm"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn-pill btn-primary btn-sm">
              {saving ? 'Rendering…' : 'Apply changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
