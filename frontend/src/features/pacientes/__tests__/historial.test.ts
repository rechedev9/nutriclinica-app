import { describe, expect, test } from 'bun:test'
import { textoUltimoCambio, ultimoCambioFicha, ultimoCambioRevision } from '../historial'
import type { Historial } from '@/types'

function entrada(parcial: Partial<Historial[number]>): Historial[number] {
  return {
    id: 1,
    fecha: '2026-03-02 18:30:00',
    usuario: 'ana',
    metodo: 'PUT',
    ruta: '/api/pacientes/3',
    estado: 200,
    paciente_id: 3,
    detalle: null,
    ...parcial,
  }
}

describe('ultimoCambioFicha', () => {
  test('toma la edición más reciente de la ficha e ignora las revisiones y los rechazos', () => {
    const entradas = [
      entrada({ id: 4, ruta: '/api/revisiones/9', usuario: 'luis' }),
      entrada({ id: 3, estado: 400, usuario: 'luis' }),
      entrada({ id: 2, usuario: 'ana', fecha: '2026-03-01 10:00:00' }),
      entrada({ id: 1, metodo: 'POST', ruta: '/api/pacientes', usuario: 'admin' }),
    ]
    expect(ultimoCambioFicha(entradas)).toEqual({ usuario: 'ana', fecha: '2026-03-01 10:00:00', creado: false })
  })

  test('sin entradas no hay último cambio', () => {
    expect(ultimoCambioFicha([])).toBeNull()
  })
})

describe('ultimoCambioRevision', () => {
  test('encuentra la edición por la ruta y el alta por el detalle', () => {
    const alta = entrada({
      id: 1,
      metodo: 'POST',
      ruta: '/api/pacientes/3/revisiones',
      detalle: { cambios: [], resumen: 'Revisión del 2026-03-01', registro_id: 9 },
    })
    expect(ultimoCambioRevision([alta], 9)?.creado).toBe(true)
    expect(ultimoCambioRevision([alta], 10)).toBeNull()
    const edicion = entrada({ id: 2, ruta: '/api/revisiones/9', usuario: 'luis' })
    expect(ultimoCambioRevision([edicion, alta], 9)).toMatchObject({ usuario: 'luis', creado: false })
  })
})

describe('textoUltimoCambio', () => {
  test('escribe quién, qué día y a qué hora', () => {
    const texto = textoUltimoCambio({
      cambio: { usuario: 'ana', fecha: '2026-03-02 18:30:00', creado: false },
      formatearFecha: () => '02/03/2026',
    })
    expect(texto).toBe('Modificado por ana el 02/03/2026 a las 18:30')
  })
})
