interface Props {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: '#737373' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
