import { createContext, useContext } from 'react'
import type { Paciente } from '@/types'

// El detalle del paciente comparte la ficha cargada con sus pestañas (rutas hijas).
export const PacienteContexto = createContext<Paciente | null>(null)

export function usePacienteContext(): Paciente {
  const paciente = useContext(PacienteContexto)
  if (!paciente) throw new Error('usePacienteContext debe usarse dentro de PacienteDetail')
  return paciente
}
