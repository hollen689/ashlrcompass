interface Props {
  /** Device width in px — everything else scales from this. */
  width?: number
  /** Show the titanium bezel + Dynamic Island. Off gives a bare rounded screen. */
  bezel?: boolean
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

/**
 * iPhone silhouette sized off a single width prop, so a row of these can be
 * scaled without the bezel thickness or corner radius drifting out of ratio.
 */
export default function PhoneFrame({
  width = 220,
  bezel = true,
  className = '',
  style,
  children,
}: Props) {
  const height = width * 2.03
  const border = bezel ? Math.max(2, width * 0.03) : 0
  const radius = width * 0.155
  const islandW = width * 0.3
  const islandH = width * 0.082

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        padding: border,
        background: bezel
          ? 'linear-gradient(150deg,#4a4a50 0%,#17171a 18%,#0d0d0f 50%,#17171a 82%,#4a4a50 100%)'
          : 'transparent',
        boxShadow: bezel ? '0 24px 60px -12px rgba(0,0,0,0.75)' : 'none',
        ...style,
      }}
    >
      {/* Screen */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ borderRadius: radius - border, background: '#000' }}
      >
        {children}

        {bezel && (
          <>
            {/* Dynamic Island */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-20"
              style={{
                top: width * 0.032,
                width: islandW,
                height: islandH,
                borderRadius: islandH,
                background: '#000',
              }}
            />
            {/* Home indicator */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-20 rounded-full"
              style={{
                bottom: width * 0.035,
                width: width * 0.32,
                height: Math.max(2, width * 0.018),
                background: 'rgba(255,255,255,0.75)',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
