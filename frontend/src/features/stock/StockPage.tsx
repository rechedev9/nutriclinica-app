import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'

const tabs = [
  { to: 'almacen', label: 'Almacén' },
  { to: 'compras', label: 'Compras' },
  { to: 'ventas', label: 'Ventas' },
  { to: 'proveedores', label: 'Proveedores' },
  { to: 'mermas', label: 'Mermas' },
  { to: 'analisis', label: 'Análisis' },
]

export function StockPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <div className="flex gap-1 border-b border-border bg-surface px-6 max-md:overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] font-semibold transition-colors',
                isActive ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-app max-md:overflow-visible">
        <Outlet />
      </div>
    </div>
  )
}
