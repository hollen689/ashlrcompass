import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Trophy, ListOrdered, ArrowLeftRight, Shuffle,
  Upload, X, ChevronUp, ChevronDown, Plus,
  Download, Film, AlertCircle, CheckCircle, ArrowLeft,
} from 'lucide-react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import PageHeader from '../components/PageHeader'

const coreURL = '/ffmpeg-core.js'
const wasmURL = '/ffmpeg-core.wasm'

type TemplateId = 'meme-ranking' | 'countdown' | 'before-after' | 'custom'
type Step = 'template' | 'compose' | 'processing' | 'done'

interface Slot {
  id: string
  label: string
  file: File | null
  url: string | null
}

interface Template {
  id: TemplateId
  name: string
  description: string
  icon: React.ElementType
  color: string
  buildSlots: (count: number) => Slot[]
  fixedCount: number | null
  minCount: number
  maxCount: number
}

function makeSlot(label: string): Slot {
  return { id: crypto.randomUUID(), label, file: null, url: null }
}

const TEMPLATES: Template[] = [
  {
    id: 'meme-ranking',
    name: 'Meme Ranking',
    description: 'Rank clips from worst to best — reveal the #1 at the end',
    icon: Trophy,
    color: '#f59e0b',
    buildSlots: (n) => Array.from({ length: n }, (_, i) => makeSlot(`#${n - i}`)),
    fixedCount: null,
    minCount: 3,
    maxCount: 10,
  },
  {
    id: 'countdown',
    name: 'Top 5 Countdown',
    description: 'Count down your top picks from 5 to 1',
    icon: ListOrdered,
    color: '#f5a524',
    buildSlots: () => ['#5', '#4', '#3', '#2', '#1'].map(l => makeSlot(l)),
    fixedCount: 5,
    minCount: 5,
    maxCount: 5,
  },
  {
    id: 'before-after',
    name: 'Before & After',
    description: 'Show a transformation, comparison, or glow-up',
    icon: ArrowLeftRight,
    color: '#22c55e',
    buildSlots: () => ['Before', 'After'].map(l => makeSlot(l)),
    fixedCount: 2,
    minCount: 2,
    maxCount: 2,
  },
  {
    id: 'custom',
    name: 'Custom Mix',
    description: 'Upload any clips in any order with your own labels',
    icon: Shuffle,
    color: '#a855f7',
    buildSlots: (n) => Array.from({ length: n }, (_, i) => makeSlot(`Clip ${i + 1}`)),
    fixedCount: null,
    minCount: 2,
    maxCount: 10,
  },
]

function formatFileSize(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function TemplatePreview({ id }: { id: TemplateId }) {
  const barBase = { display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 } as const

  if (id === 'meme-ranking') {
    return (
      <div style={barBase}>
        {[
          { label: '#3', h: 30, bg: '#cd7f3218', border: '#cd7f3250', color: '#cd7f32' },
          { label: '#1', h: 52, bg: '#ffd70018', border: '#ffd70060', color: '#ffd700' },
          { label: '#2', h: 40, bg: '#c0c0c018', border: '#c0c0c050', color: '#c0c0c0' },
        ].map(bar => (
          <div
            key={bar.label}
            className="flex-1 rounded-t-md flex items-start justify-center pt-1"
            style={{ height: bar.h, background: bar.bg, border: `1px solid ${bar.border}` }}
          >
            <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.label}</span>
          </div>
        ))}
      </div>
    )
  }

  if (id === 'countdown') {
    return (
      <div style={{ ...barBase, alignItems: 'center' }}>
        {['5', '4', '3', '2', '1'].map((n, i) => (
          <div
            key={n}
            className="flex-1 rounded-lg flex items-center justify-center font-bold"
            style={{
              height: 18 + i * 8,
              background: i === 4 ? '#f5a52430' : '#f5a52412',
              border: `1px solid #f5a524${i === 4 ? '80' : '30'}`,
              color: i === 4 ? '#f7bb59' : '#f5a524',
              fontSize: 10 + i,
            }}
          >
            {n}
          </div>
        ))}
      </div>
    )
  }

  if (id === 'before-after') {
    return (
      <div className="flex rounded-lg overflow-hidden" style={{ height: 56 }}>
        <div
          className="flex-1 flex flex-col items-center justify-center gap-1"
          style={{ background: 'linear-gradient(160deg,#2a2a2a,#1a1a1a)' }}
        >
          <div className="rounded-full" style={{ width: 18, height: 18, background: '#44444470' }} />
          <span className="text-[9px] font-semibold tracking-wide" style={{ color: 'var(--ink-muted)' }}>BEFORE</span>
        </div>
        <div className="flex items-center justify-center px-1" style={{ background: '#111111' }}>
          <ArrowLeftRight size={11} color="#22c55e" />
        </div>
        <div
          className="flex-1 flex flex-col items-center justify-center gap-1"
          style={{ background: 'linear-gradient(160deg,#22c55e40,#16a34a20)' }}
        >
          <div className="rounded-full" style={{ width: 18, height: 18, background: 'linear-gradient(135deg,#22c55e,#4ade80)' }} />
          <span className="text-[9px] font-semibold tracking-wide" style={{ color: '#4ade80' }}>AFTER</span>
        </div>
      </div>
    )
  }

  // custom mix
  const colors = ['#a855f7', '#f5a524', '#f59e0b', '#22c55e']
  return (
    <div className="grid grid-cols-4 gap-1" style={{ height: 56 }}>
      {colors.map(c => (
        <div key={c} className="rounded-md" style={{ background: `${c}22`, border: `1px solid ${c}45` }} />
      ))}
    </div>
  )
}

export default function ShortsComposer() {
  const [step, setStep] = useState<Step>('template')
  const [template, setTemplate] = useState<Template | null>(null)
  const [slotCount, setSlotCount] = useState(5)
  const [slots, setSlots] = useState<Slot[]>([])
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ffmpegRef = useRef<FFmpeg | null>(null)
  const outputUrlRef = useRef<string | null>(null)
  const slotUrlsRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      slotUrlsRef.current.forEach(u => URL.revokeObjectURL(u))
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
    }
  }, [])

  function selectTemplate(t: Template) {
    const count = t.fixedCount ?? slotCount
    setTemplate(t)
    setSlots(t.buildSlots(count))
    setStep('compose')
    setError(null)
  }

  function updateSlotCount(t: Template, n: number) {
    setSlotCount(n)
    setSlots(t.buildSlots(n))
  }

  function assignFile(slotId: string, file: File) {
    const url = URL.createObjectURL(file)
    slotUrlsRef.current.push(url)
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, file, url } : s))
  }

  function removeFile(slotId: string) {
    setSlots(prev => prev.map(s => {
      if (s.id !== slotId) return s
      if (s.url) URL.revokeObjectURL(s.url)
      return { ...s, file: null, url: null }
    }))
  }

  function moveSlot(index: number, dir: -1 | 1) {
    setSlots(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  function addSlot() {
    setSlots(prev => [...prev, makeSlot(`Clip ${prev.length + 1}`)])
  }

  function removeSlot(slotId: string) {
    setSlots(prev => {
      const s = prev.find(x => x.id === slotId)
      if (s?.url) URL.revokeObjectURL(s.url)
      return prev.filter(x => x.id !== slotId)
    })
  }

  function updateLabel(slotId: string, label: string) {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, label } : s))
  }

  const readySlots = slots.filter(s => s.file !== null)
  const allReady = readySlots.length === slots.length && slots.length >= 2

  async function stitch() {
    setStep('processing')
    setProgress(0)
    setError(null)

    try {
      if (!ffmpegRef.current) {
        setProgressLabel('Loading video processor...')
        const ffmpeg = new FFmpeg()
        ffmpeg.on('progress', ({ progress: p }) => {
          setProgress(20 + Math.round(p * 70))
        })
        await ffmpeg.load({ coreURL, wasmURL })
        ffmpegRef.current = ffmpeg
      }

      const ffmpeg = ffmpegRef.current

      setProgressLabel('Loading clips...')
      setProgress(5)

      const filenames: string[] = []
      for (let i = 0; i < slots.length; i++) {
        const name = `clip_${i}.mp4`
        filenames.push(name)
        setProgressLabel(`Loading clip ${i + 1} of ${slots.length}...`)
        setProgress(5 + Math.round((i / slots.length) * 15))
        const data = await fetchFile(slots[i].file!)
        await ffmpeg.writeFile(name, data)
      }

      setProgressLabel('Stitching clips together...')
      setProgress(20)

      const concatList = filenames.map(f => `file '${f}'`).join('\n')
      await ffmpeg.writeFile('concat.txt', concatList)

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp4',
      ])

      setProgressLabel('Finalizing...')
      setProgress(92)

      const data = await ffmpeg.readFile('output.mp4') as Uint8Array
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      outputUrlRef.current = url
      setOutputUrl(url)

      // Cleanup FFmpeg FS
      for (const f of filenames) { try { await ffmpeg.deleteFile(f) } catch {} }
      try { await ffmpeg.deleteFile('concat.txt') } catch {}
      try { await ffmpeg.deleteFile('output.mp4') } catch {}

      setProgress(100)
      setStep('done')
    } catch (err) {
      console.error(err)
      setError(
        'Stitching failed. Make sure all clips are the same format (e.g., all generated from Shorts Studio). ' +
        (err instanceof Error ? err.message : '')
      )
      setStep('compose')
    }
  }

  function download() {
    if (!outputUrl) return
    const a = document.createElement('a')
    a.href = outputUrl
    a.download = `${template?.name.toLowerCase().replace(/\s+/g, '-') ?? 'short'}-${Date.now()}.mp4`
    a.click()
  }

  function reset() {
    slotUrlsRef.current.forEach(u => URL.revokeObjectURL(u))
    slotUrlsRef.current = []
    if (outputUrlRef.current) { URL.revokeObjectURL(outputUrlRef.current); outputUrlRef.current = null }
    setOutputUrl(null)
    setTemplate(null)
    setSlots([])
    setSlotCount(5)
    setStep('template')
    setError(null)
    setProgress(0)
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Shorts Composer"
        subtitle="Stitch clips together into a single Short — rankings, countdowns, comparisons and more"
      />

      {/* Template selection */}
      {step === 'template' && (
        <div className="max-w-2xl">
          <p className="text-sm mb-5" style={{ color: 'var(--ink-muted)' }}>Choose a format for your Short</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className="text-left rounded-2xl p-5 transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="flex items-center justify-center rounded-xl shrink-0"
                      style={{ width: 40, height: 40, background: `${t.color}18`, border: `1px solid ${t.color}40` }}
                    >
                      <Icon size={18} color={t.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="display-sm text-sm">{t.name}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{t.description}</p>
                    </div>
                  </div>
                  <div className="rounded-lg p-2 mb-2" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <TemplatePreview id={t.id} />
                  </div>
                  {!t.fixedCount && (
                    <p className="text-xs" style={{ color: t.color }}>
                      {t.minCount}–{t.maxCount} clips
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Compose */}
      {step === 'compose' && template && (
        <div className="max-w-2xl">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--ink-muted)' }}
          >
            <ArrowLeft size={14} />
            Change template
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: `${template.color}18`, border: `1px solid ${template.color}40` }}
            >
              <template.icon size={16} color={template.color} />
            </div>
            <div>
              <p className="display-sm text-sm">{template.name}</p>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {readySlots.length}/{slots.length} clips uploaded
              </p>
            </div>

            {/* Slot count picker for variable templates */}
            {!template.fixedCount && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Clips:</span>
                <div className="flex gap-1">
                  {Array.from(
                    { length: template.maxCount - template.minCount + 1 },
                    (_, i) => i + template.minCount
                  ).map(n => (
                    <button
                      key={n}
                      onClick={() => updateSlotCount(template, n)}
                      className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: slots.length === n ? `${template.color}20` : '#262626',
                        border: `1px solid ${slots.length === n ? template.color + '60' : '#333333'}`,
                        color: slots.length === n ? template.color : '#737373',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Slots */}
          <div className="flex flex-col gap-2 mb-4">
            {slots.map((slot, i) => (
              <SlotRow
                key={slot.id}
                slot={slot}
                index={i}
                total={slots.length}
                templateColor={template.color}
                isCustom={template.id === 'custom'}
                onFile={(f) => assignFile(slot.id, f)}
                onRemoveFile={() => removeFile(slot.id)}
                onMoveUp={() => moveSlot(i, -1)}
                onMoveDown={() => moveSlot(i, 1)}
                onRemoveSlot={() => removeSlot(slot.id)}
                onLabelChange={(l) => updateLabel(slot.id, l)}
              />
            ))}
          </div>

          {/* Add slot (custom only) */}
          {template.id === 'custom' && slots.length < template.maxCount && (
            <button
              onClick={addSlot}
              className="flex items-center gap-2 w-full py-3 rounded-xl text-sm transition-all mb-4 hover:opacity-80"
              style={{ background: '#1a1a1a', border: '1px dashed #333333', color: 'var(--ink-muted)' }}
            >
              <Plus size={14} />
              Add clip slot
            </button>
          )}

          {error && (
            <div
              className="flex items-start gap-2 p-4 rounded-xl text-sm mb-4"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff8080' }}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={stitch}
            disabled={!allReady}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}cc)` }}
          >
            {allReady
              ? `Stitch ${slots.length} clips into one Short`
              : `Upload all ${slots.length} clips to continue`}
          </button>

          <p className="text-xs text-center mt-3" style={{ color: 'var(--ink-faint)' }}>
            For best results use clips with the same resolution and codec (e.g., from Shorts Studio)
          </p>
        </div>
      )}

      {/* Processing */}
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
              <Film size={26} color="#f5a524" />
            </div>
            <p className="display-sm mb-1" style={{ fontSize: 20 }}>Stitching your Short</p>
            <p className="text-xs mb-6" style={{ color: '#f5a524' }}>{progressLabel}</p>
            <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 6, background: '#262626' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg,#f5a524,#ffb63f)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{progress}%</p>
            <p className="text-xs mt-4" style={{ color: 'var(--ink-faint)' }}>
              Processing happens entirely in your browser
            </p>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && outputUrl && template && (
        <div className="max-w-xl">
          <div
            className="flex items-center gap-2 mb-4 px-3.5 py-2 rounded-full text-xs font-medium w-fit"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <CheckCircle size={13} />
            Short created — {slots.length} clips stitched
          </div>

          <div
            className="rounded-2xl overflow-hidden mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <video
              src={outputUrl}
              controls
              className="w-full"
              style={{ maxHeight: 400, background: '#000', display: 'block' }}
            />
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="display-sm text-sm">{template.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                  {slots.map(s => s.label).join(' → ')}
                </p>
              </div>
              <button
                onClick={download}
                className="btn-pill btn-primary btn-sm"
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
            style={{ background: '#1c1c1c', color: '#8a8a8a', border: '1px solid #2a2a2a' }}
          >
            Create another Short
          </button>
        </div>
      )}
    </div>
  )
}

interface SlotRowProps {
  slot: Slot
  index: number
  total: number
  templateColor: string
  isCustom: boolean
  onFile: (f: File) => void
  onRemoveFile: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemoveSlot: () => void
  onLabelChange: (l: string) => void
}

function SlotRow({
  slot, index, total, templateColor, isCustom,
  onFile, onRemoveFile, onMoveUp, onMoveDown, onRemoveSlot, onLabelChange,
}: SlotRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('video/')) onFile(file)
  }, [onFile])

  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ background: 'var(--surface)', border: `1px solid ${slot.file ? templateColor + '30' : '#262626'}` }}
    >
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 rounded transition-opacity disabled:opacity-20 hover:opacity-60"
        >
          <ChevronUp size={13} color="#737373" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 rounded transition-opacity disabled:opacity-20 hover:opacity-60"
        >
          <ChevronDown size={13} color="#737373" />
        </button>
      </div>

      {/* Label */}
      {isCustom ? (
        <input
          value={slot.label}
          onChange={e => onLabelChange(e.target.value)}
          className="text-xs font-semibold rounded-lg px-2 py-1 w-20 shrink-0 outline-none"
          style={{ background: '#262626', border: '1px solid #333', color: '#d4d4d4' }}
          maxLength={12}
        />
      ) : (
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 text-center"
          style={{
            background: `${templateColor}15`,
            border: `1px solid ${templateColor}35`,
            color: templateColor,
            minWidth: 40,
          }}
        >
          {slot.label}
        </span>
      )}

      {/* Drop zone / preview */}
      <div
        className="flex-1 rounded-lg overflow-hidden"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !slot.file && inputRef.current?.click()}
        style={{
          height: 54,
          background: dragging ? `${templateColor}10` : slot.file ? '#0d0d0d' : '#1e1e1e',
          border: `1px dashed ${dragging ? templateColor : slot.file ? 'transparent' : '#333'}`,
          cursor: slot.file ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        {slot.file ? (
          <div className="flex items-center gap-2 px-3 w-full">
            <CheckCircle size={13} color="#34d399" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{slot.file.name}</p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{formatFileSize(slot.file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3">
            <Upload size={12} color="#525252" />
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Drop clip or click</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {slot.file && (
          <button
            onClick={onRemoveFile}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: '#262626' }}
          >
            <X size={12} color="#737373" />
          </button>
        )}
        {isCustom && total > 2 && (
          <button
            onClick={onRemoveSlot}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: '#262626' }}
          >
            <X size={12} color="#ef4444" />
          </button>
        )}
      </div>
    </div>
  )
}
