import { useOutletContext } from 'react-router-dom'
import type { Paciente } from '@/types'

export function usePacienteContext(): Paciente {
  return useOutletContext<Paciente>()
}
