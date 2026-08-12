import { Link } from 'react-router-dom'
import { Compass, ArrowRight, Scissors, Layers, Lightbulb, BarChart2 } from 'lucide-react'
import ShortsShowcase from '../components/ShortsShowcase'
import PlatformLogo from '../components/PlatformLogo'
import {
  UploadVisual,
  SplitVisual,
  PublishVisual,
  AnalyticsVisual,
  AiIdeasVisual,
  ComposerVisual,
  StudioVisual,
} from '../components/LandingVisuals'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Platforms', href: '#platforms' },
]

const BENEFITS = [
  { title: 'Cut once, post everywhere', body: 'One long upload becomes a full week of vertical clips.' },
  { title: 'Stop guessing at hooks', body: 'Title and hook ideas grounded in your own performance data.' },
  { title: 'Both platforms, one page', body: 'YouTube and Instagram numbers side by side, no tab juggling.' },
  { title: 'Runs on your machine', body: 'Your footage is processed locally. Tokens never leave your disk.' },
]

const STEPS = [
  {
    n: 1,
    title: 'Drop in a long video',
    body: 'Any format — MP4, MOV, AVI, WebM. Nothing gets uploaded to a third party.',
    visual: <UploadVisual />,
  },
  {
    n: 2,
    title: 'Split it into clips',
    body: 'Pick a clip length and Shorts Studio cuts the whole video into vertical pieces.',
    visual: <SplitVisual />,
  },
  {
    n: 3,
    title: 'Review and publish',
    body: 'Preview every clip in a phone frame, download the ones you want, post them.',
    visual: <PublishVisual />,
  },
]

const FEATURES = [
  {
    icon: <Scissors size={16} />,
    title: 'Shorts Studio',
    body: 'Auto-split a long video into ready-to-post vertical clips.',
    visual: <StudioVisual />,
    to: '/shorts-studio',
  },
  {
    icon: <Layers size={16} />,
    title: 'Shorts Composer',
    body: 'Stitch clips into rankings, countdowns and before-and-afters.',
    visual: <ComposerVisual />,
    to: '/shorts-composer',
  },
  {
    icon: <Lightbulb size={16} />,
    title: 'AI content ideas',
    body: 'Titles, hooks and captions generated from your real numbers.',
    visual: <AiIdeasVisual />,
    to: '/insights',
  },
  {
    icon: <BarChart2 size={16} />,
    title: 'Real analytics',
    body: 'Live subscriber, view and engagement data from connected accounts.',
    visual: <AnalyticsVisual />,
    to: '/analytics',
  },
]

export default function Landing() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ---------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-50 px-6 pt-5">
        <nav
          className="mx-auto max-w-5xl flex items-center gap-6 px-5 py-3"
          style={{
            background: 'rgba(20,20,22,0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-pill)',
          }}
        >
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{ background: 'var(--accent)', width: 26, height: 26 }}
            >
              <Compass size={13} color="#0a0a0b" />
            </span>
            <span
              className="text-white"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em' }}
            >
              ashlr<span style={{ color: 'var(--accent-soft)' }}>compass</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 mx-auto">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="px-3.5 py-1.5 text-sm transition-colors hover:text-white"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  color: 'var(--ink-muted)',
                  borderRadius: 'var(--r-pill)',
                }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <Link to="/dashboard" className="btn-pill btn-primary btn-sm ml-auto md:ml-0 shrink-0">
            Open dashboard
          </Link>
        </nav>
      </header>

      {/* -------------------------------------------------------- Hero */}
      <section className="relative px-6 pt-14 pb-16 overflow-hidden">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          {/* Left — the readout */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <span className="bearing">N 042°</span>
              <span className="flex-1 tick-rule" style={{ maxWidth: 190 }} />
            </div>

            <h1 className="display mb-6" style={{ fontSize: 'clamp(36px,5.2vw,64px)' }}>
              Find the clips<br />worth posting
            </h1>

            <p className="mb-8 text-base leading-relaxed" style={{ color: 'var(--ink-muted)', maxWidth: 470 }}>
              Ashlr Compass splits your long uploads into vertical clips, stitches them
              into rankings and countdowns, and points you at the hooks your own numbers
              say are working.
            </p>

            <div className="flex items-center gap-3 mb-10 flex-wrap">
              <Link to="/dashboard" className="btn-pill btn-primary">
                Set a heading
                <ArrowRight size={15} />
              </Link>
              <Link to="/connect" className="btn-pill btn-ghost">
                Connect an account
              </Link>
            </div>

            <div id="platforms" className="scroll-mt-32">
              <p className="eyebrow mb-3">Works with</p>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { id: 'youtube', label: 'YouTube' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'tiktok', label: 'TikTok' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center gap-2" style={{ opacity: id === 'tiktok' ? 0.4 : 1 }}>
                    <PlatformLogo id={id} size={18} />
                    <span
                      className="text-sm"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--ink-body)' }}
                    >
                      {label}
                    </span>
                    {id === 'tiktok' && (
                      <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>soon</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — clips read off the bezel */}
          <div className="relative">
            <ShortsShowcase variant="cluster" centerWidth={168} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Benefits */}
      <section className="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-5xl cell-grid grid-cols-2 md:grid-cols-4">
          {BENEFITS.map(b => (
            <div key={b.title} className="p-6">
              <h3 className="display-sm mb-2" style={{ fontSize: 17 }}>{b.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- How it works */}
      <section id="how" className="px-6 pb-24 scroll-mt-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="display mb-3" style={{ fontSize: 'clamp(28px,4vw,46px)' }}>
              How it works
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Three steps from a raw recording to a posted clip.
            </p>
          </div>

          <div className="cell-grid grid-cols-1 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="p-6">
                <span className="step-badge mb-4">{s.n}</span>
                <h3 className="display-sm mb-1.5" style={{ fontSize: 18 }}>{s.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink-muted)' }}>{s.body}</p>
                {s.visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Features */}
      <section id="features" className="px-6 pb-24 scroll-mt-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Feature suite</p>
            <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,46px)' }}>
              Everything in one workspace
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <Link
                key={f.title}
                to={f.to}
                className="card p-6 transition-colors hover:border-[#3a3a3a] group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 30, height: 30, background: 'var(--accent-tint)', color: 'var(--accent-soft)' }}
                  >
                    {f.icon}
                  </span>
                  <h3 className="display-sm" style={{ fontSize: 18 }}>{f.title}</h3>
                  <ArrowRight
                    size={15}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    color="var(--accent-soft)"
                  />
                </div>
                <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--ink-muted)' }}>{f.body}</p>
                {f.visual}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Closing CTA */}
      <section className="px-6 pb-20">
        <div
          className="relative mx-auto max-w-5xl px-8 py-14 text-center overflow-hidden"
          style={{
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent-tint-strong)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <div className="compass-arc" style={{ width: 700, height: 700, left: '50%', top: -240, transform: 'translateX(-50%)' }} />
          <div className="relative">
            <h2 className="display mb-4" style={{ fontSize: 'clamp(26px,3.6vw,42px)' }}>
              Start cutting
            </h2>
            <p className="text-sm mb-8 mx-auto" style={{ color: 'var(--ink-muted)', maxWidth: 420 }}>
              Connect a channel and your real numbers show up on the dashboard straight away.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/dashboard" className="btn-pill btn-primary">
                Open the dashboard
                <ArrowRight size={15} />
              </Link>
              <Link to="/shorts-studio" className="btn-pill btn-ghost">
                Try Shorts Studio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Footer */}
      <footer className="px-6 pb-10">
        <div
          className="mx-auto max-w-5xl flex items-center justify-between pt-6 flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-md"
              style={{ background: 'var(--accent)', width: 20, height: 20 }}
            >
              <Compass size={10} color="#0a0a0b" />
            </span>
            <span
              className="text-sm"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-body)' }}
            >
              ashlrcompass
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
            Runs locally · Read-only access to your analytics
          </p>
        </div>
      </footer>
    </div>
  )
}
