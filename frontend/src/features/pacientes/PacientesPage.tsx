import { Outlet } from '@tanstack/react-router'

// Sin barra lateral: la rejilla de la overview es la lista (a todo el ancho) y
// el detalle ocupa todo el espacio. Se vuelve a la lista desde el detalle o
// desde "Pacientes" en la navegación.
export function PacientesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <Outlet />
    </div>
  )
}
