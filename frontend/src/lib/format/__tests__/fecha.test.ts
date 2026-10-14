import { describe, expect, test } from 'bun:test'
import { diasDesde, haceCuanto } from '../fecha'

describe('diasDesde', () => {
  const hoy = new Date(2026, 9, 13, 23, 30)

  test('cuenta días naturales sin depender de la hora', () => {
    expect(diasDesde('2026-10-13', hoy)).toBe(0)
    expect(diasDesde('2026-10-12', hoy)).toBe(1)
    expect(diasDesde('2026-05-03 10:00:00', hoy)).toBe(163)
  })

  test('devuelve null sin fecha válida', () => {
    expect(diasDesde(null, hoy)).toBeNull()
    expect(diasDesde('ayer', hoy)).toBeNull()
  })
})

describe('haceCuanto', () => {
  test('elige la unidad según la distancia', () => {
    expect(haceCuanto(0)).toBe('hoy')
    expect(haceCuanto(1)).toBe('ayer')
    expect(haceCuanto(9)).toBe('hace 9 días')
    expect(haceCuanto(21)).toBe('hace 3 semanas')
    expect(haceCuanto(163)).toBe('hace 5 meses')
    expect(haceCuanto(800)).toBe('hace 2 años')
  })
})
