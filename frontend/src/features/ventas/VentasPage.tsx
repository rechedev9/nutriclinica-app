import { Outlet } from '@tanstack/react-router'
import { BarraDelDia } from '@/components/layout/BarraDelDia'
import { PESTANAS_VENTAS } from '@/components/layout/barra-del-dia'

export function VentasPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <BarraDelDia pestanas={PESTANAS_VENTAS} ocultarAlImprimir />
      <div className="flex-1 overflow-y-auto bg-app max-md:overflow-visible">
        <Outlet />
      </div>
    </div>
  )
}
