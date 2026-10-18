import { describe, expect, test } from 'bun:test'
import { DIAS_REVISION_PENDIENTE, pendientesOrdenados, seguimiento } from '../seguimiento'

const hoy = new Date(2026, 9, 13, 12)

describe('seguimiento', () => {
  test('sin revisiones es pendiente', () => {
    expect(seguimiento({ ultima_revision: null }, hoy)).toEqual({
      estado: 'sin',
      texto: 'Sin revisiones',
      dias: null,
    })
  })

  test('el plazo es estricto: 45 días al día, 46 pendiente', () => {
    expect(DIAS_REVISION_PENDIENTE).toBe(45)
    expect(seguimiento({ ultima_revision: '2026-08-29' }, hoy).estado).toBe('al_dia')
    expect(seguimiento({ ultima_revision: '2026-08-28' }, hoy).estado).toBe('vencida')
  })

  test('el texto usa el tiempo transcurrido', () => {
    expect(seguimiento({ ultima_revision: '2026-10-12' }, hoy).texto).toBe('Última ayer')
  })
})

describe('pendientesOrdenados', () => {
  test('descarta los que están al día y ordena de más a menos tiempo', () => {
    const lista = [
      { nombre: 'Ana', ultima_revision: '2026-08-01' },
      { nombre: 'Beto', ultima_revision: '2026-10-01' },
      { nombre: 'Carla', ultima_revision: null },
      { nombre: 'Dani', ultima_revision: '2026-05-01' },
    ]
    expect(pendientesOrdenados(lista, hoy).map((c) => c.nombre)).toEqual(['Carla', 'Dani', 'Ana'])
  })

  test('desempata por nombre', () => {
    const lista = [
      { nombre: 'Zoe', ultima_revision: null },
      { nombre: 'Álex', ultima_revision: null },
    ]
    expect(pendientesOrdenados(lista, hoy).map((c) => c.nombre)).toEqual(['Álex', 'Zoe'])
  })
})
