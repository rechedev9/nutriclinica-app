import { describe, expect, test } from 'bun:test'
import {
  enCamino,
  errorRecepcion,
  filtrarPedidos,
  lineasRecepcion,
  pendienteDe,
  quedaPendiente,
  retrasado,
  sugerenciasReposicion,
} from '../pedidos'
import type { AlmacenRow } from '@/types'

const linea = (producto_id: number, cantidad: number, recibido: number) => ({
  producto_id,
  cantidad,
  recibido,
  producto_nombre: `P${producto_id}`,
  unidad: 'ud',
  precio_unitario: 2,
})

function producto(id: number, datos: { actual: number; minimo: number; proveedor: number | null }): AlmacenRow {
  return {
    id,
    nombre: `P${id}`,
    unidad: 'ud',
    precio_coste: 3,
    precio_venta: 6,
    stock_minimo: datos.minimo,
    codigo_barras: null,
    iva: 10,
    categoria: null,
    proveedor_id: datos.proveedor,
    proveedor_nombre: null,
    stock_actual: datos.actual,
    creado: null,
  }
}

describe('pendienteDe', () => {
  test('lo que falta por llegar, nunca negativo y sin restos de coma flotante', () => {
    expect(pendienteDe({ cantidad: 10, recibido: 4 })).toBe(6)
    expect(pendienteDe({ cantidad: 2, recibido: 3 })).toBe(0)
    expect(pendienteDe({ cantidad: 0.3, recibido: 0.1 })).toBe(0.2)
  })
})

describe('filtros y retrasos', () => {
  const pedidos = [
    { id: 1, situacion: 'pendiente' as const, fecha_prevista: '2026-10-10' },
    { id: 2, situacion: 'parcial' as const, fecha_prevista: null },
    { id: 3, situacion: 'recibido' as const, fecha_prevista: '2026-10-01' },
    { id: 4, situacion: 'cancelado' as const, fecha_prevista: null },
  ]

  test('separa lo que está por recibir de lo recibido o cerrado', () => {
    expect(filtrarPedidos(pedidos, 'por_recibir').map((p) => p.id)).toEqual([1, 2])
    expect(filtrarPedidos(pedidos, 'cerrados').map((p) => p.id)).toEqual([3, 4])
    expect(filtrarPedidos(pedidos, 'todos')).toHaveLength(4)
  })

  test('solo se retrasa un pedido por recibir con la fecha prevista pasada', () => {
    expect(pedidos.map((p) => retrasado(p, '2026-10-18'))).toEqual([true, false, false, false])
    expect(retrasado({ situacion: 'pendiente', fecha_prevista: '2026-10-18' }, '2026-10-18')).toBe(false)
  })
})

describe('reposición', () => {
  test('suma lo pendiente de los pedidos por recibir', () => {
    const camino = enCamino([
      { situacion: 'parcial', lineas: [linea(1, 10, 4), linea(2, 5, 5)] },
      { situacion: 'pendiente', lineas: [linea(1, 2, 0)] },
      { situacion: 'cancelado', lineas: [linea(3, 9, 0)] },
    ])
    expect([...camino]).toEqual([[1, 8]])
  })

  test('desde la alerta reúne a todos los productos en alerta de ese proveedor', () => {
    const almacen = [
      producto(1, { actual: 0, minimo: 3, proveedor: 7 }),
      producto(2, { actual: 1, minimo: 4, proveedor: 7 }),
      producto(3, { actual: 0, minimo: 2, proveedor: 8 }),
      producto(4, { actual: 10, minimo: 2, proveedor: 7 }),
    ]
    const lineas = sugerenciasReposicion({
      almacen,
      proveedorId: 7,
      enCamino: new Map(),
      excluir: new Set(),
    })
    expect(lineas).toEqual([
      { producto_id: 1, cantidad: 6, precio_unitario: 3 },
      { producto_id: 2, cantidad: 7, precio_unitario: 3 },
    ])
  })

  test('propone hasta el doble del mínimo del proveedor, sin lo que ya viene ni lo ya elegido', () => {
    const almacen = [
      producto(1, { actual: 1, minimo: 4, proveedor: 7 }),
      producto(2, { actual: 0, minimo: 0, proveedor: 7 }),
      producto(3, { actual: 2, minimo: 5, proveedor: 7 }),
      producto(4, { actual: 0, minimo: 3, proveedor: 8 }),
      producto(5, { actual: 9, minimo: 2, proveedor: 7 }),
      producto(6, { actual: 0, minimo: 2, proveedor: 7 }),
    ]
    const lineas = sugerenciasReposicion({
      almacen,
      proveedorId: 7,
      enCamino: new Map([[3, 8]]),
      excluir: new Set([6]),
    })
    expect(lineas).toEqual([
      { producto_id: 2, cantidad: 1, precio_unitario: 3 },
      { producto_id: 1, cantidad: 7, precio_unitario: 3 },
    ])
  })
})

describe('albarán de un pedido', () => {
  test('propone lo pendiente de cada línea y avisa de lo que quedará', () => {
    const lineas = lineasRecepcion([linea(1, 10, 4), linea(2, 3, 3), linea(3, 6, 0)])
    expect(lineas.map((l) => [l.producto_id, l.pendiente, l.llega])).toEqual([
      [1, 6, 6],
      [3, 6, 6],
    ])
    expect(quedaPendiente(lineas)).toEqual([])
    const corto = lineas.map((l) => (l.producto_id === 3 ? { ...l, llega: 2 } : l))
    expect(quedaPendiente(corto)).toEqual([{ producto_nombre: 'P3', unidad: 'ud', falta: 4 }])
  })

  test('exige que llegue algo y que no haya importes negativos', () => {
    const [primera] = lineasRecepcion([linea(1, 4, 0)])
    if (primera === undefined) throw new Error('sin línea')
    expect(errorRecepcion([primera])).toBeNull()
    expect(errorRecepcion([{ ...primera, llega: 0 }])).toBe('Indica qué ha llegado en este albarán')
    expect(errorRecepcion([{ ...primera, llega: -1 }])).toBe('Las cantidades no pueden ser negativas')
    expect(errorRecepcion([{ ...primera, precio_unitario: -2 }])).toBe('El precio no puede ser negativo')
  })
})
