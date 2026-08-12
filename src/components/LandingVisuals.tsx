import { Upload, Scissors, Sparkles, TrendingUp } from 'lucide-react'
import PhoneFrame from './PhoneFrame'
import PlatformLogo from './PlatformLogo'

const panel: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
}

/** Step 1 — a long file landing in the dropzone, platform badges orbiting it. */
export function UploadVisual() {
  return (
    <div className="relative h-[150px] flex items-center justify-center">
      <div
        className="w-[190px] flex flex-col items-center gap-2 py-5"
        style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}
      >
        <Upload size={18} color="var(--accent-soft)" />
        <div className="h-1.5 w-20 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="h-1.5 w-12 rounded-full" style={{ background: 'var(--surface-3)' }} />
      </div>

      {[
        { id: 'youtube', pos: { left: 6, top: 14 } },
        { id: 'tiktok', pos: { right: 10, top: 6 } },
        { id: 'instagram', pos: { right: 2, bottom: 20 } },
      ].map(({ id, pos }) => (
        <div
          key={id}
          className="absolute flex items-center justify-center rounded-full"
          style={{ ...pos, width: 30, height: 30, background: '#111', border: '1px solid var(--border)' }}
        >
          <PlatformLogo id={id} size={15} />
        </div>
      ))}
    </div>
  )
}

/** Step 2 — one timeline sliced into evenly-cut clips. */
export function SplitVisual() {
  return (
    <div className="h-[150px] flex flex-col justify-center gap-3 px-2">
      <div className="h-8 rounded-lg w-full" style={{ background: 'linear-gradient(90deg,#2a1f14,#8a6b46)' }} />
      <div className="flex items-center gap-1.5">
        <Scissors size={13} color="var(--accent-soft)" className="shrink-0" />
        <div className="flex-1 tick-rule" />
      </div>
      <div className="flex gap-1.5">
        {['#4a3826', '#25353f', '#3f2f4a', '#59301c'].map((c, i) => (
          <div
            key={i}
            className="flex-1 rounded-md"
            style={{ height: 34, background: `linear-gradient(160deg,${c},${c}aa)` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Step 3 — finished vertical clip sitting in a phone, ready to post. */
export function PublishVisual() {
  return (
    <div className="h-[150px] flex items-center justify-center gap-3">
      <PhoneFrame width={72}>
        <div className="w-full h-full" style={{ background: 'linear-gradient(170deg,#0d1114,#1f2d33 45%,#456068)' }}>
          <div className="absolute inset-x-0 flex justify-center" style={{ top: '42%' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 9,
                color: '#fff',
                WebkitTextStroke: '0.5px rgba(0,0,0,0.9)',
                paintOrder: 'stroke fill',
              }}
            >
              READY
            </span>
          </div>
        </div>
      </PhoneFrame>
      <div className="flex flex-col gap-2">
        {['youtube', 'tiktok', 'instagram'].map(id => (
          <div
            key={id}
            className="flex items-center gap-2 px-2.5 py-1.5"
            style={{ ...panel, borderRadius: 'var(--r-pill)' }}
          >
            <PlatformLogo id={id} size={13} />
            <div className="h-1 w-8 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Feature card — the dashed stat grid plus a small bar chart. */
export function AnalyticsVisual() {
  return (
    <div className="mt-4 flex flex-col gap-3 px-1">
      <div className="cell-grid grid-cols-3" style={{ borderRadius: 'var(--r-md)' }}>
        {['55', '7K', '3'].map(v => (
          <div key={v} className="px-3 py-2.5">
            <div className="h-1 w-8 rounded-full mb-1.5" style={{ background: 'var(--surface-3)' }} />
            <p className="numeric" style={{ fontSize: 18, lineHeight: 1 }}>{v}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1.5 h-14 px-1">
        {[38, 62, 30, 78, 52, 88, 44].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, background: i === 5 ? 'var(--accent)' : 'var(--surface-3)' }}
          />
        ))}
      </div>
    </div>
  )
}

/** Feature card — AI suggestion rows the way Insights renders them. */
export function AiIdeasVisual() {
  return (
    <div className="mt-4 flex flex-col gap-2 px-1">
      {[
        { kind: 'Title', w: '86%' },
        { kind: 'Hook', w: '70%' },
        { kind: 'Caption', w: '92%' },
      ].map(({ kind, w }) => (
        <div key={kind} className="p-2.5" style={panel}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ fontSize: 9, background: 'rgba(255,0,0,0.15)', color: '#ff6b6b' }}
            >
              YouTube
            </span>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ fontSize: 9, background: 'var(--accent-tint-strong)', color: 'var(--accent-soft)' }}
            >
              {kind}
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ width: w, background: 'var(--surface-3)' }} />
        </div>
      ))}
      <div className="flex justify-end">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          <Sparkles size={9} /> Generate
        </span>
      </div>
    </div>
  )
}

/** Feature card — the composer's ranked clip slots. */
export function ComposerVisual() {
  return (
    <div className="mt-4 flex flex-col gap-2 px-1">
      {[
        { n: '#3', c: '#59301c' },
        { n: '#2', c: '#3f2f4a' },
        { n: '#1', c: '#4a3826' },
      ].map(({ n, c }) => (
        <div key={n} className="flex items-center gap-2.5 p-2" style={panel}>
          <span
            className="shrink-0 px-2 py-0.5 rounded-md"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 11,
              background: 'var(--accent-tint)',
              color: 'var(--accent-soft)',
            }}
          >
            {n}
          </span>
          <div className="h-7 w-10 rounded shrink-0" style={{ background: `linear-gradient(160deg,${c},${c}99)` }} />
          <div className="h-1.5 flex-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
        </div>
      ))}
    </div>
  )
}

/** Feature card — the studio's clip grid in miniature. */
export function StudioVisual() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2.5">
      {[
        { c: '#4a3826', t: 6 },
        { c: '#25353f', t: 0 },
        { c: '#3f2f4a', t: 6 },
      ].map(({ c, t }, i) => (
        <PhoneFrame key={i} width={54} bezel={i === 1} style={{ marginTop: t }}>
          <div className="w-full h-full" style={{ background: `linear-gradient(170deg,${c},${c}bb)` }} />
        </PhoneFrame>
      ))}
      <div className="flex flex-col gap-1.5 ml-1">
        <TrendingUp size={14} color="var(--accent-soft)" />
        <div className="h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="h-1 w-7 rounded-full" style={{ background: 'var(--surface-3)' }} />
      </div>
    </div>
  )
}
