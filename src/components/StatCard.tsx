import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  change: number
  icon?: React.ReactNode
}

export default function StatCard({ label, value, change, icon }: Props) {
  const positive = change >= 0

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: '#171717', border: '1px solid #262626' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#737373' }}>
          {label}
        </span>
        {icon && (
          <div className="rounded-lg p-1.5" style={{ background: '#262626' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {positive ? '+' : ''}{change}% vs last month
      </div>
    </div>
  )
}
