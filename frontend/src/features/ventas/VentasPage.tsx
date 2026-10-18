import { Link, Outlet } from '@tanstack/react-router'

const tabs = [
  { to: '/ventas/caja', label: 'Caja' },
  { to: '/ventas/historial', label: 'Historial' },
  { to: '/ventas/cierre', label: 'Cierre de caja' },
  { to: '/ventas/estadisticas', label: 'Estadísticas' },
  { to: '/ventas/ticket', label: 'Datos del ticket' },
] as const

export function VentasPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <div className="print-hide no-scrollbar flex gap-1 border-b border-border bg-surface px-6 max-md:overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] font-semibold transition-colors"
            activeProps={{ className: 'border-primary text-primary' }}
            inactiveProps={{ className: 'border-transparent text-ink-muted hover:text-ink' }}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-app max-md:overflow-visible">
        <Outlet />
      </div>
    </div>
  )
}
