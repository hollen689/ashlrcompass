import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, ExternalLink, AlertCircle, RefreshCw, Trash2, Plus, Loader } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAccounts, isYouTubeConnected, isInstagramConnected, fmtCount } from '../hooks/useAccounts'

const SVG_PATHS: Record<string, string> = {
  youtube: 'M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.2 5 12 5 12 5s-4.2 0-7 .1c-.4 0-1.2.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.8C6.4 19 12 19 12 19s4.2 0 7-.1c.4 0 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM10 15V9l5.5 3-5.5 3z',
  tiktok: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
}

const PlatformLogo = ({ id, color }: { id: string; color: string }) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill={color}>
    <path d={SVG_PATHS[id] ?? ''} />
  </svg>
)

const OTHER_PLATFORMS = [
  { id: 'tiktok', platform: 'TikTok', color: '#69C9D0' },
  { id: 'twitter', platform: 'X / Twitter', color: '#1DA1F2' },
  { id: 'twitch', platform: 'Twitch', color: '#9146FF' },
  { id: 'linkedin', platform: 'LinkedIn', color: '#0A66C2' },
]

export default function ConnectAccounts() {
  const { accounts, loading, backendDown, refetch, disconnect } = useAccounts()
  const [searchParams, setSearchParams] = useSearchParams()
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showIgSetup, setShowIgSetup] = useState(false)

  const yt = accounts.youtube
  const ig = accounts.instagram
  const ytConnected = isYouTubeConnected(yt)
  const igConnected = isInstagramConnected(ig)
  const connectedCount = [ytConnected, igConnected].filter(Boolean).length

  // Handle return from OAuth
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'youtube') {
      setToast({ type: 'success', msg: 'YouTube connected successfully!' })
      void refetch()
      setSearchParams({})
    } else if (connected === 'instagram') {
      setToast({ type: 'success', msg: 'Instagram connected successfully!' })
      void refetch()
      setSearchParams({})
    } else if (error) {
      const msg = error === 'cancelled' ? 'Authorization was cancelled.' : 'Connection failed — please try again.'
      setToast({ type: 'error', msg })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, refetch])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleDisconnect(platform: string) {
    if (platform === 'youtube') await disconnect('youtube')
    if (platform === 'instagram') await disconnect('instagram')
    setDisconnectTarget(null)
    setToast({ type: 'success', msg: 'Account disconnected.' })
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Connect Accounts"
        subtitle="Link your social media platforms to start tracking real performance data"
      />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{
            background: toast.type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Backend warning */}
      {backendDown && (
        <div
          className="mb-6 flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{ background: 'rgba(255,189,107,0.08)', border: '1px solid rgba(255,189,107,0.2)' }}
        >
          <AlertCircle size={16} color="#ffbd6b" className="shrink-0 mt-0.5" />
          <div style={{ color: '#8a8a8a' }}>
            <span className="text-white font-medium">API server not running.</span>
            {' '}Start it with{' '}
            <code
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: '#262626', color: '#93c5fd' }}
            >
              npm run server
            </code>
            {' '}in a separate terminal, then refresh.
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <p className="text-xs mb-2" style={{ color: '#737373' }}>Connected Platforms</p>
          <p className="text-2xl font-bold" style={{ color: '#34d399' }}>
            {loading ? '–' : connectedCount}
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <p className="text-xs mb-2" style={{ color: '#737373' }}>YouTube Subscribers</p>
          <p className="text-2xl font-bold" style={{ color: '#93c5fd' }}>
            {ytConnected ? fmtCount(yt.subscriberCount) : '–'}
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(225,48,108,0.08)', border: '1px solid rgba(225,48,108,0.2)' }}>
          <p className="text-xs mb-2" style={{ color: '#737373' }}>Instagram Followers</p>
          <p className="text-2xl font-bold" style={{ color: '#E1306C' }}>
            {igConnected ? fmtCount(ig.followersCount) : '–'}
          </p>
        </div>
      </div>

      {/* YouTube */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#737373' }}>
          YouTube
        </h2>

        {loading ? (
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: '#171717', border: '1px solid #262626' }}>
            <Loader size={16} color="#3b82f6" className="animate-spin" />
            <span className="text-sm" style={{ color: '#737373' }}>Checking connection…</span>
          </div>
        ) : ytConnected ? (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#171717', border: '1px solid #262626' }}>
            {yt.thumbnailUrl ? (
              <img
                src={yt.thumbnailUrl}
                alt={yt.channelTitle}
                className="rounded-xl shrink-0 object-cover"
                style={{ width: 44, height: 44 }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: '#FF000015', border: '1px solid #FF000030' }}
              >
                <PlatformLogo id="youtube" color="#FF0000" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white">{yt.channelTitle}</p>
                <CheckCircle size={13} color="#34d399" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: '#737373' }}>
                <span>{yt.handle}</span>
                <span>·</span>
                <span>
                  {yt.hiddenSubscriberCount ? 'Hidden subscribers' : `${fmtCount(yt.subscriberCount)} subscribers`}
                </span>
                <span>·</span>
                <span>{fmtCount(yt.viewCount)} total views</span>
                <span>·</span>
                <span>{fmtCount(yt.videoCount)} videos</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://youtube.com/${yt.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                <ExternalLink size={11} />
                View channel
              </a>
              <button
                onClick={() => setDisconnectTarget('youtube')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#171717', border: '1px solid #262626' }}>
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
            >
              <PlatformLogo id="youtube" color="#737373" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-0.5">YouTube</p>
              <p className="text-xs" style={{ color: '#737373' }}>Connect to see your real subscriber count, views, and video stats</p>
            </div>
            <a
              href="/auth/youtube"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80 shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
            >
              <Plus size={12} />
              Connect
            </a>
          </div>
        )}
      </section>

      {/* Instagram */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#737373' }}>
          Instagram
        </h2>

        {loading ? (
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: '#171717', border: '1px solid #262626' }}>
            <Loader size={16} color="#E1306C" className="animate-spin" />
            <span className="text-sm" style={{ color: '#737373' }}>Checking connection…</span>
          </div>
        ) : igConnected ? (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#171717', border: '1px solid #262626' }}>
            {ig.profilePictureUrl ? (
              <img
                src={ig.profilePictureUrl}
                alt={ig.username}
                className="rounded-xl shrink-0 object-cover"
                style={{ width: 44, height: 44 }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: 'rgba(225,48,108,0.1)', border: '1px solid rgba(225,48,108,0.2)' }}
              >
                <PlatformLogo id="instagram" color="#E1306C" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white">{ig.name || ig.username}</p>
                <CheckCircle size={13} color="#34d399" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: '#737373' }}>
                <span>@{ig.username}</span>
                <span>·</span>
                <span>{fmtCount(ig.followersCount)} followers</span>
                <span>·</span>
                <span>{fmtCount(ig.mediaCount)} posts</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://instagram.com/${ig.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                <ExternalLink size={11} />
                View profile
              </a>
              <button
                onClick={() => setDisconnectTarget('instagram')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#171717', border: '1px solid #262626' }}>
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
              >
                <PlatformLogo id="instagram" color="#737373" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-0.5">Instagram</p>
                <p className="text-xs" style={{ color: '#737373' }}>Connect a Business or Creator account to see followers, posts, and engagement</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowIgSetup(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
                >
                  Setup guide
                </button>
                <a
                  href="/auth/instagram"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg,#E1306C,#F77737)' }}
                >
                  <Plus size={12} />
                  Connect
                </a>
              </div>
            </div>

            {showIgSetup && (
              <div
                className="mt-3 rounded-2xl p-5"
                style={{ background: 'rgba(225,48,108,0.04)', border: '1px solid rgba(225,48,108,0.15)' }}
              >
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <RefreshCw size={14} color="#E1306C" />
                  One-time Instagram setup
                </p>
                <ol className="text-xs space-y-2" style={{ color: '#8a8a8a', lineHeight: 1.7 }}>
                  <li><span className="text-white font-medium">1.</span> Go to <span className="text-white">developers.facebook.com</span> → Create a new app → Choose <span className="text-white">Business</span> type</li>
                  <li><span className="text-white font-medium">2.</span> Add the <span className="text-white">Instagram</span> product to your app</li>
                  <li><span className="text-white font-medium">3.</span> Under Instagram → Settings, add your Instagram test account</li>
                  <li>
                    <span className="text-white font-medium">4.</span> Add{' '}
                    <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#93c5fd' }}>
                      http://localhost:3001/auth/instagram/callback
                    </code>
                    {' '}as a Valid OAuth Redirect URI
                  </li>
                  <li><span className="text-white font-medium">5.</span> Copy the <span className="text-white">App ID</span> and <span className="text-white">App Secret</span> from the app dashboard</li>
                  <li>
                    <span className="text-white font-medium">6.</span> Paste them into your{' '}
                    <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#93c5fd' }}>.env</code>
                    {' '}file as <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#93c5fd' }}>INSTAGRAM_APP_ID</code> and <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#93c5fd' }}>INSTAGRAM_APP_SECRET</code>, then restart the server
                  </li>
                  <li><span className="text-white font-medium">Note:</span> Requires a <span className="text-white">Business or Creator</span> Instagram account for follower counts and insights</li>
                </ol>
              </div>
            )}
          </>
        )}
      </section>

      {/* Other platforms — coming soon */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#737373' }}>
          More platforms — coming soon
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {OTHER_PLATFORMS.map(p => (
            <div
              key={p.id}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: '#171717', border: '1px solid #262626', opacity: 0.7 }}
            >
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
              >
                <PlatformLogo id={p.id} color="#737373" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-0.5">{p.platform}</p>
                <p className="text-xs" style={{ color: '#737373' }}>Integration in progress</p>
              </div>
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium shrink-0"
                style={{ background: '#262626', color: '#737373', border: '1px solid #333333' }}
              >
                Soon
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Setup instructions (only when YouTube not connected and backend is up) */}
      {!ytConnected && !backendDown && !loading && (
        <div
          className="mt-8 rounded-2xl p-5"
          style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <RefreshCw size={14} color="#3b82f6" />
            One-time YouTube setup
          </p>
          <ol className="text-xs space-y-2" style={{ color: '#8a8a8a', lineHeight: 1.7 }}>
            <li><span className="text-white font-medium">1.</span> Go to <span className="text-white">console.cloud.google.com</span> → create a project</li>
            <li><span className="text-white font-medium">2.</span> Enable <span className="text-white">YouTube Data API v3</span></li>
            <li><span className="text-white font-medium">3.</span> Create an OAuth 2.0 Client ID (Web application type)</li>
            <li>
              <span className="text-white font-medium">4.</span> Add{' '}
              <code
                className="px-1.5 py-0.5 rounded font-mono"
                style={{ background: '#262626', color: '#93c5fd' }}
              >
                http://localhost:3001/auth/youtube/callback
              </code>
              {' '}as a redirect URI
            </li>
            <li>
              <span className="text-white font-medium">5.</span> Paste the Client ID and Secret into your{' '}
              <code
                className="px-1.5 py-0.5 rounded font-mono"
                style={{ background: '#262626', color: '#93c5fd' }}
              >
                .env
              </code>
              {' '}file, then restart the API server
            </li>
          </ol>
        </div>
      )}

      {/* Privacy note */}
      <div
        className="mt-6 rounded-xl p-4 flex items-start gap-3 text-xs"
        style={{ background: 'rgba(255,189,107,0.06)', border: '1px solid rgba(255,189,107,0.15)' }}
      >
        <AlertCircle size={15} color="#ffbd6b" className="shrink-0 mt-0.5" />
        <p style={{ color: '#8a8a8a', lineHeight: 1.6 }}>
          Ashlr Compass only requests read-only access to your analytics. We never post on your behalf,
          access DMs, or store credentials online. OAuth tokens are stored locally in <code className="px-1 py-0.5 rounded" style={{ background: '#262626', color: '#93c5fd' }}>.tokens.json</code>.
        </p>
      </div>

      {/* Disconnect confirmation modal */}
      {disconnectTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDisconnectTarget(null) }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: '#171717', border: '1px solid #333333', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 40, height: 40, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={18} color="#f87171" />
              </div>
              <p className="text-base font-semibold text-white">
                Disconnect {disconnectTarget === 'youtube' ? 'YouTube' : disconnectTarget === 'instagram' ? 'Instagram' : disconnectTarget}?
              </p>
            </div>
            <p className="text-sm mb-5" style={{ color: '#737373', lineHeight: 1.6 }}>
              Your analytics data will no longer update. You can reconnect at any time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDisconnect(disconnectTarget)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
