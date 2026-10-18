import { describe, expect, test } from 'bun:test'
import { detalleMovimiento, fmtCantidad, fmtCantidadConSigno, totalesMovimientos } from '../movimientos'
import type { TipoMovimiento } from '@/types'

const mov = (tipo: TipoMovimiento, cantidad: number, detalle: string | null = null, contado: number | null = null) => ({
  tipo,
  cantidad,
  detalle,
  contado,
})

describe('formato de cantidades', () => {
  test('coma decimal y signo solo en las entradas', () => {
    expect(fmtCantidad(2.5)).toBe('2,5')
    expect(fmtCantidadConSigno(3)).toBe('+3')
    expect(fmtCantidadConSigno(-1.5)).toBe('-1,5')
    expect(fmtCantidadConSigno(0)).toBe('0')
  })
})

describe('detalleMovimiento', () => {
  test('explica cada tipo en lenguaje normal', () => {
    expect(detalleMovimiento(mov('compra', 10, 'HSN Store'))).toBe('HSN Store')
    expect(detalleMovimiento(mov('compra', 10))).toBe('Sin proveedor')
    expect(detalleMovimiento(mov('venta', -2))).toBe('')
    expect(detalleMovimiento(mov('anulacion', 2, 'Cobro duplicado'))).toBe('Cobro duplicado')
    expect(detalleMovimiento(mov('merma', -1, 'accidente_rotura'))).toBe('Accidente / Rotura')
    expect(detalleMovimiento(mov('recuento', -1, 'Mensual', 6.5))).toBe('Contadas 6,5 · Mensual')
  })

  test('una devolución que no vuelve al almacén lo dice', () => {
    expect(detalleMovimiento(mov('devolucion', 1, 'No le gusta'))).toBe('No le gusta')
    expect(detalleMovimiento(mov('devolucion', 0, 'Bote abierto'))).toBe('Bote abierto · no vuelve al almacén')
  })
})

describe('totalesMovimientos', () => {
  test('separa entradas, salidas y ajustes de recuento', () => {
    const lista = [
      mov('compra', 10),
      mov('venta', -3),
      mov('merma', -0.1),
      mov('devolucion', 1),
      mov('devolucion', 0),
      mov('anulacion', 2),
      mov('recuento', -0.2),
      mov('recuento', 0.5),
    ]
    expect(totalesMovimientos(lista)).toEqual({ entradas: 13, salidas: 3.1, ajustes: 0.3 })
    expect(totalesMovimientos([])).toEqual({ entradas: 0, salidas: 0, ajustes: 0 })
  })
})
