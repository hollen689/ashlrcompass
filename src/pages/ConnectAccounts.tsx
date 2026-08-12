import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, ExternalLink, AlertCircle, RefreshCw, Trash2, Plus, Loader } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAccounts, isYouTubeConnected, isInstagramConnected, fmtCount } from '../hooks/useAccounts'
import PlatformLogo from '../components/PlatformLogo'

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
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium shadow-xl"
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
              style={{ background: '#262626', color: '#f7bb59' }}
            >
              npm run server
            </code>
            {' '}in a separate terminal, then refresh.
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="cell-grid grid-cols-3 mb-8">
        <div className="p-5">
          <p className="eyebrow mb-2">Connected Platforms</p>
          <p className="numeric" style={{ fontSize: 32, lineHeight: 1, color: '#34d399' }}>
            {loading ? '–' : connectedCount}
          </p>
        </div>
        <div className="p-5">
          <p className="eyebrow mb-2">YouTube Subscribers</p>
          <p className="numeric" style={{ fontSize: 32, lineHeight: 1, color: 'var(--accent-soft)' }}>
            {ytConnected ? fmtCount(yt.subscriberCount) : '–'}
          </p>
        </div>
        <div className="p-5">
          <p className="eyebrow mb-2">Instagram Followers</p>
          <p className="numeric" style={{ fontSize: 32, lineHeight: 1, color: '#E1306C' }}>
            {igConnected ? fmtCount(ig.followersCount) : '–'}
          </p>
        </div>
      </div>

      {/* YouTube */}
      <section className="mb-6">
        <h2 className="eyebrow mb-3">
          YouTube
        </h2>

        {loading ? (
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Loader size={16} color="#f5a524" className="animate-spin" />
            <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Checking connection…</span>
          </div>
        ) : ytConnected ? (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
                <p className="display-sm text-sm">{yt.channelTitle}</p>
                <CheckCircle size={13} color="#34d399" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                <ExternalLink size={11} />
                View channel
              </a>
              <button
                onClick={() => setDisconnectTarget('youtube')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
            >
              <PlatformLogo id="youtube" color="#737373" />
            </div>
            <div className="flex-1">
              <p className="display-sm text-sm mb-0.5">YouTube</p>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Connect to see your real subscriber count, views, and video stats</p>
            </div>
            <a
              href="/auth/youtube"
              className="btn-pill btn-primary btn-sm shrink-0"
            >
              <Plus size={12} />
              Connect
            </a>
          </div>
        )}
      </section>

      {/* Instagram */}
      <section className="mb-8">
        <h2 className="eyebrow mb-3">
          Instagram
        </h2>

        {loading ? (
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Loader size={16} color="#E1306C" className="animate-spin" />
            <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Checking connection…</span>
          </div>
        ) : igConnected ? (
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
                <p className="display-sm text-sm">{ig.name || ig.username}</p>
                <CheckCircle size={13} color="#34d399" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#262626', color: '#8a8a8a', border: '1px solid #333333' }}
              >
                <ExternalLink size={11} />
                View profile
              </a>
              <button
                onClick={() => setDisconnectTarget('instagram')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
              >
                <PlatformLogo id="instagram" color="#737373" />
              </div>
              <div className="flex-1">
                <p className="display-sm text-sm mb-0.5">Instagram</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Connect a Business or Creator account to see followers, posts, and engagement</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowIgSetup(v => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
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
                <p className="display-sm text-sm mb-3 flex items-center gap-2">
                  <RefreshCw size={14} color="#E1306C" />
                  One-time Instagram setup
                </p>
                <ol className="text-xs space-y-2" style={{ color: '#8a8a8a', lineHeight: 1.7 }}>
                  <li><span className="text-white font-medium">1.</span> Go to <span className="text-white">developers.facebook.com</span> → Create a new app → Choose <span className="text-white">Business</span> type</li>
                  <li><span className="text-white font-medium">2.</span> Add the <span className="text-white">Instagram</span> product to your app</li>
                  <li><span className="text-white font-medium">3.</span> Under Instagram → Settings, add your Instagram test account</li>
                  <li>
                    <span className="text-white font-medium">4.</span> Add{' '}
                    <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#f7bb59' }}>
                      http://localhost:3001/auth/instagram/callback
                    </code>
                    {' '}as a Valid OAuth Redirect URI
                  </li>
                  <li><span className="text-white font-medium">5.</span> Copy the <span className="text-white">App ID</span> and <span className="text-white">App Secret</span> from the app dashboard</li>
                  <li>
                    <span className="text-white font-medium">6.</span> Paste them into your{' '}
                    <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#f7bb59' }}>.env</code>
                    {' '}file as <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#f7bb59' }}>INSTAGRAM_APP_ID</code> and <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#262626', color: '#f7bb59' }}>INSTAGRAM_APP_SECRET</code>, then restart the server
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
        <h2 className="eyebrow mb-3">
          More platforms — coming soon
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {OTHER_PLATFORMS.map(p => (
            <div
              key={p.id}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.7 }}
            >
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 44, height: 44, background: '#262626', border: '1px solid #333333' }}
              >
                <PlatformLogo id={p.id} color="#737373" />
              </div>
              <div className="flex-1">
                <p className="display-sm text-sm mb-0.5">{p.platform}</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Integration in progress</p>
              </div>
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium shrink-0"
                style={{ background: '#262626', color: 'var(--ink-muted)', border: '1px solid #333333' }}
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
          style={{ background: 'rgba(245,165,36,0.04)', border: '1px solid rgba(245,165,36,0.15)' }}
        >
          <p className="display-sm text-sm mb-3 flex items-center gap-2">
            <RefreshCw size={14} color="#f5a524" />
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
                style={{ background: '#262626', color: '#f7bb59' }}
              >
                http://localhost:3001/auth/youtube/callback
              </code>
              {' '}as a redirect URI
            </li>
            <li>
              <span className="text-white font-medium">5.</span> Paste the Client ID and Secret into your{' '}
              <code
                className="px-1.5 py-0.5 rounded font-mono"
                style={{ background: '#262626', color: '#f7bb59' }}
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
          access DMs, or store credentials online. OAuth tokens are stored locally in <code className="px-1 py-0.5 rounded" style={{ background: '#262626', color: '#f7bb59' }}>.tokens.json</code>.
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
            style={{ background: 'var(--surface)', border: '1px solid #333333', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 40, height: 40, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={18} color="#f87171" />
              </div>
              <p className="display-sm" style={{ fontSize: 17 }}>
                Disconnect {disconnectTarget === 'youtube' ? 'YouTube' : disconnectTarget === 'instagram' ? 'Instagram' : disconnectTarget}?
              </p>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--ink-muted)', lineHeight: 1.6 }}>
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
