import { describe, expect, test } from 'bun:test'
import { PESTANAS_TIENDA, PESTANAS_VENTAS, delDia, elResto, etiquetaMas } from '../barra-del-dia'

describe('pestañas del día', () => {
  test('en escritorio Tienda conserva el orden de siempre', () => {
    expect(PESTANAS_TIENDA.map((p) => p.label)).toEqual([
      'Almacén',
      'Pedidos',
      'Categorías',
      'Proveedores',
      'Compras',
      'Mermas',
      'Recuentos',
      'Análisis',
    ])
  })

  test('en el teléfono Tienda deja a la vista Almacén, Pedidos y Compras', () => {
    expect(delDia(PESTANAS_TIENDA).map((p) => p.label)).toEqual(['Almacén', 'Pedidos', 'Compras'])
    expect(elResto(PESTANAS_TIENDA).map((p) => p.label)).toEqual([
      'Categorías',
      'Proveedores',
      'Mermas',
      'Recuentos',
      'Análisis',
    ])
  })

  test('en escritorio Ventas conserva el orden de siempre', () => {
    expect(PESTANAS_VENTAS.map((p) => p.label)).toEqual([
      'Caja',
      'Historial',
      'Cierre de caja',
      'Estadísticas',
      'Datos del ticket',
    ])
  })

  test('en el teléfono Ventas deja a la vista Caja, Historial y Cierre', () => {
    expect(delDia(PESTANAS_VENTAS).map((p) => p.label)).toEqual(['Caja', 'Historial', 'Cierre de caja'])
    expect(elResto(PESTANAS_VENTAS).map((p) => p.label)).toEqual(['Estadísticas', 'Datos del ticket'])
  })

  test('el botón dice la pestaña activa de Más, o Más si el día está a la vista', () => {
    expect(etiquetaMas(elResto(PESTANAS_TIENDA), '/stock/categorias')).toBe('Categorías')
    expect(etiquetaMas(elResto(PESTANAS_TIENDA), '/stock/almacen')).toBe('Más')
    expect(etiquetaMas(elResto(PESTANAS_VENTAS), '/ventas/ticket')).toBe('Datos del ticket')
    expect(etiquetaMas(elResto(PESTANAS_VENTAS), '/ventas/caja')).toBe('Más')
  })
})
