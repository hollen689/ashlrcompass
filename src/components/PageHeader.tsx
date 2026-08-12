interface Props {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="display mb-1.5" style={{ fontSize: 40 }}>{title}</h1>
        {subtitle && (
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
