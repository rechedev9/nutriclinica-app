import { describe, expect, test } from 'bun:test'
import { pulsoTienda, rangosPulso, referenciasPulso, variacion } from '../pulso'

// Domingo, 18 de octubre de 2026.
const HOY = new Date(2026, 9, 18)

const dia = (fecha: string, ventas: number, num_ventas = 1, devoluciones = 0) => ({
  fecha,
  ventas,
  num_ventas,
  devoluciones,
})

describe('rangosPulso', () => {
  test('hoy frente al mismo día de la semana pasada', () => {
    expect(rangosPulso(HOY).hoy).toEqual({
      actual: { desde: '2026-10-18', hasta: '2026-10-18' },
      anterior: { desde: '2026-10-11', hasta: '2026-10-11' },
    })
  })
  test('la semana empieza en lunes y se compara hasta el mismo día', () => {
    expect(rangosPulso(HOY).semana).toEqual({
      actual: { desde: '2026-10-12', hasta: '2026-10-18' },
      anterior: { desde: '2026-10-05', hasta: '2026-10-11' },
    })
    // Un lunes la semana en curso es solo ese día.
    expect(rangosPulso(new Date(2026, 9, 12)).semana.actual).toEqual({ desde: '2026-10-12', hasta: '2026-10-12' })
  })
  test('el mes se compara hasta el mismo día del mes anterior', () => {
    expect(rangosPulso(HOY).mes).toEqual({
      actual: { desde: '2026-10-01', hasta: '2026-10-18' },
      anterior: { desde: '2026-09-01', hasta: '2026-09-18' },
    })
  })
  test('si el mes anterior es más corto se corta en su último día', () => {
    expect(rangosPulso(new Date(2026, 2, 31)).mes.anterior).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
  })
  test('en enero se compara con diciembre del año anterior', () => {
    expect(rangosPulso(new Date(2027, 0, 5)).mes.anterior).toEqual({ desde: '2026-12-01', hasta: '2026-12-05' })
  })
})

describe('variacion', () => {
  test('porcentaje entero', () => {
    expect(variacion(120, 100)).toBe(20)
    expect(variacion(50, 200)).toBe(-75)
    expect(variacion(100, 100)).toBe(0)
  })
  test('sin ventas en el periodo anterior no hay porcentaje', () => {
    expect(variacion(100, 0)).toBeNull()
  })
})

describe('pulsoTienda', () => {
  const dias = [
    dia('2026-09-05', 100, 2),
    dia('2026-09-25', 999, 1), // fuera del tramo comparable de septiembre
    dia('2026-10-06', 30.1, 1),
    dia('2026-10-11', 40, 2),
    dia('2026-10-13', 20.1, 1),
    dia('2026-10-18', 50.2, 2, 10.1),
  ]
  const pulso = pulsoTienda(dias, HOY)

  test('hoy resta las devoluciones del día', () => {
    expect(pulso.hoy).toEqual({ actual: 40.1, anterior: 40, variacion: 0, num_ventas: 2 })
  })
  test('semana hasta hoy frente a la anterior', () => {
    expect(pulso.semana).toEqual({ actual: 60.2, anterior: 70.1, variacion: -14, num_ventas: 3 })
  })
  test('mes hasta hoy frente al mismo tramo del anterior', () => {
    expect(pulso.mes.actual).toBe(130.3)
    expect(pulso.mes.anterior).toBe(100)
    expect(pulso.mes.variacion).toBe(30)
  })
  test('ticket medio con las ventas brutas y sin decimales sueltos', () => {
    // (30,10 + 40 + 20,10 + 50,20) / 6 = 23,40; septiembre: 100 / 2 = 50.
    expect(pulso.ticket).toEqual({ actual: 23.4, anterior: 50, variacion: -53 })
  })
  test('sin ventas', () => {
    const vacio = pulsoTienda([], HOY)
    expect(vacio.hoy).toEqual({ actual: 0, anterior: 0, variacion: null, num_ventas: 0 })
    expect(vacio.ticket).toEqual({ actual: null, anterior: null, variacion: null })
  })
})

describe('referenciasPulso', () => {
  test('en palabras', () => {
    expect(referenciasPulso(HOY)).toEqual({
      hoy: 'el domingo pasado',
      semana: 'la semana pasada',
      mes: 'del 1 al 18 de septiembre',
    })
    expect(referenciasPulso(new Date(2026, 9, 1)).mes).toBe('el 1 de septiembre')
    expect(referenciasPulso(new Date(2027, 0, 9)).mes).toBe('del 1 al 9 de diciembre')
  })
})
