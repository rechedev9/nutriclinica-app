import { Link, Outlet } from '@tanstack/react-router'

const tabs = [
  { to: '/stock/almacen', label: 'Almacén' },
  { to: '/stock/pedidos', label: 'Pedidos' },
  { to: '/stock/categorias', label: 'Categorías' },
  { to: '/stock/proveedores', label: 'Proveedores' },
  { to: '/stock/compras', label: 'Compras' },
  { to: '/stock/mermas', label: 'Mermas' },
  { to: '/stock/recuentos', label: 'Recuentos' },
  { to: '/stock/analisis', label: 'Análisis' },
] as const

export function StockPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <div className="flex gap-1 border-b border-border bg-surface px-6 max-md:overflow-x-auto no-scrollbar">
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
