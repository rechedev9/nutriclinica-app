import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePacientes } from '@/features/pacientes/hooks/usePacientes'
import { PacienteModal } from '@/features/pacientes/components/PacienteModal'
import { productosEnAlerta } from '@/features/stock/estado-almacen'
import { useAlmacen } from '@/features/stock/hooks/useStock'
import { Button } from '@/components/ui/Button'
import { agendaClientes } from './agenda'
import { fechaLarga, resumenDia } from './calculos'
import { AgendaClientes } from './components/AgendaClientes'
import { PulsoTienda } from './components/PulsoTienda'
import { Recompras } from './components/Recompras'
import { PorReponer, SinMovimiento } from './components/TiendaInicio'
import { useResumenInicio } from './hooks/useResumenInicio'
import { oportunidadesRecompra } from './recompra'

export function InicioPage() {
  const [clienteAbierto, setClienteAbierto] = useState(false)
  const navigate = useNavigate()
  const [hoy] = useState(() => new Date())

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{fechaLarga(hoy)}</h2>
          <Resumen hoy={hoy} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void navigate({ to: '/ventas/caja' })}>
            + Nueva venta
          </Button>
          <Button onClick={() => setClienteAbierto(true)}>+ Nuevo cliente</Button>
        </div>
      </div>

      <PulsoTienda hoy={hoy} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgendaClientes hoy={hoy} />
        <Recompras hoy={hoy} />
        <PorReponer />
        <SinMovimiento hoy={hoy} />
      </div>

      <PacienteModal open={clienteAbierto} onClose={() => setClienteAbierto(false)} />
    </div>
  )
}

function Resumen({ hoy }: { hoy: Date }) {
  const { data: clientes } = usePacientes()
  const { data: almacen } = useAlmacen()
  const { data: resumen } = useResumenInicio()
  if (!clientes || !almacen || !resumen) {
    return <p className="mt-0.5 text-sm text-ink-muted">Cómo va el negocio y qué tienes que hacer hoy.</p>
  }
  const ultimasCompras = new Map(resumen.ultimas_compras.map((c) => [c.paciente_id, c.fecha]))
  const texto = resumenDia({
    clientes: agendaClientes({ clientes, ultimasCompras, hoy }).filter((t) => t.motivo !== 'consentimiento').length,
    recompras: oportunidadesRecompra(resumen.habitos, hoy).length,
    productos: productosEnAlerta(almacen).length,
  })
  return <p className="mt-0.5 text-sm text-ink-muted">{texto}</p>
}
