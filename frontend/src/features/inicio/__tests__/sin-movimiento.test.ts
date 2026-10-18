import { describe, expect, test } from 'bun:test'
import { productosSinMovimiento, valorParado } from '../sin-movimiento'

const HOY = new Date(2026, 9, 18)

const producto = (id: number, stock_actual: number, precio_coste: number, creado = '2026-01-01 10:00:00') => ({
  id,
  stock_actual,
  precio_coste,
  creado,
})

describe('productosSinMovimiento', () => {
  const almacen = [
    producto(1, 4, 10), // vendido hace 10 días
    producto(2, 3, 12.5), // vendido hace 90 días
    producto(3, 0, 50), // sin stock: no inmoviliza dinero
    producto(4, 2, 0.1), // nunca vendido
    producto(5, 5, 20, '2026-10-01 10:00:00'), // recién dado de alta
  ]
  const ultimasVentas = new Map([
    [1, '2026-10-08'],
    [2, '2026-07-20'],
    [3, '2026-01-01'],
  ])
  const parados = productosSinMovimiento({ almacen, ultimasVentas, hoy: HOY })

  test('con stock, sin ventas recientes y ordenados por dinero parado', () => {
    expect(parados.map((p) => [p.producto.id, p.dias, p.valor])).toEqual([
      [2, 90, 37.5],
      [4, null, 0.2],
    ])
  })

  test('valorParado suma en céntimos', () => {
    expect(valorParado([{ valor: 0.1 }, { valor: 0.2 }])).toBe(0.3)
    expect(valorParado(parados)).toBe(37.7)
  })
})
