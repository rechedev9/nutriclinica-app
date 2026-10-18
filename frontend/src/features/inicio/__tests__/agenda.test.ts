import { describe, expect, test } from 'bun:test'
import { agendaClientes, contarMotivos } from '../agenda'

const HOY = new Date(2026, 9, 18)

let siguiente = 1
function cliente(datos: { nombre: string; creado?: string; ultima_revision?: string | null; consentimiento?: number }) {
  return {
    id: siguiente++,
    nombre: datos.nombre,
    creado: datos.creado ?? '2026-10-01 10:00:00',
    ultima_revision: datos.ultima_revision ?? null,
    consentimiento: datos.consentimiento ?? 1,
  }
}

const sinCompras = new Map<number, string>()

describe('agendaClientes', () => {
  test('cada cliente con un motivo y los que están al día fuera', () => {
    const alDia = cliente({ nombre: 'Al día', ultima_revision: '2026-10-10' })
    const nuevo = cliente({ nombre: 'Nuevo', creado: '2026-10-15 09:00:00' })
    const vencido = cliente({ nombre: 'Vencido', creado: '2026-01-01', ultima_revision: '2026-08-20' })
    const perdido = cliente({ nombre: 'Perdido', creado: '2025-01-01', ultima_revision: '2026-05-01' })
    const papeles = cliente({ nombre: 'Papeles', ultima_revision: '2026-10-01', consentimiento: 0 })
    const agenda = agendaClientes({
      clientes: [alDia, nuevo, vencido, perdido, papeles],
      ultimasCompras: sinCompras,
      hoy: HOY,
    })
    expect(agenda.map((t) => [t.cliente.nombre, t.motivo, t.dias])).toEqual([
      ['Nuevo', 'primera', 3],
      ['Vencido', 'vencida', 59],
      ['Perdido', 'baja', 170],
      ['Papeles', 'consentimiento', null],
    ])
  })

  test('una compra reciente mantiene activo al cliente aunque no venga a revisión', () => {
    const c = cliente({ nombre: 'Compra', creado: '2025-01-01', ultima_revision: '2026-05-01' })
    const agenda = agendaClientes({ clientes: [c], ultimasCompras: new Map([[c.id, '2026-10-01']]), hoy: HOY })
    expect(agenda.map((t) => t.motivo)).toEqual(['vencida'])
  })

  test('un alta antigua sin revisiones ni compras es riesgo de baja, no primera revisión', () => {
    const c = cliente({ nombre: 'Olvidado', creado: '2026-03-01 10:00:00' })
    expect(agendaClientes({ clientes: [c], ultimasCompras: sinCompras, hoy: HOY })[0]?.motivo).toBe('baja')
  })

  test('orden por urgencia dentro de cada motivo', () => {
    const vencidas = [
      cliente({ nombre: 'V50', creado: '2026-01-01', ultima_revision: '2026-08-29' }),
      cliente({ nombre: 'V80', creado: '2026-01-01', ultima_revision: '2026-07-30' }),
    ]
    const bajas = [
      cliente({ nombre: 'B300', creado: '2025-01-01', ultima_revision: '2025-12-22' }),
      cliente({ nombre: 'B100', creado: '2025-01-01', ultima_revision: '2026-07-10' }),
    ]
    const primeras = [cliente({ nombre: 'P1', creado: '2026-10-17' }), cliente({ nombre: 'P10', creado: '2026-10-08' })]
    const agenda = agendaClientes({
      clientes: [...bajas, ...vencidas, ...primeras],
      ultimasCompras: sinCompras,
      hoy: HOY,
    })
    // Las que más esperan primero; los riesgos de baja, del más reciente (más fácil de recuperar).
    expect(agenda.map((t) => t.cliente.nombre)).toEqual(['P10', 'P1', 'V80', 'V50', 'B100', 'B300'])
  })

  test('marca la falta de consentimiento también en otros motivos', () => {
    const c = cliente({ nombre: 'Sin firma', creado: '2026-10-17', consentimiento: 0 })
    const [tarea] = agendaClientes({ clientes: [c], ultimasCompras: sinCompras, hoy: HOY })
    expect(tarea?.motivo).toBe('primera')
    expect(tarea?.sinConsentimiento).toBe(true)
  })

  test('contarMotivos', () => {
    const agenda = agendaClientes({
      clientes: [
        cliente({ nombre: 'A' }),
        cliente({ nombre: 'B' }),
        cliente({ nombre: 'C', ultima_revision: '2026-10-17', consentimiento: 0 }),
      ],
      ultimasCompras: sinCompras,
      hoy: HOY,
    })
    expect(contarMotivos(agenda)).toEqual({ primera: 2, vencida: 0, baja: 0, consentimiento: 1 })
  })
})
