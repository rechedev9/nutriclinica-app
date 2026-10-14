import { describe, expect, test } from 'bun:test'
import {
  clavesMes,
  costesPorProducto,
  flujoDeCaja,
  margenDeLoVendido,
  mesesPorDefecto,
  monedaCompacta,
  porcentaje,
  valorAlmacen,
} from '../analisisStock'
import { colorCategorico, conAlfa, paletaCategorica } from '@/lib/chart/paleta'

const almacen = [
  { id: 1, precio_coste: 10, stock_actual: 5 },
  { id: 2, precio_coste: 4, stock_actual: 0 },
]
const compras = [{ fecha: '2026-01-01', lineas: [{ producto_id: 3, cantidad: 10, precio_unitario: 7 }] }]

describe('margen de lo vendido', () => {
  test('usa precio de venta menos coste por cantidad', () => {
    const costes = costesPorProducto({ almacen, compras })
    const ventas = [{ fecha: '2026-02-01', lineas: [{ producto_id: 1, cantidad: 2, precio_unitario: 15 }] }]
    expect(margenDeLoVendido({ ventas, costes })).toEqual({ margen: 10, ingresos: 30, lineasSinCoste: 0 })
  })

  test('recurre a la última compra y cuenta las líneas sin coste', () => {
    const costes = costesPorProducto({ almacen, compras })
    const ventas = [
      {
        fecha: null,
        lineas: [
          { producto_id: 3, cantidad: 1, precio_unitario: 9 },
          { producto_id: 99, cantidad: 1, precio_unitario: 5 },
        ],
      },
    ]
    expect(margenDeLoVendido({ ventas, costes })).toEqual({ margen: 2, ingresos: 9, lineasSinCoste: 1 })
  })
})

describe('valor y flujo', () => {
  test('valora el almacén a coste', () => {
    expect(valorAlmacen(almacen)).toBe(50)
    expect(valorAlmacen([{ id: 1, precio_coste: 10, stock_actual: -3 }])).toBe(0)
  })
  test('flujo de caja y porcentaje', () => {
    expect(flujoDeCaja({ ingresos: 100, gastos: 250 })).toBe(-150)
    expect(porcentaje({ parte: 1, total: 4 })).toBe(25)
    expect(porcentaje({ parte: 1, total: 0 })).toBeNull()
  })
})

describe('monedaCompacta', () => {
  test('abrevia miles y millones', () => {
    expect(monedaCompacta(850)).toBe('850 €')
    expect(monedaCompacta(1200)).toBe('1,2 k €')
    expect(monedaCompacta(-3000)).toBe('-3 k €')
    expect(monedaCompacta(2_500_000)).toBe('2,5 M €')
    expect(monedaCompacta(0)).toBe('0 €')
  })
})

describe('meses', () => {
  const hoy = new Date(2026, 9, 13)
  test('genera claves consecutivas', () => {
    expect(clavesMes({ hasta: hoy, cantidad: 3 })).toEqual(['2026-08', '2026-09', '2026-10'])
  })
  test('recorta los meses vacíos del principio', () => {
    const m = mesesPorDefecto({ hoy, conActividad: new Set(['2026-08', '2026-10']) })
    expect(m[0]).toBe('2026-05')
    expect(m.at(-1)).toBe('2026-10')
  })
  test('con actividad antigua mantiene los 12 y sin datos deja 6', () => {
    expect(mesesPorDefecto({ hoy, conActividad: new Set(['2025-11']) })).toHaveLength(12)
    expect(mesesPorDefecto({ hoy, conActividad: new Set() })).toHaveLength(6)
  })
})

describe('paleta', () => {
  test('repite colores y añade alfa', () => {
    const p = paletaCategorica(false)
    expect(colorCategorico({ isDark: false, indice: p.length })).toBe(String(p[0]))
    expect(conAlfa({ color: '#0f7b92', alfa: 1 })).toBe('#0f7b92ff')
    expect(conAlfa({ color: '#0f7b92', alfa: 0 })).toBe('#0f7b9200')
  })
})
