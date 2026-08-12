import { PLATFORM_PATHS, PLATFORM_COLORS } from '../data/platforms'

export default function PlatformLogo({
  id,
  color,
  size = 20,
}: {
  id: string
  color?: string
  size?: number
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color ?? PLATFORM_COLORS[id] ?? 'currentColor'}>
      <path d={PLATFORM_PATHS[id] ?? ''} />
    </svg>
  )
}
