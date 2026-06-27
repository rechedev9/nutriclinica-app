import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { usePacientes } from './hooks/usePacientes'
import { PacienteSidebar } from './components/PacienteSidebar'
import { PacienteModal } from './components/PacienteModal'

export function PacientesPage() {
  const { data: pacientes = [], isLoading } = usePacientes()
  const { id } = useParams()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-1 overflow-hidden max-md:block">
      <PacienteSidebar
        pacientes={pacientes}
        loading={isLoading}
        activeId={id ? Number(id) : null}
        onNew={() => setModalOpen(true)}
      />
      <div className="flex flex-1 flex-col overflow-hidden max-md:overflow-visible">
        <Outlet />
      </div>
      <PacienteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
