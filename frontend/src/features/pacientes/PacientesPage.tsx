import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { usePacientes } from './hooks/usePacientes'
import { PacienteSidebar } from './components/PacienteSidebar'
import { PacienteModal } from './components/PacienteModal'

// Contexto que la página comparte con sus rutas hijas (overview/detalle).
export interface PacientesOutletCtx {
  onNew: () => void
}

export function PacientesPage() {
  const { data: pacientes = [], isLoading } = usePacientes()
  const { id } = useParams()
  const [modalOpen, setModalOpen] = useState(false)
  const onNew = () => setModalOpen(true)

  return (
    <div className="flex flex-1 overflow-hidden max-md:block">
      {/* La barra lateral solo aparece con un paciente seleccionado (para
          cambiar rápido). Sin selección, la rejilla de la overview hace de lista
          a todo el ancho y no se duplica. */}
      {id && (
        <PacienteSidebar
          pacientes={pacientes}
          loading={isLoading}
          activeId={Number(id)}
          onNew={onNew}
        />
      )}
      <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
        <Outlet context={{ onNew } satisfies PacientesOutletCtx} />
      </div>
      <PacienteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
