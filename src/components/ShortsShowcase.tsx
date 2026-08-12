import PhoneFrame from './PhoneFrame'
import { PLACEHOLDER_ITEMS, type ShowcaseItem } from '../data/showcase'

function ShortScreen({ item, width }: { item: ShowcaseItem; width: number }) {
  return (
    <div className="relative w-full h-full" style={{ background: item.gradient }}>
      {item.thumbnailUrl && (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Legibility scrim behind the caption */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '60%', background: 'linear-gradient(to top,rgba(0,0,0,0.6),transparent)' }}
      />

      {item.caption && (
        <div className="absolute inset-x-0 flex justify-center px-[7%]" style={{ top: '40%' }}>
          <span
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: Math.max(7, width * 0.115),
              lineHeight: 1.08,
              color: item.captionColor ?? '#fff',
              WebkitTextStroke: `${Math.max(0.5, width * 0.007)}px rgba(0,0,0,0.9)`,
              paintOrder: 'stroke fill',
              textShadow: '0 2px 6px rgba(0,0,0,0.65)',
              letterSpacing: '-0.01em',
            }}
          >
            {item.caption}
          </span>
        </div>
      )}
    </div>
  )
}

interface Props {
  items?: ShowcaseItem[]
  /** Width of the centre phone; the rest scale down from it. */
  centerWidth?: number
  /** `filmstrip` for real data rows, `cluster` for the landing hero. */
  variant?: 'filmstrip' | 'cluster'
}

/**
 * Fanned row of phones with the centre one raised and in focus — the outer
 * frames scale, fade and drop away so the eye lands in the middle. The strip
 * is deliberately shorter than the phones so they bleed off the bottom edge.
 */
export default function ShortsShowcase({
  items = PLACEHOLDER_ITEMS,
  centerWidth = 132,
  variant = 'filmstrip',
}: Props) {
  if (!items.length) return null

  return variant === 'cluster'
    ? <Cluster items={items} width={centerWidth} />
    : <Filmstrip items={items} width={centerWidth} />
}

/**
 * Even, uninflected row — every clip is the same size because none of them
 * matters more than the others. Used wherever the phones stand for real data.
 */
function Filmstrip({ items, width }: { items: ShowcaseItem[]; width: number }) {
  const stripHeight = width * 1.5

  return (
    <div className="relative w-full">
      <div className="tick-rule mb-4" />
      <div
        className="relative overflow-hidden"
        style={{
          height: stripHeight,
          maskImage:
            'linear-gradient(to bottom,#000 72%,transparent 100%),linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom,#000 72%,transparent 100%),linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      >
        <div className="flex items-start justify-center gap-3">
          {items.map(item => (
            <PhoneFrame
              key={item.id}
              width={width}
              bezel={false}
              style={{
                borderRadius: width * 0.13,
                overflow: 'hidden',
                border: '1px solid var(--line)',
                boxShadow: '0 14px 34px -18px rgba(0,0,0,0.7)',
              }}
            >
              <ShortScreen item={item} width={width} />
            </PhoneFrame>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Hero cluster — three phones read off a compass bezel, the middle one
 * upright and the outer two heeled over like needles off true north.
 */
function Cluster({ items, width }: { items: ShowcaseItem[]; width: number }) {
  const trio = items.slice(0, 3)
  const ring = width * 2.62

  return (
    <div className="relative flex items-center justify-center" style={{ height: width * 2.9 }}>
      <div
        className="compass-ticks"
        style={{ width: ring, height: ring, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="compass-cardinals"
        style={{ width: ring, height: ring, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="compass-arc"
        style={{ width: ring * 0.9, height: ring * 0.9, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      />

      <div className="relative flex items-center justify-center">
        {trio.map((item, i) => {
          const offset = i - 1
          const isCenter = offset === 0
          const w = isCenter ? width : width * 0.82

          return (
            <PhoneFrame
              key={item.id}
              width={w}
              bezel={isCenter}
              style={{
                marginLeft: i === 0 ? 0 : -w * 0.22,
                transform: `rotate(${offset * 9}deg) translateY(${Math.abs(offset) * 20}px)`,
                zIndex: isCenter ? 10 : 5 - Math.abs(offset),
                borderRadius: isCenter ? undefined : w * 0.14,
                overflow: isCenter ? undefined : 'hidden',
                border: isCenter ? undefined : '1px solid var(--line)',
                boxShadow: '0 26px 60px -22px rgba(0,0,0,0.85)',
              }}
            >
              <ShortScreen item={item} width={w} />
            </PhoneFrame>
          )
        })}
      </div>
    </div>
  )
}
