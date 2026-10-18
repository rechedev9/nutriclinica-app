import { describe, expect, test } from 'bun:test'
import { SIN_FILTRO, filtrarVentas, resumenVentas } from '../filtros'
import { ventasNetas } from '../netas'
import type { LineaVenta, Venta } from '@/types'

const LINEA: LineaVenta = {
  id: 1,
  producto_id: 5,
  producto_nombre: 'Creatina',
  unidad: 'bote',
  cantidad: 3,
  precio_unitario: 10,
  descuento: 0,
  iva: 10,
  importe: 30,
  devuelto: 0,
}

function venta(cambios: Partial<Venta> = {}): Venta {
  return {
    id: 1,
    numero: 'V-000001',
    fecha: '2026-10-18',
    creado: '2026-10-18 10:00:00',
    usuario: 'admin',
    paciente_id: null,
    paciente_nombre: null,
    notas: null,
    total: 30,
    estado: 'completada',
    entregado: null,
    anulacion_motivo: null,
    anulacion_fecha: null,
    anulacion_usuario: null,
    situacion: 'completada',
    total_devuelto: 0,
    devoluciones: [],
    pagos: [{ metodo: 'efectivo', importe: 30 }],
    lineas: [LINEA],
    ...cambios,
  }
}

const devolucion = {
  id: 1,
  fecha: '2026-10-18',
  creado: null,
  usuario: 'ana',
  motivo: 'Caducado',
  metodo_reembolso: 'efectivo' as const,
  importe: 10,
  notas: null,
  lineas: [{ venta_linea_id: 1, producto_nombre: 'Creatina', cantidad: 1, importe: 10, reingresa: 0 }],
}

describe('ventasNetas', () => {
  test('quita las anuladas y descuenta lo devuelto', () => {
    const parcial = venta({
      id: 2,
      situacion: 'devuelta_parcial',
      total_devuelto: 10,
      devoluciones: [devolucion],
      lineas: [{ ...LINEA, devuelto: 1 }],
    })
    const netas = ventasNetas([venta({ estado: 'anulada', situacion: 'anulada' }), parcial])
    expect(netas).toHaveLength(1)
    expect(netas[0]?.total).toBe(20)
    expect(netas[0]?.lineas[0]).toMatchObject({ cantidad: 2, importe: 20, precio_unitario: 10 })
  })
})

describe('filtrarVentas', () => {
  const ventas = [
    venta({ id: 123, paciente_id: 4, paciente_nombre: 'Lucía Pérez' }),
    venta({ id: 124, fecha: '2026-10-10', pagos: [] }),
    venta({ id: 125, estado: 'anulada', situacion: 'anulada', pagos: [{ metodo: 'tarjeta', importe: 30 }] }),
  ]
  const ids = (filtro: Partial<typeof SIN_FILTRO>) =>
    filtrarVentas(ventas, { ...SIN_FILTRO, ...filtro }).map((v) => v.id)

  test('busca por número de ticket con o sin ceros', () => {
    expect(ids({ texto: 'V-000123' })).toEqual([123])
    expect(ids({ texto: '124' })).toEqual([124])
    expect(ids({ texto: 'lucia' })).toEqual([123])
    expect(ids({ texto: 'creatina' })).toEqual([123, 124, 125])
  })

  test('un número solo busca el ticket, no los productos que lo contienen', () => {
    const conCifra = [venta({ id: 9 }), venta({ id: 10, lineas: [{ ...LINEA, producto_nombre: 'Omega 90 cáps' }] })]
    expect(filtrarVentas(conCifra, { ...SIN_FILTRO, texto: '9' }).map((v) => v.id)).toEqual([9])
  })

  test('filtra por fecha, cliente, pago y estado', () => {
    expect(ids({ desde: '2026-10-11' })).toEqual([123, 125])
    expect(ids({ cliente: 'sin' })).toEqual([124, 125])
    expect(ids({ cliente: '4' })).toEqual([123])
    expect(ids({ metodo: 'sin_indicar' })).toEqual([124])
    expect(ids({ metodo: 'tarjeta' })).toEqual([125])
    expect(ids({ situacion: 'anulada' })).toEqual([125])
  })
})

describe('resumenVentas', () => {
  test('las anuladas no suman y lo devuelto se resta', () => {
    const r = resumenVentas([
      venta(),
      venta({ id: 2, total_devuelto: 10, situacion: 'devuelta_parcial' }),
      venta({ id: 3, estado: 'anulada', situacion: 'anulada' }),
    ])
    expect(r).toEqual({ num_ventas: 2, vendido: 60, devuelto: 10, neto: 50, num_anuladas: 1 })
  })
})
