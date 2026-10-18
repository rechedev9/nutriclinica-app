import { describe, expect, test } from 'bun:test'
import { diasSinCerrar } from '../src/datos/dias-sin-cerrar'
import { sumarDias } from '../src/lib/fechas'

const hoy = '2026-10-18'

describe('diasSinCerrar', () => {
  test('sin ningún cierre no señala el historial previo', () => {
    expect(diasSinCerrar({ movimientos: ['2026-03-01', '2026-10-17'], cerrados: [], hoy })).toEqual([])
  })

  test('deja fuera hoy, el día cerrado y lo anterior al primer cierre', () => {
    expect(
      diasSinCerrar({
        movimientos: ['2026-10-18', '2026-10-17', '2026-10-16', '2026-10-14', '2026-10-10'],
        cerrados: ['2026-10-14'],
        hoy,
      }),
    ).toEqual(['2026-10-17', '2026-10-16'])
  })

  test('un día de hace más de 30 días no entra aunque el primer cierre sea anterior', () => {
    const limite = sumarDias(hoy, -30)
    const anterior = sumarDias(hoy, -31)
    expect(
      diasSinCerrar({
        movimientos: ['2026-03-01', anterior, limite, '2026-10-17'],
        cerrados: ['2026-03-01'],
        hoy,
      }),
    ).toEqual(['2026-10-17', limite])
  })

  test('dentro de los 30 días, lo anterior al primer cierre tampoco entra', () => {
    expect(
      diasSinCerrar({
        movimientos: ['2026-10-08', '2026-10-12', '2026-10-17'],
        cerrados: ['2026-10-10'],
        hoy,
      }),
    ).toEqual(['2026-10-17', '2026-10-12'])
  })

  test('no repite un día que tuvo venta y devolución', () => {
    expect(
      diasSinCerrar({
        movimientos: ['2026-10-17', '2026-10-17'],
        cerrados: ['2026-10-01'],
        hoy,
      }),
    ).toEqual(['2026-10-17'])
  })
})
