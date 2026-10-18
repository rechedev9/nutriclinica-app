import { seguimiento } from '@/features/pacientes/seguimiento'
import { diasDesde } from '@/lib/format/fecha'

// Sin revisión ni compra en este plazo (desde el alta como mínimo), el cliente está en riesgo de baja.
const DIAS_SIN_VENIR = 90

export type MotivoAgenda = 'primera' | 'vencida' | 'baja' | 'consentimiento'

// Primero lo que el entrenador puede resolver hoy con un cliente que sigue viniendo
// (la primera revisión, una vencida) y después recuperar a quien ha dejado de venir.
const PRIORIDAD: Record<MotivoAgenda, number> = { primera: 0, vencida: 1, baja: 2, consentimiento: 3 }

interface ClienteAgenda {
  id: number
  nombre: string
  creado: string | null
  ultima_revision: string | null
  consentimiento: number
}

export interface TareaCliente<T> {
  cliente: T
  motivo: MotivoAgenda
  // primera: días desde el alta; vencida: desde la última revisión; baja: desde la última visita.
  dias: number | null
  sinConsentimiento: boolean
}

function masReciente(fechas: readonly (string | null | undefined)[]): string | null {
  let ultima: string | null = null
  for (const f of fechas) {
    const dia = f?.slice(0, 10) ?? null
    if (dia !== null && (ultima === null || dia > ultima)) ultima = dia
  }
  return ultima
}

function tareaDe<T extends ClienteAgenda>(cliente: T, ultimaCompra: string | null, hoy: Date): TareaCliente<T> | null {
  const sinConsentimiento = cliente.consentimiento !== 1
  const inactivo = diasDesde(masReciente([cliente.ultima_revision, ultimaCompra, cliente.creado]), hoy)
  if (inactivo !== null && inactivo > DIAS_SIN_VENIR) {
    return { cliente, motivo: 'baja', dias: inactivo, sinConsentimiento }
  }
  const seg = seguimiento(cliente, hoy)
  if (seg.dias === null) {
    return { cliente, motivo: 'primera', dias: diasDesde(cliente.creado, hoy), sinConsentimiento }
  }
  if (seg.pendiente) return { cliente, motivo: 'vencida', dias: seg.dias, sinConsentimiento }
  if (sinConsentimiento) return { cliente, motivo: 'consentimiento', dias: null, sinConsentimiento }
  return null
}

// Lo que hay que hacer con cada cliente, por urgencia. Las vencidas y las primeras
// revisiones van de la que más espera a la que menos; los riesgos de baja, de la más
// reciente a la más antigua, porque a quien dejó de venir hace poco es más fácil recuperarlo.
export function agendaClientes<T extends ClienteAgenda>(datos: {
  clientes: readonly T[]
  ultimasCompras: ReadonlyMap<number, string>
  hoy: Date
}): TareaCliente<T>[] {
  const { clientes, ultimasCompras, hoy } = datos
  return clientes
    .flatMap((c) => {
      const tarea = tareaDe(c, ultimasCompras.get(c.id) ?? null, hoy)
      return tarea === null ? [] : [tarea]
    })
    .toSorted((a, b) => {
      if (a.motivo !== b.motivo) return PRIORIDAD[a.motivo] - PRIORIDAD[b.motivo]
      const da = a.dias ?? 0
      const db = b.dias ?? 0
      if (da !== db) return a.motivo === 'baja' ? da - db : db - da
      return a.cliente.nombre.localeCompare(b.cliente.nombre, 'es')
    })
}

export function contarMotivos(tareas: readonly TareaCliente<unknown>[]): Record<MotivoAgenda, number> {
  const cuenta: Record<MotivoAgenda, number> = { primera: 0, vencida: 0, baja: 0, consentimiento: 0 }
  for (const t of tareas) cuenta[t.motivo] += 1
  return cuenta
}
