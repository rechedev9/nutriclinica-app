import { describe, expect, test } from 'bun:test'
import { esDeLaUltimaRevision, fmtValor, fmtVariacion, resumirSerie, ultimoDato, variacion } from '../ultimo-dato'

interface Rev {
  fecha: string | null
  peso: number | null
  grasa: number | null
}

const revs: Rev[] = [
  { fecha: '2026-01-10', peso: 80, grasa: 20 },
  { fecha: '2026-02-10', peso: 79, grasa: null },
  { fecha: '2026-03-10', peso: 78, grasa: 18.5 },
  { fecha: '2026-04-10', peso: 77, grasa: null },
]

describe('ultimoDato', () => {
  test('devuelve el último valor presente aunque la última revisión no lo tenga', () => {
    const dato = ultimoDato(revs, (r) => r.grasa)
    expect(dato).toEqual({ valor: 18.5, fecha: '2026-03-10', indice: 2 })
    expect(esDeLaUltimaRevision(dato ?? { valor: 0, fecha: null, indice: -1 }, revs.length)).toBe(false)
  })

  test('si la última revisión lo tiene, es de la última revisión', () => {
    const dato = ultimoDato(revs, (r) => r.peso)
    expect(dato?.valor).toBe(77)
    expect(dato && esDeLaUltimaRevision(dato, revs.length)).toBe(true)
  })

  test('conserva el cero como dato válido', () => {
    expect(ultimoDato([{ fecha: '2026-01-01', peso: 0, grasa: null }], (r) => r.peso)?.valor).toBe(0)
  })

  test('devuelve null sin ningún dato o sin revisiones', () => {
    expect(ultimoDato(revs, () => null)).toBeNull()
    expect(ultimoDato([], (r: Rev) => r.peso)).toBeNull()
  })
})

describe('resumirSerie', () => {
  test('salta los huecos al elegir primero, anterior y último', () => {
    const resumen = resumirSerie(revs, (r) => r.grasa)
    expect(resumen.primero?.fecha).toBe('2026-01-10')
    expect(resumen.anterior?.fecha).toBe('2026-01-10')
    expect(resumen.ultimo?.valor).toBe(18.5)
  })

  test('con tres datos el anterior es el penúltimo', () => {
    const resumen = resumirSerie(revs, (r) => r.peso)
    expect(resumen.primero?.valor).toBe(80)
    expect(resumen.anterior?.valor).toBe(78)
    expect(resumen.ultimo?.valor).toBe(77)
  })

  test('con un solo dato no hay anterior', () => {
    const resumen = resumirSerie([revs[0] as Rev], (r) => r.peso)
    expect(resumen.anterior).toBeNull()
    expect(resumen.primero?.indice).toBe(resumen.ultimo?.indice)
  })
})

describe('variacion', () => {
  test('redondea a un decimal', () => {
    const resumen = resumirSerie(revs, (r) => r.peso)
    expect(variacion(resumen.primero, resumen.ultimo)).toBe(-3)
    expect(variacion({ valor: 1.04, fecha: null, indice: 0 }, { valor: 1.3, fecha: null, indice: 1 })).toBe(0.3)
  })

  test('es null si falta un extremo o es el mismo punto', () => {
    const resumen = resumirSerie([revs[0] as Rev], (r) => r.peso)
    expect(variacion(resumen.primero, resumen.ultimo)).toBeNull()
    expect(variacion(null, resumen.ultimo)).toBeNull()
  })
})

describe('formato', () => {
  test('fmtVariacion lleva signo explícito', () => {
    expect(fmtVariacion(1.2)).toBe('+1.2')
    expect(fmtVariacion(-0.4)).toBe('-0.4')
    expect(fmtVariacion(0)).toBe('0.0')
    expect(fmtVariacion(null)).toBe('-')
  })

  test('fmtValor fija los decimales', () => {
    expect(fmtValor(18.5)).toBe('18.5')
    expect(fmtValor(2000, 0)).toBe('2000')
    expect(fmtValor(null)).toBe('-')
  })
})
