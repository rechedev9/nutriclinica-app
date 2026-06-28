import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PacienteModal } from './components/PacienteModal'

// Contexto que la página comparte con sus rutas hijas (overview/detalle).
export interface PacientesOutletCtx {
  onNew: () => void
}

export function PacientesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const onNew = () => setModalOpen(true)

  // Sin barra lateral: la rejilla de la overview es la lista (a todo el ancho) y
  // el detalle ocupa todo el espacio. Se vuelve a la lista desde el detalle o
  // desde "Pacientes" en la navegación.
  return (
    <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
      <Outlet context={{ onNew } satisfies PacientesOutletCtx} />
      <PacienteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
