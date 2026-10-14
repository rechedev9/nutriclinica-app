import { describe, expect, test } from 'bun:test'
import { fechaLarga, resumenDia, ventasDelMes } from '../calculos'

describe('fechaLarga', () => {
  test('día de la semana, día y mes en español', () => {
    expect(fechaLarga(new Date(2026, 9, 13))).toBe('Martes, 13 de octubre')
    expect(fechaLarga(new Date(2026, 2, 1))).toBe('Domingo, 1 de marzo')
  })
})

describe('resumenDia', () => {
  test('sin nada pendiente', () => {
    expect(resumenDia({ pendientes: 0, productos: 0 })).toContain('Todo al día')
  })
  test('singular y plural', () => {
    expect(resumenDia({ pendientes: 1, productos: 0 })).toBe('1 cliente con la revisión pendiente')
    expect(resumenDia({ pendientes: 3, productos: 2 })).toBe(
      '3 clientes con la revisión pendiente · 2 productos por reponer',
    )
    expect(resumenDia({ pendientes: 0, productos: 1 })).toBe('1 producto por reponer')
  })
})

describe('ventasDelMes', () => {
  const ventas = [
    { fecha: '2026-10-02', total: 10.5 },
    { fecha: '2026-10-13', total: 20 },
    { fecha: '2026-09-30', total: 99 },
    { fecha: '2025-10-05', total: 50 },
    { fecha: null, total: 5 },
  ]
  test('suma solo el mes y año en curso', () => {
    expect(ventasDelMes(ventas, new Date(2026, 9, 13))).toEqual({ total: 30.5, cantidad: 2 })
  })
  test('mes sin ventas', () => {
    expect(ventasDelMes(ventas, new Date(2026, 0, 1))).toEqual({ total: 0, cantidad: 0 })
  })
})
