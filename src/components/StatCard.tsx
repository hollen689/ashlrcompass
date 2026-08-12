import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  change: number
  icon?: React.ReactNode
}

/** A single cell inside the dashed stat grid — the frame is drawn by the parent. */
export default function StatCard({ label, value, change, icon }: Props) {
  const positive = change >= 0

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {icon && (
          <div className="rounded-lg p-1.5" style={{ background: 'var(--accent-tint)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="numeric" style={{ fontSize: 38, lineHeight: 1 }}>{value}</div>
      <div
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: positive ? '#34d399' : '#f87171' }}
      >
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {positive ? '+' : ''}{change}% vs last month
      </div>
    </div>
  )
}
