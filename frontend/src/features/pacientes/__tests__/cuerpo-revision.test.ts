import { describe, expect, test } from 'bun:test'
import { cuerpoRevision } from '../cuerpo-revision'

const valores = {
  fecha: '2026-05-03',
  peso: '73.6',
  envergadura: '163',
  pl_bicipital: '15.2',
  per_cintura: '82.1',
  notas: 'nota de la visita',
}

describe('cuerpo de una revisión', () => {
  test('editar conserva la talla, que el formulario no muestra', () => {
    const cuerpo = cuerpoRevision({ valores, talla: 164 })
    expect(cuerpo.talla).toBe(164)
    expect(cuerpo.peso).toBe(73.6)
    expect(cuerpo.envergadura).toBe(163)
    expect(cuerpo.fecha).toBe('2026-05-03')
  })

  test('una revisión nueva no lleva talla', () => {
    const cuerpo = cuerpoRevision({ valores, talla: null })
    expect(cuerpo.talla).toBeNull()
  })

  test('un campo mostrado vacío se guarda vacío', () => {
    const cuerpo = cuerpoRevision({ valores: { ...valores, envergadura: '  ' }, talla: 164 })
    expect(cuerpo.envergadura).toBeNull()
    expect(cuerpo.pl_supraespinal).toBeNull()
  })
})
