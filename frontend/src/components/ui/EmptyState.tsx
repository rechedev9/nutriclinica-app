import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center text-ink-muted">
      {icon && <div className="opacity-30">{icon}</div>}
      <h2 className="text-xl font-semibold text-ink-muted">{title}</h2>
      {subtitle && <p className="text-sm">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
