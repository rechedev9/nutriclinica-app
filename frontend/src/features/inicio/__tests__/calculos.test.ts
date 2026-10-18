import { describe, expect, test } from 'bun:test'
import { desplazarDias, fechaDeTexto, fechaLarga, resumenDia } from '../calculos'

describe('fechaLarga', () => {
  test('día de la semana, día y mes en español', () => {
    expect(fechaLarga(new Date(2026, 9, 13))).toBe('Martes, 13 de octubre')
    expect(fechaLarga(new Date(2026, 2, 1))).toBe('Domingo, 1 de marzo')
  })
})

describe('fechas locales', () => {
  test('desplazarDias cruza meses y años', () => {
    expect(desplazarDias(new Date(2026, 0, 3), -7)).toEqual(new Date(2025, 11, 27))
    expect(desplazarDias(new Date(2026, 1, 28), 1)).toEqual(new Date(2026, 2, 1))
  })
  test('fechaDeTexto ignora la hora', () => {
    expect(fechaDeTexto('2026-10-18 12:41:47')).toEqual(new Date(2026, 9, 18))
  })
})

describe('resumenDia', () => {
  test('sin nada pendiente', () => {
    expect(resumenDia({ clientes: 0, recompras: 0, productos: 0 })).toContain('Todo al día')
  })
  test('singular y plural', () => {
    expect(resumenDia({ clientes: 1, recompras: 0, productos: 0 })).toBe('1 cliente por atender')
    expect(resumenDia({ clientes: 3, recompras: 2, productos: 2 })).toBe(
      '3 clientes por atender · 2 clientes para recompra · 2 productos por reponer',
    )
    expect(resumenDia({ clientes: 0, recompras: 1, productos: 1 })).toBe(
      '1 cliente para recompra · 1 producto por reponer',
    )
  })
})
