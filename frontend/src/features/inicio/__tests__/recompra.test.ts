import { describe, expect, test } from 'bun:test'
import { intervaloHabitual, oportunidadesRecompra } from '../recompra'

const HOY = new Date(2026, 9, 18)

function habito(datos: { paciente_id: number; producto_id: number; fechas: string[] }) {
  return {
    ...datos,
    paciente_nombre: `Cliente ${datos.paciente_id}`,
    producto_nombre: `Producto ${datos.producto_id}`,
  }
}

describe('intervaloHabitual', () => {
  test('media de los huecos entre compras', () => {
    expect(intervaloHabitual(['2026-07-01', '2026-07-31', '2026-08-30'])).toBe(30)
    expect(intervaloHabitual(['2026-07-01', '2026-08-15'])).toBe(45)
  })
  test('con una sola compra no hay hábito', () => {
    expect(intervaloHabitual(['2026-07-01'])).toBeNull()
    expect(intervaloHabitual([])).toBeNull()
  })
  test('dos compras seguidas no bajan de dos semanas', () => {
    expect(intervaloHabitual(['2026-07-01', '2026-07-03'])).toBe(14)
  })
})

describe('oportunidadesRecompra', () => {
  test('avisa cuando se le acaba y deja de avisar pasado el triple del intervalo', () => {
    const habitos = [
      // Cada 30 días, la última hace 50: toca.
      habito({ paciente_id: 1, producto_id: 1, fechas: ['2026-06-30', '2026-07-30', '2026-08-29'] }),
      // Cada 35 días, la última hace 20: aún le queda.
      habito({ paciente_id: 2, producto_id: 1, fechas: ['2026-07-20', '2026-08-24', '2026-09-28'] }),
      // Cada 30 días, la última hace 28: se avisa unos días antes.
      habito({ paciente_id: 3, producto_id: 1, fechas: ['2026-08-21', '2026-09-20'] }),
      // Cada 20 días, la última hace 100: ya no es un hábito vivo.
      habito({ paciente_id: 4, producto_id: 1, fechas: ['2026-06-20', '2026-07-10'] }),
    ]
    expect(oportunidadesRecompra(habitos, HOY).map((r) => [r.paciente_id, r.retraso])).toEqual([
      [1, 20],
      [3, -2],
    ])
  })

  test('agrupa por cliente con el producto más retrasado primero', () => {
    const habitos = [
      habito({ paciente_id: 7, producto_id: 1, fechas: ['2026-08-08', '2026-09-07'] }), // 30 días, hace 41
      habito({ paciente_id: 7, producto_id: 2, fechas: ['2026-06-01', '2026-07-16'] }), // 45 días, hace 94
    ]
    const [r] = oportunidadesRecompra(habitos, HOY)
    expect(r?.retraso).toBe(49)
    expect(r?.productos.map((p) => [p.producto_id, p.intervalo, p.dias])).toEqual([
      [2, 45, 94],
      [1, 30, 41],
    ])
  })
})
